using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Api.Controllers.Public;

[AllowAnonymous]
[Route("api/v1/public/onboarding")]
[Route("api/public/onboarding")]
public class PublicGstController : BaseApiController
{
    private readonly ISandboxGstService _sandboxGstService;

    public PublicGstController(ISandboxGstService sandboxGstService)
    {
        _sandboxGstService = sandboxGstService;
    }

    /// <summary>
    /// Public lookup endpoint for Registration page to fetch business details by GSTIN.
    /// </summary>
    [HttpGet("gstin-lookup")]
    [ProducesResponseType(typeof(GstLookupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LookupGstin([FromQuery] string gstin, CancellationToken cancellationToken)
    {
        var result = await _sandboxGstService.LookupGstinAsync(gstin, cancellationToken);
        return HandleResult(result);
    }
}
