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

// Initial Mock Repositories for offline & instant readiness
const DEFAULT_SALTS: SaltMaster[] = [
  {
    id: "salt-1",
    saltName: "Paracetamol + Domperidone",
    therapeuticCategory: "Analgesic & Antiemetic",
    description: "Used for acute fever, body ache accompanied by nausea or gastric discomfort.",
    sideEffectsAlert: "Do not exceed 4g/day. Caution in liver impairment.",
    isHabitForming: false
  },
  {
    id: "salt-2",
    saltName: "Amoxicillin + Clavulanic Acid (625mg)",
    therapeuticCategory: "Broad Spectrum Antibiotic",
    description: "Beta-lactamase inhibitor combination for respiratory, skin and UTI infections.",
    sideEffectsAlert: "Schedule H1 drug. Complete full course as prescribed.",
    isHabitForming: false
  },
  {
    id: "salt-3",
    saltName: "Pantoprazole Gastro-Resistant (40mg)",
    therapeuticCategory: "Proton Pump Inhibitor (PPI)",
    description: "GERD, acidity, peptic ulcers and NSAID-induced gastritis prevention.",
    sideEffectsAlert: "Take 30 minutes before breakfast.",
    isHabitForming: false
  },
  {
    id: "salt-4",
    saltName: "Alprazolam (0.5mg)",
    therapeuticCategory: "Anxiolytic & Sedative (Schedule H1)",
    description: "Management of anxiety disorders and panic episodes.",
    sideEffectsAlert: "Habit forming narcotic. Mandatory prescription audit.",
    isHabitForming: true
  }
];

const DEFAULT_BATCHES: PharmaBatch[] = [
  {
    id: "b-101",
    itemId: "it-aug",
    itemName: "Augmentin 625 Duo Tablet",
    sku: "AUG-625",
    batchNumber: "AG-9941",
    expiryDateMonthYear: "09/27",
    expiryDateUtc: "2027-09-30T00:00:00Z",
    manufacturingDateUtc: "2024-10-01T00:00:00Z",
    mrp: 220,
    purchaseRate: 154,
    saleRate: 200,
    ptr: 176,
    pts: 160,
    currentStock: 140,
    quarantinedStock: 0,
    rackLocation: "Rack A-02",
    barcode: "8901030012345",
    isExpired: false,
    isNearExpiry: false,
    daysToExpiry: 395,
    isQuarantined: false
  },
  {
    id: "b-102",
    itemId: "it-pan",
    itemName: "Pan 40 Tablet",
    sku: "PAN-40",
    batchNumber: "PN-8102",
    expiryDateMonthYear: "10/26",
    expiryDateUtc: "2026-10-31T00:00:00Z",
    mrp: 165,
    purchaseRate: 110,
    saleRate: 150,
    ptr: 132,
    pts: 120,
    currentStock: 95,
    quarantinedStock: 0,
    rackLocation: "Rack B-01",
    barcode: "8901030099881",
    isExpired: false,
    isNearExpiry: true,
    daysToExpiry: 60,
    isQuarantined: false
  },
  {
    id: "b-103",
    itemId: "it-mox",
    itemName: "Moxikind-CV 625 Tablet",
    sku: "MOX-625",
    batchNumber: "MX-5512",
    expiryDateMonthYear: "12/27",
    expiryDateUtc: "2027-12-31T00:00:00Z",
    mrp: 195,
    purchaseRate: 125,
    saleRate: 175,
    ptr: 154,
    pts: 140,
    currentStock: 80,
    quarantinedStock: 0,
    rackLocation: "Rack A-03",
    isExpired: false,
    isNearExpiry: false,
    daysToExpiry: 485,
    isQuarantined: false
  },
  {
    id: "b-104",
    itemId: "it-dxt",
    itemName: "Dextro Cold & Cough Syrup 100ml",
    sku: "DXT-100",
    batchNumber: "DX-1003",
    expiryDateMonthYear: "08/26",
    expiryDateUtc: "2026-08-31T00:00:00Z",
    mrp: 115,
    purchaseRate: 65,
    saleRate: 105,
    ptr: 92,
    pts: 84,
    currentStock: 35,
    quarantinedStock: 0,
    rackLocation: "Cold Storage B-02",
    isExpired: true,
    isNearExpiry: false,
    daysToExpiry: -1,
    isQuarantined: false
  }
];

const DEFAULT_SCHEDULE_H1: ScheduleH1Record[] = [
  {
    id: "h1-1",
    invoiceId: "inv-901",
    invoiceNumber: "INV-2026-0842",
    supplyDate: new Date().toISOString(),
    patientName: "Sunil Sharma",
    patientAddressPhone: "H-41 Laxmi Nagar, Delhi - 9811002233",
    prescriberDoctorName: "Dr. Arvind Mehta",
    prescriberRegNumber: "DMC-44910",
    drugName: "Augmentin 625 Duo Tablet",
    batchNumber: "AG-9941",
    quantitySupplied: 10,
    manufacturerName: "GlaxoSmithKline Pharma",
    signOffStatus: "Verified"
  },
  {
    id: "h1-2",
    invoiceId: "inv-902",
    invoiceNumber: "INV-2026-0843",
    supplyDate: new Date(Date.now() - 86400000).toISOString(),
    patientName: "Meena Gupta",
    patientAddressPhone: "Sector 19, Noida - 9871223344",
    prescriberDoctorName: "Dr. Shweta Rao",
    prescriberRegNumber: "DMC-88219",
    drugName: "Alprazolam 0.5mg",
    batchNumber: "ALP-2041",
    quantitySupplied: 5,
    manufacturerName: "Torrent Pharmaceuticals",
    signOffStatus: "Verified"
  }
];

const DEFAULT_DOCTORS: DoctorPrescriber[] = [
  {
    id: "doc-1",
    code: "DOC-101",
    name: "Dr. Arvind Mehta",
    qualification: "MBBS, MD (Medicine)",
    specialization: "General Physician",
    registrationNumber: "DMC-44910",
    clinicHospitalName: "Mehta Care Clinic",
    address: "B-42, Vikas Marg, Laxmi Nagar",
    city: "Delhi",
    mobile: "9811002233",
    email: "dr.arvind@mehtacare.in",
    assignedMrName: "Rajesh Kumar (East Delhi)",
    commissionPercent: 5,
    totalPrescriptionsValue: 185000,
    totalCommissionPaid: 6500,
    balanceCommission: 2750
  },
  {
    id: "doc-2",
    code: "DOC-102",
    name: "Dr. Shweta Rao",
    qualification: "MBBS, DCH",
    specialization: "Pediatrician",
    registrationNumber: "DMC-88219",
    clinicHospitalName: "Little Star Children Hospital",
    address: "C-12, Sector 18",
    city: "Noida",
    mobile: "9871223344",
    email: "shweta.rao@littlestar.com",
    assignedMrName: "Amit Singhal (Noida)",
    commissionPercent: 7.5,
    totalPrescriptionsValue: 240000,
    totalCommissionPaid: 12000,
    balanceCommission: 6000
  }
];

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

  // --- 5. Doctors Master ---
  public async getDoctors(search?: string): Promise<DoctorPrescriber[]> {
    const res = await apiClient.get<any>("/pharma/doctors", { params: { search } });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }

  public async createDoctor(doc: Omit<DoctorPrescriber, "id" | "code" | "totalPrescriptionsValue" | "totalCommissionPaid" | "balanceCommission">): Promise<DoctorPrescriber> {
    const res = await apiClient.post<any>("/pharma/doctors", doc);
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

  // --- 7. Medical Reps ---
  public async getMedicalReps(search?: string): Promise<any[]> {
    const res = await apiClient.get<any>("/pharma/medical-reps", { params: { search } });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  }
}

export const pharmaDeepService = new PharmaDeepService();
