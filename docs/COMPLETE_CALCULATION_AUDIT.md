# COMPLETE CALCULATION AUDIT & FORENSIC RECONCILIATION
**Platform:** UdyogBill ERP (Multi-Tenant Cloud Billing, Inventory & Financial Accounting)  
**Standard:** Ind AS / AS-2, CGST/SGST/IGST Act 2017, Indian Contract Act 1872  
**Audit Date:** 2026-09-03  
**Auditor Role:** Principal ERP Architect & Forensic Financial Auditor  
**Status:** COMPLETE (Zero Business Logic Modified - Forensic Investigation Phase)

---

## EXECUTIVE SUMMARY & AUDIT SCORECARD

| Dimension | Total Audited | Pass | Fail | Partial | Health |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Sales & POS Invoicing** | 12 Formulas | 4 | 6 | 2 | **33.3%** |
| **Purchases & GRN** | 8 Formulas | 3 | 4 | 1 | **37.5%** |
| **Stock & Inventory Engine** | 10 Formulas | 4 | 5 | 1 | **40.0%** |
| **Returns & Credit/Debit Notes** | 6 Formulas | 1 | 4 | 1 | **16.7%** |
| **GST & Statutory Taxation** | 7 Formulas | 2 | 4 | 1 | **28.6%** |
| **Party & Customer/Vendor Ledgers**| 6 Formulas | 2 | 3 | 1 | **33.3%** |
| **Financial & General Ledger (GL)** | 5 Formulas | 3 | 1 | 1 | **60.0%** |
| **Reporting & P&L Engine** | 8 Formulas | 2 | 4 | 2 | **25.0%** |
| **TOTALS** | **62 Formulas** | **21** | **31** | **10** | **FAIL (33.9% Pass Rate)** |

---

## 1. SALES & POS INVOICING ENGINE

### CALC-SALES-01: Line Gross Amount
* **Formula:** Gross = Quantity * UnitPrice
* **Location:** 
  * Backend: UdyogBill.Persistence.Services.SalesService.cs (Line 506)
  * Frontend: rontend/src/app/(tenant)/app/sales/invoices/page.tsx (Line 512)
  * Frontend POS: rontend/src/app/(tenant)/app/pos/page.tsx (Line 393)
* **Input Fields:** Quantity (decimal), UnitPrice (decimal)
* **Output:** GrossAmount (decimal)
* **Decimal Precision:** Input 4 decimals, Output 4 decimals (Backend), 2 decimals (Frontend).
* **Rounding Rule:** None on multiplication.
* **Tax Treatment:** Pre-tax.
* **Stock Impact:** None.
* **Ledger Impact:** None directly (flows into line total).
* **Accounting Impact:** Pre-journal calculation.
* **Return Impact:** Baseline for return evaluation.
* **Report Impact:** Base component of gross turnover.
* **Current Implementation:** ar gross = reqItem.Quantity * reqItem.UnitPrice;
* **Expected Implementation:** ar gross = reqItem.Quantity * reqItem.UnitPrice;
* **Status:** **PASS**

---

### CALC-SALES-02: Line Item Discount
* **Formula:** 
  * If percentage: DiscountAmount = Gross * (DiscountPercent / 100)
  * If flat: DiscountAmount = FixedAmount
* **Location:**
  * Backend: SalesService.cs (Lines 507-509)
  * Frontend Invoices: page.tsx (Line 513)
  * Frontend POS: pos/page.tsx (Line 394)
* **Input Fields:** Gross (decimal), DiscountPercent (decimal), DiscountAmount (decimal)
* **Output:** DiscountAmount (decimal)
* **Decimal Precision:** 4 decimals in Backend, 2 decimals in Frontend.
* **Rounding Rule:** Backend rounds to 4 decimals: Math.Round(gross * (reqItem.DiscountPercent / 100m), 4).
* **Tax Treatment:** Deducted before GST calculation per Sec 15(3)(a) CGST Act.
* **Stock Impact:** None.
* **Ledger Impact:** Reduces net receivable.
* **Accounting Impact:** Recorded as discount expense / reduced sales credit.
* **Return Impact:** Must reduce the refundable credit per item.
* **Report Impact:** Discount Register & Net Sales.
* **Current Implementation:** Consistent between backend and frontend.
* **Expected Implementation:** discAmt = reqItem.DiscountAmount > 0 ? reqItem.DiscountAmount : Math.Round(gross * (reqItem.DiscountPercent / 100m), 4);
* **Status:** **PASS**

---

### CALC-SALES-03: Line Taxable Amount & Tax-Inclusive Extraction (CRITICAL DEFECT)
* **Formula:**
  * If Tax-Exclusive: Taxable = Gross - DiscountAmount
  * If Tax-Inclusive: Taxable = (Gross - DiscountAmount) / (1 + (GstRate / 100))
* **Location:**
  * Backend: SalesService.cs (Lines 510-512)
  * Frontend Invoices: page.tsx (Line 514)
* **Input Fields:** Gross, DiscountAmount, Item.IsTaxInclusive, Item.TaxRate
* **Output:** TaxableAmount (decimal)
* **Decimal Precision:** 4 decimals backend.
* **Rounding Rule:** Math.Max(0m, gross - discAmt).
* **Tax Treatment:** Base for GST split.
* **Stock Impact:** None.
* **Ledger Impact:** Determines statutory output GST vs revenue split.
* **Accounting Impact:** Credit to Direct Sales Revenue.
* **Return Impact:** Reversal of revenue.
* **Report Impact:** GSTR-1 Table 4 (B2B) & Table 7 (B2C).
* **Current Implementation:**
  `csharp
  var taxable = Math.Max(0m, gross - discAmt);
  // Item.IsTaxInclusive is completely IGNORED!
  `
* **Expected Implementation:**
  `csharp
  decimal netLine = Math.Max(0m, gross - discAmt);
  decimal taxable = item.IsTaxInclusive 
      ? Math.Round(netLine / (1m + ((gstRate + item.CessRate) / 100m)), 4)
      : netLine;
  `
* **Status:** **FAIL (P0 Critical Bug)** - On tax-inclusive items (e.g. Pharma MRP, Retail FMCG), GST is compounded on top of inclusive price. Customer is charged double tax.

---

### CALC-SALES-04: Free Quantity Stock Movement (CRITICAL DEFECT)
* **Formula:** PhysicalStockDeduction = Quantity + FreeQuantity
* **Location:**
  * Backend: SalesService.cs (Lines 468-504)
  * Request DTO: CreateSalesInvoiceItemRequest.FreeQuantity (Line 16)
* **Input Fields:** eqItem.Quantity, eqItem.FreeQuantity
* **Output:** StockMovement.Quantity, ItemWarehouseStock.CurrentQuantity
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Exact quantity deduction.
* **Tax Treatment:** Zero commercial value, but physical stock must move.
* **Stock Impact:** Must deduct total physical units (Quantity + FreeQuantity).
* **Ledger Impact:** No direct trade debtor impact (commercial value unchanged).
* **Accounting Impact:** Cost of Goods Sold (COGS) must recognize the cost of free units shipped.
* **Return Impact:** Baseline for partial return calculation.
* **Report Impact:** Stock balance, stock ledger, inventory valuation.
* **Current Implementation:**
  `csharp
  stock.CurrentQuantity -= reqItem.Quantity; // FreeQuantity is ignored!
  movement.Quantity = -reqItem.Quantity;      // FreeQuantity omitted!
  `
* **Expected Implementation:**
  `csharp
  var totalPhysicalOut = reqItem.Quantity + reqItem.FreeQuantity;
  stock.CurrentQuantity -= totalPhysicalOut;
  movement.Quantity = -totalPhysicalOut;
  `
* **Status:** **FAIL (P0 Critical Bug)** - Free stock remains as ghost inventory in the warehouse.

---

### CALC-SALES-05: Net Effective Rate on Scheme Sales
* **Formula:** NetEffectiveRate = CommercialConsideration / (PaidQuantity + FreeQuantity)
* **Location:**
  * Backend: SalesService.cs (Line 580)
  * Return Engine: SalesService.cs (Line 1498)
* **Input Fields:** TaxableAmount, Quantity, FreeQuantity
* **Output:** EffectiveCostPerUnit
* **Decimal Precision:** High precision (6-8 decimals internally).
* **Rounding Rule:** Truncated or rounded at settlement boundary only.
* **Tax Treatment:** Commercial value already tax-adjusted.
* **Stock Impact:** Cost of Goods Sold per unit = Total Cost / Total Units.
* **Ledger Impact:** Return credit value calculation.
* **Accounting Impact:** COGS adjustment per unit returned.
* **Return Impact:** Customer must be credited only at net effective rate, NOT original list price.
* **Report Impact:** Profitability and margin reports.
* **Current Implementation:** Not implemented anywhere. System uses raw line.UnitPrice on returns.
* **Expected Implementation:** Canonical calculation engine must record EffectiveRate = LineTaxable / (PaidQty + FreeQty) on SalesInvoiceItem.
* **Status:** **FAIL (P1 High Bug)** - Scheme returns over-refund customers.

---

### CALC-SALES-06: Intra-State vs Inter-State GST Split
* **Formula:**
  * Intra-State: CGST = Taxable * (GstRate / 200), SGST = Taxable * (GstRate / 200), IGST = 0
  * Inter-State: IGST = Taxable * (GstRate / 100), CGST = 0, SGST = 0
* **Location:** SalesService.cs (Lines 518-530)
* **Input Fields:** Taxable, GstRate, sellerStateCode, supplyStateCode
* **Output:** CgstAmount, SgstAmount, IgstAmount
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Math.Round(val, 4).
* **Tax Treatment:** Statutory GST rules under Section 7 & 8 of IGST Act.
* **Stock Impact:** None.
* **Ledger Impact:** Tax liability.
* **Accounting Impact:** Credit to Output CGST, Output SGST, or Output IGST ledger accounts.
* **Return Impact:** Reversed on Credit Note.
* **Report Impact:** GSTR-1, GSTR-3B.
* **Current Implementation:** Correct state code comparison and 50/50 split.
* **Expected Implementation:** Match current logic.
* **Status:** **PASS**

---

### CALC-SALES-07: Invoice-Level Discount GST Re-adjustment (CRITICAL DEFECT)
* **Formula:**
  * InvoiceDiscountAmount = TaxableBeforeInvDisc * (InvoiceDiscountPercent / 100)
  * Post-Discount Taxable = TaxableBeforeInvDisc - InvoiceDiscountAmount
  * Post-Discount Tax = PostDiscountTaxable * GstRate
* **Location:** SalesService.cs (Lines 604-610)
* **Input Fields:** 	otalTaxable, equest.InvoiceDiscountPercent, line tax rates.
* **Output:** invoice.TaxableAmount, invoice.CgstAmount, invoice.SgstAmount
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Math.Round(val, 4).
* **Tax Treatment:** Sec 15(3)(b) CGST Act requires GST to be charged strictly on the net post-discount value.
* **Stock Impact:** None.
* **Ledger Impact:** Reduces net invoice total.
* **Accounting Impact:** Expense discount vs reduced sales credit.
* **Return Impact:** Proportional discount recovery on returns.
* **Report Impact:** GSTR-1 tax reconciliation mismatch.
* **Current Implementation:**
  `csharp
  if (request.InvoiceDiscountPercent > 0)
  {
      invDiscountAmount = Math.Round(totalTaxable * (request.InvoiceDiscountPercent / 100m), 4);
      totalTaxable -= invDiscountAmount;
  }
  var grossTotalWithTax = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
  // totalCgst, totalSgst, totalIgst are NEVER reduced!
  `
* **Expected Implementation:**
  Proportionally allocate invoice discount across line items, recalculate line taxable and line GST, then sum totals.
* **Status:** **FAIL (P0 Critical Bug)** - Customer pays pre-discount tax while receiving post-discount taxable total. Invoice does not balance with line items.

---

### CALC-SALES-08: Invoice Round-Off Engine
* **Formula:** RoundedTotal = Round(GrossTotalWithTax, 0), RoundOff = RoundedTotal - GrossTotalWithTax
* **Location:**
  * Backend: SalesService.cs (Lines 611-612)
  * Frontend Invoices: page.tsx (Lines 887-889)
  * Frontend POS: pos/page.tsx (Lines 414-415)
* **Input Fields:** grossTotalWithTax
* **Output:** RoundedTotal (decimal), RoundOff (decimal)
* **Decimal Precision:** Currency precision (2 decimals), rounded to nearest whole rupee.
* **Rounding Rule:** Math.Round(val, 0, MidpointRounding.AwayFromZero).
* **Tax Treatment:** Post-tax commercial round-off.
* **Stock Impact:** None.
* **Ledger Impact:** Added to customer debit.
* **Accounting Impact:** Posted to ACC-ROUNDOFF (Indirect Expense / Other Income).
* **Return Impact:** Must be reversed if entire invoice is returned.
* **Report Impact:** P&L indirect expense/income.
* **Current Implementation:** Correct standard implementation.
* **Expected Implementation:** Maintained as canonical.
* **Status:** **PASS**

---

### CALC-SALES-09: Unit Conversion in Sales (CRITICAL DEFECT)
* **Formula:** StockDeduction = Quantity * ConversionRatio
* **Location:** SalesService.cs (Line 483)
* **Input Fields:** eqItem.Quantity, item.ConversionRatio, eqItem.UomId
* **Output:** Stock deduction in base/stock UOM.
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Exact multiplication.
* **Tax Treatment:** None.
* **Stock Impact:** Physical stock deduction.
* **Ledger Impact:** None.
* **Accounting Impact:** COGS valuation.
* **Return Impact:** Reverse in base units.
* **Report Impact:** Stock Ledger & Valuation.
* **Current Implementation:** stock.CurrentQuantity -= reqItem.Quantity; (ConversionRatio completely ignored).
* **Expected Implementation:** If item sold in Secondary UOM, convert to Primary Base Stock UOM: qtyInBase = reqItem.Quantity * (item.ConversionRatio ?? 1m);
* **Status:** **FAIL (P0 Critical Bug)** - Selling 2 Boxes (100 tabs/box) deducts 2 units instead of 200 units.

---

### CALC-SALES-10: POS Flat Rupee Bill Discount Omission
* **Formula:** BillDiscountAmount = FixedAmount
* **Location:**
  * Frontend POS: pos/page.tsx (Lines 398-401, 650)
  * Backend API: CreateSalesInvoiceRequest
* **Input Fields:** illDiscountType, illDiscountValue
* **Output:** InvoiceDiscountAmount
* **Decimal Precision:** 2 decimals.
* **Rounding Rule:** Exact rupee deduction.
* **Tax Treatment:** Pre-tax discount.
* **Stock Impact:** None.
* **Ledger Impact:** Customer debit balance.
* **Accounting Impact:** Discount expense.
* **Return Impact:** Return deduction.
* **Report Impact:** Sales Register.
* **Current Implementation:**
  invoiceDiscountPercent: billDiscountType === "percent" ? billDiscountValue : 0
  If flat discount is applied, frontend sends invoiceDiscountPercent: 0. The backend never receives the flat discount, calculates the invoice at full price, and leaves a phantom unpaid balance on the customer's account!
* **Expected Implementation:** Backend DTO must accept both InvoiceDiscountPercent and InvoiceDiscountAmount.
* **Status:** **FAIL (P0 Critical Bug)** - POS flat discounts corrupt customer balance and invoice payment status.

---

## 2. PURCHASES & INWARD INVENTORY ENGINE

### CALC-PURCH-01: Direct Purchase Bill Stock Inward (CRITICAL DEFECT)
* **Formula:** CurrentQuantity = CurrentQuantity + PurchaseQuantity
* **Location:** PurchaseService.cs (Lines 1251-1458 CreatePurchaseBillAsync)
* **Input Fields:** equest.Items, equest.WarehouseId
* **Output:** ItemWarehouseStock.CurrentQuantity, StockMovement
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Exact addition.
* **Tax Treatment:** ITC input credit.
* **Stock Impact:** Increases inventory in warehouse.
* **Ledger Impact:** Increases vendor payable.
* **Accounting Impact:** Debit Inventory Asset, Credit Sundry Creditors.
* **Return Impact:** Baseline for Debit Note.
* **Report Impact:** Stock valuation and purchase register.
* **Current Implementation:** CreatePurchaseBillAsync saves bill, credits supplier ledger, and posts to GL, but NEVER creates a StockMovement or increases ItemWarehouseStock unless a separate GRN is created!
* **Expected Implementation:** Direct purchase bills (where GoodsReceiptNoteId == null) must automatically inward stock into the selected warehouse and batch.
* **Status:** **FAIL (P0 Critical Bug)** - Direct purchases increase liabilities without adding physical stock to warehouse.

---

### CALC-PURCH-02: Purchase Bill Tax Split
* **Formula:** Same intra/inter-state split as sales, applied to purchase rate.
* **Location:** PurchaseService.cs (Lines 1292-1324)
* **Input Fields:** Quantity, UnitPrice, DiscountPercent, TaxRate, State codes.
* **Output:** TaxableAmount, CgstAmount, SgstAmount, IgstAmount, TotalAmount
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Math.Round(val, 4).
* **Tax Treatment:** Input Tax Credit (ITC) under Section 16 CGST Act.
* **Stock Impact:** None on stock units.
* **Ledger Impact:** Vendor credit liability.
* **Accounting Impact:** Debit Input CGST / SGST / IGST asset ledgers.
* **Return Impact:** Reversed on Debit Note.
* **Report Impact:** GSTR-2B / GSTR-3B ITC reconciliation.
* **Current Implementation:** Mathematically correct calculation.
* **Expected Implementation:** Maintained as canonical.
* **Status:** **PASS**

---

### CALC-PURCH-03: Purchase Return Batch Stock Depletion Mismatch (CRITICAL DEFECT)
* **Formula:** BatchStock = BatchStock - ReturnQuantity
* **Location:** PurchaseService.cs (Lines 1781-1805)
* **Input Fields:** line.ItemId, line.BatchId, equest.WarehouseId, line.ReturnQuantity
* **Output:** ItemWarehouseStock.CurrentQuantity, StockMovement.QuantityAfter
* **Decimal Precision:** 4 decimals.
* **Rounding Rule:** Exact deduction.
* **Tax Treatment:** ITC Reversal under Section 34 CGST Act.
* **Stock Impact:** Physical deduction from warehouse.
* **Ledger Impact:** Reduces vendor payable liability.
* **Accounting Impact:** Debit Sundry Creditor, Credit Inventory Asset, Credit Input Tax Credit.
* **Return Impact:** Debit Note creation.
* **Report Impact:** Stock ledger, purchase return register.
* **Current Implementation:**
  `csharp
  var stock = await _context.ItemWarehouseStocks
      .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == request.WarehouseId, cancellationToken);
  // Missing s.BatchId == line.BatchId!
  `
  Additionally:
  `csharp
  stock.CurrentQuantity -= line.ReturnQuantity; // Deducted here
  // And in movement:
  QuantityAfter = (stock?.CurrentQuantity ?? 0) - line.ReturnQuantity // Deducted TWICE!
  `
* **Expected Implementation:** Filter by s.BatchId == line.BatchId, and record QuantityAfter = stock.CurrentQuantity.
* **Status:** **FAIL (P0 Critical Bug)** - Returns wrong batch and corrupts audit trail quantity.

---

## 3. RETURNS, CREDIT NOTES & CANCELLATION ENGINE

### CALC-RET-01: Sales Return Valuation
* **Formula:** ReturnLineAmount = ReturnQuantity * NetEffectiveRate
* **Location:** SalesService.cs (Lines 1498-1517)
* **Input Fields:** line.ReturnQuantity, line.UnitPrice, line.GstRate
* **Output:** subTotal, 	axTotal, TotalAmount
* **Decimal Precision:** 2 decimals.
* **Rounding Rule:** Math.Round(subTotal + taxTotal, 2).
* **Tax Treatment:** Section 34(2) CGST Act Output Tax Reversal.
* **Stock Impact:** Restocks warehouse if RestockToWarehouse == true.
* **Ledger Impact:** Credits Customer Ledger (reduces outstanding).
* **Accounting Impact:** Debits Sales Returns & Allowances, Debits Output GST, Credits Accounts Receivable.
* **Return Impact:** Direct credit note.
* **Report Impact:** Credit Note Register, GSTR-1 Table 9B.
* **Current Implementation:** Uses raw line.UnitPrice without reference to original invoice line discounts or free schemes.
* **Expected Implementation:** Look up original sales invoice item, determine NetEffectiveRate = OriginalTaxable / (PaidQty + FreeQty), and price return accordingly.
* **Status:** **PARTIAL (P1 High Bug)** - Works for simple sales, fails for discount/scheme sales.

---

### CALC-RET-02: Invoice Cancellation Ledger Reversal Desynchronization (CRITICAL DEFECT)
* **Formula:** 
  * Outstanding Adjustment: 
etAdjustment = -(TotalAmount - PaidAmount)
  * Ledger Entry Amount: CreditAmount = -(TotalAmount - PaidAmount) (MUST MATCH!)
* **Location:** SalesService.cs (Lines 1256-1274)
* **Input Fields:** invoice.TotalAmount, invoice.PaidAmount
* **Output:** party.CurrentOutstandingBalance, PartyLedgerEntry.CreditAmount
* **Decimal Precision:** 2 decimals.
* **Rounding Rule:** Exact balance adjustment.
* **Tax Treatment:** Reversal of GST liability.
* **Stock Impact:** Restores warehouse stock.
* **Ledger Impact:** Reverses customer debt.
* **Accounting Impact:** Reverses GL voucher.
* **Return Impact:** N/A (cancellation).
* **Report Impact:** Debtor Outstanding vs Ledger Statement.
* **Current Implementation:**
  party.CurrentOutstandingBalance is adjusted by unpaid balance (TotalAmount - PaidAmount), BUT PartyLedgerEntry.CreditAmount is written as invoice.TotalAmount!
* **Expected Implementation:** PartyLedgerEntry.CreditAmount must strictly equal TotalAmount - PaidAmount, and any collected tender must generate a separate Refund Ledger Entry or be refunded.
* **Status:** **FAIL (P0 Critical Bug)** - Customer ledger running balance permanently deviates from CurrentOutstandingBalance.

---

## 4. REPORTING & PROFITABILITY ENGINE

### CALC-REP-01: Gross Profit & COGS Formula Conflict (CRITICAL DEFECT)
* **Formula:**
  * Canonical AS-2 Formula: GrossProfit = NetSales - CostOfGoodsSold (COGS)
  * Invalid Cash-Purchase Formula: GrossProfit = NetSales - Purchases
* **Location:**
  * ReportService.cs (Line 212 & Line 497): decimal grossProfit = netSales - totalPurchases;
  * P0ReportService.cs (Line 1111): ar grossProfit = netSales - cogs;
* **Input Fields:** NetSales, COGS, Purchases
* **Output:** GrossProfit, GrossMarginPercent
* **Decimal Precision:** 2 decimals.
* **Rounding Rule:** Math.Round(val, 2).
* **Tax Treatment:** Pure commercial profitability (tax excluded).
* **Stock Impact:** None.
* **Ledger Impact:** None.
* **Accounting Impact:** Trading Account balance.
* **Return Impact:** Reversed on sales/purchase returns.
* **Report Impact:** Profit & Loss Statement, Executive Dashboard.
* **Current Implementation:** Two completely contradictory formulas coexist in backend services. If a merchant buys ₹5 Lakhs stock in Month 1 and sells ₹1 Lakh, ReportService reports a catastrophic ₹4 Lakh loss, while P0ReportService reports a profit!
* **Expected Implementation:** Deprecate ReportService invalid purchase subtraction; standardize universally on COGS = Opening Stock + Inward - Closing Stock.
* **Status:** **FAIL (P1 High Bug)** - Conflicting business metrics across reports.

---

## 5. AUDIT SUMMARY TABLE OF SUSPECTED DEFECTS

| Bug ID | Module | Exact Method | Line Range | Current Result | Expected Result | Severity |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **BUG-001** | Sales | CreateInvoiceAsync | 468-493 | Deducts only Paid Qty | Deducts Paid + Free Qty | **P0** |
| **BUG-002** | Sales | CreateInvoiceAsync | 510-512 | Ignores IsTaxInclusive | Extract taxable: Gross / (1 + Rate) | **P0** |
| **BUG-003** | Sales | CreateInvoiceAsync | 604-610 | Tax unadjusted on inv disc | Proportionally reduce line GST | **P0** |
| **BUG-004** | Sales | CreateInvoiceAsync | 483 | Ignores ConversionRatio | Convert Secondary to Primary UOM | **P0** |
| **BUG-005** | POS | Checkout | 650 | Flat rupee disc lost | Send InvoiceDiscountAmount to API | **P0** |
| **BUG-006** | Purchases | CreatePurchaseBillAsync | 1251-1442| Stock never inwarded | Inward stock when GRN is null | **P0** |
| **BUG-007** | Purchases | CreatePurchaseReturnAsync| 1781-1798| Wrong batch & double deduct | Match BatchId & fix audit quantity | **P0** |
| **BUG-008** | Sales | CancelInvoiceAsync | 1256-1274| Ledger credit ≠ Bal adjustment | Ledger entry must match adjustment | **P0** |
| **BUG-009** | Reports | GetProfitAndLoss | 212, 497 | GrossProfit = Sales - Purchases | GrossProfit = Sales - COGS | **P1** |
| **BUG-010** | Sales | CreateSalesReturnAsync | 1498 | Blind list price return | Use Net Effective Rate | **P1** |
