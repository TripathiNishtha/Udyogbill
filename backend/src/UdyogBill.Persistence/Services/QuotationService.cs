using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class QuotationService : IQuotationService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;
    private readonly ISalesService _salesService;
    private readonly Microsoft.Extensions.Logging.ILogger<QuotationService>? _logger;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _tenantQuotationSemaphores = new();

    private static readonly Dictionary<string, string> StateCodeMap = new()
    {
        ["01"] = "Jammu and Kashmir",
        ["02"] = "Himachal Pradesh",
        ["03"] = "Punjab",
        ["04"] = "Chandigarh",
        ["05"] = "Uttarakhand",
        ["06"] = "Haryana",
        ["07"] = "Delhi",
        ["08"] = "Rajasthan",
        ["09"] = "Uttar Pradesh",
        ["10"] = "Bihar",
        ["11"] = "Sikkim",
        ["12"] = "Arunachal Pradesh",
        ["13"] = "Nagaland",
        ["14"] = "Manipur",
        ["15"] = "Mizoram",
        ["16"] = "Tripura",
        ["17"] = "Meghalaya",
        ["18"] = "Assam",
        ["19"] = "West Bengal",
        ["20"] = "Jharkhand",
        ["21"] = "Odisha",
        ["22"] = "Chhattisgarh",
        ["23"] = "Madhya Pradesh",
        ["24"] = "Gujarat",
        ["26"] = "Dadra and Nagar Haveli and Daman and Diu",
        ["27"] = "Maharashtra",
        ["29"] = "Karnataka",
        ["30"] = "Goa",
        ["31"] = "Lakshadweep",
        ["32"] = "Kerala",
        ["33"] = "Tamil Nadu",
        ["34"] = "Puducherry",
        ["35"] = "Andaman and Nicobar Islands",
        ["36"] = "Telangana",
        ["37"] = "Andhra Pradesh",
        ["38"] = "Ladakh",
        ["97"] = "Other Territory"
    };

    public QuotationService(
        AppDbContext context,
        ICurrentUserContext currentUserContext,
        IAuditService auditService,
        ISalesService salesService,
        Microsoft.Extensions.Logging.ILogger<QuotationService>? logger = null)
    {
        _context = context;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
        _salesService = salesService;
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
                _logger?.LogWarning(ex, "Could not acquire DB advisory lock for quotation prefix {Prefix}: {Message}", prefix, ex.Message);
            }
        }
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

    public async Task<Result<PagedResult<QuotationListDto>>> GetQuotationsAsync(
        int pageNumber,
        int pageSize,
        QuotationStatus? status,
        Guid? branchId,
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.Quotations
            .Where(q => q.TenantId == tenantId && !q.IsDeleted)
            .Include(q => q.Branch)
            .Include(q => q.ConvertedInvoice)
            .Include(q => q.Items)
            .AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(q => q.Status == status.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(q => q.BranchId == branchId.Value);
        }

        if (partyId.HasValue)
        {
            query = query.Where(q => q.PartyId == partyId.Value);
        }

        if (fromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(q => q.QuotationDate >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(q => q.QuotationDate <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(q =>
                q.QuotationNumber.ToLower().Contains(term) ||
                q.CustomerName.ToLower().Contains(term) ||
                (q.CustomerPhone != null && q.CustomerPhone.Contains(term)) ||
                (q.CustomerGSTIN != null && q.CustomerGSTIN.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(q => q.QuotationDate)
            .ThenByDescending(q => q.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(q => new QuotationListDto
            {
                Id = q.Id,
                TenantId = q.TenantId,
                QuotationNumber = q.QuotationNumber,
                Status = q.Status,
                BranchId = q.BranchId,
                BranchName = q.Branch != null ? q.Branch.BranchName : string.Empty,
                PartyId = q.PartyId,
                CustomerName = q.CustomerName,
                CustomerPhone = q.CustomerPhone,
                CustomerGSTIN = q.CustomerGSTIN,
                QuotationDate = q.QuotationDate,
                ValidUntilDate = q.ValidUntilDate,
                TaxableAmount = q.TaxableAmount,
                CgstAmount = q.CgstAmount,
                SgstAmount = q.SgstAmount,
                IgstAmount = q.IgstAmount,
                TotalAmount = q.TotalAmount,
                TotalItemsCount = q.Items.Count,
                ConvertedInvoiceId = q.ConvertedInvoiceId,
                ConvertedInvoiceNumber = q.ConvertedInvoice != null ? q.ConvertedInvoice.InvoiceNumber : null,
                CreatedAtUtc = q.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Result<PagedResult<QuotationListDto>>.Success(new PagedResult<QuotationListDto>(items, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<QuotationDetailsDto>> GetQuotationByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var quotation = await _context.Quotations
            .Where(q => q.TenantId == tenantId && q.Id == id && !q.IsDeleted)
            .Include(q => q.Branch)
            .Include(q => q.ConvertedInvoice)
            .Include(q => q.Items)
                .ThenInclude(i => i.Uom)
            .FirstOrDefaultAsync(cancellationToken);

        if (quotation == null)
        {
            return Result<QuotationDetailsDto>.Failure("Quotation not found.", "NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        return Result<QuotationDetailsDto>.Success(MapToDetailsDto(quotation, tenant));
    }

    public async Task<Result<QuotationDetailsDto>> GetQuotationByNumberAsync(string quotationNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var quotation = await _context.Quotations
            .Where(q => q.TenantId == tenantId && q.QuotationNumber == quotationNumber && !q.IsDeleted)
            .Include(q => q.Branch)
            .Include(q => q.ConvertedInvoice)
            .Include(q => q.Items)
                .ThenInclude(i => i.Uom)
            .FirstOrDefaultAsync(cancellationToken);

        if (quotation == null)
        {
            return Result<QuotationDetailsDto>.Failure($"Quotation '{quotationNumber}' not found.", "NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        return Result<QuotationDetailsDto>.Success(MapToDetailsDto(quotation, tenant));
    }

    public async Task<Result<Guid>> CreateQuotationAsync(CreateQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Quotation must contain at least one line item.", "EMPTY_ITEMS");
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && request.BranchId != Guid.Empty && b.Id == request.BranchId && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result<Guid>.Failure("No active branch found for this tenant.", "BRANCH_NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        // Robust Seller State extraction (Branch StateCode -> Branch GSTIN[0..2] -> Tenant StateCode -> Tenant GSTIN[0..2] -> Default "06" Haryana)
        string? sellerStateCode = !string.IsNullOrWhiteSpace(branch.StateCode) ? branch.StateCode.Trim() : null;
        if (string.IsNullOrWhiteSpace(sellerStateCode) && !string.IsNullOrWhiteSpace(branch.GSTIN) && branch.GSTIN.Trim().Length >= 2 && char.IsDigit(branch.GSTIN.Trim()[0]) && char.IsDigit(branch.GSTIN.Trim()[1]))
        {
            sellerStateCode = branch.GSTIN.Trim().Substring(0, 2);
        }
        if (string.IsNullOrWhiteSpace(sellerStateCode) && tenant != null)
        {
            sellerStateCode = !string.IsNullOrWhiteSpace(tenant.StateCode) ? tenant.StateCode.Trim() : null;
            if (string.IsNullOrWhiteSpace(sellerStateCode) && !string.IsNullOrWhiteSpace(tenant.GSTIN) && tenant.GSTIN.Trim().Length >= 2 && char.IsDigit(tenant.GSTIN.Trim()[0]) && char.IsDigit(tenant.GSTIN.Trim()[1]))
            {
                sellerStateCode = tenant.GSTIN.Trim().Substring(0, 2);
            }
        }
        sellerStateCode = sellerStateCode ?? "06";

        // Determine Customer Snapshot
        string customerName = request.CustomerName;
        string? customerPhone = request.CustomerPhone;
        string? customerEmail = request.CustomerEmail;
        string? customerGSTIN = request.CustomerGSTIN;
        string? billingAddress = request.BillingAddress;
        string? shippingAddress = request.ShippingAddress;
        string? customerStateCode = !string.IsNullOrWhiteSpace(request.StateCode) ? request.StateCode.Trim() : null;
        string? customerStateName = null;

        if (request.PartyId.HasValue)
        {
            var party = await _context.Parties
                .Include(p => p.Addresses)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                if (string.IsNullOrWhiteSpace(customerName)) customerName = party.LegalName;
                customerPhone ??= party.PrimaryPhone ?? party.Mobile;
                customerEmail ??= party.Email;
                customerGSTIN ??= party.GSTIN;

                var bAddr = party.Addresses.FirstOrDefault(a => a.AddressType == Domain.Entities.Parties.AddressType.Billing)
                           ?? party.Addresses.FirstOrDefault();
                if (bAddr != null)
                {
                    if (string.IsNullOrWhiteSpace(billingAddress))
                    {
                        var addrParts = new List<string>();
                        if (!string.IsNullOrWhiteSpace(bAddr.AddressLine1)) addrParts.Add(bAddr.AddressLine1.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.AddressLine2)) addrParts.Add(bAddr.AddressLine2.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.City)) addrParts.Add(bAddr.City.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.State)) addrParts.Add(bAddr.State.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.Pincode)) addrParts.Add(bAddr.Pincode.Trim());
                        billingAddress = string.Join(", ", addrParts);
                    }
                    if (string.IsNullOrWhiteSpace(customerStateCode))
                    {
                        customerStateCode = bAddr.StateCode;
                    }
                    if (string.IsNullOrWhiteSpace(customerStateName))
                    {
                        customerStateName = bAddr.State;
                    }
                }
            }
        }

        // If customer state code still missing, try from customerGSTIN
        if (string.IsNullOrWhiteSpace(customerStateCode) && !string.IsNullOrWhiteSpace(customerGSTIN) && customerGSTIN.Trim().Length >= 2 && char.IsDigit(customerGSTIN.Trim()[0]) && char.IsDigit(customerGSTIN.Trim()[1]))
        {
            customerStateCode = customerGSTIN.Trim().Substring(0, 2);
        }

        customerStateCode = customerStateCode ?? sellerStateCode;
        if (string.IsNullOrWhiteSpace(customerStateName) && StateCodeMap.TryGetValue(customerStateCode, out var mappedState))
        {
            customerStateName = mappedState;
        }
        customerStateName ??= "Uttar Pradesh";

        string placeOfSupply = !string.IsNullOrWhiteSpace(request.PlaceOfSupply)
            ? request.PlaceOfSupply
            : $"{customerStateCode} - {customerStateName}";

        // Determine Tax Supply Type (Comparing seller vs buyer state)
        var isInterState = !string.Equals(sellerStateCode, customerStateCode, StringComparison.OrdinalIgnoreCase);
        var taxSupplyType = isInterState ? TaxSupplyType.InterState : TaxSupplyType.IntraState;

        // Fetch Items
        var itemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var masterItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && itemIds.Contains(i.Id) && !i.IsDeleted)
            .ToDictionaryAsync(i => i.Id, cancellationToken);

        // Fetch UOMs
        var uomIds = request.Items.Select(i => i.UomId).Distinct().ToList();
        var uoms = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && uomIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var semaphore = _tenantQuotationSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        var tx = _context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;
        string qNumber;
        Quotation quotation;
        try
        {
            int fyStart = request.QuotationDate.Month >= 4 ? request.QuotationDate.Year : request.QuotationDate.Year - 1;
            string fyCode = $"{fyStart % 100:D2}{(fyStart + 1) % 100:D2}";
            await AcquireSequenceLockAsync(tenantId, "QT", fyCode, cancellationToken);

            // Generate Quotation Number
            qNumber = await GenerateQuotationNumberAsync(tenantId, request.QuotationDate, cancellationToken);

            var qDate = DateTime.SpecifyKind(request.QuotationDate, DateTimeKind.Utc);
            var validUntil = request.ValidUntilDate.HasValue
                ? DateTime.SpecifyKind(request.ValidUntilDate.Value, DateTimeKind.Utc)
                : (DateTime?)null;

            quotation = new Quotation
            {
                TenantId = tenantId,
            QuotationNumber = qNumber,
            Status = QuotationStatus.Draft,
            BranchId = branch.Id,
            PartyId = request.PartyId,
            CustomerName = customerName,
            CustomerPhone = customerPhone,
            CustomerEmail = customerEmail,
            CustomerGSTIN = customerGSTIN,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            BillingStateCode = customerStateCode,
            ShippingStateCode = customerStateCode,
            PlaceOfSupply = placeOfSupply,
            QuotationDate = qDate,
            ValidUntilDate = validUntil,
            TaxSupplyType = taxSupplyType,
            QuotationDiscountPercent = request.QuotationDiscountPercent,
            Notes = request.Notes,
            TermsAndConditions = request.TermsAndConditions,
            AttributesJson = request.AttributesJson ?? "{}"
        };

        decimal subTotal = 0;
        decimal itemDiscountTotal = 0;
        decimal totalTaxable = 0;
        decimal totalCgst = 0;
        decimal totalSgst = 0;
        decimal totalIgst = 0;
        decimal totalCess = 0;

        foreach (var reqItem in request.Items)
        {
            if (!masterItems.TryGetValue(reqItem.ItemId, out var masterItem))
            {
                return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            var lineGross = reqItem.Quantity * reqItem.UnitPrice;
            var lineDisc = lineGross * (reqItem.DiscountPercent / 100m);
            var lineTaxable = lineGross - lineDisc;

            var gstRate = masterItem.TaxRate;
            decimal cgstRate = 0, sgstRate = 0, igstRate = 0;
            decimal cgstAmt = 0, sgstAmt = 0, igstAmt = 0, cessAmt = 0;

            if (taxSupplyType == TaxSupplyType.IntraState)
            {
                cgstRate = gstRate / 2m;
                sgstRate = gstRate / 2m;
                cgstAmt = Math.Round(lineTaxable * (cgstRate / 100m), 2, MidpointRounding.AwayFromZero);
                sgstAmt = Math.Round(lineTaxable * (sgstRate / 100m), 2, MidpointRounding.AwayFromZero);
            }
            else
            {
                igstRate = gstRate;
                igstAmt = Math.Round(lineTaxable * (igstRate / 100m), 2, MidpointRounding.AwayFromZero);
            }

            var lineTotal = lineTaxable + cgstAmt + sgstAmt + igstAmt + cessAmt;

            subTotal += lineGross;
            itemDiscountTotal += lineDisc;
            totalTaxable += lineTaxable;
            totalCgst += cgstAmt;
            totalSgst += sgstAmt;
            totalIgst += igstAmt;
            totalCess += cessAmt;

            var qItem = new QuotationItem
            {
                TenantId = tenantId,
                ItemId = masterItem.Id,
                ItemSku = masterItem.Sku,
                ItemName = masterItem.Name,
                HsnCode = masterItem.HSNCode,
                Quantity = reqItem.Quantity,
                UomId = reqItem.UomId,
                UnitPrice = reqItem.UnitPrice,
                DiscountPercent = reqItem.DiscountPercent,
                DiscountAmount = lineDisc,
                TaxableAmount = lineTaxable,
                GstRate = gstRate,
                CgstRate = cgstRate,
                CgstAmount = cgstAmt,
                SgstRate = sgstRate,
                SgstAmount = sgstAmt,
                IgstRate = igstRate,
                IgstAmount = igstAmt,
                CessRate = 0,
                CessAmount = cessAmt,
                TotalAmount = lineTotal,
                AttributesJson = reqItem.AttributesJson ?? "{}"
            };

            quotation.Items.Add(qItem);
        }

        // Global discount
        decimal globalDiscountAmt = 0;
        if (request.QuotationDiscountPercent > 0)
        {
            globalDiscountAmt = Math.Round(totalTaxable * (request.QuotationDiscountPercent / 100m), 4);
            totalTaxable -= globalDiscountAmt;
        }

        var unroundedTotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
        var roundedTotal = Math.Round(unroundedTotal, 0, MidpointRounding.AwayFromZero);
        var roundOff = roundedTotal - unroundedTotal;

        quotation.SubTotal = subTotal;
        quotation.ItemDiscountTotal = itemDiscountTotal;
        quotation.QuotationDiscountAmount = globalDiscountAmt;
        quotation.TaxableAmount = totalTaxable;
        quotation.CgstAmount = totalCgst;
        quotation.SgstAmount = totalSgst;
        quotation.IgstAmount = totalIgst;
        quotation.CessAmount = totalCess;
        quotation.RoundOff = roundOff;
        quotation.TotalAmount = roundedTotal;

        _context.Quotations.Add(quotation);
            await _context.SaveChangesAsync(cancellationToken);
            if (tx != null) await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            _logger?.LogError(ex, "Failed to create quotation: {Message}", ex.Message);
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
            Action = Domain.Enums.AuditActionType.Create,
            ActionName = "CreateQuotation",
            EntityName = "Quotation",
            EntityId = quotation.Id.ToString(),
            NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new { quotation.QuotationNumber, quotation.CustomerName, quotation.TotalAmount }),
            IpAddress = ipAddress,
            TimestampUtc = DateTime.UtcNow
        }, cancellationToken);

        return Result<Guid>.Success(quotation.Id);
    }

    public async Task<Result<Guid>> UpdateQuotationAsync(Guid id, CreateQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var quotation = await _context.Quotations
            .Include(q => q.Items)
            .Include(q => q.Branch)
            .FirstOrDefaultAsync(q => q.TenantId == tenantId && q.Id == id && !q.IsDeleted, cancellationToken);

        if (quotation == null)
        {
            return Result<Guid>.Failure("Quotation not found.", "NOT_FOUND");
        }

        if (quotation.Status == QuotationStatus.ConvertedToInvoice)
        {
            return Result<Guid>.Failure("Cannot edit a quotation that has already been converted to an invoice.", "ALREADY_CONVERTED");
        }

        if (quotation.Status == QuotationStatus.Cancelled || quotation.IsCancelled)
        {
            return Result<Guid>.Failure("Cannot edit a cancelled quotation.", "CANCELLED");
        }

        if (request.Items == null || request.Items.Count == 0)
        {
            return Result<Guid>.Failure("Quotation must contain at least one line item.", "EMPTY_ITEMS");
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && request.BranchId != Guid.Empty && b.Id == request.BranchId && !b.IsDeleted, cancellationToken)
            ?? quotation.Branch
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result<Guid>.Failure("No active branch found for this tenant.", "BRANCH_NOT_FOUND");
        }

        var tenant = await _context.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        // Robust Seller State extraction
        string? sellerStateCode = !string.IsNullOrWhiteSpace(branch.StateCode) ? branch.StateCode.Trim() : null;
        if (string.IsNullOrWhiteSpace(sellerStateCode) && !string.IsNullOrWhiteSpace(branch.GSTIN) && branch.GSTIN.Trim().Length >= 2 && char.IsDigit(branch.GSTIN.Trim()[0]) && char.IsDigit(branch.GSTIN.Trim()[1]))
        {
            sellerStateCode = branch.GSTIN.Trim().Substring(0, 2);
        }
        if (string.IsNullOrWhiteSpace(sellerStateCode) && tenant != null)
        {
            sellerStateCode = !string.IsNullOrWhiteSpace(tenant.StateCode) ? tenant.StateCode.Trim() : null;
            if (string.IsNullOrWhiteSpace(sellerStateCode) && !string.IsNullOrWhiteSpace(tenant.GSTIN) && tenant.GSTIN.Trim().Length >= 2 && char.IsDigit(tenant.GSTIN.Trim()[0]) && char.IsDigit(tenant.GSTIN.Trim()[1]))
            {
                sellerStateCode = tenant.GSTIN.Trim().Substring(0, 2);
            }
        }
        sellerStateCode = sellerStateCode ?? "06";

        // Determine Customer Snapshot
        string customerName = request.CustomerName;
        string? customerPhone = request.CustomerPhone;
        string? customerEmail = request.CustomerEmail;
        string? customerGSTIN = request.CustomerGSTIN;
        string? billingAddress = request.BillingAddress;
        string? shippingAddress = request.ShippingAddress;
        string? customerStateCode = !string.IsNullOrWhiteSpace(request.StateCode) ? request.StateCode.Trim() : null;
        string? customerStateName = null;

        if (request.PartyId.HasValue)
        {
            var party = await _context.Parties
                .Include(p => p.Addresses)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                if (string.IsNullOrWhiteSpace(customerName)) customerName = party.LegalName;
                customerPhone ??= party.PrimaryPhone ?? party.Mobile;
                customerEmail ??= party.Email;
                customerGSTIN ??= party.GSTIN;

                var bAddr = party.Addresses.FirstOrDefault(a => a.AddressType == Domain.Entities.Parties.AddressType.Billing)
                           ?? party.Addresses.FirstOrDefault();
                if (bAddr != null)
                {
                    if (string.IsNullOrWhiteSpace(billingAddress))
                    {
                        var addrParts = new List<string>();
                        if (!string.IsNullOrWhiteSpace(bAddr.AddressLine1)) addrParts.Add(bAddr.AddressLine1.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.AddressLine2)) addrParts.Add(bAddr.AddressLine2.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.City)) addrParts.Add(bAddr.City.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.State)) addrParts.Add(bAddr.State.Trim());
                        if (!string.IsNullOrWhiteSpace(bAddr.Pincode)) addrParts.Add(bAddr.Pincode.Trim());
                        billingAddress = string.Join(", ", addrParts);
                    }
                    if (string.IsNullOrWhiteSpace(customerStateCode))
                    {
                        customerStateCode = bAddr.StateCode;
                    }
                    if (string.IsNullOrWhiteSpace(customerStateName))
                    {
                        customerStateName = bAddr.State;
                    }
                }
            }
        }

        if (string.IsNullOrWhiteSpace(customerStateCode) && !string.IsNullOrWhiteSpace(customerGSTIN) && customerGSTIN.Trim().Length >= 2 && char.IsDigit(customerGSTIN.Trim()[0]) && char.IsDigit(customerGSTIN.Trim()[1]))
        {
            customerStateCode = customerGSTIN.Trim().Substring(0, 2);
        }

        customerStateCode = customerStateCode ?? sellerStateCode;
        if (string.IsNullOrWhiteSpace(customerStateName) && StateCodeMap.TryGetValue(customerStateCode, out var mappedState))
        {
            customerStateName = mappedState;
        }
        customerStateName ??= "Uttar Pradesh";

        string placeOfSupply = !string.IsNullOrWhiteSpace(request.PlaceOfSupply)
            ? request.PlaceOfSupply
            : $"{customerStateCode} - {customerStateName}";

        var isInterState = !string.Equals(sellerStateCode, customerStateCode, StringComparison.OrdinalIgnoreCase);
        var taxSupplyType = isInterState ? TaxSupplyType.InterState : TaxSupplyType.IntraState;

        var itemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var masterItems = await _context.Items
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && itemIds.Contains(i.Id) && !i.IsDeleted)
            .ToDictionaryAsync(i => i.Id, cancellationToken);

        var qDate = DateTime.SpecifyKind(request.QuotationDate, DateTimeKind.Utc);
        var validUntil = request.ValidUntilDate.HasValue
            ? DateTime.SpecifyKind(request.ValidUntilDate.Value, DateTimeKind.Utc)
            : (DateTime?)null;

        quotation.BranchId = branch.Id;
        quotation.PartyId = request.PartyId;
        quotation.CustomerName = customerName;
        quotation.CustomerPhone = customerPhone;
        quotation.CustomerEmail = customerEmail;
        quotation.CustomerGSTIN = customerGSTIN;
        quotation.BillingAddress = billingAddress;
        quotation.ShippingAddress = shippingAddress;
        quotation.BillingStateCode = customerStateCode;
        quotation.ShippingStateCode = customerStateCode;
        quotation.PlaceOfSupply = placeOfSupply;
        quotation.QuotationDate = qDate;
        quotation.ValidUntilDate = validUntil;
        quotation.TaxSupplyType = taxSupplyType;
        quotation.QuotationDiscountPercent = request.QuotationDiscountPercent;
        quotation.Notes = request.Notes;
        quotation.TermsAndConditions = request.TermsAndConditions;
        if (!string.IsNullOrWhiteSpace(request.AttributesJson))
        {
            quotation.AttributesJson = request.AttributesJson;
        }

        // Clear existing items and re-populate
        _context.QuotationItems.RemoveRange(quotation.Items);
        quotation.Items.Clear();

        decimal subTotal = 0;
        decimal itemDiscountTotal = 0;
        decimal totalTaxable = 0;
        decimal totalCgst = 0;
        decimal totalSgst = 0;
        decimal totalIgst = 0;
        decimal totalCess = 0;

        foreach (var reqItem in request.Items)
        {
            if (!masterItems.TryGetValue(reqItem.ItemId, out var masterItem))
            {
                return Result<Guid>.Failure($"Item with ID '{reqItem.ItemId}' not found.", "ITEM_NOT_FOUND");
            }

            var lineGross = reqItem.Quantity * reqItem.UnitPrice;
            var lineDisc = lineGross * (reqItem.DiscountPercent / 100m);
            var lineTaxable = lineGross - lineDisc;

            var gstRate = masterItem.TaxRate;
            decimal cgstRate = 0, sgstRate = 0, igstRate = 0;
            decimal cgstAmt = 0, sgstAmt = 0, igstAmt = 0, cessAmt = 0;

            if (taxSupplyType == TaxSupplyType.IntraState)
            {
                cgstRate = gstRate / 2m;
                sgstRate = gstRate / 2m;
                cgstAmt = Math.Round(lineTaxable * (cgstRate / 100m), 2, MidpointRounding.AwayFromZero);
                sgstAmt = Math.Round(lineTaxable * (sgstRate / 100m), 2, MidpointRounding.AwayFromZero);
            }
            else
            {
                igstRate = gstRate;
                igstAmt = Math.Round(lineTaxable * (igstRate / 100m), 2, MidpointRounding.AwayFromZero);
            }

            var lineTotal = lineTaxable + cgstAmt + sgstAmt + igstAmt + cessAmt;

            subTotal += lineGross;
            itemDiscountTotal += lineDisc;
            totalTaxable += lineTaxable;
            totalCgst += cgstAmt;
            totalSgst += sgstAmt;
            totalIgst += igstAmt;
            totalCess += cessAmt;

            var qItem = new QuotationItem
            {
                TenantId = tenantId,
                ItemId = masterItem.Id,
                ItemSku = masterItem.Sku,
                ItemName = masterItem.Name,
                HsnCode = masterItem.HSNCode,
                Quantity = reqItem.Quantity,
                UomId = reqItem.UomId,
                UnitPrice = reqItem.UnitPrice,
                DiscountPercent = reqItem.DiscountPercent,
                DiscountAmount = lineDisc,
                TaxableAmount = lineTaxable,
                GstRate = gstRate,
                CgstRate = cgstRate,
                CgstAmount = cgstAmt,
                SgstRate = sgstRate,
                SgstAmount = sgstAmt,
                IgstRate = igstRate,
                IgstAmount = igstAmt,
                CessRate = 0,
                CessAmount = cessAmt,
                TotalAmount = lineTotal,
                AttributesJson = reqItem.AttributesJson ?? "{}"
            };

            quotation.Items.Add(qItem);
        }

        decimal globalDiscountAmt = 0;
        if (request.QuotationDiscountPercent > 0)
        {
            globalDiscountAmt = Math.Round(totalTaxable * (request.QuotationDiscountPercent / 100m), 4);
            totalTaxable -= globalDiscountAmt;
        }

        var unroundedTotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
        var roundedTotal = Math.Round(unroundedTotal, 0, MidpointRounding.AwayFromZero);
        var roundOff = roundedTotal - unroundedTotal;

        quotation.SubTotal = subTotal;
        quotation.ItemDiscountTotal = itemDiscountTotal;
        quotation.QuotationDiscountAmount = globalDiscountAmt;
        quotation.TaxableAmount = totalTaxable;
        quotation.CgstAmount = totalCgst;
        quotation.SgstAmount = totalSgst;
        quotation.IgstAmount = totalIgst;
        quotation.CessAmount = totalCess;
        quotation.RoundOff = roundOff;
        quotation.TotalAmount = roundedTotal;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = Domain.Enums.AuditActionType.Update,
            ActionName = "UpdateQuotation",
            EntityName = "Quotation",
            EntityId = quotation.Id.ToString(),
            NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new { quotation.QuotationNumber, quotation.CustomerName, quotation.TotalAmount }),
            IpAddress = ipAddress,
            TimestampUtc = DateTime.UtcNow
        }, cancellationToken);

        return Result<Guid>.Success(quotation.Id);
    }

    public async Task<Result<Guid>> ConvertQuotationToInvoiceAsync(Guid quotationId, ConvertQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var semaphore = _tenantQuotationSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        try
        {
            var quotation = await _context.Quotations
                .Include(q => q.Items)
                .FirstOrDefaultAsync(q => q.TenantId == tenantId && q.Id == quotationId && !q.IsDeleted, cancellationToken);

            if (quotation == null)
            {
                return Result<Guid>.Failure("Quotation not found.", "NOT_FOUND");
            }

            if (quotation.Status == QuotationStatus.ConvertedToInvoice)
            {
                return Result<Guid>.Failure($"Quotation is already converted to Invoice.", "ALREADY_CONVERTED");
            }

            if (quotation.IsCancelled || quotation.Status == QuotationStatus.Cancelled)
            {
                return Result<Guid>.Failure("Cannot convert a cancelled quotation.", "CANCELLED_QUOTATION");
            }

            // Build CreateSalesInvoiceRequest
            var invoiceItems = quotation.Items.Select(i =>
            {
                Guid? batchId = null;
                string? batchNumber = null;
                DateTime? expiryDate = null;
                if (!string.IsNullOrWhiteSpace(i.AttributesJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(i.AttributesJson);
                        if (doc.RootElement.TryGetProperty("batchId", out var bId) && Guid.TryParse(bId.GetString(), out var parsedBId))
                            batchId = parsedBId;
                        if (doc.RootElement.TryGetProperty("batchNumber", out var bNum))
                            batchNumber = bNum.GetString();
                        if (doc.RootElement.TryGetProperty("expiryDate", out var exp) && DateTime.TryParse(exp.GetString(), out var parsedExp))
                            expiryDate = parsedExp;
                    }
                    catch { }
                }

                return new CreateSalesInvoiceItemRequest
                {
                    ItemId = i.ItemId,
                    Quantity = i.Quantity,
                    UomId = i.UomId,
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    HsnCode = i.HsnCode,
                    ItemName = i.ItemName,
                    BatchId = batchId,
                    BatchNumber = batchNumber,
                    ExpiryDate = expiryDate,
                    AttributesJson = i.AttributesJson
                };
            }).ToList();

            var warehouseId = request.WarehouseId;
            if (warehouseId == Guid.Empty)
            {
                var defaultWh = await _context.TenantWarehouses
                    .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.BranchId == quotation.BranchId && w.IsDefault && !w.IsDeleted, cancellationToken)
                    ?? await _context.TenantWarehouses
                    .FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);
                if (defaultWh != null)
                {
                    warehouseId = defaultWh.Id;
                }
            }

            var invoiceReq = new CreateSalesInvoiceRequest
            {
                InvoiceType = InvoiceType.TaxInvoice,
                BranchId = quotation.BranchId,
                WarehouseId = warehouseId,
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
                InvoiceDate = request.InvoiceDate,
                DueDate = request.DueDate,
                InvoiceDiscountPercent = quotation.QuotationDiscountPercent,
                PrimaryPaymentMode = (PaymentMode)request.PrimaryPaymentMode,
                PaidAmount = request.PaidAmount,
                PaymentReferenceNumber = request.PaymentReferenceNumber,
                Notes = request.Notes ?? $"Generated from Quotation {quotation.QuotationNumber}",
                TermsAndConditions = quotation.TermsAndConditions,
                AttributesJson = !string.IsNullOrWhiteSpace(quotation.AttributesJson) && quotation.AttributesJson != "{}" ? quotation.AttributesJson : "{}",
                Items = invoiceItems
            };

            var previousStatus = quotation.Status;
            // Transition and commit status immediately so concurrent requests across any instance are blocked
            quotation.Status = QuotationStatus.ConvertedToInvoice;
            quotation.ConvertedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            var invoiceResult = await _salesService.CreateInvoiceAsync(invoiceReq, ipAddress, cancellationToken);
            if (!invoiceResult.IsSuccess)
            {
                // Revert status on invoice creation failure
                quotation.Status = previousStatus;
                quotation.ConvertedAtUtc = null;
                await _context.SaveChangesAsync(cancellationToken);
                return Result<Guid>.Failure(invoiceResult.ErrorMessage ?? "Failed to convert quotation to invoice.", invoiceResult.ErrorCode);
            }

            var invoiceId = invoiceResult.Data;
            quotation.ConvertedInvoiceId = invoiceId;
            await _context.SaveChangesAsync(cancellationToken);

            await _auditService.LogAsync(new AuditLog
            {
                TenantId = tenantId,
                UserId = _currentUserContext.UserId,
                UserEmail = _currentUserContext.Email,
                Action = Domain.Enums.AuditActionType.Update,
                ActionName = "ConvertQuotationToInvoice",
                EntityName = "Quotation",
                EntityId = quotation.Id.ToString(),
                NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new { quotation.QuotationNumber, ConvertedInvoiceId = invoiceId }),
                IpAddress = ipAddress,
                TimestampUtc = DateTime.UtcNow
            }, cancellationToken);

            return Result<Guid>.Success(invoiceId);
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task<Result<bool>> CancelQuotationAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var quotation = await _context.Quotations
            .FirstOrDefaultAsync(q => q.TenantId == tenantId && q.Id == id && !q.IsDeleted, cancellationToken);

        if (quotation == null)
        {
            return Result<bool>.Failure("Quotation not found.", "NOT_FOUND");
        }

        if (quotation.Status == QuotationStatus.ConvertedToInvoice)
        {
            return Result<bool>.Failure("Cannot cancel a quotation that has already been converted to an invoice.", "ALREADY_CONVERTED");
        }

        quotation.IsCancelled = true;
        quotation.Status = QuotationStatus.Cancelled;
        quotation.CancellationReason = cancellationReason;
        quotation.CancelledAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = Domain.Enums.AuditActionType.Delete,
            ActionName = "CancelQuotation",
            EntityName = "Quotation",
            EntityId = quotation.Id.ToString(),
            NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new { quotation.QuotationNumber, cancellationReason }),
            IpAddress = ipAddress,
            TimestampUtc = DateTime.UtcNow
        }, cancellationToken);

        return Result<bool>.Success(true);
    }

    private async Task<string> GenerateQuotationNumberAsync(Guid tenantId, DateTime date, CancellationToken cancellationToken)
    {
        var seriesSetting = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Category == "Invoice" && s.Key == "DocumentSeriesConfig", cancellationToken);

        DocumentSeriesConfigDto? seriesConfig = null;
        if (seriesSetting != null && !string.IsNullOrWhiteSpace(seriesSetting.Value))
        {
            try
            {
                seriesConfig = System.Text.Json.JsonSerializer.Deserialize<DocumentSeriesConfigDto>(
                    seriesSetting.Value,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { }
        }

        if (seriesConfig?.Quotation != null && !string.IsNullOrWhiteSpace(seriesConfig.Quotation.Prefix))
        {
            var activeSeries = seriesConfig.Quotation;
            var customPrefix = activeSeries.Prefix.Trim();
            var customSuffix = activeSeries.Suffix?.Trim() ?? string.Empty;
            int padding = activeSeries.Padding;

            var existingQuotations = await _context.Quotations
                .Where(q => q.TenantId == tenantId && q.QuotationNumber.StartsWith(customPrefix))
                .Select(q => q.QuotationNumber)
                .ToListAsync(cancellationToken);

            int maxNum = Math.Max(0, activeSeries.NextNumber - 1);
            foreach (var qNum in existingQuotations)
            {
                if (string.IsNullOrWhiteSpace(qNum) || qNum.Length <= customPrefix.Length)
                    continue;

                var middle = qNum.Substring(customPrefix.Length);
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
            return $"{customPrefix}{numPart}{customSuffix}";
        }

        int fyStart = date.Month >= 4 ? date.Year : date.Year - 1;
        string fyCode = $"{fyStart % 100:D2}{(fyStart + 1) % 100:D2}";
        string prefix = $"QT-{fyCode}-";

        var lastNum = await _context.Quotations
            .Where(q => q.TenantId == tenantId && q.QuotationNumber.StartsWith(prefix))
            .OrderByDescending(q => q.QuotationNumber)
            .Select(q => q.QuotationNumber)
            .FirstOrDefaultAsync(cancellationToken);

        int nextSeq = 1;
        if (!string.IsNullOrEmpty(lastNum))
        {
            var parts = lastNum.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out int parsed))
            {
                nextSeq = parsed + 1;
            }
        }

        return $"{prefix}{nextSeq:D5}";
    }

    private QuotationDetailsDto MapToDetailsDto(Quotation q, Tenant? tenant = null)
    {
        var taxSummary = q.Items
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

        // Company registered address assembly
        var compAddrParts = new List<string>();
        if (tenant != null)
        {
            if (!string.IsNullOrWhiteSpace(tenant.AddressLine1)) compAddrParts.Add(tenant.AddressLine1.Trim());
            if (!string.IsNullOrWhiteSpace(tenant.AddressLine2)) compAddrParts.Add(tenant.AddressLine2.Trim());
            if (!string.IsNullOrWhiteSpace(tenant.City)) compAddrParts.Add(tenant.City.Trim());
            if (!string.IsNullOrWhiteSpace(tenant.State)) compAddrParts.Add(tenant.State.Trim());
            if (!string.IsNullOrWhiteSpace(tenant.Pincode)) compAddrParts.Add(tenant.Pincode.Trim());
        }
        var compAddress = string.Join(", ", compAddrParts);

        // Branch address assembly
        var branchAddrParts = new List<string>();
        if (q.Branch != null)
        {
            if (!string.IsNullOrWhiteSpace(q.Branch.AddressLine1)) branchAddrParts.Add(q.Branch.AddressLine1.Trim());
            if (!string.IsNullOrWhiteSpace(q.Branch.AddressLine2)) branchAddrParts.Add(q.Branch.AddressLine2.Trim());
            if (!string.IsNullOrWhiteSpace(q.Branch.City)) branchAddrParts.Add(q.Branch.City.Trim());
            if (!string.IsNullOrWhiteSpace(q.Branch.State)) branchAddrParts.Add(q.Branch.State.Trim());
            if (!string.IsNullOrWhiteSpace(q.Branch.Pincode)) branchAddrParts.Add(q.Branch.Pincode.Trim());
        }
        var branchFullAddress = string.Join(", ", branchAddrParts);

        return new QuotationDetailsDto
        {
            Id = q.Id,
            TenantId = q.TenantId,
            QuotationNumber = q.QuotationNumber,
            Status = q.Status,

            // Company Identity
            CompanyName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : (tenant?.TradeName ?? "Company Name"),
            CompanyTradeName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (tenant?.BusinessName ?? "Company Name"),
            CompanyLogoUrl = tenant?.LogoUrl,
            CompanyGstin = !string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : (q.Branch?.GSTIN ?? string.Empty),
            CompanyPan = tenant?.PAN ?? string.Empty,
            CompanyEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : (tenant?.AdminEmail ?? string.Empty),
            CompanyPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) ? tenant.PrimaryPhone : (q.Branch?.Phone ?? string.Empty),
            CompanyWebsite = tenant?.Website ?? string.Empty,
            CompanyAddress = !string.IsNullOrWhiteSpace(compAddress) ? compAddress : (tenant?.AddressLine1 ?? string.Empty),
            CompanyCity = tenant?.City ?? string.Empty,
            CompanyState = tenant?.State ?? string.Empty,
            CompanyStateCode = tenant?.StateCode ?? string.Empty,
            CompanyPincode = tenant?.Pincode ?? string.Empty,
            IndustryTypeCode = tenant?.IndustryTypeCode ?? "OTHER",

            // Bank Details
            BankName = tenant?.BankName,
            BankAccountNumber = tenant?.BankAccountNumber,
            BankIfsc = tenant?.BankIfsc,
            BankBranch = tenant?.BankBranch,
            UpiId = tenant?.UpiId,

            // Branch Details
            BranchId = q.BranchId,
            BranchName = q.Branch?.BranchName ?? string.Empty,
            BranchGstin = q.Branch?.GSTIN ?? string.Empty,
            BranchAddress = !string.IsNullOrWhiteSpace(branchFullAddress) ? branchFullAddress : (q.Branch?.AddressLine1 ?? string.Empty),
            BranchState = q.Branch?.State ?? string.Empty,
            BranchStateCode = q.Branch?.StateCode ?? string.Empty,
            BranchCity = q.Branch?.City ?? string.Empty,
            BranchPincode = q.Branch?.Pincode ?? string.Empty,
            BranchPhone = q.Branch?.Phone ?? string.Empty,
            BranchEmail = q.Branch?.Email ?? string.Empty,

            PartyId = q.PartyId,
            CustomerName = q.CustomerName,
            CustomerPhone = q.CustomerPhone,
            CustomerEmail = q.CustomerEmail,
            CustomerGSTIN = q.CustomerGSTIN,
            BillingAddress = q.BillingAddress,
            ShippingAddress = q.ShippingAddress,
            BillingStateCode = q.BillingStateCode,
            ShippingStateCode = q.ShippingStateCode,
            PlaceOfSupply = q.PlaceOfSupply,
            QuotationDate = q.QuotationDate,
            ValidUntilDate = q.ValidUntilDate,
            TaxSupplyType = q.TaxSupplyType,
            SubTotal = q.SubTotal,
            ItemDiscountTotal = q.ItemDiscountTotal,
            QuotationDiscountPercent = q.QuotationDiscountPercent,
            QuotationDiscountAmount = q.QuotationDiscountAmount,
            TaxableAmount = q.TaxableAmount,
            CgstAmount = q.CgstAmount,
            SgstAmount = q.SgstAmount,
            IgstAmount = q.IgstAmount,
            CessAmount = q.CessAmount,
            RoundOff = q.RoundOff,
            TotalAmount = q.TotalAmount,
            ConvertedInvoiceId = q.ConvertedInvoiceId,
            ConvertedInvoiceNumber = q.ConvertedInvoice?.InvoiceNumber,
            ConvertedAtUtc = q.ConvertedAtUtc,
            Notes = q.Notes,
            TermsAndConditions = q.TermsAndConditions,
            AttributesJson = q.AttributesJson,
            IsCancelled = q.IsCancelled,
            CancellationReason = q.CancellationReason,
            CreatedAtUtc = q.CreatedAtUtc,
            Items = q.Items.Select(i => {
                string? batchNo = null;
                string? expDate = null;
                decimal? mrp = null;

                if (!string.IsNullOrWhiteSpace(i.AttributesJson) && i.AttributesJson != "{}")
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(i.AttributesJson);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("batchNumber", out var b)) batchNo = b.GetString();
                        else if (root.TryGetProperty("BatchNumber", out var b2)) batchNo = b2.GetString();

                        if (root.TryGetProperty("expiryDate", out var e)) expDate = e.GetString();
                        else if (root.TryGetProperty("ExpiryDate", out var e2)) expDate = e2.GetString();

                        if (root.TryGetProperty("mrp", out var m) && m.TryGetDecimal(out var mVal)) mrp = mVal;
                        else if (root.TryGetProperty("Mrp", out var m2) && m2.TryGetDecimal(out var mVal2)) mrp = mVal2;
                    }
                    catch {}
                }

                return new QuotationItemListDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemSku = i.ItemSku,
                    ItemName = i.ItemName,
                    HsnCode = i.HsnCode,
                    Quantity = i.Quantity,
                    UomId = i.UomId,
                    UomCode = i.Uom?.Code ?? "UNIT",
                    UnitPrice = i.UnitPrice,
                    DiscountPercent = i.DiscountPercent,
                    DiscountAmount = i.DiscountAmount,
                    TaxableAmount = i.TaxableAmount,
                    GstRate = i.GstRate,
                    CgstRate = i.CgstRate,
                    CgstAmount = i.CgstAmount,
                    SgstRate = i.SgstRate,
                    SgstAmount = i.SgstAmount,
                    IgstRate = i.IgstRate,
                    IgstAmount = i.IgstAmount,
                    CessRate = i.CessRate,
                    CessAmount = i.CessAmount,
                    TotalAmount = i.TotalAmount,
                    BatchNumber = batchNo,
                    ExpiryDate = expDate,
                    Mrp = mrp,
                    AttributesJson = i.AttributesJson
                };
            }).ToList(),
            TaxSummary = taxSummary
        };
    }
}
