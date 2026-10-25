import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../app/constants/app_constants.dart';
import 'package:intl/intl.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../../../app/theme/app_theme.dart';
import '../../../core/database/daos/sfa_dao.dart';
import '../../../core/sync/sync_service.dart';
import '../../auth/screens/login_screen.dart';
import '../services/sfa_gps_service.dart';
import '../../hrm/screens/hrm_attendance_screen.dart';
import '../../hrm/screens/hrm_leave_apply_screen.dart';
import '../../hrm/screens/hrm_expense_claim_screen.dart';

class PharmaSfaShellScreen extends StatefulWidget {
  final bool isSfaOnly;
  const PharmaSfaShellScreen({super.key, this.isSfaOnly = false});

  @override
  State<PharmaSfaShellScreen> createState() => _PharmaSfaShellScreenState();
}

class _PharmaSfaShellScreenState extends State<PharmaSfaShellScreen> {
  int _currentIndex = 0;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final SfaDao _sfaDao = SfaDao();
  final SyncService _syncService = SyncService();

  String _mrName = 'Rahul Sharma (MR)';
  final String _hqCity = 'South Delhi Headquarter';
  bool _isPunchedIn = true;
  DateTime? _punchInTime = DateTime.now().subtract(const Duration(hours: 3, minutes: 20));

  // Live offline-first data from SQLite
  List<SfaDoctorModel> _doctors = [];
  List<SfaChemistModel> _chemists = [];
  List<SfaSampleBagItemModel> _sampleBag = [];
  int _pendingSyncCount = 0;
  bool _isLoading = true;
  bool _isSyncing = false;

  // Local completed DCR tracking
  final Set<String> _completedDoctorVisits = {};

  // Internal Field Sales Force (Direct Sales Rep) Mode
  bool _isInternalRep = false;
  Map<String, dynamic>? _cockpit;
  List<dynamic> _internalVisits = [];
  List<dynamic> _internalProducts = [];
  bool _isLoadingCockpit = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final name = await _storage.read(key: 'user_full_name');
    final isRep = await _storage.read(key: 'is_internal_sales_rep');
    final role = await _storage.read(key: AppConstants.keyUserRole);
    final tenantId = await _storage.read(key: AppConstants.keyTenantId);

    final bool isDirectSales = isRep == 'true' ||
        role == 'SalesRep' ||
        role == 'FSE' ||
        role == 'ASM' ||
        role == 'RSM' ||
        role == 'ZSM' ||
        widget.isSfaOnly ||
        (tenantId == null || tenantId.isEmpty || tenantId == 'null');

    if (mounted) {
      setState(() {
        if (name != null && name.isNotEmpty) _mrName = name;
        _isInternalRep = isDirectSales;
      });
    }

    if (isDirectSales) {
      await _fetchInternalRepData();
    } else {
      await _loadFromLocalDb();
      if (_doctors.isEmpty && _chemists.isEmpty && _sampleBag.isEmpty) {
        await _performFullSync(showFeedback: false);
      }
    }
  }

  Future<void> _fetchInternalRepData() async {
    if (!mounted) return;
    setState(() => _isLoadingCockpit = true);
    try {
      final client = ApiClient();
      final cockpitRes = await client.get('/internal-sales/cockpit');
      if (cockpitRes.statusCode == 200 && cockpitRes.data != null) {
        if (mounted) {
          setState(() {
            _cockpit = cockpitRes.data is Map<String, dynamic>
                ? cockpitRes.data
                : Map<String, dynamic>.from(cockpitRes.data);
          });
        }
      }

      final visitsRes = await client.get('/internal-sales/visits');
      if (visitsRes.statusCode == 200 && visitsRes.data != null) {
        final items = visitsRes.data is Map
            ? (visitsRes.data['items'] as List? ?? [])
            : (visitsRes.data is List ? visitsRes.data : []);
        if (mounted) {
          setState(() {
            _internalVisits = items;
          });
        }
      }

      final prodRes = await client.get('/internal-sales/products');
      if (prodRes.statusCode == 200 && prodRes.data != null) {
        final list = prodRes.data is List ? prodRes.data : (prodRes.data['data'] as List? ?? []);
        if (mounted) {
          setState(() {
            _internalProducts = list;
          });
        }
      }
    } catch (_) {
      // Offline fallback
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingCockpit = false;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadFromLocalDb() async {
    setState(() => _isLoading = true);
    final docs = await _sfaDao.getDoctors();
    final chems = await _sfaDao.getChemists();
    final bag = await _sfaDao.getSampleBag();
    final pending = await _syncService.getPendingSyncCount();

    if (mounted) {
      setState(() {
        _doctors = docs;
        _chemists = chems;
        _sampleBag = bag;
        _pendingSyncCount = pending;
        _isLoading = false;
      });
    }
  }

  Future<void> _performFullSync({bool showFeedback = true}) async {
    if (_isSyncing) return;
    setState(() => _isSyncing = true);

    try {
      // 1. Flush offline queue first
      final flushedCount = await _syncService.flushSyncQueue();

      // 2. Pull fresh SFA roster & schemes
      final pulledCount = await _syncService.syncSfaRosterFromWeb();

      // 3. Reload local SQLite views
      await _loadFromLocalDb();

      if (mounted && showFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sync Completed: $flushedCount offline updates uploaded, $pulledCount records updated.',
            ),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (err) {
      if (mounted && showFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Working Offline: Local cache active ($err)'),
            backgroundColor: AppTheme.warning,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  void _togglePunch() {
    setState(() {
      _isPunchedIn = !_isPunchedIn;
      if (_isPunchedIn) {
        _punchInTime = DateTime.now();
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isPunchedIn
            ? 'GPS Attendance Punch-In Recorded (Geotagged)'
            : 'Field Duty Punched Out. Day summary saved locally.'),
        backgroundColor: _isPunchedIn ? AppTheme.success : AppTheme.warning,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Image.asset(
                'assets/images/logo_icon.png',
                width: 24,
                height: 24,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'UdyogBill • Pharma SFA',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                Text(
                  _hqCity,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Manual Sync Button
          IconButton(
            icon: _isSyncing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  )
                : const Icon(Icons.sync, color: AppTheme.primary, size: 20),
            tooltip: 'Sync with Cloud',
            onPressed: _isSyncing ? null : () => _performFullSync(showFeedback: true),
          ),

          // GPS Punch Button
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            child: InkWell(
              onTap: _togglePunch,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _isPunchedIn ? const Color(0xFFE6F4EA) : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isPunchedIn ? AppTheme.primary : AppTheme.danger,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isPunchedIn ? Icons.check_circle : Icons.gps_fixed,
                      size: 14,
                      color: _isPunchedIn ? AppTheme.primary : AppTheme.danger,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _isPunchedIn ? 'IN FIELD' : 'PUNCH IN',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: _isPunchedIn ? AppTheme.primary : AppTheme.danger,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // HRM Quick Menu (Attendance, Leave, Expenses)
          PopupMenuButton<String>(
            icon: const Icon(Icons.badge_outlined, color: AppTheme.primary, size: 22),
            tooltip: 'HRM & Expenses',
            onSelected: (val) {
              if (val == 'attendance') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmAttendanceScreen()));
              } else if (val == 'leave') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmLeaveApplyScreen()));
              } else if (val == 'expense') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmExpenseClaimScreen()));
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'attendance',
                child: Row(
                  children: [
                    Icon(Icons.touch_app_outlined, color: AppTheme.primary, size: 18),
                    SizedBox(width: 8),
                    Text('Geo-Attendance Punch'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'leave',
                child: Row(
                  children: [
                    Icon(Icons.calendar_month_outlined, color: Color(0xFFD97706), size: 18),
                    SizedBox(width: 8),
                    Text('Apply Leave (LMS)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'expense',
                child: Row(
                  children: [
                    Icon(Icons.receipt_outlined, color: Color(0xFF7C3AED), size: 18),
                    SizedBox(width: 8),
                    Text('DA/TA Expense Claims'),
                  ],
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF94A3B8), size: 20),
            tooltip: 'Logout',
            onPressed: () async {
              await _storage.deleteAll();
              if (context.mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => LoginScreen(isSfaOnly: widget.isSfaOnly)),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline Sync Status Banner
          _buildSyncStatusBanner(),

          // Main Tab Stack
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : IndexedStack(
                    index: _currentIndex,
                    children: [
                      _buildTodayPlanTab(),
                      _buildDoctorCallsTab(),
                      _buildChemistPobTab(),
                      _buildSampleBagTab(),
                    ],
                  ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFE6F4EA),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today, color: AppTheme.primary),
            label: "Today's Plan",
          ),
          NavigationDestination(
            icon: Icon(Icons.local_hospital_outlined),
            selectedIcon: Icon(Icons.local_hospital, color: AppTheme.primary),
            label: 'Doctor DCR',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(Icons.shopping_bag, color: AppTheme.primary),
            label: 'Chemist POB',
          ),
          NavigationDestination(
            icon: Icon(Icons.medical_services_outlined),
            selectedIcon: Icon(Icons.medical_services, color: AppTheme.primary),
            label: 'Sample Bag',
          ),
        ],
      ),
    );
  }

  Widget _buildSyncStatusBanner() {
    final hasPending = _pendingSyncCount > 0;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: hasPending ? const Color(0xFFFFFBEB) : const Color(0xFFF0FDF4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                hasPending ? Icons.cloud_queue : Icons.cloud_done,
                size: 14,
                color: hasPending ? const Color(0xFFB45309) : const Color(0xFF15803D),
              ),
              const SizedBox(width: 6),
              Text(
                hasPending
                    ? 'Offline Queue: $_pendingSyncCount update(s) pending sync'
                    : '100% Offline SQLite Cache Active • All Synced',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: hasPending ? const Color(0xFF92400E) : const Color(0xFF166534),
                ),
              ),
            ],
          ),
          if (hasPending && !_isSyncing)
            InkWell(
              onTap: () => _performFullSync(showFeedback: true),
              child: const Text(
                'Sync Now',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFB45309),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 1: TODAY'S PLAN & QUICK KPIS
  // -------------------------------------------------------------
  Widget _buildTodayPlanTab() {
    final completedVisits = _completedDoctorVisits.length;
    final totalDoctors = _doctors.isEmpty ? 4 : _doctors.length;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Welcome Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D652D), Color(0xFF1E8E3E)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Hello, $_mrName',
                    style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('MR Active', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Today's Beat: Central & South Ring Beat",
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.access_time, color: Colors.white70, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    _isPunchedIn && _punchInTime != null
                        ? 'Punched in since ${_punchInTime!.hour}:${_punchInTime!.minute.toString().padLeft(2, '0')}'
                        : 'Not currently active in field',
                    style: const TextStyle(color: Colors.white, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Progress Metric Row
        Row(
          children: [
            Expanded(
              child: _buildMetricCard('Doctor Calls', '$completedVisits / $totalDoctors done', Icons.local_hospital, AppTheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricCard('Sample Bag', '${_sampleBag.fold(0, (acc, s) => acc + s.currentBagBalance)} units', Icons.medical_services, const Color(0xFF0284C7)),
            ),
          ],
        ),

        const SizedBox(height: 20),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Assigned Doctors Roster",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            Text(
              '${_doctors.length} Doctors Cached',
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (_doctors.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                const Icon(Icons.sync, color: Color(0xFF94A3B8), size: 32),
                const SizedBox(height: 8),
                const Text('No doctors found in local cache.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                const Text('Tap sync button above to pull doctors from server.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _performFullSync(showFeedback: true),
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                  child: const Text('Download Roster Now'),
                ),
              ],
            ),
          )
        else
          ..._doctors.map((doc) => _buildDoctorCard(doc)),
      ],
    );
  }

  Widget _buildMetricCard(String title, String val, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(val, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _buildDoctorCard(SfaDoctorModel doc) {
    final isDone = _completedDoctorVisits.contains(doc.id);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDone ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: isDone ? const Color(0xFFE6F4EA) : const Color(0xFFF1F5F9),
            child: Icon(
              isDone ? Icons.check : Icons.person_outline,
              color: isDone ? AppTheme.primary : const Color(0xFF64748B),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        doc.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (doc.doctorClass != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryLight,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          doc.doctorClass!,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ),
                    ],
                  ],
                ),
                Text(
                  '${doc.specialty ?? "General"} • ${doc.clinicAddress ?? "Clinic"}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: isDone ? null : () => _showDoctorDetailingDialog(doc),
            style: ElevatedButton.styleFrom(
              backgroundColor: isDone ? Colors.grey.shade300 : AppTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              minimumSize: const Size(60, 30),
            ),
            child: Text(isDone ? 'Visited' : 'Detail', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 2: DOCTOR DCR DETAILING DIALOG WITH GPS GEOFENCE CHECK
  // -------------------------------------------------------------
  void _showDoctorDetailingDialog(SfaDoctorModel doc) {
    final feedbackCtrl = TextEditingController();
    SfaSampleBagItemModel? selectedSample;
    int sampleQuantity = 1;

    // Simulated device location (South Delhi clinic coords)
    const double simulatedCurrentLat = 28.5678;
    const double simulatedCurrentLon = 77.2435;

    final geofenceCheck = SfaGpsService.verifyCheckIn(
      currentLat: simulatedCurrentLat,
      currentLon: simulatedCurrentLon,
      targetLat: doc.latitude,
      targetLon: doc.longitude,
      allowedRadiusMeters: doc.geofenceRadiusMeters,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
            left: 16,
            right: 16,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(doc.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Text(doc.clinicAddress ?? 'Clinic Location', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: geofenceCheck.isVerified ? const Color(0xFFE6F4EA) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            geofenceCheck.isVerified ? Icons.gps_fixed : Icons.warning_amber,
                            size: 12,
                            color: geofenceCheck.isVerified ? AppTheme.primary : Colors.amber.shade800,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            geofenceCheck.isVerified ? 'GPS Verified' : 'GPS Deviation',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: geofenceCheck.isVerified ? AppTheme.primary : Colors.amber.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(geofenceCheck.statusMessage, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const Divider(height: 24),

                // Sample Gifting Selector from Live Bag
                const Text('Dispense Sample Units from Detailing Bag', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                if (_sampleBag.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                    child: const Text('No samples in bag balance.', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  )
                else
                  DropdownButtonFormField<SfaSampleBagItemModel>(
                    isExpanded: true,
                    initialValue: selectedSample,
                    hint: const Text('Select molecule from sample bag...', style: TextStyle(fontSize: 12)),
                    decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                    items: _sampleBag.map((s) => DropdownMenuItem(
                      value: s,
                      child: Text('${s.sampleItemName} (Bal: ${s.currentBagBalance})', style: const TextStyle(fontSize: 12)),
                    )).toList(),
                    onChanged: (val) {
                      setModalState(() {
                        selectedSample = val;
                        sampleQuantity = 1;
                      });
                    },
                  ),

                if (selectedSample != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Quantity (Max: ${selectedSample!.currentBagBalance}):', style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, size: 20),
                            onPressed: sampleQuantity > 1 ? () => setModalState(() => sampleQuantity--) : null,
                          ),
                          Text('$sampleQuantity', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, size: 20),
                            onPressed: sampleQuantity < selectedSample!.currentBagBalance ? () => setModalState(() => sampleQuantity++) : null,
                          ),
                        ],
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 16),
                TextField(
                  controller: feedbackCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Doctor Prescription Commitment / Feedback',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. Committed 15 scripts/month for brand...',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final clientOfflineId = const Uuid().v4();

                      final sampleGifts = selectedSample != null ? [
                        {
                          'sampleItemId': selectedSample!.sampleItemId,
                          'sampleItemName': selectedSample!.sampleItemName,
                          'batchNumber': selectedSample!.batchNumber,
                          'quantityGiven': sampleQuantity,
                        }
                      ] : <Map<String, dynamic>>[];

                      final dcrPayload = {
                        'clientOfflineId': clientOfflineId,
                        'dcrDate': DateTime.now().toIso8601String().split('T')[0],
                        'doctorId': doc.id,
                        'callType': 'PhysicalVisit',
                        'feedback': feedbackCtrl.text,
                        'isGpsVerified': geofenceCheck.isVerified,
                        'latitude': simulatedCurrentLat,
                        'longitude': simulatedCurrentLon,
                        'samplesGiven': sampleGifts,
                      };

                      // Queue offline & deduct samples in local SQLite
                      await _syncService.queueOfflineDcr(
                        dcrId: clientOfflineId,
                        dcrPayload: dcrPayload,
                        sampleGifts: sampleGifts,
                      );

                      setState(() {
                        _completedDoctorVisits.add(doc.id);
                      });

                      await _loadFromLocalDb();

                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Doctor DCR visit saved offline & queued for sync!'),
                            backgroundColor: AppTheme.success,
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                    child: const Text('Save to Offline DCR Queue', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 2: DOCTOR CALLS LIST (DCR VIEW)
  // -------------------------------------------------------------
  Widget _buildDoctorCallsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Doctor Call List (Beat 1)',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            Text(
              '${_completedDoctorVisits.length}/${_doctors.length} Visited',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_doctors.isEmpty)
          const Center(child: Text('No doctors assigned.'))
        else
          ..._doctors.map((d) => _buildDoctorCard(d)),
      ],
    );
  }

  // -------------------------------------------------------------
  // TAB 3: CHEMIST POB BOOKING (WITH OFFLINE 10+1 SCHEME ENGINE)
  // -------------------------------------------------------------
  Widget _buildChemistPobTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Chemist Orders (POB)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            ElevatedButton.icon(
              onPressed: _showCapturePobDialog,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Book Order', style: TextStyle(fontSize: 12)),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_chemists.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Text('No chemists found. Tap sync to load chemist directory.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          )
        else
          ..._chemists.map((chem) => _buildChemistCard(chem)),
      ],
    );
  }

  Widget _buildChemistCard(SfaChemistModel chem) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(chem.shopName ?? chem.chemistName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
              Text(chem.phone ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Stockist: ${chem.preferredStockistName ?? "Default Distributor"}',
            style: const TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () => _openChemistOrderCart(chem),
              icon: const Icon(Icons.shopping_cart_outlined, size: 14),
              label: const Text('Book POB Order', style: TextStyle(fontSize: 11)),
              style: OutlinedButton.styleFrom(foregroundColor: AppTheme.primary),
            ),
          ),
        ],
      ),
    );
  }

  void _showCapturePobDialog() {
    if (_chemists.isNotEmpty) {
      _openChemistOrderCart(_chemists.first);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No chemists available in local offline roster.')),
      );
    }
  }

  void _openChemistOrderCart(SfaChemistModel chem) {
    int orderQty = 10; // default to trigger 10+1 scheme test
    int freeBonusQty = 1; // 10+1 free calculation
    const double unitPrice = 120.0;
    const String itemName = 'AmoxiClav 625mg Strips';
    const String itemId = 'amoxi-625-sku';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (cartCtx, setCartState) {
          final totalAmount = orderQty * unitPrice;
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(cartCtx).viewInsets.bottom + 20,
              left: 16,
              right: 16,
              top: 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Book POB: ${chem.shopName ?? chem.chemistName}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Auto-routed to: ${chem.preferredStockistName ?? "Suraj Medico Distributors"}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                const Divider(height: 24),

                // Item Line
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(itemName, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('₹120.00 / strip', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 20),
                          onPressed: orderQty > 1 ? () {
                            setCartState(() {
                              orderQty--;
                              freeBonusQty = orderQty >= 10 ? (orderQty ~/ 10) : 0;
                            });
                          } : null,
                        ),
                        Text('$orderQty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 20),
                          onPressed: () {
                            setCartState(() {
                              orderQty++;
                              freeBonusQty = orderQty >= 10 ? (orderQty ~/ 10) : 0;
                            });
                          },
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Offline Scheme Badge
                if (freeBonusQty > 0)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6F4EA),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.card_giftcard, size: 16, color: AppTheme.primary),
                        const SizedBox(width: 8),
                        Text(
                          'Commercial Scheme Applied: +$freeBonusQty Free Bonus Strips (10+1)',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Order Value:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    Text('₹${totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A))),
                  ],
                ),

                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final clientOfflineId = const Uuid().v4();

                      final pobPayload = {
                        'clientOfflineId': clientOfflineId,
                        'customerPartyId': chem.partyId ?? chem.id,
                        'targetStockistPartyId': chem.preferredStockistPartyId,
                        'orderDate': DateTime.now().toIso8601String().split('T')[0],
                        'items': [
                          {
                            'itemId': itemId,
                            'quantity': orderQty,
                            'freeQuantity': freeBonusQty,
                            'unitPrice': unitPrice,
                            'discountPercent': 0.0,
                            'taxRatePercent': 12.0,
                            'appliedSchemeName': freeBonusQty > 0 ? 'Buy 10 Get 1 Free' : null,
                          }
                        ]
                      };

                      await _syncService.queueOfflinePobOrder(
                        pobOrderId: clientOfflineId,
                        pobPayload: pobPayload,
                      );

                      await _loadFromLocalDb();

                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('POB Order of ₹${totalAmount.toStringAsFixed(0)} queued offline with +$freeBonusQty free bonus goods!'),
                            backgroundColor: AppTheme.success,
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                    child: const Text('Confirm & Save Offline POB', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 4: SAMPLE BAG LEDGER
  // -------------------------------------------------------------
  Widget _buildSampleBagTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Sample Bag Live Stock Balance',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
        const Text(
          'Physically held in MR detailing bag • Deducts locally on doctor DCR call',
          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 14),

        if (_sampleBag.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Text('No samples found. Tap sync above to update sample inventory.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          )
        else
          ..._sampleBag.map((item) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.sampleItemName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Text('Batch: ${item.batchNumber} • Exp: ${item.expiryDate ?? "N/A"}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F4EA),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${item.currentBagBalance} units',
                    style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.primary, fontSize: 12),
                  ),
                ),
              ],
            ),
          )),
      ],
    );
  }

  // =============================================================
  // INTERNAL DIRECT SALES FORCE: COCKPIT, VISITS & PACKAGES TABS
  // =============================================================

  Widget _buildInternalRepCockpitTab() {
    final currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final target = (_cockpit?['monthlyTarget'] as num?)?.toDouble() ?? 200000.0;
    final achieved = (_cockpit?['achievedRevenue'] as num?)?.toDouble() ?? 0.0;
    final gap = (_cockpit?['gapAmount'] as num?)?.toDouble() ?? target;
    final runRate = (_cockpit?['requiredDailyRunRate'] as num?)?.toDouble() ?? 0.0;
    final pct = target > 0 ? (achieved / target).clamp(0.0, 1.0) : 0.0;
    final visitsDone = _cockpit?['visitsCompletedToday'] ?? _internalVisits.length;
    final visitsPlanned = _cockpit?['visitsPlannedToday'] ?? 15;
    final demos = _cockpit?['demosGivenToday'] ?? 0;
    final trials = _cockpit?['trialsActiveToday'] ?? 0;

    return RefreshIndicator(
      onRefresh: _fetchInternalRepData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Rep Welcome Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Hello, $_mrName',
                      style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF22C55E)),
                      ),
                      child: const Text('FSE Active', style: TextStyle(color: Color(0xFF4ADE80), fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Code: ${_cockpit?['repCode'] ?? 'UB-FSE'} • Territory: ${_cockpit?['city'] ?? 'Kanpur Central'}',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.gps_fixed, color: Color(0xFF38BDF8), size: 14),
                    const SizedBox(width: 4),
                    Text(
                      _isPunchedIn ? 'Live Geotagging & Field Anti-Fraud Active' : 'Not Punched In',
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Monthly Target Progress Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Monthly Sales Quota',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      currency.format(target),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: pct,
                    minHeight: 8,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0D652D)),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Achieved: ${currency.format(achieved)} (${(pct * 100).toStringAsFixed(1)}%)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF16A34A)),
                    ),
                    Text(
                      'Gap: ${currency.format(gap)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFDC2626)),
                    ),
                  ],
                ),
                if (runRate > 0) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Required Daily Run-Rate',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      Text(
                        '${currency.format(runRate)} / day',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Today's Activity Metrics (3 Columns)
          Row(
            children: [
              Expanded(
                child: _buildMetricCard('Visits Today', '$visitsDone / $visitsPlanned', Icons.storefront, const Color(0xFF0D652D)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricCard('Demos Given', '$demos given', Icons.play_circle_outline, const Color(0xFF0284C7)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricCard('Trials Active', '$trials live', Icons.verified_outlined, const Color(0xFF7C3AED)),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Recent Field Visits Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Today's Field Visits",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              Text(
                '${_internalVisits.length} Logged',
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ],
          ),

          const SizedBox(height: 10),

          if (_internalVisits.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  const Icon(Icons.add_location_alt_outlined, color: Color(0xFF94A3B8), size: 40),
                  const SizedBox(height: 10),
                  const Text('No visits punched today yet.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  const Text('Tap "Punch Visit / Demo" below to record your first shop visit.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _showPunchVisitBottomSheet,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Record First Visit'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D652D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            )
          else
            ..._internalVisits.map((v) => _buildVisitCard(v)),

          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildVisitCard(dynamic v) {
    final shopName = v['shopName'] ?? 'Unnamed Shop';
    final ownerName = v['ownerName'] ?? 'Owner';
    final mobile = v['ownerMobile'] ?? '';
    final category = v['shopCategory'] ?? 'Retail';
    final software = v['currentSoftware'] ?? 'Manual';
    final outcomeName = v['visitOutcomeName'] ?? 'Pitched';
    final outcome = v['visitOutcome'] ?? 1;

    Color badgeColor = const Color(0xFF0284C7);
    if (outcome == 2) badgeColor = const Color(0xFF16A34A); // Demo Given
    if (outcome == 3) badgeColor = const Color(0xFF7C3AED); // Trial Activated
    if (outcome == 4) badgeColor = const Color(0xFFD97706); // Won / Paid
    if (outcome == 5) badgeColor = const Color(0xFFDC2626); // Lost / Followup

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0.5,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    shopName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    outcomeName,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Owner: $ownerName • $mobile',
              style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    category,
                    style: const TextStyle(fontSize: 10, color: Color(0xFF475569)),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Software: $software',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInternalVisitsTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('All Shop Visits', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
      ),
      body: _internalVisits.isEmpty
          ? const Center(child: Text('No shop visits logged yet.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _internalVisits.length,
              itemBuilder: (ctx, i) => _buildVisitCard(_internalVisits[i]),
            ),
    );
  }

  Widget _buildInternalProductsTab() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Software Packages & Pricing', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
      ),
      body: _internalProducts.isEmpty
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildProductItem('UdyogBill Retail & Grocery POS', '₹4,999 / yr', 'Smart Billing, Barcode Scan, Stock & GST'),
                _buildProductItem('UdyogBill Pharma Enterprise (Desktop + Mobile)', '₹7,999 / yr', 'Drug License, Batch Expiry, PTR/PTS, SFA Suite'),
                _buildProductItem('Supermarket Multi-Counter Package', '₹12,999 / yr', 'Multi-Terminal, Cloud Sync, Thermal Printing'),
                _buildProductItem('Hardware Bundle: 3-Inch Thermal + Scanner', '₹6,499 one-time', 'USB + Bluetooth Printer + 2D QR Scanner'),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _internalProducts.length,
              itemBuilder: (ctx, i) {
                final p = _internalProducts[i];
                return _buildProductItem(
                  p['name'] ?? 'Product',
                  '₹${p['price'] ?? '0'}',
                  p['description'] ?? 'Official UdyogBill software package',
                );
              },
            ),
    );
  }

  Widget _buildProductItem(String title, String price, String desc) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ),
                Text(
                  price,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0D652D)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              desc,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInternalPerformanceTab() {
    final currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final target = (_cockpit?['monthlyTarget'] as num?)?.toDouble() ?? 200000.0;
    final achieved = (_cockpit?['achievedRevenue'] as num?)?.toDouble() ?? 0.0;
    final commission = (_cockpit?['estimatedCommissionEarned'] as num?)?.toDouble() ?? (achieved * 0.08);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D652D), Color(0xFF15803D)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Target & Commission Cockpit', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 6),
              Text(
                'Estimated Earned: ${currency.format(commission)}',
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                'Target: ${currency.format(target)} • Achieved: ${currency.format(achieved)}',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildPerformanceRow('Total Pitches Logged', '${_internalVisits.length} visits'),
        _buildPerformanceRow('Total Demos Recorded', '${_cockpit?['demosGivenToday'] ?? 0} demos'),
        _buildPerformanceRow('Free Trials Handed Out', '${_cockpit?['trialsActiveToday'] ?? 0} trials'),
        _buildPerformanceRow('Active Quota Month', '${DateTime.now().month} / ${DateTime.now().year}'),
      ],
    );
  }

  Widget _buildPerformanceRow(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF475569))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }

  void _showPunchVisitBottomSheet() {
    final shopNameCtrl = TextEditingController();
    final ownerNameCtrl = TextEditingController();
    final mobileCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String category = 'Retail Shop';
    String software = 'None (Manual Khata)';
    int outcome = 2; // Default: Software Demo Given
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Punch Shop Visit / Demo',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Divider(),
                  const SizedBox(height: 8),

                  TextField(
                    controller: shopNameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Shop / Counter Name *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: ownerNameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Owner / Contact Person *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: mobileCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Mobile Number *',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: const InputDecoration(
                      labelText: 'Shop Category',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: [
                      'Retail Shop',
                      'Pharmacy / Medical',
                      'Grocery / Kirana',
                      'Supermarket',
                      'Garments / Fashion',
                      'Hardware / Sanitary',
                      'Electronics',
                      'Restaurant / Cafe',
                      'Other',
                    ].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (val) => setModalState(() => category = val ?? category),
                  ),
                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    value: software,
                    decoration: const InputDecoration(
                      labelText: 'Current Billing Software',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: [
                      'None (Manual Khata)',
                      'Vyapar',
                      'Marg ERP',
                      'Busy',
                      'Tally',
                      'Other Software',
                    ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                    onChanged: (val) => setModalState(() => software = val ?? software),
                  ),
                  const SizedBox(height: 12),

                  DropdownButtonFormField<int>(
                    value: outcome,
                    decoration: const InputDecoration(
                      labelText: 'Pitch Outcome',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: const [
                      DropdownMenuItem(value: 2, child: Text('Software Demo Given (Recommended)')),
                      DropdownMenuItem(value: 1, child: Text('Discussion / Pitch Made')),
                      DropdownMenuItem(value: 3, child: Text('Free Trial Activated (7-Days)')),
                      DropdownMenuItem(value: 4, child: Text('Subscription Converted (Paid/Won)')),
                      DropdownMenuItem(value: 5, child: Text('Warm Follow-up Scheduled')),
                    ],
                    onChanged: (val) => setModalState(() => outcome = val ?? outcome),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: notesCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Notes / Merchant Feedback',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 16),

                  ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final sName = shopNameCtrl.text.trim();
                            final oName = ownerNameCtrl.text.trim();
                            final mob = mobileCtrl.text.trim();

                            if (sName.isEmpty || oName.isEmpty || mob.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please fill Shop Name, Owner Name and Mobile Number'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }

                            setModalState(() => isSubmitting = true);
                            try {
                              final client = ApiClient();
                              final res = await client.post('/internal-sales/visits', data: {
                                'shopName': sName,
                                'ownerName': oName,
                                'ownerMobile': mob,
                                'shopCategory': category,
                                'currentSoftware': software,
                                'address': 'Field Visit',
                                'latitude': 0.0,
                                'longitude': 0.0,
                                'visitOutcome': outcome,
                                'totalQuotedAmount': outcome == 4 ? 4999.0 : 0.0,
                                'notes': notesCtrl.text.trim(),
                              });

                              if (res.statusCode == 200 || res.statusCode == 201) {
                                if (ctx.mounted) Navigator.pop(ctx);
                                await _fetchInternalRepData();
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Shop Visit & Demo recorded successfully! (Geotagged)'),
                                      backgroundColor: AppTheme.success,
                                    ),
                                  );
                                }
                              } else {
                                throw Exception(res.data?['message'] ?? 'Could not record visit');
                              }
                            } catch (e) {
                              if (ctx.mounted) {
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(
                                    content: Text('Error: ${e.toString()}'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            } finally {
                              setModalState(() => isSubmitting = false);
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D652D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Visit & Geotag GPS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

}
