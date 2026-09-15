"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Phone,
  User,
  ShieldCheck,
  MessageCircle,
  Clock,
  Zap,
} from "lucide-react";
import { getAttributionData, detectIndustryCode } from "@/lib/attribution";
import { trackLeadConversion } from "@/components/analytics/google-analytics";

interface PopupConfig {
  isEnabled: boolean;
  badgeText: string;
  heading: string;
  subHeading: string;
  ctaButtonText: string;
  offerTag: string;
  triggerDelaySeconds: number;
  enableExitIntent: boolean;
  dismissCooldownHours: number;
  whatsappNumber: string;
}

const DEFAULT_CONFIG: PopupConfig = {
  isEnabled: true,
  badgeText: "Special Welcome Offer",
  heading: "Start Your 14-Day Free ERP Trial",
  subHeading: "Automated GST compliance, smart batch inventory & unified party ledgers. Instant setup on WhatsApp.",
  ctaButtonText: "Claim Free Access & Live Demo",
  offerTag: "14-Day Free Access • Free Data Migration",
  triggerDelaySeconds: 25,
  enableExitIntent: true,
  dismissCooldownHours: 24,
  whatsappNumber: "919473807622",
};

export function Smart3dLeadPopup() {
  const pathname = usePathname();
  const [config, setConfig] = useState<PopupConfig>(DEFAULT_CONFIG);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3D Card tilt states
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });

  // 1. Fetch live config from public endpoint
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await fetch("/api/public/lead-popup-config", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setConfig({
              isEnabled: data.isEnabled ?? data.IsEnabled ?? true,
              badgeText: data.badgeText ?? data.BadgeText ?? DEFAULT_CONFIG.badgeText,
              heading: data.heading ?? data.Heading ?? DEFAULT_CONFIG.heading,
              subHeading: data.subHeading ?? data.SubHeading ?? DEFAULT_CONFIG.subHeading,
              ctaButtonText: data.ctaButtonText ?? data.CtaButtonText ?? DEFAULT_CONFIG.ctaButtonText,
              offerTag: data.offerTag ?? data.OfferTag ?? DEFAULT_CONFIG.offerTag,
              triggerDelaySeconds: data.triggerDelaySeconds ?? data.TriggerDelaySeconds ?? DEFAULT_CONFIG.triggerDelaySeconds,
              enableExitIntent: data.enableExitIntent ?? data.EnableExitIntent ?? DEFAULT_CONFIG.enableExitIntent,
              dismissCooldownHours: data.dismissCooldownHours ?? data.DismissCooldownHours ?? DEFAULT_CONFIG.dismissCooldownHours,
              whatsappNumber: data.whatsappNumber ?? data.WhatsappNumber ?? DEFAULT_CONFIG.whatsappNumber,
            });
          }
        }
      } catch (err) {
        // Silently fallback to default config
        console.debug("Lead popup using fallback config", err);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Check dismissal and conversion status
  const canShowPopup = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (!config.isEnabled) return false;

    // Do not show if user has already submitted a lead
    if (localStorage.getItem("ub_lead_popup_submitted") === "true") {
      return false;
    }

    // Check cooldown
    const dismissedAt = localStorage.getItem("ub_lead_popup_dismissed_at");
    if (dismissedAt) {
      const elapsedHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (elapsedHours < config.dismissCooldownHours) {
        return false;
      }
    }

    return true;
  }, [config.isEnabled, config.dismissCooldownHours]);

  // 3. Setup Triggers (Time Delay & Exit Intent)
  useEffect(() => {
    if (!canShowPopup()) return;

    // Trigger A: Delay timer
    const timer = setTimeout(() => {
      if (canShowPopup()) {
        setIsOpen(true);
      }
    }, Math.max(5, config.triggerDelaySeconds) * 1000);

    // Trigger B: Desktop Exit Intent (cursor leaves top of window)
    const handleMouseLeave = (e: MouseEvent) => {
      if (config.enableExitIntent && e.clientY <= 12 && canShowPopup()) {
        setIsOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [config.triggerDelaySeconds, config.enableExitIntent, canShowPopup]);

  // 4. Interactive 3D Mouse Tilt & Glare Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-8 to +8 degrees for pleasant subtle depth)
    const rX = -((y - centerY) / centerY) * 8;
    const rY = ((x - centerX) / centerX) * 8;

    // Glare position in percent
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({ x: glareX, y: glareY, opacity: 0.15 });
  };

  const handleMouseLeaveCard = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // 5. Dismiss handler
  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem("ub_lead_popup_dismissed_at", Date.now().toString());
    } catch {
      // Ignore storage errors in private browsing
    }
  };

  // 6. Submit Lead Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name or business name.");
      return;
    }

    setLoading(true);

    try {
      const attr = getAttributionData();
      const payload = {
        name: name.trim(),
        businessName: businessName.trim() || undefined,
        mobile: cleanMobile,
        source: "3d-lead-popup",
        landingPage: pathname || window.location.pathname,
        industryCode: detectIndustryCode(pathname),
        utmSource: attr.utmSource,
        utmMedium: attr.utmMedium,
        utmCampaign: attr.utmCampaign,
        citySlug: attr.citySlug,
        searchKeyword: attr.searchKeyword,
        referrerUrl: attr.referrerUrl,
        deviceType: attr.deviceType,
      };

      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to submit. Please try again.");
      }

      trackLeadConversion({
        source: "3d-lead-popup",
        industryCode: detectIndustryCode(pathname),
      });

      try {
        localStorage.setItem("ub_lead_popup_submitted", "true");
      } catch {
        // Ignore
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const whatsappLink = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
    `Hello UdyogBill team! I just signed up for the 14-day free trial on your website. My name is ${name || "Business Owner"}. Please guide me with setup.`
  )}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Semi-transparent dark frosted glass backdrop so background page remains visible */}
      <div
        className="fixed inset-0 transition-opacity duration-300 cursor-pointer"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* 3D Perspective Box Wrapper */}
      <div
        className="relative z-10 w-full max-w-lg my-auto pointer-events-auto"
        style={{ perspective: "1200px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeaveCard}
      >
        {/* 3D Floating Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-3 -right-3 z-30 p-2 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-white/20 shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer"
          title="Close offer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* The 3D Card */}
        <div
          ref={cardRef}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 0.12s ease-out",
          }}
          className="relative rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.35)] overflow-hidden p-6 sm:p-8"
        >
          {/* Dynamic Glare Overlay */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-200 z-10"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}) 0%, transparent 60%)`,
            }}
          />

          {/* Decorative 3D Ambient Mesh Gradients */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Card Content with 3D Depth */}
          {!submitted ? (
            <div className="relative z-20 space-y-5" style={{ transform: "translateZ(20px)" }}>
              {/* Floating Top Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md shadow-indigo-600/30"
                style={{ transform: "translateZ(30px)" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{config.badgeText}</span>
              </div>

              {/* Heading & Hook */}
              <div className="space-y-1.5" style={{ transform: "translateZ(25px)" }}>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {config.heading}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {config.subHeading}
                </p>
              </div>

              {/* Highlights Pill List */}
              <div
                className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                style={{ transform: "translateZ(15px)" }}
              >
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Free Trial</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant WhatsApp Setup</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  <Clock className="w-3.5 h-3.5" />
                  <span>No Credit Card</span>
                </div>
              </div>

              {/* Lead Form */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-1" style={{ transform: "translateZ(25px)" }}>
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-fadeIn">
                    {error}
                  </div>
                )}

                {/* Input: Name */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name or Shop Name *"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600/10 transition-all font-medium"
                  />
                </div>

                {/* Input: WhatsApp Mobile */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    <span className="text-slate-500">🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-Digit Mobile / WhatsApp Number *"
                    className="w-full pl-16 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600/10 transition-all font-medium"
                  />
                </div>

                {/* 3D Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ transform: "translateZ(35px)" }}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/35 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Activating Your Free Trial...</span>
                    </span>
                  ) : (
                    <>
                      <span>{config.ctaButtonText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Offer Guarantee Disclaimer */}
              <div className="text-center pt-1" style={{ transform: "translateZ(10px)" }}>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  ✓ {config.offerTag}
                </p>
              </div>
            </div>
          ) : (
            /* 3D Success View */
            <div
              className="relative z-20 text-center py-6 space-y-4 animate-fadeIn"
              style={{ transform: "translateZ(25px)" }}
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 transform-gpu animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Trial Access Reserved! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto font-medium">
                  Welcome to UdyogBill. Our onboarding engineer will connect with you on WhatsApp to assist with free data import and instant software activation.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform transform active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Support Now</span>
                </a>
                <button
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
