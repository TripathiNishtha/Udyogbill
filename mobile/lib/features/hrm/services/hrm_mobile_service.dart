import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

class HrmMobileService {
  final ApiClient _client = ApiClient();

  // Fetch Attendance History or Today's Punch
  Future<List<Map<String, dynamic>>> getDailyAttendance({String? date}) async {
    try {
      final response = await _client.get(
        '/tenant/hrm/attendance/daily',
        queryParameters: {'date': date ?? DateTime.now().toIso8601String().split('T').first},
      );
      if (response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Punch Geo-Attendance
  Future<Map<String, dynamic>?> punchAttendance({
    required String employeeProfileId,
    required double latitude,
    required double longitude,
    String? address,
    int? batteryPercentage,
    String? selfieImageUrl,
    String? remarks,
  }) async {
    try {
      final response = await _client.post(
        '/tenant/hrm/attendance/punch',
        data: {
          'employeeProfileId': employeeProfileId,
          'latitude': latitude,
          'longitude': longitude,
          'address': address,
          'batteryPercentage': batteryPercentage,
          'selfieImageUrl': selfieImageUrl,
          'remarks': remarks,
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        return Map<String, dynamic>.from(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Leave Balances
  Future<List<Map<String, dynamic>>> getLeaveBalances(String employeeProfileId, {int? year}) async {
    try {
      final response = await _client.get(
        '/tenant/hrm/leaves/balances/$employeeProfileId',
        queryParameters: {'year': year ?? DateTime.now().year},
      );
      if (response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Leave Types
  Future<List<Map<String, dynamic>>> getLeaveTypes() async {
    try {
      final response = await _client.get('/tenant/hrm/leaves/types');
      if (response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Apply Leave
  Future<bool> applyLeave({
    required String employeeProfileId,
    required String leaveTypeId,
    required DateTime fromDate,
    required DateTime toDate,
    required bool isHalfDay,
    required String reason,
  }) async {
    try {
      final response = await _client.post(
        '/tenant/hrm/leaves/apply',
        data: {
          'employeeProfileId': employeeProfileId,
          'leaveTypeId': leaveTypeId,
          'fromDate': fromDate.toIso8601String(),
          'toDate': toDate.toIso8601String(),
          'isHalfDay': isHalfDay,
          'reason': reason,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Submit Expense Claim
  Future<bool> submitExpenseClaim({
    required String employeeProfileId,
    required DateTime claimDate,
    required String category,
    required int stationType,
    required double claimedDistanceKm,
    required double claimedAmount,
    required String description,
    String? receiptAttachmentUrl,
  }) async {
    try {
      final response = await _client.post(
        '/tenant/hrm/expenses/claims',
        data: {
          'employeeProfileId': employeeProfileId,
          'claimDate': claimDate.toIso8601String(),
          'category': category,
          'stationType': stationType,
          'claimedDistanceKm': claimedDistanceKm,
          'claimedAmount': claimedAmount,
          'description': description,
          'receiptAttachmentUrl': receiptAttachmentUrl,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Expense Claims List
  Future<List<Map<String, dynamic>>> getExpenseClaims({String? employeeProfileId}) async {
    try {
      final response = await _client.get(
        '/tenant/hrm/expenses/claims',
        queryParameters: employeeProfileId != null ? {'employeeProfileId': employeeProfileId} : null,
      );
      if (response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Payslips
  Future<List<Map<String, dynamic>>> getEmployeePayslips(String cycleId) async {
    try {
      final response = await _client.get('/tenant/hrm/payroll/cycles/$cycleId/payslips');
      if (response.data is List) {
        return List<Map<String, dynamic>>.from(response.data);
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
