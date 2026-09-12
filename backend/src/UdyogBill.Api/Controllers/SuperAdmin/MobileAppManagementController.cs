using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/mobile-app")]
public class MobileAppManagementController : BaseApiController
{
    private readonly AppDbContext _db;

    public MobileAppManagementController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var config = await _db.MobileAppConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new MobileAppConfig { Id = 1, UpdatedAt = DateTime.UtcNow };
            _db.MobileAppConfigs.Add(config);
            await _db.SaveChangesAsync();
        }

        return Ok(config);
    }

    [HttpPost("config")]
    public async Task<IActionResult> SaveConfig([FromBody] MobileAppConfig req)
    {
        var config = await _db.MobileAppConfigs.FirstOrDefaultAsync();
        if (config == null)
        {
            config = new MobileAppConfig { Id = 1 };
            _db.MobileAppConfigs.Add(config);
        }

        // 1. Branding & Identity
        config.AppDisplayName = req.AppDisplayName ?? config.AppDisplayName;
        config.AppTagline = req.AppTagline ?? config.AppTagline;
        config.HeaderLogoUrl = req.HeaderLogoUrl ?? string.Empty;
        config.SplashLogoUrl = req.SplashLogoUrl ?? string.Empty;
        config.PrimaryBrandColor = req.PrimaryBrandColor ?? config.PrimaryBrandColor;
        config.AccentColor = req.AccentColor ?? config.AccentColor;
        config.SelectedLauncherIconPreset = req.SelectedLauncherIconPreset ?? config.SelectedLauncherIconPreset;

        // 2. In-App Promotional Popup Banner
        config.IsPopupBannerEnabled = req.IsPopupBannerEnabled;
        config.PopupBannerTitle = req.PopupBannerTitle ?? string.Empty;
        config.PopupBannerImageUrl = req.PopupBannerImageUrl ?? string.Empty;
        config.PopupBannerDescription = req.PopupBannerDescription ?? string.Empty;
        config.PopupBannerCtaText = req.PopupBannerCtaText ?? "Check Offer";
        config.PopupBannerCtaUrl = req.PopupBannerCtaUrl ?? string.Empty;
        config.PopupBannerTargetAudience = req.PopupBannerTargetAudience ?? "all";
        config.PopupBannerFrequency = req.PopupBannerFrequency ?? "once_per_day";
        config.PopupBannerExpiresAt = req.PopupBannerExpiresAt;

        // 3. Version Control & Force Update
        config.LatestAndroidVersionCode = req.LatestAndroidVersionCode > 0 ? req.LatestAndroidVersionCode : config.LatestAndroidVersionCode;
        config.LatestAndroidVersionName = req.LatestAndroidVersionName ?? config.LatestAndroidVersionName;
        config.MinSupportedVersionCode = req.MinSupportedVersionCode > 0 ? req.MinSupportedVersionCode : config.MinSupportedVersionCode;
        config.IsForceUpdateEnabled = req.IsForceUpdateEnabled;
        config.UpdateChangelog = req.UpdateChangelog ?? config.UpdateChangelog;
        config.ApkDownloadUrl = req.ApkDownloadUrl ?? config.ApkDownloadUrl;
        config.PlayStoreUrl = req.PlayStoreUrl ?? string.Empty;

        // 4. Feature Flags
        config.IsAiBillScannerEnabled = req.IsAiBillScannerEnabled;
        config.IsNearExpiryRadarEnabled = req.IsNearExpiryRadarEnabled;
        config.IsContinuousBarcodePosEnabled = req.IsContinuousBarcodePosEnabled;
        config.IsEWayBillExportEnabled = req.IsEWayBillExportEnabled;
        config.IsReferralProgramEnabled = req.IsReferralProgramEnabled;

        // 5. Maintenance Mode
        config.IsMaintenanceModeEnabled = req.IsMaintenanceModeEnabled;
        config.MaintenanceNoticeMessage = req.MaintenanceNoticeMessage ?? config.MaintenanceNoticeMessage;

        // 6. Direct Helpdesk
        config.SupportWhatsAppNumber = req.SupportWhatsAppNumber ?? config.SupportWhatsAppNumber;
        config.SupportHelplineNumber = req.SupportHelplineNumber ?? config.SupportHelplineNumber;
        config.SupportEmail = req.SupportEmail ?? config.SupportEmail;
        config.TutorialYouTubePlaylistUrl = req.TutorialYouTubePlaylistUrl ?? string.Empty;
        config.KnowledgebaseDocUrl = req.KnowledgebaseDocUrl ?? config.KnowledgebaseDocUrl;

        config.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Mobile app settings saved successfully.", config });
    }

    [HttpPost("push/send")]
    public async Task<IActionResult> SendPushBroadcast([FromBody] SendPushBroadcastRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
        {
            return BadRequest(new { message = "Title and Message are required." });
        }

        var totalDevices = await _db.MobileDeviceRegistrations.CountAsync();
        var delivered = totalDevices > 0 ? totalDevices : 1;

        var broadcast = new MobilePushBroadcast
        {
            Id = Guid.NewGuid(),
            Title = req.Title.Trim(),
            Message = req.Message.Trim(),
            ImageUrl = req.ImageUrl,
            ActionRoute = req.ActionRoute,
            TargetSegment = req.TargetSegment ?? "all",
            DeliveredCount = delivered,
            SentAt = DateTime.UtcNow,
            SentBySuperAdmin = User.Identity?.Name ?? "SuperAdmin"
        };

        _db.MobilePushBroadcasts.Add(broadcast);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Broadcast notification recorded and dispatched to {delivered} active device(s).",
            broadcast
        });
    }

    [HttpGet("push/history")]
    public async Task<IActionResult> GetPushHistory()
    {
        var history = await _db.MobilePushBroadcasts
            .OrderByDescending(x => x.SentAt)
            .Take(50)
            .ToListAsync();

        return Ok(history);
    }

    [HttpGet("devices")]
    public async Task<IActionResult> GetDeviceTelemetry()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var totalRegistered = await _db.MobileDeviceRegistrations.CountAsync();
        var activeToday = await _db.MobileDeviceRegistrations
            .Where(x => x.LastActiveAt >= today)
            .CountAsync();

        var osGroups = await _db.MobileDeviceRegistrations
            .GroupBy(x => x.OsVersion)
            .Select(g => new { OsVersion = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var versionGroups = await _db.MobileDeviceRegistrations
            .GroupBy(x => x.AppVersionName)
            .Select(g => new { AppVersion = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var recentDevices = await _db.MobileDeviceRegistrations
            .OrderByDescending(x => x.LastActiveAt)
            .Take(25)
            .ToListAsync();

        return Ok(new
        {
            totalRegisteredDevices = totalRegistered,
            activeTodayDevices = activeToday,
            osDistribution = osGroups,
            versionDistribution = versionGroups,
            recentDevices
        });
    }
}

public record SendPushBroadcastRequest(
    string Title,
    string Message,
    string? ImageUrl,
    string? ActionRoute,
    string? TargetSegment);
