using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared.Constants;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class AccountLockoutSecurityTests
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

    private User CreateTestUser(AppDbContext context, string email, string password, int failedCount = 0, DateTimeOffset? lockoutEnd = null)
    {
        var industry = new Industry
        {
            Id = Guid.NewGuid(),
            Code = "RETAIL",
            Name = "Retail",
            IsActive = true
        };
        context.Industries.Add(industry);

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Code = "TNT-LOCKOUT-TEST",
            BusinessName = "Lockout Test Tenant",
            Status = TenantStatus.Active,
            IsActive = true,
            IndustryId = industry.Id,
            Industry = industry
        };
        context.Tenants.Add(tenant);

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Tenant = tenant,
            Email = email.ToLowerInvariant(),
            FullName = "Test Lockout User",
            PasswordHash = "hashed_" + password,
            PasswordSalt = "salt_123",
            IsActive = true,
            LockoutEnabled = true,
            AccessFailedCount = failedCount,
            LockoutEndUtc = lockoutEnd
        };

        var role = new Role
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Name = Roles.TenantAdmin,
            Description = "Admin"
        };
        context.Roles.Add(role);

        var userRole = new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id,
            Role = role,
            User = user
        };
        user.UserRoles.Add(userRole);

        context.Users.Add(user);
        context.SaveChanges();

        return user;
    }

    [Fact]
    public async Task Login_WhenAccountLocked_ShouldRejectImmediatelyWithoutVerifyingPassword()
    {
        var (context, mockHasher, _, service) = CreateAuthService();
        var user = CreateTestUser(context, "lockeduser@test.com", "Secret@123", failedCount: 5, lockoutEnd: DateTimeOffset.UtcNow.AddMinutes(15));

        var request = new LoginRequest("lockeduser@test.com", "AnyPasswordProvided");
        var result = await service.LoginAsync(request);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("ACCOUNT_LOCKED");
        result.ErrorMessage.Should().Contain("temporarily locked");

        // Cryptographic password verification must be skipped completely during lockout
        mockHasher.Verify(h => h.VerifyPassword(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Login_WhenPasswordFailsFiveTimes_ShouldLockAccountFor15Minutes()
    {
        var (context, mockHasher, _, service) = CreateAuthService();
        var user = CreateTestUser(context, "victim@test.com", "CorrectPassword123", failedCount: 4, lockoutEnd: null);

        mockHasher.Setup(h => h.VerifyPassword("WrongPassword", user.PasswordHash, user.PasswordSalt))
            .Returns(false);

        var request = new LoginRequest("victim@test.com", "WrongPassword");
        var result = await service.LoginAsync(request);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("ACCOUNT_LOCKED");
        result.ErrorMessage.Should().Contain("temporarily locked for 15 minutes");

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        updatedUser.AccessFailedCount.Should().Be(5);
        updatedUser.LockoutEndUtc.Should().NotBeNull();
        updatedUser.LockoutEndUtc!.Value.Should().BeAfter(DateTimeOffset.UtcNow.AddMinutes(14));
    }

    [Fact]
    public async Task Login_WhenPasswordFailsLessThanFiveTimes_ShouldIncrementCounterAndNotLock()
    {
        var (context, mockHasher, _, service) = CreateAuthService();
        var user = CreateTestUser(context, "user2@test.com", "CorrectPassword123", failedCount: 2, lockoutEnd: null);

        mockHasher.Setup(h => h.VerifyPassword("WrongPassword", user.PasswordHash, user.PasswordSalt))
            .Returns(false);

        var request = new LoginRequest("user2@test.com", "WrongPassword");
        var result = await service.LoginAsync(request);

        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("INVALID_CREDENTIALS");

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        updatedUser.AccessFailedCount.Should().Be(3);
        updatedUser.LockoutEndUtc.Should().BeNull();
    }

    [Fact]
    public async Task Login_WhenLockoutPeriodExpires_ShouldAllowLoginWithCorrectPasswordAndResetCount()
    {
        var (context, mockHasher, mockJwt, service) = CreateAuthService();
        var user = CreateTestUser(context, "unlocked@test.com", "CorrectPassword123", failedCount: 5, lockoutEnd: DateTimeOffset.UtcNow.AddMinutes(-1));

        mockHasher.Setup(h => h.VerifyPassword("CorrectPassword123", user.PasswordHash, user.PasswordSalt))
            .Returns(true);
        mockJwt.Setup(j => j.GenerateAccessToken(It.IsAny<User>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<Guid?>(), It.IsAny<string?>()))
            .Returns("access.token.jwt");
        mockJwt.Setup(j => j.GenerateRefreshToken(It.IsAny<string?>()))
            .Returns(("refresh_token", "hash_abc", DateTimeOffset.UtcNow.AddDays(7)));

        var request = new LoginRequest("unlocked@test.com", "CorrectPassword123");
        var result = await service.LoginAsync(request);

        result.IsSuccess.Should().BeTrue();

        var updatedUser = await context.Users.FirstAsync(u => u.Id == user.Id);
        updatedUser.AccessFailedCount.Should().Be(0);
        updatedUser.LockoutEndUtc.Should().BeNull();
    }

    [Fact]
    public void RateLimiter_WhenOneIpHitsAuthLimit_ShouldNotBlockAnotherIp()
    {
        var limiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var clientIp = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                ?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "anonymous";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: clientIp,
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 15,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });

        // Simulate Attacker IP: 198.51.100.1
        var attackerContext = new DefaultHttpContext();
        attackerContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("198.51.100.1");

        // Exhaust attacker's 15 permits
        for (int i = 0; i < 15; i++)
        {
            using var lease = limiter.AttemptAcquire(attackerContext, 1);
            lease.IsAcquired.Should().BeTrue($"Attacker attempt {i + 1} should be permitted");
        }

        // 16th attempt for attacker MUST fail (HTTP 429)
        using (var blockedLease = limiter.AttemptAcquire(attackerContext, 1))
        {
            blockedLease.IsAcquired.Should().BeFalse("Attacker 16th attempt must be rejected by Rate Limiter");
        }

        // Legitimate User IP: 203.0.113.5
        var legitimateContext = new DefaultHttpContext();
        legitimateContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.5");

        // Legitimate user must NOT be blocked by attacker's activity
        using (var allowedLease = limiter.AttemptAcquire(legitimateContext, 1))
        {
            allowedLease.IsAcquired.Should().BeTrue("Legitimate user from separate IP must not be blocked (No cross-tenant DoS)");
        }
    }
}
