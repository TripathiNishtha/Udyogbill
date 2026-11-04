using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Catalog;

public class GlobalProductCatalog : BaseAuditableEntity
{
    public string Barcode { get; set; } = string.Empty; // EAN-13, UPC, Code128, etc. (Unique Index)
    public string ProductName { get; set; } = string.Empty;
    public string? BrandName { get; set; }
    public string? CategoryName { get; set; }
    public string? HsnCode { get; set; }
    public decimal TaxRate { get; set; } = 18.0m;
    public decimal MRP { get; set; } = 0m;
    public string UnitCode { get; set; } = "PCS";
    public string IndustryCode { get; set; } = "FMCG"; // FMCG, GARMENTS, PHARMA, HARDWARE, ELECTRONICS
    public string? ShortDescription { get; set; }
    public string AttributesJson { get; set; } = "{}"; // Standard size, color, pack size
    public bool IsVerified { get; set; } = true;
}
