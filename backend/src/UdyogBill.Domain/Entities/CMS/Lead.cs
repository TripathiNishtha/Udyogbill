using System;

namespace UdyogBill.Domain.Entities.CMS;

public class Lead
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;  // 10 digits
    public string Email { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string BusinessType { get; set; } = string.Empty;
    public string IndustryCode { get; set; } = "OTHER"; // PHARMA, FMCG, ELECTRONICS, GARMENTS, HARDWARE, SERVICE_SECTOR, OTHER
    public string Message { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;  // which page/form submitted from
    public string Status { get; set; } = "New";         // New / Contacted / Converted
    public string ConversionStage { get; set; } = "Lead"; // Lead, Contacted, TrialStarted, ConvertedPaid, Lost
    public decimal? PaidAmount { get; set; }            // Revenue attributed upon plan purchase
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ContactedAt { get; set; }
    public DateTime? TrialStartedAt { get; set; }
    public DateTime? ConvertedPaidAt { get; set; }
    public string Notes { get; set; } = string.Empty;   // admin notes

    // Organic & Digital Attribution
    public string? CitySlug { get; set; }
    public Guid? TenantId { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? LandingPage { get; set; }
    public string? ReferrerUrl { get; set; }
    public string? SearchKeyword { get; set; }
    public string? DeviceType { get; set; } // Desktop, Mobile, Tablet
}
