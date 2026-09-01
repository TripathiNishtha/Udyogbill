using UdyogBill.Domain.Common;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Auditing;

public class AuditLog : BaseEntity, ITenantScopedEntity
{
    // TenantId is nullable or Guid.Empty for platform-level / SuperAdmin actions
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }

    public AuditActionType Action { get; set; } = AuditActionType.Create;
    public string ActionName { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }

    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string? AffectedColumnsJson { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? CorrelationId { get; set; }
    public DateTimeOffset TimestampUtc { get; set; } = DateTimeOffset.UtcNow;
}
