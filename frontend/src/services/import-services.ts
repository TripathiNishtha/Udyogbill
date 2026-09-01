import { apiClient } from "@/lib/api-client";

export interface BulkProductImportRow {
  sku: string;
  name: string;
  categoryName?: string;
  brandName?: string;
  hsnCode?: string;
  barcode?: string;
  primaryUom?: string;
  taxRate: number;
  cessRate: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  minimumStockAlert: number;
  reorderQuantity: number;
  openingStock: number;
  batchNumber?: string;
  expiryDate?: string;
  rackLocation?: string;
  description?: string;
}

export interface BulkImportRowError {
  rowIndex: number;
  skuOrIdentifier: string;
  errorMessage: string;
}

export interface BulkProductImportResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: BulkImportRowError[];
  createdItemIds: string[];
}

export interface BulkPartyImportRow {
  code: string;
  legalName: string;
  tradeName?: string;
  partyType: "Customer" | "Supplier" | "Both";
  gstin?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  contactPerson?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  drugLicenseNumber?: string;
  fssaiNumber?: string;
}

export interface BulkPartyImportResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: BulkImportRowError[];
  createdPartyIds: string[];
}

export const importService = {
  async importProducts(data: {
    warehouseId?: string;
    products: BulkProductImportRow[];
    overwriteExisting?: boolean;
  }): Promise<BulkProductImportResult> {
    const response = await apiClient.post<any>("/tenant/import/products", data);
    return response.data?.data ?? response.data;
  },

  async importParties(data: {
    parties: BulkPartyImportRow[];
    overwriteExisting?: boolean;
  }): Promise<BulkPartyImportResult> {
    const response = await apiClient.post<any>("/tenant/import/parties", data);
    return response.data?.data ?? response.data;
  },

  async downloadProductTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>("/tenant/import/templates/products", {
      responseType: "blob",
    });
    return response.data;
  },

  async downloadPartyTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>("/tenant/import/templates/parties", {
      responseType: "blob",
    });
    return response.data;
  },
};
