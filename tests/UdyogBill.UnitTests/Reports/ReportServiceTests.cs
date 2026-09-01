using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Reports;

public class ReportServiceTests
{
    private (AppDbContext context, ReportService service, Guid tenantId, Guid partyId, Guid branchId) CreateTestContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"UdyogBill_Report_Test_{Guid.NewGuid()}")
            .Options;

        var tenantId = Guid.NewGuid();
        var partyId = Guid.NewGuid();
        var branchId = Guid.NewGuid();

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

        var industry = new Industry
        {
            Id = Guid.NewGuid(),
            Code = "PHARMA",
            Name = "Pharmaceuticals"
        };
        context.Industries.Add(industry);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-PHARMA-001",
            BusinessName = "Apollo Pharma Solutions",
            GSTIN = "27AABCA1234A1Z5",
            IndustryId = industry.Id,
            IsActive = true
        };
        context.Tenants.Add(tenant);

        var party = new Party
        {
            Id = partyId,
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "City Health Clinic",
            GSTIN = "27XYZPA1234A1Z1",
            OpeningBalance = 1000m,
            CurrentOutstandingBalance = 1000m,
            IsActive = true
        };
        context.Parties.Add(party);

        // Seed Party Ledger Entries
        var entry1 = new PartyLedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PartyId = partyId,
            TransactionDate = DateTime.UtcNow.AddDays(-10),
            EntryType = PartyLedgerEntryType.SalesInvoice,
            DebitAmount = 2500m,
            CreditAmount = 0m,
            RunningBalance = 3500m,
            ReferenceDocumentType = "SalesInvoice",
            ReferenceDocumentNumber = "INV-001",
            Description = "Sales Invoice Issued"
        };
        var entry2 = new PartyLedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PartyId = partyId,
            TransactionDate = DateTime.UtcNow.AddDays(-5),
            EntryType = PartyLedgerEntryType.PaymentReceipt,
            DebitAmount = 0m,
            CreditAmount = 1500m,
            RunningBalance = 2000m,
            ReferenceDocumentType = "PaymentReceipt",
            ReferenceDocumentNumber = "REC-001",
            PaymentMode = "UPI",
            Description = "Customer Payment Received"
        };
        context.PartyLedgerEntries.AddRange(entry1, entry2);

        var uom = new UnitOfMeasure
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Code = "STRIP",
            Name = "Strip",
            IsActive = true
        };
        context.UnitsOfMeasure.Add(uom);

        var item = new Item
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "MED-001",
            Name = "Amoxicillin 500mg",
            HSNCode = "3004",
            PrimaryUomId = uom.Id,
            IsActive = true
        };
        context.Items.Add(item);

        // Seed Sales Invoices
        var salesInvoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            PartyId = partyId,
            InvoiceNumber = "INV-2627-00001",
            InvoiceDate = DateTime.UtcNow.AddDays(-10),
            InvoiceType = InvoiceType.TaxInvoice,
            Status = InvoiceStatus.Issued,
            CustomerName = "City Health Clinic",
            CustomerGSTIN = "27XYZPA1234A1Z1",
            SubTotal = 2500m,
            InvoiceDiscountAmount = 100m,
            TaxableAmount = 2400m,
            CgstAmount = 144m,
            SgstAmount = 144m,
            IgstAmount = 0m,
            TotalAmount = 2688m,
            PaidAmount = 1000m,
            BalanceAmount = 1688m
        };
        salesInvoice.Items.Add(new SalesInvoiceItem
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ItemId = item.Id,
            ItemSku = item.Sku,
            ItemName = item.Name,
            Quantity = 10,
            UnitPrice = 240m,
            GstRate = 12m,
            CgstRate = 6m,
            SgstRate = 6m,
            TaxableAmount = 2400m,
            CgstAmount = 144m,
            SgstAmount = 144m,
            TotalAmount = 2688m,
            HsnCode = "3004",
            UomId = uom.Id,
            UomCode = "STRIP"
        });
        context.SalesInvoices.Add(salesInvoice);

        // Seed Purchase Bills
        var purchaseBill = new PurchaseBill
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            PartyId = Guid.NewGuid(),
            BillNumber = "BILL-2627-00001",
            BillDate = DateTime.UtcNow.AddDays(-8),
            Status = PurchaseBillStatus.Approved,
            SupplierName = "Sun Pharma Distributors",
            SupplierGSTIN = "27SUNPA1234A1Z9",
            SubTotal = 1500m,
            TaxableAmount = 1500m,
            CgstAmount = 90m,
            SgstAmount = 90m,
            IgstAmount = 0m,
            TotalAmount = 1680m,
            PaidAmount = 1680m,
            BalanceAmount = 0m
        };
        context.PurchaseBills.Add(purchaseBill);

        context.SaveChanges();

        var service = new ReportService(context, userContext);
        return (context, service, tenantId, partyId, branchId);
    }

    [Fact]
    public async Task GetLedgerStatementAsync_ComputesOpeningAndClosingBalances()
    {
        // Arrange
        var (context, service, tenantId, partyId, _) = CreateTestContext();

        // Act
        var result = await service.GetLedgerStatementAsync(partyId, DateTime.UtcNow.AddDays(-15), DateTime.UtcNow);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.OpeningBalance.Should().Be(1000m);
        result.Data.TotalDebit.Should().Be(2500m);
        result.Data.TotalCredit.Should().Be(1500m);
        result.Data.ClosingBalance.Should().Be(2000m);
        result.Data.Entries.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetPnLReportAsync_CalculatesGrossAndNetProfitAccurately()
    {
        // Arrange
        var (context, service, tenantId, _, _) = CreateTestContext();

        // Act
        var result = await service.GetPnLReportAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.NetSalesRevenue.Should().Be(2400m);
        result.Data.TotalPurchasesCost.Should().Be(1500m);
        result.Data.GrossProfit.Should().Be(900m); // 2400 - 1500
        result.Data.NetProfit.Should().Be(900m);
        result.Data.GrossMarginPercent.Should().Be(37.5m); // 900 / 2400 * 100
    }

    [Fact]
    public async Task GetGstr1ReportAsync_GroupsB2BAndHsnSummaries()
    {
        // Arrange
        var (context, service, tenantId, _, _) = CreateTestContext();

        // Act
        var result = await service.GetGstr1ReportAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.TotalB2BInvoices.Should().Be(1);
        result.Data.TotalB2BTaxable.Should().Be(2400m);
        result.Data.TotalB2BTax.Should().Be(288m);
        result.Data.HsnSummary.Should().ContainSingle(h => h.HSNCode == "3004" && h.TaxableValue == 2400m);
    }

    [Fact]
    public async Task GetGstr3bReportAsync_ComputesOutputTaxAndEligibleItc()
    {
        // Arrange
        var (context, service, tenantId, _, _) = CreateTestContext();

        // Act
        var result = await service.GetGstr3bReportAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.TotalOutputTaxLiability.Should().Be(288m); // 144 CGST + 144 SGST
        result.Data.TotalEligibleItc.Should().Be(180m); // 90 CGST + 90 SGST
        result.Data.NetCgstPayable.Should().Be(54m); // 144 - 90
        result.Data.NetSgstPayable.Should().Be(54m); // 144 - 90
        result.Data.TotalNetGstPayable.Should().Be(108m);
    }

    [Fact]
    public async Task ExportGstr1CsvAsync_GeneratesValidCsvContent()
    {
        // Arrange
        var (context, service, _, _, _) = CreateTestContext();

        // Act
        var result = await service.ExportGstr1CsvAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.FileBytes.Length.Should().BeGreaterThan(0);
        result.Data.ContentType.Should().Be("text/csv");
        result.Data.FileName.Should().StartWith("GSTR1_");
    }
}
