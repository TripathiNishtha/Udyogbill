using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Loyalty;

namespace UdyogBill.Application.DTOs;

// --- Loyalty Config DTOs ---
public record LoyaltyProgramConfigDto(
    Guid Id,
    decimal PointsEarnSpendAmount,
    decimal PointsEarnedPerUnit,
    decimal PointRedemptionValue,
    decimal MinOrderAmountToEarn,
    decimal MaxRedeemPercentPerBill,
    decimal SignupBonusPoints,
    decimal ReferrerBonusPoints,
    decimal RefereeBonusPoints,
    bool IsActive
);

public record UpdateLoyaltyConfigRequest(
    decimal PointsEarnSpendAmount,
    decimal PointsEarnedPerUnit,
    decimal PointRedemptionValue,
    decimal MinOrderAmountToEarn,
    decimal MaxRedeemPercentPerBill,
    decimal SignupBonusPoints,
    decimal ReferrerBonusPoints,
    decimal RefereeBonusPoints,
    bool IsActive
);

// --- Customer Loyalty Account DTOs ---
public record CustomerLoyaltyAccountDto(
    Guid Id,
    Guid PartyId,
    string PartyName,
    string PartyCode,
    string? PrimaryPhone,
    decimal AvailablePoints,
    decimal TotalPointsEarned,
    decimal TotalPointsRedeemed,
    decimal StoreCreditBalance,
    string ReferralCode,
    Guid? ReferredByPartyId,
    bool IsActive,
    IReadOnlyList<LoyaltyTransactionDto> RecentTransactions
);

public record LoyaltyTransactionDto(
    Guid Id,
    LoyaltyTransactionType TransactionType,
    decimal PointsChange,
    decimal StoreCreditChange,
    decimal AvailablePointsAfter,
    decimal StoreCreditBalanceAfter,
    string? ReferenceInvoiceNumber,
    string? Description,
    DateTimeOffset CreatedAtUtc
);

public record AddStoreCreditRequest(
    decimal Amount,
    string? Notes = null
);

public record RedeemLoyaltyAtCheckoutRequest(
    decimal OrderTotalAmount,
    decimal? PointsToRedeem = null,
    decimal? StoreCreditToRedeem = null
);

public record LoyaltyCheckoutRedemptionResultDto(
    decimal PointsRedeemed,
    decimal PointsDiscountAmount,
    decimal StoreCreditRedeemed,
    decimal TotalDiscountApplied,
    decimal NetPayableAmount,
    decimal RemainingPoints,
    decimal RemainingStoreCredit
);

// --- Promotional Coupon DTOs ---
public record CreateCouponRequest(
    string Code,
    string? Description,
    CouponDiscountType DiscountType,
    decimal DiscountValue,
    decimal MinimumOrderAmount = 0,
    decimal? MaximumDiscountAmount = null,
    DateTimeOffset? ValidUntilUtc = null,
    int TotalUsageLimit = 1000,
    int UsageLimitPerCustomer = 1,
    bool IsActive = true
);

public record PromotionalCouponDto(
    Guid Id,
    string Code,
    string? Description,
    CouponDiscountType DiscountType,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    decimal? MaximumDiscountAmount,
    DateTimeOffset ValidFromUtc,
    DateTimeOffset? ValidUntilUtc,
    int TotalUsageLimit,
    int CurrentUsageCount,
    int UsageLimitPerCustomer,
    bool IsActive
);

public record ValidateCouponRequest(
    string CouponCode,
    decimal CartTotalAmount,
    Guid? PartyId = null
);

public record CouponValidationResultDto(
    bool IsValid,
    string? ErrorMessage,
    string? CouponCode,
    CouponDiscountType? DiscountType,
    decimal DiscountAmount,
    decimal FinalCartAmount
);
