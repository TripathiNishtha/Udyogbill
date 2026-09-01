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

    #region 1. Batch & FEFO Routing

    public async Task<Result<IReadOnlyList<PharmaBatchDto>>> GetItemBatchesAsync(
        Guid? itemId,
        bool includeExpired,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ItemBatches
            .Include(b => b.Item)
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
                Ptr: b.Ptr > 0 ? b.Ptr : Math.Round(b.SaleRate * 0.88m, 2),
                Pts: b.Pts > 0 ? b.Pts : Math.Round(b.SaleRate * 0.80m, 2),
                CurrentStock: stock > 0 ? stock : 0,
                QuarantinedStock: b.QuarantinedStock,
                RackLocation: b.RackLocation ?? "General Rack",
                Barcode: b.Barcode,
                IsExpired: isExpired,
                IsNearExpiry: isNear,
                DaysToExpiry: days,
                IsQuarantined: b.IsQuarantined
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
            batch.Ptr = request.Ptr > 0 ? request.Ptr : Math.Round(request.SaleRate * 0.88m, 2);
            batch.Pts = request.Pts > 0 ? request.Pts : Math.Round(request.SaleRate * 0.80m, 2);
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
                Ptr = request.Ptr > 0 ? request.Ptr : Math.Round(request.SaleRate * 0.88m, 2),
                Pts = request.Pts > 0 ? request.Pts : Math.Round(request.SaleRate * 0.80m, 2),
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
            IsQuarantined: batch.IsQuarantined
        );

        return Result<PharmaBatchDto>.Success(dto);
    }

    #endregion

    #region 2. Generic Salt Formulations & Substitute Finder

    public async Task<Result<IReadOnlyList<SaltMasterDto>>> GetSaltsAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
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
                d.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<DoctorPrescriberDto>>.Success(doctors);
    }

    public async Task<Result<DoctorPrescriberDto>> SaveDoctorPrescriberAsync(
        SaveDoctorPrescriberRequest request,
        CancellationToken cancellationToken = default)
    {
        DoctorPrescriber doc;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            doc = await _context.DoctorPrescribers
                .FirstOrDefaultAsync(d => d.Id == request.Id.Value && d.TenantId == TenantId, cancellationToken);

            if (doc == null)
                return Result<DoctorPrescriberDto>.Failure("Doctor not found.", "NOT_FOUND");

            doc.Code = request.Code.Trim();
            doc.Name = request.Name.Trim();
            doc.Qualification = request.Qualification.Trim();
            doc.Specialization = request.Specialization.Trim();
            doc.RegistrationNumber = request.RegistrationNumber.Trim();
            doc.ClinicHospitalName = request.ClinicHospitalName.Trim();
            doc.Address = request.Address.Trim();
            doc.City = request.City.Trim();
            doc.Mobile = request.Mobile.Trim();
            doc.Email = request.Email?.Trim();
            doc.IncentivePercent = request.IncentivePercent;
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
                Qualification = request.Qualification.Trim(),
                Specialization = request.Specialization.Trim(),
                RegistrationNumber = request.RegistrationNumber.Trim(),
                ClinicHospitalName = request.ClinicHospitalName.Trim(),
                Address = request.Address.Trim(),
                City = request.City.Trim(),
                Mobile = request.Mobile.Trim(),
                Email = request.Email?.Trim(),
                IncentivePercent = request.IncentivePercent,
                AssignedMrName = request.AssignedMrName?.Trim(),
                IsActive = request.IsActive
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
            doc.IsActive
        ));
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
            .Where(i => i.TenantId == TenantId && 
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
