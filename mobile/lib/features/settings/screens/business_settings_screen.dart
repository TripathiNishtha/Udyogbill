import 'package:flutter/material.dart';
import '../../../../app/theme/app_theme.dart';

class BusinessSettingsScreen extends StatefulWidget {
  const BusinessSettingsScreen({super.key});

  @override
  State<BusinessSettingsScreen> createState() => _BusinessSettingsScreenState();
}

class _BusinessSettingsScreenState extends State<BusinessSettingsScreen> {
  final _businessNameCtrl = TextEditingController(text: "UdyogBill Enterprise");
  final _gstinCtrl = TextEditingController(text: "27AABCT1334M1Z5");
  final _phoneCtrl = TextEditingController(text: "9876543210");
  final _emailCtrl = TextEditingController(text: "support@udyogbill.com");
  final _addressCtrl = TextEditingController(text: "Shop 104, Trade Centre, Market Road");
  final _cityCtrl = TextEditingController(text: "Mumbai");
  final _stateCtrl = TextEditingController(text: "Maharashtra");
  final _pincodeCtrl = TextEditingController(text: "400001");

  // Invoicing & Prefix
  final _prefixCtrl = TextEditingController(text: "INV-");
  final _termsCtrl = TextEditingController(text: "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged after due date.");
  String _selectedTemplate = "GST Marg Green";
  String _defaultPrinter = "POS Thermal 80mm";

  // Bank & UPI
  final _bankNameCtrl = TextEditingController(text: "State Bank of India");
  final _accNoCtrl = TextEditingController(text: "38920199201");
  final _ifscCtrl = TextEditingController(text: "SBIN0001234");
  final _upiIdCtrl = TextEditingController(text: "udyogbill@sbi");

  bool _isSaving = false;

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _gstinCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _pincodeCtrl.dispose();
    _prefixCtrl.dispose();
    _termsCtrl.dispose();
    _bankNameCtrl.dispose();
    _accNoCtrl.dispose();
    _ifscCtrl.dispose();
    _upiIdCtrl.dispose();
    super.dispose();
  }

  void _saveSettings() async {
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Business Settings & Invoice Format saved successfully!'),
          backgroundColor: AppTheme.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Business & Invoice Settings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check, color: AppTheme.primary),
            onPressed: _isSaving ? null : _saveSettings,
            tooltip: 'Save Settings',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Company Branding
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset('assets/images/logo.png', width: 64, height: 64, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Official App & Brand Logo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text('Appears on A4 GST invoices, Thermal POS receipts, and Android Launcher.', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Section 1: Business Profile
            _buildSectionCard(
              title: 'Business Profile (GST & Contact)',
              icon: Icons.storefront_outlined,
              children: [
                _buildTextField('Legal Business Name', _businessNameCtrl),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(flex: 6, child: _buildTextField('GSTIN (15 Digits)', _gstinCtrl, isUpper: true)),
                    const SizedBox(width: 10),
                    Expanded(flex: 5, child: _buildTextField('Mobile Phone', _phoneCtrl, keyboardType: TextInputType.phone)),
                  ],
                ),
                const SizedBox(height: 12),
                _buildTextField('Email Address', _emailCtrl, keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 12),
                _buildTextField('Complete Street Address', _addressCtrl),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(flex: 4, child: _buildTextField('City', _cityCtrl)),
                    const SizedBox(width: 8),
                    Expanded(flex: 4, child: _buildTextField('State', _stateCtrl)),
                    const SizedBox(width: 8),
                    Expanded(flex: 3, child: _buildTextField('PIN Code', _pincodeCtrl, keyboardType: TextInputType.number)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Section 2: Invoicing Templates & Numbering
            _buildSectionCard(
              title: 'Invoice Templates & Numbering',
              icon: Icons.receipt_long_outlined,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _selectedTemplate,
                  decoration: const InputDecoration(
                    labelText: 'Default Invoice Layout Format',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'GST Marg Green', child: Text('B2B GST Marg Green (Classic)')),
                    DropdownMenuItem(value: 'GST Modern Blue', child: Text('B2B Modern Blue (Enterprise)')),
                    DropdownMenuItem(value: 'POS Thermal 80mm', child: Text('POS Thermal Receipt (80mm)')),
                    DropdownMenuItem(value: 'POS Thermal 58mm', child: Text('POS Thermal Receipt (58mm)')),
                    DropdownMenuItem(value: 'Cash Memo Retail', child: Text('Retail Cash Memo Format')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedTemplate = val);
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _defaultPrinter,
                  decoration: const InputDecoration(
                    labelText: 'Default Hardware / Printer Output',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'POS Thermal 80mm', child: Text('Thermal Printer (80mm / 3 inch)')),
                    DropdownMenuItem(value: 'POS Thermal 58mm', child: Text('Thermal Printer (58mm / 2 inch)')),
                    DropdownMenuItem(value: 'A4 Office Printer', child: Text('Standard Desktop Printer (A4 Sheet)')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _defaultPrinter = val);
                  },
                ),
                const SizedBox(height: 12),
                _buildTextField('Invoice Series Prefix', _prefixCtrl, isUpper: true),
                const SizedBox(height: 12),
                _buildTextField('Terms & Conditions (Printed on Invoice)', _termsCtrl, maxLines: 3),
              ],
            ),
            const SizedBox(height: 16),

            // Section 3: Bank Details & UPI QR
            _buildSectionCard(
              title: 'Bank & Instant UPI QR Payments',
              icon: Icons.account_balance_outlined,
              children: [
                _buildTextField('Bank Name', _bankNameCtrl),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(flex: 6, child: _buildTextField('Account Number', _accNoCtrl, keyboardType: TextInputType.number)),
                    const SizedBox(width: 10),
                    Expanded(flex: 5, child: _buildTextField('IFSC Code', _ifscCtrl, isUpper: true)),
                  ],
                ),
                const SizedBox(height: 12),
                _buildTextField('UPI ID / VPA (for Dynamic QR Code)', _upiIdCtrl),
              ],
            ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.save_outlined),
                label: Text(_isSaving ? 'Saving Changes...' : 'Save All Business Settings', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                onPressed: _isSaving ? null : _saveSettings,
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionCard({required String title, required IconData icon, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppTheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ],
          ),
          const Divider(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    TextInputType keyboardType = TextInputType.text,
    bool isUpper = false,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: isUpper ? TextCapitalization.characters : TextCapitalization.none,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
