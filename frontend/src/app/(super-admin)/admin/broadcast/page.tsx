"use client";

import React, { useState } from "react";
import { superAdminService } from "@/services/super-admin-services";
import {
  Megaphone,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
  Info,
} from "lucide-react";

export default function BroadcastMailerPage() {
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [targetPlan, setTargetPlan] = useState("");
  const [result, setResult] = useState<{ totalTargeted: number; successfullySent: number; failedCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !bodyHtml.trim()) {
      setErrorMsg("Subject and message body are required.");
      return;
    }

    if (!confirm(`Are you sure you want to broadcast this email to all matched subscribers?`)) {
      return;
    }

    try {
      setSending(true);
      setErrorMsg(null);
      setResult(null);
      const res = await superAdminService.broadcastEmail({
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
        targetPlanCode: targetPlan || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to broadcast email.");
    } finally {
      setSending(false);
    }
  }

  function insertVariable(variable: string) {
    setBodyHtml((prev) => prev + " " + variable);
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Bulk Subscriber Broadcast Mailer</h1>
            <p className="text-sm text-slate-400">
              Send simultaneous announcements, product updates, or notices to all registered businesses.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 text-base font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Broadcast Dispatched Successfully!
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2 text-sm">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
              <div className="text-xs text-slate-400">Total Targeted</div>
              <div className="text-xl font-black text-white">{result.totalTargeted}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
              <div className="text-xs text-slate-400">Successfully Sent</div>
              <div className="text-xl font-black text-emerald-400">{result.successfullySent}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
              <div className="text-xs text-slate-400">Failed / Bounced</div>
              <div className="text-xl font-black text-rose-400">{result.failedCount}</div>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Email Subject Line <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Update: New Pharma & Garments Add-ons Available!"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Target Audience Filter
              </label>
              <select
                value={targetPlan}
                onChange={(e) => setTargetPlan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Active Subscribers</option>
                <option value="STARTER">Starter Plan Users</option>
                <option value="PROFESSIONAL">Professional Plan Users</option>
                <option value="ENTERPRISE">Enterprise Plan Users</option>
              </select>
            </div>
          </div>

          {/* Placeholders helper */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Click to insert personalization variable:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => insertVariable("{BusinessName}")}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/20 transition-all"
              >
                + &#123;BusinessName&#125;
              </button>
              <button
                type="button"
                onClick={() => insertVariable("{TradeName}")}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/20 transition-all"
              >
                + &#123;TradeName&#125;
              </button>
              <button
                type="button"
                onClick={() => insertVariable("{TenantCode}")}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-mono border border-indigo-500/20 transition-all"
              >
                + &#123;TenantCode&#125;
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Message Content (HTML or Plain Text) <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={10}
              required
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="<p>Dear {BusinessName},</p><p>We are thrilled to announce...</p>"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? "Dispatching Broadcast..." : "Send Broadcast to All Subscribers"}
          </button>
        </div>
      </form>
    </div>
  );
}
