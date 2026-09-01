using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Subscriptions;

public class PlatformCompanyProfile : BaseAuditableEntity
{
    public string LegalCompanyName { get; set; } = "Udyog Software Technologies Private Limited";
    public string ProductBrandName { get; set; } = "UdyogBill";
    public string Tagline { get; set; } = "Smart Cloud Invoicing & Business ERP";
    public string Gstin { get; set; } = "09AAACU9876A1Z5";
    public string Pan { get; set; } = "AAACU9876A";
    public string State { get; set; } = "Uttar Pradesh";
    public string StateCode { get; set; } = "09"; // 2-digit Indian GST state code
    public string AddressLine1 { get; set; } = "Tower B, Cyber City";
    public string AddressLine2 { get; set; } = "Sector 62";
    public string City { get; set; } = "Noida";
    public string Pincode { get; set; } = "201309";
    public string SupportEmail { get; set; } = "support@udyogbill.com";
    public string SupportPhone { get; set; } = "+91 98765 43210";
    public string Website { get; set; } = "https://udyogbill.com";

    // Bank Details for Invoicing
    public string BankName { get; set; } = "HDFC Bank";
    public string BankAccountNumber { get; set; } = "50200012345678";
    public string BankIfsc { get; set; } = "HDFC0001234";
    public string BankBranch { get; set; } = "Noida Sector 62 Branch";
    public string? UpiId { get; set; } = "udyogbill@hdfcbank";
    public string? UpiQrImageUrl { get; set; }

    // Branding & Signatures
    public string? LogoUrl { get; set; }
    public string? SignatoryImageUrl { get; set; }
    public string AuthorizedSignatoryName { get; set; } = "Authorized Signatory";
    public string AuthorizedSignatoryDesignation { get; set; } = "Finance Director";

    // Invoicing Defaults
    public string InvoicePrefix { get; set; } = "UB/SUB/26-27/";
    public string InvoiceTermsAndConditions { get; set; } = "1. This is a computer generated tax invoice for software subscription.\n2. SAC Code 998313 (Information Technology Software Services).\n3. Input tax credit is available subject to valid GSTIN.";
}

public class PlatformEmailConfig : BaseAuditableEntity
{
    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = "notifications@udyogbill.com";
    public string SmtpPassword { get; set; } = "";
    public string FromEmail { get; set; } = "billing@udyogbill.com";
    public string FromName { get; set; } = "UdyogBill Cloud Billing";
    public string? ReplyToEmail { get; set; } = "support@udyogbill.com";
    public bool EnableSsl { get; set; } = true;
    public bool IsActive { get; set; } = true;
}

public class PlatformPasswordResetOtp : BaseAuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; }
    public bool IsUsed { get; set; } = false;
}
