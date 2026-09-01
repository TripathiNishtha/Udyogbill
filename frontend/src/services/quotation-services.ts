import { apiClient } from "@/lib/api-client";
import {
  QuotationList,
  QuotationDetails,
  CreateQuotationRequest,
  ConvertQuotationRequest,
  PagedResponse
} from "@/types";

export const quotationService = {
  getQuotations: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: number;
    branchId?: string;
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    searchTerm?: string;
  }): Promise<PagedResponse<QuotationList>> => {
    const res = await apiClient.get<PagedResponse<QuotationList>>("/tenant/quotations", { params });
    return res.data;
  },

  getQuotationById: async (id: string): Promise<QuotationDetails> => {
    const res = await apiClient.get<QuotationDetails>(`/tenant/quotations/${id}`);
    return res.data;
  },

  getQuotationByNumber: async (quotationNumber: string): Promise<QuotationDetails> => {
    const res = await apiClient.get<QuotationDetails>(`/tenant/quotations/number/${quotationNumber}`);
    return res.data;
  },

  createQuotation: async (data: CreateQuotationRequest): Promise<string> => {
    const res = await apiClient.post<string>("/tenant/quotations", data);
    return res.data;
  },

  convertQuotationToInvoice: async (id: string, data: ConvertQuotationRequest): Promise<string> => {
    const res = await apiClient.post<string>(`/tenant/quotations/${id}/convert-to-invoice`, data);
    return res.data;
  },

  cancelQuotation: async (id: string, cancellationReason: string): Promise<boolean> => {
    const res = await apiClient.post<boolean>(`/tenant/quotations/${id}/cancel`, { cancellationReason });
    return res.data;
  }
};
