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
[Route("api/v1/tenant/reports/industry")]
public class IndustryReportController : BaseApiController
{
    private readonly IIndustryReportService _reportService;

    public IndustryReportController(IIndustryReportService reportService)
    {
        _reportService = reportService;
    }

    #region 1. Hardware, Sanitary & Paint

    [HttpGet("thekedar-ledger")]
    [ProducesResponseType(typeof(ThekedarProjectLedgerReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetThekedarProjectLedger(
        [FromQuery] Guid? partyId = null,
        [FromQuery] string? siteName = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetThekedarProjectLedgerAsync(partyId, siteName, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("painter-commission")]
    [ProducesResponseType(typeof(PainterCommissionReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPainterCommission(
        [FromQuery] string? painterName = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetPainterCommissionReportAsync(painterName, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("dual-unit-reconciliation")]
    [ProducesResponseType(typeof(DualUnitReconciliationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDualUnitReconciliation(
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetDualUnitReconciliationReportAsync(search, categoryId, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("paint-tinting-audit")]
    [ProducesResponseType(typeof(PaintTintingAuditReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaintTintingAudit(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetPaintTintingAuditReportAsync(fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    #endregion

    #region 2. Auto Spare Parts

    [HttpGet("mechanic-referral")]
    [ProducesResponseType(typeof(MechanicReferralReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMechanicReferral(
        [FromQuery] string? mechanicName = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetMechanicReferralReportAsync(mechanicName, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("vehicle-fitment-velocity")]
    [ProducesResponseType(typeof(VehicleFitmentVelocityReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetVehicleFitmentVelocity(
        [FromQuery] string? vehicleType = null,
        [FromQuery] string? make = null,
        [FromQuery] string? model = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetVehicleFitmentVelocityReportAsync(vehicleType, make, model, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("autoparts-deadstock")]
    [ProducesResponseType(typeof(AutopartsDeadstockReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAutopartsDeadstock(
        [FromQuery] int minDaysNonMoving = 180,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetAutopartsDeadstockReportAsync(minDaysNonMoving, categoryId, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("battery-scrap")]
    [ProducesResponseType(typeof(BatteryScrapExchangeReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBatteryScrapExchange(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetBatteryScrapExchangeReportAsync(fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    #endregion

    #region 3. Pharma & Chemist

    [HttpGet("doctor-prescription")]
    [ProducesResponseType(typeof(DoctorPrescriptionSalesReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDoctorPrescriptionSales(
        [FromQuery] Guid? doctorId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetDoctorPrescriptionSalesReportAsync(doctorId, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("near-expiry-claims")]
    [ProducesResponseType(typeof(NearExpiryClaimsReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNearExpiryClaims(
        [FromQuery] Guid? distributorId = null,
        [FromQuery] int withinDays = 90,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetNearExpiryClaimsReportAsync(distributorId, withinDays, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("schedule-h1-audit")]
    [ProducesResponseType(typeof(ScheduleH1AuditReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScheduleH1Audit(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? scheduleType = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetScheduleH1AuditReportAsync(fromDate, toDate, scheduleType, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("loose-strip-breakage")]
    [ProducesResponseType(typeof(LooseStripBreakageReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLooseStripBreakage(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetLooseStripBreakageReportAsync(fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    #endregion

    #region 4. Jewellery & Gold

    [HttpGet("karigar-wastage")]
    [ProducesResponseType(typeof(KarigarWastageReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKarigarWastage(
        [FromQuery] string? karigarName = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetKarigarWastageReportAsync(karigarName, fromDate, toDate, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("jewellery-m2m-valuation")]
    [ProducesResponseType(typeof(JewelleryM2mValuationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetJewelleryM2mValuation(
        [FromQuery] DateTime? asOfDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetJewelleryM2mValuationReportAsync(asOfDate, cancellationToken);
        return Ok(result);
    }

    [HttpGet("karatage-purity")]
    [ProducesResponseType(typeof(KaratagePurityStockReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKaratagePurityStock(CancellationToken cancellationToken = default)
    {
        var result = await _reportService.GetKaratagePurityStockReportAsync(cancellationToken);
        return Ok(result);
    }

    #endregion
}
