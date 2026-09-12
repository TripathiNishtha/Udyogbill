import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/database/daos/party_dao.dart';

class ScannedItemModel {
  String name;
  String? hsn;
  double quantity;
  double purchasePrice;
  double gstRate;
  double confidence; // 0.0 to 1.0 (low confidence highlighted in warning yellow)

  ScannedItemModel({
    required this.name,
    this.hsn,
    required this.quantity,
    required this.purchasePrice,
    required this.gstRate,
    this.confidence = 0.95,
  });

  double get taxableAmount => quantity * purchasePrice;
  double get gstAmount => taxableAmount * (gstRate / 100);
  double get totalAmount => taxableAmount + gstAmount;
}

class PurchaseVerificationScreen extends StatefulWidget {
  final File? imageFile;
  final String scannedSupplierName;
  final String scannedGstin;
  final String scannedBillNumber;
  final String scannedDate;
  final List<ScannedItemModel> initialItems;

  const PurchaseVerificationScreen({
    super.key,
    this.imageFile,
    required this.scannedSupplierName,
    required this.scannedGstin,
    required this.scannedBillNumber,
    required this.scannedDate,
    required this.initialItems,
  });

  @override
  State<PurchaseVerificationScreen> createState() => _PurchaseVerificationScreenState();
}

class _PurchaseVerificationScreenState extends State<PurchaseVerificationScreen> {
  late TextEditingController _supplierNameCtrl;
  late TextEditingController _gstinCtrl;
  late TextEditingController _billNoCtrl;
  late TextEditingController _billDateCtrl;
  late List<ScannedItemModel> _items;

  final ItemDao _itemDao = ItemDao();
  final PartyDao _partyDao = PartyDao();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _supplierNameCtrl = TextEditingController(text: widget.scannedSupplierName);
    _gstinCtrl = TextEditingController(text: widget.scannedGstin);
    _billNoCtrl = TextEditingController(text: widget.scannedBillNumber);
    _billDateCtrl = TextEditingController(text: widget.scannedDate);
    _items = List.from(widget.initialItems);
  }

  @override
  void dispose() {
    _supplierNameCtrl.dispose();
    _gstinCtrl.dispose();
    _billNoCtrl.dispose();
    _billDateCtrl.dispose();
    super.dispose();
  }

  double get _totalTaxable => _items.fold(0.0, (sum, i) => sum + i.taxableAmount);
  double get _totalGst => _items.fold(0.0, (sum, i) => sum + i.gstAmount);
  double get _grandTotal => _items.fold(0.0, (sum, i) => sum + i.totalAmount);

  void _editItemDialog(int index) {
    final item = _items[index];
    final nameCtrl = TextEditingController(text: item.name);
    final hsnCtrl = TextEditingController(text: item.hsn ?? '');
    final qtyCtrl = TextEditingController(text: item.quantity.toString());
    final rateCtrl = TextEditingController(text: item.purchasePrice.toString());
    final gstCtrl = TextEditingController(text: item.gstRate.toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Scanned Item Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Product Name', isDense: true)),
              const SizedBox(height: 10),
              TextField(controller: hsnCtrl, decoration: const InputDecoration(labelText: 'HSN Code', isDense: true)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: TextField(controller: qtyCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Quantity', isDense: true))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: rateCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Purchase Rate (₹)', isDense: true))),
                ],
              ),
              const SizedBox(height: 10),
              TextField(controller: gstCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'GST %', isDense: true)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            onPressed: () {
              setState(() {
                _items[index] = ScannedItemModel(
                  name: nameCtrl.text.trim(),
                  hsn: hsnCtrl.text.trim(),
                  quantity: double.tryParse(qtyCtrl.text) ?? item.quantity,
                  purchasePrice: double.tryParse(rateCtrl.text) ?? item.purchasePrice,
                  gstRate: double.tryParse(gstCtrl.text) ?? item.gstRate,
                  confidence: 1.0, // Manually verified
                );
              });
              Navigator.pop(ctx);
            },
            child: const Text('Update Item'),
          ),
        ],
      ),
    );
  }

  void _addNewItem() {
    setState(() {
      _items.add(
        ScannedItemModel(
          name: "New Scanned Item ${_items.length + 1}",
          quantity: 1,
          purchasePrice: 100.0,
          gstRate: 18.0,
          confidence: 1.0,
        ),
      );
    });
  }

  Future<void> _confirmAndInwardStock() async {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('At least 1 item is required to save purchase.')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      const storage = FlutterSecureStorage();
      final activeTenantId = await storage.read(key: AppConstants.keyTenantId) ?? '';

      // 1. Auto-record/update supplier in SQLite parties table
      final supplierName = _supplierNameCtrl.text.trim();
      final supplierGstin = _gstinCtrl.text.trim();
      final supplierId = "supp-${supplierName.toLowerCase().replaceAll(' ', '-')}";

      await _partyDao.insertParty(PartyModel(
        id: supplierId,
        tenantId: activeTenantId,
        name: supplierName,
        gstin: supplierGstin.isNotEmpty ? supplierGstin : null,
        outstandingBalance: -_grandTotal, // Negative = Payable to supplier (Dene Hain)
        partyType: 2, // Supplier
        updatedAt: DateTime.now().toIso8601String(),
      ));

      // 2. Inward inventory stock for each scanned item
      for (final itm in _items) {
        final itemId = "item-${itm.name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-')}";
        await _itemDao.upsertItems([
          ItemModel(
            id: itemId,
            tenantId: activeTenantId,
            name: itm.name,
            hsnCode: itm.hsn,
            salePrice: itm.purchasePrice * 1.25, // Default 25% gross margin
            purchasePrice: itm.purchasePrice,
            stockQuantity: itm.quantity,
            gstRate: itm.gstRate,
            updatedAt: DateTime.now().toIso8601String(),
          ),
        ]);
      }

      if (!mounted) return;

      setState(() => _isSaving = false);

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
                child: const Icon(Icons.check_circle, color: AppTheme.success, size: 54),
              ),
              const SizedBox(height: 16),
              const Text('Purchase Inward Complete!', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
              const SizedBox(height: 8),
              Text(
                'Bill #${_billNoCtrl.text} recorded successfully.\n${_items.length} items added to inventory stock and supplier ledger balance updated.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                  onPressed: () {
                    Navigator.pop(ctx); // Close dialog
                    Navigator.pop(context); // Close verification screen
                    Navigator.pop(context); // Close scanner screen
                  },
                  child: const Text('View Inventory & Dashboard'),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error recording purchase: $e'), backgroundColor: AppTheme.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verify & Confirm Purchase'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Verification Notice Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                border: Border.all(color: const Color(0xFF93C5FD)),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: AppTheme.primary, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'AI ne bill scan kar liya hai. Kripya niche diye gaye items aur rates ko aankho se verify karein aur confirm karein.',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Supplier & Bill Meta Card
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
                  const Text('Supplier & Bill Header', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const Divider(height: 20),
                  TextFormField(
                    controller: _supplierNameCtrl,
                    decoration: const InputDecoration(labelText: 'Supplier / Wholesaler Name', isDense: true, border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        flex: 6,
                        child: TextFormField(
                          controller: _gstinCtrl,
                          decoration: const InputDecoration(labelText: 'Supplier GSTIN', isDense: true, border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 5,
                        child: TextFormField(
                          controller: _billNoCtrl,
                          decoration: const InputDecoration(labelText: 'Invoice / Bill #', isDense: true, border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Line Items Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Scanned Items (${_items.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                TextButton.icon(
                  icon: const Icon(Icons.add_circle_outline, size: 16, color: AppTheme.primary),
                  label: const Text('Add Item', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                  onPressed: _addNewItem,
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Items List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final itm = _items[idx];
                final isModerateConfidence = itm.confidence < 0.90;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isModerateConfidence ? const Color(0xFFFFFBEB) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isModerateConfidence ? const Color(0xFFF59E0B) : Colors.grey[200]!,
                      width: isModerateConfidence ? 1.5 : 1.0,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              itm.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.primary),
                            onPressed: () => _editItemDialog(idx),
                            tooltip: 'Edit Item Details',
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppTheme.danger),
                            onPressed: () => setState(() => _items.removeAt(idx)),
                            tooltip: 'Remove Item',
                          ),
                        ],
                      ),
                      if (isModerateConfidence)
                        Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(4)),
                          child: const Text('⚠️ Check rate & quantity (OCR confidence 82%)', style: TextStyle(fontSize: 10, color: Color(0xFFB45309), fontWeight: FontWeight.bold)),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${itm.quantity} Units @ ₹${itm.purchasePrice.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          Text('GST: ${itm.gstRate.toInt()}%', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          Text('₹${itm.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryDark)),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),

            // Financial Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Taxable Value:', style: TextStyle(fontSize: 13, color: Colors.grey)),
                      Text('₹${_totalTaxable.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Input GST (ITC):', style: TextStyle(fontSize: 13, color: Colors.grey)),
                      Text('₹${_totalGst.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Net Purchase Total:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                      Text('₹${_grandTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.success)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Inward Button
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.success,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.inventory_rounded),
                label: Text(
                  _isSaving ? 'Updating Stock...' : 'Confirm & Inward Stock',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                onPressed: _isSaving ? null : _confirmAndInwardStock,
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
