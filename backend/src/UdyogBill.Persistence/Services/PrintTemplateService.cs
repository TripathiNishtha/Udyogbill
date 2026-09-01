using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PrintTemplateService : IPrintTemplateService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public PrintTemplateService(
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

    public async Task<Result<IReadOnlyList<PrintTemplateDto>>> GetTemplatesAsync(PrintDocumentType? documentType = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted);

        if (documentType.HasValue)
        {
            query = query.Where(t => t.DocumentType == documentType.Value);
        }

        var list = await query
            .OrderByDescending(t => t.IsDefault)
            .ThenBy(t => t.TemplateName)
            .Select(t => MapToDto(t))
            .ToListAsync(cancellationToken);

        if (list.Count == 0)
        {
            await SeedDefaultTemplatesAsync(tenantId, cancellationToken);
            return await GetTemplatesAsync(documentType, cancellationToken);
        }

        // Automatically sanitize any existing template names to remove competitor names
        var entities = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted)
            .ToListAsync(cancellationToken);

        bool nameUpdated = false;
        foreach (var tpl in entities)
        {
            if (tpl.TemplateCode == "TPL_TALLY_B2B_A4" && tpl.TemplateName != "Classic Corporate B2B Tax Invoice (A4)")
            {
                tpl.TemplateName = "Classic Corporate B2B Tax Invoice (A4)";
                nameUpdated = true;
            }
            else if (tpl.TemplateCode == "TPL_MARG_PHARMA_A4" && tpl.TemplateName != "Pharma & FMCG Wholesale Invoice (A4)")
            {
                tpl.TemplateName = "Pharma & FMCG Wholesale Invoice (A4)";
                nameUpdated = true;
            }
            else if (tpl.TemplateCode == "TPL_MYBILLBOOK_MODERN_A4" && tpl.TemplateName != "Modern Retail & POS Cash Memo (A4)")
            {
                tpl.TemplateName = "Modern Retail & POS Cash Memo (A4)";
                nameUpdated = true;
            }
            else if (tpl.TemplateCode == "TPL_CBO_PCD_A4" && tpl.TemplateName != "PCD Franchise & Institutional Invoice (A4)")
            {
                tpl.TemplateName = "PCD Franchise & Institutional Invoice (A4)";
                nameUpdated = true;
            }
            else if (tpl.TemplateCode == "TPL_PHARMA_DEDICATED_A4" && tpl.TemplateName != "Standard Chemist & Pharma B2B Invoice (A4)")
            {
                tpl.TemplateName = "Standard Chemist & Pharma B2B Invoice (A4)";
                nameUpdated = true;
            }
        }
        if (nameUpdated)
        {
            await _context.SaveChangesAsync(cancellationToken);
            return await GetTemplatesAsync(documentType, cancellationToken);
        }

        bool needsSave = false;
        if (!list.Any(x => x.TemplateCode == "TPL_PHARMA_DEDICATED_A4"))
        {
            _context.PrintTemplates.Add(new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Standard Chemist & Pharma B2B Invoice (A4)",
                TemplateCode = "TPL_PHARMA_DEDICATED_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#34495e",
                SecondaryColorHex = "#5b9bd5",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "A.S.Y MED PHARMACEUTICALS PVT. LTD.",
                ShowDrugLicense = true,
                ShowBatchExpiry = true,
                ShowGstin = true,
                ShowUpiQr = true,
                UpiId = "saurabhthebest1@oksbi",
                BankName = "KOTAK MAHINDRA",
                BankAccountNumber = "5150394634",
                BankIfsc = "KKBK0000203",
                TermsAndConditions = "1. Goods Once Sold Will Not be taken back.\n2. Bills not paid due date will attract 24% intrest.\n3. All disputes are subject to Delhi jurisdiction only."
            });
            needsSave = true;
        }

        if (!list.Any(x => x.TemplateCode == "TPL_TALLY_B2B_A4"))
        {
            _context.PrintTemplates.Add(new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Classic Corporate B2B Tax Invoice (A4)",
                TemplateCode = "TPL_TALLY_B2B_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#0f172a",
                SecondaryColorHex = "#334155",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "(Corporate B2B Tax Invoice)",
                ShowGstin = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
            });
            needsSave = true;
        }

        if (!list.Any(x => x.TemplateCode == "TPL_MARG_PHARMA_A4"))
        {
            _context.PrintTemplates.Add(new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Pharma & FMCG Wholesale Invoice (A4)",
                TemplateCode = "TPL_MARG_PHARMA_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#1e3a8a",
                SecondaryColorHex = "#0284c7",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Pharma Distribution & Stockist Bill",
                ShowDrugLicense = true,
                ShowBatchExpiry = true,
                ShowGstin = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                TermsAndConditions = "1. Goods once sold will not be accepted back after 7 days.\n2. Storage: Store in a cool & dry place below 25°C.\n3. Subject to local jurisdiction only."
            });
            needsSave = true;
        }

        if (!list.Any(x => x.TemplateCode == "TPL_MYBILLBOOK_MODERN_A4"))
        {
            _context.PrintTemplates.Add(new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Modern Retail & POS Cash Memo (A4)",
                TemplateCode = "TPL_MYBILLBOOK_MODERN_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#4f46e5",
                SecondaryColorHex = "#06b6d4",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Retail Cash & Credit Memo",
                ShowGstin = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowSavingsCallout = true,
                FooterGreeting = "Thank you for shopping with us! Visit again."
            });
            needsSave = true;
        }

        if (!list.Any(x => x.TemplateCode == "TPL_CBO_PCD_A4"))
        {
            _context.PrintTemplates.Add(new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "PCD Franchise & Institutional Invoice (A4)",
                TemplateCode = "TPL_CBO_PCD_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#047857",
                SecondaryColorHex = "#0f766e",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "PCD Franchise Marketing & Institutional Division",
                ShowDrugLicense = true,
                ShowBatchExpiry = true,
                ShowGstin = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowDeclaration = true,
                DeclarationText = "Goods sold are meant for wholesale / institutional marketing under Drugs & Cosmetics Act."
            });
            needsSave = true;
        }

        if (needsSave)
        {
            await _context.SaveChangesAsync(cancellationToken);
            return await GetTemplatesAsync(documentType, cancellationToken);
        }

        return Result<IReadOnlyList<PrintTemplateDto>>.Success(list);
    }

    public async Task<Result<PrintTemplateDto>> GetTemplateByIdAsync(Guid templateId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var t = await _context.PrintTemplates
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == templateId && !t.IsDeleted, cancellationToken);

        if (t == null)
        {
            return Result<PrintTemplateDto>.Failure("Print template not found.", "NOT_FOUND");
        }

        return Result<PrintTemplateDto>.Success(MapToDto(t));
    }

    public async Task<Result<Guid>> CreateTemplateAsync(CreatePrintTemplateRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var template = new PrintTemplate
        {
            TenantId = tenantId,
            DocumentType = request.DocumentType,
            TemplateName = request.TemplateName.Trim(),
            TemplateCode = request.TemplateCode.Trim().ToUpperInvariant(),
            PageSize = request.PageSize,
            IsDefault = request.IsDefault,
            PrimaryColorHex = request.PrimaryColorHex,
            SecondaryColorHex = request.SecondaryColorHex,
            FontFamily = request.FontFamily,
            ShowLogo = request.ShowLogo,
            LogoUrl = request.LogoUrl,
            HeaderTitle = request.HeaderTitle.Trim(),
            HeaderSubtitle = request.HeaderSubtitle?.Trim(),
            ShowGstin = request.ShowGstin,
            ShowDrugLicense = request.ShowDrugLicense,
            ShowFssai = request.ShowFssai,
            ShowBankDetails = request.ShowBankDetails,
            BankAccountName = request.BankAccountName?.Trim(),
            BankAccountNumber = request.BankAccountNumber?.Trim(),
            BankIfsc = request.BankIfsc?.Trim().ToUpperInvariant(),
            BankName = request.BankName?.Trim(),
            ShowUpiQr = request.ShowUpiQr,
            UpiId = request.UpiId?.Trim(),
            ShowItemHsn = request.ShowItemHsn,
            ShowBatchExpiry = request.ShowBatchExpiry,
            ShowMrpStrikethrough = request.ShowMrpStrikethrough,
            ShowSavingsCallout = request.ShowSavingsCallout,
            ShowLoyaltyPoints = request.ShowLoyaltyPoints,
            ShowCustomerBalance = request.ShowCustomerBalance,
            ShowTerms = request.ShowTerms,
            TermsAndConditions = request.TermsAndConditions,
            ShowDeclaration = request.ShowDeclaration,
            DeclarationText = request.DeclarationText,
            FooterGreeting = request.FooterGreeting,
            LanguageCode = request.LanguageCode,
            CustomLabelsJson = request.CustomLabelsJson,
            CustomCss = request.CustomCss,
            HtmlTemplateBody = request.HtmlTemplateBody,
            IsActive = request.IsActive
        };

        if (template.IsDefault)
        {
            var existingDefaults = await _context.PrintTemplates
                .Where(t => t.TenantId == tenantId && t.DocumentType == template.DocumentType && t.IsDefault && !t.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var ed in existingDefaults)
            {
                ed.IsDefault = false;
            }
        }

        _context.PrintTemplates.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreatePrintTemplate",
            EntityName = "PrintTemplate",
            EntityId = template.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { template.TemplateName, template.TemplateCode, template.PageSize }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(template.Id);
    }

    public async Task<Result<PrintTemplateDto>> UpdateTemplateAsync(Guid templateId, UpdatePrintTemplateRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var t = await _context.PrintTemplates
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == templateId && !x.IsDeleted, cancellationToken);

        if (t == null)
        {
            return Result<PrintTemplateDto>.Failure("Print template not found.", "NOT_FOUND");
        }

        t.TemplateName = request.TemplateName.Trim();
        t.PageSize = request.PageSize;
        t.PrimaryColorHex = request.PrimaryColorHex;
        t.SecondaryColorHex = request.SecondaryColorHex;
        t.FontFamily = request.FontFamily;
        t.ShowLogo = request.ShowLogo;
        t.LogoUrl = request.LogoUrl;
        t.HeaderTitle = request.HeaderTitle.Trim();
        t.HeaderSubtitle = request.HeaderSubtitle?.Trim();
        t.ShowGstin = request.ShowGstin;
        t.ShowDrugLicense = request.ShowDrugLicense;
        t.ShowFssai = request.ShowFssai;
        t.ShowBankDetails = request.ShowBankDetails;
        t.BankAccountName = request.BankAccountName?.Trim();
        t.BankAccountNumber = request.BankAccountNumber?.Trim();
        t.BankIfsc = request.BankIfsc?.Trim().ToUpperInvariant();
        t.BankName = request.BankName?.Trim();
        t.ShowUpiQr = request.ShowUpiQr;
        t.UpiId = request.UpiId?.Trim();
        t.ShowItemHsn = request.ShowItemHsn;
        t.ShowBatchExpiry = request.ShowBatchExpiry;
        t.ShowMrpStrikethrough = request.ShowMrpStrikethrough;
        t.ShowSavingsCallout = request.ShowSavingsCallout;
        t.ShowLoyaltyPoints = request.ShowLoyaltyPoints;
        t.ShowCustomerBalance = request.ShowCustomerBalance;
        t.ShowTerms = request.ShowTerms;
        t.TermsAndConditions = request.TermsAndConditions;
        t.ShowDeclaration = request.ShowDeclaration;
        t.DeclarationText = request.DeclarationText;
        t.FooterGreeting = request.FooterGreeting;
        t.LanguageCode = request.LanguageCode;
        t.CustomLabelsJson = request.CustomLabelsJson;
        t.CustomCss = request.CustomCss;
        t.HtmlTemplateBody = request.HtmlTemplateBody;
        t.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<PrintTemplateDto>.Success(MapToDto(t));
    }

    public async Task<Result<bool>> SetDefaultTemplateAsync(Guid templateId, PrintDocumentType? documentType = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var target = await _context.PrintTemplates
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == templateId && !t.IsDeleted, cancellationToken);

        if (target == null)
        {
            return Result<bool>.Failure("Print template not found.", "NOT_FOUND");
        }

        var effectiveDocType = documentType ?? target.DocumentType;
        target.DocumentType = effectiveDocType;

        if (effectiveDocType == PrintDocumentType.POSReceipt)
        {
            target.HeaderTitle = "CASH MEMO";
            target.HeaderSubtitle = "Retail Cash & POS Sales Memo";
        }
        else if (effectiveDocType == PrintDocumentType.TaxInvoice)
        {
            target.HeaderTitle = "TAX INVOICE";
            target.HeaderSubtitle = "Original for Recipient";
        }

        var existingDefaults = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && t.DocumentType == effectiveDocType && t.IsDefault && !t.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var ed in existingDefaults)
        {
            ed.IsDefault = false;
        }

        target.IsDefault = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    public async Task<Result<RenderPrintPreviewResultDto>> RenderPreviewAsync(RenderPrintPreviewRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        PrintTemplate? template = null;

        if (request.TemplateId.HasValue)
        {
            template = await _context.PrintTemplates
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == request.TemplateId.Value && !t.IsDeleted, cancellationToken);
        }

        if (template == null)
        {
            var targetDocType = request.DocumentType ?? PrintDocumentType.TaxInvoice;
            template = await _context.PrintTemplates
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.DocumentType == targetDocType && t.IsDefault && !t.IsDeleted, cancellationToken);

            if (template == null)
            {
                template = await _context.PrintTemplates
                    .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.IsDefault && !t.IsDeleted, cancellationToken);
            }
        }

        if (template == null)
        {
            template = new PrintTemplate
            {
                TemplateName = "Default Modern GST Invoice",
                PageSize = PageSizeFormat.A4_Portrait
            };
        }

        SalesInvoice? invoice = null;
        if (request.InvoiceId.HasValue)
        {
            invoice = await _context.SalesInvoices
                .Include(i => i.Items)
                .Include(i => i.Party)
                .Include(i => i.Branch)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.InvoiceId.Value && !i.IsDeleted, cancellationToken);
        }

        var tenant = await _context.Tenants.FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken);
        var html = GenerateRenderedHtml(template, invoice, tenant);
        var css = template.CustomCss ?? GetDefaultCss(template);

        return Result<RenderPrintPreviewResultDto>.Success(new RenderPrintPreviewResultDto(
            template.TemplateName,
            template.PageSize,
            html,
            css
        ));
    }

    private static string GenerateRenderedHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var code = t.TemplateCode?.ToUpperInvariant() ?? "";
        if (code.Contains("THERMAL") || t.PageSize == PageSizeFormat.Thermal_80mm || t.PageSize == PageSizeFormat.Thermal_58mm)
        {
            return RenderThermalSlipHtml(t, invoice);
        }
        if (code.Contains("TALLY"))
        {
            return RenderTallyPrimeInvoiceHtml(t, invoice);
        }
        if (code.Contains("MARG"))
        {
            return RenderMargErpInvoiceHtml(t, invoice);
        }
        if (code.Contains("MYBILLBOOK") || code.Contains("VYAPAR"))
        {
            return RenderMyBillBookInvoiceHtml(t, invoice);
        }
        if (code.Contains("CBO") || code.Contains("PCD"))
        {
            return RenderCboErpInvoiceHtml(t, invoice);
        }
        if (code.Contains("DEDICATED") || code.Contains("PHARMA_DEDICATED") || code.Contains("PHARMA_PRO") || code.Contains("ASY_MED") || code.Contains("PHARMA_RX") || code.Contains("CHEMIST"))
        {
            return RenderDedicatedPharmaTaxInvoiceHtml(t, invoice);
        }
        if (code.Contains("B2B") || code.Contains("LOGISTICS"))
        {
            return RenderB2BLogisticsHtml(t, invoice, tenant);
        }
        if (code.Contains("A5") || code.Contains("COMPACT") || t.PageSize == PageSizeFormat.A5)
        {
            return RenderA5CompactHtml(t, invoice);
        }
        if (code.Contains("STOCKIST"))
        {
            return RenderPharmaStockistHtml(t, invoice);
        }

        return RenderModernGstHtml(t, invoice);
    }

    private static string RenderB2BLogisticsHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var companyName = !string.IsNullOrWhiteSpace(tenant?.TradeName) 
            ? tenant.TradeName 
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Udyog Software Technologies");
        var companyAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Industrial Area, Phase 2, Noida, Uttar Pradesh - 201305");
        var companyGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AAACU9876A1Z5");
        var companyState = !string.IsNullOrWhiteSpace(invoice?.Branch?.State) ? $"{invoice.Branch.State} ({invoice.Branch.StateCode ?? "09"})" : "Uttar Pradesh (09)";
        var companyDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "20B/UP-NOI-11029, 21B/UP-NOI-11030";

        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00451";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var custName = invoice?.CustomerName ?? "Apex Pharmaceuticals Distributors Pvt Ltd";
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "27AABCA1234F1Z5";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "Shop 4, Market Yard, Pune, Maharashtra - 411037";
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custStateCode = !string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : "27";

        var transporter = !string.IsNullOrWhiteSpace(invoice?.TransporterName) ? invoice.TransporterName : "V-Trans Multi-State Logistics";
        var vehicleNo = !string.IsNullOrWhiteSpace(invoice?.VehicleNumber) ? invoice.VehicleNumber : "MH-12-RN-9921";
        var lrNo = !string.IsNullOrWhiteSpace(invoice?.LrNumber) ? invoice.LrNumber : "LR-2026-88192";
        var lrDate = invoice?.LrDate?.ToString("dd/MM/yyyy") ?? invDate;
        var poNo = !string.IsNullOrWhiteSpace(invoice?.PoNumber) ? invoice.PoNumber : "PO-APEX-992";
        var poDate = invoice?.PoDate?.ToString("dd/MM/yyyy") ?? invDate;
        var eWayNo = !string.IsNullOrWhiteSpace(invoice?.EWayBillNumber) ? invoice.EWayBillNumber : "2410 8891 0029";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : "Maharashtra (27)";

        var totalAmount = invoice?.TotalAmount ?? 45600.00m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount / 1.18m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? (totalAmount - taxable);
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "ICICI Bank");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "920198273645");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "ICIC0001928");
        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "billing@icici");
        var upiQr = $"https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(companyName)}%26am%3D{totalAmount}%26cu%3DINR";

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; width:100%; max-width:800px; height:258mm; max-height:262mm; margin:0 auto; padding:8px 14px; border:1.5px solid #0f172a; box-sizing:border-box; background:#fff; color:#0f172a; font-size:10.5px; display:flex; flex-direction:column; justify-content:space-between; page-break-inside:avoid; break-inside:avoid;'>
    <!-- TOP HEADER -->
    <div>
        <div style='display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid {t.PrimaryColorHex}; padding-bottom:8px;'>
            <div>
                <h2 style='color:{t.PrimaryColorHex}; margin:0 0 2px 0; font-size:20px; font-weight:800;'>{companyName}</h2>
                <div style='font-size:10.5px; color:#475569;'>{companyAddress}</div>
                <div style='font-size:10.5px; font-weight:bold; margin-top:2px;'>GSTIN: {companyGstin} | State: {companyState}</div>
                {(t.ShowDrugLicense ? $"<div style='font-size:10px; color:#475569;'>DL No: {companyDl}</div>" : "")}
            </div>
            <div style='text-align:right;'>
                <div style='background:{t.PrimaryColorHex}; color:#fff; padding:3px 10px; font-weight:800; font-size:13px; border-radius:4px; display:inline-block;'>TAX INVOICE (B2B)</div>
                <div style='font-size:10.5px; color:#64748b; margin-top:3px;'>Original for Recipient</div>
                <div style='font-size:12px; font-weight:bold; margin-top:3px;'>Invoice No: <span style='color:{t.PrimaryColorHex};'>{invNo}</span></div>
                <div style='font-size:11px;'>Date: <strong>{invDate}</strong></div>
            </div>
        </div>

        <!-- 1. BUYER & CONSIGNEE DETAILS (MOVED TO TOP) -->
        <div style='display:flex; justify-content:space-between; margin-top:8px; gap:8px;'>
            <div style='flex:1; border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; background:#f8fafc;'>
                <div style='font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase;'>Details of Receiver | Billed To:</div>
                <div style='font-size:12px; font-weight:bold; color:{t.PrimaryColorHex}; margin:2px 0;'>{custName}</div>
                <div style='font-size:10.5px; color:#475569; line-height:1.2;'>{custAddress}</div>
                <div style='font-size:10.5px; font-weight:bold; margin-top:2px;'>GSTIN: {custGstin} | State Code: {custStateCode}</div>
            </div>
            <div style='flex:1; border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; background:#f8fafc;'>
                <div style='font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase;'>Details of Consignee | Shipped To:</div>
                <div style='font-size:12px; font-weight:bold; color:#0f172a; margin:2px 0;'>{custName}</div>
                <div style='font-size:10.5px; color:#475569; line-height:1.2;'>{shipAddress}</div>
                <div style='font-size:10.5px; color:#64748b; margin-top:2px;'>Place of Delivery: <strong>{placeOfSupply}</strong></div>
            </div>
        </div>

        <!-- 2. TRANSPORT & LOGISTICS GRID (MOVED BELOW BUYER DETAILS) -->
        <div style='margin-top:6px; background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; padding:6px 10px;'>
            <div style='font-weight:bold; font-size:10px; color:{t.PrimaryColorHex}; text-transform:uppercase; margin-bottom:3px;'>Transport & Logistics Details</div>
            <div style='display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; font-size:10px;'>
                <div><span style='color:#64748b;'>Transporter:</span><br/><strong>{transporter}</strong></div>
                <div><span style='color:#64748b;'>Vehicle No:</span><br/><strong>{vehicleNo}</strong></div>
                <div><span style='color:#64748b;'>LR (Bilty) No:</span><br/><strong>{lrNo}</strong> ({lrDate})</div>
                <div><span style='color:#64748b;'>E-Way Bill No:</span><br/><strong>{eWayNo}</strong></div>
                <div><span style='color:#64748b;'>Buyer PO Ref:</span><br/><strong>{poNo}</strong> ({poDate})</div>
                <div><span style='color:#64748b;'>Place of Supply:</span><br/><strong>{placeOfSupply}</strong></div>
                <div><span style='color:#64748b;'>Reverse Charge:</span><br/><strong>{(invoice?.IsReverseCharge == true ? "YES" : "NO")}</strong></div>
                <div><span style='color:#64748b;'>Terms of Delivery:</span><br/><strong>Door Delivery (Paid)</strong></div>
            </div>
        </div>
    </div>

    <!-- 3. ITEMS TABLE (FULL HEIGHT STRETCHED WITH CONTINUOUS COLUMN LINES) -->
    <div style='flex:1; display:flex; flex-direction:column; margin-top:4px; border:1px solid #cbd5e1;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:10.5px;'>
            <thead>
                <tr style='background:{t.PrimaryColorHex}15; color:{t.PrimaryColorHex}; border-bottom:1px solid #cbd5e1; height:26px;'>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:center; width:28px;'>#</th>
                    <th style='padding:5px 6px; border-right:1px solid #cbd5e1; text-align:left;'>Description of Goods</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:center; width:65px;'>HSN</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:center; width:90px;'>Batch/Exp</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:right; width:45px;'>Qty</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:right; width:60px;'>Rate (₹)</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:right; width:50px;'>Disc %</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:right; width:75px;'>Taxable (₹)</th>
                    <th style='padding:5px 4px; border-right:1px solid #cbd5e1; text-align:right; width:45px;'>GST</th>
                    <th style='padding:5px 6px; text-align:right; width:80px;'>Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                {RenderFullPageLineItemsRows(invoice)}
                <!-- Expanding Filler Row with Vertical Column Lines to fill full page height -->
                <tr style='height:100%; vertical-align:top;'>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td style='border-right:1px solid #cbd5e1;'>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- BOTTOM SUMMARY & TOTALS -->
    <div>
        <div style='display:flex; justify-content:space-between; margin-top:6px; gap:8px;'>
            <div style='flex:1.2;'>
                <div style='border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin-bottom:6px; background:#f8fafc;'>
                    <div style='font-size:9.5px; color:#64748b; text-transform:uppercase; font-weight:bold;'>Total Invoice Value In Words:</div>
                    <div style='font-size:11px; font-weight:bold; color:{t.PrimaryColorHex}; margin-top:1px;'>{words}</div>
                </div>
                <div style='display:flex; gap:10px; border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; align-items:center;'>
                    <img src='{upiQr}' alt='UPI QR' style='width:65px; height:65px; border:1px solid #cbd5e1; border-radius:4px;' />
                    <div style='font-size:9.5px;'>
                        <strong style='color:{t.PrimaryColorHex}; font-size:10.5px;'>Bank & Instant UPI Payment:</strong><br/>
                        Bank: {bankName} | A/C: {bankAcc}<br/>
                        IFSC: {bankIfsc} | UPI: {upiId}<br/>
                        <span style='color:#059669; font-weight:bold;'>Scan to Pay exact bill amount</span>
                    </div>
                </div>
            </div>
            <div style='flex:0.8; border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; background:#f8fafc;'>
                <table style='width:100%; border-collapse:collapse; font-size:10.5px;'>
                    <tr><td style='padding:2px 0;'>Taxable Amount:</td><td style='text-align:right; font-weight:bold;'>₹{taxable:N2}</td></tr>
                    {(cgst > 0 ? $"<tr><td style='padding:2px 0;'>CGST:</td><td style='text-align:right;'>₹{cgst:N2}</td></tr>" : "")}
                    {(sgst > 0 ? $"<tr><td style='padding:2px 0;'>SGST:</td><td style='text-align:right;'>₹{sgst:N2}</td></tr>" : "")}
                    {(igst > 0 && cgst == 0 ? $"<tr><td style='padding:2px 0;'>IGST (18%):</td><td style='text-align:right;'>₹{igst:N2}</td></tr>" : "")}
                    <tr><td style='padding:2px 0;'>Round Off:</td><td style='text-align:right;'>₹{roundOff:N2}</td></tr>
                    <tr style='border-top:1.5px solid {t.PrimaryColorHex}; font-size:13px; font-weight:bold; color:{t.PrimaryColorHex};'>
                        <td style='padding:4px 0;'>Grand Total:</td>
                        <td style='text-align:right;'>₹{totalAmount:N2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- FOOTER & SIGNATORY -->
        <div style='display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; border-top:1px solid #cbd5e1; padding-top:6px; font-size:9.5px;'>
            <div style='max-width:60%; color:#64748b;'>
                <strong>Terms & Conditions:</strong><br/>
                1. Goods once dispatched/sold will not be accepted back without prior written approval.<br/>
                2. Payment due strictly within 15 days. Interest @ 18% p.a. will be levied on overdue bills.
            </div>
            <div style='text-align:right;'>
                <div>For <strong>{companyName}</strong></div>
                <div style='height:30px;'></div>
                <div style='border-top:1px solid #94a3b8; display:inline-block; padding-top:2px; font-weight:bold;'>Authorised Signatory</div>
            </div>
        </div>
    </div>
</div>";
    }

    private static string RenderFullPageLineItemsRows(SalesInvoice? invoice)
    {
        if (invoice?.Items != null && invoice.Items.Any())
        {
            var sb = new StringBuilder();
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var batchExp = !string.IsNullOrWhiteSpace(it.BatchNumber) 
                    ? $"{it.BatchNumber} {(it.ExpiryDate.HasValue ? "(" + it.ExpiryDate.Value.ToString("MM/yy") + ")" : "")}".Trim()
                    : "-";

                sb.Append($@"
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>{idx++}</td>
    <td style='padding:4px 6px; border-right:1px solid #cbd5e1;'><strong>{it.ItemName}</strong></td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>{it.HsnCode ?? "3004"}</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>{batchExp}</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>{it.Quantity:N0}</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹{it.UnitPrice:N2}</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>{it.DiscountPercent:N0}%</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹{it.TaxableAmount:N2}</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>{it.GstRate:N0}%</td>
    <td style='padding:4px 6px; text-align:right; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
</tr>");
            }
            return sb.ToString();
        }

        return @"
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>1</td>
    <td style='padding:4px 6px; border-right:1px solid #cbd5e1;'><strong>Azithromycin 500mg Tablets</strong><br/><span style='font-size:9px; color:#64748b;'>10 Tabs Strip</span></td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>30049099</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>AZ-991 (12/28)</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>100</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹120.00</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>5%</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹11,400.00</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:4px 6px; text-align:right; font-weight:bold;'>₹12,768.00</td>
</tr>
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>2</td>
    <td style='padding:4px 6px; border-right:1px solid #cbd5e1;'><strong>Paracetamol 650mg Dolo</strong><br/><span style='font-size:9px; color:#64748b;'>15 Tabs Strip</span></td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>30049099</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>DL-442 (08/27)</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>200</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹30.00</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>0%</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>₹6,000.00</td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:4px 6px; text-align:right; font-weight:bold;'>₹6,720.00</td>
</tr>";
    }

    private static string RenderThermalSlipHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        var invNo = invoice?.InvoiceNumber ?? "POS-2627-0081";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yy HH:mm") ?? DateTime.Now.ToString("dd/MM/yy HH:mm");
        var total = invoice?.TotalAmount ?? 680.00m;
        var subTotal = invoice?.SubTotal ?? 610.00m;
        var tax = total - subTotal;
        var savings = 145.00m;
        var upiQr = $"https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=upi%3A%2F%2Fpay%3Fpa%3D{t.UpiId ?? "cashier@upi"}%26am%3D{total}%26cu%3DINR";

        return $@"
<div class='thermal-slip' style='font-family:monospace; width:280px; margin:0 auto; padding:8px; font-size:11px; line-height:1.3; color:#000;'>
    <div style='text-align:center;'>
        <strong style='font-size:15px;'>CITY PHARMA RETAIL</strong><br/>
        Plot 12, Station Road, Andheri West<br/>
        GSTIN: 27AAACU9988F1Z2 | Ph: 9876543210<br/>
        DL No: 20B/1192, 21B/1193<br/>
        ----------------------------------------<br/>
        <strong>CASH / POS RECEIPT</strong><br/>
        Bill No: {invNo} | {invDate}<br/>
        Cashier: Counter-1 | Mode: {invoice?.PrimaryPaymentMode.ToString() ?? "CASH"}<br/>
        ----------------------------------------
    </div>
    <table style='width:100%; font-size:10px; margin:4px 0;'>
        <thead>
            <tr style='border-bottom:1px dashed #000;'>
                <th style='text-align:left;'>Item</th>
                <th style='text-align:center;'>Qty</th>
                <th style='text-align:right;'>Rate</th>
                <th style='text-align:right;'>Amt</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Dolo 650mg (15s)</td><td style='text-align:center;'>2</td><td style='text-align:right;'>30.00</td><td style='text-align:right;'>60.00</td></tr>
            <tr><td>Azithral 500 (3s)</td><td style='text-align:center;'>1</td><td style='text-align:right;'>115.00</td><td style='text-align:right;'>115.00</td></tr>
            <tr><td>Becosules Caps (20s)</td><td style='text-align:center;'>1</td><td style='text-align:right;'>50.00</td><td style='text-align:right;'>50.00</td></tr>
        </tbody>
    </table>
    <div style='border-top:1px dashed #000; padding-top:4px;'>
        <div style='display:flex; justify-content:space-between;'><span>Sub Total:</span><span>₹{subTotal:N2}</span></div>
        <div style='display:flex; justify-content:space-between;'><span>GST Total:</span><span>₹{tax:N2}</span></div>
        <div style='display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:2px; border-top:1px solid #000; border-bottom:1px solid #000; padding:2px 0;'>
            <span>NET PAYABLE:</span><span>₹{total:N2}</span>
        </div>
    </div>
    <div style='text-align:center; margin:8px 0; background:#f0fdf4; border:1px dashed #16a34a; padding:4px;'>
        <strong>YOU SAVED ₹{savings:N2} ON MRP!</strong>
    </div>
    <div style='text-align:center;'>
        <img src='{upiQr}' alt='UPI QR' style='width:80px; height:80px; margin:0 auto; display:block;' />
        <span style='font-size:9px;'>Scan & Pay via any UPI App</span><br/>
        ----------------------------------------<br/>
        *** THANK YOU! VISIT AGAIN ***<br/>
        <span style='font-size:9px;'>Computer generated receipt</span>
    </div>
</div>";
    }

    private static string RenderPharmaRxHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        var invNo = invoice?.InvoiceNumber ?? "RX-2627-0104";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var docName = invoice?.DoctorName ?? "Dr. Arvind Mehta (MBBS, MD)";
        var docReg = invoice?.DoctorRegistrationNumber ?? "MCI-48201";
        var total = invoice?.TotalAmount ?? 1420.00m;
        var words = ConvertToIndianCurrencyWords(total);

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; max-width:800px; margin:0 auto; padding:20px; border:1px solid #94a3b8; background:#fff; font-size:12px;'>
    <div style='display:flex; justify-content:space-between; border-bottom:2px solid #dc2626; padding-bottom:8px;'>
        <div>
            <h2 style='color:#dc2626; margin:0;'>MEDICARE PHARMACY & SURGICALS</h2>
            <div style='font-size:11px;'>Civil Hospital Road, Chembur, Mumbai - 400071</div>
            <div style='font-size:11px; font-weight:bold;'>DL No: 20B/MH-4421, 21B/MH-4422 | GSTIN: 27AABCM9988F1Z9</div>
        </div>
        <div style='text-align:right;'>
            <div style='background:#dc2626; color:#fff; padding:3px 10px; font-weight:bold; border-radius:4px; display:inline-block;'>RETAIL PHARMA INVOICE</div>
            <div style='font-size:12px; font-weight:bold; margin-top:4px;'>Invoice No: {invNo}</div>
            <div style='font-size:11px;'>Date: {invDate}</div>
        </div>
    </div>

    <!-- Doctor & Patient Details -->
    <div style='display:grid; grid-template-columns:1.5fr 1fr; gap:12px; margin-top:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:8px 12px;'>
        <div>
            <div style='font-size:10px; color:#991b1b; font-weight:bold; text-transform:uppercase;'>Patient Details</div>
            <div style='font-size:13px; font-weight:bold;'>Rameshwar Patil (Male / 48 Yrs)</div>
            <div style='font-size:11px; color:#475569;'>Flat 203, Sea Breeze Apts, Mumbai | Ph: +91 98201 22334</div>
        </div>
        <div>
            <div style='font-size:10px; color:#991b1b; font-weight:bold; text-transform:uppercase;'>Prescribed By Doctor</div>
            <div style='font-size:13px; font-weight:bold; color:#dc2626;'>{docName}</div>
            <div style='font-size:11px; color:#475569;'>Reg Number: <strong>{docReg}</strong></div>
        </div>
    </div>

    <!-- Items with Batch, Expiry, Salt & H1 flags -->
    <table style='width:100%; border-collapse:collapse; margin-top:12px; border:1px solid #cbd5e1; font-size:11px;'>
        <thead>
            <tr style='background:#dc2626; color:#fff;'>
                <th style='padding:6px; text-align:center;'>#</th>
                <th style='padding:6px; text-align:left;'>Medicine / Salt Composition</th>
                <th style='padding:6px; text-align:center;'>Batch</th>
                <th style='padding:6px; text-align:center;'>Exp</th>
                <th style='padding:6px; text-align:right;'>MRP</th>
                <th style='padding:6px; text-align:right;'>Qty</th>
                <th style='padding:6px; text-align:right;'>Disc %</th>
                <th style='padding:6px; text-align:right;'>Net Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr style='border-bottom:1px solid #e2e8f0;'>
                <td style='padding:6px; text-align:center;'>1</td>
                <td style='padding:6px;'><strong>Augmentin 625 Duo</strong><br/><span style='font-size:10px; color:#64748b;'>Amoxicillin 500mg + Clavulanic Acid 125mg</span></td>
                <td style='padding:6px; text-align:center;'>AG-8821</td>
                <td style='padding:6px; text-align:center; color:#dc2626; font-weight:bold;'>10/27</td>
                <td style='padding:6px; text-align:right;'>210.00</td>
                <td style='padding:6px; text-align:right;'>2 STRIP</td>
                <td style='padding:6px; text-align:right;'>10%</td>
                <td style='padding:6px; text-align:right; font-weight:bold;'>₹378.00</td>
            </tr>
            <tr style='border-bottom:1px solid #e2e8f0;'>
                <td style='padding:6px; text-align:center;'>2</td>
                <td style='padding:6px;'><strong>Pan-D Capsule</strong> <span style='background:#fee2e2; color:#dc2626; font-size:9px; font-weight:bold; padding:1px 4px; border-radius:2px;'>H1</span><br/><span style='font-size:10px; color:#64748b;'>Pantoprazole 40mg + Domperidone 30mg</span></td>
                <td style='padding:6px; text-align:center;'>PND-104</td>
                <td style='padding:6px; text-align:center;'>04/28</td>
                <td style='padding:6px; text-align:right;'>199.00</td>
                <td style='padding:6px; text-align:right;'>2 STRIP</td>
                <td style='padding:6px; text-align:right;'>10%</td>
                <td style='padding:6px; text-align:right; font-weight:bold;'>₹358.20</td>
            </tr>
        </tbody>
    </table>

    <!-- CDSCO Statutory Warning Box -->
    <div style='margin-top:12px; border:2px solid #dc2626; padding:6px 10px; background:#fff1f2; font-size:10px; color:#991b1b;'>
        <strong>SCHEDULE H / H1 WARNING:</strong> To be sold by retail on the prescription of a Registered Medical Practitioner only. Do not take without medical supervision.
    </div>

    <div style='display:flex; justify-content:space-between; margin-top:12px;'>
        <div style='font-size:11px;'>
            <strong>Amount in Words:</strong> {words}
        </div>
        <div style='text-align:right; font-size:14px; font-weight:bold; color:#dc2626;'>
            Net Payable: ₹{total:N2}
        </div>
    </div>
</div>";
    }

    private static string RenderPharmaStockistHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        return RenderB2BLogisticsHtml(t, invoice);
    }

    private static string RenderDedicatedPharmaTaxInvoiceHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        var companyName = !string.IsNullOrWhiteSpace(t.HeaderSubtitle) ? t.HeaderSubtitle : "A.S.Y MED PHARMACEUTICALS PVT. LTD.";
        var companyAddress = "KARAMPURA COMPLEX, New Delhi, Delhi, 110015, India";
        var companyPhone = "9899801965";
        var msmeNo = "UDYAM-DL-11-0117863";
        var fssaiNo = "13325006000536";
        var gstinNo = "07ABBCA8518Q1Z5";
        var dlNo = "20B/21B-DL-0012";

        var invNo = invoice?.InvoiceNumber ?? "ASY-26-0109";
        var invDate = invoice?.InvoiceDate ?? DateTime.Now;
        var dateStr = invDate.ToString("dd/MM/yyyy HH:mm");
        var dayStr = invDate.ToString("dddd");
        var timeStr = invDate.ToString("HH:mm");

        var buyerName = invoice?.CustomerName ?? "DR. SANDHYA SINGH, AASTHA MATERNITY & EYE CENTRE";
        var buyerAddress = invoice?.BillingAddress ?? "DR. SANDHYA SINGH, AASTHA MATERNITY & EYE CENTRE, C-1/12, VASHISTH PARK, NEW DELHI, NEW DELHI, DELHI, INDIA";
        var buyerPhone = invoice?.Party?.Mobile ?? invoice?.Party?.PrimaryPhone ?? "9911771116";
        var buyerGstin = invoice?.CustomerGSTIN ?? "—";
        var buyerDl = invoice?.Party?.DrugLicenseNumber1 ?? "—";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : "TAX INVOICE";

        decimal subtotal = 0m;
        decimal cgstTotal = 0m;
        decimal sgstTotal = 0m;
        decimal gstTotal = 0m;
        decimal grandTotal = 0m;
        decimal roundOff = 0m;

        var sbItems = new StringBuilder();

        if (invoice?.Items != null && invoice.Items.Count > 0)
        {
            int idx = 1;
            foreach (var item in invoice.Items)
            {
                var packing = "Strip";
                var hsn = item.HsnCode ?? "21069099";
                var batch = item.BatchNumber ?? "RLCT-833";
                var exp = item.ExpiryDate?.ToString("MM/yy") ?? "09/27";
                var qty = item.Quantity;
                var free = "—";
                var unitPrice = item.UnitPrice;
                var discPct = item.DiscountPercent;
                var gstPct = item.GstRate;
                var mrp = item.Mrp > 0 ? item.Mrp : (unitPrice * 1.25m);
                var lineSubtotal = item.TaxableAmount > 0 ? item.TaxableAmount : (qty * unitPrice * (1 - discPct / 100m));
                var lineNet = item.TotalAmount > 0 ? item.TotalAmount : (lineSubtotal * (1 + gstPct / 100m));

                subtotal += lineSubtotal;
                cgstTotal += (lineSubtotal * (gstPct / 200m));
                sgstTotal += (lineSubtotal * (gstPct / 200m));
                gstTotal += (lineSubtotal * (gstPct / 100m));
                grandTotal += lineNet;

                sbItems.Append($@"
                <tr style='border-bottom:1px solid #7ba3c4; font-size:11px; height:24px;'>
                    <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>{idx++}</td>
                    <td style='padding:4px 6px; text-align:left; font-weight:bold; border-right:1px solid #7ba3c4;'>{item.ItemName}</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>{packing}</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>{hsn}</td>
                    <td style='padding:4px; text-align:center; font-weight:bold; border-right:1px solid #7ba3c4;'>{batch}</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>{exp}</td>
                    <td style='padding:4px; text-align:right; font-weight:bold; border-right:1px solid #7ba3c4;'>{qty:N2}</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>{free}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>{unitPrice:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>{discPct:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>{gstPct:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>{mrp:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>{lineSubtotal:N2}</td>
                    <td style='padding:4px; text-align:right; font-weight:bold;'>{lineNet:N2}</td>
                </tr>");
            }
        }
        else
        {
            subtotal = 2870.40m;
            cgstTotal = 71.80m;
            sgstTotal = 71.80m;
            gstTotal = 143.60m;
            roundOff = 0.08m;
            grandTotal = 3014.00m;

            sbItems.Append(@"
            <tr style='border-bottom:1px solid #7ba3c4; font-size:11px; height:24px;'>
                <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>1</td>
                <td style='padding:4px 6px; text-align:left; font-weight:bold; border-right:1px solid #7ba3c4;'>LACFERRIN</td>
                <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>Strip</td>
                <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>21069099</td>
                <td style='padding:4px; text-align:center; font-weight:bold; border-right:1px solid #7ba3c4;'>RLCT-833</td>
                <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>9/27</td>
                <td style='padding:4px; text-align:right; font-weight:bold; border-right:1px solid #7ba3c4;'>20.00</td>
                <td style='padding:4px; text-align:center; border-right:1px solid #7ba3c4;'>—</td>
                <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>143.52</td>
                <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>4.00</td>
                <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>5.00</td>
                <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>299.00</td>
                <td style='padding:4px; text-align:right; border-right:1px solid #7ba3c4;'>2,870.40</td>
                <td style='padding:4px; text-align:right; font-weight:bold;'>3,014.00</td>
            </tr>");
        }

        var words = ConvertToIndianCurrencyWords(grandTotal);
        var upiQr = $"https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=upi%3A%2F%2Fpay%3Fpa%3D{t.UpiId ?? "saurabhthebest1@oksbi"}%26pn%3D{Uri.EscapeDataString(companyName)}%26am%3D{grandTotal:F2}%26cu%3DINR";

        var terms = !string.IsNullOrWhiteSpace(t.TermsAndConditions) ? t.TermsAndConditions : 
@"1. Goods Once Sold Will Not be taken back.
2. Bills not paid due date will attract 24% intrest.
3. All disputes are subject to Delhi jurisdiction only.";

        var formattedTerms = string.Join("<br/>", terms.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

        return $@"
<div class='invoice-container' style='font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width:850px; margin:0 auto; padding:12px; background:#fff; color:#0f172a; font-size:11px; line-height:1.3;'>
    <div style='border:1.5px solid #5b9bd5;'>
        <!-- Top Header: 3-Column Layout -->
        <div style='display:flex; border-bottom:1.5px solid #5b9bd5; background:#fff;'>
            <!-- Left: Seller Details -->
            <div style='flex:1.2; padding:8px 12px; display:flex; gap:10px; align-items:flex-start;'>
                <div style='width:40px; height:40px; background:#e0f2fe; border:1px solid #bae6fd; border-radius:6px; display:flex; align-items:center; justify-content:center; shrink:0;'>
                    <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#0284c7' stroke-width='2.2'><path d='M12 2v20M2 12h20'/></svg>
                </div>
                <div>
                    <div style='font-size:13.5px; font-weight:800; color:#1e293b; letter-spacing:-0.2px;'>{companyName}</div>
                    <div style='font-size:10px; color:#475569; margin-top:2px;'>{companyAddress}</div>
                    <div style='font-size:10px; font-weight:700; color:#0f172a; margin-top:3px;'>Mobile: {companyPhone}</div>
                </div>
            </div>

            <!-- Middle: Invoice Meta Grid -->
            <div style='width:170px; border-left:2px solid #5b9bd5; padding:8px 10px; font-size:10.5px;'>
                <div style='display:flex; justify-content:space-between; margin-bottom:2px;'>
                    <span style='color:#475569; font-weight:600;'>Inv. No.</span>
                    <strong style='color:#0f172a;'>{invNo}</strong>
                </div>
                <div style='display:flex; justify-content:space-between; margin-bottom:2px;'>
                    <span style='color:#475569; font-weight:600;'>Date</span>
                    <strong style='color:#0f172a;'>{dateStr}</strong>
                </div>
                <div style='display:flex; justify-content:space-between; margin-bottom:2px;'>
                    <span style='color:#475569; font-weight:600;'>Day</span>
                    <span style='color:#0f172a;'>{dayStr}</span>
                </div>
                <div style='display:flex; justify-content:space-between;'>
                    <span style='color:#475569; font-weight:600;'>Time</span>
                    <span style='color:#0f172a;'>{timeStr}</span>
                </div>
            </div>

            <!-- Right: Buyer / Doctor / Hospital Details -->
            <div style='flex:1.2; border-left:2px solid #5b9bd5; padding:8px 12px; font-size:10px;'>
                <div style='font-size:11.5px; font-weight:800; color:#1e293b; margin-bottom:2px;'>{buyerName}</div>
                <div style='color:#475569; line-height:1.25;'>{buyerAddress}</div>
                <div style='margin-top:4px; font-weight:700; color:#0f172a;'>
                    <span>Mobile: {buyerPhone}</span> &nbsp;|&nbsp; <span>Phone: {buyerPhone}</span>
                </div>
            </div>
        </div>

        <!-- Sub-Header Row (MSME / TAX INVOICE banner / DL No) -->
        <div style='display:flex; border-bottom:1.5px solid #5b9bd5; background:#fff; align-items:stretch;'>
            <div style='flex:1.1; padding:5px 12px; font-size:10px; line-height:1.35; color:#334155;'>
                <div><strong>MSME:</strong> {msmeNo}</div>
                <div><strong>FSSAI:</strong> {fssaiNo}</div>
                <div><strong>GSTIN:</strong> {gstinNo}</div>
            </div>

            <div style='flex:1.3; background:#34495e; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; letter-spacing:1.5px;'>
                {headerTitle}
            </div>

            <div style='flex:1; padding:5px 12px; font-size:10px; line-height:1.35; color:#334155; border-left:1px solid #7ba3c4;'>
                <div><strong>DL No.:</strong> {dlNo}</div>
                <div><strong>GST:</strong> {buyerGstin}</div>
            </div>
        </div>

        <!-- Pharma Line Items Table -->
        <table style='width:100%; border-collapse:collapse; text-align:left;'>
            <thead>
                <tr style='background:#3f5872; color:#fff; font-size:10px; font-weight:bold; height:26px;'>
                    <th style='padding:4px; text-align:center; width:3%; border-right:1px solid #7ba3c4;'>Sr.</th>
                    <th style='padding:4px 6px; text-align:left; width:22%; border-right:1px solid #7ba3c4;'>Description</th>
                    <th style='padding:4px; text-align:center; width:7%; border-right:1px solid #7ba3c4;'>Packing</th>
                    <th style='padding:4px; text-align:center; width:8%; border-right:1px solid #7ba3c4;'>HSN</th>
                    <th style='padding:4px; text-align:center; width:9%; border-right:1px solid #7ba3c4;'>Batch</th>
                    <th style='padding:4px; text-align:center; width:6%; border-right:1px solid #7ba3c4;'>Exp.</th>
                    <th style='padding:4px; text-align:right; width:7%; border-right:1px solid #7ba3c4;'>Quantity</th>
                    <th style='padding:4px; text-align:center; width:5%; border-right:1px solid #7ba3c4;'>Free</th>
                    <th style='padding:4px; text-align:right; width:7%; border-right:1px solid #7ba3c4;'>Unit Price</th>
                    <th style='padding:4px; text-align:right; width:6%; border-right:1px solid #7ba3c4;'>Disc%</th>
                    <th style='padding:4px; text-align:right; width:6%; border-right:1px solid #7ba3c4;'>GST%</th>
                    <th style='padding:4px; text-align:right; width:6%; border-right:1px solid #7ba3c4;'>MRP</th>
                    <th style='padding:4px; text-align:right; width:8%; border-right:1px solid #7ba3c4;'>Subtotal</th>
                    <th style='padding:4px; text-align:right; width:8%;'>Net</th>
                </tr>
            </thead>
            <tbody>
                {sbItems}
            </tbody>
        </table>

        <!-- Footer / Calculation & Terms Grid -->
        <div style='display:flex; border-top:1.5px solid #5b9bd5; background:#fff;'>
            <!-- Left Half: GST Tax Breakup + Terms + Bank Details & Dynamic UPI QR -->
            <div style='flex:1.45; border-right:1.5px solid #5b9bd5; display:flex; flex-direction:column; justify-content:space-between;'>
                <div style='padding:4px 8px; border-bottom:1px solid #7ba3c4; font-size:10px; font-weight:700; color:#1e293b; background:#f8fafc;'>
                    GST (CGST+SGST): HSN 21069099 Taxable {subtotal:N2} CGST+SGST @ 5% = Tax {gstTotal:N2}
                </div>

                <div style='padding:6px 8px; font-size:9.5px; color:#334155; line-height:1.35;'>
                    <div style='font-weight:700; color:#0f172a; margin-bottom:2px;'>Terms: <span style='font-weight:normal;'>Invoice Terms:</span></div>
                    {formattedTerms}
                </div>

                <div style='display:flex; border-top:1px solid #7ba3c4; align-items:center;'>
                    <div style='flex:1; padding:6px 8px; font-size:9.5px; color:#0f172a; line-height:1.4;'>
                        <div><strong>Bank:</strong> {t.BankName ?? "KOTAK MAHINDRA"} | <strong>A/c:</strong> {t.BankAccountNumber ?? "5150394634"} | <strong>IFSC:</strong> {t.BankIfsc ?? "KKBK0000203"}</div>
                        <div><strong>Branch:</strong> MAYUR PLAZA IV, MAYUR VIHAR PH-1</div>
                    </div>
                    <div style='border-left:1px solid #7ba3c4; padding:4px 8px; text-align:center; shrink:0;'>
                        <img src='{upiQr}' alt='Scan to Pay' style='width:68px; height:68px; display:block; margin:0 auto;' />
                        <div style='font-size:8px; font-weight:700; color:#334155; margin-top:2px;'>Scan to Pay (₹{grandTotal:N2})</div>
                    </div>
                </div>

                <div style='padding:5px 8px; border-top:1px solid #7ba3c4; font-size:10px; background:#f8fafc;'>
                    <strong>Amount in words:</strong> {words}
                </div>
            </div>

            <!-- Right Half: Financial Summary & Authorized Signatory -->
            <div style='flex:1; display:flex; flex-direction:column; justify-content:space-between;'>
                <table style='width:100%; border-collapse:collapse; font-size:10.5px;'>
                    <tr style='border-bottom:1px solid #7ba3c4;'>
                        <td style='padding:4px 8px; font-weight:600; color:#475569;'>Subtotal:</td>
                        <td style='padding:4px 8px; text-align:right; font-weight:bold; color:#0f172a;'>₹ {subtotal:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #7ba3c4;'>
                        <td style='padding:4px 8px; color:#475569;'>CGST@2.5% / 5%</td>
                        <td style='padding:4px 8px; text-align:right; color:#0f172a;'>₹ {cgstTotal:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #7ba3c4;'>
                        <td style='padding:4px 8px; color:#475569;'>SGST@2.5% / 5%</td>
                        <td style='padding:4px 8px; text-align:right; color:#0f172a;'>₹ {sgstTotal:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #7ba3c4;'>
                        <td style='padding:4px 8px; font-weight:600; color:#475569;'>GST</td>
                        <td style='padding:4px 8px; text-align:right; font-weight:600; color:#0f172a;'>₹ {gstTotal:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #7ba3c4;'>
                        <td style='padding:4px 8px; color:#475569;'>Round Off</td>
                        <td style='padding:4px 8px; text-align:right; color:#0f172a;'>₹ {roundOff:N2}</td>
                    </tr>
                    <tr style='background:#f8fafc; font-size:12px; font-weight:bold;'>
                        <td style='padding:6px 8px; color:#1e293b;'>GRAND TOTAL</td>
                        <td style='padding:6px 8px; text-align:right; color:#0f172a;'>₹ {grandTotal:N2}</td>
                    </tr>
                </table>

                <div style='padding:8px; text-align:right; border-top:1px solid #7ba3c4; min-height:65px; display:flex; flex-direction:column; justify-content:space-between;'>
                    <div style='font-size:10px; font-weight:700; color:#1e293b;'>For {companyName}</div>
                    <div style='font-size:9.5px; color:#475569;'>Authorised Signatory</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Very Bottom Footnote -->
    <div style='text-align:center; font-size:9px; color:#64748b; margin-top:6px;'>
        This is a computer generated invoice and does not require signature.
    </div>
</div>";
    }

    private static string RenderA5CompactHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        var invNo = invoice?.InvoiceNumber ?? "MEMO-2627-049";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var total = invoice?.TotalAmount ?? 8950.00m;

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; max-width:650px; margin:0 auto; padding:12px; border:1px solid #94a3b8; background:#fff; font-size:11px;'>
    <div style='display:flex; justify-content:space-between; border-bottom:1px solid {t.PrimaryColorHex}; padding-bottom:6px;'>
        <div>
            <strong style='font-size:16px; color:{t.PrimaryColorHex};'>Udyog Wholesale Traders</strong><br/>
            <span style='font-size:10px;'>Sector 18, Vashi, Navi Mumbai | GSTIN: 27AAACU9988F1Z2</span>
        </div>
        <div style='text-align:right;'>
            <strong style='font-size:13px;'>CASH/CREDIT MEMO</strong><br/>
            <span>No: <strong>{invNo}</strong> | Date: <strong>{invDate}</strong></span>
        </div>
    </div>
    <div style='margin:6px 0; font-size:11px;'>
        Billed To: <strong>{invoice?.CustomerName ?? "Mahalaxmi Supermarket"}</strong> | GSTIN: {invoice?.CustomerGSTIN ?? "27AABCM8821F1Z1"}
    </div>
    <table style='width:100%; border-collapse:collapse; font-size:10px; border:1px solid #cbd5e1;'>
        <thead>
            <tr style='background:{t.PrimaryColorHex}15;'>
                <th style='padding:4px; border:1px solid #cbd5e1; text-align:left;'>Item</th>
                <th style='padding:4px; border:1px solid #cbd5e1; text-align:center;'>HSN</th>
                <th style='padding:4px; border:1px solid #cbd5e1; text-align:right;'>Qty</th>
                <th style='padding:4px; border:1px solid #cbd5e1; text-align:right;'>Rate</th>
                <th style='padding:4px; border:1px solid #cbd5e1; text-align:right;'>Total</th>
            </tr>
        </thead>
        <tbody>
            {RenderLineItemsRows(invoice)}
        </tbody>
    </table>
    <div style='display:flex; justify-content:space-between; margin-top:8px; font-weight:bold; font-size:12px;'>
        <span>Terms: Payment within 7 days</span>
        <span>Grand Total: ₹{total:N2}</span>
    </div>
</div>";
    }

    private static string RenderModernGstHtml(PrintTemplate t, SalesInvoice? invoice)
    {
        return RenderB2BLogisticsHtml(t, invoice);
    }

    private static string RenderLineItemsRows(SalesInvoice? invoice)
    {
        if (invoice?.Items != null && invoice.Items.Any())
        {
            var sb = new StringBuilder();
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                sb.Append($@"
<tr style='border-bottom:1px solid #cbd5e1;'>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>{idx++}</td>
    <td style='padding:5px; border:1px solid #cbd5e1;'><strong>{it.ItemName}</strong></td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>{it.HsnCode ?? "3004"}</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>{it.BatchNumber ?? "-"}</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>{it.Quantity:N0}</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹{it.UnitPrice:N2}</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>{it.DiscountPercent:N0}%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹{it.TaxableAmount:N2}</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>{it.GstRate:N0}%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
</tr>");
            }
            return sb.ToString();
        }

        // Default demo rows
        return @"
<tr style='border-bottom:1px solid #cbd5e1;'>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>1</td>
    <td style='padding:5px; border:1px solid #cbd5e1;'><strong>Azithromycin 500mg Tablets</strong><br/><span style='font-size:9px; color:#64748b;'>10 Tabs Strip</span></td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>30049099</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>AZ-991 (12/28)</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>100</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹120.00</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>5%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹11,400.00</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;'>₹12,768.00</td>
</tr>
<tr style='border-bottom:1px solid #cbd5e1;'>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>2</td>
    <td style='padding:5px; border:1px solid #cbd5e1;'><strong>Paracetamol 650mg Dolo</strong><br/><span style='font-size:9px; color:#64748b;'>15 Tabs Strip</span></td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>30049099</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:center;'>DL-442 (08/27)</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>200</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹30.00</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>0%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>₹6,000.00</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:5px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;'>₹6,720.00</td>
</tr>";
    }

    private static string ConvertToIndianCurrencyWords(decimal amount)
    {
        if (amount == 0) return "Indian Rupees Zero Only";
        long wholePart = (long)Math.Floor(Math.Abs(amount));
        int paise = (int)Math.Round((Math.Abs(amount) - wholePart) * 100);

        string words = "INR " + ConvertWholeNumberToWords(wholePart);
        if (paise > 0)
        {
            words += " and " + ConvertWholeNumberToWords(paise) + " Paise";
        }
        words += " Only";
        return words;
    }

    private static string ConvertWholeNumberToWords(long number)
    {
        if (number == 0) return "Zero";
        if (number < 0) return "Minus " + ConvertWholeNumberToWords(Math.Abs(number));

        string words = "";

        if ((number / 10000000) > 0)
        {
            words += ConvertWholeNumberToWords(number / 10000000) + " Crore ";
            number %= 10000000;
        }

        if ((number / 100000) > 0)
        {
            words += ConvertWholeNumberToWords(number / 100000) + " Lakh ";
            number %= 100000;
        }

        if ((number / 1000) > 0)
        {
            words += ConvertWholeNumberToWords(number / 1000) + " Thousand ";
            number %= 1000;
        }

        if ((number / 100) > 0)
        {
            words += ConvertWholeNumberToWords(number / 100) + " Hundred ";
            number %= 100;
        }

        if (number > 0)
        {
            var units = new[] { "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
            var tens = new[] { "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            if (number < 20)
                words += units[number];
            else
            {
                words += tens[number / 10];
                if ((number % 10) > 0)
                    words += " " + units[number % 10];
            }
        }

        return words.Trim();
    }

    private static string GetDefaultCss(PrintTemplate t)
    {
        if (t.PageSize == PageSizeFormat.A5 || t.DocumentType == PrintDocumentType.POSReceipt)
        {
            return @"
@page { size: 210mm 148mm; margin: 3mm 4mm; }
@media print {
    html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
    .invoice-wrapper, .invoice-container { width: 100% !important; height: 140mm !important; max-height: 140mm !important; border: 1.5px solid #000 !important; box-sizing: border-box !important; page-break-inside: avoid !important; break-inside: avoid !important; }
}
";
        }

        return @"
@page { size: 210mm 297mm; margin: 4mm 5mm; }
@media print {
    html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
    .invoice-wrapper, .invoice-container { width: 100% !important; height: 258mm !important; max-height: 262mm !important; border: 1.5px solid #000 !important; box-sizing: border-box !important; page-break-inside: avoid !important; break-inside: avoid !important; }
}
";
    }

    private async Task SeedDefaultTemplatesAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var defaultTemplates = new List<PrintTemplate>
        {
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "B2B Full Logistics & Transport Invoice (A4)",
                TemplateCode = "TPL_B2B_LOGISTICS_A4",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#1e40af",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowBankDetails = true,
                BankAccountName = "Udyog Software Technologies",
                BankAccountNumber = "982011928374",
                BankIfsc = "ICIC0001928",
                BankName = "ICICI Bank Cyber City",
                ShowUpiQr = true,
                UpiId = "udyogbill@icici",
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "We declare that this invoice shows the actual price of goods and that all particulars are true and correct."
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Classic Modern GST Tax Invoice (A4)",
                TemplateCode = "TPL_A4_MODERN_GST",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#4f46e5",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "TAX INVOICE",
                ShowGstin = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Compact Trade Memo (A5 Half-Page)",
                TemplateCode = "TPL_A5_COMPACT_TRADE",
                PageSize = PageSizeFormat.A5,
                IsDefault = false,
                PrimaryColorHex = "#0f766e",
                SecondaryColorHex = "#111827",
                HeaderTitle = "CASH / CREDIT MEMO",
                ShowGstin = true,
                ShowBankDetails = false,
                ShowUpiQr = true,
                ShowItemHsn = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.POSReceipt,
                TemplateName = "3-inch (80mm) Thermal Cash Memo",
                TemplateCode = "TPL_POS_THERMAL_80MM",
                PageSize = PageSizeFormat.Thermal_80mm,
                IsDefault = true,
                PrimaryColorHex = "#000000",
                SecondaryColorHex = "#111827",
                HeaderTitle = "CASH / POS RECEIPT",
                ShowBankDetails = false,
                ShowUpiQr = true,
                UpiId = "cashier@upi",
                ShowSavingsCallout = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Pharma Retail Chemist Rx Bill (A4/A5)",
                TemplateCode = "TPL_PHARMA_RX_CHEMIST",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#dc2626",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "RETAIL PHARMA INVOICE",
                ShowDrugLicense = true,
                ShowBatchExpiry = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Pharma Wholesale Stockist B2B (A4)",
                TemplateCode = "TPL_PHARMA_STOCKIST_B2B",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#0369a1",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "PHARMA WHOLESALE TAX INVOICE",
                ShowDrugLicense = true,
                ShowBatchExpiry = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Generic Salt & Substitute Comparison (A4)",
                TemplateCode = "TPL_PHARMA_GENERIC_SALT",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#16a34a",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "GENERIC HEALTHCARE INVOICE"
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.BarcodeLabel,
                TemplateName = "50x25mm Dual SKU Barcode Tag",
                TemplateCode = "TPL_BARCODE_50X25",
                PageSize = PageSizeFormat.Barcode_50x25mm,
                IsDefault = true,
                PrimaryColorHex = "#000000"
            }
        };

        _context.PrintTemplates.AddRange(defaultTemplates);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static PrintTemplateDto MapToDto(PrintTemplate t)
    {
        return new PrintTemplateDto(
            t.Id,
            t.DocumentType,
            t.TemplateName,
            t.TemplateCode,
            t.PageSize,
            t.IsDefault,
            t.PrimaryColorHex,
            t.SecondaryColorHex,
            t.FontFamily,
            t.ShowLogo,
            t.LogoUrl,
            t.HeaderTitle,
            t.HeaderSubtitle,
            t.ShowGstin,
            t.ShowDrugLicense,
            t.ShowFssai,
            t.ShowBankDetails,
            t.BankAccountName,
            t.BankAccountNumber,
            t.BankIfsc,
            t.BankName,
            t.ShowUpiQr,
            t.UpiId,
            t.ShowItemHsn,
            t.ShowBatchExpiry,
            t.ShowMrpStrikethrough,
            t.ShowSavingsCallout,
            t.ShowLoyaltyPoints,
            t.ShowCustomerBalance,
            t.ShowTerms,
            t.TermsAndConditions,
            t.ShowDeclaration,
            t.DeclarationText,
            t.FooterGreeting,
            t.LanguageCode,
            t.CustomLabelsJson,
            t.CustomCss,
            t.HtmlTemplateBody,
            t.IsActive
        );
    }

    private static (string pack, decimal freeQty) ExtractItemPharmaAttributes(SalesInvoiceItem item)
    {
        string pack = "";
        decimal freeQty = 0;
        if (!string.IsNullOrEmpty(item.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                if (doc.RootElement.TryGetProperty("packing", out var p)) pack = p.GetString() ?? "";
                if (doc.RootElement.TryGetProperty("freeQuantity", out var f))
                {
                    if (f.ValueKind == System.Text.Json.JsonValueKind.Number) freeQty = f.GetDecimal();
                    else if (decimal.TryParse(f.GetString(), out var fNum)) freeQty = fNum;
                }
            }
            catch {}
        }
        return (pack, freeQty);
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // 1. 🏛️ TALLY PRIME STYLE (B2B CLASSIC CORPORATE INVOICE)
    // ══════════════════════════════════════════════════════════════════════════════
    private static string RenderTallyPrimeInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOG SOFTWARE & PHARMA ENTERPRISES PVT. LTD.");
        var sellerAddress = !string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Shop No. 2, Cyber City Commercial Complex, Sector 62, Noida, Uttar Pradesh - 201309";
        var sellerGstin = !string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AAACU9876A1Z5";
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "AAACU9876A");
        var sellerState = !string.IsNullOrWhiteSpace(tenant?.State) ? $"{tenant.State}{(string.IsNullOrWhiteSpace(tenant?.StateCode) ? "" : $", Code: {tenant.StateCode}")}" : "Uttar Pradesh, Code: 09";
        var sellerPhone = tenant?.PrimaryPhone ?? "";
        var sellerEmail = tenant?.Email ?? "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var copyBadge = t.DocumentType == PrintDocumentType.POSReceipt ? "RETAIL CASH MEMO" : "ORIGINAL FOR RECIPIENT";

        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00009";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yy") ?? DateTime.Now.ToString("dd-MMM-yy");
        var custName = invoice?.CustomerName ?? "Apollo Medico Retail Chemists";
        var custGstin = invoice?.CustomerGSTIN ?? "27AAAAA1234A1Z5";
        var custAddress = invoice?.BillingAddress ?? "Plot No. 14, Commercial Complex, Nehru Place, New Delhi - 110019";
        var custState = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : "Maharashtra";

        var poNo = invoice?.PoNumber ?? "-";
        var poDate = invoice?.PoDate.HasValue == true ? invoice.PoDate.Value.ToString("dd-MMM-yy") : "-";
        var eWayBill = invoice?.EWayBillNumber ?? "-";
        var transport = invoice?.TransporterName ?? "Road Transport";
        var destination = invoice?.ShippingAddress ?? "Local Delivery";

        var taxable = invoice?.TaxableAmount ?? 975.00m;
        var cgst = invoice?.CgstAmount ?? 58.50m;
        var sgst = invoice?.SgstAmount ?? 58.50m;
        var igst = invoice?.IgstAmount ?? 0m;
        var totalAmount = invoice?.TotalAmount ?? 1092.00m;

        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "HDFC BANK");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "50200084729104");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "HDFC0000128");
        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");

        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasPacking = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(ExtractItemPharmaAttributes(i).pack)) ?? true;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;

        var itemsRows = new System.Text.StringBuilder();
        if (invoice != null && invoice.Items.Any())
        {
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var expStr = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";

                itemsRows.Append($@"
                <tr style='font-size:10.5px;'>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>{idx++}</td>
                    <td style='padding:5px 6px; border-right:1px solid #000;'>
                        <strong>{it.ItemName}</strong>
                        {(string.IsNullOrEmpty(it.ItemSku) ? "" : $"<br/><span style='font-size:9px; color:#475569;'>SKU: {it.ItemSku}</span>")}
                    </td>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{it.HsnCode ?? "30042010"}</td>
                    {(hasPacking ? $"<td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>{(string.IsNullOrEmpty(attrs.pack) ? "-" : attrs.pack)}</td>" : "")}
                    {(hasBatch ? $"<td style='padding:5px 6px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:5px 6px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{expStr}</td>" : "")}
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid #000; font-weight:bold;'>{it.Quantity:N0} {it.UomCode}</td>
                    {(hasFree ? $"<td style='padding:5px 6px; text-align:center; border-right:1px solid #000; color:#047857;'>{attrs.freeQty:N0}</td>" : "")}
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>₹{it.UnitPrice:N2}</td>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>{it.UomCode}</td>
                    {(hasDisc ? $"<td style='padding:5px 6px; text-align:right; border-right:1px solid #000;'>{it.DiscountPercent:N0}%</td>" : "")}
                    <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            itemsRows.Append(@"
                <tr style='font-size:10.5px;'>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>1</td>
                    <td style='padding:5px 6px; border-right:1px solid #000;'><strong>Augmentin 625 Duo Tablet</strong><br/><span style='font-size:9px; color:#475569;'>SKU: SIM-AUG-625</span></td>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>30042010</td>
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid #000; font-weight:bold;'>5 STP</td>
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid #000;'>₹195.00</td>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>STP</td>
                    <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold;'>₹1,092.00</td>
                </tr>");
        }

        var amountInWords = ConvertToIndianCurrencyWords(totalAmount);
        var upiQrPayload = !string.IsNullOrEmpty(upiId) ? $"upi://pay?pa={upiId}&pn={Uri.EscapeDataString(sellerName)}&am={totalAmount:F2}&cu=INR&tn={invNo}" : "";
        var qrImgTag = !string.IsNullOrEmpty(upiQrPayload) ? $"<img src='https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={Uri.EscapeDataString(upiQrPayload)}' style='width:75px; height:75px;' />" : "";

        return $@"
        <div class='invoice-wrapper' style='font-family:Arial, sans-serif; font-size:11px; color:#000; width:100%; max-width:800px; margin:0 auto; border:1.5px solid #000; box-sizing:border-box; background:#fff; min-height:270mm;'>
            <!-- Top Bar with Document Title & GST Rule 48 Copy Badge -->
            <div style='border-bottom:1.5px solid #000; padding:6px 12px; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;'>
                <div>
                    <span style='font-size:14px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase;'>{headerTitle}</span>
                    <span style='font-size:10px; color:#475569; margin-left:8px;'>(GST Corporate Standard)</span>
                </div>
                <div style='border:1px solid #000; padding:2px 8px; font-size:9px; font-weight:800; text-transform:uppercase; background:#fff;'>
                    {copyBadge}
                </div>
            </div>

            <!-- Seller Company Header -->
            <div style='text-align:center; padding:10px 14px; border-bottom:1px solid #000; background:#fff;'>
                <div style='font-size:18px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; color:#0f172a;'>{sellerName}</div>
                <div style='font-size:11px; color:#334155; margin-top:2px;'>{sellerAddress}</div>
                <div style='font-size:11px; font-weight:700; color:#0f172a; margin-top:4px;'>
                    GSTIN/UIN: <span style='font-family:monospace;'>{sellerGstin}</span> | State: {sellerState} | PAN: <span style='font-family:monospace;'>{sellerPan}</span>
                </div>
                {(string.IsNullOrWhiteSpace(sellerPhone) ? "" : $"<div style='font-size:10px; color:#475569; margin-top:2px;'>Phone: {sellerPhone} {(string.IsNullOrWhiteSpace(sellerEmail) ? "" : $"| Email: {sellerEmail}")}</div>")}
            </div>

            <!-- 2-Column Buyer & Invoice Metadata Compartments -->
            <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                <!-- Left: Buyer Details -->
                <div style='padding:8px 10px; border-right:1px solid #000;'>
                    <div style='font-size:9.5px; font-weight:bold; color:#475569; text-transform:uppercase;'>BUYER (BILL TO):</div>
                    <div style='font-size:13px; font-weight:bold; color:#0f172a; margin-top:2px;'>{custName}</div>
                    <div style='font-size:11px; color:#334155; margin-top:2px;'>{custAddress}</div>
                    <div style='font-size:11px; font-weight:bold; margin-top:4px;'>GSTIN/UIN: <span style='font-family:monospace;'>{custGstin}</span></div>
                    <div style='font-size:11px;'>State Name: <strong>{custState}</strong></div>
                </div>

                <!-- Right: Invoice Metadata Grid -->
                <div style='font-size:10.5px;'>
                    <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                        <div style='padding:4px 8px; border-right:1px solid #000;'>Invoice No:<br/><strong style='font-size:11.5px; font-family:monospace;'>{invNo}</strong></div>
                        <div style='padding:4px 8px;'>Dated:<br/><strong style='font-size:11.5px;'>{invDate}</strong></div>
                    </div>
                    <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                        <div style='padding:4px 8px; border-right:1px solid #000;'>Delivery Note:<br/><strong>{eWayBill}</strong></div>
                        <div style='padding:4px 8px;'>Mode/Terms of Payment:<br/><strong>Bank / Immediate</strong></div>
                    </div>
                    <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                        <div style='padding:4px 8px; border-right:1px solid #000;'>Buyer's Order No:<br/><strong>{poNo}</strong></div>
                        <div style='padding:4px 8px;'>Dated:<br/><strong>{poDate}</strong></div>
                    </div>
                    <div style='display:grid; grid-template-columns: 1fr 1fr;'>
                        <div style='padding:4px 8px; border-right:1px solid #000;'>Despatched through:<br/><strong>{transport}</strong></div>
                        <div style='padding:4px 8px;'>Destination:<br/><strong>{destination}</strong></div>
                    </div>
                </div>
            </div>

            <!-- Line Items Table -->
            <table style='width:100%; border-collapse:collapse; border-bottom:1px solid #000;'>
                <thead>
                    <tr style='background:#f1f5f9; font-size:10px; font-weight:bold; border-bottom:1px solid #000; text-transform:uppercase;'>
                        <th style='padding:6px 4px; width:28px; text-align:center; border-right:1px solid #000;'>SL NO.</th>
                        <th style='padding:6px; text-align:left; border-right:1px solid #000;'>DESCRIPTION OF GOODS</th>
                        <th style='padding:6px; width:75px; text-align:center; border-right:1px solid #000;'>HSN/SAC</th>
                        {(hasPacking ? "<th style='padding:6px; width:55px; text-align:center; border-right:1px solid #000;'>PACK</th>" : "")}
                        {(hasBatch ? "<th style='padding:6px; width:65px; text-align:center; border-right:1px solid #000;'>BATCH</th>" : "")}
                        {(hasExpiry ? "<th style='padding:6px; width:50px; text-align:center; border-right:1px solid #000;'>EXP</th>" : "")}
                        <th style='padding:6px; width:65px; text-align:right; border-right:1px solid #000;'>QUANTITY</th>
                        {(hasFree ? "<th style='padding:6px; width:45px; text-align:center; border-right:1px solid #000;'>FREE</th>" : "")}
                        <th style='padding:6px; width:65px; text-align:right; border-right:1px solid #000;'>RATE</th>
                        <th style='padding:6px; width:38px; text-align:center; border-right:1px solid #000;'>PER</th>
                        {(hasDisc ? "<th style='padding:6px; width:45px; text-align:right; border-right:1px solid #000;'>DISC%</th>" : "")}
                        <th style='padding:6px; width:85px; text-align:right;'>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {itemsRows}
                </tbody>
            </table>

            <!-- Summary & Tax Breakdowns -->
            <div style='display:grid; grid-template-columns: 1fr 280px; border-bottom:1px solid #000;'>
                <div style='padding:8px 10px; border-right:1px solid #000;'>
                    <div style='font-size:10px; font-weight:bold; text-transform:uppercase; color:#475569;'>Amount Chargeable (in words):</div>
                    <div style='font-size:12px; font-weight:bold; color:#0f172a; margin-top:2px;'>INR {amountInWords}</div>

                    <div style='margin-top:12px; font-size:10px; border-top:1px dashed #94a3b8; padding-top:6px;'>
                        <strong>Company's Bank Details:</strong><br/>
                        Bank Name: <strong>{bankName}</strong><br/>
                        A/c No.: <strong style='font-family:monospace;'>{bankAcc}</strong><br/>
                        Branch &amp; IFSC: <strong style='font-family:monospace;'>{bankIfsc}</strong>
                    </div>
                </div>

                <div style='padding:6px 10px; font-size:11px;'>
                    <div style='display:flex; justify-content:space-between; padding:2px 0;'><span>Taxable Value:</span><span style='font-family:monospace;'>₹{taxable:N2}</span></div>
                    {(cgst > 0 ? $"<div style='display:flex; justify-content:space-between; padding:2px 0;'><span>Central Tax (CGST):</span><span style='font-family:monospace;'>₹{cgst:N2}</span></div>" : "")}
                    {(sgst > 0 ? $"<div style='display:flex; justify-content:space-between; padding:2px 0;'><span>State Tax (SGST):</span><span style='font-family:monospace;'>₹{sgst:N2}</span></div>" : "")}
                    {(igst > 0 ? $"<div style='display:flex; justify-content:space-between; padding:2px 0;'><span>Integrated Tax (IGST):</span><span style='font-family:monospace;'>₹{igst:N2}</span></div>" : "")}
                    <div style='display:flex; justify-content:space-between; padding:6px 0; border-top:1.5px solid #000; font-weight:900; font-size:13px;'>
                        <span>Total (INR):</span>
                        <span style='font-family:monospace;'>₹{totalAmount:N2}</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Declaration & Authorized Signatory -->
            <div style='display:grid; grid-template-columns: 1fr 120px 200px; padding:8px 10px; gap:8px;'>
                <div style='font-size:9.5px; color:#475569;'>
                    <strong>Declaration:</strong><br/>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods once sold will not be taken back.
                </div>
                <div style='text-align:center;'>
                    {qrImgTag}
                    <div style='font-size:8px; color:#475569;'>Scan to Pay UPI</div>
                </div>
                <div style='text-align:right; font-size:10px;'>
                    For <strong>{sellerName}</strong><br/><br/><br/>
                    <strong>Authorized Signatory</strong>
                </div>
            </div>
        </div>";
    }

    private static string RenderMargErpInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "MEDIPHARMA PHARMACEUTICALS DISTRIBUTORS");
        var sellerAddress = !string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Shop 12-14, Dawa Bazar, Aminabad, Lucknow, UP - 226018";
        var sellerGstin = !string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AABCM4910C1Z8";
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "UP-20B-184920 / UP-21B-184921";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "10019051002934";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00009";
        var invDate = invoice?.InvoiceDate.ToString("dd-MM-yyyy") ?? DateTime.Now.ToString("dd-MM-yyyy");
        var custName = invoice?.CustomerName ?? "Apollo Medico Retail Chemists";
        var custGstin = invoice?.CustomerGSTIN ?? "27AAAAA1234A1Z5";
        var custAddress = invoice?.BillingAddress ?? "Plot No. 14, Commercial Complex, Nehru Place, New Delhi - 110019";

        var totalAmount = invoice?.TotalAmount ?? 1092.00m;
        var taxable = invoice?.TaxableAmount ?? 975.00m;
        var totalTax = (invoice?.CgstAmount ?? 58.50m) + (invoice?.SgstAmount ?? 58.50m) + (invoice?.IgstAmount ?? 0m);

        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasPacking = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(ExtractItemPharmaAttributes(i).pack)) ?? true;

        var itemsRows = new System.Text.StringBuilder();
        if (invoice != null && invoice.Items.Any())
        {
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var expStr = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                itemsRows.Append($@"
                <tr style='font-size:10px; border-bottom:1px solid #cbd5e1;'>
                    <td style='padding:4px; text-align:center;'>{idx++}</td>
                    <td style='padding:4px;'><strong>{it.ItemName}</strong></td>
                    {(hasPacking ? $"<td style='padding:4px; text-align:center;'>{(string.IsNullOrEmpty(attrs.pack) ? "-" : attrs.pack)}</td>" : "")}
                    <td style='padding:4px; text-align:center; font-family:monospace;'>{it.HsnCode ?? "3004"}</td>
                    {(hasBatch ? $"<td style='padding:4px; text-align:center; font-family:monospace;'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:4px; text-align:center;'>{expStr}</td>" : "")}
                    <td style='padding:4px; text-align:right; font-weight:bold;'>{it.Quantity:N0}</td>
                    {(hasFree ? $"<td style='padding:4px; text-align:center; color:#047857;'>{attrs.freeQty:N0}</td>" : "")}
                    <td style='padding:4px; text-align:right;'>₹{it.UnitPrice:N2}</td>
                    <td style='padding:4px; text-align:right;'>₹{it.Mrp:N2}</td>
                    <td style='padding:4px; text-align:center;'>{it.GstRate:N0}%</td>
                    <td style='padding:4px; text-align:right; font-weight:bold; font-family:monospace;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            itemsRows.Append(@"
                <tr style='font-size:10px; border-bottom:1px solid #cbd5e1;'>
                    <td style='padding:4px; text-align:center;'>1</td>
                    <td style='padding:4px;'><strong>Augmentin 625 Duo Tablet</strong></td>
                    <td style='padding:4px; text-align:center;'>10x10</td>
                    <td style='padding:4px; text-align:center;'>30042010</td>
                    <td style='padding:4px; text-align:center;'>AUG-26-A1</td>
                    <td style='padding:4px; text-align:center;'>11/27</td>
                    <td style='padding:4px; text-align:right; font-weight:bold;'>5</td>
                    <td style='padding:4px; text-align:right;'>₹195.00</td>
                    <td style='padding:4px; text-align:right;'>₹223.50</td>
                    <td style='padding:4px; text-align:center;'>12%</td>
                    <td style='padding:4px; text-align:right; font-weight:bold; font-family:monospace;'>₹1,092.00</td>
                </tr>");
        }

        return $@"
        <div style='font-family:Arial, sans-serif; font-size:11px; color:#000; width:100%; max-width:800px; margin:0 auto; border:2px solid #1e3a8a; box-sizing:border-box; background:#fff; min-height:270mm;'>
            <!-- Top Marg Blue Header -->
            <div style='background:#1e3a8a; color:#fff; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;'>
                <div>
                    <div style='font-size:18px; font-weight:900; text-transform:uppercase;'>{sellerName}</div>
                    <div style='font-size:10.5px; opacity:0.9;'>{sellerAddress}</div>
                    <div style='font-size:10px; margin-top:2px; font-family:monospace;'>GSTIN: {sellerGstin} | D.L. No: {sellerDl} | FSSAI: {sellerFssai}</div>
                </div>
                <div style='text-align:right;'>
                    <div style='font-size:14px; font-weight:900; background:#fff; color:#1e3a8a; padding:2px 10px; border-radius:3px;'>{headerTitle}</div>
                    <div style='font-size:9px; margin-top:3px; opacity:0.85;'>ORIGINAL FOR RECIPIENT</div>
                </div>
            </div>

            <!-- Buyer Details Box -->
            <div style='display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #1e3a8a; padding:6px 10px; background:#f8fafc; font-size:11px;'>
                <div>
                    <div style='font-size:9px; font-weight:bold; color:#475569;'>PARTY NAME &amp; ADDRESS:</div>
                    <strong style='font-size:13px; color:#0f172a;'>{custName}</strong>
                    <div style='color:#334155;'>{custAddress}</div>
                    <div>GSTIN: <strong style='font-family:monospace;'>{custGstin}</strong></div>
                </div>
                <div style='text-align:right; font-size:11px;'>
                    <div>Invoice No: <strong style='font-size:12px; font-family:monospace;'>{invNo}</strong></div>
                    <div>Date: <strong>{invDate}</strong></div>
                    <div>Payment Terms: <strong>Due in 21 Days</strong></div>
                </div>
            </div>

            <!-- Items Table -->
            <table style='width:100%; border-collapse:collapse; border-bottom:1px solid #1e3a8a;'>
                <thead>
                    <tr style='background:#e2e8f0; font-size:9.5px; font-weight:bold; border-bottom:1px solid #cbd5e1; text-transform:uppercase;'>
                        <th style='padding:5px 4px; width:25px;'>#</th>
                        <th style='padding:5px; text-align:left;'>Item Description</th>
                        {(hasPacking ? "<th style='padding:5px; width:50px; text-align:center;'>Pack</th>" : "")}
                        <th style='padding:5px; width:65px; text-align:center;'>HSN</th>
                        {(hasBatch ? "<th style='padding:5px; width:65px; text-align:center;'>Batch</th>" : "")}
                        {(hasExpiry ? "<th style='padding:5px; width:50px; text-align:center;'>Exp</th>" : "")}
                        <th style='padding:5px; width:45px; text-align:right;'>Qty</th>
                        {(hasFree ? "<th style='padding:5px; width:40px; text-align:center;'>Free</th>" : "")}
                        <th style='padding:5px; width:60px; text-align:right;'>Rate</th>
                        <th style='padding:5px; width:60px; text-align:right;'>MRP</th>
                        <th style='padding:5px; width:45px; text-align:center;'>GST</th>
                        <th style='padding:5px; width:75px; text-align:right;'>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {itemsRows}
                </tbody>
            </table>

            <!-- Bottom Marg Tax & Summary Bar -->
            <div style='display:grid; grid-template-columns:1fr 260px; padding:8px 10px; border-bottom:1px solid #1e3a8a; background:#f8fafc;'>
                <div style='font-size:10px; color:#475569;'>
                    <strong>Terms &amp; Conditions:</strong><br/>
                    1. Goods once sold will not be taken back.<br/>
                    2. Interest @ 24% p.a. will be charged after due date.<br/>
                    3. Store medicines at recommended temperature under 25°C.
                </div>
                <div style='font-size:11px; text-align:right;'>
                    <div>Taxable: <strong>₹{taxable:N2}</strong></div>
                    <div>Total GST: <strong>₹{totalTax:N2}</strong></div>
                    <div style='font-size:14px; font-weight:900; color:#1e3a8a; margin-top:4px; border-top:1px solid #cbd5e1; padding-top:4px;'>
                        Net Payable: ₹{totalAmount:N2}
                    </div>
                </div>
            </div>

            <div style='display:flex; justify-content:space-between; align-items:center; padding:6px 12px; font-size:9.5px;'>
                <div>Multi-Tax Distribution Format | Certified Genuine Supply</div>
                <div>For <strong>{sellerName}</strong> — Authorized Signatory</div>
            </div>
        </div>";
    }

    private static string RenderMyBillBookInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOGBILL SMART RETAIL & TRADERS");
        var sellerAddress = !string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Shop 4, Commercial Market, Sector 18, Noida - 201301";
        var sellerGstin = !string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AABCS8819Q1ZT";
        var sellerPhone = tenant?.PrimaryPhone ?? "9876543210";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00009";
        var invDate = invoice?.InvoiceDate.ToString("dd MMM yyyy") ?? DateTime.Now.ToString("dd MMM yyyy");
        var custName = invoice?.CustomerName ?? "Apollo Medico Retail Chemists";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custPhone = invoice?.CustomerPhone ?? "";

        var totalAmount = invoice?.TotalAmount ?? 1092.00m;
        var taxable = invoice?.TaxableAmount ?? 975.00m;
        var totalTax = (invoice?.CgstAmount ?? 58.50m) + (invoice?.SgstAmount ?? 58.50m) + (invoice?.IgstAmount ?? 0m);

        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiQrPayload = !string.IsNullOrEmpty(upiId) ? $"upi://pay?pa={upiId}&pn={Uri.EscapeDataString(sellerName)}&am={totalAmount:F2}&cu=INR&tn={invNo}" : "";
        var qrImgTag = !string.IsNullOrEmpty(upiQrPayload) ? $"<img src='https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={Uri.EscapeDataString(upiQrPayload)}' style='width:80px; height:80px; border-radius:6px;' />" : "";

        var itemsRows = new System.Text.StringBuilder();
        if (invoice != null && invoice.Items.Any())
        {
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                itemsRows.Append($@"
                <tr style='font-size:11px; border-bottom:1px solid #f1f5f9;'>
                    <td style='padding:8px 6px; text-align:center;'>{idx++}</td>
                    <td style='padding:8px 6px;'><strong>{it.ItemName}</strong><br/><span style='font-size:9.5px; color:#64748b;'>HSN: {it.HsnCode ?? "3004"}</span></td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold;'>{it.Quantity:N0} {it.UomCode}</td>
                    <td style='padding:8px 6px; text-align:right;'>₹{it.UnitPrice:N2}</td>
                    <td style='padding:8px 6px; text-align:center;'>{it.GstRate:N0}%</td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; color:#4f46e5;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            itemsRows.Append(@"
                <tr style='font-size:11px; border-bottom:1px solid #f1f5f9;'>
                    <td style='padding:8px 6px; text-align:center;'>1</td>
                    <td style='padding:8px 6px;'><strong>Augmentin 625 Duo Tablet</strong><br/><span style='font-size:9.5px; color:#64748b;'>HSN: 30042010</span></td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold;'>5 STP</td>
                    <td style='padding:8px 6px; text-align:right;'>₹195.00</td>
                    <td style='padding:8px 6px; text-align:center;'>12%</td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; color:#4f46e5;'>₹1,092.00</td>
                </tr>");
        }

        return $@"
        <div style='font-family:Inter, Arial, sans-serif; font-size:11px; color:#1e293b; width:100%; max-width:800px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); background:#fff; min-height:270mm;'>
            <!-- Modern Accent Banner -->
            <div style='background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;'>
                <div>
                    <div style='font-size:20px; font-weight:900; letter-spacing:0.5px;'>{sellerName}</div>
                    <div style='font-size:11px; opacity:0.9; margin-top:2px;'>{sellerAddress}</div>
                    <div style='font-size:10.5px; opacity:0.85; margin-top:3px;'>GSTIN: {sellerGstin} | Contact: {sellerPhone}</div>
                </div>
                <div style='text-align:right;'>
                    <div style='background:rgba(255,255,255,0.2); padding:4px 14px; border-radius:20px; font-size:13px; font-weight:bold;'>{headerTitle}</div>
                    <div style='font-size:9.5px; margin-top:4px; opacity:0.8;'>ORIGINAL FOR RECIPIENT</div>
                </div>
            </div>

            <!-- Customer & Invoice Cards -->
            <div style='display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px 16px; background:#f8fafc; border-bottom:1px solid #e2e8f0;'>
                <div style='background:#fff; padding:10px 12px; border-radius:8px; border:1px solid #e2e8f0;'>
                    <div style='font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase;'>Billed To:</div>
                    <div style='font-size:13px; font-weight:bold; color:#0f172a; margin-top:2px;'>{custName}</div>
                    {(string.IsNullOrEmpty(custPhone) ? "" : $"<div style='font-size:10.5px; color:#475569;'>Phone: {custPhone}</div>")}
                    {(string.IsNullOrEmpty(custGstin) ? "" : $"<div style='font-size:10.5px; color:#475569;'>GSTIN: {custGstin}</div>")}
                </div>
                <div style='background:#fff; padding:10px 12px; border-radius:8px; border:1px solid #e2e8f0; text-align:right;'>
                    <div style='font-size:9.5px; font-weight:bold; color:#64748b; text-transform:uppercase;'>Invoice Details:</div>
                    <div style='font-size:13px; font-weight:bold; color:#4f46e5; margin-top:2px;'>#{invNo}</div>
                    <div style='font-size:10.5px; color:#475569;'>Date: {invDate}</div>
                </div>
            </div>

            <!-- Items Table -->
            <table style='width:100%; border-collapse:collapse;'>
                <thead>
                    <tr style='background:#f1f5f9; font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;'>
                        <th style='padding:8px 6px; width:30px; text-align:center;'>#</th>
                        <th style='padding:8px 6px; text-align:left;'>Item Details</th>
                        <th style='padding:8px 6px; width:70px; text-align:right;'>Qty</th>
                        <th style='padding:8px 6px; width:80px; text-align:right;'>Rate</th>
                        <th style='padding:8px 6px; width:50px; text-align:center;'>Tax</th>
                        <th style='padding:8px 6px; width:90px; text-align:right;'>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {itemsRows}
                </tbody>
            </table>

            <!-- Bottom Summary & Instant QR -->
            <div style='display:grid; grid-template-columns:1fr 100px 200px; gap:12px; padding:14px 16px; border-top:2px solid #e2e8f0; background:#f8fafc; align-items:center;'>
                <div style='font-size:10px; color:#64748b;'>
                    🎉 Thank you for choosing {sellerName}!<br/>
                    For questions or support, contact {sellerPhone}.
                </div>
                <div style='text-align:center;'>
                    {qrImgTag}
                </div>
                <div style='font-size:11px; text-align:right;'>
                    <div style='color:#64748b;'>Taxable: ₹{taxable:N2}</div>
                    <div style='color:#64748b;'>GST Tax: ₹{totalTax:N2}</div>
                    <div style='font-size:16px; font-weight:900; color:#4f46e5; margin-top:4px;'>
                        Total: ₹{totalAmount:N2}
                    </div>
                </div>
            </div>
        </div>";
    }

    private static string RenderCboErpInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        return RenderTallyPrimeInvoiceHtml(t, invoice, tenant);
    }

    private static string RenderDedicatedPharmaTaxInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        return RenderMargErpInvoiceHtml(t, invoice, tenant);
    }

    private static string RenderModernGstInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        return RenderTallyPrimeInvoiceHtml(t, invoice, tenant);
    }

    private static string RenderThermalSlipHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        return RenderMyBillBookInvoiceHtml(t, invoice, tenant);
    }
}
