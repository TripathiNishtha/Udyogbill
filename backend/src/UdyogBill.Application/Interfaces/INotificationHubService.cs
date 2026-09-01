using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Notifications;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface INotificationHubService
{
    // Gateway Configuration
    Task<Result<NotificationGatewayConfigDto>> GetGatewayConfigAsync(CancellationToken cancellationToken = default);
    Task<Result<NotificationGatewayConfigDto>> UpdateGatewayConfigAsync(UpdateNotificationGatewayConfigRequest request, CancellationToken cancellationToken = default);

    // Templates
    Task<Result<IReadOnlyList<NotificationTemplateDto>>> GetTemplatesAsync(NotificationChannel? channel = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateTemplateAsync(CreateNotificationTemplateRequest request, CancellationToken cancellationToken = default);
    Task<Result<NotificationTemplateDto>> UpdateTemplateAsync(Guid templateId, UpdateNotificationTemplateRequest request, CancellationToken cancellationToken = default);
    Task<Result<RenderTemplatePreviewResultDto>> RenderPreviewAsync(RenderTemplatePreviewRequest request, CancellationToken cancellationToken = default);

    // Dispatch Engine & Outbox Telemetry
    Task<Result<NotificationDispatchResultDto>> DispatchNotificationAsync(DispatchNotificationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<NotificationDispatchLogDto>>> GetDispatchLogsAsync(NotificationChannel? channel = null, NotificationDeliveryStatus? status = null, int pageNumber = 1, int pageSize = 50, CancellationToken cancellationToken = default);

    // Webhooks Hub
    Task<Result<IReadOnlyList<TenantWebhookEndpointDto>>> GetWebhookEndpointsAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateWebhookEndpointAsync(CreateWebhookEndpointRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<WebhookDispatchResultDto>>> DispatchWebhookEventAsync(string eventName, object eventPayload, CancellationToken cancellationToken = default);
}
