using UdyogBill.Domain.Common;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Catalog;

public class Industry : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "PHARMA", "FMCG", "GARMENTS"
    public string Name { get; set; } = string.Empty; // e.g. "Pharmaceuticals & Healthcare"
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? DefaultConfigJson { get; set; } // JSON configuration for industry defaults

    public ICollection<IndustryModule> IndustryModules { get; set; } = new List<IndustryModule>();
    public ICollection<IndustryFeature> IndustryFeatures { get; set; } = new List<IndustryFeature>();
}

public class Module : BaseAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "SALES", "PURCHASE", "INVENTORY", "GST"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsCore { get; set; } = true; // Core modules are present across all industries
    public bool IsActive { get; set; } = true;

    public ICollection<Feature> Features { get; set; } = new List<Feature>();
    public ICollection<IndustryModule> IndustryModules { get; set; } = new List<IndustryModule>();
}

public class IndustryModule : BaseEntity
{
    public Guid IndustryId { get; set; }
    public Industry Industry { get; set; } = null!;

    public Guid ModuleId { get; set; }
    public Module Module { get; set; } = null!;

    public bool IsMandatory { get; set; } = true;
    public bool IsDefaultEnabled { get; set; } = true;
}

public class Feature : BaseAuditableEntity
{
    public Guid ModuleId { get; set; }
    public Module Module { get; set; } = null!;

    public string Code { get; set; } = string.Empty; // e.g. "BATCH_TRACKING", "SERIAL_TRACKING"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FeatureType FeatureType { get; set; } = FeatureType.Standard;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    public ICollection<SubFeature> SubFeatures { get; set; } = new List<SubFeature>();
    public ICollection<Permission> Permissions { get; set; } = new List<Permission>();
    public ICollection<IndustryFeature> IndustryFeatures { get; set; } = new List<IndustryFeature>();
}

public class IndustryFeature : BaseEntity
{
    public Guid IndustryId { get; set; }
    public Industry Industry { get; set; } = null!;

    public Guid FeatureId { get; set; }
    public Feature Feature { get; set; } = null!;

    public bool IsEnabledByDefault { get; set; } = true;
    public string? DefaultConfigJson { get; set; }
}

public class SubFeature : BaseAuditableEntity
{
    public Guid FeatureId { get; set; }
    public Feature Feature { get; set; } = null!;

    public string Code { get; set; } = string.Empty; // e.g. "AUTO_BATCH_SELECTION"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<Permission> Permissions { get; set; } = new List<Permission>();
}

public class Permission : BaseAuditableEntity
{
    public Guid? FeatureId { get; set; }
    public Feature? Feature { get; set; }

    public Guid? SubFeatureId { get; set; }
    public SubFeature? SubFeature { get; set; }

    public string Code { get; set; } = string.Empty; // e.g. "sales.invoice.create"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty; // e.g. "Sales", "Inventory"
    public bool IsSystem { get; set; } = true;
}
