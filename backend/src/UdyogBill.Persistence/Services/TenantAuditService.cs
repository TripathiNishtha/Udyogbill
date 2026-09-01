using System.Text;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class TenantAuditService : ITenantAuditService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;

    public TenantAuditService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required to access audit logs.");
        }

        return tenantId;
    }

    public async Task<Result<PagedResult<AuditLogDto>>> GetTenantAuditLogsAsync(
        TenantAuditQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.AuditLogs
            .Where(a => a.TenantId == tenantId)
            .AsQueryable();

        if (request.UserId.HasValue && request.UserId.Value != Guid.Empty)
        {
            query = query.Where(a => a.UserId == request.UserId.Value);
        }

        if (request.Action.HasValue)
        {
            query = query.Where(a => a.Action == request.Action.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            var entityTerm = request.EntityName.Trim().ToLower();
            query = query.Where(a => a.EntityName.ToLower() == entityTerm);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim().ToLower();
            query = query.Where(a =>
                a.ActionName.ToLower().Contains(search) ||
                a.EntityName.ToLower().Contains(search) ||
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(search)) ||
                (a.EntityId != null && a.EntityId.ToLower().Contains(search)) ||
                (a.IpAddress != null && a.IpAddress.Contains(search)));
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(a => a.TimestampUtc <= request.ToDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.TenantId,
                null,
                a.UserId,
                a.UserEmail,
                a.Action,
                a.ActionName,
                a.EntityName,
                a.EntityId,
                a.OldValuesJson,
                a.NewValuesJson,
                a.IpAddress,
                a.UserAgent,
                a.TimestampUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<AuditLogDto>>.Success(
            PagedResult<AuditLogDto>.Create(items, request.PageNumber, request.PageSize, totalCount));
    }

    public async Task<Result<TenantAuditSummaryDto>> GetTenantAuditSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var logsQuery = _context.AuditLogs
            .Where(a => a.TenantId == tenantId);

        var totalLogs = await logsQuery.CountAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var todayUtc = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var weekUtc = todayUtc.AddDays(-7);

        var logsToday = await logsQuery
            .CountAsync(a => a.TimestampUtc >= todayUtc, cancellationToken);

        var logsThisWeek = await logsQuery
            .CountAsync(a => a.TimestampUtc >= weekUtc, cancellationToken);

        var rawActions = await logsQuery
            .Select(a => a.ActionName)
            .ToListAsync(cancellationToken);

        var actionCounts = rawActions
            .GroupBy(a => a)
            .Select(g => new AuditActionCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(6)
            .ToList();

        var rawUsers = await logsQuery
            .Where(a => !string.IsNullOrEmpty(a.UserEmail))
            .Select(a => new { a.UserEmail, a.TimestampUtc })
            .ToListAsync(cancellationToken);

        var topUsers = rawUsers
            .GroupBy(a => a.UserEmail!)
            .Select(g => new AuditUserActivityDto(
                g.Key,
                g.Count(),
                g.Max(x => x.TimestampUtc)
            ))
            .OrderByDescending(x => x.ActionCount)
            .Take(5)
            .ToList();

        var rawEntities = await logsQuery
            .Select(a => a.EntityName)
            .ToListAsync(cancellationToken);

        var topEntities = rawEntities
            .GroupBy(a => a)
            .Select(g => new AuditEntityCountDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToList();

        var summary = new TenantAuditSummaryDto(
            totalLogs,
            logsToday,
            logsThisWeek,
            actionCounts,
            topUsers,
            topEntities
        );

        return Result<TenantAuditSummaryDto>.Success(summary);
    }

    public async Task<Result<ExportFileResult>> ExportAuditLogsCsvAsync(
        TenantAuditQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.AuditLogs
            .Where(a => a.TenantId == tenantId)
            .AsQueryable();

        if (request.UserId.HasValue && request.UserId.Value != Guid.Empty)
            query = query.Where(a => a.UserId == request.UserId.Value);

        if (request.Action.HasValue)
            query = query.Where(a => a.Action == request.Action.Value);

        if (!string.IsNullOrWhiteSpace(request.EntityName))
            query = query.Where(a => a.EntityName.ToLower() == request.EntityName.Trim().ToLower());

        if (request.FromDate.HasValue)
            query = query.Where(a => a.TimestampUtc >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(a => a.TimestampUtc <= request.ToDate.Value);

        var logs = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Take(2000)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Timestamp (UTC),Action Type,Action Name,Entity Name,Entity ID,User Email,IP Address,Details");

        foreach (var log in logs)
        {
            var cleanNew = EscapeCsv(log.NewValuesJson ?? "");
            sb.AppendLine($"\"{log.TimestampUtc:yyyy-MM-dd HH:mm:ss}\",\"{log.Action}\",\"{EscapeCsv(log.ActionName)}\",\"{EscapeCsv(log.EntityName)}\",\"{EscapeCsv(log.EntityId ?? "")}\",\"{EscapeCsv(log.UserEmail ?? "System")}\",\"{EscapeCsv(log.IpAddress ?? "")}\",\"{cleanNew}\"");
        }

        var result = new ExportFileResult
        {
            FileName = $"Tenant_Audit_Log_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv",
            ContentType = "text/csv",
            FileBytes = Encoding.UTF8.GetBytes(sb.ToString())
        };

        return Result<ExportFileResult>.Success(result);
    }

    private static string EscapeCsv(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return input.Replace("\"", "\"\"").Replace("\r\n", " ").Replace("\n", " ");
    }
}
