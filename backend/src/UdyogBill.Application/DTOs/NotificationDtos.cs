using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Notifications;

namespace UdyogBill.Application.DTOs;

// --- Gateway Configuration DTOs ---
public record NotificationGatewayConfigDto(
    Guid Id,
    string? WhatsAppApiToken,
    string? WhatsAppPhoneId,
    string? WhatsAppBusinessAccountId,
    bool IsWhatsAppEnabled,
    string? SmsProvider,
    string? SmsApiKey,
    string? SmsSenderId,
    bool IsSmsEnabled,
    string? SmtpHost,
    int SmtpPort,
    string? SmtpUsername,
    string? FromEmail,
    string? FromName,
    bool EnableSsl,
    bool IsEmailEnabled,
    bool IsWebhooksEnabled
);

public record UpdateNotificationGatewayConfigRequest(
    string? WhatsAppApiToken,
    string? WhatsAppPhoneId,
    string? WhatsAppBusinessAccountId,
    bool IsWhatsAppEnabled,
    string? SmsProvider,
    string? SmsApiKey,
    string? SmsSenderId,
    bool IsSmsEnabled,
    string? SmtpHost,
    int SmtpPort,
    string? SmtpUsername,
    string? SmtpPassword,
    string? FromEmail,
    string? FromName,
    bool EnableSsl,
    bool IsEmailEnabled,
    bool IsWebhooksEnabled
);

// --- Notification Templates DTOs ---
public record NotificationTemplateDto(
    Guid Id,
    NotificationChannel Channel,
    NotificationTriggerType TriggerType,
    string TemplateCode,
    string Name,
    string? SubjectTemplate,
    string BodyTemplate,
    string? VariablesJson,
    bool IsActive
);

public record CreateNotificationTemplateRequest(
    NotificationChannel Channel,
    NotificationTriggerType TriggerType,
    string TemplateCode,
    string Name,
    string? SubjectTemplate,
    string BodyTemplate,
    string? VariablesJson,
    bool IsActive = true
);

public record UpdateNotificationTemplateRequest(
    string Name,
    string? SubjectTemplate,
    string BodyTemplate,
    string? VariablesJson,
    bool IsActive
);

public record RenderTemplatePreviewRequest(
    string TemplateBody,
    Dictionary<string, string> Variables
);

public record RenderTemplatePreviewResultDto(
    string RenderedText
);

// --- Dispatch & Outbox Logs DTOs ---
public record DispatchNotificationRequest(
    NotificationChannel Channel,
    NotificationTriggerType TriggerType,
    string RecipientTarget,
    string? RecipientName,
    string? Subject = null,
    string? CustomBody = null,
    string? TemplateCode = null,
    Dictionary<string, string>? TemplateVariables = null,
    string? ReferenceEntityType = null,
    Guid? ReferenceEntityId = null
);

public record NotificationDispatchResultDto(
    Guid DispatchLogId,
    NotificationChannel Channel,
    string RecipientTarget,
    NotificationDeliveryStatus Status,
    string? ErrorMessage,
    DateTimeOffset SentAtUtc
);

public record NotificationDispatchLogDto(
    Guid Id,
    NotificationChannel Channel,
    NotificationTriggerType TriggerType,
    string RecipientTarget,
    string? RecipientName,
    string? Subject,
    string RenderedBody,
    NotificationDeliveryStatus Status,
    string? ErrorMessage,
    DateTimeOffset? SentAtUtc,
    string? ReferenceEntityType,
    Guid? ReferenceEntityId,
    DateTimeOffset CreatedAtUtc
);

// --- Webhooks DTOs ---
public record TenantWebhookEndpointDto(
    Guid Id,
    string EndpointUrl,
    string SecretKey,
    string SubscribedEventsJson,
    string? Description,
    bool IsActive,
    DateTimeOffset CreatedAtUtc
);

public record CreateWebhookEndpointRequest(
    string EndpointUrl,
    string? Description,
    List<string>? SubscribedEvents = null,
    bool IsActive = true
);

public record TriggerWebhookEventRequest(
    string EventName,
    object EventPayload
);

public record WebhookDispatchResultDto(
    string EndpointUrl,
    bool IsSuccess,
    int StatusCode,
    string? ResponseBody
);
