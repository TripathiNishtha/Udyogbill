# UdyogBill — AI Pro Purchase Scanner Add-On Architecture

## Overview

The **AI Pro Add-On** provides intelligent automation for purchase bill data extraction, reducing manual entry time from 10 minutes to under 5 seconds per invoice.

- **Positioning**: Optional paid add-on (Default ₹1,499/year + GST).
- **Price Control**: Dynamic SuperAdmin configuration via `PlatformCommercialConfigs`.
- **Monthly Quota**: 500 scans per month per tenant (resets every calendar cycle).

---

## Technical Capabilities

1. **OCR & Multi-Modal Document Parsing**: Scans supplier invoices in PDF, PNG, JPEG formats.
2. **Entity Extraction**:
   - Supplier GSTIN, Name, Invoice Number, Invoice Date.
   - Line items: Item Description, HSN Code, Batch Number, Expiry Date, Quantity, Unit, Rate, Discount %, GST Rate %.
   - Bill totals: Subtotal, CGST, SGST, IGST, Round-off, Grand Total.
3. **Automated Vendor & Product Matching**:
   - Matches vendor by GSTIN or Phone number. If missing, prompts creation.
   - Matches products by SKU, HSN, or Item Name. If missing, creates new item master record automatically.
4. **Direct Purchase Bill Draft**: Pre-fills `PurchaseBill` ready for 1-click verification and inventory posting.

---

## Activation & Access Control

### Activation Endpoint
- **URL**: `POST /api/v1/tenant/ai/activate`
- **Authorization**: Tenant Admin (`Roles.TenantAdmin`)
- **Execution**: Sets `IsAiAddonActive = true`, initializes `AiScansLimit = 500`, `AiScansUsed = 0`.

### Consumption Guard (`TenantModuleAuthorizationService.ValidateAiScanQuotaAsync`)
```csharp
if (!tenant.IsAiAddonActive)
{
    return Result<bool>.Failure(
        "AI Pro Add-on is not active on your subscription.",
        "AI_ADDON_INACTIVE"
    );
}

if (tenant.AiScansUsed >= tenant.AiScansLimit)
{
    return Result<bool>.Failure(
        $"Monthly AI scan quota of {tenant.AiScansLimit} has been exhausted for this billing cycle.",
        "AI_QUOTA_EXHAUSTED"
    );
}

tenant.AiScansUsed += 1;
await _context.SaveChangesAsync(cancellationToken);
```

---

## SuperAdmin Quota & Pricing Management

SuperAdmin can dynamically adjust:
1. `AiProAnnualPrice`: Annual rate charged to tenants.
2. `AiProMonthlyScanLimit`: Monthly quota allowed per tenant.

Changes take effect instantly without restarting the API or deploying code.
