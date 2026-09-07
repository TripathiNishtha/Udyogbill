using System;
using System.Collections.Generic;
using System.Linq;

namespace UdyogBill.Domain.Enums;

public static class IndustryTypeCodes
{
    public const string Pharma = "PHARMA";
    public const string Fmcg = "FMCG";
    public const string Electronics = "ELECTRONICS";
    public const string Garments = "GARMENTS";
    public const string Hardware = "HARDWARE";
    public const string ServiceSector = "SERVICE_SECTOR";
    public const string Other = "OTHER";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Pharma,
        Fmcg,
        Electronics,
        Garments,
        Hardware,
        ServiceSector,
        Other
    };

    public static string Normalize(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return Other;
        var upper = code.Trim().ToUpperInvariant();
        return All.Contains(upper) ? upper : Other;
    }
}

public enum IndustryModuleStatus
{
    Inactive = 0,
    Active = 1,
    PendingConfiguration = 2
}

public record IndustryModuleDescriptor(
    string Code,
    string DisplayName,
    string Description,
    string Icon,
    int DisplayOrder,
    bool EnableBatchTracking,
    bool EnableExpiryTracking,
    bool EnableSerialTracking,
    bool EnableMultiUnitConversion,
    bool EnableSizeColorMatrix,
    bool EnableRecipeBOM,
    bool EnableScheduleH1DrugTracking,
    bool EnableEWayBill,
    bool EnableEInvoicing,
    bool EnableImeiTracking = false,
    bool EnableWarrantyTracking = false,
    bool EnableTradeTiers = false,
    bool EnableDimensionEngine = false,
    bool EnableSchemes = false,
    bool EnableServiceBilling = false
);

public static class IndustryModuleRegistry
{
    private static readonly Dictionary<string, IndustryModuleDescriptor> Descriptors = new(StringComparer.OrdinalIgnoreCase)
    {
        [IndustryTypeCodes.Pharma] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Pharma,
            DisplayName: "Pharmaceuticals & Healthcare",
            Description: "Medicine retail & wholesale with Batch, Expiry, Salt/Composition, and Schedule H1 Compliance",
            Icon: "activity",
            DisplayOrder: 1,
            EnableBatchTracking: true,
            EnableExpiryTracking: true,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: true,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: true,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: true,
            EnableDimensionEngine: false,
            EnableSchemes: true,
            EnableServiceBilling: false
        ),
        [IndustryTypeCodes.Fmcg] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Fmcg,
            DisplayName: "FMCG Distribution & Grocery",
            Description: "Fast Moving Consumer Goods with Multi-UOM packaging, Schemes (10+1 Free), and Expiry alerts",
            Icon: "truck",
            DisplayOrder: 2,
            EnableBatchTracking: true,
            EnableExpiryTracking: true,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: true,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: true,
            EnableDimensionEngine: false,
            EnableSchemes: true,
            EnableServiceBilling: false
        ),
        [IndustryTypeCodes.Electronics] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Electronics,
            DisplayName: "Electronics, Appliances & Mobile",
            Description: "Electronics retail & wholesale with Serial number, IMEI tracking, and Warranty records",
            Icon: "tv",
            DisplayOrder: 3,
            EnableBatchTracking: false,
            EnableExpiryTracking: false,
            EnableSerialTracking: true,
            EnableMultiUnitConversion: false,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: true,
            EnableWarrantyTracking: true,
            EnableTradeTiers: true,
            EnableDimensionEngine: false,
            EnableSchemes: false,
            EnableServiceBilling: false
        ),
        [IndustryTypeCodes.Garments] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Garments,
            DisplayName: "Garments, Apparel & Footwear",
            Description: "Clothing & footwear with 2D Size-Color-Fit SKU Matrix and barcode garment tags",
            Icon: "tag",
            DisplayOrder: 4,
            EnableBatchTracking: false,
            EnableExpiryTracking: false,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: false,
            EnableSizeColorMatrix: true,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: true,
            EnableDimensionEngine: false,
            EnableSchemes: false,
            EnableServiceBilling: false
        ),
        [IndustryTypeCodes.Hardware] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Hardware,
            DisplayName: "Hardware, Paint & Building Materials",
            Description: "Hardware stores with dimension/weight conversions, multi-tier pricing, and brand grouping",
            Icon: "tool",
            DisplayOrder: 5,
            EnableBatchTracking: false,
            EnableExpiryTracking: false,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: true,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: true,
            EnableDimensionEngine: true,
            EnableSchemes: false,
            EnableServiceBilling: false
        ),
        [IndustryTypeCodes.ServiceSector] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.ServiceSector,
            DisplayName: "Service Sector & Consulting",
            Description: "Consulting, repairs, and professional services with job sheets and recurring invoicing",
            Icon: "briefcase",
            DisplayOrder: 6,
            EnableBatchTracking: false,
            EnableExpiryTracking: false,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: false,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: false,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: true,
            EnableDimensionEngine: false,
            EnableSchemes: false,
            EnableServiceBilling: true
        ),
        [IndustryTypeCodes.Other] = new IndustryModuleDescriptor(
            Code: IndustryTypeCodes.Other,
            DisplayName: "General Trading & Retail",
            Description: "Standard retail & wholesale trading with multi-rate GST, POS invoicing, and stock ledger",
            Icon: "globe",
            DisplayOrder: 7,
            EnableBatchTracking: false,
            EnableExpiryTracking: false,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: false,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: false,
            EnableEWayBill: true,
            EnableEInvoicing: true,
            EnableImeiTracking: false,
            EnableWarrantyTracking: false,
            EnableTradeTiers: false,
            EnableDimensionEngine: false,
            EnableSchemes: false,
            EnableServiceBilling: false
        )
    };

    public static IReadOnlyList<IndustryModuleDescriptor> GetAllSupportedIndustries()
    {
        return Descriptors.Values.OrderBy(d => d.DisplayOrder).ToList();
    }

    public static IndustryModuleDescriptor GetDescriptor(string? code)
    {
        var normalized = IndustryTypeCodes.Normalize(code);
        return Descriptors.TryGetValue(normalized, out var descriptor) ? descriptor : Descriptors[IndustryTypeCodes.Other];
    }

    public static bool IsValidIndustry(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        return Descriptors.ContainsKey(code.Trim());
    }
}