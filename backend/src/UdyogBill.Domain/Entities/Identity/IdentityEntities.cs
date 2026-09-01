using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Identity;

public class User : BaseAuditableEntity, ITenantScopedEntity
{
    // TenantId is null/Guid.Empty for system-level SuperAdmin users
    public Guid? TenantId { get; set; }
    Guid ITenantScopedEntity.TenantId
    {
        get => TenantId ?? Guid.Empty;
        set => TenantId = value == Guid.Empty ? null : value;
    }
    public Tenant? Tenant { get; set; }

    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Designation { get; set; }

    public bool IsSuperAdmin { get; set; }
    public bool IsTenantAdmin { get; set; }
    public bool IsActive { get; set; } = true;
    public bool EmailConfirmed { get; set; }
    public bool PhoneNumberConfirmed { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorSecret { get; set; }

    public int AccessFailedCount { get; set; }
    public DateTimeOffset? LockoutEndUtc { get; set; }
    public bool LockoutEnabled { get; set; } = true;

    public DateTimeOffset? LastLoginAtUtc { get; set; }
    public string? LastLoginIp { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class Role : BaseTenantAuditableEntity
{
    public string Name { get; set; } = string.Empty; // e.g. "Accountant", "Store Manager"
    public string Code { get; set; } = string.Empty; // e.g. "TENANT_ACCOUNTANT"
    public string Description { get; set; } = string.Empty;
    public bool IsSystemRole { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class UserRole : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RolePermission : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}

public class UserPermission : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;

    public bool IsGranted { get; set; } = true; // true = grant, false = explicit revoke override
}

public class RefreshToken : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedByIp { get; set; }
    public DateTimeOffset? RevokedAtUtc { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? ReasonRevoked { get; set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc != null;
    public bool IsActive => !IsRevoked && !IsExpired;
}
