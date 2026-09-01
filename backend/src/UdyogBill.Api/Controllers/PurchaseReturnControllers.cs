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
[Route("api/v1/tenant/purchase-returns")]
public class TenantPurchaseReturnsController : BaseApiController
{
    private readonly IPurchaseService _purchaseService;

    public TenantPurchaseReturnsController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    [HttpGet]
    [RequirePermission(Permissions.PurchaseReturn, Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PagedResult<PurchaseReturnDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseReturns(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _purchaseService.GetPurchaseReturnsAsync(pageNumber, pageSize, partyId, fromDate, toDate, searchTerm, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.PurchaseReturn, Permissions.PurchaseView)]
    [ProducesResponseType(typeof(PurchaseReturnDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseReturnById(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _purchaseService.GetPurchaseReturnByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [RequirePermission(Permissions.PurchaseReturn)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreatePurchaseReturn([FromBody] CreatePurchaseReturnRequest request, CancellationToken cancellationToken = default)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _purchaseService.CreatePurchaseReturnAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }
}
