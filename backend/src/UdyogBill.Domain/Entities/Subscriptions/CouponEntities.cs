using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Subscriptions;

public enum DiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

public enum CouponApplicableType
{
    All = 1,
    PlansOnly = 2,
    AddOnsOnly = 3
}

public class Coupon : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "WELCOME50", "FLAT500"
    public string Description { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public decimal DiscountValue { get; set; } // e.g. 20 (for 20%) or 500 (for ₹500)
    
    public decimal? MinOrderAmount { get; set; } // e.g. ₹999 min order
    public decimal? MaxDiscountAmount { get; set; } // Cap for percentage discount e.g. max ₹1,000
    public CouponApplicableType ApplicableType { get; set; } = CouponApplicableType.All;
    
    public int? MaxRedemptions { get; set; } // Platform total limit
    public int TimesRedeemed { get; set; } = 0;
    
    public DateTimeOffset? ValidFromUtc { get; set; }
    public DateTimeOffset? ValidUntilUtc { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<CouponRedemption> Redemptions { get; set; } = new List<CouponRedemption>();
}

public class CouponRedemption : BaseTenantAuditableEntity
{
    public Guid CouponId { get; set; }
    public Coupon Coupon { get; set; } = null!;
    
    public string OrderReference { get; set; } = string.Empty; // e.g. Order ID / Invoice ID
    public decimal OrderAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public DateTimeOffset RedeemedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
