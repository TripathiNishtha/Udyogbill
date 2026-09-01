"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings2,
  Building,
  CheckCircle,
  Save,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  MapPin,
  Mail,
  Globe,
  Send,
  Lock,
  Server,
  AlertCircle,
  Check,
  RefreshCw
} from "lucide-react";
import {
  tenantAppService,
  UpdateBusinessProfileInput,
} from "@/services/tenant-app-services";
import { TenantDetails } from "@/types";
import { useTheme, ThemeType } from "@/components/theme/theme-provider";

export default function TenantSettingsPage() {
  const [profile, setProfile] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const { theme, setTheme } = useTheme();

  // Test Email States
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [profileForm, setProfileForm] = useState<UpdateBusinessProfileInput>({
    businessName: "",
    tradeName: "",
    primaryPhone: "",
    gstin: "",
    pan: "",
    drugLicenseNumber: "",
    fssaiNumber: "",
    timeZone: "Asia/Kolkata",
    currencyCode: "INR",
    logoUrl: "",
    upiId: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBranch: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    stateCode: "",
    pincode: "",
    email: "",
    website: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
    smtpEnableSsl: true,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const profData = await tenantAppService.getBusinessProfile();
      setProfile(profData);

      setProfileForm({
        businessName: profData.businessName || "",
        tradeName: profData.tradeName || "",
        primaryPhone: profData.primaryPhone || "",
        gstin: profData.gstin || "",
        pan: profData.pan || "",
        drugLicenseNumber: profData.drugLicenseNumber || "",
        fssaiNumber: profData.fssaiNumber || "",
        timeZone: profData.timeZone || "Asia/Kolkata",
        currencyCode: profData.currencyCode || "INR",
        logoUrl: profData.logoUrl || "",
        upiId: profData.upiId || "",
        bankName: profData.bankName || "",
        bankAccountNumber: profData.bankAccountNumber || "",
        bankIfsc: profData.bankIfsc || "",
        bankBranch: profData.bankBranch || "",
        addressLine1: profData.addressLine1 || "",
        addressLine2: profData.addressLine2 || "",
        city: profData.city || "",
        state: profData.state || "",
        stateCode: profData.stateCode || "",
        pincode: profData.pincode || "",
        email: profData.email || "",
        website: profData.website || "",
        smtpHost: profData.smtpHost || "",
        smtpPort: profData.smtpPort || 587,
        smtpUsername: profData.smtpUsername || "",
        smtpPassword: profData.smtpPassword || "",
        smtpFromEmail: profData.smtpFromEmail || profData.email || "",
        smtpFromName: profData.smtpFromName || profData.businessName || "",
        smtpEnableSsl: profData.smtpEnableSsl ?? true,
      });

      if (profData.adminEmail || profData.email) {
        setTestEmailAddress(profData.adminEmail || profData.email || "");
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setProfileForm((prev) => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setProfileForm((prev) => ({ ...prev, logoUrl: "" }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      alert("Please enter a valid recipient email address for testing.");
      return;
    }
    if (!profileForm.smtpHost || !profileForm.smtpFromEmail) {
      alert("Please enter SMTP Host and Sender From Email before testing.");
      return;
    }

    try {
      setSendingTestEmail(true);
      setTestEmailResult(null);

      // Save profile first so backend has latest credentials
      await tenantAppService.updateBusinessProfile(profileForm);

      await tenantAppService.sendTestEmail({
        recipientEmail: testEmailAddress.trim(),
        subject: `[UdyogBill] Test SMTP Verification - ${profileForm.businessName || "Store"}`,
      });

      setTestEmailResult({
        success: true,
        message: `Success! Test verification email was successfully dispatched to ${testEmailAddress}.`,
      });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err?.response?.data?.errorMessage || err?.message || "Failed to send test email. Please check your SMTP host, port, username, or password.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await tenantAppService.updateBusinessProfile(profileForm);
      setSuccessMsg("Business profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
      loadSettings();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Settings2 className="w-6 h-6 text-purple-400" />
            <span>Business Profile & Workspace Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure statutory identifiers, GSTIN, PAN, UPI digital payments, and workspace theme.
          </p>
        </div>
        <Link
          href="/app/settings/addons"
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Industry Add-on Store</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Appearance & Color Theme Studio */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-850">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <Palette className="w-5 h-5 text-pink-400" />
              <span>Appearance & Workspace Theme</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize your workspace UI theme for day/night billing and fast readability.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
            {theme} Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: "dark" as ThemeType, title: "Midnight Dark", subtitle: "High-contrast dark mode", icon: Moon, bg: "bg-slate-950 border-slate-800 text-slate-100" },
            { id: "light" as ThemeType, title: "Daylight Bright", subtitle: "Clean white day billing", icon: Sun, bg: "bg-slate-100 border-slate-300 text-slate-900" },
            { id: "navy" as ThemeType, title: "Royal Navy Blue", subtitle: "Deep corporate theme", icon: Sparkles, bg: "bg-blue-950 border-blue-800 text-blue-100" },
            { id: "emerald" as ThemeType, title: "Emerald Green", subtitle: "Pharma & FMCG retail", icon: Palette, bg: "bg-emerald-950 border-emerald-800 text-emerald-100" },
          ].map((item) => {
            const isSelected = theme === item.id;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Statutory Profile */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6 shadow-sm">
        <div className="pb-4 border-b border-slate-850">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <Building className="w-5 h-5 text-emerald-400" />
            <span>Business Statutory & Tax Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Legal identity, GSTIN, PAN, Drug License, and FSSAI credentials printed on tax invoices.
          </p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Company Brand Logo Section */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span>Company / Organization Brand Logo</span>
            </label>
            <p className="text-[11px] text-slate-400">
              This logo will appear across your workspace sidebar, dashboard header, and all printed GST tax invoices & estimates.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
              {/* Logo Preview */}
              <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {profileForm.logoUrl ? (
                  <img
                    src={profileForm.logoUrl}
                    alt="Company Logo Preview"
                    className="w-full h-full object-contain p-1 rounded-xl"
                  />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                    <span className="text-[9px] text-slate-500 font-medium">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload & Controls */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {profileForm.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-500">
                  Recommended: Square PNG, JPG, or SVG (Max 2MB, transparent or white background).
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Legal Business Name *</label>
              <input
                type="text"
                required
                value={profileForm.businessName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, businessName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Trade / Brand Name *</label>
              <input
                type="text"
                required
                value={profileForm.tradeName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, tradeName: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Primary Phone</label>
              <input
                type="text"
                value={profileForm.primaryPhone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, primaryPhone: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">GSTIN</label>
              <input
                type="text"
                value={profileForm.gstin || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">PAN Number</label>
              <input
                type="text"
                value={profileForm.pan || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, pan: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Drug License Number (Pharma / Healthcare)
              </label>
              <input
                type="text"
                placeholder="e.g. DL-20B/21B-12345"
                value={profileForm.drugLicenseNumber || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, drugLicenseNumber: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                FSSAI License (Food & Beverage / FMCG)
              </label>
              <input
                type="text"
                placeholder="e.g. 10012022000123"
                value={profileForm.fssaiNumber || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, fssaiNumber: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Company Registered Office & Complete Address */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Company Registered Office & Complete Address</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official physical address, city, state, pincode, and website printed on tax invoices, delivery challans, and statutory filings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Address Line 1 (Shop / Office / Building / Street)</label>
                <input
                  type="text"
                  placeholder="e.g. Shop No. 12, Ground Floor, Royal Complex"
                  value={profileForm.addressLine1 || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Address Line 2 (Area / Landmark / Road)</label>
                <input
                  type="text"
                  placeholder="e.g. Near City Civil Hospital, M.G. Road"
                  value={profileForm.addressLine2 || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">City / District</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={profileForm.city || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">State</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={profileForm.state || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">State Code (GST)</label>
                <input
                  type="text"
                  placeholder="e.g. 27"
                  value={profileForm.stateCode || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, stateCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">PIN / Postal Code</label>
                <input
                  type="text"
                  placeholder="e.g. 400001"
                  value={profileForm.pincode || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Business Email</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. contact@apexpharma.com"
                  value={profileForm.email || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Official Website / Web Portal</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://www.apexpharma.com"
                  value={profileForm.website || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Outgoing Email & SMTP Server Configuration */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span>Outgoing Email &amp; SMTP Configuration (Send to Mail Server)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure your store's custom SMTP mail server. All tax invoices, CA audit packs, payment receipts, and reports sent via "Send to Mail" will be dispatched directly from this authenticated mailbox.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 self-start sm:self-auto">
                Custom Mailbox
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Sender / From Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Pharma Care Billing"
                  value={profileForm.smtpFromName || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, smtpFromName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Sender From Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. billing@apexpharma.com or noreply@yourdomain.com"
                  value={profileForm.smtpFromEmail || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, smtpFromEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SMTP Host / Server *</label>
                <input
                  type="text"
                  placeholder="e.g. smtp.gmail.com or smtp.hostinger.com"
                  value={profileForm.smtpHost || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, smtpHost: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587 (TLS) or 465 (SSL)"
                  value={profileForm.smtpPort || 587}
                  onChange={(e) => setProfileForm({ ...profileForm, smtpPort: parseInt(e.target.value) || 587 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SSL / TLS Security</label>
                <div className="flex items-center h-[38px] px-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={profileForm.smtpEnableSsl ?? true}
                      onChange={(e) => setProfileForm({ ...profileForm, smtpEnableSsl: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Enable SSL / TLS Encryption</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">SMTP Username / Account</label>
                <input
                  type="text"
                  placeholder="e.g. billing@apexpharma.com"
                  value={profileForm.smtpUsername || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, smtpUsername: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>SMTP Password / App Password</span>
                  <span className="text-[10px] text-indigo-400">Masked &amp; Encrypted</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={profile?.smtpHost ? "•••••••••••• (Leave blank to keep current)" : "e.g. Gmail App Password or SMTP secret"}
                    value={profileForm.smtpPassword || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, smtpPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Test Email Connectivity Bar */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Outgoing Mail Connection</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Send a quick test message to verify your SMTP host, port, and authentication credentials.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <input
                  type="email"
                  placeholder="Enter recipient email (e.g. your email to receive test)"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20 shrink-0"
                >
                  {sendingTestEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Test Mail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Verification Email</span>
                    </>
                  )}
                </button>
              </div>

              {testEmailResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                    testEmailResult.success
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Digital Payments (UPI QR) & Bank Account Details */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Payment QR & Bank Account Configuration</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure your UPI ID and Bank Account. When a UPI ID is provided, invoices will automatically include a dynamic "Scan to Pay" QR Code for instant customer payments. If UPI ID is left blank, no payment QR code will be shown on invoices.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-400">
                UPI ID / VPA (Virtual Payment Address)
              </label>
              <input
                type="text"
                placeholder="e.g. apexpharma@okhdfcbank or 9876543210@paytm (Leave blank to hide Payment QR on invoices)"
                value={profileForm.upiId || ""}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, upiId: e.target.value.trim() })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500">
                Tip: Leave this field empty if you do not want to print the Scan to Pay QR code on tax invoices.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. CENTRAL BANK OF INDIA"
                  value={profileForm.bankName || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bankName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 5910261112"
                  value={profileForm.bankAccountNumber || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bankAccountNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. CBIN0283533"
                  value={profileForm.bankIfsc || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bankIfsc: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. ANAND VIHAR"
                  value={profileForm.bankBranch || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bankBranch: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? "Saving..." : "Save Business Profile"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
