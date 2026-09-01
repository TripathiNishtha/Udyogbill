using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Banking;
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

namespace UdyogBill.UnitTests.Reports;

public class P0ReportServiceTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouseId, Guid uomId, Guid itemId, Guid partyId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupReportingContext()
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
            TenantCode = "TNT-REPORT-001"
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
            BranchName = "Main Flagship Branch",
            BranchCode = "BR-01",
            StateCode = "27",
            IsActive = true
        });

        // Seed Warehouse
        context.TenantWarehouses.Add(new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseName = "Central Godown",
            WarehouseCode = "WH-01",
            IsActive = true
        });

        // Seed Unit of Measure
        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Code = "PCS",
            Name = "Pieces",
            DecimalPlaces = 0
        });

        // Seed Category & Brand
        var catId = Guid.NewGuid();
        context.Categories.Add(new Category
        {
            Id = catId,
            TenantId = tenantId,
            Name = "Antibiotics",
            Code = "MED-ANTI"
        });

        var brandId = Guid.NewGuid();
        context.Brands.Add(new Brand
        {
            Id = brandId,
            TenantId = tenantId,
            Name = "Sun Pharma",
            Code = "SUN"
        });

        // Seed Item
        context.Items.Add(new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Name = "Amoxicillin 500mg",
            Sku = "MED-AMOX-500",
            HSNCode = "3004",
            CategoryId = catId,
            BrandId = brandId,
            PrimaryUomId = uomId,
            PurchasePrice = 80m,
            SellingPrice = 100m,
            MRP = 120m,
            TaxRate = 18m,
            MinimumStockAlert = 50m,
            ReorderQuantity = 100m,
            IsActive = true
        });

        // Seed Customer Party
        context.Parties.Add(new Party
        {
            Id = partyId,
            TenantId = tenantId,
            LegalName = "Apex Hospital Pharmacy",
            PartyType = PartyType.Customer,
            CustomerType = CustomerType.B2B,
            GSTIN = "27AABCA1234F1Z5",
            PrimaryPhone = "+91 9820011223",
            CreditLimit = 50000m,
            CreditPeriodDays = 15,
            StateCode = "27",
            IsActive = true
        });

        context.SaveChanges();

        return (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext);
    }

    [Fact]
    public async Task SalesRegisterDetailed_CalculatesTaxesAndTotalsAccurately()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupReportingContext();
        var service = new P0ReportService(context, tenantContext, userContext);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-2627-0001",
            InvoiceDate = DateTime.UtcNow.AddDays(-2),
            CustomerName = "Apex Hospital Pharmacy",
            CustomerGSTIN = "27AABCA1234F1Z5",
            SubTotal = 1000m,
            TaxableAmount = 1000m,
            CgstAmount = 90m,
            SgstAmount = 90m,
            IgstAmount = 0m,
            TotalAmount = 1180m,
            PaidAmount = 500m,
            BalanceAmount = 680m,
            PaymentStatus = PaymentStatus.PartiallyPaid,
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            BillingStateCode = "27"
        };

        invoice.Items.Add(new SalesInvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            TenantId = tenantId,
            ItemId = itemId,
            ItemName = "Amoxicillin 500mg",
            ItemSku = "MED-AMOX-500",
            Quantity = 10m,
            UomId = uomId,
            UomCode = "PCS",
            UnitPrice = 100m,
            TaxableAmount = 1000m,
            GstRate = 18m,
            CgstAmount = 90m,
            SgstAmount = 90m,
            TotalAmount = 1180m
        });

        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        // Act
        var report = await service.GetSalesRegisterDetailedAsync(new P0ReportFilterRequest());

        // Assert
        report.Should().NotBeNull();
        report.TotalCount.Should().Be(1);
        report.TotalQuantity.Should().Be(10m);
        report.TotalTaxable.Should().Be(1000m);
        report.TotalCgst.Should().Be(90m);
        report.TotalSgst.Should().Be(90m);
        report.TotalTax.Should().Be(180m);
        report.TotalNetAmount.Should().Be(1180m);
        report.TotalPaid.Should().Be(500m);
        report.TotalOutstanding.Should().Be(680m);
        report.Items.First().ProductName.Should().Be("Amoxicillin 500mg");
    }

    [Fact]
    public async Task RealTimeStockBalance_ClassifiesStockStatusesAndValuation()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupReportingContext();
        var service = new P0ReportService(context, tenantContext, userContext);

        // Item min alert is 50. Current quantity is 20 -> should be Low.
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 20m,
            ReservedQuantity = 5m
        });
        await context.SaveChangesAsync();

        // Act
        var report = await service.GetRealTimeStockBalanceAsync(new P0ReportFilterRequest());

        // Assert
        report.Should().NotBeNull();
        report.Items.Should().HaveCount(1);
        var item = report.Items.First();
        item.CurrentStock.Should().Be(20m);
        item.AvailableStock.Should().Be(15m);
        item.ReservedStock.Should().Be(5m);
        item.StockStatus.Should().Be("Critical");
        item.StockValue.Should().Be(20m * 80m); // 20 qty * 80 purchase price = 1600
        report.TotalLowStockCount.Should().Be(1);
        report.TotalStockValue.Should().Be(1600m);
    }

    [Fact]
    public async Task DebtorAgeingSchedule_CalculatesOverdueSlabsAccurately()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupReportingContext();
        var service = new P0ReportService(context, tenantContext, userContext);

        var now = DateTime.UtcNow;

        // Invoice 1: Due 20 days ago -> Slab "16-30"
        context.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-DUE-20",
            InvoiceDate = now.AddDays(-35),
            DueDate = now.AddDays(-20),
            CustomerName = "Apex Hospital Pharmacy",
            TotalAmount = 2000m,
            PaidAmount = 0m,
            BalanceAmount = 2000m,
            BillingStateCode = "27"
        });

        // Invoice 2: Due in 10 days -> Slab "NotDue"
        context.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-FUTURE",
            InvoiceDate = now.AddDays(-5),
            DueDate = now.AddDays(10),
            CustomerName = "Apex Hospital Pharmacy",
            TotalAmount = 3000m,
            PaidAmount = 0m,
            BalanceAmount = 3000m,
            BillingStateCode = "27"
        });

        await context.SaveChangesAsync();

        // Act
        var report = await service.GetDebtorAgeingScheduleAsync(new P0ReportFilterRequest());

        // Assert
        report.Should().NotBeNull();
        report.GrandTotalReceivable.Should().Be(5000m);
        report.GrandNotDue.Should().Be(3000m);
        report.GrandOverdue.Should().Be(2000m);
        report.TotalDays16To30.Should().Be(2000m);
        report.CustomerSummaries.Should().HaveCount(1);
        report.CustomerSummaries.First().TotalReceivable.Should().Be(5000m);
        report.CustomerSummaries.First().Days16To30.Should().Be(2000m);
    }

    [Fact]
    public async Task TruePnL_CalculatesRealCogsAndOperatingExpenses()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupReportingContext();
        var service = new P0ReportService(context, tenantContext, userContext);

        var now = DateTime.UtcNow;

        // 1. Sales: 10,000 net taxable
        context.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = partyId,
            InvoiceNumber = "INV-PNL-01",
            InvoiceDate = now,
            CustomerName = "Apex Hospital Pharmacy",
            SubTotal = 10000m,
            TaxableAmount = 10000m,
            TotalAmount = 11800m,
            PaidAmount = 11800m,
            BalanceAmount = 0m,
            BillingStateCode = "27"
        });

        // 2. Purchases: 6,000 net taxable
        var supplierId = Guid.NewGuid();
        context.Parties.Add(new Party
        {
            Id = supplierId,
            TenantId = tenantId,
            LegalName = "MedLife Distributors",
            PartyType = PartyType.Supplier,
            IsActive = true
        });

        context.PurchaseBills.Add(new PurchaseBill
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = supplierId,
            BillNumber = "BILL-PNL-01",
            BillDate = now,
            TaxableAmount = 6000m,
            TotalAmount = 7080m,
            PaidAmount = 7080m,
            BalanceAmount = 0m
        });

        // 3. Operating Expense: 1,500 Rent
        var expCatId = Guid.NewGuid();
        context.ExpenseCategories.Add(new ExpenseCategory
        {
            Id = expCatId,
            TenantId = tenantId,
            Name = "Shop Rent",
            Code = "RENT"
        });

        context.ExpenseVouchers.Add(new ExpenseVoucher
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CategoryId = expCatId,
            PaidTo = "Landlord Realty",
            ExpenseDate = now,
            Amount = 1500m,
            TotalAmount = 1500m
        });

        // 4. Warehouse stocks for COGS
        context.ItemWarehouseStocks.Add(new ItemWarehouseStock
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ItemId = itemId,
            WarehouseId = warehouseId,
            CurrentQuantity = 100m
        });

        await context.SaveChangesAsync();

        // Act
        var pnl = await service.GetTruePnLReportAsync(new P0ReportFilterRequest());

        // Assert
        pnl.Should().NotBeNull();
        pnl.NetSalesRevenue.Should().Be(10000m);
        pnl.NetPurchasesAmount.Should().Be(6000m);
        pnl.TotalOperatingExpenses.Should().Be(1500m);
        pnl.OperatingExpenses.Should().HaveCount(1);
        pnl.OperatingExpenses.First().CategoryName.Should().Be("Shop Rent");
        pnl.OperatingExpenses.First().Amount.Should().Be(1500m);
        pnl.GrossProfitAmount.Should().BeGreaterThan(0m);
        pnl.NetProfitAmount.Should().Be(pnl.GrossProfitAmount - 1500m);
    }

    [Fact]
    public async Task P0Reports_EnforceTenantIsolation()
    {
        // Arrange
        var (context, tenantId, branchId, warehouseId, uomId, itemId, partyId, tenantContext, userContext) = SetupReportingContext();
        var service = new P0ReportService(context, tenantContext, userContext);

        var otherTenantId = Guid.NewGuid();

        // Sales Invoice belonging to ANOTHER tenant
        context.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = otherTenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            InvoiceNumber = "INV-OTHER-TENANT",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Rogue Competitor",
            SubTotal = 50000m,
            TaxableAmount = 50000m,
            TotalAmount = 59000m,
            PaidAmount = 59000m,
            BillingStateCode = "27"
        });

        await context.SaveChangesAsync();

        // Act
        var report = await service.GetSalesRegisterDetailedAsync(new P0ReportFilterRequest());

        // Assert: should NOT contain the other tenant's invoice
        report.Items.Should().NotContain(i => i.InvoiceNumber == "INV-OTHER-TENANT");
        report.TotalCount.Should().Be(0);
    }
}
