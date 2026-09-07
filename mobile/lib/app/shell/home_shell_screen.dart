import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../theme/app_theme.dart';
import '../../features/billing_pos/screens/billing_pos_screen.dart';

class HomeShellScreen extends StatefulWidget {
  const HomeShellScreen({super.key});

  @override
  State<HomeShellScreen> createState() => _HomeShellScreenState();
}

class _HomeShellScreenState extends State<HomeShellScreen> {
  int _currentIndex = 0;
  late final WebViewController _webViewController;
  bool _isLoadingWeb = true;
  bool _webError = false;
  String _errorMessage = '';
  String _serverUrl = 'http://192.168.29.127:3000/login';

  static const String prefUrlKey = 'udyogbill_server_url';

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  Future<void> _initWebView() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(prefUrlKey);
    if (savedUrl != null && savedUrl.isNotEmpty) {
      _serverUrl = savedUrl;
      // If user saved root URL without /login or /app, make sure it points to /login
      if (_serverUrl.endsWith(':3000') || _serverUrl.endsWith(':3000/')) {
        _serverUrl = '${_serverUrl.replaceAll(RegExp(r'/+$'), '')}/login';
      }
    }

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoadingWeb = true;
                _webError = false;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoadingWeb = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame ?? true) {
              if (mounted) {
                setState(() {
                  _isLoadingWeb = false;
                  _webError = true;
                  _errorMessage = error.description;
                });
              }
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_serverUrl));
  }

  Future<void> _clearAppCache() async {
    await _webViewController.clearCache();
    await _webViewController.clearLocalStorage();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('App cache and offline storage cleared!'),
          duration: Duration(seconds: 2),
          backgroundColor: AppTheme.primary,
        ),
      );
      _webViewController.reload();
    }
  }

  Future<void> _openServerConfigDialog() async {
    final controller = TextEditingController(text: _serverUrl);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.dns, color: AppTheme.primary),
            SizedBox(width: 8),
            Text('Server Configuration', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your UdyogBill Server URL or Cloud Domain:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'http://192.168.29.127:3000/login',
                labelText: 'Server URL',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                prefixIcon: const Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              children: [
                ActionChip(
                  label: const Text('Wi-Fi PC (Local)', style: TextStyle(fontSize: 11)),
                  onPressed: () => controller.text = 'http://192.168.29.127:3000/login',
                ),
                ActionChip(
                  label: const Text('Cloud (Live)', style: TextStyle(fontSize: 11)),
                  onPressed: () => controller.text = 'https://app.udyogbill.com/login',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              var newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
                  newUrl = 'http://$newUrl';
                }
                final prefs = await SharedPreferences.getInstance();
                await prefs.setString(prefUrlKey, newUrl);
                setState(() {
                  _serverUrl = newUrl;
                });
                _webViewController.loadRequest(Uri.parse(newUrl));
                if (ctx.mounted) Navigator.pop(ctx);
              }
            },
            child: const Text('Save & Connect'),
          ),
        ],
      ),
    );
  }

  Widget _buildWebViewTab() {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (await _webViewController.canGoBack()) {
          await _webViewController.goBack();
        }
      },
      child: Stack(
        children: [
          if (!_webError)
            WebViewWidget(controller: _webViewController)
          else
            _buildErrorView(),

          if (_isLoadingWeb)
            Container(
              color: Colors.white.withValues(alpha: 0.85),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: AppTheme.primary),
                    SizedBox(height: 16),
                    Text(
                      'Connecting to UdyogBill ERP...',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.primaryDark),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.red[50],
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.wifi_off_rounded, size: 54, color: Colors.red[600]),
            ),
            const SizedBox(height: 16),
            const Text(
              'Cannot Connect to UdyogBill Server',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Current Server: $_serverUrl\n\nEnsure your mobile and PC are on the same Wi-Fi, or switch to the live cloud URL.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey[700]),
            ),
            if (_errorMessage.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Detail: $_errorMessage',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Colors.red[700]),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.settings),
                  label: const Text('Server Settings'),
                  onPressed: _openServerConfigDialog,
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                  onPressed: () {
                    _webViewController.loadRequest(Uri.parse(_serverUrl));
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              icon: const Icon(Icons.offline_bolt, color: Colors.amber),
              label: const Text('Use Offline Fast POS instead'),
              onPressed: () {
                setState(() => _currentIndex = 1);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _currentIndex == 0
          ? AppBar(
              title: const Row(
                children: [
                  Icon(Icons.business_center, color: AppTheme.primary, size: 22),
                  SizedBox(width: 8),
                  Text('UdyogBill ERP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.cleaning_services_outlined),
                  tooltip: 'Clear Cache & Reload',
                  onPressed: _clearAppCache,
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Reload Page',
                  onPressed: () => _webViewController.reload(),
                ),
                IconButton(
                  icon: const Icon(Icons.settings_ethernet),
                  tooltip: 'Server Connection Settings',
                  onPressed: _openServerConfigDialog,
                ),
              ],
            )
          : null,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildWebViewTab(),
          const BillingPosScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          if (idx == 0) {
            // ERP Dashboard
            setState(() => _currentIndex = 0);
            _webViewController.loadRequest(Uri.parse('${_serverUrl.replaceAll(RegExp(r'/login.*$'), '')}/app/dashboard'));
          } else if (idx == 1) {
            // Invoices / Bills
            setState(() => _currentIndex = 0);
            _webViewController.loadRequest(Uri.parse('${_serverUrl.replaceAll(RegExp(r'/login.*$'), '')}/app/sales/invoices'));
          } else if (idx == 2) {
            // Fast Offline POS
            setState(() => _currentIndex = 1);
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: AppTheme.primary),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: AppTheme.primary),
            label: 'Sales Bills',
          ),
          NavigationDestination(
            icon: Icon(Icons.bolt_outlined),
            selectedIcon: Icon(Icons.bolt, color: AppTheme.primary),
            label: 'Fast POS',
          ),
        ],
      ),
    );
  }
}
