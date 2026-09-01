import { apiClient } from "@/lib/api-client";

export interface Transporter {
  id: string;
  transporterId: string;
  legalName: string;
  transporterGstin?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  defaultVehicleNumber?: string;
  defaultTransportMode: number;
  isActive: boolean;
}

export interface DeliveryChallanItem {
  id: string;
  itemId?: string;
  itemCode: string;
  itemName: string;
  hsnCode?: string;
  batchNumber?: string;
  serialNumber?: string;
  quantity: number;
  unitName: string;
  packageCount: number;
  unitWeightKg: number;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  challanDate: string;
  salesInvoiceId?: string;
  salesInvoiceNumber?: string;
  customerPartyId: string;
  customerName: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  dispatchStatus: number; // 1: Pending, 2: Dispatched, 3: InTransit, 4: OutForDelivery, 5: Delivered, 6: Cancelled
  transporterId?: string;
  transporterName?: string;
  transporterGstin?: string;
  transportMode: number;
  vehicleNumber?: string;
  vehicleType: number;
  driverName?: string;
  driverMobile?: string;
  transportDocNumber?: string;
  transportDocDate?: string;
  distanceKm: number;
  eWayBillNumber?: string;
  eWayBillDate?: string;
  eWayBillValidUntil?: string;
  totalWeightKg: number;
  totalPackages: number;
  dispatchNotes?: string;
  dispatchedAtUtc?: string;
  deliveredAtUtc?: string;
  proofOfDeliveryUrl?: string;
  items: DeliveryChallanItem[];
}

export interface EWayBillResult {
  eWayBillId: string;
  eWayBillNumber: string;
  generatedAtUtc: string;
  validUntilUtc: string;
  docNo: string;
  fromGstin: string;
  toGstin: string;
  totalInvoiceValue: number;
  status: string;
  nicJsonPayload: string;
}

export const logisticsService = {
  // Transporters
  async getTransporters(): Promise<Transporter[]> {
    const response = await apiClient.get<Transporter[]>("/tenant/logistics/transporters");
    return response.data;
  },

  async createTransporter(input: {
    transporterId: string;
    legalName: string;
    transporterGstin?: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    defaultVehicleNumber?: string;
  }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/logistics/transporters", input);
    return response.data;
  },

  // Challans
  async getChallans(status?: number): Promise<{ items: DeliveryChallan[]; totalCount: number }> {
    const query = status !== undefined ? `?status=${status}` : "";
    const response = await apiClient.get<{ items: DeliveryChallan[]; totalCount: number }>(`/tenant/logistics/challans${query}`);
    return response.data;
  },

  async getChallanById(id: string): Promise<DeliveryChallan> {
    const response = await apiClient.get<DeliveryChallan>(`/tenant/logistics/challans/${id}`);
    return response.data;
  },

  async createChallan(input: any): Promise<string> {
    const response = await apiClient.post<string>("/tenant/logistics/challans", input);
    return response.data;
  },

  async createChallanFromInvoice(invoiceId: string, params?: { vehicleNumber?: string; transporterId?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.vehicleNumber) query.append("vehicleNumber", params.vehicleNumber);
    if (params?.transporterId) query.append("transporterId", params.transporterId);

    const response = await apiClient.post<string>(`/tenant/logistics/challans/from-invoice/${invoiceId}?${query.toString()}`, {});
    return response.data;
  },

  async updateDispatchStatus(id: string, input: { newStatus: number; notes?: string; proofOfDeliveryUrl?: string }): Promise<DeliveryChallan> {
    const response = await apiClient.post<DeliveryChallan>(`/tenant/logistics/challans/${id}/status`, input);
    return response.data;
  },

  // E-Way Bill
  async generateEWayBill(input: {
    deliveryChallanId?: string;
    salesInvoiceId?: string;
    vehicleNumber?: string;
    transporterId?: string;
    distanceKm?: number;
  }): Promise<EWayBillResult> {
    const response = await apiClient.post<EWayBillResult>("/tenant/logistics/eway-bills/generate", input);
    return response.data;
  },
};
