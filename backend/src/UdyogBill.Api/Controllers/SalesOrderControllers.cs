using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/sales-orders")]
public class TenantSalesOrdersController : BaseApiController
{
    private readonly ISalesOrderService _salesOrderService;

    public TenantSalesOrdersController(ISalesOrderService salesOrderService)
    {
        _salesOrderService = salesOrderService;
    }

    [HttpGet]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(PagedResult<SalesOrderListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesOrders(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] SalesOrderStatus? status = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _salesOrderService.GetSalesOrdersAsync(
            pageNumber, pageSize, status, branchId, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(SalesOrderDetailsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesOrderById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _salesOrderService.GetSalesOrderByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [Idempotent]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateSalesOrder(
        [FromBody] CreateSalesOrderRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.CreateSalesOrderAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSalesOrder(
        Guid id,
        [FromBody] CreateSalesOrderRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.UpdateSalesOrderAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("from-quotation/{quotationId:guid}")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConvertQuotationToSalesOrder(
        Guid quotationId,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.ConvertQuotationToSalesOrderAsync(quotationId, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/convert-to-invoice")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConvertToInvoice(
        Guid id,
        [FromBody] ConvertSalesOrderRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.ConvertSalesOrderToInvoiceAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/convert-to-challan")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConvertToChallan(
        Guid id,
        [FromBody] ConvertSalesOrderRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.ConvertSalesOrderToChallanAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> CancelSalesOrder(
        Guid id,
        [FromQuery] string cancellationReason = "Customer Request",
        CancellationToken cancellationToken = default)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesOrderService.CancelSalesOrderAsync(id, cancellationReason, ip, cancellationToken);
        return HandleResult(result);
    }
}
