import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, Hammer, Truck, Layers, Calculator, ShieldCheck, FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = {
  title: "Hardware & Sanitary Billing Software India | Multi-UOM & Saria Calculator | UdyogBill",
  description: "Hardware, sanitary, plywood aur building material dukaano ke liye best GST billing software. Multi-UOM (Sq.Ft, Metric Ton, Bundles), paint tinting, contractor ledger.",
  keywords: [
    "hardware billing software",
    "sanitary billing software",
    "building materials gst software",
    "plywood glass billing software",
    "tmt steel weight calculator billing",
    "contractor credit ledger software",
  ],
  alternates: {
    canonical: "https://udyogbill.com/industries/hardware",
  },
};

export default function HardwareIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "UdyogBill Hardware & Building Materials",
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
      "reviewCount": "1420",
    },
  };

  const features = [
    {
      icon: "ðŸ“",
      title: "Decimal & Multi-UOM Quantities",
      desc: "Sq.Ft, Running Meter, Metric Ton, Bags, Box aur Pieces â€” sabhi units mein instant conversion aur decimal accuracy.",
    },
    {
      icon: "ðŸ—ï¸",
      title: "TMT Steel & Pipe Weight Calculator",
      desc: "Saria, GI Pipes aur Angles ke bundle aur piece count ko auto calculate karke KG/Ton mein bill karein.",
    },
    {
      icon: "ðŸŽ¨",
      title: "Paint Shades & Tinting Formulas",
      desc: "Asian Paints, Berger, Nerolac ke base paint aur colorant formula codes ko invoice aur batch ke saath track karein.",
    },
    {
      icon: "ðŸ‘·",
      title: "Contractor, Plumber & Mason Ledger",
      desc: "Mistri aur contractor credit limit, project-wise delivery challan, aur unka percentage commission auto-settle karein.",
    },
    {
      icon: "ðŸšš",
      title: "Transport Challan & E-Way Bill",
      desc: "Truck, tractor aur tempo dispatch ke liye delivery challan aur automatic GST E-Way Bill 1-click mein generate karein.",
    },
    {
      icon: "ðŸ“‘",
      title: "Glass & Plywood Size Cutting Matrix",
      desc: "Length Ã— Width formula se square feet aur square meter auto calculate karein. Cutting wastage tracking ke saath.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="py-20" style={{ background: "linear-gradient(135deg,#fffbeb,#f0fdf4)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">ðŸ”¨</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Hardware & Sanitary <br />
                <span style={{ color: "#d97706" }}>Vyapar Ka Smart GST Software</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Plywood, Sanitary, Pipes, Paints aur Building Material vyapariyon ke liye special solution.
                Complex measurement units, contractor ledger aur bulk transport bilkul aasan.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105"
                  style={{ background: "#d97706" }}
                >
                  Free Trial Shuru Karo <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20Hardware%20Billing%20Software%20ka%20demo%20chahiye"
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
            <div className="rounded-2xl p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#d9770612,#16a34a12)" }}>
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Hardware Dukandar Ki Problems Ka Pakka Ilaaj:
              </h3>
              <div className="space-y-3">
                {[
                  [
                    "Sq.Ft, Running Meter aur Kilos ka hisaab calculate karne mein ghanto lagte the",
                    "UdyogBill Length Ã— Width aur Bundle to Weight conversion auto calculate karta hai.",
                  ],
                  [
                    "Contractor aur mistri ka udhaar aur commission yaad rakhna mushkil tha",
                    "Har mistri ka separate digital ledger aur commission statement 1-click mein WhatsApp karein.",
                  ],
                  [
                    "Site delivery par maal bhejne ke baad bill banne mein vivad hota tha",
                    "Delivery Challan banayein, driver se sign karwayein, aur baad mein bill mein convert karein.",
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
              Hardware & Sanitary Store Ke Liye Powerful Tools
            </h2>
            <p className="text-gray-600 text-sm">
              Har item, chahe pipe ho, cement ho, paint ho ya screw â€” har unit ka perfect hisaab.
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
                q: "Kya Saria aur TMT bar ka vajan pieces se nikal sakta hai?",
                a: "Haan! UdyogBill mein Standard Weight Chart formula integrated hai. Number of pieces enter karte hi Metric Ton aur KG auto-calculate ho jata hai.",
              },
              {
                q: "Paints ke shade numbers aur mixing colorants track ho sakte hain?",
                a: "Ji haan, Paint shade code, base volume, aur additional tinting chemical codes ko invoice mein note aur track kar sakte hain.",
              },
              {
                q: "Site par direct delivery ke liye E-Way bill kaise banega?",
                a: "Challan ya Tax Invoice save karte hi 'Generate E-Way Bill' click karein, NIC portal se directly E-Way bill generate ho jata hai.",
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
      <section className="py-16 text-center" style={{ background: "linear-gradient(135deg,#78350f,#d97706)" }}>
        <div className="max-w-3xl mx-auto px-6 text-white">
          <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
            Apni Hardware Dukan Ko Aaj Hi Smart Banayein
          </h2>
          <p className="text-amber-100 text-sm mb-8">
            14 din ka free trial shuru karein. Koi installation ya credit card zaroori nahi.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transition-all text-sm"
          >
            Free Trial Shuru Karo â†’
          </Link>
        </div>
      </section>
    </>
  );
}

