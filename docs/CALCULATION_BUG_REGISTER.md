# UDYOGBILL FORENSIC CALCULATION BUG REGISTER
**Standard:** Ind AS, CGST Act 2017, Indian Contract Act 1872  
**Audit Stage:** Phase 42 (Pre-Remediation Register)  
**Strict Rule:** No business logic modification until audit sign-off.

---

## REGISTER OVERVIEW

| Bug ID | Severity | Module | Summary Description | Status | Verified Test |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **BUG-001** | **P0 Critical** | Sales & Stock | FreeQuantity physically delivered but stock deducted only for Paid Qty | **RESOLVED & VERIFIED** | Golden Test 04 |
| **BUG-002** | **P0 Critical** | Sales & GST | IsTaxInclusive catalog flag bypassed; tax compounded on top of retail MRP | **RESOLVED & VERIFIED** | Golden Test 02, 06 |
| **BUG-003** | **P0 Critical** | Sales & GST | Invoice discount reduces taxable total but line GST is never adjusted | **RESOLVED & VERIFIED** | Golden Test 08, 10 |
| **BUG-004** | **P0 Critical** | Sales & Inventory | Unit conversion ratio ignored during sales stock deduction | **RESOLVED & VERIFIED** | Golden Test 05, 25 |
| **BUG-005** | **P0 Critical** | POS & Debtors | POS flat rupee discount omitted from API request, creating phantom customer debt | **RESOLVED & VERIFIED** | Golden Test 09 |
| **BUG-006** | **P0 Critical** | Purchases & Stock | Direct purchase bills without GRN never inward stock to warehouse | **RESOLVED & VERIFIED** | Golden Test 14, 15 |
| **BUG-007** | **P0 Critical** | Purchases & Stock | Purchase return ignores BatchId and records double-deduction in audit trail | **RESOLVED & VERIFIED** | Golden Test 16, 17 |
| **BUG-008** | **P0 Critical** | Sales & Debtors | Cancel invoice credits full total to ledger while adjusting balance only by unpaid portion | **RESOLVED & VERIFIED** | Golden Test 20, 21 |
| **BUG-009** | **P1 High** | Reports & P&L | Gross profit calculated as Sales - Purchases instead of Sales - COGS | **RESOLVED & VERIFIED** | Golden Test 30 |
| **BUG-010** | **P1 High** | Returns & Sales | Sales return reimburses at full list price ignoring scheme/free qty effective rate | **RESOLVED & VERIFIED** | Golden Test 19 |

---

## FORENSIC DEFECT SHEETS

### BUG-001: Free Quantity Physical Stock Deduction Omission
* **Bug ID:** BUG-001
* **Severity:** **P0 Critical**
* **Module:** Sales & Inventory
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\SalesService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.SalesService
* **Exact Method:** CreateInvoiceAsync
* **Exact Line/Range:** Lines 468–504
* **Formula:**
  * Current: Deduction = reqItem.Quantity
  * Expected: Deduction = reqItem.Quantity + reqItem.FreeQuantity
* **Example Input:**
  * Customer buys 10 units + 2 Free units (Quantity = 10, FreeQuantity = 2).
  * Warehouse stock before sale = 50 units.
* **Actual Current Output:**
  * Stock deducted: 10 units.
  * Warehouse stock after sale = 40 units.
* **Expected Output:**
  * Stock deducted: 12 units.
  * Warehouse stock after sale = 38 units.
* **Root Cause:** Line 483 executes stock.CurrentQuantity -= reqItem.Quantity; and line 493 logs movement.Quantity = -reqItem.Quantity;. eqItem.FreeQuantity is serialized into AttributesJson for printing only, without mutating physical stock.
* **Downstream Modules Affected:** Warehouse stock, batch stock, physical audits, inventory valuation, cost of goods sold, balance sheet.
* **Historical Data Affected:** YES. Any past invoice with free quantity has ghost stock remaining in the warehouse.
* **Requires Data Migration:** YES. SQL script to identify past invoices with reeQuantity in AttributesJson and issue a reconciling stock adjustment.
* **Regression Risk:** Low (Stock deduction logic is self-contained).
* **Recommended Fix:** Change deduction to eqItem.Quantity + reqItem.FreeQuantity for both ItemWarehouseStock and StockMovement.
* **Required Regression Tests:** SalesInvoiceCalculationTests.Buy10Get2Free_Deducts12UnitsFromStock.

---

### BUG-002: Tax-Inclusive Pricing Reverse Calculation Bypass
* **Bug ID:** BUG-002
* **Severity:** **P0 Critical**
* **Module:** Sales & GST
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\SalesService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.SalesService
* **Exact Method:** CreateInvoiceAsync
* **Exact Line/Range:** Lines 506–531
* **Formula:**
  * Current: Taxable = Gross - Discount, GST = Taxable * Rate
  * Expected: Taxable = (Gross - Discount) / (1 + Rate), GST = Gross - Discount - Taxable
* **Example Input:**
  * Item MRP = ₹118.00 (Tax Inclusive = True, GST Rate = 18%).
  * Quantity = 1.
* **Actual Current Output:**
  * Taxable = ₹118.00.
  * GST (18%) = ₹21.24.
  * Invoice Line Total = ₹139.24.
* **Expected Output:**
  * Taxable = ₹100.00.
  * GST (18%) = ₹18.00.
  * Invoice Line Total = ₹118.00.
* **Root Cause:** SalesService treats all prices as tax-exclusive, disregarding item.IsTaxInclusive.
* **Downstream Modules Affected:** Statutory GST liabilities, invoice totals, customer charges, GSTR-1, GSTR-3B.
* **Historical Data Affected:** YES, if any tenant created tax-inclusive items.
* **Requires Data Migration:** NO (Tenant data so far was billed with exclusive prices or pharma MRP with net rate).
* **Regression Risk:** Medium (Must ensure tax-exclusive items remain unaffected).
* **Recommended Fix:** Check item.IsTaxInclusive; if true, extract taxable amount via division by (1 + (taxRate / 100)).
* **Required Regression Tests:** SalesInvoiceCalculationTests.TaxInclusive_ExtractsCorrectTaxableAndGst.

---

### BUG-003: Invoice-Level Discount GST Re-adjustment Omission
* **Bug ID:** BUG-003
* **Severity:** **P0 Critical**
* **Module:** Sales & Statutory GST
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\SalesService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.SalesService
* **Exact Method:** CreateInvoiceAsync
* **Exact Line/Range:** Lines 604–610
* **Formula:**
  * Current: Invoice.TaxableAmount -= invDiscountAmount; Invoice.TaxAmount unchanged;
  * Expected: LineTaxable = LineTaxable - LineAllocatedDiscount; LineGst = LineTaxable * GstRate;
* **Example Input:**
  * Item 1: Taxable ₹1,000, 18% GST (Tax ₹180).
  * Invoice Discount = 10% (₹100).
* **Actual Current Output:**
  * Post-Discount Taxable = ₹900.
  * Tax charged = ₹180 (Calculated on ₹1,000).
  * Total = ₹1,080.
* **Expected Output:**
  * Post-Discount Taxable = ₹900.
  * Tax charged = ₹162 (18% on ₹900 per Sec 15(3)(b) CGST Act).
  * Total = ₹1,062.
* **Root Cause:** Line taxes are aggregated in the item loop before invoice discount is evaluated. When invoice discount is subtracted from total taxable, line and header GST are not recomputed.
* **Downstream Modules Affected:** GSTR-1, GSTR-3B, Tax Invoice compliance, General Ledger tax accounts.
* **Historical Data Affected:** NO (Invoices created so far used 0% invoice discount).
* **Requires Data Migration:** NO.
* **Regression Risk:** Medium (Requires two-pass or post-allocation calculation).
* **Recommended Fix:** Proportionally distribute invoice discount across lines, recompute line taxable and line GST, then sum.
* **Required Regression Tests:** SalesInvoiceCalculationTests.InvoiceDiscount_RecalculatesGstProportionately.

---

### BUG-004: Unit Conversion Ratio Bypass in Sales Stock Deduction
* **Bug ID:** BUG-004
* **Severity:** **P0 Critical**
* **Module:** Sales & Inventory
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\SalesService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.SalesService
* **Exact Method:** CreateInvoiceAsync
* **Exact Line/Range:** Line 483
* **Formula:**
  * Current: Deduction = reqItem.Quantity
  * Expected: Deduction = reqItem.Quantity * (item.ConversionRatio ?? 1m)
* **Example Input:**
  * Item: Paracetamol Tablets (Base UOM = TAB).
  * Secondary UOM = BOX (ConversionRatio = 100 Tabs/Box).
  * Sale = 2 Boxes.
* **Actual Current Output:**
  * Deducts 2 units from warehouse stock.
* **Expected Output:**
  * Deducts 200 units from warehouse stock.
* **Root Cause:** ConversionRatio is defined on Item entity, but SalesService deducts raw eqItem.Quantity without checking whether eqItem.UomId == item.SecondaryUomId.
* **Downstream Modules Affected:** Warehouse stock, stock valuation, physical count.
* **Historical Data Affected:** NO (Current tenant items all use primary UOM).
* **Requires Data Migration:** NO.
* **Regression Risk:** Low.
* **Recommended Fix:** If eqItem.UomId == item.SecondaryUomId, multiply quantity by item.ConversionRatio.
* **Required Regression Tests:** SalesInvoiceCalculationTests.SecondaryUomSale_ConvertsToBaseStockUnits.

---

### BUG-005: POS Flat Rupee Bill Discount Omission in API Request
* **Bug ID:** BUG-005
* **Severity:** **P0 Critical**
* **Module:** POS & Customer Ledger
* **Exact File Path:** e:\udyogbillnew\frontend\src\app\(tenant)\app\pos\page.tsx
* **Exact Method:** Checkout handler
* **Exact Line/Range:** Lines 398–401, 650
* **Formula:**
  * Current: invoiceDiscountPercent: billDiscountType === "percent" ? billDiscountValue : 0
  * Expected: Send both invoiceDiscountPercent and invoiceDiscountAmount.
* **Example Input:**
  * Cart Subtotal = ₹500. Cashier applies flat ₹50 discount.
* **Actual Current Output:**
  * Frontend charges customer ₹450.
  * API receives invoiceDiscountPercent = 0. Backend computes total as ₹500.
  * Invoice is marked PartiallyPaid (Paid ₹450, Balance ₹50). Customer ledger records ₹50 unpaid debt.
* **Expected Output:**
  * Backend receives ₹50 discount, computes net invoice as ₹450, marks as FullyPaid, and customer balance is zero.
* **Root Cause:** Frontend omits flat discount when illDiscountType === "fixed".
* **Downstream Modules Affected:** Customer ledger, outstanding balances, sales registers, cashier cash reconciliation.
* **Historical Data Affected:** NO.
* **Requires Data Migration:** NO.
* **Regression Risk:** Low.
* **Recommended Fix:** Update backend DTO and frontend payload to pass InvoiceDiscountAmount.
* **Required Regression Tests:** PosBillingTests.FlatRupeeDiscount_ReconcilesWithBackendTotal.

---

### BUG-006: Direct Purchase Bill Stock Inward Omission
* **Bug ID:** BUG-006
* **Severity:** **P0 Critical**
* **Module:** Purchases & Stock
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\PurchaseService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.PurchaseService
* **Exact Method:** CreatePurchaseBillAsync
* **Exact Line/Range:** Lines 1251–1442
* **Formula:**
  * Current: Stock inward happens ONLY on GRN (CreateGoodsReceiptNoteAsync).
  * Expected: If GoodsReceiptNoteId == null, direct purchase bill must inward stock.
* **Example Input:**
  * Retail merchant enters vendor purchase bill for 100 units directly.
* **Actual Current Output:**
  * Bill created, Supplier Ledger credited, GL posted, but warehouse stock remains 0.
* **Expected Output:**
  * Warehouse stock increases by 100 units, and StockMovementType.PurchaseInward is logged.
* **Root Cause:** ERP separated GRN from Bill, but for SMEs and retail billing, direct purchase billing without a separate GRN is standard. No fallback stock inward was added to CreatePurchaseBillAsync.
* **Downstream Modules Affected:** Stock balance, inventory valuation, out-of-stock billing.
* **Historical Data Affected:** YES (Any direct bill entered had no stock added).
* **Requires Data Migration:** Script to inward stock for historical direct purchase bills.
* **Regression Risk:** Medium (Must avoid double-inwarding if GRN was already used).
* **Recommended Fix:** If ill.GoodsReceiptNoteId == null, iterate items and replenish warehouse stock and log stock movement.
* **Required Regression Tests:** PurchaseCalculationTests.DirectPurchaseBill_InwardsStockWhenGrnNull.

---

### BUG-007: Purchase Return Batch Stock Depletion Mismatch & Audit Corruption
* **Bug ID:** BUG-007
* **Severity:** **P0 Critical**
* **Module:** Purchases & Stock
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\PurchaseService.cs
* **Exact Method:** CreatePurchaseReturnAsync
* **Exact Line/Range:** Lines 1781–1805
* **Formula:**
  * Current: Matches first warehouse stock without BatchId; subtracts quantity twice in StockMovement.
  * Expected: Match s.BatchId == line.BatchId, subtract once.
* **Root Cause:** Query omits s.BatchId == line.BatchId. Also line 1786 executes stock.CurrentQuantity -= line.ReturnQuantity, and line 1798 sets QuantityAfter = (stock?.CurrentQuantity ?? 0) - line.ReturnQuantity.
* **Downstream Modules Affected:** Batch tracking, FEFO, stock movement audit trail.
* **Historical Data Affected:** NO (No purchase returns logged yet).
* **Requires Data Migration:** NO.
* **Regression Risk:** Low.
* **Recommended Fix:** Filter stock query by BatchId, set QuantityAfter = stock.CurrentQuantity.
* **Required Regression Tests:** PurchaseCalculationTests.PurchaseReturn_DepletesCorrectBatchWithoutDoubleSubtraction.

---

### BUG-008: Invoice Cancellation Customer Ledger Desynchronization
* **Bug ID:** BUG-008
* **Severity:** **P0 Critical**
* **Module:** Sales & Debtors
* **Exact File Path:** e:\udyogbillnew\backend\src\UdyogBill.Persistence\Services\SalesService.cs
* **Exact Class/Service:** UdyogBill.Persistence.Services.SalesService
* **Exact Method:** CancelInvoiceAsync
* **Exact Line/Range:** Lines 1256–1274
* **Formula:**
  * Current: 
etAdjustment = -(TotalAmount - PaidAmount); party.CurrentOutstandingBalance += netAdjustment; PartyLedgerEntry.CreditAmount = TotalAmount;
  * Expected: PartyLedgerEntry.CreditAmount must match TotalAmount - PaidAmount.
* **Root Cause:** Hardcoded CreditAmount = invoice.TotalAmount instead of invoice.TotalAmount - invoice.PaidAmount.
* **Downstream Modules Affected:** Customer ledger report, debtor ageing, party balance audit.
* **Historical Data Affected:** YES, if any partially paid invoice was cancelled.
* **Requires Data Migration:** Audit query to verify and reconcile party ledger entries.
* **Regression Risk:** Low.
* **Recommended Fix:** Set CreditAmount = -(netAdjustment), and reverse GL journal entry.
* **Required Regression Tests:** SalesInvoiceCancellationTests.PartiallyPaidInvoiceCancellation_MaintainsLedgerParity.

---

### BUG-009: Gross Profit Calculation Methodological Conflict
* **Bug ID:** BUG-009
* **Severity:** **P1 High**
* **Module:** Reports & Profitability
* **Exact File Path:** ackend/src/UdyogBill.Persistence/Services/ReportService.cs (Lines 212, 497)
* **Exact Method:** GetProfitAndLossReportAsync, GetExecutiveKpisAsync
* **Formula:**
  * Current in ReportService: GrossProfit = NetSales - TotalPurchases
  * Current in P0ReportService: GrossProfit = NetSales - COGS
* **Expected Output:** Universal AS-2 compliance: GrossProfit = NetSales - COGS.
* **Root Cause:** Flawed shortcut formula Sales - Purchases used in legacy report service.
* **Downstream Modules Affected:** Profit & Loss Statement, Executive Dashboard.
* **Historical Data Affected:** NO (Calculated on the fly).
* **Requires Data Migration:** NO.
* **Regression Risk:** Low.
* **Recommended Fix:** Replace Sales - Purchases with Sales - COGS.
* **Required Regression Tests:** ReportCalculationTests.GrossProfit_MatchesCogsAcrossAllReportServices.

---

### BUG-010: Sales Return Pricing Ignores Net Effective Rate
* **Bug ID:** BUG-010
* **Severity:** **P1 High**
* **Module:** Sales & Returns
* **Exact File Path:** ackend/src/UdyogBill.Persistence/Services/SalesService.cs
* **Exact Method:** CreateSalesReturnAsync
* **Exact Line/Range:** Lines 1498–1517
* **Formula:**
  * Current: lineTaxable = line.ReturnQuantity * line.UnitPrice
  * Expected: Look up original sale item, compute EffectiveRate = TaxableAmount / (Quantity + FreeQuantity).
* **Root Cause:** Return handler blindly trusts client-provided UnitPrice without linking back to original invoice line net rate.
* **Downstream Modules Affected:** Credit Note value, customer refund, GST reversal.
* **Historical Data Affected:** NO.
* **Requires Data Migration:** NO.
* **Regression Risk:** Low.
* **Recommended Fix:** Implement net effective rate calculation when linked to OriginalSalesInvoiceId.
* **Required Regression Tests:** SalesReturnCalculationTests.SchemeReturn_RefundsAtNetEffectiveRate.
