using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Services.Pharma;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireAddon("ADDON_PHARMA")]
[ApiController]
[Route("api/v1/[controller]")]
public class PharmaController : BaseApiController
{
    private readonly IPharmaService _pharmaService;

    public PharmaController(IPharmaService pharmaService)
    {
        _pharmaService = pharmaService;
    }

    #region Batches & FEFO

    [HttpGet("batches")]
    public async Task<ActionResult<IReadOnlyList<PharmaBatchDto>>> GetBatches(
        [FromQuery] Guid? itemId,
        [FromQuery] bool includeExpired = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetItemBatchesAsync(itemId, includeExpired, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("batches")]
    public async Task<ActionResult<PharmaBatchDto>> SaveBatch(
        [FromBody] SavePharmaBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.SaveBatchAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Salt & Substitutes

    [HttpGet("salts")]
    public async Task<ActionResult<IReadOnlyList<SaltMasterDto>>> GetSalts(
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetSaltsAsync(search, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("salts")]
    public async Task<ActionResult<SaltMasterDto>> SaveSalt(
        [FromBody] SaveSaltMasterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.SaveSaltAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("substitutes/{itemId:guid}")]
    public async Task<ActionResult<IReadOnlyList<ItemSubstituteDto>>> FindSubstitutes(
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.FindSaltSubstitutesAsync(itemId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("salts/link")]
    public async Task<IActionResult> LinkSalt(
        [FromBody] LinkItemSaltRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.LinkItemSaltCompositionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Schedule H1 Register

    [HttpGet("h1-register")]
    public async Task<ActionResult<IReadOnlyList<ScheduleH1RegisterDto>>> GetScheduleH1Register(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetScheduleH1RegisterAsync(fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("h1-register")]
    public async Task<IActionResult> RecordScheduleH1Entry(
        [FromBody] RecordScheduleH1EntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.RecordScheduleH1EntryAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Expiry Radar & Return Claims

    [HttpGet("expiry-radar")]
    public async Task<ActionResult<IReadOnlyList<ExpiryRadarItemDto>>> GetExpiryRadar(
        [FromQuery] int daysThreshold = 90,
        [FromQuery] Guid? supplierId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetExpiryRadarAsync(daysThreshold, supplierId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("expiry-claims")]
    public async Task<ActionResult<IReadOnlyList<ExpiryReturnClaimDto>>> GetExpiryClaims(CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetExpiryReturnClaimsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("expiry-claims")]
    public async Task<ActionResult<ExpiryReturnClaimDto>> CreateExpiryClaim(
        [FromBody] CreateExpiryReturnClaimRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.CreateExpiryReturnClaimAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Doctors & Prescribers

    [HttpGet("doctors")]
    public async Task<ActionResult<IReadOnlyList<DoctorPrescriberDto>>> GetDoctors(
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetDoctorPrescribersAsync(search, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("doctors")]
    public async Task<ActionResult<DoctorPrescriberDto>> SaveDoctor(
        [FromBody] SaveDoctorPrescriberRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.SaveDoctorPrescriberAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("patient-repeat/{mobile}")]
    public async Task<ActionResult<PatientPrescriptionHistoryDto>> GetPatientRepeatHistory(
        string mobile,
        CancellationToken cancellationToken = default)
    {
        var result = await _pharmaService.GetPatientPrescriptionHistoryAsync(mobile, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
