using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

// --- Super Admin Tenant DTOs ---
public record UpdateTenantStatusRequest(
    TenantStatus Status,
    string? Reason = null
);

public record UpdateTenantSubscriptionRequest(
    Guid PlanId,
    SubscriptionStatus Status,
    DateTimeOffset EndsAtUtc,
    bool AutoRenew = true,
    string? Reason = null
);

public record SuperAdminTenantDetailsDto(
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
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? SuspendedAtUtc,
    string? SuspensionReason,
    TenantIndustryConfigDto? IndustryConfig,
    IReadOnlyList<TenantBranchDto> Branches,
    TenantSubscriptionSummaryDto? ActiveSubscription,
    int TotalUsers,
    int TotalBranches,
    int TotalWarehouses,
    string? AdminPassword = null,
    bool IsAiAddonActive = false,
    int AiScansLimit = 500,
    int AiScansUsed = 0
);

// --- Super Admin Industry Catalog DTOs ---
public record CreateIndustryRequest(
    string Code,
    string Name,
    string Description,
    string Icon,
    int DisplayOrder = 0,
    string? DefaultConfigJson = "{}"
);

public record UpdateIndustryRequest(
    string Name,
    string Description,
    string Icon,
    int DisplayOrder,
    bool IsActive,
    string? DefaultConfigJson
);

public record AttachFeatureToIndustryRequest(
    Guid FeatureId,
    bool IsEnabledByDefault = true,
    string? DefaultConfigJson = null
);

// --- Super Admin Plan & Entitlements DTOs ---
public record CreatePlanRequest(
    string Code,
    string Name,
    string Description,
    BillingCycle BillingCycle,
    decimal Price,
    decimal SetupFee,
    int TrialDays,
    int MaxCompanies,
    int MaxUsers,
    int MaxBranches,
    int MaxWarehouses,
    int MaxInvoicesPerMonth,
    int MaxStorageMb,
    bool IsPopular,
    List<Guid> EntitledFeatureIds,
    bool IsHidden = false
);

public record UpdatePlanRequest(
    string Name,
    string Description,
    BillingCycle BillingCycle,
    decimal Price,
    decimal SetupFee,
    int TrialDays,
    int MaxCompanies,
    int MaxUsers,
    int MaxBranches,
    int MaxWarehouses,
    int MaxInvoicesPerMonth,
    int MaxStorageMb,
    bool IsActive,
    bool IsPopular,
    List<Guid> EntitledFeatureIds,
    bool IsHidden = false
);

// --- Super Admin Audit & Telemetry DTOs ---
public record AuditLogDto(
    Guid Id,
    Guid? TenantId,
    string? TenantCode,
    Guid? UserId,
    string? UserEmail,
    AuditActionType Action,
    string ActionName,
    string EntityName,
    string? EntityId,
    string? OldValuesJson,
    string? NewValuesJson,
    string? IpAddress,
    string? UserAgent,
    DateTimeOffset TimestampUtc
);

public record AuditLogQueryRequest(
    Guid? TenantId = null,
    Guid? UserId = null,
    AuditActionType? Action = null,
    string? EntityName = null,
    DateTimeOffset? FromDate = null,
    DateTimeOffset? ToDate = null,
    int PageNumber = 1,
    int PageSize = 20
);

public record PlatformStatsDto(
    int TotalTenants,
    int ActiveTenants,
    int TrialTenants,
    int SuspendedTenants,
    int TotalIndustries,
    int TotalPlans,
    decimal EstimatedMrr,
    IReadOnlyList<IndustryTenantCountDto> IndustryDistribution
);

public record IndustryTenantCountDto(
    string IndustryName,
    string IndustryCode,
    int TenantCount
);

public record ImpersonateTenantResponse(
    string AccessToken,
    Guid TenantId,
    string TenantCode,
    string BusinessName,
    AuthUserDto User
);

public record AddonAssignmentDto(
    string AddonCode,
    int DurationDays = 30
);

public record AssignPackageAndAddOnsRequest(
    Guid PlanId,
    int PlanDurationDays,
    List<AddonAssignmentDto>? Addons = null,
    string? Reason = null,
    decimal? CustomAmount = null,
    bool IsGstInclusive = true,
    string? PaymentMode = "Cash",
    string? PaymentReference = null,
    bool GenerateInvoice = true,
    int? ExtraUsers = null,
    bool IsTrialMode = false,
    DateTimeOffset? StartDate = null
);

public record ExtendTenantTrialRequest(
    int ExtensionDays,
    string? Reason = null
);

// --- Super Admin Tenant Security & Device Intelligence DTOs ---
public record TenantDeviceSessionDto(
    Guid Id,
    string DeviceId,
    string DeviceType,
    string Brand,
    string Model,
    string OsName,
    string OsVersion,
    string AppVersion,
    string ConnectionType,
    bool IsDualSim,
    string? Sim1Carrier,
    string? Sim2Carrier,
    string? SimPhoneNumber,
    string IpAddress,
    string? City,
    string? State,
    string? Country,
    string? IspName,
    DateTimeOffset FirstSeenAtUtc,
    DateTimeOffset LastActiveAtUtc,
    bool IsOnline,
    string? UserEmail,
    string? UserFullName,
    string? LastActionName
);

public record TenantLoginHistoryDto(
    Guid Id,
    string AttemptedIdentifier,
    bool IsSuccessful,
    string? FailureReason,
    string AuthChannel,
    string DeviceSummary,
    string IpAddress,
    string? City,
    string? State,
    string? Country,
    string? IspName,
    string? ConnectionType,
    DateTimeOffset LoggedInAtUtc
);

public record TenantInAppActivityDto(
    Guid Id,
    string ActionName,
    string EntityName,
    string? EntityId,
    string? UserEmail,
    string? IpAddress,
    string? UserAgent,
    DateTimeOffset TimestampUtc
);

public record TenantSecurityAuditSummaryDto(
    Guid TenantId,
    string BusinessName,
    string TenantCode,
    string AdminEmail,
    string PrimaryPhone,
    int TotalDevicesCount,
    int OnlineDevicesCount,
    string? PrimaryCity,
    string? PrimaryNetworkType,
    string? PrimaryIsp,
    IReadOnlyList<TenantDeviceSessionDto> ActiveDevices,
    IReadOnlyList<TenantLoginHistoryDto> RecentLogins,
    IReadOnlyList<TenantInAppActivityDto> InAppActivityTrail
);

public record ClientTelemetryPayload(
    string DeviceId,
    string DeviceType,
    string Brand,
    string Model,
    string OsName,
    string OsVersion,
    string AppVersion,
    string ConnectionType,
    bool IsDualSim,
    string? Sim1Carrier,
    string? Sim2Carrier,
    string? SimPhoneNumber
);
