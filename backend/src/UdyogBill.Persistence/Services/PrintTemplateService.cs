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
                PrimaryColorHex = "#1e40af",
                SecondaryColorHex = "#2563eb",
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
                TemplateName = "Marg Pharma Classic Half-Page Tax Invoice (A5 Executive)",
                TemplateCode = "TPL_MARG_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#0284c7",
                SecondaryColorHex = "#0369a1",
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
                TemplateName = "Pharma Retail Cash Memo (A5 Half-Page Non-GST Executive)",
                TemplateCode = "TPL_CASH_MEMO_HALF_PAGE_A5",
                PageSize = PageSizeFormat.A5_Landscape,
                IsDefault = false,
                PrimaryColorHex = "#0e7490",
                SecondaryColorHex = "#0891b2",
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
                PrimaryColorHex = "#1d4ed8",
                SecondaryColorHex = "#2563eb",
                HeaderTitle = "PURCHASE ORDER",
                HeaderSubtitle = "Commercial Procurement Order",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = false,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
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
                TemplateName = "GST Credit Note (A4)",
                TemplateCode = "TPL_CREDIT_NOTE_STATUTORY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#b45309",
                SecondaryColorHex = "#d97706",
                HeaderTitle = "GST CREDIT NOTE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            };
            _context.PrintTemplates.Add(cnTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!existingCodes.Contains("TPL_ENTERPRISE_PREMIUM_DYNAMIC"))
        {
            var dynamicTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Enterprise Classic Executive Edition (A4)",
                TemplateCode = "TPL_ENTERPRISE_PREMIUM_DYNAMIC",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#4338ca",
                SecondaryColorHex = "#4f46e5",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            };
            _context.PrintTemplates.Add(dynamicTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            // Auto-migrate ALL existing templates for this tenant to differentiated executive colors:
            // Purchase Orders -> Sapphire Blue (#1d4ed8 / #2563eb)
            // Invoices -> Royal Indigo (#4338ca / #4f46e5)
            // Credit Notes -> Warm Amber (#b45309 / #d97706)
            // Cash Memo -> Petrol Cyan (#0e7490 / #0891b2)
            // Tally Prime -> Classic ERP B&W (#000000 / #334155)
            var coloredTemplates = await _context.PrintTemplates
                .Where(t => t.TenantId == tenantId && !t.IsDeleted && 
                           (t.PrimaryColorHex == "#0f172a" || t.PrimaryColorHex == null || t.PrimaryColorHex == ""))
                .ToListAsync(cancellationToken);
            if (coloredTemplates.Any())
            {
                foreach (var ct in coloredTemplates)
                {
                    if (ct.DocumentType == PrintDocumentType.PurchaseOrder || ct.TemplateCode.Contains("PURCHASE_ORDER"))
                    {
                        ct.PrimaryColorHex = "#1d4ed8";
                        ct.SecondaryColorHex = "#2563eb";
                    }
                    else if (ct.DocumentType == PrintDocumentType.CreditNote || ct.TemplateCode.Contains("CREDIT_NOTE"))
                    {
                        ct.PrimaryColorHex = "#b45309";
                        ct.SecondaryColorHex = "#d97706";
                    }
                    else if (ct.TemplateCode == "TPL_CASH_MEMO_HALF_PAGE_A5" || ct.TemplateCode.Contains("CASH_MEMO"))
                    {
                        ct.PrimaryColorHex = "#0e7490";
                        ct.SecondaryColorHex = "#0891b2";
                    }
                    else if (ct.TemplateCode == "TPL_B2B_TALLY" || ct.TemplateCode.Contains("TALLY"))
                    {
                        ct.PrimaryColorHex = "#000000";
                        ct.SecondaryColorHex = "#334155";
                    }
                    else
                    {
                        ct.PrimaryColorHex = "#4338ca";
                        ct.SecondaryColorHex = "#4f46e5";
                    }
                }
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        if (!existingCodes.Contains("TPL_B2B_TALLY"))
        {
            var tallyTpl = new PrintTemplate
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Tally Prime ERP Classic (100% Dynamic Legal A4)",
                TemplateCode = "TPL_B2B_TALLY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#000000",
                SecondaryColorHex = "#334155",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            };
            _context.PrintTemplates.Add(tallyTpl);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var legacyTemplates = await _context.PrintTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted && 
                        t.TemplateCode != "TPL_ENTERPRISE_PREMIUM_DYNAMIC" &&
                        t.TemplateCode != "TPL_B2B_TALLY" &&
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
                        (t.TemplateCode == "TPL_ENTERPRISE_PREMIUM_DYNAMIC" ||
                         t.TemplateCode == "TPL_B2B_TALLY" ||
                         t.TemplateCode == "TPL_UDYOGBILL_SIGNATURE_B2B" || 
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

        // Inject dynamic custom watermark configured by user (Text or Store Logo)
        html = InjectCustomWatermark(html, template, tenant);

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

    private static string InjectCustomWatermark(string html, PrintTemplate template, Tenant? tenant)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(template.CustomLabelsJson) || template.CustomLabelsJson.Trim() == "{}")
            {
                return html;
            }

            using var doc = System.Text.Json.JsonDocument.Parse(template.CustomLabelsJson);
            var root = doc.RootElement;

            bool enabled = false;
            if (root.TryGetProperty("watermarkEnabled", out var weProp))
            {
                enabled = weProp.ValueKind == System.Text.Json.JsonValueKind.True;
            }

            if (!enabled)
            {
                return html;
            }

            string type = "text";
            if (root.TryGetProperty("watermarkType", out var wtProp) && wtProp.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                type = wtProp.GetString() ?? "text";
            }

            string watermarkText = "ORIGINAL FOR RECIPIENT";
            if (root.TryGetProperty("watermarkText", out var txtProp) && txtProp.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                var val = txtProp.GetString();
                if (!string.IsNullOrWhiteSpace(val)) watermarkText = val.Trim();
            }

            double opacity = 0.12;
            if (root.TryGetProperty("watermarkOpacity", out var opProp) && opProp.ValueKind == System.Text.Json.JsonValueKind.Number)
            {
                opacity = Math.Clamp(opProp.GetDouble() / 100.0, 0.03, 0.50);
            }

            string watermarkInnerHtml;
            if (type.Equals("logo", StringComparison.OrdinalIgnoreCase))
            {
                var logoUrl = !string.IsNullOrWhiteSpace(template.LogoUrl) ? template.LogoUrl : tenant?.LogoUrl;
                if (!string.IsNullOrWhiteSpace(logoUrl))
                {
                    watermarkInnerHtml = $"<img src='{System.Net.WebUtility.HtmlEncode(logoUrl)}' style='max-width:350px; max-height:250px; object-fit:contain; filter:grayscale(100%);' />";
                }
                else
                {
                    watermarkInnerHtml = $"<div style='font-size:52px; font-weight:900; letter-spacing:4px; text-transform:uppercase; font-family:sans-serif; border:4px solid currentColor; padding:12px 28px; border-radius:10px;'>{System.Net.WebUtility.HtmlEncode(watermarkText)}</div>";
                }
            }
            else
            {
                watermarkInnerHtml = $"<div style='font-size:52px; font-weight:900; letter-spacing:4px; text-transform:uppercase; font-family:sans-serif; border:4px solid currentColor; padding:12px 28px; border-radius:10px; white-space:nowrap;'>{System.Net.WebUtility.HtmlEncode(watermarkText)}</div>";
            }

            var watermarkBlock = $@"
<div class='invoice-watermark' style='position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); opacity:{opacity:F2}; pointer-events:none; z-index:100; color:#475569; display:flex !important; align-items:center; justify-content:center;'>
    {watermarkInnerHtml}
</div>";

            return $"<div style='position:relative; width:100%; height:100%;'>{watermarkBlock}{html}</div>";
        }
        catch
        {
            return html;
        }
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

        // 0.3 Enterprise Sovereign Color Edition (100% Dynamic Legal A4 Flagship)
        if (code.Contains("ENTERPRISE_PREMIUM_DYNAMIC") || code.Contains("SOVEREIGN_COLOR") || code.Contains("TPL_ENTERPRISE_PREMIUM_DYNAMIC"))
        {
            return RenderEnterprisePremiumDynamicInvoiceHtml(t, invoice, tenant);
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
    // 0.3 👑 ENTERPRISE SOVEREIGN COLOR EDITION (100% DYNAMIC & 100% LEGAL A4)
    // ==============================================================================
    private static string RenderEnterprisePremiumDynamicInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        // 1. Color Palette: Executive Royal Indigo for Invoices (Distinguished from PO)
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#4338ca"; // Executive Royal Indigo
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) && t.SecondaryColorHex != "#334155"
            ? t.SecondaryColorHex
            : "#4f46e5";
        var darkSlate = "#0f172a";
        var borderSlate = "#cbd5e1";
        var lightBg = "#f8fafc";

        // 2. Seller Identification (100% genuine dynamic)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerState = !string.IsNullOrWhiteSpace(invoice?.Branch?.State)
            ? $"{invoice.Branch.State}{(string.IsNullOrWhiteSpace(invoice.Branch.StateCode) ? "" : $" (Code: {invoice.Branch.StateCode})")}"
            : (!string.IsNullOrWhiteSpace(tenant?.State) ? $"{tenant.State}{(string.IsNullOrWhiteSpace(tenant.StateCode) ? "" : $" (Code: {tenant.StateCode})")}" : "");
        var sellerStateCodeOnly = !string.IsNullOrWhiteSpace(invoice?.Branch?.StateCode)
            ? invoice.Branch.StateCode
            : (!string.IsNullOrWhiteSpace(tenant?.StateCode) ? tenant.StateCode : (sellerGstin.Length >= 2 ? sellerGstin.Substring(0, 2) : ""));

        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var sellerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "";
        var logoUrl = !string.IsNullOrEmpty(t.LogoUrl) ? t.LogoUrl : (!string.IsNullOrEmpty(tenant?.LogoUrl) ? tenant.LogoUrl : "");

        // 3. Invoice Metadata
        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var copyBadge = !string.IsNullOrWhiteSpace(t.HeaderSubtitle) && !t.HeaderSubtitle.Contains("Rule 48") ? t.HeaderSubtitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "ORIGINAL / COUNTER SALE" : "ORIGINAL FOR RECIPIENT");

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yyyy") ?? DateTime.Now.ToString("dd-MMM-yyyy");
        var invTime = invoice?.InvoiceDate.ToString("hh:mm tt") ?? DateTime.Now.ToString("hh:mm tt");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("dd-MMM-yyyy") : "";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply)
            ? invoice.PlaceOfSupply
            : (!string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : sellerState);

        // 4. Customer Details (Auto-adapts to B2B or B2C Counter Sale)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Counter Retail Customer" : "");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        bool isB2B = !string.IsNullOrWhiteSpace(custGstin);
        var custPan = !string.IsNullOrWhiteSpace(invoice?.CustomerPAN) ? invoice.CustomerPAN : (custGstin.Length >= 12 ? custGstin.Substring(2, 10) : "");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custStateCode = !string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : (isB2B ? (custGstin.Length >= 2 ? custGstin.Substring(0, 2) : "") : "");
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";
        var custDl = ExtractInvoiceBuyerDl(invoice);

        // Doctor / Patient / Prescriber Statutory attributes
        var doctorName = !string.IsNullOrWhiteSpace(invoice?.DoctorName) ? invoice.DoctorName : "";
        var patientName = "";
        var patientContact = "";
        var doctorRegNo = "";
        if (!string.IsNullOrEmpty(invoice?.AttributesJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(invoice.AttributesJson);
                if (doc.RootElement.TryGetProperty("patientName", out var pn)) patientName = pn.GetString() ?? "";
                if (doc.RootElement.TryGetProperty("patientContact", out var pc)) patientContact = pc.GetString() ?? "";
                if (doc.RootElement.TryGetProperty("doctorRegNo", out var drn)) doctorRegNo = drn.GetString() ?? "";
            }
            catch {}
        }
        bool hasPrescriptionInfo = !string.IsNullOrWhiteSpace(doctorName) || !string.IsNullOrWhiteSpace(patientName);

        // 5. Logistics, Transportation & E-Way Bill
        var transporter = !string.IsNullOrWhiteSpace(invoice?.TransporterName) ? invoice.TransporterName : "";
        var vehicleNo = !string.IsNullOrWhiteSpace(invoice?.VehicleNumber) ? invoice.VehicleNumber : "";
        var lrNo = !string.IsNullOrWhiteSpace(invoice?.LrNumber) ? invoice.LrNumber : "";
        var lrDate = invoice?.LrDate?.ToString("dd-MMM-yyyy") ?? "";
        var eWayNo = !string.IsNullOrWhiteSpace(invoice?.EWayBillNumber) ? invoice.EWayBillNumber : "";
        var poNo = !string.IsNullOrWhiteSpace(invoice?.PoNumber) ? invoice.PoNumber : "";
        var poDate = invoice?.PoDate?.ToString("dd-MMM-yyyy") ?? "";

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

        // 6. Financial Totals
        var totalAmount = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount > 0 ? (totalAmount / 1.18m) : 0m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? (totalAmount > taxable ? (totalAmount - taxable) : 0m);
        var cess = invoice?.CessAmount ?? 0m;
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // 7. Bank & Dynamic UPI QR
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var bankBranch = !string.IsNullOrWhiteSpace(tenant?.BankBranch) ? tenant.BankBranch : "";
        var rawUpi = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiId = (!string.IsNullOrWhiteSpace(rawUpi) && !rawUpi.Contains("9876543210") && !rawUpi.Contains("example.com")) ? rawUpi : "";
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount:F2}%26cu%3DINR%26tn%3D{invNo}"
            : "";
        bool showSettlementCard = t.ShowBankDetails && (!string.IsNullOrWhiteSpace(bankName) || !string.IsNullOrWhiteSpace(bankAcc) || !string.IsNullOrEmpty(upiQr));

        // 8. Dynamic Column Detection across ALL Industries
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasMrp = invoice?.Items.Any(i => i.Mrp > 0) ?? true;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;

        var itemsRows = new StringBuilder();
        int lineIndex = 1;
        int itemCount = 0;

        if (invoice != null && invoice.Items.Any())
        {
            itemCount = invoice.Items.Count;
            foreach (var it in invoice.Items)
            {
                var attrs = ExtractItemPharmaAttributes(it);
                var expStr = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                var discText = it.DiscountPercent > 0 ? $"{it.DiscountPercent:0.##}%" : (it.DiscountAmount > 0 ? $"₹{it.DiscountAmount:0.##}" : "-");

                itemsRows.Append($@"
                <tr style='font-size:10px; height:26px; border-bottom:1px solid {borderSlate};'>
                    <td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; color:#64748b; font-weight:600;'>{lineIndex++}</td>
                    <td style='padding:5px 6px; border-right:1px solid {borderSlate};'>
                        <div style='font-weight:700; color:#0f172a; font-size:10.5px;'>{it.ItemName}</div>
                        {(string.IsNullOrEmpty(it.ItemSku) ? "" : $"<span style='font-size:8.5px; color:#64748b; font-family:monospace;'>SKU: {it.ItemSku}</span>")}
                        {ExtractIndustryItemSubline(it)}
                    </td>
                    <td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; font-family:monospace; color:#334155;'>{it.HsnCode ?? "-"}</td>
                    {(hasBatch ? $"<td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; font-family:monospace; font-weight:600; color:{primaryColor};'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; font-family:monospace; color:#475569;'>{expStr}</td>" : "")}
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid {borderSlate}; font-weight:700; color:#0f172a;'>
                        {it.Quantity:N0} <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>{it.UomCode}</span>
                    </td>
                    {(hasFree ? $"<td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; color:{primaryColor}; font-weight:bold;'>{(attrs.freeQty > 0 ? $"+{attrs.freeQty:N0}" : "-")}</td>" : "")}
                    {(hasMrp ? $"<td style='padding:5px 6px; text-align:right; border-right:1px solid {borderSlate}; font-family:monospace; color:#64748b;'>{(it.Mrp > 0 ? $"₹{it.Mrp:N2}" : "-")}</td>" : "")}
                    <td style='padding:5px 6px; text-align:right; border-right:1px solid {borderSlate}; font-family:monospace; font-weight:600; color:#0f172a;'>₹{it.UnitPrice:N2}</td>
                    {(hasDisc ? $"<td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; color:{secondaryColor}; font-weight:600;'>{discText}</td>" : "")}
                    <td style='padding:5px 4px; text-align:center; border-right:1px solid {borderSlate}; font-family:monospace; color:#475569;'>{it.GstRate:0.##}%</td>
                    <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:700; color:#0f172a;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }

        // Single expanding filler row with unbroken vertical column grid lines reaching bottom summary boundary
        int emptyFillerHeight = Math.Max(70, 620 - (itemCount * 28));
        itemsRows.Append($@"
        <tr style='height:100%; min-height:{emptyFillerHeight}px;'>
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            {(hasBatch ? $"<td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>" : "")}
            {(hasExpiry ? $"<td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>" : "")}
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            {(hasFree ? $"<td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>" : "")}
            {(hasMrp ? $"<td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>" : "")}
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            {(hasDisc ? $"<td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>" : "")}
            <td style='border-right:1px solid {borderSlate}; height:{emptyFillerHeight}px;'>&nbsp;</td>
            <td style='height:{emptyFillerHeight}px;'>&nbsp;</td>
        </tr>");

        var hsnSummaryTable = RenderHsnSummaryTable(invoice, primaryColor);
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>{headerTitle} - {invNo}</title>
    <link rel='preconnect' href='https://fonts.googleapis.com'>
    <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
    <link href='https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap' rel='stylesheet'>
    <style>
        @page {{ size: A4 portrait; margin: 6mm 8mm; }}
        html, body {{ margin:0; padding:0; background:#ffffff; color:{darkSlate}; font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
        .enterprise-invoice {{ width:100%; max-width:820px; {heightStyle} margin:0 auto; box-sizing:border-box; border:1.5px solid {primaryColor}; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; background:#ffffff; }}
        table {{ border-collapse:collapse; width:100%; }}
        th, td {{ box-sizing:border-box; }}
    </style>
</head>
<body>
<div class='enterprise-invoice'>

    <div style='display:flex; flex-direction:column; flex:1 1 auto;'>
        <!-- 1. TOP STATUTORY HEADER RIBBON (Executive Royal Indigo) -->
        <div style='background:#ffffff; color:#0f172a; padding:12px 14px; border-bottom:2px solid {primaryColor};'>
            <div style='display:flex; justify-content:space-between; align-items:flex-start;'>
                <!-- Left: Seller Branding & License Info -->
                <div style='max-width:65%;'>
                    <div style='display:flex; align-items:center; gap:8px;'>
                        {(!string.IsNullOrEmpty(logoUrl) ? $"<img src='{logoUrl}' alt='Logo' style='max-height:40px; max-width:120px; object-fit:contain;' />" : "")}
                        <div>
                            <h1 style='margin:0; font-size:19px; font-weight:900; text-transform:uppercase; letter-spacing:0.3px; line-height:1.15; color:{primaryColor};'>{sellerName}</h1>
                            {(!string.IsNullOrWhiteSpace(sellerLegalName) && sellerLegalName != sellerName ? $"<div style='font-size:9.5px; color:#475569; font-weight:600;'>({sellerLegalName})</div>" : "")}
                        </div>
                    </div>
                    
                    <div style='font-size:9.5px; color:#334155; margin-top:4px; line-height:1.3;'>{sellerAddress}</div>
                    
                    <div style='display:flex; flex-wrap:wrap; gap:6px; margin-top:5px; font-size:9px; font-family:monospace;'>
                        {(!string.IsNullOrEmpty(sellerGstin) ? $"<span style='background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 5px; border-radius:3px; color:#0f172a;'>GSTIN: <strong>{sellerGstin}</strong></span>" : "")}
                        {(!string.IsNullOrEmpty(sellerPan) ? $"<span style='background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 5px; border-radius:3px; color:#0f172a;'>PAN: <strong>{sellerPan}</strong></span>" : "")}
                        {(!string.IsNullOrEmpty(sellerDl) ? $"<span style='background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 5px; border-radius:3px; color:#0f172a;'>D.L. No: <strong>{sellerDl}</strong></span>" : "")}
                        {(!string.IsNullOrEmpty(sellerFssai) ? $"<span style='background:#f1f5f9; border:1px solid #cbd5e1; padding:1px 5px; border-radius:3px; color:#0f172a;'>FSSAI: <strong>{sellerFssai}</strong></span>" : "")}
                        {(!string.IsNullOrEmpty(sellerPhone) ? $"<span style='color:#334155;'>Ph: <strong>{sellerPhone}</strong></span>" : "")}
                        {(!string.IsNullOrEmpty(sellerEmail) ? $"<span style='color:#334155;'>Email: <strong>{sellerEmail}</strong></span>" : "")}
                    </div>
                </div>

                <!-- Right: Invoice Type & Rule 48 Status -->
                <div style='text-align:right;'>
                    <div style='background: linear-gradient(135deg, {primaryColor}, {secondaryColor}); color:#ffffff; font-size:13px; font-weight:800; padding:5px 16px; border-radius:5px; display:inline-block; letter-spacing:0.8px; box-shadow:0 2px 4px rgba(67,56,202,0.25);'>
                        {headerTitle}
                    </div>
                    <div style='font-size:8.5px; font-weight:700; color:#475569; margin-top:3px; text-transform:uppercase;'>{copyBadge}</div>
                    <div style='font-size:8.5px; color:#64748b; margin-top:1px;'>Sec 31 CGST Act, 2017</div>
                    <div style='font-size:9.5px; color:#0f172a; margin-top:3px;'>State: <strong>{sellerState}</strong></div>
                </div>
            </div>
        </div>

        <!-- 2. INVOICE META STRIP (High-Contrast Quick Read Bar) -->
        <div style='display:grid; grid-template-columns: repeat(4, 1fr); background:#f1f5f9; border-bottom:1.5px solid {borderSlate}; padding:6px 12px; font-size:9.5px;'>
            <div>
                <span style='color:#64748b; font-size:8.5px; text-transform:uppercase; font-weight:700;'>Invoice Number:</span><br/>
                <strong style='font-family:monospace; font-size:11.5px; color:{primaryColor};'>{invNo}</strong>
            </div>
            <div>
                <span style='color:#64748b; font-size:8.5px; text-transform:uppercase; font-weight:700;'>Invoice Date &amp; Time:</span><br/>
                <strong style='color:#0f172a;'>{invDate}</strong> <span style='font-size:8.5px; color:#64748b;'>({invTime})</span>
            </div>
            <div>
                <span style='color:#64748b; font-size:8.5px; text-transform:uppercase; font-weight:700;'>Place of Supply (POS):</span><br/>
                <strong style='color:#0f172a;'>{placeOfSupply}</strong>
            </div>
            <div style='text-align:right;'>
                <span style='color:#64748b; font-size:8.5px; text-transform:uppercase; font-weight:700;'>Reverse Charge (RCM):</span><br/>
                <strong style='color:{primaryColor};'>NO (Forward Charge)</strong>
            </div>
        </div>

        <!-- IRN / E-Invoice Strip if generated -->
        {(!string.IsNullOrEmpty(irn) ? $@"
        <div style='background:#f8fafc; border-bottom:1px solid #cbd5e1; padding:4px 12px; font-size:8.5px; display:flex; justify-content:space-between; align-items:center;'>
            <div style='color:#334155;'><strong>IRN:</strong> <span style='font-family:monospace; word-break:break-all;'>{irn}</span></div>
            {(!string.IsNullOrEmpty(ackNo) ? $"<div style='color:#334155;'><strong>Ack:</strong> {ackNo} ({ackDate})</div>" : "")}
        </div>" : "")}

        <!-- 3. DUAL PARTY DETAILS: BILLED TO & SHIPPED TO -->
        <div style='display:grid; grid-template-columns: 1fr 1fr; border-bottom:1.5px solid {borderSlate};'>
            <!-- BILL TO -->
            <div style='padding:8px 12px; border-right:1px solid {borderSlate}; background:#ffffff;'>
                <div style='display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:4px;'>
                    <span style='font-size:9px; font-weight:800; color:{primaryColor}; text-transform:uppercase; letter-spacing:0.5px;'>Details of Receiver | Billed To:</span>
                    <span style='font-size:8px; font-weight:700; color:#ffffff; background:{(isB2B ? primaryColor : secondaryColor)}; padding:1px 5px; border-radius:3px;'>
                        {(isB2B ? "REGISTERED B2B" : "RETAIL CONSUMER")}
                    </span>
                </div>
                <div style='font-size:12px; font-weight:800; color:#0f172a; margin-bottom:2px;'>{custName}</div>
                {(!string.IsNullOrEmpty(custAddress) ? $"<div style='font-size:9.5px; color:#475569; line-height:1.3;'>{custAddress}</div>" : "")}
                
                <div style='display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; font-size:9px;'>
                    {(!string.IsNullOrEmpty(custGstin) ? $"<span>GSTIN: <strong style='font-family:monospace; color:{primaryColor};'>{custGstin}</strong></span>" : "<span style='color:#64748b;'>Unregistered Buyer</span>")}
                    {(!string.IsNullOrEmpty(custPan) ? $"<span>PAN: <strong style='font-family:monospace;'>{custPan}</strong></span>" : "")}
                    {(!string.IsNullOrEmpty(custPhone) ? $"<span>Mobile: <strong>{custPhone}</strong></span>" : "")}
                    {(!string.IsNullOrEmpty(custStateCode) ? $"<span>State Code: <strong>{custStateCode}</strong></span>" : "")}
                    {(!string.IsNullOrEmpty(custDl) ? $"<span>Drug Lic: <strong>{custDl}</strong></span>" : "")}
                </div>
            </div>

            <!-- SHIP TO -->
            <div style='padding:8px 12px; background:{lightBg};'>
                <div style='display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:4px;'>
                    <span style='font-size:9px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px;'>Consignee | Shipped To:</span>
                    <span style='font-size:8px; font-weight:600; color:#64748b;'>Destination Site</span>
                </div>
                <div style='font-size:12px; font-weight:800; color:#0f172a; margin-bottom:2px;'>{custName}</div>
                <div style='font-size:9.5px; color:#475569; line-height:1.3;'>{shipAddress}</div>
                <div style='margin-top:4px; font-size:9px; color:#64748b;'>
                    Place of Delivery: <strong>{placeOfSupply}</strong> | Country: <strong>India</strong>
                </div>
            </div>
        </div>

        <!-- 4. LOGISTICS & TRANSPORT STRIP (Auto-collapses if no logistics data) -->
        {(hasLogistics ? $@"
        <div style='background:#f8fafc; border-bottom:1.5px solid {borderSlate}; padding:5px 12px;'>
            <div style='display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; font-size:9px;'>
                <div><span style='color:#64748b;'>Transporter:</span><br/><strong style='color:#0f172a;'>{(!string.IsNullOrEmpty(transporter) ? transporter : "-")}</strong></div>
                <div><span style='color:#64748b;'>Vehicle Number:</span><br/><strong style='font-family:monospace; color:#0f172a;'>{(!string.IsNullOrEmpty(vehicleNo) ? vehicleNo : "-")}</strong></div>
                <div><span style='color:#64748b;'>LR / Bilty No &amp; Date:</span><br/><strong style='color:#0f172a;'>{(!string.IsNullOrEmpty(lrNo) ? $"{lrNo} ({lrDate})" : "-")}</strong></div>
                <div><span style='color:#64748b;'>E-Way Bill No:</span><br/><strong style='font-family:monospace; color:{primaryColor};'>{(!string.IsNullOrEmpty(eWayNo) ? eWayNo : "-")}</strong></div>
                <div><span style='color:#64748b;'>Buyer PO Ref &amp; Date:</span><br/><strong style='color:#0f172a;'>{(!string.IsNullOrEmpty(poNo) ? $"{poNo} ({poDate})" : "-")}</strong></div>
            </div>
        </div>" : "")}

        <!-- Doctor Prescriber Strip if Pharma Statutory -->
        {(hasPrescriptionInfo ? $@"
        <div style='background:#fef2f2; border-bottom:1px solid #fecaca; padding:4px 12px; font-size:9px; display:flex; justify-content:space-between; color:#991b1b;'>
            <div><strong>Prescribing Doctor:</strong> {(!string.IsNullOrEmpty(doctorName) ? doctorName : "-")} {(!string.IsNullOrEmpty(doctorRegNo) ? $"(Reg: {doctorRegNo})" : "")}</div>
            <div><strong>Patient Name:</strong> {(!string.IsNullOrEmpty(patientName) ? patientName : "-")} {(!string.IsNullOrEmpty(patientContact) ? $"| Phone: {patientContact}" : "")}</div>
            <div style='font-weight:bold;'>PRESCRIPTION / RX</div>
        </div>" : "")}

        <!-- 5. DYNAMIC LINE ITEMS TABLE (Color-Accent Header, Crisp Borders) -->
        <div style='flex:1 1 auto; display:flex; flex-direction:column;'>
            <table style='width:100%; height:100%; border-collapse:collapse;'>
                <thead>
                    <tr style='background:#eef2ff; color:{primaryColor}; font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.3px; height:26px; border-bottom:1.5px solid #c7d2fe;'>
                        <th style='padding:5px 4px; width:26px; text-align:center; border-right:1px solid #c7d2fe;'>#</th>
                        <th style='padding:5px 6px; text-align:left; border-right:1px solid #c7d2fe;'>Description of Goods / Services</th>
                        <th style='padding:5px 4px; width:60px; text-align:center; border-right:1px solid {borderSlate};'>HSN/SAC</th>
                        {(hasBatch ? $"<th style='padding:5px 4px; width:72px; text-align:center; border-right:1px solid {borderSlate};'>Batch</th>" : "")}
                        {(hasExpiry ? $"<th style='padding:5px 4px; width:48px; text-align:center; border-right:1px solid {borderSlate};'>Expiry</th>" : "")}
                        <th style='padding:5px 6px; width:58px; text-align:right; border-right:1px solid {borderSlate};'>Qty</th>
                        {(hasFree ? $"<th style='padding:5px 4px; width:40px; text-align:center; border-right:1px solid {borderSlate};'>Free</th>" : "")}
                        {(hasMrp ? $"<th style='padding:5px 6px; width:60px; text-align:right; border-right:1px solid {borderSlate};'>MRP</th>" : "")}
                        <th style='padding:5px 6px; width:64px; text-align:right; border-right:1px solid {borderSlate};'>Unit Rate</th>
                        {(hasDisc ? $"<th style='padding:5px 4px; width:46px; text-align:center; border-right:1px solid {borderSlate};'>Disc</th>" : "")}
                        <th style='padding:5px 4px; width:44px; text-align:center; border-right:1px solid {borderSlate};'>GST%</th>
                        <th style='padding:5px 6px; width:80px; text-align:right;'>Net Amount</th>
                    </tr>
                </thead>
                <tbody style='height:100%;'>
                    {itemsRows}
                </tbody>
            </table>
        </div>
    </div>

    <!-- 6. BOTTOM SECTION: HSN TAX SUMMARY, WORDS, BANK DETAILS & SETTLEMENT -->
    <div style='border-top:1.5px solid {borderSlate};'>
        <!-- HSN Summary Table -->
        {hsnSummaryTable}

        <!-- Total Calculation & Bank Strip -->
        <div style='display:grid; grid-template-columns: 1.25fr 0.95fr; border-top:1.5px solid {borderSlate};'>
            <!-- Left: Amount in Words & Bank UPI Settlement -->
            <div style='padding:8px 12px; border-right:1px solid {borderSlate}; background:#ffffff;'>
                <div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; margin-bottom:6px;'>
                    <div style='font-size:8.5px; font-weight:800; color:#64748b; text-transform:uppercase;'>Amount Chargeable (in words):</div>
                    <div style='font-size:11px; font-weight:800; color:{primaryColor}; margin-top:2px; line-height:1.3;'>INR {words}</div>
                </div>

                <!-- Bank & UPI QR Card -->
                {(showSettlementCard ? $@"
                <div style='display:flex; gap:10px; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; background:#f8fafc; align-items:center;'>
                    {(!string.IsNullOrEmpty(upiQr) ? $"<img src='{upiQr}' alt='UPI QR' style='width:68px; height:68px; border:1px solid #cbd5e1; border-radius:4px; flex-shrink:0;' />" : "")}
                    <div style='font-size:9px; line-height:1.35; flex:1;'>
                        <div style='font-weight:800; color:{primaryColor}; font-size:9.5px; margin-bottom:2px; text-transform:uppercase;'>Bank &amp; UPI Settlement</div>
                        {(!string.IsNullOrEmpty(bankName) ? $"<div>Bank: <strong>{bankName}</strong>{(!string.IsNullOrEmpty(bankBranch) ? $" ({bankBranch})" : "")}</div>" : "")}
                        {(!string.IsNullOrEmpty(bankAcc) ? $"<div>A/c No: <strong style='font-family:monospace; color:#0f172a; font-size:10px;'>{bankAcc}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(bankIfsc) ? $"<div>IFSC: <strong style='font-family:monospace;'>{bankIfsc}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(upiId) ? $"<div>UPI ID: <strong style='font-family:monospace; color:{secondaryColor};'>{upiId}</strong></div>" : "")}
                    </div>
                </div>" : "")}
            </div>

            <!-- Right: Commercial Totals Breakdown (Up to 10 Cr Scale) -->
            <div style='padding:8px 12px; background:#f8fafc;'>
                <table style='font-size:10px; width:100%; border-collapse:collapse;'>
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>Taxable Amount:</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; font-weight:600; color:#0f172a;'>₹{taxable:N2}</td>
                    </tr>
                    {(cgst > 0 ? $@"
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>Central Tax (CGST):</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; color:#0f172a;'>₹{cgst:N2}</td>
                    </tr>" : "")}
                    {(sgst > 0 ? $@"
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>State Tax (SGST):</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; color:#0f172a;'>₹{sgst:N2}</td>
                    </tr>" : "")}
                    {(igst > 0 ? $@"
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>Integrated Tax (IGST):</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; color:#0f172a;'>₹{igst:N2}</td>
                    </tr>" : "")}
                    {(cess > 0 ? $@"
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>GST Cess:</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; color:#0f172a;'>₹{cess:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr>
                        <td style='padding:2px 0; color:#64748b;'>Round Off:</td>
                        <td style='padding:2px 0; text-align:right; font-family:monospace; color:#0f172a;'>₹{roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='border-top:2px solid {primaryColor}; background:#eef2ff;'>
                        <td style='padding:6px 0; font-weight:900; font-size:13px; color:{primaryColor};'>GRAND TOTAL:</td>
                        <td style='padding:6px 0; text-align:right; font-family:monospace; font-weight:900; font-size:14px; color:{primaryColor};'>₹{totalAmount:N2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- 7. DECLARATION & SIGNATURE BLOCK -->
        <div style='display:flex; justify-content:space-between; align-items:flex-end; padding:8px 12px; border-top:1px solid #e2e8f0; background:#ffffff;'>
            <div style='max-width:64%; font-size:8.5px; color:#64748b; line-height:1.35;'>
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $"<strong>Terms &amp; Conditions:</strong><br/>{t.DeclarationText}" : "")}
            </div>
            <div style='text-align:right;'>
                <div style='font-size:9.5px; font-weight:800; color:#0f172a;'>For {sellerName}</div>
                <div style='height:34px;'></div>
                <div style='border-top:1px solid #64748b; display:inline-block; padding-top:2px; font-size:9px; font-weight:700; color:#0f172a;'>
                    Authorised Signatory
                </div>
            </div>
        </div>

        <!-- 8. FOOTER METADATA -->
        <div style='display:flex; justify-content:space-between; padding:3px 12px; font-size:8px; color:#94a3b8; background:#f8fafc; border-top:1px dashed #e2e8f0;'>
            <span>Computer Generated Invoice</span>
            <span>Page 1 of 1</span>
        </div>
    </div>

</div>
</body>
</html>";
    }

    // ==============================================================================
    // 1. 🏆 UDYOGBILL SIGNATURE ADAPTIVE B2B TAX INVOICE (ENTERPRISE GRADE UP TO 10 CR+)
    // ==============================================================================
    private static string RenderUdyogBillSignatureB2BHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000" && t.PrimaryColorHex != "#4338ca"
            ? t.PrimaryColorHex
            : "#1e3a8a"; // Executive Deep Slate Navy / Cobalt
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) && t.SecondaryColorHex != "#334155" && t.SecondaryColorHex != "#4f46e5"
            ? t.SecondaryColorHex
            : "#2563eb";

        // Seller Identification
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerState = !string.IsNullOrWhiteSpace(invoice?.Branch?.State)
            ? $"{invoice.Branch.State}{(string.IsNullOrWhiteSpace(invoice.Branch.StateCode) ? "" : $" (Code: {invoice.Branch.StateCode})")}"
            : (!string.IsNullOrWhiteSpace(tenant?.State) ? $"{tenant.State}{(string.IsNullOrWhiteSpace(tenant.StateCode) ? "" : $" (Code: {tenant.StateCode})")}" : "");

        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var sellerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "";

        // Invoice Metadata
        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yyyy") ?? DateTime.Now.ToString("dd-MMM-yyyy");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("dd-MMM-yyyy") : "";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply)
            ? invoice.PlaceOfSupply
            : (!string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : sellerState);

        // Customer Details
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Cash Customer" : "");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custPan = !string.IsNullOrWhiteSpace(invoice?.CustomerPAN) ? invoice.CustomerPAN : (custGstin.Length >= 12 ? custGstin.Substring(2, 10) : "");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custStateCode = !string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : "";
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

        var colCount = 8 + (hasPharmaAddon ? 1 : 0) + (hasFreeScheme ? 1 : 0) + (hasMrp ? 1 : 0) + (hasPtr ? 1 : 0) + (hasPts ? 1 : 0) + (hasDiscount ? 1 : 0);
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
                <div style='background: linear-gradient(135deg, {primaryColor}, {secondaryColor}); color:#ffffff; padding:5px 16px; font-weight:800; font-size:13px; border-radius:5px; display:inline-block; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(67,56,202,0.25);'>TAX INVOICE</div>
                <div style='font-size:9.5px; color:#64748b; margin-top:3px; font-weight:800; text-transform:uppercase;'>ORIGINAL FOR RECIPIENT</div>
                <div style='font-size:12px; font-weight:bold; margin-top:4px;'>Invoice No: <span style='color:{primaryColor}; font-family:monospace; font-weight:900;'>{invNo}</span></div>
                <div style='font-size:11px; margin-top:2px;'>Invoice Date: <strong>{invDate}</strong></div>
                {(!string.IsNullOrEmpty(dueDate) ? $"<div style='font-size:10.5px; color:#0f172a; font-weight:bold; margin-top:1px;'>Due Date: <strong>{dueDate}</strong></div>" : "")}
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
                    <span style='font-size:9px; color:#0f172a; font-weight:bold; background:#e2e8f0; padding:1px 5px; border-radius:3px;'>Buyer</span>
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
                    <span style='font-size:9px; color:#475569; font-weight:bold; background:#e2e8f0; padding:1px 5px; border-radius:3px;'>Destination Site</span>
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

    <!-- 3. ADAPTIVE LINE ITEMS TABLE (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES) -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column; margin-top:6px; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
        <table style='width:100%; height:100%; flex:1 1 auto; border-collapse:collapse; font-size:10px;'>
            <thead>
                <tr style='background:#eef2ff; color:{primaryColor}; border-bottom:1.5px solid #c7d2fe; height:26px;'>
                    <th style='padding:4px 3px; border-right:1px solid #c7d2fe; text-align:center; width:26px;'>#</th>
                    <th style='padding:4px 6px; border-right:1px solid #c7d2fe; text-align:left;'>Item Description &amp; Specification</th>
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
                {((invoice?.Items?.Count ?? (invoice == null ? 2 : 0)) < 12 ? RenderTableFillerRow(colCount, "#cbd5e1", (invoice?.Items?.Count ?? (invoice == null ? 2 : 0)), IsA5Size(t) ? 220 : 600) : "")}
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
                        {(!string.IsNullOrEmpty(upiId) ? $"<div>UPI ID: <strong style='font-family:monospace; color:#0f172a;'>{upiId}</strong></div>" : "")}
                        {(!string.IsNullOrEmpty(upiQr) ? "<div style='color:#475569; font-weight:bold; font-size:9px; margin-top:2px;'>Scan QR to pay exact amount instantly via any UPI App</div>" : "")}
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

        <!-- 6. TERMS, CONDITIONS & SIGNATURE -->
        <div style='display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px; border-top:1px solid #cbd5e1; padding-top:6px; font-size:9px;'>
            <div style='max-width:62%; color:#64748b; line-height:1.35;'>
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $"<strong>Terms &amp; Conditions:</strong><br/>{t.DeclarationText}" : "")}
            </div>
            <div style='text-align:right;'>
                <div style='font-size:9.5px; font-weight:bold;'>For {sellerName}</div>
                <div style='height:36px;'></div>
                <div style='border-top:1px solid #94a3b8; display:inline-block; padding-top:2px; font-weight:bold; font-size:9.5px;'>Authorised Signatory</div>
            </div>
        </div>

        <!-- FOOTER BRANDING -->
        <div style='display:flex; justify-content:space-between; margin-top:4px; font-size:8.5px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:3px;'>
            <span>Computer Generated Invoice</span>
            <span>Page 1 of 1</span>
        </div>
    </div>
</div>";
    }

    // ==============================================================================
    // 2. 🏛️ TALLY PRIME STYLE (100% AUTHENTIC ERP TAX INVOICE A4)
    // ==============================================================================
    private static string RenderTallyPrimeInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        // 1. Seller Identification (100% Genuine dynamic)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerStateName = !string.IsNullOrWhiteSpace(invoice?.Branch?.State) ? invoice.Branch.State : (!string.IsNullOrWhiteSpace(tenant?.State) ? tenant.State : "");
        var sellerStateCodeOnly = !string.IsNullOrWhiteSpace(invoice?.Branch?.StateCode) ? invoice.Branch.StateCode : (!string.IsNullOrWhiteSpace(tenant?.StateCode) ? tenant.StateCode : (sellerGstin.Length >= 2 ? sellerGstin.Substring(0, 2) : ""));
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var sellerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "";

        // 2. Invoice Document Header & Metadata
        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var copyBadge = !string.IsNullOrWhiteSpace(t.HeaderSubtitle) && !t.HeaderSubtitle.Contains("Rule 48") ? t.HeaderSubtitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "ORIGINAL / COUNTER SALE" : "ORIGINAL FOR RECIPIENT");

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd-MMM-yyyy") ?? DateTime.Now.ToString("dd-MMM-yyyy");
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply)
            ? invoice.PlaceOfSupply
            : (!string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : sellerStateName);

        // 3. Customer & Consignee Details (100% Dynamic)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Counter Retail Customer" : "");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        bool isB2B = !string.IsNullOrWhiteSpace(custGstin);
        var custPan = !string.IsNullOrWhiteSpace(invoice?.CustomerPAN) ? invoice.CustomerPAN : (custGstin.Length >= 12 ? custGstin.Substring(2, 10) : "");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custState = !string.IsNullOrWhiteSpace(invoice?.BillingStateCode) ? invoice.BillingStateCode : (isB2B ? (custGstin.Length >= 2 ? custGstin.Substring(0, 2) : placeOfSupply) : placeOfSupply);
        var custDl = ExtractInvoiceBuyerDl(invoice);
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";

        bool hasSeparateShipTo = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) && invoice.ShippingAddress != invoice.BillingAddress;

        // 4. Logistics, Dispatch & References
        var poNo = !string.IsNullOrWhiteSpace(invoice?.PoNumber) ? invoice.PoNumber : "";
        var poDate = invoice?.PoDate.HasValue == true ? invoice.PoDate.Value.ToString("dd-MMM-yyyy") : "";
        var lrNo = !string.IsNullOrWhiteSpace(invoice?.LrNumber) ? invoice.LrNumber : "";
        var lrDate = invoice?.LrDate.HasValue == true ? invoice.LrDate.Value.ToString("dd-MMM-yyyy") : "";
        var eWayBill = !string.IsNullOrWhiteSpace(invoice?.EWayBillNumber) ? invoice.EWayBillNumber : "";
        var transport = !string.IsNullOrWhiteSpace(invoice?.TransporterName) ? invoice.TransporterName : "";
        var vehicleNo = !string.IsNullOrWhiteSpace(invoice?.VehicleNumber) ? invoice.VehicleNumber : "";

        // 5. Financial Totals
        var totalAmount = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount > 0 ? (totalAmount / 1.12m) : 0m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? (totalAmount > taxable ? (totalAmount - taxable) : 0m);
        var cess = invoice?.CessAmount ?? 0m;
        var roundOff = invoice?.RoundOff ?? 0m;
        var words = ConvertToIndianCurrencyWords(totalAmount);

        // 6. Bank Details & UPI QR
        var bankName = !string.IsNullOrWhiteSpace(t.BankName) ? t.BankName : (!string.IsNullOrWhiteSpace(tenant?.BankName) ? tenant.BankName : "");
        var bankAcc = !string.IsNullOrWhiteSpace(t.BankAccountNumber) ? t.BankAccountNumber : (!string.IsNullOrWhiteSpace(tenant?.BankAccountNumber) ? tenant.BankAccountNumber : "");
        var bankIfsc = !string.IsNullOrWhiteSpace(t.BankIfsc) ? t.BankIfsc : (!string.IsNullOrWhiteSpace(tenant?.BankIfsc) ? tenant.BankIfsc : "");
        var upiId = !string.IsNullOrWhiteSpace(t.UpiId) ? t.UpiId : (!string.IsNullOrWhiteSpace(tenant?.UpiId) ? tenant.UpiId : "");
        var upiQr = (!string.IsNullOrEmpty(upiId) && t.ShowUpiQr)
            ? $"https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi%3A%2F%2Fpay%3Fpa%3D{upiId}%26pn%3D{Uri.EscapeDataString(sellerName)}%26am%3D{totalAmount:F2}%26cu%3DINR%26tn%3D{invNo}"
            : "";

        // 7. Dynamic Column Detection across ALL Industries
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? true;
        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? true;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasMrp = invoice?.Items.Any(i => i.Mrp > 0) ?? true;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? true;

        // Base cols: Sl No (1) + Description (1) + HSN (1) + Quantity (1) + Rate (1) + per (1) + Amount (1) = 7
        int colCount = 7 + (hasBatch ? 1 : 0) + (hasExpiry ? 1 : 0) + (hasFree ? 1 : 0) + (hasMrp ? 1 : 0) + (hasDisc ? 1 : 0);

        var itemsRows = new StringBuilder();
        decimal totalQuantity = 0;
        string mainUom = "NOS";
        int lineIndex = 1;
        int itemCount = 0;

        if (invoice != null && invoice.Items.Any())
        {
            itemCount = invoice.Items.Count;
            foreach (var it in invoice.Items)
            {
                totalQuantity += it.Quantity;
                if (!string.IsNullOrWhiteSpace(it.UomCode)) mainUom = it.UomCode;
                var attrs = ExtractItemPharmaAttributes(it);
                var expStr = it.ExpiryDate.HasValue ? it.ExpiryDate.Value.ToString("MM/yy") : "-";
                var discText = it.DiscountPercent > 0 ? $"{it.DiscountPercent:0.##}%" : (it.DiscountAmount > 0 ? $"₹{it.DiscountAmount:0.##}" : "-");

                itemsRows.Append($@"
                <tr style='font-size:10px; height:26px;'>
                    <td style='padding:4px 3px; text-align:center; border-right:1px solid #000;'>{lineIndex++}</td>
                    <td style='padding:4px 6px; border-right:1px solid #000;'>
                        <strong>{it.ItemName}</strong>
                        {(string.IsNullOrEmpty(it.ItemSku) ? "" : $"<br/><span style='font-size:8.5px; color:#555;'>SKU: {it.ItemSku}</span>")}
                        {ExtractIndustryItemSubline(it)}
                    </td>
                    <td style='padding:4px 4px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{it.HsnCode ?? "-"}</td>
                    {(hasBatch ? $"<td style='padding:4px 4px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:4px 4px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{expStr}</td>" : "")}
                    <td style='padding:4px 6px; text-align:right; border-right:1px solid #000; font-weight:bold;'>{it.Quantity:N0} {it.UomCode}</td>
                    {(hasFree ? $"<td style='padding:4px 4px; text-align:center; border-right:1px solid #000;'>{(attrs.freeQty > 0 ? attrs.freeQty.ToString("N0") : "-")}</td>" : "")}
                    {(hasMrp ? $"<td style='padding:4px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{(it.Mrp > 0 ? it.Mrp.ToString("N2") : "-")}</td>" : "")}
                    <td style='padding:4px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{it.UnitPrice:N2}</td>
                    <td style='padding:4px 4px; text-align:center; border-right:1px solid #000;'>{it.UomCode}</td>
                    {(hasDisc ? $"<td style='padding:4px 4px; text-align:center; border-right:1px solid #000;'>{discText}</td>" : "")}
                    <td style='padding:4px 6px; text-align:right; font-family:monospace; font-weight:bold;'>{it.TotalAmount:N2}</td>
                </tr>");
            }
        }

        // Unbroken vertical column filler row reaching the bottom
        int emptyFillerHeight = Math.Max(70, 580 - (itemCount * 26));
        var fillerRowsSb = new StringBuilder();
        fillerRowsSb.Append($"<tr style='height:100%; min-height:{emptyFillerHeight}px;'>");
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Sl No
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Description
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // HSN
        if (hasBatch) fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>");
        if (hasExpiry) fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>");
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Qty
        if (hasFree) fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>");
        if (hasMrp) fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>");
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Rate
        fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Per
        if (hasDisc) fillerRowsSb.Append($"<td style='border-right:1px solid #000; height:{emptyFillerHeight}px;'>&nbsp;</td>");
        fillerRowsSb.Append($"<td style='height:{emptyFillerHeight}px;'>&nbsp;</td>"); // Amount
        fillerRowsSb.Append("</tr>");

        // 8. Tally Exact 2-Tier HSN Summary Matrix
        var hsnSb = new StringBuilder();
        decimal sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumTotalTax = 0;
        bool hasIgst = igst > 0 || (invoice?.Items.Any(i => i.IgstAmount > 0) ?? false);

        if (invoice?.Items != null && invoice.Items.Any())
        {
            var groups = invoice.Items
                .GroupBy(i => new { Hsn = string.IsNullOrWhiteSpace(i.HsnCode) ? "N/A" : i.HsnCode, Rate = i.GstRate })
                .ToList();

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
                sumIgst += grpIgst;
                sumTotalTax += grpTotal;

                var halfRate = g.Key.Rate / 2;
                var cgstRateStr = grpCgst > 0 ? $"{halfRate:0.##}%" : "-";
                var sgstRateStr = grpSgst > 0 ? $"{halfRate:0.##}%" : "-";
                var igstRateStr = grpIgst > 0 ? $"{g.Key.Rate:0.##}%" : "-";

                hsnSb.Append($@"
                <tr style='font-size:9.5px; border-bottom:1px solid #000;'>
                    <td style='padding:3px 4px; text-align:center; border-right:1px solid #000; font-family:monospace;'>{g.Key.Hsn}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{grpTaxable:N2}</td>
                    <td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>{cgstRateStr}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{(grpCgst > 0 ? grpCgst.ToString("N2") : "-")}</td>
                    <td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>{sgstRateStr}</td>
                    <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{(grpSgst > 0 ? grpSgst.ToString("N2") : "-")}</td>
                    {(hasIgst ? $"<td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>{igstRateStr}</td><td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{(grpIgst > 0 ? grpIgst.ToString("N2") : "-")}</td>" : "")}
                    <td style='padding:3px 6px; text-align:right; font-family:monospace; font-weight:bold;'>{grpTotal:N2}</td>
                </tr>");
            }
        }
        else
        {
            sumTaxable = taxable;
            sumCgst = cgst > 0 ? cgst : 58.50m;
            sumSgst = sgst > 0 ? sgst : 58.50m;
            sumIgst = igst;
            sumTotalTax = sumCgst + sumSgst + sumIgst;

            hsnSb.Append($@"
            <tr style='font-size:9.5px; border-bottom:1px solid #000;'>
                <td style='padding:3px 4px; text-align:center; border-right:1px solid #000; font-family:monospace;'>30042010</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{sumTaxable:N2}</td>
                <td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>6%</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{sumCgst:N2}</td>
                <td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>6%</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #000; font-family:monospace;'>{sumSgst:N2}</td>
                {(hasIgst ? "<td style='padding:3px 4px; text-align:center; border-right:1px solid #000;'>-</td><td style='padding:3px 6px; text-align:right; border-right:1px solid #000;'>-</td>" : "")}
                <td style='padding:3px 6px; text-align:right; font-family:monospace; font-weight:bold;'>{sumTotalTax:N2}</td>
            </tr>");
        }

        var taxWords = ConvertToIndianCurrencyWords(sumTotalTax);
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>{headerTitle} - {invNo}</title>
    <style>
        @page {{ size: A4 portrait; margin: 5mm 6mm; }}
        html, body {{ margin:0; padding:0; background:#ffffff; color:#000000; font-family:Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
        .tally-invoice {{ width:100%; max-width:820px; {heightStyle} margin:0 auto; border:1.5px solid #000000; box-sizing:border-box; background:#ffffff; font-size:10px; line-height:1.3; display:flex; flex-direction:column; justify-content:space-between; }}
        table {{ border-collapse:collapse; width:100%; }}
        th, td {{ box-sizing:border-box; }}
    </style>
</head>
<body>
<div class='tally-invoice'>

    <div style='display:flex; flex-direction:column; flex:1 1 auto;'>
        <!-- 1. Document Title & Copy Subtitle -->
        <div style='text-align:center; padding:4px 0 3px 0; border-bottom:1px solid #000;'>
            <div style='font-size:14.5px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;'>{headerTitle}</div>
            <div style='font-size:9.5px; font-weight:normal;'>({copyBadge})</div>
        </div>

        <!-- 2. Main Two-Column Compartment -->
        <div style='display:grid; grid-template-columns: 1.15fr 1fr; border-bottom:1px solid #000;'>
            <!-- Left: Seller & Buyer Details -->
            <div style='border-right:1px solid #000; display:flex; flex-direction:column;'>
                <!-- Seller -->
                <div style='padding:5px 8px; border-bottom:1px solid #000;'>
                    <div style='font-size:12.5px; font-weight:bold; text-transform:uppercase;'>{sellerName}</div>
                    <div style='font-size:9.5px; line-height:1.35; margin-top:2px;'>{sellerAddress}</div>
                    <div style='font-size:9.5px; margin-top:3px;'>
                        GSTIN/UIN: <strong style='font-family:monospace;'>{sellerGstin}</strong><br/>
                        State Name: <strong>{sellerStateName}</strong>, Code : <strong>{sellerStateCodeOnly}</strong><br/>
                        {(string.IsNullOrEmpty(sellerEmail) ? "" : $"E-Mail : {sellerEmail}<br/>")}
                        {(string.IsNullOrEmpty(sellerPhone) ? "" : $"Contact : {sellerPhone}")}
                    </div>
                </div>

                <!-- Consignee (Ship to) if separate -->
                {(hasSeparateShipTo ? $@"
                <div style='padding:5px 8px; border-bottom:1px solid #000;'>
                    <div style='font-size:8.5px; color:#555;'>Consignee (Ship to)</div>
                    <div style='font-size:11px; font-weight:bold;'>{custName}</div>
                    <div style='font-size:9.5px; line-height:1.3;'>{shipAddress}</div>
                    <div style='font-size:9.5px; margin-top:2px;'>
                        State Name : <strong>{placeOfSupply}</strong>
                    </div>
                </div>" : "")}

                <!-- Buyer (Bill to) -->
                <div style='padding:5px 8px; flex:1 1 auto;'>
                    <div style='font-size:8.5px; color:#555;'>Buyer (Bill to)</div>
                    <div style='font-size:11.5px; font-weight:bold;'>{custName}</div>
                    <div style='font-size:9.5px; line-height:1.35; margin-top:1px;'>{custAddress}</div>
                    <div style='font-size:9.5px; margin-top:3px;'>
                        {(!string.IsNullOrEmpty(custGstin) ? $"GSTIN/UIN : <strong style='font-family:monospace;'>{custGstin}</strong><br/>" : "Registration Type: Unregistered<br/>")}
                        State Name : <strong>{custState}</strong>
                        {(!string.IsNullOrEmpty(custDl) ? $"<br/>D.L. No. : <strong>{custDl}</strong>" : "")}
                        {(!string.IsNullOrEmpty(custPhone) ? $"<br/>Contact : <strong>{custPhone}</strong>" : "")}
                    </div>
                </div>
            </div>

            <!-- Right: Tabular Metadata Matrix -->
            <div>
                <table style='width:100%; border-collapse:collapse; font-size:9.5px;'>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; width:50%; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Invoice No.</span><br/>
                            <strong style='font-size:11px; font-family:monospace;'>{invNo}</strong>
                        </td>
                        <td style='padding:3px 6px; width:50%;'>
                            <span style='font-size:8.5px; color:#555;'>Dated</span><br/>
                            <strong style='font-size:10.5px;'>{invDate}</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Delivery Note</span><br/>
                            <strong>{(!string.IsNullOrEmpty(lrNo) ? lrNo : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Mode/Terms of Payment</span><br/>
                            <strong>Immediate / Bank</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Reference No. &amp; Date.</span><br/>
                            <strong>{(!string.IsNullOrEmpty(poNo) ? $"{poNo} ({poDate})" : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Other References</span><br/>
                            <strong>{(!string.IsNullOrEmpty(eWayBill) ? $"E-Way: {eWayBill}" : "-")}</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Buyer's Order No.</span><br/>
                            <strong>{(!string.IsNullOrEmpty(poNo) ? poNo : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Dated</span><br/>
                            <strong>{(!string.IsNullOrEmpty(poDate) ? poDate : "-")}</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Dispatch Doc No.</span><br/>
                            <strong>{(!string.IsNullOrEmpty(lrNo) ? lrNo : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Delivery Note Date</span><br/>
                            <strong>{(!string.IsNullOrEmpty(lrDate) ? lrDate : "-")}</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Dispatched through</span><br/>
                            <strong>{(!string.IsNullOrEmpty(transport) ? transport : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Destination</span><br/>
                            <strong>{placeOfSupply}</strong>
                        </td>
                    </tr>
                    <tr style='border-bottom:1px solid #000;'>
                        <td style='padding:3px 6px; border-right:1px solid #000;'>
                            <span style='font-size:8.5px; color:#555;'>Bill of Lading/LR-RR No.</span><br/>
                            <strong>{(!string.IsNullOrEmpty(lrNo) ? lrNo : "-")}</strong>
                        </td>
                        <td style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Motor Vehicle No.</span><br/>
                            <strong style='font-family:monospace;'>{(!string.IsNullOrEmpty(vehicleNo) ? vehicleNo : "-")}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td colspan='2' style='padding:3px 6px;'>
                            <span style='font-size:8.5px; color:#555;'>Terms of Delivery</span><br/>
                            <span>Standard Commercial Delivery Terms Apply</span>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- 3. Line Items Table with Vertical Grid Lines -->
        <div style='flex:1 1 auto; display:flex; flex-direction:column;'>
            <table style='width:100%; height:100%; border-collapse:collapse; font-size:10px;'>
                <thead>
                    <tr style='border-bottom:1px solid #000; font-size:9.5px; font-weight:bold; text-align:center;'>
                        <th style='padding:4px 3px; width:28px; border-right:1px solid #000;'>Sl<br/>No.</th>
                        <th style='padding:4px 6px; text-align:left; border-right:1px solid #000;'>Description of Goods</th>
                        <th style='padding:4px 4px; width:65px; border-right:1px solid #000;'>HSN/SAC</th>
                        {(hasBatch ? "<th style='padding:4px 4px; width:70px; border-right:1px solid #000;'>Batch No</th>" : "")}
                        {(hasExpiry ? "<th style='padding:4px 4px; width:48px; border-right:1px solid #000;'>Expiry</th>" : "")}
                        <th style='padding:4px 6px; width:65px; text-align:right; border-right:1px solid #000;'>Quantity</th>
                        {(hasFree ? "<th style='padding:4px 4px; width:45px; border-right:1px solid #000;'>Free</th>" : "")}
                        {(hasMrp ? "<th style='padding:4px 6px; width:60px; text-align:right; border-right:1px solid #000;'>MRP</th>" : "")}
                        <th style='padding:4px 6px; width:65px; text-align:right; border-right:1px solid #000;'>Rate</th>
                        <th style='padding:4px 4px; width:38px; border-right:1px solid #000;'>per</th>
                        {(hasDisc ? "<th style='padding:4px 4px; width:46px; text-align:center; border-right:1px solid #000;'>Disc. %</th>" : "")}
                        <th style='padding:4px 6px; width:80px; text-align:right;'>Amount</th>
                    </tr>
                </thead>
                <tbody style='height:100%;'>
                    {itemsRows}
                    {fillerRowsSb}
                    <!-- Total Subtotal Line -->
                    <tr style='border-top:1px solid #000; font-weight:bold; font-size:10px; height:24px;'>
                        <td style='border-right:1px solid #000;'>&nbsp;</td>
                        <td style='border-right:1px solid #000; text-align:right; padding:3px 6px;'>Total</td>
                        <td style='border-right:1px solid #000;'>&nbsp;</td>
                        {(hasBatch ? "<td style='border-right:1px solid #000;'>&nbsp;</td>" : "")}
                        {(hasExpiry ? "<td style='border-right:1px solid #000;'>&nbsp;</td>" : "")}
                        <td style='border-right:1px solid #000; text-align:right; padding:3px 6px;'>{totalQuantity:N0} {mainUom}</td>
                        {(hasFree ? "<td style='border-right:1px solid #000;'>&nbsp;</td>" : "")}
                        {(hasMrp ? "<td style='border-right:1px solid #000;'>&nbsp;</td>" : "")}
                        <td style='border-right:1px solid #000;'>&nbsp;</td>
                        <td style='border-right:1px solid #000;'>&nbsp;</td>
                        {(hasDisc ? "<td style='border-right:1px solid #000;'>&nbsp;</td>" : "")}
                        <td style='text-align:right; padding:3px 6px; font-family:monospace;'>₹{taxable:N2}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 4. Bottom Section: Words, HSN Table, Bank Details, Declaration & Signature -->
    <div style='border-top:1px solid #000;'>
        <!-- Amount Chargeable (in words) & Tax totals -->
        <div style='display:grid; grid-template-columns: 1.15fr 1fr; border-bottom:1px solid #000;'>
            <!-- Left: Amount in Words -->
            <div style='padding:6px 8px; border-right:1px solid #000;'>
                <div style='font-size:9px; color:#555;'>Amount Chargeable (in words)</div>
                <div style='font-size:11px; font-weight:bold; margin-top:2px;'>INR {words} Only</div>
            </div>

            <!-- Right: Tax totals -->
            <div style='padding:4px 8px; font-size:10px;'>
                <table style='width:100%; border-collapse:collapse;'>
                    {(cgst > 0 ? $"<tr><td style='padding:1px 0;'>Output CGST:</td><td style='text-align:right; font-family:monospace;'>₹{cgst:N2}</td></tr>" : "")}
                    {(sgst > 0 ? $"<tr><td style='padding:1px 0;'>Output SGST:</td><td style='text-align:right; font-family:monospace;'>₹{sgst:N2}</td></tr>" : "")}
                    {(igst > 0 ? $"<tr><td style='padding:1px 0;'>Output IGST:</td><td style='text-align:right; font-family:monospace;'>₹{igst:N2}</td></tr>" : "")}
                    {(cess > 0 ? $"<tr><td style='padding:1px 0;'>GST Cess:</td><td style='text-align:right; font-family:monospace;'>₹{cess:N2}</td></tr>" : "")}
                    {(roundOff != 0 ? $"<tr><td style='padding:1px 0;'>Round Off:</td><td style='text-align:right; font-family:monospace;'>₹{roundOff:N2}</td></tr>" : "")}
                    <tr style='border-top:1px solid #000; font-weight:bold; font-size:11.5px;'>
                        <td style='padding:3px 0;'>Total:</td>
                        <td style='padding:3px 0; text-align:right; font-family:monospace;'>₹{totalAmount:N2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- 2-Tier Tally HSN Table -->
        <table style='width:100%; border-collapse:collapse; border-bottom:1px solid #000; font-size:9px;'>
            <thead>
                <tr style='border-bottom:1px solid #000; text-align:center; font-weight:bold;'>
                    <th rowspan='2' style='border-right:1px solid #000; padding:3px 4px;'>HSN/SAC</th>
                    <th rowspan='2' style='border-right:1px solid #000; padding:3px 6px; text-align:right;'>Taxable<br/>Value</th>
                    <th colspan='2' style='border-right:1px solid #000; padding:2px 4px;'>Central Tax</th>
                    <th colspan='2' style='border-right:1px solid #000; padding:2px 4px;'>State Tax</th>
                    {(hasIgst ? "<th colspan='2' style='border-right:1px solid #000; padding:2px 4px;'>Integrated Tax</th>" : "")}
                    <th rowspan='2' style='padding:3px 6px; text-align:right;'>Total<br/>Tax Amount</th>
                </tr>
                <tr style='border-bottom:1px solid #000; text-align:center; font-weight:bold;'>
                    <th style='border-right:1px solid #000; padding:2px 4px; width:45px;'>Rate</th>
                    <th style='border-right:1px solid #000; padding:2px 6px; text-align:right;'>Amount</th>
                    <th style='border-right:1px solid #000; padding:2px 4px; width:45px;'>Rate</th>
                    <th style='border-right:1px solid #000; padding:2px 6px; text-align:right;'>Amount</th>
                    {(hasIgst ? "<th style='border-right:1px solid #000; padding:2px 4px; width:45px;'>Rate</th><th style='border-right:1px solid #000; padding:2px 6px; text-align:right;'>Amount</th>" : "")}
                </tr>
            </thead>
            <tbody>
                {hsnSb}
                <tr style='font-weight:bold; font-size:9.5px; border-top:1px solid #000;'>
                    <td style='border-right:1px solid #000; text-align:center; padding:3px 4px;'>Total</td>
                    <td style='border-right:1px solid #000; text-align:right; padding:3px 6px; font-family:monospace;'>{sumTaxable:N2}</td>
                    <td style='border-right:1px solid #000;'></td>
                    <td style='border-right:1px solid #000; text-align:right; padding:3px 6px; font-family:monospace;'>{sumCgst:N2}</td>
                    <td style='border-right:1px solid #000;'></td>
                    <td style='border-right:1px solid #000; text-align:right; padding:3px 6px; font-family:monospace;'>{sumSgst:N2}</td>
                    {(hasIgst ? $"<td style='border-right:1px solid #000;'></td><td style='border-right:1px solid #000; text-align:right; padding:3px 6px; font-family:monospace;'>{sumIgst:N2}</td>" : "")}
                    <td style='text-align:right; padding:3px 6px; font-family:monospace;'>{sumTotalTax:N2}</td>
                </tr>
            </tbody>
        </table>

        <div style='padding:4px 8px; font-size:9.5px; border-bottom:1px solid #000;'>
            Tax Amount (in words) : <strong>INR {taxWords} Only</strong>
        </div>

        <!-- Bank Details, Declaration & Signatory -->
        <div style='display:grid; grid-template-columns: 1.15fr 1fr;'>
            <!-- Left: Bank Details & PAN -->
            <div style='padding:6px 8px; border-right:1px solid #000; font-size:9.5px; line-height:1.4;'>
                <div>Company's PAN : <strong style='font-family:monospace;'>{sellerPan}</strong></div>
                {(!string.IsNullOrEmpty(bankAcc) ? $@"
                <div style='margin-top:4px;'>
                    <strong>Company's Bank Details</strong><br/>
                    Bank Name : <strong>{bankName}</strong><br/>
                    A/c No. : <strong style='font-family:monospace;'>{bankAcc}</strong><br/>
                    Branch &amp; IFS Code : <strong style='font-family:monospace;'>{bankIfsc}</strong>
                </div>" : "")}
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                <div style='margin-top:4px; font-size:8.5px; color:#444;'>
                    Terms &amp; Conditions:<br/>
                    {t.DeclarationText}
                </div>" : "")}
            </div>

            <!-- Right: QR Code & Authorized Signatory -->
            <div style='padding:6px 8px; display:flex; flex-direction:column; justify-content:space-between; text-align:right;'>
                <div style='display:flex; justify-content:space-between; align-items:flex-start;'>
                    {(!string.IsNullOrEmpty(upiQr) ? $"<img src='{upiQr}' alt='UPI QR' style='width:60px; height:60px; border:1px solid #ccc; padding:2px;' />" : "<div></div>")}
                    <div style='font-size:10px; font-weight:bold;'>for {sellerName}</div>
                </div>
                <div style='margin-top:28px;'>
                    <div style='font-size:10px; font-weight:bold;'>Authorised Signatory</div>
                </div>
            </div>
        </div>
    </div>

</div>
<div style='text-align:center; font-size:9px; color:#555; margin-top:3px;'>
    This is a Computer Generated Invoice
</div>
</body>
</html>";
    }

    // ==============================================================================
    // 3. 💊 MARG ERP STYLE (PHARMA & FMCG DISTRIBUTION HALF-PAGE A5 LANDSCAPE)
    // ==============================================================================
    private static string RenderMargErpInvoiceHtml(PrintTemplate t, SalesInvoice? invoice, Tenant? tenant = null)
    {
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#0284c7"; // Authentic Marg Pharma Cerulean Blue
        var borderColor = "#bae6fd";
        var softOrangeBg = "#f0f9ff";
        var headerOrangeBg = "#e0f2fe";

        // Seller Information (100% Genuine, zero dummy fallback)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var logoUrl = !string.IsNullOrEmpty(t.LogoUrl) ? t.LogoUrl : (!string.IsNullOrEmpty(tenant?.LogoUrl) ? tenant.LogoUrl : "");

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy HH:mm") ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("dd/MM/yyyy") : "";

        // Customer Details
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Cash Customer" : "");
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var shipAddress = !string.IsNullOrWhiteSpace(invoice?.ShippingAddress) ? invoice.ShippingAddress : custAddress;
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";
        var custDl = ExtractInvoiceBuyerDl(invoice);

        // Logistics & Doctor / Salesman Tracking
        var doctorName = !string.IsNullOrWhiteSpace(invoice?.DoctorName) ? invoice.DoctorName : "";
        var salesman = invoice?.SalesmanUserId.HasValue == true ? "Sales Team" : "";
        var placeOfSupply = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : (!string.IsNullOrWhiteSpace(tenant?.State) ? tenant.State : "Delhi");

        // Financial Totals
        var totalAmount = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount > 0 ? (totalAmount / 1.12m) : 0m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
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
                <tr style='height:18px; border-bottom:1px solid {borderColor}; font-size:8.5px;'>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{idx++}</td>
                    <td style='border-right:1px solid {borderColor}; padding:1px 4px; font-weight:bold;'>{it.ItemName}{ExtractIndustryItemSubline(it)}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{packing}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center; font-family:monospace;'>{hsn}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{batch}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{expiry}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px; font-weight:bold;'>{it.Quantity:0.00}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center; color:{primaryColor}; font-weight:bold;'>{freeStr}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{it.UnitPrice:0.00}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{mrpStr}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{discStr}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{it.GstRate:0}%</td>
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
                <tr style='border-bottom:1px solid {borderColor}; font-size:8px;'>
                    <td style='padding:1px 3px; text-align:center; border-right:1px solid {borderColor};'>{g.Key.Hsn}</td>
                    <td style='padding:1px 3px; text-align:right; border-right:1px solid {borderColor};'>{grpTaxable:N2}</td>
                    <td style='padding:1px 3px; text-align:center; border-right:1px solid {borderColor};'>{g.Key.Rate:0}%</td>
                    <td style='padding:1px 3px; text-align:right;'>{grpTax:N2}</td>
                </tr>");
            }
        }

        int margFillerHeight = Math.Max(50, 260 - (itemCount * 20));

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
        .marg-half-page {{ width: 100%; max-width: 820px; min-height: 140mm; height: 140mm; max-height: 140mm; margin: 0 auto; box-sizing: border-box; border: 1.5px solid {primaryColor}; font-size: 8.5px; line-height: 1.3; display: flex; flex-direction: column; justify-content: space-between; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='marg-half-page'>

    <!-- TOP UDYOGBILL ORANGE HEADER -->
    <div style='background:{primaryColor}; color:#ffffff; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;'>
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
            <div style='background:#ffffff; color:{primaryColor}; font-size:11px; font-weight:900; padding:2px 10px; border-radius:3px; display:inline-block;'>{headerTitle}</div>
            <div style='font-size:8.5px; margin-top:2px; font-family:monospace;'>
                <div>Inv No: <strong>{invNo}</strong></div>
                <div>Date: <strong>{invDate}</strong></div>
                {(!string.IsNullOrEmpty(dueDate) ? $"<div>Due: <strong>{dueDate}</strong></div>" : "")}
            </div>
        </div>
    </div>

    <!-- BUYER DETAILS STRIP -->
    <div style='display:grid; grid-template-columns: 1.2fr 1fr; border-bottom:1.5px solid {primaryColor}; background:{softOrangeBg}; padding:4px 8px; font-size:8.5px;'>
        <div style='border-right:1px solid {borderColor}; padding-right:6px;'>
            <div><span style='color:{primaryColor}; font-weight:bold;'>Party M/s:</span> <strong style='font-size:10px; color:#0f172a;'>{custName}</strong></div>
            {(!string.IsNullOrEmpty(custAddress) ? $"<div style='color:#334155;'>{custAddress}</div>" : "")}
            <div style='margin-top:1px;'>
                {(!string.IsNullOrEmpty(custPhone) ? $"Mobile: <strong>{custPhone}</strong> | " : "")}
                {(!string.IsNullOrEmpty(custGstin) ? $"GSTIN: <strong style='font-family:monospace;'>{custGstin}</strong>" : "")}
                {(!string.IsNullOrEmpty(custDl) ? $" | D.L. No: <strong style='font-family:monospace;'>{custDl}</strong>" : "")}
            </div>
        </div>
        <div style='padding-left:6px; font-size:8px; line-height:1.3;'>
            <div><span style='color:{primaryColor}; font-weight:bold;'>Place of Supply:</span> <strong>{placeOfSupply}</strong></div>
            {(!string.IsNullOrEmpty(doctorName) ? $"<div><span style='color:{primaryColor};'>Doctor:</span> <strong>{doctorName}</strong></div>" : "")}
            {(!string.IsNullOrEmpty(salesman) ? $"<div><span style='color:{primaryColor};'>Salesman:</span> <strong>{salesman}</strong></div>" : "")}
            <div>Payment Terms: <strong>Standard Trade Credit</strong></div>
        </div>
    </div>

    <!-- PRODUCT TABLE CONTAINER (FLEX: 1 - STRETCHES DOWN TO COVER ALL WHITE SPACE) -->
    <div style='flex:1; display:flex; flex-direction:column;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:8.5px;'>
            <thead>
                <tr style='background:{headerOrangeBg}; border-bottom:1.5px solid {primaryColor}; font-weight:bold; color:#0f172a; height:19px;'>
                    <th style='width:22px; border-right:1px solid {borderColor}; text-align:center;'>#</th>
                    <th style='border-right:1px solid {borderColor}; text-align:left; padding:0 4px;'>Item Description</th>
                    <th style='width:42px; border-right:1px solid {borderColor}; text-align:center;'>Pack</th>
                    <th style='width:48px; border-right:1px solid {borderColor}; text-align:center;'>HSN</th>
                    <th style='width:46px; border-right:1px solid {borderColor}; text-align:center;'>Batch</th>
                    <th style='width:38px; border-right:1px solid {borderColor}; text-align:center;'>Exp</th>
                    <th style='width:36px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:30px; border-right:1px solid {borderColor}; text-align:center;'>Free</th>
                    <th style='width:44px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:44px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:34px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Dis%</th>
                    <th style='width:32px; border-right:1px solid {borderColor}; text-align:center;'>GST</th>
                    <th style='width:56px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsSb}
                <!-- Continuous vertical grid lines covering all remaining empty space -->
                <tr style='height:100%; min-height:{margFillerHeight}px;'>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{margFillerHeight}px;'>&nbsp;</td>
                    <td style='height:{margFillerHeight}px;'>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- BOTTOM SETTLEMENT & TOTALS (3-COLUMN SPLIT - ZERO GAP DIRECTLY UNDER TABLE) -->
    <div>
        <div style='display:grid; grid-template-columns: 1.3fr 1.1fr 1.6fr; border-top:1.5px solid {primaryColor}; background:{softOrangeBg}; padding:4px 6px; gap:6px;'>
            
            <!-- Left: Qty Count + Bank + Terms -->
            <div style='font-size:8px; line-height:1.3;'>
                <div style='font-weight:bold; color:{primaryColor}; border-bottom:1px dashed {borderColor}; padding-bottom:1px;'>
                    Tot Items: {itemCount} | Qty: {totalQty:0} {(totalFree > 0 ? $"(+ {totalFree:0} Free)" : "")}
                </div>
                {(hasValidBank ? $@"
                <div style='margin-top:2px;'>
                    <strong>Bank:</strong> {bankName} | <strong>A/c:</strong> <span style='font-family:monospace;'>{bankAcc}</span><br/>
                    <strong>IFSC:</strong> <span style='font-family:monospace;'>{bankIfsc}</span>
                </div>" : "")}
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                <div style='margin-top:2px; color:#475569;'>
                    <strong>Terms:</strong> {t.DeclarationText}
                </div>" : "")}
            </div>

            <!-- Center: GST Breakup or UPI QR -->
            <div style='font-size:7.5px;'>
                <div style='font-weight:bold; color:{primaryColor}; margin-bottom:1px;'>GST SUMMARY</div>
                <table style='width:100%; border:1px solid {primaryColor}; font-size:7.5px;'>
                    <tr style='background:{headerOrangeBg}; font-weight:bold; color:#0f172a;'>
                        <td style='padding:1px 2px; text-align:center; border-right:1px solid {borderColor};'>HSN</td>
                        <td style='padding:1px 2px; text-align:right; border-right:1px solid {borderColor};'>Taxable</td>
                        <td style='padding:1px 2px; text-align:center; border-right:1px solid {borderColor};'>Rate</td>
                        <td style='padding:1px 2px; text-align:right;'>Tax</td>
                    </tr>
                    {hsnSb}
                </table>
            </div>

            <!-- Right: Bordered Totals Box -->
            <div>
                <table style='width:100%; border:1.5px solid {primaryColor}; font-size:9px; background:#ffffff;'>
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; font-weight:bold; border-right:1px solid {borderColor};'>Sub Total:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {taxable:N2}</td>
                    </tr>
                    {(cgst > 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>CGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {cgst:N2}</td>
                    </tr>" : "")}
                    {(sgst > 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>SGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {sgst:N2}</td>
                    </tr>" : "")}
                    {(igst > 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>IGST:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {igst:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>Round Off:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='background:{primaryColor}; color:#ffffff; font-weight:900; font-size:11px;'>
                        <td style='padding:3px 4px; border-right:1px solid {primaryColor};'>NET PAYABLE:</td>
                        <td style='padding:3px 4px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:7.5px; color:{primaryColor}; text-align:center; margin-top:1px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- FOOTER BAR -->
        <div style='display:flex; justify-content:space-between; align-items:center; padding:3px 8px; font-size:7.5px; color:{primaryColor}; border-top:1px solid {borderColor}; background:#ffffff;'>
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
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#0e7490"; // Executive Retail Cyan / Petrol
        var borderColor = "#99f6e4";
        var softOrangeBg = "#ecfeff";
        var headerOrangeBg = "#cffafe";

        // Seller Information (100% Genuine, zero dummy fallback - NO GSTIN for Cash Memo)
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName)
            ? tenant.TradeName
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerFssai = !string.IsNullOrWhiteSpace(tenant?.FSSAINumber) ? tenant.FSSAINumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : "CASH MEMO";
        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy HH:mm") ?? DateTime.Now.ToString("dd/MM/yyyy HH:mm");

        // Customer Details (Counter Sale / Retail - Zero GST)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : "";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
        var custPhone = !string.IsNullOrWhiteSpace(invoice?.CustomerPhone) && !invoice.CustomerPhone.Contains("9876543210") ? invoice.CustomerPhone : "";

        // Doctor / Salesman Tracking
        var doctorName = !string.IsNullOrWhiteSpace(invoice?.DoctorName) ? invoice.DoctorName : "";
        var salesman = invoice?.SalesmanUserId.HasValue == true ? "Counter Staff" : "";

        // Financial Totals (Pure Retail / Non-GST)
        var totalAmount = invoice?.TotalAmount ?? 0m;
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
                <tr style='height:18px; border-bottom:1px solid {borderColor}; font-size:8.5px;'>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{idx++}</td>
                    <td style='border-right:1px solid {borderColor}; padding:1px 4px; font-weight:bold;'>{it.ItemName}{ExtractIndustryItemSubline(it)}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{packing}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{batch}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center;'>{expiry}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px; font-weight:bold;'>{it.Quantity:0.00}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:center; color:{primaryColor}; font-weight:bold;'>{freeStr}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{mrpStr}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{rateVal:0.00}</td>
                    <td style='border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>{discStr}</td>
                    <td style='text-align:right; padding:0 4px; font-weight:bold;'>{it.TotalAmount:N2}</td>
                </tr>");
            }
        }

        if (subTotal == 0) subTotal = totalAmount;
        decimal savings = totalMrp > totalAmount ? (totalMrp - totalAmount) : 0m;
        int memoFillerHeight = Math.Max(50, 260 - (itemCount * 20));

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
        .marg-half-page {{ width: 100%; max-width: 820px; min-height: 140mm; height: 140mm; max-height: 140mm; margin: 0 auto; box-sizing: border-box; border: 1.5px solid {primaryColor}; font-size: 8.5px; line-height: 1.3; display: flex; flex-direction: column; justify-content: space-between; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='marg-half-page'>

    <!-- TOP UDYOGBILL ORANGE HEADER (NON-GST CASH MEMO) -->
    <div style='background:{primaryColor}; color:#ffffff; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;'>
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
            <div style='background:#ffffff; color:{primaryColor}; font-size:11px; font-weight:900; padding:2px 10px; border-radius:3px; display:inline-block;'>{headerTitle}</div>
            <div style='font-size:8.5px; margin-top:2px; font-family:monospace;'>
                <div>Memo No: <strong>{invNo}</strong></div>
                <div>Date: <strong>{invDate}</strong></div>
            </div>
        </div>
    </div>

    <!-- CUSTOMER DETAILS STRIP (ZERO GST) -->
    <div style='display:grid; grid-template-columns: 1.2fr 1fr; border-bottom:1.5px solid {primaryColor}; background:{softOrangeBg}; padding:4px 8px; font-size:8.5px;'>
        <div style='border-right:1px solid {borderColor}; padding-right:6px;'>
            <div><span style='color:{primaryColor}; font-weight:bold;'>Customer M/s:</span> <strong style='font-size:10px; color:#0f172a;'>{custName}</strong></div>
            {(!string.IsNullOrEmpty(custAddress) ? $"<div style='color:#334155;'>{custAddress}</div>" : "")}
            {(!string.IsNullOrEmpty(custPhone) ? $"<div style='margin-top:1px;'>Mobile: <strong>{custPhone}</strong></div>" : "")}
        </div>
        <div style='padding-left:6px; font-size:8px; line-height:1.3;'>
            <div><span style='color:{primaryColor}; font-weight:bold;'>Sale Type:</span> <strong>Retail Counter Cash Sale</strong></div>
            {(!string.IsNullOrEmpty(doctorName) ? $"<div><span style='color:{primaryColor};'>Doctor:</span> <strong>{doctorName}</strong></div>" : "")}
            {(!string.IsNullOrEmpty(salesman) ? $"<div><span style='color:{primaryColor};'>Salesman:</span> <strong>{salesman}</strong></div>" : "")}
            <div>Payment Mode: <strong>Cash / Counter Settlement</strong></div>
        </div>
    </div>

    <!-- PRODUCT TABLE CONTAINER (FLEX: 1 - STRETCHES DOWN TO COVER ALL WHITE SPACE) -->
    <div style='flex:1; display:flex; flex-direction:column;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:8.5px;'>
            <thead>
                <tr style='background:{headerOrangeBg}; border-bottom:1.5px solid {primaryColor}; font-weight:bold; color:#0f172a; height:19px;'>
                    <th style='width:24px; border-right:1px solid {borderColor}; text-align:center;'>#</th>
                    <th style='border-right:1px solid {borderColor}; text-align:left; padding:0 4px;'>Item Description</th>
                    <th style='width:46px; border-right:1px solid {borderColor}; text-align:center;'>Pack</th>
                    <th style='width:54px; border-right:1px solid {borderColor}; text-align:center;'>Batch</th>
                    <th style='width:42px; border-right:1px solid {borderColor}; text-align:center;'>Exp</th>
                    <th style='width:42px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:34px; border-right:1px solid {borderColor}; text-align:center;'>Free</th>
                    <th style='width:50px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:50px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:42px; border-right:1px solid {borderColor}; text-align:right; padding:0 3px;'>Dis%</th>
                    <th style='width:66px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsSb}
                <!-- Continuous vertical grid lines covering all remaining empty space -->
                <tr style='height:100%; min-height:{memoFillerHeight}px;'>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='border-right:1px solid {borderColor}; height:{memoFillerHeight}px;'>&nbsp;</td>
                    <td style='height:{memoFillerHeight}px;'>&nbsp;</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- BOTTOM SETTLEMENT & TOTALS (ZERO GST - 3-COLUMN SPLIT DIRECTLY UNDER TABLE) -->
    <div>
        <div style='display:grid; grid-template-columns: 1.3fr 1.1fr 1.6fr; border-top:1.5px solid {primaryColor}; background:{softOrangeBg}; padding:4px 6px; gap:6px;'>
            
            <!-- Left: Qty Count + Bank + Terms -->
            <div style='font-size:8px; line-height:1.3;'>
                <div style='font-weight:bold; color:{primaryColor}; border-bottom:1px dashed {borderColor}; padding-bottom:1px;'>
                    Tot Items: {itemCount} | Qty: {totalQty:0} {(totalFree > 0 ? $"(+ {totalFree:0} Free)" : "")}
                </div>
                {(hasValidBank ? $@"
                <div style='margin-top:2px;'>
                    <strong>Bank:</strong> {bankName} | <strong>A/c:</strong> <span style='font-family:monospace;'>{bankAcc}</span><br/>
                    <strong>IFSC:</strong> <span style='font-family:monospace;'>{bankIfsc}</span>
                </div>" : "")}
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                <div style='margin-top:2px; color:#475569;'>
                    <strong>Terms:</strong> {t.DeclarationText}
                </div>" : "")}
            </div>

            <!-- Center: Savings Callout or UPI QR (ZERO GST!) -->
            <div style='display:flex; flex-direction:column; justify-content:center; align-items:center;'>
                {(savings > 0 ? $@"
                <div style='border:1.5px dashed {primaryColor}; background:#ffffff; border-radius:6px; padding:4px 8px; text-align:center; width:90%;'>
                    <div style='font-size:8px; color:{primaryColor}; font-weight:bold;'>TOTAL SAVINGS ON MRP</div>
                    <div style='font-size:14px; font-weight:900; color:{primaryColor};'>₹ {savings:N2}</div>
                </div>" : (!string.IsNullOrEmpty(upiQr) ? $@"
                <div style='text-align:center;'>
                    <img src='{upiQr}' style='width:52px; height:52px; border:1px solid {primaryColor}; border-radius:3px;' alt='UPI QR' />
                    <div style='font-size:7px; font-weight:bold; color:{primaryColor}; margin-top:1px;'>Scan to Pay</div>
                </div>" : ""))}
            </div>

            <!-- Right: Bordered Totals Box (NO GST!) -->
            <div>
                <table style='width:100%; border:1.5px solid {primaryColor}; font-size:9px; background:#ffffff;'>
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; font-weight:bold; border-right:1px solid {borderColor};'>Gross Sub Total:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {subTotal:N2}</td>
                    </tr>
                    {(totalDiscount > 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>Total Discount:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace; color:#dc2626;'>(-) ₹ {totalDiscount:N2}</td>
                    </tr>" : "")}
                    {(roundOff != 0 ? $@"
                    <tr style='border-bottom:1px solid {borderColor};'>
                        <td style='padding:1px 4px; border-right:1px solid {borderColor};'>Round Off:</td>
                        <td style='padding:1px 4px; text-align:right; font-family:monospace;'>₹ {roundOff:N2}</td>
                    </tr>" : "")}
                    <tr style='background:{primaryColor}; color:#ffffff; font-weight:900; font-size:11px;'>
                        <td style='padding:3px 4px; border-right:1px solid {primaryColor};'>TOTAL AMOUNT:</td>
                        <td style='padding:3px 4px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:7.5px; color:{primaryColor}; text-align:center; margin-top:1px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- FOOTER BAR -->
        <div style='display:flex; justify-content:space-between; align-items:center; padding:3px 8px; font-size:7.5px; color:{primaryColor}; border-top:1px solid {borderColor}; background:#ffffff;'>
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
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Purchaser");
        var buyerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : buyerName;

        var buyerAddress = !string.IsNullOrWhiteSpace(po?.Branch?.AddressLine1)
            ? $"{po.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(po.Branch.City) ? "" : $", {po.Branch.City}")}{(string.IsNullOrWhiteSpace(po.Branch.State) ? "" : $", {po.Branch.State}")}{(string.IsNullOrWhiteSpace(po.Branch.Pincode) ? "" : $" - {po.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var buyerGstin = !string.IsNullOrWhiteSpace(po?.Branch?.GSTIN)
            ? po.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var buyerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (buyerGstin.Length >= 12 ? buyerGstin.Substring(2, 10) : "");
        var buyerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var buyerEmail = !string.IsNullOrWhiteSpace(tenant?.Email) ? tenant.Email : "";
        var buyerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        // PO Metadata
        var poNo = po?.OrderNumber ?? (invoice != null ? $"PO-{invoice.InvoiceNumber}" : "");
        var poDate = po?.OrderDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var expDate = po?.ExpectedDeliveryDate.HasValue == true ? po.ExpectedDeliveryDate.Value.ToString("dd/MM/yyyy") : "";
        var poStatus = po != null ? po.Status.ToString().ToUpperInvariant() : "APPROVED";

        // Vendor / Supplier Information
        var vendorName = !string.IsNullOrWhiteSpace(po?.SupplierName)
            ? po.SupplierName
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (po != null ? "Supplier" : ""));
        var vendorAddress = !string.IsNullOrWhiteSpace(po?.SupplierAddress)
            ? po.SupplierAddress
            : (!string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "");
        var vendorGstin = !string.IsNullOrWhiteSpace(po?.SupplierGSTIN)
            ? po.SupplierGSTIN
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "");
        var vendorPhone = !string.IsNullOrWhiteSpace(po?.SupplierPhone)
            ? po.SupplierPhone
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerPhone) ? invoice.CustomerPhone : "");
        var vendorState = !string.IsNullOrWhiteSpace(po?.SupplierStateCode) ? po.SupplierStateCode : "";

        // Delivery Destination (Warehouse / Branch)
        var shipDestName = !string.IsNullOrWhiteSpace(po?.Warehouse?.WarehouseName)
            ? po.Warehouse.WarehouseName
            : (!string.IsNullOrWhiteSpace(po?.Branch?.BranchName) ? po.Branch.BranchName : "");
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
        int itemCount = 0;

        if (po?.Items != null && po.Items.Any())
        {
            itemCount = po.Items.Count;
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
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:5px 6px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName} <span style='font-size:8px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:5px 4px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{packStr}</td>
                        <td style='padding:5px 4px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.OrderQuantity:0.00}</td>
                        <td style='padding:5px 4px; text-align:center; color:#0f172a; font-weight:bold; border-right:1px solid #cbd5e1;'>{freeStr}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{uom}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{discText}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {(item.TaxableAmount + item.CgstAmount + item.SgstAmount + item.IgstAmount):N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName} <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.OrderQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{uom}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{discText}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {(item.TaxableAmount + item.CgstAmount + item.SgstAmount + item.IgstAmount):N2}</td>
                    </tr>");
                }
            }
        }
        else if (invoice?.Items != null && invoice.Items.Any())
        {
            itemCount = invoice.Items.Count;
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
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:5px 6px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName}</td>
                        <td style='padding:5px 4px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{packStr}</td>
                        <td style='padding:5px 4px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.Quantity:0.00}</td>
                        <td style='padding:5px 4px; text-align:center; color:#0f172a; font-weight:bold; border-right:1px solid #cbd5e1;'>{freeStr}</td>
                        <td style='padding:5px 4px; text-align:center; border-right:1px solid #cbd5e1;'>{uom}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{discText}</td>
                        <td style='padding:5px 4px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:5px 4px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{discText}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }

        int colCount = isPharma ? 12 : 10;

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
        .po-container {{ width: 100%; max-width: 800px; min-height: 275mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #2563eb; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='po-container'>

    <div>
        <!-- TOP EXECUTIVE SAPPHIRE BLUE HEADER BAR -->
        <div style='background: #ffffff; border-bottom: 2px solid #2563eb; color:#0f172a; padding:12px 16px; display:flex; justify-content:space-between; align-items:flex-start;'>
            <div style='max-width:62%;'>
                <div style='font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2; color:#1e3a8a;'>{buyerName}</div>
                <div style='font-size:9.5px; color:#334155; margin-top:3px; line-height:1.3;'>{buyerAddress}</div>
                <div style='font-size:9px; color:#475569; margin-top:4px; font-family:monospace; display:flex; flex-wrap:wrap; gap:8px;'>
                    <span><strong>GSTIN:</strong> {buyerGstin}</span>
                    {(!string.IsNullOrEmpty(buyerPan) ? $"<span><strong>PAN:</strong> {buyerPan}</span>" : "")}
                    {(!string.IsNullOrEmpty(buyerPhone) ? $"<span><strong>Ph:</strong> {buyerPhone}</span>" : "")}
                    {(!string.IsNullOrEmpty(buyerDl) ? $"<span><strong>D.L.:</strong> {buyerDl}</span>" : "")}
                </div>
            </div>
            <div style='text-align:right;'>
                <div style='background: linear-gradient(135deg, #1d4ed8, #2563eb); color:#ffffff; font-size:13px; font-weight:800; padding:5px 16px; border-radius:5px; display:inline-block; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(37,99,235,0.25);'>PURCHASE ORDER</div>
                <div style='margin-top:6px; font-size:9.5px; line-height:1.4; color:#334155;'>
                    <div>PO No: <strong style='font-family:monospace; font-size:11px; color:#1d4ed8;'>{poNo}</strong></div>
                    <div>PO Date: <strong>{poDate}</strong></div>
                    <div>Due Date: <strong>{expDate}</strong></div>
                    <div style='margin-top:2px;'><span style='background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-size:8.5px; font-weight:bold;'>STATUS: {poStatus}</span></div>
                </div>
            </div>
        </div>

        <!-- TWIN METADATA CARDS: VENDOR (SUPPLIER) & DELIVERY LOCATION (SHIP TO) -->
        <div style='display:grid; grid-template-columns: 1.15fr 1fr; gap:10px; padding:10px 12px; background:#f8fafc; border-bottom:1.5px solid #cbd5e1;'>
            
            <!-- Vendor Card -->
            <div style='background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; font-size:9px; line-height:1.4;'>
                <div style='font-size:9px; text-transform:uppercase; color:#1d4ed8; font-weight:bold; letter-spacing:0.3px; border-bottom:1px solid #bfdbfe; padding-bottom:3px; margin-bottom:4px;'>
                    Vendor / Supplier (Bill &amp; Ship From):
                </div>
                <div style='font-size:12px; font-weight:bold; color:#1e3a8a;'>{vendorName}</div>
                <div style='color:#334155; margin-top:2px;'>{vendorAddress}</div>
                <div style='margin-top:4px; font-family:monospace;'>
                    <div><strong>GSTIN:</strong> {vendorGstin} | <strong>State:</strong> {vendorState}</div>
                    {(!string.IsNullOrEmpty(vendorPhone) ? $"<div><strong>Phone:</strong> {vendorPhone}</div>" : "")}
                </div>
            </div>

            <!-- Ship To Card -->
            <div style='background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; font-size:9px; line-height:1.4;'>
                <div style='font-size:9px; text-transform:uppercase; color:#1d4ed8; font-weight:bold; letter-spacing:0.3px; border-bottom:1px solid #bfdbfe; padding-bottom:3px; margin-bottom:4px;'>
                    Delivery Warehouse (Ship To Destination):
                </div>
                <div style='font-size:12px; font-weight:bold; color:#1e3a8a;'>{shipDestName}</div>
                <div style='color:#334155; margin-top:2px;'>{shipAddress}</div>
                <div style='margin-top:4px;'>
                    <div>Delivery Mode: <strong>Surface Cargo / Road Transport</strong></div>
                    <div>Payment Terms: <strong>Net 30 Days from Receipt</strong></div>
                </div>
            </div>

        </div>
    </div>

    <!-- 2. LINE ITEMS TABLE WITH CONTINUOUS VERTICAL GRID LINES EXTENDING THROUGH EMPTY SPACE -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column;'>
        <table style='width:100%; height:100%; border-collapse:collapse; font-size:9.5px;'>
            <thead>
                <tr style='background:#eff6ff; color:#1e40af; border-bottom:1.5px solid #bfdbfe; font-size:9px; text-transform:uppercase; letter-spacing:0.2px; height:26px;'>
                    <th style='padding:7px 4px; width:28px; border-right:1px solid #bfdbfe; text-align:center;'>#</th>
                    <th style='padding:7px 8px; text-align:left; border-right:1px solid #bfdbfe;'>Item Description</th>
                    <th style='padding:7px 4px; width:65px; border-right:1px solid #bfdbfe; text-align:center;'>HSN/SAC</th>
                    {(isPharma ? "<th style='padding:7px 4px; width:45px; border-right:1px solid #bfdbfe; text-align:center;'>Pack</th>" : "")}
                    <th style='padding:7px 6px; width:60px; border-right:1px solid #bfdbfe; text-align:right;'>Qty</th>
                    {(isPharma ? "<th style='padding:7px 4px; width:40px; border-right:1px solid #bfdbfe; text-align:center;'>Free</th>" : "")}
                    <th style='padding:7px 4px; width:45px; border-right:1px solid #bfdbfe; text-align:center;'>UOM</th>
                    <th style='padding:7px 6px; width:65px; border-right:1px solid #bfdbfe; text-align:right;'>Rate (₹)</th>
                    <th style='padding:7px 4px; width:45px; border-right:1px solid #bfdbfe; text-align:right;'>Dis%</th>
                    <th style='padding:7px 6px; width:75px; border-right:1px solid #bfdbfe; text-align:right;'>Taxable (₹)</th>
                    <th style='padding:7px 4px; width:50px; border-right:1px solid #bfdbfe; text-align:right;'>GST%</th>
                    <th style='padding:7px 8px; width:85px; text-align:right;'>Amount (₹)</th>
                </tr>
            </thead>
            <tbody style='height:100%;'>
                {rowsSb}
                {RenderTableFillerRow(colCount, "#cbd5e1", itemCount, 640)}
            </tbody>
        </table>
    </div>

    <!-- BOTTOM COMMERCIAL SUMMARY & TERMS -->
    <div>
        <div style='display:grid; grid-template-columns: 1.25fr 1fr; border-top:1.5px solid #cbd5e1; background:#f8fafc; padding:10px 12px; gap:12px;'>
            
            <!-- Terms & Conditions -->
            <div style='font-size:8.5px; line-height:1.4;'>
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                <div style='font-size:9px; font-weight:bold; color:#1d4ed8; border-bottom:1px solid #cbd5e1; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;'>
                    Terms &amp; Conditions:
                </div>
                <div style='color:#334155;'>
                    {t.DeclarationText}
                </div>" : "<div></div>")}
            </div>

            <!-- Financial Totals Box -->
            <div>
                <table style='width:100%; border:1px solid #cbd5e1; font-size:9.5px; background:#ffffff; border-radius:4px;'>
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>Gross Subtotal:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace;'>₹ {totalGross:N2}</td>
                    </tr>
                    {(totalDisc > 0 ? $@"
                    <tr style='border-bottom:1px solid #e2e8f0;'>
                        <td style='padding:3px 6px; border-right:1px solid #e2e8f0;'>Total Discount:</td>
                        <td style='padding:3px 6px; text-align:right; font-family:monospace; color:#0f172a;'>(-) ₹ {totalDisc:N2}</td>
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
                    <tr style='background:#eff6ff; color:#1e40af; border-top:2px solid #2563eb; font-weight:900; font-size:12px;'>
                        <td style='padding:5px 6px; border-right:1px solid #bfdbfe;'>TOTAL ORDER VALUE:</td>
                        <td style='padding:5px 6px; text-align:right; font-family:monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:8px; color:#475569; text-align:center; margin-top:3px; font-style:italic;'>({words})</div>
            </div>

        </div>

        <!-- DUAL EXECUTION & SIGNATURE FOOTER -->
        <div style='display:grid; grid-template-columns: 1fr 1fr; border-top:1px solid #cbd5e1; background:#ffffff; padding:12px 16px; font-size:9px;'>
            <div>
                <div style='font-weight:bold; color:#1e3a8a; margin-bottom:28px;'>Vendor Acceptance Acknowledgement:</div>
                <div style='font-size:8px; color:#64748b; border-top:1px dashed #94a3b8; width:75%; padding-top:2px;'>Authorized Signatory &amp; Stamp (Date: ______)</div>
            </div>
            <div style='text-align:right;'>
                <div style='font-weight:bold; color:#1e3a8a; margin-bottom:28px;'>For {buyerName}:</div>
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
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "Store");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPan = !string.IsNullOrWhiteSpace(tenant?.PAN) ? tenant.PAN : (sellerGstin.Length >= 12 ? sellerGstin.Substring(2, 10) : "");
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        // Credit Note Metadata
        var cnNo = sr?.CreditNoteNumber ?? (invoice != null ? (invoice.InvoiceNumber.StartsWith("CN") ? invoice.InvoiceNumber : $"CN-{invoice.InvoiceNumber}") : "");
        var cnDate = sr?.ReturnDate.ToString("dd/MM/yyyy") ?? (invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy"));
        var origInvNo = !string.IsNullOrWhiteSpace(sr?.OriginalInvoiceNumber) ? sr.OriginalInvoiceNumber : "";
        var returnReason = !string.IsNullOrWhiteSpace(sr?.ReturnReason) ? sr.ReturnReason : "";
        var stockStatus = (sr?.RestockToWarehouse ?? true) ? "Stock Returned" : "";

        // Customer / Recipient Details
        var custName = !string.IsNullOrWhiteSpace(sr?.CustomerName)
            ? sr.CustomerName
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : (invoice != null ? "Customer" : ""));
        var custGstin = !string.IsNullOrWhiteSpace(sr?.Party?.GSTIN)
            ? sr.Party.GSTIN
            : (!string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "");
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress)
            ? invoice.BillingAddress
            : "";
        var custPhone = !string.IsNullOrWhiteSpace(sr?.Party?.PrimaryPhone) ? sr.Party.PrimaryPhone : (invoice?.CustomerPhone ?? "");
        var posState = !string.IsNullOrWhiteSpace(invoice?.PlaceOfSupply) ? invoice.PlaceOfSupply : "";

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

        int cnItemCount = 0;

        if (sr?.Items != null && sr.Items.Any())
        {
            cnItemCount = sr.Items.Count;
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
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName} <span style='font-size:8px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>3004</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{batch}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.ReturnQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>Strip</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {lineTaxable:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName} <span style='font-size:8.5px; color:#64748b; font-weight:normal;'>({item.ItemSku})</span></td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>3004</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.ReturnQuantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {lineTaxable:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }
        else if (invoice?.Items != null && invoice.Items.Any())
        {
            cnItemCount = invoice.Items.Count;
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
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{batch}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>Strip</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
                else
                {
                    rowsSb.Append($@"
                    <tr style='border-bottom:1px solid #e2e8f0; font-size:9.5px;'>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{rowIdx++}</td>
                        <td style='padding:6px 8px; font-weight:bold; color:#0f172a; border-right:1px solid #cbd5e1;'>{item.ItemName}</td>
                        <td style='padding:6px 6px; text-align:center; font-family:monospace; border-right:1px solid #cbd5e1;'>{hsn}</td>
                        <td style='padding:6px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{item.Quantity:0.00}</td>
                        <td style='padding:6px 6px; text-align:center; border-right:1px solid #cbd5e1;'>Pcs</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.UnitPrice:0.00}</td>
                        <td style='padding:6px 6px; text-align:right; font-family:monospace; border-right:1px solid #cbd5e1;'>₹ {item.TaxableAmount:N2}</td>
                        <td style='padding:6px 6px; text-align:right; border-right:1px solid #cbd5e1;'>{item.GstRate:0.00}%</td>
                        <td style='padding:6px 8px; text-align:right; font-family:monospace; font-weight:bold; color:#0f172a;'>₹ {item.TotalAmount:N2}</td>
                    </tr>");
                }
            }
        }

        int cnColCount = hasPharma ? 10 : 9;

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
        .cn-container {{ width: 100%; max-width: 800px; min-height: 275mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; border: 1.5px solid #d97706; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='cn-container'>

    <div>
        <!-- TOP STATUTORY HEADER (Warm Amber) -->
        <div style='background: #ffffff; border-bottom: 2px solid #d97706; padding: 12px 16px; display: flex; justify-content: space-between; align-items: flex-start;'>
            <div style='max-width: 62%;'>
                <div style='font-size: 18px; font-weight: 900; text-transform: uppercase; color: #78350f; letter-spacing: 0.3px; line-height: 1.2;'>{sellerName}</div>
                <div style='font-size: 9.5px; color: #334155; margin-top: 3px; line-height: 1.3;'>{sellerAddress}</div>
                <div style='font-size: 9px; color: #475569; margin-top: 4px; font-family: monospace; display: flex; flex-wrap: wrap; gap: 8px;'>
                    <span><strong>GSTIN:</strong> {sellerGstin}</span>
                    {(!string.IsNullOrEmpty(sellerPan) ? $"<span><strong>PAN:</strong> {sellerPan}</span>" : "")}
                    {(!string.IsNullOrEmpty(sellerPhone) ? $"<span><strong>Phone:</strong> {sellerPhone}</span>" : "")}
                    {(!string.IsNullOrEmpty(sellerDl) ? $"<span><strong>D.L.:</strong> {sellerDl}</span>" : "")}
                </div>
            </div>
            <div style='text-align: right;'>
                <div style='background: linear-gradient(135deg, #b45309, #d97706); color: #ffffff; font-size: 13px; font-weight: 800; padding: 5px 16px; border-radius: 5px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(180, 83, 9, 0.25);'>GST CREDIT NOTE</div>
                <div style='margin-top: 5px; font-size: 9.5px; line-height: 1.4; color: #334155;'>
                    {(!string.IsNullOrEmpty(cnNo) ? $"<div>Credit Note No: <strong style='font-family: monospace; font-size: 11px; color: #b45309;'>{cnNo}</strong></div>" : "")}
                    <div>Credit Note Date: <strong>{cnDate}</strong></div>
                </div>
            </div>
        </div>

        {(!string.IsNullOrWhiteSpace(origInvNo) || !string.IsNullOrWhiteSpace(returnReason) ? $@"
        <!-- CROSS-REFERENCE RIBBON -->
        <div style='background: #fffbeb; border-bottom: 1px solid #fde68a; padding: 6px 16px; font-size: 9px; display: flex; justify-content: space-between; align-items: center;'>
            {(!string.IsNullOrWhiteSpace(origInvNo) ? $"<div><span style='color: #b45309; font-weight: bold;'>Original Invoice No:</span> <strong style='font-family: monospace; font-size: 10px; color: #78350f;'>{origInvNo}</strong></div>" : "")}
            {(!string.IsNullOrWhiteSpace(returnReason) ? $"<div><span style='color: #b45309; font-weight: bold;'>Reason:</span> <strong>{returnReason}</strong></div>" : "")}
            {(!string.IsNullOrWhiteSpace(stockStatus) ? $"<div><span style='background: #fef3c7; color: #92400e; font-size: 8.5px; padding: 2px 6px; border-radius: 3px; font-weight: bold;'>{stockStatus}</span></div>" : "")}
        </div>" : "")}

        <!-- RECIPIENT (CUSTOMER) & PLACE OF SUPPLY -->
        <div style='display: grid; grid-template-columns: 1.3fr 1fr; gap: 10px; padding: 10px 14px; background: #ffffff; border-bottom: 1.5px solid #cbd5e1;'>
            
            <!-- Recipient Card -->
            <div style='border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 9px; line-height: 1.4;'>
                <div style='font-size: 9px; text-transform: uppercase; color: #b45309; font-weight: bold; border-bottom: 1px solid #fde68a; padding-bottom: 3px; margin-bottom: 4px;'>
                    Credit Issued To:
                </div>
                {(!string.IsNullOrEmpty(custName) ? $"<div style='font-size: 12px; font-weight: bold; color: #78350f;'>{custName}</div>" : "")}
                {(!string.IsNullOrEmpty(custAddress) ? $"<div style='color: #475569; margin-top: 2px;'>{custAddress}</div>" : "")}
                <div style='margin-top: 4px; font-family: monospace;'>
                    {(!string.IsNullOrEmpty(custGstin) ? $"<span><strong>Customer GSTIN:</strong> <span style='font-size: 10px; font-weight: bold; color: #b45309;'>{custGstin}</span></span>" : "")}
                    {(!string.IsNullOrEmpty(custPhone) ? $" | <strong>Phone:</strong> {custPhone}" : "")}
                </div>
            </div>

            <!-- Place of Supply Card -->
            <div style='border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 9px; line-height: 1.4;'>
                <div style='font-size: 9px; text-transform: uppercase; color: #b45309; font-weight: bold; border-bottom: 1px solid #fde68a; padding-bottom: 3px; margin-bottom: 4px;'>
                    Place of Supply:
                </div>
                {(!string.IsNullOrEmpty(posState) ? $"<div>Place of Supply (POS): <strong>{posState}</strong></div>" : "")}
            </div>

        </div>
    </div>

    <!-- ITEMS RETURNED TABLE WITH CONTINUOUS VERTICAL GRID LINES EXTENDING THROUGH EMPTY SPACE -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column;'>
        <table style='width: 100%; height: 100%; border-collapse: collapse; font-size: 9.5px;'>
            <thead>
                <tr style='background: #fffbeb; color: #92400e; border-bottom: 1.5px solid #fde68a; font-size: 9px; text-transform: uppercase; letter-spacing: 0.2px; height: 26px;'>
                    <th style='padding: 7px 4px; width: 28px; border-right: 1px solid #fde68a; text-align: center;'>#</th>
                    <th style='padding: 7px 8px; text-align: left; border-right: 1px solid #fde68a;'>Returned Item Description</th>
                    <th style='padding: 7px 6px; width: 65px; border-right: 1px solid #fde68a; text-align: center;'>HSN/SAC</th>
                    {(hasPharma ? "<th style='padding: 7px 6px; width: 70px; border-right: 1px solid #fde68a; text-align: center;'>Batch</th>" : "")}
                    <th style='padding: 7px 6px; width: 65px; border-right: 1px solid #fde68a; text-align: right;'>Return Qty</th>
                    <th style='padding: 7px 4px; width: 45px; border-right: 1px solid #fde68a; text-align: center;'>UOM</th>
                    <th style='padding: 7px 6px; width: 70px; border-right: 1px solid #fde68a; text-align: right;'>Rate (₹)</th>
                    <th style='padding: 7px 6px; width: 85px; border-right: 1px solid #fde68a; text-align: right;'>Taxable (₹)</th>
                    <th style='padding: 7px 4px; width: 50px; border-right: 1px solid #fde68a; text-align: right;'>GST%</th>
                    <th style='padding: 7px 8px; width: 95px; text-align: right;'>Credit (₹)</th>
                </tr>
            </thead>
            <tbody style='height:100%;'>
                {rowsSb}
                {RenderTableFillerRow(cnColCount, "#cbd5e1", cnItemCount, 640)}
            </tbody>
        </table>
    </div>

    <!-- BOTTOM TOTALS & OPTIONAL TERMS -->
    <div>
        <div style='display: grid; grid-template-columns: 1.25fr 1fr; border-top: 1.5px solid #cbd5e1; background: #f8fafc; padding: 10px 14px; gap: 12px;'>
            
            <!-- Terms & Conditions (if configured) -->
            <div style='font-size: 8.5px; line-height: 1.4;'>
                {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                <div style='font-size: 9px; font-weight: bold; color: #b45309; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase;'>
                    Terms &amp; Conditions:
                </div>
                <div style='color: #334155;'>
                    {t.DeclarationText}
                </div>" : "<div></div>")}
            </div>

            <!-- Financial Totals Box -->
            <div>
                <table style='width: 100%; border: 1.5px solid #cbd5e1; font-size: 9.5px; background: #ffffff; border-radius: 4px;'>
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>Taxable Value:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {totalTaxable:N2}</td>
                    </tr>
                    {(cgstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>CGST:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {cgstReversal:N2}</td>
                    </tr>" : "")}
                    {(sgstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>SGST:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {sgstReversal:N2}</td>
                    </tr>" : "")}
                    {(igstReversal > 0 ? $@"
                    <tr style='border-bottom: 1px solid #e2e8f0;'>
                        <td style='padding: 3px 6px; border-right: 1px solid #e2e8f0;'>IGST:</td>
                        <td style='padding: 3px 6px; text-align: right; font-family: monospace;'>₹ {igstReversal:N2}</td>
                    </tr>" : "")}
                    <tr style='background: #fffbeb; color: #92400e; border-top: 2px solid #d97706; font-weight: 900; font-size: 12px;'>
                        <td style='padding: 5px 6px; border-right: 1px solid #fde68a;'>TOTAL CREDIT AMOUNT:</td>
                        <td style='padding: 5px 6px; text-align: right; font-family: monospace;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size: 8px; color: #475569; text-align: center; margin-top: 3px; font-style: italic;'>({words})</div>
            </div>

        </div>

        <!-- STATUTORY SIGNATORY FOOTER -->
        <div style='display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #cbd5e1; background: #ffffff; padding: 12px 16px; font-size: 9px;'>
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
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#7c3aed"; // Vibrant Modern Violet / Purple
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) && t.SecondaryColorHex != "#334155"
            ? t.SecondaryColorHex
            : "#6d28d9";

        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPhone = tenant?.PrimaryPhone ?? "";

        var headerTitle = !string.IsNullOrWhiteSpace(t.HeaderTitle) ? t.HeaderTitle : (t.DocumentType == PrintDocumentType.POSReceipt ? "CASH MEMO" : "TAX INVOICE");
        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd MMM yyyy") ?? DateTime.Now.ToString("dd MMM yyyy");
        var custName = invoice?.CustomerName ?? "";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custPhone = invoice?.CustomerPhone ?? "";

        var totalAmount = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (invoice?.TotalAmount > 0 ? (invoice.TotalAmount / 1.18m) : 0m);
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
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{idx++}</td>
                    <td style='padding:8px 6px; border-right:1px solid #cbd5e1;'><strong>{it.ItemName}</strong>{ExtractIndustryItemSubline(it)}<br/><span style='font-size:9.5px; color:#64748b;'>HSN: {it.HsnCode ?? "-"}</span></td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; border-right:1px solid #cbd5e1;'>{it.Quantity:N0} {it.UomCode}</td>
                    <td style='padding:8px 6px; text-align:right; border-right:1px solid #cbd5e1;'>₹{it.UnitPrice:N2}</td>
                    <td style='padding:8px 6px; text-align:center; border-right:1px solid #cbd5e1;'>{it.GstRate:N0}%</td>
                    <td style='padding:8px 6px; text-align:right; font-weight:bold; color:#0f172a;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }

        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, primaryColor);
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
        <div style='font-family:Inter, Arial, sans-serif; font-size:11px; color:#1e293b; width:100%; max-width:800px; {heightStyle} margin:0 auto; border:1.5px solid {primaryColor}; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.03); background:#fff; display:flex; flex-direction:column; justify-content:space-between;'>
            <div>
                <!-- Modern Executive Banner -->
                <div style='background:#ffffff; border-bottom:2px solid {primaryColor}; color:#0f172a; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;'>
                    <div>
                        <div style='font-size:20px; font-weight:900; letter-spacing:0.3px; color:{primaryColor};'>{sellerName}</div>
                        {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:10.5px; color:#475569; margin-top:2px;'>{sellerAddress}</div>" : "")}
                        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"<div style='font-size:10px; color:#334155; margin-top:3px;'>GSTIN: <strong>{sellerGstin}</strong> {(string.IsNullOrEmpty(sellerPhone) ? "" : $"| Contact: <strong>{sellerPhone}</strong>")}</div>")}
                    </div>
                    <div style='text-align:right;'>
                        <div style='background:linear-gradient(135deg, {primaryColor}, {secondaryColor}); color:#ffffff; padding:5px 16px; border-radius:5px; font-size:13px; font-weight:800; letter-spacing:0.5px; box-shadow:0 2px 4px rgba(124,58,237,0.25);'>{headerTitle}</div>
                        <div style='font-size:8.5px; margin-top:3px; color:#64748b; font-weight:bold;'>ORIGINAL FOR RECIPIENT</div>
                    </div>
                </div>

                <!-- Customer & Invoice Cards -->
                <div style='display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px 16px; background:#faf5ff; border-bottom:1px solid #e9d5ff;'>
                    <div style='background:#fff; padding:10px 12px; border-radius:6px; border:1px solid #e9d5ff;'>
                        <div style='font-size:9.5px; font-weight:bold; color:{primaryColor}; text-transform:uppercase;'>Billed To:</div>
                        <div style='font-size:13px; font-weight:bold; color:#0f172a; margin-top:2px;'>{custName}</div>
                        {(string.IsNullOrEmpty(custPhone) ? "" : $"<div style='font-size:10.5px; color:#475569;'>Phone: {custPhone}</div>")}
                        {(string.IsNullOrEmpty(custGstin) ? "" : $"<div style='font-size:10.5px; color:#475569;'>GSTIN: {custGstin}</div>")}
                    </div>
                    <div style='background:#fff; padding:10px 12px; border-radius:6px; border:1px solid #e9d5ff; text-align:right;'>
                        <div style='font-size:9.5px; font-weight:bold; color:{primaryColor}; text-transform:uppercase;'>Invoice Details:</div>
                        {(!string.IsNullOrEmpty(invNo) ? $"<div style='font-size:13px; font-weight:bold; color:{primaryColor}; margin-top:2px;'>#{invNo}</div>" : "")}
                        <div style='font-size:10.5px; color:#475569;'>Date: {invDate}</div>
                    </div>
                </div>
            </div>

            <!-- Items Table (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES) -->
            <div style='flex:1 1 auto; display:flex; flex-direction:column; border-bottom:1px solid #cbd5e1; overflow:hidden;'>
                <table style='width:100%; height:100%; flex:1 1 auto; border-collapse:collapse;'>
                    <thead>
                        <tr style='background:#faf5ff; font-size:9.5px; font-weight:800; color:{primaryColor}; border-bottom:1.5px solid #e9d5ff; text-transform:uppercase; height:26px;'>
                            <th style='padding:7px 6px; width:30px; text-align:center; border-right:1px solid #e9d5ff;'>#</th>
                            <th style='padding:7px 6px; text-align:left; border-right:1px solid #e9d5ff;'>Item Details</th>
                            <th style='padding:7px 6px; width:70px; text-align:right; border-right:1px solid #e9d5ff;'>Qty</th>
                            <th style='padding:7px 6px; width:80px; text-align:right; border-right:1px solid #e9d5ff;'>Rate</th>
                            <th style='padding:7px 6px; width:50px; text-align:center; border-right:1px solid #e9d5ff;'>Tax</th>
                            <th style='padding:7px 6px; width:90px; text-align:right;'>Amount</th>
                        </tr>
                    </thead>
                    <tbody style='height:100%;'>
                        {itemsRows}
                        {((invoice?.Items?.Count ?? 0) < 12 ? RenderTableFillerRow(6, "#cbd5e1", (invoice?.Items?.Count ?? 0), IsA5Size(t) ? 220 : 620) : "")}
                    </tbody>
                </table>
            </div>

            <div>
                <!-- HSN Summary Table -->
                {hsnSummaryHtml}

                <!-- Bottom Summary & Instant QR -->
                <div style='display:grid; grid-template-columns:1fr 100px 200px; gap:12px; padding:12px 16px; border-top:1.5px solid #e9d5ff; background:#faf5ff; align-items:center;'>
                    <div style='font-size:10px; color:#64748b;'>
                        {(!string.IsNullOrEmpty(sellerName) ? $"Thank you for choosing {sellerName}!<br/>" : "")}
                        {(!string.IsNullOrEmpty(sellerPhone) ? $"For questions or support, contact {sellerPhone}." : "")}
                        {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $"<div style='margin-top:4px;'><strong>Terms:</strong> {t.DeclarationText}</div>" : "")}
                    </div>
                    <div style='text-align:center;'>
                        {qrImgTag}
                    </div>
                    <div style='font-size:11px; text-align:right;'>
                        <div style='color:#64748b;'>Taxable: ₹{taxable:N2}</div>
                        <div style='color:#64748b;'>GST Tax: ₹{totalTax:N2}</div>
                        <div style='font-size:16px; font-weight:900; color:{primaryColor}; margin-top:4px;'>
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
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#059669"; // Emerald Green
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) && t.SecondaryColorHex != "#334155"
            ? t.SecondaryColorHex
            : "#047857";

        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd-MM-yyyy") ?? DateTime.Now.ToString("dd-MM-yyyy");
        var custName = invoice?.CustomerName ?? "";
        var custGstin = invoice?.CustomerGSTIN ?? "";
        var custAddress = invoice?.BillingAddress ?? "";
        var transporter = invoice?.TransporterName ?? "";
        var lrNo = invoice?.LrNumber ?? "";
        var eWayNo = invoice?.EWayBillNumber ?? "";

        var taxable = invoice?.TaxableAmount ?? (invoice?.TotalAmount > 0 ? (invoice.TotalAmount / 1.18m) : 0m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var totalAmount = invoice?.TotalAmount ?? 0m;

        bool hasExpiry = invoice?.Items.Any(i => i.ExpiryDate.HasValue) ?? false;
        bool hasBatch = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(i.BatchNumber)) ?? false;
        bool hasFree = invoice?.Items.Any(i => ExtractItemPharmaAttributes(i).freeQty > 0) ?? false;
        bool hasPacking = invoice?.Items.Any(i => !string.IsNullOrWhiteSpace(ExtractItemPharmaAttributes(i).pack)) ?? false;
        bool hasDisc = invoice?.Items.Any(i => i.DiscountPercent > 0 || i.DiscountAmount > 0) ?? false;

        int colCount = 8 + (hasPacking ? 1 : 0) + (hasBatch ? 1 : 0) + (hasExpiry ? 1 : 0) + (hasFree ? 1 : 0) + (hasDisc ? 1 : 0);

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
                    <td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{it.HsnCode ?? "-"}</td>
                    {(hasBatch ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; font-family:monospace; font-weight:bold;'>{it.BatchNumber ?? "-"}</td>" : "")}
                    {(hasExpiry ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1;'>{expStr}</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-weight:bold;'>{it.Quantity:N0}</td>
                    {(hasFree ? $"<td style='padding:4px; text-align:center; border-right:1px solid #cbd5e1; color:#0f172a;'>{attrs.freeQty:N0}</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>₹{it.UnitPrice:N2}</td>
                    {(hasDisc ? $"<td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>{it.DiscountPercent:N0}%</td>" : "")}
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1; font-family:monospace;'>₹{it.TaxableAmount:N2}</td>
                    <td style='padding:4px; text-align:right; border-right:1px solid #cbd5e1;'>{it.GstRate:N0}%</td>
                    <td style='padding:4px; text-align:right; font-family:monospace; font-weight:bold;'>₹{it.TotalAmount:N2}</td>
                </tr>");
            }
        }

        var hsnSummaryHtml = RenderHsnSummaryTable(invoice, primaryColor);
        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='cbo-invoice-wrap' style='width:100%; max-width:820px; {heightStyle} margin:0 auto; font-family:""Segoe UI"", Arial, sans-serif; font-size:10.5px; color:#0f172a; background:#fff; border:1.5px solid {primaryColor}; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between;'>
    <div>
        <!-- CBO 3-Column Top Header -->
        <table style='width:100%; border-collapse:collapse; border-bottom:2px solid {primaryColor};'>
            <tr>
                <!-- Col 1: Seller Details -->
                <td style='width:38%; padding:8px 10px; border-right:1px solid #cbd5e1; vertical-align:top;'>
                    <div style='font-size:16px; font-weight:900; color:{primaryColor}; text-transform:uppercase;'>{sellerName}</div>
                    <div style='font-size:9px; color:#475569; margin-top:3px;'>
                        {(!string.IsNullOrEmpty(sellerDl) ? $"D.L. No.: {sellerDl}<br/>" : "")}
                        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin}")}
                    </div>
                </td>
                <!-- Col 2: Central Title -->
                <td style='width:24%; padding:8px; text-align:center; border-right:1px solid #cbd5e1; vertical-align:middle; background:#f0fdf4;'>
                    <div style='display:inline-block; background:linear-gradient(135deg, {primaryColor}, {secondaryColor}); color:#fff; font-size:13px; font-weight:800; padding:4px 14px; border-radius:4px; box-shadow:0 2px 4px rgba(5,150,105,0.25); letter-spacing:0.5px;'>TAX INVOICE</div>
                </td>
                <!-- Col 3: Logistics & Transporter Details -->
                <td style='width:38%; padding:6px 10px; vertical-align:top; font-size:9px;'>
                    {(!string.IsNullOrEmpty(invNo) ? $"<div><strong>Invoice No:</strong> <span style='font-weight:bold; font-family:monospace; color:{primaryColor};'>{invNo}</span></div>" : "")}
                    <div><strong>Date:</strong> {invDate}</div>
                    {(!string.IsNullOrEmpty(transporter) ? $"<div><strong>Transporter:</strong> {transporter}</div>" : "")}
                    {(!string.IsNullOrEmpty(lrNo) ? $"<div><strong>L.R. No:</strong> {lrNo}</div>" : "")}
                    {(!string.IsNullOrEmpty(eWayNo) ? $"<div><strong>E-Way Bill:</strong> {eWayNo}</div>" : "")}
                </td>
            </tr>
        </table>

        <!-- Buyer Details Box -->
        <div style='padding:6px 10px; background:#ecfdf5; border-bottom:1px solid #a7f3d0;'>
            <span style='font-size:8.5px; font-weight:bold; color:{primaryColor}; text-transform:uppercase;'>Billed To:</span>
            <div style='font-size:12px; font-weight:bold; color:#065f46;'>{custName}</div>
            <div style='font-size:9.5px; color:#334155;'>
                {(string.IsNullOrEmpty(custAddress) ? "" : $"{custAddress} | ")}
                {(string.IsNullOrEmpty(custGstin) ? "" : $"<strong>GSTIN:</strong> {custGstin}")}
            </div>
        </div>
    </div>

    <!-- Line Items Table (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES EXTENDING TO BOTTOM) -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column; border:1px solid #cbd5e1; border-radius:4px; margin-top:6px; overflow:hidden;'>
        <table style='width:100%; height:100%; flex:1 1 auto; border-collapse:collapse; font-size:9.5px;'>
            <thead>
                <tr style='background:#ecfdf5; color:{secondaryColor}; font-size:9px; font-weight:bold; border-bottom:1.5px solid #a7f3d0; text-transform:uppercase; height:24px;'>
                    <th style='padding:5px 4px; width:25px; text-align:center; border-right:1px solid #a7f3d0;'>S.N.</th>
                    <th style='padding:5px 4px; text-align:left; border-right:1px solid #a7f3d0;'>Brand / Molecule</th>
                    {(hasPacking ? "<th style='padding:5px 4px; width:45px; text-align:center; border-right:1px solid #a7f3d0;'>Pack</th>" : "")}
                    <th style='padding:5px 4px; width:55px; text-align:center; border-right:1px solid #a7f3d0;'>HSN</th>
                    {(hasBatch ? "<th style='padding:5px 4px; width:65px; text-align:center; border-right:1px solid #a7f3d0;'>Batch</th>" : "")}
                    {(hasExpiry ? "<th style='padding:5px 4px; width:45px; text-align:center; border-right:1px solid #a7f3d0;'>Exp</th>" : "")}
                    <th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #a7f3d0;'>Qty</th>
                    {(hasFree ? "<th style='padding:5px 4px; width:35px; text-align:center; border-right:1px solid #a7f3d0;'>Free</th>" : "")}
                    <th style='padding:5px 4px; width:55px; text-align:right; border-right:1px solid #a7f3d0;'>Rate</th>
                    {(hasDisc ? "<th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #a7f3d0;'>Disc%</th>" : "")}
                    <th style='padding:5px 4px; width:65px; text-align:right; border-right:1px solid #a7f3d0;'>Taxable</th>
                    <th style='padding:5px 4px; width:40px; text-align:right; border-right:1px solid #a7f3d0;'>GST</th>
                    <th style='padding:5px 4px; width:75px; text-align:right;'>Total</th>
                </tr>
            </thead>
            <tbody style='height:100%;'>
                {itemsRows}
                {((invoice?.Items?.Count ?? 0) < 12 ? RenderTableFillerRow(colCount, "#cbd5e1", (invoice?.Items?.Count ?? 0), IsA5Size(t) ? 220 : 620) : "")}
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
                    {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
                    <div style='margin-top:6px; font-size:9px; color:#334155; line-height:1.35;'>
                        <strong>Terms &amp; Conditions:</strong> {t.DeclarationText}
                    </div>" : "")}
                </td>
                <td style='width:40%; padding:6px 10px; vertical-align:top; background:#f8fafc;'>
                    <table style='width:100%; border-collapse:collapse; font-size:10px; line-height:1.5;'>
                        <tr><td>Taxable Total:</td><td style='text-align:right; font-family:monospace;'>₹ {taxable:N2}</td></tr>
                        <tr><td>CGST:</td><td style='text-align:right; font-family:monospace;'>₹ {cgst:N2}</td></tr>
                        <tr><td>SGST:</td><td style='text-align:right; font-family:monospace;'>₹ {sgst:N2}</td></tr>
                        <tr style='border-top:2px solid {primaryColor}; background:#ecfdf5; color:#065f46; font-weight:bold;'>
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
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#be123c"; // Medical Ruby / Crimson Red
        var secondaryColor = !string.IsNullOrWhiteSpace(t.SecondaryColorHex) && t.SecondaryColorHex != "#334155"
            ? t.SecondaryColorHex
            : "#e11d48";

        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}, {invoice.Branch.State} - {invoice.Branch.Pincode}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}, {tenant.City}, {tenant.State} - {tenant.Pincode}" : "");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var custName = invoice?.CustomerName ?? "";
        var custPhone = invoice?.CustomerPhone ?? "";
        var docName = invoice?.DoctorName ?? "";
        var docReg = invoice?.DoctorRegistrationNumber ?? "";
        var total = invoice?.TotalAmount ?? 0m;
        var words = ConvertToIndianCurrencyWords(total);

        var heightStyle = GetContainerHeightStyle(t);

        return $@"
<div class='invoice-container' style='font-family:{t.FontFamily}; width:100%; max-width:800px; {heightStyle} margin:0 auto; padding:16px 20px; border:1.5px solid {primaryColor}; border-radius:6px; box-sizing:border-box; background:#fff; font-size:11.5px; display:flex; flex-direction:column; justify-content:space-between;'>
    <div>
        <div style='display:flex; justify-content:space-between; border-bottom:2px solid {primaryColor}; padding-bottom:8px;'>
            <div>
                <h2 style='color:{primaryColor}; margin:0; font-size:19px; font-weight:900;'>{sellerName}</h2>
                {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:10.5px; color:#475569; margin-top:2px;'>{sellerAddress}</div>" : "")}
                <div style='font-size:10px; font-weight:bold; color:#334155; margin-top:3px;'>
                    {(!string.IsNullOrEmpty(sellerDl) ? $"DL No: {sellerDl} | " : "")}
                    {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin}")}
                </div>
            </div>
            <div style='text-align:right;'>
                <div style='background:linear-gradient(135deg, {primaryColor}, {secondaryColor}); color:#fff; padding:4px 14px; font-weight:bold; font-size:12.5px; border-radius:4px; box-shadow:0 2px 4px rgba(190,18,60,0.25); display:inline-block; letter-spacing:0.3px;'>RETAIL PHARMA INVOICE</div>
                {(!string.IsNullOrEmpty(invNo) ? $"<div style='font-size:11px; font-weight:bold; margin-top:4px;'>Invoice No: <strong style='color:{primaryColor}; font-family:monospace;'>{invNo}</strong></div>" : "")}
                <div style='font-size:10.5px; color:#475569;'>Date: {invDate}</div>
            </div>
        </div>

        <!-- Doctor & Patient Details (Rendered if present) -->
        {(!string.IsNullOrEmpty(custName) || !string.IsNullOrEmpty(docName) ? $@"
        <div style='display:grid; grid-template-columns:1.5fr 1fr; gap:12px; margin-top:8px; background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:7px 12px;'>
            <div>
                <div style='font-size:9.5px; color:{primaryColor}; font-weight:bold; text-transform:uppercase;'>Patient Details</div>
                <div style='font-size:12.5px; font-weight:bold; color:#0f172a;'>{custName}</div>
                {(!string.IsNullOrEmpty(custPhone) ? $"<div style='font-size:10px; color:#475569;'>Contact: {custPhone}</div>" : "")}
            </div>
            <div>
                <div style='font-size:9.5px; color:{primaryColor}; font-weight:bold; text-transform:uppercase;'>Prescribed By Doctor</div>
                <div style='font-size:12.5px; font-weight:bold; color:#0f172a;'>{(!string.IsNullOrEmpty(docName) ? docName : "-")}</div>
                {(!string.IsNullOrEmpty(docReg) ? $"<div style='font-size:10px; color:#475569;'>Reg Number: <strong>{docReg}</strong></div>" : "")}
            </div>
        </div>" : "")}
    </div>

    <!-- Items with Batch, Expiry, Salt & H1 flags (FULL HEIGHT STRETCHED WITH VERTICAL COLUMN LINES) -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column; margin-top:8px; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
        <table style='width:100%; height:100%; flex:1 1 auto; border-collapse:collapse; font-size:10.5px;'>
            <thead>
                <tr style='background:#fff1f2; color:{primaryColor}; border-bottom:1.5px solid #fecdd3; height:26px;'>
                    <th style='padding:5px 4px; text-align:center; border-right:1px solid #fecdd3; width:28px;'>#</th>
                    <th style='padding:5px 6px; text-align:left; border-right:1px solid #fecdd3;'>Medicine Description</th>
                    <th style='padding:5px 4px; text-align:center; border-right:1px solid #fecdd3; width:75px;'>Batch</th>
                    <th style='padding:5px 4px; text-align:center; border-right:1px solid #fecdd3; width:55px;'>Exp</th>
                    <th style='padding:5px 4px; text-align:right; border-right:1px solid #fecdd3; width:65px;'>MRP</th>
                    <th style='padding:5px 4px; text-align:right; border-right:1px solid #fecdd3; width:45px;'>Qty</th>
                    <th style='padding:5px 4px; text-align:right; border-right:1px solid #fecdd3; width:50px;'>Disc %</th>
                    <th style='padding:5px 6px; text-align:right; width:80px;'>Net Amount</th>
                </tr>
            </thead>
            <tbody style='height:100%;'>
                {RenderFullPageLineItemsRows(invoice)}
                {((invoice?.Items?.Count ?? 0) < 12 ? RenderTableFillerRow(8, "#cbd5e1", (invoice?.Items?.Count ?? 0), IsA5Size(t) ? 220 : 600) : "")}
            </tbody>
        </table>
    </div>

    <div>
        {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $@"
        <div style='margin-top:8px; font-size:9.5px; color:#475569;'>
            <strong>Terms &amp; Conditions:</strong> {t.DeclarationText}
        </div>" : "")}

        <div style='display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1.5px solid {primaryColor}; padding-top:6px;'>
            <div style='font-size:10.5px;'>
                <strong>Amount in Words:</strong> {words}
            </div>
            <div style='text-align:right; font-size:14px; font-weight:900; color:{primaryColor};'>
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
        var primaryColor = !string.IsNullOrWhiteSpace(t.PrimaryColorHex) && t.PrimaryColorHex != "#0f172a" && t.PrimaryColorHex != "#000000"
            ? t.PrimaryColorHex
            : "#0f766e"; // Sleek Slate Teal
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}" : "");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy");
        var total = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (total > 0 ? (total / 1.12m) : 0m);
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
                <div style='background:{primaryColor}; color:#fff; padding:3px 10px; font-size:11px; font-weight:900; border-radius:3px; display:inline-block;'>CASH / TRADE MEMO</div><br/>
                <span style='font-size:10.5px; margin-top:2px; display:inline-block;'>{(!string.IsNullOrEmpty(invNo) ? $"No: <strong style='font-family:monospace; color:{primaryColor};'>{invNo}</strong> | " : "")}Date: <strong>{invDate}</strong></span>
            </div>
        </div>
        <div style='display:flex; justify-content:space-between; margin:6px 0; font-size:10.5px; background:#f0fdfa; padding:4px 8px; border-radius:4px; border:1px solid #99f6e4;'>
            <div>Billed To: <strong style='color:#0f172a;'>{invoice?.CustomerName ?? ""}</strong> {(string.IsNullOrEmpty(invoice?.CustomerGSTIN) ? "" : $"| GSTIN: <span style='font-family:monospace;'>{invoice.CustomerGSTIN}</span>")}</div>
            <div>Place of Supply: <strong>{invoice?.PlaceOfSupply ?? "Local"}</strong></div>
        </div>
    </div>

    <!-- Table with vertical column lines stretched -->
    <div style='flex:1 1 auto; display:flex; flex-direction:column; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
        <table style='width:100%; height:100%; flex:1 1 auto; border-collapse:collapse; font-size:10px;'>
            <thead>
                <tr style='background:#f0fdfa; color:{primaryColor}; font-weight:bold; height:24px; border-bottom:1px solid #99f6e4;'>
                    <th style='padding:4px; border-right:1px solid #99f6e4; text-align:left;'>Item Description</th>
                    <th style='padding:4px; border-right:1px solid #99f6e4; width:60px; text-align:center;'>HSN</th>
                    <th style='padding:4px; border-right:1px solid #99f6e4; width:45px; text-align:right;'>Qty</th>
                    <th style='padding:4px; border-right:1px solid #99f6e4; width:65px; text-align:right;'>Rate (₹)</th>
                    <th style='padding:4px; border-right:1px solid #99f6e4; width:65px; text-align:right;'>Taxable</th>
                    <th style='padding:4px; width:75px; text-align:right;'>Total (₹)</th>
                </tr>
            </thead>
            <tbody style='height:100%;'>
                {RenderFullPageLineItemsRows(invoice)}
                {((invoice?.Items?.Count ?? 0) < 8 ? RenderTableFillerRow(6, "#cbd5e1", (invoice?.Items?.Count ?? 0), 260) : "")}
            </tbody>
        </table>
    </div>

    <div style='display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px; font-size:10px; border-top:1px solid #cbd5e1; padding-top:4px;'>
        <div style='color:#64748b;'>
            {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $"<span>{t.DeclarationText}</span>" : "")}
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
        var sellerName = !string.IsNullOrWhiteSpace(tenant?.TradeName) ? tenant.TradeName : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}, {invoice.Branch.City}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}" : "");
        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN) ? invoice.Branch.GSTIN : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerPhone = tenant?.PrimaryPhone ?? "";
        var sellerDl = tenant?.DrugLicenseNumber ?? "";

        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("dd/MM/yy HH:mm") ?? DateTime.Now.ToString("dd/MM/yy HH:mm");
        var total = invoice?.TotalAmount ?? 0m;
        var subTotal = invoice?.SubTotal > 0 ? invoice.SubTotal : (total > 0 ? (total / 1.12m) : 0m);
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

        return $@"
<div class='thermal-slip' style='font-family:monospace; width:280px; margin:0 auto; padding:8px; font-size:11px; line-height:1.3; color:#000;'>
    <div style='text-align:center;'>
        {(!string.IsNullOrEmpty(sellerName) ? $"<strong style='font-size:15px;'>{sellerName}</strong><br/>" : "")}
        {(!string.IsNullOrEmpty(sellerAddress) ? $"{sellerAddress}<br/>" : "")}
        {(string.IsNullOrEmpty(sellerGstin) ? "" : $"GSTIN: {sellerGstin} ")}{(string.IsNullOrEmpty(sellerPhone) ? "" : $"| Ph: {sellerPhone}")}{(string.IsNullOrEmpty(sellerGstin) && string.IsNullOrEmpty(sellerPhone) ? "" : "<br/>")}
        {(!string.IsNullOrEmpty(sellerDl) ? $"DL No: {sellerDl}<br/>" : "")}
        ----------------------------------------<br/>
        <strong>CASH / POS RECEIPT</strong><br/>
        {(!string.IsNullOrEmpty(invNo) ? $"Bill No: {invNo} | " : "")}{invDate}<br/>
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
        var effectiveColor = "#0f172a";
        if (invoice?.Items == null || !invoice.Items.Any())
        {
            return $@"
            <div style='margin-top:6px; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden;'>
                <div style='background:#f1f5f9; color:#0f172a; border-bottom:1px solid #cbd5e1; font-weight:bold; font-size:9.5px; padding:3px 6px; text-transform:uppercase;'>
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
                            <td style='padding:3px 4px; text-align:right; color:#0f172a;'>₹ 2,220.00</td>
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
            <div style='background:#f1f5f9; color:#0f172a; border-bottom:1px solid #cbd5e1; font-weight:bold; font-size:9.5px; padding:3px 6px; text-transform:uppercase;'>
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
                        <td style='padding:3px 4px; text-align:right; color:#0f172a;'>₹{sumTotalTax:N2}</td>
                    </tr>
                </tbody>
            </table>
        </div>";
    }

    // ==============================================================================
    // ⚙️ HELPERS & SEEDER
    // ==============================================================================
    private static string RenderTableFillerRow(int columnCount, string borderColor, int itemCount = 0, int baseHeight = 620)
    {
        // Standard Indian Accounting Format (Tally / Marg / Vyapar):
        // Vertical column dividers must extend continuously through empty space to the bottom of the table.
        int calculatedHeight = Math.Max(70, baseHeight - (itemCount * 26));
        var sb = new StringBuilder($"<tr style='height:100%; min-height:{calculatedHeight}px; vertical-align:top;'>");
        for (int i = 0; i < columnCount; i++)
        {
            var borderStyle = (i < columnCount - 1) ? $"border-right:1px solid {borderColor};" : "";
            sb.Append($"<td style='{borderStyle} height:100%; min-height:{calculatedHeight}px; padding:0;'>&nbsp;</td>");
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

        return "";
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

        return "";
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
                TemplateName = "Enterprise Classic Executive Edition (A4)",
                TemplateCode = "TPL_ENTERPRISE_PREMIUM_DYNAMIC",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#4338ca",
                SecondaryColorHex = "#4f46e5",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "Tally Prime ERP Classic (A4)",
                TemplateCode = "TPL_B2B_TALLY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#000000",
                SecondaryColorHex = "#334155",
                HeaderTitle = "TAX INVOICE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = true,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.TaxInvoice,
                TemplateName = "UdyogBill Signature B2B Universal Tax Invoice (A4)",
                TemplateCode = "TPL_UDYOGBILL_SIGNATURE_B2B",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = false,
                PrimaryColorHex = "#1e3a8a",
                SecondaryColorHex = "#2563eb",
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
                ShowDeclaration = false,
                DeclarationText = ""
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
                PrimaryColorHex = "#1e40af",
                SecondaryColorHex = "#2563eb",
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
                PrimaryColorHex = "#0284c7",
                SecondaryColorHex = "#0369a1",
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
                PrimaryColorHex = "#0e7490",
                SecondaryColorHex = "#0891b2",
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
                PrimaryColorHex = "#1d4ed8",
                SecondaryColorHex = "#2563eb",
                HeaderTitle = "PURCHASE ORDER",
                HeaderSubtitle = "Commercial Procurement Order",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = false,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
            },
            new()
            {
                TenantId = tenantId,
                DocumentType = PrintDocumentType.CreditNote,
                TemplateName = "GST Credit Note (A4)",
                TemplateCode = "TPL_CREDIT_NOTE_STATUTORY",
                PageSize = PageSizeFormat.A4_Portrait,
                IsDefault = true,
                PrimaryColorHex = "#b45309",
                SecondaryColorHex = "#d97706",
                HeaderTitle = "GST CREDIT NOTE",
                HeaderSubtitle = "Original for Recipient",
                ShowGstin = true,
                ShowDrugLicense = true,
                ShowFssai = true,
                ShowBankDetails = true,
                ShowUpiQr = false,
                ShowItemHsn = true,
                ShowBatchExpiry = true,
                ShowDeclaration = false,
                DeclarationText = ""
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
            : (!string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : "");
        var sellerLegalName = !string.IsNullOrWhiteSpace(tenant?.BusinessName) ? tenant.BusinessName : sellerName;

        var sellerAddress = !string.IsNullOrWhiteSpace(invoice?.Branch?.AddressLine1)
            ? $"{invoice.Branch.AddressLine1}{(string.IsNullOrWhiteSpace(invoice.Branch.City) ? "" : $", {invoice.Branch.City}")}{(string.IsNullOrWhiteSpace(invoice.Branch.State) ? "" : $", {invoice.Branch.State}")}{(string.IsNullOrWhiteSpace(invoice.Branch.Pincode) ? "" : $" - {invoice.Branch.Pincode}")}"
            : (!string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}{(string.IsNullOrWhiteSpace(tenant.AddressLine2) ? "" : $", {tenant.AddressLine2}")}{(string.IsNullOrWhiteSpace(tenant.City) ? "" : $", {tenant.City}")}{(string.IsNullOrWhiteSpace(tenant.State) ? "" : $", {tenant.State}")}{(string.IsNullOrWhiteSpace(tenant.Pincode) ? "" : $" - {tenant.Pincode}")}" : "");

        var sellerGstin = !string.IsNullOrWhiteSpace(invoice?.Branch?.GSTIN)
            ? invoice.Branch.GSTIN
            : (!string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "");
        var sellerDl = !string.IsNullOrWhiteSpace(tenant?.DrugLicenseNumber) ? tenant.DrugLicenseNumber : "";
        var sellerPhone = !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone) && !tenant.PrimaryPhone.Contains("9876543210") ? tenant.PrimaryPhone : "";
        var logoUrl = !string.IsNullOrEmpty(t.LogoUrl) ? t.LogoUrl : (!string.IsNullOrEmpty(tenant?.LogoUrl) ? tenant.LogoUrl : "");

        // Invoice Metadata
        var invNo = invoice?.InvoiceNumber ?? "";
        var invDate = invoice?.InvoiceDate.ToString("MM/dd/yyyy HH:mm") ?? DateTime.Now.ToString("MM/dd/yyyy HH:mm");
        var dueDate = invoice?.DueDate.HasValue == true ? invoice.DueDate.Value.ToString("MM/dd/yyyy HH:mm") : invDate;

        // Customer Details (BILL TO / SHIP TO)
        var custName = !string.IsNullOrWhiteSpace(invoice?.CustomerName) ? invoice.CustomerName : "";
        var custGstin = !string.IsNullOrWhiteSpace(invoice?.CustomerGSTIN) ? invoice.CustomerGSTIN : "";
        var custAddress = !string.IsNullOrWhiteSpace(invoice?.BillingAddress) ? invoice.BillingAddress : "";
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
        var totalAmount = invoice?.TotalAmount ?? 0m;
        var taxable = invoice?.TaxableAmount ?? (totalAmount > 0 ? (totalAmount / 1.18m) : 0m);
        var cgst = invoice?.CgstAmount ?? 0m;
        var sgst = invoice?.SgstAmount ?? 0m;
        var igst = invoice?.IgstAmount ?? 0m;
        var roundOff = invoice?.RoundOff ?? 0m;
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
    <style>
        @page {{ size: A4 portrait; margin: 4mm 6mm; }}
        html, body {{ margin: 0; padding: 0; background: #ffffff; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        .page-wrapper {{ width: 100%; max-width: 820px; min-height: 284mm; height: 284mm; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }}
        .pharma-grid-invoice {{ width: 100%; box-sizing: border-box; font-size: 9.5px; line-height: 1.35; display: flex; flex-direction: column; gap: 7px; }}
        table {{ border-collapse: collapse; }}
        th, td {{ box-sizing: border-box; }}
    </style>
</head>
<body>
<div class='page-wrapper'>
    <div class='pharma-grid-invoice'>

        <!-- 1. TOP HEADER BOX WITH ORANGE ACCENT BORDER -->
        <div style='display:flex; justify-content:space-between; align-items:flex-start; padding:10px 14px; border:1.5px solid #d97706; border-radius:2px; background:#ffffff;'>
            <div style='display:flex; gap:12px; align-items:center; max-width:62%;'>
                {(!string.IsNullOrEmpty(logoUrl) ? $"<img src='{logoUrl}' alt='Logo' style='max-height:65px; max-width:115px; object-fit:contain;' />" : "")}
                <div>
                    <div style='font-size:16px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;'>{sellerName}</div>
                    {(!string.IsNullOrEmpty(sellerAddress) ? $"<div style='font-size:9.5px; color:#334155; margin-top:2px;'>{sellerAddress}</div>" : "")}
                    {(!string.IsNullOrEmpty(sellerPhone) ? $"<div style='font-size:9.5px; color:#334155;'>Mobile: <strong>{sellerPhone}</strong></div>" : "")}
                    <div style='font-size:9.5px; color:#334155; margin-top:1px;'>
                        {(!string.IsNullOrEmpty(sellerGstin) ? $"GST NUM: <strong>{sellerGstin}</strong>" : "")}
                        {(!string.IsNullOrEmpty(sellerDl) ? $" | DRUG LICEN: <strong>{sellerDl}</strong>" : "")}
                    </div>
                </div>
            </div>

            <div style='text-align:right; min-width:34%;'>
                <div style='background: #c2410c; color:#ffffff; font-size:15px; font-weight:800; padding:6px 22px; border-radius:6px; display:inline-block; letter-spacing:0.4px;'>Tax Invoice</div>
                <div style='font-size:9.5px; margin-top:5px; line-height:1.4;'>
                    <div>Invoice No. <strong>{invNo}</strong></div>
                    <div>Date <strong>{invDate}</strong></div>
                    {(!string.IsNullOrEmpty(dueDate) ? $"<div>Due Date <strong>{dueDate}</strong></div>" : "")}
                </div>
                {(!string.IsNullOrEmpty(upiQr) ? $"<div style='margin-top:5px;'><img src='{upiQr}' alt='QR' style='width:68px; height:68px; border:1px solid #cbd5e1;' /></div>" : "")}
            </div>
        </div>

        <!-- 2. BILL TO / SHIP TO BOX -->
        <div style='display:grid; grid-template-columns: 1fr 1fr; border:1px solid #9ca3af; font-size:9.5px;'>
            <div style='padding:6px 10px; border-right:1px solid #9ca3af;'>
                <div style='font-weight:bold; color:#1e293b; text-transform:uppercase; font-size:8.5px; letter-spacing:0.4px;'>BILL TO (RECIPIENT)</div>
                <div style='font-weight:800; font-size:11px; color:#0f172a; margin-top:2px;'>{custName}</div>
                <div style='color:#334155; line-height:1.3;'>{custAddress}</div>
                {(!string.IsNullOrEmpty(custPhone) ? $"<div style='margin-top:2px;'>Mobile: <strong>{custPhone}</strong></div>" : "")}
                {(!string.IsNullOrEmpty(custGstin) ? $"<div>GST: <strong>{custGstin}</strong></div>" : "")}
                {(!string.IsNullOrEmpty(custDl) ? $"<div>DL NUM- <strong>{custDl}</strong></div>" : "")}
            </div>
            <div style='padding:6px 10px;'>
                <div style='font-weight:bold; color:#1e293b; text-transform:uppercase; font-size:8.5px; letter-spacing:0.4px;'>SHIP TO / DISPATCH</div>
                <div style='font-weight:700; font-size:10.5px; color:#0f172a; margin-top:2px; line-height:1.3;'>{shipAddress}</div>
                {(hasLogistics ? $@"
                <div style='margin-top:4px; font-size:8.5px; color:#475569; line-height:1.3;'>
                    {(!string.IsNullOrEmpty(transporter) ? $"<div>Transporter: <strong>{transporter}</strong></div>" : "")}
                    {(!string.IsNullOrEmpty(vehicleNo) ? $"<div>Vehicle No: <strong>{vehicleNo}</strong></div>" : "")}
                    {(!string.IsNullOrEmpty(lrNo) ? $"<div>LR No: <strong>{lrNo}</strong> {(string.IsNullOrEmpty(lrDate) ? "" : $"Dt: {lrDate}")}</div>" : "")}
                    {(!string.IsNullOrEmpty(eWayNo) ? $"<div>E-Way Bill: <strong>{eWayNo}</strong></div>" : "")}
                </div>" : "")}
            </div>
        </div>

        <!-- 3. PRODUCTS LINE ITEMS GRID TABLE -->
        <table style='width:100%; border-collapse:collapse; border:1px solid #9ca3af; font-size:9px;'>
            <thead>
                <tr style='background:#f1f5f9; border-bottom:1px solid #9ca3af; font-weight:bold; color:#0f172a; height:24px;'>
                    <th style='width:24px; border-right:1px solid #9ca3af; text-align:center;'>S.</th>
                    <th style='border-right:1px solid #9ca3af; text-align:left; padding:0 4px;'>Product</th>
                    <th style='width:46px; border-right:1px solid #9ca3af; text-align:center;'>Packing</th>
                    <th style='width:52px; border-right:1px solid #9ca3af; text-align:center;'>HSN/SAC</th>
                    <th style='width:48px; border-right:1px solid #9ca3af; text-align:center;'>Lot No</th>
                    <th style='width:40px; border-right:1px solid #9ca3af; text-align:center;'>Expiry</th>
                    <th style='width:36px; border-right:1px solid #9ca2af; text-align:right; padding:0 3px;'>Qty</th>
                    <th style='width:34px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>Free</th>
                    <th style='width:42px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>MRP</th>
                    <th style='width:34px; border-right:1px solid #9ca3af; text-align:center;'>Unit</th>
                    <th style='width:44px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>Rate</th>
                    <th style='width:34px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>Disc</th>
                    <th style='width:54px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>Taxable</th>
                    <th style='width:40px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>CGST %</th>
                    <th style='width:40px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>SGST %</th>
                    <th style='width:40px; border-right:1px solid #9ca3af; text-align:right; padding:0 3px;'>IGST %</th>
                    <th style='width:60px; text-align:right; padding:0 4px;'>Amount</th>
                </tr>
            </thead>
            <tbody>
                {itemsHtml}
            </tbody>
        </table>

        <!-- 4. MIDDLE SECTION: BANK DETAILS + QR + TOTALS TABLE -->
        <div style='display:flex; justify-content:space-between; align-items:flex-start; padding:6px 0; gap:8px;'>
            <!-- Left: Bank Details -->
            <div style='flex:1.2; font-size:9.5px; line-height:1.45; padding-left:2px;'>
                <div style='font-weight:bold; margin-bottom:2px;'>Bank Details:</div>
                {(!string.IsNullOrEmpty(bankName) ? $"<div><strong>Bank:</strong> {bankName}</div>" : "")}
                {(!string.IsNullOrEmpty(bankAccountName) ? $"<div><strong>Account Name:</strong> {bankAccountName}</div>" : "")}
                {(!string.IsNullOrEmpty(bankAcc) ? $"<div><strong>Account No:</strong> <span>{bankAcc}</span></div>" : "")}
                {(!string.IsNullOrEmpty(bankIfsc) ? $"<div><strong>IFSC:</strong> <span>{bankIfsc}</span></div>" : "")}
                {(!string.IsNullOrEmpty(bankBranch) ? $"<div><strong>Branch:</strong> {bankBranch}</div>" : "")}
            </div>

            <!-- Center: UPI QR Code -->
            <div style='width:130px; text-align:center;'>
                {(!string.IsNullOrEmpty(upiQr) ? $@"
                <div style='display:inline-block; border:1px solid #9ca3af; padding:4px 6px 4px 6px; background:#ffffff;'>
                    <img src='{upiQr}' alt='Scan to Pay' style='width:88px; height:88px; display:block; margin:0 auto;' />
                    <div style='font-size:7.5px; color:#475569; margin-top:2px; white-space:nowrap;'>Scan to Pay (₹{totalAmount:N2})</div>
                </div>
                " : "")}
            </div>

            <!-- Right: Totals Table -->
            <div style='width:290px;'>
                <table style='width:100%; border-collapse:collapse; border:1px solid #9ca3af; font-size:10px;'>
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca3af;'>Subtotal:</td>
                        <td style='padding:3px 8px; text-align:right; font-weight:bold;'>₹ {taxable:N2}</td>
                    </tr>
                    {(cgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca3af;'>CGST</td>
                        <td style='padding:3px 8px; text-align:right;'>(+) ₹ {cgst:N2}</td>
                    </tr>" : "")}
                    {(sgst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca3af;'>SGST / UTGST</td>
                        <td style='padding:3px 8px; text-align:right;'>(+) ₹ {sgst:N2}</td>
                    </tr>" : "")}
                    {(igst > 0 ? $@"
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca3af;'>IGST</td>
                        <td style='padding:3px 8px; text-align:right;'>(+) ₹ {igst:N2}</td>
                    </tr>" : "")}
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:bold; border-right:1px solid #9ca3af;'>Total GST</td>
                        <td style='padding:3px 8px; text-align:right; font-weight:bold;'>(+) ₹ {(cgst + sgst + igst):N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #9ca3af;'>
                        <td style='padding:3px 8px; font-weight:600; border-right:1px solid #9ca3af;'>Round Off:</td>
                        <td style='padding:3px 8px; text-align:right;'>₹ {roundOff:N2}</td>
                    </tr>
                    <tr style='border-bottom:1px solid #9ca3af; font-size:11.5px; font-weight:900; background:#f1f5f9;'>
                        <td style='padding:4px 8px; border-right:1px solid #9ca3af;'>Total:</td>
                        <td style='padding:4px 8px; text-align:right;'>₹ {totalAmount:N2}</td>
                    </tr>
                </table>
                <div style='font-size:8.5px; text-align:center; padding:3px; color:#475569; font-style:italic;'>({words})</div>
            </div>
        </div>

        <!-- 5. GST / HSN SUMMARY -->
        <div>
            <div style='font-size:9.5px; font-weight:bold; color:#0f172a; text-transform:uppercase; margin-bottom:3px;'>GST / HSN SUMMARY</div>
            <table style='width:100%; border-collapse:collapse; border:1px solid #9ca3af; font-size:9px;'>
                <thead>
                    <tr style='background:#f1f5f9; border-bottom:1px solid #9ca3af; font-weight:bold; color:#0f172a;'>
                        <th style='padding:3px 6px; text-align:center; border-right:1px solid #9ca3af;'>HSN/SAC</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca3af;'>Taxable</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca3af;'>CGST %</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca3af;'>CGST Amt</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca3af;'>SGST %</th>
                        <th style='padding:3px 6px; text-align:right; border-right:1px solid #9ca3af;'>SGST Amt</th>
                        <th style='padding:3px 6px; text-align:right;'>Total Tax</th>
                    </tr>
                </thead>
                <tbody>
                    {hsnRowsHtml}
                    {hsnTotalsHtml}
                </tbody>
            </table>
        </div>

        <!-- 6. TERMS AND CONDITIONS BOX -->
        <div style='border:1px solid #9ca3af; padding:6px 10px; font-size:8.5px; line-height:1.45; min-height:80px;'>
            <div style='font-weight:bold; margin-bottom:4px;'>Terms and Conditions:</div>
            {(!string.IsNullOrWhiteSpace(t.DeclarationText) && t.ShowDeclaration ? $"<div>{t.DeclarationText}</div>" : $@"
            <ul style='margin:0; padding-left:16px;'>
                <li><strong>Payment:</strong> Due within 45 days. <strong>18% p.a.</strong> interest applies to overdue amounts.</li>
                <li><strong>Claims:</strong> Report shortages or damages within <strong>24 hours</strong> of delivery.</li>
                <li><strong>Returns:</strong> Goods sold are non-returnable except for manufacturing defects or recalls.</li>
                <li><strong>Storage:</strong> No liability for quality loss due to improper storage after delivery.</li>
                <li><strong>Regulatory:</strong> Sold under <strong>Drugs & Cosmetics Act</strong>; verify Batch/Expiry upon receipt.</li>
                <li><strong>Jurisdiction:</strong> Subject to courts in {termsCity} only.</li>
            </ul>")}
        </div>

    </div>

    <!-- 7. FOOTER SECTION -->
    <div style='margin-top:auto;'>
        <div style='border-top:1px dashed #9ca3af; margin-bottom:8px;'></div>
        <div style='display:flex; justify-content:space-between; align-items:flex-end; font-size:8.5px; color:#475569; padding:0 2px 2px 2px;'>
            <div>
                <div>This is a computer generated invoice and does not require signature.</div>
                <div style='margin-top:2px; font-weight:600;'>https://www.udyogbill.com/sells</div>
            </div>
            <div style='text-align:right;'>
                <div style='font-weight:bold; color:#0f172a;'>Authorised Signatory</div>
                <div style='font-size:8px; color:#64748b; margin-top:2px;'>1/1</div>
            </div>
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
            int emptyHeight = Math.Max(70, 480 - (invoice.Items.Count * 25));
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
            itemsSb.Append(@"
            <tr style='height:455px;'>
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

            hsnTotalsHtml = @"
            <tr style='font-weight:bold; font-size:9.5px; border-top:1px solid #9ca2af; background:#e4e7eb;'>
                <td style='padding:3px 6px; text-align:center; border-right:1px solid #9ca2af;'>TOTAL</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>0.00</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>0.00</td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'></td>
                <td style='padding:3px 6px; text-align:right; border-right:1px solid #9ca2af;'>0.00</td>
                <td style='padding:3px 6px; text-align:right;'>0.00</td>
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
