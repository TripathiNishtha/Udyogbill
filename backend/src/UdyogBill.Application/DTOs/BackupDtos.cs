using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Backups;

namespace UdyogBill.Application.DTOs;

public record BackupJobDto(
    Guid Id,
    BackupType BackupType,
    StorageProvider StorageProvider,
    string FileName,
    string FilePath,
    long FileSizeBytes,
    string ChecksumSha256,
    BackupStatus Status,
    string? ErrorMessage,
    bool IsAutoScheduled,
    DateTime CreatedAtUtc,
    DateTime? CompletedAtUtc,
    int RetentionDays
);

public class TriggerBackupRequest
{
    public BackupType BackupType { get; set; } = BackupType.TenantDataOnly;
    public StorageProvider StorageProvider { get; set; } = StorageProvider.LocalStorage;
    public string? Notes { get; set; }
}

public record BackupScheduleConfigDto(
    Guid Id,
    bool IsAutoBackupEnabled,
    BackupScheduleFrequency Frequency,
    TimeSpan ScheduledTimeUtc,
    StorageProvider StorageProvider,
    string? S3BucketName,
    string? S3Region,
    string? S3AccessKey,
    string? GoogleDriveFolderId,
    int RetentionCount,
    DateTime? LastRunAtUtc,
    DateTime? NextRunAtUtc
);

public class UpdateBackupScheduleConfigRequest
{
    public bool IsAutoBackupEnabled { get; set; } = true;
    public BackupScheduleFrequency Frequency { get; set; } = BackupScheduleFrequency.Daily;
    public TimeSpan ScheduledTimeUtc { get; set; } = new TimeSpan(2, 0, 0);
    public StorageProvider StorageProvider { get; set; } = StorageProvider.LocalStorage;
    public string? S3BucketName { get; set; }
    public string? S3Region { get; set; }
    public string? S3AccessKey { get; set; }
    public string? S3SecretKey { get; set; }
    public string? GoogleDriveFolderId { get; set; }
    public int RetentionCount { get; set; } = 30;
}

public record SystemHealthReportDto(
    double CpuUsagePercent,
    double MemoryUsedMb,
    double MemoryTotalMb,
    int ActiveDbConnections,
    long DatabaseSizeBytes,
    double DiskFreeSpaceMb,
    long UptimeSeconds,
    string HealthStatus,
    DateTime CheckedAtUtc,
    int TotalBackupsAvailable,
    DateTime? LastBackupTimeUtc
);

public record RestoreVerificationResultDto(
    Guid BackupJobId,
    string FileName,
    bool IsChecksumValid,
    string ExpectedChecksumSha256,
    string ActualChecksumSha256,
    int TotalInvoicesInArchive,
    int TotalCustomersInArchive,
    int TotalItemsInArchive,
    bool CanRestoreSafely,
    string VerificationMessage
);
