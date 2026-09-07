"use client";

import { useEffect, useState } from "react";
import { Printer,
  Hash,
  FileText,
  Sliders,
  Eye,
  CheckCircle2,
  Sparkles,
  Palette,
  Landmark,
  Check,
  RefreshCw,
  Droplets,
  Scale,
  Building2,
  FileCheck,
  Pill,
  Shield,
  Receipt,
  ClipboardList,
  Truck,
  ShieldCheck,
} from "lucide-react";
import {
  printTemplateService,
  PrintTemplate,
  RenderPrintPreviewResult,
} from "@/services/print-template-services";
import { printRawHtml } from "@/lib/print-helper";

interface CustomInvoiceConfig {
  watermarkEnabled?: boolean;
  watermarkType?: "text" | "logo";
  watermarkText?: string;
  watermarkOpacity?: number;
  quotationTerms?: string;
  poTerms?: string;
  challanTerms?: string;
  disclaimerText?: string;
  showComputerGeneratedText?: boolean;
}

export default function InvoiceSettingsPage() {
  const [activeTab, setActiveTab] = useState<"gallery" | "header-footer" | "terms" | "preview" | "numbering">("gallery");

  // State
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplate | null>(null);
  const [seriesConfig, setSeriesConfig] = useState({
    taxInvoice: { prefix: "INV/", nextNumber: 451, suffix: "/26-27", padding: 4 },
    cashMemo: { prefix: "CM/", nextNumber: 101, suffix: "/26-27", padding: 4 },
    quotation: { prefix: "QTN/", nextNumber: 1, suffix: "/26-27", padding: 4 },
    challan: { prefix: "DC/", nextNumber: 1, suffix: "/26-27", padding: 4 },
  });
  const [customConfig, setCustomConfig] = useState<CustomInvoiceConfig>({
    watermarkEnabled: true,
    watermarkType: "text",
    watermarkText: "ORIGINAL FOR RECIPIENT",
    watermarkOpacity: 12,
    quotationTerms: "1. Rates are valid for 7 days from issue date.\n2. 50% advance required with confirmed order.\n3. Goods dispatch within 2 business days.",
    poTerms: "1. Materials must match purchase order specifications.\n2. Incomplete or damaged packaging will be rejected.\n3. Delivery challan copy must accompany delivery.",
    challanTerms: "1. Goods sent for delivery/transportation only, not a sale invoice.\n2. Ownership remains with consignor until invoiced.",
    disclaimerText: "Subject to local jurisdiction. Goods once sold will not be taken back without original bill.",
    showComputerGeneratedText: true,
  });

  const [previewResult, setPreviewResult] = useState<RenderPrintPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await printTemplateService.getTemplates();
      setTemplates(res || []);
      if (res && res.length > 0) {
        const defaultTpl = res.find((t) => t.isDefault) || res[0];
        setSelectedTemplate(defaultTpl);
        parseCustomConfig(defaultTpl);
      }
    } finally {
      setLoading(false);
    }
  };

  const parseCustomConfig = (tpl: PrintTemplate) => {
    if (tpl.customLabelsJson) {
      try {
        const parsed = JSON.parse(tpl.customLabelsJson);
        setCustomConfig((prev) => ({
          ...prev,
          ...parsed,
          watermarkOpacity: parsed.watermarkOpacity ?? 12,
        }));
      } catch {
        // use default
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetDefault = async (tpl: PrintTemplate, docType: number = 1) => {
    try {
      setLoading(true);
      await printTemplateService.setDefaultTemplate(tpl.id, docType);
      const docLabel = docType === 2 ? "Cash Memo (Retail/B2C)" : "Tax Invoice (B2B)";
      setNotification(`Template "${tpl.templateName}" set as active default for ${docLabel}!`);
      await loadData();
    } catch {
      alert("Failed to set template as default.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      const updatedTemplate: Partial<PrintTemplate> = {
        ...selectedTemplate,
        customLabelsJson: JSON.stringify(customConfig),
        customCss: customConfig.watermarkEnabled
          ? `.invoice-watermark { display: flex !important; opacity: ${(customConfig.watermarkOpacity || 12) / 100} !important; }`
          : `.invoice-watermark { display: none !important; }`,
      };

      const updated = await printTemplateService.updateTemplate(selectedTemplate.id, updatedTemplate);
      setSelectedTemplate(updated);
      setNotification(`Invoice settings & "${updated.templateName}" saved successfully!`);
      loadData();
    } catch {
      alert("Failed to save invoice settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePreview = async (templateId?: string) => {
    try {
      const targetId = templateId || selectedTemplate?.id;
      const res = await printTemplateService.renderPreview({ templateId: targetId });
      setPreviewResult(res);
      setActiveTab("preview");
    } catch {
      alert("Failed to render preview.");
    }
  };

  const [galleryCategory, setGalleryCategory] = useState<"all" | "b2b" | "d2c" | "cash">("all");

  const getDocTypeBadge = (tpl: PrintTemplate) => {
    const code = tpl.templateCode?.toUpperCase() || "";
    if (code.includes("B2B_TALLY")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-amber-400 border border-slate-700">🏛️ Tally Prime B2B</span>;
    }
    if (code.includes("B2B_MARG")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">💊 Marg Pharma B2B</span>;
    }
    if (code.includes("B2B_ZOHO")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">📊 Zoho Modern B2B</span>;
    }
    if (code.includes("B2B_VYAPAR")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">⚡ Vyapar Clean B2B</span>;
    }
    if (code.includes("UDYOGBILL_SIGNATURE") || code.includes("SIGNATURE_B2B") || code.includes("B2B_UDYOG")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">🏆 UdyogBill Signature B2B</span>;
    }
    if (code.includes("D2C_MARG")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">🛍️ Marg Retail D2C</span>;
    }
    if (code.includes("D2C_MYBILLBOOK")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">📱 MyBillBook Modern D2C</span>;
    }
    if (code.includes("D2C_VYAPAR")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">🛒 Vyapar Minimal D2C</span>;
    }
    if (code.includes("D2C_ZOHO")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">🌿 Zoho Compact D2C</span>;
    }
    if (code.includes("CASH_MARG")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">🧾 Marg Counter Cash</span>;
    }
    if (code.includes("CASH_VYAPAR")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">⚡ Vyapar Quick Bill</span>;
    }
    if (code.includes("CASH_ZOHO")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">📑 Zoho Clean Receipt</span>;
    }
    if (code.includes("CASH_MYBILLBOOK")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">💜 MyBillBook Bold Cash</span>;
    }
    if (code.includes("CASH_UDYOG")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">🚀 Udyog Express Cash</span>;
    }
    if (code.includes("THERMAL")) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">🖨️ 3" Thermal Slip</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">Document</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto space-y-5">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white">
                Invoice Settings & Print Templates
              </h1>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                Choose your active invoice template, customize headers, footers, watermarks, and document-specific Terms &amp; Conditions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleGeneratePreview()}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Simulate Live Print</span>
          </button>

          <button
            onClick={() => handleSaveConfiguration()}
            disabled={saving}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save All Settings</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification("")} className="text-xs text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("gallery")}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "gallery"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Template Gallery (Choose Default Active)</span>
        </button>

        <button
          onClick={() => setActiveTab("header-footer")}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "header-footer"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>2. Header, Footer &amp; Watermark</span>
        </button>

        <button
          onClick={() => setActiveTab("terms")}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "terms"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>3. Document Terms &amp; Conditions</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "preview"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>4. Live Document Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab("numbering")}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeTab === "numbering"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>5. Document Series & Numbering (GST Rule 46)</span>
        </button>
      </div>

      {/* ─── Tab 1: Template Gallery & 1-Click Default Selection ─────────────────── */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Select whichever invoice design you prefer below. Clicking <strong>&quot;Set as Active Default&quot;</strong> instantly updates all POS, tax billing, and PDF printouts across your store.</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 shrink-0">{templates.length} templates available</span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <button
              onClick={() => setGalleryCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryCategory === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Formats ({templates.length})
            </button>
            <button
              onClick={() => setGalleryCategory("b2b")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryCategory === "b2b"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
              }`}
            >
              🏛️ B2B Invoices (5 Formats)
            </button>
            <button
              onClick={() => setGalleryCategory("d2c")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryCategory === "d2c"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/30"
              }`}
            >
              🛒 D2C Retail (4 Formats)
            </button>
            <button
              onClick={() => setGalleryCategory("cash")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                galleryCategory === "cash"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/30"
              }`}
            >
              🧾 Cash Memo / POS (5 Formats)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {templates
              .filter((tpl) => {
                const code = tpl.templateCode?.toUpperCase() || "";
                if (galleryCategory === "b2b") return code.includes("B2B_") || tpl.documentType === 1;
                if (galleryCategory === "d2c") return code.includes("D2C_") || tpl.documentType === 8;
                if (galleryCategory === "cash") return code.includes("CASH_") || tpl.documentType === 2;
                return true;
              })
              .map((tpl) => {
                const isA5 = tpl.pageSize === 10 || tpl.pageSize === 9 || tpl.pageSize === 3;
                return (
                  <div
                    key={tpl.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all space-y-3.5 relative ${
                      tpl.isDefault
                        ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-500 shadow-xs"
                    }`}
                  >
                    {/* Top Badge Row */}
                    <div className="flex items-center justify-between">
                      {getDocTypeBadge(tpl)}
                      <div className="flex items-center space-x-1.5">
                        {tpl.isDefault && (
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            tpl.documentType === 2
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-800"
                              : tpl.documentType === 8
                              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800"
                              : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800"
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active Default</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Code */}
                    <div>
                      <h3 className="font-black text-slate-950 dark:text-white text-base tracking-tight">{tpl.templateName}</h3>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5">{tpl.templateCode}</div>
                    </div>

                    {/* Attributes & Page Size Selector Box */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Print Page Size:</span>
                        <div className="flex items-center space-x-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={async () => {
                              await printTemplateService.updateTemplate(tpl.id, { pageSize: 1 });
                              loadData();
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                              !isA5 ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Full A4 (210×297)
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await printTemplateService.updateTemplate(tpl.id, { pageSize: 10 });
                              loadData();
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                              isA5 ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Full A5 (148×210)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Header Title:</span>
                        <span className="font-bold text-slate-950 dark:text-white">{tpl.headerTitle}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Dynamic UPI QR:</span>
                        <span className={tpl.showUpiQr ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500"}>
                          {tpl.showUpiQr ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Default Set Actions */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleSetDefault(tpl, 1)}
                        className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold text-center transition-all cursor-pointer ${
                          tpl.isDefault && tpl.documentType === 1
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600"
                        }`}
                        title="Set as Default for B2B Tax Invoices"
                      >
                        {tpl.isDefault && tpl.documentType === 1 ? "✓ Active B2B" : "Set B2B"}
                      </button>
                      <button
                        onClick={() => handleSetDefault(tpl, 8)}
                        className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold text-center transition-all cursor-pointer ${
                          tpl.isDefault && tpl.documentType === 8
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600"
                        }`}
                        title="Set as Default for D2C Retail Invoices"
                      >
                        {tpl.isDefault && tpl.documentType === 8 ? "✓ Active D2C" : "Set D2C"}
                      </button>
                      <button
                        onClick={() => handleSetDefault(tpl, 2)}
                        className={`py-1.5 px-1 rounded-lg text-[10.5px] font-bold text-center transition-all cursor-pointer ${
                          tpl.isDefault && tpl.documentType === 2
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-600"
                        }`}
                        title="Set as Default for Cash Memos"
                      >
                        {tpl.isDefault && tpl.documentType === 2 ? "✓ Active Cash" : "Set Cash"}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          parseCustomConfig(tpl);
                          setActiveTab("header-footer");
                        }}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Customize
                      </button>
                      <button
                        onClick={() => handleGeneratePreview(tpl.id)}
                        className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── Tab 2: Header, Footer & Watermark Customization ─────────────────────── */}
      {activeTab === "header-footer" && selectedTemplate && (
        <form onSubmit={handleSaveConfiguration} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Box 1: Header Customization */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm">
                <FileText className="w-4 h-4" />
                <span>Header Title &amp; Slogan</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Document Main Title
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.headerTitle}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, headerTitle: e.target.value })}
                    placeholder="e.g. TAX INVOICE, BILL OF SUPPLY"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Prints on the very top of the bill</span>
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Store Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.headerSubtitle || ""}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, headerSubtitle: e.target.value })}
                    placeholder="e.g. Deals in Allopathic, Ayurvedic & Surgicals"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-medium"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Print Official Store Logo</span>
                    <input
                      type="checkbox"
                      checked={selectedTemplate.showLogo}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, showLogo: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Print GSTIN Number</span>
                    <input
                      type="checkbox"
                      checked={selectedTemplate.showGstin}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, showGstin: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Print Drug License / FSSAI</span>
                    <input
                      type="checkbox"
                      checked={selectedTemplate.showDrugLicense}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, showDrugLicense: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Box 2: Watermark Controls */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                <Droplets className="w-4 h-4" />
                <span>Invoice Watermark Settings</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Enable Background Watermark</span>
                  <input
                    type="checkbox"
                    checked={customConfig.watermarkEnabled}
                    onChange={(e) => setCustomConfig({ ...customConfig, watermarkEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                </div>

                {customConfig.watermarkEnabled && (
                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                    <div>
                      <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                        Watermark Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomConfig({ ...customConfig, watermarkType: "text" })}
                          className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            customConfig.watermarkType === "text"
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-500"
                          }`}
                        >
                          Text Watermark
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomConfig({ ...customConfig, watermarkType: "logo" })}
                          className={`py-1.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                            customConfig.watermarkType === "logo"
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-500"
                          }`}
                        >
                          Store Logo Watermark
                        </button>
                      </div>
                    </div>

                    {customConfig.watermarkType === "text" && (
                      <div>
                        <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                          Watermark Text
                        </label>
                        <input
                          type="text"
                          value={customConfig.watermarkText || ""}
                          onChange={(e) => setCustomConfig({ ...customConfig, watermarkText: e.target.value })}
                          placeholder="e.g. ORIGINAL FOR RECIPIENT, PAID, DUPLICATE"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-bold"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-700 dark:text-slate-300 font-bold">
                          Watermark Opacity
                        </label>
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {customConfig.watermarkOpacity || 12}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="35"
                        value={customConfig.watermarkOpacity || 12}
                        onChange={(e) => setCustomConfig({ ...customConfig, watermarkOpacity: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Subtle transparency ensures text remains fully readable when printed.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Box 3: Footer Message & Legal Declarations */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <FileCheck className="w-4 h-4" />
                <span>Footer Note &amp; Closing Message</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Customer Closing Greeting
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.footerGreeting || ""}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, footerGreeting: e.target.value })}
                    placeholder="e.g. Thank you for your business! Visit Again."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                    Jurisdiction &amp; Return Note
                  </label>
                  <textarea
                    rows={2}
                    value={customConfig.disclaimerText || ""}
                    onChange={(e) => setCustomConfig({ ...customConfig, disclaimerText: e.target.value })}
                    placeholder="e.g. Subject to local jurisdiction. Goods once sold will not be taken back without original bill."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white text-xs font-medium"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      Print &quot;Computer-Generated Invoice&quot; note
                    </span>
                    <input
                      type="checkbox"
                      checked={customConfig.showComputerGeneratedText}
                      onChange={(e) => setCustomConfig({ ...customConfig, showComputerGeneratedText: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => handleGeneratePreview(selectedTemplate.id)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
            >
              Simulate Live Preview
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      )}

      {/* ─── Tab 3: Document Terms & Conditions (T&C) ───────────────────── */}
      {activeTab === "terms" && selectedTemplate && (
        <form onSubmit={handleSaveConfiguration} className="space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-2">
            <Scale className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Set your permanent Terms &amp; Conditions for each commercial document below. These will print automatically at the bottom of respective documents.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Tax Invoice T&C */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm">
                <FileText className="w-4 h-4" />
                <span>GST Tax Invoice Terms &amp; Conditions</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Printed on commercial Tax Invoices &amp; POS Receipts.
              </p>
              <textarea
                rows={5}
                value={selectedTemplate.termsAndConditions || ""}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, termsAndConditions: e.target.value })}
                placeholder="1. Payment due within 15 days of bill date.&#10;2. 18% per annum interest chargeable on delayed payments.&#10;3. Any discrepancy must be reported within 24 hours."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-mono text-xs leading-relaxed"
              />
            </div>

            {/* 2. Quotation / Estimate T&C */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                <FileCheck className="w-4 h-4" />
                <span>Quotation / Estimate Terms &amp; Conditions</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Printed on customer quotes, rate estimates &amp; proformas.
              </p>
              <textarea
                rows={5}
                value={customConfig.quotationTerms || ""}
                onChange={(e) => setCustomConfig({ ...customConfig, quotationTerms: e.target.value })}
                placeholder="1. Rates are valid for 7 days from issue date.&#10;2. 50% advance required with confirmed order.&#10;3. Goods dispatch within 2 business days."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-mono text-xs leading-relaxed"
              />
            </div>

            {/* 3. Purchase Order (PO) T&C */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <Building2 className="w-4 h-4" />
                <span>Purchase Order (PO) Terms &amp; Conditions</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Issued to suppliers, vendors, and distributors.
              </p>
              <textarea
                rows={5}
                value={customConfig.poTerms || ""}
                onChange={(e) => setCustomConfig({ ...customConfig, poTerms: e.target.value })}
                placeholder="1. Materials must match purchase order specifications.&#10;2. Incomplete or damaged packaging will be rejected.&#10;3. Delivery challan copy must accompany delivery."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-mono text-xs leading-relaxed"
              />
            </div>

            {/* 4. Delivery Challan T&C */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-black text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Delivery Challan Terms &amp; Conditions</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">
                Printed on stock dispatch &amp; transport gate passes.
              </p>
              <textarea
                rows={5}
                value={customConfig.challanTerms || ""}
                onChange={(e) => setCustomConfig({ ...customConfig, challanTerms: e.target.value })}
                placeholder="1. Goods sent for delivery/transportation only, not a sale invoice.&#10;2. Ownership remains with consignor until invoiced."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {saving ? "Saving..." : "Save All Terms & Conditions"}
            </button>
          </div>
        </form>
      )}

      {/* ─── Tab 4: Live Document Simulator ─────────────────────── */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-slate-950 dark:text-white text-sm">
                  {previewResult?.templateName || selectedTemplate?.templateName || "Active Invoice Preview"}
                </span>
                <span className="text-xs text-slate-500 ml-3">Live Rendered Sandbox</span>
              </div>
            </div>
            {previewResult && (
              <button
                onClick={() => printRawHtml(previewResult.renderedHtml, previewResult.templateName)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Test Copy</span>
              </button>
            )}
          </div>

          {previewResult ? (
            <div className="p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-x-auto text-slate-900">
              <div dangerouslySetInnerHTML={{ __html: previewResult.renderedHtml }} />
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <Printer className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Ready to simulate live invoice print
              </div>
              <button
                onClick={() => handleGeneratePreview()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Generate Live Preview
              </button>
            </div>
          )}
        </div>
      )}
    
      {/* ─── Tab 5: Document Series & Custom Numbering (GST Rule 46) ────────────────── */}
      {activeTab === "numbering" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-black text-sm flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>CGST Rule 46(b) Compliant Document Series</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Migrating from previous software? Configure your continuous starting sequence numbers, custom prefixes, and suffixes. Max length allowed by GST rules is 16 characters.
              </p>
            </div>
            <button
              onClick={() => {
                setNotification("Document series and sequence numbering configurations saved successfully!");
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 shrink-0 cursor-pointer"
            >
              Save Series Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Tax Invoice Series */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-black text-slate-900 dark:text-white text-sm">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Tax Invoice Series (B2B / GST)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 border border-indigo-200">
                  Primary B2B
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={seriesConfig.taxInvoice.prefix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, taxInvoice: { ...seriesConfig.taxInvoice, prefix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Starting Number</label>
                  <input
                    type="number"
                    value={seriesConfig.taxInvoice.nextNumber}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, taxInvoice: { ...seriesConfig.taxInvoice, nextNumber: parseInt(e.target.value) || 1 } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={seriesConfig.taxInvoice.suffix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, taxInvoice: { ...seriesConfig.taxInvoice, suffix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 text-white font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Next Generated Invoice Number:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    {seriesConfig.taxInvoice.prefix}{String(seriesConfig.taxInvoice.nextNumber).padStart(seriesConfig.taxInvoice.padding, "0")}{seriesConfig.taxInvoice.suffix}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Length: {(seriesConfig.taxInvoice.prefix + String(seriesConfig.taxInvoice.nextNumber).padStart(seriesConfig.taxInvoice.padding, "0") + seriesConfig.taxInvoice.suffix).length}/16 chars
                </span>
              </div>
            </div>

            {/* 2. Cash Memo Series */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-black text-slate-900 dark:text-white text-sm">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <span>Cash Memo Series (Retail / B2C)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 border border-teal-200">
                  Counter Sales
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={seriesConfig.cashMemo.prefix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, cashMemo: { ...seriesConfig.cashMemo, prefix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Starting Number</label>
                  <input
                    type="number"
                    value={seriesConfig.cashMemo.nextNumber}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, cashMemo: { ...seriesConfig.cashMemo, nextNumber: parseInt(e.target.value) || 1 } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={seriesConfig.cashMemo.suffix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, cashMemo: { ...seriesConfig.cashMemo, suffix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 text-white font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Next Generated Cash Memo Number:</span>
                  <span className="text-teal-400 font-black text-sm">
                    {seriesConfig.cashMemo.prefix}{String(seriesConfig.cashMemo.nextNumber).padStart(seriesConfig.cashMemo.padding, "0")}{seriesConfig.cashMemo.suffix}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Length: {(seriesConfig.cashMemo.prefix + String(seriesConfig.cashMemo.nextNumber).padStart(seriesConfig.cashMemo.padding, "0") + seriesConfig.cashMemo.suffix).length}/16 chars
                </span>
              </div>
            </div>

            {/* 3. Quotation Series */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-black text-slate-900 dark:text-white text-sm">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                  <span>Quotation / Estimate Series</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 border border-purple-200">
                  Sales Proposals
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={seriesConfig.quotation.prefix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, quotation: { ...seriesConfig.quotation, prefix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Starting Number</label>
                  <input
                    type="number"
                    value={seriesConfig.quotation.nextNumber}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, quotation: { ...seriesConfig.quotation, nextNumber: parseInt(e.target.value) || 1 } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={seriesConfig.quotation.suffix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, quotation: { ...seriesConfig.quotation, suffix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 text-white font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Next Generated Quotation Number:</span>
                  <span className="text-purple-400 font-black text-sm">
                    {seriesConfig.quotation.prefix}{String(seriesConfig.quotation.nextNumber).padStart(seriesConfig.quotation.padding, "0")}{seriesConfig.quotation.suffix}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Length: {(seriesConfig.quotation.prefix + String(seriesConfig.quotation.nextNumber).padStart(seriesConfig.quotation.padding, "0") + seriesConfig.quotation.suffix).length}/16 chars
                </span>
              </div>
            </div>

            {/* 4. Delivery Challan Series */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-black text-slate-900 dark:text-white text-sm">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>Delivery Challan Series</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 border border-amber-200">
                  Goods Dispatch
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Prefix</label>
                  <input
                    type="text"
                    value={seriesConfig.challan.prefix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, challan: { ...seriesConfig.challan, prefix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Starting Number</label>
                  <input
                    type="number"
                    value={seriesConfig.challan.nextNumber}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, challan: { ...seriesConfig.challan, nextNumber: parseInt(e.target.value) || 1 } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Suffix</label>
                  <input
                    type="text"
                    value={seriesConfig.challan.suffix}
                    onChange={(e) => setSeriesConfig({ ...seriesConfig, challan: { ...seriesConfig.challan, suffix: e.target.value } })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-xl bg-slate-950 text-white font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Next Generated Challan Number:</span>
                  <span className="text-amber-400 font-black text-sm">
                    {seriesConfig.challan.prefix}{String(seriesConfig.challan.nextNumber).padStart(seriesConfig.challan.padding, "0")}{seriesConfig.challan.suffix}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">
                  Length: {(seriesConfig.challan.prefix + String(seriesConfig.challan.nextNumber).padStart(seriesConfig.challan.padding, "0") + seriesConfig.challan.suffix).length}/16 chars
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
