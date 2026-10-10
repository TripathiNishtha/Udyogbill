import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/sync/sync_service.dart';
import '../../billing_pos/screens/billing_pos_screen.dart';
import '../../invoices/screens/create_invoice_screen.dart';
import '../../invoices/screens/invoices_list_screen.dart';
import '../../parties/screens/add_party_dialog.dart';
import '../../items/screens/add_item_dialog.dart';
import '../../invoices/screens/invoice_detail_preview_screen.dart';
import '../../payments/screens/record_payment_screen.dart';
import '../../sales_returns/screens/sales_returns_list_screen.dart';
import '../../inventory/screens/expiry_watchlist_screen.dart';
import '../../settings/screens/business_settings_screen.dart';
import '../../quotations/screens/quotations_list_screen.dart';
import '../../expenses/screens/expenses_list_screen.dart';
import '../../ai_purchase_scanner/screens/ai_purchase_scanner_screen.dart';
import '../../pharma_sfa/screens/pharma_sfa_shell_screen.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/mobile_remote_config_service.dart';

class NativeDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const NativeDashboardScreen({super.key, this.onNavigateTab});

  @override
  State<NativeDashboardScreen> createState() => _NativeDashboardScreenState();
}

class _NativeDashboardScreenState extends State<NativeDashboardScreen> {
  final ApiClient _apiClient = ApiClient();
  final InvoiceDao _invoiceDao = InvoiceDao();
  final ItemDao _itemDao = ItemDao();
  final SyncService _syncService = SyncService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String _tenantName = 'My Business';
  String _selectedPeriod = 'THIS_MONTH'; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL_TIME, CUSTOM
  DateTime? _customStartDate;
  DateTime? _customEndDate;

  Map<String, double> _metrics = {
    'todaySales': 0.0,
    'totalReceivable': 0.0,
    'totalPayable': 0.0,
  };
  Map<String, dynamic> _expirySummary = {
    'totalExpiringCount': 0,
    'expiredCount': 0,
    'criticalCount': 0,
    'warningCount': 0,
    'cautionCount': 0,
    'totalRiskStockValue': 0.0,
  };
  List<InvoiceModel> _recentInvoices = [];
  bool _isLoading = true;
  bool _isSyncing = false;
  int _pendingSyncCount = 0;
  bool _hasCompletedFirstBill = true;
  bool _hasBankConfigured = false;
  int _itemCount = 0;
  String _tenantIndustry = 'OTHER';

  bool get _isPharmaIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('PHARMA') || ind.contains('CHEMIST') || ind.contains('MEDIC') || ind.contains('HEALTH');
  }

  bool get _isFootwearOrGarmentIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('SHOE') || ind.contains('FOOTWEAR') || ind.contains('GARMENT') || ind.contains('CLOTH') || ind.contains('TEXTILE') || ind.contains('FASHION');
  }

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _pickCustomDateRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(now.year + 1),
      initialDateRange: DateTimeRange(
        start: _customStartDate ?? now.subtract(const Duration(days: 7)),
        end: _customEndDate ?? now,
      ),
    );
    if (picked != null) {
      setState(() {
        _selectedPeriod = 'CUSTOM';
        _customStartDate = picked.start;
        _customEndDate = picked.end;
      });
      _loadDashboardData();
    }
  }

  String _getPeriodHeading() {
    switch (_selectedPeriod) {
      case 'TODAY':
        return "TODAY'S TOTAL SALES";
      case 'YESTERDAY':
        return "YESTERDAY'S SALES";
      case 'THIS_WEEK':
        return "THIS WEEK'S SALES";
      case 'THIS_MONTH':
        return "THIS MONTH'S TOTAL SALES";
      case 'ALL_TIME':
        return "ALL-TIME TOTAL SALES";
      case 'CUSTOM':
        final s = _customStartDate != null ? "${_customStartDate!.day}/${_customStartDate!.month}" : "";
        final e = _customEndDate != null ? "${_customEndDate!.day}/${_customEndDate!.month}" : "";
        return "SALES ($s to $e)";
      default:
        return "TOTAL SALES";
    }
  }

  Future<void> _handleDashboardRefresh() async {
    final activeTenantId = await _storage.read(key: AppConstants.keyTenantId) ?? '';
    await _syncService.syncInvoicesFromWeb(tenantId: activeTenantId);
    await _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

    final storedName = await _storage.read(key: AppConstants.keyTenantName);
    final activeTenantId = await _storage.read(key: AppConstants.keyTenantId) ?? '';

    DateTime? fromDate;
    DateTime? toDate;
    final now = DateTime.now();

    switch (_selectedPeriod) {
      case 'TODAY':
        fromDate = DateTime(now.year, now.month, now.day);
        toDate = DateTime(now.year, now.month, now.day);
        break;
      case 'YESTERDAY':
        final y = now.subtract(const Duration(days: 1));
        fromDate = DateTime(y.year, y.month, y.day);
        toDate = DateTime(y.year, y.month, y.day);
        break;
      case 'THIS_WEEK':
        final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
        fromDate = DateTime(startOfWeek.year, startOfWeek.month, startOfWeek.day);
        toDate = DateTime(now.year, now.month, now.day);
        break;
      case 'THIS_MONTH':
        fromDate = DateTime(now.year, now.month, 1);
        toDate = DateTime(now.year, now.month, now.day);
        break;
      case 'ALL_TIME':
        fromDate = null;
        toDate = null;
        break;
      case 'CUSTOM':
        fromDate = _customStartDate;
        toDate = _customEndDate;
        break;
    }

    String? fromDateStr = fromDate != null ? "${fromDate.year}-${fromDate.month.toString().padLeft(2, '0')}-${fromDate.day.toString().padLeft(2, '0')}" : null;
    String? toDateStr = toDate != null ? "${toDate.year}-${toDate.month.toString().padLeft(2, '0')}-${toDate.day.toString().padLeft(2, '0')}" : null;

    Map<String, String> queryParams = {};
    if (fromDateStr != null) queryParams['fromDate'] = fromDateStr;
    if (toDateStr != null) queryParams['toDate'] = toDateStr;

    Map<String, double> metrics = {};

    // 1. Auto-flush pending queue and sync invoices from web first so metrics reflect instantly
    try {
      await _syncService.flushSyncQueue();
      await _syncService.syncInvoicesFromWeb(tenantId: activeTenantId);
    } catch (_) {}

    // 2. Fetch authoritative real-time summary from backend API
    try {
      final summaryRes = await _apiClient.get(
        '/tenant/reports/summary',
        queryParameters: queryParams.isEmpty ? null : queryParams,
      );

      if (summaryRes.statusCode == 200 && summaryRes.data != null) {
        final d = summaryRes.data;
        metrics = {
          'todaySales': (d['totalSales'] as num?)?.toDouble() ?? 0.0,
          'totalReceivable': (d['totalPendingReceivables'] as num?)?.toDouble() ?? 0.0,
          'totalPayable': (d['totalPayables'] as num?)?.toDouble() ?? 0.0,
        };
      }
    } catch (_) {
      // Offline fallback
    }

    // 3. Fallback to local SQLite strictly isolated by tenantId if offline
    if (metrics.isEmpty) {
      metrics = await _invoiceDao.getDashboardMetrics(activeTenantId, fromDateStr, toDateStr);
    } else {
      // If online summary was loaded, include any remaining unsynced local bills for this period
      final unsyncedSales = await _invoiceDao.getUnsyncedSalesTotal(activeTenantId, fromDateStr, toDateStr);
      if (unsyncedSales > 0) {
        metrics['todaySales'] = (metrics['todaySales'] ?? 0.0) + unsyncedSales;
      }
    }

    final pendingCount = await _syncService.getPendingSyncCount();

    final recents = await _invoiceDao.getRecentInvoices(
      tenantId: activeTenantId,
      limit: 10,
      fromDate: fromDateStr,
      toDate: toDateStr,
    );
    final expiry = await _itemDao.getExpirySummary(tenantId: activeTenantId);
    final firstBillDone = await _storage.read(key: AppConstants.keyHasCompletedFirstBill);
    final upi = await _storage.read(key: AppConstants.keyStoreUpiId) ?? '';
    final bank = await _storage.read(key: AppConstants.keyBankName) ?? '';
    final allItems = await _itemDao.getAllItems(activeTenantId);
    final storedIndustry = await _storage.read(key: AppConstants.keyTenantIndustry);

    if (mounted) {
      setState(() {
        if (storedName != null && storedName.isNotEmpty) {
          _tenantName = storedName;
        }
        if (storedIndustry != null && storedIndustry.isNotEmpty) {
          _tenantIndustry = storedIndustry;
        }
        _metrics = metrics;
        _recentInvoices = recents;
        _expirySummary = expiry;
        _pendingSyncCount = pendingCount;
        _hasCompletedFirstBill = (firstBillDone == 'true');
        _hasBankConfigured = upi.trim().isNotEmpty || bank.trim().isNotEmpty;
        _itemCount = allItems.length;
        _isLoading = false;
      });
    }
  }

  Future<void> _triggerSync() async {
    setState(() => _isSyncing = true);
    try {
      final activeTenantId = await _storage.read(key: AppConstants.keyTenantId) ?? '';
      final flushed = await _syncService.flushSyncQueue();
      final catalogSynced = await _syncService.syncCatalogFromWeb();
      final partiesSynced = await _syncService.syncPartiesFromWeb();
      final invoicesSynced = await _syncService.syncInvoicesFromWeb(tenantId: activeTenantId);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync complete! Flushed: $flushed, Items: $catalogSynced, Parties: $partiesSynced, Web Invoices: $invoicesSynced'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
      await _loadDashboardData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Working offline with local SQLite database'),
            backgroundColor: AppTheme.accent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  Widget _buildExecutiveMetricCard({
    required String title,
    required String subtitle,
    required double amount,
    required Color color,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.2)),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 3),
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
                    title,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[700],
                    ),
                  ),
                  CircleAvatar(
                    radius: 12,
                    backgroundColor: color.withValues(alpha: 0.15),
                    child: Icon(icon, size: 14, color: color),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '₹${amount.toStringAsFixed(0)}',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(fontSize: 9, color: Colors.grey[500], fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionButton({
    required String label,
    required IconData icon,
    required Color bgGradientStart,
    required Color bgGradientEnd,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [bgGradientStart, bgGradientEnd],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: bgGradientStart.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddonSuiteCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required String badge,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accentColor.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: accentColor.withValues(alpha: 0.05),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: accentColor.withValues(alpha: 0.12),
                  child: Icon(icon, size: 16, color: accentColor),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      color: accentColor,
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 1),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodSelector() {
    final periods = [
      {'key': 'TODAY', 'label': 'Today'},
      {'key': 'YESTERDAY', 'label': 'Yesterday'},
      {'key': 'THIS_WEEK', 'label': 'This Week'},
      {'key': 'THIS_MONTH', 'label': 'This Month'},
      {'key': 'ALL_TIME', 'label': 'All Time'},
      {'key': 'CUSTOM', 'label': 'Custom 📅'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: periods.map((p) {
          final isSelected = _selectedPeriod == p['key'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: isSelected,
              label: Text(
                p['label']!,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF334155),
                ),
              ),
              selectedColor: AppTheme.primary,
              backgroundColor: Colors.white,
              checkmarkColor: Colors.white,
              showCheckmark: isSelected,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(
                  color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1),
                ),
              ),
              onSelected: (selected) {
                if (p['key'] == 'CUSTOM') {
                  _pickCustomDateRange();
                } else {
                  setState(() => _selectedPeriod = p['key']!);
                  _loadDashboardData();
                }
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGuidedOnboardingCard() {
    int completedSteps = 0;
    if (_hasBankConfigured) completedSteps++;
    if (_itemCount > 0) completedSteps++;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFD8B2), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFF6A00).withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text('🎯', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Getting Started Checklist',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$completedSteps of 3 steps completed',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFEA580C)),
                    ),
                  ],
                ),
              ),
              CircularProgressIndicator(
                value: (completedSteps / 3).clamp(0.05, 1.0),
                backgroundColor: const Color(0xFFFFEDD5),
                color: const Color(0xFFFF6A00),
                strokeWidth: 4,
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),

          // Step 1: Business Profile & Bank Details
          _buildGuidedStepRow(
            stepNumber: '1',
            title: 'Store & Bank Setup',
            subtitle: _hasBankConfigured ? 'Bank details configured' : 'Add UPI ID & Bank Account for QR receipts',
            isCompleted: _hasBankConfigured,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BusinessSettingsScreen()),
              );
              _loadDashboardData();
            },
          ),
          const SizedBox(height: 10),

          // Step 2: Add First Product / Service
          _buildGuidedStepRow(
            stepNumber: '2',
            title: 'Add First Item',
            subtitle: _itemCount > 0 ? '$_itemCount item(s) added' : 'Add products with rate, HSN, and GST',
            isCompleted: _itemCount > 0,
            onTap: () async {
              await showDialog(
                context: context,
                builder: (_) => const AddItemDialog(),
              );
              _loadDashboardData();
            },
          ),
          const SizedBox(height: 10),

          // Step 3: Create Your First Bill (Highlighted with pulsing pointer)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFF6A00), width: 1.5),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFF6A00),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('3', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Text(
                            'Create First Sale Bill',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          SizedBox(width: 4),
                          Text('👆', style: TextStyle(fontSize: 15)),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Tap here to create your first GST bill & share PDF',
                        style: TextStyle(fontSize: 11, color: Color(0xFF78350F), fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final res = await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CreateInvoiceScreen()),
                    );
                    if (res == true) _loadDashboardData();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF6A00),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 2,
                  ),
                  child: const Text('Start', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGuidedStepRow({
    required String stepNumber,
    required String title,
    required String subtitle,
    required bool isCompleted,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
        child: Row(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: isCompleted ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(Icons.check, color: Colors.white, size: 16)
                    : Text(stepNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF475569))),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isCompleted ? const Color(0xFF0F172A) : const Color(0xFF334155),
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Icon(
              isCompleted ? Icons.check_circle : Icons.chevron_right,
              color: isCompleted ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _handleDashboardRefresh,
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Store Top Header Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFC7D2FE)),
                              ),
                              child: Image.asset(
                                'assets/images/logo_icon.png',
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) => CircleAvatar(
                                  radius: 24,
                                  backgroundColor: AppTheme.primaryLight,
                                  child: const Icon(Icons.storefront_rounded, color: AppTheme.primary, size: 26),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _tenantName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: _pendingSyncCount == 0 ? AppTheme.success : AppTheme.warning,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _pendingSyncCount == 0 ? 'Cloud Synced • Live' : '$_pendingSyncCount Pending Sync',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: _pendingSyncCount == 0 ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: _isSyncing ? null : _triggerSync,
                            icon: _isSyncing
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                                  )
                                : const Icon(Icons.sync_rounded, color: AppTheme.primary),
                            tooltip: 'Cloud Sync',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Guided Onboarding Banner (if first bill not completed)
                    if (!_hasCompletedFirstBill) ...[
                      _buildGuidedOnboardingCard(),
                    ],

                    // Date Period Selector Row
                    _buildPeriodSelector(),
                    const SizedBox(height: 14),

                    // Sales Hero Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFF6A00), Color(0xFFEA580C)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFF6A00).withValues(alpha: 0.35),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  _getPeriodHeading(),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.trending_up, color: Colors.white, size: 14),
                                      SizedBox(width: 4),
                                      Text('Live', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '₹${(_metrics['todaySales'] ?? 0.0).toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Fast GST Invoicing & POS',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                                ElevatedButton.icon(
                                  onPressed: () async {
                                    final res = await Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const CreateInvoiceScreen()),
                                    );
                                    if (res == true) _loadDashboardData();
                                  },
                                  icon: const Icon(Icons.add, size: 14),
                                  label: const Text('+ Bill'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: AppTheme.primary,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Receivables & Payables
                      Row(
                        children: [
                          _buildExecutiveMetricCard(
                            title: "You'll Get",
                            subtitle: "Total Receivables",
                            amount: _metrics['totalReceivable'] ?? 0.0,
                            color: AppTheme.success,
                            icon: Icons.arrow_downward_rounded,
                            onTap: () {
                              if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                            },
                          ),
                          const SizedBox(width: 12),
                          _buildExecutiveMetricCard(
                            title: "You'll Pay",
                            subtitle: "Total Payables",
                            amount: _metrics['totalPayable'] ?? 0.0,
                            color: AppTheme.danger,
                            icon: Icons.arrow_upward_rounded,
                            onTap: () {
                              if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // ─── AI Purchase Scanner Hero Banner ───
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF0F172A).withValues(alpha: 0.25),
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
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFD97706)]),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.auto_awesome, color: Colors.white, size: 12),
                                      SizedBox(width: 4),
                                      Text('AI PRO ADD-ON', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.check_circle, color: Color(0xFF34D399), size: 12),
                                      SizedBox(width: 4),
                                      Text('Instant OCR', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'AI Purchase Bill Scanner',
                              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Camera se paper purchase bill ki photo kheecho aur 1-tap me live inventory stock & khata inward karo.',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.3),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFF59E0B),
                                  foregroundColor: const Color(0xFF0F172A),
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  elevation: 0,
                                ),
                                icon: const Icon(Icons.camera_alt_rounded, size: 18),
                                label: const Text('Scan Purchase Bill (Photo to Stock)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const AiPurchaseScannerScreen()),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Vyapar-style Big Quick Actions Header
                      const Text(
                        'Quick Business Actions',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Primary Transactions (Sale Bill + Payment-In)
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickActionButton(
                              label: _hasCompletedFirstBill ? '+ Sale Bill' : '+ Sale Bill 👆',
                              icon: Icons.receipt_long,
                              bgGradientStart: const Color(0xFFFF6A00),
                              bgGradientEnd: const Color(0xFFFF8533),
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const CreateInvoiceScreen()),
                                );
                                if (res == true) _loadDashboardData();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '💰 Payment-In',
                              icon: Icons.account_balance_wallet_rounded,
                              bgGradientStart: const Color(0xFF059669),
                              bgGradientEnd: const Color(0xFF10B981),
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const RecordPaymentScreen()),
                                );
                                if (res == true) _loadDashboardData();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Operational Utilities (Fast POS + Party + Item)
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '⚡ Fast POS',
                              icon: Icons.point_of_sale_rounded,
                              bgGradientStart: const Color(0xFF0D9488),
                              bgGradientEnd: const Color(0xFF14B8A6),
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const BillingPosScreen()),
                                );
                                _loadDashboardData();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '+ Party',
                              icon: Icons.person_add_alt_1,
                              bgGradientStart: const Color(0xFF7C3AED),
                              bgGradientEnd: const Color(0xFF8B5CF6),
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const AddPartyDialog(defaultPartyType: 1)),
                                );
                                if (res != null) _loadDashboardData();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '+ Item',
                              icon: Icons.inventory_2,
                              bgGradientStart: const Color(0xFFD97706),
                              bgGradientEnd: const Color(0xFFF59E0B),
                              onTap: () async {
                                await showDialog(
                                  context: context,
                                  builder: (_) => const AddItemDialog(),
                                );
                                _loadDashboardData();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Operational Actions (Quotations/Estimates + Daily Shop Expenses)
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '📋 Estimate / Quote',
                              icon: Icons.request_quote_rounded,
                              bgGradientStart: const Color(0xFF2563EB),
                              bgGradientEnd: const Color(0xFF3B82F6),
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const QuotationsListScreen()),
                                );
                                if (res == true) _loadDashboardData();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '💸 Shop Expense',
                              icon: Icons.money_off_rounded,
                              bgGradientStart: const Color(0xFFE11D48),
                              bgGradientEnd: const Color(0xFFF43F5E),
                              onTap: () async {
                                final res = await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const ExpensesListScreen()),
                                );
                                if (res == true) _loadDashboardData();
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // ─── All Add-on Suites & Power Features Grid ───
                      const Text(
                        'All Add-on Suites & Modules',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Builder(
                        builder: (ctx) {
                          final List<Widget> suiteCards = [];

                          // 1. AI Bill Scanner (Show PRO badge)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'AI Bill Scanner',
                              subtitle: 'Photo to Stock Inward',
                              icon: Icons.document_scanner_rounded,
                              badge: 'AI PRO',
                              accentColor: const Color(0xFFD97706),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AiPurchaseScannerScreen())),
                            ),
                          );

                          // 2. Fast Barcode POS (Retail, Shoes, Grocery, Pharma)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'Fast Barcode POS',
                              subtitle: 'Continuous Barcode',
                              icon: Icons.point_of_sale_rounded,
                              badge: 'POS',
                              accentColor: const Color(0xFF0D9488),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BillingPosScreen())),
                            ),
                          );

                          // 3. Quotations (B2B, Footwear wholesale, General)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'Quotations',
                              subtitle: 'Kaccha Bill & Estimate',
                              icon: Icons.request_quote_rounded,
                              badge: 'SALES',
                              accentColor: const Color(0xFF2563EB),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuotationsListScreen())),
                            ),
                          );

                          // 4. Shop Expenses (Universal)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'Shop Expenses',
                              subtitle: 'Daily Galla & Kharcha',
                              icon: Icons.money_off_rounded,
                              badge: 'CASH',
                              accentColor: const Color(0xFFE11D48),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ExpensesListScreen())),
                            ),
                          );

                          // 5. Expiry Radar (ONLY for Pharma / Chemist / Grocery Perishables - NOT for Shoes/Garments)
                          if (!_isFootwearOrGarmentIndustry) {
                            suiteCards.add(
                              _buildAddonSuiteCard(
                                title: 'Expiry Radar',
                                subtitle: 'Near-Expiry Stock Alert',
                                icon: Icons.radar_rounded,
                                badge: 'ALERTS',
                                accentColor: const Color(0xFFEA580C),
                                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ExpiryWatchlistScreen())),
                              ),
                            );
                          }

                          // 6. Sales Returns (Universal)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'Sales Returns',
                              subtitle: 'Credit Notes & Returns',
                              icon: Icons.assignment_return_outlined,
                              badge: 'RETURNS',
                              accentColor: const Color(0xFFDC2626),
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SalesReturnsListScreen())),
                            ),
                          );

                          // 7. Pharma SFA (ONLY for Pharma & Chemist industry - STRICTLY hidden for Shoes/Garments/Auto)
                          if (_isPharmaIndustry) {
                            suiteCards.add(
                              _buildAddonSuiteCard(
                                title: 'Pharma SFA',
                                subtitle: 'MR Calls & Orders',
                                icon: Icons.medical_services_outlined,
                                badge: 'FIELD SFA',
                                accentColor: const Color(0xFF7C3AED),
                                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PharmaSfaShellScreen())),
                              ),
                            );
                          }

                          // 8. Parties & Ledgers (Universal)
                          suiteCards.add(
                            _buildAddonSuiteCard(
                              title: 'Parties & Ledgers',
                              subtitle: 'Customer & Supplier Khata',
                              icon: Icons.account_balance_wallet_outlined,
                              badge: 'KHATA',
                              accentColor: const Color(0xFF059669),
                              onTap: () {
                                if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                              },
                            ),
                          );

                          return GridView.count(
                            crossAxisCount: 2,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 1.6,
                            children: suiteCards,
                          );
                        },
                      ),
                      const SizedBox(height: 16),

                      // Sales Returns & Credit Notes Card
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: const Color(0xFFFEE2E2),
                              child: const Icon(Icons.assignment_return_outlined, size: 18, color: Color(0xFFDC2626)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Sales Returns & Credit Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                                  Text('Manage goods return, expiry & credit adjustments', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                                ],
                              ),
                            ),
                            TextButton(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const SalesReturnsListScreen()),
                                );
                              },
                              child: const Text('Manage ➔', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFDC2626))),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Near-Expiry Radar & Watchlist Card
                      if (MobileRemoteConfigService().config.isNearExpiryRadarEnabled) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: (_expirySummary['totalExpiringCount'] ?? 0) > 0
                                  ? const Color(0xFFF59E0B)
                                  : const Color(0xFFE2E8F0),
                              width: (_expirySummary['totalExpiringCount'] ?? 0) > 0 ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: (_expirySummary['totalExpiringCount'] ?? 0) > 0
                                    ? const Color(0xFFFEF3C7)
                                    : const Color(0xFFF1F5F9),
                                child: Icon(
                                  Icons.radar_rounded,
                                  size: 18,
                                  color: (_expirySummary['totalExpiringCount'] ?? 0) > 0
                                      ? const Color(0xFFD97706)
                                      : const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Text(
                                          'Near-Expiry Radar',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                        ),
                                        if ((_expirySummary['totalExpiringCount'] ?? 0) > 0) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFFEF3C7),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              '${_expirySummary['totalExpiringCount']} AT RISK',
                                              style: const TextStyle(
                                                color: Color(0xFFD97706),
                                                fontWeight: FontWeight.w900,
                                                fontSize: 9,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    Text(
                                      (_expirySummary['totalExpiringCount'] ?? 0) > 0
                                          ? '₹${((_expirySummary['totalRiskStockValue'] as num?)?.toDouble() ?? 0.0).toStringAsFixed(0)} value • ${_expirySummary['expiredCount']} Expired, ${_expirySummary['criticalCount']} <30d'
                                          : 'Track batches & expiry dates to prevent stock loss',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: (_expirySummary['totalExpiringCount'] ?? 0) > 0 ? const Color(0xFFB45309) : Colors.grey[600],
                                        fontWeight: (_expirySummary['totalExpiringCount'] ?? 0) > 0 ? FontWeight.w600 : FontWeight.normal,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed: () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const ExpiryWatchlistScreen()),
                                  );
                                  _loadDashboardData();
                                },
                                child: const Text('Radar ➔', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFD97706))),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),

                      // Recent Invoices Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Recent Transactions',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              if (widget.onNavigateTab != null) {
                                widget.onNavigateTab!(1);
                              } else {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const InvoicesListScreen()),
                                );
                              }
                            },
                            child: const Text('View All', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (_recentInvoices.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(28),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.receipt_outlined, size: 36, color: Colors.grey[400]),
                                const SizedBox(height: 8),
                                Text(
                                  'No transactions yet.\nTap "+ Sale Bill" above to create your first bill!',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ..._recentInvoices.map((inv) {
                          final isPaid = inv.paymentStatus == 3;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 0,
                            child: ListTile(
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => InvoiceDetailPreviewScreen(invoice: inv)),
                                );
                                _loadDashboardData();
                              },
                              leading: CircleAvatar(
                                backgroundColor: isPaid ? AppTheme.success.withValues(alpha: 0.12) : AppTheme.danger.withValues(alpha: 0.12),
                                child: Icon(
                                  isPaid ? Icons.check_circle_outline : Icons.pending_actions,
                                  color: isPaid ? AppTheme.success : AppTheme.danger,
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                inv.partyName,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                              ),
                              subtitle: Row(
                                children: [
                                  Text(
                                    '${inv.invoiceNumber} • ${inv.invoiceDate}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                  const SizedBox(width: 5),
                                  Icon(
                                    inv.isSynced ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                                    size: 13,
                                    color: inv.isSynced ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                                  ),
                                ],
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '₹${inv.totalAmount.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 14,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    isPaid ? 'PAID' : 'DUE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isPaid ? AppTheme.success : AppTheme.danger,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
