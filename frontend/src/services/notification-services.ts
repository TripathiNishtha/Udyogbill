import { apiClient } from "@/lib/api-client";

export interface GatewayConfig {
  id: string;
  whatsAppApiToken?: string;
  whatsAppPhoneId?: string;
  whatsAppBusinessAccountId?: string;
  isWhatsAppEnabled: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  smsSenderId?: string;
  isSmsEnabled: boolean;
  smtpHost?: string;
  smtpPort: number;
  smtpUsername?: string;
  fromEmail?: string;
  fromName?: string;
  enableSsl: boolean;
  isEmailEnabled: boolean;
  isWebhooksEnabled: boolean;
}

export interface NotificationTemplate {
  id: string;
  channel: number; // 1: WhatsApp, 2: SMS, 3: Email, 4: Webhook
  triggerType: number; // 1: InvoiceCreated, 2: PaymentReceived, 3: PaymentReminder, etc.
  templateCode: string;
  name: string;
  subjectTemplate?: string;
  bodyTemplate: string;
  variablesJson?: string;
  isActive: boolean;
}

export interface NotificationDispatchLog {
  id: string;
  channel: number;
  triggerType: number;
  recipientTarget: string;
  recipientName?: string;
  subject?: string;
  renderedBody: string;
  status: number; // 1: Queued, 2: Sent, 3: Delivered, 4: Failed
  errorMessage?: string;
  sentAtUtc?: string;
  referenceEntityType?: string;
  referenceEntityId?: string;
  createdAtUtc: string;
}

export interface TenantWebhookEndpoint {
  id: string;
  endpointUrl: string;
  secretKey: string;
  subscribedEventsJson: string;
  description?: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface DispatchNotificationInput {
  channel: number;
  triggerType: number;
  recipientTarget: string;
  recipientName?: string;
  subject?: string;
  customBody?: string;
  templateCode?: string;
  templateVariables?: Record<string, string>;
  referenceEntityType?: string;
  referenceEntityId?: string;
}

export interface DispatchResult {
  dispatchLogId: string;
  channel: number;
  recipientTarget: string;
  status: number;
  errorMessage?: string;
  sentAtUtc: string;
}

export const notificationService = {
  // Gateways
  async getGatewayConfig(): Promise<GatewayConfig> {
    const response = await apiClient.get<GatewayConfig>("/tenant/notifications/gateways");
    return response.data;
  },

  async updateGatewayConfig(input: Partial<GatewayConfig> & { smtpPassword?: string }): Promise<GatewayConfig> {
    const response = await apiClient.put<GatewayConfig>("/tenant/notifications/gateways", input);
    return response.data;
  },

  // Templates
  async getTemplates(channel?: number): Promise<NotificationTemplate[]> {
    const params = channel !== undefined ? `?channel=${channel}` : "";
    const response = await apiClient.get<NotificationTemplate[]>(`/tenant/notifications/templates${params}`);
    return response.data;
  },

  async createTemplate(input: Omit<NotificationTemplate, "id">): Promise<string> {
    const response = await apiClient.post<string>("/tenant/notifications/templates", input);
    return response.data;
  },

  async updateTemplate(id: string, input: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await apiClient.put<NotificationTemplate>(`/tenant/notifications/templates/${id}`, input);
    return response.data;
  },

  async renderPreview(input: { templateBody: string; variables: Record<string, string> }): Promise<string> {
    const response = await apiClient.post<{ renderedText: string }>("/tenant/notifications/templates/preview", input);
    return response.data.renderedText;
  },

  // Dispatch & Logs
  async dispatchNotification(input: DispatchNotificationInput): Promise<DispatchResult> {
    const response = await apiClient.post<DispatchResult>("/tenant/notifications/dispatch", input);
    return response.data;
  },

  async getLogs(params?: { channel?: number; status?: number; pageNumber?: number; pageSize?: number }): Promise<{ items: NotificationDispatchLog[]; totalCount: number }> {
    const query = new URLSearchParams();
    if (params?.channel) query.append("channel", params.channel.toString());
    if (params?.status) query.append("status", params.status.toString());
    if (params?.pageNumber) query.append("pageNumber", params.pageNumber.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

    const response = await apiClient.get<{ items: NotificationDispatchLog[]; totalCount: number }>(`/tenant/notifications/logs?${query.toString()}`);
    return response.data;
  },

  // Webhooks
  async getWebhooks(): Promise<TenantWebhookEndpoint[]> {
    const response = await apiClient.get<TenantWebhookEndpoint[]>("/tenant/notifications/webhooks");
    return response.data;
  },

  async createWebhook(input: { endpointUrl: string; description?: string; subscribedEvents?: string[] }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/notifications/webhooks", input);
    return response.data;
  },

  async triggerWebhook(input: { eventName: string; eventPayload: any }): Promise<any[]> {
    const response = await apiClient.post<any[]>("/tenant/notifications/webhooks/trigger", input);
    return response.data;
  },
};
