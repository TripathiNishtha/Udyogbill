using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Services.Calculations;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Regression;

public class FinalCertificationAuditTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouseId, Guid uomId, Guid itemId, Guid partyId, SalesService salesService, PurchaseService purchaseService, PartyService partyService, QuotationService quotationService, ReportService reportService) SetupContext()
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
            TenantCode = "TNT-AUDIT-01"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            UserId = Guid.NewGuid(),
            Email = "auditor@digiopera.com",
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
            StateCode = "27",
            GSTIN = "27AABCA1234A1Z5",
            IsHeadOffice = true
        });

        // Seed Warehouse
        context.TenantWarehouses.Add(new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseName = "Central Warehouse",
            WarehouseCode = "WH-01",
            IsDefault = true
        });

        // Seed UOM
        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Name = "Pieces",
            Code = "PCS",
            DecimalPlaces = 0
        });

        // Seed Item (Goods)
        context.Items.Add(new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Sku = "SKU-TEST-001",
            Name = "Paracetamol 650mg",
            ItemType = ItemType.Goods,
            TrackInventory = true,
            PrimaryUomId = uomId,
            PurchasePrice = 50m,
            SellingPrice = 100m,
            MRP = 120m,
            TaxRate = 18m,
            HSNCode = "3004"
        });

        // Seed Stock
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 100m
        });

        // Seed Party
        context.Parties.Add(new Party
        {
            Id = partyId,
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "MedPlus Pharma",
            PartyType = PartyType.Customer,
            StateCode = "27",
            CurrentOutstandingBalance = 0m
        });

        context.SaveChanges();

        var auditService = new MockAuditService();
        var salesService = new SalesService(context, tenantContext, userContext, auditService);
        var purchaseService = new PurchaseService(context, tenantContext, userContext, auditService);
        var partyService = new PartyService(context, tenantContext, userContext, auditService);
        var quotationService = new QuotationService(context, userContext, auditService, salesService);
        var reportService = new ReportService(context, userContext);

        return (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, purchaseService, partyService, quotationService, reportService);
    }

    #region 1. Section 5 & 6: Independent Financial Recomputation vs CanonicalCalculationEngine

    [Theory]
    [InlineData(0.01, 1, 18, true, true)]       // Boundary: ₹0.01 tax inclusive
    [InlineData(0.05, 1, 18, false, true)]      // Boundary: ₹0.05 tax exclusive
    [InlineData(0.10, 1, 12, true, true)]       // Boundary: ₹0.10
    [InlineData(0.99, 10, 5, false, true)]      // Boundary: ₹0.99
    [InlineData(1.00, 3, 28, true, false)]      // Inter-state
    [InlineData(999.99, 5, 18, false, true)]
    [InlineData(100000.00, 1.5, 18, false, true)]
    public void CanonicalCalculationEngine_Matches_Independent_Reference_Calculator(
        decimal unitPrice,
        decimal quantity,
        decimal gstRate,
        bool isTaxInclusive,
        bool isIntraState)
    {
        var engine = new CanonicalCalculationEngine();
        var input = new LineCalculationInput(
            Quantity: quantity,
            FreeQuantity: 0,
            UnitPrice: unitPrice,
            IsTaxInclusive: isTaxInclusive,
            DiscountPercent: 0,
            DiscountAmount: 0,
            GstRate: gstRate,
            CessRate: 0,
            IsIntraState: isIntraState
        );

        var result = engine.CalculateLine(input);

        // Independent reference calculation
        decimal expectedGross = Math.Round(quantity * unitPrice, 4);
        decimal expectedTaxable = isTaxInclusive 
            ? Math.Round(expectedGross / (1m + (gstRate / 100m)), 4)
            : expectedGross;

        decimal expectedCgst = isIntraState ? Math.Round(expectedTaxable * (gstRate / 200m), 4) : 0m;
        decimal expectedSgst = isIntraState ? Math.Round(expectedTaxable * (gstRate / 200m), 4) : 0m;
        decimal expectedIgst = !isIntraState ? Math.Round(expectedTaxable * (gstRate / 100m), 4) : 0m;

        Assert.Equal(expectedGross, result.GrossAmount);
        Assert.Equal(expectedTaxable, result.TaxableAmount);
        Assert.Equal(expectedCgst, result.CgstAmount);
        Assert.Equal(expectedSgst, result.SgstAmount);
        Assert.Equal(expectedIgst, result.IgstAmount);
    }

    [Fact]
    public void CanonicalCalculationEngine_Mathematical_Property_Total_Equals_Taxable_Plus_Tax()
    {
        var engine = new CanonicalCalculationEngine();
        var lines = new List<LineCalculationInput>
        {
            new(2, 0, 150.50m, false, 10, 0, 18, 0, true),
            new(5, 1, 45.25m, true, 0, 5, 12, 0, true)
        };

        var (calcLines, totals) = engine.CalculateInvoice(lines, 5, 0, true);

        // Verify Invariant: Total = Taxable + CGST + SGST + IGST + Cess + RoundOff
        var sumTax = totals.CgstAmount + totals.SgstAmount + totals.IgstAmount + totals.CessAmount;
        var unrounded = totals.TaxableAmount + sumTax;
        var expectedRounded = Math.Round(unrounded, 0, MidpointRounding.AwayFromZero);

        Assert.Equal(expectedRounded, totals.RoundedTotal);
        Assert.Equal(expectedRounded - unrounded, totals.RoundOff);
    }

    #endregion

    #region 2. Section 19: PartyType.Both Explicit Direction Remediation

    [Fact]
    public async Task Remediated_PartyTypeBoth_Requires_Explicit_Direction_When_Automatic()
    {
        var (context, tenantId, _, _, _, _, _, _, _, partyService, _, _) = SetupContext();

        var bothParty = new Party
        {
            TenantId = tenantId,
            Code = "PARTY-BOTH-01",
            LegalName = "Both Role Partner",
            PartyType = PartyType.Both,
            CurrentOutstandingBalance = -500m
        };
        context.Parties.Add(bothParty);
        await context.SaveChangesAsync();

        // 1. With Automatic direction -> Must fail with DIRECTION_REQUIRED
        var autoReq = new RecordPartyPaymentRequest(
            PartyId: bothParty.Id,
            TransactionDate: DateTime.UtcNow,
            Amount: 200m,
            PaymentMode: "Cash",
            ReferenceNumber: null,
            Notes: null,
            Direction: PartyPaymentDirection.Automatic
        );

        var autoRes = await partyService.RecordPartyPaymentAsync(autoReq);
        Assert.False(autoRes.IsSuccess);
        Assert.Equal("DIRECTION_REQUIRED", autoRes.ErrorCode);

        // 2. With Explicit CustomerReceipt -> Must succeed as CustomerReceipt
        var receiptReq = new RecordPartyPaymentRequest(
            PartyId: bothParty.Id,
            TransactionDate: DateTime.UtcNow,
            Amount: 200m,
            PaymentMode: "Cash",
            ReferenceNumber: null,
            Notes: null,
            Direction: PartyPaymentDirection.CustomerReceipt
        );
        var receiptRes = await partyService.RecordPartyPaymentAsync(receiptReq);
        Assert.True(receiptRes.IsSuccess);
        var receiptEntry = await context.PartyLedgerEntries.FindAsync(receiptRes.Data);
        Assert.NotNull(receiptEntry);
        Assert.Equal(PartyLedgerEntryType.PaymentReceipt, receiptEntry.EntryType);

        // 3. With Explicit VendorPayment -> Must succeed as VendorPayment
        var vendorReq = new RecordPartyPaymentRequest(
            PartyId: bothParty.Id,
            TransactionDate: DateTime.UtcNow,
            Amount: 150m,
            PaymentMode: "BankTransfer",
            ReferenceNumber: null,
            Notes: null,
            Direction: PartyPaymentDirection.VendorPayment
        );
        var vendorRes = await partyService.RecordPartyPaymentAsync(vendorReq);
        Assert.True(vendorRes.IsSuccess);
        var vendorEntry = await context.PartyLedgerEntries.FindAsync(vendorRes.Data);
        Assert.NotNull(vendorEntry);
        Assert.Equal(PartyLedgerEntryType.VendorPayment, vendorEntry.EntryType);
    }

    #endregion

    #region 3. Section 13: Garments Multi-Variant Purchase Bill Cancellation Remediation

    [Fact]
    public async Task Remediated_CancelPurchaseBill_Depletes_Each_Variant_Accurately()
    {
        var (context, tenantId, branchId, warehouseId, uomId, _, _, _, purchaseService, _, _, _) = SetupContext();

        var item = new Item
        {
            TenantId = tenantId,
            Name = "Denim Jeans",
            Sku = "DENIM-001",
            ItemType = ItemType.Goods,
            TrackInventory = true,
            PrimaryUomId = uomId
        };
        context.Items.Add(item);

        var variantM = new ItemVariant { TenantId = tenantId, Item = item, VariantName = "Medium-Blue", VariantSku = "DENIM-M" };
        var variantL = new ItemVariant { TenantId = tenantId, Item = item, VariantName = "Large-Blue", VariantSku = "DENIM-L" };
        context.ItemVariants.AddRange(variantM, variantL);

        // Initial stock: 10 units for M, 10 units for L
        var stockM = new ItemWarehouseStock { TenantId = tenantId, ItemId = item.Id, VariantId = variantM.Id, WarehouseId = warehouseId, CurrentQuantity = 10 };
        var stockL = new ItemWarehouseStock { TenantId = tenantId, ItemId = item.Id, VariantId = variantL.Id, WarehouseId = warehouseId, CurrentQuantity = 10 };
        context.ItemWarehouseStocks.AddRange(stockM, stockL);

        var supplier = new Party { TenantId = tenantId, Code = "SUP-TEXTILE", LegalName = "Textile Mills", PartyType = PartyType.Supplier };
        context.Parties.Add(supplier);

        // Bill has BOTH variants: 5 units of Variant M AND 5 units of Variant L
        var bill = new PurchaseBill
        {
            TenantId = tenantId,
            BillNumber = "BILL-2026-MULTI-VARIANT",
            PartyId = supplier.Id,
            BranchId = branchId,
            WarehouseId = warehouseId,
            BillDate = DateTime.UtcNow,
            TotalAmount = 10000,
            PaidAmount = 0,
            BalanceAmount = 10000,
            Status = PurchaseBillStatus.Approved
        };
        bill.Items.Add(new PurchaseBillItem
        {
            TenantId = tenantId,
            ItemId = item.Id,
            VariantId = variantM.Id,
            Quantity = 5,
            UnitPrice = 1000,
            TotalAmount = 5000
        });
        bill.Items.Add(new PurchaseBillItem
        {
            TenantId = tenantId,
            ItemId = item.Id,
            VariantId = variantL.Id,
            Quantity = 5,
            UnitPrice = 1000,
            TotalAmount = 5000
        });
        context.PurchaseBills.Add(bill);
        await context.SaveChangesAsync();

        // Cancel the purchase bill
        var cancelRes = await purchaseService.CancelPurchaseBillAsync(bill.Id, "Vendor cancelled order");
        Assert.True(cancelRes.IsSuccess);

        // Refresh stocks
        var refreshedM = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.VariantId == variantM.Id);
        var refreshedL = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.VariantId == variantL.Id);

        Assert.NotNull(refreshedM);
        Assert.NotNull(refreshedL);

        // REMEDIATED INVARIANT:
        // Each variant is isolated by VariantId!
        // Both Variant M and Variant L must be depleted by exactly 5:
        // 10 - 5 = 5 units each!
        Assert.Equal(5m, refreshedM.CurrentQuantity);
        Assert.Equal(5m, refreshedL.CurrentQuantity);

        // Also verify StockMovements have correct VariantId assigned
        var movements = await context.StockMovements
            .Where(m => m.ReferenceDocumentId == bill.Id)
            .ToListAsync();
        Assert.Equal(2, movements.Count);
        Assert.Contains(movements, m => m.VariantId == variantM.Id && m.Quantity == -5m);
        Assert.Contains(movements, m => m.VariantId == variantL.Id && m.Quantity == -5m);
    }

    #endregion

    #region 4. Section 17: Service Item Purchase Stock Inwarding Bypass Remediation

    [Fact]
    public async Task Remediated_CreatePurchaseBill_For_Service_Item_Does_Not_Create_Stock()
    {
        var (context, tenantId, branchId, warehouseId, uomId, _, _, _, purchaseService, _, _, _) = SetupContext();

        var serviceItem = new Item
        {
            TenantId = tenantId,
            Name = "Legal & Accounting Consultation",
            Sku = "SERV-LEGAL-01",
            ItemType = ItemType.Service,
            TrackInventory = false,
            PrimaryUomId = uomId
        };
        var supplier = new Party { TenantId = tenantId, Code = "SUP-LEGAL", LegalName = "Law Firm LLP", PartyType = PartyType.Supplier };

        context.Items.Add(serviceItem);
        context.Parties.Add(supplier);
        await context.SaveChangesAsync();

        var req = new CreatePurchaseBillRequest
        {
            PartyId = supplier.Id,
            BranchId = branchId,
            WarehouseId = warehouseId,
            BillDate = DateTime.UtcNow,
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new()
                {
                    ItemId = serviceItem.Id,
                    Quantity = 1,
                    UnitPrice = 15000,
                    UomId = uomId
                }
            }
        };

        var billRes = await purchaseService.CreatePurchaseBillAsync(req);
        Assert.True(billRes.IsSuccess);

        // REMEDIATED INVARIANT:
        // Non-stock service items must NOT create physical inventory movements or warehouse stocks!
        var stock = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.ItemId == serviceItem.Id);
        var movements = await context.StockMovements.Where(m => m.ItemId == serviceItem.Id).ToListAsync();

        Assert.Null(stock);
        Assert.Empty(movements);
    }

    #endregion

    #region 5. Section 28: GSTR-3B Tax Netting Remediation

    [Fact]
    public async Task Remediated_Gstr3b_Deducts_Credit_Note_Taxes_From_Output_Tax()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, reportService) = SetupContext();

        // Step 1: Create Sales Invoice of 10 units @ 100 with 18% GST (Taxable = 1000, CGST = 90, SGST = 90, Total = 1180)
        var invReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            BillingStateCode = "27", // Explicitly Intra-State
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 10,
                    UnitPrice = 100,
                    DiscountPercent = 0,
                    UomId = uomId
                }
            }
        };
        var invRes = await salesService.CreateInvoiceAsync(invReq);
        Assert.True(invRes.IsSuccess);
        var invoiceId = invRes.Data;

        // Step 2: Create Sales Return (Credit Note) for 5 units (Taxable = 500, Tax = 90 -> CGST = 45, SGST = 45)
        var retReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invoiceId,
            PartyId = partyId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Defective Goods",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    ReturnQuantity = 5,
                    UnitPrice = 100,
                    GstRate = 18
                }
            }
        };
        var retRes = await salesService.CreateSalesReturnAsync(retReq);
        Assert.True(retRes.IsSuccess);

        // Step 3: Run GSTR-3B Report
        var gstr3bRes = await reportService.GetGstr3bReportAsync(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), branchId);
        Assert.True(gstr3bRes.IsSuccess);
        var report = gstr3bRes.Data!;

        // REMEDIATED INVARIANT:
        // OutwardTaxableValue is net (1000 - 500 = 500)
        Assert.Equal(500m, report.OutwardTaxableValue);

        // Outward CGST and SGST are accurately netted: 90 - 45 = 45 each!
        Assert.Equal(45m, report.OutwardCgst);
        Assert.Equal(45m, report.OutwardSgst);
        Assert.Equal(90m, report.TotalOutputTaxLiability);
    }

    #endregion

    #region 6. Section 4: BillingStateCode Empty Fallback Remediation

    [Fact]
    public async Task Remediated_SalesInvoice_Defaults_To_BranchState_When_BillingStateCode_Empty()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        // Invoice created with empty BillingStateCode (standard walk-in / default)
        var invReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            BillingStateCode = "", // Empty string
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 2,
                    UnitPrice = 100,
                    UomId = uomId
                }
            }
        };

        var invRes = await salesService.CreateInvoiceAsync(invReq);
        Assert.True(invRes.IsSuccess);

        var invoice = await context.SalesInvoices.FindAsync(invRes.Data);
        Assert.NotNull(invoice);

        // REMEDIATED INVARIANT:
        // When BillingStateCode is empty, it falls back to branch state ("27") -> IntraState (CGST + SGST)!
        // Must NOT default to Inter-State IGST!
        Assert.Equal(TaxSupplyType.IntraState, invoice.TaxSupplyType);
        Assert.True(invoice.CgstAmount > 0);
        Assert.True(invoice.SgstAmount > 0);
        Assert.Equal(0m, invoice.IgstAmount);
    }

    #endregion
}
