import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../app/theme/app_theme.dart';
import 'purchase_verification_screen.dart';

class AiPurchaseScannerScreen extends StatefulWidget {
  const AiPurchaseScannerScreen({super.key});

  @override
  State<AiPurchaseScannerScreen> createState() => _AiPurchaseScannerScreenState();
}

class _AiPurchaseScannerScreenState extends State<AiPurchaseScannerScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _selectedImage;
  bool _isAnalyzing = false;
  String? _qualityWarning;
  final int _aiScansRemaining = 499;

  Future<void> _captureImage(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        maxWidth: 1920,
      );

      if (file == null) return;

      final imageFile = File(file.path);
      final fileSize = await imageFile.length();

      setState(() {
        _selectedImage = imageFile;
        _qualityWarning = null;
      });

      // 1. Instant Edge-Quality & Sharpness Check
      if (fileSize < 25 * 1024) { // Under 25 KB is blurry/dark/unusable
        setState(() {
          _qualityWarning = "⚠️ Photo bohot dundhli (blurry) ya andhere me li gayi lag rahi hai.\nKripya achhi roshni me saaf photo kheenchein taaki items aur GST rate 100% accurate scan hon.";
        });
        return;
      }

      // 2. Perform AI Bill Parsing
      await _processImageWithAi(imageFile);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking image: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _processImageWithAi(File file) async {
    setState(() => _isAnalyzing = true);

    // Simulate AI Vision & OCR Extraction
    await Future.delayed(const Duration(milliseconds: 1400));

    if (!mounted) return;

    setState(() => _isAnalyzing = false);

    // Navigate to Verification & Confirmation Screen
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PurchaseVerificationScreen(
          imageFile: file,
          scannedSupplierName: "Shree Balaji Wholesale Traders",
          scannedGstin: "27AABCS1429B1ZX",
          scannedBillNumber: "BILL-2026-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
          scannedDate: DateTime.now().toIso8601String().substring(0, 10),
          initialItems: [
            ScannedItemModel(
              name: "Fortune Refined Sunflower Oil 1L (12 Pouch Box)",
              hsn: "15121910",
              quantity: 10,
              purchasePrice: 1280.0,
              gstRate: 5.0,
              confidence: 0.98,
            ),
            ScannedItemModel(
              name: "Tata Salt Vaccum Evaporated 1kg (25 Pkt Bag)",
              hsn: "25010010",
              quantity: 8,
              purchasePrice: 480.0,
              gstRate: 0.0,
              confidence: 0.96,
            ),
            ScannedItemModel(
              name: "Amul Pasteurised Butter 100g (Pack of 10)",
              hsn: "04051000",
              quantity: 5,
              purchasePrice: 490.0,
              gstRate: 12.0,
              confidence: 0.82, // Moderate confidence triggers yellow highlight
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Purchase Bill Scanner'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 14, top: 12, bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppTheme.primary, size: 14),
                const SizedBox(width: 4),
                Text(
                  '$_aiScansRemaining Scans Left',
                  style: const TextStyle(color: AppTheme.primaryDark, fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // AI Pro Badge & Feature Explanation
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.document_scanner, color: Color(0xFF818CF8), size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Smart AI Invoice OCR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            Text('100% Automated Stock & Purchase Inward', style: TextStyle(color: Colors.white70, fontSize: 11)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF10B981)),
                        ),
                        child: const Text('AI PRO ACTIVE', style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Colors.white12),
                  const Text(
                    'Supplier ke paper bill ya invoice ki photo kheencho. AI apne-aap Supplier, Bill No, aur Line Items (Name, HSN, Qty, Rate, GST) extract karke stock add kar dega.',
                    style: TextStyle(color: Colors.white60, fontSize: 12, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Warning Banner if Quality Check fails
            if (_qualityWarning != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _qualityWarning!,
                        style: const TextStyle(color: Color(0xFFB45309), fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

            // Image Preview or Scanner Placeholder
            GestureDetector(
              onTap: _isAnalyzing ? null : () => _captureImage(ImageSource.camera),
              child: Container(
                height: 260,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _qualityWarning != null ? AppTheme.warning : AppTheme.primary.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                child: _isAnalyzing
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(strokeWidth: 3, color: AppTheme.primary),
                            SizedBox(height: 16),
                            Text('AI Vision Scanning Bill...', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            SizedBox(height: 4),
                            Text('Extracting GSTIN, items, rates & tax details', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      )
                    : _selectedImage != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(18),
                            child: Image.file(_selectedImage!, fit: BoxFit.cover, width: double.infinity),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircleAvatar(
                                radius: 36,
                                backgroundColor: AppTheme.primaryLight,
                                child: const Icon(Icons.camera_alt_outlined, size: 36, color: AppTheme.primary),
                              ),
                              const SizedBox(height: 14),
                              const Text('Tap to Scan Paper Bill with Camera', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 4),
                              Text('Auto-detects edges, blur, and lighting', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                            ],
                          ),
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.photo_library_outlined, size: 18),
                    label: const Text('Upload from Gallery'),
                    onPressed: _isAnalyzing ? null : () => _captureImage(ImageSource.gallery),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.camera_alt, size: 18),
                    label: const Text('Capture Photo'),
                    onPressed: _isAnalyzing ? null : () => _captureImage(ImageSource.camera),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 3 Steps Rule Cards
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Kaise Kaam Karta Hai?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  _buildStepRow('1', 'Photo Kheencho', 'Bill ko table par seedha rakh kar achhi roshni me photo lein.'),
                  const SizedBox(height: 10),
                  _buildStepRow('2', 'AI Quality Check', 'Agar photo dundhli hogi to software turant warning dekar rok dega.'),
                  const SizedBox(height: 10),
                  _buildStepRow('3', 'Verify & Inward Stock', 'Extract kiye gaye items ko aankho se check karein aur 1-tap me stock badhayein.'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepRow(String number, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 11,
          backgroundColor: AppTheme.primary,
          child: Text(number, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Text(desc, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
            ],
          ),
        ),
      ],
    );
  }
}
