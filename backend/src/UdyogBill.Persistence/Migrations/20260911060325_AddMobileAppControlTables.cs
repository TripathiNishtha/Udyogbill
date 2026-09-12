using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileAppControlTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MobileAppConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AppDisplayName = table.Column<string>(type: "text", nullable: false),
                    AppTagline = table.Column<string>(type: "text", nullable: false),
                    HeaderLogoUrl = table.Column<string>(type: "text", nullable: false),
                    SplashLogoUrl = table.Column<string>(type: "text", nullable: false),
                    PrimaryBrandColor = table.Column<string>(type: "text", nullable: false),
                    AccentColor = table.Column<string>(type: "text", nullable: false),
                    SelectedLauncherIconPreset = table.Column<string>(type: "text", nullable: false),
                    IsPopupBannerEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    PopupBannerTitle = table.Column<string>(type: "text", nullable: false),
                    PopupBannerImageUrl = table.Column<string>(type: "text", nullable: false),
                    PopupBannerDescription = table.Column<string>(type: "text", nullable: false),
                    PopupBannerCtaText = table.Column<string>(type: "text", nullable: false),
                    PopupBannerCtaUrl = table.Column<string>(type: "text", nullable: false),
                    PopupBannerTargetAudience = table.Column<string>(type: "text", nullable: false),
                    PopupBannerFrequency = table.Column<string>(type: "text", nullable: false),
                    PopupBannerExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LatestAndroidVersionCode = table.Column<int>(type: "integer", nullable: false),
                    LatestAndroidVersionName = table.Column<string>(type: "text", nullable: false),
                    MinSupportedVersionCode = table.Column<int>(type: "integer", nullable: false),
                    IsForceUpdateEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    UpdateChangelog = table.Column<string>(type: "text", nullable: false),
                    ApkDownloadUrl = table.Column<string>(type: "text", nullable: false),
                    PlayStoreUrl = table.Column<string>(type: "text", nullable: false),
                    IsAiBillScannerEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsNearExpiryRadarEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsContinuousBarcodePosEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsEWayBillExportEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsReferralProgramEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsMaintenanceModeEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MaintenanceNoticeMessage = table.Column<string>(type: "text", nullable: false),
                    SupportWhatsAppNumber = table.Column<string>(type: "text", nullable: false),
                    SupportHelplineNumber = table.Column<string>(type: "text", nullable: false),
                    SupportEmail = table.Column<string>(type: "text", nullable: false),
                    TutorialYouTubePlaylistUrl = table.Column<string>(type: "text", nullable: false),
                    KnowledgebaseDocUrl = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobileAppConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MobileDeviceRegistrations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<string>(type: "text", nullable: false),
                    TenantId = table.Column<string>(type: "text", nullable: true),
                    PushToken = table.Column<string>(type: "text", nullable: true),
                    DeviceModel = table.Column<string>(type: "text", nullable: false),
                    OsVersion = table.Column<string>(type: "text", nullable: false),
                    AppVersionCode = table.Column<int>(type: "integer", nullable: false),
                    AppVersionName = table.Column<string>(type: "text", nullable: false),
                    RegisteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobileDeviceRegistrations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MobilePushBroadcasts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    ActionRoute = table.Column<string>(type: "text", nullable: true),
                    TargetSegment = table.Column<string>(type: "text", nullable: false),
                    DeliveredCount = table.Column<int>(type: "integer", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SentBySuperAdmin = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MobilePushBroadcasts", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MobileAppConfigs");

            migrationBuilder.DropTable(
                name: "MobileDeviceRegistrations");

            migrationBuilder.DropTable(
                name: "MobilePushBroadcasts");
        }
    }
}
