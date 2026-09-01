using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISyncService
{
    Task<Result<SyncPushResultDto>> PushOfflineDataAsync(SyncPushRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<SyncPullResultDto>> PullDeltaDataAsync(SyncPullRequest request, CancellationToken cancellationToken = default);
    Task<Result<SyncStatusDto>> GetSyncStatusAsync(CancellationToken cancellationToken = default);
}
