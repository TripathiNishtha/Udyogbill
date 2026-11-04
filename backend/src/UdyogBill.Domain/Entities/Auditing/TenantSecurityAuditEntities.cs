using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Auditing;

public class TenantDeviceSession : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserFullName { get; set; }

    // Hardware Identity
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "Mobile"; // Mobile, Desktop, Tablet, POS
    public string Brand { get; set; } = string.Empty; // Samsung, Xiaomi, Apple, Dell, Windows
    public string Model { get; set; } = string.Empty; // Galaxy S23, Redmi Note 12, PC
    public string OsName { get; set; } = string.Empty; // Android, iOS, Windows, macOS
    public string OsVersion { get; set; } = string.Empty; // 14, 11 Pro, 17.5
    public string AppVersion { get; set; } = string.Empty; // 2.1.4, Web Chrome 126

    // Network & SIM Telemetry
    public string ConnectionType { get; set; } = "WiFi"; // WiFi, MobileData, Ethernet
    public bool IsDualSim { get; set; }
    public string? Sim1Carrier { get; set; } // Jio 4G, Airtel
    public string? Sim2Carrier { get; set; } // Vi, BSNL
    public string? SimPhoneNumber { get; set; }

    // Geolocation & ISP
    public string IpAddress { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "IN";
    public string? IspName { get; set; }

    // Session Status
    public DateTimeOffset FirstSeenAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActiveAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public bool IsOnline { get; set; } = true;
    public string? LastActionName { get; set; }
}

public class TenantLoginHistory : BaseEntity, ITenantScopedEntity
{
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public string AttemptedIdentifier { get; set; } = string.Empty;
    public bool IsSuccessful { get; set; }
    public string? FailureReason { get; set; }
    public string AuthChannel { get; set; } = "MobileApp"; // MobileApp, WebPortal, Impersonation

    // Snapshot at login
    public string DeviceSummary { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; } = "IN";
    public string? IspName { get; set; }
    public string? ConnectionType { get; set; }
    public DateTimeOffset LoggedInAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
