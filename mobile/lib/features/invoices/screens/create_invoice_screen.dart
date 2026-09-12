import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/sync/sync_service.dart';
import '../../../../core/utils/indian_states.dart';
import '../../../../core/utils/pharma_pricing_calculator.dart';
import '../../../../core/widgets/continuous_barcode_scanner_sheet.dart';
import '../../parties/screens/add_party_dialog.dart';
import 'invoice_detail_preview_screen.dart';

class CreateInvoiceScreen extends StatefulWidget {
  final PartyModel? preselectedParty;

  const CreateInvoiceScreen({super.key, this.preselectedParty});

  @override
  State<CreateInvoiceScreen> createState() => _CreateInvoiceScreenState();
}

class _InvoiceEntryItem {
  final ItemModel item;
  double quantity;
  double freeQuantity;
  double unitPrice;
  double mrp;
  double ptr;
  double pts;
  double discountPercent;
  double schemeDiscountPercent;
  String? batchNumber;
  String? expiryDate;
  String? hsnCode;

  _InvoiceEntryItem({
    required this.item,
    required this.unitPrice,
    this.quantity = 1.0,
    this.freeQuantity = 0.0,
    this.mrp = 0.0,
    this.ptr = 0.0,
    this.pts = 0.0,
    this.discountPercent = 0.0,
    this.schemeDiscountPercent = 0.0,
    this.batchNumber,
    this.expiryDate,
    this.hsnCode,
  });

  double get gross => quantity * unitPrice;
  double get itemDiscountAmount => gross * (discountPercent / 100);
  double get afterItemDiscount => gross - itemDiscountAmount;
  double get schemeDiscountAmount => afterItemDiscount * (schemeDiscountPercent / 100);
  double get totalDiscountAmount => itemDiscountAmount + schemeDiscountAmount;
  double get taxableAmount => gross - totalDiscountAmount;
  double get totalGst => taxableAmount * (item.gstRate / 100);
  double get totalAmount => taxableAmount + totalGst;
}

class _CreateInvoiceScreenState extends State<CreateInvoiceScreen> {
  final InvoiceDao _invoiceDao = InvoiceDao();
  final ItemDao _itemDao = ItemDao();
  final PartyDao _partyDao = PartyDao();
  final SyncService _syncService = SyncService();

  String _invoiceNumber = 'Loading...';
  DateTime _invoiceDate = DateTime.now();

  // Invoice Mode: 1 = B2B Tax Invoice, 2 = B2C Retail Bill
  int _invoiceType = 1;

  // Place of Supply & Tax Resolution
  final String _sellerStateCode = '09'; // Default Store State (UP), switchable
  IndianState _placeOfSupply = IndianStatesMaster.states.firstWhere((s) => s.code == '09');
  bool get _isInterState => PharmaPricingCalculator.isInterState(
        sellerStateCode: _sellerStateCode,
        buyerPosCode: _placeOfSupply.code,
      );

  PartyModel? _selectedParty;
  List<PartyModel> _allCustomers = [];

  final List<_InvoiceEntryItem> _billItems = [];

  // Payment & Credit
  int _paymentMode = 1; // 1 = Cash, 2 = UPI, 3 = Card, 4 = Credit
  final TextEditingController _receivedAmountController = TextEditingController();
  DateTime? _creditDueDate;
  bool _isSaving = false;

  // Quick Customer
  bool _isQuickCustomer = false;
  final TextEditingController _quickNameController = TextEditingController();
  final TextEditingController _quickPhoneController = TextEditingController();
  final TextEditingController _quickGstinController = TextEditingController();

  // Logistics & PO References (Collapsible)
  bool _showLogistics = false;
  final TextEditingController _poNumberController = TextEditingController();
  DateTime? _poDate;
  final TextEditingController _vehicleNumberController = TextEditingController();
  final TextEditingController _transporterNameController = TextEditingController();
  final TextEditingController _ewayBillNumberController = TextEditingController();
  final TextEditingController _lrNumberController = TextEditingController();
  bool _isReverseCharge = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _receivedAmountController.dispose();
    _quickNameController.dispose();
    _quickPhoneController.dispose();
    _quickGstinController.dispose();
    _poNumberController.dispose();
    _vehicleNumberController.dispose();
    _transporterNameController.dispose();
    _ewayBillNumberController.dispose();
    _lrNumberController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final nextNo = await _invoiceDao.getNextInvoiceNumber();
    final customers = await _partyDao.getAllParties(partyType: 1);

    if (mounted) {
      setState(() {
        _invoiceNumber = nextNo;
        _allCustomers = customers;
        if (widget.preselectedParty != null) {
          _selectedParty = widget.preselectedParty;
          _syncPlaceOfSupplyFromParty(widget.preselectedParty);
        } else if (customers.isNotEmpty) {
          _selectedParty = customers.first;
          _syncPlaceOfSupplyFromParty(customers.first);
        }
      });
    }
  }

  void _syncPlaceOfSupplyFromParty(PartyModel? party) {
    if (party == null) return;
    if (party.gstin != null && party.gstin!.trim().length >= 2) {
      final state = IndianStatesMaster.getStateByGstin(party.gstin);
      if (state != null) {
        setState(() => _placeOfSupply = state);
        return;
      }
    }
    if (party.stateCode != null && party.stateCode!.trim().isNotEmpty) {
      final state = IndianStatesMaster.getStateByCode(party.stateCode);
      if (state != null) {
        setState(() => _placeOfSupply = state);
      }
    }
  }

  // Financial Calculations
  double get _subtotal => _billItems.fold(0.0, (s, i) => s + i.gross);
  double get _totalDiscount => _billItems.fold(0.0, (s, i) => s + i.totalDiscountAmount);
  double get _totalTaxable => _billItems.fold(0.0, (s, i) => s + i.taxableAmount);
  double get _totalGst => _billItems.fold(0.0, (s, i) => s + i.totalGst);
  double get _cgstAmount => _isInterState ? 0.0 : (_totalGst / 2);
  double get _sgstAmount => _isInterState ? 0.0 : (_totalGst / 2);
  double get _igstAmount => _isInterState ? _totalGst : 0.0;
  double get _grandTotal => _totalTaxable + _totalGst;

  void _updateReceivedDefault() {
    if (_paymentMode == 4) {
      _receivedAmountController.text = '0.00';
    } else {
      _receivedAmountController.text = _grandTotal.toStringAsFixed(2);
    }
  }

  void _openItemPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _ItemPickerSheet(
        itemDao: _itemDao,
        onItemSelected: (item) {
          // Pre-calculate pharma Marg rates
          final mrp = item.salePrice > 0 ? item.salePrice : (item.purchasePrice * 1.3);
          final pharmaRates = PharmaPricingCalculator.calculateMargRates(
            mrp: mrp,
            gstRate: item.gstRate,
          );

          final now = DateTime.now();
          final defaultBatch = 'B${now.year}-${now.month.toString().padLeft(2, '0')}';
          final defaultExp = '${now.month.toString().padLeft(2, '0')}/${(now.year + 2).toString().substring(2)}';

          final newItem = _InvoiceEntryItem(
            item: item,
            unitPrice: pharmaRates.ptr > 0 ? pharmaRates.ptr : item.salePrice,
            quantity: 1.0,
            freeQuantity: 0.0,
            mrp: mrp,
            ptr: pharmaRates.ptr,
            pts: pharmaRates.pts,
            batchNumber: defaultBatch,
            expiryDate: defaultExp,
            hsnCode: item.hsnCode ?? '3004',
          );

          setState(() {
            _billItems.add(newItem);
            _updateReceivedDefault();
          });

          // Open the item edit sheet so user can immediately adjust batch, free qty, rate
          _openItemEditSheet(newItem, _billItems.length - 1);
        },
      ),
    );
  }

  void _openItemEditSheet(_InvoiceEntryItem entry, int index) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => _ItemEditSheet(
        itemEntry: entry,
        onSave: (updated) {
          setState(() {
            _billItems[index] = updated;
            _updateReceivedDefault();
          });
        },
      ),
    );
  }

  void _scanBarcode() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ContinuousBarcodeScannerSheet(
        title: 'Continuous Invoice Barcode Scanner',
        initialContinuousMode: true,
        onItemScanned: (item) {
          final existingIdx = _billItems.indexWhere((it) => it.item.id == item.id);
          if (existingIdx >= 0) {
            setState(() {
              _billItems[existingIdx].quantity += 1.0;
              _updateReceivedDefault();
            });
          } else {
            final mrp = item.mrp > 0 ? item.mrp : (item.salePrice > 0 ? item.salePrice : (item.purchasePrice * 1.3));
            final pharmaRates = PharmaPricingCalculator.calculateMargRates(
              mrp: mrp,
              gstRate: item.gstRate,
            );
            final now = DateTime.now();
            final defaultBatch = item.batchNumber != null && item.batchNumber!.isNotEmpty
                ? item.batchNumber!
                : 'B${now.year}-${now.month.toString().padLeft(2, '0')}';
            final defaultExp = item.expiryDate != null && item.expiryDate!.isNotEmpty
                ? item.expiryDate!
                : '${now.month.toString().padLeft(2, '0')}/${(now.year + 2).toString().substring(2)}';

            final newItem = _InvoiceEntryItem(
              item: item,
              unitPrice: item.ptr > 0 ? item.ptr : (pharmaRates.ptr > 0 ? pharmaRates.ptr : item.salePrice),
              quantity: 1.0,
              freeQuantity: 0.0,
              mrp: mrp,
              ptr: item.ptr > 0 ? item.ptr : pharmaRates.ptr,
              pts: item.pts > 0 ? item.pts : pharmaRates.pts,
              batchNumber: defaultBatch,
              expiryDate: defaultExp,
              hsnCode: item.hsnCode ?? '3004',
            );

            setState(() {
              _billItems.add(newItem);
              _updateReceivedDefault();
            });
          }
        },
        onUnknownBarcode: (code) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Barcode "$code" not found in items'),
              backgroundColor: AppTheme.warning,
              duration: const Duration(seconds: 1),
            ),
          );
        },
        bottomCartWidget: (sheetCtx) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.receipt_long_outlined, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      '${_billItems.length} Products in Bill',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
                Text(
                  '₹${_grandTotal.toStringAsFixed(2)}',
                  style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w900, fontSize: 15),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _saveInvoice() async {
    if (_billItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one item to bill'), backgroundColor: AppTheme.warning),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      const storage = FlutterSecureStorage();
      final activeTenantId = await storage.read(key: AppConstants.keyTenantId) ?? '';

      final invoiceId = const Uuid().v4();
      final total = _grandTotal;
      final paid = double.tryParse(_receivedAmountController.text) ?? (_paymentMode == 4 ? 0.0 : total);
      final balance = total - paid;

      String partyName = _selectedParty?.name ?? 'Walk-in Customer';
      String? partyPhone = _selectedParty?.phone;
      String? partyGstin = _selectedParty?.gstin;
      String? partyId = _selectedParty?.id;

      if (_isQuickCustomer) {
        final qName = _quickNameController.text.trim();
        final qPhone = _quickPhoneController.text.trim();
        final qGst = _quickGstinController.text.trim();
        if (qName.isNotEmpty) {
          partyName = qName;
          partyPhone = qPhone.isNotEmpty ? qPhone : null;
          partyGstin = qGst.isNotEmpty ? qGst : null;
          partyId = const Uuid().v4();

          final quickParty = PartyModel(
            id: partyId,
            tenantId: activeTenantId,
            name: partyName,
            phone: partyPhone,
            gstin: partyGstin,
            state: _placeOfSupply.name,
            stateCode: _placeOfSupply.code,
            partyType: 1, // Customer
            customerType: _invoiceType == 1 ? 1 : 2, // 1 = B2B / Wholesale, 2 = Retail
            updatedAt: DateTime.now().toIso8601String(),
          );
          await _partyDao.insertParty(quickParty);
        }
      }

      final invoiceModel = InvoiceModel(
        id: invoiceId,
        tenantId: activeTenantId,
        invoiceNumber: _invoiceNumber,
        invoiceDate: _invoiceDate.toIso8601String().substring(0, 10),
        dueDate: _creditDueDate?.toIso8601String().substring(0, 10),
        partyId: partyId,
        partyName: partyName,
        partyPhone: partyPhone,
        partyGstin: partyGstin,
        placeOfSupply: _placeOfSupply.displayName,
        billingStateCode: _placeOfSupply.code,
        shippingStateCode: _placeOfSupply.code,
        billingAddress: _selectedParty?.address,
        poNumber: _poNumberController.text.trim().isNotEmpty ? _poNumberController.text.trim() : null,
        poDate: _poDate?.toIso8601String().substring(0, 10),
        vehicleNumber: _vehicleNumberController.text.trim().isNotEmpty ? _vehicleNumberController.text.trim() : null,
        transporterName: _transporterNameController.text.trim().isNotEmpty ? _transporterNameController.text.trim() : null,
        ewayBillNumber: _ewayBillNumberController.text.trim().isNotEmpty ? _ewayBillNumberController.text.trim() : null,
        lrNumber: _lrNumberController.text.trim().isNotEmpty ? _lrNumberController.text.trim() : null,
        isReverseCharge: _isReverseCharge,
        invoiceType: _invoiceType,
        taxableAmount: _totalTaxable,
        cgstAmount: _cgstAmount,
        sgstAmount: _sgstAmount,
        igstAmount: _igstAmount,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance > 0 ? balance : 0.0,
        paymentMode: _paymentMode,
        paymentStatus: balance <= 0 ? 3 : (paid > 0 ? 2 : 1),
        isCancelled: false,
        isSynced: false,
        createdAt: DateTime.now().toIso8601String(),
        items: _billItems.map((bi) {
          final lineTax = PharmaPricingCalculator.computeTaxBreakup(
            taxableAmount: bi.taxableAmount,
            gstRate: bi.item.gstRate,
            isInterState: _isInterState,
          );

          return InvoiceItemModel(
            id: const Uuid().v4(),
            invoiceId: invoiceId,
            itemId: bi.item.id,
            itemName: bi.item.name,
            itemSku: bi.item.sku,
            hsnCode: bi.hsnCode ?? bi.item.hsnCode,
            batchNumber: bi.batchNumber,
            expiryDate: bi.expiryDate,
            quantity: bi.quantity,
            freeQuantity: bi.freeQuantity,
            unitPrice: bi.unitPrice,
            mrp: bi.mrp,
            ptr: bi.ptr,
            pts: bi.pts,
            discountPercent: bi.discountPercent,
            schemeDiscountPercent: bi.schemeDiscountPercent,
            taxableAmount: bi.taxableAmount,
            gstRate: bi.item.gstRate,
            cgstAmount: lineTax['cgst'] ?? 0.0,
            sgstAmount: lineTax['sgst'] ?? 0.0,
            igstAmount: lineTax['igst'] ?? 0.0,
            totalAmount: bi.totalAmount,
          );
        }).toList(),
      );

      // Save to SQLite
      await _invoiceDao.insertInvoice(invoiceModel);

      // Queue for background sync
      await _syncService.queueOfflineInvoice(
        invoiceId: invoiceId,
        invoicePayload: invoiceModel.toMap(),
      );

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => InvoiceDetailPreviewScreen(invoice: invoiceModel),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error creating invoice: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          _invoiceType == 1 ? 'New B2B Tax Invoice' : 'New Retail Cash Bill',
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
            onPressed: _scanBarcode,
            tooltip: 'Barcode Scanner',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Invoice Type Segmented Switch
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _invoiceType = 1),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 9),
                              decoration: BoxDecoration(
                                color: _invoiceType == 1 ? AppTheme.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  '🏢 B2B Tax Invoice',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: _invoiceType == 1 ? Colors.white : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _invoiceType = 2),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 9),
                              decoration: BoxDecoration(
                                color: _invoiceType == 2 ? AppTheme.primary : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  '🛒 Retail / Counter POS',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: _invoiceType == 2 ? Colors.white : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Invoice No, Date & Realtime Tax Supply Badge
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Invoice Number', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                              const SizedBox(height: 2),
                              Text(
                                _invoiceNumber,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primary),
                              ),
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
                              initialDate: _invoiceDate,
                              firstDate: DateTime(2020),
                              lastDate: DateTime(2030),
                            );
                            if (picked != null) setState(() => _invoiceDate = picked);
                          },
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Invoice Date', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today, size: 12, color: AppTheme.primary),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${_invoiceDate.day}/${_invoiceDate.month}/${_invoiceDate.year}',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Place of Supply & Tax Supply Indicator
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Place of Supply (POS)', style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              DropdownButton<IndianState>(
                                value: _placeOfSupply,
                                isDense: true,
                                isExpanded: true,
                                underline: const SizedBox(),
                                items: IndianStatesMaster.states.map((st) {
                                  return DropdownMenuItem(
                                    value: st,
                                    child: Text(st.displayName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) setState(() => _placeOfSupply = val);
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _isInterState ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _isInterState ? const Color(0xFFBFDBFE) : const Color(0xFFBBF7D0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                _isInterState ? '🔵 INTER-STATE' : '🟢 INTRA-STATE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: _isInterState ? const Color(0xFF1D4ED8) : const Color(0xFF15803D),
                                ),
                              ),
                              Text(
                                _isInterState ? 'IGST 100%' : 'CGST + SGST (50/50)',
                                style: TextStyle(
                                  fontSize: 9,
                                  color: _isInterState ? const Color(0xFF1D4ED8) : const Color(0xFF15803D),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Customer Selector Card
                  Container(
                    padding: const EdgeInsets.all(12),
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
                            Text(
                              _invoiceType == 1 ? '🏢 B2B Buyer / Company' : '👤 Customer Details',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                            ),
                            if (!_isQuickCustomer)
                              InkWell(
                                onTap: () async {
                                  final created = await Navigator.push<PartyModel>(
                                    context,
                                    MaterialPageRoute(builder: (_) => const AddPartyDialog(defaultPartyType: 1)),
                                  );
                                  if (created != null) {
                                    final all = await _partyDao.getAllParties(partyType: 1);
                                    setState(() {
                                      _allCustomers = all;
                                      _selectedParty = created;
                                      _syncPlaceOfSupplyFromParty(created);
                                    });
                                  }
                                },
                                child: const Text(
                                  '+ New Party',
                                  style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: false, label: Text('Registered Party', style: TextStyle(fontSize: 11)), icon: Icon(Icons.people_outline, size: 14)),
                            ButtonSegment(value: true, label: Text('⚡ Instant Buyer', style: TextStyle(fontSize: 11)), icon: Icon(Icons.flash_on, size: 14)),
                          ],
                          selected: {_isQuickCustomer},
                          onSelectionChanged: (val) => setState(() => _isQuickCustomer = val.first),
                        ),
                        const SizedBox(height: 10),
                        if (_isQuickCustomer) ...[
                          TextFormField(
                            controller: _quickNameController,
                            decoration: const InputDecoration(
                              labelText: 'Party / Business Name *',
                              hintText: 'e.g. Apex Pharma Distributors',
                              prefixIcon: Icon(Icons.business_outlined, size: 18),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: _quickPhoneController,
                                  keyboardType: TextInputType.phone,
                                  decoration: const InputDecoration(
                                    labelText: 'Mobile Number',
                                    hintText: '10 digits',
                                    prefixIcon: Icon(Icons.phone_outlined, size: 18),
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextFormField(
                                  controller: _quickGstinController,
                                  textCapitalization: TextCapitalization.characters,
                                  onChanged: (val) {
                                    if (val.trim().length >= 2) {
                                      final st = IndianStatesMaster.getStateByGstin(val.trim());
                                      if (st != null) setState(() => _placeOfSupply = st);
                                    }
                                  },
                                  decoration: const InputDecoration(
                                    labelText: 'GSTIN (Optional)',
                                    hintText: '15 characters',
                                    prefixIcon: Icon(Icons.verified_outlined, size: 18),
                                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ] else ...[
                          DropdownButtonFormField<PartyModel>(
                            key: ValueKey(_selectedParty?.id),
                            initialValue: _selectedParty,
                            isExpanded: true,
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: _allCustomers.map((p) {
                              return DropdownMenuItem(
                                value: p,
                                child: Text(
                                  '${p.name} ${p.gstin != null ? "• GSTIN: ${p.gstin}" : ""}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() {
                                _selectedParty = val;
                                _syncPlaceOfSupplyFromParty(val);
                              });
                            },
                          ),
                          if (_selectedParty?.gstin != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 13),
                                  const SizedBox(width: 4),
                                  Text(
                                    'GSTIN: ${_selectedParty!.gstin} • State: ${_selectedParty!.state ?? _placeOfSupply.name}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Collapsible Logistics, PO & E-Way Bill Details
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        initiallyExpanded: _showLogistics,
                        onExpansionChanged: (exp) => setState(() => _showLogistics = exp),
                        leading: const Icon(Icons.local_shipping_outlined, color: AppTheme.primary, size: 20),
                        title: const Text(
                          '🚚 Logistics, PO & E-Way Bill',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        subtitle: Text(
                          _poNumberController.text.isNotEmpty || _vehicleNumberController.text.isNotEmpty
                              ? 'PO: ${_poNumberController.text} | Veh: ${_vehicleNumberController.text}'
                              : 'Optional: PO Number, Vehicle, E-Way Bill',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: _poNumberController,
                                        decoration: const InputDecoration(
                                          labelText: 'Buyer PO Number',
                                          hintText: 'e.g. PO-8921',
                                          prefixIcon: Icon(Icons.receipt, size: 16),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () async {
                                          final picked = await showDatePicker(
                                            context: context,
                                            initialDate: _poDate ?? DateTime.now(),
                                            firstDate: DateTime(2020),
                                            lastDate: DateTime(2030),
                                          );
                                          if (picked != null) setState(() => _poDate = picked);
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                                          decoration: BoxDecoration(
                                            border: Border.all(color: const Color(0xFFCBD5E1)),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                _poDate != null ? '${_poDate!.day}/${_poDate!.month}/${_poDate!.year}' : 'PO Date',
                                                style: TextStyle(fontSize: 12, color: _poDate != null ? Colors.black : const Color(0xFF64748B)),
                                              ),
                                              const Icon(Icons.calendar_today, size: 14, color: Color(0xFF64748B)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: _vehicleNumberController,
                                        textCapitalization: TextCapitalization.characters,
                                        decoration: const InputDecoration(
                                          labelText: 'Vehicle Number',
                                          hintText: 'e.g. UP-32-AB-1234',
                                          prefixIcon: Icon(Icons.directions_car, size: 16),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: TextFormField(
                                        controller: _ewayBillNumberController,
                                        decoration: const InputDecoration(
                                          labelText: 'E-Way Bill Number',
                                          hintText: '12-digit number',
                                          prefixIcon: Icon(Icons.qr_code, size: 16),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: _transporterNameController,
                                        decoration: const InputDecoration(
                                          labelText: 'Transporter Name',
                                          hintText: 'e.g. V-Trans Logistics',
                                          prefixIcon: Icon(Icons.business, size: 16),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: TextFormField(
                                        controller: _lrNumberController,
                                        decoration: const InputDecoration(
                                          labelText: 'LR / Bilty Number',
                                          hintText: 'e.g. LR-4029',
                                          prefixIcon: Icon(Icons.confirmation_number, size: 16),
                                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                SwitchListTile(
                                  value: _isReverseCharge,
                                  onChanged: (val) => setState(() => _isReverseCharge = val),
                                  contentPadding: EdgeInsets.zero,
                                  title: const Text('Reverse Charge Mechanism (RCM)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  subtitle: const Text('Tax payable by recipient under RCM', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Items Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Billed Items (${_billItems.length})',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(6)),
                            child: const Text('Pharma & Wholesale Ready', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF3730A3))),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        onPressed: _openItemPicker,
                        icon: const Icon(Icons.add_shopping_cart, size: 16),
                        label: const Text('+ Add Item', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Items Cards List
                  if (_billItems.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 36),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 42, color: Colors.grey[400]),
                            const SizedBox(height: 8),
                            const Text('No items in bill yet', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 14)),
                            const SizedBox(height: 4),
                            const Text('Tap "+ Add Item" or scan product barcode above', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                          ],
                        ),
                      ),
                    )
                  else
                    ..._billItems.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final it = entry.value;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: InkWell(
                          onTap: () => _openItemEditSheet(it, idx),
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Item Name & Action Bar
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        it.item.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppTheme.danger, size: 20),
                                      onPressed: () {
                                        setState(() {
                                          _billItems.removeAt(idx);
                                          _updateReceivedDefault();
                                        });
                                      },
                                    ),
                                  ],
                                ),

                                // Pharma / B2B Tags Row (HSN, Batch, Exp, GST)
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    if (it.hsnCode != null && it.hsnCode!.isNotEmpty)
                                      _buildTag('HSN: ${it.hsnCode}', const Color(0xFFF1F5F9), const Color(0xFF475569)),
                                    if (it.batchNumber != null && it.batchNumber!.isNotEmpty)
                                      _buildTag('Batch: ${it.batchNumber}', const Color(0xFFEDE9FE), const Color(0xFF6D28D9)),
                                    if (it.expiryDate != null && it.expiryDate!.isNotEmpty)
                                      _buildTag('Exp: ${it.expiryDate}', const Color(0xFFFEF3C7), const Color(0xFFB45309)),
                                    _buildTag('GST ${it.item.gstRate}%', const Color(0xFFDCFCE7), const Color(0xFF15803D)),
                                  ],
                                ),
                                const SizedBox(height: 10),

                                // Quantities & Price Breakdown
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    // Qty & Free Qty
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            'Qty: ${it.quantity.toStringAsFixed(0)}',
                                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                                          ),
                                        ),
                                        if (it.freeQuantity > 0) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFD1FAE5),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              '+${it.freeQuantity.toStringAsFixed(0)} Free',
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: Color(0xFF047857)),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),

                                    // Rate & MRP
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          'Rate: ₹${it.unitPrice.toStringAsFixed(2)}',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
                                        ),
                                        if (it.mrp > 0)
                                          Text(
                                            'MRP: ₹${it.mrp.toStringAsFixed(2)}',
                                            style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                          ),
                                      ],
                                    ),

                                    // Total Line Amount
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '₹${it.totalAmount.toStringAsFixed(2)}',
                                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF0F172A)),
                                        ),
                                        Text(
                                          'Taxable: ₹${it.taxableAmount.toStringAsFixed(2)}',
                                          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),

                                // Edit Details Link
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: const [
                                    Icon(Icons.edit_note, size: 14, color: AppTheme.primary),
                                    SizedBox(width: 2),
                                    Text(
                                      'Edit PTS, PTR, Scheme & Batch',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 12),

                  // Payment Mode & Bill Financials Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Payment Settlement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                        const SizedBox(height: 8),
                        SegmentedButton<int>(
                          segments: const [
                            ButtonSegment(value: 1, label: Text('Cash', style: TextStyle(fontSize: 11))),
                            ButtonSegment(value: 2, label: Text('UPI', style: TextStyle(fontSize: 11))),
                            ButtonSegment(value: 3, label: Text('Bank/Card', style: TextStyle(fontSize: 11))),
                            ButtonSegment(value: 4, label: Text('Credit/Due', style: TextStyle(fontSize: 11))),
                          ],
                          selected: {_paymentMode},
                          onSelectionChanged: (val) {
                            setState(() {
                              _paymentMode = val.first;
                              _updateReceivedDefault();
                            });
                          },
                        ),
                        if (_paymentMode == 4) ...[
                          const SizedBox(height: 10),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _creditDueDate ?? DateTime.now().add(const Duration(days: 30)),
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 365)),
                              );
                              if (picked != null) setState(() => _creditDueDate = picked);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFDE68A)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.timer_outlined, size: 16, color: Color(0xFFD97706)),
                                      const SizedBox(width: 6),
                                      Text(
                                        _creditDueDate != null
                                            ? 'Payment Due Date: ${_creditDueDate!.day}/${_creditDueDate!.month}/${_creditDueDate!.year}'
                                            : 'Set Credit Due Date (Net 30 Days)',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                                      ),
                                    ],
                                  ),
                                  const Icon(Icons.edit_calendar, size: 16, color: Color(0xFFD97706)),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 14),

                        // Financial Summary Lines
                        _buildSummaryLine('Gross Subtotal:', '₹${_subtotal.toStringAsFixed(2)}'),
                        if (_totalDiscount > 0)
                          _buildSummaryLine('Total Discounts (Item + Scheme):', '- ₹${_totalDiscount.toStringAsFixed(2)}', isDiscount: true),
                        _buildSummaryLine('Taxable Amount:', '₹${_totalTaxable.toStringAsFixed(2)}', isBold: true),
                        const SizedBox(height: 4),

                        // Real-time GST Resolution display
                        if (_isInterState)
                          _buildSummaryLine('IGST (Inter-State):', '₹${_igstAmount.toStringAsFixed(2)}', isTax: true)
                        else ...[
                          _buildSummaryLine('CGST (Central Tax 50%):', '₹${_cgstAmount.toStringAsFixed(2)}', isTax: true),
                          _buildSummaryLine('SGST (State Tax 50%):', '₹${_sgstAmount.toStringAsFixed(2)}', isTax: true),
                        ],

                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Grand Total:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                            Text(
                              '₹${_grandTotal.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.success),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4)),
              ],
            ),
            child: SafeArea(
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveInvoice,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _invoiceType == 1
                              ? 'Generate B2B Tax Invoice (₹${_grandTotal.toStringAsFixed(2)})'
                              : 'Generate Bill (₹${_grandTotal.toStringAsFixed(2)})',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTag(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: textColor)),
    );
  }

  Widget _buildSummaryLine(String title, String value, {bool isDiscount = false, bool isBold = false, bool isTax = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isDiscount ? AppTheme.danger : (isTax ? const Color(0xFF1E293B) : const Color(0xFF64748B)),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: isDiscount ? AppTheme.danger : const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}

/// Modal Sheet for Picking Items
class _ItemPickerSheet extends StatefulWidget {
  final ItemDao itemDao;
  final Function(ItemModel) onItemSelected;

  const _ItemPickerSheet({required this.itemDao, required this.onItemSelected});

  @override
  State<_ItemPickerSheet> createState() => _ItemPickerSheetState();
}

class _ItemPickerSheetState extends State<_ItemPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<ItemModel> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadItems('');
  }

  void _loadItems(String query) async {
    final list = await widget.itemDao.searchItems(query, limit: 30);
    if (mounted) {
      setState(() {
        _items = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.78,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Select Product for Bill', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: TextField(
              controller: _searchController,
              onChanged: _loadItems,
              decoration: const InputDecoration(
                hintText: 'Search medicine, SKU, barcode...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final it = _items[idx];
                      return ListTile(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        title: Text(it.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text('Stock: ${it.stockQuantity} ${it.uom ?? "Pcs"} | GST: ${it.gstRate}% | HSN: ${it.hsnCode ?? "3004"}', style: const TextStyle(fontSize: 11)),
                        trailing: Text(
                          '₹${it.salePrice.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.primary, fontSize: 14),
                        ),
                        onTap: () {
                          widget.onItemSelected(it);
                          Navigator.pop(context);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/// Comprehensive Pharma & Wholesale Line Item Edit Sheet
class _ItemEditSheet extends StatefulWidget {
  final _InvoiceEntryItem itemEntry;
  final Function(_InvoiceEntryItem) onSave;

  const _ItemEditSheet({required this.itemEntry, required this.onSave});

  @override
  State<_ItemEditSheet> createState() => _ItemEditSheetState();
}

class _ItemEditSheetState extends State<_ItemEditSheet> {
  late TextEditingController _qtyController;
  late TextEditingController _freeQtyController;
  late TextEditingController _rateController;
  late TextEditingController _mrpController;
  late TextEditingController _ptrController;
  late TextEditingController _ptsController;
  late TextEditingController _batchController;
  late TextEditingController _expController;
  late TextEditingController _discController;
  late TextEditingController _schemeDiscController;
  late TextEditingController _hsnController;

  @override
  void initState() {
    super.initState();
    final it = widget.itemEntry;
    _qtyController = TextEditingController(text: it.quantity.toStringAsFixed(0));
    _freeQtyController = TextEditingController(text: it.freeQuantity.toStringAsFixed(0));
    _rateController = TextEditingController(text: it.unitPrice.toStringAsFixed(2));
    _mrpController = TextEditingController(text: it.mrp.toStringAsFixed(2));
    _ptrController = TextEditingController(text: it.ptr.toStringAsFixed(2));
    _ptsController = TextEditingController(text: it.pts.toStringAsFixed(2));
    _batchController = TextEditingController(text: it.batchNumber ?? '');
    _expController = TextEditingController(text: it.expiryDate ?? '');
    _discController = TextEditingController(text: it.discountPercent.toStringAsFixed(1));
    _schemeDiscController = TextEditingController(text: it.schemeDiscountPercent.toStringAsFixed(1));
    _hsnController = TextEditingController(text: it.hsnCode ?? it.item.hsnCode ?? '3004');
  }

  @override
  void dispose() {
    _qtyController.dispose();
    _freeQtyController.dispose();
    _rateController.dispose();
    _mrpController.dispose();
    _ptrController.dispose();
    _ptsController.dispose();
    _batchController.dispose();
    _expController.dispose();
    _discController.dispose();
    _schemeDiscController.dispose();
    _hsnController.dispose();
    super.dispose();
  }

  void _onMrpChanged(String val) {
    final mrp = double.tryParse(val) ?? 0.0;
    if (mrp > 0) {
      final rates = PharmaPricingCalculator.calculateMargRates(
        mrp: mrp,
        gstRate: widget.itemEntry.item.gstRate,
      );
      setState(() {
        _ptrController.text = rates.ptr.toStringAsFixed(2);
        _ptsController.text = rates.pts.toStringAsFixed(2);
      });
    }
  }

  void _applyTierRate(double rate) {
    if (rate > 0) {
      setState(() {
        _rateController.text = rate.toStringAsFixed(2);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final it = widget.itemEntry.item;
    final qty = double.tryParse(_qtyController.text) ?? 1.0;
    final rate = double.tryParse(_rateController.text) ?? widget.itemEntry.unitPrice;
    final disc = double.tryParse(_discController.text) ?? 0.0;
    final schemeDisc = double.tryParse(_schemeDiscController.text) ?? 0.0;

    final gross = qty * rate;
    final itDisc = gross * (disc / 100);
    final afterIt = gross - itDisc;
    final schDisc = afterIt * (schemeDisc / 100);
    final taxable = gross - (itDisc + schDisc);
    final gst = taxable * (it.gstRate / 100);
    final total = taxable + gst;

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    it.name,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            Text('GST Rate: ${it.gstRate}% | Stock: ${it.stockQuantity} ${it.uom ?? "Pcs"}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            const SizedBox(height: 14),

            // Quantities: Billed Qty & Free Scheme Qty
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _qtyController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Billed Qty *',
                      prefixIcon: Icon(Icons.numbers, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _freeQtyController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Free Qty (Scheme)',
                      hintText: 'e.g. 1',
                      prefixIcon: Icon(Icons.card_giftcard, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Pharma Pricing Section Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: const Text('💊 Pharma / Wholesale Rate Tiers', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF15803D))),
            ),
            const SizedBox(height: 8),

            // MRP, PTR, PTS Inputs
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _mrpController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: _onMrpChanged,
                    decoration: const InputDecoration(
                      labelText: 'MRP (₹)',
                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _ptrController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'PTR (Retailer)',
                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _ptsController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'PTS (Stockist)',
                      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // 1-Tap Quick Rate Selector Chips
            Row(
              children: [
                const Text('Set Rate: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                const SizedBox(width: 4),
                InkWell(
                  onTap: () => _applyTierRate(double.tryParse(_ptsController.text) ?? 0.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFE0E7FF), borderRadius: BorderRadius.circular(6)),
                    child: const Text('Use PTS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF4338CA))),
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  onTap: () => _applyTierRate(double.tryParse(_ptrController.text) ?? 0.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                    child: const Text('Use PTR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF15803D))),
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  onTap: () => _applyTierRate(double.tryParse(_mrpController.text) ?? 0.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                    child: const Text('Use MRP', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Billed Rate & HSN Code
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _rateController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Billed Rate / Unit Price (₹) *',
                      prefixIcon: Icon(Icons.currency_rupee, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _hsnController,
                    decoration: const InputDecoration(
                      labelText: 'HSN / SAC Code',
                      hintText: 'e.g. 3004',
                      prefixIcon: Icon(Icons.tag, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Batch & Expiry
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _batchController,
                    decoration: const InputDecoration(
                      labelText: 'Batch Number',
                      hintText: 'e.g. B204-1',
                      prefixIcon: Icon(Icons.qr_code, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _expController,
                    decoration: const InputDecoration(
                      labelText: 'Expiry (MM/YY)',
                      hintText: 'e.g. 08/28',
                      prefixIcon: Icon(Icons.event, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Item Discount % & Scheme Discount %
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _discController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Item Discount %',
                      hintText: '0.0',
                      prefixIcon: Icon(Icons.percent, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _schemeDiscController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Scheme Disc %',
                      hintText: '0.0',
                      prefixIcon: Icon(Icons.discount_outlined, size: 16),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Live Calculation Card
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Taxable: ₹${taxable.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text('GST (${it.gstRate}%): ₹${gst.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Line Total:', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                      Text(
                        '₹${total.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppTheme.success),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Save Button
            ElevatedButton(
              onPressed: () {
                final updated = _InvoiceEntryItem(
                  item: it,
                  quantity: double.tryParse(_qtyController.text) ?? 1.0,
                  freeQuantity: double.tryParse(_freeQtyController.text) ?? 0.0,
                  unitPrice: double.tryParse(_rateController.text) ?? widget.itemEntry.unitPrice,
                  mrp: double.tryParse(_mrpController.text) ?? 0.0,
                  ptr: double.tryParse(_ptrController.text) ?? 0.0,
                  pts: double.tryParse(_ptsController.text) ?? 0.0,
                  discountPercent: double.tryParse(_discController.text) ?? 0.0,
                  schemeDiscountPercent: double.tryParse(_schemeDiscController.text) ?? 0.0,
                  batchNumber: _batchController.text.trim().isNotEmpty ? _batchController.text.trim() : null,
                  expiryDate: _expController.text.trim().isNotEmpty ? _expController.text.trim() : null,
                  hsnCode: _hsnController.text.trim().isNotEmpty ? _hsnController.text.trim() : null,
                );
                widget.onSave(updated);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Save Changes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
