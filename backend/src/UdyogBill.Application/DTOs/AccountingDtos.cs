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

#region Milestone 3: Bill-by-Bill Reference Settlement, Aging & Interest

public record PendingBillDto(
    Guid AllocationId,
    string ReferenceNumber,
    string ReferenceType,
    DateTimeOffset Date,
    DateTimeOffset? DueDate,
    decimal TotalAmount,
    decimal SettledAmount,
    decimal PendingAmount,
    int OverdueDays,
    bool IsMsmeCritical
);

public record BillAgingPartySummaryDto(
    Guid PartyId,
    string PartyName,
    string? Gstin,
    string? PhoneNumber,
    decimal TotalOutstanding,
    decimal CurrentNotDue,
    decimal Overdue0To30,
    decimal Overdue31To60,
    decimal Overdue61To90,
    decimal Overdue90Plus,
    int MsmeCriticalBillsCount,
    List<PendingBillDto> Bills
);

public record BillAgingReportDto(
    DateTimeOffset AsOfDate,
    string AgingBasis,
    decimal GrandTotalOutstanding,
    decimal GrandTotalOverdue,
    List<BillAgingPartySummaryDto> Parties
);

public record InterestCalculationDto(
    Guid PartyId,
    string PartyName,
    decimal OverduePrincipal,
    int DaysOverdue,
    decimal AnnualRate,
    decimal CalculatedInterest,
    string Formula
);

public record GenerateInterestDebitNoteRequest(
    Guid PartyId,
    decimal InterestAmount,
    string Narration
);

public record PdcChequeDto(
    Guid Id,
    string ChequeNumber,
    DateTimeOffset ChequeDate,
    DateTimeOffset MaturityDate,
    Guid BankAccountId,
    string BankAccountName,
    Guid PartyLedgerId,
    string PartyLedgerName,
    decimal Amount,
    string Direction,
    string Status,
    string? DrawerBankName,
    string? PayeeName,
    string? Narration,
    Guid? RealizedVoucherId
);

public record CreatePdcChequeRequest(
    string ChequeNumber,
    DateTimeOffset ChequeDate,
    DateTimeOffset MaturityDate,
    Guid BankAccountId,
    Guid PartyLedgerId,
    decimal Amount,
    string Direction,
    string? DrawerBankName,
    string? PayeeName,
    string? Narration
);

#endregion

#region Milestone 4: Indian Statutory TDS/TCS Suite

public record TdsSectionConfigDto(
    Guid Id,
    string SectionCode,
    string Description,
    decimal ThresholdAmount,
    decimal RateIndividualHuf,
    decimal RateCompany,
    decimal RateNonPan,
    Guid? LiabilityLedgerId,
    string? LiabilityLedgerName,
    bool IsActive
);

public record TdsDeductionRecordDto(
    Guid Id,
    Guid VoucherId,
    string VoucherNumber,
    DateTimeOffset DeductionDate,
    Guid PartyId,
    string PartyName,
    string? PanNumber,
    string SectionCode,
    decimal TaxableAmount,
    decimal TdsRate,
    decimal TdsAmount,
    string? ChallanNumber,
    string? BsrCode,
    DateTimeOffset? ChallanDate,
    bool IsPaid,
    Guid? PaymentVoucherId
);

public record TdsCumulativeTrackerDto(
    Guid PartyId,
    string PartyName,
    string? PanNumber,
    decimal CumulativePurchasesThisFy,
    decimal ThresholdLimit,
    decimal ThresholdRemaining,
    bool Is194QApplicable,
    decimal PotentialTds
);

public record RecordChallanPaymentRequest(
    List<Guid> DeductionRecordIds,
    string ChallanNumber,
    string BsrCode,
    DateTimeOffset ChallanDate,
    Guid BankAccountId,
    string? ChequeOrUtrNumber
);

#endregion

#region Milestone 5: Multi-Currency & Forex Gain/Loss Engine

public record ForeignCurrencyMasterDto(
    Guid Id,
    string Code,
    string Name,
    string Symbol,
    decimal ExchangeRateToInr,
    DateTimeOffset LastUpdatedDate,
    bool IsActive
);

public record ForexRevaluationPreviewDto(
    Guid AccountId,
    string AccountName,
    string CurrencyCode,
    decimal ForeignBalance,
    decimal OldRate,
    decimal NewRate,
    decimal CurrentInrValue,
    decimal RevaluedInrValue,
    decimal UnrealizedGainLoss
);

public record RunForexRevaluationRequest(
    DateTimeOffset AsOfDate,
    List<Guid> AccountIds,
    string? Narration
);

public record CreateCurrencyRequest(
    string Code,
    string Name,
    string? Symbol,
    decimal ExchangeRateToInr
);

public record UpdateCurrencyRateRequest(
    decimal ExchangeRateToInr
);

#endregion

#region Milestone 6: Cost Centres Profitability & Breakup

public record CostCentreDetailDto(
    Guid Id,
    string Code,
    string Name,
    string? Category,
    Guid? ParentCostCentreId,
    string? ParentCostCentreName,
    decimal MonthlyBudgetCap,
    decimal TotalSpentThisMonth,
    decimal RemainingBudget,
    bool IsActive
);

public record CostCentrePnlLineDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string Category,
    decimal Amount
);

public record CostCentrePnlReportDto(
    Guid CostCentreId,
    string CostCentreName,
    string? Category,
    decimal TotalRevenue,
    decimal TotalDirectCost,
    decimal GrossMargin,
    decimal TotalOverheads,
    decimal NetMargin,
    List<CostCentrePnlLineDto> IncomeLines,
    List<CostCentrePnlLineDto> ExpenseLines
);

#endregion

#region Milestone 7: Fixed Assets & Dual Depreciation Engine

public record FixedAssetDto(
    Guid Id,
    string AssetCode,
    string AssetName,
    string BlockCategory,
    DateTimeOffset DateOfPurchase,
    DateTimeOffset DatePutToUse,
    decimal OriginalCost,
    decimal ResidualValue,
    decimal UsefulLifeYears,
    string CompaniesActMethod,
    decimal IncomeTaxRate,
    decimal CurrentBookValue,
    decimal CurrentTaxWdv,
    string Status,
    Guid? AssetLedgerId,
    string? AssetLedgerName
);

public record CreateFixedAssetRequest(
    string AssetCode,
    string AssetName,
    string BlockCategory,
    DateTimeOffset DateOfPurchase,
    DateTimeOffset DatePutToUse,
    decimal OriginalCost,
    decimal ResidualValue,
    decimal UsefulLifeYears,
    string CompaniesActMethod,
    decimal IncomeTaxRate,
    Guid? AssetLedgerId,
    Guid? AccumulatedDepreciationLedgerId,
    Guid? DepreciationExpenseLedgerId
);

public record Form3CdBlockRowDto(
    string BlockName,
    decimal DepreciationRate,
    decimal OpeningWdv,
    decimal AdditionsMoreThan180Days,
    decimal AdditionsLessThan180Days,
    decimal Deductions,
    decimal AllowableDepreciation,
    decimal ClosingWdv
);

public record Form3CdDepreciationReportDto(
    int FinancialYear,
    decimal TotalOpeningWdv,
    decimal TotalAdditionsMoreThan180Days,
    decimal TotalAdditionsLessThan180Days,
    decimal TotalDeductions,
    decimal TotalDepreciationAllowable,
    decimal TotalClosingWdv,
    List<Form3CdBlockRowDto> Blocks
);

public record RunBatchDepreciationRequest(
    int FinancialYear,
    string Method
);

public record DisposeFixedAssetRequest(
    DateTimeOffset DisposalDate,
    decimal DisposalProceeds,
    Guid BankAccountId,
    string? Narration
);

#endregion

#region Milestone 8: Bank Feeds, BRS & Cheque Management

public record BankFeedLineDto(
    Guid Id,
    Guid BankFeedStatementId,
    DateTimeOffset TransactionDate,
    string Description,
    string? ReferenceNumber,
    decimal Debit,
    decimal Credit,
    decimal Balance,
    string Status,
    Guid? MatchedVoucherId,
    string? MappingNotes
);

public record MapBankTransactionRequest(
    string ActionType,
    Guid? SettleInvoiceId,
    Guid? SettleBillId,
    Guid? TargetAccountId,
    string? Narration
);

public record BrsAdjustmentLineDto(
    string LineType,
    DateTimeOffset Date,
    string VoucherNumber,
    string Description,
    decimal Amount
);

public record StatutoryBrsReportDto(
    Guid BankAccountId,
    string BankAccountName,
    DateTimeOffset AsOfDate,
    decimal BalanceAsPerBooks,
    decimal ChequesIssuedNotPresented,
    decimal ChequesDepositedNotCredited,
    decimal OtherBankCredits,
    decimal OtherBankDebits,
    decimal BalanceAsPerBankStatement,
    List<BrsAdjustmentLineDto> Adjustments
);

public record ChequeLeafItemDto(
    Guid Id,
    long LeafNumber,
    string Status,
    string? PayeeName,
    decimal? Amount,
    DateTimeOffset? IssueDate,
    DateTimeOffset? ClearanceDate,
    Guid? JournalVoucherId
);

public record ChequeBookDto(
    Guid Id,
    Guid BankAccountId,
    string BankAccountName,
    string BookNumber,
    long StartLeafNumber,
    long EndLeafNumber,
    int TotalLeaves,
    int IssuedLeavesCount,
    List<ChequeLeafItemDto> Leaves
);

public record CreateChequeBookRequest(
    Guid BankAccountId,
    string BookNumber,
    long StartLeafNumber,
    long EndLeafNumber
);

#endregion

#region Milestone 9: Final Accounts, AS-3 Cash Flow & Financial Ratios

public record ComparativeLineDto(
    string Code,
    string Name,
    string Category,
    decimal AmountCurrent,
    decimal AmountPrevious,
    decimal VarianceAmount,
    decimal VariancePercent,
    int Level,
    List<ComparativeLineDto> Children
);

public record ComparativeFinancialStatementDto(
    string StatementType,
    string PeriodCurrent,
    string PeriodPrevious,
    decimal GrandTotalCurrent,
    decimal GrandTotalPrevious,
    decimal VarianceAmount,
    decimal VariancePercent,
    List<ComparativeLineDto> Lines
);

public record CashFlowLineDto(
    string Description,
    decimal Amount,
    string? DetailCode
);

public record CashFlowSectionDto(
    string SectionTitle,
    decimal SectionTotal,
    List<CashFlowLineDto> Items
);

public record CashFlowStatementReportDto(
    DateTimeOffset FromDate,
    DateTimeOffset ToDate,
    CashFlowSectionDto OperatingActivities,
    CashFlowSectionDto InvestingActivities,
    CashFlowSectionDto FinancingActivities,
    decimal NetCashFlow,
    decimal OpeningCashAndCashEquivalents,
    decimal ClosingCashAndCashEquivalents
);

public record FinancialRatioMetricDto(
    string MetricKey,
    string Name,
    string Category,
    decimal Value,
    string Unit,
    string Benchmark,
    string Status,
    string FormulaExplanation,
    decimal NumeratorValue,
    decimal DenominatorValue
);

public record FinancialRatiosReportDto(
    DateTimeOffset AsOfDate,
    decimal CurrentRatio,
    decimal QuickRatio,
    decimal DebtEquityRatio,
    decimal InterestCoverageRatio,
    decimal DebtorsTurnoverDsoDays,
    decimal CreditorsTurnoverDpoDays,
    decimal InventoryTurnoverDsiDays,
    decimal GrossProfitMarginPercent,
    decimal NetProfitMarginPercent,
    decimal ReturnOnCapitalEmployedPercent,
    decimal ReturnOnEquityPercent,
    List<FinancialRatioMetricDto> Metrics
);

#endregion

#region Milestone 10: MCA Audit Trail, Maker-Checker & Budgets

public record VoucherMakerCheckerDto(
    Guid Id,
    Guid JournalVoucherId,
    string VoucherNumber,
    DateTimeOffset VoucherDate,
    string VoucherType,
    decimal TotalAmount,
    string Status,
    string MakerName,
    string? CheckerName,
    string? Remarks,
    DateTimeOffset? ReviewedAtUtc
);

public record BudgetAllocationRowDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    string GroupName,
    decimal AllocatedAmount,
    decimal ActualSpent,
    decimal VarianceAmount,
    decimal VariancePercent,
    decimal MonthlyCap
);

public record CorporateBudgetDto(
    Guid Id,
    string BudgetName,
    int FiscalYear,
    string? Description,
    decimal TotalBudgetAmount,
    bool IsActive,
    List<BudgetAllocationRowDto> Allocations
);

public record CreateBudgetRequest(
    string BudgetName,
    int FiscalYear,
    string? Description,
    List<CreateBudgetAllocationItem> Allocations
);

public record CreateBudgetAllocationItem(
    Guid AccountId,
    Guid? CostCentreId,
    decimal AllocatedAmount,
    decimal MonthlyCapAmount
);

#endregion
