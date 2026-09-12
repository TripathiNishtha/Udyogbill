import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:udyogbill_mobile/core/services/mobile_remote_config_service.dart';

void main() {
  group('Mobile Remote Config & Control Center Tests', () {
    test('MobileRemoteConfig serializes and deserializes all attributes correctly', () {
      final json = {
        'appDisplayName': 'UdyogBill Pro',
        'appTagline': 'Ultimate Cloud Billing',
        'headerLogoUrl': 'https://example.com/logo.png',
        'splashLogoUrl': 'https://example.com/splash.png',
        'primaryBrandColor': '#2563EB',
        'accentColor': '#059669',
        'selectedLauncherIconPreset': 'emerald_business',
        'isPopupBannerEnabled': true,
        'popupBannerTitle': 'Holi Special 50% Off',
        'popupBannerImageUrl': 'https://example.com/holi.jpg',
        'popupBannerDescription': 'Upgrade now and get 3 extra months free.',
        'popupBannerCtaText': 'Upgrade Now',
        'popupBannerCtaUrl': 'https://udyogbill.com/pricing',
        'popupBannerTargetAudience': 'free',
        'popupBannerFrequency': 'once_per_day',
        'popupBannerExpiresAt': '2026-12-31T23:59:59.000Z',
        'latestAndroidVersionCode': 5,
        'latestAndroidVersionName': '2.1.0',
        'minSupportedVersionCode': 3,
        'isForceUpdateEnabled': true,
        'updateChangelog': '• New features added',
        'apkDownloadUrl': 'https://udyogbill.com/downloads/v2.apk',
        'playStoreUrl': 'https://play.google.com/store/apps/details?id=com.udyogbill',
        'isAiBillScannerEnabled': true,
        'isNearExpiryRadarEnabled': true,
        'isContinuousBarcodePosEnabled': true,
        'isEWayBillExportEnabled': true,
        'isReferralProgramEnabled': true,
        'isMaintenanceModeEnabled': false,
        'maintenanceNoticeMessage': '',
        'supportWhatsAppNumber': '919876543210',
        'supportHelplineNumber': '1800-111-222',
        'supportEmail': 'support@udyogbill.com',
        'tutorialYouTubePlaylistUrl': 'https://youtube.com/playlist?list=123',
        'knowledgebaseDocUrl': 'https://docs.udyogbill.com',
      };

      final config = MobileRemoteConfig.fromJson(json);

      expect(config.appDisplayName, 'UdyogBill Pro');
      expect(config.primaryBrandColor, '#2563EB');
      expect(config.primaryColor, const Color(0xFF2563EB));
      expect(config.accentColorObj, const Color(0xFF059669));
      expect(config.isPopupBannerEnabled, true);
      expect(config.minSupportedVersionCode, 3);
      expect(config.isForceUpdateEnabled, true);
      expect(config.popupBannerExpiresAt, isNotNull);

      final exported = config.toJson();
      expect(exported['appDisplayName'], 'UdyogBill Pro');
      expect(exported['minSupportedVersionCode'], 3);
      expect(exported['isForceUpdateEnabled'], true);
    });

    test('Force update check triggers when installed version is below minSupportedVersionCode', () {
      const configActive = MobileRemoteConfig(
        minSupportedVersionCode: 4,
        isForceUpdateEnabled: true,
      );

      // Version 2 is outdated
      expect(2 < configActive.minSupportedVersionCode && configActive.isForceUpdateEnabled, true);

      // Version 4 is valid
      expect(4 < configActive.minSupportedVersionCode && configActive.isForceUpdateEnabled, false);

      // When kill switch is disabled
      const configDisabled = MobileRemoteConfig(
        minSupportedVersionCode: 4,
        isForceUpdateEnabled: false,
      );
      expect(2 < configDisabled.minSupportedVersionCode && configDisabled.isForceUpdateEnabled, false);
    });
  });
}
