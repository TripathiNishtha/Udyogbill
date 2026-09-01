using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;

namespace UdyogBill.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly ILogger<AuditService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public AuditService(ILogger<AuditService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async Task LogAsync(AuditLog log, CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetService<IAppDbContext>();
            if (dbContext != null)
            {
                dbContext.Add(log);
                await dbContext.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Audit Event: {Action} on {EntityName} by User {UserEmail} (Tenant: {TenantId})",
                    log.ActionName, log.EntityName, log.UserEmail ?? "System", log.TenantId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist audit log for {ActionName} on {EntityName}", log.ActionName, log.EntityName);
        }
    }
}
