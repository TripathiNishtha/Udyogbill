using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Sales;

public class EnterpriseHardeningTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouseId, Guid uomId, Guid itemId, Guid partyId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupTestContext()
    {
        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var uomId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var partyId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-QA-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            Roles = new List<string> { "TenantAdmin" }
        };

        var context = new AppDbContext(options, tenantContext);

        context.TenantBranches.Add(new TenantBranch
        {
            Id = branchId,
            TenantId = tenantId,
            BranchName = "Main Branch",
            BranchCode = "BR-01",
            State = "Maharashtra",
            StateCode = "27",
            GSTIN = "27AABCA1234A1Z5"
        });

        context.TenantWarehouses.Add(new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseName = "Main Warehouse",
            WarehouseCode = "WH-01"
        });

        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Code = "BOX",
            Name = "Box"
        });

        context.Items.Add(new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Sku = "MED-001",
            Name = "Amoxicillin 500mg",
            PrimaryUomId = uomId,
            TrackInventory = true,
            TaxRate = 12m,
            SellingPrice = 100m,
            PurchasePrice = 80m,
            MRP = 120m,
            IsTaxInclusive = false
        });

        context.Parties.Add(new Party
        {
            Id = partyId,
            TenantId = tenantId,
            LegalName = "City Chemist Retail",
            PartyType = PartyType.Customer,
            StateCode = "27",
            GSTIN = "27ABCDE1234F1Z5"
        });

        context.SaveChanges();
        return (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateInvoice_WhenBatchIsQuarantined_ReturnsQuarantineFailure()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupTestContext();

        var batchId = Guid.NewGuid();
        context.ItemBatches.Add(new ItemBatch
        {
            Id = batchId,
            TenantId = tenantId,
            ItemId = itemId,
            BatchNumber = "BATCH-CONTAMINATED-99",
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            IsActive = true,
            IsQuarantined = true, // ⚠️ QUARANTINED BATCH
            QuarantinedStock = 50m
        });
        await context.SaveChangesAsync();

        var auditService = new MockAuditService();
        var salesService = new SalesService(context, tenantContext, userContext, auditService);

        var request = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceType = InvoiceType.TaxInvoice,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    UomId = uomId,
                    BatchId = batchId,
                    BatchNumber = "BATCH-CONTAMINATED-99",
                    Quantity = 5m,
                    UnitPrice = 100m
                }
            }
        };

        // Act
        var result = await salesService.CreateInvoiceAsync(request);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("BATCH_QUARANTINED", result.ErrorCode);
        Assert.Contains("under regulatory quarantine", result.ErrorMessage);
    }

    [Fact]
    public async Task CreateInvoice_WhenStockIsInsufficientAndNegativeStockDisallowed_ReturnsInsufficientStockFailure()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupTestContext();

        // Stock available is only 5 units
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 5m,
            ReservedQuantity = 0m
        });
        await context.SaveChangesAsync();

        var auditService = new MockAuditService();
        var salesService = new SalesService(context, tenantContext, userContext, auditService);

        // Requesting 50 units (exceeds 5 units available)
        var request = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceType = InvoiceType.TaxInvoice,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    UomId = uomId,
                    Quantity = 50m,
                    UnitPrice = 100m
                }
            }
        };

        // Act
        var result = await salesService.CreateInvoiceAsync(request);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("INSUFFICIENT_STOCK", result.ErrorCode);
        Assert.Contains("Insufficient stock", result.ErrorMessage);
    }

    [Fact]
    public async Task CreateInvoice_WhenDateIsBeforePeriodLock_ReturnsPeriodClosedFailure()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupTestContext();

        // Lock all entries before 2026-04-01
        context.TenantSettings.Add(new TenantSetting
        {
            TenantId = tenantId,
            Category = "Accounting",
            Key = "LockEntriesBeforeDate",
            Value = "2026-04-01",
            ValueType = "string"
        });
        await context.SaveChangesAsync();

        var auditService = new MockAuditService();
        var salesService = new SalesService(context, tenantContext, userContext, auditService);

        // Attempting to post backdated invoice on 2026-03-15
        var request = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc),
            InvoiceType = InvoiceType.TaxInvoice,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    UomId = uomId,
                    Quantity = 1m,
                    UnitPrice = 100m
                }
            }
        };

        // Act
        var result = await salesService.CreateInvoiceAsync(request);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("PERIOD_CLOSED", result.ErrorCode);
        Assert.Contains("Accounting period before 2026-04-01 is closed", result.ErrorMessage);
    }
}
