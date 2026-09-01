using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = $"{Roles.TenantAdmin},{Roles.TenantManager}")]
[Route("api/v1/tenant/branches")]
public class TenantBranchesController : BaseApiController
{
    private readonly ITenantHierarchyService _hierarchyService;

    public TenantBranchesController(ITenantHierarchyService hierarchyService)
    {
        _hierarchyService = hierarchyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BranchDetailsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBranches(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetBranchesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BranchDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBranch(Guid id, CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetBranchByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.CreateBranchAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBranch(Guid id, [FromBody] UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateBranchAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteBranch(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.DeleteBranchAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = $"{Roles.TenantAdmin},{Roles.TenantManager}")]
[Route("api/v1/tenant/warehouses")]
public class TenantWarehousesController : BaseApiController
{
    private readonly ITenantHierarchyService _hierarchyService;

    public TenantWarehousesController(ITenantHierarchyService hierarchyService)
    {
        _hierarchyService = hierarchyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WarehouseDetailsDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWarehouses([FromQuery] Guid? branchId, CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetWarehousesAsync(branchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(WarehouseDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWarehouse(Guid id, CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetWarehouseByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.CreateWarehouseAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateWarehouse(Guid id, [FromBody] UpdateWarehouseRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateWarehouseAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteWarehouse(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.DeleteWarehouseAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = $"{Roles.TenantAdmin},{Roles.TenantManager}")]
[Route("api/v1/tenant/staff")]
public class TenantStaffController : BaseApiController
{
    private readonly ITenantHierarchyService _hierarchyService;

    public TenantStaffController(ITenantHierarchyService hierarchyService)
    {
        _hierarchyService = hierarchyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<StaffUserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffUsers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _hierarchyService.GetStaffUsersAsync(pageNumber, pageSize, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(StaffUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffUser(Guid id, CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetStaffUserByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateStaffUser([FromBody] CreateStaffUserRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.CreateStaffUserAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateStaffUser(Guid id, [FromBody] UpdateStaffUserRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateStaffUserAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("my-profile")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateMyProfileAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}/roles")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AssignRoles(Guid id, [FromBody] AssignUserRolesRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.AssignUserRolesAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}/permissions")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdatePermissions(Guid id, [FromBody] UpdateUserPermissionsRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateUserPermissionsAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteStaffUser(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.DeleteStaffUserAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("roles")]
    [ProducesResponseType(typeof(IReadOnlyList<RoleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetRolesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("roles")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.CreateRoleAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("roles/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateRoleAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("roles/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.DeleteRoleAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("permissions")]
    [ProducesResponseType(typeof(IReadOnlyList<PermissionGroupDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailablePermissions(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetAvailablePermissionsAsync(cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/settings")]
public class TenantSettingsController : BaseApiController
{
    private readonly ITenantHierarchyService _hierarchyService;

    public TenantSettingsController(ITenantHierarchyService hierarchyService)
    {
        _hierarchyService = hierarchyService;
    }

    [HttpGet("profile")]
    [ProducesResponseType(typeof(TenantDetailsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetBusinessProfileAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("profile")]
    [Authorize(Roles = Roles.TenantAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateBusinessProfileRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateBusinessProfileAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("test-email")]
    [Authorize(Roles = Roles.TenantAdmin)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendTestEmail([FromBody] SendTenantTestEmailRequest request, CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.SendTenantTestEmailAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("industry-config")]
    [ProducesResponseType(typeof(TenantIndustryConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIndustryConfig(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetIndustryConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("industry-config")]
    [Authorize(Roles = Roles.TenantAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateIndustryConfig([FromBody] UpdateTenantIndustryConfigRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateIndustryConfigAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("quotas")]
    [ProducesResponseType(typeof(TenantQuotaSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuotaSummary(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetQuotaSummaryAsync(cancellationToken);
        return HandleResult(result);
    }
}
