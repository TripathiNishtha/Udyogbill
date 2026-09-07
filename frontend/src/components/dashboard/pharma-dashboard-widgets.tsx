"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FileCheck2,
  Zap,
  FlaskConical,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers
} from "lucide-react";
import { pharmaDeepService, PharmaDashboardSummary } from "@/services/pharma-deep-services";

export function PharmaDashboardWidgets() {
  const [metrics, setMetrics] = useState<PharmaDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadMetrics() {
      try {
        const data = await pharmaDeepService.getDashboardMetrics();
        if (mounted) setMetrics(data);
      } catch (err) {
        console.warn("Could not load pharma metrics", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const nearExpiryTotal = (metrics?.expiringCount30Days ?? 0) + (metrics?.expiringCount60Days ?? 0);

  return (
    <section className="mb-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <h2 className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
            <span>Pharma Intelligence & Radar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border/40 font-medium lowercase">
              addon active
            </span>
          </h2>
        </div>

        <Link
          href="/app/pharma/pos"
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Launch Chemist Rapid POS</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Expiry Radar & Dump Value */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/40 border-l-4 border-l-rose-500 hover:shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
              30-60 Days
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {loading ? "..." : nearExpiryTotal}
              <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">batches near expiry</span>
            </div>
            <div className="text-xs text-rose-600/90 dark:text-rose-400/90 font-semibold mt-0.5">
              At-Risk Value: ₹{loading ? "..." : (metrics?.expiringStockValue ?? 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
            <Link
              href="/app/pharma/expiry-claims"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>Dumping & Debit Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Schedule H1 Compliance */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/40 border-l-4 border-l-amber-500 hover:shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
              Statutory
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {loading ? "..." : metrics?.scheduleH1DispensedToday ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">H1 bills today</span>
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
              Antibiotics / Narcotic audit trail
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
            <Link
              href="/app/pharma/h1-register"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>View Govt. H1 Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Generic Substitutes & Salts */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/40 border-l-4 border-l-teal-500 hover:shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/40">
              <FlaskConical className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40">
              Formulations
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">
              {loading ? "..." : metrics?.activeBatchesCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">active batches (FEFO)</span>
            </div>
            <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
              Alternate chemical salt finder
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
            <Link
              href="/app/pharma/substitutes"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>Salt & Substitute Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Quarantined & Drug Safety */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/40 border-l-4 border-l-purple-500 hover:shadow-xs transition-all flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
              Drug Safety
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {loading ? "..." : metrics?.quarantinedBatchesCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5 font-sans">quarantined batches</span>
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
              Damaged, recalled &amp; hold inventory
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
            <Link
              href="/app/pharma/batches"
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 dark:text-purple-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>Batch Audit &amp; Quarantine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
