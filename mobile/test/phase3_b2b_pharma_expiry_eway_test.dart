import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:udyogbill_mobile/core/database/daos/invoice_dao.dart';
import 'package:udyogbill_mobile/core/database/daos/item_dao.dart';
import 'package:udyogbill_mobile/core/utils/eway_bill_json_helper.dart';

void main() {
  group('Phase 3: B2B Pharma Expiry & NIC E-Way Bill Tests', () {
    test('ItemModel with Pharma B2B & Batch fields serializes and deserializes accurately', () {
      final item = ItemModel(
        id: 'item-pharma-01',
        tenantId: 'tenant-001',
        name: 'Augmentin 625 Duo Tablet',
        sku: 'AUG-625',
        barcode: '8901234567890',
        hsnCode: '3004',
        batchNumber: 'AUG-9941',
        expiryDate: '12/28',
        mrp: 220.0,
        ptr: 172.50,
        pts: 155.25,
        rackLocation: 'RACK-A3',
        salePrice: 172.50,
        purchasePrice: 155.25,
        stockQuantity: 45.0,
        gstRate: 12.0,
        uom: 'Strip',
        categoryName: 'Antibiotics',
        isSynced: true,
        updatedAt: '2026-09-11T10:00:00.000Z',
      );

      final map = item.toMap();
      expect(map['id'], 'item-pharma-01');
      expect(map['batchNumber'], 'AUG-9941');
      expect(map['expiryDate'], '12/28');
      expect(map['mrp'], 220.0);
      expect(map['ptr'], 172.50);
      expect(map['pts'], 155.25);
      expect(map['rackLocation'], 'RACK-A3');

      final deserialized = ItemModel.fromMap(map);
      expect(deserialized.name, item.name);
      expect(deserialized.batchNumber, 'AUG-9941');
      expect(deserialized.mrp, 220.0);
      expect(deserialized.ptr, 172.50);
      expect(deserialized.rackLocation, 'RACK-A3');
    });

    test('ItemModel correctly computes expiry dates, days remaining, and severity', () {
      // 1. Expired item (MM/YY format from past year)
      final expiredItem = ItemModel(
        id: 'exp-1',
        tenantId: 't1',
        name: 'Expired Capsule',
        expiryDate: '01/24',
        salePrice: 50.0,
        purchasePrice: 40.0,
        stockQuantity: 10.0,
        gstRate: 12.0,
        updatedAt: '2026-09-11',
      );
      expect(expiredItem.parsedExpiryDate, isNotNull);
      expect(expiredItem.daysUntilExpiry, isNotNull);
      expect(expiredItem.daysUntilExpiry! < 0, isTrue);
      expect(expiredItem.expirySeverity, 1); // 1 = Expired

      // 2. Critical item (expiring soon)
      final now = DateTime.now();
      final soonDate = now.add(const Duration(days: 15));
      final soonStr = '${soonDate.month.toString().padLeft(2, '0')}/${soonDate.year.toString().substring(2)}';
      final criticalItem = ItemModel(
        id: 'crit-1',
        tenantId: 't1',
        name: 'Critical Syrup',
        expiryDate: soonStr,
        salePrice: 100.0,
        purchasePrice: 80.0,
        stockQuantity: 5.0,
        gstRate: 12.0,
        updatedAt: '2026-09-11',
      );
      expect(criticalItem.parsedExpiryDate, isNotNull);
      expect(criticalItem.daysUntilExpiry, isNotNull);
      expect(criticalItem.daysUntilExpiry! >= 0, isTrue);

      // 3. Far future item (Safe)
      final safeItem = ItemModel(
        id: 'safe-1',
        tenantId: 't1',
        name: 'Safe Ointment',
        expiryDate: '12/35',
        salePrice: 80.0,
        purchasePrice: 60.0,
        stockQuantity: 20.0,
        gstRate: 12.0,
        updatedAt: '2026-09-11',
      );
      expect(safeItem.daysUntilExpiry! > 90, isTrue);
      expect(safeItem.expirySeverity, 5); // 5 = Safe
    });

    test('EwayBillJsonHelper generates valid NIC compliant E-Way Bill JSON', () {
      final invoice = InvoiceModel(
        id: 'inv-test-b2b',
        tenantId: 'tenant-001',
        invoiceNumber: 'INV-2627-0089',
        invoiceDate: '2026-09-11',
        partyName: 'Sharma Medical Agency',
        partyGstin: '09AAACH7409R1ZZ',
        partyPhone: '9876543210',
        placeOfSupply: '09-Uttar Pradesh',
        billingStateCode: '09',
        billingAddress: 'Shop 14, Main Chemist Market, Kanpur',
        vehicleNumber: 'UP78BT4567',
        transporterName: 'Express Cargo',
        lrNumber: 'LR-100234',
        taxableAmount: 50000.0,
        cgstAmount: 3000.0,
        sgstAmount: 3000.0,
        igstAmount: 0.0,
        totalAmount: 56000.0,
        paidAmount: 0.0,
        balanceAmount: 56000.0,
        paymentMode: 4,
        paymentStatus: 1,
        createdAt: '2026-09-11T10:00:00Z',
        items: [
          InvoiceItemModel(
            id: 'item-1',
            invoiceId: 'inv-test-b2b',
            itemId: 'prod-1',
            itemName: 'Ceftriaxone 1g Injection',
            hsnCode: '3004',
            batchNumber: 'CEF-88',
            expiryDate: '11/27',
            quantity: 500.0,
            unitPrice: 100.0,
            taxableAmount: 50000.0,
            gstRate: 12.0,
            cgstAmount: 3000.0,
            sgstAmount: 3000.0,
            totalAmount: 56000.0,
          ),
        ],
      );

      final jsonString = EwayBillJsonHelper.generateEWayBillJson(
        invoice: invoice,
        storeName: 'Udyog Pharma Distributors',
        storeGstin: '09ABCDE1234F1Z5',
        storeAddress: 'Warehouse A, Industrial Area, Ghaziabad',
        storeCity: 'Ghaziabad',
        storePincode: '201001',
        storeStateCode: '09',
        transportDistanceKm: 120,
        vehicleNumber: 'UP78BT4567',
        transporterName: 'Express Cargo',
        transportDocNo: 'LR-100234',
      );

      expect(jsonString, isNotEmpty);
      final parsed = jsonDecode(jsonString) as Map<String, dynamic>;
      expect(parsed['version'], '1.0.03');
      final bills = parsed['billLists'] as List;
      expect(bills.length, 1);

      final bill = bills.first as Map<String, dynamic>;
      expect(bill['docType'], 'INV');
      expect(bill['docNo'], 'INV-2627-0089');
      expect(bill['supplyType'], 'O');
      expect(bill['fromGstin'], '09ABCDE1234F1Z5');
      expect(bill['toGstin'], '09AAACH7409R1ZZ');
      expect(bill['totalValue'], 50000.0);
      expect(bill['totInvValue'], 56000.0);
      expect(bill['transDistance'], 120);
      expect(bill['vehNo'], 'UP78BT4567');
      expect(bill['transporterName'], 'Express Cargo');
      expect(bill['itemList'].length, 1);
      expect(bill['itemList'][0]['productName'], 'Ceftriaxone 1g Injection');
      expect(bill['itemList'][0]['hsnCode'], 3004);
    });

    test('EwayBillJsonHelper generates valid NIC / IRP E-Invoice JSON', () {
      final invoice = InvoiceModel(
        id: 'inv-test-irp',
        tenantId: 'tenant-001',
        invoiceNumber: 'INV-2627-0090',
        invoiceDate: '2026-09-11',
        partyName: 'Gupta Healthcare',
        partyGstin: '09AABCG1234H1Z1',
        taxableAmount: 10000.0,
        cgstAmount: 600.0,
        sgstAmount: 600.0,
        igstAmount: 0.0,
        totalAmount: 11200.0,
        paidAmount: 11200.0,
        balanceAmount: 0.0,
        paymentMode: 2,
        paymentStatus: 3,
        createdAt: '2026-09-11T10:00:00Z',
        items: [
          InvoiceItemModel(
            id: 'it-1',
            invoiceId: 'inv-test-irp',
            itemId: 'p-1',
            itemName: 'Pantoprazole 40mg',
            hsnCode: '3004',
            quantity: 100.0,
            unitPrice: 100.0,
            taxableAmount: 10000.0,
            gstRate: 12.0,
            cgstAmount: 600.0,
            sgstAmount: 600.0,
            totalAmount: 11200.0,
          ),
        ],
      );

      final jsonStr = EwayBillJsonHelper.generateEInvoiceJson(
        invoice: invoice,
        storeName: 'Udyog Pharma',
        storeGstin: '09ABCDE1234F1Z5',
        storeAddress: 'Warehouse A',
        storeCity: 'Ghaziabad',
        storePincode: '201001',
        storeStateCode: '09',
      );

      expect(jsonStr, isNotEmpty);
      final parsed = jsonDecode(jsonStr) as Map<String, dynamic>;
      expect(parsed['Version'], '1.1');
      expect(parsed['TranDtls']['SupTyp'], 'B2B');
      expect(parsed['DocDtls']['No'], 'INV-2627-0090');
      expect(parsed['ValDtls']['AssVal'], 10000.0);
      expect(parsed['ValDtls']['TotInvVal'], 11200.0);
    });
  });
}
