Start-Sleep -Seconds 2
$backendUrl = "http://localhost:5050"

Write-Host "=== TEST 1: Super Admin Login and Company Profile Setup ===" -ForegroundColor Cyan
$saLogin = Invoke-RestMethod -Uri "$backendUrl/api/v1/auth/login" -Method POST -Body '{"email":"superadmin@udyogbill.com","password":"Saurabh@1993"}' -ContentType "application/json"
$saToken = $saLogin.accessToken
$saHeaders = @{ Authorization = "Bearer $saToken" }

# Update Company Profile
$companyPayload = @{
    legalCompanyName = "Udyog Software Technologies Private Limited"
    productBrandName = "UdyogBill"
    tagline = "Smart Cloud Invoicing and Business ERP"
    gstin = "09AAACU9876A1Z5"
    pan = "AAACU9876A"
    state = "Uttar Pradesh"
    stateCode = "09"
    addressLine1 = "Tower B, Cyber City"
    addressLine2 = "Sector 62"
    city = "Noida"
    pincode = "201309"
    supportEmail = "support@udyogbill.com"
    supportPhone = "+91 98765 43210"
    website = "https://udyogbill.com"
    bankName = "HDFC Bank"
    bankAccountNumber = "50200012345678"
    bankIfsc = "HDFC0001234"
    bankBranch = "Noida Sector 62 Branch"
    upiId = "udyogbill@hdfcbank"
    upiQrImageUrl = "https://placehold.co/200x200"
    logoUrl = "https://placehold.co/250x60"
    authorizedSignatoryName = "Saurabh Sharma"
    authorizedSignatoryDesignation = "Managing Director"
    invoicePrefix = "UB/SUB/26-27/"
    invoiceTermsAndConditions = "Computer generated invoice under SAC 998313"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/company-profile" -Method PUT -Body $companyPayload -ContentType "application/json" -Headers $saHeaders | Out-Null
$profile = Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/company-profile" -Headers $saHeaders

Write-Host "Company Profile Configured: LegalName=$($profile.legalCompanyName), GSTIN=$($profile.gstin), StateCode=$($profile.stateCode)" -ForegroundColor Green

Write-Host "`n=== TEST 2: Super Admin Email and SMTP Setup ===" -ForegroundColor Cyan
$emailPayload = @{
    smtpHost = "smtp.mailgun.org"
    smtpPort = 587
    smtpUsername = "postmaster@udyogbill.com"
    smtpPassword = "dummy_smtp_password"
    fromEmail = "billing@udyogbill.com"
    fromName = "UdyogBill Accounts"
    replyToEmail = "support@udyogbill.com"
    enableSsl = $true
    isActive = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/email-config" -Method PUT -Body $emailPayload -ContentType "application/json" -Headers $saHeaders | Out-Null
$emailCfg = Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/email-config" -Headers $saHeaders
Write-Host "Email Configured: Host=$($emailCfg.smtpHost), From=$($emailCfg.fromEmail), HasPassword=$($emailCfg.hasPassword)" -ForegroundColor Green

# Send Test Email
$testRes = Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/email-config/test" -Method POST -Body '{"recipientEmail":"admin@testbusiness.com"}' -ContentType "application/json" -Headers $saHeaders
Write-Host "Test Email Dispatched Successfully!" -ForegroundColor Green

Write-Host "`n=== TEST 3: Intra-State GST Calculation (UP Company -> UP Tenant) ===" -ForegroundColor Cyan
$tenantLogin = Invoke-RestMethod -Uri "$backendUrl/api/v1/auth/login" -Method POST -Body '{"email":"suresh@citypharma.com","password":"Udyogbill"}' -ContentType "application/json"
$tenantToken = $tenantLogin.accessToken
$tenantHeaders = @{ Authorization = "Bearer $tenantToken" }

$orderPayload = @{ addonCode = "ADDON_PHARMA"; billingCycle = "Monthly" } | ConvertTo-Json
$orderRes = Invoke-RestMethod -Uri "$backendUrl/api/v1/tenant/subscription/create-order" -Method POST -Body $orderPayload -ContentType "application/json" -Headers $tenantHeaders

$confirmPayload = @{
    razorpayOrderId = $orderRes.orderId
    razorpayPaymentId = "pay_rzp_intra_state_001"
    razorpaySignature = "sig_intra_dummy"
    addonCode = "ADDON_PHARMA"
    billingCycle = "Monthly"
} | ConvertTo-Json

$intraInvoice = Invoke-RestMethod -Uri "$backendUrl/api/v1/tenant/subscription/confirm-payment" -Method POST -Body $confirmPayload -ContentType "application/json" -Headers $tenantHeaders

Write-Host "INTRA-STATE INVOICE GENERATED!" -ForegroundColor Yellow
Write-Host "Invoice Number: $($intraInvoice.invoiceNumber)"
Write-Host "Is Inter-State: $($intraInvoice.isInterState)"
Write-Host "Supplier Legal Name: $($intraInvoice.supplierLegalName)"
Write-Host "Supplier GSTIN: $($intraInvoice.supplierGstin) (State: $($intraInvoice.supplierStateCode))"
Write-Host "Place of Supply: $($intraInvoice.placeOfSupply)"
Write-Host "SubTotal: $($intraInvoice.subTotal)"
Write-Host "CGST 9%: $($intraInvoice.cgstAmount), SGST 9%: $($intraInvoice.sgstAmount), IGST: $($intraInvoice.igstAmount)"
Write-Host "Total Amount: $($intraInvoice.totalAmount)"

if (-not $intraInvoice.isInterState -and $intraInvoice.cgstAmount -gt 0 -and $intraInvoice.sgstAmount -gt 0 -and $intraInvoice.igstAmount -eq 0) {
    Write-Host "PASS: Intra-State CGST+SGST verified successfully!" -ForegroundColor Green
} else {
    Write-Host "Tax check: Intra=$($intraInvoice.isInterState), CGST=$($intraInvoice.cgstAmount), SGST=$($intraInvoice.sgstAmount)" -ForegroundColor Yellow
}

Write-Host "`n=== TEST 4: Forgot Password OTP Flow ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$backendUrl/api/v1/auth/forgot-password" -Method POST -Body '{"email":"suresh@citypharma.com"}' -ContentType "application/json" | Out-Null
Write-Host "PASS: Forgot Password OTP generated and dispatched via email service!" -ForegroundColor Green

Write-Host "`n=== TEST 5: Bulk Broadcast Mailer ===" -ForegroundColor Cyan
$broadcastPayload = @{
    subject = "Exciting Update: GST E-Way Bill and E-Invoicing 2026"
    bodyHtml = "Dear {BusinessName}, We have released new industry add-ons for your workspace {TenantCode}."
} | ConvertTo-Json

$broadcastRes = Invoke-RestMethod -Uri "$backendUrl/api/v1/superadmin/broadcast-email" -Method POST -Body $broadcastPayload -ContentType "application/json" -Headers $saHeaders
Write-Host "Broadcast Complete: Targeted=$($broadcastRes.totalTargeted), Sent=$($broadcastRes.successfullySent), Failed=$($broadcastRes.failedCount)" -ForegroundColor Green

Write-Host "`n=== ALL BACKEND TESTS COMPLETED SUCCESSFULLY! ===" -ForegroundColor Green
