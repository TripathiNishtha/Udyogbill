using System.Security.Claims;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using UdyogBill.Api.Configuration;
using UdyogBill.Shared.Constants;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class GlobalRateLimiterSecurityTests
{
    private RateLimiterOptions CreateConfiguredOptions()
    {
        var options = new RateLimiterOptions();
        RateLimitingConfiguration.ConfigureRateLimiting(options);
        return options;
    }

    private HttpContext CreateTenantHttpContext(Guid tenantId, string path = "/api/v1/sales/invoices")
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;

        var claims = new[]
        {
            new Claim("tenant_id", tenantId.ToString()),
            new Claim(Claims.UserId, Guid.NewGuid().ToString())
        };
        var identity = new ClaimsIdentity(claims, "Bearer");
        context.User = new ClaimsPrincipal(identity);

        return context;
    }

    private HttpContext CreateAnonymousHttpContext(string clientIp, string path = "/api/v1/public/catalog")
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(clientIp);
        return context;
    }

    [Fact]
    public async Task GlobalRateLimiter_WhenTenantExceedsQuota_ShouldRejectSubsequentRequests()
    {
        // Arrange
        var options = CreateConfiguredOptions();
        var globalLimiter = options.GlobalLimiter;
        globalLimiter.Should().NotBeNull("GlobalLimiter must be registered on RateLimiterOptions.");

        var tenantId = Guid.NewGuid();
        var context = CreateTenantHttpContext(tenantId);

        // Act & Assert: Acquire all 300 allowed sliding window permits
        for (int i = 0; i < RateLimitingConfiguration.DefaultTenantPermitLimit; i++)
        {
            using var lease = await globalLimiter!.AcquireAsync(context, permitCount: 1);
            lease.IsAcquired.Should().BeTrue($"Permit #{i + 1} within tenant quota must be acquired.");
        }

        // 301st request from same tenant must be rejected
        using var rejectedLease = await globalLimiter!.AcquireAsync(context, permitCount: 1);
        rejectedLease.IsAcquired.Should().BeFalse("Requests exceeding the tenant's 300 req/min quota must be rejected.");
    }

    [Fact]
    public async Task GlobalRateLimiter_WhenDifferentTenantCalls_ShouldHaveIndependentQuota()
    {
        // Arrange
        var options = CreateConfiguredOptions();
        var globalLimiter = options.GlobalLimiter!;

        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        var contextA = CreateTenantHttpContext(tenantA);
        var contextB = CreateTenantHttpContext(tenantB);

        // Exhaust Tenant A's 300 permits
        for (int i = 0; i < RateLimitingConfiguration.DefaultTenantPermitLimit; i++)
        {
            using var lease = await globalLimiter.AcquireAsync(contextA, permitCount: 1);
            lease.IsAcquired.Should().BeTrue();
        }

        // Verify Tenant A is blocked
        using (var leaseA = await globalLimiter.AcquireAsync(contextA, permitCount: 1))
        {
            leaseA.IsAcquired.Should().BeFalse("Tenant A must be rate-limited.");
        }

        // Tenant B must have completely independent quota and succeed immediately
        using (var leaseB = await globalLimiter.AcquireAsync(contextB, permitCount: 1))
        {
            leaseB.IsAcquired.Should().BeTrue("Tenant B's traffic must never be starved or impacted by Tenant A.");
        }
    }

    [Fact]
    public async Task GlobalRateLimiter_WhenHealthOrReadinessProbe_ShouldNotBeRateLimited()
    {
        // Arrange
        var options = CreateConfiguredOptions();
        var globalLimiter = options.GlobalLimiter!;

        var healthContext = new DefaultHttpContext();
        healthContext.Request.Path = "/health";

        var readinessContext = new DefaultHttpContext();
        readinessContext.Request.Path = "/api/v1/system/readiness";

        // Act & Assert: 500 consecutive health and readiness probes must all succeed without throttle
        for (int i = 0; i < 500; i++)
        {
            using var healthLease = await globalLimiter.AcquireAsync(healthContext, permitCount: 1);
            healthLease.IsAcquired.Should().BeTrue("Health probes must be exempted from rate limiting.");

            using var readinessLease = await globalLimiter.AcquireAsync(readinessContext, permitCount: 1);
            readinessLease.IsAcquired.Should().BeTrue("Readiness probes must be exempted from rate limiting.");
        }
    }

    [Fact]
    public async Task GlobalRateLimiter_WhenAnonymousClientExceedsQuota_ShouldReject()
    {
        // Arrange
        var options = CreateConfiguredOptions();
        var globalLimiter = options.GlobalLimiter!;

        var clientIp = "203.0.113.42";
        var context = CreateAnonymousHttpContext(clientIp);

        // Exhaust anonymous client quota (150 req/min)
        for (int i = 0; i < RateLimitingConfiguration.DefaultAnonymousPermitLimit; i++)
        {
            using var lease = await globalLimiter.AcquireAsync(context, permitCount: 1);
            lease.IsAcquired.Should().BeTrue();
        }

        // 151st request from same IP must be rejected
        using var rejectedLease = await globalLimiter.AcquireAsync(context, permitCount: 1);
        rejectedLease.IsAcquired.Should().BeFalse("Anonymous IP exceeding 150 req/min must be throttled.");
    }

    [Fact]
    public async Task GlobalRateLimiter_WhenDifferentAnonymousIps_ShouldHaveIndependentQuota()
    {
        // Arrange
        var options = CreateConfiguredOptions();
        var globalLimiter = options.GlobalLimiter!;

        var ip1 = "198.51.100.1";
        var ip2 = "198.51.100.2";

        var context1 = CreateAnonymousHttpContext(ip1);
        var context2 = CreateAnonymousHttpContext(ip2);

        // Exhaust IP 1
        for (int i = 0; i < RateLimitingConfiguration.DefaultAnonymousPermitLimit; i++)
        {
            using var lease = await globalLimiter.AcquireAsync(context1, permitCount: 1);
            lease.IsAcquired.Should().BeTrue();
        }

        using (var lease1 = await globalLimiter.AcquireAsync(context1, permitCount: 1))
        {
            lease1.IsAcquired.Should().BeFalse();
        }

        // IP 2 must not be impacted
        using (var lease2 = await globalLimiter.AcquireAsync(context2, permitCount: 1))
        {
            lease2.IsAcquired.Should().BeTrue("Distinct client IPs must have isolated rate limit partitions.");
        }
    }
}
