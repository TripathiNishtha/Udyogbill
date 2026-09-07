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

  downloadGstr1Json: async (gstr1Data: Gstr1Report) => {
    // Generate official GSTN offline JSON format
    const fp = (() => {
      const d = new Date(gstr1Data.toDate);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${m}${d.getFullYear()}`;
    })();

    const gstnJson = {
      gstin: gstr1Data.gstin || "URP",
      fp: fp,
      gt: gstr1Data.totalOutwardTaxable || 0,
      cur_gt: gstr1Data.totalOutwardTaxable || 0,
      version: "GST3.0.4",
      hash: "hash",
      b2b: [
        {
          ctin: "B2B_CONSOLIDATED",
          inv: [
            {
              inum: `B2B-SUM-${fp}`,
              idt: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
              val: Math.round((gstr1Data.totalB2BTaxable + gstr1Data.totalB2BTax) * 100) / 100,
              pos: "07",
              rchrg: "N",
              inv_typ: "R",
              itms: (gstr1Data.rateWiseSummary || []).map((r, idx) => {
                const rt = parseFloat(r.rateSlab.replace(/[^0-9.]/g, "")) || 18;
                return {
                  num: idx + 1,
                  itm_det: {
                    rt: rt,
                    txval: Math.round(r.taxableValue * 100) / 100,
                    iamt: Math.round(r.igstAmount * 100) / 100,
                    camt: Math.round(r.cgstAmount * 100) / 100,
                    samt: Math.round(r.sgstAmount * 100) / 100,
                    csamt: 0.0,
                  },
                };
              }),
            },
          ],
        },
      ],
      b2cs: (gstr1Data.rateWiseSummary || []).map((r) => ({
        sply_ty: "INTRA",
        rt: parseFloat(r.rateSlab.replace(/[^0-9.]/g, "")) || 18,
        typ: "OE",
        pos: "07",
        txval: Math.round(r.taxableValue * 100) / 100,
        camt: Math.round(r.cgstAmount * 100) / 100,
        samt: Math.round(r.sgstAmount * 100) / 100,
        csamt: 0.0,
      })),
      hsn: {
        data: (gstr1Data.hsnSummary || []).map((h, idx) => ({
          num: idx + 1,
          hsn_sc: h.hsnCode || "9999",
          desc: h.description || "General Goods",
          uqc: h.uom || "OTH",
          qty: h.totalQuantity || 1,
          val: Math.round((h.taxableValue + h.totalTax) * 100) / 100,
          txval: Math.round(h.taxableValue * 100) / 100,
          iamt: Math.round(h.igstAmount * 100) / 100,
          camt: Math.round(h.cgstAmount * 100) / 100,
          samt: Math.round(h.sgstAmount * 100) / 100,
          csamt: 0.0,
        })),
      },
      doc_issue: {
        doc_det: [
          {
            doc_num: 1,
            doc_typ: "Invoices for outward supply",
            totnum: (gstr1Data.totalB2BInvoices || 0) + (gstr1Data.totalB2CInvoices || 0),
            canc: 0,
            net_issue: (gstr1Data.totalB2BInvoices || 0) + (gstr1Data.totalB2CInvoices || 0),
          },
        ],
      },
    };

    const jsonStr = JSON.stringify(gstnJson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `GSTR1_${gstr1Data.gstin || "GOVT"}_${fp}.json`);
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
