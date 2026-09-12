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
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BrokerService : IBrokerService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public BrokerService(
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
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    public async Task<Result<PagedResult<BrokerDto>>> GetBrokersAsync(
        int pageNumber = 1,
        int pageSize = 25,
        string? searchTerm = null,
        bool? activeOnly = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.Brokers
            .Where(b => b.TenantId == tenantId && !b.IsDeleted);

        if (activeOnly.HasValue)
        {
            query = query.Where(b => b.IsActive == activeOnly.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(b =>
                b.FullName.ToLower().Contains(term) ||
                b.BrokerCode.ToLower().Contains(term) ||
                (b.Mobile != null && b.Mobile.Contains(term)) ||
                (b.Email != null && b.Email.ToLower().Contains(term)));
        }

        var totalRecords = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(b => b.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BrokerDto(
                b.Id,
                b.BrokerCode,
                b.FullName,
                b.Mobile,
                b.Email,
                b.Address,
                b.PAN,
                b.GSTIN,
                b.CommissionBasis,
                b.DefaultCommissionRate,
                b.TdsPercent,
                b.AccrualTrigger,
                b.CurrentPayableBalance,
                b.IsActive,
                b.Notes,
                b.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<BrokerDto>>.Success(new PagedResult<BrokerDto>(items, totalRecords, pageNumber, pageSize));
    }

    public async Task<Result<BrokerDto>> GetBrokerByIdAsync(Guid brokerId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var b = await _context.Brokers
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == brokerId && !x.IsDeleted, cancellationToken);

        if (b == null)
        {
            return Result<BrokerDto>.Failure("Broker not found.", "NOT_FOUND");
        }

        var dto = new BrokerDto(
            b.Id,
            b.BrokerCode,
            b.FullName,
            b.Mobile,
            b.Email,
            b.Address,
            b.PAN,
            b.GSTIN,
            b.CommissionBasis,
            b.DefaultCommissionRate,
            b.TdsPercent,
            b.AccrualTrigger,
            b.CurrentPayableBalance,
            b.IsActive,
            b.Notes,
            b.CreatedAtUtc
        );

        return Result<BrokerDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateBrokerAsync(
        CreateBrokerRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var codeExists = await _context.Brokers
            .AnyAsync(b => b.TenantId == tenantId && b.BrokerCode.ToLower() == request.BrokerCode.Trim().ToLower() && !b.IsDeleted, cancellationToken);

        if (codeExists)
        {
            return Result<Guid>.Failure($"Broker code '{request.BrokerCode}' is already in use.", "DUPLICATE_CODE");
        }

        var broker = new Broker
        {
            TenantId = tenantId,
            BrokerCode = request.BrokerCode.Trim().ToUpperInvariant(),
            FullName = request.FullName.Trim(),
            Mobile = request.Mobile?.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            PAN = request.PAN?.Trim().ToUpperInvariant(),
            GSTIN = request.GSTIN?.Trim().ToUpperInvariant(),
            CommissionBasis = request.CommissionBasis,
            DefaultCommissionRate = request.DefaultCommissionRate,
            TdsPercent = request.TdsPercent,
            AccrualTrigger = request.AccrualTrigger,
            IsActive = true,
            Notes = request.Notes
        };

        _context.Brokers.Add(broker);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateBroker",
            EntityName = "Broker",
            EntityId = broker.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { broker.BrokerCode, broker.FullName, broker.DefaultCommissionRate }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(broker.Id);
    }

    public async Task<Result> UpdateBrokerAsync(
        Guid brokerId,
        UpdateBrokerRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var broker = await _context.Brokers
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == brokerId && !b.IsDeleted, cancellationToken);

        if (broker == null)
        {
            return Result.Failure("Broker not found.", "NOT_FOUND");
        }

        broker.FullName = request.FullName.Trim();
        broker.Mobile = request.Mobile?.Trim();
        broker.Email = request.Email?.Trim();
        broker.Address = request.Address?.Trim();
        broker.PAN = request.PAN?.Trim().ToUpperInvariant();
        broker.GSTIN = request.GSTIN?.Trim().ToUpperInvariant();
        broker.CommissionBasis = request.CommissionBasis;
        broker.DefaultCommissionRate = request.DefaultCommissionRate;
        broker.TdsPercent = request.TdsPercent;
        broker.AccrualTrigger = request.AccrualTrigger;
        broker.IsActive = request.IsActive;
        broker.Notes = request.Notes;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateBroker",
            EntityName = "Broker",
            EntityId = broker.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteBrokerAsync(
        Guid brokerId,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var broker = await _context.Brokers
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == brokerId && !b.IsDeleted, cancellationToken);

        if (broker == null)
        {
            return Result.Failure("Broker not found.", "NOT_FOUND");
        }

        if (broker.CurrentPayableBalance != 0m)
        {
            return Result.Failure($"Cannot delete broker with outstanding balance ₹{broker.CurrentPayableBalance:F2}. Settle account first.", "OUTSTANDING_BALANCE");
        }

        broker.IsDeleted = true;
        broker.DeletedAtUtc = DateTimeOffset.UtcNow;
        broker.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Delete,
            ActionName = "DeleteBroker",
            EntityName = "Broker",
            EntityId = broker.Id.ToString(),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<PagedResult<BrokerCommissionEntryDto>>> GetCommissionEntriesAsync(
        Guid? brokerId = null,
        int pageNumber = 1,
        int pageSize = 25,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.BrokerCommissionEntries
            .Include(e => e.Broker)
            .Where(e => e.TenantId == tenantId && !e.IsDeleted);

        if (brokerId.HasValue)
        {
            query = query.Where(e => e.BrokerId == brokerId.Value);
        }

        if (fromDate.HasValue)
        {
            var f = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(e => e.TransactionDate >= f);
        }

        if (toDate.HasValue)
        {
            var t = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(e => e.TransactionDate <= t);
        }

        var totalRecords = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(e => e.TransactionDate)
            .ThenByDescending(e => e.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new BrokerCommissionEntryDto(
                e.Id,
                e.BrokerId,
                e.Broker.FullName,
                e.SalesInvoiceId,
                e.SalesInvoiceNumber,
                e.TransactionDate,
                e.PartyId,
                e.PartyName,
                e.BaseAmount,
                e.CommissionRate,
                e.GrossCommissionAmount,
                e.TdsAmount,
                e.NetCommissionPayable,
                e.Status,
                e.PaidDate,
                e.PaymentReference,
                e.Notes,
                e.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<BrokerCommissionEntryDto>>.Success(new PagedResult<BrokerCommissionEntryDto>(items, totalRecords, pageNumber, pageSize));
    }

    public async Task<Result<Guid>> AccrueCommissionForInvoiceAsync(
        Guid salesInvoiceId,
        Guid brokerId,
        decimal baseAmount,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var broker = await _context.Brokers
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == brokerId && !b.IsDeleted, cancellationToken);

        if (broker == null)
        {
            return Result<Guid>.Failure("Broker not found.", "NOT_FOUND");
        }

        var invoice = await _context.SalesInvoices
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == salesInvoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<Guid>.Failure("Sales invoice not found.", "NOT_FOUND");
        }

        // Avoid duplicate accrual for the same invoice
        var existing = await _context.BrokerCommissionEntries
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.SalesInvoiceId == salesInvoiceId && e.BrokerId == brokerId && !e.IsDeleted, cancellationToken);

        if (existing != null)
        {
            return Result<Guid>.Success(existing.Id);
        }

        // Calculate Commission & TDS
        // e.g. Rate = 2.0% -> Gross = baseAmount * (2.0 / 100)
        decimal grossCommission = Math.Round(baseAmount * (broker.DefaultCommissionRate / 100m), 2, MidpointRounding.AwayFromZero);
        decimal tdsAmount = broker.TdsPercent > 0
            ? Math.Round(grossCommission * (broker.TdsPercent / 100m), 2, MidpointRounding.AwayFromZero)
            : 0m;
        decimal netPayable = grossCommission - tdsAmount;

        var entry = new BrokerCommissionEntry
        {
            TenantId = tenantId,
            BrokerId = broker.Id,
            SalesInvoiceId = invoice.Id,
            SalesInvoiceNumber = invoice.InvoiceNumber,
            TransactionDate = invoice.InvoiceDate,
            PartyId = invoice.PartyId,
            PartyName = invoice.CustomerName,
            BaseAmount = baseAmount,
            CommissionRate = broker.DefaultCommissionRate,
            GrossCommissionAmount = grossCommission,
            TdsAmount = tdsAmount,
            NetCommissionPayable = netPayable,
            Status = BrokerCommissionStatus.Accrued,
            Notes = $"Accrued on Sales Invoice {invoice.InvoiceNumber}"
        };

        _context.BrokerCommissionEntries.Add(entry);
        broker.CurrentPayableBalance += netPayable;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "AccrueBrokerCommission",
            EntityName = "BrokerCommissionEntry",
            EntityId = entry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Broker = broker.FullName, Invoice = invoice.InvoiceNumber, grossCommission, netPayable }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(entry.Id);
    }

    public async Task<Result> AdjustCommissionForReturnAsync(
        Guid salesInvoiceId,
        decimal returnedTaxableAmount,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var entry = await _context.BrokerCommissionEntries
            .Include(e => e.Broker)
            .FirstOrDefaultAsync(e => e.TenantId == tenantId && e.SalesInvoiceId == salesInvoiceId && !e.IsDeleted, cancellationToken);

        if (entry == null)
        {
            return Result.Success(); // No broker attached to this invoice
        }

        var broker = entry.Broker;
        decimal returnGross = Math.Round(returnedTaxableAmount * (entry.CommissionRate / 100m), 2, MidpointRounding.AwayFromZero);
        decimal returnTds = broker.TdsPercent > 0
            ? Math.Round(returnGross * (broker.TdsPercent / 100m), 2, MidpointRounding.AwayFromZero)
            : 0m;
        decimal returnNet = returnGross - returnTds;

        var adjustmentEntry = new BrokerCommissionEntry
        {
            TenantId = tenantId,
            BrokerId = broker.Id,
            SalesInvoiceId = salesInvoiceId,
            SalesInvoiceNumber = entry.SalesInvoiceNumber,
            TransactionDate = DateTime.UtcNow.Date,
            PartyId = entry.PartyId,
            PartyName = entry.PartyName,
            BaseAmount = -returnedTaxableAmount,
            CommissionRate = entry.CommissionRate,
            GrossCommissionAmount = -returnGross,
            TdsAmount = -returnTds,
            NetCommissionPayable = -returnNet,
            Status = BrokerCommissionStatus.AdjustedOnReturn,
            Notes = $"Clawback/Adjustment for Sales Return against Invoice {entry.SalesInvoiceNumber}"
        };

        _context.BrokerCommissionEntries.Add(adjustmentEntry);
        broker.CurrentPayableBalance -= returnNet;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "AdjustCommissionForReturn",
            EntityName = "BrokerCommissionEntry",
            EntityId = adjustmentEntry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Broker = broker.FullName, returnGross, returnNet }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<Guid>> PayCommissionAsync(
        PayBrokerCommissionRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<Guid>.Failure("Payout amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var broker = await _context.Brokers
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BrokerId && !b.IsDeleted, cancellationToken);

        if (broker == null)
        {
            return Result<Guid>.Failure("Broker not found.", "NOT_FOUND");
        }

        // Deduct from bank account if specified
        if (request.BankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BankAccountId.Value && !b.IsDeleted, cancellationToken);

            if (bankAccount != null)
            {
                bankAccount.CurrentBalance -= request.Amount;
            }
        }

        var payoutEntry = new BrokerCommissionEntry
        {
            TenantId = tenantId,
            BrokerId = broker.Id,
            TransactionDate = DateTime.UtcNow.Date,
            BaseAmount = 0m,
            CommissionRate = 0m,
            GrossCommissionAmount = request.Amount,
            TdsAmount = 0m,
            NetCommissionPayable = -request.Amount, // Negative reduces balance
            Status = BrokerCommissionStatus.Paid,
            PaidDate = DateTime.UtcNow.Date,
            PaymentReference = request.ReferenceNumber ?? $"{request.PaymentMode}-DISB",
            Notes = $"Commission Payout ({request.PaymentMode}) - {request.Notes}"
        };

        _context.BrokerCommissionEntries.Add(payoutEntry);
        broker.CurrentPayableBalance -= request.Amount;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "PayBrokerCommission",
            EntityName = "BrokerCommissionEntry",
            EntityId = payoutEntry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Broker = broker.FullName, request.Amount, request.PaymentMode }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(payoutEntry.Id);
    }

    public async Task<Result<IReadOnlyList<BrokerSummaryDto>>> GetBrokerSummariesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var brokers = await _context.Brokers
            .Include(b => b.CommissionEntries)
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var summaries = brokers.Select(b =>
        {
            var accrued = b.CommissionEntries
                .Where(e => e.Status == BrokerCommissionStatus.Accrued || e.Status == BrokerCommissionStatus.Approved)
                .Sum(e => e.NetCommissionPayable);

            var paid = b.CommissionEntries
                .Where(e => e.Status == BrokerCommissionStatus.Paid)
                .Sum(e => Math.Abs(e.NetCommissionPayable));

            var invoiceCount = b.CommissionEntries
                .Where(e => e.SalesInvoiceId.HasValue)
                .Select(e => e.SalesInvoiceId)
                .Distinct()
                .Count();

            return new BrokerSummaryDto(
                b.Id,
                b.BrokerCode,
                b.FullName,
                b.Mobile,
                accrued,
                paid,
                b.CurrentPayableBalance,
                invoiceCount
            );
        }).ToList();

        return Result<IReadOnlyList<BrokerSummaryDto>>.Success(summaries);
    }
}
