using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using UdyogBill.Api.Controllers.Public;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Infrastructure.Services;
using UdyogBill.Persistence.Context;
using Xunit;

namespace UdyogBill.UnitTests.Sales;

public class PublicInvoiceSecurityTests
{
    private (AppDbContext Context, IInvoiceSignatureService SignatureService, Mock<ITenantContext> TenantContextMock, PublicInvoicesController Controller, SalesInvoice Invoice) CreateController(bool isAuthenticated = false, Guid? authenticatedTenantId = null, bool isSuperAdmin = false)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContextMock = new Mock<ITenantContext>();
        tenantContextMock.Setup(c => c.TenantId).Returns(authenticatedTenantId ?? Guid.Empty);
        tenantContextMock.Setup(c => c.IsSuperAdmin).Returns(isSuperAdmin);

        var context = new AppDbContext(options, tenantContextMock.Object);

        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Security:InvoiceSigningKey"]).Returns("TEST_SECURITY_SIGNING_SECRET_KEY_FOR_INVOICE_TESTS_12345!");
        var signatureService = new InvoiceSignatureService(configMock.Object);

        var controller = new PublicInvoicesController(context, signatureService, tenantContextMock.Object);

        var claims = new List<Claim>();
        if (isAuthenticated)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()));
            if (authenticatedTenantId.HasValue)
            {
                claims.Add(new Claim("tenant_id", authenticatedTenantId.Value.ToString()));
            }
            if (isSuperAdmin)
            {
                claims.Add(new Claim("is_super_admin", "true"));
            }
        }

        var identity = isAuthenticated
            ? new ClaimsIdentity(claims, "TestAuth")
            : new ClaimsIdentity();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        var industry = new Industry { Id = Guid.NewGuid(), Code = "RETAIL_SEC_" + Guid.NewGuid().ToString("N").Substring(0, 8), Name = "Retail" };
        var tenantId = authenticatedTenantId ?? Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-SEC-" + Guid.NewGuid().ToString("N").Substring(0, 6),
            BusinessName = "Secure Mart",
            IndustryId = industry.Id,
            Industry = industry,
            Status = TenantStatus.Active,
            IsActive = true
        };

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchCode = "MAIN",
            BranchName = "Main Branch"
        };

        var warehouse = new TenantWarehouse
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            WarehouseCode = "WH-01",
            WarehouseName = "Main Warehouse"
        };

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0001",
            InvoiceDate = DateTime.UtcNow,
            Status = InvoiceStatus.Issued,
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branch.Id,
            Branch = branch,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            CustomerName = "Secret Customer PII",
            CustomerPhone = "9999999999",
            CustomerEmail = "customer@secretpii.com",
            TotalAmount = 5000m
        };

        context.Industries.Add(industry);
        context.Tenants.Add(tenant);
        context.TenantBranches.Add(branch);
        context.TenantWarehouses.Add(warehouse);
        context.SalesInvoices.Add(invoice);
        context.SaveChanges();

        return (context, signatureService, tenantContextMock, controller, invoice);
    }

    [Fact]
    public async Task GetPublicInvoice_WithoutValidHmacSignature_ShouldReturn403Forbidden()
    {
        // Arrange
        var (_, _, _, controller, invoice) = CreateController(isAuthenticated: false);

        // Act: Calling with NO token
        var result = await controller.GetPublicInvoice(invoice.Id, token: null, expires: null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)result;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task GetPublicInvoice_WithTamperedSignature_ShouldReturn403Forbidden()
    {
        // Arrange
        var (_, _, _, controller, invoice) = CreateController(isAuthenticated: false);

        // Act: Calling with forged/tampered token
        var result = await controller.GetPublicInvoice(invoice.Id, token: "badc0de000000000000000000000000000000000000000000000000000000000", expires: null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)result;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task GetPublicInvoice_WithExpiredTimestamp_ShouldReturn401Unauthorized()
    {
        // Arrange
        var (_, signatureService, _, controller, invoice) = CreateController(isAuthenticated: false);
        var expiredTimestamp = DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds();
        var token = signatureService.GenerateToken(invoice.Id, expiredTimestamp);

        // Act: Calling with valid signature but expired timestamp
        var result = await controller.GetPublicInvoice(invoice.Id, token: token, expires: expiredTimestamp, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)result;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task GetPublicInvoice_WithValidHmacAndTimestamp_ShouldReturn200()
    {
        // Arrange
        var (_, signatureService, _, controller, invoice) = CreateController(isAuthenticated: false);
        var validTimestamp = DateTimeOffset.UtcNow.AddHours(24).ToUnixTimeSeconds();
        var token = signatureService.GenerateToken(invoice.Id, validTimestamp);

        // Act: Calling with valid HMAC token and future timestamp
        var result = await controller.GetPublicInvoice(invoice.Id, token: token, expires: validTimestamp, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        okResult.Value.Should().BeOfType<PublicInvoiceResponseDto>();
        var response = (PublicInvoiceResponseDto)okResult.Value!;
        response.Invoice.Id.Should().Be(invoice.Id);
        response.Invoice.CustomerName.Should().Be("Secret Customer PII");
    }

    [Fact]
    public async Task GetPublicInvoice_WhenAuthenticatedUserAccessingOwnTenantInvoice_ShouldReturn200()
    {
        // Arrange: User is authenticated to own store
        var ownTenantId = Guid.NewGuid();
        var (_, _, _, controller, invoice) = CreateController(isAuthenticated: true, authenticatedTenantId: ownTenantId);

        // Act: Calling without token because user is authenticated to own store
        var result = await controller.GetPublicInvoice(invoice.Id, token: null, expires: null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetPublicInvoice_WhenAuthenticatedUserAccessingOtherTenantInvoiceWithoutToken_ShouldReturn403()
    {
        // Arrange: Invoice belongs to Store A, but User is authenticated to Alien Store B
        var storeAId = Guid.NewGuid();
        var alienStoreBId = Guid.NewGuid();
        var (context, _, tenantContextMock, controller, invoice) = CreateController(isAuthenticated: true, authenticatedTenantId: storeAId);

        // Switch context to alien store B
        tenantContextMock.Setup(c => c.TenantId).Returns(alienStoreBId);

        // Act: Alien store user tries to access Store A invoice without cryptographic token
        var result = await controller.GetPublicInvoice(invoice.Id, token: null, expires: null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)result;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }
}
