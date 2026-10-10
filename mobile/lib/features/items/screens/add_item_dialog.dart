import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/utils/pharma_pricing_calculator.dart';

class AddItemDialog extends StatefulWidget {
  final Function(ItemModel)? onSaved;
  final String? initialBarcode;

  const AddItemDialog({super.key, this.onSaved, this.initialBarcode});

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
  final _wholesalePriceController = TextEditingController();
  bool _isLookingUp = false;

  // Garments & Footwear Variants Support
  bool _showVariantsSection = false;
  final Set<String> _selectedSizes = {};
  final Set<String> _selectedColors = {};
  final Map<String, TextEditingController> _variantBarcodeControllers = {};

  final List<String> _shoeSizesUK = ['6', '7', '8', '9', '10', '11', '12'];
  final List<String> _euroSizes = ['38', '39', '40', '41', '42', '43', '44', '45'];
  final List<String> _clothingSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  final List<String> _popularColors = ['Black', 'White', 'Navy Blue', 'Grey', 'Tan Brown', 'Red', 'Beige'];

  // Pharma / Wholesale B2B Master Fields
  bool _showBatchDetails = false;
  final _batchController = TextEditingController();
  final _expiryController = TextEditingController();
  final _mrpController = TextEditingController();
  final _ptrController = TextEditingController();
  final _ptsController = TextEditingController();
  final _rackController = TextEditingController();

  // Auto Parts & Spares Master Fields
  bool _showAutoPartsSection = false;
  final _oemPartNoController = TextEditingController();
  final _brandMakeController = TextEditingController();
  final _rackBinController = TextEditingController();
  final _vehicleModelController = TextEditingController();
  final _warrantyController = TextEditingController();

  // Auto Parts Multi-Number & Brand Matrix
  bool _enableAutoPartsMatrix = false;
  String _autoPartsSpecType = 'GEAR_RATIO'; // GEAR_RATIO, BEARING_NO, BORE_SIZE, GEAR_POS, CUSTOM
  final List<Map<String, dynamic>> _autoPartsMatrixRows = [];
  List<String> _customAutoSpecs = [];
  List<String> _customAutoBrands = [];

  final _newSpecNoController = TextEditingController();
  final _newBrandController = TextEditingController();
  final _newPartNoController = TextEditingController();
  final _newQtyController = TextEditingController(text: '1');
  final _newPurchaseCostController = TextEditingController();
  final _newSaleRateController = TextEditingController();
  final _newMrpController = TextEditingController();
  final _newMechanicRateController = TextEditingController();
  final _newMatrixRackController = TextEditingController();

  double _gstRate = 18.0;
  String _uom = 'Pcs';
  bool _isSaving = false;
  String? _matchedBrandName;
  String _tenantIndustry = 'OTHER';

  final List<double> _gstRates = [0.0, 5.0, 12.0, 18.0, 28.0];
  final List<String> _uoms = ['Pcs', 'Box', 'Strip', 'Kg', 'Gm', 'Ltr', 'Ml', 'Pack'];

  bool get _isPharmaIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('PHARMA') || ind.contains('HEALTH') || ind.contains('CHEMIST') || ind.contains('MEDIC');
  }

  bool get _isFootwearIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('FOOTWEAR') || ind.contains('SHOE');
  }

  bool get _isGarmentIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('GARMENT') || ind.contains('APPAREL') || ind.contains('CLOTH') || ind.contains('TEXTILE') || ind.contains('FASHION');
  }

  bool get _isFootwearOrGarmentIndustry {
    return _isFootwearIndustry || _isGarmentIndustry;
  }

  bool get _isAutoPartsIndustry {
    final ind = _tenantIndustry.toUpperCase();
    return ind.contains('AUTO') || ind.contains('SPARE') || ind.contains('MOTOR') || ind.contains('GARAGE') || ind.contains('TYRE') || ind.contains('BATTERY') || ind.contains('TRACTOR');
  }

  @override
  void initState() {
    super.initState();
    _loadTenantIndustry();
    _loadCustomAutoPartsData();
    if (widget.initialBarcode != null && widget.initialBarcode!.trim().isNotEmpty) {
      _barcodeController.text = widget.initialBarcode!.trim();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _lookupBarcode(widget.initialBarcode!.trim());
      });
    }
  }

  Future<void> _loadTenantIndustry() async {
    try {
      const storage = FlutterSecureStorage();
      final ind = await storage.read(key: AppConstants.keyTenantIndustry);
      if (ind != null && ind.isNotEmpty && mounted) {
        final upper = ind.toUpperCase();
        setState(() {
          _tenantIndustry = upper;
          if (_isPharmaIndustry) {
            _showBatchDetails = true;
            _showVariantsSection = false;
            _showAutoPartsSection = false;
          } else if (_isFootwearOrGarmentIndustry) {
            _showVariantsSection = true;
            _showBatchDetails = false;
            _showAutoPartsSection = false;
          } else if (_isAutoPartsIndustry) {
            _showAutoPartsSection = true;
            _showBatchDetails = false;
            _showVariantsSection = false;
            if (_hsnController.text.isEmpty) _hsnController.text = '8708';
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _loadCustomAutoPartsData() async {
    try {
      const storage = FlutterSecureStorage();
      final specsStr = await storage.read(key: 'udyogbill_custom_autoparts_specs');
      final brandsStr = await storage.read(key: 'udyogbill_custom_autoparts_brands');
      if (mounted) {
        setState(() {
          if (specsStr != null && specsStr.isNotEmpty) {
            _customAutoSpecs = List<String>.from(jsonDecode(specsStr));
          }
          if (brandsStr != null && brandsStr.isNotEmpty) {
            _customAutoBrands = List<String>.from(jsonDecode(brandsStr));
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _saveCustomAutoPartsData() async {
    try {
      const storage = FlutterSecureStorage();
      await storage.write(key: 'udyogbill_custom_autoparts_specs', value: jsonEncode(_customAutoSpecs));
      await storage.write(key: 'udyogbill_custom_autoparts_brands', value: jsonEncode(_customAutoBrands));
    } catch (_) {}
  }

  Future<void> _showAddCustomSpecDialog() async {
    final textController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Custom Number / Ratio', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: textController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. 43/10, 6304, 4PK850',
            labelText: 'Spec / Ratio / Size',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, textController.text.trim()),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      if (!_customAutoSpecs.contains(result)) {
        setState(() {
          _customAutoSpecs.add(result);
          _newSpecNoController.text = result;
        });
        await _saveCustomAutoPartsData();
      } else {
        setState(() {
          _newSpecNoController.text = result;
        });
      }
    }
  }

  Future<void> _showAddCustomBrandDialog() async {
    final textController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Custom Brand / Make', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: textController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. Endurance, Rolon, Talbros, Fag',
            labelText: 'Brand Name',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, textController.text.trim()),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      if (!_customAutoBrands.contains(result)) {
        setState(() {
          _customAutoBrands.add(result);
          _newBrandController.text = result;
        });
        await _saveCustomAutoPartsData();
      } else {
        setState(() {
          _newBrandController.text = result;
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _barcodeController.dispose();
    _hsnController.dispose();
    _salePriceController.dispose();
    _purchasePriceController.dispose();
    _stockController.dispose();
    _categoryController.dispose();
    _wholesalePriceController.dispose();
    _batchController.dispose();
    _expiryController.dispose();
    _mrpController.dispose();
    _ptrController.dispose();
    _ptsController.dispose();
    _rackController.dispose();
    _oemPartNoController.dispose();
    _brandMakeController.dispose();
    _rackBinController.dispose();
    _vehicleModelController.dispose();
    _warrantyController.dispose();
    _newSpecNoController.dispose();
    _newBrandController.dispose();
    _newPartNoController.dispose();
    _newQtyController.dispose();
    _newPurchaseCostController.dispose();
    _newSaleRateController.dispose();
    _newMrpController.dispose();
    _newMechanicRateController.dispose();
    _newMatrixRackController.dispose();
    for (final c in _variantBarcodeControllers.values) {
      c.dispose();
    }
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

  Future<void> _lookupBarcode(String code) async {
    final cleanCode = code.trim();
    if (cleanCode.isEmpty) return;
    setState(() => _isLookingUp = true);

    try {
      final apiClient = ApiClient();
      final res = await apiClient.get('/tenant/barcode/lookup/${Uri.encodeComponent(cleanCode)}');

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data;
        final existsInStore = data['existsInStore'] == true;

        if (existsInStore && data['storeItem'] != null) {
          final item = data['storeItem'];
          final currentStock = (item['totalStock'] ?? 0).toString();

          if (!mounted) return;
          showDialog(
            context: context,
            builder: (c) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.inventory_2_rounded, color: Colors.orange),
                  SizedBox(width: 8),
                  Expanded(child: Text('Item Exists in Store', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Current Stock:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        Text('$currentStock ${item['primaryUomCode'] ?? 'Pcs'}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.orange)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('Sale Price: ₹${item['sellingPrice'] ?? '0.00'}', style: const TextStyle(fontSize: 12)),
                  Text('MRP: ₹${item['mrp'] ?? '0.00'}', style: const TextStyle(fontSize: 12)),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                  onPressed: () {
                    Navigator.pop(c);
                    setState(() {
                      _nameController.text = item['name'] ?? '';
                      _salePriceController.text = (item['sellingPrice'] ?? '').toString();
                      _purchasePriceController.text = (item['purchasePrice'] ?? '').toString();
                      _mrpController.text = (item['mrp'] ?? '').toString();
                      _hsnController.text = item['hsnCode'] ?? '';
                      _gstRate = double.tryParse((item['taxRate'] ?? 18.0).toString()) ?? 18.0;
                    });
                  },
                  child: const Text('Load to Edit Stock', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        } else if (data['masterCatalogItem'] != null) {
          final master = data['masterCatalogItem'];
          final brand = master['brandName']?.toString().trim();
          var prodName = master['productName']?.toString().trim() ?? '';
          if (brand != null && brand.isNotEmpty && !prodName.toLowerCase().startsWith(brand.toLowerCase())) {
            prodName = '$brand $prodName';
          }
          final mrpNum = (master['mrp'] != null && (master['mrp'] as num) > 0) ? (master['mrp'] as num).toDouble() : 0.0;
          setState(() {
            _matchedBrandName = (brand != null && brand.isNotEmpty) ? brand : null;
            _nameController.text = prodName;
            _hsnController.text = master['hsnCode']?.toString().trim() ?? '';
            if (mrpNum > 0) {
              _mrpController.text = mrpNum.toStringAsFixed(2);
              _salePriceController.text = mrpNum.toStringAsFixed(2);
              _purchasePriceController.text = (mrpNum * 0.8).toStringAsFixed(2);
            }
            _gstRate = double.tryParse((master['taxRate'] ?? 18.0).toString()) ?? 18.0;
            if (master['categoryName'] != null && master['categoryName'].toString().isNotEmpty) {
              _categoryController.text = master['categoryName'];
            }
            if (master['unitCode'] != null) {
              final rawUnit = master['unitCode'].toString().trim().toLowerCase();
              if (rawUnit == 'pcs' || rawUnit == 'piece') {
                _uom = 'Pcs';
              } else if (rawUnit == 'box') {
                _uom = 'Box';
              } else if (rawUnit == 'pack' || rawUnit == 'pkg' || rawUnit == 'packet') {
                _uom = 'Pack';
              } else if (rawUnit == 'kg') {
                _uom = 'Kg';
              } else if (rawUnit == 'gm' || rawUnit == 'g') {
                _uom = 'Gm';
              } else if (rawUnit == 'ltr' || rawUnit == 'l') {
                _uom = 'Ltr';
              } else if (rawUnit == 'ml') {
                _uom = 'Ml';
              } else if (rawUnit == 'strip') {
                _uom = 'Strip';
              }
            }
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(Icons.auto_awesome, color: Colors.yellow, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text('Auto-filled: $prodName', maxLines: 1, overflow: TextOverflow.ellipsis)),
                  ],
                ),
                backgroundColor: Colors.green.shade800,
                duration: const Duration(seconds: 3),
              ),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Scanned: $cleanCode. Please enter item name & price.'),
                backgroundColor: Colors.blueGrey.shade800,
                duration: const Duration(seconds: 3),
              ),
            );
          }
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Scanned: $cleanCode. Please enter item name & price.'),
            backgroundColor: Colors.blueGrey.shade800,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLookingUp = false);
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
                      final scannedCode = b.rawValue!;
                      setState(() => _barcodeController.text = scannedCode);
                      Navigator.pop(ctx);
                      _lookupBarcode(scannedCode);
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

  void _scanSingleVariantBarcode(String vKey, String label) {
    bool hasScanned = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.65,
        child: Column(
          children: [
            AppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Scan Variant Barcode', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(label, style: const TextStyle(color: Colors.tealAccent, fontSize: 12)),
                ],
              ),
              backgroundColor: Colors.black,
              leading: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(ctx),
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  MobileScanner(
                    onDetect: (capture) {
                      if (hasScanned) return;
                      for (final b in capture.barcodes) {
                        final code = b.rawValue?.trim();
                        if (code != null && code.isNotEmpty) {
                          hasScanned = true;
                          setState(() {
                            if (!_variantBarcodeControllers.containsKey(vKey)) {
                              _variantBarcodeControllers[vKey] = TextEditingController();
                            }
                            _variantBarcodeControllers[vKey]!.text = code;
                          });
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('✓ Scanned for $label: $code'),
                              backgroundColor: Colors.green.shade800,
                              duration: const Duration(seconds: 2),
                            ),
                          );
                          break;
                        }
                      }
                    },
                  ),
                  Center(
                    child: Container(
                      width: 250,
                      height: 140,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.tealAccent, width: 2),
                        borderRadius: BorderRadius.circular(12),
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

  void _scanRapidVariantBarcodes() {
    final sizes = _selectedSizes.isNotEmpty ? _selectedSizes.toList() : ['Standard'];
    final colors = _selectedColors.isNotEmpty ? _selectedColors.toList() : ['Regular'];
    final List<Map<String, String>> combos = [];
    for (final s in sizes) {
      for (final c in colors) {
        combos.add({
          'key': '${s}_$c',
          'label': '$s / $c',
        });
      }
    }

    if (combos.isEmpty) return;

    int currentIdx = 0;
    for (int i = 0; i < combos.length; i++) {
      final k = combos[i]['key']!;
      if (_variantBarcodeControllers[k]?.text.trim().isEmpty ?? true) {
        currentIdx = i;
        break;
      }
    }

    bool scanCooldown = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final current = combos[currentIdx];
          final progress = '${currentIdx + 1}/${combos.length}';

          return SizedBox(
            height: MediaQuery.of(context).size.height * 0.75,
            child: Column(
              children: [
                AppBar(
                  title: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.bolt_rounded, color: Colors.amber, size: 18),
                          const SizedBox(width: 4),
                          Text('Rapid Scan ($progress)', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Text(
                        current['label']!,
                        style: const TextStyle(color: Colors.tealAccent, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  backgroundColor: Colors.black,
                  leading: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                  actions: [
                    TextButton.icon(
                      icon: const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 16),
                      label: const Text('Done', style: TextStyle(color: Colors.greenAccent)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: Colors.teal.shade900.withValues(alpha: 0.4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Target: ${current['label']}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      if (currentIdx < combos.length - 1)
                        TextButton(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                          onPressed: () {
                            setModalState(() {
                              currentIdx++;
                            });
                          },
                          child: const Text('Skip →', style: TextStyle(color: Colors.amber, fontSize: 12)),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: Stack(
                    children: [
                      MobileScanner(
                        onDetect: (capture) {
                          if (scanCooldown) return;
                          for (final b in capture.barcodes) {
                            final code = b.rawValue?.trim();
                            if (code != null && code.isNotEmpty) {
                              scanCooldown = true;
                              final key = current['key']!;
                              setState(() {
                                if (!_variantBarcodeControllers.containsKey(key)) {
                                  _variantBarcodeControllers[key] = TextEditingController();
                                }
                                _variantBarcodeControllers[key]!.text = code;
                              });

                              if (currentIdx + 1 < combos.length) {
                                setModalState(() {
                                  currentIdx++;
                                });
                                Future.delayed(const Duration(milliseconds: 600), () {
                                  scanCooldown = false;
                                });
                              } else {
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text('✓ All ${combos.length} variant barcodes scanned!'),
                                    backgroundColor: Colors.green.shade800,
                                  ),
                                );
                              }
                              break;
                            }
                          }
                        },
                      ),
                      Center(
                        child: Container(
                          width: 260,
                          height: 140,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.tealAccent, width: 2.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Scan Barcode for ${current['label']}',
                                style: const TextStyle(color: Colors.white, fontSize: 10),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.black,
                  child: Row(
                    children: [
                      if (currentIdx > 0)
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.white70, side: const BorderSide(color: Colors.white30)),
                          onPressed: () {
                            setModalState(() {
                              currentIdx--;
                            });
                          },
                          child: const Text('← Prev'),
                        ),
                      const Spacer(),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Finish'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _autoGenerateVariantBarcodes() {
    final baseBarcode = _barcodeController.text.trim().isNotEmpty
        ? _barcodeController.text.trim()
        : 'UB${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';

    final sizes = _selectedSizes.isNotEmpty ? _selectedSizes.toList() : ['Standard'];
    final colors = _selectedColors.isNotEmpty ? _selectedColors.toList() : ['Regular'];

    setState(() {
      for (final s in sizes) {
        for (final c in colors) {
          final key = '${s}_$c';
          if (!_variantBarcodeControllers.containsKey(key)) {
            _variantBarcodeControllers[key] = TextEditingController();
          }
          if (_variantBarcodeControllers[key]!.text.trim().isEmpty) {
            final sTag = s.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
            final cTag = c.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
            _variantBarcodeControllers[key]!.text = '$baseBarcode-$sTag-$cTag';
          }
        }
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('✓ Generated unique barcodes for blank variants'),
        backgroundColor: Colors.teal,
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
      final wholesalePrice = double.tryParse(_wholesalePriceController.text.trim()) ?? 0.0;
      final purchasePrice = double.tryParse(_purchasePriceController.text.trim()) ?? (salePrice * 0.8);
      var stock = double.tryParse(_stockController.text.trim()) ?? 0.0;
      final mrp = double.tryParse(_mrpController.text.trim()) ?? 0.0;
      final ptr = double.tryParse(_ptrController.text.trim()) ?? (wholesalePrice > 0 ? wholesalePrice : 0.0);
      final pts = double.tryParse(_ptsController.text.trim()) ?? 0.0;

      // Footwear & Garments Variants Matrix Ingestion
      final List<Map<String, dynamic>> openingVariants = [];

      // Auto Parts Multi-Number & Brand Matrix Ingestion
      if (_autoPartsMatrixRows.isNotEmpty) {
        final sumQty = _autoPartsMatrixRows.fold<double>(0.0, (acc, r) => acc + (double.tryParse((r['quantity'] ?? 0).toString()) ?? 0.0));
        if (sumQty > 0) stock = sumQty;

        for (final r in _autoPartsMatrixRows) {
          final q = double.tryParse((r['quantity'] ?? 0).toString()) ?? 0.0;
          final p = double.tryParse((r['purchasePrice'] ?? 0).toString()) ?? purchasePrice;
          final s = double.tryParse((r['sellingPrice'] ?? 0).toString()) ?? salePrice;
          final m = double.tryParse((r['mrp'] ?? 0).toString()) ?? (mrp > 0 ? mrp : salePrice);
          openingVariants.add({
            'size': r['specNumber'],
            'color': r['brand'],
            'quantity': q,
            'purchasePrice': p,
            'sellingPrice': s,
            'mrp': m,
          });
        }
      }
      if (_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty) {
        final sizes = _selectedSizes.isNotEmpty ? _selectedSizes.toList() : ['Standard'];
        final colors = _selectedColors.isNotEmpty ? _selectedColors.toList() : ['Regular'];
        final totalCombos = sizes.length * colors.length;
        final qtyPerVariant = (stock > 0 && totalCombos > 0) ? (stock / totalCombos).roundToDouble() : 0.0;
        for (final s in sizes) {
          for (final c in colors) {
            final key = '${s}_$c';
            final vBarcode = _variantBarcodeControllers[key]?.text.trim();
            openingVariants.add({
              'size': s,
              'color': c,
              'quantity': qtyPerVariant,
              'purchasePrice': purchasePrice,
              'wholesalePrice': wholesalePrice > 0 ? wholesalePrice : null,
              'mrp': mrp > 0 ? mrp : salePrice,
              if (vBarcode != null && vBarcode.isNotEmpty) 'barcode': vBarcode,
            });
          }
        }
      }

      String realItemId = const Uuid().v4();
      bool isSynced = false;

      final attributesJsonStr = jsonEncode({
        if (_matchedBrandName != null && _matchedBrandName!.isNotEmpty) 'brand': _matchedBrandName,
        'wholesalePrice': wholesalePrice,
        'ptr': ptr,
        'pts': pts,
        'rack': _rackBinController.text.trim().isNotEmpty ? _rackBinController.text.trim() : _rackController.text.trim(),
        if (_oemPartNoController.text.trim().isNotEmpty) 'oemPartNumber': _oemPartNoController.text.trim().toUpperCase(),
        if (_brandMakeController.text.trim().isNotEmpty) 'brandMake': _brandMakeController.text.trim(),
        if (_vehicleModelController.text.trim().isNotEmpty) 'applicableVehicles': _vehicleModelController.text.trim(),
        if (_warrantyController.text.trim().isNotEmpty) 'warrantyMonths': _warrantyController.text.trim(),
        if (_autoPartsMatrixRows.isNotEmpty) ...{
          'isAutoPartsMatrixEnabled': true,
          'autoPartsSpecType': _autoPartsSpecType,
          'autoPartsMatrix': _autoPartsMatrixRows,
        },
      });

      // Post to Cloud Backend immediately so Desktop & Mobile have identical item & inventory
      try {
        final apiClient = ApiClient();
        final payload = <String, dynamic>{
          'name': _nameController.text.trim(),
          'barcode': _barcodeController.text.trim().isEmpty ? null : _barcodeController.text.trim(),
          'sku': _barcodeController.text.trim().isEmpty ? 'SKU-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}' : _barcodeController.text.trim(),
          'hsnCode': _hsnController.text.trim().isEmpty ? null : _hsnController.text.trim(),
          'sellingPrice': salePrice,
          'purchasePrice': purchasePrice,
          'mrp': mrp > 0 ? mrp : salePrice,
          'taxRate': _gstRate,
          'initialStock': stock,
          'uomCode': _uom,
          'trackVariants': openingVariants.isNotEmpty,
          if (openingVariants.isNotEmpty) 'openingVariants': openingVariants,
          'attributesJson': attributesJsonStr,
        };
        final res = await apiClient.post('/tenant/items', data: payload);
        if (res.statusCode == 200 || res.statusCode == 201) {
          isSynced = true;
          final serverId = res.data is Map ? (res.data['id'] ?? res.data['data']) : res.data;
          if (serverId != null && serverId.toString().isNotEmpty) {
            realItemId = serverId.toString();
          }
        }
      } catch (_) {
        // In offline mode, continue smoothly with local UUID
      }

      final newItem = ItemModel(
        id: realItemId,
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
        isSynced: isSynced,
        attributesJson: attributesJsonStr,
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
      insetPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 540),
        color: Colors.white,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Compact Header Bar with Brand Accent
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 12, 10),
              decoration: const BoxDecoration(
                color: Color(0xFFFFF7ED), // Warm tint
                border: Border(bottom: BorderSide(color: Color(0xFFFED7AA))),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.25),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Add New Product',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          'Enter product details, pricing & inventory',
                          style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Form Body with Keyboard Avoidance
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Item Name
                      TextFormField(
                        controller: _nameController,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        decoration: const InputDecoration(
                          labelText: 'Product / Item Name *',
                          hintText: 'e.g. Sparx Men Running Shoes / Dolo 650',
                          prefixIcon: Icon(Icons.shopping_bag_outlined, size: 18),
                          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        ),
                        validator: (val) => (val == null || val.trim().isEmpty) ? 'Please enter product name' : null,
                      ),
                      const SizedBox(height: 8),

                      // Barcode with Auto-Lookup & Scanner Icon
                      TextFormField(
                        controller: _barcodeController,
                        decoration: InputDecoration(
                          labelText: (_showVariantsSection && (_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty))
                              ? 'Master / Box Barcode (Optional)'
                              : 'Barcode / SKU',
                          hintText: (_showVariantsSection && (_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty))
                              ? 'Outer carton barcode (optional)'
                              : 'Type or scan barcode',
                          helperText: (_showVariantsSection && (_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty))
                              ? 'Har variant ka alag barcode neeche list me scan karein'
                              : null,
                          helperStyle: const TextStyle(fontSize: 11, color: Color(0xFF0D9488), fontWeight: FontWeight.w600),
                          prefixIcon: const Icon(Icons.qr_code_rounded),
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (_isLookingUp)
                                const Padding(
                                  padding: EdgeInsets.all(12),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                )
                              else
                                IconButton(
                                  icon: const Icon(Icons.search, color: AppTheme.primary, size: 20),
                                  onPressed: () => _lookupBarcode(_barcodeController.text),
                                  tooltip: 'Lookup Master Catalog',
                                ),
                              IconButton(
                                icon: const Icon(Icons.qr_code_scanner_rounded, color: AppTheme.primary, size: 20),
                                onPressed: _scanBarcode,
                                tooltip: 'Scan Camera Barcode',
                              ),
                            ],
                          ),
                        ),
                        onFieldSubmitted: (v) => _lookupBarcode(v),
                      ),
                      const SizedBox(height: 12),

                      // Prices: Sale Price & Wholesale Price
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _salePriceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Sale Price *',
                                hintText: '0.00',
                                prefixText: '₹ ',
                              ),
                              validator: (val) => (val == null || val.trim().isEmpty) ? 'Enter price' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _wholesalePriceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Wholesale Price',
                                hintText: '0.00',
                                prefixText: '₹ ',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Purchase Price & Opening Stock
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _purchasePriceController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Purchase Price',
                                hintText: '0.00',
                                prefixText: '₹ ',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _stockController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Opening Stock',
                                hintText: '0',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // UOM & GST Tax Rate
                      Row(
                        children: [
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
                          const SizedBox(width: 10),
                          Expanded(
                            child: DropdownButtonFormField<double>(
                              initialValue: _gstRate,
                              decoration: const InputDecoration(
                                labelText: 'GST Rate',
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
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Garments & Footwear Sizes & Colors Variants (Collapsible - Hidden for Pharma & AutoParts)
                      if (!_isPharmaIndustry && !_isAutoPartsIndustry) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFAFAFA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              InkWell(
                                onTap: () => setState(() => _showVariantsSection = !_showVariantsSection),
                                borderRadius: BorderRadius.circular(14),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.checkroom_rounded, size: 18, color: AppTheme.primary),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Footwear & Garments Variants${(_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty) ? " (${_selectedSizes.length} sizes, ${_selectedColors.length} colors)" : ""}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                                          ),
                                        ],
                                      ),
                                      Icon(_showVariantsSection ? Icons.expand_less : Icons.expand_more, color: Colors.grey[600]),
                                    ],
                                  ),
                                ),
                              ),
                              if (_showVariantsSection)
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Divider(height: 1),
                                      const SizedBox(height: 10),
                                      if (!_isGarmentIndustry) ...[
                                        const Text('Shoe Sizes (UK / India):',
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _shoeSizesUK.map((sz) {
                                            final isSel = _selectedSizes.contains(sz);
                                            return FilterChip(
                                              label: Text(sz, style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                                              selected: isSel,
                                              onSelected: (selected) {
                                                setState(() {
                                                  if (selected) {
                                                    _selectedSizes.add(sz);
                                                  } else {
                                                    _selectedSizes.remove(sz);
                                                  }
                                                });
                                              },
                                              selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                                              checkmarkColor: AppTheme.primary,
                                            );
                                          }).toList(),
                                        ),
                                        const SizedBox(height: 10),
                                        const Text('Euro Sizes:',
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _euroSizes.map((sz) {
                                            final isSel = _selectedSizes.contains(sz);
                                            return FilterChip(
                                              label: Text(sz, style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                                              selected: isSel,
                                              onSelected: (selected) {
                                                setState(() {
                                                  if (selected) {
                                                    _selectedSizes.add(sz);
                                                  } else {
                                                    _selectedSizes.remove(sz);
                                                  }
                                                });
                                              },
                                              selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                                              checkmarkColor: AppTheme.primary,
                                            );
                                          }).toList(),
                                        ),
                                        const SizedBox(height: 10),
                                      ],
                                      if (!_isFootwearIndustry) ...[
                                        const Text('Clothing Sizes:',
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _clothingSizes.map((sz) {
                                            final isSel = _selectedSizes.contains(sz);
                                            return FilterChip(
                                              label: Text(sz, style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                                              selected: isSel,
                                              onSelected: (selected) {
                                                setState(() {
                                                  if (selected) {
                                                    _selectedSizes.add(sz);
                                                  } else {
                                                    _selectedSizes.remove(sz);
                                                  }
                                                });
                                              },
                                              selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                                              checkmarkColor: AppTheme.primary,
                                            );
                                          }).toList(),
                                        ),
                                        const SizedBox(height: 10),
                                      ],
                                      const Text('Colors / Shades:',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                                      const SizedBox(height: 6),
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 6,
                                        children: _popularColors.map((col) {
                                          final isSel = _selectedColors.contains(col);
                                          return FilterChip(
                                            label: Text(col, style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                                            selected: isSel,
                                            onSelected: (selected) {
                                              setState(() {
                                                if (selected) {
                                                  _selectedColors.add(col);
                                                } else {
                                                  _selectedColors.remove(col);
                                                }
                                              });
                                            },
                                            selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                                            checkmarkColor: AppTheme.primary,
                                          );
                                        }).toList(),
                                      ),
                                      if (_selectedSizes.isNotEmpty || _selectedColors.isNotEmpty) ...[
                                        const Divider(height: 24),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      const Icon(Icons.style_outlined, size: 15, color: AppTheme.primary),
                                                      const SizedBox(width: 4),
                                                       Text(
                                                         'Variant Barcodes (${(_selectedSizes.isEmpty ? 1 : _selectedSizes.length) * (_selectedColors.isEmpty ? 1 : _selectedColors.length)})',
                                                         style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                                       ),
                                                     ],
                                                   ),
                                                  const Text(
                                                    'Har size/color ka apna alag barcode',
                                                    style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Wrap(
                                              spacing: 6,
                                              children: [
                                                IconButton(
                                                  icon: const Icon(Icons.auto_awesome, size: 18, color: Colors.teal),
                                                  tooltip: 'Auto-Generate Blank Barcodes',
                                                  visualDensity: VisualDensity.compact,
                                                  padding: EdgeInsets.zero,
                                                  onPressed: _autoGenerateVariantBarcodes,
                                                ),
                                                ElevatedButton.icon(
                                                  style: ElevatedButton.styleFrom(
                                                    backgroundColor: Colors.teal.shade700,
                                                    foregroundColor: Colors.white,
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    visualDensity: VisualDensity.compact,
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                                  ),
                                                  icon: const Icon(Icons.bolt, size: 14),
                                                  label: const Text('Rapid Scan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                  onPressed: _scanRapidVariantBarcodes,
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        ...(() {
                                          final sizes = _selectedSizes.isNotEmpty ? _selectedSizes.toList() : ['Standard'];
                                          final colors = _selectedColors.isNotEmpty ? _selectedColors.toList() : ['Regular'];
                                          final List<Widget> comboWidgets = [];
                                          for (final s in sizes) {
                                            for (final c in colors) {
                                              final key = '${s}_$c';
                                              final ctrl = _variantBarcodeControllers.putIfAbsent(key, () => TextEditingController());
                                              comboWidgets.add(
                                                Container(
                                                  margin: const EdgeInsets.only(bottom: 6),
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                  decoration: BoxDecoration(
                                                    color: Colors.white,
                                                    borderRadius: BorderRadius.circular(8),
                                                    border: Border.all(color: const Color(0xFFCBD5E1)),
                                                  ),
                                                  child: Row(
                                                    children: [
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                                        decoration: BoxDecoration(
                                                          color: AppTheme.primary.withValues(alpha: 0.1),
                                                          borderRadius: BorderRadius.circular(4),
                                                        ),
                                                        child: Text(
                                                          '$s / $c',
                                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                                        ),
                                                      ),
                                                      const SizedBox(width: 8),
                                                      Expanded(
                                                        child: TextFormField(
                                                          controller: ctrl,
                                                          style: const TextStyle(fontSize: 12),
                                                          decoration: InputDecoration(
                                                            hintText: 'Barcode for $s / $c',
                                                            hintStyle: const TextStyle(fontSize: 11, color: Colors.grey),
                                                            isDense: true,
                                                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                                                            suffixIcon: IconButton(
                                                              icon: const Icon(Icons.camera_alt_rounded, size: 18, color: AppTheme.primary),
                                                              visualDensity: VisualDensity.compact,
                                                              padding: EdgeInsets.zero,
                                                              tooltip: 'Scan Barcode with Camera',
                                                              onPressed: () => _scanSingleVariantBarcode(key, '$s / $c'),
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            }
                                          }
                                          return comboWidgets;
                                        })(),
                                      ],
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Automobile Spare Parts & Fitment Section (Collapsible - Auto Parts Merchants)
                      if (_isAutoPartsIndustry) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFAFAFA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              InkWell(
                                onTap: () => setState(() => _showAutoPartsSection = !_showAutoPartsSection),
                                borderRadius: BorderRadius.circular(14),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.directions_car_rounded, size: 18, color: AppTheme.primary),
                                          const SizedBox(width: 8),
                                          const Text(
                                            'Auto Parts & Fitment Details',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                                          ),
                                        ],
                                      ),
                                      Icon(_showAutoPartsSection ? Icons.expand_less : Icons.expand_more, color: Colors.grey[600]),
                                    ],
                                  ),
                                ),
                              ),
                              if (_showAutoPartsSection)
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                  child: Column(
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: TextFormField(
                                              controller: _oemPartNoController,
                                              textCapitalization: TextCapitalization.characters,
                                              decoration: const InputDecoration(
                                                labelText: 'OEM Part No.',
                                                hintText: 'e.g. 16510M68K00',
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: TextFormField(
                                              controller: _brandMakeController,
                                              decoration: const InputDecoration(
                                                labelText: 'Brand / Make',
                                                hintText: 'e.g. MGP, Bosch',
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: TextFormField(
                                              controller: _rackBinController,
                                              decoration: const InputDecoration(
                                                labelText: 'Rack & Bin',
                                                hintText: 'e.g. R-1 / Sh-2 / B-14',
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: TextFormField(
                                              controller: _vehicleModelController,
                                              decoration: const InputDecoration(
                                                labelText: 'Vehicle Model',
                                                hintText: 'e.g. Swift 2012-2020',
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      TextFormField(
                                        controller: _warrantyController,
                                        keyboardType: TextInputType.number,
                                        decoration: const InputDecoration(
                                          labelText: 'Warranty (Months)',
                                          hintText: 'e.g. 24 for Batteries',
                                        ),
                                      ),
                                       const SizedBox(height: 14),

                                       // ─── Multi-Number & Brand Matrix Builder ───
                                       Container(
                                         padding: const EdgeInsets.all(12),
                                         decoration: BoxDecoration(
                                           color: const Color(0xFFFFF7ED),
                                           borderRadius: BorderRadius.circular(12),
                                           border: Border.all(color: const Color(0xFFFED7AA)),
                                         ),
                                         child: Column(
                                           crossAxisAlignment: CrossAxisAlignment.stretch,
                                           children: [
                                             Row(
                                               mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                               children: [
                                                 Row(
                                                   children: [
                                                     Icon(Icons.hub_rounded, size: 16, color: Colors.orange.shade800),
                                                     const SizedBox(width: 6),
                                                     Text(
                                                       'Multi-Number & Brand Matrix',
                                                       style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.orange.shade900),
                                                     ),
                                                   ],
                                                 ),
                                                 Switch(
                                                   value: _enableAutoPartsMatrix,
                                                   activeThumbColor: AppTheme.primary,
                                                   onChanged: (val) => setState(() => _enableAutoPartsMatrix = val),
                                                 ),
                                               ],
                                             ),
                                             Text(
                                               'Add variant numbers (e.g. Gear 37/7, 39/8 or Bearings) with independent brands & stock.',
                                               style: TextStyle(fontSize: 10, color: Colors.orange.shade800),
                                             ),

                                             if (_enableAutoPartsMatrix) ...[
                                               const SizedBox(height: 10),
                                               // Spec Type Chips (1-Click Category Switcher)
                                                SingleChildScrollView(
                                                  scrollDirection: Axis.horizontal,
                                                  child: Row(
                                                    children: [
                                                      for (final entry in [
                                                        ['GEAR_RATIO', '⚙️ Gear Teeth / Ratio'],
                                                        ['BEARING_NO', '🔘 Bearing Numbers'],
                                                        ['BORE_SIZE', '🔧 Bore / Piston Sizes'],
                                                        ['GEAR_POS', '🕹️ Gear Positions'],
                                                        ['CUSTOM', '🏷️ Custom / Belts / Sizes'],
                                                      ])
                                                        Padding(
                                                          padding: const EdgeInsets.only(right: 6),
                                                          child: ChoiceChip(
                                                            label: Text(entry[1], style: const TextStyle(fontSize: 10)),
                                                            selected: _autoPartsSpecType == entry[0],
                                                            selectedColor: AppTheme.primary.withValues(alpha: 0.2),
                                                            onSelected: (sel) {
                                                              if (sel) setState(() => _autoPartsSpecType = entry[0]);
                                                            },
                                                          ),
                                                        ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(height: 8),

                                                // Quick Spec Number Suggestions + Custom Added Specs + [+ Add Number]
                                                Row(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    const Padding(
                                                      padding: EdgeInsets.only(top: 4, right: 6),
                                                      child: Text('Quick No:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                                    ),
                                                    Expanded(
                                                      child: Wrap(
                                                        spacing: 4,
                                                        runSpacing: 4,
                                                        children: [
                                                          ...(_autoPartsSpecType == 'GEAR_RATIO'
                                                              ? ['37/7', '39/8', '41/9', '43/10', '45/11', '47/12', '14T', '15T', '38T', '42T', '44T']
                                                              : _autoPartsSpecType == 'BEARING_NO'
                                                                  ? ['6201', '6202', '6203', '6204', '6205', '6301', '6302', '6304', '6004', '30205']
                                                                  : _autoPartsSpecType == 'BORE_SIZE'
                                                                      ? ['STD', '0.25', '0.50', '0.75', '1.00', '47 mm', '50 mm', '54 mm']
                                                                      : _autoPartsSpecType == 'GEAR_POS'
                                                                          ? ['1st Gear', '2nd Gear', '3rd Gear', '4th Gear', '5th Gear', 'Reverse', 'Main Shaft', 'Counter Shaft']
                                                                          : ['4PK850', '6PK1200', '195/65R15', '145/80R12', 'Universal'])
                                                              .map((s) => ActionChip(
                                                                    label: Text(s, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                                                    padding: EdgeInsets.zero,
                                                                    onPressed: () => setState(() => _newSpecNoController.text = s),
                                                                  )),
                                                          for (final cs in _customAutoSpecs)
                                                            InputChip(
                                                              label: Text(cs, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.deepOrange)),
                                                              backgroundColor: Colors.orange.shade50,
                                                              padding: EdgeInsets.zero,
                                                              onPressed: () => setState(() => _newSpecNoController.text = cs),
                                                              onDeleted: () async {
                                                                setState(() => _customAutoSpecs.remove(cs));
                                                                await _saveCustomAutoPartsData();
                                                              },
                                                              deleteIconColor: Colors.deepOrange,
                                                              deleteIcon: const Icon(Icons.close, size: 12),
                                                            ),
                                                          ActionChip(
                                                            avatar: const Icon(Icons.add, size: 14, color: AppTheme.primary),
                                                            label: const Text('+ Add No', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                                            backgroundColor: AppTheme.primary.withValues(alpha: 0.08),
                                                            padding: EdgeInsets.zero,
                                                            onPressed: _showAddCustomSpecDialog,
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 6),

                                                // Quick Brand Suggestions + Custom Added Brands + [+ Add Brand]
                                                Row(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    const Padding(
                                                      padding: EdgeInsets.only(top: 4, right: 6),
                                                      child: Text('Brands:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                                    ),
                                                    Expanded(
                                                      child: Wrap(
                                                        spacing: 4,
                                                        runSpacing: 4,
                                                        children: [
                                                          ...['Bosch', 'MGP', 'Hyundai', 'Tata', 'Mahindra', 'Uno Minda', 'Lumax', 'Rane', 'SKF', 'NBC', 'Fag', 'Valeo', 'Gabriel', 'Endurance', 'Rolon', 'Talbros', 'Castrol', 'Motul']
                                                              .map((b) => ActionChip(
                                                                    label: Text(b, style: const TextStyle(fontSize: 10)),
                                                                    padding: EdgeInsets.zero,
                                                                    onPressed: () => setState(() => _newBrandController.text = b),
                                                                  )),
                                                          for (final cb in _customAutoBrands)
                                                            InputChip(
                                                              label: Text(cb, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue)),
                                                              backgroundColor: Colors.blue.shade50,
                                                              padding: EdgeInsets.zero,
                                                              onPressed: () => setState(() => _newBrandController.text = cb),
                                                              onDeleted: () async {
                                                                setState(() => _customAutoBrands.remove(cb));
                                                                await _saveCustomAutoPartsData();
                                                              },
                                                              deleteIconColor: Colors.blue.shade800,
                                                              deleteIcon: const Icon(Icons.close, size: 12),
                                                            ),
                                                          ActionChip(
                                                            avatar: const Icon(Icons.add, size: 14, color: Colors.blue),
                                                            label: const Text('+ Add Brand', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue)),
                                                            backgroundColor: Colors.blue.shade50,
                                                            padding: EdgeInsets.zero,
                                                            onPressed: _showAddCustomBrandDialog,
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 10),

                                                // Inputs: Number & Brand
                                               Row(
                                                 children: [
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newSpecNoController,
                                                       decoration: const InputDecoration(
                                                         labelText: 'Variant / Gear No *',
                                                         hintText: 'e.g. 39/8',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                   const SizedBox(width: 8),
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newBrandController,
                                                       decoration: const InputDecoration(
                                                         labelText: 'Brand / Make *',
                                                         hintText: 'e.g. Bosch',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                 ],
                                               ),
                                               const SizedBox(height: 8),

                                               // Inputs: Qty, Sale Price, Purchase Cost
                                               Row(
                                                 children: [
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newQtyController,
                                                       keyboardType: TextInputType.number,
                                                       decoration: const InputDecoration(
                                                         labelText: 'Stock Qty',
                                                         hintText: '1',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                   const SizedBox(width: 8),
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newSaleRateController,
                                                       keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                                       decoration: const InputDecoration(
                                                         labelText: 'Sale Rate ₹',
                                                         hintText: '1850',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                   const SizedBox(width: 8),
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newPurchaseCostController,
                                                       keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                                       decoration: const InputDecoration(
                                                         labelText: 'Cost ₹',
                                                         hintText: '1400',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                 ],
                                               ),
                                               const SizedBox(height: 8),

                                               // Inputs: MRP, Mechanic Net Rate, Rack/Bin
                                               Row(
                                                 children: [
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newMrpController,
                                                       keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                                       decoration: const InputDecoration(
                                                         labelText: 'MRP ₹',
                                                         hintText: '2100',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                   const SizedBox(width: 8),
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newMechanicRateController,
                                                       keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                                       decoration: const InputDecoration(
                                                         labelText: 'Mistri Rate ₹',
                                                         hintText: '1750',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                   const SizedBox(width: 8),
                                                   Expanded(
                                                     child: TextFormField(
                                                       controller: _newMatrixRackController,
                                                       decoration: const InputDecoration(
                                                         labelText: 'Rack Bin',
                                                         hintText: 'R-1/B-2',
                                                         isDense: true,
                                                         contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                       ),
                                                     ),
                                                   ),
                                                 ],
                                               ),
                                               const SizedBox(height: 10),

                                               // Add Row Button
                                               ElevatedButton.icon(
                                                 style: ElevatedButton.styleFrom(
                                                   backgroundColor: Colors.orange.shade700,
                                                   foregroundColor: Colors.white,
                                                   padding: const EdgeInsets.symmetric(vertical: 8),
                                                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                 ),
                                                 onPressed: () {
                                                   final specNo = _newSpecNoController.text.trim();
                                                   final brand = _newBrandController.text.trim();
                                                   if (specNo.isEmpty || brand.isEmpty) {
                                                     ScaffoldMessenger.of(context).showSnackBar(
                                                       const SnackBar(content: Text('Please enter Variant Number and Brand'), backgroundColor: Colors.orange),
                                                     );
                                                     return;
                                                   }
                                                   final qty = double.tryParse(_newQtyController.text.trim()) ?? 1.0;
                                                   final sale = double.tryParse(_newSaleRateController.text.trim()) ?? (double.tryParse(_salePriceController.text.trim()) ?? 0.0);
                                                   final cost = double.tryParse(_newPurchaseCostController.text.trim()) ?? (double.tryParse(_purchasePriceController.text.trim()) ?? 0.0);
                                                   final mrp = double.tryParse(_newMrpController.text.trim()) ?? (double.tryParse(_mrpController.text.trim()) ?? sale);
                                                   final mech = double.tryParse(_newMechanicRateController.text.trim()) ?? 0.0;
                                                   final rack = _newMatrixRackController.text.trim().isNotEmpty ? _newMatrixRackController.text.trim() : _rackBinController.text.trim();

                                                   setState(() {
                                                     _autoPartsMatrixRows.add({
                                                       'id': DateTime.now().millisecondsSinceEpoch.toString(),
                                                       'specNumber': specNo,
                                                       'brand': brand,
                                                       'partNumber': _newPartNoController.text.trim(),
                                                       'quantity': qty,
                                                       'purchasePrice': cost,
                                                       'sellingPrice': sale,
                                                       'mrp': mrp,
                                                       'mechanicRate': mech,
                                                       'rackLocation': rack,
                                                     });
                                                     _newSpecNoController.clear();
                                                     _newQtyController.text = '1';
                                                   });
                                                 },
                                                 icon: const Icon(Icons.add, size: 16),
                                                 label: const Text('+ Add Row to Matrix', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                               ),

                                               // Added Rows Cards List
                                               if (_autoPartsMatrixRows.isNotEmpty) ...[
                                                 const SizedBox(height: 10),
                                                 Text(
                                                   '${_autoPartsMatrixRows.length} Variant(s) Configured:',
                                                   style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange.shade900),
                                                 ),
                                                 const SizedBox(height: 6),
                                                 for (int i = 0; i < _autoPartsMatrixRows.length; i++)
                                                   Container(
                                                     margin: const EdgeInsets.only(bottom: 6),
                                                     padding: const EdgeInsets.all(8),
                                                     decoration: BoxDecoration(
                                                       color: Colors.white,
                                                       borderRadius: BorderRadius.circular(8),
                                                       border: Border.all(color: Colors.orange.shade200),
                                                     ),
                                                     child: Row(
                                                       children: [
                                                         Expanded(
                                                           child: Column(
                                                             crossAxisAlignment: CrossAxisAlignment.start,
                                                             children: [
                                                               Row(
                                                                 children: [
                                                                   Container(
                                                                     padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                                     decoration: BoxDecoration(
                                                                       color: Colors.orange.shade100,
                                                                       borderRadius: BorderRadius.circular(4),
                                                                     ),
                                                                     child: Text(
                                                                       'No: ${_autoPartsMatrixRows[i]['specNumber']}',
                                                                       style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.orange.shade900),
                                                                     ),
                                                                   ),
                                                                   const SizedBox(width: 6),
                                                                   Text(
                                                                     '${_autoPartsMatrixRows[i]['brand']}',
                                                                     style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                                                   ),
                                                                   const Spacer(),
                                                                   Container(
                                                                     padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                                     decoration: BoxDecoration(
                                                                       color: const Color(0xFFECFDF5),
                                                                       borderRadius: BorderRadius.circular(4),
                                                                       border: Border.all(color: const Color(0xFFA7F3D0)),
                                                                     ),
                                                                     child: Text(
                                                                       'Stock: ${_autoPartsMatrixRows[i]['quantity']}',
                                                                       style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Color(0xFF065F46)),
                                                                     ),
                                                                   ),
                                                                 ],
                                                               ),
                                                               const SizedBox(height: 4),
                                                               Row(
                                                                 children: [
                                                                   Text('₹${_autoPartsMatrixRows[i]['sellingPrice']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.green)),
                                                                   if ((_autoPartsMatrixRows[i]['mrp'] ?? 0) > 0) ...[
                                                                     const SizedBox(width: 8),
                                                                     Text('MRP ₹${_autoPartsMatrixRows[i]['mrp']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade600, decoration: TextDecoration.lineThrough)),
                                                                   ],
                                                                   if ((_autoPartsMatrixRows[i]['mechanicRate'] ?? 0) > 0) ...[
                                                                     const SizedBox(width: 8),
                                                                     Text('Mistri: ₹${_autoPartsMatrixRows[i]['mechanicRate']}', style: TextStyle(fontSize: 10, color: Colors.amber.shade800, fontWeight: FontWeight.w600)),
                                                                   ],
                                                                   if ((_autoPartsMatrixRows[i]['rackLocation'] ?? '').toString().isNotEmpty) ...[
                                                                     const Spacer(),
                                                                     Text('📍 ${_autoPartsMatrixRows[i]['rackLocation']}', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                                                                   ],
                                                                 ],
                                                               ),
                                                             ],
                                                           ),
                                                         ),
                                                         IconButton(
                                                           icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                                                           onPressed: () {
                                                             setState(() {
                                                               _autoPartsMatrixRows.removeAt(i);
                                                             });
                                                           },
                                                         ),
                                                       ],
                                                     ),
                                                   ),
                                               ],
                                             ],
                                           ],
                                         ),
                                       ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Pharma & Wholesale B2B Batch Details (Collapsible - Hidden for Footwear/Garments & AutoParts)
                      if (!_isFootwearOrGarmentIndustry && !_isAutoPartsIndustry) ...[
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFFAFAFA),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            children: [
                              InkWell(
                                onTap: () => setState(() => _showBatchDetails = !_showBatchDetails),
                                borderRadius: BorderRadius.circular(14),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.inventory_sharp, size: 18, color: AppTheme.primary),
                                          const SizedBox(width: 8),
                                          const Text(
                                            'Batch, Expiry & Pharma Master',
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
                                                labelText: 'Batch No.',
                                                hintText: 'e.g. B-9941',
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
                                                labelText: 'MRP',
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
                                                labelText: 'PTR (Retailer)',
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
                                                labelText: 'PTS (Stockist)',
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
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],
                      const SizedBox(height: 20),

                      // Save Button with Orange Styling
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isSaving ? null : _saveItem,
                          icon: _isSaving
                              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.check_circle_rounded, size: 18),
                          label: Text(
                            _isSaving ? 'Saving Product...' : 'Save Product',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 2,
                            shadowColor: AppTheme.primary.withValues(alpha: 0.4),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
