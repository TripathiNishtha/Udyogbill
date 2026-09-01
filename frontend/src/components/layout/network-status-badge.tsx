"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { syncManager, SyncState } from "@/lib/sync-manager";
import Link from "next/link";

export function NetworkStatusBadge() {
  const [status, setStatus] = useState<{
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

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setStatus(state);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await syncManager.triggerSync();
  };

  if (!status.isOnline) {
    return (
      <Link
        href="/app/settings/offline-sync"
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all"
        title="Offline Mode Active - Bills saved locally in browser storage"
      >
        <WifiOff className="w-3.5 h-3.5 animate-pulse" />
        <span>Offline Mode ({status.pendingCount} local)</span>
      </Link>
    );
  }

  if (status.syncState === "syncing") {
    return (
      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing Data...</span>
      </div>
    );
  }

  if (status.pendingCount > 0) {
    return (
      <button
        onClick={handleManualSync}
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all"
        title="Click to sync local offline bills to cloud"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>{status.pendingCount} Unsynced Bills</span>
        <RefreshCw className="w-3 h-3 ml-1 opacity-70 hover:opacity-100" />
      </button>
    );
  }

  return (
    <Link
      href="/app/settings/offline-sync"
      className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/15 transition-all"
      title={status.lastSyncedAt ? `Auto-Synced at ${status.lastSyncedAt}` : "Cloud Synced & Online"}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>Online (Synced)</span>
    </Link>
  );
}
