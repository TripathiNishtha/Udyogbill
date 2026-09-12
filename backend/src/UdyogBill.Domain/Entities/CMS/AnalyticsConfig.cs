using System;

namespace UdyogBill.Domain.Entities.CMS;

public class AnalyticsConfig
{
    public int Id { get; set; } = 1; // Single row config
    public string Ga4PropertyId { get; set; } = string.Empty;       // e.g. "properties/123456789"
    public string Ga4ServiceAccountJson { get; set; } = string.Empty; // Full JSON key content
    public string GscSiteUrl { get; set; } = string.Empty;          // e.g. "https://udyogbill.com/"
    public string GscServiceAccountJson { get; set; } = string.Empty; // Can be same as GA4
    public bool IsGa4Enabled { get; set; } = false;
    public bool IsGscEnabled { get; set; } = false;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
