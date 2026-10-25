import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../app/constants/app_constants.dart';
import '../../../app/shell/native_shell_screen.dart';
import '../../../core/database/app_database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/sync/sync_service.dart';
import '../../../app/theme/app_theme.dart';
import '../../pharma_sfa/screens/pharma_sfa_shell_screen.dart';
import 'register_business_screen.dart';

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

  void _showForgotPasswordDialog() {
    final emailPhoneCtrl = TextEditingController(text: _usernameController.text);
    final otpCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    bool otpSent = false;
    bool isResetting = false;
    String? dialogError;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.lock_reset_rounded, color: AppTheme.primary, size: 24),
              ),
              const SizedBox(width: 10),
              Text(
                'Reset Password',
                style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (dialogError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Text(
                      dialogError!,
                      style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  otpSent
                      ? 'Enter the 6-digit OTP sent to your email/phone along with your new password.'
                      : 'Enter your registered email address or mobile number to receive a password reset OTP.',
                  style: GoogleFonts.plusJakartaSans(fontSize: 12.5, color: const Color(0xFF64748B)),
                ),
                const SizedBox(height: 14),
                if (!otpSent) ...[
                  TextFormField(
                    controller: emailPhoneCtrl,
                    decoration: InputDecoration(
                      labelText: 'Email or 10-Digit Mobile',
                      isDense: true,
                      prefixIcon: const Icon(Icons.person_outline, size: 18),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ] else ...[
                  TextFormField(
                    controller: otpCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                    decoration: InputDecoration(
                      labelText: 'Enter 6-Digit OTP',
                      isDense: true,
                      prefixIcon: const Icon(Icons.pin_outlined, size: 18),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: newPassCtrl,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Create New Password',
                      isDense: true,
                      prefixIcon: const Icon(Icons.lock_outline, size: 18),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: isResetting
                  ? null
                  : () async {
                      final input = emailPhoneCtrl.text.trim();
                      if (input.isEmpty) {
                        setDialogState(() => dialogError = 'Please enter email or mobile number.');
                        return;
                      }

                      setDialogState(() {
                        isResetting = true;
                        dialogError = null;
                      });

                      final client = ApiClient(baseUrl: _serverUrlController.text.trim().isNotEmpty
                          ? _serverUrlController.text.trim()
                          : AppConstants.productionApiUrl);

                      if (!otpSent) {
                        try {
                          final res = await client.post('/auth/forgot-password', data: {'emailOrPhone': input});
                          if (res.statusCode == 200 || res.statusCode == 204) {
                            setDialogState(() {
                              otpSent = true;
                              isResetting = false;
                            });
                          } else {
                            setDialogState(() {
                              dialogError = res.data?['message'] ?? 'Could not send OTP.';
                              isResetting = false;
                            });
                          }
                        } catch (e) {
                          setDialogState(() {
                            dialogError = 'Error sending OTP. Please check input and network.';
                            isResetting = false;
                          });
                        }
                      } else {
                        final otp = otpCtrl.text.trim();
                        final newPass = newPassCtrl.text;
                        if (otp.length < 4 || newPass.length < 6) {
                          setDialogState(() {
                            dialogError = 'Enter valid OTP and password (min 6 chars).';
                            isResetting = false;
                          });
                          return;
                        }

                        try {
                          final res = await client.post('/auth/reset-password', data: {
                            'emailOrPhone': input,
                            'otp': otp,
                            'newPassword': newPass,
                          });
                          if (res.statusCode == 200 || res.statusCode == 204) {
                            if (ctx.mounted) {
                              Navigator.pop(ctx);
                            }
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Password reset successfully! Please login.'),
                                  backgroundColor: AppTheme.success,
                                ),
                              );
                            }
                          } else {
                            setDialogState(() {
                              dialogError = res.data?['message'] ?? 'Invalid OTP or expired.';
                              isResetting = false;
                            });
                          }
                        } catch (e) {
                          setDialogState(() {
                            dialogError = 'Error resetting password. Please check details.';
                            isResetting = false;
                          });
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: isResetting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(otpSent ? 'Reset Password' : 'Send OTP'),
            ),
          ],
        ),
      ),
    );
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
        final rolesList = (user['roles'] as List? ?? []).map((r) => r.toString()).toList();
        final isSalesRep = rolesList.contains('SalesRep') ||
            rolesList.contains('FSE') ||
            rolesList.contains('ASM') ||
            rolesList.contains('RSM') ||
            rolesList.contains('ZSM');

        if (widget.isSfaOnly) {
          // Dedicated Field SFA App (udyogbill-sfa.apk)
          if (isSuperAdmin) {
            setState(() {
              _errorMessage = 'Super Admin accounts manage the platform from the web portal. Please log into https://udyogbill.com/admin/sales-force.';
            });
            return;
          }
          // Internal Sales Reps & Store SFA staff are allowed!
        } else {
          // Dedicated Retail Billing App (udyogbill-billing.apk)
          if (isSuperAdmin) {
            setState(() {
              _errorMessage = 'Super Admin account has no retail store attached. Please log into the Web Admin Portal.';
            });
            return;
          }
          if (isSalesRep || tenantId.isEmpty || tenantId == 'null') {
            setState(() {
              _errorMessage = 'This account is registered for Field Sales Force (SFA). Please log in using the UdyogBill SFA App.';
            });
            return;
          }
        }

        final role = rolesList.isNotEmpty
            ? rolesList.first.toString()
            : (data['role'] ?? (isSalesRep ? 'SalesRep' : 'User'));

        // Wipe local SQLite to ensure 100% clean-slate isolation for the new tenant
        await AppDatabase.instance.clearAllData();

        await _storage.write(key: AppConstants.keyToken, value: token.toString());
        await _storage.write(key: AppConstants.keyTenantId, value: tenantId);
        await _storage.write(key: AppConstants.keyTenantName, value: tenantName);
        await _storage.write(key: AppConstants.keyUserRole, value: role.toString());
        await _storage.write(key: 'is_internal_sales_rep', value: isSalesRep ? 'true' : 'false');
        final industryCode = (user['industryCode'] ?? user['industry'] ?? data['industryCode'] ?? '').toString();
        if (industryCode.isNotEmpty && industryCode != 'null') {
          await _storage.write(key: AppConstants.keyTenantIndustry, value: industryCode.toUpperCase());
        }
        if (fullName.isNotEmpty) {
          await _storage.write(key: 'user_full_name', value: fullName);
        }
        await _storage.write(key: AppConstants.keyApiUrl, value: serverUrl);

        // Auto-sync real cloud catalog, customers and invoices only if a store tenant is attached
        if (tenantId.isNotEmpty && tenantId != 'null') {
          final syncService = SyncService();
          syncService.syncCatalogFromWeb().catchError((_) => 0);
          syncService.syncPartiesFromWeb().catchError((_) => 0);
          syncService.syncInvoicesFromWeb(tenantId: tenantId).catchError((_) => 0);
        }

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
      backgroundColor: AppTheme.bgLight,
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
                        color: const Color(0xFFFF6A00).withValues(alpha: 0.18),
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
                        color: const Color(0xFFFF8533).withValues(alpha: 0.15),
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
                            color: const Color(0xFFFF6A00).withValues(alpha: 0.12),
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
                                ? 'Field Force & Sales Automation (SFA)'
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
                                child: const Icon(Icons.person_outline_rounded, color: AppTheme.primary, size: 20),
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
                                borderSide: const BorderSide(color: AppTheme.primary, width: 1.8),
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
                                child: const Icon(Icons.lock_outline_rounded, color: AppTheme.primary, size: 20),
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
                                borderSide: const BorderSide(color: AppTheme.primary, width: 1.8),
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
                          const SizedBox(height: 8),

                          // Forgot Password Button
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _showForgotPasswordDialog,
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: const Size(50, 30),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                'Forgot Password?',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ─── LOGIN BUTTON WITH GRADIENT ───────────────────
                          Container(
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                                colors: [
                                  Color(0xFFFF6A00), // Brand Orange
                                  Color(0xFFFF8533), // Light Orange
                                ],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFFF6A00).withValues(alpha: 0.38),
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

                  const SizedBox(height: 20),

                  // ─── REGISTER NEW BUSINESS ACTION CARD ─────────────────────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFFEDD5), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFF6A00).withValues(alpha: 0.08),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.storefront_rounded, color: AppTheme.primary, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'New to UdyogBill?',
                                style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Register your store in 60 seconds with GST auto-fill.',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 11.5,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const RegisterBusinessScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(
                            'Register',
                            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
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

                  // Server settings only shown if activated by 5 taps on logo
                  if (_showServerSettings) ...[
                    const SizedBox(height: 16),
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Developer: Gateway Endpoint',
                                style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  color: const Color(0xFF334155),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, size: 16),
                                onPressed: () => setState(() => _showServerSettings = false),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
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
