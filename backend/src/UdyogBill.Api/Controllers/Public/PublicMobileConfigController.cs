using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[AllowAnonymous]
[Route("api/v1/public/mobile-app")]
public class PublicMobileConfigController : BaseApiController
{
    private readonly AppDbContext _db;

    public PublicMobileConfigController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetMobileConfig()
    {
        var config = await _db.MobileAppConfigs.AsNoTracking().FirstOrDefaultAsync();
        if (config == null)
        {
            config = new MobileAppConfig();
        }

        // Return structured lightweight payload for Flutter app
        return Ok(new
        {
            branding = new
            {
                appDisplayName = config.AppDisplayName,
                appTagline = config.AppTagline,
                headerLogoUrl = config.HeaderLogoUrl,
                splashLogoUrl = config.SplashLogoUrl,
                primaryBrandColor = config.PrimaryBrandColor,
                accentColor = config.AccentColor,
                launcherIconPreset = config.SelectedLauncherIconPreset
            },
            popupBanner = new
            {
                isEnabled = config.IsPopupBannerEnabled,
                title = config.PopupBannerTitle,
                imageUrl = config.PopupBannerImageUrl,
                description = config.PopupBannerDescription,
                ctaText = config.PopupBannerCtaText,
                ctaUrl = config.PopupBannerCtaUrl,
                targetAudience = config.PopupBannerTargetAudience,
                frequency = config.PopupBannerFrequency,
                expiresAt = config.PopupBannerExpiresAt
            },
            versionControl = new
            {
                latestVersionCode = config.LatestAndroidVersionCode,
                latestVersionName = config.LatestAndroidVersionName,
                minSupportedVersionCode = config.MinSupportedVersionCode,
                isForceUpdateEnabled = config.IsForceUpdateEnabled,
                changelog = config.UpdateChangelog,
                apkDownloadUrl = config.ApkDownloadUrl,
                playStoreUrl = config.PlayStoreUrl
            },
            featureFlags = new
            {
                isAiBillScannerEnabled = config.IsAiBillScannerEnabled,
                isNearExpiryRadarEnabled = config.IsNearExpiryRadarEnabled,
                isContinuousBarcodePosEnabled = config.IsContinuousBarcodePosEnabled,
                isEWayBillExportEnabled = config.IsEWayBillExportEnabled,
                isReferralProgramEnabled = config.IsReferralProgramEnabled
            },
            maintenance = new
            {
                isUnderMaintenance = config.IsMaintenanceModeEnabled,
                noticeMessage = config.MaintenanceNoticeMessage
            },
            support = new
            {
                whatsApp = config.SupportWhatsAppNumber,
                helpline = config.SupportHelplineNumber,
                email = config.SupportEmail,
                youtubePlaylist = config.TutorialYouTubePlaylistUrl,
                knowledgebase = config.KnowledgebaseDocUrl
            }
        });
    }

    [HttpPost("devices/register")]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterMobileDeviceRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.DeviceId))
        {
            return BadRequest(new { message = "DeviceId is required." });
        }

        var device = await _db.MobileDeviceRegistrations.FirstOrDefaultAsync(x => x.DeviceId == req.DeviceId);
        if (device == null)
        {
            device = new MobileDeviceRegistration
            {
                Id = Guid.NewGuid(),
                DeviceId = req.DeviceId.Trim(),
                TenantId = req.TenantId,
                PushToken = req.PushToken,
                DeviceModel = req.DeviceModel ?? "Unknown Android Device",
                OsVersion = req.OsVersion ?? "Android",
                AppVersionCode = req.AppVersionCode > 0 ? req.AppVersionCode : 1,
                AppVersionName = req.AppVersionName ?? "1.0.0",
                RegisteredAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            };
            _db.MobileDeviceRegistrations.Add(device);
        }
        else
        {
            device.TenantId = req.TenantId ?? device.TenantId;
            device.PushToken = req.PushToken ?? device.PushToken;
            device.DeviceModel = req.DeviceModel ?? device.DeviceModel;
            device.OsVersion = req.OsVersion ?? device.OsVersion;
            device.AppVersionCode = req.AppVersionCode > 0 ? req.AppVersionCode : device.AppVersionCode;
            device.AppVersionName = req.AppVersionName ?? device.AppVersionName;
            device.LastActiveAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, deviceId = device.DeviceId });
    }

    [HttpGet("notifications/latest")]
    public async Task<IActionResult> GetLatestBroadcasts([FromQuery] int limit = 10)
    {
        var items = await _db.MobilePushBroadcasts
            .AsNoTracking()
            .OrderByDescending(x => x.SentAt)
            .Take(limit)
            .ToListAsync();

        return Ok(items);
    }
}

public record RegisterMobileDeviceRequest(
    string DeviceId,
    string? TenantId,
    string? PushToken,
    string? DeviceModel,
    string? OsVersion,
    int AppVersionCode,
    string? AppVersionName);
