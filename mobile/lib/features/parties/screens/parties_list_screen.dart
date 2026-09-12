import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/utils/upi_qr_helper.dart';
import '../../payments/screens/record_payment_screen.dart';
import 'add_party_dialog.dart';

class PartiesListScreen extends StatefulWidget {
  const PartiesListScreen({super.key});

  @override
  State<PartiesListScreen> createState() => _PartiesListScreenState();
}

class _PartiesListScreenState extends State<PartiesListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  final PartyDao _partyDao = PartyDao();

  List<PartyModel> _customers = [];
  List<PartyModel> _suppliers = [];
  bool _isLoading = true;
  String _storeName = 'UdyogBill Enterprise';
  String _storeUpiId = 'udyogbill@okaxis';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadStoreInfo();
    _loadParties();
  }

  Future<void> _loadStoreInfo() async {
    const storage = FlutterSecureStorage();
    final name = await storage.read(key: AppConstants.keyTenantName);
    final upi = await storage.read(key: AppConstants.keyStoreUpiId);
    if (mounted) {
      setState(() {
        if (name != null && name.isNotEmpty) _storeName = name;
        if (upi != null && upi.isNotEmpty) _storeUpiId = upi;
      });
    }
  }

  void _sendWhatsAppReminder(PartyModel party) {
    final bal = party.outstandingBalance.abs().toStringAsFixed(2);
    final upiUri = UpiQrHelper.buildUpiUri(
      upiId: _storeUpiId,
      payeeName: _storeName,
      amount: party.outstandingBalance.abs(),
      note: 'Dues Settlement',
    );
    final text = 'Namaste ${party.name} ji,\n\n'
        'This is a friendly reminder from *$_storeName* regarding your outstanding balance of *₹$bal*.\n\n'
        'Kindly settle the payment at your earliest convenience.\n\n'
        '📲 Instant UPI Payment Link:\n$upiUri\n'
        'UPI ID: $_storeUpiId\n\n'
        'Thank you for your business!';
    Share.share(text, subject: 'Payment Reminder - ₹$bal');
  }

  Future<void> _recordPaymentForParty(PartyModel party) async {
    final recorded = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => RecordPaymentScreen(preselectedParty: party),
      ),
    );
    if (recorded == true) {
      _loadParties();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadParties() async {
    setState(() => _isLoading = true);
    final query = _searchController.text.trim();

    final List<PartyModel> custList;
    final List<PartyModel> suppList;

    if (query.isEmpty) {
      custList = await _partyDao.getAllParties(partyType: 1);
      suppList = await _partyDao.getAllParties(partyType: 2);
    } else {
      custList = await _partyDao.searchParties(query, partyType: 1);
      suppList = await _partyDao.searchParties(query, partyType: 2);
    }

    if (mounted) {
      setState(() {
        _customers = custList;
        _suppliers = suppList;
        _isLoading = false;
      });
    }
  }

  void _openAddPartyDialog({PartyModel? existingParty}) async {
    final currentType = _tabController.index == 0 ? 1 : 2;
    final created = await Navigator.push<PartyModel>(
      context,
      MaterialPageRoute(
        builder: (_) => AddPartyDialog(
          defaultPartyType: currentType,
          existingParty: existingParty,
        ),
      ),
    );
    if (created != null) {
      _loadParties();
    }
  }

  double _calculateTotalBalance(List<PartyModel> parties) {
    return parties.fold(0.0, (sum, p) => sum + p.outstandingBalance);
  }

  Widget _buildPartyCard(PartyModel party) {
    final isCustomer = party.partyType == 1;
    final isReceivable = party.outstandingBalance > 0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 0,
      child: InkWell(
        onTap: () => _openAddPartyDialog(existingParty: party),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: isCustomer ? AppTheme.primaryLight : const Color(0xFFFEF3C7),
                child: Text(
                  party.name.isNotEmpty ? party.name[0].toUpperCase() : 'P',
                  style: TextStyle(
                    color: isCustomer ? AppTheme.primaryDark : const Color(0xFFB45309),
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      party.name,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF0F172A)),
                    ),
                    if (party.tradeName != null && party.tradeName!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          party.tradeName!,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF4F46E5), fontWeight: FontWeight.w600),
                        ),
                      ),
                    const SizedBox(height: 4),
                    if (party.phone != null && party.phone!.isNotEmpty)
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined, size: 13, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(party.phone!, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        ],
                      ),
                    if (party.gstin != null && party.gstin!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'GSTIN: ${party.gstin!} (${party.stateCode ?? ""})',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: party.outstandingBalance == 0
                          ? Colors.grey[100]
                          : isReceivable
                              ? AppTheme.success.withValues(alpha: 0.12)
                              : AppTheme.danger.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  child: Text(
                    '₹${party.outstandingBalance.abs().toStringAsFixed(2)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      color: party.outstandingBalance == 0
                          ? Colors.grey[700]
                          : isReceivable
                              ? AppTheme.success
                              : AppTheme.danger,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  party.outstandingBalance == 0
                      ? 'Settled'
                      : isReceivable
                          ? 'To Collect'
                          : 'To Pay',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: party.outstandingBalance == 0
                        ? Colors.grey[500]
                        : isReceivable
                            ? AppTheme.success
                            : AppTheme.danger,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (party.outstandingBalance != 0) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 8),
            Row(
              children: [
                if (isReceivable) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _sendWhatsAppReminder(party),
                      icon: const Icon(Icons.share, size: 14, color: AppTheme.accent),
                      label: const Text('WhatsApp Reminder', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.accent)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppTheme.accent),
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _recordPaymentForParty(party),
                      icon: const Icon(Icons.add_circle_outline, size: 14),
                      label: const Text('Collect Cash/UPI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.success,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ] else ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _recordPaymentForParty(party),
                      icon: const Icon(Icons.remove_circle_outline, size: 14),
                      label: const Text('Pay Supplier (Dene Hain)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.danger,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    ),
  ),
);
}

  @override
  Widget build(BuildContext context) {
    final totalRecv = _calculateTotalBalance(_customers);
    final totalPay = _calculateTotalBalance(_suppliers);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parties & Ledgers'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: AppTheme.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: [
            Tab(text: 'Customers (${_customers.length})'),
            Tab(text: 'Suppliers (${_suppliers.length})'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Summary Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('To Collect (Lene Hain)', style: TextStyle(fontSize: 10, color: AppTheme.success, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('₹${totalRecv.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppTheme.success)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.danger.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('To Pay (Dene Hain)', style: TextStyle(fontSize: 10, color: AppTheme.danger, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('₹${totalPay.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppTheme.danger)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _loadParties(),
              decoration: InputDecoration(
                hintText: 'Search customer / supplier by name or phone...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadParties();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // Tab Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      // Customers List
                      _customers.isEmpty
                          ? Center(
                              child: Text('No customers found.\nTap "+ Add Party" below.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500])),
                            )
                          : ListView.builder(
                              itemCount: _customers.length,
                              itemBuilder: (ctx, idx) => _buildPartyCard(_customers[idx]),
                            ),

                      // Suppliers List
                      _suppliers.isEmpty
                          ? Center(
                              child: Text('No suppliers found.\nTap "+ Add Party" below.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500])),
                            )
                          : ListView.builder(
                              itemCount: _suppliers.length,
                              itemBuilder: (ctx, idx) => _buildPartyCard(_suppliers[idx]),
                            ),
                    ],
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddPartyDialog,
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_alt_1),
        label: const Text('Add Party', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
