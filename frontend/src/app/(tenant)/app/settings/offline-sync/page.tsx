"use client";

import { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CloudUpload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Layers,
  ArrowRight,
  Eye,
  Check,
} from "lucide-react";
import { syncManager, SyncState } from "@/lib/sync-manager";
import { offlineDb, OfflineInvoice, OfflineItem, OfflineCustomer } from "@/lib/offline-db";
import { syncService, SyncStatus } from "@/services/sync-services";

export default function OfflineSyncHubPage() {
  const [networkStatus, setNetworkStatus] = useState<{
    isOnline: boolean;
    syncState: SyncState;
    pendingCount: number;
    lastSyncedAt: string | null;
  }>({
    isOnline: true,
    syncState: "online",
    pendingCount: 0,
    lastSyncedAt: null,
  });

  const [outboxInvoices, setOutboxInvoices] = useState<OfflineInvoice[]>([]);
  const [cachedItemsCount, setCachedItemsCount] = useState(0);
  const [cachedCustomersCount, setCachedCustomersCount] = useState(0);
  const [lastPullTime, setLastPullTime] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");

  const refreshAll = async () => {
    try {
      setLoading(true);
      const invoices = await offlineDb.getAllOutboxInvoices();
      setOutboxInvoices(invoices.reverse());

      const items = await offlineDb.getCatalogItems();
      setCachedItemsCount(items.length);

      const custs = await offlineDb.getCustomers();
      setCachedCustomersCount(custs.length);

      const metaPull = await offlineDb.getMeta("lastPullTimeUtc");
      setLastPullTime(metaPull);

      if (navigator.onLine) {
        const sStatus = await syncService.getSyncStatus();
        setServerStatus(sStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const unsub = syncManager.subscribe((state) => {
      setNetworkStatus(state);
    });
    return () => unsub();
  }, []);

  const handleManualSyncNow = async () => {
    try {
      setLoading(true);
      const res = await syncManager.triggerSync();
      if (res) {
        setNotification(`Successfully synced ${res.totalSyncedCount} offline records to cloud!`);
      } else {
        setNotification("Sync completed. Local cache is fully up to date.");
      }
      await refreshAll();
    } catch {
      alert("Sync failed. Please verify network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedCache = async () => {
    try {
      setLoading(true);
      const res = await syncManager.seedLocalCache();
      setNotification(`Downloaded ${res.itemsCount} catalog products & ${res.customersCount} customer records to local browser cache!`);
      await refreshAll();
    } catch {
      alert("Failed to download catalog cache.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportOfflineBackup = async () => {
    const all = await offlineDb.getAllOutboxInvoices();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UdyogBill_Offline_Bills_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Database className="w-7 h-7 text-indigo-400" />
            <span>Offline-First Engine & Automatic Cloud Sync</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Zero-downtime billing with local browser IndexedDB cache. Bills generated without internet automatically synchronize to cloud servers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportOfflineBackup}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Offline Backup</span>
          </button>
          <button
            onClick={handleManualSyncNow}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Now with Cloud</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Connectivity & Health Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Network State</span>
            {networkStatus.isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
          </div>
          <div className="text-xl font-bold text-white flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                networkStatus.isOnline ? "bg-emerald-500" : "bg-amber-500 animate-ping"
              }`}
            />
            <span>{networkStatus.isOnline ? "Online (Connected)" : "Offline Mode"}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {networkStatus.isOnline ? "Auto-sync is running in background." : "Bills are securely stored in local storage."}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Outbox</span>
            <CloudUpload className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{networkStatus.pendingCount} Bills</div>
          <div className="text-[11px] text-slate-500">Unsynced offline transactions</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Local Product Cache</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{cachedItemsCount} Items</div>
          <div className="text-[11px] text-slate-500">IndexedDB local catalog cache</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Local Customers</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{cachedCustomersCount} Parties</div>
          <div className="text-[11px] text-slate-500">Available for offline customer search</div>
        </div>
      </div>

      {/* Cache Refresh Action Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Download / Refresh Local Product & Customer Directory</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Syncs full product pricing, barcode catalog, and debtor balances into browser memory so checkout works instantly without lag.
            </p>
          </div>
        </div>
        <button
          onClick={handleSeedCache}
          disabled={loading || !networkStatus.isOnline}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          Download Latest Catalog Cache
        </button>
      </div>

      {/* Outbox & Offline Bills Table */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <CloudUpload className="w-4 h-4 text-indigo-400" />
            <span>Offline & Local Bills Queue ({outboxInvoices.length})</span>
          </h2>
          <button
            onClick={refreshAll}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {outboxInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <span>All local bills are 100% synchronized with the cloud! No pending outbox items.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-850 text-slate-400 font-semibold">
                  <th className="pb-3">Invoice Number / Local UUID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3 text-right">Items</th>
                  <th className="pb-3 text-right">Amount (₹)</th>
                  <th className="pb-3">Sync Status</th>
                  <th className="pb-3">Time Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {outboxInvoices.map((inv) => (
                  <tr key={inv.clientOfflineId} className="hover:bg-slate-900/30">
                    <td className="py-3.5 font-mono text-white">
                      <div className="font-semibold">{inv.offlineInvoiceNumber}</div>
                      <div className="text-[10px] text-slate-500">{inv.clientOfflineId}</div>
                    </td>
                    <td className="py-3.5 font-medium text-slate-300">{inv.customerName}</td>
                    <td className="py-3.5 text-right text-slate-400">{inv.items.length}</td>
                    <td className="py-3.5 text-right font-bold text-white">₹{inv.totalAmount.toFixed(2)}</td>
                    <td className="py-3.5">
                      {inv.syncStatus === "synced" ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          <span>Cloud Synced</span>
                        </span>
                      ) : inv.syncStatus === "syncing" ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Stored Locally</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(inv.createdAtUtc || inv.invoiceDateUtc).toLocaleTimeString()}
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
