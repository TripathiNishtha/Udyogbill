using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Verticals;

public class IndustryCapabilitiesTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext, Guid branchId, Guid warehouseId) SetupContext()
    {
        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-TEST-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "admin@testpharma.com"
        };

        var context = new AppDbContext(options, tenantContext);

        var branch = new TenantBranch
        {
            Id = branchId,
            TenantId = tenantId,
            BranchCode = "HO-01",
            BranchName = "Head Office",
            IsHeadOffice = true,
            IsActive = true
        };

        var warehouse = new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseCode = "WH-MAIN",
            WarehouseName = "Main Warehouse",
            IsDefault = true,
            IsActive = true
        };

        var uomPcs = new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "PCS", Name = "Pieces" };
        var uomKg = new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "KG", Name = "Kilogram" };
        var uomTab = new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "TAB", Name = "Tablets" };

        context.TenantBranches.Add(branch);
        context.TenantWarehouses.Add(warehouse);
        context.UnitsOfMeasure.AddRange(uomPcs, uomKg, uomTab);
        context.SaveChanges();

        return (context, tenantId, tenantContext, userContext, branchId, warehouseId);
    }

    [Fact]
    public async Task GetPharmaExpiryAlerts_ShouldReturnNearExpiryBatches()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext, branchId, warehouseId) = SetupContext();
        var auditService = new MockAuditService();
        var service = new IndustryCapabilitiesService(context, tenantContext, userContext, auditService);

        var uom = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "TAB");
        var item = new Item
        {
            TenantId = tenantId,
            Sku = "MED-001",
            Name = "Amoxicillin 500mg",
            PrimaryUomId = uom.Id,
            PrimaryUom = uom,
            SellingPrice = 120,
            MRP = 150
        };
        context.Items.Add(item);

        // Near-expiry batch (expires in 20 days)
        var nearBatch = new ItemBatch
        {
            TenantId = tenantId,
            ItemId = item.Id,
            BatchNumber = "BATCH-EXP-NEAR",
            ExpiryDate = DateTime.UtcNow.Date.AddDays(20),
            MRP = 150,
            SaleRate = 120
        };

        // Far-expiry batch (expires in 300 days)
        var farBatch = new ItemBatch
        {
            TenantId = tenantId,
            ItemId = item.Id,
            BatchNumber = "BATCH-EXP-FAR",
            ExpiryDate = DateTime.UtcNow.Date.AddDays(300),
            MRP = 150,
            SaleRate = 120
        };

        context.ItemBatches.AddRange(nearBatch, farBatch);

        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = item.Id,
            WarehouseId = warehouseId,
            BatchId = nearBatch.Id,
            CurrentQuantity = 50
        });

        context.SaveChanges();

        // Act
        var result = await service.GetPharmaExpiryAlertsAsync(daysThreshold: 60);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(result.Data!);
        Assert.Equal("BATCH-EXP-NEAR", result.Data![0].BatchNumber);
        Assert.Equal(50, result.Data[0].CurrentStock);
        Assert.Equal(7500, result.Data[0].TotalValueAtRisk); // 50 * 150
    }

    [Fact]
    public async Task GenerateMatrixVariants_ShouldCreateCartesianProduct()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext, branchId, warehouseId) = SetupContext();
        var auditService = new MockAuditService();
        var service = new IndustryCapabilitiesService(context, tenantContext, userContext, auditService);

        var uom = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "PCS");
        var shirtItem = new Item
        {
            TenantId = tenantId,
            Sku = "SHIRT-POLO",
            Name = "Classic Polo T-Shirt",
            PrimaryUomId = uom.Id,
            PrimaryUom = uom,
            SellingPrice = 899
        };
        context.Items.Add(shirtItem);
        context.SaveChanges();

        // Act: 3 Sizes x 2 Colors = 6 Variants
        var request = new GenerateMatrixVariantsRequest(
            BaseItemId: shirtItem.Id,
            Sizes: new List<string> { "M", "L", "XL" },
            Colors: new List<string> { "Navy Blue", "Crimson Red" }
        );

        var result = await service.GenerateMatrixVariantsAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(6, result.Data!.Count);
        Assert.Contains(result.Data, v => v.VariantSku.Contains("SHIRT-POLO-M-NAV"));
        Assert.Contains(result.Data, v => v.VariantSku.Contains("SHIRT-POLO-XL-CRI"));

        var dbVariants = await context.ItemVariants.Where(v => v.ItemId == shirtItem.Id).ToListAsync();
        Assert.Equal(6, dbVariants.Count);
    }

    [Fact]
    public async Task RecipeBom_CreateAndExecuteProductionRun_ShouldDeductStock()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext, branchId, warehouseId) = SetupContext();
        var auditService = new MockAuditService();
        var service = new IndustryCapabilitiesService(context, tenantContext, userContext, auditService);

        var uomKg = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "KG");
        var uomPcs = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "PCS");

        // Raw Material 1: Flour
        var flour = new Item
        {
            TenantId = tenantId,
            Sku = "RAW-FLOUR",
            Name = "Wheat Flour",
            PrimaryUomId = uomKg.Id,
            PrimaryUom = uomKg,
            PurchasePrice = 40
        };

        // Raw Material 2: Sugar
        var sugar = new Item
        {
            TenantId = tenantId,
            Sku = "RAW-SUGAR",
            Name = "White Sugar",
            PrimaryUomId = uomKg.Id,
            PrimaryUom = uomKg,
            PurchasePrice = 50
        };

        // Finished Goods: Cake
        var cake = new Item
        {
            TenantId = tenantId,
            Sku = "FG-CAKE",
            Name = "Chocolate Cake 1kg",
            PrimaryUomId = uomPcs.Id,
            PrimaryUom = uomPcs,
            SellingPrice = 500,
            MRP = 600
        };

        context.Items.AddRange(flour, sugar, cake);

        // Initial Raw Material Stocks: 100 kg Flour, 50 kg Sugar
        context.ItemWarehouseStocks.AddRange(
            new ItemWarehouseStock { TenantId = tenantId, ItemId = flour.Id, WarehouseId = warehouseId, CurrentQuantity = 100 },
            new ItemWarehouseStock { TenantId = tenantId, ItemId = sugar.Id, WarehouseId = warehouseId, CurrentQuantity = 50 }
        );
        context.SaveChanges();

        // 1. Create Recipe BOM: 1 Cake requires 2 kg Flour + 1 kg Sugar
        var createBomReq = new CreateRecipeBomRequest(
            FinishedGoodsItemId: cake.Id,
            RecipeName: "Standard 1kg Chocolate Cake",
            Description: "Delicious freshly baked cake",
            OutputYieldQuantity: 1,
            OutputUomId: uomPcs.Id,
            Ingredients: new List<BomIngredientInput>
            {
                new(flour.Id, 2m, uomKg.Id),
                new(sugar.Id, 1m, uomKg.Id)
            }
        );

        var bomResult = await service.CreateRecipeBomAsync(createBomReq);
        Assert.True(bomResult.IsSuccess);

        // 2. Execute Production Run: Produce 10 Cakes
        var prodReq = new ExecuteProductionRunRequest(
            RecipeBomId: bomResult.Data,
            TargetWarehouseId: warehouseId,
            BatchesToProduce: 10,
            BatchNumber: "BATCH-CAKE-001"
        );

        var prodResult = await service.ExecuteProductionRunAsync(prodReq);

        // Assert
        Assert.True(prodResult.IsSuccess);
        Assert.Equal(10, prodResult.Data!.QuantityProduced);
        // Cost: (2kg * 40 * 10) + (1kg * 50 * 10) = 800 + 500 = 1300
        Assert.Equal(1300, prodResult.Data.TotalCostOfProduction);

        // Check Raw Material Stock Remaining: 100 - 20 = 80 kg Flour, 50 - 10 = 40 kg Sugar
        var flourStock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == flour.Id && s.WarehouseId == warehouseId);
        var sugarStock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == sugar.Id && s.WarehouseId == warehouseId);
        Assert.Equal(80, flourStock.CurrentQuantity);
        Assert.Equal(40, sugarStock.CurrentQuantity);

        // Check Finished Goods Stock: 10 Cakes created
        var cakeStock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == cake.Id && s.WarehouseId == warehouseId);
        Assert.Equal(10, cakeStock.CurrentQuantity);
    }
}
