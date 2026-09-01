using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Domain.Entities.Loyalty;

public enum CouponDiscountType
{
    Percentage = 1,
    FlatAmount = 2
}

public enum LoyaltyTransactionType
{
    PointsEarned = 1,
    PointsRedeemed = 2,
    StoreCreditAdded = 3,
    StoreCreditUsed = 4,
    ReferralBonus = 5,
    ManualAdjustment = 6
}

public class LoyaltyProgramConfig : BaseTenantAuditableEntity
{
    public decimal PointsEarnSpendAmount { get; set; } = 100m; // Spend ₹100
    public decimal PointsEarnedPerUnit { get; set; } = 1m;      // Earn 1 Point
    public decimal PointRedemptionValue { get; set; } = 1m;     // 1 Point = ₹1 Discount
    public decimal MinOrderAmountToEarn { get; set; } = 100m;
    public decimal MaxRedeemPercentPerBill { get; set; } = 50m; // Max 50% of invoice can be paid by points

    public decimal SignupBonusPoints { get; set; } = 50m;
    public decimal ReferrerBonusPoints { get; set; } = 100m;
    public decimal RefereeBonusPoints { get; set; } = 50m;

    public bool IsActive { get; set; } = true;
}

public class CustomerLoyaltyAccount : BaseTenantAuditableEntity
{
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;

    public decimal AvailablePoints { get; set; } = 0m;
    public decimal TotalPointsEarned { get; set; } = 0m;
    public decimal TotalPointsRedeemed { get; set; } = 0m;

    public decimal StoreCreditBalance { get; set; } = 0m; // Cash store credits in ₹

    public string ReferralCode { get; set; } = string.Empty;
    public Guid? ReferredByPartyId { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<LoyaltyTransaction> Transactions { get; set; } = new List<LoyaltyTransaction>();
}

public class LoyaltyTransaction : BaseTenantAuditableEntity
{
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;

    public Guid? CustomerLoyaltyAccountId { get; set; }

    public LoyaltyTransactionType TransactionType { get; set; } = LoyaltyTransactionType.PointsEarned;

    public decimal PointsChange { get; set; } = 0m;       // Positive for earn, Negative for redeem
    public decimal StoreCreditChange { get; set; } = 0m;  // Positive for deposit, Negative for usage

    public decimal AvailablePointsAfter { get; set; } = 0m;
    public decimal StoreCreditBalanceAfter { get; set; } = 0m;

    public Guid? ReferenceInvoiceId { get; set; }
    public string? ReferenceInvoiceNumber { get; set; }
    public string? Description { get; set; }
}

public class PromotionalCoupon : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "DIWALI20", "FLAT100"
    public string? Description { get; set; }

    public CouponDiscountType DiscountType { get; set; } = CouponDiscountType.Percentage;
    public decimal DiscountValue { get; set; } = 10m; // 10% or ₹100

    public decimal MinimumOrderAmount { get; set; } = 0m;
    public decimal? MaximumDiscountAmount { get; set; } // Cap for percentage discount

    public DateTimeOffset ValidFromUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ValidUntilUtc { get; set; }

    public int TotalUsageLimit { get; set; } = 1000;
    public int CurrentUsageCount { get; set; } = 0;
    public int UsageLimitPerCustomer { get; set; } = 1;

    public bool IsActive { get; set; } = true;
}
