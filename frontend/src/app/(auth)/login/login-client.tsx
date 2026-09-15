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
    <div className="min-h-screen lg:h-screen w-screen overflow-y-auto lg:overflow-hidden bg-[#fff7ed] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/60 via-[#fff7ed] to-amber-50/80 flex flex-col justify-between font-sans relative selection:bg-orange-500 selection:text-white">
      {/* Background Subtle Accent Grids & Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(rgba(249, 115, 22, 0.25) 1px, transparent 1px), radial-gradient(rgba(234, 88, 12, 0.15) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
      />

      {/* Ambient Soft Orbs */}
      <div className="absolute -top-28 -left-28 w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-[450px] h-[450px] bg-amber-200/35 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-28 left-1/4 w-[550px] h-[550px] bg-orange-100/50 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 relative z-10 border-b border-orange-200/80 bg-[#fff7ed]/90 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-white rounded-xl px-2.5 py-1 border border-orange-200 shadow-sm transition-transform group-hover:scale-105">
            <img
              src="/udyogbill-brand-logo.png"
              alt="UdyogBill Logo"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </Link>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline-block text-slate-600 font-medium">New to UdyogBill?</span>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Register Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Single-Screen Body (Centered, Zero Scroll on Desktop) */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center min-h-0 relative z-10 py-4 sm:py-6">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
          
          {/* LEFT COLUMN: Feature Highlights in Light Theme */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-4 xl:space-y-5 text-slate-900 pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-900 text-xs font-bold w-fit shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>India&apos;s Most Trusted Smart GST Billing Platform</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-black text-slate-950 tracking-tight leading-tight">
              Effortless Invoicing, <br />
              Digital Accounts,{" "}
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Secured Growth.
              </span>
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm max-w-lg leading-relaxed font-medium">
              High-speed, intelligent enterprise cloud billing software tailored for Retail Supermarkets, Wholesale Distributors, Pharma Chemists, and Manufacturers.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-orange-300 shadow-sm hover:shadow-md transition-all flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">5-Second GST Invoicing</h4>
                  <p className="text-[11px] text-slate-500 font-medium">E-Invoice, E-Way Bill, Thermal &amp; A4 Print.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-sm hover:shadow-md transition-all flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Smart Inventory &amp; Batches</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Pharma FEFO, Barcodes &amp; Low-Stock Alerts.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-orange-300 shadow-sm hover:shadow-md transition-all flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Instant UPI &amp; Ledger</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Dynamic QR, WhatsApp Share &amp; Auto Khata.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">100% Cloud Security</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Multi-Region Backups &amp; Bank-Grade SSL.</p>
                </div>
              </div>
            </div>

            {/* Trust Proof Bar */}
            <div className="flex items-center gap-5 pt-2 text-xs text-slate-600 border-t border-orange-200/60 max-w-lg">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <span>★ ★ ★ ★ ★</span>
                <span className="text-slate-800 ml-1 font-bold">4.9 / 5 Rating</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>GST India Compliant</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>256-bit Encrypted</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Clean Single-Page Sign-in Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border-2 border-orange-200/80 relative">
              
              {/* Card Header with Prominent Brand Logo */}
              <div className="text-center mb-5">
                <div className="inline-block p-2 rounded-2xl bg-orange-50/50 border border-orange-200 shadow-xs mb-2.5">
                  <img
                    src="/udyogbill-brand-logo.png"
                    alt="UdyogBill"
                    className="h-10 sm:h-11 w-auto mx-auto object-contain"
                  />
                </div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight">
                  Sign In to UdyogBill
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered User ID or Email to continue
                </p>
              </div>

              {/* Error Alert Pill */}
              {error && (
                <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* User ID / Email Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] text-orange-600 hover:text-orange-700 hover:underline font-semibold"
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 bg-white"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure
                  </span>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
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
              <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                New business owner?{" "}
                <Link
                  href="/register"
                  className="text-orange-600 hover:text-orange-700 hover:underline font-bold"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-orange-200/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-1.5 shrink-0 relative z-10 bg-[#fff7ed]/80">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} UdyogBill — A Product of DigiOpera Pvt. Ltd. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          <span>•</span>
          <a href="tel:+919473807622" className="flex items-center gap-1 text-slate-700 hover:text-orange-600 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>Support: +91 94738 07622</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
