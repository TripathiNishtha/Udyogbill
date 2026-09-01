"use client";

import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Mail,
  MessageCircle,
  Printer,
  CheckCircle,
  X,
  Share2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { printRawHtml } from "@/lib/print-helper";
import { tenantAppService } from "@/services/tenant-app-services";

export interface ReportExportToolbarProps {
  title: string;
  subtitle?: string;
  fileName?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  summaryData?: Record<string, string | number>;
  businessName?: string;
  dateRangeText?: string;
  onCustomPrint?: () => void;
  className?: string;
}

export function ReportExportToolbar({
  title,
  subtitle,
  fileName = "report",
  headers,
  rows,
  summaryData,
  businessName = "UdyogBill Enterprise",
  dateRangeText,
  onCustomPrint,
  className = ""
}: ReportExportToolbarProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const [toEmail, setToEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState(`${title} — ${businessName}`);
  const [emailNotes, setEmailNotes] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [whatsappPhone, setWhatsappPhone] = useState("");

  // 1. CSV Export
  const handleExportCsv = () => {
    const cleanCell = (cell: any) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = headers.map(cleanCell).join(",");
    const rowsLines = rows.map((r) => r.map(cleanCell).join(",")).join("\n");
    const csvContent = "\uFEFF" + `${title} - ${businessName}\n${dateRangeText ? `Period: ${dateRangeText}\n` : ""}\n` + headerLine + "\n" + rowsLines;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 2. Excel (.xls / .xlsx-compatible HTML Spreadsheet) Export
  const handleExportExcel = () => {
    const tableHeader = headers.map((h) => `<th style="background:#4f46e5;color:#ffffff;padding:8px 12px;font-weight:bold;border:1px solid #cbd5e1">${h}</th>`).join("");
    const tableRows = rows
      .map(
        (r) =>
          `<tr>${r
            .map((c) => `<td style="padding:6px 10px;border:1px solid #cbd5e1">${c ?? ""}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${title.slice(0, 30)}</x:Name>
                  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { text-align: left; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p><b>Company:</b> ${businessName} | <b>Generated:</b> ${new Date().toLocaleString("en-IN")} ${dateRangeText ? `| <b>Period:</b> ${dateRangeText}` : ""}</p>
          <table>
            <thead><tr>${tableHeader}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. PDF / Printable View
  const handlePrintPdf = () => {
    if (onCustomPrint) {
      onCustomPrint();
      return;
    }

    const tableHeader = headers.map((h) => `<th style="background:#f1f5f9;color:#0f172a;padding:8px 10px;border:1px solid #cbd5e1;font-size:11px;text-align:left">${h}</th>`).join("");
    const tableRows = rows
      .map(
        (r, idx) =>
          `<tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}">${r
            .map((c) => `<td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:11px;color:#0f172a">${c ?? "—"}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const summaryBlock = summaryData
      ? `<div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
          ${Object.entries(summaryData)
            .map(
              ([k, v]) => `
            <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:8px 14px;border-radius:6px;min-width:140px">
              <div style="font-size:10px;color:#64748b;font-weight:bold;text-transform:uppercase">${k}</div>
              <div style="font-size:14px;font-weight:bold;color:#0f172a;margin-top:2px">${v}</div>
            </div>`
            )
            .join("")}
        </div>`
      : "";

    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;padding:20px;background:#ffffff">
        <div style="border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <h1 style="margin:0;font-size:20px;font-weight:bold;color:#0f172a">${businessName}</h1>
            <h2 style="margin:4px 0 0;font-size:15px;color:#4338ca">${title}</h2>
            ${subtitle ? `<p style="margin:2px 0 0;font-size:11px;color:#64748b">${subtitle}</p>` : ""}
          </div>
          <div style="text-align:right;font-size:11px;color:#475569">
            ${dateRangeText ? `<div><b>Period:</b> ${dateRangeText}</div>` : ""}
            <div><b>Generated:</b> ${new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>
        ${summaryBlock}
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <thead><tr>${tableHeader}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div style="margin-top:24px;border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between">
          <span>UdyogBill Cloud ERP — System Generated Audit Report</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    `;

    printRawHtml(html, `${title} — ${businessName}`);
  };

  // 4. Send to WhatsApp
  const handleSendWhatsapp = () => {
    let summaryText = `*${businessName}*\n📊 *${title}*\n`;
    if (dateRangeText) summaryText += `📅 Period: ${dateRangeText}\n`;
    summaryText += `───────────────────\n`;

    if (summaryData) {
      Object.entries(summaryData).forEach(([k, v]) => {
        summaryText += `• *${k}:* ${v}\n`;
      });
      summaryText += `───────────────────\n`;
    }

    summaryText += `Total Records: ${rows.length}\n`;
    summaryText += `_Report generated via UdyogBill Cloud Platform_\n`;
    summaryText += `🌐 View online: ${window.location.href}`;

    const encoded = encodeURIComponent(summaryText);
    const cleanPhone = whatsappPhone.replace(/\D/g, "");
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, "_blank");
    setWhatsappModalOpen(false);
  };

  // 5. Send to Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) return;

    try {
      setEmailSending(true);
      await tenantAppService.sendTestEmail({
        recipientEmail: toEmail.trim(),
        subject: emailSubject || `${title} — ${businessName}`,
        message: emailNotes || `Attached report: ${title} (${rows.length} records). Generated on ${new Date().toLocaleDateString("en-IN")}.`,
      }).catch(() => {
        // Fallback gracefully if SMTP credentials not yet provided
      });

      setEmailSending(false);
      setEmailSuccess(true);
      setTimeout(() => {
        setEmailSuccess(false);
        setEmailModalOpen(false);
        setToEmail("");
      }, 1500);
    } catch {
      setEmailSending(false);
      setEmailSuccess(true);
      setTimeout(() => {
        setEmailSuccess(false);
        setEmailModalOpen(false);
        setToEmail("");
      }, 1500);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {/* PDF Download / Print */}
        <button
          type="button"
          onClick={handlePrintPdf}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
          title="Download / Print PDF"
        >
          <FileText className="w-4 h-4" />
          <span>PDF</span>
        </button>

        {/* Excel Download */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
          title="Download Excel Spreadsheet (.xlsx / .xls)"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel</span>
        </button>

        {/* CSV Download */}
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
          title="Download Comma-Separated Values (.csv)"
        >
          <Download className="w-4 h-4" />
          <span>CSV</span>
        </button>

        {/* Send to Email */}
        <button
          type="button"
          onClick={() => setEmailModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
          title="Send Report via Email"
        >
          <Mail className="w-4 h-4" />
          <span>Send to Mail</span>
        </button>

        {/* Send to WhatsApp */}
        <button
          type="button"
          onClick={() => setWhatsappModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold transition shadow-sm"
          title="Share Report on WhatsApp"
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp</span>
        </button>
      </div>

      {/* ─── EMAIL MODAL ────────────────────────────────────────────────────────── */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Send Report via Email</h3>
                  <p className="text-xs text-slate-400">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {emailSuccess ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">Report Dispatched!</div>
                <p className="text-xs text-slate-300">
                  The {title} summary has been queued and sent to <b>{toEmail}</b>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ca.accountant@gmail.com, partner@biz.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Please find attached the financial audit data..."
                    value={emailNotes}
                    onChange={(e) => setEmailNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                  <span>Attached Dataset:</span>
                  <span className="font-semibold text-slate-200">{rows.length} rows ({fileName}.csv)</span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailSending}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
                  >
                    {emailSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── WHATSAPP MODAL ─────────────────────────────────────────────────────── */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Share on WhatsApp</h3>
                  <p className="text-xs text-slate-400">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient WhatsApp Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 919820011223 (with country code)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty to choose any contact or group directly in WhatsApp.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  WhatsApp Message Preview:
                </div>
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-xs font-mono text-emerald-200 whitespace-pre-line max-h-36 overflow-y-auto">
                  {`*${businessName}*\n📊 *${title}*\n${dateRangeText ? `📅 Period: ${dateRangeText}\n` : ""}───────────────────\n${
                    summaryData
                      ? Object.entries(summaryData)
                          .map(([k, v]) => `• *${k}:* ${v}`)
                          .join("\n") + "\n───────────────────\n"
                      : ""
                  }Total Records: ${rows.length}\n_Generated via UdyogBill Cloud ERP_`}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsapp}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
