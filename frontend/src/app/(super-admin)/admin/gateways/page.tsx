"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Save,
  Key,
  ShieldCheck,
  Zap,
  Lock,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import { superAdminService } from "@/services/super-admin-services";

export default function SuperAdminGatewaysPage() {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mode, setMode] = useState<string>("Test");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasSecret, setHasSecret] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadGatewayConfig = async () => {
    try {
      setLoading(true);
      const data = await superAdminService.getGatewayConfig();
      if (data) {
        setKeyId(data.keyId || "");
        setWebhookSecret(data.webhookSecret || "");
        setMode(data.mode || "Test");
        setIsActive(data.isActive ?? true);
        setHasSecret(data.hasSecret);
      }
    } catch (err: any) {
      console.error("Failed to load gateway config", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGatewayConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyId) {
      setMessage({ type: "error", text: "Please provide a valid Razorpay Key ID." });
      return;
    }
    try {
      setSaving(true);
      await superAdminService.updateGatewayConfig({
        keyId: keyId.trim(),
        keySecret: keySecret.trim(),
        webhookSecret: webhookSecret.trim(),
        mode,
        isActive,
      });
      setMessage({
        type: "success",
        text: "Razorpay Gateway credentials saved successfully! Subscribers can now pay online.",
      });
      setKeySecret("");
      setHasSecret(true);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update gateway config." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          <span>Razorpay Payment Gateway Settings</span>
        </h1>
        <p className="text-sm text-slate-400">
          Configure your Razorpay API keys to accept automated online payments for subscriptions and industry add-ons.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
              : "bg-rose-950/50 border-rose-800 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Gateway Card Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm">
              RZP
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Razorpay Online Billing Engine</h2>
              <span className="text-xs text-slate-400">
                Supports UPI (GPay, PhonePe, Paytm), Cards, NetBanking, and Instant Auto-Activation
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {isActive ? "Gateway Live" : "Gateway Inactive"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Gateway Environment Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode("Test")}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  mode === "Test"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/5"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Test Mode (Sandbox)</div>
                  <div className="text-[11px] opacity-80">Safe dummy testing with mock UPI/Cards</div>
                </div>
                {mode === "Test" && <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setMode("Live")}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  mode === "Live"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/5"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Live Mode (Production)</div>
                  <div className="text-[11px] opacity-80">Real INR payment transactions into bank account</div>
                </div>
                {mode === "Live" && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Key ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Razorpay Key ID</span>
              <a
                href="https://dashboard.razorpay.com/app/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <span>Get Keys from Razorpay Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="rzp_test_... or rzp_live_..."
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Key Secret */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Razorpay Key Secret</span>
              {hasSecret && (
                <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Secret is already securely stored</span>
                </span>
              )}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showSecret ? "text" : "password"}
                placeholder={hasSecret ? "Leave blank to keep existing stored secret" : "Enter Razorpay Secret"}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Webhook Secret (Optional, for asynchronous server-to-server callbacks)
            </label>
            <input
              type="text"
              placeholder="e.g. ub_webhook_secret_2026"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <label htmlFor="isActive" className="text-xs text-slate-300 font-medium">
              Enable Online Razorpay Gateway across all Tenant subscription checkouts
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Credentials..." : "Save Gateway Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
