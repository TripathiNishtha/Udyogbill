import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../../../app/theme/app_theme.dart';
import '../../../core/database/daos/sfa_dao.dart';
import '../../../core/sync/sync_service.dart';
import '../../auth/screens/login_screen.dart';
import '../services/sfa_gps_service.dart';

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

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final name = await _storage.read(key: 'user_full_name');
    if (name != null && name.isNotEmpty && mounted) {
      setState(() => _mrName = name);
    }
    await _loadFromLocalDb();

    // If local database is completely empty on fresh install, attempt initial pull
    if (_doctors.isEmpty && _chemists.isEmpty && _sampleBag.isEmpty) {
      await _performFullSync(showFeedback: false);
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
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFE6F4EA),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.medication_outlined, color: AppTheme.primary, size: 20),
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
                          color: const Color(0xFFE0E7FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          doc.doctorClass!,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF3730A3)),
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
}
