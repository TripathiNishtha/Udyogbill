import { apiClient } from "@/lib/api-client";
import {
  FinancialSummaryReport,
  Gstr1Report,
  Gstr3bReport,
  PnLReport,
  ReportLedgerEntry,
  ReportLedgerStatement,
} from "@/types";

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export const reportService = {
  getLedgerEntries: async (params?: {
    partyId?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<PagedResult<ReportLedgerEntry>> => {
    const query = new URLSearchParams();
    if (params?.partyId) query.append("partyId", params.partyId);
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);
    if (params?.pageNumber) query.append("pageNumber", params.pageNumber.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

    const response = await apiClient.get(`/tenant/reports/ledger?${query.toString()}`);
    return response.data;
  },

  getLedgerStatement: async (
    partyId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ReportLedgerStatement> => {
    const query = new URLSearchParams({ partyId });
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);

    const response = await apiClient.get(`/tenant/reports/ledger/statement?${query.toString()}`);
    return response.data;
  },

  getPnLReport: async (
    fromDate?: string,
    toDate?: string,
    branchId?: string
  ): Promise<PnLReport> => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/pnl?${query.toString()}`);
    return response.data;
  },

  getGstr1Report: async (
    fromDate?: string,
    toDate?: string,
    branchId?: string
  ): Promise<Gstr1Report> => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/gstr1?${query.toString()}`);
    return response.data;
  },

  getGstr3bReport: async (
    fromDate?: string,
    toDate?: string,
    branchId?: string
  ): Promise<Gstr3bReport> => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/gstr3b?${query.toString()}`);
    return response.data;
  },

  getSummaryDashboard: async (
    fromDate?: string,
    toDate?: string,
    branchId?: string
  ): Promise<FinancialSummaryReport> => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/summary?${query.toString()}`);
    return response.data;
  },

  downloadGstr1Csv: async (fromDate?: string, toDate?: string, branchId?: string) => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/export/gstr1?${query.toString()}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `GSTR1_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadGstr3bCsv: async (fromDate?: string, toDate?: string, branchId?: string) => {
    const query = new URLSearchParams();
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);
    if (branchId) query.append("branchId", branchId);

    const response = await apiClient.get(`/tenant/reports/export/gstr3b?${query.toString()}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `GSTR3B_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadLedgerCsv: async (partyId?: string, fromDate?: string, toDate?: string) => {
    const query = new URLSearchParams();
    if (partyId) query.append("partyId", partyId);
    if (fromDate) query.append("fromDate", fromDate);
    if (toDate) query.append("toDate", toDate);

    const response = await apiClient.get(`/tenant/reports/export/ledger?${query.toString()}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
