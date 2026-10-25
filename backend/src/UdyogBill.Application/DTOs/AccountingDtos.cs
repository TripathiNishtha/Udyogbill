namespace UdyogBill.Application.DTOs;

#region Groups & COA Hierarchy

public record AccountGroupDto(
    Guid Id,
    string Code,
    string Name,
    string Category,
    string Nature,
    Guid? ParentGroupId,
    string? Description
);

public class AccountGroupTreeNodeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Nature { get; set; } = string.Empty;
    public Guid? ParentGroupId { get; set; }
    public string? Description { get; set; }
    public int LedgerCount { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public decimal NetBalance { get; set; }
    public string BalanceType { get; set; } = "Debit";
    public List<AccountGroupTreeNodeDto> SubGroups { get; set; } = new();
    public List<LedgerAccountDto> Ledgers { get; set; } = new();
}

#endregion

#region Ledger Accounts

public record LedgerAccountDto(
    Guid Id,
    string AccountCode,
    string AccountName,
    Guid GroupId,
    string GroupName,
    string Category,
    decimal OpeningBalance,
    string BalanceType,
    decimal CurrentBalance,
    bool IsSystemAccount,
    bool IsActive,
    string? Description = null,
    bool IsBillWiseApplicable = false,
    bool IsCostCentresApplicable = false,
    decimal? DefaultTaxRate = null,
    string? Gstin = null,
    string? State = null,
    string? PanNumber = null,
    string? BankName = null,
    string? BankAccountNumber = null,
    string? BankIfscCode = null,
    string? BankBranch = null
);

public record CreateLedgerAccountRequest(
    string AccountCode,
    string AccountName,
    Guid GroupId,
    string? Category,
    decimal OpeningBalance,
    string BalanceType,
    string? Description = null,
    bool IsBillWiseApplicable = false,
    bool IsCostCentresApplicable = false,
    decimal? DefaultTaxRate = null,
    string? Gstin = null,
    string? State = null,
    string? PanNumber = null,
    string? BankName = null,
    string? BankAccountNumber = null,
    string? BankIfscCode = null,
    string? BankBranch = null
);

public record UpdateLedgerAccountRequest(
    string AccountCode,
    string AccountName,
    Guid GroupId,
    string? Category,
    decimal OpeningBalance,
    string BalanceType,
    bool IsActive,
    string? Description = null,
    bool IsBillWiseApplicable = false,
    bool IsCostCentresApplicable = false,
    decimal? DefaultTaxRate = null,
    string? Gstin = null,
    string? State = null,
    string? PanNumber = null,
    string? BankName = null,
    string? BankAccountNumber = null,
    string? BankIfscCode = null,
    string? BankBranch = null
);

#endregion

#region Vouchers & Multi-Leg Double Entry

public record JournalVoucherLegDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal DebitAmount,
    decimal CreditAmount,
    string? Narration,
    string? BillRefType = null,
    string? BillRefNumber = null,
    Guid? CostCentreId = null
);

public record JournalVoucherDto(
    Guid Id,
    string VoucherNumber,
    DateTimeOffset VoucherDate,
    string VoucherType,
    string? ReferenceNumber,
    decimal TotalDebit,
    decimal TotalCredit,
    string Narration,
    string? CreatedByName,
    DateTimeOffset CreatedAt,
    List<JournalVoucherLegDto> Legs,
    DateTimeOffset? ReferenceDate = null,
    string? SourceDocumentType = null,
    Guid? SourceDocumentId = null,
    bool IsCancelled = false,
    DateTimeOffset? CancelledAtUtc = null,
    string? CancelledByName = null,
    string? CancelledReason = null
);

public record CreateJournalVoucherRequest(
    string VoucherType,
    DateTimeOffset? VoucherDate,
    string? ReferenceNumber,
    string Narration,
    List<JournalVoucherLegDto> Legs,
    DateTimeOffset? ReferenceDate = null,
    string? SourceDocumentType = null,
    Guid? SourceDocumentId = null
);

public record UpdateJournalVoucherRequest(
    string VoucherType,
    DateTimeOffset? VoucherDate,
    string? ReferenceNumber,
    DateTimeOffset? ReferenceDate,
    string Narration,
    List<JournalVoucherLegDto> Legs
);

public record CancelVoucherRequest(
    string Reason
);

#endregion

#region Audit Log & Period Lock

public record VoucherAuditLogDto(
    Guid Id,
    Guid JournalVoucherId,
    string VoucherNumber,
    string ActionType,
    string? PreviousSnapshotJson,
    string? NewSnapshotJson,
    string? PerformedByName,
    string? ClientIpAddress,
    DateTimeOffset CreatedAtUtc
);

public record PeriodLockDto(
    DateTimeOffset LockDate,
    bool IsLocked,
    string Reason,
    string? LockedByName,
    DateTimeOffset? UpdatedAtUtc
);

public record SetPeriodLockRequest(
    DateTimeOffset LockDate,
    bool IsLocked,
    string Reason
);

#endregion

#region Ledger Statements & Monthly Summary

public record LedgerStatementLineDto(
    Guid VoucherId,
    string VoucherNumber,
    DateTimeOffset VoucherDate,
    string VoucherType,
    string? ReferenceNumber,
    string? Narration,
    decimal DebitAmount,
    decimal CreditAmount,
    decimal RunningBalance,
    string RunningBalanceType,
    bool IsCancelled = false,
    string? SourceDocumentType = null,
    Guid? SourceDocumentId = null
);

public record LedgerStatementReportDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string GroupName,
    string Category,
    decimal OpeningBalance,
    string BalanceType,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    string ClosingBalanceType,
    List<LedgerStatementLineDto> Lines
);

public record MonthlySummaryRowDto(
    int MonthIndex,
    string MonthName,
    int Year,
    decimal DebitAmount,
    decimal CreditAmount,
    decimal NetMovement,
    decimal ClosingBalance,
    string ClosingBalanceType,
    int VoucherCount
);

public record LedgerMonthlySummaryDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string GroupName,
    string Category,
    decimal OpeningBalance,
    string BalanceType,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    string ClosingBalanceType,
    List<MonthlySummaryRowDto> Months
);

#endregion

#region Group Summary & Trial Balance

public record GroupSummaryItemDto(
    Guid Id,
    string Code,
    string Name,
    string ItemType, // "Group" or "Ledger"
    int ChildCount,
    decimal OpeningDebit,
    decimal OpeningCredit,
    decimal DebitMovement,
    decimal CreditMovement,
    decimal ClosingDebit,
    decimal ClosingCredit
);

public record GroupSummaryReportDto(
    Guid GroupId,
    string GroupCode,
    string GroupName,
    string Category,
    string Nature,
    decimal TotalDebitMovement,
    decimal TotalCreditMovement,
    decimal NetClosingBalance,
    string ClosingBalanceType,
    List<GroupSummaryItemDto> Items
);

public record TrialBalanceRowDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string GroupName,
    string Category,
    decimal OpeningDebit,
    decimal OpeningCredit,
    decimal DebitMovement,
    decimal CreditMovement,
    decimal ClosingDebit,
    decimal ClosingCredit
);

#endregion

#region Day Book & Cash/Bank Book

public record DayBookItemDto(
    Guid VoucherId,
    string VoucherNumber,
    DateTimeOffset VoucherDate,
    string VoucherType,
    string? ReferenceNumber,
    string Narration,
    string Particulars,
    decimal DebitAmount,
    decimal CreditAmount,
    string? CreatedByName,
    bool IsCancelled
);

public record DayBookReportDto(
    DateTimeOffset FromDate,
    DateTimeOffset ToDate,
    int TotalVouchers,
    decimal TotalDebit,
    decimal TotalCredit,
    List<DayBookItemDto> Vouchers
);

public record CashBankBookItemDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string AccountType, // "Cash" or "Bank"
    decimal OpeningBalance,
    string OpeningBalanceType,
    decimal TotalReceipts,
    decimal TotalPayments,
    decimal ClosingBalance,
    string ClosingBalanceType
);

public record CashBankBookReportDto(
    DateTimeOffset FromDate,
    DateTimeOffset ToDate,
    decimal TotalCashBalance,
    decimal TotalBankBalance,
    decimal GrandTotal,
    List<CashBankBookItemDto> Accounts
);

#endregion

#region Balance Sheet & Profit and Loss (Schedule III)

public record BalanceSheetLedgerLineDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal Amount,
    string BalanceType
);

public class FinancialBalanceSheetSectionDto
{
    public Guid GroupId { get; set; }
    public string GroupCode { get; set; } = string.Empty;
    public string GroupName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public List<FinancialBalanceSheetSectionDto> SubGroups { get; set; } = new();
    public List<BalanceSheetLedgerLineDto> Ledgers { get; set; } = new();
}

public record FinancialBalanceSheetReportDto(
    DateTimeOffset AsOfDate,
    string AccountingBasis,
    List<FinancialBalanceSheetSectionDto> Liabilities,
    List<FinancialBalanceSheetSectionDto> Assets,
    decimal TotalLiabilities,
    decimal TotalAssets,
    decimal NetProfitOrLoss,
    decimal DifferenceInOpeningBalances,
    bool IsBalanced
);

public record ProfitAndLossItemDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal Amount
);

public record ProfitAndLossGroupDto(
    string GroupName,
    decimal TotalAmount,
    List<ProfitAndLossItemDto> Items
);

public record FinancialProfitAndLossReportDto(
    DateTimeOffset FromDate,
    DateTimeOffset ToDate,
    string AccountingBasis,
    decimal SalesRevenue,
    decimal OpeningStock,
    decimal DirectPurchases,
    decimal DirectExpenses,
    decimal ClosingStock,
    decimal GrossProfit,
    decimal GrossLoss,
    decimal IndirectIncomes,
    decimal IndirectExpenses,
    decimal NetProfit,
    decimal NetLoss,
    List<ProfitAndLossGroupDto> DirectExpenseGroups,
    List<ProfitAndLossGroupDto> IndirectIncomeGroups,
    List<ProfitAndLossGroupDto> IndirectExpenseGroups
);

#endregion

#region Cost Centres & Migrated Sync

public record CostCentreDto(
    Guid Id,
    string Code,
    string Name,
    string? Category,
    Guid? ParentCostCentreId,
    bool IsActive
);

public record CreateCostCentreRequest(
    string Code,
    string Name,
    string? Category,
    Guid? ParentCostCentreId
);

public record MigratedBillsSyncPreviewDto(
    int UnpostedSalesCount,
    decimal UnpostedSalesAmount,
    int UnpostedPurchasesCount,
    decimal UnpostedPurchasesAmount,
    int AlreadySyncedCount
);

public record SyncMigratedBillsRequest(
    bool SyncSales = true,
    bool SyncPurchases = true,
    DateTimeOffset? FromDate = null,
    DateTimeOffset? ToDate = null
);

public record SyncMigratedBillsResultDto(
    int SyncedSalesCount,
    decimal SyncedSalesAmount,
    int SyncedPurchasesCount,
    decimal SyncedPurchasesAmount,
    int SyncedPaymentsCount,
    decimal SyncedPaymentsAmount,
    string Message
);

#endregion
