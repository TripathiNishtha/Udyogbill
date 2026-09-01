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
}

public class JournalVoucher : BaseTenantAuditableEntity
{
    public string VoucherNumber { get; set; } = string.Empty;
    public DateTimeOffset VoucherDate { get; set; }
    public string VoucherType { get; set; } = "Journal"; // Journal, Contra, Payment, Receipt, DebitNote, CreditNote
    public string? ReferenceNumber { get; set; }
    public decimal TotalDebit { get; set; }
    public decimal TotalCredit { get; set; }
    public string Narration { get; set; } = string.Empty;
    public string? CreatedByName { get; set; }
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
}