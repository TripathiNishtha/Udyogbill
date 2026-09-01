using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Notifications;

public enum NotificationChannel
{
    WhatsApp = 1,
    SMS = 2,
    Email = 3,
    Webhook = 4
}

public enum NotificationTriggerType
{
    InvoiceCreated = 1,
    PaymentReceived = 2,
    PaymentReminder = 3,
    DispatchTracking = 4,
    LoyaltyAccrual = 5,
    CustomMarketing = 6
}

public enum NotificationDeliveryStatus
{
    Queued = 1,
    Sent = 2,
    Delivered = 3,
    Failed = 4
}

public class NotificationGatewayConfig : BaseTenantAuditableEntity
{
    // WhatsApp Cloud API
    public string? WhatsAppApiToken { get; set; }
    public string? WhatsAppPhoneId { get; set; }
    public string? WhatsAppBusinessAccountId { get; set; }
    public bool IsWhatsAppEnabled { get; set; } = false;

    // SMS Gateway (Fast2SMS, MSG91, Twilio)
    public string? SmsProvider { get; set; } = "Fast2SMS";
    public string? SmsApiKey { get; set; }
    public string? SmsSenderId { get; set; } = "UDYOGB";
    public bool IsSmsEnabled { get; set; } = false;

    // SMTP / Email Provider
    public string? SmtpHost { get; set; } = "smtp.mailgun.org";
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
    public string? FromEmail { get; set; } = "billing@udyogbill.com";
    public string? FromName { get; set; } = "UdyogBill Invoicing";
    public bool EnableSsl { get; set; } = true;
    public bool IsEmailEnabled { get; set; } = false;

    // Webhooks
    public bool IsWebhooksEnabled { get; set; } = true;
}

public class NotificationTemplate : BaseTenantAuditableEntity
{
    public NotificationChannel Channel { get; set; } = NotificationChannel.WhatsApp;
    public NotificationTriggerType TriggerType { get; set; } = NotificationTriggerType.InvoiceCreated;

    public string TemplateCode { get; set; } = string.Empty; // e.g. "WA_INV_CREATED"
    public string Name { get; set; } = string.Empty;

    public string? SubjectTemplate { get; set; } // for Email
    public string BodyTemplate { get; set; } = string.Empty; // Template text with {{Tokens}}

    public string? VariablesJson { get; set; } // JSON array of available tokens

    public bool IsActive { get; set; } = true;
}

public class NotificationDispatchLog : BaseTenantAuditableEntity
{
    public NotificationChannel Channel { get; set; }
    public NotificationTriggerType TriggerType { get; set; }

    public string RecipientTarget { get; set; } = string.Empty; // Phone number or Email address
    public string? RecipientName { get; set; }

    public string? Subject { get; set; }
    public string RenderedBody { get; set; } = string.Empty;

    public NotificationDeliveryStatus Status { get; set; } = NotificationDeliveryStatus.Sent;
    public string? ErrorMessage { get; set; }

    public DateTimeOffset? SentAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public string? ReferenceEntityType { get; set; } // "SalesInvoice", "PaymentReceipt"
    public Guid? ReferenceEntityId { get; set; }

    public string? MetadataJson { get; set; }
}

public class TenantWebhookEndpoint : BaseTenantAuditableEntity
{
    public string EndpointUrl { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty; // For HMAC-SHA256 signature verification

    public string SubscribedEventsJson { get; set; } = "[\"invoice.created\",\"payment.received\"]";
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}
