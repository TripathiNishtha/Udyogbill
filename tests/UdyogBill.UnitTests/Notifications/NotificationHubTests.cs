using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Notifications;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Notifications;

public class NotificationHubTests
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
    public async Task GetGatewayConfig_ShouldSeedOrReturnDefaultConfig()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new NotificationHubService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetGatewayConfigAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Data!.IsWhatsAppEnabled);
        Assert.True(result.Data.IsSmsEnabled);
        Assert.Equal("Fast2SMS", result.Data.SmsProvider);
        Assert.Equal("UDYOGB", result.Data.SmsSenderId);
    }

    [Fact]
    public async Task GetTemplates_ShouldSeedStandardTemplates()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new NotificationHubService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetTemplatesAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Data!.Count >= 4);
        Assert.Contains(result.Data, t => t.TemplateCode == "WA_INV_CREATED");
        Assert.Contains(result.Data, t => t.TemplateCode == "SMS_PAY_RECEIVED");
    }

    [Fact]
    public async Task RenderPreview_ShouldSubstituteVariables()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new NotificationHubService(context, tenantContext, userContext, auditService);

        var request = new RenderTemplatePreviewRequest(
            TemplateBody: "Hello {{CustomerName}}, your bill is ₹{{TotalAmount}} from {{StoreName}}.",
            Variables: new Dictionary<string, string>
            {
                { "CustomerName", "Amit Kumar" },
                { "TotalAmount", "1250.00" },
                { "StoreName", "City Pharma" }
            }
        );

        // Act
        var result = await service.RenderPreviewAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Hello Amit Kumar, your bill is ₹1250.00 from City Pharma.", result.Data!.RenderedText);
    }

    [Fact]
    public async Task DispatchNotification_ShouldLogSentMessage()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new NotificationHubService(context, tenantContext, userContext, auditService);

        var request = new DispatchNotificationRequest(
            Channel: NotificationChannel.WhatsApp,
            TriggerType: NotificationTriggerType.InvoiceCreated,
            RecipientTarget: "+919876543210",
            RecipientName: "Amit Kumar",
            CustomBody: "Your invoice #INV-001 has been generated for ₹1500."
        );

        // Act
        var result = await service.DispatchNotificationAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(NotificationDeliveryStatus.Delivered, result.Data!.Status);

        var log = await context.NotificationDispatchLogs.FirstOrDefaultAsync(l => l.RecipientTarget == "+919876543210");
        Assert.NotNull(log);
        Assert.Equal("Your invoice #INV-001 has been generated for ₹1500.", log.RenderedBody);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ShouldGenerateSecretAndSave()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new NotificationHubService(context, tenantContext, userContext, auditService);

        var request = new CreateWebhookEndpointRequest(
            EndpointUrl: "https://api.myerp.com/webhooks/udyogbill",
            Description: "Production ERP sync hook",
            SubscribedEvents: new List<string> { "invoice.created", "payment.received" }
        );

        // Act
        var result = await service.CreateWebhookEndpointAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var webhook = await context.TenantWebhookEndpoints.FirstOrDefaultAsync(w => w.Id == result.Data);
        Assert.NotNull(webhook);
        Assert.StartsWith("whsec_", webhook.SecretKey);
        Assert.True(webhook.IsActive);
    }
}
