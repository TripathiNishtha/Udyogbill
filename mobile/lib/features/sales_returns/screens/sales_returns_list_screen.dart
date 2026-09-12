import 'package:flutter/material.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/sales_return_dao.dart';
import 'create_sales_return_screen.dart';
import 'credit_note_preview_screen.dart';

class SalesReturnsListScreen extends StatefulWidget {
  const SalesReturnsListScreen({super.key});

  @override
  State<SalesReturnsListScreen> createState() => _SalesReturnsListScreenState();
}

class _SalesReturnsListScreenState extends State<SalesReturnsListScreen> {
  final SalesReturnDao _returnDao = SalesReturnDao();
  final TextEditingController _searchController = TextEditingController();

  List<SalesReturnModel> _returns = [];
  double _todayReturns = 0.0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadReturns();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadReturns() async {
    setState(() => _isLoading = true);
    final list = await _returnDao.getAllSalesReturns();
    final today = await _returnDao.getTodayReturnsTotal();

    if (mounted) {
      setState(() {
        _returns = list;
        _todayReturns = today;
        _isLoading = false;
      });
    }
  }

  List<SalesReturnModel> get _filteredReturns {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) return _returns;

    return _returns.where((r) {
      return r.creditNoteNumber.toLowerCase().contains(query) ||
          r.partyName.toLowerCase().contains(query) ||
          (r.originalInvoiceNumber != null && r.originalInvoiceNumber!.toLowerCase().contains(query));
    }).toList();
  }

  Future<void> _openDetail(SalesReturnModel ret) async {
    final full = await _returnDao.getSalesReturnWithItems(ret.id);
    if (full != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CreditNotePreviewScreen(salesReturn: full),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredReturns;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Sales Returns & Credit Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReturns,
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Summary Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("TODAY'S RETURNS", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF991B1B))),
                        const SizedBox(height: 4),
                        Text(
                          '₹${_todayReturns.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFFB91C1C)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TOTAL CREDIT NOTES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                        const SizedBox(height: 4),
                        Text(
                          '${_returns.length} Records',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search by Credit Note #, Party, or Bill #',
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                fillColor: Colors.white,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              ),
            ),
          ),

          // List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.assignment_return_outlined, size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            const Text('No credit notes found.', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text('Tap + to issue a new GST Sales Return / Credit Note', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadReturns,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          itemCount: filtered.length,
                          itemBuilder: (context, idx) {
                            final ret = filtered[idx];
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                              child: InkWell(
                                onTap: () => _openDetail(ret),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 20,
                                        backgroundColor: const Color(0xFFFEE2E2),
                                        child: const Icon(Icons.replay_rounded, color: Color(0xFFDC2626), size: 20),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(ret.creditNoteNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                                            const SizedBox(height: 2),
                                            Text(ret.partyName, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${ret.returnDate}${ret.originalInvoiceNumber != null ? " • Bill: ${ret.originalInvoiceNumber}" : ""}',
                                              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            '₹${ret.totalAmount.toStringAsFixed(2)}',
                                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFFDC2626)),
                                          ),
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              ret.returnReason.split('/').first.trim(),
                                              style: const TextStyle(fontSize: 9, color: Color(0xFF64748B), fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateSalesReturnScreen()),
          );
          _loadReturns();
        },
        backgroundColor: AppTheme.danger,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Return (Credit Note)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
