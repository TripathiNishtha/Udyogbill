using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Services.Calculations;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Infrastructure.Services;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Regression;

public class ZeroBreakRemediationV2Tests
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
            TenantCode = "TNT-REMEDY-01"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            UserId = Guid.NewGuid(),
            Email = "architect@digiopera.com",
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

    [Fact]
    public async Task BUG_P0_01_CreateSalesReturn_WithoutOriginalInvoice_FailsWithInvoiceRequired()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        var returnReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = null, // Missing original invoice
            PartyId = partyId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = "Customer Returned Goods",
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    ItemName = "Paracetamol 650mg",
                    ReturnQuantity = 2,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };

        var result = await salesService.CreateSalesReturnAsync(returnReq);

        Assert.False(result.IsSuccess);
        Assert.Equal("INVOICE_REQUIRED", result.ErrorCode);
    }

    [Fact]
    public async Task BUG_P0_02_CancelInvoice_WithActiveSalesReturns_Fails()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        // 1. Create Invoice
        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 10,
                    UomId = uomId,
                    UnitPrice = 100m
                }
            }
        };
        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);
        Assert.True(invResult.IsSuccess);
        var invoiceId = invResult.Data;

        // 2. Create Return against this invoice
        var returnReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invoiceId,
            PartyId = partyId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    ItemName = "Paracetamol 650mg",
                    ReturnQuantity = 2,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };
        var retResult = await salesService.CreateSalesReturnAsync(returnReq);
        Assert.True(retResult.IsSuccess);

        // 3. Attempt to cancel original invoice while return is active
        var cancelResult = await salesService.CancelInvoiceAsync(invoiceId, new CancelInvoiceRequest("Mistake in billing"));

        Assert.False(cancelResult.IsSuccess);
        Assert.Equal("CANNOT_CANCEL_WITH_ACTIVE_RETURNS", cancelResult.ErrorCode);
    }

    [Fact]
    public async Task BUG_P0_03_CancelPurchaseBill_WithDisbursedPayments_Fails()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, _, purchaseService, _, _, _) = SetupContext();

        // Seed Supplier
        var supplierId = Guid.NewGuid();
        context.Parties.Add(new Party
        {
            Id = supplierId,
            TenantId = tenantId,
            Code = "SUPP-001",
            LegalName = "Cipla Healthcare",
            PartyType = PartyType.Supplier,
            StateCode = "27"
        });
        await context.SaveChangesAsync();

        // Create Purchase Bill with PaidAmount > 0
        var billReq = new CreatePurchaseBillRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = supplierId,
            BillDate = DateTime.UtcNow,
            PaidAmount = 500m, // Payment disbursed!
            Items = new List<CreatePurchaseBillItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 10,
                    UomId = uomId,
                    UnitPrice = 50m
                }
            }
        };

        var billResult = await purchaseService.CreatePurchaseBillAsync(billReq);
        Assert.True(billResult.IsSuccess);
        var billId = billResult.Data;

        // Attempt cancellation
        var cancelResult = await purchaseService.CancelPurchaseBillAsync(billId, "Vendor dispute");

        Assert.False(cancelResult.IsSuccess);
        Assert.Equal("CANNOT_CANCEL_BILL_WITH_PAYMENTS_OR_RETURNS", cancelResult.ErrorCode);
    }

    [Fact]
    public async Task BUG_P0_04_CreateInvoice_WithExpiredBatch_FailsWithBatchExpired()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        // Seed expired batch
        var batchId = Guid.NewGuid();
        context.ItemBatches.Add(new ItemBatch
        {
            Id = batchId,
            TenantId = tenantId,
            ItemId = itemId,
            BatchNumber = "BATCH-EXPIRED-99",
            ExpiryDate = DateTime.UtcNow.AddMonths(-2), // Expired 2 months ago!
            IsActive = true
        });
        await context.SaveChangesAsync();

        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    BatchId = batchId,
                    Quantity = 5,
                    UomId = uomId,
                    UnitPrice = 100m
                }
            }
        };

        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);

        Assert.False(invResult.IsSuccess);
        Assert.Equal("BATCH_EXPIRED", invResult.ErrorCode);
    }

    [Fact]
    public async Task BUG_P0_05_VariantStock_SalesOutward_IsolatesVariantInventory()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        var variantRedId = Guid.NewGuid();
        var variantBlueId = Guid.NewGuid();

        // Seed variant stocks
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            VariantId = variantRedId,
            WarehouseId = warehouseId,
            CurrentQuantity = 20m
        });

        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            TenantId = tenantId,
            ItemId = itemId,
            VariantId = variantBlueId,
            WarehouseId = warehouseId,
            CurrentQuantity = 40m
        });

        await context.SaveChangesAsync();

        // Sell Variant Red
        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    VariantId = variantRedId,
                    Quantity = 5,
                    UomId = uomId,
                    UnitPrice = 100m
                }
            }
        };

        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);
        Assert.True(invResult.IsSuccess);

        // Verify stock of Variant Red is deducted to 15, while Variant Blue is untouched at 40
        var stockRed = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == itemId && s.VariantId == variantRedId && s.WarehouseId == warehouseId);
        var stockBlue = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == itemId && s.VariantId == variantBlueId && s.WarehouseId == warehouseId);

        Assert.NotNull(stockRed);
        Assert.NotNull(stockBlue);
        Assert.Equal(15m, stockRed.CurrentQuantity);
        Assert.Equal(40m, stockBlue.CurrentQuantity);
    }

    [Fact]
    public async Task BUG_P0_06_CreateInvoice_NonInwardedImei_FailsWithSerialNotInwarded()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 1,
                    UomId = uomId,
                    UnitPrice = 100m,
                    AttributesJson = "{\"imeiSerial\": \"IMEI-998877665544332\"}"
                }
            }
        };

        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);

        Assert.False(invResult.IsSuccess);
        Assert.Equal("SERIAL_NOT_INWARDED", invResult.ErrorCode);
    }

    [Fact]
    public async Task BUG_P0_07_PartyPayment_ExplicitDirections_CalculatesCorrectRunningBalances()
    {
        var (context, tenantId, _, _, _, _, partyId, _, _, partyService, _, _) = SetupContext();

        // Customer receipt: 500 received from customer (Credit 500, reducing balance)
        var receiptReq = new RecordPartyPaymentRequest(
            PartyId: partyId,
            TransactionDate: DateTime.UtcNow,
            Amount: 500m,
            PaymentMode: "UPI",
            ReferenceNumber: "UPI123456",
            Notes: null,
            Direction: PartyPaymentDirection.CustomerReceipt
        );

        var receiptResult = await partyService.RecordPartyPaymentAsync(receiptReq);
        Assert.True(receiptResult.IsSuccess);

        var customer = await context.Parties.FindAsync(partyId);
        Assert.NotNull(customer);
        Assert.Equal(-500m, customer.CurrentOutstandingBalance); // Credit balance of 500 advance

        // Vendor payment: paying vendor 300 (Debit 300, increasing balance towards zero from negative)
        var vendorId = Guid.NewGuid();
        context.Parties.Add(new Party
        {
            Id = vendorId,
            TenantId = tenantId,
            Code = "VEND-99",
            LegalName = "Raw Supply Corp",
            PartyType = PartyType.Supplier,
            CurrentOutstandingBalance = -1000m // We owe vendor 1000
        });
        await context.SaveChangesAsync();

        var paymentReq = new RecordPartyPaymentRequest(
            PartyId: vendorId,
            TransactionDate: DateTime.UtcNow,
            Amount: 300m,
            PaymentMode: "BankTransfer",
            ReferenceNumber: "NEFT9988",
            Notes: null,
            Direction: PartyPaymentDirection.VendorPayment
        );

        var paymentResult = await partyService.RecordPartyPaymentAsync(paymentReq);
        Assert.True(paymentResult.IsSuccess);

        var vendor = await context.Parties.FindAsync(vendorId);
        Assert.NotNull(vendor);
        Assert.Equal(-700m, vendor.CurrentOutstandingBalance); // -1000 + 300 = -700
    }

    [Fact]
    public async Task BUG_P1_01_QuotationConversion_AlreadyConverted_ReturnsFailure()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, quotationService, _) = SetupContext();

        var quotationId = Guid.NewGuid();
        context.Quotations.Add(new Quotation
        {
            Id = quotationId,
            TenantId = tenantId,
            QuotationNumber = "QT-2627-00001",
            Status = QuotationStatus.ConvertedToInvoice, // Already converted!
            BranchId = branchId,
            PartyId = partyId,
            CustomerName = "MedPlus Pharma"
        });
        await context.SaveChangesAsync();

        var convReq = new ConvertQuotationRequest
        {
            WarehouseId = warehouseId,
            InvoiceDate = DateTime.UtcNow
        };

        var result = await quotationService.ConvertQuotationToInvoiceAsync(quotationId, convReq);

        Assert.False(result.IsSuccess);
        Assert.Equal("ALREADY_CONVERTED", result.ErrorCode);
    }

    [Fact]
    public async Task BUG_P1_02_CreateInvoice_ZeroQuantity_FailsWithInvalidQuantity()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, _, _, _, _) = SetupContext();

        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 0m, // Invalid 0 quantity
                    FreeQuantity = 0m,
                    UomId = uomId,
                    UnitPrice = 100m
                }
            }
        };

        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);

        Assert.False(invResult.IsSuccess);
        Assert.Equal("INVALID_QUANTITY", invResult.ErrorCode);
    }

    [Fact]
    public async Task BUG_P1_04_SummaryDashboard_IncludesReturns_ReconcilesNetTotals()
    {
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, salesService, purchaseService, _, _, reportService) = SetupContext();

        // 1. Create Invoice: 10 units @ 100 = 1000 taxable + 180 GST = 1180 Total
        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    Quantity = 10,
                    UomId = uomId,
                    UnitPrice = 100m
                }
            }
        };
        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);
        Assert.True(invResult.IsSuccess);

        // 2. Create Sales Return: 2 units @ 100 = 200 taxable + 36 GST = 236 Total
        var returnReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invResult.Data,
            PartyId = partyId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = itemId,
                    ItemName = "Paracetamol 650mg",
                    ReturnQuantity = 2,
                    UnitPrice = 100m,
                    GstRate = 18m
                }
            }
        };
        var retResult = await salesService.CreateSalesReturnAsync(returnReq);
        Assert.True(retResult.IsSuccess);

        // 3. Get Dashboard
        var dashboardResult = await reportService.GetSummaryDashboardAsync(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), branchId);
        Assert.True(dashboardResult.IsSuccess);
        var dash = dashboardResult.Data!;

        // Total sales must be Net of returns: 1180 - 236 = 944
        Assert.Equal(944m, dash.TotalSales);
        // Output GST must be Net of returns: 180 - 36 = 144
        Assert.Equal(144m, dash.OutputGst);
    }

    [Fact]
    public async Task BUG_P1_05_SalesReturn_ServiceItem_DoesNotMutateStock()
    {
        var (context, tenantId, branchId, warehouseId, uomId, _, partyId, salesService, _, _, _, _) = SetupContext();

        // Seed Service Item (Consulting / Delivery)
        var serviceItemId = Guid.NewGuid();
        context.Items.Add(new Item
        {
            Id = serviceItemId,
            TenantId = tenantId,
            Sku = "SRV-CONSULT",
            Name = "Doctor Consultation",
            ItemType = ItemType.Service, // Service item!
            TrackInventory = false,
            PrimaryUomId = uomId,
            SellingPrice = 500m,
            TaxRate = 18m
        });
        await context.SaveChangesAsync();

        // Create Invoice for Service
        var invoiceReq = new CreateSalesInvoiceRequest
        {
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceDate = DateTime.UtcNow,
            Items = new List<CreateSalesInvoiceItemRequest>
            {
                new()
                {
                    ItemId = serviceItemId,
                    Quantity = 1,
                    UomId = uomId,
                    UnitPrice = 500m
                }
            }
        };
        var invResult = await salesService.CreateInvoiceAsync(invoiceReq);
        Assert.True(invResult.IsSuccess);

        // Process Return / Credit Note for Service
        var returnReq = new CreateSalesReturnRequest
        {
            OriginalSalesInvoiceId = invResult.Data,
            PartyId = partyId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            RestockToWarehouse = true, // User left restock flag true
            Items = new List<CreateSalesReturnItemRequest>
            {
                new()
                {
                    ItemId = serviceItemId,
                    ItemName = "Doctor Consultation",
                    ReturnQuantity = 1,
                    UnitPrice = 500m,
                    GstRate = 18m
                }
            }
        };
        var retResult = await salesService.CreateSalesReturnAsync(returnReq);
        Assert.True(retResult.IsSuccess);

        // Verify NO warehouse stock or stock movements were created for this service item
        var serviceStock = await context.ItemWarehouseStocks.FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == serviceItemId);
        var serviceMovement = await context.StockMovements.FirstOrDefaultAsync(m => m.TenantId == tenantId && m.ItemId == serviceItemId);

        Assert.Null(serviceStock);
        Assert.Null(serviceMovement);
    }
}
