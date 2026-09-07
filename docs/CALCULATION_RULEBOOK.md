# UDYOGBILL CANONICAL CALCULATION RULEBOOK (SSOT)
**Status:** Canonical Reference Standard  
**Authority:** Backend Enterprise Core Engine

## 1. TRANSACTION CALCULATION PRECEDENCE (THE CANONICAL ORDER)
For any sales line or purchase line, calculations MUST occur in this exact sequence:

1. **Gross Value:**
   \text{Gross} = \text{Quantity} \times \text{UnitPrice}
2. **Item-Level Discount:**
   \text{ItemDiscount} = \text{DiscountAmount} > 0 \ ? \ \text{DiscountAmount} : (\text{Gross} \times \frac{\text{DiscountPercent}}{100})
3. **Line Net Before Invoice Discount:**
   \text{LineNet} = \max(0, \text{Gross} - \text{ItemDiscount})
4. **Proportional Invoice Discount Allocation:**
   \text{AllocatedInvDisc} = \text{InvoiceDiscountTotal} \times \frac{\text{LineNet}}{\sum \text{LineNet}}
5. **Taxable Value Extraction:**
   - If Tax-Exclusive:
     \text{Taxable} = \text{LineNet} - \text{AllocatedInvDisc}
   - If Tax-Inclusive:
     \text{Taxable} = \frac{\text{LineNet} - \text{AllocatedInvDisc}}{1 + \frac{\text{GstRate} + \text{CessRate}}{100}}
6. **Statutory Tax Breakdown:**
   - Intra-State:
     \text{CGST} = \text{Taxable} \times \frac{\text{GstRate}}{200}, \quad \text{SGST} = \text{Taxable} \times \frac{\text{GstRate}}{200}, \quad \text{IGST} = 0
   - Inter-State:
     \text{IGST} = \text{Taxable} \times \frac{\text{GstRate}}{100}, \quad \text{CGST} = 0, \quad \text{SGST} = 0
   - Cess:
     \text{Cess} = \text{Taxable} \times \frac{\text{CessRate}}{100}
7. **Line Commercial Total:**
   \text{LineTotal} = \text{Taxable} + \text{CGST} + \text{SGST} + \text{IGST} + \text{Cess}
8. **Invoice Commercial Aggregation & Round-Off:**
   \text{UnroundedTotal} = \sum \text{LineTotal} + \text{Freight} + \text{OtherCharges}
   \text{RoundedTotal} = \text{Round}(\text{UnroundedTotal}, 0, \text{AwayFromZero})
   \text{RoundOff} = \text{RoundedTotal} - \text{UnroundedTotal}
9. **Physical Stock Deduction:**
   \text{PhysicalQty} = (\text{Quantity} + \text{FreeQuantity}) \times \text{UomConversionRatio}
