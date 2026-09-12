import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/mobile_remote_config_service.dart';

class InAppPromoBannerDialog extends StatelessWidget {
  final MobileRemoteConfig config;

  const InAppPromoBannerDialog({
    super.key,
    required this.config,
  });

  static Future<void> showIfEligible(BuildContext context) async {
    final service = MobileRemoteConfigService();
    final shouldShow = await service.shouldShowPopupBanner();
    if (!shouldShow || !context.mounted) return;

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => InAppPromoBannerDialog(config: service.config),
    );

    await service.markPopupBannerShown();
  }

  Future<void> _handleCta(BuildContext context) async {
    final url = config.popupBannerCtaUrl.trim();
    if (url.isNotEmpty) {
      try {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      } catch (_) {}
    }
    if (context.mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 16,
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 380),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Image or Banner Header
            Stack(
              children: [
                if (config.popupBannerImageUrl.isNotEmpty)
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.network(
                      config.popupBannerImageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _buildFallbackHeader(),
                    ),
                  )
                else
                  _buildFallbackHeader(),

                // Close "X" Button
                Positioned(
                  top: 8,
                  right: 8,
                  child: Material(
                    color: Colors.black45,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => Navigator.of(context).pop(),
                      child: const Padding(
                        padding: EdgeInsets.all(6),
                        child: Icon(Icons.close, size: 18, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (config.popupBannerTitle.isNotEmpty)
                    Text(
                      config.popupBannerTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                  if (config.popupBannerDescription.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      config.popupBannerDescription,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF475569),
                        height: 1.4,
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: config.primaryColor,
                        foregroundColor: Colors.white,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: () => _handleCta(context),
                      child: Text(
                        config.popupBannerCtaText.isNotEmpty
                            ? config.popupBannerCtaText
                            : 'Check Offer',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'Remind Me Later',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackHeader() {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [config.primaryColor, config.accentColorObj],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.campaign, size: 54, color: Colors.white70),
      ),
    );
  }
}
