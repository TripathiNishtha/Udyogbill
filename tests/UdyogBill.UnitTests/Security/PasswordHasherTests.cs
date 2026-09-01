using FluentAssertions;
using UdyogBill.Infrastructure.Services;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher;

    public PasswordHasherTests()
    {
        _hasher = new PasswordHasher();
    }

    [Fact]
    public void HashPassword_ShouldReturnValidHashAndSalt()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = _hasher.HashPassword(password, out var salt);

        // Assert
        hash.Should().NotBeNullOrWhiteSpace();
        salt.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void VerifyPassword_WithCorrectPassword_ShouldReturnTrue()
    {
        // Arrange
        var password = "Admin@UdyogBill2026!";
        var hash = _hasher.HashPassword(password, out var salt);

        // Act
        var isValid = _hasher.VerifyPassword(password, hash, salt);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WithIncorrectPassword_ShouldReturnFalse()
    {
        // Arrange
        var password = "Admin@UdyogBill2026!";
        var hash = _hasher.HashPassword(password, out var salt);

        // Act
        var isValid = _hasher.VerifyPassword("WrongPassword123!", hash, salt);

        // Assert
        isValid.Should().BeFalse();
    }
}
