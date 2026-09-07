class AppConstants {
  // Base URLs (Switchable for Prod / Local Dev)
  static const String defaultLocalApiUrl = "http://10.0.2.2:5050/api/v1"; // Android Emulator
  static const String physicalDeviceApiUrl = "http://192.168.29.127:5050/api/v1"; // LAN IP
  static const String productionApiUrl = "https://udyogbill.com/api/v1";

  // Storage Keys
  static const String keyToken = "udyogbill_access_token";
  static const String keyRefreshToken = "udyogbill_refresh_token";
  static const String keyTenantId = "udyogbill_tenant_id";
  static const String keyTenantName = "udyogbill_tenant_name";
  static const String keyUserRole = "udyogbill_user_role";
  static const String keyApiUrl = "udyogbill_custom_api_url";
  static const String keyLastSyncTimestamp = "udyogbill_last_sync_timestamp";

  // Indian Business Defaults
  static const String currencySymbol = "₹";
  static const String countryCode = "+91";
}
