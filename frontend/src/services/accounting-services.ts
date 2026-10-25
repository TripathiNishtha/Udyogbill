import { apiClient } from "@/lib/api-client";

// #region Domain Interfaces

export interface AccountGroup {
  id: string;
  code: string;
  name: string;
  category: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  nature: "Debit" | "Credit";
  parentGroupId?: string | null;
  description?: string;
}

export interface AccountGroupTreeNode {
  id: string;
  code: string;
  name: string;
  category: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  nature: "Debit" | "Credit";
  parentGroupId?: string | null;
  description?: string;
  ledgerCount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  balanceType: "Debit" | "Credit";
  subGroups: AccountGroupTreeNode[];
  ledgers: LedgerAccount[];
}

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  groupId: string;
  groupName: string;
  category: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  currentBalance: number;
  isSystemAccount: boolean;
  isActive: boolean;
  description?: string;
  isBillWiseApplicable?: boolean;
  isCostCentresApplicable?: boolean;
  defaultTaxRate?: number;
  gstin?: string;
  state?: string;
  panNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankBranch?: string;
}

export interface JournalVoucherLeg {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
  billRefType?: string;
  billRefNumber?: string;
  costCentreId?: string;
}

export interface JournalVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: "Journal" | "Contra" | "Payment" | "Receipt" | "Sales" | "Purchase" | "DebitNote" | "CreditNote" | string;
  referenceNumber?: string;
  referenceDate?: string;
  totalDebit: number;
  totalCredit: number;
  narration: string;
  legs: JournalVoucherLeg[];
  createdByName?: string;
  createdAt: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  isCancelled?: boolean;
  cancelledAtUtc?: string;
  cancelledByName?: string;
  cancelledReason?: string;
}

export interface LedgerStatementLine {
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  referenceNumber?: string;
  narration?: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  runningBalanceType: string;
  isCancelled?: boolean;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
}

export interface LedgerStatementReport {
  accountId: string;
  accountCode: string;
  accountName: string;
  groupName: string;
  category: string;
  openingBalance: number;
  balanceType: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: string;
  lines: LedgerStatementLine[];
}

export interface MonthlySummaryRow {
  monthIndex: number;
  monthName: string;
  year: number;
  debitAmount: number;
  creditAmount: number;
  netMovement: number;
  closingBalance: number;
  closingBalanceType: string;
  voucherCount: number;
}

export interface LedgerMonthlySummary {
  accountId: string;
  accountCode: string;
  accountName: string;
  groupName: string;
  category: string;
  openingBalance: number;
  balanceType: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: string;
  months: MonthlySummaryRow[];
}

export interface GroupSummaryItem {
  id: string;
  code: string;
  name: string;
  itemType: "Group" | "Ledger";
  childCount: number;
  openingDebit: number;
  openingCredit: number;
  debitMovement: number;
  creditMovement: number;
  closingDebit: number;
  closingCredit: number;
}

export interface GroupSummaryReport {
  groupId: string;
  groupCode: string;
  groupName: string;
  category: string;
  nature: string;
  totalDebitMovement: number;
  totalCreditMovement: number;
  netClosingBalance: number;
  closingBalanceType: string;
  items: GroupSummaryItem[];
}

export interface VoucherAuditLog {
  id: string;
  journalVoucherId: string;
  voucherNumber: string;
  actionType: string;
  previousSnapshotJson?: string;
  newSnapshotJson?: string;
  performedByName?: string;
  clientIpAddress?: string;
  createdAtUtc: string;
}

export interface PeriodLock {
  lockDate: string;
  isLocked: boolean;
  reason: string;
  lockedByName?: string;
  updatedAtUtc?: string;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  groupName: string;
  category: string;
  openingDebit: number;
  openingCredit: number;
  debitMovement: number;
  creditMovement: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalDebitMovement: number;
  totalCreditMovement: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;
}

export interface BalanceSheetLedgerLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  balanceType: string;
}

export interface BalanceSheetSection {
  groupId: string;
  groupCode: string;
  groupName: string;
  totalAmount: number;
  subGroups: BalanceSheetSection[];
  ledgers: BalanceSheetLedgerLine[];
}

export interface BalanceSheetReport {
  asOfDate: string;
  accountingBasis: string;
  liabilities: BalanceSheetSection[];
  assets: BalanceSheetSection[];
  totalLiabilities: number;
  totalAssets: number;
  netProfitOrLoss: number;
  differenceInOpeningBalances: number;
  isBalanced: boolean;
}

export interface ProfitAndLossItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitAndLossGroup {
  groupName: string;
  totalAmount: number;
  items: ProfitAndLossItem[];
}

export interface ProfitAndLossReport {
  fromDate: string;
  toDate: string;
  accountingBasis: string;
  salesRevenue: number;
  openingStock: number;
  directPurchases: number;
  directExpenses: number;
  closingStock: number;
  grossProfit: number;
  grossLoss: number;
  indirectIncomes: number;
  indirectExpenses: number;
  netProfit: number;
  netLoss: number;
  directExpenseGroups: ProfitAndLossGroup[];
  indirectIncomeGroups: ProfitAndLossGroup[];
  indirectExpenseGroups: ProfitAndLossGroup[];
}

export interface DayBookItem {
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  referenceNumber?: string;
  narration: string;
  particulars: string;
  debitAmount: number;
  creditAmount: number;
  createdByName?: string;
  isCancelled: boolean;
}

export interface DayBookReport {
  fromDate: string;
  toDate: string;
  totalVouchers: number;
  totalDebit: number;
  totalCredit: number;
  vouchers: DayBookItem[];
}

export interface CashBankBookItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: "Cash" | "Bank";
  openingBalance: number;
  openingBalanceType: string;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: string;
}

export interface CashBankBookReport {
  fromDate: string;
  toDate: string;
  totalCashBalance: number;
  totalBankBalance: number;
  grandTotal: number;
  accounts: CashBankBookItem[];
}

export interface CostCentre {
  id: string;
  code: string;
  name: string;
  category?: string;
  parentCostCentreId?: string;
  isActive: boolean;
}

export interface MigratedBillsSyncPreview {
  unpostedSalesCount: number;
  unpostedSalesAmount: number;
  unpostedPurchasesCount: number;
  unpostedPurchasesAmount: number;
  alreadySyncedCount: number;
}

export interface SyncMigratedBillsResult {
  syncedSalesCount: number;
  syncedSalesAmount: number;
  syncedPurchasesCount: number;
  syncedPurchasesAmount: number;
  syncedPaymentsCount: number;
  syncedPaymentsAmount: number;
  message: string;
}

export interface SyncMigratedBillsRequest {
  syncSales?: boolean;
  syncPurchases?: boolean;
  fromDate?: string | null;
  toDate?: string | null;
}

// #endregion

class AccountingService {
  public async isAddonEnabled(): Promise<boolean> {
    try {
      const res = await apiClient.get<any>("/tenant/subscription/status");
      const data = res.data?.data ?? res.data;
      if (data?.addons && Array.isArray(data.addons)) {
        return data.addons.some(
          (a: any) =>
            (a.code === "ADDON_ACCOUNTING" || a.code?.toLowerCase() === "accounting" || a.slug === "accounting") &&
            !!a.isEnrolled
        );
      }
      return false;
    } catch {
      return false;
    }
  }

  public async setAddonStatus(enabled: boolean): Promise<void> {
    // Managed via subscriptions/addons
  }

  // #region Groups & Master COA

  public async getAccountGroups(): Promise<AccountGroup[]> {
    const res = await apiClient.get<any>("/accounting/groups");
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async getAccountGroupsTree(): Promise<AccountGroupTreeNode[]> {
    const res = await apiClient.get<any>("/accounting/groups/tree");
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async getGroupSummary(groupId: string, fromDate?: string, toDate?: string): Promise<GroupSummaryReport | null> {
    try {
      const res = await apiClient.get<any>(`/accounting/groups/${groupId}/summary`, {
        params: { fromDate, toDate }
      });
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  // // #endregion

  // #region Ledger Master

  public async getLedgerAccounts(category?: string, groupId?: string): Promise<LedgerAccount[]> {
    const res = await apiClient.get<any>("/accounting/accounts", {
      params: { category, groupId }
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createLedgerAccount(account: {
    accountCode: string;
    accountName: string;
    groupId: string;
    category?: string;
    openingBalance: number;
    balanceType: string;
    description?: string;
    isBillWiseApplicable?: boolean;
    isCostCentresApplicable?: boolean;
    defaultTaxRate?: number;
    gstin?: string;
    state?: string;
    panNumber?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    bankBranch?: string;
  }): Promise<LedgerAccount> {
    const res = await apiClient.post<any>("/accounting/accounts", account);
    return res.data?.data ?? res.data;
  }

  public async updateLedgerAccount(id: string, account: Partial<LedgerAccount>): Promise<LedgerAccount> {
    const res = await apiClient.put<any>(`/accounting/accounts/${id}`, account);
    return res.data?.data ?? res.data;
  }

  public async getLedgerStatement(accountId: string, fromDate?: string, toDate?: string): Promise<LedgerStatementReport | null> {
    try {
      const res = await apiClient.get<any>(`/accounting/ledgers/${accountId}/statement`, {
        params: { fromDate, toDate }
      });
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  public async getLedgerMonthlySummary(accountId: string, financialYear?: number): Promise<LedgerMonthlySummary | null> {
    try {
      const res = await apiClient.get<any>(`/accounting/ledgers/${accountId}/monthly-summary`, {
        params: { financialYear }
      });
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  // // #endregion

  // #region Vouchers

  public async getJournalVouchers(params?: {
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
    search?: string;
  }): Promise<JournalVoucher[]> {
    const res = await apiClient.get<any>("/accounting/vouchers", {
      params
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async getVoucherById(id: string): Promise<JournalVoucher | null> {
    try {
      const res = await apiClient.get<any>(`/accounting/vouchers/${id}`);
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  public async getVoucherByReference(refNumber: string): Promise<JournalVoucher | null> {
    try {
      const res = await apiClient.get<any>(`/accounting/vouchers/by-reference/${encodeURIComponent(refNumber)}`);
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  public async createJournalVoucher(voucher: {
    voucherType: string;
    voucherDate?: string;
    referenceNumber?: string;
    referenceDate?: string;
    narration: string;
    legs: JournalVoucherLeg[];
    sourceDocumentType?: string;
    sourceDocumentId?: string;
  }): Promise<JournalVoucher> {
    const res = await apiClient.post<any>("/accounting/vouchers", voucher);
    return res.data?.data ?? res.data;
  }

  public async cancelVoucher(id: string, reason: string): Promise<void> {
    await apiClient.post<any>(`/accounting/vouchers/${id}/cancel`, { reason });
  }

  public async getVoucherAuditLogs(voucherId?: string): Promise<VoucherAuditLog[]> {
    try {
      const res = await apiClient.get<any>("/accounting/audit-logs", {
        params: { voucherId }
      });
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // // #endregion

  // #region Period Lock

  public async getPeriodLock(): Promise<PeriodLock | null> {
    try {
      const res = await apiClient.get<any>("/accounting/period-lock");
      return res.data?.data ?? res.data;
    } catch {
      return null;
    }
  }

  public async setPeriodLock(lockDate: string, isLocked: boolean, reason: string): Promise<PeriodLock> {
    const res = await apiClient.post<any>("/accounting/period-lock", { lockDate, isLocked, reason });
    return res.data?.data ?? res.data;
  }

  // // #endregion

  // #region Certified Reports

  public async getTrialBalance(): Promise<TrialBalanceReport> {
    const res = await apiClient.get<any>("/accounting/trial-balance");
    const rows = res.data?.data ?? res.data;
    const list: TrialBalanceRow[] = Array.isArray(rows) ? rows : [];

    const totalOpenDr = list.reduce((s: number, r: any) => s + (Number(r.openingDebit) || 0), 0);
    const totalOpenCr = list.reduce((s: number, r: any) => s + (Number(r.openingCredit) || 0), 0);
    const totalMovDr = list.reduce((s: number, r: any) => s + (Number(r.debitMovement) || 0), 0);
    const totalMovCr = list.reduce((s: number, r: any) => s + (Number(r.creditMovement) || 0), 0);
    const totalCloseDr = list.reduce((s: number, r: any) => s + (Number(r.closingDebit) || 0), 0);
    const totalCloseCr = list.reduce((s: number, r: any) => s + (Number(r.closingCredit) || 0), 0);

    return {
      asOfDate: new Date().toISOString().split("T")[0],
      rows: list,
      totalOpeningDebit: totalOpenDr,
      totalOpeningCredit: totalOpenCr,
      totalDebitMovement: totalMovDr,
      totalCreditMovement: totalMovCr,
      totalClosingDebit: totalCloseDr,
      totalClosingCredit: totalCloseCr,
      isBalanced: Math.abs(totalCloseDr - totalCloseCr) < 1.0
    };
  }

  public async getBalanceSheet(asOfDate?: string, basis: string = "accrual"): Promise<BalanceSheetReport> {
    const res = await apiClient.get<any>("/accounting/reports/balance-sheet", {
      params: { asOfDate, basis }
    });
    return res.data?.data ?? res.data;
  }

  public async getProfitAndLoss(fromDate?: string, toDate?: string, basis: string = "accrual"): Promise<ProfitAndLossReport> {
    const res = await apiClient.get<any>("/accounting/reports/profit-and-loss", {
      params: { fromDate, toDate, basis }
    });
    return res.data?.data ?? res.data;
  }

  public async getDayBook(params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    voucherType?: string;
  }): Promise<DayBookReport> {
    const res = await apiClient.get<any>("/accounting/reports/daybook", { params });
    return res.data?.data ?? res.data;
  }

  public async getCashBankBook(fromDate?: string, toDate?: string): Promise<CashBankBookReport> {
    const res = await apiClient.get<any>("/accounting/reports/cash-bank-book", {
      params: { fromDate, toDate }
    });
    return res.data?.data ?? res.data;
  }

  // // #endregion

  // #region Cost Centres & Migrated Sync

  public async getCostCentres(): Promise<CostCentre[]> {
    try {
      const res = await apiClient.get<any>("/accounting/cost-centres");
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  public async createCostCentre(centre: { code: string; name: string; category?: string; parentCostCentreId?: string }): Promise<CostCentre> {
    const res = await apiClient.post<any>("/accounting/cost-centres", centre);
    return res.data?.data ?? res.data;
  }

  public async getMigratedBillsSyncPreview(): Promise<MigratedBillsSyncPreview> {
    const res = await apiClient.get<any>("/accounting/sync-migrated-bills/preview");
    return res.data?.data ?? res.data;
  }

  public async syncMigratedBills(req?: SyncMigratedBillsRequest): Promise<SyncMigratedBillsResult> {
    const res = await apiClient.post<any>("/accounting/sync-migrated-bills", req ?? { syncSales: true, syncPurchases: true });
    return res.data?.data ?? res.data;
  }

  // // #endregion
}

export const accountingService = new AccountingService();
