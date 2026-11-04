using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using UdyogBill.Api.Configuration;
using UdyogBill.Api.Controllers;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class ForwardedHeadersSecurityTests
{
    [Fact]
    public async Task RemoteIpAddress_WhenSpoofedHeaderFromUntrustedSource_ShouldIgnoreHeader()
    {
        // Arrange: Untrusted direct client IP (not in KnownProxies or KnownNetworks)
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1
        };
        // Default KnownProxies contains 127.0.0.1 and ::1. Untrusted client IP is 203.0.113.195
        var middleware = new ForwardedHeadersMiddleware(
            next: (innerHttpContext) => Task.CompletedTask,
            loggerFactory: NullLoggerFactory.Instance,
            options: Options.Create(options)
        );

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.195");
        context.Request.Headers["X-Forwarded-For"] = "127.0.0.1";
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        // Act
        await middleware.Invoke(context);

        // Assert: RemoteIpAddress must remain the socket connection IP and MUST NOT be overwritten by the spoofed header
        context.Connection.RemoteIpAddress.Should().NotBeNull();
        context.Connection.RemoteIpAddress!.ToString().Should().Be("203.0.113.195");
    }

    [Fact]
    public async Task RemoteIpAddress_WhenTrustedProxySendsXForwardedFor_ShouldUpdateRemoteIp()
    {
        // Arrange: Trusted proxy IP (127.0.0.1 is in default KnownProxies)
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1
        };
        var middleware = new ForwardedHeadersMiddleware(
            next: (innerHttpContext) => Task.CompletedTask,
            loggerFactory: NullLoggerFactory.Instance,
            options: Options.Create(options)
        );

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("127.0.0.1"); // Trusted proxy
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.22";

        // Act
        await middleware.Invoke(context);

        // Assert: RemoteIpAddress must be updated to the forwarded IP from the trusted proxy
        context.Connection.RemoteIpAddress.Should().NotBeNull();
        context.Connection.RemoteIpAddress!.ToString().Should().Be("198.51.100.22");
    }

    [Fact]
    public void ConfigureForwardedHeaders_WhenCustomProxiesAndNetworksConfigured_ShouldRegisterProperly()
    {
        // Arrange
        var inMemoryConfig = new Dictionary<string, string?>
        {
            { "ForwardedHeaders:ForwardLimit", "2" },
            { "ForwardedHeaders:KnownProxies:0", "10.0.0.100" },
            { "ForwardedHeaders:KnownNetworks:0", "172.16.0.0/16" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemoryConfig)
            .Build();

        var services = new ServiceCollection();
        services.ConfigureForwardedHeaders(configuration);

        var serviceProvider = services.BuildServiceProvider();
        var options = serviceProvider.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

        // Assert
        options.ForwardedHeaders.Should().Be(ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);
        options.ForwardLimit.Should().Be(2);
        options.KnownProxies.Should().Contain(IPAddress.Parse("10.0.0.100"));
        options.KnownNetworks.Should().Contain(net => net.Prefix.ToString() == "172.16.0.0" && net.PrefixLength == 16);
    }

    [Fact]
    public async Task AuthController_Login_ShouldUseSanitizedRemoteIp_AndIgnoreSpoofedHeader()
    {
        // Arrange
        var mockAuthService = new Mock<IAuthService>();
        var mockSettingsService = new Mock<IPlatformSettingsService>();
        var mockSuperAdminService = new Mock<ISuperAdminService>();
        var mockCurrentUserContext = new Mock<ICurrentUserContext>();

        string? capturedIp = null;
        var fakeUser = new AuthUserDto(
            Id: Guid.NewGuid(),
            Email: "admin@example.com",
            FullName: "Admin User",
            IsSuperAdmin: false,
            IsTenantAdmin: true,
            TenantId: Guid.NewGuid(),
            TenantCode: "TNT01",
            BusinessName: "Test Tenant",
            IndustryCode: "RETAIL",
            Roles: new List<string> { "TenantAdmin" },
            Permissions: new List<string>()
        );
        var fakeResponse = new LoginResponse(
            AccessToken: "token123",
            RefreshToken: "refresh123",
            ExpiresAt: DateTimeOffset.UtcNow.AddMinutes(15),
            User: fakeUser
        );

        mockAuthService
            .Setup(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .Callback<LoginRequest, string?, CancellationToken>((_, ip, _) => capturedIp = ip)
            .ReturnsAsync(Result<LoginResponse>.Success(fakeResponse));

        var controller = new AuthController(
            mockAuthService.Object,
            mockSettingsService.Object,
            mockSuperAdminService.Object,
            mockCurrentUserContext.Object
        );

        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.50");
        // Attacker attempts to spoof their IP in X-Forwarded-For
        httpContext.Request.Headers["X-Forwarded-For"] = "1.1.1.1, 10.0.0.1";

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        var loginRequest = new LoginRequest("admin@example.com", "Password123!");

        // Act
        await controller.Login(loginRequest, CancellationToken.None);

        // Assert: The IP passed to the business service must match Connection.RemoteIpAddress, NOT the spoofed header
        capturedIp.Should().Be("203.0.113.50");
    }

    [Fact]
    public async Task AuthController_RecordTelemetry_ShouldUseSanitizedRemoteIp_AndIgnoreSpoofedHeader()
    {
        // Arrange
        var mockAuthService = new Mock<IAuthService>();
        var mockSettingsService = new Mock<IPlatformSettingsService>();
        var mockSuperAdminService = new Mock<ISuperAdminService>();
        var mockCurrentUserContext = new Mock<ICurrentUserContext>();

        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        mockCurrentUserContext.Setup(c => c.TenantId).Returns(tenantId);
        mockCurrentUserContext.Setup(c => c.UserId).Returns(userId);

        string? capturedIp = null;
        mockSuperAdminService
            .Setup(s => s.RecordClientTelemetryAsync(
                tenantId,
                userId,
                It.IsAny<ClientTelemetryPayload>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .Callback<Guid, Guid?, ClientTelemetryPayload, string?, string?, CancellationToken>((_, _, _, ip, _, _) => capturedIp = ip)
            .ReturnsAsync(Result.Success());

        var controller = new AuthController(
            mockAuthService.Object,
            mockSettingsService.Object,
            mockSuperAdminService.Object,
            mockCurrentUserContext.Object
        );

        var httpContext = new DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.99");
        httpContext.Request.Headers["X-Forwarded-For"] = "10.99.88.77";

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        var payload = new ClientTelemetryPayload(
            DeviceId: "device-1",
            DeviceType: "Mobile",
            Brand: "Samsung",
            Model: "Galaxy",
            OsName: "Android",
            OsVersion: "14",
            AppVersion: "1.0.0",
            ConnectionType: "WiFi",
            IsDualSim: false,
            Sim1Carrier: null,
            Sim2Carrier: null,
            SimPhoneNumber: null
        );

        // Act
        await controller.RecordTelemetry(payload, CancellationToken.None);

        // Assert: Telemetry records sanitized connection IP, ignoring spoofed X-Forwarded-For
        capturedIp.Should().Be("198.51.100.99");
    }

    [Fact]
    public async Task GlobalRateLimiter_AnonymousPartition_ShouldShareBucketByRemoteIp_NotSpoofedHeader()
    {
        // Arrange
        var rateLimiterOptions = new RateLimiterOptions();
        RateLimitingConfiguration.ConfigureRateLimiting(rateLimiterOptions);
        var globalLimiter = rateLimiterOptions.GlobalLimiter;
        globalLimiter.Should().NotBeNull();

        var realClientIp = IPAddress.Parse("192.0.2.1");

        // Request 1 from 192.0.2.1 with spoofed header "10.0.0.1"
        var context1 = new DefaultHttpContext();
        context1.Connection.RemoteIpAddress = realClientIp;
        context1.Request.Headers["X-Forwarded-For"] = "10.0.0.1";
        context1.Request.Path = "/api/v1/public/catalog";

        // Request 2 from 192.0.2.1 with different spoofed header "10.0.0.2"
        var context2 = new DefaultHttpContext();
        context2.Connection.RemoteIpAddress = realClientIp;
        context2.Request.Headers["X-Forwarded-For"] = "10.0.0.2";
        context2.Request.Path = "/api/v1/public/catalog";

        // Act: Exhaust all 150 permits for 192.0.2.1 using context1
        for (int i = 0; i < RateLimitingConfiguration.DefaultAnonymousPermitLimit; i++)
        {
            using var lease = await globalLimiter!.AcquireAsync(context1, permitCount: 1);
            lease.IsAcquired.Should().BeTrue();
        }

        // Assert: Request 2 with a different spoofed X-Forwarded-For header MUST STILL BE REJECTED
        // because both requests share the true Connection.RemoteIpAddress partition (ip:192.0.2.1)
        using var rejectedLease = await globalLimiter!.AcquireAsync(context2, permitCount: 1);
        rejectedLease.IsAcquired.Should().BeFalse(
            "Spoofing X-Forwarded-For header should not allow an attacker to escape their connection IP rate limit bucket.");
    }
}
