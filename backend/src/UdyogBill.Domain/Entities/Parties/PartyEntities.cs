using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Parties;

public enum PartyType
{
    Customer = 1,
    Supplier = 2,
    Both = 3
}

public enum CustomerType
{
    B2B = 1,
    B2C = 2,
    Retail = 3,
    Wholesale = 4,
    Government = 5,
    Exporter = 6,
    SEZ = 7,
    D2C = 8
}

public enum SupplierType
{
    Manufacturer = 1,
    Distributor = 2,
    Importer = 3,
    LocalVendor = 4
}

public enum BalanceType
{
    Debit = 1,  // Receivable (Asset)
    Credit = 2  // Payable (Liability)
}

public enum PartyLedgerEntryType
{
    OpeningBalance = 1,
    SalesInvoice = 2,
    PurchaseInvoice = 3,
    PaymentReceipt = 4,
    VendorPayment = 5,
    CreditNote = 6,
    DebitNote = 7,
    JournalAdjustment = 8
}

public enum AddressType
{
    Billing = 1,
    Shipping = 2,
    Branch = 3
}

public class Party : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "CUST-1001", "SUPP-2001"
    public string LegalName { get; set; } = string.Empty;
    public string? TradeName { get; set; }
    public string? ContactPersonName { get; set; }

    public PartyType PartyType { get; set; } = PartyType.Customer;
    public CustomerType? CustomerType { get; set; } = Parties.CustomerType.B2B;
    public SupplierType? SupplierType { get; set; }

    // Contact Information
    public string? Email { get; set; }
    public string? PrimaryPhone { get; set; }
    public string? Mobile { get; set; }
    public string? SecondaryPhone { get; set; }
    public string? Website { get; set; }

    // Indian Statutory & Tax Compliance
    public string? GSTIN { get; set; } // 15-character GST number (e.g. 27AABCA1234A1Z5)
    public string? StateCode { get; set; } // 2-digit State code (e.g. "27" for Maharashtra)
    public string? PAN { get; set; } // 10-character PAN
    public string? TAN { get; set; }
    public bool IsCompositionScheme { get; set; } = false;

    // Industry Compliance Licenses (Pharma, Food, etc.)
    public string? DrugLicenseNumber1 { get; set; } // Form 20B/21B
    public string? DrugLicenseNumber2 { get; set; }
    public string? FSSAINumber { get; set; } // Food safety license

    // Credit Controls & Payment Terms
    public decimal CreditLimit { get; set; } = 0m; // 0 = No credit limit or unlimited
    public int CreditPeriodDays { get; set; } = 0; // e.g. 0, 15, 30, 45, 60 days
    public bool IsCreditBlocked { get; set; } = false;
    public string? PriceTier { get; set; } // e.g. "Retail", "Wholesale", "Distributor"

    // Opening Balance & Current Cached Position
    public decimal OpeningBalance { get; set; } = 0m;
    public BalanceType OpeningBalanceType { get; set; } = BalanceType.Debit;
    public DateTime? OpeningBalanceDate { get; set; }

    // Cached Current Outstanding Balance (Positive = Debit/Receivable, Negative = Credit/Payable)
    public decimal CurrentOutstandingBalance { get; set; } = 0m;

    // Distribution Route & Wholesale Broker
    public string? RouteName { get; set; } // FMCG Beat / Delivery Route
    public string? BrokerName { get; set; } // Wholesale Broker / Agent

    // Dynamic Industry JSONB Attributes (e.g. Route/Beat, Broker %, Doctor Registration)
    public string AttributesJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    // Relations
    public ICollection<PartyAddress> Addresses { get; set; } = new List<PartyAddress>();
    public ICollection<PartyLedgerEntry> LedgerEntries { get; set; } = new List<PartyLedgerEntry>();
}

public class PartyAddress : BaseTenantAuditableEntity
{
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;

    public AddressType AddressType { get; set; } = AddressType.Billing;
    public string? Label { get; set; } // e.g. "Head Office", "Warehouse 2", "Branch Clinic"
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string StateCode { get; set; } = string.Empty; // 2-digit Indian GST State code
    public string Pincode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public bool IsDefault { get; set; } = true;
}

public class PartyLedgerEntry : BaseTenantAuditableEntity
{
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;

    public DateTime TransactionDate { get; set; }
    public PartyLedgerEntryType EntryType { get; set; }

    public decimal DebitAmount { get; set; } = 0m; // Increase in receivable / reduction in payable
    public decimal CreditAmount { get; set; } = 0m; // Increase in payable / reduction in receivable
    public decimal RunningBalance { get; set; } = 0m; // Net position after this transaction (+ = Debit, - = Credit)

    public string? ReferenceDocumentType { get; set; } // e.g. "SalesInvoice", "PurchaseInvoice", "PaymentReceipt", "VendorPayment", "OpeningBalance"
    public Guid? ReferenceDocumentId { get; set; }
    public string? ReferenceDocumentNumber { get; set; }

    public string? PaymentMode { get; set; } // "Cash", "BankTransfer", "Cheque", "UPI", "CreditCard"
    public string? Description { get; set; }
}
