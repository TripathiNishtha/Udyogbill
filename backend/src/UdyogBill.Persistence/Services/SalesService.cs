using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Jewellery;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Pharma;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

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

    private async Task AcquirePaymentLockAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        if (_context.Database.IsRelational() && _context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
        {
            var lockKey = $"inv_pay_{invoiceId}";
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
                    _logger?.LogWarning(ex, "Transient error acquiring DB advisory lock for invoice payment {InvoiceId} (attempt {Attempt}/{MaxRetries}): {Message}", invoiceId, attempt, maxRetries, ex.Message);
                    await Task.Delay(attempt * 50, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to acquire DB advisory lock for invoice payment {InvoiceId} after {MaxRetries} attempts: {Message}", invoiceId, maxRetries, ex.Message);
                    throw new InvalidOperationException($"Invoice payment lock contention for invoice '{invoiceId}'. Please retry the operation.", ex);
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

        var effectiveBranchId = (_currentUserContext.BranchId.HasValue && !_currentUserContext.IsSuperAdmin && !_currentUserContext.IsTenantAdmin)
            ? _currentUserContext.BranchId
            : branchId;

        if (effectiveBranchId.HasValue && effectiveBranchId.Value != Guid.Empty)
        {
            query = query.Where(i => i.BranchId == effectiveBranchId.Value);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(i => i.PartyId == partyId.Value);
        }

        var (fromUtc, toUtc) = DateHelper.ResolveDateRangeUtc(fromDate, toDate, defaultToCurrentMonthIfBothNull: false);

        if (fromUtc.HasValue)
        {
            query = query.Where(i => i.InvoiceDate >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(i => i.InvoiceDate <= toUtc.Value);
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
            .Include(i => i.Party)
                .ThenInclude(p => p.Addresses)
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

        string? customerDl = null;
        if (!string.IsNullOrWhiteSpace(invoice.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(invoice.AttributesJson);
                if (doc.RootElement.TryGetProperty("customerDlNumber", out var dlProp) && !string.IsNullOrWhiteSpace(dlProp.GetString()))
                {
                    customerDl = dlProp.GetString();
                }
            }
            catch {}
        }
        if (string.IsNullOrWhiteSpace(customerDl))
        {
            customerDl = invoice.Party?.DrugLicenseNumber1;
            if (string.IsNullOrWhiteSpace(customerDl) && !string.IsNullOrWhiteSpace(invoice.Party?.DrugLicenseNumber2))
            {
                customerDl = invoice.Party.DrugLicenseNumber2;
            }
        }

        string? resolvedBillingAddress = invoice.BillingAddress;
        if (string.IsNullOrWhiteSpace(resolvedBillingAddress) || 
            resolvedBillingAddress.Trim().Equals(invoice.CustomerName?.Trim(), StringComparison.OrdinalIgnoreCase) ||
            (invoice.Party != null && !string.IsNullOrWhiteSpace(invoice.Party.TradeName) && resolvedBillingAddress.Trim().Equals(invoice.Party.TradeName?.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            var defAddr = invoice.Party?.Addresses?.FirstOrDefault(a => !a.IsDeleted && a.IsDefault) 
                       ?? invoice.Party?.Addresses?.FirstOrDefault(a => !a.IsDeleted);
            if (defAddr != null)
            {
                var addrParts = new[] {
                    defAddr.AddressLine1,
                    defAddr.AddressLine2,
                    defAddr.City,
                    !string.IsNullOrWhiteSpace(defAddr.State) 
                        ? (!string.IsNullOrWhiteSpace(defAddr.Pincode) ? $"{defAddr.State} - {defAddr.Pincode}" : defAddr.State) 
                        : defAddr.Pincode
                }.Where(s => !string.IsNullOrWhiteSpace(s));
                var full = string.Join(", ", addrParts);
                if (!string.IsNullOrWhiteSpace(full))
                {
                    resolvedBillingAddress = full;
                }
            }
        }

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
            !string.IsNullOrWhiteSpace(invoice.CustomerPhone) ? invoice.CustomerPhone : (invoice.Party?.Mobile ?? invoice.Party?.PrimaryPhone),
            invoice.CustomerEmail,
            invoice.CustomerGSTIN,
            invoice.CustomerPAN,
            resolvedBillingAddress,
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
            invoice.Broker?.FullName,
            customerDl,
            invoice.DoctorName,
            invoice.DoctorRegistrationNumber
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

        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            var existingInvoice = await _context.SalesInvoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.Id.Value && !i.IsDeleted, cancellationToken);
            if (existingInvoice != null)
            {
                return Result<Guid>.Success(existingInvoice.Id);
            }
        }

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

        // Auto-match party by customer phone if PartyId wasn't found
        if (party == null && !string.IsNullOrWhiteSpace(request.CustomerPhone))
        {
            var cleanPhone = request.CustomerPhone.Trim();
            party = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && (p.PrimaryPhone == cleanPhone || p.Mobile == cleanPhone) && !p.IsDeleted, cancellationToken);
        }

        // Auto-register customer with phone into Parties directory for cross-channel consistency
        if (party == null && !string.IsNullOrWhiteSpace(request.CustomerPhone) && !string.IsNullOrWhiteSpace(request.CustomerName) && request.CustomerName.Trim() != "Walk-in Customer")
        {
            var cleanPhone = request.CustomerPhone.Trim();
            var phoneTail = cleanPhone.Length >= 4 ? cleanPhone.Substring(cleanPhone.Length - 4) : cleanPhone;
            var partyCode = $"CUST-{phoneTail}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
            party = new Party
            {
                TenantId = tenantId,
                Code = partyCode,
                LegalName = request.CustomerName.Trim(),
                TradeName = request.CustomerName.Trim(),
                PartyType = PartyType.Customer,
                CustomerType = CustomerType.B2C,
                PrimaryPhone = cleanPhone,
                Mobile = cleanPhone,
                GSTIN = request.CustomerGSTIN?.Trim().ToUpperInvariant(),
                PAN = request.CustomerPAN?.Trim().ToUpperInvariant(),
                StateCode = !string.IsNullOrWhiteSpace(request.BillingStateCode) ? request.BillingStateCode : null,
                CreatedAtUtc = DateTime.UtcNow
            };
            if (!string.IsNullOrWhiteSpace(request.BillingAddress))
            {
                party.Addresses.Add(new PartyAddress
                {
                    TenantId = tenantId,
                    AddressType = AddressType.Billing,
                    AddressLine1 = request.BillingAddress.Trim(),
                    StateCode = request.BillingStateCode ?? string.Empty,
                    IsDefault = true,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            _context.Parties.Add(party);
        }

        // Determine GST Supply Type (Intra-State vs Inter-State) with authoritative B2C/B2B fallback
        var tenantObj = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        var branchStateCode = GstStateHelper.NormalizeStateCode(
            branch.StateCode ?? tenantObj?.StateCode ?? tenantObj?.State,
            branch.GSTIN ?? tenantObj?.GSTIN,
            "09");

        string? rawSupplyStateCode = null;
        if (!string.IsNullOrWhiteSpace(request.CustomerGSTIN) && request.CustomerGSTIN.Trim().Length >= 2 && char.IsDigit(request.CustomerGSTIN.Trim()[0]) && char.IsDigit(request.CustomerGSTIN.Trim()[1]))
        {
            rawSupplyStateCode = request.CustomerGSTIN.Trim().Substring(0, 2);
        }
        else if (!string.IsNullOrWhiteSpace(request.BillingStateCode))
        {
            rawSupplyStateCode = request.BillingStateCode.Trim();
        }
        else if (party != null && !string.IsNullOrWhiteSpace(party.GSTIN) && party.GSTIN.Trim().Length >= 2 && char.IsDigit(party.GSTIN.Trim()[0]) && char.IsDigit(party.GSTIN.Trim()[1]))
        {
            rawSupplyStateCode = party.GSTIN.Trim().Substring(0, 2);
        }
        else if (party != null && !string.IsNullOrWhiteSpace(party.StateCode))
        {
            rawSupplyStateCode = party.StateCode.Trim();
        }

        var effectiveGstinForState = !string.IsNullOrWhiteSpace(request.CustomerGSTIN)
            ? request.CustomerGSTIN
            : (string.IsNullOrWhiteSpace(request.BillingStateCode) ? party?.GSTIN : null);
        var supplyStateCode = GstStateHelper.NormalizeStateCode(rawSupplyStateCode, effectiveGstinForState, branchStateCode);

        var isIntraState = string.Equals(branchStateCode, supplyStateCode, StringComparison.OrdinalIgnoreCase);
        var taxSupplyType = isIntraState ? TaxSupplyType.IntraState : TaxSupplyType.InterState;
        var invDate = DateTime.SpecifyKind(request.InvoiceDate, DateTimeKind.Utc);
        var fy = GetFinancialYearCode(invDate);

        bool isNonGst = request.InvoiceType == InvoiceType.SalesEstimate
            || (!string.IsNullOrWhiteSpace(request.AttributesJson) && (
                request.AttributesJson.Contains("\"billingMode\":\"NON_GST\"") ||
                request.AttributesJson.Contains("\"billingMode\":\"non_gst\"") ||
                request.AttributesJson.Contains("\"taxTreatment\":\"NON_GST\"") ||
                request.AttributesJson.Contains("\"isNonGst\":true") ||
                request.AttributesJson.Contains("\"isCashMemo\":true")
            ));

        bool isComposition = (tenantObj?.IsCompositionScheme == true) || (request.InvoiceType == InvoiceType.BillOfSupply);
        var effectiveInvoiceType = isComposition 
            ? InvoiceType.BillOfSupply 
            : (isNonGst ? InvoiceType.SalesEstimate : request.InvoiceType);
        var prefix = effectiveInvoiceType switch
        {
            InvoiceType.POSBill => "POS",
            InvoiceType.ProformaInvoice => "PI",
            InvoiceType.SalesEstimate => "CASH",
            InvoiceType.CreditNote => "CN",
            InvoiceType.DebitNote => "DN",
            InvoiceType.BillOfSupply => "BOS",
            _ => "INV"
        };

        // 3. ⚡ BATCH RETRIEVAL (Zero N+1 DB roundtrips for 2 Lakh scale)
        var itemIds = request.Items.Select(x => x.ItemId).Distinct().ToList();

        var itemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        var uomIds = request.Items.Select(x => x.UomId).Where(id => id != Guid.Empty).ToList();
        uomIds.AddRange(itemsDict.Values.Select(it => it.PrimaryUomId).Where(id => id != Guid.Empty));
        var distinctUomIds = uomIds.Distinct().ToList();

        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && distinctUomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        if (!uomsDict.Any())
        {
            var fallbackUoms = await _context.UnitsOfMeasure
                .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                .Take(5)
                .ToListAsync(cancellationToken);
            foreach (var fu in fallbackUoms) uomsDict[fu.Id] = fu;
        }

        var batchIds = request.Items.Where(x => x.BatchId.HasValue && x.BatchId.Value != Guid.Empty).Select(x => x.BatchId!.Value).Distinct().ToList();
        var batchesDict = await _context.ItemBatches
            .Where(b => b.TenantId == tenantId && batchIds.Contains(b.Id) && !b.IsDeleted)
            .ToDictionaryAsync(b => b.Id, cancellationToken);

        var variantIds = request.Items.Where(x => x.VariantId.HasValue && x.VariantId.Value != Guid.Empty).Select(x => x.VariantId!.Value).Distinct().ToList();
        var variantsDict = variantIds.Any()
            ? await _context.ItemVariants.Where(v => v.TenantId == tenantId && variantIds.Contains(v.Id) && !v.IsDeleted).ToDictionaryAsync(v => v.Id, cancellationToken)
            : new Dictionary<Guid, ItemVariant>();

        var garmentItemIds = itemsDict.Values.Where(it => it.TrackVariants).Select(it => it.Id).ToList();
        var itemVariantsList = garmentItemIds.Any()
            ? await _context.ItemVariants.Where(v => v.TenantId == tenantId && garmentItemIds.Contains(v.ItemId) && !v.IsDeleted && v.IsActive).ToListAsync(cancellationToken)
            : new List<ItemVariant>();

        var semaphore = _tenantInvoiceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        SalesInvoice? invoice = null;
        try
        {
            var existingStocks = await _context.ItemWarehouseStocks
                .Include(s => s.Batch)
                .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId) && s.WarehouseId == warehouseId && !s.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var s in existingStocks)
            {
                if (s.Batch != null && !batchesDict.ContainsKey(s.Batch.Id))
                {
                    batchesDict[s.Batch.Id] = s.Batch;
                }
            }

            var customerName = !string.IsNullOrWhiteSpace(request.CustomerName) 
                ? request.CustomerName.Trim() 
                : (party != null && !string.IsNullOrWhiteSpace(party.LegalName) ? party.LegalName : "Walk-in Customer");

            var cleanCustGstin = request.CustomerGSTIN?.Trim().ToUpperInvariant();
            var branchStateName = !string.IsNullOrWhiteSpace(branch.State) ? branch.State : GstStateHelper.GetStateNameByCode(branchStateCode);
            var resolvedPos = GstStateHelper.ResolvePlaceOfSupply(
                cleanCustGstin,
                request.PlaceOfSupply,
                request.BillingStateCode,
                branch.GSTIN,
                branchStateName,
                branchStateCode);

            string? extractedDocName = null;
            string? extractedDocReg = null;
            if (!string.IsNullOrWhiteSpace(request.AttributesJson))
            {
                try
                {
                    using var attrDoc = System.Text.Json.JsonDocument.Parse(request.AttributesJson);
                    if (attrDoc.RootElement.TryGetProperty("doctorName", out var dn) && !string.IsNullOrWhiteSpace(dn.GetString()))
                        extractedDocName = dn.GetString()!.Trim();
                    if (attrDoc.RootElement.TryGetProperty("doctorRegNumber", out var drn) && !string.IsNullOrWhiteSpace(drn.GetString()))
                        extractedDocReg = drn.GetString()!.Trim();
                    else if (attrDoc.RootElement.TryGetProperty("doctorRegNo", out var drn2) && !string.IsNullOrWhiteSpace(drn2.GetString()))
                        extractedDocReg = drn2.GetString()!.Trim();
                }
                catch { }
            }

            // Create Invoice Master Instance
            invoice = new SalesInvoice
            {
                Id = (request.Id.HasValue && request.Id.Value != Guid.Empty) ? request.Id.Value : Guid.NewGuid(),
                TenantId = tenantId,
                InvoiceNumber = "PENDING",
            InvoiceType = effectiveInvoiceType,
            Status = InvoiceStatus.Issued,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = party?.Id,
            CustomerName = customerName,
            CustomerPhone = request.CustomerPhone?.Trim(),
            CustomerEmail = request.CustomerEmail?.Trim().ToLowerInvariant(),
            CustomerGSTIN = cleanCustGstin,
            CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant(),
            BillingAddress = request.BillingAddress?.Trim(),
            ShippingAddress = request.ShippingAddress?.Trim() ?? request.BillingAddress?.Trim(),
            BillingStateCode = supplyStateCode,
            ShippingStateCode = GstStateHelper.NormalizeStateCode(request.ShippingStateCode, null, supplyStateCode),
            PlaceOfSupply = resolvedPos,
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
            DoctorName = extractedDocName,
            DoctorRegistrationNumber = extractedDocReg,
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
                if (tx != null) await tx.RollbackAsync(cancellationToken);
                _context.ChangeTracker.Clear();
                return Result<Guid>.Failure("Item quantity must be greater than zero.", "INVALID_QUANTITY");
            }

            if (!itemsDict.TryGetValue(reqItem.ItemId, out var itm))
            {
                // Fallback: try to resolve item by Barcode or SKU for this tenant
                itm = await _context.Items
                    .FirstOrDefaultAsync(it => it.TenantId == tenantId && !it.IsDeleted && (
                        (!string.IsNullOrWhiteSpace(reqItem.BatchNumber) && it.Barcode == reqItem.BatchNumber) ||
                        (!string.IsNullOrWhiteSpace(reqItem.HsnCode) && it.Sku == reqItem.HsnCode)
                    ), cancellationToken);

                if (itm != null)
                {
                    itemsDict[reqItem.ItemId] = itm;
                }
                else
                {
                    if (tx != null) await tx.RollbackAsync(cancellationToken);
                    _context.ChangeTracker.Clear();
                    return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
                }
            }

            // Pharma / Expiry validation
            if (reqItem.BatchId.HasValue && reqItem.BatchId.Value != Guid.Empty)
            {
                if (batchesDict.TryGetValue(reqItem.BatchId.Value, out var bEntity))
                {
                    if (bEntity.IsQuarantined)
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' for item '{itm.Name}' is under regulatory quarantine and cannot be billed.", "BATCH_QUARANTINED");
                    }
                    if (bEntity.ExpiryDate != default && bEntity.ExpiryDate.Date < DateTime.UtcNow.Date)
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' for item '{itm.Name}' has expired on {bEntity.ExpiryDate:yyyy-MM-dd}.", "BATCH_EXPIRED");
                    }
                    if (!bEntity.IsActive)
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
                        return Result<Guid>.Failure($"Batch '{bEntity.BatchNumber}' is inactive.", "BATCH_INACTIVE");
                    }
                }
            }
            if (reqItem.ExpiryDate.HasValue && reqItem.ExpiryDate.Value.Date < DateTime.UtcNow.Date)
            {
                if (tx != null) await tx.RollbackAsync(cancellationToken);
                _context.ChangeTracker.Clear();
                return Result<Guid>.Failure($"Batch '{reqItem.BatchNumber ?? itm.Name}' has expired on {reqItem.ExpiryDate.Value:yyyy-MM-dd}.", "BATCH_EXPIRED");
            }

            decimal conversion = (itm.SecondaryUomId.HasValue && reqItem.UomId == itm.SecondaryUomId.Value && itm.ConversionRatio.HasValue && itm.ConversionRatio.Value > 0)
                ? itm.ConversionRatio.Value
                : 1m;

            decimal effectiveLineGstRate = (isComposition || isNonGst) ? 0m : itm.TaxRate;
            decimal effectiveLineCessRate = (isComposition || isNonGst) ? 0m : itm.CessRate;

            lineInputs.Add(new UdyogBill.Application.Services.Calculations.LineCalculationInput(
                Quantity: reqItem.Quantity,
                FreeQuantity: reqItem.FreeQuantity,
                UnitPrice: reqItem.UnitPrice,
                IsTaxInclusive: (isComposition || isNonGst) ? false : (reqItem.IsTaxInclusive ?? itm.IsTaxInclusive),
                DiscountPercent: reqItem.DiscountPercent,
                DiscountAmount: reqItem.DiscountAmount,
                GstRate: effectiveLineGstRate,
                CessRate: effectiveLineCessRate,
                IsIntraState: isIntraState,
                ConversionRatio: conversion
            ));
        }

        var (calculatedLines, invoiceTotals) = _calculationEngine.CalculateInvoice(
            lineInputs,
            request.InvoiceDiscountPercent,
            request.InvoiceDiscountAmount,
            isIntraState,
            additionalCharges: 0m,
            isReverseCharge: request.IsReverseCharge
        );

        // Process line items & in-memory stock mutations
        for (int i = 0; i < request.Items.Count; i++)
        {
            var reqItem = request.Items[i];
            var item = itemsDict[reqItem.ItemId];
            var lineCalc = calculatedLines[i];

            var effectiveUomId = (reqItem.UomId != Guid.Empty && uomsDict.ContainsKey(reqItem.UomId))
                ? reqItem.UomId
                : (item.PrimaryUomId != Guid.Empty && uomsDict.ContainsKey(item.PrimaryUomId)
                    ? item.PrimaryUomId
                    : (uomsDict.Keys.Any() ? uomsDict.Keys.First() : Guid.Empty));

            string uomCode = "UNIT";
            if (effectiveUomId != Guid.Empty && uomsDict.TryGetValue(effectiveUomId, out var uom))
            {
                uomCode = uom.Code ?? "UNIT";
            }

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

            // Auto-resolve Variant if not passed but item has variants and size/color are present
            if (!reqItem.VariantId.HasValue && item.TrackVariants && itemVariantsList.Any())
            {
                string? searchSize = itemAttrs.TryGetValue("size", out var sVal) ? sVal?.ToString()?.Trim() : null;
                string? searchColor = itemAttrs.TryGetValue("color", out var cVal) ? cVal?.ToString()?.Trim() : null;
                if (!string.IsNullOrWhiteSpace(searchSize) || !string.IsNullOrWhiteSpace(searchColor))
                {
                    var matchedV = itemVariantsList.FirstOrDefault(v =>
                    {
                        if (v.ItemId != item.Id) return false;
                        var (vSz, vCol) = ExtractSizeAndColor(v.AttributesJson);
                        bool sizeMatches = string.IsNullOrWhiteSpace(searchSize) || string.Equals(vSz, searchSize, StringComparison.OrdinalIgnoreCase);
                        bool colorMatches = string.IsNullOrWhiteSpace(searchColor) || string.Equals(vCol, searchColor, StringComparison.OrdinalIgnoreCase);
                        return sizeMatches && colorMatches;
                    });
                    if (matchedV != null)
                    {
                        reqItem.VariantId = matchedV.Id;
                        if (!variantsDict.ContainsKey(matchedV.Id)) variantsDict[matchedV.Id] = matchedV;
                    }
                }
            }

            // If VariantId is set, enrich attributesJson with size, color, styleCode and variantName
            if (reqItem.VariantId.HasValue && variantsDict.TryGetValue(reqItem.VariantId.Value, out var resolvedVariant))
            {
                if (!string.IsNullOrWhiteSpace(resolvedVariant.AttributesJson))
                {
                    try
                    {
                        using var vDoc = System.Text.Json.JsonDocument.Parse(resolvedVariant.AttributesJson);
                        if (vDoc.RootElement.TryGetProperty("size", out var sProp) && !itemAttrs.ContainsKey("size"))
                        {
                            var szStr = sProp.GetString()?.Trim();
                            if (!string.IsNullOrWhiteSpace(szStr)) itemAttrs["size"] = szStr;
                        }
                        if (vDoc.RootElement.TryGetProperty("color", out var cProp) && !itemAttrs.ContainsKey("color"))
                        {
                            var cStr = cProp.GetString()?.Trim();
                            if (!string.IsNullOrWhiteSpace(cStr)) itemAttrs["color"] = cStr;
                        }
                        if (vDoc.RootElement.TryGetProperty("styleCode", out var stProp) && !itemAttrs.ContainsKey("styleCode"))
                        {
                            var stStr = stProp.GetString()?.Trim();
                            if (!string.IsNullOrWhiteSpace(stStr)) itemAttrs["styleCode"] = stStr;
                        }
                    }
                    catch { }
                }
                if (!itemAttrs.ContainsKey("variantName") && !string.IsNullOrWhiteSpace(resolvedVariant.VariantName))
                {
                    itemAttrs["variantName"] = resolvedVariant.VariantName;
                }
            }

            bool shouldDepleteStock = item.ItemType != ItemType.Service && item.TrackInventory;
            Guid? effectiveBatchId = reqItem.BatchId;
            string batchNo = reqItem.BatchNumber;
            DateTime? expiryDate = reqItem.ExpiryDate.HasValue 
                ? DateTime.SpecifyKind(reqItem.ExpiryDate.Value, DateTimeKind.Utc) 
                : null;

            if (shouldDepleteStock)
            {
                ItemWarehouseStock? stock = null;

                if (item.TrackBatches)
                {
                    if (effectiveBatchId.HasValue && effectiveBatchId.Value != Guid.Empty)
                    {
                        stock = existingStocks.FirstOrDefault(s => s.ItemId == reqItem.ItemId && 
                            s.VariantId == reqItem.VariantId &&
                            s.BatchId == effectiveBatchId.Value);
                    }
                    else
                    {
                        // Auto-select batch using FEFO (First Expired First Out) with available stock
                        var candidateStocks = existingStocks
                            .Where(s => s.ItemId == reqItem.ItemId && 
                                        s.VariantId == reqItem.VariantId && 
                                        s.BatchId.HasValue && 
                                        s.CurrentQuantity > 0 &&
                                        (s.Batch == null || (!s.Batch.IsQuarantined && s.Batch.ExpiryDate >= DateTime.UtcNow.Date)))
                            .OrderBy(s => s.Batch != null ? s.Batch.ExpiryDate : DateTime.MaxValue)
                            .ThenByDescending(s => s.CurrentQuantity)
                            .ToList();

                        stock = candidateStocks.FirstOrDefault(s => s.CurrentQuantity >= lineCalc.TotalPhysicalQuantity)
                                ?? candidateStocks.FirstOrDefault();

                        if (stock != null)
                        {
                            effectiveBatchId = stock.BatchId;
                        }
                    }
                }
                else
                {
                    stock = existingStocks.FirstOrDefault(s => s.ItemId == reqItem.ItemId && 
                        s.VariantId == reqItem.VariantId &&
                        (!effectiveBatchId.HasValue || effectiveBatchId.Value == Guid.Empty ? s.BatchId == null : s.BatchId == effectiveBatchId.Value));
                }

                decimal beforeQty = stock?.CurrentQuantity ?? 0m;
                decimal physicalOut = lineCalc.TotalPhysicalQuantity;

                if (!allowNegativeStock && request.InvoiceType != InvoiceType.POSBill && beforeQty < physicalOut)
                {
                    var batchStr = effectiveBatchId.HasValue && batchesDict.TryGetValue(effectiveBatchId.Value, out var b) ? $" (Batch: {b.BatchNumber})" : "";
                    if (tx != null) await tx.RollbackAsync(cancellationToken);
                    _context.ChangeTracker.Clear();
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
                        BatchId = effectiveBatchId,
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
                    BatchId = effectiveBatchId,
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

            // Populate batch number and expiry date from loaded batch if available
            if (effectiveBatchId.HasValue && batchesDict.TryGetValue(effectiveBatchId.Value, out var resolvedBatch))
            {
                if (string.IsNullOrWhiteSpace(batchNo))
                    batchNo = resolvedBatch.BatchNumber;
                if (!expiryDate.HasValue && resolvedBatch.ExpiryDate != default)
                    expiryDate = DateTime.SpecifyKind(resolvedBatch.ExpiryDate, DateTimeKind.Utc);
            }

            if (reqItem.FreeQuantity > 0) itemAttrs["freeQuantity"] = reqItem.FreeQuantity;
            if (lineInputs[i].ConversionRatio.HasValue && lineInputs[i].ConversionRatio.Value != 1m) 
                itemAttrs["conversionRatio"] = lineInputs[i].ConversionRatio.Value;
            if (lineCalc.NetEffectiveRate > 0) itemAttrs["netEffectiveRate"] = lineCalc.NetEffectiveRate;
            if (!string.IsNullOrWhiteSpace(reqItem.Packing)) itemAttrs["packing"] = reqItem.Packing;
            if (reqItem.Ptr > 0) itemAttrs["ptr"] = reqItem.Ptr;
            if (reqItem.Pts > 0) itemAttrs["pts"] = reqItem.Pts;
            if (!string.IsNullOrWhiteSpace(reqItem.LineDescription)) itemAttrs["lineDescription"] = reqItem.LineDescription.Trim();

            var lineItem = new SalesInvoiceItem
            {
                TenantId = tenantId,
                Invoice = invoice,
                ItemId = item.Id,
                VariantId = reqItem.VariantId,
                ItemSku = item.Sku,
                ItemName = !string.IsNullOrWhiteSpace(reqItem.ItemName) ? reqItem.ItemName.Trim() : item.Name,
                HsnCode = !string.IsNullOrWhiteSpace(reqItem.HsnCode) ? reqItem.HsnCode : item.HSNCode,
                Barcode = item.Barcode,
                BatchId = effectiveBatchId,
                BatchNumber = batchNo,
                ExpiryDate = expiryDate,
                Quantity = reqItem.Quantity,
                UomId = effectiveUomId,
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
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
                        return Result<Guid>.Failure($"IMEI/Serial '{imeiStr}' has not been inwarded. Please inward via Purchase Bill or GRN first.", "SERIAL_NOT_INWARDED");
                    }
                    if (existingSerial.Status == "Sold")
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
                        return Result<Guid>.Failure($"IMEI/Serial '{imeiStr}' for product '{item.Name}' has already been sold on another invoice.", "SERIAL_ALREADY_SOLD");
                    }
                    if (existingSerial.Status != "InStock" && existingSerial.Status != "Available")
                    {
                        if (tx != null) await tx.RollbackAsync(cancellationToken);
                        _context.ChangeTracker.Clear();
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
        else if (paid > 0m && Math.Abs(roundedTotal - paid) <= 1.0m)
        {
            // Snap only when customer paid nearly full amount (within roundoff ₹1)
            var grossUnrounded = invoiceTotals.TaxableAmount + invoiceTotals.CgstAmount + invoiceTotals.SgstAmount + invoiceTotals.IgstAmount + invoiceTotals.CessAmount;
            if (Math.Abs(paid - grossUnrounded) < 0.05m || Math.Abs(paid - roundedTotal) < 0.50m)
            {
                paid = roundedTotal;
            }
        }

        invoice.PaidAmount = paid;
        invoice.BalanceAmount = roundedTotal - paid;
        invoice.PaymentStatus = invoice.BalanceAmount == 0 
            ? PaymentStatus.FullyPaid 
            : (paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);

        invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

        if (request.PaymentSplits != null && request.PaymentSplits.Any(s => s.Amount > 0))
        {
            var validSplits = request.PaymentSplits.Where(s => s.Amount > 0).ToList();
            paid = validSplits.Sum(s => s.Amount);
            invoice.PaidAmount = paid;
            invoice.BalanceAmount = Math.Max(0m, invoice.TotalAmount - paid);
            invoice.PaymentStatus = invoice.BalanceAmount <= 0.01m
                ? PaymentStatus.FullyPaid
                : (paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);
            invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

            foreach (var split in validSplits)
            {
                invoice.Payments.Add(new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    Invoice = invoice,
                    PaymentDate = split.PaymentDate ?? invDate,
                    Amount = split.Amount,
                    PaymentMode = split.PaymentMode,
                    TransactionReference = split.TransactionReference,
                    Notes = string.IsNullOrWhiteSpace(split.Notes) ? $"Split Payment ({split.PaymentMode})" : split.Notes
                });
            }
        }
        else if (paid > 0)
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

            if (request.PaymentSplits != null && request.PaymentSplits.Any(s => s.Amount > 0))
            {
                var validSplits = request.PaymentSplits.Where(s => s.Amount > 0).ToList();
                foreach (var split in validSplits)
                {
                    var creditBalance = party.CurrentOutstandingBalance - split.Amount;
                    party.CurrentOutstandingBalance = creditBalance;

                    var paymentLedger = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = split.PaymentDate ?? invDate,
                        EntryType = PartyLedgerEntryType.PaymentReceipt,
                        DebitAmount = 0m,
                        CreditAmount = split.Amount,
                        RunningBalance = creditBalance,
                        ReferenceDocumentType = "PaymentReceipt",
                        ReferenceDocumentId = invoice.Id,
                        ReferenceDocumentNumber = "PENDING",
                        PaymentMode = split.PaymentMode.ToString(),
                        Description = $"Split payment received ({split.PaymentMode}) - Ref: {split.TransactionReference ?? "N/A"}"
                    };
                    _context.PartyLedgerEntries.Add(paymentLedger);
                }
            }
            else if (paid > 0)
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
        DocumentSeriesConfigDto? seriesConfig = null;
        var seriesSetting = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Category == "Invoice" && s.Key == "DocumentSeriesConfig", cancellationToken);
        if (seriesSetting != null && !string.IsNullOrWhiteSpace(seriesSetting.Value))
        {
            try
            {
                seriesConfig = JsonSerializer.Deserialize<DocumentSeriesConfigDto>(
                    seriesSetting.Value,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { }
        }

        DocumentSeriesItemDto? activeSeries = null;
        if (seriesConfig != null)
        {
            if (isNonGst || effectiveInvoiceType == InvoiceType.SalesEstimate)
            {
                activeSeries = seriesConfig.CashMemo;
            }
            else if (effectiveInvoiceType == InvoiceType.POSBill)
            {
                activeSeries = isNonGst ? seriesConfig.CashMemo : seriesConfig.TaxInvoice;
            }
            else if (effectiveInvoiceType == InvoiceType.TaxInvoice || effectiveInvoiceType == InvoiceType.BillOfSupply)
            {
                activeSeries = isNonGst ? seriesConfig.CashMemo : seriesConfig.TaxInvoice;
            }
            else if (effectiveInvoiceType == InvoiceType.ProformaInvoice)
            {
                activeSeries = seriesConfig.Quotation;
            }
        }

        string currentNumber;
        if (activeSeries != null && !string.IsNullOrWhiteSpace(activeSeries.Prefix))
        {
            var customPrefix = activeSeries.Prefix.Trim();
            var customSuffix = activeSeries.Suffix?.Trim() ?? string.Empty;
            int padding = activeSeries.Padding;

            await AcquireSequenceLockAsync(tenantId, customPrefix, fy, cancellationToken);

            var existingInvoices = await _context.SalesInvoices
                .Where(i => i.TenantId == tenantId && i.InvoiceNumber.StartsWith(customPrefix))
                .Select(i => i.InvoiceNumber)
                .ToListAsync(cancellationToken);

            int maxNum = Math.Max(0, activeSeries.NextNumber - 1);
            foreach (var invNum in existingInvoices)
            {
                if (string.IsNullOrWhiteSpace(invNum) || invNum.Length <= customPrefix.Length)
                    continue;

                var middle = invNum.Substring(customPrefix.Length);
                if (!string.IsNullOrEmpty(customSuffix) && middle.EndsWith(customSuffix, StringComparison.OrdinalIgnoreCase))
                {
                    middle = middle.Substring(0, middle.Length - customSuffix.Length);
                }

                if (int.TryParse(middle, out int parsed))
                {
                    if (parsed > maxNum) maxNum = parsed;
                }
                else
                {
                    var digits = new string(middle.TakeWhile(char.IsDigit).ToArray());
                    if (int.TryParse(digits, out int leadParsed) && leadParsed > maxNum)
                    {
                        maxNum = leadParsed;
                    }
                }
            }

            int nextVal = maxNum + 1;
            string numPart = padding > 1 ? nextVal.ToString().PadLeft(padding, '0') : nextVal.ToString();
            currentNumber = $"{customPrefix}{numPart}{customSuffix}";
        }
        else
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

            currentNumber = $"{prefix}-{fy}-{nextNum:D5}";
        }

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
            foreach (var p in invoice.Payments)
            {
                await AutoPostPaymentToGeneralLedgerAsync(invoice, p, cancellationToken);
            }

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

            // Jewellery Pillar Inter-linking: Old Gold Exchange & Kitty Scheme Redemption
            if (!string.IsNullOrWhiteSpace(request.AttributesJson))
            {
                try
                {
                    using var jDoc = JsonDocument.Parse(request.AttributesJson);
                    if (jDoc.RootElement.TryGetProperty("oldGoldVoucherId", out var ogvProp) &&
                        Guid.TryParse(ogvProp.GetString(), out var oldGoldVoucherId) &&
                        oldGoldVoucherId != Guid.Empty)
                    {
                        var voucher = await _context.OldGoldExchangeVouchers
                            .FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == oldGoldVoucherId && !v.IsDeleted, cancellationToken);
                        if (voucher != null)
                        {
                            voucher.InvoiceId = invoice.Id;
                            voucher.Status = OldGoldStatus.AdjustedAgainstInvoice;
                        }
                    }

                    if (jDoc.RootElement.TryGetProperty("kittySchemeId", out var ksProp) &&
                        Guid.TryParse(ksProp.GetString(), out var kittySchemeId) &&
                        kittySchemeId != Guid.Empty)
                    {
                        var scheme = await _context.GoldSavingsSchemes
                            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == kittySchemeId && !s.IsDeleted, cancellationToken);
                        if (scheme != null)
                        {
                            scheme.RedeemedInvoiceId = invoice.Id;
                            scheme.Status = GoldSavingsSchemeStatus.RedeemedAgainstPurchase;
                        }
                    }
                }
                catch { }
            }

            await _context.SaveChangesAsync(cancellationToken);
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true
                                        || ex.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) == true
                                        || ex.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
                                        || ex.Message.Contains("unique", StringComparison.OrdinalIgnoreCase))
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            _logger?.LogError(ex, "Duplicate invoice number constraint violation for tenant {TenantId}: {Message}", tenantId, ex.Message);
            return Result<Guid>.Failure("A document with this invoice number already exists or concurrent generation conflict occurred. Please retry.", "DUPLICATE_INVOICE_NUMBER");
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _context.ChangeTracker.Clear();
            _logger?.LogError(ex, "Failed to create sales invoice {InvoiceNumber} for tenant {TenantId}: {Message}", invoice?.InvoiceNumber ?? "UNKNOWN", tenantId, ex.Message);
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
        var prevItemIds = invoice.Items.Select(x => x.ItemId).Distinct().ToList();
        var prevItemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && prevItemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        foreach (var item in invoice.Items.ToList())
        {
            if (prevItemsDict.TryGetValue(item.ItemId, out var masterItem) && masterItem.ItemType == ItemType.Service)
            {
                // Do not alter inventory for service items
            }
            else
            {
                decimal freeQty = 0m;
                decimal conversion = 1m;
                if (!string.IsNullOrWhiteSpace(item.AttributesJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                        if (doc.RootElement.TryGetProperty("freeQuantity", out var fq))
                        {
                            if (fq.ValueKind == System.Text.Json.JsonValueKind.Number) freeQty = fq.GetDecimal();
                            else if (decimal.TryParse(fq.GetString(), out var fqVal)) freeQty = fqVal;
                        }
                        if (doc.RootElement.TryGetProperty("conversionRatio", out var cr))
                        {
                            if (cr.ValueKind == System.Text.Json.JsonValueKind.Number) conversion = cr.GetDecimal();
                            else if (decimal.TryParse(cr.GetString(), out var crVal)) conversion = crVal;
                        }
                    }
                    catch { }
                }

                if (conversion <= 0m) conversion = 1m;
                decimal restoredUnits = (item.Quantity + freeQty) * conversion;

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

                var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
                if (stock != null)
                {
                    stock.CurrentQuantity += restoredUnits;
                }
            }

            item.IsDeleted = true;
            item.DeletedAtUtc = DateTime.UtcNow;
            item.DeletedBy = _currentUserContext.UserId;
        }

        // Soft-delete previous outward stock movements for this edited invoice to prevent duplicate audit logs in movement ledger
        var previousOutwardMovements = await _context.StockMovements
            .Where(sm => sm.TenantId == tenantId
                      && sm.ReferenceDocumentType == "SalesInvoice"
                      && sm.ReferenceDocumentId == invoice.Id
                      && !sm.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var prevMov in previousOutwardMovements)
        {
            prevMov.IsDeleted = true;
            prevMov.DeletedAtUtc = DateTime.UtcNow;
            prevMov.DeletedBy = _currentUserContext.UserId;
        }

        // 2. Fetch required master references
        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == invoice.BranchId && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        var tenantObj = await _context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        var sellerStateCode = GstStateHelper.NormalizeStateCode(
            branch?.StateCode ?? tenantObj?.StateCode ?? tenantObj?.State,
            branch?.GSTIN ?? tenantObj?.GSTIN,
            "09");

        string? rawSupplyStateCode = null;
        if (!string.IsNullOrWhiteSpace(request.CustomerGSTIN) && request.CustomerGSTIN.Trim().Length >= 2 && char.IsDigit(request.CustomerGSTIN.Trim()[0]) && char.IsDigit(request.CustomerGSTIN.Trim()[1]))
        {
            rawSupplyStateCode = request.CustomerGSTIN.Trim().Substring(0, 2);
        }
        else if (!string.IsNullOrWhiteSpace(request.BillingStateCode))
        {
            rawSupplyStateCode = request.BillingStateCode.Trim();
        }

        var supplyStateCode = GstStateHelper.NormalizeStateCode(rawSupplyStateCode, request.CustomerGSTIN, sellerStateCode);

        var isIntraState = string.Equals(sellerStateCode, supplyStateCode, StringComparison.OrdinalIgnoreCase);

        var itemIds = request.Items.Select(it => it.ItemId).Distinct().ToList();

        var itemsDict = await _context.Items
            .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
            .ToDictionaryAsync(it => it.Id, cancellationToken);

        var uomIds = request.Items.Select(it => it.UomId).Where(id => id != Guid.Empty).ToList();
        uomIds.AddRange(itemsDict.Values.Select(it => it.PrimaryUomId).Where(id => id != Guid.Empty));
        var distinctUomIds = uomIds.Distinct().ToList();

        var uomsDict = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && distinctUomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        if (!uomsDict.Any())
        {
            var fallbackUoms = await _context.UnitsOfMeasure
                .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                .Take(5)
                .ToListAsync(cancellationToken);
            foreach (var fu in fallbackUoms) uomsDict[fu.Id] = fu;
        }

        var existingStocks = await _context.ItemWarehouseStocks
            .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId) && s.WarehouseId == invoice.WarehouseId && !s.IsDeleted)
            .ToListAsync(cancellationToken);

        var customerName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName.Trim() : invoice.CustomerName;
        var cleanCustGstin = request.CustomerGSTIN?.Trim().ToUpperInvariant();
        var branchStateName = branch?.State ?? GstStateHelper.GetStateNameByCode(sellerStateCode);
        var resolvedPos = GstStateHelper.ResolvePlaceOfSupply(
            cleanCustGstin,
            request.PlaceOfSupply,
            request.BillingStateCode,
            branch?.GSTIN,
            branchStateName,
            sellerStateCode);

        var oldTotal = invoice.TotalAmount;
        var oldPaid = invoice.PaidAmount;
        var partyIdToUse = request.PartyId ?? invoice.PartyId;
        var party = partyIdToUse.HasValue
            ? await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyIdToUse.Value && !p.IsDeleted, cancellationToken)
            : null;

        // 3. Update Invoice Metadata
        invoice.PartyId = request.PartyId ?? invoice.PartyId;
        invoice.CustomerName = customerName;
        invoice.CustomerPhone = request.CustomerPhone?.Trim() ?? invoice.CustomerPhone;
        invoice.CustomerEmail = request.CustomerEmail?.Trim().ToLowerInvariant() ?? invoice.CustomerEmail;
        invoice.CustomerGSTIN = cleanCustGstin;
        invoice.CustomerPAN = request.CustomerPAN?.Trim().ToUpperInvariant();
        invoice.BillingAddress = request.BillingAddress?.Trim();
        invoice.ShippingAddress = request.ShippingAddress?.Trim() ?? request.BillingAddress?.Trim();
        invoice.BillingStateCode = supplyStateCode;
        invoice.ShippingStateCode = GstStateHelper.NormalizeStateCode(request.ShippingStateCode, null, supplyStateCode);
        invoice.PlaceOfSupply = resolvedPos;
        invoice.TaxSupplyType = isIntraState ? TaxSupplyType.IntraState : TaxSupplyType.InterState;
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
            try
            {
                using var attrDoc = System.Text.Json.JsonDocument.Parse(request.AttributesJson);
                if (attrDoc.RootElement.TryGetProperty("doctorName", out var dn) && !string.IsNullOrWhiteSpace(dn.GetString()))
                    invoice.DoctorName = dn.GetString()!.Trim();
                if (attrDoc.RootElement.TryGetProperty("doctorRegNumber", out var drn) && !string.IsNullOrWhiteSpace(drn.GetString()))
                    invoice.DoctorRegistrationNumber = drn.GetString()!.Trim();
                else if (attrDoc.RootElement.TryGetProperty("doctorRegNo", out var drn2) && !string.IsNullOrWhiteSpace(drn2.GetString()))
                    invoice.DoctorRegistrationNumber = drn2.GetString()!.Trim();
            }
            catch { }
        }

        bool isNonGst = invoice.InvoiceType == InvoiceType.SalesEstimate
            || (!string.IsNullOrWhiteSpace(request.AttributesJson) && (
                request.AttributesJson.Contains("\"billingMode\":\"NON_GST\"") ||
                request.AttributesJson.Contains("\"billingMode\":\"non_gst\"") ||
                request.AttributesJson.Contains("\"taxTreatment\":\"NON_GST\"") ||
                request.AttributesJson.Contains("\"isNonGst\":true") ||
                request.AttributesJson.Contains("\"isCashMemo\":true")
            ))
            || (!string.IsNullOrWhiteSpace(invoice.AttributesJson) && (
                invoice.AttributesJson.Contains("\"billingMode\":\"NON_GST\"") ||
                invoice.AttributesJson.Contains("\"billingMode\":\"non_gst\"") ||
                invoice.AttributesJson.Contains("\"taxTreatment\":\"NON_GST\"") ||
                invoice.AttributesJson.Contains("\"isNonGst\":true") ||
                invoice.AttributesJson.Contains("\"isCashMemo\":true")
            ));

        // 4. Prepare inputs for Canonical Calculation Engine
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

            bool isComposition = (tenantObj?.IsCompositionScheme == true) || (invoice.InvoiceType == InvoiceType.BillOfSupply);
            decimal effectiveLineGstRate = (isComposition || isNonGst) ? 0m : itm.TaxRate;
            decimal effectiveLineCessRate = (isComposition || isNonGst) ? 0m : itm.CessRate;

            lineInputs.Add(new UdyogBill.Application.Services.Calculations.LineCalculationInput(
                Quantity: reqItem.Quantity,
                FreeQuantity: reqItem.FreeQuantity,
                UnitPrice: reqItem.UnitPrice,
                IsTaxInclusive: (isComposition || isNonGst) ? false : (reqItem.IsTaxInclusive ?? itm.IsTaxInclusive),
                DiscountPercent: reqItem.DiscountPercent,
                DiscountAmount: reqItem.DiscountAmount,
                GstRate: effectiveLineGstRate,
                CessRate: effectiveLineCessRate,
                IsIntraState: isIntraState,
                ConversionRatio: conversion
            ));
        }

        var (calculatedLines, invoiceTotals) = _calculationEngine.CalculateInvoice(
            lineInputs,
            request.InvoiceDiscountPercent,
            request.InvoiceDiscountAmount,
            isIntraState,
            additionalCharges: 0m,
            isReverseCharge: request.IsReverseCharge
        );

        // 5. Process line items, stock mutations and entity creation
        for (int i = 0; i < request.Items.Count; i++)
        {
            var reqItem = request.Items[i];
            var item = itemsDict[reqItem.ItemId];
            var lineCalc = calculatedLines[i];

            var effectiveUomId = (reqItem.UomId != Guid.Empty && uomsDict.ContainsKey(reqItem.UomId))
                ? reqItem.UomId
                : (item.PrimaryUomId != Guid.Empty && uomsDict.ContainsKey(item.PrimaryUomId)
                    ? item.PrimaryUomId
                    : (uomsDict.Keys.Any() ? uomsDict.Keys.First() : Guid.Empty));

            string uomCode = "UNIT";
            if (effectiveUomId != Guid.Empty && uomsDict.TryGetValue(effectiveUomId, out var uom))
            {
                uomCode = uom.Code ?? "UNIT";
            }

            decimal conversion = (item.SecondaryUomId.HasValue && reqItem.UomId == item.SecondaryUomId.Value && item.ConversionRatio.HasValue && item.ConversionRatio.Value > 0)
                ? item.ConversionRatio.Value
                : 1m;

            if (item.ItemType != ItemType.Service && item.TrackInventory)
            {
                var stock = existingStocks.FirstOrDefault(s => s.ItemId == reqItem.ItemId && 
                    (!reqItem.BatchId.HasValue || reqItem.BatchId.Value == Guid.Empty || s.BatchId == reqItem.BatchId.Value));

                decimal physicalOut = lineCalc.TotalPhysicalQuantity;
                decimal beforeQty = 0m;
                if (stock == null)
                {
                    stock = new ItemWarehouseStock
                    {
                        TenantId = tenantId,
                        ItemId = item.Id,
                        WarehouseId = invoice.WarehouseId,
                        BatchId = reqItem.BatchId,
                        CurrentQuantity = -physicalOut,
                        ReservedQuantity = 0
                    };
                    _context.ItemWarehouseStocks.Add(stock);
                    existingStocks.Add(stock);
                }
                else
                {
                    beforeQty = stock.CurrentQuantity;
                    stock.CurrentQuantity -= physicalOut;
                }

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    WarehouseId = invoice.WarehouseId,
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
                    Notes = $"Sales outward to {customerName} (Edited)"
                };
                _context.StockMovements.Add(movement);
            }

            var itemMrp = reqItem.Mrp > 0 ? reqItem.Mrp : item.MRP;

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
            if (conversion > 0) itemAttrs["conversionRatio"] = conversion;
            if (!string.IsNullOrWhiteSpace(reqItem.Packing)) itemAttrs["packing"] = reqItem.Packing;
            if (reqItem.Ptr > 0) itemAttrs["ptr"] = reqItem.Ptr;
            if (reqItem.Pts > 0) itemAttrs["pts"] = reqItem.Pts;
            if (!string.IsNullOrWhiteSpace(reqItem.LineDescription)) itemAttrs["lineDescription"] = reqItem.LineDescription.Trim();

            var lineItem = new SalesInvoiceItem
            {
                TenantId = tenantId,
                Invoice = invoice,
                ItemId = item.Id,
                VariantId = reqItem.VariantId,
                ItemSku = item.Sku,
                ItemName = !string.IsNullOrWhiteSpace(reqItem.ItemName) ? reqItem.ItemName.Trim() : item.Name,
                HsnCode = !string.IsNullOrWhiteSpace(reqItem.HsnCode) ? reqItem.HsnCode : item.HSNCode,
                Barcode = item.Barcode,
                BatchId = reqItem.BatchId,
                BatchNumber = batchNo,
                ExpiryDate = expiryDate,
                Quantity = reqItem.Quantity,
                UomId = effectiveUomId,
                UomCode = uomCode,
                UnitPrice = reqItem.UnitPrice,
                Mrp = itemMrp,
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

            _context.SalesInvoiceItems.Add(lineItem);
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
        decimal updatePaid = Math.Min(Math.Max(0m, request.PaidAmount), roundedTotal);
        if (request.PrimaryPaymentMode == PaymentMode.CreditAccount)
        {
            updatePaid = 0m;
        }
        else if (updatePaid > 0m && Math.Abs(roundedTotal - updatePaid) <= 1.0m && (Math.Abs(updatePaid - (invoiceTotals.TaxableAmount + invoiceTotals.CgstAmount + invoiceTotals.SgstAmount + invoiceTotals.IgstAmount + invoiceTotals.CessAmount)) < 0.05m || Math.Abs(updatePaid - roundedTotal) < 0.50m))
        {
            updatePaid = roundedTotal;
        }

        invoice.PrimaryPaymentMode = request.PrimaryPaymentMode;
        invoice.PaidAmount = updatePaid;
        invoice.BalanceAmount = Math.Max(0m, roundedTotal - updatePaid);
        invoice.PaymentStatus = invoice.BalanceAmount == 0 
            ? PaymentStatus.FullyPaid 
            : (updatePaid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid);
        invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

        // Synchronize payment records
        if (updatePaid == 0)
        {
            foreach (var p in invoice.Payments)
            {
                p.IsDeleted = true;
                p.DeletedAtUtc = DateTime.UtcNow;
            }
        }
        else
        {
            var primaryPayment = invoice.Payments.FirstOrDefault(p => !p.IsDeleted);
            if (primaryPayment != null)
            {
                primaryPayment.Amount = updatePaid;
                primaryPayment.PaymentMode = request.PrimaryPaymentMode;
            }
            else
            {
                _context.SalesInvoicePayments.Add(new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    Invoice = invoice,
                    PaymentDate = invoice.InvoiceDate,
                    Amount = updatePaid,
                    PaymentMode = request.PrimaryPaymentMode,
                    TransactionReference = request.PaymentReferenceNumber,
                    Notes = "Updated invoice payment"
                });
            }
        }

        // Party Financial Ledger Delta Adjustment
        var invoiceDelta = invoiceTotals.RoundedTotal - oldTotal;
        var paidDelta = updatePaid - oldPaid;

        if (party != null)
        {
            if (invoiceDelta != 0)
            {
                party.CurrentOutstandingBalance += invoiceDelta;
                _context.PartyLedgerEntries.Add(new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = invoiceDelta > 0 ? PartyLedgerEntryType.DebitNote : PartyLedgerEntryType.CreditNote,
                    DebitAmount = invoiceDelta > 0 ? invoiceDelta : 0m,
                    CreditAmount = invoiceDelta < 0 ? Math.Abs(invoiceDelta) : 0m,
                    RunningBalance = party.CurrentOutstandingBalance,
                    ReferenceDocumentType = "SalesInvoice",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Description = $"Invoice amendment delta ({invoice.InvoiceNumber})"
                });
            }

            if (paidDelta != 0)
            {
                party.CurrentOutstandingBalance -= paidDelta;
                _context.PartyLedgerEntries.Add(new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = paidDelta > 0 ? PartyLedgerEntryType.PaymentReceipt : PartyLedgerEntryType.CashRefund,
                    DebitAmount = paidDelta < 0 ? Math.Abs(paidDelta) : 0m,
                    CreditAmount = paidDelta > 0 ? paidDelta : 0m,
                    RunningBalance = party.CurrentOutstandingBalance,
                    ReferenceDocumentType = "SalesInvoicePayment",
                    ReferenceDocumentId = invoice.Id,
                    ReferenceDocumentNumber = invoice.InvoiceNumber,
                    Description = $"Payment amendment on {invoice.InvoiceNumber}"
                });
            }
        }

        // Auto-post updated values to General Ledger
        try
        {
            var existingVoucher = await _context.JournalVouchers
                .Include(v => v.Legs)
                .FirstOrDefaultAsync(v => v.TenantId == tenantId && v.ReferenceNumber == invoice.InvoiceNumber && v.VoucherType == "Journal" && !v.IsDeleted, cancellationToken);

            if (existingVoucher != null)
            {
                // Create a balancing reversal voucher to reverse superseded posting
                var revVoucher = new JournalVoucher
                {
                    TenantId = tenantId,
                    VoucherNumber = $"JV-REV-{invoice.InvoiceNumber}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}",
                    VoucherDate = DateTime.UtcNow,
                    VoucherType = "Reversal",
                    ReferenceNumber = invoice.InvoiceNumber,
                    TotalDebit = existingVoucher.TotalDebit,
                    TotalCredit = existingVoucher.TotalCredit,
                    Narration = $"Reversal of superseded voucher {existingVoucher.VoucherNumber} for invoice amendment",
                    CreatedByName = "System Auto-Posting"
                };

                foreach (var oldLeg in existingVoucher.Legs)
                {
                    var acc = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.Id == oldLeg.AccountId, cancellationToken);
                    if (acc != null)
                    {
                        if (oldLeg.DebitAmount > 0) acc.CurrentBalance -= oldLeg.DebitAmount;
                        if (oldLeg.CreditAmount > 0) acc.CurrentBalance -= oldLeg.CreditAmount;
                    }

                    revVoucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = oldLeg.AccountId,
                        DebitAmount = oldLeg.CreditAmount, // swap Debit and Credit to reverse
                        CreditAmount = oldLeg.DebitAmount,
                        Narration = $"Reversal: {oldLeg.Narration}"
                    });
                }
                _context.JournalVouchers.Add(revVoucher);
                existingVoucher.VoucherType = "Superseded";
            }

            // Post new updated journal voucher
            await AutoPostInvoiceToGeneralLedgerAsync(invoice, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to update GL auto-posting for invoice {InvoiceNumber}: {Message}", invoice.InvoiceNumber, ex.Message);
        }

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

        var semaphore = _tenantInvoiceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        try
        {
            await AcquirePaymentLockAsync(request.InvoiceId, cancellationToken);

            var invoice = await _context.SalesInvoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.InvoiceId && !i.IsDeleted, cancellationToken);

            if (invoice == null)
            {
                if (tx != null) await tx.RollbackAsync(cancellationToken);
                return Result<Guid>.Failure("Invoice not found.", "NOT_FOUND");
            }

            if (invoice.IsCancelled)
            {
                if (tx != null) await tx.RollbackAsync(cancellationToken);
                return Result<Guid>.Failure("Cannot accept payment for cancelled invoice.", "INVOICE_CANCELLED");
            }

            if (!string.IsNullOrWhiteSpace(request.TransactionReference))
            {
                var existingPayment = invoice.Payments.FirstOrDefault(p =>
                    !p.IsDeleted && string.Equals(p.TransactionReference, request.TransactionReference.Trim(), StringComparison.OrdinalIgnoreCase));
                if (existingPayment != null)
                {
                    if (tx != null) await tx.RollbackAsync(cancellationToken);
                    return Result<Guid>.Success(existingPayment.Id);
                }
            }

            if (invoice.PaymentStatus == PaymentStatus.FullyPaid || invoice.Status == InvoiceStatus.Paid || invoice.BalanceAmount <= 0)
            {
                if (tx != null) await tx.RollbackAsync(cancellationToken);
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

            await AutoPostPaymentToGeneralLedgerAsync(invoice, payment, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            if (tx != null)
            {
                await tx.CommitAsync(cancellationToken);
            }

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
        catch
        {
            if (tx != null)
            {
                try { await tx.RollbackAsync(cancellationToken); } catch { }
            }
            throw;
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task<Result> CancelInvoiceAsync(Guid invoiceId, CancelInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Include(i => i.Items)
            .Include(i => i.Payments)
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
                var newBal = party.CurrentOutstandingBalance - invoice.TotalAmount;
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

        // Void any recorded payments on this invoice
        if (invoice.Payments != null)
        {
            foreach (var pmt in invoice.Payments.Where(p => !p.IsDeleted))
            {
                pmt.IsDeleted = true;
                pmt.DeletedAtUtc = DateTimeOffset.UtcNow;
                pmt.Notes = (pmt.Notes ?? "") + $" | Auto-voided on invoice cancellation: {request.CancellationReason}";
            }
        }
        invoice.PaidAmount = 0m;
        invoice.BalanceAmount = 0m;

        // Restore any linked Jewellery Old Gold Exchange Vouchers to InSafeVault
        var linkedOldGoldVouchers = await _context.OldGoldExchangeVouchers
            .Where(v => v.TenantId == tenantId && v.InvoiceId == invoice.Id && !v.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var ogv in linkedOldGoldVouchers)
        {
            ogv.Status = OldGoldStatus.InSafeVault;
            ogv.InvoiceId = null;
            ogv.Notes = (ogv.Notes ?? "") + $" | Auto-restored to InSafeVault on invoice cancellation: {request.CancellationReason}";
        }

        // Reverse Broker Commissions if accrued on this invoice
        var linkedBrokerCommissions = await _context.BrokerCommissionEntries
            .Where(b => b.TenantId == tenantId && b.SalesInvoiceId == invoice.Id && !b.IsDeleted && b.Status != BrokerCommissionStatus.Cancelled)
            .ToListAsync(cancellationToken);

        foreach (var bComm in linkedBrokerCommissions)
        {
            bComm.Status = BrokerCommissionStatus.Cancelled;
            bComm.Notes = (bComm.Notes ?? "") + $" | Auto-reversed on invoice cancellation: {request.CancellationReason}";
            var broker = await _context.Brokers
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == bComm.BrokerId && !b.IsDeleted, cancellationToken);
            if (broker != null)
            {
                broker.CurrentPayableBalance = Math.Max(0m, broker.CurrentPayableBalance - bComm.NetCommissionPayable);
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

    public async Task<Result<bool>> UpdateCustomerContactAsync(
        Guid invoiceId,
        string? customerPhone,
        string? customerName = null,
        string? customerEmail = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var invoice = await _context.SalesInvoices
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<bool>.Failure("Invoice not found.", "NOT_FOUND");
        }

        if (customerPhone != null)
        {
            invoice.CustomerPhone = customerPhone.Trim();
        }

        if (!string.IsNullOrWhiteSpace(customerName))
        {
            invoice.CustomerName = customerName.Trim();
        }

        if (customerEmail != null)
        {
            invoice.CustomerEmail = customerEmail.Trim();
        }

        invoice.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
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

        if (_currentUserContext.BranchId.HasValue && !_currentUserContext.IsSuperAdmin && !_currentUserContext.IsTenantAdmin)
        {
            query = query.Where(r => r.BranchId == _currentUserContext.BranchId.Value);
        }

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
                    i.TotalAmount,
                    i.TaxableAmount,
                    i.CgstRate,
                    i.CgstAmount,
                    i.SgstRate,
                    i.SgstAmount,
                    i.IgstRate,
                    i.IgstAmount
                )).ToList(),
                r.RefundStatus,
                r.CashRefundedAmount,
                r.RefundMode,
                r.RefundTransactionRef,
                r.RefundDate,
                r.AdjustedInvoiceId,
                r.AdjustedInvoiceNumber,
                r.CancellationReason
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
                i.TotalAmount,
                i.TaxableAmount,
                i.CgstRate,
                i.CgstAmount,
                i.SgstRate,
                i.SgstAmount,
                i.IgstRate,
                i.IgstAmount
            )).ToList(),
            r.RefundStatus,
            r.CashRefundedAmount,
            r.RefundMode,
            r.RefundTransactionRef,
            r.RefundDate,
            r.AdjustedInvoiceId,
            r.AdjustedInvoiceNumber,
            r.CancellationReason
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

        if (!request.OriginalSalesInvoiceId.HasValue || request.OriginalSalesInvoiceId.Value == Guid.Empty)
        {
            if (!string.IsNullOrWhiteSpace(request.OriginalInvoiceNumber))
            {
                var matched = await _context.SalesInvoices
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.InvoiceNumber.ToLower() == request.OriginalInvoiceNumber.Trim().ToLower() && !i.IsDeleted, cancellationToken);
                if (matched != null)
                {
                    request.OriginalSalesInvoiceId = matched.Id;
                }
            }
        }

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

        // Determine whether this return qualifies for tax adjustment or commercial credit note based on date limit (Nov 30 of subsequent financial year)
        bool isCommercialCreditNote = false;
        if (origInvoice != null)
        {
            var invDate = origInvoice.InvoiceDate;
            int fyEndYear = invDate.Month >= 4 ? invDate.Year + 1 : invDate.Year;
            var taxAdjustmentCutoff = new DateTime(fyEndYear, 11, 30, 23, 59, 59, DateTimeKind.Utc);
            if (DateTime.UtcNow > taxAdjustmentCutoff)
            {
                isCommercialCreditNote = true;
            }
        }

        salesReturn = new SalesReturn
        {
            TenantId = tenantId,
            CreditNoteNumber = creditNoteNumber,
            ReturnDate = DateTimeOffset.UtcNow,
            OriginalSalesInvoiceId = origInvoice.Id,
            OriginalInvoiceNumber = origInvoice.InvoiceNumber,
            PartyId = finalPartyId,
            CustomerName = customerName,
            BranchId = branchId,
            WarehouseId = warehouseId,
            ReturnReason = request.ReturnReason ?? "Customer Return",
            RestockToWarehouse = request.RestockToWarehouse,
            RefundStatus = "Pending",
            Notes = isCommercialCreditNote 
                ? (string.IsNullOrWhiteSpace(request.Notes) ? "Commercial Credit Note" : $"{request.Notes.Trim()} (Commercial Credit Note)")
                : request.Notes
        };

        decimal subTotal = 0m;
        decimal taxTotal = 0m;

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

                // Total physical delivered units across billed + scheme free units (e.g. 10 billed + 5 free = 15)
                var totalDeliveredQty = origItem.Quantity + origFreeQty;

                // Cumulative remaining returnable quantity check across all previous returns for this invoice & item
                var previousReturnedQty = await _context.SalesReturnItems
                    .Where(ri => ri.TenantId == tenantId && 
                                 ri.SalesReturn.OriginalSalesInvoiceId == origInvoice.Id && 
                                 ri.ItemId == line.ItemId && 
                                 !ri.IsDeleted && 
                                 !ri.SalesReturn.IsCancelled)
                    .SumAsync(ri => ri.ReturnQuantity, cancellationToken);

                var remainingReturnableQty = totalDeliveredQty - previousReturnedQty;
                if (line.ReturnQuantity > remainingReturnableQty)
                {
                    return Result<Guid>.Failure($"Return quantity ({line.ReturnQuantity}) exceeds remaining returnable quantity ({remainingReturnableQty}) for item '{origItem.ItemName}'.", "RETURN_QUANTITY_EXCEEDED");
                }
            }

            decimal lineTaxable;
            decimal effectiveRate;

            if (origItem != null)
            {
                var totalDeliveredQty = origItem.Quantity + origFreeQty;
                if (totalDeliveredQty > 0)
                {
                    // Net Rate calculation: Return quantity is priced at Net Effective Rate = Taxable / (Billed + Free)
                    // e.g. Taxable ₹590 / (10 + 5) = ₹39.333333 per bottle
                    if (line.ReturnQuantity >= totalDeliveredQty)
                    {
                        lineTaxable = origItem.TaxableAmount;
                    }
                    else
                    {
                        decimal netRate = origItem.TaxableAmount / totalDeliveredQty;
                        lineTaxable = Math.Round(line.ReturnQuantity * netRate, 2);
                    }
                    effectiveRate = Math.Round(lineTaxable / line.ReturnQuantity, 4);
                }
                else
                {
                    effectiveRate = line.UnitPrice > 0 ? line.UnitPrice : origItem.UnitPrice;
                    lineTaxable = Math.Round(line.ReturnQuantity * effectiveRate, 2);
                }
            }
            else
            {
                effectiveRate = line.UnitPrice;
                lineTaxable = Math.Round(line.ReturnQuantity * effectiveRate, 2);
            }

            bool isIntraState = origInvoice?.TaxSupplyType == TaxSupplyType.IntraState;
            decimal cgstRate = 0m, cgstAmt = 0m;
            decimal sgstRate = 0m, sgstAmt = 0m;
            decimal igstRate = 0m, igstAmt = 0m;

            if (!isCommercialCreditNote && line.GstRate > 0)
            {
                if (isIntraState)
                {
                    cgstRate = line.GstRate / 2m;
                    sgstRate = line.GstRate / 2m;
                    cgstAmt = Math.Round(lineTaxable * (cgstRate / 100m), 2);
                    sgstAmt = Math.Round(lineTaxable * (sgstRate / 100m), 2);
                }
                else
                {
                    igstRate = line.GstRate;
                    igstAmt = Math.Round(lineTaxable * (igstRate / 100m), 2);
                }
            }
            var lineTax = cgstAmt + sgstAmt + igstAmt;
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
                GstRate = isCommercialCreditNote ? 0m : line.GstRate,
                TaxableAmount = lineTaxable,
                CgstRate = cgstRate,
                CgstAmount = cgstAmt,
                SgstRate = sgstRate,
                SgstAmount = sgstAmt,
                IgstRate = igstRate,
                IgstAmount = igstAmt,
                TotalAmount = lineTotal
            });

            retItemsDict.TryGetValue(line.ItemId, out var retMasterItem);
            bool isServiceItem = retMasterItem != null && retMasterItem.ItemType == ItemType.Service;

            // Restock to Warehouse (ReturnQuantity is already the physical bottles returned)
            if (request.RestockToWarehouse && warehouseId != Guid.Empty && !isServiceItem)
            {
                decimal physicalUnitsToRestock = line.ReturnQuantity * (conversionRatio > 0 ? conversionRatio : 1m);

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
                    UnitCost = effectiveRate,
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

                var noteDesc = isCommercialCreditNote
                    ? $"Commercial Credit Note for Sales Return {creditNoteNumber}"
                    : $"Credit Note for Sales Return {creditNoteNumber}";

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
                    Description = noteDesc
                };
                _context.PartyLedgerEntries.Add(ledger);
            }
        }

        // Update original invoice status to PartiallyReturned or FullyReturned
        if (origInvoice != null)
        {
            var otherReturnedItems = await _context.SalesReturnItems
                .Where(ri => ri.TenantId == tenantId && 
                             ri.SalesReturn.OriginalSalesInvoiceId == origInvoice.Id && 
                             !ri.IsDeleted && 
                             !ri.SalesReturn.IsCancelled)
                .ToListAsync(cancellationToken);

            var returnedQtyByItem = otherReturnedItems
                .GroupBy(ri => ri.ItemId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.ReturnQuantity));

            foreach (var line in salesReturn.Items)
            {
                if (returnedQtyByItem.ContainsKey(line.ItemId))
                    returnedQtyByItem[line.ItemId] += line.ReturnQuantity;
                else
                    returnedQtyByItem[line.ItemId] = line.ReturnQuantity;
            }

            bool isFullyReturned = origInvoice.Items.Where(it => !it.IsDeleted).All(it =>
            {
                returnedQtyByItem.TryGetValue(it.ItemId, out var ret);
                return ret >= it.Quantity;
            });

            origInvoice.Status = isFullyReturned ? InvoiceStatus.FullyReturned : InvoiceStatus.PartiallyReturned;
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

    public async Task<Result<bool>> SettleSalesReturnCreditAsync(Guid returnId, SettleSalesReturnRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<bool>.Failure("Settlement amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var salesReturn = await _context.SalesReturns
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == returnId && !r.IsDeleted, cancellationToken);

        if (salesReturn == null)
        {
            return Result<bool>.Failure("Sales return not found.", "NOT_FOUND");
        }

        if (salesReturn.IsCancelled)
        {
            return Result<bool>.Failure("Cannot settle a cancelled sales return.", "RETURN_CANCELLED");
        }

        var remainingCredit = salesReturn.TotalAmount - (salesReturn.CashRefundedAmount ?? 0m);
        if (request.Amount > remainingCredit + 0.01m)
        {
            return Result<bool>.Failure($"Settlement amount (₹{request.Amount:N2}) exceeds remaining unsettled credit (₹{remainingCredit:N2}).", "AMOUNT_EXCEEDS_CREDIT");
        }

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == salesReturn.PartyId && !p.IsDeleted, cancellationToken);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (string.Equals(request.SettleType, "AdjustAgainstInvoice", StringComparison.OrdinalIgnoreCase))
            {
                if (!request.AdjustedInvoiceId.HasValue || request.AdjustedInvoiceId.Value == Guid.Empty)
                {
                    return Result<bool>.Failure("Target invoice must be specified for invoice adjustment.", "TARGET_INVOICE_REQUIRED");
                }

                var targetInvoice = await _context.SalesInvoices
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.AdjustedInvoiceId.Value && !i.IsDeleted, cancellationToken);

                if (targetInvoice == null)
                {
                    return Result<bool>.Failure("Target sales invoice not found.", "TARGET_INVOICE_NOT_FOUND");
                }

                if (targetInvoice.IsCancelled || targetInvoice.Status == InvoiceStatus.Cancelled)
                {
                    return Result<bool>.Failure("Cannot adjust credit against a cancelled invoice.", "INVOICE_CANCELLED");
                }

                var unpaidBalance = targetInvoice.TotalAmount - targetInvoice.PaidAmount;
                if (unpaidBalance <= 0)
                {
                    return Result<bool>.Failure($"Target invoice {targetInvoice.InvoiceNumber} is already fully paid.", "INVOICE_ALREADY_PAID");
                }

                var adjustAmount = Math.Min(request.Amount, unpaidBalance);

                var payment = new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    InvoiceId = targetInvoice.Id,
                    PaymentDate = DateTime.UtcNow,
                    Amount = adjustAmount,
                    PaymentMode = PaymentMode.CreditAccount,
                    TransactionReference = $"CN-{salesReturn.CreditNoteNumber}",
                    Notes = $"Adjusted from Credit Note {salesReturn.CreditNoteNumber}. {request.Notes}".Trim()
                };
                _context.SalesInvoicePayments.Add(payment);

                targetInvoice.PaidAmount += adjustAmount;
                targetInvoice.BalanceAmount = Math.Max(0m, targetInvoice.TotalAmount - targetInvoice.PaidAmount);
                targetInvoice.PaymentStatus = targetInvoice.BalanceAmount <= 0.01m ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;

                salesReturn.RefundStatus = "CreditAdjusted";
                salesReturn.AdjustedInvoiceId = targetInvoice.Id;
                salesReturn.AdjustedInvoiceNumber = targetInvoice.InvoiceNumber;
                salesReturn.CashRefundedAmount = (salesReturn.CashRefundedAmount ?? 0m) + adjustAmount;
                salesReturn.RefundDate = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(request.Notes))
                {
                    salesReturn.Notes = (salesReturn.Notes + $"\n[Credit Adjusted: ₹{adjustAmount:N2} against Inv #{targetInvoice.InvoiceNumber}]").Trim();
                }
            }
            else // CashRefund
            {
                var refundMode = !string.IsNullOrWhiteSpace(request.RefundMode) ? request.RefundMode.Trim() : "Cash";

                if (party != null)
                {
                    var newBal = party.CurrentOutstandingBalance + request.Amount;
                    party.CurrentOutstandingBalance = newBal;

                    var ledger = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = DateTime.UtcNow,
                        EntryType = PartyLedgerEntryType.CashRefund,
                        DebitAmount = request.Amount,
                        CreditAmount = 0m,
                        RunningBalance = newBal,
                        ReferenceDocumentType = "CashRefund",
                        ReferenceDocumentId = salesReturn.Id,
                        ReferenceDocumentNumber = salesReturn.CreditNoteNumber,
                        PaymentMode = refundMode,
                        Description = $"Payment Refund of ₹{request.Amount:N2} via {refundMode} against Credit Note {salesReturn.CreditNoteNumber}. {request.Notes}".Trim()
                    };
                    _context.PartyLedgerEntries.Add(ledger);
                }

                // General Ledger Posting: Debit AR, Credit Cash/Bank
                try
                {
                    var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
                    var assetCode = refundMode.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? "ACC-CASH" : "ACC-BANK";
                    var assetName = refundMode.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? "Cash in Hand" : "Bank Accounts";
                    var creditAccount = await GetOrCreateLedgerAccountAsync(tenantId, assetCode, assetName, "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);

                    var voucher = new JournalVoucher
                    {
                        TenantId = tenantId,
                        VoucherNumber = $"JV-REF-{salesReturn.CreditNoteNumber}-{DateTime.UtcNow:mmss}",
                        VoucherDate = DateTime.UtcNow,
                        VoucherType = "PaymentRefund",
                        ReferenceNumber = salesReturn.CreditNoteNumber,
                        TotalDebit = request.Amount,
                        TotalCredit = request.Amount,
                        Narration = $"Payment Refund of ₹{request.Amount:N2} via {refundMode} against Credit Note {salesReturn.CreditNoteNumber}",
                        CreatedByName = "System Auto-Posting"
                    };

                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = arAccount.Id,
                        DebitAmount = request.Amount,
                        CreditAmount = 0,
                        Narration = $"Debit AR on refund to party for CN {salesReturn.CreditNoteNumber}"
                    });
                    arAccount.CurrentBalance += request.Amount;

                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = creditAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = request.Amount,
                        Narration = $"Credit {assetName} on payout for CN {salesReturn.CreditNoteNumber}"
                    });
                    creditAccount.CurrentBalance -= request.Amount;

                    _context.JournalVouchers.Add(voucher);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "GL auto-posting skipped or failed for refund on CN {CreditNoteNumber}: {Message}", salesReturn.CreditNoteNumber, ex.Message);
                }

                salesReturn.RefundStatus = "CashRefunded";
                salesReturn.CashRefundedAmount = (salesReturn.CashRefundedAmount ?? 0m) + request.Amount;
                salesReturn.RefundMode = refundMode;
                salesReturn.RefundTransactionRef = request.TransactionRef;
                salesReturn.RefundDate = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(request.Notes))
                {
                    salesReturn.Notes = (salesReturn.Notes + $"\n[Refund Paid: ₹{request.Amount:N2} via {refundMode} (Ref: {request.TransactionRef})]").Trim();
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to settle sales return {ReturnId}: {Message}", returnId, ex.Message);
            throw;
        }
    }

    public async Task<Result<bool>> CancelSalesReturnAsync(Guid returnId, CancelSalesReturnRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var salesReturn = await _context.SalesReturns
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == returnId && !r.IsDeleted, cancellationToken);

        if (salesReturn == null)
        {
            return Result<bool>.Failure("Sales return not found.", "NOT_FOUND");
        }

        if (salesReturn.IsCancelled)
        {
            return Result<bool>.Failure("Sales return is already cancelled.", "ALREADY_CANCELLED");
        }

        if (salesReturn.RefundStatus == "CashRefunded" && (salesReturn.CashRefundedAmount ?? 0m) > 0m)
        {
            return Result<bool>.Failure("Cannot cancel a sales return that has already been refunded in cash. Please adjust accounts first.", "REFUND_ALREADY_ISSUED");
        }

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            salesReturn.IsCancelled = true;
            salesReturn.CancellationReason = request.Reason;
            salesReturn.CancelledAt = DateTime.UtcNow;
            salesReturn.RefundStatus = "Cancelled";
            salesReturn.Notes = (salesReturn.Notes + $"\n[Cancelled: {request.Reason}]").Trim();

            // Reverse inventory if restocked
            if (salesReturn.RestockToWarehouse && salesReturn.WarehouseId != Guid.Empty)
            {
                var itemIds = salesReturn.Items.Select(x => x.ItemId).Distinct().ToList();
                var masterItems = await _context.Items
                    .Where(it => it.TenantId == tenantId && itemIds.Contains(it.Id) && !it.IsDeleted)
                    .ToDictionaryAsync(it => it.Id, cancellationToken);

                foreach (var line in salesReturn.Items)
                {
                    masterItems.TryGetValue(line.ItemId, out var masterItem);
                    if (masterItem != null && masterItem.ItemType == ItemType.Service) continue;

                    var stockQuery = _context.ItemWarehouseStocks
                        .Where(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == salesReturn.WarehouseId && !s.IsDeleted);

                    if (line.VariantId.HasValue)
                        stockQuery = stockQuery.Where(s => s.VariantId == line.VariantId.Value);
                    else
                        stockQuery = stockQuery.Where(s => s.VariantId == null);

                    if (line.BatchId.HasValue)
                        stockQuery = stockQuery.Where(s => s.BatchId == line.BatchId.Value);
                    else
                        stockQuery = stockQuery.Where(s => s.BatchId == null);

                    var stock = await stockQuery.FirstOrDefaultAsync(cancellationToken);
                    if (stock != null)
                    {
                        stock.CurrentQuantity = Math.Max(0m, stock.CurrentQuantity - line.ReturnQuantity);

                        _context.StockMovements.Add(new StockMovement
                        {
                            TenantId = tenantId,
                            WarehouseId = salesReturn.WarehouseId,
                            ItemId = line.ItemId,
                            VariantId = line.VariantId,
                            BatchId = line.BatchId,
                            MovementType = StockMovementType.PhysicalAdjustment,
                            Quantity = -line.ReturnQuantity,
                            ReferenceDocumentType = "CreditNoteCancellation",
                            ReferenceDocumentId = salesReturn.Id,
                            ReferenceDocumentNumber = salesReturn.CreditNoteNumber,
                            Notes = $"Cancellation of Credit Note {salesReturn.CreditNoteNumber}"
                        });
                    }
                }
            }

            // Reverse Party Ledger balance
            if (salesReturn.PartyId != Guid.Empty)
            {
                var party = await _context.Parties
                    .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == salesReturn.PartyId && !p.IsDeleted, cancellationToken);

                if (party != null)
                {
                    var newBal = party.CurrentOutstandingBalance + salesReturn.TotalAmount;
                    party.CurrentOutstandingBalance = newBal;

                    var ledger = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = DateTime.UtcNow,
                        EntryType = PartyLedgerEntryType.JournalAdjustment,
                        DebitAmount = salesReturn.TotalAmount,
                        CreditAmount = 0m,
                        RunningBalance = newBal,
                        ReferenceDocumentType = "CreditNoteCancellation",
                        ReferenceDocumentId = salesReturn.Id,
                        ReferenceDocumentNumber = salesReturn.CreditNoteNumber,
                        Description = $"Cancellation of Credit Note {salesReturn.CreditNoteNumber}: {request.Reason}"
                    };
                    _context.PartyLedgerEntries.Add(ledger);
                }
            }

            // Reverse General Ledger
            try
            {
                var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
                var retAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-RET", "Sales Returns & Allowances", "GRP-REV", "Direct Sales Revenue", "Revenue", "Debit", cancellationToken);

                var totalCgst = salesReturn.Items.Sum(x => x.CgstAmount);
                var totalSgst = salesReturn.Items.Sum(x => x.SgstAmount);
                var totalIgst = salesReturn.Items.Sum(x => x.IgstAmount);

                var cgstAccount = totalCgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-OUT", "Output CGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
                var sgstAccount = totalSgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-OUT", "Output SGST/UTGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
                var igstAccount = totalIgst > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-OUT", "Output IGST Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;

                var voucher = new JournalVoucher
                {
                    TenantId = tenantId,
                    VoucherNumber = $"JV-REV-CN-{salesReturn.CreditNoteNumber}",
                    VoucherDate = DateTime.UtcNow,
                    VoucherType = "CreditNoteCancellation",
                    ReferenceNumber = salesReturn.CreditNoteNumber,
                    TotalDebit = salesReturn.TotalAmount,
                    TotalCredit = salesReturn.TotalAmount,
                    Narration = $"Reversal of Credit Note {salesReturn.CreditNoteNumber}: {request.Reason}",
                    CreatedByName = "System Auto-Posting"
                };

                // Debit AR (re-instate receivable)
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = arAccount.Id,
                    DebitAmount = salesReturn.TotalAmount,
                    CreditAmount = 0,
                    Narration = $"Reversal of AR credit on cancelled CN {salesReturn.CreditNoteNumber}"
                });
                arAccount.CurrentBalance += salesReturn.TotalAmount;

                // Credit Sales Return
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = retAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = salesReturn.SubTotal,
                    Narration = $"Reversal of sales return revenue on cancelled CN {salesReturn.CreditNoteNumber}"
                });
                retAccount.CurrentBalance -= salesReturn.SubTotal;

                if (cgstAccount != null && totalCgst > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = cgstAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = totalCgst,
                        Narration = $"Re-instate Output CGST on cancelled CN {salesReturn.CreditNoteNumber}"
                    });
                    cgstAccount.CurrentBalance += totalCgst;
                }

                if (sgstAccount != null && totalSgst > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = sgstAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = totalSgst,
                        Narration = $"Re-instate Output SGST on cancelled CN {salesReturn.CreditNoteNumber}"
                    });
                    sgstAccount.CurrentBalance += totalSgst;
                }

                if (igstAccount != null && totalIgst > 0)
                {
                    voucher.Legs.Add(new JournalVoucherLeg
                    {
                        TenantId = tenantId,
                        AccountId = igstAccount.Id,
                        DebitAmount = 0,
                        CreditAmount = totalIgst,
                        Narration = $"Re-instate Output IGST on cancelled CN {salesReturn.CreditNoteNumber}"
                    });
                    igstAccount.CurrentBalance += totalIgst;
                }

                _context.JournalVouchers.Add(voucher);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "GL auto-posting failed for cancellation of CN {CreditNoteNumber}: {Message}", salesReturn.CreditNoteNumber, ex.Message);
            }

            // Re-evaluate original invoice status if applicable
            if (salesReturn.OriginalSalesInvoiceId.HasValue)
            {
                var origInv = await _context.SalesInvoices
                    .Include(i => i.Items)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == salesReturn.OriginalSalesInvoiceId.Value && !i.IsDeleted, cancellationToken);

                if (origInv != null && (origInv.Status == InvoiceStatus.PartiallyReturned || origInv.Status == InvoiceStatus.FullyReturned))
                {
                    var remainingActiveReturns = await _context.SalesReturnItems
                        .Where(ri => ri.TenantId == tenantId && 
                                     ri.SalesReturn.OriginalSalesInvoiceId == origInv.Id && 
                                     ri.SalesReturnId != salesReturn.Id &&
                                     !ri.IsDeleted && 
                                     !ri.SalesReturn.IsCancelled)
                        .ToListAsync(cancellationToken);

                    if (!remainingActiveReturns.Any())
                    {
                        origInv.Status = origInv.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;
                    }
                    else
                    {
                        var returnedQtyByItem = remainingActiveReturns
                            .GroupBy(ri => ri.ItemId)
                            .ToDictionary(g => g.Key, g => g.Sum(x => x.ReturnQuantity));

                        bool isFullyReturned = origInv.Items.Where(it => !it.IsDeleted).All(it =>
                        {
                            returnedQtyByItem.TryGetValue(it.ItemId, out var ret);
                            return ret >= it.Quantity;
                        });

                        origInv.Status = isFullyReturned ? InvoiceStatus.FullyReturned : InvoiceStatus.PartiallyReturned;
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to cancel sales return {ReturnId}: {Message}", returnId, ex.Message);
            throw;
        }
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
            var cessAccount = invoice.CessAmount > 0 ? await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CESS-OUT", "Output GST Cess Payable", "GRP-TAX", "Duties & Taxes", "Liability", "Credit", cancellationToken) : null;
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

            // Leg 3: Credit Output CGST (exempt from supplier liability under RCM)
            if (!invoice.IsReverseCharge && cgstAccount != null && invoice.CgstAmount > 0)
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

            // Leg 4: Credit Output SGST (exempt from supplier liability under RCM)
            if (!invoice.IsReverseCharge && sgstAccount != null && invoice.SgstAmount > 0)
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

            // Leg 5: Credit Output IGST (exempt from supplier liability under RCM)
            if (!invoice.IsReverseCharge && igstAccount != null && invoice.IgstAmount > 0)
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

            // Leg 5b: Credit Output GST Cess (exempt from supplier liability under RCM)
            if (!invoice.IsReverseCharge && cessAccount != null && invoice.CessAmount > 0)
            {
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = cessAccount.Id,
                    DebitAmount = 0,
                    CreditAmount = invoice.CessAmount,
                    Narration = $"Output GST Cess liability on invoice {invoice.InvoiceNumber}"
                });
                cessAccount.CurrentBalance += invoice.CessAmount;
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

            if (salesReturn.Items != null && salesReturn.Items.Any(x => x.CgstAmount > 0 || x.SgstAmount > 0 || x.IgstAmount > 0))
            {
                totalCgst = salesReturn.Items.Sum(x => x.CgstAmount);
                totalSgst = salesReturn.Items.Sum(x => x.SgstAmount);
                totalIgst = salesReturn.Items.Sum(x => x.IgstAmount);
            }
            else if (salesReturn.TaxAmount > 0)
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

    private async Task AutoPostPaymentToGeneralLedgerAsync(SalesInvoice invoice, SalesInvoicePayment payment, CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = invoice.TenantId;
            var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);
            
            string assetAccCode = payment.PaymentMode == PaymentMode.Cash ? "ACC-CASH" : "ACC-BANK";
            string assetAccName = payment.PaymentMode == PaymentMode.Cash ? "Cash in Hand" : "Main Bank Account";
            var assetAccount = await GetOrCreateLedgerAccountAsync(tenantId, assetAccCode, assetAccName, "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-PAY-{invoice.InvoiceNumber}-{payment.Id.ToString()[..8].ToUpperInvariant()}",
                VoucherDate = payment.PaymentDate,
                VoucherType = "Receipt",
                ReferenceNumber = invoice.InvoiceNumber,
                TotalDebit = payment.Amount,
                TotalCredit = payment.Amount,
                Narration = $"Payment receipt against invoice {invoice.InvoiceNumber} from {invoice.CustomerName} via {payment.PaymentMode}",
                CreatedByName = "System Auto-Posting"
            };

            // Debit Cash / Bank Account (Asset increases)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = assetAccount.Id,
                DebitAmount = payment.Amount,
                CreditAmount = 0m,
                Narration = $"Receipt via {payment.PaymentMode}"
            });
            assetAccount.CurrentBalance += payment.Amount;

            // Credit Accounts Receivable (Asset decreases)
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = arAccount.Id,
                DebitAmount = 0m,
                CreditAmount = payment.Amount,
                Narration = $"Clear AR on Invoice {invoice.InvoiceNumber}"
            });
            arAccount.CurrentBalance -= payment.Amount;

            _context.JournalVouchers.Add(voucher);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to auto-post payment receipt {PaymentId} to general ledger: {Message}", payment.Id, ex.Message);
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

    public async Task<Result<LastDealHintDto?>> GetLastSaleDealAsync(Guid itemId, Guid? partyId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        SalesInvoiceItem? lastItem = null;
        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            lastItem = await _context.SalesInvoiceItems
                .AsNoTracking()
                .Include(i => i.Invoice)
                .Where(i => i.TenantId == tenantId &&
                            i.ItemId == itemId &&
                            !i.Invoice.IsCancelled &&
                            i.Invoice.PartyId == partyId.Value)
                .OrderByDescending(i => i.Invoice.InvoiceDate)
                .ThenByDescending(i => i.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (lastItem == null)
        {
            lastItem = await _context.SalesInvoiceItems
                .AsNoTracking()
                .Include(i => i.Invoice)
                .Where(i => i.TenantId == tenantId &&
                            i.ItemId == itemId &&
                            !i.Invoice.IsCancelled)
                .OrderByDescending(i => i.Invoice.InvoiceDate)
                .ThenByDescending(i => i.CreatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (lastItem == null)
        {
            return Result<LastDealHintDto?>.Success(null);
        }

        decimal freeQty = 0m;
        if (!string.IsNullOrWhiteSpace(lastItem.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(lastItem.AttributesJson);
                if (doc.RootElement.TryGetProperty("freeQuantity", out var fqProp))
                {
                    freeQty = fqProp.GetDecimal();
                }
            }
            catch { }
        }

        string schemeText = "";
        if (freeQty > 0)
        {
            schemeText = lastItem.Quantity > 0
                ? $"{(int)lastItem.Quantity}+{(int)freeQty}"
                : $"+{(int)freeQty}";
        }

        var dto = new LastDealHintDto(
            UnitPrice: lastItem.UnitPrice,
            Quantity: lastItem.Quantity,
            FreeQuantity: freeQty,
            DiscountPercent: lastItem.DiscountPercent,
            FreeSchemeText: schemeText,
            Mrp: lastItem.Mrp,
            Date: lastItem.Invoice?.InvoiceDate,
            DocumentNumber: lastItem.Invoice?.InvoiceNumber ?? "",
            PartyName: lastItem.Invoice?.CustomerName ?? ""
        );

        return Result<LastDealHintDto?>.Success(dto);
    }

    #endregion
}
