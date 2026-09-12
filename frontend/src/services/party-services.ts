import { apiClient } from "@/lib/api-client";
import {
  PartyList,
  PartyDetails,
  PartyAddress,
  PartyStatement,
  PagedResponse
} from "@/types";

export interface CreatePartyInput {
  code: string;
  legalName: string;
  tradeName?: string;
  contactPersonName?: string;
  partyType?: number; // 1: Customer, 2: Supplier, 3: Both
  customerType?: number; // 1: B2B, 2: B2C, 3: Retail, 4: Wholesale, 5: Government, 6: Exporter, 7: SEZ
  supplierType?: number; // 1: Manufacturer, 2: Distributor, 3: Importer, 4: LocalVendor
  email?: string;
  primaryPhone?: string;
  mobile?: string;
  secondaryPhone?: string;
  website?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  isCompositionScheme?: boolean;
  drugLicenseNumber1?: string;
  drugLicenseNumber2?: string;
  fssaiNumber?: string;
  creditLimit?: number;
  creditPeriodDays?: number;
  priceTier?: string;
  openingBalance?: number;
  openingBalanceType?: number; // 1: Debit, 2: Credit
  openingBalanceDate?: string;
  attributesJson?: string;
  billingAddress?: {
    addressType: number;
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    country?: string;
  };
}

export interface RecordPaymentInput {
  partyId: string;
  transactionDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
}

export const partyService = {
  // All Parties (Customers & Suppliers)
  async getParties(params?: { partyType?: number; pageSize?: number; searchTerm?: string }): Promise<PagedResponse<PartyList>> {
    if (params?.partyType === 1) return this.getCustomers(params);
    if (params?.partyType === 2) return this.getSuppliers(params);

    const [cust, supp] = await Promise.all([
      this.getCustomers(params).catch(() => ({ items: [], pageNumber: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false })),
      this.getSuppliers(params).catch(() => ({ items: [], pageNumber: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false }))
    ]);
    return {
      items: [...(cust.items || []), ...(supp.items || [])],
      pageNumber: 1,
      pageSize: params?.pageSize || 100,
      totalCount: (cust.totalCount || 0) + (supp.totalCount || 0),
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    };
  },

  // Customers
  async getCustomers(params?: {
    pageNumber?: number;
    pageSize?: number;
    customerType?: number;
    searchTerm?: string;
    outstandingOnly?: boolean;
  }): Promise<PagedResponse<PartyList>> {
    const response = await apiClient.get<PagedResponse<PartyList>>("/tenant/customers", { params });
    return response.data;
  },

  async getCustomerById(id: string): Promise<PartyDetails> {
    const response = await apiClient.get<PartyDetails>(`/tenant/customers/${id}`);
    return response.data;
  },

  async createCustomer(input: CreatePartyInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/customers", input);
    return response.data;
  },

  async updateCustomer(id: string, input: Partial<CreatePartyInput> & { isCreditBlocked?: boolean; isActive?: boolean }): Promise<void> {
    await apiClient.put(`/tenant/customers/${id}`, input);
  },

  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`/tenant/customers/${id}`);
  },

  // Suppliers
  async getSuppliers(params?: {
    pageNumber?: number;
    pageSize?: number;
    supplierType?: number;
    searchTerm?: string;
    outstandingOnly?: boolean;
  }): Promise<PagedResponse<PartyList>> {
    const response = await apiClient.get<PagedResponse<PartyList>>("/tenant/suppliers", { params });
    return response.data;
  },

  async getSupplierById(id: string): Promise<PartyDetails> {
    const response = await apiClient.get<PartyDetails>(`/tenant/suppliers/${id}`);
    return response.data;
  },

  async createSupplier(input: CreatePartyInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/suppliers", input);
    return response.data;
  },

  async updateSupplier(id: string, input: Partial<CreatePartyInput> & { isActive?: boolean }): Promise<void> {
    await apiClient.put(`/tenant/suppliers/${id}`, input);
  },

  async deleteSupplier(id: string): Promise<void> {
    await apiClient.delete(`/tenant/suppliers/${id}`);
  },

  // Statements & Payments
  async getStatement(partyId: string, fromDate: string, toDate: string): Promise<PartyStatement> {
    const response = await apiClient.get<PartyStatement>(`/tenant/parties/${partyId}/statement`, {
      params: { fromDate, toDate }
    });
    return response.data;
  },

  async recordPayment(input: RecordPaymentInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/parties/payments", input);
    return response.data;
  },

  // Addresses
  async getAddresses(partyId: string): Promise<PartyAddress[]> {
    const response = await apiClient.get<PartyAddress[]>(`/tenant/parties/${partyId}/addresses`);
    return response.data;
  },

  async addAddress(partyId: string, input: any): Promise<string> {
    const response = await apiClient.post<string>(`/tenant/parties/${partyId}/addresses`, input);
    return response.data;
  }
};

export interface BrokerItem {
  id: string;
  brokerCode: string;
  fullName: string;
  mobile?: string;
  email?: string;
  address?: string;
  pan?: string;
  gstin?: string;
  commissionBasis: number; // 1: % of Taxable, 2: % of Total, 3: Fixed/Unit, 4: Per Bag/Quintal
  defaultCommissionRate: number;
  tdsPercent: number;
  accrualTrigger: number;
  currentPayableBalance: number;
  isActive: boolean;
  notes?: string;
  createdAtUtc: string;
}

export interface BrokerCommissionEntry {
  id: string;
  brokerId: string;
  brokerName: string;
  salesInvoiceId?: string;
  salesInvoiceNumber?: string;
  transactionDate: string;
  partyId?: string;
  partyName?: string;
  baseAmount: number;
  commissionRate: number;
  grossCommissionAmount: number;
  tdsAmount: number;
  netCommissionPayable: number;
  status: number; // 1: Accrued, 2: Approved, 3: Paid, 4: AdjustedOnReturn, 5: Cancelled
  paidDate?: string;
  paymentReference?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface BrokerSummary {
  brokerId: string;
  brokerCode: string;
  fullName: string;
  mobile?: string;
  totalAccrued: number;
  totalPaid: number;
  currentPayableBalance: number;
  totalInvoicesBrokered: number;
}

export const brokerService = {
  async getBrokers(params?: {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    activeOnly?: boolean;
  }) {
    const response = await apiClient.get<{ items: BrokerItem[]; totalCount: number }>("/tenant/brokers", { params });
    return response.data;
  },

  async getSummaries(): Promise<BrokerSummary[]> {
    const response = await apiClient.get<BrokerSummary[]>("/tenant/brokers/summaries");
    return response.data;
  },

  async getBrokerById(id: string): Promise<BrokerItem> {
    const response = await apiClient.get<BrokerItem>(`/tenant/brokers/${id}`);
    return response.data;
  },

  async createBroker(data: {
    brokerCode: string;
    fullName: string;
    mobile?: string;
    email?: string;
    address?: string;
    pan?: string;
    gstin?: string;
    commissionBasis?: number;
    defaultCommissionRate?: number;
    tdsPercent?: number;
    notes?: string;
  }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/brokers", data);
    return response.data;
  },

  async updateBroker(id: string, data: any): Promise<void> {
    await apiClient.put(`/tenant/brokers/${id}`, data);
  },

  async deleteBroker(id: string): Promise<void> {
    await apiClient.delete(`/tenant/brokers/${id}`);
  },

  async getCommissions(params?: {
    brokerId?: string;
    pageNumber?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const response = await apiClient.get<{ items: BrokerCommissionEntry[]; totalCount: number }>("/tenant/brokers/commissions", { params });
    return response.data;
  },

  async payCommission(data: {
    brokerId: string;
    amount: number;
    paymentMode: string;
    bankAccountId?: string;
    referenceNumber?: string;
    notes?: string;
  }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/brokers/payout", data);
    return response.data;
  }
};

