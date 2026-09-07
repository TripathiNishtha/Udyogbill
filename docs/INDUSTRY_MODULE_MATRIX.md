# UdyogBill — Industry Module Capability Matrix

This matrix documents the functional boundaries, database models, and active feature flags across all 7 canonical industries supported by UdyogBill.

---

## Detailed Capability Matrix

| Feature / Capability | PHARMA | FMCG | ELECTRONICS | GARMENTS | HARDWARE | SERVICE_SECTOR | OTHER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Batch Number & Expiry Tracking** | **YES** | **YES** | NO | NO | NO | NO | NO |
| **Drug License & Schedule H/H1** | **YES** | NO | NO | NO | NO | NO | NO |
| **Narcotic / Schedule X Tracking** | **YES** | NO | NO | NO | NO | NO | NO |
| **Doctor / Prescriber Details** | **YES** | NO | NO | NO | NO | NO | NO |
| **Multi-Unit Packaging (Case/Box/Pcs)**| OPTIONAL | **YES** | NO | NO | **YES** | NO | OPTIONAL |
| **Free Schemes (e.g. 10 + 1 Free)** | **YES** | **YES** | NO | NO | OPTIONAL | NO | OPTIONAL |
| **POS Held Bills / Quick Checkout** | **YES** | **YES** | **YES** | **YES** | **YES** | NO | **YES** |
| **Serial / IMEI Number Tracking** | NO | NO | **YES** | NO | NO | NO | NO |
| **Brand, Model & Warranty Tracking** | NO | NO | **YES** | NO | OPTIONAL | NO | NO |
| **2D Matrix (Size × Color × Fit)** | NO | NO | NO | **YES** | NO | NO | NO |
| **Clothing Hangtag Barcode Print** | NO | NO | NO | **YES** | NO | NO | NO |
| **Dual-Unit (Weight / Length / Pcs)** | NO | NO | NO | NO | **YES** | NO | NO |
| **Cutting Loss / Wastage Tracking** | NO | NO | NO | NO | **YES** | NO | NO |
| **Contractor / Plumber Pricing** | NO | NO | NO | NO | **YES** | NO | NO |
| **Service Accounting Codes (SAC)** | NO | NO | NO | NO | NO | **YES** | NO |
| **Job Sheets & Work Orders** | NO | NO | OPTIONAL | NO | NO | **YES** | NO |
| **Recurring Service Invoicing** | NO | NO | NO | NO | NO | **YES** | NO |
| **Canonical Financial Calculation Engine**| **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| **GST E-Way Bill & E-Invoicing** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |
| **Included Free in Core Plan?** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |

---

## Technical Descriptors Schema

Each industry is mapped in backend domain as `IndustryDescriptor`:

```csharp
public class IndustryDescriptor
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = "tag";
    public int DisplayOrder { get; set; }
    public bool EnableBatchTracking { get; set; }
    public bool EnableExpiryTracking { get; set; }
    public bool EnableSerialTracking { get; set; }
    public bool EnableMultiUnitConversion { get; set; }
    public bool EnableSizeColorMatrix { get; set; }
    public bool EnableRecipeBOM { get; set; }
    public bool EnableScheduleH1DrugTracking { get; set; }
    public bool EnableEWayBill { get; set; } = true;
    public bool EnableEInvoicing { get; set; } = true;
}
```

---

## Client-Side UI Rendering Rules

The client application calls `GET /api/v1/tenant/industry/active-pack`:
- If `enableBatchTracking == true`: Item forms show Batch Number, Expiry Date, MRP, PTR, PTS.
- If `enableSizeColorMatrix == true`: Garments Matrix tab and Hangtag Barcode designer are visible.
- If `enableSerialTracking == true`: Serial / IMEI capture input is enabled during invoicing and stock receipts.
- If `enableScheduleH1DrugTracking == true`: Schedule H1 alert badges and Prescriber/Doctor prompts appear on POS invoices.
