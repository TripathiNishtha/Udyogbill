# UdyogBill — Industry Module Architecture

## Executive Overview

**UdyogBill** is engineered as **ONE unified SaaS billing & ERP product** with a streamlined, customer-friendly commercial offering. Instead of forcing customers to purchase disparate industry software editions or paid module add-ons, UdyogBill provides a single core subscription with **modular Industry Packs included free of charge**.

---

## Architectural Principles

1. **One Core SaaS Product**: Customers subscribe to UdyogBill Core (₹3,999/year or ₹6,999/2-years + GST).
2. **Free Industry Pack Inclusion**: During onboarding, the customer chooses their business type (`PHARMA`, `FMCG`, `ELECTRONICS`, `GARMENTS`, `HARDWARE`, `SERVICE_SECTOR`, or `OTHER`). The respective industry pack is automatically activated server-side at zero extra fee.
3. **No Paid Industry Add-ons**: Industry packs are strictly **capabilities/configurations**, never billed add-ons.
4. **Single Source of Truth for Calculations**: All invoice calculations, tax computations, discount allocations, round-offs, and ledger postings are strictly performed by the core `CanonicalCalculationEngine`. Industry packs never fork financial or GST logic.
5. **Strict Multi-Tenant Isolation & Authorization**: Server-side authorization checks (`ITenantModuleAuthorizationService`) prevent cross-industry leakage or unentitled feature usage.

---

## 7 Canonical Industry Descriptors

The platform defines 7 canonical industry modules in `UdyogBill.Domain.Enums.IndustryModuleRegistry`:

```csharp
public static class CanonicalIndustries
{
    public const string Pharma = "PHARMA";
    public const string Fmcg = "FMCG";
    public const string Electronics = "ELECTRONICS";
    public const string Garments = "GARMENTS";
    public const string Hardware = "HARDWARE";
    public const string ServiceSector = "SERVICE_SECTOR";
    public const string Other = "OTHER";
}
```

### Module Summary Matrix

| Industry Code | Display Name | Core Distinct Capabilities | Free Included? |
| :--- | :--- | :--- | :---: |
| `PHARMA` | Pharmacy, Chemist & Healthcare | Batch No, Expiry Date, Drug License, Schedule H/H1 warning, Narcotic check, Doctor details | Yes (Included) |
| `FMCG` | FMCG, Grocery & Supermarket | Multi-unit conversion (Case/Box/Pcs), Free schemes (Buy X Get Y), Barcode scanning, POS Held bills | Yes (Included) |
| `ELECTRONICS` | Electronics & Mobile Retail | IMEI / Serial Number tracking, Warranty management, Brand / Model classification | Yes (Included) |
| `GARMENTS` | Apparel, Footwear & Garments | 2D Size × Color Matrix, Barcode hangtags, Style classification, Variant stock | Yes (Included) |
| `HARDWARE` | Hardware, Electrical & Sanitary | Dual-unit pricing (Weight/Length/Units), Cutting loss, Contractor pricing, Dimensional rates | Yes (Included) |
| `SERVICE_SECTOR` | Service Sector & Consulting | SAC code billing, Job sheets / Work orders, Hourly / Milestone billing, Recurring invoices | Yes (Included) |
| `OTHER` | General Trading & Retail | Standard multi-rate GST, POS billing, General inventory, Customer credit ledger | Yes (Included) |

---

## Dynamic Capability Activation Flow

When a tenant registers or loads the application:
1. **Registration**: Tenant picks `IndustryTypeCode`. Server seeds defaults (`MaxAllowedUsers = 2`, `IndustryActivatedAtUtc = UtcNow`, `ActiveIndustryModule = selectedCode`).
2. **Session / Context**: `TenantResolutionMiddleware` resolves the tenant and populates `ITenantContext`.
3. **Authorization Service**: `ITenantModuleAuthorizationService.ValidateModuleAccessAsync(requiredIndustry)` verifies whether the tenant is permitted to call industry-specific APIs.
4. **Active Pack Endpoint**: `GET /api/v1/tenant/industry/active-pack` returns the active descriptor and UI toggles (`enableBatchTracking`, `enableSizeColorMatrix`, etc.), allowing the frontend to dynamically render relevant form fields while hiding unused tabs.

---

## Database Architecture

- **`tenants` table additions**:
  - `IndustryTypeCode` (`text`): Canonical industry identifier.
  - `ActiveIndustryModule` (`text`): Active pack identifier.
  - `IndustryModuleStatus` (`integer`): 1 = Active, 2 = Inactive, 3 = Suspended.
  - `IndustryActivatedAtUtc` (`timestamp with time zone`): Timestamp of activation.
  - `MaxAllowedUsers` (`integer`): Enforced staff limit (defaults to 2, increments with user add-on packs).
  - `IsAiAddonActive` (`boolean`): Paid AI Purchase Scanner status.
  - `AiScansLimit` / `AiScansUsed` (`integer`): Monthly AI scanner quota tracking.

---

## Security & Protection Measures

- **No Cross-Industry Access**: A tenant configured with `PHARMA` cannot call garments matrix endpoints or access hardware-specific dimensions. Attempted unauthorized access returns `403 Forbidden` with error code `INDUSTRY_MODULE_FORBIDDEN`.
- **Stateless Verification**: Every request verifies tenant claims against the database or verified JWT claims, ensuring immediate enforcement if access policies change.
