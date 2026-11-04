using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/import")]
public class TenantBulkImportController : BaseApiController
{
    private readonly IBulkImportService _importService;

    public TenantBulkImportController(IBulkImportService importService)
    {
        _importService = importService;
    }

    [HttpPost("products")]
    [RequirePermission(Permissions.InventoryManage)]
    [ProducesResponseType(typeof(BulkProductImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportProducts([FromBody] BulkProductImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportProductsAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("invoices")]
    [RequirePermission(Permissions.SalesCreate)]
    [ProducesResponseType(typeof(BulkInvoiceImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportInvoices([FromBody] BulkInvoiceImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportInvoicesAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("parties")]
    [RequirePermission(Permissions.PartiesManage)]
    [ProducesResponseType(typeof(BulkPartyImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportParties([FromBody] BulkPartyImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportPartiesAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("purchases")]
    [RequirePermission(Permissions.PurchaseCreate)]
    [ProducesResponseType(typeof(BulkPurchaseImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportPurchases([FromBody] BulkPurchaseImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportPurchasesAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expenses")]
    [RequirePermission(Permissions.BankingManage)]
    [ProducesResponseType(typeof(BulkExpenseImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportExpenses([FromBody] BulkExpenseImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportExpensesAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("ledgers")]
    [RequirePermission(Permissions.AccountsManage)]
    [ProducesResponseType(typeof(BulkLedgerImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportLedgers([FromBody] BulkLedgerImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportLedgersAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("sales-returns")]
    [RequirePermission(Permissions.SalesReturn, Permissions.SalesCreate)]
    [ProducesResponseType(typeof(BulkSalesReturnImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportSalesReturns([FromBody] BulkSalesReturnImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportSalesReturnsAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("purchase-returns")]
    [RequirePermission(Permissions.PurchaseReturn, Permissions.PurchaseCreate)]
    [ProducesResponseType(typeof(BulkPurchaseReturnImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportPurchaseReturns([FromBody] BulkPurchaseReturnImportRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _importService.ImportPurchaseReturnsAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("templates/products")]
    public async Task<IActionResult> GetProductTemplate(CancellationToken cancellationToken)
    {
        var result = await _importService.GetProductImportTemplateAsync(cancellationToken);
        if (!result.IsSuccess || result.Data == null) return HandleResult(result);

        return File(result.Data.FileBytes, result.Data.ContentType, result.Data.FileName);
    }

    [HttpGet("templates/parties")]
    public async Task<IActionResult> GetPartyTemplate(CancellationToken cancellationToken)
    {
        var result = await _importService.GetPartyImportTemplateAsync(cancellationToken);
        if (!result.IsSuccess || result.Data == null) return HandleResult(result);

        return File(result.Data.FileBytes, result.Data.ContentType, result.Data.FileName);
    }
}
