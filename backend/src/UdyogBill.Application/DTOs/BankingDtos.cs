using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Application.DTOs;

// --- Bank Account DTOs ---
public record CreateBankAccountRequest(
    string AccountName,
    string? BankName,
    string? AccountNumber,
    string? IfscCode,
    string? BranchName,
    string? UpiId,
    BankAccountType AccountType = BankAccountType.CurrentAccount,
    decimal OpeningBalance = 0,
    bool IsDefault = false
);

public record UpdateBankAccountRequest(
    string AccountName,
    string? BankName,
    string? AccountNumber,
    string? IfscCode,
    string? BranchName,
    string? UpiId,
    BankAccountType AccountType,
    bool IsDefault,
    bool IsActive
);

public record BankAccountDto(
    Guid Id,
    string AccountName,
    string? BankName,
    string? AccountNumber,
    string? IfscCode,
    string? BranchName,
    string? UpiId,
    BankAccountType AccountType,
    decimal OpeningBalance,
    decimal CurrentBalance,
    bool IsDefault,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

// --- Payment & Receipt Voucher DTOs ---
public record RecordPaymentReceiptRequest(
    Guid PartyId,
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    Guid? BankAccountId = null,
    string? ReferenceNumber = null,
    string? Notes = null
);

public record RecordVendorPaymentRequest(
    Guid PartyId,
    DateTime PaymentDate,
    decimal Amount,
    PaymentMode PaymentMode,
    Guid? BankAccountId = null,
    string? ReferenceNumber = null,
    string? Notes = null
);

public record PaymentReceiptVoucherDto(
    Guid VoucherId,
    string VoucherNumber,
    DateTime PaymentDate,
    Guid PartyId,
    string PartyName,
    string PartyCode,
    decimal Amount,
    PaymentMode PaymentMode,
    string? BankAccountName,
    string? ReferenceNumber,
    decimal PartyBalanceAfter
);

// --- Expense DTOs ---
public record CreateExpenseCategoryRequest(
    string Code,
    string Name,
    string? Description = null
);

public record ExpenseCategoryDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    bool IsActive
);

public record CreateExpenseVoucherRequest(
    DateTime ExpenseDate,
    Guid CategoryId,
    string PaidTo,
    decimal Amount,
    decimal TaxAmount = 0,
    PaymentMode PaymentMode = PaymentMode.BankTransfer,
    Guid? BankAccountId = null,
    string? ReferenceNumber = null,
    bool HasGstInvoice = false,
    string? VendorGstin = null,
    string? Notes = null
);

public record ExpenseVoucherDto(
    Guid Id,
    string VoucherNumber,
    DateTime ExpenseDate,
    Guid CategoryId,
    string CategoryName,
    string PaidTo,
    decimal Amount,
    decimal TaxAmount,
    decimal TotalAmount,
    PaymentMode PaymentMode,
    Guid? BankAccountId,
    string? BankAccountName,
    string? ReferenceNumber,
    bool HasGstInvoice,
    string? VendorGstin,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

// --- Cash Drawer DTOs ---
public record OpenCashDrawerRequest(
    decimal OpeningFloat,
    string? Notes = null
);

public record CloseCashDrawerRequest(
    decimal ActualClosingCash,
    string? ClosingNotes = null
);

public record CashDrawerSessionDto(
    Guid Id,
    Guid CashierUserId,
    string CashierEmail,
    DateTimeOffset OpenedAtUtc,
    DateTimeOffset? ClosedAtUtc,
    decimal OpeningFloat,
    decimal CashSalesTotal,
    decimal CashReceiptsTotal,
    decimal CashPayoutsTotal,
    decimal ExpectedClosingCash,
    decimal? ActualClosingCash,
    decimal? DifferenceAmount,
    CashDrawerStatus Status,
    string? ClosingNotes
);

// --- Cash Flow & Banking Summary DTOs ---
public record BankingCashFlowSummaryDto(
    decimal TotalBankBalance,
    decimal TotalCashInHand,
    decimal TotalLiquidFunds,
    decimal InflowThisMonth,
    decimal OutflowThisMonth,
    decimal ExpensesThisMonth,
    IReadOnlyList<BankAccountDto> Accounts
);

// --- Cheque / PDC Register DTOs ---
public record RecordChequeRequest(
    ChequeDirection Direction,
    Guid PartyId,
    string PartyName,
    string ChequeNumber,
    string BankName,
    string? BranchName,
    decimal Amount,
    DateTime ChequeDate,
    DateTime? ReceivedDate,
    Guid? BankAccountId = null,
    string? ReferenceDocumentType = null,
    Guid? ReferenceDocumentId = null,
    string? ReferenceDocumentNumber = null,
    string? Remarks = null
);

public record DepositChequeRequest(
    Guid BankAccountId,
    DateTime DepositDate,
    string? Remarks = null
);

public record ClearChequeRequest(
    DateTime ClearingDate,
    string? Remarks = null
);

public record BounceChequeRequest(
    DateTime BouncedDate,
    string BounceReason,
    decimal BounceCharges = 0m,
    bool BillChargesToParty = false,
    string? Remarks = null
);

public record ChequeRegisterDto(
    Guid Id,
    ChequeDirection Direction,
    ChequeStatus Status,
    Guid PartyId,
    string PartyName,
    string ChequeNumber,
    string BankName,
    string? BranchName,
    decimal Amount,
    DateTime ChequeDate,
    DateTime ReceivedDate,
    DateTime? DepositDate,
    DateTime? PresentationDate,
    DateTime? ClearingDate,
    DateTime? BouncedDate,
    Guid? BankAccountId,
    string? BankAccountName,
    string? ReferenceDocumentType,
    Guid? ReferenceDocumentId,
    string? ReferenceDocumentNumber,
    string? BounceReason,
    decimal BounceChargesAmount,
    bool IsBounceChargeBilledToParty,
    string? Remarks,
    DateTimeOffset CreatedAtUtc
);

