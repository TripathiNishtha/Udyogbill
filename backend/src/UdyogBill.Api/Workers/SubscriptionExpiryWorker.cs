using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Workers;

/// <summary>
/// Background worker that periodically checks for expired 14-day free trials
/// and expired subscriptions, updating tenant and subscription statuses automatically.
/// </summary>
public class SubscriptionExpiryWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SubscriptionExpiryWorker> _logger;

    public SubscriptionExpiryWorker(IServiceProvider serviceProvider, ILogger<SubscriptionExpiryWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SubscriptionExpiryWorker started.");

        // Initial delay on startup before first check
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var now = DateTimeOffset.UtcNow;

                // 1. Process subscriptions where Status == Trial and trial period has lapsed
                var expiredTrialSubs = await dbContext.TenantSubscriptions
                    .IgnoreQueryFilters()
                    .Where(s => !s.IsDeleted && s.Status == SubscriptionStatus.Trial && ((s.TrialEndsAtUtc ?? s.EndsAtUtc) < now))
                    .ToListAsync(stoppingToken);

                if (expiredTrialSubs.Count > 0)
                {
                    _logger.LogInformation("SubscriptionExpiryWorker: Found {Count} expired trial subscriptions. Setting to Expired.", expiredTrialSubs.Count);
                    var tenantIds = expiredTrialSubs.Select(s => s.TenantId).Distinct().ToList();

                    foreach (var sub in expiredTrialSubs)
                    {
                        sub.Status = SubscriptionStatus.Expired;
                    }

                    // Update corresponding tenants to Expired status if they were in Trial
                    await dbContext.Tenants
                        .IgnoreQueryFilters()
                        .Where(t => tenantIds.Contains(t.Id) && t.Status == TenantStatus.Trial && !t.IsDeleted)
                        .ExecuteUpdateAsync(t => t.SetProperty(x => x.Status, TenantStatus.Expired), stoppingToken);

                    await dbContext.SaveChangesAsync(stoppingToken);
                }

                // 2. Process paid subscriptions that have passed EndsAtUtc
                var expiredActiveSubs = await dbContext.TenantSubscriptions
                    .IgnoreQueryFilters()
                    .Where(s => !s.IsDeleted && s.Status == SubscriptionStatus.Active && s.EndsAtUtc < now)
                    .ToListAsync(stoppingToken);

                if (expiredActiveSubs.Count > 0)
                {
                    _logger.LogInformation("SubscriptionExpiryWorker: Found {Count} expired active subscriptions. Setting to Expired.", expiredActiveSubs.Count);
                    foreach (var sub in expiredActiveSubs)
                    {
                        sub.Status = SubscriptionStatus.Expired;
                    }

                    var tenantIds = expiredActiveSubs.Select(s => s.TenantId).Distinct().ToList();
                    await dbContext.Tenants
                        .IgnoreQueryFilters()
                        .Where(t => tenantIds.Contains(t.Id) && t.Status == TenantStatus.Active && !t.IsDeleted)
                        .ExecuteUpdateAsync(t => t.SetProperty(x => x.Status, TenantStatus.Expired), stoppingToken);

                    await dbContext.SaveChangesAsync(stoppingToken);
                }

                // 3. Process tenants who signed up under 14-day free trial without explicit subscription record
                var trialCutoffDate = now.AddDays(-14);
                var expiredImplicitTenants = await dbContext.Tenants
                    .IgnoreQueryFilters()
                    .Where(t => !t.IsDeleted && t.Status == TenantStatus.Trial && t.CreatedAtUtc < trialCutoffDate)
                    .Where(t => !dbContext.TenantSubscriptions.IgnoreQueryFilters().Any(s => s.TenantId == t.Id && !s.IsDeleted && s.Status == SubscriptionStatus.Active))
                    .ToListAsync(stoppingToken);

                if (expiredImplicitTenants.Count > 0)
                {
                    _logger.LogInformation("SubscriptionExpiryWorker: Found {Count} implicit trial tenants past 14 days. Setting to Expired.", expiredImplicitTenants.Count);
                    foreach (var tenant in expiredImplicitTenants)
                    {
                        tenant.Status = TenantStatus.Expired;
                    }
                    await dbContext.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SubscriptionExpiryWorker encountered an error during scheduled check.");
            }

            // Run check every 30 minutes
            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }
}
