import { apiClient } from "@/lib/api-client";

export interface SeatQuotaStatus {
  isPharmaSfaActive: boolean;
  maxAllowedMrUsers: number;
  currentActiveMrUsers: number;
  canAddMoreMr: boolean;
  maxAllowedManagerUsers: number;
  currentActiveManagerUsers: number;
  canAddMoreManager: boolean;
}

export interface SfaDivision {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  totalEmployeesCount?: number;
  totalPatchesCount?: number;
}

export interface SfaTerritory {
  id: string;
  code: string;
  name: string;
  type: number;
  parentTerritoryId?: string;
  parentTerritoryName?: string;
  state?: string;
  city?: string;
  coveredPincodes?: string;
  isActive: boolean;
}

export interface SfaPatch {
  id: string;
  code: string;
  name: string;
  divisionId?: string;
  divisionName?: string;
  areaTerritoryId?: string;
  areaTerritoryName?: string;
  headquarterCity?: string;
  description?: string;
  isActive: boolean;
  totalBeatsCount?: number;
  totalDoctorsCount?: number;
  totalChemistsCount?: number;
}

export interface SfaBeat {
  id: string;
  code: string;
  name: string;
  patchId: string;
  patchName?: string;
  scheduledDayOfWeek?: number;
  sequenceOrder: number;
  routeDescription?: string;
  estimatedDistanceKm: number;
  isActive: boolean;
  totalDoctorsCount?: number;
  totalChemistsCount?: number;
}

export interface SfaEmployeeProfile {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile?: string;
  gender?: string;
  designationRole: number; // 1=MR, 2=ABM, 3=RSM, 4=ZSM, 5=NSM
  designationTitle: string;
  divisionId?: string;
  divisionName?: string;
  territoryId?: string;
  territoryName?: string;
  patchId?: string;
  patchName?: string;
  reportingToUserId?: string;
  reportingToName?: string;
  headquarterCity: string;
  joiningDate: string;
  dailyAllowanceRate: number;
  monthlyExpenseLimit: number;
  monthlyTargetAmount: number;
  isActive: boolean;
}

export interface SfaDoctorAllocationHistory {
  id: string;
  doctorId: string;
  doctorName: string;
  fromMrUserId?: string;
  fromMrName?: string;
  toMrUserId: string;
  toMrName: string;
  effectiveDate: string;
  reason: string;
  createdAtUtc: string;
}

export interface SfaDoctor {
  id: string;
  code: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  priority?: string;
  qualification: string;
  registrationNumber: string;
  clinicHospitalName: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  mobile: string;
  email?: string;
  divisionId?: string;
  divisionName?: string;
  territoryId?: string;
  territoryName?: string;
  patchId?: string;
  patchName?: string;
  beatId?: string;
  beatName?: string;
  assignedMrUserId?: string;
  assignedMrName?: string;
  classification: string;
  visitFrequencyPerMonth: number;
  preferredVisitDay?: string;
  preferredVisitTime?: string;
  estimatedMonthlyPotential: number;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  isActive: boolean;
}

export interface SfaChemist {
  id: string;
  code: string;
  shopName: string;
  contactPerson: string;
  drugLicenseNumber: string;
  gstin?: string;
  mobile: string;
  email?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  territoryId?: string;
  territoryName?: string;
  patchId?: string;
  patchName?: string;
  beatId?: string;
  beatName?: string;
  assignedMrUserId?: string;
  assignedMrName?: string;
  preferredStockistPartyId?: string;
  preferredStockistName?: string;
  preferredVisitDay?: string;
  potentialCategory: string;
  isActive: boolean;
}

export interface BulkDoctorImportItem {
  code?: string;
  name: string;
  specialty?: string;
  subSpecialty?: string;
  qualification?: string;
  registrationNumber?: string;
  clinicHospitalName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  mobile: string;
  email?: string;
  classification?: string;
  visitFrequencyPerMonth?: number;
  preferredVisitDay?: string;
  preferredVisitTime?: string;
  estimatedMonthlyPotential?: number;
  divisionCodeOrName?: string;
  patchCodeOrName?: string;
  beatCodeOrName?: string;
  assignedMrEmployeeCodeOrName?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
}

export interface BulkChemistImportItem {
  code?: string;
  shopName: string;
  contactPerson?: string;
  drugLicenseNumber?: string;
  gstin?: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  potentialCategory?: string;
  preferredVisitDay?: string;
  preferredStockistNameOrCode?: string;
  patchCodeOrName?: string;
  beatCodeOrName?: string;
  assignedMrEmployeeCodeOrName?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
}

export interface BulkImportResult {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  warnings: string[];
}

export interface SfaStockistAllocation {
  id: string;
  stockistPartyId: string;
  stockistName: string;
  stockistGstin?: string;
  mrUserId: string;
  mrName: string;
  territoryId?: string;
  territoryName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  allocationType: string;
  isActive: boolean;
  notes?: string;
}

export interface SfaTourPlanItem {
  id: string;
  planDate: string;
  activityType: string; // FieldWork, Sunday, Holiday, Leave, Meeting, Conference
  routeOrBeatName: string;
  territoryId?: string;
  territoryName?: string;
  patchId?: string;
  patchName?: string;
  beatId?: string;
  beatName?: string;
  plannedDoctorCalls: number;
  plannedChemistCalls: number;
  plannedStockistCalls: number;
  targetDoctorIdsJson?: string;
  targetDoctorNames?: string[];
  remarks?: string;
}

export interface SfaTourPlan {
  id: string;
  mrUserId: string;
  mrName: string;
  month: number;
  year: number;
  status: number; // 0=Draft, 1=Submitted, 2=Approved, 3=Rejected
  managerRemarks?: string;
  items: SfaTourPlanItem[];
}

export interface DoctorComplianceItem {
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  specialty: string;
  classification: string;
  patchName?: string;
  beatName?: string;
  targetMonthlyCalls: number;
  plannedCalls: number;
  executedCalls: number;
  isCompliant: boolean;
}

export interface DoctorFrequencyCompliance {
  totalAssignedDoctors: number;
  superCoreCount: number;
  coreCount: number;
  standardCount: number;
  basicCount: number;
  totalTargetCalls: number;
  totalPlannedCalls: number;
  totalExecutedCalls: number;
  coveragePercent: number;
  doctorBreakdown: DoctorComplianceItem[];
}

export interface SfaDailyCallReport {
  id: string;
  dcrNumber: string;
  dcrDate: string;
  mrUserId: string;
  mrName: string;
  attendanceStatus: string;
  workType: string;
  routeOrArea: string;
  totalDoctorsVisited: number;
  totalChemistsVisited: number;
  totalStockistsVisited: number;
  totalPobBookedAmount: number;
  status: number;
  managerRemarks?: string;
}

export interface MrSalesAttribution {
  id: string;
  salesInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  stockistPartyId: string;
  stockistName: string;
  mrUserId: string;
  mrName: string;
  invoiceTotalAmount: number;
  taxableAmount: number;
  attributedAtUtc: string;
  attributionMethod: string;
}

export interface PharmaReconciliationReport {
  fromDate: string;
  toDate: string;
  totalCoreInvoiceSales: number;
  totalStockistSales: number;
  totalMrAttributedSales: number;
  discrepancyAmount: number;
  isReconciled: boolean;
  totalInvoicesCount: number;
  attributedInvoicesCount: number;
  unattributedInvoicesCount: number;
}

export interface MrTargetVsAchievement {
  mrUserId: string;
  mrName: string;
  month: number;
  year: number;
  targetSalesAmount: number;
  achievedSalesAmount: number;
  salesAchievementPercent: number;
  targetDoctorCalls: number;
  achievedDoctorCalls: number;
  doctorCallsAchievementPercent: number;
}

export interface SfaSampleStock {
  id: string;
  mrUserId: string;
  mrName?: string;
  itemId: string;
  itemName: string;
  batchNumber: string;
  expiryMonthYear: string;
  quantityAllocated: number;
  quantityDistributed: number;
  currentStockInBag: number;
}

export interface SeedDemoDataResponse {
  doctorsCount: number;
  employeesCount: number;
  beatsCount: number;
  schemesCount: number;
  chemistsCount: number;
  stockistsCount: number;
  samplesCount: number;
  pobOrdersCount: number;
  message: string;
}

// Sprint 5 Interfaces
export interface SfaSchemeSlab {
  id: string;
  schemeMasterId: string;
  minQuantity: number;
  maxQuantity?: number;
  freeQuantity: number;
  discountPercent: number;
  flatDiscountAmount: number;
  freeItemId?: string;
  freeItemName?: string;
}

export interface SfaSchemeMaster {
  id: string;
  schemeCode: string;
  schemeName: string;
  divisionId?: string;
  divisionName?: string;
  itemId?: string;
  itemName?: string;
  schemeType: number; // 1=FreeGoods, 2=PercentageDiscount, 3=FlatDiscount
  schemeTypeName: string;
  validFromUtc: string;
  validToUtc: string;
  minimumOrderQuantity: number;
  minimumOrderValue?: number;
  isActive: boolean;
  description?: string;
  slabs: SfaSchemeSlab[];
}

export interface CreateSchemeSlabRequest {
  minQuantity: number;
  maxQuantity?: number;
  freeQuantity: number;
  discountPercent: number;
  flatDiscountAmount: number;
  freeItemId?: string;
}

export interface CreateSchemeRequest {
  schemeCode?: string;
  schemeName: string;
  divisionId?: string;
  itemId?: string;
  schemeType: number;
  validFromUtc: string;
  validToUtc: string;
  minimumOrderQuantity: number;
  minimumOrderValue?: number;
  description?: string;
  slabs: CreateSchemeSlabRequest[];
}

export interface CalculateSchemeRequest {
  itemId: string;
  quantity: number;
  divisionId?: string;
}

export interface CalculatedSchemeResult {
  schemeId?: string;
  schemeCode?: string;
  schemeName: string;
  schemeType: number;
  freeQuantity: number;
  discountPercent: number;
  flatDiscountAmount: number;
  freeItemId?: string;
  freeItemName?: string;
  originalQuantity: number;
  effectivePriceMultiplier: number;
}

export interface SfaPobOrderItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRatePercent: number;
  totalAmount: number;
  appliedSchemeId?: string;
  appliedSchemeName?: string;
  itemCode?: string;
}

export interface SfaPobOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  mrUserId: string;
  mrName: string;
  customerPartyId: string;
  customerName: string;
  targetStockistPartyId?: string;
  targetStockistName?: string;
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  status: string;
  stockistFulfillmentStatus: string;
  stockistRemarks?: string;
  expectedDeliveryDate?: string;
  convertedSalesInvoiceId?: string;
  remarks?: string;
  items: SfaPobOrderItem[];
}

export interface CreatePobOrderItemRequest {
  itemId: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRatePercent: number;
  appliedSchemeId?: string;
  appliedSchemeName?: string;
}

export interface CreatePobOrderRequest {
  customerPartyId: string;
  targetStockistPartyId?: string;
  orderDate: string;
  clientOfflineId?: string;
  remarks?: string;
  items: CreatePobOrderItemRequest[];
}

export interface UpdatePobFulfillmentStatusRequest {
  pobOrderId: string;
  fulfillmentStatus: string;
  stockistRemarks?: string;
  expectedDeliveryDate?: string;
}

export interface RoutePobToStockistRequest {
  pobOrderId: string;
  targetStockistPartyId: string;
  remarks?: string;
}

export interface SecondarySalesReconciliation {
  stockistPartyId: string;
  stockistName: string;
  stockistGstin?: string;
  territoryName?: string;
  totalPrimarySalesAmount: number;
  totalPrimaryInvoicesCount: number;
  totalSecondaryPobAmount: number;
  totalSecondaryOrdersCount: number;
  secondaryToPrimaryRatioPercent: number;
  estimatedStockHoldingValue: number;
  stockTurnoverHealth: string;
}

export const pharmaSfaService = {
  // Seat Quotas
  async getQuotaStatus(): Promise<SeatQuotaStatus> {
    const res = await apiClient.get<SeatQuotaStatus>("/tenant/sfa/quota");
    return res.data;
  },

  // Divisions
  async getDivisions(): Promise<SfaDivision[]> {
    const res = await apiClient.get<SfaDivision[]>("/tenant/sfa/divisions");
    return res.data;
  },

  async createDivision(data: { code: string; name: string; description?: string }): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/divisions", data);
    return res.data;
  },

  // Territories
  async getTerritories(): Promise<SfaTerritory[]> {
    const res = await apiClient.get<SfaTerritory[]>("/tenant/sfa/territories");
    return res.data;
  },

  async createTerritory(data: Partial<SfaTerritory>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/territories", data);
    return res.data;
  },

  // Patches
  async getPatches(divisionId?: string, areaTerritoryId?: string): Promise<SfaPatch[]> {
    const params = new URLSearchParams();
    if (divisionId) params.append("divisionId", divisionId);
    if (areaTerritoryId) params.append("areaTerritoryId", areaTerritoryId);
    const res = await apiClient.get<SfaPatch[]>(`/tenant/sfa/patches?${params.toString()}`);
    return res.data;
  },

  async createPatch(data: Partial<SfaPatch>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/patches", data);
    return res.data;
  },

  // Beats
  async getBeats(patchId?: string): Promise<SfaBeat[]> {
    const params = new URLSearchParams();
    if (patchId) params.append("patchId", patchId);
    const res = await apiClient.get<SfaBeat[]>(`/tenant/sfa/beats?${params.toString()}`);
    return res.data;
  },

  async createBeat(data: Partial<SfaBeat>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/beats", data);
    return res.data;
  },

  // Employees / Field Force
  async getEmployees(divisionId?: string, role?: number): Promise<SfaEmployeeProfile[]> {
    const params = new URLSearchParams();
    if (divisionId) params.append("divisionId", divisionId);
    if (role !== undefined) params.append("role", role.toString());
    const res = await apiClient.get<SfaEmployeeProfile[]>(`/tenant/sfa/employees?${params.toString()}`);
    return res.data;
  },

  async createOrUpdateEmployee(data: Partial<SfaEmployeeProfile> & { password?: string }): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/employees", data);
    return res.data;
  },

  // Doctors
  async getDoctors(filters?: { territoryId?: string; patchId?: string; beatId?: string; mrUserId?: string } | string, legacyMrId?: string): Promise<SfaDoctor[]> {
    const params = new URLSearchParams();
    if (typeof filters === "string") {
      if (filters) params.append("territoryId", filters);
      if (legacyMrId) params.append("mrUserId", legacyMrId);
    } else if (filters) {
      if (filters.territoryId) params.append("territoryId", filters.territoryId);
      if (filters.patchId) params.append("patchId", filters.patchId);
      if (filters.beatId) params.append("beatId", filters.beatId);
      if (filters.mrUserId) params.append("mrUserId", filters.mrUserId);
    }
    const res = await apiClient.get<SfaDoctor[]>(`/tenant/sfa/doctors?${params.toString()}`);
    return res.data;
  },

  async createDoctor(data: Partial<SfaDoctor>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/doctors", data);
    return res.data;
  },

  async bulkImportDoctors(items: BulkDoctorImportItem[], overwriteExisting = false): Promise<BulkImportResult> {
    const res = await apiClient.post<BulkImportResult>("/tenant/sfa/doctors/bulk-import", {
      items,
      overwriteExisting
    });
    return res.data;
  },

  async reallocateDoctor(data: { doctorId: string; newMrUserId: string; effectiveDate: string; reason: string }): Promise<boolean> {
    const res = await apiClient.post<boolean>("/tenant/sfa/doctors/reallocate", data);
    return res.data;
  },

  async getDoctorHistories(doctorId: string): Promise<SfaDoctorAllocationHistory[]> {
    const res = await apiClient.get<SfaDoctorAllocationHistory[]>(`/tenant/sfa/doctors/${doctorId}/histories`);
    return res.data;
  },

  // Chemists
  async getChemists(filters?: { territoryId?: string; patchId?: string; beatId?: string; mrUserId?: string } | string, legacyMrId?: string): Promise<SfaChemist[]> {
    const params = new URLSearchParams();
    if (typeof filters === "string") {
      if (filters) params.append("territoryId", filters);
      if (legacyMrId) params.append("mrUserId", legacyMrId);
    } else if (filters) {
      if (filters.territoryId) params.append("territoryId", filters.territoryId);
      if (filters.patchId) params.append("patchId", filters.patchId);
      if (filters.beatId) params.append("beatId", filters.beatId);
      if (filters.mrUserId) params.append("mrUserId", filters.mrUserId);
    }
    const res = await apiClient.get<SfaChemist[]>(`/tenant/sfa/chemists?${params.toString()}`);
    return res.data;
  },

  async createChemist(data: Partial<SfaChemist>): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/chemists", data);
    return res.data;
  },

  async bulkImportChemists(items: BulkChemistImportItem[], overwriteExisting = false): Promise<BulkImportResult> {
    const res = await apiClient.post<BulkImportResult>("/tenant/sfa/chemists/bulk-import", {
      items,
      overwriteExisting
    });
    return res.data;
  },

  // Stockist Allocations (Historical)
  async getStockistAllocations(stockistPartyId?: string): Promise<SfaStockistAllocation[]> {
    const params = new URLSearchParams();
    if (stockistPartyId) params.append("stockistPartyId", stockistPartyId);
    const res = await apiClient.get<SfaStockistAllocation[]>(`/tenant/sfa/stockists?${params.toString()}`);
    return res.data;
  },

  async allocateStockist(data: {
    stockistPartyId: string;
    mrUserId: string;
    territoryId?: string;
    effectiveFrom: string;
    allocationType?: string;
    notes?: string;
  }): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/stockists/allocate", data);
    return res.data;
  },

  // Tour Plans
  async getTourPlans(month: number, year: number, mrUserId?: string): Promise<SfaTourPlan[]> {
    const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
    if (mrUserId) params.append("mrUserId", mrUserId);
    const res = await apiClient.get<SfaTourPlan[]>(`/tenant/sfa/tour-plans?${params.toString()}`);
    return res.data;
  },

  async autoGenerateTourPlan(mrUserId: string, month: number, year: number, customHolidays?: string[]): Promise<SfaTourPlan> {
    const res = await apiClient.post<SfaTourPlan>("/tenant/sfa/tour-plans/auto-generate", {
      mrUserId,
      month,
      year,
      customHolidays: customHolidays ? customHolidays.map(d => new Date(d).toISOString()) : []
    });
    return res.data;
  },

  async getDoctorFrequencyCompliance(mrUserId: string, month: number, year: number): Promise<DoctorFrequencyCompliance> {
    const params = new URLSearchParams({
      mrUserId,
      month: month.toString(),
      year: year.toString()
    });
    const res = await apiClient.get<DoctorFrequencyCompliance>(`/tenant/sfa/tour-plans/compliance?${params.toString()}`);
    return res.data;
  },

  async submitTourPlan(data: any): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/tour-plans", data);
    return res.data;
  },

  async submitTourPlanForApproval(id: string): Promise<boolean> {
    const res = await apiClient.post<boolean>(`/tenant/sfa/tour-plans/${id}/submit`);
    return res.data;
  },

  async reviewTourPlan(id: string, isApproved: boolean, remarks?: string): Promise<boolean> {
    const res = await apiClient.put<boolean>(`/tenant/sfa/tour-plans/${id}/review?isApproved=${isApproved}&remarks=${encodeURIComponent(remarks || "")}`, {
      isApproved,
      remarks
    });
    return res.data;
  },

  // DCR & Samples
  async getDcrs(fromDate?: string, toDate?: string, mrUserId?: string): Promise<SfaDailyCallReport[]> {
    const params = new URLSearchParams();
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (mrUserId) params.append("mrUserId", mrUserId);
    const res = await apiClient.get<SfaDailyCallReport[]>(`/tenant/sfa/dcrs?${params.toString()}`);
    return res.data;
  },

  async submitDcr(data: any): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/dcrs", data);
    return res.data;
  },

  async getMrSampleStock(mrUserId?: string): Promise<SfaSampleStock[]> {
    const params = new URLSearchParams();
    if (mrUserId) params.append("mrUserId", mrUserId);
    const res = await apiClient.get<SfaSampleStock[]>(`/tenant/sfa/sample-stock?${params.toString()}`);
    return res.data;
  },

  async seedDemoData(): Promise<SeedDemoDataResponse> {
    const res = await apiClient.post<SeedDemoDataResponse>("/tenant/sfa/seed-demo-data");
    return res.data;
  },

  // Attribution & Reconciliation
  async getSalesAttributions(fromDate: string, toDate: string, mrUserId?: string): Promise<MrSalesAttribution[]> {
    const params = new URLSearchParams({ fromDate, toDate });
    if (mrUserId) params.append("mrUserId", mrUserId);
    const res = await apiClient.get<MrSalesAttribution[]>(`/tenant/sfa/reports/sales-attribution?${params.toString()}`);
    return res.data;
  },

  async getReconciliationReport(fromDate: string, toDate: string): Promise<PharmaReconciliationReport> {
    const params = new URLSearchParams({ fromDate, toDate });
    const res = await apiClient.get<PharmaReconciliationReport>(`/tenant/sfa/reports/reconciliation?${params.toString()}`);
    return res.data;
  },

  async getTargetVsAchievement(month: number, year: number): Promise<MrTargetVsAchievement[]> {
    const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
    const res = await apiClient.get<MrTargetVsAchievement[]>(`/tenant/sfa/reports/target-achievement?${params.toString()}`);
    return res.data;
  },

  // Sprint 5: Trade Schemes, POB Routing & Secondary Reconciliation
  async getSchemes(params?: { divisionId?: string; itemId?: string; activeOnly?: boolean }): Promise<SfaSchemeMaster[]> {
    const sp = new URLSearchParams();
    if (params?.divisionId) sp.append("divisionId", params.divisionId);
    if (params?.itemId) sp.append("itemId", params.itemId);
    if (params?.activeOnly !== undefined) sp.append("activeOnly", params.activeOnly.toString());
    const res = await apiClient.get<SfaSchemeMaster[]>(`/tenant/sfa/schemes?${sp.toString()}`);
    return res.data;
  },

  async createOrUpdateScheme(data: CreateSchemeRequest): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/schemes", data);
    return res.data;
  },

  async evaluateScheme(data: CalculateSchemeRequest): Promise<CalculatedSchemeResult> {
    const res = await apiClient.post<CalculatedSchemeResult>("/tenant/sfa/schemes/evaluate", data);
    return res.data;
  },

  async getPobOrders(params?: {
    fromDate?: string;
    toDate?: string;
    mrUserId?: string;
    customerPartyId?: string;
    targetStockistPartyId?: string;
    status?: string;
  }): Promise<SfaPobOrder[]> {
    const sp = new URLSearchParams();
    if (params?.fromDate) sp.append("fromDate", params.fromDate);
    if (params?.toDate) sp.append("toDate", params.toDate);
    if (params?.mrUserId) sp.append("mrUserId", params.mrUserId);
    if (params?.customerPartyId) sp.append("customerPartyId", params.customerPartyId);
    if (params?.targetStockistPartyId) sp.append("targetStockistPartyId", params.targetStockistPartyId);
    if (params?.status) sp.append("status", params.status);
    const res = await apiClient.get<SfaPobOrder[]>(`/tenant/sfa/pob-orders?${sp.toString()}`);
    return res.data;
  },

  async createPobOrder(data: CreatePobOrderRequest): Promise<string> {
    const res = await apiClient.post<string>("/tenant/sfa/pob-orders", data);
    return res.data;
  },

  async convertPobToInvoice(pobOrderId: string, warehouseId: string): Promise<string> {
    const res = await apiClient.post<string>(`/tenant/sfa/pob-orders/${pobOrderId}/convert-to-invoice?warehouseId=${warehouseId}`);
    return res.data;
  },

  async updatePobFulfillmentStatus(data: UpdatePobFulfillmentStatusRequest): Promise<boolean> {
    const res = await apiClient.post<boolean>("/tenant/sfa/pob-orders/fulfillment-status", data);
    return res.data;
  },

  async routePobToStockist(data: RoutePobToStockistRequest): Promise<boolean> {
    const res = await apiClient.post<boolean>("/tenant/sfa/pob-orders/route", data);
    return res.data;
  },

  async getSecondarySalesReconciliation(params?: { fromDate?: string; toDate?: string }): Promise<SecondarySalesReconciliation[]> {
    const sp = new URLSearchParams();
    if (params?.fromDate) sp.append("fromDate", params.fromDate);
    if (params?.toDate) sp.append("toDate", params.toDate);
    const res = await apiClient.get<SecondarySalesReconciliation[]>(`/tenant/sfa/attribution/secondary-reconciliation?${sp.toString()}`);
    return res.data;
  },

  // SuperAdmin Pricing Engine
  async calculateQuote(isAnnual: boolean, mrSeats: number, managerSeats: number) {
    const res = await apiClient.get(`/superadmin/pharma-sfa/calculate-quote?isAnnual=${isAnnual}&mrSeats=${mrSeats}&managerSeats=${managerSeats}`);
    return res.data;
  },

  async activatePharmaAddon(tenantId: string, isAnnual: boolean, mrSeats: number, managerSeats: number) {
    const res = await apiClient.post(`/superadmin/pharma-sfa/activate`, {
      tenantId,
      isAnnual,
      mrSeats,
      managerSeats
    });
    return res.data;
  },

  async deactivatePharmaAddon(tenantId: string) {
    const res = await apiClient.post(`/superadmin/pharma-sfa/deactivate/${tenantId}`);
    return res.data;
  },

  // Geofencing & Location Compliance
  async getGeofenceConfig(): Promise<SfaGeofenceConfig> {
    const res = await apiClient.get<SfaGeofenceConfig>("/tenant/sfa/geofence-config");
    return res.data;
  },

  async updateGeofenceConfig(data: SfaGeofenceConfig): Promise<boolean> {
    const res = await apiClient.put<boolean>("/tenant/sfa/geofence-config", data);
    return res.data;
  },

  async updateDoctorLocation(doctorId: string, data: UpdateEntityLocation): Promise<boolean> {
    const res = await apiClient.put<boolean>(`/tenant/sfa/doctors/${doctorId}/location`, data);
    return res.data;
  },

  async updateChemistLocation(chemistId: string, data: UpdateEntityLocation): Promise<boolean> {
    const res = await apiClient.put<boolean>(`/tenant/sfa/chemists/${chemistId}/location`, data);
    return res.data;
  }
};

export interface SfaGeofenceConfig {
  isGeofencingEnabled: boolean;
  geofenceRadiusMeters: number;
  allowOutOfRangeWithReason: boolean;
}

export interface UpdateEntityLocation {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
}

export const superAdminPharmaSfaService = {
  calculateQuote: pharmaSfaService.calculateQuote,
  activatePharmaAddon: pharmaSfaService.activatePharmaAddon,
  deactivatePharmaAddon: pharmaSfaService.deactivatePharmaAddon
};
