using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/referral")]
public class TenantReferralController : BaseApiController
{
    private readonly IReferralService _referralService;
    private readonly ITenantContext _tenantContext;

    public TenantReferralController(
        IReferralService referralService,
        ITenantContext tenantContext)
    {
        _referralService = referralService;
        _tenantContext = tenantContext;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(TenantReferralSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        string? baseUrl = Request.Headers.ContainsKey("Origin") 
            ? Request.Headers["Origin"].ToString() 
            : $"{Request.Scheme}://{Request.Host}";

        var result = await _referralService.GetTenantReferralSummaryAsync(_tenantContext.TenantId, baseUrl, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("payout-settings")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdatePayoutSettings(
        [FromBody] UpdateReferralPayoutSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _referralService.UpdateTenantPayoutSettingsAsync(_tenantContext.TenantId, request, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/referrals")]
public class SuperAdminReferralController : BaseApiController
{
    private readonly IReferralService _referralService;

    public SuperAdminReferralController(IReferralService referralService)
    {
        _referralService = referralService;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(ReferralProgramConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfig(CancellationToken cancellationToken)
    {
        var result = await _referralService.GetReferralConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("config")]
    [ProducesResponseType(typeof(ReferralProgramConfigDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateConfig(
        [FromBody] UpdateReferralProgramConfigRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _referralService.UpdateReferralConfigAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("analytics")]
    [ProducesResponseType(typeof(SuperAdminReferralAnalyticsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken)
    {
        var result = await _referralService.GetSuperAdminReferralAnalyticsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("conversions/{conversionId:guid}/payout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessPayout(
        Guid conversionId,
        [FromBody] ProcessReferralPayoutRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _referralService.ProcessPayoutAsync(conversionId, request, cancellationToken);
        return HandleResult(result);
    }
}
