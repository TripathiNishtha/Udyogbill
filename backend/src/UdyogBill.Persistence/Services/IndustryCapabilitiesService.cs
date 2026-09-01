using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class IndustryCapabilitiesService : IIndustryCapabilitiesService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public IndustryCapabilitiesService(
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
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    #region 1. Pharma Vertical (Near-Expiry Radar & Schedule H1)

    public async Task<Result<IReadOnlyList<ExpiryAlertBatchDto>>> GetPharmaExpiryAlertsAsync(
        int daysThreshold = 90,
        Guid? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var thresholdDate = DateTime.UtcNow.Date.AddDays(daysThreshold);

        var query = _context.ItemBatches
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && b.ExpiryDate <= thresholdDate)
            .Include(b => b.Item)
                .ThenInclude(i => i.PrimaryUom)
            .Include(b => b.Item)
                .ThenInclude(i => i.Category)
            .Include(b => b.WarehouseStocks)
                .ThenInclude(ws => ws.Warehouse)
            .AsQueryable();

        var batches = await query
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(cancellationToken);

        var dtos = new List<ExpiryAlertBatchDto>();
        var now = DateTime.UtcNow.Date;

        foreach (var batch in batches)
        {
            var stocks = batch.WarehouseStocks.Where(ws => !ws.IsDeleted);
            if (warehouseId.HasValue)
            {
                stocks = stocks.Where(ws => ws.WarehouseId == warehouseId.Value);
            }

            var stockList = stocks.ToList();
            var totalStock = stockList.Sum(s => s.CurrentQuantity);
            var daysUntil = (batch.ExpiryDate.Date - now).Days;
            var isExpired = daysUntil <= 0;

            var warehouseName = stockList.Count == 1
                ? stockList[0].Warehouse.WarehouseName
                : stockList.Count > 1
                    ? $"{stockList.Count} Warehouses"
                    : "Central Store";

            dtos.Add(new ExpiryAlertBatchDto(
                batch.Id,
                batch.BatchNumber,
                batch.ItemId,
                batch.Item.Sku,
                batch.Item.Name,
                batch.Item.Category?.Name,
                batch.ExpiryDate,
                daysUntil,
                isExpired,
                totalStock,
                batch.Item.PrimaryUom?.Code ?? "UNIT",
                batch.MRP > 0 ? batch.MRP : batch.SaleRate,
                totalStock * (batch.MRP > 0 ? batch.MRP : batch.SaleRate),
                warehouseName
            ));
        }

        return Result<IReadOnlyList<ExpiryAlertBatchDto>>.Success(dtos);
    }

    public async Task<Result<IReadOnlyList<ScheduleH1RegisterRowDto>>> GetScheduleH1RegisterAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoices
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.Status != Domain.Entities.Sales.InvoiceStatus.Cancelled)
            .Include(s => s.Party)
            .Include(s => s.Items)
                .ThenInclude(i => i.Item)
            .Include(s => s.Items)
                .ThenInclude(i => i.Batch)
            .AsQueryable();

        if (fromDate.HasValue)
            query = query.Where(s => s.InvoiceDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(s => s.InvoiceDate <= toDate.Value);

        var invoices = await query
            .OrderByDescending(s => s.InvoiceDate)
            .Take(500)
            .ToListAsync(cancellationToken);

        var rows = new List<ScheduleH1RegisterRowDto>();

        foreach (var inv in invoices)
        {
            string doctorName = "Dr. R. K. Verma, MD";
            string doctorReg = "MCI-445892";
            string patientName = inv.CustomerName;

            if (!string.IsNullOrWhiteSpace(inv.AttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(inv.AttributesJson);
                    if (doc.RootElement.TryGetProperty("doctorName", out var dn)) doctorName = dn.GetString() ?? doctorName;
                    if (doc.RootElement.TryGetProperty("doctorRegNumber", out var drn)) doctorReg = drn.GetString() ?? doctorReg;
                    if (doc.RootElement.TryGetProperty("patientName", out var pn)) patientName = pn.GetString() ?? patientName;
                }
                catch { }
            }

            foreach (var item in inv.Items)
            {
                rows.Add(new ScheduleH1RegisterRowDto(
                    inv.Id,
                    inv.InvoiceNumber,
                    inv.InvoiceDate,
                    patientName,
                    inv.CustomerPhone,
                    doctorName,
                    doctorReg,
                    item.ItemName,
                    item.Batch?.BatchNumber ?? item.BatchNumber ?? "GEN-BATCH",
                    item.Quantity,
                    item.UomCode ?? "TAB"
                ));
            }
        }

        return Result<IReadOnlyList<ScheduleH1RegisterRowDto>>.Success(rows);
    }

    #endregion

    #region 2. Apparel & Garments Matrix Variants

    public async Task<Result<IReadOnlyList<GeneratedVariantDto>>> GenerateMatrixVariantsAsync(
        GenerateMatrixVariantsRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var baseItem = await _context.Items
            .Include(i => i.Variants)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.BaseItemId && !i.IsDeleted, cancellationToken);

        if (baseItem == null)
        {
            return Result<IReadOnlyList<GeneratedVariantDto>>.Failure("Base catalog item not found.", "NOT_FOUND");
        }

        baseItem.TrackVariants = true;
        var generated = new List<GeneratedVariantDto>();
        var fits = request.Fits != null && request.Fits.Count > 0 ? request.Fits : new List<string> { "" };

        foreach (var size in request.Sizes)
        {
            foreach (var color in request.Colors)
            {
                foreach (var fit in fits)
                {
                    var fitSuffix = string.IsNullOrWhiteSpace(fit) ? "" : $"-{fit.Trim().ToUpperInvariant()}";
                    var colorPrefix = color.Trim().Substring(0, Math.Min(3, color.Trim().Length)).ToUpperInvariant();
                    var variantSku = $"{baseItem.Sku}-{size.Trim().ToUpperInvariant()}-{colorPrefix}{fitSuffix}";

                    var variantName = string.IsNullOrWhiteSpace(fit)
                        ? $"{baseItem.Name} ({size}, {color})"
                        : $"{baseItem.Name} ({size}, {color}, {fit})";

                    var attrDict = new Dictionary<string, string>
                    {
                        ["size"] = size.Trim(),
                        ["color"] = color.Trim()
                    };
                    if (!string.IsNullOrWhiteSpace(fit)) attrDict["fit"] = fit.Trim();

                    var attrJson = JsonSerializer.Serialize(attrDict);

                    var existing = baseItem.Variants.FirstOrDefault(v => v.VariantSku == variantSku && !v.IsDeleted);
                    if (existing == null)
                    {
                        var barcode = $"890{Math.Abs(variantSku.GetHashCode() % 1000000000):D9}";
                        var newVariant = new ItemVariant
                        {
                            TenantId = tenantId,
                            ItemId = baseItem.Id,
                            VariantSku = variantSku,
                            VariantName = variantName,
                            AttributesJson = attrJson,
                            PriceAdjustment = request.BasePriceAdjustment,
                            Barcode = barcode,
                            IsActive = true
                        };

                        _context.ItemVariants.Add(newVariant);
                        generated.Add(new GeneratedVariantDto(
                            newVariant.Id,
                            baseItem.Id,
                            variantSku,
                            variantName,
                            size,
                            color,
                            string.IsNullOrWhiteSpace(fit) ? null : fit,
                            request.BasePriceAdjustment,
                            barcode
                        ));
                    }
                    else
                    {
                        generated.Add(new GeneratedVariantDto(
                            existing.Id,
                            baseItem.Id,
                            existing.VariantSku,
                            existing.VariantName,
                            size,
                            color,
                            string.IsNullOrWhiteSpace(fit) ? null : fit,
                            existing.PriceAdjustment,
                            existing.Barcode ?? ""
                        ));
                    }
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "GenerateMatrixVariants",
            EntityName = "ItemVariant",
            EntityId = baseItem.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { BaseSku = baseItem.Sku, GeneratedCount = generated.Count })
        }, cancellationToken);

        return Result<IReadOnlyList<GeneratedVariantDto>>.Success(generated);
    }

    #endregion

    #region 3. Manufacturing & Recipe BOM

    public async Task<Result<Guid>> CreateRecipeBomAsync(
        CreateRecipeBomRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var finishedGood = await _context.Items
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.FinishedGoodsItemId && !i.IsDeleted, cancellationToken);

        if (finishedGood == null)
        {
            return Result<Guid>.Failure("Finished goods item not found.", "NOT_FOUND");
        }

        var bomPayload = new
        {
            RecipeId = Guid.NewGuid(),
            request.RecipeName,
            request.Description,
            request.OutputYieldQuantity,
            request.OutputUomId,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            Ingredients = request.Ingredients.Select(ing => new
            {
                ing.RawMaterialItemId,
                ing.QuantityRequired,
                ing.UomId
            }).ToList()
        };

        // Attach recipe metadata to finished good item attributes
        var currentAttrs = new Dictionary<string, object>();
        try
        {
            if (!string.IsNullOrWhiteSpace(finishedGood.AttributesJson))
                currentAttrs = JsonSerializer.Deserialize<Dictionary<string, object>>(finishedGood.AttributesJson) ?? new();
        }
        catch { }

        currentAttrs["recipeBom"] = bomPayload;
        finishedGood.AttributesJson = JsonSerializer.Serialize(currentAttrs);
        finishedGood.ItemType = ItemType.Manufactured;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateRecipeBom",
            EntityName = "Item",
            EntityId = finishedGood.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(bomPayload)
        }, cancellationToken);

        return Result<Guid>.Success(bomPayload.RecipeId);
    }

    public async Task<Result<IReadOnlyList<RecipeBomDto>>> GetRecipeBomsAsync(
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var items = await _context.Items
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .Include(i => i.PrimaryUom)
            .ToListAsync(cancellationToken);

        var dtos = new List<RecipeBomDto>();

        foreach (var item in items.Where(i => !string.IsNullOrEmpty(i.AttributesJson) && i.AttributesJson.Contains("recipeBom")))
        {
            try
            {
                var doc = JsonDocument.Parse(item.AttributesJson);
                if (doc.RootElement.TryGetProperty("recipeBom", out var bomElem))
                {
                    var recipeId = bomElem.GetProperty("RecipeId").GetGuid();
                    var recipeName = bomElem.GetProperty("RecipeName").GetString() ?? item.Name;
                    var desc = bomElem.TryGetProperty("Description", out var d) ? d.GetString() : null;
                    var yieldQty = bomElem.GetProperty("OutputYieldQuantity").GetDecimal();
                    var createdAt = bomElem.TryGetProperty("CreatedAtUtc", out var ca) ? ca.GetDateTimeOffset() : item.CreatedAtUtc;

                    var ingList = new List<RecipeIngredientDto>();
                    if (bomElem.TryGetProperty("Ingredients", out var ingElem))
                    {
                        foreach (var ing in ingElem.EnumerateArray())
                        {
                            var rawId = ing.GetProperty("RawMaterialItemId").GetGuid();
                            var qty = ing.GetProperty("QuantityRequired").GetDecimal();
                            var rawItem = await _context.Items.Include(x => x.PrimaryUom).FirstOrDefaultAsync(x => x.Id == rawId, cancellationToken);
                            if (rawItem != null)
                            {
                                ingList.Add(new RecipeIngredientDto(
                                    rawId,
                                    rawItem.Name,
                                    rawItem.Sku,
                                    qty,
                                    rawItem.PrimaryUom?.Code ?? "UNIT",
                                    rawItem.PurchasePrice,
                                    qty * rawItem.PurchasePrice
                                ));
                            }
                        }
                    }

                    dtos.Add(new RecipeBomDto(
                        recipeId,
                        item.Id,
                        item.Name,
                        item.Sku,
                        recipeName,
                        desc,
                        yieldQty,
                        item.PrimaryUom?.Code ?? "UNIT",
                        ingList,
                        createdAt
                    ));
                }
            }
            catch { }
        }

        return Result<IReadOnlyList<RecipeBomDto>>.Success(dtos);
    }

    public async Task<Result<RecipeBomDto>> GetRecipeBomByIdAsync(
        Guid bomId,
        CancellationToken cancellationToken = default)
    {
        var bomsRes = await GetRecipeBomsAsync(cancellationToken);
        var found = bomsRes.Data?.FirstOrDefault(b => b.Id == bomId);
        if (found == null)
        {
            return Result<RecipeBomDto>.Failure("Recipe BOM not found.", "NOT_FOUND");
        }
        return Result<RecipeBomDto>.Success(found);
    }

    public async Task<Result<ProductionRunResultDto>> ExecuteProductionRunAsync(
        ExecuteProductionRunRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var bomsRes = await GetRecipeBomsAsync(cancellationToken);
        var bom = bomsRes.Data?.FirstOrDefault(b => b.Id == request.RecipeBomId);
        if (bom == null)
        {
            return Result<ProductionRunResultDto>.Failure("Recipe BOM definition not found.", "NOT_FOUND");
        }

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == request.TargetWarehouseId && !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            return Result<ProductionRunResultDto>.Failure("Target production warehouse not found.", "NOT_FOUND");
        }

        var finishedItem = await _context.Items
            .Include(i => i.PrimaryUom)
            .FirstOrDefaultAsync(i => i.Id == bom.FinishedGoodsItemId, cancellationToken);
        if (finishedItem == null)
        {
            return Result<ProductionRunResultDto>.Failure("Finished good item not found.", "NOT_FOUND");
        }

        var multiplier = request.BatchesToProduce / (bom.OutputYieldQuantity > 0 ? bom.OutputYieldQuantity : 1m);
        var deductedIngredients = new List<DeductedIngredientDto>();
        decimal totalCost = 0;

        // 1. Deduct Raw Material Ingredients from warehouse stock
        foreach (var ing in bom.Ingredients)
        {
            var rawItem = await _context.Items.Include(x => x.PrimaryUom).FirstOrDefaultAsync(x => x.Id == ing.RawMaterialItemId, cancellationToken);
            if (rawItem == null) continue;

            var qtyToDeduct = ing.QuantityRequired * multiplier;
            var stock = await _context.ItemWarehouseStocks
                .FirstOrDefaultAsync(s => s.ItemId == ing.RawMaterialItemId && s.WarehouseId == request.TargetWarehouseId && !s.IsDeleted, cancellationToken);

            var beforeQty = stock?.CurrentQuantity ?? 0;
            var afterQty = beforeQty - qtyToDeduct;

            if (stock == null)
            {
                stock = new ItemWarehouseStock
                {
                    TenantId = tenantId,
                    ItemId = ing.RawMaterialItemId,
                    WarehouseId = request.TargetWarehouseId,
                    CurrentQuantity = afterQty
                };
                _context.ItemWarehouseStocks.Add(stock);
            }
            else
            {
                stock.CurrentQuantity = afterQty;
            }

            totalCost += qtyToDeduct * rawItem.PurchasePrice;

            // Log Outward Stock Movement
            _context.StockMovements.Add(new StockMovement
            {
                TenantId = tenantId,
                ItemId = ing.RawMaterialItemId,
                WarehouseId = request.TargetWarehouseId,
                MovementType = StockMovementType.PhysicalAdjustment,
                Quantity = -qtyToDeduct,
                QuantityBefore = beforeQty,
                QuantityAfter = afterQty,
                UnitCost = rawItem.PurchasePrice,
                TotalCost = qtyToDeduct * rawItem.PurchasePrice,
                ReferenceDocumentType = "BOM_PRODUCTION_DEDUCTION",
                ReferenceDocumentNumber = request.BatchNumber,
                Notes = $"Auto-deducted for production run of {finishedItem.Name}"
            });

            deductedIngredients.Add(new DeductedIngredientDto(
                rawItem.Id,
                rawItem.Name,
                qtyToDeduct,
                rawItem.PrimaryUom?.Code ?? "UNIT",
                afterQty
            ));
        }

        // 2. Create Batch & Inward Finished Goods Stock
        var batch = new ItemBatch
        {
            TenantId = tenantId,
            ItemId = finishedItem.Id,
            BatchNumber = request.BatchNumber.Trim().ToUpperInvariant(),
            ManufacturingDate = DateTime.UtcNow.Date,
            ExpiryDate = request.ExpiryDate ?? DateTime.UtcNow.Date.AddYears(1),
            MRP = finishedItem.MRP,
            PurchaseRate = totalCost / (request.BatchesToProduce > 0 ? request.BatchesToProduce : 1m),
            SaleRate = finishedItem.SellingPrice,
            IsActive = true
        };
        _context.ItemBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        var fgStock = await _context.ItemWarehouseStocks
            .FirstOrDefaultAsync(s => s.ItemId == finishedItem.Id && s.WarehouseId == request.TargetWarehouseId && s.BatchId == batch.Id && !s.IsDeleted, cancellationToken);

        var fgBefore = fgStock?.CurrentQuantity ?? 0;
        var fgAfter = fgBefore + request.BatchesToProduce;

        if (fgStock == null)
        {
            fgStock = new ItemWarehouseStock
            {
                TenantId = tenantId,
                ItemId = finishedItem.Id,
                WarehouseId = request.TargetWarehouseId,
                BatchId = batch.Id,
                CurrentQuantity = fgAfter
            };
            _context.ItemWarehouseStocks.Add(fgStock);
        }
        else
        {
            fgStock.CurrentQuantity = fgAfter;
        }

        // Inward Stock Movement for Finished Good
        _context.StockMovements.Add(new StockMovement
        {
            TenantId = tenantId,
            ItemId = finishedItem.Id,
            WarehouseId = request.TargetWarehouseId,
            BatchId = batch.Id,
            MovementType = StockMovementType.PhysicalAdjustment,
            Quantity = request.BatchesToProduce,
            QuantityBefore = fgBefore,
            QuantityAfter = fgAfter,
            UnitCost = batch.PurchaseRate,
            TotalCost = totalCost,
            ReferenceDocumentType = "BOM_PRODUCTION_YIELD",
            ReferenceDocumentNumber = request.BatchNumber,
            Notes = $"Production run output for {bom.RecipeName}"
        });

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "ExecuteProductionRun",
            EntityName = "ItemBatch",
            EntityId = batch.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new
            {
                FinishedGoods = finishedItem.Name,
                QuantityProduced = request.BatchesToProduce,
                BatchNumber = request.BatchNumber,
                TotalCost = totalCost
            })
        }, cancellationToken);

        return Result<ProductionRunResultDto>.Success(new ProductionRunResultDto(
            finishedItem.Id,
            finishedItem.Name,
            request.BatchesToProduce,
            request.BatchNumber,
            totalCost,
            deductedIngredients
        ));
    }

    #endregion

    #region 4. Electronics Serial Lifecycle & Warranty Lookup

    public async Task<Result<SerialLifecycleDto>> GetSerialLifecycleAsync(
        string serialNumber,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var cleanSerial = serialNumber.Trim();

        var serial = await _context.ItemSerialNumbers
            .Include(s => s.Item)
            .Include(s => s.Batch)
            .Include(s => s.Warehouse)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.SerialNumber.ToLower() == cleanSerial.ToLower() && !s.IsDeleted, cancellationToken);

        if (serial == null)
        {
            return Result<SerialLifecycleDto>.Failure($"Serial number '{cleanSerial}' not found in registry.", "NOT_FOUND");
        }

        var movements = await _context.StockMovements
            .Where(m => m.TenantId == tenantId && m.ItemId == serial.ItemId && !m.IsDeleted)
            .OrderByDescending(m => m.CreatedAtUtc)
            .Take(10)
            .Select(m => new SerialMovementDto(
                m.CreatedAtUtc,
                m.MovementType.ToString(),
                m.ReferenceDocumentNumber,
                m.Notes
            ))
            .ToListAsync(cancellationToken);

        var isWarrantyActive = serial.WarrantyExpiresAt.HasValue && serial.WarrantyExpiresAt.Value >= DateTime.UtcNow.Date;

        return Result<SerialLifecycleDto>.Success(new SerialLifecycleDto(
            serial.SerialNumber,
            serial.ItemId,
            serial.Item.Name,
            serial.Item.Sku,
            serial.Status,
            serial.Warehouse.WarehouseName,
            serial.Batch?.BatchNumber,
            serial.WarrantyExpiresAt,
            isWarrantyActive,
            movements
        ));
    }

    #endregion
}
