using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
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
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, SemaphoreSlim> _tenantAdvanceSemaphores = new();

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
        var rawParties = await query
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
                p.CreatedAtUtc,
                p.AttributesJson,
                p.DrugLicenseNumber1,
                p.DrugLicenseNumber2,
                p.Addresses.Where(a => !a.IsDeleted && a.IsDefault).Select(a => a.AddressLine1).FirstOrDefault()
                    ?? p.Addresses.Where(a => !a.IsDeleted).Select(a => a.AddressLine1).FirstOrDefault(),
                p.Addresses.Where(a => !a.IsDeleted && a.IsDefault).Select(a => a.City).FirstOrDefault()
                    ?? p.Addresses.Where(a => !a.IsDeleted).Select(a => a.City).FirstOrDefault(),
                p.Addresses.Where(a => !a.IsDeleted && a.IsDefault).Select(a => a.State).FirstOrDefault()
                    ?? p.Addresses.Where(a => !a.IsDeleted).Select(a => a.State).FirstOrDefault(),
                p.Addresses.Where(a => !a.IsDeleted && a.IsDefault).Select(a => a.Pincode).FirstOrDefault()
                    ?? p.Addresses.Where(a => !a.IsDeleted).Select(a => a.Pincode).FirstOrDefault(),
                null,
                p.FSSAINumber
            ))
            .ToListAsync(cancellationToken);

        var parties = rawParties.Select(p => {
            var addrParts = new[] {
                p.BillingAddressLine1,
                p.BillingCity,
                !string.IsNullOrWhiteSpace(p.BillingState)
                    ? (!string.IsNullOrWhiteSpace(p.BillingPincode) ? $"{p.BillingState} - {p.BillingPincode}" : p.BillingState)
                    : p.BillingPincode
            }.Where(s => !string.IsNullOrWhiteSpace(s));
            var formatted = string.Join(", ", addrParts);
            return p with { FormattedBillingAddress = !string.IsNullOrWhiteSpace(formatted) ? formatted : null };
        }).ToList();

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

    public async Task<Result<string>> GetNextCustomerCodeAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var code = await GenerateNextPartyCodeInternalAsync(tenantId, PartyType.Customer, cancellationToken);
        return Result<string>.Success(code);
    }

    public async Task<Result<string>> GetNextSupplierCodeAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var code = await GenerateNextPartyCodeInternalAsync(tenantId, PartyType.Supplier, cancellationToken);
        return Result<string>.Success(code);
    }

    private async Task<string> GenerateNextPartyCodeInternalAsync(Guid tenantId, PartyType partyType, CancellationToken cancellationToken)
    {
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? localTx = null;
        try
        {
            // Concurrency Lock: ensure atomic sequence generation per tenant and party type inside an active transaction
            if (_context.Database.IsRelational())
            {
                if (_context.Database.CurrentTransaction == null)
                {
                    try { localTx = await _context.Database.BeginTransactionAsync(cancellationToken); } catch { }
                }

                try
                {
                    if (_context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        var lockKey = $"party_seq_{tenantId}_{partyType}";
                        await _context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(hashtext({0}))", new object[] { lockKey }, cancellationToken);
                    }
                }
                catch
                {
                    // Fallback gracefully if database does not support postgres advisory lock
                }
            }

            var defaultPrefix = partyType == PartyType.Supplier ? "SUPP-" : "CUST-";

            var existingCodes = await _context.Parties
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId && !p.IsDeleted && (p.PartyType == partyType || p.PartyType == PartyType.Both))
                .Select(p => p.Code)
                .ToListAsync(cancellationToken);

            if (existingCodes.Count == 0)
            {
                return $"{defaultPrefix}0001";
            }

            var regex = new Regex(@"^(?<prefix>.*?)(?<number>\d+)$", RegexOptions.Compiled);
            var parsedList = new List<(string Code, string Prefix, int Number, int Padding)>();
            var prefixCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var c in existingCodes)
            {
                if (string.IsNullOrWhiteSpace(c)) continue;
                var match = regex.Match(c.Trim());
                if (match.Success)
                {
                    var pfx = match.Groups["prefix"].Value;
                    var numStr = match.Groups["number"].Value;
                    if (int.TryParse(numStr, out int numVal))
                    {
                        parsedList.Add((c, pfx, numVal, numStr.Length));
                        prefixCounts[pfx] = prefixCounts.TryGetValue(pfx, out var count) ? count + 1 : 1;
                    }
                }
            }

            string chosenPrefix = defaultPrefix;
            if (prefixCounts.Count > 0)
            {
                chosenPrefix = prefixCounts.OrderByDescending(kv => kv.Value).First().Key;
            }

            var matching = parsedList.Where(p => p.Prefix.Equals(chosenPrefix, StringComparison.OrdinalIgnoreCase)).ToList();

            int maxNum = 0;
            int maxPadding = 4;

            if (matching.Count > 0)
            {
                maxNum = matching.Max(p => p.Number);
                maxPadding = Math.Max(maxPadding, matching.Max(p => p.Padding));
            }

            int nextNum = maxNum + 1;
            var existingSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

            string candidate;
            do
            {
                string numFormatted = maxPadding > 1 ? nextNum.ToString().PadLeft(maxPadding, '0') : nextNum.ToString();
                candidate = $"{chosenPrefix}{numFormatted}";
                nextNum++;
            } while (existingSet.Contains(candidate));

            return candidate;
        }
        finally
        {
            if (localTx != null)
            {
                try { await localTx.CommitAsync(cancellationToken); } catch { }
                await localTx.DisposeAsync();
            }
        }
    }

    public async Task<Result<Guid>> CreatePartyAsync(CreatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? tx = null;
        if (_context.Database.IsRelational())
        {
            tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        }

        try
        {
            string normalizedCode;
            if (string.IsNullOrWhiteSpace(request.Code) || request.Code.Trim().Equals("AUTO", StringComparison.OrdinalIgnoreCase))
            {
                normalizedCode = await GenerateNextPartyCodeInternalAsync(tenantId, request.PartyType, cancellationToken);
            }
            else
            {
                normalizedCode = request.Code.Trim().ToUpperInvariant();
            }

            var exists = await _context.Parties
                .AnyAsync(p => p.TenantId == tenantId && p.Code == normalizedCode && !p.IsDeleted, cancellationToken);

            if (exists)
            {
                if (tx != null) await tx.RollbackAsync(cancellationToken);
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
            if (tx != null) await tx.CommitAsync(cancellationToken);

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
        catch
        {
            if (tx != null) await tx.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
        }
    }

    public async Task<Result> UpdatePartyAsync(Guid partyId, UpdatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .Include(p => p.Addresses)
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

        if (request.BillingAddress != null)
        {
            var billingAddr = party.Addresses.FirstOrDefault(a => !a.IsDeleted && (a.IsDefault || a.AddressType == AddressType.Billing));
            if (billingAddr != null)
            {
                billingAddr.AddressLine1 = request.BillingAddress.AddressLine1.Trim();
                billingAddr.AddressLine2 = request.BillingAddress.AddressLine2?.Trim();
                billingAddr.City = request.BillingAddress.City.Trim();
                billingAddr.State = request.BillingAddress.State.Trim();
                billingAddr.StateCode = request.BillingAddress.StateCode?.Trim() ?? stateCode ?? billingAddr.StateCode;
                billingAddr.Pincode = request.BillingAddress.Pincode.Trim();
                billingAddr.ContactPerson = request.BillingAddress.ContactPerson?.Trim() ?? party.ContactPersonName;
                billingAddr.ContactPhone = request.BillingAddress.ContactPhone?.Trim() ?? party.Mobile;
            }
            else
            {
                var newBilling = new PartyAddress
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    AddressType = AddressType.Billing,
                    AddressLine1 = request.BillingAddress.AddressLine1.Trim(),
                    AddressLine2 = request.BillingAddress.AddressLine2?.Trim(),
                    City = request.BillingAddress.City.Trim(),
                    State = request.BillingAddress.State.Trim(),
                    StateCode = request.BillingAddress.StateCode?.Trim() ?? stateCode ?? "27",
                    Pincode = request.BillingAddress.Pincode.Trim(),
                    ContactPerson = request.BillingAddress.ContactPerson?.Trim() ?? party.ContactPersonName,
                    ContactPhone = request.BillingAddress.ContactPhone?.Trim() ?? party.Mobile,
                    IsDefault = true
                };
                _context.PartyAddresses.Add(newBilling);
            }
        }

        if (request.ShippingAddress != null)
        {
            var shippingAddr = party.Addresses.FirstOrDefault(a => !a.IsDeleted && a.AddressType == AddressType.Shipping);
            if (shippingAddr != null)
            {
                shippingAddr.AddressLine1 = request.ShippingAddress.AddressLine1.Trim();
                shippingAddr.AddressLine2 = request.ShippingAddress.AddressLine2?.Trim();
                shippingAddr.City = request.ShippingAddress.City.Trim();
                shippingAddr.State = request.ShippingAddress.State.Trim();
                shippingAddr.StateCode = request.ShippingAddress.StateCode?.Trim() ?? stateCode ?? shippingAddr.StateCode;
                shippingAddr.Pincode = request.ShippingAddress.Pincode.Trim();
                shippingAddr.ContactPerson = request.ShippingAddress.ContactPerson?.Trim() ?? party.ContactPersonName;
                shippingAddr.ContactPhone = request.ShippingAddress.ContactPhone?.Trim() ?? party.Mobile;
            }
            else
            {
                var newShipping = new PartyAddress
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    AddressType = AddressType.Shipping,
                    AddressLine1 = request.ShippingAddress.AddressLine1.Trim(),
                    AddressLine2 = request.ShippingAddress.AddressLine2?.Trim(),
                    City = request.ShippingAddress.City.Trim(),
                    State = request.ShippingAddress.State.Trim(),
                    StateCode = request.ShippingAddress.StateCode?.Trim() ?? stateCode ?? "27",
                    Pincode = request.ShippingAddress.Pincode.Trim(),
                    ContactPerson = request.ShippingAddress.ContactPerson?.Trim() ?? party.ContactPersonName,
                    ContactPhone = request.ShippingAddress.ContactPhone?.Trim() ?? party.Mobile,
                    IsDefault = false
                };
                _context.PartyAddresses.Add(newShipping);
            }
        }

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

        // FIFO Knock-Off: Allocate payment against oldest unpaid invoices / bills
        if (isCustomer)
        {
            var remainingPayment = request.Amount;
            var unpaidInvoices = await _context.SalesInvoices
                .Include(i => i.Payments)
                .Where(i => i.TenantId == tenantId && 
                            i.PartyId == party.Id && 
                            !i.IsCancelled && 
                            !i.IsDeleted && 
                            i.BalanceAmount > 0)
                .OrderBy(i => i.InvoiceDate)
                .ThenBy(i => i.InvoiceNumber)
                .ToListAsync(cancellationToken);

            var payMode = Enum.TryParse<PaymentMode>(request.PaymentMode, true, out var pm) ? pm : PaymentMode.BankTransfer;

            foreach (var inv in unpaidInvoices)
            {
                if (remainingPayment <= 0) break;

                var knockOffAmt = Math.Min(remainingPayment, inv.BalanceAmount);
                inv.PaidAmount += knockOffAmt;
                inv.BalanceAmount = inv.TotalAmount - inv.PaidAmount;
                inv.PaymentStatus = inv.BalanceAmount <= 0.001m ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
                inv.Status = inv.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

                var invoicePay = new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    Invoice = inv,
                    PaymentDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
                    Amount = knockOffAmt,
                    PaymentMode = payMode,
                    TransactionReference = request.ReferenceNumber,
                    Notes = $"Auto FIFO knock-off from party receipt {ledgerEntry.Id}: {request.Notes}"
                };
                inv.Payments.Add(invoicePay);
                _context.SalesInvoicePayments.Add(invoicePay);

                remainingPayment -= knockOffAmt;
            }

            if (remainingPayment > 0.001m)
            {
                var advance = new Domain.Entities.Sales.AdvancePayment
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    Party = party,
                    Amount = remainingPayment,
                    AllocatedAmount = 0m,
                    PaymentMode = payMode,
                    ReceiptDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
                    ReferenceNumber = request.ReferenceNumber,
                    Notes = $"Unallocated on-account advance from payment {ledgerEntry.Id}: {request.Notes}",
                    Direction = Domain.Entities.Sales.AdvancePaymentDirection.CustomerAdvance
                };
                _context.AdvancePayments.Add(advance);
            }
        }
        else
        {
            var remainingPayment = request.Amount;
            var unpaidBills = await _context.PurchaseBills
                .Include(b => b.Payments)
                .Where(b => b.TenantId == tenantId && 
                            b.PartyId == party.Id && 
                            !b.IsDeleted && 
                            b.BalanceAmount > 0)
                .OrderBy(b => b.BillDate)
                .ThenBy(b => b.BillNumber)
                .ToListAsync(cancellationToken);

            var payMode = Enum.TryParse<PaymentMode>(request.PaymentMode, true, out var pm) ? pm : PaymentMode.BankTransfer;

            foreach (var bill in unpaidBills)
            {
                if (remainingPayment <= 0) break;

                var knockOffAmt = Math.Min(remainingPayment, bill.BalanceAmount);
                bill.PaidAmount += knockOffAmt;
                bill.BalanceAmount = bill.TotalAmount - bill.PaidAmount;
                bill.PaymentStatus = bill.BalanceAmount <= 0.001m ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
                bill.Status = bill.PaymentStatus == PaymentStatus.FullyPaid ? PurchaseBillStatus.Paid : PurchaseBillStatus.Approved;

                var billPay = new PurchaseBillPayment
                {
                    TenantId = tenantId,
                    PurchaseBill = bill,
                    PaymentDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
                    Amount = knockOffAmt,
                    PaymentMode = payMode,
                    TransactionReference = request.ReferenceNumber,
                    Notes = $"Auto FIFO knock-off from vendor payment {ledgerEntry.Id}: {request.Notes}"
                };
                bill.Payments.Add(billPay);
                _context.PurchaseBillPayments.Add(billPay);

                remainingPayment -= knockOffAmt;
            }

            if (remainingPayment > 0.001m)
            {
                var advance = new Domain.Entities.Sales.AdvancePayment
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    Party = party,
                    Amount = remainingPayment,
                    AllocatedAmount = 0m,
                    PaymentMode = payMode,
                    ReceiptDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
                    ReferenceNumber = request.ReferenceNumber,
                    Notes = $"Unallocated supplier advance from payment {ledgerEntry.Id}: {request.Notes}",
                    Direction = Domain.Entities.Sales.AdvancePaymentDirection.SupplierAdvance
                };
                _context.AdvancePayments.Add(advance);
            }
        }

        // Auto-post to General Ledger
        await AutoPostPartyPaymentToGeneralLedgerAsync(tenantId, party, isCustomer, request, ledgerEntry.Id, cancellationToken);

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

    private async Task AutoPostPartyPaymentToGeneralLedgerAsync(
        Guid tenantId,
        Party party,
        bool isCustomer,
        RecordPartyPaymentRequest request,
        Guid ledgerEntryId,
        CancellationToken cancellationToken)
    {
        try
        {
            var isCash = request.PaymentMode.Equals("Cash", StringComparison.OrdinalIgnoreCase);
            var assetAccCode = isCash ? "ACC-CASH" : "ACC-BANK";
            var assetAccName = isCash ? "Cash in Hand" : "Main Bank Account";
            var assetAccount = await GetOrCreateLedgerAccountAsync(tenantId, assetAccCode, assetAccName, "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);

            var voucher = new JournalVoucher
            {
                TenantId = tenantId,
                VoucherNumber = $"JV-PRT-{ledgerEntryId.ToString()[..8].ToUpperInvariant()}",
                VoucherDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
                VoucherType = isCustomer ? "Receipt" : "Payment",
                ReferenceNumber = request.ReferenceNumber,
                TotalDebit = request.Amount,
                TotalCredit = request.Amount,
                Narration = isCustomer
                    ? $"Customer Receipt from {party.LegalName} via {request.PaymentMode}"
                    : $"Vendor Payment to {party.LegalName} via {request.PaymentMode}",
                CreatedByName = "System Auto-Posting"
            };

            if (isCustomer)
            {
                var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-CA", "Current Assets", "Asset", "Debit", cancellationToken);

                // Debit Cash / Bank Account (Asset increases)
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = assetAccount.Id,
                    DebitAmount = request.Amount,
                    CreditAmount = 0m,
                    Narration = $"Customer receipt via {request.PaymentMode}"
                });
                assetAccount.CurrentBalance += request.Amount;

                // Credit Accounts Receivable (Asset decreases)
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = arAccount.Id,
                    DebitAmount = 0m,
                    CreditAmount = request.Amount,
                    Narration = $"Clear AR for {party.LegalName}"
                });
                arAccount.CurrentBalance -= request.Amount;
            }
            else
            {
                var apAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AP", "Accounts Payable (Sundry Creditors)", "GRP-CL", "Current Liabilities", "Liability", "Credit", cancellationToken);

                // Debit Accounts Payable (Liability decreases)
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = apAccount.Id,
                    DebitAmount = request.Amount,
                    CreditAmount = 0m,
                    Narration = $"Debit AP for {party.LegalName}"
                });
                apAccount.CurrentBalance -= request.Amount;

                // Credit Cash / Bank Account (Asset decreases)
                voucher.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = assetAccount.Id,
                    DebitAmount = 0m,
                    CreditAmount = request.Amount,
                    Narration = $"Vendor payment via {request.PaymentMode}"
                });
                assetAccount.CurrentBalance -= request.Amount;
            }

            _context.JournalVouchers.Add(voucher);
        }
        catch
        {
            // Non-fatal if GL accounts encountering setup edge case
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

    #region Advance Payments & Knock-Off Allocations

    public async Task<Result<Guid>> CreateAdvancePaymentAsync(
        CreateAdvancePaymentRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (request.Amount <= 0)
        {
            return Result<Guid>.Failure("Advance payment amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var party = await _context.Parties.FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);
        if (party == null)
        {
            return Result<Guid>.Failure($"Party with ID '{request.PartyId}' not found.", "PARTY_NOT_FOUND");
        }

        var isCustomer = request.Direction == Domain.Entities.Sales.AdvancePaymentDirection.CustomerAdvance;
        decimal debitAmt = isCustomer ? 0m : request.Amount;
        decimal creditAmt = isCustomer ? request.Amount : 0m;
        var newRunningBalance = party.CurrentOutstandingBalance + debitAmt - creditAmt;
        party.CurrentOutstandingBalance = newRunningBalance;

        var payMode = Enum.TryParse<PaymentMode>(request.PaymentMode, true, out var pm) ? pm : PaymentMode.BankTransfer;

        var advance = new Domain.Entities.Sales.AdvancePayment
        {
            TenantId = tenantId,
            PartyId = party.Id,
            Party = party,
            Amount = request.Amount,
            AllocatedAmount = 0m,
            PaymentMode = payMode,
            ReceiptDate = DateTime.SpecifyKind(request.ReceiptDate, DateTimeKind.Utc),
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            Direction = request.Direction
        };
        _context.AdvancePayments.Add(advance);

        var ledgerEntry = new PartyLedgerEntry
        {
            TenantId = tenantId,
            PartyId = party.Id,
            TransactionDate = DateTime.SpecifyKind(request.ReceiptDate, DateTimeKind.Utc),
            EntryType = isCustomer ? PartyLedgerEntryType.PaymentReceipt : PartyLedgerEntryType.VendorPayment,
            DebitAmount = debitAmt,
            CreditAmount = creditAmt,
            RunningBalance = newRunningBalance,
            ReferenceDocumentType = isCustomer ? "CustomerAdvanceReceipt" : "SupplierAdvancePayment",
            ReferenceDocumentId = advance.Id,
            ReferenceDocumentNumber = request.ReferenceNumber?.Trim(),
            PaymentMode = request.PaymentMode.Trim(),
            Description = request.Notes?.Trim() ?? $"Advance payment of {request.Amount} received"
        };
        _context.PartyLedgerEntries.Add(ledgerEntry);

        // Auto-post to GL
        var partyPaymentReq = new RecordPartyPaymentRequest(
            request.PartyId,
            request.ReceiptDate,
            request.Amount,
            request.PaymentMode,
            request.ReferenceNumber,
            request.Notes,
            isCustomer ? PartyPaymentDirection.CustomerReceipt : PartyPaymentDirection.VendorPayment
        );
        await AutoPostPartyPaymentToGeneralLedgerAsync(tenantId, party, isCustomer, partyPaymentReq, advance.Id, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(advance.Id);
    }

    public async Task<Result> AllocateAdvancePaymentAsync(
        AllocateAdvancePaymentRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        if (request.AmountToAllocate <= 0)
        {
            return Result.Failure("Allocation amount must be greater than zero.", "INVALID_ALLOCATION_AMOUNT");
        }

        var semaphore = _tenantAdvanceSemaphores.GetOrAdd(tenantId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        try
        {
            var advance = await _context.AdvancePayments
                .Include(a => a.Allocations)
                .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == request.AdvancePaymentId && !a.IsDeleted, cancellationToken);

            if (advance == null)
            {
                return Result.Failure($"Advance payment with ID '{request.AdvancePaymentId}' not found.", "ADVANCE_NOT_FOUND");
            }

            if (request.AmountToAllocate > advance.UnallocatedAmount)
            {
                return Result.Failure($"Cannot allocate {request.AmountToAllocate}. Unallocated advance available is only {advance.UnallocatedAmount}.", "ALLOCATION_EXCEEDS_UNALLOCATED");
            }

            if (request.InvoiceId.HasValue)
            {
                var invoice = await _context.SalesInvoices
                    .Include(i => i.Payments)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.InvoiceId.Value && !i.IsDeleted && !i.IsCancelled, cancellationToken);

                if (invoice == null)
                {
                    return Result.Failure($"Invoice with ID '{request.InvoiceId.Value}' not found or cancelled.", "INVOICE_NOT_FOUND");
                }

                var applyAmt = Math.Min(request.AmountToAllocate, invoice.BalanceAmount);
                if (applyAmt <= 0)
                {
                    return Result.Failure("Invoice is already fully paid.", "INVOICE_ALREADY_PAID");
                }

                if (advance.AllocatedAmount + applyAmt > advance.Amount)
                {
                    return Result.Failure("Allocation would exceed the total advance amount.", "ALLOCATION_EXCEEDS_UNALLOCATED");
                }

                invoice.PaidAmount += applyAmt;
                invoice.BalanceAmount = invoice.TotalAmount - invoice.PaidAmount;
                invoice.PaymentStatus = invoice.BalanceAmount <= 0.001m ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
                invoice.Status = invoice.PaymentStatus == PaymentStatus.FullyPaid ? InvoiceStatus.Paid : InvoiceStatus.Issued;

                var invPayment = new SalesInvoicePayment
                {
                    TenantId = tenantId,
                    Invoice = invoice,
                    PaymentDate = DateTime.UtcNow,
                    Amount = applyAmt,
                    PaymentMode = advance.PaymentMode,
                    TransactionReference = advance.ReferenceNumber,
                    Notes = $"Knock-off allocated from advance payment {advance.Id}: {request.Notes}"
                };
                invoice.Payments.Add(invPayment);
                _context.SalesInvoicePayments.Add(invPayment);

                var allocation = new Domain.Entities.Sales.AdvancePaymentAllocation
                {
                    TenantId = tenantId,
                    AdvancePaymentId = advance.Id,
                    AdvancePayment = advance,
                    InvoiceId = invoice.Id,
                    Invoice = invoice,
                    AmountAllocated = applyAmt,
                    AllocationDate = DateTime.UtcNow,
                    Notes = request.Notes
                };
                advance.Allocations.Add(allocation);
                _context.AdvancePaymentAllocations.Add(allocation);

                advance.AllocatedAmount += applyAmt;
            }
            else if (request.PurchaseBillId.HasValue)
            {
                var bill = await _context.PurchaseBills
                    .Include(b => b.Payments)
                    .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.PurchaseBillId.Value && !b.IsDeleted, cancellationToken);

                if (bill == null)
                {
                    return Result.Failure($"Purchase bill with ID '{request.PurchaseBillId.Value}' not found.", "BILL_NOT_FOUND");
                }

                var applyAmt = Math.Min(request.AmountToAllocate, bill.BalanceAmount);
                if (applyAmt <= 0)
                {
                    return Result.Failure("Purchase bill is already fully paid.", "BILL_ALREADY_PAID");
                }

                if (advance.AllocatedAmount + applyAmt > advance.Amount)
                {
                    return Result.Failure("Allocation would exceed the total advance amount.", "ALLOCATION_EXCEEDS_UNALLOCATED");
                }

                bill.PaidAmount += applyAmt;
                bill.BalanceAmount = bill.TotalAmount - bill.PaidAmount;
                bill.PaymentStatus = bill.BalanceAmount <= 0.001m ? PaymentStatus.FullyPaid : PaymentStatus.PartiallyPaid;
                bill.Status = bill.PaymentStatus == PaymentStatus.FullyPaid ? PurchaseBillStatus.Paid : PurchaseBillStatus.Approved;

                var billPayment = new PurchaseBillPayment
                {
                    TenantId = tenantId,
                    PurchaseBill = bill,
                    PaymentDate = DateTime.UtcNow,
                    Amount = applyAmt,
                    PaymentMode = advance.PaymentMode,
                    TransactionReference = advance.ReferenceNumber,
                    Notes = $"Knock-off allocated from supplier advance payment {advance.Id}: {request.Notes}"
                };
                bill.Payments.Add(billPayment);
                _context.PurchaseBillPayments.Add(billPayment);

                var allocation = new Domain.Entities.Sales.AdvancePaymentAllocation
                {
                    TenantId = tenantId,
                    AdvancePaymentId = advance.Id,
                    AdvancePayment = advance,
                    PurchaseBillId = bill.Id,
                    PurchaseBill = bill,
                    AmountAllocated = applyAmt,
                    AllocationDate = DateTime.UtcNow,
                    Notes = request.Notes
                };
                advance.Allocations.Add(allocation);
                _context.AdvancePaymentAllocations.Add(allocation);

                advance.AllocatedAmount += applyAmt;
            }
            else
            {
                return Result.Failure("Must specify either InvoiceId or PurchaseBillId for allocation.", "TARGET_REQUIRED");
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task<Result<IReadOnlyList<AdvancePaymentDto>>> GetUnallocatedAdvancesAsync(
        Guid partyId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var advances = await _context.AdvancePayments
            .Include(a => a.Party)
            .Where(a => a.TenantId == tenantId && a.PartyId == partyId && !a.IsDeleted && (a.Amount - a.AllocatedAmount) > 0.001m)
            .OrderByDescending(a => a.ReceiptDate)
            .ToListAsync(cancellationToken);

        var dtos = advances.Select(a => new AdvancePaymentDto(
            a.Id,
            a.PartyId,
            a.Party?.LegalName ?? string.Empty,
            a.Amount,
            a.AllocatedAmount,
            a.UnallocatedAmount,
            a.PaymentMode.ToString(),
            a.ReceiptDate,
            a.ReferenceNumber,
            a.Notes,
            a.Direction
        )).ToList();

        return Result<IReadOnlyList<AdvancePaymentDto>>.Success(dtos);
    }

    #endregion
}
