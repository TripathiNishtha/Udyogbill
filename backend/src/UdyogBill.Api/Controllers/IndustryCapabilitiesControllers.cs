using System;
using System.Collections.Generic;
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
[Route("api/v1/tenant/industry")]
public class IndustryCapabilitiesController : BaseApiController
{
    private readonly IIndustryCapabilitiesService _industryService;

    public IndustryCapabilitiesController(IIndustryCapabilitiesService industryService)
    {
        _industryService = industryService;
    }

    #region Pharma Vertical Endpoints

    [HttpGet("pharma/expiry-alerts")]
    [ProducesResponseType(typeof(IReadOnlyList<ExpiryAlertBatchDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPharmaExpiryAlerts(
        [FromQuery] int daysThreshold = 90,
        [FromQuery] Guid? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _industryService.GetPharmaExpiryAlertsAsync(daysThreshold, warehouseId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("pharma/schedule-h1")]
    [ProducesResponseType(typeof(IReadOnlyList<ScheduleH1RegisterRowDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScheduleH1Register(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _industryService.GetScheduleH1RegisterAsync(fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Apparel & Garments Matrix Endpoints

    [HttpPost("apparel/matrix-variants")]
    [ProducesResponseType(typeof(IReadOnlyList<GeneratedVariantDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateMatrixVariants(
        [FromBody] GenerateMatrixVariantsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _industryService.GenerateMatrixVariantsAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Manufacturing & Recipe BOM Endpoints

    [HttpPost("manufacturing/bom")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecipeBom(
        [FromBody] CreateRecipeBomRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _industryService.CreateRecipeBomAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("manufacturing/bom")]
    [ProducesResponseType(typeof(IReadOnlyList<RecipeBomDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecipeBoms(CancellationToken cancellationToken)
    {
        var result = await _industryService.GetRecipeBomsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("manufacturing/bom/{id:guid}")]
    [ProducesResponseType(typeof(RecipeBomDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecipeBomById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _industryService.GetRecipeBomByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("manufacturing/production")]
    [ProducesResponseType(typeof(ProductionRunResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExecuteProductionRun(
        [FromBody] ExecuteProductionRunRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _industryService.ExecuteProductionRunAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Electronics Serial Lifecycle Endpoints

    [HttpGet("electronics/serials/{serialNumber}")]
    [ProducesResponseType(typeof(SerialLifecycleDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSerialLifecycle(
        string serialNumber,
        CancellationToken cancellationToken)
    {
        var result = await _industryService.GetSerialLifecycleAsync(serialNumber, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
