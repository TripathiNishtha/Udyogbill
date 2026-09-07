import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'app/theme/app_theme.dart';
import 'app/constants/app_constants.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/pharma_sfa/screens/pharma_sfa_shell_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: UdyogBillSfaApp(),
    ),
  );
}

class UdyogBillSfaApp extends StatelessWidget {
  const UdyogBillSfaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'UdyogBill SFA',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      home: const SfaAuthCheckScreen(),
    );
  }
}

class SfaAuthCheckScreen extends StatefulWidget {
  const SfaAuthCheckScreen({super.key});

  @override
  State<SfaAuthCheckScreen> createState() => _SfaAuthCheckScreenState();
}

class _SfaAuthCheckScreenState extends State<SfaAuthCheckScreen> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  bool _isChecking = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final token = await _storage.read(key: AppConstants.keyToken);
      if (token != null && token.isNotEmpty && token != 'offline-demo-token') {
        _isAuthenticated = true;
      }
    } catch (_) {
      _isAuthenticated = false;
    } finally {
      if (mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      );
    }

    if (_isAuthenticated) {
      return const PharmaSfaShellScreen(isSfaOnly: true);
    }

    return const LoginScreen(isSfaOnly: true);
  }
}
