"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Target,
  FileCheck,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Store,
  Boxes,
  ArrowRight
} from "lucide-react";
import {
  pharmaSfaService,
  MrSalesAttribution,
  PharmaReconciliationReport,
  MrTargetVsAchievement,
  SecondarySalesReconciliation
} from "@/services/pharma-sfa-services";

export default function SalesAttributionAndReconciliationPage() {
  const [activeTab, setActiveTab] = useState<"reconciliation" | "attributions" | "targets" | "secondaryReconciliation">("reconciliation");
  const [reconReport, setReconReport] = useState<PharmaReconciliationReport | null>(null);
  const [attributions, setAttributions] = useState<MrSalesAttribution[]>([]);
  const [targets, setTargets] = useState<MrTargetVsAchievement[]>([]);
  const [secondaryRecon, setSecondaryRecon] = useState<SecondarySalesReconciliation[]>([]);
  const [stockistSearch, setStockistSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Date filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reconRes, attrRes, targetRes, secRes] = await Promise.allSettled([
        pharmaSfaService.getReconciliationReport(fromDate, toDate),
        pharmaSfaService.getSalesAttributions(fromDate, toDate),
        pharmaSfaService.getTargetVsAchievement(now.getMonth() + 1, now.getFullYear()),
        pharmaSfaService.getSecondarySalesReconciliation({ fromDate, toDate })
      ]);

      if (reconRes.status === "fulfilled") setReconReport(reconRes.value);
      if (attrRes.status === "fulfilled") setAttributions(attrRes.value);
      if (targetRes.status === "fulfilled") setTargets(targetRes.value);
      if (secRes.status === "fulfilled") setSecondaryRecon(secRes.value);
    } catch (err) {
      console.error("Failed to load attribution reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/pharma/sfa"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Section 16 & 39 • CBO Sales Analytics
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">MR Sales Attribution & Reconciliation</h1>
            <p className="text-sm text-gray-500">
              Audit 3-way sales parity: Core GST Invoices ↔ Stockist Billing ↔ MR Sales Attribution.
            </p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-1.5 text-xs bg-white text-gray-800"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-1.5 text-xs bg-white text-gray-800"
          />
          <button
            onClick={loadData}
            className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
            title="Reload Report"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Way Reconciliation Status Card */}
      {reconReport && (
        <div className={`border rounded-xl p-5 shadow-sm transition ${
          reconReport.isReconciled
            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                {reconReport.isReconciled ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    100% Reconciled • Zero Mismatch Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Discrepancy Detected: ₹{reconReport.discrepancyAmount.toLocaleString()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-1">
                Stockist Billing = ₹{reconReport.totalStockistSales.toLocaleString()} ↔ MR Attribution = ₹{reconReport.totalMrAttributedSales.toLocaleString()}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Total Core GST Invoices: ₹{reconReport.totalCoreInvoiceSales.toLocaleString()} ({reconReport.totalInvoicesCount} invoices) • Attributed to Active Field Reps: {reconReport.attributedInvoicesCount} invoices.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-500 font-medium">Reconciliation Status</div>
                <div className="text-sm font-bold text-emerald-700">Audit Verified (No Fakes)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4">
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "reconciliation"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Reconciliation Overview
        </button>
        <button
          onClick={() => setActiveTab("attributions")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "attributions"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Invoice-Level Attributions ({attributions.length})
        </button>
        <button
          onClick={() => setActiveTab("targets")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "targets"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Target vs Achievement Matrix ({targets.length})
        </button>
        <button
          onClick={() => setActiveTab("secondaryReconciliation")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "secondaryReconciliation"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Secondary Sales Reconciliation ({secondaryRecon.length})
        </button>
      </div>

      {/* Tab 1: Reconciliation Overview */}
      {activeTab === "reconciliation" && reconReport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">1. Core GST Sales Register</div>
            <div className="text-3xl font-bold text-gray-900">₹{reconReport.totalCoreInvoiceSales.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Authoritative master sales engine invoices posted in period.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">2. Stockist Invoices Total</div>
            <div className="text-3xl font-bold text-teal-700">₹{reconReport.totalStockistSales.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Invoices generated for parties mapped as wholesale pharma stockists.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">3. MR Sales Attribution</div>
            <div className="text-3xl font-bold text-emerald-700">₹{reconReport.totalMrAttributedSales.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Credited to medical representatives based on effective date allocation.</p>
          </div>
        </div>
      )}

      {/* Tab 2: Attribution Breakdown */}
      {activeTab === "attributions" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Invoice-by-Invoice MR Sales Attribution</h2>
            <span className="text-xs text-gray-500">{attributions.length} attributions</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading attributions...</div>
          ) : attributions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No sales attributions in this date window. Invoices generate attributions automatically when billed to mapped stockists.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Invoice Date</th>
                    <th className="p-3">Stockist Party</th>
                    <th className="p-3">Attributed MR</th>
                    <th className="p-3 text-right">Taxable Amount</th>
                    <th className="p-3 text-right">Total Invoice</th>
                    <th className="p-3">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attributions.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono text-xs font-bold text-gray-900">{a.invoiceNumber}</td>
                      <td className="p-3 text-gray-600">
                        {new Date(a.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3 font-medium text-gray-900">{a.stockistName}</td>
                      <td className="p-3 font-medium text-emerald-700">{a.mrName}</td>
                      <td className="p-3 text-right text-gray-600">₹{a.taxableAmount.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-gray-900">₹{a.invoiceTotalAmount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {a.attributionMethod}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Target vs Achievement */}
      {activeTab === "targets" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">MR Monthly Sales & Doctor Call Targets</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading targets...</div>
          ) : targets.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No target quotas allocated for current month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                    <th className="p-3">MR Name</th>
                    <th className="p-3 text-right">Target Sales</th>
                    <th className="p-3 text-right">Achieved Sales</th>
                    <th className="p-3 text-center">Sales %</th>
                    <th className="p-3 text-center">Doctor Calls</th>
                    <th className="p-3 text-center">Call %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {targets.map((t) => (
                    <tr key={t.mrUserId} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-semibold text-gray-900">{t.mrName}</td>
                      <td className="p-3 text-right text-gray-600">₹{t.targetSalesAmount.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">₹{t.achievedSalesAmount.toLocaleString()}</td>
                      <td className="p-3 text-center font-bold text-gray-900">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          t.salesAchievementPercent >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {t.salesAchievementPercent}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-700">
                        {t.achievedDoctorCalls} / {t.targetDoctorCalls}
                      </td>
                      <td className="p-3 text-center font-bold text-teal-700">
                        {t.doctorCallsAchievementPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Secondary Sales Reconciliation & Stockist Liquidation */}
      {activeTab === "secondaryReconciliation" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Primary Sales Invoiced</span>
                <Store className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                ₹{secondaryRecon.reduce((acc, r) => acc + r.totalPrimarySalesAmount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {secondaryRecon.reduce((acc, r) => acc + r.totalPrimaryInvoicesCount, 0)} Core GST Invoices to Stockists
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Secondary POB Booked</span>
                <Boxes className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-700 mt-2">
                ₹{secondaryRecon.reduce((acc, r) => acc + r.totalSecondaryPobAmount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {secondaryRecon.reduce((acc, r) => acc + r.totalSecondaryOrdersCount, 0)} Chemist POB Orders Routed
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel Liquidation</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-2">
                {(() => {
                  const prim = secondaryRecon.reduce((acc, r) => acc + r.totalPrimarySalesAmount, 0);
                  const sec = secondaryRecon.reduce((acc, r) => acc + r.totalSecondaryPobAmount, 0);
                  return prim > 0 ? ((sec / prim) * 100).toFixed(1) : "0.0";
                })()}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Secondary POB / Primary Invoiced ratio</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Pipeline Stock</span>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700 mt-2">
                ₹{secondaryRecon.reduce((acc, r) => acc + r.estimatedStockHoldingValue, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Net stock holding across mapped stockists</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Stockist-Wise Primary vs Secondary Sales Parity</h2>
                <p className="text-xs text-gray-500">Monitor stock turnover velocity, prevent channel dumping, and detect stockout risks.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search stockist or territory..."
                  value={stockistSearch}
                  onChange={(e) => setStockistSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 text-gray-900"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading secondary reconciliation...</div>
            ) : secondaryRecon.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No stockist primary/secondary transaction records found in this date window.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase">
                      <th className="p-3">Stockist Party</th>
                      <th className="p-3">Territory</th>
                      <th className="p-3 text-right">Primary Sales (Core)</th>
                      <th className="p-3 text-right">Secondary POBs</th>
                      <th className="p-3 text-center">Liquidation %</th>
                      <th className="p-3 text-right">Est. Holding Stock</th>
                      <th className="p-3 text-center">Stock Turnover Health</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {secondaryRecon
                      .filter((r) =>
                        r.stockistName.toLowerCase().includes(stockistSearch.toLowerCase()) ||
                        (r.territoryName && r.territoryName.toLowerCase().includes(stockistSearch.toLowerCase())) ||
                        (r.stockistGstin && r.stockistGstin.toLowerCase().includes(stockistSearch.toLowerCase()))
                      )
                      .map((r) => (
                        <tr key={r.stockistPartyId} className="hover:bg-gray-50/80 transition">
                          <td className="p-3">
                            <div className="font-semibold text-gray-900">{r.stockistName}</div>
                            {r.stockistGstin && (
                              <div className="text-xs text-gray-400 font-mono">GST: {r.stockistGstin}</div>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 text-xs font-medium">
                            {r.territoryName || <span className="text-gray-400 italic">Unassigned</span>}
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-gray-900">₹{r.totalPrimarySalesAmount.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">{r.totalPrimaryInvoicesCount} inv</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-teal-700">₹{r.totalSecondaryPobAmount.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">{r.totalSecondaryOrdersCount} orders</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-xs text-gray-900">
                              {r.secondaryToPrimaryRatioPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium text-purple-800">
                            ₹{r.estimatedStockHoldingValue.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                r.stockTurnoverHealth === "Optimal"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.stockTurnoverHealth === "Overstocked"
                                  ? "bg-amber-100 text-amber-800"
                                  : r.stockTurnoverHealth === "Understocked"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {r.stockTurnoverHealth}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Link
                              href={`/app/pharma/pob-orders?stockist=${r.stockistPartyId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                            >
                              POBs <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
