import { apiClient } from "@/lib/api-client";

export interface ExpiryAlertBatch {
  batchId: string;
  batchNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  categoryName?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  currentStock: number;
  uomName: string;
  mrp: number;
  totalValueAtRisk: number;
  warehouseName: string;
}

export interface ScheduleH1RegisterRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  doctorRegistrationNumber?: string;
  drugName: string;
  batchNumber: string;
  quantity: number;
  uomName: string;
}

export interface GeneratedVariant {
  variantId: string;
  itemId: string;
  variantSku: string;
  variantName: string;
  size: string;
  color: string;
  fit?: string;
  priceAdjustment: number;
  barcode: string;
}

export interface GenerateMatrixVariantsInput {
  baseItemId: string;
  sizes: string[];
  colors: string[];
  fits?: string[];
  basePriceAdjustment?: number;
}

export interface RecipeIngredient {
  rawMaterialItemId: string;
  rawMaterialName: string;
  rawMaterialSku: string;
  quantityRequired: number;
  uomName: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
}

export interface RecipeBom {
  id: string;
  finishedGoodsItemId: string;
  finishedGoodsName: string;
  finishedGoodsSku: string;
  recipeName: string;
  description?: string;
  outputYieldQuantity: number;
  outputUomName: string;
  ingredients: RecipeIngredient[];
  createdAtUtc: string;
}

export interface CreateRecipeBomInput {
  finishedGoodsItemId: string;
  recipeName: string;
  description?: string;
  outputYieldQuantity: number;
  outputUomId: string;
  ingredients: {
    rawMaterialItemId: string;
    quantityRequired: number;
    uomId: string;
  }[];
}

export interface ExecuteProductionRunInput {
  recipeBomId: string;
  targetWarehouseId: string;
  batchesToProduce: number;
  batchNumber: string;
  expiryDate?: string;
  notes?: string;
}

export interface ProductionRunResult {
  finishedGoodsItemId: string;
  finishedGoodsName: string;
  quantityProduced: number;
  batchNumber: string;
  totalCostOfProduction: number;
  deductedIngredients: {
    itemId: string;
    itemName: string;
    quantityDeducted: number;
    uomName: string;
    stockRemaining: number;
  }[];
}

export interface SerialLifecycle {
  serialNumber: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  currentStatus: string;
  currentWarehouseName: string;
  batchNumber?: string;
  warrantyExpiresAt?: string;
  isWarrantyActive: boolean;
  movementHistory: {
    timestampUtc: string;
    movementType: string;
    documentNumber?: string;
    notes?: string;
  }[];
}

export const industryService = {
  // Pharma
  async getExpiryAlerts(params?: { daysThreshold?: number; warehouseId?: string }): Promise<ExpiryAlertBatch[]> {
    const response = await apiClient.get<ExpiryAlertBatch[]>("/tenant/industry/pharma/expiry-alerts", { params });
    return response.data;
  },

  async getScheduleH1Register(params?: { fromDate?: string; toDate?: string }): Promise<ScheduleH1RegisterRow[]> {
    const response = await apiClient.get<ScheduleH1RegisterRow[]>("/tenant/industry/pharma/schedule-h1", { params });
    return response.data;
  },

  // Apparel & Garments
  async generateMatrixVariants(input: GenerateMatrixVariantsInput): Promise<GeneratedVariant[]> {
    const response = await apiClient.post<GeneratedVariant[]>("/tenant/industry/apparel/matrix-variants", input);
    return response.data;
  },

  // Manufacturing & Recipe BOM
  async getRecipeBoms(): Promise<RecipeBom[]> {
    const response = await apiClient.get<RecipeBom[]>("/tenant/industry/manufacturing/bom");
    return response.data;
  },

  async getRecipeBomById(id: string): Promise<RecipeBom> {
    const response = await apiClient.get<RecipeBom>(`/tenant/industry/manufacturing/bom/${id}`);
    return response.data;
  },

  async createRecipeBom(input: CreateRecipeBomInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/industry/manufacturing/bom", input);
    return response.data;
  },

  async executeProductionRun(input: ExecuteProductionRunInput): Promise<ProductionRunResult> {
    const response = await apiClient.post<ProductionRunResult>("/tenant/industry/manufacturing/production", input);
    return response.data;
  },

  // Electronics
  async getSerialLifecycle(serialNumber: string): Promise<SerialLifecycle> {
    const response = await apiClient.get<SerialLifecycle>(`/tenant/industry/electronics/serials/${serialNumber}`);
    return response.data;
  },
};
