export interface StockTransferItem {
  itemId: string;
  itemName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  transferQuantity: number;
  receivedQuantity?: number;
  uom: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  transferDate: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: "Draft" | "Dispatched" | "InTransit" | "Received" | "PartiallyReceived" | "Cancelled";
  vehicleNumber?: string;
  driverName?: string;
  dispatchDate?: string;
  receivedDate?: string;
  notes?: string;
  items: StockTransferItem[];
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  warehouseId: string;
  warehouseName: string;
  adjustmentType: "PhysicalCount" | "Damaged" | "Expired" | "Wastage" | "InternalUse" | "Found";
  status: "Draft" | "Approved" | "Posted";
  items: {
    itemId: string;
    itemName: string;
    sku: string;
    batchNumber: string;
    systemStock: number;
    physicalStock: number;
    varianceQuantity: number;
    unitCost: number;
    varianceValue: number;
    reason: string;
  }[];
  totalVarianceValue: number;
  approvedBy?: string;
  createdAt: string;
}

export interface ReorderAlertItem {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderQuantity: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  lastPurchaseRate: number;
  estimatedPoAmount: number;
  urgency: "Critical" | "Low" | "Optimal";
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  challanDate: string;
  salesOrderId?: string;
  customerId: string;
  customerName: string;
  shippingAddress: string;
  vehicleNumber: string;
  transporterName?: string;
  lrNumber?: string; // Lorry Receipt Number
  status: "Draft" | "Dispatched" | "Delivered" | "Invoiced";
  totalPackages: number;
  items: {
    itemId: string;
    itemName: string;
    sku: string;
    batchNumber: string;
    expiryDate: string;
    dispatchQuantity: number;
    uom: string;
  }[];
}

export interface SalesReturnCreditNote {
  id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  reason: "Defective" | "Expired" | "CustomerCancelled" | "RateDifference" | "WrongItem";
  restockInInventory: boolean;
  warehouseId: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  items: {
    itemId: string;
    itemName: string;
    batchNumber: string;
    returnQuantity: number;
    rate: number;
    gstRate: number;
    amount: number;
  }[];
}

export interface PurchaseReturnDebitNote {
  id: string;
  debitNoteNumber: string;
  debitNoteDate: string;
  originalBillNumber: string;
  supplierId: string;
  supplierName: string;
  reason: "DamagedGoods" | "NearExpiryDumping" | "ExcessSupply" | "PriceDiscrepancy" | "QualityRejected";
  warehouseId: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  items: {
    itemId: string;
    itemName: string;
    batchNumber: string;
    returnQuantity: number;
    rate: number;
    gstRate: number;
    amount: number;
  }[];
}

const DEFAULT_TRANSFERS: StockTransfer[] = [
  {
    id: "stn-1",
    transferNumber: "STN-2026-0041",
    transferDate: "2026-08-28",
    sourceWarehouseId: "wh-1",
    sourceWarehouseName: "Main Central Godown",
    destinationWarehouseId: "wh-2",
    destinationWarehouseName: "Retail Storefront Counter",
    status: "Received",
    vehicleNumber: "DL-01-AB-4491",
    driverName: "Ramesh Sharma",
    dispatchDate: "2026-08-28T09:00:00Z",
    receivedDate: "2026-08-28T14:30:00Z",
    notes: "Regular morning stock replenishment for frontline counter",
    items: [
      { itemId: "item-1", itemName: "Augmentin 625 Duo Tablet", sku: "AUG-625", batchNumber: "BAT-2608-696", expiryDate: "08/28", transferQuantity: 50, receivedQuantity: 50, uom: "STP" },
      { itemId: "item-2", itemName: "Pan 40 Tablet", sku: "PAN-40", batchNumber: "BAT-2608-112", expiryDate: "11/27", transferQuantity: 100, receivedQuantity: 100, uom: "STP" }
    ]
  },
  {
    id: "stn-2",
    transferNumber: "STN-2026-0042",
    transferDate: "2026-08-30",
    sourceWarehouseId: "wh-1",
    sourceWarehouseName: "Main Central Godown",
    destinationWarehouseId: "wh-3",
    destinationWarehouseName: "North Delhi Branch Warehouse",
    status: "InTransit",
    vehicleNumber: "DL-04-E-8820",
    driverName: "Sanjay Verma",
    dispatchDate: "2026-08-30T16:00:00Z",
    notes: "Inter-city branch transit",
    items: [
      { itemId: "item-3", itemName: "Azithromycin 500mg Tablet", sku: "AZI-500", batchNumber: "AZ-2026-09", expiryDate: "10/28", transferQuantity: 120, uom: "STP" }
    ]
  }
];

const DEFAULT_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: "adj-1",
    adjustmentNumber: "ADJ-2026-001",
    adjustmentDate: "2026-08-27",
    warehouseId: "wh-1",
    warehouseName: "Main Central Godown",
    adjustmentType: "PhysicalCount",
    status: "Approved",
    approvedBy: "Store Manager",
    totalVarianceValue: -450,
    createdAt: "2026-08-27T18:00:00Z",
    items: [
      {
        itemId: "item-1",
        itemName: "Augmentin 625 Duo Tablet",
        sku: "AUG-625",
        batchNumber: "BAT-2608-696",
        systemStock: 105,
        physicalStock: 95,
        varianceQuantity: -10,
        unitCost: 45,
        varianceValue: -450,
        reason: "Breakage during packing"
      }
    ]
  }
];

const DEFAULT_CHALLANS: DeliveryChallan[] = [
  {
    id: "dc-1",
    challanNumber: "DC-2026-0019",
    challanDate: "2026-08-30",
    customerId: "cust-1",
    customerName: "Apollo Pharmacy Retail",
    shippingAddress: "Shop 14, Ring Road Market, New Delhi",
    vehicleNumber: "DL-1V-9921",
    transporterName: "Local Courier Express",
    lrNumber: "LR-88291",
    status: "Dispatched",
    totalPackages: 4,
    items: [
      { itemId: "item-1", itemName: "Augmentin 625 Duo Tablet", sku: "AUG-625", batchNumber: "BAT-2608-696", expiryDate: "08/28", dispatchQuantity: 30, uom: "STP" }
    ]
  }
];

const DEFAULT_PURCHASE_RETURNS: PurchaseReturnDebitNote[] = [
  {
    id: "pr-1",
    debitNoteNumber: "DN-2026-001",
    debitNoteDate: "2026-08-29",
    originalBillNumber: "BILL-2026-0001",
    supplierId: "sup-1",
    supplierName: "Sun Pharma Distributors Ltd",
    reason: "DamagedGoods",
    warehouseId: "wh-1",
    taxableAmount: 900,
    gstAmount: 108,
    totalAmount: 1008,
    items: [
      { itemId: "item-1", itemName: "Augmentin 625 Duo Tablet", batchNumber: "BAT-2608-696", returnQuantity: 20, rate: 45, gstRate: 12, amount: 1008 }
    ]
  }
];

const DEFAULT_SALES_RETURNS: SalesReturnCreditNote[] = [
  {
    id: "sr-1",
    creditNoteNumber: "CN-2026-001",
    creditNoteDate: "2026-08-30",
    originalInvoiceNumber: "INV-2026-0045",
    customerId: "cust-1",
    customerName: "Apollo Pharmacy Retail",
    reason: "CustomerCancelled",
    restockInInventory: true,
    warehouseId: "wh-1",
    taxableAmount: 1200,
    gstAmount: 144,
    totalAmount: 1344,
    items: [
      { itemId: "item-1", itemName: "Augmentin 625 Duo Tablet", batchNumber: "BAT-2608-696", returnQuantity: 15, rate: 80, gstRate: 12, amount: 1344 }
    ]
  }
];

class WmsService {
  private getStorageKey(key: string): string {
    return `udyogbill_wms_${key}`;
  }

  // Stock Transfers (STN)
  public async getTransfers(): Promise<StockTransfer[]> {
    try {
      const data = localStorage.getItem(this.getStorageKey("transfers"));
      if (data) return JSON.parse(data);
      localStorage.setItem(this.getStorageKey("transfers"), JSON.stringify(DEFAULT_TRANSFERS));
      return DEFAULT_TRANSFERS;
    } catch {
      return DEFAULT_TRANSFERS;
    }
  }

  public async createTransfer(transfer: Omit<StockTransfer, "id" | "transferNumber">): Promise<StockTransfer> {
    const list = await this.getTransfers();
    const newRecord: StockTransfer = {
      ...transfer,
      id: "stn-" + Date.now(),
      transferNumber: `STN-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, "0")}`
    };
    list.unshift(newRecord);
    localStorage.setItem(this.getStorageKey("transfers"), JSON.stringify(list));
    return newRecord;
  }

  public async updateTransferStatus(id: string, status: StockTransfer["status"]): Promise<void> {
    const list = await this.getTransfers();
    const item = list.find((t) => t.id === id);
    if (item) {
      item.status = status;
      if (status === "Received") {
        item.receivedDate = new Date().toISOString();
      }
      localStorage.setItem(this.getStorageKey("transfers"), JSON.stringify(list));
    }
  }

  // Stock Adjustments
  public async getAdjustments(): Promise<StockAdjustment[]> {
    try {
      const data = localStorage.getItem(this.getStorageKey("adjustments"));
      if (data) return JSON.parse(data);
      localStorage.setItem(this.getStorageKey("adjustments"), JSON.stringify(DEFAULT_ADJUSTMENTS));
      return DEFAULT_ADJUSTMENTS;
    } catch {
      return DEFAULT_ADJUSTMENTS;
    }
  }

  public async createAdjustment(adj: Omit<StockAdjustment, "id" | "adjustmentNumber" | "createdAt">): Promise<StockAdjustment> {
    const list = await this.getAdjustments();
    const newRecord: StockAdjustment = {
      ...adj,
      id: "adj-" + Date.now(),
      adjustmentNumber: `ADJ-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newRecord);
    localStorage.setItem(this.getStorageKey("adjustments"), JSON.stringify(list));
    return newRecord;
  }

  // Re-order Level Analytics
  public async getReorderAlerts(): Promise<ReorderAlertItem[]> {
    return [
      {
        itemId: "item-1",
        itemName: "Augmentin 625 Duo Tablet",
        sku: "AUG-625",
        category: "Antibiotics",
        currentStock: 12,
        minStockLevel: 25,
        maxStockLevel: 100,
        reorderQuantity: 80,
        preferredSupplierId: "sup-1",
        preferredSupplierName: "Sun Pharma Distributors Ltd",
        lastPurchaseRate: 45,
        estimatedPoAmount: 3600,
        urgency: "Critical"
      },
      {
        itemId: "item-2",
        itemName: "Pan 40 Tablet",
        sku: "PAN-40",
        category: "Gastrointestinal",
        currentStock: 35,
        minStockLevel: 50,
        maxStockLevel: 200,
        reorderQuantity: 150,
        preferredSupplierId: "sup-2",
        preferredSupplierName: "Alkem Healthcare Agency",
        lastPurchaseRate: 32,
        estimatedPoAmount: 4800,
        urgency: "Low"
      },
      {
        itemId: "item-3",
        itemName: "Azithromycin 500mg Tablet",
        sku: "AZI-500",
        category: "Antibiotics",
        currentStock: 8,
        minStockLevel: 30,
        maxStockLevel: 120,
        reorderQuantity: 100,
        preferredSupplierId: "sup-1",
        preferredSupplierName: "Sun Pharma Distributors Ltd",
        lastPurchaseRate: 65,
        estimatedPoAmount: 6500,
        urgency: "Critical"
      }
    ];
  }

  // Delivery Challans
  public async getDeliveryChallans(): Promise<DeliveryChallan[]> {
    try {
      const data = localStorage.getItem(this.getStorageKey("challans"));
      if (data) return JSON.parse(data);
      localStorage.setItem(this.getStorageKey("challans"), JSON.stringify(DEFAULT_CHALLANS));
      return DEFAULT_CHALLANS;
    } catch {
      return DEFAULT_CHALLANS;
    }
  }

  public async createDeliveryChallan(challan: Omit<DeliveryChallan, "id" | "challanNumber">): Promise<DeliveryChallan> {
    const list = await this.getDeliveryChallans();
    const newRecord: DeliveryChallan = {
      ...challan,
      id: "dc-" + Date.now(),
      challanNumber: `DC-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, "0")}`
    };
    list.unshift(newRecord);
    localStorage.setItem(this.getStorageKey("challans"), JSON.stringify(list));
    return newRecord;
  }

  // Purchase Returns / Debit Notes
  public async getPurchaseReturns(): Promise<PurchaseReturnDebitNote[]> {
    try {
      const data = localStorage.getItem(this.getStorageKey("purch_returns"));
      if (data) return JSON.parse(data);
      localStorage.setItem(this.getStorageKey("purch_returns"), JSON.stringify(DEFAULT_PURCHASE_RETURNS));
      return DEFAULT_PURCHASE_RETURNS;
    } catch {
      return DEFAULT_PURCHASE_RETURNS;
    }
  }

  public async createPurchaseReturn(ret: Omit<PurchaseReturnDebitNote, "id" | "debitNoteNumber">): Promise<PurchaseReturnDebitNote> {
    const list = await this.getPurchaseReturns();
    const newRecord: PurchaseReturnDebitNote = {
      ...ret,
      id: "dn-" + Date.now(),
      debitNoteNumber: `DN-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`
    };
    list.unshift(newRecord);
    localStorage.setItem(this.getStorageKey("purch_returns"), JSON.stringify(list));
    return newRecord;
  }

  // Sales Returns / Credit Notes
  public async getSalesReturns(): Promise<SalesReturnCreditNote[]> {
    try {
      const data = localStorage.getItem(this.getStorageKey("sales_returns"));
      if (data) return JSON.parse(data);
      localStorage.setItem(this.getStorageKey("sales_returns"), JSON.stringify(DEFAULT_SALES_RETURNS));
      return DEFAULT_SALES_RETURNS;
    } catch {
      return DEFAULT_SALES_RETURNS;
    }
  }

  public async createSalesReturn(ret: Omit<SalesReturnCreditNote, "id" | "creditNoteNumber">): Promise<SalesReturnCreditNote> {
    const list = await this.getSalesReturns();
    const newRecord: SalesReturnCreditNote = {
      ...ret,
      id: "cn-" + Date.now(),
      creditNoteNumber: `CN-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, "0")}`
    };
    list.unshift(newRecord);
    localStorage.setItem(this.getStorageKey("sales_returns"), JSON.stringify(list));
    return newRecord;
  }
}

export const wmsService = new WmsService();
