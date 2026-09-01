using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/customers")]
public class TenantCustomersController : BaseApiController
{
    private readonly IPartyService _partyService;

    public TenantCustomersController(IPartyService partyService)
    {
        _partyService = partyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PartyListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] CustomerType? customerType = null,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? outstandingOnly = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _partyService.GetPartiesAsync(
            pageNumber,
            pageSize,
            PartyType.Customer,
            customerType,
            null,
            searchTerm,
            outstandingOnly,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCustomer([FromBody] CreatePartyRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.CreatePartyAsync(request with { PartyType = PartyType.Customer }, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PartyDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomer(Guid id, CancellationToken cancellationToken)
    {
        var result = await _partyService.GetPartyByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdatePartyRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.UpdatePartyAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteCustomer(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.DeletePartyAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/suppliers")]
public class TenantSuppliersController : BaseApiController
{
    private readonly IPartyService _partyService;

    public TenantSuppliersController(IPartyService partyService)
    {
        _partyService = partyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PartyListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuppliers(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] SupplierType? supplierType = null,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? outstandingOnly = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _partyService.GetPartiesAsync(
            pageNumber,
            pageSize,
            PartyType.Supplier,
            null,
            supplierType,
            searchTerm,
            outstandingOnly,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSupplier([FromBody] CreatePartyRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.CreatePartyAsync(request with { PartyType = PartyType.Supplier }, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PartyDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSupplier(Guid id, CancellationToken cancellationToken)
    {
        var result = await _partyService.GetPartyByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] UpdatePartyRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.UpdatePartyAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteSupplier(Guid id, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.DeletePartyAsync(id, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/parties")]
public class TenantPartiesController : BaseApiController
{
    private readonly IPartyService _partyService;

    public TenantPartiesController(IPartyService partyService)
    {
        _partyService = partyService;
    }

    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(typeof(PartyStatementDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatement(
        Guid id,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken)
    {
        var from = fromDate ?? DateTime.UtcNow.AddMonths(-6);
        var to = toDate ?? DateTime.UtcNow.AddDays(1);
        var result = await _partyService.GetPartyStatementAsync(id, from, to, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("payments")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordPayment(
        [FromBody] RecordPartyPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.RecordPartyPaymentAsync(request, ipAddress, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{id:guid}/addresses")]
    [ProducesResponseType(typeof(IReadOnlyList<PartyAddressDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddresses(Guid id, CancellationToken cancellationToken)
    {
        var result = await _partyService.GetPartyAddressesAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/addresses")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddAddress(
        Guid id,
        [FromBody] CreatePartyAddressRequest request,
        CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _partyService.AddPartyAddressAsync(id, request, ipAddress, cancellationToken);
        return HandleResult(result);
    }
}
