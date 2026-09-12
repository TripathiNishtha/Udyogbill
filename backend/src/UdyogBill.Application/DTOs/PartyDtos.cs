using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Shared;

namespace UdyogBill.Application.DTOs;

public record CreatePartyAddressRequest(
    AddressType AddressType,
    string? Label,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string State,
    string StateCode,
    string Pincode,
    string Country = "India",
    string? ContactPerson = null,
    string? ContactPhone = null,
    bool IsDefault = true
);

public record PartyAddressDto(
    Guid Id,
    Guid PartyId,
    AddressType AddressType,
    string? Label,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string State,
    string StateCode,
    string Pincode,
    string Country,
    string? ContactPerson,
    string? ContactPhone,
    bool IsDefault
);

public record CreatePartyRequest(
    string Code,
    string LegalName,
    string? TradeName = null,
    string? ContactPersonName = null,
    PartyType PartyType = PartyType.Customer,
    CustomerType? CustomerType = CustomerType.B2B,
    SupplierType? SupplierType = null,
    string? Email = null,
    string? PrimaryPhone = null,
    string? Mobile = null,
    string? SecondaryPhone = null,
    string? Website = null,
    string? GSTIN = null,
    string? PAN = null,
    string? TAN = null,
    bool IsCompositionScheme = false,
    string? DrugLicenseNumber1 = null,
    string? DrugLicenseNumber2 = null,
    string? FSSAINumber = null,
    decimal CreditLimit = 0m,
    int CreditPeriodDays = 0,
    string? PriceTier = null,
    decimal OpeningBalance = 0m,
    BalanceType OpeningBalanceType = BalanceType.Debit,
    DateTime? OpeningBalanceDate = null,
    string? AttributesJson = "{}",
    CreatePartyAddressRequest? BillingAddress = null
);

public record UpdatePartyRequest(
    string LegalName,
    string? TradeName,
    string? ContactPersonName,
    CustomerType? CustomerType,
    SupplierType? SupplierType,
    string? Email,
    string? PrimaryPhone,
    string? Mobile,
    string? SecondaryPhone,
    string? Website,
    string? GSTIN,
    string? PAN,
    string? TAN,
    bool IsCompositionScheme,
    string? DrugLicenseNumber1,
    string? DrugLicenseNumber2,
    string? FSSAINumber,
    decimal CreditLimit,
    int CreditPeriodDays,
    bool IsCreditBlocked,
    string? PriceTier,
    string? AttributesJson,
    bool IsActive
);

public record PartyListDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string LegalName,
    string? TradeName,
    string? ContactPersonName,
    PartyType PartyType,
    CustomerType? CustomerType,
    SupplierType? SupplierType,
    string? Email,
    string? PrimaryPhone,
    string? Mobile,
    string? GSTIN,
    string? StateCode,
    decimal CreditLimit,
    int CreditPeriodDays,
    bool IsCreditBlocked,
    decimal CurrentOutstandingBalance,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

public record PartyDetailsDto(
    Guid Id,
    Guid TenantId,
    string Code,
    string LegalName,
    string? TradeName,
    string? ContactPersonName,
    PartyType PartyType,
    CustomerType? CustomerType,
    SupplierType? SupplierType,
    string? Email,
    string? PrimaryPhone,
    string? Mobile,
    string? SecondaryPhone,
    string? Website,
    string? GSTIN,
    string? StateCode,
    string? PAN,
    string? TAN,
    bool IsCompositionScheme,
    string? DrugLicenseNumber1,
    string? DrugLicenseNumber2,
    string? FSSAINumber,
    decimal CreditLimit,
    int CreditPeriodDays,
    bool IsCreditBlocked,
    string? PriceTier,
    decimal OpeningBalance,
    BalanceType OpeningBalanceType,
    DateTime? OpeningBalanceDate,
    decimal CurrentOutstandingBalance,
    string AttributesJson,
    bool IsActive,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<PartyAddressDto> Addresses,
    IReadOnlyList<PartyLedgerEntryDto> RecentLedgerEntries
);

public record PartyLedgerEntryDto(
    Guid Id,
    Guid PartyId,
    DateTime TransactionDate,
    PartyLedgerEntryType EntryType,
    string EntryTypeName,
    decimal DebitAmount,
    decimal CreditAmount,
    decimal RunningBalance,
    string? ReferenceDocumentType,
    Guid? ReferenceDocumentId,
    string? ReferenceDocumentNumber,
    string? PaymentMode,
    string? Description,
    DateTimeOffset CreatedAtUtc
);

public record PartyStatementDto(
    Guid PartyId,
    string PartyCode,
    string LegalName,
    string? TradeName,
    string? GSTIN,
    DateTime FromDate,
    DateTime ToDate,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    IReadOnlyList<PartyLedgerEntryDto> Entries
);

public enum PartyPaymentDirection
{
    Automatic = 0,
    CustomerReceipt = 1,
    VendorPayment = 2
}

public record RecordPartyPaymentRequest(
    Guid PartyId,
    DateTime TransactionDate,
    decimal Amount,
    string PaymentMode, // "Cash", "BankTransfer", "UPI", "Cheque"
    string? ReferenceNumber = null,
    string? Notes = null,
    PartyPaymentDirection Direction = PartyPaymentDirection.Automatic
);

// --- Broker & Commission Management DTOs ---
public record CreateBrokerRequest(
    string BrokerCode,
    string FullName,
    string? Mobile = null,
    string? Email = null,
    string? Address = null,
    string? PAN = null,
    string? GSTIN = null,
    CommissionBasis CommissionBasis = CommissionBasis.PercentageOfTaxable,
    decimal DefaultCommissionRate = 2.0m,
    decimal TdsPercent = 5.0m,
    CommissionAccrualTrigger AccrualTrigger = CommissionAccrualTrigger.OnInvoiceIssuance,
    string? Notes = null
);

public record UpdateBrokerRequest(
    string FullName,
    string? Mobile,
    string? Email,
    string? Address,
    string? PAN,
    string? GSTIN,
    CommissionBasis CommissionBasis,
    decimal DefaultCommissionRate,
    decimal TdsPercent,
    CommissionAccrualTrigger AccrualTrigger,
    bool IsActive,
    string? Notes
);

public record BrokerDto(
    Guid Id,
    string BrokerCode,
    string FullName,
    string? Mobile,
    string? Email,
    string? Address,
    string? PAN,
    string? GSTIN,
    CommissionBasis CommissionBasis,
    decimal DefaultCommissionRate,
    decimal TdsPercent,
    CommissionAccrualTrigger AccrualTrigger,
    decimal CurrentPayableBalance,
    bool IsActive,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record BrokerCommissionEntryDto(
    Guid Id,
    Guid BrokerId,
    string BrokerName,
    Guid? SalesInvoiceId,
    string? SalesInvoiceNumber,
    DateTime TransactionDate,
    Guid? PartyId,
    string? PartyName,
    decimal BaseAmount,
    decimal CommissionRate,
    decimal GrossCommissionAmount,
    decimal TdsAmount,
    decimal NetCommissionPayable,
    BrokerCommissionStatus Status,
    DateTime? PaidDate,
    string? PaymentReference,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);

public record PayBrokerCommissionRequest(
    Guid BrokerId,
    decimal Amount,
    string PaymentMode,
    Guid? BankAccountId = null,
    string? ReferenceNumber = null,
    string? Notes = null
);

public record BrokerSummaryDto(
    Guid BrokerId,
    string BrokerCode,
    string FullName,
    string? Mobile,
    decimal TotalAccrued,
    decimal TotalPaid,
    decimal CurrentPayableBalance,
    int TotalInvoicesBrokered
);


