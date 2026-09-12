using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/analytics")]
public class AnalyticsController : BaseApiController
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
    }

    // ─── Config endpoints ────────────────────────────────────────────────────

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var config = await _db.AnalyticsConfigs.AsNoTracking().FirstOrDefaultAsync();
        if (config == null) return Ok(new { isConfigured = false });

        return Ok(new
        {
            isConfigured = config.IsGa4Enabled,
            isGa4Enabled = config.IsGa4Enabled,
            isGscEnabled = config.IsGscEnabled,
            ga4PropertyId = config.Ga4PropertyId,
            gscSiteUrl = config.GscSiteUrl,
            // Never return the secret JSON
            hasGa4Credentials = !string.IsNullOrEmpty(config.Ga4ServiceAccountJson),
            hasGscCredentials = !string.IsNullOrEmpty(config.GscServiceAccountJson)
        });
    }

    [HttpPost("config")]
    public async Task<IActionResult> SaveConfig([FromBody] SaveAnalyticsConfigRequest req)
    {
        var config = await _db.AnalyticsConfigs.FirstOrDefaultAsync() ?? new AnalyticsConfig();

        if (!string.IsNullOrWhiteSpace(req.Ga4PropertyId))
        {
            var pid = req.Ga4PropertyId.Trim();
            config.Ga4PropertyId = pid.StartsWith("properties/") ? pid : $"properties/{pid}";
        }
        config.GscSiteUrl = req.GscSiteUrl?.Trim() ?? config.GscSiteUrl;
        config.IsGa4Enabled = req.IsGa4Enabled;
        config.IsGscEnabled = req.IsGscEnabled;
        config.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(req.Ga4ServiceAccountJson))
            config.Ga4ServiceAccountJson = req.Ga4ServiceAccountJson.Trim();

        if (!string.IsNullOrWhiteSpace(req.GscServiceAccountJson))
            config.GscServiceAccountJson = req.GscServiceAccountJson.Trim();

        if (config.Id == 1 && !_db.AnalyticsConfigs.Local.Contains(config))
            _db.AnalyticsConfigs.Add(config);

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Analytics config saved." });
    }

    // ─── Data endpoints ──────────────────────────────────────────────────────

    private async Task<AnalyticsConfig?> GetConfigAsync() =>
        await _db.AnalyticsConfigs.AsNoTracking().FirstOrDefaultAsync();

    [HttpGet("realtime")]
    public async Task<IActionResult> GetRealtime()
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, activeUsers = 0, topPages = new List<object>(), topCities = new List<object>() });

        var data = await GoogleAnalyticsService.GetRealtimeDataAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson);
        return Ok(new { configured = true, activeUsers = data.ActiveUsers, topPages = data.TopActivePages, topCities = data.TopActiveCities });
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetOverviewAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, data });
    }

    [HttpGet("trend")]
    public async Task<IActionResult> GetTrend([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, points = new List<object>() });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetTrendAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, points = data });
    }

    [HttpGet("sources")]
    public async Task<IActionResult> GetSources([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, sources = new List<object>() });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetSourcesAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, sources = data });
    }

    [HttpGet("pages")]
    public async Task<IActionResult> GetPages([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, pages = new List<object>() });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetPagesAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, pages = data });
    }

    [HttpGet("geo")]
    public async Task<IActionResult> GetGeo([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, cities = new List<object>() });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetGeoAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, cities = data });
    }

    [HttpGet("devices")]
    public async Task<IActionResult> GetDevices([FromQuery] string range = "30d")
    {
        var config = await GetConfigAsync();
        if (config == null || !config.IsGa4Enabled || string.IsNullOrEmpty(config.Ga4ServiceAccountJson))
            return Ok(new { configured = false, devices = new List<object>() });

        var (start, end) = GoogleAnalyticsService.GetDateRange(range);
        var data = await GoogleAnalyticsService.GetDevicesAsync(config.Ga4PropertyId, config.Ga4ServiceAccountJson, start, end);
        return Ok(new { configured = true, devices = data });
    }
}

public record SaveAnalyticsConfigRequest(
    string? Ga4PropertyId,
    string? Ga4ServiceAccountJson,
    string? GscSiteUrl,
    string? GscServiceAccountJson,
    bool IsGa4Enabled,
    bool IsGscEnabled);
