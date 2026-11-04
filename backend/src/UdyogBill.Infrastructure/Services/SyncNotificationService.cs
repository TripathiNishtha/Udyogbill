using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using UdyogBill.Application.Interfaces;
using UdyogBill.Infrastructure.Hubs;

namespace UdyogBill.Infrastructure.Services;

public class SyncNotificationService : ISyncNotificationService
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SyncNotificationService(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyTenantAsync(Guid tenantId, string eventType, object? payload = null, CancellationToken cancellationToken = default)
    {
        var groupName = $"tenant_{tenantId:D}";
        await _hubContext.Clients.Group(groupName).SendAsync("SyncEvent", new
        {
            EventType = eventType,
            TenantId = tenantId,
            Timestamp = DateTime.UtcNow,
            Payload = payload
        }, cancellationToken);
    }
}
