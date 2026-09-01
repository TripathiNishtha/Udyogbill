using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

// --- Branch DTOs ---
public record CreateBranchRequest(
    string BranchCode,
    string BranchName,
    string? GSTIN = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? StateCode = null,
    string? Pincode = null,
    string? Phone = null,
    string? Email = null,
    bool IsHeadOffice = false
);

public record UpdateBranchRequest(
    string BranchName,
    string? GSTIN,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? StateCode,
    string? Pincode,
    string? Phone,
    string? Email,
    bool IsHeadOffice,
    bool IsActive
);

public record BranchDetailsDto(
    Guid Id,
    Guid TenantId,
    string BranchCode,
    string BranchName,
    string? GSTIN,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? StateCode,
    string? Pincode,
    string? Phone,
    string? Email,
    bool IsHeadOffice,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<WarehouseDetailsDto> Warehouses
);

// --- Warehouse DTOs ---
public record CreateWarehouseRequest(
    Guid BranchId,
    string WarehouseCode,
    string WarehouseName,
    string? Location = null,
    bool IsDefault = false
);

public record UpdateWarehouseRequest(
    string WarehouseName,
    string? Location,
    bool IsDefault,
    bool IsActive
);

public record WarehouseDetailsDto(
    Guid Id,
    Guid TenantId,
    Guid BranchId,
    string BranchName,
    string WarehouseCode,
    string WarehouseName,
    string? Location,
    bool IsDefault,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

// --- Staff User & RBAC DTOs ---
public record CreateStaffUserRequest(
    string Email,
    string FullName,
    string Password,
    string? PhoneNumber = null,
    string? Designation = null,
    List<Guid>? RoleIds = null
);

public record UpdateStaffUserRequest(
    string FullName,
    string? PhoneNumber,
    string? Designation,
    bool IsActive
);

public record UpdateMyProfileRequest(
    string FullName,
    string? PhoneNumber = null,
    string? CurrentPassword = null,
    string? NewPassword = null
);

public record StaffUserDto(
    Guid Id,
    Guid TenantId,
    string Email,
    string FullName,
    string? PhoneNumber,
    string? Designation,
    bool IsTenantAdmin,
    bool IsActive,
    DateTimeOffset? LastLoginAtUtc,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<RoleDto> Roles,
    IReadOnlyList<string> AssignedPermissions
);

public record AssignUserRolesRequest(
    List<Guid> RoleIds
);

public record UpdateUserPermissionsRequest(
    List<Guid> GrantedPermissionIds,
    List<Guid> RevokedPermissionIds
);

// --- Role & Permission DTOs ---
public record RoleDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string Name,
    string Description,
    bool IsSystemRole,
    bool IsActive,
    IReadOnlyList<string> PermissionCodes
);

public record CreateRoleRequest(
    string Code,
    string Name,
    string Description,
    List<Guid> PermissionIds
);

public record UpdateRoleRequest(
    string Name,
    string Description,
    bool IsActive,
    List<Guid> PermissionIds
);

public record PermissionDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string ModuleCode,
    string ModuleName
);

public record PermissionGroupDto(
    string ModuleCode,
    string ModuleName,
    IReadOnlyList<PermissionDto> Permissions
);

// --- Tenant Settings & Capabilities DTOs ---
public record UpdateBusinessProfileRequest(
    string BusinessName,
    string TradeName,
    string PrimaryPhone,
    string? GSTIN,
    string? PAN,
    string? DrugLicenseNumber,
    string? FSSAINumber,
    string TimeZone,
    string CurrencyCode,
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
    bool? SmtpEnableSsl = null
);

public record SendTenantTestEmailRequest(
    string RecipientEmail,
    string? Subject = null,
    string? Message = null
);

public record UpdateTenantIndustryConfigRequest(
    bool EnableBatchTracking,
    bool EnableExpiryTracking,
    bool EnableSerialTracking,
    bool EnableMultiUnitConversion,
    bool EnableSizeColorMatrix,
    bool EnableRecipeBOM,
    bool EnableScheduleH1DrugTracking,
    bool EnableEWayBill,
    bool EnableEInvoicing,
    string? ConfigurationJson = "{}"
);

public record TenantQuotaSummaryDto(
    int CurrentUsers,
    int MaxUsers,
    int CurrentBranches,
    int MaxBranches,
    int CurrentWarehouses,
    int MaxWarehouses,
    int InvoicesThisMonth,
    int MaxInvoicesPerMonth,
    string PlanName,
    string PlanCode,
    SubscriptionStatus SubscriptionStatus,
    DateTimeOffset SubscriptionEndsAtUtc,
    bool IsTrial
);
