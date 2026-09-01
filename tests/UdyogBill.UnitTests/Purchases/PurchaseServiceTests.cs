using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Purchases;

public class PurchaseServiceTests
{
    private (AppDbContext context, PurchaseService service, Guid tenantId, Guid branchId, Guid warehouseId, Guid supplierId, Guid itemId, Guid uomId)
        CreateTestContext(string branchState = "27", string supplierState = "27")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"UdyogBill_Purchase_Test_{Guid.NewGuid()}")
            .Options;

        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var uomId = Guid.NewGuid();

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

        // Seed Branch
        context.TenantBranches.Add(new TenantBranch
        {
            Id = branchId,
            TenantId = tenantId,
            BranchName = "Main Branch",
            BranchCode = "BR-01",
            State = "Maharashtra",
            StateCode = branchState,
            GSTIN = $"{branchState}AABCA1234A1Z5"
        });

        // Seed Warehouse
        context.TenantWarehouses.Add(new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseName = "Main Warehouse",
            WarehouseCode = "WH-01"
        });

        // Seed UOM
        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Name = "Box",
            Code = "BOX",
            DecimalPlaces = 0
        });

        // Seed Item (18% GST, Purchase Price ₹80)
        context.Items.Add(new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Sku = "MED-001",
            Name = "Paracetamol 650",
            PrimaryUomId = uomId,
            PurchasePrice = 80m,
            SellingPrice = 100m,
            MRP = 120m,
            TaxRate = 18m,
            HSNCode = "3004"
        });

        // Seed Initial Stock (0 Boxes)
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 0m
        });

        // Seed Supplier
        context.Parties.Add(new Party
        {
            Id = supplierId,
            TenantId = tenantId,
            Code = "SUP-001",
            LegalName = "Cipla Healthcare Ltd",
            PartyType = PartyType.Supplier,
            StateCode = supplierState,
            GSTIN = $"{supplierState}AABCC9999K1Z2",
            CreditLimit = 500000m,
            CurrentOutstandingBalance = 0m
        });

        context.SaveChanges();

        var mockAudit = new Mock<IAuditService>();
        var service = new PurchaseService(context, tenantContext, userContext, mockAudit.Object);

        return (context, service, tenantId, branchId, warehouseId, supplierId, itemId, uomId);
    }

    [Fact]
    public async Task CreatePurchaseOrderAsync_CalculatesTaxAndCreatesPO()
    {
        var (context, service, tenantId, branchId, warehouseId, supplierId, itemId, uomId) = CreateTestContext();

        var request = new CreatePurchaseOrderRequest(
            BranchId: branchId,
            WarehouseId: warehouseId,
            PartyId: supplierId,
            OrderDate: DateTime.UtcNow,
            ExpectedDeliveryDate: DateTime.UtcNow.AddDays(7),
            Items: new List<CreatePurchaseOrderItemRequest>
            {
                new(ItemId: itemId, Quantity: 100m, UomId: uomId, UnitPrice: 80m, DiscountPercent: 0m)
            }
        );

        var result = await service.CreatePurchaseOrderAsync(request);

        result.IsSuccess.Should().BeTrue();
        var po = await context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == result.Data);
        po.Should().NotBeNull();
        po!.OrderNumber.Should().StartWith("PO-");
        po.TaxableAmount.Should().Be(8000m);
        po.CgstAmount.Should().Be(720m); // 9% of 8000
        po.SgstAmount.Should().Be(720m); // 9% of 8000
        po.TotalAmount.Should().Be(9440m);
        po.Status.Should().Be(PurchaseOrderStatus.Confirmed);
    }

    [Fact]
    public async Task CreateGrnAsync_IncrementsStockAndCreatesBatch()
    {
        var (context, service, tenantId, branchId, warehouseId, supplierId, itemId, uomId) = CreateTestContext();

        var request = new CreateGrnRequest(
            PurchaseOrderId: null,
            BranchId: branchId,
            WarehouseId: warehouseId,
            PartyId: supplierId,
            DeliveryChallanNumber: "DC-998811",
            DeliveryChallanDate: DateTime.UtcNow,
            ReceivedDate: DateTime.UtcNow,
            ReceivedBy: "Store Keeper",
            Items: new List<ReceiveGrnItemRequest>
            {
                new(
                    PurchaseOrderItemId: null,
                    ItemId: itemId,
                    BatchNumber: "BATCH-2026-X1",
                    ManufacturingDate: DateTime.UtcNow.AddMonths(-1),
                    ExpiryDate: DateTime.UtcNow.AddYears(2),
                    ReceivedQuantity: 100m,
                    AcceptedQuantity: 100m,
                    RejectedQuantity: 0m,
                    UomId: uomId,
                    UnitCost: 80m
                )
            }
        );

        var result = await service.CreateGrnAsync(request);

        result.IsSuccess.Should().BeTrue();

        // Verify Batch was created
        var batch = await context.ItemBatches.FirstOrDefaultAsync(b => b.BatchNumber == "BATCH-2026-X1");
        batch.Should().NotBeNull();

        // Verify Warehouse Stock was incremented from 0 to 100 for this batch
        var stock = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.ItemId == itemId && s.WarehouseId == warehouseId && s.BatchId == batch!.Id);
        stock.Should().NotBeNull();
        stock!.CurrentQuantity.Should().Be(100m);

        // Verify StockMovement was logged
        var movement = await context.StockMovements.FirstOrDefaultAsync(m => m.ReferenceDocumentId == result.Data);
        movement.Should().NotBeNull();
        movement!.MovementType.Should().Be(StockMovementType.PurchaseInward);
        movement.Quantity.Should().Be(100m);
    }

    [Fact]
    public async Task CreatePurchaseBillAsync_CreditsSupplierLedgerAndAppliesGst()
    {
        var (context, service, tenantId, branchId, warehouseId, supplierId, itemId, uomId) = CreateTestContext();

        var request = new CreatePurchaseBillRequest
        {
            VendorInvoiceNumber = "INV-CIPLA-8822",
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = supplierId,
            BillDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            PaidAmount = 0m,
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new() { ItemId = itemId, BatchNumber = "BATCH-2026-X1", Quantity = 50m, UomId = uomId, UnitPrice = 80m, DiscountPercent = 0m }
            }
        };

        var result = await service.CreatePurchaseBillAsync(request);

        result.IsSuccess.Should().BeTrue();
        var bill = await context.PurchaseBills.FirstOrDefaultAsync(b => b.Id == result.Data);
        bill.Should().NotBeNull();
        bill!.TaxableAmount.Should().Be(4000m);
        bill.TotalAmount.Should().Be(4720m); // 4000 + 18% GST (360 CGST + 360 SGST)

        // Verify Supplier Outstanding Balance was credited (Negative for Payables: -₹4720)
        var supplier = await context.Parties.FirstOrDefaultAsync(p => p.Id == supplierId);
        supplier!.CurrentOutstandingBalance.Should().Be(-4720m);

        // Verify PartyLedgerEntry was created
        var ledger = await context.PartyLedgerEntries.FirstOrDefaultAsync(l => l.ReferenceDocumentId == result.Data);
        ledger.Should().NotBeNull();
        ledger!.EntryType.Should().Be(PartyLedgerEntryType.PurchaseInvoice);
        ledger.CreditAmount.Should().Be(4720m);
        ledger.RunningBalance.Should().Be(-4720m);
    }

    [Fact]
    public async Task RecordPurchaseBillPaymentAsync_DebitsSupplierLedgerAndUpdatesBalance()
    {
        var (context, service, tenantId, branchId, warehouseId, supplierId, itemId, uomId) = CreateTestContext();

        // 1. Create Bill for ₹4,720
        var billReq = new CreatePurchaseBillRequest
        {
            VendorInvoiceNumber = "INV-CIPLA-8822",
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = supplierId,
            BillDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            PaidAmount = 0m,
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new() { ItemId = itemId, Quantity = 50m, UomId = uomId, UnitPrice = 80m }
            }
        };
        var billRes = await service.CreatePurchaseBillAsync(billReq);

        // 2. Disburse partial payment of ₹2,000 via NEFT
        var payReq = new RecordPurchaseBillPaymentRequest(
            PaymentDate: DateTime.UtcNow,
            Amount: 2000m,
            PaymentMode: PaymentMode.BankTransfer,
            TransactionReference: "NEFT-CIPLA-112233",
            BankName: "HDFC Bank",
            Notes: "Part settlement"
        );
        var payRes = await service.RecordPurchaseBillPaymentAsync(billRes.Data, payReq);

        payRes.IsSuccess.Should().BeTrue();

        // Verify Bill balance is now ₹2,720
        var bill = await context.PurchaseBills.FirstOrDefaultAsync(b => b.Id == billRes.Data);
        bill!.PaidAmount.Should().Be(2000m);
        bill.BalanceAmount.Should().Be(2720m);
        bill.PaymentStatus.Should().Be(PaymentStatus.PartiallyPaid);

        // Verify Supplier balance was updated (-₹4,720 + ₹2,000 = -₹2,720)
        var supplier = await context.Parties.FirstOrDefaultAsync(p => p.Id == supplierId);
        supplier!.CurrentOutstandingBalance.Should().Be(-2720m);
    }
}
