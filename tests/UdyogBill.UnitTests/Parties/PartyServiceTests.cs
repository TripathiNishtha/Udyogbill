using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Parties;

public class PartyServiceTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupPartyContext()
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
        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateParty_WithGstin_ShouldExtractStateCodeAndCreateOpeningLedger()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        var request = new CreatePartyRequest(
            Code: "CUST-APOLLO",
            LegalName: "Apollo Pharmacy Ltd",
            TradeName: "Apollo Chemist",
            PartyType: PartyType.Customer,
            CustomerType: CustomerType.B2B,
            GSTIN: "27AABCA1234A1Z5", // Maharashtra GSTIN (State 27)
            CreditLimit: 50000m,
            CreditPeriodDays: 30,
            OpeningBalance: 15000m,
            OpeningBalanceType: BalanceType.Debit, // Receivable
            OpeningBalanceDate: DateTime.UtcNow.AddMonths(-1)
        );

        // Act
        var result = await service.CreatePartyAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var party = await context.Parties
            .Include(p => p.LedgerEntries)
            .FirstOrDefaultAsync(p => p.Id == result.Data);

        Assert.NotNull(party);
        Assert.Equal("CUST-APOLLO", party.Code);
        Assert.Equal("27", party.StateCode);
        Assert.Equal(15000m, party.CurrentOutstandingBalance);
        Assert.Single(party.LedgerEntries);
        Assert.Equal(15000m, party.LedgerEntries.First().DebitAmount);
        Assert.Equal(15000m, party.LedgerEntries.First().RunningBalance);
    }

    [Fact]
    public async Task RecordPartyPayment_ForCustomer_ShouldReduceReceivableAndCreateLedger()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        var createResult = await service.CreatePartyAsync(new CreatePartyRequest(
            Code: "CUST-001",
            LegalName: "MedPlus Chemist",
            PartyType: PartyType.Customer,
            OpeningBalance: 20000m,
            OpeningBalanceType: BalanceType.Debit
        ));

        // Act: Customer pays 12,000 via UPI
        var payResult = await service.RecordPartyPaymentAsync(new RecordPartyPaymentRequest(
            PartyId: createResult.Data,
            TransactionDate: DateTime.UtcNow,
            Amount: 12000m,
            PaymentMode: "UPI",
            ReferenceNumber: "UPI-TXN-998877",
            Notes: "Received part payment"
        ));

        // Assert
        Assert.True(payResult.IsSuccess);
        var party = await context.Parties
            .Include(p => p.LedgerEntries)
            .FirstOrDefaultAsync(p => p.Id == createResult.Data);

        Assert.NotNull(party);
        Assert.Equal(8000m, party.CurrentOutstandingBalance); // 20,000 - 12,000 = 8,000
        Assert.Equal(2, party.LedgerEntries.Count);

        var latestEntry = party.LedgerEntries.OrderByDescending(e => e.CreatedAtUtc).First();
        Assert.Equal(12000m, latestEntry.CreditAmount);
        Assert.Equal(8000m, latestEntry.RunningBalance);
        Assert.Equal("UPI", latestEntry.PaymentMode);
    }

    [Fact]
    public async Task RecordPartyPayment_ForSupplier_ShouldReducePayableAndCreateLedger()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        // Supplier with Credit Opening Balance: 30,000 Payable (-30,000 balance)
        var createResult = await service.CreatePartyAsync(new CreatePartyRequest(
            Code: "SUPP-001",
            LegalName: "Cipla Distribution Hub",
            PartyType: PartyType.Supplier,
            OpeningBalance: 30000m,
            OpeningBalanceType: BalanceType.Credit
        ));

        // Act: We pay supplier 20,000 via Bank Transfer
        var payResult = await service.RecordPartyPaymentAsync(new RecordPartyPaymentRequest(
            PartyId: createResult.Data,
            TransactionDate: DateTime.UtcNow,
            Amount: 20000m,
            PaymentMode: "BankTransfer",
            ReferenceNumber: "NEFT-12345",
            Notes: "Vendor invoice clearing"
        ));

        // Assert
        Assert.True(payResult.IsSuccess);
        var party = await context.Parties
            .Include(p => p.LedgerEntries)
            .FirstOrDefaultAsync(p => p.Id == createResult.Data);

        Assert.NotNull(party);
        Assert.Equal(-10000m, party.CurrentOutstandingBalance); // -30,000 + 20,000 = -10,000
        Assert.Equal(2, party.LedgerEntries.Count);

        var latestEntry = party.LedgerEntries.OrderByDescending(e => e.CreatedAtUtc).First();
        Assert.Equal(20000m, latestEntry.DebitAmount);
        Assert.Equal(-10000m, latestEntry.RunningBalance);
    }

    [Fact]
    public async Task GetPartyStatement_ShouldCalculateRunningBalancesAndPeriodTotals()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        var fromDate = DateTime.UtcNow.AddDays(-10);
        var toDate = DateTime.UtcNow.AddDays(10);

        var createResult = await service.CreatePartyAsync(new CreatePartyRequest(
            Code: "CUST-STAT-01",
            LegalName: "Statement Test Pharmacy",
            PartyType: PartyType.Customer,
            OpeningBalance: 10000m,
            OpeningBalanceType: BalanceType.Debit,
            OpeningBalanceDate: DateTime.UtcNow.AddDays(-15)
        ));

        // Payment within statement window
        await service.RecordPartyPaymentAsync(new RecordPartyPaymentRequest(
            PartyId: createResult.Data,
            TransactionDate: DateTime.UtcNow.AddDays(-2),
            Amount: 4000m,
            PaymentMode: "Cash"
        ));

        // Act
        var statementResult = await service.GetPartyStatementAsync(createResult.Data, fromDate, toDate);

        // Assert
        Assert.True(statementResult.IsSuccess);
        var stmt = statementResult.Data!;
        Assert.Equal("CUST-STAT-01", stmt.PartyCode);
        Assert.Equal(10000m, stmt.OpeningBalance);
        Assert.Equal(4000m, stmt.TotalCredit);
        Assert.Equal(6000m, stmt.ClosingBalance);
        Assert.Single(stmt.Entries);
        Assert.Equal(6000m, stmt.Entries[0].RunningBalance);
    }

    [Fact]
    public async Task RecordPartyPaymentAsync_PerformsFifoKnockOffOnUnpaidInvoices()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        var partyRes = await service.CreatePartyAsync(new CreatePartyRequest(
            Code: "CUST-FIFO-01",
            LegalName: "FIFO Test Chemist",
            PartyType: PartyType.Customer,
            OpeningBalance: 0m
        ));

        var branch = new TenantBranch { TenantId = tenantId, BranchName = "Main", BranchCode = "MB1" };
        var warehouse = new TenantWarehouse { TenantId = tenantId, Branch = branch, WarehouseCode = "MW1", WarehouseName = "Main WH" };
        context.TenantBranches.Add(branch);
        context.TenantWarehouses.Add(warehouse);

        // Add 2 unpaid invoices: Inv1 = ₹1,000 (older), Inv2 = ₹1,000 (newer)
        var inv1 = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-001",
            BranchId = branch.Id,
            WarehouseId = warehouse.Id,
            PartyId = partyRes.Data,
            InvoiceDate = DateTime.UtcNow.AddDays(-5),
            TotalAmount = 1000m,
            PaidAmount = 0m,
            BalanceAmount = 1000m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };

        var inv2 = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-002",
            BranchId = branch.Id,
            WarehouseId = warehouse.Id,
            PartyId = partyRes.Data,
            InvoiceDate = DateTime.UtcNow.AddDays(-2),
            TotalAmount = 1000m,
            PaidAmount = 0m,
            BalanceAmount = 1000m,
            PaymentStatus = PaymentStatus.Unpaid,
            Status = InvoiceStatus.Issued
        };

        context.SalesInvoices.AddRange(inv1, inv2);

        var party = await context.Parties.FirstAsync(p => p.Id == partyRes.Data);
        party.CurrentOutstandingBalance = 2000m; // Owes ₹2,000
        await context.SaveChangesAsync();

        // Act: Party pays lump-sum ₹1,500
        var payRes = await service.RecordPartyPaymentAsync(new RecordPartyPaymentRequest(
            PartyId: partyRes.Data,
            TransactionDate: DateTime.UtcNow,
            Amount: 1500m,
            PaymentMode: "BankTransfer",
            ReferenceNumber: "NEFT-BULK-001",
            Notes: "Lump sum settlement",
            Direction: PartyPaymentDirection.CustomerReceipt
        ));

        Assert.True(payRes.IsSuccess);

        // Assert: FIFO Knock-off
        // Inv1 (older) must be fully knocked off: Paid = ₹1,000, Balance = 0, Status = FullyPaid/Paid
        var checkInv1 = await context.SalesInvoices.FirstAsync(i => i.Id == inv1.Id);
        Assert.Equal(1000m, checkInv1.PaidAmount);
        Assert.Equal(0m, checkInv1.BalanceAmount);
        Assert.Equal(PaymentStatus.FullyPaid, checkInv1.PaymentStatus);
        Assert.Equal(InvoiceStatus.Paid, checkInv1.Status);

        // Inv2 (newer) must be partially knocked off: Paid = ₹500, Balance = ₹500, Status = PartiallyPaid/Issued
        var checkInv2 = await context.SalesInvoices.FirstAsync(i => i.Id == inv2.Id);
        Assert.Equal(500m, checkInv2.PaidAmount);
        Assert.Equal(500m, checkInv2.BalanceAmount);
        Assert.Equal(PaymentStatus.PartiallyPaid, checkInv2.PaymentStatus);
        Assert.Equal(InvoiceStatus.Issued, checkInv2.Status);

        // Party balance: ₹2,000 - ₹1,500 = ₹500
        var checkParty = await context.Parties.FirstAsync(p => p.Id == partyRes.Data);
        Assert.Equal(500m, checkParty.CurrentOutstandingBalance);
    }

    [Fact]
    public async Task CreateAdvancePaymentAsync_AndAllocateToInvoice_ReconcilesInvoiceAndAdvance()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupPartyContext();
        var auditService = new MockAuditService();
        var service = new PartyService(context, tenantContext, userContext, auditService);

        var partyRes = await service.CreatePartyAsync(new CreatePartyRequest(
            Code: "CUST-ADV-001",
            LegalName: "Advance Paying Clinic",
            PartyType: PartyType.Customer
        ));
        var partyId = partyRes.Data;

        // Act 1: Record Advance Payment of ₹5,000
        var advRes = await service.CreateAdvancePaymentAsync(new CreateAdvancePaymentRequest(
            PartyId: partyId,
            Amount: 5000m,
            PaymentMode: "UPI",
            ReceiptDate: DateTime.UtcNow,
            ReferenceNumber: "UPI-ADV-12345",
            Notes: "Client advance deposit"
        ));
        Assert.True(advRes.IsSuccess);
        var advanceId = advRes.Data;

        // Customer balance should be -₹5,000 (advance / credit owed to customer)
        var party = await context.Parties.FirstAsync(p => p.Id == partyId);
        Assert.Equal(-5000m, party.CurrentOutstandingBalance);

        // Arrange Invoice of ₹3,000
        var branchId = Guid.NewGuid();
        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branchId,
            PartyId = partyId,
            InvoiceNumber = "INV-2627-00999",
            InvoiceDate = DateTime.UtcNow,
            InvoiceType = InvoiceType.TaxInvoice,
            Status = InvoiceStatus.Issued,
            PaymentStatus = PaymentStatus.Unpaid,
            TotalAmount = 3000m,
            PaidAmount = 0m,
            BalanceAmount = 3000m
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        // Act 2: Allocate ₹3,000 from the advance to the invoice
        var allocRes = await service.AllocateAdvancePaymentAsync(new AllocateAdvancePaymentRequest(
            AdvancePaymentId: advanceId,
            InvoiceId: invoice.Id,
            PurchaseBillId: null,
            AmountToAllocate: 3000m,
            Notes: "Knock off against INV-2627-00999"
        ));
        Assert.True(allocRes.IsSuccess);

        // Assert Invoice is now fully paid
        var updatedInv = await context.SalesInvoices.FirstAsync(i => i.Id == invoice.Id);
        Assert.Equal(3000m, updatedInv.PaidAmount);
        Assert.Equal(0m, updatedInv.BalanceAmount);
        Assert.Equal(PaymentStatus.FullyPaid, updatedInv.PaymentStatus);
        Assert.Equal(InvoiceStatus.Paid, updatedInv.Status);

        // Assert Advance Payment tracking
        var updatedAdv = await context.AdvancePayments.Include(a => a.Allocations).FirstAsync(a => a.Id == advanceId);
        Assert.Equal(3000m, updatedAdv.AllocatedAmount);
        Assert.Equal(2000m, updatedAdv.UnallocatedAmount);
        Assert.Single(updatedAdv.Allocations);
        Assert.Equal(3000m, updatedAdv.Allocations.First().AmountAllocated);

        // Assert Unallocated Advances query
        var unallocatedRes = await service.GetUnallocatedAdvancesAsync(partyId);
        Assert.True(unallocatedRes.IsSuccess);
        Assert.Single(unallocatedRes.Data);
        Assert.Equal(2000m, unallocatedRes.Data[0].UnallocatedAmount);
    }
}
