"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Search,
  ExternalLink,
  CheckCircle2,
  FileCode,
  Flame,
  ArrowRight,
  TrendingUp,
  Building2,
  MapPin,
  Sparkles,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { CITIES_DATA } from "@/lib/city-data";

interface SeoPageEntry {
  url: string;
  category: "Industry" | "City" | "Core";
  title: string;
  targetKeywords: string[];
  schemaType: string;
  priority: number;
  industryCode?: string;
}

const SEO_REGISTRY: SeoPageEntry[] = [
  // Core
  {
    url: "/",
    category: "Core",
    title: "UdyogBill — Smart Multi-Industry GST Billing Platform",
    targetKeywords: ["billing software india", "gst billing erp", "multi industry billing software"],
    schemaType: "SoftwareApplication, Organization",
    priority: 1.0,
  },
  {
    url: "/pricing",
    category: "Core",
    title: "Pricing Plans & Packages | UdyogBill",
    targetKeywords: ["billing software price", "erp pricing india", "gst software plans"],
    schemaType: "PriceSpecification",
    priority: 0.9,
  },
  {
    url: "/features",
    category: "Core",
    title: "Complete Billing, Accounting & Inventory Features | UdyogBill",
    targetKeywords: ["billing features", "gst invoice generator", "inventory software"],
    schemaType: "WebPage",
    priority: 0.9,
  },

  // 7 Official Industries
  {
    url: "/industries/pharma",
    category: "Industry",
    title: "Pharma Distributor & Chemist Billing Software | Batch & Expiry",
    targetKeywords: ["pharma billing software", "batch tracking software", "chemist pos software", "schedule h1 register"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "PHARMA",
  },
  {
    url: "/industries/fmcg",
    category: "Industry",
    title: "FMCG, Grocery & Supermarket GST Billing Software",
    targetKeywords: ["fmcg billing software", "grocery store pos", "case pack conversion", "distributor schemes"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "FMCG",
  },
  {
    url: "/industries/electronics",
    category: "Industry",
    title: "Electronics & Mobile Store Billing Software | Dual IMEI Tracking",
    targetKeywords: ["electronics billing software", "mobile shop pos", "imei tracking software", "warranty slip billing"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "ELECTRONICS",
  },
  {
    url: "/industries/garments",
    category: "Industry",
    title: "Garments, Apparel & Footwear Billing Software | Size-Color Matrix",
    targetKeywords: ["garment billing software", "clothing shop pos", "size color matrix software", "apparel barcode billing"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "GARMENTS",
  },
  {
    url: "/industries/hardware",
    category: "Industry",
    title: "Hardware, Sanitary & Building Materials Billing Software | Multi-UOM",
    targetKeywords: ["hardware billing software", "sanitary shop pos", "tmt saria weight calculator", "plywood sqft billing"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "HARDWARE",
  },
  {
    url: "/industries/services",
    category: "Industry",
    title: "Service Sector & Agency Invoicing Software | SAC Codes & TDS",
    targetKeywords: ["service billing software", "sac code invoice", "tds 194j invoice tracking", "consultant invoice generator"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "SERVICE_SECTOR",
  },
  {
    url: "/industries/general-trading",
    category: "Industry",
    title: "General Trading & Wholesale Billing Software | Multi-Godown ERP",
    targetKeywords: ["wholesale billing software", "trading erp software", "multi godown transfer", "broker commission billing"],
    schemaType: "SoftwareApplication, FAQPage",
    priority: 0.9,
    industryCode: "OTHER",
  },

  // City Pages
  ...Object.values(CITIES_DATA).map((c): SeoPageEntry => ({
    url: `/city/${c.slug}`,
    category: "City",
    title: `Best GST Billing Software in ${c.name} (${c.state}) | Free Demo`,
    targetKeywords: [
      `billing software in ${c.name.toLowerCase()}`,
      `gst billing software ${c.name.toLowerCase()}`,
      `best billing software in ${c.state.toLowerCase()}`,
      `retail pos ${c.name.toLowerCase()}`,
    ],
    schemaType: "SoftwareApplication, LocalBusiness",
    priority: 0.85,
  })),
];

export default function SeoMatrixPage() {
  const [filter, setFilter] = useState<"All" | "Industry" | "City" | "Core">("All");
  const [search, setSearch] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const filteredPages = SEO_REGISTRY.filter((p) => {
    if (filter !== "All" && p.category !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUrl = p.url.toLowerCase().includes(q);
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchKeywords = p.targetKeywords.some((k) => k.toLowerCase().includes(q));
      return matchUrl || matchTitle || matchKeywords;
    }
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalKeywords = SEO_REGISTRY.reduce((acc, curr) => acc + curr.targetKeywords.length, 0);

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              SEO Engine & Sitemap Matrix
            </span>
            <span className="text-xs text-slate-400">• Organic Search Command</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Search Index & Landing Page Directory
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Full audit of indexed landing pages, target keyword density, and schema markup across all 7 industries & cities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-850 hover:text-white transition-all shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            Inspect sitemap.xml
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-850 hover:text-white transition-all shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            robots.txt
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Target Pages
          </div>
          <div className="text-3xl font-black text-white mt-2">{SEO_REGISTRY.length}</div>
          <p className="text-[11px] text-emerald-400 mt-1">100% active in sitemap.xml</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Official Industries
          </div>
          <div className="text-3xl font-black text-purple-400 mt-2">7 / 7</div>
          <p className="text-[11px] text-slate-400 mt-1">Pharma, FMCG, Electronics, Garments, Hardware, Services, Trading</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Local Commercial Hubs
          </div>
          <div className="text-3xl font-black text-indigo-400 mt-2">
            {Object.keys(CITIES_DATA).length} Cities
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lucknow, Kanpur, Delhi, Mumbai, Varanasi, etc.</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Target Keywords Tracked
          </div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{totalKeywords}+</div>
          <p className="text-[11px] text-cyan-400 mt-1">High commercial intent queries</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          {(["All", "Industry", "City", "Core"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {cat === "All" ? "All Landing Pages" : `${cat} Pages`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URL, title, or target keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Page Path</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Page Title / Intent</th>
                <th className="px-4 py-3">Target Search Keywords</th>
                <th className="px-4 py-3">Structured Data Schema</th>
                <th className="px-4 py-3 text-center">Sitemap Priority</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPages.map((page, idx) => (
                <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-400">
                    <div className="flex items-center gap-1.5">
                      <span>{page.url}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        page.category === "Industry"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : page.category === "City"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {page.category}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-200 max-w-[280px]">
                    <div className="truncate" title={page.title}>
                      {page.title}
                    </div>
                  </td>

                  <td className="px-4 py-3 max-w-[260px]">
                    <div className="flex flex-wrap gap-1">
                      {page.targetKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300 font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                    {page.schemaType}
                  </td>

                  <td className="px-4 py-3 text-center font-bold text-slate-300 font-mono">
                    {page.priority.toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => copyToClipboard(`https://udyogbill.com${page.url}`)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
                        title="Copy Canonical URL"
                      >
                        {copiedUrl === `https://udyogbill.com${page.url}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        title="Open Live Preview"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
