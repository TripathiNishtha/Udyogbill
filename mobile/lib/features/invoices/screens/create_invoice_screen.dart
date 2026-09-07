import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/sync/sync_service.dart';
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
  double quantity = 1.0;
  double unitPrice;
  double discountPercent = 0.0;

  _InvoiceEntryItem({
    required this.item,
    required this.unitPrice,
  });

  double get gross => quantity * unitPrice;
  double get discountAmount => gross * (discountPercent / 100);
  double get taxableAmount => gross - discountAmount;
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

  PartyModel? _selectedParty;
  List<PartyModel> _allCustomers = [];

  final List<_InvoiceEntryItem> _billItems = [];

  int _paymentMode = 1; // 1 = Cash, 2 = UPI, 3 = Card, 4 = Credit
  final TextEditingController _receivedAmountController = TextEditingController();
  bool _isSaving = false;

  bool _isQuickCustomer = false;
  final TextEditingController _quickNameController = TextEditingController();
  final TextEditingController _quickPhoneController = TextEditingController();

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
        } else if (customers.isNotEmpty) {
          _selectedParty = customers.first;
        }
      });
    }
  }

  double get _subtotal => _billItems.fold(0.0, (s, i) => s + i.taxableAmount);
  double get _totalGst => _billItems.fold(0.0, (s, i) => s + i.totalGst);
  double get _grandTotal => _billItems.fold(0.0, (s, i) => s + i.totalAmount);

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
          setState(() {
            final idx = _billItems.indexWhere((it) => it.item.id == item.id);
            if (idx >= 0) {
              _billItems[idx].quantity += 1;
            } else {
              _billItems.add(_InvoiceEntryItem(item: item, unitPrice: item.salePrice));
            }
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
      backgroundColor: Colors.black,
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            AppBar(
              title: const Text('Scan Product Barcode', style: TextStyle(color: Colors.white, fontSize: 16)),
              backgroundColor: Colors.black,
              leading: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
            Expanded(
              child: MobileScanner(
                onDetect: (capture) async {
                  for (final b in capture.barcodes) {
                    if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                      final item = await _itemDao.getByBarcode(b.rawValue!);
                      if (item != null) {
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                        }
                        if (mounted) {
                          setState(() {
                            final idx = _billItems.indexWhere((it) => it.item.id == item.id);
                            if (idx >= 0) {
                              _billItems[idx].quantity += 1;
                            } else {
                              _billItems.add(_InvoiceEntryItem(item: item, unitPrice: item.salePrice));
                            }
                            _updateReceivedDefault();
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Added ${item.name}'),
                              backgroundColor: AppTheme.success,
                              duration: const Duration(milliseconds: 900),
                            ),
                          );
                        }
                        break;
                      }
                    }
                  }
                },
              ),
            ),
          ],
        ),
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
      final invoiceId = const Uuid().v4();
      final total = _grandTotal;
      final paid = double.tryParse(_receivedAmountController.text) ?? (_paymentMode == 4 ? 0.0 : total);
      final balance = total - paid;

      String partyName = _selectedParty?.name ?? 'Walk-in Cash Customer';
      String? partyPhone = _selectedParty?.phone;
      String? partyGstin = _selectedParty?.gstin;
      String? partyId = _selectedParty?.id;

      if (_isQuickCustomer) {
        final qName = _quickNameController.text.trim();
        final qPhone = _quickPhoneController.text.trim();
        if (qName.isNotEmpty) {
          partyName = qName;
          partyPhone = qPhone.isNotEmpty ? qPhone : null;
          partyId = const Uuid().v4();
          // Auto-save to parties table so name & number are saved in reports & customer directory!
          final quickParty = PartyModel(
            id: partyId,
            tenantId: 'demo-tenant',
            name: partyName,
            phone: partyPhone,
            partyType: 1, // Customer
            customerType: 2, // Retail
            updatedAt: DateTime.now().toIso8601String(),
          );
          await _partyDao.insertParty(quickParty);
        }
      }

      final invoiceModel = InvoiceModel(
        id: invoiceId,
        tenantId: 'demo-tenant',
        invoiceNumber: _invoiceNumber,
        invoiceDate: _invoiceDate.toIso8601String().substring(0, 10),
        partyId: partyId,
        partyName: partyName,
        partyPhone: partyPhone,
        partyGstin: partyGstin,
        taxableAmount: _subtotal,
        cgstAmount: _totalGst / 2,
        sgstAmount: _totalGst / 2,
        igstAmount: 0.0,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance > 0 ? balance : 0.0,
        paymentMode: _paymentMode,
        paymentStatus: balance <= 0 ? 3 : (paid > 0 ? 2 : 1),
        isCancelled: false,
        isSynced: false,
        createdAt: DateTime.now().toIso8601String(),
        items: _billItems.map((bi) {
          return InvoiceItemModel(
            id: const Uuid().v4(),
            invoiceId: invoiceId,
            itemId: bi.item.id,
            itemName: bi.item.name,
            itemSku: bi.item.sku,
            quantity: bi.quantity,
            unitPrice: bi.unitPrice,
            discountPercent: bi.discountPercent,
            taxableAmount: bi.taxableAmount,
            gstRate: bi.item.gstRate,
            cgstAmount: bi.totalGst / 2,
            sgstAmount: bi.totalGst / 2,
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

      _syncService.flushSyncQueue().ignore();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invoice $_invoiceNumber Created Successfully!'),
          backgroundColor: AppTheme.success,
        ),
      );

      // Open full invoice preview screen immediately so user sees the complete bill!
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => InvoiceDetailPreviewScreen(invoice: invoiceModel),
        ),
      );
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
      appBar: AppBar(
        title: const Text('New GST Sales Bill'),
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
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Invoice No & Date Row
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[200]!),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Invoice Number', style: TextStyle(fontSize: 11, color: Colors.grey)),
                              const SizedBox(height: 2),
                              Text(
                                _invoiceNumber,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primary),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
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
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Invoice Date', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today, size: 13, color: AppTheme.primary),
                                    const SizedBox(width: 6),
                                    Text(
                                      '${_invoiceDate.day}/${_invoiceDate.month}/${_invoiceDate.year}',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
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
                  const SizedBox(height: 14),

                  // Customer Selector Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Bill To Customer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
                                    });
                                  }
                                },
                                child: const Text(
                                  '+ Add Full Party',
                                  style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: false, label: Text('Saved Party'), icon: Icon(Icons.people_outline, size: 16)),
                            ButtonSegment(value: true, label: Text('⚡ Quick (Name+Phone)'), icon: Icon(Icons.flash_on, size: 16)),
                          ],
                          selected: {_isQuickCustomer},
                          onSelectionChanged: (val) => setState(() => _isQuickCustomer = val.first),
                        ),
                        const SizedBox(height: 12),
                        if (_isQuickCustomer) ...[
                          TextFormField(
                            controller: _quickNameController,
                            decoration: const InputDecoration(
                              labelText: 'Customer Name *',
                              hintText: 'e.g. Rajesh Sharma',
                              prefixIcon: Icon(Icons.person_outline),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _quickPhoneController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Mobile Number',
                              hintText: '10 digits mobile',
                              prefixIcon: Icon(Icons.phone_outlined),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                          ),
                        ] else ...[
                          DropdownButtonFormField<PartyModel>(
                            key: ValueKey(_selectedParty?.id),
                            initialValue: _selectedParty,
                            isExpanded: true,
                            decoration: InputDecoration(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: _allCustomers.map((p) {
                              return DropdownMenuItem(
                                value: p,
                                child: Text(
                                  '${p.name} ${p.phone != null ? "(${p.phone})" : ""}',
                                  style: const TextStyle(fontSize: 13),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() => _selectedParty = val);
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Items Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Items (${_billItems.length})',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      ElevatedButton.icon(
                        onPressed: _openItemPicker,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Add Item'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryLight,
                          foregroundColor: AppTheme.primaryDark,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Center(
                        child: Column(
                          children: [
                            Icon(Icons.add_shopping_cart_outlined, size: 40, color: Colors.grey[400]),
                            const SizedBox(height: 8),
                            Text('No items added yet', style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Text('Tap "+ Add Item" or scan barcode above', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
                          ],
                        ),
                      ),
                    )
                  else
                    ..._billItems.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final it = entry.value;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      it.item.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
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
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove_circle_outline, size: 20),
                                        onPressed: () {
                                          setState(() {
                                            if (it.quantity > 1) {
                                              it.quantity -= 1;
                                            } else {
                                              _billItems.removeAt(idx);
                                            }
                                            _updateReceivedDefault();
                                          });
                                        },
                                      ),
                                      Text(
                                        '${it.quantity.toStringAsFixed(0)} ${it.item.uom ?? "Pcs"}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add_circle_outline, size: 20),
                                        onPressed: () {
                                          setState(() {
                                            it.quantity += 1;
                                            _updateReceivedDefault();
                                          });
                                        },
                                      ),
                                    ],
                                  ),
                                  Text(
                                    '₹${it.unitPrice.toStringAsFixed(2)}',
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                                  ),
                                  Text(
                                    '₹${it.totalAmount.toStringAsFixed(2)}',
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A)),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),

                  const SizedBox(height: 16),

                  // Payment Mode & Bill Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Payment Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 8),
                        SegmentedButton<int>(
                          segments: const [
                            ButtonSegment(value: 1, label: Text('Cash')),
                            ButtonSegment(value: 2, label: Text('UPI')),
                            ButtonSegment(value: 4, label: Text('Credit (Udhar)')),
                          ],
                          selected: {_paymentMode},
                          onSelectionChanged: (val) {
                            setState(() {
                              _paymentMode = val.first;
                              _updateReceivedDefault();
                            });
                          },
                        ),
                        const SizedBox(height: 14),

                        // Summary rows
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Subtotal (Taxable):', style: TextStyle(fontSize: 13, color: Colors.grey)),
                            Text('₹${_subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('GST (CGST + SGST):', style: TextStyle(fontSize: 13, color: Colors.grey)),
                            Text('₹${_totalGst.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Grand Total:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                            Text(
                              '₹${_grandTotal.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppTheme.success),
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

          // Bottom Bar
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
                  ),
                  child: _isSaving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          'Save & Generate Bill (₹${_grandTotal.toStringAsFixed(2)})',
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
}

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
      height: MediaQuery.of(context).size.height * 0.75,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Select Product to Add', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
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
                hintText: 'Search product or barcode...',
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
                          side: BorderSide(color: Colors.grey[200]!),
                        ),
                        title: Text(it.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text('Stock: ${it.stockQuantity} ${it.uom ?? ""} | GST: ${it.gstRate}%', style: const TextStyle(fontSize: 11)),
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
