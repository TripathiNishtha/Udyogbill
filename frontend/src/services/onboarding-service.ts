import { apiClient } from "@/lib/api-client";
import { StandardProductRow } from "@/lib/fuzzy-migrator";

export interface GstinLookupData {
  gstin: string;
  legalName: string;
  tradeName: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  pincode: string;
  gstType: string;
  isActive: boolean;
  isComposition: boolean;
}

export interface OnboardingStatus {
  hasStoreDetails: boolean;
  hasProducts: boolean;
  productCount: number;
  hasParties: boolean;
  partyCount: number;
  hasInvoices: boolean;
  invoiceCount: number;
  hasUpiQr: boolean;
  upiId?: string;
  completionPercentage: number;
  isCompleted: boolean;
}

export const onboardingService = {
  async lookupGstin(gstin: string): Promise<GstinLookupData> {
    const response = await apiClient.post<GstinLookupData>("/tenant/onboarding/gstin-lookup", { gstin });
    return response.data;
  },

  async seedIndustryCatalog(industryType: string): Promise<{ seededCount: number; message: string; sampleItemNames: string[] }> {
    const response = await apiClient.post("/tenant/onboarding/seed-catalog", { industryType });
    return response.data;
  },

  async getStatus(): Promise<OnboardingStatus> {
    const response = await apiClient.get<OnboardingStatus>("/tenant/onboarding/status");
    return response.data;
  },

  async completeOnboarding(data: {
    businessName?: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
    address?: string;
    pincode?: string;
    upiId?: string;
    primaryPhone?: string;
  }): Promise<void> {
    await apiClient.post("/tenant/onboarding/complete", data);
  },

  async importMigratedProducts(products: StandardProductRow[]): Promise<{ importedCount: number; errorCount: number }> {
    const payload = {
      products: products.map((p, idx) => ({
        sku: p.sku || `MIG-${Date.now().toString().slice(-4)}-${(idx + 1).toString().padStart(4, "0")}`,
        name: p.name,
        categoryName: p.category || "General",
        brandName: "Standard",
        hsnCode: p.hsn || "30049099",
        barcode: null,
        primaryUom: p.unit || "PCS",
        taxRate: Number(p.taxRate) || 12,
        cessRate: 0,
        purchasePrice: Number(p.purchasePrice) || (Number(p.salePrice) * 0.8) || 0,
        salePrice: Number(p.salePrice) || 0,
        mrp: Number(p.mrp) || Number(p.salePrice) || 0,
        minimumStockAlert: 0,
        reorderQuantity: 0,
        openingStock: Number(p.openingStock) || 0,
        batchNumber: p.batchNumber || null,
        expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
        rackLocation: null,
        description: "Migrated from previous software"
      })),
      overwriteExisting: true
    };
    const response = await apiClient.post("/tenant/import/products", payload);
    return {
      importedCount: response.data.successCount ?? products.length,
      errorCount: response.data.failedCount ?? 0
    };
  }
};
