using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Persistence.Services;

public class CompanyManagementService : ICompanyManagementService
{
    private readonly AppDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IAuditService _auditService;
    private readonly ILogger<CompanyManagementService> _logger;
    private readonly ITenantContext _tenantContext;

    public CompanyManagementService(
        AppDbContext context,
        IJwtTokenGenerator jwtTokenGenerator,
        IAuditService auditService,
        ILogger<CompanyManagementService> logger,
        ITenantContext tenantContext)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _auditService = auditService;
        _logger = logger;
        _tenantContext = tenantContext;
    }

    private async Task EnsureUserMappingsSeededAsync(Guid userId, Guid tenantId, CancellationToken cancellationToken)
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE IF EXISTS ""tenants"" ADD COLUMN IF NOT EXISTS ""ParentTenantId"" uuid NULL;
                ALTER TABLE IF EXISTS ""tenants"" ADD COLUMN IF NOT EXISTS ""OwnerUserId"" uuid NULL;
                ALTER TABLE IF EXISTS ""plans"" ADD COLUMN IF NOT EXISTS ""MaxCompanies"" integer NOT NULL DEFAULT 1;

                CREATE TABLE IF NOT EXISTS ""TenantUserMappings"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""IsOwner"" boolean NOT NULL DEFAULT FALSE,
                    ""Role"" text NOT NULL DEFAULT 'TenantAdmin',
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW()
                );

                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_TenantUserMappings_UserId_TenantId"" ON ""TenantUserMappings"" (""UserId"", ""TenantId"");
                CREATE INDEX IF NOT EXISTS ""IX_tenants_ParentTenantId"" ON ""tenants"" (""ParentTenantId"");
                CREATE INDEX IF NOT EXISTS ""IX_tenants_OwnerUserId"" ON ""tenants"" (""OwnerUserId"");

                UPDATE ""tenants"" c
                SET ""Status"" = p.""Status""
                FROM ""tenants"" p
                WHERE c.""ParentTenantId"" = p.""Id"" AND c.""Status"" != p.""Status"";
            ", cancellationToken);
        }
        catch { }

        // Self-heal: Ensure existing primary tenant is mapped in TenantUserMappings
        var mappingExists = await _context.TenantUserMappings
            .IgnoreQueryFilters()
            .AnyAsync(m => m.UserId == userId && m.TenantId == tenantId, cancellationToken);

        if (!mappingExists && tenantId != Guid.Empty)
        {
            _context.TenantUserMappings.Add(new TenantUserMapping
            {
                TenantId = tenantId,
                UserId = userId,
                IsOwner = true,
                Role = "TenantAdmin",
                CreatedAtUtc = DateTimeOffset.UtcNow
            });
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<Result<IReadOnlyList<UserCompanySummaryDto>>> GetUserCompaniesAsync(
        Guid userId,
        Guid currentTenantId,
        CancellationToken cancellationToken = default)
    {
        await EnsureUserMappingsSeededAsync(userId, currentTenantId, cancellationToken);

        // 1. Find all tenant IDs the user is mapped to or owns
        var mappedTenantIds = await _context.TenantUserMappings
            .IgnoreQueryFilters()
            .Where(m => m.UserId == userId)
            .Select(m => m.TenantId)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Include user's own tenant and child companies
        var ownedTenantIds = await _context.Tenants
            .IgnoreQueryFilters()
            .Where(t => !t.IsDeleted && (t.OwnerUserId == userId || t.Id == currentTenantId || t.ParentTenantId == currentTenantId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        var allTenantIds = mappedTenantIds.Union(ownedTenantIds).Distinct().ToList();

        if (!allTenantIds.Contains(currentTenantId) && currentTenantId != Guid.Empty)
        {
            allTenantIds.Add(currentTenantId);
        }

        var tenants = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .Where(t => allTenantIds.Contains(t.Id) && !t.IsDeleted)
            .OrderBy(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var results = tenants.Select(t => new UserCompanySummaryDto(
            t.Id,
            t.Code,
            t.BusinessName,
            string.IsNullOrWhiteSpace(t.TradeName) ? t.BusinessName : t.TradeName,
            t.GSTIN,
            t.LogoUrl,
            t.Industry?.Name ?? "General",
            t.Industry?.Code ?? t.IndustryTypeCode,
            t.City,
            t.State,
            t.Id == currentTenantId,
            t.OwnerUserId == userId || t.Id == currentTenantId,
            t.CreatedAtUtc
        )).ToList();

        return Result<IReadOnlyList<UserCompanySummaryDto>>.Success(results);
    }

    public async Task<Result<CompanyQuotaDto>> GetCompanyQuotaAsync(
        Guid currentTenantId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var (primaryTenantId, maxAllowed, planName, planCode, isTrial) = await ResolveSubscriptionLimitsAsync(currentTenantId, userId, cancellationToken);

        var currentCount = await _context.Tenants
            .IgnoreQueryFilters()
            .CountAsync(t => !t.IsDeleted && (t.Id == primaryTenantId || t.ParentTenantId == primaryTenantId || t.OwnerUserId == userId), cancellationToken);

        if (currentCount == 0) currentCount = 1;

        var canCreateMore = currentCount < maxAllowed;
        var hasMultiCompanyAccess = isTrial || maxAllowed > 1 || currentCount > 1;

        return Result<CompanyQuotaDto>.Success(new CompanyQuotaDto(
            currentCount,
            maxAllowed,
            canCreateMore,
            planName,
            planCode,
            isTrial,
            hasMultiCompanyAccess
        ));
    }

    public async Task<Result<UserCompanySummaryDto>> CreateCompanyAsync(
        CreateCompanyRequest request,
        Guid userId,
        Guid currentTenantId,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.BusinessName))
        {
            return Result<UserCompanySummaryDto>.Failure("Company / Business Name is required.", "VALIDATION_ERROR");
        }

        var (primaryTenantId, maxAllowed, planName, _, isTrial) = await ResolveSubscriptionLimitsAsync(currentTenantId, userId, cancellationToken);

        var existingCount = await _context.Tenants
            .IgnoreQueryFilters()
            .CountAsync(t => !t.IsDeleted && (t.Id == primaryTenantId || t.ParentTenantId == primaryTenantId || t.OwnerUserId == userId), cancellationToken);

        if (existingCount >= maxAllowed)
        {
            return Result<UserCompanySummaryDto>.Failure(
                $"Company limit ({maxAllowed}) reached for your current plan '{planName}'. Please upgrade your subscription to add more companies.",
                "PLAN_LIMIT_REACHED");
        }

        // Validate Industry
        var primaryTenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == primaryTenantId, cancellationToken);

        var industry = await _context.Industries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.Id == request.IndustryId, cancellationToken);

        if (industry == null)
        {
            // Fallback to primary tenant's industry or first active industry
            industry = primaryTenant?.Industry ?? await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(cancellationToken);
        }

        var normalizedIndustry = industry != null ? IndustryTypeCodes.Normalize(industry.Code) : IndustryTypeCodes.Other;
        var industryDescriptor = IndustryModuleRegistry.GetDescriptor(normalizedIndustry);

        var tenantCount = await _context.Tenants.IgnoreQueryFilters().CountAsync(cancellationToken) + 1001;
        var newTenantCode = $"TNT-CMP-{tenantCount}";

        var newTenant = new Tenant
        {
            Code = newTenantCode,
            BusinessName = request.BusinessName.Trim(),
            TradeName = string.IsNullOrWhiteSpace(request.TradeName) ? request.BusinessName.Trim() : request.TradeName.Trim(),
            IndustryId = industry?.Id ?? Guid.Empty,
            IndustryTypeCode = normalizedIndustry,
            ActiveIndustryModule = normalizedIndustry,
            IndustryModuleStatus = IndustryModuleStatus.Active,
            IndustryActivatedAtUtc = DateTimeOffset.UtcNow,
            MaxAllowedUsers = 2,
            Status = isTrial ? TenantStatus.Trial : (primaryTenant?.Status ?? TenantStatus.Active),
            PrimaryPhone = request.Phone?.Trim() ?? string.Empty,
            Email = request.Email?.Trim(),
            GSTIN = request.GSTIN?.Trim().ToUpperInvariant(),
            PAN = request.PAN?.Trim().ToUpperInvariant(),
            AddressLine1 = request.AddressLine1?.Trim(),
            AddressLine2 = request.AddressLine2?.Trim(),
            City = request.City?.Trim(),
            State = request.State?.Trim(),
            StateCode = request.StateCode?.Trim(),
            Pincode = request.Pincode?.Trim(),
            ParentTenantId = primaryTenantId,
            OwnerUserId = userId,
            IsActive = true
        };

        _context.Tenants.Add(newTenant);

        // Map User to new Company
        _context.TenantUserMappings.Add(new TenantUserMapping
        {
            TenantId = newTenant.Id,
            UserId = userId,
            IsOwner = true,
            Role = "TenantAdmin",
            CreatedAtUtc = DateTimeOffset.UtcNow
        });

        // Create Default Head Office Branch
        var hoBranch = new TenantBranch
        {
            TenantId = newTenant.Id,
            BranchCode = "HO-01",
            BranchName = "Head Office",
            IsHeadOffice = true,
            IsActive = true,
            GSTIN = request.GSTIN?.Trim(),
            City = request.City?.Trim(),
            State = request.State?.Trim(),
            Pincode = request.Pincode?.Trim(),
            Phone = request.Phone?.Trim()
        };
        _context.TenantBranches.Add(hoBranch);

        // Create Default Storage Warehouse
        var mainWh = new TenantWarehouse
        {
            TenantId = newTenant.Id,
            Branch = hoBranch,
            WarehouseCode = "MAIN-01",
            WarehouseName = "Main Storage Warehouse",
            IsDefault = true,
            IsActive = true
        };
        _context.TenantWarehouses.Add(mainWh);

        // Create Tenant Industry Configuration
        if (industry != null)
        {
            var industryConfig = new TenantIndustryConfig
            {
                TenantId = newTenant.Id,
                IndustryId = industry.Id,
                EnableBatchTracking = industryDescriptor.EnableBatchTracking,
                EnableExpiryTracking = industryDescriptor.EnableExpiryTracking,
                EnableSerialTracking = industryDescriptor.EnableSerialTracking,
                EnableMultiUnitConversion = industryDescriptor.EnableMultiUnitConversion,
                EnableSizeColorMatrix = industryDescriptor.EnableSizeColorMatrix,
                EnableRecipeBOM = industryDescriptor.EnableRecipeBOM,
                EnableScheduleH1DrugTracking = industryDescriptor.EnableScheduleH1DrugTracking,
                EnableEWayBill = industryDescriptor.EnableEWayBill,
                EnableEInvoicing = industryDescriptor.EnableEInvoicing,
                ConfigurationJson = "{}"
            };
            _context.TenantIndustryConfigs.Add(industryConfig);
        }

        _tenantContext.SetTenant(newTenant.Id, newTenantCode);

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = newTenant.Id,
            UserId = userId,
            Action = AuditActionType.Create,
            ActionName = "CreateCompany",
            EntityName = "Tenant",
            EntityId = newTenant.Id.ToString(),
            IpAddress = ipAddress
        }, cancellationToken);

        var dto = new UserCompanySummaryDto(
            newTenant.Id,
            newTenant.Code,
            newTenant.BusinessName,
            newTenant.TradeName,
            newTenant.GSTIN,
            newTenant.LogoUrl,
            industry?.Name ?? "General",
            newTenant.IndustryTypeCode,
            newTenant.City,
            newTenant.State,
            false,
            true,
            newTenant.CreatedAtUtc
        );

        return Result<UserCompanySummaryDto>.Success(dto);
    }

    public async Task<Result<SwitchCompanyResponse>> SwitchCompanyAsync(
        Guid targetTenantId,
        Guid userId,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Fetch user
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Result<SwitchCompanyResponse>.Failure("User not found or inactive.", "USER_NOT_FOUND");
        }

        // 2. Fetch target tenant
        var targetTenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == targetTenantId && !t.IsDeleted && t.IsActive, cancellationToken);

        if (targetTenant == null)
        {
            return Result<SwitchCompanyResponse>.Failure("Target company not found or inactive.", "COMPANY_NOT_FOUND");
        }

        // 3. Authorization Check & Role Resolution
        List<string> roles;
        var permissions = new List<string>();
        TenantUserMapping? mapping = null;

        if (user.IsSuperAdmin)
        {
            roles = new List<string> { Roles.SuperAdmin };
        }
        else
        {
            mapping = await _context.TenantUserMappings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == targetTenantId, cancellationToken);

            if (mapping == null || string.IsNullOrWhiteSpace(mapping.Role))
            {
                return Result<SwitchCompanyResponse>.Failure("You do not have access to this company.", "ACCESS_DENIED");
            }

            var mappedRole = mapping.Role.Trim();
            roles = new List<string> { mappedRole };

            // Look up permissions for this mapped role in the target tenant context
            var roleEntity = await _context.Roles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => (r.TenantId == targetTenant.Id || r.TenantId == Guid.Empty) && r.Name == mappedRole && !r.IsDeleted, cancellationToken);

            if (roleEntity != null)
            {
                var rolePermissions = await _context.RolePermissions
                    .IgnoreQueryFilters()
                    .Where(rp => rp.RoleId == roleEntity.Id)
                    .Include(rp => rp.Permission)
                    .Select(rp => rp.Permission.Code)
                    .ToListAsync(cancellationToken);

                permissions.AddRange(rolePermissions);
            }
        }

        bool isTenantAdmin = user.IsSuperAdmin || roles.Contains(Roles.TenantAdmin) || (mapping?.IsOwner ?? false);
        user.IsTenantAdmin = isTenantAdmin;

        // 4. Generate New Scoped JWT Access Token
        var accessToken = _jwtTokenGenerator.GenerateAccessToken(
            user,
            roles,
            permissions,
            targetTenant.Id,
            targetTenant.Code);

        var (refreshToken, refreshTokenHash, refreshExpiresAt) = _jwtTokenGenerator.GenerateRefreshToken(ipAddress);

        _tenantContext.SetTenant(targetTenant.Id, targetTenant.Code);

        _context.RefreshTokens.Add(new RefreshToken
        {
            TenantId = targetTenant.Id,
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = refreshExpiresAt,
            CreatedByIp = ipAddress
        });

        await _context.SaveChangesAsync(cancellationToken);

        var authUserDto = new AuthUserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.IsSuperAdmin,
            isTenantAdmin,
            targetTenant.Id,
            targetTenant.Code,
            targetTenant.BusinessName,
            targetTenant.Industry?.Code ?? targetTenant.IndustryTypeCode,
            roles,
            permissions,
            targetTenant.LogoUrl
        );

        return Result<SwitchCompanyResponse>.Success(new SwitchCompanyResponse(
            accessToken,
            refreshToken,
            DateTimeOffset.UtcNow.AddHours(1),
            authUserDto
        ));
    }

    private async Task<(Guid primaryTenantId, int maxCompanies, string planName, string planCode, bool isTrial)> ResolveSubscriptionLimitsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        // 1. Resolve Primary Tenant
        var currentTenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var primaryTenantId = currentTenant?.ParentTenantId ?? tenantId;

        // 2. Fetch Active Subscription
        var subscription = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .Where(s => s.TenantId == primaryTenantId && !s.IsDeleted && s.Status != SubscriptionStatus.Expired)
            .OrderByDescending(s => s.StartsAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        bool isTrial = false;
        if (subscription != null)
        {
            isTrial = subscription.Status == SubscriptionStatus.Trial
                || (subscription.Plan != null && subscription.Plan.Code.Contains("TRIAL", StringComparison.OrdinalIgnoreCase));
        }
        else
        {
            isTrial = currentTenant == null || currentTenant.Status == TenantStatus.Trial || currentTenant.Status == TenantStatus.PendingVerification;
        }

        if (subscription?.Plan != null)
        {
            var max = subscription.Plan.MaxCompanies > 0 ? subscription.Plan.MaxCompanies : 1;
            // Trial gives at least 2 companies by default
            if (isTrial && max < 2)
            {
                max = 2;
            }
            return (primaryTenantId, max, subscription.Plan.Name, subscription.Plan.Code, isTrial);
        }

        // Default Free Trial fallback (at least 2 companies allowed)
        return (primaryTenantId, 2, "Free Trial", "TRIAL", true);
    }
}
