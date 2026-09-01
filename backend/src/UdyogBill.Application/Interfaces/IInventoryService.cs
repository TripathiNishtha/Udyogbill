using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IInventoryService
{
    // Categories
    Task<Result<IReadOnlyList<CategoryDto>>> GetCategoriesAsync(CancellationToken cancellationToken = default);
    Task<Result<CategoryDto>> GetCategoryByIdAsync(Guid categoryId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateCategoryAsync(CreateCategoryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteCategoryAsync(Guid categoryId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Brands
    Task<Result<IReadOnlyList<BrandDto>>> GetBrandsAsync(CancellationToken cancellationToken = default);
    Task<Result<BrandDto>> GetBrandByIdAsync(Guid brandId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateBrandAsync(CreateBrandRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateBrandAsync(Guid brandId, UpdateBrandRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteBrandAsync(Guid brandId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Units of Measure & Conversions
    Task<Result<IReadOnlyList<UomDto>>> GetUnitsOfMeasureAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateUnitOfMeasureAsync(CreateUomRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateUnitOfMeasureAsync(Guid uomId, UpdateUomRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<UnitConversionDto>>> GetUnitConversionsAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateUnitConversionAsync(CreateUnitConversionRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteUnitConversionAsync(Guid conversionId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Master Items
    Task<Result<PagedResult<ItemListDto>>> GetItemsAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm = null,
        Guid? categoryId = null,
        Guid? brandId = null,
        bool? lowStockOnly = null,
        CancellationToken cancellationToken = default
    );
    Task<Result<ItemDetailsDto>> GetItemByIdAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result<ItemDetailsDto>> GetItemByBarcodeAsync(string barcode, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateItemAsync(CreateItemRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateItemAsync(Guid itemId, UpdateItemRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteItemAsync(Guid itemId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Batches
    Task<Result<IReadOnlyList<ItemBatchDto>>> GetItemBatchesAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateItemBatchAsync(CreateItemBatchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Stock Ledger & Adjustments
    Task<Result<IReadOnlyList<WarehouseStockDto>>> GetItemStockBalancesAsync(Guid? itemId = null, Guid? warehouseId = null, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<StockMovementDto>>> GetStockMovementsAsync(
        int pageNumber,
        int pageSize,
        Guid? itemId = null,
        Guid? warehouseId = null,
        CancellationToken cancellationToken = default
    );
    Task<Result<Guid>> RecordStockAdjustmentAsync(StockAdjustmentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<LowStockItemDto>>> GetLowStockAlertsAsync(CancellationToken cancellationToken = default);

    // Stock Transfers
    Task<Result<PagedResult<StockTransferDto>>> GetStockTransfersAsync(
        int pageNumber,
        int pageSize,
        Guid? sourceWarehouseId = null,
        Guid? destinationWarehouseId = null,
        string? status = null,
        CancellationToken cancellationToken = default
    );
    Task<Result<StockTransferDto>> GetStockTransferByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateStockTransferAsync(CreateStockTransferRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> ReceiveStockTransferAsync(Guid id, string? notes = null, string? ipAddress = null, CancellationToken cancellationToken = default);
}
