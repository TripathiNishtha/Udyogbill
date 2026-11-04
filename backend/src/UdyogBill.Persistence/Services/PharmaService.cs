using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Application.Services.Pharma;
using UdyogBill.Shared;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Pharma;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Persistence.Services;

public class PharmaService : IPharmaService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<PharmaService> _logger;

    public PharmaService(
        AppDbContext context,
        ITenantContext tenantContext,
        ILogger<PharmaService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private Guid TenantId => _tenantContext.TenantId;

    public static (decimal Ptr, decimal Pts) DerivePharmaPricing(
        decimal mrp,
        decimal gstRate,
        decimal userPtr = 0,
        decimal userPts = 0,
        decimal retailerMargin = 0.20m,
        decimal stockistMargin = 0.10m)
    {
        decimal ptr;
        if (userPtr > 0)
        {
            ptr = userPtr;
        }
        else if (mrp > 0)
        {
            // Standard commercial back-calculation from inclusive MRP:
            // PTR = (MRP * (1 - retailerMargin)) / (1 + gstRate/100)
            var taxDivisor = 1m + (Math.Max(0m, gstRate) / 100m);
            ptr = Math.Round((mrp * (1m - retailerMargin)) / (taxDivisor > 0 ? taxDivisor : 1m), 2);
        }
        else
        {
            ptr = 0m;
        }

        decimal pts;
        if (userPts > 0)
        {
            pts = userPts;
        }
        else if (ptr > 0)
        {
            // Standard Stockist price: PTS = PTR * (1 - stockistMargin)
            pts = Math.Round(ptr * (1m - stockistMargin), 2);
        }
        else
        {
            pts = 0m;
        }

        return (ptr, pts);
    }

    #region 1. Batch & FEFO Routing

    public async Task<Result<IReadOnlyList<PharmaBatchDto>>> GetItemBatchesAsync(
        Guid? itemId,
        bool includeExpired,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ItemBatches
            .Include(b => b.Item)
                .ThenInclude(i => i.PrimaryUom)
            .Include(b => b.Item)
                .ThenInclude(i => i.SecondaryUom)
            .Include(b => b.WarehouseStocks)
            .Where(b => b.TenantId == TenantId && b.IsActive);

        if (itemId.HasValue && itemId.Value != Guid.Empty)
        {
            query = query.Where(b => b.ItemId == itemId.Value);
        }

        if (!includeExpired)
        {
            query = query.Where(b => b.ExpiryDate >= DateTime.UtcNow.Date);
        }

        // FEFO (First Expiry, First Out)
        var batches = await query
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow.Date;
        var dtos = batches.Select(b =>
        {
            var days = (int)(b.ExpiryDate.Date - now).TotalDays;
            var isExpired = days < 0;
            var isNear = days >= 0 && days <= 90;
            var stock = b.WarehouseStocks.Sum(ws => ws.CurrentQuantity);
            var packRatio = (b.Item != null && b.Item.ConversionRatio.HasValue && b.Item.ConversionRatio.Value > 0)
                ? b.Item.ConversionRatio.Value
                : 10m; // Default 10 tablets per strip in Indian pharma
            var primaryUom = b.Item?.PrimaryUom?.Symbol ?? "STRIP";
            var secondaryUom = b.Item?.SecondaryUom?.Symbol ?? "TAB";
            var tabletPrice = Math.Round(b.SaleRate / (packRatio > 0 ? packRatio : 1m), 2);

            var itemTax = b.Item?.TaxRate ?? 12m;
            var (derivedPtr, derivedPts) = DerivePharmaPricing(b.MRP, itemTax, b.Ptr, b.Pts);

            return new PharmaBatchDto(
                Id: b.Id,
                ItemId: b.ItemId,
                ItemName: b.Item?.Name ?? "Unknown Drug",
                Sku: b.Item?.Sku ?? string.Empty,
                BatchNumber: b.BatchNumber,
                ExpiryDateMonthYear: b.ExpiryDate.ToString("MM/yy"),
                ExpiryDateUtc: b.ExpiryDate,
                ManufacturingDateUtc: b.ManufacturingDate,
                Mrp: b.MRP,
                PurchaseRate: b.PurchaseRate,
                SaleRate: b.SaleRate,
                Ptr: derivedPtr,
                Pts: derivedPts,
                CurrentStock: stock > 0 ? stock : 0,
                QuarantinedStock: b.QuarantinedStock,
                RackLocation: b.RackLocation ?? "General Rack",
                Barcode: b.Barcode,
                IsExpired: isExpired,
                IsNearExpiry: isNear,
                DaysToExpiry: days,
                IsQuarantined: b.IsQuarantined,
                PackRatio: packRatio,
                PrimaryUnit: primaryUom,
                SecondaryUnit: secondaryUom,
                UnitTabletPrice: tabletPrice
            );
        }).ToList();

        return Result<IReadOnlyList<PharmaBatchDto>>.Success(dtos);
    }

    public async Task<Result<PharmaBatchDto>> SaveBatchAsync(
        SavePharmaBatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.Id == request.ItemId && i.TenantId == TenantId, cancellationToken);

        if (item == null)
            return Result<PharmaBatchDto>.Failure("Item not found.", "NOT_FOUND");

        DateTime expiryDate = ParseExpiryDate(request.ExpiryDateMonthYear);
        var (batchPtr, batchPts) = DerivePharmaPricing(request.Mrp, item.TaxRate, request.Ptr, request.Pts);

        ItemBatch batch;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            batch = await _context.ItemBatches
                .FirstOrDefaultAsync(b => b.Id == request.Id.Value && b.TenantId == TenantId, cancellationToken);

            if (batch == null)
                return Result<PharmaBatchDto>.Failure("Batch not found.", "NOT_FOUND");

            batch.BatchNumber = request.BatchNumber.Trim();
            batch.ExpiryDate = expiryDate;
            batch.ManufacturingDate = request.ManufacturingDateUtc;
            batch.MRP = request.Mrp;
            batch.PurchaseRate = request.PurchaseRate;
            batch.SaleRate = request.SaleRate;
            batch.Ptr = batchPtr;
            batch.Pts = batchPts;
            batch.RackLocation = request.RackLocation?.Trim();
            batch.Barcode = request.Barcode?.Trim();
        }
        else
        {
            batch = new ItemBatch
            {
                TenantId = TenantId,
                ItemId = request.ItemId,
                BatchNumber = request.BatchNumber.Trim(),
                ExpiryDate = expiryDate,
                ManufacturingDate = request.ManufacturingDateUtc,
                MRP = request.Mrp,
                PurchaseRate = request.PurchaseRate,
                SaleRate = request.SaleRate,
                Ptr = batchPtr,
                Pts = batchPts,
                RackLocation = request.RackLocation?.Trim(),
                Barcode = request.Barcode?.Trim(),
                IsActive = true
            };
            _context.ItemBatches.Add(batch);
            await _context.SaveChangesAsync(cancellationToken);

            // Add opening stock if warehouse exists
            if (request.OpeningStock > 0)
            {
                var defaultWarehouse = await _context.TenantWarehouses
                    .FirstOrDefaultAsync(w => w.TenantId == TenantId && w.IsActive, cancellationToken);

                if (defaultWarehouse != null)
                {
                    var stockEntry = new ItemWarehouseStock
                    {
                        TenantId = TenantId,
                        ItemId = request.ItemId,
                        WarehouseId = defaultWarehouse.Id,
                        BatchId = batch.Id,
                        CurrentQuantity = request.OpeningStock
                    };
                    _context.ItemWarehouseStocks.Add(stockEntry);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var days = (int)(batch.ExpiryDate.Date - DateTime.UtcNow.Date).TotalDays;
        var packRatio = (item.ConversionRatio.HasValue && item.ConversionRatio.Value > 0)
            ? item.ConversionRatio.Value
            : 10m;
        var tabletPrice = Math.Round(batch.SaleRate / (packRatio > 0 ? packRatio : 1m), 2);

        var dto = new PharmaBatchDto(
            Id: batch.Id,
            ItemId: batch.ItemId,
            ItemName: item.Name,
            Sku: item.Sku,
            BatchNumber: batch.BatchNumber,
            ExpiryDateMonthYear: batch.ExpiryDate.ToString("MM/yy"),
            ExpiryDateUtc: batch.ExpiryDate,
            ManufacturingDateUtc: batch.ManufacturingDate,
            Mrp: batch.MRP,
            PurchaseRate: batch.PurchaseRate,
            SaleRate: batch.SaleRate,
            Ptr: batch.Ptr,
            Pts: batch.Pts,
            CurrentStock: request.OpeningStock,
            QuarantinedStock: batch.QuarantinedStock,
            RackLocation: batch.RackLocation,
            Barcode: batch.Barcode,
            IsExpired: days < 0,
            IsNearExpiry: days >= 0 && days <= 90,
            DaysToExpiry: days,
            IsQuarantined: batch.IsQuarantined,
            PackRatio: packRatio,
            PrimaryUnit: "STRIP",
            SecondaryUnit: "TAB",
            UnitTabletPrice: tabletPrice
        );

        return Result<PharmaBatchDto>.Success(dto);
    }

    public async Task<Result<PharmaDashboardSummaryDto>> GetPharmaDashboardMetricsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow.Date;
        var in30Days = now.AddDays(30);
        var in60Days = now.AddDays(60);
        var in90Days = now.AddDays(90);

        var batches = await _context.ItemBatches
            .Include(b => b.WarehouseStocks)
            .Where(b => b.TenantId == TenantId && b.IsActive)
            .ToListAsync(cancellationToken);

        int count30 = 0;
        int count60 = 0;
        int count90 = 0;
        decimal totalLossVal = 0m;
        int quarantinedCount = 0;

        foreach (var b in batches)
        {
            var stock = b.WarehouseStocks.Sum(ws => ws.CurrentQuantity);
            if (b.IsQuarantined || b.QuarantinedStock > 0)
            {
                quarantinedCount++;
            }

            if (stock > 0)
            {
                if (b.ExpiryDate <= in30Days)
                {
                    count30++;
                    totalLossVal += (stock * (b.PurchaseRate > 0 ? b.PurchaseRate : b.SaleRate));
                }
                else if (b.ExpiryDate <= in60Days)
                {
                    count60++;
                    totalLossVal += (stock * (b.PurchaseRate > 0 ? b.PurchaseRate : b.SaleRate));
                }
                else if (b.ExpiryDate <= in90Days)
                {
                    count90++;
                    totalLossVal += (stock * (b.PurchaseRate > 0 ? b.PurchaseRate : b.SaleRate));
                }
            }
        }

        // H1 dispensed today
        var startOfToday = DateTime.UtcNow.Date;
        var endOfToday = startOfToday.AddDays(1);
        var h1Count = await _context.ScheduleH1RegisterEntries
            .Where(r => r.TenantId == TenantId && r.SupplyDate >= startOfToday && r.SupplyDate < endOfToday)
            .CountAsync(cancellationToken);

        var doctorsCount = await _context.DoctorPrescribers
            .Where(d => d.TenantId == TenantId && !d.IsDeleted && d.IsActive)
            .CountAsync(cancellationToken);

        var summary = new PharmaDashboardSummaryDto(
            ExpiringCount30Days: count30,
            ExpiringCount60Days: count60,
            ExpiringCount90Days: count90,
            ExpiringStockValue: Math.Round(totalLossVal, 2),
            ScheduleH1DispensedToday: h1Count,
            QuarantinedBatchesCount: quarantinedCount,
            ActiveBatchesCount: batches.Count,
            RegisteredDoctorsCount: doctorsCount
        );

        return Result<PharmaDashboardSummaryDto>.Success(summary);
    }

    #endregion

    #region 2. Generic Salt Formulations & Substitute Finder

    public async Task<Result<IReadOnlyList<SaltMasterDto>>> GetSaltsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var existingCount = await _context.SaltMasters.CountAsync(s => s.TenantId == TenantId && !s.IsDeleted, cancellationToken);
        if (existingCount == 0)
        {
            var defaultSalts = GetStandardPharmaSalts(TenantId);
            _context.SaltMasters.AddRange(defaultSalts);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var query = _context.SaltMasters
            .Where(s => s.TenantId == TenantId && !s.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.SaltName.ToLower().Contains(term) || s.TherapeuticCategory.ToLower().Contains(term));
        }

        var salts = await query
            .OrderBy(s => s.SaltName)
            .Select(s => new SaltMasterDto(
                s.Id,
                s.SaltName,
                s.TherapeuticCategory,
                s.Description,
                s.SideEffectsAlert,
                s.IsHabitForming
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SaltMasterDto>>.Success(salts);
    }

    public async Task<Result<SaltMasterDto>> SaveSaltAsync(
        SaveSaltMasterRequest request,
        CancellationToken cancellationToken = default)
    {
        SaltMaster salt;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            salt = await _context.SaltMasters
                .FirstOrDefaultAsync(s => s.Id == request.Id.Value && s.TenantId == TenantId, cancellationToken);

            if (salt == null)
                return Result<SaltMasterDto>.Failure("Salt formula not found.", "NOT_FOUND");

            salt.SaltName = request.SaltName.Trim();
            salt.TherapeuticCategory = request.TherapeuticCategory.Trim();
            salt.Description = request.Description?.Trim();
            salt.SideEffectsAlert = request.SideEffectsAlert?.Trim();
            salt.IsHabitForming = request.IsHabitForming;
        }
        else
        {
            salt = new SaltMaster
            {
                TenantId = TenantId,
                SaltName = request.SaltName.Trim(),
                TherapeuticCategory = request.TherapeuticCategory.Trim(),
                Description = request.Description?.Trim(),
                SideEffectsAlert = request.SideEffectsAlert?.Trim(),
                IsHabitForming = request.IsHabitForming
            };
            _context.SaltMasters.Add(salt);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<SaltMasterDto>.Success(new SaltMasterDto(
            salt.Id,
            salt.SaltName,
            salt.TherapeuticCategory,
            salt.Description,
            salt.SideEffectsAlert,
            salt.IsHabitForming
        ));
    }

    public async Task<Result<IReadOnlyList<ItemSubstituteDto>>> FindSaltSubstitutesAsync(
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        // 1. Find all salts for this drug
        var salts = await _context.ItemSaltCompositions
            .Where(c => c.ItemId == itemId && c.TenantId == TenantId && !c.IsDeleted)
            .Select(c => c.SaltId)
            .ToListAsync(cancellationToken);

        if (salts.Count == 0)
        {
            return Result<IReadOnlyList<ItemSubstituteDto>>.Success(new List<ItemSubstituteDto>());
        }

        // 2. Find other drugs that share ANY of these salts
        var candidateItemIds = await _context.ItemSaltCompositions
            .Where(c => c.TenantId == TenantId && !c.IsDeleted && salts.Contains(c.SaltId) && c.ItemId != itemId)
            .Select(c => c.ItemId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (candidateItemIds.Count == 0)
        {
            return Result<IReadOnlyList<ItemSubstituteDto>>.Success(new List<ItemSubstituteDto>());
        }

        // 3. Load drugs with active batches and salt names
        var items = await _context.Items
            .Include(i => i.Brand)
            .Include(i => i.Batches.Where(b => b.IsActive && b.ExpiryDate >= DateTime.UtcNow.Date))
                .ThenInclude(b => b.WarehouseStocks)
            .Where(i => candidateItemIds.Contains(i.Id) && i.TenantId == TenantId)
            .ToListAsync(cancellationToken);

        var saltNames = await _context.ItemSaltCompositions
            .Include(c => c.Salt)
            .Where(c => candidateItemIds.Contains(c.ItemId) && c.TenantId == TenantId)
            .ToListAsync(cancellationToken);

        var results = new List<ItemSubstituteDto>();

        foreach (var it in items)
        {
            var validBatches = it.Batches.OrderBy(b => b.ExpiryDate).ToList();
            var earliestBatch = validBatches.FirstOrDefault();
            var totalStock = validBatches.SelectMany(b => b.WarehouseStocks).Sum(ws => ws.CurrentQuantity);

            var compStr = string.Join(" + ", saltNames
                .Where(c => c.ItemId == it.Id)
                .Select(c => $"{c.Salt.SaltName} ({c.Strength})"));

            var pRate = earliestBatch?.PurchaseRate ?? it.PurchasePrice;
            var sRate = earliestBatch?.SaleRate ?? it.SellingPrice;
            var mrp = earliestBatch?.MRP ?? it.MRP;
            var margin = sRate > 0 ? Math.Round(((sRate - pRate) / sRate) * 100, 1) : 0;

            results.Add(new ItemSubstituteDto(
                ItemId: it.Id,
                ItemName: it.Name,
                Sku: it.Sku,
                Manufacturer: it.Brand?.ManufacturerName ?? it.Brand?.Name ?? "Standard Pharma",
                SaltComposition: string.IsNullOrWhiteSpace(compStr) ? "Identical Salt Composition" : compStr,
                Mrp: mrp,
                SaleRate: sRate,
                InStockQuantity: totalStock,
                EarliestExpiryBatch: earliestBatch?.BatchNumber ?? "N/A",
                EarliestExpiryDate: earliestBatch?.ExpiryDate.ToString("MM/yy") ?? "N/A",
                MarginPercent: margin,
                StorageCondition: "Cool & Dry Place"
            ));
        }

        // Order by In-stock first, then highest chemist margin
        var ordered = results.OrderByDescending(r => r.InStockQuantity > 0)
                             .ThenByDescending(r => r.MarginPercent)
                             .ToList();

        return Result<IReadOnlyList<ItemSubstituteDto>>.Success(ordered);
    }

    public async Task<Result<IReadOnlyList<ItemSubstituteDto>>> FindSaltSubstitutesByNameAsync(
        string saltName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(saltName))
            return Result<IReadOnlyList<ItemSubstituteDto>>.Success(new List<ItemSubstituteDto>());

        var term = saltName.Trim().ToLowerInvariant();
        var keywords = term.Split(new[] { '+', ',', '/', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                           .Where(k => k.Length > 2 && !char.IsDigit(k[0]))
                           .ToList();
        if (keywords.Count == 0) keywords.Add(term);

        var candidateItems = await _context.Items
            .Include(i => i.Brand)
            .Include(i => i.Batches.Where(b => b.IsActive && b.ExpiryDate >= DateTime.UtcNow.Date))
                .ThenInclude(b => b.WarehouseStocks)
            .Where(i => i.TenantId == TenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var matchedItems = candidateItems.Where(i =>
        {
            var name = i.Name?.ToLowerInvariant() ?? "";
            var attrs = i.AttributesJson?.ToLowerInvariant() ?? "";
            var desc = i.ShortDescription?.ToLowerInvariant() ?? "";
            return keywords.Any(k => name.Contains(k) || attrs.Contains(k) || desc.Contains(k));
        }).ToList();

        var results = new List<ItemSubstituteDto>();

        foreach (var it in matchedItems)
        {
            var validBatches = it.Batches.OrderBy(b => b.ExpiryDate).ToList();
            var earliestBatch = validBatches.FirstOrDefault();
            var totalStock = validBatches.SelectMany(b => b.WarehouseStocks).Sum(ws => ws.CurrentQuantity);

            var pRate = earliestBatch?.PurchaseRate ?? it.PurchasePrice;
            var sRate = earliestBatch?.SaleRate ?? it.SellingPrice;
            var mrp = earliestBatch?.MRP ?? it.MRP;
            var margin = sRate > 0 ? Math.Round(((sRate - pRate) / sRate) * 100, 1) : 0;

            var comp = "Identical Salt Composition";
            try
            {
                if (!string.IsNullOrWhiteSpace(it.AttributesJson))
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(it.AttributesJson);
                    if (doc.RootElement.TryGetProperty("drugComposition", out var prop))
                    {
                        var cVal = prop.GetString();
                        if (!string.IsNullOrWhiteSpace(cVal)) comp = cVal;
                    }
                }
            }
            catch {}

            results.Add(new ItemSubstituteDto(
                ItemId: it.Id,
                ItemName: it.Name,
                Sku: it.Sku,
                Manufacturer: it.Brand?.ManufacturerName ?? it.Brand?.Name ?? "Standard Pharma",
                SaltComposition: comp,
                Mrp: mrp,
                SaleRate: sRate,
                InStockQuantity: totalStock,
                EarliestExpiryBatch: earliestBatch?.BatchNumber ?? "N/A",
                EarliestExpiryDate: earliestBatch?.ExpiryDate.ToString("MM/yy") ?? "N/A",
                MarginPercent: margin,
                StorageCondition: "Cool & Dry Place"
            ));
        }

        var ordered = results.OrderByDescending(r => r.InStockQuantity > 0)
                             .ThenByDescending(r => r.MarginPercent)
                             .ToList();

        return Result<IReadOnlyList<ItemSubstituteDto>>.Success(ordered);
    }

    private static List<SaltMaster> GetStandardPharmaSalts(Guid tenantId)
    {
        return new List<SaltMaster>
        {
            new SaltMaster { TenantId = tenantId, SaltName = "Paracetamol 650mg", TherapeuticCategory = "Analgesic & Antipyretic", Description = "Fever, mild to moderate body pain, headache", SideEffectsAlert = "Do not exceed 4g/day. Caution in liver disease.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Amoxicillin + Potassium Clavulanate", TherapeuticCategory = "Broad-Spectrum Antibiotic", Description = "Bacterial infections of chest, ENT, skin, and urinary tract", SideEffectsAlert = "Complete full prescribed course. Take after food.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Pantoprazole 40mg", TherapeuticCategory = "Proton Pump Inhibitor (Antacid)", Description = "Acid reflux, GERD, gastric & peptic ulcer healing", SideEffectsAlert = "Take 30 minutes before morning breakfast.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Azithromycin 500mg", TherapeuticCategory = "Macrolide Antibiotic", Description = "Respiratory tract, sinus and skin bacterial infections", SideEffectsAlert = "Take 1 hour before or 2 hours after meals.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Cefixime 200mg", TherapeuticCategory = "Cephalosporin Antibiotic", Description = "Typhoid fever, pneumonia, urinary tract infections", SideEffectsAlert = "May cause loose stools. Maintain hydration.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Montelukast + Levocetirizine", TherapeuticCategory = "Antiallergic & Bronchodilator", Description = "Allergic rhinitis, seasonal allergies, asthma symptoms", SideEffectsAlert = "May cause mild drowsiness. Best taken at bedtime.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Aceclofenac + Paracetamol", TherapeuticCategory = "NSAID Pain Reliever", Description = "Musculoskeletal pain, joint inflammation, dental pain", SideEffectsAlert = "Always take with or after meals to prevent acidity.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Metformin 500mg", TherapeuticCategory = "Antidiabetic (Biguanide)", Description = "Type 2 Diabetes Mellitus blood glucose regulation", SideEffectsAlert = "Take with meals. Monitor kidney functions periodically.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Telmisartan 40mg", TherapeuticCategory = "Antihypertensive (ARB)", Description = "High blood pressure & cardiovascular protection", SideEffectsAlert = "Monitor BP regularly. Avoid sudden posture change.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Amlodipine 5mg", TherapeuticCategory = "Calcium Channel Blocker", Description = "Hypertension & chronic stable angina", SideEffectsAlert = "May cause mild ankle swelling (pedal edema).", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Atorvastatin 10mg", TherapeuticCategory = "Lipid Lowering Statin", Description = "Hypercholesterolemia & heart attack prevention", SideEffectsAlert = "Report unexplained muscle pain or weakness immediately.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Ibuprofen + Paracetamol", TherapeuticCategory = "Analgesic & Anti-inflammatory", Description = "Dental pain, joint stiffness, sprains and sports injuries", SideEffectsAlert = "Avoid in active peptic ulcer or renal impairment.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Ofloxacin + Ornidazole", TherapeuticCategory = "Antimicrobial & Antiprotozoal", Description = "Infectious bacterial and amoebic diarrhea & dysentery", SideEffectsAlert = "May leave a harmless metallic taste. Avoid alcohol.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Rabeprazole + Domperidone", TherapeuticCategory = "Antacid & Prokinetic", Description = "Severe hyperacidity accompanied by nausea and bloating", SideEffectsAlert = "Take on an empty stomach in the morning.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Cetirizine 10mg", TherapeuticCategory = "Second-Gen Antihistamine", Description = "Sneezing, runny nose, allergic conjunctivitis, skin hives", SideEffectsAlert = "Caution while driving if experiencing mild sedation.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Dextromethorphan + Chlorpheniramine", TherapeuticCategory = "Cough Suppressant", Description = "Dry, non-productive irritating throat cough", SideEffectsAlert = "Do not use for productive (wet) phlegm cough.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Ondansetron 4mg", TherapeuticCategory = "Antiemetic (5-HT3 Antagonist)", Description = "Chemotherapy, post-op or infectious nausea and vomiting", SideEffectsAlert = "Can cause mild transient headache or constipation.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Diclofenac + Paracetamol", TherapeuticCategory = "NSAID Analgesic", Description = "Acute trauma, orthopedic pain, post-surgical inflammation", SideEffectsAlert = "Do not combine with other NSAID painkillers.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "B-Complex + Zinc + Vitamin C", TherapeuticCategory = "Nutritional Supplement", Description = "Immunity booster, mouth ulcers, recovery after illness", SideEffectsAlert = "Best taken after the main afternoon meal.", IsHabitForming = false },
            new SaltMaster { TenantId = tenantId, SaltName = "Tramadol + Paracetamol", TherapeuticCategory = "Centrally Acting Opioid Analgesic", Description = "Moderate to severe acute painful conditions", SideEffectsAlert = "Schedule H1 Drug: Record in Statutory Register. High risk of dependence.", IsHabitForming = true },
            new SaltMaster { TenantId = tenantId, SaltName = "Alprazolam 0.25mg", TherapeuticCategory = "Benzodiazepine Anxiolytic", Description = "Short-term management of acute panic & anxiety", SideEffectsAlert = "Schedule H1 Narcotic: Mandated duplicate register entry. Sedative.", IsHabitForming = true },
            new SaltMaster { TenantId = tenantId, SaltName = "Clonazepam 0.5mg", TherapeuticCategory = "Anticonvulsant & Anxiolytic", Description = "Seizure control and acute panic disorder", SideEffectsAlert = "Schedule H1 Drug: Strict compliance audit trail required.", IsHabitForming = true }
        };
    }

    public async Task<Result> LinkItemSaltCompositionAsync(
        LinkItemSaltRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _context.ItemSaltCompositions
            .FirstOrDefaultAsync(c => c.ItemId == request.ItemId && c.SaltId == request.SaltId && c.TenantId == TenantId, cancellationToken);

        if (existing != null)
        {
            existing.Strength = request.Strength.Trim();
            existing.IsDeleted = false;
        }
        else
        {
            var comp = new ItemSaltComposition
            {
                TenantId = TenantId,
                ItemId = request.ItemId,
                SaltId = request.SaltId,
                Strength = request.Strength.Trim()
            };
            _context.ItemSaltCompositions.Add(comp);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region 3. Schedule H1 Regulatory Register

    public async Task<Result<IReadOnlyList<ScheduleH1RegisterDto>>> GetScheduleH1RegisterAsync(
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var start = fromDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = toDate ?? DateTime.UtcNow.AddDays(1);

        var entries = await _context.ScheduleH1RegisterEntries
            .Where(e => e.TenantId == TenantId && !e.IsDeleted && e.SupplyDate >= start && e.SupplyDate <= end)
            .OrderByDescending(e => e.SupplyDate)
            .Select(e => new ScheduleH1RegisterDto(
                e.Id,
                e.InvoiceId,
                e.InvoiceNumber,
                e.SupplyDate,
                e.PatientName,
                e.PatientAddressPhone,
                e.PrescriberDoctorName,
                e.PrescriberRegNumber,
                e.DrugName,
                e.BatchNumber,
                e.QuantitySupplied,
                e.ManufacturerName,
                e.SignOffStatus
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<ScheduleH1RegisterDto>>.Success(entries);
    }

    public async Task<Result> RecordScheduleH1EntryAsync(
        RecordScheduleH1EntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = new ScheduleH1RegisterEntry
        {
            TenantId = TenantId,
            InvoiceId = request.InvoiceId,
            InvoiceNumber = request.InvoiceNumber,
            SupplyDate = request.SupplyDate,
            PatientName = request.PatientName.Trim(),
            PatientAddressPhone = request.PatientAddressPhone.Trim(),
            PrescriberDoctorName = request.PrescriberDoctorName.Trim(),
            PrescriberRegNumber = request.PrescriberRegNumber.Trim(),
            DrugName = request.DrugName.Trim(),
            BatchNumber = request.BatchNumber.Trim(),
            QuantitySupplied = request.QuantitySupplied,
            ManufacturerName = request.ManufacturerName.Trim(),
            SignOffStatus = "Verified"
        };

        _context.ScheduleH1RegisterEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    #endregion

    #region 4. Expiry Radar & Return Claims to Suppliers

    public async Task<Result<IReadOnlyList<ExpiryRadarItemDto>>> GetExpiryRadarAsync(
        int daysThreshold = 90,
        Guid? supplierId = null,
        CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.Date.AddDays(daysThreshold);

        var query = _context.ItemBatches
            .Include(b => b.Item)
            .Include(b => b.WarehouseStocks)
            .Where(b => b.TenantId == TenantId && b.IsActive && b.ExpiryDate <= cutoff);

        if (supplierId.HasValue && supplierId.Value != Guid.Empty)
        {
            query = query.Where(b => b.SupplierId == supplierId.Value);
        }

        var batches = await query
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow.Date;
        var list = new List<ExpiryRadarItemDto>();

        foreach (var b in batches)
        {
            var stock = b.WarehouseStocks.Sum(ws => ws.CurrentQuantity);
            if (stock <= 0) continue;

            var days = (int)(b.ExpiryDate.Date - now).TotalDays;
            string status = days < 0 ? "Expired" : days <= 30 ? "Critical30Days" : "Warning90Days";

            list.Add(new ExpiryRadarItemDto(
                BatchId: b.Id,
                ItemId: b.ItemId,
                ItemName: b.Item?.Name ?? "Pharma Item",
                Sku: b.Item?.Sku ?? string.Empty,
                BatchNumber: b.BatchNumber,
                ExpiryDateMonthYear: b.ExpiryDate.ToString("MM/yy"),
                DaysToExpiry: days,
                CurrentStock: stock,
                PurchaseRate: b.PurchaseRate,
                Mrp: b.MRP,
                TotalLossValue: Math.Round(stock * b.PurchaseRate, 2),
                SupplierId: b.SupplierId,
                SupplierName: "Primary Wholesaler / C&F",
                ExpiryStatus: status
            ));
        }

        return Result<IReadOnlyList<ExpiryRadarItemDto>>.Success(list);
    }

    public async Task<Result<ExpiryReturnClaimDto>> CreateExpiryReturnClaimAsync(
        CreateExpiryReturnClaimRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Items.Count == 0)
            return Result<ExpiryReturnClaimDto>.Failure("No items selected for expiry claim.", "VALIDATION_FAILED");

        string claimNumber = $"CLM-EXP-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        decimal totalAmount = 0;

        var claim = new ExpiryReturnClaim
        {
            TenantId = TenantId,
            ClaimNumber = claimNumber,
            SupplierId = request.SupplierId,
            SupplierName = request.SupplierName.Trim(),
            ClaimDate = DateTime.UtcNow,
            Status = "Submitted",
            Notes = request.Notes?.Trim()
        };

        foreach (var itemReq in request.Items)
        {
            var amount = Math.Round(itemReq.Quantity * itemReq.PurchaseRate, 2);
            totalAmount += amount;

            var claimItem = new ExpiryReturnClaimItem
            {
                TenantId = TenantId,
                ItemBatchId = itemReq.ItemBatchId,
                ItemName = itemReq.ItemName.Trim(),
                BatchNumber = itemReq.BatchNumber.Trim(),
                ExpiryDateMonthYear = itemReq.ExpiryDateMonthYear.Trim(),
                Quantity = itemReq.Quantity,
                PurchaseRate = itemReq.PurchaseRate,
                ClaimAmount = amount,
                Reason = itemReq.Reason
            };
            claim.Items.Add(claimItem);

            // Move stock to Quarantined and deduct from active stock
            if (itemReq.ItemBatchId.HasValue && itemReq.ItemBatchId.Value != Guid.Empty)
            {
                var batch = await _context.ItemBatches
                    .Include(b => b.WarehouseStocks)
                    .FirstOrDefaultAsync(b => b.Id == itemReq.ItemBatchId.Value && b.TenantId == TenantId, cancellationToken);

                if (batch != null)
                {
                    batch.QuarantinedStock += itemReq.Quantity;
                    batch.IsQuarantined = true;

                    // Deduct from primary warehouse stock
                    var ws = batch.WarehouseStocks.FirstOrDefault();
                    if (ws != null)
                    {
                        ws.CurrentQuantity = Math.Max(0, ws.CurrentQuantity - itemReq.Quantity);
                    }
                }
            }
        }

        claim.TotalClaimAmount = totalAmount;
        _context.ExpiryReturnClaims.Add(claim);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new ExpiryReturnClaimDto(
            claim.Id,
            claim.ClaimNumber,
            claim.SupplierId,
            claim.SupplierName,
            claim.ClaimDate,
            claim.TotalClaimAmount,
            claim.Status,
            claim.SupplierCreditNoteNumber,
            claim.Notes,
            claim.Items.Select(i => new ExpiryReturnClaimItemDto(
                i.Id,
                i.ItemBatchId,
                i.ItemName,
                i.BatchNumber,
                i.ExpiryDateMonthYear,
                i.Quantity,
                i.PurchaseRate,
                i.ClaimAmount,
                i.Reason
            )).ToList()
        );

        return Result<ExpiryReturnClaimDto>.Success(dto);
    }

    public async Task<Result<IReadOnlyList<ExpiryReturnClaimDto>>> GetExpiryReturnClaimsAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await _context.ExpiryReturnClaims
            .Include(c => c.Items)
            .Where(c => c.TenantId == TenantId && !c.IsDeleted)
            .OrderByDescending(c => c.ClaimDate)
            .Select(c => new ExpiryReturnClaimDto(
                c.Id,
                c.ClaimNumber,
                c.SupplierId,
                c.SupplierName,
                c.ClaimDate,
                c.TotalClaimAmount,
                c.Status,
                c.SupplierCreditNoteNumber,
                c.Notes,
                c.Items.Select(i => new ExpiryReturnClaimItemDto(
                    i.Id,
                    i.ItemBatchId,
                    i.ItemName,
                    i.BatchNumber,
                    i.ExpiryDateMonthYear,
                    i.Quantity,
                    i.PurchaseRate,
                    i.ClaimAmount,
                    i.Reason
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<ExpiryReturnClaimDto>>.Success(claims);
    }

    #endregion

    #region 5. Doctor Prescribers & Patient Rapid Repeat History

    public async Task<Result<IReadOnlyList<DoctorPrescriberDto>>> GetDoctorPrescribersAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var query = _context.DoctorPrescribers
            .Where(d => d.TenantId == TenantId && !d.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(d => d.Name.ToLower().Contains(term) ||
                                     d.RegistrationNumber.ToLower().Contains(term) ||
                                     d.ClinicHospitalName.ToLower().Contains(term));
        }

        var doctors = await query
            .OrderBy(d => d.Name)
            .Select(d => new DoctorPrescriberDto(
                d.Id,
                d.Code,
                d.Name,
                d.Qualification,
                d.Specialization,
                d.RegistrationNumber,
                d.ClinicHospitalName,
                d.Address,
                d.City,
                d.Mobile,
                d.Email,
                d.IncentivePercent,
                d.AssignedMrName,
                d.IsActive,
                d.IncentivePercent,
                0m,
                0m,
                0m,
                d.ApprovalStatus ?? "Approved",
                d.IsLocked,
                d.ChangeRemarks,
                d.DeleteApprovalLevel
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<DoctorPrescriberDto>>.Success(doctors);
    }

    public async Task<Result<DoctorPrescriberDto>> SaveDoctorPrescriberAsync(
        SaveDoctorPrescriberRequest request,
        CancellationToken cancellationToken = default)
    {
        var incentive = request.IncentivePercent ?? request.CommissionPercent ?? 0m;
        string qual = request.Qualification?.Trim() ?? string.Empty;
        string spec = request.Specialization?.Trim() ?? string.Empty;
        string regNo = request.RegistrationNumber?.Trim() ?? string.Empty;
        string clinic = request.ClinicHospitalName?.Trim() ?? string.Empty;
        string addr = string.IsNullOrWhiteSpace(request.Address) ? "Main Road" : request.Address.Trim();
        string city = string.IsNullOrWhiteSpace(request.City) ? "Delhi" : request.City.Trim();
        string mobile = request.Mobile?.Trim() ?? string.Empty;

        DoctorPrescriber doc;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            doc = await _context.DoctorPrescribers
                .FirstOrDefaultAsync(d => d.Id == request.Id.Value && d.TenantId == TenantId, cancellationToken);

            if (doc == null)
                return Result<DoctorPrescriberDto>.Failure("Doctor not found.", "NOT_FOUND");

            if (doc.IsLocked && !string.Equals(request.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                doc.ApprovalStatus = "PendingEdit";
                doc.ChangeRemarks = string.IsNullOrWhiteSpace(request.ChangeRemarks) ? "Field representative requested profile modification." : request.ChangeRemarks.Trim();
            }
            else if (!string.IsNullOrWhiteSpace(request.ApprovalStatus))
            {
                doc.ApprovalStatus = request.ApprovalStatus.Trim();
                if (doc.ApprovalStatus == "Approved")
                {
                    doc.IsLocked = true;
                    doc.ChangeRemarks = null;
                }
            }

            doc.Code = string.IsNullOrWhiteSpace(request.Code) ? doc.Code : request.Code.Trim();
            doc.Name = request.Name.Trim();
            doc.Qualification = qual;
            doc.Specialization = spec;
            doc.RegistrationNumber = regNo;
            doc.ClinicHospitalName = clinic;
            doc.Address = addr;
            doc.City = city;
            doc.Mobile = mobile;
            doc.Email = request.Email?.Trim();
            doc.IncentivePercent = incentive;
            doc.AssignedMrName = request.AssignedMrName?.Trim();
            doc.IsActive = request.IsActive;
        }
        else
        {
            doc = new DoctorPrescriber
            {
                TenantId = TenantId,
                Code = string.IsNullOrWhiteSpace(request.Code) ? $"DOC-{Random.Shared.Next(100, 999)}" : request.Code.Trim(),
                Name = request.Name.Trim(),
                Qualification = qual,
                Specialization = spec,
                RegistrationNumber = regNo,
                ClinicHospitalName = clinic,
                Address = addr,
                City = city,
                Mobile = mobile,
                Email = request.Email?.Trim(),
                IncentivePercent = incentive,
                AssignedMrName = request.AssignedMrName?.Trim(),
                IsActive = request.IsActive,
                ApprovalStatus = request.ApprovalStatus ?? "Approved",
                IsLocked = false
            };
            _context.DoctorPrescribers.Add(doc);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<DoctorPrescriberDto>.Success(new DoctorPrescriberDto(
            doc.Id,
            doc.Code,
            doc.Name,
            doc.Qualification,
            doc.Specialization,
            doc.RegistrationNumber,
            doc.ClinicHospitalName,
            doc.Address,
            doc.City,
            doc.Mobile,
            doc.Email,
            doc.IncentivePercent,
            doc.AssignedMrName,
            doc.IsActive,
            CommissionPercent: doc.IncentivePercent,
            TotalPrescriptionsValue: 0m,
            TotalCommissionPaid: 0m,
            BalanceCommission: 0m,
            ApprovalStatus: doc.ApprovalStatus,
            IsLocked: doc.IsLocked,
            ChangeRemarks: doc.ChangeRemarks,
            DeleteApprovalLevel: doc.DeleteApprovalLevel
        ));
    }

    public async Task<Result<int>> BulkApproveDoctorsAsync(List<Guid>? doctorIds, CancellationToken cancellationToken = default)
    {
        var query = _context.DoctorPrescribers.Where(d => d.TenantId == TenantId && !d.IsDeleted);
        if (doctorIds != null && doctorIds.Count > 0)
        {
            query = query.Where(d => doctorIds.Contains(d.Id));
        }
        else
        {
            query = query.Where(d => d.ApprovalStatus != "Approved" || !d.IsLocked);
        }

        var docs = await query.ToListAsync(cancellationToken);
        foreach (var d in docs)
        {
            d.ApprovalStatus = "Approved";
            d.IsLocked = true;
            d.ChangeRemarks = null;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<int>.Success(docs.Count);
    }

    public async Task<Result<bool>> RequestDeleteDoctorAsync(Guid doctorId, string reason, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DoctorPrescribers.FirstOrDefaultAsync(d => d.Id == doctorId && d.TenantId == TenantId, cancellationToken);
        if (doc == null)
            return Result<bool>.Failure("Doctor not found.", "NOT_FOUND");

        doc.ApprovalStatus = "PendingDelete";
        doc.ChangeRemarks = string.IsNullOrWhiteSpace(reason) ? "Requested doctor removal from territory." : reason.Trim();
        doc.DeleteApprovalLevel = 0; // Fresh delete request

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<int>> ApproveDeleteDoctorAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DoctorPrescribers.FirstOrDefaultAsync(d => d.Id == doctorId && d.TenantId == TenantId, cancellationToken);
        if (doc == null)
            return Result<int>.Failure("Doctor not found.", "NOT_FOUND");

        doc.DeleteApprovalLevel += 1;
        if (doc.DeleteApprovalLevel >= 3)
        {
            doc.IsDeleted = true;
            doc.DeletedAtUtc = DateTime.UtcNow;
            doc.ApprovalStatus = "Deleted";
        }
        else if (doc.DeleteApprovalLevel == 1)
        {
            doc.ChangeRemarks = $"ABM Approved deletion: {doc.ChangeRemarks}. Awaiting RSM approval.";
        }
        else if (doc.DeleteApprovalLevel == 2)
        {
            doc.ChangeRemarks = $"ABM & RSM Approved deletion: {doc.ChangeRemarks}. Awaiting Head Office approval.";
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<int>.Success(doc.DeleteApprovalLevel);
    }

    public async Task<Result<bool>> ApproveEditDoctorAsync(Guid doctorId, CancellationToken cancellationToken = default)
    {
        var doc = await _context.DoctorPrescribers.FirstOrDefaultAsync(d => d.Id == doctorId && d.TenantId == TenantId, cancellationToken);
        if (doc == null)
            return Result<bool>.Failure("Doctor not found.", "NOT_FOUND");

        doc.ApprovalStatus = "Approved";
        doc.IsLocked = true;
        doc.ChangeRemarks = null;

        await _context.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<PatientPrescriptionHistoryDto>> GetPatientPrescriptionHistoryAsync(
        string mobileNumber,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(mobileNumber))
            return Result<PatientPrescriptionHistoryDto>.Failure("Patient mobile required.", "VALIDATION_FAILED");

        var cleanPhone = mobileNumber.Trim();

        // Search previous sales invoices for this patient mobile
        var latestInvoice = await _context.SalesInvoices
            .Include(i => i.Party)
            .Include(i => i.Items)
                .ThenInclude(it => it.Item)
            .Where(i => i.TenantId == TenantId && !i.IsDeleted && !i.IsCancelled && i.Status != Domain.Entities.Sales.InvoiceStatus.Cancelled && 
                       ((i.Party != null && (i.Party.PrimaryPhone == cleanPhone || i.Party.Mobile == cleanPhone)) || 
                        (i.Notes != null && i.Notes.Contains(cleanPhone))))
            .OrderByDescending(i => i.InvoiceDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestInvoice == null)
        {
            return Result<PatientPrescriptionHistoryDto>.Failure("No prescription history found for this patient phone.", "NOT_FOUND");
        }

        var items = latestInvoice.Items.Select(it => new PatientHistoryItemDto(
            ItemId: it.ItemId,
            ItemName: it.Item?.Name ?? "Medicine",
            Sku: it.Item?.Sku ?? string.Empty,
            Quantity: it.Quantity,
            RecommendedDosage: "As Prescribed"
        )).ToList();

        var result = new PatientPrescriptionHistoryDto(
            PatientName: latestInvoice.Party?.TradeName ?? latestInvoice.Party?.LegalName ?? "Walk-in Patient",
            PatientMobile: cleanPhone,
            LastVisitDate: latestInvoice.InvoiceDate,
            LastDoctorName: latestInvoice.DoctorName ?? "Dr. Prescriber",
            LastDoctorRegNumber: latestInvoice.DoctorRegistrationNumber ?? "N/A",
            PrescribedItems: items
        );

        return Result<PatientPrescriptionHistoryDto>.Success(result);
    }

    #endregion

    #region Helper Parser

    private static DateTime ParseExpiryDate(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return DateTime.UtcNow.AddMonths(12);

        var clean = input.Replace("-", "/").Trim();
        var parts = clean.Split('/');
        if (parts.Length == 2 && int.TryParse(parts[0], out int month))
        {
            int year = int.Parse(parts[1]);
            if (year < 100) year += 2000;
            int lastDay = DateTime.DaysInMonth(year, month);
            return new DateTime(year, month, lastDay, 23, 59, 59, DateTimeKind.Utc);
        }

        if (DateTime.TryParse(input, out var parsed))
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);

        return DateTime.UtcNow.AddMonths(12);
    }

    #endregion
}
