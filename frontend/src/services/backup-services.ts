import { apiClient } from "@/lib/api-client";

export interface BackupJob {
  id: string;
  backupType: number; // 1: FullDatabase, 2: TenantDataOnly, 3: AuditLogsOnly, 4: FinancialOnly
  storageProvider: number; // 1: LocalStorage, 2: AwsS3, 3: GoogleDrive, 4: AzureBlob
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  checksumSha256: string;
  status: number; // 1: Pending, 2: InProgress, 3: Completed, 4: Failed
  errorMessage?: string;
  isAutoScheduled: boolean;
  createdAtUtc: string;
  completedAtUtc?: string;
  retentionDays: number;
}

export interface BackupScheduleConfig {
  id: string;
  isAutoBackupEnabled: boolean;
  frequency: number; // 1: Daily, 2: Weekly, 3: Monthly
  scheduledTimeUtc: string;
  storageProvider: number;
  s3BucketName?: string;
  s3Region?: string;
  s3AccessKey?: string;
  googleDriveFolderId?: string;
  retentionCount: number;
  lastRunAtUtc?: string;
  nextRunAtUtc?: string;
}

export interface SystemHealthReport {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  activeDbConnections: number;
  databaseSizeBytes: number;
  diskFreeSpaceMb: number;
  uptimeSeconds: number;
  healthStatus: string;
  checkedAtUtc: string;
  totalBackupsAvailable: number;
  lastBackupTimeUtc?: string;
}

export interface RestoreVerificationResult {
  backupJobId: string;
  fileName: string;
  isChecksumValid: boolean;
  expectedChecksumSha256: string;
  actualChecksumSha256: string;
  totalInvoicesInArchive: number;
  totalCustomersInArchive: number;
  totalItemsInArchive: number;
  canRestoreSafely: boolean;
  verificationMessage: string;
}

export const backupService = {
  async getBackupJobs(): Promise<BackupJob[]> {
    const response = await apiClient.get<BackupJob[]>("/tenant/backup/jobs");
    return response.data;
  },

  async triggerBackup(input: {
    backupType?: number;
    storageProvider?: number;
    notes?: string;
  }): Promise<BackupJob> {
    const response = await apiClient.post<BackupJob>("/tenant/backup/trigger", input);
    return response.data;
  },

  async getScheduleConfig(): Promise<BackupScheduleConfig> {
    const response = await apiClient.get<BackupScheduleConfig>("/tenant/backup/schedule");
    return response.data;
  },

  async updateScheduleConfig(input: Partial<BackupScheduleConfig>): Promise<BackupScheduleConfig> {
    const response = await apiClient.put<BackupScheduleConfig>("/tenant/backup/schedule", input);
    return response.data;
  },

  async getSystemHealth(): Promise<SystemHealthReport> {
    const response = await apiClient.get<SystemHealthReport>("/tenant/backup/system-health");
    return response.data;
  },

  async verifyBackupIntegrity(backupId: string): Promise<RestoreVerificationResult> {
    const response = await apiClient.post<RestoreVerificationResult>(`/tenant/backup/restore/${backupId}`, {});
    return response.data;
  },
};
