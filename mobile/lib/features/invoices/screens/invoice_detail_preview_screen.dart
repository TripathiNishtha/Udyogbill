import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../app/constants/app_constants.dart';
import '../../../../app/theme/app_theme.dart';
import '../../../../core/database/daos/invoice_dao.dart';
import '../../../../core/database/daos/party_dao.dart';
import '../../../../core/utils/eway_bill_json_helper.dart';
import '../../../../core/utils/upi_qr_helper.dart';
import '../../payments/screens/record_payment_screen.dart';
import '../../sales_returns/screens/create_sales_return_screen.dart';

class _HsnSummary {
  final String hsnCode;
  final double gstRate;
  double taxableValue = 0.0;
  double cgstAmount = 0.0;
  double sgstAmount = 0.0;
  double igstAmount = 0.0;
  double totalTax = 0.0;

  _HsnSummary({
    required this.hsnCode,
    required this.gstRate,
  });
}

class InvoiceDetailPreviewScreen extends StatefulWidget {
  final InvoiceModel invoice;

  const InvoiceDetailPreviewScreen({super.key, required this.invoice});

  @override
  State<InvoiceDetailPreviewScreen> createState() => _InvoiceDetailPreviewScreenState();
}

class _InvoiceDetailPreviewScreenState extends State<InvoiceDetailPreviewScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _storeName = "UdyogBill Enterprise";
  final String _storeAddress = "Authorized Distributor & Wholesaler";
  final String _storeGstin = "09AAAAA0000A1Z5";
  final String _storePhone = "+91 98765 43210";
  final String _storeState = "09 - Uttar Pradesh";
  String _storeUpiId = "udyogbill@okaxis";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadStoreInfo();
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

  void _showUpiQrSheet(BuildContext context) {
    final inv = widget.invoice;
    final payAmount = inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount;
    final upiUri = UpiQrHelper.buildUpiUri(
      upiId: _storeUpiId,
      payeeName: _storeName,
      amount: payAmount,
      invoiceNumber: inv.invoiceNumber,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _storeName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text('Invoice: ${inv.invoiceNumber}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.bolt, size: 14, color: AppTheme.success),
                      SizedBox(width: 4),
                      Text('UPI Instant', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '₹${payAmount.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text('UPI ID: $_storeUpiId', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4)),
                ],
              ),
              child: QrImageView(
                data: upiUri,
                version: QrVersions.auto,
                size: 200.0,
                backgroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.qr_code_scanner, size: 16, color: Color(0xFF4F46E5)),
                const SizedBox(width: 6),
                Text(
                  'Scan with GPay, PhonePe, Paytm, BHIM',
                  style: TextStyle(fontSize: 12, color: Colors.grey[700], fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      final shareText = 'Namaste ${inv.partyName} ji,\nPlease pay ₹${payAmount.toStringAsFixed(2)} for Invoice ${inv.invoiceNumber} to $_storeName via UPI:\n$upiUri';
                      Share.share(shareText, subject: 'UPI Payment Link for ${inv.invoiceNumber}');
                    },
                    icon: const Icon(Icons.share, size: 16),
                    label: const Text('Share Link'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RecordPaymentScreen(
                            preselectedParty: PartyModel(
                              id: inv.partyId ?? 'party-${inv.id}',
                              tenantId: 'local-tenant',
                              name: inv.partyName,
                              phone: inv.partyPhone,
                              gstin: inv.partyGstin,
                              partyType: 1,
                              outstandingBalance: inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount,
                              creditLimit: 0,
                              creditPeriodDays: 30,
                              updatedAt: DateTime.now().toIso8601String(),
                            ),
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: const Text('Record Payment'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<_HsnSummary> _calculateHsnSummary() {
    final Map<String, _HsnSummary> map = {};
    for (final it in widget.invoice.items) {
      final hsn = it.hsnCode != null && it.hsnCode!.isNotEmpty ? it.hsnCode! : '3004';
      final key = '${hsn}_${it.gstRate}';
      if (!map.containsKey(key)) {
        map[key] = _HsnSummary(hsnCode: hsn, gstRate: it.gstRate);
      }
      final row = map[key]!;
      row.taxableValue += it.taxableAmount;
      row.cgstAmount += it.cgstAmount;
      row.sgstAmount += it.sgstAmount;
      row.igstAmount += it.igstAmount;
      row.totalTax += (it.cgstAmount + it.sgstAmount + it.igstAmount);
    }
    return map.values.toList();
  }

  void _showEWayBillExportDialog() {
    final inv = widget.invoice;
    final distController = TextEditingController(text: '50');
    final vehController = TextEditingController(text: inv.vehicleNumber ?? '');
    final transIdController = TextEditingController(text: inv.transporterId ?? '');
    final transNameController = TextEditingController(text: inv.transporterName ?? '');
    final docController = TextEditingController(text: inv.lrNumber ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(Icons.local_shipping_outlined, color: Color(0xFF2563EB), size: 22),
                const SizedBox(width: 8),
                const Text('Generate E-Way Bill JSON (NIC)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Official JSON file for direct upload on ewaybillgst.gov.in',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: distController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Distance (KM) *',
                      hintText: '50',
                      prefixIcon: Icon(Icons.route_outlined, size: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: vehController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Vehicle Number',
                      hintText: 'UP16AB1234',
                      prefixIcon: Icon(Icons.directions_car_outlined, size: 18),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: transNameController,
                    decoration: const InputDecoration(
                      labelText: 'Transporter Name',
                      hintText: 'e.g. VRL Logistics',
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: docController,
                    decoration: const InputDecoration(
                      labelText: 'LR / Doc Number',
                      hintText: 'LR-9941',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: () {
                final dist = int.tryParse(distController.text.trim()) ?? 50;
                final jsonStr = EwayBillJsonHelper.generateEWayBillJson(
                  invoice: inv,
                  storeName: _storeName,
                  storeGstin: _storeGstin,
                  storeAddress: _storeAddress,
                  storeCity: 'Ghaziabad',
                  storePincode: '201001',
                  storeStateCode: '09',
                  transportDistanceKm: dist,
                  vehicleNumber: vehController.text.trim(),
                  transporterId: transIdController.text.trim(),
                  transporterName: transNameController.text.trim(),
                  transportDocNo: docController.text.trim(),
                );

                Navigator.pop(ctx);
                Share.share(
                  jsonStr,
                  subject: 'E-Way Bill JSON - ${inv.invoiceNumber}',
                );
              },
              icon: const Icon(Icons.download_rounded, size: 18),
              label: const Text('Export & Share NIC JSON', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _exportEInvoiceJson() {
    final inv = widget.invoice;
    final jsonStr = EwayBillJsonHelper.generateEInvoiceJson(
      invoice: inv,
      storeName: _storeName,
      storeGstin: _storeGstin,
      storeAddress: _storeAddress,
      storeCity: 'Ghaziabad',
      storePincode: '201001',
      storeStateCode: '09',
    );

    Share.share(
      jsonStr,
      subject: 'E-Invoice IRP JSON - ${inv.invoiceNumber}',
    );
  }

  void _shareViaWhatsApp() {
    final inv = widget.invoice;
    final isInterState = inv.igstAmount > 0;
    final text = '🧾 *TAX INVOICE - B2B*\n'
        '*$_storeName*\n'
        'GSTIN: $_storeGstin | State: $_storeState\n'
        '--------------------------------\n'
        'Invoice: ${inv.invoiceNumber}\n'
        'Date: ${inv.invoiceDate}\n'
        'Bill To: ${inv.partyName}\n'
        '${inv.partyGstin != null ? "Buyer GSTIN: ${inv.partyGstin}\n" : ""}'
        'Place of Supply: ${inv.placeOfSupply ?? _storeState}\n'
        '${inv.poNumber != null ? "PO No: ${inv.poNumber}\n" : ""}'
        '${inv.vehicleNumber != null ? "Vehicle No: ${inv.vehicleNumber}\n" : ""}'
        '--------------------------------\n'
        '${inv.items.map((i) {
          final batchStr = i.batchNumber != null ? " [B: ${i.batchNumber}]" : "";
          final freeStr = i.freeQuantity > 0 ? " (+${i.freeQuantity.toStringAsFixed(0)} Free)" : "";
          return "• ${i.itemName}$batchStr: ${i.quantity.toStringAsFixed(0)}$freeStr x ₹${i.unitPrice.toStringAsFixed(2)} = ₹${i.totalAmount.toStringAsFixed(2)}";
        }).join("\n")}\n'
        '--------------------------------\n'
        'Taxable: ₹${inv.taxableAmount.toStringAsFixed(2)}\n'
        '${isInterState ? "IGST: ₹${inv.igstAmount.toStringAsFixed(2)}" : "CGST: ₹${inv.cgstAmount.toStringAsFixed(2)}\nSGST: ₹${inv.sgstAmount.toStringAsFixed(2)}"}\n'
        '*Grand Total: ₹${inv.totalAmount.toStringAsFixed(2)}*\n'
        'Paid: ₹${inv.paidAmount.toStringAsFixed(2)}\n'
        'Balance Due: ₹${inv.balanceAmount.toStringAsFixed(2)}\n\n'
        'Thank you for your business!';

    Share.share(text, subject: 'Tax Invoice ${inv.invoiceNumber}');
  }

  Future<void> _printOrGeneratePdf() async {
    final doc = pw.Document();
    final inv = widget.invoice;
    final isInterState = inv.igstAmount > 0;
    final hsnList = _calculateHsnSummary();
    final payAmount = inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount;
    final upiUri = UpiQrHelper.buildUpiUri(
      upiId: _storeUpiId,
      payeeName: _storeName,
      amount: payAmount,
      invoiceNumber: inv.invoiceNumber,
    );

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(20),
        build: (pw.Context context) {
          return [
            // Company Header & TAX INVOICE Badge
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
                        border: pw.Border.all(color: PdfColors.black, width: 1),
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(3)),
                      ),
                      child: pw.Text('TAX INVOICE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                    ),
                    pw.SizedBox(height: 3),
                    pw.Text('(Original for Recipient)', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
                  ],
                ),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Divider(thickness: 0.8),

            // Buyer & Invoice Details Matrix
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Bill To
                pw.Expanded(
                  flex: 5,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(6),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('DETAILS OF RECEIVER (BILLED TO):', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8, color: PdfColors.grey800)),
                        pw.SizedBox(height: 2),
                        pw.Text(inv.partyName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                        if (inv.partyGstin != null) pw.Text('GSTIN / UIN: ${inv.partyGstin}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                        if (inv.partyPhone != null) pw.Text('Phone: ${inv.partyPhone}', style: const pw.TextStyle(fontSize: 8)),
                        if (inv.billingAddress != null) pw.Text('Address: ${inv.billingAddress}', style: const pw.TextStyle(fontSize: 8)),
                        pw.Text('Place of Supply: ${inv.placeOfSupply ?? _storeState}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                      ],
                    ),
                  ),
                ),
                pw.SizedBox(width: 6),

                // Invoice & Transport Details
                pw.Expanded(
                  flex: 5,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(6),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Invoice No:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                            pw.Text(inv.invoiceNumber, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                          ],
                        ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Invoice Date:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                            pw.Text(inv.invoiceDate, style: const pw.TextStyle(fontSize: 8)),
                          ],
                        ),
                        if (inv.poNumber != null)
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Buyer PO No & Date:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                              pw.Text('${inv.poNumber} ${inv.poDate != null ? "(${inv.poDate})" : ""}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        if (inv.vehicleNumber != null)
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Vehicle Number:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                              pw.Text(inv.vehicleNumber!, style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        if (inv.ewayBillNumber != null)
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('E-Way Bill No:', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                              pw.Text(inv.ewayBillNumber!, style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Reverse Charge (RCM):', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
                            pw.Text(inv.isReverseCharge ? 'YES' : 'NO', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 8),

            // Line Items Table with HSN, Batch, Exp, Free Qty & Rate
            pw.TableHelper.fromTextArray(
              border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey200),
              cellStyle: const pw.TextStyle(fontSize: 7.5),
              headers: [
                '#',
                'Item Description',
                'HSN',
                'Batch',
                'Exp',
                'Qty',
                'Free',
                'Rate',
                'MRP',
                'Disc%',
                'Taxable',
                'GST%',
                'Total'
              ],
              data: inv.items.asMap().entries.map((e) {
                final it = e.value;
                return [
                  '${e.key + 1}',
                  it.itemName,
                  it.hsnCode ?? '3004',
                  it.batchNumber ?? '-',
                  it.expiryDate ?? '-',
                  it.quantity.toStringAsFixed(0),
                  it.freeQuantity > 0 ? it.freeQuantity.toStringAsFixed(0) : '-',
                  it.unitPrice.toStringAsFixed(2),
                  it.mrp > 0 ? it.mrp.toStringAsFixed(2) : '-',
                  it.discountPercent > 0 ? '${it.discountPercent}%' : '-',
                  it.taxableAmount.toStringAsFixed(2),
                  '${it.gstRate}%',
                  it.totalAmount.toStringAsFixed(2),
                ];
              }).toList(),
            ),
            pw.SizedBox(height: 8),

            // Financial Summary Section
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Left: Bank details & Terms
                pw.Expanded(
                  flex: 6,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Container(
                        padding: const pw.EdgeInsets.all(6),
                        decoration: pw.BoxDecoration(
                          border: pw.Border.all(color: PdfColors.grey300, width: 0.5),
                        ),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text('Terms & Conditions:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                            pw.Text('1. Goods once sold will not be taken back or exchanged.', style: const pw.TextStyle(fontSize: 7)),
                            pw.Text('2. Payment is due as per agreed credit terms.', style: const pw.TextStyle(fontSize: 7)),
                            pw.Text('3. Subject to local state jurisdiction only.', style: const pw.TextStyle(fontSize: 7)),
                          ],
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Container(
                        padding: const pw.EdgeInsets.all(5),
                        decoration: pw.BoxDecoration(
                          border: pw.Border.all(color: PdfColors.grey300, width: 0.5),
                          color: PdfColors.grey50,
                        ),
                        child: pw.Row(
                          crossAxisAlignment: pw.CrossAxisAlignment.center,
                          children: [
                            pw.BarcodeWidget(
                              barcode: pw.Barcode.qrCode(),
                              data: upiUri,
                              width: 44,
                              height: 44,
                            ),
                            pw.SizedBox(width: 8),
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Scan & Pay via UPI', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                                pw.Text('UPI ID: $_storeUpiId', style: const pw.TextStyle(fontSize: 7, color: PdfColors.blueGrey800)),
                                pw.Text('Amount: INR ${payAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7.5)),
                                pw.Text('GPay / PhonePe / Paytm / BHIM', style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey600)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 8),

                // Right: Financial Totals
                pw.Expanded(
                  flex: 4,
                  child: pw.Container(
                    padding: const pw.EdgeInsets.all(6),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.grey400, width: 0.5),
                    ),
                    child: pw.Column(
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Taxable Value:', style: const pw.TextStyle(fontSize: 8)),
                            pw.Text('INR ${inv.taxableAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                          ],
                        ),
                        if (isInterState) ...[
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('IGST:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${inv.igstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        ] else ...[
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('CGST:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${inv.cgstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('SGST:', style: const pw.TextStyle(fontSize: 8)),
                              pw.Text('INR ${inv.sgstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        ],
                        pw.Divider(thickness: 0.5),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Invoice Total:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                            pw.Text('INR ${inv.totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                          ],
                        ),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Paid Amount:', style: const pw.TextStyle(fontSize: 8)),
                            pw.Text('INR ${inv.paidAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                          ],
                        ),
                        if (inv.balanceAmount > 0)
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Balance Due:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                              pw.Text('INR ${inv.balanceAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 10),

            // MANDATORY GST B2B HSN SUMMARY TABLE
            pw.Text('HSN / SAC TAX SUMMARY TABLE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8, color: PdfColors.grey900)),
            pw.SizedBox(height: 2),
            pw.TableHelper.fromTextArray(
              border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7.5),
              headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
              cellStyle: const pw.TextStyle(fontSize: 7),
              headers: [
                'HSN/SAC',
                'Taxable Value',
                'CGST Rate',
                'CGST Amount',
                'SGST Rate',
                'SGST Amount',
                'IGST Rate',
                'IGST Amount',
                'Total Tax'
              ],
              data: hsnList.map((h) {
                return [
                  h.hsnCode,
                  h.taxableValue.toStringAsFixed(2),
                  isInterState ? '-' : '${(h.gstRate / 2).toStringAsFixed(1)}%',
                  isInterState ? '-' : h.cgstAmount.toStringAsFixed(2),
                  isInterState ? '-' : '${(h.gstRate / 2).toStringAsFixed(1)}%',
                  isInterState ? '-' : h.sgstAmount.toStringAsFixed(2),
                  isInterState ? '${h.gstRate.toStringAsFixed(1)}%' : '-',
                  isInterState ? h.igstAmount.toStringAsFixed(2) : '-',
                  h.totalTax.toStringAsFixed(2),
                ];
              }).toList(),
            ),

            pw.SizedBox(height: 20),

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
                    pw.SizedBox(height: 20),
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
      name: '${inv.invoiceNumber}.pdf',
    );
  }

  Future<void> _printThermalSlipPdf() async {
    final doc = pw.Document();
    final inv = widget.invoice;
    final isInterState = inv.igstAmount > 0;
    final payAmount = inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount;
    final upiUri = UpiQrHelper.buildUpiUri(
      upiId: _storeUpiId,
      payeeName: _storeName,
      amount: payAmount,
      invoiceNumber: inv.invoiceNumber,
    );

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        margin: const pw.EdgeInsets.all(10),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(_storeName.toUpperCase(), style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13)),
              pw.SizedBox(height: 2),
              pw.Text(_storeAddress, textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 8)),
              pw.Text('GSTIN: $_storeGstin', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
              pw.Text('Ph: $_storePhone', style: const pw.TextStyle(fontSize: 8)),
              pw.SizedBox(height: 4),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Bill: ${inv.invoiceNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                  pw.Text('Date: ${inv.invoiceDate}', style: const pw.TextStyle(fontSize: 8)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Customer: ${inv.partyName}', style: const pw.TextStyle(fontSize: 8)),
                  pw.Text(inv.paymentStatus == 3 ? 'PAID' : 'DUE', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
                ],
              ),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(flex: 5, child: pw.Text('Item', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8))),
                  pw.Expanded(flex: 2, child: pw.Text('Qty', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8))),
                  pw.Expanded(flex: 3, child: pw.Text('Total', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8))),
                ],
              ),
              pw.Divider(thickness: 0.3),
              ...inv.items.map((it) {
                return pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        flex: 5,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(it.itemName, style: const pw.TextStyle(fontSize: 8)),
                            if (it.batchNumber != null)
                              pw.Text('B:${it.batchNumber} Exp:${it.expiryDate ?? ""}', style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey700)),
                          ],
                        ),
                      ),
                      pw.Expanded(
                        flex: 2,
                        child: pw.Text(
                          it.freeQuantity > 0 ? '${it.quantity.toStringAsFixed(0)}+${it.freeQuantity.toStringAsFixed(0)}F' : it.quantity.toStringAsFixed(0),
                          textAlign: pw.TextAlign.center,
                          style: const pw.TextStyle(fontSize: 8),
                        ),
                      ),
                      pw.Expanded(
                        flex: 3,
                        child: pw.Text('INR ${it.totalAmount.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 8)),
                      ),
                    ],
                  ),
                );
              }),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Taxable Value:', style: const pw.TextStyle(fontSize: 8)),
                  pw.Text('INR ${inv.taxableAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                ],
              ),
              if (isInterState)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('IGST:', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('INR ${inv.igstAmount.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                  ],
                )
              else
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('CGST+SGST:', style: const pw.TextStyle(fontSize: 8)),
                    pw.Text('INR ${(inv.cgstAmount + inv.sgstAmount).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                  ],
                ),
              pw.Divider(thickness: 0.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('NET PAYABLE:', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                  pw.Text('INR ${inv.totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                ],
              ),
              pw.SizedBox(height: 6),
              pw.Text('SCAN TO PAY VIA UPI', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
              pw.SizedBox(height: 4),
              pw.BarcodeWidget(
                barcode: pw.Barcode.qrCode(),
                data: upiUri,
                width: 65,
                height: 65,
              ),
              pw.SizedBox(height: 2),
              pw.Text('UPI: $_storeUpiId', style: const pw.TextStyle(fontSize: 7)),
              pw.SizedBox(height: 6),
              pw.Text('THANK YOU FOR YOUR BUSINESS!', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
              pw.Text('POWERED BY UDYOGBILL', style: const pw.TextStyle(fontSize: 6, color: PdfColors.grey700)),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
      name: '${inv.invoiceNumber}_thermal.pdf',
    );
  }

  Future<void> _handlePrint() async {
    if (_tabController.index == 1) {
      await _printThermalSlipPdf();
    } else {
      await _printOrGeneratePdf();
    }
  }

  Widget _buildStandardInvoiceView() {
    final inv = widget.invoice;
    final isPaid = inv.paymentStatus == 3;
    final isInterState = inv.igstAmount > 0;
    final hsnList = _calculateHsnSummary();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(14),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 3)),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // E-Way Bill High-Value Compliance Banner
            if (inv.totalAmount >= 50000) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_shipping_outlined, color: Color(0xFF2563EB), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'E-Way Bill Eligible (> ₹50,000)',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E40AF)),
                          ),
                          Text(
                            'Mandatory under GST Rule 138. Tap to generate NIC JSON.',
                            style: TextStyle(fontSize: 10, color: Color(0xFF3B82F6)),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: _showEWayBillExportDialog,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                      child: const Text('Export JSON', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ],

            // Store & Header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 48,
                    height: 48,
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
                      Text(_storeAddress, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text('GSTIN: $_storeGstin • Ph: $_storePhone', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 20),

            // TAX INVOICE Header Badge + Supply Type
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    inv.invoiceType == 1 ? 'TAX INVOICE (B2B)' : 'RETAIL CASH BILL',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isPaid ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isPaid ? 'PAID IN FULL' : 'PAYMENT DUE',
                    style: TextStyle(
                      color: isPaid ? const Color(0xFF15803D) : const Color(0xFFB91C1C),
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

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
                      const Text('Invoice Number:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(inv.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Date:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(inv.invoiceDate, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11)),
                    ],
                  ),
                  if (inv.placeOfSupply != null) ...[
                    const SizedBox(height: 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Place of Supply:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text(inv.placeOfSupply!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF1E293B))),
                      ],
                    ),
                  ],
                  if (inv.poNumber != null) ...[
                    const SizedBox(height: 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Buyer PO Number:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('${inv.poNumber} ${inv.poDate != null ? "(${inv.poDate})" : ""}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11)),
                      ],
                    ),
                  ],
                  if (inv.vehicleNumber != null) ...[
                    const SizedBox(height: 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Vehicle Number:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text(inv.vehicleNumber!, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11)),
                      ],
                    ),
                  ],
                  const Divider(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Billed To: ', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(inv.partyName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            if (inv.partyPhone != null) Text('Mob: ${inv.partyPhone}', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            if (inv.partyGstin != null) Text('GSTIN: ${inv.partyGstin}', style: const TextStyle(fontSize: 10, color: Color(0xFF1E293B), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Item Table Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
              child: const Row(
                children: [
                  Expanded(flex: 4, child: Text('Item / Batch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10))),
                  Expanded(flex: 2, child: Text('Qty + Free', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10))),
                  Expanded(flex: 2, child: Text('Rate', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10))),
                  Expanded(flex: 2, child: Text('Total', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10))),
                ],
              ),
            ),
            const SizedBox(height: 4),

            // Item Table Rows
            ...inv.items.map((it) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(it.itemName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                          Text(
                            '${it.hsnCode != null ? "HSN: ${it.hsnCode} • " : ""}${it.batchNumber != null ? "B: ${it.batchNumber} • " : ""}GST: ${it.gstRate}%',
                            style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        it.freeQuantity > 0 ? '${it.quantity.toStringAsFixed(0)} + ${it.freeQuantity.toStringAsFixed(0)}F' : it.quantity.toStringAsFixed(0),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text('₹${it.unitPrice.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 11)),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text('₹${it.totalAmount.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              );
            }),

            const Divider(height: 16),

            // Financial Summary
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal (Taxable):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text('₹${inv.taxableAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  if (isInterState)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('IGST (Inter-State):', style: TextStyle(fontSize: 11, color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600)),
                        Text('₹${inv.igstAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Color(0xFF1D4ED8))),
                      ],
                    )
                  else ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('CGST (Central):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('₹${inv.cgstAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('SGST (State):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('₹${inv.sgstAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                      ],
                    ),
                  ],
                  const Divider(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Grand Total:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF0F172A))),
                      Text(
                        '₹${inv.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.success),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Amount Paid:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text('₹${inv.paidAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary)),
                    ],
                  ),
                  if (inv.balanceAmount > 0) ...[
                    const SizedBox(height: 3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Balance Due:', style: TextStyle(fontSize: 11, color: AppTheme.danger, fontWeight: FontWeight.bold)),
                        Text('₹${inv.balanceAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppTheme.danger)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // HSN Summary Section (On Screen)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('HSN / SAC Tax Breakdown', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 6),
                  ...hsnList.map((h) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('HSN ${h.hsnCode} (${h.gstRate}%)', style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          Text(
                            'Taxable: ₹${h.taxableValue.toStringAsFixed(2)} • Tax: ₹${h.totalTax.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            // Live UPI QR Payment Collection Card
            Container(
              margin: const EdgeInsets.only(top: 14),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFC7D2FE)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                    child: QrImageView(
                      data: UpiQrHelper.buildUpiUri(
                        upiId: _storeUpiId,
                        payeeName: _storeName,
                        amount: inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount,
                        invoiceNumber: inv.invoiceNumber,
                      ),
                      version: QrVersions.auto,
                      size: 56.0,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Instant UPI Payment QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF312E81))),
                        const SizedBox(height: 2),
                        Text(
                          'Scan to pay ₹${(inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount).toStringAsFixed(2)} via UPI',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF4338CA)),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _showUpiQrSheet(context),
                    icon: const Icon(Icons.qr_code_2, size: 16),
                    label: const Text('Show QR'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
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
    final isInterState = inv.igstAmount > 0;

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
              if (inv.partyGstin != null)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('BUYER GSTIN:', style: TextStyle(fontSize: 10, fontFamily: 'monospace')),
                    Text(inv.partyGstin!, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                  ],
                ),
              const Text('------------------------------------------', style: TextStyle(fontFamily: 'monospace')),
              ...inv.items.map((it) {
                final freeStr = it.freeQuantity > 0 ? " +${it.freeQuantity.toStringAsFixed(0)}F" : "";
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${it.itemName} (${it.quantity.toStringAsFixed(0)}$freeStr x ${it.unitPrice.toStringAsFixed(0)})',
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
                  const Text('TAXABLE:', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                  Text('₹${inv.taxableAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                ],
              ),
              if (isInterState)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('IGST (INTER-STATE):', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                    Text('₹${inv.igstAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
                  ],
                )
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('CGST + SGST:', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
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
              const Text('SCAN & PAY VIA UPI', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, fontFamily: 'monospace')),
              const SizedBox(height: 6),
              QrImageView(
                data: UpiQrHelper.buildUpiUri(
                  upiId: _storeUpiId,
                  payeeName: _storeName,
                  amount: inv.balanceAmount > 0 ? inv.balanceAmount : inv.totalAmount,
                  invoiceNumber: inv.invoiceNumber,
                ),
                version: QrVersions.auto,
                size: 110.0,
              ),
              const SizedBox(height: 4),
              Text('UPI: $_storeUpiId', style: const TextStyle(fontSize: 9, fontFamily: 'monospace')),
              const SizedBox(height: 8),
              const Text('THANK YOU FOR YOUR BUSINESS!', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, fontFamily: 'monospace')),
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
        title: Text(widget.invoice.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(icon: Icon(Icons.description_outlined), text: 'GST Tax Invoice (A4)'),
            Tab(icon: Icon(Icons.receipt_outlined), text: 'Thermal Slip'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_2_rounded, color: Color(0xFF4F46E5)),
            tooltip: 'Collect UPI Payment',
            onPressed: () => _showUpiQrSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.print_outlined, color: AppTheme.primary),
            tooltip: 'Print / Save PDF',
            onPressed: _handlePrint,
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined, color: AppTheme.accent),
            tooltip: 'WhatsApp / Share',
            onPressed: _shareViaWhatsApp,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (val) {
              if (val == 'sales_return') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CreateSalesReturnScreen(originalInvoice: widget.invoice),
                  ),
                );
              } else if (val == 'eway_bill') {
                _showEWayBillExportDialog();
              } else if (val == 'e_invoice') {
                _exportEInvoiceJson();
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'sales_return',
                child: Row(
                  children: [
                    Icon(Icons.replay_rounded, size: 18, color: AppTheme.danger),
                    SizedBox(width: 8),
                    Text('Sales Return (Credit Note)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'eway_bill',
                child: Row(
                  children: [
                    Icon(Icons.local_shipping_outlined, size: 18, color: Color(0xFF2563EB)),
                    SizedBox(width: 8),
                    Text('Export E-Way Bill JSON (NIC)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'e_invoice',
                child: Row(
                  children: [
                    Icon(Icons.receipt_outlined, size: 18, color: Color(0xFF059669)),
                    SizedBox(width: 8),
                    Text('Export E-Invoice JSON (IRP)'),
                  ],
                ),
              ),
            ],
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
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
                child: ElevatedButton.icon(
                  onPressed: () => _showUpiQrSheet(context),
                  icon: const Icon(Icons.qr_code_2, size: 17),
                  label: const Text('UPI QR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _shareViaWhatsApp,
                  icon: const Icon(Icons.share, size: 17, color: AppTheme.accent),
                  label: const Text('WhatsApp', style: TextStyle(color: AppTheme.accent, fontWeight: FontWeight.bold, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.accent),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _printOrGeneratePdf,
                  icon: const Icon(Icons.print, size: 17),
                  label: const Text('Print / PDF', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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
