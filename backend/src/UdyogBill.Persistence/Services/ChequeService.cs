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
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class ChequeService : IChequeService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public ChequeService(
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

    public async Task<Result<PagedResult<ChequeRegisterDto>>> GetChequesAsync(
        int pageNumber = 1,
        int pageSize = 25,
        ChequeDirection? direction = null,
        ChequeStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.ChequeRegisters
            .Include(c => c.BankAccount)
            .Where(c => c.TenantId == tenantId && !c.IsDeleted);

        if (direction.HasValue)
        {
            query = query.Where(c => c.Direction == direction.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(c => c.Status == status.Value);
        }

        if (fromDate.HasValue)
        {
            var f = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
            query = query.Where(c => c.ChequeDate >= f);
        }

        if (toDate.HasValue)
        {
            var t = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(c => c.ChequeDate <= t);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(c =>
                c.ChequeNumber.ToLower().Contains(term) ||
                c.BankName.ToLower().Contains(term) ||
                c.PartyName.ToLower().Contains(term) ||
                (c.ReferenceDocumentNumber != null && c.ReferenceDocumentNumber.ToLower().Contains(term)));
        }

        var totalRecords = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.ChequeDate)
            .ThenByDescending(c => c.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new ChequeRegisterDto(
                c.Id,
                c.Direction,
                c.Status,
                c.PartyId,
                c.PartyName,
                c.ChequeNumber,
                c.BankName,
                c.BranchName,
                c.Amount,
                c.ChequeDate,
                c.ReceivedDate,
                c.DepositDate,
                c.PresentationDate,
                c.ClearingDate,
                c.BouncedDate,
                c.BankAccountId,
                c.BankAccount != null ? c.BankAccount.AccountName : null,
                c.ReferenceDocumentType,
                c.ReferenceDocumentId,
                c.ReferenceDocumentNumber,
                c.BounceReason,
                c.BounceChargesAmount,
                c.IsBounceChargeBilledToParty,
                c.Remarks,
                c.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<ChequeRegisterDto>>.Success(new PagedResult<ChequeRegisterDto>(items, totalRecords, pageNumber, pageSize));
    }

    public async Task<Result<ChequeRegisterDto>> GetChequeByIdAsync(Guid chequeId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var c = await _context.ChequeRegisters
            .Include(x => x.BankAccount)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == chequeId && !x.IsDeleted, cancellationToken);

        if (c == null)
        {
            return Result<ChequeRegisterDto>.Failure("Cheque register entry not found.", "NOT_FOUND");
        }

        var dto = new ChequeRegisterDto(
            c.Id,
            c.Direction,
            c.Status,
            c.PartyId,
            c.PartyName,
            c.ChequeNumber,
            c.BankName,
            c.BranchName,
            c.Amount,
            c.ChequeDate,
            c.ReceivedDate,
            c.DepositDate,
            c.PresentationDate,
            c.ClearingDate,
            c.BouncedDate,
            c.BankAccountId,
            c.BankAccount != null ? c.BankAccount.AccountName : null,
            c.ReferenceDocumentType,
            c.ReferenceDocumentId,
            c.ReferenceDocumentNumber,
            c.BounceReason,
            c.BounceChargesAmount,
            c.IsBounceChargeBilledToParty,
            c.Remarks,
            c.CreatedAtUtc
        );

        return Result<ChequeRegisterDto>.Success(dto);
    }

    public async Task<Result<Guid>> RecordChequeAsync(
        RecordChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<Guid>.Failure("Cheque amount must be greater than zero.", "INVALID_AMOUNT");
        }

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<Guid>.Failure("Associated party not found.", "NOT_FOUND");
        }

        var chequeDate = DateTime.SpecifyKind(request.ChequeDate.Date, DateTimeKind.Utc);
        var receivedDate = request.ReceivedDate.HasValue
            ? DateTime.SpecifyKind(request.ReceivedDate.Value.Date, DateTimeKind.Utc)
            : DateTime.UtcNow.Date;

        var cheque = new ChequeRegister
        {
            TenantId = tenantId,
            Direction = request.Direction,
            Status = ChequeStatus.ReceivedInHand,
            PartyId = party.Id,
            PartyName = string.IsNullOrWhiteSpace(request.PartyName) ? party.LegalName : request.PartyName,
            ChequeNumber = request.ChequeNumber.Trim(),
            BankName = request.BankName.Trim(),
            BranchName = request.BranchName?.Trim(),
            Amount = request.Amount,
            ChequeDate = chequeDate,
            ReceivedDate = receivedDate,
            BankAccountId = request.BankAccountId,
            ReferenceDocumentType = request.ReferenceDocumentType,
            ReferenceDocumentId = request.ReferenceDocumentId,
            ReferenceDocumentNumber = request.ReferenceDocumentNumber,
            Remarks = request.Remarks
        };

        _context.ChequeRegisters.Add(cheque);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordCheque",
            EntityName = "ChequeRegister",
            EntityId = cheque.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { cheque.ChequeNumber, cheque.Amount, cheque.PartyName, cheque.Direction }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(cheque.Id);
    }

    public async Task<Result> DepositChequeAsync(
        Guid chequeId,
        DepositChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cheque = await _context.ChequeRegisters
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == chequeId && !c.IsDeleted, cancellationToken);

        if (cheque == null)
        {
            return Result.Failure("Cheque not found.", "NOT_FOUND");
        }

        if (cheque.Status != ChequeStatus.ReceivedInHand && cheque.Status != ChequeStatus.RePresented)
        {
            return Result.Failure($"Only cheques with status 'ReceivedInHand' or 'RePresented' can be deposited. Current status: {cheque.Status}", "INVALID_STATUS");
        }

        var bankAccount = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BankAccountId && !b.IsDeleted, cancellationToken);

        if (bankAccount == null)
        {
            return Result.Failure("Selected bank account not found.", "NOT_FOUND");
        }

        cheque.BankAccountId = bankAccount.Id;
        cheque.DepositDate = DateTime.SpecifyKind(request.DepositDate.Date, DateTimeKind.Utc);
        cheque.PresentationDate = cheque.DepositDate;
        cheque.Status = ChequeStatus.Deposited;
        if (!string.IsNullOrWhiteSpace(request.Remarks))
        {
            cheque.Remarks = string.IsNullOrWhiteSpace(cheque.Remarks) ? request.Remarks : $"{cheque.Remarks} | Deposit: {request.Remarks}";
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "DepositCheque",
            EntityName = "ChequeRegister",
            EntityId = cheque.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { cheque.ChequeNumber, bankAccount.AccountName, cheque.DepositDate }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> ClearChequeAsync(
        Guid chequeId,
        ClearChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cheque = await _context.ChequeRegisters
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == chequeId && !c.IsDeleted, cancellationToken);

        if (cheque == null)
        {
            return Result.Failure("Cheque not found.", "NOT_FOUND");
        }

        if (cheque.Status != ChequeStatus.Deposited && cheque.Status != ChequeStatus.ReceivedInHand)
        {
            return Result.Failure($"Cannot clear cheque in status '{cheque.Status}'. Must be Deposited first.", "INVALID_STATUS");
        }

        if (!cheque.BankAccountId.HasValue)
        {
            return Result.Failure("Bank account is required before clearing a cheque.", "BANK_ACCOUNT_REQUIRED");
        }

        var bankAccount = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == cheque.BankAccountId.Value && !b.IsDeleted, cancellationToken);

        if (bankAccount == null)
        {
            return Result.Failure("Associated bank account not found.", "NOT_FOUND");
        }

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == cheque.PartyId && !p.IsDeleted, cancellationToken);

        var clearingDateUtc = DateTime.SpecifyKind(request.ClearingDate.Date, DateTimeKind.Utc);
        cheque.ClearingDate = clearingDateUtc;
        cheque.Status = ChequeStatus.Cleared;
        if (!string.IsNullOrWhiteSpace(request.Remarks))
        {
            cheque.Remarks = string.IsNullOrWhiteSpace(cheque.Remarks) ? request.Remarks : $"{cheque.Remarks} | Cleared: {request.Remarks}";
        }

        // Ledger & Financial Postings upon Realization
        if (cheque.Direction == ChequeDirection.Incoming)
        {
            // Inward Cheque (Customer receipt cleared)
            bankAccount.CurrentBalance += cheque.Amount;

            if (party != null)
            {
                party.CurrentOutstandingBalance -= cheque.Amount;

                var ledgerEntry = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = clearingDateUtc,
                    EntryType = PartyLedgerEntryType.PaymentReceipt,
                    Description = $"Cheque Cleared: #{cheque.ChequeNumber} ({cheque.BankName}) into {bankAccount.AccountName}",
                    DebitAmount = 0m,
                    CreditAmount = cheque.Amount,
                    RunningBalance = party.CurrentOutstandingBalance,
                    PaymentMode = "Cheque",
                    ReferenceDocumentType = "CHEQUE_CLEAR",
                    ReferenceDocumentNumber = cheque.ChequeNumber,
                    ReferenceDocumentId = cheque.Id
                };
                _context.PartyLedgerEntries.Add(ledgerEntry);
            }
        }
        else
        {
            // Outward Cheque (Vendor payment cleared)
            bankAccount.CurrentBalance -= cheque.Amount;

            if (party != null)
            {
                party.CurrentOutstandingBalance -= cheque.Amount;

                var ledgerEntry = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    PartyId = party.Id,
                    TransactionDate = clearingDateUtc,
                    EntryType = PartyLedgerEntryType.VendorPayment,
                    Description = $"Cheque Cleared: Issued #{cheque.ChequeNumber} from {bankAccount.AccountName}",
                    DebitAmount = cheque.Amount,
                    CreditAmount = 0m,
                    RunningBalance = party.CurrentOutstandingBalance,
                    PaymentMode = "Cheque",
                    ReferenceDocumentType = "CHEQUE_CLEAR",
                    ReferenceDocumentNumber = cheque.ChequeNumber,
                    ReferenceDocumentId = cheque.Id
                };
                _context.PartyLedgerEntries.Add(ledgerEntry);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "ClearCheque",
            EntityName = "ChequeRegister",
            EntityId = cheque.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { cheque.ChequeNumber, cheque.Amount, bankAccount.AccountName, cheque.ClearingDate }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> BounceChequeAsync(
        Guid chequeId,
        BounceChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cheque = await _context.ChequeRegisters
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == chequeId && !c.IsDeleted, cancellationToken);

        if (cheque == null)
        {
            return Result.Failure("Cheque not found.", "NOT_FOUND");
        }

        if (cheque.Status == ChequeStatus.Bounced || cheque.Status == ChequeStatus.Cancelled)
        {
            return Result.Failure($"Cheque is already in status '{cheque.Status}'.", "ALREADY_PROCESSED");
        }

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == cheque.PartyId && !p.IsDeleted, cancellationToken);

        var bouncedDateUtc = DateTime.SpecifyKind(request.BouncedDate.Date, DateTimeKind.Utc);
        var wasPreviouslyCleared = cheque.Status == ChequeStatus.Cleared;

        cheque.Status = ChequeStatus.Bounced;
        cheque.BouncedDate = bouncedDateUtc;
        cheque.BounceReason = request.BounceReason;
        cheque.BounceChargesAmount = request.BounceCharges;
        cheque.IsBounceChargeBilledToParty = request.BillChargesToParty;

        if (!string.IsNullOrWhiteSpace(request.Remarks))
        {
            cheque.Remarks = string.IsNullOrWhiteSpace(cheque.Remarks) ? request.Remarks : $"{cheque.Remarks} | Bounced: {request.Remarks}";
        }

        // If it was already cleared in bank balance, reverse the bank entry
        if (wasPreviouslyCleared && cheque.BankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == cheque.BankAccountId.Value && !b.IsDeleted, cancellationToken);

            if (bankAccount != null)
            {
                if (cheque.Direction == ChequeDirection.Incoming)
                {
                    bankAccount.CurrentBalance -= cheque.Amount;
                }
                else
                {
                    bankAccount.CurrentBalance += cheque.Amount;
                }
            }
        }

        // Reversal of party ledger entry
        if (party != null)
        {
            if (cheque.Direction == ChequeDirection.Incoming)
            {
                // Customer cheque bounced: Add back customer debt
                if (wasPreviouslyCleared)
                {
                    party.CurrentOutstandingBalance += cheque.Amount;

                    var reverseEntry = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = bouncedDateUtc,
                        EntryType = PartyLedgerEntryType.JournalAdjustment,
                        Description = $"CHEQUE BOUNCE REVERSAL: #{cheque.ChequeNumber} ({cheque.BankName}) - Reason: {request.BounceReason}",
                        DebitAmount = cheque.Amount,
                        CreditAmount = 0m,
                        RunningBalance = party.CurrentOutstandingBalance,
                        PaymentMode = "Cheque",
                        ReferenceDocumentType = "CHEQUE_BOUNCE",
                        ReferenceDocumentNumber = cheque.ChequeNumber,
                        ReferenceDocumentId = cheque.Id
                    };
                    _context.PartyLedgerEntries.Add(reverseEntry);
                }

                // If bounce charges billed to customer (e.g. ₹590 bank dishonour penalty)
                if (request.BillChargesToParty && request.BounceCharges > 0)
                {
                    party.CurrentOutstandingBalance += request.BounceCharges;

                    var bounceChargeEntry = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = bouncedDateUtc,
                        EntryType = PartyLedgerEntryType.DebitNote,
                        Description = $"CHEQUE DISHONOUR CHARGES: #{cheque.ChequeNumber} - ₹{request.BounceCharges:F2}",
                        DebitAmount = request.BounceCharges,
                        CreditAmount = 0m,
                        RunningBalance = party.CurrentOutstandingBalance,
                        PaymentMode = "DebitNote",
                        ReferenceDocumentType = "CHEQUE_BOUNCE_CHARGE",
                        ReferenceDocumentNumber = cheque.ChequeNumber,
                        ReferenceDocumentId = cheque.Id
                    };
                    _context.PartyLedgerEntries.Add(bounceChargeEntry);
                }
            }
            else
            {
                // Outward Vendor Cheque bounced
                if (wasPreviouslyCleared)
                {
                    party.CurrentOutstandingBalance += cheque.Amount;

                    var reverseEntry = new PartyLedgerEntry
                    {
                        TenantId = tenantId,
                        PartyId = party.Id,
                        TransactionDate = bouncedDateUtc,
                        EntryType = PartyLedgerEntryType.JournalAdjustment,
                        Description = $"OUTWARD CHEQUE BOUNCE REVERSAL: Issued #{cheque.ChequeNumber} - Reason: {request.BounceReason}",
                        DebitAmount = 0m,
                        CreditAmount = cheque.Amount,
                        RunningBalance = party.CurrentOutstandingBalance,
                        PaymentMode = "Cheque",
                        ReferenceDocumentType = "CHEQUE_BOUNCE",
                        ReferenceDocumentNumber = cheque.ChequeNumber,
                        ReferenceDocumentId = cheque.Id
                    };
                    _context.PartyLedgerEntries.Add(reverseEntry);
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "BounceCheque",
            EntityName = "ChequeRegister",
            EntityId = cheque.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { cheque.ChequeNumber, cheque.BounceReason, cheque.BounceChargesAmount, cheque.IsBounceChargeBilledToParty }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> CancelChequeAsync(
        Guid chequeId,
        string? reason = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cheque = await _context.ChequeRegisters
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == chequeId && !c.IsDeleted, cancellationToken);

        if (cheque == null)
        {
            return Result.Failure("Cheque not found.", "NOT_FOUND");
        }

        if (cheque.Status == ChequeStatus.Cleared)
        {
            return Result.Failure("Cannot cancel an already cleared cheque. Use Bounce or Dishonour protocol instead.", "INVALID_STATUS");
        }

        cheque.Status = ChequeStatus.Cancelled;
        cheque.Remarks = string.IsNullOrWhiteSpace(reason)
            ? cheque.Remarks
            : $"{cheque.Remarks} | Cancelled: {reason}";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "CancelCheque",
            EntityName = "ChequeRegister",
            EntityId = cheque.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { cheque.ChequeNumber, reason }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }
}
