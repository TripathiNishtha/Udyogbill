import { apiClient } from "@/lib/api-client";
import { AuditLog, PagedResponse, TenantAuditSummary } from "@/types";

export interface TenantAuditQueryParams {
  userId?: string;
  action?: number;
  entityName?: string;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const tenantAuditService = {
  async getAuditLogs(params?: TenantAuditQueryParams): Promise<PagedResponse<AuditLog>> {
    const response = await apiClient.get<PagedResponse<AuditLog>>("/tenant/audit", { params });
    return response.data;
  },

  async getAuditSummary(): Promise<TenantAuditSummary> {
    const response = await apiClient.get<TenantAuditSummary>("/tenant/audit/summary");
    return response.data;
  },

  async downloadAuditLogsCsv(params?: TenantAuditQueryParams) {
    const query = new URLSearchParams();
    if (params?.userId) query.append("userId", params.userId);
    if (params?.action !== undefined) query.append("action", params.action.toString());
    if (params?.entityName) query.append("entityName", params.entityName);
    if (params?.searchTerm) query.append("searchTerm", params.searchTerm);
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);

    const response = await apiClient.get(`/tenant/audit/export?${query.toString()}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Tenant_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
