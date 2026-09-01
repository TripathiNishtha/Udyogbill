namespace UdyogBill.Application.DTOs;

public record AccountGroupDto(
    Guid Id,
    string Code,
    string Name,
    string Category,
    string Nature,
    Guid? ParentGroupId,
    string? Description
);

public record LedgerAccountDto(
    Guid Id,
    string AccountCode,
    string AccountName,
    Guid GroupId,
    string GroupName,
    string Category,
    decimal OpeningBalance,
    string BalanceType,
    decimal CurrentBalance,
    bool IsSystemAccount,
    bool IsActive
);

public record CreateLedgerAccountRequest(
    string AccountCode,
    string AccountName,
    Guid GroupId,
    string Category,
    decimal OpeningBalance,
    string BalanceType
);

public record JournalVoucherLegDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal DebitAmount,
    decimal CreditAmount,
    string? Narration
);

public record JournalVoucherDto(
    Guid Id,
    string VoucherNumber,
    DateTimeOffset VoucherDate,
    string VoucherType,
    string? ReferenceNumber,
    decimal TotalDebit,
    decimal TotalCredit,
    string Narration,
    string? CreatedByName,
    DateTimeOffset CreatedAt,
    List<JournalVoucherLegDto> Legs
);

public record CreateJournalVoucherRequest(
    string VoucherType,
    DateTimeOffset? VoucherDate,
    string? ReferenceNumber,
    string Narration,
    List<JournalVoucherLegDto> Legs
);

public record TrialBalanceRowDto(
    string AccountCode,
    string AccountName,
    string GroupName,
    string Category,
    decimal OpeningDebit,
    decimal OpeningCredit,
    decimal DebitMovement,
    decimal CreditMovement,
    decimal ClosingDebit,
    decimal ClosingCredit
);