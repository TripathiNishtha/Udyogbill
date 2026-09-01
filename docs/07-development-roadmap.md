# 07. Development Roadmap

## Phase 1: Foundation & Core Architecture (Current Step 1)
- [x] Solution & project architecture (Clean Architecture, ASP.NET Core 10 Web API, Next.js App Router, Tailwind CSS).
- [x] PostgreSQL 15+ persistence with EF Core 10 and Npgsql.
- [x] Multi-tenant isolation engine (server-side claims resolution, global query filters, interceptors).
- [x] Security foundation (JWT, PBKDF2 password hashing, RBAC & Policy permission handler, security headers).
- [x] 14 Initial target industry catalog & feature hierarchy data structures.
- [x] Subscription and plan entitlement models.
- [x] Test suite (Architecture & Unit tests).
- [x] Complete architectural specifications in `/docs`.

## Phase 2: Super Admin Platform Engine
- Super Admin authentication & dashboard.
- Tenant lifecycle management (onboarding, suspension, activation, archive).
- Dynamic Industry builder & Feature catalog manager.
- Plan, Package, Pricing, and Entitlement editor.
- Global audit logs and platform health telemetry.

## Phase 3: Tenant Authentication & Onboarding
- Tenant self-service registration with dynamic industry selection.
- Tenant user onboarding and multi-factor authentication (MFA).
- Dynamic role & permission assignment within tenant boundaries.
- Branch and warehouse configuration.

## Phase 4: Common Core Business Modules
- Masters: Customers, Suppliers, Products/Items, Categories, Tax Rates (GST / HSN / SAC).
- Multi-Branch & Multi-Warehouse Inventory Ledger.
- Sales & Invoicing engine with real-time tax calculation.
- Purchase order and supplier billing workflow.
- Payments, Receipts, and Financial Ledgers.

## Phase 5: Industry Capability Packs
- **Pharma Pack**: Batch numbers, expiry validation, Drug License, Schedule H1, near-expiry alerts.
- **FMCG Pack**: Multi-UOM packaging conversions, route sales, promotional schemes.
- **Garments & Footwear Pack**: Size/Color/Style matrix, barcode generation.
- **Hardware & Retail Pack**: POS checkout, barcode integration, dimensions/weight units.
- **Bakery Pack**: BOM / Recipe assembly, ingredient batch control, waste tracking.

## Phase 6: E-Way Bill, E-Invoicing & Compliance
- GST compliance engine (GSTR-1, GSTR-3B JSON exports).
- Direct Government E-Way Bill and E-Invoice API integration.

## Phase 7: Mobile, Offline POS & Advanced Analytics
- Offline-capable POS sync engine.
- Executive analytics, forecasting, and automated reporting.
