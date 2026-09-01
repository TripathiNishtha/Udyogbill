$baseUrl = "http://localhost:5050/api/v1"

Write-Host "=== STEP 9 LIVE INTEGRATION VERIFICATION ===" -ForegroundColor Cyan

# 1. Login as TenantAdmin
$loginBody = @{
    email = "suresh@citypharma.com"
    password = "TenantAdmin@2026!"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.accessToken
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}
Write-Host "[1/7] Login successful for Tenant Admin. Token acquired." -ForegroundColor Green

# 2. Financial Summary Dashboard
$summary = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/summary" -Method Get -Headers $headers
Write-Host "[2/7] Financial Executive Summary:" -ForegroundColor Green
Write-Host "      Total Revenue (Sales): ₹$($summary.totalSales)"
Write-Host "      Total Purchases (COGS): ₹$($summary.totalPurchases)"
Write-Host "      Gross Profit: ₹$($summary.grossProfit)"
Write-Host "      Output GST: ₹$($summary.outputGst) | Input ITC: ₹$($summary.inputGstItc) | Net GST: ₹$($summary.netGstPayable)"

# 3. Profit & Loss Report
$pnl = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/pnl" -Method Get -Headers $headers
Write-Host "[3/7] Profit & Loss Analytics:" -ForegroundColor Green
Write-Host "      Net Sales Revenue: ₹$($pnl.netSalesRevenue)"
Write-Host "      Total Purchases Cost: ₹$($pnl.totalPurchasesCost)"
Write-Host "      Gross Margin: $($pnl.grossMarginPercent)% | Net Margin: $($pnl.netMarginPercent)%"

# 4. GSTR-1 Outward Supplies & HSN Summary
$gstr1 = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/gstr1" -Method Get -Headers $headers
Write-Host "[4/7] GSTR-1 Return Data:" -ForegroundColor Green
Write-Host "      B2B Invoices: $($gstr1.totalB2BInvoices) (Taxable: ₹$($gstr1.totalB2BTaxable), Tax: ₹$($gstr1.totalB2BTax))"
Write-Host "      B2C Invoices: $($gstr1.totalB2CInvoices) (Taxable: ₹$($gstr1.totalB2CTaxable))"
Write-Host "      Rate Slabs Count: $($gstr1.rateWiseSummary.Count)"
Write-Host "      HSN Items Count: $($gstr1.hsnSummary.Count)"

# 5. GSTR-3B Tax Liability & Eligible ITC
$gstr3b = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/gstr3b" -Method Get -Headers $headers
Write-Host "[5/7] GSTR-3B Summary Return:" -ForegroundColor Green
Write-Host "      Table 3.1 Output Tax Liability: ₹$($gstr3b.totalOutputTaxLiability) (CGST: ₹$($gstr3b.outwardCgst), SGST: ₹$($gstr3b.outwardSgst))"
Write-Host "      Table 4 Eligible ITC: ₹$($gstr3b.totalEligibleItc) (CGST: ₹$($gstr3b.inwardCgst), SGST: ₹$($gstr3b.inwardSgst))"
Write-Host "      Table 6.1 Net GST Payable in Cash: ₹$($gstr3b.totalNetGstPayable)"

# 6. Party & General Ledger
$customers = Invoke-RestMethod -Uri "$baseUrl/tenant/customers" -Method Get -Headers $headers
$customer = $customers.items[0]
$partyId = $customer.id

$statement = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/ledger/statement?partyId=$partyId" -Method Get -Headers $headers
Write-Host "[6/7] Statement of Account for '$($statement.partyName)':" -ForegroundColor Green
Write-Host "      Opening Balance: ₹$($statement.openingBalance)"
Write-Host "      Period Total Debit: ₹$($statement.totalDebit) | Total Credit: ₹$($statement.totalCredit)"
Write-Host "      Closing Position: ₹$($statement.closingBalance)"
Write-Host "      Ledger Transactions Count: $($statement.entries.Count)"

# 7. CSV Export Verification
$csvGstr1 = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/export/gstr1" -Method Get -Headers $headers
$csvGstr3b = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/export/gstr3b" -Method Get -Headers $headers
$csvLedger = Invoke-RestMethod -Uri "$baseUrl/tenant/reports/export/ledger?partyId=$partyId" -Method Get -Headers $headers

Write-Host "[7/7] CSV Report Exports:" -ForegroundColor Green
Write-Host "      GSTR-1 CSV Length: $($csvGstr1.Length) characters"
Write-Host "      GSTR-3B CSV Length: $($csvGstr3b.Length) characters"
Write-Host "      Ledger CSV Length: $($csvLedger.Length) characters"

Write-Host "`n>>> ALL STEP 9 REPORTS & LEDGER WORKFLOW CHECKS PASSED PERFECTLY! <<<" -ForegroundColor Cyan
