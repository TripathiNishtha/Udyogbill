using UdyogBill.Domain.Entities.Catalog;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared.Constants;
using Xunit;

namespace UdyogBill.UnitTests.Tenancy;

public class CompanySwitchSecurityTests
{
    private (AppDbContext context, Mock<IJwtTokenGenerator> jwtMock, Mock<IAuditService> auditMock, Mock<ITenantContext> tenantContextMock, CompanyManagementService service)
        CreateService(Guid currentTenantId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContextMock = new Mock<ITenantContext>();
        tenantContextMock.Setup(c => c.TenantId).Returns(currentTenantId);

        var context = new AppDbContext(options, tenantContextMock.Object);

        var jwtMock = new Mock<IJwtTokenGenerator>();
        jwtMock.Setup(j => j.GenerateAccessToken(
            It.IsAny<User>(),
            It.IsAny<IReadOnlyList<string>>(),
            It.IsAny<IReadOnlyList<string>>(),
            It.IsAny<Guid?>(),
            It.IsAny<string?>()
        )).Returns("mocked_jwt_token");

        jwtMock.Setup(j => j.GenerateRefreshToken(It.IsAny<string?>()))
            .Returns(("mock_refresh_token", "mock_hash", DateTimeOffset.UtcNow.AddDays(7)));

        var auditMock = new Mock<IAuditService>();
        var loggerMock = new Mock<ILogger<CompanyManagementService>>();

        var service = new CompanyManagementService(
            context,
            jwtMock.Object,
            auditMock.Object,
            loggerMock.Object,
            tenantContextMock.Object
        );

        return (context, jwtMock, auditMock, tenantContextMock, service);
    }

    [Fact]
    public async Task SwitchCompany_WhenUserHasCashierRole_ShouldAssignCashierAndNotTenantAdmin()
    {
        // Arrange
        var currentTenantId = Guid.NewGuid();
        var targetTenantId = Guid.NewGuid();
        var (context, jwtMock, _, _, service) = CreateService(currentTenantId);

        var industry = new Industry { Id = Guid.NewGuid(), Code = "RETAIL1", Name = "Retail" };
        context.Industries.Add(industry);
        var targetTenant = new Tenant
        {
            Id = targetTenantId,
            Code = "TNT-TARGET",
            BusinessName = "Target Subsidiary Store",
            IndustryId = industry.Id,
            Industry = industry,
            Status = TenantStatus.Active,
            IsActive = true
        };

        var cashierUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "cashier@teststore.com",
            FullName = "Ramesh Cashier",
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            IsActive = true,
            TenantId = currentTenantId
        };

        var cashierMapping = new TenantUserMapping
        {
            Id = Guid.NewGuid(),
            TenantId = targetTenantId,
            UserId = cashierUser.Id,
            Role = Roles.TenantCashier,
            IsOwner = false,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        context.Tenants.Add(targetTenant);
        context.Users.Add(cashierUser);
        context.TenantUserMappings.Add(cashierMapping);
        await context.SaveChangesAsync();

        // Act
        var result = await service.SwitchCompanyAsync(targetTenantId, cashierUser.Id, "127.0.0.1", CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data.User.Should().NotBeNull();

        // Must receive mapped role (TenantCashier), NOT TenantAdmin
        result.Data.User.Roles.Should().Contain(Roles.TenantCashier);
        result.Data.User.Roles.Should().NotContain(Roles.TenantAdmin);
        result.Data.User.IsTenantAdmin.Should().BeFalse();

        // JWT generator must be invoked with TenantCashier role, not TenantAdmin
        jwtMock.Verify(j => j.GenerateAccessToken(
            It.Is<User>(u => !u.IsTenantAdmin),
            It.Is<IReadOnlyList<string>>(r => r.Contains(Roles.TenantCashier) && !r.Contains(Roles.TenantAdmin)),
            It.IsAny<IReadOnlyList<string>>(),
            targetTenantId,
            "TNT-TARGET"
        ), Times.Once);
    }

    [Fact]
    public async Task SwitchCompany_WhenUserHasNoMappingForTargetCompany_ShouldDenyAccess()
    {
        // Arrange
        var currentTenantId = Guid.NewGuid();
        var targetTenantId = Guid.NewGuid();
        var (context, _, _, _, service) = CreateService(currentTenantId);

        var industry = new Industry { Id = Guid.NewGuid(), Code = "RETAIL2", Name = "Retail" };
        context.Industries.Add(industry);
        var targetTenant = new Tenant
        {
            Id = targetTenantId,
            Code = "TNT-TARGET",
            BusinessName = "Target Unmapped Store",
            IndustryId = industry.Id,
            Industry = industry,
            Status = TenantStatus.Active,
            IsActive = true
        };

        var unmappedUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "unmapped@teststore.com",
            FullName = "Unmapped Staff",
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            IsActive = true,
            TenantId = currentTenantId
        };

        context.Tenants.Add(targetTenant);
        context.Users.Add(unmappedUser);
        await context.SaveChangesAsync();

        // Act
        var result = await service.SwitchCompanyAsync(targetTenantId, unmappedUser.Id, "127.0.0.1", CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("ACCESS_DENIED");
    }

    [Fact]
    public async Task SwitchCompany_WhenSuperAdmin_ShouldAllowAccessWithSuperAdminRoleEvenWithoutMapping()
    {
        // Arrange
        var currentTenantId = Guid.NewGuid();
        var targetTenantId = Guid.NewGuid();
        var (context, jwtMock, _, _, service) = CreateService(currentTenantId);

        var industry = new Industry { Id = Guid.NewGuid(), Code = "RETAIL3", Name = "Retail" };
        context.Industries.Add(industry);
        var targetTenant = new Tenant
        {
            Id = targetTenantId,
            Code = "TNT-TARGET",
            BusinessName = "Target Store",
            IndustryId = industry.Id,
            Industry = industry,
            Status = TenantStatus.Active,
            IsActive = true
        };

        var superAdmin = new User
        {
            Id = Guid.NewGuid(),
            Email = "superadmin@udyogbill.com",
            FullName = "Super Admin",
            IsSuperAdmin = true,
            IsTenantAdmin = false,
            IsActive = true
        };

        context.Tenants.Add(targetTenant);
        context.Users.Add(superAdmin);
        await context.SaveChangesAsync();

        // Act
        var result = await service.SwitchCompanyAsync(targetTenantId, superAdmin.Id, "127.0.0.1", CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.User.Roles.Should().Contain(Roles.SuperAdmin);
        result.Data.User.IsSuperAdmin.Should().BeTrue();
    }
}
