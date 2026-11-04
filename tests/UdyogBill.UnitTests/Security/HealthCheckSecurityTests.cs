using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UdyogBill.Api.Controllers;
using UdyogBill.Persistence.Context;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class HealthCheckSecurityTests
{
    private AppDbContext CreateDisposedDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);
        context.Dispose(); // Disposing causes CanConnectAsync to throw ObjectDisposedException
        return context;
    }

    [Fact]
    public async Task GetReadiness_WhenDbThrowsExceptionInProduction_ShouldMaskDatabaseException()
    {
        // Arrange: DbContext throws on connection check
        var failingContext = CreateDisposedDbContext();

        var prodEnvMock = new Mock<IWebHostEnvironment>();
        prodEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var controller = new SystemReadinessController(
            failingContext,
            prodEnvMock.Object,
            NullLogger<SystemReadinessController>.Instance);

        // Act: Anonymous caller probes readiness endpoint during database crash
        var result = await controller.GetReadiness(CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().NotBeNull();

        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);

        // Crucial security assertions:
        responseJson.Should().NotContain("ObjectDisposedException", "Internal exception types must never be exposed to public callers.");
        responseJson.Should().NotContain("System.ObjectDisposedException");
        responseJson.Should().NotContain("StackTrace");
        responseJson.Should().Contain("Database service is temporarily unavailable.", "A generic sanitized status message must be returned.");
    }

    [Fact]
    public async Task GetReadiness_WhenDbThrowsExceptionInDevelopment_ShouldExposeDebugMessage()
    {
        // Arrange
        var failingContext = CreateDisposedDbContext();

        var devEnvMock = new Mock<IWebHostEnvironment>();
        devEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Development);

        var controller = new SystemReadinessController(
            failingContext,
            devEnvMock.Object,
            NullLogger<SystemReadinessController>.Instance);

        // Act
        var result = await controller.GetReadiness(CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);

        responseJson.Should().NotContain("Database service is temporarily unavailable.");
        responseJson.Should().Contain("Cannot access a disposed context", "Development mode should provide exception detail for local developer debugging.");
    }

    [Fact]
    public async Task CheckHealth_WhenDbThrowsExceptionInProduction_ShouldMaskDatabaseException()
    {
        // Arrange
        var failingContext = CreateDisposedDbContext();

        var prodEnvMock = new Mock<IWebHostEnvironment>();
        prodEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var controller = new HealthController(
            failingContext,
            prodEnvMock.Object,
            NullLogger<HealthController>.Instance);

        // Act: Anonymous caller checks /health
        var result = await controller.CheckHealth(CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.Value.Should().NotBeNull();

        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);

        responseJson.Should().NotContain("ObjectDisposedException");
        responseJson.Should().NotContain("Cannot access a disposed context");
        responseJson.Should().Contain("Database service is temporarily unavailable.", "Public health checks must return generic failure message in production.");
    }

    [Fact]
    public async Task CheckHealth_WhenDbThrowsExceptionInDevelopment_ShouldExposeDebugMessage()
    {
        // Arrange
        var failingContext = CreateDisposedDbContext();

        var devEnvMock = new Mock<IWebHostEnvironment>();
        devEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Development);

        var controller = new HealthController(
            failingContext,
            devEnvMock.Object,
            NullLogger<HealthController>.Instance);

        // Act
        var result = await controller.CheckHealth(CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);

        responseJson.Should().NotContain("Database service is temporarily unavailable.");
        responseJson.Should().Contain("Cannot access a disposed context");
    }

    [Fact]
    public async Task CheckHealth_WhenDatabaseHealthy_ShouldReturnHealthy()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        using var healthyContext = new AppDbContext(options);

        var prodEnvMock = new Mock<IWebHostEnvironment>();
        prodEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var controller = new HealthController(
            healthyContext,
            prodEnvMock.Object,
            NullLogger<HealthController>.Instance);

        // Act
        var result = await controller.CheckHealth(CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);

        responseJson.Should().Contain("Healthy");
        responseJson.Should().Contain("Connected (PostgreSQL)");
        responseJson.Should().NotContain("Database service is temporarily unavailable.");
    }
}
