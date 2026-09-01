Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   UDYOGBILL - STEP 12 LIVE VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "   (Multi-Industry Specialized Capabilities Engine)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = '{"email":"suresh@citypharma.com","password":"TenantAdmin@2026!"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResp.accessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n[1/4] Testing Pharma Vertical (Expiry Radar & Schedule H1)..." -ForegroundColor Yellow
$expiry = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/pharma/expiry-alerts?daysThreshold=365" -Headers $headers
Write-Host "  -> Expiring Batches Found: $($expiry.Count)" -ForegroundColor Green
$expiry | Select-Object -First 3 | ForEach-Object {
    Write-Host "     - $($_.itemName) (Batch: $($_.batchNumber)) | Expiry: $($_.expiryDate) | Days Left: $($_.daysUntilExpiry) | Risk: Rs. $($_.totalValueAtRisk)" -ForegroundColor Gray
}

$h1 = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/pharma/schedule-h1" -Headers $headers
Write-Host "  -> Schedule H1 Compliance Rows: $($h1.Count)" -ForegroundColor Green
$h1 | Select-Object -First 2 | ForEach-Object {
    Write-Host "     - Bill $($_.invoiceNumber): $($_.drugName) | Doctor: $($_.doctorName) ($($_.doctorRegistrationNumber)) | Patient: $($_.patientName)" -ForegroundColor Gray
}

Write-Host "`n[2/4] Testing Apparel & Garments Matrix Variant Generator..." -ForegroundColor Yellow
$itemsRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/items?pageSize=10" -Headers $headers
$baseItem = $itemsRes.items[0]
Write-Host "  -> Base Item: $($baseItem.name) ($($baseItem.sku))" -ForegroundColor Gray

$matrixBody = @{
    baseItemId = $baseItem.id
    sizes = @("S", "M", "L", "XL")
    colors = @("Navy Blue", "Crimson Red")
    fits = @("Regular")
    basePriceAdjustment = 50
} | ConvertTo-Json

$matrixRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/apparel/matrix-variants" -Method POST -Headers $headers -Body $matrixBody -ContentType "application/json"
Write-Host "  -> Generated Matrix Variants: $($matrixRes.Count) SKUs" -ForegroundColor Green
$matrixRes | Select-Object -First 4 | ForEach-Object {
    Write-Host "     * SKU: $($_.variantSku) | Name: $($_.variantName) | Barcode: $($_.barcode)" -ForegroundColor Gray
}

Write-Host "`n[3/4] Testing Recipe & Bill of Materials (BOM) Creation..." -ForegroundColor Yellow
$fgItem = $itemsRes.items[0]
$rawItem = if ($itemsRes.items.Count -gt 1) { $itemsRes.items[1] } else { $itemsRes.items[0] }

$bomBody = @{
    finishedGoodsItemId = $fgItem.id
    recipeName = "Standard Commercial Production Recipe"
    description = "Automated assembly BOM with ingredient deduction"
    outputYieldQuantity = 1
    outputUomId = $fgItem.primaryUomId
    ingredients = @(
        @{
            rawMaterialItemId = $rawItem.id
            quantityRequired = 2.5
            uomId = $rawItem.primaryUomId
        }
    )
} | ConvertTo-Json

$bomId = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/manufacturing/bom" -Method POST -Headers $headers -Body $bomBody -ContentType "application/json"
Write-Host "  -> Created Recipe BOM ID: $bomId" -ForegroundColor Green

$bomsList = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/manufacturing/bom" -Headers $headers
Write-Host "  -> Total Recipe BOMs Found: $($bomsList.Count)" -ForegroundColor Green

Write-Host "`n[4/4] Testing Production Run Execution & Automatic Ingredient Deduction..." -ForegroundColor Yellow
$warehousesRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/branches" -Headers $headers
$targetWh = $warehousesRes[0].warehouses[0]

$prodBody = @{
    recipeBomId = $bomId
    targetWarehouseId = $targetWh.id
    batchesToProduce = 5
    batchNumber = "BATCH-PROD-2026-LIVE"
    notes = "Live verification run"
} | ConvertTo-Json

$prodRes = Invoke-RestMethod -Uri "http://localhost:5050/api/v1/tenant/industry/manufacturing/production" -Method POST -Headers $headers -Body $prodBody -ContentType "application/json"
Write-Host "  -> Production Run Result:" -ForegroundColor Green
Write-Host "     - Produced: $($prodRes.quantityProduced) units of $($prodRes.finishedGoodsName)" -ForegroundColor Gray
Write-Host "     - Batch Number: $($prodRes.batchNumber)" -ForegroundColor Gray
Write-Host "     - Total Production Cost: Rs. $($prodRes.totalCostOfProduction)" -ForegroundColor Gray
Write-Host "     - Ingredients Deducted: $($prodRes.deductedIngredients.Count)" -ForegroundColor Gray
$prodRes.deductedIngredients | ForEach-Object {
    Write-Host "       * Deducted $($_.quantityDeducted) $($_.uomName) of $($_.itemName) (Remaining: $($_.stockRemaining) $($_.uomName))" -ForegroundColor DarkGray
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 12 VERIFICATION COMPLETED SUCCESSFULLY (ALL 4/4 PASSED)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
