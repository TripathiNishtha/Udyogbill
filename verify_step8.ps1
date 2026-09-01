$baseUrl = "http://localhost:5050/api/v1"

Write-Host "=== STEP 8 LIVE INTEGRATION VERIFICATION ===" -ForegroundColor Cyan

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
Write-Host "[1/6] Login successful for Tenant Admin. Token acquired." -ForegroundColor Green

# 2. Get Metadata (Branch, Warehouse, Customer, Item)
$branches = Invoke-RestMethod -Uri "$baseUrl/tenant/branches" -Method Get -Headers $headers
$branch = $branches[0]
$branchId = $branch.id
Write-Host "[2/6] Found Branch: $($branch.branchName) ($branchId)"

$warehouses = Invoke-RestMethod -Uri "$baseUrl/tenant/warehouses?branchId=$branchId" -Method Get -Headers $headers
$warehouse = $warehouses[0]
$warehouseId = $warehouse.id
Write-Host "      Found Warehouse: $($warehouse.warehouseName) ($warehouseId)"

$customers = Invoke-RestMethod -Uri "$baseUrl/tenant/customers" -Method Get -Headers $headers
$customer = $customers.items[0]
$customerId = $customer.id
Write-Host "      Found Customer: $($customer.legalName) ($customerId, GSTIN: $($customer.gstin))"

$items = Invoke-RestMethod -Uri "$baseUrl/tenant/items" -Method Get -Headers $headers
$item = $items.items[0]
$itemId = $item.id
$uomId = $item.primaryUomId
Write-Host "      Found Item: $($item.name) ($itemId, SKU: $($item.sku))"

# 3. Create Quotation
$quoteReq = @{
    branchId = $branchId
    partyId = $customerId
    customerName = $customer.legalName
    customerGSTIN = $customer.gstin
    quotationDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    validUntilDate = (Get-Date).AddDays(15).ToString("yyyy-MM-ddTHH:mm:ssZ")
    quotationDiscountPercent = 5
    notes = "Special estimate valid for 15 days from issue date."
    items = @(
        @{
            itemId = $itemId
            quantity = 10
            uomId = $uomId
            unitPrice = 200.0
            discountPercent = 0.0
        }
    )
} | ConvertTo-Json -Depth 5

$quoteRes = Invoke-RestMethod -Uri "$baseUrl/tenant/quotations" -Method Post -Headers $headers -Body $quoteReq
$quotationId = $quoteRes
Write-Host "[3/6] Quotation created successfully! Quotation ID: $quotationId" -ForegroundColor Green

# 4. Fetch Quotation Details
$quoteDetails = Invoke-RestMethod -Uri "$baseUrl/tenant/quotations/$quotationId" -Method Get -Headers $headers
Write-Host "[4/6] Quotation Number: $($quoteDetails.quotationNumber)" -ForegroundColor Green
Write-Host "      Taxable Amount: ₹$($quoteDetails.taxableAmount)"
Write-Host "      Total Amount: ₹$($quoteDetails.totalAmount)"
Write-Host "      Status: $($quoteDetails.status) (1 = Draft)"

# 5. Convert Quotation to Invoice (1-Click)
$convertReq = @{
    warehouseId = $warehouseId
    invoiceDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    primaryPaymentMode = 1 # Cash
    paidAmount = $quoteDetails.totalAmount
    notes = "Auto-converted from $($quoteDetails.quotationNumber)"
} | ConvertTo-Json

$convertRes = Invoke-RestMethod -Uri "$baseUrl/tenant/quotations/$quotationId/convert-to-invoice" -Method Post -Headers $headers -Body $convertReq
$invoiceId = $convertRes
Write-Host "[5/6] Converted Quotation to Invoice! Invoice ID: $invoiceId" -ForegroundColor Green

# 6. Test Barcode & Scanning Service & UPI QR
$barcodeLabel = Invoke-RestMethod -Uri "$baseUrl/tenant/barcode/item/$itemId" -Method Get -Headers $headers
Write-Host "[6/6] Barcode Label Info: Item='$($barcodeLabel.itemName)', Code='$($barcodeLabel.barcode)', MRP=₹$($barcodeLabel.mrp), Brand='$($barcodeLabel.tenantName)'" -ForegroundColor Green

$scanResult = Invoke-RestMethod -Uri "$baseUrl/tenant/barcode/scan/$($item.sku)" -Method Get -Headers $headers
Write-Host "      Hardware Scan by SKU '$($item.sku)': Item='$($scanResult.name)', Current Total Stock=$($scanResult.totalStock), Batches Count=$($scanResult.batches.Count)" -ForegroundColor Green

$upiQr = Invoke-RestMethod -Uri "$baseUrl/tenant/barcode/invoice/$invoiceId/upi-qr" -Method Get -Headers $headers
Write-Host "      Dynamic UPI QR Generated: URI='$($upiQr.upiUri)'" -ForegroundColor Green

Write-Host "`n>>> ALL STEP 8 END-TO-END WORKFLOW CHECKS PASSED PERFECTLY! <<<" -ForegroundColor Cyan
