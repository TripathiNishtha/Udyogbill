using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Printing;

namespace UdyogBill.Application.DTOs;

public record PrintTemplateDto(
    Guid Id,
    PrintDocumentType DocumentType,
    string TemplateName,
    string TemplateCode,
    PageSizeFormat PageSize,
    bool IsDefault,
    string PrimaryColorHex,
    string SecondaryColorHex,
    string FontFamily,
    bool ShowLogo,
    string? LogoUrl,
    string HeaderTitle,
    string? HeaderSubtitle,
    bool ShowGstin,
    bool ShowDrugLicense,
    bool ShowFssai,
    bool ShowBankDetails,
    string? BankAccountName,
    string? BankAccountNumber,
    string? BankIfsc,
    string? BankName,
    bool ShowUpiQr,
    string? UpiId,
    bool ShowItemHsn,
    bool ShowBatchExpiry,
    bool ShowMrpStrikethrough,
    bool ShowSavingsCallout,
    bool ShowLoyaltyPoints,
    bool ShowCustomerBalance,
    bool ShowTerms,
    string? TermsAndConditions,
    bool ShowDeclaration,
    string? DeclarationText,
    string? FooterGreeting,
    string LanguageCode,
    string CustomLabelsJson,
    string? CustomCss,
    string? HtmlTemplateBody,
    bool IsActive
);

public class CreatePrintTemplateRequest
{
    public PrintDocumentType DocumentType { get; set; } = PrintDocumentType.TaxInvoice;
    public string TemplateName { get; set; } = string.Empty;
    public string TemplateCode { get; set; } = string.Empty;
    public PageSizeFormat PageSize { get; set; } = PageSizeFormat.A4_Portrait;
    public bool IsDefault { get; set; } = false;
    public string PrimaryColorHex { get; set; } = "#4f46e5";
    public string SecondaryColorHex { get; set; } = "#0f172a";
    public string FontFamily { get; set; } = "Inter, sans-serif";
    public bool ShowLogo { get; set; } = true;
    public string? LogoUrl { get; set; }
    public string HeaderTitle { get; set; } = "TAX INVOICE";
    public string? HeaderSubtitle { get; set; } = "Original for Recipient";
    public bool ShowGstin { get; set; } = true;
    public bool ShowDrugLicense { get; set; } = false;
    public bool ShowFssai { get; set; } = false;
    public bool ShowBankDetails { get; set; } = true;
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankName { get; set; }
    public bool ShowUpiQr { get; set; } = true;
    public string? UpiId { get; set; }
    public bool ShowItemHsn { get; set; } = true;
    public bool ShowBatchExpiry { get; set; } = false;
    public bool ShowMrpStrikethrough { get; set; } = true;
    public bool ShowSavingsCallout { get; set; } = true;
    public bool ShowLoyaltyPoints { get; set; } = true;
    public bool ShowCustomerBalance { get; set; } = true;
    public bool ShowTerms { get; set; } = true;
    public string? TermsAndConditions { get; set; }
    public bool ShowDeclaration { get; set; } = true;
    public string? DeclarationText { get; set; }
    public string? FooterGreeting { get; set; } = "Thank you for your business! Visit again.";
    public string LanguageCode { get; set; } = "en";
    public string CustomLabelsJson { get; set; } = "{}";
    public string? CustomCss { get; set; }
    public string? HtmlTemplateBody { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdatePrintTemplateRequest
{
    public string TemplateName { get; set; } = string.Empty;
    public PageSizeFormat PageSize { get; set; } = PageSizeFormat.A4_Portrait;
    public string PrimaryColorHex { get; set; } = "#4f46e5";
    public string SecondaryColorHex { get; set; } = "#0f172a";
    public string FontFamily { get; set; } = "Inter, sans-serif";
    public bool ShowLogo { get; set; } = true;
    public string? LogoUrl { get; set; }
    public string HeaderTitle { get; set; } = "TAX INVOICE";
    public string? HeaderSubtitle { get; set; }
    public bool ShowGstin { get; set; } = true;
    public bool ShowDrugLicense { get; set; } = false;
    public bool ShowFssai { get; set; } = false;
    public bool ShowBankDetails { get; set; } = true;
    public string? BankAccountName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankIfsc { get; set; }
    public string? BankName { get; set; }
    public bool ShowUpiQr { get; set; } = true;
    public string? UpiId { get; set; }
    public bool ShowItemHsn { get; set; } = true;
    public bool ShowBatchExpiry { get; set; } = false;
    public bool ShowMrpStrikethrough { get; set; } = true;
    public bool ShowSavingsCallout { get; set; } = true;
    public bool ShowLoyaltyPoints { get; set; } = true;
    public bool ShowCustomerBalance { get; set; } = true;
    public bool ShowTerms { get; set; } = true;
    public string? TermsAndConditions { get; set; }
    public bool ShowDeclaration { get; set; } = true;
    public string? DeclarationText { get; set; }
    public string? FooterGreeting { get; set; }
    public string LanguageCode { get; set; } = "en";
    public string CustomLabelsJson { get; set; } = "{}";
    public string? CustomCss { get; set; }
    public string? HtmlTemplateBody { get; set; }
    public bool IsActive { get; set; } = true;
}

public class RenderPrintPreviewRequest
{
    public Guid? TemplateId { get; set; }
    public Guid? InvoiceId { get; set; }
    public PrintDocumentType? DocumentType { get; set; }
    public string? CustomVariablesJson { get; set; }
}

public record RenderPrintPreviewResultDto(
    string TemplateName,
    PageSizeFormat PageSize,
    string RenderedHtml,
    string CustomCss
);
