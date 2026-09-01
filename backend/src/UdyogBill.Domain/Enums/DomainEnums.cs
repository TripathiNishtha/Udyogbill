namespace UdyogBill.Domain.Enums;

public enum TenantStatus
{
    PendingVerification = 0,
    Active = 1,
    Trial = 2,
    Suspended = 3,
    Expired = 4,
    Archived = 5
}

public enum SubscriptionStatus
{
    Pending = 0,
    Trial = 1,
    Active = 2,
    GracePeriod = 3,
    Suspended = 4,
    Cancelled = 5,
    Expired = 6
}

public enum BillingCycle
{
    Monthly = 1,
    Quarterly = 3,
    SemiAnnually = 6,
    Annually = 12,
    Lifetime = 99
}

public enum AuditActionType
{
    Create = 1,
    Update = 2,
    Delete = 3,
    Login = 4,
    Logout = 5,
    FailedLogin = 6,
    PasswordChange = 7,
    RoleAssignment = 8,
    PlanUpgrade = 9,
    TenantSuspension = 10,
    SecurityAlert = 11
}

public enum FeatureType
{
    Standard = 1,
    IndustrySpecific = 2,
    PremiumAddOn = 3,
    Integration = 4
}
