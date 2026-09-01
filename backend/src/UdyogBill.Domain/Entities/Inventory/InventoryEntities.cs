using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Inventory;

public enum ItemType
{
    Goods = 1,
    Service = 2,
    RawMaterial = 3,
    Manufactured = 4
}

public enum StockMovementType
{
    PurchaseInward = 1,
    SalesOutward = 2,
    TransferIn = 3,
    TransferOut = 4,
    PhysicalAdjustment = 5,
    DamageLoss = 6,
    ExpiredWriteOff = 7,
    SalesReturn = 8,
    PurchaseReturn = 9
}

public class Category : BaseTenantAuditableEntity
{
    public Guid? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();

    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Item> Items { get; set; } = new List<Item>();
}

public class Brand : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ManufacturerName { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Item> Items { get; set; } = new List<Item>();
}

public class UnitOfMeasure : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "BOX", "STRIP", "TAB", "PCS", "KG", "LTR", "MTR"
    public string Name { get; set; } = string.Empty; // e.g. "Box", "Strip", "Tablet", "Pieces"
    public string Symbol { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 0; // e.g. 0 for PCS/BOX, 3 for KG/LTR
    public bool IsActive { get; set; } = true;

    public ICollection<UnitConversion> FromConversions { get; set; } = new List<UnitConversion>();
    public ICollection<UnitConversion> ToConversions { get; set; } = new List<UnitConversion>();
}

public class UnitConversion : BaseTenantAuditableEntity
{
    public Guid FromUomId { get; set; }
    public UnitOfMeasure FromUom { get; set; } = null!;

    public Guid ToUomId { get; set; }
    public UnitOfMeasure ToUom { get; set; } = null!;

    public decimal ConversionFactor { get; set; } // e.g. 1 FromUom = (ConversionFactor) ToUom (1 BOX = 10 STRIP)
}

public class Item : BaseTenantAuditableEntity
{
    public string Sku { get; set; } = string.Empty; // Unique SKU/Item Code
    public string Name { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? Barcode { get; set; } // EAN-13, UPC, or custom barcode

    public ItemType ItemType { get; set; } = ItemType.Goods;

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public Guid? BrandId { get; set; }
    public Brand? Brand { get; set; }

    public Guid PrimaryUomId { get; set; }
    public UnitOfMeasure PrimaryUom { get; set; } = null!;

    public Guid? SecondaryUomId { get; set; }
    public UnitOfMeasure? SecondaryUom { get; set; }

    public decimal? ConversionRatio { get; set; } // e.g. 1 Primary = ConversionRatio Secondary

    // Taxation & Statutory (GST India Compliant)
    public string? HSNCode { get; set; } // HSN (Goods) or SAC (Services)
    public decimal TaxRate { get; set; } = 18.0m; // 0%, 5%, 12%, 18%, 28%
    public decimal CessRate { get; set; } = 0m;
    public bool IsTaxInclusive { get; set; } = false;

    // Pricing
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal MRP { get; set; }
    public decimal MinimumSellingPrice { get; set; }

    // Inventory Controls
    public decimal MinimumStockAlert { get; set; } = 0;
    public decimal MaximumStockAlert { get; set; } = 0;
    public decimal ReorderQuantity { get; set; } = 0;

    // Capability Flags
    public bool TrackInventory { get; set; } = true;
    public bool TrackBatches { get; set; }
    public bool TrackSerialNumbers { get; set; }
    public bool TrackVariants { get; set; }

    // Dynamic Multi-Industry JSONB Attributes (Pharma, Apparel, FMCG, Electronics, Food, etc.)
    public string AttributesJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    // Relations
    public ICollection<ItemBatch> Batches { get; set; } = new List<ItemBatch>();
    public ICollection<ItemSerialNumber> SerialNumbers { get; set; } = new List<ItemSerialNumber>();
    public ICollection<ItemVariant> Variants { get; set; } = new List<ItemVariant>();
    public ICollection<ItemWarehouseStock> WarehouseStocks { get; set; } = new List<ItemWarehouseStock>();
}

public class ItemBatch : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ManufacturingDate { get; set; }
    public DateTime ExpiryDate { get; set; }

    public decimal MRP { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal SaleRate { get; set; }
    public decimal Ptr { get; set; } // Price to Retailer
    public decimal Pts { get; set; } // Price to Stockist
    public decimal QuarantinedStock { get; set; } // Expired/Damaged quarantine stock
    public string? RackLocation { get; set; } // Shelf/Bin ID (e.g. A-12-3)
    public Guid? SupplierId { get; set; }
    public bool IsQuarantined { get; set; }

    public string? Barcode { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ItemWarehouseStock> WarehouseStocks { get; set; } = new List<ItemWarehouseStock>();
}

public class ItemSerialNumber : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public string SerialNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "InStock"; // InStock, Sold, Transferred, Damaged, Returned
    public DateTime? WarrantyExpiresAt { get; set; }
}

public class ItemVariant : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string VariantSku { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public string AttributesJson { get; set; } = "{}"; // e.g. {"size": "XL", "color": "Navy Blue"}
    public decimal PriceAdjustment { get; set; } = 0;
    public string? Barcode { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ItemWarehouseStock : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }

    public decimal CurrentQuantity { get; set; }
    public decimal ReservedQuantity { get; set; } // Quantity locked for active sales/orders
    public decimal AvailableQuantity => CurrentQuantity - ReservedQuantity;
    public decimal ReorderLevel { get; set; }
}

public class StockMovement : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }

    public StockMovementType MovementType { get; set; }
    public decimal Quantity { get; set; } // Positive for inward, negative for outward
    public decimal QuantityBefore { get; set; }
    public decimal QuantityAfter { get; set; }

    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }

    public string? ReferenceDocumentType { get; set; } // e.g. "PurchaseInvoice", "SalesInvoice", "StockTransfer", "PhysicalAudit"
    public Guid? ReferenceDocumentId { get; set; }
    public string? ReferenceDocumentNumber { get; set; }

    public string? Notes { get; set; }
}

public class StockTransfer : BaseTenantAuditableEntity
{
    public string TransferNumber { get; set; } = string.Empty;
    public DateTimeOffset TransferDate { get; set; } = DateTimeOffset.UtcNow;
    public Guid SourceWarehouseId { get; set; }
    public TenantWarehouse SourceWarehouse { get; set; } = null!;
    public Guid DestinationWarehouseId { get; set; }
    public TenantWarehouse DestinationWarehouse { get; set; } = null!;
    public string Status { get; set; } = "Dispatched"; // Dispatched, Received, Cancelled
    public string? VehicleNumber { get; set; }
    public string? DriverName { get; set; }
    public DateTimeOffset? DispatchedDate { get; set; }
    public DateTimeOffset? ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public ICollection<StockTransferItem> Items { get; set; } = new List<StockTransferItem>();
}

public class StockTransferItem : BaseTenantAuditableEntity
{
    public Guid StockTransferId { get; set; }
    public StockTransfer StockTransfer { get; set; } = null!;
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal TransferQuantity { get; set; } = 0m;
    public decimal? ReceivedQuantity { get; set; }
}
