# UDYOGBILL BUSINESS RULE MATRIX
**Status:** Canonical Enterprise Policy  

| Rule ID | Domain | Rule Statement | Enforcement Location | Severity on Breach |
| :--- | :--- | :--- | :--- | :--- |
| **BR-INV-01** | Inventory | FreeQuantity must always physically deplete stock alongside paid units. | Sales Engine | P0 Critical |
| **BR-INV-02** | Inventory | Negative stock is blocked unless tenant configuration explicitly allows overdraft. | Stock Engine | P1 High |
| **BR-INV-03** | Inventory | Non-goods (Service) items must never generate stock movements or inventory valuation. | Sales & Purchase Engine | P1 High |
| **BR-TAX-01** | GST | Intra-state supplies must split GST equally between CGST and SGST. | Tax Engine | P0 Critical |
| **BR-TAX-02** | GST | Inter-state supplies must charge full GST under IGST. | Tax Engine | P0 Critical |
| **BR-TAX-03** | GST | Tax-inclusive pricing must extract taxable value via divisor, not subtract tax rate percentage. | Tax Engine | P0 Critical |
| **BR-TAX-04** | GST | Post-supply invoice discounts must reduce output tax liability only when eligible under Sec 15(3)(b). | Tax Engine | P0 Critical |
| **BR-LED-01** | Debtors | Customer Ledger balance must reconcile with CurrentOutstandingBalance without variance. | Party Service | P0 Critical |
| **BR-LED-02** | Creditors | Supplier Ledger running balance must reconcile with Accounts Payable liability. | Purchase Service | P0 Critical |
| **BR-RET-01** | Returns | Sale Returns on scheme items must be priced at Net Effective Rate, not original list price. | Sales Return Engine | P1 High |
| **BR-ACC-01** | Accounting | Every financial transaction must maintain balanced double-entry: Total Debit == Total Credit. | GL Auto-Poster | P0 Critical |
| **BR-REP-01** | Reporting | Gross Profit must universally evaluate as Net Sales minus COGS (AS-2 standard). | Reporting Services | P1 High |
