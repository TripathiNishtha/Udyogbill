"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  KeyRound,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.post("/auth/forgot-password", { email: email.trim() });
      setSuccessMsg(`A 6-digit verification code has been dispatched to ${email}.`);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await apiClient.post("/auth/reset-password", {
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccessMsg("Password successfully reset! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || "Invalid or expired OTP verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7ed] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/60 via-[#fff7ed] to-amber-50/80 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Subtle Accent Grids & Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(rgba(249, 115, 22, 0.25) 1px, transparent 1px), radial-gradient(rgba(234, 88, 12, 0.15) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          backgroundPosition: "0 0, 16px 16px",
        }}
      />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border-2 border-orange-200/80 rounded-3xl p-7 sm:p-8 shadow-xl space-y-6 z-10 relative">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 mb-2">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            {step === 1 ? "Forgot Password" : "Reset Your Password"}
          </h1>
          <p className="text-xs text-slate-600">
            {step === 1
              ? "Enter your registered email and we will dispatch a secure 6-digit OTP."
              : `Enter the 6-digit OTP sent to ${email} and your new password.`}
          </p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Your Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "Dispatching OTP..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                6-Digit Verification Code (OTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.trim())}
                placeholder="123456"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-orange-600 font-black focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 text-sm mt-2 cursor-pointer"
            >
              {loading ? "Updating Password..." : "Reset Password & Login"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-orange-600 pt-1 font-medium cursor-pointer"
            >
              Didn't receive code? Change email &amp; try again
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
