using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Tenants;
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
}
