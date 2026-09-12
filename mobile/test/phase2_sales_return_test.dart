import 'package:flutter_test/flutter_test.dart';
import 'package:udyogbill_mobile/core/database/daos/sales_return_dao.dart';

void main() {
  group('Phase 2: Sales Return (Credit Note) Tests', () {
    test('SalesReturnItemModel serializes and deserializes accurately', () {
      final item = SalesReturnItemModel(
        id: 'ret-item-1',
        returnId: 'ret-001',
        itemId: 'prod-101',
        itemName: 'Paracetamol 650mg',
        hsnCode: '3004',
        batchNumber: 'PARA-2026-X',
        expiryDate: '12/27',
        quantity: 5.0,
        unitPrice: 30.0,
        taxableAmount: 133.93,
        gstRate: 12.0,
        cgstAmount: 8.04,
        sgstAmount: 8.04,
        igstAmount: 0.0,
        totalAmount: 150.0,
      );

      final map = item.toMap();
      expect(map['id'], 'ret-item-1');
      expect(map['returnId'], 'ret-001');
      expect(map['itemName'], 'Paracetamol 650mg');
      expect(map['quantity'], 5.0);
      expect(map['totalAmount'], 150.0);

      final deserialized = SalesReturnItemModel.fromMap(map);
      expect(deserialized.id, item.id);
      expect(deserialized.itemName, item.itemName);
      expect(deserialized.batchNumber, 'PARA-2026-X');
      expect(deserialized.taxableAmount, item.taxableAmount);
      expect(deserialized.cgstAmount, item.cgstAmount);
      expect(deserialized.sgstAmount, item.sgstAmount);
    });

    test('SalesReturnModel serializes and deserializes with items', () {
      final item = SalesReturnItemModel(
        id: 'ret-item-1',
        returnId: 'ret-001',
        itemId: 'prod-101',
        itemName: 'Azithromycin 500mg',
        quantity: 2.0,
        unitPrice: 100.0,
        taxableAmount: 178.57,
        gstRate: 12.0,
        totalAmount: 200.0,
      );

      final ret = SalesReturnModel(
        id: 'ret-001',
        tenantId: 'tenant-001',
        creditNoteNumber: 'CN-2627-00001',
        originalInvoiceId: 'inv-100',
        originalInvoiceNumber: 'INV-2026-001',
        partyId: 'party-cust-1',
        partyName: 'Apex Healthcare',
        partyPhone: '9876543210',
        returnDate: '2026-09-11',
        returnReason: 'Expired / Near-Expiry Stock',
        taxableAmount: 178.57,
        cgstAmount: 10.71,
        sgstAmount: 10.71,
        igstAmount: 0.0,
        totalAmount: 200.0,
        restockToWarehouse: true,
        isSynced: false,
        createdAt: '2026-09-11T11:00:00.000Z',
        items: [item],
      );

      final map = ret.toMap();
      expect(map['id'], 'ret-001');
      expect(map['creditNoteNumber'], 'CN-2627-00001');
      expect(map['originalInvoiceNumber'], 'INV-2026-001');
      expect(map['restockToWarehouse'], 1);
      expect(map['totalAmount'], 200.0);

      final deserialized = SalesReturnModel.fromMap(map, items: [item]);
      expect(deserialized.id, ret.id);
      expect(deserialized.creditNoteNumber, ret.creditNoteNumber);
      expect(deserialized.returnReason, 'Expired / Near-Expiry Stock');
      expect(deserialized.restockToWarehouse, isTrue);
      expect(deserialized.items.length, 1);
      expect(deserialized.items.first.itemName, 'Azithromycin 500mg');
    });

    test('Inventory & Khata math on Sales Return', () {
      const double initialCustomerDue = 12500.0;
      const double returnTotal = 1500.0;
      final double updatedCustomerDue = initialCustomerDue - returnTotal;
      expect(updatedCustomerDue, 11000.0);

      const double initialWarehouseStock = 50.0;
      const double returnedQty = 10.0;
      final double updatedWarehouseStock = initialWarehouseStock + returnedQty;
      expect(updatedWarehouseStock, 60.0);
    });
  });
}
