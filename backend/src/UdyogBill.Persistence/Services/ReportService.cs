using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUserContext;

    public ReportService(AppDbContext context, ICurrentUserContext currentUserContext)
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

    public async Task<Result<PagedResult<LedgerEntryDto>>> GetLedgerEntriesAsync(
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && !l.IsDeleted)
            .Include(l => l.Party)
            .AsNoTracking();

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(l => l.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(l => l.TransactionDate >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(l => l.TransactionDate <= toUtc);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.TransactionDate)
            .ThenByDescending(l => l.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LedgerEntryDto
            {
                Id = l.Id,
                TransactionDate = l.TransactionDate,
                Description = l.Description ?? string.Empty,
                EntryType = l.EntryType.ToString(),
                ReferenceDocumentType = l.ReferenceDocumentType,
                ReferenceDocumentNumber = l.ReferenceDocumentNumber,
                ReferenceDocumentId = l.ReferenceDocumentId,
                PartyName = l.Party != null ? l.Party.LegalName : "General Ledger",
                PartyId = l.PartyId,
                Debit = l.DebitAmount,
                Credit = l.CreditAmount,
                Balance = l.RunningBalance,
                PaymentMode = l.PaymentMode
            })
            .ToListAsync(cancellationToken);

        return Result<PagedResult<LedgerEntryDto>>.Success(new PagedResult<LedgerEntryDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<LedgerStatementDto>> GetLedgerStatementAsync(
        Guid partyId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<LedgerStatementDto>.Failure("Party not found.", "NOT_FOUND");
        }

        var effectiveFrom = fromDate ?? DateTime.UtcNow.AddMonths(-1).Date;
        var effectiveTo = toDate ?? DateTime.UtcNow.Date;

        var fromUtc = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(effectiveTo.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

        var priorEntries = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.PartyId == partyId && !l.IsDeleted && l.TransactionDate < fromUtc)
            .OrderBy(l => l.TransactionDate)
            .ThenBy(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        decimal openingBalance = party.OpeningBalance;
        if (priorEntries.Count > 0)
        {
            openingBalance = priorEntries.Last().RunningBalance;
        }

        var periodEntries = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.PartyId == partyId && !l.IsDeleted && l.TransactionDate >= fromUtc && l.TransactionDate <= toUtc)
            .OrderBy(l => l.TransactionDate)
            .ThenBy(l => l.CreatedAtUtc)
            .Select(l => new LedgerEntryDto
            {
                Id = l.Id,
                TransactionDate = l.TransactionDate,
                Description = l.Description ?? string.Empty,
                EntryType = l.EntryType.ToString(),
                ReferenceDocumentType = l.ReferenceDocumentType,
                ReferenceDocumentNumber = l.ReferenceDocumentNumber,
                ReferenceDocumentId = l.ReferenceDocumentId,
                PartyName = party.LegalName,
                PartyId = party.Id,
                Debit = l.DebitAmount,
                Credit = l.CreditAmount,
                Balance = l.RunningBalance,
                PaymentMode = l.PaymentMode
            })
            .ToListAsync(cancellationToken);

        decimal totalDebit = periodEntries.Sum(e => e.Debit);
        decimal totalCredit = periodEntries.Sum(e => e.Credit);
        decimal closingBalance = periodEntries.Count > 0 ? periodEntries.Last().Balance : openingBalance;

        var statement = new LedgerStatementDto
        {
            PartyId = party.Id,
            PartyName = party.LegalName,
            PartyGSTIN = party.GSTIN,
            FromDate = effectiveFrom,
            ToDate = effectiveTo,
            OpeningBalance = openingBalance,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            ClosingBalance = closingBalance,
            Entries = periodEntries
        };

        return Result<LedgerStatementDto>.Success(statement);
    }

    public async Task<Result<PnLReportDto>> GetPnLReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var effectiveFrom = fromDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var effectiveTo = toDate ?? DateTime.UtcNow.Date;

        var fromUtc = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(effectiveTo.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

        var salesQuery = _context.SalesInvoices
            .Include(s => s.Items)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.Status != InvoiceStatus.Cancelled && s.InvoiceDate >= fromUtc && s.InvoiceDate <= toUtc);

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && p.Status != PurchaseBillStatus.Cancelled && p.BillDate >= fromUtc && p.BillDate <= toUtc);

        var returnsQuery = _context.SalesReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled && r.ReturnDate >= fromUtc && r.ReturnDate <= toUtc);
        var purchaseReturnsQuery = _context.PurchaseReturns
            .Where(pr => pr.TenantId == tenantId && !pr.IsDeleted && !pr.IsCancelled && pr.ReturnDate >= fromUtc && pr.ReturnDate <= toUtc);

        if (branchId.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.BranchId == branchId.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BranchId == branchId.Value);
            returnsQuery = returnsQuery.Where(r => r.BranchId == branchId.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.BranchId == branchId.Value);
        }

        var sales = await salesQuery.ToListAsync(cancellationToken);
        var purchases = await purchaseQuery.ToListAsync(cancellationToken);
        var salesReturns = await returnsQuery.ToListAsync(cancellationToken);
        var purchaseReturns = await purchaseReturnsQuery.ToListAsync(cancellationToken);

        decimal totalSalesReturns = salesReturns.Sum(r => r.SubTotal);
        decimal totalPurchaseReturns = purchaseReturns.Sum(pr => pr.SubTotal);

        decimal grossSales = sales.Sum(s => s.SubTotal);
        decimal totalDiscount = sales.Sum(s => s.ItemDiscountTotal + s.InvoiceDiscountAmount);
        decimal netSales = Math.Max(0m, sales.Sum(s => s.TaxableAmount) - totalSalesReturns);
        decimal totalPurchases = Math.Max(0m, purchases.Sum(p => p.TaxableAmount) - totalPurchaseReturns);

        // BUG-009: AS-2 Compliant COGS Calculation (NetSales - COGS)
        decimal cogs = sales.SelectMany(s => s.Items).Sum(i => i.Quantity * i.PurchasePrice);
        if (cogs == 0m && purchases.Count > 0)
        {
            cogs = totalPurchases;
        }

        decimal grossProfit = netSales - cogs;
        decimal grossMarginPercent = netSales > 0 ? Math.Round((grossProfit / netSales) * 100m, 2) : 0m;
        decimal operatingExpenses = 0m;
        decimal netProfit = grossProfit - operatingExpenses;
        decimal netMarginPercent = netSales > 0 ? Math.Round((netProfit / netSales) * 100m, 2) : 0m;

        var chartData = new List<PnLChartPoint>();

        var allDates = sales.Select(s => s.InvoiceDate.Date)
            .Union(purchases.Select(p => p.BillDate.Date))
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        if (allDates.Count == 0)
        {
            chartData.Add(new PnLChartPoint
            {
                Period = DateTime.UtcNow.ToString("dd MMM yyyy"),
                Revenue = 0,
                Purchases = 0,
                GrossProfit = 0,
                NetProfit = 0
            });
        }
        else
        {
            foreach (var dt in allDates)
            {
                var daySales = sales.Where(s => s.InvoiceDate.Date == dt).Sum(s => s.TaxableAmount);
                var dayPurchases = purchases.Where(p => p.BillDate.Date == dt).Sum(p => p.TaxableAmount);
                var dayGross = daySales - dayPurchases;

                chartData.Add(new PnLChartPoint
                {
                    Period = dt.ToString("dd MMM"),
                    Revenue = daySales,
                    Purchases = dayPurchases,
                    GrossProfit = dayGross,
                    NetProfit = dayGross
                });
            }
        }

        var report = new PnLReportDto
        {
            FromDate = effectiveFrom,
            ToDate = effectiveTo,
            TotalSalesRevenue = grossSales,
            TotalDiscountGiven = totalDiscount,
            NetSalesRevenue = netSales,
            TotalPurchasesCost = totalPurchases,
            GrossProfit = grossProfit,
            GrossMarginPercent = grossMarginPercent,
            OperatingExpenses = operatingExpenses,
            NetProfit = netProfit,
            NetMarginPercent = netMarginPercent,
            ChartData = chartData
        };

        return Result<PnLReportDto>.Success(report);
    }

    public async Task<Result<Gstr1ReportDto>> GetGstr1ReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var effectiveFrom = fromDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var effectiveTo = toDate ?? DateTime.UtcNow.Date;

        var fromUtc = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(effectiveTo.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var query = _context.SalesInvoices
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.Status != InvoiceStatus.Cancelled && s.InvoiceDate >= fromUtc && s.InvoiceDate <= toUtc)
            .Include(s => s.Items)
                .ThenInclude(i => i.Item)
            .AsNoTracking();

        if (branchId.HasValue)
        {
            query = query.Where(s => s.BranchId == branchId.Value);
        }

        var invoices = await query.ToListAsync(cancellationToken);

        var b2bInvoices = invoices.Where(i => !string.IsNullOrWhiteSpace(i.CustomerGSTIN)).ToList();
        var b2cInvoices = invoices.Where(i => string.IsNullOrWhiteSpace(i.CustomerGSTIN)).ToList();

        // Rate Wise Summary
        var rateGroups = invoices.SelectMany(i => i.Items)
            .GroupBy(item => item.GstRate)
            .OrderBy(g => g.Key);

        var rateWise = new List<GstSummaryRowDto>();
        foreach (var rg in rateGroups)
        {
            var taxVal = rg.Sum(i => i.TaxableAmount);
            var cgst = rg.Sum(i => i.CgstAmount);
            var sgst = rg.Sum(i => i.SgstAmount);
            var igst = rg.Sum(i => i.IgstAmount);
            var totTax = cgst + sgst + igst;

            rateWise.Add(new GstSummaryRowDto
            {
                RateSlab = $"{rg.Key}%",
                TaxableValue = taxVal,
                CgstAmount = cgst,
                SgstAmount = sgst,
                IgstAmount = igst,
                TotalTax = totTax,
                TotalValue = taxVal + totTax
            });
        }

        // HSN Summary
        var hsnGroups = invoices.SelectMany(i => i.Items)
            .GroupBy(item => new { HSN = item.HsnCode ?? item.Item.HSNCode ?? "OTHER", item.GstRate, Uom = item.UomCode ?? "PCS" })
            .OrderBy(g => g.Key.HSN);

        var hsnSummary = new List<GstHsnSummaryRowDto>();
        foreach (var hg in hsnGroups)
        {
            var taxVal = hg.Sum(i => i.TaxableAmount);
            var cgst = hg.Sum(i => i.CgstAmount);
            var sgst = hg.Sum(i => i.SgstAmount);
            var igst = hg.Sum(i => i.IgstAmount);
            var desc = hg.First().ItemName ?? hg.First().Item.Name;

            hsnSummary.Add(new GstHsnSummaryRowDto
            {
                HSNCode = hg.Key.HSN,
                Description = desc,
                UOM = hg.Key.Uom,
                TotalQuantity = hg.Sum(i => i.Quantity),
                TaxableValue = taxVal,
                TaxRate = hg.Key.GstRate,
                CgstAmount = cgst,
                SgstAmount = sgst,
                IgstAmount = igst,
                TotalTax = cgst + sgst + igst
            });
        }

        var returnsQuery = _context.SalesReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled && r.ReturnDate >= fromUtc && r.ReturnDate <= toUtc);
        if (branchId.HasValue)
        {
            returnsQuery = returnsQuery.Where(r => r.BranchId == branchId.Value);
        }
        var salesReturns = await returnsQuery.ToListAsync(cancellationToken);

        var totalCreditNotesCount = salesReturns.Count;
        var totalCreditNotesTaxable = salesReturns.Sum(r => r.SubTotal);
        var totalCreditNotesTax = salesReturns.Sum(r => r.TaxAmount);

        var netOutwardTaxable = Math.Max(0m, invoices.Sum(i => i.TaxableAmount) - totalCreditNotesTaxable);
        var netOutwardTax = Math.Max(0m, invoices.Sum(i => i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount) - totalCreditNotesTax);

        var report = new Gstr1ReportDto
        {
            TenantName = tenant?.BusinessName ?? "Business Tenant",
            GSTIN = tenant?.GSTIN ?? string.Empty,
            FromDate = effectiveFrom,
            ToDate = effectiveTo,
            TotalB2BInvoices = b2bInvoices.Count,
            TotalB2BTaxable = b2bInvoices.Sum(i => i.TaxableAmount),
            TotalB2BTax = b2bInvoices.Sum(i => i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount),
            TotalB2CInvoices = b2cInvoices.Count,
            TotalB2CTaxable = b2cInvoices.Sum(i => i.TaxableAmount),
            TotalB2CTax = b2cInvoices.Sum(i => i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount),
            TotalCreditNotes = totalCreditNotesCount,
            TotalCreditNotesTaxable = totalCreditNotesTaxable,
            TotalCreditNotesTax = totalCreditNotesTax,
            TotalOutwardTaxable = netOutwardTaxable,
            TotalOutwardTax = netOutwardTax,
            RateWiseSummary = rateWise,
            HsnSummary = hsnSummary
        };

        return Result<Gstr1ReportDto>.Success(report);
    }

    public async Task<Result<Gstr3bReportDto>> GetGstr3bReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var effectiveFrom = fromDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var effectiveTo = toDate ?? DateTime.UtcNow.Date;

        var fromUtc = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(effectiveTo.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var salesQuery = _context.SalesInvoices
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.Status != InvoiceStatus.Cancelled && s.InvoiceDate >= fromUtc && s.InvoiceDate <= toUtc);

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && p.Status != PurchaseBillStatus.Cancelled && p.BillDate >= fromUtc && p.BillDate <= toUtc);

        var returnsQuery = _context.SalesReturns
            .Include(r => r.OriginalSalesInvoice)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled && r.ReturnDate >= fromUtc && r.ReturnDate <= toUtc);

        var purchaseReturnsQuery = _context.PurchaseReturns
            .Include(pr => pr.OriginalPurchaseBill)
            .Where(pr => pr.TenantId == tenantId && !pr.IsDeleted && !pr.IsCancelled && pr.ReturnDate >= fromUtc && pr.ReturnDate <= toUtc);

        if (branchId.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.BranchId == branchId.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BranchId == branchId.Value);
            returnsQuery = returnsQuery.Where(r => r.BranchId == branchId.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.BranchId == branchId.Value);
        }

        var sales = await salesQuery.ToListAsync(cancellationToken);
        var purchases = await purchaseQuery.ToListAsync(cancellationToken);
        var salesReturns = await returnsQuery.ToListAsync(cancellationToken);
        var purchaseReturns = await purchaseReturnsQuery.ToListAsync(cancellationToken);

        // Net Outward Supplies (Gross sales minus credit notes)
        decimal grossOutTaxable = sales.Sum(s => s.TaxableAmount);
        decimal grossOutIgst = sales.Sum(s => s.IgstAmount);
        decimal grossOutCgst = sales.Sum(s => s.CgstAmount);
        decimal grossOutSgst = sales.Sum(s => s.SgstAmount);

        decimal crnTaxable = salesReturns.Sum(r => r.SubTotal);
        decimal crnIgst = 0m, crnCgst = 0m, crnSgst = 0m;
        foreach (var r in salesReturns)
        {
            bool isInterState = r.OriginalSalesInvoice != null && r.OriginalSalesInvoice.TaxSupplyType == TaxSupplyType.InterState;
            if (isInterState)
            {
                crnIgst += r.TaxAmount;
            }
            else
            {
                var half = Math.Round(r.TaxAmount / 2m, 2);
                crnCgst += half;
                crnSgst += (r.TaxAmount - half);
            }
        }

        decimal outTaxable = Math.Max(0m, grossOutTaxable - crnTaxable);
        decimal outIgst = Math.Max(0m, grossOutIgst - crnIgst);
        decimal outCgst = Math.Max(0m, grossOutCgst - crnCgst);
        decimal outSgst = Math.Max(0m, grossOutSgst - crnSgst);
        decimal totalOutTax = outIgst + outCgst + outSgst;

        // Net Inward Supplies (Gross purchases minus debit notes)
        decimal grossInTaxable = purchases.Sum(p => p.TaxableAmount);
        decimal grossInIgst = purchases.Sum(p => p.IgstAmount);
        decimal grossInCgst = purchases.Sum(p => p.CgstAmount);
        decimal grossInSgst = purchases.Sum(p => p.SgstAmount);

        decimal drnTaxable = purchaseReturns.Sum(pr => pr.SubTotal);
        decimal drnIgst = 0m, drnCgst = 0m, drnSgst = 0m;
        foreach (var pr in purchaseReturns)
        {
            bool isInterState = pr.OriginalPurchaseBill != null && pr.OriginalPurchaseBill.TaxSupplyType == TaxSupplyType.InterState;
            if (isInterState)
            {
                drnIgst += pr.TaxAmount;
            }
            else
            {
                var half = Math.Round(pr.TaxAmount / 2m, 2);
                drnCgst += half;
                drnSgst += (pr.TaxAmount - half);
            }
        }

        decimal inTaxable = Math.Max(0m, grossInTaxable - drnTaxable);
        decimal inIgst = Math.Max(0m, grossInIgst - drnIgst);
        decimal inCgst = Math.Max(0m, grossInCgst - drnCgst);
        decimal inSgst = Math.Max(0m, grossInSgst - drnSgst);
        decimal totalInItc = inIgst + inCgst + inSgst;

        // Rule 88A Statutory Set-off Waterfall:
        // 1. Fully exhaust Input IGST against Output IGST, then Output CGST and Output SGST
        decimal remInIgst = inIgst;
        decimal remOutIgst = outIgst;

        decimal igstSetOffAgainstIgst = Math.Min(remInIgst, remOutIgst);
        remInIgst -= igstSetOffAgainstIgst;
        remOutIgst -= igstSetOffAgainstIgst;

        decimal remOutCgst = outCgst;
        decimal remOutSgst = outSgst;

        if (remInIgst > 0)
        {
            decimal igstSetOffAgainstCgst = Math.Min(remInIgst, remOutCgst);
            remInIgst -= igstSetOffAgainstCgst;
            remOutCgst -= igstSetOffAgainstCgst;
        }

        if (remInIgst > 0)
        {
            decimal igstSetOffAgainstSgst = Math.Min(remInIgst, remOutSgst);
            remInIgst -= igstSetOffAgainstSgst;
            remOutSgst -= igstSetOffAgainstSgst;
        }

        // 2. Utilize Input CGST against remaining Output CGST, then Output IGST
        decimal remInCgst = inCgst;
        decimal cgstSetOffAgainstCgst = Math.Min(remInCgst, remOutCgst);
        remInCgst -= cgstSetOffAgainstCgst;
        remOutCgst -= cgstSetOffAgainstCgst;

        if (remInCgst > 0 && remOutIgst > 0)
        {
            decimal cgstSetOffAgainstIgst = Math.Min(remInCgst, remOutIgst);
            remInCgst -= cgstSetOffAgainstIgst;
            remOutIgst -= cgstSetOffAgainstIgst;
        }

        // 3. Utilize Input SGST against remaining Output SGST, then Output IGST
        decimal remInSgst = inSgst;
        decimal sgstSetOffAgainstSgst = Math.Min(remInSgst, remOutSgst);
        remInSgst -= sgstSetOffAgainstSgst;
        remOutSgst -= sgstSetOffAgainstSgst;

        if (remInSgst > 0 && remOutIgst > 0)
        {
            decimal sgstSetOffAgainstIgst = Math.Min(remInSgst, remOutIgst);
            remInSgst -= sgstSetOffAgainstIgst;
            remOutIgst -= sgstSetOffAgainstIgst;
        }

        decimal netIgst = remOutIgst;
        decimal netCgst = remOutCgst;
        decimal netSgst = remOutSgst;
        decimal totalNetPayable = netIgst + netCgst + netSgst;

        var report = new Gstr3bReportDto
        {
            TenantName = tenant?.BusinessName ?? "Business Tenant",
            GSTIN = tenant?.GSTIN ?? string.Empty,
            FromDate = effectiveFrom,
            ToDate = effectiveTo,
            OutwardTaxableValue = outTaxable,
            OutwardIgst = outIgst,
            OutwardCgst = outCgst,
            OutwardSgst = outSgst,
            TotalOutputTaxLiability = totalOutTax,
            InwardTaxableValue = inTaxable,
            InwardIgst = inIgst,
            InwardCgst = inCgst,
            InwardSgst = inSgst,
            TotalEligibleItc = totalInItc,
            NetIgstPayable = netIgst,
            NetCgstPayable = netCgst,
            NetSgstPayable = netSgst,
            TotalNetGstPayable = totalNetPayable
        };

        return Result<Gstr3bReportDto>.Success(report);
    }

    public async Task<Result<SummaryReportDto>> GetSummaryDashboardAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var effectiveFrom = fromDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var effectiveTo = toDate ?? DateTime.UtcNow.Date;

        var fromUtc = DateTime.SpecifyKind(effectiveFrom.Date, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(effectiveTo.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

        var salesQuery = _context.SalesInvoices
            .Include(s => s.Items)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && s.Status != InvoiceStatus.Cancelled && s.InvoiceDate >= fromUtc && s.InvoiceDate <= toUtc);

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && p.Status != PurchaseBillStatus.Cancelled && p.BillDate >= fromUtc && p.BillDate <= toUtc);

        var salesReturnQuery = _context.SalesReturns
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled && r.ReturnDate >= fromUtc && r.ReturnDate <= toUtc);

        var purchaseReturnQuery = _context.PurchaseReturns
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled && r.ReturnDate >= fromUtc && r.ReturnDate <= toUtc);

        if (branchId.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.BranchId == branchId.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BranchId == branchId.Value);
            salesReturnQuery = salesReturnQuery.Where(r => r.BranchId == branchId.Value);
            purchaseReturnQuery = purchaseReturnQuery.Where(r => r.BranchId == branchId.Value);
        }

        var sales = await salesQuery.ToListAsync(cancellationToken);
        var purchases = await purchaseQuery.ToListAsync(cancellationToken);
        var salesReturns = await salesReturnQuery.ToListAsync(cancellationToken);
        var purchaseReturns = await purchaseReturnQuery.ToListAsync(cancellationToken);

        decimal grossSales = sales.Sum(s => s.TotalAmount);
        decimal salesReturnAmount = salesReturns.Sum(r => r.TotalAmount);
        decimal totalSales = grossSales - salesReturnAmount;

        decimal totalCollected = sales.Sum(s => s.PaidAmount);
        decimal totalReceivables = Math.Max(0m, sales.Sum(s => s.BalanceAmount) - salesReturnAmount);

        decimal grossPurchases = purchases.Sum(p => p.TotalAmount);
        decimal purchaseReturnAmount = purchaseReturns.Sum(r => r.TotalAmount);
        decimal totalPurchases = grossPurchases - purchaseReturnAmount;

        decimal totalPayables = Math.Max(0m, purchases.Sum(p => p.BalanceAmount) - purchaseReturnAmount);

        decimal outputGst = sales.Sum(s => s.CgstAmount + s.SgstAmount + s.IgstAmount + s.CessAmount) - salesReturns.Sum(r => r.TaxAmount);
        decimal inputGstItc = purchases.Sum(p => p.CgstAmount + p.SgstAmount + p.IgstAmount + p.CessAmount) - purchaseReturns.Sum(r => r.Items.Sum(i => i.TotalAmount - (i.ReturnQuantity * i.UnitPrice)));
        decimal netGst = Math.Max(0, outputGst - inputGstItc);

        decimal netSales = sales.Sum(s => s.TaxableAmount) - salesReturns.Sum(r => r.SubTotal);
        decimal netPurchases = purchases.Sum(p => p.TaxableAmount) - purchaseReturns.Sum(r => r.Items.Sum(i => i.ReturnQuantity * i.UnitPrice));

        // AS-2 Compliant COGS Calculation (NetSales - COGS)
        decimal cogs = sales.SelectMany(s => s.Items).Sum(i => i.Quantity * i.PurchasePrice);
        if (cogs == 0m && purchases.Count > 0)
        {
            cogs = netPurchases;
        }
        decimal grossProfit = netSales - cogs;
        decimal netProfit = grossProfit;

        var summary = new SummaryReportDto
        {
            FromDate = effectiveFrom,
            ToDate = effectiveTo,
            TotalSales = totalSales,
            TotalInvoicesCount = sales.Count,
            TotalCollected = totalCollected,
            TotalPendingReceivables = totalReceivables,
            TotalPurchases = totalPurchases,
            TotalPurchaseBillsCount = purchases.Count,
            TotalPayables = totalPayables,
            OutputGst = Math.Max(0m, outputGst),
            InputGstItc = Math.Max(0m, inputGstItc),
            NetGstPayable = netGst,
            GrossProfit = grossProfit,
            NetProfit = netProfit
        };

        return Result<SummaryReportDto>.Success(summary);
    }

    public async Task<Result<ExportFileResult>> ExportGstr1CsvAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var gstr1Result = await GetGstr1ReportAsync(fromDate, toDate, branchId, cancellationToken);
        if (!gstr1Result.IsSuccess || gstr1Result.Data == null)
        {
            return Result<ExportFileResult>.Failure("Failed to generate GSTR-1 data.", "EXPORT_FAILED");
        }

        var r = gstr1Result.Data;
        var sb = new StringBuilder();

        sb.AppendLine("GSTR-1 Outward Supplies Report");
        sb.AppendLine($"Business Name,\"{EscapeCsv(r.TenantName)}\"");
        sb.AppendLine($"GSTIN,\"{EscapeCsv(r.GSTIN)}\"");
        sb.AppendLine($"Period,{r.FromDate:dd/MM/yyyy} to {r.ToDate:dd/MM/yyyy}");
        sb.AppendLine();

        sb.AppendLine("Section,Count,Taxable Value (INR),Tax Amount (INR)");
        sb.AppendLine($"B2B Invoices,{r.TotalB2BInvoices},{r.TotalB2BTaxable:F2},{r.TotalB2BTax:F2}");
        sb.AppendLine($"B2C Invoices,{r.TotalB2CInvoices},{r.TotalB2CTaxable:F2},{r.TotalB2CTax:F2}");
        sb.AppendLine($"Total Outward Supplies,{r.TotalB2BInvoices + r.TotalB2CInvoices},{r.TotalOutwardTaxable:F2},{r.TotalOutwardTax:F2}");
        sb.AppendLine();

        sb.AppendLine("Rate Slab,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Tax (INR),Total Value (INR)");
        foreach (var row in r.RateWiseSummary)
        {
            sb.AppendLine($"\"{row.RateSlab}\",{row.TaxableValue:F2},{row.CgstAmount:F2},{row.SgstAmount:F2},{row.IgstAmount:F2},{row.TotalTax:F2},{row.TotalValue:F2}");
        }
        sb.AppendLine();

        sb.AppendLine("HSN Code,Description,UOM,Total Quantity,Taxable Value (INR),Rate %,CGST (INR),SGST (INR),IGST (INR),Total Tax (INR)");
        foreach (var h in r.HsnSummary)
        {
            sb.AppendLine($"\"{EscapeCsv(h.HSNCode)}\",\"{EscapeCsv(h.Description)}\",\"{EscapeCsv(h.UOM)}\",{h.TotalQuantity:F2},{h.TaxableValue:F2},{h.TaxRate:F2}%,{h.CgstAmount:F2},{h.SgstAmount:F2},{h.IgstAmount:F2},{h.TotalTax:F2}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"GSTR1_{r.FromDate:yyyyMMdd}_{r.ToDate:yyyyMMdd}.csv";

        return Result<ExportFileResult>.Success(new ExportFileResult
        {
            FileName = fileName,
            ContentType = "text/csv",
            FileBytes = bytes
        });
    }

    public async Task<Result<ExportFileResult>> ExportGstr3bCsvAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var gstr3bResult = await GetGstr3bReportAsync(fromDate, toDate, branchId, cancellationToken);
        if (!gstr3bResult.IsSuccess || gstr3bResult.Data == null)
        {
            return Result<ExportFileResult>.Failure("Failed to generate GSTR-3B data.", "EXPORT_FAILED");
        }

        var r = gstr3bResult.Data;
        var sb = new StringBuilder();

        sb.AppendLine("GSTR-3B Summary Return");
        sb.AppendLine($"Business Name,\"{EscapeCsv(r.TenantName)}\"");
        sb.AppendLine($"GSTIN,\"{EscapeCsv(r.GSTIN)}\"");
        sb.AppendLine($"Period,{r.FromDate:dd/MM/yyyy} to {r.ToDate:dd/MM/yyyy}");
        sb.AppendLine();

        sb.AppendLine("Nature of Supplies,Taxable Value (INR),Integrated Tax IGST (INR),Central Tax CGST (INR),State Tax SGST (INR),Total Tax (INR)");
        sb.AppendLine($"3.1 (a) Outward Taxable Supplies,{r.OutwardTaxableValue:F2},{r.OutwardIgst:F2},{r.OutwardCgst:F2},{r.OutwardSgst:F2},{r.TotalOutputTaxLiability:F2}");
        sb.AppendLine($"4 (A) Eligible Input Tax Credit (ITC),{r.InwardTaxableValue:F2},{r.InwardIgst:F2},{r.InwardCgst:F2},{r.InwardSgst:F2},{r.TotalEligibleItc:F2}");
        sb.AppendLine();

        sb.AppendLine("Net Tax Payable in Cash,Taxable Value (INR),Integrated Tax IGST (INR),Central Tax CGST (INR),State Tax SGST (INR),Total Payable (INR)");
        sb.AppendLine($"6.1 Payment of Tax,-,{r.NetIgstPayable:F2},{r.NetCgstPayable:F2},{r.NetSgstPayable:F2},{r.TotalNetGstPayable:F2}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"GSTR3B_{r.FromDate:yyyyMMdd}_{r.ToDate:yyyyMMdd}.csv";

        return Result<ExportFileResult>.Success(new ExportFileResult
        {
            FileName = fileName,
            ContentType = "text/csv",
            FileBytes = bytes
        });
    }

    public async Task<Result<ExportFileResult>> ExportLedgerCsvAsync(
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            var statementRes = await GetLedgerStatementAsync(partyId.Value, fromDate, toDate, cancellationToken);
            if (!statementRes.IsSuccess || statementRes.Data == null)
            {
                return Result<ExportFileResult>.Failure("Failed to fetch party statement.", "EXPORT_FAILED");
            }

            var st = statementRes.Data;
            var sb = new StringBuilder();

            sb.AppendLine("Statement of Account / Party Ledger");
            sb.AppendLine($"Party Name,\"{EscapeCsv(st.PartyName ?? "")}\"");
            sb.AppendLine($"GSTIN,\"{EscapeCsv(st.PartyGSTIN ?? "N/A")}\"");
            sb.AppendLine($"Statement Period,{st.FromDate:dd/MM/yyyy} to {st.ToDate:dd/MM/yyyy}");
            sb.AppendLine($"Opening Balance,{st.OpeningBalance:F2}");
            sb.AppendLine();

            sb.AppendLine("Date,Document Type,Reference No,Description,Payment Mode,Debit (INR),Credit (INR),Running Balance (INR)");
            foreach (var row in st.Entries)
            {
                sb.AppendLine($"{row.TransactionDate:dd/MM/yyyy},\"{EscapeCsv(row.ReferenceDocumentType ?? "")}\",\"{EscapeCsv(row.ReferenceDocumentNumber ?? "")}\",\"{EscapeCsv(row.Description)}\",\"{EscapeCsv(row.PaymentMode ?? "")}\",{row.Debit:F2},{row.Credit:F2},{row.Balance:F2}");
            }
            sb.AppendLine();
            sb.AppendLine($"Total Debit,{st.TotalDebit:F2}");
            sb.AppendLine($"Total Credit,{st.TotalCredit:F2}");
            sb.AppendLine($"Closing Balance,{st.ClosingBalance:F2}");

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var fileName = $"Statement_{EscapeFileName(st.PartyName)}_{st.FromDate:yyyyMMdd}_{st.ToDate:yyyyMMdd}.csv";

            return Result<ExportFileResult>.Success(new ExportFileResult
            {
                FileName = fileName,
                ContentType = "text/csv",
                FileBytes = bytes
            });
        }
        else
        {
            var paged = await GetLedgerEntriesAsync(null, fromDate, toDate, 1, 5000, cancellationToken);
            if (!paged.IsSuccess || paged.Data == null)
            {
                return Result<ExportFileResult>.Failure("Failed to fetch general ledger entries.", "EXPORT_FAILED");
            }

            var entries = paged.Data.Items;
            var sb = new StringBuilder();

            sb.AppendLine("General Ledger Entries");
            sb.AppendLine($"Exported On,{DateTime.UtcNow:dd/MM/yyyy HH:mm:ss} UTC");
            sb.AppendLine();

            sb.AppendLine("Date,Party,Document Type,Reference No,Description,Payment Mode,Debit (INR),Credit (INR),Balance (INR)");
            foreach (var row in entries)
            {
                sb.AppendLine($"{row.TransactionDate:dd/MM/yyyy},\"{EscapeCsv(row.PartyName ?? "")}\",\"{EscapeCsv(row.ReferenceDocumentType ?? "")}\",\"{EscapeCsv(row.ReferenceDocumentNumber ?? "")}\",\"{EscapeCsv(row.Description)}\",\"{EscapeCsv(row.PaymentMode ?? "")}\",{row.Debit:F2},{row.Credit:F2},{row.Balance:F2}");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var fileName = $"GeneralLedger_{DateTime.UtcNow:yyyyMMdd}.csv";

            return Result<ExportFileResult>.Success(new ExportFileResult
            {
                FileName = fileName,
                ContentType = "text/csv",
                FileBytes = bytes
            });
        }
    }

    private static string EscapeCsv(string val)
    {
        return val.Replace("\"", "\"\"");
    }

    private static string EscapeFileName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Party";
        var invalid = Path.GetInvalidFileNameChars();
        return new string(name.Where(c => !invalid.Contains(c) && !char.IsWhiteSpace(c)).ToArray());
    }
}
