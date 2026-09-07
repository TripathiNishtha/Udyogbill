"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Send,
  Building2,
  MapPin,
  FileText,
  HelpCircle,
  TrendingUp,
  Tag,
  ArrowRight,
  Code,
  ExternalLink,
} from "lucide-react";
import { CITIES_DATA } from "@/lib/city-data";

interface SeoFaqItem {
  question: string;
  answer: string;
}

interface GeneratedSeoResult {
  industryCode: string;
  location: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  h2: string;
  painPoint: string;
  featureSolution: string;
  lsiKeywords: string[];
  faqs: SeoFaqItem[];
}

const INDUSTRIES = [
  { code: "PHARMA", label: "Pharma & Healthcare" },
  { code: "FMCG", label: "FMCG & Grocery" },
  { code: "ELECTRONICS", label: "Electronics & Mobile" },
  { code: "GARMENTS", label: "Garments & Textiles" },
  { code: "HARDWARE", label: "Hardware & Building" },
  { code: "SERVICE_SECTOR", label: "Services & Agencies" },
  { code: "OTHER", label: "General Trading & Wholesale" },
];

export default function AiSeoStudioPage() {
  const [activeTab, setActiveTab] = useState<"ai-generator" | "google-suggest" | "ping">("ai-generator");

  // AI Generator state
  const [selectedIndustry, setSelectedIndustry] = useState("PHARMA");
  const [selectedCity, setSelectedCity] = useState("Lucknow");
  const [focusKeyword, setFocusKeyword] = useState("pharma billing software");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedSeoResult | null>(null);

  // Google Suggest state
  const [suggestQuery, setSuggestQuery] = useState("billing software for ");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestSource, setSuggestSource] = useState("");

  // Ping State
  const [pinging, setPinging] = useState(false);
  const [pingResults, setPingResults] = useState<any[] | null>(null);

  // Copied helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGenerating(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("udyogbill_token") || localStorage.getItem("udyog_access_token")
          : null;

      const cityObj = CITIES_DATA[selectedCity.toLowerCase()] || { name: selectedCity, state: "" };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}/api/v1/superadmin/growth/seo/generate-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            industryCode: selectedIndustry,
            city: cityObj.name,
            state: cityObj.state,
            primaryKeyword: focusKeyword,
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setGeneratedResult(json);
      }
    } catch {
      // Handled
    }
    setGenerating(false);
  };

  const handleSuggest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!suggestQuery.trim()) return;
    setSuggestLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("udyogbill_token") || localStorage.getItem("udyog_access_token")
          : null;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}/api/v1/superadmin/growth/seo/keywords/suggest?query=${encodeURIComponent(
          suggestQuery.trim()
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.suggestions || []);
        setSuggestSource(json.source || "");
      }
    } catch {
      // Handled
    }
    setSuggestLoading(false);
  };

  const handlePingSitemap = async () => {
    setPinging(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("udyogbill_token") || localStorage.getItem("udyog_access_token")
          : null;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"}/api/v1/superadmin/growth/seo/ping-sitemap`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const json = await res.json();
        setPingResults(json.engines || []);
      }
    } catch {
      // Handled
    }
    setPinging(false);
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Free External AI & Search APIs
            </span>
            <span className="text-xs text-slate-400">• Super Admin Studio</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AI SEO Content & Live Keyword Discovery Studio
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Discover real-time Google search queries for India and generate 1-click SEO landing page kits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/growth/seo"
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-850 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            SEO Pages Matrix
          </Link>
          <Link
            href="/admin/growth"
            className="px-3.5 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Growth Overview
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("ai-generator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "ai-generator"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          1-Click AI SEO Kit Generator
        </button>

        <button
          onClick={() => setActiveTab("google-suggest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "google-suggest"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Google Live Autocomplete (Free API)
        </button>

        <button
          onClick={() => setActiveTab("ping")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "ping"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Search Engine Sitemap Ping
        </button>
      </div>

      {/* TAB 1: AI SEO CONTENT GENERATOR */}
      {activeTab === "ai-generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Target Parameters
            </h2>

            <form onSubmit={handleGenerateContent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Industry Vertical
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.code} value={ind.code}>
                      {ind.label} ({ind.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Commercial City / Region
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="India">All India (National Campaign)</option>
                  {Object.values(CITIES_DATA).map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Focus Keyword
                </label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="e.g. mobile shop billing software"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                {generating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {generating ? "Generating Kit..." : "Generate SEO Kit"}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {!generatedResult ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-indigo-400 opacity-60" />
                <h3 className="text-base font-bold text-white mb-1">
                  Ready to Generate Organic Landing Page Copy
                </h3>
                <p className="text-xs max-w-md mx-auto leading-relaxed">
                  Select an industry, pick a city, and click &ldquo;Generate SEO Kit&rdquo;. The AI engine
                  creates Google SERP previews, H1/H2 outlines, LSI keywords, and Schema-ready FAQs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Google SERP Card Preview */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                    <span>Google Search Result Preview</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Real SERP View</span>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 text-left font-sans">
                    <div className="text-xs text-gray-700 flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-gray-900">UdyogBill</span>
                      <span className="text-gray-400">https://udyogbill.com</span>
                    </div>
                    <h3 className="text-base text-blue-800 hover:underline font-medium cursor-pointer leading-snug">
                      {generatedResult.metaTitle}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {generatedResult.metaDescription}
                    </p>
                  </div>
                </div>

                {/* Meta Tags & Headings */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Target Copy & Meta Kit</h3>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `Title: ${generatedResult.metaTitle}\nDesc: ${generatedResult.metaDescription}\nH1: ${generatedResult.h1}\nH2: ${generatedResult.h2}`,
                          "all-meta"
                        )
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      {copiedKey === "all-meta" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copy Meta Bundle
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <span className="text-slate-400 font-semibold">Meta Title ({generatedResult.metaTitle.length} chars):</span>
                      <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 mt-1 font-mono">
                        {generatedResult.metaTitle}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold">Meta Description ({generatedResult.metaDescription.length} chars):</span>
                      <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 mt-1 font-mono leading-relaxed">
                        {generatedResult.metaDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 font-semibold">H1 Heading:</span>
                        <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 mt-1 font-mono">
                          {generatedResult.h1}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold">H2 Sub-heading:</span>
                        <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 mt-1 font-mono">
                          {generatedResult.h2}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LSI Keywords */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
                  <div className="text-xs font-bold text-white">Recommended LSI Search Keywords:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedResult.lsiKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded text-xs bg-slate-950 border border-slate-800 text-cyan-300 font-mono"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Schema FAQs */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-400" />
                      Schema.org FAQ Accordion Content
                    </h3>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(
                            {
                              "@context": "https://schema.org",
                              "@type": "FAQPage",
                              mainEntity: generatedResult.faqs.map((f) => ({
                                "@type": "Question",
                                name: f.question,
                                acceptedAnswer: {
                                  "@type": "Answer",
                                  text: f.answer,
                                },
                              })),
                            },
                            null,
                            2
                          ),
                          "faq-json"
                        )
                      }
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      {copiedKey === "faq-json" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Code className="w-3 h-3" />
                      )}
                      Copy JSON-LD Schema
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {generatedResult.faqs.map((faq, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">Q: {faq.question}</div>
                        <div className="text-slate-400 mt-1 leading-relaxed">A: {faq.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE LIVE AUTOCOMPLETE */}
      {activeTab === "google-suggest" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                Live Google Organic Search Autocomplete (Free API)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pulls actual queries typed by users across India directly from Google&rsquo;s suggest API.
              </p>
            </div>

            <form onSubmit={handleSuggest} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={suggestQuery}
                  onChange={(e) => setSuggestQuery(e.target.value)}
                  placeholder="e.g. billing software for, chemist pos software, mobile shop billing..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={suggestLoading}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                {suggestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {suggestLoading ? "Querying Google..." : "Fetch Queries"}
              </button>
            </form>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>Try popular seeds:</span>
              {[
                "billing software pharma",
                "mobile shop billing",
                "garment pos india",
                "hardware billing software",
                "billing software lucknow",
              ].map((seed) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => {
                    setSuggestQuery(seed);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono"
                >
                  {seed}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Google Search Queries Found ({suggestions.length})
              </h3>
              {suggestSource && (
                <span className="text-[11px] text-emerald-400 font-mono">{suggestSource}</span>
              )}
            </div>

            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Type a seed query and click &ldquo;Fetch Queries&rdquo; to pull real-time search terms.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-mono text-slate-200">
                      <span className="text-slate-500 text-[10px] w-4">{idx + 1}.</span>
                      <span>{s}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyToClipboard(s, `s-${idx}`)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="Copy Keyword"
                      >
                        {copiedKey === `s-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setFocusKeyword(s);
                          setActiveTab("ai-generator");
                        }}
                        className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold"
                        title="Use in AI Content Generator"
                      >
                        Use in AI &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SITEMAP PING & SEARCH ENGINE NOTIFICATION */}
      {activeTab === "ping" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5 max-w-2xl">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Real-Time Search Engine Sitemap Ping
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Notify Google Search Console and Bing Webmaster bots whenever new landing pages or cities are added to re-crawl{" "}
              <code className="text-indigo-300 font-mono">https://udyogbill.com/sitemap.xml</code>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-semibold">Active Sitemap URL:</span>
              <p className="text-indigo-300 font-mono mt-0.5">https://udyogbill.com/sitemap.xml</p>
            </div>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              Inspect XML <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <button
            onClick={handlePingSitemap}
            disabled={pinging}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {pinging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {pinging ? "Dispatching Pings..." : "Ping Google & Bing Now"}
          </button>

          {pingResults && (
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="text-xs font-bold text-white">Ping Dispatch Results:</div>
              <div className="space-y-2">
                {pingResults.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-200">{r.engine}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.statusCode >= 200 && r.statusCode < 300
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      Status: {r.statusCode} ({r.statusMessage})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
