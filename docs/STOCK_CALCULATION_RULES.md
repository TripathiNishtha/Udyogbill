# UDYOGBILL STOCK & INVENTORY CALCULATION RULES
**Standard:** AS-2 / Ind AS 2 Valuation of Inventories  

1. **CANONICAL STOCK BALANCE INVARIANT:**
   \text{ClosingStock} = \text{OpeningStock} + \text{Purchases} + \text{SalesReturns} + \text{TransfersIn} + \text{AdjustmentsIncrease} - \text{Sales} - \text{PurchaseReturns} - \text{TransfersOut} - \text{AdjustmentsDecrease}

2. **PHYSICAL STOCK INCLUSION OF FREE QUANTITIES:**
   - Free quantities given to customers deplete warehouse inventory.
   - Free quantities received from suppliers increase warehouse inventory.

3. **UNIT OF MEASURE CONVERSIONS:**
   - All physical warehouse stock is recorded in the item's **Primary Base UOM**.
   - Any transaction entered in a Secondary UOM must be converted: $\text{BaseUnits} = \text{SecondaryUnits} \times \text{ConversionRatio}$.

4. **FEFO BATCH CONSUMPTION ORDER:**
   - Batches must be sorted by ExpiryDate ASC. The oldest active non-quarantined batch must be consumed first.
