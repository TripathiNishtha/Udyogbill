using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Tenants;

public class Tenant : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "TNT-PHARMA-1001"
    public string BusinessName { get; set; } = string.Empty;
    public string TradeName { get; set; } = string.Empty;
    public string? LogoUrl { get; set; } // Company / Brand Logo URL / Base64 image
    public Guid IndustryId { get; set; }
    public Industry Industry { get; set; } = null!;

    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public string AdminEmail { get; set; } = string.Empty;
    public string PrimaryPhone { get; set; } = string.Empty;
    public string? AdminPassword { get; set; }
    public string? GSTIN { get; set; }
    public string? PAN { get; set; }
    public string? DrugLicenseNumber { get; set; } // Specific to Pharma/Medical
    public string? FSSAINumber { get; set; } // Specific to Food/Bakery/FMCG
    public string? UpiId { get; set; } // e.g. "apexpharma@okhdfcbank"
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankBranch { get; set; }

    // Complete Registered Address
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? Pincode { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }

    // Outgoing Mail / SMTP Server Configuration
    public string? SmtpHost { get; set; }
    public int? SmtpPort { get; set; }
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
    public string? SmtpFromEmail { get; set; }
    public string? SmtpFromName { get; set; }
    public bool? SmtpEnableSsl { get; set; }

    public string TimeZone { get; set; } = "Asia/Kolkata";
    public string CurrencyCode { get; set; } = "INR";
    public string CurrencySymbol { get; set; } = "₹";

    public bool IsActive { get; set; } = true;
    public DateTimeOffset? SuspendedAtUtc { get; set; }
    public string? SuspensionReason { get; set; }

    // Modular Industry Pack & Entitlements
    public string IndustryTypeCode { get; set; } = IndustryTypeCodes.Other;
    public string ActiveIndustryModule { get; set; } = IndustryTypeCodes.Other;
    public IndustryModuleStatus IndustryModuleStatus { get; set; } = IndustryModuleStatus.Active;
    public DateTimeOffset IndustryActivatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public int MaxAllowedUsers { get; set; } = 2;

    // AI Pro Add-on Module
    public bool IsAiAddonActive { get; set; } = true; // Active for premium subscribers
    public int AiScansLimit { get; set; } = 500; // Monthly scans quota
    public int AiScansUsed { get; set; } = 0;

    // Pharma ERP & SFA Add-On Suite
    public bool IsPharmaSfaActive { get; set; } = false;
    public int MaxAllowedMrUsers { get; set; } = 0;
    public int MaxAllowedManagerUsers { get; set; } = 0;

    public ICollection<TenantBranch> Branches { get; set; } = new List<TenantBranch>();
    public ICollection<TenantWarehouse> Warehouses { get; set; } = new List<TenantWarehouse>();
    public ICollection<TenantIndustryConfig> IndustryConfigs { get; set; } = new List<TenantIndustryConfig>();
    public ICollection<TenantSetting> Settings { get; set; } = new List<TenantSetting>();
}

public class TenantIndustryConfig : BaseTenantAuditableEntity
{
    public Guid IndustryId { get; set; }
    public Industry Industry { get; set; } = null!;

    public string ConfigurationJson { get; set; } = "{}"; // JSONB configuration overrides
    public bool EnableBatchTracking { get; set; }
    public bool EnableExpiryTracking { get; set; }
    public bool EnableSerialTracking { get; set; }
    public bool EnableMultiUnitConversion { get; set; }
    public bool EnableSizeColorMatrix { get; set; }
    public bool EnableRecipeBOM { get; set; }
    public bool EnableScheduleH1DrugTracking { get; set; }
    public bool EnableEWayBill { get; set; }
    public bool EnableEInvoicing { get; set; }
}

public class TenantBranch : BaseTenantAuditableEntity
{
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public string? GSTIN { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? StateCode { get; set; }
    public string? Pincode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsHeadOffice { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<TenantWarehouse> Warehouses { get; set; } = new List<TenantWarehouse>();
}

public class TenantWarehouse : BaseTenantAuditableEntity
{
    public Guid BranchId { get; set; }
    public TenantBranch Branch { get; set; } = null!;

    public string WarehouseCode { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string? Location { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
}

public class TenantSetting : BaseTenantAuditableEntity
{
    public string Category { get; set; } = string.Empty; // e.g. "Invoice", "Tax", "Inventory"
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string ValueType { get; set; } = "string"; // "string", "number", "boolean", "json"
}
