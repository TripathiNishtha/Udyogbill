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
