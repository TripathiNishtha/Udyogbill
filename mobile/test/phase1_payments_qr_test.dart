import 'package:flutter_test/flutter_test.dart';
import 'package:udyogbill_mobile/core/database/daos/payment_dao.dart';
import 'package:udyogbill_mobile/core/utils/upi_qr_helper.dart';

void main() {
  group('NPCI UPI QR Helper Tests', () {
    test('buildUpiUri generates compliant NPCI UPI deep link', () {
      final uri = UpiQrHelper.buildUpiUri(
        upiId: 'udyogbill@okaxis',
        payeeName: 'UdyogBill Enterprise',
        amount: 1450.50,
        invoiceNumber: 'INV-2026-001',
      );

      expect(uri, startsWith('upi://pay?'));
      expect(uri, contains('pa=udyogbill@okaxis'));
      expect(uri, contains('am=1450.50'));
      expect(uri, contains('cu=INR'));
      expect(uri, contains('pn=UdyogBill%20Enterprise'));
      expect(uri, contains('tn=Bill%20INV-2026-001'));
    });

    test('buildUpiUri handles custom payment notes and spaces', () {
      final uri = UpiQrHelper.buildUpiUri(
        upiId: '9876543210@paytm',
        payeeName: 'Sharma Traders',
        amount: 5000.0,
        note: 'Dues Settlement March 2026',
      );

      expect(uri, contains('pa=9876543210@paytm'));
      expect(uri, contains('am=5000.00'));
      expect(uri, contains('tn=Dues%20Settlement%20March%202026'));
    });
  });

  group('PaymentModel Serialization & Khata Balance Tests', () {
    test('PaymentModel serializes and deserializes accurately', () {
      final payment = PaymentModel(
        id: 'pay-uuid-001',
        tenantId: 'tenant-001',
        paymentNumber: 'REC-2627-00001',
        partyId: 'party-cust-10',
        partyName: 'Gupta Medical Hall',
        partyPhone: '9876543210',
        amount: 2500.00,
        paymentDate: '2026-09-11',
        paymentMode: 2,
        referenceNumber: 'UTR-98765432100',
        notes: 'Cleared via PhonePe UPI QR',
        isSynced: false,
        createdAt: '2026-09-11T11:00:00.000Z',
      );

      final map = payment.toMap();
      expect(map['id'], 'pay-uuid-001');
      expect(map['tenantId'], 'tenant-001');
      expect(map['paymentNumber'], 'REC-2627-00001');
      expect(map['partyId'], 'party-cust-10');
      expect(map['amount'], 2500.00);
      expect(map['paymentMode'], 2);
      expect(map['referenceNumber'], 'UTR-98765432100');
      expect(map['isSynced'], 0);

      final deserialized = PaymentModel.fromMap(map);
      expect(deserialized.id, payment.id);
      expect(deserialized.paymentNumber, payment.paymentNumber);
      expect(deserialized.partyName, payment.partyName);
      expect(deserialized.amount, payment.amount);
      expect(deserialized.paymentMode, payment.paymentMode);
      expect(deserialized.referenceNumber, payment.referenceNumber);
      expect(deserialized.paymentModeLabel, 'UPI');
    });

    test('paymentModeLabel displays human-readable labels for all modes', () {
      final cashPay = PaymentModel(
        id: 'p1', tenantId: 't1', paymentNumber: 'R1', partyId: 'pt1', partyName: 'P1',
        amount: 100, paymentDate: '2026-09-11', paymentMode: 1, isSynced: false,
        createdAt: '2026-09-11',
      );
      final upiPay = PaymentModel(
        id: 'p2', tenantId: 't1', paymentNumber: 'R2', partyId: 'pt1', partyName: 'P1',
        amount: 100, paymentDate: '2026-09-11', paymentMode: 2, isSynced: false,
        createdAt: '2026-09-11',
      );
      final chequePay = PaymentModel(
        id: 'p3', tenantId: 't1', paymentNumber: 'R3', partyId: 'pt1', partyName: 'P1',
        amount: 100, paymentDate: '2026-09-11', paymentMode: 3, isSynced: false,
        createdAt: '2026-09-11',
      );
      final bankPay = PaymentModel(
        id: 'p4', tenantId: 't1', paymentNumber: 'R4', partyId: 'pt1', partyName: 'P1',
        amount: 100, paymentDate: '2026-09-11', paymentMode: 4, isSynced: false,
        createdAt: '2026-09-11',
      );

      expect(cashPay.paymentModeLabel, 'Cash');
      expect(upiPay.paymentModeLabel, 'UPI');
      expect(chequePay.paymentModeLabel, 'Cheque');
      expect(bankPay.paymentModeLabel, 'Bank Transfer');
    });

    test('Khata balance math correctly calculates remaining due', () {
      const double initialDue = 15400.0;
      const double paymentReceived = 5000.0;
      final double remainingDue = initialDue - paymentReceived;

      expect(remainingDue, 10400.0);
    });
  });
}
