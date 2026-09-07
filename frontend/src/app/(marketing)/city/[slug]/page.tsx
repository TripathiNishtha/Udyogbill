import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CITIES_DATA, getCityBySlug } from "@/lib/city-data";
import {
  MapPin,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Building2,
  PhoneCall,
  Sparkles,
  Users,
  Printer,
  FileSpreadsheet,
  ScanBarcode,
  Smartphone,
  Laptop,
  Check,
  Zap,
  HelpCircle,
  Layers,
  FileCheck,
  BarChart4,
  RotateCcw,
  Scale,
  Factory,
  Truck,
  Wrench,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

type HeroArchetype = "mandi" | "industrial" | "retail" | "logistics";

function getCityArchetype(slug: string, primaryIndustries: string[] = [], hubs: string[] = []): HeroArchetype {
  // Explicit overrides for flagship mandi/textile/handloom cities
  if (["varanasi", "surat", "lucknow", "jaipur", "indore", "ahmedabad", "patna", "madurai", "mirzapur", "jodhpur", "amritsar", "gorakhpur", "jabalpur", "prayagraj", "bareilly"].includes(slug)) {
    return "mandi";
  }

  // Explicit overrides for major industrial/manufacturing clusters
  if (["kanpur", "pune", "ludhiana", "agra", "meerut", "rajkot", "vadodara", "bhopal", "ghaziabad", "coimbatore", "jamshedpur", "aligarh", "moradabad", "jalandhar"].includes(slug)) {
    return "industrial";
  }

  // Explicit overrides for logistics, gateways & mining hubs
  if (["guwahati", "ranchi", "dhanbad", "jammu", "bhubaneswar", "kochi", "visakhapatnam", "dehradun"].includes(slug)) {
    return "logistics";
  }

  // Default to fast-paced multi-store / metro POS
  return "retail";
}

function renderHeroHeadline(tagline: string | undefined, cityName: string) {
  if (!tagline) {
    return (
      <div className="space-y-2">
        <span className="text-slate-900 block text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
          {cityName} Ke Vyapar Ka
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-5xl lg:text-6xl font-black">
          No. 1 GST Billing Software
        </span>
      </div>
    );
  }

  // Case 1: Tagline has em-dash " — "
  if (tagline.includes(" — ")) {
    const [contextPart, actionPart] = tagline.split(" — ");
    return (
      <div className="space-y-2.5">
        <span className="text-slate-900 block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
          {contextPart}
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
          — {actionPart}
        </span>
      </div>
    );
  }

  // Case 2: Tagline has " Ke Liye "
  if (tagline.includes(" Ke Liye ")) {
    const [contextPart, actionPart] = tagline.split(" Ke Liye ");
    return (
      <div className="space-y-2.5">
        <span className="text-slate-900 block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
          {contextPart} <span className="text-slate-500 font-bold text-xl sm:text-2xl">Ke Liye</span>
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
          {actionPart}
        </span>
      </div>
    );
  }

  // Case 3: Tagline has " Ka "
  if (tagline.includes(" Ka ")) {
    const [contextPart, actionPart] = tagline.split(" Ka ");
    return (
      <div className="space-y-2.5">
        <span className="text-slate-900 block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
          {contextPart} <span className="text-slate-500 font-bold text-xl sm:text-2xl">Ka</span>
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
          {actionPart}
        </span>
      </div>
    );
  }

  // Case 4: Tagline has " & "
  if (tagline.includes(" & ")) {
    const lastAmpIndex = tagline.lastIndexOf(" & ");
    const contextPart = tagline.substring(0, lastAmpIndex);
    const actionPart = tagline.substring(lastAmpIndex + 3);
    return (
      <div className="space-y-2.5">
        <span className="text-slate-900 block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
          {contextPart}
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
          & {actionPart}
        </span>
      </div>
    );
  }

  // Fallback: Split last 3 words
  const words = tagline.split(" ");
  if (words.length > 4) {
    const main = words.slice(0, -3).join(" ");
    const highlight = words.slice(-3).join(" ");
    return (
      <div className="space-y-2.5">
        <span className="text-slate-900 block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
          {main}
        </span>
        <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent block text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
          {highlight}
        </span>
      </div>
    );
  }

  return (
    <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent font-black block text-3xl sm:text-5xl lg:text-6xl">
      {tagline}
    </span>
  );
}

export async function generateStaticParams() {
  return Object.keys(CITIES_DATA).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return { title: "Billing Software India | UdyogBill" };

  const customTitle = city.heroTagline
    ? `${city.heroTagline} | UdyogBill`
    : `Best GST Billing Software in ${city.name} (${city.state}) | Free Demo | UdyogBill`;

  const customDescription = city.heroSubtitle ||
    `${city.name} ke vyapariyon ke liye No. 1 GST billing software. Pharma, FMCG, Electronics, Garments, Hardware sabhi dukaano ke liye. State GST Code ${city.stateCode} compliant.`;

  return {
    title: customTitle,
    description: customDescription,
    keywords: [
      `billing software in ${city.name.toLowerCase()}`,
      `gst billing software ${city.name.toLowerCase()}`,
      `best billing software in ${city.state.toLowerCase()}`,
      `retail pos ${city.name.toLowerCase()}`,
      `pharma software ${city.name.toLowerCase()}`,
      `hardware billing ${city.name.toLowerCase()}`,
      ...(city.popularHubs ? city.popularHubs.map(h => `${h.toLowerCase()} billing software`) : []),
    ],
    alternates: {
      canonical: `https://udyogbill.com/city/${slug}`,
    },
    openGraph: {
      title: customTitle,
      description: customDescription,
      url: `https://udyogbill.com/city/${slug}`,
      siteName: "UdyogBill",
      type: "website",
    },
  };
}

export default async function CityLandingPage({ params }: Props) {
  const { slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) {
    notFound();
  }

  const archetype = getCityArchetype(slug, city.primaryIndustries, city.popularHubs);

  // Archetype Theme Config
  const archetypeThemes = {
    mandi: {
      bgGradient: "linear-gradient(135deg, #fffbeb 0%, #ffffff 50%, #fff7ed 100%)",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
      BadgeIcon: Scale,
      badgeLabel: `${city.name} Mandi & Wholesale Trade • GST Code: ${city.stateCode}`,
    },
    industrial: {
      bgGradient: "linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f0fdf4 100%)",
      badgeClass: "bg-slate-900 text-white border-slate-700",
      BadgeIcon: Factory,
      badgeLabel: `${city.name} Industrial & Job-Work Cluster • GST: ${city.stateCode}`,
    },
    retail: {
      bgGradient: "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #fff7ed 100%)",
      badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
      BadgeIcon: ScanBarcode,
      badgeLabel: `${city.name} Multi-Counter Cloud POS • State Code: ${city.stateCode}`,
    },
    logistics: {
      bgGradient: "linear-gradient(135deg, #ecfeff 0%, #ffffff 50%, #f5f3ff 100%)",
      badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300",
      BadgeIcon: Truck,
      badgeLabel: `${city.name} Regional Gateway & Outstation • Code: ${city.stateCode}`,
    },
  };

  const currentTheme = archetypeThemes[archetype];
  const ThemeIcon = currentTheme.BadgeIcon;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `UdyogBill GST Billing Software - ${city.name}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, Windows, macOS",
    areaServed: {
      "@type": "City",
      name: city.name,
      addressRegion: city.state,
      addressCountry: "IN",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1250",
    },
  };

  const localFaqs = city.localFaqs && city.localFaqs.length > 0
    ? city.localFaqs
    : [
        {
          q: `Kya UdyogBill ${city.state} ke State GST Code ${city.stateCode} ke anusaar 100% compliant hai?`,
          a: `Haan, bilkul! UdyogBill mein ${city.state} ka State GST Code (${city.stateCode}) pre-configured milta hai. Intra-state sales mein automatically CGST aur SGST split hota hai aur doosre states ke liye IGST calculate hota hai. Aapko manual tax rules set nahi karne padenge.`,
        },
        {
          q: `Dukan par internet band ho jane par kya ${city.name} mein billing ruk jayegi?`,
          a: `Nahi! UdyogBill ka offline POS architecture network cuts mein bhi seamlessly kaam karta hai. Aap continuous thermal receipt print kar sakte hain aur barcode scan kar sakte hain. Internet aate hi saara stock aur ledger cloud par auto-sync ho jata hai.`,
        },
        {
          q: `Kya hum ${city.name} ki local markets ke liye Thermal Printer aur Barcode Scanner jod sakte hain?`,
          a: `Haan, UdyogBill sabhi 2-inch aur 3-inch thermal printers (TVS, Epson, NGX, Bluetooth POS), USB/Wireless 1D & 2D barcode scanners, aur electronic weighing scales ko bina kisi extra driver ke direct support karta hai.`,
        },
        {
          q: `Kya hum Vyapar, Busy, Marg ya Excel se apna puraana stock aur party ledger transfer kar sakte hain?`,
          a: `Haan! UdyogBill mein 1-click Excel/CSV import feature hai. Agar aapko transfer karne mein koi dikkat aati hai, to hamari technical team remote desk ke zariye puraana data bina kisi charge ke migrate karwake deti hai.`,
        },
        {
          q: `${city.name} ke vyapariyon ke liye onboarding aur training kaise milegi?`,
          a: `Aapko hamari dedicated support team se live phone (+91 94738 07622) aur WhatsApp par personalized Hindi aur English mein step-by-step video demo aur staff training di jaati hai.`,
        },
      ];

  return (
    <div className="bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Dynamic Multi-Archetype Local Hero Section */}
      <section
        className="pt-4 pb-12 sm:pt-6 sm:pb-16 border-b border-slate-200"
        style={{
          background: currentTheme.bgGradient,
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Local Value Prop */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border shadow-2xs ${currentTheme.badgeClass}`}>
                  <ThemeIcon className="w-4 h-4 shrink-0" />
                  {currentTheme.badgeLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  {city.traderCountText} Ka Bharosa
                </span>
              </div>

              {/* Dynamic Styled Headline — Never Full Black */}
              <h1
                className="mb-6 tracking-tight"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {renderHeroHeadline(city.heroTagline, city.name)}
              </h1>

              <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed mb-6 max-w-2xl">
                {city.heroSubtitle ||
                  `${city.name} ke wholesale distributors, retail dukandaron aur chain stores ke liye banaya gaya complete POS & inventory management system. Superfast billing, barcode scanning, E-Way Bill, E-Invoicing aur automatic GST returns.`}
              </p>

              {/* Local Commercial Hubs Chip Matrix */}
              <div className="mb-8 p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  {city.name} Ke Pramukh Vyapar Mandal & Market Hubs:
                </div>
                <div className="flex flex-wrap gap-2">
                  {city.popularHubs.map((hub) => (
                    <span
                      key={hub}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 border border-slate-300 text-slate-800 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 transition-colors"
                    >
                      📍 {hub}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-4 flex-wrap items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-white font-extrabold px-7 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-base bg-orange-600 hover:bg-orange-700 hover:-translate-y-0.5"
                >
                  14 Din Ka Free Trial Lein <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={`https://wa.me/919473807622?text=Hi%2C%20main%20${encodeURIComponent(
                    city.name
                  )}%20se%20hoon%20aur%20UdyogBill%20ka%20live%20demo%20dekhna%20chahta%20hoon`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-extrabold px-6 py-4 rounded-xl border-2 border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all text-base shadow-sm"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" /> {city.name} Demo Team
                </a>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Koi Credit Card Ki Zaroorat Nahi • Instant Setup
              </p>
            </div>

            {/* Right Column: Archetype-Specific Interactive Showcase */}
            <div className="lg:col-span-5">
              {archetype === "mandi" && (
                <div className="rounded-3xl p-6 sm:p-7 border-2 border-amber-200 bg-white shadow-xl ring-8 ring-amber-50/70">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-amber-600" />
                        {city.name} Mandi & Trade Engine
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Mandi v2.6 Ready
                    </span>
                  </div>

                  {/* Simulated Mandi Slip */}
                  <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 mb-4">
                    <div className="flex justify-between items-center text-xs font-black text-amber-900 mb-2">
                      <span>Mandi Counter Slip</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-slate-700">
                        #{city.stateCode}-{city.name.slice(0, 3).toUpperCase()}-2026
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between font-semibold">
                        <span>Trade Focus:</span>
                        <span className="text-slate-950 font-bold">{city.primaryIndustries[0] || "Wholesale Trade"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dalali / Brokerage:</span>
                        <span className="text-emerald-700 font-bold">Auto-Calculated & Split</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tare / Bardana Deduction:</span>
                        <span className="text-slate-800 font-bold">1-Click Net Weight</span>
                      </div>
                      <div className="flex justify-between border-t border-amber-200/80 pt-1.5 font-bold">
                        <span>Tax Calculation:</span>
                        <span className="text-orange-700 font-extrabold">{city.state} GST Code {city.stateCode} CGST+SGST</span>
                      </div>
                    </div>
                  </div>

                  {/* City Specific Trade Highlights */}
                  {city.localTradeProfile && (
                    <div className="space-y-2.5 mb-5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-xs font-black">
                          ✓
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          <strong className="text-slate-900 block font-bold">Mandi Pain-Point Solved:</strong>
                          {city.localTradeProfile.majorPainPoint.slice(0, 115)}...
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-black">
                          ★
                        </div>
                        <div className="text-xs text-emerald-950 font-medium">
                          <strong className="text-emerald-900 block font-bold">{city.name} Advantage:</strong>
                          {city.localTradeProfile.udyogBillSolution.slice(0, 115)}...
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-3.5 bg-slate-950 text-white flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-amber-400 font-extrabold uppercase tracking-wider">
                        Mandi Onboarding Desk
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        +91 94738 07622
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/919473807622?text=Hi%2C%20main%20${encodeURIComponent(
                        city.name
                      )}%20se%20hoon%20aur%20mandi%20billing%20demo%20chahta%20hoon`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-black text-xs transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Mandi Demo
                    </a>
                  </div>
                </div>
              )}

              {archetype === "industrial" && (
                <div className="rounded-3xl p-6 sm:p-7 border-2 border-slate-300 bg-slate-900 text-white shadow-2xl ring-8 ring-slate-800/50">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-orange-400" />
                        {city.name} Industrial & Job-Work Engine
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Tier-1 Vendor Ready
                    </span>
                  </div>

                  {/* Simulated Industrial Delivery Challan & BOM */}
                  <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 mb-4 font-mono text-xs">
                    <div className="flex justify-between items-center text-orange-400 font-bold mb-2">
                      <span>JOB-WORK WORKFLOW</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[11px] text-emerald-400 border border-slate-700">
                        ACTIVE
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-300 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cluster Hub:</span>
                        <span className="text-white font-bold">{city.popularHubs[0] || "Industrial MIDC"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dispatch Challan:</span>
                        <span className="text-emerald-400 font-bold">DC-Auto Merge to Tax Invoice</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">BOM & Raw Material:</span>
                        <span className="text-white">Auto-Deduct with Scrap %</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700 pt-1.5 font-bold">
                        <span className="text-slate-400">E-Way Bill & IRN:</span>
                        <span className="text-orange-300">1-Click Direct NIC Sync</span>
                      </div>
                    </div>
                  </div>

                  {/* City Specific Industrial Advantage */}
                  {city.localTradeProfile && (
                    <div className="space-y-2 mb-5">
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                        <span className="text-orange-400 font-bold block mb-0.5">Focus Industry:</span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {city.primaryIndustries.slice(0, 2).join(", ")}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs">
                        <span className="text-emerald-400 font-bold block mb-0.5">UdyogBill Advantage:</span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {city.localTradeProfile.udyogBillSolution.slice(0, 115)}...
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-3.5 bg-slate-800 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Industrial Technical Desk
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        +91 94738 07622
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/919473807622?text=Hi%2C%20main%20${encodeURIComponent(
                        city.name
                      )}%20industrial%20cluster%20se%20hoon%20aur%20job-work%20demo%20chahta%20hoon`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" /> Get Demo
                    </a>
                  </div>
                </div>
              )}

              {archetype === "retail" && (
                <div className="rounded-3xl p-6 sm:p-7 border-2 border-blue-200 bg-white shadow-xl ring-8 ring-blue-50/70">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <ScanBarcode className="w-3.5 h-3.5 text-blue-600" />
                        {city.name} Multi-Counter Cloud POS
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                      2-Sec Checkout
                    </span>
                  </div>

                  {/* Simulated POS Receipt */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
                    <div className="flex justify-between items-center text-xs font-black text-slate-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 text-orange-600" /> Thermal 3" Receipt
                      </span>
                      <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        PAID via UPI QR
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Barcode Gun Scan:</span>
                        <span className="font-mono text-emerald-700 font-bold">0.4s Instant Lookup</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Store Sync:</span>
                        <span className="text-slate-900 font-bold">{city.popularHubs.slice(0, 2).join(" & ")} Counters</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Printer Compatibility:</span>
                        <span className="text-slate-800 font-medium">TVS, Epson, NGX, Bluetooth (Driverless)</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                        <span>Offline Mode:</span>
                        <span className="text-blue-700 font-extrabold">Active (Zero Downtime on Power Cut)</span>
                      </div>
                    </div>
                  </div>

                  {/* City Specific Retail Advantage */}
                  {city.localTradeProfile && (
                    <div className="space-y-2.5 mb-5">
                      <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-200 text-orange-800 flex items-center justify-center shrink-0 text-xs font-black">
                          ⚡
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          <strong className="text-slate-900 block font-bold">{city.name} Retail Challenge:</strong>
                          {city.localTradeProfile.majorPainPoint.slice(0, 115)}...
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 text-xs font-black">
                          ★
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          <strong className="text-slate-900 block font-bold">POS Solution:</strong>
                          {city.localTradeProfile.udyogBillSolution.slice(0, 115)}...
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-blue-400 font-extrabold uppercase tracking-wider">
                        Retail POS Quick Setup
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        +91 94738 07622
                      </div>
                    </div>
                    <Link
                      href="/register"
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      Start POS Trial →
                    </Link>
                  </div>
                </div>
              )}

              {archetype === "logistics" && (
                <div className="rounded-3xl p-6 sm:p-7 border-2 border-indigo-200 bg-white shadow-xl ring-8 ring-indigo-50/70">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-indigo-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                        {city.name} Regional Gateway & Bilti Desk
                      </span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                      Multi-State IGST
                    </span>
                  </div>

                  {/* Simulated Logistics Bilti */}
                  <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200 mb-4">
                    <div className="flex justify-between items-center text-xs font-black text-indigo-950 mb-2">
                      <span>Transport Bilti & Dispatch Slip</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-slate-700">
                        LR-{city.stateCode}-9942
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Dispatch Origin:</span>
                        <span className="font-bold text-slate-900">{city.name} ({city.state} Code {city.stateCode})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstation Route:</span>
                        <span className="font-bold text-indigo-800">Direct Multi-State IGST + E-Way Bill</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Udhar Recovery:</span>
                        <span className="font-bold text-emerald-700">Auto WhatsApp Statement + UPI Link</span>
                      </div>
                      <div className="flex justify-between border-t border-indigo-200 pt-1.5 font-bold">
                        <span>Stock Traceability:</span>
                        <span className="text-slate-900 font-extrabold">Batch Expiry / Serial No. / Weight Loss</span>
                      </div>
                    </div>
                  </div>

                  {/* City Specific Logistics Advantage */}
                  {city.localTradeProfile && (
                    <div className="space-y-2.5 mb-5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 text-xs font-black">
                          🚚
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          <strong className="text-slate-900 block font-bold">Regional Distribution Focus:</strong>
                          {city.localTradeProfile.commercialFocus.slice(0, 115)}...
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-black">
                          ★
                        </div>
                        <div className="text-xs text-emerald-950 font-medium">
                          <strong className="text-emerald-900 block font-bold">Logistics Advantage:</strong>
                          {city.localTradeProfile.udyogBillSolution.slice(0, 115)}...
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-indigo-400 font-extrabold uppercase tracking-wider">
                        Logistics Onboarding Desk
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        +91 94738 07622
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/919473807622?text=Hi%2C%20main%20${encodeURIComponent(
                        city.name
                      )}%20se%20hoon%20aur%20outstation%20billing%20demo%20chahta%20hoon`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Bilti Demo
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. City Specific Commercial Spotlight & Trade Challenge Section */}
      {city.localTradeProfile && (
        <section className="py-14 bg-gradient-to-b from-white to-orange-50/40 border-b border-slate-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
            <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-orange-200 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                    Local Mandi Intelligence: {city.name}
                  </span>
                  <h2
                    className="text-2xl sm:text-3xl font-black text-slate-950 mt-2.5"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {city.name} Vyapar Ka Asal Mudda Aur UdyogBill Solution
                  </h2>
                </div>
                <div className="text-xs font-extrabold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                  🎯 100% Tailored for {city.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Mandi & Market Structure
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">
                    Commercial Focus
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {city.localTradeProfile.commercialFocus}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-red-50/60 border border-red-200">
                  <div className="text-xs font-black uppercase tracking-wider text-red-600 mb-1.5">
                    Ground-Level Challenge
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">
                    Vyapari Ki Badi Pareshani
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {city.localTradeProfile.majorPainPoint}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-1.5">
                    UdyogBill Advantage
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-2">
                    Hamara Asardaar Solution
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {city.localTradeProfile.udyogBillSolution}
                  </p>
                </div>
              </div>

              {/* Contextual Internal Links Pill Strip */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="font-extrabold text-slate-700">
                  ⚡ Quick Business Navigation for {city.name}:
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/features"
                    className="font-bold text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
                  >
                    View All Features →
                  </Link>
                  <Link
                    href="/pricing"
                    className="font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
                  >
                    Check Pricing & Plans →
                  </Link>
                  <Link
                    href="/industries"
                    className="font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    Explore 10+ Industries →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. State GST Statutory & Compliance Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              100% Tax Department Verified
            </div>
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {city.state} GST Niyam & E-Invoicing Compliance
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              {city.name} ke vyapariyon ko tax notices aur penalties se bachane ke liye sabhi statutory features automated hain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-xl mb-4">
                  {city.stateCode}
                </div>
                <h3 className="text-lg font-bold text-slate-950 mb-2">
                  State GST Code {city.stateCode} Validation
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Har invoice par party ke GSTIN ka pehla do-digit verify hota hai. Agar party {city.state} ki hai to automatic CGST + SGST apply hoga, bahar ki state hone par IGST.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                ✅ Zero Tax Calculation Errors
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xl mb-4">
                  IRN
                </div>
                <h3 className="text-lg font-bold text-slate-950 mb-2">
                  E-Invoicing & B2B QR Code Ready
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  ₹5 Crore se adhik turnover wale vyapariyon ke liye direct IRP portal integration. 1-click mein IRN number aur signed QR code generate hota hai.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                ✅ Govt. Mandated E-Invoice Compatible
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
                  EWB
                </div>
                <h3 className="text-lg font-bold text-slate-950 mb-2">
                  Instant E-Way Bill Generation
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  ₹50,000 se adhik consignment ke liye trans-docking ya vehicle number enter karke turant E-Way Bill banao aur transport copy print karo.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                ✅ Part-A & Part-B 1-Click Sync
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Industry Solutions Specific to City */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {city.name} Ke Mukhya Business Sectors Ke Liye Specialised Features
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              Aapki industry chahe wholesale ho ya retail, UdyogBill har product category ki khas requirement samajhta hai.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {city.industryDeepDives && city.industryDeepDives.length > 0
              ? city.industryDeepDives.map((ind, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl mb-4">
                        📦
                      </div>
                      <h3 className="font-extrabold text-slate-950 text-lg mb-2">
                        {ind.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {ind.problemSolved}
                      </p>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 mb-6 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Key: {ind.keyFeature}
                      </div>
                    </div>
                    <Link
                      href={ind.link}
                      className="w-full text-center py-2.5 rounded-xl text-xs font-bold bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-800 border border-orange-200 hover:border-orange-600 transition-colors flex items-center justify-center gap-1"
                    >
                      {ind.title} Features Dekhein <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              : city.primaryIndustries.map((ind, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border-2 border-slate-200 bg-white hover:border-orange-500 hover:shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl mb-4">
                        📦
                      </div>
                      <h3 className="font-extrabold text-slate-950 text-lg mb-2">
                        {ind}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {ind} vyapar ke liye pre-defined HSN codes, GST slab rates, size/batch variants aur unit conversions ready hain.
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700 font-semibold mb-6">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Live Stock Tracking
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Party Ledger & Udhaar Khata
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Thermal & A4 Invoice Print
                        </li>
                      </ul>
                    </div>
                    <Link
                      href="/industries"
                      className="w-full text-center py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-orange-600 hover:text-white text-slate-800 transition-colors"
                    >
                      Is Industry Ka Demo Lein →
                    </Link>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* 4. Hardware & Peripherals Compatibility Grid */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-3">
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              Plug & Play Hardware Support
            </div>
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Aapke Purane Hardware Ke Sath 100% Compatible
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              Naya printer ya scanner khareedne ki zaroorat nahi — UdyogBill aapki dukan ke existing setups ke sath turant jud jata hai.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Printer,
                title: "Thermal Receipt Printers",
                desc: "TVS, Epson, NGX, Everycom aur Bluetooth POS printers (2 inch / 3 inch / 58mm / 80mm roll).",
              },
              {
                icon: ScanBarcode,
                title: "Barcode Scanners",
                desc: "USB, Wireless 2.4GHz aur Bluetooth 1D/2D QR code scanners instant keystroke ke sath.",
              },
              {
                icon: Laptop,
                title: "Desktop & Laptops",
                desc: "Windows 10/11, macOS aur Chrome browser par bina kisi heavy software installation ke superfast.",
              },
              {
                icon: Smartphone,
                title: "Mobile Billing Apps",
                desc: "Android smartphone aur tablet se billing, stock check aur WhatsApp bill share karein.",
              },
            ].map((hw) => {
              const Icon = hw.icon;
              return (
                <div
                  key={hw.title}
                  className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-slate-950 text-base mb-2">
                      {hw.title}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {hw.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Driverless Setup
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (Accordion) */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-slate-950 mb-3 tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {city.name} Vyapariyon Ke Aam Sawaal (FAQs)
            </h2>
            <p className="text-slate-700 text-base">
              Billing software lene se pehle jo sawaal aapke mann mein aate hain, unka spasht jawab:
            </p>
          </div>

          <div className="space-y-4">
            {localFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border-2 border-slate-200 bg-slate-50/70 hover:bg-white transition-all shadow-2xs"
              >
                <h3 className="text-base font-extrabold text-slate-950 flex items-start gap-2.5 mb-2.5 leading-snug">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    Q
                  </span>
                  {faq.q}
                </h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed pl-8">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Sticky/Bottom Conversion Action Strip */}
      <section className="py-16 bg-slate-950 text-white text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="inline-block px-3.5 py-1 rounded-full text-xs font-bold text-orange-400 bg-orange-950 border border-orange-800 mb-4">
            {city.name} Vyapari Special Offer
          </div>
          <h2
            className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {city.name} Mein Apni Dukan Ko Digital Banayein
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            14 din ka free trial shuru karein. Hamare billing experts aapki dukan par ya remote screen-share ke zariye data migration aur printer setup mein poori madad karenge.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-xl transition-all"
            >
              Free Trial Shuru Karo <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`https://wa.me/919473807622?text=Hi%2C%20main%20${encodeURIComponent(
                city.name
              )}%20se%20hoon%20aur%20UdyogBill%20setup%20karwana%20chahta%20hoon`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-xl transition-all"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp Pe Baat Karein
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-5">
            Toll-Free / Direct Hotline: <span className="text-white font-bold">+91 94738 07622</span> (10 AM – 7 PM)
          </p>
        </div>
      </section>
    </div>
  );
}
