import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/item_dao.dart';
import '../../../../core/database/daos/party_dao.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final InvoiceDao _invoiceDao = InvoiceDao();
  final ItemDao _itemDao = ItemDao();
  final PartyDao _partyDao = PartyDao();

  Map<String, double> _metrics = {'todaySales': 0.0, 'totalReceivable': 0.0, 'totalPayable': 0.0};
  List<InvoiceModel> _invoices = [];
  List<Map<String, dynamic>> _customerDirectory = [];
  Map<String, double> _gstReport = {};
  Map<String, dynamic> _stockValuation = {};
  List<PartyModel> _parties = [];

  bool _isLoading = true;
  String _customerSearchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadAllReportData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllReportData() async {
    setState(() => _isLoading = true);
    final metrics = await _invoiceDao.getDashboardMetrics();
    final invs = await _invoiceDao.getRecentInvoices(limit: 100);
    final customers = await _invoiceDao.getCustomerDirectory(query: _customerSearchQuery);
    final gst = await _invoiceDao.getGstTaxReport();
    final stock = await _itemDao.getStockValuationReport();
    final parties = await _partyDao.getAllParties();

    if (mounted) {
      setState(() {
        _metrics = metrics;
        _invoices = invs;
        _customerDirectory = customers;
        _gstReport = gst;
        _stockValuation = stock;
        _parties = parties;
        _isLoading = false;
      });
    }
  }

  void _exportCustomerDirectoryCsv() {
    if (_customerDirectory.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No customers found to export.')),
      );
      return;
    }

    final StringBuffer csvBuffer = StringBuffer();
    csvBuffer.writeln('Customer Name,Mobile Phone,City,Total Invoices,Total Spent (INR),Last Visit');
    for (final c in _customerDirectory) {
      final name = (c['name'] ?? '').toString().replaceAll(',', ' ');
      final phone = c['phone'] ?? '';
      final city = (c['city'] ?? '').toString().replaceAll(',', ' ');
      final invoices = c['totalInvoices'] ?? 0;
      final spent = (c['totalSpent'] as num?)?.toDouble() ?? 0.0;
      final lastVisit = c['lastVisitDate'] ?? '';
      csvBuffer.writeln('$name,$phone,$city,$invoices,$spent,$lastVisit');
    }

    Share.share(
      csvBuffer.toString(),
      subject: 'UdyogBill_Customer_Directory_${DateTime.now().toIso8601String().substring(0, 10)}.csv',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primary,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(icon: Icon(Icons.analytics_outlined), text: 'Overview'),
            Tab(icon: Icon(Icons.contacts_outlined), text: 'Customer Directory'),
            Tab(icon: Icon(Icons.receipt_outlined), text: 'GST Tax Report'),
            Tab(icon: Icon(Icons.inventory_outlined), text: 'Stock Valuation'),
            Tab(icon: Icon(Icons.account_balance_wallet_outlined), text: 'Party Ledgers'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllReportData,
            tooltip: 'Refresh Reports',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildCustomerDirectoryTab(),
                _buildGstTaxTab(),
                _buildStockValuationTab(),
                _buildPartyLedgersTab(),
              ],
            ),
    );
  }

  Widget _buildOverviewTab() {
    final totalSalesAll = _invoices.fold(0.0, (s, i) => s + i.totalAmount);
    final cashSales = _invoices.where((i) => i.paymentMode == 1).fold(0.0, (s, i) => s + i.paidAmount);
    final onlineSales = _invoices.where((i) => i.paymentMode == 2 || i.paymentMode == 3).fold(0.0, (s, i) => s + i.paidAmount);
    final creditSales = _invoices.fold(0.0, (s, i) => s + i.balanceAmount);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: AppTheme.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Today's Revenue", style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text(
                  '₹${(_metrics['todaySales'] ?? 0.0).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Total Bills Generated: ${_invoices.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                    Text(
                      'Cumulative: ₹${totalSalesAll.toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: AppTheme.success.withValues(alpha: 0.15),
                            child: const Icon(Icons.arrow_downward, size: 14, color: AppTheme.success),
                          ),
                          const SizedBox(width: 8),
                          const Text('To Collect', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '₹${(_metrics['totalReceivable'] ?? 0.0).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.success),
                      ),
                      const Text('Total Customers Due', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: AppTheme.danger.withValues(alpha: 0.15),
                            child: const Icon(Icons.arrow_upward, size: 14, color: AppTheme.danger),
                          ),
                          const SizedBox(width: 8),
                          const Text('To Pay', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '₹${(_metrics['totalPayable'] ?? 0.0).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.danger),
                      ),
                      const Text('Total Supplier Due', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

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
                const Text('Collection Breakdown (Day Book)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.payments_outlined, size: 18, color: AppTheme.success),
                        SizedBox(width: 8),
                        Text('Cash Received', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                    Text('₹${cashSales.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.qr_code_2, size: 18, color: AppTheme.primary),
                        SizedBox(width: 8),
                        Text('UPI / Online', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                    Text('₹${onlineSales.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.credit_card, size: 18, color: AppTheme.warning),
                        SizedBox(width: 8),
                        Text('Credit (Udhar Balance)', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                    Text('₹${creditSales.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.warning)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerDirectoryTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search Name or Phone...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (val) {
                    _customerSearchQuery = val;
                    _invoiceDao.getCustomerDirectory(query: val).then((res) {
                      if (mounted) setState(() => _customerDirectory = res);
                    });
                  },
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Export CSV'),
                onPressed: _exportCustomerDirectoryCsv,
              ),
            ],
          ),
        ),
        Expanded(
          child: _customerDirectory.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 54, color: Colors.grey[400]),
                      const SizedBox(height: 12),
                      const Text(
                        'No billed customers found.\nAny customer billed with Name & Phone is recorded automatically.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: _customerDirectory.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, idx) {
                    final cust = _customerDirectory[idx];
                    final name = cust['name'] ?? 'Walk-in Customer';
                    final phone = cust['phone'] ?? '';
                    final totalSpent = (cust['totalSpent'] as num?)?.toDouble() ?? 0.0;
                    final invoicesCount = cust['totalInvoices'] ?? 1;

                    return Card(
                      elevation: 0.5,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey[200]!),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppTheme.primaryLight,
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'C',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                          ),
                        ),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(
                          '📞 ${phone.isNotEmpty ? phone : "No Phone"} • $invoicesCount Bills',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '₹${totalSpent.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.primaryDark, fontSize: 14),
                            ),
                            const Text('Total Purchases', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildGstTaxTab() {
    final taxable = _gstReport['taxable'] ?? 0.0;
    final cgst = _gstReport['cgst'] ?? 0.0;
    final sgst = _gstReport['sgst'] ?? 0.0;
    final igst = _gstReport['igst'] ?? 0.0;
    final totalTax = _gstReport['totalTax'] ?? 0.0;
    final gross = _gstReport['gross'] ?? 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
                const Row(
                  children: [
                    Icon(Icons.account_balance, color: AppTheme.primary),
                    SizedBox(width: 8),
                    Text('GSTR-1 & GSTR-3B Tax Liability', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                const Divider(height: 24),
                _buildTaxRow('Total Taxable Value', taxable),
                const Divider(height: 16),
                _buildTaxRow('CGST (Central GST)', cgst),
                const Divider(height: 16),
                _buildTaxRow('SGST (State GST)', sgst),
                const Divider(height: 16),
                _buildTaxRow('IGST (Integrated GST)', igst),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total GST Payable:', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    Text('₹${totalTax.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.danger, fontSize: 16)),
                  ],
                ),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Gross Invoice Total:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                    Text('₹${gross.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppTheme.success, fontSize: 18)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaxRow(String title, double amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 13, color: Colors.black87)),
        Text('₹${amount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }

  Widget _buildStockValuationTab() {
    final skus = _stockValuation['totalSkus'] ?? 0;
    final qty = (_stockValuation['totalQuantity'] as num?)?.toDouble() ?? 0.0;
    final costVal = (_stockValuation['totalCostValuation'] as num?)?.toDouble() ?? 0.0;
    final retailVal = (_stockValuation['totalRetailValuation'] as num?)?.toDouble() ?? 0.0;
    final lowStock = _stockValuation['lowStockCount'] ?? 0;
    final potentialProfit = retailVal - costVal;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0F766E), Color(0xFF115E59)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total Inventory Valuation (Retail)', style: TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 6),
                Text(
                  '₹${retailVal.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Purchase Cost: ₹${costVal.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                    Text('Margin: ₹${potentialProfit.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey[200]!)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total SKUs', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text('$skus Products', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text('$qty Units Total', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey[200]!)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Low Stock Alerts', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text('$lowStock Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: lowStock > 0 ? AppTheme.danger : AppTheme.success)),
                      const Text('Reorder required', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPartyLedgersTab() {
    final customers = _parties.where((p) => p.partyType == 1).toList();
    final suppliers = _parties.where((p) => p.partyType == 2).toList();

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: Colors.white,
            child: const TabBar(
              labelColor: AppTheme.primary,
              indicatorColor: AppTheme.primary,
              tabs: [
                Tab(text: 'Customers (Receivables)'),
                Tab(text: 'Suppliers (Payables)'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildPartyList(customers, isCustomer: true),
                _buildPartyList(suppliers, isCustomer: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartyList(List<PartyModel> list, {required bool isCustomer}) {
    if (list.isEmpty) {
      return Center(
        child: Text('No ${isCustomer ? "Customers" : "Suppliers"} recorded yet.', style: const TextStyle(color: Colors.grey)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: list.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (context, idx) {
        final party = list[idx];
        return Card(
          elevation: 0.5,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey[200]!)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isCustomer ? AppTheme.primaryLight : const Color(0xFFFEF3C7),
              child: Text(
                party.name.isNotEmpty ? party.name[0].toUpperCase() : 'P',
                style: TextStyle(fontWeight: FontWeight.bold, color: isCustomer ? AppTheme.primary : AppTheme.accent),
              ),
            ),
            title: Text(party.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text(party.phone ?? party.city ?? 'No Contact', style: const TextStyle(fontSize: 12)),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '₹${party.outstandingBalance.abs().toStringAsFixed(2)}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: party.outstandingBalance > 0 ? AppTheme.success : Colors.grey[700],
                  ),
                ),
                Text(isCustomer ? 'Balance Due' : 'To Pay', style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
        );
      },
    );
  }
}

