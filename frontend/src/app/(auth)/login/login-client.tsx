"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api-services";
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Receipt,
  CreditCard,
  Building2,
  HelpCircle
} from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      const response = await authService.login({ email: cleanEmail, password: cleanPassword });
      if (response.user.isSuperAdmin) {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/app/dashboard";
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.userMessage ||
        err.response?.data?.error ||
        "Invalid email or password. Please try again.";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between select-none font-sans relative">
      {/* Ambient background glow accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shrink-0 relative z-10">
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
          <span className="hidden sm:inline-block text-slate-300 font-medium">New to UdyogBill?</span>
          <Link
            href="/register"
            className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Register Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Single-Screen Body (Centered, Zero Scroll) */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center min-h-0 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-12 items-center">
          
          {/* LEFT COLUMN: UdyogBill Feature Showcase (100% English) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-4 xl:space-y-5 text-white pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold w-fit backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>India&apos;s Most Trusted Smart GST Billing Platform</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
              Effortless Invoicing, <br />
              Digital Accounts,{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Secured Growth.
              </span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-lg leading-relaxed font-medium">
              High-speed, intelligent enterprise cloud billing software tailored for Retail Supermarkets, Wholesale Distributors, Pharma Chemists, and Manufacturers.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">5-Second GST Invoicing</h4>
                  <p className="text-[11px] text-slate-300">E-Invoice, E-Way Bill, Thermal & A4 Print.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Smart Inventory & Batches</h4>
                  <p className="text-[11px] text-slate-300">Pharma FEFO, Barcodes & Low-Stock Alerts.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant UPI & Ledger</h4>
                  <p className="text-[11px] text-slate-300">Dynamic QR, WhatsApp Share & Auto Khata.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">100% Cloud Security</h4>
                  <p className="text-[11px] text-slate-300">Multi-Region Backups & Bank-Grade SSL.</p>
                </div>
              </div>
            </div>

            {/* Trust Proof Bar */}
            <div className="flex items-center gap-5 pt-2 text-xs text-slate-300 border-t border-white/10 max-w-lg">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <span>★ ★ ★ ★ ★</span>
                <span className="text-white ml-1 font-semibold">4.9 / 5 Rating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>GST India Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>256-bit Encrypted</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Clean Single-Page Sign-in Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl relative">
              
              {/* Card Header with Prominent Brand Logo */}
              <div className="text-center mb-5">
                <div className="inline-block p-2 rounded-xl bg-white border border-slate-200 shadow-sm mb-2.5">
                  <img
                    src="/udyogbill-brand-logo.png"
                    alt="UdyogBill"
                    className="h-11 sm:h-12 w-auto mx-auto object-contain"
                  />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Sign In to UdyogBill
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your registered User ID or Email to continue
                </p>
              </div>

              {/* Error Alert Pill */}
              {error && (
                <div className="mb-3.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* User ID / Email Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    User ID / Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@domain.com or mobile"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure
                  </span>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Your Business</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Card Footer: Register Link */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
                New business owner?{" "}
                <Link
                  href="/register"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1.5 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} UdyogBill — A Product of DigiOpera Pvt. Ltd. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <span>•</span>
          <a href="tel:+919473807622" className="flex items-center gap-1 text-slate-300 hover:text-amber-400 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Support: +91 94738 07622</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
