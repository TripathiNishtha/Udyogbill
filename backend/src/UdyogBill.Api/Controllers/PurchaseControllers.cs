using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/purchase/orders")]
public class TenantPurchaseOrdersController : BaseApiController
{
    private readonly IPurchaseService _purchaseService;

    public TenantPurchaseOrdersController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    [HttpGet]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PagedResult<PurchaseOrderListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseOrders(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] PurchaseOrderStatus? status = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _purchaseService.GetPurchaseOrdersAsync(
            pageNumber, pageSize, status, branchId, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PurchaseOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPurchaseOrderById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetPurchaseOrderByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("number/{orderNumber}")]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PurchaseOrderDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPurchaseOrderByNumber(string orderNumber, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetPurchaseOrderByNumberAsync(orderNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [RequirePermission(Permissions.PurchaseCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CreatePurchaseOrderAsync(request, ipAddress, cancellationToken);
        if (!result.IsSuccess) return HandleResult(result);
        return CreatedAtAction(nameof(GetPurchaseOrderById), new { id = result.Data }, result.Data);
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.PurchaseCancel)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelPurchaseOrder(Guid id, [FromBody] CancelDocRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CancelPurchaseOrderAsync(id, request.CancellationReason, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/purchase/grn")]
public class TenantGrnController : BaseApiController
{
    private readonly IPurchaseService _purchaseService;

    public TenantGrnController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    [HttpGet]
    [RequirePermission(Permissions.PurchaseView, Permissions.InventoryView)]
    [ProducesResponseType(typeof(PagedResult<GrnListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGoodsReceiptNotes(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] GrnStatus? status = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? warehouseId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _purchaseService.GetGoodsReceiptNotesAsync(
            pageNumber, pageSize, status, branchId, warehouseId, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.PurchaseView, Permissions.InventoryView)]
    [ProducesResponseType(typeof(GrnDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGrnById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetGrnByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("number/{grnNumber}")]
    [RequirePermission(Permissions.PurchaseView, Permissions.InventoryView)]
    [ProducesResponseType(typeof(GrnDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGrnByNumber(string grnNumber, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetGrnByNumberAsync(grnNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [RequirePermission(Permissions.PurchaseCreate, Permissions.InventoryManage)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateGrn([FromBody] CreateGrnRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CreateGrnAsync(request, ipAddress, cancellationToken);
        if (!result.IsSuccess) return HandleResult(result);
        return CreatedAtAction(nameof(GetGrnById), new { id = result.Data }, result.Data);
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.PurchaseCancel, Permissions.InventoryManage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelGrn(Guid id, [FromBody] CancelDocRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CancelGrnAsync(id, request.CancellationReason, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/purchase/bills")]
public class TenantPurchaseBillsController : BaseApiController
{
    private readonly IPurchaseService _purchaseService;

    public TenantPurchaseBillsController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    [HttpGet]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PagedResult<PurchaseBillListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseBills(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] PurchaseBillStatus? status = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _purchaseService.GetPurchaseBillsAsync(
            pageNumber, pageSize, status, branchId, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PurchaseBillDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPurchaseBillById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetPurchaseBillByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("number/{billNumber}")]
    [RequirePermission(Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PurchaseBillDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPurchaseBillByNumber(string billNumber, CancellationToken cancellationToken)
    {
        var result = await _purchaseService.GetPurchaseBillByNumberAsync(billNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [RequirePermission(Permissions.PurchaseCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePurchaseBill([FromBody] CreatePurchaseBillRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CreatePurchaseBillAsync(request, ipAddress, cancellationToken);
        if (!result.IsSuccess) return HandleResult(result);
        return CreatedAtAction(nameof(GetPurchaseBillById), new { id = result.Data }, result.Data);
    }

    [HttpPost("{id:guid}/payments")]
    [RequirePermission(Permissions.PurchaseCreate, Permissions.BankingManage)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] RecordPurchaseBillPaymentRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.RecordPurchaseBillPaymentAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.PurchaseCancel)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelPurchaseBill(Guid id, [FromBody] CancelDocRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CancelPurchaseBillAsync(id, request.CancellationReason, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}
