"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  MessageCircle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Tag,
  ArrowLeft,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  businessType: string;
  industryCode: string;
  message: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  citySlug?: string;
  tenantId?: string;
  referrerUrl?: string;
  searchKeyword?: string;
  deviceType?: string;
  conversionStage: string;
  paidAmount?: number;
  trialStartedAt?: string;
  convertedPaidAt?: string;
  status: string;
  createdAt: string;
  contactedAt?: string;
  notes: string;
}

const INDUSTRY_OPTIONS = [
  { code: "ALL", label: "All Industries" },
  { code: "PHARMA", label: "Pharma & Health" },
  { code: "FMCG", label: "FMCG & Grocery" },
  { code: "ELECTRONICS", label: "Electronics & Tech" },
  { code: "GARMENTS", label: "Garments & Textiles" },
  { code: "HARDWARE", label: "Hardware & Sanitary" },
  { code: "SERVICE_SECTOR", label: "Service Sector" },
  { code: "OTHER", label: "General & Other" },
];

const STAGES = ["Lead", "Contacted", "Trial", "ConvertedPaid", "Dropped"];

const INDUSTRY_BADGE_COLORS: Record<string, string> = {
  PHARMA: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FMCG: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ELECTRONICS: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  GARMENTS: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  HARDWARE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  SERVICE_SECTOR: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  OTHER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  Lead: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Contacted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Trial: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  ConvertedPaid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Dropped: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function LeadsCrmContent() {
  const searchParams = useSearchParams();
  const initialIndustry = searchParams.get("industry") || "ALL";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState(initialIndustry);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  // Edit State
  const [editStage, setEditStage] = useState("");
  const [editPaidAmount, setEditPaidAmount] = useState<string>("");
  const [editNotes, setEditNotes] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("udyogbill_token") || localStorage.getItem("udyog_access_token")
          : null;

      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
      });
      if (industryFilter !== "ALL") params.append("industry", industryFilter);
      if (stageFilter !== "ALL") params.append("conversionStage", stageFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}/api/v1/superadmin/leads?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const json = await res.json();
        setLeads(json.items || json || []);
      }
    } catch {
      // Handled
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [industryFilter, stageFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setEditStage(lead.conversionStage || "Lead");
    setEditPaidAmount(lead.paidAmount ? String(lead.paidAmount) : "");
    setEditNotes(lead.notes || "");
    setEditIndustry(lead.industryCode || "OTHER");
    setInspectModalOpen(true);
  };

  const handleSaveLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("udyogbill_token") || localStorage.getItem("udyog_access_token")
          : null;

      const body = {
        conversionStage: editStage,
        paidAmount: editPaidAmount ? parseFloat(editPaidAmount) : null,
        notes: editNotes,
        industryCode: editIndustry,
        status: editStage === "ConvertedPaid" ? "Converted" : editStage === "Contacted" ? "Contacted" : selectedLead.status,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}/api/v1/superadmin/leads/${selectedLead.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        setInspectModalOpen(false);
        await fetchLeads();
      }
    } catch {
      // Handled
    }
    setSaving(false);
  };

  const stats = {
    total: leads.length,
    trials: leads.filter((l) => l.conversionStage === "Trial").length,
    converted: leads.filter((l) => l.conversionStage === "ConvertedPaid").length,
    revenue: leads.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0),
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/growth"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                SEO & CRM ENGINE
              </span>
              <h1 className="text-xl font-bold text-white">Organic Leads & Funnel CRM</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Attribution-backed inbound pipeline across 7 industry verticals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/growth"
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Growth Overview
          </Link>
        </div>
      </div>

      {/* Mini Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Filtered Leads</span>
          <div className="text-xl font-bold text-white mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] text-blue-400 uppercase font-semibold">Active Trials</span>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{stats.trials}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] text-emerald-400 uppercase font-semibold">Paid Customers</span>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{stats.converted}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
          <span className="text-[11px] text-purple-400 uppercase font-semibold">Attributed Revenue</span>
          <div className="text-xl font-bold text-purple-400 mt-0.5">
            ₹{stats.revenue.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, business, city..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </form>

        {/* Industry Filter */}
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Funnel Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                Stage: {s}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSearch("");
            setIndustryFilter("ALL");
            setStageFilter("ALL");
          }}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Lead Contact</th>
                <th className="px-4 py-3">Business & Geo</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Funnel Stage</th>
                <th className="px-4 py-3">Traffic Attribution</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3">Captured</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading organic leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No leads matching current filters.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Lead Contact */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{lead.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={`tel:+91${lead.mobile}`}
                          className="text-indigo-400 hover:underline font-mono text-[11px]"
                        >
                          +91 {lead.mobile}
                        </a>
                      </div>
                    </td>

                    {/* Business & City */}
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">
                        {lead.businessName || "Unnamed Business"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ""}` : "Location N/A"}
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          INDUSTRY_BADGE_COLORS[lead.industryCode] || INDUSTRY_BADGE_COLORS.OTHER
                        }`}
                      >
                        {lead.industryCode || "OTHER"}
                      </span>
                    </td>

                    {/* Funnel Stage */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(lead)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border hover:brightness-125 transition-all flex items-center gap-1 ${
                          STAGE_BADGE_COLORS[lead.conversionStage] || STAGE_BADGE_COLORS.Lead
                        }`}
                      >
                        <span>{lead.conversionStage || "Lead"}</span>
                        <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>

                    {/* Traffic Attribution */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                        <Globe className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[130px]">
                          {lead.utmSource || lead.source || "Direct"}
                        </span>
                      </div>
                      {lead.landingPage && (
                        <div className="text-[10px] text-indigo-400 font-mono truncate max-w-[130px]">
                          {lead.landingPage}
                        </div>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      {lead.paidAmount ? (
                        <span className="font-bold text-emerald-400">
                          ₹{lead.paidAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Captured Date */}
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`tel:+91${lead.mobile}`}
                          className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                          title="Call Lead"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/91${lead.mobile}?text=Hi%20${encodeURIComponent(
                            lead.name
                          )}%2C%20UdyogBill%20se%20baat%20kar%20rahe%20hain`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => openEditModal(lead)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 text-[11px] font-semibold transition-colors"
                        >
                          Inspect & Progress
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect & Funnel Transition Drawer/Modal */}
      {inspectModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Lead Detail & Stage Transition
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {selectedLead.name} — {selectedLead.businessName || "Business"}
                </h2>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Organic Attribution Specs */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Traffic Attribution Parameters
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400">UTM Source:</span>
                    <p className="font-mono text-slate-200 mt-0.5">
                      {selectedLead.utmSource || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">UTM Medium:</span>
                    <p className="font-mono text-slate-200 mt-0.5">
                      {selectedLead.utmMedium || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">UTM Campaign:</span>
                    <p className="font-mono text-slate-200 mt-0.5">
                      {selectedLead.utmCampaign || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Search Keyword:</span>
                    <p className="font-mono text-cyan-300 mt-0.5">
                      {selectedLead.searchKeyword ? `"${selectedLead.searchKeyword}"` : "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Landing Page:</span>
                    <p className="font-mono text-indigo-300 mt-0.5 flex items-center gap-2">
                      <span>{selectedLead.landingPage || "—"}</span>
                      {selectedLead.landingPage && (
                        <a
                          href={selectedLead.landingPage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  {selectedLead.citySlug && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Target SEO City Landing:</span>
                      <p className="font-mono text-amber-300 mt-0.5 flex items-center gap-2">
                        <span>/city/{selectedLead.citySlug}</span>
                        <a
                          href={`/city/${selectedLead.citySlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  )}
                  {selectedLead.referrerUrl && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Referrer URL:</span>
                      <p className="font-mono text-slate-300 mt-0.5 truncate">
                        {selectedLead.referrerUrl}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Device Category:</span>
                    <p className="font-semibold text-slate-200 mt-0.5">
                      {selectedLead.deviceType || "Desktop"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Form Message:</span>
                    <p className="text-slate-300 mt-0.5 italic">
                      {selectedLead.message ? `"${selectedLead.message}"` : "None"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transition Form */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Conversion Funnel Stage
                    </label>
                    <select
                      value={editStage}
                      onChange={(e) => setEditStage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Assigned Industry
                    </label>
                    <select
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                    >
                      {INDUSTRY_OPTIONS.filter((o) => o.code !== "ALL").map((ind) => (
                        <option key={ind.code} value={ind.code}>
                          {ind.label} ({ind.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editStage === "ConvertedPaid" && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <label className="block text-emerald-400 font-bold mb-1">
                      Attributed Closed Revenue (₹ INR)
                    </label>
                    <input
                      type="number"
                      value={editPaidAmount}
                      onChange={(e) => setEditPaidAmount(e.target.value)}
                      placeholder="e.g. 5999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono font-bold outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      This revenue will be credited to {selectedLead.utmSource || "Organic"} and the{" "}
                      {editIndustry} matrix.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Super Admin Call Notes / Audit Log
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g., Demo scheduled on Monday, user interested in multi-branch sync..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLead}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  {saving ? "Saving..." : "Save Progression"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganicLeadsCrmPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading Organic Leads CRM...</div>}>
      <LeadsCrmContent />
    </Suspense>
  );
}
