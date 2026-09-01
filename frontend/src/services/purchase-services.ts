import { apiClient } from '@/lib/api-client';
import {
  PagedResponse,
  PurchaseOrderList,
  PurchaseOrderDetails,
  CreatePurchaseOrderRequest,
  GrnList,
  GrnDetails,
  CreateGrnRequest,
  PurchaseBillList,
  PurchaseBillDetails,
  CreatePurchaseBillRequest,
  RecordPurchaseBillPaymentRequest
} from '@/types';

export const purchaseService = {
  // --- Purchase Orders ---
  async getPurchaseOrders(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: number;
    branchId?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<PurchaseOrderList>> {
    const response = await apiClient.get<any>('/tenant/purchase/orders', { params });
    return response.data?.data ?? response.data;
  },

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/orders/${id}`);
    return response.data?.data ?? response.data;
  },

  async getPurchaseOrderByNumber(orderNumber: string): Promise<PurchaseOrderDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/orders/number/${orderNumber}`);
    return response.data?.data ?? response.data;
  },

  async createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<string> {
    const response = await apiClient.post<any>('/tenant/purchase/orders', data);
    return response.data?.data ?? response.data;
  },

  async cancelPurchaseOrder(id: string, cancellationReason: string): Promise<void> {
    await apiClient.post(`/tenant/purchase/orders/${id}/cancel`, { cancellationReason });
  },

  // --- Goods Receipt Notes (GRN) ---
  async getGoodsReceiptNotes(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: number;
    branchId?: string;
    warehouseId?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<GrnList>> {
    const response = await apiClient.get<any>('/tenant/purchase/grn', { params });
    return response.data?.data ?? response.data;
  },

  async getGrnById(id: string): Promise<GrnDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/grn/${id}`);
    return response.data?.data ?? response.data;
  },

  async getGrnByNumber(grnNumber: string): Promise<GrnDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/grn/number/${grnNumber}`);
    return response.data?.data ?? response.data;
  },

  async createGrn(data: CreateGrnRequest): Promise<string> {
    const response = await apiClient.post<any>('/tenant/purchase/grn', data);
    return response.data?.data ?? response.data;
  },

  async cancelGrn(id: string, cancellationReason: string): Promise<void> {
    await apiClient.post(`/tenant/purchase/grn/${id}/cancel`, { cancellationReason });
  },

  // --- Purchase Bills (Vendor Invoices) ---
  async getPurchaseBills(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: number;
    branchId?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<PurchaseBillList>> {
    const response = await apiClient.get<any>('/tenant/purchase/bills', { params });
    return response.data?.data ?? response.data;
  },

  async getPurchaseBillById(id: string): Promise<PurchaseBillDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/bills/${id}`);
    return response.data?.data ?? response.data;
  },

  async getPurchaseBillByNumber(billNumber: string): Promise<PurchaseBillDetails> {
    const response = await apiClient.get<any>(`/tenant/purchase/bills/number/${billNumber}`);
    return response.data?.data ?? response.data;
  },

  async createPurchaseBill(data: CreatePurchaseBillRequest): Promise<string> {
    const response = await apiClient.post<any>('/tenant/purchase/bills', data);
    return response.data?.data ?? response.data;
  },

  async recordPurchaseBillPayment(billId: string, data: RecordPurchaseBillPaymentRequest): Promise<string> {
    const response = await apiClient.post<any>(`/tenant/purchase/bills/${billId}/payments`, data);
    return response.data?.data ?? response.data;
  },

  async cancelPurchaseBill(id: string, cancellationReason: string): Promise<void> {
    await apiClient.post(`/tenant/purchase/bills/${id}/cancel`, { cancellationReason });
  },

  // Purchase Returns & Debit Notes
  async getPurchaseReturns(params?: {
    pageNumber?: number;
    pageSize?: number;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<PurchaseReturnDto>> {
    const response = await apiClient.get<any>("/tenant/purchase-returns", { params });
    return response.data?.data ?? response.data;
  },

  async getPurchaseReturnById(id: string): Promise<PurchaseReturnDto> {
    const response = await apiClient.get<any>(`/tenant/purchase-returns/${id}`);
    return response.data?.data ?? response.data;
  },

  async createPurchaseReturn(data: CreatePurchaseReturnInput): Promise<string> {
    const response = await apiClient.post<any>("/tenant/purchase-returns", data);
    return response.data?.data ?? response.data;
  }
};

export interface PurchaseReturnItemInput {
  itemId: string;
  itemName: string;
  itemSku: string;
  batchId?: string;
  batchNumber?: string;
  returnQuantity: number;
  unitPrice: number;
  gstRate: number;
}

export interface CreatePurchaseReturnInput {
  originalPurchaseBillId?: string;
  originalBillNumber?: string;
  partyId: string;
  supplierName: string;
  branchId: string;
  warehouseId: string;
  returnReason: string;
  notes?: string;
  items: PurchaseReturnItemInput[];
}

export interface PurchaseReturnItemDto {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  batchId?: string;
  batchNumber?: string;
  returnQuantity: number;
  unitPrice: number;
  gstRate: number;
  totalAmount: number;
}

export interface PurchaseReturnDto {
  id: string;
  debitNoteNumber: string;
  returnDate: string;
  originalPurchaseBillId?: string;
  originalBillNumber?: string;
  partyId: string;
  supplierName: string;
  branchId: string;
  warehouseId: string;
  returnReason: string;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  isCancelled: boolean;
  createdAtUtc: string;
  items: PurchaseReturnItemDto[];
}
