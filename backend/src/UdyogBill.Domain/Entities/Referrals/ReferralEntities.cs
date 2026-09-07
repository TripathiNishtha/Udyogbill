using System;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Referrals;

public enum ReferralRewardType
{
    FixedAmount = 1,
    Percentage = 2
}

public enum ReferralConversionStatus
{
    Registered = 1,
    ConvertedPaid = 2,
    PayoutDue = 3,
    Paid = 4,
    Rejected = 5
}

public class ReferralProgramConfig : BaseAuditableEntity
{
    public bool IsEnabled { get; set; } = true;
    public ReferralRewardType RewardType { get; set; } = ReferralRewardType.FixedAmount;
    public decimal DefaultRewardAmount { get; set; } = 500m;
    public int PayoutScheduleDays { get; set; } = 1;
    public decimal MinimumPayoutThreshold { get; set; } = 500m;
    public string TermsAndConditions { get; set; } = "Referral commission is credited and scheduled for next-day payout upon paid subscription purchase.";
}

public class TenantReferralProfile : BaseAuditableEntity
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public string ReferralCode { get; set; } = string.Empty;
    public decimal? CustomRewardAmount { get; set; }
    public string? UpiId { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? AccountHolderName { get; set; }
    public int TotalReferralsCount { get; set; } = 0;
    public int PaidConversionsCount { get; set; } = 0;
    public decimal TotalEarnedAmount { get; set; } = 0m;
    public decimal TotalPaidOutAmount { get; set; } = 0m;
    public decimal PendingBalanceAmount { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
}

public class TenantReferralConversion : BaseAuditableEntity
{
    public Guid ReferrerTenantId { get; set; }
    public Tenant? ReferrerTenant { get; set; }
    public Guid RefereeTenantId { get; set; }
    public Tenant? RefereeTenant { get; set; }
    public string ReferralCodeUsed { get; set; } = string.Empty;
    public DateTimeOffset RegistrationDateUtc { get; set; } = DateTimeOffset.UtcNow;
    public ReferralConversionStatus Status { get; set; } = ReferralConversionStatus.Registered;
    public DateTimeOffset? FirstPaidDateUtc { get; set; }
    public Guid? SubscriptionInvoiceId { get; set; }
    public decimal? SubscriptionAmount { get; set; }
    public decimal CommissionRewardAmount { get; set; } = 0m;
    public DateTimeOffset? ScheduledPayoutDateUtc { get; set; }
    public DateTimeOffset? PaidAtUtc { get; set; }
    public string? PayoutReference { get; set; }
    public string? PayoutMode { get; set; }
    public string? AdminNotes { get; set; }
}
