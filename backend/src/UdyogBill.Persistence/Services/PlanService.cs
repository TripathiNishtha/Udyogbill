using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PlanService : IPlanService
{
    private readonly AppDbContext _context;

    public PlanService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Result<IReadOnlyList<PlanDto>>> GetActivePlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await _context.Plans
            .Include(p => p.Entitlements)
                .ThenInclude(e => e.Feature)
            .Where(p => p.IsActive && !p.IsDeleted)
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
                p.Entitlements.Select(e => e.Feature.Code).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<PlanDto>>.Success(plans);
    }

    public async Task<Result<PlanDto>> GetPlanByIdAsync(Guid planId, CancellationToken cancellationToken = default)
    {
        var plan = await _context.Plans
            .Include(p => p.Entitlements)
                .ThenInclude(e => e.Feature)
            .FirstOrDefaultAsync(p => p.Id == planId && !p.IsDeleted, cancellationToken);

        if (plan == null)
        {
            return Result<PlanDto>.Failure("Plan not found.", "NOT_FOUND");
        }

        var dto = new PlanDto(
            plan.Id,
            plan.Code,
            plan.Name,
            plan.Description,
            plan.BillingCycle,
            plan.Price,
            plan.TrialDays,
            plan.MaxUsers,
            plan.MaxBranches,
            plan.MaxWarehouses,
            plan.MaxInvoicesPerMonth,
            plan.MaxStorageMb,
            plan.IsPopular,
            plan.IsActive,
            plan.Entitlements.Select(e => e.Feature.Code).ToList()
        );

        return Result<PlanDto>.Success(dto);
    }

    public async Task<Result<TenantSubscriptionSummaryDto>> GetActiveSubscriptionAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var subscription = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (subscription == null)
        {
            return Result<TenantSubscriptionSummaryDto>.Failure("Active subscription not found.", "NOT_FOUND");
        }

        var dto = new TenantSubscriptionSummaryDto(
            subscription.Id,
            subscription.PlanId,
            subscription.Plan.Name,
            subscription.Plan.Code,
            subscription.Status,
            subscription.StartsAtUtc,
            subscription.EndsAtUtc,
            subscription.TrialEndsAtUtc,
            subscription.AutoRenew,
            subscription.EndsAtUtc > DateTimeOffset.UtcNow
        );

        return Result<TenantSubscriptionSummaryDto>.Success(dto);
    }
}
