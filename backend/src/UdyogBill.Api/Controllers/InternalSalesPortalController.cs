using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Route("api/v1/internal-sales")]
[Route("api/v1/sales-portal")]
public class InternalSalesPortalController : BaseApiController
{
    private readonly IInternalSalesForceService _sfaService;

    public InternalSalesPortalController(IInternalSalesForceService sfaService)
    {
        _sfaService = sfaService;
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Device Registration (First app launch on hardware phone)
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register-device")]
    [HttpPost("auth/register-device")]
    [ProducesResponseType(typeof(HardwareDeviceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceRequest req)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "0.0.0.0";
        var result = await _sfaService.RegisterDeviceAsync(req, ip);
        return HandleResult(result);
    }

    /// <summary>
    /// Sales Rep Login with Single-Device Hardware Lock Enforcement
    /// </summary>
    [AllowAnonymous]
    [HttpPost("auth/login")]
    [HttpPost("login")]
    [ProducesResponseType(typeof(RepLoginResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] RepLoginRequest req)
    {
        var result = await _sfaService.LoginRepAsync(req);
        return HandleResult(result);
    }

    /// <summary>
    /// Live Target Progress Cockpit for Sales Rep (Target ₹2L, Achieved, Gap, Run-rate)
    /// </summary>
    [Authorize]
    [HttpGet("cockpit")]
    [HttpGet("my-cockpit")]
    [ProducesResponseType(typeof(RepCockpitSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyCockpit()
    {
        var userId = GetCurrentUserId();
        var result = await _sfaService.GetRepCockpitAsync(userId);
        return HandleResult(result);
    }

    /// <summary>
    /// Active Company Product Catalog for Shop Visit Pitching
    /// </summary>
    [Authorize]
    [HttpGet("products")]
    [ProducesResponseType(typeof(IReadOnlyList<CompanyProductCatalogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPitchedProducts()
    {
        var result = await _sfaService.GetProductCatalogAsync(activeOnly: true);
        return HandleResult(result);
    }

    /// <summary>
    /// 30-Second Quick Shop Visit Punch with Anti-Fraud GPS & Camera Snap
    /// </summary>
    [Authorize]
    [HttpPost("visits")]
    [HttpPost("visits/punch")]
    [ProducesResponseType(typeof(FieldShopVisitDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PunchVisit([FromBody] PunchVisitRequest req)
    {
        var userId = GetCurrentUserId();
        var result = await _sfaService.PunchVisitAsync(userId, req);
        return HandleResult(result);
    }

    /// <summary>
    /// Get My Recent Visits
    /// </summary>
    [Authorize]
    [HttpGet("visits")]
    [ProducesResponseType(typeof(PagedResult<FieldShopVisitDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyVisits([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId();
        var repsRes = await _sfaService.GetSalesRepsAsync();
        var rep = repsRes.Data?.FirstOrDefault(r => r.UserId == userId);
        var repId = rep?.Id;
        var result = await _sfaService.GetVisitsAsync(repId: repId, pageNumber: pageNumber, pageSize: pageSize);
        return HandleResult(result);
    }
}
