using System.Reflection;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using UdyogBill.Api.Controllers;
using UdyogBill.Api.Filters;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class AiPurchaseScannerSecurityTests
{
    private (AppDbContext context, Guid tenantId, AiPurchaseScannerController controller) CreateController(bool withActiveAddon = true)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        var tenantId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Security Test Store",
            Code = "TEST_TENANT",
            IsActive = true,
            IsAiAddonActive = true,
            AiScansLimit = 500,
            AiScansUsed = 0
        };
        context.Tenants.Add(tenant);

        if (withActiveAddon)
        {
            var addon = new AddOn
            {
                Id = Guid.NewGuid(),
                Code = "ADDON_AI_PRO",
                Name = "AI Bill Scanner Pro",
                IsActive = true
            };
            context.AddOns.Add(addon);

            var tenantAddon = new TenantSubscriptionAddOn
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                AddOnId = addon.Id,
                AddOn = addon,
                ExpiresAtUtc = DateTimeOffset.UtcNow.AddMonths(1),
                IsDeleted = false
            };
            context.TenantSubscriptionAddOns.Add(tenantAddon);
        }

        context.SaveChanges();

        var tenantContextMock = new Mock<ITenantContext>();
        tenantContextMock.Setup(tc => tc.TenantId).Returns(tenantId);

        var config = new ConfigurationBuilder().Build();

        var controller = new AiPurchaseScannerController(context, tenantContextMock.Object, config);
        return (context, tenantId, controller);
    }

    [Fact]
    public async Task ScanPurchaseBill_WhenFileExceeds10Mb_ShouldRejectWithPayloadTooLarge()
    {
        // Arrange
        var (_, _, controller) = CreateController();

        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.Length).Returns(11 * 1024 * 1024); // 11 MB (exceeds 10MB limit)
        fileMock.Setup(f => f.FileName).Returns("huge_invoice.jpg");

        // Act
        var result = await controller.ScanPurchaseBill(fileMock.Object, null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objResult = (ObjectResult)result;
        objResult.StatusCode.Should().Be(StatusCodes.Status413PayloadTooLarge);
    }

    [Fact]
    public async Task ScanPurchaseBill_WhenInvalidFileMagicBytes_ShouldRejectWithBadRequest()
    {
        // Arrange
        var (_, _, controller) = CreateController();

        // Disguised Windows PE executable renamed as JPG
        var fakeJpgBytes = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00 };
        using var stream = new MemoryStream(fakeJpgBytes);
        var fakeFile = new FormFile(stream, 0, fakeJpgBytes.Length, "file", "malicious_bill.jpg");

        // Act
        var result = await controller.ScanPurchaseBill(fakeFile, null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequest = (BadRequestObjectResult)result;
        badRequest.Value.ToString().Should().Contain("INVALID_FILE_SIGNATURE");
    }

    [Fact]
    public async Task ScanPurchaseBill_WhenSpoofedCsvWithBinaryZeros_ShouldRejectWithBadRequest()
    {
        // Arrange
        var (_, _, controller) = CreateController();

        // Binary data disguised as CSV
        var fakeCsvBytes = new byte[] { 0x48, 0x65, 0x00, 0x6C, 0x6C, 0x6F };
        using var stream = new MemoryStream(fakeCsvBytes);
        var fakeFile = new FormFile(stream, 0, fakeCsvBytes.Length, "file", "data.csv");

        // Act
        var result = await controller.ScanPurchaseBill(fakeFile, null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequest = (BadRequestObjectResult)result;
        badRequest.Value.ToString().Should().Contain("INVALID_FILE_SIGNATURE");
    }

    [Fact]
    public async Task ScanPurchaseBill_WhenValidPdfMagicBytes_ShouldPassValidation()
    {
        // Arrange
        var (_, _, controller) = CreateController();

        // Valid PDF magic bytes (%PDF)
        var validPdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35 };
        using var stream = new MemoryStream(validPdfBytes);
        var validFile = new FormFile(stream, 0, validPdfBytes.Length, "file", "tax_invoice.pdf");

        // Act
        var result = await controller.ScanPurchaseBill(validFile, null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>("Valid PDF magic bytes must pass validation successfully.");
    }

    [Fact]
    public async Task ScanPurchaseBill_WhenValidJpegMagicBytes_ShouldPassValidation()
    {
        // Arrange
        var (_, _, controller) = CreateController();

        // Valid JPEG magic bytes (FF D8 FF E0 ...)
        var validJpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        using var stream = new MemoryStream(validJpegBytes);
        var validFile = new FormFile(stream, 0, validJpegBytes.Length, "file", "receipt.jpg");

        // Act
        var result = await controller.ScanPurchaseBill(validFile, null, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>("Valid JPEG magic bytes must pass validation successfully.");
    }

    [Fact]
    public void AiPurchaseScannerController_Endpoints_ShouldHaveStrictSecurityAttributes()
    {
        // Verify ScanPurchaseBill attributes
        var scanMethod = typeof(AiPurchaseScannerController).GetMethod(nameof(AiPurchaseScannerController.ScanPurchaseBill));
        scanMethod.Should().NotBeNull();

        var sizeLimitAttr = scanMethod!.GetCustomAttribute<RequestSizeLimitAttribute>();
        sizeLimitAttr.Should().NotBeNull("Scan endpoint must enforce RequestSizeLimitAttribute at Kestrel pipeline.");

        var permAttr = scanMethod.GetCustomAttributes<RequirePermissionAttribute>().FirstOrDefault();
        permAttr.Should().NotBeNull("Scan endpoint must be gated behind PurchaseCreate permission.");

        // Verify ActivateAiAddon attributes
        var activateMethod = typeof(AiPurchaseScannerController).GetMethod(nameof(AiPurchaseScannerController.ActivateAiAddon));
        activateMethod.Should().NotBeNull();

        var authAttr = activateMethod!.GetCustomAttribute<AuthorizeAttribute>();
        authAttr.Should().NotBeNull();
        authAttr!.Roles.Should().Contain(Roles.TenantAdmin, "Only administrators can activate AI addons.");
        authAttr.Roles.Should().Contain(Roles.SuperAdmin);

        // Verify DirectImportToInventory attributes
        var importMethod = typeof(AiPurchaseScannerController).GetMethod(nameof(AiPurchaseScannerController.DirectImportToInventory));
        importMethod.Should().NotBeNull();
        importMethod!.GetCustomAttributes<RequirePermissionAttribute>().Should().NotBeEmpty("Inventory import must require PurchaseCreate permission.");
    }

    [Fact]
    public async Task ScanPurchaseBill_WithoutPurchaseCreatePermission_ShouldReturn403()
    {
        // Simulate a cashier with only Sales permissions (no PurchaseCreate)
        var cashierUserContext = new MockCurrentUserContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            Roles = new List<string> { "Cashier" },
            Permissions = new List<string> { Permissions.SalesCreate, Permissions.SalesView }
        };

        var filter = new RequirePermissionFilter(cashierUserContext, new[] { Permissions.PurchaseCreate });

        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor()
        );

        var executingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object()
        );

        var nextCalled = false;
        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult<ActionExecutedContext>(null!);
        };

        // Act
        await filter.OnActionExecutionAsync(executingContext, next);

        // Assert
        nextCalled.Should().BeFalse("User without PurchaseCreate permission must not reach controller action.");
        executingContext.Result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)executingContext.Result!;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }
}
