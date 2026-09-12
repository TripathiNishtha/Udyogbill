using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin")]
public class PlatformSettingsController : BaseApiController
{
    private readonly IPlatformSettingsService _settingsService;
    private readonly ISandboxGstService _sandboxGstService;

    public PlatformSettingsController(
        IPlatformSettingsService settingsService,
        ISandboxGstService sandboxGstService)
    {
        _settingsService = settingsService;
        _sandboxGstService = sandboxGstService;
    }

    #region Company Profile

    [HttpGet("company-profile")]
    [ProducesResponseType(typeof(PlatformCompanyProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCompanyProfile(CancellationToken cancellationToken)
    {
        var result = await _settingsService.GetCompanyProfileAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("company-profile")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateCompanyProfile(
        [FromBody] UpdatePlatformCompanyProfileRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.UpdateCompanyProfileAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("company-profile/test-sandbox-gst")]
    [ProducesResponseType(typeof(GstLookupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> TestSandboxGst(
        [FromBody] TestSandboxGstRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _sandboxGstService.TestConnectionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Email Settings

    [HttpGet("email-config")]
    [ProducesResponseType(typeof(PlatformEmailConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEmailConfig(CancellationToken cancellationToken)
    {
        var result = await _settingsService.GetEmailConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("email-config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateEmailConfig(
        [FromBody] UpdatePlatformEmailConfigRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.UpdateEmailConfigAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("email-config/test")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendTestEmail(
        [FromBody] SendTestEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.SendTestEmailAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Bulk Broadcast Mailer

    [HttpPost("broadcast-email")]
    [ProducesResponseType(typeof(BroadcastEmailResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BroadcastEmail(
        [FromBody] BroadcastEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _settingsService.BroadcastEmailAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
