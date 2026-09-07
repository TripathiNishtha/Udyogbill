class GstCalculationResult {
  final double taxableAmount;
  final double cgstAmount;
  final double sgstAmount;
  final double igstAmount;
  final double totalGst;
  final double totalAmount;

  GstCalculationResult({
    required this.taxableAmount,
    required this.cgstAmount,
    required this.sgstAmount,
    required this.igstAmount,
    required this.totalGst,
    required this.totalAmount,
  });
}

class GstCalculator {
  /// Matches UdyogBill .NET backend GST calculation logic precisely.
  /// isIntraState = true for Same State (CGST + SGST)
  /// isIntraState = false for Interstate (IGST)
  static GstCalculationResult calculateLineItem({
    required double quantity,
    required double unitPrice,
    required double discountPercent,
    required double gstRatePercent,
    required bool isIntraState,
  }) {
    // 1. Gross amount
    final double gross = quantity * unitPrice;

    // 2. Discount
    final double discount = (gross * discountPercent) / 100.0;
    final double taxable = gross - discount;

    // 3. Tax computation
    final double totalTax = (taxable * gstRatePercent) / 100.0;

    double cgst = 0.0;
    double sgst = 0.0;
    double igst = 0.0;

    if (isIntraState) {
      cgst = totalTax / 2.0;
      sgst = totalTax / 2.0;
    } else {
      igst = totalTax;
    }

    final double total = taxable + totalTax;

    return GstCalculationResult(
      taxableAmount: double.parse(taxable.toStringAsFixed(2)),
      cgstAmount: double.parse(cgst.toStringAsFixed(2)),
      sgstAmount: double.parse(sgst.toStringAsFixed(2)),
      igstAmount: double.parse(igst.toStringAsFixed(2)),
      totalGst: double.parse(totalTax.toStringAsFixed(2)),
      totalAmount: double.parse(total.toStringAsFixed(2)),
    );
  }
}
