using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/quotations")]
public class TenantQuotationsController : BaseApiController
{
    private readonly IQuotationService _quotationService;
    private readonly ITenantContext _tenantContext;
    private readonly ISyncNotificationService _syncNotificationService;

    public TenantQuotationsController(
        IQuotationService quotationService,
        ITenantContext tenantContext,
        ISyncNotificationService syncNotificationService)
    {
        _quotationService = quotationService;
        _tenantContext = tenantContext;
        _syncNotificationService = syncNotificationService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<QuotationListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuotations(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] QuotationStatus? status = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _quotationService.GetQuotationsAsync(
            pageNumber, pageSize, status, branchId, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(QuotationDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuotationById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _quotationService.GetQuotationByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("number/{quotationNumber}")]
    [ProducesResponseType(typeof(QuotationDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuotationByNumber(string quotationNumber, CancellationToken cancellationToken)
    {
        var result = await _quotationService.GetQuotationByNumberAsync(quotationNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateQuotation([FromBody] CreateQuotationRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.CreateQuotationAsync(request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "quotation.created", new
            {
                quotationId = result.Data,
                partyId = request.PartyId,
                totalAmount = request.Items.Sum(x => x.Quantity * x.UnitPrice),
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateQuotation(Guid id, [FromBody] CreateQuotationRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.UpdateQuotationAsync(id, request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "quotation.updated", new
            {
                quotationId = id,
                partyId = request.PartyId,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/convert-to-invoice")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConvertToInvoice(Guid id, [FromBody] ConvertQuotationRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.ConvertQuotationToInvoiceAsync(id, request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "invoice.created", new
            {
                invoiceId = result.Data,
                source = "quotation_converted"
            }, cancellationToken);
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "quotation.converted", new
            {
                quotationId = id,
                invoiceId = result.Data,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelQuotation(Guid id, [FromBody] CancelDocRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.CancelQuotationAsync(id, request.CancellationReason, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "quotation.cancelled", new
            {
                quotationId = id,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }
}
