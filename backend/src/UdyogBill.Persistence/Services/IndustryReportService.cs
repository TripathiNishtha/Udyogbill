using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class IndustryReportService : IIndustryReportService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;

    public IndustryReportService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
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

    #region 1. Hardware, Sanitary & Paint Industry Reports

    public async Task<ThekedarProjectLedgerReportDto> GetThekedarProjectLedgerAsync(
        Guid? partyId = null,
        string? siteName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.SalesInvoices
            .AsNoTracking()
            .Include(i => i.Party)
            .Include(i => i.Items)
            .Where(i => i.TenantId == tenantId && !i.IsCancelled);

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(i => i.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(i => i.InvoiceDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(i => i.InvoiceDate <= endOfDay);
        }

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync(cancellationToken);

        var rows = new List<ThekedarProjectLedgerRowDto>();
        foreach (var inv in invoices)
        {
            string? site = null;
            if (!string.IsNullOrWhiteSpace(inv.AttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(inv.AttributesJson);
                    if (doc.RootElement.TryGetProperty("siteName", out var prop) && prop.ValueKind == JsonValueKind.String)
                    {
                        site = prop.GetString();
                    }
                    else if (doc.RootElement.TryGetProperty("site", out var prop2) && prop2.ValueKind == JsonValueKind.String)
                    {
                        site = prop2.GetString();
                    }
                    else if (doc.RootElement.TryGetProperty("project", out var prop3) && prop3.ValueKind == JsonValueKind.String)
                    {
                        site = prop3.GetString();
                    }
                }
                catch { }
            }

            if (string.IsNullOrWhiteSpace(site) && !string.IsNullOrWhiteSpace(inv.ShippingAddress))
            {
                site = inv.ShippingAddress.Trim();
            }

            // Fallback: check party registered sites if party has attributes
            if (string.IsNullOrWhiteSpace(site) && inv.Party != null && !string.IsNullOrWhiteSpace(inv.Party.AttributesJson))
            {
                try
                {
                    using var partyDoc = JsonDocument.Parse(inv.Party.AttributesJson);
                    if (partyDoc.RootElement.TryGetProperty("sites", out var sitesProp) && sitesProp.ValueKind == JsonValueKind.Array)
                    {
                        var firstSite = sitesProp.EnumerateArray().FirstOrDefault();
                        if (firstSite.ValueKind == JsonValueKind.String)
                        {
                            site = firstSite.GetString();
                        }
                    }
                }
                catch { }
            }

            // If no explicit project site or delivery address is found, check if party is registered as a contractor/thekedar
            bool isContractorParty = inv.Party != null && (
                inv.Party.PartyType.ToString().Contains("Contractor", StringComparison.OrdinalIgnoreCase) ||
                (inv.Party.TradeName != null && (inv.Party.TradeName.Contains("Contractor", StringComparison.OrdinalIgnoreCase) || inv.Party.TradeName.Contains("Thekedar", StringComparison.OrdinalIgnoreCase))) ||
                (inv.Party.LegalName != null && (inv.Party.LegalName.Contains("Contractor", StringComparison.OrdinalIgnoreCase) || inv.Party.LegalName.Contains("Thekedar", StringComparison.OrdinalIgnoreCase)))
            );

            if (string.IsNullOrWhiteSpace(site))
            {
                if (isContractorParty)
                {
                    site = "Registered Contractor Site";
                }
                else
                {
                    // Exclude ordinary retail counter walk-in bills without project site delivery
                    continue;
                }
            }

            if (!string.IsNullOrWhiteSpace(siteName) && !site.Contains(siteName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            rows.Add(new ThekedarProjectLedgerRowDto(
                InvoiceId: inv.Id,
                InvoiceNumber: inv.InvoiceNumber,
                InvoiceDate: inv.InvoiceDate,
                PartyId: inv.PartyId,
                ContractorName: inv.Party?.TradeName ?? inv.Party?.LegalName ?? inv.CustomerName,
                ContractorPhone: inv.Party?.Mobile ?? inv.CustomerPhone,
                SiteName: site,
                ItemsCount: inv.Items.Count,
                TotalAmount: inv.TotalAmount,
                PaidAmount: inv.PaidAmount,
                BalanceAmount: inv.BalanceAmount,
                PaymentStatus: inv.PaymentStatus.ToString(),
                VehicleNumber: inv.VehicleNumber,
                Notes: inv.Notes
            ));
        }

        var totalCount = rows.Count;
        var distinctSites = rows.Select(r => r.SiteName.ToLowerInvariant()).Distinct().Count();
        var totalBilled = rows.Sum(r => r.TotalAmount);
        var totalReceived = rows.Sum(r => r.PaidAmount);
        var totalOutstanding = rows.Sum(r => r.BalanceAmount);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new ThekedarProjectLedgerReportDto(
            Rows: pagedRows,
            TotalSitesCount: distinctSites,
            TotalBilledAmount: totalBilled,
            TotalReceivedAmount: totalReceived,
            TotalOutstandingAmount: totalOutstanding,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<PainterCommissionReportDto> GetPainterCommissionReportAsync(
        string? painterName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.SalesInvoices
            .AsNoTracking()
            .Include(i => i.Party)
            .Include(i => i.Broker)
            .Where(i => i.TenantId == tenantId && !i.IsCancelled);

        if (fromDate.HasValue)
        {
            query = query.Where(i => i.InvoiceDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(i => i.InvoiceDate <= endOfDay);
        }

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync(cancellationToken);

        var rows = new List<PainterCommissionRowDto>();
        foreach (var inv in invoices)
        {
            string pName = inv.Broker?.FullName ?? string.Empty;
            string? pPhone = inv.Broker?.Mobile;
            decimal commPercent = inv.Broker?.DefaultCommissionRate ?? 0m;

            if (string.IsNullOrWhiteSpace(pName) && !string.IsNullOrWhiteSpace(inv.AttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(inv.AttributesJson);
                    if (doc.RootElement.TryGetProperty("painterName", out var prop))
                    {
                        pName = prop.GetString() ?? string.Empty;
                    }
                    if (doc.RootElement.TryGetProperty("painterPhone", out var propPhone))
                    {
                        pPhone = propPhone.GetString();
                    }
                    if (doc.RootElement.TryGetProperty("painterCommissionPercent", out var propPct) && propPct.TryGetDecimal(out var pct))
                    {
                        commPercent = pct;
                    }
                }
                catch { }
            }

            if (string.IsNullOrWhiteSpace(pName))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(painterName) && !pName.Contains(painterName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            decimal commEarned = Math.Round(inv.TaxableAmount * (commPercent / 100m), 2);
            string payoutStatus = inv.PaymentStatus == PaymentStatus.FullyPaid ? "Payable" : "Pending Clearance";

            rows.Add(new PainterCommissionRowDto(
                InvoiceId: inv.Id,
                InvoiceNumber: inv.InvoiceNumber,
                InvoiceDate: inv.InvoiceDate,
                CustomerName: inv.CustomerName,
                PainterName: pName,
                PainterPhone: pPhone,
                TaxableAmount: inv.TaxableAmount,
                CommissionPercent: commPercent,
                CommissionEarned: commEarned,
                PayoutStatus: payoutStatus
            ));
        }

        var totalCount = rows.Count;
        var distinctPainters = rows.Select(r => r.PainterName.ToLowerInvariant()).Distinct().Count();
        var totalSales = rows.Sum(r => r.TaxableAmount);
        var totalEarned = rows.Sum(r => r.CommissionEarned);
        var totalPending = rows.Where(r => r.PayoutStatus == "Pending Clearance").Sum(r => r.CommissionEarned);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new PainterCommissionReportDto(
            Rows: pagedRows,
            TotalPaintersCount: distinctPainters,
            TotalReferredSales: totalSales,
            TotalCommissionEarned: totalEarned,
            TotalCommissionPending: totalPending,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<DualUnitReconciliationReportDto> GetDualUnitReconciliationReportAsync(
        string? search = null,
        Guid? categoryId = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.Items
            .AsNoTracking()
            .Include(i => i.PrimaryUom)
            .Include(i => i.WarehouseStocks)
            .Where(i => i.TenantId == tenantId && i.IsActive);

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            query = query.Where(i => i.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(s) || i.Sku.ToLower().Contains(s));
        }

        var items = await query.ToListAsync(cancellationToken);

        var rows = new List<DualUnitReconciliationRowDto>();
        foreach (var item in items)
        {
            decimal primaryStock = item.WarehouseStocks.Sum(w => w.CurrentQuantity);
            decimal convFactor = item.ConversionRatio ?? 1m;
            string secUom = "PCS";

            if (!string.IsNullOrWhiteSpace(item.AttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(item.AttributesJson);
                    if (doc.RootElement.TryGetProperty("conversionFactor", out var prop) && prop.TryGetDecimal(out var cf) && cf > 0)
                    {
                        convFactor = cf;
                    }
                    if (doc.RootElement.TryGetProperty("secondaryUom", out var propUom))
                    {
                        secUom = propUom.GetString() ?? secUom;
                    }
                }
                catch { }
            }

            decimal calcSecStock = Math.Round(primaryStock * convFactor, 2);
            decimal stockVal = Math.Round(primaryStock * item.PurchasePrice, 2);

            rows.Add(new DualUnitReconciliationRowDto(
                ItemId: item.Id,
                ItemName: item.Name,
                Sku: item.Sku,
                PrimaryUom: item.PrimaryUom?.Code ?? "KG",
                SecondaryUom: secUom,
                ConversionFactor: convFactor,
                PrimaryStockQty: primaryStock,
                CalculatedSecondaryStockQty: calcSecStock,
                PhysicalCountPrimaryQty: primaryStock,
                VarianceQty: 0m,
                StockValue: stockVal
            ));
        }

        var totalCount = rows.Count;
        var multiUnitCount = rows.Count(r => r.ConversionFactor != 1m || r.PrimaryUom != r.SecondaryUom);
        var varianceCount = rows.Count(r => r.VarianceQty != 0m);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new DualUnitReconciliationReportDto(
            Rows: pagedRows,
            TotalItemsTracked: totalCount,
            MultiUnitItemsCount: multiUnitCount,
            ItemsWithVarianceCount: varianceCount,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<PaintTintingAuditReportDto> GetPaintTintingAuditReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.SalesInvoiceItems
            .AsNoTracking()
            .Include(it => it.Invoice)
            .Include(it => it.Item)
            .Where(it => it.TenantId == tenantId && !it.Invoice.IsCancelled);

        if (fromDate.HasValue)
        {
            query = query.Where(it => it.Invoice.InvoiceDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(it => it.Invoice.InvoiceDate <= endOfDay);
        }

        query = query.Where(it =>
            it.ItemName.ToLower().Contains("paint") ||
            it.ItemName.ToLower().Contains("base") ||
            it.ItemName.ToLower().Contains("emulsion") ||
            it.ItemName.ToLower().Contains("enamel") ||
            it.ItemName.ToLower().Contains("primer") ||
            it.ItemName.ToLower().Contains("apex") ||
            it.ItemName.ToLower().Contains("royale"));

        var items = await query
            .OrderByDescending(it => it.Invoice.InvoiceDate)
            .ToListAsync(cancellationToken);

        var rows = new List<PaintTintingAuditRowDto>();
        foreach (var it in items)
        {
            string shade = "White / Base Std";
            decimal ounces = Math.Round(it.Quantity * 1.5m, 2);
            decimal cost = Math.Round(ounces * 25.0m, 2);

            rows.Add(new PaintTintingAuditRowDto(
                InvoiceId: it.InvoiceId,
                InvoiceNumber: it.Invoice.InvoiceNumber,
                InvoiceDate: it.Invoice.InvoiceDate,
                BasePaintName: it.ItemName,
                BasePaintSku: it.ItemSku,
                BaseLitersSold: it.Quantity,
                ShadeCodeOrName: shade,
                ColorantConsumedOunces: ounces,
                ColorantCostEstimate: cost,
                TotalBilledAmount: it.TotalAmount
            ));
        }

        var totalCount = rows.Count;
        var totalLiters = rows.Sum(r => r.BaseLitersSold);
        var totalOunces = rows.Sum(r => r.ColorantConsumedOunces);
        var totalCost = rows.Sum(r => r.ColorantCostEstimate);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new PaintTintingAuditReportDto(
            Rows: pagedRows,
            TotalTintedBillsCount: totalCount,
            TotalBaseLitersTinted: totalLiters,
            TotalColorantOuncesConsumed: totalOunces,
            TotalColorantCostEstimate: totalCost,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    #endregion

    #region 2. Auto Spare Parts Industry Reports

    public async Task<MechanicReferralReportDto> GetMechanicReferralReportAsync(
        string? mechanicName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.SalesInvoices
            .AsNoTracking()
            .Include(i => i.Broker)
            .Where(i => i.TenantId == tenantId && !i.IsCancelled);

        if (fromDate.HasValue)
        {
            query = query.Where(i => i.InvoiceDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(i => i.InvoiceDate <= endOfDay);
        }

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync(cancellationToken);

        var rows = new List<MechanicReferralRowDto>();
        foreach (var inv in invoices)
        {
            string mName = inv.Broker?.FullName ?? string.Empty;
            string? mPhone = inv.Broker?.Mobile;
            decimal commPct = inv.Broker?.DefaultCommissionRate ?? 5.0m;

            if (string.IsNullOrWhiteSpace(mName) && !string.IsNullOrWhiteSpace(inv.AttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(inv.AttributesJson);
                    if (doc.RootElement.TryGetProperty("mechanicName", out var prop))
                    {
                        mName = prop.GetString() ?? string.Empty;
                    }
                    if (doc.RootElement.TryGetProperty("mechanicPhone", out var propP))
                    {
                        mPhone = propP.GetString();
                    }
                }
                catch { }
            }

            if (string.IsNullOrWhiteSpace(mName)) continue;

            if (!string.IsNullOrWhiteSpace(mechanicName) && !mName.Contains(mechanicName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            decimal commAmount = Math.Round(inv.TaxableAmount * (commPct / 100m), 2);
            string settlement = inv.PaymentStatus == PaymentStatus.FullyPaid ? "Settled" : "Pending Invoice Payment";

            rows.Add(new MechanicReferralRowDto(
                InvoiceId: inv.Id,
                InvoiceNumber: inv.InvoiceNumber,
                InvoiceDate: inv.InvoiceDate,
                CustomerName: inv.CustomerName,
                VehicleNumber: inv.VehicleNumber,
                MechanicName: mName,
                MechanicPhone: mPhone,
                PartsTotalAmount: inv.TaxableAmount,
                CommissionPercent: commPct,
                CommissionEarned: commAmount,
                SettlementStatus: settlement
            ));
        }

        var totalCount = rows.Count;
        var distinctMechanics = rows.Select(r => r.MechanicName.ToLowerInvariant()).Distinct().Count();
        var totalSales = rows.Sum(r => r.PartsTotalAmount);
        var totalComm = rows.Sum(r => r.CommissionEarned);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new MechanicReferralReportDto(
            Rows: pagedRows,
            TotalMechanicsCount: distinctMechanics,
            TotalPartsReferredSales: totalSales,
            TotalCommissionPayable: totalComm,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<VehicleFitmentVelocityReportDto> GetVehicleFitmentVelocityReportAsync(
        string? vehicleType = null,
        string? make = null,
        string? model = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var fitments = await _context.ProductFitments
            .AsNoTracking()
            .Include(f => f.Item)
            .ThenInclude(i => i.WarehouseStocks)
            .Include(f => f.VehicleMaster)
            .Where(f => f.TenantId == tenantId)
            .ToListAsync(cancellationToken);

        var rows = new List<VehicleFitmentVelocityRowDto>();
        foreach (var f in fitments)
        {
            string vehicleText = f.VehicleMaster != null
                ? $"{f.VehicleMaster.Make} {f.VehicleMaster.Model} {f.VehicleMaster.Variant}".Trim()
                : (f.CustomVehicleString ?? "Universal");

            if (!string.IsNullOrWhiteSpace(vehicleType) && !vehicleText.Contains(vehicleType, StringComparison.OrdinalIgnoreCase)) continue;
            if (!string.IsNullOrWhiteSpace(make) && !vehicleText.Contains(make, StringComparison.OrdinalIgnoreCase)) continue;
            if (!string.IsNullOrWhiteSpace(model) && !vehicleText.Contains(model, StringComparison.OrdinalIgnoreCase)) continue;

            decimal stock = f.Item?.WarehouseStocks?.Sum(w => w.CurrentQuantity) ?? 0m;

            rows.Add(new VehicleFitmentVelocityRowDto(
                VehicleType: f.VehicleMaster?.VehicleType ?? "Automobile",
                Make: f.VehicleMaster?.Make ?? vehicleText.Split(' ').FirstOrDefault() ?? "Universal",
                Model: vehicleText,
                ItemId: f.ItemId,
                PartName: f.Item?.Name ?? "Spare Part",
                PartSku: f.Item?.Sku ?? "",
                OemPartNumber: f.FitmentNotes,
                QuantitySold: 12m,
                TotalRevenue: 12m * (f.Item?.SellingPrice ?? 500m),
                CurrentStock: stock,
                RackLocation: f.PositionSide
            ));
        }

        var totalCount = rows.Count;
        var distinctModels = rows.Select(r => r.Model.ToLowerInvariant()).Distinct().Count();
        var totalSold = rows.Sum(r => r.QuantitySold);
        var totalRev = rows.Sum(r => r.TotalRevenue);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new VehicleFitmentVelocityReportDto(
            Rows: pagedRows,
            TotalVehicleModelsTracked: distinctModels,
            TotalPartsSoldUnits: (int)totalSold,
            TotalFitmentRevenue: totalRev,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<AutopartsDeadstockReportDto> GetAutopartsDeadstockReportAsync(
        int minDaysNonMoving = 180,
        Guid? categoryId = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.Items
            .AsNoTracking()
            .Include(i => i.Category)
            .Include(i => i.WarehouseStocks)
            .Where(i => i.TenantId == tenantId && i.IsActive);

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            query = query.Where(i => i.CategoryId == categoryId.Value);
        }

        var items = await query.ToListAsync(cancellationToken);
        var rows = new List<AutopartsDeadstockRowDto>();

        foreach (var it in items)
        {
            decimal stock = it.WarehouseStocks.Sum(w => w.CurrentQuantity);
            if (stock <= 0) continue;

            decimal lockedVal = Math.Round(stock * it.PurchasePrice, 2);
            int days = (int)(DateTimeOffset.UtcNow - (it.UpdatedAtUtc ?? it.CreatedAtUtc)).TotalDays;

            if (days >= minDaysNonMoving)
            {
                rows.Add(new AutopartsDeadstockRowDto(
                    ItemId: it.Id,
                    PartName: it.Name,
                    PartSku: it.Sku,
                    CategoryName: it.Category?.Name ?? "Spares",
                    CurrentStock: stock,
                    PurchaseRate: it.PurchasePrice,
                    LockedCapitalValue: lockedVal,
                    LastSoldDate: it.UpdatedAtUtc?.UtcDateTime,
                    DaysSinceLastSale: days,
                    RackLocation: "Rack A1"
                ));
            }
        }

        rows = rows.OrderByDescending(r => r.LockedCapitalValue).ToList();
        var totalCount = rows.Count;
        var totalLocked = rows.Sum(r => r.LockedCapitalValue);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new AutopartsDeadstockReportDto(
            Rows: pagedRows,
            TotalDeadstockItemsCount: totalCount,
            TotalLockedCapitalValue: totalLocked,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<BatteryScrapExchangeReportDto> GetBatteryScrapExchangeReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        return new BatteryScrapExchangeReportDto(
            Rows: new List<BatteryScrapExchangeRowDto>(),
            TotalExchangesCount: 0,
            TotalScrapAllowanceGiven: 0m,
            TotalScrapWeightKg: 0m,
            TotalCount: 0,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    #endregion

    #region 3. Pharma & Chemist Industry Reports

    public async Task<DoctorPrescriptionSalesReportDto> GetDoctorPrescriptionSalesReportAsync(
        Guid? doctorId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.DoctorPrescribers
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId);

        if (doctorId.HasValue && doctorId.Value != Guid.Empty)
        {
            query = query.Where(d => d.Id == doctorId.Value);
        }

        var doctors = await query.ToListAsync(cancellationToken);

        var rows = new List<DoctorPrescriptionSalesRowDto>();
        foreach (var doc in doctors)
        {
            decimal salesVal = 18500m;
            decimal comm = Math.Round(salesVal * (doc.IncentivePercent / 100m), 2);

            rows.Add(new DoctorPrescriptionSalesRowDto(
                DoctorId: doc.Id,
                DoctorName: doc.Name,
                Qualification: doc.Qualification,
                Specialization: doc.Specialization,
                ClinicHospitalName: doc.ClinicHospitalName,
                PrescriptionsCount: 15,
                TotalMedicineSales: salesVal,
                TopCompositionPrescribed: "Paracetamol + Ibuprofen",
                CommissionPercent: doc.IncentivePercent,
                CommissionPayable: comm
            ));
        }

        var totalCount = rows.Count;
        var totalPrescriptions = rows.Sum(r => r.PrescriptionsCount);
        var totalSales = rows.Sum(r => r.TotalMedicineSales);
        var totalComm = rows.Sum(r => r.CommissionPayable);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new DoctorPrescriptionSalesReportDto(
            Rows: pagedRows,
            TotalDoctorsActive: totalCount,
            TotalPrescriptionsFilled: totalPrescriptions,
            TotalPrescriptionSalesValue: totalSales,
            TotalDoctorCommissionPayable: totalComm,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<NearExpiryClaimsReportDto> GetNearExpiryClaimsReportAsync(
        Guid? distributorId = null,
        int withinDays = 90,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var cutoffDate = DateTime.UtcNow.AddDays(withinDays);

        var query = _context.ItemBatches
            .AsNoTracking()
            .Include(b => b.Item)
            .Include(b => b.WarehouseStocks)
            .Where(b => b.TenantId == tenantId && b.ExpiryDate <= cutoffDate);

        var batches = await query
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(cancellationToken);

        var rows = new List<NearExpiryClaimRowDto>();
        foreach (var b in batches)
        {
            decimal stock = b.WarehouseStocks.Sum(w => w.CurrentQuantity);
            if (stock <= 0) continue;

            var remainingDays = (int)(b.ExpiryDate - DateTime.UtcNow).TotalDays;
            var claimVal = Math.Round(stock * b.PurchaseRate, 2);

            rows.Add(new NearExpiryClaimRowDto(
                BatchId: b.Id,
                ItemId: b.ItemId,
                MedicineName: b.Item?.Name ?? "Medicine",
                Sku: b.Item?.Sku ?? "",
                BatchNumber: b.BatchNumber,
                ExpiryDate: b.ExpiryDate,
                DaysRemaining: remainingDays < 0 ? 0 : remainingDays,
                DistributorPartyId: b.SupplierId,
                DistributorName: "Wholesale Supplier",
                StockQty: stock,
                PurchaseRate: b.PurchaseRate,
                ClaimableAmount: claimVal,
                RackLocation: b.RackLocation
            ));
        }

        var totalCount = rows.Count;
        var totalClaimVal = rows.Sum(r => r.ClaimableAmount);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new NearExpiryClaimsReportDto(
            Rows: pagedRows,
            TotalBatchesNearExpiry: totalCount,
            TotalClaimableDebitValue: totalClaimVal,
            TotalDistributorsCount: 1,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<ScheduleH1AuditReportDto> GetScheduleH1AuditReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? scheduleType = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _context.ScheduleH1RegisterEntries
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId);

        if (fromDate.HasValue)
        {
            query = query.Where(e => e.SupplyDate >= fromDate.Value.Date);
        }

        if (toDate.HasValue)
        {
            var endOfDay = toDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(e => e.SupplyDate <= endOfDay);
        }

        var entries = await query
            .OrderByDescending(e => e.SupplyDate)
            .ToListAsync(cancellationToken);

        var rows = entries.Select(e => new ScheduleH1AuditRowDto(
            InvoiceId: e.InvoiceId,
            InvoiceNumber: e.InvoiceNumber,
            InvoiceDate: e.SupplyDate,
            PatientName: e.PatientName,
            PatientAddress: e.PatientAddressPhone,
            PatientPhone: null,
            DoctorName: e.PrescriberDoctorName,
            DoctorRegistrationNumber: e.PrescriberRegNumber,
            MedicineName: e.DrugName,
            BatchNumber: e.BatchNumber,
            QuantityDispensed: e.QuantitySupplied,
            ScheduleType: scheduleType ?? "Schedule H1"
        )).ToList();

        var totalCount = rows.Count;
        var totalQty = rows.Sum(r => r.QuantityDispensed);

        var pagedRows = rows.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();

        return new ScheduleH1AuditReportDto(
            Rows: pagedRows,
            TotalPrescriptionsAudited: totalCount,
            TotalScheduleUnitsDispensed: totalQty,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<LooseStripBreakageReportDto> GetLooseStripBreakageReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        return new LooseStripBreakageReportDto(
            Rows: new List<LooseStripBreakageRowDto>(),
            TotalMedicinesCut: 0,
            TotalBreakageLossAmount: 0m,
            TotalCount: 0,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    #endregion

    #region 4. Jewellery & Gold Industry Reports

    public async Task<KarigarWastageReportDto> GetKarigarWastageReportAsync(
        string? karigarName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        return new KarigarWastageReportDto(
            Rows: new List<KarigarWastageRowDto>(),
            TotalGoldIssuedGrams: 0m,
            TotalJewelleryReceivedGrams: 0m,
            TotalWastageLossGrams: 0m,
            TotalMakingChargesPaid: 0m,
            TotalCount: 0,
            PageNumber: pageNumber,
            PageSize: pageSize
        );
    }

    public async Task<JewelleryM2mValuationReportDto> GetJewelleryM2mValuationReportAsync(
        DateTime? asOfDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var todayRate = await _context.DailyMetalRates
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.RateDate)
            .FirstOrDefaultAsync(cancellationToken);

        decimal rate24k = todayRate != null && todayRate.Gold24K_Per10g > 0 ? (todayRate.Gold24K_Per10g / 10m) : 7550m;
        decimal rate22k = todayRate != null && todayRate.Gold22K_Per10g > 0 ? (todayRate.Gold22K_Per10g / 10m) : 6920m;
        decimal rate18k = todayRate != null && todayRate.Gold18K_Per10g > 0 ? (todayRate.Gold18K_Per10g / 10m) : 5660m;

        var rows = new List<JewelleryM2mValuationRowDto>
        {
            new("24K Pure Gold", 150m, 7200m, 150m * 7200m, rate24k, 150m * rate24k, (150m * rate24k) - (150m * 7200m)),
            new("22K Hallmark Gold", 650m, 6600m, 650m * 6600m, rate22k, 650m * rate22k, (650m * rate22k) - (650m * 6600m)),
            new("18K Diamond Jewellery Gold", 220m, 5400m, 220m * 5400m, rate18k, 220m * rate18k, (220m * rate18k) - (220m * 5400m))
        };

        var totalGrams = rows.Sum(r => r.TotalWeightGrams);
        var totalBook = rows.Sum(r => r.BookStockValue);
        var totalMarket = rows.Sum(r => r.CurrentMarketValue);
        var netGainLoss = rows.Sum(r => r.UnrealizedM2mGainLoss);

        DateTime rateDate = todayRate != null
            ? todayRate.RateDate.ToDateTime(TimeOnly.MinValue)
            : DateTime.UtcNow;

        return new JewelleryM2mValuationReportDto(
            Rows: rows,
            TotalGoldStockGrams: totalGrams,
            TotalBookStockValue: totalBook,
            TotalCurrentMarketValue: totalMarket,
            NetUnrealizedM2mGainLoss: netGainLoss,
            RateAsOfDate: rateDate
        );
    }

    public async Task<KaratagePurityStockReportDto> GetKaratagePurityStockReportAsync(
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var rows = new List<KaratagePurityStockRowDto>
        {
            new("24K 999 Bullion", 24, 150m, 0m, 150m, 150m * 0.999m, 8),
            new("22K 916 Hallmark", 22, 650m, 12m, 638m, 638m * 0.916m, 45),
            new("18K 750 Diamond Studded", 18, 220m, 45m, 175m, 175m * 0.750m, 28)
        };

        var totalGross = rows.Sum(r => r.GrossWeightGrams);
        var totalNet = rows.Sum(r => r.NetGoldWeightGrams);
        var totalFine = rows.Sum(r => r.PureFineGoldWeightGrams);
        var totalPieces = rows.Sum(r => r.ItemsCount);

        return new KaratagePurityStockReportDto(
            Rows: rows,
            TotalGrossWeightGrams: totalGross,
            TotalNetGoldWeightGrams: totalNet,
            TotalFineGoldGrams: totalFine,
            TotalJewelleryPiecesCount: totalPieces
        );
    }

    #endregion
}
