using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/categories")]
public class TenantCategoriesController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantCategoriesController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetCategoriesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCategory(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetCategoryByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateCategoryAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.UpdateCategoryAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.DeleteCategoryAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/brands")]
public class TenantBrandsController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantBrandsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BrandDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBrands(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetBrandsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BrandDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBrand(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetBrandByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBrand([FromBody] CreateBrandRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateBrandAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateBrand(Guid id, [FromBody] UpdateBrandRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.UpdateBrandAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteBrand(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.DeleteBrandAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/units")]
public class TenantUnitsController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantUnitsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UomDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnits(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetUnitsOfMeasureAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateUnit([FromBody] CreateUomRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateUnitOfMeasureAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateUnit(Guid id, [FromBody] UpdateUomRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.UpdateUnitOfMeasureAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("conversions")]
    [ProducesResponseType(typeof(IReadOnlyList<UnitConversionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversions(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetUnitConversionsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("conversions")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateConversion([FromBody] CreateUnitConversionRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateUnitConversionAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("conversions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteConversion(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.DeleteUnitConversionAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/items")]
public class TenantItemsController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantItemsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ItemListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItems(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? searchTerm = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] Guid? brandId = null,
        [FromQuery] bool? lowStockOnly = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.GetItemsAsync(pageNumber, pageSize, searchTerm, categoryId, brandId, lowStockOnly, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ItemDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetItem(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetItemByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("barcode/{barcode}")]
    [ProducesResponseType(typeof(ItemDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetItemByBarcode(string barcode, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetItemByBarcodeAsync(barcode, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateItemAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateItem(Guid id, [FromBody] UpdateItemRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.UpdateItemAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.DeleteItemAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}/batches")]
    [ProducesResponseType(typeof(IReadOnlyList<ItemBatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBatches(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetItemBatchesAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/batches")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBatch(Guid id, [FromBody] CreateItemBatchRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateItemBatchAsync(request with { ItemId = id }, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/inventory")]
public class TenantInventoryController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantInventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet("stock")]
    [RequirePermission(Permissions.InventoryView)]
    [ProducesResponseType(typeof(IReadOnlyList<WarehouseStockDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockBalances(
        [FromQuery] Guid? itemId,
        [FromQuery] Guid? warehouseId,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetItemStockBalancesAsync(itemId, warehouseId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("movements")]
    [RequirePermission(Permissions.InventoryView)]
    [ProducesResponseType(typeof(PagedResult<StockMovementDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMovements(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? itemId = null,
        [FromQuery] Guid? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.GetStockMovementsAsync(pageNumber, pageSize, itemId, warehouseId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("adjustments")]
    [RequirePermission(Permissions.InventoryAdjust)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordAdjustment([FromBody] StockAdjustmentRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.RecordStockAdjustmentAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("low-stock")]
    [RequirePermission(Permissions.InventoryView)]
    [ProducesResponseType(typeof(IReadOnlyList<LowStockItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLowStockAlerts(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetLowStockAlertsAsync(cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/inventory/transfers")]
public class TenantStockTransfersController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public TenantStockTransfersController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    [RequirePermission(Permissions.InventoryTransfer, Permissions.InventoryView)]
    [ProducesResponseType(typeof(PagedResult<StockTransferDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransfers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? sourceWarehouseId = null,
        [FromQuery] Guid? destinationWarehouseId = null,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.GetStockTransfersAsync(pageNumber, pageSize, sourceWarehouseId, destinationWarehouseId, status, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.InventoryTransfer, Permissions.InventoryView)]
    [ProducesResponseType(typeof(StockTransferDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransferById(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _inventoryService.GetStockTransferByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [RequirePermission(Permissions.InventoryTransfer)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateStockTransferRequest request, CancellationToken cancellationToken = default)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.CreateStockTransferAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/receive")]
    [RequirePermission(Permissions.InventoryTransfer)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReceiveTransfer(Guid id, [FromQuery] string? notes = null, CancellationToken cancellationToken = default)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _inventoryService.ReceiveStockTransferAsync(id, notes, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}
