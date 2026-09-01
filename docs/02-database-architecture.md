# 02. Database Architecture Specification

## 1. Database Engine & Principles

- **Engine**: PostgreSQL 15+ (Mandatory locked production DBMS).
- **ORM / Driver**: Entity Framework Core 10 via `Npgsql.EntityFrameworkCore.PostgreSQL`.
- **Database Paradigm**: Shared Database, Shared Schema with Logical Row-Level Tenant Isolation via Global Query Filters and Composite Indexing.

---

## 2. Core Schema Structure

### 2.1 System & Platform Metadata (Non-Tenant Entities)
- `tenants`: Primary tenant registry (UUID, Code, BusinessName, TradeName, IndustryId, Status, AdminEmail, PrimaryPhone, TimeZone, CurrencyCode, IsActive, CreatedAt, UpdatedAt).
- `industries`: Catalog of business industries (Pharma, FMCG, Garments, Hardware, Bakery, etc.) with default capability templates (Code, Name, Description, Icon, IsActive, ConfigJson).
- `modules`: System modules (Sales, Purchase, Inventory, Accounting, GST, CRM, Manufacturing).
- `features`: Features within modules (Sales Invoice, Batch Tracking, Serial Number Tracking, Expiry Management).
- `sub_features`: Granular sub-features (Auto-Batch Allocation, Near-Expiry Alerts, Multi-Barcode).
- `permissions`: Security permissions associated with features (`sales.invoice.create`, `inventory.batch.view`, etc.).
- `industry_modules`, `industry_features`: Mapping tables defining default feature packages for each industry.
- `plans`: Super Admin subscription plans (Code, Name, Description, BillingCycle, BasePrice, TrialDays, MaxUsers, MaxBranches, MaxWarehouses, MaxInvoicesPerMonth, MaxStorageMb, IsActive).
- `plan_entitlements`: Feature and limit grants linked to subscription plans.
- `add_ons`: Extensible add-on packages for extra storage, users, or specialized modules.

### 2.2 Tenant Identity & Access Management (Tenant-Scoped)
- `users`: User profiles associated with a tenant or system admin (Id, TenantId, Email, PasswordHash, Salt, FullName, PhoneNumber, IsActive, IsTenantAdmin, MustChangePassword, LockoutEnd, FailedAccessAttempts, CreatedAt, UpdatedAt).
- `roles`: Tenant-scoped RBAC roles (Id, TenantId, Name, Code, Description, IsSystemRole, IsActive).
- `user_roles`: Mapping between users and roles (UserId, RoleId, TenantId).
- `role_permissions`: Assigned permissions to roles (RoleId, PermissionId, TenantId).
- `user_permissions`: Direct permission overrides (UserId, PermissionId, TenantId, IsGranted).
- `refresh_tokens`: Revocable JWT refresh tokens (Id, UserId, TenantId, TokenHash, ExpiresAt, RevokedAt, ReplacedByToken, CreatedByIp).

### 2.3 Tenant Configuration & Subscriptions
- `tenant_subscriptions`: Tenant's active and historical subscriptions (Id, TenantId, PlanId, Status, StartsAt, EndsAt, TrialEndsAt, AutoRenew, CancelledAt).
- `tenant_industry_configs`: Tenant-specific industry customizations and feature overrides (Id, TenantId, IndustryId, CustomConfigJson).
- `tenant_settings`: Key-value configuration store per tenant (Id, TenantId, Category, Key, ValueJson, ValueType).
- `tenant_branches`: Business branch locations (Id, TenantId, BranchCode, BranchName, GSTIN, Address, City, State, Pincode, IsHeadOffice, IsActive).
- `tenant_warehouses`: Physical or virtual storage warehouses (Id, TenantId, BranchId, WarehouseCode, WarehouseName, Location, IsActive).

### 2.4 Audit & Compliance
- `audit_logs`: Immutable audit trail for security and operational transactions (Id, TenantId, UserId, Action, EntityName, EntityId, OldValuesJson, NewValuesJson, IpAddress, UserAgent, CorrelationId, TimestampUtc).

---

## 3. Indexing & Optimization Strategy

1. **Tenant Compound Indexing**:
   - Every tenant-scoped table features a composite index on `(tenant_id, id)` and `(tenant_id, created_at DESC)`.
   - Unique constraints on business codes always include `tenant_id`: e.g., `UNIQUE(tenant_id, code)` or `UNIQUE(tenant_id, email)`.
2. **Foreign Key Integrity**:
   - Explicit foreign keys with cascading strategies tailored to business rules (No casual cascading deletes on master or transaction data).
3. **Audit Immutability**:
   - `audit_logs` table is append-only. Updates and deletes are prohibited at both EF Core and PostgreSQL trigger levels.
4. **Soft Delete Standard**:
   - Entities implementing `ISoftDeletable` contain `is_deleted` (boolean) and `deleted_at_utc` (timestamptz). Global query filters automatically omit soft-deleted records.

---

## 4. PostgreSQL Data Types Standard

- **Primary Keys**: `uuid` (UUIDv7 or UUIDv4 with sequential optimization) or `bigint` identity.
- **Timestamps**: `timestamptz` (always stored in UTC).
- **Monetary Values**: `numeric(18, 4)` to guarantee zero floating-point rounding errors.
- **Dynamic Configurations**: `jsonb` for schema-flexible industry parameters and audit diffs.
- **Text / Strings**: `varchar(n)` for constrained identifiers and `text` for unconstrained descriptions.
