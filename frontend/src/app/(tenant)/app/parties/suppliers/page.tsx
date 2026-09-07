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
  UploadCloud,
  ArrowUpDown,
  Sparkles
} from "lucide-react";
import { partyService, CreatePartyInput } from "@/services/party-services";
import { tenantAppService } from "@/services/tenant-app-services";
import { onboardingService } from "@/services/onboarding-service";
import { PartyList, TenantDetails } from "@/types";
import { useAddons } from "@/context/addon-context";
import { Badge, Button, EmptyState, TableSkeleton } from "@/components/ui";

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
  const [fetchingGst, setFetchingGst] = useState(false);

  const handleGstLookup = async () => {
    if (!form.gstin || form.gstin.trim().length !== 15) {
      alert("Please enter a valid 15-character GSTIN first.");
      return;
    }
    try {
      setFetchingGst(true);
      const res = await onboardingService.lookupGstin(form.gstin.trim());
      if (res) {
        setForm((prev) => ({
          ...prev,
          legalName: res.legalName || prev.legalName,
          tradeName: res.tradeName || prev.tradeName,
          pan: res.pan || prev.pan,
          billingAddress: {
            addressType: prev.billingAddress?.addressType ?? 1,
            label: prev.billingAddress?.label ?? "Vendor Office",
            addressLine1: res.address || prev.billingAddress?.addressLine1 || "",
            addressLine2: prev.billingAddress?.addressLine2 || "",
            city: prev.billingAddress?.city || "",
            state: res.state || prev.billingAddress?.state || "Maharashtra",
            stateCode: res.stateCode || prev.billingAddress?.stateCode || "27",
            pincode: res.pincode || prev.billingAddress?.pincode || "",
            country: prev.billingAddress?.country || "India",
          },
        }));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || "Failed to fetch details for this GSTIN.");
    } finally {
      setFetchingGst(false);
    }
  };

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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span>Suppliers Directory (Sundry Creditors)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage vendors, manufacturers, procurement accounts, GST compliance, and outstanding payables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/parties/import">
            <Button variant="outline" size="sm" icon={<UploadCloud className="w-4 h-4 text-primary" />}>
              Bulk Import (CSV)
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          >
            Add New Supplier
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Code, Legal Name, GSTIN, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
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
              ? "bg-danger/10 text-danger border-danger/30"
              : "bg-surface-elevated/40 text-muted-foreground border-border hover:text-foreground"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Pending Payables Only</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No suppliers found in directory"
            description="Add vendor and manufacturer accounts to track purchase bills, payment terms, and input tax credits."
            actionLabel="Add New Supplier"
            onAction={() => setIsModalOpen(true)}
            actionIcon={Plus}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="text-table-headerForeground uppercase tracking-wider bg-table-header border-b border-border text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor Code &amp; Name</th>
                  <th className="px-4 py-3 font-semibold">Classification &amp; GSTIN</th>
                  <th className="px-4 py-3 font-semibold">Contact Info</th>
                  <th className="px-4 py-3 font-semibold">Credit Terms</th>
                  <th className="px-4 py-3 font-semibold text-right">Outstanding Payable</th>
                  <th className="px-4 py-3 font-semibold text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-table-rowHover transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground tracking-tight">{s.legalName}</div>
                      {s.tradeName && <div className="text-[11px] text-muted-foreground">{s.tradeName}</div>}
                      <div className="font-mono text-[10px] text-primary font-semibold mt-0.5">
                        {s.code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success" size="sm">
                        {getSupplierTypeLabel(s.supplierType)}
                      </Badge>
                      {s.gstin ? (
                        <div className="font-mono text-[11px] text-foreground mt-1">
                          GST: {s.gstin} <span className="text-muted-foreground">({s.stateCode})</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-1">Unregistered</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.mobile && (
                        <div className="flex items-center space-x-1 font-mono text-[11px] text-foreground">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{s.mobile}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center space-x-1 text-[11px] text-muted-foreground mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <div className="text-foreground font-medium">{s.creditPeriodDays} Days Terms</div>
                      <div className="text-[10px] text-muted-foreground">
                        Limit: {s.creditLimit > 0 ? `₹${s.creditLimit.toLocaleString()}` : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <div
                        className={`font-bold text-sm ${
                          s.currentOutstandingBalance < 0
                            ? "text-danger font-semibold"
                            : s.currentOutstandingBalance > 0
                            ? "text-success font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        ₹{Math.abs(s.currentOutstandingBalance).toFixed(2)}
                        <span className="text-[10px] ml-1">
                          {s.currentOutstandingBalance <= 0 ? "Cr (Payable)" : "Dr (Advance)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/app/parties/${s.id}/ledger`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-primary text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface text-foreground border border-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-elevated transition-colors"
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">GSTIN (15 Digits)</label>
                    <button
                      type="button"
                      disabled={fetchingGst || !form.gstin || form.gstin.length !== 15}
                      onClick={handleGstLookup}
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition"
                    >
                      <Sparkles className={`w-3 h-3 ${fetchingGst ? "animate-spin" : ""}`} />
                      <span>{fetchingGst ? "Fetching..." : "Auto-Fetch Details"}</span>
                    </button>
                  </div>
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
                  <label className="text-xs font-semibold text-slate-300">Mobile / Primary Phone (10 Digits)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9822334455"
                    value={form.mobile || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, mobile: val, primaryPhone: val });
                    }}
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
