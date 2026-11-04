using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using UdyogBill.Api.Middleware;
using UdyogBill.Application.Interfaces;
using SharedClaims = UdyogBill.Shared.Constants.Claims;
using Xunit;

namespace UdyogBill.UnitTests.Tenancy;

public class TenantResolutionMiddlewareTests
{
    private readonly Mock<ILogger<TenantResolutionMiddleware>> _loggerMock = new();
    private readonly Mock<ITenantContext> _tenantContextMock = new();

    [Fact]
    public async Task InvokeAsync_WhenNormalUserSuppliesDifferentXTenantIdHeader_ShouldReturn403AndBlockRequest()
    {
        // Arrange
        var jwtTenantId = Guid.NewGuid();
        var spoofedTenantId = Guid.NewGuid();
        bool nextInvoked = false;

        var middleware = new TenantResolutionMiddleware(
            next: (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            },
            logger: _loggerMock.Object
        );

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var claims = new[]
        {
            new Claim(SharedClaims.TenantId, jwtTenantId.ToString()),
            new Claim(SharedClaims.IsSuperAdmin, "false")
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        context.Request.Headers["X-Tenant-Id"] = spoofedTenantId.ToString();

        // Act
        await middleware.InvokeAsync(context, _tenantContextMock.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        nextInvoked.Should().BeFalse("Next middleware must not be invoked when header tenant does not match JWT tenant.");
        _tenantContextMock.Verify(t => t.SetTenant(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenNormalUserMissingTenantIdClaim_ShouldReturn403AndNeverTrustHeader()
    {
        // Arrange
        var spoofedTenantId = Guid.NewGuid();
        bool nextInvoked = false;

        var middleware = new TenantResolutionMiddleware(
            next: (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            },
            logger: _loggerMock.Object
        );

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Authenticated user with NO tenant_id claim (e.g. sales rep or broken token)
        var claims = new[]
        {
            new Claim(SharedClaims.UserId, Guid.NewGuid().ToString()),
            new Claim(SharedClaims.IsSuperAdmin, "false")
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        context.Request.Headers["X-Tenant-Id"] = spoofedTenantId.ToString();

        // Act
        await middleware.InvokeAsync(context, _tenantContextMock.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        nextInvoked.Should().BeFalse("Next middleware must not be invoked when tenant claim is missing.");
        _tenantContextMock.Verify(t => t.SetTenant(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_WhenNormalUserMatchesJwtTenant_ShouldProceedWithJwtTenant()
    {
        // Arrange
        var jwtTenantId = Guid.NewGuid();
        bool nextInvoked = false;

        var middleware = new TenantResolutionMiddleware(
            next: (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            },
            logger: _loggerMock.Object
        );

        var context = new DefaultHttpContext();
        var claims = new[]
        {
            new Claim(SharedClaims.TenantId, jwtTenantId.ToString()),
            new Claim("tenant_code", "TNT-001"),
            new Claim(SharedClaims.IsSuperAdmin, "false")
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        context.Request.Headers["X-Tenant-Id"] = jwtTenantId.ToString();

        // Act
        await middleware.InvokeAsync(context, _tenantContextMock.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        nextInvoked.Should().BeTrue();
        _tenantContextMock.Verify(t => t.SetTenant(jwtTenantId, "TNT-001", false), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WhenSuperAdminSuppliesXTenantIdHeader_ShouldAllowOverride()
    {
        // Arrange
        var targetTenantId = Guid.NewGuid();
        bool nextInvoked = false;

        var middleware = new TenantResolutionMiddleware(
            next: (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            },
            logger: _loggerMock.Object
        );

        var context = new DefaultHttpContext();
        var claims = new[]
        {
            new Claim(SharedClaims.IsSuperAdmin, "true"),
            new Claim(ClaimTypes.Role, UdyogBill.Shared.Constants.Roles.SuperAdmin)
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        context.Request.Headers["X-Tenant-Id"] = targetTenantId.ToString();
        context.Request.Headers["X-Tenant-Code"] = "TNT-TARGET";

        // Act
        await middleware.InvokeAsync(context, _tenantContextMock.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        nextInvoked.Should().BeTrue();
        _tenantContextMock.Verify(t => t.SetTenant(targetTenantId, "TNT-TARGET", true), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WhenUnauthenticated_ShouldPassThroughUnaffected()
    {
        // Arrange
        bool nextInvoked = false;

        var middleware = new TenantResolutionMiddleware(
            next: (ctx) =>
            {
                nextInvoked = true;
                return Task.CompletedTask;
            },
            logger: _loggerMock.Object
        );

        var context = new DefaultHttpContext();
        // User is unauthenticated (context.User.Identity is null or IsAuthenticated is false)

        // Act
        await middleware.InvokeAsync(context, _tenantContextMock.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        nextInvoked.Should().BeTrue("Unauthenticated requests to public endpoints must pass through unaffected.");
        _tenantContextMock.Verify(t => t.SetTenant(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<bool>()), Times.Never);
    }
}
