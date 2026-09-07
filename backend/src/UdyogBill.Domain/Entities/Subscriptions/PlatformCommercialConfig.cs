using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Subscriptions;

public class PlatformCommercialConfig : BaseAuditableEntity
{
    // Core Subscription
    public decimal CoreAnnualPrice { get; set; } = 3999m; // 1 Year Core UdyogBill
    public decimal CoreBiennialPrice { get; set; } = 6999m; // 2 Years Deal
    public int IncludedUsers { get; set; } = 2; // Default 2 users included

    // User Add-Ons
    public decimal SingleUserAnnualPrice { get; set; } = 799m; // Additional single user / year
    public decimal FiveUserPackAnnualPrice { get; set; } = 2999m; // 5-User Pack / year

    // AI Pro Module Add-On
    public decimal AiProAnnualPrice { get; set; } = 1499m; // Configurable AI Pro price
    public int AiProMonthlyScanLimit { get; set; } = 500; // Monthly scans quota

    // Tax
    public decimal GstRatePercent { get; set; } = 18.0m;

    // Pharma ERP + SFA Add-On Suite Pricing
    public decimal PharmaSfaAnnualBasePrice { get; set; } = 19999m; // Base Pharma Add-on / year
    public decimal PharmaSfaMonthlyBasePrice { get; set; } = 1999m; // Base Pharma Add-on / month
    public decimal MrSeatAnnualPrice { get; set; } = 4999m; // Per MR Seat / year
    public decimal MrSeatMonthlyPrice { get; set; } = 499m; // Per MR Seat / month
    public decimal ManagerSeatAnnualPrice { get; set; } = 6999m; // Per Manager Seat / year
    public decimal ManagerSeatMonthlyPrice { get; set; } = 699m; // Per Manager Seat / month

    public bool IsActive { get; set; } = true;
    public string? LastUpdatedByEmail { get; set; }
    public string? Notes { get; set; }
}