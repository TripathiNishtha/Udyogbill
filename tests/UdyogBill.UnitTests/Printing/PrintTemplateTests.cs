using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Printing;

public class PrintTemplateTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupContext()
    {
        var tenantId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-TEST-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "admin@citypharma.com"
        };

        var context = new AppDbContext(options, tenantContext);

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task GetTemplates_ShouldSeedDefaultTemplates()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetTemplatesAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Data!.Count >= 3);
        Assert.Contains(result.Data, t => t.TemplateCode == "TPL_UDYOGBILL_SIGNATURE_B2B");
        Assert.Contains(result.Data, t => t.TemplateCode == "TPL_POS_THERMAL_80MM");
    }

    [Fact]
    public async Task CreateTemplate_ShouldSaveCustomTemplate()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        var request = new CreatePrintTemplateRequest
        {
            DocumentType = PrintDocumentType.TaxInvoice,
            TemplateName = "Hindi Classical A4 Invoice",
            TemplateCode = "TPL_A4_HINDI",
            PageSize = PageSizeFormat.A4_Portrait,
            PrimaryColorHex = "#dc2626",
            HeaderTitle = "कर इनवॉइस / बिल",
            LanguageCode = "hi",
            CustomLabelsJson = "{\"Total\":\"कुल योग\",\"Customer\":\"ग्राहक\"}"
        };

        // Act
        var result = await service.CreateTemplateAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var t = await context.PrintTemplates.FirstOrDefaultAsync(x => x.Id == result.Data);
        Assert.NotNull(t);
        Assert.Equal("Hindi Classical A4 Invoice", t.TemplateName);
        Assert.Equal("#dc2626", t.PrimaryColorHex);
        Assert.Equal("hi", t.LanguageCode);
    }

    [Fact]
    public async Task SetDefaultTemplate_ShouldMakeOnlyTargetDefault()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        await service.GetTemplatesAsync(); // Seed initial defaults

        var t1 = new PrintTemplate
        {
            TenantId = tenantId,
            DocumentType = PrintDocumentType.TaxInvoice,
            TemplateName = "Custom A4",
            TemplateCode = "TPL_CUSTOM_A4",
            IsDefault = false
        };
        context.PrintTemplates.Add(t1);
        await context.SaveChangesAsync();

        // Act
        var result = await service.SetDefaultTemplateAsync(t1.Id);

        // Assert
        Assert.True(result.IsSuccess);
        var activeDefaults = await context.PrintTemplates
            .Where(x => x.TenantId == tenantId && x.DocumentType == PrintDocumentType.TaxInvoice && x.IsDefault)
            .ToListAsync();

        Assert.Single(activeDefaults);
        Assert.Equal(t1.Id, activeDefaults[0].Id);
    }

    [Fact]
    public async Task RenderPreview_ShouldGenerateStylizedHtmlWithInvoiceData()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-TEST-001",
            BusinessName = "City Pharma Lifesciences Ltd",
            TradeName = "City Pharma",
            IndustryId = Guid.NewGuid()
        };
        context.Tenants.Add(tenant);

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchName = "Main Branch",
            BranchCode = "MAIN"
        };
        context.TenantBranches.Add(branch);

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            BranchId = branch.Id,
            InvoiceNumber = "INV-2026-9901",
            CustomerName = "Max Super Speciality Hospital",
            TotalAmount = 24500m,
            SubTotal = 20762.71m
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var templates = await service.GetTemplatesAsync();
        var defaultTpl = templates.Data!.First(t => t.DocumentType == PrintDocumentType.TaxInvoice);

        var request = new RenderPrintPreviewRequest
        {
            TemplateId = defaultTpl.Id,
            InvoiceId = invoice.Id
        };

        // Act
        var result = await service.RenderPreviewAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Contains("INV-2026-9901", result.Data!.RenderedHtml);
        Assert.Contains("Max Super Speciality Hospital", result.Data.RenderedHtml);
        Assert.Contains("City Pharma Lifesciences Ltd", result.Data.RenderedHtml);
        Assert.Contains("₹24,500.00", result.Data.RenderedHtml);
    }

    [Fact]
    public async Task UniversalAdaptiveEngine_PharmaDetailsRetainedAcrossAllInvoiceFormats()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-PHARMA-001",
            BusinessName = "MedLife Healthcare Distributors",
            TradeName = "MedLife Pharma",
            ActiveIndustryModule = "PHARMA",
            DrugLicenseNumber = "DL-20B-998877",
            FSSAINumber = "12345678901234"
        };
        context.Tenants.Add(tenant);

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchName = "Central Warehouse",
            BranchCode = "CWH",
            GSTIN = "09AABCM1234F1Z5"
        };
        context.TenantBranches.Add(branch);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branch.Id,
            InvoiceNumber = "INV-PHARMA-2026",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Apollo Chemist & Clinic",
            CustomerGSTIN = "09AABCA9876C1Z1",
            BillingAddress = "Civil Lines, Lucknow, UP",
            TotalAmount = 2240m,
            SubTotal = 2000m,
            TaxableAmount = 2000m,
            CgstAmount = 120m,
            SgstAmount = 120m,
            Items = new List<SalesInvoiceItem>
            {
                new SalesInvoiceItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ItemName = "Amoxicillin & Clavulanate 625mg",
                    ItemSku = "AMX-625",
                    HsnCode = "300490",
                    BatchNumber = "BATCH-XY99",
                    ExpiryDate = new DateTime(2028, 12, 1),
                    Quantity = 20,
                    UnitPrice = 100m,
                    Mrp = 150m,
                    TaxableAmount = 2000m,
                    GstRate = 12m,
                    CgstAmount = 120m,
                    SgstAmount = 120m,
                    TotalAmount = 2240m,
                    UomCode = "Strip",
                    AttributesJson = "{\"pack\":\"10x1x10\",\"freeQty\":2}"
                }
            }
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var templatesResult = await service.GetTemplatesAsync();
        Assert.True(templatesResult.IsSuccess);

        // Test across ALL seeded invoice formats to guarantee zero regression
        var templateCodesToTest = new[]
        {
            "TPL_ENTERPRISE_PREMIUM_DYNAMIC", // Sovereign Green Flagship
            "TPL_B2B_TALLY",                  // Tally Prime Classic
            "TPL_MARG_HALF_PAGE_A5",          // Marg ERP Style
            "TPL_D2C_MYBILLBOOK",             // MyBillBook Modern
            "TPL_UDYOGBILL_SIGNATURE_B2B",     // Signature B2B
            "TPL_PHARMA_PRO_TAX_INVOICE",     // Pharma Pro Statutory
            "TPL_PHARMA_RX_CHEMIST",          // Retail Chemist Rx
            "TPL_CASH_MEMO_HALF_PAGE_A5",     // Cash Memo Half-Page
            "TPL_POS_THERMAL_80MM"            // Thermal 80mm POS
        };

        foreach (var code in templateCodesToTest)
        {
            var tpl = templatesResult.Data!.FirstOrDefault(t => t.TemplateCode == code);
            Assert.NotNull(tpl);

            var renderReq = new RenderPrintPreviewRequest
            {
                TemplateId = tpl.Id,
                InvoiceId = invoice.Id
            };

            var renderResult = await service.RenderPreviewAsync(renderReq);
            Assert.True(renderResult.IsSuccess, $"Failed rendering template {code}: {renderResult.ErrorMessage}");
            var html = renderResult.Data!.RenderedHtml;

            // Statutory Pharma Data Must Be Present in All Formats
            Assert.Contains("BATCH-XY99", html);
            Assert.Contains("Amoxicillin", html);
            Assert.Contains("DL-20B-998877", html);
            Assert.Contains("12345678901234", html);
            Assert.Contains("Apollo Chemist", html);
        }
    }

    [Fact]
    public async Task UniversalAdaptiveEngine_NonPharmaVerticalsIsolatedWithoutRegression()
    {
        // Arrange: Garments Tenant
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-GARMENTS-001",
            BusinessName = "Zara Fashion Hub",
            TradeName = "Zara Fashion",
            ActiveIndustryModule = "GARMENTS"
        };
        context.Tenants.Add(tenant);

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchName = "Retail Mall Outlet",
            BranchCode = "RMO",
            GSTIN = "07AABCG5555G1Z9"
        };
        context.TenantBranches.Add(branch);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branch.Id,
            InvoiceNumber = "INV-FASHION-001",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Rohit Verma",
            TotalAmount = 2499m,
            SubTotal = 2231.25m,
            TaxableAmount = 2231.25m,
            CgstAmount = 133.88m,
            SgstAmount = 133.88m,
            Items = new List<SalesInvoiceItem>
            {
                new SalesInvoiceItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ItemName = "Slim Fit Cotton Chino",
                    Quantity = 1,
                    UnitPrice = 2231.25m,
                    TaxableAmount = 2231.25m,
                    GstRate = 12m,
                    TotalAmount = 2499m,
                    AttributesJson = "{\"size\":\"32\",\"color\":\"Navy Blue\",\"styleCode\":\"ST-CHINO-99\"}"
                }
            }
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var templatesResult = await service.GetTemplatesAsync();
        Assert.True(templatesResult.IsSuccess);

        var sovereignTpl = templatesResult.Data!.First(t => t.TemplateCode == "TPL_ENTERPRISE_PREMIUM_DYNAMIC");
        var renderResult = await service.RenderPreviewAsync(new RenderPrintPreviewRequest
        {
            TemplateId = sovereignTpl.Id,
            InvoiceId = invoice.Id
        });

        Assert.True(renderResult.IsSuccess);
        var html = renderResult.Data!.RenderedHtml;

        // Garments matrix data MUST be present
        Assert.Contains("Slim Fit Cotton Chino", html);
        Assert.Contains("32", html);
        Assert.Contains("Navy Blue", html);

        // Pharma statutory headers MUST NOT be forced onto garments
        Assert.DoesNotContain("<th style='padding:5px 4px; width:46px; text-align:center;'>EXPIRY</th>", html);
    }

    [Fact]
    public async Task UniversalAdaptiveEngine_AutoPartsVertical_RendersFitmentAndVehicleDetails()
    {
        // Arrange: AutoParts Tenant
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new PrintTemplateService(context, tenantContext, userContext, auditService);

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-AUTOPARTS-001",
            BusinessName = "National Auto Spares",
            TradeName = "National Spares",
            ActiveIndustryModule = "AUTOPARTS"
        };
        context.Tenants.Add(tenant);

        var branch = new TenantBranch
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchName = "Main Workshop Depot",
            BranchCode = "MWD",
            GSTIN = "09AABCN1234E1Z4"
        };
        context.TenantBranches.Add(branch);

        var invoice = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BranchId = branch.Id,
            InvoiceNumber = "INV-AUTO-2026",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Rakesh Sharma",
            VehicleNumber = "UP 32 AB 1234",
            TotalAmount = 3500m,
            SubTotal = 2966.10m,
            TaxableAmount = 2966.10m,
            CgstAmount = 266.95m,
            SgstAmount = 266.95m,
            AttributesJson = "{\"vehicleModel\":\"Swift Dzire VXI\",\"mechanicName\":\"Munna Mistri\",\"odometerKm\":\"45000\"}",
            Items = new List<SalesInvoiceItem>
            {
                new SalesInvoiceItem
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ItemName = "Front Brake Pad Set",
                    Quantity = 1,
                    UnitPrice = 2966.10m,
                    TaxableAmount = 2966.10m,
                    GstRate = 18m,
                    TotalAmount = 3500m,
                    AttributesJson = "{\"oemPartNumber\":\"OEM-BRK-990\",\"applicableVehicles\":\"Swift Dzire 2020-2024\"}"
                }
            }
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var templatesResult = await service.GetTemplatesAsync();
        Assert.True(templatesResult.IsSuccess);

        // Render on Sovereign Green and Thermal POS
        var sovereignTpl = templatesResult.Data!.First(t => t.TemplateCode == "TPL_ENTERPRISE_PREMIUM_DYNAMIC");
        var sovereignRender = await service.RenderPreviewAsync(new RenderPrintPreviewRequest
        {
            TemplateId = sovereignTpl.Id,
            InvoiceId = invoice.Id
        });
        Assert.True(sovereignRender.IsSuccess);
        var sHtml = sovereignRender.Data!.RenderedHtml;

        Assert.Contains("UP 32 AB 1234", sHtml);
        Assert.Contains("Swift Dzire VXI", sHtml);
        Assert.Contains("Munna Mistri", sHtml);
        Assert.Contains("OEM-BRK-990", sHtml);
        Assert.Contains("Swift Dzire 2020-2024", sHtml);

        var thermalTpl = templatesResult.Data!.First(t => t.TemplateCode == "TPL_POS_THERMAL_80MM");
        var thermalRender = await service.RenderPreviewAsync(new RenderPrintPreviewRequest
        {
            TemplateId = thermalTpl.Id,
            InvoiceId = invoice.Id
        });
        Assert.True(thermalRender.IsSuccess);
        var tHtml = thermalRender.Data!.RenderedHtml;

        Assert.Contains("UP 32 AB 1234", tHtml);
        Assert.Contains("Munna Mistri", tHtml);
        Assert.Contains("OEM-BRK-990", tHtml);
    }
}
