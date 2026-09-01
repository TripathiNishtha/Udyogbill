using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Filters;

/// <summary>
/// Ensures the tenant has an active subscription or non-expired trial.
/// SuperAdmins bypass this check. Read operations (GET) are typically allowed,
/// but write operations (POST, PUT, DELETE) return 402 Payment Required if expired/suspended.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireActiveSubscriptionAttribute : TypeFilterAttribute
{
    public RequireActiveSubscriptionAttribute(bool blockReads = false) 
        : base(typeof(RequireActiveSubscriptionFilter))
    {
        Arguments = new object[] { blockReads };
    }
}

public class RequireActiveSubscriptionFilter : IAsyncActionFilter
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly bool _blockReads;

    public RequireActiveSubscriptionFilter(AppDbContext context, ITenantContext tenantContext, bool blockReads)
    {
        _context = context;
        _tenantContext = tenantContext;
        _blockReads = blockReads;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // SuperAdmins always bypass
        if (_tenantContext.IsSuperAdmin)
        {
            await next();
            return;
        }

        var tenantId = _tenantContext.TenantId;
        if (tenantId == Guid.Empty)
        {
            await next();
            return;
        }

        // Allow GET requests if blockReads is false
        if (!_blockReads && HttpMethods.IsGet(context.HttpContext.Request.Method))
        {
            await next();
            return;
        }

        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null || tenant.Status == TenantStatus.Suspended || !tenant.IsActive)
        {
            context.Result = new ObjectResult(new
            {
                error = "Account is suspended or inactive. Please contact platform support.",
                code = "TENANT_SUSPENDED"
            })
            {
                StatusCode = StatusCodes.Status402PaymentRequired
            };
            return;
        }

        var sub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId);

        if (sub != null)
        {
            var now = DateTimeOffset.UtcNow;
            if (sub.Status == SubscriptionStatus.Expired || (sub.EndsAtUtc < now && sub.TrialEndsAtUtc < now))
            {
                context.Result = new ObjectResult(new
                {
                    error = "Your subscription has expired. Please renew your plan to continue performing actions.",
                    code = "SUBSCRIPTION_EXPIRED"
                })
                {
                    StatusCode = StatusCodes.Status402PaymentRequired
                };
                return;
            }
        }

        await next();
    }
}

/// <summary>
/// Ensures the tenant has purchased and currently possesses an active Add-on (e.g. "ADDON_PHARMA").
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAddonAttribute : TypeFilterAttribute
{
    public RequireAddonAttribute(string addonCode) 
        : base(typeof(RequireAddonFilter))
    {
        Arguments = new object[] { addonCode };
    }
}

public class RequireAddonFilter : IAsyncActionFilter
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly string _addonCode;

    public RequireAddonFilter(AppDbContext context, ITenantContext tenantContext, string addonCode)
    {
        _context = context;
        _tenantContext = tenantContext;
        _addonCode = addonCode.Trim().ToUpperInvariant();
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // SuperAdmins bypass
        if (_tenantContext.IsSuperAdmin)
        {
            await next();
            return;
        }

        var tenantId = _tenantContext.TenantId;
        if (tenantId == Guid.Empty)
        {
            await next();
            return;
        }

        // Check if tenant has active addon enrolled in database
        var hasActiveAddon = await _context.TenantSubscriptionAddOns
            .IgnoreQueryFilters()
            .Include(sa => sa.AddOn)
            .AnyAsync(sa => sa.TenantId == tenantId &&
                            sa.AddOn.Code.ToUpper() == _addonCode &&
                            sa.ExpiresAtUtc > DateTimeOffset.UtcNow);

        if (!hasActiveAddon)
        {
            // Check ConfigurationJson override
            var config = await _context.TenantIndustryConfigs
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            string key = _addonCode.Replace("ADDON_", "").ToLower();
            bool hasOverride = false;
            if (config != null && !string.IsNullOrWhiteSpace(config.ConfigurationJson))
            {
                try
                {
                    var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, bool>>(config.ConfigurationJson);
                    if (dict != null && dict.TryGetValue(key, out var active))
                    {
                        hasOverride = active;
                    }
                }
                catch { }
            }

            if (!hasOverride)
            {
                context.Result = new ObjectResult(new
                {
                    error = $"Access to this feature requires an active '{_addonCode}' subscription. Please subscribe from the Add-on Store.",
                    code = "ADDON_REQUIRED",
                    addonCode = _addonCode
                })
                {
                    StatusCode = StatusCodes.Status402PaymentRequired
                };
                return;
            }
        }

        await next();
    }
}