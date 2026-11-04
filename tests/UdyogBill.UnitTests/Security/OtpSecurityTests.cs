using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class OtpSecurityTests
{
    private (AppDbContext context, Mock<IPlatformEmailService> emailService, Mock<IPasswordHasher> passwordHasher, PlatformSettingsService service) CreateTestSetup()
    {
        var dbName = Guid.NewGuid().ToString();
        var tenantContext = new MockTenantContext();

        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var context = new AppDbContext(dbOptions, tenantContext);
        var mockEmail = new Mock<IPlatformEmailService>();
        var mockHasher = new Mock<IPasswordHasher>();

        mockHasher
            .Setup(h => h.HashPassword(It.IsAny<string>(), out It.Ref<string>.IsAny))
            .Returns(new HashPasswordDelegate((string pwd, out string salt) =>
            {
                salt = "test_salt_123";
                return "test_hash_456";
            }));

        var service = new PlatformSettingsService(
            context,
            mockEmail.Object,
            mockHasher.Object,
            NullLogger<PlatformSettingsService>.Instance
        );

        return (context, mockEmail, mockHasher, service);
    }

    private delegate string HashPasswordDelegate(string password, out string salt);

    [Fact]
    public async Task PasswordResetOtp_ShouldBePersistedHashedInDatabase()
    {
        // Arrange
        var (context, mockEmail, _, service) = CreateTestSetup();
        var email = "owner@tenantbusiness.com";

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = "Business Owner",
            PasswordHash = "old_hash",
            PasswordSalt = "old_salt",
            IsActive = true
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        string? dispatchedOtp = null;
        mockEmail
            .Setup(e => e.SendPasswordResetOtpAsync(email, "Business Owner", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, string, CancellationToken>((_, _, code, _) => dispatchedOtp = code)
            .ReturnsAsync(true);

        // Act
        var result = await service.SendForgotPasswordOtpAsync(new ForgotPasswordRequest(email));

        // Assert
        result.IsSuccess.Should().BeTrue();
        dispatchedOtp.Should().NotBeNullOrWhiteSpace();
        dispatchedOtp!.Length.Should().Be(6, "User must receive a 6-digit numeric OTP code in email.");

        // Query database directly to verify stored value
        var storedRecord = await context.PlatformPasswordResetOtps
            .FirstOrDefaultAsync(o => o.Email == email);

        storedRecord.Should().NotBeNull();
        storedRecord!.OtpCode.Should().NotBe(dispatchedOtp, "Plaintext OTP must NEVER be saved directly in the database.");
        storedRecord.OtpCode.Length.Should().Be(64, "Stored OTP must be a 64-character hex-encoded SHA-256 hash.");

        // Verify SHA-256 hash calculation matches
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dispatchedOtp)));
        storedRecord.OtpCode.Should().Be(expectedHash);
    }

    [Fact]
    public async Task VerifyOtp_WithInvalidCode_ShouldReturnInvalidOtp()
    {
        // Arrange
        var (context, _, _, service) = CreateTestSetup();
        var email = "admin@company.com";
        var realCode = "849201";
        var realHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(realCode)));

        context.PlatformPasswordResetOtps.Add(new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = realHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(15),
            IsUsed = false,
            FailedAttempts = 0
        });
        await context.SaveChangesAsync();

        // Act: Provide wrong OTP code
        var result = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(email, "111111", "NewSecurePassword123!"));

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("INVALID_OTP");
        result.ErrorMessage.Should().Contain("4 attempt(s) remaining");

        var updatedRecord = await context.PlatformPasswordResetOtps.FirstAsync(o => o.Email == email);
        updatedRecord.FailedAttempts.Should().Be(1);
        updatedRecord.IsUsed.Should().BeFalse();
    }

    [Fact]
    public async Task VerifyOtp_WithCorrectCode_ShouldResetPasswordAndMarkOtpUsed()
    {
        // Arrange
        var (context, _, _, service) = CreateTestSetup();
        var email = "admin@securecorp.com";
        var realCode = "456789";
        var realHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(realCode)));

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = "Admin Corp",
            PasswordHash = "initial_hash",
            PasswordSalt = "initial_salt",
            IsActive = true
        };
        context.Users.Add(user);

        context.PlatformPasswordResetOtps.Add(new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = realHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(15),
            IsUsed = false,
            FailedAttempts = 0
        });
        await context.SaveChangesAsync();

        // Act: Submit the correct OTP code
        var result = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(email, realCode, "BrandNewPassword123!"));

        // Assert
        result.IsSuccess.Should().BeTrue();

        var updatedOtp = await context.PlatformPasswordResetOtps.FirstAsync(o => o.Email == email);
        updatedOtp.IsUsed.Should().BeTrue("Valid OTP must be marked as used immediately.");

        var updatedUser = await context.Users.FirstAsync(u => u.Email == email);
        updatedUser.PasswordHash.Should().Be("test_hash_456");
        updatedUser.PasswordSalt.Should().Be("test_salt_123");
    }

    [Fact]
    public async Task VerifyOtp_WithLegacyPlaintextOtp_ShouldWorkForBackwardCompatibility()
    {
        // Arrange: Unexpired legacy 6-digit plaintext OTP in database from before deployment
        var (context, _, _, service) = CreateTestSetup();
        var email = "legacyuser@store.com";
        var plaintextCode = "654321";

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FullName = "Legacy User",
            PasswordHash = "old_hash",
            PasswordSalt = "old_salt",
            IsActive = true
        };
        context.Users.Add(user);

        context.PlatformPasswordResetOtps.Add(new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = plaintextCode, // Stored in plain text (6 characters)
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10),
            IsUsed = false,
            FailedAttempts = 0
        });
        await context.SaveChangesAsync();

        // Act
        var result = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(email, plaintextCode, "NewPasswordForLegacyUser123!"));

        // Assert: Should successfully verify and reset password
        result.IsSuccess.Should().BeTrue();

        var updatedOtp = await context.PlatformPasswordResetOtps.FirstAsync(o => o.Email == email);
        updatedOtp.IsUsed.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyOtp_Exceeding5FailedAttempts_ShouldLockOtp()
    {
        // Arrange
        var (context, _, _, service) = CreateTestSetup();
        var email = "bruteforce@target.com";
        var realCode = "999888";
        var realHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(realCode)));

        context.PlatformPasswordResetOtps.Add(new PlatformPasswordResetOtp
        {
            Id = Guid.NewGuid(),
            Email = email,
            OtpCode = realHash,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(15),
            IsUsed = false,
            FailedAttempts = 4 // 4 attempts already failed
        });
        await context.SaveChangesAsync();

        // Act: 5th failed attempt
        var result = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(email, "000000", "AttackerPassword!"));

        // Assert: Locked
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("OTP_LOCKED");

        var updatedOtp = await context.PlatformPasswordResetOtps.FirstAsync(o => o.Email == email);
        updatedOtp.FailedAttempts.Should().Be(5);
        updatedOtp.IsUsed.Should().BeTrue("Exceeding failed attempts limit must invalidate the OTP.");

        // Subsequent attempt with even the CORRECT code should now be rejected as locked
        var nextAttempt = await service.ResetPasswordWithOtpAsync(new ResetPasswordWithOtpRequest(email, realCode, "AttackerPassword!"));
        nextAttempt.IsSuccess.Should().BeFalse();
        nextAttempt.ErrorCode.Should().Be("INVALID_OTP");
    }
}
