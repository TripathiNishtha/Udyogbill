using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Accounting;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/accounting")]
public class AccountingController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;

    private record AccountMovement(decimal TotalDebit, decimal TotalCredit);

    public AccountingController(AppDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    #region Canonical 28-Group COA Engine

    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<AccountGroupDto>>> GetAccountGroups(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var groups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && !g.IsDeleted)
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

        return Ok(groups);
    }

    [HttpGet("groups/tree")]
    public async Task<ActionResult<IReadOnlyList<AccountGroupTreeNodeDto>>> GetAccountGroupsTree(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var allGroups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && !g.IsDeleted)
            .ToListAsync(cancellationToken);

        var allAccounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .Include(a => a.Group)
            .ToListAsync(cancellationToken);

        var legsSummary = await _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && !l.JournalVoucher.IsCancelled && !l.IsDeleted)
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.DebitAmount),
                TotalCredit = g.Sum(x => x.CreditAmount)
            })
            .ToDictionaryAsync(x => x.AccountId, x => x, cancellationToken);

        var accountDtos = allAccounts.Select(a =>
        {
            legsSummary.TryGetValue(a.Id, out var leg);
            decimal dr = leg?.TotalDebit ?? 0;
            decimal cr = leg?.TotalCredit ?? 0;

            decimal opDr = a.BalanceType == "Debit" ? a.OpeningBalance : 0;
            decimal opCr = a.BalanceType == "Credit" ? a.OpeningBalance : 0;
            decimal net = (opDr - opCr) + (dr - cr);
            decimal closing = Math.Abs(net);
            string closingType = net >= 0 ? "Debit" : "Credit";

            return new
            {
                Account = new LedgerAccountDto(
                    a.Id,
                    a.AccountCode,
                    a.AccountName,
                    a.GroupId,
                    a.Group?.Name ?? "",
                    a.Category,
                    a.OpeningBalance,
                    a.BalanceType,
                    closing,
                    a.IsSystemAccount,
                    a.IsActive,
                    a.Description,
                    a.IsBillWiseApplicable,
                    a.IsCostCentresApplicable,
                    a.DefaultTaxRate,
                    a.Gstin,
                    a.State,
                    a.PanNumber,
                    a.BankName,
                    a.BankAccountNumber,
                    a.BankIfscCode,
                    a.BankBranch
                ),
                Debit = dr,
                Credit = cr,
                Net = net
            };
        }).ToList();

        // Build Tree
        var rootGroups = allGroups.Where(g => g.ParentGroupId == null || g.ParentGroupId == Guid.Empty).ToList();
        var tree = new List<AccountGroupTreeNodeDto>();

        foreach (var root in rootGroups.OrderBy(g => g.Category).ThenBy(g => g.Name))
        {
            var node = BuildGroupTreeNode(root, allGroups, accountDtos);
            tree.Add(node);
        }

        return Ok(tree);
    }

    private static AccountGroupTreeNodeDto BuildGroupTreeNode(
        AccountGroup group,
        List<AccountGroup> allGroups,
        dynamic accountDtos)
    {
        var node = new AccountGroupTreeNodeDto
        {
            Id = group.Id,
            Code = group.Code,
            Name = group.Name,
            Category = group.Category,
            Nature = group.Nature,
            ParentGroupId = group.ParentGroupId,
            Description = group.Description
        };

        // Attach direct ledgers
        foreach (var item in accountDtos)
        {
            if (item.Account.GroupId == group.Id)
            {
                node.Ledgers.Add(item.Account);
                node.TotalDebit += (decimal)item.Debit;
                node.TotalCredit += (decimal)item.Credit;
                node.NetBalance += (decimal)item.Net;
            }
        }
        node.LedgerCount = node.Ledgers.Count;

        // Attach sub-groups
        var children = allGroups.Where(g => g.ParentGroupId == group.Id).OrderBy(g => g.Name).ToList();
        foreach (var child in children)
        {
            var childNode = BuildGroupTreeNode(child, allGroups, accountDtos);
            node.SubGroups.Add(childNode);
            node.LedgerCount += childNode.LedgerCount;
            node.TotalDebit += childNode.TotalDebit;
            node.TotalCredit += childNode.TotalCredit;
            node.NetBalance += childNode.NetBalance;
        }

        node.BalanceType = node.NetBalance >= 0 ? "Debit" : "Credit";
        node.NetBalance = Math.Abs(node.NetBalance);

        return node;
    }

    [HttpGet("groups/{id:guid}/summary")]
    public async Task<ActionResult<GroupSummaryReportDto>> GetGroupSummary(
        Guid id,
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var group = await _context.AccountGroups
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == id && !g.IsDeleted, cancellationToken);

        if (group == null)
            return NotFound(new { error = "Account group not found." });

        var subGroups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && g.ParentGroupId == id && !g.IsDeleted)
            .ToListAsync(cancellationToken);

        var directAccounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && a.GroupId == id && !a.IsDeleted)
            .ToListAsync(cancellationToken);

        var subGroupIds = subGroups.Select(s => s.Id).ToList();
        var subAccounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && subGroupIds.Contains(a.GroupId) && !a.IsDeleted)
            .ToListAsync(cancellationToken);

        var allAccountsInGroup = directAccounts.Concat(subAccounts).ToList();
        var allAccountIds = allAccountsInGroup.Select(a => a.Id).ToList();

        var legsQuery = _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && allAccountIds.Contains(l.AccountId) && !l.JournalVoucher.IsCancelled && !l.IsDeleted)
            .AsQueryable();

        if (fromDate.HasValue) legsQuery = legsQuery.Where(l => l.JournalVoucher.VoucherDate >= fromDate.Value);
        if (toDate.HasValue) legsQuery = legsQuery.Where(l => l.JournalVoucher.VoucherDate <= toDate.Value);

        var movements = await legsQuery
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.DebitAmount),
                TotalCredit = g.Sum(x => x.CreditAmount)
            })
            .ToDictionaryAsync(x => x.AccountId, x => x, cancellationToken);

        var items = new List<GroupSummaryItemDto>();
        decimal grandTotalDebit = 0;
        decimal grandTotalCredit = 0;
        decimal grandNetClosing = 0;

        // Add sub-groups as aggregated rows
        foreach (var sg in subGroups)
        {
            var sgAccounts = subAccounts.Where(a => a.GroupId == sg.Id).ToList();
            decimal sgOpDebit = sgAccounts.Where(a => a.BalanceType == "Debit").Sum(a => a.OpeningBalance);
            decimal sgOpCredit = sgAccounts.Where(a => a.BalanceType == "Credit").Sum(a => a.OpeningBalance);
            decimal sgDebit = 0;
            decimal sgCredit = 0;

            foreach (var acc in sgAccounts)
            {
                if (movements.TryGetValue(acc.Id, out var m))
                {
                    sgDebit += m.TotalDebit;
                    sgCredit += m.TotalCredit;
                }
            }

            decimal net = (sgOpDebit - sgOpCredit) + (sgDebit - sgCredit);
            items.Add(new GroupSummaryItemDto(
                sg.Id,
                sg.Code,
                sg.Name,
                "Group",
                sgAccounts.Count,
                sgOpDebit,
                sgOpCredit,
                sgDebit,
                sgCredit,
                net >= 0 ? net : 0,
                net < 0 ? Math.Abs(net) : 0
            ));

            grandTotalDebit += sgDebit;
            grandTotalCredit += sgCredit;
            grandNetClosing += net;
        }

        // Add direct ledgers
        foreach (var acc in directAccounts)
        {
            decimal opDebit = acc.BalanceType == "Debit" ? acc.OpeningBalance : 0;
            decimal opCredit = acc.BalanceType == "Credit" ? acc.OpeningBalance : 0;
            decimal dr = 0;
            decimal cr = 0;

            if (movements.TryGetValue(acc.Id, out var m))
            {
                dr = m.TotalDebit;
                cr = m.TotalCredit;
            }

            decimal net = (opDebit - opCredit) + (dr - cr);
            items.Add(new GroupSummaryItemDto(
                acc.Id,
                acc.AccountCode,
                acc.AccountName,
                "Ledger",
                0,
                opDebit,
                opCredit,
                dr,
                cr,
                net >= 0 ? net : 0,
                net < 0 ? Math.Abs(net) : 0
            ));

            grandTotalDebit += dr;
            grandTotalCredit += cr;
            grandNetClosing += net;
        }

        return Ok(new GroupSummaryReportDto(
            group.Id,
            group.Code,
            group.Name,
            group.Category,
            group.Nature,
            grandTotalDebit,
            grandTotalCredit,
            Math.Abs(grandNetClosing),
            grandNetClosing >= 0 ? "Debit" : "Credit",
            items
        ));
    }

    #endregion

    #region Ledger Accounts

    [HttpGet("accounts")]
    public async Task<ActionResult<IReadOnlyList<LedgerAccountDto>>> GetAccounts(
        [FromQuery] string? category = null,
        [FromQuery] Guid? groupId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var query = _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .Include(a => a.Group)
            .AsQueryable();

        if (!string.IsNullOrEmpty(category) && category != "All")
            query = query.Where(a => a.Category == category);

        if (groupId.HasValue && groupId.Value != Guid.Empty)
            query = query.Where(a => a.GroupId == groupId.Value);

        var accounts = await query
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
                a.IsActive,
                a.Description,
                a.IsBillWiseApplicable,
                a.IsCostCentresApplicable,
                a.DefaultTaxRate,
                a.Gstin,
                a.State,
                a.PanNumber,
                a.BankName,
                a.BankAccountNumber,
                a.BankIfscCode,
                a.BankBranch
            ))
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    [HttpPost("accounts")]
    public async Task<ActionResult<LedgerAccountDto>> CreateAccount(
        [FromBody] CreateLedgerAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var group = await _context.AccountGroups
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == request.GroupId && !g.IsDeleted, cancellationToken);

        var code = string.IsNullOrWhiteSpace(request.AccountCode)
            ? $"ACC-{Guid.NewGuid().ToString()[..6].ToUpper()}"
            : request.AccountCode.Trim().ToUpperInvariant();

        var exists = await _context.LedgerAccounts
            .AnyAsync(a => a.TenantId == tenantId && a.AccountCode == code && !a.IsDeleted, cancellationToken);

        if (exists)
        {
            code = $"{code}-{new Random().Next(10, 99)}";
        }

        var account = new LedgerAccount
        {
            TenantId = tenantId,
            AccountCode = code,
            AccountName = request.AccountName.Trim(),
            GroupId = request.GroupId,
            Category = request.Category ?? (group?.Category ?? "Asset"),
            OpeningBalance = request.OpeningBalance,
            BalanceType = request.BalanceType ?? (group?.Nature ?? "Debit"),
            CurrentBalance = request.OpeningBalance,
            IsSystemAccount = false,
            IsActive = true,
            Description = request.Description,
            IsBillWiseApplicable = request.IsBillWiseApplicable,
            IsCostCentresApplicable = request.IsCostCentresApplicable,
            DefaultTaxRate = request.DefaultTaxRate,
            Gstin = request.Gstin?.Trim().ToUpperInvariant(),
            State = request.State?.Trim(),
            PanNumber = request.PanNumber?.Trim().ToUpperInvariant(),
            BankName = request.BankName?.Trim(),
            BankAccountNumber = request.BankAccountNumber?.Trim(),
            BankIfscCode = request.BankIfscCode?.Trim().ToUpperInvariant(),
            BankBranch = request.BankBranch?.Trim()
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
            account.IsActive,
            account.Description,
            account.IsBillWiseApplicable,
            account.IsCostCentresApplicable,
            account.DefaultTaxRate,
            account.Gstin,
            account.State,
            account.PanNumber,
            account.BankName,
            account.BankAccountNumber,
            account.BankIfscCode,
            account.BankBranch
        ));
    }

    [HttpPut("accounts/{id:guid}")]
    public async Task<ActionResult<LedgerAccountDto>> UpdateAccount(
        Guid id,
        [FromBody] UpdateLedgerAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var account = await _context.LedgerAccounts
            .Include(a => a.Group)
            .FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == id && !a.IsDeleted, cancellationToken);

        if (account == null)
            return NotFound(new { error = "Ledger account not found." });

        var group = await _context.AccountGroups
            .FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Id == request.GroupId && !g.IsDeleted, cancellationToken);

        account.AccountName = request.AccountName.Trim();
        account.GroupId = request.GroupId;
        account.Category = request.Category ?? (group?.Category ?? account.Category);
        account.IsActive = request.IsActive;
        account.Description = request.Description;
        account.IsBillWiseApplicable = request.IsBillWiseApplicable;
        account.IsCostCentresApplicable = request.IsCostCentresApplicable;
        account.DefaultTaxRate = request.DefaultTaxRate;
        account.Gstin = request.Gstin?.Trim().ToUpperInvariant();
        account.State = request.State?.Trim();
        account.PanNumber = request.PanNumber?.Trim().ToUpperInvariant();
        account.BankName = request.BankName?.Trim();
        account.BankAccountNumber = request.BankAccountNumber?.Trim();
        account.BankIfscCode = request.BankIfscCode?.Trim().ToUpperInvariant();
        account.BankBranch = request.BankBranch?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new LedgerAccountDto(
            account.Id,
            account.AccountCode,
            account.AccountName,
            account.GroupId,
            group?.Name ?? account.Group?.Name ?? "",
            account.Category,
            account.OpeningBalance,
            account.BalanceType,
            account.CurrentBalance,
            account.IsSystemAccount,
            account.IsActive,
            account.Description,
            account.IsBillWiseApplicable,
            account.IsCostCentresApplicable,
            account.DefaultTaxRate,
            account.Gstin,
            account.State,
            account.PanNumber,
            account.BankName,
            account.BankAccountNumber,
            account.BankIfscCode,
            account.BankBranch
        ));
    }

    #endregion

    #region Journal Vouchers & Double Entry

    [HttpGet("vouchers")]
    public async Task<ActionResult<IReadOnlyList<JournalVoucherDto>>> GetVouchers(
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        [FromQuery] string? voucherType = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var query = _context.JournalVouchers
            .Where(v => v.TenantId == tenantId && !v.IsDeleted)
            .Include(v => v.Legs)
                .ThenInclude(l => l.Account)
            .AsQueryable();

        if (fromDate.HasValue) query = query.Where(v => v.VoucherDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(v => v.VoucherDate <= toDate.Value);
        if (!string.IsNullOrEmpty(voucherType) && voucherType != "All")
            query = query.Where(v => v.VoucherType == voucherType);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(v =>
                v.VoucherNumber.ToLower().Contains(s) ||
                (v.ReferenceNumber != null && v.ReferenceNumber.ToLower().Contains(s)) ||
                v.Narration.ToLower().Contains(s) ||
                v.Legs.Any(l => l.Account.AccountName.ToLower().Contains(s)));
        }

        var vouchers = await query
            .OrderByDescending(v => v.VoucherDate)
            .ThenByDescending(v => v.CreatedAtUtc)
            .Take(200)
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
                    l.Account != null ? l.Account.AccountCode : "",
                    l.Account != null ? l.Account.AccountName : "",
                    l.DebitAmount,
                    l.CreditAmount,
                    l.Narration,
                    l.BillRefType,
                    l.BillRefNumber,
                    l.CostCentreId
                )).ToList(),
                v.ReferenceDate,
                v.SourceDocumentType,
                v.SourceDocumentId,
                v.IsCancelled,
                v.CancelledAtUtc,
                v.CancelledByName,
                v.CancelledReason
            ))
            .ToListAsync(cancellationToken);

        return Ok(vouchers);
    }

    [HttpGet("vouchers/{id:guid}")]
    public async Task<ActionResult<JournalVoucherDto>> GetVoucherById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var v = await _context.JournalVouchers
            .Where(x => x.TenantId == tenantId && x.Id == id && !x.IsDeleted)
            .Include(x => x.Legs)
                .ThenInclude(l => l.Account)
            .FirstOrDefaultAsync(cancellationToken);

        if (v == null)
            return NotFound(new { error = "Voucher not found." });

        return Ok(new JournalVoucherDto(
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
                l.Account?.AccountCode ?? "",
                l.Account?.AccountName ?? "",
                l.DebitAmount,
                l.CreditAmount,
                l.Narration,
                l.BillRefType,
                l.BillRefNumber,
                l.CostCentreId
            )).ToList(),
            v.ReferenceDate,
            v.SourceDocumentType,
            v.SourceDocumentId,
            v.IsCancelled,
            v.CancelledAtUtc,
            v.CancelledByName,
            v.CancelledReason
        ));
    }

    [HttpGet("vouchers/by-reference/{refNumber}")]
    public async Task<ActionResult<JournalVoucherDto>> GetVoucherByReference(string refNumber, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var cleanRef = Uri.UnescapeDataString(refNumber).Trim();

        var v = await _context.JournalVouchers
            .Where(x => x.TenantId == tenantId && (x.ReferenceNumber == cleanRef || x.VoucherNumber == cleanRef) && !x.IsDeleted)
            .Include(x => x.Legs)
                .ThenInclude(l => l.Account)
            .OrderByDescending(x => x.VoucherDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (v == null)
            return NotFound(new { error = $"No voucher found for reference: {cleanRef}" });

        return Ok(new JournalVoucherDto(
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
                l.Account?.AccountCode ?? "",
                l.Account?.AccountName ?? "",
                l.DebitAmount,
                l.CreditAmount,
                l.Narration,
                l.BillRefType,
                l.BillRefNumber,
                l.CostCentreId
            )).ToList(),
            v.ReferenceDate,
            v.SourceDocumentType,
            v.SourceDocumentId,
            v.IsCancelled,
            v.CancelledAtUtc,
            v.CancelledByName,
            v.CancelledReason
        ));
    }

    [HttpPost("vouchers")]
    public async Task<ActionResult<JournalVoucherDto>> CreateVoucher([FromBody] CreateJournalVoucherRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Legs == null || request.Legs.Count < 2)
            return BadRequest(new { error = "A double-entry voucher must have at least 2 legs (debit and credit)." });

        var totalDebit = request.Legs.Sum(l => l.DebitAmount);
        var totalCredit = request.Legs.Sum(l => l.CreditAmount);

        if (Math.Abs(totalDebit - totalCredit) > 0.01m)
            return BadRequest(new { error = "Total Debit and Total Credit must match in double-entry accounting." });

        var tenantId = _tenantContext.TenantId;
        var voucherDate = request.VoucherDate ?? DateTimeOffset.UtcNow;

        // Check period lock
        var lockErr = await CheckPeriodLockAsync(tenantId, voucherDate, cancellationToken);
        if (lockErr != null) return BadRequest(new { error = lockErr });

        var voucherNumber = await GenerateVoucherNumberAsync(tenantId, request.VoucherType ?? "Journal", voucherDate, cancellationToken);

        var voucher = new JournalVoucher
        {
            TenantId = tenantId,
            VoucherNumber = voucherNumber,
            VoucherDate = voucherDate,
            VoucherType = request.VoucherType ?? "Journal",
            ReferenceNumber = request.ReferenceNumber,
            ReferenceDate = request.ReferenceDate,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            Narration = request.Narration ?? "",
            CreatedByName = User.Identity?.Name ?? "Accountant",
            SourceDocumentType = request.SourceDocumentType,
            SourceDocumentId = request.SourceDocumentId,
            IsCancelled = false
        };

        foreach (var leg in request.Legs)
        {
            voucher.Legs.Add(new JournalVoucherLeg
            {
                TenantId = tenantId,
                AccountId = leg.AccountId,
                DebitAmount = leg.DebitAmount,
                CreditAmount = leg.CreditAmount,
                Narration = leg.Narration,
                BillRefType = leg.BillRefType,
                BillRefNumber = leg.BillRefNumber,
                CostCentreId = leg.CostCentreId
            });

            // Update account current balance
            var account = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == leg.AccountId, cancellationToken);
            if (account != null)
            {
                if (account.BalanceType == "Debit")
                    account.CurrentBalance += (leg.DebitAmount - leg.CreditAmount);
                else
                    account.CurrentBalance += (leg.CreditAmount - leg.DebitAmount);
            }
        }

        _context.JournalVouchers.Add(voucher);

        // MCA Audit Trail Log
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var auditLog = new VoucherAuditLog
        {
            TenantId = tenantId,
            JournalVoucherId = voucher.Id,
            VoucherNumber = voucher.VoucherNumber,
            ActionType = "Created",
            PreviousSnapshotJson = null,
            NewSnapshotJson = System.Text.Json.JsonSerializer.Serialize(request),
            PerformedByName = User.Identity?.Name ?? "Accountant",
            ClientIpAddress = clientIp
        };
        _context.VoucherAuditLogs.Add(auditLog);

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
            request.Legs,
            voucher.ReferenceDate,
            voucher.SourceDocumentType,
            voucher.SourceDocumentId,
            false
        ));
    }

    [HttpPost("vouchers/{id:guid}/cancel")]
    public async Task<IActionResult> CancelVoucher(
        Guid id,
        [FromBody] CancelVoucherRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var voucher = await _context.JournalVouchers
            .Include(v => v.Legs)
            .FirstOrDefaultAsync(v => v.TenantId == tenantId && v.Id == id && !v.IsDeleted, cancellationToken);

        if (voucher == null)
            return NotFound(new { error = "Voucher not found." });

        if (voucher.IsCancelled)
            return BadRequest(new { error = "This voucher is already cancelled." });

        var lockErr = await CheckPeriodLockAsync(tenantId, voucher.VoucherDate, cancellationToken);
        if (lockErr != null) return BadRequest(new { error = lockErr });

        // Reverse legs from account CurrentBalance
        foreach (var leg in voucher.Legs)
        {
            var account = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.Id == leg.AccountId, cancellationToken);
            if (account != null)
            {
                if (account.BalanceType == "Debit")
                    account.CurrentBalance -= (leg.DebitAmount - leg.CreditAmount);
                else
                    account.CurrentBalance -= (leg.CreditAmount - leg.DebitAmount);
            }
        }

        voucher.IsCancelled = true;
        voucher.CancelledAtUtc = DateTimeOffset.UtcNow;
        voucher.CancelledByName = User.Identity?.Name ?? "Accountant";
        voucher.CancelledReason = request.Reason ?? "Cancelled by User";

        // MCA Audit Trail Log
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var auditLog = new VoucherAuditLog
        {
            TenantId = tenantId,
            JournalVoucherId = voucher.Id,
            VoucherNumber = voucher.VoucherNumber,
            ActionType = "Cancelled",
            PreviousSnapshotJson = System.Text.Json.JsonSerializer.Serialize(voucher),
            NewSnapshotJson = System.Text.Json.JsonSerializer.Serialize(new { Reason = voucher.CancelledReason }),
            PerformedByName = User.Identity?.Name ?? "Accountant",
            ClientIpAddress = clientIp
        };
        _context.VoucherAuditLogs.Add(auditLog);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Voucher {voucher.VoucherNumber} successfully cancelled." });
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<IReadOnlyList<VoucherAuditLogDto>>> GetVoucherAuditLogs(
        [FromQuery] Guid? voucherId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var query = _context.VoucherAuditLogs.Where(l => l.TenantId == tenantId).AsQueryable();

        if (voucherId.HasValue && voucherId.Value != Guid.Empty)
            query = query.Where(l => l.JournalVoucherId == voucherId.Value);

        var logs = await query
            .OrderByDescending(l => l.CreatedAtUtc)
            .Take(100)
            .Select(l => new VoucherAuditLogDto(
                l.Id,
                l.JournalVoucherId,
                l.VoucherNumber,
                l.ActionType,
                l.PreviousSnapshotJson,
                l.NewSnapshotJson,
                l.PerformedByName,
                l.ClientIpAddress,
                l.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }

    #endregion

    #region Period Lock

    [HttpGet("period-lock")]
    public async Task<ActionResult<PeriodLockDto>> GetPeriodLock(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var lockObj = await _context.AccountingPeriodLocks
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .OrderByDescending(p => p.LockDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (lockObj == null)
        {
            return Ok(new PeriodLockDto(
                DateTimeOffset.MinValue,
                false,
                "No active lock",
                null,
                null
            ));
        }

        return Ok(new PeriodLockDto(
            lockObj.LockDate,
            lockObj.IsLocked,
            lockObj.Reason,
            lockObj.LockedByName,
            lockObj.UpdatedAtUtc ?? lockObj.CreatedAtUtc
        ));
    }

    [HttpPost("period-lock")]
    public async Task<ActionResult<PeriodLockDto>> SetPeriodLock(
        [FromBody] SetPeriodLockRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var lockObj = await _context.AccountingPeriodLocks
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .FirstOrDefaultAsync(cancellationToken);

        if (lockObj == null)
        {
            lockObj = new AccountingPeriodLock
            {
                TenantId = tenantId,
                LockDate = request.LockDate,
                IsLocked = request.IsLocked,
                Reason = request.Reason ?? "Financial Books Closed",
                LockedByName = User.Identity?.Name ?? "Administrator"
            };
            _context.AccountingPeriodLocks.Add(lockObj);
        }
        else
        {
            lockObj.LockDate = request.LockDate;
            lockObj.IsLocked = request.IsLocked;
            lockObj.Reason = request.Reason ?? "Financial Books Closed";
            lockObj.LockedByName = User.Identity?.Name ?? "Administrator";
            lockObj.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new PeriodLockDto(
            lockObj.LockDate,
            lockObj.IsLocked,
            lockObj.Reason,
            lockObj.LockedByName,
            lockObj.UpdatedAtUtc
        ));
    }

    #endregion

    #region Ledger Statements & Monthly Summary

    [HttpGet("ledgers/{id:guid}/statement")]
    public async Task<ActionResult<LedgerStatementReportDto>> GetLedgerStatement(
        Guid id,
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var account = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && a.Id == id && !a.IsDeleted)
            .Include(a => a.Group)
            .FirstOrDefaultAsync(cancellationToken);

        if (account == null)
            return NotFound(new { error = "Ledger account not found." });

        var legsQuery = _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && l.AccountId == id && !l.JournalVoucher.IsCancelled && !l.IsDeleted)
            .Include(l => l.JournalVoucher)
            .AsQueryable();

        if (fromDate.HasValue) legsQuery = legsQuery.Where(l => l.JournalVoucher.VoucherDate >= fromDate.Value);
        if (toDate.HasValue) legsQuery = legsQuery.Where(l => l.JournalVoucher.VoucherDate <= toDate.Value);

        var voucherLegs = await legsQuery
            .OrderBy(l => l.JournalVoucher.VoucherDate)
            .ThenBy(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var lines = new List<LedgerStatementLineDto>();
        decimal runningBalance = account.OpeningBalance;
        string balanceType = account.BalanceType; // Debit or Credit
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        foreach (var leg in voucherLegs)
        {
            totalDebit += leg.DebitAmount;
            totalCredit += leg.CreditAmount;

            if (balanceType == "Debit")
                runningBalance += (leg.DebitAmount - leg.CreditAmount);
            else
                runningBalance += (leg.CreditAmount - leg.DebitAmount);

            var currentType = runningBalance >= 0 ? balanceType : (balanceType == "Debit" ? "Credit" : "Debit");

            lines.Add(new LedgerStatementLineDto(
                leg.JournalVoucherId,
                leg.JournalVoucher.VoucherNumber,
                leg.JournalVoucher.VoucherDate,
                leg.JournalVoucher.VoucherType,
                leg.JournalVoucher.ReferenceNumber,
                leg.Narration ?? leg.JournalVoucher.Narration,
                leg.DebitAmount,
                leg.CreditAmount,
                Math.Abs(runningBalance),
                currentType,
                leg.JournalVoucher.IsCancelled,
                leg.JournalVoucher.SourceDocumentType,
                leg.JournalVoucher.SourceDocumentId
            ));
        }

        var closingType = runningBalance >= 0 ? balanceType : (balanceType == "Debit" ? "Credit" : "Debit");

        return Ok(new LedgerStatementReportDto(
            account.Id,
            account.AccountCode,
            account.AccountName,
            account.Group?.Name ?? "",
            account.Category,
            account.OpeningBalance,
            account.BalanceType,
            totalDebit,
            totalCredit,
            Math.Abs(runningBalance),
            closingType,
            lines
        ));
    }

    [HttpGet("ledgers/{id:guid}/monthly-summary")]
    public async Task<ActionResult<LedgerMonthlySummaryDto>> GetLedgerMonthlySummary(
        Guid id,
        [FromQuery] int? financialYear = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var account = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && a.Id == id && !a.IsDeleted)
            .Include(a => a.Group)
            .FirstOrDefaultAsync(cancellationToken);

        if (account == null)
            return NotFound(new { error = "Ledger account not found." });

        int fyStartYear = financialYear ?? (DateTime.UtcNow.Month >= 4 ? DateTime.UtcNow.Year : DateTime.UtcNow.Year - 1);
        var fyStart = new DateTimeOffset(new DateTime(fyStartYear, 4, 1, 0, 0, 0, DateTimeKind.Utc));
        var fyEnd = new DateTimeOffset(new DateTime(fyStartYear + 1, 3, 31, 23, 59, 59, DateTimeKind.Utc));

        var legs = await _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && l.AccountId == id && !l.JournalVoucher.IsCancelled && !l.IsDeleted &&
                        l.JournalVoucher.VoucherDate >= fyStart && l.JournalVoucher.VoucherDate <= fyEnd)
            .Include(l => l.JournalVoucher)
            .ToListAsync(cancellationToken);

        var monthNames = new[] { "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March" };
        var monthCalendarNumbers = new[] { 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3 };

        decimal runningBalance = account.OpeningBalance;
        string balanceType = account.BalanceType;
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        var monthlyRows = new List<MonthlySummaryRowDto>();

        for (int i = 0; i < 12; i++)
        {
            int calMonth = monthCalendarNumbers[i];
            int calYear = calMonth >= 4 ? fyStartYear : fyStartYear + 1;

            var monthLegs = legs.Where(l => l.JournalVoucher.VoucherDate.Month == calMonth && l.JournalVoucher.VoucherDate.Year == calYear).ToList();
            decimal dr = monthLegs.Sum(l => l.DebitAmount);
            decimal cr = monthLegs.Sum(l => l.CreditAmount);
            int vCount = monthLegs.Select(l => l.JournalVoucherId).Distinct().Count();

            totalDebit += dr;
            totalCredit += cr;

            decimal netMonth = balanceType == "Debit" ? (dr - cr) : (cr - dr);
            runningBalance += netMonth;

            var currentType = runningBalance >= 0 ? balanceType : (balanceType == "Debit" ? "Credit" : "Debit");

            monthlyRows.Add(new MonthlySummaryRowDto(
                i + 1,
                monthNames[i],
                calYear,
                dr,
                cr,
                netMonth,
                Math.Abs(runningBalance),
                currentType,
                vCount
            ));
        }

        var closingType = runningBalance >= 0 ? balanceType : (balanceType == "Debit" ? "Credit" : "Debit");

        return Ok(new LedgerMonthlySummaryDto(
            account.Id,
            account.AccountCode,
            account.AccountName,
            account.Group?.Name ?? "",
            account.Category,
            account.OpeningBalance,
            account.BalanceType,
            totalDebit,
            totalCredit,
            Math.Abs(runningBalance),
            closingType,
            monthlyRows
        ));
    }

    #endregion

    #region Certified Reports (TB, Balance Sheet, P&L, Day Book, Cash/Bank Book)

    [HttpGet("trial-balance")]
    public async Task<ActionResult<IReadOnlyList<TrialBalanceRowDto>>> GetTrialBalance(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var accounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .Include(a => a.Group)
            .OrderBy(a => a.AccountCode)
            .ToListAsync(cancellationToken);

        var voucherLegs = await _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && !l.JournalVoucher.IsCancelled && !l.IsDeleted)
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
                a.Id,
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

    [HttpGet("reports/balance-sheet")]
    public async Task<ActionResult<FinancialBalanceSheetReportDto>> GetBalanceSheet(
        [FromQuery] DateTimeOffset? asOfDate = null,
        [FromQuery] string basis = "accrual",
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var cutoff = asOfDate ?? DateTimeOffset.UtcNow;

        var allGroups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && !g.IsDeleted)
            .ToListAsync(cancellationToken);

        var allAccounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .Include(a => a.Group)
            .ToListAsync(cancellationToken);

        var legsQuery = _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && !l.JournalVoucher.IsCancelled && !l.IsDeleted && l.JournalVoucher.VoucherDate <= cutoff)
            .AsQueryable();

        var legsSummary = await legsQuery
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Movement = new AccountMovement(g.Sum(x => x.DebitAmount), g.Sum(x => x.CreditAmount))
            })
            .ToDictionaryAsync(x => x.AccountId, x => x.Movement, cancellationToken);

        // Calculate P&L Net Profit to date
        decimal salesRevenue = 0;
        decimal directExpenses = 0;
        decimal indirectIncomes = 0;
        decimal indirectExpenses = 0;

        foreach (var acc in allAccounts)
        {
            legsSummary.TryGetValue(acc.Id, out var leg);
            decimal dr = leg?.TotalDebit ?? 0;
            decimal cr = leg?.TotalCredit ?? 0;

            if (acc.Category == "Revenue")
            {
                decimal netRev = (cr - dr);
                if (acc.Group?.Code == "GRP-SALES-ACCOUNTS" || acc.Group?.Code == "GRP-REV" || acc.Group?.Category == "Revenue")
                    salesRevenue += netRev;
                else
                    indirectIncomes += netRev;
            }
            else if (acc.Category == "Expense")
            {
                decimal netExp = (dr - cr);
                if (acc.Group?.Code == "GRP-PURCHASE-ACCOUNTS" || acc.Group?.Code == "GRP-DIRECT-EXPENSES" || acc.Group?.Code == "GRP-COGS")
                    directExpenses += netExp;
                else
                    indirectExpenses += netExp;
            }
        }

        decimal netProfit = (salesRevenue + indirectIncomes) - (directExpenses + indirectExpenses);

        // Build Liabilities Sections
        var liabilityGroups = allGroups.Where(g => (g.Category == "Liability" || g.Category == "Equity") && (g.ParentGroupId == null || g.ParentGroupId == Guid.Empty)).ToList();
        var liabilities = new List<FinancialBalanceSheetSectionDto>();
        decimal totalLiabilities = 0;

        foreach (var lg in liabilityGroups.OrderBy(g => g.Name))
        {
            var sec = BuildBalanceSheetSection(lg, allGroups, allAccounts, legsSummary);
            liabilities.Add(sec);
            totalLiabilities += sec.TotalAmount;
        }

        // Add Net Profit row under Capital / Liabilities
        if (Math.Abs(netProfit) > 0.01m)
        {
            var pnlSection = new FinancialBalanceSheetSectionDto
            {
                GroupId = Guid.Empty,
                GroupCode = "GRP-PNL-NET",
                GroupName = "Profit & Loss A/c (Current Period)",
                TotalAmount = netProfit
            };
            liabilities.Add(pnlSection);
            totalLiabilities += netProfit;
        }

        // Build Assets Sections
        var assetGroups = allGroups.Where(g => g.Category == "Asset" && (g.ParentGroupId == null || g.ParentGroupId == Guid.Empty)).ToList();
        var assets = new List<FinancialBalanceSheetSectionDto>();
        decimal totalAssets = 0;

        foreach (var ag in assetGroups.OrderBy(g => g.Name))
        {
            var sec = BuildBalanceSheetSection(ag, allGroups, allAccounts, legsSummary);
            assets.Add(sec);
            totalAssets += sec.TotalAmount;
        }

        decimal diff = totalAssets - totalLiabilities;
        bool isBalanced = Math.Abs(diff) < 0.05m;

        return Ok(new FinancialBalanceSheetReportDto(
            cutoff,
            basis,
            liabilities,
            assets,
            totalLiabilities,
            totalAssets,
            netProfit,
            diff,
            isBalanced
        ));
    }

    private static FinancialBalanceSheetSectionDto BuildBalanceSheetSection(
        AccountGroup group,
        List<AccountGroup> allGroups,
        List<LedgerAccount> allAccounts,
        Dictionary<Guid, AccountMovement> legsSummary)
    {
        var section = new FinancialBalanceSheetSectionDto
        {
            GroupId = group.Id,
            GroupCode = group.Code,
            GroupName = group.Name,
            TotalAmount = 0
        };

        // Ledgers under this group
        var directAccounts = allAccounts.Where(a => a.GroupId == group.Id && (a.Category == "Asset" || a.Category == "Liability" || a.Category == "Equity")).ToList();
        foreach (var a in directAccounts)
        {
            legsSummary.TryGetValue(a.Id, out var leg);
            decimal dr = leg?.TotalDebit ?? 0;
            decimal cr = leg?.TotalCredit ?? 0;
            decimal opDr = a.BalanceType == "Debit" ? a.OpeningBalance : 0;
            decimal opCr = a.BalanceType == "Credit" ? a.OpeningBalance : 0;

            decimal net = (opDr - opCr) + (dr - cr);
            decimal absAmt = Math.Abs(net);
            string balType = net >= 0 ? "Debit" : "Credit";

            section.Ledgers.Add(new BalanceSheetLedgerLineDto(
                a.Id,
                a.AccountCode,
                a.AccountName,
                absAmt,
                balType
            ));

            if (group.Category == "Asset")
                section.TotalAmount += net;
            else
                section.TotalAmount += (-net); // Liability/Equity credit balance is positive
        }

        // Subgroups
        var subGroups = allGroups.Where(g => g.ParentGroupId == group.Id).OrderBy(g => g.Name).ToList();
        foreach (var sg in subGroups)
        {
            var subSec = BuildBalanceSheetSection(sg, allGroups, allAccounts, legsSummary);
            section.SubGroups.Add(subSec);
            section.TotalAmount += subSec.TotalAmount;
        }

        return section;
    }

    [HttpGet("reports/profit-and-loss")]
    public async Task<ActionResult<FinancialProfitAndLossReportDto>> GetProfitAndLoss(
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        [FromQuery] string basis = "accrual",
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var start = fromDate ?? new DateTimeOffset(new DateTime(DateTime.UtcNow.Year, 4, 1, 0, 0, 0, DateTimeKind.Utc));
        var end = toDate ?? DateTimeOffset.UtcNow;

        var allAccounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted && (a.Category == "Revenue" || a.Category == "Expense"))
            .Include(a => a.Group)
            .ToListAsync(cancellationToken);

        var legs = await _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && !l.JournalVoucher.IsCancelled && !l.IsDeleted &&
                        l.JournalVoucher.VoucherDate >= start && l.JournalVoucher.VoucherDate <= end)
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.DebitAmount),
                TotalCredit = g.Sum(x => x.CreditAmount)
            })
            .ToDictionaryAsync(x => x.AccountId, x => x, cancellationToken);

        decimal salesRevenue = 0;
        decimal directPurchases = 0;
        decimal directExpenses = 0;
        decimal indirectIncomes = 0;
        decimal indirectExpenses = 0;

        var directExpGroups = new List<ProfitAndLossGroupDto>();
        var indirectIncGroups = new List<ProfitAndLossGroupDto>();
        var indirectExpGroups = new List<ProfitAndLossGroupDto>();

        var groupedAccounts = allAccounts.GroupBy(a => a.Group?.Name ?? "General");

        foreach (var grp in groupedAccounts)
        {
            var items = new List<ProfitAndLossItemDto>();
            decimal grpTotal = 0;

            foreach (var acc in grp)
            {
                legs.TryGetValue(acc.Id, out var leg);
                decimal dr = leg?.TotalDebit ?? 0;
                decimal cr = leg?.TotalCredit ?? 0;

                if (acc.Category == "Revenue")
                {
                    decimal net = cr - dr;
                    if (net != 0)
                    {
                        items.Add(new ProfitAndLossItemDto(acc.Id, acc.AccountCode, acc.AccountName, net));
                        grpTotal += net;

                        if (acc.Group?.Code == "GRP-SALES-ACCOUNTS" || acc.Group?.Code == "GRP-REV")
                            salesRevenue += net;
                        else
                            indirectIncomes += net;
                    }
                }
                else if (acc.Category == "Expense")
                {
                    decimal net = dr - cr;
                    if (net != 0)
                    {
                        items.Add(new ProfitAndLossItemDto(acc.Id, acc.AccountCode, acc.AccountName, net));
                        grpTotal += net;

                        if (acc.Group?.Code == "GRP-PURCHASE-ACCOUNTS")
                            directPurchases += net;
                        else if (acc.Group?.Code == "GRP-DIRECT-EXPENSES" || acc.Group?.Code == "GRP-COGS")
                            directExpenses += net;
                        else
                            indirectExpenses += net;
                    }
                }
            }

            if (items.Count > 0)
            {
                var firstAcc = grp.First();
                if (firstAcc.Category == "Expense")
                {
                    if (firstAcc.Group?.Code == "GRP-DIRECT-EXPENSES" || firstAcc.Group?.Code == "GRP-PURCHASE-ACCOUNTS")
                        directExpGroups.Add(new ProfitAndLossGroupDto(grp.Key, grpTotal, items));
                    else
                        indirectExpGroups.Add(new ProfitAndLossGroupDto(grp.Key, grpTotal, items));
                }
                else if (firstAcc.Category == "Revenue" && firstAcc.Group?.Code != "GRP-SALES-ACCOUNTS" && firstAcc.Group?.Code != "GRP-REV")
                {
                    indirectIncGroups.Add(new ProfitAndLossGroupDto(grp.Key, grpTotal, items));
                }
            }
        }

        decimal grossProfit = (salesRevenue) - (directPurchases + directExpenses);
        decimal netProfit = (grossProfit + indirectIncomes) - indirectExpenses;

        return Ok(new FinancialProfitAndLossReportDto(
            start,
            end,
            basis,
            salesRevenue,
            0, // Opening Stock placeholder
            directPurchases,
            directExpenses,
            0, // Closing Stock placeholder
            grossProfit >= 0 ? grossProfit : 0,
            grossProfit < 0 ? Math.Abs(grossProfit) : 0,
            indirectIncomes,
            indirectExpenses,
            netProfit >= 0 ? netProfit : 0,
            netProfit < 0 ? Math.Abs(netProfit) : 0,
            directExpGroups,
            indirectIncGroups,
            indirectExpGroups
        ));
    }

    [HttpGet("reports/daybook")]
    public async Task<ActionResult<DayBookReportDto>> GetDayBook(
        [FromQuery] DateTimeOffset? date = null,
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        [FromQuery] string? voucherType = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        DateTimeOffset start;
        DateTimeOffset end;

        if (date.HasValue)
        {
            start = new DateTimeOffset(date.Value.Date, TimeSpan.Zero);
            end = start.AddDays(1).AddTicks(-1);
        }
        else
        {
            start = fromDate ?? DateTimeOffset.UtcNow.Date;
            end = toDate ?? start.AddDays(1).AddTicks(-1);
        }

        var query = _context.JournalVouchers
            .Where(v => v.TenantId == tenantId && !v.IsDeleted && v.VoucherDate >= start && v.VoucherDate <= end)
            .Include(v => v.Legs)
                .ThenInclude(l => l.Account)
            .AsQueryable();

        if (!string.IsNullOrEmpty(voucherType) && voucherType != "All")
            query = query.Where(v => v.VoucherType == voucherType);

        var vouchers = await query
            .OrderBy(v => v.VoucherDate)
            .ThenBy(v => v.VoucherNumber)
            .ToListAsync(cancellationToken);

        var items = new List<DayBookItemDto>();
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        foreach (var v in vouchers)
        {
            totalDebit += v.TotalDebit;
            totalCredit += v.TotalCredit;

            var firstAcc = v.Legs.FirstOrDefault()?.Account?.AccountName ?? "Multiple";
            var secondAcc = v.Legs.Skip(1).FirstOrDefault()?.Account?.AccountName ?? "";
            var particulars = v.Legs.Count <= 2 && !string.IsNullOrEmpty(secondAcc)
                ? $"{firstAcc} / {secondAcc}"
                : $"{firstAcc} (+{v.Legs.Count - 1} more)";

            items.Add(new DayBookItemDto(
                v.Id,
                v.VoucherNumber,
                v.VoucherDate,
                v.VoucherType,
                v.ReferenceNumber,
                v.Narration,
                particulars,
                v.TotalDebit,
                v.TotalCredit,
                v.CreatedByName,
                v.IsCancelled
            ));
        }

        return Ok(new DayBookReportDto(
            start,
            end,
            vouchers.Count,
            totalDebit,
            totalCredit,
            items
        ));
    }

    [HttpGet("reports/cash-bank-book")]
    public async Task<ActionResult<CashBankBookReportDto>> GetCashBankBook(
        [FromQuery] DateTimeOffset? fromDate = null,
        [FromQuery] DateTimeOffset? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        var start = fromDate ?? DateTimeOffset.UtcNow.Date.AddDays(-30);
        var end = toDate ?? DateTimeOffset.UtcNow;

        var cashBankGroups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && !g.IsDeleted &&
                        (g.Code == "GRP-CASH-IN-HAND" || g.Code == "GRP-BANK-ACCOUNTS" ||
                         g.Name.ToLower().Contains("cash") || g.Name.ToLower().Contains("bank")))
            .Select(g => g.Id)
            .ToListAsync(cancellationToken);

        var accounts = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted &&
                        (cashBankGroups.Contains(a.GroupId) ||
                         a.AccountName.ToLower().Contains("cash") || a.AccountName.ToLower().Contains("bank") ||
                         a.AccountCode == "ACC-CASH" || a.AccountCode == "ACC-BANK"))
            .Include(a => a.Group)
            .ToListAsync(cancellationToken);

        var accountIds = accounts.Select(a => a.Id).ToList();

        var legs = await _context.JournalVoucherLegs
            .Where(l => l.TenantId == tenantId && !l.JournalVoucher.IsCancelled && !l.IsDeleted &&
                        accountIds.Contains(l.AccountId) &&
                        l.JournalVoucher.VoucherDate >= start && l.JournalVoucher.VoucherDate <= end)
            .ToListAsync(cancellationToken);

        var items = new List<CashBankBookItemDto>();
        decimal totalCash = 0;
        decimal totalBank = 0;

        foreach (var acc in accounts)
        {
            var accLegs = legs.Where(l => l.AccountId == acc.Id).ToList();
            decimal receipts = accLegs.Sum(l => l.DebitAmount);
            decimal payments = accLegs.Sum(l => l.CreditAmount);

            decimal opDr = acc.BalanceType == "Debit" ? acc.OpeningBalance : -acc.OpeningBalance;
            decimal closing = opDr + (receipts - payments);

            bool isCash = acc.AccountName.ToLower().Contains("cash") || (acc.Group != null && acc.Group.Code == "GRP-CASH-IN-HAND");
            if (isCash) totalCash += closing;
            else totalBank += closing;

            items.Add(new CashBankBookItemDto(
                acc.Id,
                acc.AccountCode,
                acc.AccountName,
                isCash ? "Cash" : "Bank",
                acc.OpeningBalance,
                acc.BalanceType,
                receipts,
                payments,
                Math.Abs(closing),
                closing >= 0 ? "Debit" : "Credit"
            ));
        }

        return Ok(new CashBankBookReportDto(
            start,
            end,
            totalCash,
            totalBank,
            totalCash + totalBank,
            items
        ));
    }

    #endregion

    #region Cost Centres

    [HttpGet("cost-centres")]
    public async Task<ActionResult<IReadOnlyList<CostCentreDto>>> GetCostCentres(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var list = await _context.CostCentres
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .OrderBy(c => c.Name)
            .Select(c => new CostCentreDto(
                c.Id,
                c.Code,
                c.Name,
                c.Category,
                c.ParentCostCentreId,
                c.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpPost("cost-centres")]
    public async Task<ActionResult<CostCentreDto>> CreateCostCentre(
        [FromBody] CreateCostCentreRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var entity = new CostCentre
        {
            TenantId = tenantId,
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Category = request.Category,
            ParentCostCentreId = request.ParentCostCentreId,
            IsActive = true
        };

        _context.CostCentres.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new CostCentreDto(
            entity.Id,
            entity.Code,
            entity.Name,
            entity.Category,
            entity.ParentCostCentreId,
            entity.IsActive
        ));
    }

    #endregion

    #region Historical Data Ledger Sync

    [HttpGet("sync-migrated-bills/preview")]
    [RequireAddon("ADDON_ACCOUNTING")]
    public async Task<ActionResult<MigratedBillsSyncPreviewDto>> GetMigratedBillsSyncPreview(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;

        var existingVoucherRefs = await _context.JournalVouchers
            .Where(v => v.TenantId == tenantId && !string.IsNullOrEmpty(v.ReferenceNumber) && !v.IsDeleted)
            .Select(v => v.ReferenceNumber!)
            .Distinct()
            .ToListAsync(cancellationToken);

        var existingRefSet = new HashSet<string>(existingVoucherRefs, StringComparer.OrdinalIgnoreCase);

        var salesInvoices = await _context.SalesInvoices
            .Where(s => s.TenantId == tenantId && !s.IsCancelled)
            .Select(s => new { s.InvoiceNumber, s.TotalAmount })
            .ToListAsync(cancellationToken);

        int unpostedSalesCount = 0;
        decimal unpostedSalesAmount = 0m;
        int alreadySyncedCount = 0;

        foreach (var inv in salesInvoices)
        {
            if (!existingRefSet.Contains(inv.InvoiceNumber))
            {
                unpostedSalesCount++;
                unpostedSalesAmount += inv.TotalAmount;
            }
            else
            {
                alreadySyncedCount++;
            }
        }

        var purchaseBills = await _context.PurchaseBills
            .Where(p => p.TenantId == tenantId && !p.IsCancelled)
            .Select(p => new { p.BillNumber, p.TotalAmount })
            .ToListAsync(cancellationToken);

        int unpostedPurchasesCount = 0;
        decimal unpostedPurchasesAmount = 0m;

        foreach (var bill in purchaseBills)
        {
            if (!existingRefSet.Contains(bill.BillNumber))
            {
                unpostedPurchasesCount++;
                unpostedPurchasesAmount += bill.TotalAmount;
            }
            else
            {
                alreadySyncedCount++;
            }
        }

        return Ok(new MigratedBillsSyncPreviewDto(
            unpostedSalesCount,
            unpostedSalesAmount,
            unpostedPurchasesCount,
            unpostedPurchasesAmount,
            alreadySyncedCount
        ));
    }

    [HttpPost("sync-migrated-bills")]
    [RequireAddon("ADDON_ACCOUNTING")]
    public async Task<ActionResult<SyncMigratedBillsResultDto>> SyncMigratedBills(
        [FromBody] SyncMigratedBillsRequest? request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        request ??= new SyncMigratedBillsRequest();

        await EnsureCanonicalGroupsAsync(tenantId, cancellationToken);

        // Standard accounts needed
        var arAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AR", "Accounts Receivable (Sundry Debtors)", "GRP-SUNDRY-DEBTORS", "Sundry Debtors", "Asset", "Debit", cancellationToken);
        var revAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SALES-REV", "Direct Sales Revenue", "GRP-SALES-ACCOUNTS", "Sales Accounts", "Revenue", "Credit", cancellationToken);
        var cgstOutAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-OUT", "Output CGST Payable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Liability", "Credit", cancellationToken);
        var sgstOutAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-OUT", "Output SGST/UTGST Payable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Liability", "Credit", cancellationToken);
        var igstOutAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-OUT", "Output IGST Payable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Liability", "Credit", cancellationToken);
        
        var apAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-AP", "Accounts Payable (Sundry Creditors)", "GRP-SUNDRY-CREDITORS", "Sundry Creditors", "Liability", "Credit", cancellationToken);
        var purchaseExpAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-PURCHASE-EXP", "Direct Purchase Expense / Inward Inventory", "GRP-PURCHASE-ACCOUNTS", "Purchase Accounts", "Expense", "Debit", cancellationToken);
        var cgstInAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CGST-IN", "Input CGST Receivable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Asset", "Debit", cancellationToken);
        var sgstInAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-SGST-IN", "Input SGST/UTGST Receivable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Asset", "Debit", cancellationToken);
        var igstInAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-IGST-IN", "Input IGST Receivable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Asset", "Debit", cancellationToken);
        var cessInAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CESS-IN", "Input GST Cess Receivable", "GRP-DUTIES-TAXES", "Duties & Taxes", "Asset", "Debit", cancellationToken);
        var roundOffAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-ROUNDOFF", "Invoice Round Off Differences", "GRP-INDIRECT-EXPENSES", "Indirect Expenses", "Expense", "Debit", cancellationToken);

        var cashAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-CASH", "Cash in Hand", "GRP-CASH-IN-HAND", "Cash-in-hand", "Asset", "Debit", cancellationToken);
        var bankAccount = await GetOrCreateLedgerAccountAsync(tenantId, "ACC-BANK", "Main Bank Account", "GRP-BANK-ACCOUNTS", "Bank Accounts", "Asset", "Debit", cancellationToken);

        var existingVouchers = await _context.JournalVouchers
            .Where(v => v.TenantId == tenantId && !v.IsDeleted)
            .Select(v => new { v.VoucherNumber, v.ReferenceNumber })
            .ToListAsync(cancellationToken);

        var existingRefSet = new HashSet<string>(
            existingVouchers.Where(v => !string.IsNullOrEmpty(v.ReferenceNumber)).Select(v => v.ReferenceNumber!),
            StringComparer.OrdinalIgnoreCase);

        int syncedSales = 0;
        decimal syncedSalesAmount = 0m;
        int syncedPurchases = 0;
        decimal syncedPurchasesAmount = 0m;
        int syncedPayments = 0;
        decimal syncedPaymentsAmount = 0m;

        using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (request.SyncSales)
            {
                var salesQuery = _context.SalesInvoices
                    .Include(s => s.Payments)
                    .Where(s => s.TenantId == tenantId && !s.IsCancelled)
                    .AsQueryable();

                if (request.FromDate.HasValue) salesQuery = salesQuery.Where(s => s.InvoiceDate >= request.FromDate.Value);
                if (request.ToDate.HasValue) salesQuery = salesQuery.Where(s => s.InvoiceDate <= request.ToDate.Value);

                var salesInvoices = await salesQuery.OrderBy(s => s.InvoiceDate).ToListAsync(cancellationToken);

                foreach (var invoice in salesInvoices)
                {
                    if (!existingRefSet.Contains(invoice.InvoiceNumber))
                    {
                        var voucher = new JournalVoucher
                        {
                            TenantId = tenantId,
                            VoucherNumber = $"SV-{invoice.InvoiceNumber}",
                            VoucherDate = invoice.InvoiceDate,
                            VoucherType = "Sales",
                            ReferenceNumber = invoice.InvoiceNumber,
                            ReferenceDate = invoice.InvoiceDate,
                            TotalDebit = invoice.TotalAmount,
                            TotalCredit = invoice.TotalAmount,
                            Narration = $"Sales Invoice #{invoice.InvoiceNumber} - Customer: {invoice.CustomerName}",
                            CreatedByName = "Auto Ledger Sync Engine",
                            SourceDocumentType = "SalesInvoice",
                            SourceDocumentId = invoice.Id
                        };

                        voucher.Legs.Add(new JournalVoucherLeg
                        {
                            TenantId = tenantId,
                            AccountId = arAccount.Id,
                            DebitAmount = invoice.TotalAmount,
                            CreditAmount = 0m,
                            Narration = $"Receivable from {invoice.CustomerName}",
                            BillRefType = "NewRef",
                            BillRefNumber = invoice.InvoiceNumber
                        });

                        if (invoice.TaxableAmount > 0)
                        {
                            voucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = revAccount.Id,
                                DebitAmount = 0m,
                                CreditAmount = invoice.TaxableAmount,
                                Narration = "Sales Revenue"
                            });
                        }

                        if (invoice.CgstAmount > 0)
                        {
                            voucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = cgstOutAccount.Id,
                                DebitAmount = 0m,
                                CreditAmount = invoice.CgstAmount,
                                Narration = "Output CGST"
                            });
                        }

                        if (invoice.SgstAmount > 0)
                        {
                            voucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = sgstOutAccount.Id,
                                DebitAmount = 0m,
                                CreditAmount = invoice.SgstAmount,
                                Narration = "Output SGST"
                            });
                        }

                        if (invoice.IgstAmount > 0)
                        {
                            voucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = igstOutAccount.Id,
                                DebitAmount = 0m,
                                CreditAmount = invoice.IgstAmount,
                                Narration = "Output IGST"
                            });
                        }

                        if (invoice.RoundOff != 0)
                        {
                            voucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = roundOffAccount.Id,
                                DebitAmount = invoice.RoundOff < 0 ? Math.Abs(invoice.RoundOff) : 0m,
                                CreditAmount = invoice.RoundOff > 0 ? invoice.RoundOff : 0m,
                                Narration = "Invoice Round Off"
                            });
                        }

                        _context.JournalVouchers.Add(voucher);
                        arAccount.CurrentBalance += invoice.TotalAmount;
                        revAccount.CurrentBalance += invoice.TaxableAmount;
                        cgstOutAccount.CurrentBalance += invoice.CgstAmount;
                        sgstOutAccount.CurrentBalance += invoice.SgstAmount;
                        igstOutAccount.CurrentBalance += invoice.IgstAmount;

                        existingRefSet.Add(invoice.InvoiceNumber);
                        syncedSales++;
                        syncedSalesAmount += invoice.TotalAmount;
                    }

                    // Process Payments
                    if (invoice.Payments != null && invoice.Payments.Any())
                    {
                        foreach (var payment in invoice.Payments)
                        {
                            var paymentRef = $"PAY-INV-{invoice.InvoiceNumber}-{payment.Id.ToString()[..8]}";
                            if (!existingRefSet.Contains(paymentRef))
                            {
                                var isBank = payment.PaymentMode != PaymentMode.Cash;
                                var targetAssetAccount = isBank ? bankAccount : cashAccount;

                                var pVoucher = new JournalVoucher
                                {
                                    TenantId = tenantId,
                                    VoucherNumber = $"RCP-{invoice.InvoiceNumber}-{payment.Id.ToString()[..6]}",
                                    VoucherDate = payment.PaymentDate,
                                    VoucherType = "Receipt",
                                    ReferenceNumber = paymentRef,
                                    ReferenceDate = payment.PaymentDate,
                                    TotalDebit = payment.Amount,
                                    TotalCredit = payment.Amount,
                                    Narration = $"Payment for Invoice #{invoice.InvoiceNumber} via {payment.PaymentMode} ({payment.TransactionReference ?? "Direct"})",
                                    CreatedByName = "Auto Ledger Sync Engine",
                                    SourceDocumentType = "PaymentReceipt",
                                    SourceDocumentId = payment.Id
                                };

                                pVoucher.Legs.Add(new JournalVoucherLeg
                                {
                                    TenantId = tenantId,
                                    AccountId = targetAssetAccount.Id,
                                    DebitAmount = payment.Amount,
                                    CreditAmount = 0m,
                                    Narration = $"Inward funds ({payment.PaymentMode})",
                                    BillRefType = "AgstRef",
                                    BillRefNumber = invoice.InvoiceNumber
                                });

                                pVoucher.Legs.Add(new JournalVoucherLeg
                                {
                                    TenantId = tenantId,
                                    AccountId = arAccount.Id,
                                    DebitAmount = 0m,
                                    CreditAmount = payment.Amount,
                                    Narration = $"Clearance for Invoice #{invoice.InvoiceNumber}",
                                    BillRefType = "AgstRef",
                                    BillRefNumber = invoice.InvoiceNumber
                                });

                                _context.JournalVouchers.Add(pVoucher);
                                targetAssetAccount.CurrentBalance += payment.Amount;
                                arAccount.CurrentBalance -= payment.Amount;

                                existingRefSet.Add(paymentRef);
                                syncedPayments++;
                                syncedPaymentsAmount += payment.Amount;
                            }
                        }
                    }
                }
            }

            // 2. Process Purchase Bills
            if (request.SyncPurchases)
            {
                var purchaseQuery = _context.PurchaseBills
                    .Include(p => p.Payments)
                    .Where(p => p.TenantId == tenantId && !p.IsCancelled)
                    .AsQueryable();

                if (request.FromDate.HasValue) purchaseQuery = purchaseQuery.Where(p => p.BillDate >= request.FromDate.Value);
                if (request.ToDate.HasValue) purchaseQuery = purchaseQuery.Where(p => p.BillDate <= request.ToDate.Value);

                var purchaseBills = await purchaseQuery.OrderBy(p => p.BillDate).ToListAsync(cancellationToken);

                foreach (var bill in purchaseBills)
                {
                    if (!existingRefSet.Contains(bill.BillNumber))
                    {
                        var bVoucher = new JournalVoucher
                        {
                            TenantId = tenantId,
                            VoucherNumber = $"PV-{bill.BillNumber}",
                            VoucherDate = bill.BillDate,
                            VoucherType = "Purchase",
                            ReferenceNumber = bill.BillNumber,
                            ReferenceDate = bill.BillDate,
                            TotalDebit = bill.TotalAmount,
                            TotalCredit = bill.TotalAmount,
                            Narration = $"Purchase Bill #{bill.BillNumber} - Supplier: {bill.SupplierName}",
                            CreatedByName = "Auto Ledger Sync Engine",
                            SourceDocumentType = "PurchaseBill",
                            SourceDocumentId = bill.Id
                        };

                        if (bill.TaxableAmount > 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = purchaseExpAccount.Id,
                                DebitAmount = bill.TaxableAmount,
                                CreditAmount = 0m,
                                Narration = "Inward inventory purchase"
                            });
                        }

                        if (bill.CgstAmount > 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = cgstInAccount.Id,
                                DebitAmount = bill.CgstAmount,
                                CreditAmount = 0m,
                                Narration = "Input CGST credit"
                            });
                        }

                        if (bill.SgstAmount > 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = sgstInAccount.Id,
                                DebitAmount = bill.SgstAmount,
                                CreditAmount = 0m,
                                Narration = "Input SGST credit"
                            });
                        }

                        if (bill.IgstAmount > 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = igstInAccount.Id,
                                DebitAmount = bill.IgstAmount,
                                CreditAmount = 0m,
                                Narration = "Input IGST credit"
                            });
                        }

                        if (bill.CessAmount > 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = cessInAccount.Id,
                                DebitAmount = bill.CessAmount,
                                CreditAmount = 0m,
                                Narration = "Input Cess credit"
                            });
                        }

                        if (bill.RoundOff != 0)
                        {
                            bVoucher.Legs.Add(new JournalVoucherLeg
                            {
                                TenantId = tenantId,
                                AccountId = roundOffAccount.Id,
                                DebitAmount = bill.RoundOff > 0 ? bill.RoundOff : 0m,
                                CreditAmount = bill.RoundOff < 0 ? Math.Abs(bill.RoundOff) : 0m,
                                Narration = "Bill Round Off"
                            });
                        }

                        bVoucher.Legs.Add(new JournalVoucherLeg
                        {
                            TenantId = tenantId,
                            AccountId = apAccount.Id,
                            DebitAmount = 0m,
                            CreditAmount = bill.TotalAmount,
                            Narration = $"Payable to {bill.SupplierName}",
                            BillRefType = "NewRef",
                            BillRefNumber = bill.BillNumber
                        });

                        _context.JournalVouchers.Add(bVoucher);
                        apAccount.CurrentBalance += bill.TotalAmount;
                        purchaseExpAccount.CurrentBalance += bill.TaxableAmount;
                        cgstInAccount.CurrentBalance += bill.CgstAmount;
                        sgstInAccount.CurrentBalance += bill.SgstAmount;
                        igstInAccount.CurrentBalance += bill.IgstAmount;
                        cessInAccount.CurrentBalance += bill.CessAmount;

                        existingRefSet.Add(bill.BillNumber);
                        syncedPurchases++;
                        syncedPurchasesAmount += bill.TotalAmount;
                    }

                    // Process Outward Supplier Payments
                    if (bill.Payments != null && bill.Payments.Any())
                    {
                        foreach (var payment in bill.Payments)
                        {
                            var paymentRef = $"PAY-BILL-{bill.BillNumber}-{payment.Id.ToString()[..8]}";
                            if (!existingRefSet.Contains(paymentRef))
                            {
                                var isBank = payment.PaymentMode != PaymentMode.Cash;
                                var targetAssetAccount = isBank ? bankAccount : cashAccount;

                                var pVoucher = new JournalVoucher
                                {
                                    TenantId = tenantId,
                                    VoucherNumber = $"PMT-{bill.BillNumber}-{payment.Id.ToString()[..6]}",
                                    VoucherDate = payment.PaymentDate,
                                    VoucherType = "Payment",
                                    ReferenceNumber = paymentRef,
                                    ReferenceDate = payment.PaymentDate,
                                    TotalDebit = payment.Amount,
                                    TotalCredit = payment.Amount,
                                    Narration = $"Payment for Bill #{bill.BillNumber} to {bill.SupplierName} via {payment.PaymentMode}",
                                    CreatedByName = "Auto Ledger Sync Engine",
                                    SourceDocumentType = "PaymentReceipt",
                                    SourceDocumentId = payment.Id
                                };

                                pVoucher.Legs.Add(new JournalVoucherLeg
                                {
                                    TenantId = tenantId,
                                    AccountId = apAccount.Id,
                                    DebitAmount = payment.Amount,
                                    CreditAmount = 0m,
                                    Narration = $"Debit settlement for Bill #{bill.BillNumber}",
                                    BillRefType = "AgstRef",
                                    BillRefNumber = bill.BillNumber
                                });

                                pVoucher.Legs.Add(new JournalVoucherLeg
                                {
                                    TenantId = tenantId,
                                    AccountId = targetAssetAccount.Id,
                                    DebitAmount = 0m,
                                    CreditAmount = payment.Amount,
                                    Narration = $"Outward funds ({payment.PaymentMode})",
                                    BillRefType = "AgstRef",
                                    BillRefNumber = bill.BillNumber
                                });

                                _context.JournalVouchers.Add(pVoucher);
                                apAccount.CurrentBalance -= payment.Amount;
                                targetAssetAccount.CurrentBalance -= payment.Amount;

                                existingRefSet.Add(paymentRef);
                                syncedPayments++;
                                syncedPaymentsAmount += payment.Amount;
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Ok(new SyncMigratedBillsResultDto(
                syncedSales,
                syncedSalesAmount,
                syncedPurchases,
                syncedPurchasesAmount,
                syncedPayments,
                syncedPaymentsAmount,
                $"Successfully synchronized {syncedSales} sales invoices (₹{syncedSalesAmount:N2}), {syncedPurchases} purchase bills (₹{syncedPurchasesAmount:N2}), and {syncedPayments} payments (₹{syncedPaymentsAmount:N2}) into General Ledger."
            ));
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            var detailedError = ex.InnerException != null ? $"{ex.Message} ({ex.InnerException.Message})" : ex.Message;
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = $"Historical ledger sync failed: {detailedError}" });
        }
    }

    #endregion

    #region Helper Methods & Canonical Hierarchy

    private async Task<string?> CheckPeriodLockAsync(Guid tenantId, DateTimeOffset voucherDate, CancellationToken cancellationToken)
    {
        var lockObj = await _context.AccountingPeriodLocks
            .Where(p => p.TenantId == tenantId && p.IsLocked && !p.IsDeleted)
            .OrderByDescending(p => p.LockDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (lockObj != null && voucherDate <= lockObj.LockDate)
        {
            return $"The financial accounting period on or prior to {lockObj.LockDate:dd-MMM-yyyy} is locked ({lockObj.Reason}). Modifications or voucher creation in this period are strictly disallowed.";
        }

        return null;
    }

    private async Task<string> GenerateVoucherNumberAsync(Guid tenantId, string voucherType, DateTimeOffset date, CancellationToken cancellationToken)
    {
        var prefix = voucherType.ToUpperInvariant() switch
        {
            "CONTRA" => "CTR",
            "PAYMENT" => "PMT",
            "RECEIPT" => "RCP",
            "JOURNAL" => "JV",
            "SALES" => "SV",
            "PURCHASE" => "PV",
            "CREDITNOTE" or "CREDIT_NOTE" => "CNV",
            "DEBITNOTE" or "DEBIT_NOTE" => "DNV",
            _ => "JV"
        };

        var ym = date.ToString("yyyyMM");
        var count = await _context.JournalVouchers
            .CountAsync(v => v.TenantId == tenantId && v.VoucherNumber.StartsWith($"{prefix}-{ym}"), cancellationToken) + 1;

        return $"{prefix}-{ym}-{count:D4}";
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
        var acc = await _context.LedgerAccounts.FirstOrDefaultAsync(a => a.TenantId == tenantId && a.AccountCode == accountCode && !a.IsDeleted, cancellationToken);
        if (acc != null) return acc;

        var grp = await _context.AccountGroups.FirstOrDefaultAsync(g => g.TenantId == tenantId && g.Code == groupCode && !g.IsDeleted, cancellationToken);
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

    private async Task EnsureCanonicalGroupsAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty) return;

        var existingGroups = await _context.AccountGroups
            .Where(g => g.TenantId == tenantId && !g.IsDeleted)
            .ToListAsync(cancellationToken);

        var groupMap = existingGroups.ToDictionary(g => g.Code, g => g, StringComparer.OrdinalIgnoreCase);

        // 1. Primary Groups (15)
        var primaryDefs = new (string Code, string Name, string Category, string Nature, string LegacyCode)[]
        {
            ("GRP-CAPITAL", "Capital Account", "Equity", "Credit", "GRP-EQ"),
            ("GRP-LOANS-LIAB", "Loans (Liability)", "Liability", "Credit", ""),
            ("GRP-CURR-LIAB", "Current Liabilities", "Liability", "Credit", "GRP-CL"),
            ("GRP-FIXED-ASSETS", "Fixed Assets", "Asset", "Debit", "GRP-FA"),
            ("GRP-INVESTMENTS", "Investments", "Asset", "Debit", ""),
            ("GRP-CURR-ASSETS", "Current Assets", "Asset", "Debit", "GRP-CA"),
            ("GRP-BRANCH-DIV", "Branch / Divisions", "Liability", "Credit", ""),
            ("GRP-MISC-EXP", "Misc. Expenses (ASSET)", "Asset", "Debit", ""),
            ("GRP-SUSPENSE", "Suspense A/c", "Liability", "Credit", ""),
            ("GRP-SALES-ACCOUNTS", "Sales Accounts", "Revenue", "Credit", "GRP-REV"),
            ("GRP-PURCHASE-ACCOUNTS", "Purchase Accounts", "Expense", "Debit", ""),
            ("GRP-DIRECT-INCOMES", "Direct Incomes", "Revenue", "Credit", ""),
            ("GRP-DIRECT-EXPENSES", "Direct Expenses", "Expense", "Debit", "GRP-COGS"),
            ("GRP-INDIRECT-INCOMES", "Indirect Incomes", "Revenue", "Credit", ""),
            ("GRP-INDIRECT-EXPENSES", "Indirect Expenses", "Expense", "Debit", "GRP-EXP")
        };

        bool changesMade = false;

        foreach (var def in primaryDefs)
        {
            AccountGroup? grp = null;
            if (groupMap.TryGetValue(def.Code, out grp))
            {
                // Already exists
            }
            else if (!string.IsNullOrEmpty(def.LegacyCode) && groupMap.TryGetValue(def.LegacyCode, out grp))
            {
                // Has legacy code: keep as primary alias
                grp.Name = def.Name;
                grp.Category = def.Category;
                grp.Nature = def.Nature;
                grp.ParentGroupId = null;
                changesMade = true;
                groupMap[def.Code] = grp; // map canonical code to it as well
            }
            else
            {
                grp = new AccountGroup
                {
                    TenantId = tenantId,
                    Code = def.Code,
                    Name = def.Name,
                    Category = def.Category,
                    Nature = def.Nature,
                    ParentGroupId = null
                };
                _context.AccountGroups.Add(grp);
                changesMade = true;
                groupMap[def.Code] = grp;
            }
        }

        if (changesMade)
        {
            await _context.SaveChangesAsync(cancellationToken);
            changesMade = false;
        }

        // 2. Secondary Sub-groups (13)
        var secondaryDefs = new (string Code, string Name, string Category, string Nature, string ParentCanonicalCode, string LegacyCode)[]
        {
            ("GRP-RESERVES-SURPLUS", "Reserves & Surplus", "Equity", "Credit", "GRP-CAPITAL", ""),
            ("GRP-BANK-OD", "Bank OD A/c", "Liability", "Credit", "GRP-LOANS-LIAB", ""),
            ("GRP-SECURED-LOANS", "Secured Loans", "Liability", "Credit", "GRP-LOANS-LIAB", ""),
            ("GRP-UNSECURED-LOANS", "Unsecured Loans", "Liability", "Credit", "GRP-LOANS-LIAB", ""),
            ("GRP-DUTIES-TAXES", "Duties & Taxes", "Liability", "Credit", "GRP-CURR-LIAB", "GRP-TAX"),
            ("GRP-PROVISIONS", "Provisions", "Liability", "Credit", "GRP-CURR-LIAB", ""),
            ("GRP-SUNDRY-CREDITORS", "Sundry Creditors", "Liability", "Credit", "GRP-CURR-LIAB", "GRP-SUNDRY-CREDITORS"),
            ("GRP-BANK-ACCOUNTS", "Bank Accounts", "Asset", "Debit", "GRP-CURR-ASSETS", ""),
            ("GRP-CASH-IN-HAND", "Cash-in-hand", "Asset", "Debit", "GRP-CURR-ASSETS", ""),
            ("GRP-DEPOSITS-ASSET", "Deposits (Asset)", "Asset", "Debit", "GRP-CURR-ASSETS", ""),
            ("GRP-LOANS-ADVANCES", "Loans & Advances (Asset)", "Asset", "Debit", "GRP-CURR-ASSETS", ""),
            ("GRP-STOCK-IN-HAND", "Stock-in-hand", "Asset", "Debit", "GRP-CURR-ASSETS", ""),
            ("GRP-SUNDRY-DEBTORS", "Sundry Debtors", "Asset", "Debit", "GRP-CURR-ASSETS", "GRP-SUNDRY-DEBTORS")
        };

        foreach (var def in secondaryDefs)
        {
            groupMap.TryGetValue(def.ParentCanonicalCode, out var parentGrp);
            Guid? parentId = parentGrp?.Id;

            AccountGroup? grp = null;
            if (groupMap.TryGetValue(def.Code, out grp))
            {
                if (grp.ParentGroupId != parentId && parentId.HasValue)
                {
                    grp.ParentGroupId = parentId;
                    changesMade = true;
                }
            }
            else if (!string.IsNullOrEmpty(def.LegacyCode) && groupMap.TryGetValue(def.LegacyCode, out grp))
            {
                grp.Name = def.Name;
                grp.Category = def.Category;
                grp.Nature = def.Nature;
                if (parentId.HasValue) grp.ParentGroupId = parentId;
                changesMade = true;
                groupMap[def.Code] = grp;
            }
            else
            {
                grp = new AccountGroup
                {
                    TenantId = tenantId,
                    Code = def.Code,
                    Name = def.Name,
                    Category = def.Category,
                    Nature = def.Nature,
                    ParentGroupId = parentId
                };
                _context.AccountGroups.Add(grp);
                changesMade = true;
                groupMap[def.Code] = grp;
            }
        }

        if (changesMade)
        {
            await _context.SaveChangesAsync(cancellationToken);
            changesMade = false;
        }

        // 3. Re-parent standard ledgers to canonical sub-groups
        var ledgers = await _context.LedgerAccounts
            .Where(a => a.TenantId == tenantId && !a.IsDeleted)
            .ToListAsync(cancellationToken);

        if (ledgers.Any())
        {
            groupMap.TryGetValue("GRP-CASH-IN-HAND", out var cashGrp);
            groupMap.TryGetValue("GRP-BANK-ACCOUNTS", out var bankGrp);
            groupMap.TryGetValue("GRP-SUNDRY-DEBTORS", out var debtorsGrp);
            groupMap.TryGetValue("GRP-SUNDRY-CREDITORS", out var creditorsGrp);
            groupMap.TryGetValue("GRP-DUTIES-TAXES", out var taxGrp);
            if (taxGrp == null) groupMap.TryGetValue("GRP-TAX", out taxGrp);

            foreach (var l in ledgers)
            {
                if (l.AccountCode == "ACC-CASH" && cashGrp != null && l.GroupId != cashGrp.Id)
                {
                    l.GroupId = cashGrp.Id;
                    changesMade = true;
                }
                else if (l.AccountCode == "ACC-BANK" && bankGrp != null && l.GroupId != bankGrp.Id)
                {
                    l.GroupId = bankGrp.Id;
                    changesMade = true;
                }
                else if (l.AccountCode == "ACC-AR" && debtorsGrp != null && l.GroupId != debtorsGrp.Id)
                {
                    l.GroupId = debtorsGrp.Id;
                    changesMade = true;
                }
                else if (l.AccountCode == "ACC-AP" && creditorsGrp != null && l.GroupId != creditorsGrp.Id)
                {
                    l.GroupId = creditorsGrp.Id;
                    changesMade = true;
                }
                else if ((l.AccountCode.StartsWith("ACC-CGST") || l.AccountCode.StartsWith("ACC-SGST") || l.AccountCode.StartsWith("ACC-IGST") || l.AccountCode.StartsWith("ACC-CESS")) && taxGrp != null && l.GroupId != taxGrp.Id)
                {
                    l.GroupId = taxGrp.Id;
                    changesMade = true;
                }
            }

            if (changesMade)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
    }

    #endregion
}
