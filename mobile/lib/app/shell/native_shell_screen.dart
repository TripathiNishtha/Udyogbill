import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/dashboard/screens/native_dashboard_screen.dart';
import '../../features/invoices/screens/invoices_list_screen.dart';
import '../../features/parties/screens/parties_list_screen.dart';
import '../../features/items/screens/items_list_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/billing_pos/screens/billing_pos_screen.dart';
import '../../features/settings/screens/business_settings_screen.dart';
import '../../features/ai_purchase_scanner/screens/ai_purchase_scanner_screen.dart';
import '../../features/pharma_sfa/screens/pharma_sfa_shell_screen.dart';
import '../../features/hrm/screens/hrm_attendance_screen.dart';
import '../../features/hrm/screens/hrm_leave_apply_screen.dart';
import '../../features/hrm/screens/hrm_expense_claim_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../constants/app_constants.dart';
import '../../core/sync/sync_service.dart';
import '../../core/services/mobile_remote_config_service.dart';
import '../../core/widgets/in_app_promo_banner_dialog.dart';

class NativeShellScreen extends StatefulWidget {
  const NativeShellScreen({super.key});

  @override
  State<NativeShellScreen> createState() => _NativeShellScreenState();
}

class _NativeShellScreenState extends State<NativeShellScreen> {
  int _currentIndex = 0;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final SyncService _syncService = SyncService();

  String _tenantName = 'My Business';
  String _userRole = 'Business Admin';
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      InAppPromoBannerDialog.showIfEligible(context);
    });
  }

  Future<void> _loadUserInfo() async {
    final tName = await _storage.read(key: AppConstants.keyTenantName);
    final role = await _storage.read(key: AppConstants.keyUserRole);
    if (mounted) {
      setState(() {
        if (tName != null && tName.isNotEmpty) _tenantName = tName;
        if (role != null && role.isNotEmpty) _userRole = role;
      });
    }
  }

  Future<void> _triggerSync() async {
    setState(() => _isSyncing = true);
    try {
      final items = await _syncService.syncCatalogFromWeb();
      final parties = await _syncService.syncPartiesFromWeb();
      final flushed = await _syncService.flushSyncQueue();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cloud sync complete ($items items, $parties parties, $flushed queued synced)'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Offline mode: Using local SQLite database'),
            backgroundColor: AppTheme.accent,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout?'),
        content: const Text('Are you sure you want to log out of UdyogBill?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _storage.deleteAll();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lowerRole = _userRole.toLowerCase();
    if (lowerRole.contains('mr') || lowerRole.contains('medical') || lowerRole == 'medicalrepresentative') {
      return const PharmaSfaShellScreen();
    }

    final remoteConfig = MobileRemoteConfigService().config;

    final List<Widget> screens = [
      NativeDashboardScreen(onNavigateTab: (tabIdx) => setState(() => _currentIndex = tabIdx)),
      const InvoicesListScreen(),
      const PartiesListScreen(),
      const ItemsListScreen(),
      const ReportsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: remoteConfig.headerLogoUrl.isNotEmpty
                  ? Image.network(
                      remoteConfig.headerLogoUrl,
                      width: 28,
                      height: 28,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Image.asset(
                        'assets/images/logo.png',
                        width: 28,
                        height: 28,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Image.asset(
                      'assets/images/logo.png',
                      width: 28,
                      height: 28,
                      fit: BoxFit.cover,
                    ),
            ),
            const SizedBox(width: 10),
            Text(
              remoteConfig.appDisplayName,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A)),
            ),
          ],
        ),
        actions: [
          if (remoteConfig.isContinuousBarcodePosEnabled)
            IconButton(
              icon: const Icon(Icons.point_of_sale, color: AppTheme.primary),
              tooltip: 'Fast Barcode POS',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const BillingPosScreen()),
                );
              },
            ),
          IconButton(
            icon: _isSyncing
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))
                : const Icon(Icons.sync, color: Color(0xFF64748B)),
            tooltip: 'Sync with Cloud',
            onPressed: _isSyncing ? null : _triggerSync,
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [remoteConfig.primaryColor, AppTheme.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              accountName: Text(
                _tenantName,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
              ),
              accountEmail: Text('Role: $_userRole • SQLite Offline-First'),
              currentAccountPicture: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.all(4),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: remoteConfig.headerLogoUrl.isNotEmpty
                      ? Image.network(
                          remoteConfig.headerLogoUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.cover,
                          ),
                        )
                      : Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.cover,
                        ),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_outlined, color: AppTheme.primary),
              title: const Text('Executive Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
              selected: _currentIndex == 0,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 0);
              },
            ),
            if (remoteConfig.isContinuousBarcodePosEnabled)
              ListTile(
                leading: const Icon(Icons.point_of_sale, color: AppTheme.accent),
                title: const Text('⚡ Fast Barcode POS', style: TextStyle(fontWeight: FontWeight.bold)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const BillingPosScreen()));
                },
              ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined, color: AppTheme.primary),
              title: const Text('Sales Invoices'),
              selected: _currentIndex == 1,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 1);
              },
            ),
            ListTile(
              leading: const Icon(Icons.people_outline, color: AppTheme.primary),
              title: const Text('Parties & Ledgers'),
              selected: _currentIndex == 2,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 2);
              },
            ),
            ListTile(
              leading: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary),
              title: const Text('Items & Inventory Stock'),
              selected: _currentIndex == 3,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 3);
              },
            ),
            if (remoteConfig.isAiBillScannerEnabled)
              ListTile(
                leading: const Icon(Icons.document_scanner, color: Color(0xFF6366F1)),
                title: Row(
                  children: [
                    const Text('AI Purchase Scanner', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('AI PRO', style: TextStyle(color: Color(0xFF6366F1), fontSize: 9, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AiPurchaseScannerScreen()));
                },
              ),
            ListTile(
              leading: const Icon(Icons.analytics_outlined, color: AppTheme.primary),
              title: const Text('Reports & Analytics'),
              selected: _currentIndex == 4,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 4);
              },
            ),
            const Divider(),
            // Universal HRM & Attendance Suite
            ListTile(
              leading: const Icon(Icons.touch_app_outlined, color: Color(0xFF2563EB)),
              title: const Text('Geo-Attendance (Punch)', style: TextStyle(fontWeight: FontWeight.bold)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmAttendanceScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.calendar_month_outlined, color: Color(0xFFD97706)),
              title: const Text('Apply Leave (LMS)'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmLeaveApplyScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_outlined, color: Color(0xFF7C3AED)),
              title: const Text('DA/TA Expense Claims'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const HrmExpenseClaimScreen()));
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_outlined, color: AppTheme.primary),
              title: const Text('Business & Invoice Settings'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const BusinessSettingsScreen()));
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.cloud_sync_outlined, color: AppTheme.accent),
              title: const Text('Synchronize Cloud Now'),
              onTap: () {
                Navigator.pop(context);
                _triggerSync();
              },
            ),
            // Helpdesk & Channels
            ListTile(
              leading: const Icon(Icons.chat, color: Color(0xFF22C55E)),
              title: const Text('WhatsApp Helpdesk'),
              subtitle: const Text('Direct chat with support', style: TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(context);
                final phone = remoteConfig.supportWhatsAppNumber.replaceAll('+', '').replaceAll(' ', '');
                final uri = Uri.parse('https://wa.me/$phone?text=Hello%20UdyogBill%20Support');
                if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
            ),
            ListTile(
              leading: const Icon(Icons.phone_in_talk, color: Color(0xFF0284C7)),
              title: const Text('Calling Helpline'),
              subtitle: Text(remoteConfig.supportHelplineNumber, style: const TextStyle(fontSize: 11)),
              onTap: () async {
                Navigator.pop(context);
                final uri = Uri.parse('tel:${remoteConfig.supportHelplineNumber}');
                if (await canLaunchUrl(uri)) await launchUrl(uri);
              },
            ),
            if (remoteConfig.tutorialYouTubePlaylistUrl.isNotEmpty)
              ListTile(
                leading: const Icon(Icons.play_circle_outline, color: Color(0xFFEF4444)),
                title: const Text('Video Tutorials'),
                subtitle: const Text('Watch quick billing guides', style: TextStyle(fontSize: 11)),
                onTap: () async {
                  Navigator.pop(context);
                  final uri = Uri.parse(remoteConfig.tutorialYouTubePlaylistUrl);
                  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                },
              ),
            ListTile(
              leading: const Icon(Icons.logout, color: AppTheme.danger),
              title: const Text('Logout', style: TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold)),
              onTap: () {
                Navigator.pop(context);
                _handleLogout();
              },
            ),
          ],
        ),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        indicatorColor: AppTheme.primaryLight,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppTheme.primary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: AppTheme.primary),
            label: 'Invoices',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people, color: AppTheme.primary),
            label: 'Parties',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2, color: AppTheme.primary),
            label: 'Items',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics, color: AppTheme.primary),
            label: 'Reports',
          ),
        ],
      ),
    );
  }
}
