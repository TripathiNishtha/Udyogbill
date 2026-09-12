import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class InvoiceItemModel {
  final String id;
  final String invoiceId;
  final String itemId;
  final String itemName;
  final String? itemSku;
  final String? hsnCode;
  final String? batchNumber;
  final String? expiryDate;
  final double quantity;
  final double freeQuantity;
  final double unitPrice;
  final double mrp;
  final double ptr;
  final double pts;
  final double discountPercent;
  final double schemeDiscountPercent;
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
    this.hsnCode,
    this.batchNumber,
    this.expiryDate,
    required this.quantity,
    this.freeQuantity = 0.0,
    required this.unitPrice,
    this.mrp = 0.0,
    this.ptr = 0.0,
    this.pts = 0.0,
    this.discountPercent = 0.0,
    this.schemeDiscountPercent = 0.0,
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
      'hsnCode': hsnCode,
      'batchNumber': batchNumber,
      'expiryDate': expiryDate,
      'quantity': quantity,
      'freeQuantity': freeQuantity,
      'unitPrice': unitPrice,
      'mrp': mrp,
      'ptr': ptr,
      'pts': pts,
      'discountPercent': discountPercent,
      'schemeDiscountPercent': schemeDiscountPercent,
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
      hsnCode: map['hsnCode'],
      batchNumber: map['batchNumber'],
      expiryDate: map['expiryDate'],
      quantity: (map['quantity'] as num).toDouble(),
      freeQuantity: (map['freeQuantity'] as num?)?.toDouble() ?? 0.0,
      unitPrice: (map['unitPrice'] as num).toDouble(),
      mrp: (map['mrp'] as num?)?.toDouble() ?? 0.0,
      ptr: (map['ptr'] as num?)?.toDouble() ?? 0.0,
      pts: (map['pts'] as num?)?.toDouble() ?? 0.0,
      discountPercent: (map['discountPercent'] as num?)?.toDouble() ?? 0.0,
      schemeDiscountPercent: (map['schemeDiscountPercent'] as num?)?.toDouble() ?? 0.0,
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
  final String? placeOfSupply;
  final String? billingStateCode;
  final String? shippingStateCode;
  final String? billingAddress;
  final String? shippingAddress;
  final String? poNumber;
  final String? poDate;
  final String? vehicleNumber;
  final String? transporterName;
  final String? transporterId;
  final String? ewayBillNumber;
  final String? ewayBillDate;
  final String? lrNumber;
  final String? lrDate;
  final bool isReverseCharge;
  final int invoiceType; // 1 = TaxInvoice (B2B), 2 = POSBill (Retail B2C)
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
    this.placeOfSupply,
    this.billingStateCode,
    this.shippingStateCode,
    this.billingAddress,
    this.shippingAddress,
    this.poNumber,
    this.poDate,
    this.vehicleNumber,
    this.transporterName,
    this.transporterId,
    this.ewayBillNumber,
    this.ewayBillDate,
    this.lrNumber,
    this.lrDate,
    this.isReverseCharge = false,
    this.invoiceType = 1,
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
      'placeOfSupply': placeOfSupply,
      'billingStateCode': billingStateCode,
      'shippingStateCode': shippingStateCode,
      'billingAddress': billingAddress,
      'shippingAddress': shippingAddress,
      'poNumber': poNumber,
      'poDate': poDate,
      'vehicleNumber': vehicleNumber,
      'transporterName': transporterName,
      'transporterId': transporterId,
      'ewayBillNumber': ewayBillNumber,
      'ewayBillDate': ewayBillDate,
      'lrNumber': lrNumber,
      'lrDate': lrDate,
      'isReverseCharge': isReverseCharge ? 1 : 0,
      'invoiceType': invoiceType,
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
      placeOfSupply: map['placeOfSupply'],
      billingStateCode: map['billingStateCode'],
      shippingStateCode: map['shippingStateCode'],
      billingAddress: map['billingAddress'],
      shippingAddress: map['shippingAddress'],
      poNumber: map['poNumber'],
      poDate: map['poDate'],
      vehicleNumber: map['vehicleNumber'],
      transporterName: map['transporterName'],
      transporterId: map['transporterId'],
      ewayBillNumber: map['ewayBillNumber'],
      ewayBillDate: map['ewayBillDate'],
      lrNumber: map['lrNumber'],
      lrDate: map['lrDate'],
      isReverseCharge: (map['isReverseCharge'] ?? 0) == 1,
      invoiceType: map['invoiceType'] ?? 1,
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

        // Deduct inventory stock quantity (Billed + Free Qty)
        final totalDeduct = item.quantity + item.freeQuantity;
        await txn.rawUpdate(
          'UPDATE items SET stockQuantity = stockQuantity - ? WHERE id = ?',
          [totalDeduct, item.itemId],
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

  /// Returns all invoices for a specific party
  Future<List<InvoiceModel>> getInvoicesByParty(String partyId) async {
    final db = await _db;
    final rows = await db.query(
      'invoices',
      where: 'partyId = ? AND isCancelled = 0',
      whereArgs: [partyId],
      orderBy: 'invoiceDate DESC',
    );
    final List<InvoiceModel> list = [];
    for (final r in rows) {
      final itemRows = await db.query(
        'invoice_items',
        where: 'invoiceId = ?',
        whereArgs: [r['id']],
      );
      final items = itemRows.map((it) => InvoiceItemModel.fromMap(it)).toList();
      list.add(InvoiceModel.fromMap(r, items: items));
    }
    return list;
  }
}
