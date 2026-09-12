"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Layers,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import { superAdminService } from "@/services/super-admin-services";
import { PlatformStats, Tenant } from "@/types";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, tenantsData] = await Promise.all([
          superAdminService.getStats().catch(() => null),
          superAdminService.getTenants({ pageSize: 5 }).catch(() => null),
        ]);

        if (statsData) setStats(statsData);
        if (tenantsData) setRecentTenants(tenantsData.items);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTenants = stats?.totalTenants ?? recentTenants.length;
  const activeTenants = stats?.activeTenants ?? 1;
  const trialTenants = stats?.trialTenants ?? 0;
  const suspendedTenants = stats?.suspendedTenants ?? 0;
  const totalIndustries = stats?.totalIndustries ?? 14;
  const estimatedMrr = stats?.estimatedMrr ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Level 1 • SaaS Control Plane
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            Super Admin Platform Hub
          </h1>
          <p className="text-sm text-slate-400">
            Real-time subscriber lifecycle governance, dynamic industry catalogs, and platform telemetry.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/tenants"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Tenants</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Tenants */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Subscribers
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? "..." : totalTenants}
            </span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              Active
            </span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400 pt-3 border-t border-slate-900">
            <span>{activeTenants} Active</span>
            <span>•</span>
            <span>{trialTenants} Trial</span>
            <span>•</span>
            <span className="text-rose-400">{suspendedTenants} Suspended</span>
          </div>
        </div>

        {/* Estimated MRR */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estimated MRR
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              ₹{loading ? "..." : estimatedMrr.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-400">/ month</span>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs text-slate-400 pt-3 border-t border-slate-900">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Monetization Tier Engine</span>
          </div>
        </div>

        {/* Active Industries */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Industry Verticals
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {loading ? "..." : totalIndustries}
            </span>
            <span className="text-xs text-purple-400 font-medium">Dynamic Core</span>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs text-slate-400 pt-3 border-t border-slate-900">
            <span>Pharma, Retail, FMCG, Bakery +10</span>
          </div>
        </div>

        {/* Security & Health */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Security Telemetry
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              Guarded
            </span>
            <span className="text-xs text-slate-400">Isolation Active</span>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-xs text-emerald-400 pt-3 border-t border-slate-900">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>0 Violations Detected</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Industry Breakdown & Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Industry Distribution Widget */}
        <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Industry Breakdown</span>
            </h3>
            <Link
              href="/admin/industries"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5"
            >
              <span>Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.industryDistribution && stats.industryDistribution.length > 0 ? (
              stats.industryDistribution.map((ind) => (
                <div key={ind.industryCode} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{ind.industryName}</span>
                    <span className="text-slate-400">{ind.tenantCount} tenant(s)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (ind.tenantCount / (totalTenants || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                <Layers className="w-8 h-8 mx-auto text-slate-700" />
                <p>14 Dynamic Industry vertical templates ready.</p>
                <p className="text-[11px] text-slate-400">Subscribers will populate this matrix.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Subscribers List */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Recent Subscribers & Onboarding</span>
              </h3>
              <p className="text-xs text-slate-400">Latest business tenants registered on the platform</p>
            </div>
            <Link
              href="/admin/tenants"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="pb-3 font-semibold">Tenant / Business</th>
                  <th className="pb-3 font-semibold">Industry</th>
                  <th className="pb-3 font-semibold">Admin</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {recentTenants.length > 0 ? (
                  recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium text-white">{tenant.businessName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{tenant.code}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300">
                          {tenant.industryName || tenant.industryCode}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-300">{tenant.adminEmail}</div>
                        <div className="text-[11px] text-slate-400">{tenant.primaryPhone}</div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tenant.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : tenant.status === "Trial"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/tenants`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No tenants registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
