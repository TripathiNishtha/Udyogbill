using System;
using System.Linq;
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
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers.Public;

public class PublicInvoiceSellerDto
{
    public string BusinessName { get; set; } = string.Empty;
    public string TradeName { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? DrugLicenseNumber { get; set; }
    public string? FSSAINumber { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? Pincode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankBranch { get; set; }
    public string? UpiId { get; set; }
}

public class PublicInvoiceResponseDto
{
    public SalesInvoiceDetailsDto Invoice { get; set; } = null!;
    public PublicInvoiceSellerDto Seller { get; set; } = null!;
}

[AllowAnonymous]
[Route("api/v1/public/invoices")]
[Route("api/public/invoices")]
public class PublicInvoicesController : BaseApiController
{
    private static readonly string[] DefaultAllowedLogoDomains = new[]
    {
        "udyogbill.com",
        ".udyogbill.com",
        "s3.amazonaws.com",
        ".s3.amazonaws.com",
        "cloudfront.net",
        ".cloudfront.net",
        "blob.core.windows.net",
        ".blob.core.windows.net",
        "storage.googleapis.com",
        ".storage.googleapis.com",
        "r2.cloudflarestorage.com",
        ".r2.cloudflarestorage.com",
        "localhost",
        "127.0.0.1"
    };

    private readonly AppDbContext _context;
    private readonly IInvoiceSignatureService _signatureService;
    private readonly ITenantContext _tenantContext;
    private readonly IConfiguration? _configuration;
    private readonly ILogger<PublicInvoicesController>? _logger;

    public PublicInvoicesController(
        AppDbContext context,
        IInvoiceSignatureService signatureService,
        ITenantContext tenantContext,
        IConfiguration? configuration = null,
        ILogger<PublicInvoicesController>? logger = null)
    {
        _context = context;
        _signatureService = signatureService;
        _tenantContext = tenantContext;
        _configuration = configuration;
        _logger = logger;
    }

    [NonAction]
    public bool IsTrustedLogoUri(Uri uri)
    {
        if (uri.Scheme != Uri.UriSchemeHttps && !(uri.Scheme == Uri.UriSchemeHttp && (uri.Host == "localhost" || uri.Host == "127.0.0.1")))
        {
            return false;
        }

        var host = uri.Host.ToLowerInvariant();

        var customDomains = _configuration?.GetSection("PublicInvoices:AllowedLogoDomains").Get<string[]>();
        if (customDomains != null && customDomains.Length > 0)
        {
            foreach (var domain in customDomains)
            {
                var d = domain.Trim().ToLowerInvariant();
                if (d.StartsWith(".") ? host.EndsWith(d) : (host == d || host.EndsWith("." + d)))
                {
                    return true;
                }
            }
        }

        foreach (var allowed in DefaultAllowedLogoDomains)
        {
            if (allowed.StartsWith("."))
            {
                if (host.EndsWith(allowed)) return true;
            }
            else
            {
                if (host == allowed || host.EndsWith("." + allowed)) return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Public verification and digital view endpoint for scanned QR codes on printed invoices.
    /// Requires cryptographic HMAC-SHA256 token verification to protect customer PII against IDOR enumeration.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PublicInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublicInvoice(
        Guid id,
        [FromQuery] string? token = null,
        [FromQuery] long? expires = null,
        CancellationToken cancellationToken = default)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated == true;

        // Anonymous public requests strictly require valid cryptographic HMAC signature
        if (!isAuthenticated)
        {
            if (!_signatureService.ValidateToken(id, token, expires, out var failureReason))
            {
                if (failureReason == "TOKEN_EXPIRED")
                {
                    return StatusCode(StatusCodes.Status401Unauthorized, new
                    {
                        error = "TOKEN_EXPIRED",
                        message = "The public invoice link has expired. Please request a new link from the seller."
                    });
                }

                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = failureReason ?? "ACCESS_DENIED",
                    message = "A valid cryptographic access token is required to view this invoice."
                });
            }
        }

        var invoice = await _context.SalesInvoices
            .IgnoreQueryFilters()
            .Where(i => i.Id == id && !i.IsDeleted)
            .Include(i => i.Branch)
            .Include(i => i.Warehouse)
            .Include(i => i.Broker)
            .Include(i => i.Items.Where(it => !it.IsDeleted))
                .ThenInclude(it => it.Uom)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice == null)
        {
            return NotFound(new { message = "Invoice not found or expired." });
        }

        // If authenticated user lacks valid token, enforce strict tenant boundary
        if (isAuthenticated && !_signatureService.ValidateToken(id, token, expires, out _))
        {
            if (!_tenantContext.IsSuperAdmin && invoice.TenantId != _tenantContext.TenantId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "ACCESS_DENIED",
                    message = "You do not have permission to view invoices from another store."
                });
            }
        }

        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == invoice.TenantId && !t.IsDeleted, cancellationToken);

        var itemDtos = invoice.Items.Select(it => new SalesInvoiceItemDto(
            it.Id,
            it.InvoiceId,
            it.ItemId,
            it.ItemSku,
            it.ItemName,
            it.HsnCode,
            it.Barcode,
            it.BatchId,
            it.BatchNumber,
            it.ExpiryDate,
            it.Quantity,
            it.UomId,
            it.UomCode,
            it.UnitPrice,
            it.Mrp,
            it.DiscountPercent,
            it.DiscountAmount,
            it.TaxableAmount,
            it.GstRate,
            it.CgstRate,
            it.CgstAmount,
            it.SgstRate,
            it.SgstAmount,
            it.IgstRate,
            it.IgstAmount,
            it.CessRate,
            it.CessAmount,
            it.TotalAmount,
            it.AttributesJson
        )).ToList();

        var paymentDtos = invoice.Payments.Select(p => new SalesInvoicePaymentDto(
            p.Id,
            p.InvoiceId,
            p.PaymentDate,
            p.Amount,
            p.PaymentMode,
            p.PaymentMode.ToString(),
            p.TransactionReference,
            p.Notes,
            p.CreatedAtUtc
        )).ToList();

        var taxSummary = invoice.Items
            .GroupBy(it => new { Hsn = it.HsnCode ?? "N/A", it.GstRate })
            .Select(g => new GstTaxSummaryItemDto(
                g.Key.Hsn,
                g.Sum(x => x.TaxableAmount),
                g.Key.GstRate,
                g.Sum(x => x.CgstAmount),
                g.Sum(x => x.SgstAmount),
                g.Sum(x => x.IgstAmount),
                g.Sum(x => x.CgstAmount + x.SgstAmount + x.IgstAmount + x.CessAmount)
            ))
            .ToList();

        var activeReturns = await _context.SalesReturns
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == invoice.TenantId && r.OriginalSalesInvoiceId == invoice.Id && !r.IsCancelled && !r.IsDeleted)
            .OrderByDescending(r => r.ReturnDate)
            .ToListAsync(cancellationToken);

        bool hasCreditNote = activeReturns.Count > 0;
        string? creditNoteNumber = hasCreditNote ? string.Join(", ", activeReturns.Select(r => r.CreditNoteNumber)) : null;
        decimal? creditNoteAmount = hasCreditNote ? activeReturns.Sum(r => r.TotalAmount) : null;
        DateTimeOffset? creditNoteDate = hasCreditNote ? activeReturns[0].ReturnDate : null;
        Guid? creditNoteId = hasCreditNote ? activeReturns[0].Id : null;

        var invoiceDto = new SalesInvoiceDetailsDto(
            invoice.Id,
            invoice.TenantId,
            invoice.InvoiceNumber,
            invoice.InvoiceType,
            invoice.Status,
            invoice.BranchId,
            invoice.Branch?.BranchName ?? "Main Branch",
            invoice.Branch?.GSTIN ?? tenant?.GSTIN ?? "",
            invoice.Branch?.AddressLine1 ?? tenant?.AddressLine1 ?? "",
            invoice.Branch?.StateCode ?? tenant?.StateCode ?? "",
            invoice.WarehouseId,
            invoice.Warehouse?.WarehouseName ?? "Default Warehouse",
            invoice.PartyId,
            invoice.CustomerName,
            invoice.CustomerPhone,
            invoice.CustomerEmail,
            invoice.CustomerGSTIN,
            invoice.CustomerPAN,
            invoice.BillingAddress,
            invoice.ShippingAddress,
            invoice.BillingStateCode,
            invoice.ShippingStateCode,
            invoice.PlaceOfSupply,
            invoice.InvoiceDate,
            invoice.DueDate,
            invoice.TaxSupplyType,
            invoice.SubTotal,
            invoice.ItemDiscountTotal,
            invoice.InvoiceDiscountPercent,
            invoice.InvoiceDiscountAmount,
            invoice.TaxableAmount,
            invoice.CgstAmount,
            invoice.SgstAmount,
            invoice.IgstAmount,
            invoice.CessAmount,
            invoice.RoundOff,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.BalanceAmount,
            invoice.PrimaryPaymentMode,
            invoice.PaymentStatus,
            invoice.PaymentReferenceNumber,
            invoice.Notes,
            invoice.TermsAndConditions,
            invoice.AttributesJson,
            invoice.TransporterName,
            invoice.TransporterId,
            invoice.VehicleNumber,
            invoice.LrNumber,
            invoice.LrDate,
            invoice.EWayBillNumber,
            invoice.EWayBillDate,
            invoice.PoNumber,
            invoice.PoDate,
            invoice.IsReverseCharge,
            invoice.IsCancelled,
            invoice.CancellationReason,
            invoice.CancelledAtUtc,
            invoice.CreatedAtUtc,
            itemDtos,
            paymentDtos,
            taxSummary,
            hasCreditNote,
            creditNoteNumber,
            creditNoteAmount,
            creditNoteDate,
            creditNoteId,
            invoice.BrokerId,
            invoice.Broker?.FullName
        );

        var sellerDto = new PublicInvoiceSellerDto
        {
            BusinessName = tenant?.BusinessName ?? invoice.Branch?.BranchName ?? "UdyogBill Enterprise",
            TradeName = tenant?.TradeName ?? tenant?.BusinessName ?? "",
            LogoUrl = tenant?.LogoUrl,
            GSTIN = invoice.Branch?.GSTIN ?? tenant?.GSTIN,
            PAN = tenant?.PAN,
            DrugLicenseNumber = tenant?.DrugLicenseNumber,
            FSSAINumber = tenant?.FSSAINumber,
            AddressLine1 = tenant?.AddressLine1 ?? invoice.Branch?.AddressLine1,
            AddressLine2 = tenant?.AddressLine2 ?? invoice.Branch?.AddressLine2,
            City = tenant?.City ?? invoice.Branch?.City,
            State = tenant?.State ?? invoice.Branch?.State,
            StateCode = tenant?.StateCode ?? invoice.Branch?.StateCode,
            Pincode = tenant?.Pincode ?? invoice.Branch?.Pincode,
            Phone = tenant?.PrimaryPhone ?? invoice.Branch?.Phone,
            Email = tenant?.Email ?? invoice.Branch?.Email,
            BankName = tenant?.BankName,
            BankAccountNumber = tenant?.BankAccountNumber,
            BankIfsc = tenant?.BankIfsc,
            BankBranch = tenant?.BankBranch,
            UpiId = tenant?.UpiId
        };

        var response = new PublicInvoiceResponseDto
        {
            Invoice = invoiceDto,
            Seller = sellerDto
        };

        return Ok(response);
    }

    [HttpGet("{id:guid}/logo")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublicInvoiceLogo(
        Guid id,
        [FromQuery] string? token = null,
        [FromQuery] long? expires = null,
        CancellationToken cancellationToken = default)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated == true;
        if (!isAuthenticated)
        {
            if (!_signatureService.ValidateToken(id, token, expires, out var failureReason))
            {
                if (failureReason == "TOKEN_EXPIRED")
                {
                    return StatusCode(StatusCodes.Status401Unauthorized, new { error = "TOKEN_EXPIRED" });
                }

                return StatusCode(StatusCodes.Status403Forbidden, new { error = failureReason ?? "ACCESS_DENIED" });
            }
        }

        var invoice = await _context.SalesInvoices
            .IgnoreQueryFilters()
            .Where(i => i.Id == id && !i.IsDeleted)
            .Select(i => new { i.TenantId })
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice == null)
        {
            return NotFound();
        }

        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Where(t => t.Id == invoice.TenantId && !t.IsDeleted)
            .Select(t => new { t.LogoUrl })
            .FirstOrDefaultAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(tenant?.LogoUrl))
        {
            var logo = tenant.LogoUrl.Trim();
            if (logo.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
            {
                var commaIdx = logo.IndexOf(',');
                if (commaIdx > 0 && commaIdx < logo.Length - 1)
                {
                    var header = logo.Substring(0, commaIdx);
                    var base64Data = logo.Substring(commaIdx + 1);
                    var contentType = header.Contains("image/jpeg") || header.Contains("image/jpg")
                        ? "image/jpeg"
                        : (header.Contains("image/webp") ? "image/webp" : "image/png");
                    try
                    {
                        var bytes = Convert.FromBase64String(base64Data);
                        Response.Headers["Cache-Control"] = "public, max-age=86400";
                        return File(bytes, contentType);
                    }
                    catch { }
                }
            }
            else if (logo.StartsWith("/") && !logo.StartsWith("//") && !logo.StartsWith("/\\"))
            {
                return LocalRedirect(logo);
            }
            else if (Uri.TryCreate(logo, UriKind.Absolute, out var uri))
            {
                if (IsTrustedLogoUri(uri))
                {
                    return Redirect(uri.AbsoluteUri);
                }

                _logger?.LogWarning("Security rejection: Untrusted logo redirect URL {LogoUrl} blocked for invoice {InvoiceId}", logo, id);
                return NotFound();
            }
        }

        return NotFound();
    }
}
