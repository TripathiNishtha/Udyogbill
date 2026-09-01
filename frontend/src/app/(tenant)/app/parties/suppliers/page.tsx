"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  Building,
  CreditCard,
  FileText,
  AlertCircle,
  X,
  Phone,
  Mail,
  UploadCloud
} from "lucide-react";
import { partyService, CreatePartyInput } from "@/services/party-services";
import { PartyList } from "@/types";

export default function TenantSuppliersPage() {
  const [suppliers, setSuppliers] = useState<PartyList[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  // Add Supplier Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreatePartyInput>({
    code: "",
    legalName: "",
    tradeName: "",
    contactPersonName: "",
    partyType: 2, // Supplier
    supplierType: 2, // Distributor
    email: "",
    mobile: "",
    primaryPhone: "",
    gstin: "",
    pan: "",
    creditLimit: 0,
    creditPeriodDays: 30,
    openingBalance: 0,
    openingBalanceType: 2, // Credit / Payable
    billingAddress: {
      addressType: 1,
      label: "Vendor Office",
      addressLine1: "",
      city: "",
      state: "Maharashtra",
      stateCode: "27",
      pincode: "",
      country: "India",
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await partyService.getSuppliers({
        searchTerm: searchTerm || undefined,
        supplierType: selectedType ? parseInt(selectedType) : undefined,
        outstandingOnly: outstandingOnly || undefined,
      });
      setSuppliers(res.items);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedType, outstandingOnly]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.legalName) return;

    try {
      setSubmitting(true);
      await partyService.createSupplier({
        ...form,
        creditLimit: Number(form.creditLimit) || 0,
        creditPeriodDays: Number(form.creditPeriodDays) || 0,
        openingBalance: Number(form.openingBalance) || 0,
      });

      setIsModalOpen(false);
      setForm({
        code: "",
        legalName: "",
        tradeName: "",
        contactPersonName: "",
        partyType: 2,
        supplierType: 2,
        email: "",
        mobile: "",
        primaryPhone: "",
        gstin: "",
        pan: "",
        creditLimit: 0,
        creditPeriodDays: 30,
        openingBalance: 0,
        openingBalanceType: 2,
        billingAddress: {
          addressType: 1,
          label: "Vendor Office",
          addressLine1: "",
          city: "",
          state: "Maharashtra",
          stateCode: "27",
          pincode: "",
          country: "India",
        },
      });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const getSupplierTypeLabel = (type?: number) => {
    switch (type) {
      case 1:
        return "Manufacturer";
      case 2:
        return "Distributor / Stockist";
      case 3:
        return "Importer";
      case 4:
        return "Local Vendor";
      default:
        return "Supplier";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            <span>Suppliers Directory (Sundry Creditors)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage vendors, manufacturers, procurement accounts, GST compliance, and outstanding payables.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/app/parties/import"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Bulk Import (CSV)</span>
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Code, Legal Name, GSTIN, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Supplier Types</option>
            <option value="1">Manufacturer</option>
            <option value="2">Distributor / Stockist</option>
            <option value="3">Importer</option>
            <option value="4">Local Vendor</option>
          </select>
        </div>

        <button
          onClick={() => setOutstandingOnly(!outstandingOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
            outstandingOnly
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Pending Payables Only</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor Code & Name</th>
                <th className="px-5 py-3.5 font-semibold">Classification & GSTIN</th>
                <th className="px-5 py-3.5 font-semibold">Contact Info</th>
                <th className="px-5 py-3.5 font-semibold">Credit Terms</th>
                <th className="px-5 py-3.5 font-semibold text-right">Outstanding Payable</th>
                <th className="px-5 py-3.5 font-semibold text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading suppliers directory...
                  </td>
                </tr>
              ) : suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white tracking-tight">{s.legalName}</div>
                      {s.tradeName && <div className="text-[11px] text-slate-400">{s.tradeName}</div>}
                      <div className="font-mono text-[10px] text-indigo-400 font-semibold mt-0.5">
                        {s.code}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {getSupplierTypeLabel(s.supplierType)}
                      </span>
                      {s.gstin ? (
                        <div className="font-mono text-[11px] text-slate-300 mt-1">
                          GST: {s.gstin} <span className="text-slate-500">({s.stateCode})</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 mt-1">Unregistered</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {s.mobile && (
                        <div className="flex items-center space-x-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{s.mobile}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div className="text-white">{s.creditPeriodDays} Days Terms</div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {s.creditLimit > 0 ? `₹${s.creditLimit.toLocaleString()}` : "N/A"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <div
                        className={`font-bold text-sm ${
                          s.currentOutstandingBalance < 0
                            ? "text-rose-400"
                            : s.currentOutstandingBalance > 0
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        ₹{Math.abs(s.currentOutstandingBalance).toFixed(2)}
                        <span className="text-[10px] ml-1">
                          {s.currentOutstandingBalance <= 0 ? "Cr (Payable)" : "Dr (Advance)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/app/parties/${s.id}/ledger`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No suppliers found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <span>Add Supplier / Vendor Account</span>
              </h3>
              <p className="text-xs text-slate-400">
                Register manufacturer or vendor profile with GSTIN and credit terms.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Supplier Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUPP-2001"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Logistics & Wholesale Distributors"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Trade Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla Depot"
                    value={form.tradeName || ""}
                    onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Supplier Type</label>
                  <select
                    value={form.supplierType}
                    onChange={(e) => setForm({ ...form, supplierType: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="1">Manufacturer</option>
                    <option value="2">Distributor / Stockist</option>
                    <option value="3">Importer</option>
                    <option value="4">Local Vendor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Mehta"
                    value={form.contactPersonName || ""}
                    onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AACCC5678B1Z2"
                    value={form.gstin || ""}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ACCC5678B"
                    value={form.pan || ""}
                    onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Mobile / Primary Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9822334455"
                    value={form.mobile || ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="accounts@cipla.com"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Terms & Opening Payable */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Payment Terms (Credit Days)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={form.creditPeriodDays || ""}
                    onChange={(e) => setForm({ ...form, creditPeriodDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Opening Payable Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.openingBalance || ""}
                    onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
