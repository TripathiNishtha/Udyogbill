using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BarcodeService : IBarcodeService
{
    private static readonly HttpClient _httpClient = CreateHttpClient();

    private static HttpClient CreateHttpClient()
    {
        var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(2500) };
        client.DefaultRequestHeaders.Add("User-Agent", "UdyogBill-POS/1.0 (https://udyogbill.com)");
        return client;
    }

    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUserContext;

    public BarcodeService(AppDbContext context, ICurrentUserContext currentUserContext)
    {
        _context = context;
        _currentUserContext = currentUserContext;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _currentUserContext.TenantId;
        if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Tenant context is required.");
        }
        return tenantId.Value;
    }

    private static (string Size, string Color) GetVariantSizeAndColor(ItemVariant v)
    {
        string size = "";
        string color = "";
        if (!string.IsNullOrWhiteSpace(v.AttributesJson))
        {
            try
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(v.AttributesJson);
                if (dict != null)
                {
                    if (dict.TryGetValue("size", out var s)) size = s;
                    if (dict.TryGetValue("color", out var c)) color = c;
                }
            }
            catch { }
        }
        return (size, color);
    }

    public async Task<Result<BarcodeItemLabelDto>> GetBarcodeItemLabelAsync(Guid itemId, Guid? batchId = null, Guid? variantId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .Include(i => i.Brand)
            .Include(i => i.Category)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == itemId && !i.IsDeleted, cancellationToken);

        if (item == null)
        {
            return Result<BarcodeItemLabelDto>.Failure("Item not found.", "NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        string? batchNum = null;
        DateTime? expDate = null;
        decimal mrp = item.MRP;
        decimal price = item.SellingPrice;
        string itemSku = item.Sku;

        if (batchId.HasValue)
        {
            var batch = await _context.ItemBatches
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == batchId.Value && !b.IsDeleted, cancellationToken);

            if (batch != null)
            {
                batchNum = batch.BatchNumber;
                expDate = batch.ExpiryDate;
                if (batch.MRP > 0) mrp = batch.MRP;
                if (batch.SaleRate > 0) price = batch.SaleRate;
            }
        }

        var barcode = !string.IsNullOrWhiteSpace(item.Barcode) ? item.Barcode : item.Sku;

        // Fetch variants if any exist
        var variants = await _context.ItemVariants
            .Where(v => v.TenantId == tenantId && v.ItemId == itemId && !v.IsDeleted)
            .OrderBy(v => v.VariantSku)
            .ToListAsync(cancellationToken);

        var variantStockMap = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && s.ItemId == itemId && s.VariantId.HasValue)
            .GroupBy(s => s.VariantId!.Value)
            .Select(g => new { VariantId = g.Key, Stock = g.Sum(x => x.CurrentQuantity) })
            .ToDictionaryAsync(x => x.VariantId, x => x.Stock, cancellationToken);

        var variantOptions = variants.Select(v =>
        {
            var (s, c) = GetVariantSizeAndColor(v);
            return new BarcodeVariantOptionDto
            {
                Id = v.Id,
                Size = s,
                Color = c,
                Sku = v.VariantSku,
                Barcode = !string.IsNullOrWhiteSpace(v.Barcode) ? v.Barcode : v.VariantSku,
                PriceAdjustment = v.PriceAdjustment,
                StockQuantity = variantStockMap.TryGetValue(v.Id, out var qty) ? qty : 0
            };
        }).ToList();

        string? varSize = null;
        string? varColor = null;

        if (variantId.HasValue)
        {
            var selectedVariant = variants.FirstOrDefault(v => v.Id == variantId.Value);
            if (selectedVariant != null)
            {
                var (s, c) = GetVariantSizeAndColor(selectedVariant);
                varSize = s;
                varColor = c;
                barcode = !string.IsNullOrWhiteSpace(selectedVariant.Barcode) ? selectedVariant.Barcode : selectedVariant.VariantSku;
                itemSku = selectedVariant.VariantSku;
                mrp += selectedVariant.PriceAdjustment;
                price += selectedVariant.PriceAdjustment;
            }
        }

        return Result<BarcodeItemLabelDto>.Success(new BarcodeItemLabelDto
        {
            ItemId = item.Id,
            ItemName = item.Name,
            ItemSku = itemSku,
            Barcode = barcode,
            Mrp = mrp,
            SellingPrice = price,
            BatchNumber = batchNum,
            ExpiryDate = expDate,
            BrandName = item.Brand?.Name,
            CategoryName = item.Category?.Name,
            TenantName = tenant?.BusinessName ?? "UdyogBill",
            Quantity = 1,
            VariantId = variantId,
            Size = varSize,
            Color = varColor,
            Variants = variantOptions
        });
    }

    public async Task<Result<BarcodeScanResultDto>> ScanBarcodeOrSkuAsync(string barcodeOrSku, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (string.IsNullOrWhiteSpace(barcodeOrSku))
        {
            return Result<BarcodeScanResultDto>.Failure("Barcode or SKU cannot be empty.", "EMPTY_INPUT");
        }

        var code = barcodeOrSku.Trim();

        var item = await _context.Items
            .Include(i => i.PrimaryUom)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && !i.IsDeleted &&
                (i.Barcode == code || i.Sku.ToLower() == code.ToLower()), cancellationToken);

        ItemVariant? matchedVariant = null;
        if (item == null)
        {
            matchedVariant = await _context.ItemVariants
                .Include(v => v.Item)
                .ThenInclude(i => i.PrimaryUom)
                .FirstOrDefaultAsync(v => v.TenantId == tenantId && !v.IsDeleted &&
                    (v.Barcode == code || v.VariantSku.ToLower() == code.ToLower()), cancellationToken);

            if (matchedVariant != null)
            {
                item = matchedVariant.Item;
            }
        }

        ItemBatch? matchedBatch = null;
        if (item == null)
        {
            matchedBatch = await _context.ItemBatches
                .Include(b => b.Item)
                .ThenInclude(i => i.PrimaryUom)
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted && b.IsActive &&
                    b.Barcode == code, cancellationToken);

            if (matchedBatch != null)
            {
                item = matchedBatch.Item;
            }
        }

        if (item == null)
        {
            return Result<BarcodeScanResultDto>.Failure($"No active item found matching barcode or SKU '{code}'.", "NOT_FOUND");
        }

        var totalStock = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && s.ItemId == item.Id)
            .SumAsync(s => s.CurrentQuantity, cancellationToken);

        // Fetch Active Batches
        var batches = await _context.ItemBatches
            .Where(b => b.TenantId == tenantId && b.ItemId == item.Id && !b.IsDeleted && b.IsActive)
            .OrderBy(b => b.ExpiryDate)
            .Select(b => new ItemBatchDto(
                b.Id,
                b.ItemId,
                b.BatchNumber,
                b.ManufacturingDate,
                b.ExpiryDate,
                b.MRP,
                b.PurchaseRate,
                b.SaleRate,
                b.Barcode,
                b.WarehouseStocks.Sum(w => w.CurrentQuantity),
                b.ExpiryDate < DateTime.UtcNow,
                b.ExpiryDate >= DateTime.UtcNow && b.ExpiryDate <= DateTime.UtcNow.AddDays(30),
                b.IsActive
            ))
            .ToListAsync(cancellationToken);

        var scanSku = matchedVariant != null ? matchedVariant.VariantSku : item.Sku;
        var scanBarcode = matchedVariant != null
            ? (!string.IsNullOrWhiteSpace(matchedVariant.Barcode) ? matchedVariant.Barcode : matchedVariant.VariantSku)
            : (matchedBatch != null && !string.IsNullOrWhiteSpace(matchedBatch.Barcode)
                ? matchedBatch.Barcode
                : (!string.IsNullOrWhiteSpace(item.Barcode) ? item.Barcode : item.Sku));
        var (matchedSize, matchedColor) = matchedVariant != null ? GetVariantSizeAndColor(matchedVariant) : ("", "");
        var scanName = matchedVariant != null
            ? $"{item.Name} ({matchedSize} - {matchedColor})"
            : (matchedBatch != null ? $"{item.Name} [Batch: {matchedBatch.BatchNumber}]" : item.Name);
        var scanMrp = matchedVariant != null
            ? item.MRP + matchedVariant.PriceAdjustment
            : (matchedBatch != null && matchedBatch.MRP > 0 ? matchedBatch.MRP : item.MRP);
        var scanSellingPrice = matchedVariant != null
            ? item.SellingPrice + matchedVariant.PriceAdjustment
            : (matchedBatch != null && matchedBatch.SaleRate > 0 ? matchedBatch.SaleRate : item.SellingPrice);

        return Result<BarcodeScanResultDto>.Success(new BarcodeScanResultDto
        {
            ItemId = item.Id,
            ItemSku = scanSku,
            Barcode = scanBarcode,
            Name = scanName,
            Mrp = scanMrp,
            SellingPrice = scanSellingPrice,
            PurchasePrice = matchedBatch != null && matchedBatch.PurchaseRate > 0 ? matchedBatch.PurchaseRate : item.PurchasePrice,
            TaxRate = item.TaxRate,
            HsnCode = item.HSNCode,
            PrimaryUomId = item.PrimaryUomId,
            PrimaryUomCode = item.PrimaryUom?.Code ?? "UNIT",
            TotalStock = totalStock,
            VariantId = matchedVariant?.Id,
            VariantSku = matchedVariant?.VariantSku,
            Size = matchedVariant != null && !string.IsNullOrWhiteSpace(matchedSize) ? matchedSize : null,
            Color = matchedVariant != null && !string.IsNullOrWhiteSpace(matchedColor) ? matchedColor : null,
            Batches = batches,
            MatchedBatchId = matchedBatch?.Id,
            MatchedBatchNumber = matchedBatch?.BatchNumber,
            MatchedExpiryDate = matchedBatch?.ExpiryDate
        });
    }

    public async Task<Result<UpiQrPayloadDto>> GenerateInvoiceUpiQrAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Include(i => i.Branch)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<UpiQrPayloadDto>.Failure("Invoice not found.", "NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        // Resolve tenant's registered UPI ID from profile or settings
        string? vpa = tenant?.UpiId?.Trim();
        if (string.IsNullOrWhiteSpace(vpa))
        {
            var upiSetting = await _context.TenantSettings
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Key == "Payment.UpiVpa", cancellationToken);
            vpa = upiSetting?.Value?.Trim();
        }

        if (string.IsNullOrWhiteSpace(vpa))
        {
            return Result<UpiQrPayloadDto>.Failure("UPI ID is not configured for this business. Please configure your UPI ID in Business Settings.", "UPI_NOT_CONFIGURED");
        }

        string payeeName = tenant?.TradeName ?? tenant?.BusinessName ?? "Merchant";
        decimal balanceToCollect = invoice.BalanceAmount > 0 ? invoice.BalanceAmount : invoice.TotalAmount;
        string note = $"Invoice {invoice.InvoiceNumber}";

        // Format NPCI Standard UPI Intent URI:
        // upi://pay?pa={vpa}&pn={payeeName}&am={amount}&tn={note}&cu=INR
        string encodedName = WebUtility.UrlEncode(payeeName);
        string encodedNote = WebUtility.UrlEncode(note);
        string upiUri = $"upi://pay?pa={vpa}&pn={encodedName}&am={balanceToCollect:F2}&tn={encodedNote}&cu=INR";

        return Result<UpiQrPayloadDto>.Success(new UpiQrPayloadDto
        {
            UpiUri = upiUri,
            PayeeVpa = vpa,
            PayeeName = payeeName,
            Amount = balanceToCollect,
            TransactionNote = note
        });
    }

    public async Task<Result<BarcodeLookupResultDto>> LookupBarcodeAsync(string barcodeOrSku, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(barcodeOrSku))
        {
            return Result<BarcodeLookupResultDto>.Failure("Barcode or SKU cannot be empty.", "EMPTY_INPUT");
        }

        var code = barcodeOrSku.Trim();

        // 1. Check if item already exists in this tenant's inventory
        try
        {
            var storeScanRes = await ScanBarcodeOrSkuAsync(code, cancellationToken);
            if (storeScanRes.IsSuccess && storeScanRes.Data != null)
            {
                return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
                {
                    ExistsInStore = true,
                    Message = $"Product '{storeScanRes.Data.Name}' already exists in your store inventory.",
                    StoreItem = storeScanRes.Data,
                    MasterCatalogItem = null
                });
            }
        }
        catch
        {
            // Anonymous or missing tenant context - continue seamlessly to central master catalog
        }

        // 2. Lookup Central Global Product Catalog (EAN-13, FMCG, Pharma, Garments/Footwear)
        var global = await _context.GlobalProductCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Barcode == code && !g.IsDeleted, cancellationToken);

        if (global != null)
        {
            return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
            {
                ExistsInStore = false,
                Message = $"Matched from Central Master Catalog: {global.ProductName}",
                StoreItem = null,
                MasterCatalogItem = new GlobalCatalogItemDto
                {
                    Barcode = global.Barcode,
                    ProductName = global.ProductName,
                    BrandName = global.BrandName,
                    CategoryName = global.CategoryName,
                    HsnCode = global.HsnCode,
                    TaxRate = global.TaxRate,
                    MRP = global.MRP,
                    UnitCode = global.UnitCode,
                    IndustryCode = global.IndustryCode,
                    ShortDescription = global.ShortDescription,
                    AttributesJson = global.AttributesJson
                }
            });
        }

        // 3. Fallback: Universal Brand Live Lookup (Open Food Facts / GS1) with strict 2.5s timeout
        try
        {
            var requestUri = $"https://world.openfoodfacts.org/api/v0/product/{Uri.EscapeDataString(code)}.json";
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromMilliseconds(2500));

            var response = await _httpClient.GetAsync(requestUri, cts.Token);
            if (response.IsSuccessStatusCode)
            {
                var jsonStr = await response.Content.ReadAsStringAsync(cts.Token);
                using var doc = JsonDocument.Parse(jsonStr);
                var root = doc.RootElement;
                if (root.TryGetProperty("status", out var statusProp) && statusProp.GetInt32() == 1 &&
                    root.TryGetProperty("product", out var productEl))
                {
                    string? rawName = null;
                    if (productEl.TryGetProperty("product_name_en", out var pne) && !string.IsNullOrWhiteSpace(pne.GetString()))
                        rawName = pne.GetString()?.Trim();
                    else if (productEl.TryGetProperty("product_name", out var pn) && !string.IsNullOrWhiteSpace(pn.GetString()))
                        rawName = pn.GetString()?.Trim();

                    string? brand = null;
                    if (productEl.TryGetProperty("brands", out var br) && !string.IsNullOrWhiteSpace(br.GetString()))
                    {
                        var brandsStr = br.GetString()?.Trim();
                        brand = brandsStr?.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
                    }

                    string? category = null;
                    if (productEl.TryGetProperty("categories", out var cat) && !string.IsNullOrWhiteSpace(cat.GetString()))
                    {
                        var cats = cat.GetString()?.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                        category = cats?.LastOrDefault()?.Trim() ?? cats?.FirstOrDefault()?.Trim();
                    }

                    if (!string.IsNullOrWhiteSpace(rawName))
                    {
                        var cleanBrand = brand ?? "";
                        var finalName = rawName;
                        if (!string.IsNullOrWhiteSpace(cleanBrand) && !finalName.StartsWith(cleanBrand, StringComparison.OrdinalIgnoreCase))
                        {
                            finalName = $"{cleanBrand} {finalName}".Trim();
                        }

                        if (string.IsNullOrWhiteSpace(cleanBrand))
                        {
                            cleanBrand = DeriveBrandFromText(finalName) ?? "";
                        }

                        var (mappedHsn, mappedTaxRate, mappedIndustry, mappedUom) = DeriveHsnTaxIndustryAndUom(finalName, category);

                        var newGlobal = new GlobalProductCatalog
                        {
                            Id = Guid.NewGuid(),
                            Barcode = code,
                            ProductName = finalName,
                            BrandName = cleanBrand,
                            CategoryName = string.IsNullOrWhiteSpace(category) ? "General FMCG" : category,
                            HsnCode = mappedHsn,
                            TaxRate = mappedTaxRate,
                            MRP = 0m,
                            UnitCode = mappedUom,
                            IndustryCode = mappedIndustry,
                            ShortDescription = string.IsNullOrWhiteSpace(cleanBrand) ? finalName : $"{cleanBrand} - {finalName}",
                            AttributesJson = JsonSerializer.Serialize(new { brand = cleanBrand, source = "live_lookup" }),
                            CreatedAtUtc = DateTime.UtcNow
                        };

                        _context.GlobalProductCatalogs.Add(newGlobal);
                        await _context.SaveChangesAsync(cancellationToken);

                        return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
                        {
                            ExistsInStore = false,
                            Message = $"Auto-matched Brand Product: {finalName}",
                            StoreItem = null,
                            MasterCatalogItem = new GlobalCatalogItemDto
                            {
                                Barcode = newGlobal.Barcode,
                                ProductName = newGlobal.ProductName,
                                BrandName = newGlobal.BrandName,
                                CategoryName = newGlobal.CategoryName,
                                HsnCode = newGlobal.HsnCode,
                                TaxRate = newGlobal.TaxRate,
                                MRP = newGlobal.MRP,
                                UnitCode = newGlobal.UnitCode,
                                IndustryCode = newGlobal.IndustryCode,
                                ShortDescription = newGlobal.ShortDescription,
                                AttributesJson = newGlobal.AttributesJson
                            }
                        });
                    }
                }
            }
        }
        catch
        {
            // Silently fallback if live lookup times out or fails - zero disruption
        }

        // 4. Fallback Live Lookup: Open Beauty Facts & Open Products Facts (Cosmetics, Shampoos, Soaps, Hardware)
        if (code.Length >= 8)
        {
            try
            {
                var beautyUri = $"https://world.openbeautyfacts.org/api/v0/product/{Uri.EscapeDataString(code)}.json";
                using var ctsBeauty = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                ctsBeauty.CancelAfter(TimeSpan.FromMilliseconds(1500));

                var beautyResp = await _httpClient.GetAsync(beautyUri, ctsBeauty.Token);
                if (beautyResp.IsSuccessStatusCode)
                {
                    var jsonStr = await beautyResp.Content.ReadAsStringAsync(ctsBeauty.Token);
                    using var doc = JsonDocument.Parse(jsonStr);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("status", out var sProp) && sProp.GetInt32() == 1 &&
                        root.TryGetProperty("product", out var pEl))
                    {
                        string? rawName = null;
                        if (pEl.TryGetProperty("product_name_en", out var pne) && !string.IsNullOrWhiteSpace(pne.GetString()))
                            rawName = pne.GetString()?.Trim();
                        else if (pEl.TryGetProperty("product_name", out var pn) && !string.IsNullOrWhiteSpace(pn.GetString()))
                            rawName = pn.GetString()?.Trim();

                        string? brand = null;
                        if (pEl.TryGetProperty("brands", out var br) && !string.IsNullOrWhiteSpace(br.GetString()))
                        {
                            var brandsStr = br.GetString()?.Trim();
                            brand = brandsStr?.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
                        }

                        if (!string.IsNullOrWhiteSpace(rawName))
                        {
                            var cleanBrand = brand ?? DeriveBrandFromText(rawName) ?? "";
                            var finalName = rawName;
                            if (!string.IsNullOrWhiteSpace(cleanBrand) && !finalName.StartsWith(cleanBrand, StringComparison.OrdinalIgnoreCase))
                                finalName = $"{cleanBrand} {finalName}".Trim();

                            var (mappedHsn, mappedTaxRate, indCode, uom) = DeriveHsnTaxIndustryAndUom(finalName, "Personal Care");

                            var beautyGlobal = new GlobalProductCatalog
                            {
                                Id = Guid.NewGuid(),
                                Barcode = code,
                                ProductName = finalName,
                                BrandName = cleanBrand,
                                CategoryName = "Personal Care",
                                HsnCode = mappedHsn,
                                TaxRate = mappedTaxRate,
                                MRP = 0m,
                                UnitCode = uom,
                                IndustryCode = indCode,
                                ShortDescription = $"{cleanBrand} - {finalName}",
                                AttributesJson = JsonSerializer.Serialize(new { brand = cleanBrand, source = "open_beauty_facts" }),
                                CreatedAtUtc = DateTime.UtcNow
                            };

                            _context.GlobalProductCatalogs.Add(beautyGlobal);
                            await _context.SaveChangesAsync(cancellationToken);

                            return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
                            {
                                ExistsInStore = false,
                                Message = $"Auto-matched Product: {finalName}",
                                StoreItem = null,
                                MasterCatalogItem = new GlobalCatalogItemDto
                                {
                                    Barcode = beautyGlobal.Barcode,
                                    ProductName = beautyGlobal.ProductName,
                                    BrandName = beautyGlobal.BrandName,
                                    CategoryName = beautyGlobal.CategoryName,
                                    HsnCode = beautyGlobal.HsnCode,
                                    TaxRate = beautyGlobal.TaxRate,
                                    MRP = beautyGlobal.MRP,
                                    UnitCode = beautyGlobal.UnitCode,
                                    IndustryCode = beautyGlobal.IndustryCode,
                                    ShortDescription = beautyGlobal.ShortDescription,
                                    AttributesJson = beautyGlobal.AttributesJson
                                }
                            });
                        }
                    }
                }
            }
            catch { /* Silently proceed to prefix matcher */ }
        }

        // 5. GS1 India Manufacturer Prefix Registry (Instant Match for Top 100+ Indian Brands)
        var prefixMatch = ResolveByIndianPrefix(code);
        if (prefixMatch != null)
        {
            // Background Cache in Master DB so future calls resolve immediately in Step 2
            try
            {
                var existing = await _context.GlobalProductCatalogs.FirstOrDefaultAsync(g => g.Barcode == code, cancellationToken);
                if (existing == null)
                {
                    _context.GlobalProductCatalogs.Add(new GlobalProductCatalog
                    {
                        Id = Guid.NewGuid(),
                        Barcode = code,
                        ProductName = prefixMatch.ProductName,
                        BrandName = prefixMatch.BrandName,
                        CategoryName = prefixMatch.CategoryName,
                        HsnCode = prefixMatch.HsnCode,
                        TaxRate = prefixMatch.TaxRate,
                        MRP = prefixMatch.MRP,
                        UnitCode = prefixMatch.UnitCode ?? "Pcs",
                        IndustryCode = prefixMatch.IndustryCode ?? "FMCG",
                        ShortDescription = $"{prefixMatch.BrandName} - {prefixMatch.ProductName}",
                        AttributesJson = JsonSerializer.Serialize(new { brand = prefixMatch.BrandName, source = "indian_prefix_registry" }),
                        CreatedAtUtc = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch { /* Non-blocking cache */ }

            return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
            {
                ExistsInStore = false,
                Message = $"Auto-matched {prefixMatch.BrandName} ({prefixMatch.CategoryName})",
                StoreItem = null,
                MasterCatalogItem = prefixMatch
            });
        }

        // 6. Not found in store or master catalog
        return Result<BarcodeLookupResultDto>.Success(new BarcodeLookupResultDto
        {
            ExistsInStore = false,
            Message = "New barcode. Please fill in product details.",
            StoreItem = null,
            MasterCatalogItem = null
        });
    }

    private static readonly (string Prefix, string Brand, string Category, string Hsn, decimal Tax, string Unit, string Industry, string DefaultName)[] IndianPrefixRegistry = new[]
    {
        // Spices, Masale & Seasonings (Regional & National)
        ("8904005", "Goldiee", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Goldiee Masale / Spices"),
        ("8906019", "Goldiee", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Goldiee Masale / Spices"),
        ("8901233", "MDH", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "MDH Spices & Masale"),
        ("8901174", "Everest", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Everest Spices & Masale"),
        ("8901725", "Catch", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Catch Spices & Sprinklers"),
        ("8901292", "Badshah", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Badshah Masala"),
        ("8906010", "Rakesh", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Rakesh Spices"),
        ("8904060", "Ashok Masale", "Spices & Masale", "0910", 5.0m, "Pcs", "FMCG", "Ashok Masale"),

        // FMCG Staples, Snacks, Biscuits, Dairy, Beverages
        ("8901499", "Uncle Chipps", "Snacks & Chips", "21069099", 12.0m, "Pcs", "FMCG", "Uncle Chipps / Lays Chips"),
        ("8901764", "Coca-Cola", "Cold Drinks & Beverages", "22021010", 28.0m, "Pcs", "FMCG", "Coca-Cola Cold Drink"),
        ("8901030", "Hindustan Unilever", "Personal Care & FMCG", "340111", 18.0m, "Pcs", "FMCG", "HUL Consumer Product"),
        ("8901063", "Britannia", "Biscuits & Bakery", "19053100", 18.0m, "Pcs", "FMCG", "Britannia Bakery Product"),
        ("8901262", "Amul", "Dairy Products", "04029920", 5.0m, "Pcs", "FMCG", "Amul Dairy Product"),
        ("8901719", "Parle", "Biscuits & Confectionery", "19053100", 18.0m, "Pcs", "FMCG", "Parle Biscuits & Snacks"),
        ("8901058", "ITC", "Packaged Foods & Staples", "1905", 12.0m, "Pcs", "FMCG", "ITC Sunfeast / Aashirvaad"),
        ("8901207", "Dabur", "Ayurvedic & Healthcare", "30049011", 12.0m, "Pcs", "FMCG", "Dabur Health Product"),
        ("8901088", "Patanjali", "Ayurvedic & FMCG", "2106", 12.0m, "Pcs", "FMCG", "Patanjali Product"),
        ("8904109", "Patanjali Foods", "Edible Oils & Foods", "1515", 5.0m, "Pcs", "FMCG", "Patanjali Nutrela / Oil"),
        ("8901389", "Haldiram's", "Namkeen & Sweets", "21069099", 12.0m, "Pcs", "FMCG", "Haldiram's Namkeen"),
        ("8904063", "Haldiram's", "Namkeen & Snacks", "21069099", 12.0m, "Pcs", "FMCG", "Haldiram's Snacks"),
        ("8906007", "Bikaji", "Namkeen & Snacks", "21069099", 12.0m, "Pcs", "FMCG", "Bikaji Bhujia & Snacks"),
        ("8906014", "Balaji", "Wafers & Namkeen", "21069099", 12.0m, "Pcs", "FMCG", "Balaji Wafers"),
        ("8901112", "Marico", "Oils & Personal Care", "1513", 5.0m, "Pcs", "FMCG", "Parachute / Saffola Product"),
        ("8901248", "Emami", "Personal Care & Healthcare", "3304", 18.0m, "Pcs", "FMCG", "Emami BoroPlus / Navratna"),
        ("8901023", "Tata Consumer", "Staples & Beverages", "0902", 5.0m, "Pcs", "FMCG", "Tata Tea / Tata Salt"),
        ("8901748", "Wagh Bakri", "Tea & Beverages", "0902", 5.0m, "Pcs", "FMCG", "Wagh Bakri Tea"),
        ("8904004", "Ghadi", "Detergents & Soaps", "34029011", 18.0m, "Pcs", "FMCG", "Ghadi Detergent (RSPL)"),
        ("8901200", "Cadbury", "Chocolates & Confectionery", "18063200", 18.0m, "Pcs", "FMCG", "Cadbury Dairy Milk / Oreo"),
        ("8901052", "Nestle", "Instant Foods & Dairy", "19023010", 12.0m, "Pcs", "FMCG", "Nestle Maggi / KitKat"),
        ("8901129", "Godrej", "Home & Personal Care", "340111", 18.0m, "Pcs", "FMCG", "Godrej No.1 / GoodKnight"),
        ("8901014", "Colgate", "Oral Care", "33061020", 18.0m, "Pcs", "FMCG", "Colgate Oral Care"),
        ("8901020", "Reckitt", "Health & Hygiene", "34011110", 18.0m, "Pcs", "FMCG", "Dettol / Harpic Product"),
        ("8901084", "Procter & Gamble", "Home & Baby Care", "3402", 18.0m, "Pcs", "FMCG", "P&G Tide / Ariel / Whisper"),

        // Pharmaceuticals & Healthcare
        ("8901148", "Micro Labs", "Pharmaceuticals", "30049060", 12.0m, "Strip", "PHARMA", "Micro Labs (Dolo 650)"),
        ("8901117", "Cipla", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Cipla Medicine"),
        ("8901118", "Cipla Health", "Healthcare & OTC", "3004", 12.0m, "Pcs", "PHARMA", "Cipla Health Product"),
        ("8904103", "Mankind", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Mankind Pharma Medicine"),
        ("8901089", "Sun Pharma", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Sun Pharma Medicine"),
        ("8901125", "Abbott", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Abbott Healthcare Medicine"),
        ("8901138", "Alkem", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Alkem Laboratories Medicine"),
        ("8901135", "Dr. Reddy's", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Dr. Reddy's Medicine"),
        ("8901155", "Torrent", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Torrent Pharma Medicine"),
        ("8901165", "Lupin", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Lupin Pharmaceuticals"),
        ("8901175", "Zydus", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Zydus Lifesciences"),
        ("8901185", "Glenmark", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Glenmark Pharmaceuticals"),
        ("8901195", "Aristo", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Aristo Pharmaceuticals"),
        ("8901215", "Intas", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Intas Pharmaceuticals"),
        ("8901225", "Macleods", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "Macleods Pharmaceuticals"),
        ("8901235", "FDC", "Pharmaceuticals", "3004", 12.0m, "Pcs", "PHARMA", "FDC Electral / Zocon"),
        ("8901245", "USV", "Pharmaceuticals", "3004", 12.0m, "Strip", "PHARMA", "USV Glycomet Medicine"),
        ("8901255", "Leeford", "Healthcare & Pharma", "3004", 12.0m, "Strip", "PHARMA", "Leeford Healthcare"),

        // Footwear & Shoes
        ("8901402", "Bata", "Footwear", "6403", 12.0m, "Pair", "FOOTWEAR", "Bata Footwear"),
        ("8901403", "Bata", "Footwear & Accessories", "6403", 12.0m, "Pair", "FOOTWEAR", "Bata Shoes"),
        ("8901324", "Relaxo", "Footwear & Slippers", "6402", 12.0m, "Pair", "FOOTWEAR", "Relaxo / Flite / Bahamas"),
        ("8904008", "Sparx", "Sports Footwear", "64041190", 12.0m, "Pair", "FOOTWEAR", "Sparx Sports Shoes"),
        ("8904149", "Campus", "Footwear & Sneakers", "64041190", 12.0m, "Pair", "FOOTWEAR", "Campus Shoes"),
        ("8906017", "Campus", "Running & Casual Shoes", "64041190", 12.0m, "Pair", "FOOTWEAR", "Campus Running Shoes"),
        ("8904071", "Red Chief", "Leather Footwear", "6403", 12.0m, "Pair", "FOOTWEAR", "Red Chief Leather Shoes"),
        ("8901287", "Woodland", "Outdoor Footwear", "6403", 12.0m, "Pair", "FOOTWEAR", "Woodland Shoes / Boots"),
        ("8901325", "Liberty", "Footwear", "6402", 12.0m, "Pair", "FOOTWEAR", "Liberty Footwear"),

        // Garments & Apparel
        ("8907312", "Aditya Birla", "Apparel & Clothing", "6203", 5.0m, "Pcs", "GARMENTS", "Peter England / Allen Solly"),
        ("8907313", "Aditya Birla", "Apparel & Fashion", "6203", 5.0m, "Pcs", "GARMENTS", "Van Heusen / Louis Philippe"),
        ("8904148", "Jockey", "Innerwear & Apparel", "6107", 5.0m, "Pcs", "GARMENTS", "Jockey Innerwear / Athleisure"),
        ("8901418", "Jockey", "Hosiery & Comfortwear", "6108", 5.0m, "Pcs", "GARMENTS", "Jockey Clothing"),
        ("8904128", "Arvind Brands", "Denim & Apparel", "6203", 5.0m, "Pcs", "GARMENTS", "Flying Machine / US Polo"),
        ("8901278", "Raymond", "Fabrics & Apparel", "6203", 5.0m, "Pcs", "GARMENTS", "Raymond Suiting & Apparel"),
        ("8904088", "Monte Carlo", "Woollens & Apparel", "6110", 5.0m, "Pcs", "GARMENTS", "Monte Carlo Apparel"),
        ("8901282", "Lux", "Innerwear & Hosiery", "6107", 5.0m, "Pcs", "GARMENTS", "Lux Cozi / ONN Innerwear"),
        ("8901286", "Dollar", "Innerwear & Hosiery", "6107", 5.0m, "Pcs", "GARMENTS", "Dollar Bigboss Innerwear"),

        // Paints, Hardware & Plumbing
        ("8901202", "Asian Paints", "Paints & Coatings", "3208", 18.0m, "Ltr", "HARDWARE", "Asian Paints Royale / Apcolite"),
        ("8901203", "Asian Paints", "Enamels & Primer", "3208", 18.0m, "Ltr", "HARDWARE", "Asian Paints Coatings"),
        ("8901204", "Asian Paints", "Exterior & Emulsion", "32091090", 18.0m, "Ltr", "HARDWARE", "Asian Paints Tractor / Apex"),
        ("8901228", "Berger Paints", "Paints & Coatings", "32091090", 18.0m, "Ltr", "HARDWARE", "Berger WeatherCoat / Silk"),
        ("8901218", "Nerolac", "Paints & Enamels", "3208", 18.0m, "Ltr", "HARDWARE", "Kansai Nerolac Paint"),
        ("8904139", "Astral", "Pipes & Fittings", "3917", 18.0m, "Pcs", "HARDWARE", "Astral CPVC / UPVC Pipes"),
        ("8901288", "Supreme", "Pipes, Fittings & Tanks", "3917", 18.0m, "Pcs", "HARDWARE", "Supreme PVC Pipes & Fittings"),
        ("8904140", "Ashirvad", "Pipes & Plumbing", "3917", 18.0m, "Pcs", "HARDWARE", "Ashirvad CPVC Pipes"),
        ("8901298", "Prince Pipes", "Pipes & Fittings", "3917", 18.0m, "Pcs", "HARDWARE", "Prince Pipes & Fittings"),
        ("8901308", "Finolex", "PVC Pipes & Fittings", "3917", 18.0m, "Pcs", "HARDWARE", "Finolex Pipes"),
        ("8901318", "Jaquar", "Bath Fittings & Sanitary", "84818020", 18.0m, "Pcs", "HARDWARE", "Jaquar Faucet / Sanitaryware"),

        // Electricals & Lighting
        ("8901258", "Havells", "Electricals & Switches", "8536", 18.0m, "Pcs", "HARDWARE", "Havells Switches / MCB"),
        ("8901259", "Havells", "Wires & Cables", "8544", 18.0m, "Mtr", "HARDWARE", "Havells LifeLine Cables"),
        ("8904123", "Polycab", "Wires & Electricals", "8544", 18.0m, "Mtr", "HARDWARE", "Polycab Wires / Cables"),
        ("8901268", "Anchor", "Switches & Accessories", "8536", 18.0m, "Pcs", "HARDWARE", "Anchor Roma Switches"),
        ("8901272", "Legrand", "Modular Switches & Protection", "8536", 18.0m, "Pcs", "HARDWARE", "Legrand Modular Switches"),
        ("8901285", "Crompton", "Fans, LED & Pumps", "841451", 18.0m, "Pcs", "HARDWARE", "Crompton Appliances"),
        ("8904133", "Syska", "LED Lighting & Accessories", "853950", 18.0m, "Pcs", "HARDWARE", "Syska LED Lighting"),

        // Electronics & Mobile Accessories
        ("8906145", "boAt", "Audio & Wearables", "85183000", 18.0m, "Pcs", "ELECTRONICS", "boAt Audio / Smartwatch"),
        ("8906146", "Noise", "Smartwatches & Audio", "85176290", 18.0m, "Pcs", "ELECTRONICS", "Noise Smartwatch / Buds"),
        ("8906147", "Portronics", "Mobile Accessories & Gadgets", "85044090", 18.0m, "Pcs", "ELECTRONICS", "Portronics Charger / Speaker"),
        ("8906148", "Zebronics", "IT & Audio Accessories", "847160", 18.0m, "Pcs", "ELECTRONICS", "Zebronics IT / Audio"),
        ("8906149", "Ambrane", "Power Banks & Cables", "85044090", 18.0m, "Pcs", "ELECTRONICS", "Ambrane Power Bank / Cable")
    };

    private static GlobalCatalogItemDto? ResolveByIndianPrefix(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode) || barcode.Length < 7) return null;

        // Longest prefix match
        var match = IndianPrefixRegistry
            .Where(entry => barcode.StartsWith(entry.Prefix, StringComparison.Ordinal))
            .OrderByDescending(entry => entry.Prefix.Length)
            .FirstOrDefault();

        if (match.Prefix != null)
        {
            return new GlobalCatalogItemDto
            {
                Barcode = barcode,
                ProductName = match.DefaultName,
                BrandName = match.Brand,
                CategoryName = match.Category,
                HsnCode = match.Hsn,
                TaxRate = match.Tax,
                MRP = 0m,
                UnitCode = match.Unit,
                IndustryCode = match.Industry
            };
        }

        return null;
    }

    private static string? DeriveBrandFromText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var lower = text.ToLowerInvariant();
        foreach (var entry in IndianPrefixRegistry)
        {
            if (lower.Contains(entry.Brand.ToLowerInvariant()))
                return entry.Brand;
        }
        return null;
    }

    private static (string Hsn, decimal TaxRate, string IndustryCode, string UnitCode) DeriveHsnTaxIndustryAndUom(string productName, string? category)
    {
        var text = $"{productName} {category}".ToLowerInvariant();

        // 1. Spices, Masale & Condiments
        if (text.Contains("masala") || text.Contains("masale") || text.Contains("spices") || text.Contains("haldi") ||
            text.Contains("turmeric") || text.Contains("mirch") || text.Contains("chilli") || text.Contains("dhaniya") ||
            text.Contains("coriander") || text.Contains("jeera") || text.Contains("cumin") || text.Contains("hing") ||
            text.Contains("garam masala") || text.Contains("sabji") || text.Contains("chhole") || text.Contains("paneer masala") ||
            text.Contains("meat masala") || text.Contains("chicken masala") || text.Contains("chaat masala") ||
            text.Contains("kasuri methi") || text.Contains("mustard") || text.Contains("rai") || text.Contains("clove") ||
            text.Contains("cardamom") || text.Contains("cinnamon") || text.Contains("ajwain") || text.Contains("saunf") ||
            text.Contains("black pepper") || text.Contains("kali mirch") || text.Contains("amchur"))
        {
            return ("0910", 5.0m, "FMCG", "Pcs");
        }

        // 2. Pharma / Medicine / Formulations
        if (text.Contains("dolo") || text.Contains("crocin") || text.Contains("paracetamol") || text.Contains("tablet") ||
            text.Contains("capsule") || text.Contains("syrup") || text.Contains("ointment") || text.Contains("suspension") ||
            text.Contains("drops") || text.Contains("injection") || text.Contains("gel") || text.Contains("creme") ||
            text.Contains("cream") || text.Contains("inhaler") || text.Contains("pharma") || text.Contains("medicine") ||
            text.Contains("antibiotic") || text.Contains("antacid") || text.Contains("cough") || text.Contains("vitamin") ||
            text.Contains("calcium") || text.Contains("azithral") || text.Contains("azithromycin") || text.Contains("pantoprazole") ||
            text.Contains("pan-d") || text.Contains("pan d") || text.Contains("pantocid") || text.Contains("omeprazole") ||
            text.Contains("amoxicillin") || text.Contains("clavam") || text.Contains("augmentin") || text.Contains("cetirizine") ||
            text.Contains("montair") || text.Contains("allegra") || text.Contains("combiflam") || text.Contains("ibuprofen") ||
            text.Contains("aceclofenac") || text.Contains("calpol") || text.Contains("shelcal") || text.Contains("becosules") ||
            text.Contains("digene") || text.Contains("gelusil") || text.Contains("vicks") || text.Contains("strepsils") ||
            text.Contains("betadine") || text.Contains("volini") || text.Contains("moov") || text.Contains("iodex"))
        {
            return ("3004", 12.0m, "PHARMA", "Strip");
        }

        // 3. Ayurvedic & Herbal Formulations
        if (text.Contains("ayurvedic") || text.Contains("churna") || text.Contains("churn") || text.Contains("ras") ||
            text.Contains("taila") || text.Contains("asava") || text.Contains("arishta") || text.Contains("kwath") ||
            text.Contains("balm") || text.Contains("chyawanprash") || text.Contains("dabur") || text.Contains("patanjali") ||
            text.Contains("baidyanath") || text.Contains("zandu") || text.Contains("himalaya") || text.Contains("liv-52") ||
            text.Contains("liv 52") || text.Contains("triphala") || text.Contains("ashwagandha") || text.Contains("shilajit") ||
            text.Contains("giloy"))
        {
            return ("30049011", 12.0m, "PHARMA", "Pcs");
        }

        // 4. Footwear & Shoes
        if (text.Contains("shoe") || text.Contains("shoes") || text.Contains("sneaker") || text.Contains("sneakers") ||
            text.Contains("sports shoe") || text.Contains("formal shoe") || text.Contains("leather shoe") || text.Contains("boot") ||
            text.Contains("boots") || text.Contains("loafer") || text.Contains("loafers") || text.Contains("sandal") ||
            text.Contains("sandals") || text.Contains("chappal") || text.Contains("slipper") || text.Contains("slippers") ||
            text.Contains("flip flop") || text.Contains("slide") || text.Contains("bata") || text.Contains("relaxo") ||
            text.Contains("sparx") || text.Contains("campus") || text.Contains("red chief") || text.Contains("woodland") ||
            text.Contains("liberty") || text.Contains("crocs"))
        {
            return ("6402", 12.0m, "FOOTWEAR", "Pair");
        }

        // 5. Garments & Apparel
        if (text.Contains("shirt") || text.Contains("t-shirt") || text.Contains("tshirt") || text.Contains("tee") ||
            text.Contains("jeans") || text.Contains("trouser") || text.Contains("pant") || text.Contains("kurta") ||
            text.Contains("kurti") || text.Contains("saree") || text.Contains("sari") || text.Contains("lehenga") ||
            text.Contains("dupatta") || text.Contains("pajama") || text.Contains("track pant") || text.Contains("shorts") ||
            text.Contains("sweatshirt") || text.Contains("hoodie") || text.Contains("sweater") || text.Contains("jacket") ||
            text.Contains("blazer") || text.Contains("suit") || text.Contains("innerwear") || text.Contains("vest") ||
            text.Contains("baniyan") || text.Contains("underwear") || text.Contains("briefs") || text.Contains("boxer") ||
            text.Contains("bra") || text.Contains("panty") || text.Contains("hosiery") || text.Contains("socks") ||
            text.Contains("cloth") || text.Contains("garment") || text.Contains("apparel") || text.Contains("jockey") ||
            text.Contains("peter england") || text.Contains("allen solly"))
        {
            return ("6203", 5.0m, "GARMENTS", "Pcs");
        }

        // 6. Paints & Coatings
        if (text.Contains("paint") || text.Contains("paints") || text.Contains("primer") || text.Contains("enamel") ||
            text.Contains("emulsion") || text.Contains("distemper") || text.Contains("varnish") || text.Contains("thinner") ||
            text.Contains("stainer") || text.Contains("wall putty") || text.Contains("asian paints") || text.Contains("berger") ||
            text.Contains("nerolac") || text.Contains("dulux") || text.Contains("royale") || text.Contains("apcolite") ||
            text.Contains("tractor emulsion") || text.Contains("apex") || text.Contains("ace exterior"))
        {
            return ("3208", 18.0m, "HARDWARE", "Ltr");
        }

        // 7. Hardware, Plumbing & Pipes
        if (text.Contains("pipe") || text.Contains("pipes") || text.Contains("cpvc") || text.Contains("upvc") ||
            text.Contains("pvc pipe") || text.Contains("conduit") || text.Contains("drainage") || text.Contains("fitting") ||
            text.Contains("elbow") || text.Contains("tee") || text.Contains("coupler") || text.Contains("socket") ||
            text.Contains("union") || text.Contains("valve") || text.Contains("ball valve") || text.Contains("tap") ||
            text.Contains("faucet") || text.Contains("sanitary") || text.Contains("astral") || text.Contains("supreme") ||
            text.Contains("ashirvad") || text.Contains("prince pipes") || text.Contains("finolex") || text.Contains("jaquar") ||
            text.Contains("screw") || text.Contains("bolt") || text.Contains("nut") || text.Contains("nail") ||
            text.Contains("hinge") || text.Contains("lock"))
        {
            return ("3917", 18.0m, "HARDWARE", "Pcs");
        }

        // 8. Electricals & Wires
        if (text.Contains("wire") || text.Contains("wires") || text.Contains("cable") || text.Contains("cables") ||
            text.Contains("polycab") || text.Contains("havells") || text.Contains("switch") || text.Contains("switches") ||
            text.Contains("mcb") || text.Contains("rccb") || text.Contains("bulb") || text.Contains("led bulb") ||
            text.Contains("tubelight") || text.Contains("fan") || text.Contains("ceiling fan") || text.Contains("exhaust fan") ||
            text.Contains("cooler") || text.Contains("geyser") || text.Contains("heater") || text.Contains("iron") ||
            text.Contains("plug") || text.Contains("anchor") || text.Contains("roma") || text.Contains("legrand"))
        {
            return ("8544", 18.0m, "HARDWARE", "Pcs");
        }

        // 9. Mobile, IT & Electronics
        if (text.Contains("mobile") || text.Contains("smartphone") || text.Contains("phone") || text.Contains("charger") ||
            text.Contains("adapter") || text.Contains("data cable") || text.Contains("usb cable") || text.Contains("type-c") ||
            text.Contains("earphone") || text.Contains("headphone") || text.Contains("earbuds") || text.Contains("airpods") ||
            text.Contains("tws") || text.Contains("bluetooth") || text.Contains("speaker") || text.Contains("power bank") ||
            text.Contains("tempered glass") || text.Contains("screen guard") || text.Contains("back cover") ||
            text.Contains("boat") || text.Contains("noise") || text.Contains("portronics") || text.Contains("zebronics") ||
            text.Contains("samsung") || text.Contains("apple") || text.Contains("iphone") || text.Contains("redmi") ||
            text.Contains("realme") || text.Contains("vivo") || text.Contains("oppo"))
        {
            return ("8517", 18.0m, "ELECTRONICS", "Pcs");
        }

        // 10. Beverages, Cold Drinks & Juices
        if (text.Contains("coca") || text.Contains("cola") || text.Contains("coke") || text.Contains("thums") ||
            text.Contains("sprite") || text.Contains("pepsi") || text.Contains("fanta") || text.Contains("limca") ||
            text.Contains("soda") || text.Contains("carbonat"))
        {
            return ("22021010", 28.0m, "FMCG", "Pcs");
        }
        if (text.Contains("juice") || text.Contains("frooti") || text.Contains("maaza") || text.Contains("slice"))
        {
            return ("22029920", 12.0m, "FMCG", "Pcs");
        }
        if (text.Contains("tea") || text.Contains("chai"))
        {
            return ("0902", 5.0m, "FMCG", "Pcs");
        }
        if (text.Contains("coffee") || text.Contains("nescafe") || text.Contains("bru"))
        {
            return ("0901", 18.0m, "FMCG", "Pcs");
        }

        // 11. Confectionery, Biscuits, Dairy, Snacks
        if (text.Contains("chips") || text.Contains("kurkure") || text.Contains("uncle") || text.Contains("namkeen") ||
            text.Contains("bhujia") || text.Contains("snack"))
        {
            return ("21069099", 12.0m, "FMCG", "Pcs");
        }
        if (text.Contains("biscuit") || text.Contains("cookie") || text.Contains("rusk") || text.Contains("bakery"))
        {
            return ("19053100", 18.0m, "FMCG", "Pcs");
        }
        if (text.Contains("noodle") || text.Contains("pasta") || text.Contains("maggi"))
        {
            return ("19023010", 12.0m, "FMCG", "Pcs");
        }
        if (text.Contains("chocolate") || text.Contains("cadbury") || text.Contains("kitkat"))
        {
            return ("1806", 18.0m, "FMCG", "Pcs");
        }
        if (text.Contains("milk") || text.Contains("curd") || text.Contains("paneer") || text.Contains("dairy"))
        {
            return ("0401", 5.0m, "FMCG", "Pcs");
        }
        if (text.Contains("oil") || text.Contains("ghee") || text.Contains("butter"))
        {
            return ("1515", 5.0m, "FMCG", "Pcs");
        }
        if (text.Contains("flour") || text.Contains("atta") || text.Contains("maida") || text.Contains("besan"))
        {
            return ("1101", 5.0m, "FMCG", "Pcs");
        }
        if (text.Contains("soap") || text.Contains("detergent") || text.Contains("wash") || text.Contains("shampoo"))
        {
            return ("340111", 18.0m, "FMCG", "Pcs");
        }
        if (text.Contains("paste") || text.Contains("colgate") || text.Contains("brush") || text.Contains("oral"))
        {
            return ("330610", 18.0m, "FMCG", "Pcs");
        }

        return ("2106", 18.0m, "FMCG", "Pcs");
    }

    private static (string Hsn, decimal TaxRate) DeriveHsnAndTaxRate(string productName, string? category)
    {
        var (hsn, tax, _, _) = DeriveHsnTaxIndustryAndUom(productName, category);
        return (hsn, tax);
    }
}
