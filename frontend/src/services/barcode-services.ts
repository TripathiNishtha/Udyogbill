import { apiClient } from "@/lib/api-client";
import {
  BarcodeItemLabel,
  BarcodeScanResult,
  UpiQrPayload
} from "@/types";

export const barcodeService = {
  getItemBarcode: async (itemId: string, batchId?: string): Promise<BarcodeItemLabel> => {
    const res = await apiClient.get<BarcodeItemLabel>(`/tenant/barcode/item/${itemId}`, {
      params: batchId ? { batchId } : undefined
    });
    return res.data;
  },

  scanBarcode: async (barcodeOrSku: string): Promise<BarcodeScanResult> => {
    const res = await apiClient.get<BarcodeScanResult>(`/tenant/barcode/scan/${encodeURIComponent(barcodeOrSku)}`);
    return res.data;
  },

  getInvoiceUpiQr: async (invoiceId: string): Promise<UpiQrPayload> => {
    const res = await apiClient.get<UpiQrPayload>(`/tenant/barcode/invoice/${invoiceId}/upi-qr`);
    return res.data;
  }
};
