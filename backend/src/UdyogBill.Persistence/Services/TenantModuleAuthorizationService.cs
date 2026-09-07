using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class TenantModuleAuthorizationService : ITenantModuleAuthorizationService
{
    private readonly AppDbContext _context;

    public TenantModuleAuthorizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<TenantModuleEntitlementDto> GetTenantEntitlementsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
        {
            var fallbackDescriptor = IndustryModuleRegistry.GetDescriptor(IndustryTypeCodes.Other);
            return new TenantModuleEntitlementDto(
                TenantId: tenantId,
                IndustryTypeCode: IndustryTypeCodes.Other,
                ActiveIndustryModule: IndustryTypeCodes.Other,
                ModuleStatus: IndustryModuleStatus.Inactive,
                IsAiAddonActive: false,
                AiScansLimit: 0,
                AiScansUsed: 0,
                ScansRemaining: 0,
                MaxAllowedUsers: 2,
                CurrentActiveUsers: 0,
                CanCreateMoreUsers: false,
                Descriptor: fallbackDescriptor,
                IsPharmaSfaActive: false
            );
        }

        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.IsActive, cancellationToken);

        var rawIndustryCode = tenant.Industry?.Code;
        if (string.IsNullOrWhiteSpace(rawIndustryCode) || string.Equals(rawIndustryCode, IndustryTypeCodes.Other, StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(tenant.ActiveIndustryModule) && !string.Equals(tenant.ActiveIndustryModule, IndustryTypeCodes.Other, StringComparison.OrdinalIgnoreCase))
            {
                rawIndustryCode = tenant.ActiveIndustryModule;
            }
            else if (!string.IsNullOrWhiteSpace(tenant.IndustryTypeCode))
            {
                rawIndustryCode = tenant.IndustryTypeCode;
            }
        }

        var industryCode = string.IsNullOrWhiteSpace(rawIndustryCode)
            ? IndustryTypeCodes.Other
            : IndustryTypeCodes.Normalize(rawIndustryCode);

        var activeModule = string.IsNullOrWhiteSpace(tenant.ActiveIndustryModule) || string.Equals(tenant.ActiveIndustryModule, IndustryTypeCodes.Other, StringComparison.OrdinalIgnoreCase)
            ? industryCode
            : IndustryTypeCodes.Normalize(tenant.ActiveIndustryModule);

        var descriptor = IndustryModuleRegistry.GetDescriptor(activeModule);
        var scansRemaining = Math.Max(0, tenant.AiScansLimit - tenant.AiScansUsed);
        var canCreateMore = activeUsers < tenant.MaxAllowedUsers;
        var isPharma = string.Equals(industryCode, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(activeModule, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                       string.Equals(tenant.Industry?.Code, "PHARMA", StringComparison.OrdinalIgnoreCase);
        var isSfaActive = isPharma && tenant.IsPharmaSfaActive;

        return new TenantModuleEntitlementDto(
            TenantId: tenant.Id,
            IndustryTypeCode: industryCode,
            ActiveIndustryModule: activeModule,
            ModuleStatus: tenant.IndustryModuleStatus,
            IsAiAddonActive: tenant.IsAiAddonActive,
            AiScansLimit: tenant.AiScansLimit,
            AiScansUsed: tenant.AiScansUsed,
            ScansRemaining: scansRemaining,
            MaxAllowedUsers: tenant.MaxAllowedUsers,
            CurrentActiveUsers: activeUsers,
            CanCreateMoreUsers: canCreateMore,
            Descriptor: descriptor,
            IsPharmaSfaActive: isSfaActive
        );
    }

    public async Task<Result<bool>> ValidateIndustryAccessAsync(Guid tenantId, string targetIndustryCode, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
        {
            return Result<bool>.Failure("Tenant not found.", "TENANT_NOT_FOUND");
        }

        var normalizedTarget = IndustryTypeCodes.Normalize(targetIndustryCode);
        var tenantModule = IndustryTypeCodes.Normalize(tenant.ActiveIndustryModule ?? tenant.IndustryTypeCode);

        // Core / General trading features are accessible to all
        if (normalizedTarget == IndustryTypeCodes.Other)
        {
            return Result<bool>.Success(true);
        }

        if (!string.Equals(tenantModule, normalizedTarget, StringComparison.OrdinalIgnoreCase))
        {
            return Result<bool>.Failure(
                $"Access Denied: Your organization is registered with the '{tenantModule}' industry pack. The '{normalizedTarget}' module is restricted.",
                "INDUSTRY_MODULE_MISMATCH"
            );
        }

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ValidateAiProAccessAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
        {
            return Result<bool>.Failure("Tenant not found.", "TENANT_NOT_FOUND");
        }

        if (!tenant.IsAiAddonActive)
        {
            return Result<bool>.Failure(
                "AI Pro Add-on is not active on your plan. Please upgrade to unlock the AI Bill Scanner.",
                "AI_ADDON_INACTIVE"
            );
        }

        if (tenant.AiScansUsed >= tenant.AiScansLimit)
        {
            return Result<bool>.Failure(
                "Monthly AI purchase scan quota reached. Please recharge or upgrade your AI Add-on.",
                "AI_QUOTA_EXHAUSTED"
            );
        }

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ValidateUserCreationAllowedAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
        {
            return Result<bool>.Failure("Tenant not found.", "TENANT_NOT_FOUND");
        }

        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.IsActive, cancellationToken);

        if (activeUsers >= tenant.MaxAllowedUsers)
        {
            return Result<bool>.Failure(
                $"Maximum user limit reached ({activeUsers}/{tenant.MaxAllowedUsers} users). Please purchase an Additional User Add-on to invite more team members.",
                "USER_LIMIT_EXCEEDED"
            );
        }

        return Result<bool>.Success(true);
    }
}