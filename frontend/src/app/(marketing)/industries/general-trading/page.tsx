import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, Layers, Warehouse, Calculator, Percent, ShieldCheck, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "General Trading & Wholesale Billing Software India | Multi-Godown | UdyogBill",
  description: "India's #1 GST billing software for general trading, wholesale merchants, distributors & multi-godown businesses. Batch tracking, party credit & e-way bill in one click.",
  keywords: [
    "general trading billing software",
    "wholesale billing software india",
    "multi godown billing software",
    "wholesale billing software",
    "fmcg wholesale billing software",
    "udyogbill general trading",
  ],
  alternates: {
    canonical: "https://udyogbill.com/industries/general-trading",
  },
};

export default function GeneralTradingIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "UdyogBill General Trading & Wholesale",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, Android, Windows",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1960",
    },
  };

  const features = [
    {
      icon: "ðŸ¬",
      title: "Multi-Godown & Warehouse Transfer",
      desc: "Ek godown se dusre godown mein stock transfer karein with delivery challan aur live warehouse-wise stock visibility.",
    },
    {
      icon: "ðŸ¤",
      title: "Broker & Agent Commission Tracking",
      desc: "Vyapar mein aadat ya dalali ka percentage/per-unit hisaab auto-calculate karein aur broker payment ledger maintain karein.",
    },
    {
      icon: "ðŸ“Š",
      title: "Quantity Slab & Wholesale Pricing",
      desc: "Peti, carton ya bulk purchase par alag-alag rate tiers automatically apply hote hain bina manual calculator use kiye.",
    },
    {
      icon: "â°",
      title: "Outstanding Ageing Analysis",
      desc: "30 din, 60 din, 90+ din se ruka hua udhaar turant identify karein aur 1-click WhatsApp payment reminder bhejein.",
    },
    {
      icon: "ðŸšš",
      title: "E-Way Bill & E-Invoice Auto Generate",
      desc: "Bade orders ke liye â‚¹50,000+ E-Way bill aur B2B E-Invoice government portal se direct sync ke sath banayein.",
    },
    {
      icon: "âš¡",
      title: "Rapid Keyboard POS Billing",
      desc: "Bina mouse chhue sirf Enter, Tab aur Arrow keys se seconds mein wholesale aur retail parchi banayein.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="py-20" style={{ background: "linear-gradient(135deg,#f8fafc,#f0fdf4)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">ðŸª</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                General Trading & Wholesale <br />
                <span style={{ color: "#475569" }}>All-in-One GST ERP Software</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Traders, distributors aur wholesalers ke liye sabse powerful platform.
                Multi-godown inventory, dalal/broker commission, aur outstanding recovery ab aasan.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105"
                  style={{ background: "#334155" }}
                >
                  Free Trial Shuru Karo <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20General%20Trading%20Billing%20Software%20ka%20demo%20chahiye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl border-2 transition-all hover:bg-green-50"
                  style={{ borderColor: "#25D366", color: "#16a34a" }}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Demo
                </a>
              </div>
            </div>

            {/* Pain Points Solved */}
            <div className="rounded-2xl p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#33415512,#16a34a12)" }}>
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Wholesale Vyapari Ki Mushkilon Ka Hal:
              </h3>
              <div className="space-y-3">
                {[
                  [
                    "Kaunsa maal kis godown mein kitna bacha hai pata nahi chalta tha",
                    "Real-time godown-wise inventory reports aur intra-warehouse stock transfers.",
                  ],
                  [
                    "Broker/agent ki dalali calculate karne mein vivad ho jata tha",
                    "Har bill par broker select karein, uski commission sheet automatically ready.",
                  ],
                  [
                    "Market mein udhaar fasa rehta tha, pata nahi chalta tha kisse lena hai",
                    "Party Ageing Report se overdue udhaar dekhein aur automatic WhatsApp reminders bhejein.",
                  ],
                ].map(([p, s]) => (
                  <div key={p} className="bg-white rounded-xl p-4 shadow-2xs border border-gray-100">
                    <div className="text-xs text-red-500 mb-1 font-medium">âŒ {p}</div>
                    <div className="text-sm font-semibold text-gray-800 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
                      {s}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "Poppins,sans-serif" }}>
              Wholesale Vyapar Ke Liye Powerful Features
            </h2>
            <p className="text-gray-600 text-sm">
              Bulk trade, dynamic pricing slabs aur reliable audit-ready ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2" style={{ fontFamily: "Poppins,sans-serif" }}>
                  {f.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8" style={{ fontFamily: "Poppins,sans-serif" }}>
            Frequently Asked Questions (FAQ)
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Kya ek business ke andar 5 godown manage ho sakte hain?",
                a: "Haan! UdyogBill mein aap unlimited godown/branches add kar sakte hain aur har godown ka alag stock count dekh sakte hain.",
              },
              {
                q: "Quantity discount slabs kaise configure karein?",
                a: "Item master mein jaakar 'Volume Slabs' set karein â€” jaise 1-10 peti: â‚¹500, 11-50 peti: â‚¹470, 50+ peti: â‚¹450. Billing karte waqt rate auto-select ho jayega.",
              },
              {
                q: "GST returns (GSTR-1, GSTR-3B) file karne mein kaise madad milti hai?",
                a: "GSTR-1 JSON export direct generate hota hai jise aap seedhe GST Portal par upload kar sakte hain bina kisi CA delay ke.",
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm mb-1">{faq.q}</h4>
                <p className="text-gray-600 text-xs leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center" style={{ background: "linear-gradient(135deg,#0f172a,#334155)" }}>
        <div className="max-w-3xl mx-auto px-6 text-white">
          <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
            Apne Wholesale Vyapar Ko No. 1 Banayein
          </h2>
          <p className="text-slate-300 text-sm mb-8">
            14 din ka free trial shuru karein. Setup mein hamari team madad karegi.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-slate-800 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transition-all text-sm"
          >
            Free Trial Shuru Karo â†’
          </Link>
        </div>
      </section>
    </>
  );
}

