using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Subscriptions;

namespace UdyogBill.Application.DTOs;

public record PlatformCouponDto(
    Guid Id,
    string Code,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderAmount,
    decimal? MaxDiscountAmount,
    CouponApplicableType ApplicableType,
    int? MaxRedemptions,
    int TimesRedeemed,
    DateTimeOffset? ValidFromUtc,
    DateTimeOffset? ValidUntilUtc,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

public record CreatePlatformCouponRequest(
    string Code,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderAmount,
    decimal? MaxDiscountAmount,
    CouponApplicableType ApplicableType = CouponApplicableType.All,
    int? MaxRedemptions = null,
    DateTimeOffset? ValidFromUtc = null,
    DateTimeOffset? ValidUntilUtc = null
);

public record UpdatePlatformCouponRequest(
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderAmount,
    decimal? MaxDiscountAmount,
    CouponApplicableType ApplicableType,
    int? MaxRedemptions,
    DateTimeOffset? ValidFromUtc,
    DateTimeOffset? ValidUntilUtc,
    bool IsActive
);

public record ValidatePlatformCouponRequest(
    string Code,
    string OrderType, // "Plan" or "Addon"
    decimal OrderAmount
);

public record ValidatePlatformCouponResponse(
    bool IsValid,
    decimal DiscountAmount,
    decimal FinalAmount,
    string Message,
    string? CouponCode = null
);
