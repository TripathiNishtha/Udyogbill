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
            var isSuperAdmin = bool.TryParse(isSuperAdminClaim, out var sa) && sa;

            var tenantIdClaim = context.User.FindFirst(SharedClaims.TenantId)?.Value;
            var tenantCode = context.User.FindFirst("tenant_code")?.Value;

            Guid tenantId = Guid.Empty;
            Guid.TryParse(tenantIdClaim, out tenantId);

            // If tenant is not in claim or user is SuperAdmin impersonating, allow X-Tenant-Id header override
            if (tenantId == Guid.Empty || isSuperAdmin)
            {
                if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantVal) &&
                    Guid.TryParse(headerTenantVal, out var headerTenantId) &&
                    headerTenantId != Guid.Empty)
                {
                    tenantId = headerTenantId;
                }
            }

            if (string.IsNullOrWhiteSpace(tenantCode) && context.Request.Headers.TryGetValue("X-Tenant-Code", out var headerCodeVal))
            {
                tenantCode = headerCodeVal.ToString();
            }

            if (tenantId != Guid.Empty)
            {
                tenantContext.SetTenant(tenantId, tenantCode, isSuperAdmin);
            }
            else if (isSuperAdmin)
            {
                // SuperAdmin without explicit tenant context
                tenantContext.SetTenant(Guid.Empty, null, true);
            }
        }

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
