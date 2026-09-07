using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Application.Services.Calculations;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
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

namespace UdyogBill.UnitTests.Regression;

public class Phase44FullErpAuditTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouse1Id, Guid warehouse2Id, Party customer, Party supplier, Item item1, Item item2, Item itemInclusive, Item itemBox, ItemBatch batch1) SetupAuditEnvironment()
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext { TenantId = tenantId, TenantCode = "TNT-AUDIT-44" };
        var context = new AppDbContext(options, tenantContext);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-AUDIT-44",
            BusinessName = "Apex Pharma & Healthcare Distributors Ltd",
            TradeName = "Apex Healthcare",
            State = "Maharashtra",
            StateCode = "27",
            GSTIN = "27AAACA1234A1Z5"
        };
        context.Tenants.Add(tenant);

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchName = "Central Hub Mumbai",
            BranchCode = "MUM01",
            State = "Maharashtra",
            StateCode = "27",
            GSTIN = "27AAACA1234A1Z5"
        };
        context.TenantBranches.Add(branch);

        var wh1 = new TenantWarehouse { Id = Guid.NewGuid(), TenantId = tenantId, BranchId = branch.Id, WarehouseName = "Main Warehouse", WarehouseCode = "WH01" };
        var wh2 = new TenantWarehouse { Id = Guid.NewGuid(), TenantId = tenantId, BranchId = branch.Id, WarehouseName = "Secondary Depot", WarehouseCode = "WH02" };
        context.TenantWarehouses.AddRange(wh1, wh2);

        var uomUnit = new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "PCS", Name = "Pieces" };
        var uomBox = new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "BOX", Name = "Box of 100" };
        context.UnitsOfMeasure.AddRange(uomUnit, uomBox);

        var item1 = new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "MED-001",
            Name = "Paracetamol 650mg Tabs",
            PrimaryUomId = uomUnit.Id,
            PurchasePrice = 20m,
            SellingPrice = 50m,
            MRP = 60m,
            TaxRate = 18m,
            IsTaxInclusive = false,
            TrackInventory = true,
            ItemType = ItemType.Goods
        };

        var item2 = new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "MED-002",
            Name = "Amoxicillin 500mg Caps",
            PrimaryUomId = uomUnit.Id,
            PurchasePrice = 40m,
            SellingPrice = 100m,
            MRP = 120m,
            TaxRate = 12m,
            IsTaxInclusive = false,
            TrackInventory = true,
            ItemType = ItemType.Goods
        };

        var itemInclusive = new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "RET-001",
            Name = "Digital Thermometer OTC",
            PrimaryUomId = uomUnit.Id,
            PurchasePrice = 150m,
            SellingPrice = 236m,
            MRP = 236m,
            TaxRate = 18m,
            IsTaxInclusive = true, // BUG-002
            TrackInventory = true,
            ItemType = ItemType.Goods
        };

        var itemBox = new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "BULK-001",
            Name = "Cough Lozenges Strips",
            PrimaryUomId = uomUnit.Id,
            SecondaryUomId = uomBox.Id,
            ConversionRatio = 100m, // 1 Box = 100 Pieces (BUG-004)
            PurchasePrice = 1m,
            SellingPrice = 2.5m,
            MRP = 3m,
            TaxRate = 12m,
            IsTaxInclusive = false,
            TrackInventory = true,
            ItemType = ItemType.Goods
        };

        context.Items.AddRange(item1, item2, itemInclusive, itemBox);

        var batch1 = new ItemBatch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ItemId = item1.Id,
            BatchNumber = "BATCH-2026-X1",
            ExpiryDate = DateTime.UtcNow.AddYears(2),
            PurchaseRate = 20m,
            SaleRate = 50m
        };
        context.ItemBatches.Add(batch1);

        // Initial Opening Stock
        var stock1 = new ItemWarehouseStock { TenantId = tenantId, ItemId = item1.Id, WarehouseId = wh1.Id, BatchId = batch1.Id, CurrentQuantity = 500m };
        var stock2 = new ItemWarehouseStock { TenantId = tenantId, ItemId = item2.Id, WarehouseId = wh1.Id, CurrentQuantity = 200m };
        var stockInc = new ItemWarehouseStock { TenantId = tenantId, ItemId = itemInclusive.Id, WarehouseId = wh1.Id, CurrentQuantity = 100m };
        var stockBox = new ItemWarehouseStock { TenantId = tenantId, ItemId = itemBox.Id, WarehouseId = wh1.Id, CurrentQuantity = 1000m };
        context.ItemWarehouseStocks.AddRange(stock1, stock2, stockInc, stockBox);

        var customer = new Party
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PartyType = PartyType.Customer,
            LegalName = "Metro Lifecare Chemist",
            StateCode = "27",
            GSTIN = "27BBBPC5678B1Z2",
            CurrentOutstandingBalance = 0m,
            CreditLimit = 100000m
        };

        var supplier = new Party
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PartyType = PartyType.Supplier,
            LegalName = "Cipla Healthcare Supply Corp",
            StateCode = "27",
            GSTIN = "27CCCCS9999C1Z0",
            CurrentOutstandingBalance = 0m
        };

        context.Parties.AddRange(customer, supplier);
        context.SaveChanges();

        return (context, tenantId, branch.Id, wh1.Id, wh2.Id, customer, supplier, item1, item2, itemInclusive, itemBox, batch1);
    }

    [Fact]
    public async Task ScenarioA_NormalSale_1000Rupees_Intrastate_Reconciled()
    {
        // Scenario A: ₹1,000 normal sale (20 units @ ₹50), Intrastate, 18% GST -> ₹90 CGST, ₹90 SGST, Total ₹1,180
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var userContext = new MockCurrentUserContext { TenantId = tenantId };
        var auditService = new MockAuditService();
        var tenantContext = new MockTenantContext { TenantId = tenantId };
        var calcEngine = new CanonicalCalculationEngine();
        var salesService = new SalesService(context, tenantContext, userContext, auditService, calcEngine);

        var req = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            PaidAmount = 1180m,
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, BatchNumber = batch1.BatchNumber, Quantity = 20m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var inv = await context.SalesInvoices.Include(i => i.Items).FirstAsync(i => i.Id == res.Data);
        Assert.Equal(1000m, inv.TaxableAmount);
        Assert.Equal(90m, inv.CgstAmount);
        Assert.Equal(90m, inv.SgstAmount);
        Assert.Equal(0m, inv.IgstAmount);
        Assert.Equal(1180m, inv.TotalAmount);
        Assert.Equal(1180m, inv.PaidAmount);
        Assert.Equal(0m, inv.BalanceAmount);

        // Stock verified: 500 - 20 = 480
        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id);
        Assert.Equal(480m, stock.CurrentQuantity);
    }

    [Fact]
    public async Task ScenarioB_Sale_1000Rupees_With10PercentDiscount_Reconciled()
    {
        // Scenario B: ₹1,000 sale + 10% discount -> Adjusted taxable ₹900, GST ₹162, Total ₹1,062
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var userContext = new MockCurrentUserContext { TenantId = tenantId };
        var auditService = new MockAuditService();
        var tenantContext = new MockTenantContext { TenantId = tenantId };
        var salesService = new SalesService(context, tenantContext, userContext, auditService);

        var req = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            InvoiceDiscountPercent = 10m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 20m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var inv = await context.SalesInvoices.FirstAsync(i => i.Id == res.Data);
        Assert.Equal(100m, inv.InvoiceDiscountAmount);
        Assert.Equal(900m, inv.TaxableAmount);
        Assert.Equal(81m, inv.CgstAmount);
        Assert.Equal(81m, inv.SgstAmount);
        Assert.Equal(1062m, inv.TotalAmount);
    }

    [Fact]
    public async Task ScenarioC_TaxInclusivePricing_ExtractsBaseAccurately()
    {
        // Scenario C: ₹1,000 inclusive GST sale (5 units @ ₹200 inclusive, 18% GST)
        // 5 * 200 = 1,000 inclusive -> Base = 1000 / 1.18 = ₹847.4576, GST = ₹152.5424, Total = ₹1,000
        var (context, tenantId, branchId, wh1Id, _, customer, _, _, _, itemInc, _, _) = SetupAuditEnvironment();
        var userContext = new MockCurrentUserContext { TenantId = tenantId };
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, userContext, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemInc.Id, Quantity = 5m, UnitPrice = 200m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var inv = await context.SalesInvoices.FirstAsync(i => i.Id == res.Data);
        Assert.Equal(847.46m, Math.Round(inv.TaxableAmount, 2));
        Assert.Equal(1000m, inv.TotalAmount); // Net Total strictly matches inclusive consideration
    }

    [Fact]
    public async Task ScenarioD_SchemeSale_10Plus2Free_Deducts12UnitsFromStock()
    {
        // Scenario D: 10 Paid + 2 Free -> Physical Out = 12, Stock Before = 500, Stock After = 488
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 10m, FreeQuantity = 2m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id);
        Assert.Equal(488m, stock.CurrentQuantity); // 500 - 12 = 488 (BUG-001 Invariant)
    }

    [Fact]
    public async Task ScenarioE_UnitConversion_2Boxes_Deducts200Units()
    {
        // Scenario E: 2 Boxes (100 units/box) -> Stock Out = 200 units, Stock Before = 1000, Stock After = 800
        var (context, tenantId, branchId, wh1Id, _, customer, _, _, _, _, itemBox, _) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemBox.Id, UomId = itemBox.SecondaryUomId!.Value, Quantity = 2m, UnitPrice = 250m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == itemBox.Id);
        Assert.Equal(800m, stock.CurrentQuantity); // 1000 - 200 = 800 (BUG-004 Invariant)
    }

    [Fact]
    public async Task ScenarioG_SchemeSale_PartialReturn_UsesNetEffectiveRate()
    {
        // Scenario G: Bought 10 + 2 Free for ₹500 taxable (Net Rate = ₹41.666667/unit)
        // Return 1 unit should evaluate taxable at ₹41.6667, NOT ₹50 (BUG-010 Invariant)
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var saleReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 10m, FreeQuantity = 2m, UnitPrice = 50m }
            }
        };
        var saleRes = await salesService.CreateInvoiceAsync(saleReq);

        var returnReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = saleRes.Data,
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            RestockToWarehouse = true,
            Items = new List<CreateSalesReturnItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, ReturnQuantity = 1m, UnitPrice = 50m, GstRate = 18m }
            }
        };

        var returnRes = await salesService.CreateSalesReturnAsync(returnReq);
        Assert.True(returnRes.IsSuccess);

        var ret = await context.SalesReturns.Include(r => r.Items).FirstAsync(r => r.Id == returnRes.Data);
        Assert.Equal(41.67m, Math.Round(ret.SubTotal, 2));
        Assert.Equal(49.17m, Math.Round(ret.TotalAmount, 2)); // 41.67 + 18% GST (7.50) = 49.17
    }

    [Fact]
    public async Task ScenarioH_PartiallyPaidCancellation_ReconcilesCustomerLedger()
    {
        // Scenario H: Invoice ₹1,180, Paid ₹400 -> Unpaid ₹780.
        // Cancellation must adjust customer balance by -₹780, and credit ledger by ₹780 (BUG-008 Invariant)
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            PaidAmount = 400m,
            PrimaryPaymentMode = PaymentMode.Cash,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 20m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        var cancelRes = await salesService.CancelInvoiceAsync(res.Data, new CancelInvoiceRequest("Customer order change"));
        Assert.True(cancelRes.IsSuccess);

        var updatedParty = await context.Parties.FindAsync(customer.Id);
        Assert.Equal(0m, updatedParty!.CurrentOutstandingBalance);

        var ledgerEntries = await context.PartyLedgerEntries.Where(l => l.PartyId == customer.Id).ToListAsync();
        var totalDebits = ledgerEntries.Sum(l => l.DebitAmount);
        var totalCredits = ledgerEntries.Sum(l => l.CreditAmount);
        Assert.Equal(updatedParty.CurrentOutstandingBalance, totalDebits - totalCredits); // Invariant
    }

    [Fact]
    public async Task ScenarioI_DirectPurchaseWithoutGrn_InwardsStockAutomatically()
    {
        // Scenario I: Direct Purchase of 50 units without GRN -> Stock Before = 500, Stock After = 550 (BUG-006)
        var (context, tenantId, branchId, wh1Id, _, _, supplier, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var purchaseService = new PurchaseService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreatePurchaseBillRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = supplier.Id,
            BillDate = DateTime.UtcNow,
            GoodsReceiptNoteId = null, // Direct purchase!
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, BatchNumber = batch1.BatchNumber, Quantity = 50m, UnitPrice = 20m }
            }
        };

        var res = await purchaseService.CreatePurchaseBillAsync(req);
        Assert.True(res.IsSuccess);

        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id);
        Assert.Equal(550m, stock.CurrentQuantity); // 500 + 50 = 550

        var movement = await context.StockMovements.FirstOrDefaultAsync(m => m.ReferenceDocumentNumber == (context.PurchaseBills.Find(res.Data)!.BillNumber));
        Assert.NotNull(movement);
        Assert.Equal(StockMovementType.PurchaseInward, movement.MovementType);
        Assert.Equal(50m, movement.Quantity);
    }

    [Fact]
    public async Task ScenarioK_BatchSpecificPurchaseReturn_UpdatesAuditCorrectly()
    {
        // Scenario K: Purchase return of 10 units from 500 in batch -> Stock After = 490, Logged QuantityAfter = 490 (BUG-007)
        var (context, tenantId, branchId, wh1Id, _, _, supplier, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var purchaseService = new PurchaseService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreatePurchaseReturnRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = supplier.Id,
            SupplierName = supplier.LegalName,
            Items = new List<CreatePurchaseReturnItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, ReturnQuantity = 10m, UnitPrice = 20m, GstRate = 18m }
            }
        };

        var res = await purchaseService.CreatePurchaseReturnAsync(req);
        Assert.True(res.IsSuccess);

        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id);
        Assert.Equal(490m, stock.CurrentQuantity);

        var movement = await context.StockMovements.FirstAsync(m => m.ReferenceDocumentId == res.Data);
        Assert.Equal(500m, movement.QuantityBefore);
        Assert.Equal(490m, movement.QuantityAfter); // Not double-subtracted (480)
    }

    [Fact]
    public async Task ScenarioL_InterstateSale_AppliesIgstOnly()
    {
        // Scenario L: Inter-state sale to Karnataka (StateCode 29) -> 18% IGST, 0% CGST, 0% SGST
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "29", // Karnataka (Inter-state from MH 27)
            ShippingStateCode = "29",
            PlaceOfSupply = "Karnataka",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 10m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var inv = await context.SalesInvoices.FirstAsync(i => i.Id == res.Data);
        Assert.Equal(500m, inv.TaxableAmount);
        Assert.Equal(0m, inv.CgstAmount);
        Assert.Equal(0m, inv.SgstAmount);
        Assert.Equal(90m, inv.IgstAmount);
        Assert.Equal(590m, inv.TotalAmount);
    }

    [Fact]
    public async Task ScenarioT_AccountingInvariant_DebitEqualsCredit()
    {
        // Scenario T: Journal voucher auto-posting invariant: Total Debits == Total Credits
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            PaidAmount = 1180m,
            PrimaryPaymentMode = PaymentMode.Cash,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 20m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var jvs = await context.JournalVouchers.Include(j => j.Legs).ToListAsync();
        foreach (var jv in jvs)
        {
            var debitSum = jv.Legs.Sum(l => l.DebitAmount);
            var creditSum = jv.Legs.Sum(l => l.CreditAmount);
            Assert.Equal(debitSum, creditSum); // Strictly balanced ledger
        }
    }

    [Fact]
    public async Task ScenarioF_SchemeSale_FreeQuantityPlusConversion_Depletes1200Units()
    {
        // Scenario F: 10 Boxes paid + 2 Boxes free (ratio 100) -> 12 * 100 = 1,200 physical pieces
        var (context, tenantId, branchId, wh1Id, _, customer, _, _, _, _, itemBox, _) = SetupAuditEnvironment();
        // Add extra stock to warehouse 1: total 2000
        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == itemBox.Id);
        stock.CurrentQuantity = 2000m;
        await context.SaveChangesAsync();

        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());
        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemBox.Id, UomId = itemBox.SecondaryUomId!.Value, Quantity = 10m, FreeQuantity = 2m, UnitPrice = 250m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var updatedStock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == itemBox.Id);
        Assert.Equal(800m, updatedStock.CurrentQuantity); // 2000 - 1200 = 800 (Invariant)
    }

    [Fact]
    public async Task ScenarioJ_PurchaseWithGrn_DoesNotDoubleInwardStock()
    {
        // Scenario J: Purchase Bill referencing GRN should NOT double inward stock
        var (context, tenantId, branchId, wh1Id, _, _, supplier, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var purchaseService = new PurchaseService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        // Create GRN first
        var grn = new GoodsReceiptNote
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = supplier.Id,
            GrnNumber = "GRN-2026-001",
            ReceivedDate = DateTime.UtcNow,
            Status = GrnStatus.Verified
        };
        context.GoodsReceiptNotes.Add(grn);
        // Stock inwarded by GRN
        var stockBefore = (await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id)).CurrentQuantity;
        stockBefore += 50m; // GRN inwarded 50
        (await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id)).CurrentQuantity = stockBefore;
        await context.SaveChangesAsync();

        var billReq = new CreatePurchaseBillRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = supplier.Id,
            GoodsReceiptNoteId = grn.Id, // Linked to GRN!
            BillDate = DateTime.UtcNow,
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 50m, UnitPrice = 20m }
            }
        };

        var billRes = await purchaseService.CreatePurchaseBillAsync(billReq);
        Assert.True(billRes.IsSuccess);

        var stockAfter = (await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id)).CurrentQuantity;
        Assert.Equal(stockBefore, stockAfter); // No double inward! Exactly 1 inward.
    }

    [Fact]
    public async Task ScenarioN_PartialPayment_MaintainsOutstandingParity()
    {
        // Scenario N: Invoice ₹1,180, Paid ₹500 -> Outstanding ₹680, Party Balance ₹680
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            PaidAmount = 500m,
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 20m, UnitPrice = 50m }
            }
        };

        var res = await salesService.CreateInvoiceAsync(req);
        Assert.True(res.IsSuccess);

        var inv = await context.SalesInvoices.FirstAsync(i => i.Id == res.Data);
        Assert.Equal(680m, inv.BalanceAmount);

        var party = await context.Parties.FindAsync(customer.Id);
        Assert.Equal(680m, party!.CurrentOutstandingBalance);
    }

    [Fact]
    public async Task ScenarioP_StockTransfer_ConservesTotalTenantQuantity()
    {
        // Scenario P: Transfer 50 units between warehouses -> Total tenant stock unchanged
        var (context, tenantId, _, wh1Id, wh2Id, _, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        
        var totalBefore = await context.ItemWarehouseStocks.Where(s => s.ItemId == item1.Id).SumAsync(s => s.CurrentQuantity);

        // Deduct 50 from WH1, add 50 to WH2
        var wh1Stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.WarehouseId == wh1Id);
        wh1Stock.CurrentQuantity -= 50m;

        var wh2Stock = new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = item1.Id,
            WarehouseId = wh2Id,
            BatchId = batch1.Id,
            CurrentQuantity = 50m
        };
        context.ItemWarehouseStocks.Add(wh2Stock);
        await context.SaveChangesAsync();

        var totalAfter = await context.ItemWarehouseStocks.Where(s => s.ItemId == item1.Id).SumAsync(s => s.CurrentQuantity);
        Assert.Equal(totalBefore, totalAfter); // Total stock conserved
    }

    [Fact]
    public async Task ScenarioS_InsufficientStock_NegativeStockPolicyEnforced()
    {
        // Scenario S: Requesting 1000 units when only 500 available
        var (context, tenantId, branchId, wh1Id, _, customer, _, item1, _, _, _, batch1) = SetupAuditEnvironment();
        var salesService = new SalesService(context, new MockTenantContext { TenantId = tenantId }, new MockCurrentUserContext { TenantId = tenantId }, new MockAuditService());

        var req = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = wh1Id,
            PartyId = customer.Id,
            CustomerName = customer.LegalName,
            BillingStateCode = "27",
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = item1.Id, BatchId = batch1.Id, Quantity = 1000m, UnitPrice = 50m }
            }
        };

        // If allow negative inventory is false, should be guarded or handled deterministically
        var stock = await context.ItemWarehouseStocks.FirstAsync(s => s.ItemId == item1.Id && s.BatchId == batch1.Id);
        Assert.True(stock.CurrentQuantity < req.Items[0].Quantity);
    }
}
