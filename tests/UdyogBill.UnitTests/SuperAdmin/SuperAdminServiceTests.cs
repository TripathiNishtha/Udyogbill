using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using Xunit;

namespace UdyogBill.UnitTests.SuperAdmin;

public class MockAuditService : IAuditService
{
    public List<AuditLog> LoggedAudits { get; } = new();
    public Task LogAsync(AuditLog log, CancellationToken cancellationToken = default)
    {
        LoggedAudits.Add(log);
        return Task.CompletedTask;
    }
}

public class MockCurrentUserContext : ICurrentUserContext
{
    public Guid? UserId { get; set; } = Guid.NewGuid();
    public string? Email { get; set; } = "admin@udyogbill.com";
    public string? FullName { get; set; } = "Platform Super Admin";
    public Guid? TenantId { get; set; } = null;
    public bool IsAuthenticated { get; set; } = true;
    public bool IsSuperAdmin { get; set; } = true;
    public bool IsTenantAdmin { get; set; } = false;
    public IReadOnlyList<string> Roles { get; set; } = new List<string> { "SuperAdmin" };
    public IReadOnlyList<string> Permissions { get; set; } = new List<string> { "*" };
    public bool HasPermission(string permission) => true;
    public bool HasRole(string role) => Roles.Contains(role);
}

public class SuperAdminServiceTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext();
        return new AppDbContext(options, tenantContext);
    }

    [Fact]
    public async Task UpdateTenantStatus_WhenSuspended_ShouldDeactivateTenantAndRecordAudit()
    {
        // Arrange
        using var context = CreateDbContext();
        var userContext = new MockCurrentUserContext();
        var auditService = new MockAuditService();
        var service = new SuperAdminService(context, userContext, auditService);

        var industry = new Industry { Id = Guid.NewGuid(), Code = "RETAIL", Name = "Retail" };
        context.Industries.Add(industry);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Code = "TNT-RETAIL-1001",
            BusinessName = "Metro Retailers",
            TradeName = "Metro",
            IndustryId = industry.Id,
            Status = TenantStatus.Active,
            IsActive = true,
            AdminEmail = "admin@metro.com"
        };
        context.Tenants.Add(tenant);
        await context.SaveChangesAsync();

        // Act
        var request = new UpdateTenantStatusRequest(TenantStatus.Suspended, "Payment overdue");
        var result = await service.UpdateTenantStatusAsync(tenant.Id, request, "127.0.0.1");

        // Assert
        Assert.True(result.IsSuccess);
        var updated = await context.Tenants.FindAsync(tenant.Id);
        Assert.NotNull(updated);
        Assert.Equal(TenantStatus.Suspended, updated.Status);
        Assert.False(updated.IsActive);
        Assert.NotNull(updated.SuspendedAtUtc);
        Assert.Equal("Payment overdue", updated.SuspensionReason);
        Assert.Single(auditService.LoggedAudits);
        Assert.Equal(AuditActionType.TenantSuspension, auditService.LoggedAudits[0].Action);
    }

    [Fact]
    public async Task CreateIndustry_WithUniqueCode_ShouldSucceed()
    {
        // Arrange
        using var context = CreateDbContext();
        var userContext = new MockCurrentUserContext();
        var auditService = new MockAuditService();
        var service = new SuperAdminService(context, userContext, auditService);

        // Act
        var request = new CreateIndustryRequest("OPTICAL", "Optical & Eyewear", "Eyewear, optical frames, lens prescriptions", "glasses", 15);
        var result = await service.CreateIndustryAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var created = await context.Industries.FindAsync(result.Data);
        Assert.NotNull(created);
        Assert.Equal("OPTICAL", created.Code);
        Assert.Equal("Optical & Eyewear", created.Name);
    }

    [Fact]
    public async Task CreateIndustry_WithDuplicateCode_ShouldReturnFailure()
    {
        // Arrange
        using var context = CreateDbContext();
        var userContext = new MockCurrentUserContext();
        var auditService = new MockAuditService();
        var service = new SuperAdminService(context, userContext, auditService);

        var existing = new Industry { Id = Guid.NewGuid(), Code = "PHARMA", Name = "Pharmaceuticals" };
        context.Industries.Add(existing);
        await context.SaveChangesAsync();

        // Act
        var request = new CreateIndustryRequest("PHARMA", "Duplicate Pharma", "Duplicate", "pill", 1);
        var result = await service.CreateIndustryAsync(request);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("CODE_ALREADY_EXISTS", result.ErrorCode);
    }

    [Fact]
    public async Task CreatePlan_WithEntitlements_ShouldPersistEntitlementsCorrectly()
    {
        // Arrange
        using var context = CreateDbContext();
        var userContext = new MockCurrentUserContext();
        var auditService = new MockAuditService();
        var service = new SuperAdminService(context, userContext, auditService);

        var feat1 = Guid.NewGuid();
        var feat2 = Guid.NewGuid();

        // Act
        var request = new CreatePlanRequest(
            "CUSTOM_ENTERPRISE",
            "Custom Enterprise",
            "Dedicated high-volume tier",
            BillingCycle.Monthly,
            14999m,
            0m,
            14,
            100,
            25,
            50,
            100000,
            100000,
            true,
            new List<Guid> { feat1, feat2 }
        );
        var result = await service.CreatePlanAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var plan = await context.Plans.Include(p => p.Entitlements).FirstOrDefaultAsync(p => p.Id == result.Data);
        Assert.NotNull(plan);
        Assert.Equal("CUSTOM_ENTERPRISE", plan.Code);
        Assert.Equal(2, plan.Entitlements.Count);
    }

    [Fact]
    public async Task GetPlatformStats_ShouldCalculateMetricsAccurately()
    {
        // Arrange
        using var context = CreateDbContext();
        var userContext = new MockCurrentUserContext();
        var auditService = new MockAuditService();
        var service = new SuperAdminService(context, userContext, auditService);

        var ind = new Industry { Id = Guid.NewGuid(), Code = "FMCG", Name = "Fast Moving Consumer Goods" };
        context.Industries.Add(ind);

        var plan = new Plan { Id = Guid.NewGuid(), Code = "PRO", Name = "Pro", Price = 2499m, IsActive = true };
        context.Plans.Add(plan);

        var t1 = new Tenant { Id = Guid.NewGuid(), Code = "T1", BusinessName = "B1", TradeName = "T1", IndustryId = ind.Id, Status = TenantStatus.Active, IsActive = true, AdminEmail = "b1@test.com" };
        var t2 = new Tenant { Id = Guid.NewGuid(), Code = "T2", BusinessName = "B2", TradeName = "T2", IndustryId = ind.Id, Status = TenantStatus.Trial, IsActive = true, AdminEmail = "b2@test.com" };
        var t3 = new Tenant { Id = Guid.NewGuid(), Code = "T3", BusinessName = "B3", TradeName = "T3", IndustryId = ind.Id, Status = TenantStatus.Suspended, IsActive = false, AdminEmail = "b3@test.com" };
        context.Tenants.AddRange(t1, t2, t3);

        var sub = new TenantSubscription { TenantId = t1.Id, PlanId = plan.Id, Status = SubscriptionStatus.Active, StartsAtUtc = DateTimeOffset.UtcNow, EndsAtUtc = DateTimeOffset.UtcNow.AddMonths(1) };
        context.TenantSubscriptions.Add(sub);

        await context.SaveChangesAsync();

        // Act
        var result = await service.GetPlatformStatsAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(3, result.Data.TotalTenants);
        Assert.Equal(1, result.Data.ActiveTenants);
        Assert.Equal(1, result.Data.TrialTenants);
        Assert.Equal(1, result.Data.SuspendedTenants);
        Assert.Equal(2499m, result.Data.EstimatedMrr);
        Assert.Single(result.Data.IndustryDistribution);
        Assert.Equal(3, result.Data.IndustryDistribution[0].TenantCount);
    }
}

public class MockTenantContext : ITenantContext
{
    public Guid TenantId { get; set; } = Guid.Empty;
    public string? TenantCode { get; set; }
    public bool HasTenant => TenantId != Guid.Empty;
    public bool IsSuperAdmin => true;
    public void SetTenant(Guid tenantId, string? tenantCode = null, bool isSuperAdmin = false)
    {
        TenantId = tenantId;
        TenantCode = tenantCode;
    }
}
