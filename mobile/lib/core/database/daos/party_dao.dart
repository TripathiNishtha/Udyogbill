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

  factory PartyModel.fromJson(Map<String, dynamic> json) {
    return PartyModel(
      id: json['id']?.toString() ?? '',
      tenantId: json['tenantId']?.toString() ?? '',
      name: json['legalName'] ?? json['name'] ?? '',
      tradeName: json['tradeName'],
      contactPerson: json['contactPersonName'] ?? json['contactPerson'],
      phone: json['primaryPhone'] ?? json['mobile'] ?? json['phone'],
      email: json['email'],
      gstin: json['gstin'] ?? json['gstinNumber'],
      pan: json['pan'],
      address: json['address'] ?? json['billingAddressLine1'],
      city: json['city'],
      state: json['state'],
      stateCode: json['stateCode'],
      pincode: json['pincode'],
      creditLimit: (json['creditLimit'] as num?)?.toDouble() ?? 0.0,
      creditPeriodDays: (json['creditPeriodDays'] as num?)?.toInt() ?? 30,
      drugLicenseNumber: json['drugLicenseNumber'],
      fssaiNumber: json['fssaiNumber'],
      attributesJson: json['attributesJson'],
      outstandingBalance: (json['currentOutstandingBalance'] ?? json['outstandingBalance'] as num?)?.toDouble() ?? 0.0,
      partyType: json['partyType'] is int ? json['partyType'] : (json['partyType'] == 'Supplier' || json['partyType'] == 2 ? 2 : 1),
      customerType: json['customerType'] is int ? json['customerType'] : 1,
      updatedAt: json['updatedAtUtc'] ?? json['updatedAt'] ?? DateTime.now().toIso8601String(),
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

    return maps.map((m) => PartyModel.fromMap(m)).toList();
  }

  Future<void> upsertParties(List<PartyModel> parties) async {
    final db = await _db;
    final batch = db.batch();
    for (final party in parties) {
      batch.insert(
        'parties',
        party.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
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
}
