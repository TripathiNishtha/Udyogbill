using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

public record PaymentGatewayWebhookPayload(
    string? Gateway,
    string? EventType,
    Guid? InvoiceId,
    string? InvoiceNumber,
    decimal Amount,
    string? PaymentReference,
    string? Signature
);

[AllowAnonymous]
[Route("api/v1/public/webhooks/payment")]
[Route("api/public/webhooks/payment")]
public class PublicPaymentWebhookController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly ISalesService _salesService;
    private readonly ITenantContext _tenantContext;
    private readonly IConfiguration? _configuration;
    private readonly ILogger<PublicPaymentWebhookController>? _logger;

    public PublicPaymentWebhookController(
        AppDbContext context,
        ISalesService salesService,
        ITenantContext tenantContext,
        IConfiguration? configuration = null,
        ILogger<PublicPaymentWebhookController>? logger = null)
    {
        _context = context;
        _salesService = salesService;
        _tenantContext = tenantContext;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HandlePaymentWebhook(
        [FromBody] PaymentGatewayWebhookPayload payload,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (payload == null || payload.Amount <= 0)
        {
            return BadRequest(new { error = "Valid payment payload with positive amount required." });
        }

        // 1. Look up the invoice across tenants first to establish tenant context
        SalesInvoice? invoice = null;
        if (payload.InvoiceId.HasValue && payload.InvoiceId.Value != Guid.Empty)
        {
            invoice = await _context.SalesInvoices
                .IgnoreQueryFilters()
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == payload.InvoiceId.Value && !i.IsDeleted, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(payload.InvoiceNumber))
        {
            var cleanNo = payload.InvoiceNumber.Trim();
            invoice = await _context.SalesInvoices
                .IgnoreQueryFilters()
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.InvoiceNumber == cleanNo && !i.IsDeleted, cancellationToken);
        }

        if (invoice == null)
        {
            return NotFound(new { error = "Invoice referenced in webhook not found.", code = "INVOICE_NOT_FOUND" });
        }

        // 2. Resolve Provider and Secret Key strictly scoped to the invoice's tenant
        var provider = string.IsNullOrWhiteSpace(payload.Gateway) ? "Razorpay" : payload.Gateway.Trim();

        var gatewayConfig = await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.TenantId == invoice.TenantId && g.Provider.ToLower() == provider.ToLower() && g.IsActive && !g.IsDeleted, cancellationToken);

        // Fallback to platform-level default gateway if tenant has not configured a custom gateway
        gatewayConfig ??= await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.TenantId == null && g.Provider.ToLower() == provider.ToLower() && g.IsActive && !g.IsDeleted, cancellationToken);

        var secret = gatewayConfig?.WebhookSecret
            ?? (string.IsNullOrWhiteSpace(gatewayConfig?.KeySecret) ? null : gatewayConfig.KeySecret)
            ?? _configuration?[$"PaymentGateway:{provider}:WebhookSecret"]
            ?? _configuration?["PaymentGateway:WebhookSecret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger?.LogError("Payment gateway webhook secret is not configured for provider {Provider} and tenant {TenantId}", provider, invoice.TenantId);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "Payment gateway webhook verification is not configured for this tenant.",
                code = "GATEWAY_NOT_CONFIGURED"
            });
        }

        // 3. Extract and Verify HMAC-SHA256 Signature
        string? incomingSignature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault()
            ?? Request.Headers["x-razorpay-signature"].FirstOrDefault()
            ?? Request.Headers["X-Webhook-Signature"].FirstOrDefault()
            ?? Request.Headers["x-webhook-signature"].FirstOrDefault()
            ?? payload.Signature;

        if (string.IsNullOrWhiteSpace(incomingSignature))
        {
            _logger?.LogWarning("Webhook rejected from IP {Ip}: Missing signature header or field", ip);
            return Unauthorized(new
            {
                error = "Webhook signature is required.",
                code = "MISSING_SIGNATURE"
            });
        }

        // Read request body if available for standard raw body HMAC verification
        string? rawBody = null;
        try
        {
            if (Request.Body.CanSeek)
            {
                Request.Body.Position = 0;
                using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
                rawBody = await reader.ReadToEndAsync(cancellationToken);
                Request.Body.Position = 0;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex, "Could not read raw request body for webhook HMAC");
        }

        var isSignatureValid = VerifySignature(secret, incomingSignature, payload, rawBody);
        if (!isSignatureValid)
        {
            _logger?.LogWarning("Webhook rejected from IP {Ip}: Invalid HMAC signature for invoice {InvoiceId}/{InvoiceNumber} on tenant {TenantId}",
                ip, invoice.Id, invoice.InvoiceNumber, invoice.TenantId);
            return Unauthorized(new
            {
                error = "Invalid webhook signature.",
                code = "INVALID_SIGNATURE"
            });
        }

        // 4. Idempotency Check (Double Payment Prevention)
        if (!string.IsNullOrWhiteSpace(payload.PaymentReference))
        {
            var cleanRef = payload.PaymentReference.Trim();
            var existingPayment = invoice.Payments
                .FirstOrDefault(p => !p.IsDeleted && string.Equals(p.TransactionReference, cleanRef, StringComparison.OrdinalIgnoreCase));

            if (existingPayment != null)
            {
                _logger?.LogInformation("Idempotent webhook replay detected for reference {Ref}. Invoice {InvoiceNumber}",
                    cleanRef, invoice.InvoiceNumber);
                return Ok(new
                {
                    success = true,
                    invoiceId = invoice.Id,
                    invoiceNumber = invoice.InvoiceNumber,
                    amountPaid = existingPayment.Amount,
                    balanceRemaining = invoice.BalanceAmount,
                    status = invoice.Status.ToString(),
                    isDuplicate = true
                });
            }
        }

        if (invoice.IsCancelled || invoice.Status == InvoiceStatus.Cancelled)
        {
            return BadRequest(new
            {
                error = "Cannot process payment for a cancelled invoice.",
                code = "INVOICE_CANCELLED"
            });
        }

        if (invoice.PaymentStatus == PaymentStatus.FullyPaid || invoice.Status == InvoiceStatus.Paid || invoice.BalanceAmount <= 0)
        {
            return BadRequest(new
            {
                error = "Invoice is already fully paid.",
                code = "ALREADY_PAID"
            });
        }

        // 5. Set tenant context for audit and tenant scoping
        _tenantContext.SetTenant(invoice.TenantId);

        var recordReq = new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: payload.Amount,
            PaymentMode: PaymentMode.UPI,
            TransactionReference: payload.PaymentReference ?? $"PG-{Guid.NewGuid():N}"[..16],
            Notes: $"Auto-settled via {provider} webhook: {payload.EventType ?? "payment.captured"}"
        );

        var result = await _salesService.RecordInvoicePaymentAsync(recordReq, ip, cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.ErrorMessage, code = result.ErrorCode });
        }

        var updatedInvoice = await _context.SalesInvoices
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.Id == invoice.Id, cancellationToken);

        return Ok(new
        {
            success = true,
            invoiceId = invoice.Id,
            invoiceNumber = invoice.InvoiceNumber,
            amountPaid = payload.Amount,
            balanceRemaining = updatedInvoice?.BalanceAmount ?? 0m,
            status = updatedInvoice?.Status.ToString(),
            isDuplicate = false
        });
    }

    private static bool VerifySignature(string secret, string incomingSignature, PaymentGatewayWebhookPayload payload, string? rawBody)
    {
        byte[] incomingBytes;
        try
        {
            incomingBytes = Convert.FromHexString(incomingSignature.Trim());
        }
        catch
        {
            return false;
        }

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));

        // Pattern 1: Raw request body hash (Standard Razorpay / Cashfree / Stripe webhook)
        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            var rawHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
            if (CryptographicOperations.FixedTimeEquals(rawHash, incomingBytes))
            {
                return true;
            }
        }

        // Pattern 2: Canonical payload string: $"{invoiceRef}|{amount}|{paymentRef}"
        var invoiceRef = payload.InvoiceId?.ToString() ?? payload.InvoiceNumber ?? string.Empty;
        var amtStr = payload.Amount.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString1 = $"{invoiceRef}|{amtStr}|{payload.PaymentReference}";
        var hash1 = hmac.ComputeHash(Encoding.UTF8.GetBytes(canonicalString1));
        if (CryptographicOperations.FixedTimeEquals(hash1, incomingBytes))
        {
            return true;
        }

        return false;
    }
}
