using System;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
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

    public async Task<Result<BarcodeItemLabelDto>> GetBarcodeItemLabelAsync(Guid itemId, Guid? batchId = null, CancellationToken cancellationToken = default)
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

        return Result<BarcodeItemLabelDto>.Success(new BarcodeItemLabelDto
        {
            ItemId = item.Id,
            ItemName = item.Name,
            ItemSku = item.Sku,
            Barcode = barcode,
            Mrp = mrp,
            SellingPrice = price,
            BatchNumber = batchNum,
            ExpiryDate = expDate,
            BrandName = item.Brand?.Name,
            CategoryName = item.Category?.Name,
            TenantName = tenant?.BusinessName ?? "UdyogBill",
            Quantity = 1
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

        if (item == null)
        {
            return Result<BarcodeScanResultDto>.Failure($"No active item found matching barcode or SKU '{code}'.", "NOT_FOUND");
        }

        // Fetch Total Stock
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

        return Result<BarcodeScanResultDto>.Success(new BarcodeScanResultDto
        {
            ItemId = item.Id,
            ItemSku = item.Sku,
            Barcode = !string.IsNullOrWhiteSpace(item.Barcode) ? item.Barcode : item.Sku,
            Name = item.Name,
            Mrp = item.MRP,
            SellingPrice = item.SellingPrice,
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
