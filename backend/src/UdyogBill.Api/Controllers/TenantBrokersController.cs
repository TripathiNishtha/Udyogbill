using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/brokers")]
public class TenantBrokersController : BaseApiController
{
    private readonly IBrokerService _brokerService;

    public TenantBrokersController(IBrokerService brokerService)
    {
        _brokerService = brokerService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<BrokerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBrokers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? activeOnly = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _brokerService.GetBrokersAsync(
            pageNumber,
            pageSize,
            searchTerm,
            activeOnly,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpGet("summaries")]
    [ProducesResponseType(typeof(IReadOnlyList<BrokerSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBrokerSummaries(CancellationToken cancellationToken)
    {
        var result = await _brokerService.GetBrokerSummariesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(BrokerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBrokerById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _brokerService.GetBrokerByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBroker([FromBody] CreateBrokerRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _brokerService.CreateBrokerAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateBroker(Guid id, [FromBody] UpdateBrokerRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _brokerService.UpdateBrokerAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteBroker(Guid id, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _brokerService.DeleteBrokerAsync(id, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("commissions")]
    [ProducesResponseType(typeof(PagedResult<BrokerCommissionEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCommissions(
        [FromQuery] Guid? brokerId = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _brokerService.GetCommissionEntriesAsync(
            brokerId,
            pageNumber,
            pageSize,
            fromDate,
            toDate,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpPost("payout")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PayCommission([FromBody] PayBrokerCommissionRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _brokerService.PayCommissionAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }
}
