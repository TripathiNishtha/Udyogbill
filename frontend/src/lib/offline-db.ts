/**
 * UdyogBill - Browser IndexedDB Local Offline Database
 * Provides robust offline storage for products, customers, and pending invoice queues.
 */

export interface OfflineItem {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  hsnCode?: string;
  sellingPrice: number;
  mrp: number;
  taxRatePercent: number;
  currentStock: number;
  unitName?: string;
  isActive: boolean;
  updatedAtUtc: string;
}

export interface OfflineCustomer {
  id: string;
  legalName: string;
  phone?: string;
  gstin?: string;
  currentBalance: number;
  isActive: boolean;
  updatedAtUtc: string;
}

export interface OfflineInvoiceItem {
  itemId?: string;
  itemSku: string;
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface OfflineInvoice {
  clientOfflineId: string;
  offlineInvoiceNumber: string;
  invoiceDateUtc: string;
  partyId?: string;
  customerName: string;
  customerGSTIN?: string;
  customerPhone?: string;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMode: number;
  paymentStatus: number;
  notes?: string;
  items: OfflineInvoiceItem[];
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncError?: string;
  createdAtUtc: string;
}

export function getActiveTenantOfflineId(): string {
  if (typeof window === "undefined") return "default";
  try {
    const impStr = localStorage.getItem("udyogbill_impersonating");
    if (impStr) {
      const imp = JSON.parse(impStr);
      const tid = imp.tenantId || imp.id;
      if (tid) return String(tid);
    }
    const userStr = localStorage.getItem("udyogbill_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      const tid = u.tenantId;
      if (tid) return String(tid);
    }
  } catch {}
  return "default";
}

function getTenantDbName(): string {
  const tid = getActiveTenantOfflineId();
  return `UdyogBill_Offline_DB_${tid}`;
}

const DB_VERSION = 1;

class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private currentDbName: string | null = null;

  async init(): Promise<IDBDatabase> {
    const targetDbName = getTenantDbName();

    if (this.db && this.currentDbName === targetDbName) {
      return this.db;
    }

    if (this.db && this.currentDbName !== targetDbName) {
      try {
        this.db.close();
      } catch {}
      this.db = null;
    }

    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDB is not supported in this environment.");
    }

    // Try deleting obsolete non-isolated database if present
    try {
      if (typeof window !== "undefined" && window.indexedDB && (indexedDB as any).databases) {
        (indexedDB as any).databases().then((dbs: any[]) => {
          if (dbs && dbs.some((d) => d.name === "UdyogBill_Offline_DB")) {
            indexedDB.deleteDatabase("UdyogBill_Offline_DB");
          }
        }).catch(() => {});
      }
    } catch {}

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(targetDbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Catalog Items Store
        if (!db.objectStoreNames.contains("catalog_items")) {
          const itemStore = db.createObjectStore("catalog_items", { keyPath: "id" });
          itemStore.createIndex("sku", "sku", { unique: false });
          itemStore.createIndex("barcode", "barcode", { unique: false });
          itemStore.createIndex("name", "name", { unique: false });
        }

        // 2. Customers / Parties Store
        if (!db.objectStoreNames.contains("parties")) {
          const partyStore = db.createObjectStore("parties", { keyPath: "id" });
          partyStore.createIndex("legalName", "legalName", { unique: false });
          partyStore.createIndex("phone", "phone", { unique: false });
        }

        // 3. Outbox Invoices Store
        if (!db.objectStoreNames.contains("outbox_invoices")) {
          const outboxStore = db.createObjectStore("outbox_invoices", { keyPath: "clientOfflineId" });
          outboxStore.createIndex("syncStatus", "syncStatus", { unique: false });
          outboxStore.createIndex("createdAtUtc", "createdAtUtc", { unique: false });
        }

        // 4. Sync Metadata Store
        if (!db.objectStoreNames.contains("sync_meta")) {
          db.createObjectStore("sync_meta", { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.currentDbName = targetDbName;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // --- Catalog Items ---
  async saveCatalogItems(items: OfflineItem[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("catalog_items", "readwrite");
      const store = tx.objectStore("catalog_items");
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCatalogItems(): Promise<OfflineItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("catalog_items", "readonly");
      const store = tx.objectStore("catalog_items");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Parties / Customers ---
  async saveCustomers(customers: OfflineCustomer[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("parties", "readwrite");
      const store = tx.objectStore("parties");
      customers.forEach((cust) => store.put(cust));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCustomers(): Promise<OfflineCustomer[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("parties", "readonly");
      const store = tx.objectStore("parties");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Outbox Invoices ---
  async saveOfflineInvoice(invoice: OfflineInvoice): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("outbox_invoices", "readwrite");
      const store = tx.objectStore("outbox_invoices");
      store.put(invoice);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingInvoices(): Promise<OfflineInvoice[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("outbox_invoices", "readonly");
      const store = tx.objectStore("outbox_invoices");
      const req = store.getAll();
      req.onsuccess = () => {
        const all: OfflineInvoice[] = req.result || [];
        const pending = all.filter((inv) => inv.syncStatus === "pending" || inv.syncStatus === "failed");
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllOutboxInvoices(): Promise<OfflineInvoice[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("outbox_invoices", "readonly");
      const store = tx.objectStore("outbox_invoices");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async updateInvoiceStatus(clientOfflineId: string, status: "pending" | "syncing" | "synced" | "failed", error?: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("outbox_invoices", "readwrite");
      const store = tx.objectStore("outbox_invoices");
      const getReq = store.get(clientOfflineId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const inv: OfflineInvoice = getReq.result;
          inv.syncStatus = status;
          if (error) inv.syncError = error;
          store.put(inv);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Meta ---
  async setMeta(key: string, value: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_meta", "readwrite");
      const store = tx.objectStore("sync_meta");
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMeta(key: string): Promise<string | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sync_meta", "readonly");
      const store = tx.objectStore("sync_meta");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllLocalData(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["catalog_items", "parties", "outbox_invoices", "sync_meta"], "readwrite");
      tx.objectStore("catalog_items").clear();
      tx.objectStore("parties").clear();
      tx.objectStore("outbox_invoices").clear();
      tx.objectStore("sync_meta").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearCatalogCache(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["catalog_items", "parties", "sync_meta"], "readwrite");
      tx.objectStore("catalog_items").clear();
      tx.objectStore("parties").clear();
      tx.objectStore("sync_meta").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineDb = new OfflineDatabase();
