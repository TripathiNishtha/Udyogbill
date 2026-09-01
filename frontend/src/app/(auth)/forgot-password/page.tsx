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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {step === 1 ? "Forgot Password" : "Reset Your Password"}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 1
              ? "Enter your registered email and we will dispatch a secure 6-digit OTP."
              : `Enter the 6-digit OTP sent to ${email} and your new password.`}
          </p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Your Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Dispatching OTP..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                6-Digit Verification Code (OTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.trim())}
                placeholder="123456"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm mt-2"
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
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
            >
              Didn't receive code? Change email & try again
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-800 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
