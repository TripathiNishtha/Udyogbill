import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Users, Award, Building2, CheckCircle, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About UdyogBill | Cloud GST Billing & Operating Software for Indian MSMEs",
  description: "Learn about UdyogBill, an initiative by DigiOpera Private Limited. We engineer modern, cloud-first GST invoicing, inventory, and accounting solutions for Indian merchants and enterprises.",
  alternates: {
    canonical: "https://udyogbill.com/about",
  },
  openGraph: {
    title: "About UdyogBill | Empowering Indian MSMEs",
    description: "Built by DigiOpera Private Limited to simplify business accounting, inventory, and compliance for Indian MSMEs.",
    url: "https://udyogbill.com/about",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="bg-white text-slate-900 space-y-10 sm:space-y-12">
      {/* ── Hero Section ── */}
      <section className="pt-2 pb-6 sm:pb-8 border-b border-slate-200" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbf5 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 bg-orange-50 text-orange-900 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            Built for Indian Vyaparis • Powered by DigiOpera
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-3 tracking-tight">
            Simplifying Commerce for Millions of{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Indian MSMEs
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-3xl mx-auto leading-relaxed">
            UdyogBill was established with a singular mission: to eliminate the friction of complex GST compliance, paper billing, and desktop-locked software, equipping Indian business owners with modern, enterprise-grade cloud tools.
          </p>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-4 sm:py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-700 mb-2">
                Our Genesis
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-slate-950 mb-4 tracking-tight">
                Why We Built UdyogBill
              </h2>
              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                <p>
                  Across India, over 63 million micro, small, and medium enterprises power the economic backbone of the nation. Yet, the vast majority were historically trapped between antiquated legacy desktop accounting systems vulnerable to hard disk crashes, and prohibitively expensive ERP platforms built for multinational corporations.
                </p>
                <p>
                  When modern GST mandates, E-Invoicing thresholds, and digital payments emerged, retailers, chemists, and distributors found themselves spending hours reconciling ledgers instead of growing their businesses.
                </p>
                <p>
                  <strong className="text-slate-900 font-bold">UdyogBill was engineered to solve this dilemma:</strong> an ultra-fast, cloud-native billing and business management platform that works out of the box on any PC, laptop, or mobile browser without requiring complex IT expertise.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Users,
                  title: "Merchant-First Design",
                  desc: "Every module is designed around counter speed and cashier convenience, cutting billing time to under 15 seconds.",
                  color: "#ea580c"
                },
                {
                  icon: ShieldCheck,
                  title: "Zero Data Compromise",
                  desc: "Continuous 256-bit SSL encryption on high-availability Oracle Cloud with automatic daily cloud snapshots.",
                  color: "#2563eb"
                },
                {
                  icon: Zap,
                  title: "Instant Cloud Sync",
                  desc: "Access your business metrics, sales registers, and inventory balances from anywhere in the world in real time.",
                  color: "#f59e0b"
                },
                {
                  icon: Award,
                  title: "Dedicated Human Support",
                  desc: "Direct access to knowledgeable product specialists via phone, WhatsApp, and remote screen-sharing sessions.",
                  color: "#059669"
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-orange-200 shadow-2xs">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border"
                      style={{ background: `${item.color}12`, borderColor: `${item.color}25` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <h3 className="font-black text-slate-950 text-sm sm:text-base mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Vision Banner */}
          <div className="rounded-2xl p-6 sm:p-8 border-2 border-orange-200 bg-orange-50/40 mb-10">
            <h3 className="text-lg sm:text-xl font-black text-slate-950 mb-2">Our Operating Vision</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
              &quot;To empower every merchant, distributor, and entrepreneur across tier-1, tier-2, and tier-3 India with world-class, affordable, and compliant billing infrastructure that accelerates financial transparency and enterprise growth.&quot;
            </p>
          </div>

          {/* Numbers Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            {[
              { num: "10,000+", label: "Active Invoices Generated" },
              { num: "14+", label: "Industry Verticals Catered" },
              { num: "99.9%", label: "Cloud Uptime Guarantee" },
              { num: "100%", label: "CBIC GST & Tax Compliant" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-2xs">
                <div className="text-2xl sm:text-3xl font-black mb-1 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {stat.num}
                </div>
                <div className="text-xs font-semibold text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="py-6 sm:pb-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-2xl p-8 sm:p-10 border-2 border-orange-200 bg-orange-50/50 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mb-3">
                Ready to Modernize Your Business Billing?
              </h2>
              <p className="text-slate-700 text-xs sm:text-sm mb-6 leading-relaxed">
                Experience why thousands of Indian business owners trust UdyogBill for their daily billing and accounting operations.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-7 py-3 rounded-xl text-sm shadow-md transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 text-sm transition-all shadow-2xs"
                >
                  Contact Our Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
