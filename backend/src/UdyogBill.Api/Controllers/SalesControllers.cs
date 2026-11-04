using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Policy = "CanCreateInvoice")]
[RequireActiveSubscription]
[Route("api/v1/tenant/invoices")]
public class TenantInvoicesController : BaseApiController
{
    private readonly ISalesService _salesService;
    private readonly ITenantContext _tenantContext;
    private readonly ISyncNotificationService _syncNotificationService;

    public TenantInvoicesController(
        ISalesService salesService,
        ITenantContext tenantContext,
        ISyncNotificationService syncNotificationService)
    {
        _salesService = salesService;
        _tenantContext = tenantContext;
        _syncNotificationService = syncNotificationService;
    }

    [HttpGet]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(PagedResult<SalesInvoiceListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] InvoiceType? invoiceType = null,
        [FromQuery] InvoiceStatus? status = null,
        [FromQuery] PaymentStatus? paymentStatus = null,
        [FromQuery] Guid? branchId = null,
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _salesService.GetInvoicesAsync(
            pageNumber,
            pageSize,
            invoiceType,
            status,
            paymentStatus,
            branchId,
            partyId,
            fromDate,
            toDate,
            searchTerm,
            cancellationToken
        );
        return HandleResult(result);
    }

    [HttpPost]
    [Idempotent]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateSalesInvoiceRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.CreateInvoiceAsync(request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "invoice.created", new
            {
                invoiceId = result.Data,
                customerName = request.CustomerName,
                paidAmount = request.PaidAmount,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] CreateSalesInvoiceRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.UpdateInvoiceAsync(id, request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "invoice.updated", new
            {
                invoiceId = id,
                customerName = request.CustomerName,
                paidAmount = request.PaidAmount,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(SalesInvoiceDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoice(Guid id, CancellationToken cancellationToken)
    {
        var result = await _salesService.GetInvoiceByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("number/{invoiceNumber}")]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(SalesInvoiceDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoiceByNumber(string invoiceNumber, CancellationToken cancellationToken)
    {
        var result = await _salesService.GetInvoiceByNumberAsync(invoiceNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/payments")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] RecordInvoicePaymentRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.RecordInvoicePaymentAsync(request with { InvoiceId = id }, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "payment.created", new
            {
                invoiceId = id,
                paymentId = result.Data,
                amount = request.Amount,
                paymentMode = request.PaymentMode.ToString(),
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permissions.SalesCancel)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelInvoice(Guid id, [FromBody] CancelInvoiceRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.CancelInvoiceAsync(id, request, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            _ = _syncNotificationService.NotifyTenantAsync(_tenantContext.TenantId, "invoice.cancelled", new
            {
                invoiceId = id,
                source = "api"
            }, cancellationToken);
        }
        return HandleResult(result);
    }

    [HttpPatch("{id:guid}/customer-contact")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCustomerContact(
        Guid id,
        [FromBody] UpdateCustomerContactRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _salesService.UpdateCustomerContactAsync(
            id,
            request.CustomerPhone,
            request.CustomerName,
            request.CustomerEmail,
            cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("last-deal")]
    [RequirePermission(Permissions.SalesView)]
    [ProducesResponseType(typeof(LastDealHintDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLastDeal(
        [FromQuery] Guid itemId,
        [FromQuery] Guid? partyId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _salesService.GetLastSaleDealAsync(itemId, partyId, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize(Policy = "CanCreateInvoice")]
[RequireActiveSubscription]
[Route("api/v1/tenant/pos")]
public class TenantPosController : BaseApiController
{
    private readonly ISalesService _salesService;
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public TenantPosController(
        ISalesService salesService,
        AppDbContext context,
        ITenantContext tenantContext)
    {
        _salesService = salesService;
        _context = context;
        _tenantContext = tenantContext;
    }

    [HttpPost("bills")]
    [Idempotent]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePosBill([FromBody] CreateSalesInvoiceRequest request, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _salesService.CreateInvoiceAsync(request with { InvoiceType = InvoiceType.POSBill }, ipAddress, cancellationToken);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        var invoice = await _context.SalesInvoices
            .AsNoTracking()
            .Where(i => i.Id == result.Data && i.TenantId == _tenantContext.TenantId)
            .Select(i => new { i.Id, i.InvoiceNumber })
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(new
        {
            id = result.Data,
            invoiceNumber = invoice?.InvoiceNumber ?? string.Empty
        });
    }

    [HttpGet("held-bills")]
    [RequirePermission(Permissions.SalesView)]
    public async Task<IActionResult> GetHeldBills(CancellationToken cancellationToken)
    {
        var bills = await _context.PosHeldBills
            .Where(b => b.TenantId == _tenantContext.TenantId && !b.IsDeleted)
            .OrderByDescending(b => b.CreatedAtUtc)
            .Select(b => new
            {
                b.Id,
                b.HoldNumber,
                b.CustomerName,
                b.CustomerPhone,
                b.TotalAmount,
                b.ItemsCount,
                b.CartJson,
                b.Notes,
                b.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(bills);
    }

    [HttpPost("held-bills")]
    [RequirePermission(Permissions.SalesCreate)]
    public async Task<IActionResult> SaveHeldBill([FromBody] SaveHeldBillRequest request, CancellationToken cancellationToken)
    {
        var count = await _context.PosHeldBills.CountAsync(b => b.TenantId == _tenantContext.TenantId, cancellationToken) + 1;
        var holdNumber = $"HOLD-{DateTime.UtcNow:HHmm}-{count:D3}";

        var bill = new PosHeldBill
        {
            TenantId = _tenantContext.TenantId,
            HoldNumber = holdNumber,
            CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? "Walk-in Customer" : request.CustomerName.Trim(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            TotalAmount = request.TotalAmount,
            ItemsCount = request.ItemsCount,
            CartJson = request.CartJson ?? "[]",
            Notes = request.Notes
        };

        _context.PosHeldBills.Add(bill);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { bill.Id, bill.HoldNumber, bill.CreatedAtUtc });
    }

    [HttpDelete("held-bills/{id:guid}")]
    [RequirePermission(Permissions.SalesCreate)]
    public async Task<IActionResult> DeleteHeldBill(Guid id, CancellationToken cancellationToken)
    {
        var bill = await _context.PosHeldBills
            .FirstOrDefaultAsync(b => b.TenantId == _tenantContext.TenantId && b.Id == id && !b.IsDeleted, cancellationToken);

        if (bill == null) return NotFound();

        _context.PosHeldBills.Remove(bill);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}

public record SaveHeldBillRequest(
    string? CustomerName,
    string? CustomerPhone,
    decimal TotalAmount,
    int ItemsCount,
    string CartJson,
    string? Notes
);
