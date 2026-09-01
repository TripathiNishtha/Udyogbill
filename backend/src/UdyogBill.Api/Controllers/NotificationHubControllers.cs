using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Notifications;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/notifications")]
public class TenantNotificationHubController : BaseApiController
{
    private readonly INotificationHubService _notificationService;

    public TenantNotificationHubController(INotificationHubService notificationService)
    {
        _notificationService = notificationService;
    }

    #region Gateways

    [HttpGet("gateways")]
    [ProducesResponseType(typeof(NotificationGatewayConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGatewayConfig(CancellationToken cancellationToken)
    {
        var result = await _notificationService.GetGatewayConfigAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("gateways")]
    [ProducesResponseType(typeof(NotificationGatewayConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateGatewayConfig([FromBody] UpdateNotificationGatewayConfigRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.UpdateGatewayConfigAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Templates

    [HttpGet("templates")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationTemplateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTemplates([FromQuery] NotificationChannel? channel, CancellationToken cancellationToken)
    {
        var result = await _notificationService.GetTemplatesAsync(channel, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("templates")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateNotificationTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.CreateTemplateAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("templates/{templateId:guid}")]
    [ProducesResponseType(typeof(NotificationTemplateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateTemplate(Guid templateId, [FromBody] UpdateNotificationTemplateRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.UpdateTemplateAsync(templateId, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("templates/preview")]
    [ProducesResponseType(typeof(RenderTemplatePreviewResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RenderPreview([FromBody] RenderTemplatePreviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.RenderPreviewAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Dispatch Engine & Logs

    [HttpPost("dispatch")]
    [ProducesResponseType(typeof(NotificationDispatchResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DispatchNotification([FromBody] DispatchNotificationRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _notificationService.DispatchNotificationAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("logs")]
    [ProducesResponseType(typeof(PagedResult<NotificationDispatchLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDispatchLogs(
        [FromQuery] NotificationChannel? channel,
        [FromQuery] NotificationDeliveryStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _notificationService.GetDispatchLogsAsync(channel, status, pageNumber, pageSize, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region Webhooks Hub

    [HttpGet("webhooks")]
    [ProducesResponseType(typeof(IReadOnlyList<TenantWebhookEndpointDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWebhooks(CancellationToken cancellationToken)
    {
        var result = await _notificationService.GetWebhookEndpointsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("webhooks")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateWebhook([FromBody] CreateWebhookEndpointRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.CreateWebhookEndpointAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("webhooks/trigger")]
    [ProducesResponseType(typeof(IReadOnlyList<WebhookDispatchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TriggerWebhookEvent([FromBody] TriggerWebhookEventRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.DispatchWebhookEventAsync(request.EventName, request.EventPayload, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
