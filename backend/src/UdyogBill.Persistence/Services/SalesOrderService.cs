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
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class SalesOrderService : ISalesOrderService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService? _auditService;

    public SalesOrderService(
        AppDbContext context,
        ITenantContext tenantContext,
        IAuditService? auditService = null)
    {
        _context = context;
        _tenantContext = tenantContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        return _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : throw new UnauthorizedAccessException("Tenant context is required.");
    }

    public async Task<Result<PagedResult<SalesOrderListDto>>> GetSalesOrdersAsync(
        int pageNumber,
        int pageSize,
        SalesOrderStatus? status,
        Guid? branchId,
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesOrders
            .Where(o => o.TenantId == tenantId && !o.IsDeleted)
            .Include(o => o.Branch)
            .Include(o => o.Party)
            .Include(o => o.ConvertedInvoice)
            .Include(o => o.ConvertedChallan)
            .Include(o => o.Items)
            .AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(o => o.BranchId == branchId.Value);
        }

        if (partyId.HasValue)
        {
            query = query.Where(o => o.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(o => o.OrderDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(o => o.OrderDate <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(o =>
                o.OrderNumber.ToLower().Contains(term) ||
                o.CustomerName.ToLower().Contains(term) ||
                (o.CustomerPhone != null && o.CustomerPhone.Contains(term)) ||
                (o.CustomerGSTIN != null && o.CustomerGSTIN.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(o => o.OrderDate)
            .ThenByDescending(o => o.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new SalesOrderListDto(
                o.Id,
                o.OrderNumber,
                o.OrderDate,
                o.DeliveryDueDate,
                o.Status,
                o.Status.ToString(),
                o.BranchId,
                o.Branch != null ? o.Branch.BranchName : "Main Branch",
                o.PartyId,
                o.CustomerName,
                o.CustomerPhone,
                o.CustomerGSTIN,
                o.TotalAmount,
                o.AdvancePaidAmount,
                o.ConvertedInvoiceId,
                o.ConvertedInvoice != null ? o.ConvertedInvoice.InvoiceNumber : null,
                o.ConvertedChallanId,
                o.ConvertedChallan != null ? o.ConvertedChallan.ChallanNumber : null,
                o.ConvertedAtUtc,
                o.Items.Count,
                o.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<SalesOrderListDto>>.Success(new PagedResult<SalesOrderListDto>(
            items,
            pageNumber,
            pageSize,
            totalCount
        ));
    }

    public async Task<Result<SalesOrderDetailsDto>> GetSalesOrderByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var o = await _context.SalesOrders
            .Where(x => x.TenantId == tenantId && x.Id == id && !x.IsDeleted)
            .Include(x => x.Branch)
            .Include(x => x.Warehouse)
            .Include(x => x.Party)
            .Include(x => x.Quotation)
            .Include(x => x.ConvertedInvoice)
            .Include(x => x.ConvertedChallan)
            .Include(x => x.Items)
                .ThenInclude(i => i.Item)
            .Include(x => x.Items)
                .ThenInclude(i => i.Variant)
            .Include(x => x.Items)
                .ThenInclude(i => i.Uom)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (o == null)
        {
            return Result<SalesOrderDetailsDto>.Failure("Sales order not found.", "NOT_FOUND");
        }

        var itemDtos = o.Items.Select(i => new SalesOrderItemDto(
            i.Id,
            i.ItemId,
            i.ItemName,
            i.HsnCode,
            i.VariantId,
            i.Variant?.VariantName,
            i.Quantity,
            i.UomId,
            i.UomCode ?? i.Uom?.Code,
            i.UnitPrice,
            i.DiscountPercent,
            i.DiscountAmount,
            i.TaxableAmount,
            i.GstRate,
            i.CgstAmount,
            i.SgstAmount,
            i.IgstAmount,
            i.CessAmount,
            i.TotalAmount,
            i.BatchNumber,
            i.AttributesJson
        )).ToList();

        var dto = new SalesOrderDetailsDto(
            o.Id,
            o.OrderNumber,
            o.Status,
            o.Status.ToString(),
            o.BranchId,
            o.Branch?.BranchName ?? "Main Branch",
            o.WarehouseId,
            o.Warehouse?.WarehouseName ?? "Main Warehouse",
            o.PartyId,
            o.CustomerName,
            o.CustomerPhone,
            o.CustomerEmail,
            o.CustomerGSTIN,
            o.CustomerPAN,
            o.BillingAddress,
            o.ShippingAddress,
            o.BillingStateCode,
            o.ShippingStateCode,
            o.PlaceOfSupply,
            o.OrderDate,
            o.DeliveryDueDate,
            o.TaxSupplyType,
            o.SubTotal,
            o.ItemDiscountTotal,
            o.OrderDiscountPercent,
            o.OrderDiscountAmount,
            o.TaxableAmount,
            o.CgstAmount,
            o.SgstAmount,
            o.IgstAmount,
            o.CessAmount,
            o.RoundOff,
            o.TotalAmount,
            o.AdvancePaidAmount,
            o.QuotationId,
            o.Quotation?.QuotationNumber,
            o.ConvertedInvoiceId,
            o.ConvertedInvoice?.InvoiceNumber,
            o.ConvertedChallanId,
            o.ConvertedChallan?.ChallanNumber,
            o.ConvertedAtUtc,
            o.PoNumber,
            o.PoDate,
            o.Notes,
            o.TermsAndConditions,
            o.AttributesJson,
            o.IsCancelled,
            o.CancellationReason,
            o.CreatedAtUtc,
            itemDtos
        );

        return Result<SalesOrderDetailsDto>.Success(dto);
    }

    public async Task<Result<SalesOrderDetailsDto>> GetSalesOrderByNumberAsync(string orderNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var o = await _context.SalesOrders
            .Where(x => x.TenantId == tenantId && x.OrderNumber == orderNumber && !x.IsDeleted)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (o == Guid.Empty)
        {
            return Result<SalesOrderDetailsDto>.Failure("Sales order not found.", "NOT_FOUND");
        }

        return await GetSalesOrderByIdAsync(o, cancellationToken);
    }

    public async Task<Result<Guid>> CreateSalesOrderAsync(CreateSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Sales order must contain at least one item.", "NO_ITEMS");
        }

        var orderNo = $"SO-{DateTime.UtcNow:yyMM}-{new Random().Next(1000, 9999)}";

        var order = new SalesOrder
        {
            TenantId = tenantId,
            OrderNumber = orderNo,
            Status = SalesOrderStatus.Confirmed,
            BranchId = request.BranchId,
            WarehouseId = request.WarehouseId,
            PartyId = request.PartyId,
            CustomerName = request.CustomerName.Trim(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim(),
            CustomerGSTIN = request.CustomerGSTIN?.Trim().ToUpperInvariant(),
            CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant(),
            BillingAddress = request.BillingAddress,
            ShippingAddress = request.ShippingAddress,
            BillingStateCode = request.BillingStateCode,
            ShippingStateCode = request.ShippingStateCode,
            PlaceOfSupply = request.PlaceOfSupply,
            OrderDate = request.OrderDate != default ? request.OrderDate : DateTime.UtcNow,
            DeliveryDueDate = request.DeliveryDueDate,
            OrderDiscountPercent = request.OrderDiscountPercent,
            OrderDiscountAmount = request.OrderDiscountAmount,
            AdvancePaidAmount = request.AdvancePaidAmount,
            QuotationId = request.QuotationId,
            PoNumber = request.PoNumber,
            PoDate = request.PoDate,
            Notes = request.Notes,
            TermsAndConditions = request.TermsAndConditions,
            AttributesJson = request.AttributesJson ?? "{}"
        };

        decimal subTotal = 0m;
        decimal itemDiscountTotal = 0m;
        decimal totalTaxable = 0m;
        decimal totalCgst = 0m;
        decimal totalSgst = 0m;
        decimal totalIgst = 0m;

        foreach (var reqItem in request.Items)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == reqItem.ItemId, cancellationToken);
            var itemName = !string.IsNullOrWhiteSpace(reqItem.ItemName) ? reqItem.ItemName : (item?.Name ?? "Item");
            var hsn = !string.IsNullOrWhiteSpace(reqItem.HsnCode) ? reqItem.HsnCode : (item?.HSNCode ?? "9999");
            var rate = reqItem.UnitPrice > 0 ? reqItem.UnitPrice : (item?.SellingPrice ?? 0m);
            var gst = reqItem.GstRate > 0 ? reqItem.GstRate : (item?.TaxRate ?? 18m);

            var lineGross = reqItem.Quantity * rate;
            var lineDisc = reqItem.DiscountAmount > 0
                ? reqItem.DiscountAmount
                : (reqItem.DiscountPercent > 0 ? lineGross * (reqItem.DiscountPercent / 100m) : 0m);

            var lineTaxable = Math.Max(0m, lineGross - lineDisc);
            var lineCgst = Math.Round(lineTaxable * (gst / 200m), 2);
            var lineSgst = Math.Round(lineTaxable * (gst / 200m), 2);
            var lineTotal = lineTaxable + lineCgst + lineSgst;

            subTotal += lineGross;
            itemDiscountTotal += lineDisc;
            totalTaxable += lineTaxable;
            totalCgst += lineCgst;
            totalSgst += lineSgst;

            order.Items.Add(new SalesOrderItem
            {
                TenantId = tenantId,
                ItemId = reqItem.ItemId,
                VariantId = reqItem.VariantId,
                ItemName = itemName,
                HsnCode = hsn,
                Quantity = reqItem.Quantity,
                UomId = reqItem.UomId ?? item?.PrimaryUomId,
                UomCode = reqItem.UomCode ?? "PCS",
                UnitPrice = rate,
                DiscountPercent = reqItem.DiscountPercent,
                DiscountAmount = lineDisc,
                TaxableAmount = lineTaxable,
                GstRate = gst,
                CgstAmount = lineCgst,
                SgstAmount = lineSgst,
                IgstAmount = 0m,
                CessAmount = 0m,
                TotalAmount = lineTotal,
                BatchNumber = reqItem.BatchNumber,
                AttributesJson = reqItem.AttributesJson ?? "{}"
            });
        }

        order.SubTotal = subTotal;
        order.ItemDiscountTotal = itemDiscountTotal;
        order.TaxableAmount = totalTaxable;
        order.CgstAmount = totalCgst;
        order.SgstAmount = totalSgst;
        order.IgstAmount = totalIgst;
        order.TotalAmount = totalTaxable + totalCgst + totalSgst + totalIgst;

        _context.SalesOrders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        if (_auditService != null)
        {
            await _auditService.LogAsync(new AuditLog
            {
                TenantId = tenantId,
                Action = AuditActionType.Create,
                ActionName = "CreateSalesOrder",
                EntityName = "SalesOrder",
                EntityId = order.Id.ToString(),
                NewValuesJson = $"{{\"orderNumber\":\"{order.OrderNumber}\",\"amount\":{order.TotalAmount}}}",
                IpAddress = ipAddress
            });
        }

        return Result<Guid>.Success(order.Id);
    }

    public async Task<Result<Guid>> UpdateSalesOrderAsync(Guid id, CreateSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var order = await _context.SalesOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == id && !o.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<Guid>.Failure("Sales order not found.", "NOT_FOUND");
        }

        if (order.Status == SalesOrderStatus.Invoiced || order.Status == SalesOrderStatus.Dispatched)
        {
            return Result<Guid>.Failure("Cannot edit a sales order that has already been dispatched or invoiced.", "ORDER_LOCKED");
        }

        order.BranchId = request.BranchId;
        order.WarehouseId = request.WarehouseId;
        order.PartyId = request.PartyId;
        order.CustomerName = request.CustomerName.Trim();
        order.CustomerPhone = request.CustomerPhone?.Trim();
        order.CustomerEmail = request.CustomerEmail?.Trim();
        order.CustomerGSTIN = request.CustomerGSTIN?.Trim().ToUpperInvariant();
        order.CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant();
        order.BillingAddress = request.BillingAddress;
        order.ShippingAddress = request.ShippingAddress;
        order.BillingStateCode = request.BillingStateCode;
        order.ShippingStateCode = request.ShippingStateCode;
        order.PlaceOfSupply = request.PlaceOfSupply;
        order.DeliveryDueDate = request.DeliveryDueDate;
        order.OrderDiscountPercent = request.OrderDiscountPercent;
        order.OrderDiscountAmount = request.OrderDiscountAmount;
        order.AdvancePaidAmount = request.AdvancePaidAmount;
        order.PoNumber = request.PoNumber;
        order.PoDate = request.PoDate;
        order.Notes = request.Notes;
        order.TermsAndConditions = request.TermsAndConditions;

        _context.SalesOrderItems.RemoveRange(order.Items);
        order.Items.Clear();

        decimal subTotal = 0m;
        decimal itemDiscountTotal = 0m;
        decimal totalTaxable = 0m;
        decimal totalCgst = 0m;
        decimal totalSgst = 0m;

        foreach (var reqItem in request.Items)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == reqItem.ItemId, cancellationToken);
            var itemName = !string.IsNullOrWhiteSpace(reqItem.ItemName) ? reqItem.ItemName : (item?.Name ?? "Item");
            var hsn = !string.IsNullOrWhiteSpace(reqItem.HsnCode) ? reqItem.HsnCode : (item?.HSNCode ?? "9999");
            var rate = reqItem.UnitPrice > 0 ? reqItem.UnitPrice : (item?.SellingPrice ?? 0m);
            var gst = reqItem.GstRate > 0 ? reqItem.GstRate : (item?.TaxRate ?? 18m);

            var lineGross = reqItem.Quantity * rate;
            var lineDisc = reqItem.DiscountAmount > 0
                ? reqItem.DiscountAmount
                : (reqItem.DiscountPercent > 0 ? lineGross * (reqItem.DiscountPercent / 100m) : 0m);

            var lineTaxable = Math.Max(0m, lineGross - lineDisc);
            var lineCgst = Math.Round(lineTaxable * (gst / 200m), 2);
            var lineSgst = Math.Round(lineTaxable * (gst / 200m), 2);
            var lineTotal = lineTaxable + lineCgst + lineSgst;

            subTotal += lineGross;
            itemDiscountTotal += lineDisc;
            totalTaxable += lineTaxable;
            totalCgst += lineCgst;
            totalSgst += lineSgst;

            order.Items.Add(new SalesOrderItem
            {
                TenantId = tenantId,
                ItemId = reqItem.ItemId,
                VariantId = reqItem.VariantId,
                ItemName = itemName,
                HsnCode = hsn,
                Quantity = reqItem.Quantity,
                UomId = reqItem.UomId ?? item?.PrimaryUomId,
                UomCode = reqItem.UomCode ?? "PCS",
                UnitPrice = rate,
                DiscountPercent = reqItem.DiscountPercent,
                DiscountAmount = lineDisc,
                TaxableAmount = lineTaxable,
                GstRate = gst,
                CgstAmount = lineCgst,
                SgstAmount = lineSgst,
                IgstAmount = 0m,
                CessAmount = 0m,
                TotalAmount = lineTotal,
                BatchNumber = reqItem.BatchNumber,
                AttributesJson = reqItem.AttributesJson ?? "{}"
            });
        }

        order.SubTotal = subTotal;
        order.ItemDiscountTotal = itemDiscountTotal;
        order.TaxableAmount = totalTaxable;
        order.CgstAmount = totalCgst;
        order.SgstAmount = totalSgst;
        order.TotalAmount = totalTaxable + totalCgst + totalSgst;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(order.Id);
    }

    public async Task<Result<Guid>> ConvertQuotationToSalesOrderAsync(Guid quotationId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var quotation = await _context.Quotations
            .Include(q => q.Items)
            .FirstOrDefaultAsync(q => q.TenantId == tenantId && q.Id == quotationId && !q.IsDeleted, cancellationToken);

        if (quotation == null)
        {
            return Result<Guid>.Failure("Quotation not found.", "NOT_FOUND");
        }

        var defaultWarehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.IsDefault && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        if (defaultWarehouse == null)
        {
            return Result<Guid>.Failure("No default warehouse configured.", "WAREHOUSE_MISSING");
        }

        var req = new CreateSalesOrderRequest
        {
            BranchId = quotation.BranchId,
            WarehouseId = defaultWarehouse.Id,
            PartyId = quotation.PartyId,
            CustomerName = quotation.CustomerName,
            CustomerPhone = quotation.CustomerPhone,
            CustomerEmail = quotation.CustomerEmail,
            CustomerGSTIN = quotation.CustomerGSTIN,
            BillingAddress = quotation.BillingAddress,
            ShippingAddress = quotation.ShippingAddress,
            BillingStateCode = quotation.BillingStateCode,
            ShippingStateCode = quotation.ShippingStateCode,
            PlaceOfSupply = quotation.PlaceOfSupply,
            OrderDate = DateTime.UtcNow,
            DeliveryDueDate = DateTime.UtcNow.AddDays(7),
            OrderDiscountPercent = quotation.QuotationDiscountPercent,
            OrderDiscountAmount = quotation.QuotationDiscountAmount,
            QuotationId = quotation.Id,
            Notes = $"Generated from Quotation #{quotation.QuotationNumber}. {quotation.Notes}",
            TermsAndConditions = quotation.TermsAndConditions,
            Items = quotation.Items.Select(qi => new CreateSalesOrderItemRequest(
                qi.ItemId,
                null,
                qi.ItemName,
                qi.HsnCode,
                qi.Quantity,
                qi.UomId,
                null,
                qi.UnitPrice,
                qi.DiscountPercent,
                qi.DiscountAmount,
                qi.GstRate,
                null,
                qi.AttributesJson
            )).ToList()
        };

        var result = await CreateSalesOrderAsync(req, ipAddress, cancellationToken);
        if (result.IsSuccess)
        {
            quotation.Status = QuotationStatus.Accepted;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    public async Task<Result<Guid>> ConvertSalesOrderToInvoiceAsync(Guid orderId, ConvertSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var order = await _context.SalesOrders
            .Include(o => o.Items)
            .Include(o => o.Party)
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == orderId && !o.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<Guid>.Failure("Sales order not found.", "NOT_FOUND");
        }

        if (order.ConvertedInvoiceId.HasValue)
        {
            return Result<Guid>.Failure("Sales order has already been converted to an invoice.", "ALREADY_CONVERTED");
        }

        var invDate = request.TransactionDate ?? DateTime.UtcNow;
        var invoiceNo = $"INV-SO-{DateTime.UtcNow:yyMM}-{new Random().Next(1000, 9999)}";

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = invoiceNo,
            InvoiceType = InvoiceType.TaxInvoice,
            Status = InvoiceStatus.Issued,
            BranchId = order.BranchId,
            WarehouseId = request.WarehouseId ?? order.WarehouseId,
            PartyId = order.PartyId,
            CustomerName = order.CustomerName,
            CustomerPhone = order.CustomerPhone,
            CustomerEmail = order.CustomerEmail,
            CustomerGSTIN = order.CustomerGSTIN,
            CustomerPAN = order.CustomerPAN,
            BillingAddress = order.BillingAddress,
            ShippingAddress = order.ShippingAddress,
            BillingStateCode = order.BillingStateCode,
            ShippingStateCode = order.ShippingStateCode,
            PlaceOfSupply = order.PlaceOfSupply,
            InvoiceDate = invDate,
            DueDate = invDate.AddDays(15),
            TaxSupplyType = order.TaxSupplyType,
            SubTotal = order.SubTotal,
            ItemDiscountTotal = order.ItemDiscountTotal,
            InvoiceDiscountPercent = order.OrderDiscountPercent,
            InvoiceDiscountAmount = order.OrderDiscountAmount,
            TaxableAmount = order.TaxableAmount,
            CgstAmount = order.CgstAmount,
            SgstAmount = order.SgstAmount,
            IgstAmount = order.IgstAmount,
            CessAmount = order.CessAmount,
            RoundOff = order.RoundOff,
            TotalAmount = order.TotalAmount,
            PaidAmount = request.PaidAmount ?? order.AdvancePaidAmount,
            BalanceAmount = Math.Max(0m, order.TotalAmount - (request.PaidAmount ?? order.AdvancePaidAmount)),
            PrimaryPaymentMode = request.PrimaryPaymentMode ?? PaymentMode.Cash,
            PaymentReferenceNumber = request.PaymentReferenceNumber,
            VehicleNumber = request.VehicleNumber,
            TransporterId = request.TransporterId?.ToString(),
            PoNumber = order.PoNumber,
            PoDate = order.PoDate,
            Notes = $"Generated from Sales Order #{order.OrderNumber}. {request.Notes}".Trim(),
            TermsAndConditions = order.TermsAndConditions,
            AttributesJson = order.AttributesJson
        };

        invoice.PaymentStatus = invoice.BalanceAmount <= 0.01m
            ? PaymentStatus.FullyPaid
            : (invoice.PaidAmount > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);

        foreach (var oi in order.Items)
        {
            invoice.Items.Add(new SalesInvoiceItem
            {
                TenantId = tenantId,
                ItemId = oi.ItemId,
                VariantId = oi.VariantId,
                ItemName = oi.ItemName,
                ItemSku = oi.HsnCode ?? "SKU",
                HsnCode = oi.HsnCode,
                Quantity = oi.Quantity,
                UomCode = oi.UomCode ?? "PCS",
                UnitPrice = oi.UnitPrice,
                DiscountPercent = oi.DiscountPercent,
                DiscountAmount = oi.DiscountAmount,
                TaxableAmount = oi.TaxableAmount,
                GstRate = oi.GstRate,
                CgstAmount = oi.CgstAmount,
                SgstAmount = oi.SgstAmount,
                IgstAmount = oi.IgstAmount,
                CessAmount = oi.CessAmount,
                TotalAmount = oi.TotalAmount,
                BatchNumber = oi.BatchNumber,
                AttributesJson = oi.AttributesJson
            });
        }

        if (invoice.PaidAmount > 0)
        {
            invoice.Payments.Add(new SalesInvoicePayment
            {
                TenantId = tenantId,
                Invoice = invoice,
                PaymentDate = invDate,
                Amount = invoice.PaidAmount,
                PaymentMode = invoice.PrimaryPaymentMode,
                TransactionReference = invoice.PaymentReferenceNumber,
                Notes = "Advance settlement / Payment from Sales Order"
            });
        }

        _context.SalesInvoices.Add(invoice);

        order.ConvertedInvoiceId = invoice.Id;
        order.Status = SalesOrderStatus.Invoiced;
        order.ConvertedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(invoice.Id);
    }

    public async Task<Result<Guid>> ConvertSalesOrderToChallanAsync(Guid orderId, ConvertSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var order = await _context.SalesOrders
            .Include(o => o.Items)
            .Include(o => o.Party)
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == orderId && !o.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<Guid>.Failure("Sales order not found.", "NOT_FOUND");
        }

        if (order.ConvertedChallanId.HasValue)
        {
            return Result<Guid>.Failure("Sales order has already been converted to a delivery challan.", "ALREADY_CONVERTED");
        }

        var challanNo = $"DC-SO-{DateTime.UtcNow:yyMM}-{new Random().Next(1000, 9999)}";

        var challan = new DeliveryChallan
        {
            TenantId = tenantId,
            ChallanNumber = challanNo,
            ChallanDate = request.TransactionDate ?? DateTime.UtcNow,
            CustomerPartyId = order.PartyId ?? Guid.Empty,
            CustomerName = order.CustomerName,
            ShippingAddress = order.ShippingAddress ?? order.BillingAddress,
            ShippingState = order.ShippingStateCode,
            DispatchStatus = DispatchStatus.PendingDispatch,
            TransporterId = request.TransporterId,
            TransportMode = TransportMode.Road,
            VehicleNumber = request.VehicleNumber?.Trim().ToUpperInvariant(),
            TotalPackages = order.Items.Count,
            DispatchNotes = $"Dispatched for Sales Order #{order.OrderNumber}. {request.Notes}".Trim()
        };

        foreach (var oi in order.Items)
        {
            challan.Items.Add(new DeliveryChallanItem
            {
                TenantId = tenantId,
                ItemId = oi.ItemId,
                ItemCode = oi.HsnCode ?? "SKU",
                ItemName = oi.ItemName,
                HsnCode = oi.HsnCode,
                Quantity = oi.Quantity,
                UnitName = oi.UomCode ?? "PCS",
                PackageCount = 1
            });
        }

        _context.DeliveryChallans.Add(challan);

        order.ConvertedChallanId = challan.Id;
        order.Status = SalesOrderStatus.Dispatched;
        order.ConvertedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(challan.Id);
    }

    public async Task<Result<bool>> CancelSalesOrderAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var order = await _context.SalesOrders
            .FirstOrDefaultAsync(o => o.TenantId == tenantId && o.Id == id && !o.IsDeleted, cancellationToken);

        if (order == null)
        {
            return Result<bool>.Failure("Sales order not found.", "NOT_FOUND");
        }

        if (order.Status == SalesOrderStatus.Invoiced)
        {
            return Result<bool>.Failure("Cannot cancel an invoiced sales order. Cancel the linked tax invoice first.", "ORDER_INVOICED");
        }

        order.IsCancelled = true;
        order.Status = SalesOrderStatus.Cancelled;
        order.CancellationReason = cancellationReason;
        order.CancelledAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
