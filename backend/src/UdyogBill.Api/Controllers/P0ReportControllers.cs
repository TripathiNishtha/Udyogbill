using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Reports;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/reports/p0")]
public class P0ReportController : BaseApiController
{
    private readonly IP0ReportService _reportService;

    public P0ReportController(IP0ReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("sales/register")]
    [ProducesResponseType(typeof(SalesRegisterDetailedReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesRegisterDetailed(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSalesRegisterDetailedAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("sales/summary")]
    [ProducesResponseType(typeof(SalesSummaryReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesSummary(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSalesSummaryAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("purchases/register")]
    [ProducesResponseType(typeof(PurchaseRegisterDetailedReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseRegisterDetailed(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetPurchaseRegisterDetailedAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("purchases/summary")]
    [ProducesResponseType(typeof(PurchaseSummaryReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPurchaseSummary(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetPurchaseSummaryAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("inventory/stock-balance")]
    [ProducesResponseType(typeof(RealTimeStockBalanceReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRealTimeStockBalance(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetRealTimeStockBalanceAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("inventory/valuation")]
    [ProducesResponseType(typeof(StockValuationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockValuation(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetStockValuationAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("receivables/debtor-ageing")]
    [ProducesResponseType(typeof(DebtorAgeingReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDebtorAgeingSchedule(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetDebtorAgeingScheduleAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("payables/creditor-ageing")]
    [ProducesResponseType(typeof(CreditorAgeingReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCreditorAgeingSchedule(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetCreditorAgeingScheduleAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("financial/true-pnl")]
    [ProducesResponseType(typeof(TruePnLReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTruePnL(
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetTruePnLReportAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportReportCsv(
        [FromQuery] string reportType,
        [FromQuery] P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var (fileBytes, fileName, contentType) = await _reportService.ExportReportCsvAsync(reportType, request, cancellationToken);
        return File(fileBytes, contentType, fileName);
    }

    [HttpGet("presets")]
    public async Task<IActionResult> GetPresets(
        [FromQuery] string? reportCode = null,
        CancellationToken cancellationToken = default)
    {
        var presets = await _reportService.GetSavedPresetsAsync(reportCode, cancellationToken);
        return Ok(presets);
    }

    [HttpPost("presets")]
    public async Task<IActionResult> SavePreset(
        [FromBody] SavedReportPreset preset,
        CancellationToken cancellationToken = default)
    {
        var saved = await _reportService.SavePresetAsync(preset, cancellationToken);
        return Ok(saved);
    }

    [HttpDelete("presets/{id:guid}")]
    public async Task<IActionResult> DeletePreset(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var success = await _reportService.DeletePresetAsync(id, cancellationToken);
        return Ok(new { success });
    }
}
