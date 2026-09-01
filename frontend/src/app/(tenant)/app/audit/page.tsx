"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  Building,
  Terminal,
  X,
  Calendar,
  Download,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { tenantAuditService } from "@/services/audit-services";
import { AuditLog, TenantAuditSummary } from "@/types";

export default function TenantAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<TenantAuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsRes, summaryRes] = await Promise.all([
        tenantAuditService.getAuditLogs({
          pageNumber: page,
          pageSize: 25,
          searchTerm: searchTerm || undefined,
          entityName: entityFilter || undefined,
        }),
        tenantAuditService.getAuditSummary(),
      ]);

      setLogs(logsRes.items || []);
      setTotalCount(logsRes.totalCount || 0);
      setSummary(summaryRes);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, entityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await tenantAuditService.downloadAuditLogsCsv({
        searchTerm: searchTerm || undefined,
        entityName: entityFilter || undefined,
      });
    } catch (err) {
      alert("Failed to export audit logs.");
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeColor = (actionName: string) => {
    const name = actionName.toLowerCase();
    if (name.includes("delete") || name.includes("cancel") || name.includes("revoke")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (name.includes("create") || name.includes("invoice") || name.includes("grant") || name.includes("approved")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (name.includes("update") || name.includes("edit") || name.includes("assign")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <ShieldAlert className="w-7 h-7 text-indigo-400" />
            <span>Audit Trail & Security Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable system logs tracking financial transactions, stock edits, RBAC changes, and business settings.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>{exporting ? "Exporting CSV..." : "Export Audit CSV"}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Audit Events</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {summary.totalLogs.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">System lifetime activities</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Events Today</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              {summary.logsToday}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Past 24 hours activity</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Events This Week</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
              {summary.logsThisWeek}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Past 7 days volume</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Top Active User</span>
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-white truncate mt-2">
              {summary.topActiveUsers[0]?.userEmail || "System"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {summary.topActiveUsers[0]?.actionCount || 0} operations recorded
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, email, entity ID, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Entities</option>
            <option value="SalesInvoice">Sales Invoices</option>
            <option value="PurchaseBill">Purchase Bills</option>
            <option value="Quotation">Quotations</option>
            <option value="Item">Catalog Items</option>
            <option value="StockMovement">Stock Movements</option>
            <option value="Party">Customers & Vendors</option>
            <option value="Tenant">Business Settings</option>
            <option value="User">Staff & RBAC</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
            <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading audit telemetry logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestampUtc).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold border ${getActionBadgeColor(
                          log.actionName
                        )}`}
                      >
                        {log.actionName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                      <span className="text-white font-semibold">{log.entityName}</span>
                      {log.entityId && (
                        <span className="text-[10px] text-slate-500 ml-1.5 truncate max-w-[120px] inline-block align-bottom">
                          #{log.entityId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[160px]">{log.userEmail || "System Automatic"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="View JSON Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-mono">{logs.length}</span> of{" "}
            <span className="text-white font-mono">{totalCount}</span> records
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-white px-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={logs.length < 25}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm text-white">
                  {selectedLog.actionName} — {selectedLog.entityName} Payload
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500">Timestamp:</span>{" "}
                  <span className="text-slate-300">{new Date(selectedLog.timestampUtc).toUTCString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">User:</span>{" "}
                  <span className="text-slate-300">{selectedLog.userEmail || "System"}</span>
                </div>
                <div>
                  <span className="text-slate-500">IP Address:</span>{" "}
                  <span className="text-slate-300">{selectedLog.ipAddress || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Entity ID:</span>{" "}
                  <span className="text-slate-300">{selectedLog.entityId || "—"}</span>
                </div>
              </div>

              {selectedLog.oldValuesJson && (
                <div>
                  <div className="text-[11px] font-semibold text-rose-400 mb-1.5">Previous State (Old Values)</div>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 overflow-x-auto text-[11px]">
                    {tryFormatJson(selectedLog.oldValuesJson)}
                  </pre>
                </div>
              )}

              {selectedLog.newValuesJson && (
                <div>
                  <div className="text-[11px] font-semibold text-emerald-400 mb-1.5">Committed State (New Values)</div>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px]">
                    {tryFormatJson(selectedLog.newValuesJson)}
                  </pre>
                </div>
              )}

              {!selectedLog.oldValuesJson && !selectedLog.newValuesJson && (
                <div className="py-8 text-center text-slate-500">No extended payload recorded for this operation.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function tryFormatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
