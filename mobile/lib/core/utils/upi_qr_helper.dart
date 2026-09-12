/// Helper utility for NPCI UPI Dynamic QR Code generation
class UpiQrHelper {
  /// Builds standard NPCI UPI deep link URL
  /// Protocol: upi://pay?pa={upiId}&pn={payeeName}&am={amount}&tn={transactionNote}&cu=INR
  static String buildUpiUri({
    required String upiId,
    required String payeeName,
    required double amount,
    String? invoiceNumber,
    String? note,
  }) {
    final cleanUpi = upiId.trim();
    final cleanName = Uri.encodeComponent(payeeName.trim());
    final amountStr = amount.toStringAsFixed(2);
    final txnNote = Uri.encodeComponent(note ?? (invoiceNumber != null ? 'Bill $invoiceNumber' : 'Payment'));

    return 'upi://pay?pa=$cleanUpi&pn=$cleanName&am=$amountStr&tn=$txnNote&cu=INR';
  }
}
