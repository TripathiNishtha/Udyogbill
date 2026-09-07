import 'package:sqflite/sqflite.dart';
import '../app_database.dart';

class SfaDoctorModel {
  final String id;
  final String tenantId;
  final String name;
  final String? specialty;
  final String? qualification;
  final String? doctorClass;
  final int monthlyTargetVisits;
  final int visitedThisMonthCount;
  final String? clinicAddress;
  final double? latitude;
  final double? longitude;
  final double geofenceRadiusMeters;
  final String? patchId;
  final String? beatId;
  final String? updatedAt;

  SfaDoctorModel({
    required this.id,
    required this.tenantId,
    required this.name,
    this.specialty,
    this.qualification,
    this.doctorClass,
    this.monthlyTargetVisits = 2,
    this.visitedThisMonthCount = 0,
    this.clinicAddress,
    this.latitude,
    this.longitude,
    this.geofenceRadiusMeters = 200.0,
    this.patchId,
    this.beatId,
    this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'specialty': specialty,
      'qualification': qualification,
      'doctorClass': doctorClass,
      'monthlyTargetVisits': monthlyTargetVisits,
      'visitedThisMonthCount': visitedThisMonthCount,
      'clinicAddress': clinicAddress,
      'latitude': latitude,
      'longitude': longitude,
      'geofenceRadiusMeters': geofenceRadiusMeters,
      'patchId': patchId,
      'beatId': beatId,
      'updatedAt': updatedAt ?? DateTime.now().toIso8601String(),
    };
  }

  factory SfaDoctorModel.fromMap(Map<String, dynamic> map) {
    return SfaDoctorModel(
      id: map['id']?.toString() ?? '',
      tenantId: map['tenantId']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      specialty: map['specialty']?.toString(),
      qualification: map['qualification']?.toString(),
      doctorClass: map['doctorClass']?.toString(),
      monthlyTargetVisits: (map['monthlyTargetVisits'] as num?)?.toInt() ?? 2,
      visitedThisMonthCount: (map['visitedThisMonthCount'] as num?)?.toInt() ?? 0,
      clinicAddress: map['clinicAddress']?.toString(),
      latitude: (map['latitude'] as num?)?.toDouble(),
      longitude: (map['longitude'] as num?)?.toDouble(),
      geofenceRadiusMeters: (map['geofenceRadiusMeters'] as num?)?.toDouble() ?? 200.0,
      patchId: map['patchId']?.toString(),
      beatId: map['beatId']?.toString(),
      updatedAt: map['updatedAt']?.toString(),
    );
  }
}

class SfaChemistModel {
  final String id;
  final String tenantId;
  final String? partyId;
  final String chemistName;
  final String? shopName;
  final String? phone;
  final String? preferredStockistPartyId;
  final String? preferredStockistName;
  final double? latitude;
  final double? longitude;
  final String? patchId;
  final String? beatId;
  final String? updatedAt;

  SfaChemistModel({
    required this.id,
    required this.tenantId,
    this.partyId,
    required this.chemistName,
    this.shopName,
    this.phone,
    this.preferredStockistPartyId,
    this.preferredStockistName,
    this.latitude,
    this.longitude,
    this.patchId,
    this.beatId,
    this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'partyId': partyId,
      'chemistName': chemistName,
      'shopName': shopName,
      'phone': phone,
      'preferredStockistPartyId': preferredStockistPartyId,
      'preferredStockistName': preferredStockistName,
      'latitude': latitude,
      'longitude': longitude,
      'patchId': patchId,
      'beatId': beatId,
      'updatedAt': updatedAt ?? DateTime.now().toIso8601String(),
    };
  }

  factory SfaChemistModel.fromMap(Map<String, dynamic> map) {
    return SfaChemistModel(
      id: map['id']?.toString() ?? '',
      tenantId: map['tenantId']?.toString() ?? '',
      partyId: map['partyId']?.toString(),
      chemistName: map['chemistName']?.toString() ?? '',
      shopName: map['shopName']?.toString(),
      phone: map['phone']?.toString(),
      preferredStockistPartyId: map['preferredStockistPartyId']?.toString(),
      preferredStockistName: map['preferredStockistName']?.toString(),
      latitude: (map['latitude'] as num?)?.toDouble(),
      longitude: (map['longitude'] as num?)?.toDouble(),
      patchId: map['patchId']?.toString(),
      beatId: map['beatId']?.toString(),
      updatedAt: map['updatedAt']?.toString(),
    );
  }
}

class SfaSampleBagItemModel {
  final String id;
  final String tenantId;
  final String sampleItemId;
  final String sampleItemName;
  final String batchNumber;
  final String? expiryDate;
  final int currentBagBalance;
  final String? updatedAt;

  SfaSampleBagItemModel({
    required this.id,
    required this.tenantId,
    required this.sampleItemId,
    required this.sampleItemName,
    required this.batchNumber,
    this.expiryDate,
    required this.currentBagBalance,
    this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'sampleItemId': sampleItemId,
      'sampleItemName': sampleItemName,
      'batchNumber': batchNumber,
      'expiryDate': expiryDate,
      'currentBagBalance': currentBagBalance,
      'updatedAt': updatedAt ?? DateTime.now().toIso8601String(),
    };
  }

  factory SfaSampleBagItemModel.fromMap(Map<String, dynamic> map) {
    return SfaSampleBagItemModel(
      id: map['id']?.toString() ?? '',
      tenantId: map['tenantId']?.toString() ?? '',
      sampleItemId: map['sampleItemId']?.toString() ?? '',
      sampleItemName: map['sampleItemName']?.toString() ?? '',
      batchNumber: map['batchNumber']?.toString() ?? '',
      expiryDate: map['expiryDate']?.toString(),
      currentBagBalance: (map['currentBagBalance'] as num?)?.toInt() ?? 0,
      updatedAt: map['updatedAt']?.toString(),
    );
  }
}

class SfaSchemeModel {
  final String id;
  final String tenantId;
  final String? schemeCode;
  final String schemeName;
  final int schemeType; // 1=FreeGoods, 2=PercentageDiscount, 3=FlatDiscount
  final String? schemeTypeName;
  final String? itemId;
  final String? itemName;
  final int minimumOrderQuantity;
  final String? validFromUtc;
  final String? validToUtc;
  final bool isActive;
  final List<SfaSchemeSlabModel> slabs;

  SfaSchemeModel({
    required this.id,
    required this.tenantId,
    this.schemeCode,
    required this.schemeName,
    required this.schemeType,
    this.schemeTypeName,
    this.itemId,
    this.itemName,
    this.minimumOrderQuantity = 1,
    this.validFromUtc,
    this.validToUtc,
    this.isActive = true,
    this.slabs = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'schemeCode': schemeCode,
      'schemeName': schemeName,
      'schemeType': schemeType,
      'schemeTypeName': schemeTypeName,
      'itemId': itemId,
      'itemName': itemName,
      'minimumOrderQuantity': minimumOrderQuantity,
      'validFromUtc': validFromUtc,
      'validToUtc': validToUtc,
      'isActive': isActive ? 1 : 0,
    };
  }
}

class SfaSchemeSlabModel {
  final String id;
  final String schemeMasterId;
  final int minQuantity;
  final int? maxQuantity;
  final int freeQuantity;
  final double discountPercent;
  final double flatDiscountAmount;
  final String? freeItemId;
  final String? freeItemName;

  SfaSchemeSlabModel({
    required this.id,
    required this.schemeMasterId,
    required this.minQuantity,
    this.maxQuantity,
    this.freeQuantity = 0,
    this.discountPercent = 0.0,
    this.flatDiscountAmount = 0.0,
    this.freeItemId,
    this.freeItemName,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'schemeMasterId': schemeMasterId,
      'minQuantity': minQuantity,
      'maxQuantity': maxQuantity,
      'freeQuantity': freeQuantity,
      'discountPercent': discountPercent,
      'flatDiscountAmount': flatDiscountAmount,
      'freeItemId': freeItemId,
      'freeItemName': freeItemName,
    };
  }

  factory SfaSchemeSlabModel.fromMap(Map<String, dynamic> map) {
    return SfaSchemeSlabModel(
      id: map['id']?.toString() ?? '',
      schemeMasterId: map['schemeMasterId']?.toString() ?? '',
      minQuantity: (map['minQuantity'] as num?)?.toInt() ?? 0,
      maxQuantity: (map['maxQuantity'] as num?)?.toInt(),
      freeQuantity: (map['freeQuantity'] as num?)?.toInt() ?? 0,
      discountPercent: (map['discountPercent'] as num?)?.toDouble() ?? 0.0,
      flatDiscountAmount: (map['flatDiscountAmount'] as num?)?.toDouble() ?? 0.0,
      freeItemId: map['freeItemId']?.toString(),
      freeItemName: map['freeItemName']?.toString(),
    );
  }
}

class SfaDao {
  Future<Database> get _db async => await AppDatabase.instance.database;

  // -------------------------------------------------------------
  // DOCTOR ROSTER
  // -------------------------------------------------------------
  Future<void> upsertDoctors(List<SfaDoctorModel> doctors) async {
    final db = await _db;
    final batch = db.batch();
    for (final doc in doctors) {
      batch.insert(
        'sfa_doctors',
        doc.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<SfaDoctorModel>> getDoctors({String? beatId, String? search}) async {
    final db = await _db;
    String where = '';
    List<dynamic> whereArgs = [];

    if (beatId != null && beatId.isNotEmpty) {
      where += 'beatId = ?';
      whereArgs.add(beatId);
    }

    if (search != null && search.isNotEmpty) {
      if (where.isNotEmpty) where += ' AND ';
      where += '(name LIKE ? OR specialty LIKE ?)';
      whereArgs.add('%$search%');
      whereArgs.add('%$search%');
    }

    final maps = await db.query(
      'sfa_doctors',
      where: where.isEmpty ? null : where,
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: 'name ASC',
    );

    return maps.map((m) => SfaDoctorModel.fromMap(m)).toList();
  }

  // -------------------------------------------------------------
  // CHEMIST DIRECTORY
  // -------------------------------------------------------------
  Future<void> upsertChemists(List<SfaChemistModel> chemists) async {
    final db = await _db;
    final batch = db.batch();
    for (final ch in chemists) {
      batch.insert(
        'sfa_chemists',
        ch.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<SfaChemistModel>> getChemists({String? beatId, String? search}) async {
    final db = await _db;
    String where = '';
    List<dynamic> whereArgs = [];

    if (beatId != null && beatId.isNotEmpty) {
      where += 'beatId = ?';
      whereArgs.add(beatId);
    }

    if (search != null && search.isNotEmpty) {
      if (where.isNotEmpty) where += ' AND ';
      where += '(chemistName LIKE ? OR shopName LIKE ?)';
      whereArgs.add('%$search%');
      whereArgs.add('%$search%');
    }

    final maps = await db.query(
      'sfa_chemists',
      where: where.isEmpty ? null : where,
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: 'chemistName ASC',
    );

    return maps.map((m) => SfaChemistModel.fromMap(m)).toList();
  }

  // -------------------------------------------------------------
  // SAMPLE BAG STOCK & DEDUCTION
  // -------------------------------------------------------------
  Future<void> upsertSampleBag(List<SfaSampleBagItemModel> items) async {
    final db = await _db;
    final batch = db.batch();
    for (final it in items) {
      batch.insert(
        'sfa_sample_bag',
        it.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<SfaSampleBagItemModel>> getSampleBag() async {
    final db = await _db;
    final maps = await db.query(
      'sfa_sample_bag',
      where: 'currentBagBalance > 0',
      orderBy: 'sampleItemName ASC',
    );
    return maps.map((m) => SfaSampleBagItemModel.fromMap(m)).toList();
  }

  Future<bool> deductSampleQuantity(String sampleItemId, int qty) async {
    final db = await _db;
    final rows = await db.query(
      'sfa_sample_bag',
      where: 'sampleItemId = ?',
      whereArgs: [sampleItemId],
      limit: 1,
    );
    if (rows.isEmpty) return false;
    final currentBal = (rows.first['currentBagBalance'] as num?)?.toInt() ?? 0;
    if (currentBal < qty) return false;

    final newBal = currentBal - qty;
    await db.update(
      'sfa_sample_bag',
      {'currentBagBalance': newBal, 'updatedAt': DateTime.now().toIso8601String()},
      where: 'sampleItemId = ?',
      whereArgs: [sampleItemId],
    );
    return true;
  }

  // -------------------------------------------------------------
  // COMMERCIAL SCHEME EVALUATION (OFFLINE 10+1 ENGINE)
  // -------------------------------------------------------------
  Future<void> upsertSchemes(List<SfaSchemeModel> schemes) async {
    final db = await _db;
    final batch = db.batch();
    for (final s in schemes) {
      batch.insert('sfa_schemes', s.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      for (final slab in s.slabs) {
        batch.insert('sfa_scheme_slabs', slab.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    }
    await batch.commit(noResult: true);
  }

  Future<Map<String, dynamic>?> evaluateSchemeLocally(String itemId, int quantity) async {
    final db = await _db;
    // Find active scheme for item
    final schemes = await db.query(
      'sfa_schemes',
      where: 'itemId = ? AND isActive = 1',
      whereArgs: [itemId],
      limit: 1,
    );
    if (schemes.isEmpty) return null;

    final scheme = schemes.first;
    final schemeId = scheme['id'] as String;
    final minOrderQty = (scheme['minimumOrderQuantity'] as num?)?.toInt() ?? 1;
    if (quantity < minOrderQty) return null;

    // Slabs
    final slabs = await db.query(
      'sfa_scheme_slabs',
      where: 'schemeMasterId = ?',
      whereArgs: [schemeId],
      orderBy: 'minQuantity DESC',
    );

    for (final slab in slabs) {
      final minQ = (slab['minQuantity'] as num?)?.toInt() ?? 0;
      final maxQ = (slab['maxQuantity'] as num?)?.toInt();
      if (quantity >= minQ && (maxQ == null || quantity <= maxQ)) {
        int freeQty = 0;
        final slabFree = (slab['freeQuantity'] as num?)?.toInt() ?? 0;
        if (slabFree > 0 && minQ > 0) {
          final multiplier = quantity ~/ minQ;
          freeQty = multiplier * slabFree;
        }

        return {
          'schemeId': schemeId,
          'schemeName': scheme['schemeName'],
          'schemeType': scheme['schemeType'],
          'freeQuantity': freeQty,
          'discountPercent': (slab['discountPercent'] as num?)?.toDouble() ?? 0.0,
          'flatDiscountAmount': (slab['flatDiscountAmount'] as num?)?.toDouble() ?? 0.0,
          'freeItemName': slab['freeItemName'] ?? scheme['itemName'],
        };
      }
    }

    return null;
  }
}
