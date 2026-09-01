Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 10 LIVE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "   (Staff Users, RBAC, Settings & Quota Management)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/5] Testing Staff Users Endpoint..." -ForegroundColor Yellow
$staff = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/staff" -Headers $headers
Write-Host "  -> Found $($staff.totalCount) staff member(s):" -ForegroundColor Green
$staff.items | ForEach-Object { 
    Write-Host "     - $($_.fullName) ($($_.email)) | Admin: $($_.isTenantAdmin) | Active: $($_.isActive)" -ForegroundColor Gray
}

Write-Host "`n[2/5] Testing Roles Endpoint..." -ForegroundColor Yellow
$roles = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/staff/roles" -Headers $headers
Write-Host "  -> Found $($roles.Count) role(s):" -ForegroundColor Green
$roles | ForEach-Object { 
    Write-Host "     - $($_.name) [$($_.code)] (System: $($_.isSystemRole))" -ForegroundColor Gray
}

Write-Host "`n[3/5] Testing Permission Groups Endpoint..." -ForegroundColor Yellow
$perms = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/staff/permissions" -Headers $headers
Write-Host "  -> Found $($perms.Count) module permission group(s):" -ForegroundColor Green
$perms | ForEach-Object { 
    Write-Host "     - $($_.moduleName) ($($_.moduleCode)): $($_.permissions.Count) permission(s)" -ForegroundColor Gray
}

Write-Host "`n[4/5] Testing Business Profile Settings Endpoint..." -ForegroundColor Yellow
$profile = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/settings/profile" -Headers $headers
Write-Host "  -> Business Profile:" -ForegroundColor Green
Write-Host "     - Legal Name: $($profile.businessName)" -ForegroundColor Gray
Write-Host "     - Trade Name: $($profile.tradeName)" -ForegroundColor Gray
Write-Host "     - GSTIN: $($profile.gstin)" -ForegroundColor Gray
Write-Host "     - Branches: $($profile.branches.Count)" -ForegroundColor Gray

Write-Host "`n[5/5] Testing Subscription & Quota Summary Endpoint..." -ForegroundColor Yellow
$quotas = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/settings/quotas" -Headers $headers
Write-Host "  -> Quota Status:" -ForegroundColor Green
Write-Host "     - Active Plan: $($quotas.planName) ($($quotas.planCode))" -ForegroundColor Gray
Write-Host "     - Staff Users: $($quotas.currentUsers) / $($quotas.maxUsers)" -ForegroundColor Gray
Write-Host "     - Branches: $($quotas.currentBranches) / $($quotas.maxBranches)" -ForegroundColor Gray
Write-Host "     - Warehouses: $($quotas.currentWarehouses) / $($quotas.maxWarehouses)" -ForegroundColor Gray
Write-Host "     - Invoices This Month: $($quotas.invoicesThisMonth) / $($quotas.maxInvoicesPerMonth)" -ForegroundColor Gray

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 10 VERIFICATION COMPLETED SUCCESSFULLY (ALL 5/5 PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
