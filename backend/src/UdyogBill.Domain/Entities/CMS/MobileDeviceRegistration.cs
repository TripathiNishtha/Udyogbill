using System;

namespace UdyogBill.Domain.Entities.CMS;

public class MobileDeviceRegistration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DeviceId { get; set; } = string.Empty; // Unique hardware/installation UUID from mobile
    public string? TenantId { get; set; }
    public string? PushToken { get; set; }
    public string DeviceModel { get; set; } = string.Empty; // e.g. Samsung Galaxy S21
    public string OsVersion { get; set; } = string.Empty; // Android 14
    public int AppVersionCode { get; set; } = 1;
    public string AppVersionName { get; set; } = "1.0.0";
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
}
