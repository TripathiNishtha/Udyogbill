import 'package:flutter/material.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/party_dao.dart';
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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadParties();
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
          child: Row(
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
