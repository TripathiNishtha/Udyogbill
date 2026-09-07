# UDYOGBILL TRANSACTION IMPACT MATRIX (18-POINT DIAGNOSTIC)
**Status:** Architectural Specification  

| Transaction Type | Physical Qty Moved | Amount Charged | Free Qty Handled? | Effective Rate | Stock Changed? | Batch Changed? | Customer Ledger | Supplier Ledger | GL Vouchers | Profit Impact | GST Impact |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Sales Tax Invoice** | Paid + Free (Out) | Commercial Net | YES (physical) | Net/Delivered | Decreases | Oldest/Selected | Debited (Total) | N/A | Debit AR, Credit Rev+Tax | Increases | Output GST |
| **POS Thermal Bill** | Paid + Free (Out) | Tendered/Cash | YES (physical) | Net/Delivered | Decreases | Assigned | Optional/Walkin | N/A | Debit Cash/Bank, Credit Rev | Increases | Output GST |
| **Sales Return (CN)** | Returned Qty (In) | Refund/Credit | Proportional | Net Effective | Increases | Original Batch | Credited | N/A | Debit Rev Ret+Tax, Credit AR | Decreases | GST Reversal |
| **Purchase Bill** | Inward Qty (In) | Invoiced Cost | Inwarded | Landed Cost | Increases | Created/Updated | N/A | Credited | Debit Stock+ITC, Credit AP | N/A (Balance Sheet)| Input Tax Credit |
| **Purchase Return (DN)**| Return Qty (Out) | Reversal Debit | Outwarded | Original Cost | Decreases | Original Batch | N/A | Debited | Debit AP, Credit Stock+ITC | N/A | ITC Reversal |
| **Stock Transfer** | Transfer Qty | Zero (Internal)| N/A | Inventory Cost | Src -, Dst + | Tracked | N/A | N/A | Intra-warehouse | None | Zero (Unless interstate)|
| **Stock Adjustment** | Net Delta Qty | Cost of Delta | N/A | Valuation Rate | Delta (+/-) | Adjusted | N/A | N/A | Debit/Credit Shrinkage | P&L Expense/Gain | Zero |
