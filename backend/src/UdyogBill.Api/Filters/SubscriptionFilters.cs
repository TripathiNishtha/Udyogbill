using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;
using SharedClaims = UdyogBill.Shared.Constants.Claims;

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

        // SuperAdmins & Impersonating Admins bypass
        if (_tenantContext.IsSuperAdmin ||
            context.HttpContext.User.IsInRole(Roles.SuperAdmin) ||
            context.HttpContext.User.HasClaim(c => c.Type == "is_impersonating" || (c.Type == SharedClaims.IsSuperAdmin && c.Value == "true")))
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
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && !s.IsDeleted);

        var now = DateTimeOffset.UtcNow;
        bool isExpired = false;

        if (sub == null)
        {
            // If no subscription recorded, check if within default 14-day signup trial window
            if (tenant.CreatedAtUtc.AddDays(14) < now)
            {
                isExpired = true;
            }
        }
        else
        {
            if (sub.Status == SubscriptionStatus.Expired ||
                sub.Status == SubscriptionStatus.Suspended ||
                sub.Status == SubscriptionStatus.Cancelled)
            {
                isExpired = true;
            }
            else if (sub.Status == SubscriptionStatus.Trial)
            {
                var trialEnd = sub.TrialEndsAtUtc ?? sub.EndsAtUtc;
                if (trialEnd < now)
                {
                    isExpired = true;
                }
            }
            else // Active or others
            {
                if (sub.EndsAtUtc < now)
                {
                    isExpired = true;
                }
            }
        }

        if (isExpired)
        {
            context.Result = new ObjectResult(new
            {
                error = "Your subscription has expired or is inactive. Please subscribe or renew your plan to continue.",
                code = "SUBSCRIPTION_EXPIRED"
            })
            {
                StatusCode = StatusCodes.Status402PaymentRequired
            };
            return;
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
        // SuperAdmins & Impersonating Admins bypass
        if (_tenantContext.IsSuperAdmin ||
            context.HttpContext.User.IsInRole(Roles.SuperAdmin) ||
            context.HttpContext.User.HasClaim(c => c.Type == "is_impersonating" || (c.Type == SharedClaims.IsSuperAdmin && c.Value == "true")))
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

        var now = DateTimeOffset.UtcNow;

        // 1. First ensure the tenant's core subscription/trial is active
        var sub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && !s.IsDeleted);

        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Industry)
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        bool isCoreActive = false;
        if (sub != null)
        {
            if (sub.Status == SubscriptionStatus.Trial)
            {
                var trialEnd = sub.TrialEndsAtUtc ?? sub.EndsAtUtc;
                isCoreActive = trialEnd > now;
            }
            else if (sub.Status == SubscriptionStatus.Active)
            {
                isCoreActive = sub.EndsAtUtc > now;
            }
        }
        else
        {
            isCoreActive = tenant != null && tenant.CreatedAtUtc.AddDays(14) > now;
        }

        if (!isCoreActive)
        {
            context.Result = new ObjectResult(new
            {
                error = "Your core subscription has expired or is inactive. Please subscribe or renew your plan first.",
                code = "SUBSCRIPTION_EXPIRED"
            })
            {
                StatusCode = StatusCodes.Status402PaymentRequired
            };
            return;
        }

        string moduleKey = _addonCode.Replace("ADDON_", "");

        // 2. Check Add-on Store Entitlement: active purchased addon in database
        var hasActiveAddon = await _context.TenantSubscriptionAddOns
            .IgnoreQueryFilters()
            .Include(sa => sa.AddOn)
            .AnyAsync(sa => sa.TenantId == tenantId &&
                            sa.AddOn.Code.ToUpper() == _addonCode &&
                            sa.ExpiresAtUtc > now);

        if (hasActiveAddon)
        {
            await next();
            return;
        }

        // 3. For dedicated/exclusive paid modules (Pharma SFA, AI Pro, WhatsApp, E-way Bill)
        // Industry code alone CANNOT bypass payment! An active paid addon or explicit active flag is required.
        bool isExclusivePaidAddon = _addonCode == "ADDON_PHARMA_SFA" || 
                                    _addonCode == "ADDON_AI_PRO" || 
                                    _addonCode == "ADDON_WHATSAPP" || 
                                    _addonCode == "ADDON_EWAYBILL";

        if (isExclusivePaidAddon)
        {
            bool hasAdminExplicitGrant = false;
            if (_addonCode == "ADDON_PHARMA_SFA" && tenant?.IsPharmaSfaActive == true)
            {
                hasAdminExplicitGrant = true;
            }
            else if (_addonCode == "ADDON_AI_PRO" && tenant?.IsAiAddonActive == true)
            {
                hasAdminExplicitGrant = true;
            }

            if (!hasAdminExplicitGrant)
            {
                context.Result = new ObjectResult(new
                {
                    error = $"Access requires an active paid '{_addonCode}' subscription or admin license grant.",
                    code = "ADDON_REQUIRED",
                    addonCode = _addonCode
                })
                {
                    StatusCode = StatusCodes.Status402PaymentRequired
                };
                return;
            }

            await next();
            return;
        }

        // 4. Primary Industry Entitlement: Allowed only for standard industry vertical features if registered under that industry
        if (tenant != null)
        {
            if (string.Equals(tenant.Industry?.Code, moduleKey, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(tenant.IndustryTypeCode, moduleKey, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(tenant.ActiveIndustryModule, moduleKey, StringComparison.OrdinalIgnoreCase))
            {
                await next();
                return;
            }
        }

        // 5. ConfigurationJson override
        var config = await _context.TenantIndustryConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId);

        string key = moduleKey.ToLower();
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

        await next();
    }
}