using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Infrastructure.Hubs;

[Authorize]
public class SyncHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var tenantIdClaim = Context.User?.FindFirst(Claims.TenantId)?.Value
            ?? Context.User?.FindFirst("TenantId")?.Value
            ?? Context.User?.FindFirst("tenant_id")?.Value;

        if (Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            var groupName = $"tenant_{tenantId:D}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var tenantIdClaim = Context.User?.FindFirst(Claims.TenantId)?.Value
            ?? Context.User?.FindFirst("TenantId")?.Value
            ?? Context.User?.FindFirst("tenant_id")?.Value;

        if (Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            var groupName = $"tenant_{tenantId:D}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
