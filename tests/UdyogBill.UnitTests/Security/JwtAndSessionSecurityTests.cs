using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Infrastructure.Services;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class JwtAndSessionSecurityTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void JwtTokenGenerator_ShouldSet15MinuteExpiryByDefault()
    {
        // Arrange: Configuration without explicit Jwt:ExpiryMinutes
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "ThisIsASecretKeyForTestingJwtTokenGenerator32BytesLong!"
            })
            .Build();

        var generator = new JwtTokenGenerator(config);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "operator@udyogbill.com",
            FullName = "Store Operator",
            IsActive = true
        };

        // Act
        var tokenString = generator.GenerateAccessToken(user, new[] { "Cashier" }, new[] { "sales.create" }, Guid.NewGuid(), "TENANT1");

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(tokenString);

        jwtToken.ValidTo.Should().BeAfter(DateTime.UtcNow.AddMinutes(14))
            .And.BeBefore(DateTime.UtcNow.AddMinutes(16), "Access token lifetime must default to 15 minutes.");
    }

    [Fact]
    public void JwtTokenGenerator_ShouldRespectConfiguredExpiry()
    {
        // Arrange: Configuration with explicit 20 minute expiry
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "ThisIsASecretKeyForTestingJwtTokenGenerator32BytesLong!",
                ["Jwt:ExpiryMinutes"] = "20"
            })
            .Build();

        var generator = new JwtTokenGenerator(config);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "operator@udyogbill.com",
            FullName = "Store Operator",
            IsActive = true
        };

        // Act
        var tokenString = generator.GenerateAccessToken(user, new[] { "Cashier" }, new[] { "sales.create" }, Guid.NewGuid(), "TENANT1");

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(tokenString);

        jwtToken.ValidTo.Should().BeAfter(DateTime.UtcNow.AddMinutes(19))
            .And.BeBefore(DateTime.UtcNow.AddMinutes(21), "Configured 20 minutes should be respected.");
    }

    [Fact]
    public void JwtTokenGenerator_RefreshToken_ShouldDefaultTo7Days()
    {
        // Arrange
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var generator = new JwtTokenGenerator(config);

        // Act
        var (token, tokenHash, expiresAt) = generator.GenerateRefreshToken("192.168.1.50");

        // Assert
        token.Should().NotBeNullOrWhiteSpace();
        tokenHash.Should().NotBeNullOrWhiteSpace();
        expiresAt.Should().BeAfter(DateTimeOffset.UtcNow.AddDays(6.9))
            .And.BeBefore(DateTimeOffset.UtcNow.AddDays(7.1), "Refresh token lifetime must default to 7 days.");
    }

    [Fact]
    public async Task ResetPasswordWithOtp_ShouldRevokeAllExistingRefreshTokens()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var email = "victim@example.com";

        var user = new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = email,
            FullName = "Test User",
            PasswordHash = "OldHash",
            PasswordSalt = "OldSalt",
            IsActive = true
        };
        context.Users.Add(user);

        // Two active sessions / refresh tokens across mobile and web
        var webToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            TokenHash = "web_session_hash_1",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7),
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-1),
            RevokedAtUtc = null
        };

        var mobileToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            TokenHash = "mobile_session_hash_2",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7),
            CreatedAtUtc = DateTimeOffset.UtcNow.AddDays(-2),
            RevokedAtUtc = null
        };

        context.RefreshTokens.AddRange(webToken, mobileToken);

        // Active valid OTP
        var otp = new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = "654321",
            IsUsed = false,
            FailedAttempts = 0,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10),
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        context.PlatformPasswordResetOtps.Add(otp);
        await context.SaveChangesAsync();

        var emailServiceMock = new Mock<IPlatformEmailService>();
        var passwordHasher = new PasswordHasher();
        var service = new PlatformSettingsService(
            context,
            emailServiceMock.Object,
            passwordHasher,
            NullLogger<PlatformSettingsService>.Instance);

        // Act: User resets password after account compromise
        var resetResult = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(
            Email: email,
            OtpCode: "654321",
            NewPassword: "NewSecurePassword2026!"
        ));

        // Assert
        resetResult.IsSuccess.Should().BeTrue();

        var updatedTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.UserId == userId)
            .ToListAsync();

        updatedTokens.Should().HaveCount(2);
        updatedTokens.All(rt => rt.IsRevoked).Should().BeTrue("All refresh tokens must be revoked upon password reset.");
        updatedTokens.All(rt => rt.ReasonRevoked == "Password reset via OTP").Should().BeTrue();
        updatedTokens.All(rt => rt.RevokedAtUtc.HasValue).Should().BeTrue();

        // Verify password changed
        var updatedUser = await context.Users.FindAsync(userId);
        updatedUser!.PasswordHash.Should().NotBe("OldHash");
        passwordHasher.VerifyPassword("NewSecurePassword2026!", updatedUser.PasswordHash, updatedUser.PasswordSalt).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPasswordWithOtp_WhenInvalidOtp_ShouldNotRevokeTokens()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var email = "user@example.com";

        var user = new User
        {
            Id = userId,
            TenantId = tenantId,
            Email = email,
            FullName = "Test User",
            PasswordHash = "OriginalHash",
            PasswordSalt = "OriginalSalt",
            IsActive = true
        };
        context.Users.Add(user);

        var activeToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            TokenHash = "active_session_hash",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7),
            RevokedAtUtc = null
        };
        context.RefreshTokens.Add(activeToken);

        var otp = new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = "999999",
            IsUsed = false,
            FailedAttempts = 0,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10)
        };
        context.PlatformPasswordResetOtps.Add(otp);
        await context.SaveChangesAsync();

        var emailServiceMock = new Mock<IPlatformEmailService>();
        var passwordHasher = new PasswordHasher();
        var service = new PlatformSettingsService(
            context,
            emailServiceMock.Object,
            passwordHasher,
            NullLogger<PlatformSettingsService>.Instance);

        // Act: Wrong OTP submitted
        var resetResult = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(
            Email: email,
            OtpCode: "000000",
            NewPassword: "AttemptedNewPassword!"
        ));

        // Assert
        resetResult.IsSuccess.Should().BeFalse();
        resetResult.ErrorCode.Should().Be("INVALID_OTP");

        var tokenInDb = await context.RefreshTokens.IgnoreQueryFilters().FirstOrDefaultAsync(rt => rt.Id == activeToken.Id);
        tokenInDb!.IsRevoked.Should().BeFalse("Tokens must not be revoked on failed OTP validation.");
    }
}
