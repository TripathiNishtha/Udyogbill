using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Services.AutoParts;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tenant/autoparts")]
public class AutoPartsController : BaseApiController
{
    private readonly IAutoPartsService _autoPartsService;

    public AutoPartsController(IAutoPartsService autoPartsService)
    {
        _autoPartsService = autoPartsService;
    }

    #region Vehicles Master & Fitment

    [HttpGet("vehicles")]
    [ProducesResponseType(typeof(IReadOnlyList<VehicleMasterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchVehicles(
        [FromQuery] string? query,
        [FromQuery] string? vehicleType,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SearchVehiclesAsync(query, vehicleType, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("vehicles/seed")]
    public async Task<IActionResult> SeedStandardVehicles(CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SeedStandardVehiclesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("fitment")]
    [ProducesResponseType(typeof(ProductFitmentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveFitment(
        [FromBody] SaveProductFitmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SaveProductFitmentAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("fitment/by-item/{itemId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<ProductFitmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFitmentsByItem(
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetFitmentsByItemAsync(itemId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("fitment/search-by-vehicle")]
    [ProducesResponseType(typeof(IReadOnlyList<PartCrossReferenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchItemsByVehicle(
        [FromQuery] string vehicle,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(vehicle))
            return BadRequest(new { error = "Vehicle search term is required" });

        var result = await _autoPartsService.SearchItemsByVehicleAsync(vehicle, categoryId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("fitment")]
    [ProducesResponseType(typeof(IReadOnlyList<ProductFitmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllFitments(
        [FromQuery] string? query,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetAllFitmentsAsync(query, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("fitment/{id:guid}")]
    public async Task<IActionResult> DeleteFitment(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.DeleteFitmentAsync(id, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Cross-References & Interchangeable Parts

    [HttpPost("cross-reference")]
    [ProducesResponseType(typeof(PartCrossReferenceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveCrossReference(
        [FromBody] SaveCrossReferenceRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SaveCrossReferenceAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("cross-reference")]
    [ProducesResponseType(typeof(IReadOnlyList<PartCrossReferenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllCrossReferences(
        [FromQuery] string? query,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetAllCrossReferencesAsync(query, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("cross-reference/{id:guid}")]
    public async Task<IActionResult> DeleteCrossReference(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.DeleteCrossReferenceAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("cross-reference/lookup/{oemNumber}")]
    [ProducesResponseType(typeof(IReadOnlyList<PartCrossReferenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> LookupCrossReference(
        string oemNumber,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetCrossReferencesByOemNumberAsync(oemNumber, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("cross-reference/by-item/{itemId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<PartCrossReferenceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCrossReferencesByItem(
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetCrossReferencesByItemAsync(itemId, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Mechanic & Garage Directory + Commissions

    [HttpGet("mechanics")]
    [ProducesResponseType(typeof(IReadOnlyList<MechanicMasterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMechanics(
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetMechanicsAsync(search, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("mechanics/logs")]
    [ProducesResponseType(typeof(IReadOnlyList<MechanicCommissionLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMechanicLogs(
        [FromQuery] Guid? mechanicId,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetMechanicLogsAsync(mechanicId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("mechanics")]
    [ProducesResponseType(typeof(MechanicMasterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveMechanic(
        [FromBody] SaveMechanicRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SaveMechanicAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("mechanics/log-commission")]
    public async Task<IActionResult> LogCommission(
        [FromBody] LogMechanicCommissionRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.LogCommissionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("mechanics/payout")]
    public async Task<IActionResult> ProcessPayout(
        [FromBody] MechanicCommissionPayoutRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.ProcessMechanicPayoutAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Battery / Old Core Scrap Buyback

    [HttpPost("scrap-buyback")]
    [ProducesResponseType(typeof(BatteryScrapBuybackDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveBatteryScrapBuyback(
        [FromBody] BatteryScrapBuybackRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.SaveBatteryScrapBuybackAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("scrap-buyback")]
    [ProducesResponseType(typeof(IReadOnlyList<BatteryScrapBuybackDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllScrapBuybacks(CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetAllScrapBuybacksAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("scrap-buyback/{id:guid}")]
    public async Task<IActionResult> DeleteScrapBuyback(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.DeleteScrapBuybackAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("scrap-buyback/{invoiceId:guid}")]
    [ProducesResponseType(typeof(BatteryScrapBuybackDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScrapBuyback(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        var result = await _autoPartsService.GetScrapBuybackByInvoiceAsync(invoiceId, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
