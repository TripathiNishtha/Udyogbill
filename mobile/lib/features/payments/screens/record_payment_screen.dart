import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/database/daos/payment_dao.dart';
import '../../../../core/sync/sync_service.dart';

class RecordPaymentScreen extends StatefulWidget {
  final PartyModel? preselectedParty;

  const RecordPaymentScreen({super.key, this.preselectedParty});

  @override
  State<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends State<RecordPaymentScreen> {
  final PaymentDao _paymentDao = PaymentDao();
  final PartyDao _partyDao = PartyDao();
  final SyncService _syncService = SyncService();

  String _paymentNumber = 'Loading...';
  DateTime _paymentDate = DateTime.now();

  PartyModel? _selectedParty;
  List<PartyModel> _customers = [];

  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _refNumberController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  int _paymentMode = 1; // 1 = Cash, 2 = UPI, 3 = Cheque, 4 = Bank Transfer
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _refNumberController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final nextNo = await _paymentDao.getNextPaymentNumber();
    final all = await _partyDao.getAllParties(partyType: 1);

    if (mounted) {
      setState(() {
        _paymentNumber = nextNo;
        _customers = all;
        if (widget.preselectedParty != null) {
          _selectedParty = widget.preselectedParty;
          if (_selectedParty!.outstandingBalance > 0) {
            _amountController.text = _selectedParty!.outstandingBalance.toStringAsFixed(2);
          }
        } else if (all.isNotEmpty) {
          _selectedParty = all.first;
          if (all.first.outstandingBalance > 0) {
            _amountController.text = all.first.outstandingBalance.toStringAsFixed(2);
          }
        }
      });
    }
  }

  void _onPartyChanged(PartyModel? p) {
    setState(() {
      _selectedParty = p;
      if (p != null && p.outstandingBalance > 0) {
        _amountController.text = p.outstandingBalance.toStringAsFixed(2);
      }
    });
  }

  void _applyQuickAmount(double amt) {
    setState(() {
      _amountController.text = amt.toStringAsFixed(2);
    });
  }

  Future<void> _savePayment({bool shareWhatsApp = false}) async {
    if (_selectedParty == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a customer'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0.0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid payment amount'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      const storage = FlutterSecureStorage();
      final activeTenantId = await storage.read(key: AppConstants.keyTenantId) ?? '';
      final storeName = await storage.read(key: AppConstants.keyTenantName) ?? 'UdyogBill';

      final paymentId = const Uuid().v4();
      final payment = PaymentModel(
        id: paymentId,
        tenantId: activeTenantId,
        paymentNumber: _paymentNumber,
        partyId: _selectedParty!.id,
        partyName: _selectedParty!.name,
        partyPhone: _selectedParty!.phone,
        amount: amount,
        paymentDate: _paymentDate.toIso8601String().substring(0, 10),
        paymentMode: _paymentMode,
        referenceNumber: _refNumberController.text.trim().isNotEmpty ? _refNumberController.text.trim() : null,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
        isSynced: false,
        createdAt: DateTime.now().toIso8601String(),
      );

      // Insert and deduct outstanding balance in SQLite
      await _paymentDao.insertPayment(payment);

      // Queue for background sync
      await _syncService.queueOfflinePayment(
        paymentId: paymentId,
        paymentPayload: payment.toMap(),
      );

      final newBalance = (_selectedParty!.outstandingBalance - amount);
      final modeStr = _paymentMode == 1 ? "Cash" : _paymentMode == 2 ? "UPI" : _paymentMode == 3 ? "Cheque" : "Bank Transfer";

      if (shareWhatsApp) {
        final text = '🧾 *PAYMENT RECEIPT (PAAVTI)*\n'
            '*$storeName*\n'
            '--------------------------------\n'
            'Receipt No: ${payment.paymentNumber}\n'
            'Date: ${payment.paymentDate}\n'
            'Customer: ${payment.partyName}\n'
            '--------------------------------\n'
            '*Amount Received: ₹${amount.toStringAsFixed(2)}*\n'
            'Payment Mode: $modeStr\n'
            '${payment.referenceNumber != null ? "Ref / UTR: ${payment.referenceNumber}\n" : ""}'
            '--------------------------------\n'
            'Previous Due: ₹${_selectedParty!.outstandingBalance.toStringAsFixed(2)}\n'
            '*Current Outstanding: ₹${newBalance > 0 ? newBalance.toStringAsFixed(2) : "0.00"}*\n\n'
            'Thank you for your timely payment!';

        Share.share(text, subject: 'Payment Receipt ${payment.paymentNumber}');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment of ₹${amount.toStringAsFixed(2)} recorded successfully!'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving payment: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentDue = _selectedParty?.outstandingBalance ?? 0.0;
    final payingAmount = double.tryParse(_amountController.text) ?? 0.0;
    final remainingDue = currentDue - payingAmount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Payment-In (Udhar Vasooli)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Receipt Number & Date
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Receipt Number', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        const SizedBox(height: 2),
                        Text(_paymentNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _paymentDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2030),
                      );
                      if (picked != null) setState(() => _paymentDate = picked);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Receipt Date', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.calendar_today, size: 12, color: AppTheme.primary),
                              const SizedBox(width: 4),
                              Text('${_paymentDate.day}/${_paymentDate.month}/${_paymentDate.year}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Customer Selector & Current Balance Display
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Customer / Party *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<PartyModel>(
                    key: ValueKey(_selectedParty?.id),
                    initialValue: _selectedParty,
                    isExpanded: true,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: _customers.map((p) {
                      return DropdownMenuItem(
                        value: p,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(
                              'Due: ₹${p.outstandingBalance.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: p.outstandingBalance > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: _onPartyChanged,
                  ),
                  const SizedBox(height: 12),

                  // Outstanding Status Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: currentDue > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: currentDue > 0 ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              currentDue > 0 ? Icons.error_outline : Icons.check_circle_outline,
                              size: 18,
                              color: currentDue > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Current Total Due', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                Text(
                                  currentDue > 0 ? '₹${currentDue.toStringAsFixed(2)} (Lene Hain)' : 'Nil (No Pending Due)',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                    color: currentDue > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        if (currentDue > 0)
                          ElevatedButton(
                            onPressed: () => _applyQuickAmount(currentDue),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFDC2626),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Clear All', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Payment Amount & Settlement
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
                  const Text('Amount Received (₹) *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.success),
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.currency_rupee, color: AppTheme.success, size: 24),
                      hintText: '0.00',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Quick Settlement Chips
                  if (currentDue > 0) ...[
                    Wrap(
                      spacing: 8,
                      children: [
                        ActionChip(
                          label: Text('Full Due (₹${currentDue.toStringAsFixed(0)})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          onPressed: () => _applyQuickAmount(currentDue),
                        ),
                        ActionChip(
                          label: Text('50% (₹${(currentDue / 2).toStringAsFixed(0)})', style: const TextStyle(fontSize: 11)),
                          onPressed: () => _applyQuickAmount(currentDue / 2),
                        ),
                        ActionChip(
                          label: const Text('₹5,000', style: TextStyle(fontSize: 11)),
                          onPressed: () => _applyQuickAmount(5000),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Payment Mode Switcher
                  const Text('Payment Mode', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                  const SizedBox(height: 6),
                  SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 1, label: Text('Cash', style: TextStyle(fontSize: 11))),
                      ButtonSegment(value: 2, label: Text('UPI', style: TextStyle(fontSize: 11))),
                      ButtonSegment(value: 3, label: Text('Cheque', style: TextStyle(fontSize: 11))),
                      ButtonSegment(value: 4, label: Text('Bank', style: TextStyle(fontSize: 11))),
                    ],
                    selected: {_paymentMode},
                    onSelectionChanged: (val) => setState(() => _paymentMode = val.first),
                  ),
                  const SizedBox(height: 12),

                  // Reference Number / UTR
                  if (_paymentMode != 1)
                    TextFormField(
                      controller: _refNumberController,
                      decoration: InputDecoration(
                        labelText: _paymentMode == 2 ? 'UPI UTR / Transaction ID' : _paymentMode == 3 ? 'Cheque Number' : 'Bank Reference No.',
                        hintText: 'e.g. 9840294821',
                        prefixIcon: const Icon(Icons.tag, size: 16),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  const SizedBox(height: 8),

                  TextFormField(
                    controller: _notesController,
                    decoration: const InputDecoration(
                      labelText: 'Notes / Remarks (Optional)',
                      hintText: 'e.g. Cleared bill INV-01 part payment',
                      prefixIcon: Icon(Icons.note_outlined, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Settlement Impact Box
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Previous Outstanding:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text('₹${currentDue.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Amount Receiving Now:', style: TextStyle(fontSize: 12, color: AppTheme.success, fontWeight: FontWeight.bold)),
                      Text('- ₹${payingAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.success)),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Remaining Due (Naya Baaki):', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      Text(
                        '₹${remainingDue > 0 ? remainingDue.toStringAsFixed(2) : "0.00"}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: remainingDue > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isSaving ? null : () => _savePayment(shareWhatsApp: true),
                    icon: const Icon(Icons.share, color: Color(0xFF16A34A), size: 18),
                    label: const Text('Save & WhatsApp', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF16A34A)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : () => _savePayment(shareWhatsApp: false),
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Save Payment', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
