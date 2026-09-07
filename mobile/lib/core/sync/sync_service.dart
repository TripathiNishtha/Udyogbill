import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import '../database/app_database.dart';
import '../database/daos/item_dao.dart';
import '../database/daos/sfa_dao.dart';
import '../network/api_client.dart';

class SyncService {
  final ApiClient _apiClient = ApiClient();
  final ItemDao _itemDao = ItemDao();
  final SfaDao _sfaDao = SfaDao();

  Future<Database> get _db async => await AppDatabase.instance.database;

  /// Pulls full/incremental product catalog from UdyogBill backend into SQLite
  Future<int> syncCatalogFromWeb() async {
    try {
      final response = await _apiClient.get('/tenant/items', queryParameters: {
        'page': 1,
        'pageSize': 1000,
      });

      if (response.statusCode == 200 && response.data != null) {
        final List itemsJson = response.data['items'] ?? response.data['data'] ?? [];
        final items = itemsJson.map((j) => ItemModel.fromJson(j)).toList();

        if (items.isNotEmpty) {
          await _itemDao.upsertItems(items);
        }
        return items.length;
      }
    } catch (e) {
      // In offline mode, continue using local SQLite database smoothly
    }
    return 0;
  }

  /// Pulls assigned Doctors, Chemist Beats, Sample Balances, and Trade Schemes into SQLite
  Future<int> syncSfaRosterFromWeb() async {
    int totalSynced = 0;
    try {
      // 1. Doctors Roster
      final docRes = await _apiClient.get('/tenant/sfa/doctors');
      if (docRes.statusCode == 200 && docRes.data != null) {
        final List docs = docRes.data is List ? docRes.data : docRes.data['data'] ?? [];
        final models = docs.map((d) => SfaDoctorModel.fromMap(d)).toList();
        await _sfaDao.upsertDoctors(models);
        totalSynced += models.length;
      }

      // 2. Chemists Roster
      final chemRes = await _apiClient.get('/tenant/sfa/chemists');
      if (chemRes.statusCode == 200 && chemRes.data != null) {
        final List chems = chemRes.data is List ? chemRes.data : chemRes.data['data'] ?? [];
        final models = chems.map((c) => SfaChemistModel.fromMap(c)).toList();
        await _sfaDao.upsertChemists(models);
        totalSynced += models.length;
      }

      // 3. Sample Bag Stock
      final sampleRes = await _apiClient.get('/tenant/sfa/sample-stock');
      if (sampleRes.statusCode == 200 && sampleRes.data != null) {
        final List samples = sampleRes.data is List ? sampleRes.data : sampleRes.data['data'] ?? [];
        final models = samples.map((s) => SfaSampleBagItemModel.fromMap(s)).toList();
        await _sfaDao.upsertSampleBag(models);
        totalSynced += models.length;
      }

      // 4. Commercial Schemes
      final schemeRes = await _apiClient.get('/tenant/sfa/schemes');
      if (schemeRes.statusCode == 200 && schemeRes.data != null) {
        final List schemes = schemeRes.data is List ? schemeRes.data : schemeRes.data['data'] ?? [];
        final models = schemes.map((s) {
          final slabsJson = (s['slabs'] as List?) ?? [];
          final slabs = slabsJson.map((sl) => SfaSchemeSlabModel.fromMap(sl)).toList();
          return SfaSchemeModel(
            id: s['id']?.toString() ?? '',
            tenantId: s['tenantId']?.toString() ?? '',
            schemeCode: s['schemeCode']?.toString(),
            schemeName: s['schemeName']?.toString() ?? '',
            schemeType: (s['schemeType'] as num?)?.toInt() ?? 1,
            schemeTypeName: s['schemeTypeName']?.toString(),
            itemId: s['itemId']?.toString(),
            itemName: s['itemName']?.toString(),
            minimumOrderQuantity: (s['minimumOrderQuantity'] as num?)?.toInt() ?? 1,
            validFromUtc: s['validFromUtc']?.toString(),
            validToUtc: s['validToUtc']?.toString(),
            isActive: s['isActive'] == true || s['isActive'] == 1,
            slabs: slabs,
          );
        }).toList();
        await _sfaDao.upsertSchemes(models);
        totalSynced += models.length;
      }
    } catch (_) {
      // In offline mode, keep utilizing local SQLite cache
    }
    return totalSynced;
  }

  /// Queues an offline-created invoice to sync_queue
  Future<void> queueOfflineInvoice({
    required String invoiceId,
    required Map<String, dynamic> invoicePayload,
  }) async {
    final db = await _db;
    await db.insert('sync_queue', {
      'id': invoiceId,
      'action': 'CREATE_INVOICE',
      'endpoint': '/tenant/invoices',
      'method': 'POST',
      'payloadJson': jsonEncode(invoicePayload),
      'attempts': 0,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  /// Queues an offline DCR submission to sync_queue with sample stock deduction
  Future<void> queueOfflineDcr({
    required String dcrId,
    required Map<String, dynamic> dcrPayload,
    List<Map<String, dynamic>>? sampleGifts,
  }) async {
    final db = await _db;
    await db.insert('sync_queue', {
      'id': dcrId,
      'action': 'CREATE_DCR',
      'endpoint': '/tenant/sfa/dcrs',
      'method': 'POST',
      'payloadJson': jsonEncode(dcrPayload),
      'attempts': 0,
      'createdAt': DateTime.now().toIso8601String(),
    });

    // Deduct samples locally so bag balance reflects immediately in offline field
    if (sampleGifts != null) {
      for (final gift in sampleGifts) {
        final itemId = gift['sampleItemId']?.toString() ?? '';
        final qty = (gift['quantityGiven'] as num?)?.toInt() ?? 0;
        if (itemId.isNotEmpty && qty > 0) {
          await _sfaDao.deductSampleQuantity(itemId, qty);
        }
      }
    }
  }

  /// Queues an offline POB order to sync_queue
  Future<void> queueOfflinePobOrder({
    required String pobOrderId,
    required Map<String, dynamic> pobPayload,
  }) async {
    final db = await _db;
    await db.insert('sync_queue', {
      'id': pobOrderId,
      'action': 'CREATE_POB',
      'endpoint': '/tenant/sfa/pob-orders',
      'method': 'POST',
      'payloadJson': jsonEncode(pobPayload),
      'attempts': 0,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  /// Count pending sync operations in offline queue
  Future<int> getPendingSyncCount() async {
    final db = await _db;
    final res = await db.rawQuery('SELECT COUNT(*) as cnt FROM sync_queue');
    if (res.isNotEmpty) {
      return (res.first['cnt'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  /// Flushes queued offline transactions to server when connectivity returns
  Future<int> flushSyncQueue() async {
    final db = await _db;
    final pending = await db.query('sync_queue', orderBy: 'createdAt ASC');
    int syncedCount = 0;

    for (final task in pending) {
      final id = task['id'] as String;
      final action = task['action'] as String;
      final endpoint = task['endpoint'] as String;
      final payload = jsonDecode(task['payloadJson'] as String);

      try {
        final res = await _apiClient.post(endpoint, data: payload);
        if (res.statusCode == 200 || res.statusCode == 201) {
          // Success: Remove from queue
          await db.delete('sync_queue', where: 'id = ?', whereArgs: [id]);
          if (action == 'CREATE_INVOICE') {
            await db.update('invoices', {'isSynced': 1}, where: 'id = ?', whereArgs: [id]);
          }
          syncedCount++;
        }
      } catch (e) {
        // Increment attempts on failure
        await db.rawUpdate(
          'UPDATE sync_queue SET attempts = attempts + 1, lastError = ? WHERE id = ?',
          [e.toString(), id],
        );
      }
    }

    return syncedCount;
  }
}
