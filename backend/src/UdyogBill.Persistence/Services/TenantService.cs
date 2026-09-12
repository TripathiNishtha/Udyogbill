using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class TenantService : ITenantService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public TenantService(AppDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    public async Task<Result<TenantDetailsDto>> GetCurrentTenantDetailsAsync(CancellationToken cancellationToken = default)
    {
        if (!_tenantContext.HasTenant)
        {
            return Result<TenantDetailsDto>.Failure("No active tenant context.", "TENANT_CONTEXT_MISSING");
        }

        return await GetTenantByIdAsync(_tenantContext.TenantId, cancellationToken);
    }

    public async Task<Result<TenantDetailsDto>> GetTenantByIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .Include(t => t.Branches.Where(b => !b.IsDeleted))
                .ThenInclude(b => b.Warehouses.Where(w => !w.IsDeleted))
            .Include(t => t.IndustryConfigs)
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return Result<TenantDetailsDto>.Failure("Tenant not found.", "NOT_FOUND");
        }

        var activeSub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

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
            activeSub.EndsAtUtc > DateTimeOffset.UtcNow
        );

        var details = new TenantDetailsDto(
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
            configDto,
            branchesDto,
            subDto
        );

        return Result<TenantDetailsDto>.Success(details);
    }

    public async Task<Result<PagedResult<TenantDto>>> GetTenantsAsync(int pageNumber, int pageSize, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .Where(t => !t.IsDeleted);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(t => t.BusinessName.ToLower().Contains(term) || t.Code.ToLower().Contains(term) || t.AdminEmail.ToLower().Contains(term));
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
                t.Industry.Name,
                t.Industry.Code,
                t.Status,
                t.AdminEmail,
                t.PrimaryPhone,
                t.GSTIN,
                t.TimeZone,
                t.CurrencyCode,
                t.IsActive,
                t.CreatedAtUtc,
                t.LogoUrl,
                t.AdminPassword
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<TenantDto>>.Success(PagedResult<TenantDto>.Create(items, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<TenantIndustryConfigDto>> GetIndustryConfigAsync(Guid? tenantId = null, CancellationToken cancellationToken = default)
    {
        var targetTenantId = tenantId ?? _tenantContext.TenantId;
        var config = await _context.TenantIndustryConfigs
            .IgnoreQueryFilters()
            .Include(c => c.Industry)
            .FirstOrDefaultAsync(c => c.TenantId == targetTenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            return Result<TenantIndustryConfigDto>.Failure("Industry configuration not found.", "NOT_FOUND");
        }

        var dto = new TenantIndustryConfigDto(
            config.IndustryId,
            config.Industry.Name,
            config.Industry.Code,
            config.EnableBatchTracking,
            config.EnableExpiryTracking,
            config.EnableSerialTracking,
            config.EnableMultiUnitConversion,
            config.EnableSizeColorMatrix,
            config.EnableRecipeBOM,
            config.EnableScheduleH1DrugTracking,
            config.EnableEWayBill,
            config.EnableEInvoicing,
            config.ConfigurationJson
        );

        return Result<TenantIndustryConfigDto>.Success(dto);
    }

    public async Task<Result> UpdateIndustryConfigAsync(Guid tenantId, TenantIndustryConfigDto configDto, CancellationToken cancellationToken = default)
    {
        var config = await _context.TenantIndustryConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            return Result.Failure("Industry configuration not found.", "NOT_FOUND");
        }

        config.EnableBatchTracking = configDto.EnableBatchTracking;
        config.EnableExpiryTracking = configDto.EnableExpiryTracking;
        config.EnableSerialTracking = configDto.EnableSerialTracking;
        config.EnableMultiUnitConversion = configDto.EnableMultiUnitConversion;
        config.EnableSizeColorMatrix = configDto.EnableSizeColorMatrix;
        config.EnableRecipeBOM = configDto.EnableRecipeBOM;
        config.EnableScheduleH1DrugTracking = configDto.EnableScheduleH1DrugTracking;
        config.EnableEWayBill = configDto.EnableEWayBill;
        config.EnableEInvoicing = configDto.EnableEInvoicing;
        config.ConfigurationJson = configDto.ConfigurationJson;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
