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
using UdyogBill.Domain.Entities.Purchases;
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

        var existingCodes = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted)
            .Select(t => t.TemplateCode)
            .ToListAsync(cancellationToken);

        if (!existingCodes.Contains("TPL_UDYOGBILL_SIGNATURE_B2B"))
        {
            await SeedDefaultTemplatesAsync(tenantId, cancellationToken);
        }
        if (!existingCodes.Contains("TPL_PHARMA_PRO_TAX_INVOICE"))
        {
            var proTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Pharma & FMCG Classic Tax Invoice (A4 Grid Edition)",
                TemplateCode = "TPL_PHARMA_PRO_TAX_INVOICE",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#c2410c",
                SecondaryColorHex = "#334155",
                HeaderTitle = "Tax Invoice",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true
            };
            _context.PrintTemplates.Add(proTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!existingCodes.Contains("TPL_MARG_HALF_PAGE_A5"))
        {
            var margTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Marg Pharma Classic Half-Page Tax Invoice (A5)",
                TemplateCode = "TPL_MARG_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#166534",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true
            };
            _context.PrintTemplates.Add(margTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!existingCodes.Contains("TPL_CASH_MEMO_HALF_PAGE_A5"))
        {
            var cashMemoTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.POSReceipt,
                TemplateName = "Pharma Retail Cash Memo (A5 Half-Page Non-GST)",
                TemplateCode = "TPL_CASH_MEMO_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#166534",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "CASH MEMO",
                HeaderSubtitle = "Retail Counter Sale Memo",
                ShowGstin = false,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = false,
                ShowBatchExpiry = true,
                ShowDeclaration = false
            };
            _context.PrintTemplates.Add(cashMemoTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!existingCodes.Contains("TPL_PURCHASE_ORDER_EXECUTIVE"))
        {
            var poTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.PurchaseOrder,
                TemplateName = "Executive Commercial Purchase Order (A4)",
                TemplateCode = "TPL_PURCHASE_ORDER_EXECUTIVE",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#0d9488",
                SecondaryColorHex = "#334155",
                HeaderTitle = "PURCHASE ORDER",
                HeaderSubtitle = "Commercial Procurement Order",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = false,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "This Purchase Order constitutes a binding commercial agreement upon vendor acceptance. Goods must strictly match specified terms, quality parameters, and delivery schedule."
            };
            _context.PrintTemplates.Add(poTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!existingCodes.Contains("TPL_CREDIT_NOTE_STATUTORY"))
        {
            var cnTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.CreditNote,
                TemplateName = "Statutory GST Credit Note (A4 Section 34)",
                TemplateCode = "TPL_CREDIT_NOTE_STATUTORY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#059669",
                SecondaryColorHex = "#1e293b",
                HeaderTitle = "GST CREDIT NOTE",
                HeaderSubtitle = "Issued under Section 34 of CGST Act, 2017 & Rule 53 of CGST Rules",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "This Credit Note is issued in accordance with Section 34 of the CGST Act, 2017. The corresponding output tax liability and customer input tax credit reversal have been accounted for."
            };
            _context.PrintTemplates.Add(cnTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var legacyTemplates = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted && 
                        t.TemplateCode != "TPL_UDYOGBILL_SIGNATURE_B2B" && 
                        t.TemplateCode != "TPL_PHARMA_PRO_TAX_INVOICE" && 
                        t.TemplateCode != "TPL_MARG_HALF_PAGE_A5" && 
                        t.TemplateCode != "TPL_CASH_MEMO_HALF_PAGE_A5" && 
                        t.TemplateCode != "TPL_PURCHASE_ORDER_EXECUTIVE" && 
                        t.TemplateCode != "TPL_CREDIT_NOTE_STATUTORY" && 
                        t.TemplateCode != "TPL_POS_THERMAL_80MM")
            .ToListAsync(cancellationToken);

        if (legacyTemplates.Any())
        {
            foreach (var leg in legacyTemplates)
            {
                leg.IsDeleted = true;
                leg.DeletedAtUtc = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Clean up any duplicate POS thermal slips if multiple exist
        var thermalSlips = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted && t.TemplateCode == "TPL_POS_THERMAL_80MM")
            .OrderByDescending(t => t.IsDefault)
            .ThenByDescending(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        if (thermalSlips.Count > 1)
        {
            foreach (var extra in thermalSlips.Skip(1))
            {
                extra.IsDeleted = true;
                extra.DeletedAtUtc = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        var query = _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted && 
                        (t.TemplateCode == "TPL_UDYOGBILL_SIGNATURE_B2B" || 
                         t.TemplateCode == "TPL_PHARMA_PRO_TAX_INVOICE" || 
                         t.TemplateCode == "TPL_MARG_HALF_PAGE_A5" || 
                         t.TemplateCode == "TPL_CASH_MEMO_HALF_PAGE_A5" || 
                         t.TemplateCode == "TPL_PURCHASE_ORDER_EXECUTIVE" || 
                         t.TemplateCode == "TPL_CREDIT_NOTE_STATUTORY" || 
                         t.TemplateCode == "TPL_POS_THERMAL_80MM"));

        if (documentType.HasValue)
        {
            query = query.Where(t => t.DocumentType == documentType.Value);
        }

        var list = await query
            .OrderByDescending(t => t.IsDefault)
            .ThenBy(t => t.DocumentType)
            .ThenBy(t => t.TemplateName)
            .Select(t => MapToDto(t))
            .ToListAsync(cancellationToken);

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

    public async Task<Result<bool>> DeleteTemplateAsync(Guid templateId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var t = await _context.PrintTemplates
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == templateId && !x.IsDeleted, cancellationToken);

        if (t == null)
        {
            return Result<bool>.Failure("Print template not found.", "NOT_FOUND");
        }

        if (t.IsDefault)
        {
            return Result<bool>.Failure("Cannot delete the active default print template.", "DEFAULT_TEMPLATE_LOCKED");
        }

        t.IsDeleted = true;
        t.DeletedAtUtc = DateTime.UtcNow;
        t.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Delete,
            ActionName = "DeletePrintTemplate",
            EntityName = "PrintTemplate",
            EntityId = templateId.ToString(),
            IpAddress = ipAddress
        }, cancellationToken);

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

        if (template == null && request.DocumentType.HasValue)
        {
            if (request.DocumentType == PrintDocumentType.POSReceipt)
            {
                template = await _context.PrintTemplates
                    .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.DocumentType == request.DocumentType.Value && t.TemplateCode == "TPL_CASH_MEMO_HALF_PAGE_A5" && !t.IsDeleted, cancellationToken);
            }

            if (template == null)
            {
                template = await _context.PrintTemplates
                    .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.DocumentType == request.DocumentType.Value && t.IsDefault && !t.IsDeleted, cancellationToken);
            }

            if (template == null)
            {
                template = await _context.PrintTemplates
                    .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.DocumentType == request.DocumentType.Value && !t.IsDeleted, cancellationToken);
            }
        }

        if (template == null)
        {
            template = await _context.PrintTemplates
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.IsDefault && !t.IsDeleted, cancellationToken);
        }

        if (template == null)
        {
            await SeedDefaultTemplatesAsync(tenantId, cancellationToken);
            template = await _context.PrintTemplates
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.IsDefault && !t.IsDeleted, cancellationToken);
        }

        if (template == null)
        {
            return Result<RenderPrintPreviewResultDto>.Failure("No print template available to render.", "NO_TEMPLATE");
        }

        var docId = request.DocumentId ?? request.InvoiceId;

        SalesInvoice? invoice = null;
        PurchaseOrder? purchaseOrder = null;
        SalesReturn? salesReturn = null;

        if (docId.HasValue)
        {
            if (template.DocumentType == PrintDocumentType.PurchaseOrder)
            {
                purchaseOrder = await _context.PurchaseOrders
                    .Include(p => p.Items)
                    .Include(p => p.Party)
                    .Include(p => p.Branch)
                    .Include(p => p.Warehouse)
                    .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == docId.Value && !p.IsDeleted, cancellationToken);
            }
            else if (template.DocumentType == PrintDocumentType.CreditNote)
            {
                salesReturn = await _context.SalesReturns
                    .Include(r => r.Items)
                    .Include(r => r.Party)
                    .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == docId.Value && !r.IsDeleted, cancellationToken);
            }

            if (purchaseOrder == null && salesReturn == null)
            {
                invoice = await _context.SalesInvoices
                    .Include(i => i.Items)
                    .Include(i => i.Party)
                    .Include(i => i.Branch)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == docId.Value && !i.IsDeleted, cancellationToken);
            }
        }

        List<SalesReturn>? invoiceReturns = null;
        if (invoice != null)
        {
            invoiceReturns = await _context.SalesReturns
                .Where(r => r.TenantId == tenantId && r.OriginalSalesInvoiceId == invoice.Id && !r.IsCancelled && !r.IsDeleted)
                .OrderByDescending(r => r.ReturnDate)
                .ToListAsync(cancellationToken);
        }

        var tenant = await _context.Tenants.FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken);
        var html = GenerateRenderedHtml(template, invoice, tenant, purchaseOrder, salesReturn);

        if (invoice != null && (invoice.IsCancelled || (invoiceReturns != null && invoiceReturns.Count > 0)))
        {
            html = InjectInvoiceStatusWatermarkAndBanner(html, invoice, invoiceReturns);
        }

        var css = template.CustomCss ?? GetDefaultCss(template);

        return Result<RenderPrintPreviewResultDto>.Success(new RenderPrintPreviewResultDto(
            template.TemplateName,
            template.PageSize,
            html,
            css
        ));
    }

    private static string InjectInvoiceStatusWatermarkAndBanner(string html, SalesInvoice invoice, List<SalesReturn>? invoiceReturns)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append("<div style='position:relative; width:100%; height:100%;'>");

        if (invoice.IsCancelled)
        {
            var cancelDate = invoice.CancelledAtUtc.HasValue ? invoice.CancelledAtUtc.Value.ToString("dd/MM/yyyy HH:mm") : "N/A";
            var reason = string.IsNullOrWhiteSpace(invoice.CancellationReason) ? "Cancelled" : invoice.CancellationReason;
            sb.Append($@"
<div style='background-color:#fee2e2; border:2px solid #ef4444; border-radius:6px; padding:8px 12px; margin-bottom:10px; text-align:center; color:#991b1b; font-family:sans-serif;'>
    <div style='font-size:15px; font-weight:900; letter-spacing:1.5px; text-transform:uppercase;'>&#10006; CANCELLED / VOID INVOICE</div>
    <div style='font-size:11px; margin-top:2px; font-weight:600;'>This invoice was CANCELLED on {cancelDate} UTC. Reason: {reason}</div>
    <div style='font-size:9.5px; color:#b91c1c; font-weight:bold; margin-top:2px;'>NOT VALID FOR PAYMENT, ACCOUNTING OR INPUT TAX CREDIT (ITC)</div>
</div>
<div style='position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); font-size:60px; font-weight:900; color:rgba(239, 68, 68, 0.20); border:5px solid rgba(239, 68, 68, 0.25); padding:10px 40px; border-radius:12px; pointer-events:none; z-index:9999; text-transform:uppercase; letter-spacing:4px; font-family:sans-serif;'>
    CANCELLED
</div>");
        }
        else if (invoiceReturns != null && invoiceReturns.Count > 0)
        {
            var cnNumbers = string.Join(", ", invoiceReturns.Select(r => r.CreditNoteNumber));
            var cnTotal = invoiceReturns.Sum(r => r.TotalAmount);
            var cnDate = invoiceReturns[0].ReturnDate.ToString("dd/MM/yyyy");
            sb.Append($@"
<div style='background-color:#fef3c7; border:2px solid #f59e0b; border-radius:6px; padding:8px 12px; margin-bottom:10px; text-align:center; color:#92400e; font-family:sans-serif;'>
    <div style='font-size:14px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#b45309;'>&#9888; CREDIT NOTE ISSUED / SALE RETURN PROCESSED</div>
    <div style='font-size:11px; margin-top:3px; font-weight:bold; color:#78350f;'>
        Credit Note No: <span style='font-family:monospace; font-size:12px; color:#b45309;'>{cnNumbers}</span>
        &nbsp;&bull;&nbsp; Return Total: <span style='color:#b45309;'>&#8377;{cnTotal:N2}</span>
        &nbsp;&bull;&nbsp; Return Date: {cnDate}
    </div>
    <div style='font-size:9.5px; color:#92400e; margin-top:2px;'>Goods/services against this invoice have been returned. Refer to Credit Note for net ledger adjustment.</div>
</div>
<div style='position:absolute; top:40%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); font-size:46px; font-weight:900; color:rgba(217, 119, 6, 0.18); border:5px solid rgba(217, 119, 6, 0.25); padding:10px 30px; border-radius:12px; pointer-events:none; z-index:9999; text-transform:uppercase; letter-spacing:3px; font-family:sans-serif;'>
    CREDIT NOTE ISSUED
</div>");
        }

        sb.Append(html);
        sb.Append("</div>");
        return sb.ToString();
    }

    private static bool IsA5Size(PrintTemplate t)
    {
        return t.PageSize == PageSizeFormat.A5 || t.PageSize == PageSizeFormat.A5_Portrait || t.PageSize == PageSizeFormat.A5_Landscape || (int)t.PageSize == 10;
    }

    private static string GetContainerHeightStyle(PrintTemplate t)
    {
        if (IsA5Size(t))
        {
            return "min-height:138mm; height:auto;";
        }
        return "min-height:274mm; height:auto;";
    }

    // ==============================================================================
    // 🌐 ROUTER DISPATCHER
    // ==============================================================================
    private static string GenerateRenderedHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null, PurchaseOrder? purchaseOrder = null, SalesReturn? salesReturn = null)
    {
        var code = t.TemplateCode?.ToUpperInvariant() ?? "";

        // 0.1 Executive Commercial Purchase Order (A4)
        if (code.Contains("PURCHASE_ORDER") || t.DocumentType == PrintDocumentType.PurchaseOrder)
        {
            return RenderPurchaseOrderExecutiveHtml(t, purchaseOrder, invoice, tenant);
        }

        // 0.2 Statutory GST Credit Note (A4 Section 34)
        if (code.Contains("CREDIT_NOTE") || t.DocumentType == PrintDocumentType.CreditNote)
        {
            return RenderCreditNoteStatutoryHtml(t, salesReturn, invoice, tenant);
        }

        // 1. Thermal POS Slip
        if (code.Contains("THERMAL") || t.PageSize == PageSizeFormat.Thermal_80mm || t.PageSize == PageSizeFormat.Thermal_58mm)
        {
            return RenderThermalSlipHtml(t, invoice, tenant);
        }

        // 2. Pharma & FMCG Classic Grid Tax Invoice (Exact Layout Match)
        if (code.Contains("PHARMA_PRO") || code.Contains("TPL_PHARMA_PRO_TAX_INVOICE"))
        {
            return RenderPharmaProTaxInvoiceHtml(t, invoice, tenant);
        }

        // 3. UdyogBill Signature Adaptive B2B Tax Invoice (Enterprise Grade Flagship)
        if (code.Contains("UDYOGBILL_SIGNATURE") || code.Contains("SIGNATURE_B2B") || code.Contains("B2B_LOGISTICS") || code.Contains("TPL_B2B_LOGISTICS_A4"))
        {
            return RenderUdyogBillSignatureB2BHtml(t, invoice, tenant);
        }

        // 3. Tally Prime Style (ERP Classic)
        if (code.Contains("TALLY") || code.Contains("TPL_B2B_TALLY"))
        {
            return RenderTallyPrimeInvoiceHtml(t, invoice, tenant);
        }

        // 4. Pharma Retail Cash Memo (A5 Half-Page Non-GST Estimate)
        if (code.Contains("TPL_CASH_MEMO_HALF_PAGE_A5") || (code.Contains("CASH_MEMO") && (code.Contains("HALF_PAGE") || code.Contains("A5"))))
        {
            return RenderCashMemoHalfPageHtml(t, invoice, tenant);
        }

        // 5. Marg ERP Style (Pharma / FMCG Distribution Blue Header)
        if (code.Contains("MARG") || code.Contains("PHARMA_STOCKIST") || code.Contains("TPL_B2B_MARG") || code.Contains("TPL_D2C_MARG") || code.Contains("TPL_CASH_MARG"))
        {
            return RenderMargErpInvoiceHtml(t, invoice, tenant);
        }

        // 5. MyBillBook / Vyapar Style (Modern Purple Gradient Card)
        if (code.Contains("MYBILLBOOK") || code.Contains("VYAPAR") || code.Contains("TPL_D2C_MYBILLBOOK") || code.Contains("TPL_CASH_MYBILLBOOK") || code.Contains("TPL_D2C_VYAPAR") || code.Contains("TPL_CASH_VYAPAR"))
        {
            return RenderMyBillBookInvoiceHtml(t, invoice, tenant);
        }

        // 6. CBO ERP / PCD Pharma Style (Green Accent)
        if (code.Contains("CBO") || code.Contains("GENERIC_SALT") || code.Contains("TPL_PHARMA_GENERIC_SALT"))
        {
            return RenderCboErpInvoiceHtml(t, invoice, tenant);
        }

        // 7. Pharma Retail Chemist Rx Bill (Red Header & Doctor Details)
        if (code.Contains("PHARMA_RX") || code.Contains("CHEMIST") || code.Contains("TPL_PHARMA_RX_CHEMIST"))
        {
            return RenderPharmaRxHtml(t, invoice, tenant);
        }

        // 8. Compact Trade Memo (A5 Teal)
        if (code.Contains("A5") || code.Contains("COMPACT") || t.PageSize == PageSizeFormat.A5 || code.Contains("TPL_A5_COMPACT_TRADE"))
        {
            return RenderA5CompactHtml(t, invoice, tenant);
        }

        // Flagship Default Fallback: UdyogBill Signature B2B
        return RenderUdyogBillSignatureB2BHtml(t, invoice, tenant);
    }

    // ==============================================================================
    // 1. 🏆 UDYOGBILL SIGNATURE ADAPTIVE B2B TAX INVOICE (ENTERPRISE GRADE UP TO 10 CR+)
    // ==============================================================================
    private static string RenderUdyogBillSignatureB2BHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) ? t.PrimaryColorHex : "#1e40af";
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) ? t.SecondaryColorHex : "#0f172a";

        // Seller Identification
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : (invoice != null ? "Store" : "UDYOG SOFTWARE TECHNOLOGIES ENTERPRISE"));
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : (invoice != null ? "" : "Plot 42, Tech City Industrial Area, Sector 62, Noida, Uttar Pradesh - 201309"));

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerState = !string.IsNullOrWhiteSpace(invoice?.Branch?.State)
            ? $"{invoice.Branch.State}{(string.IsNullOrWhiteSpace(invoice.Branch.StateCode) ? "" : $" (Code: {invoice.Branch.StateCode})")}"
            : (!string.IsNullOrWhiteSpace(tenant?.State) ? $"{tenant.State}{(string.IsNullOrWhiteSpace(tenant.StateCode) ? "" : $" (Code: {tenant.StateCode})")}" : (invoice != null ? "-" : "Uttar Pradesh (Code: 09)"));

        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var sellerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "";

        // Invoice Metadata
        var invNo = invoice?.InvoiceNumber ?? "UB/26-27/00142";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yyyy") ?? DateTime.Now.ToString("dd-MMM-yyyy");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("dd-MMM-yyyy") : "";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply)
            ? invoice.PlaceOfSupply
            : (!string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : (invoice != null ? sellerState : "09 - Uttar Pradesh"));

        // Customer Details
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Cash Customer" : "APEX HEALTHCARE DISTRIBUTORS & ENTERPRISES PVT LTD");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custPan = !string.IsNullOrWhiteSpace(invoice?.CustomerPAN) ? invoice.CustomerPAN : (custGstin.Length >= 12 ? custGstin.Substring(2, 10) : "");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : (invoice != null ? "" : "Shop 12, Wholesale Market, Connaught Place, New Delhi - 110001");
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custStateCode = !string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : (invoice != null ? "" : "07 - Delhi");
        var custDl = ExtractInvoiceBuyerDl(invoice);

        // Logistics & Transport Metadata
        var transporter = !string.IsNullOrWhiteSpace(invoice?.TransporterName) ? invoice.TransporterName : "";
        var transporterId = !string.IsNullOrWhiteSpace(invoice?.TransporterId) ? invoice.TransporterId : "";
        var vehicleNo = !string.IsNullOrWhiteSpace(invoice?.VehicleNumber) ? invoice.VehicleNumber : "";
        var lrNo = !string.IsNullOrWhiteSpace(invoice?.LrNumber) ? invoice.LrNumber : "";
        var lrDate = invoice?.LrDate?.ToString("dd-MMM-yyyy") ?? "";
        var eWayNo = !string.IsNullOrWhiteSpace(invoice?.EWayBillNumber) ? invoice.EWayBillNumber : "";
        var poNo = !string.IsNullOrWhiteSpace(invoice?.PoNumber) ? invoice.PoNumber : "";
        var poDate = invoice?.PoDate?.ToString("dd-MMM-yyyy") ?? "";

        // E-Invoice / IRN Extraction from AttributesJson if available
        string irn = "";
        string ackNo = "";
        string ackDate = "";
        if (!string.IsNullOrEmpty(invoice?.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(invoice.AttributesJson);
                if (doc.RootElement.TryGetProperty("irn", out var i)) irn = i.GetString() ?? "";
                if (doc.RootElement.TryGetProperty("ackNo", out var a)) ackNo = a.GetString() ?? "";
                if (doc.RootElement.TryGetProperty("ackDate", out var d)) ackDate = d.GetString() ?? "";
            }
            catch {}
        }

        bool hasLogistics = !string.IsNullOrWhiteSpace(transporter) || !string.IsNullOrWhiteSpace(vehicleNo) ||
                            !string.IsNullOrWhiteSpace(lrNo) || !string.IsNullOrWhiteSpace(eWayNo) ||
                            !string.IsNullOrWhiteSpace(poNo) || !string.IsNullOrWhiteSpace(irn);

        // Financial Totals (Handles 10 Cr+ Scale with full 2 decimal precision)
        var totalAmount = invoice?.TotalAmount ?? 47200.00m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount / 1.18m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? (totalAmount - taxable);
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // Bank & Dynamic UPI QR (100% Genuine, Zero Dummy Fallbacks)
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var bankBranch = !string.IsNullOrWhiteSpace(tenant?.BankBranch) ? tenant.BankBranch : "";
        var rawUpi = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiId = (!string.IsNullOrWhiteSpace(rawUpi) && !rawUpi.Contains("9876543210") && !rawUpi.Contains("example.com")) ? rawUpi : "";
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount}%26cu%3DINR"
            : "";

        bool hasValidBank = t.ShowBankDetails && (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(bankAcc) || !string.IsNullOrWhiteSpace(bankIfsc));
        bool hasValidUpi = t.ShowUpiQr && !string.IsNullOrWhiteSpace(upiId);
        bool showSettlementCard = hasValidBank || hasValidUpi;

        // Dynamic Addon Detection: Look at invoice items and tenant configuration
        var tradeTier = ExtractInvoiceTradeTier(invoice);
        bool hasPharmaAddon = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber) || i.ExpiryDate.HasValue) ?? true;
        bool hasDiscount = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;
        bool hasFreeScheme = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasMrp = invoice?.Items.Any(i => i.Mrp > 0) ?? true;
        bool hasPtr = invoice != null 
            ? (invoice.Items.Any(i => ExtractItemPharmaAttributes(i).ptr > 0) || tradeTier == "company_to_stockist" || tradeTier == "stockist_to_chemist" || (hasPharmaAddon && hasMrp))
            : true;
        bool hasPts = invoice != null 
            ? (invoice.Items.Any(i => ExtractItemPharmaAttributes(i).pts > 0) || tradeTier == "company_to_stockist")
            : true;

        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, primaryColor);
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='invoice-container udyogbill-signature' style='font-family:{t.FontFamily}; width:100%; max-width:840px; {heightStyle} margin:0 auto; padding:12px 16px; border:2px solid {primaryColor}; box-sizing:border-box; background:#ffffff; color:#0f172a; font-size:10.5px; display:flex; flex-direction:column; justify-content:space-between;'>

    <!-- TOP LEGAL HEADER & ENTERPRISE METADATA -->
    <div>
        <div style='display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid {primaryColor}; padding-bottom:10px;'>
            <div style='max-width:64%;'>
                <div style='display:flex; align-items:center; gap:8px;'>
                    <span style='background:{primaryColor}; color:#ffffff; font-weight:900; font-size:10px; padding:2px 7px; border-radius:3px; letter-spacing:0.5px;'>UDYOGBILL</span>
                    <h1 style='color:{primaryColor}; margin:0; font-size:21px; font-weight:900; letter-spacing:-0.2px; line-height:1.2;'>{sellerName}</h1>
                </div>
                {(sellerLegalName != sellerName ? $"<div style='font-size:10px; color:#475569; font-weight:bold; margin-top:1px;'>Legal Name: {sellerLegalName}</div>" : "")}
                <div style='font-size:10.5px; color:#334155; line-height:1.35; margin-top:3px;'>{sellerAddress}</div>
                <div style='font-size:10.5px; font-weight:bold; margin-top:3px; color:#0f172a;'>
                    {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: <span style='font-family:monospace; color:{primaryColor};'>{sellerGstin}</span> | ")}PAN: <span style='font-family:monospace;'>{sellerPan}</span> | State: {sellerState}
                </div>
                <div style='display:flex; flex-wrap:wrap; gap:10px; font-size:10px; color:#475569; margin-top:2px;'>
                    {(t.ShowDrugLicense && !string.IsNullOrEmpty(sellerDl) ? $"<span>DL No: <strong style='font-family:monospace;'>{sellerDl}</strong></span>" : "")}
                    {(t.ShowFssai && !string.IsNullOrEmpty(sellerFssai) ? $"<span>FSSAI No: <strong style='font-family:monospace;'>{sellerFssai}</strong></span>" : "")}
                    {(!string.IsNullOrEmpty(sellerPhone) ? $"<span>Mob: <strong>{sellerPhone}</strong></span>" : "")}
                    {(!string.IsNullOrEmpty(sellerEmail) ? $"<span>Email: <strong>{sellerEmail}</strong></span>" : "")}
                </div>
            </div>

            <!-- INVOICE BADGE & COMPLIANCE STAMP -->
            <div style='text-align:right; min-width:32%;'>
                <div style='background:{primaryColor}; color:#ffffff; padding:4px 14px; font-weight:900; font-size:13px; border-radius:4px; display:inline-block; letter-spacing:0.5px;'>TAX INVOICE</div>
                <div style='font-size:9.5px; color:#64748b; margin-top:3px; font-weight:800; text-transform:uppercase;'>ORIGINAL FOR RECIPIENT</div>
                <div style='font-size:12px; font-weight:bold; margin-top:4px;'>Invoice No: <span style='color:{primaryColor}; font-family:monospace; font-weight:900;'>{invNo}</span></div>
                <div style='font-size:11px; margin-top:2px;'>Invoice Date: <strong>{invDate}</strong></div>
                {(!string.IsNullOrEmpty(dueDate) ? $"<div style='font-size:10.5px; color:#dc2626; margin-top:1px;'>Due Date: <strong>{dueDate}</strong></div>" : "")}
                <div style='font-size:10px; color:#475569; margin-top:2px;'>Place of Supply: <strong>{placeOfSupply}</strong></div>
                <div style='font-size:9.5px; color:#64748b; margin-top:2px;'>Reverse Charge (RCM): <strong>{(invoice?.IsReverseCharge == true ? "YES" : "NO")}</strong></div>
            </div>
        </div>

        <!-- E-INVOICE / IRN BAR (MANDATORY FOR HIGH VALUE / >5 CR COMPLIANCE) -->
        {(!string.IsNullOrEmpty(irn) ? $@"
        <div style='margin-top:6px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:4px; padding:4px 8px; font-size:9px; display:flex; justify-content:space-between;'>
            <div><strong>IRN:</strong> <span style='font-family:monospace; word-break:break-all;'>{irn}</span></div>
            {(!string.IsNullOrEmpty(ackNo) ? $"<div style='margin-left:12px; white-space:nowrap;'><strong>Ack No:</strong> {ackNo} ({ackDate})</div>" : "")}
        </div>" : "")}

        <!-- 1. BILL TO & SHIP TO SECTION (DUAL ENTITY) -->
        <div style='display:flex; justify-content:space-between; margin-top:8px; gap:8px;'>
            <!-- BILL TO -->
            <div style='flex:1; border:1px solid #cbd5e1; padding:7px 10px; border-radius:4px; background:#f8fafc;'>
                <div style='display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:3px;'>
                    <span style='font-size:9.5px; font-weight:800; color:#475569; text-transform:uppercase;'>Details of Receiver | Billed To:</span>
                    <span style='font-size:9px; color:#059669; font-weight:bold;'>Buyer</span>
                </div>
                <div style='font-size:12.5px; font-weight:900; color:{primaryColor}; margin:3px 0 2px 0;'>{custName}</div>
                <div style='font-size:10px; color:#334155; line-height:1.3;'>{custAddress}</div>
                <div style='display:flex; gap:12px; margin-top:3px; font-size:10px;'>
                    {(string.IsNullOrEmpty(custGstin) ? "<span>Unregistered Consumer</span>" : $"<span>GSTIN: <strong style='font-family:monospace;'>{custGstin}</strong></span>")}
                    {(!string.IsNullOrEmpty(custPan) ? $"<span>PAN: <strong style='font-family:monospace;'>{custPan}</strong></span>" : "")}
                </div>
                <div style='display:flex; gap:12px; margin-top:2px; font-size:9.5px; color:#64748b;'>
                    <span>State Code: <strong>{custStateCode}</strong></span>
                    {(!string.IsNullOrEmpty(custDl) ? $"<span>DL: <strong>{custDl}</strong></span>" : "")}
                </div>
            </div>

            <!-- SHIP TO -->
            <div style='flex:1; border:1px solid #cbd5e1; padding:7px 10px; border-radius:4px; background:#f8fafc;'>
                <div style='display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:3px;'>
                    <span style='font-size:9.5px; font-weight:800; color:#475569; text-transform:uppercase;'>Details of Consignee | Shipped To:</span>
                    <span style='font-size:9px; color:#2563eb; font-weight:bold;'>Destination Site</span>
                </div>
                <div style='font-size:12.5px; font-weight:900; color:#0f172a; margin:3px 0 2px 0;'>{custName}</div>
                <div style='font-size:10px; color:#334155; line-height:1.3;'>{shipAddress}</div>
                <div style='display:flex; gap:12px; margin-top:3px; font-size:9.5px; color:#64748b;'>
                    <span>State Code: <strong>{custStateCode}</strong></span>
                    <span>Country: <strong>India</strong></span>
                </div>
            </div>
        </div>

        <!-- 2. TRANSPORT, E-WAY BILL & BUYER PO ROW -->
        {(hasLogistics ? $@"
        <div style='margin-top:6px; background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; padding:5px 8px;'>
            <div style='display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; font-size:9.5px;'>
                <div><span style='color:#64748b;'>E-Way Bill No:</span><br/><strong style='font-family:monospace;'>{(!string.IsNullOrEmpty(eWayNo) ? eWayNo : "-")}</strong></div>
                <div><span style='color:#64748b;'>Vehicle No:</span><br/><strong style='font-family:monospace;'>{(!string.IsNullOrEmpty(vehicleNo) ? vehicleNo : "-")}</strong></div>
                <div><span style='color:#64748b;'>Transporter:</span><br/><strong>{(!string.IsNullOrEmpty(transporter) ? transporter : "-")}</strong></div>
                <div><span style='color:#64748b;'>LR / Bilty No:</span><br/><strong>{(!string.IsNullOrEmpty(lrNo) ? lrNo : "-")} {(!string.IsNullOrEmpty(lrDate) ? $"({lrDate})" : "")}</strong></div>
                <div><span style='color:#64748b;'>Buyer PO Ref:</span><br/><strong>{(!string.IsNullOrEmpty(poNo) ? poNo : "-")} {(!string.IsNullOrEmpty(poDate) ? $"({poDate})" : "")}</strong></div>
            </div>
        </div>" : "")}
    </div>

    <!-- 3. ADAPTIVE LINE ITEMS TABLE (AUTO EXPANDING, ZERO EMPTY SPACE) -->
    <div style='flex:1 0 auto; margin-top:6px; border:1px solid #cbd5e1; border-radius:4px;'>
        <table style='width:100%; border-collapse:collapse; font-size:10px;'>
            <thead>
                <tr style='background:{primaryColor}15; color:{primaryColor}; border-bottom:1.5px solid #cbd5e1; height:26px;'>
                    <th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:center; width:26px;'>#</th>
                    <th style='padding:4px 6px; border-right:1px solid #cbd5e1; text-align:left;'>Item Description &amp; Specification</th>
                    <th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:center; width:62px;'>HSN/SAC</th>
                    {(hasPharmaAddon ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:center; width:82px;'>Batch / Exp</th>" : "")}
                    <th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:40px;'>Qty</th>
                    {(hasFreeScheme ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:36px;'>Free</th>" : "")}
                    {(hasMrp ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:50px;'>MRP (₹)</th>" : "")}
                    {(hasPtr ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:50px;'>PTR (₹)</th>" : "")}
                    {(hasPts ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:50px;'>PTS (₹)</th>" : "")}
                    <th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:54px;'>Rate (₹)</th>
                    {(hasDiscount ? "<th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:44px;'>Disc%</th>" : "")}
                    <th style='padding:4px 4px; border-right:1px solid #cbd5e1; text-align:right; width:70px;'>Taxable (₹)</th>
                    <th style='padding:4px 3px; border-right:1px solid #cbd5e1; text-align:right; width:42px;'>GST%</th>
                    <th style='padding:4px 6px; text-align:right; width:80px;'>Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                {RenderSignatureLineItemsRows(invoice, hasPharmaAddon, hasFreeScheme, hasMrp, hasDiscount, hasPtr, hasPts)}
                {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(7 + (hasPharmaAddon ? 1 : 0) + (hasFreeScheme ? 1 : 0) + (hasMrp ? 1 : 0) + (hasPtr ? 1 : 0) + (hasPts ? 1 : 0) + (hasDiscount ? 1 : 0), "#cbd5e1") : "")}
            </tbody>
        </table>
    </div>

    <!-- 4. STATUTORY HSN / SAC TAX SUMMARY TABLE -->
    {hsnSummaryHtml}

    <!-- 5. FINANCIAL TOTALS, BANK CARD & SETTLEMENT -->
    <div>
        <div style='display:flex; justify-content:space-between; margin-top:6px; gap:8px;'>
            <!-- LEFT: AMOUNT IN WORDS & DUAL PAYMENT GATEWAY CARD -->
            <div style='flex:1.25;'>
                <div style='border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin-bottom:6px; background:#f8fafc;'>
                    <div style='font-size:9px; color:#64748b; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px;'>Invoice Value in Words:</div>
                    <div style='font-size:11px; font-weight:bold; color:{primaryColor}; margin-top:2px; line-height:1.3;'>{words}</div>
                </div>

                <!-- BANK & DYNAMIC UPI CARD (ONLY RENDERED IF REAL DETAILS EXIST) -->
                {(showSettlementCard ? $@"
                <div style='display:flex; gap:10px; border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; align-items:center; background:#ffffff;'>
                    {(!string.IsNullOrEmpty(upiQr) ? $"<img src='{upiQr}' alt='UPI QR' style='width:74px; height:74px; border:1px solid #cbd5e1; border-radius:4px; flex-shrink:0;' />" : "")}
                    <div style='font-size:9.5px; line-height:1.35; flex:1;'>
                        <div style='font-weight:900; color:{primaryColor}; font-size:10.5px; margin-bottom:2px;'>Bank &amp; Digital Settlement Details</div>
                        {(!string.IsNullOrEmpty(bankName) ? $"<div>Bank Name: <strong>{bankName}</strong>{(!string.IsNullOrEmpty(bankBranch) ? $" | Branch: <strong>{bankBranch}</strong>" : "")}</div>" : "")}
                        {(!string.IsNullOrEmpty(bankAcc) ? $"<div>Account No: <strong style='font-family:monospace; font-size:10.5px; color:#0f172a;'>{bankAcc}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(bankIfsc) ? $"<div>IFSC Code: <strong style='font-family:monospace;'>{bankIfsc}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(upiId) ? $"<div>UPI ID: <strong style='font-family:monospace; color:#059669;'>{upiId}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(upiQr) ? "<div style='color:#059669; font-weight:bold; font-size:9px; margin-top:2px;'>Scan QR to pay exact amount instantly via any UPI App</div>" : "")}
                    </div>
                </div>" : "")}
            </div>

            <!-- RIGHT: FINANCIAL GRAND TOTAL BREAKDOWN (UP TO 10 CR PRECISION) -->
            <div style='flex:0.75; border:1px solid #cbd5e1; border-radius:4px; padding:6px 10px; background:#f8fafc;'>
                <table style='width:100%; border-collapse:collapse; font-size:10.5px;'>
                    <tr><td style='padding:2px 0; color:#475569;'>Taxable Value:</td><td style='text-align:right; font-weight:bold; font-family:monospace;'>₹{taxable:N2}</td></tr>
                    {(cgst > 0 ? $"<tr><td style='padding:2px 0; color:#475569;'>CGST Total:</td><td style='text-align:right; font-family:monospace;'>₹{cgst:N2}</td></tr>" : "")}
                    {(sgst > 0 ? $"<tr><td style='padding:2px 0; color:#475569;'>SGST Total:</td><td style='text-align:right; font-family:monospace;'>₹{sgst:N2}</td></tr>" : "")}
                    {(igst > 0 ? $"<tr><td style='padding:2px 0; color:#475569;'>IGST Total:</td><td style='text-align:right; font-family:monospace;'>₹{igst:N2}</td></tr>" : "")}
                    <tr><td style='padding:2px 0; color:#475569;'>Paise Round Off:</td><td style='text-align:right; font-family:monospace;'>₹{roundOff:N2}</td></tr>
                    <tr style='border-top:2px solid {primaryColor}; font-size:13.5px; font-weight:900; color:{primaryColor};'>
                        <td style='padding:5px 0;'>Grand Total:</td>
                        <td style='text-align:right; font-family:monospace;'>₹{totalAmount:N2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- 6. TERMS, CONDITIONS & LEGAL AUTHORIZATION -->
        <div style='display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; border-top:1px solid #cbd5e1; padding-top:6px; font-size:9px;'>
            <div style='max-width:62%; color:#64748b; line-height:1.35;'>
                <strong>Declaration &amp; Terms:</strong><br/>
                1. We declare that this invoice shows the actual price of goods and that all particulars are true and correct.<br/>
                2. Goods once sold will not be accepted back without prior written authorization.<br/>
                3. Registered under MSME Development Act. Delayed payments attract interest @18% p.a.<br/>
                4. Subject to local state jurisdiction.
            </div>
            <div style='text-align:right;'>
                <div style='font-size:9.5px; font-weight:bold;'>For {sellerName}</div>
                <div style='height:36px;'></div>
                <div style='border-top:1px solid #94a3b8; display:inline-block; padding-top:2px; font-weight:bold; font-size:9.5px;'>Authorised Signatory</div>
            </div>
        </div>

        <!-- FOOTER BRANDING WATERMARK -->
        <div style='display:flex; justify-content:space-between; margin-top:4px; font-size:8.5px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:3px;'>
            <span>UdyogBill Signature B2B Tax Invoice &bull; 100% GST &amp; E-Invoice Rule 46 Compliant</span>
            <span>Generated securely via UdyogBill &bull; Page 1 of 1</span>
        </div>
    </div>
</div>";
    }

    // ==============================================================================
    // 2. 🏛️ TALLY PRIME STYLE (B2B CLASSIC CORPORATE INVOICE A4/A5)
    // ==============================================================================
    private static string RenderTallyPrimeInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOG SOFTWARE & PHARMA ENTERPRISES PVT. LTD.");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Shop No. 2, Cyber City Commercial Complex, Sector 62, Noida, Uttar Pradesh - 201309");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerState = !string.IsNullOrWhiteSpace(invoice?.Branch?.State) ? $"{invoice.Branch.State} ({invoice.Branch.StateCode ?? "09"})" : (!string.IsNullOrWhiteSpace(tenant?.State) ? $"{tenant.State}{(string.IsNullOrWhiteSpace(tenant.StateCode) ? "" : $", Code: {tenant.StateCode}")}" : "Uttar Pradesh, Code: 09");
        var sellerPhone = tenant?.PrimaryPhone ?? "";
        var sellerEmail = tenant?.Email ?? "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var copyBadge = t.DocumentType == PrintDocumentType.POSReceipt ? "RETAIL CASH MEMO" : "ORIGINAL FOR RECIPIENT";

        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00009";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yy") ?? DateTime.Now.ToString("dd-MMM-yy");
        var custName = invoice?.CustomerName ?? "Apollo Medico Retail Chemists";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custAddress = invoice?.BillingAddress ?? "";
        var custState = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : "Maharashtra";

        var poNo = invoice?.PoNumber ?? "";
        var poDate = invoice?.PoDate.HasValue == true ? invoice.PoDate.Value.ToString("dd-MMM-yy") : "";
        var eWayBill = invoice?.EWayBillNumber ?? "";
        var transport = invoice?.TransporterName ?? "";
        var destination = invoice?.ShippingAddress ?? "";

        var taxable = invoice?.TaxableAmount ?? (invoice?.TotalAmount > 0 ? (invoice.TotalAmount / 1.18m) : 975.00m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? 0m;
        var totalAmount = invoice?.TotalAmount ?? 1092.00m;

        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");

        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasPacking = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(ExtractItemPharmaAttributes(i).pack)) ?? true;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;

        int colCount = 7 + (hasPacking ? 1 : 0) + (hasBatch ? 1 : 0) + (hasExpiry ? 1 : 0) + (hasFree ? 1 : 0) + (hasDisc ? 1 : 0);

        var itemsRows = new System.Text.StringBuilder();
        if (invoice != null && invoice.Items.Any())
        {
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var expStr = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";

                itemsRows.Append($@"
                <tr style='font-size:10.5px; border-bottom:1px solid #cbd5e1;'>
                    <td style='padding:5px 6px; text-align:center; border-right:1px solid #000;'>{idx++}</td>
                    <td style='padding:5px 6px; border-right:1px solid #000;'>
                        <strong>{it.ItemName}</strong>
                        {(string.IsNullOrEmpty(it.ItemSku) ? "" : $"<br/><span style='font-size:9px; color:#475569;'>SKU: {it.ItemSku}</span>")}
                        {ExtractIndustryItemSubline(it)}
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
                <tr style='font-size:10.5px; border-bottom:1px solid #cbd5e1;'>
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
        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, "#000000");
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
        <div class='invoice-wrapper' style='font-family:Arial, sans-serif; font-size:11px; color:#000; width:100%; max-width:800px; {heightStyle} margin:0 auto; border:1.5px solid #000; box-sizing:border-box; background:#fff; display:flex; flex-direction:column; justify-content:space-between;'>
            <div>
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
                        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN/UIN: <span style='font-family:monospace;'>{sellerGstin}</span> | ")}State: {sellerState} {(string.IsNullOrEmpty(sellerPan) ? "" : $"| PAN: <span style='font-family:monospace;'>{sellerPan}</span>")}
                    </div>
                    {(string.IsNullOrWhiteSpace(sellerPhone) ? "" : $"<div style='font-size:10px; color:#475569; margin-top:2px;'>Phone: {sellerPhone} {(string.IsNullOrWhiteSpace(sellerEmail) ? "" : $"| Email: {sellerEmail}")}</div>")}
                </div>

                <!-- 2-Column Buyer & Invoice Metadata Compartments -->
                <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                    <!-- Left: Buyer Details -->
                    <div style='padding:8px 10px; border-right:1px solid #000;'>
                        <div style='font-size:9.5px; font-weight:bold; color:#475569; text-transform:uppercase;'>BUYER (BILL TO):</div>
                        <div style='font-size:13px; font-weight:bold; color:#0f172a; margin-top:2px;'>{custName}</div>
                        {(string.IsNullOrEmpty(custAddress) ? "" : $"<div style='font-size:11px; color:#334155; margin-top:2px;'>{custAddress}</div>")}
                        {(string.IsNullOrEmpty(custGstin) ? "" : $"<div style='font-size:11px; font-weight:bold; margin-top:4px;'>GSTIN/UIN: <span style='font-family:monospace;'>{custGstin}</span></div>")}
                        <div style='font-size:11px;'>State Name: <strong>{custState}</strong></div>
                    </div>

                    <!-- Right: Invoice Metadata Grid -->
                    <div style='font-size:10.5px;'>
                        <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                            <div style='padding:4px 8px; border-right:1px solid #000;'>Invoice No:<br/><strong style='font-size:11.5px; font-family:monospace;'>{invNo}</strong></div>
                            <div style='padding:4px 8px;'>Dated:<br/><strong style='font-size:11.5px;'>{invDate}</strong></div>
                        </div>
                        <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                            <div style='padding:4px 8px; border-right:1px solid #000;'>Delivery Note:<br/><strong>{(!string.IsNullOrEmpty(eWayBill) ? eWayBill : "-")}</strong></div>
                            <div style='padding:4px 8px;'>Mode/Terms of Payment:<br/><strong>Bank / Immediate</strong></div>
                        </div>
                        <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #000;'>
                            <div style='padding:4px 8px; border-right:1px solid #000;'>Buyer's Order No:<br/><strong>{(!string.IsNullOrEmpty(poNo) ? poNo : "-")}</strong></div>
                            <div style='padding:4px 8px;'>Dated:<br/><strong>{(!string.IsNullOrEmpty(poDate) ? poDate : "-")}</strong></div>
                        </div>
                        <div style='display:grid; grid-template-columns: 1fr 1fr;'>
                            <div style='padding:4px 8px; border-right:1px solid #000;'>Despatched through:<br/><strong>{(!string.IsNullOrEmpty(transport) ? transport : "-")}</strong></div>
                            <div style='padding:4px 8px;'>Destination:<br/><strong>{(!string.IsNullOrEmpty(destination) ? destination : "Local Delivery")}</strong></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Line Items Table (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES) -->
            <div style='flex:1 0 auto; border-bottom:1px solid #000;'>
                <table style='width:100%; border-collapse:collapse;'>
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
                        {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(colCount, "#000") : "")}
                    </tbody>
                </table>
            </div>

            <div>
                <!-- HSN Summary Table (Tally Style) -->
                {hsnSummaryHtml}

                <!-- Summary & Tax Breakdowns -->
                <div style='display:grid; grid-template-columns: 1fr 280px; border-bottom:1px solid #000;'>
                    <div style='padding:8px 10px; border-right:1px solid #000;'>
                        <div style='font-size:10px; font-weight:bold; text-transform:uppercase; color:#475569;'>Amount Chargeable (in words):</div>
                        <div style='font-size:12px; font-weight:bold; color:#0f172a; margin-top:2px;'>INR {amountInWords}</div>

                        {(!string.IsNullOrEmpty(bankAcc) ? $@"
                        <div style='margin-top:12px; font-size:10px; border-top:1px dashed #94a3b8; padding-top:6px;'>
                            <strong>Company's Bank Details:</strong><br/>
                            Bank Name: <strong>{bankName}</strong><br/>
                            A/c No.: <strong style='font-family:monospace;'>{bankAcc}</strong><br/>
                            Branch &amp; IFSC: <strong style='font-family:monospace;'>{bankIfsc}</strong>
                        </div>" : "")}
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
                        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </div>
                    <div style='text-align:center;'>
                        {qrImgTag}
                        {(!string.IsNullOrEmpty(upiId) ? "<div style='font-size:8px; color:#475569;'>Scan to Pay UPI</div>" : "")}
                    </div>
                    <div style='text-align:right; font-size:10px;'>
                        For <strong>{sellerName}</strong><br/><br/><br/>
                        <strong>Authorized Signatory</strong>
                    </div>
                </div>
            </div>
        </div>";
    }

    // ==============================================================================
    // 3. 💊 MARG ERP STYLE (PHARMA & FMCG DISTRIBUTION HALF-PAGE A5 LANDSCAPE)
    // ==============================================================================
    private static string RenderMargErpInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        // Seller Information (100% Genuine, zero dummy fallback)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : (invoice != null ? "Store" : "MEDIPHARMA HEALTHCARE DISTRIBUTORS"));
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : (invoice != null ? "" : "Shop 12-14, Dawa Bazar, Aminabad, Lucknow, UP - 226018"));

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var logoUrl = !string.IsNullOrEmpty(t.LogoUrl) ? t.LogoUrl : (!string.IsNullOrEmpty(tenant?.LogoUrl) ? tenant.LogoUrl : "");

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "INV-2627-0016";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy HH:mm") ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("dd/MM/yyyy") : "";

        // Customer Details
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Cash Customer" : "APOLLO MEDICO RETAIL CHEMISTS");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : (invoice != null ? "" : "Shop 4, Main Hospital Road, Lucknow, UP");
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";
        var custDl = ExtractInvoiceBuyerDl(invoice);

        // Logistics & Doctor / Salesman Tracking
        var doctorName = !string.IsNullOrWhiteSpace(invoice?.DoctorName) ? invoice.DoctorName : "";
        var salesman = invoice?.SalesmanUserId.HasValue == true ? "Sales Team" : "";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : (!string.IsNullOrWhiteSpace(tenant?.State) ? tenant.State : "Delhi");

        // Financial Totals
        var totalAmount = invoice?.TotalAmount ?? 1092.00m;
        var taxable = invoice?.TaxableAmount ?? 975.00m;
        var cgst = invoice?.CgstAmount ?? 58.50m;
        var sgst = invoice?.SgstAmount ?? 58.50m;
        var igst = invoice?.IgstAmount ?? 0m;
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // Bank Details (100% Genuine)
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAccountName = !string.IsNullOrWhiteSpace(t.BankAccountName) ? t.BankAccountName : sellerLegalName;
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var rawUpi = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiId = (!string.IsNullOrWhiteSpace(rawUpi) && !rawUpi.Contains("9876543210") && !rawUpi.Contains("example.com")) ? rawUpi : "";
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount}%26cu%3DINR"
            : "";
        bool hasValidBank = t.ShowBankDetails && (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(bankAcc) || !string.IsNullOrWhiteSpace(bankIfsc));

        var termsCity = !string.IsNullOrWhiteSpace(invoice?.Branch?.City) ? invoice.Branch.City : (!string.IsNullOrWhiteSpace(tenant?.City) ? tenant.City : "LUCKNOW");

        // Line Items & HSN Summary
        var itemsSb = new StringBuilder();
        var hsnSb = new StringBuilder();
        decimal totalQty = 0;
        decimal totalFree = 0;
        int itemCount = 0;

        if (invoice?.Items != null && invoice.Items.Any())
        {
            itemCount = invoice.Items.Count;
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var packing = !string.IsNullOrWhiteSpace(attrs.pack) ? attrs.pack : "-";
                var hsn = !string.IsNullOrWhiteSpace(it.HsnCode) ? it.HsnCode : "-";
                var batch = !string.IsNullOrWhiteSpace(it.BatchNumber) ? it.BatchNumber : "-";
                var expiry = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                var freeStr = attrs.freeQty > 0 ? attrs.freeQty.ToString("0.00") : "-";
                var mrpStr = it.Mrp > 0 ? it.Mrp.ToString("0.00") : "-";
                var discStr = it.DiscountPercent > 0 ? $"{it.DiscountPercent:0.00}%" : (it.DiscountAmount > 0 ? $"₹{it.DiscountAmount:0.00}" : "-");

                totalQty += it.Quantity;
                totalFree += attrs.freeQty;

                itemsSb.Append($@"
                <tr style='height:18px; border-bottom:1px solid #166534; font-size:8.5px;'>
                    <td style='border-right:1px solid #166534; text-align:center;'>{idx++}</td>
                    <td style='border-right:1px solid #166534; padding:1px 4px; font-weight:bold;'>{it.ItemName}{ExtractIndustryItemSubline(it)}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{packing}</td>
                    <td style='border-right:1px solid #166534; text-align:center; font-family:monospace;'>{hsn}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{batch}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{expiry}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px; font-weight:bold;'>{it.Quantity:0.00}</td>
                    <td style='border-right:1px solid #166534; text-align:center; color:#15803d; font-weight:bold;'>{freeStr}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{it.UnitPrice:0.00}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{mrpStr}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{discStr}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{it.GstRate:0}%</td>
                    <td style='text-align:right; padding:0 4px; font-weight:bold;'>{it.TotalAmount:N2}</td>
                </tr>");
            }

            // Compact HSN breakdown
            var groups = invoice.Items
                .GroupBy(i => new { Hsn = string.IsNullOrWhiteSpace(i.HsnCode) ? "N/A" : i.HsnCode, Rate = i.GstRate })
                .ToList();

            foreach (var g in groups)
            {
                var grpTaxable = g.Sum(x => x.TaxableAmount);
                var grpTax = g.Sum(x => x.CgstAmount + x.SgstAmount + x.IgstAmount);
                hsnSb.Append($@"
                <tr style='border-bottom:1px solid #86efac; font-size:8px;'>
                    <td style='padding:1px 3px; text-align:center; border-right:1px solid #86efac;'>{g.Key.Hsn}</td>
                    <td style='padding:1px 3px; text-align:right; border-right:1px solid #86efac;'>{grpTaxable:N2}</td>
                    <td style='padding:1px 3px; text-align:center; border-right:1px solid #86efac;'>{g.Key.Rate:0}%</td>
                    <td style='padding:1px 3px; text-align:right;'>{grpTax:N2}</td>
                </tr>");
            }
        }
        else
        {
            // Sample Fallback preview
            itemCount = 1;
            totalQty = 5;
            totalFree = 1;
            itemsSb.Append(@"
            <tr style='height:18px; border-bottom:1px solid #166534; font-size:8.5px;'>
                <td style='border-right:1px solid #166534; text-align:center;'>1</td>
                <td style='border-right:1px solid #166534; padding:1px 4px; font-weight:bold;'>Augmentin 625 Duo Tablet</td>
                <td style='border-right:1px solid #166534; text-align:center;'>10x10</td>
                <td style='border-right:1px solid #166534; text-align:center; font-family:monospace;'>30042010</td>
                <td style='border-right:1px solid #166534; text-align:center;'>AUG-26-A1</td>
                <td style='border-right:1px solid #166534; text-align:center;'>11/27</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px; font-weight:bold;'>5.00</td>
                <td style='border-right:1px solid #166534; text-align:center; color:#15803d; font-weight:bold;'>1.00</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>195.00</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>223.50</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>-</td>
                <td style='border-right:1px solid #166534; text-align:center;'>12%</td>
                <td style='text-align:right; padding:0 4px; font-weight:bold;'>1,092.00</td>
            </tr>");

            hsnSb.Append(@"
            <tr style='border-bottom:1px solid #86efac; font-size:8px;'>
                <td style='padding:1px 3px; text-align:center; border-right:1px solid #86efac;'>30042010</td>
                <td style='padding:1px 3px; text-align:right; border-right:1px solid #86efac;'>975.00</td>
                <td style='padding:1px 3px; text-align:center; border-right:1px solid #86efac;'>12%</td>
                <td style='padding:1px 3px; text-align:right;'>117.00</td>
            </tr>");
        }

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>{headerTitle} - {invNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A5 landscape; margin: 3mm 4mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .marg-half-page {{ width: 100%; max-width: 820px; min-height: 140mm; height: 140mm; max-height: 140mm; margin: 0 auto; box-sizing: border-box; border: 1.5px solid #166534; font-size: 8.5px; line-height: 1.3; display: flex; flex-direction: column; justify-content: space-between; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='marg-half-page'>

    <!-- TOP UDYOGBILL GREEN HEADER -->
    <div style='background:#166534; color:#ffffff; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;'>
        <div style='max-width:68%;'>
            <div style='font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:0.2px; line-height:1.15;'>{sellerName}</div>
            {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:8.5px; opacity:0.95; margin-top:1px;'>{sellerAddress}</div>" : "")}
            <div style='font-size:8px; opacity:0.9; margin-top:1px; font-family:monospace;'>
                {(!string.IsNullOrEmpty(sellerPhone) ? $"Ph: {sellerPhone} | " : "")}
                {(!string.IsNullOrEmpty(sellerGstin) ? $"GSTIN: {sellerGstin} | " : "")}
                {(!string.IsNullOrEmpty(sellerDl) ? $"D.L. No: {sellerDl}" : "")}
                {(!string.IsNullOrEmpty(sellerFssai) ? $" | FSSAI: {sellerFssai}" : "")}
            </div>
        </div>
        <div style='text-align:right;'>
            <div style='background:#ffffff; color:#166534; font-size:11px; font-weight:900; padding:2px 10px; border-radius:3px; display:inline-block;'>{headerTitle}</div>
            <div style='font-size:8.5px; margin-top:2px; font-family:monospace;'>
                <div>Inv No: <strong>{invNo}</strong></div>
                <div>Date: <strong>{invDate}</strong></div>
                {(!string.IsNullOrEmpty(dueDate) ? $"<div>Due: <strong>{dueDate}</strong></div>" : "")}
            </div>
        </div>
    </div>

    <!-- BUYER DETAILS STRIP -->
    <div style='display:grid; grid-template-columns: 1.2fr 1fr; border-bottom:1.5px solid #166534; background:#f0fdf4; padding:4px 8px; font-size:8.5px;'>
        <div style='border-right:1px solid #bbf7d0; padding-right:6px;'>
            <div><span style='color:#166534; font-weight:bold;'>Party M/s:</span> <strong style='font-size:10px; color:#0f172a;'>{custName}</strong></div>
            {(!string.IsNullOrEmpty(custAddress) ? $"<div style='color:#334155;'>{custAddress}</div>" : "")}
            <div style='margin-top:1px;'>
                {(!string.IsNullOrEmpty(custPhone) ? $"Mobile: <strong>{custPhone}</strong> | " : "")}
                {(!string.IsNullOrEmpty(custGstin) ? $"GSTIN: <strong style='font-family:monospace;'>{custGstin}</strong>" : "")}
                {(!string.IsNullOrEmpty(custDl) ? $" | D.L. No: <strong style='font-family:monospace;'>{custDl}</strong>" : "")}
            </div>
        </div>
        <div style='padding-left:6px; font-size:8px; line-height:1.3;'>
            <div><span style='color:#166534; font-weight:bold;'>Place of Supply:</span> <strong>{placeOfSupply}</strong></div>
            {(!string.IsNullOrEmpty(doctorName) ? $"<div><span style='color:#166534;'>Doctor:</span> <strong>{doctorName}</strong></div>" : "")}
            {(!string.IsNullOrEmpty(salesman) ? $"<div><span style='color:#166534;'>Salesman:</span> <strong>{salesman}</strong></div>" : "")}
            <div>Payment Terms: <strong>Standard Trade Credit</strong></div>
        </div>
    </div>

    <!-- PRODUCT TABLE CONTAINER (FLEX: 1 - STRETCHES DOWN TO COVER ALL WHITE SPACE) -->
    <div style='flex:1; display:flex; flex-direction:column;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:8.5px;'>
            <thead>
                <tr style='background:#dcfce7; border-bottom:1.5px solid #166534; font-weight:bold; color:#166534; height:19px;'>
                    <th style='width:22px; border-right:1px solid #166534; text-align:center;'>#</th>
                    <th style='border-right:1px solid #166534; text-align:left; padding:0 4px;'>Item Description</th>
                    <th style='width:42px; border-right:1px solid #166534; text-align:center;'>Pack</th>
                    <th style='width:48px; border-right:1px solid #166534; text-align:center;'>HSN</th>
                    <th style='width:46px; border-right:1px solid #166534; text-align:center;'>Batch</th>
                    <th style='width:38px; border-right:1px solid #166534; text-align:center;'>Exp</th>
                    <th style='width:36px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:30px; border-right:1px solid #166534; text-align:center;'>Free</th>
                    <th style='width:44px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:44px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:34px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Dis%</th>
                    <th style='width:32px; border-right:1px solid #166534; text-align:center;'>GST</th>
                    <th style='width:56px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsSb}
                <!-- Continuous vertical grid lines covering all remaining empty space -->
                <tr style='height:100%;'>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- BOTTOM SETTLEMENT & TOTALS (3-COLUMN SPLIT - ZERO GAP DIRECTLY UNDER TABLE) -->
    <div>
        <div style='display:grid; grid-template-columns: 1.3fr 1.1fr 1.6fr; border-top:1.5px solid #166534; background:#f0fdf4; padding:4px 6px; gap:6px;'>
            
            <!-- Left: Qty Count + Bank + Terms -->
            <div style='font-size:8px; line-height:1.3;'>
                <div style='font-weight:bold; color:#166534; border-bottom:1px dashed #86efac; padding-bottom:1px;'>
                    Tot Items: {itemCount} | Qty: {totalQty:0} {(totalFree > 0 ? $"(+ {totalFree:0} Free)" : "")}
                </div>
                {(hasValidBank ? $@"
                <div style='margin-top:2px;'>
                    <strong>Bank:</strong> {bankName} | <strong>A/c:</strong> <span style='font-family:monospace;'>{bankAcc}</span><br/>
                    <strong>IFSC:</strong> <span style='font-family:monospace;'>{bankIfsc}</span>
                </div>" : "")}
                <div style='margin-top:2px; color:#475569;'>
                    <strong>Terms:</strong> 1. Goods once sold will not be taken back. 2. Subject to {termsCity} jurisdiction only.
                </div>
            </div>

            <!-- Center: GST Breakup or UPI QR -->
            <div style='font-size:7.5px;'>
                <div style='font-weight:bold; color:#166534; margin-bottom:1px;'>GST SUMMARY</div>
                <table style='width:100%; border:1px solid #166534; font-size:7.5px;'>
                    <tr style='background:#dcfce7; font-weight:bold; color:#166534;'>
                        <td style='padding:1px 2px; text-align:center; border-right:1px solid #86efac;'>HSN</td>
                        <td style='padding:1px 2px; text-align:right; border-right:1px solid #86efac;'>Taxable</td>
                        <td style='padding:1px 2px; text-align:center; border-right:1px solid #86efac;'>Rate</td>
                        <td style='padding:1px 2px; text-align:right;'>Tax</td>
                    </tr>
                    {hsnSb}
                </table>
            </div>

            <!-- Right: Bordered Totals Box -->
            <div>
                <table style='width:100%; border:1.5px solid #166534; font-size:9px; background:#ffffff;'>
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; font-weight:bold; border-right:1px solid #86efac;'>Sub Total:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {taxable:N2}</td>
                    </tr>
                    {(cgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>CGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {cgst:N2}</td>
                    </tr>" : "")}
                    {(sgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>SGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {sgst:N2}</td>
                    </tr>" : "")}
                    {(igst > 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>IGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {igst:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>Round Off:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='background:#166534; color:#ffffff; font-weight:900; font-size:11px;'>
                        <td style='padding:3px 4px; border-right:1px solid #166534;'>NET PAYABLE:</td>
                        <td style='padding:3px 4px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:7.5px; color:#166534; text-align:center; margin-top:1px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- FOOTER BAR -->
        <div style='display:flex; justify-content:space-between; align-items:center; padding:3px 8px; font-size:7.5px; color:#166534; border-top:1px solid #86efac; background:#ffffff;'>
            <div>E. &amp; O.E. | Computer Generated Invoice</div>
            <div>For <strong>{sellerName}</strong> &nbsp;—&nbsp; <strong>Authorised Signatory</strong></div>
        </div>
    </div>

</div>
</body>
</html>";
    }

    // ==============================================================================
    // 3.1 🧾 PHARMA & FMCG RETAIL CASH MEMO (A5 HALF-PAGE ESTIMATE / NON-GST)
    // ==============================================================================
    private static string RenderCashMemoHalfPageHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        // Seller Information (100% Genuine, zero dummy fallback - NO GSTIN for Cash Memo)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : (invoice != null ? "Store" : "MEDIPHARMA HEALTHCARE RETAIL"));
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : (invoice != null ? "" : "Shop 12-14, Dawa Bazar, Aminabad, Lucknow, UP - 226018"));

        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : "CASH MEMO";
        var invNo = invoice?.InvoiceNumber ?? "CM-2627-0016";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy HH:mm") ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm");

        // Customer Details (Counter Sale / Retail - Zero GST)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Counter Retail Customer" : "CASH SALE (RETAIL)");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";

        // Doctor / Salesman Tracking
        var doctorName = !string.IsNullOrWhiteSpace(invoice?.DoctorName) ? invoice.DoctorName : "";
        var salesman = invoice?.SalesmanUserId.HasValue == true ? "Counter Staff" : "";

        // Financial Totals (Pure Retail / Non-GST)
        var totalAmount = invoice?.TotalAmount ?? 1092.00m;
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // Bank Details & Digital Payment (UPI)
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var rawUpi = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiId = (!string.IsNullOrWhiteSpace(rawUpi) && !rawUpi.Contains("9876543210") && !rawUpi.Contains("example.com")) ? rawUpi : "";
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount}%26cu%3DINR"
            : "";
        bool hasValidBank = t.ShowBankDetails && (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(bankAcc) || !string.IsNullOrWhiteSpace(bankIfsc));

        var termsCity = !string.IsNullOrWhiteSpace(invoice?.Branch?.City) ? invoice.Branch.City : (!string.IsNullOrWhiteSpace(tenant?.City) ? tenant.City : "LUCKNOW");

        // Line Items
        var itemsSb = new StringBuilder();
        decimal totalQty = 0;
        decimal totalFree = 0;
        decimal totalMrp = 0;
        decimal totalDiscount = 0;
        decimal subTotal = 0;
        int itemCount = 0;

        if (invoice?.Items != null && invoice.Items.Any())
        {
            itemCount = invoice.Items.Count;
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var packing = !string.IsNullOrWhiteSpace(attrs.pack) ? attrs.pack : "-";
                var batch = !string.IsNullOrWhiteSpace(it.BatchNumber) ? it.BatchNumber : "-";
                var expiry = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                var freeStr = attrs.freeQty > 0 ? attrs.freeQty.ToString("0.00") : "-";
                var rateVal = it.Quantity > 0 ? (it.TotalAmount / it.Quantity) : it.UnitPrice;
                var mrpVal = it.Mrp > 0 ? it.Mrp : rateVal;
                var mrpStr = mrpVal.ToString("0.00");
                var discStr = it.DiscountPercent > 0 ? $"{it.DiscountPercent:0.00}%" : (it.DiscountAmount > 0 ? $"₹{it.DiscountAmount:0.00}" : "-");

                totalQty += it.Quantity;
                totalFree += attrs.freeQty;
                totalMrp += (mrpVal * it.Quantity);
                totalDiscount += it.DiscountAmount;
                subTotal += it.TotalAmount;

                itemsSb.Append($@"
                <tr style='height:18px; border-bottom:1px solid #166534; font-size:8.5px;'>
                    <td style='border-right:1px solid #166534; text-align:center;'>{idx++}</td>
                    <td style='border-right:1px solid #166534; padding:1px 4px; font-weight:bold;'>{it.ItemName}{ExtractIndustryItemSubline(it)}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{packing}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{batch}</td>
                    <td style='border-right:1px solid #166534; text-align:center;'>{expiry}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px; font-weight:bold;'>{it.Quantity:0.00}</td>
                    <td style='border-right:1px solid #166534; text-align:center; color:#15803d; font-weight:bold;'>{freeStr}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{mrpStr}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{rateVal:0.00}</td>
                    <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>{discStr}</td>
                    <td style='text-align:right; padding:0 4px; font-weight:bold;'>{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            // Sample Fallback preview
            itemCount = 1;
            totalQty = 5;
            totalFree = 1;
            totalMrp = 1117.50m;
            subTotal = 975.00m;
            totalDiscount = 0m;
            itemsSb.Append(@"
            <tr style='height:18px; border-bottom:1px solid #166534; font-size:8.5px;'>
                <td style='border-right:1px solid #166534; text-align:center;'>1</td>
                <td style='border-right:1px solid #166534; padding:1px 4px; font-weight:bold;'>Augmentin 625 Duo Tablet</td>
                <td style='border-right:1px solid #166534; text-align:center;'>10x10</td>
                <td style='border-right:1px solid #166534; text-align:center;'>AUG-26-A1</td>
                <td style='border-right:1px solid #166534; text-align:center;'>11/27</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px; font-weight:bold;'>5.00</td>
                <td style='border-right:1px solid #166534; text-align:center; color:#15803d; font-weight:bold;'>1.00</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>223.50</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>195.00</td>
                <td style='border-right:1px solid #166534; text-align:right; padding:0 3px;'>-</td>
                <td style='text-align:right; padding:0 4px; font-weight:bold;'>1,092.00</td>
            </tr>");
        }

        if (subTotal == 0) subTotal = totalAmount;
        decimal savings = totalMrp > totalAmount ? (totalMrp - totalAmount) : 0m;

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>{headerTitle} - {invNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A5 landscape; margin: 3mm 4mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .marg-half-page {{ width: 100%; max-width: 820px; min-height: 140mm; height: 140mm; max-height: 140mm; margin: 0 auto; box-sizing: border-box; border: 1.5px solid #166534; font-size: 8.5px; line-height: 1.3; display: flex; flex-direction: column; justify-content: space-between; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='marg-half-page'>

    <!-- TOP UDYOGBILL GREEN HEADER (NON-GST CASH MEMO) -->
    <div style='background:#166534; color:#ffffff; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;'>
        <div style='max-width:68%;'>
            <div style='font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:0.2px; line-height:1.15;'>{sellerName}</div>
            {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:8.5px; opacity:0.95; margin-top:1px;'>{sellerAddress}</div>" : "")}
            <div style='font-size:8px; opacity:0.9; margin-top:1px; font-family:monospace;'>
                {(!string.IsNullOrEmpty(sellerPhone) ? $"Ph: {sellerPhone} " : "")}
                {(!string.IsNullOrEmpty(sellerDl) ? $"| D.L. No: {sellerDl} " : "")}
                {(!string.IsNullOrEmpty(sellerFssai) ? $"| FSSAI: {sellerFssai}" : "")}
            </div>
        </div>
        <div style='text-align:right;'>
            <div style='background:#ffffff; color:#166534; font-size:11px; font-weight:900; padding:2px 10px; border-radius:3px; display:inline-block;'>{headerTitle}</div>
            <div style='font-size:8.5px; margin-top:2px; font-family:monospace;'>
                <div>Memo No: <strong>{invNo}</strong></div>
                <div>Date: <strong>{invDate}</strong></div>
            </div>
        </div>
    </div>

    <!-- CUSTOMER DETAILS STRIP (ZERO GST) -->
    <div style='display:grid; grid-template-columns: 1.2fr 1fr; border-bottom:1.5px solid #166534; background:#f0fdf4; padding:4px 8px; font-size:8.5px;'>
        <div style='border-right:1px solid #bbf7d0; padding-right:6px;'>
            <div><span style='color:#166534; font-weight:bold;'>Customer M/s:</span> <strong style='font-size:10px; color:#0f172a;'>{custName}</strong></div>
            {(!string.IsNullOrEmpty(custAddress) ? $"<div style='color:#334155;'>{custAddress}</div>" : "")}
            {(!string.IsNullOrEmpty(custPhone) ? $"<div style='margin-top:1px;'>Mobile: <strong>{custPhone}</strong></div>" : "")}
        </div>
        <div style='padding-left:6px; font-size:8px; line-height:1.3;'>
            <div><span style='color:#166534; font-weight:bold;'>Sale Type:</span> <strong>Retail Counter Cash Sale</strong></div>
            {(!string.IsNullOrEmpty(doctorName) ? $"<div><span style='color:#166534;'>Doctor:</span> <strong>{doctorName}</strong></div>" : "")}
            {(!string.IsNullOrEmpty(salesman) ? $"<div><span style='color:#166534;'>Salesman:</span> <strong>{salesman}</strong></div>" : "")}
            <div>Payment Mode: <strong>Cash / Counter Settlement</strong></div>
        </div>
    </div>

    <!-- PRODUCT TABLE CONTAINER (FLEX: 1 - STRETCHES DOWN TO COVER ALL WHITE SPACE) -->
    <div style='flex:1; display:flex; flex-direction:column;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:8.5px;'>
            <thead>
                <tr style='background:#dcfce7; border-bottom:1.5px solid #166534; font-weight:bold; color:#166534; height:19px;'>
                    <th style='width:24px; border-right:1px solid #166534; text-align:center;'>#</th>
                    <th style='border-right:1px solid #166534; text-align:left; padding:0 4px;'>Item Description</th>
                    <th style='width:46px; border-right:1px solid #166534; text-align:center;'>Pack</th>
                    <th style='width:54px; border-right:1px solid #166534; text-align:center;'>Batch</th>
                    <th style='width:42px; border-right:1px solid #166534; text-align:center;'>Exp</th>
                    <th style='width:42px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:34px; border-right:1px solid #166534; text-align:center;'>Free</th>
                    <th style='width:50px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:50px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:42px; border-right:1px solid #166534; text-align:right; padding:0 3px;'>Dis%</th>
                    <th style='width:66px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsSb}
                <!-- Continuous vertical grid lines covering all remaining empty space -->
                <tr style='height:100%;'>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td style='border-right:1px solid #166534;'>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- BOTTOM SETTLEMENT & TOTALS (ZERO GST - 3-COLUMN SPLIT DIRECTLY UNDER TABLE) -->
    <div>
        <div style='display:grid; grid-template-columns: 1.3fr 1.1fr 1.6fr; border-top:1.5px solid #166534; background:#f0fdf4; padding:4px 6px; gap:6px;'>
            
            <!-- Left: Qty Count + Bank + Terms -->
            <div style='font-size:8px; line-height:1.3;'>
                <div style='font-weight:bold; color:#166534; border-bottom:1px dashed #86efac; padding-bottom:1px;'>
                    Tot Items: {itemCount} | Qty: {totalQty:0} {(totalFree > 0 ? $"(+ {totalFree:0} Free)" : "")}
                </div>
                {(hasValidBank ? $@"
                <div style='margin-top:2px;'>
                    <strong>Bank:</strong> {bankName} | <strong>A/c:</strong> <span style='font-family:monospace;'>{bankAcc}</span><br/>
                    <strong>IFSC:</strong> <span style='font-family:monospace;'>{bankIfsc}</span>
                </div>" : "")}
                <div style='margin-top:2px; color:#475569;'>
                    <strong>Terms:</strong> 1. Goods once sold will not be taken back. 2. Retail counter sale only.
                </div>
            </div>

            <!-- Center: Savings Callout or UPI QR (ZERO GST!) -->
            <div style='display:flex; flex-direction:column; justify-content:center; align-items:center;'>
                {(savings > 0 ? $@"
                <div style='border:1.5px dashed #166534; background:#ffffff; border-radius:6px; padding:4px 8px; text-align:center; width:90%;'>
                    <div style='font-size:8px; color:#166534; font-weight:bold;'>TOTAL SAVINGS ON MRP</div>
                    <div style='font-size:14px; font-weight:900; color:#15803d;'>₹ {savings:N2}</div>
                </div>" : (!string.IsNullOrEmpty(upiQr) ? $@"
                <div style='text-align:center;'>
                    <img src='{upiQr}' style='width:52px; height:52px; border:1px solid #166534; border-radius:3px;' alt='UPI QR' />
                    <div style='font-size:7px; font-weight:bold; color:#166534; margin-top:1px;'>Scan to Pay</div>
                </div>" : ""))}
            </div>

            <!-- Right: Bordered Totals Box (NO GST!) -->
            <div>
                <table style='width:100%; border:1.5px solid #166534; font-size:9px; background:#ffffff;'>
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; font-weight:bold; border-right:1px solid #86efac;'>Gross Sub Total:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {subTotal:N2}</td>
                    </tr>
                    {(totalDiscount > 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>Total Discount:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace; color:#dc2626;'>(-) ₹ {totalDiscount:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr style='border-bottom:1px solid #86efac;'>
                        <td style='padding:1px 4px; border-right:1px solid #86efac;'>Round Off:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='background:#166534; color:#ffffff; font-weight:900; font-size:11px;'>
                        <td style='padding:3px 4px; border-right:1px solid #166534;'>TOTAL AMOUNT:</td>
                        <td style='padding:3px 4px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:7.5px; color:#166534; text-align:center; margin-top:1px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- FOOTER BAR -->
        <div style='display:flex; justify-content:space-between; align-items:center; padding:3px 8px; font-size:7.5px; color:#166534; border-top:1px solid #86efac; background:#ffffff;'>
            <div>E. &amp; O.E. | Retail Counter Sale Memo</div>
            <div>For <strong>{sellerName}</strong> &nbsp;—&nbsp; <strong>Authorised Signatory</strong></div>
        </div>
    </div>

</div>
</body>
</html>";
    }

    // ==============================================================================
    // 3.2 🏢 EXECUTIVE COMMERCIAL PURCHASE ORDER (A4 PROCURMENT CONTRACT STYLE)
    // ==============================================================================
    private static string RenderPurchaseOrderExecutiveHtml(PrintTemplate t, PurchaseOrder? po, SalesInvoice? invoice, Tenant? tenant)
    {
        // Purchaser / Buyer Information (Our Company)
        var buyerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOGBILL");
        var buyerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : buyerName;

        var buyerAddress = !string.IsNullOrWhiteSpace(po?.Branch?.AddressLine1)
            ? $"{po.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(po.Branch.City) ? "" : $", {po.Branch.City}")}{(string.IsNullOrWhiteSpace(po.Branch.State) ? "" : $", {po.Branch.State}")}{(string.IsNullOrWhiteSpace(po.Branch.Pincode) ? "" : $" - {po.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "Corporate Tower, Sector 62, Noida, Uttar Pradesh - 201301");

        var buyerGstin = !string.IsNullOrWhiteSpace(po?.Branch?.GSTIN)
            ? po.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AAACU1234F1Z5");
        var buyerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (buyerGstin.Length >= 12 ? buyerGstin.Substring(2, 10) : "");
        var buyerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "+91 80000 12345";
        var buyerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "procurement@udyogbill.com";
        var buyerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        // PO Metadata
        var poNo = po?.OrderNumber ?? (invoice != null ? $"PO-{invoice.InvoiceNumber}" : "PO-2627-00042");
        var poDate = po?.OrderDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var expDate = po?.ExpectedDeliveryDate.HasValue == true ? po.ExpectedDeliveryDate.Value.ToString("dd/MM/yyyy") : DateTime.Now.AddDays(7).ToString("dd/MM/yyyy");
        var poStatus = po != null ? po.Status.ToString().ToUpperInvariant() : "APPROVED";

        // Vendor / Supplier Information
        var vendorName = !string.IsNullOrWhiteSpace(po?.SupplierName)
            ? po.SupplierName
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : "ZENITH GLOBAL PHARMA DISTRIBUTORS");
        var vendorAddress = !string.IsNullOrWhiteSpace(po?.SupplierAddress)
            ? po.SupplierAddress
            : (!string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "Plot 104, Okhla Industrial Area Phase-III, New Delhi - 110020");
        var vendorGstin = !string.IsNullOrWhiteSpace(po?.SupplierGSTIN)
            ? po.SupplierGSTIN
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "07AAACZ9876L1Z4");
        var vendorPhone = !string.IsNullOrWhiteSpace(po?.SupplierPhone)
            ? po.SupplierPhone
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerPhone) ? invoice.CustomerPhone : "+91 98100 54321");
        var vendorState = !string.IsNullOrWhiteSpace(po?.SupplierStateCode) ? po.SupplierStateCode : "07 - Delhi";

        // Delivery Destination (Warehouse / Branch)
        var shipDestName = !string.IsNullOrWhiteSpace(po?.Warehouse?.WarehouseName)
            ? po.Warehouse.WarehouseName
            : (!string.IsNullOrWhiteSpace(po?.Branch?.BranchName) ? po.Branch.BranchName : "Central Logistics Hub & Warehouse");
        var shipAddress = !string.IsNullOrWhiteSpace(po?.Warehouse?.Location)
            ? po.Warehouse.Location
            : buyerAddress;

        // Auto-Detect Industry Add-on (Pharma / Batch / Expiry)
        bool isPharma = !string.IsNullOrWhiteSpace(buyerDl);
        if (po?.Items != null && po.Items.Any())
        {
            if (po.Items.Any(i => i.AttributesJson != null && (i.AttributesJson.Contains("pack") || i.AttributesJson.Contains("batch") || i.AttributesJson.Contains("expiry"))))
                isPharma = true;
        }
        else if (invoice?.Items != null && invoice.Items.Any())
        {
            if (invoice.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber) || (i.AttributesJson != null && i.AttributesJson.Contains("pack"))))
                isPharma = true;
        }

        // Table Rows & Financial Accumulators
        var rowsSb = new StringBuilder();
        decimal totalGross = 0;
        decimal totalDisc = 0;
        decimal totalTaxable = 0;
        decimal totalCgst = 0;
        decimal totalSgst = 0;
        decimal totalIgst = 0;
        decimal totalAmount = 0;
        decimal roundOff = 0;
        int rowIdx = 1;

        if (po?.Items != null && po.Items.Any())
        {
            totalAmount = po.TotalAmount;
            roundOff = po.RoundOff;
            totalCgst = po.CgstAmount;
            totalSgst = po.SgstAmount;
            totalIgst = po.IgstAmount;
            totalTaxable = po.TaxableAmount;
            totalDisc = po.DiscountTotal;
            totalGross = po.SubTotal;

            foreach (var item in po.Items)
            {
                var hsn = !string.IsNullOrWhiteSpace(item.HsnCode) ? item.HsnCode : "3004";
                var uom = !string.IsNullOrWhiteSpace(item.UomCode) ? item.UomCode : "PCS";
                var discText = item.DiscountPercent > 0 ? $"{item.DiscountPercent:0.00}%" : (item.DiscountAmount > 0 ? $"₹{item.DiscountAmount:0.00}" : "—");

                string packStr = "—";
                string freeStr = "—";
                if (isPharma && !string.IsNullOrWhiteSpace(item.AttributesJson))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                        if (doc.RootElement.TryGetProperty("pack", out var p)) packStr = p.GetString() ?? "—";
                        if (doc.RootElement.TryGetProperty("freeQty", out var f)) freeStr = f.GetDecimal().ToString("0.00");
                    }
                    catch { }
                }

                if (isPharma)
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9px;'>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:5px 6px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName} <span style='font-size:8px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:5px 4px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{packStr}</td>
                        <td style='padding:5px 4px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.OrderQuantity:0.00}</td>
                        <td style='padding:5px 4px; text-align:center; color:#0d9488; font-weight:bold; border-right:1px solid #e2e8f0;'>{freeStr}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{uom}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #e2e8f0;'>{discText}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold; color:#0d9488;'>₹ {(item.TaxableAmount + item.CgstAmount + item.SgstAmount + item.IgstAmount):N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName} <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.OrderQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{uom}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{discText}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0d9488;'>₹ {(item.TaxableAmount + item.CgstAmount + item.SgstAmount + item.IgstAmount):N2}</td>
                    </tr>");
                }
            }
        }
        else if (invoice?.Items != null && invoice.Items.Any())
        {
            totalAmount = invoice.TotalAmount;
            roundOff = invoice.RoundOff;
            totalCgst = invoice.CgstAmount;
            totalSgst = invoice.SgstAmount;
            totalIgst = invoice.IgstAmount;
            totalTaxable = invoice.TaxableAmount;
            totalDisc = invoice.ItemDiscountTotal + invoice.InvoiceDiscountAmount;
            totalGross = invoice.SubTotal;

            foreach (var item in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(item);
                var hsn = !string.IsNullOrWhiteSpace(item.HsnCode) ? item.HsnCode : "3004";
                var uom = !string.IsNullOrWhiteSpace(item.UomCode) ? item.UomCode : "Strip";
                var discText = item.DiscountPercent > 0 ? $"{item.DiscountPercent:0.00}%" : (item.DiscountAmount > 0 ? $"₹{item.DiscountAmount:0.00}" : "—");
                var packStr = !string.IsNullOrWhiteSpace(attrs.pack) ? attrs.pack : "—";
                var freeStr = attrs.freeQty > 0 ? attrs.freeQty.ToString("0.00") : "—";

                if (isPharma)
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9px;'>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:5px 6px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName}</td>
                        <td style='padding:5px 4px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{packStr}</td>
                        <td style='padding:5px 4px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.Quantity:0.00}</td>
                        <td style='padding:5px 4px; text-align:center; color:#0d9488; font-weight:bold; border-right:1px solid #e2e8f0;'>{freeStr}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #e2e8f0;'>{uom}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #e2e8f0;'>{discText}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold; color:#0d9488;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{discText}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0d9488;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }
        else
        {
            // Sample Executive Procurement preview
            totalGross = 48500.00m;
            totalDisc = 1500.00m;
            totalTaxable = 47000.00m;
            totalCgst = 2820.00m;
            totalSgst = 2820.00m;
            totalIgst = 0m;
            roundOff = 0m;
            totalAmount = 52640.00m;

            rowsSb.Append($@"
            <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>1</td>
                <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>Augmentin 625 Duo Tablets <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>(AUG-625)</span></td>
                <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>3004</td>
                {(isPharma ? "<td style='padding:6px 4px; text-align:center; border-right:1px solid #e2e8f0;'>10x10</td>" : "")}
                <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>200.00</td>
                {(isPharma ? "<td style='padding:6px 4px; text-align:center; color:#0d9488; font-weight:bold; border-right:1px solid #e2e8f0;'>20.00</td>" : "")}
                <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Box</td>
                <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ 235.00</td>
                <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>3.19%</td>
                <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ 47,000.00</td>
                <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>12.00%</td>
                <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0d9488;'>₹ 52,640.00</td>
            </tr>");
        }

        var words = ConvertToIndianCurrencyWords(totalAmount);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>Purchase Order - {poNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A4 portrait; margin: 8mm 10mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .po-container {{ width: 100%; max-width: 800px; min-height: 275mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #0d9488; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='po-container'>

    <div>
        <!-- TOP EXECUTIVE HEADER BAR -->
        <div style='background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color:#ffffff; padding:12px 16px; display:flex; justify-content:space-between; align-items:flex-start;'>
            <div style='max-width:62%;'>
                <div style='font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;'>{buyerName}</div>
                <div style='font-size:9.5px; opacity:0.95; margin-top:3px; line-height:1.3;'>{buyerAddress}</div>
                <div style='font-size:9px; opacity:0.9; margin-top:4px; font-family:monospace; display:flex; flex-wrap:wrap; gap:8px;'>
                    <span><strong>GSTIN:</strong> {buyerGstin}</span>
                    {(!string.IsNullOrEmpty(buyerPan) ? $"<span><strong>PAN:</strong> {buyerPan}</span>" : "")}
                    {(!string.IsNullOrEmpty(buyerPhone) ? $"<span><strong>Ph:</strong> {buyerPhone}</span>" : "")}
                    {(!string.IsNullOrEmpty(buyerDl) ? $"<span><strong>D.L.:</strong> {buyerDl}</span>" : "")}
                </div>
            </div>
            <div style='text-align:right;'>
                <div style='background:#ffffff; color:#0d9488; font-size:13px; font-weight:900; padding:4px 14px; border-radius:4px; display:inline-block; letter-spacing:0.5px;'>PURCHASE ORDER</div>
                <div style='margin-top:6px; font-size:9.5px; line-height:1.4;'>
                    <div>PO No: <strong style='font-family:monospace; font-size:11px;'>{poNo}</strong></div>
                    <div>PO Date: <strong>{poDate}</strong></div>
                    <div>Due Date: <strong>{expDate}</strong></div>
                    <div style='margin-top:2px;'><span style='background:#ccfbf1; color:#0f766e; padding:1px 6px; border-radius:3px; font-size:8.5px; font-weight:bold;'>STATUS: {poStatus}</span></div>
                </div>
            </div>
        </div>

        <!-- TWIN METADATA CARDS: VENDOR (SUPPLIER) & DELIVERY LOCATION (SHIP TO) -->
        <div style='display:grid; grid-template-columns: 1.15fr 1fr; gap:10px; padding:10px 12px; background:#f0fdfa; border-bottom:1.5px solid #0d9488;'>
            
            <!-- Vendor Card -->
            <div style='background:#ffffff; border:1px solid #99f6e4; border-radius:6px; padding:8px 10px; font-size:9px; line-height:1.4;'>
                <div style='font-size:9px; text-transform:uppercase; color:#0d9488; font-weight:bold; letter-spacing:0.3px; border-bottom:1px solid #ccfbf1; padding-bottom:3px; margin-bottom:4px;'>
                    Vendor / Supplier (Bill &amp; Ship From):
                </div>
                <div style='font-size:12px; font-weight:bold; color:#0f172a;'>{vendorName}</div>
                <div style='color:#334155; margin-top:2px;'>{vendorAddress}</div>
                <div style='margin-top:4px; font-family:monospace;'>
                    <div><strong>GSTIN:</strong> {vendorGstin} | <strong>State:</strong> {vendorState}</div>
                    {(!string.IsNullOrEmpty(vendorPhone) ? $"<div><strong>Phone:</strong> {vendorPhone}</div>" : "")}
                </div>
            </div>

            <!-- Ship To Card -->
            <div style='background:#ffffff; border:1px solid #99f6e4; border-radius:6px; padding:8px 10px; font-size:9px; line-height:1.4;'>
                <div style='font-size:9px; text-transform:uppercase; color:#0d9488; font-weight:bold; letter-spacing:0.3px; border-bottom:1px solid #ccfbf1; padding-bottom:3px; margin-bottom:4px;'>
                    Delivery Warehouse (Ship To Destination):
                </div>
                <div style='font-size:12px; font-weight:bold; color:#0f172a;'>{shipDestName}</div>
                <div style='color:#334155; margin-top:2px;'>{shipAddress}</div>
                <div style='margin-top:4px;'>
                    <div>Delivery Mode: <strong>Surface Cargo / Road Transport</strong></div>
                    <div>Payment Terms: <strong>Net 30 Days from Receipt</strong></div>
                </div>
            </div>

        </div>

        <!-- ITEMS TABLE -->
        <table style='width:100%; border-collapse:collapse; font-size:9.5px;'>
            <thead>
                <tr style='background:#ccfbf1; color:#0f766e; border-bottom:1.5px solid #0d9488; font-size:9px; text-transform:uppercase; letter-spacing:0.2px;'>
                    <th style='padding:7px 4px; width:28px; border-right:1px solid #99f6e4; text-align:center;'>#</th>
                    <th style='padding:7px 8px; text-align:left; border-right:1px solid #99f6e4;'>Item Description</th>
                    <th style='padding:7px 4px; width:65px; border-right:1px solid #99f6e4; text-align:center;'>HSN/SAC</th>
                    {(isPharma ? "<th style='padding:7px 4px; width:45px; border-right:1px solid #99f6e4; text-align:center;'>Pack</th>" : "")}
                    <th style='padding:7px 6px; width:60px; border-right:1px solid #99f6e4; text-align:right;'>Qty</th>
                    {(isPharma ? "<th style='padding:7px 4px; width:40px; border-right:1px solid #99f6e4; text-align:center;'>Free</th>" : "")}
                    <th style='padding:7px 4px; width:45px; border-right:1px solid #99f6e4; text-align:center;'>UOM</th>
                    <th style='padding:7px 6px; width:65px; border-right:1px solid #99f6e4; text-align:right;'>Rate (₹)</th>
                    <th style='padding:7px 4px; width:45px; border-right:1px solid #99f6e4; text-align:right;'>Dis%</th>
                    <th style='padding:7px 6px; width:75px; border-right:1px solid #99f6e4; text-align:right;'>Taxable (₹)</th>
                    <th style='padding:7px 4px; width:50px; border-right:1px solid #99f6e4; text-align:right;'>GST%</th>
                    <th style='padding:7px 8px; width:85px; text-align:right;'>Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                {rowsSb}
            </tbody>
        </table>
    </div>

    <!-- BOTTOM COMMERCIAL SUMMARY & TERMS -->
    <div>
        <div style='display:grid; grid-template-columns: 1.25fr 1fr; border-top:1.5px solid #0d9488; background:#f0fdfa; padding:10px 12px; gap:12px;'>
            
            <!-- Terms & Conditions (Indian Contract Act Compliant) -->
            <div style='font-size:8.5px; line-height:1.4;'>
                <div style='font-size:9px; font-weight:bold; color:#0d9488; border-bottom:1px solid #99f6e4; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;'>
                    Commercial Procurement Terms &amp; Conditions:
                </div>
                <ol style='margin:0; padding-left:14px; color:#334155;'>
                    <li>Goods supplied must strictly adhere to technical specifications &amp; approved samples.</li>
                    <li>Delivery timeline is essence of this contract. Late deliveries attract liquidated damages @ 0.5% per week.</li>
                    <li>Purchaser reserves absolute right to inspect and reject defective, damaged, or short-dated stock.</li>
                    <li>Vendor invoice must quote this Purchase Order number along with verified Delivery Challan.</li>
                    <li>Jurisdiction for commercial dispute resolution shall reside in the courts of {tenant?.City ?? "Purchaser City"}.</li>
                </ol>
            </div>

            <!-- Financial Totals Box -->
            <div>
                <table style='width:100%; border:1px solid #0d9488; font-size:9.5px; background:#ffffff; border-radius:4px;'>
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>Gross Subtotal:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {totalGross:N2}</td>
                    </tr>
                    {(totalDisc > 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>Total Discount:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace; color:#dc2626;'>(-) ₹ {totalDisc:N2}</td>
                    </tr>" : "")}
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; font-weight:bold; border-right:1px solid #e2e8f0;'>Taxable Order Value:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace; font-weight:bold;'>₹ {totalTaxable:N2}</td>
                    </tr>
                    {(totalCgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>CGST:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {totalCgst:N2}</td>
                    </tr>" : "")}
                    {(totalSgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>SGST:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {totalSgst:N2}</td>
                    </tr>" : "")}
                    {(totalIgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>IGST:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {totalIgst:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>Round Off:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='background:#0d9488; color:#ffffff; font-weight:900; font-size:12px;'>
                        <td style='padding:5px 6px; border-right:1px solid #0d9488;'>TOTAL ORDER VALUE:</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:8px; color:#0f766e; text-align:center; margin-top:3px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- DUAL EXECUTION & SIGNATURE FOOTER -->
        <div style='display:grid; grid-template-columns: 1fr 1fr; border-top:1px solid #99f6e4; background:#ffffff; padding:12px 16px; font-size:9px;'>
            <div>
                <div style='font-weight:bold; color:#0f172a; margin-bottom:28px;'>Vendor Acceptance Acknowledgement:</div>
                <div style='font-size:8px; color:#64748b; border-top:1px dashed #94a3b8; width:75%; padding-top:2px;'>Authorized Signatory &amp; Stamp (Date: ______)</div>
            </div>
            <div style='text-align:right;'>
                <div style='font-weight:bold; color:#0f172a; margin-bottom:28px;'>For {buyerName}:</div>
                <div style='font-size:8px; color:#64748b; border-top:1px dashed #94a3b8; width:75%; margin-left:auto; padding-top:2px;'>Authorized Procurement Officer</div>
            </div>
        </div>
    </div>

</div>
</body>
</html>";
    }

    // ==============================================================================
    // 3.3 ⚖️ STATUTORY GST CREDIT NOTE (SECTION 34 CGST ACT & RULE 53 COMPLIANT)
    // ==============================================================================
    private static string RenderCreditNoteStatutoryHtml(PrintTemplate t, SalesReturn? sr, SalesInvoice? invoice, Tenant? tenant)
    {
        // Seller / Supplier Information (Party issuing Credit Note)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOGBILL");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "Corporate Tower, Sector 62, Noida, Uttar Pradesh - 201301");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "09AAACU1234F1Z5");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "+91 80000 12345";
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        // Credit Note Metadata (Rule 53)
        var cnNo = sr?.CreditNoteNumber ?? (invoice != null ? (invoice.InvoiceNumber.StartsWith("CN") ? invoice.InvoiceNumber : $"CN-{invoice.InvoiceNumber}") : "CN-2627-00018");
        var cnDate = sr?.ReturnDate.ToString("dd/MM/yyyy") ?? (invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy"));
        var origInvNo = !string.IsNullOrWhiteSpace(sr?.OriginalInvoiceNumber) ? sr.OriginalInvoiceNumber : "INV-2627-00124";
        var returnReason = !string.IsNullOrWhiteSpace(sr?.ReturnReason) ? sr.ReturnReason : "Sales Return (Defective / Damaged / Excess Stock)";
        var stockStatus = (sr?.RestockToWarehouse ?? true) ? "Inventory Restocked to Warehouse" : "Defective Stock Written-off / Scrapped";

        // Customer / Recipient Details
        var custName = !string.IsNullOrWhiteSpace(sr?.CustomerName)
            ? sr.CustomerName
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : "SHREE BALAJI MEDICOS & HEALTHCARE");
        var custGstin = !string.IsNullOrWhiteSpace(sr?.Party?.GSTIN)
            ? sr.Party.GSTIN
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "09AABCS5678K1Z2");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress)
            ? invoice.BillingAddress
            : "Shop No. 4, Main Market, Civil Lines, Kanpur, UP - 208001";
        var custPhone = !string.IsNullOrWhiteSpace(sr?.Party?.PrimaryPhone) ? sr.Party.PrimaryPhone : (invoice?.CustomerPhone ?? "");
        var posState = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : "09 - Uttar Pradesh";

        // Auto-Detect Pharma / Batch Tracking
        bool hasPharma = !string.IsNullOrWhiteSpace(sellerDl);
        if (sr?.Items != null && sr.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber))) hasPharma = true;
        if (invoice?.Items != null && invoice.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber))) hasPharma = true;

        // Table Rows & Reversal Accumulators
        var rowsSb = new StringBuilder();
        decimal totalTaxable = 0;
        decimal totalTax = 0;
        decimal totalAmount = 0;
        decimal cgstReversal = 0;
        decimal sgstReversal = 0;
        decimal igstReversal = 0;
        int rowIdx = 1;

        if (sr?.Items != null && sr.Items.Any())
        {
            totalTaxable = sr.SubTotal;
            totalTax = sr.TaxAmount;
            totalAmount = sr.TotalAmount;

            // Compute CGST/SGST vs IGST split
            bool isInterState = !string.IsNullOrWhiteSpace(posState) && !posState.StartsWith(sellerGstin.Length >= 2 ? sellerGstin.Substring(0, 2) : "09");
            if (isInterState)
            {
                igstReversal = totalTax;
            }
            else
            {
                cgstReversal = totalTax / 2;
                sgstReversal = totalTax / 2;
            }

            foreach (var item in sr.Items)
            {
                var lineTaxable = item.UnitPrice * item.ReturnQuantity;
                var batch = !string.IsNullOrWhiteSpace(item.BatchNumber) ? item.BatchNumber : "—";

                if (hasPharma)
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName} <span style='font-size:8px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>3004</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{batch}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.ReturnQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Strip</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {lineTaxable:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#059669;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName} <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>3004</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.ReturnQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {lineTaxable:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#059669;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }
        else if (invoice?.Items != null && invoice.Items.Any())
        {
            totalTaxable = invoice.TaxableAmount;
            totalTax = invoice.CgstAmount + invoice.SgstAmount + invoice.IgstAmount;
            totalAmount = invoice.TotalAmount;
            cgstReversal = invoice.CgstAmount;
            sgstReversal = invoice.SgstAmount;
            igstReversal = invoice.IgstAmount;

            foreach (var item in invoice.Items)
            {
                var hsn = !string.IsNullOrWhiteSpace(item.HsnCode) ? item.HsnCode : "3004";
                var batch = !string.IsNullOrWhiteSpace(item.BatchNumber) ? item.BatchNumber : "—";

                if (hasPharma)
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{batch}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Strip</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#059669;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#059669;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }
        else
        {
            // Sample Statutory Credit Note preview
            totalTaxable = 8500.00m;
            cgstReversal = 510.00m;
            sgstReversal = 510.00m;
            totalTax = 1020.00m;
            totalAmount = 9520.00m;

            rowsSb.Append($@"
            <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>1</td>
                <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #e2e8f0;'>Augmentin 625 Duo Tablet</td>
                <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>3004</td>
                {(hasPharma ? "<td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #e2e8f0;'>AUG-26-A1</td>" : "")}
                <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #e2e8f0;'>50.00</td>
                <td style='padding:6px 6px; text-align:center; border-right:1px solid #e2e8f0;'>Strip</td>
                <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ 170.00</td>
                <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #e2e8f0;'>₹ 8,500.00</td>
                <td style='padding:6px 6px; text-align:right; border-right:1px solid #e2e8f0;'>12.00%</td>
                <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#059669;'>₹ 9,520.00</td>
            </tr>");
        }

        var words = ConvertToIndianCurrencyWords(totalAmount);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>GST Credit Note - {cnNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A4 portrait; margin: 8mm 10mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .cn-container {{ width: 100%; max-width: 800px; min-height: 275mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #059669; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='cn-container'>

    <div>
        <!-- TOP STATUTORY HEADER -->
        <div style='background: #ecfdf5; border-bottom: 2px solid #059669; padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start;'>
            <div style='max-width: 62%;'>
                <div style='font-size: 18px; font-weight: 900; text-transform: uppercase; color: #065f46; letter-spacing: 0.3px; line-height: 1.2;'>{sellerName}</div>
                <div style='font-size: 9.5px; color: #334155; margin-top: 3px; line-height: 1.3;'>{sellerAddress}</div>
                <div style='font-size: 9px; color: #065f46; margin-top: 4px; font-family: monospace; display: flex; flex-wrap: wrap; gap: 8px;'>
                    <span><strong>GSTIN:</strong> {sellerGstin}</span>
                    {(!string.IsNullOrEmpty(sellerPan) ? $"<span><strong>PAN:</strong> {sellerPan}</span>" : "")}
                    {(!string.IsNullOrEmpty(sellerPhone) ? $"<span><strong>Phone:</strong> {sellerPhone}</span>" : "")}
                    {(!string.IsNullOrEmpty(sellerDl) ? $"<span><strong>D.L.:</strong> {sellerDl}</span>" : "")}
                </div>
            </div>
            <div style='text-align: right;'>
                <div style='background: #059669; color: #ffffff; font-size: 13px; font-weight: 900; padding: 4px 14px; border-radius: 4px; display: inline-block; letter-spacing: 0.5px;'>GST CREDIT NOTE</div>
                <div style='font-size: 7.5px; color: #047857; margin-top: 2px; font-weight: bold;'>Sec 34 CGST Act, 2017 &amp; Rule 53 Compliant</div>
                <div style='margin-top: 5px; font-size: 9.5px; line-height: 1.4;'>
                    <div>Credit Note No: <strong style='font-family: monospace; font-size: 11px;'>{cnNo}</strong></div>
                    <div>Credit Note Date: <strong>{cnDate}</strong></div>
                </div>
            </div>
        </div>

        <!-- STATUTORY CROSS-REFERENCE RIBBON (RULE 53 MANDATORY) -->
        <div style='background: #f0fdf4; border-bottom: 1px solid #a7f3d0; padding: 6px 16px; font-size: 9px; display: flex; justify-content: space-between; align-items: center;'>
            <div>
                <span style='color: #065f46; font-weight: bold;'>Original Tax Invoice No:</span> <strong style='font-family: monospace; font-size: 10px; color: #0f172a;'>{origInvNo}</strong>
            </div>
            <div>
                <span style='color: #065f46; font-weight: bold;'>Reason for Issuance:</span> <strong>{returnReason}</strong>
            </div>
            <div>
                <span style='background: #dcfce7; color: #166534; font-size: 8.5px; padding: 2px 6px; border-radius: 3px; font-weight: bold;'>{stockStatus}</span>
            </div>
        </div>

        <!-- RECIPIENT (CUSTOMER) & PLACE OF SUPPLY -->
        <div style='display: grid; grid-template-columns: 1.3fr 1fr; gap: 10px; padding: 10px 14px; background: #ffffff; border-bottom: 1.5px solid #059669;'>
            
            <!-- Recipient Card -->
            <div style='border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 10px; font-size: 9px; line-height: 1.4;'>
                <div style='font-size: 9px; text-transform: uppercase; color: #059669; font-weight: bold; border-bottom: 1px solid #d1fae5; padding-bottom: 3px; margin-bottom: 4px;'>
                    Credit Issued To (Customer / Recipient):
                </div>
                <div style='font-size: 12px; font-weight: bold; color: #0f172a;'>{custName}</div>
                <div style='color: #475569; margin-top: 2px;'>{custAddress}</div>
                <div style='margin-top: 4px; font-family: monospace;'>
                    <strong>Customer GSTIN:</strong> <span style='font-size: 10px; font-weight: bold; color: #065f46;'>{custGstin}</span>
                    {(!string.IsNullOrEmpty(custPhone) ? $" | <strong>Phone:</strong> {custPhone}" : "")}
                </div>
            </div>

            <!-- GST Jurisdiction Card -->
            <div style='border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 10px; font-size: 9px; line-height: 1.4;'>
                <div style='font-size: 9px; text-transform: uppercase; color: #059669; font-weight: bold; border-bottom: 1px solid #d1fae5; padding-bottom: 3px; margin-bottom: 4px;'>
                    GST Jurisdiction &amp; Place of Supply:
                </div>
                <div>Place of Supply (POS): <strong>{posState}</strong></div>
                <div style='margin-top: 3px;'>Supply Nature: <strong>{(igstReversal > 0 ? "Inter-State Supply (IGST Reversal)" : "Intra-State Supply (CGST + SGST Reversal)")}</strong></div>
                <div style='margin-top: 3px; color: #475569;'>Ledger Impact: <strong>Customer A/c Credited</strong></div>
            </div>

        </div>

        <!-- ITEMS RETURNED TABLE -->
        <table style='width: 100%; border-collapse: collapse; font-size: 9.5px;'>
            <thead>
                <tr style='background: #d1fae5; color: #065f46; border-bottom: 1.5px solid #059669; font-size: 9px; text-transform: uppercase; letter-spacing: 0.2px;'>
                    <th style='padding: 7px 4px; width: 28px; border-right: 1px solid #a7f3d0; text-align: center;'>#</th>
                    <th style='padding: 7px 8px; text-align: left; border-right: 1px solid #a7f3d0;'>Returned Item Description</th>
                    <th style='padding: 7px 6px; width: 65px; border-right: 1px solid #a7f3d0; text-align: center;'>HSN/SAC</th>
                    {(hasPharma ? "<th style='padding: 7px 6px; width: 70px; border-right: 1px solid #a7f3d0; text-align: center;'>Batch</th>" : "")}
                    <th style='padding: 7px 6px; width: 65px; border-right: 1px solid #a7f3d0; text-align: right;'>Return Qty</th>
                    <th style='padding: 7px 4px; width: 45px; border-right: 1px solid #a7f3d0; text-align: center;'>UOM</th>
                    <th style='padding: 7px 6px; width: 70px; border-right: 1px solid #a7f3d0; text-align: right;'>Rate (₹)</th>
                    <th style='padding: 7px 6px; width: 85px; border-right: 1px solid #a7f3d0; text-align: right;'>Taxable (₹)</th>
                    <th style='padding: 7px 4px; width: 50px; border-right: 1px solid #a7f3d0; text-align: right;'>GST%</th>
                    <th style='padding: 7px 8px; width: 95px; text-align: right;'>Credit (₹)</th>
                </tr>
            </thead>
            <tbody>
                {rowsSb}
            </tbody>
        </table>
    </div>

    <!-- BOTTOM STATUTORY TAX BREAKUP & TOTALS -->
    <div>
        <div style='display: grid; grid-template-columns: 1.25fr 1fr; border-top: 1.5px solid #059669; background: #ecfdf5; padding: 10px 14px; gap: 12px;'>
            
            <!-- Statutory Tax Declaration -->
            <div style='font-size: 8.5px; line-height: 1.4;'>
                <div style='font-size: 9px; font-weight: bold; color: #065f46; border-bottom: 1px solid #a7f3d0; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase;'>
                    Statutory Declaration (Sec 34(2) Proviso):
                </div>
                <div style='color: #334155;'>
                    This Credit Note is issued in accordance with Section 34 of the Central Goods and Services Tax Act, 2017. 
                    The output tax liability has been correspondingly adjusted in our GST returns (GSTR-1). 
                    The recipient is legally required to reverse the corresponding Input Tax Credit (ITC) as per statutory guidelines.
                </div>
                <div style='margin-top: 6px; font-weight: bold; color: #047857;'>
                    GST Output Tax Reversal: CGST: ₹ {cgstReversal:N2} | SGST: ₹ {sgstReversal:N2} {(igstReversal > 0 ? $"| IGST: ₹ {igstReversal:N2}" : "")}
                </div>
            </div>

            <!-- Financial Totals Box -->
            <div>
                <table style='width: 100%; border: 1.5px solid #059669; font-size: 9.5px; background: #ffffff; border-radius: 4px;'>
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>Taxable Value Credited:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {totalTaxable:N2}</td>
                    </tr>
                    {(cgstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>CGST Output Reversal:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {cgstReversal:N2}</td>
                    </tr>" : "")}
                    {(sgstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>SGST Output Reversal:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {sgstReversal:N2}</td>
                    </tr>" : "")}
                    {(igstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>IGST Output Reversal:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {igstReversal:N2}</td>
                    </tr>" : "")}
                    <tr style='background: #059669; color: #ffffff; font-weight: 900; font-size: 12px;'>
                        <td style='padding: 5px 6px; border-right: 1px solid #059669;'>NET CREDIT AMOUNT:</td>
                        <td style='padding: 5px 6px; text-align: right; font-family: monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size: 8px; color: #065f46; text-align: center; margin-top: 3px; font-style: italic;'>({words})</div>
            </div>

        </div>

        <!-- STATUTORY SIGNATORY FOOTER -->
        <div style='display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #a7f3d0; background: #ffffff; padding: 12px 16px; font-size: 9px;'>
            <div>
                <div style='font-weight: bold; color: #0f172a; margin-bottom: 28px;'>Customer Acknowledgment:</div>
                <div style='font-size: 8px; color: #64748b; border-top: 1px dashed #94a3b8; width: 75%; padding-top: 2px;'>Received &amp; Accepted by Recipient</div>
            </div>
            <div style='text-align: right;'>
                <div style='font-weight: bold; color: #0f172a; margin-bottom: 28px;'>For {sellerName}:</div>
                <div style='font-size: 8px; color: #64748b; border-top: 1px dashed #94a3b8; width: 75%; margin-left: auto; padding-top: 2px;'>Authorized Signatory (with Seal)</div>
            </div>
        </div>
    </div>

</div>
</body>
</html>";
    }

    // ==============================================================================
    // 4. 📱 MYBILLBOOK / VYAPAR STYLE (MODERN PURPLE GRADIENT CARD A4/A5)
    // ==============================================================================
    private static string RenderMyBillBookInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "UDYOGBILL SMART RETAIL & TRADERS");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Shop 4, Commercial Market, Sector 18, Noida - 201301");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPhone = tenant?.PrimaryPhone ?? "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "INV-2627-00009";
        var invDate = invoice?.InvoiceDate.ToString("dd MMM yyyy") ?? DateTime.Now.ToString("dd MMM yyyy");
        var custName = invoice?.CustomerName ?? "Walk-in Retail Customer";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custPhone = invoice?.CustomerPhone ?? "";

        var totalAmount = invoice?.TotalAmount ?? 1092.00m;
        var taxable = invoice?.TaxableAmount ?? (invoice?.TotalAmount > 0 ? (invoice.TotalAmount / 1.18m) : 975.00m);
        var totalTax = (invoice?.CgstAmount ?? 0m) + (invoice?.SgstAmount ?? 0m) + (invoice?.IgstAmount ?? 0m);
        if (totalTax == 0 && totalAmount > taxable) totalTax = totalAmount - taxable;

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
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #f1f5f9;'>{idx++}</td>
                    <td style='padding:8px 6px; border-right:1px solid #f1f5f9;'><strong>{it.ItemName}</strong>{ExtractIndustryItemSubline(it)}<br/><span style='font-size:9.5px; color:#64748b;'>HSN: {it.HsnCode ?? "3004"}</span></td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; border-right:1px solid #f1f5f9;'>{it.Quantity:N0} {it.UomCode}</td>
                    <td style='padding:8px 6px; text-align:right; border-right:1px solid #f1f5f9;'>₹{it.UnitPrice:N2}</td>
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #f1f5f9;'>{it.GstRate:N0}%</td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; color:#4f46e5;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            itemsRows.Append(@"
                <tr style='font-size:11px; border-bottom:1px solid #f1f5f9;'>
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #f1f5f9;'>1</td>
                    <td style='padding:8px 6px; border-right:1px solid #f1f5f9;'><strong>Augmentin 625 Duo Tablet</strong><br/><span style='font-size:9.5px; color:#64748b;'>HSN: 30042010</span></td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; border-right:1px solid #f1f5f9;'>5 STP</td>
                    <td style='padding:8px 6px; text-align:right; border-right:1px solid #f1f5f9;'>₹195.00</td>
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #f1f5f9;'>12%</td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; color:#4f46e5;'>₹1,092.00</td>
                </tr>");
        }

        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, "#4f46e5");
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
        <div style='font-family:Inter, Arial, sans-serif; font-size:11px; color:#1e293b; width:100%; max-width:800px; {heightStyle} margin:0 auto; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); background:#fff; display:flex; flex-direction:column; justify-content:space-between;'>
            <div>
                <!-- Modern Accent Banner -->
                <div style='background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;'>
                    <div>
                        <div style='font-size:20px; font-weight:900; letter-spacing:0.5px;'>{sellerName}</div>
                        <div style='font-size:11px; opacity:0.9; margin-top:2px;'>{sellerAddress}</div>
                        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"<div style='font-size:10.5px; opacity:0.85; margin-top:3px;'>GSTIN: {sellerGstin} {(string.IsNullOrEmpty(sellerPhone) ? "" : $"| Contact: {sellerPhone}")}</div>")}
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
            </div>

            <!-- Items Table (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES) -->
            <div style='flex:1 0 auto;'>
                <table style='width:100%; border-collapse:collapse;'>
                    <thead>
                        <tr style='background:#f1f5f9; font-size:10px; font-weight:bold; color:#475569; text-transform:uppercase;'>
                            <th style='padding:8px 6px; width:30px; text-align:center; border-right:1px solid #e2e8f0;'>#</th>
                            <th style='padding:8px 6px; text-align:left; border-right:1px solid #e2e8f0;'>Item Details</th>
                            <th style='padding:8px 6px; width:70px; text-align:right; border-right:1px solid #e2e8f0;'>Qty</th>
                            <th style='padding:8px 6px; width:80px; text-align:right; border-right:1px solid #e2e8f0;'>Rate</th>
                            <th style='padding:8px 6px; width:50px; text-align:center; border-right:1px solid #e2e8f0;'>Tax</th>
                            <th style='padding:8px 6px; width:90px; text-align:right;'>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsRows}
                        {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(6, "#f1f5f9") : "")}
                    </tbody>
                </table>
            </div>

            <div>
                <!-- HSN Summary Table -->
                {hsnSummaryHtml}

                <!-- Bottom Summary & Instant QR -->
                <div style='display:grid; grid-template-columns:1fr 100px 200px; gap:12px; padding:14px 16px; border-top:2px solid #e2e8f0; background:#f8fafc; align-items:center;'>
                    <div style='font-size:10px; color:#64748b;'>
                        🎉 Thank you for choosing {sellerName}!<br/>
                        {(!string.IsNullOrEmpty(sellerPhone) ? $"For questions or support, contact {sellerPhone}." : "")}
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
            </div>
        </div>";
    }

    // ==============================================================================
    // 5. 🏢 CBO ERP STYLE (PCD PHARMA & INSTITUTIONAL GREEN BANNER A4/A5)
    // ==============================================================================
    private static string RenderCboErpInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "AMEISD");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        var invNo = invoice?.InvoiceNumber ?? "CBO-2026-00381";
        var invDate = invoice?.InvoiceDate.ToString("dd-MM-yyyy") ?? DateTime.Now.ToString("dd-MM-yyyy");
        var custName = invoice?.CustomerName ?? "DR. VERMA CLINICAL PHARMA AGENCY";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custAddress = invoice?.BillingAddress ?? "";
        var transporter = invoice?.TransporterName ?? "";
        var lrNo = invoice?.LrNumber ?? "";
        var eWayNo = invoice?.EWayBillNumber ?? "";

        var taxable = invoice?.TaxableAmount ?? (invoice?.TotalAmount > 0 ? (invoice.TotalAmount / 1.18m) : 34500.00m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var totalAmount = invoice?.TotalAmount ?? 38640.00m;

        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? true;
        bool hasPacking = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(ExtractItemPharmaAttributes(i).pack)) ?? true;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;

        int colCount = 7 + (hasPacking ? 1 : 0) + (hasBatch ? 1 : 0) + (hasExpiry ? 1 : 0) + (hasFree ? 1 : 0) + (hasDisc ? 1 : 0);

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
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{idx++}</td>
                    <td style='padding:4px; border-right:1px solid #cbd5e1;'><strong>{it.ItemName}</strong>{ExtractIndustryItemSubline(it)}</td>
                    {(hasPacking ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{(string.IsNullOrEmpty(attrs.pack) ? "-" : attrs.pack)}</td>" : "")}
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{it.HsnCode ?? "3004"}</td>
                    {(hasBatch ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace; font-weight:bold;'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{expStr}</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold;'>{it.Quantity:N0}</td>
                    {(hasFree ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; color:#047857;'>{attrs.freeQty:N0}</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{it.UnitPrice:N2}</td>
                    {(hasDisc ? $"<td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>{it.DiscountPercent:N0}%</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-family:monospace;'>₹{it.TaxableAmount:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>{it.GstRate:N0}%</td>
                    <td style='padding:4px; text-align:right; font-family:monospace; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }
        else
        {
            itemsRows.Append(@"
                <tr style='font-size:10px; border-bottom:1px solid #cbd5e1;'>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>1</td>
                    <td style='padding:4px; border-right:1px solid #cbd5e1;'><strong>CEFTAZIDIME 1GM INJECTION</strong></td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>VIAL+WFI</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>30042099</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; font-weight:bold;'>CFT-261</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>05/28</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold;'>200</td>
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; color:#047857; font-weight:bold;'>20</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>₹140.00</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>0%</td>
                    <td style='padding:4px; text-align:right;'>₹28,000.00</td>
                    <td style='padding:4px; text-align:right;'>12%</td>
                    <td style='padding:4px; text-align:right; font-family:monospace; font-weight:bold;'>₹31,360.00</td>
                </tr>");
        }

        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, "#047857");
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='cbo-invoice-wrap' style='width:100%; max-width:820px; {heightStyle} margin:0 auto; font-family:""Segoe UI"", Arial, sans-serif; font-size:10.5px; color:#0f172a; background:#fff; border:2px solid #047857; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;'>
    <div>
        <!-- CBO 3-Column Top Header -->
        <table style='width:100%; border-collapse:collapse; border-bottom:2px solid #047857;'>
            <tr>
                <!-- Col 1: Marketing Division -->
                <td style='width:38%; padding:8px 10px; border-right:1px solid #047857; vertical-align:top;'>
                    <div style='font-size:15px; font-weight:900; color:#047857; text-transform:uppercase;'>{sellerName}</div>
                    <div style='font-size:9.5px; color:#334155; margin-top:2px;'>PCD Franchise Marketing Division</div>
                    <div style='font-size:9px; color:#475569; margin-top:3px;'>
                        {(!string.IsNullOrEmpty(sellerDl) ? $"D.L. No.: {sellerDl}<br/>" : "")}
                        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin}")}
                    </div>
                </td>
                <!-- Col 2: Central Title -->
                <td style='width:24%; padding:8px; text-align:center; border-right:1px solid #047857; vertical-align:middle; background:#f0fdf4;'>
                    <div style='display:inline-block; background:#047857; color:#fff; font-size:13px; font-weight:bold; padding:3px 12px; border-radius:3px;'>TAX INVOICE</div>
                    <div style='font-size:8.5px; color:#047857; font-weight:bold; margin-top:3px;'>CBO Institutional System</div>
                </td>
                <!-- Col 3: Logistics & Transporter Details -->
                <td style='width:38%; padding:6px 10px; vertical-align:top; font-size:9px;'>
                    <div><strong>Invoice No:</strong> <span style='font-weight:bold; font-family:monospace; color:#047857;'>{invNo}</span></div>
                    <div><strong>Date:</strong> {invDate}</div>
                    {(!string.IsNullOrEmpty(transporter) ? $"<div><strong>Transporter:</strong> {transporter}</div>" : "")}
                    {(!string.IsNullOrEmpty(lrNo) ? $"<div><strong>L.R. No:</strong> {lrNo}</div>" : "")}
                    {(!string.IsNullOrEmpty(eWayNo) ? $"<div><strong>E-Way Bill:</strong> {eWayNo}</div>" : "")}
                </td>
            </tr>
        </table>

        <!-- Buyer Details Box -->
        <div style='padding:6px 10px; background:#f8fafc; border-bottom:1px solid #047857;'>
            <span style='font-size:8.5px; font-weight:bold; color:#047857; text-transform:uppercase;'>Franchise Partner / Institutional Buyer:</span>
            <div style='font-size:12px; font-weight:bold; color:#0f172a;'>{custName}</div>
            <div style='font-size:9.5px; color:#334155;'>
                {(string.IsNullOrEmpty(custAddress) ? "" : $"{custAddress} | ")}
                {(string.IsNullOrEmpty(custGstin) ? "" : $"<strong>GSTIN:</strong> {custGstin}")}
            </div>
        </div>
    </div>

    <!-- Line Items Table (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES EXTENDING TO BOTTOM) -->
    <div style='flex:1 0 auto; border-bottom:1.5px solid #047857;'>
        <table style='width:100%; border-collapse:collapse;'>
            <thead>
                <tr style='background:#f0fdf4; color:#065f46; font-size:9px; font-weight:bold; border-bottom:1px solid #047857; text-transform:uppercase;'>
                    <th style='padding:5px 4px; width:25px; text-align:center; border-right:1px solid #cbd5e1;'>S.N.</th>
                    <th style='padding:5px 4px; text-align:left; border-right:1px solid #cbd5e1;'>Brand / Molecule</th>
                    {(hasPacking ? "<th style='padding:5px 4px; width:45px; text-align:center; border-right:1px solid #cbd5e1;'>Pack</th>" : "")}
                    <th style='padding:5px 4px; width:55px; text-align:center; border-right:1px solid #cbd5e1;'>HSN</th>
                    {(hasBatch ? "<th style='padding:5px 4px; width:65px; text-align:center; border-right:1px solid #cbd5e1;'>Batch</th>" : "")}
                    {(hasExpiry ? "<th style='padding:5px 4px; width:45px; text-align:center; border-right:1px solid #cbd5e1;'>Exp</th>" : "")}
                    <th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #cbd5e1;'>Qty</th>
                    {(hasFree ? "<th style='padding:5px 4px; width:35px; text-align:center; border-right:1px solid #cbd5e1;'>Free</th>" : "")}
                    <th style='padding:5px 4px; width:55px; text-align:right; border-right:1px solid #cbd5e1;'>Rate</th>
                    {(hasDisc ? "<th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #cbd5e1;'>Disc%</th>" : "")}
                    <th style='padding:5px 4px; width:65px; text-align:right; border-right:1px solid #cbd5e1;'>Taxable</th>
                    <th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #cbd5e1;'>GST</th>
                    <th style='padding:5px 4px; width:75px; text-align:right;'>Total</th>
                </tr>
            </thead>
            <tbody>
                {itemsRows}
                {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(colCount, "#cbd5e1") : "")}
            </tbody>
        </table>
    </div>

    <div>
        <!-- HSN Summary Table -->
        {hsnSummaryHtml}

        <!-- Footer Summary Matrix -->
        <table style='width:100%; border-collapse:collapse; font-size:9.5px;'>
            <tr>
                <td style='width:60%; padding:8px 10px; vertical-align:top; border-right:1px solid #cbd5e1;'>
                    <div><strong>Amount in words:</strong> {ConvertToIndianCurrencyWords(totalAmount)}</div>
                    <div style='margin-top:6px; font-size:9px; color:#334155; line-height:1.35;'>
                        <em>Goods sold are meant for PCD franchise marketing under Drugs &amp; Cosmetics Act.</em>
                    </div>
                </td>
                <td style='width:40%; padding:6px 10px; vertical-align:top; background:#f8fafc;'>
                    <table style='width:100%; border-collapse:collapse; font-size:10px; line-height:1.5;'>
                        <tr><td>Taxable Total:</td><td style='text-align:right; font-family:monospace;'>₹ {taxable:N2}</td></tr>
                        <tr><td>CGST:</td><td style='text-align:right; font-family:monospace;'>₹ {cgst:N2}</td></tr>
                        <tr><td>SGST:</td><td style='text-align:right; font-family:monospace;'>₹ {sgst:N2}</td></tr>
                        <tr style='border-top:1.5px solid #047857; background:#047857; color:#fff; font-weight:bold;'>
                            <td style='padding:4px 6px; font-size:11px;'>INVOICE TOTAL:</td>
                            <td style='padding:4px 6px; text-align:right; font-family:monospace; font-size:12px;'>₹ {totalAmount:N2}</td>
                        </tr>
                    </table>
                    <div style='margin-top:8px; text-align:right; font-weight:bold; font-size:9px;'>
                        For {sellerName}<br/><br/>
                        <span style='font-size:8px; font-weight:normal; color:#64748b;'>Authorised Signatory</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</div>";
    }

    // ==============================================================================
    // 6. 🩺 PHARMA RETAIL CHEMIST RX BILL (RED MEDICAL ACCENT A4/A5)
    // ==============================================================================
    private static string RenderPharmaRxHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "MEDICARE PHARMACY & SURGICALS");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "Civil Hospital Road, Chembur, Mumbai - 400071");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        var invNo = invoice?.InvoiceNumber ?? "RX-2627-0104";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var custName = invoice?.CustomerName ?? "Walk-in Patient";
        var custPhone = invoice?.CustomerPhone ?? "";
        var docName = invoice?.DoctorName ?? "";
        var docReg = invoice?.DoctorRegistrationNumber ?? "";
        var total = invoice?.TotalAmount ?? 1420.00m;
        var words = ConvertToIndianCurrencyWords(total);

        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; max-width:800px; {heightStyle} margin:0 auto; padding:20px; border:1px solid #94a3b8; background:#fff; font-size:12px; display:flex; flex-direction:column; justify-content:space-between;'>
    <div>
        <div style='display:flex; justify-content:space-between; border-bottom:2px solid #dc2626; padding-bottom:8px;'>
            <div>
                <h2 style='color:#dc2626; margin:0;'>{sellerName}</h2>
                <div style='font-size:11px;'>{sellerAddress}</div>
                <div style='font-size:11px; font-weight:bold;'>
                    {(!string.IsNullOrEmpty(sellerDl) ? $"DL No: {sellerDl} | " : "")}
                    {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin}")}
                </div>
            </div>
            <div style='text-align:right;'>
                <div style='background:#dc2626; color:#fff; padding:3px 10px; font-weight:bold; border-radius:4px; display:inline-block;'>RETAIL PHARMA INVOICE</div>
                <div style='font-size:12px; font-weight:bold; margin-top:4px;'>Invoice No: {invNo}</div>
                <div style='font-size:11px;'>Date: {invDate}</div>
            </div>
        </div>

        <!-- Doctor & Patient Details (Rendered if present) -->
        <div style='display:grid; grid-template-columns:1.5fr 1fr; gap:12px; margin-top:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:8px 12px;'>
            <div>
                <div style='font-size:10px; color:#991b1b; font-weight:bold; text-transform:uppercase;'>Patient Details</div>
                <div style='font-size:13px; font-weight:bold;'>{custName}</div>
                {(!string.IsNullOrEmpty(custPhone) ? $"<div style='font-size:11px; color:#475569;'>Contact: {custPhone}</div>" : "")}
            </div>
            <div>
                <div style='font-size:10px; color:#991b1b; font-weight:bold; text-transform:uppercase;'>Prescribed By Doctor</div>
                <div style='font-size:13px; font-weight:bold; color:#dc2626;'>{(!string.IsNullOrEmpty(docName) ? docName : "Self / Medical Consultation")}</div>
                {(!string.IsNullOrEmpty(docReg) ? $"<div style='font-size:11px; color:#475569;'>Reg Number: <strong>{docReg}</strong></div>" : "")}
            </div>
        </div>
    </div>

    <!-- Items with Batch, Expiry, Salt & H1 flags (FULL HEIGHT STRETCHED) -->
    <div style='flex:1 0 auto; margin-top:12px; border:1px solid #cbd5e1;'>
        <table style='width:100%; border-collapse:collapse; font-size:11px;'>
            <thead>
                <tr style='background:#dc2626; color:#fff;'>
                    <th style='padding:6px; text-align:center; border-right:1px solid #cbd5e1;'>#</th>
                    <th style='padding:6px; text-align:left; border-right:1px solid #cbd5e1;'>Medicine Description</th>
                    <th style='padding:6px; text-align:center; border-right:1px solid #cbd5e1;'>Batch</th>
                    <th style='padding:6px; text-align:center; border-right:1px solid #cbd5e1;'>Exp</th>
                    <th style='padding:6px; text-align:right; border-right:1px solid #cbd5e1;'>MRP</th>
                    <th style='padding:6px; text-align:right; border-right:1px solid #cbd5e1;'>Qty</th>
                    <th style='padding:6px; text-align:right; border-right:1px solid #cbd5e1;'>Disc %</th>
                    <th style='padding:6px; text-align:right;'>Net Amount</th>
                </tr>
            </thead>
            <tbody>
                {RenderFullPageLineItemsRows(invoice)}
                {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(8, "#cbd5e1") : "")}
            </tbody>
        </table>
    </div>

    <div>
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
    </div>
</div>";
    }

    // ==============================================================================
    // 7. 📄 COMPACT TRADE MEMO / CASH MEMO (A5 TEAL ACCENT)
    // ==============================================================================
    private static string RenderA5CompactHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) ? t.PrimaryColorHex : "#0f766e";
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Udyog Wholesale Traders");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}" : "Sector 18, Vashi, Navi Mumbai");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");

        var invNo = invoice?.InvoiceNumber ?? "MEMO-2627-049";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var total = invoice?.TotalAmount ?? 8950.00m;
        var taxable = invoice?.TaxableAmount ?? (total / 1.12m);
        var totalTax = total - taxable;
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; width:100%; max-width:740px; {heightStyle} margin:0 auto; padding:10px 14px; border:1.5px solid {primaryColor}; border-radius:6px; background:#fff; font-size:10.5px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;'>
    <div>
        <div style='display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1.5px solid {primaryColor}; padding-bottom:6px;'>
            <div style='max-width:65%;'>
                <strong style='font-size:16px; font-weight:900; color:{primaryColor}; text-transform:uppercase;'>{sellerName}</strong><br/>
                <span style='font-size:10px; color:#334155;'>{sellerAddress} {(string.IsNullOrEmpty(sellerGstin) ? "" : $"| <strong>GSTIN:</strong> {sellerGstin}")}</span>
            </div>
            <div style='text-align:right;'>
                <div style='background:{primaryColor}; color:#fff; padding:2px 8px; font-size:11px; font-weight:900; border-radius:3px; display:inline-block;'>CASH / TRADE MEMO</div><br/>
                <span style='font-size:10.5px; margin-top:2px; display:inline-block;'>No: <strong style='font-family:monospace;'>{invNo}</strong> | Date: <strong>{invDate}</strong></span>
            </div>
        </div>
        <div style='display:flex; justify-content:space-between; margin:6px 0; font-size:10.5px; background:#f8fafc; padding:4px 8px; border-radius:4px; border:1px solid #e2e8f0;'>
            <div>Billed To: <strong style='color:#0f172a;'>{invoice?.CustomerName ?? "Walk-in Customer"}</strong> {(string.IsNullOrEmpty(invoice?.CustomerGSTIN) ? "" : $"| GSTIN: <span style='font-family:monospace;'>{invoice.CustomerGSTIN}</span>")}</div>
            <div>Place of Supply: <strong>{invoice?.PlaceOfSupply ?? "Local"}</strong></div>
        </div>
    </div>

    <!-- Table with vertical column lines stretched -->
    <div style='flex:1 0 auto; border:1px solid #cbd5e1; border-radius:4px;'>
        <table style='width:100%; border-collapse:collapse; font-size:10px;'>
            <thead>
                <tr style='background:{primaryColor}15; color:{primaryColor}; font-weight:bold; height:24px;'>
                    <th style='padding:4px; border-right:1px solid #cbd5e1; text-align:left;'>Item Description</th>
                    <th style='padding:4px; border-right:1px solid #cbd5e1; width:60px; text-align:center;'>HSN</th>
                    <th style='padding:4px; border-right:1px solid #cbd5e1; width:45px; text-align:right;'>Qty</th>
                    <th style='padding:4px; border-right:1px solid #cbd5e1; width:65px; text-align:right;'>Rate (₹)</th>
                    <th style='padding:4px; border-right:1px solid #cbd5e1; width:65px; text-align:right;'>Taxable</th>
                    <th style='padding:4px; width:75px; text-align:right;'>Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                {RenderFullPageLineItemsRows(invoice)}
                {((invoice?.Items?.Count ?? 0) <= 5 ? RenderTableFillerRow(6, "#cbd5e1") : "")}
            </tbody>
        </table>
    </div>

    <div style='display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px; font-size:10px; border-top:1px solid #cbd5e1; padding-top:4px;'>
        <div style='color:#64748b;'>
            <span>Terms: Payment strictly within agreed terms.</span><br/>
            <span>Goods once sold will not be accepted back.</span>
        </div>
        <div style='text-align:right;'>
            <div style='font-size:10px; color:#475569;'>Taxable: ₹{taxable:N2} | GST: ₹{totalTax:N2}</div>
            <div style='font-size:13px; font-weight:900; color:{primaryColor}; font-family:monospace;'>Grand Total: ₹{total:N2}</div>
        </div>
    </div>
</div>";
    }

    // ==============================================================================
    // 8. 🖨️ THERMAL POS RECEIPT (80MM / 58MM SLIP)
    // ==============================================================================
    private static string RenderThermalSlipHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "CITY PHARMA RETAIL");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}" : "Plot 12, Station Road, Andheri West");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPhone = tenant?.PrimaryPhone ?? "";
        var sellerDl = tenant?.DrugLicenseNumber ?? "";

        var invNo = invoice?.InvoiceNumber ?? "POS-2627-0081";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yy HH:mm") ?? DateTime.Now.ToString("dd/MM/yy HH:mm");
        var total = invoice?.TotalAmount ?? 680.00m;
        var subTotal = invoice?.SubTotal > 0 ? invoice.SubTotal : (total / 1.12m);
        var tax = total - subTotal;
        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiQr = !string.IsNullOrEmpty(upiId) ? $"https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26am%3D{total}%26cu%3DINR" : "";

        var itemsSb = new StringBuilder();
        if (invoice?.Items != null && invoice.Items.Any())
        {
            foreach (var it in invoice.Items)
            {
                itemsSb.Append($"<tr><td>{it.ItemName}</td><td style='text-align:center;'>{it.Quantity:N0}</td><td style='text-align:right;'>{it.UnitPrice:N2}</td><td style='text-align:right;'>{it.TotalAmount:N2}</td></tr>");
            }
        }
        else
        {
            itemsSb.Append("<tr><td>Dolo 650mg (15s)</td><td style='text-align:center;'>2</td><td style='text-align:right;'>30.00</td><td style='text-align:right;'>60.00</td></tr>");
            itemsSb.Append("<tr><td>Azithral 500 (3s)</td><td style='text-align:center;'>1</td><td style='text-align:right;'>115.00</td><td style='text-align:right;'>115.00</td></tr>");
            itemsSb.Append("<tr><td>Becosules Caps (20s)</td><td style='text-align:center;'>1</td><td style='text-align:right;'>50.00</td><td style='text-align:right;'>50.00</td></tr>");
        }

        return $@"
<div class='thermal-slip' style='font-family:monospace; width:280px; margin:0 auto; padding:8px; font-size:11px; line-height:1.3; color:#000;'>
    <div style='text-align:center;'>
        <strong style='font-size:15px;'>{sellerName}</strong><br/>
        {sellerAddress}<br/>
        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin} ")}{(string.IsNullOrEmpty(sellerPhone) ? "" : $"| Ph: {sellerPhone}")}<br/>
        {(!string.IsNullOrEmpty(sellerDl) ? $"DL No: {sellerDl}<br/>" : "")}
        ----------------------------------------<br/>
        <strong>CASH / POS RECEIPT</strong><br/>
        Bill No: {invNo} | {invDate}<br/>
        Mode: {invoice?.PrimaryPaymentMode.ToString() ?? "CASH"}<br/>
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
            {itemsSb}
        </tbody>
    </table>
    <div style='border-top:1px dashed #000; padding-top:4px;'>
        <div style='display:flex; justify-content:space-between;'><span>Sub Total:</span><span>₹{subTotal:N2}</span></div>
        <div style='display:flex; justify-content:space-between;'><span>GST Total:</span><span>₹{tax:N2}</span></div>
        <div style='display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:2px; border-top:1px solid #000; border-bottom:1px solid #000; padding:2px 0;'>
            <span>NET PAYABLE:</span><span>₹{total:N2}</span>
        </div>
    </div>
    {(!string.IsNullOrEmpty(upiQr) ? $@"
    <div style='text-align:center; margin-top:6px;'>
        <img src='{upiQr}' alt='UPI QR' style='width:80px; height:80px; margin:0 auto; display:block;' />
        <span style='font-size:9px;'>Scan & Pay via any UPI App</span><br/>
    </div>" : "")}
    <div style='text-align:center; margin-top:4px;'>
        ----------------------------------------<br/>
        *** THANK YOU! VISIT AGAIN ***<br/>
        <span style='font-size:9px;'>Computer generated receipt</span>
    </div>
</div>";
    }

    // ==============================================================================
    // 📊 STATUTORY HSN / SAC TAX BREAKDOWN MATRIX GENERATOR
    // ==============================================================================
    private static string RenderHsnSummaryTable(SalesInvoice? invoice, string themeColor)
    {
        if (invoice?.Items == null || !invoice.Items.Any())
        {
            return $@"
            <div style='margin-top:6px; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
                <div style='background:{themeColor}15; color:{themeColor}; font-weight:bold; font-size:9.5px; padding:3px 6px; text-transform:uppercase;'>
                    Statutory HSN / SAC Tax Summary
                </div>
                <table style='width:100%; border-collapse:collapse; font-size:9.5px;'>
                    <thead>
                        <tr style='background:#f8fafc; border-bottom:1px solid #cbd5e1; color:#475569;'>
                            <th style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1;'>HSN/SAC</th>
                            <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>Taxable Value</th>
                            <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>CGST</th>
                            <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>SGST</th>
                            <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>IGST</th>
                            <th style='padding:3px 4px; text-align:right;'>Total Tax</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style='border-bottom:1px solid #e2e8f0;'>
                            <td style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace;'>30042010</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹ 18,500.00</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>6% (₹ 1,110.00)</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>6% (₹ 1,110.00)</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>-</td>
                            <td style='padding:3px 4px; text-align:right; font-weight:bold;'>₹ 2,220.00</td>
                        </tr>
                        <tr style='background:#f8fafc; font-weight:bold;'>
                            <td style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1;'>TOTAL</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹ 18,500.00</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹ 1,110.00</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹ 1,110.00</td>
                            <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹ 0.00</td>
                            <td style='padding:3px 4px; text-align:right; color:{themeColor};'>₹ 2,220.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>";
        }

        var groups = invoice.Items
            .GroupBy(i => new { Hsn = string.IsNullOrWhiteSpace(i.HsnCode) ? "N/A" : i.HsnCode, Rate = i.GstRate })
            .ToList();

        decimal sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumTotalTax = 0;
        var rowsSb = new StringBuilder();

        foreach (var g in groups)
        {
            var grpTaxable = g.Sum(x => x.TaxableAmount);
            var grpCgst = g.Sum(x => x.CgstAmount);
            var grpSgst = g.Sum(x => x.SgstAmount);
            var grpIgst = g.Sum(x => x.IgstAmount);
            var grpTotalTax = grpCgst + grpSgst + grpIgst;

            sumTaxable += grpTaxable;
            sumCgst += grpCgst;
            sumSgst += grpSgst;
            sumIgst += grpIgst;
            sumTotalTax += grpTotalTax;

            var halfRate = g.Key.Rate / 2;
            var cgstDisplay = grpCgst > 0 ? $"{halfRate:N0}% (₹{grpCgst:N2})" : "-";
            var sgstDisplay = grpSgst > 0 ? $"{halfRate:N0}% (₹{grpSgst:N2})" : "-";
            var igstDisplay = grpIgst > 0 ? $"{g.Key.Rate:N0}% (₹{grpIgst:N2})" : "-";

            rowsSb.Append($@"
            <tr style='border-bottom:1px solid #e2e8f0;'>
                <td style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace;'>{g.Key.Hsn}</td>
                <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{grpTaxable:N2}</td>
                <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{cgstDisplay}</td>
                <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{sgstDisplay}</td>
                <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{igstDisplay}</td>
                <td style='padding:3px 4px; text-align:right; font-weight:bold;'>₹{grpTotalTax:N2}</td>
            </tr>");
        }

        return $@"
        <div style='margin-top:6px; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
            <div style='background:{themeColor}15; color:{themeColor}; font-weight:bold; font-size:9.5px; padding:3px 6px; text-transform:uppercase;'>
                Statutory HSN / SAC Tax Summary (Rule 46)
            </div>
            <table style='width:100%; border-collapse:collapse; font-size:9.5px;'>
                <thead>
                    <tr style='background:#f8fafc; border-bottom:1px solid #cbd5e1; color:#475569;'>
                        <th style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1;'>HSN/SAC</th>
                        <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>Taxable Value</th>
                        <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>CGST</th>
                        <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>SGST</th>
                        <th style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>IGST</th>
                        <th style='padding:3px 4px; text-align:right;'>Total Tax</th>
                    </tr>
                </thead>
                <tbody>
                    {rowsSb}
                    <tr style='background:#f8fafc; font-weight:bold;'>
                        <td style='padding:3px 4px; text-align:center; border-right:1px solid #cbd5e1;'>TOTAL</td>
                        <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{sumTaxable:N2}</td>
                        <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{sumCgst:N2}</td>
                        <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{sumSgst:N2}</td>
                        <td style='padding:3px 4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{sumIgst:N2}</td>
                        <td style='padding:3px 4px; text-align:right; color:{themeColor};'>₹{sumTotalTax:N2}</td>
                    </tr>
                </tbody>
            </table>
        </div>";
    }

    // ==============================================================================
    // ⚙️ HELPERS & SEEDER
    // ==============================================================================
    private static string RenderTableFillerRow(int columnCount, string borderColor)
    {
        var sb = new StringBuilder("<tr style='height:100%; vertical-align:top;'>");
        for (int i = 0; i < columnCount; i++)
        {
            var borderStyle = (i < columnCount - 1) ? $"border-right:1px solid {borderColor};" : "";
            sb.Append($"<td style='{borderStyle}'>&nbsp;</td>");
        }
        sb.Append("</tr>");
        return sb.ToString();
    }

    private static string RenderSignatureLineItemsRows(SalesInvoice? invoice, bool hasPharma, bool hasFree, bool hasMrp, bool hasDisc, bool hasPtr, bool hasPts)
    {
        if (invoice?.Items != null && invoice.Items.Any())
        {
            var sb = new StringBuilder();
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                decimal itemPtr = attrs.ptr;
                decimal itemPts = attrs.pts;

                if (itemPtr <= 0 && it.Mrp > 0 && hasPtr)
                {
                    decimal gstFactor = 1m + (it.GstRate / 100m);
                    itemPtr = Math.Round((it.Mrp * 0.80m) / (gstFactor > 0 ? gstFactor : 1.12m), 2);
                }
                if (itemPts <= 0 && it.Mrp > 0 && hasPts)
                {
                    decimal basePtr = itemPtr > 0 ? itemPtr : Math.Round((it.Mrp * 0.80m) / (1m + (it.GstRate / 100m)), 2);
                    itemPts = Math.Round(basePtr * 0.90m, 2);
                }

                var batchExp = !string.IsNullOrWhiteSpace(it.BatchNumber) 
                    ? $"{it.BatchNumber} {(it.ExpiryDate.HasValue ? "(" + it.ExpiryDate.Value.ToString("MM/yy") + ")" : "")}".Trim()
                    : "-";

                sb.Append($@"
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>{idx++}</td>
    <td style='padding:3px 6px; border-right:1px solid #cbd5e1;'>
        <strong>{it.ItemName}</strong>{ExtractIndustryItemSubline(it)}
        {(string.IsNullOrEmpty(attrs.pack) ? "" : $" <span style='font-size:9px; color:#64748b;'>({attrs.pack})</span>")}
    </td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>{it.HsnCode ?? "-"}</td>
    {(hasPharma ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>{batchExp}</td>" : "")}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{it.Quantity:N0}</td>
    {(hasFree ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{attrs.freeQty:N0}</td>" : "")}
    {(hasMrp ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹{it.Mrp:N2}</td>" : "")}
    {(hasPtr ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{(itemPtr > 0 ? $"₹{itemPtr:N2}" : "-")}</td>" : "")}
    {(hasPts ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{(itemPts > 0 ? $"₹{itemPts:N2}" : "-")}</td>" : "")}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹{it.UnitPrice:N2}</td>
    {(hasDisc ? $"<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{it.DiscountPercent:N0}%</td>" : "")}
    <td style='padding:3px 4px; border-right:1px solid #cbd5e1; text-align:right;'>₹{it.TaxableAmount:N2}</td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>{it.GstRate:N0}%</td>
    <td style='padding:3px 6px; text-align:right; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
</tr>");
            }
            return sb.ToString();
        }

        // Professional Fallback Sample Rows for Preview
        var freeCol1 = hasFree ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>10</td>" : "";
        var freeCol2 = hasFree ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>0</td>" : "";
        var mrpCol1 = hasMrp ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹150.00</td>" : "";
        var mrpCol2 = hasMrp ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹35.00</td>" : "";
        var ptrCol1 = hasPtr ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹120.00</td>" : "";
        var ptrCol2 = hasPtr ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹28.00</td>" : "";
        var ptsCol1 = hasPts ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹108.00</td>" : "";
        var ptsCol2 = hasPts ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹25.20</td>" : "";
        var pharmaCol1 = hasPharma ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>AZ-991 (12/28)</td>" : "";
        var pharmaCol2 = hasPharma ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>DL-442 (08/27)</td>" : "";
        var discCol1 = hasDisc ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>5%</td>" : "";
        var discCol2 = hasDisc ? "<td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>0%</td>" : "";

        return $@"
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>1</td>
    <td style='padding:3px 6px; border-right:1px solid #cbd5e1;'><strong>Augmentin 625 Duo Tablets</strong><br/><span style='font-size:9px; color:#64748b;'>10 Tabs Strip</span></td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>30049099</td>
    {pharmaCol1}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>100</td>
    {freeCol1}
    {mrpCol1}
    {ptrCol1}
    {ptsCol1}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹120.00</td>
    {discCol1}
    <td style='padding:3px 4px; border-right:1px solid #cbd5e1; text-align:right;'>₹11,400.00</td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:3px 6px; text-align:right; font-weight:bold;'>₹12,768.00</td>
</tr>
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>2</td>
    <td style='padding:3px 6px; border-right:1px solid #cbd5e1;'><strong>Paracetamol 650mg Dolo</strong><br/><span style='font-size:9px; color:#64748b;'>15 Tabs Strip</span></td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:center;'>30049099</td>
    {pharmaCol2}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>200</td>
    {freeCol2}
    {mrpCol2}
    {ptrCol2}
    {ptsCol2}
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>₹30.00</td>
    {discCol2}
    <td style='padding:3px 4px; border-right:1px solid #cbd5e1; text-align:right;'>₹6,000.00</td>
    <td style='padding:3px; border-right:1px solid #cbd5e1; text-align:right;'>12%</td>
    <td style='padding:3px 6px; text-align:right; font-weight:bold;'>₹6,720.00</td>
</tr>";
    }

    private static string RenderFullPageLineItemsRows(SalesInvoice? invoice)
    {
        if (invoice?.Items != null && invoice.Items.Any())
        {
            var sb = new StringBuilder();
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var batchExp = !string.IsNullOrWhiteSpace(it.BatchNumber) 
                    ? $"{it.BatchNumber} {(it.ExpiryDate.HasValue ? "(" + it.ExpiryDate.Value.ToString("MM/yy") + ")" : "")}".Trim()
                    : "-";

                sb.Append($@"
<tr style='border-bottom:1px solid #e2e8f0; height:24px;'>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>{idx++}</td>
    <td style='padding:4px 6px; border-right:1px solid #cbd5e1;'>
        <strong>{it.ItemName}</strong>{ExtractIndustryItemSubline(it)}
        {(string.IsNullOrEmpty(attrs.pack) ? "" : $" <span style='font-size:9px; color:#64748b;'>({attrs.pack})</span>")}
    </td>
    <td style='padding:4px; border-right:1px solid #cbd5e1; text-align:center;'>{it.HsnCode ?? "-"}</td>
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
    <td style='padding:4px 6px; border-right:1px solid #cbd5e1;'><strong>Augmentin 625 Duo Tablets</strong><br/><span style='font-size:9px; color:#64748b;'>10 Tabs Strip</span></td>
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

    private static (string pack, decimal freeQty, decimal ptr, decimal pts) ExtractItemPharmaAttributes(SalesInvoiceItem item)
    {
        string pack = "";
        decimal freeQty = 0;
        decimal ptr = 0;
        decimal pts = 0;
        if (!string.IsNullOrEmpty(item.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    var name = prop.Name.ToLowerInvariant();
                    if (name == "packing" || name == "pack")
                    {
                        pack = prop.Value.GetString() ?? "";
                    }
                    else if (name == "freequantity" || name == "freeqty" || name == "free")
                    {
                        if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.Number) freeQty = prop.Value.GetDecimal();
                        else if (decimal.TryParse(prop.Value.GetString(), out var fNum)) freeQty = fNum;
                    }
                    else if (name == "ptr")
                    {
                        if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.Number) ptr = prop.Value.GetDecimal();
                        else if (decimal.TryParse(prop.Value.GetString(), out var rNum)) ptr = rNum;
                    }
                    else if (name == "pts")
                    {
                        if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.Number) pts = prop.Value.GetDecimal();
                        else if (decimal.TryParse(prop.Value.GetString(), out var sNum)) pts = sNum;
                    }
                }
            }
            catch {}
        }
        return (pack, freeQty, ptr, pts);
    }

    private static string ExtractIndustryItemSubline(SalesInvoiceItem item)
    {
        if (string.IsNullOrWhiteSpace(item.AttributesJson) || item.AttributesJson == "{}") return "";
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(item.AttributesJson);
            var root = doc.RootElement;
            var parts = new List<string>();

            // Electronics: IMEI / Serial & Warranty
            if (root.TryGetProperty("imeiSerial", out var imeiProp))
            {
                var imei = imeiProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(imei)) parts.Add($"IMEI/SN: {imei}");
            }
            if (root.TryGetProperty("warrantyMonths", out var wProp))
            {
                int w = 0;
                if (wProp.ValueKind == System.Text.Json.JsonValueKind.Number) w = wProp.GetInt32();
                else if (int.TryParse(wProp.GetString(), out var pw)) w = pw;
                if (w > 0) parts.Add($"Warranty: {w}M");
            }
            if (root.TryGetProperty("brand", out var bProp))
            {
                var b = bProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(b)) parts.Add($"Brand: {b}");
            }

            // Hardware: Dimensions & Weight
            if (root.TryGetProperty("sqft", out var sqftProp))
            {
                decimal sqft = 0;
                if (sqftProp.ValueKind == System.Text.Json.JsonValueKind.Number) sqft = sqftProp.GetDecimal();
                else if (decimal.TryParse(sqftProp.GetString(), out var ps)) sqft = ps;
                if (sqft > 0)
                {
                    var len = root.TryGetProperty("length", out var lp) ? lp.ToString() : "";
                    var wid = root.TryGetProperty("width", out var wp) ? wp.ToString() : "";
                    var u = root.TryGetProperty("dimensionUnit", out var up) ? up.GetString() : "ft";
                    parts.Add(!string.IsNullOrWhiteSpace(len) && !string.IsNullOrWhiteSpace(wid)
                        ? $"Dim: {len}x{wid} {u} ({sqft:0.##} Sq.Ft)"
                        : $"{sqft:0.##} Sq.Ft");
                }
            }
            if (root.TryGetProperty("totalWeightKg", out var twProp))
            {
                decimal tw = 0;
                if (twProp.ValueKind == System.Text.Json.JsonValueKind.Number) tw = twProp.GetDecimal();
                else if (decimal.TryParse(twProp.GetString(), out var ptw)) tw = ptw;
                if (tw > 0) parts.Add($"Wt: {tw:0.##} Kg");
            }
            if (root.TryGetProperty("contractorName", out var cProp))
            {
                var c = cProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(c)) parts.Add($"Contractor: {c}");
            }

            // Garments: Size, Color, Style
            if (root.TryGetProperty("styleCode", out var stProp))
            {
                var st = stProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(st)) parts.Add($"Style: {st}");
            }
            if (root.TryGetProperty("size", out var sProp))
            {
                var sz = sProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(sz)) parts.Add($"Size: {sz}");
            }
            if (root.TryGetProperty("color", out var colProp))
            {
                var col = colProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(col)) parts.Add($"Color: {col}");
            }

            // FMCG: Case packaging & Schemes
            if (root.TryGetProperty("caseQty", out var cqProp))
            {
                decimal cq = 0;
                if (cqProp.ValueKind == System.Text.Json.JsonValueKind.Number) cq = cqProp.GetDecimal();
                else if (decimal.TryParse(cqProp.GetString(), out var pcq)) cq = pcq;
                if (cq > 0)
                {
                    var loose = root.TryGetProperty("pcsQty", out var lq) ? lq.ToString() : "0";
                    parts.Add($"Case: {cq} (Loose: {loose})");
                }
            }
            if (root.TryGetProperty("schemeDesc", out var scProp))
            {
                var sc = scProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(sc)) parts.Add($"Scheme: {sc}");
            }

            // Service: SAC, Period, Job Sheet
            if (root.TryGetProperty("sacCode", out var sacProp))
            {
                var sac = sacProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(sac)) parts.Add($"SAC: {sac}");
            }
            if (root.TryGetProperty("servicePeriodFrom", out var pfProp))
            {
                var pf = pfProp.GetString()?.Trim();
                var pt = root.TryGetProperty("servicePeriodTo", out var ptProp) ? ptProp.GetString()?.Trim() : "";
                if (!string.IsNullOrWhiteSpace(pf)) parts.Add($"Period: {pf} to {pt}");
            }
            if (root.TryGetProperty("jobSheetRef", out var jsProp))
            {
                var js = jsProp.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(js)) parts.Add($"Job Ref: {js}");
            }

            if (parts.Count > 0)
            {
                return $"<div style='font-size:8px; color:#475569; font-weight:normal; margin-top:2px;'>{string.Join(" | ", parts)}</div>";
            }
        }
        catch {}
        return "";
    }

    private static string ExtractInvoiceBuyerDl(SalesInvoice? invoice)
    {
        if (invoice == null) return "";
        if (!string.IsNullOrEmpty(invoice.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(invoice.AttributesJson);
                if (doc.RootElement.TryGetProperty("customerDlNumber", out var cdl))
                {
                    var val = cdl.GetString() ?? "";
                    if (!string.IsNullOrWhiteSpace(val)) return val;
                }
            }
            catch {}
        }
        return invoice.Party?.DrugLicenseNumber1 ?? "";
    }

    private static string ExtractInvoiceTradeTier(SalesInvoice? invoice)
    {
        if (invoice == null) return "";
        if (!string.IsNullOrEmpty(invoice.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(invoice.AttributesJson);
                if (doc.RootElement.TryGetProperty("pharmaTradeTier", out var pt))
                {
                    return pt.GetString() ?? "";
                }
            }
            catch {}
        }
        return "";
    }

    private static string ConvertToIndianCurrencyWords(decimal amount)
    {
        return IndianCurrencyInWordsConverter.ToWords(amount);
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
        if (IsA5Size(t))
        {
            return @"
@page { size: 210mm 148mm; margin: 3mm 4mm; }
@media print {
    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .invoice-wrapper, .invoice-container, .cbo-invoice-wrap { width: 100% !important; min-height: 138mm !important; height: auto !important; max-height: none !important; box-sizing: border-box !important; }
}
";
        }

        if (t.PageSize == PageSizeFormat.Thermal_80mm || t.PageSize == PageSizeFormat.Thermal_58mm)
        {
            return @"
@page { size: 80mm auto; margin: 0; }
@media print {
    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; }
    .thermal-slip { width: 100% !important; max-width: 80mm !important; }
}
";
        }

        return @"
@page { size: 210mm 297mm; margin: 4mm 5mm; }
@media print {
    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .invoice-wrapper, .invoice-container, .cbo-invoice-wrap { width: 100% !important; min-height: 274mm !important; height: auto !important; max-height: none !important; box-sizing: border-box !important; }
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
                TemplateName = "UdyogBill Signature B2B Universal Tax Invoice (A4)",
                TemplateCode = "TPL_UDYOGBILL_SIGNATURE_B2B",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#1e40af",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                BankAccountName = null,
                BankAccountNumber = null,
                BankIfsc = null,
                BankName = null,
                ShowUpiQr = true,
                UpiId = null,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "We declare that this invoice shows the actual price of goods and that all particulars are true and correct."
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
                UpiId = null,
                ShowSavingsCallout = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Pharma & FMCG Classic Tax Invoice (A4 Grid Edition)",
                TemplateCode = "TPL_PHARMA_PRO_TAX_INVOICE",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#c2410c",
                SecondaryColorHex = "#334155",
                HeaderTitle = "Tax Invoice",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Marg Pharma Classic Half-Page Tax Invoice (A5)",
                TemplateCode = "TPL_MARG_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#166534",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.POSReceipt,
                TemplateName = "Pharma Retail Cash Memo (A5 Half-Page Non-GST)",
                TemplateCode = "TPL_CASH_MEMO_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#166534",
                SecondaryColorHex = "#0f172a",
                HeaderTitle = "CASH MEMO",
                HeaderSubtitle = "Retail Counter Sale Memo",
                ShowGstin = false,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = false,
                ShowBatchExpiry = true,
                ShowDeclaration = false
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.PurchaseOrder,
                TemplateName = "Executive Commercial Purchase Order (A4)",
                TemplateCode = "TPL_PURCHASE_ORDER_EXECUTIVE",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#0d9488",
                SecondaryColorHex = "#334155",
                HeaderTitle = "PURCHASE ORDER",
                HeaderSubtitle = "Commercial Procurement Order",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = false,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "This Purchase Order constitutes a binding commercial agreement upon vendor acceptance. Goods must strictly match specified terms, quality parameters, and delivery schedule."
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.CreditNote,
                TemplateName = "Statutory GST Credit Note (A4 Section 34)",
                TemplateCode = "TPL_CREDIT_NOTE_STATUTORY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#059669",
                SecondaryColorHex = "#1e293b",
                HeaderTitle = "GST CREDIT NOTE",
                HeaderSubtitle = "Issued under Section 34 of CGST Act, 2017 & Rule 53 of CGST Rules",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = true,
                DeclarationText = "This Credit Note is issued in accordance with Section 34 of the CGST Act, 2017. The corresponding output tax liability and customer input tax credit reversal have been accounted for."
            }
        };

        _context.PrintTemplates.AddRange(defaultTemplates);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string RenderPharmaProTaxInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant)
    {
        // Seller Information (100% Genuine, zero dummy fallback)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : (invoice != null ? "Store" : "SVASMIT PHARMACEUTICALS PVT LTD"));
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : (invoice != null ? "" : "HASAN PUR DEPO., DELHI, Delhi, 110092, India"));

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var logoUrl = !string.IsNullOrEmpty(t.LogoUrl) ? t.LogoUrl : (!string.IsNullOrEmpty(tenant?.LogoUrl) ? tenant.LogoUrl : "");

        // Invoice Metadata
        var invNo = invoice?.InvoiceNumber ?? "0016";
        var invDate = invoice?.InvoiceDate.ToString("MM/dd/yyyy HH:mm") ?? DateTime.Now.ToString("MM/dd/yyyy HH:mm");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("MM/dd/yyyy HH:mm") : invDate;

        // Customer Details (BILL TO / SHIP TO)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Cash Customer" : "R K MEDICOS,");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : (invoice != null ? "" : "SHOP NO. 2 WATER WORK WAZIRABAD, DELHI, DELHI, INDIA");
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";
        var custDl = ExtractInvoiceBuyerDl(invoice);

        // Logistics & Transport Metadata
        var transporter = !string.IsNullOrWhiteSpace(invoice?.TransporterName) ? invoice.TransporterName : "";
        var vehicleNo = !string.IsNullOrWhiteSpace(invoice?.VehicleNumber) ? invoice.VehicleNumber : "";
        var lrNo = !string.IsNullOrWhiteSpace(invoice?.LrNumber) ? invoice.LrNumber : "";
        var lrDate = invoice?.LrDate?.ToString("dd-MMM-yyyy") ?? "";
        var eWayNo = !string.IsNullOrWhiteSpace(invoice?.EWayBillNumber) ? invoice.EWayBillNumber : "";
        bool hasLogistics = !string.IsNullOrWhiteSpace(transporter) || !string.IsNullOrWhiteSpace(vehicleNo) ||
                            !string.IsNullOrWhiteSpace(lrNo) || !string.IsNullOrWhiteSpace(eWayNo);

        // Financial Totals (Precise 2 decimals)
        var totalAmount = invoice?.TotalAmount ?? 10321.00m;
        var taxable = invoice?.TaxableAmount ?? 9829.80m;
        var cgst = invoice?.CgstAmount ?? 245.75m;
        var sgst = invoice?.SgstAmount ?? 245.75m;
        var igst = invoice?.IgstAmount ?? 0m;
        var roundOff = invoice?.RoundOff ?? -0.30m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // Bank Details (100% Genuine, zero dummy fallback)
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAccountName = !string.IsNullOrWhiteSpace(t.BankAccountName) ? t.BankAccountName : sellerLegalName;
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var bankBranch = !string.IsNullOrWhiteSpace(tenant?.BankBranch) ? tenant.BankBranch : "";
        var rawUpi = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiId = (!string.IsNullOrWhiteSpace(rawUpi) && !rawUpi.Contains("9876543210") && !rawUpi.Contains("example.com")) ? rawUpi : "";
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount}%26cu%3DINR"
            : "";
        bool hasValidBank = t.ShowBankDetails && (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(bankAcc) || !string.IsNullOrWhiteSpace(bankIfsc));

        // Line Items & HSN Summary
        var (itemsHtml, hsnRowsHtml, hsnTotalsHtml) = RenderPharmaProItemsAndHsn(invoice, taxable, cgst, sgst, igst);

        var termsCity = !string.IsNullOrWhiteSpace(invoice?.Branch?.City) ? invoice.Branch.City : (!string.IsNullOrWhiteSpace(tenant?.City) ? tenant.City : "DELHI");

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>Tax Invoice - {invNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A4 portrait; margin: 4mm 6mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .page-wrapper {{ width: 100%; max-width: 820px; min-height: 284mm; height: 284mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }}
        .pharma-grid-invoice {{ width: 100%; box-sizing: border-box; border: 1px solid #9ca2af; font-size: 9.5px; line-height: 1.35; display: flex; flex-direction: column; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='page-wrapper'>
    <div class='pharma-grid-invoice'>

        <!-- TOP HEADER -->
        <div style='display:flex; justify-content:space-between; align-items:flex-start; padding:10px 12px; border-bottom:1px solid #9ca2af;'>
            <div style='display:flex; gap:12px; align-items:center; max-width:62%;'>
                {(!string.IsNullOrEmpty(logoUrl) ? $"<img src='{logoUrl}' alt='Logo' style='max-height:62px; max-width:115px; object-fit:contain;' />" : "")}
                <div>
                    <div style='font-size:17px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.2px; line-height:1.2;'>{sellerName}</div>
                    {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:9.5px; color:#334155; margin-top:2px;'>{sellerAddress}</div>" : "")}
                    {(!string.IsNullOrEmpty(sellerPhone) ? $"<div style='font-size:9.5px; color:#334155;'>Mobile: <strong>{sellerPhone}</strong></div>" : "")}
                    <div style='font-size:9.5px; color:#334155; margin-top:1px;'>
                        {(!string.IsNullOrEmpty(sellerGstin) ? $"GST NUM: <strong style='font-family:monospace;'>{sellerGstin}</strong>" : "")}
                        {(!string.IsNullOrEmpty(sellerDl) ? $" | DRUG LICEN: <strong style='font-family:monospace;'>{sellerDl}</strong>" : "")}
                    </div>
                </div>
            </div>

            <div style='text-align:right; min-width:35%;'>
                <div style='background:#c2410c; color:#ffffff; font-size:14px; font-weight:900; padding:5px 18px; border-radius:6px; display:inline-block; letter-spacing:0.5px;'>Tax Invoice</div>
                <div style='font-size:10px; margin-top:4px; line-height:1.35;'>
                    <div>Invoice No. <strong style='font-family:monospace;'>{invNo}</strong></div>
                    <div>Date <strong>{invDate}</strong></div>
                    {(!string.IsNullOrEmpty(dueDate) ? $"<div>Due Date <strong>{dueDate}</strong></div>" : "")}
                </div>
                {(!string.IsNullOrEmpty(upiQr) ? $"<div style='margin-top:4px;'><img src='{upiQr}' alt='QR' style='width:68px; height:68px; border:1px solid #9ca2af;' /></div>" : "")}
            </div>
        </div>

        <!-- BILL TO / SHIP TO BOX -->
        <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1px solid #9ca2af; font-size:9.5px;'>
            <div style='padding:6px 10px; border-right:1px solid #9ca2af;'>
                <div style='font-weight:bold; color:#475569; text-transform:uppercase; font-size:8.5px; letter-spacing:0.5px;'>BILL TO (RECIPIENT)</div>
                <div style='font-weight:900; font-size:11.5px; color:#0f172a; margin-top:2px;'>{custName}</div>
                <div style='color:#334155; line-height:1.3;'>{custAddress}</div>
                {(!string.IsNullOrEmpty(custPhone) ? $"<div style='margin-top:2px;'>Mobile: <strong>{custPhone}</strong></div>" : "")}
                {(!string.IsNullOrEmpty(custGstin) ? $"<div>GST: <strong style='font-family:monospace;'>{custGstin}</strong></div>" : "")}
                {(!string.IsNullOrEmpty(custDl) ? $"<div>DL NUM- <strong style='font-family:monospace;'>{custDl}</strong></div>" : "")}
            </div>
            <div style='padding:6px 10px;'>
                <div style='font-weight:bold; color:#475569; text-transform:uppercase; font-size:8.5px; letter-spacing:0.5px;'>SHIP TO / DISPATCH</div>
                <div style='font-weight:bold; font-size:10.5px; color:#0f172a; margin-top:2px; line-height:1.3;'>{shipAddress}</div>
                {(hasLogistics ? $@"
                <div style='margin-top:4px; font-size:8.5px; color:#475569; line-height:1.3;'>
                    {(!string.IsNullOrEmpty(transporter) ? $"<div>Transporter: <strong>{transporter}</strong></div>" : "")}
                    {(!string.IsNullOrEmpty(vehicleNo) ? $"<div>Vehicle No: <strong>{vehicleNo}</strong></div>" : "")}
                    {(!string.IsNullOrEmpty(lrNo) ? $"<div>LR No: <strong>{lrNo}</strong> {(string.IsNullOrEmpty(lrDate) ? "" : $"Dt: {lrDate}")}</div>" : "")}
                    {(!string.IsNullOrEmpty(eWayNo) ? $"<div>E-Way Bill: <strong>{eWayNo}</strong></div>" : "")}
                </div>" : "")}
            </div>
        </div>

        <!-- PRODUCTS LINE ITEMS GRID TABLE -->
        <table style='width:100%; border-collapse:collapse; font-size:9px; border-bottom:1px solid #9ca2af;'>
            <thead>
                <tr style='background:#e4e7eb; border-bottom:1px solid #9ca2af; font-weight:bold; color:#0f172a; height:24px;'>
                    <th style='width:24px; border-right:1px solid #9ca2af; text-align:center;'>S.</th>
                    <th style='border-right:1px solid #9ca2af; text-align:left; padding:0 4px;'>Product</th>
                    <th style='width:46px; border-right:1px solid #9ca2af; text-align:center;'>Packing</th>
                    <th style='width:52px; border-right:1px solid #9ca2af; text-align:center;'>HSN/SAC</th>
                    <th style='width:48px; border-right:1px solid #9ca2af; text-align:center;'>Lot No</th>
                    <th style='width:40px; border-right:1px solid #9ca2af; text-align:center;'>Expiry</th>
                    <th style='width:36px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:34px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Free</th>
                    <th style='width:42px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:34px; border-right:1px solid #9ca2af; text-align:center;'>Unit</th>
                    <th style='width:44px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:34px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Disc</th>
                    <th style='width:54px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Taxable</th>
                    <th style='width:40px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>CGST %</th>
                    <th style='width:40px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>SGST %</th>
                    <th style='width:40px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>IGST %</th>
                    <th style='width:60px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsHtml}
            </tbody>
        </table>

        <!-- MIDDLE SECTION: BANK DETAILS + QR + TOTALS TABLE -->
        <div style='display:flex; justify-content:space-between; align-items:flex-start; padding:8px 10px; border-bottom:1px solid #9ca2af; gap:8px;'>
            <!-- Left: Bank Details -->
            <div style='flex:1.2; font-size:9.5px; line-height:1.45;'>
                {(hasValidBank ? $@"
                <div style='font-weight:bold; margin-bottom:2px;'>Bank Details:</div>
                {(!string.IsNullOrEmpty(bankName) ? $"<div><strong>Bank:</strong> {bankName}</div>" : "")}
                {(!string.IsNullOrEmpty(bankAccountName) ? $"<div><strong>Account Name:</strong> {bankAccountName}</div>" : "")}
                {(!string.IsNullOrEmpty(bankAcc) ? $"<div><strong>Account No:</strong> <span style='font-family:monospace;'>{bankAcc}</span></div>" : "")}
                {(!string.IsNullOrEmpty(bankIfsc) ? $"<div><strong>IFSC:</strong> <span style='font-family:monospace;'>{bankIfsc}</span></div>" : "")}
                {(!string.IsNullOrEmpty(bankBranch) ? $"<div><strong>Branch:</strong> {bankBranch}</div>" : "")}
                " : "")}
            </div>

            <!-- Center: UPI QR Code -->
            <div style='width:120px; text-align:center;'>
                {(!string.IsNullOrEmpty(upiQr) ? $@"
                <img src='{upiQr}' alt='Scan to Pay' style='width:88px; height:88px; border:1px solid #9ca2af; border-radius:2px;' />
                <div style='font-size:8px; color:#334155; margin-top:2px;'>Scan to Pay (₹{totalAmount:N2})</div>
                " : "")}
            </div>

            <!-- Right: Totals Table -->
            <div style='width:285px;'>
                <table style='width:100%; border-collapse:collapse; border:1px solid #9ca2af; font-size:10.5px;'>
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca2af;'>Subtotal:</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace; font-weight:bold;'>₹ {taxable:N2}</td>
                    </tr>
                    {(cgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca2af;'>CGST</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace;'>(+) ₹ {cgst:N2}</td>
                    </tr>" : "")}
                    {(sgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca2af;'>SGST / UTGST</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace;'>(+) ₹ {sgst:N2}</td>
                    </tr>" : "")}
                    {(igst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca2af;'>IGST</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace;'>(+) ₹ {igst:N2}</td>
                    </tr>" : "")}
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:bold; border-right:1px solid #9ca2af;'>Total GST</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace; font-weight:bold;'>(+) ₹ {(cgst + sgst + igst):N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #9ca2af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca2af;'>Round Off:</td>
                        <td style='padding:3px 8px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #9ca2af; font-size:12px; font-weight:900; background:#e4e7eb;'>
                        <td style='padding:4px 8px; border-right:1px solid #9ca2af;'>Total:</td>
                        <td style='padding:4px 8px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:9px; text-align:center; padding:3px; color:#334155; font-style:italic;'>({words})</div>
            </div>
        </div>

        <!-- GST / HSN SUMMARY -->
        <div style='padding:6px 10px; border-bottom:1px solid #9ca2af;'>
            <div style='font-size:9.5px; font-weight:bold; color:#0f172a; text-transform:uppercase; margin-bottom:3px;'>GST / HSN SUMMARY</div>
            <table style='width:100%; border-collapse:collapse; border:1px solid #9ca2af; font-size:9px;'>
                <thead>
                    <tr style='background:#e4e7eb; border-bottom:1px solid #9ca2af; font-weight:bold; color:#0f172a;'>
                        <th style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af;'>HSN/SAC</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>Taxable</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>CGST %</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>CGST Amt</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>SGST %</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>SGST Amt</th>
                        <th style='padding:3px 6px; text-align:right;'>Total Tax</th>
                    </tr>
                </thead>
                <tbody>
                    {hsnRowsHtml}
                    {hsnTotalsHtml}
                </tbody>
            </table>
        </div>

        <!-- TERMS AND CONDITIONS -->
        <div style='padding:6px 10px; font-size:8.5px; line-height:1.4;'>
            <div style='font-weight:bold; margin-bottom:2px;'>Terms and Conditions:</div>
            <ul style='margin:0; padding-left:14px;'>
                <li><strong>Payment:</strong> Due within 45 days. <strong>18% p.a.</strong> interest applies to overdue amounts.</li>
                <li><strong>Claims:</strong> Report shortages or damages within <strong>24 hours</strong> of delivery.</li>
                <li><strong>Returns:</strong> Goods sold are non-returnable except for manufacturing defects or recalls.</li>
                <li><strong>Storage:</strong> No liability for quality loss due to improper storage after delivery.</li>
                <li><strong>Regulatory:</strong> Sold under <strong>Drugs &amp; Cosmetics Act</strong>; verify Batch/Expiry upon receipt.</li>
                <li><strong>Jurisdiction:</strong> Subject to courts in {termsCity} only.</li>
            </ul>
        </div>

    </div>

    <!-- FOOTER (OUTSIDE MAIN BORDER BOX) -->
    <div style='display:flex; justify-content:space-between; align-items:flex-end; padding:8px 4px 2px 4px; font-size:9px; color:#475569;'>
        <div>
            <div>This is a computer generated invoice and does not require signature.</div>
            <div style='margin-top:2px; font-family:monospace;'>https://www.udyogbill.com</div>
        </div>
        <div style='text-align:right;'>
            <div style='font-weight:bold; color:#0f172a;'>Authorised Signatory</div>
            <div style='font-size:8px; color:#64748b;'>1/1</div>
        </div>
    </div>
</div>
</body>
</html>";
    }

    private static (string itemsHtml, string hsnRowsHtml, string hsnTotalsHtml) RenderPharmaProItemsAndHsn(
        SalesInvoice? invoice, decimal taxable, decimal cgst, decimal sgst, decimal igst)
    {
        var itemsSb = new StringBuilder();
        var hsnSb = new StringBuilder();
        string hsnTotalsHtml;

        if (invoice?.Items != null && invoice.Items.Any())
        {
            int idx = 1;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var packing = !string.IsNullOrWhiteSpace(attrs.pack) ? attrs.pack : "-";
                var hsn = !string.IsNullOrWhiteSpace(it.HsnCode) ? it.HsnCode : "-";
                var lotNo = !string.IsNullOrWhiteSpace(it.BatchNumber) ? it.BatchNumber : "-";
                var expiry = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                var freeStr = attrs.freeQty > 0 ? attrs.freeQty.ToString("0.00") : "0.00";
                var mrpStr = it.Mrp > 0 ? it.Mrp.ToString("0.00") : "-";
                var unitStr = !string.IsNullOrWhiteSpace(it.UomCode) ? it.UomCode : "Strip";
                var discStr = it.DiscountPercent > 0 ? it.DiscountPercent.ToString("0.00") : (it.DiscountAmount > 0 ? it.DiscountAmount.ToString("0.00") : "0.00");

                string cgstPct = "-", sgstPct = "-", igstPct = "-";
                if (it.IgstAmount > 0 || igst > 0)
                {
                    igstPct = $"{it.GstRate:0.00}%";
                }
                else
                {
                    cgstPct = $"{(it.GstRate / 2):0.00}%";
                    sgstPct = $"{(it.GstRate / 2):0.00}%";
                }

                itemsSb.Append($@"
                <tr style='height:24px; border-bottom:1px solid #9ca2af; font-size:9px;'>
                    <td style='border-right:1px solid #9ca2af; text-align:center;'>{idx++}</td>
                    <td style='border-right:1px solid #9ca2af; padding:2px 4px; font-weight:bold;'>{it.ItemName}{ExtractIndustryItemSubline(it)}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:center;'>{packing}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:center; font-family:monospace;'>{hsn}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:center;'>{lotNo}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:center;'>{expiry}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{it.Quantity:0.00}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{freeStr}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{mrpStr}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:center;'>{unitStr}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{it.UnitPrice:0.00}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{discStr}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{it.TaxableAmount:N2}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{cgstPct}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{sgstPct}</td>
                    <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>{igstPct}</td>
                    <td style='text-align:right; padding:0 4px; font-weight:bold;'>{it.TotalAmount:N2}</td>
                </tr>");
            }

            // Single expanding filler row with vertical columns ONLY (NO horizontal line)
            int emptyHeight = Math.Max(70, 360 - (invoice.Items.Count * 25));
            itemsSb.Append($@"
            <tr style='height:{emptyHeight}px;'>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>");

            // HSN Aggregation
            var groups = invoice.Items
                .GroupBy(i => new { Hsn = string.IsNullOrWhiteSpace(i.HsnCode) ? "N/A" : i.HsnCode, Rate = i.GstRate })
                .ToList();

            decimal sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumTotalTax = 0;
            foreach (var g in groups)
            {
                var grpTaxable = g.Sum(x => x.TaxableAmount);
                var grpCgst = g.Sum(x => x.CgstAmount);
                var grpSgst = g.Sum(x => x.SgstAmount);
                var grpIgst = g.Sum(x => x.IgstAmount);
                var grpTotal = grpCgst + grpSgst + grpIgst;

                sumTaxable += grpTaxable;
                sumCgst += grpCgst;
                sumSgst += grpSgst;
                sumTotalTax += grpTotal;

                var halfRate = g.Key.Rate / 2;
                var cgstPct = grpCgst > 0 ? $"{halfRate:0.00}%" : "-";
                var sgstPct = grpSgst > 0 ? $"{halfRate:0.00}%" : "-";

                hsnSb.Append($@"
                <tr style='border-bottom:1px solid #9ca2af; font-size:9px;'>
                    <td style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af; font-weight:bold;'>{g.Key.Hsn}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{grpTaxable:N2}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{cgstPct}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{grpCgst:N2}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{sgstPct}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{grpSgst:N2}</td>
                    <td style='padding:3px 6px; text-align:right; font-weight:bold;'>{grpTotal:N2}</td>
                </tr>");
            }

            hsnTotalsHtml = $@"
            <tr style='font-weight:bold; font-size:9.5px; border-top:1px solid #9ca2af; background:#e4e7eb;'>
                <td style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af;'>TOTAL</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{sumTaxable:N2}</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{sumCgst:N2}</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>{sumSgst:N2}</td>
                <td style='padding:3px 6px; text-align:right;'>{sumTotalTax:N2}</td>
            </tr>";
        }
        else
        {
            // Sample Fallback Rows matching user's photo exactly for template preview
            itemsSb.Append(@"
            <tr style='height:24px; border-bottom:1px solid #9ca2af; font-size:9px;'>
                <td style='border-right:1px solid #9ca2af; text-align:center;'>1</td>
                <td style='border-right:1px solid #9ca2af; padding:2px 4px; font-weight:bold;'>SVASLIV-300</td>
                <td style='border-right:1px solid #9ca2af; text-align:center;'>10X10</td>
                <td style='border-right:1px solid #9ca2af; text-align:center; font-family:monospace;'>30049099</td>
                <td style='border-right:1px solid #9ca2af; text-align:center;'>GT30427</td>
                <td style='border-right:1px solid #9ca2af; text-align:center;'>11/27</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>30.00</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>9.00</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>430.00</td>
                <td style='border-right:1px solid #9ca2af; text-align:center;'>Strip</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>327.66</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>0.00</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>9,829.80</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>2.50%</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>2.50%</td>
                <td style='border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>—</td>
                <td style='text-align:right; padding:0 4px; font-weight:bold;'>10,321.19</td>
            </tr>");

            // Single expanding filler row with vertical columns ONLY (NO horizontal line)
            itemsSb.Append(@"
            <tr style='height:335px;'>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td style='border-right:1px solid #9ca2af;'>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>");

            hsnSb.Append(@"
            <tr style='border-bottom:1px solid #9ca2af; font-size:9px;'>
                <td style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af; font-weight:bold;'>30049099</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>9,829.80</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>2.50%</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>245.75</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>2.50%</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>245.75</td>
                <td style='padding:3px 6px; text-align:right; font-weight:bold;'>491.49</td>
            </tr>");

            hsnTotalsHtml = @"
            <tr style='font-weight:bold; font-size:9.5px; border-top:1px solid #9ca2af; background:#e4e7eb;'>
                <td style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af;'>TOTAL</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>9,829.80</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>245.75</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>245.75</td>
                <td style='padding:3px 6px; text-align:right;'>491.49</td>
            </tr>";
        }

        return (itemsSb.ToString(), hsnSb.ToString(), hsnTotalsHtml);
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
}
