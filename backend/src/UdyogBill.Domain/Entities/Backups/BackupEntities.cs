using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Backups;

public enum BackupType
{
    FullDatabase = 1,
    TenantDataOnly = 2,
    AuditLogsOnly = 3,
    FinancialOnly = 4
}

public enum StorageProvider
{
    LocalStorage = 1,
    AwsS3 = 2,
    GoogleDrive = 3,
    AzureBlob = 4
}

public enum BackupStatus
{
    Pending = 1,
    InProgress = 2,
    Completed = 3,
    Failed = 4
}

public enum BackupScheduleFrequency
{
    Daily = 1,
    Weekly = 2,
    Monthly = 3
}

public class BackupJob : BaseTenantAuditableEntity
{
    public BackupType BackupType { get; set; } = BackupType.TenantDataOnly;
    public StorageProvider StorageProvider { get; set; } = StorageProvider.LocalStorage;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; } = 0;
    public string ChecksumSha256 { get; set; } = string.Empty;
    public BackupStatus Status { get; set; } = BackupStatus.Pending;
    public string? ErrorMessage { get; set; }
    public bool IsAutoScheduled { get; set; } = false;
    public DateTime? CompletedAtUtc { get; set; }
    public int RetentionDays { get; set; } = 30;
}

public class BackupScheduleConfig : BaseTenantAuditableEntity
{
    public bool IsAutoBackupEnabled { get; set; } = true;
    public BackupScheduleFrequency Frequency { get; set; } = BackupScheduleFrequency.Daily;
    public TimeSpan ScheduledTimeUtc { get; set; } = new TimeSpan(2, 0, 0); // 02:00 UTC default
    public StorageProvider StorageProvider { get; set; } = StorageProvider.LocalStorage;
    public string? S3BucketName { get; set; }
    public string? S3Region { get; set; }
    public string? S3AccessKey { get; set; }
    public string? S3SecretKeyEncrypted { get; set; }
    public string? GoogleDriveFolderId { get; set; }
    public int RetentionCount { get; set; } = 30;
    public DateTime? LastRunAtUtc { get; set; }
    public DateTime? NextRunAtUtc { get; set; }
}

public class SystemHealthMetric : BaseTenantAuditableEntity
{
    public double CpuUsagePercent { get; set; }
    public double MemoryUsedMb { get; set; }
    public double MemoryTotalMb { get; set; }
    public int ActiveDbConnections { get; set; }
    public long DatabaseSizeBytes { get; set; }
    public double DiskFreeSpaceMb { get; set; }
    public long UptimeSeconds { get; set; }
    public string Status { get; set; } = "HEALTHY";
}
