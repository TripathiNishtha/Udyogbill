using System;
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
[Route("api/v1/tenant/reports")]
public class TenantReportsController : BaseApiController
{
    private readonly IReportService _reportService;

    public TenantReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("ledger")]
    [ProducesResponseType(typeof(PagedResult<LedgerEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLedgerEntries(
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetLedgerEntriesAsync(partyId, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("ledger/statement")]
    [ProducesResponseType(typeof(LedgerStatementDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLedgerStatement(
        [FromQuery] Guid partyId,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetLedgerStatementAsync(partyId, fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("pnl")]
    [ProducesResponseType(typeof(PnLReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPnLReport(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetPnLReportAsync(fromDate, toDate, branchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("gstr1")]
    [ProducesResponseType(typeof(Gstr1ReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGstr1Report(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetGstr1ReportAsync(fromDate, toDate, branchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("gstr3b")]
    [ProducesResponseType(typeof(Gstr3bReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGstr3bReport(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetGstr3bReportAsync(fromDate, toDate, branchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(SummaryReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummaryDashboard(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSummaryDashboardAsync(fromDate, toDate, branchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("export/gstr1")]
    public async Task<IActionResult> ExportGstr1Csv(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.ExportGstr1CsvAsync(fromDate, toDate, branchId, cancellationToken);
        if (!result.IsSuccess || result.Data == null)
        {
            return HandleResult(result);
        }

        return File(result.Data.FileBytes, result.Data.ContentType, result.Data.FileName);
    }

    [HttpGet("export/gstr3b")]
    public async Task<IActionResult> ExportGstr3bCsv(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.ExportGstr3bCsvAsync(fromDate, toDate, branchId, cancellationToken);
        if (!result.IsSuccess || result.Data == null)
        {
            return HandleResult(result);
        }

        return File(result.Data.FileBytes, result.Data.ContentType, result.Data.FileName);
    }

    [HttpGet("export/ledger")]
    public async Task<IActionResult> ExportLedgerCsv(
        [FromQuery] Guid? partyId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.ExportLedgerCsvAsync(partyId, fromDate, toDate, cancellationToken);
        if (!result.IsSuccess || result.Data == null)
        {
            return HandleResult(result);
        }

        return File(result.Data.FileBytes, result.Data.ContentType, result.Data.FileName);
    }
}
