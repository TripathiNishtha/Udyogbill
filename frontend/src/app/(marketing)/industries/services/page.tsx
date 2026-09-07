import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle, Briefcase, FileCheck, Clock, Percent, ShieldCheck, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Service Sector & Agency Invoicing Software India | SAC Codes & TDS | UdyogBill",
  description: "Service providers, consultants, repair centres aur digital agencies ke liye best GST invoicing software. SAC codes, TDS deduction, milestone billing, retainers.",
  keywords: [
    "service billing software india",
    "sac code gst invoice software",
    "consultant billing software",
    "agency invoice generator india",
    "tds tracking invoice software",
    "freelancer gst billing software",
  ],
  alternates: {
    canonical: "https://udyogbill.com/industries/services",
  },
};

export default function ServicesIndustryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "UdyogBill Service Sector & Agency",
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
      "reviewCount": "1180",
    },
  };

  const features = [
    {
      icon: "ðŸ“‘",
      title: "Automated SAC Code Master",
      desc: "Services Accounting Codes (SAC 9983, 9987, 9954 etc.) aur 18% / 12% GST slabs automatically apply hoti hain bina kisi error ke.",
    },
    {
      icon: "ðŸ’µ",
      title: "TDS Deduction & Receivable Tracking",
      desc: "Client ne Section 194J (10%) ya 194C (1%/2%) ke antargat jo TDS kata hai, uska exact hisaab aur Form 26AS matching report.",
    },
    {
      icon: "ðŸ”„",
      title: "Recurring Retainer Invoices",
      desc: "Monthly retainer aur maintenance contract (AMC) clients ke liye automatic schedule billing aur WhatsApp payment links.",
    },
    {
      icon: "â±ï¸",
      title: "Milestone & Hourly Billing",
      desc: "Project stages (50% Advance, 30% Delivery, 20% Signoff) ya hourly rates ke basis par professional itemized bills banayein.",
    },
    {
      icon: "ðŸŽ¯",
      title: "Quotation to Tax Invoice (1-Click)",
      desc: "Detailed quotation client ko share karein. Approval milte hi 1-click mein GST Tax Invoice mein convert karein.",
    },
    {
      icon: "ðŸ’³",
      title: "Instant UPI QR & Bank Integration",
      desc: "Invoice ke upar Dynamic UPI QR Code aur Bank details print karein taaki client instant payment kar sake.",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="py-20" style={{ background: "linear-gradient(135deg,#fdf2f8,#f0fdf4)" }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-6xl mb-4">ðŸ’¼</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Service Sector & Agencies <br />
                <span style={{ color: "#db2777" }}>Professional GST Invoicing</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Consultants, digital agencies, repair centers, aur service professionals ke liye specialized billing tool.
                SAC codes, TDS receivable tracking, aur beautiful invoices jo brand image banayein.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105"
                  style={{ background: "#db2777" }}
                >
                  Free Trial Shuru Karo <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://wa.me/919473807622?text=Hi%2C%20Service%20Invoicing%20Software%20ka%20demo%20chahiye"
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
            <div className="rounded-2xl p-6 shadow-sm" style={{ background: "linear-gradient(135deg,#db277712,#16a34a12)" }}>
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
                Service Business Ki Chintao Ka Samadhan:
              </h3>
              <div className="space-y-3">
                {[
                  [
                    "Client TDS kaat leta tha lekin bill mein reconcile karna mushkil hota tha",
                    "Net Amount, TDS Deducted (194J/194C) aur Balance Due bill par clearly mention hota hai.",
                  ],
                  [
                    "Har mahine recurring retainers aur AMC ka bill banana bhool jaate the",
                    "Automated Recurring Billing monthly schedule par invoice generate karta hai.",
                  ],
                  [
                    "Word/Excel ke crude bills se client par accha impression nahi banta tha",
                    "Sleek, branded PDF invoices with dynamic UPI QR Code jo payments fast karate hain.",
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
              Service Providers Ke Liye Tailored Features
            </h2>
            <p className="text-gray-600 text-sm">
              Non-inventory service workflows ke liye specially optimized invoicing engine.
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
                q: "Kya stock ya inventory off karke sirf service billing ho sakti hai?",
                a: "Haan! Service Sector module activate karte hi inventory tracking optional ho jati hai, aur software pure service invoicing mode mein switch ho jata hai.",
              },
              {
                q: "Client ka TDS Form 16A se verify kaise karein?",
                a: "UdyogBill ek TDS Receivable Ledger generate karta hai jisme har invoice ka deducted TDS date-wise record rehta hai.",
              },
              {
                q: "Advance payment par GST receipt voucher ban sakta hai?",
                a: "Ji haan, GST rules ke anusaar Advance Receipt Voucher aur jab service complete ho to final Tax Invoice adjust karne ki suvidha uplabdh hai.",
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
      <section className="py-16 text-center" style={{ background: "linear-gradient(135deg,#831843,#db2777)" }}>
        <div className="max-w-3xl mx-auto px-6 text-white">
          <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: "Poppins,sans-serif" }}>
            Apne Service Business Ko Professional Banayein
          </h2>
          <p className="text-pink-100 text-sm mb-8">
            14 din ka free trial shuru karein. Har device se access karein.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-pink-600 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:bg-gray-100 transition-all text-sm"
          >
            Free Trial Shuru Karo â†’
          </Link>
        </div>
      </section>
    </>
  );
}

