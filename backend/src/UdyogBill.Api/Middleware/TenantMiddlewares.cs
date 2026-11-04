using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using System.Security.Claims;
using UdyogBill.Application.Interfaces;
using SharedClaims = UdyogBill.Shared.Constants.Claims;

namespace UdyogBill.Api.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var isSuperAdminClaim = context.User.FindFirst(SharedClaims.IsSuperAdmin)?.Value;
            var isSuperAdmin = (bool.TryParse(isSuperAdminClaim, out var sa) && sa) || context.User.IsInRole(UdyogBill.Shared.Constants.Roles.SuperAdmin);

            var tenantIdClaim = context.User.FindFirst(SharedClaims.TenantId)?.Value;
            var tenantCode = context.User.FindFirst("tenant_code")?.Value;

            Guid tenantId = Guid.Empty;
            Guid.TryParse(tenantIdClaim, out tenantId);

            if (isSuperAdmin)
            {
                // Verified SuperAdmin: allow X-Tenant-Id header override if provided
                if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantVal) &&
                    Guid.TryParse(headerTenantVal, out var headerTenantId) &&
                    headerTenantId != Guid.Empty)
                {
                    tenantId = headerTenantId;
                }

                if (string.IsNullOrWhiteSpace(tenantCode) && context.Request.Headers.TryGetValue("X-Tenant-Code", out var headerCodeVal))
                {
                    tenantCode = headerCodeVal.ToString();
                }

                tenantContext.SetTenant(tenantId, tenantCode, isSuperAdmin: true);
            }
            else
            {
                // Non-superadmin authenticated user:
                // 1. JWT me tenant_id claim missing ho to 403 se block karo, header par KABHI bharosa mat karo
                if (tenantId == Guid.Empty)
                {
                    _logger.LogWarning("SECURITY ALERT: Authenticated non-superadmin user lacks valid '{ClaimName}' claim in JWT. Blocking request.", SharedClaims.TenantId);
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new { error = "MISSING_TENANT_CLAIM", message = "Active tenant claim required." });
                    return;
                }

                // 2. Header agar JWT ke tenant se alag ho to bhi block + log warning
                if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var spoofHeaderVal))
                {
                    if (Guid.TryParse(spoofHeaderVal, out var incomingTenantId) && incomingTenantId != Guid.Empty && incomingTenantId != tenantId)
                    {
                        _logger.LogWarning("SECURITY ALERT: Authenticated user (Tenant: {JwtTenant}) attempted cross-tenant access to Tenant {HeaderTenant}", tenantId, incomingTenantId);
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new { error = "TENANT_MISMATCH", message = "Cross-tenant access prohibited." });
                        return;
                    }
                }

                // Non-superadmin tenant context strictly resolved from verified JWT claim
                tenantContext.SetTenant(tenantId, tenantCode, isSuperAdmin: false);
            }
        }

        // Anonymous / unauthenticated endpoints pass through unaffected
        await _next(context);
    }
}

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");

        await _next(context);
    }
}

public class TenantStatusMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantStatusMiddleware> _logger;

    public TenantStatusMiddleware(RequestDelegate next, ILogger<TenantStatusMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true &&
            tenantContext.TenantId != Guid.Empty &&
            !tenantContext.IsSuperAdmin)
        {
            var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
            if (!path.StartsWith("/api/v1/auth") && !path.StartsWith("/api/v1/superadmin"))
            {
                var tenant = await dbContext.Tenants
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(t => t.Id == tenantContext.TenantId && !t.IsDeleted)
                    .Select(t => new { t.Status, t.IsActive })
                    .FirstOrDefaultAsync();

                if (tenant != null && (tenant.Status == TenantStatus.Suspended || !tenant.IsActive))
                {
                    _logger.LogWarning("TenantStatusMiddleware: Blocked suspended tenant {TenantId} on path {Path}", tenantContext.TenantId, path);
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = "Your store account has been suspended by administration. Please contact support@udyogbill.com.",
                        code = "TENANT_SUSPENDED"
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
