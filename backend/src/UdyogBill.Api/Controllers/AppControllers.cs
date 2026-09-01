using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Api.Controllers;

[EnableRateLimiting("AuthPolicy")]
public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly IPlatformSettingsService _settingsService;

    public AuthController(IAuthService authService, IPlatformSettingsService settingsService)
    {
        _authService = authService;
        _settingsService = settingsService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _authService.LoginAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RegisterTenant([FromBody] RegisterTenantRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _authService.RegisterTenantAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _authService.RefreshTokenAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _settingsService.SendForgotPasswordOtpAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordWithOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _settingsService.ResetPasswordWithOtpAsync(request, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
public class TenantsController : BaseApiController
{
    private readonly ITenantService _tenantService;

    public TenantsController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    [HttpGet("current")]
    [ProducesResponseType(typeof(TenantDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentTenant(CancellationToken cancellationToken)
    {
        var result = await _tenantService.GetCurrentTenantDetailsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{tenantId:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(TenantDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTenantById(Guid tenantId, CancellationToken cancellationToken)
    {
        var result = await _tenantService.GetTenantByIdAsync(tenantId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(Shared.PagedResult<TenantDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTenants([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, [FromQuery] string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var result = await _tenantService.GetTenantsAsync(pageNumber, pageSize, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("industry-config")]
    [ProducesResponseType(typeof(TenantIndustryConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIndustryConfig(CancellationToken cancellationToken)
    {
        var result = await _tenantService.GetIndustryConfigAsync(null, cancellationToken);
        return HandleResult(result);
    }
}

public class IndustriesController : BaseApiController
{
    private readonly IIndustryService _industryService;

    public IndustriesController(IIndustryService industryService)
    {
        _industryService = industryService;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<IndustryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllIndustries(CancellationToken cancellationToken)
    {
        var result = await _industryService.GetAllIndustriesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IndustryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIndustryById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _industryService.GetIndustryByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("matrix/{industryId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IndustryCapabilityMatrixDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCapabilityMatrix(Guid industryId, CancellationToken cancellationToken)
    {
        var result = await _industryService.GetCapabilityMatrixAsync(industryId, cancellationToken);
        return HandleResult(result);
    }
}

public class PlansController : BaseApiController
{
    private readonly IPlanService _planService;

    public PlansController(IPlanService planService)
    {
        _planService = planService;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<PlanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActivePlans(CancellationToken cancellationToken)
    {
        var result = await _planService.GetActivePlansAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PlanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlanById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _planService.GetPlanByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }
}

public class HealthController : BaseApiController
{
    private readonly Persistence.Context.AppDbContext _context;

    public HealthController(Persistence.Context.AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> CheckHealth(CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
            return Ok(new
            {
                status = canConnect ? "Healthy" : "Degraded",
                database = canConnect ? "Connected (PostgreSQL)" : "Unavailable",
                timestampUtc = DateTimeOffset.UtcNow,
                version = "1.0.0-step1",
                platform = ".NET 10 / ASP.NET Core 10 Web API"
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                status = "Starting",
                database = "Connecting",
                error = ex.Message,
                timestampUtc = DateTimeOffset.UtcNow,
                version = "1.0.0-step1"
            });
        }
    }
}
