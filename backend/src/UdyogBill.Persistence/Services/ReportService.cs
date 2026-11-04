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

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(l => l.TransactionDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(l => l.TransactionDate <= toUtc.Value);
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

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: true);

        var salesQuery = _context.SalesInvoices
            .Include(s => s.Items)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.IsCancelled && s.Status != InvoiceStatus.Cancelled);

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && !p.IsCancelled && p.Status != PurchaseBillStatus.Cancelled);

        var returnsQuery = _context.SalesReturns
            .Include(r => r.Items)
                .ThenInclude(i => i.Item)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled);
        var purchaseReturnsQuery = _context.PurchaseReturns
            .Where(pr => pr.TenantId == tenantId && !pr.IsDeleted && !pr.IsCancelled);

        if (fromUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate >= fromUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate >= fromUtc.Value);
            returnsQuery = returnsQuery.Where(r => r.ReturnDate >= fromUtc.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.ReturnDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate <= toUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate <= toUtc.Value);
            returnsQuery = returnsQuery.Where(r => r.ReturnDate <= toUtc.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.ReturnDate <= toUtc.Value);
        }

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

        // COGS Calculation (Sales Cost minus Returned Goods Cost)
        decimal outwardCost = sales.SelectMany(s => s.Items).Sum(i => i.Quantity * i.PurchasePrice);
        decimal returnCost = salesReturns.SelectMany(r => r.Items).Sum(i =>
        {
            var cost = i.Item != null && i.Item.PurchasePrice > 0 ? i.Item.PurchasePrice : (i.UnitPrice > 0 ? i.UnitPrice : 0m);
            return i.ReturnQuantity * cost;
        });
        decimal cogs = Math.Max(0m, outwardCost - returnCost);
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
            FromDate = fromDate ?? (fromUtc.HasValue ? fromUtc.Value.Date : DateTime.UtcNow.Date),
            ToDate = toDate ?? (toUtc.HasValue ? toUtc.Value.Date : DateTime.UtcNow.Date),
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

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: true);

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var query = _context.SalesInvoices
            .Where(s => s.TenantId == tenantId 
                     && !s.IsDeleted 
                     && !s.IsCancelled 
                     && s.Status != InvoiceStatus.Cancelled
                     && s.InvoiceType != InvoiceType.SalesEstimate
                     && s.InvoiceType != InvoiceType.ProformaInvoice
                     && !s.InvoiceNumber.StartsWith("CASH-")
                     && !s.InvoiceNumber.StartsWith("CM/")
                     && !s.InvoiceNumber.StartsWith("EST-")
                     && !s.InvoiceNumber.StartsWith("QTN/"))
            .Include(s => s.Items)
                .ThenInclude(i => i.Item)
            .AsNoTracking();

        if (fromUtc.HasValue)
        {
            query = query.Where(s => s.InvoiceDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(s => s.InvoiceDate <= toUtc.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(s => s.BranchId == branchId.Value);
        }

        var rawInvoices = await query.ToListAsync(cancellationToken);
        var invoices = rawInvoices.Where(s =>
            !(s.CgstAmount == 0 && s.SgstAmount == 0 && s.IgstAmount == 0 && 
              string.IsNullOrWhiteSpace(s.CustomerGSTIN) && 
              !string.IsNullOrEmpty(s.AttributesJson) && 
              (s.AttributesJson.Contains("\"isNonGst\":true") || s.AttributesJson.Contains("\"billingMode\":\"NON_GST\""))
            )
        ).ToList();

        var b2bInvoices = invoices.Where(i => !string.IsNullOrWhiteSpace(i.CustomerGSTIN)).ToList();
        var b2cInvoices = invoices.Where(i => string.IsNullOrWhiteSpace(i.CustomerGSTIN)).ToList();

        var returnsQuery = _context.SalesReturns
            .Include(r => r.Party)
            .Include(r => r.Items)
                .ThenInclude(i => i.Item)
                    .ThenInclude(item => item.PrimaryUom)
            .Where(r => r.TenantId == tenantId 
                     && !r.IsDeleted 
                     && !r.IsCancelled
                     && (string.IsNullOrEmpty(r.OriginalInvoiceNumber) 
                         || (!r.OriginalInvoiceNumber.StartsWith("CASH-")
                             && !r.OriginalInvoiceNumber.StartsWith("CM/")
                             && !r.OriginalInvoiceNumber.StartsWith("EST-")
                             && !r.OriginalInvoiceNumber.StartsWith("QTN/"))));
        if (fromUtc.HasValue)
        {
            returnsQuery = returnsQuery.Where(r => r.ReturnDate >= fromUtc.Value);
        }
        if (toUtc.HasValue)
        {
            returnsQuery = returnsQuery.Where(r => r.ReturnDate <= toUtc.Value);
        }
        if (branchId.HasValue)
        {
            returnsQuery = returnsQuery.Where(r => r.BranchId == branchId.Value);
        }
        var salesReturns = await returnsQuery.ToListAsync(cancellationToken);
        var returnItems = salesReturns.SelectMany(r => r.Items).ToList();

        // Rate Wise Summary (net of credit notes)
        var allGstRates = invoices.SelectMany(i => i.Items).Select(i => i.GstRate)
            .Union(returnItems.Select(r => r.GstRate))
            .Distinct()
            .OrderBy(g => g);

        var rateWise = new List<GstSummaryRowDto>();
        foreach (var rate in allGstRates)
        {
            var invItems = invoices.SelectMany(i => i.Items).Where(i => i.GstRate == rate).ToList();
            var retItems = returnItems.Where(r => r.GstRate == rate).ToList();

            var taxVal = Math.Max(0m, invItems.Sum(i => i.TaxableAmount) - retItems.Sum(r => r.TaxableAmount));
            var cgst = Math.Max(0m, invItems.Sum(i => i.CgstAmount) - retItems.Sum(r => r.CgstAmount));
            var sgst = Math.Max(0m, invItems.Sum(i => i.SgstAmount) - retItems.Sum(r => r.SgstAmount));
            var igst = Math.Max(0m, invItems.Sum(i => i.IgstAmount) - retItems.Sum(r => r.IgstAmount));
            var totTax = cgst + sgst + igst;

            if (taxVal > 0 || totTax > 0)
            {
                rateWise.Add(new GstSummaryRowDto
                {
                    RateSlab = $"{rate}%",
                    TaxableValue = taxVal,
                    CgstAmount = cgst,
                    SgstAmount = sgst,
                    IgstAmount = igst,
                    TotalTax = totTax,
                    TotalValue = taxVal + totTax
                });
            }
        }

        // HSN Summary (net of credit notes)
        var invHsnItems = invoices.SelectMany(i => i.Items)
            .Select(i => new {
                Hsn = i.HsnCode ?? i.Item?.HSNCode ?? "OTHER",
                GstRate = i.GstRate,
                Uom = i.UomCode ?? i.Item?.PrimaryUom?.Code ?? "PCS",
                Desc = i.ItemName ?? i.Item?.Name ?? "Item",
                Qty = i.Quantity,
                TaxableAmount = i.TaxableAmount,
                Cgst = i.CgstAmount,
                Sgst = i.SgstAmount,
                Igst = i.IgstAmount
            });

        var retHsnItems = returnItems
            .Select(r => new {
                Hsn = r.Item?.HSNCode ?? "OTHER",
                GstRate = r.GstRate,
                Uom = r.Item?.PrimaryUom?.Code ?? "PCS",
                Desc = r.ItemName ?? r.Item?.Name ?? "Item",
                Qty = r.ReturnQuantity,
                TaxableAmount = r.TaxableAmount,
                Cgst = r.CgstAmount,
                Sgst = r.SgstAmount,
                Igst = r.IgstAmount
            });

        var allHsnKeys = invHsnItems.Select(x => new { x.Hsn, x.GstRate })
            .Union(retHsnItems.Select(x => new { x.Hsn, x.GstRate }))
            .Distinct()
            .OrderBy(k => k.Hsn)
            .ThenBy(k => k.GstRate);

        var hsnSummary = new List<GstHsnSummaryRowDto>();
        foreach (var key in allHsnKeys)
        {
            var invSub = invHsnItems.Where(x => x.Hsn == key.Hsn && x.GstRate == key.GstRate).ToList();
            var retSub = retHsnItems.Where(x => x.Hsn == key.Hsn && x.GstRate == key.GstRate).ToList();

            var netQty = Math.Max(0m, invSub.Sum(x => x.Qty) - retSub.Sum(x => x.Qty));
            var netTaxVal = Math.Max(0m, invSub.Sum(x => x.TaxableAmount) - retSub.Sum(x => x.TaxableAmount));
            var netCgst = Math.Max(0m, invSub.Sum(x => x.Cgst) - retSub.Sum(x => x.Cgst));
            var netSgst = Math.Max(0m, invSub.Sum(x => x.Sgst) - retSub.Sum(x => x.Sgst));
            var netIgst = Math.Max(0m, invSub.Sum(x => x.Igst) - retSub.Sum(x => x.Igst));
            var desc = invSub.FirstOrDefault()?.Desc ?? retSub.FirstOrDefault()?.Desc ?? "Item";
            var uom = invSub.FirstOrDefault()?.Uom ?? retSub.FirstOrDefault()?.Uom ?? "PCS";

            if (netQty > 0 || netTaxVal > 0)
            {
                hsnSummary.Add(new GstHsnSummaryRowDto
                {
                    HSNCode = key.Hsn,
                    Description = desc,
                    UOM = uom,
                    TotalQuantity = netQty,
                    TaxableValue = netTaxVal,
                    TaxRate = key.GstRate,
                    CgstAmount = netCgst,
                    SgstAmount = netSgst,
                    IgstAmount = netIgst,
                    TotalTax = netCgst + netSgst + netIgst
                });
            }
        }

        var totalCreditNotesCount = salesReturns.Count;
        var totalCreditNotesTaxable = salesReturns.Sum(r => r.SubTotal);
        var totalCreditNotesTax = salesReturns.Sum(r => r.TaxAmount);

        var creditNoteRows = salesReturns.Select(r => new Gstr1CreditNoteRowDto
        {
            Id = r.Id,
            CreditNoteNumber = r.CreditNoteNumber,
            ReturnDate = r.ReturnDate.DateTime,
            OriginalInvoiceNumber = r.OriginalInvoiceNumber,
            CustomerName = r.CustomerName,
            CustomerGSTIN = r.Party?.GSTIN,
            NoteType = "C",
            TaxableValue = r.SubTotal,
            TaxAmount = r.TaxAmount,
            TotalValue = r.TotalAmount,
            SupplyType = !string.IsNullOrWhiteSpace(r.Party?.GSTIN) ? "B2B" : "B2C"
        }).ToList();

        var netOutwardTaxable = Math.Max(0m, invoices.Sum(i => i.TaxableAmount) - totalCreditNotesTaxable);
        var netOutwardTax = Math.Max(0m, invoices.Sum(i => i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount) - totalCreditNotesTax);

        // Official GSTN B2B grouping by Recipient GSTIN
        var b2bRecipients = b2bInvoices
            .GroupBy(inv => (inv.CustomerGSTIN ?? "").Trim().ToUpperInvariant())
            .Where(g => !string.IsNullOrWhiteSpace(g.Key))
            .Select(g => new Gstr1B2BRecipientDto
            {
                CustomerGstin = g.Key,
                CustomerName = g.FirstOrDefault()?.CustomerName ?? "Customer",
                Invoices = g.Select(inv => new Gstr1B2BInvoiceDto
                {
                    InvoiceNumber = inv.InvoiceNumber,
                    InvoiceDate = inv.InvoiceDate,
                    TotalValue = inv.TotalAmount,
                    PlaceOfSupply = !string.IsNullOrWhiteSpace(inv.PlaceOfSupply) && inv.PlaceOfSupply.Length >= 2
                        ? inv.PlaceOfSupply.Substring(0, 2)
                        : (!string.IsNullOrWhiteSpace(inv.CustomerGSTIN) && inv.CustomerGSTIN.Length >= 2
                            ? inv.CustomerGSTIN.Substring(0, 2)
                            : "07"),
                    ReverseCharge = inv.IsReverseCharge ? "Y" : "N",
                    InvoiceType = "R",
                    Items = inv.Items
                        .GroupBy(it => it.GstRate)
                        .Select((itg, idx) => new Gstr1B2BItemDetailDto
                        {
                            Num = idx + 1,
                            Rate = itg.Key,
                            TaxableValue = itg.Sum(it => it.TaxableAmount),
                            IgstAmount = itg.Sum(it => it.IgstAmount),
                            CgstAmount = itg.Sum(it => it.CgstAmount),
                            SgstAmount = itg.Sum(it => it.SgstAmount),
                            CessAmount = itg.Sum(it => it.CessAmount)
                        }).ToList()
                }).ToList()
            }).ToList();

        // Official GSTN B2CS grouping by POS & GST Rate
        var tenantPos = !string.IsNullOrWhiteSpace(tenant?.GSTIN) && tenant.GSTIN.Length >= 2 ? tenant.GSTIN.Substring(0, 2) : "07";
        var b2csRows = b2cInvoices
            .SelectMany(inv => inv.Items.Select(item => new
            {
                Pos = !string.IsNullOrWhiteSpace(inv.PlaceOfSupply) && inv.PlaceOfSupply.Length >= 2
                    ? inv.PlaceOfSupply.Substring(0, 2)
                    : tenantPos,
                item.GstRate,
                item.TaxableAmount,
                item.CgstAmount,
                item.SgstAmount,
                item.IgstAmount,
                item.CessAmount
            }))
            .GroupBy(x => new { x.Pos, x.GstRate })
            .Select(g => new Gstr1B2CSItemDto
            {
                PlaceOfSupply = g.Key.Pos,
                Rate = g.Key.GstRate,
                SupplyType = g.Key.Pos == tenantPos ? "INTRA" : "INTER",
                TaxableValue = g.Sum(x => x.TaxableAmount),
                CgstAmount = g.Sum(x => x.CgstAmount),
                SgstAmount = g.Sum(x => x.SgstAmount),
                IgstAmount = g.Sum(x => x.IgstAmount),
                CessAmount = g.Sum(x => x.CessAmount)
            }).ToList();

        // Table 13 Document Details Summary
        var docIssueList = new List<Gstr1DocIssueDetailsDto>();
        if (invoices.Count > 0)
        {
            var orderedInvoices = invoices.OrderBy(i => i.InvoiceNumber).ToList();
            var cancelledCount = await _context.SalesInvoices
                .CountAsync(s => s.TenantId == tenantId && (s.IsCancelled || s.Status == InvoiceStatus.Cancelled) &&
                    s.InvoiceType != InvoiceType.SalesEstimate &&
                    s.InvoiceType != InvoiceType.ProformaInvoice &&
                    !s.InvoiceNumber.StartsWith("CASH-") &&
                    !s.InvoiceNumber.StartsWith("CM/") &&
                    !s.InvoiceNumber.StartsWith("EST-") &&
                    !s.InvoiceNumber.StartsWith("QTN/") &&
                    (!fromUtc.HasValue || s.InvoiceDate >= fromUtc.Value) &&
                    (!toUtc.HasValue || s.InvoiceDate <= toUtc.Value), cancellationToken);

            docIssueList.Add(new Gstr1DocIssueDetailsDto
            {
                DocNum = 1,
                FromSerial = orderedInvoices.First().InvoiceNumber,
                ToSerial = orderedInvoices.Last().InvoiceNumber,
                TotalCount = invoices.Count + cancelledCount,
                CancelledCount = cancelledCount,
                NetIssuedCount = invoices.Count
            });
        }

        var report = new Gstr1ReportDto
        {
            TenantName = tenant?.BusinessName ?? "Business Tenant",
            GSTIN = tenant?.GSTIN ?? string.Empty,
            FromDate = fromDate ?? (fromUtc.HasValue ? fromUtc.Value.Date : DateTime.UtcNow.Date),
            ToDate = toDate ?? (toUtc.HasValue ? toUtc.Value.Date : DateTime.UtcNow.Date),
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
            HsnSummary = hsnSummary,
            CreditNotes = creditNoteRows,
            B2B = b2bRecipients,
            B2CS = b2csRows,
            DocIssue = docIssueList
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

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: true);

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var salesQuery = _context.SalesInvoices
            .Where(s => s.TenantId == tenantId 
                     && !s.IsDeleted 
                     && !s.IsCancelled 
                     && s.Status != InvoiceStatus.Cancelled
                     && s.InvoiceType != InvoiceType.SalesEstimate
                     && s.InvoiceType != InvoiceType.ProformaInvoice
                     && !s.InvoiceNumber.StartsWith("CASH-")
                     && !s.InvoiceNumber.StartsWith("CM/")
                     && !s.InvoiceNumber.StartsWith("EST-")
                     && !s.InvoiceNumber.StartsWith("QTN/"));

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && !p.IsCancelled && p.Status != PurchaseBillStatus.Cancelled);

        var returnsQuery = _context.SalesReturns
            .Include(r => r.OriginalSalesInvoice)
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId 
                     && !r.IsDeleted 
                     && !r.IsCancelled
                     && (string.IsNullOrEmpty(r.OriginalInvoiceNumber) 
                         || (!r.OriginalInvoiceNumber.StartsWith("CASH-")
                             && !r.OriginalInvoiceNumber.StartsWith("CM/")
                             && !r.OriginalInvoiceNumber.StartsWith("EST-")
                             && !r.OriginalInvoiceNumber.StartsWith("QTN/"))));

        var purchaseReturnsQuery = _context.PurchaseReturns
            .Include(pr => pr.OriginalPurchaseBill)
            .Where(pr => pr.TenantId == tenantId && !pr.IsDeleted && !pr.IsCancelled);

        if (fromUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate >= fromUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate >= fromUtc.Value);
            returnsQuery = returnsQuery.Where(r => r.ReturnDate >= fromUtc.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.ReturnDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate <= toUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate <= toUtc.Value);
            returnsQuery = returnsQuery.Where(r => r.ReturnDate <= toUtc.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.ReturnDate <= toUtc.Value);
        }

        if (branchId.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.BranchId == branchId.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BranchId == branchId.Value);
            returnsQuery = returnsQuery.Where(r => r.BranchId == branchId.Value);
            purchaseReturnsQuery = purchaseReturnsQuery.Where(pr => pr.BranchId == branchId.Value);
        }

        var rawGstr3bSales = await salesQuery.ToListAsync(cancellationToken);
        var sales = rawGstr3bSales.Where(s =>
            !(s.CgstAmount == 0 && s.SgstAmount == 0 && s.IgstAmount == 0 && 
              string.IsNullOrWhiteSpace(s.CustomerGSTIN) && 
              !string.IsNullOrEmpty(s.AttributesJson) && 
              (s.AttributesJson.Contains("\"isNonGst\":true") || s.AttributesJson.Contains("\"billingMode\":\"NON_GST\""))
            )
        ).ToList();
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
            decimal itemCgst = r.Items != null ? r.Items.Sum(i => i.CgstAmount) : 0m;
            decimal itemSgst = r.Items != null ? r.Items.Sum(i => i.SgstAmount) : 0m;
            decimal itemIgst = r.Items != null ? r.Items.Sum(i => i.IgstAmount) : 0m;

            if (itemCgst > 0 || itemSgst > 0 || itemIgst > 0)
            {
                crnCgst += itemCgst;
                crnSgst += itemSgst;
                crnIgst += itemIgst;
            }
            else
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
            if (pr.CgstAmount > 0 || pr.SgstAmount > 0 || pr.IgstAmount > 0)
            {
                drnCgst += pr.CgstAmount;
                drnSgst += pr.SgstAmount;
                drnIgst += pr.IgstAmount;
            }
            else
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
        }

        decimal inTaxable = Math.Max(0m, grossInTaxable - drnTaxable);
        decimal inIgst = Math.Max(0m, grossInIgst - drnIgst);
        decimal inCgst = Math.Max(0m, grossInCgst - drnCgst);
        decimal inSgst = Math.Max(0m, grossInSgst - drnSgst);
        decimal totalInItc = inIgst + inCgst + inSgst;

        // Tax Set-off Waterfall:
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
            FromDate = fromDate ?? (fromUtc.HasValue ? fromUtc.Value.Date : DateTime.UtcNow.Date),
            ToDate = toDate ?? (toUtc.HasValue ? toUtc.Value.Date : DateTime.UtcNow.Date),
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

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: false);

        var salesQuery = _context.SalesInvoices
            .Include(s => s.Items)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.IsCancelled && s.Status != InvoiceStatus.Cancelled);

        var purchaseQuery = _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && !p.IsCancelled && p.Status != PurchaseBillStatus.Cancelled);

        var salesReturnQuery = _context.SalesReturns
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled);

        var purchaseReturnQuery = _context.PurchaseReturns
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled);

        if (fromUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate >= fromUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate >= fromUtc.Value);
            salesReturnQuery = salesReturnQuery.Where(r => r.ReturnDate >= fromUtc.Value);
            purchaseReturnQuery = purchaseReturnQuery.Where(r => r.ReturnDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            salesQuery = salesQuery.Where(s => s.InvoiceDate <= toUtc.Value);
            purchaseQuery = purchaseQuery.Where(p => p.BillDate <= toUtc.Value);
            salesReturnQuery = salesReturnQuery.Where(r => r.ReturnDate <= toUtc.Value);
            purchaseReturnQuery = purchaseReturnQuery.Where(r => r.ReturnDate <= toUtc.Value);
        }

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

        var expenseQuery = _context.ExpenseVouchers
            .Where(e => e.TenantId == tenantId && !e.IsDeleted);

        if (fromUtc.HasValue)
        {
            var fDate = fromUtc.Value.Date;
            expenseQuery = expenseQuery.Where(e => e.ExpenseDate >= fDate);
        }

        if (toUtc.HasValue)
        {
            var tDate = toUtc.Value.Date;
            expenseQuery = expenseQuery.Where(e => e.ExpenseDate <= tDate);
        }

        var expenses = await expenseQuery.ToListAsync(cancellationToken);
        decimal totalExpenses = expenses.Sum(e => e.Amount);

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
            FromDate = fromDate ?? (fromUtc.HasValue ? fromUtc.Value.Date : DateTime.UtcNow.Date),
            ToDate = toDate ?? (toUtc.HasValue ? toUtc.Value.Date : DateTime.UtcNow.Date),
            TotalSales = totalSales,
            TotalInvoicesCount = sales.Count,
            TotalCollected = totalCollected,
            TotalPendingReceivables = totalReceivables,
            TotalPurchases = totalPurchases,
            TotalPurchaseBillsCount = purchases.Count,
            TotalPayables = totalPayables,
            TotalSalesReturns = salesReturnAmount,
            TotalSalesReturnsCount = salesReturns.Count,
            TotalExpenses = totalExpenses,
            TotalExpensesCount = expenses.Count,
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
