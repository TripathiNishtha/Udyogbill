import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class InvoiceItemModel {
  final String id;
  final String invoiceId;
  final String itemId;
  final String itemName;
  final String? itemSku;
  final String? batchNumber;
  final double quantity;
  final double unitPrice;
  final double discountPercent;
  final double taxableAmount;
  final double gstRate;
  final double cgstAmount;
  final double sgstAmount;
  final double igstAmount;
  final double totalAmount;

  InvoiceItemModel({
    required this.id,
    required this.invoiceId,
    required this.itemId,
    required this.itemName,
    this.itemSku,
    this.batchNumber,
    required this.quantity,
    required this.unitPrice,
    this.discountPercent = 0.0,
    required this.taxableAmount,
    required this.gstRate,
    required this.cgstAmount,
    required this.sgstAmount,
    this.igstAmount = 0.0,
    required this.totalAmount,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'invoiceId': invoiceId,
      'itemId': itemId,
      'itemName': itemName,
      'itemSku': itemSku,
      'batchNumber': batchNumber,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'discountPercent': discountPercent,
      'taxableAmount': taxableAmount,
      'gstRate': gstRate,
      'cgstAmount': cgstAmount,
      'sgstAmount': sgstAmount,
      'igstAmount': igstAmount,
      'totalAmount': totalAmount,
    };
  }

  factory InvoiceItemModel.fromMap(Map<String, dynamic> map) {
    return InvoiceItemModel(
      id: map['id'],
      invoiceId: map['invoiceId'],
      itemId: map['itemId'],
      itemName: map['itemName'],
      itemSku: map['itemSku'],
      batchNumber: map['batchNumber'],
      quantity: (map['quantity'] as num).toDouble(),
      unitPrice: (map['unitPrice'] as num).toDouble(),
      discountPercent: (map['discountPercent'] as num?)?.toDouble() ?? 0.0,
      taxableAmount: (map['taxableAmount'] as num).toDouble(),
      gstRate: (map['gstRate'] as num).toDouble(),
      cgstAmount: (map['cgstAmount'] as num).toDouble(),
      sgstAmount: (map['sgstAmount'] as num).toDouble(),
      igstAmount: (map['igstAmount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (map['totalAmount'] as num).toDouble(),
    );
  }
}

class InvoiceModel {
  final String id;
  final String tenantId;
  final String invoiceNumber;
  final String invoiceDate;
  final String? dueDate;
  final String? partyId;
  final String partyName;
  final String? partyPhone;
  final String? partyGstin;
  final double taxableAmount;
  final double cgstAmount;
  final double sgstAmount;
  final double igstAmount;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final int paymentMode; // 1 = Cash, 2 = UPI, 3 = Card, 4 = Credit / Due
  final int paymentStatus; // 1 = Unpaid, 2 = Partially Paid, 3 = Paid
  final bool isCancelled;
  final bool isSynced;
  final String createdAt;
  final List<InvoiceItemModel> items;

  InvoiceModel({
    required this.id,
    required this.tenantId,
    required this.invoiceNumber,
    required this.invoiceDate,
    this.dueDate,
    this.partyId,
    required this.partyName,
    this.partyPhone,
    this.partyGstin,
    required this.taxableAmount,
    required this.cgstAmount,
    required this.sgstAmount,
    this.igstAmount = 0.0,
    required this.totalAmount,
    required this.paidAmount,
    required this.balanceAmount,
    required this.paymentMode,
    required this.paymentStatus,
    this.isCancelled = false,
    this.isSynced = false,
    required this.createdAt,
    this.items = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'invoiceNumber': invoiceNumber,
      'invoiceDate': invoiceDate,
      'dueDate': dueDate,
      'partyId': partyId,
      'partyName': partyName,
      'partyPhone': partyPhone,
      'partyGstin': partyGstin,
      'taxableAmount': taxableAmount,
      'cgstAmount': cgstAmount,
      'sgstAmount': sgstAmount,
      'igstAmount': igstAmount,
      'totalAmount': totalAmount,
      'paidAmount': paidAmount,
      'balanceAmount': balanceAmount,
      'paymentMode': paymentMode,
      'paymentStatus': paymentStatus,
      'isCancelled': isCancelled ? 1 : 0,
      'isSynced': isSynced ? 1 : 0,
      'createdAt': createdAt,
    };
  }

  factory InvoiceModel.fromMap(Map<String, dynamic> map, {List<InvoiceItemModel> items = const []}) {
    return InvoiceModel(
      id: map['id'],
      tenantId: map['tenantId'] ?? '',
      invoiceNumber: map['invoiceNumber'],
      invoiceDate: map['invoiceDate'],
      dueDate: map['dueDate'],
      partyId: map['partyId'],
      partyName: map['partyName'],
      partyPhone: map['partyPhone'],
      partyGstin: map['partyGstin'],
      taxableAmount: (map['taxableAmount'] as num).toDouble(),
      cgstAmount: (map['cgstAmount'] as num).toDouble(),
      sgstAmount: (map['sgstAmount'] as num).toDouble(),
      igstAmount: (map['igstAmount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (map['totalAmount'] as num).toDouble(),
      paidAmount: (map['paidAmount'] as num).toDouble(),
      balanceAmount: (map['balanceAmount'] as num).toDouble(),
      paymentMode: map['paymentMode'] ?? 1,
      paymentStatus: map['paymentStatus'] ?? 3,
      isCancelled: (map['isCancelled'] ?? 0) == 1,
      isSynced: (map['isSynced'] ?? 0) == 1,
      createdAt: map['createdAt'] ?? DateTime.now().toIso8601String(),
      items: items,
    );
  }
}

class InvoiceDao {
  Future<Database> get _db async => await AppDatabase.instance.database;

  Future<int> insertInvoice(InvoiceModel invoice) async {
    final db = await _db;
    return await db.transaction((txn) async {
      await txn.insert('invoices', invoice.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

      for (final item in invoice.items) {
        await txn.insert('invoice_items', item.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

        // Deduct inventory stock quantity
        await txn.rawUpdate(
          'UPDATE items SET stockQuantity = stockQuantity - ? WHERE id = ?',
          [item.quantity, item.itemId],
        );
      }

      // If credit bill, update party outstanding balance
      if (invoice.partyId != null && invoice.balanceAmount > 0) {
        await txn.rawUpdate(
          'UPDATE parties SET outstandingBalance = outstandingBalance + ? WHERE id = ?',
          [invoice.balanceAmount, invoice.partyId],
        );
      }

      return 1;
    });
  }

  Future<List<InvoiceModel>> getRecentInvoices({int limit = 50}) async {
    final db = await _db;
    final invMaps = await db.query(
      'invoices',
      orderBy: 'createdAt DESC',
      limit: limit,
    );

    if (invMaps.isEmpty) {
      await _seedSampleInvoices();
      return getRecentInvoices(limit: limit);
    }

    final List<InvoiceModel> results = [];
    for (final map in invMaps) {
      final itemsMaps = await db.query(
        'invoice_items',
        where: 'invoiceId = ?',
        whereArgs: [map['id']],
      );
      final items = itemsMaps.map((i) => InvoiceItemModel.fromMap(i)).toList();
      results.add(InvoiceModel.fromMap(map, items: items));
    }

    return results;
  }

  Future<Map<String, double>> getDashboardMetrics() async {
    final db = await _db;

    // 1. Total Today's Sales
    final todayStr = DateTime.now().toIso8601String().substring(0, 10);
    final salesRes = await db.rawQuery(
      'SELECT SUM(totalAmount) as todayTotal, COUNT(id) as todayCount FROM invoices WHERE invoiceDate LIKE ? AND isCancelled = 0',
      ['$todayStr%'],
    );
    final todaySales = (salesRes.first['todayTotal'] as num?)?.toDouble() ?? 0.0;

    // 2. Total Receivables (Lene Hain)
    final recvRes = await db.rawQuery(
      'SELECT SUM(outstandingBalance) as totalReceivable FROM parties WHERE partyType = 1 AND outstandingBalance > 0',
    );
    final totalReceivable = (recvRes.first['totalReceivable'] as num?)?.toDouble() ?? 0.0;

    // 3. Total Payables (Dene Hain)
    final payRes = await db.rawQuery(
      'SELECT SUM(outstandingBalance) as totalPayable FROM parties WHERE partyType = 2 AND outstandingBalance > 0',
    );
    final totalPayable = (payRes.first['totalPayable'] as num?)?.toDouble() ?? 0.0;

    return {
      'todaySales': todaySales,
      'totalReceivable': totalReceivable,
      'totalPayable': totalPayable,
    };
  }

  Future<String> getNextInvoiceNumber() async {
    final db = await _db;
    final res = await db.rawQuery('SELECT COUNT(id) as count FROM invoices');
    final count = ((res.first['count'] as num?)?.toInt() ?? 0) + 1;
    return 'INV-${DateTime.now().year}-${count.toString().padLeft(4, '0')}';
  }

  /// Returns Customer Directory aggregating billed phone numbers and names
  Future<List<Map<String, dynamic>>> getCustomerDirectory({String? query}) async {
    final db = await _db;
    String sql = '''
      SELECT 
        COALESCE(p.id, i.id) as id,
        COALESCE(p.name, i.partyName) as name,
        COALESCE(i.partyPhone, p.phone, '') as phone,
        COALESCE(p.city, '') as city,
        COUNT(i.id) as totalInvoices,
        COALESCE(SUM(i.totalAmount), 0.0) as totalSpent,
        MAX(i.invoiceDate) as lastVisitDate
      FROM invoices i
      LEFT JOIN parties p ON i.partyId = p.id
      WHERE i.isCancelled = 0 AND i.partyName IS NOT NULL AND i.partyName != ''
    ''';
    List<dynamic> args = [];
    if (query != null && query.trim().isNotEmpty) {
      sql += ' AND (i.partyName LIKE ? OR i.partyPhone LIKE ?)';
      args.addAll(['%${query.trim()}%', '%${query.trim()}%']);
    }
    sql += ' GROUP BY COALESCE(i.partyPhone, p.phone, i.partyName) ORDER BY totalSpent DESC';

    return await db.rawQuery(sql, args);
  }

  /// Returns GST GSTR-1 & GSTR-3B tax metrics
  Future<Map<String, double>> getGstTaxReport({String? fromDate, String? toDate}) async {
    final db = await _db;
    final res = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(taxableAmount), 0.0) as totalTaxable,
        COALESCE(SUM(cgstAmount), 0.0) as totalCgst,
        COALESCE(SUM(sgstAmount), 0.0) as totalSgst,
        COALESCE(SUM(igstAmount), 0.0) as totalIgst,
        COALESCE(SUM(totalAmount), 0.0) as totalGross
      FROM invoices
      WHERE isCancelled = 0
    ''');
    final row = res.first;
    return {
      'taxable': (row['totalTaxable'] as num?)?.toDouble() ?? 0.0,
      'cgst': (row['totalCgst'] as num?)?.toDouble() ?? 0.0,
      'sgst': (row['totalSgst'] as num?)?.toDouble() ?? 0.0,
      'igst': (row['totalIgst'] as num?)?.toDouble() ?? 0.0,
      'totalTax': (((row['totalCgst'] as num?)?.toDouble() ?? 0.0) + ((row['totalSgst'] as num?)?.toDouble() ?? 0.0)),
      'gross': (row['totalGross'] as num?)?.toDouble() ?? 0.0,
    };
  }

  Future<void> _seedSampleInvoices() async {
    final now = DateTime.now();
    final todayStr = now.toIso8601String().substring(0, 10);

    final sample1 = InvoiceModel(
      id: 'inv-seed-1',
      tenantId: 'demo-tenant',
      invoiceNumber: 'INV-2026-0001',
      invoiceDate: todayStr,
      partyId: 'cust-1',
      partyName: 'Sharma Medical Store',
      partyPhone: '9876543210',
      taxableAmount: 1250.0,
      cgstAmount: 75.0,
      sgstAmount: 75.0,
      totalAmount: 1400.0,
      paidAmount: 1400.0,
      balanceAmount: 0.0,
      paymentMode: 1, // Cash
      paymentStatus: 3, // Paid
      createdAt: now.subtract(const Duration(hours: 3)).toIso8601String(),
      items: [
        InvoiceItemModel(
          id: 'item-1',
          invoiceId: 'inv-seed-1',
          itemId: '1',
          itemName: 'Paracetamol 650mg Tabs',
          quantity: 20,
          unitPrice: 30.0,
          taxableAmount: 600.0,
          gstRate: 12.0,
          cgstAmount: 36.0,
          sgstAmount: 36.0,
          totalAmount: 672.0,
        ),
      ],
    );

    final sample2 = InvoiceModel(
      id: 'inv-seed-2',
      tenantId: 'demo-tenant',
      invoiceNumber: 'INV-2026-0002',
      invoiceDate: todayStr,
      partyId: 'cust-2',
      partyName: 'Gupta General Traders',
      partyPhone: '9811223344',
      taxableAmount: 3200.0,
      cgstAmount: 160.0,
      sgstAmount: 160.0,
      totalAmount: 3520.0,
      paidAmount: 1520.0,
      balanceAmount: 2000.0,
      paymentMode: 2, // UPI
      paymentStatus: 2, // Partial
      createdAt: now.subtract(const Duration(minutes: 45)).toIso8601String(),
    );

    await insertInvoice(sample1);
    await insertInvoice(sample2);
  }
}
