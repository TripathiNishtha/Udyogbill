using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
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
}
