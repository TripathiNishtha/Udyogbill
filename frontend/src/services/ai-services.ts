import { apiClient } from '@/lib/api-client';

export interface AiScannedLineItem {
  itemName: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity?: number;
  unitPrice: number;
  mrp?: number;
  discountPercent?: number;
  gstRate: number;
  taxableAmount: number;
  totalAmount: number;
  confidence: number;
  isMathVerified?: boolean;
}

export interface AiPurchaseScanResponse {
  isQualityAcceptable: boolean;
  qualityWarning?: string;
  isAiAddonActive: boolean;
  scansRemaining: number;
  supplierName?: string;
  supplierGstin?: string;
  billNumber?: string;
  billDate?: string;
  totalTaxableAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  mathStatus?: string;
  items: AiScannedLineItem[];
}

export interface AiAddonStatus {
  isAiAddonActive: boolean;
  scansLimit: number;
  scansUsed: number;
  scansRemaining: number;
}

export interface DirectImportInventoryPayload {
  supplierName?: string;
  supplierGstin?: string;
  billNumber?: string;
  billDate?: string;
  branchId?: string;
  warehouseId?: string;
  items: AiScannedLineItem[];
}

export interface DirectImportInventoryResult {
  success: boolean;
  message: string;
  billId?: string;
  billNumber?: string;
  itemsImportedCount: number;
}

export const aiService = {
  async getStatus(): Promise<AiAddonStatus> {
    const response = await apiClient.get<AiAddonStatus>('/tenant/ai/status');
    return response.data;
  },

  async scanPurchaseBill(file?: File, rawOcrText?: string): Promise<AiPurchaseScanResponse> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (rawOcrText) {
      formData.append('rawOcrText', rawOcrText);
    }

    const response = await apiClient.post<AiPurchaseScanResponse>('/tenant/ai/scan-purchase-bill', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  async directImportToInventory(payload: DirectImportInventoryPayload): Promise<DirectImportInventoryResult> {
    const response = await apiClient.post<DirectImportInventoryResult>('/tenant/ai/direct-import-to-inventory', payload);
    return response.data;
  }
};
