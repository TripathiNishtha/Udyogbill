import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, Smartphone, ShieldCheck, Wrench, BarChart3, Tag, Scan } from "lucide-react";

export const metadata: Metadata = {
  title: "Electronics & Mobile Shop Billing Software India | IMEI Tracking | UdyogBill",
  description: "Electronics showroom & mobile stores ke liye best GST billing software. IMEI & serial number tracking, warranty cards, service job sheets, brand-wise margins.",
  keywords: [
    "electronics billing software",
    "mobile shop billing software",
    "imei tracking software",
    "mobile store pos india",
    "electronics gst invoice software",
    "warranty tracking billing",
  ],
  alternates: {
    canonical: "https://udyogbill.com/industries/electronics",
  },
};

export default function ElectronicsIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "UdyogBill Electronics & Mobile",
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
      "reviewCount": "1840",
    },
  };

  const features = [
    {
      icon: "ðŸ“±",
      title: "Dual IMEI & Serial Number Tracking",
      desc: "Smartphones, laptops aur appliances ke exact IMEI / Serial numbers billing par print karein. Duplicate entry ka zero chance.",
    },
    {
      icon: "ðŸ›¡ï¸",
      title: "Automated Warranty Cards",
      desc: "Invoice ke saath manufacturer aur store warranty print hoti hai. Serial scan karte hi warranty status turant check karein.",
    },
    {
      icon: "ðŸ”§",
      title: "Mobile & Laptop Repair Job Sheets",
      desc: "Customer repair devices ke liye intake job sheet banayein. Problem description, advance payment, aur technician status track karein.",
    },
    {
      icon: "ðŸ·ï¸",
      title: "Brand-Wise Margins & Commissions",
      desc: "Samsung, Apple, Xiaomi, Vivo jaise har brand aur category ke margins aur sales executive commissions auto-calculate karein.",
    },
    {
      icon: "âš¡",
      title: "Fast Barcode & Scanner Support",
      desc: "Cables, chargers, covers aur accessories ko ultra-fast barcode scanner se bill karein. Customer ka time bache.",
    },
    {
      icon: "ðŸ’³",
      title: "Finance & EMI Split Billing",
      desc: "Bajaj Finserv, PineLabs, Credit Card EMI aur Cash split payment modes ek invoice par asani se record karein.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="py-20" style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">ðŸ“±</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Electronics & Mobile Shop <br />
                <span style={{ color: "#2563eb" }}>Smart GST Billing Software</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Electronics showrooms aur retail mobile stores ke liye Bharat ka sabse bharosemand software.
                IMEI tracking, warranty slip, aur repair job card â€” sab ek jagah.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105"
                  style={{ background: "#2563eb" }}
                >
                  Free Trial Shuru Karo <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20Electronics%20Billing%20Software%20ka%20demo%20chahiye"
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
            <div className="rounded-2xl p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#2563eb12,#16a34a12)" }}>
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Electronics Dukandar Ki Pareshaniyon Ka Solution:
              </h3>
              <div className="space-y-3">
                {[
                  [
                    "IMEI aur serial number bill par manually type karna padta tha",
                    "Barcode/IMEI scanner se 1 second mein scan aur invoice generate.",
                  ],
                  [
                    "Customer purana bill kho deta tha, warranty claim mein vivad hota tha",
                    "IMEI number daal kar kisi bhi bill aur warranty ki history 2 second mein nikalein.",
                  ],
                  [
                    "Repair job work aur parts replacement ka hisaab ulajh jaata tha",
                    "Job Sheet print karein, spare parts auto-deduct honge aur SMS update jayega.",
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
              Electronics Retailers Ke Liye Special Features
            </h2>
            <p className="text-gray-600 text-sm">
              Har phone, laptop, TV aur accessory ka hisaab 100% accurate aur compliant.
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
            Aksar Pooche Jaane Wale Sawaal (FAQ)
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Kya ek bill par multiple IMEI print ho sakte hain?",
                a: "Haan, UdyogBill mein single aur dual IMEI smartphones, tablets aur laptops ke sabhi serial numbers invoice par clearly print hote hain.",
              },
              {
                q: "Bajaj Finserv ya Credit Card EMI billing kaise manage hoti hai?",
                a: "Payment section mein Split Payment option hai, jahan aap Cash + Finance company ka ref number aur approval code ek sath record kar sakte hain.",
              },
              {
                q: "Kya mobile repair workshop ke liye alag se software lena hoga?",
                a: "Bilkul nahi! UdyogBill Electronics Edition mein Repair Job Sheet aur technician assignment built-in hai.",
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
      <section className="py-16 text-center" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
        <div className="max-w-3xl mx-auto px-6 text-white">
          <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
            Apne Electronics Vyapar Ko Aaj Hi Digital Banayein
          </h2>
          <p className="text-blue-100 text-sm mb-8">
            14 din ka free trial shuru karein. Koi credit card zaroori nahi.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transition-all text-sm"
          >
            Free Trial Shuru Karo â†’
          </Link>
        </div>
      </section>
    </>
  );
}

