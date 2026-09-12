import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/mobile_remote_config_service.dart';

class ForceUpdateScreen extends StatelessWidget {
  final MobileRemoteConfig config;

  const ForceUpdateScreen({
    super.key,
    required this.config,
  });

  Future<void> _openDownloadLink() async {
    final target = config.apkDownloadUrl.isNotEmpty
        ? config.apkDownloadUrl
        : config.playStoreUrl;

    if (target.isNotEmpty) {
      try {
        final uri = Uri.parse(target);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      } catch (_) {}
    }
  }

  Future<void> _openWhatsAppSupport() async {
    final phone = config.supportWhatsAppNumber.replaceAll('+', '').replaceAll(' ', '');
    final url = 'https://wa.me/$phone?text=Hello%20UdyogBill%20Support,%20I%20need%20help%20updating%20my%20app.';
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // Prevents closing or bypassing force-update
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Warning Icon
                    Center(
                      child: Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                            width: 2,
                          ),
                        ),
                        child: const Icon(
                          Icons.system_update_rounded,
                          size: 46,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Title
                    const Text(
                      'Update Required',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Subtitle
                    Text(
                      'A critical version update is required to continue using ${config.appDisplayName}. Your current version is no longer supported.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF94A3B8),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Changelog Card
                    if (config.updateChangelog.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.auto_awesome, size: 16, color: Color(0xFF38BDF8)),
                                SizedBox(width: 8),
                                Text(
                                  "What's New in this Version:",
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFFE2E8F0),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              config.updateChangelog,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF94A3B8),
                                height: 1.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Download Button
                    SizedBox(
                      height: 50,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: config.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 4,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: _openDownloadLink,
                        icon: const Icon(Icons.download_rounded),
                        label: const Text(
                          'Download & Update Now',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // WhatsApp Support Help
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF22C55E),
                        side: const BorderSide(color: Color(0xFF22C55E)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: _openWhatsAppSupport,
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      label: const Text(
                        'Contact Support on WhatsApp',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
