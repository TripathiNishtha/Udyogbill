"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, industryService } from "@/services/api-services";
import { Industry } from "@/types";
import {
  Building2,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle,
  Gift,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Briefcase
} from "lucide-react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);

  const [formData, setFormData] = useState({
    businessName: "",
    tradeName: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    primaryPhone: "",
    industryId: "",
    gstin: "",
    referralCode: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) {
      setFormData((prev) => ({ ...prev, referralCode: refParam.trim().toUpperCase() }));
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadIndustries() {
      try {
        const data = await industryService.getIndustries();
        const canonical = data.filter((ind: any) =>
          ["PHARMA", "FMCG", "ELECTRONICS", "GARMENTS", "HARDWARE", "SERVICE_SECTOR", "OTHER"].includes(ind.code)
        );
        const finalIndustries = canonical.length > 0 ? canonical : data;
        setIndustries(finalIndustries);
        if (finalIndustries.length > 0) {
          setFormData((prev) => ({ ...prev, industryId: finalIndustries[0].id }));
        }
      } catch (err) {
        setIndustries([
          { id: "1", code: "PHARMA", name: "Pharmaceuticals & Healthcare (Batch, Expiry, H1)", description: "Batch & Expiry", icon: "activity", displayOrder: 1, isActive: true, modules: [] },
          { id: "2", code: "FMCG", name: "FMCG & Grocery (Multi-UOM, Packaging, Schemes)", description: "Multi-UOM & Schemes", icon: "truck", displayOrder: 2, isActive: true, modules: [] },
          { id: "3", code: "ELECTRONICS", name: "Electronics & Mobile (Serial Numbers, IMEI, Warranty)", description: "Serials & Warranty", icon: "tv", displayOrder: 3, isActive: true, modules: [] },
          { id: "4", code: "GARMENTS", name: "Garments, Apparel & Footwear (Size-Color-Fit Matrix)", description: "Size/Color Matrix", icon: "tag", displayOrder: 4, isActive: true, modules: [] },
          { id: "5", code: "HARDWARE", name: "Hardware, Paint & Sanitary (Weight/Dimensions)", description: "Hardware & Multi-Rate", icon: "tool", displayOrder: 5, isActive: true, modules: [] },
          { id: "6", code: "SERVICE_SECTOR", name: "Service Sector & Consulting (Job Sheets, Services)", description: "Service Invoicing", icon: "briefcase", displayOrder: 6, isActive: true, modules: [] },
          { id: "7", code: "OTHER", name: "General Trading & Retail (Invoicing & POS)", description: "General Trade & POS", icon: "globe", displayOrder: 7, isActive: true, modules: [] },
        ]);
      } finally {
        setLoadingIndustries(false);
      }
    }
    loadIndustries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.registerTenant(formData);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please check inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between select-none font-sans relative py-6 sm:py-8 px-4 sm:px-6">
      {/* Ambient background glow accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar with Real UdyogBill Logo */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between shrink-0 relative z-10 mb-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-white rounded-xl px-3 py-1.5 border border-white/30 shadow-md transition-transform group-hover:scale-105">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill Logo"
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </div>
        </Link>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="hidden sm:inline-block text-slate-300 font-medium">Already have an account?</span>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex items-center justify-center relative z-10">
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl relative">
          
          {/* Header with Official Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-block p-2 rounded-2xl bg-white border border-slate-200 shadow-sm mb-3">
              <img
                src="/udyogbill-brand-logo.png"
                alt="UdyogBill Logo"
                className="h-10 sm:h-12 w-auto mx-auto object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Register Business Tenant
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Start your 14-day free trial. Multi-industry ERP &amp; GST billing platform.
            </p>
          </div>

          {formData.referralCode && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <Gift className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-bold">Referral Partner Applied:</span>{" "}
                <code className="font-mono bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-200 font-bold">
                  {formData.referralCode}
                </code>
              </div>
            </div>
          )}

          {success ? (
            <div className="p-8 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Tenant Organization Provisioned!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Your 14-day free trial and industry capability pack are ready. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Business Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Business Category *</span>
                </label>
                <select
                  value={formData.industryId}
                  onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Legal Name & Trade Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Business Legal Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Apex Pharma Distributors"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. Apex Meds"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Admin Full Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.adminFullName}
                    onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mobile Phone (10 Digits) *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.primaryPhone}
                    onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Admin Work Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="owner@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Create Password *</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="Enter a secure password"
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Referral / Partner Code (Optional)</span>
                  <span className="text-slate-400 dark:text-slate-500 lowercase text-[11px] font-normal">e.g. UB-REF-XXXXX</span>
                </label>
                <input
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                  placeholder="UB-REF-XXXXX"
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Provisioning Organization...</span>
                  </>
                ) : (
                  <>
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Trust badges footer inside card */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>No Credit Card Required</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Instant Setup</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Full ERP Features</span>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-600 dark:text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
              Sign In to your account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-slate-400 mt-6 relative z-10">
        © {new Date().getFullYear()} UdyogBill • DigiOpera Private Limited. All rights reserved.
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
