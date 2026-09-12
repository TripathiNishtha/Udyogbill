/// Pharma & B2B GST Pricing Calculator
/// Implements standard Marg ERP DPCO Reverse Pharma Pricing Formula (MRP -> PTR -> PTS)
class PharmaRates {
  final double ptr; // Price to Retailer
  final double pts; // Price to Stockist

  const PharmaRates({required this.ptr, required this.pts});
}

class PharmaPricingCalculator {
  /// Reverse calculates PTR & PTS from MRP & GST Rate using standard pharmaceutical margins
  /// Retailer margin is standard 20%, Stockist margin is standard 10%
  static PharmaRates calculateMargRates({
    required double mrp,
    required double gstRate,
    double retailerMarginPercent = 20.0,
    double stockistMarginPercent = 10.0,
  }) {
    if (mrp <= 0) {
      return const PharmaRates(ptr: 0.0, pts: 0.0);
    }

    final gstFactor = 1.0 + (gstRate / 100.0);
    // PTR = (MRP * (1 - Retailer Margin %)) / (1 + GST Rate / 100)
    final ptrRaw = (mrp * (1.0 - retailerMarginPercent / 100.0)) / gstFactor;
    final ptr = double.parse(ptrRaw.toStringAsFixed(2));

    // PTS = PTR * (1 - Stockist Margin %)
    final ptsRaw = ptr * (1.0 - stockistMarginPercent / 100.0);
    final pts = double.parse(ptsRaw.toStringAsFixed(2));

    return PharmaRates(ptr: ptr, pts: pts);
  }

  /// Determines if a transaction is Inter-State (IGST) or Intra-State (CGST + SGST)
  static bool isInterState({
    required String? sellerStateCode,
    required String? buyerPosCode,
  }) {
    if (sellerStateCode == null || buyerPosCode == null) return false;
    final sCode = sellerStateCode.trim().padLeft(2, '0');
    final bCode = buyerPosCode.trim().padLeft(2, '0');
    if (sCode.isEmpty || bCode.isEmpty) return false;
    return sCode != bCode;
  }

  /// Calculates tax amounts based on taxable amount, GST rate, and supply type
  static Map<String, double> computeTaxBreakup({
    required double taxableAmount,
    required double gstRate,
    required bool isInterState,
  }) {
    final totalTax = taxableAmount * (gstRate / 100.0);
    if (isInterState) {
      return {
        'cgst': 0.0,
        'sgst': 0.0,
        'igst': double.parse(totalTax.toStringAsFixed(2)),
        'totalTax': double.parse(totalTax.toStringAsFixed(2)),
      };
    } else {
      final halfTax = totalTax / 2.0;
      final cgst = double.parse(halfTax.toStringAsFixed(2));
      final sgst = double.parse(halfTax.toStringAsFixed(2));
      return {
        'cgst': cgst,
        'sgst': sgst,
        'igst': 0.0,
        'totalTax': double.parse((cgst + sgst).toStringAsFixed(2)),
      };
    }
  }
}
