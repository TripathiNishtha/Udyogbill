using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using UdyogBill.Api.Controllers;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Sales;

public class PublicPaymentWebhookControllerTests
{
    private (AppDbContext context, Guid tenantId, SalesInvoice invoice, PublicPaymentWebhookController controller, string secret, Mock<ISalesService> mockSalesService) Setup()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockTenantContext = new MockTenantContext { TenantId = tenantId };
        var mockUserContext = new MockCurrentUserContext { TenantId = tenantId, UserId = Guid.NewGuid() };
        var mockAuditService = new Mock<IAuditService>();
        var mockSalesService = new Mock<ISalesService>();
        var mockConfig = new Mock<IConfiguration>();
        var mockLogger = new Mock<ILogger<PublicPaymentWebhookController>>();

        var context = new AppDbContext(options, mockTenantContext);

        var secret = "test_webhook_secret_key_123456789";
        context.PaymentGatewayConfigs.Add(new PaymentGatewayConfig
        {
            TenantId = tenantId,
            Provider = "Razorpay",
            KeyId = "rzp_test_123",
            KeySecret = "rzp_secret_123",
            WebhookSecret = secret,
            IsActive = true,
            Mode = "Test"
        });

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0001",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 5000m,
            PaidAmount = 0m,
            BalanceAmount = 5000m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };
        context.SalesInvoices.Add(invoice);
        context.SaveChanges();

        mockSalesService
            .Setup(s => s.RecordInvoicePaymentAsync(It.IsAny<RecordInvoicePaymentRequest>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RecordInvoicePaymentRequest req, string? ip, CancellationToken ct) =>
            {
                invoice.PaidAmount += req.Amount;
                invoice.BalanceAmount = invoice.TotalAmount - invoice.PaidAmount;
                if (invoice.BalanceAmount <= 0)
                {
                    invoice.PaymentStatus = PaymentStatus.FullyPaid;
                    invoice.Status = InvoiceStatus.Paid;
                }
                var p = new SalesInvoicePayment
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    InvoiceId = invoice.Id,
                    Amount = req.Amount,
                    PaymentDate = req.PaymentDate,
                    PaymentMode = req.PaymentMode,
                    TransactionReference = req.TransactionReference
                };
                invoice.Payments.Add(p);
                context.SalesInvoicePayments.Add(p);
                context.SaveChanges();
                return Result<Guid>.Success(p.Id);
            });

        var controller = new PublicPaymentWebhookController(
            context,
            mockSalesService.Object,
            mockTenantContext,
            mockConfig.Object,
            mockLogger.Object
        );

        var httpContext = new DefaultHttpContext();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return (context, tenantId, invoice, controller, secret, mockSalesService);
    }

    private static string ComputeHmacHex(string secret, string message)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return Convert.ToHexString(hash).ToLower();
    }

    [Fact]
    public async Task HandlePaymentWebhook_MissingSignature_ReturnsUnauthorized()
    {
        var (_, _, invoice, controller, _, _) = Setup();

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "PAY-111",
            Signature: null
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var unauthorized = response as UnauthorizedObjectResult;
        unauthorized.Should().NotBeNull();
        unauthorized!.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task HandlePaymentWebhook_InvalidSignature_ReturnsUnauthorized()
    {
        var (_, _, invoice, controller, _, _) = Setup();

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "PAY-111",
            Signature: "deadbeef00112233445566778899aabbccddeeff"
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var unauthorized = response as UnauthorizedObjectResult;
        unauthorized.Should().NotBeNull();
        unauthorized!.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task HandlePaymentWebhook_ValidSignature_ProcessesPaymentSuccessfully()
    {
        var (_, _, invoice, controller, secret, _) = Setup();

        var invoiceRef = invoice.Id.ToString();
        var amtStr = 5000m.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString = $"{invoiceRef}|{amtStr}|PAY-111";
        var validSignature = ComputeHmacHex(secret, canonicalString);

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "PAY-111",
            Signature: validSignature
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var okResult = response as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);

        invoice.PaymentStatus.Should().Be(PaymentStatus.FullyPaid);
        invoice.BalanceAmount.Should().Be(0m);
    }

    [Fact]
    public async Task HandlePaymentWebhook_ReplayWithSameReference_ReturnsIdempotentSuccess()
    {
        var (_, _, invoice, controller, secret, _) = Setup();

        var invoiceRef = invoice.Id.ToString();
        var amtStr = 5000m.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString = $"{invoiceRef}|{amtStr}|PAY-REPLAY-1";
        var validSignature = ComputeHmacHex(secret, canonicalString);

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "PAY-REPLAY-1",
            Signature: validSignature
        );

        // First call
        var response1 = await controller.HandlePaymentWebhook(payload, CancellationToken.None);
        response1.Should().BeOfType<OkObjectResult>();

        // Replay call with exact same reference
        var response2 = await controller.HandlePaymentWebhook(payload, CancellationToken.None);
        var okResult2 = response2 as OkObjectResult;
        okResult2.Should().NotBeNull();
        okResult2!.StatusCode.Should().Be(200);

        // Payment count must remain 1 (no double payment)
        invoice.Payments.Count.Should().Be(1);
    }

    [Fact]
    public async Task HandlePaymentWebhook_InvoiceAlreadyPaidWithDifferentReference_ReturnsBadRequest()
    {
        var (_, _, invoice, controller, secret, _) = Setup();

        // Mark invoice fully paid first
        invoice.PaymentStatus = PaymentStatus.FullyPaid;
        invoice.Status = InvoiceStatus.Paid;
        invoice.BalanceAmount = 0m;
        invoice.PaidAmount = 5000m;

        var invoiceRef = invoice.Id.ToString();
        var amtStr = 1000m.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString = $"{invoiceRef}|{amtStr}|PAY-DIFF-999";
        var validSignature = ComputeHmacHex(secret, canonicalString);

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 1000m,
            PaymentReference: "PAY-DIFF-999",
            Signature: validSignature
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var badRequest = response as BadRequestObjectResult;
        badRequest.Should().NotBeNull();
        badRequest!.StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task HandlePaymentWebhook_WhenTenantGatewayConfigDoesNotMatch_ShouldRejectWithUnauthorized()
    {
        // Setup: Tenant B owns the invoice with secret_B
        var (context, tenantBId, invoiceB, controller, secretB, _) = Setup();

        // Tenant A has their own gateway config in the same DB with secret_A
        var tenantAId = Guid.NewGuid();
        var secretA = "tenant_A_custom_secret_987654321";
        context.PaymentGatewayConfigs.Add(new PaymentGatewayConfig
        {
            TenantId = tenantAId,
            Provider = "Razorpay",
            KeyId = "rzp_tenant_a",
            KeySecret = "secret_tenant_a",
            WebhookSecret = secretA,
            IsActive = true,
            Mode = "Test"
        });
        await context.SaveChangesAsync();

        // Attacker generates signature using Tenant A's secret for Tenant B's invoice
        var invoiceRef = invoiceB.Id.ToString();
        var amtStr = 5000m.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString = $"{invoiceRef}|{amtStr}|ATTACK-REF-1";
        var attackerSignatureUsingTenantASecret = ComputeHmacHex(secretA, canonicalString);

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoiceB.Id,
            InvoiceNumber: invoiceB.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "ATTACK-REF-1",
            Signature: attackerSignatureUsingTenantASecret
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        // Verification MUST FAIL because the controller strictly uses Tenant B's secret
        var unauthorized = response as UnauthorizedObjectResult;
        unauthorized.Should().NotBeNull();
        unauthorized!.StatusCode.Should().Be(401);
    }

    [Fact]
    public async Task HandlePaymentWebhook_WithValidTenantSpecificHmac_ShouldSucceed()
    {
        // Setup: Tenant B owns the invoice with secret_B
        var (context, tenantBId, invoiceB, controller, secretB, _) = Setup();

        // Also add Tenant A config in database to prove no cross-tenant confusion
        var tenantAId = Guid.NewGuid();
        var secretA = "tenant_A_custom_secret_987654321";
        context.PaymentGatewayConfigs.Add(new PaymentGatewayConfig
        {
            TenantId = tenantAId,
            Provider = "Razorpay",
            KeyId = "rzp_tenant_a",
            KeySecret = "secret_tenant_a",
            WebhookSecret = secretA,
            IsActive = true,
            Mode = "Test"
        });
        await context.SaveChangesAsync();

        // Legitimate webhook signed with Tenant B's secret
        var invoiceRef = invoiceB.Id.ToString();
        var amtStr = 5000m.ToString("0.00", CultureInfo.InvariantCulture);
        var canonicalString = $"{invoiceRef}|{amtStr}|GENUINE-REF-1";
        var validSignatureUsingTenantBSecret = ComputeHmacHex(secretB, canonicalString);

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoiceB.Id,
            InvoiceNumber: invoiceB.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "GENUINE-REF-1",
            Signature: validSignatureUsingTenantBSecret
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var okResult = response as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);

        invoiceB.PaymentStatus.Should().Be(PaymentStatus.FullyPaid);
    }

    [Fact]
    public async Task HandlePaymentWebhook_WithRawBodyHmac_ShouldSucceed()
    {
        var (_, _, invoice, controller, secret, _) = Setup();

        var jsonBody = $"{{\"gateway\":\"Razorpay\",\"eventType\":\"payment.captured\",\"invoiceId\":\"{invoice.Id}\",\"invoiceNumber\":\"{invoice.InvoiceNumber}\",\"amount\":5000.00,\"paymentReference\":\"RAW-PAY-123\"}}";
        var rawBodySignature = ComputeHmacHex(secret, jsonBody);

        // Populate request body stream
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(jsonBody));
        controller.HttpContext.Request.Body = stream;

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: invoice.InvoiceNumber,
            Amount: 5000m,
            PaymentReference: "RAW-PAY-123",
            Signature: rawBodySignature
        );

        var response = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        var okResult = response as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);

        invoice.PaymentStatus.Should().Be(PaymentStatus.FullyPaid);
    }
}
