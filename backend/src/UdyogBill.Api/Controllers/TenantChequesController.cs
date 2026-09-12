using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/cheques")]
public class TenantChequesController : BaseApiController
{
    private readonly IChequeService _chequeService;

    public TenantChequesController(IChequeService chequeService)
    {
        _chequeService = chequeService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ChequeRegisterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCheques(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] ChequeDirection? direction = null,
        [FromQuery] ChequeStatus? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _chequeService.GetChequesAsync(
            pageNumber,
            pageSize,
            direction,
            status,
            fromDate,
            toDate,
            searchTerm,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ChequeRegisterDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChequeById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _chequeService.GetChequeByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordCheque([FromBody] RecordChequeRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _chequeService.RecordChequeAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/deposit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DepositCheque(Guid id, [FromBody] DepositChequeRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _chequeService.DepositChequeAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/clear")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ClearCheque(Guid id, [FromBody] ClearChequeRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _chequeService.ClearChequeAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/bounce")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BounceCheque(Guid id, [FromBody] BounceChequeRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _chequeService.BounceChequeAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelCheque(Guid id, [FromBody] string? reason, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _chequeService.CancelChequeAsync(id, reason, ip, cancellationToken);
        return HandleResult(result);
    }
}
