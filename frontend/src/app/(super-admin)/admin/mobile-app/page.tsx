"use client";

import React, { useState, useEffect } from "react";
import { superAdminService } from "@/services/super-admin-services";
import {
  Smartphone,
  Bell,
  Image as ImageIcon,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Eye,
  ExternalLink,
  Activity,
  Users,
  Clock,
  Palette,
  QrCode,
  Zap,
  HelpCircle,
  Check,
} from "lucide-react";

export default function MobileAppManagementPage() {
  const [activeTab, setActiveTab] = useState<
    "branding" | "banners" | "push" | "version" | "features" | "support" | "telemetry"
  >("branding");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPush, setSendingPush] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration Form State
  const [form, setForm] = useState({
    // 1. Branding & Identity
    appDisplayName: "UdyogBill",
    appTagline: "Smart GST Billing & Inventory",
    headerLogoUrl: "",
    splashLogoUrl: "",
    primaryBrandColor: "#4F46E5",
    accentColor: "#10B981",
    selectedLauncherIconPreset: "classic_blue",

    // 2. In-App Promotional Popup Banner
    isPopupBannerEnabled: false,
    popupBannerTitle: "Special Diwali B2B Discount!",
    popupBannerImageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=60",
    popupBannerDescription: "Upgrade to Annual Pro today and get 3 extra months free + unlimited E-Way Bill generation.",
    popupBannerCtaText: "Claim 40% Off Now",
    popupBannerCtaUrl: "https://udyogbill.com/pricing",
    popupBannerTargetAudience: "all",
    popupBannerFrequency: "once_per_day",
    popupBannerExpiresAt: "",

    // 3. Version Control & Force Update
    latestAndroidVersionCode: 1,
    latestAndroidVersionName: "1.0.0",
    minSupportedVersionCode: 1,
    isForceUpdateEnabled: false,
    updateChangelog: "• Added Near-Expiry Stock Radar\n• Added Continuous POS Barcode Scanner\n• Added NIC E-Way Bill & E-Invoice Export\n• Dynamic UPI QR with Payment verification",
    apkDownloadUrl: "https://udyogbill.com/downloads/udyogbill-billing.apk",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.udyogbill.mobile",

    // 4. Feature Flags
    isAiBillScannerEnabled: true,
    isNearExpiryRadarEnabled: true,
    isContinuousBarcodePosEnabled: true,
    isEWayBillExportEnabled: true,
    isReferralProgramEnabled: true,

    // 5. Maintenance Mode
    isMaintenanceModeEnabled: false,
    maintenanceNoticeMessage: "We are upgrading cloud billing servers for faster synchronization. Mobile billing will resume in 15 minutes.",

    // 6. Direct Helpdesk
    supportWhatsAppNumber: "919876543210",
    supportHelplineNumber: "1800-123-4567",
    supportEmail: "support@udyogbill.com",
    tutorialYouTubePlaylistUrl: "https://youtube.com/playlist?list=udyogbill-tutorials",
    knowledgebaseDocUrl: "https://docs.udyogbill.com/mobile-guide",
  });

  // Push Broadcast Compose State
  const [pushForm, setPushForm] = useState({
    title: "",
    message: "",
    imageUrl: "",
    actionRoute: "/bills",
    targetSegment: "all",
  });

  // Push History & Device Telemetry
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<{
    totalRegisteredDevices: number;
    activeTodayDevices: number;
    osDistribution: { osVersion: string; count: number }[];
    versionDistribution: { appVersion: string; count: number }[];
    recentDevices: any[];
  }>({
    totalRegisteredDevices: 0,
    activeTodayDevices: 0,
    osDistribution: [],
    versionDistribution: [],
    recentDevices: [],
  });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [configData, historyData, telemetryData] = await Promise.all([
        superAdminService.getMobileAppConfig().catch(() => null),
        superAdminService.getMobilePushHistory().catch(() => []),
        superAdminService.getMobileDevices().catch(() => null),
      ]);

      if (configData) {
        setForm((prev) => ({
          ...prev,
          ...configData,
          popupBannerExpiresAt: configData.popupBannerExpiresAt
            ? new Date(configData.popupBannerExpiresAt).toISOString().slice(0, 16)
            : "",
        }));
      }

      if (Array.isArray(historyData)) {
        setPushHistory(historyData);
      }

      if (telemetryData) {
        setTelemetry(telemetryData);
      }
    } catch (err: any) {
      setErrorMsg("Failed to load Mobile App settings. Verify your internet or superadmin credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        ...form,
        popupBannerExpiresAt: form.popupBannerExpiresAt ? new Date(form.popupBannerExpiresAt).toISOString() : null,
      };

      await superAdminService.saveMobileAppConfig(payload);
      setSuccessMsg("Mobile App settings saved and published to all client devices successfully!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to save Mobile App configurations.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPushBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!pushForm.title.trim() || !pushForm.message.trim()) {
      setErrorMsg("Push Notification Title and Message are required.");
      return;
    }

    try {
      setSendingPush(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await superAdminService.sendMobilePush(pushForm);
      setSuccessMsg(res.message || "Notification broadcast dispatched successfully!");
      setPushForm({
        title: "",
        message: "",
        imageUrl: "",
        actionRoute: "/bills",
        targetSegment: "all",
      });

      // Reload push history
      const updatedHistory = await superAdminService.getMobilePushHistory().catch(() => []);
      if (Array.isArray(updatedHistory)) setPushHistory(updatedHistory);

      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to dispatch push broadcast.");
    } finally {
      setSendingPush(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 font-medium text-sm">Syncing Mobile App Cloud Control...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              MOBILE FLEET GOVERNANCE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Cloud Sync
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
            <Smartphone className="w-6 h-6 text-indigo-600" />
            <span>Mobile App Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Remote control for installed Android/iOS apps: Branding, Promo Popups, Push Broadcasts, Kill-Switch Updates & Fleet Telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAllData}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => handleSaveConfig()}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Publishing..." : "Save & Publish Changes"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 font-medium">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Status Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registered Devices</p>
            <p className="text-2xl font-black text-slate-900">{telemetry.totalRegisteredDevices}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Today</p>
            <p className="text-2xl font-black text-emerald-600">{telemetry.activeTodayDevices}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Promo Banner</p>
            <p className={`text-sm font-extrabold ${form.isPopupBannerEnabled ? "text-emerald-600" : "text-slate-500"}`}>
              {form.isPopupBannerEnabled ? "Active & Live" : "Disabled"}
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kill-Switch</p>
            <p className={`text-sm font-extrabold ${form.isForceUpdateEnabled ? "text-rose-600" : "text-slate-500"}`}>
              {form.isForceUpdateEnabled ? `Min v${form.minSupportedVersionCode}` : "Inactive"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Pill Tabs (No ugly scrollbar!) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1.5">
        {[
          { id: "branding", label: "Dynamic Branding", icon: Palette },
          { id: "banners", label: "Promotional Popups", icon: ImageIcon },
          { id: "push", label: "Push Broadcasts", icon: Bell },
          { id: "version", label: "Version & Force Update", icon: Zap },
          { id: "features", label: "Feature Flags", icon: Layers },
          { id: "support", label: "Helpdesk & Channels", icon: PhoneCall },
          { id: "telemetry", label: "Fleet Telemetry", icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DYNAMIC BRANDING */}
      {activeTab === "branding" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" />
                  App Name & Visual Identity
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  These settings remotely customize the mobile top navigation bar, drawer header, and splash screen without re-releasing to Play Store.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">App Display Name</label>
                  <input
                    type="text"
                    value={form.appDisplayName}
                    onChange={(e) => setForm({ ...form, appDisplayName: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. UdyogBill"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">App Tagline</label>
                  <input
                    type="text"
                    value={form.appTagline}
                    onChange={(e) => setForm({ ...form, appTagline: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. Smart GST Billing & Inventory"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">In-App Header Logo URL</label>
                  <input
                    type="text"
                    value={form.headerLogoUrl}
                    onChange={(e) => setForm({ ...form, headerLogoUrl: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="https://.../logo-white.png"
                  />
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Leave empty to use built-in vector logo.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Splash Screen Logo URL</label>
                  <input
                    type="text"
                    value={form.splashLogoUrl}
                    onChange={(e) => setForm({ ...form, splashLogoUrl: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="https://.../splash-logo.png"
                  />
                  <p className="text-[11px] text-slate-400 font-medium mt-1">High-res PNG displayed on cold app boot.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryBrandColor}
                      onChange={(e) => setForm({ ...form, primaryBrandColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-slate-300 p-0.5"
                    />
                    <input
                      type="text"
                      value={form.primaryBrandColor}
                      onChange={(e) => setForm({ ...form, primaryBrandColor: e.target.value })}
                      className="flex-1 bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Accent Action Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-slate-300 p-0.5"
                    />
                    <input
                      type="text"
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="flex-1 bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Launcher Icon Preset Selector */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Launcher Icon Preset</label>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Select predefined app launcher icon styling for Android packages:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "classic_blue", name: "Classic Indigo", color: "bg-indigo-600" },
                    { id: "emerald_business", name: "Emerald Growth", color: "bg-emerald-600" },
                    { id: "royal_gold", name: "Royal Gold Pro", color: "bg-amber-600" },
                  ].map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setForm({ ...form, selectedLauncherIconPreset: preset.id })}
                      className={`cursor-pointer p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        form.selectedLauncherIconPreset === preset.id
                          ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-200 shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl ${preset.color} flex items-center justify-center text-white font-black text-sm shadow-sm`}>
                        U
                      </div>
                      <span className="text-xs font-bold">{preset.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Phone Header Mockup */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Header Preview</h4>
            <div className="w-full max-w-[280px] mx-auto rounded-[36px] border-[5px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden p-1">
              {/* Phone Notch */}
              <div className="h-4 bg-slate-900 rounded-t-[28px] flex justify-center items-center">
                <div className="w-14 h-2.5 bg-black rounded-full"></div>
              </div>

              {/* Mock App Bar */}
              <div
                className="p-3 text-white shadow-sm flex items-center justify-between"
                style={{ backgroundColor: form.primaryBrandColor }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center font-black text-[10px]">
                    {form.headerLogoUrl ? (
                      <img src={form.headerLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      "UB"
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black leading-none">{form.appDisplayName}</p>
                    <p className="text-[9px] text-white/80 leading-tight">{form.appTagline}</p>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Wireframe Placeholder Content in light background */}
              <div className="p-3 space-y-2 bg-slate-100 min-h-[220px]">
                <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/80 flex flex-col justify-between space-y-2">
                  <div className="h-2.5 w-24 bg-slate-200 rounded-full"></div>
                  <div className="h-5 w-32 bg-slate-200/80 rounded-md"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 rounded-lg bg-white border border-slate-200"></div>
                  <div className="h-10 rounded-lg bg-white border border-slate-200"></div>
                </div>
                <div className="h-14 rounded-lg bg-white border border-slate-200"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IN-APP POPUP BANNERS */}
      {activeTab === "banners" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    In-App Promotional Popup Banner
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Display an engaging high-conversion modal dialog to users upon launching the mobile app.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPopupBannerEnabled}
                    onChange={(e) => setForm({ ...form, isPopupBannerEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Popup Banner Title</label>
                  <input
                    type="text"
                    value={form.popupBannerTitle}
                    onChange={(e) => setForm({ ...form, popupBannerTitle: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. Holi Mega Sale - 50% Off Annual Plan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Banner Image URL</label>
                  <input
                    type="text"
                    value={form.popupBannerImageUrl}
                    onChange={(e) => setForm({ ...form, popupBannerImageUrl: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="https://images.unsplash.com/... or https://udyogbill.com/promo.png"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Description / Body Text</label>
                  <textarea
                    rows={3}
                    value={form.popupBannerDescription}
                    onChange={(e) => setForm({ ...form, popupBannerDescription: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Explain the offer, benefits, or announcement..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">CTA Button Text</label>
                    <input
                      type="text"
                      value={form.popupBannerCtaText}
                      onChange={(e) => setForm({ ...form, popupBannerCtaText: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder="e.g. Upgrade Now"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">CTA Target URL / Deep Link</label>
                    <input
                      type="text"
                      value={form.popupBannerCtaUrl}
                      onChange={(e) => setForm({ ...form, popupBannerCtaUrl: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder="https://udyogbill.com/pricing or /settings"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Audience</label>
                    <select
                      value={form.popupBannerTargetAudience}
                      onChange={(e) => setForm({ ...form, popupBannerTargetAudience: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    >
                      <option value="all">All Installed Users</option>
                      <option value="free">Free / Trial Users Only</option>
                      <option value="expired">Expired Subscription Users</option>
                      <option value="paid">Active Paid Subscribers</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Frequency</label>
                    <select
                      value={form.popupBannerFrequency}
                      onChange={(e) => setForm({ ...form, popupBannerFrequency: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    >
                      <option value="once_per_day">Once Per Day</option>
                      <option value="every_open">Every Cold Launch</option>
                      <option value="once_ever">Once Per User</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Offer Expiry Date</label>
                    <input
                      type="datetime-local"
                      value={form.popupBannerExpiresAt}
                      onChange={(e) => setForm({ ...form, popupBannerExpiresAt: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Phone Popup Frame Preview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Live In-App Dialog Preview</h4>
            <div className="w-full max-w-[300px] mx-auto rounded-[36px] border-[5px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden p-1 relative min-h-[440px] flex flex-col justify-center items-center">
              {/* Phone Notch */}
              <div className="absolute top-1 left-0 right-0 h-4 flex justify-center items-center">
                <div className="w-14 h-2.5 bg-black rounded-full"></div>
              </div>

              {/* Dimmed Background Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-0"></div>

              {/* The Modal Card */}
              <div className="relative z-10 w-[90%] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                {form.popupBannerImageUrl ? (
                  <div className="h-32 w-full overflow-hidden bg-slate-100">
                    <img
                      src={form.popupBannerImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}

                <div className="p-3.5 text-center space-y-1.5">
                  <h5 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {form.popupBannerTitle || "Offer Announcement"}
                  </h5>
                  <p className="text-[11px] text-slate-600 font-medium line-clamp-3 leading-relaxed">
                    {form.popupBannerDescription || "Upgrade to get unlimited features and priority support."}
                  </p>

                  <button
                    type="button"
                    style={{ backgroundColor: form.primaryBrandColor }}
                    className="w-full mt-2 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md transition-transform active:scale-95"
                  >
                    {form.popupBannerCtaText || "Explore"}
                  </button>
                  <p className="text-[10px] text-slate-400 font-medium pt-1 cursor-pointer">Remind Me Later</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PUSH NOTIFICATIONS BROADCAST */}
      {activeTab === "push" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSendPushBroadcast} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600" />
                    Compose Broadcast Push Notification
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Send instant high-priority notification to installed Android & iOS devices.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Target: {telemetry.totalRegisteredDevices} Devices
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Notification Title *</label>
                  <input
                    type="text"
                    required
                    value={pushForm.title}
                    onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="e.g. 📢 Important: Filing GST R1 Due Date Alert"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Notification Message / Body *</label>
                  <textarea
                    rows={3}
                    required
                    value={pushForm.message}
                    onChange={(e) => setPushForm({ ...pushForm, message: e.target.value })}
                    className="w-full bg-slate-50/60 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Generate GSTR-1 JSON directly from your mobile app in 1 click and reconcile with portal."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Optional Image / Icon URL</label>
                    <input
                      type="text"
                      value={pushForm.imageUrl}
                      onChange={(e) => setPushForm({ ...pushForm, imageUrl: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                      placeholder="https://.../notice.png"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Action Screen</label>
                    <select
                      value={pushForm.actionRoute}
                      onChange={(e) => setPushForm({ ...pushForm, actionRoute: e.target.value })}
                      className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    >
                      <option value="/bills">Create Bill Screen (/bills)</option>
                      <option value="/reports">GST & Sales Reports (/reports)</option>
                      <option value="/parties">Parties & Khata Vasooli (/parties)</option>
                      <option value="/items">Inventory & Expiry Radar (/items)</option>
                      <option value="/settings">Settings & Subscription (/settings)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Audience Segment</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "all", label: "All Active Devices" },
                      { id: "free", label: "Trial / Free Users" },
                      { id: "paid", label: "Active Pro Paid" },
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setPushForm({ ...pushForm, targetSegment: seg.id })}
                        className={`px-3 py-2 text-xs rounded-xl border font-bold transition-all ${
                          pushForm.targetSegment === seg.id
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-200"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingPush}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {sendingPush ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {sendingPush ? "Broadcasting..." : "Broadcast Push Notification"}
                  </button>
                </div>
              </div>
            </form>

            {/* Broadcast History Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Recent Broadcast Campaigns ({pushHistory.length})</h4>
              {pushHistory.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-4 text-center">No notifications broadcast yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Title & Message</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Delivered</th>
                        <th className="py-2.5 px-3">Sent Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pushHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-slate-500 text-[11px] line-clamp-1">{item.message}</p>
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[10px] font-mono font-bold text-indigo-700">{item.targetSegment}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">{item.deliveredCount} dev</td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium">
                            {new Date(item.sentAt).toLocaleDateString()} {new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Phone Notification Banner Preview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notification Shade Preview</h4>
            <div className="w-full max-w-[300px] mx-auto rounded-[36px] border-[5px] border-slate-900 bg-slate-900 shadow-xl p-3 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>9:41 AM</span>
                <div className="flex gap-1.5 items-center">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Notification card in shade */}
              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] text-white font-black">
                      U
                    </div>
                    <span className="text-[11px] font-bold text-slate-200">{form.appDisplayName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">now</span>
                </div>
                <h6 className="text-xs font-black text-white leading-tight">
                  {pushForm.title || "Special Alert or Announcement"}
                </h6>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {pushForm.message || "Enter your announcement message to preview how Android notification appears."}
                </p>
                {pushForm.imageUrl && (
                  <div className="h-20 w-full rounded-lg overflow-hidden mt-1.5">
                    <img src={pushForm.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VERSION CONTROL & FORCE UPDATE KILL-SWITCH */}
      {activeTab === "version" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Version Control & Kill-Switch Enforcement
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Remotely enforce minimum supported versions to prevent outdated APK users from calling deprecated APIs.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-800 font-bold">Force Update Kill-Switch:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isForceUpdateEnabled}
                  onChange={(e) => setForm({ ...form, isForceUpdateEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Latest Version Code (Build #)</label>
              <input
                type="number"
                value={form.latestAndroidVersionCode}
                onChange={(e) => setForm({ ...form, latestAndroidVersionCode: parseInt(e.target.value) || 1 })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold"
              />
              <p className="text-[11px] text-slate-400 font-medium">e.g. 1, 2, 3... Corresponds to flutter versionCode.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Latest Version Name (SemVer)</label>
              <input
                type="text"
                value={form.latestAndroidVersionName}
                onChange={(e) => setForm({ ...form, latestAndroidVersionName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-bold"
              />
              <p className="text-[11px] text-slate-400 font-medium">e.g. 1.0.0, 1.0.1, 2.0.0</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
              <label className="block text-xs font-bold text-rose-800">
                Minimum Supported Version (Kill-Switch)
              </label>
              <input
                type="number"
                value={form.minSupportedVersionCode}
                onChange={(e) => setForm({ ...form, minSupportedVersionCode: parseInt(e.target.value) || 1 })}
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-sm text-rose-900 font-bold"
              />
              <p className="text-[11px] text-rose-600 font-medium">Any app below this build code will be blocked until updated.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Direct APK Download URL</label>
              <input
                type="text"
                value={form.apkDownloadUrl}
                onChange={(e) => setForm({ ...form, apkDownloadUrl: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="https://udyogbill.com/downloads/udyogbill-billing.apk"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Google Play Store URL</label>
              <input
                type="text"
                value={form.playStoreUrl}
                onChange={(e) => setForm({ ...form, playStoreUrl: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="https://play.google.com/store/apps/details?id=com.udyogbill.mobile"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Release Notes & Changelog</label>
            <textarea
              rows={4}
              value={form.updateChangelog}
              onChange={(e) => setForm({ ...form, updateChangelog: e.target.value })}
              className="w-full bg-slate-50/60 border border-slate-300 rounded-xl p-3 text-sm font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
              placeholder="List newly released features..."
            />
          </div>
        </div>
      )}

      {/* TAB 5: REMOTE FEATURE FLAGS & MAINTENANCE */}
      {activeTab === "features" && (
        <div className="space-y-6">
          {/* Urgent Maintenance Mode Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-amber-900">System Maintenance Mode</h4>
                  <p className="text-xs text-amber-700 font-medium">
                    When enabled, the mobile app displays an informational maintenance notice during cloud database migration.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isMaintenanceModeEnabled}
                  onChange={(e) => setForm({ ...form, isMaintenanceModeEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            {form.isMaintenanceModeEnabled && (
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Maintenance Notice Message</label>
                <input
                  type="text"
                  value={form.maintenanceNoticeMessage}
                  onChange={(e) => setForm({ ...form, maintenanceNoticeMessage: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium"
                />
              </div>
            )}
          </div>

          {/* Mobile Feature Toggles */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Mobile Feature Flags
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Remotely toggle high-bandwidth or beta features on installed devices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: "isAiBillScannerEnabled",
                  title: "AI Camera Bill & Receipt Scanner",
                  desc: "Optical OCR for paper purchase bills into inventory.",
                  state: form.isAiBillScannerEnabled,
                },
                {
                  key: "isNearExpiryRadarEnabled",
                  title: "Near-Expiry Stock Watchlist Radar",
                  desc: "Automatic batch tracking and 30/60/90 days expiry alert cards.",
                  state: form.isNearExpiryRadarEnabled,
                },
                {
                  key: "isContinuousBarcodePosEnabled",
                  title: "Continuous POS Multi-Scan Camera",
                  desc: "Rapid barcode scanning sheet for retail billing checkout.",
                  state: form.isContinuousBarcodePosEnabled,
                },
                {
                  key: "isEWayBillExportEnabled",
                  title: "Govt E-Way Bill & E-Invoice JSON Export",
                  desc: "Direct NIC JSON export for B2B invoices > ₹50,000.",
                  state: form.isEWayBillExportEnabled,
                },
                {
                  key: "isReferralProgramEnabled",
                  title: "In-App Referral & Rewards Widget",
                  desc: "Show refer-and-earn card inside mobile settings.",
                  state: form.isReferralProgramEnabled,
                },
              ].map((flag) => (
                <div key={flag.key} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between">
                  <div className="pr-3">
                    <p className="text-sm font-bold text-slate-900">{flag.title}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{flag.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={(form as any)[flag.key]}
                      onChange={(e) => setForm({ ...form, [flag.key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DIRECT HELPDESK & CHANNELS */}
      {activeTab === "support" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-indigo-600" />
              Direct In-App Helpdesk & Video Tutorials
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Users can reach official support directly from the mobile app drawer with 1-click WhatsApp or phone calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official WhatsApp Number</label>
              <input
                type="text"
                value={form.supportWhatsAppNumber}
                onChange={(e) => setForm({ ...form, supportWhatsAppNumber: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="e.g. 919876543210 (with country code)"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Calling Helpline Number</label>
              <input
                type="text"
                value={form.supportHelplineNumber}
                onChange={(e) => setForm({ ...form, supportHelplineNumber: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="e.g. 1800-123-4567"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Support Email</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="e.g. support@udyogbill.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">YouTube Tutorial Playlist URL</label>
              <input
                type="text"
                value={form.tutorialYouTubePlaylistUrl}
                onChange={(e) => setForm({ ...form, tutorialYouTubePlaylistUrl: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="https://youtube.com/playlist?list=..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Online Knowledgebase Documentation URL</label>
              <input
                type="text"
                value={form.knowledgebaseDocUrl}
                onChange={(e) => setForm({ ...form, knowledgebaseDocUrl: e.target.value })}
                className="w-full bg-slate-50/60 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                placeholder="https://docs.udyogbill.com/mobile-guide"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: FLEET TELEMETRY */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* OS Distribution */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Android / OS Distribution</h4>
              {telemetry.osDistribution.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-3">No device telemetry logged yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {telemetry.osDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-800 font-bold">OS: {item.osVersion || "Android"}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {item.count} devices
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* App Version Distribution */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900">App Version Adoption</h4>
              {telemetry.versionDistribution.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-3">No device telemetry logged yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {telemetry.versionDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-xs text-slate-800 font-bold">Build: {item.appVersion || "v1.0.0"}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.count} devices
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Active Devices */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Recent Active Mobile Devices</h4>
            {telemetry.recentDevices.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-3">Devices will automatically register on app cold launch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Device Model</th>
                      <th className="py-2.5 px-3">OS Version</th>
                      <th className="py-2.5 px-3">Installed Version</th>
                      <th className="py-2.5 px-3">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {telemetry.recentDevices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{dev.deviceModel}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{dev.osVersion}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-mono font-bold">v{dev.appVersionName}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">
                          {new Date(dev.lastActiveAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
