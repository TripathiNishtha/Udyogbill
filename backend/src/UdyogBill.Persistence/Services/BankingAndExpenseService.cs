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
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BankingAndExpenseService : IBankingAndExpenseService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public BankingAndExpenseService(
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

    #region 1. Bank Accounts

    public async Task<Result<IReadOnlyList<BankAccountDto>>> GetBankAccountsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var accounts = await _context.BankAccounts
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .OrderByDescending(b => b.IsDefault)
            .ThenBy(b => b.AccountName)
            .Select(b => new BankAccountDto(
                b.Id,
                b.AccountName,
                b.BankName,
                b.AccountNumber,
                b.IfscCode,
                b.BranchName,
                b.UpiId,
                b.AccountType,
                b.OpeningBalance,
                b.CurrentBalance,
                b.IsDefault,
                b.IsActive,
                b.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<BankAccountDto>>.Success(accounts);
    }

    public async Task<Result<BankAccountDto>> GetBankAccountByIdAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var b = await _context.BankAccounts
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == accountId && !x.IsDeleted, cancellationToken);

        if (b == null)
        {
            return Result<BankAccountDto>.Failure("Bank account not found.", "NOT_FOUND");
        }

        return Result<BankAccountDto>.Success(new BankAccountDto(
            b.Id,
            b.AccountName,
            b.BankName,
            b.AccountNumber,
            b.IfscCode,
            b.BranchName,
            b.UpiId,
            b.AccountType,
            b.OpeningBalance,
            b.CurrentBalance,
            b.IsDefault,
            b.IsActive,
            b.CreatedAtUtc
        ));
    }

    public async Task<Result<Guid>> CreateBankAccountAsync(CreateBankAccountRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.IsDefault)
        {
            var defaults = await _context.BankAccounts
                .Where(b => b.TenantId == tenantId && b.IsDefault && !b.IsDeleted)
                .ToListAsync(cancellationToken);
            foreach (var d in defaults) d.IsDefault = false;
        }

        var account = new BankAccount
        {
            TenantId = tenantId,
            AccountName = request.AccountName.Trim(),
            BankName = request.BankName?.Trim(),
            AccountNumber = request.AccountNumber?.Trim(),
            IfscCode = request.IfscCode?.Trim().ToUpperInvariant(),
            BranchName = request.BranchName?.Trim(),
            UpiId = request.UpiId?.Trim(),
            AccountType = request.AccountType,
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,
            IsDefault = request.IsDefault,
            IsActive = true
        };

        _context.BankAccounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        // Auto-create/sync LedgerAccount in Chart of Accounts under GRP-BANK
        try
        {
            var bankGroup = await _context.AccountGroups.FirstOrDefaultAsync(g => g.TenantId == tenantId && (g.Code == "GRP-BANK" || g.Code == "GRP-BANK-ACCOUNTS"), cancellationToken);
            if (bankGroup == null)
            {
                bankGroup = new AccountGroup
                {
                    TenantId = tenantId,
                    Code = "GRP-BANK",
                    Name = "Bank Accounts",
                    Category = "Asset",
                    Nature = "Debit"
                };
                _context.AccountGroups.Add(bankGroup);
                await _context.SaveChangesAsync(cancellationToken);
            }

            var cleanAccNum = account.AccountNumber?.Trim();
            var accTail = !string.IsNullOrWhiteSpace(cleanAccNum) && cleanAccNum.Length >= 4 ? cleanAccNum[^4..] : account.Id.ToString()[..4].ToUpperInvariant();
            var accCode = $"ACC-BANK-{accTail}";

            var existingLedger = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && (a.AccountCode == accCode || (a.BankAccountNumber != null && a.BankAccountNumber == cleanAccNum)), cancellationToken);
            if (existingLedger == null)
            {
                var ledgerAcc = new LedgerAccount
                {
                    TenantId = tenantId,
                    AccountCode = accCode,
                    AccountName = $"{account.BankName ?? "Bank"} - {account.AccountName}",
                    GroupId = bankGroup.Id,
                    Category = "Asset",
                    BalanceType = "Debit",
                    OpeningBalance = account.OpeningBalance,
                    CurrentBalance = account.CurrentBalance,
                    BankName = account.BankName,
                    BankAccountNumber = account.AccountNumber,
                    BankIfscCode = account.IfscCode,
                    BankBranch = account.BranchName,
                    IsActive = true
                };
                _context.LedgerAccounts.Add(ledgerAcc);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        catch { }

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateBankAccount",
            EntityName = "BankAccount",
            EntityId = account.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { account.AccountName, account.AccountNumber, account.CurrentBalance }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(account.Id);
    }

    public async Task<Result> UpdateBankAccountAsync(Guid accountId, UpdateBankAccountRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var account = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == accountId && !b.IsDeleted, cancellationToken);

        if (account == null)
        {
            return Result.Failure("Bank account not found.", "NOT_FOUND");
        }

        if (request.IsDefault && !account.IsDefault)
        {
            var defaults = await _context.BankAccounts
                .Where(b => b.TenantId == tenantId && b.IsDefault && !b.IsDeleted)
                .ToListAsync(cancellationToken);
            foreach (var d in defaults) d.IsDefault = false;
        }

        account.AccountName = request.AccountName.Trim();
        account.BankName = request.BankName?.Trim();
        account.AccountNumber = request.AccountNumber?.Trim();
        account.IfscCode = request.IfscCode?.Trim().ToUpperInvariant();
        account.BranchName = request.BranchName?.Trim();
        account.UpiId = request.UpiId?.Trim();
        account.AccountType = request.AccountType;
        account.IsDefault = request.IsDefault;
        account.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateBankAccount",
            EntityName = "BankAccount",
            EntityId = account.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteBankAccountAsync(Guid accountId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var account = await _context.BankAccounts
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == accountId && !b.IsDeleted, cancellationToken);

        if (account == null)
        {
            return Result.Failure("Bank account not found.", "NOT_FOUND");
        }

        account.IsDeleted = true;
        account.DeletedAtUtc = DateTimeOffset.UtcNow;
        account.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Delete,
            ActionName = "DeleteBankAccount",
            EntityName = "BankAccount",
            EntityId = account.Id.ToString(),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #endregion

    #region 2. Customer Inward Receipts & Supplier Outward Payments

    public async Task<Result<PaymentReceiptVoucherDto>> RecordCustomerReceiptAsync(
        RecordPaymentReceiptRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<PaymentReceiptVoucherDto>.Failure("Customer party record not found.", "NOT_FOUND");
        }

        var voucherNumber = $"REC-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";

        // Update Party Balance (Receipt reduces customer receivable debt)
        party.CurrentOutstandingBalance -= request.Amount;

        // Post to Party Ledger
        var ledgerEntry = new PartyLedgerEntry
        {
            TenantId = tenantId,
            PartyId = party.Id,
            TransactionDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc),
            EntryType = PartyLedgerEntryType.PaymentReceipt,
            Description = $"Payment Receipt ({request.PaymentMode}) - {request.Notes ?? "Settlement"}",
            DebitAmount = 0m,
            CreditAmount = request.Amount,
            RunningBalance = party.CurrentOutstandingBalance,
            PaymentMode = request.PaymentMode.ToString(),
            ReferenceDocumentType = "PAYMENT_RECEIPT",
            ReferenceDocumentNumber = voucherNumber,
            ReferenceDocumentId = Guid.NewGuid()
        };
        _context.PartyLedgerEntries.Add(ledgerEntry);

        // Update Bank Balance if Bank Account provided
        string? bankAccountName = null;
        if (request.BankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (bankAccount != null)
            {
                bankAccount.CurrentBalance += request.Amount;
                bankAccountName = bankAccount.AccountName;
            }
        }

        // Update Cash Drawer if Cash payment mode
        if (request.PaymentMode == PaymentMode.Cash && _currentUserContext.UserId.HasValue)
        {
            var activeSession = await _context.CashDrawerSessions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == _currentUserContext.UserId.Value && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);
            if (activeSession != null)
            {
                activeSession.CashReceiptsTotal += request.Amount;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordCustomerReceipt",
            EntityName = "PartyLedgerEntry",
            EntityId = ledgerEntry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Customer = party.LegalName, request.Amount, request.PaymentMode, voucherNumber }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<PaymentReceiptVoucherDto>.Success(new PaymentReceiptVoucherDto(
            ledgerEntry.Id,
            voucherNumber,
            request.PaymentDate,
            party.Id,
            party.LegalName,
            party.Code,
            request.Amount,
            request.PaymentMode,
            bankAccountName,
            request.ReferenceNumber,
            party.CurrentOutstandingBalance
        ));
    }

    public async Task<Result<PaymentReceiptVoucherDto>> RecordVendorPaymentAsync(
        RecordVendorPaymentRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var party = await _context.Parties
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == request.PartyId && !p.IsDeleted, cancellationToken);

        if (party == null)
        {
            return Result<PaymentReceiptVoucherDto>.Failure("Supplier party record not found.", "NOT_FOUND");
        }

        var voucherNumber = $"PAY-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";

        // Update Party Balance (Payment reduces vendor payable balance)
        party.CurrentOutstandingBalance += request.Amount;

        // Post to Party Ledger
        var ledgerEntry = new PartyLedgerEntry
        {
            TenantId = tenantId,
            PartyId = party.Id,
            TransactionDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc),
            EntryType = PartyLedgerEntryType.VendorPayment,
            Description = $"Payment to Vendor ({request.PaymentMode}) - {request.Notes ?? "Settlement"}",
            DebitAmount = request.Amount,
            CreditAmount = 0m,
            RunningBalance = party.CurrentOutstandingBalance,
            PaymentMode = request.PaymentMode.ToString(),
            ReferenceDocumentType = "VENDOR_PAYMENT",
            ReferenceDocumentNumber = voucherNumber,
            ReferenceDocumentId = Guid.NewGuid()
        };
        _context.PartyLedgerEntries.Add(ledgerEntry);

        // Deduct Bank Balance if Bank Account provided
        string? bankAccountName = null;
        if (request.BankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (bankAccount != null)
            {
                bankAccount.CurrentBalance -= request.Amount;
                bankAccountName = bankAccount.AccountName;
            }
        }

        // Update Cash Drawer if Cash payout
        if (request.PaymentMode == PaymentMode.Cash && _currentUserContext.UserId.HasValue)
        {
            var activeSession = await _context.CashDrawerSessions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == _currentUserContext.UserId.Value && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);
            if (activeSession != null)
            {
                activeSession.CashPayoutsTotal += request.Amount;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordVendorPayment",
            EntityName = "PartyLedgerEntry",
            EntityId = ledgerEntry.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Vendor = party.LegalName, request.Amount, request.PaymentMode, voucherNumber }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<PaymentReceiptVoucherDto>.Success(new PaymentReceiptVoucherDto(
            ledgerEntry.Id,
            voucherNumber,
            request.PaymentDate,
            party.Id,
            party.LegalName,
            party.Code,
            request.Amount,
            request.PaymentMode,
            bankAccountName,
            request.ReferenceNumber,
            party.CurrentOutstandingBalance
        ));
    }

    public async Task<Result<ContraTransferResultDto>> RecordContraTransferAsync(
        RecordContraTransferRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Amount <= 0)
        {
            return Result<ContraTransferResultDto>.Failure("Transfer amount must be greater than zero.", "INVALID_AMOUNT");
        }

        BankAccount? sourceAccount = null;
        BankAccount? destinationAccount = null;

        if (request.TransferType == ContraTransferType.BankToBank)
        {
            if (!request.SourceBankAccountId.HasValue || !request.DestinationBankAccountId.HasValue)
            {
                return Result<ContraTransferResultDto>.Failure("Both Source and Destination bank accounts are required for Bank to Bank transfer.", "VALIDATION_ERROR");
            }
            if (request.SourceBankAccountId.Value == request.DestinationBankAccountId.Value)
            {
                return Result<ContraTransferResultDto>.Failure("Source and Destination accounts cannot be the same.", "SAME_ACCOUNT");
            }

            sourceAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.SourceBankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (sourceAccount == null)
            {
                return Result<ContraTransferResultDto>.Failure("Source bank account not found.", "NOT_FOUND");
            }

            destinationAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.DestinationBankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (destinationAccount == null)
            {
                return Result<ContraTransferResultDto>.Failure("Destination bank account not found.", "NOT_FOUND");
            }

            sourceAccount.CurrentBalance -= request.Amount;
            destinationAccount.CurrentBalance += request.Amount;
        }
        else if (request.TransferType == ContraTransferType.CashToBank)
        {
            if (!request.DestinationBankAccountId.HasValue)
            {
                return Result<ContraTransferResultDto>.Failure("Destination bank account is required for Cash to Bank deposit.", "VALIDATION_ERROR");
            }

            destinationAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.DestinationBankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (destinationAccount == null)
            {
                return Result<ContraTransferResultDto>.Failure("Destination bank account not found.", "NOT_FOUND");
            }

            destinationAccount.CurrentBalance += request.Amount;

            if (_currentUserContext.UserId.HasValue)
            {
                var activeSession = await _context.CashDrawerSessions
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == _currentUserContext.UserId.Value && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);
                if (activeSession != null)
                {
                    activeSession.CashPayoutsTotal += request.Amount;
                }
            }
        }
        else if (request.TransferType == ContraTransferType.BankToCash)
        {
            if (!request.SourceBankAccountId.HasValue)
            {
                return Result<ContraTransferResultDto>.Failure("Source bank account is required for Bank to Cash withdrawal.", "VALIDATION_ERROR");
            }

            sourceAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.SourceBankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (sourceAccount == null)
            {
                return Result<ContraTransferResultDto>.Failure("Source bank account not found.", "NOT_FOUND");
            }

            sourceAccount.CurrentBalance -= request.Amount;

            if (_currentUserContext.UserId.HasValue)
            {
                var activeSession = await _context.CashDrawerSessions
                    .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == _currentUserContext.UserId.Value && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);
                if (activeSession != null)
                {
                    activeSession.CashReceiptsTotal += request.Amount;
                }
            }
        }

        var voucherNumber = $"CTR-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";
        var voucherId = Guid.NewGuid();

        // Sync with Accounting General Ledger
        try
        {
            var bankAccountsGroup = await _context.AccountGroups
                .FirstOrDefaultAsync(g => g.TenantId == tenantId && (g.Code == "BANK" || g.Name.Contains("Bank Accounts")) && !g.IsDeleted, cancellationToken);

            LedgerAccount? destLedger = null;
            LedgerAccount? srcLedger = null;

            if (destinationAccount != null)
            {
                destLedger = await _context.LedgerAccounts
                    .FirstOrDefaultAsync(l => l.TenantId == tenantId && (l.AccountName == destinationAccount.AccountName || l.BankAccountNumber == destinationAccount.AccountNumber) && !l.IsDeleted, cancellationToken);
                if (destLedger == null && bankAccountsGroup != null)
                {
                    destLedger = new LedgerAccount
                    {
                        TenantId = tenantId,
                        AccountCode = $"BNK-{destinationAccount.AccountName.Substring(0, Math.Min(3, destinationAccount.AccountName.Length)).ToUpperInvariant()}-{destinationAccount.Id.ToString().Substring(0, 4)}",
                        AccountName = destinationAccount.AccountName,
                        GroupId = bankAccountsGroup.Id,
                        Category = "Asset",
                        OpeningBalance = destinationAccount.OpeningBalance,
                        BalanceType = "Debit",
                        CurrentBalance = destinationAccount.CurrentBalance,
                        BankName = destinationAccount.BankName,
                        BankAccountNumber = destinationAccount.AccountNumber,
                        BankIfscCode = destinationAccount.IfscCode,
                        BankBranch = destinationAccount.BranchName,
                        IsActive = true
                    };
                    _context.LedgerAccounts.Add(destLedger);
                }
            }
            else if (request.TransferType == ContraTransferType.BankToCash)
            {
                destLedger = await _context.LedgerAccounts
                    .FirstOrDefaultAsync(l => l.TenantId == tenantId && (l.AccountName.Contains("Cash") || l.AccountCode == "CASH-MAIN") && !l.IsDeleted, cancellationToken);
            }

            if (sourceAccount != null)
            {
                srcLedger = await _context.LedgerAccounts
                    .FirstOrDefaultAsync(l => l.TenantId == tenantId && (l.AccountName == sourceAccount.AccountName || l.BankAccountNumber == sourceAccount.AccountNumber) && !l.IsDeleted, cancellationToken);
                if (srcLedger == null && bankAccountsGroup != null)
                {
                    srcLedger = new LedgerAccount
                    {
                        TenantId = tenantId,
                        AccountCode = $"BNK-{sourceAccount.AccountName.Substring(0, Math.Min(3, sourceAccount.AccountName.Length)).ToUpperInvariant()}-{sourceAccount.Id.ToString().Substring(0, 4)}",
                        AccountName = sourceAccount.AccountName,
                        GroupId = bankAccountsGroup.Id,
                        Category = "Asset",
                        OpeningBalance = sourceAccount.OpeningBalance,
                        BalanceType = "Debit",
                        CurrentBalance = sourceAccount.CurrentBalance,
                        BankName = sourceAccount.BankName,
                        BankAccountNumber = sourceAccount.AccountNumber,
                        BankIfscCode = sourceAccount.IfscCode,
                        BankBranch = sourceAccount.BranchName,
                        IsActive = true
                    };
                    _context.LedgerAccounts.Add(srcLedger);
                }
            }
            else if (request.TransferType == ContraTransferType.CashToBank)
            {
                srcLedger = await _context.LedgerAccounts
                    .FirstOrDefaultAsync(l => l.TenantId == tenantId && (l.AccountName.Contains("Cash") || l.AccountCode == "CASH-MAIN") && !l.IsDeleted, cancellationToken);
            }

            if (destLedger != null && srcLedger != null)
            {
                var jv = new JournalVoucher
                {
                    Id = voucherId,
                    TenantId = tenantId,
                    VoucherNumber = voucherNumber,
                    VoucherDate = DateTime.SpecifyKind(request.TransferDate, DateTimeKind.Utc),
                    VoucherType = "Contra",
                    ReferenceNumber = request.ReferenceNumber,
                    TotalDebit = request.Amount,
                    TotalCredit = request.Amount,
                    Narration = $"Contra Entry: Transferred ₹{request.Amount:N2} from {(sourceAccount?.AccountName ?? "Cash in Hand")} to {(destinationAccount?.AccountName ?? "Cash in Hand")}. {request.Notes ?? ""}".Trim(),
                    CreatedByName = _currentUserContext.Email ?? "Cashier/Accountant",
                    SourceDocumentType = "CONTRA_TRANSFER",
                    SourceDocumentId = voucherId,
                    IsCancelled = false
                };

                jv.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = destLedger.Id,
                    DebitAmount = request.Amount,
                    CreditAmount = 0m,
                    Narration = $"Debit Destination: {(destinationAccount?.AccountName ?? "Cash in Hand")}"
                });

                jv.Legs.Add(new JournalVoucherLeg
                {
                    TenantId = tenantId,
                    AccountId = srcLedger.Id,
                    DebitAmount = 0m,
                    CreditAmount = request.Amount,
                    Narration = $"Credit Source: {(sourceAccount?.AccountName ?? "Cash in Hand")}"
                });

                _context.JournalVouchers.Add(jv);
            }
        }
        catch
        {
            // Graceful fallback
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "RecordContraTransfer",
            EntityName = "ContraTransfer",
            EntityId = voucherId.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new
            {
                request.TransferType,
                SourceAccount = sourceAccount?.AccountName ?? "Cash in Hand",
                DestinationAccount = destinationAccount?.AccountName ?? "Cash in Hand",
                request.Amount,
                voucherNumber,
                request.ReferenceNumber
            }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<ContraTransferResultDto>.Success(new ContraTransferResultDto(
            voucherId,
            voucherNumber,
            request.TransferType,
            request.Amount,
            request.TransferDate,
            sourceAccount?.AccountName ?? "Cash in Hand",
            destinationAccount?.AccountName ?? "Cash in Hand",
            sourceAccount?.CurrentBalance,
            destinationAccount?.CurrentBalance,
            $"Contra transfer voucher {voucherNumber} created successfully."
        ));
    }

    #endregion

    #region 3. Business Expenses & Categories

    public async Task<Result<IReadOnlyList<ExpenseCategoryDto>>> GetExpenseCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var categories = await _context.ExpenseCategories
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => new ExpenseCategoryDto(
                c.Id,
                c.Code,
                c.Name,
                c.Description,
                c.IsActive
            ))
            .ToListAsync(cancellationToken);

        // Auto-seed default expense categories if tenant has none
        if (categories.Count == 0)
        {
            var defaultCats = new (string Code, string Name, string Desc)[]
            {
                ("RENT", "Office & Store Rent", "Monthly premises and warehouse rental payments"),
                ("SALARIES", "Staff Salaries & Wages", "Employee compensation, allowances, and bonuses"),
                ("UTILITIES", "Electricity & Water", "Power, water, and utility bills"),
                ("LOGISTICS", "Courier & Freight Transport", "Inward and outward delivery and shipping charges"),
                ("MARKETING", "Advertising & Marketing", "Promotional campaigns, print media, and social ads"),
                ("MAINTENANCE", "Equipment & Shop Maintenance", "Repairs, software licenses, and store maintenance"),
                ("TEA_SNACKS", "Pantry & Office Refreshments", "Tea, snacks, and client refreshments")
            };

            foreach (var (code, name, desc) in defaultCats)
            {
                _context.ExpenseCategories.Add(new ExpenseCategory
                {
                    TenantId = tenantId,
                    Code = code,
                    Name = name,
                    Description = desc,
                    IsActive = true
                });
            }
            await _context.SaveChangesAsync(cancellationToken);

            return await GetExpenseCategoriesAsync(cancellationToken);
        }

        return Result<IReadOnlyList<ExpenseCategoryDto>>.Success(categories);
    }

    public async Task<Result<Guid>> CreateExpenseCategoryAsync(CreateExpenseCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cat = new ExpenseCategory
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true
        };

        _context.ExpenseCategories.Add(cat);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(cat.Id);
    }

    public async Task<Result<PagedResult<ExpenseVoucherDto>>> GetExpenseVouchersAsync(
        int pageNumber = 1,
        int pageSize = 25,
        Guid? categoryId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.ExpenseVouchers
            .Where(e => e.TenantId == tenantId && !e.IsDeleted)
            .Include(e => e.Category)
            .Include(e => e.BankAccount)
            .AsQueryable();

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            query = query.Where(e => e.CategoryId == categoryId.Value);
        }

        if (fromDate.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc);
            query = query.Where(e => e.ExpenseDate >= fromUtc);
        }

        if (toDate.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc);
            query = query.Where(e => e.ExpenseDate <= toUtc);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(e => e.ExpenseDate)
            .ThenByDescending(e => e.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new ExpenseVoucherDto(
                e.Id,
                e.VoucherNumber,
                e.ExpenseDate,
                e.CategoryId,
                e.Category.Name,
                e.PaidTo,
                e.Amount,
                e.TaxAmount,
                e.TotalAmount,
                e.PaymentMode,
                e.BankAccountId,
                e.BankAccount != null ? e.BankAccount.AccountName : null,
                e.ReferenceNumber,
                e.HasGstInvoice,
                e.VendorGstin,
                e.Notes,
                e.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<ExpenseVoucherDto>>.Success(
            PagedResult<ExpenseVoucherDto>.Create(items, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<Guid>> CreateExpenseVoucherAsync(
        CreateExpenseVoucherRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var category = await _context.ExpenseCategories
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == request.CategoryId && !c.IsDeleted, cancellationToken);
        if (category == null)
        {
            return Result<Guid>.Failure("Expense category not found.", "NOT_FOUND");
        }

        var voucherNo = $"EXP-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";
        var totalAmount = request.Amount + request.TaxAmount;

        var expense = new ExpenseVoucher
        {
            TenantId = tenantId,
            VoucherNumber = voucherNo,
            ExpenseDate = DateTime.SpecifyKind(request.ExpenseDate, DateTimeKind.Utc),
            CategoryId = request.CategoryId,
            PaidTo = request.PaidTo.Trim(),
            Amount = request.Amount,
            TaxAmount = request.TaxAmount,
            TotalAmount = totalAmount,
            PaymentMode = request.PaymentMode,
            BankAccountId = request.BankAccountId,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            HasGstInvoice = request.HasGstInvoice,
            VendorGstin = request.VendorGstin?.Trim().ToUpperInvariant(),
            Notes = request.Notes?.Trim()
        };

        _context.ExpenseVouchers.Add(expense);

        // Deduct from bank account if specified
        if (request.BankAccountId.HasValue)
        {
            var bankAccount = await _context.BankAccounts
                .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BankAccountId.Value && !b.IsDeleted, cancellationToken);
            if (bankAccount != null)
            {
                bankAccount.CurrentBalance -= totalAmount;
            }
        }

        // Deduct from active cash drawer if Cash payment mode
        if (request.PaymentMode == PaymentMode.Cash && _currentUserContext.UserId.HasValue)
        {
            var activeSession = await _context.CashDrawerSessions
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == _currentUserContext.UserId.Value && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);
            if (activeSession != null)
            {
                activeSession.CashPayoutsTotal += totalAmount;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateExpenseVoucher",
            EntityName = "ExpenseVoucher",
            EntityId = expense.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { expense.VoucherNumber, Category = category.Name, TotalAmount = totalAmount, expense.PaymentMode }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(expense.Id);
    }

    #endregion

    #region 4. POS Cash Drawer Reconciliation

    public async Task<Result<CashDrawerSessionDto>> GetCurrentCashDrawerSessionAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        var session = await _context.CashDrawerSessions
            .Where(s => s.TenantId == tenantId && s.CashierUserId == userId && s.Status == CashDrawerStatus.Open && !s.IsDeleted)
            .Include(s => s.CashierUser)
            .OrderByDescending(s => s.OpenedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (session == null)
        {
            return Result<CashDrawerSessionDto>.Failure("No open cash drawer session found for current user.", "NO_OPEN_SESSION");
        }

        return Result<CashDrawerSessionDto>.Success(new CashDrawerSessionDto(
            session.Id,
            session.CashierUserId,
            session.CashierUser?.Email ?? _currentUserContext.Email ?? "Cashier",
            session.OpenedAtUtc,
            session.ClosedAtUtc,
            session.OpeningFloat,
            session.CashSalesTotal,
            session.CashReceiptsTotal,
            session.CashPayoutsTotal,
            session.ExpectedClosingCash,
            session.ActualClosingCash,
            session.DifferenceAmount,
            session.Status,
            session.ClosingNotes
        ));
    }

    public async Task<Result<CashDrawerSessionDto>> OpenCashDrawerSessionAsync(OpenCashDrawerRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        var existing = await _context.CashDrawerSessions
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CashierUserId == userId && s.Status == CashDrawerStatus.Open && !s.IsDeleted, cancellationToken);

        if (existing != null)
        {
            return Result<CashDrawerSessionDto>.Failure("You already have an active open cash drawer session.", "SESSION_ALREADY_OPEN");
        }

        var session = new CashDrawerSession
        {
            TenantId = tenantId,
            CashierUserId = userId,
            OpenedAtUtc = DateTimeOffset.UtcNow,
            OpeningFloat = request.OpeningFloat,
            CashSalesTotal = 0m,
            CashReceiptsTotal = 0m,
            CashPayoutsTotal = 0m,
            Status = CashDrawerStatus.Open,
            ClosingNotes = request.Notes
        };

        _context.CashDrawerSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<CashDrawerSessionDto>.Success(new CashDrawerSessionDto(
            session.Id,
            session.CashierUserId,
            _currentUserContext.Email ?? "Cashier",
            session.OpenedAtUtc,
            null,
            session.OpeningFloat,
            0m,
            0m,
            0m,
            session.OpeningFloat,
            null,
            null,
            session.Status,
            session.ClosingNotes
        ));
    }

    public async Task<Result<CashDrawerSessionDto>> CloseCashDrawerSessionAsync(CloseCashDrawerRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var userId = _currentUserContext.UserId ?? Guid.Empty;

        var session = await _context.CashDrawerSessions
            .Where(s => s.TenantId == tenantId && s.CashierUserId == userId && s.Status == CashDrawerStatus.Open && !s.IsDeleted)
            .OrderByDescending(s => s.OpenedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (session == null)
        {
            return Result<CashDrawerSessionDto>.Failure("No open cash drawer session found to close.", "NOT_FOUND");
        }

        var expected = session.ExpectedClosingCash;
        var diff = request.ActualClosingCash - expected;

        session.ClosedAtUtc = DateTimeOffset.UtcNow;
        session.ActualClosingCash = request.ActualClosingCash;
        session.DifferenceAmount = diff;
        session.Status = diff == 0 ? CashDrawerStatus.Closed : CashDrawerStatus.Discrepancy;
        session.ClosingNotes = request.ClosingNotes;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<CashDrawerSessionDto>.Success(new CashDrawerSessionDto(
            session.Id,
            session.CashierUserId,
            _currentUserContext.Email ?? "Cashier",
            session.OpenedAtUtc,
            session.ClosedAtUtc,
            session.OpeningFloat,
            session.CashSalesTotal,
            session.CashReceiptsTotal,
            session.CashPayoutsTotal,
            expected,
            session.ActualClosingCash,
            session.DifferenceAmount,
            session.Status,
            session.ClosingNotes
        ));
    }

    #endregion

    #region 5. Banking & Cash Flow Summary

    public async Task<Result<BankingCashFlowSummaryDto>> GetBankingCashFlowSummaryAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var accountsRes = await GetBankAccountsAsync(cancellationToken);
        var accounts = accountsRes.Data ?? new List<BankAccountDto>();

        var totalBank = accounts
            .Where(a => a.AccountType != BankAccountType.CashInHand)
            .Sum(a => a.CurrentBalance);

        var totalCash = accounts
            .Where(a => a.AccountType == BankAccountType.CashInHand)
            .Sum(a => a.CurrentBalance);

        var now = DateTimeOffset.UtcNow;
        var monthStartUtc = DateTime.SpecifyKind(new DateTime(now.Year, now.Month, 1), DateTimeKind.Utc);

        // Receipts this month
        var receiptsThisMonth = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.TransactionDate >= monthStartUtc && l.EntryType == PartyLedgerEntryType.PaymentReceipt && !l.IsDeleted)
            .SumAsync(l => l.CreditAmount, cancellationToken);

        // Vendor Payments this month
        var paymentsThisMonth = await _context.PartyLedgerEntries
            .Where(l => l.TenantId == tenantId && l.TransactionDate >= monthStartUtc && l.EntryType == PartyLedgerEntryType.VendorPayment && !l.IsDeleted)
            .SumAsync(l => l.DebitAmount, cancellationToken);

        // Expenses this month
        var expensesThisMonth = await _context.ExpenseVouchers
            .Where(e => e.TenantId == tenantId && e.ExpenseDate >= monthStartUtc && !e.IsDeleted)
            .SumAsync(e => e.TotalAmount, cancellationToken);

        var summary = new BankingCashFlowSummaryDto(
            totalBank,
            totalCash,
            totalBank + totalCash,
            receiptsThisMonth,
            paymentsThisMonth + expensesThisMonth,
            expensesThisMonth,
            accounts
        );

        return Result<BankingCashFlowSummaryDto>.Success(summary);
    }

    #endregion
}
