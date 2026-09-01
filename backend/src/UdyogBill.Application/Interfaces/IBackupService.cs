using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IBackupService
{
    Task<Result<IReadOnlyList<BackupJobDto>>> GetBackupJobsAsync(CancellationToken cancellationToken = default);
    Task<Result<BackupJobDto>> TriggerBackupAsync(TriggerBackupRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<(Stream Stream, string FileName, string ContentType)>> DownloadBackupAsync(Guid backupId, CancellationToken cancellationToken = default);
    Task<Result<BackupScheduleConfigDto>> GetScheduleConfigAsync(CancellationToken cancellationToken = default);
    Task<Result<BackupScheduleConfigDto>> UpdateScheduleConfigAsync(UpdateBackupScheduleConfigRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<SystemHealthReportDto>> GetSystemHealthAsync(CancellationToken cancellationToken = default);
    Task<Result<RestoreVerificationResultDto>> VerifyBackupIntegrityAsync(Guid backupId, CancellationToken cancellationToken = default);
}
