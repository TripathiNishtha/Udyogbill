using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/logistics")]
public class TenantLogisticsController : BaseApiController
{
    private readonly ILogisticsService _logisticsService;

    public TenantLogisticsController(ILogisticsService logisticsService)
    {
        _logisticsService = logisticsService;
    }

    #region Transporters

    [HttpGet("transporters")]
    [RequirePermission(Permissions.LogisticsView)]
    [ProducesResponseType(typeof(IReadOnlyList<TransporterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransporters(CancellationToken cancellationToken)
    {
        var result = await _logisticsService.GetTransportersAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("transporters")]
    [RequirePermission(Permissions.LogisticsManage)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateTransporter([FromBody] CreateTransporterRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _logisticsService.CreateTransporterAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Delivery Challans

    [HttpGet("challans")]
    [RequirePermission(Permissions.LogisticsView)]
    [ProducesResponseType(typeof(PagedResult<DeliveryChallanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChallans(
        [FromQuery] DispatchStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _logisticsService.GetDeliveryChallansAsync(status, pageNumber, pageSize, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("challans/{challanId:guid}")]
    [RequirePermission(Permissions.LogisticsView)]
    [ProducesResponseType(typeof(DeliveryChallanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChallanById(Guid challanId, CancellationToken cancellationToken)
    {
        var result = await _logisticsService.GetDeliveryChallanByIdAsync(challanId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("challans")]
    [RequirePermission(Permissions.LogisticsManage)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateChallan([FromBody] CreateDeliveryChallanRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _logisticsService.CreateDeliveryChallanAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("challans/from-invoice/{invoiceId:guid}")]
    [RequirePermission(Permissions.LogisticsManage)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateChallanFromInvoice(
        Guid invoiceId,
        [FromQuery] string? vehicleNumber,
        [FromQuery] Guid? transporterId,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _logisticsService.CreateChallanFromInvoiceAsync(invoiceId, vehicleNumber, transporterId, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("challans/{challanId:guid}/status")]
    [RequirePermission(Permissions.LogisticsManage)]
    [ProducesResponseType(typeof(DeliveryChallanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateDispatchStatus(
        Guid challanId,
        [FromBody] UpdateDispatchStatusRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _logisticsService.UpdateDispatchStatusAsync(challanId, request, ip, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region GST E-Way Bill

    [HttpPost("eway-bills/generate")]
    [RequirePermission(Permissions.LogisticsManage)]
    [ProducesResponseType(typeof(EWayBillResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateEWayBill([FromBody] GenerateEWayBillRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _logisticsService.GenerateEWayBillAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
