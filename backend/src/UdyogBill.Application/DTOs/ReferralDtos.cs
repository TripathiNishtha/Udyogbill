using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record ReferralProgramConfigDto(
    bool IsEnabled,
    int RewardType,
    decimal DefaultRewardAmount,
    int PayoutScheduleDays,
    decimal MinimumPayoutThreshold,
    string TermsAndConditions,
    DateTimeOffset? UpdatedAtUtc
);

public record UpdateReferralProgramConfigRequest(
    bool IsEnabled,
    int RewardType,
    decimal DefaultRewardAmount,
    int PayoutScheduleDays,
    decimal MinimumPayoutThreshold,
    string? TermsAndConditions
);

public record TenantReferralSummaryDto(
    string ReferralCode,
    string ReferralLink,
    decimal RewardAmount,
    int TotalReferralsCount,
    int PaidConversionsCount,
    decimal TotalEarnedAmount,
    decimal TotalPaidOutAmount,
    decimal PendingBalanceAmount,
    string? UpiId,
    string? BankName,
    string? BankAccountNumber,
    string? BankIfsc,
    string? AccountHolderName,
    IReadOnlyList<TenantReferralItemDto> Referrals,
    bool HasActiveSubscription = true,
    string? IneligibilityReason = null
);

public record TenantReferralItemDto(
    Guid Id,
    string RefereeStoreName,
    string RefereeStoreCode,
    DateTimeOffset RegistrationDateUtc,
    string Status,
    DateTimeOffset? PaidDateUtc,
    decimal CommissionAmount,
    DateTimeOffset? ScheduledPayoutDateUtc,
    DateTimeOffset? PaidAtUtc,
    string? PayoutReference
);

public record UpdateReferralPayoutSettingsRequest(
    string? UpiId,
    string? BankName,
    string? BankAccountNumber,
    string? BankIfsc,
    string? AccountHolderName
);

public record SuperAdminReferralAnalyticsDto(
    int TotalReferralsRegistered,
    int TotalPaidConversions,
    decimal TotalCommissionsAccrued,
    decimal TotalCommissionsPaidOut,
    decimal PendingPayoutsAmount,
    IReadOnlyList<SuperAdminTopReferrerDto> TopReferrers,
    IReadOnlyList<SuperAdminReferralConversionDto> Conversions
);

public record SuperAdminTopReferrerDto(
    Guid TenantId,
    string StoreName,
    string StoreCode,
    string ReferralCode,
    string AdminEmail,
    string PrimaryPhone,
    string? UpiId,
    string? BankAccountNumber,
    string? BankIfsc,
    int TotalReferrals,
    int PaidConversions,
    decimal TotalEarned,
    decimal TotalPaid,
    decimal PendingBalance
);

public record SuperAdminReferralConversionDto(
    Guid Id,
    Guid ReferrerTenantId,
    string ReferrerStoreName,
    string ReferrerStoreCode,
    string? ReferrerUpi,
    string? ReferrerBank,
    Guid RefereeTenantId,
    string RefereeStoreName,
    string RefereeStoreCode,
    string ReferralCodeUsed,
    DateTimeOffset RegistrationDateUtc,
    int Status,
    string StatusName,
    DateTimeOffset? FirstPaidDateUtc,
    decimal? SubscriptionAmount,
    decimal CommissionRewardAmount,
    DateTimeOffset? ScheduledPayoutDateUtc,
    DateTimeOffset? PaidAtUtc,
    string? PayoutReference,
    string? PayoutMode
);

public record ProcessReferralPayoutRequest(
    string PayoutMode,
    string PayoutReference,
    string? AdminNotes
);
