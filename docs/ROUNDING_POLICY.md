# UDYOGBILL ENTERPRISE ROUNDING POLICY
**Standard:** RBI / GST Commercial Rounding Standard  

1. **INTERNAL CALCULATION PRECISION:**
   - Unit prices, discount factors, conversion ratios, and effective tax rates are maintained at **4 to 6 decimal places** in memory during processing.
   - Intermediate floating point values must NEVER be used; all computations use System.Decimal (128-bit high-precision fixed point).

2. **LINE-LEVEL PRECISION:**
   - Line Taxable Amount: 4 decimals internally, formatted to 2 decimals on display.
   - Line CGST / SGST / IGST: 4 decimals internally, formatted to 2 decimals on display.
   - Line Total Amount: 2 decimals, rounded using MidpointRounding.AwayFromZero (Half-Up).

3. **INVOICE-LEVEL ROUND-OFF (COMMERCIAL SETTLEMENT):**
   - Invoices are rounded to the nearest whole integer (₹1.00) using Math.Round(unroundedTotal, 0, MidpointRounding.AwayFromZero).
   - RoundOff = RoundedTotal - UnroundedTotal (Range: -₹0.50 to +₹0.49).
   - RoundOff is explicitly booked to General Ledger Account ACC-ROUNDOFF (Indirect Expense / Other Income).

4. **REPORTS & LEDGERS:**
   - Running balances in customer and supplier ledgers are maintained strictly at 2 decimal places to prevent sub-paisa drift.
