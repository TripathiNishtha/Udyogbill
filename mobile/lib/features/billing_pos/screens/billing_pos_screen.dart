import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_theme.dart';
import '../../../core/database/daos/item_dao.dart';
import '../../../core/widgets/continuous_barcode_scanner_sheet.dart';
import '../../invoices/screens/invoice_detail_preview_screen.dart';
import '../providers/billing_provider.dart';

class BillingPosScreen extends ConsumerStatefulWidget {
  const BillingPosScreen({super.key});

  @override
  ConsumerState<BillingPosScreen> createState() => _BillingPosScreenState();
}

class _BillingPosScreenState extends ConsumerState<BillingPosScreen> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _custNameController = TextEditingController();
  final TextEditingController _custPhoneController = TextEditingController();
  final ItemDao _itemDao = ItemDao();
  List<ItemModel> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadInitialItems();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _custNameController.dispose();
    _custPhoneController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialItems() async {
    final items = await _itemDao.searchItems('', limit: 30);
    if (mounted) {
      setState(() => _searchResults = items);
    }
  }

  void _onSearch(String query) async {
    setState(() => _isSearching = true);
    final results = await _itemDao.searchItems(query);
    if (mounted) {
      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    }
  }

  void _openBarcodeScanner() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ContinuousBarcodeScannerSheet(
        title: 'Fast POS Continuous Barcode Billing',
        initialContinuousMode: true,
        onItemScanned: (item) {
          ref.read(billingProvider.notifier).addItem(item);
        },
        onUnknownBarcode: (code) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Barcode "$code" not found in inventory'),
              backgroundColor: AppTheme.warning,
              duration: const Duration(seconds: 1),
            ),
          );
        },
        bottomCartWidget: (sheetCtx) {
          final state = ref.watch(billingProvider);
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
                    const Icon(Icons.shopping_cart_outlined, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      '${state.itemCount} Items in Cart',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
                Text(
                  '₹${state.grandTotal.toStringAsFixed(2)}',
                  style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w900, fontSize: 15),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCatalogColumn() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            onChanged: _onSearch,
            decoration: InputDecoration(
              hintText: 'Search product, barcode, or SKU...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _loadInitialItems();
                      },
                    )
                  : null,
            ),
          ),
        ),
        Expanded(
          child: _isSearching
              ? const Center(child: CircularProgressIndicator())
              : _searchResults.isEmpty
                  ? Center(
                      child: Text(
                        'No products found.\nSync catalog from web or add items.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey[500]),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      itemCount: _searchResults.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, idx) {
                        final item = _searchResults[idx];
                        return ListTile(
                          tileColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey[200]!),
                          ),
                          title: Text(
                            item.name,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                          subtitle: Text(
                            'Stock: ${item.stockQuantity} ${item.uom ?? ''} | GST: ${item.gstRate}%',
                            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '₹${item.salePrice.toStringAsFixed(2)}',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.primary),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.add_circle, color: AppTheme.primary),
                                onPressed: () {
                                  ref.read(billingProvider.notifier).addItem(item);
                                },
                              ),
                            ],
                          ),
                          onTap: () {
                            ref.read(billingProvider.notifier).addItem(item);
                          },
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildCartColumn(BillingState billingState) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          color: AppTheme.primaryLight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Cart (${billingState.itemCount})',
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.primaryDark),
              ),
              if (billingState.cart.isNotEmpty)
                GestureDetector(
                  onTap: () {
                    _custNameController.clear();
                    _custPhoneController.clear();
                    ref.read(billingProvider.notifier).clearCart();
                  },
                  child: const Text('Clear', style: TextStyle(color: AppTheme.danger, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        ),
        // Quick Customer Info Fields
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: const Color(0xFFF8FAFC),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    flex: 5,
                    child: TextField(
                      controller: _custNameController,
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        hintText: 'Customer Name',
                        prefixIcon: Icon(Icons.person_outline, size: 16),
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                      ),
                      onChanged: (val) {
                        ref.read(billingProvider.notifier).setCustomer(val, _custPhoneController.text);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 5,
                    child: TextField(
                      controller: _custPhoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        hintText: '10-digit Phone',
                        prefixIcon: Icon(Icons.phone_outlined, size: 16),
                        border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
                      ),
                      onChanged: (val) {
                        ref.read(billingProvider.notifier).setCustomer(_custNameController.text, val);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: billingState.cart.isEmpty
              ? Center(
                  child: Text(
                    'Cart is empty.\nTap a product to bill.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(8),
                  itemCount: billingState.cart.length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final cartItem = billingState.cart[idx];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                      title: Text(cartItem.item.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      subtitle: Text('₹${cartItem.unitPrice} x ${cartItem.quantity}', style: const TextStyle(fontSize: 10)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline, size: 18),
                            onPressed: () => ref.read(billingProvider.notifier).updateQuantity(idx, cartItem.quantity - 1),
                          ),
                          Text('${cartItem.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline, size: 18),
                            onPressed: () => ref.read(billingProvider.notifier).updateQuantity(idx, cartItem.quantity + 1),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -4))],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text('₹${billingState.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total GST:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text('₹${billingState.totalGst.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
              const Divider(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Grand Total:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
                  Text(
                    '₹${billingState.grandTotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.success),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: billingState.cart.isEmpty || billingState.isSubmitting
                      ? null
                      : () async {
                          try {
                            final createdInvoice = await ref.read(billingProvider.notifier).completeInvoice();
                            _custNameController.clear();
                            _custPhoneController.clear();
                            if (mounted) {
                              // If modal bottom sheet was open, pop it first
                              if (Navigator.canPop(context)) {
                                Navigator.pop(context);
                              }
                              // Open complete invoice preview
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => InvoiceDetailPreviewScreen(invoice: createdInvoice),
                                ),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
                              );
                            }
                          }
                        },
                  child: Text(billingState.isSubmitting ? 'Processing...' : 'Charge ₹${billingState.grandTotal.toStringAsFixed(2)}'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _openMobileCartSheet(BillingState billingState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: _buildCartColumn(billingState),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final billingState = ref.watch(billingProvider);
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fast POS Billing'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
            onPressed: _openBarcodeScanner,
            tooltip: 'Scan Barcode',
          ),
          if (isMobile && billingState.cart.isNotEmpty)
            TextButton.icon(
              icon: const Icon(Icons.shopping_cart, color: AppTheme.primary),
              label: Text('${billingState.itemCount}'),
              onPressed: () => _openMobileCartSheet(billingState),
            ),
        ],
      ),
      body: isMobile
          ? Column(
              children: [
                Expanded(child: _buildCatalogColumn()),
                if (billingState.cart.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -2))],
                    ),
                    child: SafeArea(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${billingState.itemCount} Items in Cart', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text('₹${billingState.grandTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.success)),
                            ],
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                            onPressed: () => _openMobileCartSheet(billingState),
                            child: const Row(
                              children: [
                                Text('View Cart & Pay'),
                                SizedBox(width: 4),
                                Icon(Icons.arrow_forward, size: 16),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            )
          : Row(
              children: [
                Expanded(flex: 3, child: _buildCatalogColumn()),
                Container(
                  width: 320,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(left: BorderSide(color: Colors.grey[200]!)),
                  ),
                  child: _buildCartColumn(billingState),
                ),
              ],
            ),
    );
  }
}
