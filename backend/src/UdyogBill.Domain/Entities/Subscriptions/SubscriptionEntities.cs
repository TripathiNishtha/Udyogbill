using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Subscriptions;

public class Plan : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "STARTER", "PROFESSIONAL", "ENTERPRISE"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public decimal Price { get; set; }
    public decimal SetupFee { get; set; }
    public int TrialDays { get; set; } = 14;

    // Plan Limits
    public int MaxUsers { get; set; } = 5;
    public int MaxBranches { get; set; } = 1;
    public int MaxWarehouses { get; set; } = 1;
    public int MaxInvoicesPerMonth { get; set; } = 500;
    public int MaxStorageMb { get; set; } = 1024;
    public int MaxApiCallsPerDay { get; set; } = 1000;

    public bool IsPopular { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public ICollection<PlanEntitlement> Entitlements { get; set; } = new List<PlanEntitlement>();
    public ICollection<TenantSubscription> Subscriptions { get; set; } = new List<TenantSubscription>();
}

public class PlanEntitlement : BaseEntity
{
    public Guid PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    public Guid FeatureId { get; set; }
    public Feature Feature { get; set; } = null!;

    public bool IsIncluded { get; set; } = true;
    public int? UsageLimit { get; set; } // Optional quota limit for specific feature
}

public class TenantSubscription : BaseTenantAuditableEntity
{
    public Guid PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;
    public DateTimeOffset StartsAtUtc { get; set; }
    public DateTimeOffset EndsAtUtc { get; set; }
    public DateTimeOffset? TrialEndsAtUtc { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }

    public bool AutoRenew { get; set; } = true;
    public decimal PricePaid { get; set; }
    public string CurrencyCode { get; set; } = "INR";
    public string? PaymentGatewaySubscriptionId { get; set; }

    public ICollection<TenantSubscriptionAddOn> SubscriptionAddOns { get; set; } = new List<TenantSubscriptionAddOn>();
}

public class AddOn : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "EXTRA_5_USERS", "EXTRA_10GB_STORAGE"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; } // Monthly price
    public decimal AnnualPrice { get; set; } = 0; // Yearly price
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;

    public int AdditionalUsers { get; set; }
    public int AdditionalBranches { get; set; }
    public int AdditionalWarehouses { get; set; }
    public int AdditionalInvoicesPerMonth { get; set; }
    public int AdditionalStorageMb { get; set; }

    public bool IsActive { get; set; } = true;
}

public class TenantSubscriptionAddOn : BaseTenantAuditableEntity
{
    public Guid TenantSubscriptionId { get; set; }
    public TenantSubscription TenantSubscription { get; set; } = null!;

    public Guid AddOnId { get; set; }
    public AddOn AddOn { get; set; } = null!;

    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public DateTimeOffset ExpiresAtUtc { get; set; }
}
