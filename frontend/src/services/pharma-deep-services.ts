import { apiClient } from "@/lib/api-client";

export interface DoctorPrescriber {
  id: string;
  code: string;
  name: string;
  qualification: string; // MBBS, MD, MS, BAMS
  specialization: string; // Cardiologist, General Physician, Pediatrician
  registrationNumber: string; // State Medical Council Reg No.
  clinicHospitalName: string;
  address: string;
  city: string;
  mobile: string;
  email?: string;
  assignedMrName?: string;
  commissionPercent: number;
  totalPrescriptionsValue: number;
  totalCommissionPaid: number;
  balanceCommission: number;
  isActive?: boolean;
}

export interface MedicalRepresentative {
  id: string;
  empCode: string;
  name: string;
  territory: string;
  mobile: string;
  email?: string;
  monthlyTarget: number;
  monthlyAchievement: number;
  achievementPercent: number;
  linkedDoctorsCount: number;
}

export interface PharmaBatch {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  batchNumber: string;
  expiryDateMonthYear: string; // MM/YY
  expiryDateUtc: string;
  manufacturingDateUtc?: string;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  ptr: number; // Price to Retailer
  pts: number; // Price to Stockist
  currentStock: number;
  quarantinedStock: number;
  rackLocation?: string;
  barcode?: string;
  isExpired: boolean;
  isNearExpiry: boolean;
  daysToExpiry: number;
  isQuarantined: boolean;
  packRatio?: number;
  primaryUnit?: string;
  secondaryUnit?: string;
  unitTabletPrice?: number;
}

export interface PharmaDashboardSummary {
  expiringCount30Days: number;
  expiringCount60Days: number;
  expiringCount90Days: number;
  expiringStockValue: number;
  scheduleH1DispensedToday: number;
  quarantinedBatchesCount: number;
  activeBatchesCount: number;
  registeredDoctorsCount: number;
}

export interface SaltMaster {
  id: string;
  saltName: string;
  therapeuticCategory: string;
  description?: string;
  sideEffectsAlert?: string;
  isHabitForming: boolean;
}

export interface ItemSubstitute {
  itemId: string;
  itemName: string;
  sku: string;
  manufacturer: string;
  saltComposition: string;
  mrp: number;
  saleRate: number;
  inStockQuantity: number;
  earliestExpiryBatch: string;
  earliestExpiryDate: string;
  marginPercent: number;
  storageCondition: string;
}

export interface ScheduleH1Record {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplyDate: string;
  patientName: string;
  patientAddressPhone: string;
  prescriberDoctorName: string;
  prescriberRegNumber: string;
  drugName: string;
  batchNumber: string;
  quantitySupplied: number;
  manufacturerName: string;
  signOffStatus: string;
}

export interface ExpiryClaim {
  id: string;
  claimNumber: string;
  supplierId: string;
  supplierName: string;
  claimDate: string;
  totalClaimAmount: number;
  status: "Draft" | "Submitted" | "Acknowledged" | "Reconciled";
  supplierCreditNoteNumber?: string;
  notes?: string;
  items: {
    id: string;
    itemBatchId?: string;
    itemName: string;
    batchNumber: string;
    expiryDateMonthYear: string;
    quantity: number;
    purchaseRate: number;
    claimAmount: number;
    reason: string;
  }[];
}

export interface ExpiryDumpingBatch {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  daysToExpiry: number;
  currentStock: number;
  mrp: number;
  purchaseRate: number;
  totalStockValue: number;
  supplierId: string;
  supplierName: string;
  status: "Active" | "NearExpiry" | "Expired" | "ClaimedReturn";
}

class PharmaDeepService {
  // --- 1. Batches & FEFO ---
  public async getBatches(itemId?: string, includeExpired: boolean = false): Promise<PharmaBatch[]> {
    const res = await apiClient.get<any>("/pharma/batches", {
      params: { itemId, includeExpired }
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async saveBatch(batch: Partial<PharmaBatch>): Promise<PharmaBatch> {
    const res = await apiClient.post<any>("/pharma/batches", {
      id: batch.id,
      itemId: batch.itemId,
      batchNumber: batch.batchNumber,
      expiryDateMonthYear: batch.expiryDateMonthYear,
      mrp: batch.mrp,
      purchaseRate: batch.purchaseRate,
      saleRate: batch.saleRate,
      ptr: batch.ptr,
      pts: batch.pts,
      currentStock: batch.currentStock,
      rackLocation: batch.rackLocation,
      barcode: batch.barcode
    });
    return res.data?.data ?? res.data;
  }

  // --- 2. Salt & Generic Substitutes ---
  public async getSalts(search?: string): Promise<SaltMaster[]> {
    const res = await apiClient.get<any>("/pharma/salts", { params: { search } });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async saveSalt(salt: Partial<SaltMaster>): Promise<SaltMaster> {
    const res = await apiClient.post<any>("/pharma/salts", salt);
    return res.data?.data ?? res.data;
  }

  public async findSubstitutes(searchTerm: string): Promise<ItemSubstitute[]> {
    const res = await apiClient.get<any>(`/pharma/substitutes/${encodeURIComponent(searchTerm)}`);
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  // --- 3. Schedule H1 Regulatory Register ---
  public async getScheduleH1Register(fromDate?: string, toDate?: string): Promise<ScheduleH1Record[]> {
    const res = await apiClient.get<any>("/pharma/h1-register", {
      params: { fromDate, toDate }
    });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async recordScheduleH1Entry(entry: Omit<ScheduleH1Record, "id" | "signOffStatus">): Promise<ScheduleH1Record> {
    const res = await apiClient.post<any>("/pharma/h1-register", entry);
    return res.data?.data ?? res.data;
  }

  // --- 4. Expiry Claims & Supplier Return ---
  public async getExpiryClaims(): Promise<ExpiryClaim[]> {
    const res = await apiClient.get<any>("/pharma/expiry-claims");
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createExpiryClaim(supplierName: string, batches: PharmaBatch[]): Promise<ExpiryClaim> {
    const payload = {
      supplierName,
      claimDate: new Date().toISOString(),
      notes: "Auto-generated Expiry Return Debit Claim Sheet",
      items: batches.map(b => ({
        itemBatchId: b.id.startsWith("b-") ? null : b.id,
        itemName: b.itemName,
        batchNumber: b.batchNumber,
        expiryDateMonthYear: b.expiryDateMonthYear,
        quantity: b.currentStock,
        purchaseRate: b.purchaseRate,
        claimAmount: b.currentStock * b.purchaseRate,
        reason: b.isExpired ? "Expired" : "NearExpiry"
      }))
    };

    const res = await apiClient.post<any>("/pharma/expiry-claims", payload);
    return res.data?.data ?? res.data;
  }

  // --- 5. Doctors & MRs Master ---
  public async getDoctors(search?: string): Promise<DoctorPrescriber[]> {
    const res = await apiClient.get<any>("/pharma/doctors", { params: { search } });
    const raw = res.data?.data ?? res.data;
    const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return list.map((d: any) => ({
      ...d,
      commissionPercent: d.commissionPercent ?? d.incentivePercent ?? 0,
      totalPrescriptionsValue: d.totalPrescriptionsValue ?? 0,
      totalCommissionPaid: d.totalCommissionPaid ?? 0,
      balanceCommission: d.balanceCommission ?? 0,
    }));
  }

  public async createDoctor(doc: Omit<DoctorPrescriber, "id" | "code" | "totalPrescriptionsValue" | "totalCommissionPaid" | "balanceCommission"> & { code?: string }): Promise<DoctorPrescriber> {
    const payload = {
      ...doc,
      code: doc.code || `DOC-${Math.floor(100 + Math.random() * 900)}`,
      commissionPercent: doc.commissionPercent ?? 0,
      incentivePercent: doc.commissionPercent ?? 0,
      isActive: true,
      address: doc.address || "Main Road",
      city: doc.city || "Delhi",
    };
    const res = await apiClient.post<any>("/pharma/doctors", payload);
    const data = res.data?.data ?? res.data;
    return {
      ...data,
      commissionPercent: data?.commissionPercent ?? data?.incentivePercent ?? 0,
      totalPrescriptionsValue: data?.totalPrescriptionsValue ?? 0,
      totalCommissionPaid: data?.totalCommissionPaid ?? 0,
      balanceCommission: data?.balanceCommission ?? 0,
    };
  }

  public async getMedicalReps(search?: string): Promise<MedicalRepresentative[]> {
    const res = await apiClient.get<any>("/pharma/medical-reps", { params: { search } }).catch(() => ({ data: [] }));
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createMedicalRep(mr: Omit<MedicalRepresentative, "id" | "empCode" | "monthlyAchievement" | "achievementPercent" | "linkedDoctorsCount">): Promise<MedicalRepresentative> {
    const res = await apiClient.post<any>("/pharma/medical-reps", mr);
    return res.data?.data ?? res.data;
  }

  // --- 6. Near-Expiry Batches (for Expiry Dumping page) ---
  public async getNearExpiryBatches(): Promise<ExpiryDumpingBatch[]> {
    const allBatches = await this.getBatches(undefined, true);
    const now = new Date();
    const result: ExpiryDumpingBatch[] = [];
    for (const b of allBatches) {
      if (!b.expiryDateMonthYear) continue;
      const [mo, yr] = b.expiryDateMonthYear.split("/").map(Number);
      if (!mo || !yr) continue;
      const expDate = new Date(yr < 100 ? 2000 + yr : yr, mo - 1, 28);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) continue;
      result.push({
        id: b.id,
        itemId: b.itemId,
        itemName: b.itemName,
        sku: b.sku || "",
        batchNumber: b.batchNumber,
        expiryDate: expDate.toISOString(),
        daysToExpiry: diffDays,
        currentStock: b.currentStock,
        mrp: b.mrp,
        purchaseRate: b.purchaseRate,
        totalStockValue: b.currentStock * b.purchaseRate,
        supplierId: "",
        supplierName: "",
        status: b.isExpired ? "Expired" : diffDays <= 30 ? "NearExpiry" : "Active",
      });
    }
    return result;
  }

  // --- 8. Executive Dashboard Metrics ---
  public async getDashboardMetrics(): Promise<PharmaDashboardSummary> {
    try {
      const res = await apiClient.get<any>("/pharma/dashboard-metrics");
      const data = res.data?.data ?? res.data;
      if (data) {
        return {
          expiringCount30Days: data.expiringCount30Days ?? 0,
          expiringCount60Days: data.expiringCount60Days ?? 0,
          expiringCount90Days: data.expiringCount90Days ?? 0,
          expiringStockValue: data.expiringStockValue ?? 0,
          scheduleH1DispensedToday: data.scheduleH1DispensedToday ?? 0,
          quarantinedBatchesCount: data.quarantinedBatchesCount ?? 0,
          activeBatchesCount: data.activeBatchesCount ?? 0,
          registeredDoctorsCount: data.registeredDoctorsCount ?? 0,
        };
      }
    } catch {
      // Fallback defaults
    }
    return {
      expiringCount30Days: 0,
      expiringCount60Days: 0,
      expiringCount90Days: 0,
      expiringStockValue: 0,
      scheduleH1DispensedToday: 0,
      quarantinedBatchesCount: 0,
      activeBatchesCount: 0,
      registeredDoctorsCount: 0,
    };
  }
}

export const pharmaDeepService = new PharmaDeepService();
