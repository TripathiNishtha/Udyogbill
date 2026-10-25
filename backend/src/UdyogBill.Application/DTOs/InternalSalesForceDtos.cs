using UdyogBill.Domain.Entities.SalesForce;

namespace UdyogBill.Application.DTOs;

// --- SALES REPS & HIERARCHY DTOs ---

public record InternalSalesRepDto(
    Guid Id,
    Guid UserId,
    string RepCode,
    string FullName,
    string Mobile,
    string? Email,
    decimal MonthlyTarget,
    SalesRoleTier RoleTier,
    string RoleTierName,
    Guid? ReportingToId,
    string? ReportingToName,
    string City,
    string Region,
    string Zone,
    bool IsActive,
    int SubordinatesCount,
    DateTimeOffset CreatedAtUtc
);

public record CreateSalesRepRequest(
    string FullName,
    string? Mobile = null,
    string? MobileNumber = null,
    string? Email = null,
    string Password = "",
    SalesRoleTier RoleTier = SalesRoleTier.FSE,
    Guid? ReportingToId = null,
    string? City = null,
    string? Region = null,
    string? Zone = null,
    decimal? MonthlyTarget = null
)
{
    public string ResolvedMobile => !string.IsNullOrWhiteSpace(Mobile) ? Mobile.Trim() : (MobileNumber?.Trim() ?? string.Empty);
}

public record UpdateSalesRepRequest(
    string FullName,
    string? Mobile = null,
    string? MobileNumber = null,
    string? Email = null,
    SalesRoleTier RoleTier = SalesRoleTier.FSE,
    Guid? ReportingToId = null,
    string? City = null,
    string? Region = null,
    string? Zone = null,
    decimal? MonthlyTarget = null,
    bool IsActive = true
)
{
    public string ResolvedMobile => !string.IsNullOrWhiteSpace(Mobile) ? Mobile.Trim() : (MobileNumber?.Trim() ?? string.Empty);
}

public record UpdateRepTargetRequest(
    decimal MonthlyTarget
);

// --- HARDWARE DEVICE BINDING DTOs ---

public record HardwareDeviceDto(
    Guid Id,
    Guid RepId,
    string RepCode,
    string RepName,
    string RepCity,
    string DeviceFingerprint,
    string? DeviceModel,
    string? DeviceBrand,
    string? OsVersion,
    string? AppVersion,
    DeviceBindingStatus Status,
    string StatusName,
    Guid? ApprovedByUserId,
    DateTimeOffset? ApprovedAtUtc,
    DateTimeOffset? LastLoginAtUtc,
    string? LastKnownIp,
    int FailedTamperAttempts,
    DateTimeOffset CreatedAtUtc
);

public record RegisterDeviceRequest(
    string Mobile,
    string DeviceFingerprint,
    string? DeviceModel,
    string? DeviceBrand,
    string? OsVersion,
    string? AppVersion
);

public record ApproveDeviceRequest(
    Guid? AssignToRepId,
    string? Notes
);

// --- PRODUCT CATALOG DTOs ---

public record CompanyProductCatalogDto(
    Guid Id,
    string ProductCode,
    string Name,
    string Category,
    PricingModel PricingModel,
    string PricingModelName,
    decimal BasePrice,
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal DefaultRepIncentivePct,
    bool IsActive,
    int DisplayOrder
);

public record CreateCompanyProductRequest(
    string ProductCode,
    string Name,
    string Category,
    PricingModel PricingModel,
    decimal BasePrice,
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal DefaultRepIncentivePct,
    int DisplayOrder
);

public record UpdateCompanyProductRequest(
    string Name,
    string Category,
    PricingModel PricingModel,
    decimal BasePrice,
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal DefaultRepIncentivePct,
    bool IsActive,
    int DisplayOrder
);

// --- QUOTA & COCKPIT DTOs ---

public record SalesQuotaDto(
    Guid Id,
    Guid RepId,
    string RepName,
    string RepCode,
    string City,
    int Month,
    int Year,
    decimal IndividualTarget,
    decimal TeamRollupTarget,
    decimal TotalTarget,
    decimal AchievedRevenue,
    decimal AchievedBillingRev,
    decimal AchievedEcommerceRev,
    decimal AchievedCustomProjectRev,
    decimal GapAmount,
    decimal AchievedPct,
    int NewSalesCount,
    int RenewalsDueCount,
    int RenewalsClosedCount,
    decimal RenewalRatePct,
    bool IsLocked
);

public record AllocateQuotaRequest(
    Guid RepId,
    int Month,
    int Year,
    decimal IndividualTarget,
    decimal TeamRollupTarget
);

public record RepCockpitSummaryDto(
    Guid RepId,
    string RepCode,
    string FullName,
    string City,
    SalesRoleTier RoleTier,
    int Month,
    int Year,
    int DaysLeftInMonth,
    decimal MonthlyTarget,
    decimal AchievedRevenue,
    decimal GapAmount,
    decimal AchievedPct,
    decimal RequiredDailyRunRate,
    decimal EstimatedCommissionEarned,
    int VisitsPlannedToday,
    int VisitsCompletedToday,
    int DemosGivenToday,
    int TrialsActiveToday,
    int RenewalsDueNext30Days,
    decimal RenewalsPotentialAmount
);

// --- FIELD SHOP VISITS & DCR DTOs ---

public record FieldShopVisitDto(
    Guid Id,
    Guid RepId,
    string RepName,
    string ShopName,
    string OwnerName,
    string OwnerMobile,
    string ShopCategory,
    string? CurrentSoftware,
    string Address,
    double Latitude,
    double Longitude,
    bool IsMockGpsDetected,
    bool IsVpnDetected,
    VisitOutcome VisitOutcome,
    string VisitOutcomeName,
    decimal? TotalQuotedAmount,
    DateTimeOffset? NextFollowupAt,
    string? Notes,
    bool IsCustomProjectLead,
    string? ProjectScopeSummary,
    string? StorefrontImageUrl,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<FieldShopVisitProductDto> PitchedProducts
);

public record FieldShopVisitProductDto(
    Guid Id,
    Guid ProductId,
    string ProductCode,
    string ProductName,
    string ProductCategory,
    decimal QuotedPrice,
    string DealStatus,
    string? ClientInterestLevel
);

public record PunchVisitRequest(
    string ShopName,
    string OwnerName,
    string OwnerMobile,
    string ShopCategory,
    string? CurrentSoftware,
    string Address,
    double Latitude,
    double Longitude,
    bool IsMockGpsDetected,
    bool IsVpnDetected,
    VisitOutcome VisitOutcome,
    decimal? TotalQuotedAmount,
    DateTimeOffset? NextFollowupAt,
    string? Notes,
    bool IsCustomProjectLead,
    string? ProjectScopeSummary,
    string? StorefrontImageUrl,
    List<PunchVisitProductItemRequest>? Products
);

public record PunchVisitProductItemRequest(
    Guid ProductId,
    decimal QuotedPrice,
    string DealStatus,
    string? ClientInterestLevel
);

// --- ATTRIBUTION & DISPUTE RESOLUTION DTOs ---

public record AssignSubscriptionToRepRequest(
    Guid AssignedRepId,
    string ReasonNotes,
    decimal RevenueAmount,
    bool IsRenewal = false
);

public record SubscriptionAttributionLogDto(
    Guid Id,
    Guid SubscriptionId,
    Guid TenantId,
    string TenantBusinessName,
    Guid AssignedRepId,
    string RepCode,
    string RepName,
    string RepCity,
    Guid AssignedByUserId,
    string AssignedByUserName,
    string AttributionMethod,
    string? ProofDocumentNotes,
    decimal RevenueAmount,
    bool IsRenewal,
    DateTimeOffset CreatedAtUtc
);

public record RepLoginRequest(
    string MobileNumber,
    string Password,
    string DeviceFingerprint,
    string? DeviceModel = null,
    string? DeviceBrand = null,
    string? OsVersion = null,
    string? AppVersion = null
);

public record RepLoginResponseDto(
    string AccessToken,
    Guid RepId,
    string RepCode,
    string FullName,
    string City,
    SalesRoleTier RoleTier
);
