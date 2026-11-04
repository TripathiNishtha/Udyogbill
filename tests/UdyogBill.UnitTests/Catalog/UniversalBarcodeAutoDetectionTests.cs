using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Catalog;

public class UniversalBarcodeAutoDetectionTests
{
    private BarcodeService CreateBarcodeService(AppDbContext context, Guid tenantId)
    {
        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true
        };

        return new BarcodeService(context, userContext);
    }

    [Fact]
    public async Task LookupBarcode_ForGoldieeMasale_ShouldAutoFillBrandHsnAndTaxRate()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // Goldiee Masale Barcode (Kanpur regional brand prefix 8904005)
        var result = await service.LookupBarcodeAsync("8904005123456");

        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("Goldiee");
        item.HsnCode.Should().Be("0910");
        item.TaxRate.Should().Be(5.0m);
        item.IndustryCode.Should().Be("FMCG");
    }

    [Fact]
    public async Task LookupBarcode_ForMDHMasale_ShouldAutoFillBrandHsnAndTaxRate()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // MDH Spices Prefix 8901233
        var result = await service.LookupBarcodeAsync("8901233987654");

        result.IsSuccess.Should().BeTrue();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("MDH");
        item.HsnCode.Should().Be("0910");
        item.TaxRate.Should().Be(5.0m);
    }

    [Fact]
    public async Task LookupBarcode_ForPharmaDoloMicroLabs_ShouldAutoFillPharmaHsnAndGst()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // Micro Labs (Dolo 650) Prefix 8901148
        var result = await service.LookupBarcodeAsync("8901148554433");

        result.IsSuccess.Should().BeTrue();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("Micro Labs");
        item.HsnCode.Should().StartWith("3004");
        item.TaxRate.Should().Be(12.0m);
        item.IndustryCode.Should().Be("PHARMA");
        item.UnitCode.Should().Be("Strip");
    }

    [Fact]
    public async Task LookupBarcode_ForFootwearBata_ShouldAutoFillFootwearHsnAndGst()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // Bata India Prefix 8901402
        var result = await service.LookupBarcodeAsync("8901402112233");

        result.IsSuccess.Should().BeTrue();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("Bata");
        item.HsnCode.Should().Be("6403");
        item.TaxRate.Should().Be(12.0m);
        item.IndustryCode.Should().Be("FOOTWEAR");
        item.UnitCode.Should().Be("Pair");
    }

    [Fact]
    public async Task LookupBarcode_ForAsianPaints_ShouldAutoFillPaintHsnAndGst()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // Asian Paints Prefix 8901202
        var result = await service.LookupBarcodeAsync("8901202889900");

        result.IsSuccess.Should().BeTrue();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("Asian Paints");
        item.HsnCode.Should().Be("3208");
        item.TaxRate.Should().Be(18.0m);
        item.IndustryCode.Should().Be("HARDWARE");
        item.UnitCode.Should().Be("Ltr");
    }

    [Fact]
    public async Task LookupBarcode_ForElectronicsBoAt_ShouldAutoFillElectronicsHsnAndGst()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var tenantContext = new MockTenantContext { TenantId = tenantId };

        using var context = new AppDbContext(options, tenantContext);
        var service = CreateBarcodeService(context, tenantId);

        // boAt Audio Prefix 8906145
        var result = await service.LookupBarcodeAsync("8906145778899");

        result.IsSuccess.Should().BeTrue();
        result.Data!.MasterCatalogItem.Should().NotBeNull();

        var item = result.Data.MasterCatalogItem!;
        item.BrandName.Should().Be("boAt");
        item.HsnCode.Should().Be("85183000");
        item.TaxRate.Should().Be(18.0m);
        item.IndustryCode.Should().Be("ELECTRONICS");
    }
}
