"use client";

import React, { useState, useEffect } from "react";
import { superAdminService } from "@/services/super-admin-services";
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  Globe,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Check,
  UploadCloud,
  FileSignature,
  Zap,
  Key,
  Loader2
} from "lucide-react";

export default function PlatformCompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "preview">("settings");

  const [form, setForm] = useState({
    legalCompanyName: "DigiOpera Private Limited",
    productBrandName: "UdyogBill",
    tagline: "Smart Cloud Invoicing & Business ERP",
    gstin: "06AAMCD2668N1Z2",
    pan: "AAMCD2668N",
    state: "Haryana",
    stateCode: "06",
    addressLine1: "3rd Floor, Landmark Cyber Park",
    addressLine2: "Sector 67",
    city: "Gurugram",
    pincode: "122102",
    supportEmail: "support@udyogbill.com",
    supportPhone: "9473807622",
    website: "https://udyogbill.com",
    bankName: "State Bank of India",
    bankAccountNumber: "44777396364",
    bankIfsc: "SBIN0061808",
    bankBranch: "Gurugram Branch",
    upiId: "",
    upiQrImageUrl: "",
    logoUrl: "",
    signatoryImageUrl: "",
    authorizedSignatoryName: "Authorized Signatory",
    authorizedSignatoryDesignation: "Director",
    invoicePrefix: "UB/SUB/26-27/",
    nextInvoiceSequence: 1,
    invoiceTermsAndConditions: "1. This is a computer generated tax invoice for Information Technology Software Services (SAC 998313).\n2. Input tax credit is available subject to valid GSTIN.\n3. All subscription fees are paid via automated electronic funds transfer.",
    enableGstAutoFill: false,
    sandboxApiKey: "",
    sandboxApiSecret: "",
  });

  const [showSandboxSecret, setShowSandboxSecret] = useState(false);
  const [testingGst, setTestingGst] = useState(false);
  const [gstTestResult, setGstTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await superAdminService.getCompanyProfile();
      if (data) {
        setForm((prev) => ({
          ...prev,
          ...data,
          logoUrl: data.logoUrl || prev.logoUrl,
          legalCompanyName: data.legalCompanyName || prev.legalCompanyName,
          nextInvoiceSequence: data.nextInvoiceSequence || prev.nextInvoiceSequence || 1,
          enableGstAutoFill: data.enableGstAutoFill ?? false,
          sandboxApiKey: data.sandboxApiKey || "",
          sandboxApiSecret: data.sandboxApiSecret || "",
        }));
      }
    } catch (err: any) {
      console.error("Failed to load platform company profile", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSandboxGst() {
    try {
      setTestingGst(true);
      setGstTestResult(null);
      const res = await superAdminService.testSandboxGst({
        apiKey: form.sandboxApiKey,
        apiSecret: form.sandboxApiSecret,
        testGstin: form.gstin || "06AAMCD2668N1Z2"
      });
      if (res && (res.success || res.legalName)) {
        setGstTestResult({
          success: true,
          message: `Connected successfully! Verified: ${res.legalName || 'Active Entity'} (${res.tradeName || ''})`,
          details: res
        });
      } else {
        setGstTestResult({
          success: false,
          message: res?.errorMessage || "Test connection failed. Please verify your Sandbox API Key & Secret."
        });
      }
    } catch (err: any) {
      setGstTestResult({
        success: false,
        message: err.response?.data?.message || err.message || "Failed to connect to Sandbox.co.in"
      });
    } finally {
      setTestingGst(false);
    }
  }

  function handleGstinChange(val: string) {
    const clean = val.toUpperCase().trim();
    const updates: any = { gstin: clean };
    if (clean.length >= 2 && !isNaN(Number(clean.substring(0, 2)))) {
      updates.stateCode = clean.substring(0, 2);
    }
    if (clean.length >= 12) {
      updates.pan = clean.substring(2, 12);
    }
    setForm((prev) => ({ ...prev, ...updates }));
  }

  // Convert uploaded image to Base64 data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "logoUrl" | "signatoryImageUrl" | "upiQrImageUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit. Please upload an image under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, [fieldName]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await superAdminService.updateCompanyProfile(form);
      setSuccessMsg("Platform Company Profile updated successfully! All future invoices will use these details.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to save company profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Platform Company Profile &amp; Invoice Settings</h1>
              <p className="text-xs text-slate-400">
                Configure your official legal company details, GSTIN, Logo, Bank account, and Signatures shown on automated subscription invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Profile Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "preview"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Invoice Preview</span>
            </button>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-medium">{errorMsg}</span>
        </div>
      )}

      {activeTab === "settings" ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Official Logo & Signatory Stamp */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Platform Logo &amp; Signatory Stamp</h2>
                <p className="text-[11px] text-slate-400">These official visual assets are printed on every customer subscription tax invoice.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platform Logo */}
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Company / Product Logo</label>
                  <span className="text-[10px] text-slate-500 font-mono">PNG, JPG, SVG (Max 2MB)</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-36 h-16 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden p-2">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[11px] text-slate-500">No Logo</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload New Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "logoUrl")}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or enter image URL..."
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Signatory Signature Stamp */}
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Authorized Signature / Stamp</label>
                  <span className="text-[10px] text-slate-500 font-mono">Transparent PNG Recommended</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-36 h-16 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden p-2">
                    {form.signatoryImageUrl ? (
                      <img src={form.signatoryImageUrl} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>No Stamp</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Signature</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "signatoryImageUrl")}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or enter image URL..."
                      value={form.signatoryImageUrl}
                      onChange={(e) => setForm({ ...form, signatoryImageUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 placeholder-slate-600 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Legal Entity & Brand Name */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Business Entity &amp; Brand Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Legal Registered Entity Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.legalCompanyName}
                  onChange={(e) => setForm({ ...form, legalCompanyName: e.target.value })}
                  placeholder="e.g. Udyog Software Technologies Private Limited"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">This legal name appears on all official GST Tax Invoices.</p>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Product / Brand Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.productBrandName}
                  onChange={(e) => setForm({ ...form, productBrandName: e.target.value })}
                  placeholder="e.g. UdyogBill"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Displayed as the software product brand throughout the app.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold uppercase text-slate-400 mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Smart Cloud Invoicing & Business ERP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Indian GST & Tax Compliance */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">GSTIN &amp; Tax Compliance (Inter-State / Intra-State Logic)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Supplier GSTIN <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="09AAACU9876A1Z5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-emerald-400 font-bold tracking-wider focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">15-digit Indian GST Identification Number</p>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Permanent Account Number (PAN)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase().trim() })}
                  placeholder="AAACU9876A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white font-semibold focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Auto-extracted from digits 3-12 of GSTIN</p>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  State &amp; State Code <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={form.stateCode}
                    onChange={(e) => setForm({ ...form, stateCode: e.target.value.trim() })}
                    placeholder="09"
                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 font-mono text-emerald-400 font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Uttar Pradesh"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-400/90 mt-0.5">
                  Matches subscriber = CGST (9%) + SGST (9%) | Outside state = IGST (18%)
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Registered Address & Contacts */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <MapPin className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Registered Address &amp; Official Helpdesk</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Address Line 1 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  placeholder="e.g. Tower B, Cyber City, Sector 62"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  placeholder="e.g. Near Metro Station"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Noida"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Pincode <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="e.g. 201309"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Official Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://udyogbill.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Support Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  placeholder="support@udyogbill.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Support Phone (10 Digits)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Bank Account & Payment Details */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Bank Account &amp; UPI QR Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Bank Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Account Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  placeholder="50200012345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  IFSC Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.bankIfsc}
                  onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase().trim() })}
                  placeholder="HDFC0001234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={form.bankBranch}
                  onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                  placeholder="e.g. Noida Sector 62 Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Company UPI ID</label>
                <input
                  type="text"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="e.g. udyogbill@hdfcbank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Invoicing & Signatory Settings */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Invoice Sequence Numbering &amp; Authorized Signatory</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                  placeholder="UB/SUB/26-27/"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-mono">e.g. UB/SUB/26-27/ ya INV-</p>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1">Next Invoice Sequence #</label>
                <input
                  type="number"
                  min={1}
                  value={form.nextInvoiceSequence || 1}
                  onChange={(e) => setForm({ ...form, nextInvoiceSequence: Math.max(1, parseInt(e.target.value) || 1) })}
                  placeholder="101"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Jaha tak invoices ban chuki hain, uske aage ka number dalein</p>
              </div>

              <div className="md:col-span-2 bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Generated Invoice Preview:</span>
                <span className="text-base font-mono font-black text-emerald-400 mt-0.5 tracking-wide">
                  {(form.invoicePrefix || "UB/SUB/26-27/") + String(form.nextInvoiceSequence || 1).padStart(4, "0")}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Har naye subscription invoice par ye sequence auto-increment hoga.</span>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold uppercase text-slate-400 mb-1">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={form.authorizedSignatoryName}
                  onChange={(e) => setForm({ ...form, authorizedSignatoryName: e.target.value })}
                  placeholder="e.g. Saurabh Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold uppercase text-slate-400 mb-1">Signatory Designation</label>
                <input
                  type="text"
                  value={form.authorizedSignatoryDesignation}
                  onChange={(e) => setForm({ ...form, authorizedSignatoryDesignation: e.target.value })}
                  placeholder="e.g. Managing Director"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block font-semibold uppercase text-slate-400 mb-1">Invoice Terms &amp; Declarations</label>
                <textarea
                  rows={3}
                  value={form.invoiceTermsAndConditions}
                  onChange={(e) => setForm({ ...form, invoiceTermsAndConditions: e.target.value })}
                  placeholder="Terms printed at bottom of tax invoices..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 7: Instant GST Auto-Fill Settings (Sandbox.co.in) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>GST Auto-Fill Integration</span>
                    <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      Sandbox.co.in
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Allows new users to enter their GSTIN on the registration/free-trial page to automatically populate their business legal name, trade name, and address.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.enableGstAutoFill}
                  onChange={(e) => setForm({ ...form, enableGstAutoFill: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2.5 text-xs font-bold text-slate-300">
                  {form.enableGstAutoFill ? "Auto-Fill Active" : "Disabled"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sandbox API Key</span>
                </label>
                <input
                  type="text"
                  value={form.sandboxApiKey}
                  onChange={(e) => setForm({ ...form, sandboxApiKey: e.target.value.trim() })}
                  placeholder="key_live_c3dd7b53ca0f40909c3cf1e943df1cd3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sandbox API Secret</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSandboxSecret(!showSandboxSecret)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {showSandboxSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSandboxSecret ? "Hide" : "Show Secret"}</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showSandboxSecret ? "text" : "password"}
                    value={form.sandboxApiSecret}
                    onChange={(e) => setForm({ ...form, sandboxApiSecret: e.target.value.trim() })}
                    placeholder="Enter Sandbox API Secret"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400">
                Test credentials against <code className="text-indigo-300 font-mono">api.sandbox.co.in</code> before saving.
              </div>

              <button
                type="button"
                onClick={handleTestSandboxGst}
                disabled={testingGst || !form.sandboxApiKey || !form.sandboxApiSecret}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                {testingGst ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Sandbox Connection</span>
                  </>
                )}
              </button>
            </div>

            {gstTestResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                  gstTestResult.success
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                }`}
              >
                {gstTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{gstTestResult.message}</div>
                  {gstTestResult.details?.state && (
                    <div className="text-[11px] opacity-85 mt-1 font-mono">
                      State: {gstTestResult.details.state} ({gstTestResult.details.stateCode}) | Status: {gstTestResult.details.status}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-7 py-3 rounded-2xl text-sm shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save Platform Company Profile"}
            </button>
          </div>
        </form>
      ) : (
        /* LIVE TAX INVOICE PREVIEW TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              This preview shows how subscribers see the automated Tax Invoice when purchasing a plan or add-on.
            </span>
            <button
              onClick={() => setActiveTab("settings")}
              className="text-xs text-indigo-400 hover:underline cursor-pointer"
            >
              ← Back to Edit Fields
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800 space-y-6 max-w-4xl mx-auto border border-slate-200">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div className="space-y-1.5 max-w-md">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Company Logo" className="h-12 object-contain mb-2" />
                ) : (
                  <div className="font-black text-xl text-indigo-600 tracking-tight">{form.productBrandName}</div>
                )}
                <h2 className="text-base font-black text-slate-950 uppercase tracking-tight">
                  {form.legalCompanyName}
                </h2>
                <p className="text-indigo-600 font-bold text-xs">{form.tagline}</p>
                <p className="text-slate-600 text-[11px]">
                  {form.addressLine1}, {form.addressLine2 ? `${form.addressLine2}, ` : ""}{form.city}, {form.state} - {form.pincode}
                </p>
                <div className="flex gap-4 text-slate-700 font-semibold text-[11px] pt-1">
                  <span>GSTIN: <span className="font-mono font-bold">{form.gstin}</span></span>
                  <span>State Code: <span className="font-mono font-bold">{form.stateCode}</span></span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wider mb-1">
                  TAX INVOICE
                </div>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {form.invoicePrefix || "UB/SUB/26-27/"}1084
                </div>
                <div className="text-slate-500 text-[11px]">
                  Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Place of Supply: <span className="font-semibold text-slate-900">{form.stateCode} ({form.state})</span>
                </div>
              </div>
            </div>

            {/* Bill To & Sample Subscriber Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Billed To (Subscriber / Customer):</span>
                <div className="font-bold text-slate-950 text-sm mt-1">Apex Pharma Care</div>
                <div className="text-slate-600">Main Market, Sector 14, Gurugram, Haryana - 122001</div>
                <div className="text-slate-600">Email: suresh@apexpharma.com</div>
                <div className="text-slate-600">Phone: +91 98765 43210</div>
              </div>

              <div className="text-right space-y-1">
                <div>
                  <span className="text-slate-500">Customer GSTIN: </span>
                  <span className="font-mono font-bold text-slate-900">06AAACP1234F1Z1</span>
                </div>
                <div>
                  <span className="text-slate-500">Customer PAN: </span>
                  <span className="font-mono font-semibold text-slate-900">AAACP1234F</span>
                </div>
                <div>
                  <span className="text-slate-500">Supply Type: </span>
                  <span className="font-bold text-indigo-700">Intra-State (Haryana: CGST 9% + SGST 9%)</span>
                </div>
                <div>
                  <span className="text-slate-500">Payment Ref: </span>
                  <span className="font-mono text-slate-900">pay_Q83xKl9m21oP</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Item &amp; Service Description</th>
                  <th className="py-2.5 px-3">SAC Code</th>
                  <th className="py-2.5 px-3 text-right">Taxable Subtotal</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                <tr>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">Enterprise Cloud Plan (Annual) + Pharma Suite</div>
                    <div className="text-[11px] text-slate-500">Duration: 365 Days • Instant Automated Activation</div>
                  </td>
                  <td className="py-3 px-3 font-mono">998313</td>
                  <td className="py-3 px-3 text-right font-semibold">₹5,999.00</td>
                  <td className="py-3 px-3 text-right font-semibold">18%</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-950">₹7,078.82</td>
                </tr>
              </tbody>
            </table>

            {/* Bank Info & Total Calculation */}
            <div className="flex justify-between items-start pt-2 text-xs">
              <div className="text-[11px] text-slate-600 max-w-sm space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800 uppercase text-[10px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  Official Bank &amp; Settlement Account:
                </div>
                <div>Bank: <strong className="text-slate-800">{form.bankName}</strong> | Branch: {form.bankBranch}</div>
                <div>A/C No: <strong className="font-mono text-slate-900">{form.bankAccountNumber}</strong></div>
                <div>IFSC: <strong className="font-mono text-slate-900">{form.bankIfsc}</strong></div>
                {form.upiId && <div>UPI ID: <strong className="font-mono text-indigo-700">{form.upiId}</strong></div>}
              </div>

              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base:</span>
                  <span>₹5,999.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%):</span>
                  <span>₹539.91</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%):</span>
                  <span>₹539.91</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-slate-950 text-sm">
                  <span>Total Paid:</span>
                  <span className="text-emerald-700 font-mono text-base">₹7,078.82</span>
                </div>
              </div>
            </div>

            {/* Authorized Signatory & Stamp Box */}
            <div className="flex justify-between items-end border-t border-slate-200 pt-5 text-xs">
              <div className="max-w-md text-[10px] text-slate-500 whitespace-pre-line">
                <div className="font-bold text-slate-700 uppercase text-[10px] mb-1">Terms &amp; Conditions:</div>
                {form.invoiceTermsAndConditions}
              </div>

              <div className="text-center space-y-1 min-w-[180px]">
                {form.signatoryImageUrl ? (
                  <img src={form.signatoryImageUrl} alt="Signature Stamp" className="h-12 object-contain mx-auto" />
                ) : (
                  <div className="h-12 border-b border-slate-400 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                    [ Digitally Signed ]
                  </div>
                )}
                <div className="font-bold text-slate-900 text-xs">{form.authorizedSignatoryName}</div>
                <div className="text-[10px] text-slate-500">{form.authorizedSignatoryDesignation}</div>
                <div className="text-[9px] text-slate-400 font-semibold">{form.legalCompanyName}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
