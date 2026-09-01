import { offlineDb, OfflineInvoice, OfflineCustomer, OfflineItem } from "./offline-db";
import { syncService, SyncPushResult } from "@/services/sync-services";

export type SyncState = "online" | "offline" | "syncing" | "error";

type SyncListener = (state: {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncedAt: string | null;
}) => void;

class SyncManager {
  private isOnline: boolean = true;
  private syncState: SyncState = "online";
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private syncIntervalId: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine;
      this.syncState = this.isOnline ? "online" : "offline";

      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));

      // Periodic auto-sync worker every 30 seconds when online
      this.syncIntervalId = setInterval(() => {
        if (this.isOnline && this.syncState !== "syncing") {
          this.triggerSync();
        }
      }, 30000);

      this.refreshPendingCount();
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(specificListener?: SyncListener) {
    const payload = {
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    };

    if (specificListener) {
      specificListener(payload);
    } else {
      this.listeners.forEach((l) => l(payload));
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.syncState = online ? "online" : "offline";
    this.notify();

    if (online) {
      this.triggerSync();
    }
  }

  async refreshPendingCount(): Promise<number> {
    try {
      const pending = await offlineDb.getPendingInvoices();
      this.pendingCount = pending.length;
      this.notify();
      return this.pendingCount;
    } catch {
      return 0;
    }
  }

  /**
   * Save a newly created bill/invoice into IndexedDB.
   * If online, immediately attempts background sync.
   */
  async recordInvoice(invoice: OfflineInvoice): Promise<void> {
    await offlineDb.saveOfflineInvoice(invoice);
    await this.refreshPendingCount();

    if (this.isOnline) {
      this.triggerSync();
    }
  }

  /**
   * Triggers full background sync:
   * 1. Pushes pending offline invoices & customers to backend.
   * 2. Pulls delta changes of catalog items & customers from backend to local IndexedDB.
   */
  async triggerSync(): Promise<SyncPushResult | null> {
    if (!this.isOnline) {
      this.syncState = "offline";
      this.notify();
      return null;
    }

    try {
      this.syncState = "syncing";
      this.notify();

      // 1. Fetch pending outbox records
      const pendingInvoices = await offlineDb.getPendingInvoices();
      let pushResult: SyncPushResult | null = null;

      if (pendingInvoices.length > 0) {
        // Mark as syncing in local DB
        for (const inv of pendingInvoices) {
          await offlineDb.updateInvoiceStatus(inv.clientOfflineId, "syncing");
        }

        // Push to server
        pushResult = await syncService.pushOfflineData({
          invoices: pendingInvoices,
          customers: [],
        });

        // Mark synced items in local DB
        if (pushResult && pushResult.syncedInvoices) {
          for (const synced of pushResult.syncedInvoices) {
            await offlineDb.updateInvoiceStatus(synced.clientOfflineId, "synced");
          }
        }
      }

      // 2. Pull delta updates for local cache
      const lastPullTime = await offlineDb.getMeta("lastPullTimeUtc");
      const pullResult = await syncService.pullDeltaData(lastPullTime || undefined);

      if (pullResult) {
        if (pullResult.updatedItems && pullResult.updatedItems.length > 0) {
          await offlineDb.saveCatalogItems(pullResult.updatedItems);
        }
        if (pullResult.updatedCustomers && pullResult.updatedCustomers.length > 0) {
          await offlineDb.saveCustomers(pullResult.updatedCustomers);
        }
        await offlineDb.setMeta("lastPullTimeUtc", pullResult.serverTimestampUtc);
      }

      this.lastSyncedAt = new Date().toLocaleTimeString();
      this.syncState = "online";
      await this.refreshPendingCount();
      return pushResult;
    } catch (err: any) {
      console.warn("Background sync error (will retry automatically):", err);
      this.syncState = "error";
      this.notify();
      return null;
    }
  }

  /**
   * Seed / Prime local database with fresh full catalog from backend.
   */
  async seedLocalCache(): Promise<{ itemsCount: number; customersCount: number }> {
    try {
      const pullResult = await syncService.pullDeltaData();
      if (pullResult.updatedItems) {
        await offlineDb.saveCatalogItems(pullResult.updatedItems);
      }
      if (pullResult.updatedCustomers) {
        await offlineDb.saveCustomers(pullResult.updatedCustomers);
      }
      await offlineDb.setMeta("lastPullTimeUtc", pullResult.serverTimestampUtc);

      return {
        itemsCount: pullResult.updatedItems?.length || 0,
        customersCount: pullResult.updatedCustomers?.length || 0,
      };
    } catch (err) {
      console.error("Failed to seed local cache:", err);
      throw err;
    }
  }
}

export const syncManager = new SyncManager();
