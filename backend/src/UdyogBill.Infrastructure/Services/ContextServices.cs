using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using UdyogBill.Application.Interfaces;
using SharedClaims = UdyogBill.Shared.Constants.Claims;

namespace UdyogBill.Infrastructure.Services;

public class TenantContext : ITenantContext
{
    public Guid TenantId { get; private set; } = Guid.Empty;
    public string? TenantCode { get; private set; }
    public bool HasTenant => TenantId != Guid.Empty;
    public bool IsSuperAdmin { get; private set; }

    public void SetTenant(Guid tenantId, string? tenantCode = null, bool isSuperAdmin = false)
    {
        TenantId = tenantId;
        TenantCode = tenantCode;
        IsSuperAdmin = isSuperAdmin;
    }
}

public class CurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public Guid? UserId
    {
        get
        {
            var claim = User?.FindFirst(SharedClaims.UserId)?.Value ?? User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }

    public string? Email => User?.FindFirst(SharedClaims.Email)?.Value ?? User?.FindFirst(ClaimTypes.Email)?.Value;

    public string? FullName => User?.FindFirst(SharedClaims.FullName)?.Value;

    public bool IsSuperAdmin => bool.TryParse(User?.FindFirst(SharedClaims.IsSuperAdmin)?.Value, out var val) && val;

    public bool IsTenantAdmin => bool.TryParse(User?.FindFirst(SharedClaims.IsTenantAdmin)?.Value, out var val) && val;

    public Guid? TenantId
    {
        get
        {
            var claim = User?.FindFirst(SharedClaims.TenantId)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }

    public IReadOnlyList<string> Roles =>
        User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();

    public IReadOnlyList<string> Permissions =>
        User?.FindAll(SharedClaims.Permission).Select(c => c.Value).ToList() ?? new List<string>();

    public bool HasPermission(string permission)
    {
        if (IsSuperAdmin || IsTenantAdmin) return true;
        return Permissions.Contains(permission, StringComparer.OrdinalIgnoreCase);
    }

    public bool HasRole(string role)
    {
        if (IsSuperAdmin || IsTenantAdmin) return true;
        return Roles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }
}
