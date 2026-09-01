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
  Calendar
} from "lucide-react";
import { superAdminService } from "@/services/super-admin-services";
import { AuditLog } from "@/types";

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params: any = { pageSize: 50 };
      if (entityFilter) params.entityName = entityFilter;
      const data = await superAdminService.getAuditLogs(params);
      setLogs(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter]);

  const getActionBadgeColor = (actionName: string) => {
    if (actionName.toLowerCase().includes("suspension") || actionName.toLowerCase().includes("failed") || actionName.toLowerCase().includes("delete")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (actionName.toLowerCase().includes("create") || actionName.toLowerCase().includes("register") || actionName.toLowerCase().includes("upgrade")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <span>Platform Audit & Security Telemetry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable trace log of all administrative actions, subscriber lifecycle events, and security access attempts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Entities</option>
            <option value="Tenant">Tenant</option>
            <option value="TenantSubscription">TenantSubscription</option>
            <option value="User">User</option>
            <option value="Industry">Industry</option>
            <option value="Plan">Plan</option>
          </select>
        </div>
        <span className="text-xs text-slate-400">
          Showing latest {logs.length} telemetry records
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Timestamp (UTC)</th>
                <th className="px-5 py-3.5 font-semibold">Action</th>
                <th className="px-5 py-3.5 font-semibold">Entity</th>
                <th className="px-5 py-3.5 font-semibold">Actor / User</th>
                <th className="px-5 py-3.5 font-semibold">IP Address</th>
                <th className="px-5 py-3.5 font-semibold text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading security audit telemetry...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestampUtc).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadgeColor(
                          log.actionName
                        )}`}
                      >
                        {log.actionName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-200">
                      {log.entityName}
                      {log.entityId && (
                        <span className="block text-[10px] font-mono text-slate-400">
                          ID: {log.entityId.substring(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-300 font-medium">{log.userEmail || "System"}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(log.oldValuesJson || log.newValuesJson) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-colors text-[11px] font-medium"
                        >
                          View Diff
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No telemetry records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <span>Audit Log Payload Details</span>
              </h3>
              <p className="text-xs text-slate-400">
                Action: {selectedLog.actionName} on {selectedLog.entityName}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {selectedLog.oldValuesJson && (
                <div className="space-y-1">
                  <span className="font-semibold text-rose-400">Previous State Payload:</span>
                  <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {selectedLog.oldValuesJson}
                  </pre>
                </div>
              )}

              {selectedLog.newValuesJson && (
                <div className="space-y-1">
                  <span className="font-semibold text-emerald-400">New State Payload:</span>
                  <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {selectedLog.newValuesJson}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
