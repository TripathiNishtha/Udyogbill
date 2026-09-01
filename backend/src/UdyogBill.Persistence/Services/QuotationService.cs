using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class QuotationService : IQuotationService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;
    private readonly ISalesService _salesService;

    public QuotationService(
        AppDbContext context,
        ICurrentUserContext currentUserContext,
        IAuditService auditService,
        ISalesService salesService)
    {
        _context = context;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
        _salesService = salesService;
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

        return Result<QuotationDetailsDto>.Success(MapToDetailsDto(quotation));
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

        return Result<QuotationDetailsDto>.Success(MapToDetailsDto(quotation));
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

        // Determine Customer Snapshot
        string customerName = request.CustomerName;
        string? customerPhone = request.CustomerPhone;
        string? customerEmail = request.CustomerEmail;
        string? customerGSTIN = request.CustomerGSTIN;
        string? billingAddress = request.BillingAddress;
        string? shippingAddress = request.ShippingAddress;
        string customerStateCode = request.StateCode ?? branch.StateCode ?? "09";
        string branchState = branch.State ?? "Uttar Pradesh";
        string placeOfSupply = request.PlaceOfSupply ?? $"{customerStateCode} - {branchState}";

        if (request.PartyId.HasValue)
        {
            var party = await _context.Parties
                .Include(p => p.Addresses)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId.Value && !p.IsDeleted, cancellationToken);

            if (party != null)
            {
                customerName = party.LegalName;
                customerPhone ??= party.PrimaryPhone ?? party.Mobile;
                customerEmail ??= party.Email;
                customerGSTIN ??= party.GSTIN;

                var bAddr = party.Addresses.FirstOrDefault(a => a.AddressType == Domain.Entities.Parties.AddressType.Billing)
                           ?? party.Addresses.FirstOrDefault();
                if (bAddr != null)
                {
                    billingAddress ??= $"{bAddr.AddressLine1}, {bAddr.City}, {bAddr.State} {bAddr.Pincode}".Trim();
                    customerStateCode = bAddr.StateCode ?? branch.StateCode ?? "09";
                    placeOfSupply = $"{customerStateCode} - {bAddr.State ?? branchState}";
                }
            }
        }

        // Determine Tax Supply Type
        var isInterState = !string.Equals(branch.StateCode ?? "09", customerStateCode, StringComparison.OrdinalIgnoreCase);
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

        // Generate Quotation Number
        var qNumber = await GenerateQuotationNumberAsync(tenantId, request.QuotationDate, cancellationToken);

        var qDate = DateTime.SpecifyKind(request.QuotationDate, DateTimeKind.Utc);
        var validUntil = request.ValidUntilDate.HasValue
            ? DateTime.SpecifyKind(request.ValidUntilDate.Value, DateTimeKind.Utc)
            : (DateTime?)null;

        var quotation = new Quotation
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
                cgstAmt = Math.Round(lineTaxable * (cgstRate / 100m), 4);
                sgstAmt = Math.Round(lineTaxable * (sgstRate / 100m), 4);
            }
            else
            {
                igstRate = gstRate;
                igstAmt = Math.Round(lineTaxable * (igstRate / 100m), 4);
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

    public async Task<Result<Guid>> ConvertQuotationToInvoiceAsync(Guid quotationId, ConvertQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

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
        var invoiceItems = quotation.Items.Select(i => new CreateSalesInvoiceItemRequest
        {
            ItemId = i.ItemId,
            Quantity = i.Quantity,
            UomId = i.UomId,
            UnitPrice = i.UnitPrice,
            DiscountPercent = i.DiscountPercent,
            AttributesJson = i.AttributesJson
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
            AttributesJson = "{}",
            Items = invoiceItems
        };

        var invoiceResult = await _salesService.CreateInvoiceAsync(invoiceReq, ipAddress, cancellationToken);
        if (!invoiceResult.IsSuccess)
        {
            return Result<Guid>.Failure(invoiceResult.ErrorMessage ?? "Failed to convert quotation to invoice.", invoiceResult.ErrorCode);
        }

        var invoiceId = invoiceResult.Data;

        quotation.Status = QuotationStatus.ConvertedToInvoice;
        quotation.ConvertedInvoiceId = invoiceId;
        quotation.ConvertedAtUtc = DateTime.UtcNow;

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

    private QuotationDetailsDto MapToDetailsDto(Quotation q)
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

        return new QuotationDetailsDto
        {
            Id = q.Id,
            TenantId = q.TenantId,
            QuotationNumber = q.QuotationNumber,
            Status = q.Status,
            BranchId = q.BranchId,
            BranchName = q.Branch?.BranchName ?? string.Empty,
            BranchGstin = q.Branch?.GSTIN ?? string.Empty,
            BranchAddress = q.Branch?.AddressLine1 ?? string.Empty,
            BranchStateCode = q.Branch?.StateCode ?? string.Empty,
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
            Items = q.Items.Select(i => new QuotationItemListDto
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
                TotalAmount = i.TotalAmount
            }).ToList(),
            TaxSummary = taxSummary
        };
    }
}
