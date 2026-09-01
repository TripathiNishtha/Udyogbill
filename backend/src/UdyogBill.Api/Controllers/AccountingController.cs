using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/accounting")]
public class AccountingController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    public AccountingController(AppDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    #region Account Groups

    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<AccountGroupDto>>> GetAccountGroups(CancellationToken cancellationToken = default)
    {
        var groups = await _context.AccountGroups
            .OrderBy(g => g.Category)
            .ThenBy(g => g.Name)
            .Select(g => new AccountGroupDto(
                g.Id,
                g.Code,
                g.Name,
                g.Category,
                g.Nature,
                g.ParentGroupId,
                g.Description
            ))
            .ToListAsync(cancellationToken);

        // If no groups exist yet for this tenant, auto-seed standard Indian Chart of Account Groups
        if (groups.Count == 0 && _tenantContext.TenantId != Guid.Empty)
        {
            var defaultGroups = GetDefaultAccountGroups(_tenantContext.TenantId);
            _context.AccountGroups.AddRange(defaultGroups);
            await _context.SaveChangesAsync(cancellationToken);

            groups = defaultGroups.Select(g => new AccountGroupDto(
                g.Id,
                g.Code,
                g.Name,
                g.Category,
                g.Nature,
                g.ParentGroupId,
                g.Description
            )).ToList();
        }

        return Ok(groups);
    }

    #endregion

    #region Ledger Accounts

    [HttpGet("accounts")]
    public async Task<ActionResult<IReadOnlyList<LedgerAccountDto>>> GetAccounts(CancellationToken cancellationToken = default)
    {
        var accounts = await _context.LedgerAccounts
            .Include(a => a.Group)
            .OrderBy(a => a.AccountName)
            .Select(a => new LedgerAccountDto(
                a.Id,
                a.AccountCode,
                a.AccountName,
                a.GroupId,
                a.Group != null ? a.Group.Name : "",
                a.Category,
                a.OpeningBalance,
                a.BalanceType,
                a.CurrentBalance,
                a.IsSystemAccount,
                a.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    [HttpPost("accounts")]
    public async Task<ActionResult<LedgerAccountDto>> CreateAccount([FromBody] CreateLedgerAccountRequest request, CancellationToken cancellationToken = default)
    {
        var group = await _context.AccountGroups.FirstOrDefaultAsync(g => g.Id == request.GroupId, cancellationToken);
        var account = new LedgerAccount
        {
            AccountCode = request.AccountCode.Trim().ToUpperInvariant(),
            AccountName = request.AccountName.Trim(),
            GroupId = request.GroupId,
            Category = request.Category ?? (group?.Category ?? "Asset"),
            OpeningBalance = request.OpeningBalance,
            BalanceType = request.BalanceType ?? "Debit",
            CurrentBalance = request.OpeningBalance,
            IsSystemAccount = false,
            IsActive = true
        };

        _context.LedgerAccounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new LedgerAccountDto(
            account.Id,
            account.AccountCode,
            account.AccountName,
            account.GroupId,
            group?.Name ?? "",
            account.Category,
            account.OpeningBalance,
            account.BalanceType,
            account.CurrentBalance,
            account.IsSystemAccount,
            account.IsActive
        ));
    }

    #endregion

    #region Journal Vouchers

    [HttpGet("vouchers")]
    public async Task<ActionResult<IReadOnlyList<JournalVoucherDto>>> GetVouchers(
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.JournalVouchers
            .Include(v => v.Legs)
                .ThenInclude(l => l.Account)
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(v => v.VoucherDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(v => v.VoucherDate <= toDate.Value);

        var vouchers = await query
            .OrderByDescending(v => v.VoucherDate)
            .Select(v => new JournalVoucherDto(
                v.Id,
                v.VoucherNumber,
                v.VoucherDate,
                v.VoucherType,
                v.ReferenceNumber,
                v.TotalDebit,
                v.TotalCredit,
                v.Narration,
                v.CreatedByName,
                v.CreatedAtUtc,
                v.Legs.Select(l => new JournalVoucherLegDto(
                    l.AccountId,
                    l.Account.AccountCode,
                    l.Account.AccountName,
                    l.DebitAmount,
                    l.CreditAmount,
                    l.Narration
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Ok(vouchers);
    }

    [HttpPost("vouchers")]
    public async Task<ActionResult<JournalVoucherDto>> CreateVoucher([FromBody] CreateJournalVoucherRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Legs == null || request.Legs.Count < 2)
        {
            return BadRequest(new { error = "A double-entry voucher must have at least 2 legs (debit and credit)." });
        }

        var totalDebit = request.Legs.Sum(l => l.DebitAmount);
        var totalCredit = request.Legs.Sum(l => l.CreditAmount);

        if (Math.Abs(totalDebit - totalCredit) > 0.01m)
        {
            return BadRequest(new { error = "Total Debit and Total Credit must match in double-entry accounting." });
        }

        var count = await _context.JournalVouchers.CountAsync(cancellationToken) + 1;
        var voucherNumber = $"JV-{DateTime.UtcNow:yyyyMM}-{count:D4}";

        var voucher = new JournalVoucher
        {
            VoucherNumber = voucherNumber,
            VoucherDate = request.VoucherDate ?? DateTimeOffset.UtcNow,
            VoucherType = request.VoucherType ?? "Journal",
            ReferenceNumber = request.ReferenceNumber,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            Narration = request.Narration ?? "",
            CreatedByName = User.Identity?.Name ?? "Accountant"
        };

        foreach (var leg in request.Legs)
        {
            voucher.Legs.Add(new JournalVoucherLeg
            {
                AccountId = leg.AccountId,
                DebitAmount = leg.DebitAmount,
                CreditAmount = leg.CreditAmount,
                Narration = leg.Narration
            });

            // Update account current balance
            var account = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.Id == leg.AccountId, cancellationToken);
            if (account != null)
            {
                if (account.BalanceType == "Debit")
                {
                    account.CurrentBalance += (leg.DebitAmount - leg.CreditAmount);
                }
                else
                {
                    account.CurrentBalance += (leg.CreditAmount - leg.DebitAmount);
                }
            }
        }

        _context.JournalVouchers.Add(voucher);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new JournalVoucherDto(
            voucher.Id,
            voucher.VoucherNumber,
            voucher.VoucherDate,
            voucher.VoucherType,
            voucher.ReferenceNumber,
            voucher.TotalDebit,
            voucher.TotalCredit,
            voucher.Narration,
            voucher.CreatedByName,
            voucher.CreatedAtUtc,
            request.Legs
        ));
    }

    #endregion

    #region Trial Balance

    [HttpGet("trial-balance")]
    public async Task<ActionResult<IReadOnlyList<TrialBalanceRowDto>>> GetTrialBalance(CancellationToken cancellationToken = default)
    {
        var accounts = await _context.LedgerAccounts
            .Include(a => a.Group)
            .OrderBy(a => a.AccountCode)
            .ToListAsync(cancellationToken);

        var voucherLegs = await _context.JournalVoucherLegs
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.DebitAmount),
                TotalCredit = g.Sum(x => x.CreditAmount)
            })
            .ToListAsync(cancellationToken);

        var legMap = voucherLegs.ToDictionary(x => x.AccountId, x => x);

        var rows = accounts.Select(a =>
        {
            decimal openingDebit = a.BalanceType == "Debit" ? a.OpeningBalance : 0;
            decimal openingCredit = a.BalanceType == "Credit" ? a.OpeningBalance : 0;

            legMap.TryGetValue(a.Id, out var movements);
            decimal debitMovement = movements?.TotalDebit ?? 0;
            decimal creditMovement = movements?.TotalCredit ?? 0;

            decimal net = (openingDebit - openingCredit) + (debitMovement - creditMovement);
            decimal closingDebit = net >= 0 ? net : 0;
            decimal closingCredit = net < 0 ? Math.Abs(net) : 0;

            return new TrialBalanceRowDto(
                a.AccountCode,
                a.AccountName,
                a.Group?.Name ?? "",
                a.Category,
                openingDebit,
                openingCredit,
                debitMovement,
                creditMovement,
                closingDebit,
                closingCredit
            );
        }).ToList();

        return Ok(rows);
    }

    #endregion

    private static List<AccountGroup> GetDefaultAccountGroups(Guid tenantId)
    {
        return new List<AccountGroup>
        {
            new() { TenantId = tenantId, Code = "GRP-CA", Name = "Current Assets", Category = "Asset", Nature = "Debit" },
            new() { TenantId = tenantId, Code = "GRP-FA", Name = "Fixed Assets", Category = "Asset", Nature = "Debit" },
            new() { TenantId = tenantId, Code = "GRP-CL", Name = "Current Liabilities", Category = "Liability", Nature = "Credit" },
            new() { TenantId = tenantId, Code = "GRP-EQ", Name = "Equity & Capital", Category = "Equity", Nature = "Credit" },
            new() { TenantId = tenantId, Code = "GRP-REV", Name = "Direct Sales Revenue", Category = "Revenue", Nature = "Credit" },
            new() { TenantId = tenantId, Code = "GRP-COGS", Name = "Cost of Goods Sold", Category = "Expense", Nature = "Debit" },
            new() { TenantId = tenantId, Code = "GRP-EXP", Name = "Indirect Expenses", Category = "Expense", Nature = "Debit" },
            new() { TenantId = tenantId, Code = "GRP-TAX", Name = "Duties & Taxes", Category = "Liability", Nature = "Credit" },
        };
    }
}