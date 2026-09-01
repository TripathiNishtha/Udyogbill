using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Notifications;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class NotificationHubService : INotificationHubService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public NotificationHubService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    #region 1. Gateway Configurations

    public async Task<Result<NotificationGatewayConfigDto>> GetGatewayConfigAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.NotificationGatewayConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            config = new NotificationGatewayConfig
            {
                TenantId = tenantId,
                WhatsAppPhoneId = "109823490182",
                IsWhatsAppEnabled = true,
                SmsProvider = "Fast2SMS",
                SmsSenderId = "UDYOGB",
                IsSmsEnabled = true,
                SmtpHost = "smtp.mailgun.org",
                SmtpPort = 587,
                FromEmail = "billing@udyogbill.com",
                FromName = "UdyogBill Invoicing",
                IsEmailEnabled = true,
                IsWebhooksEnabled = true
            };
            _context.NotificationGatewayConfigs.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result<NotificationGatewayConfigDto>.Success(new NotificationGatewayConfigDto(
            config.Id,
            config.WhatsAppApiToken,
            config.WhatsAppPhoneId,
            config.WhatsAppBusinessAccountId,
            config.IsWhatsAppEnabled,
            config.SmsProvider,
            config.SmsApiKey,
            config.SmsSenderId,
            config.IsSmsEnabled,
            config.SmtpHost,
            config.SmtpPort,
            config.SmtpUsername,
            config.FromEmail,
            config.FromName,
            config.EnableSsl,
            config.IsEmailEnabled,
            config.IsWebhooksEnabled
        ));
    }

    public async Task<Result<NotificationGatewayConfigDto>> UpdateGatewayConfigAsync(UpdateNotificationGatewayConfigRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.NotificationGatewayConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            config = new NotificationGatewayConfig { TenantId = tenantId };
            _context.NotificationGatewayConfigs.Add(config);
        }

        config.WhatsAppApiToken = request.WhatsAppApiToken;
        config.WhatsAppPhoneId = request.WhatsAppPhoneId;
        config.WhatsAppBusinessAccountId = request.WhatsAppBusinessAccountId;
        config.IsWhatsAppEnabled = request.IsWhatsAppEnabled;
        config.SmsProvider = request.SmsProvider;
        config.SmsApiKey = request.SmsApiKey;
        config.SmsSenderId = request.SmsSenderId;
        config.IsSmsEnabled = request.IsSmsEnabled;
        config.SmtpHost = request.SmtpHost;
        config.SmtpPort = request.SmtpPort;
        config.SmtpUsername = request.SmtpUsername;
        if (!string.IsNullOrWhiteSpace(request.SmtpPassword))
        {
            config.SmtpPassword = request.SmtpPassword;
        }
        config.FromEmail = request.FromEmail;
        config.FromName = request.FromName;
        config.EnableSsl = request.EnableSsl;
        config.IsEmailEnabled = request.IsEmailEnabled;
        config.IsWebhooksEnabled = request.IsWebhooksEnabled;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetGatewayConfigAsync(cancellationToken);
    }

    #endregion

    #region 2. Message Templates

    public async Task<Result<IReadOnlyList<NotificationTemplateDto>>> GetTemplatesAsync(NotificationChannel? channel = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.NotificationTemplates
            .Where(t => t.TenantId == tenantId && !t.IsDeleted);

        if (channel.HasValue)
        {
            query = query.Where(t => t.Channel == channel.Value);
        }

        var templates = await query
            .OrderBy(t => t.Channel)
            .ThenBy(t => t.Name)
            .Select(t => new NotificationTemplateDto(
                t.Id,
                t.Channel,
                t.TriggerType,
                t.TemplateCode,
                t.Name,
                t.SubjectTemplate,
                t.BodyTemplate,
                t.VariablesJson,
                t.IsActive
            ))
            .ToListAsync(cancellationToken);

        // Auto-seed standard templates if tenant has none
        if (templates.Count == 0)
        {
            var defaultTemplates = new List<NotificationTemplate>
            {
                new()
                {
                    TenantId = tenantId,
                    Channel = NotificationChannel.WhatsApp,
                    TriggerType = NotificationTriggerType.InvoiceCreated,
                    TemplateCode = "WA_INV_CREATED",
                    Name = "WhatsApp Sales Invoice Receipt",
                    BodyTemplate = "Dear {{CustomerName}}, Thank you for your purchase! Your invoice #{{InvoiceNumber}} of ₹{{TotalAmount}} has been generated. View bill: {{InvoiceLink}}. Regards, {{StoreName}}",
                    VariablesJson = "[\"CustomerName\",\"InvoiceNumber\",\"TotalAmount\",\"InvoiceLink\",\"StoreName\"]",
                    IsActive = true
                },
                new()
                {
                    TenantId = tenantId,
                    Channel = NotificationChannel.SMS,
                    TriggerType = NotificationTriggerType.PaymentReceived,
                    TemplateCode = "SMS_PAY_RECEIVED",
                    Name = "SMS Payment Confirmation",
                    BodyTemplate = "Received ₹{{Amount}} from {{CustomerName}} via {{PaymentMode}} for Bill #{{InvoiceNumber}}. Outstanding balance: ₹{{RemainingBalance}}. - {{StoreName}}",
                    VariablesJson = "[\"Amount\",\"CustomerName\",\"PaymentMode\",\"InvoiceNumber\",\"RemainingBalance\",\"StoreName\"]",
                    IsActive = true
                },
                new()
                {
                    TenantId = tenantId,
                    Channel = NotificationChannel.Email,
                    TriggerType = NotificationTriggerType.InvoiceCreated,
                    TemplateCode = "EMAIL_TAX_INVOICE",
                    Name = "Email Tax Invoice PDF Dispatch",
                    SubjectTemplate = "Tax Invoice #{{InvoiceNumber}} from {{StoreName}}",
                    BodyTemplate = "<p>Dear {{CustomerName}},</p><p>Please find attached your Tax Invoice <strong>#{{InvoiceNumber}}</strong> dated {{InvoiceDate}} for the total sum of <strong>₹{{TotalAmount}}</strong>.</p><p>Thank you for choosing {{StoreName}}!</p>",
                    VariablesJson = "[\"CustomerName\",\"InvoiceNumber\",\"InvoiceDate\",\"TotalAmount\",\"StoreName\"]",
                    IsActive = true
                },
                new()
                {
                    TenantId = tenantId,
                    Channel = NotificationChannel.WhatsApp,
                    TriggerType = NotificationTriggerType.PaymentReminder,
                    TemplateCode = "WA_PAY_DUE_REMINDER",
                    Name = "WhatsApp Payment Due Reminder",
                    BodyTemplate = "Dear {{CustomerName}}, gentle reminder that payment of ₹{{DueAmount}} for Invoice #{{InvoiceNumber}} is due on {{DueDate}}. Please pay via UPI: {{UpiId}}. - {{StoreName}}",
                    VariablesJson = "[\"CustomerName\",\"DueAmount\",\"InvoiceNumber\",\"DueDate\",\"UpiId\",\"StoreName\"]",
                    IsActive = true
                }
            };

            _context.NotificationTemplates.AddRange(defaultTemplates);
            await _context.SaveChangesAsync(cancellationToken);

            return await GetTemplatesAsync(channel, cancellationToken);
        }

        return Result<IReadOnlyList<NotificationTemplateDto>>.Success(templates);
    }

    public async Task<Result<Guid>> CreateTemplateAsync(CreateNotificationTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var template = new NotificationTemplate
        {
            TenantId = tenantId,
            Channel = request.Channel,
            TriggerType = request.TriggerType,
            TemplateCode = request.TemplateCode.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            SubjectTemplate = request.SubjectTemplate?.Trim(),
            BodyTemplate = request.BodyTemplate.Trim(),
            VariablesJson = request.VariablesJson,
            IsActive = request.IsActive
        };

        _context.NotificationTemplates.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(template.Id);
    }

    public async Task<Result<NotificationTemplateDto>> UpdateTemplateAsync(Guid templateId, UpdateNotificationTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var template = await _context.NotificationTemplates
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == templateId && !t.IsDeleted, cancellationToken);

        if (template == null)
        {
            return Result<NotificationTemplateDto>.Failure("Notification template not found.", "NOT_FOUND");
        }

        template.Name = request.Name.Trim();
        template.SubjectTemplate = request.SubjectTemplate?.Trim();
        template.BodyTemplate = request.BodyTemplate.Trim();
        template.VariablesJson = request.VariablesJson;
        template.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<NotificationTemplateDto>.Success(new NotificationTemplateDto(
            template.Id,
            template.Channel,
            template.TriggerType,
            template.TemplateCode,
            template.Name,
            template.SubjectTemplate,
            template.BodyTemplate,
            template.VariablesJson,
            template.IsActive
        ));
    }

    public Task<Result<RenderTemplatePreviewResultDto>> RenderPreviewAsync(RenderTemplatePreviewRequest request, CancellationToken cancellationToken = default)
    {
        var rendered = SubstituteVariables(request.TemplateBody, request.Variables);
        return Task.FromResult(Result<RenderTemplatePreviewResultDto>.Success(new RenderTemplatePreviewResultDto(rendered)));
    }

    private static string SubstituteVariables(string template, Dictionary<string, string>? variables)
    {
        if (string.IsNullOrEmpty(template) || variables == null || variables.Count == 0)
        {
            return template ?? string.Empty;
        }

        var sb = new StringBuilder(template);
        foreach (var kv in variables)
        {
            sb.Replace($"{{{{{kv.Key}}}}}", kv.Value);
        }
        return sb.ToString();
    }

    #endregion

    #region 3. Dispatch Engine & Outbox Telemetry

    public async Task<Result<NotificationDispatchResultDto>> DispatchNotificationAsync(
        DispatchNotificationRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (string.IsNullOrWhiteSpace(request.RecipientTarget))
        {
            return Result<NotificationDispatchResultDto>.Failure("Recipient target (phone/email) is required.", "INVALID_RECIPIENT");
        }

        string renderedBody = request.CustomBody ?? string.Empty;
        string? renderedSubject = request.Subject;

        // If template code is provided, fetch and render
        if (!string.IsNullOrWhiteSpace(request.TemplateCode))
        {
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.TemplateCode == request.TemplateCode.Trim().ToUpperInvariant() && !t.IsDeleted, cancellationToken);

            if (template != null)
            {
                renderedBody = SubstituteVariables(template.BodyTemplate, request.TemplateVariables);
                if (!string.IsNullOrEmpty(template.SubjectTemplate))
                {
                    renderedSubject = SubstituteVariables(template.SubjectTemplate, request.TemplateVariables);
                }
            }
        }

        // Simulate Gateway Dispatch Execution
        var log = new NotificationDispatchLog
        {
            TenantId = tenantId,
            Channel = request.Channel,
            TriggerType = request.TriggerType,
            RecipientTarget = request.RecipientTarget.Trim(),
            RecipientName = request.RecipientName?.Trim(),
            Subject = renderedSubject,
            RenderedBody = renderedBody,
            Status = NotificationDeliveryStatus.Delivered,
            ErrorMessage = null,
            SentAtUtc = DateTimeOffset.UtcNow,
            ReferenceEntityType = request.ReferenceEntityType,
            ReferenceEntityId = request.ReferenceEntityId,
            MetadataJson = request.TemplateVariables != null ? JsonSerializer.Serialize(request.TemplateVariables) : null
        };

        _context.NotificationDispatchLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "DispatchNotification",
            EntityName = "NotificationDispatchLog",
            EntityId = log.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { Channel = request.Channel.ToString(), request.RecipientTarget, log.Status }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<NotificationDispatchResultDto>.Success(new NotificationDispatchResultDto(
            log.Id,
            log.Channel,
            log.RecipientTarget,
            log.Status,
            log.ErrorMessage,
            log.SentAtUtc ?? DateTimeOffset.UtcNow
        ));
    }

    public async Task<Result<PagedResult<NotificationDispatchLogDto>>> GetDispatchLogsAsync(
        NotificationChannel? channel = null,
        NotificationDeliveryStatus? status = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.NotificationDispatchLogs
            .Where(l => l.TenantId == tenantId && !l.IsDeleted);

        if (channel.HasValue)
        {
            query = query.Where(l => l.Channel == channel.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(l => l.Status == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new NotificationDispatchLogDto(
                l.Id,
                l.Channel,
                l.TriggerType,
                l.RecipientTarget,
                l.RecipientName,
                l.Subject,
                l.RenderedBody,
                l.Status,
                l.ErrorMessage,
                l.SentAtUtc,
                l.ReferenceEntityType,
                l.ReferenceEntityId,
                l.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<NotificationDispatchLogDto>>.Success(
            PagedResult<NotificationDispatchLogDto>.Create(items, pageNumber, pageSize, totalCount));
    }

    #endregion

    #region 4. Webhooks Hub

    public async Task<Result<IReadOnlyList<TenantWebhookEndpointDto>>> GetWebhookEndpointsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var endpoints = await _context.TenantWebhookEndpoints
            .Where(w => w.TenantId == tenantId && !w.IsDeleted)
            .OrderByDescending(w => w.CreatedAtUtc)
            .Select(w => new TenantWebhookEndpointDto(
                w.Id,
                w.EndpointUrl,
                w.SecretKey,
                w.SubscribedEventsJson,
                w.Description,
                w.IsActive,
                w.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<TenantWebhookEndpointDto>>.Success(endpoints);
    }

    public async Task<Result<Guid>> CreateWebhookEndpointAsync(CreateWebhookEndpointRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (string.IsNullOrWhiteSpace(request.EndpointUrl) || !Uri.TryCreate(request.EndpointUrl, UriKind.Absolute, out _))
        {
            return Result<Guid>.Failure("A valid absolute HTTP/HTTPS webhook URL is required.", "INVALID_URL");
        }

        // Generate 32-char hex secret key
        var secretBytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(secretBytes);
        }
        var secretKey = "whsec_" + Convert.ToHexString(secretBytes).ToLowerInvariant();

        var eventsJson = request.SubscribedEvents != null && request.SubscribedEvents.Count > 0
            ? JsonSerializer.Serialize(request.SubscribedEvents)
            : "[\"invoice.created\",\"payment.received\"]";

        var webhook = new TenantWebhookEndpoint
        {
            TenantId = tenantId,
            EndpointUrl = request.EndpointUrl.Trim(),
            SecretKey = secretKey,
            SubscribedEventsJson = eventsJson,
            Description = request.Description?.Trim(),
            IsActive = request.IsActive
        };

        _context.TenantWebhookEndpoints.Add(webhook);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(webhook.Id);
    }

    public async Task<Result<IReadOnlyList<WebhookDispatchResultDto>>> DispatchWebhookEventAsync(string eventName, object eventPayload, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var endpoints = await _context.TenantWebhookEndpoints
            .Where(w => w.TenantId == tenantId && w.IsActive && !w.IsDeleted)
            .ToListAsync(cancellationToken);

        var results = new List<WebhookDispatchResultDto>();

        foreach (var ep in endpoints)
        {
            // Simulate HMAC-SHA256 signature & successful HTTP 200 delivery
            results.Add(new WebhookDispatchResultDto(
                ep.EndpointUrl,
                true,
                200,
                $"{{\"status\":\"received\",\"event\":\"{eventName}\"}}"
            ));
        }

        return Result<IReadOnlyList<WebhookDispatchResultDto>>.Success(results);
    }

    #endregion
}
