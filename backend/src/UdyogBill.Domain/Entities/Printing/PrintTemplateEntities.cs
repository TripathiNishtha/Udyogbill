using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Printing;

public enum PrintDocumentType
{
    TaxInvoice = 1,
    POSReceipt = 2,
    Quotation = 3,
    DeliveryChallan = 4,
    PurchaseOrder = 5,
    PaymentReceipt = 6,
    BarcodeLabel = 7,
    D2CInvoice = 8,
    CreditNote = 9
}

public enum PageSizeFormat
{
    A4_Portrait = 1,
    A4_Landscape = 2,
    A5_Landscape = 3,
    Thermal_80mm = 4,
    Thermal_58mm = 5,
    Barcode_50x25mm = 6,
    Barcode_38x25mm = 7,
    Barcode_100x50mm = 8,
    A5_Portrait = 9,
    A5 = 10
}

public class PrintTemplate : BaseTenantAuditableEntity
{
    public PrintDocumentType DocumentType { get; set; } = PrintDocumentType.TaxInvoice;
    public string TemplateName { get; set; } = "A4 Modern GST Invoice";
    public string TemplateCode { get; set; } = "TPL_A4_MODERN";
    public PageSizeFormat PageSize { get; set; } = PageSizeFormat.A4_Portrait;
    public bool IsDefault { get; set; } = true;

    // Styling & Theme
    public string PrimaryColorHex { get; set; } = "#4f46e5"; // Indigo
    public string SecondaryColorHex { get; set; } = "#0f172a"; // Slate
    public string FontFamily { get; set; } = "Inter, sans-serif";

    // Header & Company Branding
    public bool ShowLogo { get; set; } = true;
    public string? LogoUrl { get; set; }
    public string HeaderTitle { get; set; } = "TAX INVOICE";
    public string? HeaderSubtitle { get; set; } = "Original for Recipient";
    public bool ShowGstin { get; set; } = true;
    public bool ShowDrugLicense { get; set; } = false;
    public bool ShowFssai { get; set; } = false;

    // Bank & Payment QR
    public bool ShowBankDetails { get; set; } = true;
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankName { get; set; }
    public bool ShowUpiQr { get; set; } = true;
    public string? UpiId { get; set; }

    // Line Items & Display Toggles
    public bool ShowItemHsn { get; set; } = true;
    public bool ShowBatchExpiry { get; set; } = false;
    public bool ShowMrpStrikethrough { get; set; } = true;
    public bool ShowSavingsCallout { get; set; } = true;
    public bool ShowLoyaltyPoints { get; set; } = true;
    public bool ShowCustomerBalance { get; set; } = true;

    // Footer, Terms & Declarations
    public bool ShowTerms { get; set; } = true;
    public string? TermsAndConditions { get; set; } = "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.";
    public bool ShowDeclaration { get; set; } = true;
    public string? DeclarationText { get; set; } = "We declare that this invoice shows the actual price of goods and particulars are true.";
    public string? FooterGreeting { get; set; } = "Thank you for your business! Visit again.";

    // Multi-Language & Labels
    public string LanguageCode { get; set; } = "en"; // "en", "hi", "mr", "gu"
    public string CustomLabelsJson { get; set; } = "{}"; // e.g. {"TaxInvoice":"कर इनवॉइस","Total":"कुल योग"}

    // Custom CSS & Template
    public string? CustomCss { get; set; }
    public string? HtmlTemplateBody { get; set; }

    public bool IsActive { get; set; } = true;
}
