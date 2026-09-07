using System;
using System.Diagnostics;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[AllowAnonymous]
[Route("api/v1/system")]
public class SystemReadinessController : BaseApiController
{
    private readonly AppDbContext _context;
    private static readonly DateTime AppStartTime = DateTime.UtcNow;

    public SystemReadinessController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("readiness")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReadiness(CancellationToken cancellationToken)
    {
        bool dbHealthy = false;
        string? dbError = null;

        try
        {
            dbHealthy = await _context.Database.CanConnectAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            dbHealthy = false;
            dbError = ex.Message;
        }

        var process = Process.GetCurrentProcess();
        var memoryUsedMb = Math.Round(process.WorkingSet64 / (1024.0 * 1024.0), 2);
        var uptime = DateTime.UtcNow - AppStartTime;

        var status = new
        {
            Status = dbHealthy ? "READY" : "DEGRADED",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            Database = new
            {
                IsConnected = dbHealthy,
                Provider = _context.Database.ProviderName,
                Error = dbError
            },
            SystemTelemetry = new
            {
                MemoryWorkingSetMb = memoryUsedMb,
                ThreadCount = process.Threads.Count,
                UptimeSeconds = (long)uptime.TotalSeconds,
                UptimeFormatted = $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s",
                ServerTimeUtc = DateTime.UtcNow
            },
            Compliance = new
            {
                Standard = "GST India (CGST/SGST/IGST/Cess)",
                EInvoice = "IRN / QR Code Ready",
                EWayBill = "NIC JSON Compliant",
                IndustryCapability = "Pharma Batch/H1 + Apparel Matrix + Manufacturing BOM + Retail Barcode"
            }
        };

        return Ok(status);
    }

    [HttpGet("version")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";

        return Ok(new
        {
            Application = "UdyogBill",
            Version = "2026.1.0-RELEASE",
            Build = version,
            TargetFramework = ".NET 9.0 (C# 13)",
            DatabaseTarget = "PostgreSQL 17.x with JSONB & Full-Text Search",
            FrontendTarget = "Next.js 15 (React 19, Tailwind CSS, TypeScript, IndexedDB)",
            OfflineArchitecture = "IndexedDB + Background Service Worker + Auto-Sync Engine",
            ReleaseStatus = "GA - Production Ready"
        });
    }
}
