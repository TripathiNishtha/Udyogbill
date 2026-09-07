import { apiClient } from "@/lib/api-client";

export interface P0ReportFilter {
  fromDate?: string;
  toDate?: string;
  financialYear?: string;
  branchId?: string;
  warehouseId?: string;
  partyId?: string;
  customerType?: string;
  itemId?: string;
  categoryId?: string;
  brandId?: string;
  salesmanUserId?: string;
  routeId?: string;
  brokerId?: string;
  paymentStatus?: number;
  paymentMode?: number;
  taxSupplyType?: number;
  gstRate?: number;
  searchTerm?: string;
  groupBy?: string;
  pageNumber?: number;
  pageSize?: number;
  reportType?: string;
}

export interface SalesRegisterLineItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyId?: string;
  customerName: string;
  customerGstin?: string;
  customerType: string;
  salesmanUserId?: string;
  salesmanName?: string;
  itemId: string;
  productName: string;
  sku: string;
  barcode?: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  uomCode: string;
  rate: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  netInvoiceValue: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
  paymentMode: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  placeOfSupply: string;
}

export interface SalesRegisterDetailedReport {
  items: SalesRegisterLineItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalQuantity: number;
  totalGross: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalNetAmount: number;
  totalNetInvoiceValue?: number;
  totalPaid: number;
  totalOutstanding: number;
  distinctInvoicesCount: number;
  totalInvoicesCount?: number;
}

export interface SalesSummaryGroupRow {
  groupKey: string;
  groupLabel: string;
  invoiceCount: number;
  totalQuantitySold: number;
  grossSales: number;
  returnsAmount: number;
  netSales: number;
  taxableSales: number;
  taxAmount: number;
  discountAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface SalesSummaryReport {
  rows: SalesSummaryGroupRow[];
  grandGrossSales: number;
  grandReturnsAmount: number;
  grandNetSales: number;
  grandTaxableSales: number;
  grandTaxAmount: number;
  grandDiscountAmount: number;
  grandPaidAmount: number;
  grandOutstandingAmount: number;
  grandInvoiceCount: number;
  grandQuantitySold: number;
}

export interface PurchaseRegisterLineItem {
  purchaseBillId: string;
  billNumber: string;
  supplierBillNumber?: string;
  billDate: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  itemId: string;
  productName: string;
  sku: string;
  hsnCode?: string;
  batchNumber?: string;
  quantity: number;
  uomCode: string;
  purchaseRate: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  netBillValue: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
}

export interface PurchaseRegisterDetailedReport {
  items: PurchaseRegisterLineItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalQuantity: number;
  totalGross: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalNetBillValue?: number;
  totalNetAmount?: number;
  totalPaid: number;
  totalOutstanding: number;
  distinctBillsCount?: number;
  totalBillsCount?: number;
}

export interface PurchaseSummaryGroupRow {
  groupKey: string;
  groupLabel: string;
  billCount: number;
  totalQuantityPurchased: number;
  grossPurchase: number;
  returnsAmount: number;
  netPurchase: number;
  taxablePurchase: number;
  taxAmount: number;
  discountAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface PurchaseSummaryReport {
  rows: PurchaseSummaryGroupRow[];
  grandGrossPurchase: number;
  grandReturnsAmount: number;
  grandNetPurchase: number;
  grandTaxablePurchase: number;
  grandTaxAmount: number;
  grandDiscountAmount: number;
  grandPaidAmount: number;
  grandOutstandingAmount: number;
  grandBillCount: number;
  grandQuantityPurchased: number;
}

export interface RealTimeStockBalanceItem {
  itemId: string;
  sku: string;
  productName: string;
  categoryName: string;
  brandName: string;
  warehouseId: string;
  warehouseName: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  minimumAlertStock: number;
  reorderQuantity: number;
  deficitQuantity: number;
  costRate: number;
  stockValue: number;
  stockStatus: string;
}

export interface RealTimeStockBalanceReport {
  items: RealTimeStockBalanceItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCurrentStock: number;
  totalStockValue: number;
  totalLowStockCount: number;
  totalZeroStockCount: number;
  totalNegativeStockCount: number;
}

export interface StockValuationItem {
  itemId: string;
  sku: string;
  productName: string;
  categoryName: string;
  brandName: string;
  warehouseId: string;
  warehouseName: string;
  batchId?: string;
  batchNumber?: string;
  openingQuantity: number;
  inwardQuantity: number;
  outwardQuantity: number;
  adjustmentQuantity: number;
  closingQuantity: number;
  costRate: number;
  stockValue: number;
  valuationMethod: string;
}

export interface StockValuationReport {
  items: StockValuationItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  grandOpeningQuantity: number;
  grandInwardQuantity: number;
  grandOutwardQuantity: number;
  grandAdjustmentQuantity: number;
  grandClosingQuantity: number;
  grandStockValue: number;
}

export interface DebtorAgeingInvoiceRow {
  partyId: string;
  customerName: string;
  phone?: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalInvoiceAmount?: number;
  invoiceAmount?: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  ageingBucket: string;
  creditLimit: number;
  creditUtilizationPercent: number;
}

export interface DebtorAgeingCustomerSummary {
  partyId: string;
  customerName: string;
  phone?: string;
  creditLimit: number;
  totalReceivable: number;
  notDueAmount: number;
  days1To15: number;
  days16To30: number;
  days31To45: number;
  days46To60: number;
  days61To90: number;
  days91To180: number;
  days181To365: number;
  days365Plus: number;
}

export interface DebtorAgeingReport {
  invoices?: DebtorAgeingInvoiceRow[];
  invoiceRows: DebtorAgeingInvoiceRow[];
  customerSummaries: DebtorAgeingCustomerSummary[];
  grandTotalReceivable: number;
  grandNotDue: number;
  grandOverdue: number;
  totalDays1To15: number;
  totalDays16To30: number;
  totalDays31To45: number;
  totalDays46To60: number;
  totalDays61To90: number;
  totalDays91To180: number;
  totalDays181To365: number;
  totalDays365Plus: number;
}

export interface CreditorAgeingBillRow {
  partyId: string;
  supplierName: string;
  phone?: string;
  purchaseBillId?: string;
  billId?: string;
  billNumber: string;
  supplierBillNumber?: string;
  vendorInvoiceNumber?: string;
  billDate: string;
  dueDate: string;
  totalBillAmount?: number;
  billAmount?: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  ageingBucket: string;
}

export interface CreditorAgeingSupplierSummary {
  partyId: string;
  supplierName: string;
  phone?: string;
  totalPayable: number;
  notDueAmount: number;
  days1To15: number;
  days16To30: number;
  days31To45: number;
  days46To60: number;
  days61To90: number;
  days91To180: number;
  days181To365: number;
  days365Plus: number;
}

export interface CreditorAgeingReport {
  bills?: CreditorAgeingBillRow[];
  billRows: CreditorAgeingBillRow[];
  supplierSummaries: CreditorAgeingSupplierSummary[];
  grandTotalPayable: number;
  grandNotDue: number;
  grandOverdue: number;
  totalDays1To15: number;
  totalDays16To30: number;
  totalDays31To45: number;
  totalDays46To60: number;
  totalDays61To90: number;
  totalDays91To180: number;
  totalDays181To365: number;
  totalDays365Plus: number;
}

export interface PnLExpenseCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentageOfRevenue: number;
}

export interface TruePnLReport {
  fromDateUtc: string;
  toDateUtc: string;
  financialYear: string;
  // Revenue
  grossSalesRevenue: number;
  salesReturnAmount: number;
  netSalesRevenue: number;
  // COGS
  openingStockValuation: number;
  grossPurchasesAmount: number;
  purchaseReturnAmount: number;
  netPurchasesAmount: number;
  closingStockValuation: number;
  totalCostOfGoodsSold: number;
  // Gross Profit
  grossProfitAmount: number;
  grossProfitMarginPercent: number;
  // Expenses
  operatingExpenses: PnLExpenseCategoryBreakdown[];
  totalOperatingExpenses: number;
  // Other Income
  otherIncomesAmount: number;
  // Net Profit
  netProfitAmount: number;
  netProfitMarginPercent: number;
}

export interface CompanyStockSalesItem {
  itemId: string;
  itemSku: string;
  itemName: string;
  brandId?: string;
  companyName: string;
  packing: string;
  mrp: number;
  purchasePrice: number;
  salePrice: number;
  purchaseUnit: string;
  saleUnit: string;
  stockInQuantity: number;
  currentStock: number;
  currentStockValue: number;
  soldQuantity: number;
  saleValue: number;
}

export interface CompanyStockSalesReport {
  items: CompanyStockSalesItem[];
  grandStockInQty: number;
  grandCurrentStock: number;
  grandStockValue: number;
  grandSoldQty: number;
  grandSaleValue: number;
  totalItemsCount: number;
  fromDate: string;
  toDate: string;
  filterCompanyName?: string;
}

export interface SavedReportPreset {
  id?: string;
  reportCode: string;
  name: string;
  description?: string;
  configurationJson: string;
  isDefault: boolean;
  isSharedWithTenant: boolean;
}

function buildQuery(filter: P0ReportFilter): string {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export const p0ReportService = {
  async getSalesRegisterDetailed(filter: P0ReportFilter = {}): Promise<SalesRegisterDetailedReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<SalesRegisterDetailedReport>(`/tenant/reports/p0/sales/register?${q}`);
    return res.data;
  },

  async getSalesSummary(filter: P0ReportFilter = {}): Promise<SalesSummaryReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<SalesSummaryReport>(`/tenant/reports/p0/sales/summary?${q}`);
    return res.data;
  },

  async getPurchaseRegisterDetailed(filter: P0ReportFilter = {}): Promise<PurchaseRegisterDetailedReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<PurchaseRegisterDetailedReport>(`/tenant/reports/p0/purchases/register?${q}`);
    return res.data;
  },

  async getPurchaseSummary(filter: P0ReportFilter = {}): Promise<PurchaseSummaryReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<PurchaseSummaryReport>(`/tenant/reports/p0/purchases/summary?${q}`);
    return res.data;
  },

  async getRealTimeStockBalance(filter: P0ReportFilter = {}): Promise<RealTimeStockBalanceReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<RealTimeStockBalanceReport>(`/tenant/reports/p0/inventory/stock-balance?${q}`);
    return res.data;
  },

  async getStockValuation(filter: P0ReportFilter = {}): Promise<StockValuationReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<StockValuationReport>(`/tenant/reports/p0/inventory/valuation?${q}`);
    return res.data;
  },

  async getDebtorAgeing(filter: P0ReportFilter = {}): Promise<DebtorAgeingReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<any>(`/tenant/reports/p0/receivables/debtor-ageing?${q}`);
    const data = res.data?.data || res.data || {};
    const invoiceList: DebtorAgeingInvoiceRow[] = data.invoices || data.invoiceRows || [];
    return {
      ...data,
      invoices: invoiceList,
      invoiceRows: invoiceList,
      customerSummaries: data.customerSummaries || [],
    };
  },

  async getCreditorAgeing(filter: P0ReportFilter = {}): Promise<CreditorAgeingReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<any>(`/tenant/reports/p0/payables/creditor-ageing?${q}`);
    const data = res.data?.data || res.data || {};
    const billList: CreditorAgeingBillRow[] = data.bills || data.billRows || [];
    return {
      ...data,
      bills: billList,
      billRows: billList,
      supplierSummaries: data.supplierSummaries || [],
    };
  },

  async getTruePnL(filter: P0ReportFilter = {}): Promise<TruePnLReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<TruePnLReport>(`/tenant/reports/p0/financial/true-pnl?${q}`);
    return res.data;
  },

  async getCompanyStockSalesReport(filter: P0ReportFilter = {}): Promise<CompanyStockSalesReport> {
    const q = buildQuery(filter);
    const res = await apiClient.get<CompanyStockSalesReport>(`/tenant/reports/p0/inventory/company-stock-sales?${q}`);
    return res.data;
  },

  async exportReportCsv(reportType: string, filter: P0ReportFilter = {}): Promise<void> {
    const q = buildQuery({ ...filter, reportType });
    const res = await apiClient.get(`/tenant/reports/p0/export/csv?${q}`, {
      responseType: "blob",
    });

    const contentDisposition = res.headers["content-disposition"];
    let filename = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getPresets(reportCode?: string): Promise<SavedReportPreset[]> {
    const url = reportCode ? `/tenant/reports/p0/presets?reportCode=${encodeURIComponent(reportCode)}` : `/tenant/reports/p0/presets`;
    const res = await apiClient.get<SavedReportPreset[]>(url);
    return res.data;
  },

  async savePreset(preset: SavedReportPreset): Promise<SavedReportPreset> {
    const res = await apiClient.post<SavedReportPreset>("/tenant/reports/p0/presets", preset);
    return res.data;
  },

  async deletePreset(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean }>(`/tenant/reports/p0/presets/${id}`);
    return res.data.success;
  }
};
