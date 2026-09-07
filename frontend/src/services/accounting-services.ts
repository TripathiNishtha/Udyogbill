import { apiClient } from "@/lib/api-client";

export interface AccountGroup {
  id: string;
  code: string;
  name: string;
  category: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  nature: "Debit" | "Credit";
  parentGroupId?: string;
  description?: string;
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
}

export interface JournalVoucherLeg {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

export interface JournalVoucher {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: "Journal" | "Contra" | "Payment" | "Receipt" | "DebitNote" | "CreditNote";
  referenceNumber?: string;
  totalDebit: number;
  totalCredit: number;
  narration: string;
  legs: JournalVoucherLeg[];
  createdByName?: string;
  createdAt: string;
}

export interface TrialBalanceRow {
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

export interface BalanceSheetReport {
  asOfDate: string;
  assets: { groupName: string; accounts: { accountName: string; balance: number }[]; subtotal: number }[];
  totalAssets: number;
  liabilities: { groupName: string; accounts: { accountName: string; balance: number }[]; subtotal: number }[];
  totalLiabilities: number;
  equity: { groupName: string; accounts: { accountName: string; balance: number }[]; subtotal: number }[];
  totalEquity: number;
  currentPeriodProfit: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface ProfitAndLossReport {
  fromPeriod: string;
  toPeriod: string;
  revenues: { groupName: string; accounts: { accountName: string; balance: number }[]; subtotal: number }[];
  totalRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: { groupName: string; accounts: { accountName: string; balance: number }[]; subtotal: number }[];
  totalExpenses: number;
  netProfitOrLoss: number;
  netMarginPercent: number;
}

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

  public async getAccountGroups(): Promise<AccountGroup[]> {
    const res = await apiClient.get<any>("/accounting/groups");
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async getLedgerAccounts(): Promise<LedgerAccount[]> {
    const res = await apiClient.get<any>("/accounting/accounts");
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createLedgerAccount(account: Omit<LedgerAccount, "id" | "currentBalance">): Promise<LedgerAccount> {
    const res = await apiClient.post<any>("/accounting/accounts", {
      accountCode: account.accountCode,
      accountName: account.accountName,
      groupId: account.groupId,
      category: account.category,
      openingBalance: account.openingBalance,
      balanceType: account.balanceType
    });
    return res.data?.data ?? res.data;
  }

  public async getJournalVouchers(fromDate?: string, toDate?: string): Promise<JournalVoucher[]> {
    const res = await apiClient.get<any>("/accounting/vouchers", {
      params: { fromDate, toDate }
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createJournalVoucher(voucher: Omit<JournalVoucher, "id" | "voucherNumber" | "createdAt">): Promise<JournalVoucher> {
    const res = await apiClient.post<any>("/accounting/vouchers", {
      voucherType: voucher.voucherType,
      voucherDate: voucher.voucherDate,
      referenceNumber: voucher.referenceNumber,
      narration: voucher.narration,
      legs: voucher.legs
    });
    return res.data?.data ?? res.data;
  }

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

  public async getBalanceSheet(): Promise<BalanceSheetReport> {
    const accounts = await this.getLedgerAccounts();
    const assets = accounts.filter((a) => a.category === "Asset");
    const liabilities = accounts.filter((a) => a.category === "Liability");
    const equity = accounts.filter((a) => a.category === "Equity");
    const revenue = accounts.filter((a) => a.category === "Revenue");
    const expense = accounts.filter((a) => a.category === "Expense");

    const totalRev = revenue.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const totalExp = expense.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const netProfit = totalRev - totalExp;

    const totalAssets = assets.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const totalLiab = liabilities.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const totalEq = equity.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

    return {
      asOfDate: new Date().toISOString().split("T")[0],
      assets: [
        {
          groupName: "Current & Fixed Assets",
          accounts: assets.map((a) => ({ accountName: a.accountName, balance: Number(a.currentBalance) || 0 })),
          subtotal: totalAssets
        }
      ],
      totalAssets,
      liabilities: [
        {
          groupName: "Current & Long-Term Liabilities",
          accounts: liabilities.map((a) => ({ accountName: a.accountName, balance: Number(a.currentBalance) || 0 })),
          subtotal: totalLiab
        }
      ],
      totalLiabilities: totalLiab,
      equity: [
        {
          groupName: "Capital & Retained Earnings",
          accounts: equity.map((a) => ({ accountName: a.accountName, balance: Number(a.currentBalance) || 0 })),
          subtotal: totalEq
        }
      ],
      totalEquity: totalEq,
      currentPeriodProfit: netProfit,
      totalLiabilitiesAndEquity: totalLiab + totalEq + netProfit,
      isBalanced: Math.abs(totalAssets - (totalLiab + totalEq + netProfit)) < 1.0
    };
  }

  public async getProfitAndLoss(): Promise<ProfitAndLossReport> {
    const accounts = await this.getLedgerAccounts();
    const revenue = accounts.filter((a) => a.category === "Revenue");
    const expense = accounts.filter((a) => a.category === "Expense");

    const cogsAccount = expense.find((a) => a.accountCode === "ACC-PURCHASE-EXP" || a.accountCode === "5001") || { currentBalance: 0 };
    const indirectExpenses = expense.filter((a) => a !== cogsAccount);

    const totalRev = revenue.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const cogs = Number(cogsAccount.currentBalance) || 0;
    const grossProfit = totalRev - cogs;
    const grossMargin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    const totalIndExp = indirectExpenses.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const netProfit = grossProfit - totalIndExp;
    const netMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    return {
      fromPeriod: `${new Date().getFullYear()}-04-01`,
      toPeriod: new Date().toISOString().split("T")[0],
      revenues: [
        {
          groupName: "Operating Sales Revenue",
          accounts: revenue.map((a) => ({ accountName: a.accountName, balance: Number(a.currentBalance) || 0 })),
          subtotal: totalRev
        }
      ],
      totalRevenue: totalRev,
      costOfGoodsSold: cogs,
      grossProfit,
      grossMarginPercent: grossMargin,
      expenses: [
        {
          groupName: "Administrative & Operating Expenses",
          accounts: indirectExpenses.map((a) => ({ accountName: a.accountName, balance: Number(a.currentBalance) || 0 })),
          subtotal: totalIndExp
        }
      ],
      totalExpenses: totalIndExp,
      netProfitOrLoss: netProfit,
      netMarginPercent: netMargin
    };
  }
}

export const accountingService = new AccountingService();
