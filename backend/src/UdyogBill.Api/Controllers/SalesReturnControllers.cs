using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/sales-returns")]
public class TenantSalesReturnsController : BaseApiController
{
    private readonly ISalesService _salesService;

    public TenantSalesReturnsController(ISalesService salesService)
    {
        _salesService = salesService;
    }

    [HttpGet]
    [RequirePermission(Permissions.SalesReturn, Permissions.SalesView)]
    [ProducesResponseType(typeof(PagedResult<SalesReturnDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesReturns(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _salesService.GetSalesReturnsAsync(pageNumber, pageSize, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.SalesReturn, Permissions.SalesView)]
    [ProducesResponseType(typeof(SalesReturnDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesReturnById(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _salesService.GetSalesReturnByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [Idempotent]
    [RequirePermission(Permissions.SalesReturn, Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateSalesReturn([FromBody] CreateSalesReturnRequest request, CancellationToken cancellationToken = default)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.CreateSalesReturnAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }
}
