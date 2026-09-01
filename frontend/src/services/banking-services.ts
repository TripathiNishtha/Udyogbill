import { apiClient } from "@/lib/api-client";

export interface BankAccount {
  id: string;
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  accountType: number; // 1: Current, 2: Savings, 3: CashInHand, 4: CreditCard, 5: PaymentGateway
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  isActive: boolean;
  createdAtUtc: string;
}

export interface CreateBankAccountInput {
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  upiId?: string;
  accountType?: number;
  openingBalance?: number;
  isDefault?: boolean;
}

export interface BankingCashFlowSummary {
  totalBankBalance: number;
  totalCashInHand: number;
  totalLiquidFunds: number;
  inflowThisMonth: number;
  outflowThisMonth: number;
  expensesThisMonth: number;
  accounts: BankAccount[];
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  paidTo: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode: number;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  hasGstInvoice: boolean;
  vendorGstin?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface CreateExpenseInput {
  expenseDate: string;
  categoryId: string;
  paidTo: string;
  amount: number;
  taxAmount?: number;
  paymentMode?: number;
  bankAccountId?: string;
  referenceNumber?: string;
  hasGstInvoice?: boolean;
  vendorGstin?: string;
  notes?: string;
}

export interface RecordVoucherInput {
  partyId: string;
  paymentDate: string;
  amount: number;
  paymentMode: number;
  bankAccountId?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentReceiptVoucherResult {
  voucherId: string;
  voucherNumber: string;
  paymentDate: string;
  partyId: string;
  partyName: string;
  partyCode: string;
  amount: number;
  paymentMode: number;
  bankAccountName?: string;
  referenceNumber?: string;
  partyBalanceAfter: number;
}

export interface CashDrawerSession {
  id: string;
  cashierUserId: string;
  cashierEmail: string;
  openedAtUtc: string;
  closedAtUtc?: string;
  openingFloat: number;
  cashSalesTotal: number;
  cashReceiptsTotal: number;
  cashPayoutsTotal: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  differenceAmount?: number;
  status: number; // 1: Open, 2: Closed, 3: Discrepancy
  closingNotes?: string;
}

export const bankingService = {
  // Accounts
  async getAccounts(): Promise<BankAccount[]> {
    const response = await apiClient.get<BankAccount[]>("/tenant/banking/accounts");
    return response.data;
  },

  async createAccount(input: CreateBankAccountInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/banking/accounts", input);
    return response.data;
  },

  async getCashFlowSummary(): Promise<BankingCashFlowSummary> {
    const response = await apiClient.get<BankingCashFlowSummary>("/tenant/banking/summary");
    return response.data;
  },

  // Payment Vouchers
  async recordCustomerReceipt(input: RecordVoucherInput): Promise<PaymentReceiptVoucherResult> {
    const response = await apiClient.post<PaymentReceiptVoucherResult>("/tenant/banking/vouchers/receipt", input);
    return response.data;
  },

  async recordVendorPayment(input: RecordVoucherInput): Promise<PaymentReceiptVoucherResult> {
    const response = await apiClient.post<PaymentReceiptVoucherResult>("/tenant/banking/vouchers/payment", input);
    return response.data;
  },

  // Expenses
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const response = await apiClient.get<ExpenseCategory[]>("/tenant/expenses/categories");
    return response.data;
  },

  async createExpenseCategory(input: { code: string; name: string; description?: string }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/expenses/categories", input);
    return response.data;
  },

  async getExpenses(params?: { categoryId?: string; fromDate?: string; toDate?: string; pageNumber?: number; pageSize?: number }) {
    const response = await apiClient.get<{ items: ExpenseVoucher[]; totalCount: number }>("/tenant/expenses", { params });
    return response.data;
  },

  async createExpense(input: CreateExpenseInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/expenses", input);
    return response.data;
  },

  // Cash Drawer
  async getCurrentDrawerSession(): Promise<CashDrawerSession> {
    const response = await apiClient.get<CashDrawerSession>("/tenant/cash-drawer/session");
    return response.data;
  },

  async openDrawerSession(input: { openingFloat: number; notes?: string }): Promise<CashDrawerSession> {
    const response = await apiClient.post<CashDrawerSession>("/tenant/cash-drawer/session/open", input);
    return response.data;
  },

  async closeDrawerSession(input: { actualClosingCash: number; closingNotes?: string }): Promise<CashDrawerSession> {
    const response = await apiClient.post<CashDrawerSession>("/tenant/cash-drawer/session/close", input);
    return response.data;
  },
};
