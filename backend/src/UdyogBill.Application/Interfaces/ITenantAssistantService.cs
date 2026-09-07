using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ITenantAssistantService
{
    Task<Result<AssistantQueryResponse>> ProcessQueryAsync(
        AssistantQueryRequest request,
        Guid tenantId,
        Guid userId,
        bool isTenantAdmin,
        List<string> userPermissions,
        CancellationToken cancellationToken = default);

    Task<Result<List<QuickPromptGroup>>> GetQuickPromptsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);
}
