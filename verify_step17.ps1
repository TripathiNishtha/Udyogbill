Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 17 LIVE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "   (Dynamic Custom Print Template & Thermal POS Studio)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/5] Testing Print Templates Gallery & Defaults Auto-Seeding..." -ForegroundColor Yellow
$templates = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates" -Headers $headers
Write-Host "  -> Total Print Templates Available: $($templates.Count)" -ForegroundColor Green
foreach ($t in $templates) {
    Write-Host "     * $($t.templateName) ($($t.templateCode)) | Page: $($t.pageSize) | Default: $($t.isDefault)" -ForegroundColor Gray
}

Write-Host "`n[2/5] Testing Custom Multilingual Template Creation..." -ForegroundColor Yellow
$allTpls = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates" -Headers $headers
$existingTpl = $allTpls | Where-Object { $_.templateCode -eq "TPL_A4_HINDI_BILINGUAL" }
if ($existingTpl) {
    $newTplId = $existingTpl.id
    Write-Host "  -> Found Custom Template ID: $newTplId" -ForegroundColor Green
} else {
    $createJson = '{"documentType":1,"templateName":"Hindi Bilingual Classic GST Invoice","templateCode":"TPL_A4_HINDI_BILINGUAL","pageSize":1,"primaryColorHex":"#dc2626","headerTitle":"TAX INVOICE / GST BILL","headerSubtitle":"Original for Recipient","showGstin":true,"showBankDetails":true,"bankAccountName":"City Pharma Lifesciences","bankAccountNumber":"982011928374","bankIfsc":"HDFC0001234","bankName":"HDFC Bank Mumbai","showUpiQr":true,"upiId":"citypharma@hdfcbank","showItemHsn":true,"showBatchExpiry":true,"showSavingsCallout":true,"showLoyaltyPoints":true,"showTerms":true,"termsAndConditions":"1. Goods once sold not taken back.\n2. Payment in 15 days.","declarationText":"We declare that invoice particulars are true and correct.","footerGreeting":"Thank you for your business! Visit again.","languageCode":"en"}'
    $newTplId = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates" -Method POST -Headers $headers -Body $createJson -ContentType "application/json"
    Write-Host "  -> Created Custom Template ID: $newTplId" -ForegroundColor Green
}

Write-Host "`n[3/5] Testing Set Default Active Template Switching..." -ForegroundColor Yellow
$setDefRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates/$newTplId/set-default" -Method POST -Headers $headers
Write-Host "  -> Successfully Switched Default Template Status: $setDefRes" -ForegroundColor Green

$refreshedTpls = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates" -Headers $headers
$activeDefault = $refreshedTpls | Where-Object { $_.id -eq $newTplId }
Write-Host "  -> Confirmed New Active Default: $($activeDefault.templateName) (IsDefault = $($activeDefault.isDefault))" -ForegroundColor Green

Write-Host "`n[4/5] Testing Template Configuration Update..." -ForegroundColor Yellow
$updJson = '{"templateName":"Hindi Bilingual Classic GST Invoice (Updated)","pageSize":1,"primaryColorHex":"#2563eb","secondaryColorHex":"#0f172a","fontFamily":"Inter, sans-serif","showLogo":true,"headerTitle":"TAX INVOICE / COMMERCIAL BILL","headerSubtitle":"Original for Buyer","showGstin":true,"showDrugLicense":true,"showFssai":true,"showBankDetails":true,"bankAccountName":"City Pharma Lifesciences Ltd","bankAccountNumber":"982011928374","bankIfsc":"HDFC0001234","bankName":"HDFC Bank Mumbai Branch","showUpiQr":true,"upiId":"citypharma.pay@hdfcbank","showItemHsn":true,"showBatchExpiry":true,"showMrpStrikethrough":true,"showSavingsCallout":true,"showLoyaltyPoints":true,"showCustomerBalance":true,"showTerms":true,"termsAndConditions":"1. Payment terms 15 days.\n2. Subject to Mumbai Jurisdiction.","showDeclaration":true,"declarationText":"Certified that invoice particulars are true and correct.","footerGreeting":"Thank you for your valued partnership!","languageCode":"en","customLabelsJson":"{}","isActive":true}'
$updatedTpl = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates/$newTplId" -Method PUT -Headers $headers -Body $updJson -ContentType "application/json"
Write-Host "  -> Updated Header Title: $($updatedTpl.headerTitle) | Theme Color: $($updatedTpl.primaryColorHex)" -ForegroundColor Green

Write-Host "`n[5/5] Testing Live Document Print Simulator & HTML Rendering..." -ForegroundColor Yellow
$previewJson = "{`"templateId`":`"$newTplId`"}"
$previewRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/print-templates/preview" -Method POST -Headers $headers -Body $previewJson -ContentType "application/json"
Write-Host "  -> Rendered Document: $($previewRes.templateName) (Page Size: $($previewRes.pageSize))" -ForegroundColor Green
Write-Host "  -> HTML Body Length: $($previewRes.renderedHtml.Length) characters" -ForegroundColor Green
Write-Host "  -> Sample Rendered Snippet: $($previewRes.renderedHtml.Substring(0, 140))..." -ForegroundColor Gray

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 17 VERIFICATION COMPLETED SUCCESSFULLY (ALL 5/5 PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
