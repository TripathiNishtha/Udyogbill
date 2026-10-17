import { apiClient } from "@/lib/api-client";
import {
  Category,
  Brand,
  UnitOfMeasure,
  UnitConversion,
  ItemList,
  ItemBatch,
  ItemVariant,
  WarehouseStock,
  StockMovement,
  LowStockItem,
  PagedResponse,
} from "@/types";

export type { Brand, Category, UnitOfMeasure, ItemVariant };

export interface BarcodeLookupResult {
  barcode: string;
  existsInStore: boolean;
  storeItem?: ItemList;
  masterCatalogItem?: {
    barcode: string;
    productName: string;
    brandName?: string;
    categoryName?: string;
    hsnCode?: string;
    taxRate?: number;
    mrp?: number;
    sellingPrice?: number;
    purchasePrice?: number;
    unitCode?: string;
    packaging?: string;
    industry?: string;
    source?: string;
  };
}

export interface OpeningBatchInput {
  warehouseId?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  purchaseRate?: number;
  mrp?: number;
}

export interface OpeningVariantInput {
  size: string;
  color: string;
  variantSku?: string;
  barcode?: string;
  quantity?: number;
  priceAdjustment?: number;
  warehouseId?: string;
  purchasePrice?: number;
  wholesalePrice?: number;
  mrp?: number;
}

export interface CreateItemInput {
  sku: string;
  name: string;
  shortDescription?: string;
  barcode?: string;
  itemType?: number;
  trackInventory?: boolean;
  categoryId?: string;
  brandId?: string;
  primaryUomId: string;
  secondaryUomId?: string;
  conversionRatio?: number;
  hsnCode?: string;
  taxRate?: number;
  cessRate?: number;
  isTaxInclusive?: boolean;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  minimumSellingPrice?: number;
  minimumStockAlert?: number;
  maximumStockAlert?: number;
  reorderQuantity?: number;
  trackBatches?: boolean;
  trackSerialNumbers?: boolean;
  trackVariants?: boolean;
  attributesJson?: string;
  initialStock?: number;
  initialWarehouseId?: string;
  initialBatchNumber?: string;
  initialBatchExpiryDate?: string;
  openingBatches?: OpeningBatchInput[];
  openingVariants?: OpeningVariantInput[];
}

export interface CreateBatchInput {
  itemId: string;
  warehouseId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  initialQuantity?: number;
  barcode?: string;
}

export interface StockAdjustmentInput {
  itemId: string;
  warehouseId: string;
  batchId?: string;
  movementType: number; // 5: PhysicalAdjustment, 6: DamageLoss, 7: ExpiredWriteOff, 1: PurchaseInward
  quantityChange: number;
  unitCost: number;
  referenceDocumentNumber?: string;
  notes?: string;
}

export interface ItemVariantUpdateInput {
  variantId?: string | null;
  variantSku?: string;
  rate: number;
  purchasePrice?: number;
  wholesalePrice?: number;
  mrp?: number;
  barcode?: string;
  size?: string;
  color?: string;
  variantName?: string;
  openingStock?: number;
}

export interface BulkPriceUpdateItemInput {
  itemId: string;
  variantId?: string;
  sku?: string;
  purchasePrice?: number;
  wholesalePrice?: number;
  sellingPrice?: number;
  mrp?: number;
}

export interface BulkPriceUpdateResult {
  updatedItemsCount: number;
  updatedVariantsCount: number;
  message: string;
}

export interface PriceListRow {
  itemId: string;
  variantId?: string | null;
  sku: string;
  itemName: string;
  categoryName?: string;
  brandName?: string;
  primaryUomCode: string;
  isVariant: boolean;
  sizeOrPack?: string;
  colorOrShade?: string;
  barcode?: string;
  purchasePrice: number;
  wholesalePrice: number;
  sellingPrice: number;
  mrp: number;
  currentStock: number;
  taxRate: number;
}

export const inventoryService = {
  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>("/tenant/categories");
    return response.data;
  },

  async createCategory(input: { code: string; name: string; description?: string; parentCategoryId?: string; displayOrder?: number }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/categories", input);
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/tenant/categories/${id}`);
  },

  // Brands
  async getBrands(): Promise<Brand[]> {
    const response = await apiClient.get<Brand[]>("/tenant/brands");
    return response.data;
  },

  async createBrand(input: { code: string; name: string; manufacturerName?: string; description?: string }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/brands", input);
    return response.data;
  },

  async deleteBrand(id: string): Promise<void> {
    await apiClient.delete(`/tenant/brands/${id}`);
  },

  // Units
  async getUnits(): Promise<UnitOfMeasure[]> {
    const response = await apiClient.get<any>("/tenant/units");
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    return this.getUnits();
  },

  async createUnit(input: { code: string; name: string; symbol: string; decimalPlaces?: number }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/units", input);
    return response.data;
  },

  async getConversions(): Promise<UnitConversion[]> {
    const response = await apiClient.get<UnitConversion[]>("/tenant/units/conversions");
    return response.data;
  },

  async createConversion(input: { fromUomId: string; toUomId: string; conversionFactor: number }): Promise<string> {
    const response = await apiClient.post<string>("/tenant/units/conversions", input);
    return response.data;
  },

  // Items
  async getItems(params?: {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    categoryId?: string;
    brandId?: string;
    lowStockOnly?: boolean;
  }): Promise<PagedResponse<ItemList>> {
    const response = await apiClient.get<PagedResponse<ItemList>>("/tenant/items", { params });
    return response.data;
  },

  async getItemById(id: string): Promise<any> {
    const response = await apiClient.get(`/tenant/items/${id}`);
    return response.data;
  },

  async getItemByBarcode(barcode: string): Promise<any> {
    const response = await apiClient.get(`/tenant/items/barcode/${barcode}`);
    return response.data;
  },

  async createItem(input: CreateItemInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/items", input);
    return response.data;
  },

  async updateItem(id: string, input: Partial<CreateItemInput> & { isActive?: boolean }): Promise<void> {
    await apiClient.put(`/tenant/items/${id}`, input);
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/tenant/items/${id}`);
  },

  async bulkDeleteItems(itemIds: string[]): Promise<{ deletedCount: number; message: string }> {
    try {
      const response = await apiClient.post<{ deletedCount: number; message: string }>("/tenant/items/bulk-delete", { itemIds });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 501) {
        let deleted = 0;
        for (const id of itemIds) {
          await apiClient.delete(`/tenant/items/${id}`);
          deleted++;
        }
        return { deletedCount: deleted, message: `${deleted} items deleted successfully.` };
      }
      throw err;
    }
  },

  async bulkUpdateItems(input: {
    itemIds: string[];
    trackInventory?: boolean;
    taxRate?: number;
    isTaxInclusive?: boolean;
    categoryId?: string;
    clearCategory?: boolean;
    brandId?: string;
    clearBrand?: boolean;
    primaryUomId?: string;
    hsnCode?: string;
    minimumStockAlert?: number;
    trackBatches?: boolean;
    trackSerialNumbers?: boolean;
    isActive?: boolean;
  }): Promise<{ updatedCount: number; message: string }> {
    try {
      const response = await apiClient.post<{ updatedCount: number; message: string }>("/tenant/items/bulk-update", input);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 501 || err?.response?.status === 405) {
        // Fallback: update sequentially if endpoint not yet deployed or method disallowed
        let count = 0;
        for (const id of input.itemIds) {
          const updatePayload: any = {};
          if (input.trackInventory !== undefined) updatePayload.trackInventory = input.trackInventory;
          if (input.taxRate !== undefined) updatePayload.taxRate = input.taxRate;
          if (input.isTaxInclusive !== undefined) updatePayload.isTaxInclusive = input.isTaxInclusive;
          if (input.clearCategory) updatePayload.categoryId = null;
          else if (input.categoryId !== undefined) updatePayload.categoryId = input.categoryId;
          if (input.clearBrand) updatePayload.brandId = null;
          else if (input.brandId !== undefined) updatePayload.brandId = input.brandId;
          if (input.primaryUomId !== undefined) updatePayload.primaryUomId = input.primaryUomId;
          if (input.hsnCode !== undefined) updatePayload.hsnCode = input.hsnCode;
          if (input.minimumStockAlert !== undefined) updatePayload.minimumStockAlert = input.minimumStockAlert;
          if (input.trackBatches !== undefined) updatePayload.trackBatches = input.trackBatches;
          if (input.trackSerialNumbers !== undefined) updatePayload.trackSerialNumbers = input.trackSerialNumbers;
          if (input.isActive !== undefined) updatePayload.isActive = input.isActive;
          await apiClient.put(`/tenant/items/${id}`, updatePayload);
          count++;
        }
        return { updatedCount: count, message: `${count} items updated successfully.` };
      }
      throw err;
    }
  },

  // Batches
  async getBatches(itemId: string): Promise<ItemBatch[]> {
    const response = await apiClient.get<ItemBatch[]>(`/tenant/items/${itemId}/batches`);
    return response.data;
  },

  async createBatch(itemId: string, input: CreateBatchInput): Promise<string> {
    const response = await apiClient.post<string>(`/tenant/items/${itemId}/batches`, input);
    return response.data;
  },

  // Variants (Size & Color)
  async getItemVariants(itemId: string): Promise<ItemVariant[]> {
    const response = await apiClient.get<ItemVariant[]>(`/tenant/items/${itemId}/variants`);
    return response.data;
  },

  async updateItemVariants(itemId: string, variants: ItemVariantUpdateInput[]): Promise<void> {
    await apiClient.put(`/tenant/items/${itemId}/variants`, { variants });
  },

  async bulkUpdatePrices(items: BulkPriceUpdateItemInput[]): Promise<BulkPriceUpdateResult> {
    const response = await apiClient.post<BulkPriceUpdateResult>("/tenant/inventory/bulk-price-update", { items });
    return response.data;
  },

  async getPriceList(params?: { categoryId?: string; brandId?: string; searchTerm?: string }): Promise<PriceListRow[]> {
    const response = await apiClient.get<PriceListRow[]>("/tenant/inventory/price-list", { params });
    return response.data;
  },

  // Stock
  async getStockBalances(params?: { itemId?: string; warehouseId?: string }): Promise<WarehouseStock[]> {
    const response = await apiClient.get<WarehouseStock[]>("/tenant/inventory/stock", { params });
    return response.data;
  },

  async getStockMovements(params?: { pageNumber?: number; pageSize?: number; itemId?: string; warehouseId?: string }): Promise<PagedResponse<StockMovement>> {
    const response = await apiClient.get<PagedResponse<StockMovement>>("/tenant/inventory/movements", { params });
    return response.data;
  },

  async recordStockAdjustment(input: StockAdjustmentInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/inventory/adjustments", input);
    return response.data;
  },

  async getLowStockAlerts(): Promise<LowStockItem[]> {
    const response = await apiClient.get<LowStockItem[]>("/tenant/inventory/low-stock");
    return response.data;
  },

  // Stock Transfers
  async getStockTransfers(params?: {
    pageNumber?: number;
    pageSize?: number;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    status?: string;
  }): Promise<PagedResponse<StockTransferDto>> {
    const response = await apiClient.get<PagedResponse<StockTransferDto>>("/tenant/inventory/transfers", { params });
    return response.data;
  },

  async getStockTransferById(id: string): Promise<StockTransferDto> {
    const response = await apiClient.get<StockTransferDto>(`/tenant/inventory/transfers/${id}`);
    return response.data;
  },

  async createStockTransfer(input: CreateStockTransferInput): Promise<string> {
    const response = await apiClient.post<string>("/tenant/inventory/transfers", input);
    return response.data;
  },

  async receiveStockTransfer(id: string, notes?: string): Promise<void> {
    await apiClient.post(`/tenant/inventory/transfers/${id}/receive`, null, { params: { notes } });
  },

  async lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
    const response = await apiClient.get<BarcodeLookupResult>(`/tenant/barcode/lookup/${encodeURIComponent(barcode)}`);
    return response.data;
  }
};

export interface StockTransferItemInput {
  itemId: string;
  itemName: string;
  itemSku: string;
  batchId?: string;
  batchNumber?: string;
  transferQuantity: number;
}

export interface CreateStockTransferInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  vehicleNumber?: string;
  driverName?: string;
  notes?: string;
  items: StockTransferItemInput[];
}

export interface StockTransferItemDto {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  batchId?: string;
  batchNumber?: string;
  transferQuantity: number;
  receivedQuantity?: number;
}

export interface StockTransferDto {
  id: string;
  transferNumber: string;
  transferDate: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: string;
  vehicleNumber?: string;
  driverName?: string;
  dispatchedDate?: string;
  receivedDate?: string;
  notes?: string;
  createdAtUtc: string;
  items: StockTransferItemDto[];
}
