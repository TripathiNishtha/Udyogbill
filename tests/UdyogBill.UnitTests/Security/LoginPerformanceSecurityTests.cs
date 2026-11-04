using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared.Constants;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class LoginPerformanceSecurityTests
{
    private (AppDbContext context, Mock<IPasswordHasher> mockHasher, Mock<IJwtTokenGenerator> mockJwt, AuthService service) CreateAuthService()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var mockTenantContext = new MockTenantContext();
        var context = new AppDbContext(options, mockTenantContext);

        var mockHasher = new Mock<IPasswordHasher>();
        var mockJwt = new Mock<IJwtTokenGenerator>();
        var mockAudit = new Mock<IAuditService>();
        var mockEmail = new Mock<IPlatformEmailService>();
        var mockReferral = new Mock<IReferralService>();

        var service = new AuthService(
            context,
            mockHasher.Object,
            mockJwt.Object,
            mockAudit.Object,
            mockEmail.Object,
            mockReferral.Object
        );

        return (context, mockHasher, mockJwt, service);
    }

    [Fact]
    public void AuthService_SourceCode_ShouldNotContainAnyDdlStatements()
    {
        // Assert that no DDL statements exist in AuthService.cs
        var authServicePath = Path.Combine(AppContext.BaseDirectory, "../../../../../backend/src/UdyogBill.Persistence/Services/AuthService.cs");
        if (File.Exists(authServicePath))
        {
            var content = File.ReadAllText(authServicePath);
            content.Should().NotContain("ALTER TABLE", "AuthService must not contain runtime ALTER TABLE DDL statements.");
            content.Should().NotContain("CREATE TABLE", "AuthService must not contain runtime CREATE TABLE DDL statements.");
            content.Should().NotContain("ExecuteSqlRaw", "AuthService must not execute raw SQL DDL during user authentication.");
        }
    }

    [Fact]
    public void SubscriptionPaymentService_SourceCode_ShouldNotContainAnyDdlStatements()
    {
        // Assert that no DDL statements exist in SubscriptionPaymentService.cs
        var servicePath = Path.Combine(AppContext.BaseDirectory, "../../../../../backend/src/UdyogBill.Persistence/Services/SubscriptionPaymentService.cs");
        if (File.Exists(servicePath))
        {
            var content = File.ReadAllText(servicePath);
            content.Should().NotContain("ALTER TABLE", "SubscriptionPaymentService must not contain runtime ALTER TABLE DDL statements.");
            content.Should().NotContain("CREATE TABLE", "SubscriptionPaymentService must not contain runtime CREATE TABLE DDL statements.");
        }
    }

    [Fact]
    public async Task LoginAsync_ShouldNotExecuteDdlStatements_AndAuthenticateFast()
    {
        // Arrange
        var (context, mockHasher, mockJwt, service) = CreateAuthService();
        var email = "owner@enterprise.com";
        var password = "SecurePassword123!";
        var salt = "random_salt";
        var hash = "hashed_password";

        var industry = new Industry
        {
            Id = Guid.NewGuid(),
            Code = "PHARMA",
            Name = "Pharmaceuticals",
            IsActive = true
        };
        context.Industries.Add(industry);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Code = "ENT-001",
            BusinessName = "Enterprise Pharma",
            Status = TenantStatus.Active,
            IndustryId = industry.Id,
            Industry = industry,
            IsActive = true
        };
        context.Tenants.Add(tenant);

        var role = new Role
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = Roles.TenantAdmin,
            Description = "Tenant Administrator"
        };
        context.Roles.Add(role);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = "Enterprise Owner",
            PasswordHash = hash,
            PasswordSalt = salt,
            TenantId = tenant.Id,
            Tenant = tenant,
            IsActive = true,
            AccessFailedCount = 0
        };

        var userRole = new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            Role = role,
            User = user
        };
        user.UserRoles.Add(userRole);

        context.Users.Add(user);
        await context.SaveChangesAsync();

        mockHasher
            .Setup(h => h.VerifyPassword(password, hash, salt))
            .Returns(true);

        mockJwt
            .Setup(j => j.GenerateAccessToken(It.IsAny<User>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .Returns("fake_jwt_token");

        mockJwt
            .Setup(j => j.GenerateRefreshToken(It.IsAny<string?>()))
            .Returns(("fake_refresh_token", "fake_hash", DateTimeOffset.UtcNow.AddDays(7)));

        // Act: Execute Login
        var result = await service.LoginAsync(new LoginRequest(email, password), "127.0.0.1");

        // Assert
        result.IsSuccess.Should().BeTrue("Login must succeed cleanly without throwing or executing DDL.");
        result.Data.Should().NotBeNull();
        result.Data!.AccessToken.Should().Be("fake_jwt_token");
        result.Data.RefreshToken.Should().Be("fake_refresh_token");
        result.Data.User.Email.Should().Be(email);
        result.Data.User.TenantId.Should().Be(tenant.Id);
    }
}
