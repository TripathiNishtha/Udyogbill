using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BulkImportService : IBulkImportService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public BulkImportService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required for this operation.");
        }

        return tenantId;
    }

    public async Task<Result<BulkProductImportResult>> ImportProductsAsync(
        BulkProductImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Products == null || request.Products.Count == 0)
        {
            return Result<BulkProductImportResult>.Failure("No product rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        var categories = await _context.Categories
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var brands = await _context.Brands
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var uoms = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = uoms.FirstOrDefault();
        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
            uoms.Add(defaultUom);
        }

        var existingItems = await _context.Items
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var existingVariants = await _context.ItemVariants
            .Where(v => v.TenantId == tenantId && !v.IsDeleted)
            .ToListAsync(cancellationToken);

        var errors = new List<BulkImportRowError>();
        var createdItemIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < request.Products.Count; i++)
        {
            var row = request.Products[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.Name))
            {
                errors.Add(new BulkImportRowError(rowIndex, row.Sku ?? $"ROW-{rowIndex}", "Product Name is required."));
                continue;
            }

            var sku = string.IsNullOrWhiteSpace(row.Sku) 
                ? $"SKU-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}" 
                : row.Sku.Trim().ToUpperInvariant();

            var existingItem = existingItems.FirstOrDefault(it => string.Equals(it.Sku, sku, StringComparison.OrdinalIgnoreCase));
            if (existingItem != null)
            {
                if (!request.OverwriteExisting && string.IsNullOrWhiteSpace(row.BatchNumber))
                {
                    skippedCount++;
                    continue;
                }
            }
            else
            {
                var existingVariant = existingVariants.FirstOrDefault(v => string.Equals(v.VariantSku, sku, StringComparison.OrdinalIgnoreCase));
                if (existingVariant != null)
                {
                    if (request.OverwriteExisting)
                    {
                        var parentItem = existingItems.FirstOrDefault(it => it.Id == existingVariant.ItemId);
                        var baseRate = parentItem?.SellingPrice ?? 0m;
                        var newSelling = Math.Max(0m, row.SalePrice > 0 ? row.SalePrice : baseRate);
                        existingVariant.PriceAdjustment = newSelling - baseRate;

                        var vAttrs = new Dictionary<string, string>();
                        if (!string.IsNullOrWhiteSpace(existingVariant.AttributesJson) && existingVariant.AttributesJson != "{}")
                        {
                            try
                            {
                                var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(existingVariant.AttributesJson);
                                if (parsed != null) vAttrs = parsed;
                            }
                            catch { }
                        }
                        if (row.PurchasePrice > 0) vAttrs["purchasePrice"] = row.PurchasePrice.ToString(System.Globalization.CultureInfo.InvariantCulture);
                        if (row.WholesalePrice > 0) vAttrs["wholesalePrice"] = row.WholesalePrice.ToString(System.Globalization.CultureInfo.InvariantCulture);
                        if (row.Mrp > 0) vAttrs["mrp"] = row.Mrp.ToString(System.Globalization.CultureInfo.InvariantCulture);

                        existingVariant.AttributesJson = JsonSerializer.Serialize(vAttrs);
                        successCount++;
                    }
                    else
                    {
                        skippedCount++;
                    }
                    continue;
                }
            }

            // Category match/create
            Category? category = null;
            if (!string.IsNullOrWhiteSpace(row.CategoryName))
            {
                category = categories.FirstOrDefault(c => string.Equals(c.Name, row.CategoryName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (category == null)
                {
                    category = new Category
                    {
                        TenantId = tenantId,
                        Name = row.CategoryName.Trim(),
                        Code = row.CategoryName.Trim().ToUpperInvariant().Replace(" ", "_"),
                        IsActive = true
                    };
                    _context.Categories.Add(category);
                    categories.Add(category);
                }
            }

            // Brand match/create
            Brand? brand = null;
            if (!string.IsNullOrWhiteSpace(row.BrandName))
            {
                brand = brands.FirstOrDefault(b => string.Equals(b.Name, row.BrandName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (brand == null)
                {
                    brand = new Brand
                    {
                        TenantId = tenantId,
                        Name = row.BrandName.Trim(),
                        Code = row.BrandName.Trim().ToUpperInvariant().Replace(" ", "_"),
                        IsActive = true
                    };
                    _context.Brands.Add(brand);
                    brands.Add(brand);
                }
            }

            // UOM match
            var uom = defaultUom;
            if (!string.IsNullOrWhiteSpace(row.PrimaryUom))
            {
                var matched = uoms.FirstOrDefault(u => string.Equals(u.Code, row.PrimaryUom.Trim(), StringComparison.OrdinalIgnoreCase) ||
                                                       string.Equals(u.Name, row.PrimaryUom.Trim(), StringComparison.OrdinalIgnoreCase));
                if (matched != null) uom = matched;
            }

            UnitOfMeasure? secUom = null;
            if (!string.IsNullOrWhiteSpace(row.SecondaryUom))
            {
                secUom = uoms.FirstOrDefault(u => string.Equals(u.Code, row.SecondaryUom.Trim(), StringComparison.OrdinalIgnoreCase) ||
                                                  string.Equals(u.Name, row.SecondaryUom.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            var itemAttrs = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(row.RackLocation))
            {
                itemAttrs["rackLocation"] = row.RackLocation.Trim();
            }
            if (!string.IsNullOrWhiteSpace(row.Packing))
            {
                itemAttrs["packing"] = row.Packing.Trim();
            }
            if (!string.IsNullOrWhiteSpace(row.DrugComposition))
            {
                itemAttrs["drugComposition"] = row.DrugComposition.Trim();
            }
            if (!string.IsNullOrWhiteSpace(row.SecondaryUom))
            {
                itemAttrs["secondaryUom"] = row.SecondaryUom.Trim();
            }
            if (row.ConversionFactor > 1m)
            {
                itemAttrs["conversionFactor"] = row.ConversionFactor;
            }
            if (row.IsService)
            {
                itemAttrs["isService"] = true;
            }
            if (row.TaxInclusive)
            {
                itemAttrs["taxInclusive"] = true;
            }

            // Sanitize rates and quantities to prevent any numeric overflow or invalid values
            var sanitizedTaxRate = row.TaxRate;
            if (sanitizedTaxRate > 100m && sanitizedTaxRate <= 2800m)
            {
                sanitizedTaxRate = sanitizedTaxRate / 100m; // Basis points (e.g. 1800 => 18%)
            }
            else if (sanitizedTaxRate > 100m || sanitizedTaxRate < 0m)
            {
                sanitizedTaxRate = 18.0m;
            }

            var sanitizedCessRate = row.CessRate;
            if (sanitizedCessRate > 100m && sanitizedCessRate <= 2800m)
            {
                sanitizedCessRate = sanitizedCessRate / 100m;
            }
            else if (sanitizedCessRate > 100m || sanitizedCessRate < 0m)
            {
                sanitizedCessRate = 0m;
            }

            var sanitizedPurchasePrice = Math.Max(0m, row.PurchasePrice);
            var sanitizedSalePrice = Math.Max(0m, row.SalePrice);
            var sanitizedWholesalePrice = row.WholesalePrice > 0m ? row.WholesalePrice : sanitizedSalePrice;
            var sanitizedMrp = row.Mrp > 0m ? row.Mrp : (sanitizedSalePrice > 0m ? sanitizedSalePrice : (sanitizedPurchasePrice > 0m ? sanitizedPurchasePrice : 100m));
            var sanitizedMinStock = Math.Max(0m, row.MinimumStockAlert);
            var sanitizedReorderQty = row.ReorderQuantity > 0m ? row.ReorderQuantity : 10m;
            var sanitizedOpeningStock = Math.Max(0m, row.OpeningStock);

            Item item;
            if (existingItem != null)
            {
                item = existingItem;
                item.Name = row.Name.Trim();
                item.ShortDescription = row.Description?.Trim();
                if (category != null) item.Category = category;
                if (brand != null) item.Brand = brand;
                item.PrimaryUom = uom;
                item.HSNCode = row.HsnCode?.Trim() ?? item.HSNCode;
                item.Barcode = row.Barcode?.Trim() ?? item.Barcode;
                item.TaxRate = sanitizedTaxRate;
                item.CessRate = sanitizedCessRate;
                item.PurchasePrice = sanitizedPurchasePrice;
                item.SellingPrice = sanitizedSalePrice;
                item.MinimumSellingPrice = sanitizedWholesalePrice;
                item.MRP = sanitizedMrp;
                item.MinimumStockAlert = sanitizedMinStock;
                item.ReorderQuantity = sanitizedReorderQty;
                if (secUom != null) item.SecondaryUom = secUom;
                if (row.ConversionFactor > 0m) item.ConversionRatio = row.ConversionFactor;
                item.AttributesJson = itemAttrs.Count > 0 ? JsonSerializer.Serialize(itemAttrs) : item.AttributesJson;
            }
            else
            {
                item = new Item
                {
                    TenantId = tenantId,
                    Sku = sku,
                    Name = row.Name.Trim(),
                    ShortDescription = row.Description?.Trim(),
                    Category = category,
                    Brand = brand,
                    PrimaryUom = uom,
                    SecondaryUom = secUom,
                    ConversionRatio = row.ConversionFactor > 0m ? row.ConversionFactor : null,
                    HSNCode = row.HsnCode?.Trim(),
                    Barcode = row.Barcode?.Trim(),
                    TaxRate = sanitizedTaxRate,
                    CessRate = sanitizedCessRate,
                    PurchasePrice = sanitizedPurchasePrice,
                    SellingPrice = sanitizedSalePrice,
                    MinimumSellingPrice = sanitizedWholesalePrice,
                    MRP = sanitizedMrp,
                    MinimumStockAlert = sanitizedMinStock,
                    ReorderQuantity = sanitizedReorderQty,
                    TrackInventory = true,
                    TrackBatches = !string.IsNullOrWhiteSpace(row.BatchNumber),
                    AttributesJson = itemAttrs.Count > 0 ? JsonSerializer.Serialize(itemAttrs) : "{}",
                    IsActive = true
                };

                _context.Items.Add(item);
                existingItems.Add(item);
            }

            // Handle Opening Stock & Batches
            if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
            {
                ItemBatch? batch = null;
                if (!string.IsNullOrWhiteSpace(row.BatchNumber))
                {
                    var cleanBatchNum = row.BatchNumber.Trim().ToUpperInvariant();
                    var batchAlreadyExists = _context.ItemBatches.Local.Any(b => b.TenantId == tenantId && (b.ItemId == item.Id || b.Item == item) && b.BatchNumber == cleanBatchNum)
                        || (existingItem != null && await _context.ItemBatches.AnyAsync(b => b.TenantId == tenantId && b.ItemId == item.Id && b.BatchNumber == cleanBatchNum, cancellationToken));

                    if (!batchAlreadyExists)
                    {
                        var expDate = row.ExpiryDate.HasValue
                            ? DateTime.SpecifyKind(row.ExpiryDate.Value, DateTimeKind.Utc)
                            : DateTime.UtcNow.AddYears(2);

                        batch = new ItemBatch
                        {
                            TenantId = tenantId,
                            Item = item,
                            BatchNumber = cleanBatchNum,
                            ExpiryDate = expDate,
                            MRP = item.MRP,
                            PurchaseRate = item.PurchasePrice,
                            SaleRate = item.SellingPrice
                        };
                        _context.ItemBatches.Add(batch);
                        item.TrackBatches = true;
                    }
                    else
                    {
                        batch = _context.ItemBatches.Local.FirstOrDefault(b => b.TenantId == tenantId && (b.ItemId == item.Id || b.Item == item) && b.BatchNumber == cleanBatchNum);
                    }
                }

                if (sanitizedOpeningStock > 0)
                {
                    var stockExists = _context.ItemWarehouseStocks.Local.Any(s => s.TenantId == tenantId && (s.ItemId == item.Id || s.Item == item) && s.WarehouseId == warehouseId.Value && ((batch == null && s.BatchId == null && s.Batch == null) || (batch != null && (s.BatchId == batch.Id || s.Batch == batch))))
                        || (existingItem != null && await _context.ItemWarehouseStocks.AnyAsync(s => s.TenantId == tenantId && s.ItemId == item.Id && s.WarehouseId == warehouseId.Value && ((batch == null && s.BatchId == null) || (batch != null && s.BatchId == batch.Id)), cancellationToken));

                    if (!stockExists)
                    {
                        var stock = new ItemWarehouseStock
                        {
                            TenantId = tenantId,
                            Item = item,
                            WarehouseId = warehouseId.Value,
                            Batch = batch,
                            CurrentQuantity = sanitizedOpeningStock
                        };
                        _context.ItemWarehouseStocks.Add(stock);

                        var movement = new StockMovement
                        {
                            TenantId = tenantId,
                            Item = item,
                            WarehouseId = warehouseId.Value,
                            Batch = batch,
                            MovementType = StockMovementType.PhysicalAdjustment,
                            Quantity = sanitizedOpeningStock,
                            QuantityBefore = 0,
                            QuantityAfter = sanitizedOpeningStock,
                            UnitCost = item.PurchasePrice,
                            TotalCost = item.PurchasePrice * sanitizedOpeningStock,
                            ReferenceDocumentType = "OpeningStockMigration",
                            ReferenceDocumentNumber = "MIG-OP-STOCK",
                            Notes = $"Opening stock migration ({sanitizedOpeningStock} {uom.Code})"
                        };
                        _context.StockMovements.Add(movement);
                    }
                }
            }

            createdItemIds.Add(item.Id.ToString());
            successCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportProducts",
            EntityName = "Item",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, ErrorsCount = errors.Count })
        }, cancellationToken);

        var result = new BulkProductImportResult(
            request.Products.Count,
            successCount,
            errors.Count,
            skippedCount,
            errors,
            createdItemIds
        );

        return Result<BulkProductImportResult>.Success(result);
    }

    public async Task<Result<BulkPartyImportResult>> ImportPartiesAsync(
        BulkPartyImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Parties == null || request.Parties.Count == 0)
        {
            return Result<BulkPartyImportResult>.Failure("No party rows provided for import.", "EMPTY_IMPORT");
        }

        var existingParties = await _context.Parties
            .Include(p => p.Addresses)
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var errors = new List<BulkImportRowError>();
        var createdPartyIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < request.Parties.Count; i++)
        {
            var row = request.Parties[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.LegalName))
            {
                errors.Add(new BulkImportRowError(rowIndex, row.Code ?? $"ROW-{rowIndex}", "Party Legal Name is required."));
                continue;
            }

            var cleanGstin = row.GSTIN?.Trim().ToUpperInvariant();
            var cleanMobile = row.Mobile?.Trim();
            var cleanLegalName = row.LegalName.Trim();
            var cleanTradeName = !string.IsNullOrWhiteSpace(row.TradeName) ? row.TradeName.Trim() : cleanLegalName;

            // Smart-Match existing party to prevent ANY duplication:
            // 1) Match by explicit Code (if provided in row)
            // 2) OR Match by GSTIN
            // 3) OR Match by Mobile number
            // 4) OR Match by LegalName / TradeName
            Party? existingParty = null;
            if (!string.IsNullOrWhiteSpace(row.Code))
            {
                existingParty = existingParties.FirstOrDefault(p => string.Equals(p.Code, row.Code.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (existingParty == null && !string.IsNullOrWhiteSpace(cleanGstin))
            {
                existingParty = existingParties.FirstOrDefault(p => string.Equals(p.GSTIN, cleanGstin, StringComparison.OrdinalIgnoreCase));
            }

            if (existingParty == null && !string.IsNullOrWhiteSpace(cleanMobile) && cleanMobile.Length >= 10)
            {
                existingParty = existingParties.FirstOrDefault(p => p.Mobile == cleanMobile || p.PrimaryPhone == cleanMobile);
            }

            if (existingParty == null)
            {
                existingParty = existingParties.FirstOrDefault(p =>
                    string.Equals(p.LegalName, cleanLegalName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.TradeName, cleanLegalName, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(p.TradeName, cleanTradeName, StringComparison.OrdinalIgnoreCase));
            }

            var code = existingParty?.Code ?? (string.IsNullOrWhiteSpace(row.Code)
                ? $"P-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}"
                : row.Code.Trim().ToUpperInvariant());

            if (existingParty != null)
            {
                // Auto-enrich DL & FSSAI if missing
                if (string.IsNullOrWhiteSpace(existingParty.DrugLicenseNumber1) && !string.IsNullOrWhiteSpace(row.DrugLicenseNumber))
                    existingParty.DrugLicenseNumber1 = row.DrugLicenseNumber.Trim();
                if (string.IsNullOrWhiteSpace(existingParty.FSSAINumber) && !string.IsNullOrWhiteSpace(row.FssaiNumber))
                    existingParty.FSSAINumber = row.FssaiNumber.Trim();

                if (!request.OverwriteExisting)
                {
                    // If no addresses yet, enrich with billing address
                    if (!existingParty.Addresses.Any(a => !a.IsDeleted) && !string.IsNullOrWhiteSpace(row.AddressLine1))
                    {
                        var address = new PartyAddress
                        {
                            TenantId = tenantId,
                            Party = existingParty,
                            AddressType = AddressType.Billing,
                            AddressLine1 = row.AddressLine1.Trim(),
                            City = row.City?.Trim() ?? "City",
                            State = row.State?.Trim() ?? "State",
                            StateCode = row.StateCode?.Trim() ?? "27",
                            Pincode = row.Pincode?.Trim() ?? "000000",
                            IsDefault = true
                        };
                        existingParty.Addresses.Add(address);
                    }

                    skippedCount++;
                    continue;
                }
            }

            var type = PartyType.Customer;
            if (string.Equals(row.PartyType, "Supplier", StringComparison.OrdinalIgnoreCase))
                type = PartyType.Supplier;
            else if (string.Equals(row.PartyType, "Both", StringComparison.OrdinalIgnoreCase))
                type = PartyType.Both;

            Party party;
            if (existingParty != null)
            {
                party = existingParty;
                party.LegalName = cleanLegalName;
                party.TradeName = cleanTradeName;
                party.PartyType = type;
                party.GSTIN = cleanGstin ?? party.GSTIN;
                party.PAN = row.PAN?.Trim().ToUpperInvariant() ?? party.PAN;
                party.Mobile = row.Mobile?.Trim() ?? party.Mobile;
                party.PrimaryPhone = row.Mobile?.Trim() ?? party.PrimaryPhone;
                party.Email = row.Email?.Trim().ToLowerInvariant() ?? party.Email;
                if (!string.IsNullOrWhiteSpace(row.DrugLicenseNumber))
                    party.DrugLicenseNumber1 = row.DrugLicenseNumber.Trim();
                if (!string.IsNullOrWhiteSpace(row.FssaiNumber))
                    party.FSSAINumber = row.FssaiNumber.Trim();
                party.CreditLimit = row.CreditLimit > 0 ? row.CreditLimit : party.CreditLimit;
                party.CreditPeriodDays = row.CreditDays > 0 ? row.CreditDays : party.CreditPeriodDays;

                // Update or add Billing Address
                if (!string.IsNullOrWhiteSpace(row.AddressLine1))
                {
                    var billingAddr = party.Addresses.FirstOrDefault(a => !a.IsDeleted && (a.IsDefault || a.AddressType == AddressType.Billing));
                    if (billingAddr != null)
                    {
                        billingAddr.AddressLine1 = row.AddressLine1.Trim();
                        if (!string.IsNullOrWhiteSpace(row.City)) billingAddr.City = row.City.Trim();
                        if (!string.IsNullOrWhiteSpace(row.State)) billingAddr.State = row.State.Trim();
                        if (!string.IsNullOrWhiteSpace(row.StateCode)) billingAddr.StateCode = row.StateCode.Trim();
                        if (!string.IsNullOrWhiteSpace(row.Pincode)) billingAddr.Pincode = row.Pincode.Trim();
                    }
                    else
                    {
                        party.Addresses.Add(new PartyAddress
                        {
                            TenantId = tenantId,
                            Party = party,
                            AddressType = AddressType.Billing,
                            AddressLine1 = row.AddressLine1.Trim(),
                            City = row.City?.Trim() ?? "City",
                            State = row.State?.Trim() ?? "State",
                            StateCode = row.StateCode?.Trim() ?? "27",
                            Pincode = row.Pincode?.Trim() ?? "000000",
                            IsDefault = true
                        });
                    }
                }

                // Update or add Shipping / Dispatch Address
                if (!string.IsNullOrWhiteSpace(row.ShippingAddressLine1))
                {
                    var shipAddr = party.Addresses.FirstOrDefault(a => !a.IsDeleted && a.AddressType == AddressType.Shipping);
                    if (shipAddr != null)
                    {
                        shipAddr.AddressLine1 = row.ShippingAddressLine1.Trim();
                        if (!string.IsNullOrWhiteSpace(row.City)) shipAddr.City = row.City.Trim();
                        if (!string.IsNullOrWhiteSpace(row.State)) shipAddr.State = row.State.Trim();
                        if (!string.IsNullOrWhiteSpace(row.StateCode)) shipAddr.StateCode = row.StateCode.Trim();
                        if (!string.IsNullOrWhiteSpace(row.Pincode)) shipAddr.Pincode = row.Pincode.Trim();
                    }
                    else
                    {
                        party.Addresses.Add(new PartyAddress
                        {
                            TenantId = tenantId,
                            Party = party,
                            AddressType = AddressType.Shipping,
                            AddressLine1 = row.ShippingAddressLine1.Trim(),
                            City = row.City?.Trim() ?? "City",
                            State = row.State?.Trim() ?? "State",
                            StateCode = row.StateCode?.Trim() ?? "27",
                            Pincode = row.Pincode?.Trim() ?? "000000",
                            IsDefault = false
                        });
                    }
                }
            }
            else
            {
                party = new Party
                {
                    TenantId = tenantId,
                    Code = code,
                    LegalName = cleanLegalName,
                    TradeName = cleanTradeName,
                    PartyType = type,
                    GSTIN = cleanGstin,
                    PAN = row.PAN?.Trim().ToUpperInvariant(),
                    Mobile = row.Mobile?.Trim(),
                    PrimaryPhone = row.Mobile?.Trim(),
                    Email = row.Email?.Trim().ToLowerInvariant(),
                    DrugLicenseNumber1 = row.DrugLicenseNumber?.Trim(),
                    FSSAINumber = row.FssaiNumber?.Trim(),
                    CreditLimit = row.CreditLimit,
                    CreditPeriodDays = row.CreditDays > 0 ? row.CreditDays : 30,
                    IsActive = true
                };

                var pAttrs = new Dictionary<string, string>();
                if (!string.IsNullOrWhiteSpace(row.GstRegistrationType)) pAttrs["gstRegistrationType"] = row.GstRegistrationType.Trim();
                if (!string.IsNullOrWhiteSpace(row.MsmeRegistrationNumber)) pAttrs["msmeRegistrationNumber"] = row.MsmeRegistrationNumber.Trim();
                if (!string.IsNullOrWhiteSpace(row.UpiId)) pAttrs["upiId"] = row.UpiId.Trim();
                if (pAttrs.Count > 0) party.AttributesJson = JsonSerializer.Serialize(pAttrs);

                if (!string.IsNullOrWhiteSpace(row.AddressLine1))
                {
                    var address = new PartyAddress
                    {
                        TenantId = tenantId,
                        Party = party,
                        AddressType = AddressType.Billing,
                        AddressLine1 = row.AddressLine1.Trim(),
                        City = row.City?.Trim() ?? "City",
                        State = row.State?.Trim() ?? "State",
                        StateCode = row.StateCode?.Trim() ?? "27",
                        Pincode = row.Pincode?.Trim() ?? "000000",
                        IsDefault = true
                    };
                    party.Addresses.Add(address);
                }

                if (!string.IsNullOrWhiteSpace(row.ShippingAddressLine1))
                {
                    var shipAddress = new PartyAddress
                    {
                        TenantId = tenantId,
                        Party = party,
                        AddressType = AddressType.Shipping,
                        AddressLine1 = row.ShippingAddressLine1.Trim(),
                        City = row.City?.Trim() ?? "City",
                        State = row.State?.Trim() ?? "State",
                        StateCode = row.StateCode?.Trim() ?? "27",
                        Pincode = row.Pincode?.Trim() ?? "000000",
                        IsDefault = false
                    };
                    party.Addresses.Add(shipAddress);
                }

                _context.Parties.Add(party);
                existingParties.Add(party);
            }

            // Handle Opening Balance
            if (row.OpeningBalance > 0 && existingParty == null)
            {
                bool isDebit = string.Equals(row.OpeningBalanceType, "Debit", StringComparison.OrdinalIgnoreCase) ||
                               type == PartyType.Customer;

                var ledger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    Party = party,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = PartyLedgerEntryType.OpeningBalance,
                    DebitAmount = isDebit ? row.OpeningBalance : 0m,
                    CreditAmount = !isDebit ? row.OpeningBalance : 0m,
                    RunningBalance = isDebit ? row.OpeningBalance : -row.OpeningBalance,
                    ReferenceDocumentType = "OpeningBalanceMigration",
                    ReferenceDocumentNumber = "MIG-OP-BAL",
                    Description = $"Opening balance migration ({row.OpeningBalance})"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }

            createdPartyIds.Add(party.Id.ToString());
            successCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportParties",
            EntityName = "Party",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, ErrorsCount = errors.Count })
        }, cancellationToken);

        var result = new BulkPartyImportResult(
            request.Parties.Count,
            successCount,
            errors.Count,
            skippedCount,
            errors,
            createdPartyIds
        );

        return Result<BulkPartyImportResult>.Success(result);
    }

    public async Task<Result<BulkInvoiceImportResult>> ImportInvoicesAsync(
        BulkInvoiceImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Invoices == null || request.Invoices.Count == 0)
        {
            return Result<BulkInvoiceImportResult>.Failure("No invoice rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        Guid? branchId = request.BranchId;
        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var defaultBranch = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && !b.IsDeleted)
                .OrderByDescending(b => b.IsHeadOffice)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultBranch != null) branchId = defaultBranch.Id;
        }

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var newBranch = new TenantBranch
            {
                TenantId = tenantId,
                BranchCode = "MAIN",
                BranchName = "Head Office",
                IsHeadOffice = true,
                IsActive = true
            };
            _context.TenantBranches.Add(newBranch);
            await _context.SaveChangesAsync(cancellationToken);
            branchId = newBranch.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var newWh = new TenantWarehouse
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseCode = "WH-MAIN",
                WarehouseName = "Main Warehouse",
                IsDefault = true,
                IsActive = true
            };
            _context.TenantWarehouses.Add(newWh);
            await _context.SaveChangesAsync(cancellationToken);
            warehouseId = newWh.Id;
        }

        var parties = await _context.Parties
            .Include(p => p.Addresses)
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var tenantItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var defaultItem = tenantItems.FirstOrDefault();
        if (defaultItem == null)
        {
            defaultItem = new Item
            {
                TenantId = tenantId,
                Sku = "MIG-SALES-GEN",
                Name = "General Sales Item",
                PrimaryUom = defaultUom,
                TaxRate = 18m,
                SellingPrice = 100m,
                TrackInventory = false,
                IsActive = true
            };
            _context.Items.Add(defaultItem);
            await _context.SaveChangesAsync(cancellationToken);
            tenantItems.Add(defaultItem);
        }

        var existingInvoiceNumbers = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId)
            .Select(i => i.InvoiceNumber)
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingInvoiceNumbers, StringComparer.OrdinalIgnoreCase);

        var errors = new List<BulkImportRowError>();
        var createdInvoiceIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        decimal totalRevenue = 0m;

        for (int i = 0; i < request.Invoices.Count; i++)
        {
            var row = request.Invoices[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.InvoiceNumber))
            {
                errors.Add(new BulkImportRowError(rowIndex, $"ROW-{rowIndex}", "Invoice number is required."));
                continue;
            }

            var invNum = row.InvoiceNumber.Trim();
            if (existingSet.Contains(invNum))
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var customerNameClean = (row.CustomerName ?? "Walk-in Customer").Trim();
            var mobileClean = row.CustomerMobile?.Trim();
            var gstinClean = row.CustomerGstin?.Trim().ToUpperInvariant();

            Party? party = null;
            if (!string.IsNullOrWhiteSpace(gstinClean))
            {
                party = parties.FirstOrDefault(p => string.Equals(p.GSTIN, gstinClean, StringComparison.OrdinalIgnoreCase));
            }
            if (party == null && !string.IsNullOrWhiteSpace(mobileClean))
            {
                party = parties.FirstOrDefault(p => string.Equals(p.Mobile, mobileClean, StringComparison.OrdinalIgnoreCase) ||
                                                    string.Equals(p.PrimaryPhone, mobileClean, StringComparison.OrdinalIgnoreCase));
            }
            if (party == null && !string.IsNullOrWhiteSpace(customerNameClean))
            {
                party = parties.FirstOrDefault(p => string.Equals(p.LegalName, customerNameClean, StringComparison.OrdinalIgnoreCase) ||
                                                    string.Equals(p.TradeName, customerNameClean, StringComparison.OrdinalIgnoreCase));
            }

            if (party == null && !string.IsNullOrWhiteSpace(customerNameClean) && !customerNameClean.Equals("Walk-in Customer", StringComparison.OrdinalIgnoreCase))
            {
                party = new Party
                {
                    TenantId = tenantId,
                    Code = $"CUST-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}",
                    LegalName = customerNameClean,
                    TradeName = customerNameClean,
                    PartyType = PartyType.Customer,
                    Mobile = mobileClean,
                    PrimaryPhone = mobileClean,
                    GSTIN = gstinClean,
                    IsActive = true
                };

                var defaultAddr = new PartyAddress
                {
                    TenantId = tenantId,
                    Party = party,
                    AddressType = AddressType.Billing,
                    AddressLine1 = "Main Market",
                    City = "City",
                    State = "State",
                    StateCode = !string.IsNullOrWhiteSpace(gstinClean) && gstinClean.Length >= 2 ? gstinClean.Substring(0, 2) : "07",
                    Pincode = "110001",
                    IsDefault = true
                };
                party.Addresses.Add(defaultAddr);

                _context.Parties.Add(party);
                parties.Add(party);
            }

            var invDateUtc = row.InvoiceDate != default
                ? DateTime.SpecifyKind(row.InvoiceDate, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var taxableAmount = Math.Max(0m, row.TaxableAmount);
            var gstAmount = Math.Max(0m, row.GstAmount);
            var totalAmount = row.TotalAmount > 0 ? row.TotalAmount : (taxableAmount + gstAmount);
            var paidAmount = Math.Min(totalAmount, Math.Max(0m, row.PaidAmount));
            var balanceAmount = Math.Max(0m, totalAmount - paidAmount);

            var paymentStatus = balanceAmount <= 0.01m
                ? PaymentStatus.FullyPaid
                : (paidAmount > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);

            var payModeStr = (row.PaymentMode ?? "Cash").Trim().ToLowerInvariant();
            PaymentMode paymentMode = PaymentMode.Cash;
            if (payModeStr.Contains("cheque") || payModeStr.Contains("check")) paymentMode = PaymentMode.Cheque;
            else if (payModeStr.Contains("upi") || payModeStr.Contains("gpay") || payModeStr.Contains("paytm") || payModeStr.Contains("phonepe")) paymentMode = PaymentMode.UPI;
            else if (payModeStr.Contains("bank") || payModeStr.Contains("neft") || payModeStr.Contains("rtgs") || payModeStr.Contains("imps")) paymentMode = PaymentMode.BankTransfer;
            else if (payModeStr.Contains("card")) paymentMode = PaymentMode.Card;
            else if (payModeStr.Contains("credit") || balanceAmount > 0) paymentMode = PaymentMode.CreditAccount;

            var partyStateCode = party?.Addresses.FirstOrDefault()?.StateCode ?? "07";
            var cgstAmount = Math.Round(gstAmount / 2m, 4);
            var sgstAmount = gstAmount - cgstAmount;
            var igstAmount = 0m;

            var invoice = new SalesInvoice
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseId = warehouseId.Value,
                InvoiceNumber = invNum,
                InvoiceType = InvoiceType.TaxInvoice,
                Status = InvoiceStatus.Issued,
                PartyId = party?.Id,
                CustomerName = customerNameClean,
                CustomerPhone = mobileClean ?? party?.Mobile,
                CustomerGSTIN = gstinClean ?? party?.GSTIN,
                BillingAddress = party?.Addresses.FirstOrDefault()?.AddressLine1 ?? "Commercial Counter",
                ShippingAddress = party?.Addresses.FirstOrDefault()?.AddressLine1 ?? "Commercial Counter",
                BillingStateCode = partyStateCode,
                ShippingStateCode = partyStateCode,
                PlaceOfSupply = party?.Addresses.FirstOrDefault()?.State ?? "Default State",
                InvoiceDate = invDateUtc,
                DueDate = invDateUtc.AddDays(30),
                TaxSupplyType = TaxSupplyType.IntraState,
                SubTotal = taxableAmount,
                TaxableAmount = taxableAmount,
                CgstAmount = cgstAmount,
                SgstAmount = sgstAmount,
                IgstAmount = igstAmount,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                BalanceAmount = balanceAmount,
                PrimaryPaymentMode = paymentMode,
                PaymentStatus = paymentStatus,
                Notes = row.ItemsSummary ?? "Migrated historical sales invoice"
            };

            var lineItems = ParseInvoiceItems(row.ItemsSummary, row.FreeQuantity, taxableAmount, gstAmount, totalAmount, tenantItems, defaultItem, defaultUom, tenantId, invoice);
            foreach (var lineItem in lineItems)
            {
                invoice.Items.Add(lineItem);
            }

            _context.SalesInvoices.Add(invoice);
            existingSet.Add(invNum);

            if (paidAmount > 0)
            {
                var payment = new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    Invoice = invoice,
                    PaymentDate = invDateUtc,
                    Amount = paidAmount,
                    PaymentMode = paymentMode,
                    TransactionReference = $"MIG-PAY-{invNum}",
                    Notes = $"Historical payment recorded ({row.PaymentMode ?? "Cash"})"
                };
                _context.SalesInvoicePayments.Add(payment);
            }

            if (party != null)
            {
                var debitEntry = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    Party = party,
                    TransactionDate = invDateUtc,
                    EntryType = PartyLedgerEntryType.SalesInvoice,
                    DebitAmount = totalAmount,
                    CreditAmount = 0m,
                    RunningBalance = totalAmount,
                    ReferenceDocumentType = "SalesInvoice",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invNum,
                    PaymentMode = paymentMode.ToString(),
                    Description = $"Sales Invoice #{invNum}"
                };
                _context.PartyLedgerEntries.Add(debitEntry);

                if (paidAmount > 0)
                {
                    var creditEntry = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        Party = party,
                        TransactionDate = invDateUtc,
                        EntryType = PartyLedgerEntryType.PaymentReceipt,
                        DebitAmount = 0m,
                        CreditAmount = paidAmount,
                        RunningBalance = -paidAmount,
                        ReferenceDocumentType = "PaymentReceipt",
                        ReferenceDocumentId = invoice.Id,
                        ReferenceDocumentNumber = $"RCT-{invNum}",
                        PaymentMode = paymentMode.ToString(),
                        Description = $"Payment received against #{invNum}"
                    };
                    _context.PartyLedgerEntries.Add(creditEntry);
                }
            }

            createdInvoiceIds.Add(invoice.Id.ToString());
            successCount++;
            totalRevenue += totalAmount;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportInvoices",
            EntityName = "SalesInvoice",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, TotalRevenue = totalRevenue, ErrorsCount = errors.Count })
        }, cancellationToken);

        var result = new BulkInvoiceImportResult(
            request.Invoices.Count,
            successCount,
            errors.Count,
            skippedCount,
            totalRevenue,
            errors,
            createdInvoiceIds
        );

        return Result<BulkInvoiceImportResult>.Success(result);
    }

    private List<SalesInvoiceItem> ParseInvoiceItems(
        string? itemsSummary,
        decimal invoiceFreeQuantity,
        decimal invoiceTaxable,
        decimal invoiceGst,
        decimal invoiceTotal,
        List<Item> tenantItems,
        Item fallbackItem,
        UnitOfMeasure fallbackUom,
        Guid tenantId,
        SalesInvoice invoice)
    {
        var items = new List<SalesInvoiceItem>();

        if (!string.IsNullOrWhiteSpace(itemsSummary))
        {
            var segments = itemsSummary.Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries);
            var parsedSegments = new List<(Item Item, decimal Qty, decimal FreeQty, string RawName)>();

            foreach (var seg in segments)
            {
                var cleanSeg = seg.Trim();
                if (string.IsNullOrWhiteSpace(cleanSeg)) continue;

                decimal qty = 1m;
                decimal freeQty = 0m;
                string prodName = cleanSeg;

                var qtyIdx = cleanSeg.IndexOf("(Qty:", StringComparison.OrdinalIgnoreCase);
                if (qtyIdx > 0)
                {
                    prodName = cleanSeg.Substring(0, qtyIdx).Trim();
                    var endIdx = cleanSeg.IndexOf(")", qtyIdx);
                    if (endIdx > qtyIdx)
                    {
                        var qtySub = cleanSeg.Substring(qtyIdx + 5, endIdx - (qtyIdx + 5)).Trim();
                        // Check for schemes like "10 + 2 Free" or "10 + 1" or "10, Free: 2"
                        var plusIdx = qtySub.IndexOf('+');
                        if (plusIdx >= 0)
                        {
                            var mainPart = qtySub.Substring(0, plusIdx).Trim();
                            var freePart = qtySub.Substring(plusIdx + 1).Replace("Free", "", StringComparison.OrdinalIgnoreCase).Replace("free", "").Trim();
                            decimal.TryParse(mainPart, out qty);
                            decimal.TryParse(freePart, out freeQty);
                        }
                        else if (qtySub.IndexOf("Free:", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            var freeLabelIdx = qtySub.IndexOf("Free:", StringComparison.OrdinalIgnoreCase);
                            var mainPart = qtySub.Substring(0, freeLabelIdx).Trim(new[] { ' ', ',', ';' });
                            var freePart = qtySub.Substring(freeLabelIdx + 5).Trim();
                            decimal.TryParse(mainPart, out qty);
                            decimal.TryParse(freePart, out freeQty);
                        }
                        else
                        {
                            decimal.TryParse(qtySub, out qty);
                        }

                        if (qty <= 0) qty = 1m;
                    }
                }

                var matched = tenantItems.FirstOrDefault(it =>
                    string.Equals(it.Name, prodName, StringComparison.OrdinalIgnoreCase) ||
                    cleanSeg.IndexOf(it.Name, StringComparison.OrdinalIgnoreCase) >= 0);

                parsedSegments.Add((matched ?? fallbackItem, qty, freeQty, prodName));
            }

            // If explicit invoiceFreeQuantity is passed and only 1 segment had no freeQty specified
            if (invoiceFreeQuantity > 0 && parsedSegments.Count == 1 && parsedSegments[0].FreeQty == 0)
            {
                var single = parsedSegments[0];
                parsedSegments[0] = (single.Item, single.Qty, invoiceFreeQuantity, single.RawName);
            }

            if (parsedSegments.Count > 0)
            {
                decimal totalWeights = parsedSegments.Sum(s => s.Qty * (s.Item.SellingPrice > 0 ? s.Item.SellingPrice : 100m));
                if (totalWeights <= 0) totalWeights = parsedSegments.Count;

                decimal assignedTaxable = 0m;
                decimal assignedTotal = 0m;

                for (int i = 0; i < parsedSegments.Count; i++)
                {
                    var seg = parsedSegments[i];
                    var isLast = (i == parsedSegments.Count - 1);
                    var weight = seg.Qty * (seg.Item.SellingPrice > 0 ? seg.Item.SellingPrice : 100m);
                    var ratio = weight / totalWeights;

                    var lineTaxable = isLast ? (invoiceTaxable - assignedTaxable) : Math.Round(invoiceTaxable * ratio, 4);
                    var lineTotal = isLast ? (invoiceTotal - assignedTotal) : Math.Round(invoiceTotal * ratio, 4);
                    assignedTaxable += lineTaxable;
                    assignedTotal += lineTotal;

                    var lineGst = Math.Max(0m, lineTotal - lineTaxable);
                    var lineCgst = Math.Round(lineGst / 2m, 4);
                    var lineSgst = lineGst - lineCgst;

                    var lineAttrs = new Dictionary<string, object>();
                    if (seg.FreeQty > 0)
                    {
                        lineAttrs["freeQuantity"] = seg.FreeQty;
                    }

                    var lineItem = new SalesInvoiceItem
                    {
                        TenantId = tenantId,
                        Invoice = invoice,
                        ItemId = seg.Item.Id,
                        ItemSku = seg.Item.Sku,
                        ItemName = seg.Item.Name,
                        HsnCode = seg.Item.HSNCode ?? "30049099",
                        Barcode = seg.Item.Barcode,
                        Quantity = seg.Qty,
                        UomId = seg.Item.PrimaryUomId != Guid.Empty ? seg.Item.PrimaryUomId : fallbackUom.Id,
                        UomCode = seg.Item.PrimaryUom?.Code ?? fallbackUom.Code,
                        UnitPrice = seg.Qty > 0 ? Math.Round(lineTaxable / seg.Qty, 4) : lineTaxable,
                        TaxableAmount = lineTaxable,
                        GstRate = lineTaxable > 0 ? Math.Round((lineGst / lineTaxable) * 100m, 2) : 0m,
                        CgstRate = lineTaxable > 0 ? Math.Round((lineCgst / lineTaxable) * 100m, 2) : 0m,
                        CgstAmount = lineCgst,
                        SgstRate = lineTaxable > 0 ? Math.Round((lineSgst / lineTaxable) * 100m, 2) : 0m,
                        SgstAmount = lineSgst,
                        TotalAmount = lineTotal,
                        Mrp = seg.Item.MRP > 0 ? seg.Item.MRP : (seg.Qty > 0 ? Math.Round(lineTotal / seg.Qty, 4) : lineTotal),
                        PurchasePrice = seg.Item.PurchasePrice,
                        AttributesJson = lineAttrs.Count > 0 ? JsonSerializer.Serialize(lineAttrs) : "{}"
                    };
                    items.Add(lineItem);
                }

                return items;
            }
        }

        var cgst = Math.Round(invoiceGst / 2m, 4);
        var sgst = invoiceGst - cgst;
        var fallbackAttrs = new Dictionary<string, object>();
        if (invoiceFreeQuantity > 0)
        {
            fallbackAttrs["freeQuantity"] = invoiceFreeQuantity;
        }

        items.Add(new SalesInvoiceItem
        {
            TenantId = tenantId,
            Invoice = invoice,
            ItemId = fallbackItem.Id,
            ItemSku = fallbackItem.Sku,
            ItemName = !string.IsNullOrWhiteSpace(itemsSummary) ? itemsSummary : fallbackItem.Name,
            HsnCode = fallbackItem.HSNCode ?? "30049099",
            Quantity = 1m,
            UomId = fallbackItem.PrimaryUomId != Guid.Empty ? fallbackItem.PrimaryUomId : fallbackUom.Id,
            UomCode = fallbackItem.PrimaryUom?.Code ?? fallbackUom.Code,
            UnitPrice = invoiceTaxable,
            TaxableAmount = invoiceTaxable,
            GstRate = invoiceTaxable > 0 ? Math.Round((invoiceGst / invoiceTaxable) * 100m, 2) : 0m,
            CgstRate = invoiceTaxable > 0 ? Math.Round((cgst / invoiceTaxable) * 100m, 2) : 0m,
            CgstAmount = cgst,
            SgstRate = invoiceTaxable > 0 ? Math.Round((sgst / invoiceTaxable) * 100m, 2) : 0m,
            SgstAmount = sgst,
            TotalAmount = invoiceTotal,
            Mrp = invoiceTotal,
            PurchasePrice = fallbackItem.PurchasePrice,
            AttributesJson = fallbackAttrs.Count > 0 ? JsonSerializer.Serialize(fallbackAttrs) : "{}"
        });

        return items;
    }

    public Task<Result<CsvTemplateFileDto>> GetProductImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Sku,Name,CategoryName,BrandName,HsnCode,Barcode,PrimaryUom,TaxRate,CessRate,PurchasePrice,RetailPrice,WholesalePrice,Mrp,MinimumStockAlert,ReorderQuantity,OpeningStock,BatchNumber,ExpiryDate,RackLocation,Description");
        sb.AppendLine("MED-PCM-650,Paracetamol 650mg Tablets,Analgesic,Cipla,30049099,8901002001,STRIP,12,0,18.50,30.00,26.00,35.00,50,100,250,BAT-2026-A1,2028-12-31,Rack-A-12,Pain & Fever Relief");
        sb.AppendLine("MED-AZI-500,Azithromycin 500mg,Antibiotic,Sun Pharma,30042010,8901002002,STRIP,12,0,45.00,75.00,65.00,90.00,30,60,150,BAT-2026-B2,2027-08-31,Rack-B-04,Broad spectrum antibiotic");
        sb.AppendLine("FMCG-BIS-01,Parle-G Gold Glucose 1kg,Biscuits,Parle,19053100,8901003001,PACK,5,0,80.00,100.00,92.00,110.00,20,50,80,BAT-FMCG-01,2027-03-31,Shelf-1,Daily nutrition biscuits");
        sb.AppendLine("CAKE-BLCK-500G,Black Forest Cake (500 g),Cakes,Fresh Bakes,19059010,8906000123011,PCS,18,0,220.00,350.00,300.00,400.00,5,15,8,BK-2603,2026-10-15,Chiller-1,Dutch Chocolate Fresh Cream Cake");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var dto = new CsvTemplateFileDto("UdyogBill_Products_Import_Template.csv", "text/csv", bytes);
        return Task.FromResult(Result<CsvTemplateFileDto>.Success(dto));
    }

    public Task<Result<CsvTemplateFileDto>> GetPartyImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Code,LegalName,TradeName,PartyType,GSTIN,PAN,Mobile,Email,ContactPerson,AddressLine1,City,State,StateCode,Pincode,CreditLimit,CreditDays,OpeningBalance,OpeningBalanceType,DrugLicenseNumber,FssaiNumber");
        sb.AppendLine("CUST-001,Apollo Medico Distributors,Apollo Medico,Customer,27AAAAA0000A1Z5,AAAAA0000A,9820011223,accounts@apollomedico.in,Ramesh Sharma,Shop 42 Chemist Market,Mumbai,Maharashtra,27,400001,500000,30,45000,Debit,MH-MZ1-123456,10012011000123");
        sb.AppendLine("SUPP-001,Sun Pharmaceutical Industries Ltd,Sun Pharma,Supplier,27AAACS1234F1Z1,AAACS1234F,9811002233,distributors@sunpharma.com,Vivek Gupta,Plot 18 Sun Complex,Pune,Maharashtra,27,411001,1500000,45,120000,Credit,MH-PUN-654321,");
        sb.AppendLine("CUST-002,Sharma Supermarket & Grocery,Sharma Mart,Customer,27BBBBB1111B1Z2,BBBBB1111B,9876543210,sharma.mart@gmail.com,Anil Sharma,Main Market Road,Nagpur,Maharashtra,27,440001,200000,15,15000,Debit,,20015011000456");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var dto = new CsvTemplateFileDto("UdyogBill_Parties_Import_Template.csv", "text/csv", bytes);
        return Task.FromResult(Result<CsvTemplateFileDto>.Success(dto));
    }

    public async Task<Result<BulkPurchaseImportResult>> ImportPurchasesAsync(
        BulkPurchaseImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Purchases == null || request.Purchases.Count == 0)
        {
            return Result<BulkPurchaseImportResult>.Failure("No purchase rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        Guid? branchId = request.BranchId;
        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var defaultBranch = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && !b.IsDeleted)
                .OrderByDescending(b => b.IsHeadOffice)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultBranch != null) branchId = defaultBranch.Id;
        }

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var newBranch = new TenantBranch
            {
                TenantId = tenantId,
                BranchCode = "MAIN",
                BranchName = "Head Office",
                IsHeadOffice = true,
                IsActive = true
            };
            _context.TenantBranches.Add(newBranch);
            await _context.SaveChangesAsync(cancellationToken);
            branchId = newBranch.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var newWh = new TenantWarehouse
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseCode = "WH-MAIN",
                WarehouseName = "Main Warehouse",
                IsDefault = true,
                IsActive = true
            };
            _context.TenantWarehouses.Add(newWh);
            await _context.SaveChangesAsync(cancellationToken);
            warehouseId = newWh.Id;
        }

        var suppliers = await _context.Parties
            .Include(p => p.Addresses)
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var tenantItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var defaultItem = tenantItems.FirstOrDefault();
        if (defaultItem == null)
        {
            defaultItem = new Item
            {
                TenantId = tenantId,
                Sku = "MIG-PURCH-GEN",
                Name = "General Purchase Item",
                PrimaryUom = defaultUom,
                TaxRate = 18m,
                PurchasePrice = 100m,
                SellingPrice = 120m,
                TrackInventory = false,
                IsActive = true
            };
            _context.Items.Add(defaultItem);
            await _context.SaveChangesAsync(cancellationToken);
            tenantItems.Add(defaultItem);
        }

        var existingBillNumbers = await _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .Select(b => b.BillNumber)
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingBillNumbers, StringComparer.OrdinalIgnoreCase);

        var errors = new List<BulkImportRowError>();
        var createdBillIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        decimal totalPurchaseAmount = 0m;

        for (int i = 0; i < request.Purchases.Count; i++)
        {
            var row = request.Purchases[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.PurchaseBillNumber))
            {
                errors.Add(new BulkImportRowError(rowIndex, $"ROW-{rowIndex}", "Purchase Bill number is required."));
                continue;
            }

            var billNum = row.PurchaseBillNumber.Trim();
            if (existingSet.Contains(billNum))
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var supplierNameClean = (row.SupplierName ?? "General Supplier").Trim();
            var mobileClean = row.SupplierMobile?.Trim();
            var gstinClean = row.SupplierGstin?.Trim().ToUpperInvariant();

            Party? supplier = null;
            if (!string.IsNullOrWhiteSpace(gstinClean))
            {
                supplier = suppliers.FirstOrDefault(p => string.Equals(p.GSTIN, gstinClean, StringComparison.OrdinalIgnoreCase));
            }
            if (supplier == null && !string.IsNullOrWhiteSpace(mobileClean))
            {
                supplier = suppliers.FirstOrDefault(p => string.Equals(p.Mobile, mobileClean, StringComparison.OrdinalIgnoreCase) ||
                                                         string.Equals(p.PrimaryPhone, mobileClean, StringComparison.OrdinalIgnoreCase));
            }
            if (supplier == null && !string.IsNullOrWhiteSpace(supplierNameClean))
            {
                supplier = suppliers.FirstOrDefault(p => string.Equals(p.LegalName, supplierNameClean, StringComparison.OrdinalIgnoreCase) ||
                                                         string.Equals(p.TradeName, supplierNameClean, StringComparison.OrdinalIgnoreCase));
            }

            if (supplier == null && !string.IsNullOrWhiteSpace(supplierNameClean))
            {
                supplier = new Party
                {
                    TenantId = tenantId,
                    Code = $"SUPP-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}",
                    LegalName = supplierNameClean,
                    TradeName = supplierNameClean,
                    PartyType = PartyType.Supplier,
                    Mobile = mobileClean,
                    PrimaryPhone = mobileClean,
                    GSTIN = gstinClean,
                    IsActive = true
                };

                var defaultAddr = new PartyAddress
                {
                    TenantId = tenantId,
                    Party = supplier,
                    AddressType = AddressType.Billing,
                    AddressLine1 = "Commercial Depot",
                    City = "City",
                    State = "State",
                    StateCode = !string.IsNullOrWhiteSpace(gstinClean) && gstinClean.Length >= 2 ? gstinClean.Substring(0, 2) : "07",
                    Pincode = "110001",
                    IsDefault = true
                };
                supplier.Addresses.Add(defaultAddr);

                _context.Parties.Add(supplier);
                suppliers.Add(supplier);
            }

            var billDateUtc = row.BillDate != default
                ? DateTime.SpecifyKind(row.BillDate, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var taxableAmount = Math.Max(0m, row.TaxableAmount);
            var gstAmount = Math.Max(0m, row.GstAmount);
            var totalAmount = row.TotalAmount > 0 ? row.TotalAmount : (taxableAmount + gstAmount);
            var paidAmount = Math.Min(totalAmount, Math.Max(0m, row.PaidAmount));
            var balanceAmount = Math.Max(0m, totalAmount - paidAmount);

            var paymentStatus = balanceAmount <= 0.01m
                ? PaymentStatus.FullyPaid
                : (paidAmount > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);

            var payModeStr = (row.PaymentMode ?? "Bank Transfer").Trim().ToLowerInvariant();
            PaymentMode paymentMode = PaymentMode.BankTransfer;
            if (payModeStr.Contains("cash")) paymentMode = PaymentMode.Cash;
            else if (payModeStr.Contains("cheque") || payModeStr.Contains("check")) paymentMode = PaymentMode.Cheque;
            else if (payModeStr.Contains("upi") || payModeStr.Contains("gpay") || payModeStr.Contains("paytm")) paymentMode = PaymentMode.UPI;

            var cgstAmount = Math.Round(gstAmount / 2m, 4);
            var sgstAmount = gstAmount - cgstAmount;

            var bill = new PurchaseBill
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseId = warehouseId.Value,
                BillNumber = billNum,
                Status = PurchaseBillStatus.Approved,
                PartyId = supplier!.Id,
                Party = supplier,
                SupplierName = supplierNameClean,
                SupplierGSTIN = gstinClean ?? supplier.GSTIN,
                SupplierAddress = supplier.Addresses.FirstOrDefault()?.AddressLine1 ?? "Commercial Depot",
                SupplierStateCode = supplier.Addresses.FirstOrDefault()?.StateCode ?? "07",
                PlaceOfSupply = supplier.Addresses.FirstOrDefault()?.State ?? "Default State",
                BillDate = billDateUtc,
                DueDate = billDateUtc.AddDays(supplier.CreditPeriodDays > 0 ? supplier.CreditPeriodDays : 30),
                TaxSupplyType = TaxSupplyType.IntraState,
                SubTotal = taxableAmount,
                TaxableAmount = taxableAmount,
                CgstAmount = cgstAmount,
                SgstAmount = sgstAmount,
                IgstAmount = 0m,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                BalanceAmount = balanceAmount,
                PaymentStatus = paymentStatus,
                PrimaryPaymentMode = paymentMode,
                Notes = row.Remarks ?? row.ItemsSummary ?? "Migrated historical purchase bill"
            };

            var purchaseItem = new PurchaseBillItem
            {
                TenantId = tenantId,
                PurchaseBill = bill,
                ItemId = defaultItem.Id,
                Item = defaultItem,
                ItemSku = defaultItem.Sku,
                ItemName = string.IsNullOrWhiteSpace(row.ItemsSummary) ? defaultItem.Name : row.ItemsSummary,
                Quantity = 1m,
                FreeQuantity = row.FreeQuantity,
                UomId = defaultUom.Id,
                Uom = defaultUom,
                UomCode = defaultUom.Code,
                UnitPrice = taxableAmount > 0 ? taxableAmount : totalAmount,
                TaxableAmount = taxableAmount,
                GstRate = taxableAmount > 0 ? Math.Round((gstAmount / taxableAmount) * 100m, 2) : 0m,
                CgstRate = taxableAmount > 0 ? Math.Round((gstAmount / taxableAmount) * 50m, 2) : 0m,
                CgstAmount = cgstAmount,
                SgstRate = taxableAmount > 0 ? Math.Round((gstAmount / taxableAmount) * 50m, 2) : 0m,
                SgstAmount = sgstAmount,
                TotalAmount = totalAmount
            };
            bill.Items.Add(purchaseItem);

            _context.PurchaseBills.Add(bill);
            existingSet.Add(billNum);

            if (paidAmount > 0)
            {
                var payment = new PurchaseBillPayment
                {
                    TenantId = tenantId,
                    PurchaseBill = bill,
                    PaymentDate = billDateUtc,
                    Amount = paidAmount,
                    PaymentMode = paymentMode,
                    TransactionReference = $"MIG-PURPAY-{billNum}",
                    Notes = $"Historical vendor payment ({row.PaymentMode ?? "Bank Transfer"})"
                };
                _context.PurchaseBillPayments.Add(payment);
            }

            var creditEntry = new PartyLedgerEntry
            {
                TenantId = tenantId,
                Party = supplier,
                TransactionDate = billDateUtc,
                EntryType = PartyLedgerEntryType.PurchaseInvoice,
                DebitAmount = 0m,
                CreditAmount = totalAmount,
                RunningBalance = totalAmount,
                ReferenceDocumentType = "PurchaseBill",
                ReferenceDocumentId = bill.Id,
                ReferenceDocumentNumber = billNum,
                PaymentMode = paymentMode.ToString(),
                Description = $"Purchase Bill #{billNum}"
            };
            _context.PartyLedgerEntries.Add(creditEntry);

            if (paidAmount > 0)
            {
                var debitEntry = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    Party = supplier,
                    TransactionDate = billDateUtc,
                    EntryType = PartyLedgerEntryType.PaymentReceipt,
                    DebitAmount = paidAmount,
                    CreditAmount = 0m,
                    RunningBalance = -paidAmount,
                    ReferenceDocumentType = "VendorPayment",
                    ReferenceDocumentId = bill.Id,
                    ReferenceDocumentNumber = $"PAY-{billNum}",
                    PaymentMode = paymentMode.ToString(),
                    Description = $"Payment made against Purchase #{billNum}"
                };
                _context.PartyLedgerEntries.Add(debitEntry);
            }

            createdBillIds.Add(bill.Id.ToString());
            successCount++;
            totalPurchaseAmount += totalAmount;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportPurchases",
            EntityName = "PurchaseBill",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, TotalPurchaseAmount = totalPurchaseAmount, ErrorsCount = errors.Count })
        }, cancellationToken);

        return Result<BulkPurchaseImportResult>.Success(new BulkPurchaseImportResult(
            request.Purchases.Count,
            successCount,
            errors.Count,
            skippedCount,
            totalPurchaseAmount,
            errors,
            createdBillIds
        ));
    }

    public async Task<Result<BulkExpenseImportResult>> ImportExpensesAsync(
        BulkExpenseImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Expenses == null || request.Expenses.Count == 0)
        {
            return Result<BulkExpenseImportResult>.Failure("No expense rows provided for import.", "EMPTY_IMPORT");
        }

        var categories = await _context.ExpenseCategories
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var bankAccounts = await _context.BankAccounts
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultBank = bankAccounts.FirstOrDefault(b => b.IsDefault) ?? bankAccounts.FirstOrDefault();

        var errors = new List<BulkImportRowError>();
        var createdExpenseIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        decimal totalExpenseAmount = 0m;

        for (int i = 0; i < request.Expenses.Count; i++)
        {
            var row = request.Expenses[i];
            var rowIndex = i + 1;

            if (row.Amount <= 0 && row.TotalAmount <= 0)
            {
                errors.Add(new BulkImportRowError(rowIndex, $"EXP-{rowIndex}", "Expense amount must be greater than zero."));
                continue;
            }

            var catName = (row.CategoryName ?? "General Expense").Trim();
            var category = categories.FirstOrDefault(c => string.Equals(c.Name, catName, StringComparison.OrdinalIgnoreCase) ||
                                                          string.Equals(c.Code, catName, StringComparison.OrdinalIgnoreCase));

            if (category == null)
            {
                var code = catName.Length > 10 ? catName.Substring(0, 10).ToUpperInvariant().Replace(" ", "_") : catName.ToUpperInvariant().Replace(" ", "_");
                category = new ExpenseCategory
                {
                    TenantId = tenantId,
                    Code = code,
                    Name = catName,
                    Description = $"Auto-created during migration for {catName}",
                    IsActive = true
                };
                _context.ExpenseCategories.Add(category);
                categories.Add(category);
            }

            var expDateUtc = row.ExpenseDate != default
                ? DateTime.SpecifyKind(row.ExpenseDate, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var amount = Math.Max(0m, row.Amount);
            var taxAmount = Math.Max(0m, row.TaxAmount);
            var totalAmount = row.TotalAmount > 0 ? row.TotalAmount : (amount + taxAmount);
            if (amount <= 0) amount = totalAmount - taxAmount;

            var payModeStr = (row.PaymentMode ?? "Cash").Trim().ToLowerInvariant();
            PaymentMode paymentMode = PaymentMode.Cash;
            if (payModeStr.Contains("bank") || payModeStr.Contains("neft") || payModeStr.Contains("rtgs") || payModeStr.Contains("imps")) paymentMode = PaymentMode.BankTransfer;
            else if (payModeStr.Contains("cheque") || payModeStr.Contains("check")) paymentMode = PaymentMode.Cheque;
            else if (payModeStr.Contains("upi") || payModeStr.Contains("gpay") || payModeStr.Contains("paytm") || payModeStr.Contains("phonepe")) paymentMode = PaymentMode.UPI;
            else if (payModeStr.Contains("card")) paymentMode = PaymentMode.Card;

            var voucherNumber = $"EXP-MIG-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}";

            var voucher = new ExpenseVoucher
            {
                TenantId = tenantId,
                VoucherNumber = voucherNumber,
                ExpenseDate = expDateUtc,
                Category = category,
                PaidTo = string.IsNullOrWhiteSpace(row.PaidTo) ? "Vendor / Payee" : row.PaidTo.Trim(),
                Amount = amount,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                PaymentMode = paymentMode,
                BankAccountId = (paymentMode == PaymentMode.BankTransfer || paymentMode == PaymentMode.UPI) ? defaultBank?.Id : null,
                ReferenceNumber = row.ReferenceNumber?.Trim(),
                HasGstInvoice = row.HasGstInvoice,
                VendorGstin = row.VendorGstin?.Trim().ToUpperInvariant(),
                Notes = row.Notes?.Trim() ?? $"Migrated historical {catName}"
            };

            _context.ExpenseVouchers.Add(voucher);
            createdExpenseIds.Add(voucher.Id.ToString());
            successCount++;
            totalExpenseAmount += totalAmount;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportExpenses",
            EntityName = "ExpenseVoucher",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, TotalExpenseAmount = totalExpenseAmount, ErrorsCount = errors.Count })
        }, cancellationToken);

        return Result<BulkExpenseImportResult>.Success(new BulkExpenseImportResult(
            request.Expenses.Count,
            successCount,
            errors.Count,
            skippedCount,
            totalExpenseAmount,
            errors,
            createdExpenseIds
        ));
    }

    public async Task<Result<BulkLedgerImportResult>> ImportLedgersAsync(
        BulkLedgerImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Ledgers == null || request.Ledgers.Count == 0)
        {
            return Result<BulkLedgerImportResult>.Failure("No ledger rows provided for import.", "EMPTY_IMPORT");
        }

        var existingAccounts = await _context.BankAccounts
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var errors = new List<BulkImportRowError>();
        var createdAccountIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < request.Ledgers.Count; i++)
        {
            var row = request.Ledgers[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.AccountName))
            {
                errors.Add(new BulkImportRowError(rowIndex, $"LEDGER-{rowIndex}", "Account Name is required."));
                continue;
            }

            var cleanName = row.AccountName.Trim();
            var existing = existingAccounts.FirstOrDefault(a => string.Equals(a.AccountName, cleanName, StringComparison.OrdinalIgnoreCase) ||
                                                               (!string.IsNullOrWhiteSpace(row.AccountNumber) && string.Equals(a.AccountNumber, row.AccountNumber.Trim(), StringComparison.OrdinalIgnoreCase)));

            if (existing != null)
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var groupStr = (row.AccountGroup ?? "Bank Accounts").Trim().ToLowerInvariant();
            BankAccountType accountType = BankAccountType.CurrentAccount;
            if (groupStr.Contains("cash")) accountType = BankAccountType.CashInHand;
            else if (groupStr.Contains("saving")) accountType = BankAccountType.SavingsAccount;
            else if (groupStr.Contains("credit card")) accountType = BankAccountType.CreditCard;

            var isDebit = !(row.BalanceType ?? "").ToLowerInvariant().Contains("cr");
            var openingBal = isDebit ? Math.Abs(row.OpeningBalance) : -Math.Abs(row.OpeningBalance);

            BankAccount account;
            if (existing != null)
            {
                account = existing;
                account.OpeningBalance = openingBal;
                account.CurrentBalance = openingBal;
                account.AccountNumber = row.AccountNumber?.Trim() ?? account.AccountNumber;
                account.IfscCode = row.IfscCode?.Trim() ?? account.IfscCode;
            }
            else
            {
                account = new BankAccount
                {
                    TenantId = tenantId,
                    AccountName = cleanName,
                    BankName = cleanName,
                    AccountNumber = row.AccountNumber?.Trim(),
                    IfscCode = row.IfscCode?.Trim(),
                    AccountType = accountType,
                    OpeningBalance = openingBal,
                    CurrentBalance = openingBal,
                    IsDefault = existingAccounts.Count == 0,
                    IsActive = true
                };
                _context.BankAccounts.Add(account);
                existingAccounts.Add(account);
            }

            createdAccountIds.Add(account.Id.ToString());
            successCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportLedgers",
            EntityName = "BankAccount",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, ErrorsCount = errors.Count })
        }, cancellationToken);

        return Result<BulkLedgerImportResult>.Success(new BulkLedgerImportResult(
            request.Ledgers.Count,
            successCount,
            errors.Count,
            skippedCount,
            errors,
            createdAccountIds
        ));
    }

    public async Task<Result<BulkSalesReturnImportResult>> ImportSalesReturnsAsync(
        BulkSalesReturnImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Returns == null || request.Returns.Count == 0)
        {
            return Result<BulkSalesReturnImportResult>.Failure("No sales return rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        Guid? branchId = request.BranchId;

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var defaultBranch = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && !b.IsDeleted)
                .OrderByDescending(b => b.IsHeadOffice)
                .FirstOrDefaultAsync(cancellationToken);
            if (defaultBranch != null) branchId = defaultBranch.Id;
        }

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var newBranch = new TenantBranch
            {
                TenantId = tenantId,
                BranchCode = "MAIN",
                BranchName = "Head Office",
                IsHeadOffice = true,
                IsActive = true
            };
            _context.TenantBranches.Add(newBranch);
            await _context.SaveChangesAsync(cancellationToken);
            branchId = newBranch.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);
            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var newWh = new TenantWarehouse
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseCode = "WH-MAIN",
                WarehouseName = "Main Warehouse",
                IsDefault = true,
                IsActive = true
            };
            _context.TenantWarehouses.Add(newWh);
            await _context.SaveChangesAsync(cancellationToken);
            warehouseId = newWh.Id;
        }

        var customers = await _context.Parties
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var tenantItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var defaultItem = tenantItems.FirstOrDefault();
        if (defaultItem == null)
        {
            defaultItem = new Item
            {
                TenantId = tenantId,
                Sku = "MIG-RETURN-GEN",
                Name = "General Return Item",
                PrimaryUom = defaultUom,
                TaxRate = 18m,
                PurchasePrice = 100m,
                SellingPrice = 120m,
                TrackInventory = false,
                IsActive = true
            };
            _context.Items.Add(defaultItem);
            await _context.SaveChangesAsync(cancellationToken);
            tenantItems.Add(defaultItem);
        }

        var existingReturns = await _context.SalesReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted)
            .Select(r => r.CreditNoteNumber)
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingReturns, StringComparer.OrdinalIgnoreCase);

        var errors = new List<BulkImportRowError>();
        var createdReturnIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        decimal totalReturnAmount = 0m;

        for (int i = 0; i < request.Returns.Count; i++)
        {
            var row = request.Returns[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.CreditNoteNumber))
            {
                errors.Add(new BulkImportRowError(rowIndex, $"ROW-{rowIndex}", "Credit Note / Return Number is required."));
                continue;
            }

            var cnNum = row.CreditNoteNumber.Trim();
            if (existingSet.Contains(cnNum))
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var custName = (row.CustomerName ?? "").Trim();
            if (string.IsNullOrWhiteSpace(custName)) custName = "Walk-in Customer";

            Party? customer = null;
            if (!string.IsNullOrWhiteSpace(row.CustomerGstin))
            {
                customer = customers.FirstOrDefault(c => string.Equals(c.GSTIN, row.CustomerGstin.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (customer == null && !string.IsNullOrWhiteSpace(row.CustomerMobile))
            {
                customer = customers.FirstOrDefault(c => string.Equals(c.Mobile, row.CustomerMobile.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (customer == null)
            {
                customer = customers.FirstOrDefault(c => string.Equals(c.LegalName, custName, StringComparison.OrdinalIgnoreCase) ||
                                                         string.Equals(c.TradeName, custName, StringComparison.OrdinalIgnoreCase));
            }

            if (customer == null)
            {
                customer = new Party
                {
                    TenantId = tenantId,
                    Code = $"CUST-MIG-{rowIndex:D4}",
                    LegalName = custName,
                    TradeName = custName,
                    PartyType = PartyType.Customer,
                    Mobile = row.CustomerMobile?.Trim(),
                    GSTIN = row.CustomerGstin?.Trim(),
                    IsActive = true
                };
                _context.Parties.Add(customer);
                customers.Add(customer);
            }

            DateTime returnDateUtc = DateTime.SpecifyKind(row.ReturnDate, DateTimeKind.Utc);
            var taxable = Math.Abs(row.TaxableAmount);
            var gst = Math.Abs(row.GstAmount);
            var total = Math.Abs(row.TotalAmount);
            if (total == 0m && taxable > 0m) total = taxable + gst;
            if (taxable == 0m && total > 0m) taxable = Math.Round(total / 1.18m, 2);
            if (gst == 0m) gst = total - taxable;

            // Check if original invoice exists
            Guid? origInvId = null;
            if (!string.IsNullOrWhiteSpace(row.OriginalInvoiceNumber))
            {
                var origInv = await _context.SalesInvoices
                    .FirstOrDefaultAsync(si => si.TenantId == tenantId && si.InvoiceNumber == row.OriginalInvoiceNumber.Trim() && !si.IsDeleted, cancellationToken);
                if (origInv != null) origInvId = origInv.Id;
            }

            var salesReturn = new SalesReturn
            {
                TenantId = tenantId,
                CreditNoteNumber = cnNum,
                ReturnDate = returnDateUtc,
                OriginalSalesInvoiceId = origInvId,
                OriginalInvoiceNumber = row.OriginalInvoiceNumber?.Trim(),
                Party = customer,
                CustomerName = custName,
                BranchId = branchId.Value,
                WarehouseId = warehouseId.Value,
                ReturnReason = string.IsNullOrWhiteSpace(row.ReturnReason) ? "Customer Return" : row.ReturnReason.Trim(),
                RestockToWarehouse = true,
                SubTotal = taxable,
                TaxAmount = gst,
                TotalAmount = total,
                RefundStatus = string.IsNullOrWhiteSpace(row.RefundStatus) ? "Pending" : row.RefundStatus.Trim(),
                RefundMode = row.RefundMode?.Trim(),
                Notes = row.Notes?.Trim()
            };

            var returnItem = new SalesReturnItem
            {
                TenantId = tenantId,
                SalesReturn = salesReturn,
                Item = defaultItem,
                ItemName = string.IsNullOrWhiteSpace(row.ItemsSummary) ? defaultItem.Name : row.ItemsSummary.Trim(),
                ItemSku = defaultItem.Sku,
                ReturnQuantity = 1m,
                UnitPrice = taxable,
                TaxableAmount = taxable,
                GstRate = taxable > 0 ? Math.Round((gst / taxable) * 100m, 2) : 18m,
                TotalAmount = total
            };
            salesReturn.Items.Add(returnItem);

            _context.SalesReturns.Add(salesReturn);
            existingSet.Add(cnNum);

            // Party Ledger Credit Note Entry (Crediting customer's account to reduce their debit balance)
            var creditEntry = new PartyLedgerEntry
            {
                TenantId = tenantId,
                Party = customer,
                TransactionDate = returnDateUtc,
                EntryType = PartyLedgerEntryType.CreditNote,
                DebitAmount = 0m,
                CreditAmount = total,
                RunningBalance = -total,
                ReferenceDocumentType = "SalesReturn",
                ReferenceDocumentId = salesReturn.Id,
                ReferenceDocumentNumber = cnNum,
                PaymentMode = row.RefundMode ?? "Credit Note",
                Description = $"Sales Return / Credit Note #{cnNum} {(string.IsNullOrWhiteSpace(row.OriginalInvoiceNumber) ? "" : "against Inv #" + row.OriginalInvoiceNumber)}"
            };
            _context.PartyLedgerEntries.Add(creditEntry);

            createdReturnIds.Add(salesReturn.Id.ToString());
            successCount++;
            totalReturnAmount += total;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportSalesReturns",
            EntityName = "SalesReturn",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, TotalReturnAmount = totalReturnAmount, ErrorsCount = errors.Count })
        }, cancellationToken);

        return Result<BulkSalesReturnImportResult>.Success(new BulkSalesReturnImportResult(
            request.Returns.Count,
            successCount,
            errors.Count,
            skippedCount,
            totalReturnAmount,
            errors,
            createdReturnIds
        ));
    }

    public async Task<Result<BulkPurchaseReturnImportResult>> ImportPurchaseReturnsAsync(
        BulkPurchaseReturnImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Returns == null || request.Returns.Count == 0)
        {
            return Result<BulkPurchaseReturnImportResult>.Failure("No purchase return rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        Guid? branchId = request.BranchId;

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var defaultBranch = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && !b.IsDeleted)
                .OrderByDescending(b => b.IsHeadOffice)
                .FirstOrDefaultAsync(cancellationToken);
            if (defaultBranch != null) branchId = defaultBranch.Id;
        }

        if (!branchId.HasValue || branchId.Value == Guid.Empty)
        {
            var newBranch = new TenantBranch
            {
                TenantId = tenantId,
                BranchCode = "MAIN",
                BranchName = "Head Office",
                IsHeadOffice = true,
                IsActive = true
            };
            _context.TenantBranches.Add(newBranch);
            await _context.SaveChangesAsync(cancellationToken);
            branchId = newBranch.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);
            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var newWh = new TenantWarehouse
            {
                TenantId = tenantId,
                BranchId = branchId.Value,
                WarehouseCode = "WH-MAIN",
                WarehouseName = "Main Warehouse",
                IsDefault = true,
                IsActive = true
            };
            _context.TenantWarehouses.Add(newWh);
            await _context.SaveChangesAsync(cancellationToken);
            warehouseId = newWh.Id;
        }

        var suppliers = await _context.Parties
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var tenantItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var defaultItem = tenantItems.FirstOrDefault();
        if (defaultItem == null)
        {
            defaultItem = new Item
            {
                TenantId = tenantId,
                Sku = "MIG-PURCH-RET-GEN",
                Name = "General Purchase Return Item",
                PrimaryUom = defaultUom,
                TaxRate = 18m,
                PurchasePrice = 100m,
                SellingPrice = 120m,
                TrackInventory = false,
                IsActive = true
            };
            _context.Items.Add(defaultItem);
            await _context.SaveChangesAsync(cancellationToken);
            tenantItems.Add(defaultItem);
        }

        var existingReturns = await _context.PurchaseReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted)
            .Select(r => r.DebitNoteNumber)
            .ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingReturns, StringComparer.OrdinalIgnoreCase);

        var errors = new List<BulkImportRowError>();
        var createdReturnIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        decimal totalReturnAmount = 0m;

        for (int i = 0; i < request.Returns.Count; i++)
        {
            var row = request.Returns[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.DebitNoteNumber))
            {
                errors.Add(new BulkImportRowError(rowIndex, $"ROW-{rowIndex}", "Debit Note / Return Number is required."));
                continue;
            }

            var dnNum = row.DebitNoteNumber.Trim();
            if (existingSet.Contains(dnNum))
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var suppName = (row.SupplierName ?? "").Trim();
            if (string.IsNullOrWhiteSpace(suppName)) suppName = "General Supplier";

            Party? supplier = null;
            if (!string.IsNullOrWhiteSpace(row.SupplierGstin))
            {
                supplier = suppliers.FirstOrDefault(c => string.Equals(c.GSTIN, row.SupplierGstin.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (supplier == null && !string.IsNullOrWhiteSpace(row.SupplierMobile))
            {
                supplier = suppliers.FirstOrDefault(c => string.Equals(c.Mobile, row.SupplierMobile.Trim(), StringComparison.OrdinalIgnoreCase));
            }
            if (supplier == null)
            {
                supplier = suppliers.FirstOrDefault(c => string.Equals(c.LegalName, suppName, StringComparison.OrdinalIgnoreCase) ||
                                                         string.Equals(c.TradeName, suppName, StringComparison.OrdinalIgnoreCase));
            }

            if (supplier == null)
            {
                supplier = new Party
                {
                    TenantId = tenantId,
                    Code = $"SUPP-MIG-{rowIndex:D4}",
                    LegalName = suppName,
                    TradeName = suppName,
                    PartyType = PartyType.Supplier,
                    Mobile = row.SupplierMobile?.Trim(),
                    GSTIN = row.SupplierGstin?.Trim(),
                    IsActive = true
                };
                _context.Parties.Add(supplier);
                suppliers.Add(supplier);
            }

            DateTime returnDateUtc = DateTime.SpecifyKind(row.ReturnDate, DateTimeKind.Utc);
            var taxable = Math.Abs(row.TaxableAmount);
            var gst = Math.Abs(row.GstAmount);
            var total = Math.Abs(row.TotalAmount);
            if (total == 0m && taxable > 0m) total = taxable + gst;
            if (taxable == 0m && total > 0m) taxable = Math.Round(total / 1.18m, 2);
            if (gst == 0m) gst = total - taxable;

            // Check if original purchase bill exists
            Guid? origBillId = null;
            if (!string.IsNullOrWhiteSpace(row.OriginalPurchaseBillNumber))
            {
                var origBill = await _context.PurchaseBills
                    .FirstOrDefaultAsync(pb => pb.TenantId == tenantId && pb.BillNumber == row.OriginalPurchaseBillNumber.Trim() && !pb.IsDeleted, cancellationToken);
                if (origBill != null) origBillId = origBill.Id;
            }

            var purchaseReturn = new PurchaseReturn
            {
                TenantId = tenantId,
                DebitNoteNumber = dnNum,
                ReturnDate = returnDateUtc,
                OriginalPurchaseBillId = origBillId,
                OriginalBillNumber = row.OriginalPurchaseBillNumber?.Trim(),
                Party = supplier,
                SupplierName = suppName,
                BranchId = branchId.Value,
                WarehouseId = warehouseId.Value,
                ReturnReason = string.IsNullOrWhiteSpace(row.ReturnReason) ? "Vendor Return" : row.ReturnReason.Trim(),
                SubTotal = taxable,
                TaxAmount = gst,
                TotalAmount = total,
                Notes = row.Notes?.Trim()
            };

            var returnItem = new PurchaseReturnItem
            {
                TenantId = tenantId,
                PurchaseReturn = purchaseReturn,
                Item = defaultItem,
                ItemName = string.IsNullOrWhiteSpace(row.ItemsSummary) ? defaultItem.Name : row.ItemsSummary.Trim(),
                ItemSku = defaultItem.Sku,
                ReturnQuantity = 1m,
                UnitPrice = taxable,
                TaxableAmount = taxable,
                GstRate = taxable > 0 ? Math.Round((gst / taxable) * 100m, 2) : 18m,
                TotalAmount = total
            };
            purchaseReturn.Items.Add(returnItem);

            _context.PurchaseReturns.Add(purchaseReturn);
            existingSet.Add(dnNum);

            // Party Ledger Debit Note Entry (Debiting supplier's account to reduce payable balance)
            var debitEntry = new PartyLedgerEntry
            {
                TenantId = tenantId,
                Party = supplier,
                TransactionDate = returnDateUtc,
                EntryType = PartyLedgerEntryType.DebitNote,
                DebitAmount = total,
                CreditAmount = 0m,
                RunningBalance = total,
                ReferenceDocumentType = "PurchaseReturn",
                ReferenceDocumentId = purchaseReturn.Id,
                ReferenceDocumentNumber = dnNum,
                PaymentMode = row.RefundMode ?? "Debit Note",
                Description = $"Purchase Return / Debit Note #{dnNum} {(string.IsNullOrWhiteSpace(row.OriginalPurchaseBillNumber) ? "" : "against Bill #" + row.OriginalPurchaseBillNumber)}"
            };
            _context.PartyLedgerEntries.Add(debitEntry);

            createdReturnIds.Add(purchaseReturn.Id.ToString());
            successCount++;
            totalReturnAmount += total;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportPurchaseReturns",
            EntityName = "PurchaseReturn",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, TotalReturnAmount = totalReturnAmount, ErrorsCount = errors.Count })
        }, cancellationToken);

        return Result<BulkPurchaseReturnImportResult>.Success(new BulkPurchaseReturnImportResult(
            request.Returns.Count,
            successCount,
            errors.Count,
            skippedCount,
            totalReturnAmount,
            errors,
            createdReturnIds
        ));
    }
}

