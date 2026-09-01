using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class SalesService : ISalesService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _tenantInvoiceSemaphores = new();

    public SalesService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required for this operation.");
        }

        return tenantId;
    }

    private static string GetFinancialYearCode(DateTime date)
    {
        var year = date.Month >= 4 ? date.Year : date.Year - 1;
        var nextYear = year + 1;
        return $"{year % 100:D2}{nextYear % 100:D2}"; // e.g. "2627"
    }

    public async Task<Result<PagedResult<SalesInvoiceListDto>>> GetInvoicesAsync(
        int pageNumber,
        int pageSize,
        InvoiceType? invoiceType = null,
        InvoiceStatus? status = null,
        PaymentStatus? paymentStatus = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .Include(i => i.Branch)
            .AsQueryable();

        if (invoiceType.HasValue)
        {
            query = query.Where(i => i.InvoiceType == invoiceType.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        if (paymentStatus.HasValue)
        {
            query = query.Where(i => i.PaymentStatus == paymentStatus.Value);
        }

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(i => i.BranchId == branchId.Value);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(i => i.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var utcFrom = DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc);
            query = query.Where(i => i.InvoiceDate >= utcFrom);
        }

        if (toDate.HasValue)
        {
            var utcTo = DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc);
            query = query.Where(i => i.InvoiceDate <= utcTo);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(i =>
                i.InvoiceNumber.ToLower().Contains(term) ||
                i.CustomerName.ToLower().Contains(term) ||
                (i.CustomerPhone != null && i.CustomerPhone.Contains(term)) ||
                (i.CustomerGSTIN != null && i.CustomerGSTIN.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
                .ThenByDescending(i => i.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new SalesInvoiceListDto(
                i.Id,
                i.TenantId,
                i.InvoiceNumber,
                i.InvoiceType,
                i.Status,
                i.BranchId,
                i.Branch != null ? i.Branch.BranchName : "Main Branch",
                i.PartyId,
                i.CustomerName,
                i.CustomerPhone,
                i.CustomerGSTIN,
                i.InvoiceDate,
                i.DueDate,
                i.TaxableAmount,
                i.CgstAmount,
                i.SgstAmount,
                i.IgstAmount,
                i.TotalAmount,
                i.PaidAmount,
                i.BalanceAmount,
                i.PaymentStatus,
                i.PrimaryPaymentMode,
                i.IsCancelled,
                i.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<SalesInvoiceListDto>>.Success(
            PagedResult<SalesInvoiceListDto>.Create(invoices, pageNumber, pageSize, totalCount)
        );
    }

    public async Task<Result<SalesInvoiceDetailsDto>> GetInvoiceByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted)
            .Include(i => i.Branch)
            .Include(i => i.Warehouse)
            .Include(i => i.Items.Where(it => !it.IsDeleted))
                .ThenInclude(it => it.Uom)
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice == null)
        {
            return Result<SalesInvoiceDetailsDto>.Failure("Invoice not found.", "NOT_FOUND");
        }

        var itemDtos = invoice.Items.Select(it => new SalesInvoiceItemDto(
            it.Id,
            it.InvoiceId,
            it.ItemId,
            it.ItemSku,
            it.ItemName,
            it.HsnCode,
            it.Barcode,
            it.BatchId,
            it.BatchNumber,
            it.ExpiryDate,
            it.Quantity,
            it.UomId,
            it.UomCode,
            it.UnitPrice,
            it.Mrp,
            it.DiscountPercent,
            it.DiscountAmount,
            it.TaxableAmount,
            it.GstRate,
            it.CgstRate,
            it.CgstAmount,
            it.SgstRate,
            it.SgstAmount,
            it.IgstRate,
            it.IgstAmount,
            it.CessRate,
            it.CessAmount,
            it.TotalAmount,
            it.AttributesJson
        )).ToList();

        var paymentDtos = invoice.Payments.Select(p => new SalesInvoicePaymentDto(
            p.Id,
            p.InvoiceId,
            p.PaymentDate,
            p.Amount,
            p.PaymentMode,
            p.PaymentMode.ToString(),
            p.TransactionReference,
            p.Notes,
            p.CreatedAtUtc
        )).ToList();

        // GST Tax Summary Grouping (by HSN and Rate)
        var taxSummary = invoice.Items
            .GroupBy(it => new { Hsn = it.HsnCode ?? "N/A", it.GstRate })
            .Select(g => new GstTaxSummaryItemDto(
                g.Key.Hsn,
                g.Sum(x => x.TaxableAmount),
                g.Key.GstRate,
                g.Sum(x => x.CgstAmount),
                g.Sum(x => x.SgstAmount),
                g.Sum(x => x.IgstAmount),
                g.Sum(x => x.CgstAmount + x.SgstAmount + x.IgstAmount + x.CessAmount)
            ))
            .ToList();

        var dto = new SalesInvoiceDetailsDto(
            invoice.Id,
            invoice.TenantId,
            invoice.InvoiceNumber,
            invoice.InvoiceType,
            invoice.Status,
            invoice.BranchId,
            invoice.Branch?.BranchName ?? "Main Branch",
            invoice.Branch?.GSTIN ?? "",
            $"{invoice.Branch?.AddressLine1}, {invoice.Branch?.City}",
            invoice.Branch?.StateCode ?? "27",
            invoice.WarehouseId,
            invoice.Warehouse?.WarehouseName ?? "Main Warehouse",
            invoice.PartyId,
            invoice.CustomerName,
            invoice.CustomerPhone,
            invoice.CustomerEmail,
            invoice.CustomerGSTIN,
            invoice.CustomerPAN,
            invoice.BillingAddress,
            invoice.ShippingAddress,
            invoice.BillingStateCode,
            invoice.ShippingStateCode,
            invoice.PlaceOfSupply,
            invoice.InvoiceDate,
            invoice.DueDate,
            invoice.TaxSupplyType,
            invoice.SubTotal,
            invoice.ItemDiscountTotal,
            invoice.InvoiceDiscountPercent,
            invoice.InvoiceDiscountAmount,
            invoice.TaxableAmount,
            invoice.CgstAmount,
            invoice.SgstAmount,
            invoice.IgstAmount,
            invoice.CessAmount,
            invoice.RoundOff,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.BalanceAmount,
            invoice.PrimaryPaymentMode,
            invoice.PaymentStatus,
            invoice.PaymentReferenceNumber,
            invoice.Notes,
            invoice.TermsAndConditions,
            invoice.AttributesJson,
            invoice.TransporterName,
            invoice.TransporterId,
            invoice.VehicleNumber,
            invoice.LrNumber,
            invoice.LrDate,
            invoice.EWayBillNumber,
            invoice.EWayBillDate,
            invoice.PoNumber,
            invoice.PoDate,
            invoice.IsReverseCharge,
            invoice.IsCancelled,
            invoice.CancellationReason,
            invoice.CancelledAtUtc,
            invoice.CreatedAtUtc,
            itemDtos,
            paymentDtos,
            taxSummary
        );

        return Result<SalesInvoiceDetailsDto>.Success(dto);
    }

    public async Task<Result<SalesInvoiceDetailsDto>> GetInvoiceByNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var cleanNumber = invoiceNumber.Trim().ToUpperInvariant();

        var id = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && i.InvoiceNumber == cleanNumber && !i.IsDeleted)
            .Select(i => i.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (id == Guid.Empty)
        {
            return Result<SalesInvoiceDetailsDto>.Failure($"Invoice '{cleanNumber}' not found.", "NOT_FOUND");
        }

        return await GetInvoiceByIdAsync(id, cancellationToken);
    }

    public async Task<Result<Guid>> CreateInvoiceAsync(CreateSalesInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Invoice must contain at least one line item.", "NO_ITEMS");
        }

        // 1. Verify Branch (with fallback)
        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && request.BranchId != Guid.Empty && b.Id == request.BranchId && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result<Guid>.Failure("Branch not found.", "BRANCH_NOT_FOUND");
        }

        var branchId = branch.Id;

        // 2. Verify Warehouse (with fallback)
        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && request.WarehouseId != Guid.Empty && w.Id == request.WarehouseId && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && w.BranchId == branchId && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        if (warehouse == null)
        {
            return Result<Guid>.Failure("Warehouse not found.", "WAREHOUSE_NOT_FOUND");
        }

        var warehouseId = warehouse.Id;

        // Determine GST Supply Type (Intra-State vs Inter-State)
        var branchStateCode = branch.StateCode?.Trim() ?? "27";
        var supplyStateCode = request.BillingStateCode?.Trim() ?? branchStateCode;
        var isIntraState = string.Equals(branchStateCode, supplyStateCode, StringComparison.OrdinalIgnoreCase);
        var taxSupplyType = isIntraState ? TaxSupplyType.IntraState : TaxSupplyType.InterState;
        var invDate = DateTime.SpecifyKind(request.InvoiceDate, DateTimeKind.Utc);
        var fy = GetFinancialYearCode(invDate);
        var prefix = request.InvoiceType switch
        {
            InvoiceType.POSBill => "POS",
            InvoiceType.ProformaInvoice => "PI",
            InvoiceType.SalesEstimate => "EST",
            InvoiceType.CreditNote => "CN",
            InvoiceType.DebitNote => "DN",
            _ => "INV"
        };

        // 3. ⚡ BATCH RETRIEVAL (Zero N+1 DB roundtrips for 2 Lakh scale)
        var itemIds = request.Items.Select(x => x.ItemId).Distinct().ToList();
        var uomIds = request.Items.Select(x => x.UomId).Where(id => id != Guid.Empty).Distinct().ToList();

        var itemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && uomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var existingStocks = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId) && s.WarehouseId == warehouseId && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        var customerName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : "Walk-in Customer";

        // Create Invoice Master Instance
        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "PENDING",
            InvoiceType = request.InvoiceType,
            Status = InvoiceStatus.Issued,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = request.PartyId,
            CustomerName = customerName,
            CustomerPhone = request.CustomerPhone?.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim().ToLowerInvariant(),
            CustomerGSTIN = request.CustomerGSTIN?.Trim().ToUpperInvariant(),
            CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant(),
            BillingAddress = request.BillingAddress?.Trim(),
            ShippingAddress = request.ShippingAddress?.Trim() ?? request.BillingAddress?.Trim(),
            BillingStateCode = supplyStateCode,
            ShippingStateCode = request.ShippingStateCode?.Trim() ?? supplyStateCode,
            PlaceOfSupply = request.PlaceOfSupply?.Trim() ?? (isIntraState ? "Maharashtra" : "Inter-State"),
            InvoiceDate = invDate,
            DueDate = request.DueDate.HasValue ? DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc) : null,
            TaxSupplyType = taxSupplyType,
            InvoiceDiscountPercent = request.InvoiceDiscountPercent,
            PrimaryPaymentMode = request.PrimaryPaymentMode,
            PaymentReferenceNumber = request.PaymentReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            TermsAndConditions = request.TermsAndConditions?.Trim(),
            TransporterName = request.TransporterName?.Trim(),
            TransporterId = request.TransporterId?.Trim().ToUpperInvariant(),
            VehicleNumber = request.VehicleNumber?.Trim().ToUpperInvariant(),
            LrNumber = request.LrNumber?.Trim(),
            LrDate = request.LrDate.HasValue ? DateTime.SpecifyKind(request.LrDate.Value, DateTimeKind.Utc) : null,
            EWayBillNumber = request.EWayBillNumber?.Trim(),
            EWayBillDate = request.EWayBillDate.HasValue ? DateTime.SpecifyKind(request.EWayBillDate.Value, DateTimeKind.Utc) : null,
            PoNumber = request.PoNumber?.Trim(),
            PoDate = request.PoDate.HasValue ? DateTime.SpecifyKind(request.PoDate.Value, DateTimeKind.Utc) : null,
            IsReverseCharge = request.IsReverseCharge,
            AttributesJson = request.AttributesJson ?? "{}",
            IsCancelled = false
        };

        decimal subTotal = 0m;
        decimal itemDiscountTotal = 0m;
        decimal totalTaxable = 0m;
        decimal totalCgst = 0m;
        decimal totalSgst = 0m;
        decimal totalIgst = 0m;
        decimal totalCess = 0m;

        // Process line items & in-memory stock mutations
        foreach (var reqItem in request.Items)
        {
            if (!itemsDict.TryGetValue(reqItem.ItemId, out var item))
            {
                return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            string uomCode = "UNIT";
            if (uomsDict.TryGetValue(reqItem.UomId, out var uom))
            {
                uomCode = uom.Code ?? "UNIT";
            }

            bool shouldDepleteStock = item.ItemType != ItemType.Service && item.TrackInventory;
            if (shouldDepleteStock)
            {
                var stock = existingStocks.FirstOrDefault(s => s.ItemId == reqItem.ItemId && 
                    (!reqItem.BatchId.HasValue || reqItem.BatchId.Value == Guid.Empty || s.BatchId == reqItem.BatchId.Value));

                decimal beforeQty = 0m;
                if (stock == null)
                {
                    stock = new ItemWarehouseStock
                    {
                        TenantId = tenantId,
                        ItemId = item.Id,
                        WarehouseId = warehouseId,
                        BatchId = reqItem.BatchId,
                        CurrentQuantity = -reqItem.Quantity,
                        ReservedQuantity = 0
                    };
                    _context.ItemWarehouseStocks.Add(stock);
                    existingStocks.Add(stock);
                }
                else
                {
                    beforeQty = stock.CurrentQuantity;
                    stock.CurrentQuantity -= reqItem.Quantity;
                }

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    WarehouseId = warehouseId,
                    BatchId = reqItem.BatchId,
                    MovementType = StockMovementType.SalesOutward,
                    Quantity = -reqItem.Quantity,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.PurchasePrice,
                    TotalCost = item.PurchasePrice * reqItem.Quantity,
                    ReferenceDocumentType = "SalesInvoice",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Notes = $"Sales outward to {customerName}"
                };
                _context.StockMovements.Add(movement);
            }

            var gross = reqItem.Quantity * reqItem.UnitPrice;
            var discAmt = reqItem.DiscountAmount > 0 
                ? reqItem.DiscountAmount 
                : (reqItem.DiscountPercent > 0 ? Math.Round(gross * (reqItem.DiscountPercent / 100m), 4) : 0m);
            var taxable = Math.Max(0m, gross - discAmt);

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
            var itemMrp = reqItem.Mrp > 0 ? reqItem.Mrp : item.MRP;

            subTotal += gross;
            itemDiscountTotal += discAmt;
            totalTaxable += taxable;
            totalCgst += cgstAmt;
            totalSgst += sgstAmt;
            totalIgst += igstAmt;
            totalCess += cessAmt;

            string batchNo = reqItem.BatchNumber;
            DateTime? expiryDate = reqItem.ExpiryDate.HasValue 
                ? DateTime.SpecifyKind(reqItem.ExpiryDate.Value, DateTimeKind.Utc) 
                : null;

            var itemAttrs = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(reqItem.AttributesJson) && reqItem.AttributesJson != "{}")
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(reqItem.AttributesJson);
                    if (parsed != null)
                    {
                        foreach (var kvp in parsed) itemAttrs[kvp.Key] = kvp.Value;
                    }
                }
                catch { }
            }
            if (reqItem.FreeQuantity > 0) itemAttrs["freeQuantity"] = reqItem.FreeQuantity;
            if (!string.IsNullOrWhiteSpace(reqItem.Packing)) itemAttrs["packing"] = reqItem.Packing;

            var lineItem = new SalesInvoiceItem
            {
                TenantId = tenantId,
                Invoice = invoice,
                ItemId = item.Id,
                ItemSku = item.Sku,
                ItemName = item.Name,
                HsnCode = !string.IsNullOrWhiteSpace(reqItem.HsnCode) ? reqItem.HsnCode : item.HSNCode,
                Barcode = item.Barcode,
                BatchId = reqItem.BatchId,
                BatchNumber = batchNo,
                ExpiryDate = expiryDate,
                Quantity = reqItem.Quantity,
                UomId = reqItem.UomId,
                UomCode = uomCode,
                UnitPrice = reqItem.UnitPrice,
                Mrp = itemMrp,
                PurchasePrice = item.PurchasePrice,
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
                AttributesJson = System.Text.Json.JsonSerializer.Serialize(itemAttrs)
            };

            invoice.Items.Add(lineItem);
        }

        // Invoice Discount
        decimal invDiscountAmount = 0m;
        if (request.InvoiceDiscountPercent > 0)
        {
            invDiscountAmount = Math.Round(totalTaxable * (request.InvoiceDiscountPercent / 100m), 4);
            totalTaxable -= invDiscountAmount;
        }

        var grossTotalWithTax = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
        var roundedTotal = Math.Round(grossTotalWithTax, 0, MidpointRounding.AwayFromZero);
        var roundOff = roundedTotal - grossTotalWithTax;

        invoice.SubTotal = subTotal;
        invoice.ItemDiscountTotal = itemDiscountTotal;
        invoice.InvoiceDiscountAmount = invDiscountAmount;
        invoice.TaxableAmount = totalTaxable;
        invoice.CgstAmount = totalCgst;
        invoice.SgstAmount = totalSgst;
        invoice.IgstAmount = totalIgst;
        invoice.CessAmount = totalCess;
        invoice.RoundOff = roundOff;
        invoice.TotalAmount = roundedTotal;

        // Payment Handling
        decimal paid = Math.Min(Math.Max(0m, request.PaidAmount), roundedTotal);
        if (request.PrimaryPaymentMode == PaymentMode.CreditAccount)
        {
            paid = 0m;
        }

        invoice.PaidAmount = paid;
        invoice.BalanceAmount = roundedTotal - paid;
        invoice.PaymentStatus = invoice.BalanceAmount == 0 
            ? PaymentStatus.FullyPaid 
            : (paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);

        invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

        if (paid > 0)
        {
            invoice.Payments.Add(new SalesInvoicePayment
            {
                TenantId = tenantId,
                Invoice = invoice,
                PaymentDate = invDate,
                Amount = paid,
                PaymentMode = request.PrimaryPaymentMode,
                TransactionReference = request.PaymentReferenceNumber,
                Notes = "Initial payment on invoice generation"
            });
        }

        _context.SalesInvoices.Add(invoice);

        // Party Financial Ledger Integration
        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
        {
            var party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                var debitBalance = party.CurrentOutstandingBalance + roundedTotal;
                party.CurrentOutstandingBalance = debitBalance;

                var invoiceLedger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = invDate,
                    EntryType = PartyLedgerEntryType.SalesInvoice,
                    DebitAmount = roundedTotal,
                    CreditAmount = 0m,
                    RunningBalance = debitBalance,
                    ReferenceDocumentType = "SalesInvoice",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Description = $"Sales Invoice (Due: {invoice.DueDate:d})"
                };
                _context.PartyLedgerEntries.Add(invoiceLedger);

                if (paid > 0)
                {
                    var creditBalance = party.CurrentOutstandingBalance - paid;
                    party.CurrentOutstandingBalance = creditBalance;

                    var paymentLedger = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = invDate,
                        EntryType = PartyLedgerEntryType.PaymentReceipt,
                        DebitAmount = 0m,
                        CreditAmount = paid,
                        RunningBalance = creditBalance,
                        ReferenceDocumentType = "PaymentReceipt",
                        ReferenceDocumentId = invoice.Id,
                        ReferenceDocumentNumber = invoice.InvoiceNumber,
                        PaymentMode = request.PrimaryPaymentMode.ToString(),
                        Description = $"Payment received"
                    };
                    _context.PartyLedgerEntries.Add(paymentLedger);
                }
            }
        }

        await AutoPostInvoiceToGeneralLedgerAsync(invoice, cancellationToken);

        // 4. ⚡ RESILIENT CONCURRENCY SEQUENCE ALLOCATION (2 Lakh Users Scale)
        var semaphore = _tenantInvoiceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        try
        {
            var lastNumber = await _context.SalesInvoices
                .Where(i => i.TenantId == tenantId && i.InvoiceNumber.StartsWith($"{prefix}-{fy}-"))
                .OrderByDescending(i => i.InvoiceNumber)
                .Select(i => i.InvoiceNumber)
                .FirstOrDefaultAsync(cancellationToken);

            int nextNum = 1;
            if (!string.IsNullOrEmpty(lastNumber))
            {
                var parts = lastNumber.Split('-');
                if (parts.Length >= 3 && int.TryParse(parts[^1], out int parsedNum))
                {
                    nextNum = parsedNum + 1;
                }
                else
                {
                    var count = await _context.SalesInvoices
                        .CountAsync(i => i.TenantId == tenantId && i.InvoiceNumber.StartsWith($"{prefix}-{fy}-"), cancellationToken);
                    nextNum = count + 1;
                }
            }
            else
            {
                var count = await _context.SalesInvoices
                    .CountAsync(i => i.TenantId == tenantId && i.InvoiceNumber.StartsWith($"{prefix}-{fy}-"), cancellationToken);
                nextNum = count + 1;
            }

            var currentNumber = $"{prefix}-{fy}-{nextNum:D5}";
            invoice.InvoiceNumber = currentNumber;

            // Sync ReferenceDocumentNumber on child entities
            foreach (var m in _context.ChangeTracker.Entries<StockMovement>().Where(e => e.Entity.ReferenceDocumentId == invoice.Id))
            {
                m.Entity.ReferenceDocumentNumber = currentNumber;
            }
            foreach (var l in _context.ChangeTracker.Entries<PartyLedgerEntry>().Where(e => e.Entity.ReferenceDocumentId == invoice.Id))
            {
                l.Entity.ReferenceDocumentNumber = currentNumber;
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            semaphore.Release();
        }

        _ = _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateSalesInvoice",
            EntityName = "SalesInvoice",
            EntityId = invoice.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { invoice.InvoiceNumber, invoice.CustomerName, invoice.TotalAmount }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(invoice.Id);
    }

    public async Task<Result<Guid>> RecordInvoicePaymentAsync(RecordInvoicePaymentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<Guid>.Failure("Payment amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var invoice = await _context.SalesInvoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.InvoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<Guid>.Failure("Invoice not found.", "NOT_FOUND");
        }

        if (invoice.IsCancelled)
        {
            return Result<Guid>.Failure("Cannot accept payment for cancelled invoice.", "INVOICE_CANCELLED");
        }

        if (invoice.BalanceAmount <= 0)
        {
            return Result<Guid>.Failure("Invoice is already fully paid.", "ALREADY_PAID");
        }

        var payable = Math.Min(request.Amount, invoice.BalanceAmount);
        var payDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc);

        var payment = new SalesInvoicePayment
        {
            TenantId = tenantId,
            InvoiceId = invoice.Id,
            PaymentDate = payDate,
            Amount = payable,
            PaymentMode = request.PaymentMode,
            TransactionReference = request.TransactionReference?.Trim(),
            Notes = request.Notes?.Trim()
        };

        invoice.PaidAmount += payable;
        invoice.BalanceAmount = invoice.TotalAmount - invoice.PaidAmount;
        invoice.PaymentStatus = invoice.BalanceAmount == 0 ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
        invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

        _context.SalesInvoicePayments.Add(payment);

        // Sync Customer Ledger
        if (invoice.PartyId.HasValue)
        {
            var party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == invoice.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                var newBal = party.CurrentOutstandingBalance - payable;
                party.CurrentOutstandingBalance = newBal;

                var ledger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = payDate,
                    EntryType = PartyLedgerEntryType.PaymentReceipt,
                    DebitAmount = 0m,
                    CreditAmount = payable,
                    RunningBalance = newBal,
                    ReferenceDocumentType = "PaymentReceipt",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    PaymentMode = request.PaymentMode.ToString(),
                    Description = request.Notes ?? $"Payment against Invoice {invoice.InvoiceNumber}"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordInvoicePayment",
            EntityName = "SalesInvoicePayment",
            EntityId = payment.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { invoice.InvoiceNumber, request.Amount, request.PaymentMode }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(payment.Id);
    }

    public async Task<Result> CancelInvoiceAsync(Guid invoiceId, CancelInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result.Failure("Invoice not found.", "NOT_FOUND");
        }

        if (invoice.IsCancelled)
        {
            return Result.Failure("Invoice is already cancelled.", "ALREADY_CANCELLED");
        }

        // Restore Warehouse Stock
        foreach (var item in invoice.Items)
        {
            var stockQuery = _context.ItemWarehouseStocks
                .Where(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.WarehouseId == invoice.WarehouseId && !s.IsDeleted);

            if (item.BatchId.HasValue)
            {
                stockQuery = stockQuery.Where(s => s.BatchId == item.BatchId.Value);
            }

            var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
            if (stock != null)
            {
                var beforeQty = stock.CurrentQuantity;
                stock.CurrentQuantity += item.Quantity;

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.ItemId,
                    WarehouseId = invoice.WarehouseId,
                    BatchId = item.BatchId,
                    MovementType = StockMovementType.TransferIn,
                    Quantity = item.Quantity,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.PurchasePrice,
                    TotalCost = item.PurchasePrice * item.Quantity,
                    ReferenceDocumentType = "InvoiceCancellation",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Notes = $"Stock restored on invoice cancellation: {request.CancellationReason}"
                };
                _context.StockMovements.Add(movement);
            }
        }

        // Reverse Party Ledger entries if party exists
        if (invoice.PartyId.HasValue)
        {
            var party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == invoice.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                // Reverse unpaid balance (or full invoice minus what was paid)
                var netAdjustment = -(invoice.TotalAmount - invoice.PaidAmount);
                var newBal = party.CurrentOutstandingBalance + netAdjustment;
                party.CurrentOutstandingBalance = newBal;

                var ledger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = PartyLedgerEntryType.CreditNote,
                    DebitAmount = 0m,
                    CreditAmount = invoice.TotalAmount,
                    RunningBalance = newBal,
                    ReferenceDocumentType = "InvoiceCancellation",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Description = $"Reversal for Cancelled Invoice {invoice.InvoiceNumber}: {request.CancellationReason}"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }
        }

        invoice.IsCancelled = true;
        invoice.Status = InvoiceStatus.Cancelled;
        invoice.CancellationReason = request.CancellationReason.Trim();
        invoice.CancelledAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "CancelSalesInvoice",
            EntityName = "SalesInvoice",
            EntityId = invoice.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { invoice.InvoiceNumber, request.CancellationReason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #region Sales Returns & Credit Notes

    public async Task<Result<PagedResult<SalesReturnDto>>> GetSalesReturnsAsync(
        int pageNumber,
        int pageSize,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.SalesReturns
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
            query = query.Where(r => r.CreditNoteNumber.ToLower().Contains(term) ||
                                     r.CustomerName.ToLower().Contains(term) ||
                                     (r.OriginalInvoiceNumber != null && r.OriginalInvoiceNumber.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var returns = await query
            .OrderByDescending(r => r.ReturnDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new SalesReturnDto(
                r.Id,
                r.CreditNoteNumber,
                r.ReturnDate,
                r.OriginalSalesInvoiceId,
                r.OriginalInvoiceNumber,
                r.PartyId,
                r.CustomerName,
                r.BranchId,
                r.WarehouseId,
                r.ReturnReason,
                r.RestockToWarehouse,
                r.SubTotal,
                r.TaxAmount,
                r.TotalAmount,
                r.Notes,
                r.IsCancelled,
                r.CreatedAtUtc,
                r.Items.Select(i => new SalesReturnItemDto(
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

        return Result<PagedResult<SalesReturnDto>>.Success(new PagedResult<SalesReturnDto>(returns, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<SalesReturnDto>> GetSalesReturnByIdAsync(Guid returnId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var r = await _context.SalesReturns
            .Include(x => x.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == returnId && !x.IsDeleted, cancellationToken);

        if (r == null)
            return Result<SalesReturnDto>.Failure("Sales return record not found.", "NOT_FOUND");

        var dto = new SalesReturnDto(
            r.Id,
            r.CreditNoteNumber,
            r.ReturnDate,
            r.OriginalSalesInvoiceId,
            r.OriginalInvoiceNumber,
            r.PartyId,
            r.CustomerName,
            r.BranchId,
            r.WarehouseId,
            r.ReturnReason,
            r.RestockToWarehouse,
            r.SubTotal,
            r.TaxAmount,
            r.TotalAmount,
            r.Notes,
            r.IsCancelled,
            r.CreatedAtUtc,
            r.Items.Select(i => new SalesReturnItemDto(
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

        return Result<SalesReturnDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateSalesReturnAsync(CreateSalesReturnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
            return Result<Guid>.Failure("At least one item must be returned.", "VALIDATION_ERROR");

        // Resolve branch & warehouse fallback
        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && request.BranchId != Guid.Empty && b.Id == request.BranchId && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        var branchId = branch?.Id ?? request.BranchId;

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && request.WarehouseId != Guid.Empty && w.Id == request.WarehouseId && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && w.BranchId == branchId && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        var warehouseId = warehouse?.Id ?? request.WarehouseId;

        string customerName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : "Walk-in Customer";
        if (request.PartyId != Guid.Empty && customerName == "Walk-in Customer")
        {
            var party = await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);
            if (party != null) customerName = party.LegalName;
        }

        var count = await _context.SalesReturns.CountAsync(r => r.TenantId == tenantId, cancellationToken) + 1;
        var creditNoteNumber = $"CN-{DateTime.UtcNow:yyMM}-{count:D5}";

        decimal subTotal = 0m;
        decimal taxTotal = 0m;

        var salesReturn = new SalesReturn
        {
            TenantId = tenantId,
            CreditNoteNumber = creditNoteNumber,
            ReturnDate = DateTimeOffset.UtcNow,
            OriginalSalesInvoiceId = request.OriginalSalesInvoiceId,
            OriginalInvoiceNumber = request.OriginalInvoiceNumber,
            PartyId = request.PartyId,
            CustomerName = customerName,
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = request.ReturnReason ?? "Customer Return",
            RestockToWarehouse = request.RestockToWarehouse,
            Notes = request.Notes
        };

        foreach (var line in request.Items)
        {
            var lineTaxable = line.ReturnQuantity * line.UnitPrice;
            var lineTax = lineTaxable * (line.GstRate / 100m);
            var lineTotal = lineTaxable + lineTax;

            subTotal += lineTaxable;
            taxTotal += lineTax;

            salesReturn.Items.Add(new SalesReturnItem
            {
                TenantId = tenantId,
                ItemId = line.ItemId,
                ItemName = line.ItemName ?? "Item",
                ItemSku = line.ItemSku ?? "",
                BatchId = line.BatchId,
                BatchNumber = line.BatchNumber,
                ReturnQuantity = line.ReturnQuantity,
                UnitPrice = line.UnitPrice,
                GstRate = line.GstRate,
                TotalAmount = lineTotal
            });

            // Restock to Warehouse
            if (request.RestockToWarehouse && warehouseId != Guid.Empty)
            {
                var stock = await _context.ItemWarehouseStocks
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == warehouseId && !s.IsDeleted, cancellationToken);

                if (stock == null)
                {
                    stock = new ItemWarehouseStock
                    {
                        TenantId = tenantId,
                        ItemId = line.ItemId,
                        WarehouseId = warehouseId,
                        BatchId = line.BatchId,
                        CurrentQuantity = line.ReturnQuantity
                    };
                    _context.ItemWarehouseStocks.Add(stock);
                }
                else
                {
                    stock.CurrentQuantity += line.ReturnQuantity;
                }

                _context.StockMovements.Add(new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = line.ItemId,
                    WarehouseId = warehouseId,
                    BatchId = line.BatchId,
                    MovementType = StockMovementType.SalesReturn,
                    Quantity = line.ReturnQuantity,
                    QuantityBefore = (stock?.CurrentQuantity ?? 0) - line.ReturnQuantity,
                    QuantityAfter = stock?.CurrentQuantity ?? line.ReturnQuantity,
                    UnitCost = line.UnitPrice,
                    TotalCost = lineTaxable,
                    ReferenceDocumentType = "CreditNote",
                    ReferenceDocumentId = salesReturn.Id,
                    ReferenceDocumentNumber = creditNoteNumber,
                    Notes = $"Restock from Sales Return {creditNoteNumber}"
                });
            }
        }

        salesReturn.SubTotal = subTotal;
        salesReturn.TaxAmount = taxTotal;
        salesReturn.TotalAmount = Math.Round(subTotal + taxTotal, 2);

        _context.SalesReturns.Add(salesReturn);

        // Adjust Party Ledger if party exists
        if (request.PartyId != Guid.Empty)
        {
            var party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                var newBal = party.CurrentOutstandingBalance - salesReturn.TotalAmount;
                party.CurrentOutstandingBalance = newBal;

                var ledger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = PartyLedgerEntryType.CreditNote,
                    DebitAmount = 0m,
                    CreditAmount = salesReturn.TotalAmount,
                    RunningBalance = newBal,
                    ReferenceDocumentType = "CreditNote",
                    ReferenceDocumentId = salesReturn.Id,
                    ReferenceDocumentNumber = creditNoteNumber,
                    Description = $"Credit Note for Sales Return {creditNoteNumber}"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }
        }

        await AutoPostSalesReturnToGeneralLedgerAsync(salesReturn, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        _ = _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateSalesReturn",
            EntityName = "SalesReturn",
            EntityId = salesReturn.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { salesReturn.CreditNoteNumber, salesReturn.TotalAmount }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(salesReturn.Id);
    }

    private async Task AutoPostInvoiceToGeneralLedgerAsync(SalesInvoice invoice, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = invoice.TenantId;
            var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
            var revAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-REV", "Direct Sales Revenue", "GRP-REV", "Direct Sales Revenue", "Revenue", "Credit", cancellationToken);
            var cgstAccount = invoice.CgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-OUT", "Output CGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
            var sgstAccount = invoice.SgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-OUT", "Output SGST/UTGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
            var igstAccount = invoice.IgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-OUT", "Output IGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
            var roundOffAccount = invoice.RoundOff != 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-ROUNDOFF", "Invoice Round Off", "GRP-EXP", "Indirect Expenses", "Expense", "Debit", cancellationToken) : null;

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-INV-{invoice.InvoiceNumber}",
                VoucherDate = invoice.InvoiceDate,
                VoucherType = "Journal",
                ReferenceNumber = invoice.InvoiceNumber,
                TotalDebit = invoice.TotalAmount,
                TotalCredit = invoice.TotalAmount,
                Narration = $"Auto-posted sales invoice {invoice.InvoiceNumber} to {invoice.CustomerName}",
                CreatedByName = "System Auto-Posting"
            };

            // Leg 1: Debit AR
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = arAccount.Id,
                DebitAmount = invoice.TotalAmount,
                CreditAmount = 0,
                Narration = $"Debit receivable for {invoice.CustomerName}"
            });
            arAccount.CurrentBalance += invoice.TotalAmount;

            // Leg 2: Credit Sales Revenue
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = revAccount.Id,
                DebitAmount = 0,
                CreditAmount = invoice.TaxableAmount,
                Narration = $"Sales revenue from invoice {invoice.InvoiceNumber}"
            });
            revAccount.CurrentBalance += invoice.TaxableAmount;

            // Leg 3: Credit Output CGST
            if (cgstAccount != null && invoice.CgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cgstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = invoice.CgstAmount,
                    Narration = $"Output CGST liability on invoice {invoice.InvoiceNumber}"
                });
                cgstAccount.CurrentBalance += invoice.CgstAmount;
            }

            // Leg 4: Credit Output SGST
            if (sgstAccount != null && invoice.SgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = sgstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = invoice.SgstAmount,
                    Narration = $"Output SGST liability on invoice {invoice.InvoiceNumber}"
                });
                sgstAccount.CurrentBalance += invoice.SgstAmount;
            }

            // Leg 5: Credit Output IGST
            if (igstAccount != null && invoice.IgstAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = igstAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = invoice.IgstAmount,
                    Narration = $"Output IGST liability on invoice {invoice.InvoiceNumber}"
                });
                igstAccount.CurrentBalance += invoice.IgstAmount;
            }

            // Leg 6: Round Off
            if (roundOffAccount != null && invoice.RoundOff != 0)
            {
                if (invoice.RoundOff > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = invoice.RoundOff,
                        Narration = "Positive round off"
                    });
                    roundOffAccount.CurrentBalance -= invoice.RoundOff;
                }
                else
                {
                    var absRound = Math.Abs(invoice.RoundOff);
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = roundOffAccount.Id,
                        DebitAmount = absRound,
                        CreditAmount = 0,
                        Narration = "Negative round off"
                    });
                    roundOffAccount.CurrentBalance += absRound;
                }
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AccountingAutoPost] Warning: Could not auto-post invoice {invoice.InvoiceNumber}: {ex.Message}");
        }
    }

    private async Task AutoPostSalesReturnToGeneralLedgerAsync(SalesReturn salesReturn, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = salesReturn.TenantId;
            var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
            var retAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-RET", "Sales Returns & Allowances", "GRP-REV", "Direct Sales Revenue", "Revenue", "Debit", cancellationToken);
            var taxAccount = salesReturn.TaxAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-TAX-OUT", "Output GST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-CN-{salesReturn.CreditNoteNumber}",
                VoucherDate = salesReturn.ReturnDate,
                VoucherType = "CreditNote",
                ReferenceNumber = salesReturn.CreditNoteNumber,
                TotalDebit = salesReturn.TotalAmount,
                TotalCredit = salesReturn.TotalAmount,
                Narration = $"Auto-posted Credit Note {salesReturn.CreditNoteNumber} for sales return",
                CreatedByName = "System Auto-Posting"
            };

            // Leg 1: Debit Sales Return
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = retAccount.Id,
                DebitAmount = salesReturn.SubTotal,
                CreditAmount = 0,
                Narration = $"Sales return adjustment for {salesReturn.CreditNoteNumber}"
            });
            retAccount.CurrentBalance += salesReturn.SubTotal;

            // Leg 2: Debit Output GST Reversal
            if (taxAccount != null && salesReturn.TaxAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = taxAccount.Id,
                    DebitAmount = salesReturn.TaxAmount,
                    CreditAmount = 0,
                    Narration = "Output GST tax reversal on sales return"
                });
                taxAccount.CurrentBalance -= salesReturn.TaxAmount;
            }

            // Leg 3: Credit AR
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = arAccount.Id,
                DebitAmount = 0,
                CreditAmount = salesReturn.TotalAmount,
                Narration = $"Credit customer receivable on Credit Note {salesReturn.CreditNoteNumber}"
            });
            arAccount.CurrentBalance -= salesReturn.TotalAmount;

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AccountingAutoPost] Warning: Could not auto-post credit note {salesReturn.CreditNoteNumber}: {ex.Message}");
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
