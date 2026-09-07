import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/item_dao.dart';
import 'add_item_dialog.dart';

class ItemsListScreen extends StatefulWidget {
  const ItemsListScreen({super.key});

  @override
  State<ItemsListScreen> createState() => _ItemsListScreenState();
}

class _ItemsListScreenState extends State<ItemsListScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ItemDao _itemDao = ItemDao();

  List<ItemModel> _items = [];
  bool _isLoading = true;
  String _activeFilter = 'ALL'; // ALL, LOW_STOCK, OUT_OF_STOCK

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadItems() async {
    setState(() => _isLoading = true);
    final query = _searchController.text.trim();
    final all = await _itemDao.searchItems(query, limit: 100);

    List<ItemModel> filtered = all;
    if (_activeFilter == 'LOW_STOCK') {
      filtered = all.where((it) => it.stockQuantity > 0 && it.stockQuantity <= 10).toList();
    } else if (_activeFilter == 'OUT_OF_STOCK') {
      filtered = all.where((it) => it.stockQuantity <= 0).toList();
    }

    if (mounted) {
      setState(() {
        _items = filtered;
        _isLoading = false;
      });
    }
  }

  void _openBarcodeScanner() {
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
                onDetect: (capture) {
                  for (final b in capture.barcodes) {
                    if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                      _searchController.text = b.rawValue!;
                      Navigator.pop(ctx);
                      _loadItems();
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

  void _openAddItemDialog() async {
    final created = await showDialog<ItemModel>(
      context: context,
      builder: (_) => const AddItemDialog(),
    );
    if (created != null) {
      _loadItems();
    }
  }

  Widget _buildItemCard(ItemModel item) {
    final isLowStock = item.stockQuantity > 0 && item.stockQuantity <= 10;
    final isOutOfStock = item.stockQuantity <= 0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.inventory_2_outlined, color: AppTheme.primary, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.name,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (item.barcode != null && item.barcode!.isNotEmpty) ...[
                        const Icon(Icons.qr_code, size: 12, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Text(item.barcode!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        'GST: ${item.gstRate}%',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Purchase: ₹${item.purchasePrice.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '₹${item.salePrice.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppTheme.primary),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isOutOfStock
                        ? AppTheme.danger.withValues(alpha: 0.12)
                        : isLowStock
                            ? AppTheme.warning.withValues(alpha: 0.12)
                            : AppTheme.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isOutOfStock
                        ? 'Out of Stock'
                        : 'Stock: ${item.stockQuantity.toStringAsFixed(0)} ${item.uom ?? ''}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isOutOfStock
                          ? AppTheme.danger
                          : isLowStock
                              ? AppTheme.warning
                              : AppTheme.success,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Items & Stock'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primary),
            onPressed: _openBarcodeScanner,
            tooltip: 'Scan Barcode',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Box
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 6),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _loadItems(),
              decoration: InputDecoration(
                hintText: 'Search product, barcode, or SKU...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadItems();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('All Items'),
                  selected: _activeFilter == 'ALL',
                  onSelected: (s) {
                    setState(() => _activeFilter = 'ALL');
                    _loadItems();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Low Stock (<10)'),
                  selected: _activeFilter == 'LOW_STOCK',
                  onSelected: (s) {
                    setState(() => _activeFilter = 'LOW_STOCK');
                    _loadItems();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Out of Stock'),
                  selected: _activeFilter == 'OUT_OF_STOCK',
                  onSelected: (s) {
                    setState(() => _activeFilter = 'OUT_OF_STOCK');
                    _loadItems();
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Items List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _items.isEmpty
                    ? Center(
                        child: Text(
                          'No products found.\nTap "+ Add Item" below.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[500]),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _items.length,
                        itemBuilder: (ctx, idx) => _buildItemCard(_items[idx]),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddItemDialog,
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Add Item', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
