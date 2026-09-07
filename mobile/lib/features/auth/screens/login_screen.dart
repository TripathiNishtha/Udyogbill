import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../../../app/constants/app_constants.dart';
import '../../../app/theme/app_theme.dart';
import '../../../app/shell/native_shell_screen.dart';
import '../../../core/network/api_client.dart';

import '../../pharma_sfa/screens/pharma_sfa_shell_screen.dart';

class LoginScreen extends StatefulWidget {
  final bool isSfaOnly;
  const LoginScreen({super.key, this.isSfaOnly = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController(text: '');
  final _passwordController = TextEditingController(text: '');
  final _serverUrlController = TextEditingController(text: AppConstants.productionApiUrl);
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _showServerSettings = false;
  String? _errorMessage;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    final serverUrl = _serverUrlController.text.trim().isNotEmpty
        ? _serverUrlController.text.trim()
        : AppConstants.productionApiUrl;

    try {
      final client = ApiClient(baseUrl: serverUrl);
      final response = await client.post('/auth/login', data: {
        'email': username,
        'password': password,
      });

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final token = data['accessToken'] ?? data['token'] ?? '';
        final user = data['user'] is Map ? data['user'] as Map : {};
        final tenantId = user['tenantId'] ?? data['tenantId'] ?? '';
        final tenantName = user['businessName'] ?? data['tenantName'] ?? 'UdyogBill Enterprise';
        final fullName = user['fullName'] ?? '';

        final rolesList = user['roles'] as List? ?? [];
        final role = rolesList.isNotEmpty
            ? rolesList.first.toString()
            : (data['role'] ?? 'User');

        await _storage.write(key: AppConstants.keyToken, value: token.toString());
        await _storage.write(key: AppConstants.keyTenantId, value: tenantId.toString());
        await _storage.write(key: AppConstants.keyTenantName, value: tenantName.toString());
        await _storage.write(key: AppConstants.keyUserRole, value: role.toString());
        if (fullName.isNotEmpty) {
          await _storage.write(key: 'user_full_name', value: fullName.toString());
        }
        await _storage.write(key: AppConstants.keyApiUrl, value: serverUrl);

        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => widget.isSfaOnly
                ? const PharmaSfaShellScreen(isSfaOnly: true)
                : const NativeShellScreen(),
          ),
        );
        return;
      } else {
        setState(() {
          _errorMessage = response.data?['message'] ?? 'Login failed. Invalid credentials.';
        });
      }
    } on DioException catch (de) {
      String msg = 'Could not connect to server. Please check internet connection.';
      if (de.response?.data != null) {
        final d = de.response!.data;
        if (d is Map) {
          msg = d['userMessage'] ?? d['message'] ?? (d['errors'] != null ? d['errors'].toString() : msg);
        }
      } else if (de.type == DioExceptionType.connectionTimeout || de.type == DioExceptionType.receiveTimeout) {
        msg = 'Server connection timed out. Please try again.';
      }
      setState(() {
        _errorMessage = msg;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Login error: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _loginOfflineDirectly() async {
    await _storage.write(key: AppConstants.keyToken, value: 'offline-demo-token');
    await _storage.write(key: AppConstants.keyTenantId, value: 'demo-tenant');
    await _storage.write(key: AppConstants.keyTenantName, value: 'UdyogBill Demo Mart');
    await _storage.write(key: AppConstants.keyUserRole, value: widget.isSfaOnly ? 'MR' : 'Store Admin');
    await _storage.write(key: 'user_full_name', value: widget.isSfaOnly ? 'Demo MR' : 'Demo Store Admin');

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => widget.isSfaOnly
            ? const PharmaSfaShellScreen(isSfaOnly: true)
            : const NativeShellScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 84,
                      height: 84,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(4),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      widget.isSfaOnly ? 'UdyogBill SFA' : 'UdyogBill',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  Center(
                    child: Text(
                      widget.isSfaOnly
                          ? 'Pharma Field Force & MR Reporting Suite'
                          : 'Smart GST Billing & Executive POS',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.danger.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppTheme.danger, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppTheme.danger, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  const Text(
                    'Email / Mobile / Username',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _usernameController,
                    decoration: InputDecoration(
                      hintText: 'e.g. demo@udyogbill.com or 9876543210',
                      prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF64748B)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter email or mobile' : null,
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Password',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      hintText: 'Enter password',
                      prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF64748B)),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          color: const Color(0xFF64748B),
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    validator: (val) => (val == null || val.isEmpty) ? 'Please enter password' : null,
                  ),
                  const SizedBox(height: 20),

                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 2,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            'Login to Business',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),

                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _usernameController.text = 'demo@udyogbill.com';
                            _passwordController.text = 'Udyogbill';
                          },
                          icon: const Icon(Icons.flash_on, size: 16, color: AppTheme.accent),
                          label: const Text('Fill Demo ID', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _usernameController.text = 'superadmin@udyogbill.com';
                            _passwordController.text = 'Saurabh@1993';
                          },
                          icon: const Icon(Icons.security, size: 16, color: AppTheme.primary),
                          label: const Text('Super Admin', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  TextButton.icon(
                    onPressed: _loginOfflineDirectly,
                    icon: const Icon(Icons.offline_bolt_outlined, size: 18, color: AppTheme.success),
                    label: const Text(
                      'Offline Demo Mode (No Login Required)',
                      style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),

                  const SizedBox(height: 16),

                  InkWell(
                    onTap: () => setState(() => _showServerSettings = !_showServerSettings),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _showServerSettings ? Icons.keyboard_arrow_up : Icons.settings,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _showServerSettings ? 'Hide Server Settings' : 'Server Connection Settings',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),

                  if (_showServerSettings) ...[
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _serverUrlController,
                      decoration: InputDecoration(
                        labelText: 'API Base URL',
                        hintText: 'https://udyogbill.com/api/v1',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        isDense: true,
                      ),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
