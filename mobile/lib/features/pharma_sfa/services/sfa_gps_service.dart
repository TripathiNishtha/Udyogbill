import 'dart:math';

class GeofenceCheckResult {
  final bool isVerified;
  final double distanceMeters;
  final String statusMessage;

  GeofenceCheckResult({
    required this.isVerified,
    required this.distanceMeters,
    required this.statusMessage,
  });
}

class SfaGpsService {
  /// Calculates distance in meters between two GPS coordinates using Haversine formula
  static double calculateDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const double earthRadiusMeters = 6371000.0; // WGS-84 earth radius

    final double dLat = _degToRad(lat2 - lat1);
    final double dLon = _degToRad(lon2 - lon1);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degToRad(lat1)) * cos(_degToRad(lat2)) * sin(dLon / 2) * sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return earthRadiusMeters * c;
  }

  static double _degToRad(double deg) => deg * (pi / 180.0);

  /// Validates whether the MR is physically present within the allowed clinic radius (default: 200m)
  static GeofenceCheckResult verifyCheckIn({
    required double currentLat,
    required double currentLon,
    required double? targetLat,
    required double? targetLon,
    double allowedRadiusMeters = 200.0,
  }) {
    if (targetLat == null || targetLon == null || targetLat == 0.0 || targetLon == 0.0) {
      // Clinic coordinates not yet mapped by admin
      return GeofenceCheckResult(
        isVerified: true,
        distanceMeters: 0.0,
        statusMessage: 'Clinic GPS coordinates not configured (Unrestricted Call)',
      );
    }

    final double distance = calculateDistanceMeters(
      currentLat,
      currentLon,
      targetLat,
      targetLon,
    );

    final bool verified = distance <= allowedRadiusMeters;

    return GeofenceCheckResult(
      isVerified: verified,
      distanceMeters: distance,
      statusMessage: verified
          ? 'GPS Verified (${distance.toStringAsFixed(1)}m from clinic)'
          : 'Deviation Alert: ${distance.toStringAsFixed(0)}m away (Max allowed: ${allowedRadiusMeters.toStringAsFixed(0)}m)',
    );
  }
}
