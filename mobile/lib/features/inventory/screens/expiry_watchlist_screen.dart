import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../../app/theme/app_theme.dart';
import '../../../core/database/daos/item_dao.dart';
import '../../invoices/screens/create_invoice_screen.dart';

class ExpiryWatchlistScreen extends StatefulWidget {
  const ExpiryWatchlistScreen({super.key});

  @override
  State<ExpiryWatchlistScreen> createState() => _ExpiryWatchlistScreenState();
}

class _ExpiryWatchlistScreenState extends State<ExpiryWatchlistScreen> {
  final ItemDao _itemDao = ItemDao();
  List<ItemModel> _allExpiring = [];
  List<ItemModel> _filteredList = [];
  bool _isLoading = true;

  // Filter: 0 = All (<90d), 1 = Expired (<0d), 2 = Critical (<30d), 3 = Warning (31-60d), 4 = Caution (61-90d)
  int _selectedFilter = 0;
  final TextEditingController _searchController = TextEditingController();

  Map<String, dynamic> _summary = {
    'totalExpiringCount': 0,
    'expiredCount': 0,
    'criticalCount': 0,
    'warningCount': 0,
    'cautionCount': 0,
    'totalRiskStockValue': 0.0,
  };

  @override
  void initState() {
    super.initState();
    _loadExpiringItems();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadExpiringItems() async {
    setState(() => _isLoading = true);
    final items = await _itemDao.getExpiringItems(withinDays: 90);
    final summary = await _itemDao.getExpirySummary();

    if (mounted) {
      setState(() {
        _allExpiring = items;
        _summary = summary;
        _applyFilters();
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    final query = _searchController.text.trim().toLowerCase();
    List<ItemModel> list = _allExpiring;

    if (_selectedFilter == 1) {
      list = list.where((i) => (i.daysUntilExpiry ?? 0) < 0).toList();
    } else if (_selectedFilter == 2) {
      list = list.where((i) {
        final d = i.daysUntilExpiry ?? 0;
        return d >= 0 && d <= 30;
      }).toList();
    } else if (_selectedFilter == 3) {
      list = list.where((i) {
        final d = i.daysUntilExpiry ?? 0;
        return d > 30 && d <= 60;
      }).toList();
    } else if (_selectedFilter == 4) {
      list = list.where((i) {
        final d = i.daysUntilExpiry ?? 0;
        return d > 60 && d <= 90;
      }).toList();
    }

    if (query.isNotEmpty) {
      list = list.where((i) {
        final nameMatch = i.name.toLowerCase().contains(query);
        final batchMatch = (i.batchNumber ?? '').toLowerCase().contains(query);
        final rackMatch = (i.rackLocation ?? '').toLowerCase().contains(query);
        return nameMatch || batchMatch || rackMatch;
      }).toList();
    }

    setState(() => _filteredList = list);
  }

  void _shareAllExpiryList() {
    if (_allExpiring.isEmpty) return;

    final buffer = StringBuffer();
    buffer.writeln('⚠️ *UDYOGBILL NEAR-EXPIRY RADAR REPORT*');
    buffer.writeln('Date: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}');
    buffer.writeln('Total Items at Risk: ${_summary['totalExpiringCount']}');
    buffer.writeln('Total Value at Risk: ₹${(_summary['totalRiskStockValue'] as double).toStringAsFixed(2)}\n');
    buffer.writeln('--------------------------------');

    for (final item in _allExpiring) {
      final days = item.daysUntilExpiry ?? 0;
      final status = days < 0 ? '🔴 EXPIRED (${days.abs()}d ago)' : '🟠 Expires in $days days';
      final batch = item.batchNumber != null ? ' | Batch: ${item.batchNumber}' : '';
      final rack = item.rackLocation != null ? ' | Rack: ${item.rackLocation}' : '';
      buffer.writeln('• *${item.name}*$batch');
      buffer.writeln('  Qty: ${item.stockQuantity.toStringAsFixed(0)} ${item.uom ?? "Pcs"} | Exp: ${item.expiryDate ?? "-"} ($status)$rack');
      buffer.writeln('  Cost: ₹${(item.stockQuantity * item.purchasePrice).toStringAsFixed(2)}');
    }

    buffer.writeln('\n--------------------------------');
    buffer.writeln('Please review for clearance sales or supplier return (vapsi).');

    Share.share(buffer.toString(), subject: 'Near-Expiry Stock Watchlist');
  }

  void _shareSingleItemReturnMemo(ItemModel item) {
    final days = item.daysUntilExpiry ?? 0;
    final status = days < 0 ? 'Expired' : 'Near-Expiry ($days days left)';
    final text = 'Namaste Sir,\n\n'
        'We have the following $status stock for return / credit note adjustment:\n'
        '• Item: *${item.name}*\n'
        '• Batch: *${item.batchNumber ?? "N/A"}*\n'
        '• Expiry Date: *${item.expiryDate ?? "N/A"}*\n'
        '• Quantity: *${item.stockQuantity.toStringAsFixed(0)} ${item.uom ?? "Pcs"}*\n'
        '• MRP: ₹${item.mrp.toStringAsFixed(2)}\n'
        '• Purchase Rate: ₹${item.purchasePrice.toStringAsFixed(2)}\n'
        '• Total Return Amount: ₹${(item.stockQuantity * item.purchasePrice).toStringAsFixed(2)}\n\n'
        'Kindly arrange replacement / credit note (vapsi) at the earliest.\n'
        'Thank you!';

    Share.share(text, subject: 'Stock Return Memo - ${item.name}');
  }

  Color _getBadgeColor(int severity) {
    switch (severity) {
      case 1:
        return const Color(0xFFDC2626); // Red (Expired)
      case 2:
        return const Color(0xFFEA580C); // Orange (<30d)
      case 3:
        return const Color(0xFFD97706); // Amber (30-60d)
      case 4:
        return const Color(0xFF16A34A); // Green (60-90d)
      default:
        return const Color(0xFF64748B);
    }
  }

  String _getBadgeText(ItemModel item) {
    final days = item.daysUntilExpiry;
    if (days == null) return 'No Date';
    if (days < 0) return '🔴 Expired (${days.abs()}d ago)';
    if (days == 0) return '🔴 Expires Today!';
    if (days <= 30) return '🟠 $days Days Left (Critical)';
    if (days <= 60) return '🟡 $days Days Left';
    return '🟢 $days Days Left';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Near-Expiry Radar & Watchlist', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppTheme.accent),
            tooltip: 'Share Expiry List on WhatsApp',
            onPressed: _shareAllExpiryList,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadExpiringItems,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Top KPI Summary Card
                Container(
                  margin: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.radar_rounded, color: Color(0xFFF59E0B), size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Inventory Risk Radar',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDC2626).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFEF4444)),
                            ),
                            child: Text(
                              '${_summary['totalExpiringCount']} at risk',
                              style: const TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Stock Value at Risk', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${(_summary['totalRiskStockValue'] as double).toStringAsFixed(2)}',
                                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                          Container(width: 1, height: 36, color: const Color(0xFF334155)),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Action Required', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                const SizedBox(height: 2),
                                Text(
                                  '${_summary['expiredCount']} Expired • ${_summary['criticalCount']} <30d',
                                  style: const TextStyle(color: Color(0xFFFCD34D), fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Search Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => _applyFilters(),
                    decoration: InputDecoration(
                      hintText: 'Search medicine, batch, or rack...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                _applyFilters();
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                  ),
                ),

                // Filter Tabs Strip
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Row(
                    children: [
                      _buildFilterChip(0, 'All (${_summary['totalExpiringCount']})'),
                      const SizedBox(width: 6),
                      _buildFilterChip(1, '🔴 Expired (${_summary['expiredCount']})'),
                      const SizedBox(width: 6),
                      _buildFilterChip(2, '🟠 < 30 Days (${_summary['criticalCount']})'),
                      const SizedBox(width: 6),
                      _buildFilterChip(3, '🟡 31-60 Days (${_summary['warningCount']})'),
                      const SizedBox(width: 6),
                      _buildFilterChip(4, '🟢 61-90 Days (${_summary['cautionCount']})'),
                    ],
                  ),
                ),

                // Items List
                Expanded(
                  child: _filteredList.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.verified_outlined, size: 60, color: Colors.green[400]),
                              const SizedBox(height: 12),
                              const Text(
                                'No near-expiry inventory in this filter!',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Your stock is safe and up to date.',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(14, 4, 14, 20),
                          itemCount: _filteredList.length,
                          separatorBuilder: (ctx, i) => const SizedBox(height: 10),
                          itemBuilder: (ctx, index) {
                            final item = _filteredList[index];
                            final severity = item.expirySeverity;
                            final badgeColor = _getBadgeColor(severity);
                            final stockRiskVal = item.stockQuantity * item.purchasePrice;

                            return Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: severity == 1
                                      ? const Color(0xFFFCA5A5)
                                      : severity == 2
                                          ? const Color(0xFFFED7AA)
                                          : const Color(0xFFE2E8F0),
                                  width: severity <= 2 ? 1.5 : 1.0,
                                ),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
                                ],
                              ),
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Header row: Item name & Expiry badge
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.name,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                                            ),
                                            const SizedBox(height: 2),
                                            Row(
                                              children: [
                                                if (item.categoryName != null) ...[
                                                  Text(item.categoryName!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                                  const SizedBox(width: 8),
                                                ],
                                                if (item.rackLocation != null && item.rackLocation!.isNotEmpty)
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFEFF6FF),
                                                      borderRadius: BorderRadius.circular(4),
                                                      border: Border.all(color: const Color(0xFFBFDBFE)),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        const Icon(Icons.shelves, size: 10, color: Color(0xFF2563EB)),
                                                        const SizedBox(width: 3),
                                                        Text(
                                                          item.rackLocation!,
                                                          style: const TextStyle(fontSize: 10, color: Color(0xFF2563EB), fontWeight: FontWeight.bold),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: badgeColor.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                                        ),
                                        child: Text(
                                          _getBadgeText(item),
                                          style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 11),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),

                                  // Batch, Expiry & Stock specs strip
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Batch No', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                            Text(
                                              item.batchNumber ?? 'DEFAULT',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B)),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Expiry (MM/YY)', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                            Text(
                                              item.expiryDate ?? '-',
                                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: badgeColor),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Stock In Hand', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                            Text(
                                              '${item.stockQuantity.toStringAsFixed(0)} ${item.uom ?? "Pcs"}',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B)),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            const Text('Cost at Risk', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                            Text(
                                              '₹${stockRiskVal.toStringAsFixed(0)}',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFB91C1C)),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),

                                  // Action Buttons
                                  Row(
                                    children: [
                                      // 1-Tap Clearance Bill
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => const CreateInvoiceScreen(),
                                              ),
                                            );
                                          },
                                          icon: const Icon(Icons.bolt, size: 14),
                                          label: const Text('Clearance Bill', style: TextStyle(fontSize: 11)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF0284C7),
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),

                                      // Supplier Return Memo
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () => _shareSingleItemReturnMemo(item),
                                          icon: const Icon(Icons.assignment_return_outlined, size: 14),
                                          label: const Text('Return Memo', style: TextStyle(fontSize: 11)),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: const Color(0xFFDC2626),
                                            side: const BorderSide(color: Color(0xFFF87171)),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),

                                      // WhatsApp share
                                      IconButton(
                                        icon: const Icon(Icons.share_outlined, color: AppTheme.accent, size: 18),
                                        tooltip: 'WhatsApp to Supplier',
                                        onPressed: () => _shareSingleItemReturnMemo(item),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChip(int id, String label) {
    final isSelected = _selectedFilter == id;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: AppTheme.primary.withValues(alpha: 0.15),
      labelStyle: TextStyle(color: isSelected ? AppTheme.primary : const Color(0xFF475569)),
      onSelected: (_) {
        setState(() {
          _selectedFilter = id;
          _applyFilters();
        });
      },
    );
  }
}
