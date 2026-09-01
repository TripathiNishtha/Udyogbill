using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using Xunit;

namespace UdyogBill.UnitTests.Tenancy;

public class TenantIsolationTests
{
    [Fact]
    public async Task TenantIsolation_WhenFiltered_ShouldOnlyReturnRecordsForCurrentTenant()
    {
        // Arrange
        var tenantAId = Guid.NewGuid();
        var tenantBId = Guid.NewGuid();

        var mockTenantContext = new Mock<ITenantContext>();
        mockTenantContext.Setup(c => c.TenantId).Returns(tenantAId);
        mockTenantContext.Setup(c => c.IsSuperAdmin).Returns(false);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using (var seedContext = new AppDbContext(options))
        {
            seedContext.TenantBranches.AddRange(
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantAId, BranchCode = "BR-A1", BranchName = "Tenant A Branch 1" },
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantAId, BranchCode = "BR-A2", BranchName = "Tenant A Branch 2" },
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantBId, BranchCode = "BR-B1", BranchName = "Tenant B Branch 1" }
            );
            await seedContext.SaveChangesAsync();
        }

        // Act
        using (var queryContext = new AppDbContext(options, mockTenantContext.Object))
        {
            var visibleBranches = await queryContext.TenantBranches.ToListAsync();

            // Assert
            visibleBranches.Should().HaveCount(2);
            visibleBranches.Should().OnlyContain(b => b.TenantId == tenantAId);
        }
    }

    [Fact]
    public async Task TenantIsolation_WhenSuperAdmin_ShouldSeeAllTenantRecords()
    {
        // Arrange
        var tenantAId = Guid.NewGuid();
        var tenantBId = Guid.NewGuid();

        var mockSuperAdminContext = new Mock<ITenantContext>();
        mockSuperAdminContext.Setup(c => c.TenantId).Returns(Guid.Empty);
        mockSuperAdminContext.Setup(c => c.IsSuperAdmin).Returns(true);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using (var seedContext = new AppDbContext(options))
        {
            seedContext.TenantBranches.AddRange(
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantAId, BranchCode = "BR-A1", BranchName = "Tenant A Branch 1" },
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantBId, BranchCode = "BR-B1", BranchName = "Tenant B Branch 1" }
            );
            await seedContext.SaveChangesAsync();
        }

        // Act
        using (var queryContext = new AppDbContext(options, mockSuperAdminContext.Object))
        {
            var visibleBranches = await queryContext.TenantBranches.ToListAsync();

            // Assert
            visibleBranches.Should().HaveCount(2);
        }
    }
}
