using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PurchaseService : IPurchaseService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;
    private readonly UdyogBill.Application.Services.Calculations.ICanonicalCalculationEngine _calculationEngine;
    private readonly Microsoft.Extensions.Logging.ILogger<PurchaseService>? _logger;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _tenantDocSemaphores = new();

    public PurchaseService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService,
        UdyogBill.Application.Services.Calculations.ICanonicalCalculationEngine? calculationEngine = null,
        Microsoft.Extensions.Logging.ILogger<PurchaseService>? logger = null)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
        _calculationEngine = calculationEngine ?? new UdyogBill.Application.Services.Calculations.CanonicalCalculationEngine();
        _logger = logger;
    }

    private async Task AcquireSequenceLockAsync(Guid tenantId, string prefix, string fy, CancellationToken cancellationToken)
    {
        if (_context.Database.IsRelational())
        {
            try
            {
                if (_context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
                {
                    var lockKey = $"doc_seq_{tenantId}_{prefix}_{fy}";
                    await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(hashtext({0}))", new object[] { lockKey }, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not acquire DB advisory lock for sequence prefix {Prefix}: {Message}", prefix, ex.Message);
            }
        }
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.HasTenant ? _tenantContext.TenantId : _currentUserContext.TenantId;
        if (!tenantId.HasValue || tenantId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Tenant context is required.");
        }
        return tenantId.Value;
    }

    private static string GetFinancialYearCode(DateTime date)
    {
        var year = date.Month >= 4 ? date.Year : date.Year - 1;
        var nextYear = (year + 1) % 100;
        var currYear = year % 100;
        return $"{currYear:D2}{nextYear:D2}";
    }

    #region Purchase Orders

    public async Task<Result<PagedResult<PurchaseOrderListDto>>> GetPurchaseOrdersAsync(
        int pageNumber,
        int pageSize,
        PurchaseOrderStatus? status = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseOrders
            .Where(po => po.TenantId == tenantId && !po.IsDeleted)
            .Include(po => po.Branch)
            .Include(po => po.Warehouse)
            .Include(po => po.Items)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(po => po.Status == status.Value);
        }

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(po => po.BranchId == branchId.Value);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(po => po.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var utcFrom = DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc);
            query = query.Where(po => po.OrderDate >= utcFrom);
        }

        if (toDate.HasValue)
        {
            var utcTo = DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc);
            query = query.Where(po => po.OrderDate <= utcTo);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(po =>
                po.OrderNumber.ToLower().Contains(term) ||
                po.SupplierName.ToLower().Contains(term) ||
                (po.SupplierGSTIN != null && po.SupplierGSTIN.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(po => po.OrderDate)
                .ThenByDescending(po => po.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(po => new PurchaseOrderListDto(
                po.Id,
                po.TenantId,
                po.OrderNumber,
                po.Status,
                po.BranchId,
                po.Branch != null ? po.Branch.BranchName : "Main Branch",
                po.WarehouseId,
                po.Warehouse != null ? po.Warehouse.WarehouseName : "Main Warehouse",
                po.PartyId,
                po.SupplierName,
                po.SupplierGSTIN,
                po.OrderDate,
                po.ExpectedDeliveryDate,
                po.TaxableAmount,
                po.CgstAmount,
                po.SgstAmount,
                po.IgstAmount,
                po.TotalAmount,
                po.Items.Count,
                po.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<PurchaseOrderListDto>>.Success(new PagedResult<PurchaseOrderListDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<PurchaseOrderDetailsDto>> GetPurchaseOrderByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var po = await _context.PurchaseOrders
            .Where(p => p.TenantId == tenantId && p.Id == id && !p.IsDeleted)
            .Include(p => p.Branch)
            .Include(p => p.Warehouse)
            .Include(p => p.Items)
                .ThenInclude(i => i.Uom)
            .FirstOrDefaultAsync(cancellationToken);

        if (po == null)
        {
            return Result<PurchaseOrderDetailsDto>.Failure("Purchase order not found.", "NOT_FOUND");
        }

        var itemDtos = po.Items
            .Select(i => new PurchaseOrderItemDto(
                i.Id,
                i.ItemId,
                i.ItemSku,
                i.ItemName,
                i.HsnCode,
                i.OrderQuantity,
                i.ReceivedQuantity,
                i.RemainingQuantity,
                i.UomId,
                i.UomCode,
                i.UnitPrice,
                i.DiscountPercent,
                i.DiscountAmount,
                i.TaxableAmount,
                i.GstRate,
                i.CgstRate,
                i.CgstAmount,
                i.SgstRate,
                i.SgstAmount,
                i.IgstRate,
                i.IgstAmount,
                i.CessRate,
                i.CessAmount,
                i.TotalAmount
            ))
            .ToList();

        var dto = new PurchaseOrderDetailsDto(
            po.Id,
            po.TenantId,
            po.OrderNumber,
            po.Status,
            po.BranchId,
            po.Branch?.BranchName ?? "Main Branch",
            po.WarehouseId,
            po.Warehouse?.WarehouseName ?? "Main Warehouse",
            po.PartyId,
            po.SupplierName,
            po.SupplierPhone,
            po.SupplierGSTIN,
            po.SupplierAddress,
            po.SupplierStateCode,
            po.PlaceOfSupply,
            po.OrderDate,
            po.ExpectedDeliveryDate,
            po.TaxSupplyType,
            po.SubTotal,
            po.DiscountTotal,
            po.TaxableAmount,
            po.CgstAmount,
            po.SgstAmount,
            po.IgstAmount,
            po.CessAmount,
            po.RoundOff,
            po.TotalAmount,
            po.Notes,
            po.TermsAndConditions,
            po.IsCancelled,
            po.CancellationReason,
            po.CreatedAtUtc,
            itemDtos
        );

        return Result<PurchaseOrderDetailsDto>.Success(dto);
    }

    public async Task<Result<PurchaseOrderDetailsDto>> GetPurchaseOrderByNumberAsync(string orderNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var po = await _context.PurchaseOrders
            .Where(p => p.TenantId == tenantId && p.OrderNumber == orderNumber.Trim() && !p.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (po == null)
        {
            return Result<PurchaseOrderDetailsDto>.Failure($"Purchase order '{orderNumber}' not found.", "NOT_FOUND");
        }

        return await GetPurchaseOrderByIdAsync(po.Id, cancellationToken);
    }

    public async Task<Result<Guid>> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Purchase order must contain at least one line item.", "EMPTY_ITEMS");
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BranchId && !b.IsDeleted, cancellationToken);
        if (branch == null)
        {
            return Result<Guid>.Failure("Branch not found.", "BRANCH_NOT_FOUND");
        }

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == request.WarehouseId && !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            return Result<Guid>.Failure("Warehouse not found.", "WAREHOUSE_NOT_FOUND");
        }

        var supplier = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);
        if (supplier == null)
        {
            return Result<Guid>.Failure("Supplier not found.", "SUPPLIER_NOT_FOUND");
        }

        var orderDate = DateTime.SpecifyKind(request.OrderDate, DateTimeKind.Utc);
        var fyCode = GetFinancialYearCode(orderDate);

        // Generate sequential PO Number
        var prefix = $"PO-{fyCode}-";
        var lastNumberStr = await _context.PurchaseOrders
            .Where(po => po.TenantId == tenantId && po.OrderNumber.StartsWith(prefix))
            .OrderByDescending(po => po.OrderNumber)
            .Select(po => po.OrderNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextSeq = 1;
        if (!string.IsNullOrEmpty(lastNumberStr) && lastNumberStr.Length > prefix.Length)
        {
            if (int.TryParse(lastNumberStr.Substring(prefix.Length), out var parsed))
            {
                nextSeq = parsed + 1;
            }
        }
        var orderNumber = $"{prefix}{nextSeq:D5}";

        var branchState = branch.StateCode ?? "27";
        var supplierState = supplier.StateCode ?? branchState;
        var isIntraState = string.Equals(branchState, supplierState, StringComparison.OrdinalIgnoreCase);

        var po = new PurchaseOrder
        {
            TenantId = tenantId,
            OrderNumber = orderNumber,
            Status = PurchaseOrderStatus.Confirmed,
            BranchId = request.BranchId,
            WarehouseId = request.WarehouseId,
            PartyId = supplier.Id,
            SupplierName = supplier.LegalName,
            SupplierPhone = supplier.Mobile ?? supplier.PrimaryPhone,
            SupplierGSTIN = supplier.GSTIN,
            SupplierAddress = supplier.Addresses.FirstOrDefault(a => a.IsDefault)?.AddressLine1,
            SupplierStateCode = supplierState,
            PlaceOfSupply = branch.State ?? "",
            TaxSupplyType = isIntraState ? TaxSupplyType.IntraState : TaxSupplyType.InterState,
            OrderDate = orderDate,
            ExpectedDeliveryDate = request.ExpectedDeliveryDate.HasValue
                ? DateTime.SpecifyKind(request.ExpectedDeliveryDate.Value, DateTimeKind.Utc)
                : null,
            Notes = request.Notes,
            TermsAndConditions = request.TermsAndConditions,
            AttributesJson = request.AttributesJson ?? "{}"
        };

        decimal subTotal = 0m, discountTotal = 0m, totalTaxable = 0m;
        decimal totalCgst = 0m, totalSgst = 0m, totalIgst = 0m, totalCess = 0m;

        foreach (var reqItem in request.Items)
        {
            var item = await _context.Items
                .Include(i => i.PrimaryUom)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == reqItem.ItemId && !i.IsDeleted, cancellationToken);
            if (item == null)
            {
                return Result<Guid>.Failure($"Item '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            var uom = await _context.UnitsOfMeasure
                .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == reqItem.UomId && !u.IsDeleted, cancellationToken);
            var uomCode = uom?.Code ?? item.PrimaryUom.Code;

            var gross = reqItem.Quantity * reqItem.UnitPrice;
            var discAmt = gross * (reqItem.DiscountPercent / 100m);
            var taxable = gross - discAmt;

            var gstRate = item.TaxRate;
            decimal cgstRate = 0m, cgstAmt = 0m;
            decimal sgstRate = 0m, sgstAmt = 0m;
            decimal igstRate = 0m, igstAmt = 0m;
            decimal cessAmt = taxable * (item.CessRate / 100m);

            if (isIntraState)
            {
                cgstRate = gstRate / 2m;
                sgstRate = gstRate / 2m;
                cgstAmt = Math.Round(taxable * (cgstRate / 100m), 4);
                sgstAmt = Math.Round(taxable * (sgstRate / 100m), 4);
            }
            else
            {
                igstRate = gstRate;
                igstAmt = Math.Round(taxable * (igstRate / 100m), 4);
            }

            var lineTotal = taxable + cgstAmt + sgstAmt + igstAmt + cessAmt;

            subTotal += gross;
            discountTotal += discAmt;
            totalTaxable += taxable;
            totalCgst += cgstAmt;
            totalSgst += sgstAmt;
            totalIgst += igstAmt;
            totalCess += cessAmt;

            var poItem = new PurchaseOrderItem
            {
                TenantId = tenantId,
                PurchaseOrder = po,
                ItemId = item.Id,
                ItemSku = item.Sku,
                ItemName = item.Name,
                HsnCode = item.HSNCode,
                OrderQuantity = reqItem.Quantity,
                ReceivedQuantity = 0m,
                UomId = reqItem.UomId,
                UomCode = uomCode,
                UnitPrice = reqItem.UnitPrice,
                DiscountPercent = reqItem.DiscountPercent,
                DiscountAmount = discAmt,
                TaxableAmount = taxable,
                GstRate = gstRate,
                CgstRate = cgstRate,
                CgstAmount = cgstAmt,
                SgstRate = sgstRate,
                SgstAmount = sgstAmt,
                IgstRate = igstRate,
                IgstAmount = igstAmt,
                CessRate = item.CessRate,
                CessAmount = cessAmt,
                TotalAmount = lineTotal,
                AttributesJson = reqItem.AttributesJson ?? "{}"
            };

            po.Items.Add(poItem);
        }

        var grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
        var roundedTotal = Math.Round(grandTotal);
        var roundOff = roundedTotal - grandTotal;

        po.SubTotal = subTotal;
        po.DiscountTotal = discountTotal;
        po.TaxableAmount = totalTaxable;
        po.CgstAmount = totalCgst;
        po.SgstAmount = totalSgst;
        po.IgstAmount = totalIgst;
        po.CessAmount = totalCess;
        po.RoundOff = roundOff;
        po.TotalAmount = roundedTotal;

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePurchaseOrder",
            EntityName = "PurchaseOrder",
            EntityId = po.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { po.OrderNumber, po.SupplierName, po.TotalAmount }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(po.Id);
    }

    public async Task<Result> CancelPurchaseOrderAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var po = await _context.PurchaseOrders
            .Where(p => p.TenantId == tenantId && p.Id == id && !p.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (po == null)
        {
            return Result.Failure("Purchase order not found.", "NOT_FOUND");
        }

        if (po.IsCancelled)
        {
            return Result.Failure("Purchase order is already cancelled.", "ALREADY_CANCELLED");
        }

        po.IsCancelled = true;
        po.CancellationReason = cancellationReason;
        po.Status = PurchaseOrderStatus.Cancelled;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "CancelPurchaseOrder",
            EntityName = "PurchaseOrder",
            EntityId = po.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { po.OrderNumber, CancellationReason = cancellationReason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #endregion

    #region Goods Receipt Notes (GRN)

    public async Task<Result<PagedResult<GrnListDto>>> GetGoodsReceiptNotesAsync(
        int pageNumber,
        int pageSize,
        GrnStatus? status = null,
        Guid? branchId = null,
        Guid? warehouseId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.GoodsReceiptNotes
            .Where(g => g.TenantId == tenantId && !g.IsDeleted)
            .Include(g => g.Branch)
            .Include(g => g.Warehouse)
            .Include(g => g.PurchaseOrder)
            .Include(g => g.Items)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(g => g.Status == status.Value);
        }

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(g => g.BranchId == branchId.Value);
        }

        if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
        {
            query = query.Where(g => g.WarehouseId == warehouseId.Value);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(g => g.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var utcFrom = DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc);
            query = query.Where(g => g.ReceivedDate >= utcFrom);
        }

        if (toDate.HasValue)
        {
            var utcTo = DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc);
            query = query.Where(g => g.ReceivedDate <= utcTo);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(g =>
                g.GrnNumber.ToLower().Contains(term) ||
                g.SupplierName.ToLower().Contains(term) ||
                (g.DeliveryChallanNumber != null && g.DeliveryChallanNumber.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(g => g.ReceivedDate)
                .ThenByDescending(g => g.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new GrnListDto(
                g.Id,
                g.TenantId,
                g.GrnNumber,
                g.Status,
                g.PurchaseOrderId,
                g.PurchaseOrder != null ? g.PurchaseOrder.OrderNumber : null,
                g.BranchId,
                g.Branch != null ? g.Branch.BranchName : "Main Branch",
                g.WarehouseId,
                g.Warehouse != null ? g.Warehouse.WarehouseName : "Main Warehouse",
                g.PartyId,
                g.SupplierName,
                g.DeliveryChallanNumber,
                g.ReceivedDate,
                g.Items.Count,
                g.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<GrnListDto>>.Success(new PagedResult<GrnListDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<GrnDetailsDto>> GetGrnByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var grn = await _context.GoodsReceiptNotes
            .Where(g => g.TenantId == tenantId && g.Id == id && !g.IsDeleted)
            .Include(g => g.Branch)
            .Include(g => g.Warehouse)
            .Include(g => g.PurchaseOrder)
            .Include(g => g.Items)
                .ThenInclude(i => i.Uom)
            .Include(g => g.Items)
                .ThenInclude(i => i.Batch)
            .FirstOrDefaultAsync(cancellationToken);

        if (grn == null)
        {
            return Result<GrnDetailsDto>.Failure("Goods receipt note not found.", "NOT_FOUND");
        }

        var itemDtos = grn.Items
            .Select(i => new GrnItemDto(
                i.Id,
                i.PurchaseOrderItemId,
                i.ItemId,
                i.ItemSku,
                i.ItemName,
                i.BatchId,
                i.BatchNumber ?? i.Batch?.BatchNumber,
                i.ManufacturingDate ?? i.Batch?.ManufacturingDate,
                i.ExpiryDate ?? i.Batch?.ExpiryDate,
                i.ReceivedQuantity,
                i.AcceptedQuantity,
                i.RejectedQuantity,
                i.UomId,
                i.UomCode,
                i.UnitCost,
                i.TotalCost,
                i.RejectionReason
            ))
            .ToList();

        var dto = new GrnDetailsDto(
            grn.Id,
            grn.TenantId,
            grn.GrnNumber,
            grn.Status,
            grn.PurchaseOrderId,
            grn.PurchaseOrder?.OrderNumber,
            grn.BranchId,
            grn.Branch?.BranchName ?? "Main Branch",
            grn.WarehouseId,
            grn.Warehouse?.WarehouseName ?? "Main Warehouse",
            grn.PartyId,
            grn.SupplierName,
            grn.DeliveryChallanNumber,
            grn.DeliveryChallanDate,
            grn.ReceivedDate,
            grn.ReceivedBy,
            grn.Remarks,
            grn.IsCancelled,
            grn.CancellationReason,
            grn.CreatedAtUtc,
            itemDtos
        );

        return Result<GrnDetailsDto>.Success(dto);
    }

    public async Task<Result<GrnDetailsDto>> GetGrnByNumberAsync(string grnNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var grn = await _context.GoodsReceiptNotes
            .Where(g => g.TenantId == tenantId && g.GrnNumber == grnNumber.Trim() && !g.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (grn == null)
        {
            return Result<GrnDetailsDto>.Failure($"Goods receipt note '{grnNumber}' not found.", "NOT_FOUND");
        }

        return await GetGrnByIdAsync(grn.Id, cancellationToken);
    }

    public async Task<Result<Guid>> CreateGrnAsync(CreateGrnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("GRN must contain at least one received item.", "EMPTY_ITEMS");
        }

        var supplier = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);
        if (supplier == null)
        {
            return Result<Guid>.Failure("Supplier not found.", "SUPPLIER_NOT_FOUND");
        }

        var recDate = DateTime.SpecifyKind(request.ReceivedDate, DateTimeKind.Utc);
        var fyCode = GetFinancialYearCode(recDate);

        // Generate sequential GRN Number
        var prefix = $"GRN-{fyCode}-";
        var lastNumberStr = await _context.GoodsReceiptNotes
            .Where(g => g.TenantId == tenantId && g.GrnNumber.StartsWith(prefix))
            .OrderByDescending(g => g.GrnNumber)
            .Select(g => g.GrnNumber)
            .FirstOrDefaultAsync(cancellationToken);

        var nextSeq = 1;
        if (!string.IsNullOrEmpty(lastNumberStr) && lastNumberStr.Length > prefix.Length)
        {
            if (int.TryParse(lastNumberStr.Substring(prefix.Length), out var parsed))
            {
                nextSeq = parsed + 1;
            }
        }
        var grnNumber = $"{prefix}{nextSeq:D5}";

        var grn = new GoodsReceiptNote
        {
            TenantId = tenantId,
            GrnNumber = grnNumber,
            Status = GrnStatus.Verified,
            PurchaseOrderId = request.PurchaseOrderId,
            BranchId = request.BranchId,
            WarehouseId = request.WarehouseId,
            PartyId = supplier.Id,
            SupplierName = supplier.LegalName,
            DeliveryChallanNumber = request.DeliveryChallanNumber,
            DeliveryChallanDate = request.DeliveryChallanDate.HasValue
                ? DateTime.SpecifyKind(request.DeliveryChallanDate.Value, DateTimeKind.Utc)
                : null,
            ReceivedDate = recDate,
            ReceivedBy = request.ReceivedBy ?? _currentUserContext.FullName,
            Remarks = request.Remarks
        };

        // If linked to PO, verify PO
        PurchaseOrder? po = null;
        if (request.PurchaseOrderId.HasValue && request.PurchaseOrderId.Value != Guid.Empty)
        {
            po = await _context.PurchaseOrders
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PurchaseOrderId.Value && !p.IsDeleted, cancellationToken);
        }

        foreach (var reqItem in request.Items)
        {
            var item = await _context.Items
                .Include(i => i.PrimaryUom)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == reqItem.ItemId && !i.IsDeleted, cancellationToken);
            if (item == null)
            {
                return Result<Guid>.Failure($"Item '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            var uom = await _context.UnitsOfMeasure
                .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == reqItem.UomId && !u.IsDeleted, cancellationToken);
            var uomCode = uom?.Code ?? item.PrimaryUom.Code;

            // Handle Batch Creation / Lookup if tracking batches or batch number supplied
            ItemBatch? batch = null;
            if (!string.IsNullOrWhiteSpace(reqItem.BatchNumber))
            {
                var normalizedBatch = reqItem.BatchNumber.Trim().ToUpperInvariant();
                batch = await _context.ItemBatches
                    .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.ItemId == item.Id && b.BatchNumber == normalizedBatch && !b.IsDeleted, cancellationToken);

                if (batch == null)
                {
                    batch = new ItemBatch
                    {
                        TenantId = tenantId,
                        ItemId = item.Id,
                        BatchNumber = normalizedBatch,
                        ManufacturingDate = reqItem.ManufacturingDate.HasValue ? DateTime.SpecifyKind(reqItem.ManufacturingDate.Value, DateTimeKind.Utc) : null,
                        ExpiryDate = reqItem.ExpiryDate.HasValue ? DateTime.SpecifyKind(reqItem.ExpiryDate.Value, DateTimeKind.Utc) : DateTime.UtcNow.AddYears(2),
                        PurchaseRate = reqItem.UnitCost > 0 ? reqItem.UnitCost : item.PurchasePrice,
                        MRP = item.MRP,
                        SaleRate = item.SellingPrice
                    };
                    _context.ItemBatches.Add(batch);
                }
            }

            var acceptedQty = reqItem.AcceptedQuantity;

            // Replenish Warehouse Stock
            var stockQuery = _context.ItemWarehouseStocks
                .Where(s => s.TenantId == tenantId && s.ItemId == item.Id && s.WarehouseId == request.WarehouseId && !s.IsDeleted);

            if (batch != null)
            {
                stockQuery = stockQuery.Where(s => s.BatchId == batch.Id);
            }

            var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
            var beforeQty = stock?.CurrentQuantity ?? 0m;

            if (stock == null)
            {
                stock = new ItemWarehouseStock
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    WarehouseId = request.WarehouseId,
                    Batch = batch,
                    CurrentQuantity = acceptedQty
                };
                _context.ItemWarehouseStocks.Add(stock);
            }
            else
            {
                stock.CurrentQuantity += acceptedQty;
            }

            // Log StockMovement (PurchaseInward)
            var movement = new StockMovement
            {
                TenantId = tenantId,
                ItemId = item.Id,
                WarehouseId = request.WarehouseId,
                Batch = batch,
                MovementType = StockMovementType.PurchaseInward,
                Quantity = acceptedQty,
                QuantityBefore = beforeQty,
                QuantityAfter = stock.CurrentQuantity,
                UnitCost = reqItem.UnitCost > 0 ? reqItem.UnitCost : item.PurchasePrice,
                TotalCost = (reqItem.UnitCost > 0 ? reqItem.UnitCost : item.PurchasePrice) * acceptedQty,
                ReferenceDocumentType = "GoodsReceiptNote",
                ReferenceDocumentId = grn.Id,
                ReferenceDocumentNumber = grnNumber,
                Notes = $"Inward stock via GRN {grnNumber} from {supplier.LegalName}"
            };
            _context.StockMovements.Add(movement);

            // If linked to PO item, update received quantity
            if (po != null && reqItem.PurchaseOrderItemId.HasValue)
            {
                var poItem = po.Items.FirstOrDefault(pi => pi.Id == reqItem.PurchaseOrderItemId.Value);
                if (poItem != null)
                {
                    poItem.ReceivedQuantity += acceptedQty;
                }
            }

            var grnItem = new GoodsReceiptNoteItem
            {
                TenantId = tenantId,
                GoodsReceiptNote = grn,
                PurchaseOrderItemId = reqItem.PurchaseOrderItemId,
                ItemId = item.Id,
                ItemSku = item.Sku,
                ItemName = item.Name,
                Batch = batch,
                BatchNumber = reqItem.BatchNumber,
                ManufacturingDate = reqItem.ManufacturingDate.HasValue ? DateTime.SpecifyKind(reqItem.ManufacturingDate.Value, DateTimeKind.Utc) : null,
                ExpiryDate = reqItem.ExpiryDate.HasValue ? DateTime.SpecifyKind(reqItem.ExpiryDate.Value, DateTimeKind.Utc) : null,
                ReceivedQuantity = reqItem.ReceivedQuantity,
                AcceptedQuantity = reqItem.AcceptedQuantity,
                RejectedQuantity = reqItem.RejectedQuantity,
                UomId = reqItem.UomId,
                UomCode = uomCode,
                UnitCost = reqItem.UnitCost,
                TotalCost = reqItem.AcceptedQuantity * reqItem.UnitCost,
                RejectionReason = reqItem.RejectionReason
            };

            grn.Items.Add(grnItem);
        }

        // Update PO Status if all received
        if (po != null)
        {
            var isFullyReceived = po.Items.All(pi => pi.RemainingQuantity <= 0);
            po.Status = isFullyReceived ? PurchaseOrderStatus.Completed : PurchaseOrderStatus.PartiallyReceived;
        }

        _context.GoodsReceiptNotes.Add(grn);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateGoodsReceiptNote",
            EntityName = "GoodsReceiptNote",
            EntityId = grn.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { grn.GrnNumber, grn.SupplierName, ItemCount = request.Items.Count }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(grn.Id);
    }

    public async Task<Result> CancelGrnAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var grn = await _context.GoodsReceiptNotes
            .Where(g => g.TenantId == tenantId && g.Id == id && !g.IsDeleted)
            .Include(g => g.Items)
            .FirstOrDefaultAsync(cancellationToken);

        if (grn == null)
        {
            return Result.Failure("Goods receipt note not found.", "NOT_FOUND");
        }

        if (grn.IsCancelled)
        {
            return Result.Failure("GRN is already cancelled.", "ALREADY_CANCELLED");
        }

        // Revert stock
        foreach (var item in grn.Items)
        {
            var stockQuery = _context.ItemWarehouseStocks
                .Where(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.WarehouseId == grn.WarehouseId && !s.IsDeleted);

            if (item.BatchId.HasValue)
            {
                stockQuery = stockQuery.Where(s => s.BatchId == item.BatchId.Value);
            }

            var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
            if (stock != null)
            {
                var beforeQty = stock.CurrentQuantity;
                stock.CurrentQuantity -= item.AcceptedQuantity;

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.ItemId,
                    WarehouseId = grn.WarehouseId,
                    BatchId = item.BatchId,
                    MovementType = StockMovementType.TransferOut,
                    Quantity = -item.AcceptedQuantity,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.UnitCost,
                    TotalCost = item.UnitCost * item.AcceptedQuantity,
                    ReferenceDocumentType = "GrnCancellation",
                    ReferenceDocumentId = grn.Id,
                    ReferenceDocumentNumber = grn.GrnNumber,
                    Notes = $"Stock reversed on GRN cancellation: {cancellationReason}"
                };
                _context.StockMovements.Add(movement);
            }
        }

        grn.IsCancelled = true;
        grn.CancellationReason = cancellationReason;
        grn.Status = GrnStatus.Cancelled;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "CancelGoodsReceiptNote",
            EntityName = "GoodsReceiptNote",
            EntityId = grn.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { grn.GrnNumber, CancellationReason = cancellationReason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #endregion

    #region Purchase Bills (Vendor Invoices)

    public async Task<Result<PagedResult<PurchaseBillListDto>>> GetPurchaseBillsAsync(
        int pageNumber,
        int pageSize,
        PurchaseBillStatus? status = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .Include(b => b.Branch)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(b => b.Status == status.Value);
        }

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(b => b.BranchId == branchId.Value);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(b => b.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var utcFrom = DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc);
            query = query.Where(b => b.BillDate >= utcFrom);
        }

        if (toDate.HasValue)
        {
            var utcTo = DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc);
            query = query.Where(b => b.BillDate <= utcTo);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(b =>
                b.BillNumber.ToLower().Contains(term) ||
                (b.VendorInvoiceNumber != null && b.VendorInvoiceNumber.ToLower().Contains(term)) ||
                b.SupplierName.ToLower().Contains(term) ||
                (b.SupplierGSTIN != null && b.SupplierGSTIN.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(b => b.BillDate)
                .ThenByDescending(b => b.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new PurchaseBillListDto(
                b.Id,
                b.TenantId,
                b.BillNumber,
                b.VendorInvoiceNumber,
                b.Status,
                b.BranchId,
                b.Branch != null ? b.Branch.BranchName : "Main Branch",
                b.PartyId,
                b.SupplierName,
                b.SupplierGSTIN,
                b.BillDate,
                b.DueDate,
                b.TaxableAmount,
                b.CgstAmount,
                b.SgstAmount,
                b.IgstAmount,
                b.TotalAmount,
                b.PaidAmount,
                b.BalanceAmount,
                b.PaymentStatus,
                b.PrimaryPaymentMode,
                b.IsCancelled,
                b.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<PurchaseBillListDto>>.Success(new PagedResult<PurchaseBillListDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<PurchaseBillDetailsDto>> GetPurchaseBillByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var bill = await _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && b.Id == id && !b.IsDeleted)
            .Include(b => b.Branch)
            .Include(b => b.Warehouse)
            .Include(b => b.PurchaseOrder)
            .Include(b => b.GoodsReceiptNote)
            .Include(b => b.Items)
                .ThenInclude(i => i.Uom)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(cancellationToken);

        if (bill == null)
        {
            return Result<PurchaseBillDetailsDto>.Failure("Purchase bill not found.", "NOT_FOUND");
        }

        var itemDtos = bill.Items
            .Select(i => new PurchaseBillItemDto(
                i.Id,
                i.ItemId,
                i.ItemSku,
                i.ItemName,
                i.HsnCode,
                i.BatchId,
                i.BatchNumber,
                i.Quantity,
                i.UomId,
                i.UomCode,
                i.UnitPrice,
                i.DiscountPercent,
                i.DiscountAmount,
                i.TaxableAmount,
                i.GstRate,
                i.CgstRate,
                i.CgstAmount,
                i.SgstRate,
                i.SgstAmount,
                i.IgstRate,
                i.IgstAmount,
                i.CessRate,
                i.CessAmount,
                i.TotalAmount
            ))
            .ToList();

        var paymentDtos = bill.Payments
            .Select(p => new PurchaseBillPaymentDto(
                p.Id,
                p.PurchaseBillId,
                p.PaymentDate,
                p.Amount,
                p.PaymentMode,
                p.PaymentMode.ToString(),
                p.TransactionReference,
                p.BankName,
                p.Notes,
                p.CreatedAtUtc
            ))
            .ToList();

        var taxSummary = bill.Items
            .GroupBy(i => new { Hsn = i.HsnCode ?? "N/A", i.GstRate })
            .Select(g => new GstTaxSummaryItemDto(
                g.Key.Hsn,
                g.Sum(x => x.TaxableAmount),
                g.Key.GstRate,
                g.Sum(x => x.CgstAmount),
                g.Sum(x => x.SgstAmount),
                g.Sum(x => x.IgstAmount),
                g.Sum(x => x.CgstAmount + x.SgstAmount + x.IgstAmount)
            ))
            .ToList();

        var dto = new PurchaseBillDetailsDto(
            bill.Id,
            bill.TenantId,
            bill.BillNumber,
            bill.VendorInvoiceNumber,
            bill.Status,
            bill.PurchaseOrderId,
            bill.PurchaseOrder?.OrderNumber,
            bill.GoodsReceiptNoteId,
            bill.GoodsReceiptNote?.GrnNumber,
            bill.BranchId,
            bill.Branch?.BranchName ?? "Main Branch",
            bill.WarehouseId,
            bill.Warehouse?.WarehouseName ?? "Main Warehouse",
            bill.PartyId,
            bill.SupplierName,
            bill.SupplierGSTIN,
            bill.SupplierAddress,
            bill.SupplierStateCode,
            bill.PlaceOfSupply,
            bill.BillDate,
            bill.DueDate,
            bill.TaxSupplyType,
            bill.SubTotal,
            bill.DiscountTotal,
            bill.TaxableAmount,
            bill.CgstAmount,
            bill.SgstAmount,
            bill.IgstAmount,
            bill.CessAmount,
            bill.RoundOff,
            bill.TotalAmount,
            bill.PaidAmount,
            bill.BalanceAmount,
            bill.PaymentStatus,
            bill.PrimaryPaymentMode,
            bill.Notes,
            bill.IsCancelled,
            bill.CancellationReason,
            bill.CreatedAtUtc,
            itemDtos,
            paymentDtos,
            taxSummary
        );

        return Result<PurchaseBillDetailsDto>.Success(dto);
    }

    public async Task<Result<PurchaseBillDetailsDto>> GetPurchaseBillByNumberAsync(string billNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var bill = await _context.PurchaseBills
            .Where(b => b.TenantId == tenantId && b.BillNumber == billNumber.Trim() && !b.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (bill == null)
        {
            return Result<PurchaseBillDetailsDto>.Failure($"Purchase bill '{billNumber}' not found.", "NOT_FOUND");
        }

        return await GetPurchaseBillByIdAsync(bill.Id, cancellationToken);
    }

    public async Task<Result<Guid>> CreatePurchaseBillAsync(CreatePurchaseBillRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Purchase bill must contain at least one line item.", "EMPTY_ITEMS");
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BranchId && !b.IsDeleted, cancellationToken);
        if (branch == null)
        {
            return Result<Guid>.Failure("Branch not found.", "BRANCH_NOT_FOUND");
        }

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == request.WarehouseId && !w.IsDeleted, cancellationToken);
        if (warehouse == null)
        {
            return Result<Guid>.Failure("Warehouse not found.", "WAREHOUSE_NOT_FOUND");
        }

        var supplier = await _context.Parties
            .Include(p => p.Addresses)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);
        if (supplier == null)
        {
            return Result<Guid>.Failure("Supplier not found.", "SUPPLIER_NOT_FOUND");
        }

        var billDate = DateTime.SpecifyKind(request.BillDate, DateTimeKind.Utc);
        var fyCode = GetFinancialYearCode(billDate);

        var branchState = branch.StateCode ?? "27";
        var supplierState = supplier.StateCode ?? branchState;
        var isIntraState = string.Equals(branchState, supplierState, StringComparison.OrdinalIgnoreCase);

        // Preload items and UOMs for canonical calculation
        var itemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && itemIds.Contains(i.Id) && !i.IsDeleted)
            .ToDictionaryAsync(i => i.Id, cancellationToken);

        var uomIds = request.Items.Select(i => i.UomId).Distinct().ToList();
        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && uomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var lineInputs = new List<UdyogBill.Application.Services.Calculations.LineCalculationInput>();
        foreach (var reqItem in request.Items)
        {
            if (!itemsDict.TryGetValue(reqItem.ItemId, out var itm))
            {
                return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            decimal conversion = (itm.SecondaryUomId.HasValue && reqItem.UomId == itm.SecondaryUomId.Value && itm.ConversionRatio.HasValue && itm.ConversionRatio.Value > 0)
                ? itm.ConversionRatio.Value
                : 1m;

            lineInputs.Add(new UdyogBill.Application.Services.Calculations.LineCalculationInput(
                Quantity: reqItem.Quantity,
                FreeQuantity: reqItem.FreeQuantity,
                UnitPrice: reqItem.UnitPrice,
                IsTaxInclusive: itm.IsTaxInclusive,
                DiscountPercent: reqItem.DiscountPercent,
                DiscountAmount: reqItem.DiscountAmount,
                GstRate: itm.TaxRate,
                CessRate: itm.CessRate,
                IsIntraState: isIntraState,
                ConversionRatio: conversion
            ));
        }

        var (calculatedLines, totals) = _calculationEngine.CalculateInvoice(
            lineInputs,
            invoiceDiscountPercent: 0m,
            invoiceDiscountAmount: 0m,
            isIntraState: isIntraState
        );

        var semaphore = _tenantDocSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        PurchaseBill bill;
        try
        {
            // Generate sequential Bill Number under lock
            var prefix = $"BILL-{fyCode}-";
            await AcquireSequenceLockAsync(tenantId, "BILL", fyCode, cancellationToken);
            var lastNumberStr = await _context.PurchaseBills
                .Where(b => b.TenantId == tenantId && b.BillNumber.StartsWith(prefix))
                .OrderByDescending(b => b.BillNumber)
                .Select(b => b.BillNumber)
                .FirstOrDefaultAsync(cancellationToken);

            var nextSeq = 1;
            if (!string.IsNullOrEmpty(lastNumberStr) && lastNumberStr.Length > prefix.Length)
            {
                if (int.TryParse(lastNumberStr.Substring(prefix.Length), out var parsed))
                {
                    nextSeq = parsed + 1;
                }
            }
            var billNumber = $"{prefix}{nextSeq:D5}";

            bill = new PurchaseBill
            {
                TenantId = tenantId,
                BillNumber = billNumber,
                VendorInvoiceNumber = request.VendorInvoiceNumber,
                Status = PurchaseBillStatus.Approved,
                PurchaseOrderId = request.PurchaseOrderId,
                GoodsReceiptNoteId = request.GoodsReceiptNoteId,
                BranchId = request.BranchId,
                WarehouseId = request.WarehouseId,
                PartyId = supplier.Id,
                SupplierName = supplier.LegalName,
                SupplierGSTIN = supplier.GSTIN,
                SupplierAddress = supplier.Addresses?.FirstOrDefault(a => a.IsDefault)?.AddressLine1,
                SupplierStateCode = supplierState,
                PlaceOfSupply = branch.State ?? "",
                TaxSupplyType = isIntraState ? TaxSupplyType.IntraState : TaxSupplyType.InterState,
                BillDate = billDate,
                DueDate = request.DueDate.HasValue ? DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc) : null,
                PrimaryPaymentMode = request.PrimaryPaymentMode,
                Notes = request.Notes,
                AttributesJson = request.AttributesJson ?? "{}"
            };

            for (int i = 0; i < request.Items.Count; i++)
            {
                var reqItem = request.Items[i];
                var item = itemsDict[reqItem.ItemId];
                var lineCalc = calculatedLines[i];

                string uomCode = "UNIT";
                if (uomsDict.TryGetValue(reqItem.UomId, out var uom))
                {
                    uomCode = uom.Code ?? item.PrimaryUom?.Code ?? "UNIT";
                }
                else if (item.PrimaryUom != null)
                {
                    uomCode = item.PrimaryUom.Code;
                }

                decimal conversion = (item.SecondaryUomId.HasValue && reqItem.UomId == item.SecondaryUomId.Value && item.ConversionRatio.HasValue && item.ConversionRatio.Value > 0)
                    ? item.ConversionRatio.Value
                    : 1m;

                var attributesDict = new Dictionary<string, object>
                {
                    ["freeQuantity"] = reqItem.FreeQuantity,
                    ["conversionRatio"] = conversion
                };
                if (!string.IsNullOrWhiteSpace(reqItem.AttributesJson) && reqItem.AttributesJson != "{}")
                {
                    try
                    {
                        var parsedAttr = JsonSerializer.Deserialize<Dictionary<string, object>>(reqItem.AttributesJson);
                        if (parsedAttr != null)
                        {
                            foreach (var kvp in parsedAttr) attributesDict[kvp.Key] = kvp.Value;
                        }
                    }
                    catch { }
                }

                var billItem = new PurchaseBillItem
                {
                    TenantId = tenantId,
                    PurchaseBill = bill,
                    ItemId = item.Id,
                    ItemSku = item.Sku,
                    ItemName = item.Name,
                    HsnCode = !string.IsNullOrWhiteSpace(item.HSNCode) ? item.HSNCode : (reqItem.HsnCode ?? ""),
                    BatchId = reqItem.BatchId,
                    BatchNumber = reqItem.BatchNumber,
                    VariantId = reqItem.VariantId,
                    Quantity = reqItem.Quantity,
                    UomId = reqItem.UomId,
                    UomCode = uomCode,
                    UnitPrice = reqItem.UnitPrice,
                    DiscountPercent = reqItem.DiscountPercent,
                    DiscountAmount = lineCalc.ItemDiscountAmount,
                    TaxableAmount = lineCalc.TaxableAmount,
                    GstRate = lineCalc.GstRate,
                    CgstRate = lineCalc.CgstRate,
                    CgstAmount = lineCalc.CgstAmount,
                    SgstRate = lineCalc.SgstRate,
                    SgstAmount = lineCalc.SgstAmount,
                    IgstRate = lineCalc.IgstRate,
                    IgstAmount = lineCalc.IgstAmount,
                    CessRate = lineCalc.CessRate,
                    CessAmount = lineCalc.CessAmount,
                    TotalAmount = lineCalc.LineTotalAmount,
                    AttributesJson = JsonSerializer.Serialize(attributesDict)
                };

                bill.Items.Add(billItem);
            }

            bill.SubTotal = totals.SubTotal;
            bill.DiscountTotal = totals.ItemDiscountTotal + totals.InvoiceDiscountAmount;
            bill.TaxableAmount = totals.TaxableAmount;
            bill.CgstAmount = totals.CgstAmount;
            bill.SgstAmount = totals.SgstAmount;
            bill.IgstAmount = totals.IgstAmount;
            bill.CessAmount = totals.CessAmount;
            bill.RoundOff = totals.RoundOff;
            bill.TotalAmount = totals.RoundedTotal;

            // Payment status & disbursement
            var paid = Math.Min(request.PaidAmount, bill.TotalAmount);
            var balance = bill.TotalAmount - paid;

            bill.PaidAmount = paid;
            bill.BalanceAmount = balance;
            bill.PaymentStatus = balance <= 0.001m ? PaymentStatus.FullyPaid : (paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);
            bill.Status = bill.PaymentStatus == PaymentStatus.FullyPaid ? PurchaseBillStatus.Paid : PurchaseBillStatus.Approved;

            if (paid > 0)
            {
                bill.Payments.Add(new PurchaseBillPayment
                {
                    TenantId = tenantId,
                    PurchaseBill = bill,
                    PaymentDate = billDate,
                    Amount = paid,
                    PaymentMode = request.PrimaryPaymentMode,
                    TransactionReference = request.PaymentReferenceNumber,
                    Notes = $"Payment at time of purchase bill ({request.PrimaryPaymentMode})"
                });
            }

            _context.PurchaseBills.Add(bill);

            // Supplier Financial Ledger Integration (Credit Bill Amount -> Increases Payables Liability)
            var creditBalance = supplier.CurrentOutstandingBalance - bill.TotalAmount;
            supplier.CurrentOutstandingBalance = creditBalance;

            var billLedger = new PartyLedgerEntry
            {
                TenantId = tenantId,
                PartyId = supplier.Id,
                TransactionDate = billDate,
                EntryType = PartyLedgerEntryType.PurchaseInvoice,
                DebitAmount = 0m,
                CreditAmount = bill.TotalAmount,
                RunningBalance = creditBalance,
                ReferenceDocumentType = "PurchaseBill",
                ReferenceDocumentId = bill.Id,
                ReferenceDocumentNumber = billNumber,
                Description = $"Purchase Bill {billNumber} (Vendor Ref: {request.VendorInvoiceNumber ?? "N/A"})"
            };
            _context.PartyLedgerEntries.Add(billLedger);

            if (paid > 0)
            {
                var debitBalance = supplier.CurrentOutstandingBalance + paid;
                supplier.CurrentOutstandingBalance = debitBalance;

                var paymentLedger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = supplier.Id,
                    TransactionDate = billDate,
                    EntryType = PartyLedgerEntryType.VendorPayment,
                    DebitAmount = paid,
                    CreditAmount = 0m,
                    RunningBalance = debitBalance,
                    ReferenceDocumentType = "VendorPayment",
                    ReferenceDocumentId = bill.Id,
                    ReferenceDocumentNumber = billNumber,
                    Description = $"Payment disbursed for Purchase Bill {billNumber}"
                };
                _context.PartyLedgerEntries.Add(paymentLedger);
            }

            // Direct Purchase Bill Stock Inward (when no GRN was pre-created)
            if (!request.GoodsReceiptNoteId.HasValue || request.GoodsReceiptNoteId.Value == Guid.Empty)
            {
                for (int i = 0; i < bill.Items.Count; i++)
                {
                    var bItem = bill.Items.ElementAt(i);
                    var reqItem = request.Items[i];
                    var lineCalc = calculatedLines[i];

                    var masterItem = itemsDict[bItem.ItemId];
                    if (masterItem.ItemType == ItemType.Service || !masterItem.TrackInventory)
                    {
                        continue; // Do not inward stock or create StockMovement for non-stock service items
                    }

                    ItemBatch? batch = null;
                    if (bItem.BatchId.HasValue && bItem.BatchId.Value != Guid.Empty)
                    {
                        batch = await _context.ItemBatches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == bItem.BatchId.Value, cancellationToken);
                    }
                    else if (!string.IsNullOrWhiteSpace(bItem.BatchNumber))
                    {
                        batch = await _context.ItemBatches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.ItemId == bItem.ItemId && b.BatchNumber == bItem.BatchNumber, cancellationToken);
                        if (batch == null)
                        {
                            batch = new ItemBatch
                            {
                                TenantId = tenantId,
                                ItemId = bItem.ItemId,
                                BatchNumber = bItem.BatchNumber,
                                PurchaseRate = bItem.UnitPrice,
                                SaleRate = bItem.UnitPrice,
                                ExpiryDate = reqItem.ExpiryDate ?? DateTime.UtcNow.AddYears(2)
                            };
                            _context.ItemBatches.Add(batch);
                        }
                    }

                    var stockQuery = _context.ItemWarehouseStocks
                        .Where(s => s.TenantId == tenantId && s.ItemId == bItem.ItemId && s.WarehouseId == request.WarehouseId && !s.IsDeleted);

                    if (reqItem.VariantId.HasValue)
                    {
                        stockQuery = stockQuery.Where(s => s.VariantId == reqItem.VariantId.Value);
                    }
                    else
                    {
                        stockQuery = stockQuery.Where(s => s.VariantId == null);
                    }

                    if (batch != null)
                    {
                        stockQuery = stockQuery.Where(s => s.BatchId == batch.Id);
                    }

                    var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
                    var beforeQty = stock?.CurrentQuantity ?? 0m;
                    decimal physicalUnits = lineCalc.TotalPhysicalQuantity;

                    if (stock == null)
                    {
                        stock = new ItemWarehouseStock
                        {
                            TenantId = tenantId,
                            ItemId = bItem.ItemId,
                            VariantId = reqItem.VariantId,
                            WarehouseId = request.WarehouseId,
                            Batch = batch,
                            CurrentQuantity = physicalUnits
                        };
                        _context.ItemWarehouseStocks.Add(stock);
                    }
                    else
                    {
                        stock.CurrentQuantity += physicalUnits;
                    }

                    _context.StockMovements.Add(new StockMovement
                    {
                        TenantId = tenantId,
                        ItemId = bItem.ItemId,
                        VariantId = reqItem.VariantId,
                        WarehouseId = request.WarehouseId,
                        Batch = batch,
                        MovementType = StockMovementType.PurchaseInward,
                        Quantity = physicalUnits,
                        QuantityBefore = beforeQty,
                        QuantityAfter = stock.CurrentQuantity,
                        UnitCost = bItem.UnitPrice,
                        TotalCost = bItem.Quantity * bItem.UnitPrice,
                        ReferenceDocumentType = "PurchaseBill",
                        ReferenceDocumentId = bill.Id,
                        ReferenceDocumentNumber = billNumber,
                        Notes = $"Direct stock inward from Purchase Bill {billNumber} (Net physical units: {physicalUnits})"
                    });
                }
            }

            await AutoPostPurchaseBillToGeneralLedgerAsync(bill, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to create purchase bill for tenant {TenantId}: {Message}", tenantId, ex.Message);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
            semaphore.Release();
        }

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePurchaseBill",
            EntityName = "PurchaseBill",
            EntityId = bill.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { bill.BillNumber, bill.SupplierName, bill.TotalAmount }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(bill.Id);
    }

    public async Task<Result<Guid>> RecordPurchaseBillPaymentAsync(Guid billId, RecordPurchaseBillPaymentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var bill = await _context.PurchaseBills
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == billId && !b.IsDeleted, cancellationToken);

        if (bill == null)
        {
            return Result<Guid>.Failure("Purchase bill not found.", "NOT_FOUND");
        }

        if (bill.BalanceAmount <= 0)
        {
            return Result<Guid>.Failure("Purchase bill is already fully paid.", "ALREADY_PAID");
        }

        var payAmt = Math.Min(request.Amount, bill.BalanceAmount);
        var payDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);

        var payment = new PurchaseBillPayment
        {
            TenantId = tenantId,
            PurchaseBillId = bill.Id,
            PaymentDate = payDate,
            Amount = payAmt,
            PaymentMode = request.PaymentMode,
            TransactionReference = request.TransactionReference,
            BankName = request.BankName,
            Notes = request.Notes
        };

        _context.PurchaseBillPayments.Add(payment);
        bill.PaidAmount += payAmt;
        bill.BalanceAmount -= payAmt;
        bill.PaymentStatus = bill.BalanceAmount <= 0 ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
        bill.Status = bill.PaymentStatus == PaymentStatus.FullyPaid ? PurchaseBillStatus.Paid : PurchaseBillStatus.Approved;

        // Supplier Financial Ledger (Debit Disbursement)
        var supplier = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == bill.PartyId && !p.IsDeleted, cancellationToken);

        if (supplier != null)
        {
            var debitBal = supplier.CurrentOutstandingBalance + payAmt;
            supplier.CurrentOutstandingBalance = debitBal;

            var ledger = new PartyLedgerEntry
            {
                TenantId = tenantId,
                PartyId = supplier.Id,
                TransactionDate = payDate,
                EntryType = PartyLedgerEntryType.VendorPayment,
                DebitAmount = payAmt,
                CreditAmount = 0m,
                RunningBalance = debitBal,
                ReferenceDocumentType = "VendorPayment",
                ReferenceDocumentId = bill.Id,
                ReferenceDocumentNumber = bill.BillNumber,
                Description = $"Payment disbursed for Bill {bill.BillNumber} ({request.PaymentMode})"
            };
            _context.PartyLedgerEntries.Add(ledger);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "RecordPurchaseBillPayment",
            EntityName = "PurchaseBillPayment",
            EntityId = payment.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { bill.BillNumber, Amount = payAmt, request.PaymentMode }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(payment.Id);
    }

    public async Task<Result> CancelPurchaseBillAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var bill = await _context.PurchaseBills
            .Include(b => b.Items)
            .Where(b => b.TenantId == tenantId && b.Id == id && !b.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (bill == null)
        {
            return Result.Failure("Purchase bill not found.", "NOT_FOUND");
        }

        if (bill.IsCancelled)
        {
            return Result.Failure("Purchase bill is already cancelled.", "ALREADY_CANCELLED");
        }

        if (bill.PaidAmount > 0)
        {
            return Result.Failure("Cannot cancel purchase bill that has recorded payments. Reverse or delete payments first.", "CANNOT_CANCEL_BILL_WITH_PAYMENTS_OR_RETURNS");
        }

        var hasActiveDebitNotes = await _context.PurchaseReturns
            .AnyAsync(r => r.TenantId == tenantId && r.OriginalPurchaseBillId == bill.Id && !r.IsCancelled && !r.IsDeleted, cancellationToken);
        if (hasActiveDebitNotes)
        {
            return Result.Failure("Cannot cancel purchase bill with active debit notes / purchase returns. Cancel or reverse the returns first.", "CANNOT_CANCEL_BILL_WITH_PAYMENTS_OR_RETURNS");
        }

        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            // Query prior returns for this bill to prevent phantom duplicate stock depletion
            var returnedByItem = await _context.PurchaseReturnItems
            .Where(pri => pri.TenantId == tenantId && 
                          pri.PurchaseReturn.OriginalPurchaseBillId == bill.Id && 
                          !pri.IsDeleted && 
                          !pri.PurchaseReturn.IsCancelled)
            .GroupBy(pri => pri.ItemId)
            .Select(g => new { ItemId = g.Key, TotalReturned = g.Sum(x => x.ReturnQuantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.TotalReturned, cancellationToken);

        var billItemIds = bill.Items.Select(x => x.ItemId).Distinct().ToList();
        var billItemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && billItemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        // Deplete Warehouse Stock for unreturned items only
        foreach (var item in bill.Items)
        {
            if (billItemsDict.TryGetValue(item.ItemId, out var masterItem) && (masterItem.ItemType == ItemType.Service || !masterItem.TrackInventory))
            {
                continue; // Do not deplete inventory for non-stock service items
            }

            returnedByItem.TryGetValue(item.ItemId, out var alreadyReturned);
            decimal remainingToDeplete = Math.Max(0m, item.Quantity - alreadyReturned);
            if (remainingToDeplete <= 0) continue;

            var stockQuery = _context.ItemWarehouseStocks
                .Where(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.WarehouseId == bill.WarehouseId && !s.IsDeleted);

            if (item.VariantId.HasValue)
            {
                stockQuery = stockQuery.Where(s => s.VariantId == item.VariantId.Value);
            }
            else
            {
                stockQuery = stockQuery.Where(s => s.VariantId == null);
            }

            if (item.BatchId.HasValue && item.BatchId.Value != Guid.Empty)
            {
                stockQuery = stockQuery.Where(s => s.BatchId == item.BatchId.Value);
            }

            decimal freeQty = 0m;
            decimal conversion = 1m;
            if (!string.IsNullOrWhiteSpace(item.AttributesJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                    if (doc.RootElement.TryGetProperty("freeQuantity", out var fq)) freeQty = fq.GetDecimal();
                    if (doc.RootElement.TryGetProperty("conversionRatio", out var cr)) conversion = cr.GetDecimal();
                }
                catch { }
            }

            decimal proRataFree = (item.Quantity > 0 && freeQty > 0) ? (remainingToDeplete / item.Quantity) * freeQty : 0m;
            decimal physicalUnits = (remainingToDeplete + proRataFree) * (conversion > 0 ? conversion : 1m);

            var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
            if (stock != null)
            {
                var beforeQty = stock.CurrentQuantity;
                stock.CurrentQuantity -= physicalUnits;

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.ItemId,
                    VariantId = item.VariantId,
                    WarehouseId = bill.WarehouseId,
                    BatchId = item.BatchId,
                    MovementType = StockMovementType.TransferOut,
                    Quantity = -physicalUnits,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.UnitPrice,
                    TotalCost = item.UnitPrice * remainingToDeplete,
                    ReferenceDocumentType = "PurchaseBillCancellation",
                    ReferenceDocumentId = bill.Id,
                    ReferenceDocumentNumber = bill.BillNumber,
                    Notes = $"Stock deducted on purchase bill cancellation: {cancellationReason} (Net Units: {physicalUnits})"
                };
                _context.StockMovements.Add(movement);
            }
        }

        // Reverse Supplier Ledger (Debit the bill amount back)
        var supplier = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == bill.PartyId && !p.IsDeleted, cancellationToken);

        if (supplier != null)
        {
            var newBal = supplier.CurrentOutstandingBalance + bill.TotalAmount;
            supplier.CurrentOutstandingBalance = newBal;

            var reversal = new PartyLedgerEntry
            {
                TenantId = tenantId,
                PartyId = supplier.Id,
                TransactionDate = DateTime.UtcNow,
                EntryType = PartyLedgerEntryType.DebitNote,
                DebitAmount = bill.TotalAmount,
                CreditAmount = 0m,
                RunningBalance = newBal,
                ReferenceDocumentType = "BillCancellation",
                ReferenceDocumentId = bill.Id,
                ReferenceDocumentNumber = bill.BillNumber,
                Description = $"Purchase Bill cancellation reversal: {cancellationReason}"
            };
            _context.PartyLedgerEntries.Add(reversal);
        }

        bill.IsCancelled = true;
        bill.CancellationReason = cancellationReason;
        bill.Status = PurchaseBillStatus.Cancelled;

        await AutoPostPurchaseBillCancellationToGeneralLedgerAsync(bill, cancellationReason, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        if (tx != null) await tx.CommitAsync(cancellationToken);
    }
    catch (Exception ex)
    {
        if (tx != null) await tx.RollbackAsync(cancellationToken);
        _logger?.LogError(ex, "Failed to cancel purchase bill {BillNumber}: {Message}", bill.BillNumber, ex.Message);
        throw;
    }
    finally
    {
        if (tx != null) await tx.DisposeAsync();
    }

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "CancelPurchaseBill",
            EntityName = "PurchaseBill",
            EntityId = bill.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { bill.BillNumber, CancellationReason = cancellationReason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #endregion

    #region Purchase Returns & Debit Notes

    public async Task<Result<PagedResult<PurchaseReturnDto>>> GetPurchaseReturnsAsync(
        int pageNumber,
        int pageSize,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.PurchaseReturns
            .Include(r => r.Items)
            .Where(r => r.TenantId == tenantId && !r.IsDeleted)
            .AsNoTracking();

        if (partyId.HasValue && partyId.Value != Guid.Empty)
            query = query.Where(r => r.PartyId == partyId.Value);

        if (fromDate.HasValue)
            query = query.Where(r => r.ReturnDate >= DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc));

        if (toDate.HasValue)
            query = query.Where(r => r.ReturnDate <= DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc));

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(r => r.DebitNoteNumber.ToLower().Contains(term) ||
                                     r.SupplierName.ToLower().Contains(term) ||
                                     (r.OriginalBillNumber != null && r.OriginalBillNumber.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(r => r.ReturnDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new PurchaseReturnDto(
                r.Id,
                r.DebitNoteNumber,
                r.ReturnDate,
                r.OriginalPurchaseBillId,
                r.OriginalBillNumber,
                r.PartyId,
                r.SupplierName,
                r.BranchId,
                r.WarehouseId,
                r.ReturnReason,
                r.SubTotal,
                r.TaxAmount,
                r.TotalAmount,
                r.Notes,
                r.IsCancelled,
                r.CreatedAtUtc,
                r.Items.Select(i => new PurchaseReturnItemDto(
                    i.Id,
                    i.ItemId,
                    i.ItemName,
                    i.ItemSku,
                    i.BatchId,
                    i.BatchNumber,
                    i.ReturnQuantity,
                    i.UnitPrice,
                    i.GstRate,
                    i.TotalAmount
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<PurchaseReturnDto>>.Success(new PagedResult<PurchaseReturnDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<PurchaseReturnDto>> GetPurchaseReturnByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var r = await _context.PurchaseReturns
            .Include(x => x.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id && !x.IsDeleted, cancellationToken);

        if (r == null)
            return Result<PurchaseReturnDto>.Failure("Purchase return record not found.", "NOT_FOUND");

        var dto = new PurchaseReturnDto(
            r.Id,
            r.DebitNoteNumber,
            r.ReturnDate,
            r.OriginalPurchaseBillId,
            r.OriginalBillNumber,
            r.PartyId,
            r.SupplierName,
            r.BranchId,
            r.WarehouseId,
            r.ReturnReason,
            r.SubTotal,
            r.TaxAmount,
            r.TotalAmount,
            r.Notes,
            r.IsCancelled,
            r.CreatedAtUtc,
            r.Items.Select(i => new PurchaseReturnItemDto(
                i.Id,
                i.ItemId,
                i.ItemName,
                i.ItemSku,
                i.BatchId,
                i.BatchNumber,
                i.ReturnQuantity,
                i.UnitPrice,
                i.GstRate,
                i.TotalAmount
            )).ToList()
        );

        return Result<PurchaseReturnDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreatePurchaseReturnAsync(CreatePurchaseReturnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
            return Result<Guid>.Failure("At least one item must be returned.", "VALIDATION_ERROR");

        PurchaseBill? origBill = null;
        Dictionary<Guid, decimal> priorReturns = new();
        if (request.OriginalPurchaseBillId.HasValue && request.OriginalPurchaseBillId.Value != Guid.Empty)
        {
            origBill = await _context.PurchaseBills
                .Include(b => b.Items)
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.OriginalPurchaseBillId.Value && !b.IsDeleted, cancellationToken);

            if (origBill == null)
                return Result<Guid>.Failure("Original purchase bill not found.", "NOT_FOUND");

            if (origBill.IsCancelled)
                return Result<Guid>.Failure("Cannot create purchase return against a cancelled purchase bill.", "INVALID_OPERATION");

            priorReturns = await _context.PurchaseReturnItems
                .Where(pri => pri.TenantId == tenantId &&
                              pri.PurchaseReturn.OriginalPurchaseBillId == origBill.Id &&
                              !pri.IsDeleted &&
                              !pri.PurchaseReturn.IsCancelled)
                .GroupBy(pri => pri.ItemId)
                .Select(g => new { ItemId = g.Key, TotalReturned = g.Sum(x => x.ReturnQuantity) })
                .ToDictionaryAsync(x => x.ItemId, x => x.TotalReturned, cancellationToken);
        }

        var semaphore = _tenantDocSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        PurchaseReturn purchaseReturn;
        try
        {
            var dnPrefix = $"DN-{DateTime.UtcNow:yyMM}-";
            await AcquireSequenceLockAsync(tenantId, "DN", DateTime.UtcNow.ToString("yyMM"), cancellationToken);
            var lastNumberStr = await _context.PurchaseReturns
                .Where(r => r.TenantId == tenantId && r.DebitNoteNumber.StartsWith(dnPrefix))
                .OrderByDescending(r => r.DebitNoteNumber)
                .Select(r => r.DebitNoteNumber)
                .FirstOrDefaultAsync(cancellationToken);

            int nextNum = 1;
            if (!string.IsNullOrEmpty(lastNumberStr) && lastNumberStr.Length > dnPrefix.Length)
            {
                if (int.TryParse(lastNumberStr.Substring(dnPrefix.Length), out var parsed))
                {
                    nextNum = parsed + 1;
                }
            }
            var debitNoteNumber = $"{dnPrefix}{nextNum:D5}";

            decimal subTotal = 0m;
            decimal taxTotal = 0m;

            purchaseReturn = new PurchaseReturn
            {
                TenantId = tenantId,
                DebitNoteNumber = debitNoteNumber,
                ReturnDate = DateTimeOffset.UtcNow,
                OriginalPurchaseBillId = request.OriginalPurchaseBillId,
                OriginalBillNumber = request.OriginalBillNumber,
                PartyId = request.PartyId,
                SupplierName = request.SupplierName.Trim(),
                BranchId = request.BranchId,
                WarehouseId = request.WarehouseId,
                ReturnReason = request.ReturnReason,
                Notes = request.Notes
            };

            var retItemIds = request.Items.Select(x => x.ItemId).Distinct().ToList();
            var retItemsDict = await _context.Items
                .Where(it => it.TenantId == tenantId && retItemIds.Contains(it.Id) && !it.IsDeleted)
                .ToDictionaryAsync(it => it.Id, cancellationToken);

            foreach (var line in request.Items)
            {
                if (origBill != null)
                {
                    var origItem = origBill.Items.FirstOrDefault(i => i.ItemId == line.ItemId);
                    if (origItem == null)
                    {
                        return Result<Guid>.Failure($"Item '{line.ItemName}' was not found on original purchase bill.", "INVALID_LINE_ITEM");
                    }

                    priorReturns.TryGetValue(line.ItemId, out var alreadyReturned);
                    if (alreadyReturned + line.ReturnQuantity > origItem.Quantity)
                    {
                        return Result<Guid>.Failure($"Cannot return {line.ReturnQuantity} of '{line.ItemName}'. Already returned: {alreadyReturned}, Original billed quantity: {origItem.Quantity}.", "RETURN_QTY_EXCEEDED");
                    }
                }

                var lineTaxable = line.ReturnQuantity * line.UnitPrice;
                var lineTax = lineTaxable * (line.GstRate / 100m);
                var lineTotal = lineTaxable + lineTax;

                subTotal += lineTaxable;
                taxTotal += lineTax;

                purchaseReturn.Items.Add(new PurchaseReturnItem
                {
                    TenantId = tenantId,
                    ItemId = line.ItemId,
                    VariantId = line.VariantId,
                    ItemName = line.ItemName,
                    ItemSku = line.ItemSku,
                    BatchId = line.BatchId,
                    BatchNumber = line.BatchNumber,
                    ReturnQuantity = line.ReturnQuantity,
                    UnitPrice = line.UnitPrice,
                    GstRate = line.GstRate,
                    TotalAmount = lineTotal
                });

                retItemsDict.TryGetValue(line.ItemId, out var retMasterItem);
                bool isServiceItem = retMasterItem != null && (retMasterItem.ItemType == ItemType.Service || !retMasterItem.TrackInventory);

                if (!isServiceItem)
                {
                    // Deplete from Warehouse Stock (matching variant and batch if tracked)
                    var stockQuery = _context.ItemWarehouseStocks
                        .Where(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == request.WarehouseId && !s.IsDeleted);

                    if (line.VariantId.HasValue)
                    {
                        stockQuery = stockQuery.Where(s => s.VariantId == line.VariantId.Value);
                    }
                    else
                    {
                        stockQuery = stockQuery.Where(s => s.VariantId == null);
                    }

                    if (line.BatchId.HasValue && line.BatchId.Value != Guid.Empty)
                    {
                        stockQuery = stockQuery.Where(s => s.BatchId == line.BatchId.Value);
                    }

                    var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
                    if (stock == null || stock.CurrentQuantity < line.ReturnQuantity)
                    {
                        return Result<Guid>.Failure($"Insufficient warehouse stock to return item '{line.ItemName}'. Available: {stock?.CurrentQuantity ?? 0m}, Requested: {line.ReturnQuantity}.", "INSUFFICIENT_STOCK");
                    }

                    decimal beforeQty = stock.CurrentQuantity;
                    stock.CurrentQuantity -= line.ReturnQuantity;

                    _context.StockMovements.Add(new StockMovement
                    {
                        TenantId = tenantId,
                        ItemId = line.ItemId,
                        VariantId = line.VariantId,
                        WarehouseId = request.WarehouseId,
                        BatchId = line.BatchId,
                        MovementType = StockMovementType.PurchaseReturn,
                        Quantity = -line.ReturnQuantity,
                        QuantityBefore = beforeQty,
                        QuantityAfter = stock.CurrentQuantity,
                        UnitCost = line.UnitPrice,
                        TotalCost = lineTaxable,
                        ReferenceDocumentType = "DebitNote",
                        ReferenceDocumentId = purchaseReturn.Id,
                        ReferenceDocumentNumber = debitNoteNumber,
                        Notes = $"Stock Outward for Purchase Return {debitNoteNumber}"
                    });
                }
            }

            purchaseReturn.SubTotal = subTotal;
            purchaseReturn.TaxAmount = taxTotal;
            purchaseReturn.TotalAmount = Math.Round(subTotal + taxTotal, 2);

            // Adjust Supplier Ledger
            if (request.PartyId != Guid.Empty)
            {
                var supplier = await _context.Parties
                    .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

                if (supplier != null)
                {
                    supplier.CurrentOutstandingBalance += purchaseReturn.TotalAmount;

                    _context.PartyLedgerEntries.Add(new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = supplier.Id,
                        TransactionDate = DateTime.UtcNow,
                        EntryType = PartyLedgerEntryType.DebitNote,
                        DebitAmount = purchaseReturn.TotalAmount,
                        CreditAmount = 0m,
                        RunningBalance = supplier.CurrentOutstandingBalance,
                        ReferenceDocumentType = "DebitNote",
                        ReferenceDocumentId = purchaseReturn.Id,
                        ReferenceDocumentNumber = debitNoteNumber,
                        Description = $"Purchase Return / Debit Note {debitNoteNumber}: {request.ReturnReason}"
                    });
                }
            }

            _context.PurchaseReturns.Add(purchaseReturn);
            await AutoPostPurchaseReturnToGeneralLedgerAsync(purchaseReturn, origBill, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to create purchase return for tenant {TenantId}: {Message}", tenantId, ex.Message);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
            semaphore.Release();
        }

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePurchaseReturn",
            EntityName = "PurchaseReturn",
            EntityId = purchaseReturn.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { purchaseReturn.DebitNoteNumber, purchaseReturn.TotalAmount }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(purchaseReturn.Id);
    }

    private async Task AutoPostPurchaseBillToGeneralLedgerAsync(PurchaseBill bill, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = bill.TenantId;
            var apAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AP", "Accounts Payable (Sundry Creditors)", "GRP-CL", "Current Liabilities", "Liability", "Credit", cancellationToken);
            var expAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-PURCHASE-EXP", "Direct Purchase Expense / Inward Inventory", "GRP-COGS", "Cost of Goods Sold", "Expense", "Debit", cancellationToken);
            var cgstAccount = bill.CgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-IN", "Input CGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var sgstAccount = bill.SgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-IN", "Input SGST/UTGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var igstAccount = bill.IgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-IN", "Input IGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var cessAccount = bill.CessAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CESS-IN", "Input GST Cess Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var roundOffAccount = bill.RoundOff != 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-ROUNDOFF", "Round Off Differences", "GRP-IDEXP", "Indirect Expenses", "Expense", "Debit", cancellationToken) : null;

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-BILL-{bill.BillNumber}",
                VoucherDate = bill.BillDate,
                VoucherType = "Journal",
                ReferenceNumber = bill.BillNumber,
                TotalDebit = bill.TotalAmount,
                TotalCredit = bill.TotalAmount,
                Narration = $"Auto-posted purchase bill {bill.BillNumber} from {bill.SupplierName}",
                CreatedByName = "System Auto-Posting"
            };

            // Leg 1: Debit Purchase Expense / Inventory
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = expAccount.Id,
                DebitAmount = bill.TaxableAmount,
                CreditAmount = 0,
                Narration = $"Purchase expense for bill {bill.BillNumber}"
            });
            expAccount.CurrentBalance += bill.TaxableAmount;

            // Leg 2: Debit Input CGST
            if (cgstAccount != null && bill.CgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cgstAccount.Id,
                    DebitAmount = bill.CgstAmount,
                    CreditAmount = 0,
                    Narration = $"Input CGST credit on bill {bill.BillNumber}"
                });
                cgstAccount.CurrentBalance += bill.CgstAmount;
            }

            // Leg 3: Debit Input SGST
            if (sgstAccount != null && bill.SgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = sgstAccount.Id,
                    DebitAmount = bill.SgstAmount,
                    CreditAmount = 0,
                    Narration = $"Input SGST credit on bill {bill.BillNumber}"
                });
                sgstAccount.CurrentBalance += bill.SgstAmount;
            }

            // Leg 4: Debit Input IGST
            if (igstAccount != null && bill.IgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = igstAccount.Id,
                    DebitAmount = bill.IgstAmount,
                    CreditAmount = 0,
                    Narration = $"Input IGST credit on bill {bill.BillNumber}"
                });
                igstAccount.CurrentBalance += bill.IgstAmount;
            }

            // Leg 5: Debit Input Cess
            if (cessAccount != null && bill.CessAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cessAccount.Id,
                    DebitAmount = bill.CessAmount,
                    CreditAmount = 0,
                    Narration = $"Input Cess credit on bill {bill.BillNumber}"
                });
                cessAccount.CurrentBalance += bill.CessAmount;
            }

            // Leg 6: Round Off
            if (roundOffAccount != null && bill.RoundOff != 0)
            {
                if (bill.RoundOff > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = bill.RoundOff,
                        CreditAmount = 0,
                        Narration = $"Round off expense on bill {bill.BillNumber}"
                    });
                    roundOffAccount.CurrentBalance += bill.RoundOff;
                }
                else
                {
                    var gain = Math.Abs(bill.RoundOff);
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = gain,
                        Narration = $"Round off gain on bill {bill.BillNumber}"
                    });
                    roundOffAccount.CurrentBalance -= gain;
                }
            }

            // Leg 7: Credit AP (Supplier)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = apAccount.Id,
                DebitAmount = 0,
                CreditAmount = bill.TotalAmount,
                Narration = $"Credit supplier payable to {bill.SupplierName}"
            });
            apAccount.CurrentBalance += bill.TotalAmount;

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AccountingAutoPost] Error auto-posting purchase bill {BillNumber} to General Ledger: {Message}", bill.BillNumber, ex.Message);
            throw new InvalidOperationException($"General Ledger auto-posting failed for purchase bill {bill.BillNumber}: {ex.Message}", ex);
        }
    }

    private async Task AutoPostPurchaseBillCancellationToGeneralLedgerAsync(PurchaseBill bill, string cancellationReason, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = bill.TenantId;
            var apAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AP", "Accounts Payable (Sundry Creditors)", "GRP-CL", "Current Liabilities", "Liability", "Credit", cancellationToken);
            var expAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-PURCHASE-EXP", "Direct Purchase Expense / Inward Inventory", "GRP-COGS", "Cost of Goods Sold", "Expense", "Debit", cancellationToken);
            var cgstAccount = bill.CgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-IN", "Input CGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var sgstAccount = bill.SgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-IN", "Input SGST/UTGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var igstAccount = bill.IgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-IN", "Input IGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var cessAccount = bill.CessAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CESS-IN", "Input GST Cess Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var roundOffAccount = bill.RoundOff != 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-ROUNDOFF", "Round Off Differences", "GRP-IDEXP", "Indirect Expenses", "Expense", "Debit", cancellationToken) : null;

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-REV-BILL-{bill.BillNumber}",
                VoucherDate = DateTime.UtcNow,
                VoucherType = "Reversal",
                ReferenceNumber = bill.BillNumber,
                TotalDebit = bill.TotalAmount,
                TotalCredit = bill.TotalAmount,
                Narration = $"Reversing journal entry for cancelled purchase bill {bill.BillNumber}: {cancellationReason}",
                CreatedByName = "System Auto-Posting"
            };

            // Leg 1: Debit AP (Reduces Accounts Payable)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = apAccount.Id,
                DebitAmount = bill.TotalAmount,
                CreditAmount = 0,
                Narration = $"Debit AP on cancellation of purchase bill {bill.BillNumber}"
            });
            apAccount.CurrentBalance -= bill.TotalAmount;

            // Leg 2: Credit Purchase Expense (Reverses COGS/Expense)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = expAccount.Id,
                DebitAmount = 0,
                CreditAmount = bill.TaxableAmount,
                Narration = $"Reverse purchase expense for bill {bill.BillNumber}"
            });
            expAccount.CurrentBalance -= bill.TaxableAmount;

            // Leg 3: Credit Input CGST
            if (cgstAccount != null && bill.CgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cgstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = bill.CgstAmount,
                    Narration = $"Reverse input CGST on cancelled bill {bill.BillNumber}"
                });
                cgstAccount.CurrentBalance -= bill.CgstAmount;
            }

            // Leg 4: Credit Input SGST
            if (sgstAccount != null && bill.SgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = sgstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = bill.SgstAmount,
                    Narration = $"Reverse input SGST on cancelled bill {bill.BillNumber}"
                });
                sgstAccount.CurrentBalance -= bill.SgstAmount;
            }

            // Leg 5: Credit Input IGST
            if (igstAccount != null && bill.IgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = igstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = bill.IgstAmount,
                    Narration = $"Reverse input IGST on cancelled bill {bill.BillNumber}"
                });
                igstAccount.CurrentBalance -= bill.IgstAmount;
            }

            // Leg 6: Credit Input Cess
            if (cessAccount != null && bill.CessAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cessAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = bill.CessAmount,
                    Narration = $"Reverse input Cess on cancelled bill {bill.BillNumber}"
                });
                cessAccount.CurrentBalance -= bill.CessAmount;
            }

            // Leg 7: Round Off reversal
            if (roundOffAccount != null && bill.RoundOff != 0)
            {
                if (bill.RoundOff > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = bill.RoundOff,
                        Narration = $"Reverse round off expense for bill {bill.BillNumber}"
                    });
                    roundOffAccount.CurrentBalance -= bill.RoundOff;
                }
                else
                {
                    var gain = Math.Abs(bill.RoundOff);
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = gain,
                        CreditAmount = 0,
                        Narration = $"Reverse round off gain for bill {bill.BillNumber}"
                    });
                    roundOffAccount.CurrentBalance += gain;
                }
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AccountingAutoPost] Error auto-posting reversal for bill {BillNumber}: {Message}", bill.BillNumber, ex.Message);
            throw new InvalidOperationException($"General Ledger auto-posting failed for bill reversal {bill.BillNumber}: {ex.Message}", ex);
        }
    }

    private async Task AutoPostPurchaseReturnToGeneralLedgerAsync(PurchaseReturn purchaseReturn, PurchaseBill? origBill, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = purchaseReturn.TenantId;
            var apAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AP", "Accounts Payable (Sundry Creditors)", "GRP-CL", "Current Liabilities", "Liability", "Credit", cancellationToken);
            var retAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-PURCHASE-RET", "Purchase Returns & Outward Deductions", "GRP-COGS", "Cost of Goods Sold", "Expense", "Credit", cancellationToken);

            bool isInterState = origBill != null ? origBill.TaxSupplyType == TaxSupplyType.InterState : false;
            var cgstAccount = (!isInterState && purchaseReturn.TaxAmount > 0) ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-IN", "Input CGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var sgstAccount = (!isInterState && purchaseReturn.TaxAmount > 0) ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-IN", "Input SGST/UTGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;
            var igstAccount = (isInterState && purchaseReturn.TaxAmount > 0) ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-IN", "Input IGST Receivable", "GRP-TAX", "Duties & Taxes", "Asset", "Debit", cancellationToken) : null;

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-DN-{purchaseReturn.DebitNoteNumber}",
                VoucherDate = purchaseReturn.ReturnDate.UtcDateTime,
                VoucherType = "DebitNote",
                ReferenceNumber = purchaseReturn.DebitNoteNumber,
                TotalDebit = purchaseReturn.TotalAmount,
                TotalCredit = purchaseReturn.TotalAmount,
                Narration = $"Auto-posted Debit Note {purchaseReturn.DebitNoteNumber} for purchase return",
                CreatedByName = "System Auto-Posting"
            };

            // Leg 1: Debit AP (Supplier liability reduced)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = apAccount.Id,
                DebitAmount = purchaseReturn.TotalAmount,
                CreditAmount = 0,
                Narration = $"Debit supplier liability on Debit Note {purchaseReturn.DebitNoteNumber}"
            });
            apAccount.CurrentBalance -= purchaseReturn.TotalAmount;

            // Leg 2: Credit Purchase Return
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = retAccount.Id,
                DebitAmount = 0,
                CreditAmount = purchaseReturn.SubTotal,
                Narration = $"Purchase return credit {purchaseReturn.DebitNoteNumber}"
            });
            retAccount.CurrentBalance += purchaseReturn.SubTotal;

            // Leg 3: Credit Input GST Reversals
            if (isInterState && igstAccount != null && purchaseReturn.TaxAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = igstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = purchaseReturn.TaxAmount,
                    Narration = "Input IGST credit reversal on purchase return"
                });
                igstAccount.CurrentBalance -= purchaseReturn.TaxAmount;
            }
            else if (!isInterState && purchaseReturn.TaxAmount > 0)
            {
                var halfTax = Math.Round(purchaseReturn.TaxAmount / 2m, 2);
                var otherHalf = purchaseReturn.TaxAmount - halfTax;

                if (cgstAccount != null)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = cgstAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = halfTax,
                        Narration = "Input CGST credit reversal on purchase return"
                    });
                    cgstAccount.CurrentBalance -= halfTax;
                }

                if (sgstAccount != null)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = sgstAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = otherHalf,
                        Narration = "Input SGST credit reversal on purchase return"
                    });
                    sgstAccount.CurrentBalance -= otherHalf;
                }
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AccountingAutoPost] Error auto-posting debit note {DebitNoteNumber} to General Ledger: {Message}", purchaseReturn.DebitNoteNumber, ex.Message);
            throw new InvalidOperationException($"General Ledger auto-posting failed for debit note {purchaseReturn.DebitNoteNumber}: {ex.Message}", ex);
        }
    }

    private async Task<LedgerAccount> GetOrCreateLedgerAccountAsync(
        Guid tenantId,
        string accountCode,
        string accountName,
        string groupCode,
        string groupName,
        string category,
        string nature,
        CancellationToken cancellationToken)
    {
        var acc = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AccountCode == accountCode, cancellationToken);
        if (acc != null) return acc;

        var grp = await _context.AccountGroups.FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Code == groupCode, cancellationToken);
        if (grp == null)
        {
            grp = new AccountGroup
            {
                TenantId = tenantId,
                Code = groupCode,
                Name = groupName,
                Category = category,
                Nature = nature
            };
            _context.AccountGroups.Add(grp);
            await _context.SaveChangesAsync(cancellationToken);
        }

        acc = new LedgerAccount
        {
            TenantId = tenantId,
            AccountCode = accountCode,
            AccountName = accountName,
            GroupId = grp.Id,
            Category = category,
            BalanceType = nature,
            CurrentBalance = 0,
            IsSystemAccount = true,
            IsActive = true
        };
        _context.LedgerAccounts.Add(acc);
        await _context.SaveChangesAsync(cancellationToken);
        return acc;
    }

    #endregion
}
