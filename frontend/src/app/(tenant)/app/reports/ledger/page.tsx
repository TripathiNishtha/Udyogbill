"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { reportService, PagedResult } from "@/services/report-services";
import { partyService } from "@/services/party-services";
import { ReportLedgerEntry, ReportLedgerStatement, PartyList } from "@/types";

export default function LedgerReportsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [parties, setParties] = useState<PartyList[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [statement, setStatement] = useState<ReportLedgerStatement | null>(null);
  const [generalEntries, setGeneralEntries] = useState<ReportLedgerEntry[]>([]);

  useEffect(() => {
    partyService
      .getCustomers({ pageSize: 100 })
      .then((res) => setParties(res.items || []))
      .catch(() => {});
  }, []);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      if (selectedPartyId) {
        const st = await reportService.getLedgerStatement(selectedPartyId, fromDate, toDate);
        setStatement(st);
        setGeneralEntries([]);
      } else {
        const res = await reportService.getLedgerEntries({ fromDate, toDate, pageSize: 100 });
        setGeneralEntries(res.items || []);
        setStatement(null);
      }
    } catch (err) {
      console.error("Failed to fetch ledger data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, [selectedPartyId, fromDate, toDate]);

  const handleExportCsv = async () => {
    try {
      await reportService.downloadLedgerCsv(selectedPartyId || undefined, fromDate, toDate);
    } catch (err) {
      alert("Failed to export CSV");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <span>General & Party Ledger</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete audit statement of account with opening balances, debits, credits, and running positions.
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Party Selector */}
        <div className="flex items-center space-x-3 min-w-[280px]">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Parties (General Ledger)</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.legalName} ({p.code}) {p.gstin ? `- ${p.gstin}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          />
          <span className="text-slate-500 text-xs font-semibold">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={loadLedgerData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Statement Header Card (When party selected) */}
      {statement && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div>
            <div className="text-xs text-slate-400 font-semibold">PARTY / CUSTOMER</div>
            <div className="text-sm font-bold text-white mt-1">{statement.partyName}</div>
            <div className="text-[11px] text-indigo-400 mt-0.5">GSTIN: {statement.partyGSTIN || "Unregistered"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">OPENING BALANCE</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              ₹{statement.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500">As of {statement.fromDate.slice(0, 10)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">PERIOD TRANSACTIONS</div>
            <div className="text-xs font-medium text-emerald-400 mt-1">
              + Total Debit: ₹{statement.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-medium text-rose-400 mt-0.5">
              - Total Credit: ₹{statement.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">CLOSING NET POSITION</div>
            <div
              className={`text-lg font-black mt-1 ${
                statement.closingBalance >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ₹{Math.abs(statement.closingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <span className="text-xs ml-1 font-semibold">
                {statement.closingBalance >= 0 ? "(Dr / Receivable)" : "(Cr / Payable)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                {!selectedPartyId && <th className="py-3.5 px-4">Party</th>}
                <th className="py-3.5 px-4">Doc Type & Ref #</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4 text-right text-emerald-400">Debit (₹)</th>
                <th className="py-3.5 px-4 text-right text-rose-400">Credit (₹)</th>
                <th className="py-3.5 px-4 text-right text-white">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading ledger transactions...
                  </td>
                </tr>
              ) : (statement ? statement.entries : generalEntries).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No ledger entries found for the selected period.
                  </td>
                </tr>
              ) : (
                (statement ? statement.entries : generalEntries).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(entry.transactionDate).toLocaleDateString("en-IN")}
                    </td>
                    {!selectedPartyId && (
                      <td className="py-3 px-4 font-semibold text-white">
                        {entry.partyName || "General"}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{entry.referenceDocumentNumber || "-"}</div>
                      <div className="text-[10px] text-slate-500">{entry.referenceDocumentType}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={entry.description}>
                      {entry.description || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300">
                        {entry.paymentMode || "System"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      {entry.debit > 0 ? `₹${entry.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-rose-400">
                      {entry.credit > 0 ? `₹${entry.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{entry.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
