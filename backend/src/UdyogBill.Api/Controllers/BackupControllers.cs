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
[Route("api/v1/tenant/backup")]
public class TenantBackupController : BaseApiController
{
    private readonly IBackupService _backupService;

    public TenantBackupController(IBackupService backupService)
    {
        _backupService = backupService;
    }

    [HttpGet("jobs")]
    [ProducesResponseType(typeof(IReadOnlyList<BackupJobDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBackupJobs(CancellationToken cancellationToken)
    {
        var result = await _backupService.GetBackupJobsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("trigger")]
    [ProducesResponseType(typeof(BackupJobDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> TriggerBackup([FromBody] TriggerBackupRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _backupService.TriggerBackupAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("download/{backupId:guid}")]
    public async Task<IActionResult> DownloadBackup(Guid backupId, CancellationToken cancellationToken)
    {
        var result = await _backupService.DownloadBackupAsync(backupId, cancellationToken);
        if (!result.IsSuccess)
        {
            return HandleResult(result);
        }

        var (stream, fileName, contentType) = result.Data;
        return File(stream, contentType, fileName);
    }

    [HttpGet("schedule")]
    [ProducesResponseType(typeof(BackupScheduleConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScheduleConfig(CancellationToken cancellationToken)
    {
        var result = await _backupService.GetScheduleConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("schedule")]
    [ProducesResponseType(typeof(BackupScheduleConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateScheduleConfig([FromBody] UpdateBackupScheduleConfigRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _backupService.UpdateScheduleConfigAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("system-health")]
    [ProducesResponseType(typeof(SystemHealthReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
    {
        var result = await _backupService.GetSystemHealthAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("restore/{backupId:guid}")]
    [ProducesResponseType(typeof(RestoreVerificationResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> VerifyBackupIntegrity(Guid backupId, CancellationToken cancellationToken)
    {
        var result = await _backupService.VerifyBackupIntegrityAsync(backupId, cancellationToken);
        return HandleResult(result);
    }
}
