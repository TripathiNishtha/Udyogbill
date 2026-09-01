using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/audit")]
public class TenantAuditController : BaseApiController
{
    private readonly ITenantAuditService _auditService;

    public TenantAuditController(ITenantAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] TenantAuditQueryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _auditService.GetTenantAuditLogsAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(TenantAuditSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditSummary(CancellationToken cancellationToken)
    {
        var result = await _auditService.GetTenantAuditSummaryAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportAuditLogs(
        [FromQuery] TenantAuditQueryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _auditService.ExportAuditLogsCsvAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        return File(result.Data!.FileBytes, result.Data.ContentType, result.Data.FileName);
    }
}
