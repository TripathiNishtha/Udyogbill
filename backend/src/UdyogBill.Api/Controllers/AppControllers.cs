using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
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
    private readonly ISuperAdminService _superAdminService;
    private readonly ICurrentUserContext _currentUserContext;

    public AuthController(
        IAuthService authService,
        IPlatformSettingsService settingsService,
        ISuperAdminService superAdminService,
        ICurrentUserContext currentUserContext)
    {
        _authService = authService;
        _settingsService = settingsService;
        _superAdminService = superAdminService;
        _currentUserContext = currentUserContext;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var result = await _authService.LoginAsync(request, ipAddress, cancellationToken);

        // Security Telemetry Capture
        if (result.IsSuccess && result.Data?.User?.TenantId.HasValue == true)
        {
            var tenantId = result.Data.User.TenantId.Value;
            var userId = result.Data.User.Id;

            var deviceId = Request.Headers["X-Device-Id"].FirstOrDefault() ?? $"device-{Guid.NewGuid():N}";
            var brand = Request.Headers["X-Device-Brand"].FirstOrDefault();
            var model = Request.Headers["X-Device-Model"].FirstOrDefault();
            var os = Request.Headers["X-Device-OS"].FirstOrDefault();
            var osVersion = Request.Headers["X-Device-OS-Version"].FirstOrDefault();
            var appVersion = Request.Headers["X-App-Version"].FirstOrDefault();
            var connType = Request.Headers["X-Connection-Type"].FirstOrDefault() ?? (userAgent.Contains("Dart") ? "MobileData" : "WiFi");
            var isDual = Request.Headers["X-Is-Dual-Sim"].FirstOrDefault() == "true";
            var sim1 = Request.Headers["X-Sim1-Carrier"].FirstOrDefault();
            var sim2 = Request.Headers["X-Sim2-Carrier"].FirstOrDefault();
            var simPhone = Request.Headers["X-Sim-Phone"].FirstOrDefault();

            var telemetry = new ClientTelemetryPayload(
                deviceId,
                Request.Headers["X-Device-Type"].FirstOrDefault() ?? (userAgent.Contains("Dart") || userAgent.Contains("Mobile") ? "Mobile" : "Desktop"),
                string.IsNullOrWhiteSpace(brand) ? (userAgent.Contains("Windows") ? "Windows" : (userAgent.Contains("Mac") ? "Apple" : "Unknown Brand")) : brand,
                string.IsNullOrWhiteSpace(model) ? (userAgent.Contains("Windows") ? "PC" : (userAgent.Contains("Mac") ? "Mac" : "Device")) : model,
                string.IsNullOrWhiteSpace(os) ? (userAgent.Contains("Windows") ? "Windows" : (userAgent.Contains("Android") ? "Android" : "Web")) : os,
                osVersion ?? "",
                appVersion ?? (userAgent.Contains("Dart") ? "Flutter APK" : "Web Portal"),
                connType,
                isDual,
                sim1,
                sim2,
                simPhone
            );

            _ = Task.Run(async () =>
            {
                try
                {
                    await _superAdminService.RecordLoginAttemptAsync(
                        tenantId,
                        userId,
                        request.Email,
                        isSuccessful: true,
                        failureReason: null,
                        authChannel: userAgent.Contains("Dart") ? "MobileApp" : "WebPortal",
                        ipAddress: ipAddress,
                        userAgent: userAgent,
                        clientTelemetry: telemetry,
                        cancellationToken: CancellationToken.None
                    );
                }
                catch
                {
                    // Non-blocking telemetry
                }
            });
        }

        return HandleResult(result);
    }

    [HttpPost("telemetry")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordTelemetry([FromBody] ClientTelemetryPayload payload, CancellationToken cancellationToken)
    {
        var tenantId = _currentUserContext.TenantId;
        if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
        {
            return BadRequest(new { message = "Valid authenticated tenant context required for telemetry ingestion." });
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var result = await _superAdminService.RecordClientTelemetryAsync(
            tenantId.Value,
            _currentUserContext.UserId,
            payload,
            ipAddress,
            userAgent,
            cancellationToken
        );

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

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var token = request?.RefreshToken ?? Request.Headers["X-Refresh-Token"].ToString();
        var result = await _authService.RevokeTokenAsync(token, ipAddress, cancellationToken);
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
    private readonly ITenantHierarchyService _hierarchyService;

    public TenantsController(ITenantService tenantService, ITenantHierarchyService hierarchyService)
    {
        _tenantService = tenantService;
        _hierarchyService = hierarchyService;
    }

    [HttpGet("current")]
    [ProducesResponseType(typeof(TenantDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentTenant(CancellationToken cancellationToken)
    {
        var result = await _hierarchyService.GetBusinessProfileAsync(cancellationToken);
        if (result.IsSuccess) return HandleResult(result);
        var fallback = await _tenantService.GetCurrentTenantDetailsAsync(cancellationToken);
        return HandleResult(fallback);
    }

    [HttpPut("current")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateCurrentTenant([FromBody] UpdateBusinessProfileRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _hierarchyService.UpdateBusinessProfileAsync(request, ipAddress, cancellationToken);
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
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        Persistence.Context.AppDbContext context,
        IWebHostEnvironment environment,
        ILogger<HealthController> logger)
    {
        _context = context;
        _environment = environment;
        _logger = logger;
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
                error = canConnect ? null : (_environment.IsDevelopment() ? "Unable to connect to database." : "Database service is temporarily unavailable."),
                timestampUtc = DateTimeOffset.UtcNow,
                version = "1.0.0-step1",
                platform = ".NET 9 / ASP.NET Core 9 Web API"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed to connect to database");
            return Ok(new
            {
                status = "Degraded",
                database = "Unavailable",
                error = _environment.IsDevelopment() ? ex.Message : "Database service is temporarily unavailable.",
                timestampUtc = DateTimeOffset.UtcNow,
                version = "1.0.0-step1"
            });
        }
    }
}
