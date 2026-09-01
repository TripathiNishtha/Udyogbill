import { apiClient } from "@/lib/api-client";
import { OfflineInvoice, OfflineCustomer, OfflineItem } from "@/lib/offline-db";

export interface SyncPushResult {
  syncedInvoices: {
    clientOfflineId: string;
    serverId: string;
    serverAssignedNumber: string;
    status: string;
    message?: string;
  }[];
  syncedCustomers: {
    clientOfflineId: string;
    serverId: string;
    serverAssignedNumber: string;
    status: string;
  }[];
  totalSyncedCount: number;
  syncedAtUtc: string;
}

export interface SyncPullResult {
  updatedItems: OfflineItem[];
  updatedCustomers: OfflineCustomer[];
  serverTimestampUtc: string;
}

export interface SyncStatus {
  serverTimeUtc: string;
  totalCatalogItems: number;
  totalCustomers: number;
  totalInvoices: number;
  isHealthy: boolean;
}

export const syncService = {
  async pushOfflineData(payload: {
    invoices: OfflineInvoice[];
    customers: OfflineCustomer[];
  }): Promise<SyncPushResult> {
    const response = await apiClient.post<SyncPushResult>("/tenant/sync/push", payload);
    return response.data;
  },

  async pullDeltaData(lastSyncTimestampUtc?: string): Promise<SyncPullResult> {
    const response = await apiClient.post<SyncPullResult>("/tenant/sync/pull", {
      lastSyncTimestampUtc,
    });
    return response.data;
  },

  async getSyncStatus(): Promise<SyncStatus> {
    const response = await apiClient.get<SyncStatus>("/tenant/sync/status");
    return response.data;
  },
};
