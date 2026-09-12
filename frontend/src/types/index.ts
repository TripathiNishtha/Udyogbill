export type TenantStatus =
  | 'PendingVerification'
  | 'Active'
  | 'Trial'
  | 'Suspended'
  | 'Expired'
  | 'Archived';

export type SubscriptionStatus =
  | 'Pending'
  | 'Trial'
  | 'Active'
  | 'GracePeriod'
  | 'Suspended'
  | 'Cancelled'
  | 'Expired';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  tenantId?: string;
  tenantCode?: string;
  businessName?: string;
  industryCode?: string;
  roles: string[];
  permissions: string[];
  phoneNumber?: string;
  logoUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface Industry {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  defaultConfigJson?: string;
  modules?: ModuleSummary[];
}

export interface ModuleSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  isCore: boolean;
  features: FeatureSummary[];
}

export interface FeatureSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  featureType: number;
}

export interface TenantIndustryConfig {
  industryId: string;
  industryName: string;
  industryCode: string;
  enableBatchTracking: boolean;
  enableExpiryTracking: boolean;
  enableSerialTracking: boolean;
  enableMultiUnitConversion: boolean;
  enableSizeColorMatrix: boolean;
  enableRecipeBOM: boolean;
  enableScheduleH1DrugTracking: boolean;
  enableEWayBill: boolean;
  enableEInvoicing: boolean;
  configurationJson: string;
}

export interface TenantWarehouse {
  id: string;
  branchId: string;
  warehouseCode: string;
  warehouseName: string;
  location?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface TenantBranch {
  id: string;
  branchCode: string;
  branchName: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  warehouses?: TenantWarehouse[];
}

export interface TenantSubscriptionSummary {
  id: string;
  planId: string;
  planName: string;
  planCode: string;
  status: SubscriptionStatus;
  startsAtUtc: string;
  endsAtUtc: string;
  trialEndsAtUtc?: string;
  autoRenew: boolean;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  code: string;
  businessName: string;
  tradeName: string;
  industryId: string;
  industryName: string;
  industryCode: string;
  status: TenantStatus;
  adminEmail: string;
  primaryPhone: string;
  adminPassword?: string;
  gstin?: string;
  timeZone: string;
  currencyCode: string;
  isActive: boolean;
  createdAtUtc: string;
  logoUrl?: string;
  upiId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
}

export interface TenantDetails extends Tenant {
  pan?: string;
  drugLicenseNumber?: string;
  fssaiNumber?: string;
  suspendedAtUtc?: string;
  suspensionReason?: string;
  industryConfig?: TenantIndustryConfig;
  branches: TenantBranch[];
  activeSubscription?: TenantSubscriptionSummary;
  totalUsers: number;
  totalBranches: number;
  totalWarehouses: number;

  // Complete Registered Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  email?: string;
  website?: string;

  // Outgoing Mail / SMTP Server Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  smtpEnableSsl?: boolean;
}

export interface TenantQuotaSummary {
  currentUsers: number;
  maxUsers: number;
  currentBranches: number;
  maxBranches: number;
  currentWarehouses: number;
  maxWarehouses: number;
  invoicesThisMonth: number;
  maxInvoicesPerMonth: number;
  planName: string;
  planCode: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAtUtc: string;
  isTrial: boolean;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  billingCycle: number;
  price: number;
  setupFee: number;
  trialDays: number;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxInvoicesPerMonth: number;
  maxStorageMb: number;
  isPopular: boolean;
  isActive: boolean;
  entitledFeatureCodes?: string[];
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  tenantCode?: string;
  userId?: string;
  userEmail?: string;
  action: number;
  actionName: string;
  entityName: string;
  entityId?: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  ipAddress?: string;
  userAgent?: string;
  timestampUtc: string;
}

export interface IndustryTenantCount {
  industryName: string;
  industryCode: string;
  tenantCount: number;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalIndustries: number;
  totalPlans: number;
  estimatedMrr: number;
  industryDistribution: IndustryTenantCount[];
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage?: string;
  errorCode?: string;
  validationErrors?: Record<string, string[]>;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// --- Inventory & Catalog Types ---
export interface Category {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  displayOrder: number;
  isActive: boolean;
  itemsCount: number;
  subCategories: Category[];
}

export interface Brand {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  manufacturerName?: string;
  description?: string;
  isActive: boolean;
  itemsCount: number;
}

export interface UnitOfMeasure {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
}

export interface UnitConversion {
  id: string;
  tenantId: string;
  fromUomId: string;
  fromUomCode: string;
  fromUomName: string;
  toUomId: string;
  toUomCode: string;
  toUomName: string;
  conversionFactor: number;
}

export interface ItemList {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  barcode?: string;
  itemType: number;
  categoryName?: string;
  brandName?: string;
  primaryUomId: string;
  primaryUomCode: string;
  primaryUomSymbol: string;
  hsnCode?: string;
  taxRate: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  minimumSellingPrice: number;
  totalStock: number;
  currentStock?: number;
  minimumStockAlert: number;
  isLowStock: boolean;
  trackBatches: boolean;
  trackSerialNumbers: boolean;
  trackVariants: boolean;
  trackInventory?: boolean;
  isService?: boolean;
  attributesJson: string;
  isActive: boolean;
  createdAtUtc: string;
}

export type MasterItem = ItemList;

export interface ItemBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  barcode?: string;
  currentStock: number;
  isExpired: boolean;
  isNearExpiry: boolean;
  isActive: boolean;
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  branchName: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  batchNumber?: string;
  movementType: number;
  movementTypeName: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCost: number;
  referenceDocumentType?: string;
  referenceDocumentNumber?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface LowStockItem {
  itemId: string;
  sku: string;
  name: string;
  categoryName?: string;
  primaryUomCode: string;
  currentStock: number;
  minimumStockAlert: number;
  reorderQuantity: number;
}

// --- Party & Financial Ledger Types ---
export interface PartyList {
  id: string;
  tenantId: string;
  code: string;
  legalName: string;
  tradeName?: string;
  contactPersonName?: string;
  partyType: number; // 1: Customer, 2: Supplier, 3: Both
  customerType?: number; // 1: B2B, 2: B2C, 3: Retail, 4: Wholesale, 5: Government, 6: Exporter, 7: SEZ
  supplierType?: number; // 1: Manufacturer, 2: Distributor, 3: Importer, 4: LocalVendor
  email?: string;
  primaryPhone?: string;
  mobile?: string;
  gstin?: string;
  stateCode?: string;
  creditLimit: number;
  creditPeriodDays: number;
  isCreditBlocked: boolean;
  currentOutstandingBalance: number;
  isActive: boolean;
  createdAtUtc: string;
}

export type PartyDto = PartyList;

export interface PartyAddress {
  id: string;
  partyId: string;
  addressType: number; // 1: Billing, 2: Shipping, 3: Branch
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  contactPerson?: string;
  contactPhone?: string;
  isDefault: boolean;
}

export interface PartyLedgerEntry {
  id: string;
  partyId: string;
  transactionDate: string;
  entryType: number;
  entryTypeName: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  referenceDocumentType?: string;
  referenceDocumentId?: string;
  referenceDocumentNumber?: string;
  paymentMode?: string;
  description?: string;
  createdAtUtc: string;
}

export interface PartyDetails {
  id: string;
  tenantId: string;
  code: string;
  legalName: string;
  tradeName?: string;
  contactPersonName?: string;
  partyType: number;
  customerType?: number;
  supplierType?: number;
  email?: string;
  primaryPhone?: string;
  mobile?: string;
  secondaryPhone?: string;
  website?: string;
  gstin?: string;
  stateCode?: string;
  pan?: string;
  tan?: string;
  isCompositionScheme: boolean;
  drugLicenseNumber1?: string;
  drugLicenseNumber2?: string;
  fssaiNumber?: string;
  creditLimit: number;
  creditPeriodDays: number;
  isCreditBlocked: boolean;
  priceTier?: string;
  openingBalance: number;
  openingBalanceType: number;
  openingBalanceDate?: string;
  currentOutstandingBalance: number;
  attributesJson: string;
  isActive: boolean;
  createdAtUtc: string;
  addresses: PartyAddress[];
  recentLedgerEntries: PartyLedgerEntry[];
}

export interface PartyStatement {
  partyId: string;
  partyCode: string;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: PartyLedgerEntry[];
}

// --- Sales, POS & Invoicing Types ---
export interface SalesInvoiceList {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceType: number; // 1: TaxInvoice, 2: POSBill, 3: Proforma, 4: Estimate, 5: CreditNote, 6: DebitNote
  status: number; // 1: Draft, 2: Issued, 3: Paid, 4: PartiallyPaid, 5: Overdue, 6: Cancelled
  branchId: string;
  branchName: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerGSTIN?: string;
  invoiceDate: string;
  dueDate?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: number; // 1: Unpaid, 2: PartiallyPaid, 3: FullyPaid
  primaryPaymentMode: number; // 1: Cash, 2: UPI, 3: Card, 4: BankTransfer, 5: Cheque, 6: CreditAccount, 7: Split
  isCancelled: boolean;
  cancellationReason?: string;
  hasCreditNote?: boolean;
  creditNoteNumber?: string;
  creditNoteAmount?: number;
  creditNoteDate?: string;
  createdAtUtc: string;
}

export interface SalesInvoiceItem {
  id: string;
  invoiceId: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  hsnCode?: string;
  barcode?: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  uomId: string;
  uomCode: string;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalAmount: number;
  attributesJson: string;
}

export interface SalesInvoicePayment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMode: number;
  paymentModeName: string;
  transactionReference?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface GstTaxSummaryItem {
  hsnCode: string;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface SalesInvoiceDetails {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceType: number;
  status: number;
  branchId: string;
  branchName: string;
  branchGstin: string;
  branchAddress: string;
  branchStateCode: string;
  warehouseId: string;
  warehouseName: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGSTIN?: string;
  customerPAN?: string;
  billingAddress?: string;
  shippingAddress?: string;
  billingStateCode: string;
  shippingStateCode: string;
  placeOfSupply: string;
  invoiceDate: string;
  dueDate?: string;
  taxSupplyType: number; // 1: IntraState, 2: InterState
  subTotal: number;
  itemDiscountTotal: number;
  invoiceDiscountPercent: number;
  invoiceDiscountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  primaryPaymentMode: number;
  paymentStatus: number;
  paymentReferenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  transporterName?: string;
  transporterId?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  lrDate?: string;
  eWayBillNumber?: string;
  eWayBillDate?: string;
  poNumber?: string;
  poDate?: string;
  isReverseCharge?: boolean;
  attributesJson: string;
  isCancelled: boolean;
  cancellationReason?: string;
  cancelledAtUtc?: string;
  hasCreditNote?: boolean;
  creditNoteNumber?: string;
  creditNoteAmount?: number;
  creditNoteDate?: string;
  creditNoteId?: string;
  brokerId?: string;
  brokerName?: string;
  createdAtUtc: string;
  items: SalesInvoiceItem[];
  payments: SalesInvoicePayment[];
  taxSummary: GstTaxSummaryItem[];
}

// --- Purchase Engine Types ---
export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  hsnCode?: string;
  orderQuantity: number;
  freeQuantity?: number;
  receivedQuantity: number;
  remainingQuantity: number;
  uomId: string;
  uomCode: string;
  unitPrice: number;
  discountPercent: number;
  schemeDiscountPercent?: number;
  cashDiscountPercent?: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalAmount: number;
}

export interface PurchaseOrderList {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: number; // 1: Draft, 2: Confirmed, 3: PartiallyReceived, 4: Completed, 5: Cancelled
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  supplierName: string;
  supplierGSTIN?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  totalItemsCount: number;
  createdAtUtc: string;
}

export interface PurchaseOrderDetails {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: number;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  supplierName: string;
  supplierPhone?: string;
  supplierGSTIN?: string;
  supplierAddress?: string;
  supplierStateCode: string;
  placeOfSupply: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  taxSupplyType: number;
  subTotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOff: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAtUtc: string;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderItemRequest {
  itemId: string;
  quantity: number;
  freeQuantity?: number;
  uomId: string;
  unitPrice: number;
  discountPercent?: number;
  schemeDiscountPercent?: number;
  cashDiscountPercent?: number;
  attributesJson?: string;
}

export interface CreatePurchaseOrderRequest {
  branchId: string;
  warehouseId: string;
  partyId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  termsAndConditions?: string;
  attributesJson?: string;
  items: CreatePurchaseOrderItemRequest[];
}

// Goods Receipt Note (GRN) Types
export interface GrnItem {
  id: string;
  purchaseOrderItemId?: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  batchId?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  receivedQuantity: number;
  receivedFreeQuantity?: number;
  acceptedQuantity: number;
  acceptedFreeQuantity?: number;
  rejectedQuantity: number;
  uomId: string;
  uomCode: string;
  unitCost: number;
  totalCost: number;
  rejectionReason?: string;
}

export interface GrnList {
  id: string;
  tenantId: string;
  grnNumber: string;
  status: number; // 1: Draft, 2: Verified, 3: Cancelled
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  supplierName: string;
  deliveryChallanNumber?: string;
  receivedDate: string;
  totalItemsCount: number;
  createdAtUtc: string;
}

export interface GrnDetails {
  id: string;
  tenantId: string;
  grnNumber: string;
  status: number;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  supplierName: string;
  deliveryChallanNumber?: string;
  deliveryChallanDate?: string;
  receivedDate: string;
  receivedBy?: string;
  remarks?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAtUtc: string;
  items: GrnItem[];
}

export interface ReceiveGrnItemRequest {
  purchaseOrderItemId?: string;
  itemId: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  receivedQuantity: number;
  receivedFreeQuantity?: number;
  acceptedQuantity: number;
  acceptedFreeQuantity?: number;
  rejectedQuantity: number;
  uomId: string;
  unitCost: number;
  rejectionReason?: string;
}

export interface CreateGrnRequest {
  purchaseOrderId?: string;
  branchId: string;
  warehouseId: string;
  partyId: string;
  deliveryChallanNumber?: string;
  deliveryChallanDate?: string;
  receivedDate: string;
  receivedBy?: string;
  remarks?: string;
  items: ReceiveGrnItemRequest[];
}

// Purchase Bill (Vendor Invoice) Types
export interface PurchaseBillItem {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  hsnCode?: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  freeQuantity?: number;
  uomId: string;
  uomCode: string;
  unitPrice: number;
  discountPercent: number;
  schemeDiscountPercent?: number;
  cashDiscountPercent?: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalAmount: number;
}

export interface PurchaseBillPayment {
  id: string;
  purchaseBillId: string;
  paymentDate: string;
  amount: number;
  paymentMode: number;
  paymentModeName: string;
  transactionReference?: string;
  bankName?: string;
  notes?: string;
  createdAtUtc: string;
}

export interface PurchaseBillList {
  id: string;
  tenantId: string;
  billNumber: string;
  vendorInvoiceNumber?: string;
  status: number; // 1: Draft, 2: Approved, 3: Paid, 4: Cancelled
  branchId: string;
  branchName: string;
  partyId: string;
  supplierName: string;
  supplierGSTIN?: string;
  billDate: string;
  dueDate?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: number;
  primaryPaymentMode: number;
  isCancelled: boolean;
  createdAtUtc: string;
}

export interface PurchaseBillDetails {
  id: string;
  tenantId: string;
  billNumber: string;
  vendorInvoiceNumber?: string;
  status: number;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  goodsReceiptNoteId?: string;
  grnNumber?: string;
  branchId: string;
  branchName: string;
  warehouseId: string;
  warehouseName: string;
  partyId: string;
  supplierName: string;
  supplierGSTIN?: string;
  supplierAddress?: string;
  supplierStateCode: string;
  placeOfSupply: string;
  billDate: string;
  dueDate?: string;
  taxSupplyType: number;
  subTotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: number;
  primaryPaymentMode: number;
  notes?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAtUtc: string;
  items: PurchaseBillItem[];
  payments: PurchaseBillPayment[];
  taxSummary: GstTaxSummaryItem[];
}

export interface CreatePurchaseBillItemRequest {
  itemId: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  uomId: string;
  unitPrice: number;
  discountPercent?: number;
  attributesJson?: string;
}

export interface CreatePurchaseBillRequest {
  purchaseOrderId?: string;
  goodsReceiptNoteId?: string;
  vendorInvoiceNumber?: string;
  branchId: string;
  warehouseId: string;
  partyId: string;
  billDate: string;
  dueDate?: string;
  primaryPaymentMode?: number;
  paidAmount?: number;
  paymentReferenceNumber?: string;
  notes?: string;
  attributesJson?: string;
  items: CreatePurchaseBillItemRequest[];
}

export interface RecordPurchaseBillPaymentRequest {
  paymentDate: string;
  amount: number;
  paymentMode: number;
  transactionReference?: string;
  bankName?: string;
  notes?: string;
}

// --- Quotations & Estimates Types ---
export interface QuotationItem {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  hsnCode?: string;
  quantity: number;
  uomId: string;
  uomCode: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalAmount: number;
}

export interface QuotationList {
  id: string;
  tenantId: string;
  quotationNumber: string;
  status: number; // 1: Draft, 2: Sent, 3: Accepted, 4: Rejected, 5: ConvertedToInvoice, 6: Expired, 7: Cancelled
  branchId: string;
  branchName: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerGSTIN?: string;
  quotationDate: string;
  validUntilDate?: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  totalItemsCount: number;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  createdAtUtc: string;
}

export interface QuotationDetails {
  id: string;
  tenantId: string;
  quotationNumber: string;
  status: number;
  branchId: string;
  branchName: string;
  branchGstin: string;
  branchAddress: string;
  branchStateCode: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGSTIN?: string;
  billingAddress?: string;
  shippingAddress?: string;
  billingStateCode: string;
  shippingStateCode: string;
  placeOfSupply: string;
  quotationDate: string;
  validUntilDate?: string;
  taxSupplyType: number;
  subTotal: number;
  itemDiscountTotal: number;
  quotationDiscountPercent: number;
  quotationDiscountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOff: number;
  totalAmount: number;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  convertedAtUtc?: string;
  notes?: string;
  termsAndConditions?: string;
  attributesJson: string;
  isCancelled: boolean;
  cancellationReason?: string;
  createdAtUtc: string;
  items: QuotationItem[];
  taxSummary: GstTaxSummaryItem[];
}

export interface CreateQuotationItemRequest {
  itemId: string;
  quantity: number;
  uomId: string;
  unitPrice: number;
  discountPercent?: number;
  attributesJson?: string;
}

export interface CreateQuotationRequest {
  branchId: string;
  partyId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGSTIN?: string;
  billingAddress?: string;
  shippingAddress?: string;
  stateCode?: string;
  placeOfSupply?: string;
  quotationDate: string;
  validUntilDate?: string;
  quotationDiscountPercent?: number;
  notes?: string;
  termsAndConditions?: string;
  attributesJson?: string;
  items: CreateQuotationItemRequest[];
}

export interface ConvertQuotationRequest {
  warehouseId: string;
  invoiceDate: string;
  dueDate?: string;
  primaryPaymentMode?: number;
  paidAmount?: number;
  paymentReferenceNumber?: string;
  notes?: string;
}

// --- Barcode & Label Types ---
export interface BarcodeItemLabel {
  itemId: string;
  itemName: string;
  itemSku: string;
  barcode: string;
  mrp: number;
  sellingPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  brandName?: string;
  categoryName?: string;
  tenantName: string;
  quantity: number;
}

export interface BarcodeScanResult {
  itemId: string;
  itemSku: string;
  barcode: string;
  name: string;
  mrp: number;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
  hsnCode?: string;
  primaryUomId: string;
  primaryUomCode: string;
  totalStock: number;
  batches: Array<{
    id: string;
    batchNumber: string;
    expiryDate?: string;
    currentStock: number;
    mrp: number;
    saleRate: number;
  }>;
}

export interface UpiQrPayload {
  upiUri: string;
  payeeVpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}

export interface ReportLedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  entryType: string;
  referenceDocumentType?: string;
  referenceDocumentNumber?: string;
  referenceDocumentId?: string;
  partyName?: string;
  partyId?: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMode?: string;
}

export interface ReportLedgerStatement {
  partyId?: string;
  partyName?: string;
  partyGSTIN?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: ReportLedgerEntry[];
}

export interface PnLChartPoint {
  period: string;
  revenue: number;
  purchases: number;
  grossProfit: number;
  netProfit: number;
}

export interface PnLReport {
  fromDate: string;
  toDate: string;
  totalSalesRevenue: number;
  totalDiscountGiven: number;
  netSalesRevenue: number;
  totalPurchasesCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  chartData: PnLChartPoint[];
}

export interface GstSummaryRow {
  rateSlab: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalValue: number;
}

export interface GstHsnSummaryRow {
  hsnCode: string;
  description: string;
  uom: string;
  totalQuantity: number;
  taxableValue: number;
  taxRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface Gstr1Report {
  tenantName: string;
  gstin: string;
  fromDate: string;
  toDate: string;
  totalB2BInvoices: number;
  totalB2BTaxable: number;
  totalB2BTax: number;
  totalB2CInvoices: number;
  totalB2CTaxable: number;
  totalB2CTax: number;
  totalOutwardTaxable: number;
  totalOutwardTax: number;
  rateWiseSummary: GstSummaryRow[];
  hsnSummary: GstHsnSummaryRow[];
}

export interface Gstr3bReport {
  tenantName: string;
  gstin: string;
  fromDate: string;
  toDate: string;
  outwardTaxableValue: number;
  outwardIgst: number;
  outwardCgst: number;
  outwardSgst: number;
  totalOutputTaxLiability: number;
  inwardTaxableValue: number;
  inwardIgst: number;
  inwardCgst: number;
  inwardSgst: number;
  totalEligibleItc: number;
  netIgstPayable: number;
  netCgstPayable: number;
  netSgstPayable: number;
  totalNetGstPayable: number;
}

export interface FinancialSummaryReport {
  fromDate: string;
  toDate: string;
  totalSales: number;
  totalInvoicesCount: number;
  totalCollected: number;
  totalPendingReceivables: number;
  totalPurchases: number;
  totalPurchaseBillsCount: number;
  totalPayables: number;
  outputGst: number;
  inputGstItc: number;
  netGstPayable: number;
  grossProfit: number;
  netProfit: number;
}

export interface AuditActionCount {
  actionName: string;
  count: number;
}

export interface AuditUserActivity {
  userEmail: string;
  actionCount: number;
  lastActivityUtc: string;
}

export interface AuditEntityCount {
  entityName: string;
  count: number;
}

export interface TenantAuditSummary {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  actionDistribution: AuditActionCount[];
  topActiveUsers: AuditUserActivity[];
  topEntities: AuditEntityCount[];
}

