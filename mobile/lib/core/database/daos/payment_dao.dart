import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class PaymentModel {
  final String id;
  final String tenantId;
  final String paymentNumber;
  final String partyId;
  final String partyName;
  final String? partyPhone;
  final double amount;
  final String paymentDate;
  final int paymentMode; // 1 = Cash, 2 = UPI, 3 = Cheque, 4 = Bank Transfer
  final String? referenceNumber;
  final String? notes;
  final bool isSynced;
  final String createdAt;

  PaymentModel({
    required this.id,
    required this.tenantId,
    required this.paymentNumber,
    required this.partyId,
    required this.partyName,
    this.partyPhone,
    required this.amount,
    required this.paymentDate,
    required this.paymentMode,
    this.referenceNumber,
    this.notes,
    this.isSynced = false,
    required this.createdAt,
  });

  String get paymentModeLabel {
    switch (paymentMode) {
      case 1:
        return 'Cash';
      case 2:
        return 'UPI';
      case 3:
        return 'Cheque';
      case 4:
        return 'Bank Transfer';
      default:
        return 'Cash';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'paymentNumber': paymentNumber,
      'partyId': partyId,
      'partyName': partyName,
      'partyPhone': partyPhone,
      'amount': amount,
      'paymentDate': paymentDate,
      'paymentMode': paymentMode,
      'referenceNumber': referenceNumber,
      'notes': notes,
      'isSynced': isSynced ? 1 : 0,
      'createdAt': createdAt,
    };
  }

  factory PaymentModel.fromMap(Map<String, dynamic> map) {
    return PaymentModel(
      id: map['id'],
      tenantId: map['tenantId'] ?? '',
      paymentNumber: map['paymentNumber'],
      partyId: map['partyId'],
      partyName: map['partyName'],
      partyPhone: map['partyPhone'],
      amount: (map['amount'] as num).toDouble(),
      paymentDate: map['paymentDate'],
      paymentMode: map['paymentMode'] ?? 1,
      referenceNumber: map['referenceNumber'],
      notes: map['notes'],
      isSynced: (map['isSynced'] ?? 0) == 1,
      createdAt: map['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class PaymentDao {
  Future<Database> get _db async => await AppDatabase.instance.database;

  Future<String> getNextPaymentNumber() async {
    final db = await _db;
    final year = DateTime.now().year.toString().substring(2);
    final nextYear = (DateTime.now().year + 1).toString().substring(2);
    final fyPrefix = 'REC-$year$nextYear-';

    final result = await db.rawQuery(
      'SELECT paymentNumber FROM payments WHERE paymentNumber LIKE ? ORDER BY createdAt DESC LIMIT 1',
      ['$fyPrefix%'],
    );

    if (result.isEmpty) {
      return '${fyPrefix}00001';
    }

    final lastNo = result.first['paymentNumber'] as String;
    final parts = lastNo.split('-');
    if (parts.length == 3) {
      final seq = int.tryParse(parts[2]) ?? 0;
      return '$fyPrefix${(seq + 1).toString().padLeft(5, '0')}';
    }

    return '${fyPrefix}00001';
  }

  /// Inserts payment and decrements party outstanding balance in an atomic transaction
  Future<int> insertPayment(PaymentModel payment) async {
    final db = await _db;
    return await db.transaction((txn) async {
      await txn.insert('payments', payment.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

      // Decrement party's outstanding balance
      await txn.rawUpdate(
        'UPDATE parties SET outstandingBalance = outstandingBalance - ?, updatedAt = ? WHERE id = ?',
        [payment.amount, DateTime.now().toIso8601String(), payment.partyId],
      );

      return 1;
    });
  }

  Future<List<PaymentModel>> getPaymentsByParty(String partyId) async {
    final db = await _db;
    final maps = await db.query(
      'payments',
      where: 'partyId = ?',
      whereArgs: [partyId],
      orderBy: 'createdAt DESC',
    );
    return maps.map((m) => PaymentModel.fromMap(m)).toList();
  }

  Future<List<PaymentModel>> getRecentPayments({int limit = 50}) async {
    final db = await _db;
    final maps = await db.query(
      'payments',
      orderBy: 'createdAt DESC',
      limit: limit,
    );
    return maps.map((m) => PaymentModel.fromMap(m)).toList();
  }

  Future<double> getTodayCollectionTotal() async {
    final db = await _db;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final result = await db.rawQuery(
      'SELECT SUM(amount) as total FROM payments WHERE paymentDate = ?',
      [today],
    );
    if (result.isNotEmpty && result.first['total'] != null) {
      return (result.first['total'] as num).toDouble();
    }
    return 0.0;
  }
}
