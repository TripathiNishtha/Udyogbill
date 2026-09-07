# UdyogBill — Add-On & Commercial Pricing Architecture

## Overview

The commercial model for UdyogBill guarantees maximum market penetration and simplicity:
- Customers see **ONE primary subscription**: UdyogBill Core.
- SuperAdmin has **dynamic control** over pricing without requiring code redeployment.
- User capacity and AI capabilities are structured as optional add-ons.
- All industry modules are **bundled free** inside the core subscription.

---

## Canonical Commercial Model

### 1. Core Subscription Tiers
| Tier | Price (excl. GST) | Duration | Included Users | Included Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Core Annual** | ₹3,999 + 18% GST | 1 Year (365 days) | 2 Users | All 7 Industry Modules (Pharma, FMCG, Electronics, Garments, Hardware, Service Sector, Retail) |
| **Core Biennial** | ₹6,999 + 18% GST | 2 Years (730 days) | 2 Users | All 7 Industry Modules (Long term price lock, ₹1,000 discount vs 2 single years) |

### 2. User Expansion Add-Ons
| Add-On | Code | Price (excl. GST) | Billing | Benefit |
| :--- | :--- | :--- | :--- | :--- |
| **Single Extra User** | `ADDON_USER_SINGLE` | ₹799 + GST | Annual | Adds 1 concurrent staff user slot to `MaxAllowedUsers` |
| **5-User Pack** | `ADDON_USER_PACK_5` | ₹2,999 + GST | Annual | Adds 5 concurrent staff user slots (Bulk saving of ₹996 vs individual seats) |

### 3. AI Pro Add-On
| Add-On | Code | Price (excl. GST) | Monthly Quota | Features |
| :--- | :--- | :--- | :--- | :--- |
| **AI Purchase Scanner Pro** | `ADDON_AI_PRO` | ₹1,499 + GST (Configurable by SuperAdmin) | 500 scans/month | AI OCR Purchase Bill extraction, auto-matching vendors, auto-creation of items and batches |

---

## SuperAdmin Dynamic Pricing Engine

Platform commercial rates are not hardcoded. They are stored in PostgreSQL table `PlatformCommercialConfigs` and managed via:
- Endpoint: `GET /api/v1/superadmin/commercial/config`
- Endpoint: `PUT /api/v1/superadmin/commercial/config`
- Web UI: SuperAdmin Portal -> `/admin/plans`

### Configurable Fields
```json
{
  "coreAnnualPrice": 3999.00,
  "coreBiennialPrice": 6999.00,
  "singleUserAnnualPrice": 799.00,
  "fiveUserPackAnnualPrice": 2999.00,
  "aiProAnnualPrice": 1499.00,
  "aiProMonthlyQuota": 500,
  "defaultIncludedUsers": 2,
  "gstRatePercent": 18.00,
  "commercialNotes": "Production Base FY26 Configuration"
}
```

### Server-Side Enforcement of User Limits
When adding staff or cashier users via `TenantHierarchyService.CreateTenantUserAsync`:
```csharp
var currentActiveUsers = await _context.Users
    .Where(u => u.TenantId == tenantId && u.IsActive && !u.IsDeleted)
    .CountAsync(cancellationToken);

if (currentActiveUsers >= tenant.MaxAllowedUsers)
{
    return Result<Guid>.Failure(
        $"User limit reached ({tenant.MaxAllowedUsers} users). Upgrade with additional user packs to add more staff.",
        "USER_LIMIT_EXCEEDED"
    );
}
```

---

## GST Invoicing Compliance

All subscription and add-on transactions automatically generate canonical B2B/B2C GST tax invoices stored in `SubscriptionInvoices`. 
- CGST (9%) + SGST (9%) for intra-state transactions.
- IGST (18%) for inter-state transactions.
- Exact HSN/SAC codes for SaaS software services (`SAC 998313`).
