using System;

namespace UdyogBill.Domain.Entities.CMS;

public class MobileAppConfig
{
    public int Id { get; set; } = 1; // Single row singleton configuration

    // 1. Branding & Identity
    public string AppDisplayName { get; set; } = "UdyogBill";
    public string AppTagline { get; set; } = "Smart GST Billing & Inventory";
    public string HeaderLogoUrl { get; set; } = string.Empty;
    public string SplashLogoUrl { get; set; } = string.Empty;
    public string PrimaryBrandColor { get; set; } = "#4F46E5"; // Indigo
    public string AccentColor { get; set; } = "#0D9488"; // Teal
    public string SelectedLauncherIconPreset { get; set; } = "default"; // default, festive, dark, pro

    // 2. In-App Promotional Popup Banner
    public bool IsPopupBannerEnabled { get; set; } = false;
    public string PopupBannerTitle { get; set; } = string.Empty;
    public string PopupBannerImageUrl { get; set; } = string.Empty;
    public string PopupBannerDescription { get; set; } = string.Empty;
    public string PopupBannerCtaText { get; set; } = "Check Offer";
    public string PopupBannerCtaUrl { get; set; } = string.Empty; // e.g. "/pricing" or external URL
    public string PopupBannerTargetAudience { get; set; } = "all"; // all, free_only, expired_only
    public string PopupBannerFrequency { get; set; } = "once_per_day"; // once_per_day, every_open
    public DateTime? PopupBannerExpiresAt { get; set; }

    // 3. Version Control & Force Update
    public int LatestAndroidVersionCode { get; set; } = 1;
    public string LatestAndroidVersionName { get; set; } = "1.0.0";
    public int MinSupportedVersionCode { get; set; } = 1; // If installed version < this -> Force Hard Block
    public bool IsForceUpdateEnabled { get; set; } = false;
    public string UpdateChangelog { get; set; } = "• Performance improvements and bug fixes.\n• Advanced B2B Pharma billing engine.";
    public string ApkDownloadUrl { get; set; } = "https://udyogbill.com/downloads/udyogbill-billing.apk";
    public string PlayStoreUrl { get; set; } = string.Empty;

    // 4. Feature Flags (Remote Toggles)
    public bool IsAiBillScannerEnabled { get; set; } = true;
    public bool IsNearExpiryRadarEnabled { get; set; } = true;
    public bool IsContinuousBarcodePosEnabled { get; set; } = true;
    public bool IsEWayBillExportEnabled { get; set; } = true;
    public bool IsReferralProgramEnabled { get; set; } = true;

    // 5. Maintenance Mode Kill-Switch
    public bool IsMaintenanceModeEnabled { get; set; } = false;
    public string MaintenanceNoticeMessage { get; set; } = "Scheduled maintenance in progress. Offline billing continues to work.";

    // 6. Direct Helpdesk & Support Channels
    public string SupportWhatsAppNumber { get; set; } = "+919876543210";
    public string SupportHelplineNumber { get; set; } = "+911800123456";
    public string SupportEmail { get; set; } = "support@udyogbill.com";
    public string TutorialYouTubePlaylistUrl { get; set; } = string.Empty;
    public string KnowledgebaseDocUrl { get; set; } = "https://udyogbill.com/help";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
