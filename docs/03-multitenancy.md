# 03. Multi-Tenancy Architecture

## 1. Multi-Tenant Tenets

Data isolation across tenants is a mission-critical non-negotiable security requirement. The platform adopts a **Shared Database, Shared Schema with Global Query Isolation** approach, optimized for high scalability, efficient resource utilization, and streamlined updates.

```
                    ┌─────────────────────────┐
                    │     Incoming Request    │
                    │ (Bearer Token / Claims) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Tenant Resolution Midw  │
                    │   - Validates JWT       │
                    │   - Extracts TenantId   │
                    │   - Populates ITenantCtx│
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    AppDbContext Query   │
                    │   Auto-applies Filter:  │
                    │   e.TenantId == @CtxId  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ PostgreSQL Database     │
                    │ SELECT * FROM items     │
                    │ WHERE tenant_id = @id   │
                    └─────────────────────────┘
```

---

## 2. Server-Side Tenant Resolution

1. **Zero Client Trust**:
   - The API will never use client-supplied query parameters or request headers (such as `X-Tenant-Id`) to determine tenant context for authenticated operations.
   - Tenant identity is derived strictly from the cryptographically verified JWT claims token (`tenant_id` claim).
2. **Super Admin Impersonation / Support Mode**:
   - Super Admins have a distinct claim (`is_super_admin: true`).
   - When a Super Admin explicitly enters diagnostic mode for a tenant, a scoped diagnostic audit session is recorded, and the tenant context is set explicitly with full audit trail logging.

---

## 3. Implementation in EF Core 10

### 3.1 `ITenantScopedEntity` Interface
```csharp
public interface ITenantScopedEntity
{
    Guid TenantId { get; set; }
}
```

### 3.2 Global Query Filter
In `AppDbContext.OnModelCreating()`:
```csharp
foreach (var entityType in modelBuilder.Model.GetEntityTypes())
{
    if (typeof(ITenantScopedEntity).IsAssignableFrom(entityType.ClrType))
    {
        var method = typeof(AppDbContext)
            .GetMethod(nameof(ConfigureTenantFilter), BindingFlags.NonPublic | BindingFlags.Static)?
            .MakeGenericMethod(entityType.ClrType);
        method?.Invoke(null, new object[] { modelBuilder, this });
    }
}

private static void ConfigureTenantFilter<T>(ModelBuilder builder, AppDbContext context) where T : class, ITenantScopedEntity
{
    builder.Entity<T>().HasQueryFilter(e => context.IsSuperAdmin || e.TenantId == context.CurrentTenantId);
}
```

### 3.3 Automatic Stamping via SaveChanges Interceptor
The `TenantAndAuditableSaveChangesInterceptor` automatically populates the `TenantId` on any newly inserted entity:
```csharp
if (entry.Entity is ITenantScopedEntity tenantEntity && entry.State == EntityState.Added)
{
    if (tenantEntity.TenantId == Guid.Empty)
    {
        tenantEntity.TenantId = _tenantContext.TenantId;
    }
    else if (tenantEntity.TenantId != _tenantContext.TenantId && !_tenantContext.IsSuperAdmin)
    {
        throw new TenantMismatchSecurityException("Cross-tenant entity creation rejected.");
    }
}
```

---

## 4. Tenant Lifecycle Management

1. **Registration & Provisioning**:
   - Tenant signs up with business details and selects an **Industry**.
   - Transaction creates: `Tenant` record, default Admin `User`, default Admin `Role` with initial permissions, `TenantIndustryConfig` based on industry template, and a 14-day `TenantSubscription` on the default Trial plan.
2. **Suspension & Expiry**:
   - Expired subscriptions lock write operations while permitting read-only access or redirecting to renewal checkout.
   - Suspended tenants (due to policy violation) are blocked immediately by tenant status validation in `TenantResolutionMiddleware`.
3. **Data Retention & Soft Deletion**:
   - Deactivated tenants are flagged as `Suspended` or `Archived`. Physical deletion is subjected to compliance retention policies.
