"use client";

import React, { useState, useEffect } from "react";
import { superAdminService } from "@/services/super-admin-services";
import {
  Mail,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Lock,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function PlatformEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test Email Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [form, setForm] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "UdyogBill Cloud Billing",
    replyToEmail: "",
    enableSsl: true,
    isActive: true,
    hasPassword: false,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const data = await superAdminService.getEmailConfig();
      if (data) {
        setForm((prev) => ({
          ...prev,
          ...data,
          smtpPassword: "", // Do not display raw password
        }));
        if (data.fromEmail) {
          setTestEmailRecipient(data.fromEmail);
        }
      }
    } catch (err) {
      setErrorMsg("Failed to load email SMTP settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await superAdminService.updateEmailConfig(form);
      setSuccessMsg("SMTP Mail settings saved successfully!");
      setForm((prev) => ({ ...prev, hasPassword: prev.hasPassword || Boolean(prev.smtpPassword) }));
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to update SMTP settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testEmailRecipient.trim()) {
      setTestError("Please enter a valid recipient email.");
      return;
    }
    try {
      setTesting(true);
      setTestError(null);
      setTestSuccess(null);
      await superAdminService.sendTestEmail(testEmailRecipient.trim());
      setTestSuccess(`Test email successfully sent to ${testEmailRecipient}! Check your inbox.`);
    } catch (err: any) {
      setTestError(err?.response?.data?.message || "Failed to send test email. Verify SMTP host, port, and credentials.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin SMTP & Email Setup</h1>
              <p className="text-sm text-slate-400">
                Configure your outgoing mail server for Password Reset OTPs, Welcome Emails, Invoices, and Broadcasts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-700 font-medium transition-all"
          >
            <Send className="w-4 h-4 text-indigo-400" />
            Send Test Mail
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Quick Status Pill */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${form.isActive ? 'bg-emerald-400' : 'bg-slate-500'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${form.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {form.isActive ? "Automated Dispatch Active" : "Automated Dispatch Paused"}
            </h3>
            <p className="text-xs text-slate-400">
              {form.isActive
                ? "OTPs, Welcome emails, and Invoices will dispatch in real-time through your configured SMTP."
                : "Emails are running in simulation/mock mode without connecting to an SMTP server."}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMTP Server Connection */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">SMTP Server Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                SMTP Server Host <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                placeholder="e.g. smtp.gmail.com or smtp.mailgun.org"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                SMTP Port <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={form.smtpPort}
                onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value) || 587 })}
                placeholder="587"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Usually 587 (TLS) or 465 (SSL).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                SMTP Username / User ID
              </label>
              <input
                type="text"
                value={form.smtpUsername}
                onChange={(e) => setForm({ ...form, smtpUsername: e.target.value })}
                placeholder="e.g. postmaster@yourdomain.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                SMTP Password / App Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.smtpPassword}
                  onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                  placeholder={form.hasPassword ? "••••••••••••  (Leave blank to keep existing password)" : "Enter SMTP account or App password"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">For Gmail, use a 16-character Google App Password.</p>
            </div>
          </div>
        </div>

        {/* Sender Branding & Headers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Sender Identity & Security</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                From Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={form.fromEmail}
                onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                placeholder="billing@udyogbill.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                From Name (Display Sender) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder="e.g. UdyogBill Cloud Invoicing"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={form.replyToEmail}
                onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
                placeholder="support@udyogbill.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Enable SSL / TLS Encryption</h4>
              <p className="text-xs text-slate-400">Required for secure authentication with Gmail, Outlook, and Mailgun.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enableSsl}
                onChange={(e) => setForm({ ...form, enableSsl: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving Changes..." : "Save SMTP Settings"}
          </button>
        </div>
      </form>

      {/* Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Send Test Email</h3>
              </div>
              <button
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestSuccess(null);
                  setTestError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Enter an email address to verify that your SMTP credentials, TLS handshake, and template rendering work properly.
            </p>

            {testSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{testSuccess}</span>
              </div>
            )}

            {testError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{testError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Recipient Email Address
              </label>
              <input
                type="email"
                required
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsTestModalOpen(false);
                  setTestSuccess(null);
                  setTestError(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {testing ? "Dispatching..." : "Send Verification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
