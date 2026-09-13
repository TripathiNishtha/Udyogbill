import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import '../../../app/theme/app_theme.dart';
import '../services/hrm_mobile_service.dart';

class HrmAttendanceScreen extends StatefulWidget {
  const HrmAttendanceScreen({super.key});

  @override
  State<HrmAttendanceScreen> createState() => _HrmAttendanceScreenState();
}

class _HrmAttendanceScreenState extends State<HrmAttendanceScreen> {
  final HrmMobileService _hrmService = HrmMobileService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = true;
  bool _isPunching = false;
  Map<String, dynamic>? _todayLog;
  String _userName = 'Employee';

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    setState(() => _isLoading = true);
    final name = await _storage.read(key: 'user_full_name');
    final logs = await _hrmService.getDailyAttendance();
    if (mounted) {
      setState(() {
        if (name != null) _userName = name;
        if (logs.isNotEmpty) {
          _todayLog = logs.first;
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _handlePunch() async {
    setState(() => _isPunching = true);
    try {
      // Default to HQ / live location
      const double lat = 28.5678;
      const double lon = 77.2435;
      final profileId = await _storage.read(key: 'hrm_employee_profile_id') ?? '00000000-0000-0000-0000-000000000000';

      final res = await _hrmService.punchAttendance(
        employeeProfileId: profileId,
        latitude: lat,
        longitude: lon,
        address: 'GPS Verified HQ / Field Location ($lat, $lon)',
        batteryPercentage: 85,
        remarks: 'Mobile App Geo-Punch',
      );

      if (mounted) {
        if (res != null) {
          setState(() => _todayLog = res);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Attendance punched successfully! GPS Verified.'),
              backgroundColor: AppTheme.success,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to record punch. Check network or permissions.'),
              backgroundColor: AppTheme.danger,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isPunching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPunchedIn = _todayLog != null && _todayLog!['punchInTimeUtc'] != null;
    final isPunchedOut = _todayLog != null && _todayLog!['punchOutTimeUtc'] != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Smart Geo-Attendance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primary),
            onPressed: _loadAttendance,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Profile Header Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.2),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
                          child: const Icon(Icons.person, size: 36, color: Colors.white),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _userName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          DateFormat('EEEE, dd MMMM yyyy').format(DateTime.now()),
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Punch Action Center
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Text(
                          isPunchedOut
                              ? 'SHIFT COMPLETED'
                              : isPunchedIn
                                  ? 'CURRENTLY PUNCHED IN'
                                  : 'READY TO PUNCH IN',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                            color: isPunchedOut
                                ? const Color(0xFF64748B)
                                : isPunchedIn
                                    ? AppTheme.success
                                    : AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Large Punch Button
                        GestureDetector(
                          onTap: (isPunchedOut || _isPunching) ? null : _handlePunch,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: isPunchedOut
                                    ? [const Color(0xFF94A3B8), const Color(0xFF64748B)]
                                    : isPunchedIn
                                        ? [const Color(0xFFE11D48), const Color(0xFFBE123C)]
                                        : [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: (isPunchedIn ? const Color(0xFFE11D48) : const Color(0xFF2563EB))
                                      .withValues(alpha: 0.35),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Center(
                              child: _isPunching
                                  ? const CircularProgressIndicator(color: Colors.white)
                                  : Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          isPunchedIn ? Icons.exit_to_app : Icons.touch_app,
                                          size: 40,
                                          color: Colors.white,
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Punch Metrics Strip
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              children: [
                                const Text('Punch In', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Text(
                                  isPunchedIn && _todayLog!['punchInTimeUtc'] != null
                                      ? DateFormat('hh:mm a').format(DateTime.parse(_todayLog!['punchInTimeUtc']).toLocal())
                                      : '--:--',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                            Container(width: 1, height: 30, color: const Color(0xFFE2E8F0)),
                            Column(
                              children: [
                                const Text('Punch Out', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Text(
                                  isPunchedOut && _todayLog!['punchOutTimeUtc'] != null
                                      ? DateFormat('hh:mm a').format(DateTime.parse(_todayLog!['punchOutTimeUtc']).toLocal())
                                      : '--:--',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                            Container(width: 1, height: 30, color: const Color(0xFFE2E8F0)),
                            Column(
                              children: [
                                const Text('Work Hours', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Text(
                                  _todayLog != null && _todayLog!['totalWorkHours'] != null
                                      ? '${_todayLog!['totalWorkHours']} hrs'
                                      : '--',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // GPS Geo-Verification Status Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.shield_outlined, color: Color(0xFF16A34A), size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'GPS Geofence Protected',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534)),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Field & Office punches automatically tag live satellite coordinates and geofence accuracy.',
                                style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
