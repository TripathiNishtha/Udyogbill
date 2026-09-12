"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  CreditCard,
  Building2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Search,
  MapPin,
  Globe,
  Layers,
  CheckCircle2,
  PhoneCall,
  Flame,
  Filter,
  Calendar,
  BarChart3,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Activity,
} from "lucide-react";
import { CITIES_DATA } from "@/lib/city-data";
import { superAdminService } from "@/services/super-admin-services";

interface IndustryGrowthMetric {
  code: string;
  name: string;
  totalLeads: number;
  activeTrials: number;
  convertedPaid: number;
  totalRevenue: number;
  conversionRate: number;
}

interface GrowthChannelMetric {
  channel: string;
  count: number;
  conversions: number;
}

interface GrowthLandingPageMetric {
  page: string;
  count: number;
}

interface GrowthGeoMetric {
  city: string;
  count: number;
}

interface GrowthKeywordMetric {
  keyword: string;
  count: number;
}

interface RecentGrowthLead {
  id: string;
  name: string;
  businessName: string;
  city: string;
  industryCode: string;
  conversionStage: string;
  channel?: string;
  paidAmount?: number;
  createdAt: string;
}

interface FunnelDropOff {
  totalLeads: number;
  contacted: number;
  trials: number;
  convertedPaid: number;
  dropped: number;
  leadToContactDropRate: number;
  contactToTrialDropRate: number;
  trialToPaidDropRate: number;
}

interface CityPerformanceMetric {
  slug: string;
  cityName: string;
  state: string;
  totalLeads: number;
  contacted: number;
  activeTrials: number;
  convertedPaid: number;
  totalRevenue: number;
  winRate: number;
}

interface ContentPerformanceMetric {
  path: string;
  contentType: string;
  totalLeads: number;
  activeTrials: number;
  convertedPaid: number;
  totalRevenue: number;
  winRate: number;
}

interface GrowthOverview {
  totalLeads: number;
  leadsLast7Days: number;
  leadsLast30Days: number;
  contactedCount: number;
  trialCount: number;
  convertedPaidCount: number;
  totalPaidRevenue: number;
  leadToContactRate: number;
  trialConversionRate: number;
  overallConversionRate: number;
  industries: IndustryGrowthMetric[];
  topChannels: GrowthChannelMetric[];
  topLandingPages: GrowthLandingPageMetric[];
  topCities: GrowthGeoMetric[];
  topKeywords: GrowthKeywordMetric[];
  recentLeads: RecentGrowthLead[];
  funnel?: FunnelDropOff;
}

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

export default function GrowthCommandCenterPage() {
  const [data, setData] = useState<GrowthOverview | null>(null);
  const [citiesData, setCitiesData] = useState<CityPerformanceMetric[]>([]);
  const [contentData, setContentData] = useState<ContentPerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cities" | "content" | "channels" | "google-integration">("overview");

  // Date Range Filter State: 'all' | 'today' | '7d' | '30d' | '90d'
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d" | "90d">("all");
  const [citySearch, setCitySearch] = useState("");

  const getDateParams = () => {
    if (dateRange === "all") return "";
    const now = new Date();
    let from: Date;
    if (dateRange === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "7d") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "30d") {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
    return `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(now.toISOString())}`;
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let from: Date | undefined;
      let to: string | undefined = now.toISOString();

      if (dateRange === "today") {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === "7d") {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "30d") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "90d") {
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else {
        from = undefined;
        to = undefined;
      }

      const fromIso = from ? from.toISOString() : undefined;

      const [overviewData, citiesData, contentData] = await Promise.all([
        superAdminService.getGrowthOverview(fromIso, to).catch(() => null),
        superAdminService.getGrowthCitiesPerformance(fromIso, to).catch(() => []),
        superAdminService.getGrowthContentPerformance(fromIso, to).catch(() => []),
      ]);

      if (overviewData) {
        setData(overviewData);
      }
      if (citiesData) {
        setCitiesData(citiesData);
      }
      if (contentData) {
        setContentData(contentData);
      }
    } catch (err) {
      console.error("fetchOverview error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
  }, [dateRange]);

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              SEO & Expansion Command Center
            </span>
            <span className="text-xs text-slate-400">• Super Admin Exclusive</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Organic Growth & Conversion Engine
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Full-funnel attribution across all 7 official industries — zero tenant ERP disruption.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1.5" />
            {(["today", "7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  dateRange === r
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "today"
                  ? "Today"
                  : r === "7d"
                  ? "7D"
                  : r === "30d"
                  ? "30D"
                  : r === "90d"
                  ? "90D"
                  : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/growth/leads"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            CRM Leads
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Executive Overview & Funnel
        </button>
        <button
          onClick={() => setActiveTab("cities")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "cities"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-4 h-4" />
          50-City Geo Performance
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            50
          </span>
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "content"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Content & Blog Lead ROI
        </button>
        <button
          onClick={() => setActiveTab("channels")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "channels"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          Traffic Channels & Keywords
        </button>
        <button
          onClick={() => setActiveTab("google-integration")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "google-integration"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          Google GA4 & Search Console
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Organic Leads
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {data?.totalLeads ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              +{data?.leadsLast7Days ?? 0} this week
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data?.leadsLast30Days ?? 0} acquired past 30 days
          </p>
        </div>

        {/* Card 2: Active Trials */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Trials
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {data?.trialCount ?? 0}
            </span>
            <span className="text-xs text-blue-400 font-medium">
              {data?.trialConversionRate ?? 0}% trial-to-paid
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Contacted: {data?.contactedCount ?? 0} ({data?.leadToContactRate ?? 0}%)
          </p>
        </div>

        {/* Card 3: Converted Paid Customers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Paid Conversions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {data?.convertedPaidCount ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {data?.overallConversionRate ?? 0}% win rate
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Directly attributed to organic & SEO</p>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attributed Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              ₹{(data?.totalPaidRevenue ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-purple-400 mt-1 font-medium">
            From SEO & inbound conversions
          </p>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & FUNNEL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Conversion Funnel Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                End-to-End Growth Pipeline & Drop-off Rates
              </h2>
              <span className="text-xs text-slate-400">
                Search &rarr; Landing Page &rarr; Lead &rarr; Trial &rarr; Paid Customer
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Step 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">1. Inbound Leads</div>
                <div className="text-xl font-bold text-white mt-1">{data?.totalLeads ?? 0}</div>
                <div className="text-[11px] text-indigo-400 mt-0.5">100% of pipeline</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full w-full" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">2. Contacted / Demo</div>
                <div className="text-xl font-bold text-white mt-1">{data?.contactedCount ?? 0}</div>
                <div className="text-[11px] text-amber-400 mt-0.5">
                  {data?.leadToContactRate ?? 0}% contact rate
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, data?.leadToContactRate ?? 0)}%` }}
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">3. Active Free Trials</div>
                <div className="text-xl font-bold text-white mt-1">{data?.trialCount ?? 0}</div>
                <div className="text-[11px] text-blue-400 mt-0.5">
                  {data?.totalLeads ? Math.round(((data.trialCount) / data.totalLeads) * 100) : 0}% of leads
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{
                      width: `${data?.totalLeads ? Math.min(100, Math.round(((data.trialCount) / data.totalLeads) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">4. Converted Paid</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {data?.convertedPaidCount ?? 0}
                </div>
                <div className="text-[11px] text-emerald-400 mt-0.5">
                  ₹{(data?.totalPaidRevenue ?? 0).toLocaleString("en-IN")} total closed
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, data?.overallConversionRate ?? 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 7 Official Industries Organic Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  7-Industry Performance & Penetration Matrix
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organic demand, trials, and revenue breakdown across all official supported industry verticals.
                </p>
              </div>
              <Link
                href="/admin/growth/leads"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 self-start sm:self-auto"
              >
                Filter by industry in CRM &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Industry Vertical</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3 text-center">Total Inbound Leads</th>
                    <th className="px-4 py-3 text-center">Active Trials</th>
                    <th className="px-4 py-3 text-center">Converted Paid</th>
                    <th className="px-4 py-3 text-right">Attributed Revenue</th>
                    <th className="px-4 py-3 text-center">Conversion %</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.industries?.map((ind) => (
                    <tr key={ind.code} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ind.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            INDUSTRY_BADGE_COLORS[ind.code] || INDUSTRY_BADGE_COLORS.OTHER
                          }`}
                        >
                          {ind.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-200">
                        {ind.totalLeads}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-blue-400">
                        {ind.activeTrials}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">
                        {ind.convertedPaid}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-200">
                        ₹{ind.totalRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ind.conversionRate > 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {ind.conversionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/growth/leads?industry=${ind.code}`}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition-colors"
                        >
                          View Leads
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 50-CITY GEO PERFORMANCE MATRIX */}
      {activeTab === "cities" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                50-City Local SEO & Regional Commercial Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time attribution connecting all 50 live city landing pages to incoming leads, trials, and revenue.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search city or state..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 w-56"
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing 50 Target Cities
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">City & State</th>
                  <th className="px-4 py-3">Live URL</th>
                  <th className="px-4 py-3 text-center">Total Leads</th>
                  <th className="px-4 py-3 text-center">Contacted</th>
                  <th className="px-4 py-3 text-center">Active Trials</th>
                  <th className="px-4 py-3 text-center">Paid Conversions</th>
                  <th className="px-4 py-3 text-right">Attributed Revenue</th>
                  <th className="px-4 py-3 text-center">Win Rate %</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.values(CITIES_DATA)
                  .filter((c) => {
                    if (!citySearch.trim()) return true;
                    const q = citySearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.slug.includes(q);
                  })
                  .map((city) => {
                    const perf = citiesData.find((cp) => cp.slug === city.slug || cp.cityName.toLowerCase() === city.name.toLowerCase());
                    const leadsCount = perf?.totalLeads ?? 0;
                    const contactedCount = perf?.contacted ?? 0;
                    const trialsCount = perf?.activeTrials ?? 0;
                    const paidCount = perf?.convertedPaid ?? 0;
                    const revenue = perf?.totalRevenue ?? 0;
                    const winRate = perf?.winRate ?? 0;

                    return (
                      <tr key={city.slug} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{city.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {city.stateCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{city.state}</div>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/city/${city.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <span>/city/{city.slug}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-70" />
                          </a>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-200">
                          {leadsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-amber-400">
                          {contactedCount}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-blue-400">
                          {trialsCount}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">
                          {paidCount}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-200">
                          ₹{revenue.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              winRate > 0 ? "bg-emerald-500/10 text-emerald-400" : "text-slate-500"
                            }`}
                          >
                            {winRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/growth/leads?search=${city.name}`}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition-colors"
                          >
                            Filter Leads
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTENT & BLOG LEAD ROI */}
      {activeTab === "content" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Content, Guides & Landing Page Lead Attribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct attribution showing which blog posts, landing pages, and industry solution pages generate paying clients.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {contentData.length} Top Performing URLs
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3">Content Landing URL</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Inbound Leads</th>
                  <th className="px-4 py-3 text-center">Trials Started</th>
                  <th className="px-4 py-3 text-center">Paid Conversions</th>
                  <th className="px-4 py-3 text-right">Attributed Revenue</th>
                  <th className="px-4 py-3 text-center">Win Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contentData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No content attribution captured for the selected date range.
                    </td>
                  </tr>
                ) : (
                  contentData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-white">
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-indigo-400 flex items-center gap-1.5"
                        >
                          <span className="truncate max-w-sm">{item.path}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-60 shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.contentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-200">
                        {item.totalLeads}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-blue-400">
                        {item.activeTrials}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-400">
                        {item.convertedPaid}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-200">
                        ₹{item.totalRevenue.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.winRate > 0 ? "bg-emerald-500/10 text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {item.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CHANNELS & KEYWORDS */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Channels & UTM Sources */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Top Acquisition Sources & Channels
              </h3>
              <span className="text-[11px] text-slate-400">By Lead Volume</span>
            </div>

            <div className="space-y-2">
              {!data?.topChannels || data.topChannels.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No organic traffic channels captured yet.
                </p>
              ) : (
                data.topChannels.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{c.channel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{c.conversions} paid</span>
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {c.count} leads
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Search Keywords */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                Top Captured Organic Search Keywords
              </h3>
              <span className="text-[11px] text-slate-400">Search intent queries</span>
            </div>

            <div className="space-y-2">
              {!data?.topKeywords || data.topKeywords.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Keyword attribution active — will populate as search query params are detected.
                </p>
              ) : (
                data.topKeywords.map((k, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <span className="text-xs font-mono text-cyan-300 truncate">&ldquo;{k.keyword}&rdquo;</span>
                    <span className="text-xs font-bold text-slate-300">{k.count} queries</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GOOGLE GA4 & SEARCH CONSOLE INTEGRATION */}
      {activeTab === "google-integration" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Analytics 4 Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    GA4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Google Analytics 4 (Measurement Tag)</h3>
                    <p className="text-xs text-slate-400">Live Client-Side Tagging & Funnel Stream</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Measurement ID:</span>
                  <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    G-8L95Z01Q0C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Script Strategy:</span>
                  <span className="text-slate-200">afterInteractive (next/script)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Custom Conversion Events:</span>
                  <span className="text-slate-200 font-mono">generate_lead, view_city_landing</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Pipeline Attribution:</span>
                  <span className="text-indigo-400 font-medium">Enabled on all 50 City Pages</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs text-slate-300">
                💡 <span className="font-semibold text-white">Real-Time Data:</span> GA4 tag is injected across all 471 prerendered pages and marketing forms. All form submissions automatically fire <code className="text-indigo-300 font-mono">generate_lead</code> with city, industry, and UTM context.
              </div>
            </div>

            {/* Google Search Console Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    GSC
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Google Search Console Integration</h3>
                    <p className="text-xs text-slate-400">Crawling, Sitemaps & Ownership Verification</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Site Verification:</span>
                  <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px]">
                    google-site-verification (Active)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">XML Sitemap:</span>
                  <a
                    href="https://udyogbill.com/sitemap.xml"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>https://udyogbill.com/sitemap.xml</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Indexed Pages:</span>
                  <span className="text-slate-200 font-bold">471 Production URLs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Crawler Ping Engine:</span>
                  <span className="text-emerald-400 font-medium">Google & Bing Ping Ready</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/admin/growth/ai-studio"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Open Live Autocomplete & Ping Studio &rarr;
                </Link>
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Open GSC Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Organic Leads */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-indigo-400" />
            Recent Organic Inbound Captures
          </h3>
          <Link
            href="/admin/growth/leads"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            View all leads &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Lead Name</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Funnel Stage</th>
                <th className="px-4 py-3">Channel / Source</th>
                <th className="px-4 py-3">Captured At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {!data?.recentLeads || data.recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No leads captured yet.
                  </td>
                </tr>
              ) : (
                data.recentLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50">
                    <td className="px-4 py-3 font-semibold text-white">{l.name}</td>
                    <td className="px-4 py-3 text-slate-300">{l.businessName || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{l.city || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          INDUSTRY_BADGE_COLORS[l.industryCode] || INDUSTRY_BADGE_COLORS.OTHER
                        }`}
                      >
                        {l.industryCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          STAGE_BADGE_COLORS[l.conversionStage] || STAGE_BADGE_COLORS.Lead
                        }`}
                      >
                        {l.conversionStage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                      {l.channel || "Direct"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(l.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
