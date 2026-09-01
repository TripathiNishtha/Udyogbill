"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  Building,
  User,
  Stethoscope,
  TrendingDown,
  Download,
} from "lucide-react";
import { industryService, ExpiryAlertBatch, ScheduleH1RegisterRow } from "@/services/industry-services";

export default function PharmaVerticalPage() {
  const [activeTab, setActiveTab] = useState<"expiry" | "scheduleH1">("expiry");
  const [expiryBatches, setExpiryBatches] = useState<ExpiryAlertBatch[]>([]);
  const [scheduleH1Rows, setScheduleH1Rows] = useState<ScheduleH1RegisterRow[]>([]);
  const [daysThreshold, setDaysThreshold] = useState(90);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadExpiryData = async () => {
    try {
      setLoading(true);
      const data = await industryService.getExpiryAlerts({ daysThreshold });
      setExpiryBatches(data || []);
    } catch (err) {
      console.error("Failed to load pharma expiry radar", err);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleH1Data = async () => {
    try {
      setLoading(true);
      const data = await industryService.getScheduleH1Register();
      setScheduleH1Rows(data || []);
    } catch (err) {
      console.error("Failed to load Schedule H1 register", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "expiry") {
      loadExpiryData();
    } else {
      loadScheduleH1Data();
    }
  }, [activeTab, daysThreshold]);

  const totalValueAtRisk = expiryBatches.reduce((acc, b) => acc + b.totalValueAtRisk, 0);
  const expiredCount = expiryBatches.filter((b) => b.isExpired).length;
  const criticalCount = expiryBatches.filter((b) => !b.isExpired && b.daysUntilExpiry <= 30).length;

  const filteredExpiry = expiryBatches.filter(
    (b) =>
      b.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.itemSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredH1 = scheduleH1Rows.filter(
    (r) =>
      r.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Activity className="w-7 h-7 text-emerald-400" />
            <span>Pharma Compliance & Expiry Radar</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Statutory drug compliance, near-expiry inventory quarantine, and Schedule H1 prescription register.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveTab("expiry")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "expiry"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Near-Expiry Radar
          </button>
          <button
            onClick={() => setActiveTab("scheduleH1")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "scheduleH1"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Schedule H1 Register
          </button>
        </div>
      </div>

      {activeTab === "expiry" ? (
        <>
          {/* Expiry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Value at Expiry Risk</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                ₹{totalValueAtRisk.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">MRP value across expiring batches</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Expired Batches (Quarantine)</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-2">
                {expiredCount}
              </div>
              <div className="text-[11px] text-rose-400 mt-1 font-semibold">Immediate write-off recommended</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Critical (&lt; 30 Days Left)</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                {criticalCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Fast liquidation / return to supplier</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Medicine, SKU, or Batch Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Expiry Horizon:</span>
              <select
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(Number(e.target.value))}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value={30}>Next 30 Days</option>
                <option value={60}>Next 60 Days</option>
                <option value={90}>Next 90 Days</option>
                <option value={180}>Next 6 Months</option>
              </select>
            </div>
          </div>

          {/* Expiry Table */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Item & SKU</th>
                    <th className="py-3.5 px-4">Batch Number</th>
                    <th className="py-3.5 px-4">Expiry Date</th>
                    <th className="py-3.5 px-4">Time Left</th>
                    <th className="py-3.5 px-4 text-right">Available Qty</th>
                    <th className="py-3.5 px-4 text-right">Value at Risk</th>
                    <th className="py-3.5 px-4">Warehouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Scanning near-expiry medicine batches...
                      </td>
                    </tr>
                  ) : filteredExpiry.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        ✅ No medicines expiring within {daysThreshold} days. Inventory is healthy!
                      </td>
                    </tr>
                  ) : (
                    filteredExpiry.map((b) => (
                      <tr key={b.batchId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{b.itemName}</div>
                          <div className="text-[10px] font-mono text-indigo-400">{b.itemSku}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                          {b.batchNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {new Date(b.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {b.isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              EXPIRED ({Math.abs(b.daysUntilExpiry)}d ago)
                            </span>
                          ) : b.daysUntilExpiry <= 30 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {b.daysUntilExpiry} days left
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {b.daysUntilExpiry} days left
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                          {b.currentStock} {b.uomName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                          ₹{b.totalValueAtRisk.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {b.warehouseName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Schedule H1 Compliance Table */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Doctor, Patient, Medicine, or Bill No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Statutory Register under Drugs & Cosmetics Rules, 1945
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Date & Bill No</th>
                    <th className="py-3.5 px-4">Patient / Customer</th>
                    <th className="py-3.5 px-4">Prescribing Doctor</th>
                    <th className="py-3.5 px-4">Doctor Reg. No</th>
                    <th className="py-3.5 px-4">Drug Name</th>
                    <th className="py-3.5 px-4">Batch</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Loading Schedule H1 drug register...
                      </td>
                    </tr>
                  ) : filteredH1.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No Schedule H1 records found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredH1.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-white font-semibold">{r.invoiceNumber}</div>
                          <div className="text-slate-500">{new Date(r.invoiceDate).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{r.patientName}</div>
                          {r.patientPhone && <div className="text-[10px] text-slate-500">{r.patientPhone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-semibold">
                          <div className="flex items-center space-x-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{r.doctorName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-indigo-400">
                          {r.doctorRegistrationNumber}
                        </td>
                        <td className="py-3.5 px-4 text-white font-bold">
                          {r.drugName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-amber-400">
                          {r.batchNumber}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                          {r.quantity} {r.uomName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
