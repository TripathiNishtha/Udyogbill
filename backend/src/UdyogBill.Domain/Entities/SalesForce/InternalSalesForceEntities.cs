using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Identity;

namespace UdyogBill.Domain.Entities.SalesForce;

public enum SalesRoleTier
{
    FSE = 1, // Field Sales Executive (Target: ₹2,00,000)
    ASM = 2, // Area Sales Manager (4 FSEs + Self Direct = ₹9,00,000)
    RSM = 3, // Regional Sales Manager (4 ASMs = ₹38,00,000)
    ZSM = 4, // Zonal Sales Manager (4 RSMs = ₹1.52 Crore)
    NSM = 5, // National Sales Manager (4 ZSMs = ₹6.08 Crore)
    GM = 6   // General Manager / Super Admin (Company Leadership)
}

public enum DeviceBindingStatus
{
    PendingApproval = 1, // Initial install: waiting for Super Admin approval
    ActiveBound = 2,     // Approved & locked to specific Sales Rep
    Revoked = 3,         // Super Admin revoked device access
    Suspicious = 4       // Root/tamper or repeat unauthorized login attempts
}

public enum VisitOutcome
{
    Pitched = 1,         // Intro & presentation given
    WarmFollowup = 2,    // Interested, scheduled next demo
    HotPaymentPending = 3,// Ready to buy, quote given
    TrialActivated = 4,  // 7-day trial activated on shopkeeper's laptop
    ClosedPaid = 5,      // Payment received & subscription activated
    NotInterested = 6    // Lost / Has competitor contract
}

public enum PricingModel
{
    AnnualSubscription = 1,
    OneTimeProject = 2,
    HardwareUnit = 3,
    MonthlyAddon = 4
}

/// <summary>
/// Internal Sales Representative (Company Field Army, 6-Tier Hierarchy)
/// </summary>
public class InternalSalesRep : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string RepCode { get; set; } = string.Empty; // e.g. "UB-RAHUL04"
    public string FullName { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }
    public decimal MonthlyTarget { get; set; } = 200000m; // Customizable individual monthly target

    public SalesRoleTier RoleTier { get; set; } = SalesRoleTier.FSE;

    public Guid? ReportingToId { get; set; }
    public InternalSalesRep? ReportingTo { get; set; }

    public string City { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty; // e.g. "UP & Uttarakhand"
    public string Zone { get; set; } = string.Empty;   // e.g. "North Zone"
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public ICollection<InternalSalesRep> Subordinates { get; set; } = new List<InternalSalesRep>();
    public ICollection<HardwareDeviceRegistry> Devices { get; set; } = new List<HardwareDeviceRegistry>();
    public ICollection<SalesQuotaAllocation> QuotaAllocations { get; set; } = new List<SalesQuotaAllocation>();
    public ICollection<FieldShopVisit> Visits { get; set; } = new List<FieldShopVisit>();
}

/// <summary>
/// Hardware Device Registry (1 Mobile Device = 1 Rep, Zero-Trust IMEI / Android ID Binding)
/// </summary>
public class HardwareDeviceRegistry : BaseAuditableEntity
{
    public Guid RepId { get; set; }
    public InternalSalesRep Rep { get; set; } = null!;

    public string DeviceFingerprint { get; set; } = string.Empty; // Composite hardware signature hash
    public string? DeviceModel { get; set; }                      // e.g. "Samsung Galaxy M34 5G"
    public string? DeviceBrand { get; set; }                      // e.g. "Samsung"
    public string? OsVersion { get; set; }                        // e.g. "Android 14 (SDK 34)"
    public string? AppVersion { get; set; }

    public DeviceBindingStatus Status { get; set; } = DeviceBindingStatus.PendingApproval;

    public Guid? ApprovedByUserId { get; set; }
    public DateTimeOffset? ApprovedAtUtc { get; set; }

    public DateTimeOffset? LastLoginAtUtc { get; set; }
    public string? LastKnownIp { get; set; }
    public string? InstallationToken { get; set; } // Tamper-evident installation token

    public int FailedTamperAttempts { get; set; } = 0;
}

/// <summary>
/// Dynamic Company Product Master (Billing Software, SaaS E-Commerce, Custom Software, POS Hardware)
/// </summary>
public class CompanyProductCatalog : BaseAuditableEntity
{
    public string ProductCode { get; set; } = string.Empty; // e.g. "UDYOGBILL_ERP", "SAAS_ECOMMERCE"
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;    // "BILLING_SOFTWARE", "ECOMMERCE", "CUSTOM_PROJECT", "HARDWARE"
    public PricingModel PricingModel { get; set; } = PricingModel.AnnualSubscription;

    public decimal BasePrice { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    public decimal DefaultRepIncentivePct { get; set; } = 5.0m;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;

    public ICollection<FieldShopVisitProduct> PitchedItems { get; set; } = new List<FieldShopVisitProduct>();
}

/// <summary>
/// Monthly Quota Allocations & Multi-Product Revenue Achievements
/// </summary>
public class SalesQuotaAllocation : BaseAuditableEntity
{
    public Guid RepId { get; set; }
    public InternalSalesRep Rep { get; set; } = null!;

    public int Month { get; set; } // 1 to 12
    public int Year { get; set; }  // e.g. 2026

    public decimal IndividualTarget { get; set; } = 200000.00m;
    public decimal TeamRollupTarget { get; set; } = 0.00m;
    public decimal TotalTarget { get; set; }

    // Revenue Breakdown by Product Category
    public decimal AchievedRevenue { get; set; } = 0.00m;
    public decimal AchievedBillingRev { get; set; } = 0.00m;
    public decimal AchievedEcommerceRev { get; set; } = 0.00m;
    public decimal AchievedCustomProjectRev { get; set; } = 0.00m;

    // Subscriptions Performance
    public int NewSalesCount { get; set; } = 0;
    public int RenewalsDueCount { get; set; } = 0;
    public int RenewalsClosedCount { get; set; } = 0;

    public bool IsLocked { get; set; } = false;
}

/// <summary>
/// Field Shop Visits & Ground CRM Logs (With Anti-Fraud GPS & Camera Proof)
/// </summary>
public class FieldShopVisit : BaseAuditableEntity
{
    public Guid RepId { get; set; }
    public InternalSalesRep Rep { get; set; } = null!;

    public string ShopName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerMobile { get; set; } = string.Empty;
    public string ShopCategory { get; set; } = string.Empty; // e.g. "Pharma", "FMCG", "Garments", "Hardware"
    public string? CurrentSoftware { get; set; }            // e.g. "Marg", "Vyapar", "Busy", "Paper"
    public string Address { get; set; } = string.Empty;

    // Anti-Fraud Geo-Verification
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsMockGpsDetected { get; set; } = false;
    public bool IsVpnDetected { get; set; } = false;

    public VisitOutcome VisitOutcome { get; set; } = VisitOutcome.Pitched;
    public decimal? TotalQuotedAmount { get; set; }
    public DateTimeOffset? NextFollowupAt { get; set; }
    public string? Notes { get; set; }

    // Custom IT Project Escalation Flags
    public bool IsCustomProjectLead { get; set; } = false;
    public string? ProjectScopeSummary { get; set; }

    // Camera Watermarked Image Proof
    public string? StorefrontImageUrl { get; set; }

    public ICollection<FieldShopVisitProduct> ProductsPitched { get; set; } = new List<FieldShopVisitProduct>();
}

/// <summary>
/// Multi-Product Line Items Pitched During Shop Visit
/// </summary>
public class FieldShopVisitProduct : BaseAuditableEntity
{
    public Guid VisitId { get; set; }
    public FieldShopVisit Visit { get; set; } = null!;

    public Guid ProductId { get; set; }
    public CompanyProductCatalog Product { get; set; } = null!;

    public decimal QuotedPrice { get; set; }
    public string DealStatus { get; set; } = "PITCHED"; // "PITCHED", "DEMO_REQUESTED", "TRIAL_ACTIVE", "CLOSED_WON", "LOST"
    public string? ClientInterestLevel { get; set; }    // "HIGH", "MEDIUM", "LOW"
}

/// <summary>
/// Subscription Attribution & Dispute Resolution Audit Log (Manual Super Admin Overrides)
/// </summary>
public class SubscriptionAttributionAuditLog : BaseAuditableEntity
{
    public Guid SubscriptionId { get; set; }
    public Guid TenantId { get; set; }

    public Guid AssignedRepId { get; set; }
    public InternalSalesRep AssignedRep { get; set; } = null!;

    public Guid AssignedByUserId { get; set; } // Super Admin User ID
    public Guid? PreviousRepId { get; set; }

    public string AttributionMethod { get; set; } = "AGENT_CODE_INPUT"; // "AGENT_CODE_INPUT", "DYNAMIC_QR", "SUPERADMIN_MANUAL_OVERRIDE"
    public string? ProofDocumentNotes { get; set; }
    public decimal RevenueAmount { get; set; }
    public bool IsRenewal { get; set; } = false;
}
