import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class SalesReturnItemModel {
  final String id;
  final String returnId;
  final String itemId;
  final String itemName;
  final String? hsnCode;
  final String? batchNumber;
  final String? expiryDate;
  final double quantity;
  final double unitPrice;
  final double taxableAmount;
  final double gstRate;
  final double cgstAmount;
  final double sgstAmount;
  final double igstAmount;
  final double totalAmount;

  SalesReturnItemModel({
    required this.id,
    required this.returnId,
    required this.itemId,
    required this.itemName,
    this.hsnCode,
    this.batchNumber,
    this.expiryDate,
    required this.quantity,
    required this.unitPrice,
    required this.taxableAmount,
    required this.gstRate,
    this.cgstAmount = 0.0,
    this.sgstAmount = 0.0,
    this.igstAmount = 0.0,
    required this.totalAmount,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'returnId': returnId,
      'itemId': itemId,
      'itemName': itemName,
      'hsnCode': hsnCode,
      'batchNumber': batchNumber,
      'expiryDate': expiryDate,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'taxableAmount': taxableAmount,
      'gstRate': gstRate,
      'cgstAmount': cgstAmount,
      'sgstAmount': sgstAmount,
      'igstAmount': igstAmount,
      'totalAmount': totalAmount,
    };
  }

  factory SalesReturnItemModel.fromMap(Map<String, dynamic> map) {
    return SalesReturnItemModel(
      id: map['id'] as String,
      returnId: map['returnId'] as String,
      itemId: map['itemId'] as String,
      itemName: map['itemName'] as String,
      hsnCode: map['hsnCode'] as String?,
      batchNumber: map['batchNumber'] as String?,
      expiryDate: map['expiryDate'] as String?,
      quantity: (map['quantity'] as num).toDouble(),
      unitPrice: (map['unitPrice'] as num).toDouble(),
      taxableAmount: (map['taxableAmount'] as num).toDouble(),
      gstRate: (map['gstRate'] as num).toDouble(),
      cgstAmount: ((map['cgstAmount'] ?? 0.0) as num).toDouble(),
      sgstAmount: ((map['sgstAmount'] ?? 0.0) as num).toDouble(),
      igstAmount: ((map['igstAmount'] ?? 0.0) as num).toDouble(),
      totalAmount: (map['totalAmount'] as num).toDouble(),
    );
  }
}

class SalesReturnModel {
  final String id;
  final String tenantId;
  final String creditNoteNumber;
  final String? originalInvoiceId;
  final String? originalInvoiceNumber;
  final String partyId;
  final String partyName;
  final String? partyPhone;
  final String returnDate;
  final String returnReason;
  final double taxableAmount;
  final double cgstAmount;
  final double sgstAmount;
  final double igstAmount;
  final double totalAmount;
  final bool restockToWarehouse;
  final bool isSynced;
  final String createdAt;
  final List<SalesReturnItemModel> items;

  SalesReturnModel({
    required this.id,
    required this.tenantId,
    required this.creditNoteNumber,
    this.originalInvoiceId,
    this.originalInvoiceNumber,
    required this.partyId,
    required this.partyName,
    this.partyPhone,
    required this.returnDate,
    required this.returnReason,
    required this.taxableAmount,
    required this.cgstAmount,
    required this.sgstAmount,
    required this.igstAmount,
    required this.totalAmount,
    this.restockToWarehouse = true,
    this.isSynced = false,
    required this.createdAt,
    this.items = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'creditNoteNumber': creditNoteNumber,
      'originalInvoiceId': originalInvoiceId,
      'originalInvoiceNumber': originalInvoiceNumber,
      'partyId': partyId,
      'partyName': partyName,
      'partyPhone': partyPhone,
      'returnDate': returnDate,
      'returnReason': returnReason,
      'taxableAmount': taxableAmount,
      'cgstAmount': cgstAmount,
      'sgstAmount': sgstAmount,
      'igstAmount': igstAmount,
      'totalAmount': totalAmount,
      'restockToWarehouse': restockToWarehouse ? 1 : 0,
      'isSynced': isSynced ? 1 : 0,
      'createdAt': createdAt,
    };
  }

  factory SalesReturnModel.fromMap(Map<String, dynamic> map, {List<SalesReturnItemModel> items = const []}) {
    return SalesReturnModel(
      id: map['id'] as String,
      tenantId: map['tenantId'] as String,
      creditNoteNumber: map['creditNoteNumber'] as String,
      originalInvoiceId: map['originalInvoiceId'] as String?,
      originalInvoiceNumber: map['originalInvoiceNumber'] as String?,
      partyId: map['partyId'] as String,
      partyName: map['partyName'] as String,
      partyPhone: map['partyPhone'] as String?,
      returnDate: map['returnDate'] as String,
      returnReason: map['returnReason'] as String,
      taxableAmount: (map['taxableAmount'] as num).toDouble(),
      cgstAmount: (map['cgstAmount'] as num).toDouble(),
      sgstAmount: (map['sgstAmount'] as num).toDouble(),
      igstAmount: (map['igstAmount'] as num).toDouble(),
      totalAmount: (map['totalAmount'] as num).toDouble(),
      restockToWarehouse: (map['restockToWarehouse'] as int?) == 1,
      isSynced: (map['isSynced'] as int?) == 1,
      createdAt: map['createdAt'] as String,
      items: items,
    );
  }
}

class SalesReturnDao {
  Future<Database> get _db async => await AppDatabase.instance.database;

  /// Generates next sequential Credit Note Number: e.g. "CN-2627-00001"
  Future<String> getNextCreditNoteNumber() async {
    final db = await _db;
    final now = DateTime.now();
    final startYear = now.month >= 4 ? now.year % 100 : (now.year - 1) % 100;
    final endYear = (startYear + 1) % 100;
    final fyPrefix = 'CN-${startYear.toString().padLeft(2, '0')}${endYear.toString().padLeft(2, '0')}';

    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM sales_returns WHERE creditNoteNumber LIKE ?',
      ['$fyPrefix-%'],
    );
    final count = (result.first['count'] as int? ?? 0) + 1;
    return '$fyPrefix-${count.toString().padLeft(5, '0')}';
  }

  /// Inserts a sales return (Credit Note) atomically:
  /// 1. Inserts into `sales_returns`
  /// 2. Inserts line items into `sales_return_items`
  /// 3. If restockToWarehouse is true, increments stock in `items`
  /// 4. Decrements customer's receivable balance in `parties`
  Future<void> insertSalesReturn(SalesReturnModel salesReturn) async {
    final db = await _db;
    await db.transaction((txn) async {
      // 1. Insert header
      await txn.insert(
        'sales_returns',
        salesReturn.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );

      // 2. Insert items and optionally restock
      for (final it in salesReturn.items) {
        await txn.insert(
          'sales_return_items',
          it.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );

        if (salesReturn.restockToWarehouse && it.quantity > 0) {
          await txn.rawUpdate(
            'UPDATE items SET stockQuantity = stockQuantity + ? WHERE id = ?',
            [it.quantity, it.itemId],
          );
        }
      }

      // 3. Decrement customer outstanding balance (reduces receivable dues)
      await txn.rawUpdate(
        'UPDATE parties SET outstandingBalance = outstandingBalance - ? WHERE id = ?',
        [salesReturn.totalAmount, salesReturn.partyId],
      );
    });
  }

  /// Get all credit notes, ordered by date descending
  Future<List<SalesReturnModel>> getAllSalesReturns() async {
    final db = await _db;
    final rows = await db.query('sales_returns', orderBy: 'createdAt DESC');
    return rows.map((r) => SalesReturnModel.fromMap(r)).toList();
  }

  /// Get credit note with its complete line items
  Future<SalesReturnModel?> getSalesReturnWithItems(String id) async {
    final db = await _db;
    final headers = await db.query('sales_returns', where: 'id = ?', whereArgs: [id], limit: 1);
    if (headers.isEmpty) return null;

    final itemRows = await db.query('sales_return_items', where: 'returnId = ?', whereArgs: [id]);
    final items = itemRows.map((r) => SalesReturnItemModel.fromMap(r)).toList();

    return SalesReturnModel.fromMap(headers.first, items: items);
  }

  /// Get credit notes issued for a specific party
  Future<List<SalesReturnModel>> getSalesReturnsByParty(String partyId) async {
    final db = await _db;
    final rows = await db.query(
      'sales_returns',
      where: 'partyId = ?',
      whereArgs: [partyId],
      orderBy: 'createdAt DESC',
    );
    return rows.map((r) => SalesReturnModel.fromMap(r)).toList();
  }

  /// Today total return amount
  Future<double> getTodayReturnsTotal() async {
    final db = await _db;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final result = await db.rawQuery(
      'SELECT SUM(totalAmount) as total FROM sales_returns WHERE returnDate = ?',
      [today],
    );
    return (result.first['total'] as num?)?.toDouble() ?? 0.0;
  }
}
