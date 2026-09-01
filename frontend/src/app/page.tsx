import Link from "next/link";
import { Building2, ShieldCheck, Layers, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              UB
            </div>
            <span className="text-xl font-bold tracking-tight">UdyogBill</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded border border-indigo-500/30">
              Enterprise SaaS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Universal Multi-Industry Architecture Ready</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Next-Generation Multi-Industry <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Billing & Business Management
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Engineered on high-performance .NET 10 Web API, PostgreSQL, and Next.js.
          Tailored capability matrices for Pharma, FMCG, Garments, Bakery, Wholesale, Retail, and 14+ target industries.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
          >
            <span>Register Your Business</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all"
          >
            <span>Platform Login</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Absolute Multi-Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cryptographically verified server-side claims resolution with EF Core query filters guaranteeing zero cross-tenant data leakage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">14+ Dynamic Industry Templates</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Common Core engine powering Pharma batches, FMCG packaging conversions, Garment size/color matrices, and Bakery BOM recipes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4 border border-pink-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Super Admin Control Hub</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Centralized platform governance for subscriptions, trial lifecycles, dynamic feature entitlement models, and real-time tenant telemetry.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 UdyogBill SaaS Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>PostgreSQL 15+ Single Source of Truth</span>
            <span>.NET 10 Web API Backend</span>
            <span>Next.js App Router</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
