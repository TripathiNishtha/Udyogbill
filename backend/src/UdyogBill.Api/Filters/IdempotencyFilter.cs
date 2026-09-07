using System;
using System.Collections.Concurrent;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Common;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class IdempotentAttribute : TypeFilterAttribute
{
    public IdempotentAttribute() : base(typeof(IdempotencyFilter))
    {
    }
}

public class IdempotencyFilter : IAsyncActionFilter
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _inFlightLocks = new();
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public IdempotencyFilter(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out var headerVal) ||
            string.IsNullOrWhiteSpace(headerVal))
        {
            await next();
            return;
        }

        var key = headerVal.ToString().Trim();
        var tenantId = _tenantContext.TenantId;
        if (tenantId == Guid.Empty)
        {
            await next();
            return;
        }

        // Enable buffering to safely read and compute payload hash
        context.HttpContext.Request.EnableBuffering();
        string bodyText = string.Empty;
        if (context.HttpContext.Request.Body.CanRead)
        {
            using var reader = new StreamReader(context.HttpContext.Request.Body, Encoding.UTF8, leaveOpen: true);
            bodyText = await reader.ReadToEndAsync();
            context.HttpContext.Request.Body.Position = 0;
        }

        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(bodyText));
        var payloadHash = Convert.ToHexString(hashBytes);

        var lockKey = $"{tenantId}:{key}";
        var semaphore = _inFlightLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync();

        try
        {
            // Check existing cached result inside lock to prevent concurrent double-execution
            var existing = await _db.IdempotentRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.IdempotencyKey == key);

            if (existing != null && existing.ExpiresAtUtc > DateTimeOffset.UtcNow)
            {
                // Conflict detection: Reject if same key is used with altered payload
                if (!string.IsNullOrEmpty(existing.RequestHash) && !string.Equals(existing.RequestHash, payloadHash, StringComparison.OrdinalIgnoreCase))
                {
                    context.Result = new ObjectResult(new
                    {
                        error = "Idempotency key was previously used with a different request payload.",
                        code = "IDEMPOTENCY_CONFLICT"
                    })
                    {
                        StatusCode = StatusCodes.Status409Conflict
                    };
                    return;
                }

                context.Result = new ContentResult
                {
                    StatusCode = existing.StatusCode,
                    Content = existing.ResponseBody,
                    ContentType = "application/json"
                };
                return;
            }

            var executedContext = await next();

            if (executedContext.Result is ObjectResult objResult && (objResult.StatusCode == null || (objResult.StatusCode >= 200 && objResult.StatusCode < 300)))
            {
                try
                {
                    int code = objResult.StatusCode ?? 200;
                    string responseJson = JsonSerializer.Serialize(objResult.Value);

                    var record = new IdempotentRequest
                    {
                        TenantId = tenantId,
                        IdempotencyKey = key,
                        RequestPath = context.HttpContext.Request.Path,
                        HttpMethod = context.HttpContext.Request.Method,
                        RequestHash = payloadHash,
                        StatusCode = code,
                        ResponseBody = responseJson,
                        ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(7)
                    };

                    _db.IdempotentRequests.Add(record);
                    await _db.SaveChangesAsync();
                }
                catch
                {
                    // In case of duplicate key collision from parallel instances, first write wins
                }
            }
        }
        finally
        {
            semaphore.Release();
            _inFlightLocks.TryRemove(lockKey, out _);
        }
    }
}
