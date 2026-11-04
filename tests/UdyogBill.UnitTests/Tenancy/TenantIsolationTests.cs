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

    [Fact]
    public async Task EFCoreTenantFilter_AcrossMultipleDbContextInstances_ShouldResolveDynamicTenantId()
    {
        // Arrange
        var tenantAId = Guid.NewGuid();
        var tenantBId = Guid.NewGuid();

        var mockTenantA = new Mock<ITenantContext>();
        mockTenantA.Setup(c => c.TenantId).Returns(tenantAId);
        mockTenantA.Setup(c => c.IsSuperAdmin).Returns(false);

        var mockTenantB = new Mock<ITenantContext>();
        mockTenantB.Setup(c => c.TenantId).Returns(tenantBId);
        mockTenantB.Setup(c => c.IsSuperAdmin).Returns(false);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        // Step 1: Initialize model cache with Tenant A context and seed data
        using (var contextA = new AppDbContext(options, mockTenantA.Object))
        {
            contextA.TenantBranches.AddRange(
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantAId, BranchCode = "BR-A1", BranchName = "Tenant A Branch 1" },
                new TenantBranch { Id = Guid.NewGuid(), TenantId = tenantBId, BranchCode = "BR-B1", BranchName = "Tenant B Branch 1" }
            );
            await contextA.SaveChangesAsync();

            var branchesA = await contextA.TenantBranches.ToListAsync();
            branchesA.Should().HaveCount(1);
            branchesA.Single().TenantId.Should().Be(tenantAId);
        } // contextA is now completely disposed!

        // Step 2: Separate scoped DbContext instance (simulating next HTTP request for Tenant B)
        using (var contextB = new AppDbContext(options, mockTenantB.Object))
        {
            var branchesB = await contextB.TenantBranches.ToListAsync();

            // Assert: Query filter must dynamically resolve Tenant B, not stale Tenant A or throw ObjectDisposedException
            branchesB.Should().HaveCount(1);
            branchesB.Single().TenantId.Should().Be(tenantBId);
        }
    }
}
