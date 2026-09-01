using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Auditing;

public class TenantAuditTests
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
            Email = "admin@testpharma.com"
        };

        var context = new AppDbContext(options, tenantContext);

        // Seed some audit logs for this tenant and another tenant
        var otherTenantId = Guid.NewGuid();

        context.AuditLogs.AddRange(
            new AuditLog
            {
                TenantId = tenantId,
                UserId = userContext.UserId,
                UserEmail = "admin@testpharma.com",
                Action = AuditActionType.Create,
                ActionName = "CreateSalesInvoice",
                EntityName = "SalesInvoice",
                EntityId = "INV-2026-001",
                TimestampUtc = DateTimeOffset.UtcNow.AddHours(-2),
                IpAddress = "192.168.1.100"
            },
            new AuditLog
            {
                TenantId = tenantId,
                UserId = userContext.UserId,
                UserEmail = "admin@testpharma.com",
                Action = AuditActionType.Update,
                ActionName = "UpdateBusinessProfile",
                EntityName = "Tenant",
                EntityId = tenantId.ToString(),
                TimestampUtc = DateTimeOffset.UtcNow.AddMinutes(-30),
                IpAddress = "192.168.1.100"
            },
            new AuditLog
            {
                TenantId = tenantId,
                UserId = Guid.NewGuid(),
                UserEmail = "staff@testpharma.com",
                Action = AuditActionType.Create,
                ActionName = "CreatePurchaseBill",
                EntityName = "PurchaseBill",
                EntityId = "BILL-001",
                TimestampUtc = DateTimeOffset.UtcNow.AddDays(-2),
                IpAddress = "192.168.1.101"
            },
            // Other tenant log (should NEVER be returned)
            new AuditLog
            {
                TenantId = otherTenantId,
                UserId = Guid.NewGuid(),
                UserEmail = "other@anothertenant.com",
                Action = AuditActionType.Create,
                ActionName = "CreateSalesInvoice",
                EntityName = "SalesInvoice",
                EntityId = "INV-OTHER-001",
                TimestampUtc = DateTimeOffset.UtcNow,
                IpAddress = "10.0.0.1"
            }
        );

        context.SaveChanges();

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task GetTenantAuditLogs_ShouldReturnOnlyCurrentTenantLogs()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var service = new TenantAuditService(context, tenantContext, userContext);

        // Act
        var request = new TenantAuditQueryRequest();
        var result = await service.GetTenantAuditLogsAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Data!.TotalCount);
        Assert.All(result.Data.Items, item => Assert.Equal(tenantId, item.TenantId));
    }

    [Fact]
    public async Task GetTenantAuditLogs_WithEntityFilter_ShouldFilterCorrectly()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var service = new TenantAuditService(context, tenantContext, userContext);

        // Act
        var request = new TenantAuditQueryRequest(EntityName: "SalesInvoice");
        var result = await service.GetTenantAuditLogsAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(result.Data!.Items);
        Assert.Equal("CreateSalesInvoice", result.Data.Items[0].ActionName);
    }

    [Fact]
    public async Task GetTenantAuditSummary_ShouldCalculateAccurateMetrics()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var service = new TenantAuditService(context, tenantContext, userContext);

        // Act
        var result = await service.GetTenantAuditSummaryAsync();

        // Assert
        Assert.True(result.IsSuccess);
        var summary = result.Data!;
        Assert.Equal(3, summary.TotalLogs);
        Assert.Equal(2, summary.LogsToday); // 2 created today (hours & minutes ago)
        Assert.Equal(3, summary.LogsThisWeek);
        Assert.NotEmpty(summary.TopActiveUsers);
        Assert.NotEmpty(summary.TopEntities);
    }

    [Fact]
    public async Task ExportAuditLogsCsv_ShouldGenerateValidCsv()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var service = new TenantAuditService(context, tenantContext, userContext);

        // Act
        var request = new TenantAuditQueryRequest();
        var result = await service.ExportAuditLogsCsvAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("text/csv", result.Data.ContentType);
        Assert.True(result.Data.FileBytes.Length > 0);

        var csvText = System.Text.Encoding.UTF8.GetString(result.Data.FileBytes);
        Assert.Contains("Timestamp (UTC)", csvText);
        Assert.Contains("CreateSalesInvoice", csvText);
        Assert.Contains("admin@testpharma.com", csvText);
        Assert.DoesNotContain("other@anothertenant.com", csvText);
    }
}
