import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/sales_return_dao.dart';
import '../../../../core/sync/sync_service.dart';
import 'credit_note_preview_screen.dart';

class _ReturnItemDraft {
  final String itemId;
  final String itemName;
  final String? hsnCode;
  final String? batchNumber;
  final String? expiryDate;
  final double maxOriginalQty;
  double returnQty;
  final double unitPrice;
  final double gstRate;
  bool isSelected;

  _ReturnItemDraft({
    required this.itemId,
    required this.itemName,
    this.hsnCode,
    this.batchNumber,
    this.expiryDate,
    required this.maxOriginalQty,
    required this.returnQty,
    required this.unitPrice,
    required this.gstRate,
    this.isSelected = true,
  });

  double get lineTotal => returnQty * unitPrice;
  double get taxableAmount => lineTotal / (1.0 + (gstRate / 100.0));
  double get totalTax => lineTotal - taxableAmount;
}

class CreateSalesReturnScreen extends StatefulWidget {
  final InvoiceModel? originalInvoice;
  final PartyModel? preselectedParty;

  const CreateSalesReturnScreen({
    super.key,
    this.originalInvoice,
    this.preselectedParty,
  });

  @override
  State<CreateSalesReturnScreen> createState() => _CreateSalesReturnScreenState();
}

class _CreateSalesReturnScreenState extends State<CreateSalesReturnScreen> {
  final PartyDao _partyDao = PartyDao();
  final InvoiceDao _invoiceDao = InvoiceDao();
  final SalesReturnDao _returnDao = SalesReturnDao();
  final SyncService _syncService = SyncService();

  String _creditNoteNumber = 'Loading...';
  DateTime _returnDate = DateTime.now();

  PartyModel? _selectedParty;
  List<PartyModel> _customers = [];

  InvoiceModel? _selectedInvoice;
  List<InvoiceModel> _partyInvoices = [];

  final List<_ReturnItemDraft> _items = [];
  bool _restockToWarehouse = true;
  String _selectedReason = 'Expired / Near-Expiry Stock';

  final List<String> _returnReasons = [
    'Expired / Near-Expiry Stock',
    'Damaged in Transit / Breakage',
    'Wrong Item Delivered',
    'Customer Rejection / Overstocked',
    'Quality Issue / Batch Recall',
  ];

  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final nextNo = await _returnDao.getNextCreditNoteNumber();
    final allParties = await _partyDao.getAllParties(partyType: 1);

    PartyModel? activeParty;
    if (widget.originalInvoice != null) {
      _selectedInvoice = widget.originalInvoice;
      final partyMatches = allParties.where((p) => p.id == widget.originalInvoice!.partyId).toList();
      if (partyMatches.isNotEmpty) {
        activeParty = partyMatches.first;
      }
      _populateItemsFromInvoice(widget.originalInvoice!);
    } else if (widget.preselectedParty != null) {
      activeParty = widget.preselectedParty;
    } else if (allParties.isNotEmpty) {
      activeParty = allParties.first;
    }

    List<InvoiceModel> invList = [];
    if (activeParty != null) {
      invList = await _invoiceDao.getInvoicesByParty(activeParty.id);
    }

    if (mounted) {
      setState(() {
        _creditNoteNumber = nextNo;
        _customers = allParties;
        _selectedParty = activeParty;
        _partyInvoices = invList;
        _isLoading = false;
      });
    }
  }

  void _populateItemsFromInvoice(InvoiceModel inv) {
    _items.clear();
    for (final it in inv.items) {
      _items.add(
        _ReturnItemDraft(
          itemId: it.itemId,
          itemName: it.itemName,
          hsnCode: it.hsnCode,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          maxOriginalQty: it.quantity,
          returnQty: it.quantity,
          unitPrice: it.unitPrice,
          gstRate: it.gstRate,
          isSelected: true,
        ),
      );
    }
  }

  Future<void> _onPartyChanged(PartyModel? party) async {
    if (party == null) return;
    setState(() {
      _selectedParty = party;
      _selectedInvoice = null;
      _items.clear();
    });

    final invs = await _invoiceDao.getInvoicesByParty(party.id);
    if (mounted) {
      setState(() => _partyInvoices = invs);
    }
  }

  void _onInvoiceSelected(InvoiceModel? inv) {
    setState(() {
      _selectedInvoice = inv;
      if (inv != null) {
        _populateItemsFromInvoice(inv);
      } else {
        _items.clear();
      }
    });
  }

  double get _totalReturnGross {
    return _items.where((i) => i.isSelected).fold(0.0, (sum, i) => sum + i.lineTotal);
  }

  double get _totalTaxable {
    return _items.where((i) => i.isSelected).fold(0.0, (sum, i) => sum + i.taxableAmount);
  }

  double get _totalTax {
    return _items.where((i) => i.isSelected).fold(0.0, (sum, i) => sum + i.totalTax);
  }

  Future<void> _saveCreditNote() async {
    if (_selectedParty == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a customer for this credit note'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    final selectedItems = _items.where((i) => i.isSelected && i.returnQty > 0).toList();
    if (selectedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one item with valid return quantity'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final returnId = const Uuid().v4();
      final nowStr = DateTime.now().toIso8601String();
      final returnDateStr = DateFormat('yyyy-MM-dd').format(_returnDate);

      final isInterState = _selectedInvoice != null && _selectedInvoice!.igstAmount > 0;

      final returnItemModels = selectedItems.map((draft) {
        final tax = draft.totalTax;
        final cgst = isInterState ? 0.0 : tax / 2.0;
        final sgst = isInterState ? 0.0 : tax / 2.0;
        final igst = isInterState ? tax : 0.0;

        return SalesReturnItemModel(
          id: const Uuid().v4(),
          returnId: returnId,
          itemId: draft.itemId,
          itemName: draft.itemName,
          hsnCode: draft.hsnCode,
          batchNumber: draft.batchNumber,
          expiryDate: draft.expiryDate,
          quantity: draft.returnQty,
          unitPrice: draft.unitPrice,
          taxableAmount: draft.taxableAmount,
          gstRate: draft.gstRate,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalAmount: draft.lineTotal,
        );
      }).toList();

      final totalGross = _totalReturnGross;
      final totalTaxable = _totalTaxable;
      final totalTax = _totalTax;
      final cgstTotal = isInterState ? 0.0 : totalTax / 2.0;
      final sgstTotal = isInterState ? 0.0 : totalTax / 2.0;
      final igstTotal = isInterState ? totalTax : 0.0;

      final salesReturn = SalesReturnModel(
        id: returnId,
        tenantId: _selectedParty!.tenantId,
        creditNoteNumber: _creditNoteNumber,
        originalInvoiceId: _selectedInvoice?.id,
        originalInvoiceNumber: _selectedInvoice?.invoiceNumber,
        partyId: _selectedParty!.id,
        partyName: _selectedParty!.name,
        partyPhone: _selectedParty!.phone,
        returnDate: returnDateStr,
        returnReason: _selectedReason,
        taxableAmount: totalTaxable,
        cgstAmount: cgstTotal,
        sgstAmount: sgstTotal,
        igstAmount: igstTotal,
        totalAmount: totalGross,
        restockToWarehouse: _restockToWarehouse,
        isSynced: false,
        createdAt: nowStr,
        items: returnItemModels,
      );

      // 1. Atomic SQLite insert & stock/balance adjustment
      await _returnDao.insertSalesReturn(salesReturn);

      // 2. Queue for cloud sync
      await _syncService.queueOfflineSalesReturn(
        returnId: returnId,
        returnPayload: salesReturn.toMap(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('GST Credit Note $_creditNoteNumber issued successfully! Balance adjusted.'),
            backgroundColor: AppTheme.success,
          ),
        );

        // Open preview / print
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => CreditNotePreviewScreen(salesReturn: salesReturn),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving credit note: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('New Sales Return / Credit Note')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final gross = _totalReturnGross;
    final partyBal = _selectedParty?.outstandingBalance ?? 0.0;
    final afterBal = partyBal - gross;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Issue Credit Note (Vapsi Maal)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Credit Note Metadata Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Credit Note No', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        _creditNoteNumber,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _returnDate,
                        firstDate: DateTime(2024),
                        lastDate: DateTime(2030),
                      );
                      if (picked != null) setState(() => _returnDate = picked);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 14, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Text(DateFormat('dd MMM yyyy').format(_returnDate), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Party Selection Card
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
                  const Text('Customer / Party', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<PartyModel>(
                    initialValue: _selectedParty,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(),
                    ),
                    items: _customers.map((p) {
                      return DropdownMenuItem(
                        value: p,
                        child: Text('${p.name}${p.gstin != null ? " (${p.gstin})" : ""}', maxLines: 1, overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: _onPartyChanged,
                  ),
                  if (_selectedParty != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Current Outstanding:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text(
                          '₹${_selectedParty!.outstandingBalance.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _selectedParty!.outstandingBalance > 0 ? AppTheme.danger : AppTheme.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Link Original Invoice (Optional but Recommended for GST)
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Original Tax Invoice Reference', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(4)),
                        child: const Text('Sec 34 CGST', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<InvoiceModel>(
                    initialValue: _selectedInvoice,
                    isExpanded: true,
                    hint: const Text('Select previous invoice to auto-fill items'),
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem<InvoiceModel>(
                        value: null,
                        child: Text('— Manual / No Invoice Linked —', style: TextStyle(color: Colors.grey)),
                      ),
                      ..._partyInvoices.map((inv) {
                        return DropdownMenuItem(
                          value: inv,
                          child: Text('${inv.invoiceNumber} (${inv.invoiceDate}) - ₹${inv.totalAmount.toStringAsFixed(2)}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        );
                      }),
                    ],
                    onChanged: _onInvoiceSelected,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Return Reason & Restock Setting Card
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
                  const Text('Reason for Return', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedReason,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(),
                    ),
                    items: _returnReasons.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                    onChanged: (v) => setState(() => _selectedReason = v ?? _selectedReason),
                  ),
                  const SizedBox(height: 10),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Restock to Warehouse Inventory', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text(
                      _restockToWarehouse
                          ? 'Stock quantities will be incremented in inventory.'
                          : 'Items marked as damaged/quarantine. Stock will NOT increase.',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                    value: _restockToWarehouse,
                    activeThumbColor: AppTheme.success,
                    onChanged: (val) => setState(() => _restockToWarehouse = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Items to Return Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Items Being Returned (${_items.where((i) => i.isSelected).length})',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A)),
                ),
                Text('Total: ₹${gross.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.danger)),
              ],
            ),
            const SizedBox(height: 8),

            if (_items.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.inventory_2_outlined, size: 40, color: Colors.grey),
                    SizedBox(height: 8),
                    Text('No items added to return.', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                    Text('Select an original invoice above to load items for return.', style: TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.center),
                  ],
                ),
              )
            else
              ..._items.map((it) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Checkbox(
                              value: it.isSelected,
                              onChanged: (v) => setState(() => it.isSelected = v ?? true),
                              activeColor: AppTheme.primary,
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(it.itemName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text(
                                    '${it.batchNumber != null ? "Batch: ${it.batchNumber} • " : ""}${it.expiryDate != null ? "Exp: ${it.expiryDate} • " : ""}GST: ${it.gstRate}%',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '₹${it.lineTotal.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.danger),
                            ),
                          ],
                        ),
                        if (it.isSelected) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const SizedBox(width: 44),
                              Expanded(
                                flex: 3,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Return Qty (Max ${it.maxOriginalQty.toStringAsFixed(0)}):', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, size: 20),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          onPressed: it.returnQty > 1
                                              ? () => setState(() => it.returnQty -= 1)
                                              : null,
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 12),
                                          child: Text(
                                            it.returnQty.toStringAsFixed(0),
                                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, size: 20),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          onPressed: it.returnQty < it.maxOriginalQty
                                              ? () => setState(() => it.returnQty += 1)
                                              : null,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text('Rate: ₹${it.unitPrice.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 14),

            // Financial & Ledger Adjustment Impact Box
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Taxable Value Credit:', style: TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                      Text('₹${_totalTaxable.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF991B1B))),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('GST Tax Reversal:', style: TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                      Text('₹${_totalTax.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF991B1B))),
                    ],
                  ),
                  const Divider(height: 14, color: Color(0xFFFCA5A5)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Credit Note Value:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF7F1D1D))),
                      Text(
                        '₹${gross.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFFDC2626)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Customer Balance Impact:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('₹${partyBal.toStringAsFixed(2)} ➔ ₹${afterBal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.success)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            ElevatedButton.icon(
              onPressed: _isSaving ? null : _saveCreditNote,
              icon: _isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline, size: 20),
              label: Text(_isSaving ? 'Issuing Credit Note...' : 'Issue Credit Note & Preview (₹${gross.toStringAsFixed(2)})'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.danger,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}
