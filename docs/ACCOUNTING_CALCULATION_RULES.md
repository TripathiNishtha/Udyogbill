# UDYOGBILL FINANCIAL ACCOUNTING & GENERAL LEDGER RULES
**Standard:** Double-Entry Bookkeeping & Ind AS  

1. **DOUBLE-ENTRY INVARIANT:**
   \sum \text{DebitAmount} \equiv \sum \text{CreditAmount}
   No journal voucher may be posted if $|\sum \text{Debit} - \sum \text{Credit}| > 0.0001$.

2. **SALES INVOICE AUTO-POSTING MAP:**
   - Debit: Accounts Receivable (ACC-AR) [Invoice Total]
   - Credit: Direct Sales Revenue (ACC-SALES-REV) [Taxable Amount]
   - Credit: Output CGST Payable (ACC-CGST-OUT) [CGST Amount]
   - Credit: Output SGST Payable (ACC-SGST-OUT) [SGST Amount]
   - Credit: Output IGST Payable (ACC-IGST-OUT) [IGST Amount]
   - Debit/Credit: Round Off (ACC-ROUNDOFF) [RoundOff Difference]

3. **PARTY LEDGER PARITY INVARIANT:**
   \text{Party.CurrentOutstandingBalance} \equiv \sum \text{PartyLedgerEntry.Debit} - \sum \text{PartyLedgerEntry.Credit}
