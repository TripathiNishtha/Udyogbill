using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Persistence.Services;

public class SuperAdminService : ISuperAdminService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public SuperAdminService(
        AppDbContext context,
        ICurrentUserContext currentUserContext,
        IAuditService auditService,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    #region Tenant Management

    public async Task<Result<PagedResult<TenantDto>>> GetTenantsAsync(
        int pageNumber,
        int pageSize,
        TenantStatus? status = null,
        Guid? industryId = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .Where(t => !t.IsDeleted);

        if (status.HasValue)
        {
            query = query.Where(t => t.Status == status.Value);
        }

        if (industryId.HasValue && industryId.Value != Guid.Empty)
        {
            query = query.Where(t => t.IndustryId == industryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(t =>
                t.BusinessName.ToLower().Contains(term) ||
                t.Code.ToLower().Contains(term) ||
                t.AdminEmail.ToLower().Contains(term) ||
                t.PrimaryPhone.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TenantDto(
                t.Id,
                t.Code,
                t.BusinessName,
                t.TradeName,
                t.IndustryId,
                t.Industry != null ? t.Industry.Name : "General",
                t.Industry != null ? t.Industry.Code : "GENERAL",
                t.Status,
                t.AdminEmail,
                t.PrimaryPhone,
                t.GSTIN,
                t.TimeZone,
                t.CurrencyCode,
                t.IsActive,
                t.CreatedAtUtc,
                t.LogoUrl
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<TenantDto>>.Success(PagedResult<TenantDto>.Create(items, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<SuperAdminTenantDetailsDto>> GetTenantDetailsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .Include(t => t.Branches.Where(b => !b.IsDeleted))
                .ThenInclude(b => b.Warehouses.Where(w => !w.IsDeleted))
            .Include(t => t.IndustryConfigs.Where(c => !c.IsDeleted))
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return Result<SuperAdminTenantDetailsDto>.Failure("Tenant not found.", "NOT_FOUND");
        }

        var activeSub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);

        var totalBranches = tenant.Branches.Count;
        var totalWarehouses = tenant.Branches.Sum(b => b.Warehouses.Count);

        var indConfig = tenant.IndustryConfigs.FirstOrDefault();
        TenantIndustryConfigDto? configDto = indConfig == null ? null : new TenantIndustryConfigDto(
            indConfig.IndustryId,
            tenant.Industry.Name,
            tenant.Industry.Code,
            indConfig.EnableBatchTracking,
            indConfig.EnableExpiryTracking,
            indConfig.EnableSerialTracking,
            indConfig.EnableMultiUnitConversion,
            indConfig.EnableSizeColorMatrix,
            indConfig.EnableRecipeBOM,
            indConfig.EnableScheduleH1DrugTracking,
            indConfig.EnableEWayBill,
            indConfig.EnableEInvoicing,
            indConfig.ConfigurationJson
        );

        var branchesDto = tenant.Branches.Select(b => new TenantBranchDto(
            b.Id,
            b.BranchCode,
            b.BranchName,
            b.GSTIN,
            b.City,
            b.State,
            b.IsHeadOffice,
            b.IsActive,
            b.Warehouses.Select(w => new TenantWarehouseDto(
                w.Id,
                w.BranchId,
                w.WarehouseCode,
                w.WarehouseName,
                w.Location,
                w.IsDefault,
                w.IsActive
            )).ToList()
        )).ToList();

        TenantSubscriptionSummaryDto? subDto = activeSub == null ? null : new TenantSubscriptionSummaryDto(
            activeSub.Id,
            activeSub.PlanId,
            activeSub.Plan.Name,
            activeSub.Plan.Code,
            activeSub.Status,
            activeSub.StartsAtUtc,
            activeSub.EndsAtUtc,
            activeSub.TrialEndsAtUtc,
            activeSub.AutoRenew,
            activeSub.EndsAtUtc > DateTimeOffset.UtcNow && activeSub.Status != SubscriptionStatus.Suspended && activeSub.Status != SubscriptionStatus.Cancelled
        );

        var details = new SuperAdminTenantDetailsDto(
            tenant.Id,
            tenant.Code,
            tenant.BusinessName,
            tenant.TradeName,
            tenant.IndustryId,
            tenant.Industry.Name,
            tenant.Industry.Code,
            tenant.Status,
            tenant.AdminEmail,
            tenant.PrimaryPhone,
            tenant.GSTIN,
            tenant.PAN,
            tenant.DrugLicenseNumber,
            tenant.FSSAINumber,
            tenant.TimeZone,
            tenant.CurrencyCode,
            tenant.IsActive,
            tenant.CreatedAtUtc,
            tenant.SuspendedAtUtc,
            tenant.SuspensionReason,
            configDto,
            branchesDto,
            subDto,
            totalUsers,
            totalBranches,
            totalWarehouses
        );

        return Result<SuperAdminTenantDetailsDto>.Success(details);
    }

    public async Task<Result> UpdateTenantStatusAsync(Guid tenantId, UpdateTenantStatusRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return Result.Failure("Tenant not found.", "NOT_FOUND");
        }

        var oldStatus = tenant.Status;
        tenant.Status = request.Status;

        if (request.Status == TenantStatus.Suspended)
        {
            tenant.IsActive = false;
            tenant.SuspendedAtUtc = DateTimeOffset.UtcNow;
            tenant.SuspensionReason = request.Reason ?? "Administrative suspension";
        }
        else if (request.Status == TenantStatus.Active || request.Status == TenantStatus.Trial)
        {
            tenant.IsActive = true;
            tenant.SuspendedAtUtc = null;
            tenant.SuspensionReason = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenant.Id,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.TenantSuspension,
            ActionName = "UpdateTenantStatus",
            EntityName = "Tenant",
            EntityId = tenant.Id.ToString(),
            OldValuesJson = JsonSerializer.Serialize(new { Status = oldStatus.ToString() }),
            NewValuesJson = JsonSerializer.Serialize(new { Status = request.Status.ToString(), Reason = request.Reason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> UpdateTenantSubscriptionAsync(Guid tenantId, UpdateTenantSubscriptionRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var plan = await _context.Plans
            .FirstOrDefaultAsync(p => p.Id == request.PlanId && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result.Failure("Specified plan not found.", "NOT_FOUND");
        }

        var currentSub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (currentSub != null)
        {
            currentSub.PlanId = plan.Id;
            currentSub.Status = request.Status;
            currentSub.EndsAtUtc = request.EndsAtUtc;
            currentSub.AutoRenew = request.AutoRenew;
        }
        else
        {
            var newSub = new TenantSubscription
            {
                TenantId = tenantId,
                PlanId = plan.Id,
                Status = request.Status,
                StartsAtUtc = DateTimeOffset.UtcNow,
                EndsAtUtc = request.EndsAtUtc,
                AutoRenew = request.AutoRenew,
                PricePaid = plan.Price
            };
            _context.TenantSubscriptions.Add(newSub);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.PlanUpgrade,
            ActionName = "UpdateTenantSubscription",
            EntityName = "TenantSubscription",
            EntityId = tenantId.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { PlanId = plan.Id, PlanCode = plan.Code, Status = request.Status.ToString(), EndsAtUtc = request.EndsAtUtc }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<ImpersonateTenantResponse>> ImpersonateTenantAsync(Guid tenantId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
            return Result<ImpersonateTenantResponse>.Failure("Tenant not found.", "NOT_FOUND");

        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            user = new Domain.Entities.Identity.User
            {
                TenantId = tenantId,
                Email = tenant.AdminEmail,
                FullName = $"{tenant.BusinessName} Admin",
                IsTenantAdmin = true,
                IsActive = true,
                Designation = "Administrator"
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var roles = new List<string> { Roles.TenantAdmin, "Admin", Roles.SuperAdmin };
        var permissions = new List<string> { "all", "tenant.admin", "sales.*", "purchase.*", "inventory.*" };

        user.IsSuperAdmin = true;

        var token = _jwtTokenGenerator.GenerateAccessToken(
            user,
            roles,
            permissions,
            tenant.Id,
            tenant.Code);

        var authUser = new AuthUserDto(
            Id: user.Id,
            Email: user.Email,
            FullName: user.FullName,
            IsSuperAdmin: true,
            IsTenantAdmin: true,
            TenantId: tenant.Id,
            TenantCode: tenant.Code,
            BusinessName: tenant.BusinessName,
            IndustryCode: tenant.Industry?.Code ?? "PHARMA",
            Roles: roles,
            Permissions: permissions,
            LogoUrl: tenant.LogoUrl
        );

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId ?? Guid.Empty,
            UserEmail = _currentUserContext.Email ?? "superadmin@udyogbill.com",
            Action = AuditActionType.Login,
            ActionName = "SuperAdminImpersonateStore",
            EntityName = "Tenant",
            EntityId = tenantId.ToString(),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<ImpersonateTenantResponse>.Success(new ImpersonateTenantResponse(
            AccessToken: token,
            TenantId: tenant.Id,
            TenantCode: tenant.Code,
            BusinessName: tenant.BusinessName,
            User: authUser
        ));
    }

    #endregion

    #region Dynamic Industry Catalog Management

    public async Task<Result<Guid>> CreateIndustryAsync(CreateIndustryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var exists = await _context.Industries.AnyAsync(i => i.Code == normalizedCode && !i.IsDeleted, cancellationToken);
        if (exists)
        {
            return Result<Guid>.Failure($"Industry with code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var industry = new Industry
        {
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "layers" : request.Icon.Trim(),
            DisplayOrder = request.DisplayOrder,
            DefaultConfigJson = string.IsNullOrWhiteSpace(request.DefaultConfigJson) ? "{}" : request.DefaultConfigJson,
            IsActive = true
        };

        _context.Industries.Add(industry);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateIndustry",
            EntityName = "Industry",
            EntityId = industry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(industry.Id);
    }

    public async Task<Result> UpdateIndustryAsync(Guid industryId, UpdateIndustryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var industry = await _context.Industries.FirstOrDefaultAsync(i => i.Id == industryId && !i.IsDeleted, cancellationToken);
        if (industry == null)
        {
            return Result.Failure("Industry not found.", "NOT_FOUND");
        }

        var oldJson = JsonSerializer.Serialize(industry);

        industry.Name = request.Name.Trim();
        industry.Description = request.Description.Trim();
        industry.Icon = request.Icon.Trim();
        industry.DisplayOrder = request.DisplayOrder;
        industry.IsActive = request.IsActive;
        industry.DefaultConfigJson = request.DefaultConfigJson ?? "{}";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateIndustry",
            EntityName = "Industry",
            EntityId = industry.Id.ToString(),
            OldValuesJson = oldJson,
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteIndustryAsync(Guid industryId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var industry = await _context.Industries.FirstOrDefaultAsync(i => i.Id == industryId && !i.IsDeleted, cancellationToken);
        if (industry == null)
        {
            return Result.Failure("Industry not found.", "NOT_FOUND");
        }

        var inUse = await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.IndustryId == industryId && !t.IsDeleted, cancellationToken);
        if (inUse)
        {
            return Result.Failure("Cannot delete industry because active tenants are registered under it.", "INDUSTRY_IN_USE");
        }

        industry.IsDeleted = true;
        industry.DeletedAtUtc = DateTimeOffset.UtcNow;
        industry.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> AttachFeatureToIndustryAsync(Guid industryId, AttachFeatureToIndustryRequest request, CancellationToken cancellationToken = default)
    {
        var exists = await _context.IndustryFeatures.AnyAsync(inf => inf.IndustryId == industryId && inf.FeatureId == request.FeatureId, cancellationToken);
        if (exists)
        {
            return Result.Failure("Feature already attached to this industry.", "ALREADY_ATTACHED");
        }

        var industryFeature = new IndustryFeature
        {
            IndustryId = industryId,
            FeatureId = request.FeatureId,
            IsEnabledByDefault = request.IsEnabledByDefault,
            DefaultConfigJson = request.DefaultConfigJson
        };

        _context.IndustryFeatures.Add(industryFeature);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DetachFeatureFromIndustryAsync(Guid industryId, Guid featureId, CancellationToken cancellationToken = default)
    {
        var link = await _context.IndustryFeatures.FirstOrDefaultAsync(inf => inf.IndustryId == industryId && inf.FeatureId == featureId, cancellationToken);
        if (link == null)
        {
            return Result.Failure("Feature link not found.", "NOT_FOUND");
        }

        _context.IndustryFeatures.Remove(link);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Plan & Entitlement Management

    public async Task<Result<Guid>> CreatePlanAsync(CreatePlanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var exists = await _context.Plans.AnyAsync(p => p.Code == normalizedCode && !p.IsDeleted, cancellationToken);
        if (exists)
        {
            return Result<Guid>.Failure($"Plan with code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var plan = new Plan
        {
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            BillingCycle = request.BillingCycle,
            Price = request.Price,
            SetupFee = request.SetupFee,
            TrialDays = request.TrialDays,
            MaxUsers = request.MaxUsers,
            MaxBranches = request.MaxBranches,
            MaxWarehouses = request.MaxWarehouses,
            MaxInvoicesPerMonth = request.MaxInvoicesPerMonth,
            MaxStorageMb = request.MaxStorageMb,
            IsPopular = request.IsPopular,
            IsActive = true
        };

        if (request.EntitledFeatureIds != null && request.EntitledFeatureIds.Count > 0)
        {
            foreach (var featId in request.EntitledFeatureIds.Distinct())
            {
                plan.Entitlements.Add(new PlanEntitlement
                {
                    FeatureId = featId,
                    IsIncluded = true
                });
            }
        }

        _context.Plans.Add(plan);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePlan",
            EntityName = "Plan",
            EntityId = plan.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }

    public async Task<Result> UpdatePlanAsync(Guid planId, UpdatePlanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var plan = await _context.Plans
            .Include(p => p.Entitlements)
            .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result.Failure("Plan not found.", "NOT_FOUND");
        }

        var oldValuesJson = JsonSerializer.Serialize(new
        {
            plan.Name,
            plan.Price,
            plan.MaxUsers,
            plan.MaxBranches,
            plan.MaxInvoicesPerMonth
        });

        plan.Name = request.Name.Trim();
        plan.Description = request.Description.Trim();
        plan.BillingCycle = request.BillingCycle;
        plan.Price = request.Price;
        plan.SetupFee = request.SetupFee;
        plan.TrialDays = request.TrialDays;
        plan.MaxUsers = request.MaxUsers;
        plan.MaxBranches = request.MaxBranches;
        plan.MaxWarehouses = request.MaxWarehouses;
        plan.MaxInvoicesPerMonth = request.MaxInvoicesPerMonth;
        plan.MaxStorageMb = request.MaxStorageMb;
        plan.IsActive = request.IsActive;
        plan.IsPopular = request.IsPopular;

        // Sync entitlements
        _context.PlanEntitlements.RemoveRange(plan.Entitlements);
        if (request.EntitledFeatureIds != null && request.EntitledFeatureIds.Count > 0)
        {
            foreach (var featId in request.EntitledFeatureIds.Distinct())
            {
                plan.Entitlements.Add(new PlanEntitlement
                {
                    PlanId = plan.Id,
                    FeatureId = featId,
                    IsIncluded = true
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdatePlan",
            EntityName = "Plan",
            EntityId = plan.Id.ToString(),
            OldValuesJson = oldValuesJson,
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeletePlanAsync(Guid planId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var plan = await _context.Plans.FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted, cancellationToken);
        if (plan == null)
        {
            return Result.Failure("Plan not found.", "NOT_FOUND");
        }

        var inUse = await _context.TenantSubscriptions.IgnoreQueryFilters().AnyAsync(s => s.PlanId == planId && !s.IsDeleted, cancellationToken);
        if (inUse)
        {
            return Result.Failure("Cannot delete plan because active subscribers are assigned to it. You may deactivate it instead.", "PLAN_IN_USE");
        }

        plan.IsDeleted = true;
        plan.DeletedAtUtc = DateTimeOffset.UtcNow;
        plan.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Platform Telemetry & Audit Logs

    public async Task<Result<PlatformStatsDto>> GetPlatformStatsAsync(CancellationToken cancellationToken = default)
    {
        var tenantsQuery = _context.Tenants.IgnoreQueryFilters().Where(t => !t.IsDeleted);

        var totalTenants = await tenantsQuery.CountAsync(cancellationToken);
        var activeTenants = await tenantsQuery.CountAsync(t => t.Status == TenantStatus.Active, cancellationToken);
        var trialTenants = await tenantsQuery.CountAsync(t => t.Status == TenantStatus.Trial, cancellationToken);
        var suspendedTenants = await tenantsQuery.CountAsync(t => t.Status == TenantStatus.Suspended, cancellationToken);

        var totalIndustries = await _context.Industries.CountAsync(i => !i.IsDeleted, cancellationToken);
        var totalPlans = await _context.Plans.CountAsync(p => !p.IsDeleted, cancellationToken);

        var estimatedMrr = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .Where(s => !s.IsDeleted && s.Status == SubscriptionStatus.Active)
            .SumAsync(s => (decimal?)s.Plan.Price, cancellationToken) ?? 0m;

        var industryDistribution = await tenantsQuery
            .Include(t => t.Industry)
            .GroupBy(t => new { t.Industry.Name, t.Industry.Code })
            .Select(g => new IndustryTenantCountDto(g.Key.Name, g.Key.Code, g.Count()))
            .ToListAsync(cancellationToken);

        var stats = new PlatformStatsDto(
            totalTenants,
            activeTenants,
            trialTenants,
            suspendedTenants,
            totalIndustries,
            totalPlans,
            estimatedMrr,
            industryDistribution
        );

        return Result<PlatformStatsDto>.Success(stats);
    }

    public async Task<Result<PagedResult<AuditLogDto>>> GetAuditLogsAsync(AuditLogQueryRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.IgnoreQueryFilters().AsQueryable();

        if (request.TenantId.HasValue && request.TenantId.Value != Guid.Empty)
        {
            query = query.Where(a => a.TenantId == request.TenantId.Value);
        }

        if (request.UserId.HasValue && request.UserId.Value != Guid.Empty)
        {
            query = query.Where(a => a.UserId == request.UserId.Value);
        }

        if (request.Action.HasValue)
        {
            query = query.Where(a => a.Action == request.Action.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            query = query.Where(a => a.EntityName.ToLower() == request.EntityName.Trim().ToLower());
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc <= request.ToDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.TenantId == Guid.Empty ? null : a.TenantId,
                null,
                a.UserId,
                a.UserEmail,
                a.Action,
                a.ActionName,
                a.EntityName,
                a.EntityId,
                a.OldValuesJson,
                a.NewValuesJson,
                a.IpAddress,
                a.UserAgent,
                a.TimestampUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<AuditLogDto>>.Success(PagedResult<AuditLogDto>.Create(items, request.PageNumber, request.PageSize, totalCount));
    }

    #endregion

    public async Task<Result> AssignPackageAndAddOnsAsync(Guid tenantId, AssignPackageAndAddOnsRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);
        if (tenant == null) return Result.Failure("Tenant not found.", "NOT_FOUND");

        var plan = await _context.Plans.FirstOrDefaultAsync(p => p.Id == request.PlanId && !p.IsDeleted, cancellationToken);
        if (plan == null) return Result.Failure("Selected Plan does not exist.", "NOT_FOUND");

        var now = DateTimeOffset.UtcNow;
        var planEnds = request.PlanDurationDays >= 3650 
            ? now.AddYears(10) // Lifetime
            : now.AddDays(request.PlanDurationDays);

        var existingSub = await _context.TenantSubscriptions
            .Include(s => s.SubscriptionAddOns)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && !s.IsDeleted, cancellationToken);

        if (existingSub == null)
        {
            existingSub = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PlanId = plan.Id,
                Status = SubscriptionStatus.Active,
                StartsAtUtc = now,
                EndsAtUtc = planEnds,
                AutoRenew = false,
                PricePaid = 0,
                CurrencyCode = "INR",
                CreatedAtUtc = now
            };
            _context.TenantSubscriptions.Add(existingSub);
        }
        else
        {
            existingSub.PlanId = plan.Id;
            existingSub.Status = SubscriptionStatus.Active;
            existingSub.StartsAtUtc = now;
            existingSub.EndsAtUtc = planEnds;
            existingSub.CancelledAtUtc = null;
            existingSub.CancellationReason = null;
        }

        // Add-ons assignment & Industry Config Synchronization
        var requestedAddons = request.Addons ?? new List<AddonAssignmentDto>();
        var requestedAddonCodes = requestedAddons
            .Select(a => a.AddonCode.Trim().ToUpperInvariant())
            .ToHashSet();

        // 1. Sync TenantIndustryConfig
        var config = await _context.TenantIndustryConfigs.FirstOrDefaultAsync(c => c.TenantId == tenantId, cancellationToken);
        if (config == null)
        {
            config = new TenantIndustryConfig
            {
                TenantId = tenantId,
                IndustryId = tenant.IndustryId,
                ConfigurationJson = "{}"
            };
            _context.TenantIndustryConfigs.Add(config);
        }

        var configDict = new Dictionary<string, bool>();
        try
        {
            if (!string.IsNullOrWhiteSpace(config.ConfigurationJson))
                configDict = JsonSerializer.Deserialize<Dictionary<string, bool>>(config.ConfigurationJson) ?? new();
        }
        catch { }

        // Known vertical add-ons mapping
        var knownAddonKeys = new Dictionary<string, string>
        {
            { "ADDON_PHARMA", "pharma" },
            { "ADDON_PHARMA_SFA", "pharma-sfa" },
            { "ADDON_WHATSAPP", "whatsapp" },
            { "ADDON_EWAYBILL", "ewaybill" },
            { "ADDON_MANUFACTURING", "manufacturing" },
            { "ADDON_GARMENTS", "garments" },
            { "ADDON_FMCG", "fmcg" },
            { "ADDON_ACCOUNTING", "accounting" }
        };

        foreach (var (addonCode, dictKey) in knownAddonKeys)
        {
            bool isRequested = requestedAddonCodes.Contains(addonCode);
            configDict[dictKey] = isRequested;

            if (addonCode == "ADDON_PHARMA_SFA")
            {
                tenant.IsPharmaSfaActive = isRequested;
                if (isRequested)
                {
                    if (tenant.MaxAllowedMrUsers <= 0) tenant.MaxAllowedMrUsers = 15;
                    if (tenant.MaxAllowedManagerUsers <= 0) tenant.MaxAllowedManagerUsers = 5;
                }
            }
            else if (addonCode == "ADDON_PHARMA")
            {
                config.EnableBatchTracking = isRequested;
                config.EnableExpiryTracking = isRequested;
                config.EnableScheduleH1DrugTracking = isRequested;
            }
            else if (addonCode == "ADDON_GARMENTS")
            {
                config.EnableSizeColorMatrix = isRequested;
            }
            else if (addonCode == "ADDON_MANUFACTURING")
            {
                config.EnableRecipeBOM = isRequested;
            }
            else if (addonCode == "ADDON_FMCG")
            {
                config.EnableMultiUnitConversion = isRequested;
            }
            else if (addonCode == "ADDON_EWAYBILL")
            {
                config.EnableEWayBill = isRequested;
                config.EnableEInvoicing = isRequested;
            }
        }

        config.ConfigurationJson = JsonSerializer.Serialize(configDict);

        // 2. Sync TenantSubscriptionAddOns
        var allTenantAddons = await _context.TenantSubscriptionAddOns
            .Include(sa => sa.AddOn)
            .Where(sa => sa.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        // Expire any add-on that is no longer selected
        foreach (var sa in allTenantAddons)
        {
            if (sa.AddOn != null && !requestedAddonCodes.Contains(sa.AddOn.Code.ToUpperInvariant()))
            {
                sa.ExpiresAtUtc = now.AddMinutes(-1);
            }
        }

        // Grant / extend requested add-ons
        foreach (var addonDto in requestedAddons)
        {
            var normCode = addonDto.AddonCode.Trim().ToUpperInvariant();
            var addon = await _context.AddOns.FirstOrDefaultAsync(a => a.Code == normCode && !a.IsDeleted, cancellationToken);
            if (addon == null)
            {
                addon = new AddOn
                {
                    Id = Guid.NewGuid(),
                    Code = normCode,
                    Name = normCode.Replace("ADDON_", "").Replace("_", " "),
                    Description = "Special Add-on Module",
                    Price = 499,
                    AnnualPrice = 4990,
                    IsActive = true,
                    CreatedAtUtc = now
                };
                _context.AddOns.Add(addon);
                await _context.SaveChangesAsync(cancellationToken);
            }

            var addonExpiry = addonDto.DurationDays >= 3650 ? now.AddYears(10) : now.AddDays(addonDto.DurationDays);
            var existingTenantAddon = allTenantAddons.FirstOrDefault(a => a.AddOnId == addon.Id);
            if (existingTenantAddon != null)
            {
                existingTenantAddon.ExpiresAtUtc = addonExpiry;
            }
            else
            {
                _context.TenantSubscriptionAddOns.Add(new TenantSubscriptionAddOn
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    TenantSubscriptionId = existingSub.Id,
                    AddOnId = addon.Id,
                    Quantity = 1,
                    UnitPrice = 0,
                    ExpiresAtUtc = addonExpiry,
                    CreatedAtUtc = now
                });
            }
        }

        tenant.Status = TenantStatus.Active;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ExtendTenantTrialAsync(Guid tenantId, ExtendTenantTrialRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);
        if (tenant == null) return Result.Failure("Tenant not found.", "NOT_FOUND");

        var sub = await _context.TenantSubscriptions.FirstOrDefaultAsync(s => s.TenantId == tenantId && !s.IsDeleted, cancellationToken);
        var days = Math.Max(1, request.ExtensionDays);
        var now = DateTimeOffset.UtcNow;

        if (sub == null)
        {
            var defaultPlan = await _context.Plans.FirstOrDefaultAsync(p => !p.IsDeleted, cancellationToken);
            if (defaultPlan == null) return Result.Failure("No subscription plan available.", "NOT_FOUND");

            sub = new TenantSubscription
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PlanId = defaultPlan.Id,
                Status = SubscriptionStatus.Trial,
                StartsAtUtc = now,
                EndsAtUtc = now.AddDays(days),
                TrialEndsAtUtc = now.AddDays(days),
                CreatedAtUtc = now
            };
            _context.TenantSubscriptions.Add(sub);
        }
        else
        {
            var baseDate = (sub.TrialEndsAtUtc.HasValue && sub.TrialEndsAtUtc.Value > now)
                ? sub.TrialEndsAtUtc.Value
                : now;

            sub.TrialEndsAtUtc = baseDate.AddDays(days);
            sub.EndsAtUtc = sub.TrialEndsAtUtc.Value;
            sub.Status = SubscriptionStatus.Trial;
        }

        tenant.Status = TenantStatus.Trial;
        tenant.SuspendedAtUtc = null;
        tenant.SuspensionReason = null;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<PlanDto>>> GetPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _context.Plans
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted)
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new PlanDto(
                p.Id,
                p.Code,
                p.Name,
                p.Description,
                p.BillingCycle,
                p.Price,
                p.TrialDays,
                p.MaxUsers,
                p.MaxBranches,
                p.MaxWarehouses,
                p.MaxInvoicesPerMonth,
                p.MaxStorageMb,
                p.IsPopular,
                p.IsActive,
                p.Entitlements.Where(e => e.IsIncluded).Select(e => e.Feature.Code).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<PlanDto>>.Success(plans);
    }

    public async Task<Result<PlatformCommercialConfigDto>> GetCommercialConfigAsync(CancellationToken cancellationToken = default)
    {
        var config = await _context.PlatformCommercialConfigs
            .IgnoreQueryFilters()
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new PlatformCommercialConfig
            {
                CoreAnnualPrice = 3999m,
                CoreBiennialPrice = 6999m,
                IncludedUsers = 2,
                SingleUserAnnualPrice = 799m,
                FiveUserPackAnnualPrice = 2999m,
                AiProAnnualPrice = 1499m,
                AiProMonthlyScanLimit = 500,
                GstRatePercent = 18.0m,
                IsActive = true,
                Notes = "Default system configuration"
            };
            _context.PlatformCommercialConfigs.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new PlatformCommercialConfigDto(
            config.Id,
            config.CoreAnnualPrice,
            config.CoreBiennialPrice,
            config.IncludedUsers,
            config.SingleUserAnnualPrice,
            config.FiveUserPackAnnualPrice,
            config.AiProAnnualPrice,
            config.AiProMonthlyScanLimit,
            config.GstRatePercent,
            config.IsActive,
            config.UpdatedAtUtc,
            config.LastUpdatedByEmail,
            config.Notes,
            config.PharmaSfaAnnualBasePrice,
            config.PharmaSfaMonthlyBasePrice,
            config.MrSeatAnnualPrice,
            config.MrSeatMonthlyPrice,
            config.ManagerSeatAnnualPrice,
            config.ManagerSeatMonthlyPrice
        );

        return Result<PlatformCommercialConfigDto>.Success(dto);
    }

    public async Task<Result> UpdateCommercialConfigAsync(UpdateCommercialConfigRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var config = await _context.PlatformCommercialConfigs
            .IgnoreQueryFilters()
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new PlatformCommercialConfig();
            _context.PlatformCommercialConfigs.Add(config);
        }

        config.CoreAnnualPrice = Math.Max(0m, request.CoreAnnualPrice);
        config.CoreBiennialPrice = Math.Max(0m, request.CoreBiennialPrice);
        config.IncludedUsers = Math.Max(1, request.IncludedUsers);
        config.SingleUserAnnualPrice = Math.Max(0m, request.SingleUserAnnualPrice);
        config.FiveUserPackAnnualPrice = Math.Max(0m, request.FiveUserPackAnnualPrice);
        config.AiProAnnualPrice = Math.Max(0m, request.AiProAnnualPrice);
        config.AiProMonthlyScanLimit = Math.Max(10, request.AiProMonthlyScanLimit);
        config.GstRatePercent = Math.Max(0m, request.GstRatePercent);

        // Pharma SFA Pricing
        config.PharmaSfaAnnualBasePrice = Math.Max(0m, request.PharmaSfaAnnualBasePrice);
        config.PharmaSfaMonthlyBasePrice = Math.Max(0m, request.PharmaSfaMonthlyBasePrice);
        config.MrSeatAnnualPrice = Math.Max(0m, request.MrSeatAnnualPrice);
        config.MrSeatMonthlyPrice = Math.Max(0m, request.MrSeatMonthlyPrice);
        config.ManagerSeatAnnualPrice = Math.Max(0m, request.ManagerSeatAnnualPrice);
        config.ManagerSeatMonthlyPrice = Math.Max(0m, request.ManagerSeatMonthlyPrice);

        config.Notes = request.Notes ?? config.Notes;
        config.UpdatedAtUtc = DateTimeOffset.UtcNow;

        var coreAnnualPlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "CORE_ANNUAL", cancellationToken);
        if (coreAnnualPlan != null)
        {
            coreAnnualPlan.Price = config.CoreAnnualPrice;
            coreAnnualPlan.MaxUsers = config.IncludedUsers;
        }

        var coreBiennialPlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "CORE_BIENNIAL", cancellationToken);
        if (coreBiennialPlan != null)
        {
            coreBiennialPlan.Price = config.CoreBiennialPrice;
            coreBiennialPlan.MaxUsers = config.IncludedUsers;
        }

        var singleUserAddon = await _context.AddOns.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Code == "ADDON_EXTRA_1_USER", cancellationToken);
        if (singleUserAddon != null)
        {
            singleUserAddon.Price = config.SingleUserAnnualPrice;
            singleUserAddon.AnnualPrice = config.SingleUserAnnualPrice;
        }

        var fiveUserAddon = await _context.AddOns.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Code == "ADDON_EXTRA_5_USERS", cancellationToken);
        if (fiveUserAddon != null)
        {
            fiveUserAddon.Price = config.FiveUserPackAnnualPrice;
            fiveUserAddon.AnnualPrice = config.FiveUserPackAnnualPrice;
        }

        var aiProAddon = await _context.AddOns.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Code == "ADDON_AI_PRO", cancellationToken);
        if (aiProAddon != null)
        {
            aiProAddon.Price = config.AiProAnnualPrice;
            aiProAddon.AnnualPrice = config.AiProAnnualPrice;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
