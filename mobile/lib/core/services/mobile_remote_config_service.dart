import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';

class MobileRemoteConfig {
  final String appDisplayName;
  final String appTagline;
  final String headerLogoUrl;
  final String splashLogoUrl;
  final String primaryBrandColor;
  final String accentColor;
  final String selectedLauncherIconPreset;

  // In-App Popup Banner
  final bool isPopupBannerEnabled;
  final String popupBannerTitle;
  final String popupBannerImageUrl;
  final String popupBannerDescription;
  final String popupBannerCtaText;
  final String popupBannerCtaUrl;
  final String popupBannerTargetAudience;
  final String popupBannerFrequency;
  final DateTime? popupBannerExpiresAt;

  // Version Control & Force Update
  final int latestAndroidVersionCode;
  final String latestAndroidVersionName;
  final int minSupportedVersionCode;
  final bool isForceUpdateEnabled;
  final String updateChangelog;
  final String apkDownloadUrl;
  final String playStoreUrl;

  // Feature Flags
  final bool isAiBillScannerEnabled;
  final bool isNearExpiryRadarEnabled;
  final bool isContinuousBarcodePosEnabled;
  final bool isEWayBillExportEnabled;
  final bool isReferralProgramEnabled;

  // Maintenance Mode
  final bool isMaintenanceModeEnabled;
  final String maintenanceNoticeMessage;

  // Helpdesk
  final String supportWhatsAppNumber;
  final String supportHelplineNumber;
  final String supportEmail;
  final String tutorialYouTubePlaylistUrl;
  final String knowledgebaseDocUrl;

  const MobileRemoteConfig({
    this.appDisplayName = 'UdyogBill',
    this.appTagline = 'Smart GST Billing & Inventory',
    this.headerLogoUrl = '',
    this.splashLogoUrl = '',
    this.primaryBrandColor = '#4F46E5',
    this.accentColor = '#10B981',
    this.selectedLauncherIconPreset = 'classic_blue',
    this.isPopupBannerEnabled = false,
    this.popupBannerTitle = '',
    this.popupBannerImageUrl = '',
    this.popupBannerDescription = '',
    this.popupBannerCtaText = 'Check Offer',
    this.popupBannerCtaUrl = '',
    this.popupBannerTargetAudience = 'all',
    this.popupBannerFrequency = 'once_per_day',
    this.popupBannerExpiresAt,
    this.latestAndroidVersionCode = 1,
    this.latestAndroidVersionName = '1.0.0',
    this.minSupportedVersionCode = 1,
    this.isForceUpdateEnabled = false,
    this.updateChangelog = '',
    this.apkDownloadUrl = 'https://udyogbill.com/downloads/udyogbill-billing.apk',
    this.playStoreUrl = '',
    this.isAiBillScannerEnabled = true,
    this.isNearExpiryRadarEnabled = true,
    this.isContinuousBarcodePosEnabled = true,
    this.isEWayBillExportEnabled = true,
    this.isReferralProgramEnabled = true,
    this.isMaintenanceModeEnabled = false,
    this.maintenanceNoticeMessage = '',
    this.supportWhatsAppNumber = '919876543210',
    this.supportHelplineNumber = '1800-123-4567',
    this.supportEmail = 'support@udyogbill.com',
    this.tutorialYouTubePlaylistUrl = '',
    this.knowledgebaseDocUrl = 'https://docs.udyogbill.com/mobile-guide',
  });

  Color get primaryColor {
    try {
      final hex = primaryBrandColor.replaceAll('#', '');
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
    } catch (_) {}
    return const Color(0xFF4F46E5);
  }

  Color get accentColorObj {
    try {
      final hex = accentColor.replaceAll('#', '');
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
    } catch (_) {}
    return const Color(0xFF10B981);
  }

  factory MobileRemoteConfig.fromJson(Map<String, dynamic> json) {
    DateTime? expDate;
    if (json['popupBannerExpiresAt'] != null && json['popupBannerExpiresAt'] != '') {
      try {
        expDate = DateTime.parse(json['popupBannerExpiresAt'].toString());
      } catch (_) {}
    }

    return MobileRemoteConfig(
      appDisplayName: json['appDisplayName'] ?? 'UdyogBill',
      appTagline: json['appTagline'] ?? 'Smart GST Billing & Inventory',
      headerLogoUrl: json['headerLogoUrl'] ?? '',
      splashLogoUrl: json['splashLogoUrl'] ?? '',
      primaryBrandColor: json['primaryBrandColor'] ?? '#4F46E5',
      accentColor: json['accentColor'] ?? '#10B981',
      selectedLauncherIconPreset: json['selectedLauncherIconPreset'] ?? 'classic_blue',
      isPopupBannerEnabled: json['isPopupBannerEnabled'] == true,
      popupBannerTitle: json['popupBannerTitle'] ?? '',
      popupBannerImageUrl: json['popupBannerImageUrl'] ?? '',
      popupBannerDescription: json['popupBannerDescription'] ?? '',
      popupBannerCtaText: json['popupBannerCtaText'] ?? 'Check Offer',
      popupBannerCtaUrl: json['popupBannerCtaUrl'] ?? '',
      popupBannerTargetAudience: json['popupBannerTargetAudience'] ?? 'all',
      popupBannerFrequency: json['popupBannerFrequency'] ?? 'once_per_day',
      popupBannerExpiresAt: expDate,
      latestAndroidVersionCode: json['latestAndroidVersionCode'] ?? 1,
      latestAndroidVersionName: json['latestAndroidVersionName'] ?? '1.0.0',
      minSupportedVersionCode: json['minSupportedVersionCode'] ?? 1,
      isForceUpdateEnabled: json['isForceUpdateEnabled'] == true,
      updateChangelog: json['updateChangelog'] ?? '',
      apkDownloadUrl: json['apkDownloadUrl'] ?? 'https://udyogbill.com/downloads/udyogbill-billing.apk',
      playStoreUrl: json['playStoreUrl'] ?? '',
      isAiBillScannerEnabled: json['isAiBillScannerEnabled'] ?? true,
      isNearExpiryRadarEnabled: json['isNearExpiryRadarEnabled'] ?? true,
      isContinuousBarcodePosEnabled: json['isContinuousBarcodePosEnabled'] ?? true,
      isEWayBillExportEnabled: json['isEWayBillExportEnabled'] ?? true,
      isReferralProgramEnabled: json['isReferralProgramEnabled'] ?? true,
      isMaintenanceModeEnabled: json['isMaintenanceModeEnabled'] == true,
      maintenanceNoticeMessage: json['maintenanceNoticeMessage'] ?? '',
      supportWhatsAppNumber: json['supportWhatsAppNumber'] ?? '919876543210',
      supportHelplineNumber: json['supportHelplineNumber'] ?? '1800-123-4567',
      supportEmail: json['supportEmail'] ?? 'support@udyogbill.com',
      tutorialYouTubePlaylistUrl: json['tutorialYouTubePlaylistUrl'] ?? '',
      knowledgebaseDocUrl: json['knowledgebaseDocUrl'] ?? 'https://docs.udyogbill.com/mobile-guide',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'appDisplayName': appDisplayName,
      'appTagline': appTagline,
      'headerLogoUrl': headerLogoUrl,
      'splashLogoUrl': splashLogoUrl,
      'primaryBrandColor': primaryBrandColor,
      'accentColor': accentColor,
      'selectedLauncherIconPreset': selectedLauncherIconPreset,
      'isPopupBannerEnabled': isPopupBannerEnabled,
      'popupBannerTitle': popupBannerTitle,
      'popupBannerImageUrl': popupBannerImageUrl,
      'popupBannerDescription': popupBannerDescription,
      'popupBannerCtaText': popupBannerCtaText,
      'popupBannerCtaUrl': popupBannerCtaUrl,
      'popupBannerTargetAudience': popupBannerTargetAudience,
      'popupBannerFrequency': popupBannerFrequency,
      'popupBannerExpiresAt': popupBannerExpiresAt?.toIso8601String(),
      'latestAndroidVersionCode': latestAndroidVersionCode,
      'latestAndroidVersionName': latestAndroidVersionName,
      'minSupportedVersionCode': minSupportedVersionCode,
      'isForceUpdateEnabled': isForceUpdateEnabled,
      'updateChangelog': updateChangelog,
      'apkDownloadUrl': apkDownloadUrl,
      'playStoreUrl': playStoreUrl,
      'isAiBillScannerEnabled': isAiBillScannerEnabled,
      'isNearExpiryRadarEnabled': isNearExpiryRadarEnabled,
      'isContinuousBarcodePosEnabled': isContinuousBarcodePosEnabled,
      'isEWayBillExportEnabled': isEWayBillExportEnabled,
      'isReferralProgramEnabled': isReferralProgramEnabled,
      'isMaintenanceModeEnabled': isMaintenanceModeEnabled,
      'maintenanceNoticeMessage': maintenanceNoticeMessage,
      'supportWhatsAppNumber': supportWhatsAppNumber,
      'supportHelplineNumber': supportHelplineNumber,
      'supportEmail': supportEmail,
      'tutorialYouTubePlaylistUrl': tutorialYouTubePlaylistUrl,
      'knowledgebaseDocUrl': knowledgebaseDocUrl,
    };
  }
}

class MobileRemoteConfigService {
  static final MobileRemoteConfigService _instance = MobileRemoteConfigService._internal();
  factory MobileRemoteConfigService() => _instance;
  MobileRemoteConfigService._internal();

  static const String _keyCachedConfig = 'udyogbill_remote_config_cache';
  static const String _keyBannerLastShown = 'udyogbill_banner_last_shown_date';
  static const String _keyBannerShownEver = 'udyogbill_banner_shown_ever';
  static const String _keyDeviceId = 'udyogbill_device_telemetry_id';

  MobileRemoteConfig _config = const MobileRemoteConfig();
  MobileRemoteConfig get config => _config;

  final ApiClient _api = ApiClient();

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(_keyCachedConfig);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final map = jsonDecode(cachedStr) as Map<String, dynamic>;
        _config = MobileRemoteConfig.fromJson(map);
      }
    } catch (_) {}

    // Fetch latest fresh config in background
    fetchRemoteConfig();
    // Pings telemetry in background
    registerDeviceTelemetry();
  }

  Future<MobileRemoteConfig?> fetchRemoteConfig() async {
    try {
      final res = await _api.get('/public/mobile-app/config');
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data.toString());
        _config = MobileRemoteConfig.fromJson(data);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_keyCachedConfig, jsonEncode(_config.toJson()));
        return _config;
      }
    } catch (_) {
      // Offline fallback: retains cached _config
    }
    return null;
  }

  Future<void> registerDeviceTelemetry() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      var deviceId = prefs.getString(_keyDeviceId);
      if (deviceId == null || deviceId.isEmpty) {
        deviceId = const Uuid().v4();
        await prefs.setString(_keyDeviceId, deviceId);
      }

      String deviceModel = 'Android Device';
      String osVersion = 'Android';
      try {
        deviceModel = Platform.operatingSystem;
        osVersion = '${Platform.operatingSystem} ${Platform.version.split(" ").first}';
      } catch (_) {}

      await _api.post(
        '/public/mobile-app/devices/register',
        data: {
          'deviceId': deviceId,
          'deviceModel': deviceModel,
          'osVersion': osVersion,
          'appVersionCode': 1,
          'appVersionName': '1.0.0',
        },
      );
    } catch (_) {
      // Graceful offline failure
    }
  }

  Future<bool> shouldShowPopupBanner() async {
    if (!_config.isPopupBannerEnabled) return false;
    if (_config.popupBannerTitle.isEmpty && _config.popupBannerImageUrl.isEmpty) return false;

    // Check expiry
    if (_config.popupBannerExpiresAt != null &&
        DateTime.now().isAfter(_config.popupBannerExpiresAt!)) {
      return false;
    }

    final prefs = await SharedPreferences.getInstance();
    final freq = _config.popupBannerFrequency;

    if (freq == 'once_ever') {
      final shown = prefs.getBool(_keyBannerShownEver) ?? false;
      return !shown;
    } else if (freq == 'once_per_day') {
      final lastDate = prefs.getString(_keyBannerLastShown);
      final todayStr = DateTime.now().toIso8601String().substring(0, 10);
      return lastDate != todayStr;
    }

    // 'every_open'
    return true;
  }

  Future<void> markPopupBannerShown() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final todayStr = DateTime.now().toIso8601String().substring(0, 10);
      await prefs.setString(_keyBannerLastShown, todayStr);
      await prefs.setBool(_keyBannerShownEver, true);
    } catch (_) {}
  }

  bool isForceUpdateRequired({int currentVersionCode = 1}) {
    if (!_config.isForceUpdateEnabled) return false;
    return currentVersionCode < _config.minSupportedVersionCode;
  }
}
