using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Banking;

public class BankingAndExpenseTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupContext()
    {
        var tenantId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-TEST-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "accounts@testcorp.com"
        };

        var context = new AppDbContext(options, tenantContext);

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateBankAccount_ShouldStoreAndTrackBalance()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BankingAndExpenseService(context, tenantContext, userContext, auditService);

        var request = new CreateBankAccountRequest(
            AccountName: "HDFC Primary Current A/c",
            BankName: "HDFC Bank",
            AccountNumber: "50200012345678",
            IfscCode: "HDFC0000123",
            BranchName: "Nariman Point",
            UpiId: "testcorp@hdfcbank",
            AccountType: BankAccountType.CurrentAccount,
            OpeningBalance: 50000m,
            IsDefault: true
        );

        // Act
        var result = await service.CreateBankAccountAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var account = await context.BankAccounts.FirstAsync(b => b.Id == result.Data);
        Assert.Equal("HDFC Primary Current A/c", account.AccountName);
        Assert.Equal(50000m, account.CurrentBalance);
        Assert.True(account.IsDefault);
    }

    [Fact]
    public async Task RecordCustomerReceipt_ShouldDeductPartyBalanceAndCreditLedger()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BankingAndExpenseService(context, tenantContext, userContext, auditService);

        var bankAccount = new BankAccount
        {
            TenantId = tenantId,
            AccountName = "ICICI Current A/c",
            CurrentBalance = 10000m,
            IsActive = true
        };
        context.BankAccounts.Add(bankAccount);

        var customer = new Party
        {
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "Apex Retailers Pvt Ltd",
            PartyType = PartyType.Customer,
            CurrentOutstandingBalance = 25000m // Customer owes 25,000
        };
        context.Parties.Add(customer);
        await context.SaveChangesAsync();

        var request = new RecordPaymentReceiptRequest(
            PartyId: customer.Id,
            PaymentDate: DateTime.UtcNow.Date,
            Amount: 15000m,
            PaymentMode: PaymentMode.BankTransfer,
            BankAccountId: bankAccount.Id,
            ReferenceNumber: "UTR99887766",
            Notes: "Part settlement against invoice"
        );

        // Act
        var result = await service.RecordCustomerReceiptAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(10000m, result.Data!.PartyBalanceAfter); // 25,000 - 15,000 = 10,000

        // Check Party Balance
        var updatedParty = await context.Parties.FirstAsync(p => p.Id == customer.Id);
        Assert.Equal(10000m, updatedParty.CurrentOutstandingBalance);

        // Check Bank Account Balance
        var updatedBank = await context.BankAccounts.FirstAsync(b => b.Id == bankAccount.Id);
        Assert.Equal(25000m, updatedBank.CurrentBalance); // 10,000 + 15,000

        // Check Ledger Entry
        var ledger = await context.PartyLedgerEntries.FirstAsync(l => l.PartyId == customer.Id);
        Assert.Equal(15000m, ledger.CreditAmount);
        Assert.Equal(0m, ledger.DebitAmount);
    }

    [Fact]
    public async Task CreateExpenseVoucher_ShouldDeductBankBalanceAndCreateAuditLog()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BankingAndExpenseService(context, tenantContext, userContext, auditService);

        var bankAccount = new BankAccount
        {
            TenantId = tenantId,
            AccountName = "HDFC Current A/c",
            CurrentBalance = 80000m,
            IsActive = true
        };
        context.BankAccounts.Add(bankAccount);

        var category = new ExpenseCategory
        {
            TenantId = tenantId,
            Code = "RENT",
            Name = "Office Rent",
            IsActive = true
        };
        context.ExpenseCategories.Add(category);
        await context.SaveChangesAsync();

        var request = new CreateExpenseVoucherRequest(
            ExpenseDate: DateTime.UtcNow.Date,
            CategoryId: category.Id,
            PaidTo: "DLF Commercial Properties",
            Amount: 30000m,
            TaxAmount: 5400m, // 18% GST
            PaymentMode: PaymentMode.BankTransfer,
            BankAccountId: bankAccount.Id,
            ReferenceNumber: "CHQ-009182",
            HasGstInvoice: true,
            VendorGstin: "07AAACD1234F1Z8",
            Notes: "Monthly office premises lease"
        );

        // Act
        var result = await service.CreateExpenseVoucherAsync(request);

        // Assert
        Assert.True(result.IsSuccess);

        var voucher = await context.ExpenseVouchers.FirstAsync(e => e.Id == result.Data);
        Assert.Equal(35400m, voucher.TotalAmount); // 30,000 + 5,400

        var updatedBank = await context.BankAccounts.FirstAsync(b => b.Id == bankAccount.Id);
        Assert.Equal(44600m, updatedBank.CurrentBalance); // 80,000 - 35,400 = 44,600
    }

    [Fact]
    public async Task CashDrawer_OpenAndClose_ShouldCalculateDifference()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BankingAndExpenseService(context, tenantContext, userContext, auditService);

        // 1. Open Drawer Session with float 2,000
        var openResult = await service.OpenCashDrawerSessionAsync(new OpenCashDrawerRequest(2000m, "Morning shift"));
        Assert.True(openResult.IsSuccess);
        Assert.Equal(CashDrawerStatus.Open, openResult.Data!.Status);

        // 2. Simulate cash sales during shift
        var session = await context.CashDrawerSessions.FirstAsync(s => s.Id == openResult.Data.Id);
        session.CashSalesTotal = 8500m;
        session.CashReceiptsTotal = 1500m;
        session.CashPayoutsTotal = 500m;
        await context.SaveChangesAsync();

        // Expected = 2,000 + 8,500 + 1,500 - 500 = 11,500
        // Physical count: 11,400 (Discrepancy of -100)
        var closeResult = await service.CloseCashDrawerSessionAsync(new CloseCashDrawerRequest(11400m, "Minor shortage on change"));

        // Assert
        Assert.True(closeResult.IsSuccess);
        Assert.Equal(11500m, closeResult.Data!.ExpectedClosingCash);
        Assert.Equal(11400m, closeResult.Data.ActualClosingCash);
        Assert.Equal(-100m, closeResult.Data.DifferenceAmount);
        Assert.Equal(CashDrawerStatus.Discrepancy, closeResult.Data.Status);
    }
}
