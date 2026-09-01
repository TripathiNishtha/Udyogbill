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
[Route("api/v1/tenant/onboarding")]
public class TenantOnboardingController : BaseApiController
{
    private readonly IOnboardingService _onboardingService;

    public TenantOnboardingController(IOnboardingService onboardingService)
    {
        _onboardingService = onboardingService;
    }

    [HttpPost("gstin-lookup")]
    [ProducesResponseType(typeof(GstinLookupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LookupGstin([FromBody] GstinLookupRequest request, CancellationToken cancellationToken)
    {
        var result = await _onboardingService.LookupGstinAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("seed-catalog")]
    [ProducesResponseType(typeof(SeedIndustryCatalogResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SeedIndustryCatalog([FromBody] SeedIndustryCatalogRequest request, CancellationToken cancellationToken)
    {
        var result = await _onboardingService.SeedIndustryCatalogAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(OnboardingStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOnboardingStatus(CancellationToken cancellationToken)
    {
        var result = await _onboardingService.GetOnboardingStatusAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("complete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteOnboarding([FromBody] CompleteOnboardingRequest request, CancellationToken cancellationToken)
    {
        var result = await _onboardingService.CompleteOnboardingAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
