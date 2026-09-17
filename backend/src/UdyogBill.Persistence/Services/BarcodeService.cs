using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BarcodeService : IBarcodeService
{
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
            : (!string.IsNullOrWhiteSpace(item.Barcode) ? item.Barcode : item.Sku);
        var (matchedSize, matchedColor) = matchedVariant != null ? GetVariantSizeAndColor(matchedVariant) : ("", "");
        var scanName = matchedVariant != null
            ? $"{item.Name} ({matchedSize} - {matchedColor})"
            : item.Name;
        var scanMrp = matchedVariant != null ? item.MRP + matchedVariant.PriceAdjustment : item.MRP;
        var scanSellingPrice = matchedVariant != null ? item.SellingPrice + matchedVariant.PriceAdjustment : item.SellingPrice;

        return Result<BarcodeScanResultDto>.Success(new BarcodeScanResultDto
        {
            ItemId = item.Id,
            ItemSku = scanSku,
            Barcode = scanBarcode,
            Name = scanName,
            Mrp = scanMrp,
            SellingPrice = scanSellingPrice,
            PurchasePrice = item.PurchasePrice,
            TaxRate = item.TaxRate,
            HsnCode = item.HSNCode,
            PrimaryUomId = item.PrimaryUomId,
            PrimaryUomCode = item.PrimaryUom?.Code ?? "UNIT",
            TotalStock = totalStock,
            Batches = batches
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

        // Default or configured UPI VPA (e.g. tenant-code@upi or custom VPA from tenant setting)
        var upiSetting = await _context.TenantSettings
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Key == "Payment.UpiVpa", cancellationToken);

        string vpa = upiSetting?.Value ?? "udyogbill.payments@okaxis";
        string payeeName = tenant?.BusinessName ?? "UdyogBill Merchant";
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
}
