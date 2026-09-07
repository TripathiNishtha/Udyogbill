import { apiClient } from '@/lib/api-client';

export interface AiScannedLineItem {
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  taxableAmount: number;
  totalAmount: number;
  confidence: number;
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
  items: AiScannedLineItem[];
}

export interface AiAddonStatus {
  isAiAddonActive: boolean;
  scansLimit: number;
  scansUsed: number;
  scansRemaining: number;
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
  }
};
