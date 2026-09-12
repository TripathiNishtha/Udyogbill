import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Briefcase,
  ShieldCheck,
  FileCheck,
  CreditCard,
  Receipt,
  Clock
} from "lucide-react";

export const metadata: Metadata = {
  title: "Service Sector, Freelancer & Agency Billing Software | SAC Code & TDS 194J",
  description: "Cloud GST invoicing software built for service providers, IT consultants, and digital marketing agencies. SAC code management, automated TDS 194J/194C deduction, recurring retainers, and milestone payments.",
  alternates: {
    canonical: "https://udyogbill.com/industries/services",
  },
  openGraph: {
    title: "Service Sector & Agency Billing Software | UdyogBill",
    description: "SAC code management, TDS receivable tracking, recurring retainers, and formal quotations for Indian service companies.",
    url: "https://udyogbill.com/industries/services",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function ServicesIndustryPage() {
  const painPoints = [
    {
      problem: "Confusion in matching 6-digit SAC service accounting codes and GST rates",
      solution: "Searchable SAC directory auto-populating statutory 18% / 12% service tax rates",
    },
    {
      problem: "Clients deducting TDS (10% under 194J or 1% / 2% under 194C) without ledger tracking",
      solution: "Automatic TDS receivable logging maintaining running 26AS reconciliation statements",
    },
    {
      problem: "Manually recreating recurring monthly retainer invoices for long-term clients",
      solution: "Automated recurring retainer scheduler dispatching invoices on the 1st of every month",
    },
  ];

  const features = [
    {
      icon: Receipt,
      title: "Comprehensive SAC Code Master",
      desc: "Instant lookup for IT services (998314), legal advice (998211), consulting, and maintenance. Avoid tax notice penalties.",
    },
    {
      icon: CreditCard,
      title: "TDS 194J & 194C Deduction Tracking",
      desc: "Record client TDS deductions during receipt voucher entry. Generate end-of-year Form 26AS reconciliation statements effortlessly.",
    },
    {
      icon: Clock,
      title: "Recurring Monthly Retainer Invoices",
      desc: "Set and forget monthly subscription contracts. UdyogBill generates and emails PDF invoices with UPI payment links automatically.",
    },
    {
      icon: FileCheck,
      title: "1-Click Quotation to Tax Invoice",
      desc: "Draft professional project estimates with scope of work. When approved by the client, convert to a final tax invoice with one click.",
    },
    {
      icon: Briefcase,
      title: "Milestone & Stage-Wise Billing",
      desc: "Bill complex creative or software contracts in milestones (e.g. 30% advance, 40% beta delivery, 30% signoff) against a single estimate.",
    },
    {
      icon: ShieldCheck,
      title: "International Export Invoices & LUT",
      desc: "Generate export of service invoices in USD/EUR with statutory Letter of Undertaking (LUT) zero-rated GST compliance fields.",
    },
  ];

  const relatedIndustries = [
    { name: "General Trading", href: "/industries/general-trading" },
    { name: "Retail Stores", href: "/industries/retail" },
    { name: "Wholesale & Stockists", href: "/industries/wholesale" },
    { name: "Electronics & Hardware", href: "/industries/electronics" },
  ];

  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                Service Provider, Agency & Consultancy Invoicing
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Streamline Retainers, SAC Codes & TDS with{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Modern Service Invoicing
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Automate recurring client retainers, track TDS Section 194J deductions, manage SAC code classifications, and send formal proposals with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Service%20Sector%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Agency Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Service Accounting Friction Solved:
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
              Built for Agencies, Freelancers, IT Consultants & Advocates
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Clean B2B proposals and professional corporate tax invoices that win clients.
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

      {/* ── Related Verticals & SEO Links ── */}
      <section className="py-6 sm:pb-8 border-t border-slate-200 bg-slate-50/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-950">Explore Other Industry Modules:</h4>
              <p className="text-xs text-slate-600">Specialized billing solutions for trading and corporate sectors.</p>
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
