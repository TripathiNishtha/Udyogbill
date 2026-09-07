"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Truck,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  BadgeAlert
} from "lucide-react";
import {
  pharmaSfaService,
  SfaSampleStock,
  SfaEmployeeProfile
} from "@/services/pharma-sfa-services";

export default function PharmaSampleInventoryPage() {
  const [samples, setSamples] = useState<SfaSampleStock[]>([]);
  const [employees, setEmployees] = useState<SfaEmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMr, setSelectedMr] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sampleData, empData] = await Promise.all([
        pharmaSfaService.getMrSampleStock(),
        pharmaSfaService.getEmployees()
      ]);
      setSamples(sampleData);
      setEmployees(empData);
    } catch (err) {
      console.error("Failed to fetch samples inventory", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSamples = samples.filter((s) => {
    const matchesMr = selectedMr === "all" || s.mrUserId === selectedMr;
    const matchesSearch =
      (s.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (s.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (s.mrName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesMr && matchesSearch;
  });

  const totalAllocated = filteredSamples.reduce((sum, s) => sum + (s.quantityAllocated || 0), 0);
  const totalDistributed = filteredSamples.reduce((sum, s) => sum + (s.quantityDistributed || 0), 0);
  const totalBagBalance = filteredSamples.reduce((sum, s) => sum + (s.currentStockInBag || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
              Pharma SFA • Sample Bag Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <Package className="w-7 h-7 text-teal-600" />
            MR Sample Bag & HQ Dispatch Challans
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time track of physical physician sample stocks, batch numbers, bag balances & doctor giveaways.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Allocated From HQ</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{totalAllocated.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-2">units received</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Distributed to Doctors</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{totalDistributed.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-2">given during DCR calls</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Current Bag Stock</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-teal-600">{totalBagBalance.toLocaleString()}</span>
            <span className="text-xs text-slate-500 ml-2">units physically available</span>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Medicine, Batch or MR Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <select
              value={selectedMr}
              onChange={(e) => setSelectedMr(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Field Staff</option>
              {employees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.fullName || emp.employeeCode} ({emp.designationTitle || "MR"})
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing {filteredSamples.length} Active Sample Allocations
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-3" />
            <p className="text-sm">Loading field representative sample bag allocations...</p>
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-600">No Sample Stock Records Found</p>
            <p className="text-xs text-slate-400 mt-1">
              Sample bag inventory is updated when HQ dispatches challans or MR logs DCR sampling.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Field Representative</th>
                  <th className="py-3.5 px-4">Sample Product</th>
                  <th className="py-3.5 px-4">Batch Number</th>
                  <th className="py-3.5 px-4">Expiry (MM/YY)</th>
                  <th className="py-3.5 px-4 text-right">Allocated</th>
                  <th className="py-3.5 px-4 text-right">Given to Docs</th>
                  <th className="py-3.5 px-4 text-right">Current Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSamples.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{s.mrName || "Field MR"}</div>
                      <div className="text-xs text-slate-400 font-mono">MR User ID: {s.mrUserId?.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{s.itemName || "Sample Unit"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                      {s.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {s.expiryMonthYear}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {s.quantityAllocated}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      {s.quantityDistributed}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        {s.currentStockInBag}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {s.currentStockInBag > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <BadgeAlert className="w-3 h-3" /> Exhausted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
