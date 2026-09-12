using System;

namespace UdyogBill.Domain.Entities.CMS;

public class MobilePushBroadcast
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ActionRoute { get; set; } // e.g. "expiry_radar", "pos", "pricing", "whatsapp"
    public string TargetSegment { get; set; } = "all"; // all, inactive_7d, free_tier
    public int DeliveredCount { get; set; } = 0;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public string SentBySuperAdmin { get; set; } = string.Empty;
}
