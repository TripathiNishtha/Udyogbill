"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService, industryService, publicOnboardingService } from "@/services/api-services";
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
  Briefcase,
  Zap
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

  // Instant GST Auto-Fill state
  const [gstinInput, setGstinInput] = useState("");
  const [fetchingGst, setFetchingGst] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState<{ legalName: string; tradeName?: string; state?: string; status?: string } | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);

  async function handleFetchGst(gstToFetch?: string) {
    const raw = (gstToFetch || gstinInput).trim().toUpperCase();
    if (!raw || raw.length !== 15) {
      setGstError("Please enter a valid 15-digit GSTIN (e.g. 06AAMCD2668N1Z2).");
      return;
    }

    try {
      setFetchingGst(true);
      setGstError(null);
      setGstAutoFilled(null);

      const res = await publicOnboardingService.lookupGstin(raw);
      if (res && (res.success || res.legalName)) {
        setFormData((prev) => ({
          ...prev,
          businessName: res.legalName || prev.businessName,
          tradeName: res.tradeName || res.legalName || prev.tradeName,
          gstin: raw
        }));
        setGstAutoFilled({
          legalName: res.legalName,
          tradeName: res.tradeName,
          state: res.state,
          status: res.status
        });
      } else {
        setGstError(res?.errorMessage || "Could not retrieve GST details. You can enter details manually below.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Could not fetch GST details. You can continue manually.";
      setGstError(msg);
    } finally {
      setFetchingGst(false);
    }
  }

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
    setError(null);

    // 1. Client-side field validations
    if (!formData.businessName.trim()) {
      setError("Please enter your Business Legal Name.");
      return;
    }
    if (!formData.adminFullName.trim()) {
      setError("Please enter Admin Full Name.");
      return;
    }
    const cleanPhone = formData.primaryPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail.trim())) {
      setError("Please enter a valid work email address (e.g. name@company.com).");
      return;
    }
    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!formData.industryId) {
      setError("Please select a Business Category / Industry.");
      return;
    }

    setLoading(true);

    try {
      await authService.registerTenant({
        ...formData,
        primaryPhone: cleanPhone,
        businessName: formData.businessName.trim(),
        tradeName: formData.tradeName.trim() || formData.businessName.trim(),
        adminFullName: formData.adminFullName.trim(),
        adminEmail: formData.adminEmail.trim().toLowerCase(),
      });
      setSuccess(true);
      try {
        const loginResponse = await authService.login({
          email: formData.adminEmail.trim().toLowerCase(),
          password: formData.adminPassword,
        });
        if (loginResponse?.user?.isSuperAdmin) {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/app/dashboard";
        }
        return;
      } catch (loginErr) {
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (err: any) {
      // Extract exact backend message from ApiErrorResponse or validation errors
      const respData = err.response?.data;
      let detailedMsg = "";

      if (respData) {
        if (respData.userMessage) {
          detailedMsg = respData.userMessage;
        } else if (respData.message) {
          detailedMsg = respData.message;
        } else if (respData.error) {
          detailedMsg = respData.error;
        } else if (respData.errors && typeof respData.errors === "object") {
          // Flatten ModelState / validation error dictionary
          const errList: string[] = [];
          for (const key in respData.errors) {
            const val = respData.errors[key];
            if (Array.isArray(val)) {
              errList.push(...val);
            } else if (typeof val === "string") {
              errList.push(val);
            }
          }
          if (errList.length > 0) {
            detailedMsg = errList.join(" • ");
          }
        }
      }

      if (!detailedMsg) {
        detailedMsg = err.message || "Registration failed. Please check inputs and try again.";
      }

      setError(detailedMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-screen overflow-y-auto lg:overflow-hidden bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-[#070b14] flex flex-col justify-between font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Cyber Dot Blueprint / Tech Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.22]"
        style={{
          backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px), radial-gradient(rgba(99, 102, 241, 0.2) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, #000 60%, transparent 100%)'
        }}
      />

      {/* Ambient Glowing Orbs */}
      <div className="absolute -top-28 -left-28 w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-[450px] h-[450px] bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-[550px] h-[550px] bg-emerald-500/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-white rounded-xl px-2.5 py-1 border border-white/20 shadow-md transition-transform group-hover:scale-105">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill Logo"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline-block text-slate-300 font-medium">Already have an account?</span>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 shadow-sm backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center min-h-0 relative z-10 py-3 sm:py-4">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10 items-center max-h-full">
          
          {/* LEFT COLUMN: Feature Highlights (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-4 text-white pr-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold w-fit backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>14-Day Free Trial • No Credit Card Required</span>
            </div>

            <div>
              <h1 className="text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight">
                India&apos;s Fastest Multi-Industry{" "}
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                  GST Billing &amp; ERP
                </span>
              </h1>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed font-medium">
                Set up your business in 30 seconds. Get automated GST compliance, smart batch inventory, thermal/A4 printing, and unified party ledgers.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-all shadow-md flex items-center gap-3 group">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant GST Auto-Fill</h4>
                  <p className="text-[11px] text-slate-300">Auto-populates legal company name &amp; trade brand directly via GSTIN.</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-all shadow-md flex items-center gap-3 group">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Multi-Industry Architecture</h4>
                  <p className="text-[11px] text-slate-300">Pharma FEFO, FMCG Schemes, Electronics Serials &amp; Garments Matrix.</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 backdrop-blur-md transition-all shadow-md flex items-center gap-3 group">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">100% Tax Compliant</h4>
                  <p className="text-[11px] text-slate-300">Accurate CGST/SGST/IGST tax calculation, E-way bill &amp; QR receipts.</p>
                </div>
              </div>
            </div>

            {/* Trust Proof & Ratings Bar */}
            <div className="flex flex-wrap items-center gap-4 text-slate-300 text-[11px] pt-1 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-white">Trusted by 10,000+ businesses</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <span>★ ★ ★ ★ ★</span>
                <span className="text-slate-300 font-medium">4.9/5 Rating</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Compact Light Registration Form Card */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <div className="w-full max-w-xl bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/80 border border-slate-200/90 relative ring-1 ring-white/20">
              
              {/* Form Title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Register Business Tenant</span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                      14-Day Free Trial
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Start instantly • Multi-industry cloud ERP &amp; billing
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero Credit Card</span>
                </div>
              </div>

              {formData.referralCode && (
                <div className="mb-2.5 py-1 px-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-[11px] font-medium">
                  <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Partner Code:</span>{" "}
                    <code className="font-mono bg-emerald-100 px-1 py-0.2 rounded font-bold text-emerald-900">
                      {formData.referralCode}
                    </code>
                  </div>
                </div>
              )}

              {success ? (
                <div className="py-8 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
                  <h3 className="text-base font-bold text-slate-900">Account Provisioned Successfully!</h3>
                  <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    Opening your ERP dashboard...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2.5">
                  {error && (
                    <div className="py-1.5 px-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in fade-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                      <span className="truncate">{error}</span>
                    </div>
                  )}

                  {/* Instant GST Auto-Fill Card (Compact) */}
                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Instant Auto-Fill with GSTIN</span>
                        <span className="text-[9px] font-medium text-slate-500 bg-white border border-slate-200 px-1 rounded">Optional</span>
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">Auto-populates name &amp; brand</span>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={15}
                        value={gstinInput}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().trim();
                          setGstinInput(val);
                          if (val.length === 15) {
                            handleFetchGst(val);
                          }
                        }}
                        placeholder="Enter 15-digit GSTIN (e.g. 06AAMCD2668N1Z2)"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold tracking-wider text-slate-900 placeholder-slate-400 uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchGst()}
                        disabled={fetchingGst || gstinInput.trim().length !== 15}
                        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer shrink-0"
                      >
                        {fetchingGst ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Auto-Fill</span>
                          </>
                        )}
                      </button>
                    </div>

                    {gstAutoFilled && (
                      <div className="py-1 px-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-[11px] text-emerald-800 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          <strong>Verified:</strong> {gstAutoFilled.legalName}
                        </span>
                      </div>
                    )}

                    {gstError && (
                      <div className="py-1 px-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 text-[11px] text-amber-800 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{gstError}</span>
                      </div>
                    )}
                  </div>

                  {/* Business Category Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-indigo-600" />
                      <span>Business Category *</span>
                    </label>
                    <select
                      value={formData.industryId}
                      onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 1: Legal Name & Trade Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Business Legal Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="e.g. Apex Pharma Care Pvt Ltd"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Trade / Brand Name
                      </label>
                      <input
                        type="text"
                        value={formData.tradeName}
                        onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                        placeholder="e.g. Apex Meds"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Row 2: Admin Full Name & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Admin Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.adminFullName}
                        onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Mobile Phone (10 Digits) *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={formData.primaryPhone}
                        onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="9876543210"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-mono font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Admin Email & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>Admin Work Email *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        placeholder="owner@company.com"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Create Password *</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 pr-8 py-1.5 text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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

              {/* Bottom quick links */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Setup • Full ERP</span>
                </div>
                <div>
                  Already registered?{" "}
                  <Link href="/login" className="text-indigo-600 hover:underline font-bold">
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 text-center text-[11px] text-slate-400 shrink-0 relative z-10 border-t border-white/10 bg-slate-950/40 backdrop-blur-sm">
        © {new Date().getFullYear()} UdyogBill • DigiOpera Private Limited. All rights reserved.
      </footer>
    </div>
  );
}

export default function RegisterClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
