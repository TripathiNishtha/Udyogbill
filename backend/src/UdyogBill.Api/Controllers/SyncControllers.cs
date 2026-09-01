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
[Route("api/v1/tenant/sync")]
public class TenantSyncController : BaseApiController
{
    private readonly ISyncService _syncService;

    public TenantSyncController(ISyncService syncService)
    {
        _syncService = syncService;
    }

    [HttpPost("push")]
    [ProducesResponseType(typeof(SyncPushResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PushOfflineData([FromBody] SyncPushRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _syncService.PushOfflineDataAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("pull")]
    [ProducesResponseType(typeof(SyncPullResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> PullDeltaData([FromBody] SyncPullRequest request, CancellationToken cancellationToken)
    {
        var result = await _syncService.PullDeltaDataAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(SyncStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSyncStatus(CancellationToken cancellationToken)
    {
        var result = await _syncService.GetSyncStatusAsync(cancellationToken);
        return HandleResult(result);
    }
}
