import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  Wrench,
  CreditCard,
  Barcode,
  Search
} from "lucide-react";

export const metadata: Metadata = {
  title: "Electronics, Mobile & Appliance Store Billing Software | IMEI & Serial Tracking",
  description: "GST billing software for mobile shops and electronics retailers. Track dual IMEI, serial numbers, print warranty slips, manage service repair job cards, and offer EMI split payments.",
  alternates: {
    canonical: "https://udyogbill.com/industries/electronics",
  },
  openGraph: {
    title: "Electronics & Mobile Store Billing Software | UdyogBill",
    description: "Track IMEI/Serial numbers, issue automated warranty slips, and streamline repair job sheets with UdyogBill.",
    url: "https://udyogbill.com/industries/electronics",
    siteName: "UdyogBill",
    type: "website",
  },
};

export default function ElectronicsIndustryPage() {
  const painPoints = [
    {
      problem: "Fraudulent warranty claims due to untracked IMEI/serial numbers on tax bills",
      solution: "Mandatory serial/IMEI capture at purchase and sale with instant warranty lookup",
    },
    {
      problem: "Disorganized mobile and appliance repair workshop job sheets and missing tokens",
      solution: "Digital repair job card system tracking spare parts, technician logs, and SMS updates",
    },
    {
      problem: "Complex multi-provider consumer finance (Bajaj, Pine Labs, UPI) split calculations",
      solution: "Automated split tender payments capturing down payment, delivery order (DO), and EMI scheme",
    },
  ];

  const features = [
    {
      icon: Smartphone,
      title: "Dual IMEI & Unique Serial Tracking",
      desc: "Record IMEI 1, IMEI 2, and serial numbers during invoice scanning. Print them prominently on customer invoices for warranty claims.",
    },
    {
      icon: ShieldCheck,
      title: "Automated Warranty Cards & Verification",
      desc: "Issue professional warranty slips with brand terms and duration. Look up any past invoice in 3 seconds using the IMEI number.",
    },
    {
      icon: Wrench,
      title: "Repair Workshop & Job Sheet Management",
      desc: "Manage customer repair devices from intake to delivery. Track technician labor charges, replaced spare parts, and issue delivery tokens.",
    },
    {
      icon: CreditCard,
      title: "Consumer Finance & Split Payments",
      desc: "Seamlessly split bill totals across Cash, Card, UPI, and Consumer Finance DOs (Bajaj Finserv, TVS Credit, HDB) without accounting errors.",
    },
    {
      icon: Barcode,
      title: "Fast Barcode Scanner Compatibility",
      desc: "Scan handset box barcodes directly. Automatically populate brand, model, color, RAM/storage variant, and IMEI numbers in one shot.",
    },
    {
      icon: Search,
      title: "Brand-Wise Incentive & Margin Analysis",
      desc: "Track company back-end schemes, promoter incentives, and brand target payouts with granular product profitability reports.",
    },
  ];

  const relatedIndustries = [
    { name: "Retail Stores", href: "/industries/retail" },
    { name: "Hardware & Building", href: "/industries/hardware" },
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-cyan-200 bg-cyan-50 text-cyan-900 shadow-2xs">
                <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
                Advanced Electronics, Mobile & Appliance POS
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight leading-[1.2]">
                Protect Margins & Track Serial Numbers with{" "}
                <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Smart Electronics Billing
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
                Capture dual IMEI and serial numbers effortlessly, issue legitimate warranty cards, manage repair job tokens, and handle consumer finance split payments with UdyogBill.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 shadow-sm transition-all"
                >
                  Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20I%20want%20a%20demo%20of%20UdyogBill%20Electronics%20Billing%20Software"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-xs sm:text-sm transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Live Electronics Demo
                </a>
              </div>
            </div>

            {/* Pain Point vs Solution Card */}
            <div className="lg:col-span-5 rounded-2xl p-5 border-2 border-orange-200 bg-orange-50/40">
              <h3 className="font-black text-slate-950 mb-3 text-sm sm:text-base">
                Electronics Shop Friction Solved:
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
              Engineered for Mobile Dealers, Showrooms & Service Centers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Complete tracking from showroom purchase to customer warranty claim and post-sale service.
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
              <p className="text-xs text-slate-600">Specialized billing solutions for other retail verticals.</p>
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
