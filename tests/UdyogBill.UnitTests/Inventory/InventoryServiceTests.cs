using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Inventory;

public class InventoryServiceTests
{
    private (AppDbContext context, Guid tenantId, Guid defaultWarehouseId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupInventoryContext()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-PHARMA-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            Roles = new List<string> { "TenantAdmin" }
        };

        var context = new AppDbContext(options, tenantContext);

        // Branch & Default Warehouse
        var branch = new TenantBranch
        {
            TenantId = tenantId,
            BranchCode = "HO-01",
            BranchName = "Head Office Branch",
            IsHeadOffice = true,
            IsActive = true
        };
        var warehouse = new TenantWarehouse
        {
            TenantId = tenantId,
            Branch = branch,
            WarehouseCode = "HO-MAIN",
            WarehouseName = "Main Warehouse",
            IsDefault = true,
            IsActive = true
        };
        branch.Warehouses.Add(warehouse);

        // Category & Brand & UOM
        var category = new Category { TenantId = tenantId, Code = "ANTI", Name = "Antibiotics", IsActive = true };
        var brand = new Brand { TenantId = tenantId, Code = "CIPLA", Name = "Cipla Ltd", IsActive = true };
        var uomBox = new UnitOfMeasure { TenantId = tenantId, Code = "BOX", Name = "Box", Symbol = "bx", IsActive = true };
        var uomStrip = new UnitOfMeasure { TenantId = tenantId, Code = "STRIP", Name = "Strip", Symbol = "str", IsActive = true };

        context.TenantBranches.Add(branch);
        context.Categories.Add(category);
        context.Brands.Add(brand);
        context.UnitsOfMeasure.AddRange(uomBox, uomStrip);
        context.SaveChanges();

        return (context, tenantId, warehouse.Id, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateItem_WithInitialStock_ShouldCreateBatchAndWarehouseStock()
    {
        // Arrange
        var (context, tenantId, warehouseId, tenantContext, userContext) = SetupInventoryContext();
        var auditService = new MockAuditService();
        var service = new InventoryService(context, tenantContext, userContext, auditService);

        var uomBox = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "BOX");
        var category = await context.Categories.FirstAsync(c => c.Code == "ANTI");
        var brand = await context.Brands.FirstAsync(b => b.Code == "CIPLA");

        var request = new CreateItemRequest(
            Sku: "MED-AUG-625",
            Name: "Augmentin 625 Duo Tablet",
            ShortDescription: "Amoxicillin + Clavulanic Acid",
            Barcode: "8901234567890",
            ItemType: ItemType.Goods,
            CategoryId: category.Id,
            BrandId: brand.Id,
            PrimaryUomId: uomBox.Id,
            HSNCode: "3004",
            TaxRate: 12.0m,
            PurchasePrice: 150m,
            SellingPrice: 200m,
            MRP: 220m,
            MinimumStockAlert: 10m,
            TrackBatches: true,
            AttributesJson: "{\"schedule\": \"H1\", \"composition\": \"Amoxicillin 500mg + Clavulanate 125mg\"}",
            InitialStock: 50m,
            InitialWarehouseId: warehouseId,
            InitialBatchNumber: "AUG-B2026",
            InitialBatchExpiryDate: DateTime.UtcNow.AddYears(2)
        );

        // Act
        var result = await service.CreateItemAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var item = await context.Items
            .Include(i => i.Batches)
            .Include(i => i.WarehouseStocks)
            .FirstOrDefaultAsync(i => i.Id == result.Data);

        Assert.NotNull(item);
        Assert.Equal("MED-AUG-625", item.Sku);
        Assert.Single(item.Batches);
        Assert.Equal("AUG-B2026", item.Batches.First().BatchNumber);
        Assert.Single(item.WarehouseStocks);
        Assert.Equal(50m, item.WarehouseStocks.First().CurrentQuantity);

        var movement = await context.StockMovements.FirstOrDefaultAsync(sm => sm.ItemId == item.Id);
        Assert.NotNull(movement);
        Assert.Equal(50m, movement.Quantity);
    }

    [Fact]
    public async Task CreateUnitConversion_ShouldPersistMultiplier()
    {
        // Arrange
        var (context, tenantId, warehouseId, tenantContext, userContext) = SetupInventoryContext();
        var auditService = new MockAuditService();
        var service = new InventoryService(context, tenantContext, userContext, auditService);

        var uomBox = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "BOX");
        var uomStrip = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "STRIP");

        var request = new CreateUnitConversionRequest(
            FromUomId: uomBox.Id,
            ToUomId: uomStrip.Id,
            ConversionFactor: 10.0m // 1 Box = 10 Strips
        );

        // Act
        var result = await service.CreateUnitConversionAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var conversions = await service.GetUnitConversionsAsync();
        Assert.True(conversions.IsSuccess);
        Assert.Single(conversions.Data!);
        Assert.Equal(10.0m, conversions.Data![0].ConversionFactor);
        Assert.Equal("BOX", conversions.Data![0].FromUomCode);
        Assert.Equal("STRIP", conversions.Data![0].ToUomCode);
    }

    [Fact]
    public async Task RecordStockAdjustment_WhenInward_ShouldIncreaseQuantityAndLogMovement()
    {
        // Arrange
        var (context, tenantId, warehouseId, tenantContext, userContext) = SetupInventoryContext();
        var auditService = new MockAuditService();
        var service = new InventoryService(context, tenantContext, userContext, auditService);

        var uomBox = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "BOX");
        var createResult = await service.CreateItemAsync(new CreateItemRequest(
            Sku: "MED-PARA-500",
            Name: "Paracetamol 500mg",
            PrimaryUomId: uomBox.Id,
            PurchasePrice: 20m,
            SellingPrice: 30m,
            MRP: 35m,
            InitialStock: 20m,
            InitialWarehouseId: warehouseId
        ));

        // Act: Increase stock by +30 (Physical audit adjustment)
        var adjRequest = new StockAdjustmentRequest(
            ItemId: createResult.Data,
            WarehouseId: warehouseId,
            BatchId: null,
            MovementType: StockMovementType.PhysicalAdjustment,
            QuantityChange: 30m,
            UnitCost: 20m,
            Notes: "Discovered unopened carton during audit"
        );
        var adjResult = await service.RecordStockAdjustmentAsync(adjRequest);

        // Assert
        Assert.True(adjResult.IsSuccess);
        var balances = await service.GetItemStockBalancesAsync(createResult.Data, warehouseId);
        Assert.True(balances.IsSuccess);
        Assert.Equal(50m, balances.Data![0].CurrentQuantity);

        var movements = await context.StockMovements
            .Where(sm => sm.ItemId == createResult.Data)
            .OrderByDescending(sm => sm.CreatedAtUtc)
            .ToListAsync();

        Assert.Equal(2, movements.Count);
        Assert.Equal(30m, movements[0].Quantity);
        Assert.Equal(20m, movements[0].QuantityBefore);
        Assert.Equal(50m, movements[0].QuantityAfter);
    }

    [Fact]
    public async Task RecordStockAdjustment_WhenInsufficientStock_ShouldReturnFailure()
    {
        // Arrange
        var (context, tenantId, warehouseId, tenantContext, userContext) = SetupInventoryContext();
        var auditService = new MockAuditService();
        var service = new InventoryService(context, tenantContext, userContext, auditService);

        var uomBox = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "BOX");
        var createResult = await service.CreateItemAsync(new CreateItemRequest(
            Sku: "MED-PARA-500",
            Name: "Paracetamol 500mg",
            PrimaryUomId: uomBox.Id,
            PurchasePrice: 20m,
            SellingPrice: 30m,
            MRP: 35m,
            InitialStock: 10m,
            InitialWarehouseId: warehouseId
        ));

        // Act: Deduct -25 (when only 10 in stock)
        var adjRequest = new StockAdjustmentRequest(
            ItemId: createResult.Data,
            WarehouseId: warehouseId,
            BatchId: null,
            MovementType: StockMovementType.DamageLoss,
            QuantityChange: -25m,
            UnitCost: 20m,
            Notes: "Damaged flood stock"
        );
        var adjResult = await service.RecordStockAdjustmentAsync(adjRequest);

        // Assert
        Assert.False(adjResult.IsSuccess);
        Assert.Equal("INSUFFICIENT_STOCK", adjResult.ErrorCode);
    }

    [Fact]
    public async Task GetLowStockAlerts_ShouldReturnItemsBelowThreshold()
    {
        // Arrange
        var (context, tenantId, warehouseId, tenantContext, userContext) = SetupInventoryContext();
        var auditService = new MockAuditService();
        var service = new InventoryService(context, tenantContext, userContext, auditService);

        var uomBox = await context.UnitsOfMeasure.FirstAsync(u => u.Code == "BOX");
        
        // Item 1: Stock 5, MinStockAlert 10 -> Low stock!
        await service.CreateItemAsync(new CreateItemRequest(
            Sku: "LOW-STOCK-01",
            Name: "Low Stock Medicine",
            PrimaryUomId: uomBox.Id,
            MinimumStockAlert: 10m,
            InitialStock: 5m,
            InitialWarehouseId: warehouseId
        ));

        // Item 2: Stock 100, MinStockAlert 20 -> Healthy stock!
        await service.CreateItemAsync(new CreateItemRequest(
            Sku: "HIGH-STOCK-02",
            Name: "Healthy Stock Item",
            PrimaryUomId: uomBox.Id,
            MinimumStockAlert: 20m,
            InitialStock: 100m,
            InitialWarehouseId: warehouseId
        ));

        // Act
        var alerts = await service.GetLowStockAlertsAsync();

        // Assert
        Assert.True(alerts.IsSuccess);
        Assert.Single(alerts.Data!);
        Assert.Equal("LOW-STOCK-01", alerts.Data![0].Sku);
        Assert.Equal(5m, alerts.Data![0].CurrentStock);
    }
}
