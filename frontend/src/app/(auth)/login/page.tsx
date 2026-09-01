"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api-services";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });
      if (response.user.isSuperAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/app/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/30 mb-3">
            UB
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to UdyogBill</h2>
          <p className="text-sm text-slate-400 mt-1">Universal Multi-Industry Cloud Platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              User ID / Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. superadmin, demo, or email"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          New business owner?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Register your Tenant organization
          </Link>
        </div>
      </div>
    </div>
  );
}
