using System;
using System.Collections.Generic;
using System.Security.Claims;
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
using UdyogBill.Api.Controllers.Public;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class OpenRedirectSecurityTests
{
    private readonly Mock<IInvoiceSignatureService> _mockSignatureService;
    private readonly Mock<ITenantContext> _mockTenantContext;
    private readonly Mock<ILogger<PublicInvoicesController>> _mockLogger;

    public OpenRedirectSecurityTests()
    {
        _mockSignatureService = new Mock<IInvoiceSignatureService>();
        _mockTenantContext = new Mock<ITenantContext>();
        _mockLogger = new Mock<ILogger<PublicInvoicesController>>();
    }

    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private PublicInvoicesController CreateController(AppDbContext context, IConfiguration? configuration = null)
    {
        var controller = new PublicInvoicesController(
            context,
            _mockSignatureService.Object,
            _mockTenantContext.Object,
            configuration,
            _mockLogger.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    [Theory]
    [InlineData("https://udyogbill.com/images/logo.png")]
    [InlineData("https://assets.udyogbill.com/logo.png")]
    [InlineData("https://cdn.udyogbill.com/logos/tenant.png")]
    [InlineData("https://mybucket.s3.amazonaws.com/logo.png")]
    [InlineData("https://d123456.cloudfront.net/logo.png")]
    [InlineData("https://myaccount.blob.core.windows.net/logos/logo.png")]
    [InlineData("https://storage.googleapis.com/my-bucket/logo.png")]
    [InlineData("https://myid.r2.cloudflarestorage.com/logo.png")]
    [InlineData("http://localhost:5000/logo.png")]
    [InlineData("http://127.0.0.1:8080/logo.png")]
    public void IsTrustedLogoUri_WhenTrustedHostAndValidScheme_ShouldReturnTrue(string url)
    {
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        var uri = new Uri(url);
        var result = controller.IsTrustedLogoUri(uri);

        result.Should().BeTrue($"URL '{url}' should be considered trusted");
    }

    [Theory]
    [InlineData("https://evil-phishing.com/logo.png")]
    [InlineData("https://attacker.org/steal.png")]
    [InlineData("http://udyogbill.com/logo.png")] // Insecure HTTP on external domain
    [InlineData("http://s3.amazonaws.com/logo.png")] // Insecure HTTP on external domain
    [InlineData("https://fake-udyogbill.com/logo.png")]
    [InlineData("https://udyogbill.com.attacker.com/logo.png")]
    [InlineData("ftp://udyogbill.com/logo.png")]
    [InlineData("javascript:alert(1)")]
    public void IsTrustedLogoUri_WhenUntrustedHostOrInsecureScheme_ShouldReturnFalse(string url)
    {
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            var result = controller.IsTrustedLogoUri(uri);
            result.Should().BeFalse($"URL '{url}' should NOT be considered trusted");
        }
    }

    [Fact]
    public void IsTrustedLogoUri_WhenCustomConfiguredAllowedDomain_ShouldHonorConfiguration()
    {
        using var context = CreateInMemoryDbContext();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "PublicInvoices:AllowedLogoDomains:0", "custom-cdn.example.org" },
                { "PublicInvoices:AllowedLogoDomains:1", ".mypartner.com" }
            })
            .Build();

        var controller = CreateController(context, config);

        controller.IsTrustedLogoUri(new Uri("https://custom-cdn.example.org/logo.png")).Should().BeTrue();
        controller.IsTrustedLogoUri(new Uri("https://images.mypartner.com/logo.png")).Should().BeTrue();
        controller.IsTrustedLogoUri(new Uri("https://evil.com/logo.png")).Should().BeFalse();
    }

    [Fact]
    public async Task GetPublicInvoiceLogo_WhenUntrustedExternalUrl_ShouldBlockAndReturnNotFound()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Attacker Target Company",
            Code = "ATC01",
            Email = "target@example.com",
            LogoUrl = "https://evil-phishing-site.xyz/malicious-payload.png"
        };
        var invoice = new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "INV-001",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 5000,
            Status = InvoiceStatus.Draft
        };

        context.Tenants.Add(tenant);
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        _mockSignatureService
            .Setup(s => s.ValidateToken(invoiceId, "valid-token", null, out It.Ref<string?>.IsAny))
            .Returns(true);

        var controller = CreateController(context);

        var result = await controller.GetPublicInvoiceLogo(invoiceId, token: "valid-token");

        result.Should().BeOfType<NotFoundResult>("Untrusted external URLs must be blocked to prevent open redirect vulnerabilities");
    }

    [Fact]
    public async Task GetPublicInvoiceLogo_WhenTrustedExternalUrl_ShouldReturnRedirect()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Legitimate Company",
            Code = "LEGIT01",
            Email = "info@legit.com",
            LogoUrl = "https://assets.udyogbill.com/tenants/legit-logo.png"
        };
        var invoice = new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "INV-002",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 1500,
            Status = InvoiceStatus.Draft
        };

        context.Tenants.Add(tenant);
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        _mockSignatureService
            .Setup(s => s.ValidateToken(invoiceId, "valid-token", null, out It.Ref<string?>.IsAny))
            .Returns(true);

        var controller = CreateController(context);

        var result = await controller.GetPublicInvoiceLogo(invoiceId, token: "valid-token");

        var redirectResult = result.Should().BeOfType<RedirectResult>().Subject;
        redirectResult.Url.Should().Be("https://assets.udyogbill.com/tenants/legit-logo.png");
    }

    [Fact]
    public async Task GetPublicInvoiceLogo_WhenLocalRelativePath_ShouldReturnLocalRedirect()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Local Asset Company",
            Code = "LOC01",
            Email = "loc@example.com",
            LogoUrl = "/uploads/tenants/local-logo.png"
        };
        var invoice = new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "INV-003",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 2500,
            Status = InvoiceStatus.Draft
        };

        context.Tenants.Add(tenant);
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        _mockSignatureService
            .Setup(s => s.ValidateToken(invoiceId, "valid-token", null, out It.Ref<string?>.IsAny))
            .Returns(true);

        var controller = CreateController(context);

        var result = await controller.GetPublicInvoiceLogo(invoiceId, token: "valid-token");

        var localRedirectResult = result.Should().BeOfType<LocalRedirectResult>().Subject;
        localRedirectResult.Url.Should().Be("/uploads/tenants/local-logo.png");
    }

    [Fact]
    public async Task GetPublicInvoiceLogo_WhenBase64DataUri_ShouldReturnFileContent()
    {
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var fakePngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var base64Logo = $"data:image/png;base64,{Convert.ToBase64String(fakePngBytes)}";

        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Inline Data Company",
            Code = "INL01",
            Email = "inl@example.com",
            LogoUrl = base64Logo
        };
        var invoice = new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "INV-004",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 3500,
            Status = InvoiceStatus.Draft
        };

        context.Tenants.Add(tenant);
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        _mockSignatureService
            .Setup(s => s.ValidateToken(invoiceId, "valid-token", null, out It.Ref<string?>.IsAny))
            .Returns(true);

        var controller = CreateController(context);

        var result = await controller.GetPublicInvoiceLogo(invoiceId, token: "valid-token");

        var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
        fileResult.ContentType.Should().Be("image/png");
        fileResult.FileContents.Should().Equal(fakePngBytes);
    }
}
