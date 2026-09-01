using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Api.Filters;

/// <summary>
/// Requires the authenticated user to possess at least one of the specified permissions.
/// SuperAdmins and TenantAdmins automatically bypass this restriction.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(params string[] permissions) 
        : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { permissions };
    }
}

public class RequirePermissionFilter : IAsyncActionFilter
{
    private readonly ICurrentUserContext _currentUserContext;
    private readonly string[] _permissions;

    public RequirePermissionFilter(ICurrentUserContext currentUserContext, string[] permissions)
    {
        _currentUserContext = currentUserContext;
        _permissions = permissions;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "Authentication is required to access this resource.",
                code = "UNAUTHORIZED"
            });
            return;
        }

        // SuperAdmins & TenantAdmins have full operational access
        if (_currentUserContext.IsSuperAdmin || _currentUserContext.IsTenantAdmin)
        {
            await next();
            return;
        }

        // Check if user has any of the required permission claims
        var hasPermission = _permissions.Any(p => _currentUserContext.HasPermission(p));
        if (!hasPermission)
        {
            context.Result = new ObjectResult(new
            {
                error = $"Access denied. You do not possess the required permission: {string.Join(", ", _permissions)}",
                code = "PERMISSION_DENIED",
                requiredPermissions = _permissions
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }
}
