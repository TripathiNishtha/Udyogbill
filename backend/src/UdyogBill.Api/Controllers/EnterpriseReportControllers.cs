using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/reports/enterprise")]
public class EnterpriseReportController : BaseApiController
{
    private readonly IEnterpriseReportService _reportService;

    public EnterpriseReportController(IEnterpriseReportService reportService)
    {
        _reportService = reportService;
    }

    // =========================================================================
    // 1. UNIVERSAL REPORTS (All Industries)
    // =========================================================================

    [HttpGet("balance-sheet")]
    [ProducesResponseType(typeof(BalanceSheetDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBalanceSheet(
        [FromQuery] DateTime? asOfDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetBalanceSheetAsync(asOfDate, cancellationToken);
        return Ok(result);
    }

    [HttpGet("bank-reconciliation")]
    [ProducesResponseType(typeof(BankReconciliationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBankReconciliation(
        [FromQuery] Guid? bankAccountId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetBankReconciliationAsync(bankAccountId, fromDate, toDate, cancellationToken);
        return Ok(result);
    }

    [HttpGet("gross-profit-margin")]
    [ProducesResponseType(typeof(GrossProfitMarginReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGrossProfitMargin(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] Guid? customerId = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetGrossProfitMarginReportAsync(fromDate, toDate, customerId, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("stock-velocity")]
    [ProducesResponseType(typeof(StockVelocityReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockVelocity(
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? filterType = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetStockVelocityReportAsync(categoryId, filterType, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("stock-wastage")]
    [ProducesResponseType(typeof(StockWastageAuditReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStockWastage(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? reason = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetStockWastageAuditReportAsync(fromDate, toDate, reason, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("negative-stock")]
    [ProducesResponseType(typeof(NegativeStockReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNegativeStock(
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetNegativeStockReportAsync(categoryId, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("eway-einvoice")]
    [ProducesResponseType(typeof(EWayEInvoiceRegisterReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEWayEInvoiceRegister(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? status = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetEWayEInvoiceRegisterAsync(fromDate, toDate, status, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("electronics/serial-aging")]
    [ProducesResponseType(typeof(SerialAgingReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSerialAging(
        [FromQuery] int thresholdDays = 60,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSerialAgingReportAsync(thresholdDays, category, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    // =========================================================================
    // 2. PHARMA & FMCG SPECIFIC REPORTS
    // =========================================================================

    [HttpGet("pharma/ndps-register")]
    [ProducesResponseType(typeof(NdpsRegisterReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNdpsRegister(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetNdpsRegisterAsync(fromDate, toDate, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("pharma/tb-register")]
    [ProducesResponseType(typeof(TbDrugRegisterReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTbDrugRegister(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetTbDrugRegisterAsync(fromDate, toDate, search, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("pharma/salt-finder")]
    [ProducesResponseType(typeof(SaltStockFinderReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSaltStockFinder(
        [FromQuery] string? moleculeQuery = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSaltStockFinderAsync(moleculeQuery, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("pharma/expired-quarantine")]
    [ProducesResponseType(typeof(ExpiredQuarantineReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpiredQuarantine(
        [FromQuery] Guid? supplierId = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetExpiredQuarantineReportAsync(supplierId, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("pharma/substitute-margin")]
    [ProducesResponseType(typeof(SubstituteMarginReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubstituteMargin(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetSubstituteMarginAnalysisAsync(fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("pharma/scheme-claims")]
    [ProducesResponseType(typeof(TradeSchemeClaimsReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTradeSchemeClaims(
        [FromQuery] Guid? supplierId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetTradeSchemeClaimsAsync(supplierId, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }
}
