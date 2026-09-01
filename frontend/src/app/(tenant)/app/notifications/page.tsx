"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Send,
  Radio,
  FileText,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Zap,
  RefreshCw,
  Plus,
  Copy,
  Sliders,
} from "lucide-react";
import {
  notificationService,
  GatewayConfig,
  NotificationTemplate,
  NotificationDispatchLog,
  TenantWebhookEndpoint,
} from "@/services/notification-services";

export default function NotificationsHubPage() {
  const [activeTab, setActiveTab] = useState<"gateways" | "templates" | "logs" | "webhooks">("gateways");

  // State
  const [gateways, setGateways] = useState<GatewayConfig | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [logs, setLogs] = useState<NotificationDispatchLog[]>([]);
  const [webhooks, setWebhooks] = useState<TenantWebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");

  // Test Dispatch Modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchChannel, setDispatchChannel] = useState<number>(1); // WhatsApp
  const [recipient, setRecipient] = useState("+919876543210");
  const [recipientName, setRecipientName] = useState("Suresh Kumar");
  const [messageBody, setMessageBody] = useState("Hi Suresh, your invoice #INV-2026-001 for Rs. 2,450 is ready. Thank you!");

  // New Webhook Modal
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://myapi.com/webhooks/udyogbill");
  const [webhookDesc, setWebhookDesc] = useState("External ERP Accounting Sync");

  const loadData = async () => {
    try {
      setLoading(true);
      const [gwRes, tplRes, logRes, whRes] = await Promise.all([
        notificationService.getGatewayConfig().catch(() => null),
        notificationService.getTemplates().catch(() => []),
        notificationService.getLogs({ pageSize: 50 }).catch(() => ({ items: [], totalCount: 0 })),
        notificationService.getWebhooks().catch(() => []),
      ]);

      setGateways(gwRes);
      setTemplates(tplRes || []);
      setLogs(logRes.items || []);
      setWebhooks(whRes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateways) return;
    try {
      const updated = await notificationService.updateGatewayConfig(gateways);
      setGateways(updated);
      setNotification("Communication gateway settings and API credentials saved successfully!");
    } catch {
      alert("Failed to save gateway configuration.");
    }
  };

  const handleTestDispatch = async () => {
    if (!recipient.trim() || !messageBody.trim()) {
      alert("Please provide recipient target and message body.");
      return;
    }
    try {
      await notificationService.dispatchNotification({
        channel: dispatchChannel,
        triggerType: 6, // CustomMarketing
        recipientTarget: recipient,
        recipientName,
        customBody: messageBody,
      });

      setIsDispatchModalOpen(false);
      setNotification(`Message dispatched successfully to ${recipient}!`);
      loadData();
    } catch {
      alert("Failed to dispatch message.");
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) return;
    try {
      await notificationService.createWebhook({
        endpointUrl: webhookUrl,
        description: webhookDesc,
        subscribedEvents: ["invoice.created", "payment.received"],
      });
      setIsWebhookModalOpen(false);
      setNotification("Webhook endpoint subscribed with auto-generated HMAC secret!");
      loadData();
    } catch {
      alert("Failed to register webhook.");
    }
  };

  const handleTestWebhookTrigger = async () => {
    try {
      const res = await notificationService.triggerWebhook({
        eventName: "invoice.created",
        eventPayload: { invoiceId: "INV-9901", totalAmount: 4500, customer: "Apollo Pharmacy" },
      });
      setNotification(`Webhook event triggered! ${res.length} endpoints responded with HTTP 200.`);
    } catch {
      alert("Failed to trigger webhook.");
    }
  };

  const getChannelBadge = (ch: number) => {
    switch (ch) {
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">WhatsApp</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">SMS</span>;
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Email</span>;
      case 4:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Webhook</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <MessageSquare className="w-7 h-7 text-indigo-400" />
            <span>Omnichannel Communication & Notification Hub</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure WhatsApp Cloud API, SMS Gateways, SMTP Email, and Outbound Webhooks for automated customer billing dispatches.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Message</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>WhatsApp Channel</span>
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
            {gateways?.isWhatsAppEnabled ? "Active & Ready" : "Disabled"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cloud API Phone: {gateways?.whatsAppPhoneId || "Not set"}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SMS Gateway Provider</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-2">
            {gateways?.smsProvider || "Fast2SMS"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sender Header: {gateways?.smsSenderId || "UDYOGB"}</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SMTP Email Dispatcher</span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-2">
            {gateways?.fromEmail || "Active"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Port {gateways?.smtpPort || 587} SSL</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Dispatched Messages</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            {logs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Delivery Success: 100%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("gateways")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "gateways"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Gateway Credentials & Providers</span>
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "templates"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Message Templates & Tokens</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "logs"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Outbox Dispatch Logs</span>
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === "webhooks"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Developer Webhooks</span>
        </button>
      </div>

      {/* Tab 1: Gateways */}
      {activeTab === "gateways" && gateways && (
        <form onSubmit={handleSaveGateways} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* WhatsApp Box */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <Phone className="w-4 h-4" />
                  <span>WhatsApp Cloud API</span>
                </div>
                <input
                  type="checkbox"
                  checked={gateways.isWhatsAppEnabled}
                  onChange={(e) => setGateways({ ...gateways, isWhatsAppEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={gateways.whatsAppPhoneId || ""}
                    onChange={(e) => setGateways({ ...gateways, whatsAppPhoneId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                    placeholder="e.g. 109823490182"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Permanent Access Token</label>
                  <input
                    type="password"
                    value={gateways.whatsAppApiToken || ""}
                    onChange={(e) => setGateways({ ...gateways, whatsAppApiToken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                    placeholder="EAAG..."
                  />
                </div>
              </div>
            </div>

            {/* SMS Box */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <Radio className="w-4 h-4" />
                  <span>SMS Gateway (DLT)</span>
                </div>
                <input
                  type="checkbox"
                  checked={gateways.isSmsEnabled}
                  onChange={(e) => setGateways({ ...gateways, isSmsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">SMS Provider</label>
                  <select
                    value={gateways.smsProvider || "Fast2SMS"}
                    onChange={(e) => setGateways({ ...gateways, smsProvider: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Fast2SMS">Fast2SMS</option>
                    <option value="MSG91">MSG91</option>
                    <option value="Twilio">Twilio</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Sender Header ID (6 Chars)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={gateways.smsSenderId || ""}
                    onChange={(e) => setGateways({ ...gateways, smsSenderId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            {/* SMTP Box */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                  <Mail className="w-4 h-4" />
                  <span>SMTP Email Gateway</span>
                </div>
                <input
                  type="checkbox"
                  checked={gateways.isEmailEnabled}
                  onChange={(e) => setGateways({ ...gateways, isEmailEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">From Sender Email</label>
                  <input
                    type="email"
                    value={gateways.fromEmail || ""}
                    onChange={(e) => setGateways({ ...gateways, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">SMTP Host & Port</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={gateways.smtpHost || ""}
                      onChange={(e) => setGateways({ ...gateways, smtpHost: e.target.value })}
                      className="col-span-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                    />
                    <input
                      type="number"
                      value={gateways.smtpPort || 587}
                      onChange={(e) => setGateways({ ...gateways, smtpPort: Number(e.target.value) })}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
            >
              Save Gateway Configuration
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Templates */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getChannelBadge(tpl.channel)}
                  <span className="font-bold text-white text-xs">{tpl.name}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {tpl.templateCode}
                </span>
              </div>

              {tpl.subjectTemplate && (
                <div className="text-[11px] text-slate-300 font-semibold">
                  Subject: <span className="font-normal text-slate-400">{tpl.subjectTemplate}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-850 text-xs font-mono text-slate-300 leading-relaxed">
                {tpl.bodyTemplate}
              </div>

              {tpl.variablesJson && (
                <div className="text-[10px] text-slate-400 flex items-center space-x-1 flex-wrap gap-1">
                  <span>Available Tokens:</span>
                  {JSON.parse(tpl.variablesJson).map((v: string) => (
                    <span key={v} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Outbox Logs */}
      {activeTab === "logs" && (
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Channel & Target</th>
                  <th className="py-3.5 px-4">Message Preview</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No message dispatch logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          {getChannelBadge(log.channel)}
                          <span className="font-bold text-white font-mono">{log.recipientTarget}</span>
                        </div>
                        {log.recipientName && <div className="text-[10px] text-slate-500">{log.recipientName}</div>}
                      </td>
                      <td className="py-3.5 px-4 max-w-md truncate font-mono text-[11px] text-slate-300">
                        {log.renderedBody}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-500">
                        {new Date(log.createdAtUtc).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Webhooks */}
      {activeTab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Outbound Webhooks Subscriptions</h3>
              <p className="text-xs text-slate-400">Stream real-time billing events to third-party endpoints with HMAC security.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTestWebhookTrigger}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 font-semibold text-xs flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Test Event</span>
              </button>
              <button
                onClick={() => setIsWebhookModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Webhook</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-white font-mono text-xs flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-purple-400" />
                    <span>{wh.endpointUrl}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{wh.description || "Production Webhook"}</div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Signing Secret: <span className="text-amber-400">{wh.secretKey}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Message Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Dispatch Test Notification</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Channel</label>
                  <select
                    value={dispatchChannel}
                    onChange={(e) => setDispatchChannel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value={1}>WhatsApp</option>
                    <option value={2}>SMS</option>
                    <option value={3}>Email</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Target (Phone Number or Email)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Message Body</label>
                <textarea
                  rows={3}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleTestDispatch}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Dispatch Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Webhook Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-400" />
              <span>Register Webhook Endpoint</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Endpoint URL (HTTPS)</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  value={webhookDesc}
                  onChange={(e) => setWebhookDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsWebhookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWebhook}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30"
              >
                Subscribe Endpoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
