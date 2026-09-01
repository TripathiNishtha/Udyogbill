namespace UdyogBill.Domain.Common;

public interface ITenantScopedEntity
{
    Guid TenantId { get; set; }
}

public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTimeOffset? DeletedAtUtc { get; set; }
    Guid? DeletedBy { get; set; }
}

public interface IAuditableEntity
{
    DateTimeOffset CreatedAtUtc { get; set; }
    Guid? CreatedBy { get; set; }
    DateTimeOffset? UpdatedAtUtc { get; set; }
    Guid? UpdatedBy { get; set; }
}

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
}

public abstract class BaseAuditableEntity : BaseEntity, IAuditableEntity, ISoftDeletable
{
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset? UpdatedAtUtc { get; set; }
    public Guid? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTimeOffset? DeletedAtUtc { get; set; }
    public Guid? DeletedBy { get; set; }
}

public abstract class BaseTenantAuditableEntity : BaseAuditableEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
}
