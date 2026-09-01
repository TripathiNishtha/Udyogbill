# 05. Industry Capability Engine

## 1. Concept: Unified Core with Dynamic Industry Capabilities

Instead of creating separate codebases or fragmented applications for different industries, the platform implements a **Unified Core Engine** with **Dynamic Industry Capability Layers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              COMMON CORE                               │
│  - Sales & Invoicing         - Purchase & Orders    - Inventory Items  │
│  - Customer / Supplier Master- GST / Tax Accounting - Bank & Payments  │
│  - User Management           - Multi-Branch         - Multi-Warehouse  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Pharma Layer │             │Garments Layer│             │ Bakery Layer │
│ - Batch No   │             │ - Size / Fit │             │ - Recipe / BOM
│ - Expiry Date│             │ - Color / SKU│             │ - Waste Track│
│ - Schedule H1│             │ - Style Code │             │ - Shift Batch│
│ - Drug Lic No│             │ - Barcode Tag│             │ - Short Shelf│
└──────────────┘             └──────────────┘             └──────────────┘
```

---

## 2. 14 Target Industries & Feature Matrix

1. **Pharma**: Batch tracking, Expiry date validation, Drug license numbers (20B/21B), Schedule H/H1 compliance, Salt composition, Near-expiry discount triggers.
2. **FMCG**: Bulk packaging units (Case, Box, Piece conversion), Route/Van sale tracking, Scheme/Free Quantity discounts, Expiry and batch control.
3. **Wholesale**: Tiered price lists (A/B/C tier pricing), Credit limits and days, Multi-unit billing, Broker / Agent commission.
4. **Retail**: POS barcode scanning, Customer loyalty points, Quick cash/card billing, Cash drawer balancing.
5. **Bakery**: Recipe / Bill of Materials (BOM), Ingredient batch tracking, Short shelf-life expiry, Wastage tracking.
6. **B2B Distribution**: Delivery challans, E-Way bill generation, Multi-warehouse fulfillment, Payment collection schedules.
7. **Hardware**: Dimension & weight units (Kg, Meter, SqFt, Pcs), Item variants, Multi-rate tax rules.
8. **Garments**: Matrix inventory (Size, Color, Brand, Style), Custom barcode printing, Seasonal collection categorization.
9. **General Trading**: Standard invoicing, Multiple tax rates, Multi-currency, General inventory ledger.
10. **Grocery**: Weighing scale integration, Fast item search, Barcode scanner, Perishable item tracking.
11. **Electronics**: Serial number / IMEI tracking, Warranty period management, Repair / RMA tracking.
12. **Electrical**: Coil / Drum length tracking, Brand classification, Warranty cards.
13. **Cosmetics**: Shade / Variant management, Expiry tracking, Batch numbers, Brand grouping.
14. **Footwear**: Size matrix (UK / US / EU), Color, Brand, Box packing.

---

## 3. Dynamic Industry Hierarchy

```
Industry
  └── Module
        └── Feature
              └── SubFeature
                    └── Permission
```

Super Admin can introduce new industries or adjust module mappings at runtime via the Super Admin portal by registering industry records with corresponding JSON capability definitions, without requiring core architecture or database structural modifications.
