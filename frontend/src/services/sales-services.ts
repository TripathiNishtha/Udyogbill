import { apiClient } from "@/lib/api-client";
import {
  SalesInvoiceList,
  SalesInvoiceDetails,
  PagedResponse
} from "@/types";

export interface CreateInvoiceItemInput {
  itemId: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  freeQuantity?: number;
  packing?: string;
  hsnCode?: string;
  uomId: string;
  unitPrice: number;
  mrp?: number;
  ptr?: number;
  pts?: number;
  discountPercent?: number;
  discountAmount?: number;
  attributesJson?: string;
}

export interface CreateSalesInvoiceInput {
  invoiceType: number; // 1: TaxInvoice, 2: POSBill, 3: Proforma, 4: Estimate, 5: CreditNote, 6: DebitNote
  branchId: string;
  warehouseId: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGSTIN?: string;
  customerPAN?: string;
  billingAddress?: string;
  shippingAddress?: string;
  billingStateCode: string;
  shippingStateCode: string;
  placeOfSupply: string;
  invoiceDate: string;
  dueDate?: string;
  invoiceDiscountPercent?: number;
  invoiceDiscountAmount?: number;
  primaryPaymentMode: number;
  paidAmount: number;
  paymentReferenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  transporterName?: string;
  transporterId?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  lrDate?: string;
  eWayBillNumber?: string;
  eWayBillDate?: string;
  poNumber?: string;
  poDate?: string;
  isReverseCharge?: boolean;
  brokerId?: string;
  attributesJson?: string;
  items: CreateInvoiceItemInput[];
}

export interface RecordInvoicePaymentInput {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMode: number;
  transactionReference?: string;
  notes?: string;
}

export const salesService = {
  // Invoices
  async getInvoices(params?: {
    pageNumber?: number;
    pageSize?: number;
    invoiceType?: number;
    status?: number;
    paymentStatus?: number;
    branchId?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<SalesInvoiceList>> {
    const response = await apiClient.get<PagedResponse<SalesInvoiceList>>("/tenant/invoices", { params });
    return response.data;
  },

  async getInvoiceById(id: string): Promise<SalesInvoiceDetails> {
    const response = await apiClient.get<SalesInvoiceDetails>(`/tenant/invoices/${id}`);
    return response.data;
  },

  async getInvoiceByNumber(invoiceNumber: string): Promise<SalesInvoiceDetails> {
    const response = await apiClient.get<SalesInvoiceDetails>(`/tenant/invoices/number/${invoiceNumber}`);
    return response.data;
  },

  async createInvoice(input: CreateSalesInvoiceInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/invoices", input);
    return response.data;
  },

  async updateInvoice(id: string, input: CreateSalesInvoiceInput): Promise<string> {
    const response = await apiClient.put<string>(`/tenant/invoices/${id}`, input);
    return response.data;
  },

  async createPosBill(input: CreateSalesInvoiceInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/pos/bills", input);
    return response.data;
  },

  async recordPayment(id: string, input: RecordInvoicePaymentInput): Promise<string> {
    const response = await apiClient.post<string>(`/tenant/invoices/${id}/payments`, input);
    return response.data;
  },

  async cancelInvoice(id: string, cancellationReason: string): Promise<void> {
    await apiClient.post(`/tenant/invoices/${id}/cancel`, { cancellationReason });
  },

  // Sales Returns & Credit Notes
  async getSalesReturns(params?: {
    pageNumber?: number;
    pageSize?: number;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<SalesReturnDto>> {
    const response = await apiClient.get<PagedResponse<SalesReturnDto>>("/tenant/sales-returns", { params });
    return response.data;
  },

  async getSalesReturnById(id: string): Promise<SalesReturnDto> {
    const response = await apiClient.get<SalesReturnDto>(`/tenant/sales-returns/${id}`);
    return response.data;
  },

  async createSalesReturn(input: CreateSalesReturnInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/sales-returns", input);
    return response.data;
  }
};

export interface SalesReturnItemInput {
  itemId: string;
  itemName: string;
  itemSku: string;
  batchId?: string;
  batchNumber?: string;
  returnQuantity: number;
  unitPrice: number;
  gstRate: number;
}

export interface CreateSalesReturnInput {
  originalSalesInvoiceId?: string;
  originalInvoiceNumber?: string;
  partyId: string;
  customerName: string;
  branchId: string;
  warehouseId: string;
  returnReason: string;
  restockToWarehouse: boolean;
  notes?: string;
  items: SalesReturnItemInput[];
}

export interface SalesReturnItemDto {
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

export interface SalesReturnDto {
  id: string;
  creditNoteNumber: string;
  returnDate: string;
  originalSalesInvoiceId?: string;
  originalInvoiceNumber?: string;
  partyId: string;
  customerName: string;
  branchId: string;
  warehouseId: string;
  returnReason: string;
  restockToWarehouse: boolean;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  isCancelled: boolean;
  createdAtUtc: string;
  items: SalesReturnItemDto[];
}
