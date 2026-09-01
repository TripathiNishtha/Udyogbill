using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Domain.Entities.Sales;
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
        Assert.Contains(result.Data, t => t.TemplateCode == "TPL_A4_MODERN_GST");
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

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-9901",
            CustomerName = "Max Super Speciality Hospital",
            TotalAmount = 24500m,
            SubTotal = 20762.71m
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var templates = await service.GetTemplatesAsync();
        var defaultTpl = templates.Data!.First();

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
}
