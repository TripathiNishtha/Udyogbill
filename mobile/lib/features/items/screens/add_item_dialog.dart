import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/utils/pharma_pricing_calculator.dart';

class AddItemDialog extends StatefulWidget {
  final Function(ItemModel)? onSaved;

  const AddItemDialog({super.key, this.onSaved});

  @override
  State<AddItemDialog> createState() => _AddItemDialogState();
}

class _AddItemDialogState extends State<AddItemDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _hsnController = TextEditingController(text: '3004');
  final _salePriceController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _stockController = TextEditingController(text: '10');
  final _categoryController = TextEditingController(text: 'General');

  // Pharma / Wholesale B2B Master Fields
  bool _showBatchDetails = false;
  final _batchController = TextEditingController();
  final _expiryController = TextEditingController();
  final _mrpController = TextEditingController();
  final _ptrController = TextEditingController();
  final _ptsController = TextEditingController();
  final _rackController = TextEditingController();

  double _gstRate = 18.0;
  String _uom = 'Pcs';
  bool _isSaving = false;

  final List<double> _gstRates = [0.0, 5.0, 12.0, 18.0, 28.0];
  final List<String> _uoms = ['Pcs', 'Box', 'Strip', 'Kg', 'Gm', 'Ltr', 'Ml', 'Pack'];

  @override
  void dispose() {
    _nameController.dispose();
    _barcodeController.dispose();
    _hsnController.dispose();
    _salePriceController.dispose();
    _purchasePriceController.dispose();
    _stockController.dispose();
    _categoryController.dispose();
    _batchController.dispose();
    _expiryController.dispose();
    _mrpController.dispose();
    _ptrController.dispose();
    _ptsController.dispose();
    _rackController.dispose();
    super.dispose();
  }

  void _onMrpChanged(String val) {
    final mrp = double.tryParse(val.trim()) ?? 0.0;
    if (mrp > 0) {
      final rates = PharmaPricingCalculator.calculateMargRates(mrp: mrp, gstRate: _gstRate);
      setState(() {
        _ptrController.text = rates.ptr.toStringAsFixed(2);
        _ptsController.text = rates.pts.toStringAsFixed(2);
        if (_salePriceController.text.isEmpty || _salePriceController.text == '0.00') {
          _salePriceController.text = rates.ptr.toStringAsFixed(2);
        }
      });
    }
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
              title: const Text('Scan Barcode', style: TextStyle(color: Colors.white, fontSize: 16)),
              backgroundColor: Colors.black,
              leading: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
            Expanded(
              child: MobileScanner(
                onDetect: (capture) {
                  for (final b in capture.barcodes) {
                    if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                      setState(() => _barcodeController.text = b.rawValue!);
                      Navigator.pop(ctx);
                      break;
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

  Future<void> _saveItem() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      const storage = FlutterSecureStorage();
      final activeTenantId = await storage.read(key: AppConstants.keyTenantId) ?? '';

      final salePrice = double.tryParse(_salePriceController.text.trim()) ?? 0.0;
      final purchasePrice = double.tryParse(_purchasePriceController.text.trim()) ?? (salePrice * 0.8);
      final stock = double.tryParse(_stockController.text.trim()) ?? 0.0;
      final mrp = double.tryParse(_mrpController.text.trim()) ?? 0.0;
      final ptr = double.tryParse(_ptrController.text.trim()) ?? 0.0;
      final pts = double.tryParse(_ptsController.text.trim()) ?? 0.0;

      final newItem = ItemModel(
        id: const Uuid().v4(),
        tenantId: activeTenantId,
        name: _nameController.text.trim(),
        barcode: _barcodeController.text.trim().isEmpty ? null : _barcodeController.text.trim(),
        sku: _barcodeController.text.trim().isEmpty ? 'SKU-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}' : _barcodeController.text.trim(),
        hsnCode: _hsnController.text.trim().isEmpty ? null : _hsnController.text.trim(),
        batchNumber: _batchController.text.trim().isEmpty ? null : _batchController.text.trim().toUpperCase(),
        expiryDate: _expiryController.text.trim().isEmpty ? null : _expiryController.text.trim(),
        mrp: mrp,
        ptr: ptr,
        pts: pts,
        rackLocation: _rackController.text.trim().isEmpty ? null : _rackController.text.trim().toUpperCase(),
        salePrice: salePrice,
        purchasePrice: purchasePrice,
        stockQuantity: stock,
        gstRate: _gstRate,
        uom: _uom,
        categoryName: _categoryController.text.trim().isEmpty ? 'General' : _categoryController.text.trim(),
        isSynced: true,
        updatedAt: DateTime.now().toIso8601String(),
      );

      final dao = ItemDao();
      await dao.upsertItems([newItem]);

      if (!mounted) return;
      if (widget.onSaved != null) {
        widget.onSaved!(newItem);
      }
      Navigator.of(context).pop(newItem);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving item: $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        padding: const EdgeInsets.all(20),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Add New Product', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
                const SizedBox(height: 16),

                // Item Name
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Product / Item Name *',
                    hintText: 'e.g. Paracetamol 650mg / Atta 5kg',
                    prefixIcon: Icon(Icons.shopping_bag_outlined),
                  ),
                  validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter product name' : null,
                ),
                const SizedBox(height: 12),

                // Barcode with Scanner Icon
                TextFormField(
                  controller: _barcodeController,
                  decoration: InputDecoration(
                    labelText: 'Barcode / SKU',
                    hintText: 'Type or scan barcode',
                    prefixIcon: const Icon(Icons.qr_code),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
                      onPressed: _scanBarcode,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Prices: Sale Price & Purchase Price
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _salePriceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Sale Price (₹) *',
                          hintText: '0.00',
                          prefixText: '₹ ',
                        ),
                        validator: (val) => (val == null || val.trim().isEmpty) ? 'Enter price' : null,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _purchasePriceController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Purchase Price (₹)',
                          hintText: '0.00',
                          prefixText: '₹ ',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Stock & UOM
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _stockController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Opening Stock',
                          hintText: '0',
                          prefixIcon: Icon(Icons.inventory_2_outlined),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _uom,
                        decoration: const InputDecoration(labelText: 'Unit (UOM)'),
                        items: _uoms.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _uom = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // GST Rate Selection
                DropdownButtonFormField<double>(
                  initialValue: _gstRate,
                  decoration: const InputDecoration(
                    labelText: 'GST Tax Rate',
                    prefixIcon: Icon(Icons.percent),
                  ),
                  items: _gstRates.map((r) => DropdownMenuItem(value: r, child: Text('GST $r%'))).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _gstRate = val;
                        _onMrpChanged(_mrpController.text);
                      });
                    }
                  },
                ),
                const SizedBox(height: 14),

                // Pharma & Wholesale B2B Batch Details (Collapsible)
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Column(
                    children: [
                      InkWell(
                        onTap: () => setState(() => _showBatchDetails = !_showBatchDetails),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.medication_liquid_outlined, size: 18, color: AppTheme.primary),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Pharma & Batch Details (बैच/एक्सपायरी)',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                                  ),
                                ],
                              ),
                              Icon(_showBatchDetails ? Icons.expand_less : Icons.expand_more, color: Colors.grey[600]),
                            ],
                          ),
                        ),
                      ),
                      if (_showBatchDetails)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Divider(height: 1),
                              const SizedBox(height: 10),
                              // Batch No & Expiry
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _batchController,
                                      textCapitalization: TextCapitalization.characters,
                                      decoration: const InputDecoration(
                                        labelText: 'Batch Number',
                                        hintText: 'e.g. B-9941',
                                        prefixIcon: Icon(Icons.pin_outlined, size: 18),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _expiryController,
                                      decoration: const InputDecoration(
                                        labelText: 'Expiry (MM/YY)',
                                        hintText: 'e.g. 12/28',
                                        prefixIcon: Icon(Icons.event_outlined, size: 18),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // MRP (Auto-calculates PTR & PTS)
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _mrpController,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      onChanged: _onMrpChanged,
                                      decoration: const InputDecoration(
                                        labelText: 'MRP (₹)',
                                        hintText: '0.00',
                                        prefixText: '₹ ',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _ptrController,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      decoration: const InputDecoration(
                                        labelText: 'PTR (₹) [Retailer]',
                                        hintText: '0.00',
                                        prefixText: '₹ ',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // PTS & HSN
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _ptsController,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      decoration: const InputDecoration(
                                        labelText: 'PTS (₹) [Stockist]',
                                        hintText: '0.00',
                                        prefixText: '₹ ',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _hsnController,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: 'HSN Code',
                                        hintText: '3004',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              // Rack Location
                              TextFormField(
                                controller: _rackController,
                                textCapitalization: TextCapitalization.characters,
                                decoration: const InputDecoration(
                                  labelText: 'Rack / Shelf Location',
                                  hintText: 'e.g. RACK-A3 / SHELF-2',
                                  prefixIcon: Icon(Icons.shelves, size: 18),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Save Button
                ElevatedButton(
                  onPressed: _isSaving ? null : _saveItem,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _isSaving
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save Product', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
