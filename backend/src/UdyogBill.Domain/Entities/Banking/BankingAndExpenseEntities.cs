using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Domain.Entities.Banking;

public enum BankAccountType
{
    CurrentAccount = 1,
    SavingsAccount = 2,
    CashInHand = 3,
    CreditCard = 4,
    PaymentGateway = 5
}

public enum CashDrawerStatus
{
    Open = 1,
    Closed = 2,
    Discrepancy = 3
}

public class BankAccount : BaseTenantAuditableEntity
{
    public string AccountName { get; set; } = string.Empty; // e.g. "HDFC Current A/c", "Main Cash Register"
    public string? BankName { get; set; }                   // e.g. "HDFC Bank", "ICICI Bank"
    public string? AccountNumber { get; set; }
    public string? IfscCode { get; set; }
    public string? BranchName { get; set; }
    public string? UpiId { get; set; }
    public string? QrCodeImageUrl { get; set; }

    public BankAccountType AccountType { get; set; } = BankAccountType.CurrentAccount;

    public decimal OpeningBalance { get; set; } = 0m;
    public decimal CurrentBalance { get; set; } = 0m;

    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public ICollection<ExpenseVoucher> Expenses { get; set; } = new List<ExpenseVoucher>();
}

public class ExpenseCategory : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "RENT", "SALARIES", "ELECTRICITY", "LOGISTICS"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ExpenseVoucher> Expenses { get; set; } = new List<ExpenseVoucher>();
}

public class ExpenseVoucher : BaseTenantAuditableEntity
{
    public string VoucherNumber { get; set; } = string.Empty; // e.g. "EXP-2627-00001"
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow.Date;

    public Guid CategoryId { get; set; }
    public ExpenseCategory Category { get; set; } = null!;

    public string PaidTo { get; set; } = string.Empty; // Vendor / Landlord / Employee name

    public decimal Amount { get; set; } = 0m;          // Base Expense Amount
    public decimal TaxAmount { get; set; } = 0m;       // GST / Tax
    public decimal TotalAmount { get; set; } = 0m;     // Amount + TaxAmount

    public PaymentMode PaymentMode { get; set; } = PaymentMode.BankTransfer;

    public Guid? BankAccountId { get; set; }
    public BankAccount? BankAccount { get; set; }

    public string? ReferenceNumber { get; set; }       // Cheque / UTR / Bill reference
    public bool HasGstInvoice { get; set; } = false;
    public string? VendorGstin { get; set; }
    public string? Notes { get; set; }
}

public class CashDrawerSession : BaseTenantAuditableEntity
{
    public Guid CashierUserId { get; set; }
    public User CashierUser { get; set; } = null!;

    public DateTimeOffset OpenedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAtUtc { get; set; }

    public decimal OpeningFloat { get; set; } = 0m;
    public decimal CashSalesTotal { get; set; } = 0m;
    public decimal CashReceiptsTotal { get; set; } = 0m;
    public decimal CashPayoutsTotal { get; set; } = 0m;

    public decimal ExpectedClosingCash => OpeningFloat + CashSalesTotal + CashReceiptsTotal - CashPayoutsTotal;
    public decimal? ActualClosingCash { get; set; }
    public decimal? DifferenceAmount { get; set; }

    public CashDrawerStatus Status { get; set; } = CashDrawerStatus.Open;
    public string? ClosingNotes { get; set; }
}

public enum ChequeDirection
{
    Incoming = 1, // Received from Customer / Debtor
    Outgoing = 2  // Issued to Vendor / Creditor
}

public enum ChequeStatus
{
    ReceivedInHand = 1,
    Deposited = 2,
    Cleared = 3,
    Bounced = 4,
    RePresented = 5,
    Cancelled = 6,
    ReturnedToParty = 7
}

public class ChequeRegister : BaseTenantAuditableEntity
{
    public ChequeDirection Direction { get; set; } = ChequeDirection.Incoming;
    public ChequeStatus Status { get; set; } = ChequeStatus.ReceivedInHand;

    // Party Information
    public Guid PartyId { get; set; }
    public string PartyName { get; set; } = string.Empty;

    // Cheque Details
    public string ChequeNumber { get; set; } = string.Empty; // e.g. "000124"
    public string BankName { get; set; } = string.Empty;     // e.g. "HDFC Bank", "SBI"
    public string? BranchName { get; set; }
    public decimal Amount { get; set; } = 0m;

    // Dates
    public DateTime ChequeDate { get; set; }                  // Date on Cheque (PDC date)
    public DateTime ReceivedDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime? DepositDate { get; set; }
    public DateTime? PresentationDate { get; set; }
    public DateTime? ClearingDate { get; set; }
    public DateTime? BouncedDate { get; set; }

    // Bank Account in which cheque is deposited
    public Guid? BankAccountId { get; set; }
    public BankAccount? BankAccount { get; set; }

    // Document References
    public string? ReferenceDocumentType { get; set; }       // "SalesInvoice", "PurchaseBill", "PaymentReceipt"
    public Guid? ReferenceDocumentId { get; set; }
    public string? ReferenceDocumentNumber { get; set; }

    // Dishonour / Bounce Handling
    public string? BounceReason { get; set; }
    public decimal BounceChargesAmount { get; set; } = 0m;
    public bool IsBounceChargeBilledToParty { get; set; } = false;

    public string? Remarks { get; set; }
}

