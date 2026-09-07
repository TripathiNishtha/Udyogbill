import { apiClient } from "@/lib/api-client";
import {
  Category,
  Brand,
  UnitOfMeasure,
  UnitConversion,
  ItemList,
  ItemBatch,
  WarehouseStock,
  StockMovement,
  LowStockItem,
  PagedResponse,
} from "@/types";

export type { Brand, Category, UnitOfMeasure };

export interface OpeningBatchInput {
  warehouseId?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  purchaseRate?: number;
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
    const response = await apiClient.get<UnitOfMeasure[]>("/tenant/units");
    return response.data;
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

  // Batches
  async getBatches(itemId: string): Promise<ItemBatch[]> {
    const response = await apiClient.get<ItemBatch[]>(`/tenant/items/${itemId}/batches`);
    return response.data;
  },

  async createBatch(itemId: string, input: CreateBatchInput): Promise<string> {
    const response = await apiClient.post<string>(`/tenant/items/${itemId}/batches`, input);
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
