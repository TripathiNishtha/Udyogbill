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

    public TenantQuotationsController(IQuotationService quotationService)
    {
        _quotationService = quotationService;
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
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/convert-to-invoice")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConvertToInvoice(Guid id, [FromBody] ConvertQuotationRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.ConvertQuotationToInvoiceAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelQuotation(Guid id, [FromBody] CancelDocRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _quotationService.CancelQuotationAsync(id, request.CancellationReason, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}
