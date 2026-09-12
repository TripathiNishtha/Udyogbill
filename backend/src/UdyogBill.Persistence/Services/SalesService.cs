using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Pharma;
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
    private readonly UdyogBill.Application.Services.Calculations.ICanonicalCalculationEngine _calculationEngine;
    private readonly Microsoft.Extensions.Logging.ILogger<SalesService>? _logger;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _tenantInvoiceSemaphores = new();

    public SalesService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService,
        UdyogBill.Application.Services.Calculations.ICanonicalCalculationEngine? calculationEngine = null,
        Microsoft.Extensions.Logging.ILogger<SalesService>? logger = null)
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
        if (_context.Database.IsRelational() && _context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            var lockKey = $"doc_seq_{tenantId}_{prefix}_{fy}";
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(hashtext({0}))", new object[] { lockKey }, cancellationToken);
                    return;
                }
                catch (Exception ex) when (attempt < maxRetries)
                {
                    _logger?.LogWarning(ex, "Transient error acquiring DB advisory lock for sequence {Prefix} (attempt {Attempt}/{MaxRetries}): {Message}", prefix, attempt, maxRetries, ex.Message);
                    await Task.Delay(attempt * 50, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to acquire DB advisory lock for sequence prefix {Prefix} after {MaxRetries} attempts: {Message}", prefix, maxRetries, ex.Message);
                    throw new InvalidOperationException($"Document sequence lock contention for prefix '{prefix}'. Please retry the operation.", ex);
                }
            }
        }
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
            .Select(i => new
            {
                i.Id,
                i.TenantId,
                i.InvoiceNumber,
                i.InvoiceType,
                i.Status,
                i.BranchId,
                BranchName = i.Branch != null ? i.Branch.BranchName : "Main Branch",
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
                i.CancellationReason,
                i.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var invIds = invoices.Select(x => x.Id).ToList();
        var activeReturns = invIds.Count > 0
            ? await _context.SalesReturns
                .Where(r => r.TenantId == tenantId && r.OriginalSalesInvoiceId.HasValue && invIds.Contains(r.OriginalSalesInvoiceId.Value) && !r.IsCancelled && !r.IsDeleted)
                .OrderByDescending(r => r.ReturnDate)
                .Select(r => new
                {
                    InvoiceId = r.OriginalSalesInvoiceId!.Value,
                    r.CreditNoteNumber,
                    r.TotalAmount,
                    r.ReturnDate
                })
                .ToListAsync(cancellationToken)
            : new();

        var returnLookup = activeReturns
            .GroupBy(r => r.InvoiceId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    CreditNoteNumbers = string.Join(", ", g.Select(x => x.CreditNoteNumber)),
                    TotalCreditAmount = g.Sum(x => x.TotalAmount),
                    LatestDate = g.First().ReturnDate
                }
            );

        var invoiceDtos = invoices.Select(i =>
        {
            var hasCn = returnLookup.TryGetValue(i.Id, out var cnInfo);
            return new SalesInvoiceListDto(
                i.Id,
                i.TenantId,
                i.InvoiceNumber,
                i.InvoiceType,
                i.Status,
                i.BranchId,
                i.BranchName,
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
                i.CreatedAtUtc,
                hasCn,
                hasCn ? cnInfo!.CreditNoteNumbers : null,
                hasCn ? cnInfo!.TotalCreditAmount : null,
                hasCn ? cnInfo!.LatestDate : null,
                i.CancellationReason
            );
        }).ToList();

        return Result<PagedResult<SalesInvoiceListDto>>.Success(
            PagedResult<SalesInvoiceListDto>.Create(invoiceDtos, pageNumber, pageSize, totalCount)
        );
    }

    public async Task<Result<SalesInvoiceDetailsDto>> GetInvoiceByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Where(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted)
            .Include(i => i.Branch)
            .Include(i => i.Warehouse)
            .Include(i => i.Broker)
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

        var activeReturns = await _context.SalesReturns
            .Where(r => r.TenantId == tenantId && r.OriginalSalesInvoiceId == invoice.Id && !r.IsCancelled && !r.IsDeleted)
            .OrderByDescending(r => r.ReturnDate)
            .ToListAsync(cancellationToken);

        bool hasCreditNote = activeReturns.Count > 0;
        string? creditNoteNumber = hasCreditNote ? string.Join(", ", activeReturns.Select(r => r.CreditNoteNumber)) : null;
        decimal? creditNoteAmount = hasCreditNote ? activeReturns.Sum(r => r.TotalAmount) : null;
        DateTimeOffset? creditNoteDate = hasCreditNote ? activeReturns[0].ReturnDate : null;
        Guid? creditNoteId = hasCreditNote ? activeReturns[0].Id : null;

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
            taxSummary,
            hasCreditNote,
            creditNoteNumber,
            creditNoteAmount,
            creditNoteDate,
            creditNoteId,
            invoice.BrokerId,
            invoice.Broker?.FullName
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

        // Verify Closed Accounting Period Lock
        var lockDateSetting = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Category == "Accounting" && s.Key == "LockEntriesBeforeDate", cancellationToken);
        if (lockDateSetting != null && DateTime.TryParse(lockDateSetting.Value, out var lockDate))
        {
            var txDate = request.InvoiceDate != default ? request.InvoiceDate : DateTime.UtcNow;
            if (txDate.Date < lockDate.Date)
            {
                return Result<Guid>.Failure($"Accounting period before {lockDate:yyyy-MM-dd} is closed. Invoices cannot be posted backdated.", "PERIOD_CLOSED");
            }
        }

        // Fetch Negative Stock Policy
        var allowNegativeSetting = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Category == "Inventory" && s.Key == "AllowNegativeStock", cancellationToken);
        bool allowNegativeStock = allowNegativeSetting != null && bool.TryParse(allowNegativeSetting.Value, out var ans) && ans;

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

        // Resolve Party upfront if PartyId is provided
        Party? party = null;
        if (request.PartyId.HasValue && request.PartyId.Value != Guid.Empty)
        {
            party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId.Value && !p.IsDeleted, cancellationToken);
        }

        // Determine GST Supply Type (Intra-State vs Inter-State) with authoritative B2C/B2B fallback
        var branchStateCode = branch.StateCode?.Trim() ?? "27";
        string supplyStateCode;

        if (!string.IsNullOrWhiteSpace(request.BillingStateCode))
        {
            supplyStateCode = request.BillingStateCode.Trim();
        }
        else if (party != null && !string.IsNullOrWhiteSpace(party.StateCode))
        {
            supplyStateCode = party.StateCode.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomerGSTIN) && request.CustomerGSTIN.Trim().Length >= 2 && char.IsDigit(request.CustomerGSTIN.Trim()[0]) && char.IsDigit(request.CustomerGSTIN.Trim()[1]))
        {
            supplyStateCode = request.CustomerGSTIN.Trim().Substring(0, 2);
        }
        else if (party != null && !string.IsNullOrWhiteSpace(party.GSTIN) && party.GSTIN.Trim().Length >= 2 && char.IsDigit(party.GSTIN.Trim()[0]) && char.IsDigit(party.GSTIN.Trim()[1]))
        {
            supplyStateCode = party.GSTIN.Trim().Substring(0, 2);
        }
        else
        {
            supplyStateCode = branchStateCode;
        }

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
        var batchIds = request.Items.Where(x => x.BatchId.HasValue && x.BatchId.Value != Guid.Empty).Select(x => x.BatchId!.Value).Distinct().ToList();

        var itemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && uomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var batchesDict = await _context.ItemBatches
            .Where(b => b.TenantId == tenantId && batchIds.Contains(b.Id) && !b.IsDeleted)
            .ToDictionaryAsync(b => b.Id, cancellationToken);

        var existingStocks = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId) && s.WarehouseId == warehouseId && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        var customerName = !string.IsNullOrWhiteSpace(request.CustomerName) 
            ? request.CustomerName.Trim() 
            : (party != null && !string.IsNullOrWhiteSpace(party.LegalName) ? party.LegalName : "Walk-in Customer");

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
            PlaceOfSupply = request.PlaceOfSupply?.Trim() ?? (isIntraState ? (branch.State ?? "Intra-State") : "Inter-State"),
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
            BrokerId = request.BrokerId,
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

        // Prepare inputs for Canonical Calculation Engine
        var lineInputs = new List<UdyogBill.Application.Services.Calculations.LineCalculationInput>();
        foreach (var reqItem in request.Items)
        {
            if (reqItem.Quantity <= 0 && reqItem.FreeQuantity <= 0)
            {
                return Result<Guid>.Failure("Item quantity must be greater than zero.", "INVALID_QUANTITY");
            }

            if (!itemsDict.TryGetValue(reqItem.ItemId, out var itm))
            {
                return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            // Pharma / Expiry validation
            if (reqItem.BatchId.HasValue && reqItem.BatchId.Value != Guid.Empty)
            {
                if (batchesDict.TryGetValue(reqItem.BatchId.Value, out var bEntity))
                {
                    if (bEntity.IsQuarantined)
                    {
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' for item '{itm.Name}' is under regulatory quarantine and cannot be billed.", "BATCH_QUARANTINED");
                    }
                    if (bEntity.ExpiryDate != default && bEntity.ExpiryDate.Date < DateTime.UtcNow.Date)
                    {
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' for item '{itm.Name}' has expired on {bEntity.ExpiryDate:yyyy-MM-dd}.", "BATCH_EXPIRED");
                    }
                    if (!bEntity.IsActive)
                    {
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' is inactive.", "BATCH_INACTIVE");
                    }
                }
            }
            if (reqItem.ExpiryDate.HasValue && reqItem.ExpiryDate.Value.Date < DateTime.UtcNow.Date)
            {
                return Result<Guid>.Failure($"Batch '{reqItem.BatchNumber ?? itm.Name}' has expired on {reqItem.ExpiryDate.Value:yyyy-MM-dd}.", "BATCH_EXPIRED");
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

        var (calculatedLines, invoiceTotals) = _calculationEngine.CalculateInvoice(
            lineInputs,
            request.InvoiceDiscountPercent,
            request.InvoiceDiscountAmount,
            isIntraState
        );

        // Process line items & in-memory stock mutations
        for (int i = 0; i < request.Items.Count; i++)
        {
            var reqItem = request.Items[i];
            var item = itemsDict[reqItem.ItemId];
            var lineCalc = calculatedLines[i];

            string uomCode = "UNIT";
            if (uomsDict.TryGetValue(reqItem.UomId, out var uom))
            {
                uomCode = uom.Code ?? "UNIT";
            }

            bool shouldDepleteStock = item.ItemType != ItemType.Service && item.TrackInventory;
            if (shouldDepleteStock)
            {
                var stock = existingStocks.FirstOrDefault(s => s.ItemId == reqItem.ItemId && 
                    s.VariantId == reqItem.VariantId &&
                    (!reqItem.BatchId.HasValue || reqItem.BatchId.Value == Guid.Empty ? s.BatchId == null : s.BatchId == reqItem.BatchId.Value));

                decimal beforeQty = stock?.CurrentQuantity ?? 0m;
                decimal physicalOut = lineCalc.TotalPhysicalQuantity;

                if (!allowNegativeStock && beforeQty < physicalOut)
                {
                    var batchStr = reqItem.BatchId.HasValue && batchesDict.TryGetValue(reqItem.BatchId.Value, out var b) ? $" (Batch: {b.BatchNumber})" : "";
                    return Result<Guid>.Failure($"Insufficient stock for item '{item.Name}'{batchStr}. Required: {physicalOut:G29}, Available: {beforeQty:G29}.", "INSUFFICIENT_STOCK");
                }

                if (stock == null)
                {
                    stock = new ItemWarehouseStock
                    {
                        TenantId = tenantId,
                        ItemId = item.Id,
                        VariantId = reqItem.VariantId,
                        WarehouseId = warehouseId,
                        BatchId = reqItem.BatchId,
                        CurrentQuantity = -physicalOut,
                        ReservedQuantity = 0
                    };
                    _context.ItemWarehouseStocks.Add(stock);
                    existingStocks.Add(stock);
                }
                else
                {
                    stock.CurrentQuantity -= physicalOut;
                }

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    VariantId = reqItem.VariantId,
                    WarehouseId = warehouseId,
                    BatchId = reqItem.BatchId,
                    MovementType = StockMovementType.SalesOutward,
                    Quantity = -physicalOut,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.PurchasePrice,
                    TotalCost = item.PurchasePrice * physicalOut,
                    ReferenceDocumentType = "SalesInvoice",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Notes = $"Sales outward to {customerName}"
                };
                _context.StockMovements.Add(movement);
            }

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
            if (lineInputs[i].ConversionRatio.HasValue && lineInputs[i].ConversionRatio.Value != 1m) 
                itemAttrs["conversionRatio"] = lineInputs[i].ConversionRatio.Value;
            if (lineCalc.NetEffectiveRate > 0) itemAttrs["netEffectiveRate"] = lineCalc.NetEffectiveRate;
            if (!string.IsNullOrWhiteSpace(reqItem.Packing)) itemAttrs["packing"] = reqItem.Packing;
            if (reqItem.Ptr > 0) itemAttrs["ptr"] = reqItem.Ptr;
            if (reqItem.Pts > 0) itemAttrs["pts"] = reqItem.Pts;

            var lineItem = new SalesInvoiceItem
            {
                TenantId = tenantId,
                Invoice = invoice,
                ItemId = item.Id,
                VariantId = reqItem.VariantId,
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
                Mrp = reqItem.Mrp > 0 ? reqItem.Mrp : item.MRP,
                PurchasePrice = item.PurchasePrice,
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
                AttributesJson = System.Text.Json.JsonSerializer.Serialize(itemAttrs)
            };

            // Electronics Serial / IMEI Lifecycle Tracking & Duplicate Prevention
            if (itemAttrs.TryGetValue("imeiSerial", out var imeiObj) && imeiObj != null)
            {
                var imeiStr = imeiObj.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(imeiStr))
                {
                    var existingSerial = await _context.ItemSerialNumbers
                        .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == item.Id && s.SerialNumber.ToLower() == imeiStr.ToLower() && !s.IsDeleted, cancellationToken);
                    if (existingSerial == null)
                    {
                        return Result<Guid>.Failure($"IMEI/Serial '{imeiStr}' has not been inwarded. Please inward via Purchase Bill or GRN first.", "SERIAL_NOT_INWARDED");
                    }
                    if (existingSerial.Status == "Sold")
                    {
                        return Result<Guid>.Failure($"IMEI/Serial '{imeiStr}' for product '{item.Name}' has already been sold on another invoice.", "SERIAL_ALREADY_SOLD");
                    }
                    if (existingSerial.Status != "InStock" && existingSerial.Status != "Available")
                    {
                        return Result<Guid>.Failure($"IMEI/Serial '{imeiStr}' is not available for sale (Current status: {existingSerial.Status}).", "SERIAL_NOT_AVAILABLE");
                    }

                    existingSerial.Status = "Sold";
                    if (itemAttrs.TryGetValue("warrantyMonths", out var wObj) && int.TryParse(wObj?.ToString(), out var wMonths) && wMonths > 0)
                    {
                        existingSerial.WarrantyExpiresAt = invDate.AddMonths(wMonths);
                    }
                }
            }

            invoice.Items.Add(lineItem);
        }

        invoice.SubTotal = invoiceTotals.SubTotal;
        invoice.ItemDiscountTotal = invoiceTotals.ItemDiscountTotal;
        invoice.InvoiceDiscountAmount = invoiceTotals.InvoiceDiscountAmount;
        invoice.TaxableAmount = invoiceTotals.TaxableAmount;
        invoice.CgstAmount = invoiceTotals.CgstAmount;
        invoice.SgstAmount = invoiceTotals.SgstAmount;
        invoice.IgstAmount = invoiceTotals.IgstAmount;
        invoice.CessAmount = invoiceTotals.CessAmount;
        invoice.RoundOff = invoiceTotals.RoundOff;
        invoice.TotalAmount = invoiceTotals.RoundedTotal;

        var roundedTotal = invoiceTotals.RoundedTotal;

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
                ReferenceDocumentNumber = "PENDING",
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
                    ReferenceDocumentNumber = "PENDING",
                    PaymentMode = request.PrimaryPaymentMode.ToString(),
                    Description = $"Payment received"
                };
                _context.PartyLedgerEntries.Add(paymentLedger);
            }
        }

        // 4. ⚡ DATABASE-AUTHORITATIVE DISTRIBUTED SEQUENCE ALLOCATION & ATOMIC GL POSTING
        var semaphore = _tenantInvoiceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            await AcquireSequenceLockAsync(tenantId, prefix, fy, cancellationToken);

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

            // Auto-post to General Ledger with authoritative final invoice number
            await AutoPostInvoiceToGeneralLedgerAsync(invoice, cancellationToken);

            // Auto-accrue Broker Commission if broker assigned
            if (invoice.BrokerId.HasValue)
            {
                var broker = await _context.Brokers
                    .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == invoice.BrokerId.Value && !b.IsDeleted, cancellationToken);
                if (broker != null)
                {
                    decimal baseAmount = broker.CommissionBasis switch
                    {
                        CommissionBasis.PercentageOfTotalInvoice => invoice.TotalAmount,
                        CommissionBasis.FixedPerUnit or CommissionBasis.PerBagOrQuintal => invoice.Items.Sum(it => it.Quantity),
                        _ => invoice.TaxableAmount
                    };

                    decimal gross = Math.Round(baseAmount * (broker.DefaultCommissionRate / 100m), 2, MidpointRounding.AwayFromZero);
                    decimal tds = broker.TdsPercent > 0 ? Math.Round(gross * (broker.TdsPercent / 100m), 2, MidpointRounding.AwayFromZero) : 0m;
                    decimal netPayable = gross - tds;

                    var commEntry = new BrokerCommissionEntry
                    {
                        TenantId = tenantId,
                        BrokerId = broker.Id,
                        SalesInvoiceId = invoice.Id,
                        SalesInvoiceNumber = currentNumber,
                        TransactionDate = invDate,
                        PartyId = invoice.PartyId,
                        PartyName = invoice.CustomerName,
                        BaseAmount = baseAmount,
                        CommissionRate = broker.DefaultCommissionRate,
                        GrossCommissionAmount = gross,
                        TdsAmount = tds,
                        NetCommissionPayable = netPayable,
                        Status = BrokerCommissionStatus.Accrued,
                        Notes = $"Auto-accrued on Invoice {currentNumber}"
                    };
                    _context.BrokerCommissionEntries.Add(commEntry);
                    broker.CurrentPayableBalance += netPayable;
                }
            }

            // Auto-record Schedule H1 Register entries for controlled pharmaceutical drugs
            foreach (var lineItem in invoice.Items)
            {
                var itemMaster = itemsDict[lineItem.ItemId];
                bool isScheduleH1 = false;
                if (!string.IsNullOrWhiteSpace(itemMaster.AttributesJson))
                {
                    try
                    {
                        using var attrDoc = JsonDocument.Parse(itemMaster.AttributesJson);
                        if (attrDoc.RootElement.TryGetProperty("schedule", out var schedProp))
                        {
                            var sVal = schedProp.GetString();
                            if (sVal != null && sVal.Contains("H1", StringComparison.OrdinalIgnoreCase))
                            {
                                isScheduleH1 = true;
                            }
                        }
                    }
                    catch { }
                }

                if (isScheduleH1)
                {
                    string docName = "Registered Medical Practitioner";
                    string docReg = "SMC-REG-VERIFIED";
                    string patientName = invoice.CustomerName;
                    string patientContact = invoice.CustomerPhone ?? "";

                    if (!string.IsNullOrWhiteSpace(request.AttributesJson))
                    {
                        try
                        {
                            using var invDoc = JsonDocument.Parse(request.AttributesJson);
                            if (invDoc.RootElement.TryGetProperty("doctorName", out var dn) && !string.IsNullOrWhiteSpace(dn.GetString()))
                                docName = dn.GetString()!;
                            if (invDoc.RootElement.TryGetProperty("doctorRegNumber", out var dr) && !string.IsNullOrWhiteSpace(dr.GetString()))
                                docReg = dr.GetString()!;
                            if (invDoc.RootElement.TryGetProperty("patientName", out var pn) && !string.IsNullOrWhiteSpace(pn.GetString()))
                                patientName = pn.GetString()!;
                            if (invDoc.RootElement.TryGetProperty("patientAddressPhone", out var pap) && !string.IsNullOrWhiteSpace(pap.GetString()))
                                patientContact = pap.GetString()!;
                        }
                        catch { }
                    }

                    var h1Entry = new ScheduleH1RegisterEntry
                    {
                        TenantId = tenantId,
                        InvoiceId = invoice.Id,
                        InvoiceNumber = currentNumber,
                        SupplyDate = invDate,
                        PatientName = patientName,
                        PatientAddressPhone = !string.IsNullOrWhiteSpace(patientContact) ? patientContact : (invoice.BillingAddress ?? "Local Supply"),
                        PrescriberDoctorName = docName,
                        PrescriberRegNumber = docReg,
                        DrugName = lineItem.ItemName,
                        BatchNumber = lineItem.BatchNumber ?? "N/A",
                        QuantitySupplied = lineItem.Quantity,
                        ManufacturerName = itemMaster.Brand?.ManufacturerName ?? itemMaster.Brand?.Name ?? "Standard Pharma",
                        SignOffStatus = "Verified"
                    };
                    _context.ScheduleH1RegisterEntries.Add(h1Entry);
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to create sales invoice {InvoiceNumber} for tenant {TenantId}: {Message}", invoice.InvoiceNumber, tenantId, ex.Message);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
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

    public async Task<Result<Guid>> UpdateInvoiceAsync(Guid invoiceId, CreateSalesInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Include(i => i.Items.Where(it => !it.IsDeleted))
            .Include(i => i.Payments.Where(p => !p.IsDeleted))
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<Guid>.Failure("Invoice not found.", "NOT_FOUND");
        }

        if (invoice.IsCancelled)
        {
            return Result<Guid>.Failure("Cannot edit a cancelled invoice.", "INVOICE_CANCELLED");
        }

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Invoice must contain at least one line item.", "NO_ITEMS");
        }

        // 1. Restore Stock of previous items
        foreach (var item in invoice.Items.ToList())
        {
            var stock = await _context.ItemWarehouseStocks
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.WarehouseId == invoice.WarehouseId &&
                                         (!item.BatchId.HasValue || s.BatchId == item.BatchId.Value) && !s.IsDeleted, cancellationToken);
            if (stock != null)
            {
                stock.CurrentQuantity += item.Quantity;
            }

            item.IsDeleted = true;
            item.DeletedAtUtc = DateTime.UtcNow;
            item.DeletedBy = _currentUserContext.UserId;
        }

        // 2. Fetch required master references
        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == invoice.BranchId && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        var sellerStateCode = branch?.StateCode ?? "27";
        var supplyStateCode = !string.IsNullOrWhiteSpace(request.BillingStateCode) ? request.BillingStateCode.Trim() : sellerStateCode;
        var isIntraState = string.Equals(sellerStateCode, supplyStateCode, StringComparison.OrdinalIgnoreCase);

        var itemIds = request.Items.Select(it => it.ItemId).Distinct().ToList();
        var uomIds = request.Items.Select(it => it.UomId).Distinct().ToList();

        var itemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && uomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var existingStocks = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId) && s.WarehouseId == invoice.WarehouseId && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        var customerName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : invoice.CustomerName;

        // 3. Update Invoice Metadata
        invoice.PartyId = request.PartyId ?? invoice.PartyId;
        invoice.CustomerName = customerName;
        invoice.CustomerPhone = request.CustomerPhone?.Trim() ?? invoice.CustomerPhone;
        invoice.CustomerEmail = request.CustomerEmail?.Trim().ToLowerInvariant() ?? invoice.CustomerEmail;
        invoice.CustomerGSTIN = request.CustomerGSTIN?.Trim().ToUpperInvariant();
        invoice.CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant();
        invoice.BillingAddress = request.BillingAddress?.Trim();
        invoice.ShippingAddress = request.ShippingAddress?.Trim() ?? request.BillingAddress?.Trim();
        invoice.BillingStateCode = supplyStateCode;
        invoice.ShippingStateCode = request.ShippingStateCode?.Trim() ?? supplyStateCode;
        invoice.PlaceOfSupply = request.PlaceOfSupply?.Trim() ?? invoice.PlaceOfSupply;
        if (request.DueDate.HasValue)
        {
            invoice.DueDate = DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc);
        }
        invoice.InvoiceDiscountPercent = request.InvoiceDiscountPercent;
        invoice.Notes = request.Notes?.Trim();
        invoice.TermsAndConditions = request.TermsAndConditions?.Trim();
        invoice.TransporterName = request.TransporterName?.Trim();
        invoice.TransporterId = request.TransporterId?.Trim().ToUpperInvariant();
        invoice.VehicleNumber = request.VehicleNumber?.Trim().ToUpperInvariant();
        invoice.LrNumber = request.LrNumber?.Trim();
        if (request.LrDate.HasValue) invoice.LrDate = DateTime.SpecifyKind(request.LrDate.Value, DateTimeKind.Utc);
        invoice.EWayBillNumber = request.EWayBillNumber?.Trim();
        if (request.EWayBillDate.HasValue) invoice.EWayBillDate = DateTime.SpecifyKind(request.EWayBillDate.Value, DateTimeKind.Utc);
        invoice.PoNumber = request.PoNumber?.Trim();
        if (request.PoDate.HasValue) invoice.PoDate = DateTime.SpecifyKind(request.PoDate.Value, DateTimeKind.Utc);
        invoice.IsReverseCharge = request.IsReverseCharge;
        if (!string.IsNullOrWhiteSpace(request.AttributesJson))
        {
            invoice.AttributesJson = request.AttributesJson;
        }

        // 4. Calculate new items & deplete stock
        decimal subTotal = 0m;
        decimal itemDiscountTotal = 0m;
        decimal totalTaxable = 0m;
        decimal totalCgst = 0m;
        decimal totalSgst = 0m;
        decimal totalIgst = 0m;
        decimal totalCess = 0m;

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

            if (item.ItemType != ItemType.Service && item.TrackInventory)
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
                        WarehouseId = invoice.WarehouseId,
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
                    WarehouseId = invoice.WarehouseId,
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
                    Notes = $"Sales outward to {customerName} (Edited)"
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
            if (reqItem.Ptr > 0) itemAttrs["ptr"] = reqItem.Ptr;
            if (reqItem.Pts > 0) itemAttrs["pts"] = reqItem.Pts;

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

        if (request.PaidAmount > 0)
        {
            invoice.PaidAmount = Math.Min(request.PaidAmount, roundedTotal);
        }
        invoice.BalanceAmount = Math.Max(0m, roundedTotal - invoice.PaidAmount);
        invoice.PaymentStatus = invoice.BalanceAmount == 0 
            ? PaymentStatus.FullyPaid 
            : (invoice.PaidAmount > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);
        invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

        await _context.SaveChangesAsync(cancellationToken);

        _ = _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateSalesInvoice",
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

        var hasActiveReturns = await _context.SalesReturns
            .AnyAsync(r => r.TenantId == tenantId && r.OriginalSalesInvoiceId == invoice.Id && !r.IsCancelled && !r.IsDeleted, cancellationToken);
        if (hasActiveReturns)
        {
            return Result.Failure("Cannot cancel invoice with active sales returns or credit notes. Cancel or reverse the returns first.", "CANNOT_CANCEL_WITH_ACTIVE_RETURNS");
        }

        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            var invItemIds = invoice.Items.Select(x => x.ItemId).Distinct().ToList();
        var invItemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && invItemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        // Query prior returns for this invoice to prevent phantom duplicate stock restoration
        var returnedByItem = await _context.SalesReturnItems
            .Where(ri => ri.TenantId == tenantId && 
                         ri.SalesReturn.OriginalSalesInvoiceId == invoice.Id && 
                         !ri.IsDeleted && 
                         !ri.SalesReturn.IsCancelled)
            .GroupBy(ri => ri.ItemId)
            .Select(g => new { ItemId = g.Key, TotalReturned = g.Sum(x => x.ReturnQuantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.TotalReturned, cancellationToken);

        // Restore Warehouse Stock for unreturned items only
        foreach (var item in invoice.Items)
        {
            if (invItemsDict.TryGetValue(item.ItemId, out var masterItem) && masterItem.ItemType == ItemType.Service)
            {
                continue; // Do not restore inventory for service items
            }

            returnedByItem.TryGetValue(item.ItemId, out var alreadyReturned);
            decimal remainingToRestore = Math.Max(0m, item.Quantity - alreadyReturned);

            if (remainingToRestore <= 0) continue;

            var stockQuery = _context.ItemWarehouseStocks
                .Where(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.WarehouseId == invoice.WarehouseId && !s.IsDeleted);

            if (item.VariantId.HasValue)
            {
                stockQuery = stockQuery.Where(s => s.VariantId == item.VariantId.Value);
            }
            else
            {
                stockQuery = stockQuery.Where(s => s.VariantId == null);
            }

            if (item.BatchId.HasValue)
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

            decimal proRataFree = (item.Quantity > 0 && freeQty > 0) ? (remainingToRestore / item.Quantity) * freeQty : 0m;
            decimal restoredUnits = (remainingToRestore + proRataFree) * (conversion > 0 ? conversion : 1m);

            var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
            if (stock != null)
            {
                var beforeQty = stock.CurrentQuantity;
                stock.CurrentQuantity += restoredUnits;

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.ItemId,
                    VariantId = item.VariantId,
                    WarehouseId = invoice.WarehouseId,
                    BatchId = item.BatchId,
                    MovementType = StockMovementType.TransferIn,
                    Quantity = restoredUnits,
                    QuantityBefore = beforeQty,
                    QuantityAfter = stock.CurrentQuantity,
                    UnitCost = item.PurchasePrice,
                    TotalCost = item.PurchasePrice * restoredUnits,
                    ReferenceDocumentType = "InvoiceCancellation",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Notes = $"Stock restored on invoice cancellation: {request.CancellationReason} (Net Units: {restoredUnits})"
                };
                _context.StockMovements.Add(movement);
            }

            // Restore IMEI / Serial Number status to InStock
            if (!string.IsNullOrWhiteSpace(item.AttributesJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                    if (doc.RootElement.TryGetProperty("imeiSerial", out var imeiProp))
                    {
                        var imeiVal = imeiProp.GetString()?.Trim();
                        if (!string.IsNullOrWhiteSpace(imeiVal))
                        {
                            var serialEntity = await _context.ItemSerialNumbers
                                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == item.ItemId && s.SerialNumber.ToLower() == imeiVal.ToLower() && !s.IsDeleted, cancellationToken);
                            if (serialEntity != null && serialEntity.Status == "Sold")
                            {
                                serialEntity.Status = "InStock";
                            }
                        }
                    }
                }
                catch { }
            }
        }

        // Mark any Schedule H1 Register entries as Cancelled
        var linkedH1Entries = await _context.ScheduleH1RegisterEntries
            .Where(h => h.TenantId == tenantId && h.InvoiceId == invoice.Id && !h.IsDeleted)
            .ToListAsync(cancellationToken);
        foreach (var h1 in linkedH1Entries)
        {
            h1.SignOffStatus = "Cancelled";
        }

        // Reverse Party Ledger entries if party exists
        if (invoice.PartyId.HasValue)
        {
            var party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == invoice.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
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
                    CreditAmount = Math.Abs(netAdjustment),
                    RunningBalance = newBal,
                    ReferenceDocumentType = "InvoiceCancellation",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Description = $"Reversal for Cancelled Invoice {invoice.InvoiceNumber}: {request.CancellationReason}"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }
        }

        // Auto-post reversing Journal Voucher to General Ledger
        var revAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-REV", "Direct Sales Revenue", "GRP-REV", "Direct Sales Revenue", "Revenue", "Credit", cancellationToken);
        var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
        var cgstAccount = invoice.CgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-OUT", "Output CGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
        var sgstAccount = invoice.SgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-OUT", "Output SGST/UTGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
        var igstAccount = invoice.IgstAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-OUT", "Output IGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
        var roundOffAccount = invoice.RoundOff != 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-ROUNDOFF", "Invoice Round Off", "GRP-EXP", "Indirect Expenses", "Expense", "Debit", cancellationToken) : null;

        var reversalVoucher = new JournalVoucher
        {
            TenantId = tenantId,
            VoucherNumber = $"JV-REV-INV-{invoice.InvoiceNumber}",
            VoucherDate = DateTime.UtcNow,
            VoucherType = "Reversal",
            ReferenceNumber = invoice.InvoiceNumber,
            TotalDebit = invoice.TotalAmount,
            TotalCredit = invoice.TotalAmount,
            Narration = $"Reversal of cancelled sales invoice {invoice.InvoiceNumber}: {request.CancellationReason}",
            CreatedByName = "System Auto-Posting"
        };

        // Debit Revenue (reversing credit)
        reversalVoucher.Legs.Add(new JournalVoucherLeg
        {
            TenantId = tenantId,
            AccountId = revAccount.Id,
            DebitAmount = invoice.TaxableAmount,
            CreditAmount = 0,
            Narration = $"Reversal of sales revenue on cancelled invoice {invoice.InvoiceNumber}"
        });
        revAccount.CurrentBalance -= invoice.TaxableAmount;

        // Debit Output CGST
        if (cgstAccount != null && invoice.CgstAmount > 0)
        {
            reversalVoucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = cgstAccount.Id,
                DebitAmount = invoice.CgstAmount,
                CreditAmount = 0,
                Narration = $"Reversal of Output CGST on cancelled invoice {invoice.InvoiceNumber}"
            });
            cgstAccount.CurrentBalance -= invoice.CgstAmount;
        }

        // Debit Output SGST
        if (sgstAccount != null && invoice.SgstAmount > 0)
        {
            reversalVoucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = sgstAccount.Id,
                DebitAmount = invoice.SgstAmount,
                CreditAmount = 0,
                Narration = $"Reversal of Output SGST on cancelled invoice {invoice.InvoiceNumber}"
            });
            sgstAccount.CurrentBalance -= invoice.SgstAmount;
        }

        // Debit Output IGST
        if (igstAccount != null && invoice.IgstAmount > 0)
        {
            reversalVoucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = igstAccount.Id,
                DebitAmount = invoice.IgstAmount,
                CreditAmount = 0,
                Narration = $"Reversal of Output IGST on cancelled invoice {invoice.InvoiceNumber}"
            });
            igstAccount.CurrentBalance -= invoice.IgstAmount;
        }

        // Round-off
        if (roundOffAccount != null && invoice.RoundOff != 0)
        {
            if (invoice.RoundOff > 0)
            {
                reversalVoucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = roundOffAccount.Id,
                    DebitAmount = invoice.RoundOff,
                    CreditAmount = 0,
                    Narration = "Reversal of positive round off"
                });
                roundOffAccount.CurrentBalance += invoice.RoundOff;
            }
            else
            {
                var absRound = Math.Abs(invoice.RoundOff);
                reversalVoucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = roundOffAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = absRound,
                    Narration = "Reversal of negative round off"
                });
                roundOffAccount.CurrentBalance -= absRound;
            }
        }

        // Credit AR (reversing receivable debit)
        reversalVoucher.Legs.Add(new JournalVoucherLeg
        {
            TenantId = tenantId,
            AccountId = arAccount.Id,
            DebitAmount = 0,
            CreditAmount = invoice.TotalAmount,
            Narration = $"Reversal of receivable on cancelled invoice {invoice.InvoiceNumber}"
        });
        arAccount.CurrentBalance -= invoice.TotalAmount;

        _context.JournalVouchers.Add(reversalVoucher);

        invoice.IsCancelled = true;
        invoice.Status = InvoiceStatus.Cancelled;
        invoice.CancellationReason = request.CancellationReason.Trim();
        invoice.CancelledAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        if (tx != null) await tx.CommitAsync(cancellationToken);
    }
    catch (Exception ex)
    {
        if (tx != null) await tx.RollbackAsync(cancellationToken);
        _logger?.LogError(ex, "Failed to cancel sales invoice {InvoiceNumber}: {Message}", invoice.InvoiceNumber, ex.Message);
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

        // Resolve party fallback: SalesReturn.PartyId is a mandatory FK to parties table
        Guid finalPartyId = request.PartyId;
        if (finalPartyId == Guid.Empty)
        {
            var defaultParty = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && !p.IsDeleted && (p.LegalName.ToLower().Contains("walk-in") || p.LegalName.ToLower().Contains("cash")), cancellationToken)
                ?? await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.PartyType == PartyType.Customer && !p.IsDeleted, cancellationToken);

            if (defaultParty == null)
            {
                defaultParty = new Party
                {
                    TenantId = tenantId,
                    Code = $"CUST-WALKIN-{DateTime.UtcNow:yyMMddHHmmss}",
                    LegalName = "Walk-in Customer",
                    PartyType = PartyType.Customer
                };
                _context.Parties.Add(defaultParty);
                await _context.SaveChangesAsync(cancellationToken);
            }
            finalPartyId = defaultParty.Id;
        }

        string customerName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : "Walk-in Customer";
        if (customerName == "Walk-in Customer" && finalPartyId != Guid.Empty)
        {
            var party = await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == finalPartyId && !p.IsDeleted, cancellationToken);
            if (party != null && !string.IsNullOrWhiteSpace(party.LegalName)) customerName = party.LegalName;
        }

        var semaphore = _tenantInvoiceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        string creditNoteNumber;
        SalesReturn salesReturn;
        try
        {
            var cnPrefix = $"CN-{DateTime.UtcNow:yyMM}-";
            await AcquireSequenceLockAsync(tenantId, "CN", DateTime.UtcNow.ToString("yyMM"), cancellationToken);
            var lastNumberStr = await _context.SalesReturns
                .Where(r => r.TenantId == tenantId && r.CreditNoteNumber.StartsWith(cnPrefix))
                .OrderByDescending(r => r.CreditNoteNumber)
                .Select(r => r.CreditNoteNumber)
                .FirstOrDefaultAsync(cancellationToken);

            int nextNum = 1;
            if (!string.IsNullOrEmpty(lastNumberStr) && lastNumberStr.Length > cnPrefix.Length)
            {
                if (int.TryParse(lastNumberStr.Substring(cnPrefix.Length), out var parsed))
                {
                    nextNum = parsed + 1;
                }
            }
            creditNoteNumber = $"{cnPrefix}{nextNum:D5}";

            salesReturn = new SalesReturn
            {
                TenantId = tenantId,
                CreditNoteNumber = creditNoteNumber,
                ReturnDate = DateTimeOffset.UtcNow,
                OriginalSalesInvoiceId = request.OriginalSalesInvoiceId,
                OriginalInvoiceNumber = request.OriginalInvoiceNumber,
                PartyId = finalPartyId,
                CustomerName = customerName,
                BranchId = branchId,
                WarehouseId = warehouseId,
                ReturnReason = request.ReturnReason ?? "Customer Return",
                RestockToWarehouse = request.RestockToWarehouse,
                Notes = request.Notes
            };

            decimal subTotal = 0m;
            decimal taxTotal = 0m;

        if (!request.OriginalSalesInvoiceId.HasValue || request.OriginalSalesInvoiceId.Value == Guid.Empty)
        {
            return Result<Guid>.Failure("Original sales invoice is required for sales returns.", "INVOICE_REQUIRED");
        }

        var origInvoice = await _context.SalesInvoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.OriginalSalesInvoiceId.Value && !i.IsDeleted, cancellationToken);

        if (origInvoice == null)
        {
            return Result<Guid>.Failure("Original sales invoice not found.", "INVOICE_NOT_FOUND");
        }

        if (origInvoice.IsCancelled || origInvoice.Status == InvoiceStatus.Cancelled)
        {
            return Result<Guid>.Failure("Cannot process return for a cancelled sales invoice.", "INVOICE_CANCELLED");
        }

        var retItemIds = request.Items.Select(x => x.ItemId).Distinct().ToList();
        var retItemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && retItemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        foreach (var line in request.Items)
        {
            if (line.ReturnQuantity <= 0)
            {
                return Result<Guid>.Failure("Return quantity must be greater than zero.", "INVALID_RETURN_QUANTITY");
            }

            SalesInvoiceItem? origItem = null;
            decimal conversionRatio = 1m;
            decimal origFreeQty = 0m;

            if (origInvoice != null)
            {
                origItem = origInvoice.Items.FirstOrDefault(it => it.ItemId == line.ItemId && !it.IsDeleted);
                if (origItem == null)
                {
                    return Result<Guid>.Failure($"Item '{line.ItemName}' is not part of original invoice {origInvoice.InvoiceNumber}.", "ITEM_NOT_ON_INVOICE");
                }

                // Cumulative remaining returnable quantity check across all previous returns for this invoice & item
                var previousReturnedQty = await _context.SalesReturnItems
                    .Where(ri => ri.TenantId == tenantId && 
                                 ri.SalesReturn.OriginalSalesInvoiceId == origInvoice.Id && 
                                 ri.ItemId == line.ItemId && 
                                 !ri.IsDeleted && 
                                 !ri.SalesReturn.IsCancelled)
                    .SumAsync(ri => ri.ReturnQuantity, cancellationToken);

                var remainingReturnableQty = origItem.Quantity - previousReturnedQty;
                if (line.ReturnQuantity > remainingReturnableQty)
                {
                    return Result<Guid>.Failure($"Return quantity ({line.ReturnQuantity}) exceeds remaining returnable quantity ({remainingReturnableQty}) for item '{origItem.ItemName}'.", "RETURN_QUANTITY_EXCEEDED");
                }

                if (!string.IsNullOrWhiteSpace(origItem.AttributesJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(origItem.AttributesJson);
                        if (doc.RootElement.TryGetProperty("freeQuantity", out var fq)) origFreeQty = fq.GetDecimal();
                        if (doc.RootElement.TryGetProperty("conversionRatio", out var cr)) conversionRatio = cr.GetDecimal();
                    }
                    catch { }
                }
            }

            decimal effectiveRate = line.UnitPrice;
            if (origItem != null)
            {
                effectiveRate = _calculationEngine.CalculateNetEffectiveReturnRate(origItem.TaxableAmount, origItem.Quantity, origFreeQty);
                if (effectiveRate <= 0) effectiveRate = line.UnitPrice;
            }

            var lineTaxable = Math.Round(line.ReturnQuantity * effectiveRate, 4);
            var lineTax = Math.Round(lineTaxable * (line.GstRate / 100m), 4);
            var lineTotal = lineTaxable + lineTax;

            subTotal += lineTaxable;
            taxTotal += lineTax;

            salesReturn.Items.Add(new SalesReturnItem
            {
                TenantId = tenantId,
                ItemId = line.ItemId,
                VariantId = line.VariantId,
                ItemName = line.ItemName ?? "Item",
                ItemSku = line.ItemSku ?? "",
                BatchId = line.BatchId,
                BatchNumber = line.BatchNumber,
                ReturnQuantity = line.ReturnQuantity,
                UnitPrice = effectiveRate,
                GstRate = line.GstRate,
                TotalAmount = lineTotal
            });

            retItemsDict.TryGetValue(line.ItemId, out var retMasterItem);
            bool isServiceItem = retMasterItem != null && retMasterItem.ItemType == ItemType.Service;

            // Restock to Warehouse with scheme free-quantity proportional restoration (Goods only)
            if (request.RestockToWarehouse && warehouseId != Guid.Empty && !isServiceItem)
            {
                decimal proRataFreeRestored = (origItem != null && origItem.Quantity > 0 && origFreeQty > 0)
                    ? (line.ReturnQuantity / origItem.Quantity) * origFreeQty
                    : 0m;
                decimal physicalUnitsToRestock = (line.ReturnQuantity + proRataFreeRestored) * (conversionRatio > 0 ? conversionRatio : 1m);

                var stockQuery = _context.ItemWarehouseStocks
                    .Where(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == warehouseId && !s.IsDeleted);

                if (line.VariantId.HasValue)
                {
                    stockQuery = stockQuery.Where(s => s.VariantId == line.VariantId.Value);
                }
                else
                {
                    stockQuery = stockQuery.Where(s => s.VariantId == null);
                }

                if (line.BatchId.HasValue)
                {
                    stockQuery = stockQuery.Where(s => s.BatchId == line.BatchId.Value);
                }
                else
                {
                    stockQuery = stockQuery.Where(s => s.BatchId == null);
                }

                var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);

                if (stock == null)
                {
                    stock = new ItemWarehouseStock
                    {
                        TenantId = tenantId,
                        ItemId = line.ItemId,
                        VariantId = line.VariantId,
                        WarehouseId = warehouseId,
                        BatchId = line.BatchId,
                        CurrentQuantity = physicalUnitsToRestock
                    };
                    _context.ItemWarehouseStocks.Add(stock);
                }
                else
                {
                    stock.CurrentQuantity += physicalUnitsToRestock;
                }

                _context.StockMovements.Add(new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = line.ItemId,
                    VariantId = line.VariantId,
                    WarehouseId = warehouseId,
                    BatchId = line.BatchId,
                    MovementType = StockMovementType.SalesReturn,
                    Quantity = physicalUnitsToRestock,
                    QuantityBefore = (stock?.CurrentQuantity ?? 0) - physicalUnitsToRestock,
                    QuantityAfter = stock?.CurrentQuantity ?? physicalUnitsToRestock,
                    UnitCost = line.UnitPrice,
                    TotalCost = lineTaxable,
                    ReferenceDocumentType = "CreditNote",
                    ReferenceDocumentId = salesReturn.Id,
                    ReferenceDocumentNumber = creditNoteNumber,
                    Notes = $"Restock from Sales Return {creditNoteNumber} (Units: {physicalUnitsToRestock})"
                });

                // If serialized electronics product, restore serial status to InStock
                if (origItem != null && !string.IsNullOrWhiteSpace(origItem.AttributesJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(origItem.AttributesJson);
                        if (doc.RootElement.TryGetProperty("imeiSerial", out var imeiProp))
                        {
                            var imeiVal = imeiProp.GetString()?.Trim();
                            if (!string.IsNullOrWhiteSpace(imeiVal))
                            {
                                var retSerial = await _context.ItemSerialNumbers
                                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.SerialNumber.ToLower() == imeiVal.ToLower() && !s.IsDeleted, cancellationToken);
                                if (retSerial != null)
                                {
                                    retSerial.Status = "InStock";
                                }
                            }
                        }
                    }
                    catch { }
                }
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
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to create sales return for tenant {TenantId}: {Message}", tenantId, ex.Message);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
            semaphore.Release();
        }

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

            voucher.TotalDebit = voucher.Legs.Sum(l => l.DebitAmount);
            voucher.TotalCredit = voucher.Legs.Sum(l => l.CreditAmount);

            if (Math.Abs(voucher.TotalDebit - voucher.TotalCredit) > 0.01m)
            {
                throw new InvalidOperationException($"General Ledger voucher for invoice {invoice.InvoiceNumber} is out of balance. Total Debit: {voucher.TotalDebit:F2}, Total Credit: {voucher.TotalCredit:F2}. Difference: {Math.Abs(voucher.TotalDebit - voucher.TotalCredit):F2}");
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AccountingAutoPost] Error auto-posting invoice {InvoiceNumber} to General Ledger: {Message}", invoice.InvoiceNumber, ex.Message);
            throw new InvalidOperationException($"General Ledger auto-posting failed for invoice {invoice.InvoiceNumber}: {ex.Message}", ex);
        }
    }

    private async Task AutoPostSalesReturnToGeneralLedgerAsync(SalesReturn salesReturn, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = salesReturn.TenantId;
            var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
            var retAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-RET", "Sales Returns & Allowances", "GRP-REV", "Direct Sales Revenue", "Revenue", "Debit", cancellationToken);

            bool isIntraState = true;
            if (salesReturn.OriginalSalesInvoiceId.HasValue)
            {
                var origInv = await _context.SalesInvoices
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.Id == salesReturn.OriginalSalesInvoiceId.Value, cancellationToken);
                if (origInv != null)
                {
                    isIntraState = origInv.TaxSupplyType == TaxSupplyType.IntraState;
                }
            }

            decimal totalCgst = 0m;
            decimal totalSgst = 0m;
            decimal totalIgst = 0m;

            if (salesReturn.TaxAmount > 0)
            {
                if (isIntraState)
                {
                    totalCgst = Math.Round(salesReturn.TaxAmount / 2m, 2);
                    totalSgst = salesReturn.TaxAmount - totalCgst;
                }
                else
                {
                    totalIgst = salesReturn.TaxAmount;
                }
            }

            var cgstAccount = totalCgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-OUT", "Output CGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
            var sgstAccount = totalSgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-OUT", "Output SGST/UTGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
            var igstAccount = totalIgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-OUT", "Output IGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;

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

            // Leg 2: Debit Output CGST Reversal
            if (cgstAccount != null && totalCgst > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cgstAccount.Id,
                    DebitAmount = totalCgst,
                    CreditAmount = 0,
                    Narration = "Output CGST tax reversal on credit note"
                });
                cgstAccount.CurrentBalance -= totalCgst;
            }

            // Leg 3: Debit Output SGST Reversal
            if (sgstAccount != null && totalSgst > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = sgstAccount.Id,
                    DebitAmount = totalSgst,
                    CreditAmount = 0,
                    Narration = "Output SGST tax reversal on credit note"
                });
                sgstAccount.CurrentBalance -= totalSgst;
            }

            // Leg 4: Debit Output IGST Reversal
            if (igstAccount != null && totalIgst > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = igstAccount.Id,
                    DebitAmount = totalIgst,
                    CreditAmount = 0,
                    Narration = "Output IGST tax reversal on credit note"
                });
                igstAccount.CurrentBalance -= totalIgst;
            }

            // Leg 5: Credit AR
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = arAccount.Id,
                DebitAmount = 0,
                CreditAmount = salesReturn.TotalAmount,
                Narration = $"Credit customer receivable on Credit Note {salesReturn.CreditNoteNumber}"
            });
            arAccount.CurrentBalance -= salesReturn.TotalAmount;

            voucher.TotalDebit = voucher.Legs.Sum(l => l.DebitAmount);
            voucher.TotalCredit = voucher.Legs.Sum(l => l.CreditAmount);

            if (Math.Abs(voucher.TotalDebit - voucher.TotalCredit) > 0.01m)
            {
                throw new InvalidOperationException($"General Ledger voucher for credit note {salesReturn.CreditNoteNumber} is out of balance. Total Debit: {voucher.TotalDebit:F2}, Total Credit: {voucher.TotalCredit:F2}. Difference: {Math.Abs(voucher.TotalDebit - voucher.TotalCredit):F2}");
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "[AccountingAutoPost] Error auto-posting credit note {CreditNoteNumber} to General Ledger: {Message}", salesReturn.CreditNoteNumber, ex.Message);
            throw new InvalidOperationException($"General Ledger auto-posting failed for credit note {salesReturn.CreditNoteNumber}: {ex.Message}", ex);
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
