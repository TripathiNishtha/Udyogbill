import 'package:flutter_test/flutter_test.dart';
import 'package:udyogbill_mobile/core/utils/indian_states.dart';
import 'package:udyogbill_mobile/core/utils/pharma_pricing_calculator.dart';
import 'package:udyogbill_mobile/core/database/daos/invoice_dao.dart';

void main() {
  group('B2B GST & Place of Supply Tests', () {
    test('IndianStatesMaster extracts state from GSTIN prefix', () {
      final upState = IndianStatesMaster.getStateByGstin('09AABCU9603R1ZM');
      expect(upState, isNotNull);
      expect(upState!.code, '09');
      expect(upState.name, 'Uttar Pradesh');

      final mhState = IndianStatesMaster.getStateByGstin('27AAACW1234A1Z5');
      expect(mhState, isNotNull);
      expect(mhState!.code, '27');
      expect(mhState.name, 'Maharashtra');
    });

    test('isInterState correctly detects Intra vs Inter state supply', () {
      // Intra-state (UP to UP)
      expect(
        PharmaPricingCalculator.isInterState(
          sellerStateCode: '09',
          buyerPosCode: '09',
        ),
        isFalse,
      );

      // Inter-state (UP to Maharashtra)
      expect(
        PharmaPricingCalculator.isInterState(
          sellerStateCode: '09',
          buyerPosCode: '27',
        ),
        isTrue,
      );
    });

    test('Tax breakup calculates CGST/SGST for Intra and IGST for Inter-state', () {
      // Intra-State 18% on 1000
      final intraTax = PharmaPricingCalculator.computeTaxBreakup(
        taxableAmount: 1000.0,
        gstRate: 18.0,
        isInterState: false,
      );
      expect(intraTax['cgst'], 90.0);
      expect(intraTax['sgst'], 90.0);
      expect(intraTax['igst'], 0.0);
      expect(intraTax['totalTax'], 180.0);

      // Inter-State 18% on 1000
      final interTax = PharmaPricingCalculator.computeTaxBreakup(
        taxableAmount: 1000.0,
        gstRate: 18.0,
        isInterState: true,
      );
      expect(interTax['cgst'], 0.0);
      expect(interTax['sgst'], 0.0);
      expect(interTax['igst'], 180.0);
      expect(interTax['totalTax'], 180.0);
    });
  });

  group('Pharma Marg DPCO Pricing Tests', () {
    test('Marg ERP reverse formula calculates PTR and PTS correctly from MRP', () {
      // MRP = 100.0, GST = 12%
      // Retailer margin = 20% -> 100 * 0.80 = 80.0
      // 80.0 / 1.12 = 71.43 (PTR)
      // Stockist margin = 10% -> 71.43 * 0.90 = 64.29 (PTS)
      final rates = PharmaPricingCalculator.calculateMargRates(
        mrp: 100.0,
        gstRate: 12.0,
      );

      expect(rates.ptr, closeTo(71.43, 0.05));
      expect(rates.pts, closeTo(64.29, 0.05));
    });
  });

  group('InvoiceItemModel Serialization & B2B Fields', () {
    test('InvoiceItemModel serializes and deserializes all B2B/Pharma fields', () {
      final item = InvoiceItemModel(
        id: 'item-1',
        invoiceId: 'inv-1',
        itemId: 'prod-101',
        itemName: 'Amoxicillin 500mg',
        hsnCode: '3004',
        batchNumber: 'BATCH-2026-01',
        expiryDate: '08/28',
        quantity: 10.0,
        freeQuantity: 2.0,
        unitPrice: 71.43,
        mrp: 100.0,
        ptr: 71.43,
        pts: 64.29,
        discountPercent: 5.0,
        schemeDiscountPercent: 2.0,
        taxableAmount: 664.30,
        gstRate: 12.0,
        cgstAmount: 39.86,
        sgstAmount: 39.86,
        igstAmount: 0.0,
        totalAmount: 744.02,
      );

      final map = item.toMap();
      expect(map['freeQuantity'], 2.0);
      expect(map['ptr'], 71.43);
      expect(map['pts'], 64.29);
      expect(map['batchNumber'], 'BATCH-2026-01');
      expect(map['expiryDate'], '08/28');
      expect(map['hsnCode'], '3004');

      final reconstructed = InvoiceItemModel.fromMap(map);
      expect(reconstructed.freeQuantity, 2.0);
      expect(reconstructed.ptr, 71.43);
      expect(reconstructed.pts, 64.29);
      expect(reconstructed.batchNumber, 'BATCH-2026-01');
      expect(reconstructed.expiryDate, '08/28');
      expect(reconstructed.hsnCode, '3004');
    });
  });
}
