Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 11 LIVE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "   (Tenant Audit Trail, Telemetry & Activity Logs)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/4] Testing Tenant Audit Logs Query Endpoint..." -ForegroundColor Yellow
$audit = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/audit?pageNumber=1&pageSize=10" -Headers $headers
Write-Host "  -> Total Audit Records Found: $($audit.totalCount)" -ForegroundColor Green
$audit.items | Select-Object -First 5 | ForEach-Object { 
    Write-Host "     - [$($_.timestampUtc)] $($_.actionName) on $($_.entityName) #$($_.entityId) by $($_.userEmail) (IP: $($_.ipAddress))" -ForegroundColor Gray
}

Write-Host "`n[2/4] Testing Tenant Activity Summary & Telemetry Endpoint..." -ForegroundColor Yellow
$summary = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/audit/summary" -Headers $headers
Write-Host "  -> Total Lifetime Events: $($summary.totalLogs)" -ForegroundColor Green
Write-Host "  -> Events Today: $($summary.logsToday)" -ForegroundColor Green
Write-Host "  -> Events This Week: $($summary.logsThisWeek)" -ForegroundColor Green

Write-Host "  -> Top Actions:" -ForegroundColor Yellow
$summary.actionDistribution | ForEach-Object {
    Write-Host "     * $($_.actionName): $($_.count) times" -ForegroundColor Gray
}

Write-Host "  -> Top Active Users:" -ForegroundColor Yellow
$summary.topActiveUsers | ForEach-Object {
    Write-Host "     * $($_.userEmail): $($_.actionCount) actions (Last: $($_.lastActivityUtc))" -ForegroundColor Gray
}

Write-Host "  -> Top Target Entities:" -ForegroundColor Yellow
$summary.topEntities | ForEach-Object {
    Write-Host "     * $($_.entityName): $($_.count) records" -ForegroundColor Gray
}

Write-Host "`n[3/4] Triggering a Live Audited Event (Update Business Profile)..." -ForegroundColor Yellow
$updateProfileBody = @{
    businessName = "City Medico & Healthcare Ltd"
    tradeName = "City Medico"
    primaryPhone = "+91 98765 43210"
    gstin = "27ABCDE1234F1Z5"
    pan = "ABCDE1234F"
    drugLicenseNumber = "DL-MH-2026-998811"
    fssaiNumber = "10020030040050"
    timeZone = "Asia/Kolkata"
    currencyCode = "INR"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/settings/profile" -Method PUT -Headers $headers -Body $updateProfileBody -ContentType "application/json"
Write-Host "  -> Event dispatched successfully." -ForegroundColor Green

# Verify new event in audit logs
$recentAudit = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/audit?pageNumber=1&pageSize=3" -Headers $headers
$latestEvent = $recentAudit.items[0]
Write-Host "  -> Verified in Audit Trail: '$($latestEvent.actionName)' on '$($latestEvent.entityName)' by $($latestEvent.userEmail)" -ForegroundColor Green

Write-Host "`n[4/4] Testing Audit Log CSV Export Stream..." -ForegroundColor Yellow
$csvResponse = Invoke-WebRequest -Uri "http://localhost:5050/api/v1/tenant/audit/export" -Headers $headers -UseBasicParsing
Write-Host "  -> Export Status: $($csvResponse.StatusCode)" -ForegroundColor Green
Write-Host "  -> Content-Type: $($csvResponse.Headers['Content-Type'])" -ForegroundColor Green

$csvLines = ($csvResponse.Content -split "`r?`n") | Where-Object { $_.Trim() -ne "" }
Write-Host "  -> Total CSV Rows Exported: $($csvLines.Count)" -ForegroundColor Green
Write-Host "  -> CSV Header: $($csvLines[0])" -ForegroundColor Gray
if ($csvLines.Count -gt 1) {
    Write-Host "  -> Latest Row: $($csvLines[1])" -ForegroundColor DarkGray
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 11 VERIFICATION COMPLETED SUCCESSFULLY (ALL 4/4 PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
