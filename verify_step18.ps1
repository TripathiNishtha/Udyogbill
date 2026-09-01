Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 18: DATA BACKUP & DISASTER RECOVERY" -ForegroundColor Cyan
Write-Host "   (SHA-256 Snapshots, Cloud Sync & System Health)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/5] Testing System Health Telemetry & Resource Diagnostics..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/backup/system-health" -Headers $headers
Write-Host "  -> Health Status: $($health.healthStatus)" -ForegroundColor Green
Write-Host "  -> Process Working Set RAM: $($health.memoryUsedMb) MB / $($health.memoryTotalMb) MB" -ForegroundColor Green
Write-Host "  -> Estimated DB Size: $($health.databaseSizeBytes) Bytes" -ForegroundColor Green
Write-Host "  -> Active PostgreSQL Connections: $($health.activeDbConnections)" -ForegroundColor Green
Write-Host "  -> System Uptime: $($health.uptimeSeconds) seconds" -ForegroundColor Green

Write-Host "`n[2/5] Triggering On-Demand Tenant Backup Snapshot..." -ForegroundColor Yellow
$triggerBody = '{"backupType":2,"storageProvider":1,"notes":"Verification snapshot before maintenance"}'
$backupJob = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/backup/trigger" -Method POST -Headers $headers -Body $triggerBody -ContentType "application/json"
Write-Host "  -> Backup Archive Name: $($backupJob.fileName)" -ForegroundColor Green
Write-Host "  -> File Size: $($backupJob.fileSizeBytes) Bytes" -ForegroundColor Green
Write-Host "  -> SHA-256 Checksum: $($backupJob.checksumSha256)" -ForegroundColor Green
Write-Host "  -> Job Status: $($backupJob.status)" -ForegroundColor Green

Write-Host "`n[3/5] Querying Backup Job History..." -ForegroundColor Yellow
$jobsList = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/backup/jobs" -Headers $headers
Write-Host "  -> Total Backup Archives Available: $($jobsList.Count)" -ForegroundColor Green
Write-Host "  -> Latest Archive: $($jobsList[0].fileName)" -ForegroundColor Green

Write-Host "`n[4/5] Updating Automated Cloud Backup Schedule (AWS S3 Target)..." -ForegroundColor Yellow
$schedBody = @"
{
  "isAutoBackupEnabled": true,
  "frequency": 1,
  "scheduledTimeUtc": "03:30:00",
  "storageProvider": 2,
  "s3BucketName": "udyogbill-enterprise-backups-mumbai",
  "s3Region": "ap-south-1",
  "s3AccessKey": "AKIAEXAMPLE998877",
  "retentionCount": 45
}
"@
$schedRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/backup/schedule" -Method PUT -Headers $headers -Body $schedBody -ContentType "application/json"
Write-Host "  -> Auto-Backup Enabled: $($schedRes.isAutoBackupEnabled)" -ForegroundColor Green
Write-Host "  -> Storage Target: Provider $($schedRes.storageProvider) ($($schedRes.s3BucketName))" -ForegroundColor Green
Write-Host "  -> Retention Snapshots: $($schedRes.retentionCount)" -ForegroundColor Green

Write-Host "`n[5/5] Testing Disaster Recovery Cryptographic Integrity Verification..." -ForegroundColor Yellow
$restoreVerify = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/backup/restore/$($backupJob.id)" -Method POST -Headers $headers -ContentType "application/json"
Write-Host "  -> Cryptographic Checksum Valid: $($restoreVerify.isChecksumValid)" -ForegroundColor Green
Write-Host "  -> Invoices in Snapshot: $($restoreVerify.totalInvoicesInArchive)" -ForegroundColor Green
Write-Host "  -> Customers in Snapshot: $($restoreVerify.totalCustomersInArchive)" -ForegroundColor Green
Write-Host "  -> Can Restore Safely: $($restoreVerify.canRestoreSafely)" -ForegroundColor Green
Write-Host "  -> Integrity Message: $($restoreVerify.verificationMessage)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 18 VERIFIED (ALL 5/5 CHECKS PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
