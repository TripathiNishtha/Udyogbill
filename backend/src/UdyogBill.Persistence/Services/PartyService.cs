using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PartyService : IPartyService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public PartyService(
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

    private static string? ExtractGstinStateCode(string? gstin)
    {
        if (string.IsNullOrWhiteSpace(gstin)) return null;
        var clean = gstin.Trim().ToUpperInvariant();
        if (clean.Length >= 2 && char.IsDigit(clean[0]) && char.IsDigit(clean[1]))
        {
            return clean.Substring(0, 2);
        }
        return null;
    }

    #region Party Queries & Management

    public async Task<Result<PagedResult<PartyListDto>>> GetPartiesAsync(
        int pageNumber,
        int pageSize,
        PartyType? partyType = null,
        CustomerType? customerType = null,
        SupplierType? supplierType = null,
        string? searchTerm = null,
        bool? outstandingOnly = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.Parties
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .AsQueryable();

        if (partyType.HasValue)
        {
            query = query.Where(p => p.PartyType == partyType.Value || p.PartyType == PartyType.Both);
        }

        if (customerType.HasValue)
        {
            query = query.Where(p => p.CustomerType == customerType.Value);
        }

        if (supplierType.HasValue)
        {
            query = query.Where(p => p.SupplierType == supplierType.Value);
        }

        if (outstandingOnly.HasValue && outstandingOnly.Value)
        {
            query = query.Where(p => p.CurrentOutstandingBalance != 0);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p =>
                p.LegalName.ToLower().Contains(term) ||
                p.Code.ToLower().Contains(term) ||
                (p.TradeName != null && p.TradeName.ToLower().Contains(term)) ||
                (p.GSTIN != null && p.GSTIN.ToLower().Contains(term)) ||
                (p.Mobile != null && p.Mobile.Contains(term)) ||
                (p.PrimaryPhone != null && p.PrimaryPhone.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var parties = await query
            .OrderBy(p => p.LegalName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PartyListDto(
                p.Id,
                p.TenantId,
                p.Code,
                p.LegalName,
                p.TradeName,
                p.ContactPersonName,
                p.PartyType,
                p.CustomerType,
                p.SupplierType,
                p.Email,
                p.PrimaryPhone,
                p.Mobile,
                p.GSTIN,
                p.StateCode,
                p.CreditLimit,
                p.CreditPeriodDays,
                p.IsCreditBlocked,
                p.CurrentOutstandingBalance,
                p.IsActive,
                p.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<PartyListDto>>.Success(
            PagedResult<PartyListDto>.Create(parties, pageNumber, pageSize, totalCount)
        );
    }

    public async Task<Result<PartyDetailsDto>> GetPartyByIdAsync(Guid partyId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .Where(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted)
            .Include(p => p.Addresses.Where(a => !a.IsDeleted))
            .Include(p => p.LedgerEntries.Where(l => !l.IsDeleted).OrderByDescending(l => l.TransactionDate).Take(20))
            .FirstOrDefaultAsync(cancellationToken);

        if (party == null)
        {
            return Result<PartyDetailsDto>.Failure("Party not found.", "NOT_FOUND");
        }

        var addressDtos = party.Addresses.Select(a => new PartyAddressDto(
            a.Id,
            a.PartyId,
            a.AddressType,
            a.Label,
            a.AddressLine1,
            a.AddressLine2,
            a.City,
            a.State,
            a.StateCode,
            a.Pincode,
            a.Country,
            a.ContactPerson,
            a.ContactPhone,
            a.IsDefault
        )).ToList();

        var ledgerDtos = party.LedgerEntries.Select(l => new PartyLedgerEntryDto(
            l.Id,
            l.PartyId,
            l.TransactionDate,
            l.EntryType,
            l.EntryType.ToString(),
            l.DebitAmount,
            l.CreditAmount,
            l.RunningBalance,
            l.ReferenceDocumentType,
            l.ReferenceDocumentId,
            l.ReferenceDocumentNumber,
            l.PaymentMode,
            l.Description,
            l.CreatedAtUtc
        )).ToList();

        var dto = new PartyDetailsDto(
            party.Id,
            party.TenantId,
            party.Code,
            party.LegalName,
            party.TradeName,
            party.ContactPersonName,
            party.PartyType,
            party.CustomerType,
            party.SupplierType,
            party.Email,
            party.PrimaryPhone,
            party.Mobile,
            party.SecondaryPhone,
            party.Website,
            party.GSTIN,
            party.StateCode,
            party.PAN,
            party.TAN,
            party.IsCompositionScheme,
            party.DrugLicenseNumber1,
            party.DrugLicenseNumber2,
            party.FSSAINumber,
            party.CreditLimit,
            party.CreditPeriodDays,
            party.IsCreditBlocked,
            party.PriceTier,
            party.OpeningBalance,
            party.OpeningBalanceType,
            party.OpeningBalanceDate,
            party.CurrentOutstandingBalance,
            party.AttributesJson,
            party.IsActive,
            party.CreatedAtUtc,
            addressDtos,
            ledgerDtos
        );

        return Result<PartyDetailsDto>.Success(dto);
    }

    public async Task<Result<PartyDetailsDto>> GetPartyByGstinAsync(string gstin, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var cleanGstin = gstin.Trim().ToUpperInvariant();

        var party = await _context.Parties
            .Where(p => p.TenantId == tenantId && p.GSTIN == cleanGstin && !p.IsDeleted)
            .Select(p => p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (party == Guid.Empty)
        {
            return Result<PartyDetailsDto>.Failure($"Party with GSTIN '{cleanGstin}' not found.", "NOT_FOUND");
        }

        return await GetPartyByIdAsync(party, cancellationToken);
    }

    public async Task<Result<Guid>> CreatePartyAsync(CreatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Parties
            .AnyAsync(p => p.TenantId == tenantId && p.Code == normalizedCode && !p.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Party code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var cleanGstin = request.GSTIN?.Trim().ToUpperInvariant();
        var stateCode = ExtractGstinStateCode(cleanGstin);

        var openingBal = request.OpeningBalance;
        var initialOutstanding = openingBal > 0
            ? (request.OpeningBalanceType == BalanceType.Debit ? openingBal : -openingBal)
            : 0m;

        var party = new Party
        {
            TenantId = tenantId,
            Code = normalizedCode,
            LegalName = request.LegalName.Trim(),
            TradeName = request.TradeName?.Trim(),
            ContactPersonName = request.ContactPersonName?.Trim(),
            PartyType = request.PartyType,
            CustomerType = request.CustomerType,
            SupplierType = request.SupplierType,
            Email = request.Email?.Trim().ToLowerInvariant(),
            PrimaryPhone = request.PrimaryPhone?.Trim(),
            Mobile = request.Mobile?.Trim(),
            SecondaryPhone = request.SecondaryPhone?.Trim(),
            Website = request.Website?.Trim(),
            GSTIN = cleanGstin,
            StateCode = stateCode,
            PAN = request.PAN?.Trim().ToUpperInvariant(),
            TAN = request.TAN?.Trim().ToUpperInvariant(),
            IsCompositionScheme = request.IsCompositionScheme,
            DrugLicenseNumber1 = request.DrugLicenseNumber1?.Trim(),
            DrugLicenseNumber2 = request.DrugLicenseNumber2?.Trim(),
            FSSAINumber = request.FSSAINumber?.Trim(),
            CreditLimit = request.CreditLimit,
            CreditPeriodDays = request.CreditPeriodDays,
            IsCreditBlocked = false,
            PriceTier = request.PriceTier?.Trim(),
            OpeningBalance = openingBal,
            OpeningBalanceType = request.OpeningBalanceType,
            OpeningBalanceDate = request.OpeningBalanceDate.HasValue
                ? DateTime.SpecifyKind(request.OpeningBalanceDate.Value, DateTimeKind.Utc)
                : DateTime.UtcNow,
            CurrentOutstandingBalance = initialOutstanding,
            AttributesJson = request.AttributesJson ?? "{}",
            IsActive = true
        };

        if (request.BillingAddress != null)
        {
            party.Addresses.Add(new PartyAddress
            {
                TenantId = tenantId,
                AddressType = request.BillingAddress.AddressType,
                Label = request.BillingAddress.Label?.Trim() ?? "Billing Address",
                AddressLine1 = request.BillingAddress.AddressLine1.Trim(),
                AddressLine2 = request.BillingAddress.AddressLine2?.Trim(),
                City = request.BillingAddress.City.Trim(),
                State = request.BillingAddress.State.Trim(),
                StateCode = request.BillingAddress.StateCode.Trim(),
                Pincode = request.BillingAddress.Pincode.Trim(),
                Country = request.BillingAddress.Country.Trim(),
                ContactPerson = request.BillingAddress.ContactPerson?.Trim(),
                ContactPhone = request.BillingAddress.ContactPhone?.Trim(),
                IsDefault = true
            });
        }

        _context.Parties.Add(party);

        // Record Initial Opening Balance Ledger Entry
        if (openingBal > 0)
        {
            var isDebit = request.OpeningBalanceType == BalanceType.Debit;
            var ledgerEntry = new PartyLedgerEntry
            {
                TenantId = tenantId,
                Party = party,
                TransactionDate = party.OpeningBalanceDate ?? DateTime.UtcNow,
                EntryType = PartyLedgerEntryType.OpeningBalance,
                DebitAmount = isDebit ? openingBal : 0m,
                CreditAmount = !isDebit ? openingBal : 0m,
                RunningBalance = initialOutstanding,
                ReferenceDocumentType = "OpeningBalance",
                Description = $"Opening balance on onboarding ({request.OpeningBalanceType})"
            };
            _context.PartyLedgerEntries.Add(ledgerEntry);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateParty",
            EntityName = "Party",
            EntityId = party.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { party.Code, party.LegalName, party.PartyType, party.GSTIN, party.OpeningBalance }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(party.Id);
    }

    public async Task<Result> UpdatePartyAsync(Guid partyId, UpdatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result.Failure("Party not found.", "NOT_FOUND");
        }

        var cleanGstin = request.GSTIN?.Trim().ToUpperInvariant();
        var stateCode = ExtractGstinStateCode(cleanGstin);

        party.LegalName = request.LegalName.Trim();
        party.TradeName = request.TradeName?.Trim();
        party.ContactPersonName = request.ContactPersonName?.Trim();
        party.CustomerType = request.CustomerType;
        party.SupplierType = request.SupplierType;
        party.Email = request.Email?.Trim().ToLowerInvariant();
        party.PrimaryPhone = request.PrimaryPhone?.Trim();
        party.Mobile = request.Mobile?.Trim();
        party.SecondaryPhone = request.SecondaryPhone?.Trim();
        party.Website = request.Website?.Trim();
        party.GSTIN = cleanGstin;
        party.StateCode = stateCode;
        party.PAN = request.PAN?.Trim().ToUpperInvariant();
        party.TAN = request.TAN?.Trim().ToUpperInvariant();
        party.IsCompositionScheme = request.IsCompositionScheme;
        party.DrugLicenseNumber1 = request.DrugLicenseNumber1?.Trim();
        party.DrugLicenseNumber2 = request.DrugLicenseNumber2?.Trim();
        party.FSSAINumber = request.FSSAINumber?.Trim();
        party.CreditLimit = request.CreditLimit;
        party.CreditPeriodDays = request.CreditPeriodDays;
        party.IsCreditBlocked = request.IsCreditBlocked;
        party.PriceTier = request.PriceTier?.Trim();
        party.AttributesJson = request.AttributesJson ?? "{}";
        party.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeletePartyAsync(Guid partyId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .Include(p => p.LedgerEntries)
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result.Failure("Party not found.", "NOT_FOUND");
        }

        if (party.CurrentOutstandingBalance != 0)
        {
            return Result.Failure("Cannot delete party with non-zero outstanding ledger balance.", "OUTSTANDING_BALANCE_EXISTS");
        }

        party.IsDeleted = true;
        party.DeletedAtUtc = DateTimeOffset.UtcNow;
        party.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Addresses

    public async Task<Result<IReadOnlyList<PartyAddressDto>>> GetPartyAddressesAsync(Guid partyId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var addresses = await _context.PartyAddresses
            .Where(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted)
            .OrderByDescending(a => a.IsDefault)
            .Select(a => new PartyAddressDto(
                a.Id,
                a.PartyId,
                a.AddressType,
                a.Label,
                a.AddressLine1,
                a.AddressLine2,
                a.City,
                a.State,
                a.StateCode,
                a.Pincode,
                a.Country,
                a.ContactPerson,
                a.ContactPhone,
                a.IsDefault
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<PartyAddressDto>>.Success(addresses);
    }

    public async Task<Result<Guid>> AddPartyAddressAsync(Guid partyId, CreatePartyAddressRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<Guid>.Failure("Party not found.", "NOT_FOUND");
        }

        if (request.IsDefault)
        {
            var existingDefaults = await _context.PartyAddresses
                .Where(a => a.TenantId == tenantId && a.PartyId == partyId && a.AddressType == request.AddressType && a.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var addr in existingDefaults)
            {
                addr.IsDefault = false;
            }
        }

        var address = new PartyAddress
        {
            TenantId = tenantId,
            PartyId = partyId,
            AddressType = request.AddressType,
            Label = request.Label?.Trim(),
            AddressLine1 = request.AddressLine1.Trim(),
            AddressLine2 = request.AddressLine2?.Trim(),
            City = request.City.Trim(),
            State = request.State.Trim(),
            StateCode = request.StateCode.Trim(),
            Pincode = request.Pincode.Trim(),
            Country = request.Country.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            ContactPhone = request.ContactPhone?.Trim(),
            IsDefault = request.IsDefault
        };

        _context.PartyAddresses.Add(address);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(address.Id);
    }

    public async Task<Result> DeletePartyAddressAsync(Guid partyId, Guid addressId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var address = await _context.PartyAddresses
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.PartyId == partyId && a.Id == addressId && !a.IsDeleted, cancellationToken);

        if (address == null)
        {
            return Result.Failure("Address not found.", "NOT_FOUND");
        }

        address.IsDeleted = true;
        address.DeletedAtUtc = DateTimeOffset.UtcNow;
        address.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Financial Ledgers & Statement of Account

    public async Task<Result<PartyStatementDto>> GetPartyStatementAsync(
        Guid partyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var utcFrom = DateTime.SpecifyKind(fromDate, DateTimeKind.Utc);
        var utcTo = DateTime.SpecifyKind(toDate, DateTimeKind.Utc);

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == partyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<PartyStatementDto>.Failure("Party not found.", "NOT_FOUND");
        }

        // Prior entries sum for opening balance at fromDate
        var priorDebits = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.PartyId == partyId && l.TransactionDate < utcFrom && !l.IsDeleted)
            .SumAsync(l => l.DebitAmount, cancellationToken);

        var priorCredits = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.PartyId == partyId && l.TransactionDate < utcFrom && !l.IsDeleted)
            .SumAsync(l => l.CreditAmount, cancellationToken);

        var openingBalAtFromDate = priorDebits - priorCredits;

        // Period entries
        var periodEntries = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.PartyId == partyId && l.TransactionDate >= utcFrom && l.TransactionDate <= utcTo && !l.IsDeleted)
            .OrderBy(l => l.TransactionDate)
                .ThenBy(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var totalDebit = periodEntries.Sum(e => e.DebitAmount);
        var totalCredit = periodEntries.Sum(e => e.CreditAmount);
        var closingBal = openingBalAtFromDate + totalDebit - totalCredit;

        // Compute running balance relative to opening balance
        var currentRunning = openingBalAtFromDate;
        var entryDtos = new List<PartyLedgerEntryDto>();

        foreach (var e in periodEntries)
        {
            currentRunning += (e.DebitAmount - e.CreditAmount);
            entryDtos.Add(new PartyLedgerEntryDto(
                e.Id,
                e.PartyId,
                e.TransactionDate,
                e.EntryType,
                e.EntryType.ToString(),
                e.DebitAmount,
                e.CreditAmount,
                currentRunning,
                e.ReferenceDocumentType,
                e.ReferenceDocumentId,
                e.ReferenceDocumentNumber,
                e.PaymentMode,
                e.Description,
                e.CreatedAtUtc
            ));
        }

        var statement = new PartyStatementDto(
            party.Id,
            party.Code,
            party.LegalName,
            party.TradeName,
            party.GSTIN,
            utcFrom,
            utcTo,
            openingBalAtFromDate,
            totalDebit,
            totalCredit,
            closingBal,
            entryDtos
        );

        return Result<PartyStatementDto>.Success(statement);
    }

    public async Task<Result<Guid>> RecordPartyPaymentAsync(
        RecordPartyPaymentRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<Guid>.Failure("Payment amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<Guid>.Failure("Party not found.", "NOT_FOUND");
        }

        // Determine polarity: CustomerReceipt vs VendorPayment
        bool isCustomer;
        if (request.Direction == PartyPaymentDirection.CustomerReceipt)
        {
            isCustomer = true;
        }
        else if (request.Direction == PartyPaymentDirection.VendorPayment)
        {
            isCustomer = false;
        }
        else
        {
            // Default fallback based on PartyType
            if (party.PartyType == PartyType.Customer)
            {
                isCustomer = true;
            }
            else if (party.PartyType == PartyType.Supplier)
            {
                isCustomer = false;
            }
            else
            {
                // For PartyType.Both, payment direction must be explicitly declared to avoid polarity inversion
                return Result<Guid>.Failure(
                    "For dual-role parties (Customer & Vendor), payment direction must be explicitly specified as CustomerReceipt or VendorPayment.",
                    "DIRECTION_REQUIRED");
            }
        }

        var debitAmt = isCustomer ? 0m : request.Amount;
        var creditAmt = isCustomer ? request.Amount : 0m;

        var newRunningBalance = party.CurrentOutstandingBalance + (debitAmt - creditAmt);
        party.CurrentOutstandingBalance = newRunningBalance;

        var entryType = isCustomer ? PartyLedgerEntryType.PaymentReceipt : PartyLedgerEntryType.VendorPayment;

        var ledgerEntry = new PartyLedgerEntry
        {
            TenantId = tenantId,
            PartyId = party.Id,
            TransactionDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
            EntryType = entryType,
            DebitAmount = debitAmt,
            CreditAmount = creditAmt,
            RunningBalance = newRunningBalance,
            ReferenceDocumentType = isCustomer ? "CustomerReceipt" : "VendorPayment",
            ReferenceDocumentNumber = request.ReferenceNumber?.Trim(),
            PaymentMode = request.PaymentMode.Trim(),
            Description = request.Notes?.Trim() ?? $"{entryType} via {request.PaymentMode}"
        };

        _context.PartyLedgerEntries.Add(ledgerEntry);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordPartyPayment",
            EntityName = "PartyLedgerEntry",
            EntityId = ledgerEntry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { party.Code, request.Amount, request.PaymentMode, newRunningBalance }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(ledgerEntry.Id);
    }

    #endregion
}
