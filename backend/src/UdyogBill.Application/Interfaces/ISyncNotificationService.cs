using System;
using System.Threading;
using System.Threading.Tasks;

namespace UdyogBill.Application.Interfaces;

public interface ISyncNotificationService
{
    Task NotifyTenantAsync(Guid tenantId, string eventType, object? payload = null, CancellationToken cancellationToken = default);
}