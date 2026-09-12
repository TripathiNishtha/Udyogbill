using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

// --- Auth DTOs ---
public record LoginRequest(string Email, string Password);

public record AuthUserDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsSuperAdmin,
    bool IsTenantAdmin,
    Guid? TenantId,
    string? TenantCode,
    string? BusinessName,
    string? IndustryCode,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions,
    string? LogoUrl = null
);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt,
    AuthUserDto User
);

public record RefreshTokenRequest(string AccessToken, string RefreshToken);

public record RegisterTenantRequest(
    string BusinessName,
    string TradeName,
    string AdminFullName,
    string AdminEmail,
    string AdminPassword,
    string PrimaryPhone,
    Guid IndustryId,
    string? GSTIN = null,
    string? DrugLicenseNumber = null,
    string? FSSAINumber = null,
    string? ReferralCode = null
);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

// --- Tenant DTOs ---
public record TenantDto(
    Guid Id,
    string Code,
    string BusinessName,
    string TradeName,
    Guid IndustryId,
    string IndustryName,
    string IndustryCode,
    TenantStatus Status,
    string AdminEmail,
    string PrimaryPhone,
    string? GSTIN,
    string TimeZone,
    string CurrencyCode,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    string? LogoUrl = null,
    string? AdminPassword = null
);

public record TenantDetailsDto(
    Guid Id,
    string Code,
    string BusinessName,
    string TradeName,
    Guid IndustryId,
    string IndustryName,
    string IndustryCode,
    TenantStatus Status,
    string AdminEmail,
    string PrimaryPhone,
    string? GSTIN,
    string? PAN,
    string? DrugLicenseNumber,
    string? FSSAINumber,
    string TimeZone,
    string CurrencyCode,
    bool IsActive,
    TenantIndustryConfigDto? IndustryConfig,
    IReadOnlyList<TenantBranchDto> Branches,
    TenantSubscriptionSummaryDto? ActiveSubscription,
    string? LogoUrl = null,
    string? UpiId = null,
    string? BankName = null,
    string? BankAccountNumber = null,
    string? BankIfsc = null,
    string? BankBranch = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? StateCode = null,
    string? Pincode = null,
    string? Email = null,
    string? Website = null,
    string? SmtpHost = null,
    int? SmtpPort = null,
    string? SmtpUsername = null,
    string? SmtpPassword = null,
    string? SmtpFromEmail = null,
    string? SmtpFromName = null,
    bool? SmtpEnableSsl = null,
    string? AdminPassword = null
);

public record TenantIndustryConfigDto(
    Guid IndustryId,
    string IndustryName,
    string IndustryCode,
    bool EnableBatchTracking,
    bool EnableExpiryTracking,
    bool EnableSerialTracking,
    bool EnableMultiUnitConversion,
    bool EnableSizeColorMatrix,
    bool EnableRecipeBOM,
    bool EnableScheduleH1DrugTracking,
    bool EnableEWayBill,
    bool EnableEInvoicing,
    string ConfigurationJson
);

public record TenantBranchDto(
    Guid Id,
    string BranchCode,
    string BranchName,
    string? GSTIN,
    string? City,
    string? State,
    bool IsHeadOffice,
    bool IsActive,
    IReadOnlyList<TenantWarehouseDto> Warehouses
);

public record TenantWarehouseDto(
    Guid Id,
    Guid BranchId,
    string WarehouseCode,
    string WarehouseName,
    string? Location,
    bool IsDefault,
    bool IsActive
);

// --- Catalog DTOs ---
public record IndustryDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string Icon,
    int DisplayOrder,
    bool IsActive,
    IReadOnlyList<ModuleSummaryDto> Modules
);

public record ModuleSummaryDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string Icon,
    bool IsCore,
    IReadOnlyList<FeatureSummaryDto> Features
);

public record FeatureSummaryDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    FeatureType FeatureType,
    IReadOnlyList<SubFeatureSummaryDto> SubFeatures
);

public record SubFeatureSummaryDto(
    Guid Id,
    string Code,
    string Name,
    string Description
);

public record IndustryCapabilityMatrixDto(
    Guid IndustryId,
    string IndustryCode,
    string IndustryName,
    IReadOnlyList<string> EnabledModuleCodes,
    IReadOnlyList<string> EnabledFeatureCodes,
    IDictionary<string, object> DefaultSettings
);

// --- Plan & Subscription DTOs ---
public record PlanDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    BillingCycle BillingCycle,
    decimal Price,
    int TrialDays,
    int MaxUsers,
    int MaxBranches,
    int MaxWarehouses,
    int MaxInvoicesPerMonth,
    int MaxStorageMb,
    bool IsPopular,
    bool IsActive,
    IReadOnlyList<string> EntitledFeatureCodes
);

public record TenantSubscriptionSummaryDto(
    Guid Id,
    Guid PlanId,
    string PlanName,
    string PlanCode,
    SubscriptionStatus Status,
    DateTimeOffset StartsAtUtc,
    DateTimeOffset EndsAtUtc,
    DateTimeOffset? TrialEndsAtUtc,
    bool AutoRenew,
    bool IsActive
);

public record PlatformCommercialConfigDto(
    Guid Id,
    decimal CoreAnnualPrice,
    decimal CoreBiennialPrice,
    int IncludedUsers,
    decimal SingleUserAnnualPrice,
    decimal FiveUserPackAnnualPrice,
    decimal AiProAnnualPrice,
    int AiProMonthlyScanLimit,
    decimal GstRatePercent,
    bool IsActive,
    DateTimeOffset? UpdatedAtUtc,
    string? LastUpdatedByEmail,
    string? Notes,
    decimal PharmaSfaAnnualBasePrice = 19999m,
    decimal PharmaSfaMonthlyBasePrice = 1999m,
    decimal MrSeatAnnualPrice = 4999m,
    decimal MrSeatMonthlyPrice = 499m,
    decimal ManagerSeatAnnualPrice = 6999m,
    decimal ManagerSeatMonthlyPrice = 699m
);

public record UpdateCommercialConfigRequest(
    decimal CoreAnnualPrice,
    decimal CoreBiennialPrice,
    int IncludedUsers,
    decimal SingleUserAnnualPrice,
    decimal FiveUserPackAnnualPrice,
    decimal AiProAnnualPrice,
    int AiProMonthlyScanLimit,
    decimal GstRatePercent,
    string? Notes = null,
    decimal PharmaSfaAnnualBasePrice = 19999m,
    decimal PharmaSfaMonthlyBasePrice = 1999m,
    decimal MrSeatAnnualPrice = 4999m,
    decimal MrSeatMonthlyPrice = 499m,
    decimal ManagerSeatAnnualPrice = 6999m,
    decimal ManagerSeatMonthlyPrice = 699m
);
