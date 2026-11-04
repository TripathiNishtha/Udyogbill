using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Jewellery;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class JewelleryService : IJewelleryService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<JewelleryService> _logger;

    public JewelleryService(
        AppDbContext context,
        ITenantContext tenantContext,
        ILogger<JewelleryService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    private Guid TenantId => _tenantContext.TenantId;

    #region 1. Daily Metal Rate Board

    public async Task<Result<DailyMetalRateDto>> GetTodayRateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var rate = await _context.DailyMetalRates
                .AsNoTracking()
                .Where(r => r.TenantId == TenantId && r.RateDate == today && r.IsActive)
                .OrderByDescending(r => r.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            // If not set for today, retrieve the most recent active board rate
            if (rate == null)
            {
                rate = await _context.DailyMetalRates
                    .AsNoTracking()
                    .Where(r => r.TenantId == TenantId && r.IsActive)
                    .OrderByDescending(r => r.RateDate)
                    .ThenByDescending(r => r.CreatedAtUtc)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            // If no rate exists at all for this store, supply standard benchmark initial rate
            if (rate == null)
            {
                var benchmark = new DailyMetalRateDto(
                    Id: Guid.Empty,
                    RateDate: today,
                    Gold24K_Per10g: 74500m,
                    Gold22K_Per10g: 68300m,
                    Gold18K_Per10g: 55875m,
                    Gold14K_Per10g: 43450m,
                    Silver999_PerKg: 91000m,
                    Silver925_PerKg: 84000m,
                    Platinum950_Per10g: 34500m,
                    OldGoldBuyingRate24K_Per1g: 7200m,
                    OldSilverBuyingRate_Per1g: 82m,
                    IsActive: true,
                    SourceNote: "Default Indian Bullion Benchmark (Configure store rates)"
                );
                return Result<DailyMetalRateDto>.Success(benchmark);
            }

            return Result<DailyMetalRateDto>.Success(MapToRateDto(rate));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching daily metal rate for tenant {TenantId}", TenantId);
            return Result<DailyMetalRateDto>.Failure("Failed to retrieve daily board rate.");
        }
    }

    public async Task<Result<DailyMetalRateDto>> SetDailyRateAsync(SetDailyMetalRateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var targetDate = request.RateDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // Deactivate existing rates for the target date
            var existingRates = await _context.DailyMetalRates
                .Where(r => r.TenantId == TenantId && r.RateDate == targetDate)
                .ToListAsync(cancellationToken);

            foreach (var r in existingRates)
            {
                r.IsActive = false;
            }

            var newRate = new DailyMetalRate
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                RateDate = targetDate,
                Gold24K_Per10g = Math.Max(0m, request.Gold24K_Per10g),
                Gold22K_Per10g = Math.Max(0m, request.Gold22K_Per10g),
                Gold18K_Per10g = Math.Max(0m, request.Gold18K_Per10g),
                Gold14K_Per10g = Math.Max(0m, request.Gold14K_Per10g),
                Silver999_PerKg = Math.Max(0m, request.Silver999_PerKg),
                Silver925_PerKg = Math.Max(0m, request.Silver925_PerKg),
                Platinum950_Per10g = Math.Max(0m, request.Platinum950_Per10g),
                OldGoldBuyingRate24K_Per1g = Math.Max(0m, request.OldGoldBuyingRate24K_Per1g),
                OldSilverBuyingRate_Per1g = Math.Max(0m, request.OldSilverBuyingRate_Per1g),
                IsActive = true,
                SourceNote = request.SourceNote ?? "Daily Rate Board Update"
            };

            _context.DailyMetalRates.Add(newRate);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Daily board rate updated for tenant {TenantId} on {Date}", TenantId, targetDate);
            return Result<DailyMetalRateDto>.Success(MapToRateDto(newRate));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting daily metal rate for tenant {TenantId}", TenantId);
            return Result<DailyMetalRateDto>.Failure("Failed to update daily metal rate board.");
        }
    }

    public async Task<Result<IReadOnlyList<DailyMetalRateDto>>> GetRateHistoryAsync(int days = 30, CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));
            var rates = await _context.DailyMetalRates
                .AsNoTracking()
                .Where(r => r.TenantId == TenantId && r.RateDate >= cutoff)
                .OrderByDescending(r => r.RateDate)
                .ThenByDescending(r => r.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            var dtoList = rates.Select(MapToRateDto).ToList();
            return Result<IReadOnlyList<DailyMetalRateDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching rate history for tenant {TenantId}", TenantId);
            return Result<IReadOnlyList<DailyMetalRateDto>>.Failure("Failed to load metal rate history.");
        }
    }

    private static DailyMetalRateDto MapToRateDto(DailyMetalRate r) =>
        new(
            r.Id,
            r.RateDate,
            r.Gold24K_Per10g,
            r.Gold22K_Per10g,
            r.Gold18K_Per10g,
            r.Gold14K_Per10g,
            r.Silver999_PerKg,
            r.Silver925_PerKg,
            r.Platinum950_Per10g,
            r.OldGoldBuyingRate24K_Per1g,
            r.OldSilverBuyingRate_Per1g,
            r.IsActive,
            r.SourceNote
        );

    #endregion

    #region 2. Jewellery Item Attributes & Diamonds

    public async Task<Result<JewelleryItemAttributeDto>> GetItemAttributeAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        try
        {
            var attr = await _context.JewelleryItemAttributes
                .Include(a => a.DiamondDetails)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.TenantId == TenantId && a.ItemId == itemId, cancellationToken);

            if (attr == null)
            {
                return Result<JewelleryItemAttributeDto>.Failure("Jewellery attribute not found for item.");
            }

            return Result<JewelleryItemAttributeDto>.Success(MapToAttributeDto(attr));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting jewellery attribute for item {ItemId}", itemId);
            return Result<JewelleryItemAttributeDto>.Failure("Failed to retrieve jewellery specifications.");
        }
    }

    public async Task<Result<JewelleryItemAttributeDto>> SaveItemAttributeAsync(SaveJewelleryItemAttributeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var attr = await _context.JewelleryItemAttributes
                .Include(a => a.DiamondDetails)
                .FirstOrDefaultAsync(a => a.TenantId == TenantId && a.ItemId == request.ItemId, cancellationToken);

            var netWeight = Math.Max(0m, request.GrossWeight - request.StoneWeight);
            var wastageGrams = Math.Round(netWeight * (request.WastagePercentage / 100m), 3, MidpointRounding.AwayFromZero);

            if (attr == null)
            {
                attr = new JewelleryItemAttribute
                {
                    Id = Guid.NewGuid(),
                    TenantId = TenantId,
                    ItemId = request.ItemId,
                    JewelleryType = request.JewelleryType,
                    MetalType = request.MetalType,
                    PurityKarat = request.PurityKarat ?? "22K",
                    PurityPercentage = request.PurityPercentage > 0 ? request.PurityPercentage : 91.60m,
                    GrossWeight = request.GrossWeight,
                    StoneWeight = request.StoneWeight,
                    NetWeight = netWeight,
                    WastagePercentage = request.WastagePercentage,
                    WastageGrams = wastageGrams,
                    MakingChargeType = request.MakingChargeType,
                    MakingChargeRate = request.MakingChargeRate,
                    HUID = request.HUID?.Trim().ToUpperInvariant(),
                    HallmarkingCenter = request.HallmarkingCenter,
                    CertificateNumber = request.CertificateNumber,
                    ImitationColorFinish = request.ImitationColorFinish,
                    PiecesPerBox = Math.Max(1, request.PiecesPerBox)
                };

                _context.JewelleryItemAttributes.Add(attr);
            }
            else
            {
                attr.JewelleryType = request.JewelleryType;
                attr.MetalType = request.MetalType;
                attr.PurityKarat = request.PurityKarat ?? "22K";
                attr.PurityPercentage = request.PurityPercentage > 0 ? request.PurityPercentage : 91.60m;
                attr.GrossWeight = request.GrossWeight;
                attr.StoneWeight = request.StoneWeight;
                attr.NetWeight = netWeight;
                attr.WastagePercentage = request.WastagePercentage;
                attr.WastageGrams = wastageGrams;
                attr.MakingChargeType = request.MakingChargeType;
                attr.MakingChargeRate = request.MakingChargeRate;
                attr.HUID = request.HUID?.Trim().ToUpperInvariant();
                attr.HallmarkingCenter = request.HallmarkingCenter;
                attr.CertificateNumber = request.CertificateNumber;
                attr.ImitationColorFinish = request.ImitationColorFinish;
                attr.PiecesPerBox = Math.Max(1, request.PiecesPerBox);
            }

            // Sync diamond gemstone details
            if (request.Diamonds != null)
            {
                _context.DiamondGemstoneDetails.RemoveRange(attr.DiamondDetails);
                attr.DiamondDetails.Clear();

                foreach (var d in request.Diamonds)
                {
                    var cents = Math.Round(d.WeightCarats * 100m, 2, MidpointRounding.AwayFromZero);
                    var totalAmt = Math.Round(d.WeightCarats * d.RatePerCarat, 2, MidpointRounding.AwayFromZero);

                    attr.DiamondDetails.Add(new DiamondGemstoneDetail
                    {
                        Id = Guid.NewGuid(),
                        TenantId = TenantId,
                        JewelleryItemAttributeId = attr.Id,
                        StoneType = d.StoneType,
                        Cut = d.Cut ?? "Round",
                        Clarity = d.Clarity ?? "VVS1",
                        Color = d.Color ?? "E-F",
                        PiecesCount = Math.Max(1, d.PiecesCount),
                        WeightCarats = d.WeightCarats,
                        WeightCents = cents,
                        RatePerCarat = d.RatePerCarat,
                        TotalAmount = totalAmt,
                        CertNumber = d.CertNumber
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Result<JewelleryItemAttributeDto>.Success(MapToAttributeDto(attr));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving jewellery attribute for item {ItemId}", request.ItemId);
            return Result<JewelleryItemAttributeDto>.Failure("Failed to save jewellery specifications.");
        }
    }

    private static JewelleryItemAttributeDto MapToAttributeDto(JewelleryItemAttribute a) =>
        new(
            a.Id,
            a.ItemId,
            a.JewelleryType,
            a.MetalType,
            a.PurityKarat,
            a.PurityPercentage,
            a.GrossWeight,
            a.StoneWeight,
            a.NetWeight,
            a.WastagePercentage,
            a.WastageGrams,
            a.MakingChargeType,
            a.MakingChargeRate,
            a.HUID,
            a.HallmarkingCenter,
            a.CertificateNumber,
            a.ImitationColorFinish,
            a.PiecesPerBox,
            a.DiamondDetails.Select(d => new DiamondDetailDto(
                d.Id,
                d.StoneType,
                d.Cut,
                d.Clarity,
                d.Color,
                d.PiecesCount,
                d.WeightCarats,
                d.WeightCents,
                d.RatePerCarat,
                d.TotalAmount,
                d.CertNumber
            )).ToList()
        );

    #endregion

    #region 3. 0% Error Calculation Engine

    public async Task<Result<CalculateJewelleryPriceResponse>> CalculateItemPriceAsync(CalculateJewelleryPriceRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            // Case A: Imitation / Fashion Jewellery (Fixed Price / Unit-based)
            if (request.JewelleryType == JewelleryType.ImitationFashion)
            {
                var unitPrice = request.MakingChargeRate; // In imitation, base price is passed in MakingChargeRate
                var taxable = Math.Round(unitPrice * request.Quantity, 2, MidpointRounding.AwayFromZero);
                var gstPct = 3.00m; // Standard Jewellery GST
                var gstAmt = Math.Round(taxable * (gstPct / 100m), 2, MidpointRounding.AwayFromZero);
                var total = taxable + gstAmt;

                return Result<CalculateJewelleryPriceResponse>.Success(new CalculateJewelleryPriceResponse(
                    GrossWeight: request.GrossWeight,
                    StoneWeight: 0m,
                    NetWeight: request.GrossWeight,
                    WastageGrams: 0m,
                    BillableWeight: request.GrossWeight,
                    AppliedMetalRatePer10g: 0m,
                    MetalValue: 0m,
                    MakingCharges: taxable,
                    DiamondTotalAmount: 0m,
                    FineGold24KEquivalent: 0m,
                    TaxableAmount: taxable,
                    GstRatePercent: gstPct,
                    GstAmount: gstAmt,
                    GrandTotal: total
                ));
            }

            // Case B: Precious Metal (Gold / Diamond / Silver / Platinum)
            var netWeight = Math.Max(0m, request.GrossWeight - request.StoneWeight);
            var wastageGrams = Math.Round(netWeight * (request.WastagePercentage / 100m), 3, MidpointRounding.AwayFromZero);
            var billableWeight = netWeight + wastageGrams;

            // Resolve Applied Metal Rate
            decimal ratePer10g = 0m;
            decimal ratePerGram = 0m;

            if (request.OverrideMetalRatePer10g.HasValue && request.OverrideMetalRatePer10g.Value > 0)
            {
                ratePer10g = request.OverrideMetalRatePer10g.Value;
                ratePerGram = ratePer10g / 10m;
            }
            else
            {
                var todayRateResult = await GetTodayRateAsync(cancellationToken);
                var board = todayRateResult.Data ?? new DailyMetalRateDto(
                    Guid.Empty, DateOnly.FromDateTime(DateTime.UtcNow),
                    74500m, 68300m, 55875m, 43450m, 91000m, 84000m, 34500m, 7200m, 82m, true, null);

                if (request.MetalType == MetalType.Gold)
                {
                    var pk = (request.PurityKarat ?? "").ToUpperInvariant().Trim();
                    if (pk.Contains("24"))
                    {
                        ratePer10g = board.Gold24K_Per10g;
                    }
                    else if (pk.Contains("22"))
                    {
                        ratePer10g = board.Gold22K_Per10g;
                    }
                    else if (pk.Contains("18"))
                    {
                        ratePer10g = board.Gold18K_Per10g;
                    }
                    else if (pk.Contains("14"))
                    {
                        ratePer10g = board.Gold14K_Per10g;
                    }
                    else
                    {
                        var purity = request.PurityPercentage > 0 ? request.PurityPercentage : 91.60m;
                        ratePer10g = Math.Round(board.Gold24K_Per10g * (purity / 100m), 2, MidpointRounding.AwayFromZero);
                    }
                    ratePerGram = ratePer10g / 10m;
                }
                else if (request.MetalType == MetalType.Silver)
                {
                    var pk = (request.PurityKarat ?? "").Trim();
                    if (pk.Contains("999"))
                    {
                        ratePerGram = board.Silver999_PerKg / 1000m;
                    }
                    else
                    {
                        ratePerGram = board.Silver925_PerKg / 1000m;
                    }
                    ratePer10g = ratePerGram * 10m;
                }
                else if (request.MetalType == MetalType.Platinum)
                {
                    ratePer10g = board.Platinum950_Per10g;
                    ratePerGram = ratePer10g / 10m;
                }
            }

            // 1. Metal Value = Billable Weight * Rate Per Gram
            var metalValue = Math.Round(billableWeight * ratePerGram, 2, MidpointRounding.AwayFromZero);

            // 2. Making Charges
            decimal makingCharges = 0m;
            switch (request.MakingChargeType)
            {
                case MakingChargeType.PerGram:
                    makingCharges = Math.Round(request.GrossWeight * request.MakingChargeRate, 2, MidpointRounding.AwayFromZero);
                    break;
                case MakingChargeType.Percentage:
                    makingCharges = Math.Round(metalValue * (request.MakingChargeRate / 100m), 2, MidpointRounding.AwayFromZero);
                    break;
                case MakingChargeType.FlatPerPiece:
                    makingCharges = Math.Round(request.MakingChargeRate * request.Quantity, 2, MidpointRounding.AwayFromZero);
                    break;
            }

            // 3. Diamond Gemstones Total
            var diamondAmount = request.DiamondTotalAmount ?? 0m;

            // 4. Fine Gold Equivalent (24K Pure Eqv)
            var effectivePurity = request.PurityPercentage > 0 ? request.PurityPercentage : 91.60m;
            var fineGoldEqv = Math.Round(netWeight * (effectivePurity / 100m), 3, MidpointRounding.AwayFromZero);

            // 5. Total Taxable Amount
            var singleItemTaxable = metalValue + makingCharges + diamondAmount;
            var taxableTotal = Math.Round(singleItemTaxable * request.Quantity, 2, MidpointRounding.AwayFromZero);

            // 6. GST Calculation (Mandatory 3.00% on Jewellery in India)
            var gstRate = 3.00m;
            var gstAmount = Math.Round(taxableTotal * (gstRate / 100m), 2, MidpointRounding.AwayFromZero);
            var grandTotal = taxableTotal + gstAmount;

            var response = new CalculateJewelleryPriceResponse(
                GrossWeight: request.GrossWeight,
                StoneWeight: request.StoneWeight,
                NetWeight: netWeight,
                WastageGrams: wastageGrams,
                BillableWeight: billableWeight,
                AppliedMetalRatePer10g: ratePer10g,
                MetalValue: metalValue,
                MakingCharges: makingCharges,
                DiamondTotalAmount: diamondAmount,
                FineGold24KEquivalent: fineGoldEqv,
                TaxableAmount: taxableTotal,
                GstRatePercent: gstRate,
                GstAmount: gstAmount,
                GrandTotal: grandTotal
            );

            return Result<CalculateJewelleryPriceResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing jewellery price calculation");
            return Result<CalculateJewelleryPriceResponse>.Failure("Calculation error in jewellery pricing engine.");
        }
    }

    public async Task<Result<CalculateOldGoldExchangeResponse>> CalculateOldGoldExchangeAsync(CalculateOldGoldExchangeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var oldNetWeight = Math.Max(0m, request.OldGrossWeight - request.OldDustStoneWeight);
            var pureWeight = Math.Round(oldNetWeight * (request.MeltingPurityTunch / 100m), 3, MidpointRounding.AwayFromZero);

            decimal appliedRate = 0m;
            if (request.OverrideBuyingRatePerGram.HasValue && request.OverrideBuyingRatePerGram.Value > 0)
            {
                appliedRate = request.OverrideBuyingRatePerGram.Value;
            }
            else
            {
                var todayRateRes = await GetTodayRateAsync(cancellationToken);
                var todayBoard = todayRateRes.Data ?? new DailyMetalRateDto(
                    Guid.Empty, DateOnly.FromDateTime(DateTime.UtcNow),
                    74500m, 68300m, 55875m, 43450m, 91000m, 84000m, 34500m, 7200m, 82m, true, null);

                appliedRate = request.MetalType == MetalType.Silver 
                    ? todayBoard.OldSilverBuyingRate_Per1g 
                    : todayBoard.OldGoldBuyingRate24K_Per1g;
            }

            var totalValuation = Math.Round(pureWeight * appliedRate, 2, MidpointRounding.AwayFromZero);

            var result = new CalculateOldGoldExchangeResponse(
                OldGrossWeight: request.OldGrossWeight,
                OldDustStoneWeight: request.OldDustStoneWeight,
                OldNetWeight: oldNetWeight,
                MeltingPurityTunch: request.MeltingPurityTunch,
                PureWeightEquivalent: pureWeight,
                AppliedBuyingRatePerGram: appliedRate,
                TotalExchangeValuation: totalValuation
            );

            return Result<CalculateOldGoldExchangeResponse>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating old gold exchange valuation");
            return Result<CalculateOldGoldExchangeResponse>.Failure("Failed to calculate old gold valuation.");
        }
    }

    #endregion

    #region 4. Old Gold Exchange / Scrap Buyback Vouchers

    public async Task<Result<OldGoldExchangeVoucherDto>> CreateOldGoldVoucherAsync(CreateOldGoldExchangeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var calcResult = await CalculateOldGoldExchangeAsync(new CalculateOldGoldExchangeRequest(
                request.MetalType,
                request.OldGrossWeight,
                request.OldDustStoneWeight,
                request.MeltingPurityTunch,
                request.OverrideBuyingRatePerGram
            ), cancellationToken);

            var calc = calcResult.Data ?? new CalculateOldGoldExchangeResponse(
                request.OldGrossWeight, request.OldDustStoneWeight,
                request.OldGrossWeight - request.OldDustStoneWeight,
                request.MeltingPurityTunch, 0m, 0m, 0m);

            var seq = await _context.OldGoldExchangeVouchers.CountAsync(v => v.TenantId == TenantId, cancellationToken) + 1;
            var voucherNum = $"OGE-{DateTime.UtcNow:yyyyMMdd}-{seq:D4}";

            var voucher = new OldGoldExchangeVoucher
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                VoucherNumber = voucherNum,
                PartyId = request.PartyId,
                InvoiceId = request.InvoiceId,
                CustomerName = request.CustomerName,
                CustomerMobile = request.CustomerMobile,
                CustomerPanAadhaar = request.CustomerPanAadhaar,
                ItemDescription = request.ItemDescription ?? "Old Ornaments Exchange",
                MetalType = request.MetalType,
                OldGrossWeight = calc.OldGrossWeight,
                OldDustStoneWeight = calc.OldDustStoneWeight,
                OldNetWeight = calc.OldNetWeight,
                MeltingPurityTunch = calc.MeltingPurityTunch,
                PureWeightEquivalent = calc.PureWeightEquivalent,
                BuyingRatePerGram = calc.AppliedBuyingRatePerGram,
                TotalExchangeValuation = calc.TotalExchangeValuation,
                TestingMethod = request.TestingMethod ?? "Karattometer_XRF",
                Status = request.Status,
                Notes = request.Notes
            };

            _context.OldGoldExchangeVouchers.Add(voucher);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Old Gold Voucher {VoucherNum} created for tenant {TenantId}, valuation: {Val}", voucherNum, TenantId, calc.TotalExchangeValuation);
            return Result<OldGoldExchangeVoucherDto>.Success(MapToOldGoldDto(voucher));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating old gold exchange voucher for tenant {TenantId}", TenantId);
            return Result<OldGoldExchangeVoucherDto>.Failure("Failed to record old gold exchange voucher.");
        }
    }

    public async Task<Result<IReadOnlyList<OldGoldExchangeVoucherDto>>> GetOldGoldVouchersAsync(Guid? invoiceId = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.OldGoldExchangeVouchers.AsNoTracking().Where(v => v.TenantId == TenantId);
            if (invoiceId.HasValue && invoiceId.Value != Guid.Empty)
            {
                q = q.Where(v => v.InvoiceId == invoiceId.Value);
            }

            var vouchers = await q
                .OrderByDescending(v => v.CreatedAtUtc)
                .Take(100)
                .ToListAsync(cancellationToken);

            var dtoList = vouchers.Select(MapToOldGoldDto).ToList();
            return Result<IReadOnlyList<OldGoldExchangeVoucherDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing old gold vouchers for tenant {TenantId}", TenantId);
            return Result<IReadOnlyList<OldGoldExchangeVoucherDto>>.Failure("Failed to retrieve old gold vouchers.");
        }
    }

    private static OldGoldExchangeVoucherDto MapToOldGoldDto(OldGoldExchangeVoucher v) =>
        new(
            v.Id,
            v.VoucherNumber,
            v.PartyId,
            v.InvoiceId,
            v.CustomerName,
            v.CustomerMobile,
            v.CustomerPanAadhaar,
            v.ItemDescription,
            v.MetalType,
            v.OldGrossWeight,
            v.OldDustStoneWeight,
            v.OldNetWeight,
            v.MeltingPurityTunch,
            v.PureWeightEquivalent,
            v.BuyingRatePerGram,
            v.TotalExchangeValuation,
            v.TestingMethod,
            v.Status,
            v.Notes,
            v.CreatedAtUtc
        );

    #endregion

    #region 5. Karigar Artisan Ledger

    public async Task<Result<IReadOnlyList<KarigarAccountDto>>> GetKarigarsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var list = await _context.KarigarAccounts
                .AsNoTracking()
                .Where(k => k.TenantId == TenantId && k.IsActive)
                .OrderBy(k => k.Name)
                .ToListAsync(cancellationToken);

            var dtoList = list.Select(k => new KarigarAccountDto(
                k.Id,
                k.Code,
                k.Name,
                k.Mobile,
                k.Address,
                k.City,
                k.Speciality,
                k.PureGoldBalanceGrams,
                k.PureSilverBalanceGrams,
                k.LabourBalanceRupees,
                k.IsActive
            )).ToList();

            return Result<IReadOnlyList<KarigarAccountDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching karigars for tenant {TenantId}", TenantId);
            return Result<IReadOnlyList<KarigarAccountDto>>.Failure("Failed to load karigar accounts.");
        }
    }

    public async Task<Result<KarigarAccountDto>> CreateKarigarAsync(CreateKarigarAccountRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await _context.KarigarAccounts.CountAsync(k => k.TenantId == TenantId, cancellationToken) + 1;
            var code = $"KRG-{count:D3}";

            var karigar = new KarigarAccount
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                Code = code,
                Name = request.Name.Trim(),
                Mobile = request.Mobile.Trim(),
                Address = request.Address,
                City = request.City,
                Speciality = request.Speciality,
                PureGoldBalanceGrams = 0m,
                PureSilverBalanceGrams = 0m,
                LabourBalanceRupees = 0m,
                IsActive = true
            };

            _context.KarigarAccounts.Add(karigar);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Karigar {Name} ({Code}) added for tenant {TenantId}", karigar.Name, karigar.Code, TenantId);
            return Result<KarigarAccountDto>.Success(new KarigarAccountDto(
                karigar.Id,
                karigar.Code,
                karigar.Name,
                karigar.Mobile,
                karigar.Address,
                karigar.City,
                karigar.Speciality,
                karigar.PureGoldBalanceGrams,
                karigar.PureSilverBalanceGrams,
                karigar.LabourBalanceRupees,
                karigar.IsActive
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating karigar account for tenant {TenantId}", TenantId);
            return Result<KarigarAccountDto>.Failure("Failed to create karigar account.");
        }
    }

    public async Task<Result<KarigarTransactionDto>> AddKarigarTransactionAsync(CreateKarigarTransactionRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var karigar = await _context.KarigarAccounts
                .FirstOrDefaultAsync(k => k.TenantId == TenantId && k.Id == request.KarigarId, cancellationToken);

            if (karigar == null)
            {
                return Result<KarigarTransactionDto>.Failure("Karigar account not found.");
            }

            var fineReceived = Math.Round(request.ReceivedNetWeight * (request.ReceivedPurityPct / 100m), 3, MidpointRounding.AwayFromZero);
            var shortage = 0m;

            if (request.TransactionType == KarigarTransactionType.ReceiveFinishedOrnaments)
            {
                var accountedWeight = fineReceived + request.AllowedWastageWeight;
                // Double-entry balance adjustment:
                // Karigar returned ornaments, so their fine gold balance decreases
                karigar.PureGoldBalanceGrams -= accountedWeight;
                karigar.LabourBalanceRupees += request.LabourCharges;
            }
            else if (request.TransactionType == KarigarTransactionType.IssuePureMetal)
            {
                // Raw gold issued to karigar: their fine gold liability increases
                karigar.PureGoldBalanceGrams += request.IssuePureMetalGrams;
            }
            else if (request.TransactionType == KarigarTransactionType.LabourPayment)
            {
                // Cash/bank payment towards artisan labour charges
                karigar.LabourBalanceRupees -= request.LabourAmountPaid;
            }

            var tx = new KarigarTransaction
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                KarigarId = request.KarigarId,
                TransactionType = request.TransactionType,
                ReferenceNumber = request.ReferenceNumber ?? $"KTX-{DateTime.UtcNow:yyyyMMddHHmmss}",
                IssuePureMetalGrams = request.IssuePureMetalGrams,
                ReceivedGrossWeight = request.ReceivedGrossWeight,
                ReceivedNetWeight = request.ReceivedNetWeight,
                ReceivedPurityPct = request.ReceivedPurityPct,
                ReceivedFineWeight = fineReceived,
                AllowedWastageWeight = request.AllowedWastageWeight,
                MetalShortageWeight = shortage,
                LabourCharges = request.LabourCharges,
                LabourAmountPaid = request.LabourAmountPaid,
                Description = request.Description
            };

            _context.KarigarTransactions.Add(tx);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Karigar transaction recorded for {KarigarName}, type: {Type}", karigar.Name, tx.TransactionType);
            return Result<KarigarTransactionDto>.Success(new KarigarTransactionDto(
                tx.Id,
                tx.KarigarId,
                tx.TransactionType,
                tx.ReferenceNumber,
                tx.IssuePureMetalGrams,
                tx.ReceivedGrossWeight,
                tx.ReceivedNetWeight,
                tx.ReceivedPurityPct,
                tx.ReceivedFineWeight,
                tx.AllowedWastageWeight,
                tx.MetalShortageWeight,
                tx.LabourCharges,
                tx.LabourAmountPaid,
                tx.Description,
                tx.CreatedAtUtc
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing karigar transaction for tenant {TenantId}", TenantId);
            return Result<KarigarTransactionDto>.Failure("Failed to record karigar transaction.");
        }
    }

    public async Task<Result<IReadOnlyList<KarigarTransactionDto>>> GetKarigarTransactionsAsync(Guid karigarId, CancellationToken cancellationToken = default)
    {
        try
        {
            var txs = await _context.KarigarTransactions
                .AsNoTracking()
                .Where(t => t.TenantId == TenantId && t.KarigarId == karigarId)
                .OrderByDescending(t => t.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            var dtoList = txs.Select(tx => new KarigarTransactionDto(
                tx.Id,
                tx.KarigarId,
                tx.TransactionType,
                tx.ReferenceNumber,
                tx.IssuePureMetalGrams,
                tx.ReceivedGrossWeight,
                tx.ReceivedNetWeight,
                tx.ReceivedPurityPct,
                tx.ReceivedFineWeight,
                tx.AllowedWastageWeight,
                tx.MetalShortageWeight,
                tx.LabourCharges,
                tx.LabourAmountPaid,
                tx.Description,
                tx.CreatedAtUtc
            )).ToList();

            return Result<IReadOnlyList<KarigarTransactionDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching karigar transactions for {KarigarId}", karigarId);
            return Result<IReadOnlyList<KarigarTransactionDto>>.Failure("Failed to load karigar ledger entries.");
        }
    }

    #endregion

    #region 6. Gold Savings Scheme (Kitty / 11+1)

    public async Task<Result<IReadOnlyList<GoldSavingsSchemeDto>>> GetKittySchemesAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.GoldSavingsSchemes
                .Include(s => s.Installments)
                .AsNoTracking()
                .Where(s => s.TenantId == TenantId);

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<GoldSavingsSchemeStatus>(status, true, out var stEnum))
            {
                q = q.Where(s => s.Status == stEnum);
            }

            var schemes = await q.OrderByDescending(s => s.CreatedAtUtc).ToListAsync(cancellationToken);
            var dtoList = schemes.Select(MapToSchemeDto).ToList();
            return Result<IReadOnlyList<GoldSavingsSchemeDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching gold savings schemes for tenant {TenantId}", TenantId);
            return Result<IReadOnlyList<GoldSavingsSchemeDto>>.Failure("Failed to retrieve gold savings schemes.");
        }
    }

    public async Task<Result<GoldSavingsSchemeDto>> CreateKittySchemeAsync(CreateGoldSavingsSchemeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var months = Math.Max(1, request.TotalMonths);
            var maturity = start.AddMonths(months);
            var bonus = request.JewellerBonusContribution ?? request.MonthlyAmount; // Standard 11+1 gives 1 month bonus

            var count = await _context.GoldSavingsSchemes.CountAsync(s => s.TenantId == TenantId, cancellationToken) + 1;
            var code = $"KTY-{DateTime.UtcNow:yyyy}-{count:D4}";

            var scheme = new GoldSavingsScheme
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                SchemeCode = code,
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName.Trim(),
                CustomerMobile = request.CustomerMobile.Trim(),
                MonthlyAmount = request.MonthlyAmount,
                TotalMonths = months,
                JewellerBonusContribution = bonus,
                StartDate = start,
                MaturityDate = maturity,
                TotalDeposited = 0m,
                InstallmentsPaid = 0,
                Status = GoldSavingsSchemeStatus.Active
            };

            _context.GoldSavingsSchemes.Add(scheme);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("New Gold Savings Scheme {Code} started for {Customer}", scheme.SchemeCode, scheme.CustomerName);
            return Result<GoldSavingsSchemeDto>.Success(MapToSchemeDto(scheme));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating gold savings scheme for tenant {TenantId}", TenantId);
            return Result<GoldSavingsSchemeDto>.Failure("Failed to create gold savings scheme account.");
        }
    }

    public async Task<Result<GoldSavingsInstallmentDto>> AddKittyInstallmentAsync(Guid schemeId, AddSchemeInstallmentRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var scheme = await _context.GoldSavingsSchemes
                .Include(s => s.Installments)
                .FirstOrDefaultAsync(s => s.TenantId == TenantId && s.Id == schemeId, cancellationToken);

            if (scheme == null)
            {
                return Result<GoldSavingsInstallmentDto>.Failure("Gold savings scheme not found.");
            }

            if (scheme.Status != GoldSavingsSchemeStatus.Active)
            {
                return Result<GoldSavingsInstallmentDto>.Failure($"Cannot add installment to scheme in {scheme.Status} status.");
            }

            var nextInstallmentNum = scheme.InstallmentsPaid + 1;
            var receiptNum = $"REC-{scheme.SchemeCode}-{nextInstallmentNum:D2}";

            var inst = new GoldSavingsInstallment
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                SchemeId = scheme.Id,
                InstallmentNumber = nextInstallmentNum,
                PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Amount = request.Amount,
                PaymentMode = request.PaymentMode ?? "UPI",
                ReferenceNumber = request.ReferenceNumber,
                ReceiptNumber = receiptNum
            };

            scheme.InstallmentsPaid = nextInstallmentNum;
            scheme.TotalDeposited += request.Amount;

            if (scheme.InstallmentsPaid >= scheme.TotalMonths)
            {
                scheme.Status = GoldSavingsSchemeStatus.Matured;
            }

            _context.GoldSavingsInstallments.Add(inst);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Installment #{Num} of {Amt} recorded for Scheme {Code}", nextInstallmentNum, request.Amount, scheme.SchemeCode);
            return Result<GoldSavingsInstallmentDto>.Success(new GoldSavingsInstallmentDto(
                inst.Id,
                inst.InstallmentNumber,
                inst.PaymentDate,
                inst.Amount,
                inst.PaymentMode,
                inst.ReferenceNumber,
                inst.ReceiptNumber
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding installment to scheme {SchemeId}", schemeId);
            return Result<GoldSavingsInstallmentDto>.Failure("Failed to record installment payment.");
        }
    }

    public async Task<Result<GoldSavingsSchemeDto>> RedeemKittySchemeAsync(Guid schemeId, RedeemSchemeRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var scheme = await _context.GoldSavingsSchemes
                .Include(s => s.Installments)
                .FirstOrDefaultAsync(s => s.TenantId == TenantId && s.Id == schemeId, cancellationToken);

            if (scheme == null)
            {
                return Result<GoldSavingsSchemeDto>.Failure("Gold savings scheme not found.");
            }

            if (scheme.Status == GoldSavingsSchemeStatus.RedeemedAgainstPurchase)
            {
                return Result<GoldSavingsSchemeDto>.Failure("Scheme has already been redeemed.");
            }

            scheme.Status = GoldSavingsSchemeStatus.RedeemedAgainstPurchase;
            scheme.RedeemedInvoiceId = request.InvoiceId;

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Scheme {Code} redeemed against invoice {InvoiceId}", scheme.SchemeCode, request.InvoiceId);

            return Result<GoldSavingsSchemeDto>.Success(MapToSchemeDto(scheme));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error redeeming scheme {SchemeId}", schemeId);
            return Result<GoldSavingsSchemeDto>.Failure("Failed to redeem gold savings scheme.");
        }
    }

    private static GoldSavingsSchemeDto MapToSchemeDto(GoldSavingsScheme s) =>
        new(
            s.Id,
            s.SchemeCode,
            s.CustomerId,
            s.CustomerName,
            s.CustomerMobile,
            s.MonthlyAmount,
            s.TotalMonths,
            s.JewellerBonusContribution,
            s.StartDate,
            s.MaturityDate,
            s.TotalDeposited,
            s.InstallmentsPaid,
            s.Status,
            s.RedeemedInvoiceId,
            s.Installments.Select(i => new GoldSavingsInstallmentDto(
                i.Id,
                i.InstallmentNumber,
                i.PaymentDate,
                i.Amount,
                i.PaymentMode,
                i.ReferenceNumber,
                i.ReceiptNumber
            )).OrderBy(i => i.InstallmentNumber).ToList()
        );

    #endregion

    #region 7. Girvi / Gold Loan

    public async Task<Result<IReadOnlyList<GirviLoanDto>>> GetGirviLoansAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.GirviLoans.AsNoTracking().Where(g => g.TenantId == TenantId);

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<GirviStatus>(status, true, out var stEnum))
            {
                q = q.Where(g => g.Status == stEnum);
            }

            var loans = await q.OrderByDescending(g => g.CreatedAtUtc).ToListAsync(cancellationToken);
            var dtoList = loans.Select(MapToGirviDto).ToList();
            return Result<IReadOnlyList<GirviLoanDto>>.Success(dtoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching girvi loans for tenant {TenantId}", TenantId);
            return Result<IReadOnlyList<GirviLoanDto>>.Failure("Failed to load girvi loans.");
        }
    }

    public async Task<Result<GirviLoanDto>> CreateGirviLoanAsync(CreateGirviLoanRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await _context.GirviLoans.CountAsync(g => g.TenantId == TenantId, cancellationToken) + 1;
            var girviNum = $"GRV-{DateTime.UtcNow:yyyy}-{count:D4}";

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var dueDate = today.AddMonths(Math.Max(1, request.LoanDurationMonths));

            // Estimate market valuation using today's 22K rate
            var todayBoardRes = await GetTodayRateAsync(cancellationToken);
            var todayBoard = todayBoardRes.Data ?? new DailyMetalRateDto(
                Guid.Empty, DateOnly.FromDateTime(DateTime.UtcNow),
                74500m, 68300m, 55875m, 43450m, 91000m, 84000m, 34500m, 7200m, 82m, true, null);

            var goldRatePerGram = todayBoard.Gold22K_Per10g / 10m;
            var estValuation = Math.Round(request.NetWeight * goldRatePerGram, 2, MidpointRounding.AwayFromZero);

            var loan = new GirviLoan
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                GirviNumber = girviNum,
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName.Trim(),
                CustomerMobile = request.CustomerMobile.Trim(),
                CustomerAddress = request.CustomerAddress,
                CustomerAadhaarPan = request.CustomerAadhaarPan,
                PledgedOrnamentsDescription = request.PledgedOrnamentsDescription,
                TotalPledgedItemsCount = Math.Max(1, request.TotalPledgedItemsCount),
                GrossWeight = request.GrossWeight,
                NetWeight = request.NetWeight,
                EstimatedMarketValuation = estValuation,
                PrincipalAmount = request.PrincipalAmount,
                MonthlyInterestRatePct = request.MonthlyInterestRatePct > 0 ? request.MonthlyInterestRatePct : 1.50m,
                LoanDate = today,
                DueDate = dueDate,
                Status = GirviStatus.OpenActive,
                SafeVaultLockerNumber = request.SafeVaultLockerNumber,
                Notes = request.Notes
            };

            _context.GirviLoans.Add(loan);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Girvi loan {Num} created for {Customer}, Principal: {Princ}", loan.GirviNumber, loan.CustomerName, loan.PrincipalAmount);
            return Result<GirviLoanDto>.Success(MapToGirviDto(loan));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating girvi loan for tenant {TenantId}", TenantId);
            return Result<GirviLoanDto>.Failure("Failed to record girvi pledge loan.");
        }
    }

    public async Task<Result<GirviLoanDto>> RedeemGirviLoanAsync(Guid loanId, RedeemGirviLoanRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var loan = await _context.GirviLoans
                .FirstOrDefaultAsync(g => g.TenantId == TenantId && g.Id == loanId, cancellationToken);

            if (loan == null)
            {
                return Result<GirviLoanDto>.Failure("Girvi loan record not found.");
            }

            if (loan.Status == GirviStatus.PrincipalRedeemed)
            {
                return Result<GirviLoanDto>.Failure("Girvi loan has already been redeemed.");
            }

            loan.TotalPrincipalReturned += request.PrincipalPaid;
            loan.TotalInterestCollected += request.InterestPaid;
            loan.RedeemedDate = DateOnly.FromDateTime(DateTime.UtcNow);
            loan.Status = GirviStatus.PrincipalRedeemed;

            if (!string.IsNullOrWhiteSpace(request.Notes))
            {
                loan.Notes = string.IsNullOrWhiteSpace(loan.Notes) 
                    ? request.Notes 
                    : $"{loan.Notes} | Settlement: {request.Notes}";
            }

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Girvi loan {Num} successfully redeemed and pledged items released.", loan.GirviNumber);

            return Result<GirviLoanDto>.Success(MapToGirviDto(loan));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error redeeming girvi loan {LoanId}", loanId);
            return Result<GirviLoanDto>.Failure("Failed to settle and redeem girvi loan.");
        }
    }

    private static GirviLoanDto MapToGirviDto(GirviLoan g) =>
        new(
            g.Id,
            g.GirviNumber,
            g.CustomerId,
            g.CustomerName,
            g.CustomerMobile,
            g.CustomerAddress,
            g.CustomerAadhaarPan,
            g.PledgedOrnamentsDescription,
            g.TotalPledgedItemsCount,
            g.GrossWeight,
            g.NetWeight,
            g.EstimatedMarketValuation,
            g.PrincipalAmount,
            g.MonthlyInterestRatePct,
            g.LoanDate,
            g.DueDate,
            g.RedeemedDate,
            g.TotalInterestCollected,
            g.TotalPrincipalReturned,
            g.Status,
            g.SafeVaultLockerNumber,
            g.Notes
        );

    #endregion
}
