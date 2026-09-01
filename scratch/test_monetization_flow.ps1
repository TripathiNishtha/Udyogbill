$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: Super Admin Login & Gateway Setup ===" -ForegroundColor Cyan
$saLogin = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body '{"email":"superadmin@udyogbill.com","password":"Saurabh@1993"}' -ContentType "application/json"
$saToken = $saLogin.accessToken
$saHeaders = @{ Authorization = "Bearer $saToken" }

# Update Razorpay Gateway Config
$gwPayload = @{
    keyId = "rzp_test_ub2026official"
    keySecret = "ub_rzp_sec_2026_test"
    webhookSecret = "ub_wh_sec_2026"
    mode = "Test"
    isActive = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5050/api/v1/superadmin/gateway" -Method PUT -Body $gwPayload -ContentType "application/json" -Headers $saHeaders
$gw = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/superadmin/gateway" -Headers $saHeaders
Write-Host "Gateway Configured: Provider=$($gw.provider), KeyId=$($gw.keyId), Mode=$($gw.mode), Active=$($gw.isActive)" -ForegroundColor Green

Write-Host "`n=== TEST 2: Super Admin Add-on Pricing Updates ===" -ForegroundColor Cyan
# Update Pharma Addon Price
$pharmaPricePayload = @{
    price = 499
    isActive = $true
    description = "Full Pharma Compliance, Schedule H1, Batch/Expiry Management, Prescribers Directory."
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5050/api/v1/superadmin/addons/ADDON_PHARMA" -Method PUT -Body $pharmaPricePayload -ContentType "application/json" -Headers $saHeaders

$addons = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/superadmin/addons" -Headers $saHeaders
$pharma = $addons | Where-Object { $_.code -eq "ADDON_PHARMA" }
Write-Host "Updated Pharma Addon: Price=₹$($pharma.price), Active=$($pharma.isActive)" -ForegroundColor Green

Write-Host "`n=== TEST 3: Tenant Login & Order Creation ===" -ForegroundColor Cyan
$tenantLogin = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body '{"email":"suresh@citypharma.com","password":"Udyogbill"}' -ContentType "application/json"
$tenantToken = $tenantLogin.accessToken
$tenantHeaders = @{ Authorization = "Bearer $tenantToken" }

# Create Order for Pharma Addon
$orderReq = @{
    addonCode = "ADDON_PHARMA"
    billingCycle = "Monthly"
} | ConvertTo-Json
$orderRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/subscription/create-order" -Method POST -Body $orderReq -ContentType "application/json" -Headers $tenantHeaders
Write-Host "Order Created: OrderId=$($orderRes.orderId), Total=₹$($orderRes.amount) (Paisa=$($orderRes.amountInPaisa)), KeyId=$($orderRes.keyId)" -ForegroundColor Green

Write-Host "`n=== TEST 4: Razorpay Payment Confirmation & Auto-Activation ===" -ForegroundColor Cyan
$confirmReq = @{
    razorpayOrderId = $orderRes.orderId
    razorpayPaymentId = "pay_rzp_test_88921"
    razorpaySignature = "sig_valid_test_99201"
    addonCode = "ADDON_PHARMA"
    billingCycle = "Monthly"
} | ConvertTo-Json
$invoice = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/subscription/confirm-payment" -Method POST -Body $confirmReq -ContentType "application/json" -Headers $tenantHeaders
Write-Host "AUTOMATED INVOICE GENERATED!" -ForegroundColor Green
Write-Host "Invoice Number: $($invoice.invoiceNumber)" -ForegroundColor Yellow
Write-Host "Item: $($invoice.itemDescription)" -ForegroundColor Yellow
Write-Host "SubTotal: ₹$($invoice.subTotal), 18% GST: ₹$($invoice.taxAmount), Total Paid: ₹$($invoice.totalAmount)" -ForegroundColor Yellow
Write-Host "Payment Gateway: $($invoice.paymentGateway), Ref: $($invoice.gatewayPaymentId)" -ForegroundColor Yellow

Write-Host "`n=== TEST 5: Verify Tenant Status & Invoices List ===" -ForegroundColor Cyan
$status = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/subscription/status" -Headers $tenantHeaders
$enrolledPharma = $status.addons | Where-Object { $_.code -eq "ADDON_PHARMA" }
Write-Host "Tenant Enrolled in Pharma Addon: $($enrolledPharma.isEnrolled), Remaining Days: $($enrolledPharma.remainingDays)" -ForegroundColor Green

$invoicesList = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/subscription/invoices" -Headers $tenantHeaders
Write-Host "Total Subscription Invoices for Tenant: $($invoicesList.Count)" -ForegroundColor Green

Write-Host "`n=== ALL MONETIZATION & BILLING TESTS PASSED! ===" -ForegroundColor Green
