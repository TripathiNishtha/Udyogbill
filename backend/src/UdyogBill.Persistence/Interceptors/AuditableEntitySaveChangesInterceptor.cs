using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Common;
using UdyogBill.Shared.Exceptions;

namespace UdyogBill.Persistence.Interceptors;

public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;

    public AuditableEntitySaveChangesInterceptor(
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext)
    {
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public void UpdateEntities(DbContext? context)
    {
        if (context == null) return;

        var now = DateTimeOffset.UtcNow;
        var currentUserId = _currentUserContext.UserId;
        var currentTenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.IsSuperAdmin || _currentUserContext.IsSuperAdmin;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            // 1. Multi-Tenant Stamping & Isolation Check
            if (entry.Entity is ITenantScopedEntity tenantEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    if (tenantEntity.TenantId == Guid.Empty)
                    {
                        if (currentTenantId != Guid.Empty)
                        {
                            tenantEntity.TenantId = currentTenantId;
                        }
                    }
                    else if (tenantEntity.TenantId != currentTenantId && !isSuperAdmin && currentTenantId != Guid.Empty)
                    {
                        throw new TenantIsolationViolationException($"Attempted to create entity for foreign tenant {tenantEntity.TenantId}.");
                    }
                }
                else if (entry.State == EntityState.Modified || entry.State == EntityState.Deleted)
                {
                    if (tenantEntity.TenantId != Guid.Empty && tenantEntity.TenantId != currentTenantId && !isSuperAdmin && currentTenantId != Guid.Empty)
                    {
                        throw new TenantIsolationViolationException($"Unauthorized cross-tenant mutation attempted on entity of tenant {tenantEntity.TenantId}.");
                    }
                }
            }

            // 2. Auditing Fields (CreatedAt, UpdatedAt, CreatedBy, UpdatedBy)
            if (entry.Entity is IAuditableEntity auditableEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    auditableEntity.CreatedAtUtc = now;
                    auditableEntity.CreatedBy = currentUserId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    auditableEntity.UpdatedAtUtc = now;
                    auditableEntity.UpdatedBy = currentUserId;
                }
            }

            // 3. Soft Delete Handling
            if (entry.Entity is ISoftDeletable softDeletable && entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                softDeletable.IsDeleted = true;
                softDeletable.DeletedAtUtc = now;
                softDeletable.DeletedBy = currentUserId;
            }
        }
    }
}
