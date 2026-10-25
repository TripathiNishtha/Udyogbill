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
    public bool IsActive { get; set; } = true;
}
