"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService, industryService } from "@/services/api-services";
import { Industry } from "@/types";
import { Building2, Mail, Lock, Phone, AlertCircle, Loader2, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadIndustries() {
      try {
        const data = await industryService.getIndustries();
        setIndustries(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, industryId: data[0].id }));
        }
      } catch (err) {
        // Fallback default target industries if backend not currently running
        setIndustries([
          { id: "1", code: "PHARMA", name: "Pharmaceuticals & Healthcare", description: "Batch & Expiry", icon: "activity", displayOrder: 1, isActive: true, modules: [] },
          { id: "2", code: "FMCG", name: "FMCG Distribution", description: "Multi-UOM & Schemes", icon: "truck", displayOrder: 2, isActive: true, modules: [] },
          { id: "3", code: "GARMENTS", name: "Garments & Apparel", description: "Size/Color Matrix", icon: "tag", displayOrder: 3, isActive: true, modules: [] },
          { id: "4", code: "BAKERY", name: "Bakery & Confectionery", description: "Recipe & BOM", icon: "coffee", displayOrder: 4, isActive: true, modules: [] },
          { id: "5", code: "WHOLESALE", name: "B2B Wholesale Trading", description: "Tier Pricing", icon: "briefcase", displayOrder: 5, isActive: true, modules: [] },
          { id: "6", code: "RETAIL", name: "Retail Store & POS", description: "Fast Barcode POS", icon: "shopping-cart", displayOrder: 6, isActive: true, modules: [] },
        ]);
      } finally {
        setLoadingIndustries(false);
      }
    }
    loadIndustries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.registerTenant(formData);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please check inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="max-w-xl w-full bg-slate-800/80 border border-slate-700 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/30 mb-3">
            UB
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Register Business Tenant</h2>
          <p className="text-sm text-slate-400 mt-1">Multi-Industry Configuration Driven Platform</p>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Tenant Organization Provisioned!</h3>
            <p className="text-sm text-slate-300">
              Your 14-day trial and industry capability pack are ready. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Industry Template
              </label>
              <select
                value={formData.industryId}
                onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                required
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {industries.map((ind) => (
                  <option key={ind.id} value={ind.id} className="bg-slate-900 text-white">
                    {ind.name} ({ind.code}) — {ind.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Business Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Apex Pharma Distributors"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Trade / Brand Name
                </label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  placeholder="Apex Meds"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.adminFullName}
                  onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Primary Mobile Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin Work Email
              </label>
              <input
                type="email"
                required
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="owner@apexpharma.com"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Create Password
              </label>
              <input
                type="password"
                required
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                placeholder="••••••••••••"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Start 14-Day Free Trial</span>}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign In to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
