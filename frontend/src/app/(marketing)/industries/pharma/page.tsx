import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Pill,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Zap,
  HelpCircle
} from "lucide-react";

export const metadata: Metadata = {
  title: "Best Pharma Billing Software in India | Batch & Expiry Management",
  description: "Specialized GST pharma billing software for wholesale distributors and retail chemists. Automated batch tracking, near-expiry alerts, Schedule H1 registers, and Form 20B/21B compliance.",
  alternates: {
    canonical: "https://udyogbill.com/industries/pharma",
  },
  openGraph: {
    title: "Best Pharma Billing Software in India | Batch & Expiry Management",
    description: "Cloud-based pharma distributor and chemist shop billing software with CDSCO compliance and automated expiry dump claims.",
    url: "https://udyogbill.com/industries/pharma",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function PharmaIndustryPage() {
  const painPoints = [
    {
      problem: "Manual batch and expiry tracking causing heavy expiry dump losses",
      solution: "Automated FIFO batch dispensing with 30/60/90-day color-coded near-expiry alerts",
    },
    {
      problem: "Tedious physical record keeping for Schedule H and H1 narcotics",
      solution: "Automated digital Schedule H1 register logging doctor name, patient details, and Rx number",
    },
    {
      problem: "Complex distributor bonus calculations (e.g. 10+1, 20+2 schemes)",
      solution: "Automatic free goods calculation and cash discount adjustment with zero manual math",
    },
    {
      problem: "Slow credit note generation for damaged or expired medicine returns",
      solution: "One-click expiry dump credit notes with automated GST reconciliation",
    },
  ];

  const features = [
    {
      icon: Pill,
      title: "Batch & Expiry Date Lifecycle",
      desc: "Track manufacturer, batch code, manufacturing date, and expiry month. Prevent staff from dispensing expired medicine at POS checkout.",
    },
    {
      icon: FileText,
      title: "Digital Schedule H & H1 Register",
      desc: "Maintain strict CDSCO compliance. Log prescribing doctor name, patient contact, batch code, and quantity dispensed automatically.",
    },
    {
      icon: Zap,
      title: "Pharma Bonus & Trade Scheme Calculator",
      desc: "Support multi-slab trade schemes (e.g., Buy 10 Get 1 Free, 5% cash discount). Tax is computed automatically on net payable value.",
    },
    {
      icon: ShieldCheck,
      title: "Drug License Printing (Form 20B & 21B)",
      desc: "Print statutory DL numbers (Form 20B, 21B, 20G) and FSSAI license numbers cleanly on all B2B wholesale invoices and retail receipts.",
    },
    {
      icon: AlertTriangle,
      title: "Automated Expiry Claim Processing",
      desc: "Generate company-wise expiry claim statements to return near-expiry medicines to pharmaceutical stockists before cutoff dates.",
    },
    {
      icon: CheckCircle,
      title: "Chemist & Hospital Ledger Khata",
      desc: "Monitor credit limits and overdue payment ageing for retail medical stores and nursing homes with instant WhatsApp balance reminders.",
    },
  ];

  const relatedIndustries = [
    { name: "FMCG Distribution", href: "/industries/fmcg" },
    { name: "Retail & Supermarket", href: "/industries/retail" },
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "General Trading", href: "/industries/general-trading" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-rose-200 bg-rose-50 text-rose-800 shadow-2xs">
                <Pill className="w-3.5 h-3.5 text-rose-600" />
                CDSCO & GST Compliant Pharma Operating System
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                India&apos;s Most Reliable Billing Software for{" "}
                <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">
                  Pharma Distributors & Chemists
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Streamline batch tracking, eliminate expiry losses, maintain digital Schedule H1 drug registers, and calculate multi-slab bonus schemes in seconds with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Pharma%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Pharma Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Operational Challenges Solved by UdyogBill:
              </h3>
              <div className="space-y-2.5">
                {painPoints.map((item) => (
                  <div key={item.problem} className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                    <div className="text-[11px] text-red-600 font-bold mb-0.5">⚠️ {item.problem}</div>
                    <div className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{item.solution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialized Capabilities ── */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="max-w-2xl mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mb-1.5">
              Built Specifically for Medicine Wholesalers & Retail Stores
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Every pharmaceutical compliance requirement is integrated directly into your checkout workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3.5 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-orange-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-orange-200 bg-orange-50 text-orange-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-sm sm:text-base mb-1">{f.title}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Internal Linking & Related Verticals ── */}
      <section className="py-6 sm:pb-8 border-t border-slate-200 bg-slate-50/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-950">Explore Other Industry Modules:</h4>
              <p className="text-xs text-slate-600">Tailored ERP solutions for retail and wholesale sectors.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {relatedIndustries.map((ind) => (
                <Link
                  key={ind.name}
                  href={ind.href}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:border-orange-400 hover:text-orange-600 transition-all shadow-2xs"
                >
                  {ind.name}
                </Link>
              ))}
              <Link
                href="/pricing"
                className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 font-bold text-xs hover:bg-orange-100 transition-all"
              >
                View Pricing Plans →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
