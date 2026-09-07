import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/sync/sync_service.dart';
import '../../billing_pos/screens/billing_pos_screen.dart';
import '../../invoices/screens/create_invoice_screen.dart';
import '../../invoices/screens/invoices_list_screen.dart';
import '../../parties/screens/add_party_dialog.dart';
import '../../items/screens/add_item_dialog.dart';
import '../../invoices/screens/invoice_detail_preview_screen.dart';

class NativeDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const NativeDashboardScreen({super.key, this.onNavigateTab});

  @override
  State<NativeDashboardScreen> createState() => _NativeDashboardScreenState();
}

class _NativeDashboardScreenState extends State<NativeDashboardScreen> {
  final InvoiceDao _invoiceDao = InvoiceDao();
  final SyncService _syncService = SyncService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String _tenantName = 'UdyogBill Demo Mart';
  Map<String, double> _metrics = {
    'todaySales': 0.0,
    'totalReceivable': 0.0,
    'totalPayable': 0.0,
  };
  List<InvoiceModel> _recentInvoices = [];
  bool _isLoading = true;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

    final storedName = await _storage.read(key: AppConstants.keyTenantName);
    final metrics = await _invoiceDao.getDashboardMetrics();
    final recents = await _invoiceDao.getRecentInvoices(limit: 5);

    if (mounted) {
      setState(() {
        if (storedName != null && storedName.isNotEmpty) {
          _tenantName = storedName;
        }
        _metrics = metrics;
        _recentInvoices = recents;
        _isLoading = false;
      });
    }
  }

  Future<void> _triggerSync() async {
    setState(() => _isSyncing = true);
    try {
      final catalogSynced = await _syncService.syncCatalogFromWeb();
      final flushed = await _syncService.flushSyncQueue();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync complete! Items updated: $catalogSynced, Invoices synced: $flushed'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
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
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.asset(
                                'assets/images/logo.png',
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
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
                                        decoration: const BoxDecoration(
                                          color: AppTheme.success,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'Offline-Ready SQLite',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF64748B),
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
                      const SizedBox(height: 16),

                      // Today's Sales Hero Card
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF4F46E5), Color(0xFF3730A3)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
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
                                const Text(
                                  "TODAY'S TOTAL SALES",
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
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

                      // Receivables (Lene Hain) & Payables (Dene Hain)
                      Row(
                        children: [
                          _buildExecutiveMetricCard(
                            title: "You'll Get",
                            subtitle: "Lene Hain (Receivables)",
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
                            subtitle: "Dene Hain (Payables)",
                            amount: _metrics['totalPayable'] ?? 0.0,
                            color: AppTheme.danger,
                            icon: Icons.arrow_upward_rounded,
                            onTap: () {
                              if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                            },
                          ),
                        ],
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

                      // Grid of 5 Quick Actions
                      Row(
                        children: [
                          Expanded(
                            child: _buildQuickActionButton(
                              label: '+ Sale Bill',
                              icon: Icons.receipt_long,
                              bgGradientStart: const Color(0xFF4F46E5),
                              bgGradientEnd: const Color(0xFF6366F1),
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
                      const SizedBox(height: 24),

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
                              subtitle: Text(
                                '${inv.invoiceNumber} • ${inv.invoiceDate}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
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
