import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Building2, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Industry Specific GST Billing Software | Pharma, FMCG, Electronics, Garments, Hardware | UdyogBill",
  description: "UdyogBill 10 mukhya industries ke liye specialized billing solution deta hai: Pharma, FMCG, Electronics, Garments, Hardware, Bakery, Retail, Wholesale, Services aur Trading.",
  alternates: {
    canonical: "https://udyogbill.com/industries",
  },
  openGraph: {
    title: "Industry Specific GST Billing Software | UdyogBill",
    description: "Customized billing, inventory, and GST compliance software tailored for 10 major Indian retail and wholesale industries.",
    url: "https://udyogbill.com/industries",
    siteName: "UdyogBill",
    type: "website",
  },
};

const officialIndustries = [
  {
    code: "PHARMA",
    emoji: "💊",
    title: "Pharma & Healthcare",
    desc: "Batch tracking, expiry alerts, Schedule H1 drug register, CDSCO compliance. Chemist & distributor complete solution.",
    href: "/industries/pharma",
    badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    features: ["Batch & Expiry Alerts", "Schedule H1 Register", "Doctor & Chemist Ledger", "Free Bonus / Scheme"],
  },
  {
    code: "FMCG",
    emoji: "📦",
    title: "FMCG & Grocery",
    desc: "Case-pack conversion, distributor trade schemes, route management, fast billing for supermarkets & kirana.",
    href: "/industries/fmcg",
    badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    features: ["Case-Pack Auto Conversion", "Trade Schemes & Discounts", "Route-wise Sales Staff", "Distributor Rate Slabs"],
  },
  {
    code: "ELECTRONICS",
    emoji: "📱",
    title: "Electronics & Mobile Retail",
    desc: "IMEI & serial number tracking, automated warranty slips, mobile repair job cards, brand margin tracking.",
    href: "/industries/electronics",
    badgeColor: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
    features: ["Dual IMEI & Serial Tracking", "Warranty Cards & Lookup", "Repair Workshop Job Cards", "Finance / EMI Split Payment"],
  },
  {
    code: "GARMENTS",
    emoji: "👕",
    title: "Garments & Footwear",
    desc: "Size-color-fit matrix, style variants, seasonal discounts, barcode tag printing, fast checkout POS.",
    href: "/industries/garments",
    badgeColor: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    features: ["Size-Color-Fit Grid", "Barcode Tag Printing", "Style Variants & Catalog", "End-of-Season Discount"],
  },
  {
    code: "HARDWARE",
    emoji: "🔨",
    title: "Hardware & Building Materials",
    desc: "Multi-UOM (Sq.Ft, Metric Ton, Bags), Saria & pipe weight calculator, paint tinting formula, contractor credit ledger.",
    href: "/industries/hardware",
    badgeColor: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    features: ["Decimal & Multi-UOM", "TMT Saria Weight Formula", "Paint Tinting Code Tracking", "Mistri / Contractor Ledger"],
  },
  {
    code: "SERVICE_SECTOR",
    emoji: "💼",
    title: "Service Sector & Agencies",
    desc: "SAC code management, TDS receivable tracking (194J/194C), monthly retainers, milestone & hourly invoicing.",
    href: "/industries/services",
    badgeColor: "bg-pink-500/10 text-pink-700 border-pink-500/30",
    features: ["SAC Code Master", "TDS 194J & 194C Tracking", "Recurring Retainer Invoices", "Quotation to Invoice in 1-Click"],
  },
  {
    code: "OTHER",
    emoji: "🏪",
    title: "General Trading & Wholesale",
    desc: "Multi-godown stock transfer, broker/agent commission ledger, wholesale quantity slabs, rapid keyboard billing.",
    href: "/industries/general-trading",
    badgeColor: "bg-slate-500/10 text-slate-700 border-slate-500/30",
    features: ["Multi-Godown Inventory", "Dalal / Broker Commission", "Wholesale Quantity Slabs", "Outstanding Ageing Analysis"],
  },
];

export default function IndustriesHubPage() {
  return (
    <>
      <section className="py-20" style={{ background: "linear-gradient(135deg,#fff7ed,#f0fdf4)" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 mb-3 border border-orange-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            7 Official Industry Specializations
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
            Aapki Industry Ke Liye <span style={{ color: "#f97316" }}>Tailored Billing Solution</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            UdyogBill generic software nahi hai. Har vyapar ke workflow, compliance aur calculation ke hisaab se dedicated modules hain.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officialIndustries.map((ind) => (
              <div
                key={ind.href}
                className="bg-white rounded-2xl border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{ind.emoji}</div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${ind.badgeColor}`}>
                      {ind.code}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "Poppins,sans-serif" }}>
                    {ind.title}
                  </h2>
                  <p className="text-gray-500 text-xs leading-relaxed mb-4">{ind.desc}</p>
                  <ul className="space-y-1.5 mb-6">
                    {ind.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={ind.href}
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
                  style={{ background: "#f97316" }}
                >
                  <span>Special Features Dekhein</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
