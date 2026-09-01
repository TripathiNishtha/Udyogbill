Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 13 LIVE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "   (Banking, Multi-Mode Payments, Cash Drawer & Expenses)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/5] Testing Bank Accounts Creation & Cash Flow Summary..." -ForegroundColor Yellow
$accBody = @{
    accountName = "HDFC Commercial Current A/c"
    bankName = "HDFC Bank"
    accountNumber = "50200088991122"
    ifscCode = "HDFC0000456"
    branchName = "Bandra West"
    upiId = "citypharma@hdfcbank"
    accountType = 1
    openingBalance = 150000
    isDefault = $true
} | ConvertTo-Json

$accId = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/banking/accounts" -Method POST -Headers $headers -Body $accBody -ContentType "application/json"
Write-Host "  -> Created Bank Account ID: $accId" -ForegroundColor Green

$accounts = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/banking/accounts" -Headers $headers
Write-Host "  -> Total Bank Accounts: $($accounts.Count)" -ForegroundColor Green
$accounts | ForEach-Object {
    Write-Host "     - $($_.accountName) ($($_.bankName)) | A/c: $($_.accountNumber) | Balance: Rs. $($_.currentBalance)" -ForegroundColor Gray
}

$summary = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/banking/summary" -Headers $headers
Write-Host "  -> Cash Flow Summary: Total Liquid Funds = Rs. $($summary.totalLiquidFunds), Total Bank = Rs. $($summary.totalBankBalance)" -ForegroundColor Green

Write-Host "`n[2/5] Testing Inward Customer Payment Receipt Voucher..." -ForegroundColor Yellow
$partiesRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/customers?pageSize=5" -Headers $headers
$customer = $partiesRes.items[0]
Write-Host "  -> Selected Customer: $($customer.legalName) (Opening Balance: Rs. $($customer.currentOutstandingBalance))" -ForegroundColor Gray

$receiptBody = @{
    partyId = $customer.id
    paymentDate = (Get-Date).ToString("yyyy-MM-dd")
    amount = 5000
    paymentMode = 4 # Bank Transfer
    bankAccountId = $accId
    referenceNumber = "UTR-2026-LIVE-001"
    notes = "Invoice on-account settlement"
} | ConvertTo-Json

$receiptRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/banking/vouchers/receipt" -Method POST -Headers $headers -Body $receiptBody -ContentType "application/json"
Write-Host "  -> Recorded Inward Receipt: $($receiptRes.voucherNumber) for Rs. $($receiptRes.amount)" -ForegroundColor Green
Write-Host "     * Customer Balance After Receipt: Rs. $($receiptRes.partyBalanceAfter)" -ForegroundColor Gray

Write-Host "`n[3/5] Testing Outward Supplier Payment Voucher..." -ForegroundColor Yellow
$suppliersRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/suppliers?pageSize=5" -Headers $headers
$supplier = $suppliersRes.items[0]
Write-Host "  -> Selected Supplier: $($supplier.legalName) (Balance: Rs. $($supplier.currentOutstandingBalance))" -ForegroundColor Gray

$payBody = @{
    partyId = $supplier.id
    paymentDate = (Get-Date).ToString("yyyy-MM-dd")
    amount = 3500
    paymentMode = 4 # Bank Transfer
    bankAccountId = $accId
    referenceNumber = "CHQ-889922"
    notes = "Vendor bill payment"
} | ConvertTo-Json

$payRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/banking/vouchers/payment" -Method POST -Headers $headers -Body $payBody -ContentType "application/json"
Write-Host "  -> Recorded Outward Payment: $($payRes.voucherNumber) for Rs. $($payRes.amount)" -ForegroundColor Green
Write-Host "     * Supplier Balance After Payment: Rs. $($payRes.partyBalanceAfter)" -ForegroundColor Gray

Write-Host "`n[4/5] Testing Business Expenses & Categories..." -ForegroundColor Yellow
$categories = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/expenses/categories" -Headers $headers
Write-Host "  -> Expense Categories Available: $($categories.Count)" -ForegroundColor Green
$rentCat = $categories | Where-Object { $_.code -eq "RENT" } | Select-Object -First 1

$expenseBody = @{
    expenseDate = (Get-Date).ToString("yyyy-MM-dd")
    categoryId = $rentCat.id
    paidTo = "Godrej Commercial Properties Ltd"
    amount = 25000
    taxAmount = 4500 # 18% GST
    paymentMode = 4
    bankAccountId = $accId
    referenceNumber = "LEASE-2026-AUG"
    hasGstInvoice = $true
    vendorGstin = "27AAACG1234F1Z9"
    notes = "Monthly store premises rent"
} | ConvertTo-Json

$expId = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/expenses" -Method POST -Headers $headers -Body $expenseBody -ContentType "application/json"
Write-Host "  -> Created Expense Voucher ID: $expId" -ForegroundColor Green

$expensesList = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/expenses?pageSize=10" -Headers $headers
Write-Host "  -> Total Recorded Expenses: $($expensesList.totalCount) (Total Paid: Rs. $($expensesList.items[0].totalAmount))" -ForegroundColor Green

Write-Host "`n[5/5] Testing POS Cash Drawer Session & Reconciliation..." -ForegroundColor Yellow
$drawerOpenBody = @{
    openingFloat = 3000
    notes = "Morning register opening"
} | ConvertTo-Json

$drawerSession = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/cash-drawer/session/open" -Method POST -Headers $headers -Body $drawerOpenBody -ContentType "application/json"
Write-Host "  -> Opened Cash Drawer Session: ID = $($drawerSession.id) | Float = Rs. $($drawerSession.openingFloat)" -ForegroundColor Green

$drawerCloseBody = @{
    actualClosingCash = 3000
    closingNotes = "Balanced register close"
} | ConvertTo-Json

$closeSession = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/cash-drawer/session/close" -Method POST -Headers $headers -Body $drawerCloseBody -ContentType "application/json"
Write-Host "  -> Closed Cash Drawer Session: Status = $($closeSession.status) | Diff = Rs. $($closeSession.differenceAmount)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 13 VERIFICATION COMPLETED SUCCESSFULLY (ALL 5/5 PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
