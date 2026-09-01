using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Infrastructure.Services;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Tenancy;

public class TenantHierarchyTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupTenantContext()
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
            Roles = new List<string> { "TenantAdmin" }
        };

        var context = new AppDbContext(options, tenantContext);

        // Seed Industry, Plan, Tenant & Subscription
        var industry = new Industry { Id = Guid.NewGuid(), Code = "PHARMA", Name = "Pharmaceuticals" };
        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            Code = "STARTER",
            Name = "Starter Plan",
            MaxBranches = 1,
            MaxWarehouses = 2,
            MaxUsers = 2,
            IsActive = true
        };

        var tenant = new Tenant
        {
            Id = tenantId,
            Code = "TNT-TEST-001",
            BusinessName = "Test Pharmacy",
            TradeName = "Test Meds",
            IndustryId = industry.Id,
            Status = TenantStatus.Active,
            IsActive = true,
            AdminEmail = "admin@testpharma.com"
        };

        var config = new TenantIndustryConfig
        {
            TenantId = tenantId,
            IndustryId = industry.Id,
            EnableBatchTracking = true,
            EnableExpiryTracking = true
        };

        var sub = new TenantSubscription
        {
            TenantId = tenantId,
            PlanId = plan.Id,
            Plan = plan,
            Status = SubscriptionStatus.Active,
            StartsAtUtc = DateTimeOffset.UtcNow,
            EndsAtUtc = DateTimeOffset.UtcNow.AddMonths(1)
        };

        context.Industries.Add(industry);
        context.Plans.Add(plan);
        context.Tenants.Add(tenant);
        context.TenantIndustryConfigs.Add(config);
        context.TenantSubscriptions.Add(sub);
        context.SaveChanges();

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task CreateBranch_WhenWithinQuota_ShouldSucceed()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupTenantContext();
        var passwordHasher = new PasswordHasher();
        var auditService = new MockAuditService();
        var service = new TenantHierarchyService(context, tenantContext, userContext, passwordHasher, auditService);

        // Act
        var request = new CreateBranchRequest("HO-01", "Head Office", "27AAAAA0000A1Z5", "MG Road", null, "Mumbai", "Maharashtra", "27", "400001", "+91 9876543210", "ho@test.com", true);
        var result = await service.CreateBranchAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var branch = await context.TenantBranches.Include(b => b.Warehouses).FirstOrDefaultAsync(b => b.Id == result.Data);
        Assert.NotNull(branch);
        Assert.Equal("HO-01", branch.BranchCode);
        Assert.True(branch.IsHeadOffice);
        Assert.Single(branch.Warehouses); // Default warehouse auto-created
    }

    [Fact]
    public async Task CreateBranch_WhenExceedsPlanQuota_ShouldReturnFailure()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupTenantContext();
        var passwordHasher = new PasswordHasher();
        var auditService = new MockAuditService();
        var service = new TenantHierarchyService(context, tenantContext, userContext, passwordHasher, auditService);

        // First branch (quota = 1)
        var b1 = new CreateBranchRequest("HO-01", "Head Office", IsHeadOffice: true);
        var res1 = await service.CreateBranchAsync(b1);
        Assert.True(res1.IsSuccess);

        // Act: Second branch
        var b2 = new CreateBranchRequest("BR-02", "Branch 2", IsHeadOffice: false);
        var res2 = await service.CreateBranchAsync(b2);

        // Assert
        Assert.False(res2.IsSuccess);
        Assert.Equal("QUOTA_EXCEEDED", res2.ErrorCode);
    }

    [Fact]
    public async Task CreateWarehouse_WhenExceedsPlanQuota_ShouldReturnFailure()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupTenantContext();
        var passwordHasher = new PasswordHasher();
        var auditService = new MockAuditService();
        var service = new TenantHierarchyService(context, tenantContext, userContext, passwordHasher, auditService);

        // Create 1 branch (which auto-creates 1 warehouse -> current warehouses = 1, quota = 2)
        var b1 = new CreateBranchRequest("HO-01", "Head Office", IsHeadOffice: true);
        var res1 = await service.CreateBranchAsync(b1);

        // Second warehouse (current warehouses = 2)
        var w2 = new CreateWarehouseRequest(res1.Data, "HO-COLD", "Cold Storage", "Room 101");
        var res2 = await service.CreateWarehouseAsync(w2);
        Assert.True(res2.IsSuccess);

        // Act: Third warehouse (exceeds quota of 2)
        var w3 = new CreateWarehouseRequest(res1.Data, "HO-SCRAP", "Scrap Yard");
        var res3 = await service.CreateWarehouseAsync(w3);

        // Assert
        Assert.False(res3.IsSuccess);
        Assert.Equal("QUOTA_EXCEEDED", res3.ErrorCode);
    }

    [Fact]
    public async Task CreateStaffUser_WhenExceedsPlanQuota_ShouldReturnFailure()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupTenantContext();
        var passwordHasher = new PasswordHasher();
        var auditService = new MockAuditService();
        var service = new TenantHierarchyService(context, tenantContext, userContext, passwordHasher, auditService);

        // First user (current = 1, quota = 2)
        var u1 = new CreateStaffUserRequest("staff1@test.com", "Staff One", "Password123!");
        var res1 = await service.CreateStaffUserAsync(u1);
        Assert.True(res1.IsSuccess);

        // Second user (current = 2)
        var u2 = new CreateStaffUserRequest("staff2@test.com", "Staff Two", "Password123!");
        var res2 = await service.CreateStaffUserAsync(u2);
        Assert.True(res2.IsSuccess);

        // Act: Third user (exceeds quota of 2)
        var u3 = new CreateStaffUserRequest("staff3@test.com", "Staff Three", "Password123!");
        var res3 = await service.CreateStaffUserAsync(u3);

        // Assert
        Assert.False(res3.IsSuccess);
        Assert.Equal("QUOTA_EXCEEDED", res3.ErrorCode);
    }

    [Fact]
    public async Task UpdateIndustryConfig_ShouldPersistFlags()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupTenantContext();
        var passwordHasher = new PasswordHasher();
        var auditService = new MockAuditService();
        var service = new TenantHierarchyService(context, tenantContext, userContext, passwordHasher, auditService);

        // Act
        var request = new UpdateTenantIndustryConfigRequest(
            EnableBatchTracking: true,
            EnableExpiryTracking: true,
            EnableSerialTracking: false,
            EnableMultiUnitConversion: true,
            EnableSizeColorMatrix: false,
            EnableRecipeBOM: false,
            EnableScheduleH1DrugTracking: true,
            EnableEWayBill: true,
            EnableEInvoicing: true
        );
        var result = await service.UpdateIndustryConfigAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var config = await service.GetIndustryConfigAsync();
        Assert.True(config.IsSuccess);
        Assert.True(config.Data!.EnableScheduleH1DrugTracking);
        Assert.True(config.Data!.EnableMultiUnitConversion);
        Assert.True(config.Data!.EnableEWayBill);
    }
}
