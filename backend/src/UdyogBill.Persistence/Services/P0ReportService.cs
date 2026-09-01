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

        if (request.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(i => i.Invoice.InvoiceDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(i => i.Invoice.InvoiceDate <= toUtc);
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

        if (request.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(inv => inv.InvoiceDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(inv => inv.InvoiceDate <= toUtc);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            query = query.Where(inv => inv.BranchId == request.BranchId.Value);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            query = query.Where(inv => inv.WarehouseId == request.WarehouseId.Value);

        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
            query = query.Where(inv => inv.PartyId == request.PartyId.Value);

        var invoices = await query.ToListAsync(cancellationToken);

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
            var returns = group.Where(i => i.InvoiceType == InvoiceType.CreditNote).Sum(i => i.TotalAmount);
            var net = gross - returns;
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

        if (request.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(i => i.PurchaseBill.BillDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(i => i.PurchaseBill.BillDate <= toUtc);
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
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .AsNoTracking();

        if (request.FromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(b => b.BillDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(b => b.BillDate <= toUtc);
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

            return new RealTimeStockBalanceItemDto(
                s.ItemId,
                s.Item.Sku,
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
                status
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
            .Where(s => s.TenantId == tenantId && !s.IsDeleted && !s.Item.IsDeleted)
            .AsNoTracking();

        if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.WarehouseId == request.WarehouseId.Value);

        if (request.ItemId.HasValue && request.ItemId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.ItemId == request.ItemId.Value);

        if (request.CategoryId.HasValue && request.CategoryId.Value != Guid.Empty)
            stockBalancesQuery = stockBalancesQuery.Where(s => s.Item.CategoryId == request.CategoryId.Value);

        var balances = await stockBalancesQuery.ToListAsync(cancellationToken);

        var fromUtc = request.FromDate.HasValue
            ? DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc)
            : DateTime.SpecifyKind(DateTime.UtcNow.AddMonths(-1).Date, DateTimeKind.Utc);

        var toUtc = request.ToDate.HasValue
            ? DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc)
            : DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);

        var movements = await _context.StockMovements
            .Where(sm => sm.TenantId == tenantId && sm.CreatedAtUtc >= fromUtc && sm.CreatedAtUtc <= toUtc && !sm.IsDeleted)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var list = new List<StockValuationItemDto>();

        foreach (var s in balances)
        {
            var itemMoves = movements.Where(m => m.ItemId == s.ItemId && m.WarehouseId == s.WarehouseId).ToList();

            var inward = itemMoves.Where(m => m.MovementType == StockMovementType.PurchaseInward || m.MovementType == StockMovementType.TransferIn || m.MovementType == StockMovementType.SalesReturn).Sum(m => m.Quantity);
            var outward = Math.Abs(itemMoves.Where(m => m.MovementType == StockMovementType.SalesOutward || m.MovementType == StockMovementType.TransferOut || m.MovementType == StockMovementType.PurchaseReturn).Sum(m => m.Quantity));
            var adjustments = itemMoves.Where(m => m.MovementType == StockMovementType.PhysicalAdjustment || m.MovementType == StockMovementType.DamageLoss || m.MovementType == StockMovementType.ExpiredWriteOff).Sum(m => m.Quantity);

            var closing = s.CurrentQuantity;
            var opening = closing - inward + outward - adjustments;
            var costRate = s.Batch != null && s.Batch.PurchaseRate > 0 ? s.Batch.PurchaseRate : s.Item.PurchasePrice;
            var val = closing * costRate;

            list.Add(new StockValuationItemDto(
                s.ItemId,
                s.Item.Sku,
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
                "WeightedPurchaseCost"
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
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && b.BalanceAmount > 0)
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

        var now = DateTime.UtcNow;
        var fromUtc = request.FromDate.HasValue
            ? DateTime.SpecifyKind(request.FromDate.Value.Date, DateTimeKind.Utc)
            : DateTime.SpecifyKind(new DateTime(now.Year, now.Month, 1), DateTimeKind.Utc);

        var toUtc = request.ToDate.HasValue
            ? DateTime.SpecifyKind(request.ToDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc)
            : DateTime.SpecifyKind(now, DateTimeKind.Utc);

        var salesQuery = _context.SalesInvoices
            .Where(inv => inv.TenantId == tenantId && inv.InvoiceDate >= fromUtc && inv.InvoiceDate <= toUtc && !inv.IsDeleted && !inv.IsCancelled);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            salesQuery = salesQuery.Where(inv => inv.BranchId == request.BranchId.Value);

        var grossSales = await salesQuery
            .Where(inv => inv.InvoiceType != InvoiceType.CreditNote)
            .SumAsync(inv => (decimal?)inv.TaxableAmount, cancellationToken) ?? 0m;

        var salesReturns = await salesQuery
            .Where(inv => inv.InvoiceType == InvoiceType.CreditNote)
            .SumAsync(inv => (decimal?)inv.TaxableAmount, cancellationToken) ?? 0m;

        var netSales = grossSales - salesReturns;

        var purchaseQuery = _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && b.BillDate >= fromUtc && b.BillDate <= toUtc && !b.IsDeleted);

        if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            purchaseQuery = purchaseQuery.Where(b => b.BranchId == request.BranchId.Value);

        var grossPurchases = await purchaseQuery
            .SumAsync(b => (decimal?)b.TaxableAmount, cancellationToken) ?? 0m;

        var purchaseReturns = 0m;
        var netPurchases = grossPurchases - purchaseReturns;

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

        return new TruePnLReportDto(
            fromUtc,
            toUtc,
            request.FinancialYear ?? (fromUtc.Year + "-" + (fromUtc.Year + 1)),
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
                break;
            }

            case "stock-valuation":
            {
                var rep = await GetStockValuationAsync(request with { PageSize = 10000 }, cancellationToken);
                fileName = $"Stock_Valuation_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
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

    #endregion

    #region 11. Saved Presets

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
}
