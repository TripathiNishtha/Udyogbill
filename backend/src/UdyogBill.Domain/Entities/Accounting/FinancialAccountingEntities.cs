using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Accounting;

public class AccountGroup : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "Asset"; // Asset, Liability, Equity, Revenue, Expense
    public string Nature { get; set; } = "Debit";   // Debit, Credit
    public Guid? ParentGroupId { get; set; }
    public string? Description { get; set; }
}

public class LedgerAccount : BaseTenantAuditableEntity
{
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public Guid GroupId { get; set; }
    public AccountGroup? Group { get; set; }
    public string Category { get; set; } = "Asset";
    public decimal OpeningBalance { get; set; }
    public string BalanceType { get; set; } = "Debit";
    public decimal CurrentBalance { get; set; }
    public bool IsSystemAccount { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
    public bool IsBillWiseApplicable { get; set; } = false;
    public bool IsCostCentresApplicable { get; set; } = false;
    public decimal? DefaultTaxRate { get; set; }
    public string? Gstin { get; set; }
    public string? State { get; set; }
    public string? PanNumber { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfscCode { get; set; }
    public string? BankBranch { get; set; }
}

public class JournalVoucher : BaseTenantAuditableEntity
{
    public string VoucherNumber { get; set; } = string.Empty;
    public DateTimeOffset VoucherDate { get; set; }
    public string VoucherType { get; set; } = "Journal"; // Journal, Contra, Payment, Receipt, Sales, Purchase, DebitNote, CreditNote
    public string? ReferenceNumber { get; set; }
    public DateTimeOffset? ReferenceDate { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public string Narration { get; set; } = string.Empty;
    public string? CreatedByName { get; set; }
    public string? SourceDocumentType { get; set; } // SalesInvoice, PurchaseBill, PaymentReceipt, Manual
    public Guid? SourceDocumentId { get; set; }
    public bool IsCancelled { get; set; } = false;
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public string? CancelledByName { get; set; }
    public string? CancelledReason { get; set; }
    public ICollection<JournalVoucherLeg> Legs { get; set; } = new List<JournalVoucherLeg>();
}

public class JournalVoucherLeg : BaseTenantAuditableEntity
{
    public Guid JournalVoucherId { get; set; }
    public JournalVoucher JournalVoucher { get; set; } = null!;
    public Guid AccountId { get; set; }
    public LedgerAccount Account { get; set; } = null!;
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
    public string? Narration { get; set; }
    public string? BillRefType { get; set; } // NewRef, AgstRef, Advance, OnAccount
    public string? BillRefNumber { get; set; }
    public Guid? CostCentreId { get; set; }
}

public class VoucherAuditLog : BaseTenantAuditableEntity
{
    public Guid JournalVoucherId { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string ActionType { get; set; } = "Created"; // Created, Updated, Cancelled
    public string? PreviousSnapshotJson { get; set; }
    public string? NewSnapshotJson { get; set; }
    public string? PerformedByName { get; set; }
    public string? ClientIpAddress { get; set; }
}

public class AccountingPeriodLock : BaseTenantAuditableEntity
{
    public DateTimeOffset LockDate { get; set; }
    public bool IsLocked { get; set; } = true;
    public string Reason { get; set; } = string.Empty;
    public string? LockedByName { get; set; }
}

public class CostCentre : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? ParentCostCentreId { get; set; }
    public decimal MonthlyBudgetCap { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
}

public class BillReferenceAllocation : BaseTenantAuditableEntity
{
    public Guid JournalVoucherLegId { get; set; }
    public string ReferenceType { get; set; } = "NewRef"; // NewRef, AgstRef, Advance, OnAccount
    public string ReferenceNumber { get; set; } = string.Empty;
    public Guid PartyLedgerId { get; set; }
    public decimal Amount { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public decimal SettledAmount { get; set; } = 0m;
}

public class InterestPolicy : BaseTenantAuditableEntity
{
    public Guid? PartyLedgerId { get; set; }
    public decimal AnnualRatePercent { get; set; } = 18.0m;
    public int GraceDays { get; set; } = 15;
    public bool IsSimpleInterest { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class PdcCheque : BaseTenantAuditableEntity
{
    public string ChequeNumber { get; set; } = string.Empty;
    public DateTimeOffset ChequeDate { get; set; }
    public DateTimeOffset MaturityDate { get; set; }
    public Guid BankAccountId { get; set; }
    public Guid PartyLedgerId { get; set; }
    public decimal Amount { get; set; }
    public string Direction { get; set; } = "Received"; // Received, Issued
    public string Status { get; set; } = "Pending"; // Pending, Deposited, Cleared, Bounced, Cancelled
    public string? DrawerBankName { get; set; }
    public string? PayeeName { get; set; }
    public Guid? RealizedVoucherId { get; set; }
    public string? Narration { get; set; }
}

public class TdsSectionConfig : BaseTenantAuditableEntity
{
    public string SectionCode { get; set; } = string.Empty; // 194C, 194J, 194I, 194H, 194Q, 206C_1H
    public string Description { get; set; } = string.Empty;
    public decimal ThresholdAmount { get; set; }
    public decimal RateIndividualHuf { get; set; }
    public decimal RateCompany { get; set; }
    public decimal RateNonPan { get; set; } = 20.0m;
    public Guid? LiabilityLedgerId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class TdsDeductionRecord : BaseTenantAuditableEntity
{
    public Guid VoucherId { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public DateTimeOffset DeductionDate { get; set; }
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;
    public string? PanNumber { get; set; }
    public string SectionCode { get; set; } = string.Empty;
    public decimal TaxableAmount { get; set; }
    public decimal TdsRate { get; set; }
    public decimal TdsAmount { get; set; }
    public string? ChallanNumber { get; set; }
    public string? BsrCode { get; set; }
    public DateTimeOffset? ChallanDate { get; set; }
    public bool IsPaid { get; set; } = false;
    public Guid? PaymentVoucherId { get; set; }
}

public class ForeignCurrencyMaster : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // USD, EUR, GBP, AED
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty; // $, €, £
    public decimal ExchangeRateToInr { get; set; } = 1.0m;
    public DateTimeOffset LastUpdatedDate { get; set; } = DateTimeOffset.UtcNow;
    public bool IsActive { get; set; } = true;
}

public class ForexRevaluationLog : BaseTenantAuditableEntity
{
    public DateTimeOffset RevaluationDate { get; set; }
    public Guid AccountId { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal ForeignBalance { get; set; }
    public decimal OldRate { get; set; }
    public decimal NewRate { get; set; }
    public decimal UnrealizedGainLoss { get; set; }
    public Guid? JournalVoucherId { get; set; }
}

public class VoucherLegCostAllocation : BaseTenantAuditableEntity
{
    public Guid JournalVoucherLegId { get; set; }
    public Guid CostCentreId { get; set; }
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
}

public class FixedAsset : BaseTenantAuditableEntity
{
    public string AssetCode { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string BlockCategory { get; set; } = "PlantAndMachinery"; // PlantAndMachinery, Computers, FurnitureFixtures, Buildings, Vehicles
    public DateTimeOffset DateOfPurchase { get; set; }
    public DateTimeOffset DatePutToUse { get; set; }
    public decimal OriginalCost { get; set; }
    public decimal ResidualValue { get; set; }
    public decimal UsefulLifeYears { get; set; } = 5.0m;
    public string CompaniesActMethod { get; set; } = "WDV"; // WDV, SLM
    public decimal IncomeTaxRate { get; set; } = 15.0m; // 15%, 40%, 10%
    public Guid? AssetLedgerId { get; set; }
    public Guid? AccumulatedDepreciationLedgerId { get; set; }
    public Guid? DepreciationExpenseLedgerId { get; set; }
    public string Status { get; set; } = "Active"; // Active, Disposed, Scrapped
    public DateTimeOffset? DisposalDate { get; set; }
    public decimal? DisposalProceeds { get; set; }
    public decimal? ProfitLossOnDisposal { get; set; }
}

public class AssetDepreciationSchedule : BaseTenantAuditableEntity
{
    public Guid FixedAssetId { get; set; }
    public int FinancialYear { get; set; }
    public decimal OpeningWdv { get; set; }
    public int DaysUsedInYear { get; set; }
    public decimal CompaniesActDepreciation { get; set; }
    public decimal IncomeTaxDepreciation { get; set; }
    public decimal ClosingWdv { get; set; }
    public Guid? JournalVoucherId { get; set; }
    public bool IsPosted { get; set; } = false;
}

public class BankFeedStatement : BaseTenantAuditableEntity
{
    public Guid BankAccountId { get; set; }
    public string StatementFileName { get; set; } = string.Empty;
    public DateTimeOffset UploadedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public int TotalTransactions { get; set; }
}

public class BankFeedLine : BaseTenantAuditableEntity
{
    public Guid BankFeedStatementId { get; set; }
    public DateTimeOffset TransactionDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string Status { get; set; } = "Unmapped"; // Unmapped, Matched, ManuallyMapped, Ignored
    public Guid? MatchedVoucherId { get; set; }
    public string? MappingNotes { get; set; }
}

public class BankAutoRule : BaseTenantAuditableEntity
{
    public string RuleName { get; set; } = string.Empty;
    public string MatchField { get; set; } = "Description"; // Description, ReferenceNumber
    public string MatchPattern { get; set; } = string.Empty;
    public Guid TargetAccountId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ChequeBook : BaseTenantAuditableEntity
{
    public Guid BankAccountId { get; set; }
    public string BookNumber { get; set; } = string.Empty;
    public long StartLeafNumber { get; set; }
    public long EndLeafNumber { get; set; }
    public int TotalLeaves { get; set; }
    public int IssuedLeavesCount { get; set; } = 0;
}

public class ChequeLeafItem : BaseTenantAuditableEntity
{
    public Guid ChequeBookId { get; set; }
    public long LeafNumber { get; set; }
    public string Status { get; set; } = "Available"; // Available, Issued, Cleared, Cancelled, Stale
    public string? PayeeName { get; set; }
    public decimal? Amount { get; set; }
    public DateTimeOffset? IssueDate { get; set; }
    public DateTimeOffset? ClearanceDate { get; set; }
    public Guid? JournalVoucherId { get; set; }
}

public class AccountingBudget : BaseTenantAuditableEntity
{
    public string BudgetName { get; set; } = string.Empty;
    public int FiscalYear { get; set; }
    public string? Description { get; set; }
    public decimal TotalBudgetAmount { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AccountingBudgetAllocation : BaseTenantAuditableEntity
{
    public Guid AccountingBudgetId { get; set; }
    public Guid AccountId { get; set; }
    public Guid? CostCentreId { get; set; }
    public decimal AllocatedAmount { get; set; }
    public decimal MonthlyCapAmount { get; set; }
}

public class VoucherMakerChecker : BaseTenantAuditableEntity
{
    public Guid JournalVoucherId { get; set; }
    public string Status { get; set; } = "PendingApproval"; // Draft, PendingApproval, Approved, Rejected
    public string MakerName { get; set; } = string.Empty;
    public string? CheckerName { get; set; }
    public string? Remarks { get; set; }
    public DateTimeOffset? ReviewedAtUtc { get; set; }
}
