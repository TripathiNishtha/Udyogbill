import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import 'create_invoice_screen.dart';
import 'invoice_detail_preview_screen.dart';

class InvoicesListScreen extends StatefulWidget {
  const InvoicesListScreen({super.key});

  @override
  State<InvoicesListScreen> createState() => _InvoicesListScreenState();
}

class _InvoicesListScreenState extends State<InvoicesListScreen> {
  final TextEditingController _searchController = TextEditingController();
  final InvoiceDao _invoiceDao = InvoiceDao();

  List<InvoiceModel> _invoices = [];
  bool _isLoading = true;
  String _filter = 'ALL'; // ALL, PAID, DUE

  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInvoices() async {
    setState(() => _isLoading = true);
    final all = await _invoiceDao.getRecentInvoices(limit: 100);
    final query = _searchController.text.trim().toLowerCase();

    List<InvoiceModel> filtered = all;
    if (query.isNotEmpty) {
      filtered = filtered.where((inv) =>
        inv.invoiceNumber.toLowerCase().contains(query) ||
        inv.partyName.toLowerCase().contains(query)
      ).toList();
    }

    if (_filter == 'PAID') {
      filtered = filtered.where((inv) => inv.paymentStatus == 3).toList();
    } else if (_filter == 'DUE') {
      filtered = filtered.where((inv) => inv.paymentStatus != 3).toList();
    }

    if (mounted) {
      setState(() {
        _invoices = filtered;
        _isLoading = false;
      });
    }
  }

  void _shareViaWhatsApp(InvoiceModel inv) {
    final text = '🧾 *UdyogBill Invoice*\n'
        'Invoice: ${inv.invoiceNumber}\n'
        'Date: ${inv.invoiceDate}\n'
        'Customer: ${inv.partyName}\n'
        'Total Amount: ₹${inv.totalAmount.toStringAsFixed(2)}\n'
        'Paid: ₹${inv.paidAmount.toStringAsFixed(2)}\n'
        'Balance Due: ₹${inv.balanceAmount.toStringAsFixed(2)}\n\n'
        'Thank you for your business!';

    Share.share(text, subject: 'Invoice ${inv.invoiceNumber}');
  }

  Widget _buildInvoiceCard(InvoiceModel inv) {
    final isPaid = inv.paymentStatus == 3;
    final isPartial = inv.paymentStatus == 2;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 0,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => InvoiceDetailPreviewScreen(invoice: inv)),
          );
        },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    inv.invoiceNumber,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isPaid
                          ? AppTheme.success.withValues(alpha: 0.12)
                          : isPartial
                              ? AppTheme.warning.withValues(alpha: 0.12)
                              : AppTheme.danger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isPaid
                          ? 'PAID'
                          : isPartial
                              ? 'PARTIAL'
                              : 'DUE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isPaid
                            ? AppTheme.success
                            : isPartial
                                ? AppTheme.warning
                                : AppTheme.danger,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                inv.partyName,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    inv.invoiceDate,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  Text(
                    '₹${inv.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                    onPressed: () => _shareViaWhatsApp(inv),
                    icon: const Icon(Icons.share, size: 14, color: AppTheme.accent),
                    label: const Text('WhatsApp / Share', style: TextStyle(fontSize: 12, color: AppTheme.accent)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Invoices'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 6),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _loadInvoices(),
              decoration: InputDecoration(
                hintText: 'Search invoice number or customer...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadInvoices();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('All Bills'),
                  selected: _filter == 'ALL',
                  onSelected: (s) {
                    setState(() => _filter = 'ALL');
                    _loadInvoices();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Paid Bills'),
                  selected: _filter == 'PAID',
                  onSelected: (s) {
                    setState(() => _filter = 'PAID');
                    _loadInvoices();
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Pending / Due Bills'),
                  selected: _filter == 'DUE',
                  onSelected: (s) {
                    setState(() => _filter = 'DUE');
                    _loadInvoices();
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _invoices.isEmpty
                    ? Center(
                        child: Text('No invoices found.\nTap "+ Create Bill" below.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500])),
                      )
                    : ListView.builder(
                        itemCount: _invoices.length,
                        itemBuilder: (ctx, idx) => _buildInvoiceCard(_invoices[idx]),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateInvoiceScreen()),
          );
          if (res == true) {
            _loadInvoices();
          }
        },
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.receipt_long),
        label: const Text('Create Bill', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
