"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Settings,
  RefreshCw,
  AlertCircle,
  Activity,
  ArrowDownRight,
  MapPin,
  Link2,
  Search,
  Share2,
  Mail,
  MousePointer,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const getApiUrl = (endpoint: string) => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/backend${endpoint}`;
  }
  return `https://udyogbill.com/api/backend${endpoint}`;
};

function getToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("udyogbill_token") ||
    localStorage.getItem("udyog_access_token") ||
    ""
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Range = "today" | "yesterday" | "7d" | "30d" | "90d";

const RANGE_LABELS: Record<Range, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
};

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
interface ConfigData {
  ga4PropertyId: string;
  ga4ServiceAccountJson: string;
  gscSiteUrl: string;
  gscServiceAccountJson: string;
  isGa4Enabled: boolean;
  isGscEnabled: boolean;
}

function SetupModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ConfigData>({
    ga4PropertyId: "",
    ga4ServiceAccountJson: "",
    gscSiteUrl: "",
    gscServiceAccountJson: "",
    isGa4Enabled: true,
    isGscEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(getApiUrl("/superadmin/analytics/config"), {
          headers: getAuthHeaders(),
        });
        if (r.ok) {
          const d = await r.json();
          setForm((prev) => ({ ...prev, ...d }));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await fetch(getApiUrl("/superadmin/analytics/config"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(await r.text());
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Analytics Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect Google Analytics 4 & Search Console
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading settings...</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* GA4 Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Google Analytics 4</h3>
                  <p className="text-xs text-slate-500">Traffic, users, and real-time activity</p>
                </div>
                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isGa4Enabled}
                    onChange={(e) => setForm({ ...form, isGa4Enabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Enable</span>
                </label>
              </div>

              <div className="space-y-2.5 pl-10">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    GA4 Property ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. properties/530509929"
                    value={form.ga4PropertyId}
                    onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Service Account JSON (GA4)
                  </label>
                  <textarea
                    rows={4}
                    placeholder='{"type":"service_account",...}'
                    value={form.ga4ServiceAccountJson}
                    onChange={(e) =>
                      setForm({ ...form, ga4ServiceAccountJson: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* GSC Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Google Search Console{" "}
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Search queries & rankings</p>
                </div>
                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isGscEnabled}
                    onChange={(e) => setForm({ ...form, isGscEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Enable</span>
                </label>
              </div>

              <div className="space-y-2.5 pl-10">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Site URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://udyogbill.com/"
                    value={form.gscSiteUrl}
                    onChange={(e) => setForm({ ...form, gscSiteUrl: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Service Account JSON (GSC)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Can be same as GA4 service account JSON"
                    value={form.gscServiceAccountJson}
                    onChange={(e) =>
                      setForm({ ...form, gscServiceAccountJson: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Metric Card ──────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  badge,
  badgeColor,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-1">
        <span className="text-xl font-bold text-slate-900 tracking-tight">{value}</span>
        {badge && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
              badgeColor || "bg-slate-100 text-slate-600"
            } shrink-0 truncate max-w-[75px]`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Source Icon ─────────────────────────────────────────────────────────────
function SourceIcon({ source }: { source: string }) {
  const s = source.toLowerCase();
  if (s.includes("organic") || s.includes("search"))
    return <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
  if (s.includes("direct"))
    return <MousePointer className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  if (s.includes("social"))
    return <Share2 className="w-3.5 h-3.5 text-pink-600 shrink-0" />;
  if (s.includes("email"))
    return <Mail className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
  if (s.includes("referral"))
    return <Link2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
  return <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WebsiteAnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [showSetup, setShowSetup] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [realtime, setRealtime] = useState<{
    activeUsers: number;
    topPages: { page: string; users: number }[];
    topCities: { city: string; users: number }[];
  } | null>(null);

  const [overview, setOverview] = useState<{
    sessions: number;
    users: number;
    newUsers: number;
    pageviews: number;
    bounceRate: number;
    avgSessionDuration: number;
  } | null>(null);

  const [trend, setTrend] = useState<{ date: string; sessions: number; users: number }[]>([]);
  const [sources, setSources] = useState<
    { channel: string; sessions: number; percent: number }[]
  >([]);
  const [pages, setPages] = useState<{ page: string; views: number; avgTime: number }[]>([]);
  const [geo, setGeo] = useState<{ city: string; region: string; users: number }[]>([]);
  const [devices, setDevices] = useState<
    { device: string; sessions: number; percent: number }[]
  >([]);

  const fetchAll = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      try {
        const headers = getAuthHeaders();
        const configRes = await fetch(getApiUrl("/superadmin/analytics/config"), {
          headers,
        });
        if (!configRes.ok) return;
        const configData = await configRes.json();
        if (!configData.isGa4Enabled || !configData.ga4PropertyId) {
          setConfigured(false);
          return;
        }
        setConfigured(true);

        const [rtRes, ovRes, trRes, srcRes, pgRes, geoRes, devRes] = await Promise.all([
          fetch(getApiUrl("/superadmin/analytics/realtime"), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/overview?range=${range}`), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/trend?range=${range}`), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/sources?range=${range}`), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/pages?range=${range}`), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/geo?range=${range}`), { headers }),
          fetch(getApiUrl(`/superadmin/analytics/devices?range=${range}`), { headers }),
        ]);

        if (rtRes.ok) {
          const json = await rtRes.json();
          setRealtime({
            activeUsers: json.activeUsers || 0,
            topPages: (json.topPages || []).map((p: any) => ({
              page: p.page || p.pagePath || p.unifiedPagePathScreen || "",
              users: Number(p.users ?? p.activeUsers ?? 0),
            })),
            topCities: (json.topCities || []).map((c: any) => ({
              city: c.city || "Unknown",
              users: Number(c.users ?? c.activeUsers ?? 0),
            })),
          });
        }

        if (ovRes.ok) {
          const json = await ovRes.json();
          const d = json.data || json || {};
          setOverview({
            sessions: Number(d.sessions ?? 0),
            users: Number(d.totalUsers ?? d.users ?? 0),
            newUsers: Number(d.newUsers ?? 0),
            pageviews: Number(d.pageViews ?? d.pageviews ?? 0),
            bounceRate: Number(d.bounceRate ?? 0),
            avgSessionDuration: Number(
              d.avgSessionDurationSeconds ?? d.avgSessionDuration ?? 0
            ),
          });
        }

        if (trRes.ok) {
          const json = await trRes.json();
          const raw = Array.isArray(json) ? json : json.points || [];
          setTrend(
            raw.map((p: any) => {
              let dateStr = String(p.date || "");
              if (
                dateStr.length === 8 &&
                !dateStr.includes("-") &&
                !dateStr.includes("/")
              ) {
                dateStr = `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}`;
              }
              return {
                date: dateStr,
                sessions: Number(p.sessions ?? 0),
                users: Number(p.users ?? 0),
              };
            })
          );
        }

        if (srcRes.ok) {
          const json = await srcRes.json();
          const raw = Array.isArray(json) ? json : json.sources || [];
          const total =
            raw.reduce((acc: number, s: any) => acc + Number(s.sessions ?? 0), 0) || 1;
          setSources(
            raw.map((s: any) => {
              const sessions = Number(s.sessions ?? 0);
              return {
                channel: String(s.source || s.channel || "Direct"),
                sessions,
                percent:
                  s.percent !== undefined
                    ? Number(s.percent)
                    : (sessions / total) * 100,
              };
            })
          );
        }

        if (pgRes.ok) {
          const json = await pgRes.json();
          const raw = Array.isArray(json) ? json : json.pages || [];
          setPages(
            raw.map((p: any) => ({
              page: String(p.pagePath || p.page || p.pageTitle || "/"),
              views: Number(p.views ?? p.screenPageViews ?? 0),
              avgTime: Number(p.avgTimeSeconds ?? p.avgTime ?? 0),
            }))
          );
        }

        if (geoRes.ok) {
          const json = await geoRes.json();
          const raw = Array.isArray(json) ? json : json.cities || [];
          setGeo(
            raw.map((c: any) => ({
              city: String(c.city || "Unknown"),
              region: String(c.region || "—"),
              users: Number(c.users ?? 0),
            }))
          );
        }

        if (devRes.ok) {
          const json = await devRes.json();
          const raw = Array.isArray(json) ? json : json.devices || [];
          const total =
            raw.reduce(
              (acc: number, d: any) => acc + Number(d.users ?? d.sessions ?? 0),
              0
            ) || 1;
          setDevices(
            raw.map((d: any) => {
              const count = Number(d.users ?? d.sessions ?? 0);
              return {
                device: String(d.deviceCategory || d.device || "desktop"),
                sessions: count,
                percent:
                  d.percent !== undefined
                    ? Number(d.percent)
                    : (count / total) * 100,
              };
            })
          );
        }
        setLastRefresh(new Date());
      } catch {
        // silent fail
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range] // eslint-disable-line
  );

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  // Auto-refresh realtime every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      if (!configured) return;
      try {
        const r = await fetch(getApiUrl("/superadmin/analytics/realtime"), {
          headers: getAuthHeaders(),
        });
        if (r.ok) {
          const json = await r.json();
          setRealtime({
            activeUsers: json.activeUsers || 0,
            topPages: (json.topPages || []).map((p: any) => ({
              page: p.page || p.pagePath || p.unifiedPagePathScreen || "",
              users: Number(p.users ?? p.activeUsers ?? 0),
            })),
            topCities: (json.topCities || []).map((c: any) => ({
              city: c.city || "Unknown",
              users: Number(c.users ?? c.activeUsers ?? 0),
            })),
          });
          setLastRefresh(new Date());
        }
      } catch {
        // silent
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [configured]); // eslint-disable-line

  const deviceIcon = (d: string) => {
    const dl = d.toLowerCase();
    if (dl === "mobile") return <Smartphone className="w-3.5 h-3.5" />;
    if (dl === "tablet") return <Tablet className="w-3.5 h-3.5" />;
    return <Monitor className="w-3.5 h-3.5" />;
  };

  const totalPageViews = pages.reduce((acc, p) => acc + p.views, 0) || 1;
  const totalGeoUsers = geo.reduce((acc, g) => acc + g.users, 0) || 1;

  return (
    <div className="p-3.5 sm:p-5 space-y-3 min-h-screen bg-slate-50/60">
      {showSetup && (
        <SetupModal
          onClose={() => setShowSetup(false)}
          onSaved={() => {
            setShowSetup(false);
            fetchAll(true);
          }}
        />
      )}

      {/* ─── Compact Executive Top Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/90 px-4 py-2.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Website Analytics
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live GA4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Traffic & audience insights for udyogbill.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  range === r
                    ? "bg-white text-indigo-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchAll(false)}
            disabled={refreshing}
            title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure GA4</span>
          </button>
        </div>
      </div>

      {/* Unconfigured Alert */}
      {!loading && !configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Google Analytics 4 is not connected.</strong> Click Configure GA4 to set
              Property ID and service credentials.
            </span>
          </div>
          <button
            onClick={() => setShowSetup(true)}
            className="px-3 py-1 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 shrink-0"
          >
            Setup Now
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-3 h-20 animate-pulse"
            >
              <div className="w-6 h-6 bg-slate-100 rounded-lg mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {configured && !loading && (
        <>
          {/* ─── Row 1: 7 High-Density KPI Cards ────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* 1. Live Active Users (Cockpit Accent Card) */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 text-white rounded-xl p-3 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-100">
                  Active Now
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-1">
                <span className="text-2xl font-black text-white leading-none">
                  {realtime?.activeUsers ?? 0}
                </span>
                <span
                  className="text-[10px] text-indigo-200 font-medium truncate max-w-[85px]"
                  title={realtime?.topPages?.[0]?.page || "Live visitors"}
                >
                  {realtime?.topPages?.[0]?.page
                    ? realtime.topPages[0].page.replace(" | UdyogBill", "")
                    : "online"}
                </span>
              </div>
            </div>

            {/* 2. Total Sessions */}
            <MetricCard
              label="Total Sessions"
              value={fmtNum(overview?.sessions ?? 0)}
              icon={TrendingUp}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />

            {/* 3. Total Users */}
            <MetricCard
              label="Total Users"
              value={fmtNum(overview?.users ?? 0)}
              icon={Users}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />

            {/* 4. New Users */}
            <MetricCard
              label="New Users"
              value={fmtNum(overview?.newUsers ?? 0)}
              icon={Users}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
              badge={
                overview?.users
                  ? `${Math.round(((overview.newUsers || 0) / overview.users) * 100)}% new`
                  : undefined
              }
              badgeColor="bg-emerald-50 text-emerald-700"
            />

            {/* 5. Page Views */}
            <MetricCard
              label="Page Views"
              value={fmtNum(overview?.pageviews ?? 0)}
              icon={Eye}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />

            {/* 6. Bounce Rate */}
            <MetricCard
              label="Bounce Rate"
              value={`${(overview?.bounceRate ?? 0).toFixed(1)}%`}
              icon={ArrowDownRight}
              iconColor="text-rose-600"
              iconBg="bg-rose-50"
            />

            {/* 7. Avg Session */}
            <MetricCard
              label="Avg Duration"
              value={fmtDuration(overview?.avgSessionDuration ?? 0)}
              icon={Clock}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
          </div>

          {/* ─── Row 2: Trend Chart (7 cols) + Sources & Devices (5 cols) ──── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Trend Chart (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  Sessions & Users Trend — {RANGE_LABELS[range]}
                </h2>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-indigo-600 rounded-full" /> Sessions
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-purple-500 rounded-full" /> Users
                  </span>
                </div>
              </div>

              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={195}>
                  <LineChart
                    data={trend}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        fontSize: 11,
                        padding: "6px 10px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name="Sessions"
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      name="Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[195px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  <BarChart3 className="w-6 h-6 mb-1 opacity-50" />
                  <p className="text-xs font-medium">No trend data recorded for this range yet.</p>
                </div>
              )}
            </div>

            {/* Traffic Sources & Devices (5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Traffic Sources */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  Traffic Sources
                </h2>

                {sources.length > 0 ? (
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <div className="h-[90px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={90}>
                        <PieChart>
                          <Pie
                            data={sources}
                            dataKey="sessions"
                            nameKey="channel"
                            cx="50%"
                            cy="50%"
                            innerRadius={26}
                            outerRadius={42}
                          >
                            {sources.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [fmtNum(Number(v ?? 0)), "Sessions"]}
                            contentStyle={{ borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
                      {sources.map((s, idx) => (
                        <div key={s.channel} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-medium text-slate-700 capitalize truncate flex-1 text-[11px]">
                            {s.channel}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-900 tabular-nums">
                            {(s.percent || 0).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[185px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    <Globe className="w-6 h-6 mb-1 opacity-50" />
                    <p className="text-xs font-medium">No traffic sources</p>
                  </div>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                  Devices
                </h2>

                {devices.length > 0 ? (
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <div className="h-[90px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={90}>
                        <PieChart>
                          <Pie
                            data={devices}
                            dataKey="sessions"
                            nameKey="device"
                            cx="50%"
                            cy="50%"
                            innerRadius={26}
                            outerRadius={42}
                          >
                            {devices.map((_, idx) => (
                              <Cell
                                key={idx}
                                fill={["#6366f1", "#10b981", "#f59e0b"][idx % 3]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [fmtNum(Number(v ?? 0)), "Sessions"]}
                            contentStyle={{ borderRadius: "8px", fontSize: 11, padding: "4px 8px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
                      {devices.map((d, idx) => (
                        <div key={d.device} className="flex items-center gap-1.5 text-xs">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0"
                            style={{
                              backgroundColor: ["#6366f1", "#10b981", "#f59e0b"][idx % 3],
                            }}
                          >
                            {deviceIcon(d.device)}
                          </div>
                          <span className="font-medium text-slate-700 capitalize truncate flex-1 text-[11px]">
                            {d.device}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-900 tabular-nums">
                            {(d.percent || 0).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[185px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    <Monitor className="w-6 h-6 mb-1 opacity-50" />
                    <p className="text-xs font-medium">No device data</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Row 3: Top Pages (5 cols) + Geography (4 cols) + Live Pulse (3 cols) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Top Pages (5 cols) */}
            <div className="md:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Top Visited Pages
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">Views & Avg Time</span>
              </div>

              <div className="overflow-y-auto max-h-[200px] divide-y divide-slate-100 pr-1">
                {pages.length > 0 ? (
                  pages.map((p) => {
                    const pct = Math.min(100, Math.round((p.views / totalPageViews) * 100));
                    return (
                      <div key={p.page} className="py-2 hover:bg-slate-50/80 px-1 rounded-md">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span
                            className="font-medium text-slate-800 truncate max-w-[210px] text-[11px]"
                            title={p.page}
                          >
                            {p.page}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 text-right">
                            <span className="font-bold text-slate-900 tabular-nums text-[11px]">
                              {fmtNum(p.views)}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right">
                              {fmtDuration(p.avgTime)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No page views recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Audience Geography (4 cols) */}
            <div className="md:col-span-4 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Audience Geography
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">City / State</span>
              </div>

              <div className="overflow-y-auto max-h-[200px] divide-y divide-slate-100 pr-1">
                {geo.length > 0 ? (
                  geo.map((g) => {
                    const pct = Math.min(100, Math.round((g.users / totalGeoUsers) * 100));
                    return (
                      <div
                        key={`${g.city}-${g.region}`}
                        className="py-2 hover:bg-slate-50/80 px-1 rounded-md"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="truncate max-w-[170px]">
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {g.city || "Unknown"}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({g.region || "India"})
                            </span>
                          </div>
                          <span className="font-bold text-indigo-600 tabular-nums text-[11px]">
                            {fmtNum(g.users)} <span className="font-normal text-[10px] text-slate-400">users</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500/80 rounded-full"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No geographic data recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Live Realtime Pulse (3 cols) */}
            <div className="md:col-span-3 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Live Active Pulse
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[170px] pr-1">
                  {/* Top Live Pages */}
                  {realtime?.topPages && realtime.topPages.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Active Pages
                      </div>
                      {realtime.topPages.slice(0, 3).map((p) => (
                        <div
                          key={p.page}
                          className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded-md"
                        >
                          <span
                            className="truncate text-[11px] font-medium text-slate-700 max-w-[130px]"
                            title={p.page}
                          >
                            {p.page.replace(" | UdyogBill", "")}
                          </span>
                          <span className="font-bold text-indigo-600 tabular-nums text-[11px]">
                            {p.users}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top Live Cities */}
                  {realtime?.topCities && realtime.topCities.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Active Cities
                      </div>
                      {realtime.topCities.slice(0, 3).map((c) => (
                        <div
                          key={c.city}
                          className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded-md"
                        >
                          <span className="truncate text-[11px] font-medium text-slate-700">
                            {c.city}
                          </span>
                          <span className="font-bold text-emerald-600 tabular-nums text-[11px]">
                            {c.users}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!realtime?.topPages?.length && !realtime?.topCities?.length) && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No active sessions right now.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>Refreshes every 30s</span>
                <span>{lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
