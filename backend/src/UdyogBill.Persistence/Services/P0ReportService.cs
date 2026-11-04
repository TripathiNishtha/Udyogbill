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
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Reports;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class P0ReportService : IP0ReportService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;

    public P0ReportService(
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

    #region 1. Sales Register (Detailed)

    public async Task<SalesRegisterDetailedReportDto> GetSalesRegisterDetailedAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoiceItems
            .Include(i => i.Invoice)
                .ThenInclude(inv => inv.Branch)
            .Include(i => i.Invoice)
                .ThenInclude(inv => inv.Warehouse)
            .Include(i => i.Invoice)
                .ThenInclude(inv => inv.Party)
            .Include(i => i.Item)
                .ThenInclude(itm => itm.Category)
            .Include(i => i.Item)
                .ThenInclude(itm => itm.Brand)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted && !i.Invoice.IsDeleted && !i.Invoice.IsCancelled)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(i => i.Invoice.InvoiceDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(i => i.Invoice.InvoiceDate <= toUtc.Value);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(i => i.Invoice.BranchId == request.BranchId.Value);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(i => i.Invoice.WarehouseId == request.WarehouseId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(i => i.Invoice.PartyId == request.PartyId.Value);

        if (!string.IsNullOrWhiteSpace(request.CustomerType))
            query = query.Where(i => i.Invoice.Party != null && i.Invoice.Party.CustomerType != null && i.Invoice.Party.CustomerType.ToString() == request.CustomerType);

        if (request.ItemId.HasValue && request.ItemId.Value != Guid.Empty)
            query = query.Where(i => i.ItemId == request.ItemId.Value);

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
            query = query.Where(i => i.Item.CategoryId == request.CategoryId.Value);

        if (request.BrandId.HasValue && request.BrandId.Value != Guid.Empty)
            query = query.Where(i => i.Item.BrandId == request.BrandId.Value);

        if (request.SalesmanUserId.HasValue && request.SalesmanUserId.Value != Guid.Empty)
            query = query.Where(i => i.Invoice.SalesmanUserId == request.SalesmanUserId.Value);

        if (request.PaymentStatus.HasValue)
            query = query.Where(i => (int)i.Invoice.PaymentStatus == request.PaymentStatus.Value);

        if (request.PaymentMode.HasValue)
            query = query.Where(i => (int)i.Invoice.PrimaryPaymentMode == request.PaymentMode.Value);

        if (request.GstRate.HasValue)
            query = query.Where(i => i.GstRate == request.GstRate.Value);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(i =>
                i.Invoice.InvoiceNumber.ToLower().Contains(term) ||
                i.Invoice.CustomerName.ToLower().Contains(term) ||
                i.ItemName.ToLower().Contains(term) ||
                i.ItemSku.ToLower().Contains(term) ||
                (i.HsnCode != null && i.HsnCode.Contains(term)) ||
                (i.BatchNumber != null && i.BatchNumber.ToLower().Contains(term)));
        }

        var totalQty = await query.SumAsync(i => (decimal?)i.Quantity, cancellationToken) ?? 0m;
        var totalGross = await query.SumAsync(i => (decimal?)(i.Quantity * i.UnitPrice), cancellationToken) ?? 0m;
        var totalDiscount = await query.SumAsync(i => (decimal?)i.DiscountAmount, cancellationToken) ?? 0m;
        var totalTaxable = await query.SumAsync(i => (decimal?)i.TaxableAmount, cancellationToken) ?? 0m;
        var totalCgst = await query.SumAsync(i => (decimal?)i.CgstAmount, cancellationToken) ?? 0m;
        var totalSgst = await query.SumAsync(i => (decimal?)i.SgstAmount, cancellationToken) ?? 0m;
        var totalIgst = await query.SumAsync(i => (decimal?)i.IgstAmount, cancellationToken) ?? 0m;
        var totalCess = await query.SumAsync(i => (decimal?)i.CessAmount, cancellationToken) ?? 0m;
        var totalTax = totalCgst + totalSgst + totalIgst + totalCess;

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(500, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .OrderByDescending(i => i.Invoice.InvoiceDate)
            .ThenByDescending(i => i.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new SalesRegisterLineItemDto(
                i.InvoiceId,
                i.Invoice.InvoiceNumber,
                i.Invoice.InvoiceDate,
                i.Invoice.PartyId,
                i.Invoice.CustomerName,
                i.Invoice.CustomerGSTIN,
                i.Invoice.Party != null && i.Invoice.Party.CustomerType != null ? i.Invoice.Party.CustomerType.ToString()! : "Retail",
                i.Invoice.SalesmanUserId,
                null,
                i.ItemId,
                i.ItemName,
                i.ItemSku,
                i.Item.Barcode,
                i.HsnCode,
                i.BatchNumber,
                i.ExpiryDate,
                i.Quantity,
                i.UomCode,
                i.UnitPrice,
                i.Quantity * i.UnitPrice,
                i.DiscountAmount,
                i.TaxableAmount,
                i.GstRate,
                i.CgstAmount,
                i.SgstAmount,
                i.IgstAmount,
                i.CessAmount,
                i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount,
                i.TotalAmount,
                i.Invoice.PaidAmount,
                i.Invoice.BalanceAmount,
                i.Invoice.PaymentStatus.ToString(),
                i.Invoice.PrimaryPaymentMode.ToString(),
                i.Invoice.BranchId,
                i.Invoice.Branch.BranchName,
                i.Invoice.WarehouseId,
                i.Invoice.Warehouse.WarehouseName,
                i.Invoice.BillingStateCode
            ))
            .ToListAsync(cancellationToken);

        var invoiceQuery = query.Select(i => i.Invoice).Distinct();
        var totalInvoicesCount = await invoiceQuery.CountAsync(cancellationToken);
        var totalNetInvoiceValue = await invoiceQuery.SumAsync(inv => (decimal?)inv.TotalAmount, cancellationToken) ?? 0m;
        var totalPaid = await invoiceQuery.SumAsync(inv => (decimal?)inv.PaidAmount, cancellationToken) ?? 0m;
        var totalOutstanding = await invoiceQuery.SumAsync(inv => (decimal?)inv.BalanceAmount, cancellationToken) ?? 0m;

        return new SalesRegisterDetailedReportDto(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalQty,
            totalGross,
            totalDiscount,
            totalTaxable,
            totalCgst,
            totalSgst,
            totalIgst,
            totalCess,
            totalTax,
            totalNetInvoiceValue,
            totalPaid,
            totalOutstanding,
            totalInvoicesCount
        );
    }

    #endregion

    #region 2. Sales Summary

    public async Task<SalesSummaryReportDto> GetSalesSummaryAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoices
            .Include(inv => inv.Branch)
            .Include(inv => inv.Warehouse)
            .Include(inv => inv.Party)
            .Include(inv => inv.Items)
            .Where(inv => inv.TenantId == tenantId && !inv.IsDeleted && !inv.IsCancelled)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(inv => inv.InvoiceDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(inv => inv.InvoiceDate <= toUtc.Value);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(inv => inv.BranchId == request.BranchId.Value);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(inv => inv.WarehouseId == request.WarehouseId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(inv => inv.PartyId == request.PartyId.Value);

        var invoices = await query.ToListAsync(cancellationToken);

        var returnsQuery = _context.SalesReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled);

        if (fromUtc.HasValue) returnsQuery = returnsQuery.Where(r => r.ReturnDate >= fromUtc.Value);
        if (toUtc.HasValue) returnsQuery = returnsQuery.Where(r => r.ReturnDate <= toUtc.Value);
        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            returnsQuery = returnsQuery.Where(r => r.BranchId == request.BranchId.Value);
        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            returnsQuery = returnsQuery.Where(r => r.WarehouseId == request.WarehouseId.Value);
        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            returnsQuery = returnsQuery.Where(r => r.PartyId == request.PartyId.Value);

        var salesReturnsList = await returnsQuery.ToListAsync(cancellationToken);

        var groupBy = (request.GroupBy ?? "date").ToLowerInvariant();

        var grouped = invoices.GroupBy(inv =>
        {
            return groupBy switch
            {
                "customer" => (inv.PartyId?.ToString() ?? inv.CustomerName, inv.CustomerName),
                "branch" => (inv.BranchId.ToString(), inv.Branch?.BranchName ?? "Head Office"),
                "warehouse" => (inv.WarehouseId.ToString(), inv.Warehouse?.WarehouseName ?? "Main Godown"),
                "mode" => (inv.PrimaryPaymentMode.ToString(), inv.PrimaryPaymentMode.ToString()),
                "month" => (inv.InvoiceDate.ToString("yyyy-MM"), inv.InvoiceDate.ToString("MMM yyyy")),
                "yearly" => (inv.InvoiceDate.Year.ToString(), "FY " + inv.InvoiceDate.Year),
                _ => (inv.InvoiceDate.ToString("yyyy-MM-dd"), inv.InvoiceDate.ToString("dd MMM yyyy"))
            };
        });

        var rows = new List<SalesSummaryGroupRowDto>();

        foreach (var group in grouped.OrderByDescending(g => g.Key.Item1))
        {
            var invCount = group.Count();
            var totalQtySold = group.Sum(inv => inv.Items.Sum(i => i.Quantity));
            var gross = group.Where(i => i.InvoiceType != InvoiceType.CreditNote).Sum(i => i.TotalAmount);

            var tableReturns = salesReturnsList.Where(r =>
            {
                return groupBy switch
                {
                    "customer" => r.PartyId.ToString() == group.Key.Item1 || r.CustomerName.Equals(group.Key.Item2, StringComparison.OrdinalIgnoreCase),
                    "branch" => r.BranchId.ToString() == group.Key.Item1,
                    "warehouse" => r.WarehouseId.ToString() == group.Key.Item1,
                    "month" => r.ReturnDate.ToString("yyyy-MM") == group.Key.Item1,
                    "yearly" => r.ReturnDate.Year.ToString() == group.Key.Item1,
                    _ => r.ReturnDate.ToString("yyyy-MM-dd") == group.Key.Item1
                };
            }).Sum(r => r.TotalAmount);

            var returns = group.Where(i => i.InvoiceType == InvoiceType.CreditNote).Sum(i => i.TotalAmount) + tableReturns;
            var net = Math.Max(0m, gross - returns);
            var taxable = group.Sum(i => i.TaxableAmount);
            var tax = group.Sum(i => i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount);
            var discount = group.Sum(i => i.ItemDiscountTotal + i.InvoiceDiscountAmount);
            var paid = group.Sum(i => i.PaidAmount);
            var balance = group.Sum(i => i.BalanceAmount);

            rows.Add(new SalesSummaryGroupRowDto(
                group.Key.Item1,
                group.Key.Item2,
                invCount,
                totalQtySold,
                gross,
                returns,
                net,
                taxable,
                tax,
                discount,
                paid,
                balance
            ));
        }

        var grandGross = rows.Sum(r => r.GrossSales);
        var grandReturns = rows.Sum(r => r.ReturnsAmount);
        var grandNet = rows.Sum(r => r.NetSales);
        var grandTaxable = rows.Sum(r => r.TaxableSales);
        var grandTax = rows.Sum(r => r.TaxAmount);
        var grandDiscount = rows.Sum(r => r.DiscountAmount);
        var grandPaid = rows.Sum(r => r.PaidAmount);
        var grandBalance = rows.Sum(r => r.OutstandingAmount);
        var grandInvoices = rows.Sum(r => r.InvoiceCount);
        var grandQty = rows.Sum(r => r.TotalQuantitySold);

        return new SalesSummaryReportDto(
            rows,
            grandGross,
            grandReturns,
            grandNet,
            grandTaxable,
            grandTax,
            grandDiscount,
            grandPaid,
            grandBalance,
            grandInvoices,
            grandQty
        );
    }

    #endregion

    #region 3. Purchase Register (Detailed)

    public async Task<PurchaseRegisterDetailedReportDto> GetPurchaseRegisterDetailedAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseBillItems
            .Include(i => i.PurchaseBill)
                .ThenInclude(b => b.Branch)
            .Include(i => i.PurchaseBill)
                .ThenInclude(b => b.Warehouse)
            .Include(i => i.PurchaseBill)
                .ThenInclude(b => b.Party)
            .Include(i => i.Item)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted && !i.PurchaseBill.IsDeleted)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(i => i.PurchaseBill.BillDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(i => i.PurchaseBill.BillDate <= toUtc.Value);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(i => i.PurchaseBill.BranchId == request.BranchId.Value);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(i => i.PurchaseBill.WarehouseId == request.WarehouseId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(i => i.PurchaseBill.PartyId == request.PartyId.Value);

        if (request.ItemId.HasValue && request.ItemId.Value != Guid.Empty)
            query = query.Where(i => i.ItemId == request.ItemId.Value);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(i =>
                i.PurchaseBill.BillNumber.ToLower().Contains(term) ||
                (i.PurchaseBill.VendorInvoiceNumber != null && i.PurchaseBill.VendorInvoiceNumber.ToLower().Contains(term)) ||
                i.PurchaseBill.SupplierName.ToLower().Contains(term) ||
                i.ItemName.ToLower().Contains(term) ||
                i.ItemSku.ToLower().Contains(term));
        }

        var totalQty = await query.SumAsync(i => (decimal?)i.Quantity, cancellationToken) ?? 0m;
        var totalGross = await query.SumAsync(i => (decimal?)(i.Quantity * i.UnitPrice), cancellationToken) ?? 0m;
        var totalDiscount = await query.SumAsync(i => (decimal?)i.DiscountAmount, cancellationToken) ?? 0m;
        var totalTaxable = await query.SumAsync(i => (decimal?)i.TaxableAmount, cancellationToken) ?? 0m;
        var totalCgst = await query.SumAsync(i => (decimal?)i.CgstAmount, cancellationToken) ?? 0m;
        var totalSgst = await query.SumAsync(i => (decimal?)i.SgstAmount, cancellationToken) ?? 0m;
        var totalIgst = await query.SumAsync(i => (decimal?)i.IgstAmount, cancellationToken) ?? 0m;
        var totalCess = await query.SumAsync(i => (decimal?)i.CessAmount, cancellationToken) ?? 0m;
        var totalTax = totalCgst + totalSgst + totalIgst + totalCess;

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(500, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .OrderByDescending(i => i.PurchaseBill.BillDate)
            .ThenByDescending(i => i.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new PurchaseRegisterLineItemDto(
                i.PurchaseBillId,
                i.PurchaseBill.BillNumber,
                i.PurchaseBill.VendorInvoiceNumber,
                i.PurchaseBill.BillDate,
                i.PurchaseBill.PartyId,
                i.PurchaseBill.SupplierName,
                i.PurchaseBill.SupplierGSTIN,
                i.ItemId,
                i.ItemName,
                i.ItemSku,
                i.HsnCode,
                i.BatchNumber,
                i.Quantity,
                i.UomCode,
                i.UnitPrice,
                i.Quantity * i.UnitPrice,
                i.DiscountAmount,
                i.TaxableAmount,
                i.GstRate,
                i.CgstAmount,
                i.SgstAmount,
                i.IgstAmount,
                i.CessAmount,
                i.CgstAmount + i.SgstAmount + i.IgstAmount + i.CessAmount,
                i.TotalAmount,
                i.PurchaseBill.PaidAmount,
                i.PurchaseBill.BalanceAmount,
                i.PurchaseBill.PaymentStatus.ToString(),
                i.PurchaseBill.BranchId,
                i.PurchaseBill.Branch.BranchName,
                i.PurchaseBill.WarehouseId,
                i.PurchaseBill.Warehouse.WarehouseName
            ))
            .ToListAsync(cancellationToken);

        var billQuery = query.Select(i => i.PurchaseBill).Distinct();
        var totalBillsCount = await billQuery.CountAsync(cancellationToken);
        var totalNetBillValue = await billQuery.SumAsync(b => (decimal?)b.TotalAmount, cancellationToken) ?? 0m;
        var totalPaid = await billQuery.SumAsync(b => (decimal?)b.PaidAmount, cancellationToken) ?? 0m;
        var totalOutstanding = await billQuery.SumAsync(b => (decimal?)b.BalanceAmount, cancellationToken) ?? 0m;

        return new PurchaseRegisterDetailedReportDto(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalQty,
            totalGross,
            totalDiscount,
            totalTaxable,
            totalCgst,
            totalSgst,
            totalIgst,
            totalCess,
            totalTax,
            totalNetBillValue,
            totalPaid,
            totalOutstanding,
            totalBillsCount
        );
    }

    #endregion

    #region 4. Purchase Summary

    public async Task<PurchaseSummaryReportDto> GetPurchaseSummaryAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseBills
            .Include(b => b.Branch)
            .Include(b => b.Warehouse)
            .Include(b => b.Party)
            .Include(b => b.Items)
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && !b.IsCancelled && b.Status != PurchaseBillStatus.Cancelled)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(b => b.BillDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(b => b.BillDate <= toUtc.Value);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(b => b.BranchId == request.BranchId.Value);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(b => b.WarehouseId == request.WarehouseId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(b => b.PartyId == request.PartyId.Value);

        var bills = await query.ToListAsync(cancellationToken);

        var groupBy = (request.GroupBy ?? "date").ToLowerInvariant();

        var grouped = bills.GroupBy(b =>
        {
            return groupBy switch
            {
                "supplier" => (b.PartyId.ToString(), b.SupplierName),
                "branch" => (b.BranchId.ToString(), b.Branch?.BranchName ?? "Head Office"),
                "warehouse" => (b.WarehouseId.ToString(), b.Warehouse?.WarehouseName ?? "Main Godown"),
                "month" => (b.BillDate.ToString("yyyy-MM"), b.BillDate.ToString("MMM yyyy")),
                "yearly" => (b.BillDate.Year.ToString(), "FY " + b.BillDate.Year),
                _ => (b.BillDate.ToString("yyyy-MM-dd"), b.BillDate.ToString("dd MMM yyyy"))
            };
        });

        var rows = new List<PurchaseSummaryGroupRowDto>();

        foreach (var group in grouped.OrderByDescending(g => g.Key.Item1))
        {
            var billCount = group.Count();
            var totalQty = group.Sum(b => b.Items.Sum(i => i.Quantity));
            var gross = group.Sum(b => b.TotalAmount);
            var returns = 0m;
            var net = gross - returns;
            var taxable = group.Sum(b => b.TaxableAmount);
            var tax = group.Sum(b => b.CgstAmount + b.SgstAmount + b.IgstAmount + b.CessAmount);
            var discount = group.Sum(b => b.DiscountTotal);
            var paid = group.Sum(b => b.PaidAmount);
            var balance = group.Sum(b => b.BalanceAmount);

            rows.Add(new PurchaseSummaryGroupRowDto(
                group.Key.Item1,
                group.Key.Item2,
                billCount,
                totalQty,
                gross,
                returns,
                net,
                taxable,
                tax,
                discount,
                paid,
                balance
            ));
        }

        var grandGross = rows.Sum(r => r.GrossPurchase);
        var grandReturns = rows.Sum(r => r.ReturnsAmount);
        var grandNet = rows.Sum(r => r.NetPurchase);
        var grandTaxable = rows.Sum(r => r.TaxablePurchase);
        var grandTax = rows.Sum(r => r.TaxAmount);
        var grandDiscount = rows.Sum(r => r.DiscountAmount);
        var grandPaid = rows.Sum(r => r.PaidAmount);
        var grandBalance = rows.Sum(r => r.OutstandingAmount);
        var grandBills = rows.Sum(r => r.BillCount);
        var grandQty = rows.Sum(r => r.TotalQuantityPurchased);

        return new PurchaseSummaryReportDto(
            rows,
            grandGross,
            grandReturns,
            grandNet,
            grandTaxable,
            grandTax,
            grandDiscount,
            grandPaid,
            grandBalance,
            grandBills,
            grandQty
        );
    }

    #endregion

    #region 5. Real-Time Stock Balance

    public async Task<RealTimeStockBalanceReportDto> GetRealTimeStockBalanceAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.ItemWarehouseStocks
            .Include(s => s.Item)
                .ThenInclude(itm => itm.Category)
            .Include(s => s.Item)
                .ThenInclude(itm => itm.Brand)
            .Include(s => s.Warehouse)
            .Include(s => s.Batch)
            .Include(s => s.Variant)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.Item.IsDeleted)
            .AsNoTracking();

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(s => s.WarehouseId == request.WarehouseId.Value);

        if (request.ItemId.HasValue && request.ItemId.Value != Guid.Empty)
            query = query.Where(s => s.ItemId == request.ItemId.Value);

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
            query = query.Where(s => s.Item.CategoryId == request.CategoryId.Value);

        if (request.BrandId.HasValue && request.BrandId.Value != Guid.Empty)
            query = query.Where(s => s.Item.BrandId == request.BrandId.Value);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(s =>
                s.Item.Name.ToLower().Contains(term) ||
                s.Item.Sku.ToLower().Contains(term) ||
                (s.Variant != null && s.Variant.VariantSku.ToLower().Contains(term)) ||
                (s.Variant != null && s.Variant.VariantName.ToLower().Contains(term)) ||
                (s.Batch != null && s.Batch.BatchNumber.ToLower().Contains(term)));
        }

        var list = await query.ToListAsync(cancellationToken);

        var projected = list.Select(s =>
        {
            var current = s.CurrentQuantity;
            var reserved = s.ReservedQuantity;
            var available = current - reserved;
            var minAlert = s.Item.MinimumStockAlert;
            var reorderQty = s.Item.ReorderQuantity;
            var deficit = minAlert > current ? minAlert - current : 0m;
            var costRate = s.Batch != null && s.Batch.PurchaseRate > 0 ? s.Batch.PurchaseRate : s.Item.PurchasePrice;
            var stockVal = current * costRate;

            string status = "Available";
            if (current < 0) status = "Negative";
            else if (current == 0) status = "Zero";
            else if (minAlert > 0 && current <= (minAlert * 0.5m)) status = "Critical";
            else if (minAlert > 0 && current <= minAlert) status = "Low";
            else if (minAlert > 0 && current >= (minAlert * 6m)) status = "Overstock";

            var (sz, col) = ExtractSizeAndColor(s.Variant?.AttributesJson ?? s.Item.AttributesJson);
            var variantSku = s.Variant?.VariantSku;
            var variantName = s.Variant?.VariantName;

            return new RealTimeStockBalanceItemDto(
                s.ItemId,
                !string.IsNullOrWhiteSpace(variantSku) ? variantSku : s.Item.Sku,
                s.Item.Name,
                s.Item.Category?.Name ?? "General",
                s.Item.Brand?.Name ?? "Standard",
                s.WarehouseId,
                s.Warehouse.WarehouseName,
                s.BatchId,
                s.Batch?.BatchNumber,
                s.Batch?.ExpiryDate,
                current,
                available,
                reserved,
                minAlert,
                reorderQty,
                deficit,
                costRate,
                stockVal,
                status,
                s.VariantId,
                variantSku,
                variantName,
                sz,
                col
            );
        }).ToList();

        if (!string.IsNullOrWhiteSpace(request.GroupBy) && request.GroupBy.ToLower() == "low")
        {
            projected = projected.Where(p => p.StockStatus == "Low" || p.StockStatus == "Critical" || p.StockStatus == "Zero").ToList();
        }

        var totalCount = projected.Count;
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(500, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var pagedItems = projected
            .OrderBy(p => p.ProductName)
            .ThenBy(p => p.WarehouseName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var totalCurrentStock = projected.Sum(p => p.CurrentStock);
        var totalValuation = projected.Sum(p => p.StockValue);
        var totalLow = projected.Count(p => p.StockStatus == "Low" || p.StockStatus == "Critical");
        var totalZero = projected.Count(p => p.StockStatus == "Zero");
        var totalNegative = projected.Count(p => p.StockStatus == "Negative");

        return new RealTimeStockBalanceReportDto(
            pagedItems,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalCurrentStock,
            totalValuation,
            totalLow,
            totalZero,
            totalNegative
        );
    }

    #endregion

    #region 6. Stock Valuation

    public async Task<StockValuationReportDto> GetStockValuationAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var stockBalancesQuery = _context.ItemWarehouseStocks
            .Include(s => s.Item)
                .ThenInclude(itm => itm.Category)
            .Include(s => s.Item)
                .ThenInclude(itm => itm.Brand)
            .Include(s => s.Warehouse)
            .Include(s => s.Batch)
            .Include(s => s.Variant)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.Item.IsDeleted)
            .AsNoTracking();

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.WarehouseId == request.WarehouseId.Value);

        if (request.ItemId.HasValue && request.ItemId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.ItemId == request.ItemId.Value);

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.Item.CategoryId == request.CategoryId.Value);

        var balances = await stockBalancesQuery.ToListAsync(cancellationToken);

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);
        var effectiveFromUtc = fromUtc ?? DateTime.UtcNow.AddMonths(-1);
        var effectiveToUtc = toUtc ?? DateTime.UtcNow;

        var movements = await _context.StockMovements
            .Where(sm => sm.TenantId == tenantId && sm.CreatedAtUtc >= effectiveFromUtc && sm.CreatedAtUtc <= effectiveToUtc && !sm.IsDeleted)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var list = new List<StockValuationItemDto>();

        foreach (var s in balances)
        {
            var itemMoves = movements.Where(m => m.ItemId == s.ItemId && 
                                                 m.WarehouseId == s.WarehouseId &&
                                                 (!s.VariantId.HasValue || m.VariantId == s.VariantId.Value) &&
                                                 (!s.BatchId.HasValue || m.BatchId == s.BatchId.Value)).ToList();

            var inward = itemMoves.Where(m => m.MovementType == StockMovementType.PurchaseInward || m.MovementType == StockMovementType.TransferIn || m.MovementType == StockMovementType.SalesReturn).Sum(m => m.Quantity);
            var outward = Math.Abs(itemMoves.Where(m => m.MovementType == StockMovementType.SalesOutward || m.MovementType == StockMovementType.TransferOut || m.MovementType == StockMovementType.PurchaseReturn).Sum(m => m.Quantity));
            var adjustments = itemMoves.Where(m => m.MovementType == StockMovementType.PhysicalAdjustment || m.MovementType == StockMovementType.DamageLoss || m.MovementType == StockMovementType.ExpiredWriteOff).Sum(m => m.Quantity);

            var closing = s.CurrentQuantity;
            var opening = closing - inward + outward - adjustments;
            var costRate = s.Batch != null && s.Batch.PurchaseRate > 0 ? s.Batch.PurchaseRate : s.Item.PurchasePrice;
            var val = closing * costRate;

            var (sz, col) = ExtractSizeAndColor(s.Variant?.AttributesJson ?? s.Item.AttributesJson);
            var variantSku = s.Variant?.VariantSku;
            var variantName = s.Variant?.VariantName;

            list.Add(new StockValuationItemDto(
                s.ItemId,
                !string.IsNullOrWhiteSpace(variantSku) ? variantSku : s.Item.Sku,
                s.Item.Name,
                s.Item.Category?.Name ?? "General",
                s.Item.Brand?.Name ?? "Standard",
                s.WarehouseId,
                s.Warehouse.WarehouseName,
                s.BatchId,
                s.Batch?.BatchNumber,
                opening,
                inward,
                outward,
                adjustments,
                closing,
                costRate,
                val,
                "WeightedPurchaseCost",
                s.VariantId,
                variantSku,
                variantName,
                sz,
                col
            ));
        }

        var totalCount = list.Count;
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(500, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var paged = list
            .OrderBy(i => i.ProductName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var grandOpening = list.Sum(i => i.OpeningQuantity);
        var grandInward = list.Sum(i => i.InwardQuantity);
        var grandOutward = list.Sum(i => i.OutwardQuantity);
        var grandAdj = list.Sum(i => i.AdjustmentQuantity);
        var grandClosing = list.Sum(i => i.ClosingQuantity);
        var grandVal = list.Sum(i => i.StockValue);

        return new StockValuationReportDto(
            paged,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            grandOpening,
            grandInward,
            grandOutward,
            grandAdj,
            grandClosing,
            grandVal
        );
    }

    #endregion

    #region 7. Debtor (Receivable) Ageing Schedule

    public async Task<DebtorAgeingReportDto> GetDebtorAgeingScheduleAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoices
            .Include(inv => inv.Party)
            .Where(inv => inv.TenantId == tenantId && !inv.IsDeleted && !inv.IsCancelled && inv.BalanceAmount > 0)
            .AsNoTracking();

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(inv => inv.BranchId == request.BranchId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(inv => inv.PartyId == request.PartyId.Value);

        var invoices = await query.ToListAsync(cancellationToken);
        var asOf = request.ToDate.HasValue ? request.ToDate.Value.Date : DateTime.UtcNow.Date;

        var invoiceRows = new List<DebtorAgeingInvoiceRowDto>();

        foreach (var inv in invoices)
        {
            var dueDate = inv.DueDate?.Date ?? inv.InvoiceDate.Date.AddDays(inv.Party?.CreditPeriodDays ?? 0);
            var overdueDays = (int)(asOf - dueDate).TotalDays;

            string bucket;
            if (overdueDays <= 0) bucket = "NotDue";
            else if (overdueDays <= 15) bucket = "1-15";
            else if (overdueDays <= 30) bucket = "16-30";
            else if (overdueDays <= 45) bucket = "31-45";
            else if (overdueDays <= 60) bucket = "46-60";
            else if (overdueDays <= 90) bucket = "61-90";
            else if (overdueDays <= 180) bucket = "91-180";
            else if (overdueDays <= 365) bucket = "181-365";
            else bucket = "365+";

            var creditLimit = inv.Party?.CreditLimit ?? 0m;
            var balance = inv.BalanceAmount;
            var utilization = creditLimit > 0 ? Math.Round((balance / creditLimit) * 100m, 1) : 0m;

            invoiceRows.Add(new DebtorAgeingInvoiceRowDto(
                inv.PartyId ?? Guid.Empty,
                inv.Party?.LegalName ?? inv.CustomerName,
                inv.Party?.PrimaryPhone ?? inv.CustomerPhone,
                inv.Id,
                inv.InvoiceNumber,
                inv.InvoiceDate,
                dueDate,
                inv.TotalAmount,
                inv.PaidAmount,
                balance,
                Math.Max(0, overdueDays),
                bucket,
                creditLimit,
                utilization
            ));
        }

        var customerSummaries = invoiceRows
            .GroupBy(i => (i.PartyId, i.CustomerName, i.Phone, i.CreditLimit))
            .Select(g => new DebtorAgeingCustomerSummaryDto(
                g.Key.PartyId,
                g.Key.CustomerName,
                g.Key.Phone,
                g.Key.CreditLimit,
                g.Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "NotDue").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "1-15").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "16-30").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "31-45").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "46-60").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "61-90").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "91-180").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "181-365").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "365+").Sum(x => x.OutstandingAmount)
            ))
            .OrderByDescending(c => c.TotalReceivable)
            .ToList();

        var grandReceivable = invoiceRows.Sum(i => i.OutstandingAmount);
        var grandNotDue = invoiceRows.Where(i => i.AgeingBucket == "NotDue").Sum(i => i.OutstandingAmount);
        var grandOverdue = grandReceivable - grandNotDue;

        return new DebtorAgeingReportDto(
            invoiceRows.OrderByDescending(i => i.DaysOverdue).ToList(),
            customerSummaries,
            grandReceivable,
            grandNotDue,
            grandOverdue,
            invoiceRows.Where(i => i.AgeingBucket == "1-15").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "16-30").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "31-45").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "46-60").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "61-90").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "91-180").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "181-365").Sum(i => i.OutstandingAmount),
            invoiceRows.Where(i => i.AgeingBucket == "365+").Sum(i => i.OutstandingAmount)
        );
    }

    #endregion

    #region 8. Creditor (Payable) Ageing Schedule

    public async Task<CreditorAgeingReportDto> GetCreditorAgeingScheduleAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseBills
            .Include(b => b.Party)
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && !b.IsCancelled && b.Status != PurchaseBillStatus.Cancelled && b.BalanceAmount > 0)
            .AsNoTracking();

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(b => b.BranchId == request.BranchId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(b => b.PartyId == request.PartyId.Value);

        var bills = await query.ToListAsync(cancellationToken);
        var asOf = request.ToDate.HasValue ? request.ToDate.Value.Date : DateTime.UtcNow.Date;

        var billRows = new List<CreditorAgeingBillRowDto>();

        foreach (var b in bills)
        {
            var dueDate = b.DueDate?.Date ?? b.BillDate.Date.AddDays(b.Party?.CreditPeriodDays ?? 0);
            var overdueDays = (int)(asOf - dueDate).TotalDays;

            string bucket;
            if (overdueDays <= 0) bucket = "NotDue";
            else if (overdueDays <= 15) bucket = "1-15";
            else if (overdueDays <= 30) bucket = "16-30";
            else if (overdueDays <= 45) bucket = "31-45";
            else if (overdueDays <= 60) bucket = "46-60";
            else if (overdueDays <= 90) bucket = "61-90";
            else if (overdueDays <= 180) bucket = "91-180";
            else if (overdueDays <= 365) bucket = "181-365";
            else bucket = "365+";

            billRows.Add(new CreditorAgeingBillRowDto(
                b.PartyId,
                b.SupplierName,
                b.Party?.PrimaryPhone,
                b.Id,
                b.BillNumber,
                b.VendorInvoiceNumber,
                b.BillDate,
                dueDate,
                b.TotalAmount,
                b.PaidAmount,
                b.BalanceAmount,
                Math.Max(0, overdueDays),
                bucket
            ));
        }

        var supplierSummaries = billRows
            .GroupBy(b => (b.PartyId, b.SupplierName, b.Phone))
            .Select(g => new CreditorAgeingSupplierSummaryDto(
                g.Key.PartyId,
                g.Key.SupplierName,
                g.Key.Phone,
                g.Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "NotDue").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "1-15").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "16-30").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "31-45").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "46-60").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "61-90").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "91-180").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "181-365").Sum(x => x.OutstandingAmount),
                g.Where(x => x.AgeingBucket == "365+").Sum(x => x.OutstandingAmount)
            ))
            .OrderByDescending(s => s.TotalPayable)
            .ToList();

        var grandPayable = billRows.Sum(b => b.OutstandingAmount);
        var grandNotDue = billRows.Where(b => b.AgeingBucket == "NotDue").Sum(b => b.OutstandingAmount);
        var grandOverdue = grandPayable - grandNotDue;

        return new CreditorAgeingReportDto(
            billRows.OrderByDescending(b => b.DaysOverdue).ToList(),
            supplierSummaries,
            grandPayable,
            grandNotDue,
            grandOverdue,
            billRows.Where(b => b.AgeingBucket == "1-15").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "16-30").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "31-45").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "46-60").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "61-90").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "91-180").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "181-365").Sum(b => b.OutstandingAmount),
            billRows.Where(b => b.AgeingBucket == "365+").Sum(b => b.OutstandingAmount)
        );
    }

    #endregion

    #region 9. True Profit & Loss (P&L)

    public async Task<TruePnLReportDto> GetTruePnLReportAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: true);

        var salesQuery = _context.SalesInvoices
            .Where(inv => inv.TenantId == tenantId && !inv.IsDeleted && !inv.IsCancelled);

        if (fromUtc.HasValue)
            salesQuery = salesQuery.Where(inv => inv.InvoiceDate >= fromUtc.Value);
        if (toUtc.HasValue)
            salesQuery = salesQuery.Where(inv => inv.InvoiceDate <= toUtc.Value);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            salesQuery = salesQuery.Where(inv => inv.BranchId == request.BranchId.Value);

        var grossSales = await salesQuery
            .Where(inv => inv.InvoiceType != InvoiceType.CreditNote)
            .SumAsync(inv => (decimal?)inv.TaxableAmount, cancellationToken) ?? 0m;

        var salesReturnQuery = _context.SalesReturns
            .Where(r => r.TenantId == tenantId && !r.IsDeleted && !r.IsCancelled);

        if (fromUtc.HasValue)
            salesReturnQuery = salesReturnQuery.Where(r => r.ReturnDate >= fromUtc.Value);
        if (toUtc.HasValue)
            salesReturnQuery = salesReturnQuery.Where(r => r.ReturnDate <= toUtc.Value);
        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            salesReturnQuery = salesReturnQuery.Where(r => r.BranchId == request.BranchId.Value);

        var salesReturnsFromTable = await salesReturnQuery
            .SumAsync(r => (decimal?)r.SubTotal, cancellationToken) ?? 0m;

        var salesReturnsFromInvoice = await salesQuery
            .Where(inv => inv.InvoiceType == InvoiceType.CreditNote)
            .SumAsync(inv => (decimal?)inv.TaxableAmount, cancellationToken) ?? 0m;

        var salesReturns = salesReturnsFromInvoice + salesReturnsFromTable;
        var netSales = Math.Max(0m, grossSales - salesReturns);

        var purchaseQuery = _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && b.BillDate >= fromUtc && b.BillDate <= toUtc && !b.IsDeleted && !b.IsCancelled && b.Status != PurchaseBillStatus.Cancelled);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            purchaseQuery = purchaseQuery.Where(b => b.BranchId == request.BranchId.Value);

        var grossPurchases = await purchaseQuery
            .SumAsync(b => (decimal?)b.TaxableAmount, cancellationToken) ?? 0m;

        var prQuery = _context.PurchaseReturns
            .Where(pr => pr.TenantId == tenantId && !pr.IsDeleted && !pr.IsCancelled);
        if (fromUtc.HasValue) prQuery = prQuery.Where(pr => pr.ReturnDate >= fromUtc.Value);
        if (toUtc.HasValue) prQuery = prQuery.Where(pr => pr.ReturnDate <= toUtc.Value);
        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            prQuery = prQuery.Where(pr => pr.BranchId == request.BranchId.Value);

        var purchaseReturns = await prQuery
            .SumAsync(pr => (decimal?)pr.SubTotal, cancellationToken) ?? 0m;

        var netPurchases = Math.Max(0m, grossPurchases - purchaseReturns);

        var stockQuery = _context.ItemWarehouseStocks
            .Include(s => s.Item)
            .Include(s => s.Batch)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.Item.IsDeleted);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
        {
            var branchWhIds = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && w.BranchId == request.BranchId.Value && !w.IsDeleted)
                .Select(w => w.Id)
                .ToListAsync(cancellationToken);
            stockQuery = stockQuery.Where(s => branchWhIds.Contains(s.WarehouseId));
        }

        var stockBalances = await stockQuery.ToListAsync(cancellationToken);
        var closingStockVal = stockBalances.Sum(s =>
        {
            var rate = s.Batch != null && s.Batch.PurchaseRate > 0 ? s.Batch.PurchaseRate : s.Item.PurchasePrice;
            return s.CurrentQuantity * rate;
        });

        var movements = await _context.StockMovements
            .Where(sm => sm.TenantId == tenantId && sm.CreatedAtUtc >= fromUtc && sm.CreatedAtUtc <= toUtc && !sm.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalInwardQty = movements.Where(m => m.MovementType == StockMovementType.PurchaseInward || m.MovementType == StockMovementType.TransferIn).Sum(m => m.Quantity);
        var totalOutwardQty = Math.Abs(movements.Where(m => m.MovementType == StockMovementType.SalesOutward || m.MovementType == StockMovementType.TransferOut).Sum(m => m.Quantity));

        var avgCost = stockBalances.Count > 0 ? (closingStockVal / Math.Max(1m, stockBalances.Sum(s => s.CurrentQuantity))) : 0m;
        var openingStockVal = Math.Max(0m, closingStockVal - (totalInwardQty * avgCost) + (totalOutwardQty * avgCost));

        var cogs = Math.Max(0m, openingStockVal + netPurchases - closingStockVal);
        if (cogs == 0m && netSales > 0m && netPurchases > 0m)
        {
            cogs = Math.Min(netSales * 0.75m, netPurchases);
        }

        var grossProfit = netSales - cogs;
        var grossProfitMargin = netSales > 0 ? Math.Round((grossProfit / netSales) * 100m, 2) : 0m;

        var expenseQuery = _context.ExpenseVouchers
            .Include(e => e.Category)
            .Where(e => e.TenantId == tenantId && e.ExpenseDate >= fromUtc && e.ExpenseDate <= toUtc && !e.IsDeleted);

        var expenses = await expenseQuery.ToListAsync(cancellationToken);

        var expenseBreakdown = expenses
            .GroupBy(e => (e.CategoryId, e.Category?.Name ?? "General Overhead"))
            .Select(g => new PnLExpenseCategoryBreakdownDto(
                g.Key.CategoryId,
                g.Key.Item2,
                g.Sum(x => x.TotalAmount),
                netSales > 0 ? Math.Round((g.Sum(x => x.TotalAmount) / netSales) * 100m, 2) : 0m
            ))
            .OrderByDescending(x => x.Amount)
            .ToList();

        var totalExpenses = expenses.Sum(e => e.TotalAmount);
        var otherIncome = 0m;

        var netProfit = grossProfit - totalExpenses + otherIncome;
        var netProfitMargin = netSales > 0 ? Math.Round((netProfit / netSales) * 100m, 2) : 0m;

        var effectiveFrom = fromUtc ?? DateTime.UtcNow;
        var effectiveTo = toUtc ?? DateTime.UtcNow;

        return new TruePnLReportDto(
            effectiveFrom,
            effectiveTo,
            request.FinancialYear ?? (effectiveFrom.Year + "-" + (effectiveFrom.Year + 1)),
            grossSales,
            salesReturns,
            netSales,
            openingStockVal,
            grossPurchases,
            purchaseReturns,
            netPurchases,
            closingStockVal,
            cogs,
            grossProfit,
            grossProfitMargin,
            expenseBreakdown,
            totalExpenses,
            otherIncome,
            netProfit,
            netProfitMargin
        );
    }

    #endregion

    #region 10. Universal CSV Export Engine

    public async Task<(byte[] FileBytes, string FileName, string ContentType)> ExportReportCsvAsync(
        string reportType,
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        string fileName;

        switch (reportType.ToLowerInvariant())
        {
            case "sales-register":
            {
                var rep = await GetSalesRegisterDetailedAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Sales_Register_Detailed_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Invoice No,Date,Customer,GSTIN,Type,Item Name,SKU,HSN,Batch,Qty,UOM,Rate,Gross,Discount,Taxable,CGST,SGST,IGST,Total Tax,Total Amount,Paid,Outstanding,Payment Status,Branch,Warehouse");
                foreach (var i in rep.Items)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(i.InvoiceNumber),
                        i.InvoiceDate.ToString("yyyy-MM-dd"),
                        EscapeCsv(i.CustomerName),
                        EscapeCsv(i.CustomerGstin ?? ""),
                        i.CustomerType,
                        EscapeCsv(i.ProductName),
                        EscapeCsv(i.Sku),
                        EscapeCsv(i.HsnCode ?? ""),
                        EscapeCsv(i.BatchNumber ?? ""),
                        i.Quantity,
                        i.UomCode,
                        i.Rate,
                        i.GrossAmount,
                        i.DiscountAmount,
                        i.TaxableAmount,
                        i.CgstAmount,
                        i.SgstAmount,
                        i.IgstAmount,
                        i.TotalTax,
                        i.NetInvoiceValue,
                        i.PaidAmount,
                        i.OutstandingAmount,
                        i.PaymentStatus,
                        EscapeCsv(i.BranchName),
                        EscapeCsv(i.WarehouseName)
                    ));
                }
                break;
            }

            case "sales-summary":
            {
                var rep = await GetSalesSummaryAsync(request, cancellationToken);
                fileName = $"Sales_Summary_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Dimension,Invoices,Qty Sold,Gross Sales,Returns,Net Sales,Taxable,Tax,Discount,Paid,Outstanding");
                foreach (var r in rep.Rows)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(r.GroupLabel),
                        r.InvoiceCount,
                        r.TotalQuantitySold,
                        r.GrossSales,
                        r.ReturnsAmount,
                        r.NetSales,
                        r.TaxableSales,
                        r.TaxAmount,
                        r.DiscountAmount,
                        r.PaidAmount,
                        r.OutstandingAmount
                    ));
                }
                break;
            }

            case "purchase-register":
            {
                var rep = await GetPurchaseRegisterDetailedAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Purchase_Register_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Bill No,Supplier Bill No,Date,Supplier,GSTIN,Item Name,SKU,HSN,Batch,Qty,Rate,Gross,Discount,Taxable,CGST,SGST,IGST,Total,Paid,Outstanding,Payment Status,Branch");
                foreach (var i in rep.Items)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(i.BillNumber),
                        EscapeCsv(i.SupplierBillNumber ?? ""),
                        i.BillDate.ToString("yyyy-MM-dd"),
                        EscapeCsv(i.SupplierName),
                        EscapeCsv(i.SupplierGstin ?? ""),
                        EscapeCsv(i.ProductName),
                        EscapeCsv(i.Sku),
                        EscapeCsv(i.HsnCode ?? ""),
                        EscapeCsv(i.BatchNumber ?? ""),
                        i.Quantity,
                        i.PurchaseRate,
                        i.GrossAmount,
                        i.DiscountAmount,
                        i.TaxableAmount,
                        i.CgstAmount,
                        i.SgstAmount,
                        i.IgstAmount,
                        i.NetBillValue,
                        i.PaidAmount,
                        i.OutstandingAmount,
                        i.PaymentStatus,
                        EscapeCsv(i.BranchName)
                    ));
                }
                break;
            }

            case "debtor-ageing":
            {
                var rep = await GetDebtorAgeingScheduleAsync(request, cancellationToken);
                fileName = $"Debtor_Ageing_Schedule_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Customer,Phone,Credit Limit,Total Receivable,Not Due,1-15 Days,16-30 Days,31-45 Days,46-60 Days,61-90 Days,91-180 Days,181-365 Days,365+ Days");
                foreach (var c in rep.CustomerSummaries)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(c.CustomerName),
                        EscapeCsv(c.Phone ?? ""),
                        c.CreditLimit,
                        c.TotalReceivable,
                        c.NotDueAmount,
                        c.Days1To15,
                        c.Days16To30,
                        c.Days31To45,
                        c.Days46To60,
                        c.Days61To90,
                        c.Days91To180,
                        c.Days181To365,
                        c.Days365Plus
                    ));
                }
                break;
            }

            case "creditor-ageing":
            {
                var rep = await GetCreditorAgeingScheduleAsync(request, cancellationToken);
                fileName = $"Creditor_Ageing_Schedule_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Supplier,Phone,Total Payable,Not Due,1-15 Days,16-30 Days,31-45 Days,46-60 Days,61-90 Days,91-180 Days,181-365 Days,365+ Days");
                foreach (var s in rep.SupplierSummaries)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(s.SupplierName),
                        EscapeCsv(s.Phone ?? ""),
                        s.TotalPayable,
                        s.NotDueAmount,
                        s.Days1To15,
                        s.Days16To30,
                        s.Days31To45,
                        s.Days46To60,
                        s.Days61To90,
                        s.Days91To180,
                        s.Days181To365,
                        s.Days365Plus
                    ));
                }
                break;
            }

            case "stock-balance":
            {
                var rep = await GetRealTimeStockBalanceAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Stock_Balance_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                var hasVariants = rep.Items.Any(i => !string.IsNullOrEmpty(i.Size) || !string.IsNullOrEmpty(i.Color) || !string.IsNullOrEmpty(i.VariantSku));
                if (hasVariants)
                {
                    sb.AppendLine("SKU,Item Name,Size,Color,Category,Brand,Warehouse,Current Stock,Available,Reserved,Min Alert,Cost Rate,Stock Value,Status");
                    foreach (var s in rep.Items)
                    {
                        sb.AppendLine(string.Join(",",
                            EscapeCsv(s.Sku),
                            EscapeCsv(s.ProductName),
                            EscapeCsv(s.Size ?? ""),
                            EscapeCsv(s.Color ?? ""),
                            EscapeCsv(s.CategoryName),
                            EscapeCsv(s.BrandName),
                            EscapeCsv(s.WarehouseName),
                            s.CurrentStock,
                            s.AvailableStock,
                            s.ReservedStock,
                            s.MinimumAlertStock,
                            s.CostRate,
                            s.StockValue,
                            s.StockStatus
                        ));
                    }
                }
                else
                {
                    sb.AppendLine("SKU,Item Name,Category,Brand,Warehouse,Batch,Current Stock,Available,Reserved,Min Alert,Cost Rate,Stock Value,Status");
                    foreach (var s in rep.Items)
                    {
                        sb.AppendLine(string.Join(",",
                            EscapeCsv(s.Sku),
                            EscapeCsv(s.ProductName),
                            EscapeCsv(s.CategoryName),
                            EscapeCsv(s.BrandName),
                            EscapeCsv(s.WarehouseName),
                            EscapeCsv(s.BatchNumber ?? ""),
                            s.CurrentStock,
                            s.AvailableStock,
                            s.ReservedStock,
                            s.MinimumAlertStock,
                            s.CostRate,
                            s.StockValue,
                            s.StockStatus
                        ));
                    }
                }
                break;
            }

            case "stock-valuation":
            {
                var rep = await GetStockValuationAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Stock_Valuation_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                var hasVariants = rep.Items.Any(i => !string.IsNullOrEmpty(i.Size) || !string.IsNullOrEmpty(i.Color) || !string.IsNullOrEmpty(i.VariantSku));
                if (hasVariants)
                {
                    sb.AppendLine("SKU,Item Name,Size,Color,Category,Warehouse,Opening,Inward,Outward,Adjustment,Closing,Cost Rate,Stock Value");
                    foreach (var s in rep.Items)
                    {
                        sb.AppendLine(string.Join(",",
                            EscapeCsv(s.Sku),
                            EscapeCsv(s.ProductName),
                            EscapeCsv(s.Size ?? ""),
                            EscapeCsv(s.Color ?? ""),
                            EscapeCsv(s.CategoryName),
                            EscapeCsv(s.WarehouseName),
                            s.OpeningQuantity,
                            s.InwardQuantity,
                            s.OutwardQuantity,
                            s.AdjustmentQuantity,
                            s.ClosingQuantity,
                            s.CostRate,
                            s.StockValue
                        ));
                    }
                }
                else
                {
                    sb.AppendLine("SKU,Item Name,Category,Warehouse,Batch,Opening,Inward,Outward,Adjustment,Closing,Cost Rate,Stock Value");
                    foreach (var s in rep.Items)
                    {
                        sb.AppendLine(string.Join(",",
                            EscapeCsv(s.Sku),
                            EscapeCsv(s.ProductName),
                            EscapeCsv(s.CategoryName),
                            EscapeCsv(s.WarehouseName),
                            EscapeCsv(s.BatchNumber ?? ""),
                            s.OpeningQuantity,
                            s.InwardQuantity,
                            s.OutwardQuantity,
                            s.AdjustmentQuantity,
                            s.ClosingQuantity,
                            s.CostRate,
                            s.StockValue
                        ));
                    }
                }
                break;
            }

            case "company-stock-sales":
            {
                var rep = await GetCompanyStockSalesReportAsync(request, cancellationToken);
                var compTitle = string.IsNullOrWhiteSpace(rep.FilterCompanyName) ? "All_Companies" : rep.FilterCompanyName.Replace(" ", "_");
                fileName = $"Company_Stock_Sales_Statement_{compTitle}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Product,SKU,Company,Packing,MRP,Purchase Price,Sale Price,Purchase Unit,Sale Unit,Stock In (Period),Current Stock,Stock Value,Sold Qty (Period),Sale Value (Period)");
                foreach (var s in rep.Items)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(s.ItemName),
                        EscapeCsv(s.ItemSku),
                        EscapeCsv(s.CompanyName),
                        EscapeCsv(s.Packing),
                        s.Mrp,
                        s.PurchasePrice,
                        s.SalePrice,
                        EscapeCsv(s.PurchaseUnit),
                        EscapeCsv(s.SaleUnit),
                        s.StockInQuantity,
                        s.CurrentStock,
                        s.CurrentStockValue,
                        s.SoldQuantity,
                        s.SaleValue
                    ));
                }
                break;
            }

            case "sales-payments":
            {
                var rep = await GetSalesPaymentReportAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Sales_Payment_Report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Invoice No,Invoice Date,Customer Name,Phone,GSTIN,Total Sale,Payment Received,Payment Date,Balance Due,Status,Payment Mode,Payment Ref / Cheque No,Notes,Branch");
                foreach (var i in rep.Items)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(i.InvoiceNumber),
                        i.InvoiceDate.ToString("yyyy-MM-dd"),
                        EscapeCsv(i.CustomerName),
                        EscapeCsv(i.CustomerPhone ?? ""),
                        EscapeCsv(i.CustomerGstin ?? ""),
                        i.TotalAmount,
                        i.PaidAmount,
                        i.PaymentDate.HasValue ? i.PaymentDate.Value.ToString("yyyy-MM-dd") : "-",
                        i.BalanceAmount,
                        i.PaymentStatus,
                        i.PrimaryPaymentMode,
                        EscapeCsv(i.PaymentReferenceNumber ?? ""),
                        EscapeCsv(i.PaymentNotes ?? ""),
                        EscapeCsv(i.BranchName)
                    ));
                }
                break;
            }

            case "purchase-payments":
            {
                var rep = await GetPurchasePaymentReportAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Purchase_Payment_Report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                sb.AppendLine("Bill No,Vendor Inv No,Bill Date,Supplier Name,Phone,GSTIN,Total Purchase,Payment Paid,Payment Date,Balance Due,Status,Payment Mode,Payment Ref / Cheque No,Bank,Notes,Branch");
                foreach (var b in rep.Items)
                {
                    sb.AppendLine(string.Join(",",
                        EscapeCsv(b.BillNumber),
                        EscapeCsv(b.VendorInvoiceNumber ?? ""),
                        b.BillDate.ToString("yyyy-MM-dd"),
                        EscapeCsv(b.SupplierName),
                        EscapeCsv(b.SupplierPhone ?? ""),
                        EscapeCsv(b.SupplierGstin ?? ""),
                        b.TotalAmount,
                        b.PaidAmount,
                        b.PaymentDate.HasValue ? b.PaymentDate.Value.ToString("yyyy-MM-dd") : "-",
                        b.BalanceAmount,
                        b.PaymentStatus,
                        b.PrimaryPaymentMode,
                        EscapeCsv(b.PaymentReferenceNumber ?? ""),
                        EscapeCsv(b.BankName ?? ""),
                        EscapeCsv(b.PaymentNotes ?? b.Notes ?? ""),
                        EscapeCsv(b.BranchName)
                    ));
                }
                break;
            }

            default:
                throw new ArgumentException($"Unsupported export report type: {reportType}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return (bytes, fileName, "text/csv;charset=utf-8");
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private static string ExtractPacking(string? attributesJson)
    {
        if (string.IsNullOrWhiteSpace(attributesJson)) return "-";
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(attributesJson);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                var name = prop.Name.ToLowerInvariant();
                if (name == "packing" || name == "pack" || name == "packsize" || name == "packaging")
                {
                    var val = prop.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(val)) return val;
                }
            }
        }
        catch { }
        return "-";
    }

    #endregion

    #region 11. Company / Brand Stock & Sales Statement

    public async Task<CompanyStockSalesReportDto> GetCompanyStockSalesReportAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        // 1. Determine Date Range (Defaults to current month if null)
        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: true);
        var effectiveFromUtc = fromUtc ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var effectiveToUtc = toUtc ?? DateTime.UtcNow;

        // 2. Query Items (filtered by BrandId if specified)
        var itemsQuery = _context.Items
            .Include(i => i.Brand)
            .Include(i => i.PrimaryUom)
            .Include(i => i.SecondaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted && i.IsActive);

        if (request.BrandId.HasValue && request.BrandId.Value != Guid.Empty)
        {
            itemsQuery = itemsQuery.Where(i => i.BrandId == request.BrandId.Value);
        }

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
        {
            itemsQuery = itemsQuery.Where(i => i.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            itemsQuery = itemsQuery.Where(i =>
                i.Name.ToLower().Contains(term) ||
                i.Sku.ToLower().Contains(term) ||
                (i.Barcode != null && i.Barcode.ToLower().Contains(term)));
        }

        var items = await itemsQuery.AsNoTracking().ToListAsync(cancellationToken);
        var itemIds = items.Select(i => i.Id).ToList();

        // 3. Current Stock per Item
        var stockQuery = _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && itemIds.Contains(s.ItemId));

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
        {
            stockQuery = stockQuery.Where(s => s.WarehouseId == request.WarehouseId.Value);
        }

        var stockData = await stockQuery
            .GroupBy(s => s.ItemId)
            .Select(g => new { ItemId = g.Key, CurrentStock = g.Sum(s => s.CurrentQuantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.CurrentStock, cancellationToken);

        // 4. Stock In (Purchases in date range)
        var purchaseQuery = _context.PurchaseBillItems
            .Where(pbi => pbi.TenantId == tenantId &&
                          !pbi.IsDeleted &&
                          !pbi.PurchaseBill.IsDeleted &&
                          !pbi.PurchaseBill.IsCancelled &&
                          pbi.PurchaseBill.BillDate >= effectiveFromUtc &&
                          pbi.PurchaseBill.BillDate <= effectiveToUtc &&
                          itemIds.Contains(pbi.ItemId));

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
        {
            purchaseQuery = purchaseQuery.Where(pbi => pbi.PurchaseBill.BranchId == request.BranchId.Value);
        }
        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
        {
            purchaseQuery = purchaseQuery.Where(pbi => pbi.PurchaseBill.WarehouseId == request.WarehouseId.Value);
        }

        var purchaseData = await purchaseQuery
            .GroupBy(pbi => pbi.ItemId)
            .Select(g => new { ItemId = g.Key, StockInQty = g.Sum(p => p.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.StockInQty, cancellationToken);

        // 5. Sold Quantity and Sale Value in date range
        var salesQuery = _context.SalesInvoiceItems
            .Where(sii => sii.TenantId == tenantId &&
                          !sii.IsDeleted &&
                          !sii.Invoice.IsDeleted &&
                          !sii.Invoice.IsCancelled &&
                          sii.Invoice.InvoiceDate >= effectiveFromUtc &&
                          sii.Invoice.InvoiceDate <= effectiveToUtc &&
                          itemIds.Contains(sii.ItemId));

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
        {
            salesQuery = salesQuery.Where(sii => sii.Invoice.BranchId == request.BranchId.Value);
        }
        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
        {
            salesQuery = salesQuery.Where(sii => sii.Invoice.WarehouseId == request.WarehouseId.Value);
        }

        var salesData = await salesQuery
            .GroupBy(sii => sii.ItemId)
            .Select(g => new
            {
                ItemId = g.Key,
                SoldQty = g.Sum(s => s.Quantity),
                SaleValue = g.Sum(s => s.TotalAmount)
            })
            .ToDictionaryAsync(x => x.ItemId, cancellationToken);

        // 6. Map to DTOs
        string? filterCompanyName = null;
        if (request.BrandId.HasValue && request.BrandId.Value != Guid.Empty)
        {
            var brand = await _context.Brands.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BrandId.Value, cancellationToken);
            filterCompanyName = brand?.Name;
        }

        var rows = items.Select(itm =>
        {
            var currentStock = stockData.TryGetValue(itm.Id, out var cs) ? cs : 0m;
            var stockIn = purchaseData.TryGetValue(itm.Id, out var si) ? si : 0m;
            var soldQty = salesData.TryGetValue(itm.Id, out var sd) ? sd.SoldQty : 0m;
            var saleVal = salesData.TryGetValue(itm.Id, out var sv) ? sv.SaleValue : 0m;
            var stockVal = currentStock * itm.PurchasePrice;
            var packing = ExtractPacking(itm.AttributesJson);

            return new CompanyStockSalesItemDto(
                itm.Id,
                itm.Sku,
                itm.Name,
                itm.BrandId,
                itm.Brand?.Name ?? "General / Unbranded",
                packing,
                itm.MRP,
                itm.PurchasePrice,
                itm.SellingPrice,
                itm.PrimaryUom?.Code ?? itm.PrimaryUom?.Name ?? "Unit",
                itm.SecondaryUom?.Code ?? itm.SecondaryUom?.Name ?? itm.PrimaryUom?.Code ?? "Unit",
                stockIn,
                currentStock,
                stockVal,
                soldQty,
                saleVal
            );
        }).OrderBy(r => r.CompanyName).ThenBy(r => r.ItemName).ToList();

        var grandStockInQty = rows.Sum(r => r.StockInQuantity);
        var grandCurrentStock = rows.Sum(r => r.CurrentStock);
        var grandStockValue = rows.Sum(r => r.CurrentStockValue);
        var grandSoldQty = rows.Sum(r => r.SoldQuantity);
        var grandSaleValue = rows.Sum(r => r.SaleValue);

        return new CompanyStockSalesReportDto(
            rows,
            grandStockInQty,
            grandCurrentStock,
            grandStockValue,
            grandSoldQty,
            grandSaleValue,
            rows.Count,
            effectiveFromUtc,
            effectiveToUtc,
            filterCompanyName
        );
    }

    #endregion

    #region 12. Saved Presets

    public async Task<IReadOnlyList<SavedReportPreset>> GetSavedPresetsAsync(
        string? reportCode = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SavedReportPresets
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(reportCode))
        {
            query = query.Where(p => p.ReportCode == reportCode);
        }

        return await query.OrderByDescending(p => p.IsDefault).ThenBy(p => p.Name).ToListAsync(cancellationToken);
    }

    public async Task<SavedReportPreset> SavePresetAsync(
        SavedReportPreset preset,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        preset.TenantId = tenantId;

        if (preset.Id == Guid.Empty)
        {
            preset.Id = Guid.NewGuid();
            _context.SavedReportPresets.Add(preset);
        }
        else
        {
            var existing = await _context.SavedReportPresets
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == preset.Id && !p.IsDeleted, cancellationToken);
            if (existing != null)
            {
                existing.Name = preset.Name;
                existing.Description = preset.Description;
                existing.ConfigurationJson = preset.ConfigurationJson;
                existing.IsDefault = preset.IsDefault;
                existing.IsSharedWithTenant = preset.IsSharedWithTenant;
                existing.UpdatedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return preset;
    }

    public async Task<bool> DeletePresetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var existing = await _context.SavedReportPresets
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == id && !p.IsDeleted, cancellationToken);

        if (existing == null) return false;

        existing.IsDeleted = true;
        existing.DeletedAtUtc = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    #endregion

    #region 12. Dedicated Sale & Purchase Payment Reports

    public async Task<SalesPaymentReportDto> GetSalesPaymentReportAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && !i.IsDeleted && !i.IsCancelled && i.Status != InvoiceStatus.Cancelled)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);
        if (fromUtc.HasValue)
            query = query.Where(i => i.InvoiceDate >= fromUtc.Value);
        if (toUtc.HasValue)
            query = query.Where(i => i.InvoiceDate <= toUtc.Value);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(i => i.BranchId == request.BranchId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(i => i.PartyId == request.PartyId.Value);

        if (request.PaymentStatus.HasValue)
            query = query.Where(i => (int)i.PaymentStatus == request.PaymentStatus.Value);

        if (request.PaymentMode.HasValue)
            query = query.Where(i => (int)i.PrimaryPaymentMode == request.PaymentMode.Value);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(i =>
                i.InvoiceNumber.ToLower().Contains(term) ||
                i.CustomerName.ToLower().Contains(term) ||
                (i.CustomerPhone != null && i.CustomerPhone.Contains(term)) ||
                (i.CustomerGSTIN != null && i.CustomerGSTIN.ToLower().Contains(term)) ||
                (i.PaymentReferenceNumber != null && i.PaymentReferenceNumber.ToLower().Contains(term)) ||
                i.Payments.Any(p => !p.IsDeleted && p.TransactionReference != null && p.TransactionReference.ToLower().Contains(term)));
        }

        var totalInvoicesCount = await query.CountAsync(cancellationToken);
        var totalSalesAmount = await query.SumAsync(i => (decimal?)i.TotalAmount, cancellationToken) ?? 0m;
        var totalCollectedAmount = await query.SumAsync(i => (decimal?)i.PaidAmount, cancellationToken) ?? 0m;
        var totalOutstandingAmount = await query.SumAsync(i => (decimal?)i.BalanceAmount, cancellationToken) ?? 0m;

        var fullyPaidCount = await query.CountAsync(i => i.PaymentStatus == PaymentStatus.FullyPaid, cancellationToken);
        var partiallyPaidCount = await query.CountAsync(i => i.PaymentStatus == PaymentStatus.PartiallyPaid, cancellationToken);
        var unpaidCount = await query.CountAsync(i => i.PaymentStatus == PaymentStatus.Unpaid, cancellationToken);

        var collectionRatio = totalSalesAmount > 0
            ? Math.Round((totalCollectedAmount / totalSalesAmount) * 100m, 2)
            : 0m;

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(1000, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalInvoicesCount / (double)pageSize);

        var rawItems = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ThenByDescending(i => i.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                i.InvoiceDate,
                i.DueDate,
                i.PartyId,
                i.CustomerName,
                i.CustomerPhone,
                i.CustomerGSTIN,
                i.TotalAmount,
                i.PaidAmount,
                i.BalanceAmount,
                PaymentStatus = i.PaymentStatus.ToString(),
                PrimaryPaymentMode = i.PrimaryPaymentMode.ToString(),
                PaymentReferenceNumber = !string.IsNullOrWhiteSpace(i.PaymentReferenceNumber)
                    ? i.PaymentReferenceNumber
                    : i.Payments
                        .Where(p => !p.IsDeleted && !string.IsNullOrWhiteSpace(p.TransactionReference))
                        .OrderByDescending(p => p.PaymentDate)
                        .Select(p => p.TransactionReference)
                        .FirstOrDefault(),
                PaymentNotes = i.Payments
                    .Where(p => !p.IsDeleted && !string.IsNullOrWhiteSpace(p.Notes))
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => p.Notes)
                    .FirstOrDefault(),
                i.BranchId,
                PaymentDate = i.Payments
                    .Where(p => !p.IsDeleted)
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => (DateTime?)p.PaymentDate)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var branchIds = rawItems.Select(x => x.BranchId).Where(id => id != Guid.Empty).Distinct().ToList();
        var branchDict = branchIds.Count > 0
            ? await _context.TenantBranches
                .IgnoreQueryFilters()
                .Where(b => branchIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, b => b.BranchName, cancellationToken)
            : new Dictionary<Guid, string>();

        var items = rawItems.Select(i =>
        {
            DateTime? pDate = i.PaymentDate;
            if (pDate == null && i.PaidAmount > 0)
            {
                pDate = i.InvoiceDate;
            }
            else if (i.PaidAmount <= 0)
            {
                pDate = null;
            }

            return new SalesPaymentRegisterRowDto(
                i.Id,
                i.InvoiceNumber,
                i.InvoiceDate,
                i.DueDate,
                i.PartyId,
                i.CustomerName,
                i.CustomerPhone,
                i.CustomerGSTIN,
                i.TotalAmount,
                i.PaidAmount,
                i.BalanceAmount,
                i.PaymentStatus,
                i.PrimaryPaymentMode,
                i.PaymentReferenceNumber,
                branchDict.TryGetValue(i.BranchId, out var bName) ? bName : "Main Branch",
                pDate,
                i.PaymentNotes
            );
        }).ToList();

        return new SalesPaymentReportDto(
            items,
            totalInvoicesCount,
            pageNumber,
            pageSize,
            totalPages,
            totalSalesAmount,
            totalCollectedAmount,
            totalOutstandingAmount,
            collectionRatio,
            totalInvoicesCount,
            fullyPaidCount,
            partiallyPaidCount,
            unpaidCount
        );
    }

    public async Task<PurchasePaymentReportDto> GetPurchasePaymentReportAsync(
        P0ReportFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && !b.IsCancelled && b.Status != PurchaseBillStatus.Cancelled)
            .Include(b => b.Party)
            .AsNoTracking();

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(request.FromDate, request.ToDate, defaultToCurrentMonthIfBothNull: false);
        if (fromUtc.HasValue)
            query = query.Where(b => b.BillDate >= fromUtc.Value);
        if (toUtc.HasValue)
            query = query.Where(b => b.BillDate <= toUtc.Value);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(b => b.BranchId == request.BranchId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(b => b.PartyId == request.PartyId.Value);

        if (request.PaymentStatus.HasValue)
            query = query.Where(b => (int)b.PaymentStatus == request.PaymentStatus.Value);

        if (request.PaymentMode.HasValue)
            query = query.Where(b => (int)b.PrimaryPaymentMode == request.PaymentMode.Value);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(b =>
                b.BillNumber.ToLower().Contains(term) ||
                (b.VendorInvoiceNumber != null && b.VendorInvoiceNumber.ToLower().Contains(term)) ||
                b.SupplierName.ToLower().Contains(term) ||
                (b.SupplierGSTIN != null && b.SupplierGSTIN.ToLower().Contains(term)) ||
                b.Payments.Any(p => !p.IsDeleted && p.TransactionReference != null && p.TransactionReference.ToLower().Contains(term)));
        }

        var totalBillsCount = await query.CountAsync(cancellationToken);
        var totalPurchasesAmount = await query.SumAsync(b => (decimal?)b.TotalAmount, cancellationToken) ?? 0m;
        var totalPaidAmount = await query.SumAsync(b => (decimal?)b.PaidAmount, cancellationToken) ?? 0m;
        var totalOutstandingAmount = await query.SumAsync(b => (decimal?)b.BalanceAmount, cancellationToken) ?? 0m;

        var fullyPaidCount = await query.CountAsync(b => b.PaymentStatus == PaymentStatus.FullyPaid, cancellationToken);
        var partiallyPaidCount = await query.CountAsync(b => b.PaymentStatus == PaymentStatus.PartiallyPaid, cancellationToken);
        var unpaidCount = await query.CountAsync(b => b.PaymentStatus == PaymentStatus.Unpaid, cancellationToken);

        var paymentRatio = totalPurchasesAmount > 0
            ? Math.Round((totalPaidAmount / totalPurchasesAmount) * 100m, 2)
            : 0m;

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Max(1, Math.Min(1000, request.PageSize));
        var totalPages = (int)Math.Ceiling(totalBillsCount / (double)pageSize);

        var rawItems = await query
            .OrderByDescending(b => b.BillDate)
            .ThenByDescending(b => b.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.BillNumber,
                b.VendorInvoiceNumber,
                b.BillDate,
                b.DueDate,
                b.PartyId,
                b.SupplierName,
                PartyPhone = b.Party != null ? (b.Party.PrimaryPhone ?? b.Party.Mobile) : null,
                b.SupplierGSTIN,
                b.TotalAmount,
                b.PaidAmount,
                b.BalanceAmount,
                PaymentStatus = b.PaymentStatus.ToString(),
                PrimaryPaymentMode = b.PrimaryPaymentMode.ToString(),
                PaymentReferenceNumber = b.Payments
                    .Where(p => !p.IsDeleted && !string.IsNullOrWhiteSpace(p.TransactionReference))
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => p.TransactionReference)
                    .FirstOrDefault(),
                BankName = b.Payments
                    .Where(p => !p.IsDeleted && !string.IsNullOrWhiteSpace(p.BankName))
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => p.BankName)
                    .FirstOrDefault(),
                PaymentNotes = b.Payments
                    .Where(p => !p.IsDeleted && !string.IsNullOrWhiteSpace(p.Notes))
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => p.Notes)
                    .FirstOrDefault(),
                b.Notes,
                b.BranchId,
                PaymentDate = b.Payments
                    .Where(p => !p.IsDeleted)
                    .OrderByDescending(p => p.PaymentDate)
                    .Select(p => (DateTime?)p.PaymentDate)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var branchIds = rawItems.Select(x => x.BranchId).Where(id => id != Guid.Empty).Distinct().ToList();
        var branchDict = branchIds.Count > 0
            ? await _context.TenantBranches
                .IgnoreQueryFilters()
                .Where(b => branchIds.Contains(b.Id))
                .ToDictionaryAsync(b => b.Id, b => b.BranchName, cancellationToken)
            : new Dictionary<Guid, string>();

        var items = rawItems.Select(b =>
        {
            DateTime? pDate = b.PaymentDate;
            if (pDate == null && b.PaidAmount > 0)
            {
                pDate = b.BillDate;
            }
            else if (b.PaidAmount <= 0)
            {
                pDate = null;
            }

            return new PurchasePaymentRegisterRowDto(
                b.Id,
                b.BillNumber,
                b.VendorInvoiceNumber,
                b.BillDate,
                b.DueDate,
                b.PartyId,
                b.SupplierName,
                b.PartyPhone,
                b.SupplierGSTIN,
                b.TotalAmount,
                b.PaidAmount,
                b.BalanceAmount,
                b.PaymentStatus,
                b.PrimaryPaymentMode,
                b.Notes,
                branchDict.TryGetValue(b.BranchId, out var bName) ? bName : "Main Branch",
                pDate,
                b.PaymentReferenceNumber,
                b.BankName,
                b.PaymentNotes
            );
        }).ToList();

        return new PurchasePaymentReportDto(
            items,
            totalBillsCount,
            pageNumber,
            pageSize,
            totalPages,
            totalPurchasesAmount,
            totalPaidAmount,
            totalOutstandingAmount,
            paymentRatio,
            totalBillsCount,
            fullyPaidCount,
            partiallyPaidCount,
            unpaidCount
        );
    }

    #endregion

    private static (string? size, string? color) ExtractSizeAndColor(string? attributesJson)
    {
        if (string.IsNullOrWhiteSpace(attributesJson) || attributesJson == "{}") return (null, null);
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(attributesJson);
            string? size = null;
            string? color = null;
            if (doc.RootElement.TryGetProperty("size", out var sp)) size = sp.GetString()?.Trim();
            if (doc.RootElement.TryGetProperty("color", out var cp)) color = cp.GetString()?.Trim();
            return (size, color);
        }
        catch
        {
            return (null, null);
        }
    }
}
