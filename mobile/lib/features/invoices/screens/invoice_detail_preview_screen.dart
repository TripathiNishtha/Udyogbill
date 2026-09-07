import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';

class InvoiceDetailPreviewScreen extends StatefulWidget {
  final InvoiceModel invoice;

  const InvoiceDetailPreviewScreen({super.key, required this.invoice});

  @override
  State<InvoiceDetailPreviewScreen> createState() => _InvoiceDetailPreviewScreenState();
}

class _InvoiceDetailPreviewScreenState extends State<InvoiceDetailPreviewScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final String _storeName = "UdyogBill Demo Mart";
  final String _storeAddress = "Shop 104, Trade Centre, Market Road";
  final String _storeGstin = "27AABCT1334M1Z5";
  final String _storePhone = "+91 98765 43210";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _shareViaWhatsApp() {
    final inv = widget.invoice;
    final text = '🧾 *TAX INVOICE*\n'
        '*$_storeName*\n'
        'GSTIN: $_storeGstin\n'
        '--------------------------------\n'
        'Invoice: ${inv.invoiceNumber}\n'
        'Date: ${inv.invoiceDate}\n'
        'Bill To: ${inv.partyName}\n'
        '${inv.partyPhone != null ? "Phone: ${inv.partyPhone}\n" : ""}'
        '--------------------------------\n'
        '${inv.items.map((i) => "${i.itemName} x ${i.quantity} = ₹${i.totalAmount.toStringAsFixed(2)}").join("\n")}\n'
        '--------------------------------\n'
        'Subtotal: ₹${inv.taxableAmount.toStringAsFixed(2)}\n'
        'GST: ₹${(inv.cgstAmount + inv.sgstAmount).toStringAsFixed(2)}\n'
        '*Grand Total: ₹${inv.totalAmount.toStringAsFixed(2)}*\n'
        'Paid: ₹${inv.paidAmount.toStringAsFixed(2)}\n'
        'Balance Due: ₹${inv.balanceAmount.toStringAsFixed(2)}\n\n'
        'Thank you for your business!';

    Share.share(text, subject: 'Invoice ${inv.invoiceNumber}');
  }

  Future<void> _printOrGeneratePdf() async {
    final doc = pw.Document();
    final inv = widget.invoice;

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(_storeName, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
                      pw.Text(_storeAddress, style: const pw.TextStyle(fontSize: 10)),
                      pw.Text('GSTIN: $_storeGstin | Phone: $_storePhone', style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.black, width: 1),
                    ),
                    child: pw.Text('TAX INVOICE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
              pw.SizedBox(height: 12),
              pw.Divider(),

              // Invoice Details & Party Details
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Bill To / Customer Details:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      pw.Text(inv.partyName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                      if (inv.partyPhone != null) pw.Text('Phone: ${inv.partyPhone}', style: const pw.TextStyle(fontSize: 10)),
                      if (inv.partyGstin != null) pw.Text('GSTIN: ${inv.partyGstin}', style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Invoice No: ${inv.invoiceNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                      pw.Text('Invoice Date: ${inv.invoiceDate}', style: const pw.TextStyle(fontSize: 10)),
                      pw.Text('Payment Mode: ${inv.paymentMode == 1 ? "Cash" : inv.paymentMode == 2 ? "UPI" : "Credit"}', style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 14),

              // Items Table
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
                cellStyle: const pw.TextStyle(fontSize: 9),
                headers: ['#', 'Item Description', 'Qty', 'Rate', 'Taxable', 'GST', 'Total'],
                data: inv.items.asMap().entries.map((e) {
                  final it = e.value;
                  return [
                    '${e.key + 1}',
                    it.itemName,
                    '${it.quantity}',
                    'INR ${it.unitPrice.toStringAsFixed(2)}',
                    'INR ${it.taxableAmount.toStringAsFixed(2)}',
                    '${it.gstRate}%',
                    'INR ${it.totalAmount.toStringAsFixed(2)}',
                  ];
                }).toList(),
              ),
              pw.SizedBox(height: 14),

              // Summary
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 200,
                    child: pw.Column(
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Subtotal:', style: const pw.TextStyle(fontSize: 10)),
                            pw.Text('INR ${inv.taxableAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                          ],
                        ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Total GST:', style: const pw.TextStyle(fontSize: 10)),
                            pw.Text('INR ${(inv.cgstAmount + inv.sgstAmount).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                          ],
                        ),
                        pw.Divider(),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Grand Total:', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                            pw.Text('INR ${inv.totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                          ],
                        ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Paid Amount:', style: const pw.TextStyle(fontSize: 10)),
                            pw.Text('INR ${inv.paidAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                          ],
                        ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Balance Due:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                            pw.Text('INR ${inv.balanceAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              pw.Spacer(),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Terms: Goods once sold will not be taken back.', style: const pw.TextStyle(fontSize: 8)),
                  pw.Text('Authorized Signatory', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                ],
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
      name: '${inv.invoiceNumber}.pdf',
    );
  }

  Widget _buildStandardInvoiceView() {
    final inv = widget.invoice;
    final isPaid = inv.paymentStatus == 3;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4)),
          ],
        ),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Store & Brand Header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 52,
                    height: 52,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => CircleAvatar(
                      backgroundColor: AppTheme.primaryLight,
                      child: const Icon(Icons.receipt_long, color: AppTheme.primary),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _storeName,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _storeAddress,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      Text(
                        'GSTIN: $_storeGstin • Ph: $_storePhone',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // TAX INVOICE Header Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'TAX INVOICE',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPaid ? AppTheme.success.withValues(alpha: 0.12) : AppTheme.danger.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isPaid ? 'PAID IN FULL' : 'PAYMENT DUE',
                    style: TextStyle(
                      color: isPaid ? AppTheme.success : AppTheme.danger,
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Bill To & Invoice Info Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Invoice Number:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(inv.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Date:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(inv.invoiceDate, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Mode:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(inv.paymentMode == 1 ? "Cash" : inv.paymentMode == 2 ? "UPI" : "Credit (Udhar)", style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                  const Divider(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Billed To: ', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(inv.partyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            if (inv.partyPhone != null) Text('Mob: ${inv.partyPhone}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            if (inv.partyGstin != null) Text('GSTIN: ${inv.partyGstin}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Item Table Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Expanded(flex: 3, child: Text('Item Name', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                  Expanded(flex: 1, child: Text('Qty', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                  Expanded(flex: 2, child: Text('Rate', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                  Expanded(flex: 2, child: Text('Total', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11))),
                ],
              ),
            ),
            const SizedBox(height: 6),

            // Item Table Rows
            ...inv.items.map((it) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(it.itemName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                          Text('GST: ${it.gstRate}%', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 1,
                      child: Text(it.quantity.toStringAsFixed(0), textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text('₹${it.unitPrice.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 12)),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text('₹${it.totalAmount.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              );
            }),

            const Divider(height: 20),

            // Totals
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal (Taxable):', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text('₹${inv.taxableAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total GST (CGST + SGST):', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text('₹${(inv.cgstAmount + inv.sgstAmount).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Grand Total:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A))),
                      Text(
                        '₹${inv.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppTheme.success),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Amount Paid:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text('₹${inv.paidAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary)),
                    ],
                  ),
                  if (inv.balanceAmount > 0) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Balance Due (Lene Hain):', style: TextStyle(fontSize: 12, color: AppTheme.danger, fontWeight: FontWeight.bold)),
                        Text('₹${inv.balanceAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppTheme.danger)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Signatory & Terms
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Terms & Conditions:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10)),
                      Text('• Goods once sold will not be returned', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                      Text('• Subject to local jurisdiction', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                    ],
                  ),
                  Column(
                    children: [
                      Text('For $_storeName', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 24),
                      Container(width: 80, height: 1, color: Colors.grey[400]),
                      const SizedBox(height: 2),
                      const Text('Authorized Signatory', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThermalReceiptView() {
    final inv = widget.invoice;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 380),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4)),
            ],
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(_storeName.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'monospace')),
              const SizedBox(height: 2),
              Text(_storeAddress, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
              Text('GSTIN: $_storeGstin', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
              Text('Ph: $_storePhone', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
              const SizedBox(height: 8),
              const Text('------------------------------------------', style: TextStyle(fontFamily: 'monospace')),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('INV: ${inv.invoiceNumber}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                  Text(inv.invoiceDate, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('CUST: ${inv.partyName}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                  Text(inv.paymentMode == 1 ? "CASH" : inv.paymentMode == 2 ? "UPI" : "CREDIT", style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
                ],
              ),
              const Text('------------------------------------------', style: TextStyle(fontFamily: 'monospace')),
              ...inv.items.map((it) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${it.itemName} (${it.quantity.toStringAsFixed(0)}x${it.unitPrice.toStringAsFixed(0)})',
                          style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text('₹${it.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                    ],
                  ),
                );
              }),
              const Text('------------------------------------------', style: TextStyle(fontFamily: 'monospace')),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('SUBTOTAL:', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                  Text('₹${inv.taxableAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('TOTAL GST:', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                  Text('₹${(inv.cgstAmount + inv.sgstAmount).toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('NET PAYABLE:', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                  Text('₹${inv.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, fontFamily: 'monospace')),
                ],
              ),
              const Text('==========================================', style: TextStyle(fontFamily: 'monospace')),
              const SizedBox(height: 8),
              const Text('THANK YOU! VISIT AGAIN', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, fontFamily: 'monospace')),
              const SizedBox(height: 4),
              const Text('POWERED BY UDYOGBILL', style: TextStyle(fontSize: 9, fontFamily: 'monospace', color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text(widget.invoice.invoiceNumber),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(icon: Icon(Icons.description_outlined), text: 'GST Invoice (A4)'),
            Tab(icon: Icon(Icons.receipt_outlined), text: 'Thermal POS Receipt'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined, color: AppTheme.primary),
            tooltip: 'Print / Save PDF',
            onPressed: _printOrGeneratePdf,
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppTheme.accent),
            tooltip: 'WhatsApp / Share',
            onPressed: _shareViaWhatsApp,
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStandardInvoiceView(),
          _buildThermalReceiptView(),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, -3)),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _shareViaWhatsApp,
                  icon: const Icon(Icons.share, size: 18, color: AppTheme.accent),
                  label: const Text('WhatsApp', style: TextStyle(color: AppTheme.accent, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.accent),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _printOrGeneratePdf,
                  icon: const Icon(Icons.print, size: 18),
                  label: const Text('Print / PDF', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
