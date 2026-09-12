import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../app/constants/app_constants.dart';
import '../../../app/theme/app_theme.dart';
import '../../../app/shell/native_shell_screen.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/sync_service.dart';

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
        final tenantId = (user['tenantId'] ?? data['tenantId'] ?? '').toString();
        final tenantName = (user['businessName'] ?? data['tenantName'] ?? 'My Business').toString();
        final fullName = (user['fullName'] ?? '').toString();
        final isSuperAdmin = user['isSuperAdmin'] == true;

        if (isSuperAdmin || tenantId.isEmpty || tenantId == 'null') {
          setState(() {
            _errorMessage = 'Super Admin account has no store attached. Please log in with a Business Admin or Staff account.';
          });
          return;
        }

        final rolesList = user['roles'] as List? ?? [];
        final role = rolesList.isNotEmpty
            ? rolesList.first.toString()
            : (data['role'] ?? 'User');

        await _storage.write(key: AppConstants.keyToken, value: token.toString());
        await _storage.write(key: AppConstants.keyTenantId, value: tenantId);
        await _storage.write(key: AppConstants.keyTenantName, value: tenantName);
        await _storage.write(key: AppConstants.keyUserRole, value: role.toString());
        if (fullName.isNotEmpty) {
          await _storage.write(key: 'user_full_name', value: fullName);
        }
        await _storage.write(key: AppConstants.keyApiUrl, value: serverUrl);

        // Auto-sync real cloud catalog and customers in background
        final syncService = SyncService();
        syncService.syncCatalogFromWeb().catchError((_) => 0);
        syncService.syncPartiesFromWeb().catchError((_) => 0);

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Stack(
        children: [
          // ─── TOP AMBIENT HERO GRADIENT ──────────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 310,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF0F172A), // Slate 900
                    Color(0xFF1E1B4B), // Indigo 950
                    Color(0xFF312E81), // Indigo 900
                    Color(0xFF4338CA), // Indigo 700
                  ],
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(36),
                  bottomRight: Radius.circular(36),
                ),
              ),
              child: Stack(
                children: [
                  // Decorative ambient orb 1
                  Positioned(
                    top: -40,
                    right: -30,
                    child: Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF6366F1).withValues(alpha: 0.22),
                      ),
                    ),
                  ),
                  // Decorative ambient orb 2
                  Positioned(
                    bottom: 20,
                    left: -40,
                    child: Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ─── SCROLLABLE CONTENT ─────────────────────────────────────────
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 10),

                  // ─── BRAND LOGO CARD (PERFECT UNCLIPPED DISPLAY) ────────
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.18),
                            blurRadius: 22,
                            offset: const Offset(0, 8),
                          ),
                          BoxShadow(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.12),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: Image.asset(
                        'assets/images/logo.png',
                        height: 52,
                        fit: BoxFit.contain, // ✅ Never clips, preserves 814x306 aspect ratio!
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ─── APP EDITION BADGE ──────────────────────────────────
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF38BDF8)),
                          const SizedBox(width: 6),
                          Text(
                            widget.isSfaOnly
                                ? 'Pharma Field Force & MR Suite'
                                : 'Smart GST Billing & Executive POS',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ─── ELEVATED LOGIN CARD ────────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.08),
                          blurRadius: 26,
                          offset: const Offset(0, 10),
                        ),
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.03),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 26),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Card Header
                          Text(
                            'Sign In to Business',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Enter your mobile, email or staff username',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              color: const Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 22),

                          // Error alert
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF1F2), // Rose 50
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFFFECDD3)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: Color(0xFFE11D48), size: 20),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: GoogleFonts.plusJakartaSans(
                                        color: const Color(0xFFBE123C),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 18),
                          ],

                          // Email / Mobile Field
                          Text(
                            'Email / Mobile / Username',
                            style: GoogleFonts.plusJakartaSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _usernameController,
                            style: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'e.g. 9876543210 or admin@store.com',
                              hintStyle: GoogleFonts.plusJakartaSans(color: const Color(0xFF94A3B8), fontSize: 13),
                              prefixIcon: Container(
                                margin: const EdgeInsets.only(left: 12, right: 10),
                                child: const Icon(Icons.person_outline_rounded, color: Color(0xFF6366F1), size: 20),
                              ),
                              prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.8),
                              ),
                              errorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE11D48)),
                              ),
                              focusedErrorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE11D48), width: 1.8),
                              ),
                            ),
                            validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter email or mobile' : null,
                          ),
                          const SizedBox(height: 18),

                          // Password Field
                          Text(
                            'Password',
                            style: GoogleFonts.plusJakartaSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            style: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'Enter your password',
                              hintStyle: GoogleFonts.plusJakartaSans(color: const Color(0xFF94A3B8), fontSize: 13),
                              prefixIcon: Container(
                                margin: const EdgeInsets.only(left: 12, right: 10),
                                child: const Icon(Icons.lock_outline_rounded, color: Color(0xFF6366F1), size: 20),
                              ),
                              prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                  color: const Color(0xFF94A3B8),
                                  size: 20,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.8),
                              ),
                              errorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE11D48)),
                              ),
                              focusedErrorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: const BorderSide(color: Color(0xFFE11D48), width: 1.8),
                              ),
                            ),
                            validator: (val) => (val == null || val.isEmpty) ? 'Please enter password' : null,
                          ),
                          const SizedBox(height: 24),

                          // ─── LOGIN BUTTON WITH GRADIENT ───────────────────
                          Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                                colors: [
                                  Color(0xFF4F46E5), // Indigo 600
                                  Color(0xFF6366F1), // Indigo 500
                                ],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF4F46E5).withValues(alpha: 0.38),
                                  blurRadius: 18,
                                  offset: const Offset(0, 7),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: _isLoading ? null : _handleLogin,
                                borderRadius: BorderRadius.circular(14),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  child: Center(
                                    child: _isLoading
                                        ? const SizedBox(
                                            height: 22,
                                            width: 22,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                              color: Colors.white,
                                            ),
                                          )
                                        : Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                'Login to Business',
                                                style: GoogleFonts.plusJakartaSans(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w700,
                                                  color: Colors.white,
                                                  letterSpacing: 0.3,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              const Icon(
                                                Icons.arrow_forward_rounded,
                                                color: Colors.white,
                                                size: 18,
                                              ),
                                            ],
                                          ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ─── TRUST & SECURITY BADGE ─────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield_outlined, size: 14, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(
                        '256-Bit SSL Encrypted • Cloud Sync Active',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // ─── SERVER SETTINGS ACCORDION ──────────────────────────
                  Center(
                    child: InkWell(
                      onTap: () => setState(() => _showServerSettings = !_showServerSettings),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _showServerSettings ? Icons.keyboard_arrow_up_rounded : Icons.tune_rounded,
                              size: 16,
                              color: const Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _showServerSettings ? 'Hide Server Settings' : 'Server Connection Settings',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  if (_showServerSettings) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'API Gateway Endpoint',
                            style: GoogleFonts.plusJakartaSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _serverUrlController,
                            style: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              hintText: 'https://udyogbill.com/api/v1',
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                              ),
                              isDense: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
