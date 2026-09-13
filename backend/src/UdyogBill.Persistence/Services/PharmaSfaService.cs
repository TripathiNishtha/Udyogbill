using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Pharma;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PharmaSfaService : IPharmaSfaService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly ISalesService _salesService;
    private readonly IPasswordHasher _passwordHasher;

    public PharmaSfaService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        ISalesService salesService,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _salesService = salesService;
        _passwordHasher = passwordHasher;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required for Pharma SFA operations.");
        }

        return tenantId;
    }

    #region 1. Pricing, Licensing & Seat Quotas

    public async Task<Result<PharmaSubscriptionQuoteDto>> CalculatePharmaQuoteAsync(
        bool isAnnual,
        int mrSeats,
        int managerSeats,
        CancellationToken cancellationToken = default)
    {
        var config = await _context.PlatformCommercialConfigs
            .IgnoreQueryFilters()
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken) ?? new Domain.Entities.Subscriptions.PlatformCommercialConfig();

        var basePrice = isAnnual ? config.PharmaSfaAnnualBasePrice : config.PharmaSfaMonthlyBasePrice;
        var mrRate = isAnnual ? config.MrSeatAnnualPrice : config.MrSeatMonthlyPrice;
        var managerRate = isAnnual ? config.ManagerSeatAnnualPrice : config.ManagerSeatMonthlyPrice;

        var totalMrPrice = Math.Max(0, mrSeats) * mrRate;
        var totalManagerPrice = Math.Max(0, managerSeats) * managerRate;
        var subTotal = basePrice + totalMrPrice + totalManagerPrice;
        var gstAmount = Math.Round(subTotal * (config.GstRatePercent / 100m), 2);
        var grandTotal = subTotal + gstAmount;

        var quote = new PharmaSubscriptionQuoteDto(
            BasePrice: basePrice,
            MrSeats: mrSeats,
            MrSeatRate: mrRate,
            TotalMrSeatPrice: totalMrPrice,
            ManagerSeats: managerSeats,
            ManagerSeatRate: managerRate,
            TotalManagerSeatPrice: totalManagerPrice,
            SubTotal: subTotal,
            GstRatePercent: config.GstRatePercent,
            GstAmount: gstAmount,
            GrandTotal: grandTotal,
            IsAnnual: isAnnual
        );

        return Result<PharmaSubscriptionQuoteDto>.Success(quote);
    }

    public async Task<Result<bool>> ActivatePharmaSfaAsync(
        ActivatePharmaSfaRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);

        if (tenant == null)
            return Result<bool>.Failure("Tenant not found.", "NOT_FOUND");

        tenant.IsPharmaSfaActive = true;
        tenant.MaxAllowedMrUsers = Math.Max(0, request.MrSeats);
        tenant.MaxAllowedManagerUsers = Math.Max(0, request.ManagerSeats);
        tenant.IndustryTypeCode = "PHARMA";
        tenant.ActiveIndustryModule = "PHARMA";
        tenant.IndustryModuleStatus = Domain.Enums.IndustryModuleStatus.Active;
        tenant.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> DeactivateTenantPharmaSfaForAdminAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
            return Result<bool>.Failure("Tenant not found.", "NOT_FOUND");

        tenant.IsPharmaSfaActive = false;
        tenant.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<SeatQuotaStatusDto>> GetSeatQuotaStatusAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
            return Result<SeatQuotaStatusDto>.Failure("Tenant not found.", "NOT_FOUND");

        var activeMrCount = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.IsActive && u.Designation == "MedicalRepresentative", cancellationToken);

        var activeManagerCount = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.IsActive && (u.Designation == "AreaManager" || u.Designation == "RegionalManager"), cancellationToken);

        var maxMr = tenant.MaxAllowedMrUsers > 0 ? tenant.MaxAllowedMrUsers : 15;
        var maxMgr = tenant.MaxAllowedManagerUsers > 0 ? tenant.MaxAllowedManagerUsers : 5;
        var isPharmaIndustry = string.Equals(tenant.IndustryTypeCode, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(tenant.ActiveIndustryModule, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(tenant.Industry?.Code, "PHARMA", StringComparison.OrdinalIgnoreCase);
        var isSfaActive = isPharmaIndustry && tenant.IsPharmaSfaActive;

        var status = new SeatQuotaStatusDto(
            IsPharmaSfaActive: isSfaActive,
            MaxAllowedMrUsers: maxMr,
            CurrentActiveMrUsers: activeMrCount,
            CanAddMoreMr: activeMrCount < maxMr,
            MaxAllowedManagerUsers: maxMgr,
            CurrentActiveManagerUsers: activeManagerCount,
            CanAddMoreManager: activeManagerCount < maxMgr
        );

        return Result<SeatQuotaStatusDto>.Success(status);
    }

    public async Task<Result<bool>> ActivateTenantPharmaSfaAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant == null)
            return Result<bool>.Failure("Tenant not found.", "NOT_FOUND");

        var isPharmaIndustry = string.Equals(tenant.IndustryTypeCode, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(tenant.ActiveIndustryModule, "PHARMA", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(tenant.Industry?.Code, "PHARMA", StringComparison.OrdinalIgnoreCase);

        if (!isPharmaIndustry)
        {
            return Result<bool>.Failure("Pharma SFA is an exclusive add-on only available for Pharma industry subscribers.", "FORBIDDEN");
        }

        tenant.IsPharmaSfaActive = true;
        if (tenant.MaxAllowedMrUsers <= 0) tenant.MaxAllowedMrUsers = 15;
        if (tenant.MaxAllowedManagerUsers <= 0) tenant.MaxAllowedManagerUsers = 5;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> DeactivateTenantPharmaSfaAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant == null)
            return Result<bool>.Failure("Tenant not found.", "NOT_FOUND");

        tenant.IsPharmaSfaActive = false;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ValidateSeatAdditionAsync(string roleCode, CancellationToken cancellationToken = default)
    {
        var quota = await GetSeatQuotaStatusAsync(cancellationToken);
        if (!quota.IsSuccess || quota.Data == null)
            return Result<bool>.Failure("Unable to retrieve quota.", "QUOTA_ERROR");

        if (!quota.Data.IsPharmaSfaActive)
            return Result<bool>.Failure("Pharma SFA Add-on is not active for this organization.", "ADDON_INACTIVE");

        if (roleCode.Equals("MedicalRepresentative", StringComparison.OrdinalIgnoreCase) || roleCode.Equals("MR", StringComparison.OrdinalIgnoreCase))
        {
            if (!quota.Data.CanAddMoreMr)
                return Result<bool>.Failure($"MR seat limit reached ({quota.Data.CurrentActiveMrUsers}/{quota.Data.MaxAllowedMrUsers}). Please purchase additional MR seats.", "MR_SEAT_LIMIT_EXCEEDED");
        }
        else if (roleCode.Contains("Manager", StringComparison.OrdinalIgnoreCase))
        {
            if (!quota.Data.CanAddMoreManager)
                return Result<bool>.Failure($"Field Manager seat limit reached ({quota.Data.CurrentActiveManagerUsers}/{quota.Data.MaxAllowedManagerUsers}). Please upgrade manager seats.", "MANAGER_SEAT_LIMIT_EXCEEDED");
        }

        return Result<bool>.Success(true);
    }

    #endregion

    #region 2. Masters (Divisions, Territories, Patches, Beats, Employees, Doctors, Chemists, Allocations)

    public async Task<Result<IReadOnlyList<SfaDivisionDto>>> GetDivisionsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var list = await _context.SfaDivisions
            .Where(d => d.TenantId == tenantId)
            .OrderBy(d => d.Name)
            .Select(d => new SfaDivisionDto(
                d.Id,
                d.Code,
                d.Name,
                d.Description,
                d.IsActive,
                _context.SfaEmployeeProfiles.Count(e => e.DivisionId == d.Id && e.TenantId == tenantId),
                _context.SfaPatches.Count(p => p.DivisionId == d.Id && p.TenantId == tenantId)
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaDivisionDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreateDivisionAsync(CreateDivisionRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var division = new SfaDivision
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true
        };
        _context.SfaDivisions.Add(division);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(division.Id);
    }

    public async Task<Result<IReadOnlyList<SfaTerritoryDto>>> GetTerritoriesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var list = await _context.SfaTerritories
            .Where(t => t.TenantId == tenantId)
            .Include(t => t.ParentTerritory)
            .OrderBy(t => t.Name)
            .Select(t => new SfaTerritoryDto(
                t.Id,
                t.Code,
                t.Name,
                t.Type,
                t.ParentTerritoryId,
                t.ParentTerritory != null ? t.ParentTerritory.Name : null,
                t.State,
                t.City,
                t.CoveredPincodes,
                t.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaTerritoryDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreateTerritoryAsync(CreateTerritoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var territory = new SfaTerritory
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Type = request.Type,
            ParentTerritoryId = request.ParentTerritoryId,
            State = request.State,
            City = request.City,
            CoveredPincodes = request.CoveredPincodes,
            IsActive = true
        };

        _context.SfaTerritories.Add(territory);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(territory.Id);
    }

    public async Task<Result<bool>> UpdateTerritoryAsync(Guid id, UpdateTerritoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var territory = await _context.SfaTerritories
            .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId, cancellationToken);

        if (territory == null)
            return Result<bool>.Failure("Territory not found.");

        territory.Code = request.Code.Trim().ToUpperInvariant();
        territory.Name = request.Name.Trim();
        territory.Type = request.Type;
        territory.ParentTerritoryId = request.ParentTerritoryId;
        territory.State = request.State;
        territory.City = request.City;
        territory.CoveredPincodes = request.CoveredPincodes;
        territory.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> DeleteTerritoryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var territory = await _context.SfaTerritories
            .FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId, cancellationToken);

        if (territory == null)
            return Result<bool>.Failure("Territory not found.");

        var linkedPatchesCount = await _context.SfaPatches
            .CountAsync(p => p.AreaTerritoryId == id && p.TenantId == tenantId, cancellationToken);
        if (linkedPatchesCount > 0)
        {
            return Result<bool>.Failure($"Cannot delete: {linkedPatchesCount} Calling Patch(es) are linked to this Territory. Reassign or delete the patches first.");
        }

        var linkedDoctorsCount = await _context.SfaDoctors
            .CountAsync(d => d.TerritoryId == id && d.TenantId == tenantId, cancellationToken);
        if (linkedDoctorsCount > 0)
        {
            return Result<bool>.Failure($"Cannot delete: {linkedDoctorsCount} Doctor(s) are linked to this Territory.");
        }

        var linkedChemistsCount = await _context.SfaChemists
            .CountAsync(c => c.TerritoryId == id && c.TenantId == tenantId, cancellationToken);
        if (linkedChemistsCount > 0)
        {
            return Result<bool>.Failure($"Cannot delete: {linkedChemistsCount} Chemist(s) are linked to this Territory.");
        }

        _context.SfaTerritories.Remove(territory);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<SfaPatchDto>>> GetPatchesAsync(Guid? divisionId = null, Guid? areaTerritoryId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaPatches
            .Where(p => p.TenantId == tenantId)
            .Include(p => p.Division)
            .Include(p => p.AreaTerritory)
            .AsQueryable();

        if (divisionId.HasValue)
            query = query.Where(p => p.DivisionId == divisionId.Value);

        if (areaTerritoryId.HasValue)
            query = query.Where(p => p.AreaTerritoryId == areaTerritoryId.Value);

        var list = await query
            .OrderBy(p => p.Name)
            .Select(p => new SfaPatchDto(
                p.Id,
                p.Code,
                p.Name,
                p.DivisionId,
                p.Division != null ? p.Division.Name : null,
                p.AreaTerritoryId,
                p.AreaTerritory != null ? p.AreaTerritory.Name : null,
                p.HeadquarterCity,
                p.Description,
                p.IsActive,
                _context.SfaBeats.Count(b => b.PatchId == p.Id && b.TenantId == tenantId),
                _context.SfaDoctors.Count(d => d.PatchId == p.Id && d.TenantId == tenantId),
                _context.SfaChemists.Count(c => c.PatchId == p.Id && c.TenantId == tenantId)
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaPatchDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreatePatchAsync(CreatePatchRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var patch = new SfaPatch
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            DivisionId = request.DivisionId,
            AreaTerritoryId = request.AreaTerritoryId,
            HeadquarterCity = request.HeadquarterCity?.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true
        };
        _context.SfaPatches.Add(patch);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(patch.Id);
    }

    public async Task<Result<IReadOnlyList<SfaBeatDto>>> GetBeatsAsync(Guid? patchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaBeats
            .Where(b => b.TenantId == tenantId)
            .Include(b => b.Patch)
            .AsQueryable();

        if (patchId.HasValue)
            query = query.Where(b => b.PatchId == patchId.Value);

        var list = await query
            .OrderBy(b => b.SequenceOrder)
            .Select(b => new SfaBeatDto(
                b.Id,
                b.Code,
                b.Name,
                b.PatchId,
                b.Patch.Name,
                b.ScheduledDayOfWeek,
                b.SequenceOrder,
                b.RouteDescription,
                b.EstimatedDistanceKm,
                b.IsActive,
                _context.SfaDoctors.Count(d => d.BeatId == b.Id && d.TenantId == tenantId),
                _context.SfaChemists.Count(c => c.BeatId == b.Id && c.TenantId == tenantId)
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaBeatDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreateBeatAsync(CreateBeatRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var beat = new SfaBeat
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            PatchId = request.PatchId,
            ScheduledDayOfWeek = request.ScheduledDayOfWeek,
            SequenceOrder = request.SequenceOrder,
            RouteDescription = request.RouteDescription?.Trim(),
            EstimatedDistanceKm = request.EstimatedDistanceKm,
            IsActive = true
        };
        _context.SfaBeats.Add(beat);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(beat.Id);
    }

    public async Task<Result<IReadOnlyList<SfaEmployeeProfileDto>>> GetEmployeesAsync(Guid? divisionId = null, SfaDesignationRole? role = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var allProfiles = await _context.SfaEmployeeProfiles
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.User)
            .Include(e => e.Division)
            .Include(e => e.Territory)
            .Include(e => e.Patch)
            .Include(e => e.ReportingToUser)
            .ToListAsync(cancellationToken);

        var query = allProfiles.AsEnumerable();

        if (divisionId.HasValue)
            query = query.Where(e => e.DivisionId == divisionId.Value);

        if (role.HasValue)
            query = query.Where(e => e.DesignationRole == role.Value);

        var list = query
            .OrderBy(e => e.User.FullName)
            .Select(e =>
            {
                var isManager = e.DesignationRole > SfaDesignationRole.MedicalRepresentative;
                var directReportees = allProfiles.Where(x => x.ReportingToUserId == e.UserId).ToList();
                var subordinateMrs = isManager ? GetSubordinateMrs(e.UserId, allProfiles) : new List<SfaEmployeeProfile>();

                decimal rollupTarget;
                bool isAutoCalculated;

                if (isManager)
                {
                    rollupTarget = subordinateMrs.Count > 0
                        ? subordinateMrs.Sum(m => m.MonthlyTargetAmount)
                        : e.MonthlyTargetAmount;
                    isAutoCalculated = subordinateMrs.Count > 0;
                }
                else
                {
                    rollupTarget = e.MonthlyTargetAmount;
                    isAutoCalculated = false;
                }

                string? territorySummary;
                if (isManager && subordinateMrs.Count > 0)
                {
                    var territoryNames = subordinateMrs
                        .Select(m => m.Territory?.Name ?? m.HeadquarterCity)
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Distinct()
                        .ToList();

                    territorySummary = territoryNames.Count > 0
                        ? $"{subordinateMrs.Count} MRs: {string.Join(", ", territoryNames.Take(3))}{(territoryNames.Count > 3 ? "..." : "")}"
                        : $"{subordinateMrs.Count} MRs Covered";
                }
                else
                {
                    territorySummary = e.Territory?.Name ?? e.HeadquarterCity;
                }

                return new SfaEmployeeProfileDto(
                    e.Id,
                    e.UserId,
                    e.EmployeeCode,
                    e.User.FullName,
                    e.User.Email,
                    e.Mobile ?? e.User.PhoneNumber,
                    e.Gender,
                    e.DesignationRole,
                    e.DesignationTitle,
                    e.DivisionId,
                    e.Division?.Name,
                    e.TerritoryId,
                    e.Territory?.Name,
                    e.PatchId,
                    e.Patch?.Name,
                    e.ReportingToUserId,
                    e.ReportingToUser?.FullName,
                    e.HeadquarterCity,
                    e.JoiningDate,
                    e.DailyAllowanceRate,
                    e.MonthlyExpenseLimit,
                    e.MonthlyTargetAmount,
                    e.IsActive,
                    RollupTargetAmount: rollupTarget,
                    IsTargetAutoCalculated: isAutoCalculated,
                    DirectReporteesCount: directReportees.Count,
                    TotalSubordinateMrsCount: subordinateMrs.Count,
                    CoveredTerritorySummary: territorySummary
                );
            })
            .ToList();

        return Result<IReadOnlyList<SfaEmployeeProfileDto>>.Success(list);
    }

    private static List<SfaEmployeeProfile> GetSubordinateMrs(Guid managerUserId, List<SfaEmployeeProfile> allEmployees)
    {
        var result = new List<SfaEmployeeProfile>();
        var queue = new Queue<Guid>();
        queue.Enqueue(managerUserId);

        var visited = new HashSet<Guid> { managerUserId };

        while (queue.Count > 0)
        {
            var currentManagerId = queue.Dequeue();
            var directSubordinates = allEmployees.Where(x => x.ReportingToUserId == currentManagerId).ToList();

            foreach (var sub in directSubordinates)
            {
                if (sub.DesignationRole == SfaDesignationRole.MedicalRepresentative)
                {
                    result.Add(sub);
                }
                else if (visited.Add(sub.UserId))
                {
                    queue.Enqueue(sub.UserId);
                }
            }
        }

        return result;
    }

    public async Task<Result<Guid>> CreateOrUpdateEmployeeAsync(CreateOrUpdateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        SfaEmployeeProfile profile;

        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            profile = await _context.SfaEmployeeProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == request.Id.Value && p.TenantId == tenantId, cancellationToken);

            if (profile == null)
                return Result<Guid>.Failure("Employee profile not found.", "NOT_FOUND");

            profile.EmployeeCode = request.EmployeeCode.Trim().ToUpperInvariant();
            profile.DesignationRole = request.DesignationRole;
            profile.DesignationTitle = string.IsNullOrWhiteSpace(request.DesignationTitle) ? request.DesignationRole.ToString() : request.DesignationTitle.Trim();
            profile.DivisionId = request.DivisionId;
            profile.TerritoryId = request.TerritoryId;
            profile.PatchId = request.DesignationRole > SfaDesignationRole.MedicalRepresentative ? null : request.PatchId;
            profile.ReportingToUserId = request.ReportingToUserId;
            profile.HeadquarterCity = request.HeadquarterCity?.Trim() ?? string.Empty;
            profile.DailyAllowanceRate = request.DailyAllowanceRate;
            profile.MonthlyExpenseLimit = request.MonthlyExpenseLimit;
            profile.MonthlyTargetAmount = request.MonthlyTargetAmount;
            profile.Mobile = request.Mobile?.Trim();
            profile.Email = request.Email?.Trim().ToLowerInvariant();
            profile.Gender = request.Gender;
            profile.IsActive = request.IsActive;

            profile.User.FullName = request.FullName.Trim();
            profile.User.PhoneNumber = request.Mobile?.Trim() ?? profile.User.PhoneNumber;
        }
        else
        {
            var roleCode = request.DesignationRole == SfaDesignationRole.MedicalRepresentative ? "MR" : "Manager";
            var canAdd = await ValidateSeatAdditionAsync(roleCode, cancellationToken);
            if (!canAdd.IsSuccess || !canAdd.Data)
            {
                return Result<Guid>.Failure($"Cannot add more {roleCode} seats. Seat limit reached for current plan. Please upgrade seats from Super Admin.", "SEAT_LIMIT_REACHED");
            }

            var email = request.Email.Trim().ToLowerInvariant();
            var existingUser = await _context.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email, cancellationToken);

            User user;
            if (existingUser != null)
            {
                user = existingUser;
            }
            else
            {
                var password = string.IsNullOrWhiteSpace(request.Password) ? "UdyogBill@123" : request.Password;
                var pwdHash = _passwordHasher.HashPassword(password, out var salt);

                user = new User
                {
                    TenantId = tenantId,
                    Email = email,
                    FullName = request.FullName.Trim(),
                    PhoneNumber = request.Mobile?.Trim() ?? string.Empty,
                    PasswordHash = pwdHash,
                    PasswordSalt = salt,
                    IsActive = true,
                    EmailConfirmed = true,
                    Designation = request.DesignationTitle
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync(cancellationToken);
            }

            profile = new SfaEmployeeProfile
            {
                TenantId = tenantId,
                UserId = user.Id,
                EmployeeCode = request.EmployeeCode.Trim().ToUpperInvariant(),
                DesignationRole = request.DesignationRole,
                DesignationTitle = string.IsNullOrWhiteSpace(request.DesignationTitle) ? request.DesignationRole.ToString() : request.DesignationTitle.Trim(),
                DivisionId = request.DivisionId,
                TerritoryId = request.TerritoryId,
                PatchId = request.DesignationRole > SfaDesignationRole.MedicalRepresentative ? null : request.PatchId,
                ReportingToUserId = request.ReportingToUserId,
                HeadquarterCity = request.HeadquarterCity?.Trim() ?? string.Empty,
                JoiningDate = request.JoiningDate ?? DateTime.UtcNow,
                DailyAllowanceRate = request.DailyAllowanceRate,
                MonthlyExpenseLimit = request.MonthlyExpenseLimit,
                MonthlyTargetAmount = request.MonthlyTargetAmount,
                Mobile = request.Mobile?.Trim(),
                Email = email,
                Gender = request.Gender,
                IsActive = request.IsActive
            };
            _context.SfaEmployeeProfiles.Add(profile);
        }

        // Subordinate MR mapping if provided
        if (request.AssignedSubordinateUserIds != null && request.AssignedSubordinateUserIds.Count > 0)
        {
            var subordinates = await _context.SfaEmployeeProfiles
                .Where(p => p.TenantId == tenantId && request.AssignedSubordinateUserIds.Contains(p.UserId))
                .ToListAsync(cancellationToken);

            foreach (var sub in subordinates)
            {
                sub.ReportingToUserId = profile.UserId;
                if (profile.DesignationRole == SfaDesignationRole.AreaBusinessManager)
                {
                    sub.ReportingAbmUserId = profile.UserId;
                }
                else if (profile.DesignationRole == SfaDesignationRole.RegionalSalesManager)
                {
                    sub.ReportingRsmUserId = profile.UserId;
                }
                else if (profile.DesignationRole == SfaDesignationRole.ZonalSalesManager)
                {
                    sub.ReportingZsmUserId = profile.UserId;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(profile.Id);
    }

    public async Task<Result<IReadOnlyList<SfaDoctorDto>>> GetDoctorsAsync(Guid? territoryId = null, Guid? patchId = null, Guid? beatId = null, Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaDoctors
            .Where(d => d.TenantId == tenantId)
            .Include(d => d.Division)
            .Include(d => d.Territory)
            .Include(d => d.Patch)
            .Include(d => d.Beat)
            .Include(d => d.AssignedMrUser)
            .AsQueryable();

        if (territoryId.HasValue)
            query = query.Where(d => d.TerritoryId == territoryId.Value);

        if (patchId.HasValue)
            query = query.Where(d => d.PatchId == patchId.Value);

        if (beatId.HasValue)
            query = query.Where(d => d.BeatId == beatId.Value);

        if (mrUserId.HasValue)
            query = query.Where(d => d.AssignedMrUserId == mrUserId.Value);

        var list = await query
            .OrderBy(d => d.Name)
            .Select(d => new SfaDoctorDto(
                d.Id,
                d.Code,
                d.Name,
                d.Specialty,
                d.Qualification,
                d.RegistrationNumber,
                d.ClinicHospitalName,
                d.Address,
                d.City,
                d.State,
                d.Pincode,
                d.Mobile,
                d.Email,
                d.DivisionId,
                d.Division != null ? d.Division.Name : null,
                d.TerritoryId,
                d.Territory != null ? d.Territory.Name : null,
                d.PatchId,
                d.Patch != null ? d.Patch.Name : null,
                d.BeatId,
                d.Beat != null ? d.Beat.Name : null,
                d.AssignedMrUserId,
                d.AssignedMrUser != null ? d.AssignedMrUser.FullName : null,
                d.Classification,
                d.SubSpecialty,
                d.Priority,
                d.VisitFrequencyPerMonth,
                d.PreferredVisitDay,
                d.PreferredVisitTime,
                d.EstimatedMonthlyPotential,
                d.Latitude,
                d.Longitude,
                d.GeofenceRadiusMeters,
                d.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaDoctorDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreateDoctorAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var doc = new SfaDoctor
        {
            TenantId = tenantId,
            Code = string.IsNullOrWhiteSpace(request.Code) ? $"DOC-{Random.Shared.Next(100, 999)}" : request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Specialty = request.Specialty.Trim(),
            SubSpecialty = request.SubSpecialty?.Trim(),
            Priority = request.Priority ?? "High",
            Qualification = request.Qualification.Trim(),
            RegistrationNumber = request.RegistrationNumber.Trim(),
            ClinicHospitalName = request.ClinicHospitalName.Trim(),
            Address = request.Address.Trim(),
            City = request.City.Trim(),
            State = request.State,
            Pincode = request.Pincode,
            Mobile = request.Mobile.Trim(),
            Email = request.Email,
            DivisionId = request.DivisionId,
            TerritoryId = request.TerritoryId,
            PatchId = request.PatchId,
            BeatId = request.BeatId,
            AssignedMrUserId = request.AssignedMrUserId,
            Classification = request.Classification,
            VisitFrequencyPerMonth = Math.Max(1, request.VisitFrequencyPerMonth),
            PreferredVisitDay = request.PreferredVisitDay,
            PreferredVisitTime = request.PreferredVisitTime,
            EstimatedMonthlyPotential = Math.Max(0m, request.EstimatedMonthlyPotential),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeofenceRadiusMeters = request.GeofenceRadiusMeters > 0 ? request.GeofenceRadiusMeters : 200,
            IsActive = true
        };

        _context.SfaDoctors.Add(doc);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(doc.Id);
    }

    public async Task<Result<BulkImportResultDto>> BulkImportDoctorsAsync(BulkDoctorImportRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<BulkImportResultDto>.Failure("No doctor records found to import.", "EMPTY_IMPORT");
        }

        var errors = new List<string>();
        var warnings = new List<string>();
        int inserted = 0;
        int updated = 0;
        int skipped = 0;

        var existingDoctors = await _context.SfaDoctors
            .Where(d => d.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var existingByRegNo = new Dictionary<string, SfaDoctor>(StringComparer.OrdinalIgnoreCase);
        var existingByMobile = new Dictionary<string, SfaDoctor>(StringComparer.OrdinalIgnoreCase);

        foreach (var doc in existingDoctors)
        {
            if (!string.IsNullOrWhiteSpace(doc.RegistrationNumber) && !existingByRegNo.ContainsKey(doc.RegistrationNumber.Trim()))
                existingByRegNo[doc.RegistrationNumber.Trim()] = doc;

            if (!string.IsNullOrWhiteSpace(doc.Mobile) && !existingByMobile.ContainsKey(doc.Mobile.Trim()))
                existingByMobile[doc.Mobile.Trim()] = doc;
        }

        var divisions = await _context.SfaDivisions
            .Where(d => d.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var patches = await _context.SfaPatches
            .Where(p => p.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var beats = await _context.SfaBeats
            .Where(b => b.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var employees = await _context.SfaEmployeeProfiles
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.User)
            .ToListAsync(cancellationToken);

        int rowIndex = 1;
        foreach (var item in request.Items)
        {
            rowIndex++;
            if (string.IsNullOrWhiteSpace(item.Name))
            {
                errors.Add($"Row {rowIndex}: Doctor Name is required.");
                continue;
            }

            var cleanMobile = item.Mobile?.Trim() ?? string.Empty;
            var cleanRegNo = item.RegistrationNumber?.Trim() ?? string.Empty;

            SfaDoctor? duplicate = null;
            if (!string.IsNullOrWhiteSpace(cleanRegNo) && existingByRegNo.TryGetValue(cleanRegNo, out var dupReg))
            {
                duplicate = dupReg;
            }
            else if (!string.IsNullOrWhiteSpace(cleanMobile) && existingByMobile.TryGetValue(cleanMobile, out var dupMob))
            {
                duplicate = dupMob;
            }

            if (duplicate != null)
            {
                if (!request.OverwriteExisting)
                {
                    skipped++;
                    warnings.Add($"Row {rowIndex} ({item.Name}): Skipped duplicate doctor with RegNo '{cleanRegNo}' or Mobile '{cleanMobile}'.");
                    continue;
                }

                duplicate.Name = item.Name.Trim();
                if (!string.IsNullOrWhiteSpace(item.Specialty)) duplicate.Specialty = item.Specialty.Trim();
                if (!string.IsNullOrWhiteSpace(item.SubSpecialty)) duplicate.SubSpecialty = item.SubSpecialty.Trim();
                if (!string.IsNullOrWhiteSpace(item.Qualification)) duplicate.Qualification = item.Qualification.Trim();
                if (!string.IsNullOrWhiteSpace(item.ClinicHospitalName)) duplicate.ClinicHospitalName = item.ClinicHospitalName.Trim();
                if (!string.IsNullOrWhiteSpace(item.Address)) duplicate.Address = item.Address.Trim();
                if (!string.IsNullOrWhiteSpace(item.City)) duplicate.City = item.City.Trim();
                if (!string.IsNullOrWhiteSpace(item.State)) duplicate.State = item.State.Trim();
                if (!string.IsNullOrWhiteSpace(item.Pincode)) duplicate.Pincode = item.Pincode.Trim();
                if (!string.IsNullOrWhiteSpace(cleanMobile)) duplicate.Mobile = cleanMobile;
                if (!string.IsNullOrWhiteSpace(item.Email)) duplicate.Email = item.Email.Trim();
                if (!string.IsNullOrWhiteSpace(item.Classification)) duplicate.Classification = item.Classification.Trim();
                if (item.VisitFrequencyPerMonth.HasValue && item.VisitFrequencyPerMonth.Value > 0)
                    duplicate.VisitFrequencyPerMonth = item.VisitFrequencyPerMonth.Value;
                if (!string.IsNullOrWhiteSpace(item.PreferredVisitDay)) duplicate.PreferredVisitDay = item.PreferredVisitDay.Trim();
                if (!string.IsNullOrWhiteSpace(item.PreferredVisitTime)) duplicate.PreferredVisitTime = item.PreferredVisitTime.Trim();
                if (item.EstimatedMonthlyPotential.HasValue) duplicate.EstimatedMonthlyPotential = item.EstimatedMonthlyPotential.Value;
                if (item.Latitude.HasValue) duplicate.Latitude = item.Latitude.Value;
                if (item.Longitude.HasValue) duplicate.Longitude = item.Longitude.Value;
                if (item.GeofenceRadiusMeters.HasValue && item.GeofenceRadiusMeters.Value > 0) duplicate.GeofenceRadiusMeters = item.GeofenceRadiusMeters.Value;

                ResolveDoctorRelationships(duplicate, item, divisions, patches, beats, employees);
                updated++;
                continue;
            }

            var newDoc = new SfaDoctor
            {
                TenantId = tenantId,
                Code = string.IsNullOrWhiteSpace(item.Code) ? $"DOC-{Random.Shared.Next(1000, 9999)}" : item.Code.Trim().ToUpperInvariant(),
                Name = item.Name.Trim(),
                Specialty = string.IsNullOrWhiteSpace(item.Specialty) ? "General Physician" : item.Specialty.Trim(),
                SubSpecialty = item.SubSpecialty?.Trim(),
                Priority = "High",
                Qualification = string.IsNullOrWhiteSpace(item.Qualification) ? "MBBS" : item.Qualification.Trim(),
                RegistrationNumber = cleanRegNo,
                ClinicHospitalName = string.IsNullOrWhiteSpace(item.ClinicHospitalName) ? "Clinic" : item.ClinicHospitalName.Trim(),
                Address = string.IsNullOrWhiteSpace(item.Address) ? "Main Road" : item.Address.Trim(),
                City = string.IsNullOrWhiteSpace(item.City) ? "Kanpur" : item.City.Trim(),
                State = item.State?.Trim(),
                Pincode = item.Pincode?.Trim(),
                Mobile = cleanMobile,
                Email = item.Email?.Trim(),
                Classification = string.IsNullOrWhiteSpace(item.Classification) ? "Core" : item.Classification.Trim(),
                VisitFrequencyPerMonth = item.VisitFrequencyPerMonth ?? 2,
                PreferredVisitDay = item.PreferredVisitDay?.Trim(),
                PreferredVisitTime = item.PreferredVisitTime?.Trim(),
                EstimatedMonthlyPotential = item.EstimatedMonthlyPotential ?? 50000m,
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                GeofenceRadiusMeters = item.GeofenceRadiusMeters ?? 200,
                IsActive = true
            };

            ResolveDoctorRelationships(newDoc, item, divisions, patches, beats, employees);

            _context.SfaDoctors.Add(newDoc);
            inserted++;

            if (!string.IsNullOrWhiteSpace(cleanRegNo)) existingByRegNo[cleanRegNo] = newDoc;
            if (!string.IsNullOrWhiteSpace(cleanMobile)) existingByMobile[cleanMobile] = newDoc;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var result = new BulkImportResultDto(
            TotalProcessed: request.Items.Count,
            InsertedCount: inserted,
            UpdatedCount: updated,
            SkippedCount: skipped,
            Errors: errors,
            Warnings: warnings
        );

        return Result<BulkImportResultDto>.Success(result);
    }

    private static void ResolveDoctorRelationships(
        SfaDoctor doc,
        BulkDoctorImportItemDto item,
        List<SfaDivision> divisions,
        List<SfaPatch> patches,
        List<SfaBeat> beats,
        List<SfaEmployeeProfile> employees)
    {
        if (!string.IsNullOrWhiteSpace(item.DivisionCodeOrName))
        {
            var div = divisions.FirstOrDefault(d => d.Code.Equals(item.DivisionCodeOrName, StringComparison.OrdinalIgnoreCase) || d.Name.Equals(item.DivisionCodeOrName, StringComparison.OrdinalIgnoreCase));
            if (div != null) doc.DivisionId = div.Id;
        }

        if (!string.IsNullOrWhiteSpace(item.PatchCodeOrName))
        {
            var pat = patches.FirstOrDefault(p => p.Code.Equals(item.PatchCodeOrName, StringComparison.OrdinalIgnoreCase) || p.Name.Equals(item.PatchCodeOrName, StringComparison.OrdinalIgnoreCase));
            if (pat != null)
            {
                doc.PatchId = pat.Id;
                if (pat.AreaTerritoryId.HasValue) doc.TerritoryId = pat.AreaTerritoryId;
            }
        }

        if (!string.IsNullOrWhiteSpace(item.BeatCodeOrName))
        {
            var b = beats.FirstOrDefault(x => x.Code.Equals(item.BeatCodeOrName, StringComparison.OrdinalIgnoreCase) || x.Name.Equals(item.BeatCodeOrName, StringComparison.OrdinalIgnoreCase));
            if (b != null) doc.BeatId = b.Id;
        }

        if (!string.IsNullOrWhiteSpace(item.AssignedMrEmployeeCodeOrName))
        {
            var emp = employees.FirstOrDefault(e => e.EmployeeCode.Equals(item.AssignedMrEmployeeCodeOrName, StringComparison.OrdinalIgnoreCase) || (e.User != null && e.User.FullName.Equals(item.AssignedMrEmployeeCodeOrName, StringComparison.OrdinalIgnoreCase)));
            if (emp != null) doc.AssignedMrUserId = emp.UserId;
        }
    }

    public async Task<Result<bool>> ReallocateDoctorAsync(ReallocateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var doctor = await _context.SfaDoctors
            .FirstOrDefaultAsync(d => d.Id == request.DoctorId && d.TenantId == tenantId, cancellationToken);

        if (doctor == null)
            return Result<bool>.Failure("Doctor not found.", "NOT_FOUND");

        var newMr = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.NewMrUserId && u.TenantId == tenantId, cancellationToken);

        if (newMr == null)
            return Result<bool>.Failure("New assigned MR user not found.", "NOT_FOUND");

        var history = new SfaDoctorAllocationHistory
        {
            TenantId = tenantId,
            DoctorId = doctor.Id,
            FromMrUserId = doctor.AssignedMrUserId,
            ToMrUserId = request.NewMrUserId,
            EffectiveDate = request.EffectiveDate,
            Reason = request.Reason.Trim(),
            ApprovedByUserId = _currentUserContext.UserId
        };
        _context.SfaDoctorAllocationHistories.Add(history);

        doctor.AssignedMrUserId = request.NewMrUserId;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<SfaDoctorAllocationHistoryDto>>> GetDoctorAllocationHistoriesAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var list = await _context.SfaDoctorAllocationHistories
            .Where(h => h.DoctorId == doctorId && h.TenantId == tenantId)
            .Include(h => h.Doctor)
            .Include(h => h.FromMrUser)
            .Include(h => h.ToMrUser)
            .OrderByDescending(h => h.EffectiveDate)
            .Select(h => new SfaDoctorAllocationHistoryDto(
                h.Id,
                h.DoctorId,
                h.Doctor.Name,
                h.FromMrUserId,
                h.FromMrUser != null ? h.FromMrUser.FullName : null,
                h.ToMrUserId,
                h.ToMrUser.FullName,
                h.EffectiveDate,
                h.Reason,
                h.CreatedAtUtc.UtcDateTime
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaDoctorAllocationHistoryDto>>.Success(list);
    }

    public async Task<Result<IReadOnlyList<SfaChemistDto>>> GetChemistsAsync(Guid? territoryId = null, Guid? patchId = null, Guid? beatId = null, Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaChemists
            .Where(c => c.TenantId == tenantId)
            .Include(c => c.Territory)
            .Include(c => c.Patch)
            .Include(c => c.Beat)
            .Include(c => c.AssignedMrUser)
            .Include(c => c.PreferredStockistParty)
            .AsQueryable();

        if (territoryId.HasValue)
            query = query.Where(c => c.TerritoryId == territoryId.Value);

        if (patchId.HasValue)
            query = query.Where(c => c.PatchId == patchId.Value);

        if (beatId.HasValue)
            query = query.Where(c => c.BeatId == beatId.Value);

        if (mrUserId.HasValue)
            query = query.Where(c => c.AssignedMrUserId == mrUserId.Value);

        var list = await query
            .OrderBy(c => c.ShopName)
            .Select(c => new SfaChemistDto(
                c.Id,
                c.Code,
                c.ShopName,
                c.ContactPerson,
                c.DrugLicenseNumber,
                c.GSTIN,
                c.Mobile,
                c.Email,
                c.Address,
                c.City,
                c.State,
                c.Pincode,
                c.Latitude,
                c.Longitude,
                c.GeofenceRadiusMeters,
                c.TerritoryId,
                c.Territory != null ? c.Territory.Name : null,
                c.PatchId,
                c.Patch != null ? c.Patch.Name : null,
                c.BeatId,
                c.Beat != null ? c.Beat.Name : null,
                c.AssignedMrUserId,
                c.AssignedMrUser != null ? c.AssignedMrUser.FullName : null,
                c.PreferredStockistPartyId,
                c.PreferredStockistParty != null ? c.PreferredStockistParty.LegalName : null,
                c.PreferredVisitDay,
                c.PotentialCategory,
                c.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaChemistDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreateChemistAsync(CreateChemistRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var chemist = new SfaChemist
        {
            TenantId = tenantId,
            Code = string.IsNullOrWhiteSpace(request.Code) ? $"CHM-{Random.Shared.Next(100, 999)}" : request.Code.Trim().ToUpperInvariant(),
            ShopName = request.ShopName.Trim(),
            ContactPerson = request.ContactPerson.Trim(),
            DrugLicenseNumber = request.DrugLicenseNumber.Trim(),
            GSTIN = request.GSTIN,
            Mobile = request.Mobile.Trim(),
            Email = request.Email,
            Address = request.Address.Trim(),
            City = request.City.Trim(),
            State = request.State,
            Pincode = request.Pincode,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeofenceRadiusMeters = request.GeofenceRadiusMeters > 0 ? request.GeofenceRadiusMeters : 200,
            TerritoryId = request.TerritoryId,
            PatchId = request.PatchId,
            BeatId = request.BeatId,
            AssignedMrUserId = request.AssignedMrUserId,
            PreferredStockistPartyId = request.PreferredStockistPartyId,
            PreferredVisitDay = request.PreferredVisitDay,
            PotentialCategory = request.PotentialCategory,
            IsActive = true
        };

        _context.SfaChemists.Add(chemist);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(chemist.Id);
    }

    public async Task<Result<BulkImportResultDto>> BulkImportChemistsAsync(BulkChemistImportRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<BulkImportResultDto>.Failure("No chemist records found to import.", "EMPTY_IMPORT");
        }

        var errors = new List<string>();
        var warnings = new List<string>();
        int inserted = 0;
        int updated = 0;
        int skipped = 0;

        var existingChemists = await _context.SfaChemists
            .Where(c => c.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var existingByDL = new Dictionary<string, SfaChemist>(StringComparer.OrdinalIgnoreCase);
        var existingByMobile = new Dictionary<string, SfaChemist>(StringComparer.OrdinalIgnoreCase);

        foreach (var chm in existingChemists)
        {
            if (!string.IsNullOrWhiteSpace(chm.DrugLicenseNumber) && !existingByDL.ContainsKey(chm.DrugLicenseNumber.Trim()))
                existingByDL[chm.DrugLicenseNumber.Trim()] = chm;

            if (!string.IsNullOrWhiteSpace(chm.Mobile) && !existingByMobile.ContainsKey(chm.Mobile.Trim()))
                existingByMobile[chm.Mobile.Trim()] = chm;
        }

        var stockists = await _context.Parties
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var patches = await _context.SfaPatches
            .Where(p => p.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var beats = await _context.SfaBeats
            .Where(b => b.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var employees = await _context.SfaEmployeeProfiles
            .Where(e => e.TenantId == tenantId)
            .Include(e => e.User)
            .ToListAsync(cancellationToken);

        int rowIndex = 1;
        foreach (var item in request.Items)
        {
            rowIndex++;
            if (string.IsNullOrWhiteSpace(item.ShopName))
            {
                errors.Add($"Row {rowIndex}: Shop Name is required.");
                continue;
            }

            var cleanMobile = item.Mobile?.Trim() ?? string.Empty;
            var cleanDL = item.DrugLicenseNumber?.Trim() ?? string.Empty;

            SfaChemist? duplicate = null;
            if (!string.IsNullOrWhiteSpace(cleanDL) && existingByDL.TryGetValue(cleanDL, out var dupDL))
            {
                duplicate = dupDL;
            }
            else if (!string.IsNullOrWhiteSpace(cleanMobile) && existingByMobile.TryGetValue(cleanMobile, out var dupMob))
            {
                duplicate = dupMob;
            }

            if (duplicate != null)
            {
                if (!request.OverwriteExisting)
                {
                    skipped++;
                    warnings.Add($"Row {rowIndex} ({item.ShopName}): Skipped duplicate chemist with DL '{cleanDL}' or Mobile '{cleanMobile}'.");
                    continue;
                }

                duplicate.ShopName = item.ShopName.Trim();
                if (!string.IsNullOrWhiteSpace(item.ContactPerson)) duplicate.ContactPerson = item.ContactPerson.Trim();
                if (!string.IsNullOrWhiteSpace(cleanDL)) duplicate.DrugLicenseNumber = cleanDL;
                if (!string.IsNullOrWhiteSpace(item.GSTIN)) duplicate.GSTIN = item.GSTIN.Trim();
                if (!string.IsNullOrWhiteSpace(cleanMobile)) duplicate.Mobile = cleanMobile;
                if (!string.IsNullOrWhiteSpace(item.Email)) duplicate.Email = item.Email.Trim();
                if (!string.IsNullOrWhiteSpace(item.Address)) duplicate.Address = item.Address.Trim();
                if (!string.IsNullOrWhiteSpace(item.City)) duplicate.City = item.City.Trim();
                if (!string.IsNullOrWhiteSpace(item.State)) duplicate.State = item.State.Trim();
                if (!string.IsNullOrWhiteSpace(item.Pincode)) duplicate.Pincode = item.Pincode.Trim();
                if (!string.IsNullOrWhiteSpace(item.PotentialCategory)) duplicate.PotentialCategory = item.PotentialCategory.Trim();
                if (!string.IsNullOrWhiteSpace(item.PreferredVisitDay)) duplicate.PreferredVisitDay = item.PreferredVisitDay.Trim();
                if (item.Latitude.HasValue) duplicate.Latitude = item.Latitude.Value;
                if (item.Longitude.HasValue) duplicate.Longitude = item.Longitude.Value;
                if (item.GeofenceRadiusMeters.HasValue && item.GeofenceRadiusMeters.Value > 0) duplicate.GeofenceRadiusMeters = item.GeofenceRadiusMeters.Value;

                ResolveChemistRelationships(duplicate, item, stockists, patches, beats, employees);
                updated++;
                continue;
            }

            var newChemist = new SfaChemist
            {
                TenantId = tenantId,
                Code = string.IsNullOrWhiteSpace(item.Code) ? $"CHM-{Random.Shared.Next(1000, 9999)}" : item.Code.Trim().ToUpperInvariant(),
                ShopName = item.ShopName.Trim(),
                ContactPerson = string.IsNullOrWhiteSpace(item.ContactPerson) ? "Manager" : item.ContactPerson.Trim(),
                DrugLicenseNumber = cleanDL,
                GSTIN = item.GSTIN?.Trim(),
                Mobile = cleanMobile,
                Email = item.Email?.Trim(),
                Address = string.IsNullOrWhiteSpace(item.Address) ? "Market" : item.Address.Trim(),
                City = string.IsNullOrWhiteSpace(item.City) ? "Kanpur" : item.City.Trim(),
                State = item.State?.Trim(),
                Pincode = item.Pincode?.Trim(),
                PotentialCategory = string.IsNullOrWhiteSpace(item.PotentialCategory) ? "B" : item.PotentialCategory.Trim(),
                PreferredVisitDay = item.PreferredVisitDay?.Trim(),
                Latitude = item.Latitude,
                Longitude = item.Longitude,
                GeofenceRadiusMeters = item.GeofenceRadiusMeters ?? 200,
                IsActive = true
            };

            ResolveChemistRelationships(newChemist, item, stockists, patches, beats, employees);

            _context.SfaChemists.Add(newChemist);
            inserted++;

            if (!string.IsNullOrWhiteSpace(cleanDL)) existingByDL[cleanDL] = newChemist;
            if (!string.IsNullOrWhiteSpace(cleanMobile)) existingByMobile[cleanMobile] = newChemist;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<BulkImportResultDto>.Success(new BulkImportResultDto(
            TotalProcessed: request.Items.Count,
            InsertedCount: inserted,
            UpdatedCount: updated,
            SkippedCount: skipped,
            Errors: errors,
            Warnings: warnings
        ));
    }

    private static void ResolveChemistRelationships(
        SfaChemist chemist,
        BulkChemistImportItemDto item,
        List<Party> stockists,
        List<SfaPatch> patches,
        List<SfaBeat> beats,
        List<SfaEmployeeProfile> employees)
    {
        if (!string.IsNullOrWhiteSpace(item.PreferredStockistNameOrCode))
        {
            var stk = stockists.FirstOrDefault(s => (s.TradeName != null && s.TradeName.Equals(item.PreferredStockistNameOrCode, StringComparison.OrdinalIgnoreCase)) || s.LegalName.Equals(item.PreferredStockistNameOrCode, StringComparison.OrdinalIgnoreCase) || (s.GSTIN != null && s.GSTIN.Equals(item.PreferredStockistNameOrCode, StringComparison.OrdinalIgnoreCase)));
            if (stk != null) chemist.PreferredStockistPartyId = stk.Id;
        }

        if (!string.IsNullOrWhiteSpace(item.PatchCodeOrName))
        {
            var pat = patches.FirstOrDefault(p => p.Code.Equals(item.PatchCodeOrName, StringComparison.OrdinalIgnoreCase) || p.Name.Equals(item.PatchCodeOrName, StringComparison.OrdinalIgnoreCase));
            if (pat != null)
            {
                chemist.PatchId = pat.Id;
                if (pat.AreaTerritoryId.HasValue) chemist.TerritoryId = pat.AreaTerritoryId;
            }
        }

        if (!string.IsNullOrWhiteSpace(item.BeatCodeOrName))
        {
            var b = beats.FirstOrDefault(x => x.Code.Equals(item.BeatCodeOrName, StringComparison.OrdinalIgnoreCase) || x.Name.Equals(item.BeatCodeOrName, StringComparison.OrdinalIgnoreCase));
            if (b != null) chemist.BeatId = b.Id;
        }

        if (!string.IsNullOrWhiteSpace(item.AssignedMrEmployeeCodeOrName))
        {
            var emp = employees.FirstOrDefault(e => e.EmployeeCode.Equals(item.AssignedMrEmployeeCodeOrName, StringComparison.OrdinalIgnoreCase) || (e.User != null && e.User.FullName.Equals(item.AssignedMrEmployeeCodeOrName, StringComparison.OrdinalIgnoreCase)));
            if (emp != null) chemist.AssignedMrUserId = emp.UserId;
        }
    }

    public async Task<Result<IReadOnlyList<SfaStockistAllocationDto>>> GetStockistAllocationsAsync(Guid? stockistPartyId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaStockistAllocations
            .Where(a => a.TenantId == tenantId)
            .Include(a => a.StockistParty)
            .Include(a => a.MrUser)
            .Include(a => a.Territory)
            .AsQueryable();

        if (stockistPartyId.HasValue)
            query = query.Where(a => a.StockistPartyId == stockistPartyId.Value);

        var list = await query
            .OrderByDescending(a => a.EffectiveFrom)
            .Select(a => new SfaStockistAllocationDto(
                a.Id,
                a.StockistPartyId,
                a.StockistParty.LegalName,
                a.StockistParty.GSTIN,
                a.MrUserId,
                a.MrUser.FullName,
                a.TerritoryId,
                a.Territory != null ? a.Territory.Name : null,
                a.EffectiveFrom,
                a.EffectiveTo,
                a.AllocationType,
                a.IsActive,
                a.Notes
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaStockistAllocationDto>>.Success(list);
    }

    public async Task<Result<Guid>> AllocateStockistAsync(AllocateStockistRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        // 1. Close any currently active allocation for this stockist by setting EffectiveTo
        var existingActive = await _context.SfaStockistAllocations
            .Where(a => a.TenantId == tenantId && a.StockistPartyId == request.StockistPartyId && a.EffectiveTo == null)
            .ToListAsync(cancellationToken);

        foreach (var oldAlloc in existingActive)
        {
            oldAlloc.EffectiveTo = request.EffectiveFrom.AddSeconds(-1);
            oldAlloc.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }

        // 2. Create new allocation with effective date
        var newAlloc = new SfaStockistAllocation
        {
            TenantId = tenantId,
            StockistPartyId = request.StockistPartyId,
            MrUserId = request.MrUserId,
            TerritoryId = request.TerritoryId,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = null, // currently active
            AllocationType = request.AllocationType,
            IsActive = true,
            Notes = request.Notes
        };

        _context.SfaStockistAllocations.Add(newAlloc);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(newAlloc.Id);
    }

    #endregion

    #region 3. Operations (TP, DCR, Samples, POB Orders)

    public async Task<Result<IReadOnlyList<SfaTourPlanDto>>> GetTourPlansAsync(int month, int year, Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaTourPlans
            .Where(p => p.TenantId == tenantId && p.Month == month && p.Year == year)
            .Include(p => p.MrUser)
            .Include(p => p.Items)
            .AsQueryable();

        if (mrUserId.HasValue)
            query = query.Where(p => p.MrUserId == mrUserId.Value);

        var list = await query
            .OrderBy(p => p.CreatedAtUtc)
            .Select(p => new SfaTourPlanDto(
                p.Id,
                p.MrUserId,
                p.MrUser.FullName,
                p.Month,
                p.Year,
                p.Status,
                p.ManagerRemarks,
                p.Items.OrderBy(i => i.PlanDate).Select(i => new SfaTourPlanItemDto(
                    i.Id,
                    i.PlanDate,
                    i.ActivityType ?? "FieldWork",
                    i.RouteOrBeatName,
                    i.TerritoryId,
                    null,
                    i.PatchId,
                    null,
                    i.BeatId,
                    null,
                    i.PlannedDoctorCalls,
                    i.PlannedChemistCalls,
                    i.PlannedStockistCalls,
                    i.TargetDoctorIdsJson,
                    null,
                    i.Remarks
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaTourPlanDto>>.Success(list);
    }

    public async Task<Result<SfaTourPlanDto>> GenerateMonthlyTourPlanAsync(GenerateTourPlanRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (request.Month < 1 || request.Month > 12)
            return Result<SfaTourPlanDto>.Failure("Invalid month. Must be between 1 and 12.", "INVALID_MONTH");
        if (request.Year < 2020 || request.Year > 2050)
            return Result<SfaTourPlanDto>.Failure("Invalid year.", "INVALID_YEAR");

        var mrUser = await _context.Users.FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == request.MrUserId, cancellationToken);
        if (mrUser == null)
            return Result<SfaTourPlanDto>.Failure("Field Executive (MR) not found.", "MR_NOT_FOUND");

        // 1. Fetch all assigned doctors for this MR
        var assignedDoctors = await _context.SfaDoctors
            .Where(d => d.TenantId == tenantId && d.AssignedMrUserId == request.MrUserId && d.IsActive && !d.IsDeleted)
            .Include(d => d.Beat)
            .Include(d => d.Patch)
            .ToListAsync(cancellationToken);

        // 2. Fetch all beats assigned to this MR (via assigned doctors or MR's patch)
        var doctorBeatIds = assignedDoctors.Where(d => d.BeatId.HasValue).Select(d => d.BeatId!.Value).Distinct().ToList();
        var mrProfile = await _context.SfaEmployeeProfiles.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.UserId == request.MrUserId, cancellationToken);
        var mrPatchId = mrProfile?.PatchId;

        var assignedBeats = await _context.SfaBeats
            .Where(b => b.TenantId == tenantId && (doctorBeatIds.Contains(b.Id) || (mrPatchId.HasValue && b.PatchId == mrPatchId.Value)) && !b.IsDeleted)
            .Include(b => b.Patch)
            .ToListAsync(cancellationToken);

        // 3. Prepare existing tour plan (Draft/Revised) or create new
        var existingTp = await _context.SfaTourPlans
            .Include(tp => tp.Items)
            .FirstOrDefaultAsync(tp => tp.TenantId == tenantId && tp.MrUserId == request.MrUserId && tp.Month == request.Month && tp.Year == request.Year, cancellationToken);

        if (existingTp != null && existingTp.Status == SfaPlanStatus.Approved)
        {
            return Result<SfaTourPlanDto>.Failure("Tour Plan for this month is already approved and locked.", "ALREADY_APPROVED");
        }

        var tp = existingTp ?? new SfaTourPlan
        {
            TenantId = tenantId,
            MrUserId = request.MrUserId,
            Month = request.Month,
            Year = request.Year,
            Status = SfaPlanStatus.Draft
        };

        if (existingTp != null)
        {
            _context.SfaTourPlanItems.RemoveRange(existingTp.Items);
            existingTp.Items.Clear();
            existingTp.Status = SfaPlanStatus.Draft;
            existingTp.ManagerRemarks = null;
        }
        else
        {
            _context.SfaTourPlans.Add(tp);
        }

        // 4. Calculate calendar days
        int daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
        var holidays = request.CustomHolidays?.Select(h => h.Date).ToHashSet() ?? new HashSet<DateTime>();

        int beatIndex = 0;
        for (int day = 1; day <= daysInMonth; day++)
        {
            var date = new DateTime(request.Year, request.Month, day, 0, 0, 0, DateTimeKind.Utc);
            bool isSunday = date.DayOfWeek == DayOfWeek.Sunday;
            bool isHoliday = holidays.Contains(date.Date);

            var item = new SfaTourPlanItem
            {
                TenantId = tenantId,
                TourPlan = tp,
                PlanDate = date
            };

            if (isSunday)
            {
                item.ActivityType = "Sunday";
                item.RouteOrBeatName = "Weekly Off (Sunday)";
                item.PlannedDoctorCalls = 0;
                item.PlannedChemistCalls = 0;
                item.PlannedStockistCalls = 0;
            }
            else if (isHoliday)
            {
                item.ActivityType = "Holiday";
                item.RouteOrBeatName = "Declared Holiday";
                item.PlannedDoctorCalls = 0;
                item.PlannedChemistCalls = 0;
                item.PlannedStockistCalls = 0;
            }
            else
            {
                item.ActivityType = "FieldWork";
                if (assignedBeats.Count > 0)
                {
                    var beat = assignedBeats[beatIndex % assignedBeats.Count];
                    beatIndex++;
                    item.BeatId = beat.Id;
                    item.PatchId = beat.PatchId;
                    item.RouteOrBeatName = $"{beat.Name} ({beat.Patch?.Name ?? "Calling Route"})";

                    // Match doctors belonging to this beat
                    var beatDoctors = assignedDoctors.Where(d => d.BeatId == beat.Id).ToList();
                    item.PlannedDoctorCalls = beatDoctors.Count > 0 ? beatDoctors.Count : 10;
                    item.PlannedChemistCalls = 5;
                    item.PlannedStockistCalls = 1;
                    if (beatDoctors.Count > 0)
                    {
                        var docIds = beatDoctors.Select(d => d.Id).ToList();
                        item.TargetDoctorIdsJson = System.Text.Json.JsonSerializer.Serialize(docIds);
                    }
                }
                else
                {
                    item.RouteOrBeatName = "General Calling Route";
                    item.PlannedDoctorCalls = 10;
                    item.PlannedChemistCalls = 5;
                    item.PlannedStockistCalls = 1;
                }
            }

            tp.Items.Add(item);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Map DTO
        var itemsDto = tp.Items
            .OrderBy(i => i.PlanDate)
            .Select(i => new SfaTourPlanItemDto(
                i.Id,
                i.PlanDate,
                i.ActivityType ?? "FieldWork",
                i.RouteOrBeatName,
                i.TerritoryId,
                null,
                i.PatchId,
                null,
                i.BeatId,
                null,
                i.PlannedDoctorCalls,
                i.PlannedChemistCalls,
                i.PlannedStockistCalls,
                i.TargetDoctorIdsJson,
                null,
                i.Remarks
            )).ToList();

        var resultDto = new SfaTourPlanDto(
            tp.Id,
            tp.MrUserId,
            mrUser.FullName,
            tp.Month,
            tp.Year,
            tp.Status,
            tp.ManagerRemarks,
            itemsDto
        );

        return Result<SfaTourPlanDto>.Success(resultDto);
    }

    public async Task<Result<DoctorFrequencyComplianceDto>> GetDoctorFrequencyComplianceAsync(Guid mrUserId, int month, int year, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var doctors = await _context.SfaDoctors
            .Where(d => d.TenantId == tenantId && d.AssignedMrUserId == mrUserId && d.IsActive && !d.IsDeleted)
            .Include(d => d.Patch)
            .Include(d => d.Beat)
            .ToListAsync(cancellationToken);

        var tourPlan = await _context.SfaTourPlans
            .Include(tp => tp.Items)
            .FirstOrDefaultAsync(tp => tp.TenantId == tenantId && tp.MrUserId == mrUserId && tp.Month == month && tp.Year == year, cancellationToken);

        // Count planned calls per doctor from TourPlan items
        var plannedDoctorCounts = new Dictionary<Guid, int>();
        if (tourPlan != null)
        {
            foreach (var item in tourPlan.Items)
            {
                if (!string.IsNullOrWhiteSpace(item.TargetDoctorIdsJson))
                {
                    try
                    {
                        var docIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(item.TargetDoctorIdsJson);
                        if (docIds != null)
                        {
                            foreach (var id in docIds)
                            {
                                plannedDoctorCounts[id] = plannedDoctorCounts.GetValueOrDefault(id, 0) + 1;
                            }
                        }
                    }
                    catch { }
                }
            }
        }

        // Count actual executed calls from approved DCRs in this month & year
        var fromDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var toDate = fromDate.AddMonths(1).AddTicks(-1);

        var executedDoctorCounts = await _context.SfaDailyCallReports
            .Where(dcr => dcr.TenantId == tenantId && dcr.MrUserId == mrUserId && dcr.DcrDate >= fromDate && dcr.DcrDate <= toDate && !dcr.IsDeleted)
            .SelectMany(dcr => _context.SfaDcrDoctorVisits.Where(v => v.DailyCallReportId == dcr.Id))
            .GroupBy(v => v.DoctorId)
            .Select(g => new { DoctorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.DoctorId, g => g.Count, cancellationToken);

        int superCore = 0, core = 0, standard = 0, basic = 0;
        int totalTarget = 0, totalPlanned = 0, totalExecuted = 0;
        var breakdown = new List<DoctorComplianceItemDto>();

        foreach (var doc in doctors)
        {
            var classification = doc.Classification ?? "Core";
            int targetCalls = 1;
            if (classification.Contains("SuperCore") || classification.Contains("A+"))
            {
                targetCalls = 4;
                superCore++;
            }
            else if (classification.Contains("Core") || classification.Contains("A"))
            {
                targetCalls = 2;
                core++;
            }
            else if (classification.Contains("Standard") || classification.Contains("B"))
            {
                targetCalls = 1;
                standard++;
            }
            else
            {
                targetCalls = 1;
                basic++;
            }

            plannedDoctorCounts.TryGetValue(doc.Id, out int planned);
            executedDoctorCounts.TryGetValue(doc.Id, out int executed);

            totalTarget += targetCalls;
            totalPlanned += planned;
            totalExecuted += executed;

            bool isCompliant = planned >= targetCalls;

            breakdown.Add(new DoctorComplianceItemDto(
                doc.Id,
                doc.Code,
                doc.Name,
                doc.Specialty,
                classification,
                doc.Patch?.Name,
                doc.Beat?.Name,
                targetCalls,
                planned,
                executed,
                isCompliant
            ));
        }

        decimal coveragePercent = totalTarget > 0 ? Math.Round(((decimal)totalPlanned / totalTarget) * 100m, 1) : 0m;

        var dto = new DoctorFrequencyComplianceDto(
            doctors.Count,
            superCore,
            core,
            standard,
            basic,
            totalTarget,
            totalPlanned,
            totalExecuted,
            coveragePercent,
            breakdown
        );

        return Result<DoctorFrequencyComplianceDto>.Success(dto);
    }

    public async Task<Result<Guid>> SubmitTourPlanAsync(CreateTourPlanRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        var tp = new SfaTourPlan
        {
            TenantId = tenantId,
            MrUserId = userId,
            Month = request.Month,
            Year = request.Year,
            Status = SfaPlanStatus.Submitted
        };

        foreach (var item in request.Items)
        {
            tp.Items.Add(new SfaTourPlanItem
            {
                TenantId = tenantId,
                PlanDate = item.PlanDate,
                ActivityType = item.ActivityType ?? "FieldWork",
                RouteOrBeatName = item.RouteOrBeatName,
                TerritoryId = item.TerritoryId,
                PatchId = item.PatchId,
                BeatId = item.BeatId,
                PlannedDoctorCalls = item.PlannedDoctorCalls,
                PlannedChemistCalls = item.PlannedChemistCalls,
                PlannedStockistCalls = item.PlannedStockistCalls,
                TargetDoctorIdsJson = item.TargetDoctorIdsJson,
                Remarks = item.Remarks
            });
        }

        _context.SfaTourPlans.Add(tp);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(tp.Id);
    }

    public async Task<Result<bool>> SubmitTourPlanForApprovalAsync(Guid tourPlanId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tp = await _context.SfaTourPlans
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == tourPlanId, cancellationToken);

        if (tp == null) return Result<bool>.Failure("Tour Plan not found.", "NOT_FOUND");
        if (tp.Status == SfaPlanStatus.Approved)
            return Result<bool>.Failure("Tour Plan is already approved.", "ALREADY_APPROVED");

        tp.Status = SfaPlanStatus.Submitted;
        tp.UpdatedAtUtc = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ReviewTourPlanAsync(Guid tourPlanId, bool isApproved, string? remarks, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tp = await _context.SfaTourPlans
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == tourPlanId, cancellationToken);

        if (tp == null) return Result<bool>.Failure("Tour Plan not found.", "NOT_FOUND");

        tp.Status = isApproved ? SfaPlanStatus.Approved : SfaPlanStatus.Rejected;
        tp.ReviewedByUserId = _currentUserContext.UserId;
        tp.ReviewedAtUtc = DateTime.UtcNow;
        tp.ManagerRemarks = remarks;
        tp.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<SfaDailyCallReportDto>>> GetDcrsAsync(DateTime? fromDate = null, DateTime? toDate = null, Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaDailyCallReports
            .Where(d => d.TenantId == tenantId)
            .Include(d => d.MrUser)
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(d => d.DcrDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(d => d.DcrDate <= toDate.Value);
        if (mrUserId.HasValue) query = query.Where(d => d.MrUserId == mrUserId.Value);

        var list = await query
            .OrderByDescending(d => d.DcrDate)
            .Select(d => new SfaDailyCallReportDto(
                d.Id,
                d.DcrNumber,
                d.DcrDate,
                d.MrUserId,
                d.MrUser.FullName,
                d.AttendanceStatus,
                d.WorkType,
                d.RouteOrArea,
                d.TotalDoctorsVisited,
                d.TotalChemistsVisited,
                d.TotalStockistsVisited,
                d.TotalPobBookedAmount,
                d.Status,
                d.ManagerRemarks
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaDailyCallReportDto>>.Success(list);
    }

    public async Task<Result<Guid>> SubmitDcrAsync(SubmitDcrRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        var countToday = await _context.SfaDailyCallReports.CountAsync(d => d.TenantId == tenantId, cancellationToken);
        var dcrNumber = $"DCR-{DateTime.UtcNow:yyyyMM}-{countToday + 1:D4}";

        var dcr = new SfaDailyCallReport
        {
            TenantId = tenantId,
            DcrNumber = dcrNumber,
            DcrDate = request.DcrDate,
            MrUserId = userId,
            AttendanceStatus = request.AttendanceStatus,
            WorkType = request.WorkType,
            AccompaniedByUserId = request.AccompaniedByUserId,
            TerritoryId = request.TerritoryId,
            RouteOrArea = request.RouteOrArea,
            DayStartTimeUtc = request.DayStartTimeUtc,
            DayEndTimeUtc = request.DayEndTimeUtc,
            StartLatitude = request.StartLatitude,
            StartLongitude = request.StartLongitude,
            EndLatitude = request.EndLatitude,
            EndLongitude = request.EndLongitude,
            TotalDoctorsVisited = request.DoctorVisits.Count,
            TotalChemistsVisited = request.ChemistVisits.Count,
            TotalStockistsVisited = request.StockistVisits.Count,
            TotalPobBookedAmount = request.ChemistVisits.Sum(c => c.PobOrderAmount),
            Status = SfaPlanStatus.Submitted
        };

        // Check Geofence policy if enabled by Tenant Admin
        var geofenceConfigRes = await GetGeofenceConfigAsync(cancellationToken);
        var geofenceConfig = geofenceConfigRes.Data ?? new SfaGeofenceConfigDto(false, 150, true);

        if (geofenceConfig.IsGeofencingEnabled)
        {
            foreach (var v in request.DoctorVisits)
            {
                var doc = await _context.SfaDoctors.FirstOrDefaultAsync(d => d.Id == v.DoctorId && d.TenantId == tenantId, cancellationToken);
                if (doc != null)
                {
                    if (!doc.Latitude.HasValue && !doc.Longitude.HasValue && v.Latitude.HasValue && v.Longitude.HasValue)
                    {
                        // Auto-tag doctor's clinic on first recorded visit
                        doc.Latitude = v.Latitude;
                        doc.Longitude = v.Longitude;
                        doc.UpdatedAtUtc = DateTimeOffset.UtcNow;
                    }
                    else if (doc.Latitude.HasValue && doc.Longitude.HasValue && v.Latitude.HasValue && v.Longitude.HasValue)
                    {
                        var dist = CalculateHaversineDistanceMeters(doc.Latitude.Value, doc.Longitude.Value, v.Latitude.Value, v.Longitude.Value);
                        var allowedRadius = doc.GeofenceRadiusMeters > 0 ? doc.GeofenceRadiusMeters : geofenceConfig.GeofenceRadiusMeters;
                        if (dist > allowedRadius)
                        {
                            if (!geofenceConfig.AllowOutOfRangeWithReason)
                            {
                                return Result<Guid>.Failure(
                                    $"Visit to Dr. {doc.Name} blocked: You are {Math.Round(dist)}m away from clinic. Admin has set a strict geofence radius of {allowedRadius}m. Please report from the clinic.",
                                    "GEOFENCE_VIOLATION"
                                );
                            }
                            else if (string.IsNullOrWhiteSpace(v.OutOfRangeReason))
                            {
                                return Result<Guid>.Failure(
                                    $"Visit to Dr. {doc.Name} is outside clinic radius ({Math.Round(dist)}m vs {allowedRadius}m permitted). Please provide an Out-of-Range reason to submit.",
                                    "OUT_OF_RANGE_REASON_REQUIRED"
                                );
                            }
                        }
                    }
                }
            }

            foreach (var c in request.ChemistVisits)
            {
                var chm = await _context.SfaChemists.FirstOrDefaultAsync(ch => ch.Id == c.ChemistId && ch.TenantId == tenantId, cancellationToken);
                if (chm != null)
                {
                    if (!chm.Latitude.HasValue && !chm.Longitude.HasValue && c.Latitude.HasValue && c.Longitude.HasValue)
                    {
                        // Auto-tag chemist shop on first recorded visit
                        chm.Latitude = c.Latitude;
                        chm.Longitude = c.Longitude;
                        chm.UpdatedAtUtc = DateTimeOffset.UtcNow;
                    }
                    else if (chm.Latitude.HasValue && chm.Longitude.HasValue && c.Latitude.HasValue && c.Longitude.HasValue)
                    {
                        var dist = CalculateHaversineDistanceMeters(chm.Latitude.Value, chm.Longitude.Value, c.Latitude.Value, c.Longitude.Value);
                        var allowedRadius = chm.GeofenceRadiusMeters > 0 ? chm.GeofenceRadiusMeters : geofenceConfig.GeofenceRadiusMeters;
                        if (dist > allowedRadius)
                        {
                            if (!geofenceConfig.AllowOutOfRangeWithReason)
                            {
                                return Result<Guid>.Failure(
                                    $"Visit to Chemist {chm.ShopName} blocked: You are {Math.Round(dist)}m away from shop. Permitted radius is {allowedRadius}m.",
                                    "GEOFENCE_VIOLATION"
                                );
                            }
                            else if (string.IsNullOrWhiteSpace(c.OutOfRangeReason))
                            {
                                return Result<Guid>.Failure(
                                    $"Visit to Chemist {chm.ShopName} is outside shop radius ({Math.Round(dist)}m vs {allowedRadius}m permitted). Please provide an Out-of-Range reason.",
                                    "OUT_OF_RANGE_REASON_REQUIRED"
                                );
                            }
                        }
                    }
                }
            }
        }

        foreach (var v in request.DoctorVisits)
        {
            dcr.DoctorVisits.Add(new SfaDcrDoctorVisit
            {
                TenantId = tenantId,
                DoctorId = v.DoctorId,
                VisitTimeUtc = v.VisitTimeUtc,
                Latitude = v.Latitude,
                Longitude = v.Longitude,
                IsGpsVerified = v.Latitude.HasValue && v.Longitude.HasValue,
                ProductsDetailedJson = v.ProductsDetailedJson,
                SamplesGivenJson = v.SamplesGivenJson,
                GiftsGivenJson = v.GiftsGivenJson,
                DoctorFeedback = v.DoctorFeedback,
                NextVisitDate = v.NextVisitDate
            });
        }

        foreach (var c in request.ChemistVisits)
        {
            dcr.ChemistVisits.Add(new SfaDcrChemistVisit
            {
                TenantId = tenantId,
                ChemistId = c.ChemistId,
                VisitTimeUtc = c.VisitTimeUtc,
                Latitude = c.Latitude,
                Longitude = c.Longitude,
                IsGpsVerified = c.Latitude.HasValue && c.Longitude.HasValue,
                PobOrderBooked = c.PobOrderBooked,
                PobOrderAmount = c.PobOrderAmount,
                Feedback = c.Feedback
            });
        }

        foreach (var s in request.StockistVisits)
        {
            dcr.StockistVisits.Add(new SfaDcrStockistVisit
            {
                TenantId = tenantId,
                StockistPartyId = s.StockistPartyId,
                VisitTimeUtc = s.VisitTimeUtc,
                PaymentCollectedAmount = s.PaymentCollectedAmount,
                ChequeOrUpiRef = s.ChequeOrUpiRef,
                OutstandingReviewRemarks = s.OutstandingReviewRemarks
            });
        }

        _context.SfaDailyCallReports.Add(dcr);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(dcr.Id);
    }

    public async Task<Result<IReadOnlyList<SfaSampleStockDto>>> GetMrSampleStockAsync(Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SfaSampleStocks
            .Where(s => s.TenantId == tenantId)
            .Include(s => s.Item)
            .Include(s => s.MrUser)
            .AsQueryable();

        if (mrUserId.HasValue && mrUserId.Value != Guid.Empty)
        {
            query = query.Where(s => s.MrUserId == mrUserId.Value);
        }

        var list = await query
            .OrderBy(s => s.Item.Name)
            .Select(s => new SfaSampleStockDto(
                s.Id,
                s.ItemId,
                s.Item != null ? s.Item.Name : "Medicine Item",
                s.BatchNumber,
                s.ExpiryMonthYear,
                s.QuantityAllocated,
                s.QuantityDistributed,
                s.QuantityAllocated - s.QuantityDistributed,
                s.MrUserId,
                s.MrUser != null ? s.MrUser.FullName : "Field Rep"
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaSampleStockDto>>.Success(list);
    }

    public async Task<Result<IReadOnlyList<SfaPobOrderDto>>> GetPobOrdersAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? mrUserId = null,
        Guid? customerPartyId = null,
        Guid? targetStockistPartyId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaPobOrders
            .Where(o => o.TenantId == tenantId && !o.IsDeleted)
            .Include(o => o.MrUser)
            .Include(o => o.CustomerParty)
            .Include(o => o.TargetStockistParty)
            .Include(o => o.Items).ThenInclude(i => i.Item)
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(o => o.OrderDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(o => o.OrderDate <= toDate.Value);
        if (mrUserId.HasValue) query = query.Where(o => o.MrUserId == mrUserId.Value);
        if (customerPartyId.HasValue) query = query.Where(o => o.CustomerPartyId == customerPartyId.Value);
        if (targetStockistPartyId.HasValue) query = query.Where(o => o.TargetStockistPartyId == targetStockistPartyId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(o => o.Status == status || o.StockistFulfillmentStatus == status);

        var list = await query
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new SfaPobOrderDto(
                o.Id,
                o.OrderNumber,
                o.OrderDate,
                o.MrUserId,
                o.MrUser != null ? o.MrUser.FullName : "Field Rep",
                o.CustomerPartyId,
                o.CustomerParty != null ? (o.CustomerParty.LegalName ?? o.CustomerParty.TradeName ?? "Retail Chemist") : "Retail Chemist",
                o.TargetStockistPartyId,
                o.TargetStockistParty != null ? (o.TargetStockistParty.LegalName ?? o.TargetStockistParty.TradeName) : null,
                o.SubTotal,
                o.TaxAmount,
                o.GrandTotal,
                o.Status,
                o.ConvertedSalesInvoiceId,
                o.Items.Where(i => !i.IsDeleted).Select(i => new SfaPobOrderItemDto(
                    i.Id,
                    i.ItemId,
                    i.Item != null ? i.Item.Name : "Product SKU",
                    i.Quantity,
                    i.FreeQuantity,
                    i.UnitPrice,
                    i.DiscountPercent,
                    i.TaxRatePercent,
                    i.TotalAmount,
                    i.AppliedSchemeId,
                    i.AppliedSchemeName,
                    i.Item != null ? i.Item.Sku : null
                )).ToList(),
                o.StockistFulfillmentStatus,
                o.StockistRemarks,
                o.ExpectedDeliveryDate,
                o.Remarks
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SfaPobOrderDto>>.Success(list);
    }

    public async Task<Result<Guid>> CreatePobOrderAsync(CreatePobOrderRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        // Idempotency check for offline sync
        if (!string.IsNullOrWhiteSpace(request.ClientOfflineId))
        {
            var existing = await _context.SfaPobOrders
                .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.ClientOfflineId == request.ClientOfflineId, cancellationToken);
            if (existing != null)
                return Result<Guid>.Success(existing.Id);
        }

        // Auto-route to Chemist's PreferredStockist if not provided
        Guid? resolvedStockistId = request.TargetStockistPartyId;
        if (!resolvedStockistId.HasValue)
        {
            var chemist = await _context.SfaChemists
                .FirstOrDefaultAsync(c => c.Id == request.CustomerPartyId && c.TenantId == tenantId && !c.IsDeleted, cancellationToken);
            if (chemist?.PreferredStockistPartyId != null)
            {
                resolvedStockistId = chemist.PreferredStockistPartyId;
            }
        }

        var count = await _context.SfaPobOrders.CountAsync(o => o.TenantId == tenantId, cancellationToken);
        var orderNumber = $"POB-{DateTime.UtcNow:yyyyMM}-{count + 1:D4}";

        decimal subTotal = 0;
        decimal totalTax = 0;

        var pob = new SfaPobOrder
        {
            TenantId = tenantId,
            OrderNumber = orderNumber,
            MrUserId = userId,
            CustomerPartyId = request.CustomerPartyId,
            TargetStockistPartyId = resolvedStockistId,
            OrderDate = request.OrderDate,
            ClientOfflineId = request.ClientOfflineId,
            Remarks = request.Remarks,
            Status = "PendingApproval",
            StockistFulfillmentStatus = resolvedStockistId.HasValue ? "RoutedToStockist" : "NotRouted"
        };

        foreach (var i in request.Items)
        {
            var lineTaxable = i.Quantity * i.UnitPrice * (1m - (i.DiscountPercent / 100m));
            var lineTax = lineTaxable * (i.TaxRatePercent / 100m);
            var lineTotal = lineTaxable + lineTax;

            subTotal += lineTaxable;
            totalTax += lineTax;

            pob.Items.Add(new SfaPobOrderItem
            {
                TenantId = tenantId,
                ItemId = i.ItemId,
                Quantity = i.Quantity,
                FreeQuantity = i.FreeQuantity,
                AppliedSchemeId = i.AppliedSchemeId,
                AppliedSchemeName = i.AppliedSchemeName,
                UnitPrice = i.UnitPrice,
                DiscountPercent = i.DiscountPercent,
                TaxRatePercent = i.TaxRatePercent,
                TotalAmount = lineTotal
            });
        }

        pob.SubTotal = subTotal;
        pob.TaxAmount = totalTax;
        pob.GrandTotal = subTotal + totalTax;

        _context.SfaPobOrders.Add(pob);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(pob.Id);
    }

    public async Task<Result<Guid>> ConvertPobToInvoiceAsync(Guid pobOrderId, Guid warehouseId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var pob = await _context.SfaPobOrders
            .Include(o => o.Items).ThenInclude(i => i.Item)
            .Include(o => o.CustomerParty)
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == pobOrderId, cancellationToken);

        if (pob == null)
            return Result<Guid>.Failure("POB Order not found.", "NOT_FOUND");

        if (pob.ConvertedSalesInvoiceId.HasValue)
            return Result<Guid>.Failure("This POB order has already been converted to an invoice.", "ALREADY_CONVERTED");

        var defaultBranch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsActive, cancellationToken);

        if (defaultBranch == null)
            return Result<Guid>.Failure("No active branch found for tenant.", "BRANCH_NOT_FOUND");

        // Convert POB order to standard UdyogBill SalesInvoice using official SalesService
        var invoiceItems = new List<CreateSalesInvoiceItemRequest>();
        foreach (var pi in pob.Items)
        {
            var itemEntity = pi.Item ?? await _context.Items
                .Include(i => i.PrimaryUom)
                .FirstOrDefaultAsync(x => x.Id == pi.ItemId && x.TenantId == tenantId, cancellationToken);
            if (itemEntity == null) continue;

            // FEFO (First Expiry, First Out) Batch lookup
            var batch = await _context.ItemBatches
                .Where(b => b.TenantId == tenantId && b.ItemId == pi.ItemId && b.IsActive && b.ExpiryDate >= DateTime.UtcNow.Date)
                .OrderBy(b => b.ExpiryDate)
                .FirstOrDefaultAsync(cancellationToken);

            invoiceItems.Add(new CreateSalesInvoiceItemRequest
            {
                ItemId = pi.ItemId,
                BatchId = batch?.Id,
                BatchNumber = batch?.BatchNumber,
                ExpiryDate = batch?.ExpiryDate,
                Quantity = pi.Quantity,
                FreeQuantity = pi.FreeQuantity,
                UomId = itemEntity.PrimaryUomId,
                UnitPrice = pi.UnitPrice > 0 ? pi.UnitPrice : (batch?.SaleRate > 0 ? batch.SaleRate : itemEntity.SellingPrice),
                DiscountPercent = pi.DiscountPercent,
                Mrp = batch?.MRP > 0 ? batch.MRP : itemEntity.MRP,
                Ptr = batch?.Ptr > 0 ? batch.Ptr : 0m,
                Pts = batch?.Pts > 0 ? batch.Pts : 0m,
                Packing = itemEntity.AttributesJson?.Contains("packing") == true ? null : "Standard"
            });
        }

        if (invoiceItems.Count == 0)
        {
            return Result<Guid>.Failure("Cannot convert POB Order: No valid items found in order.", "EMPTY_ITEMS");
        }

        var invoiceReq = new CreateSalesInvoiceRequest
        {
            InvoiceType = InvoiceType.TaxInvoice,
            BranchId = defaultBranch.Id,
            WarehouseId = warehouseId,
            PartyId = pob.TargetStockistPartyId ?? pob.CustomerPartyId,
            CustomerName = pob.CustomerParty?.LegalName ?? "Medical Chemist",
            CustomerPhone = pob.CustomerParty?.PrimaryPhone ?? pob.CustomerParty?.Mobile,
            CustomerGSTIN = pob.CustomerParty?.GSTIN,
            BillingAddress = pob.CustomerParty?.TradeName ?? pob.CustomerParty?.LegalName,
            BillingStateCode = pob.CustomerParty?.StateCode ?? defaultBranch.StateCode ?? "27",
            PlaceOfSupply = defaultBranch.State ?? "Maharashtra",
            InvoiceDate = DateTime.UtcNow,
            Notes = $"Generated from Pharma SFA POB Order {pob.OrderNumber}",
            Items = invoiceItems
        };

        var invoiceResult = await _salesService.CreateInvoiceAsync(invoiceReq, null, cancellationToken);
        if (!invoiceResult.IsSuccess)
            return Result<Guid>.Failure(invoiceResult.ErrorMessage ?? "Invoice creation failed.", invoiceResult.ErrorCode);

        var createdInvoiceId = invoiceResult.Data;
        pob.ConvertedSalesInvoiceId = createdInvoiceId;
        pob.Status = "ConvertedToSalesInvoice";
        pob.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Attribute sales to MR
        await AttributeSalesInvoiceAsync(createdInvoiceId, cancellationToken);

        return Result<Guid>.Success(createdInvoiceId);
    }

    #endregion

    #region 4. Historical Sales Attribution Bridge & Reconciliation

    public async Task<Result<bool>> AttributeSalesInvoiceAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var invoice = await _context.SalesInvoices
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == salesInvoiceId, cancellationToken);

        if (invoice == null || !invoice.PartyId.HasValue)
            return Result<bool>.Success(false);

        // Check if attribution already recorded
        var existing = await _context.SfaSalesAttributions
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.SalesInvoiceId == salesInvoiceId, cancellationToken);
        if (existing != null)
            return Result<bool>.Success(true);

        // Find active MR allocated to this stockist as of the invoice date!
        var allocation = await _context.SfaStockistAllocations
            .Where(a => a.TenantId == tenantId && a.StockistPartyId == invoice.PartyId.Value &&
                        a.EffectiveFrom <= invoice.InvoiceDate &&
                        (a.EffectiveTo == null || a.EffectiveTo >= invoice.InvoiceDate))
            .OrderByDescending(a => a.EffectiveFrom)
            .FirstOrDefaultAsync(cancellationToken);

        if (allocation == null)
            return Result<bool>.Success(false); // Party is not a mapped pharma stockist

        var attribution = new SfaSalesAttribution
        {
            TenantId = tenantId,
            SalesInvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate,
            StockistPartyId = allocation.StockistPartyId,
            MrUserId = allocation.MrUserId,
            TerritoryId = allocation.TerritoryId,
            InvoiceTotalAmount = invoice.TotalAmount,
            TaxableAmount = invoice.SubTotal,
            AttributedAtUtc = DateTime.UtcNow,
            AttributionMethod = "HistoricalStockistMapping"
        };

        _context.SfaSalesAttributions.Add(attribution);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<MrSalesAttributionDto>>> GetSalesAttributionsAsync(DateTime fromDate, DateTime toDate, Guid? mrUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaSalesAttributions
            .Where(a => a.TenantId == tenantId && a.InvoiceDate >= fromDate && a.InvoiceDate <= toDate)
            .Include(a => a.StockistParty)
            .Include(a => a.MrUser)
            .AsQueryable();

        if (mrUserId.HasValue)
            query = query.Where(a => a.MrUserId == mrUserId.Value);

        var list = await query
            .OrderByDescending(a => a.InvoiceDate)
            .Select(a => new MrSalesAttributionDto(
                a.Id,
                a.SalesInvoiceId,
                a.InvoiceNumber,
                a.InvoiceDate,
                a.StockistPartyId,
                a.StockistParty.LegalName,
                a.MrUserId,
                a.MrUser.FullName,
                a.InvoiceTotalAmount,
                a.TaxableAmount,
                a.AttributedAtUtc,
                a.AttributionMethod
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<MrSalesAttributionDto>>.Success(list);
    }

    public async Task<Result<PharmaReconciliationReportDto>> GetReconciliationReportAsync(DateTime fromDate, DateTime toDate, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var totalCoreSales = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate && i.Status != InvoiceStatus.Cancelled)
            .SumAsync(i => (decimal?)i.TotalAmount, cancellationToken) ?? 0m;

        var totalInvoicesCount = await _context.SalesInvoices
            .CountAsync(i => i.TenantId == tenantId && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate && i.Status != InvoiceStatus.Cancelled, cancellationToken);

        var stockistPartyIds = await _context.SfaStockistAllocations
            .Where(a => a.TenantId == tenantId)
            .Select(a => a.StockistPartyId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var totalStockistSales = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate && i.PartyId.HasValue && stockistPartyIds.Contains(i.PartyId.Value) && i.Status != InvoiceStatus.Cancelled)
            .SumAsync(i => (decimal?)i.TotalAmount, cancellationToken) ?? 0m;

        var totalMrAttributedSales = await _context.SfaSalesAttributions
            .Where(a => a.TenantId == tenantId && a.InvoiceDate >= fromDate && a.InvoiceDate <= toDate)
            .SumAsync(a => (decimal?)a.InvoiceTotalAmount, cancellationToken) ?? 0m;

        var attributedCount = await _context.SfaSalesAttributions
            .CountAsync(a => a.TenantId == tenantId && a.InvoiceDate >= fromDate && a.InvoiceDate <= toDate, cancellationToken);

        var discrepancy = Math.Abs(totalStockistSales - totalMrAttributedSales);

        var report = new PharmaReconciliationReportDto(
            FromDate: fromDate,
            ToDate: toDate,
            TotalCoreInvoiceSales: totalCoreSales,
            TotalStockistSales: totalStockistSales,
            TotalMrAttributedSales: totalMrAttributedSales,
            DiscrepancyAmount: discrepancy,
            IsReconciled: discrepancy == 0m,
            TotalInvoicesCount: totalInvoicesCount,
            AttributedInvoicesCount: attributedCount,
            UnattributedInvoicesCount: Math.Max(0, totalInvoicesCount - attributedCount)
        );

        return Result<PharmaReconciliationReportDto>.Success(report);
    }

    public async Task<Result<IReadOnlyList<MrTargetVsAchievementDto>>> GetTargetVsAchievementAsync(int month, int year, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var targets = await _context.SfaMrTargets
            .Where(t => t.TenantId == tenantId && t.Month == month && t.Year == year)
            .Include(t => t.MrUser)
            .ToListAsync(cancellationToken);

        var startOfMonth = new DateTime(year, month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var attributions = await _context.SfaSalesAttributions
            .Where(a => a.TenantId == tenantId && a.InvoiceDate >= startOfMonth && a.InvoiceDate <= endOfMonth)
            .GroupBy(a => a.MrUserId)
            .Select(g => new { MrUserId = g.Key, TotalAchieved = g.Sum(x => x.InvoiceTotalAmount) })
            .ToDictionaryAsync(x => x.MrUserId, x => x.TotalAchieved, cancellationToken);

        var dcrDoctorCalls = await _context.SfaDailyCallReports
            .Where(d => d.TenantId == tenantId && d.DcrDate >= startOfMonth && d.DcrDate <= endOfMonth)
            .GroupBy(d => d.MrUserId)
            .Select(g => new { MrUserId = g.Key, TotalCalls = g.Sum(x => x.TotalDoctorsVisited) })
            .ToDictionaryAsync(x => x.MrUserId, x => x.TotalCalls, cancellationToken);

        var result = new List<MrTargetVsAchievementDto>();
        foreach (var t in targets)
        {
            var achievedSales = attributions.TryGetValue(t.MrUserId, out var val) ? val : 0m;
            var achievedCalls = dcrDoctorCalls.TryGetValue(t.MrUserId, out var calls) ? calls : 0;

            var salesPct = t.TargetSalesAmount > 0 ? Math.Round((achievedSales / t.TargetSalesAmount) * 100, 1) : 0m;
            var callsPct = t.TargetDoctorCalls > 0 ? Math.Round(((decimal)achievedCalls / t.TargetDoctorCalls) * 100, 1) : 0m;

            result.Add(new MrTargetVsAchievementDto(
                MrUserId: t.MrUserId,
                MrName: t.MrUser.FullName,
                Month: month,
                Year: year,
                TargetSalesAmount: t.TargetSalesAmount,
                AchievedSalesAmount: achievedSales,
                SalesAchievementPercent: salesPct,
                TargetDoctorCalls: t.TargetDoctorCalls,
                AchievedDoctorCalls: achievedCalls,
                DoctorCallsAchievementPercent: callsPct
            ));
        }

        return Result<IReadOnlyList<MrTargetVsAchievementDto>>.Success(result);
    }

    #endregion

    #region Sprint 4: Multi-Level Hierarchy, Manager Approvals & Expense Policies

    public async Task<Result<IReadOnlyList<UserHierarchyDto>>> GetHierarchiesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var hierarchies = await _context.SfaUserHierarchies
            .Where(h => h.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var users = await _context.Users
            .Where(u => u.TenantId == tenantId)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var territories = await _context.SfaTerritories
            .Where(t => t.TenantId == tenantId)
            .ToDictionaryAsync(t => t.Id, cancellationToken);

        var subCounts = hierarchies
            .Where(h => h.ReportsToUserId.HasValue)
            .GroupBy(h => h.ReportsToUserId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        var list = new List<UserHierarchyDto>();
        foreach (var h in hierarchies)
        {
            users.TryGetValue(h.UserId, out var u);
            string userName = u?.FullName ?? "Unknown User";
            string userEmail = u?.Email ?? "";

            string? reportsToName = null;
            if (h.ReportsToUserId.HasValue && users.TryGetValue(h.ReportsToUserId.Value, out var rUser))
            {
                reportsToName = rUser.FullName;
            }

            string? abmName = null;
            if (h.AbmUserId.HasValue && users.TryGetValue(h.AbmUserId.Value, out var abmUser))
            {
                abmName = abmUser.FullName;
            }

            string? rsmName = null;
            if (h.RsmUserId.HasValue && users.TryGetValue(h.RsmUserId.Value, out var rsmUser))
            {
                rsmName = rsmUser.FullName;
            }

            string? zsmName = null;
            if (h.ZsmUserId.HasValue && users.TryGetValue(h.ZsmUserId.Value, out var zsmUser))
            {
                zsmName = zsmUser.FullName;
            }

            string? territoryName = null;
            if (h.TerritoryId.HasValue && territories.TryGetValue(h.TerritoryId.Value, out var terr))
            {
                territoryName = terr.Name;
            }

            int count = subCounts.TryGetValue(h.UserId, out var c) ? c : 0;

            list.Add(new UserHierarchyDto(
                h.Id,
                h.UserId,
                userName,
                userEmail,
                h.Designation,
                h.HeadquartersTown,
                h.ReportsToUserId,
                reportsToName,
                h.AbmUserId,
                abmName,
                h.RsmUserId,
                rsmName,
                h.ZsmUserId,
                zsmName,
                h.TerritoryId,
                territoryName,
                h.IsActive,
                count
            ));
        }

        return Result<IReadOnlyList<UserHierarchyDto>>.Success(list);
    }

    public async Task<Result<OrgNodeDto>> GetOrgTreeAsync(Guid? rootUserId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var hierarchies = await _context.SfaUserHierarchies
            .Where(h => h.TenantId == tenantId && h.IsActive)
            .ToListAsync(cancellationToken);

        var users = await _context.Users
            .Where(u => u.TenantId == tenantId)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var employeeProfiles = await _context.SfaEmployeeProfiles
            .Where(e => e.TenantId == tenantId)
            .ToDictionaryAsync(e => e.UserId, cancellationToken);

        // Find root
        SfaUserHierarchy? rootHierarchy = null;
        if (rootUserId.HasValue)
        {
            rootHierarchy = hierarchies.FirstOrDefault(h => h.UserId == rootUserId.Value);
        }

        if (rootHierarchy == null)
        {
            // Pick highest level node: ZSM, NSM, or one with no ReportsTo
            rootHierarchy = hierarchies.FirstOrDefault(h => h.ReportsToUserId == null)
                            ?? hierarchies.FirstOrDefault(h => h.Designation.Contains("ZSM", StringComparison.OrdinalIgnoreCase) || h.Designation.Contains("Director", StringComparison.OrdinalIgnoreCase))
                            ?? hierarchies.FirstOrDefault();
        }

        if (rootHierarchy == null)
        {
            // Fallback: create virtual root for tenant
            return Result<OrgNodeDto>.Success(new OrgNodeDto(
                UserId: Guid.Empty,
                Name: "Sales Organization",
                Designation: "Head of Sales",
                HeadquartersTown: "Central HQ",
                Email: "sales@enterprise.com",
                Mobile: "-",
                TeamSize: 0,
                Subordinates: new List<OrgNodeDto>()
            ));
        }

        var lookupByManager = hierarchies
            .Where(h => h.ReportsToUserId.HasValue)
            .GroupBy(h => h.ReportsToUserId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        OrgNodeDto BuildNode(SfaUserHierarchy h)
        {
            users.TryGetValue(h.UserId, out var u);
            employeeProfiles.TryGetValue(h.UserId, out var ep);

            var directSubs = lookupByManager.TryGetValue(h.UserId, out var subList) ? subList : new List<SfaUserHierarchy>();
            var subNodes = directSubs.Select(BuildNode).ToList();
            int teamSize = subNodes.Sum(s => s.TeamSize) + directSubs.Count;

            return new OrgNodeDto(
                UserId: h.UserId,
                Name: u?.FullName ?? "Staff Member",
                Designation: h.Designation,
                HeadquartersTown: h.HeadquartersTown,
                Email: u?.Email,
                Mobile: ep?.Mobile,
                TeamSize: teamSize,
                Subordinates: subNodes
            );
        }

        var rootNode = BuildNode(rootHierarchy);
        return Result<OrgNodeDto>.Success(rootNode);
    }

    public async Task<Result<Guid>> CreateOrUpdateHierarchyAsync(CreateUserHierarchyRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var existing = await _context.SfaUserHierarchies
            .FirstOrDefaultAsync(h => h.TenantId == tenantId && h.UserId == request.UserId, cancellationToken);

        if (existing == null)
        {
            existing = new SfaUserHierarchy
            {
                TenantId = tenantId,
                UserId = request.UserId,
                Designation = request.Designation,
                HeadquartersTown = request.HeadquartersTown,
                ReportsToUserId = request.ReportsToUserId,
                AbmUserId = request.AbmUserId,
                RsmUserId = request.RsmUserId,
                ZsmUserId = request.ZsmUserId,
                TerritoryId = request.TerritoryId,
                IsActive = true
            };
            _context.SfaUserHierarchies.Add(existing);
        }
        else
        {
            existing.Designation = request.Designation;
            existing.HeadquartersTown = request.HeadquartersTown;
            existing.ReportsToUserId = request.ReportsToUserId;
            existing.AbmUserId = request.AbmUserId;
            existing.RsmUserId = request.RsmUserId;
            existing.ZsmUserId = request.ZsmUserId;
            existing.TerritoryId = request.TerritoryId;
            existing.IsActive = true;
        }

        // Sync with SfaEmployeeProfile if present
        var profile = await _context.SfaEmployeeProfiles
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.UserId == request.UserId, cancellationToken);

        if (profile != null)
        {
            profile.ReportingAbmUserId = request.AbmUserId;
            profile.ReportingRsmUserId = request.RsmUserId;
            profile.ReportingZsmUserId = request.ZsmUserId;
            if (request.TerritoryId.HasValue) profile.TerritoryId = request.TerritoryId.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(existing.Id);
    }

    public async Task<Result<TeamCallComplianceSummaryDto>> GetTeamCallComplianceAsync(Guid managerUserId, int month, int year, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var managerUser = await _context.Users.FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == managerUserId, cancellationToken);
        string managerName = managerUser?.FullName ?? "Manager";

        // Find subordinates in hierarchy
        var subordinates = await _context.SfaUserHierarchies
            .Where(h => h.TenantId == tenantId && (h.ReportsToUserId == managerUserId || h.AbmUserId == managerUserId || h.RsmUserId == managerUserId || h.ZsmUserId == managerUserId))
            .ToListAsync(cancellationToken);

        var subUserIds = subordinates.Select(s => s.UserId).ToList();
        if (subUserIds.Count == 0)
        {
            // If no subordinates assigned directly, include all active MRs for tenant
            var allMrs = await _context.SfaEmployeeProfiles
                .Where(e => e.TenantId == tenantId && e.IsActive)
                .Select(e => e.UserId)
                .ToListAsync(cancellationToken);
            subUserIds = allMrs;
        }

        var users = await _context.Users
            .Where(u => u.TenantId == tenantId && subUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var hierByUserId = subordinates.ToDictionary(s => s.UserId);

        var startOfMonth = new DateTime(year, month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        // Tour plan planned calls
        var tourPlans = await _context.SfaTourPlans
            .Include(tp => tp.Items)
            .Where(tp => tp.TenantId == tenantId && tp.Month == month && tp.Year == year && subUserIds.Contains(tp.MrUserId))
            .ToListAsync(cancellationToken);

        var plannedVisits = tourPlans
            .ToDictionary(tp => tp.MrUserId, tp => tp.Items.Sum(i => i.PlannedDoctorCalls));

        // DCR actual visits
        var dcrVisits = await _context.SfaDailyCallReports
            .Where(d => d.TenantId == tenantId && d.DcrDate >= startOfMonth && d.DcrDate <= endOfMonth && subUserIds.Contains(d.MrUserId))
            .GroupBy(d => d.MrUserId)
            .Select(g => new
            {
                MrUserId = g.Key,
                CompletedCalls = g.Sum(x => x.TotalDoctorsVisited),
                Kms = g.Sum(x => x.ActualGpsDistanceKm)
            })
            .ToDictionaryAsync(x => x.MrUserId, cancellationToken);

        // Expense claims
        var expenseClaims = await _context.SfaExpenseClaims
            .Where(ec => ec.TenantId == tenantId && ec.Month == month && ec.Year == year && subUserIds.Contains(ec.MrUserId))
            .GroupBy(ec => ec.MrUserId)
            .Select(g => new
            {
                MrUserId = g.Key,
                Claimed = g.Sum(x => x.TotalClaimAmount),
                Approved = g.Sum(x => x.ApprovedAmount)
            })
            .ToDictionaryAsync(x => x.MrUserId, cancellationToken);


        var items = new List<MrCallComplianceItemDto>();
        int totalScheduled = 0;
        int totalCompleted = 0;

        foreach (var userId in subUserIds)
        {
            users.TryGetValue(userId, out var u);
            hierByUserId.TryGetValue(userId, out var h);

            int scheduled = plannedVisits.TryGetValue(userId, out var sch) ? sch : 0;
            if (scheduled == 0) scheduled = 40; // baseline standard target if no TP submitted

            int completed = dcrVisits.TryGetValue(userId, out var dcr) ? dcr.CompletedCalls : 0;
            decimal kms = dcrVisits.TryGetValue(userId, out var dcrKms) ? dcrKms.Kms : 0m;

            decimal rate = scheduled > 0 ? Math.Round(((decimal)completed / scheduled) * 100m, 1) : 0m;
            decimal claimed = expenseClaims.TryGetValue(userId, out var exp) ? exp.Claimed : 0m;
            decimal approved = expenseClaims.TryGetValue(userId, out var expApp) ? expApp.Approved : 0m;

            totalScheduled += scheduled;
            totalCompleted += completed;

            items.Add(new MrCallComplianceItemDto(
                MrUserId: userId,
                MrName: u?.FullName ?? "Medical Rep",
                Designation: h?.Designation ?? "Medical Representative",
                HeadquartersTown: h?.HeadquartersTown,
                ScheduledCalls: scheduled,
                CompletedCalls: completed,
                ComplianceRate: rate,
                TotalKmsTraveled: kms,
                TotalExpensesClaimed: claimed,
                TotalExpensesApproved: approved
            ));
        }

        decimal teamCompliance = totalScheduled > 0 ? Math.Round(((decimal)totalCompleted / totalScheduled) * 100m, 1) : 0m;

        var summary = new TeamCallComplianceSummaryDto(
            ManagerUserId: managerUserId,
            ManagerName: managerName,
            TotalTeamMembers: subUserIds.Count,
            TotalScheduledCalls: totalScheduled,
            TotalCompletedCalls: totalCompleted,
            TeamCallComplianceRate: teamCompliance,
            MrBreakdown: items
        );

        return Result<TeamCallComplianceSummaryDto>.Success(summary);
    }

    public async Task<Result<IReadOnlyList<ExpensePolicyDto>>> GetExpensePoliciesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var policies = await _context.SfaExpensePolicies
            .Where(p => p.TenantId == tenantId)
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var list = policies.Select(p => new ExpensePolicyDto(
            p.Id,
            p.PolicyName,
            p.HqDailyAllowance,
            p.ExHqDailyAllowance,
            p.OutstationDailyAllowance,
            p.RatePerKmTwoWheeler,
            p.RatePerKmFourWheeler,
            p.HotelAllowancePerNight,
            p.MaxMonthlyExpenseLimit,
            p.IsActive
        )).ToList();

        if (list.Count == 0)
        {
            // Return active default policy
            list.Add(new ExpensePolicyDto(
                Guid.NewGuid(),
                "Standard Pharma Field Policy",
                HqDailyAllowance: 250m,
                ExHqDailyAllowance: 450m,
                OutstationDailyAllowance: 800m,
                RatePerKmTwoWheeler: 3.5m,
                RatePerKmFourWheeler: 8.5m,
                HotelAllowancePerNight: 1800m,
                MaxMonthlyExpenseLimit: 35000m,
                IsActive: true
            ));
        }

        return Result<IReadOnlyList<ExpensePolicyDto>>.Success(list);
    }

    public async Task<Result<ExpensePolicyDto>> GetActiveExpensePolicyAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var policy = await _context.SfaExpensePolicies
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IsActive, cancellationToken);

        if (policy == null)
        {
            return Result<ExpensePolicyDto>.Success(new ExpensePolicyDto(
                Guid.NewGuid(),
                "Standard Pharma Field Policy",
                HqDailyAllowance: 250m,
                ExHqDailyAllowance: 450m,
                OutstationDailyAllowance: 800m,
                RatePerKmTwoWheeler: 3.5m,
                RatePerKmFourWheeler: 8.5m,
                HotelAllowancePerNight: 1800m,
                MaxMonthlyExpenseLimit: 35000m,
                IsActive: true
            ));
        }

        return Result<ExpensePolicyDto>.Success(new ExpensePolicyDto(
            policy.Id,
            policy.PolicyName,
            policy.HqDailyAllowance,
            policy.ExHqDailyAllowance,
            policy.OutstationDailyAllowance,
            policy.RatePerKmTwoWheeler,
            policy.RatePerKmFourWheeler,
            policy.HotelAllowancePerNight,
            policy.MaxMonthlyExpenseLimit,
            policy.IsActive
        ));
    }

    public async Task<Result<Guid>> SaveExpensePolicyAsync(SaveExpensePolicyRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.IsActive)
        {
            var otherPolicies = await _context.SfaExpensePolicies
                .Where(p => p.TenantId == tenantId && p.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var p in otherPolicies)
            {
                p.IsActive = false;
            }
        }

        var policy = new SfaExpensePolicy
        {
            TenantId = tenantId,
            PolicyName = request.PolicyName,
            HqDailyAllowance = request.HqDailyAllowance,
            ExHqDailyAllowance = request.ExHqDailyAllowance,
            OutstationDailyAllowance = request.OutstationDailyAllowance,
            RatePerKmTwoWheeler = request.RatePerKmTwoWheeler,
            RatePerKmFourWheeler = request.RatePerKmFourWheeler,
            HotelAllowancePerNight = request.HotelAllowancePerNight,
            MaxMonthlyExpenseLimit = request.MaxMonthlyExpenseLimit,
            IsActive = request.IsActive
        };

        _context.SfaExpensePolicies.Add(policy);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(policy.Id);
    }

    public async Task<Result<ExpenseEligibilityResponse>> CalculateExpenseEligibilityAsync(CalculateExpenseEligibilityRequest request, CancellationToken cancellationToken = default)
    {
        var policyResult = await GetActiveExpensePolicyAsync(cancellationToken);
        var policy = policyResult.Data ?? new ExpensePolicyDto(
            Id: Guid.NewGuid(),
            PolicyName: "Standard Default",
            HqDailyAllowance: 250m,
            ExHqDailyAllowance: 350m,
            OutstationDailyAllowance: 600m,
            RatePerKmTwoWheeler: 4.5m,
            RatePerKmFourWheeler: 8.5m,
            HotelAllowancePerNight: 1200m,
            MaxMonthlyExpenseLimit: 15000m,
            IsActive: true
        );

        decimal da = request.WorkType?.ToUpperInvariant() switch
        {
            "HQ" => policy.HqDailyAllowance,
            "EX_HQ" => policy.ExHqDailyAllowance,
            "OUTSTATION" => policy.OutstationDailyAllowance,
            _ => policy.HqDailyAllowance
        };

        decimal ratePerKm = request.VehicleType?.Equals("FourWheeler", StringComparison.OrdinalIgnoreCase) == true
            ? policy.RatePerKmFourWheeler
            : policy.RatePerKmTwoWheeler;

        decimal travel = Math.Max(0, request.DistanceKm) * ratePerKm;
        decimal hotel = Math.Max(0, request.HotelNights) * policy.HotelAllowancePerNight;
        decimal total = da + travel + hotel;

        return Result<ExpenseEligibilityResponse>.Success(new ExpenseEligibilityResponse(
            DailyAllowance: da,
            TravelAllowance: travel,
            HotelAllowance: hotel,
            TotalEligibleAmount: total
        ));
    }

    public async Task<Result<bool>> ProcessExpenseClaimActionAsync(ManagerExpenseClaimActionRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var claim = await _context.SfaExpenseClaims
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.ClaimId, cancellationToken);

        if (claim == null)
        {
            return Result<bool>.Failure("Expense claim record not found.", "NOT_FOUND");
        }

        var currentUserId = _currentUserContext.UserId;

        switch (request.Action.ToUpperInvariant())
        {
            case "APPROVE":
                claim.Status = "ManagerApproved";
                claim.ApprovedAmount = request.ApprovedAmount ?? claim.TotalClaimAmount;
                claim.ApprovedAtUtc = DateTime.UtcNow;
                claim.ApprovedByUserId = currentUserId;
                claim.Remarks = request.Remarks ?? claim.Remarks;
                break;

            case "REJECT":
                claim.Status = "Rejected";
                claim.Remarks = request.Remarks ?? claim.Remarks;
                break;

            case "VERIFYACCOUNTS":
                claim.Status = "AccountsVerified";
                claim.AccountsVerifiedAtUtc = DateTime.UtcNow;
                claim.AccountsVerifiedByUserId = currentUserId;
                if (!string.IsNullOrWhiteSpace(request.Remarks))
                {
                    claim.Remarks = string.IsNullOrWhiteSpace(claim.Remarks) ? request.Remarks : $"{claim.Remarks} | {request.Remarks}";
                }
                break;

            case "DISBURSE":
                claim.Status = "Paid";
                claim.DisbursedAtUtc = DateTime.UtcNow;
                claim.PaymentMode = request.PaymentMode ?? "Bank Transfer";
                claim.PaymentReferenceNumber = request.PaymentReferenceNumber ?? $"UTR-{DateTime.UtcNow.Ticks}";
                break;

            default:
                return Result<bool>.Failure($"Unsupported claim action: {request.Action}", "INVALID_ACTION");
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    #endregion

    #region Sprint 5: Commercial Scheme Engine, Dynamic POB Routing & Secondary Sales

    public async Task<Result<IReadOnlyList<SfaSchemeMasterDto>>> GetSchemesAsync(Guid? divisionId = null, Guid? itemId = null, bool activeOnly = true, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SfaSchemeMasters
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .Include(s => s.Division)
            .Include(s => s.Item)
            .Include(s => s.Slabs)
                .ThenInclude(sl => sl.FreeItem)
            .AsQueryable();

        if (divisionId.HasValue)
        {
            query = query.Where(s => s.DivisionId == divisionId.Value || s.DivisionId == null);
        }

        if (itemId.HasValue)
        {
            query = query.Where(s => s.ItemId == itemId.Value || s.ItemId == null);
        }

        if (activeOnly)
        {
            var now = DateTime.UtcNow;
            query = query.Where(s => s.IsActive && s.ValidFromUtc <= now && s.ValidToUtc >= now);
        }

        var schemes = await query
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var dtos = schemes.Select(s => new SfaSchemeMasterDto(
            s.Id,
            s.SchemeCode,
            s.SchemeName,
            s.DivisionId,
            s.Division?.Name,
            s.ItemId,
            s.Item?.Name,
            (int)s.SchemeType,
            s.SchemeType.ToString(),
            s.ValidFromUtc,
            s.ValidToUtc,
            s.MinimumOrderQuantity,
            s.MinimumOrderValue,
            s.IsActive,
            s.Description,
            s.Slabs.Where(sl => !sl.IsDeleted).Select(sl => new SfaSchemeSlabDto(
                sl.Id,
                sl.SchemeMasterId,
                sl.MinQuantity,
                sl.MaxQuantity,
                sl.FreeQuantity,
                sl.DiscountPercent,
                sl.FlatDiscountAmount,
                sl.FreeItemId,
                sl.FreeItem?.Name
            )).ToList()
        )).ToList();

        return Result<IReadOnlyList<SfaSchemeMasterDto>>.Success(dtos);
    }

    public async Task<Result<Guid>> CreateOrUpdateSchemeAsync(CreateSchemeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (string.IsNullOrWhiteSpace(request.SchemeName))
        {
            return Result<Guid>.Failure("Scheme name is required.", "INVALID_NAME");
        }

        if (request.ValidToUtc < request.ValidFromUtc)
        {
            return Result<Guid>.Failure("Valid to date cannot be before valid from date.", "INVALID_DATE_RANGE");
        }

        var scheme = new SfaSchemeMaster
        {
            TenantId = tenantId,
            SchemeCode = string.IsNullOrWhiteSpace(request.SchemeCode) ? $"SCH-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}" : request.SchemeCode.Trim(),
            SchemeName = request.SchemeName.Trim(),
            DivisionId = request.DivisionId,
            ItemId = request.ItemId,
            SchemeType = (SfaSchemeType)request.SchemeType,
            ValidFromUtc = request.ValidFromUtc,
            ValidToUtc = request.ValidToUtc,
            MinimumOrderQuantity = request.MinimumOrderQuantity,
            MinimumOrderValue = request.MinimumOrderValue,
            Description = request.Description,
            IsActive = true
        };

        if (request.Slabs != null)
        {
            foreach (var slabReq in request.Slabs)
            {
                scheme.Slabs.Add(new SfaSchemeSlab
                {
                    TenantId = tenantId,
                    MinQuantity = slabReq.MinQuantity,
                    MaxQuantity = slabReq.MaxQuantity,
                    FreeQuantity = slabReq.FreeQuantity,
                    DiscountPercent = slabReq.DiscountPercent,
                    FlatDiscountAmount = slabReq.FlatDiscountAmount,
                    FreeItemId = slabReq.FreeItemId
                });
            }
        }

        _context.SfaSchemeMasters.Add(scheme);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(scheme.Id);
    }

    public async Task<Result<CalculatedSchemeResultDto>> EvaluateSchemeAsync(CalculateSchemeRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var now = DateTime.UtcNow;

        var matchingSchemes = await _context.SfaSchemeMasters
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.IsActive && s.ValidFromUtc <= now && s.ValidToUtc >= now)
            .Where(s => s.ItemId == request.ItemId || (s.ItemId == null && (request.DivisionId == null || s.DivisionId == request.DivisionId)))
            .Include(s => s.Slabs)
                .ThenInclude(sl => sl.FreeItem)
            .OrderByDescending(s => s.ItemId != null) // Prioritize item-specific schemes over division-level
            .ThenByDescending(s => s.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        foreach (var scheme in matchingSchemes)
        {
            if (request.Quantity < scheme.MinimumOrderQuantity) continue;

            // Find matching slab
            var matchingSlab = scheme.Slabs
                .Where(sl => !sl.IsDeleted && request.Quantity >= sl.MinQuantity && (!sl.MaxQuantity.HasValue || request.Quantity <= sl.MaxQuantity.Value))
                .OrderByDescending(sl => sl.MinQuantity)
                .FirstOrDefault();

            if (matchingSlab != null)
            {
                decimal freeQty = 0;
                if (scheme.SchemeType == SfaSchemeType.FreeGoods && matchingSlab.MinQuantity > 0)
                {
                    // If slab has min quantity, calculate multiplier (e.g. 10+1 free -> 25 ordered gives 2 free)
                    int multiplier = (int)(request.Quantity / matchingSlab.MinQuantity);
                    freeQty = multiplier * (matchingSlab.FreeQuantity > 0 ? matchingSlab.FreeQuantity : 1);
                }
                else
                {
                    freeQty = matchingSlab.FreeQuantity;
                }

                decimal priceMultiplier = matchingSlab.DiscountPercent > 0
                    ? Math.Max(0, (100m - matchingSlab.DiscountPercent) / 100m)
                    : 1m;

                return Result<CalculatedSchemeResultDto>.Success(new CalculatedSchemeResultDto(
                    scheme.Id,
                    scheme.SchemeCode,
                    scheme.SchemeName,
                    (int)scheme.SchemeType,
                    freeQty,
                    matchingSlab.DiscountPercent,
                    matchingSlab.FlatDiscountAmount,
                    matchingSlab.FreeItemId ?? scheme.ItemId ?? request.ItemId,
                    matchingSlab.FreeItem?.Name,
                    request.Quantity,
                    priceMultiplier
                ));
            }
        }

        // No scheme applicable
        return Result<CalculatedSchemeResultDto>.Success(new CalculatedSchemeResultDto(
            null,
            null,
            "Standard Pricing (No Scheme)",
            1,
            0,
            0,
            0,
            null,
            null,
            request.Quantity,
            1m
        ));
    }

    public async Task<Result<bool>> UpdatePobFulfillmentStatusAsync(UpdatePobFulfillmentStatusRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var order = await _context.SfaPobOrders
            .FirstOrDefaultAsync(p => p.Id == request.PobOrderId && p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<bool>.Failure("POB Order not found.", "NOT_FOUND");
        }

        order.StockistFulfillmentStatus = request.FulfillmentStatus;
        if (!string.IsNullOrWhiteSpace(request.StockistRemarks))
        {
            order.StockistRemarks = request.StockistRemarks;
        }
        if (request.ExpectedDeliveryDate.HasValue)
        {
            order.ExpectedDeliveryDate = request.ExpectedDeliveryDate.Value;
        }

        if (request.FulfillmentStatus.Equals("Fulfilled", StringComparison.OrdinalIgnoreCase))
        {
            order.Status = "Completed";
        }
        else if (request.FulfillmentStatus.Equals("StockistAccepted", StringComparison.OrdinalIgnoreCase))
        {
            order.Status = "Approved";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> RoutePobToStockistAsync(RoutePobToStockistRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var order = await _context.SfaPobOrders
            .FirstOrDefaultAsync(p => p.Id == request.PobOrderId && p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<bool>.Failure("POB Order not found.", "NOT_FOUND");
        }

        order.TargetStockistPartyId = request.TargetStockistPartyId;
        order.StockistFulfillmentStatus = "RoutedToStockist";
        if (!string.IsNullOrWhiteSpace(request.Remarks))
        {
            order.Remarks = string.IsNullOrWhiteSpace(order.Remarks) ? request.Remarks : $"{order.Remarks} | {request.Remarks}";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<IReadOnlyList<SecondarySalesReconciliationDto>>> GetSecondarySalesReconciliationAsync(DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var start = fromDate ?? DateTime.UtcNow.AddDays(-30);
        var end = toDate ?? DateTime.UtcNow;

        // 1. Primary sales: Invoices or Attributions to stockists
        var primaryAttributions = await _context.SfaSalesAttributions
            .Where(a => a.TenantId == tenantId && !a.IsDeleted && a.InvoiceDate >= start && a.InvoiceDate <= end)
            .Include(a => a.StockistParty)
            .Include(a => a.Territory)
            .ToListAsync(cancellationToken);

        // 2. Secondary sales: POB orders directed to stockists
        var secondaryPobs = await _context.SfaPobOrders
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && p.TargetStockistPartyId != null && p.OrderDate >= start && p.OrderDate <= end)
            .Include(p => p.TargetStockistParty)
            .ToListAsync(cancellationToken);

        // Get unique stockist IDs
        var stockistIds = primaryAttributions.Select(a => a.StockistPartyId)
            .Union(secondaryPobs.Where(p => p.TargetStockistPartyId.HasValue).Select(p => p.TargetStockistPartyId!.Value))
            .Distinct()
            .ToList();

        // Also include all known customer parties if none had orders in window
        if (!stockistIds.Any())
        {
            var defaultStockists = await _context.Parties
                .Where(p => p.TenantId == tenantId && !p.IsDeleted && (p.PartyType == PartyType.Customer || p.PartyType == PartyType.Both))
                .Take(10)
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);
            stockistIds.AddRange(defaultStockists);
        }

        var stockistParties = await _context.Parties
            .Where(p => stockistIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var list = new List<SecondarySalesReconciliationDto>();

        foreach (var sId in stockistIds)
        {
            if (!stockistParties.TryGetValue(sId, out var party)) continue;

            var primaryForStockist = primaryAttributions.Where(a => a.StockistPartyId == sId).ToList();
            var secondaryForStockist = secondaryPobs.Where(p => p.TargetStockistPartyId == sId).ToList();

            decimal primaryVal = primaryForStockist.Sum(a => a.InvoiceTotalAmount);
            int primaryCount = primaryForStockist.Count;

            decimal secondaryVal = secondaryForStockist.Sum(p => p.GrandTotal);
            int secondaryCount = secondaryForStockist.Count;

            decimal ratio = primaryVal > 0 ? Math.Round((secondaryVal / primaryVal) * 100m, 1) : (secondaryVal > 0 ? 100m : 0m);
            decimal stockHolding = Math.Max(0, primaryVal - secondaryVal);

            string health = ratio >= 75 ? "Fast" : ratio >= 40 ? "Healthy" : "Stagnant / AtRisk";

            list.Add(new SecondarySalesReconciliationDto(
                sId,
                party.LegalName ?? party.TradeName ?? "Wholesale Stockist",
                party.GSTIN,
                primaryForStockist.FirstOrDefault()?.Territory?.Name ?? "Assigned Territory",
                primaryVal,
                primaryCount,
                secondaryVal,
                secondaryCount,
                ratio,
                stockHolding,
                health
            ));
        }

        return Result<IReadOnlyList<SecondarySalesReconciliationDto>>.Success(list.OrderByDescending(r => r.TotalPrimarySalesAmount + r.TotalSecondaryPobAmount).ToList());
    }

    public async Task<Result<SeedDemoDataResponseDto>> SeedDemoDataAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        int doctorsCount = 0;
        int employeesCount = 0;
        int beatsCount = 0;
        int schemesCount = 0;
        int chemistsCount = 0;
        int stockistsCount = 0;
        int samplesCount = 0;
        int pobOrdersCount = 0;

        // 1. Division
        var division = await _context.SfaDivisions.FirstOrDefaultAsync(d => d.TenantId == tenantId, cancellationToken);
        if (division == null)
        {
            division = new SfaDivision
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Code = "DIV-GEN",
                Name = "Main Formulations Division",
                Description = "General Medicine & Healthcare Formulations Division",
                IsActive = true
            };
            _context.SfaDivisions.Add(division);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 2. Patches
        var patch1 = await _context.SfaPatches.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Name.Contains("South Delhi"), cancellationToken);
        if (patch1 == null)
        {
            patch1 = new SfaPatch
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                DivisionId = division.Id,
                Code = "PAT-DEL-01",
                Name = "South Delhi Central Patch",
                HeadquarterCity = "South Delhi",
                Description = "Covering AIIMS, Safdarjung, Sarita Vihar & South Ext"
            };
            _context.SfaPatches.Add(patch1);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var patch2 = await _context.SfaPatches.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Name.Contains("Noida"), cancellationToken);
        if (patch2 == null)
        {
            patch2 = new SfaPatch
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                DivisionId = division.Id,
                Code = "PAT-UP-02",
                Name = "Noida-Ghaziabad Hub Patch",
                HeadquarterCity = "Noida",
                Description = "Covering Sector 18, Indirapuram, Vaishali & Kaushambi"
            };
            _context.SfaPatches.Add(patch2);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 3. Manager (1) & MRs (5)
        var managerUser = await _context.Users.FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Email == "abm.malhotra@nishkray.com", cancellationToken);
        if (managerUser == null)
        {
            var pwdHash = _passwordHasher.HashPassword("Udyogbill@123", out var salt);
            managerUser = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = "abm.malhotra@nishkray.com",
                FullName = "Rajiv Malhotra (ABM)",
                PhoneNumber = "9811234500",
                Designation = "Area Business Manager",
                PasswordHash = pwdHash,
                PasswordSalt = salt,
                IsActive = true,
                EmailConfirmed = true
            };
            _context.Users.Add(managerUser);

            _context.SfaEmployeeProfiles.Add(new SfaEmployeeProfile
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = managerUser.Id,
                EmployeeCode = "ABM-01",
                DesignationRole = SfaDesignationRole.AreaBusinessManager,
                DesignationTitle = "Area Business Manager",
                DivisionId = division.Id,
                PatchId = patch1.Id,
                HeadquarterCity = "South Delhi",
                DailyAllowanceRate = 500m,
                MonthlyExpenseLimit = 25000m,
                MonthlyTargetAmount = 1250000m,
                Mobile = "9811234500",
                Email = "abm.malhotra@nishkray.com",
                IsActive = true
            });

            _context.SfaUserHierarchies.Add(new SfaUserHierarchy
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = managerUser.Id,
                Designation = "ABM",
                HeadquartersTown = "South Delhi",
                IsActive = true
            });

            employeesCount++;
            await _context.SaveChangesAsync(cancellationToken);
        }

        var mrDefs = new[]
        {
            ("mr.rahul@nishkray.com", "Rahul Sharma (MR)", "9811234501", "MR-101", "South Delhi HQ"),
            ("mr.amit@nishkray.com", "Amit Kumar Verma (MR)", "9811234502", "MR-102", "South Delhi HQ"),
            ("mr.priya@nishkray.com", "Priya Singh (MR)", "9811234503", "MR-103", "Noida Sector 18 HQ"),
            ("mr.vikas@nishkray.com", "Vikas Gupta (MR)", "9811234504", "MR-104", "Ghaziabad Hub"),
            ("mr.sandeep@nishkray.com", "Sandeep Saxena (MR)", "9811234505", "MR-105", "East Delhi Ring")
        };

        var mrUsers = new List<User>();
        foreach (var m in mrDefs)
        {
            var u = await _context.Users.FirstOrDefaultAsync(usr => usr.TenantId == tenantId && usr.Email == m.Item1, cancellationToken);
            if (u == null)
            {
                var pHash = _passwordHasher.HashPassword("Udyogbill@123", out var s);
                u = new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Email = m.Item1,
                    FullName = m.Item2,
                    PhoneNumber = m.Item3,
                    Designation = "Medical Representative",
                    PasswordHash = pHash,
                    PasswordSalt = s,
                    IsActive = true,
                    EmailConfirmed = true
                };
                _context.Users.Add(u);

                _context.SfaEmployeeProfiles.Add(new SfaEmployeeProfile
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    UserId = u.Id,
                    EmployeeCode = m.Item4,
                    DesignationRole = SfaDesignationRole.MedicalRepresentative,
                    DesignationTitle = "Medical Representative",
                    DivisionId = division.Id,
                    PatchId = patch1.Id,
                    ReportingToUserId = managerUser.Id,
                    ReportingAbmUserId = managerUser.Id,
                    HeadquarterCity = m.Item5,
                    DailyAllowanceRate = 350m,
                    MonthlyExpenseLimit = 15000m,
                    MonthlyTargetAmount = 250000m,
                    Mobile = m.Item3,
                    Email = m.Item1,
                    IsActive = true
                });

                _context.SfaUserHierarchies.Add(new SfaUserHierarchy
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    UserId = u.Id,
                    Designation = "MR",
                    HeadquartersTown = m.Item5,
                    ReportsToUserId = managerUser.Id,
                    AbmUserId = managerUser.Id,
                    IsActive = true
                });

                employeesCount++;
            }
            mrUsers.Add(u);
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Beats (4 Beats)
        var beatDefs = new[]
        {
            ("Beat 1: Lajpat Nagar & Defense Colony Ring", "BEAT-01", DayOfWeek.Monday, patch1.Id),
            ("Beat 2: Apollo Hospital & Sarita Vihar Cluster", "BEAT-02", DayOfWeek.Tuesday, patch1.Id),
            ("Beat 3: Sector 18 & Atta Chemist Market", "BEAT-03", DayOfWeek.Wednesday, patch2.Id),
            ("Beat 4: Max Care & Saket Hospital Belt", "BEAT-04", DayOfWeek.Thursday, patch1.Id)
        };

        var beats = new List<SfaBeat>();
        for (int i = 0; i < beatDefs.Length; i++)
        {
            var bDef = beatDefs[i];
            var b = await _context.SfaBeats.FirstOrDefaultAsync(bt => bt.TenantId == tenantId && bt.Name == bDef.Item1, cancellationToken);
            if (b == null)
            {
                b = new SfaBeat
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    PatchId = bDef.Item4,
                    Code = bDef.Item2,
                    Name = bDef.Item1,
                    ScheduledDayOfWeek = bDef.Item3,
                    SequenceOrder = i + 1,
                    EstimatedDistanceKm = 15m,
                    IsActive = true
                };
                _context.SfaBeats.Add(b);
                beatsCount++;
            }
            beats.Add(b);
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 5. 20 Doctors with Complete Detail
        var existingDoctorsCount = await _context.SfaDoctors.CountAsync(d => d.TenantId == tenantId, cancellationToken);
        if (existingDoctorsCount < 20)
        {
            var docData = new (string Name, string Spec, string Qual, string Reg, string Hospital, string Addr, string City, string Class, int Target, double Lat, double Lon)[]
            {
                ("Dr. R. K. Sharma", "Cardiologist", "MBBS, MD (Med), DM (Cardio)", "DMC-10234", "Apollo Heart Centre", "Ring Road, Sarita Vihar", "New Delhi", "Core (A)", 4, 28.5678, 77.2435),
                ("Dr. Neha Kapoor", "Diabetologist", "MBBS, MD, DNB (Endo)", "DMC-12890", "Max Healthcare Diabetes Wing", "Press Enclave Road, Saket", "New Delhi", "SuperCore (A+)", 4, 28.5245, 77.2065),
                ("Dr. Arvind Verma", "General Physician", "MBBS, PGDGM", "UP-44123", "Verma Daycare Clinic", "Lajpat Nagar 2", "New Delhi", "Standard (B)", 2, 28.5355, 77.2589),
                ("Dr. S. K. Gupta", "Pediatrician", "MBBS, DCH, MD (Pedia)", "DMC-19082", "Child Health Care Centre", "Defense Colony Flyover Market", "New Delhi", "Core (A)", 2, 28.5712, 77.2341),
                ("Dr. Sunita Mehra", "Gynecologist", "MBBS, MS (Obst & Gynae)", "DMC-21456", "Mother & Child Care Hospital", "South Extension Part 1", "New Delhi", "SuperCore (A+)", 4, 28.5412, 77.2298),
                ("Dr. Rajesh Aggarwal", "Orthopedic Surgeon", "MBBS, MS (Ortho), MCh", "DMC-14789", "Bone & Joint Care Clinic", "Greater Kailash 1", "New Delhi", "Core (A)", 2, 28.5833, 77.2211),
                ("Dr. Pooja Tandon", "Dermatologist", "MBBS, MD (Dermatology)", "DMC-31209", "Skin & Cosmetology Centre", "Green Park Main Market", "New Delhi", "Standard (B)", 2, 28.5601, 77.2450),
                ("Dr. Vivek Oberoi", "ENT Specialist", "MBBS, MS (ENT)", "DMC-18923", "Metro ENT & Head Neck Care", "Alaknanda Commercial Complex", "New Delhi", "Standard (B)", 2, 28.5789, 77.2312),
                ("Dr. Anil Kumar Mishra", "Chest Physician / Pulmonologist", "MBBS, MD (Pulmonary Med)", "DMC-29871", "Shanti Chest & Asthma Clinic", "Kalkaji Main Road", "New Delhi", "Core (A)", 2, 28.5654, 77.2410),
                ("Dr. Meenakshi Soni", "Neurologist", "MBBS, MD, DM (Neuro)", "DMC-34190", "Brain & Spine Neuro Clinic", "Hauz Khas Enclave", "New Delhi", "SuperCore (A+)", 4, 28.5301, 77.2100),
                ("Dr. Pradeep Joshi", "Gastroenterologist", "MBBS, MD, DM (Gastro)", "DMC-22441", "Digestive Diseases Centre", "Malviya Nagar Corner", "New Delhi", "Core (A)", 2, 28.5489, 77.2388),
                ("Dr. Ritu Saxena", "Ophthalmologist", "MBBS, MS (Ophthalmology)", "DMC-17834", "Drishti Eye & Retina Care", "Vikas Marg, Preet Vihar", "New Delhi", "Standard (B)", 2, 28.5902, 77.2189),
                ("Dr. Manoj Bhatia", "Urologist", "MBBS, MS, MCh (Uro)", "DMC-26781", "Kidney Stone & Uro Centre", "Sector 18 Market", "Noida", "Core (A)", 2, 28.5521, 77.2490),
                ("Dr. Geeta Deshmukh", "Psychiatrist", "MBBS, MD (Psychiatry)", "DMC-19842", "Mind & Wellness Clinic", "Sector 27 Atta Road", "Noida", "Standard (B)", 2, 28.5701, 77.2245),
                ("Dr. Sanjeev Khurana", "General Surgeon", "MBBS, MS (Gen Surgery)", "DMC-13290", "Khurana Surgical Hospital", "Sector 62 Institutional Area", "Noida", "Core (A)", 2, 28.5612, 77.2367),
                ("Dr. Ananya Mukherjee", "Endocrinologist", "MBBS, MD, DM (Endo)", "DMC-38910", "Thyroid & Hormone Care", "Indirapuram Commercial Ring", "Ghaziabad", "SuperCore (A+)", 4, 28.5289, 77.2089),
                ("Dr. Harish Chandra", "Nephrologist", "MBBS, MD, DM (Nephro)", "DMC-27819", "Renal Care & Dialysis Unit", "Vaishali Sector 4", "Ghaziabad", "Core (A)", 2, 28.5441, 77.2270),
                ("Dr. Deepak Chawla", "Medical Oncologist", "MBBS, MD, DM (Oncology)", "DMC-41289", "Hope Comprehensive Cancer Care", "Kaushambi Near Metro", "Ghaziabad", "SuperCore (A+)", 4, 28.5378, 77.2150),
                ("Dr. Shalini Rastogi", "Dental Surgeon", "BDS, MDS (Oral Surg)", "UP-55190", "Smile Dental & Implant Care", "Vasundhara Sector 11", "Ghaziabad", "Standard (B)", 2, 28.5812, 77.2389),
                ("Dr. Alok Bhargava", "Interventional Cardiologist", "MBBS, MD, DM (Cardio)", "DMC-31980", "Heart Rhythm & Angioplasty Clinic", "Lajpat Nagar 4 Ring", "New Delhi", "SuperCore (A+)", 4, 28.5645, 77.2412)
            };

            for (int i = 0; i < docData.Length; i++)
            {
                var d = docData[i];
                var assignedMr = mrUsers[i % mrUsers.Count];
                var assignedBeat = beats[i % beats.Count];

                var doctor = new SfaDoctor
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Code = $"DOC-{1000 + i + 1}",
                    Name = d.Name,
                    Mobile = $"987110{1000 + i:0000}",
                    Specialty = d.Spec,
                    Qualification = d.Qual,
                    RegistrationNumber = d.Reg,
                    ClinicHospitalName = d.Hospital,
                    Address = d.Addr,
                    City = d.City,
                    Classification = d.Class,
                    Priority = d.Class.Contains("SuperCore") ? "Urgent" : "High",
                    VisitFrequencyPerMonth = d.Target,
                    EstimatedMonthlyPotential = d.Class.Contains("SuperCore") ? 75000m : 45000m,
                    Latitude = d.Lat,
                    Longitude = d.Lon,
                    GeofenceRadiusMeters = 200.0,
                    AssignedMrUserId = assignedMr.Id,
                    DivisionId = division.Id,
                    PatchId = assignedBeat.PatchId,
                    BeatId = assignedBeat.Id,
                    IsActive = true
                };
                _context.SfaDoctors.Add(doctor);
                doctorsCount++;
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 6. Wholesale Stockists (2) in Parties
        var stockist1 = await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.LegalName.Contains("Suraj Medico"), cancellationToken);
        if (stockist1 == null)
        {
            stockist1 = new Party
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Code = "STK-101",
                PartyType = PartyType.Supplier,
                SupplierType = SupplierType.Distributor,
                LegalName = "Suraj Medico Agencies (Wholesale Stockist)",
                TradeName = "Suraj Medico",
                Mobile = "9876500111",
                PrimaryPhone = "011-23871100",
                GSTIN = "07AAACS1429B1Z1",
                StateCode = "07",
                IsActive = true
            };
            _context.Parties.Add(stockist1);
            stockistsCount++;
        }

        var stockist2 = await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.LegalName.Contains("Apex Pharma"), cancellationToken);
        if (stockist2 == null)
        {
            stockist2 = new Party
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Code = "STK-102",
                PartyType = PartyType.Supplier,
                SupplierType = SupplierType.Distributor,
                LegalName = "Apex Pharma Distributors (C&F Stockist)",
                TradeName = "Apex Distributors",
                Mobile = "9876500222",
                PrimaryPhone = "0120-4567890",
                GSTIN = "07BBBCS2429C1Z2",
                StateCode = "09",
                IsActive = true
            };
            _context.Parties.Add(stockist2);
            stockistsCount++;
        }
        await _context.SaveChangesAsync(cancellationToken);

        // Stockist Allocations to MRs
        foreach (var mr in mrUsers.Take(3))
        {
            var hasAlloc = await _context.SfaStockistAllocations.AnyAsync(a => a.TenantId == tenantId && a.StockistPartyId == stockist1.Id && a.MrUserId == mr.Id, cancellationToken);
            if (!hasAlloc)
            {
                _context.SfaStockistAllocations.Add(new SfaStockistAllocation
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockistPartyId = stockist1.Id,
                    MrUserId = mr.Id,
                    AllocationType = "Primary",
                    EffectiveFrom = DateTime.UtcNow.AddMonths(-6),
                    IsActive = true
                });
            }
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 7. Retail Chemists (4) and Parties
        var chemistDefs = new[]
        {
            ("Apollo Pharmacy - Sector 18", "CHM-001", "Apollo Pharmacy", "9899100101", stockist1.Id, beats[0].Id, beats[0].PatchId),
            ("MedPlus Chemist - Main Market", "CHM-002", "MedPlus Chemist", "9899100202", stockist1.Id, beats[1].Id, beats[1].PatchId),
            ("Sanjivani Medical Store - Ring Road", "CHM-003", "Sanjivani Medical", "9899100303", stockist2.Id, beats[2].Id, beats[2].PatchId),
            ("Wellness Forever - Saket Metro", "CHM-004", "Wellness Forever", "9899100404", stockist2.Id, beats[3].Id, beats[3].PatchId)
        };

        var chemistEntities = new List<SfaChemist>();
        var chemistParties = new List<Party>();
        foreach (var c in chemistDefs)
        {
            var p = await _context.Parties.FirstOrDefaultAsync(pty => pty.TenantId == tenantId && pty.LegalName == c.Item1, cancellationToken);
            if (p == null)
            {
                p = new Party
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Code = c.Item2,
                    PartyType = PartyType.Customer,
                    CustomerType = CustomerType.Retail,
                    LegalName = c.Item1,
                    TradeName = c.Item3,
                    Mobile = c.Item4,
                    StateCode = "07",
                    IsActive = true
                };
                _context.Parties.Add(p);
            }
            chemistParties.Add(p);

            var ch = await _context.SfaChemists.FirstOrDefaultAsync(x => x.TenantId == tenantId && x.ShopName == c.Item1, cancellationToken);
            if (ch == null)
            {
                ch = new SfaChemist
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Code = c.Item2,
                    ShopName = c.Item1,
                    ContactPerson = c.Item3,
                    Mobile = c.Item4,
                    Address = "Main Commercial Road",
                    City = "Delhi-NCR",
                    PreferredStockistPartyId = c.Item5,
                    BeatId = c.Item6,
                    PatchId = c.Item7,
                    IsActive = true
                };
                _context.SfaChemists.Add(ch);
                chemistsCount++;
            }
            chemistEntities.Add(ch);
        }
        await _context.SaveChangesAsync(cancellationToken);

        // 8. Commercial Schemes (3)
        var existingSchemesCount = await _context.SfaSchemeMasters.CountAsync(s => s.TenantId == tenantId, cancellationToken);
        if (existingSchemesCount < 3)
        {
            var medicineItem = await _context.Items.FirstOrDefaultAsync(i => i.TenantId == tenantId, cancellationToken);

            var s1 = new SfaSchemeMaster
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeCode = "SCH-ACI-10-1",
                SchemeName = "Aciloc 10+1 Trade Bonus Scheme",
                DivisionId = division.Id,
                ItemId = medicineItem?.Id,
                SchemeType = SfaSchemeType.FreeGoods,
                ValidFromUtc = DateTime.UtcNow.AddMonths(-1),
                ValidToUtc = DateTime.UtcNow.AddMonths(6),
                MinimumOrderQuantity = 10,
                IsActive = true,
                Description = "Buy 10 Strips Get 1 Strip Free (Retailer Incentive)"
            };
            s1.Slabs.Add(new SfaSchemeSlab
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeMasterId = s1.Id,
                MinQuantity = 10,
                MaxQuantity = 99,
                FreeQuantity = 1,
                FreeItemId = medicineItem?.Id
            });
            _context.SfaSchemeMasters.Add(s1);
            schemesCount++;

            var s2 = new SfaSchemeMaster
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeCode = "SCH-VOL-20-3",
                SchemeName = "Volume 20+3 Antibiotics Scheme",
                DivisionId = division.Id,
                ItemId = medicineItem?.Id,
                SchemeType = SfaSchemeType.FreeGoods,
                ValidFromUtc = DateTime.UtcNow.AddMonths(-1),
                ValidToUtc = DateTime.UtcNow.AddMonths(6),
                MinimumOrderQuantity = 20,
                IsActive = true,
                Description = "Buy 20 Strips Get 3 Strips Free"
            };
            s2.Slabs.Add(new SfaSchemeSlab
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeMasterId = s2.Id,
                MinQuantity = 20,
                MaxQuantity = 500,
                FreeQuantity = 3,
                FreeItemId = medicineItem?.Id
            });
            _context.SfaSchemeMasters.Add(s2);
            schemesCount++;

            var s3 = new SfaSchemeMaster
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeCode = "SCH-DISC-10P",
                SchemeName = "Wholesale 10% Cash Trade Discount",
                DivisionId = division.Id,
                SchemeType = SfaSchemeType.PercentageDiscount,
                ValidFromUtc = DateTime.UtcNow.AddMonths(-1),
                ValidToUtc = DateTime.UtcNow.AddMonths(6),
                MinimumOrderQuantity = 50,
                IsActive = true,
                Description = "Flat 10% Trade Discount on bulk orders exceeding 50 units"
            };
            s3.Slabs.Add(new SfaSchemeSlab
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SchemeMasterId = s3.Id,
                MinQuantity = 50,
                DiscountPercent = 10.0m
            });
            _context.SfaSchemeMasters.Add(s3);
            schemesCount++;

            await _context.SaveChangesAsync(cancellationToken);
        }

        // 9. Sample Bag Stocks
        var existingSamples = await _context.SfaSampleStocks.CountAsync(s => s.TenantId == tenantId, cancellationToken);
        if (existingSamples < 10)
        {
            var medItems = await _context.Items.Where(i => i.TenantId == tenantId).Take(5).ToListAsync(cancellationToken);
            var batches = new[] { ("AC-889", "12/2027", 40), ("AZ-441", "08/2027", 25), ("AMP-109", "01/2028", 30), ("1ALL-09", "05/2027", 50), ("ACN-201", "11/2027", 35) };

            for (int m = 0; m < mrUsers.Count; m++)
            {
                var mr = mrUsers[m];
                for (int i = 0; i < Math.Min(3, medItems.Count); i++)
                {
                    var item = medItems[(i + m) % medItems.Count];
                    var b = batches[(i + m) % batches.Length];
                    var exists = await _context.SfaSampleStocks.AnyAsync(s => s.TenantId == tenantId && s.MrUserId == mr.Id && s.ItemId == item.Id, cancellationToken);
                    if (!exists)
                    {
                        _context.SfaSampleStocks.Add(new SfaSampleStock
                        {
                            Id = Guid.NewGuid(),
                            TenantId = tenantId,
                            ItemId = item.Id,
                            BatchNumber = b.Item1,
                            ExpiryMonthYear = b.Item2,
                            QuantityAllocated = b.Item3 + 10,
                            QuantityDistributed = (i + 1) * 5,
                            MrUserId = mr.Id
                        });
                        samplesCount++;
                    }
                }
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // 10. POB Orders (3)
        var existingPobs = await _context.SfaPobOrders.CountAsync(p => p.TenantId == tenantId, cancellationToken);
        if (existingPobs < 3 && chemistParties.Count > 0)
        {
            var medItem = await _context.Items.FirstOrDefaultAsync(i => i.TenantId == tenantId, cancellationToken);

            var pob1 = new SfaPobOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderNumber = $"POB-2026-001",
                OrderDate = DateTime.UtcNow.AddDays(-2),
                MrUserId = mrUsers[0].Id,
                CustomerPartyId = chemistParties[0].Id,
                TargetStockistPartyId = stockist1.Id,
                SubTotal = 12000m,
                TaxAmount = 1440m,
                GrandTotal = 13440m,
                Status = "Submitted",
                StockistFulfillmentStatus = "Dispatched",
                StockistRemarks = "Dispatched via Delivery Van #DL-04-1234",
                ExpectedDeliveryDate = DateTime.UtcNow.AddDays(1)
            };
            pob1.Items.Add(new SfaPobOrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PobOrderId = pob1.Id,
                ItemId = medItem?.Id ?? Guid.NewGuid(),
                Quantity = 100,
                FreeQuantity = 10,
                UnitPrice = 120m,
                DiscountPercent = 0,
                TaxRatePercent = 12,
                TotalAmount = 13440m,
                AppliedSchemeName = "Aciloc 10+1 Trade Bonus Scheme"
            });
            _context.SfaPobOrders.Add(pob1);
            pobOrdersCount++;

            var pob2 = new SfaPobOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderNumber = $"POB-2026-002",
                OrderDate = DateTime.UtcNow.AddDays(-1),
                MrUserId = mrUsers[1].Id,
                CustomerPartyId = chemistParties[1].Id,
                TargetStockistPartyId = stockist1.Id,
                SubTotal = 24000m,
                TaxAmount = 2880m,
                GrandTotal = 26880m,
                Status = "Submitted",
                StockistFulfillmentStatus = "Delivered",
                StockistRemarks = "Received by Chief Chemist Mr. Sharma",
                ExpectedDeliveryDate = DateTime.UtcNow
            };
            pob2.Items.Add(new SfaPobOrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PobOrderId = pob2.Id,
                ItemId = medItem?.Id ?? Guid.NewGuid(),
                Quantity = 200,
                FreeQuantity = 20,
                UnitPrice = 120m,
                DiscountPercent = 0,
                TaxRatePercent = 12,
                TotalAmount = 26880m,
                AppliedSchemeName = "Aciloc 10+1 Trade Bonus Scheme"
            });
            _context.SfaPobOrders.Add(pob2);
            pobOrdersCount++;

            var pob3 = new SfaPobOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                OrderNumber = $"POB-2026-003",
                OrderDate = DateTime.UtcNow,
                MrUserId = mrUsers[2].Id,
                CustomerPartyId = chemistParties[2].Id,
                TargetStockistPartyId = stockist2.Id,
                SubTotal = 36000m,
                TaxAmount = 4320m,
                GrandTotal = 40320m,
                Status = "Submitted",
                StockistFulfillmentStatus = "InReview",
                StockistRemarks = "Checking warehouse batch availability",
                ExpectedDeliveryDate = DateTime.UtcNow.AddDays(2)
            };
            pob3.Items.Add(new SfaPobOrderItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PobOrderId = pob3.Id,
                ItemId = medItem?.Id ?? Guid.NewGuid(),
                Quantity = 300,
                FreeQuantity = 30,
                UnitPrice = 120m,
                DiscountPercent = 0,
                TaxRatePercent = 12,
                TotalAmount = 40320m,
                AppliedSchemeName = "Aciloc 10+1 Trade Bonus Scheme"
            });
            _context.SfaPobOrders.Add(pob3);
            pobOrdersCount++;

            await _context.SaveChangesAsync(cancellationToken);
        }

        var msg = $"Seeded Pharma SFA demo data for tenant: {doctorsCount} Doctors, {employeesCount} Field Staff (5 MRs, 1 ABM), {beatsCount} Beats, {chemistsCount} Chemists, {stockistsCount} Stockists, {schemesCount} Schemes, {samplesCount} Samples, {pobOrdersCount} POB Orders.";
        return Result<SeedDemoDataResponseDto>.Success(new SeedDemoDataResponseDto(
            doctorsCount,
            employeesCount,
            beatsCount,
            schemesCount,
            chemistsCount,
            stockistsCount,
            samplesCount,
            pobOrdersCount,
            msg
        ));
    }

    #endregion

    #region 6. Admin Geofencing & Location Compliance

    public static double CalculateHaversineDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000.0; // Earth radius in meters
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2.0) * Math.Sin(dLat / 2.0) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2.0) * Math.Sin(dLon / 2.0);
        var c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        return Math.Round(R * c, 1);
    }

    public async Task<Result<SfaGeofenceConfigDto>> GetGeofenceConfigAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var settings = await _context.TenantSettings
            .Where(s => s.TenantId == tenantId && s.Category == "PharmaSfa")
            .ToListAsync(cancellationToken);

        bool isEnabled = false;
        int radiusMeters = 150;
        bool allowWithReason = true;

        var enabledSetting = settings.FirstOrDefault(s => s.Key == "SFA_GEOFENCE_ENABLED");
        if (enabledSetting != null && bool.TryParse(enabledSetting.Value, out var parsedEnabled))
        {
            isEnabled = parsedEnabled;
        }

        var radiusSetting = settings.FirstOrDefault(s => s.Key == "SFA_GEOFENCE_RADIUS_METERS");
        if (radiusSetting != null && int.TryParse(radiusSetting.Value, out var parsedRadius))
        {
            radiusMeters = parsedRadius > 0 ? parsedRadius : 150;
        }

        var allowSetting = settings.FirstOrDefault(s => s.Key == "SFA_ALLOW_OUT_OF_RANGE_WITH_REASON");
        if (allowSetting != null && bool.TryParse(allowSetting.Value, out var parsedAllow))
        {
            allowWithReason = parsedAllow;
        }

        return Result<SfaGeofenceConfigDto>.Success(new SfaGeofenceConfigDto(isEnabled, radiusMeters, allowWithReason));
    }

    public async Task<Result<bool>> UpdateGeofenceConfigAsync(SfaGeofenceConfigDto request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var settings = await _context.TenantSettings
            .Where(s => s.TenantId == tenantId && s.Category == "PharmaSfa")
            .ToListAsync(cancellationToken);

        void UpsertSetting(string key, string value, string valueType)
        {
            var s = settings.FirstOrDefault(x => x.Key == key);
            if (s == null)
            {
                s = new Domain.Entities.Tenants.TenantSetting
                {
                    TenantId = tenantId,
                    Category = "PharmaSfa",
                    Key = key,
                    Value = value,
                    ValueType = valueType
                };
                _context.TenantSettings.Add(s);
            }
            else
            {
                s.Value = value;
                s.ValueType = valueType;
                s.UpdatedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        UpsertSetting("SFA_GEOFENCE_ENABLED", request.IsGeofencingEnabled.ToString().ToLowerInvariant(), "boolean");
        UpsertSetting("SFA_GEOFENCE_RADIUS_METERS", Math.Max(10, request.GeofenceRadiusMeters).ToString(), "number");
        UpsertSetting("SFA_ALLOW_OUT_OF_RANGE_WITH_REASON", request.AllowOutOfRangeWithReason.ToString().ToLowerInvariant(), "boolean");

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> UpdateDoctorLocationAsync(Guid doctorId, UpdateEntityLocationRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var doctor = await _context.SfaDoctors
            .FirstOrDefaultAsync(d => d.Id == doctorId && d.TenantId == tenantId, cancellationToken);

        if (doctor == null)
        {
            return Result<bool>.Failure("Doctor not found.", "NOT_FOUND");
        }

        doctor.Latitude = request.Latitude;
        doctor.Longitude = request.Longitude;
        if (request.GeofenceRadiusMeters.HasValue && request.GeofenceRadiusMeters.Value > 0)
        {
            doctor.GeofenceRadiusMeters = request.GeofenceRadiusMeters.Value;
        }
        doctor.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> UpdateChemistLocationAsync(Guid chemistId, UpdateEntityLocationRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var chemist = await _context.SfaChemists
            .FirstOrDefaultAsync(c => c.Id == chemistId && c.TenantId == tenantId, cancellationToken);

        if (chemist == null)
        {
            return Result<bool>.Failure("Chemist not found.", "NOT_FOUND");
        }

        chemist.Latitude = request.Latitude;
        chemist.Longitude = request.Longitude;
        if (request.GeofenceRadiusMeters.HasValue && request.GeofenceRadiusMeters.Value > 0)
        {
            chemist.GeofenceRadiusMeters = request.GeofenceRadiusMeters.Value;
        }
        chemist.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    #endregion
}

