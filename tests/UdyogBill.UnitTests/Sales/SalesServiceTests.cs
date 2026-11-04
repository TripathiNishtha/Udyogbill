using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Controllers;
using Xunit;

namespace UdyogBill.UnitTests.Sales;

public class SalesServiceTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouseId, Guid uomId, Guid itemId, Guid partyId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupSalesContext(string branchState = "27")
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

        // Seed Branch (e.g. Maharashtra 27)
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

        // Seed Item (18% GST)
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

        // Seed Initial Stock (50 Boxes)
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 50m
        });

        // Seed Customer
        context.Parties.Add(new Party
        {
            Id = partyId,
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "City Chemist",
            PartyType = PartyType.Customer,
            StateCode = "27",
            CurrentOutstandingBalance = 0m
        });

        context.SaveChanges();

        return (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateInvoice_IntraState_ShouldCalculateCgstAndSgstEqually()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // 10 items @ ₹100 each = ₹1,000 Taxable. Intra-state (27 to 27) -> 9% CGST (₹90) + 9% SGST (₹90) = ₹1,180
        var request = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            CustomerPhone = "+91 9876543210",
            CustomerEmail = "cust@city.com",
            CustomerGSTIN = "27AABCC1234D1Z5",
            CustomerPAN = "AABCC1234D",
            BillingAddress = "Bandra West",
            ShippingAddress = "Bandra West",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PrimaryPaymentMode = PaymentMode.Cash,
            PaidAmount = 1180m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m, DiscountAmount = 0m }
            }
        };

        // Act
        var result = await service.CreateInvoiceAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var invoice = await context.SalesInvoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == result.Data);

        Assert.NotNull(invoice);
        Assert.Equal(TaxSupplyType.IntraState, invoice.TaxSupplyType);
        Assert.Equal(1000m, invoice.TaxableAmount);
        Assert.Equal(90m, invoice.CgstAmount);
        Assert.Equal(90m, invoice.SgstAmount);
        Assert.Equal(0m, invoice.IgstAmount);
        Assert.Equal(1180m, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreateInvoice_InterState_ShouldCalculateSingleIgst()
    {
        // Arrange: Branch in Maharashtra (27), Customer in Gujarat (24)
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // 10 items @ ₹100 = ₹1,000 Taxable. Inter-state (27 to 24) -> 18% IGST (₹180) = ₹1,180
        var request = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "Gujarat Distributors",
            CustomerPhone = "+91 9822334455",
            CustomerEmail = "info@gujarat.com",
            CustomerGSTIN = "24AACCD5678E1Z9",
            CustomerPAN = "AACCD5678E",
            BillingAddress = "Surat",
            ShippingAddress = "Surat",
            BillingStateCode = "24",
            ShippingStateCode = "24",
            PlaceOfSupply = "Gujarat",
            InvoiceDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            PaidAmount = 0m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m, DiscountAmount = 0m }
            }
        };

        // Act
        var result = await service.CreateInvoiceAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var invoice = await context.SalesInvoices.FirstOrDefaultAsync(i => i.Id == result.Data);

        Assert.NotNull(invoice);
        Assert.Equal(TaxSupplyType.InterState, invoice.TaxSupplyType);
        Assert.Equal(1000m, invoice.TaxableAmount);
        Assert.Equal(0m, invoice.CgstAmount);
        Assert.Equal(0m, invoice.SgstAmount);
        Assert.Equal(180m, invoice.IgstAmount);
        Assert.Equal(1180m, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreateInvoice_ShouldDepleteWarehouseStockAndLogStockMovement()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var request = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.POSBill,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = null,
            CustomerName = "Walk-in Buyer",
            CustomerPhone = null,
            CustomerEmail = null,
            CustomerGSTIN = null,
            CustomerPAN = null,
            BillingAddress = "Retail Counter",
            ShippingAddress = "Retail Counter",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            DueDate = null,
            PrimaryPaymentMode = PaymentMode.Cash,
            PaidAmount = 590m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 5m, UomId = uomId, UnitPrice = 100m, DiscountAmount = 0m }
            }
        };

        // Act
        var result = await service.CreateInvoiceAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var stock = await context.ItemWarehouseStocks
            .FirstOrDefaultAsync(s => s.ItemId == itemId && s.WarehouseId == warehouseId);

        Assert.NotNull(stock);
        Assert.Equal(45m, stock.CurrentQuantity); // 50 - 5 = 45

        var movement = await context.StockMovements
            .FirstOrDefaultAsync(m => m.ItemId == itemId && m.MovementType == StockMovementType.SalesOutward);

        Assert.NotNull(movement);
        Assert.Equal(-5m, movement.Quantity);
        Assert.Equal(50m, movement.QuantityBefore);
        Assert.Equal(45m, movement.QuantityAfter);
    }

    [Fact]
    public async Task CreateInvoice_WithCustomer_ShouldDebitCustomerLedgerAndRecordPayment()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // Total invoice = ₹1,180. Customer pays ₹500 partial cash at counter.
        var request = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            CustomerPhone = "+91 9876543210",
            CustomerEmail = "cust@city.com",
            CustomerGSTIN = "27AABCC1234D1Z5",
            CustomerPAN = "AABCC1234D",
            BillingAddress = "Bandra",
            ShippingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(15),
            PrimaryPaymentMode = PaymentMode.Cash,
            PaidAmount = 500m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m, DiscountAmount = 0m }
            }
        };

        // Act
        var result = await service.CreateInvoiceAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var party = await context.Parties
            .Include(p => p.LedgerEntries)
            .FirstOrDefaultAsync(p => p.Id == partyId);

        Assert.NotNull(party);
        // Ledger: +₹1,180 (Debit) then -₹500 (Credit) = ₹680 Outstanding Debt
        Assert.Equal(680m, party.CurrentOutstandingBalance);
        Assert.Equal(2, party.LedgerEntries.Count);
    }

    [Fact]
    public async Task CreateInvoice_WithReverseCharge_ExcludesTaxFromPayableTotal()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var request = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "RCM Transport Customer",
            CustomerPhone = "+91 9876543210",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            IsReverseCharge = true, // RCM enabled
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        // Act
        var result = await service.CreateInvoiceAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var inv = await context.SalesInvoices.FirstAsync(i => i.Id == result.Data);
        Assert.Equal(1000m, inv.TaxableAmount);
        Assert.Equal(90m, inv.CgstAmount);
        Assert.Equal(90m, inv.SgstAmount);
        // RCM: Tax is not added to customer total
        Assert.Equal(1000m, inv.TotalAmount);

        var party = await context.Parties.FirstAsync(p => p.Id == partyId);
        Assert.Equal(1000m, party.CurrentOutstandingBalance);
    }

    [Fact]
    public async Task UpdateInvoice_RecalculatesTaxWithCanonicalEngine_AndAdjustsPartyLedgerDelta()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // 1. Create initial invoice: 10 units @ ₹100 = ₹1,000 + 18% GST = ₹1,180 on Credit
        var createReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            CustomerPhone = "+91 9876543210",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var createResult = await service.CreateInvoiceAsync(createReq);
        Assert.True(createResult.IsSuccess);
        var invoiceId = createResult.Data;

        var partyBefore = await context.Parties.FirstAsync(p => p.Id == partyId);
        Assert.Equal(1180m, partyBefore.CurrentOutstandingBalance);

        // 2. Update invoice: Increase quantity to 20 units with 10% invoice discount
        // 20 units @ ₹100 = ₹2,000 gross. 10% inv disc = ₹200. Taxable = ₹1,800.
        // 18% GST on ₹1,800 = ₹324 (CGST ₹162 + SGST ₹162). Total = ₹2,124.
        var updateReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            CustomerPhone = "+91 9876543210",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            InvoiceDiscountPercent = 10m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 20m, UomId = uomId, UnitPrice = 100m }
            }
        };

        // Act
        var updateResult = await service.UpdateInvoiceAsync(invoiceId, updateReq);

        // Assert
        Assert.True(updateResult.IsSuccess);

        var updatedInv = await context.SalesInvoices.FirstAsync(i => i.Id == invoiceId);
        Assert.Equal(1800m, updatedInv.TaxableAmount);
        Assert.Equal(162m, updatedInv.CgstAmount);
        Assert.Equal(162m, updatedInv.SgstAmount);
        Assert.Equal(2124m, updatedInv.TotalAmount);

        // Party balance: was ₹1,180, delta is +₹944 (₹2,124 - ₹1,180) => ₹2,124
        var partyAfter = await context.Parties
            .Include(p => p.LedgerEntries)
            .FirstAsync(p => p.Id == partyId);

        Assert.Equal(2124m, partyAfter.CurrentOutstandingBalance);

        // Verify General Ledger Journal Voucher updated to ₹2,124
        var jv = await context.JournalVouchers
            .Include(v => v.Legs)
            .FirstOrDefaultAsync(v => v.ReferenceNumber == updatedInv.InvoiceNumber && v.VoucherType == "Journal");

        Assert.NotNull(jv);
        Assert.Equal(2124m, jv.TotalDebit);
        Assert.Equal(2124m, jv.TotalCredit);
    }

    [Fact]
    public async Task CancelInvoiceAsync_WithPaidAmount_CreditsFullInvoiceAmountAndReflectsCustomerAdvance()
    {
        // Arrange: Invoice created for ₹1,180 with ₹500 paid upfront
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var createReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.Cash,
            PaidAmount = 500m,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var invRes = await service.CreateInvoiceAsync(createReq);
        Assert.True(invRes.IsSuccess);

        var partyBefore = await context.Parties.FirstAsync(p => p.Id == partyId);
        Assert.Equal(680m, partyBefore.CurrentOutstandingBalance); // ₹1,180 - ₹500 = ₹680

        // Act: Cancel invoice
        var cancelRes = await service.CancelInvoiceAsync(invRes.Data, new CancelInvoiceRequest("Customer returned before delivery"));
        Assert.True(cancelRes.IsSuccess);

        // Assert: Party balance must reflect customer's ₹500 advance (credit balance = -₹500)
        var partyAfter = await context.Parties.Include(p => p.LedgerEntries).FirstAsync(p => p.Id == partyId);
        Assert.Equal(-500m, partyAfter.CurrentOutstandingBalance);

        // Party Ledger should have a CreditNote of full ₹1,180
        var cancelLedger = partyAfter.LedgerEntries.FirstOrDefault(e => e.ReferenceDocumentType == "InvoiceCancellation");
        Assert.NotNull(cancelLedger);
        Assert.Equal(1180m, cancelLedger.CreditAmount);
        Assert.Equal(-500m, cancelLedger.RunningBalance);
    }

    [Fact]
    public async Task CreateSalesReturnAsync_UpdatesOriginalInvoiceStatusToPartiallyOrFullyReturned()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var createReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var invRes = await service.CreateInvoiceAsync(createReq);
        Assert.True(invRes.IsSuccess);

        var origInv = await context.SalesInvoices.FirstAsync(i => i.Id == invRes.Data);
        Assert.Equal(InvoiceStatus.Issued, origInv.Status);

        // Act 1: Partial return of 4 units
        var retReq1 = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invRes.Data,
            OriginalInvoiceNumber = origInv.InvoiceNumber,
            PartyId = partyId,
            CustomerName = "City Chemist",
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Slight damage",
            RestockToWarehouse = true,
            Notes = "4 units returned",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new() { ItemId = itemId, ItemName = "Paracetamol", ItemSku = "PARA-500", ReturnQuantity = 4m, UnitPrice = 100m }
            }
        };

        var retRes1 = await service.CreateSalesReturnAsync(retReq1);
        Assert.True(retRes1.IsSuccess);

        var invAfterRet1 = await context.SalesInvoices.FirstAsync(i => i.Id == invRes.Data);
        Assert.Equal(InvoiceStatus.PartiallyReturned, invAfterRet1.Status);

        // Act 2: Remaining 6 units returned
        var retReq2 = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invRes.Data,
            OriginalInvoiceNumber = origInv.InvoiceNumber,
            PartyId = partyId,
            CustomerName = "City Chemist",
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Recall batch",
            RestockToWarehouse = true,
            Notes = "6 units returned",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new() { ItemId = itemId, ItemName = "Paracetamol", ItemSku = "PARA-500", ReturnQuantity = 6m, UnitPrice = 100m }
            }
        };

        var retRes2 = await service.CreateSalesReturnAsync(retReq2);
        Assert.True(retRes2.IsSuccess);

        var invAfterRet2 = await context.SalesInvoices.FirstAsync(i => i.Id == invRes.Data);
        Assert.Equal(InvoiceStatus.FullyReturned, invAfterRet2.Status);
    }

    [Fact]
    public async Task RecordInvoicePaymentAsync_AutoPostsReceiptVoucherToGeneralLedger()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var createReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "City Chemist",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.CreditAccount,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var invRes = await service.CreateInvoiceAsync(createReq);
        Assert.True(invRes.IsSuccess);

        // Act: Record settlement payment of ₹1,180 via BankTransfer
        var payReq = new RecordInvoicePaymentRequest(
            InvoiceId: invRes.Data,
            PaymentDate: DateTime.UtcNow,
            Amount: 1180m,
            PaymentMode: PaymentMode.BankTransfer,
            TransactionReference: "NEFT-HDFC-998877",
            Notes: "Full settlement"
        );

        var payRes = await service.RecordInvoicePaymentAsync(payReq);
        Assert.True(payRes.IsSuccess);

        // Assert: General Ledger receipt voucher must exist with Debit Bank ₹1,180 and Credit AR ₹1,180
        var receiptJv = await context.JournalVouchers
            .Include(v => v.Legs)
            .FirstOrDefaultAsync(v => v.VoucherType == "Receipt" && v.TotalDebit == 1180m);

        Assert.NotNull(receiptJv);
        Assert.Equal(1180m, receiptJv.TotalDebit);
        Assert.Equal(1180m, receiptJv.TotalCredit);

        var debitLeg = receiptJv.Legs.FirstOrDefault(l => l.DebitAmount == 1180m);
        Assert.NotNull(debitLeg);

        var creditLeg = receiptJv.Legs.FirstOrDefault(l => l.CreditAmount == 1180m);
        Assert.NotNull(creditLeg);
    }

    [Fact]
    public async Task CreateInvoiceAsync_WhenTenantIsComposition_GeneratesBillOfSupplyWithZeroGst()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var tenant = new Tenant
        {
            Id = tenantId,
            BusinessName = "Composition Retailers Ltd",
            IsCompositionScheme = true
        };
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();

        var createReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice, // Requested TaxInvoice, but tenant is Composition
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "Retail Customer",
            BillingAddress = "Bandra",
            BillingStateCode = "27",
            ShippingStateCode = "27",
            PlaceOfSupply = "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.Cash,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 10m, UomId = uomId, UnitPrice = 100m }
            }
        };

        // Act
        var invRes = await service.CreateInvoiceAsync(createReq);

        // Assert
        Assert.True(invRes.IsSuccess);
        var invoice = await context.SalesInvoices.FirstAsync(i => i.Id == invRes.Data);

        // Under GST Section 10 composition scheme, document type is BillOfSupply with BOS prefix and 0 tax
        Assert.Equal(InvoiceType.BillOfSupply, invoice.InvoiceType);
        Assert.StartsWith("BOS-", invoice.InvoiceNumber);
        Assert.Equal(1000m, invoice.SubTotal);
        Assert.Equal(1000m, invoice.TaxableAmount);
        Assert.Equal(0m, invoice.CgstAmount);
        Assert.Equal(0m, invoice.SgstAmount);
        Assert.Equal(0m, invoice.IgstAmount);
        Assert.Equal(1000m, invoice.TotalAmount);
    }

    [Fact]
    public async Task GetInvoicesAsync_WhenUserHasBranchClaimAndNotAdmin_EnforcesBranchIsolation()
    {
        // Arrange
        var (context, tenantId, branch1Id, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();

        var branch2Id = Guid.NewGuid();
        context.TenantBranches.Add(new TenantBranch
        {
            Id = branch2Id,
            TenantId = tenantId,
            BranchName = "Branch 2",
            BranchCode = "BR-02",
            State = "Maharashtra",
            StateCode = "27"
        });

        // Add 2 invoices in Branch 1
        context.SalesInvoices.AddRange(
            new SalesInvoice
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BranchId = branch1Id,
                PartyId = partyId,
                InvoiceNumber = "INV-BR1-001",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Branch 1 Customer",
                TotalAmount = 500m
            },
            new SalesInvoice
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BranchId = branch1Id,
                PartyId = partyId,
                InvoiceNumber = "INV-BR1-002",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Branch 1 Customer B",
                TotalAmount = 700m
            },
            // Add 1 invoice in Branch 2
            new SalesInvoice
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BranchId = branch2Id,
                PartyId = partyId,
                InvoiceNumber = "INV-BR2-001",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Branch 2 Customer",
                TotalAmount = 1200m
            }
        );
        await context.SaveChangesAsync();

        // Scope non-admin user to Branch 1
        userContext.BranchId = branch1Id;
        userContext.IsSuperAdmin = false;
        userContext.IsTenantAdmin = false;

        var service = new SalesService(context, tenantContext, userContext, auditService);

        // Act: User requests Branch 2 invoices, but their claim is bound to Branch 1
        var result = await service.GetInvoicesAsync(1, 50, branchId: branch2Id);

        // Assert: System overrides query param and enforces Branch 1 isolation
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Data.TotalCount);
        Assert.All(result.Data.Items, item => Assert.Equal(branch1Id, item.BranchId));
    }

    [Fact]
    public async Task HandlePaymentWebhook_WhenPaymentReceived_AutoSettlesInvoiceAndPartyLedger()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext();
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var party = await context.Parties.FindAsync(partyId);
        Assert.NotNull(party);
        party.CurrentOutstandingBalance = 1500m; // Party owes 1500

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-WEBHOOK-999",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = party.LegalName,
            TotalAmount = 1500m,
            PaidAmount = 0m,
            BalanceAmount = 1500m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };
        context.SalesInvoices.Add(invoice);

        var webhookSecret = "test_webhook_secret_key_123";
        context.PaymentGatewayConfigs.Add(new UdyogBill.Domain.Entities.Subscriptions.PaymentGatewayConfig
        {
            Provider = "Razorpay",
            WebhookSecret = webhookSecret,
            IsActive = true
        });
        await context.SaveChangesAsync();

        var controller = new PublicPaymentWebhookController(context, service, tenantContext);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var invoiceRef = invoice.Id.ToString();
        var amtStr = 1500m.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
        var canonical = $"{invoiceRef}|{amtStr}|pay_N1234567890";
        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(webhookSecret));
        var validSignature = Convert.ToHexString(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(canonical))).ToLower();

        var payload = new PaymentGatewayWebhookPayload(
            Gateway: "Razorpay",
            EventType: "payment.captured",
            InvoiceId: invoice.Id,
            InvoiceNumber: "INV-WEBHOOK-999",
            Amount: 1500m,
            PaymentReference: "pay_N1234567890",
            Signature: validSignature
        );

        // Act
        var result = await controller.HandlePaymentWebhook(payload, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var refreshedInvoice = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInvoice);
        Assert.Equal(1500m, refreshedInvoice.PaidAmount);
        Assert.Equal(0m, refreshedInvoice.BalanceAmount);
        Assert.Equal(PaymentStatus.FullyPaid, refreshedInvoice.PaymentStatus);
        Assert.Equal(InvoiceStatus.Paid, refreshedInvoice.Status);

        // Party balance should be credited by 1500 -> 0
        var refreshedParty = await context.Parties.FindAsync(partyId);
        Assert.NotNull(refreshedParty);
        Assert.Equal(0m, refreshedParty.CurrentOutstandingBalance);
    }

    [Fact]
    public async Task CreateSalesReturn_MultipleReturnsOnSameInvoice_ProgressesStatusAndBlocksExcess()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext();
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // 1. Create an invoice with 10 units of itemId
        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-RET-TEST",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Return Test Party",
            SubTotal = 1000m,
            TaxableAmount = 1000m,
            TotalAmount = 1180m,
            PaidAmount = 0m,
            BalanceAmount = 1180m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };

        var origItem = new SalesInvoiceItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Invoice = invoice,
            ItemId = itemId,
            ItemName = "Test Product",
            ItemSku = "PRD-001",
            Quantity = 10m,
            UnitPrice = 100m,
            GstRate = 18m,
            TaxableAmount = 1000m,
            TotalAmount = 1180m
        };
        invoice.Items.Add(origItem);
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        // 2. First Return: Return 4 units (Partial)
        var returnReq1 = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invoice.Id,
            OriginalInvoiceNumber = invoice.InvoiceNumber,
            PartyId = partyId,
            CustomerName = "Return Test Party",
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Defective item",
            RestockToWarehouse = true,
            Notes = "Return 4 units",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    VariantId = null,
                    ItemName = "Test Product",
                    ItemSku = "PRD-001",
                    BatchId = null,
                    BatchNumber = null,
                    ReturnQuantity = 4m,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };

        var res1 = await service.CreateSalesReturnAsync(returnReq1);
        Assert.True(res1.IsSuccess);

        var refreshedInv1 = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInv1);
        Assert.Equal(InvoiceStatus.PartiallyReturned, refreshedInv1.Status);

        // 3. Second Return: Attempt to return 7 units (Total would be 4 + 7 = 11 > 10) -> Must fail
        var returnReqExcess = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invoice.Id,
            OriginalInvoiceNumber = invoice.InvoiceNumber,
            PartyId = partyId,
            CustomerName = "Return Test Party",
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Excess return test",
            RestockToWarehouse = true,
            Notes = "Attempt return 7 units",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    VariantId = null,
                    ItemName = "Test Product",
                    ItemSku = "PRD-001",
                    BatchId = null,
                    BatchNumber = null,
                    ReturnQuantity = 7m,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };

        var resExcess = await service.CreateSalesReturnAsync(returnReqExcess);
        Assert.False(resExcess.IsSuccess);
        Assert.Equal("RETURN_QUANTITY_EXCEEDED", resExcess.ErrorCode);

        // 4. Third Return: Return remaining 6 units -> Total returned becomes 4 + 6 = 10 -> Status becomes FullyReturned
        var returnReq2 = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invoice.Id,
            OriginalInvoiceNumber = invoice.InvoiceNumber,
            PartyId = partyId,
            CustomerName = "Return Test Party",
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Return remainder",
            RestockToWarehouse = true,
            Notes = "Return 6 units",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    VariantId = null,
                    ItemName = "Test Product",
                    ItemSku = "PRD-001",
                    BatchId = null,
                    BatchNumber = null,
                    ReturnQuantity = 6m,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };

        var res2 = await service.CreateSalesReturnAsync(returnReq2);
        Assert.True(res2.IsSuccess);

        var refreshedInv2 = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInv2);
        Assert.Equal(InvoiceStatus.FullyReturned, refreshedInv2.Status);
    }

    [Fact]
    public async Task CreateInvoice_WhenStockInsufficient_BlocksB2BInvoice_AllowsPOSBill()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext();
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        // Current stock is 50 units (from SetupSalesContext)
        var stock = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.ItemId == itemId && s.WarehouseId == warehouseId);
        Assert.NotNull(stock);
        Assert.Equal(50m, stock.CurrentQuantity);

        // Act 1: Standard B2B Tax Invoice attempting to sell 100 units (insufficient stock)
        var b2bReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            CustomerName = "B2B Customer",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.Cash,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 100m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var b2bResult = await service.CreateInvoiceAsync(b2bReq);
        Assert.False(b2bResult.IsSuccess);
        Assert.Equal("INSUFFICIENT_STOCK", b2bResult.ErrorCode);

        // Act 2: POS Bill attempting to sell 100 units (counter sale allowed)
        var posReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.POSBill,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = null,
            CustomerName = "Retail Counter Buyer",
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = PaymentMode.Cash,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new() { ItemId = itemId, Quantity = 100m, UomId = uomId, UnitPrice = 100m }
            }
        };

        var posResult = await service.CreateInvoiceAsync(posReq);
        Assert.True(posResult.IsSuccess);

        // Verify stock is now 50 - 100 = -50
        var updatedStock = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.ItemId == itemId && s.WarehouseId == warehouseId);
        Assert.NotNull(updatedStock);
        Assert.Equal(-50m, updatedStock.CurrentQuantity);
    }

    [Fact]
    public async Task RecordInvoicePayment_CapsAtTotalAmountAndPreventsOverpayment()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupSalesContext();
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-PAY-CAP",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Cap Test Customer",
            TotalAmount = 1000m,
            PaidAmount = 0m,
            BalanceAmount = 1000m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        // Act 1: Record 600 payment
        var pay1 = await service.RecordInvoicePaymentAsync(new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: 600m,
            PaymentMode: PaymentMode.Cash
        ));
        Assert.True(pay1.IsSuccess);

        var refreshedInv1 = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInv1);
        Assert.Equal(600m, refreshedInv1.PaidAmount);
        Assert.Equal(400m, refreshedInv1.BalanceAmount);
        Assert.Equal(PaymentStatus.PartiallyPaid, refreshedInv1.PaymentStatus);

        // Act 2: Attempt to pay 800 (only 400 balance remains) -> caps at 400
        var pay2 = await service.RecordInvoicePaymentAsync(new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: 800m,
            PaymentMode: PaymentMode.Cash
        ));
        Assert.True(pay2.IsSuccess);

        var refreshedInv2 = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInv2);
        Assert.Equal(1000m, refreshedInv2.PaidAmount);
        Assert.Equal(0m, refreshedInv2.BalanceAmount);
        Assert.Equal(PaymentStatus.FullyPaid, refreshedInv2.PaymentStatus);
        Assert.Equal(InvoiceStatus.Paid, refreshedInv2.Status);

        // Act 3: Attempt to pay when already fully paid -> returns ALREADY_PAID
        var pay3 = await service.RecordInvoicePaymentAsync(new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: 100m,
            PaymentMode: PaymentMode.Cash
        ));
        Assert.False(pay3.IsSuccess);
        Assert.Equal("ALREADY_PAID", pay3.ErrorCode);
    }

    [Fact]
    public async Task RecordInvoicePaymentAsync_DuplicateTransactionReference_ReturnsIdempotentSuccess()
    {
        var (context, tenantId, branchId, _, _, _, _, tenantContext, userContext) = SetupSalesContext("27");
        var auditService = new MockAuditService();
        var service = new SalesService(context, tenantContext, userContext, auditService);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            InvoiceNumber = "INV-IDEM-001",
            InvoiceDate = DateTime.UtcNow,
            TotalAmount = 500m,
            PaidAmount = 0m,
            BalanceAmount = 500m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var txnRef = "TXN_RZP_123456789";

        // First payment
        var pay1 = await service.RecordInvoicePaymentAsync(new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: 500m,
            PaymentMode: PaymentMode.UPI,
            TransactionReference: txnRef
        ));
        Assert.True(pay1.IsSuccess);
        var firstPaymentId = pay1.Data;

        // Verify invoice is now paid
        var refreshedInv = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(refreshedInv);
        Assert.Equal(500m, refreshedInv.PaidAmount);
        Assert.Equal(0m, refreshedInv.BalanceAmount);
        Assert.Equal(PaymentStatus.FullyPaid, refreshedInv.PaymentStatus);

        // Replay payment with same TransactionReference
        var pay2 = await service.RecordInvoicePaymentAsync(new RecordInvoicePaymentRequest(
            InvoiceId: invoice.Id,
            PaymentDate: DateTime.UtcNow,
            Amount: 500m,
            PaymentMode: PaymentMode.UPI,
            TransactionReference: txnRef
        ));

        Assert.True(pay2.IsSuccess);
        Assert.Equal(firstPaymentId, pay2.Data);

        // Verify invoice paid amount didn't double
        var finalInv = await context.SalesInvoices.FindAsync(invoice.Id);
        Assert.NotNull(finalInv);
        Assert.Equal(500m, finalInv.PaidAmount);
        Assert.Equal(0m, finalInv.BalanceAmount);
    }
}

