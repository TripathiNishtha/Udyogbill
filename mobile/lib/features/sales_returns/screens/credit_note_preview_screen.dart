import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/sales_return_dao.dart';

class CreditNotePreviewScreen extends StatefulWidget {
  final SalesReturnModel salesReturn;

  const CreditNotePreviewScreen({super.key, required this.salesReturn});

  @override
  State<CreditNotePreviewScreen> createState() => _CreditNotePreviewScreenState();
}

class _CreditNotePreviewScreenState extends State<CreditNotePreviewScreen> {
  String _storeName = 'UdyogBill Enterprise';
  final String _storeAddress = 'Authorized Distributor & Wholesaler';
  final String _storeGstin = '09AAAAA0000A1Z5';
  final String _storePhone = '+91 98765 43210';
  final String _storeState = '09 - Uttar Pradesh';

  @override
  void initState() {
    super.initState();
    _loadStoreInfo();
  }

  Future<void> _loadStoreInfo() async {
    const storage = FlutterSecureStorage();
    final name = await storage.read(key: AppConstants.keyTenantName);
    if (mounted && name != null && name.isNotEmpty) {
      setState(() => _storeName = name);
    }
  }

  void _shareViaWhatsApp() {
    final ret = widget.salesReturn;
    final text = '🧾 *GST CREDIT NOTE (VAPSI MAAL)*\n'
        '*$_storeName*\n'
        'GSTIN: $_storeGstin | State: $_storeState\n'
        '--------------------------------\n'
        'Credit Note: ${ret.creditNoteNumber}\n'
        'Date: ${ret.returnDate}\n'
        'Original Invoice: ${ret.originalInvoiceNumber ?? "N/A"}\n'
        'Customer: ${ret.partyName}\n'
        'Reason: ${ret.returnReason}\n'
        '--------------------------------\n'
        '${ret.items.map((i) {
          final batchStr = i.batchNumber != null ? " [B: ${i.batchNumber}]" : "";
          return "• ${i.itemName}$batchStr: ${i.quantity.toStringAsFixed(0)} x ₹${i.unitPrice.toStringAsFixed(2)} = ₹${i.totalAmount.toStringAsFixed(2)}";
        }).join("\n")}\n'
        '--------------------------------\n'
        'Taxable Credit: ₹${ret.taxableAmount.toStringAsFixed(2)}\n'
        '${ret.igstAmount > 0 ? "IGST Reversal: ₹${ret.igstAmount.toStringAsFixed(2)}" : "CGST: ₹${ret.cgstAmount.toStringAsFixed(2)}\nSGST: ₹${ret.sgstAmount.toStringAsFixed(2)}"}\n'
        '*Total Credit Amount: ₹${ret.totalAmount.toStringAsFixed(2)}*\n\n'
        'Note: Outstanding balance has been adjusted in your ledger account.\n'
        'Thank you!';

    Share.share(text, subject: 'Credit Note ${ret.creditNoteNumber}');
  }

  Future<void> _printOrGeneratePdf() async {
    final doc = pw.Document();
    final ret = widget.salesReturn;
    final isInterState = ret.igstAmount > 0;

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (pw.Context context) {
          return [
            // Company Header & Credit Note Title
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(_storeName, style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
                    pw.Text(_storeAddress, style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                    pw.Text('GSTIN: $_storeGstin | State: $_storeState', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800)),
                    pw.Text('Phone: $_storePhone', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: pw.BoxDecoration(
                        border: pw.Border.all(color: PdfColors.red800, width: 1),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(3)),
                        color: PdfColors.red50,
                      ),
                      child: pw.Text('GST CREDIT NOTE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11, color: PdfColors.red900)),
                    ),
                    pw.SizedBox(height: 3),
                    pw.Text('(Section 34 of CGST Act, 2017)', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  ],
                ),
              ],
            ),
            pw.SizedBox(height: 10),
            pw.Divider(thickness: 0.8),

            // Credit Note & Buyer Details
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  flex: 5,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(6),
                    decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400, width: 0.5)),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('CREDIT ISSUED TO (BUYER):', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                        pw.SizedBox(height: 2),
                        pw.Text(ret.partyName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                        if (ret.partyPhone != null) pw.Text('Phone: ${ret.partyPhone}', style: const pw.TextStyle(fontSize: 8)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 8),
                pw.Expanded(
                  flex: 5,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(6),
                    decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400, width: 0.5)),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('Credit Note No: ${ret.creditNoteNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                        pw.Text('Credit Note Date: ${ret.returnDate}', style: const pw.TextStyle(fontSize: 8)),
                        pw.Text('Original Invoice No: ${ret.originalInvoiceNumber ?? "N/A"}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                        pw.Text('Reason: ${ret.returnReason}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.red900)),
                        pw.Text('Restocked in Warehouse: ${ret.restockToWarehouse ? "Yes" : "No (Damage/Scrap)"}', style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.grey700)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 12),

            // Returned Items Table
            pw.TableHelper.fromTextArray(
              border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7.5),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellStyle: const pw.TextStyle(fontSize: 7),
              headers: ['#', 'Item Description', 'HSN', 'Batch', 'Exp', 'Return Qty', 'Rate (INR)', 'Taxable (INR)', 'GST%', 'Total (INR)'],
              data: ret.items.asMap().entries.map((e) {
                final idx = e.key + 1;
                final it = e.value;
                return [
                  idx.toString(),
                  it.itemName,
                  it.hsnCode ?? '-',
                  it.batchNumber ?? '-',
                  it.expiryDate ?? '-',
                  it.quantity.toStringAsFixed(0),
                  it.unitPrice.toStringAsFixed(2),
                  it.taxableAmount.toStringAsFixed(2),
                  '${it.gstRate.toStringAsFixed(0)}%',
                  it.totalAmount.toStringAsFixed(2),
                ];
              }).toList(),
            ),
            pw.SizedBox(height: 10),

            // Financial Summary
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Expanded(
                  flex: 5,
                  child: pw.Text(
                    'Declaration: We confirm that this Credit Note has been issued in compliance with Section 34 of the CGST Act 2017 for goods returned by the buyer.',
                    style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey700),
                  ),
                ),
                pw.SizedBox(width: 14),
                pw.Expanded(
                  flex: 5,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(8),
                    decoration: pw.BoxDecoration(border: pw.Border.all(color: PdfColors.grey400, width: 0.5)),
                    child: pw.Column(
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Taxable Value Credit:', style: const pw.TextStyle(fontSize: 8)),
                            pw.Text('INR ${ret.taxableAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                          ],
                        ),
                        if (isInterState) ...[
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('IGST Reversal:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${ret.igstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        ] else ...[
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('CGST Reversal:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${ret.cgstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('SGST Reversal:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${ret.sgstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        ],
                        pw.Divider(thickness: 0.5),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Total Credit Value:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.red900)),
                            pw.Text('INR ${ret.totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.red900)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 30),

            // Signatures
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Customer Seal & Signature', style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text('For $_storeName', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                    pw.SizedBox(height: 24),
                    pw.Text('Authorised Signatory', style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
              ],
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
      name: '${ret.creditNoteNumber}.pdf',
    );
  }

  @override
  Widget build(BuildContext context) {
    final ret = widget.salesReturn;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text(ret.creditNoteNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 550),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 3)),
              ],
            ),
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('GST CREDIT NOTE (VAPSI MAAL)', style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF991B1B), fontSize: 13)),
                      Text(ret.creditNoteNumber, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF991B1B), fontSize: 13)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Party and Invoice info
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Customer', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text(ret.partyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Date', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text(ret.returnDate, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (ret.originalInvoiceNumber != null)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Original Invoice:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text(ret.originalInvoiceNumber!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF4F46E5))),
                      ],
                    ),
                  ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Return Reason:', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      Text(ret.returnReason, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFDC2626))),
                    ],
                  ),
                ),
                const Divider(height: 24),

                // Items list
                const Text('Returned Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                const SizedBox(height: 8),
                ...ret.items.map((it) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(it.itemName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              Text(
                                '${it.batchNumber != null ? "B: ${it.batchNumber} • " : ""}${it.quantity.toStringAsFixed(0)} units @ ₹${it.unitPrice.toStringAsFixed(2)}',
                                style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '₹${it.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFFDC2626)),
                        ),
                      ],
                    ),
                  );
                }),
                const Divider(height: 24),

                // Total Summary Box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Taxable Value:', style: TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                          Text('₹${ret.taxableAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total GST Reversal:', style: TextStyle(fontSize: 12, color: Color(0xFF991B1B))),
                          Text('₹${(ret.cgstAmount + ret.sgstAmount + ret.igstAmount).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                        ],
                      ),
                      const Divider(height: 12, color: Color(0xFFFCA5A5)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Credit Value:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF7F1D1D))),
                          Text(
                            '₹${ret.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFFDC2626)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
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
                    backgroundColor: AppTheme.danger,
                    foregroundColor: Colors.white,
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
