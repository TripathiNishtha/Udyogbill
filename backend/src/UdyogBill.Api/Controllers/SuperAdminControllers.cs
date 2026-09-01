using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Enums;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/tenants")]
public class SuperAdminTenantsController : BaseApiController
{
    private readonly ISuperAdminService _superAdminService;

    public SuperAdminTenantsController(ISuperAdminService superAdminService)
    {
        _superAdminService = superAdminService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<TenantDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTenants(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] TenantStatus? status = null,
        [FromQuery] Guid? industryId = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _superAdminService.GetTenantsAsync(pageNumber, pageSize, status, industryId, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SuperAdminTenantDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTenantDetails(Guid id, CancellationToken cancellationToken)
    {
        var result = await _superAdminService.GetTenantDetailsAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateTenantStatus(Guid id, [FromBody] UpdateTenantStatusRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.UpdateTenantStatusAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}/subscription")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateTenantSubscription(Guid id, [FromBody] UpdateTenantSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.UpdateTenantSubscriptionAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/impersonate")]
    [ProducesResponseType(typeof(ImpersonateTenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ImpersonateTenant(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.ImpersonateTenantAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/assign-package-addons")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AssignPackageAndAddOns(Guid id, [FromBody] AssignPackageAndAddOnsRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.AssignPackageAndAddOnsAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/extend-trial")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExtendTenantTrial(Guid id, [FromBody] ExtendTenantTrialRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.ExtendTenantTrialAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

public class SuperAdminIndustriesController : BaseApiController
{
    private readonly ISuperAdminService _superAdminService;

    public SuperAdminIndustriesController(ISuperAdminService superAdminService)
    {
        _superAdminService = superAdminService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateIndustry([FromBody] CreateIndustryRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.CreateIndustryAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateIndustry(Guid id, [FromBody] UpdateIndustryRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.UpdateIndustryAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteIndustry(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.DeleteIndustryAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/features")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AttachFeature(Guid id, [FromBody] AttachFeatureToIndustryRequest request, CancellationToken cancellationToken)
    {
        var result = await _superAdminService.AttachFeatureToIndustryAsync(id, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}/features/{featureId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DetachFeature(Guid id, Guid featureId, CancellationToken cancellationToken)
    {
        var result = await _superAdminService.DetachFeatureFromIndustryAsync(id, featureId, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/plans")]
public class SuperAdminPlansController : BaseApiController
{
    private readonly ISuperAdminService _superAdminService;

    public SuperAdminPlansController(ISuperAdminService superAdminService)
    {
        _superAdminService = superAdminService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePlanRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.CreatePlanAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdatePlanRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.UpdatePlanAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlan(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _superAdminService.DeletePlanAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin")]
public class SuperAdminAuditController : BaseApiController
{
    private readonly ISuperAdminService _superAdminService;

    public SuperAdminAuditController(ISuperAdminService superAdminService)
    {
        _superAdminService = superAdminService;
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(PlatformStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlatformStats(CancellationToken cancellationToken)
    {
        var result = await _superAdminService.GetPlatformStatsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("audit")]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogQueryRequest request, CancellationToken cancellationToken)
    {
        var result = await _superAdminService.GetAuditLogsAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
