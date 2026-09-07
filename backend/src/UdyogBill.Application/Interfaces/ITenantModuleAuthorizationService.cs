using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public record TenantModuleEntitlementDto(
    Guid TenantId,
    string IndustryTypeCode,
    string ActiveIndustryModule,
    IndustryModuleStatus ModuleStatus,
    bool IsAiAddonActive,
    int AiScansLimit,
    int AiScansUsed,
    int ScansRemaining,
    int MaxAllowedUsers,
    int CurrentActiveUsers,
    bool CanCreateMoreUsers,
    IndustryModuleDescriptor Descriptor,
    bool IsPharmaSfaActive = false
);

public interface ITenantModuleAuthorizationService
{
    Task<TenantModuleEntitlementDto> GetTenantEntitlementsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result<bool>> ValidateIndustryAccessAsync(Guid tenantId, string targetIndustryCode, CancellationToken cancellationToken = default);
    Task<Result<bool>> ValidateAiProAccessAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result<bool>> ValidateUserCreationAllowedAsync(Guid tenantId, CancellationToken cancellationToken = default);
}