import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../app/theme/app_theme.dart';
import '../database/daos/item_dao.dart';

class ContinuousBarcodeScannerSheet extends StatefulWidget {
  final String title;
  final Function(ItemModel item) onItemScanned;
  final Function(String barcode)? onUnknownBarcode;
  final Widget Function(BuildContext context)? bottomCartWidget;
  final bool initialContinuousMode;

  const ContinuousBarcodeScannerSheet({
    super.key,
    this.title = 'High-Speed Barcode Scanner',
    required this.onItemScanned,
    this.onUnknownBarcode,
    this.bottomCartWidget,
    this.initialContinuousMode = true,
  });

  @override
  State<ContinuousBarcodeScannerSheet> createState() => _ContinuousBarcodeScannerSheetState();
}

class _ContinuousBarcodeScannerSheetState extends State<ContinuousBarcodeScannerSheet> {
  final ItemDao _itemDao = ItemDao();
  final MobileScannerController _controller = MobileScannerController();

  late bool _isContinuous;
  bool _isTorchOn = false;
  String? _lastScannedBarcode;
  DateTime? _lastScannedTime;
  String? _lastItemName;
  int _sessionScanCount = 0;
  bool _showSuccessFlash = false;

  @override
  void initState() {
    super.initState();
    _isContinuous = widget.initialContinuousMode;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleBarcodeDetected(BarcodeCapture capture) async {
    for (final b in capture.barcodes) {
      final code = b.rawValue?.trim();
      if (code == null || code.isEmpty) continue;

      final now = DateTime.now();
      // Debounce exact duplicate barcode within 1200ms
      if (_lastScannedBarcode == code && _lastScannedTime != null) {
        if (now.difference(_lastScannedTime!).inMilliseconds < 1200) {
          continue;
        }
      }

      _lastScannedBarcode = code;
      _lastScannedTime = now;

      final item = await _itemDao.getByBarcode(code);
      if (mounted) {
        if (item != null) {
          setState(() {
            _sessionScanCount++;
            _lastItemName = item.name;
            _showSuccessFlash = true;
          });

          widget.onItemScanned(item);

          Future.delayed(const Duration(milliseconds: 300), () {
            if (mounted) setState(() => _showSuccessFlash = false);
          });

          if (!_isContinuous) {
            Navigator.pop(context);
            break;
          }
        } else {
          setState(() {
            _lastItemName = 'Unknown barcode: $code';
          });
          if (widget.onUnknownBarcode != null) {
            widget.onUnknownBarcode!(code);
          }
        }
      }
      break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Top Control Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.title,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          _isContinuous ? '⚡ Bulk Continuous Mode' : 'Single Scan Mode',
                          style: TextStyle(
                            color: _isContinuous ? const Color(0xFF34D399) : const Color(0xFF94A3B8),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Torch Button
                    IconButton(
                      icon: Icon(
                        _isTorchOn ? Icons.flash_on : Icons.flash_off,
                        color: _isTorchOn ? Colors.amber : Colors.white70,
                      ),
                      tooltip: 'Toggle Flashlight',
                      onPressed: () {
                        setState(() => _isTorchOn = !_isTorchOn);
                        _controller.toggleTorch();
                      },
                    ),
                    // Continuous Mode Toggle Chip
                    FilterChip(
                      label: Text(
                        _isContinuous ? 'Bulk ON' : 'Single',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _isContinuous ? Colors.black : Colors.white,
                        ),
                      ),
                      selected: _isContinuous,
                      selectedColor: const Color(0xFF34D399),
                      backgroundColor: const Color(0xFF334155),
                      onSelected: (val) => setState(() => _isContinuous = val),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Scanner Camera Area
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  controller: _controller,
                  onDetect: _handleBarcodeDetected,
                ),

                // Viewfinder Target Frame
                Center(
                  child: Container(
                    width: 260,
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _showSuccessFlash ? const Color(0xFF10B981) : const Color(0xFF6366F1),
                        width: _showSuccessFlash ? 4 : 2,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      color: _showSuccessFlash ? const Color(0xFF10B981).withValues(alpha: 0.25) : Colors.transparent,
                    ),
                  ),
                ),

                // Live Scan Indicator Overlay
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        _sessionScanCount == 0
                            ? 'Point camera at product barcode'
                            : 'Scanned $_sessionScanCount times in this session',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ),
                ),

                // Last item pill feedback
                if (_lastItemName != null)
                  Positioned(
                    bottom: 16,
                    left: 20,
                    right: 20,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: _lastItemName!.startsWith('Unknown')
                            ? const Color(0xFFDC2626).withValues(alpha: 0.95)
                            : const Color(0xFF059669).withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _lastItemName!.startsWith('Unknown') ? Icons.warning_amber_rounded : Icons.check_circle,
                            color: Colors.white,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _lastItemName!,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Bottom Cart / Done Strip
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(top: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.bottomCartWidget != null) ...[
                  widget.bottomCartWidget!(context),
                  const SizedBox(height: 10),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.done_all_rounded, size: 18),
                    label: Text(
                      _sessionScanCount > 0
                          ? 'Done Scanning ($_sessionScanCount Items Added)'
                          : 'Close Scanner',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.success,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
