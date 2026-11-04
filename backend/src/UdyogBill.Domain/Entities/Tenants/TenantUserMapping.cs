using System;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Identity;

namespace UdyogBill.Domain.Entities.Tenants;

public class TenantUserMapping : BaseEntity
{
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public bool IsOwner { get; set; } = false;
    public string Role { get; set; } = "TenantAdmin"; // e.g. "TenantAdmin", "Accountant", "Staff"
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
