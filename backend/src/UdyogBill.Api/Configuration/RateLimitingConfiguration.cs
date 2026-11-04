using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Configuration;

public static class RateLimitingConfiguration
{
    public const int DefaultTenantPermitLimit = 300;
    public const int DefaultAnonymousPermitLimit = 150;
    public const int AuthPolicyPermitLimit = 15;
    public const int PublicLeadPolicyPermitLimit = 10;

    public static void ConfigureRateLimiting(RateLimiterOptions options)
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                error = "Too many requests. Rate limit quota exceeded.",
                code = "TOO_MANY_REQUESTS"
            }, cancellationToken: token);
        };

        // Global Rate Limiter partitioned by TenantId (or client IP for unauthenticated callers)
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var path = httpContext.Request.Path;
            if (path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWithSegments("/api/v1/system/readiness", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWithSegments("/hubs", StringComparison.OrdinalIgnoreCase))
            {
                return RateLimitPartition.GetNoLimiter("health_and_hubs");
            }

            // 1. Check verified JWT tenant claim or request header
            var tenantId = httpContext.User.FindFirst("tenant_id")?.Value
                ?? httpContext.User.FindFirst(Claims.TenantId)?.Value
                ?? (httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var tid) ? tid.FirstOrDefault() : null);

            if (!string.IsNullOrWhiteSpace(tenantId) && Guid.TryParse(tenantId, out var parsedTenantId) && parsedTenantId != Guid.Empty)
            {
                return RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: $"tenant:{parsedTenantId}",
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = DefaultTenantPermitLimit,
                        Window = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 4,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            }

            // 2. Unauthenticated / Anonymous callers partitioned by client IP
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

            return RateLimitPartition.GetSlidingWindowLimiter(
                partitionKey: $"ip:{clientIp}",
                factory: _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = DefaultAnonymousPermitLimit,
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 4,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });

        // Partition AuthPolicy by client IP address to prevent platform-wide Denial of Service
        options.AddPolicy("AuthPolicy", httpContext =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: clientIp,
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = AuthPolicyPermitLimit,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });

        options.AddSlidingWindowLimiter("ApiPolicy", opt =>
        {
            opt.PermitLimit = DefaultTenantPermitLimit;
            opt.Window = TimeSpan.FromMinutes(1);
            opt.SegmentsPerWindow = 4;
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            opt.QueueLimit = 5;
        });

        // Partition PublicLeadPolicy by client IP address to prevent lead submission spam DoS
        options.AddPolicy("PublicLeadPolicy", httpContext =>
        {
            var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: clientIp,
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = PublicLeadPolicyPermitLimit,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                });
        });
    }
}
