using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

// --- Category DTOs ---
public record CreateCategoryRequest(
    string Code,
    string Name,
    string? Description = null,
    Guid? ParentCategoryId = null,
    int DisplayOrder = 0
);

public record UpdateCategoryRequest(
    string Name,
    string? Description,
    Guid? ParentCategoryId,
    int DisplayOrder,
    bool IsActive
);

public record CategoryDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string Name,
    string? Description,
    Guid? ParentCategoryId,
    string? ParentCategoryName,
    int DisplayOrder,
    bool IsActive,
    int ItemsCount,
    IReadOnlyList<CategoryDto> SubCategories
);

// --- Brand DTOs ---
public record CreateBrandRequest(
    string Code,
    string Name,
    string? ManufacturerName = null,
    string? Description = null
);

public record UpdateBrandRequest(
    string Name,
    string? ManufacturerName,
    string? Description,
    bool IsActive
);

public record BrandDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string Name,
    string? ManufacturerName,
    string? Description,
    bool IsActive,
    int ItemsCount
);

// --- Unit of Measure DTOs ---
public record CreateUomRequest(
    string Code,
    string Name,
    string Symbol,
    int DecimalPlaces = 0
);

public record UpdateUomRequest(
    string Name,
    string Symbol,
    int DecimalPlaces,
    bool IsActive
);

public record UomDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string Name,
    string Symbol,
    int DecimalPlaces,
    bool IsActive
);

public record CreateUnitConversionRequest(
    Guid FromUomId,
    Guid ToUomId,
    decimal ConversionFactor
);

public record UnitConversionDto(
    Guid Id,
    Guid TenantId,
    Guid FromUomId,
    string FromUomCode,
    string FromUomName,
    Guid ToUomId,
    string ToUomCode,
    string ToUomName,
    decimal ConversionFactor
);

// --- Master Item DTOs ---
public record CreateItemRequest(
    string? Sku = null,
    string Name = "",
    string? ShortDescription = null,
    string? Barcode = null,
    ItemType ItemType = ItemType.Goods,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    Guid PrimaryUomId = default,
    Guid? SecondaryUomId = null,
    decimal? ConversionRatio = null,
    string? HSNCode = null,
    decimal TaxRate = 18.0m,
    decimal CessRate = 0m,
    bool IsTaxInclusive = false,
    decimal PurchasePrice = 0m,
    decimal SellingPrice = 0m,
    decimal MRP = 0m,
    decimal MinimumSellingPrice = 0m,
    decimal MinimumStockAlert = 0m,
    decimal MaximumStockAlert = 0m,
    decimal ReorderQuantity = 0m,
    bool TrackBatches = false,
    bool TrackSerialNumbers = false,
    bool TrackVariants = false,
    bool TrackInventory = true,
    string? AttributesJson = "{}",
    decimal InitialStock = 0m,
    Guid? InitialWarehouseId = null,
    string? InitialBatchNumber = null,
    DateTime? InitialBatchExpiryDate = null
);

public record UpdateItemRequest(
    string Name,
    string? ShortDescription,
    string? Barcode,
    ItemType ItemType,
    Guid? CategoryId,
    Guid? BrandId,
    Guid PrimaryUomId,
    Guid? SecondaryUomId,
    decimal? ConversionRatio,
    string? HSNCode,
    decimal TaxRate,
    decimal CessRate,
    bool IsTaxInclusive,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal MRP,
    decimal MinimumSellingPrice,
    decimal MinimumStockAlert,
    decimal MaximumStockAlert,
    decimal ReorderQuantity,
    bool TrackBatches,
    bool TrackSerialNumbers,
    bool TrackVariants,
    bool TrackInventory,
    string? AttributesJson,
    bool IsActive
);

public record ItemListDto(
    Guid Id,
    Guid TenantId,
    string Sku,
    string Name,
    string? Barcode,
    ItemType ItemType,
    string? CategoryName,
    string? BrandName,
    Guid PrimaryUomId,
    string PrimaryUomCode,
    string PrimaryUomSymbol,
    string? HSNCode,
    decimal TaxRate,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal MRP,
    decimal MinimumSellingPrice,
    decimal TotalStock,
    decimal MinimumStockAlert,
    bool IsLowStock,
    bool TrackBatches,
    bool TrackSerialNumbers,
    bool TrackVariants,
    bool TrackInventory,
    string AttributesJson,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

public record ItemDetailsDto(
    Guid Id,
    Guid TenantId,
    string Sku,
    string Name,
    string? ShortDescription,
    string? Barcode,
    ItemType ItemType,
    Guid? CategoryId,
    string? CategoryName,
    Guid? BrandId,
    string? BrandName,
    Guid PrimaryUomId,
    string PrimaryUomCode,
    string PrimaryUomName,
    Guid? SecondaryUomId,
    string? SecondaryUomCode,
    decimal? ConversionRatio,
    string? HSNCode,
    decimal TaxRate,
    decimal CessRate,
    bool IsTaxInclusive,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal MRP,
    decimal MinimumSellingPrice,
    decimal MinimumStockAlert,
    decimal MaximumStockAlert,
    decimal ReorderQuantity,
    bool TrackBatches,
    bool TrackSerialNumbers,
    bool TrackVariants,
    bool TrackInventory,
    string AttributesJson,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    decimal TotalStock,
    IReadOnlyList<ItemBatchDto> Batches,
    IReadOnlyList<WarehouseStockDto> WarehouseStocks
);

// --- Batch & Stock DTOs ---
public record CreateItemBatchRequest(
    Guid ItemId,
    Guid WarehouseId,
    string BatchNumber,
    DateTime? ManufacturingDate,
    DateTime ExpiryDate,
    decimal MRP,
    decimal PurchaseRate,
    decimal SaleRate,
    decimal InitialQuantity = 0m,
    string? Barcode = null
);

public record ItemBatchDto(
    Guid Id,
    Guid ItemId,
    string BatchNumber,
    DateTime? ManufacturingDate,
    DateTime ExpiryDate,
    decimal MRP,
    decimal PurchaseRate,
    decimal SaleRate,
    string? Barcode,
    decimal CurrentStock,
    bool IsExpired,
    bool IsNearExpiry,
    bool IsActive
);

public record WarehouseStockDto(
    Guid WarehouseId,
    string WarehouseCode,
    string WarehouseName,
    string BranchName,
    Guid? BatchId,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal CurrentQuantity,
    decimal ReservedQuantity,
    decimal AvailableQuantity,
    decimal ReorderLevel
);

public record StockAdjustmentRequest(
    Guid ItemId,
    Guid WarehouseId,
    Guid? BatchId,
    StockMovementType MovementType, // PhysicalAdjustment, DamageLoss, ExpiredWriteOff, PurchaseInward
    decimal QuantityChange, // positive or negative
    decimal UnitCost,
    string? ReferenceDocumentNumber = null,
    string? Notes = null
);

public record StockMovementDto(
    Guid Id,
    Guid TenantId,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    Guid WarehouseId,
    string WarehouseName,
    string? BatchNumber,
    StockMovementType MovementType,
    string MovementTypeName,
    decimal Quantity,
    decimal QuantityBefore,
    decimal QuantityAfter,
    decimal UnitCost,
    decimal TotalCost,
    string? ReferenceDocumentType,
    string? ReferenceDocumentNumber,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record LowStockItemDto(
    Guid ItemId,
    string Sku,
    string Name,
    string? CategoryName,
    string PrimaryUomCode,
    decimal CurrentStock,
    decimal MinimumStockAlert,
    decimal ReorderQuantity
);

// --- Stock Transfer DTOs ---
public record CreateStockTransferItemRequest
{
    public Guid ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal TransferQuantity { get; set; } = 1m;
}

public record CreateStockTransferRequest
{
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? DriverName { get; set; }
    public string? Notes { get; set; }
    public List<CreateStockTransferItemRequest> Items { get; set; } = new();
}

public record StockTransferItemDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string ItemSku,
    Guid? BatchId,
    string? BatchNumber,
    decimal TransferQuantity,
    decimal? ReceivedQuantity
);

public record StockTransferDto(
    Guid Id,
    string TransferNumber,
    DateTimeOffset TransferDate,
    Guid SourceWarehouseId,
    string SourceWarehouseName,
    Guid DestinationWarehouseId,
    string DestinationWarehouseName,
    string Status,
    string? VehicleNumber,
    string? DriverName,
    DateTimeOffset? DispatchedDate,
    DateTimeOffset? ReceivedDate,
    string? Notes,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<StockTransferItemDto> Items
);
