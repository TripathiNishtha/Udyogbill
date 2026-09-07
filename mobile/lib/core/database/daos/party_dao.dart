import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class PartyModel {
  final String id;
  final String tenantId;
  final String name;
  final String? tradeName;
  final String? contactPerson;
  final String? phone;
  final String? email;
  final String? gstin;
  final String? pan;
  final String? address;
  final String? city;
  final String? state;
  final String? stateCode;
  final String? pincode;
  final double creditLimit;
  final int creditPeriodDays;
  final String? drugLicenseNumber;
  final String? fssaiNumber;
  final String? attributesJson;
  final double outstandingBalance; // Positive = Receivable (Lene Hain), Negative = Payable (Dene Hain)
  final int partyType; // 1 = Customer, 2 = Supplier
  final int customerType; // 1 = B2B, 2 = B2C / Retail, 4 = Wholesale
  final String updatedAt;

  PartyModel({
    required this.id,
    required this.tenantId,
    required this.name,
    this.tradeName,
    this.contactPerson,
    this.phone,
    this.email,
    this.gstin,
    this.pan,
    this.address,
    this.city,
    this.state,
    this.stateCode,
    this.pincode,
    this.creditLimit = 0.0,
    this.creditPeriodDays = 30,
    this.drugLicenseNumber,
    this.fssaiNumber,
    this.attributesJson,
    this.outstandingBalance = 0.0,
    required this.partyType,
    this.customerType = 1,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'tradeName': tradeName,
      'contactPerson': contactPerson,
      'phone': phone,
      'email': email,
      'gstin': gstin,
      'pan': pan,
      'address': address,
      'city': city,
      'state': state,
      'stateCode': stateCode,
      'pincode': pincode,
      'creditLimit': creditLimit,
      'creditPeriodDays': creditPeriodDays,
      'drugLicenseNumber': drugLicenseNumber,
      'fssaiNumber': fssaiNumber,
      'attributesJson': attributesJson,
      'outstandingBalance': outstandingBalance,
      'partyType': partyType,
      'customerType': customerType,
      'updatedAt': updatedAt,
    };
  }

  factory PartyModel.fromMap(Map<String, dynamic> map) {
    return PartyModel(
      id: map['id'],
      tenantId: map['tenantId'] ?? '',
      name: map['name'],
      tradeName: map['tradeName'],
      contactPerson: map['contactPerson'],
      phone: map['phone'],
      email: map['email'],
      gstin: map['gstin'],
      pan: map['pan'],
      address: map['address'],
      city: map['city'],
      state: map['state'],
      stateCode: map['stateCode'],
      pincode: map['pincode'],
      creditLimit: (map['creditLimit'] as num?)?.toDouble() ?? 0.0,
      creditPeriodDays: (map['creditPeriodDays'] as num?)?.toInt() ?? 30,
      drugLicenseNumber: map['drugLicenseNumber'],
      fssaiNumber: map['fssaiNumber'],
      attributesJson: map['attributesJson'],
      outstandingBalance: (map['outstandingBalance'] as num?)?.toDouble() ?? 0.0,
      partyType: map['partyType'] ?? 1,
      customerType: map['customerType'] ?? 1,
      updatedAt: map['updatedAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class PartyDao {
  Future<Database> get _db async => await AppDatabase.instance.database;

  Future<int> insertParty(PartyModel party) async {
    final db = await _db;
    return await db.insert(
      'parties',
      party.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<PartyModel>> getAllParties({int? partyType}) async {
    final db = await _db;
    List<Map<String, dynamic>> maps;
    if (partyType != null) {
      maps = await db.query(
        'parties',
        where: 'partyType = ?',
        whereArgs: [partyType],
        orderBy: 'name ASC',
      );
    } else {
      maps = await db.query('parties', orderBy: 'name ASC');
    }

    if (maps.isEmpty) {
      await _seedSampleParties();
      return getAllParties(partyType: partyType);
    }

    return maps.map((m) => PartyModel.fromMap(m)).toList();
  }

  Future<List<PartyModel>> searchParties(String query, {int? partyType}) async {
    final db = await _db;
    final cleanQuery = query.trim();

    String whereClause = '(name LIKE ? OR phone LIKE ?)';
    List<dynamic> whereArgs = ['%$cleanQuery%', '%$cleanQuery%'];

    if (partyType != null) {
      whereClause += ' AND partyType = ?';
      whereArgs.add(partyType);
    }

    final maps = await db.query(
      'parties',
      where: whereClause,
      whereArgs: whereArgs,
      limit: 30,
      orderBy: 'name ASC',
    );

    return maps.map((m) => PartyModel.fromMap(m)).toList();
  }

  Future<int> updateBalance(String partyId, double deltaAmount) async {
    final db = await _db;
    return await db.rawUpdate(
      'UPDATE parties SET outstandingBalance = outstandingBalance + ?, updatedAt = ? WHERE id = ?',
      [deltaAmount, DateTime.now().toIso8601String(), partyId],
    );
  }

  Future<void> _seedSampleParties() async {
    final db = await _db;
    final now = DateTime.now().toIso8601String();
    final batch = db.batch();

    final samples = [
      PartyModel(
        id: 'cust-1',
        tenantId: 'demo-tenant',
        name: 'Sharma Medical Store',
        phone: '9876543210',
        gstin: '07AAAAA0000A1Z5',
        address: 'Chandni Chowk, Delhi',
        outstandingBalance: 14500.0,
        partyType: 1, // Customer
        updatedAt: now,
      ),
      PartyModel(
        id: 'cust-2',
        tenantId: 'demo-tenant',
        name: 'Gupta General Traders',
        phone: '9811223344',
        gstin: '07BBBBB1111B2Z6',
        address: 'Sector 18, Noida',
        outstandingBalance: 8200.0,
        partyType: 1, // Customer
        updatedAt: now,
      ),
      PartyModel(
        id: 'cust-3',
        tenantId: 'demo-tenant',
        name: 'Cash Customer (Counter Walk-in)',
        phone: '9999999999',
        address: 'Counter Retail',
        outstandingBalance: 0.0,
        partyType: 1, // Customer
        updatedAt: now,
      ),
      PartyModel(
        id: 'supp-1',
        tenantId: 'demo-tenant',
        name: 'Cipla India Healthcare Ltd',
        phone: '9820011223',
        gstin: '27CCCC2222C3Z7',
        address: 'Mumbai Central, MH',
        outstandingBalance: 35000.0, // We owe them
        partyType: 2, // Supplier
        updatedAt: now,
      ),
      PartyModel(
        id: 'supp-2',
        tenantId: 'demo-tenant',
        name: 'Sun Pharma Distributors',
        phone: '9833445566',
        gstin: '24DDDD3333D4Z8',
        address: 'Baroda, Gujarat',
        outstandingBalance: 18400.0,
        partyType: 2, // Supplier
        updatedAt: now,
      ),
    ];

    for (final p in samples) {
      batch.insert('parties', p.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }
}
