using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public record TenantAuditQueryRequest(
    Guid? UserId = null,
    AuditActionType? Action = null,
    string? EntityName = null,
    string? SearchTerm = null,
    DateTimeOffset? FromDate = null,
    DateTimeOffset? ToDate = null,
    int PageNumber = 1,
    int PageSize = 25
);

public record TenantAuditSummaryDto(
    int TotalLogs,
    int LogsToday,
    int LogsThisWeek,
    IReadOnlyList<AuditActionCountDto> ActionDistribution,
    IReadOnlyList<AuditUserActivityDto> TopActiveUsers,
    IReadOnlyList<AuditEntityCountDto> TopEntities
);

public record AuditActionCountDto(string ActionName, int Count);
public record AuditUserActivityDto(string UserEmail, int ActionCount, DateTimeOffset LastActivityUtc);
public record AuditEntityCountDto(string EntityName, int Count);

public interface ITenantAuditService
{
    Task<Result<PagedResult<AuditLogDto>>> GetTenantAuditLogsAsync(TenantAuditQueryRequest request, CancellationToken cancellationToken = default);
    Task<Result<TenantAuditSummaryDto>> GetTenantAuditSummaryAsync(CancellationToken cancellationToken = default);
    Task<Result<ExportFileResult>> ExportAuditLogsCsvAsync(TenantAuditQueryRequest request, CancellationToken cancellationToken = default);
}
