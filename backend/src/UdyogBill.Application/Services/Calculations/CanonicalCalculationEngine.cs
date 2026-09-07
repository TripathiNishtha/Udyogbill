using System;
using System.Collections.Generic;
using System.Linq;

namespace UdyogBill.Application.Services.Calculations;

public record LineCalculationInput(
    decimal Quantity,
    decimal FreeQuantity,
    decimal UnitPrice,
    bool IsTaxInclusive,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal GstRate,
    decimal CessRate,
    bool IsIntraState,
    decimal? ConversionRatio = 1m
);

public record LineCalculationResult(
    decimal Quantity,
    decimal FreeQuantity,
    decimal TotalPhysicalQuantity,
    decimal UnitPrice,
    decimal GrossAmount,
    decimal ItemDiscountAmount,
    decimal TaxableAmount,
    decimal GstRate,
    decimal CgstRate,
    decimal CgstAmount,
    decimal SgstRate,
    decimal SgstAmount,
    decimal IgstRate,
    decimal IgstAmount,
    decimal CessRate,
    decimal CessAmount,
    decimal LineTotalAmount,
    decimal NetEffectiveRate
);

public record InvoiceTotalsResult(
    decimal SubTotal,
    decimal ItemDiscountTotal,
    decimal InvoiceDiscountAmount,
    decimal TaxableAmount,
    decimal CgstAmount,
    decimal SgstAmount,
    decimal IgstAmount,
    decimal CessAmount,
    decimal RoundOff,
    decimal RoundedTotal
);

public interface ICanonicalCalculationEngine
{
    LineCalculationResult CalculateLine(LineCalculationInput input);
    (IReadOnlyList<LineCalculationResult> Lines, InvoiceTotalsResult Totals) CalculateInvoice(
        IReadOnlyList<LineCalculationInput> lines,
        decimal invoiceDiscountPercent,
        decimal invoiceDiscountAmount,
        bool isIntraState,
        decimal additionalCharges = 0m
    );
    decimal CalculateCogs(decimal openingStockValue, decimal purchasesInwardValue, decimal closingStockValue);
    decimal CalculateNetEffectiveReturnRate(decimal originalTaxableAmount, decimal originalPaidQty, decimal originalFreeQty);
}

public class CanonicalCalculationEngine : ICanonicalCalculationEngine
{
    public LineCalculationResult CalculateLine(LineCalculationInput input)
    {
        var qty = Math.Max(0m, input.Quantity);
        var freeQty = Math.Max(0m, input.FreeQuantity);
        var unitPrice = Math.Max(0m, input.UnitPrice);
        var conversion = (input.ConversionRatio.HasValue && input.ConversionRatio.Value > 0)
            ? input.ConversionRatio.Value
            : 1m;

        // BUG-001 & BUG-004: Physical stock deduction accounts for FreeQuantity and Unit Conversion
        var totalPhysicalQty = (qty + freeQty) * conversion;

        var gross = Math.Round(qty * unitPrice, 4);

        var itemDiscAmt = input.DiscountAmount > 0
            ? Math.Min(gross, input.DiscountAmount)
            : (input.DiscountPercent > 0 ? Math.Round(gross * (input.DiscountPercent / 100m), 4) : 0m);

        var netLine = Math.Max(0m, gross - itemDiscAmt);

        // BUG-002: Tax-Inclusive extraction via divisor (1 + taxRate)
        decimal taxable;
        if (input.IsTaxInclusive)
        {
            var combinedTaxRate = (input.GstRate + input.CessRate) / 100m;
            taxable = combinedTaxRate > 0
                ? Math.Round(netLine / (1m + combinedTaxRate), 4)
                : netLine;
        }
        else
        {
            taxable = netLine;
        }

        decimal cgstRate = 0m, cgstAmt = 0m;
        decimal sgstRate = 0m, sgstAmt = 0m;
        decimal igstRate = 0m, igstAmt = 0m;

        if (input.IsIntraState)
        {
            cgstRate = input.GstRate / 2m;
            sgstRate = input.GstRate / 2m;
            cgstAmt = Math.Round(taxable * (cgstRate / 100m), 4);
            sgstAmt = Math.Round(taxable * (sgstRate / 100m), 4);
        }
        else
        {
            igstRate = input.GstRate;
            igstAmt = Math.Round(taxable * (igstRate / 100m), 4);
        }

        var cessAmt = input.CessRate > 0 ? Math.Round(taxable * (input.CessRate / 100m), 4) : 0m;
        var lineTotal = taxable + cgstAmt + sgstAmt + igstAmt + cessAmt;

        // BUG-010: Net Effective Rate across all delivered physical units
        var totalDeliveredUnits = qty + freeQty;
        var effectiveRate = totalDeliveredUnits > 0
            ? Math.Round(taxable / totalDeliveredUnits, 6)
            : 0m;

        return new LineCalculationResult(
            Quantity: qty,
            FreeQuantity: freeQty,
            TotalPhysicalQuantity: totalPhysicalQty,
            UnitPrice: unitPrice,
            GrossAmount: gross,
            ItemDiscountAmount: itemDiscAmt,
            TaxableAmount: taxable,
            GstRate: input.GstRate,
            CgstRate: cgstRate,
            CgstAmount: cgstAmt,
            SgstRate: sgstRate,
            SgstAmount: sgstAmt,
            IgstRate: igstRate,
            IgstAmount: igstAmt,
            CessRate: input.CessRate,
            CessAmount: cessAmt,
            LineTotalAmount: lineTotal,
            NetEffectiveRate: effectiveRate
        );
    }

    public (IReadOnlyList<LineCalculationResult> Lines, InvoiceTotalsResult Totals) CalculateInvoice(
        IReadOnlyList<LineCalculationInput> lines,
        decimal invoiceDiscountPercent,
        decimal invoiceDiscountAmount,
        bool isIntraState,
        decimal additionalCharges = 0m)
    {
        if (lines == null || lines.Count == 0)
        {
            return (Array.Empty<LineCalculationResult>(), new InvoiceTotalsResult(0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
        }

        // Pass 1: Compute initial line figures
        var initialResults = lines.Select(l => CalculateLine(l)).ToList();

        var subTotal = initialResults.Sum(l => l.GrossAmount);
        var itemDiscountTotal = initialResults.Sum(l => l.ItemDiscountAmount);
        var initialTaxableTotal = initialResults.Sum(l => l.TaxableAmount);

        // BUG-003 & BUG-005: Determine authoritative invoice discount (Percent or Flat Rupee)
        decimal effectiveInvDiscount = 0m;
        if (invoiceDiscountAmount > 0)
        {
            effectiveInvDiscount = Math.Min(initialTaxableTotal, invoiceDiscountAmount);
        }
        else if (invoiceDiscountPercent > 0)
        {
            effectiveInvDiscount = Math.Round(initialTaxableTotal * (invoiceDiscountPercent / 100m), 4);
        }

        var finalLines = new List<LineCalculationResult>();

        if (effectiveInvDiscount > 0 && initialTaxableTotal > 0)
        {
            // Pass 2: Allocate invoice discount proportionally across lines and recompute GST
            decimal allocatedSoFar = 0m;
            for (int i = 0; i < initialResults.Count; i++)
            {
                var line = initialResults[i];
                decimal lineDiscount;

                if (i == initialResults.Count - 1)
                {
                    // Reconcile residual round-off penny to guarantee SUM(line discounts) == effectiveInvDiscount
                    lineDiscount = effectiveInvDiscount - allocatedSoFar;
                }
                else
                {
                    lineDiscount = Math.Round(effectiveInvDiscount * (line.TaxableAmount / initialTaxableTotal), 4);
                    allocatedSoFar += lineDiscount;
                }

                var adjustedTaxable = Math.Max(0m, line.TaxableAmount - lineDiscount);

                decimal cgstAmt = 0m, sgstAmt = 0m, igstAmt = 0m;
                if (isIntraState)
                {
                    cgstAmt = Math.Round(adjustedTaxable * (line.CgstRate / 100m), 4);
                    sgstAmt = Math.Round(adjustedTaxable * (line.SgstRate / 100m), 4);
                }
                else
                {
                    igstAmt = Math.Round(adjustedTaxable * (line.IgstRate / 100m), 4);
                }
                var cessAmt = line.CessRate > 0 ? Math.Round(adjustedTaxable * (line.CessRate / 100m), 4) : 0m;
                var lineTotal = adjustedTaxable + cgstAmt + sgstAmt + igstAmt + cessAmt;

                var totalDelivered = line.Quantity + line.FreeQuantity;
                var effectiveRate = totalDelivered > 0 ? Math.Round(adjustedTaxable / totalDelivered, 6) : 0m;

                finalLines.Add(line with
                {
                    TaxableAmount = adjustedTaxable,
                    CgstAmount = cgstAmt,
                    SgstAmount = sgstAmt,
                    IgstAmount = igstAmt,
                    CessAmount = cessAmt,
                    LineTotalAmount = lineTotal,
                    NetEffectiveRate = effectiveRate
                });
            }
        }
        else
        {
            finalLines = initialResults;
        }

        var finalTaxableTotal = finalLines.Sum(l => l.TaxableAmount);
        var totalCgst = finalLines.Sum(l => l.CgstAmount);
        var totalSgst = finalLines.Sum(l => l.SgstAmount);
        var totalIgst = finalLines.Sum(l => l.IgstAmount);
        var totalCess = finalLines.Sum(l => l.CessAmount);

        var grossTotalWithTax = finalTaxableTotal + totalCgst + totalSgst + totalIgst + totalCess + additionalCharges;
        var roundedTotal = Math.Round(grossTotalWithTax, 0, MidpointRounding.AwayFromZero);
        var roundOff = roundedTotal - grossTotalWithTax;

        var totals = new InvoiceTotalsResult(
            SubTotal: subTotal,
            ItemDiscountTotal: itemDiscountTotal,
            InvoiceDiscountAmount: effectiveInvDiscount,
            TaxableAmount: finalTaxableTotal,
            CgstAmount: totalCgst,
            SgstAmount: totalSgst,
            IgstAmount: totalIgst,
            CessAmount: totalCess,
            RoundOff: roundOff,
            RoundedTotal: roundedTotal
        );

        return (finalLines, totals);
    }

    public decimal CalculateCogs(decimal openingStockValue, decimal purchasesInwardValue, decimal closingStockValue)
    {
        // AS-2 / Ind AS 2 standard: COGS = Opening Stock + Inward/Purchases - Closing Stock
        return Math.Max(0m, openingStockValue + purchasesInwardValue - closingStockValue);
    }

    public decimal CalculateNetEffectiveReturnRate(decimal originalTaxableAmount, decimal originalPaidQty, decimal originalFreeQty)
    {
        var totalDelivered = originalPaidQty + originalFreeQty;
        if (totalDelivered <= 0) return 0m;
        return Math.Round(originalTaxableAmount / totalDelivered, 6);
    }
}
