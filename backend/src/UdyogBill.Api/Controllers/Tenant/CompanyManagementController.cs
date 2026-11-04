using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/companies")]
public class CompanyManagementController : BaseApiController
{
    private readonly ICompanyManagementService _companyService;
    private readonly ICurrentUserContext _currentUser;
    private readonly ITenantContext _tenantContext;

    public CompanyManagementController(
        ICompanyManagementService companyService,
        ICurrentUserContext currentUser,
        ITenantContext tenantContext)
    {
        _companyService = companyService;
        _currentUser = currentUser;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserCompanySummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCompanies(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var currentTenantId = _tenantContext.TenantId;

        var result = await _companyService.GetUserCompaniesAsync(userId, currentTenantId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("quota")]
    [ProducesResponseType(typeof(CompanyQuotaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuota(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var currentTenantId = _tenantContext.TenantId;

        var result = await _companyService.GetCompanyQuotaAsync(currentTenantId, userId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserCompanySummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var currentTenantId = _tenantContext.TenantId;
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _companyService.CreateCompanyAsync(request, userId, currentTenantId, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("switch/{tenantId:guid}")]
    [ProducesResponseType(typeof(SwitchCompanyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SwitchCompany(Guid tenantId, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _companyService.SwitchCompanyAsync(tenantId, userId, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}
