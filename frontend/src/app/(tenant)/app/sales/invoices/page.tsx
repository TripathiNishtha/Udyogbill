"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  Calendar,
  CreditCard,
  Printer,
  X,
  FileText,
  AlertCircle,
  Users2,
  CheckCircle2,
  Trash2,
  Sparkles,
  History,
  Info,
  Tag,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Truck,
  Keyboard,
  Zap,
  HelpCircle,
  ScanBarcode,
  Ruler,
  Palette,
  Layers,
  ShieldCheck,
  Package,
  RotateCcw,
  Ban,
  ChevronDown,
  Stethoscope,
  ShoppingCart,
  Edit,
  ExternalLink,
} from "lucide-react";
import { salesService, CreateSalesInvoiceInput, CreateInvoiceItemInput } from "@/services/sales-services";
import { inventoryService } from "@/services/inventory-services";
import { partyService, brokerService, BrokerItem } from "@/services/party-services";
import { p0ReportService } from "@/services/p0-reports.service";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { printTemplateService } from "@/services/print-template-services";
import { printRawHtml } from "@/lib/print-helper";
import { SalesInvoiceList, MasterItem, PartyList } from "@/types";
import { QuickAddCustomerModal } from "@/components/sales/quick-add-customer-modal";
import { useAddons } from "@/context/addon-context";
import { Badge, Button, EmptyState, TableSkeleton } from "@/components/ui";
import { OnboardingTour, LaunchTourButton, TourStep } from "@/components/onboarding/onboarding-tour";
import { FloatingWhatsAppWidget } from "@/components/common/floating-whatsapp-widget";

interface ItemBatch {
  id: string;
  batchNumber: string;
  expiryDate?: string;
  mrp?: number;
  saleRate?: number;
  currentQuantity?: number;
}

interface CustomerDealPoint {
  date: string;
  invoiceNumber: string;
  rate: number;
  discount: string;
  dealQty: string;
  batchNumber?: string;
}

interface InvoiceLineItemForm {
  itemId: string;
  itemSku: string;
  itemName: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  packing?: string;
  hsnCode?: string;
  quantity: number;
  freeQuantity: number;
  uomId: string;
  uomCode: string;
  mrp: number;
  ptr?: number;
  pts?: number;
  caseQty?: number;
  pcsQty?: number;
  size?: string;
  color?: string;
  unitPrice: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  totalAmount: number;
  availableBatches: ItemBatch[];
  loadingBatches?: boolean;

  // Electronics Vertical
  imeiSerial?: string;
  imei2?: string;
  brand?: string;
  modelVariant?: string;
  warrantyMonths?: number;

  // Hardware Vertical
  dimLength?: number;
  dimWidth?: number;
  dimUnit?: "INCH" | "FEET" | "MM" | "METER";
  sqft?: number;
  runningFt?: number;
  weightPerPieceKg?: number;
  totalWeightKg?: number;
  rateBasis?: "per_unit" | "per_sqft" | "per_kg" | "per_running_ft";
  contractorName?: string;

  // Garments Vertical
  styleCode?: string;
  fit?: string;

  // FMCG Vertical
  unitsPerCase?: number;
  schemeDesc?: string;
  tradeDiscountPercent?: number;
  cashDiscountPercent?: number;

  // Service Sector Vertical
  sacCode?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  jobSheetRef?: string;
  billingBasis?: "fixed" | "hourly" | "daily";
}

// Marg ERP Standard DPCO Reverse Pharma Pricing Formula (MRP -> PTR -> PTS)
function calculateMargPharmaRates(
  mrp: number,
  gstRate: number = 12,
  retailerMargin: number = 20,
  stockistMargin: number = 10
) {
  if (mrp <= 0) return { ptr: 0, pts: 0 };
  const gstFactor = 1 + (gstRate / 100);
  const ptr = Math.round(((mrp * (1 - retailerMargin / 100)) / gstFactor) * 100) / 100;
  const pts = Math.round((ptr * (1 - stockistMargin / 100)) * 100) / 100;
  return { ptr, pts };
}

function TenantInvoicesPageContent() {
  const [invoices, setInvoices] = useState<SalesInvoiceList[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<PartyList[]>([]);
  const [brokers, setBrokers] = useState<BrokerItem[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAddonActive, isFeatureActive, activePack, industryCode: contextIndustryCode } = useAddons();

  // Canonical Multi-Industry Pack Resolution
  const activeIndustry = (
    contextIndustryCode ||
    activePack?.activeIndustryModule ||
    activePack?.industryTypeCode ||
    (isAddonActive("pharma") ? "PHARMA" : isAddonActive("fmcg") ? "FMCG" : isAddonActive("garments") ? "GARMENTS" : isAddonActive("electronics") ? "ELECTRONICS" : isAddonActive("hardware") ? "HARDWARE" : isAddonActive("service_sector") ? "SERVICE_SECTOR" : "OTHER")
  ).toUpperCase();

  const isPharma = activeIndustry === "PHARMA" || isAddonActive("pharma");
  const isFmcg = activeIndustry === "FMCG" || isAddonActive("fmcg");
  const isElectronics = activeIndustry === "ELECTRONICS" || isAddonActive("electronics");
  const isGarments = activeIndustry === "GARMENTS" || isAddonActive("garments");
  const isHardware = activeIndustry === "HARDWARE" || isAddonActive("hardware");
  const isService = activeIndustry === "SERVICE_SECTOR" || isAddonActive("service") || isAddonActive("service_sector");
  const isOther = activeIndustry === "OTHER";

  const hasPharmaAddon = isPharma;
  const hasFmcgAddon = isFmcg;
  const hasGarmentsAddon = isGarments;
  const hasBatchTracking = isPharma || isFmcg || isFeatureActive("enableBatchTracking");
  const hasPackingFreeQty = isPharma || isFmcg || isFeatureActive("enableMultiUnitConversion");

  // Pharma 3-Tier Margin Privacy & Rate Engine
  const [pharmaTradeTier, setPharmaTradeTier] = useState<"company_to_stockist" | "stockist_to_chemist" | "chemist_to_patient">("stockist_to_chemist");

  // Hardware Trade Tiers & Contractor Site
  const [hardwareTradeTier, setHardwareTradeTier] = useState<"builder_contractor" | "wholesale" | "retail_counter">("builder_contractor");
  const [contractorName, setContractorName] = useState<string>("");
  const [siteAddress, setSiteAddress] = useState<string>("");

  // Electronics Trade Tiers
  const [electronicsTradeTier, setElectronicsTradeTier] = useState<"distributor_to_dealer" | "dealer_to_retail" | "retail_consumer">("dealer_to_retail");

  // FMCG Trade Flow
  const [fmcgTradeTier, setFmcgTradeTier] = useState<"super_stockist" | "distributor_to_retailer" | "retailer_to_consumer">("distributor_to_retailer");

  // Service Work Order / Job Sheet Reference
  const [serviceJobSheetRef, setServiceJobSheetRef] = useState<string>("");

  // Pharma Prescriber & Patient Statutory Record (Schedule H1 / CDSCO)
  const [doctorName, setDoctorName] = useState<string>("");
  const [doctorRegNumber, setDoctorRegNumber] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientAddressPhone, setPatientAddressPhone] = useState<string>("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  // Create Invoice Drawer & Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerDlNumber, setCustomerDlNumber] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [isSameAsBilling, setIsSameAsBilling] = useState<boolean>(true);
  const [billingStateCode, setBillingStateCode] = useState<string>("27");
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [primaryPaymentMode, setPrimaryPaymentMode] = useState<number>(1);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineItemForm[]>([]);
  const [customerDealHistoryMap, setCustomerDealHistoryMap] = useState<Record<string, CustomerDealPoint[]>>({});
  const [quickProductSearch, setQuickProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDemoItem, setLoadingDemoItem] = useState(false);

  // Persistent Billing Mode & B2B Logistics State
  const [billingMode, setBillingMode] = useState<"b2b" | "retail" | "thermal">("b2b");
  const [transporterName, setTransporterName] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [lrNumber, setLrNumber] = useState<string>("");
  const [lrDate, setLrDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [poNumber, setPoNumber] = useState<string>("");
  const [poDate, setPoDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [eWayBillNumber, setEWayBillNumber] = useState<string>("");
  const [isReverseCharge, setIsReverseCharge] = useState<boolean>(false);
  const [isTransportOpen, setIsTransportOpen] = useState<boolean>(false);
  const [isDoctorRxOpen, setIsDoctorRxOpen] = useState<boolean>(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Edit Invoice States & Deep-Link Detection
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdFromUrl = searchParams?.get("editId") || searchParams?.get("editInvoiceId");
  const actionFromUrl = searchParams?.get("action");
  const tourFromUrl = searchParams?.get("tour");
  const newFromUrl = searchParams?.get("new");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<string>("");
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-open drawer when navigated with ?action=new or ?tour=1 or ?new=1
  useEffect(() => {
    if (actionFromUrl === "new" || tourFromUrl === "1" || newFromUrl === "1") {
      setIsDrawerOpen(true);
      if (invoiceLines.length === 0) {
        handleAddLine();
      }
      if (tourFromUrl === "1" && typeof window !== "undefined" && window.innerWidth >= 768) {
        setTimeout(() => setIsTourOpen(true), 600);
      }
    }
  }, [actionFromUrl, tourFromUrl, newFromUrl]);

  // Load existing invoice when navigated via Edit action
  useEffect(() => {
    if (!editIdFromUrl) return;

    let isMounted = true;
    (async () => {
      try {
        const inv = await salesService.getInvoiceById(editIdFromUrl);
        if (!inv || !isMounted) return;

        setEditingInvoiceId(inv.id);
        setEditingInvoiceNumber(inv.invoiceNumber);
        setSelectedBranchId(inv.branchId);
        setSelectedWarehouseId(inv.warehouseId);
        setSelectedCustomerId(inv.partyId || "");
        setCustomerName(inv.customerName || "");
        setCustomerPhone(inv.customerPhone || "");
        setCustomerGstin(inv.customerGSTIN || "");

        // Parse DL from attributes
        let dl = "";
        let mode: "b2b" | "retail" | "thermal" = inv.invoiceType === 2 ? "thermal" : "b2b";
        if (inv.attributesJson) {
          try {
            const parsed = JSON.parse(inv.attributesJson);
            dl = parsed.customerDlNumber || "";
            if (parsed.billingMode) mode = parsed.billingMode;
          } catch {}
        }
        setCustomerDlNumber(dl);
        setBillingMode(mode);

        const billAddr = inv.billingAddress || "";
        const shipAddr = inv.shippingAddress || inv.billingAddress || "";
        setBillingAddress(billAddr);
        setShippingAddress(shipAddr);
        setIsSameAsBilling(billAddr === shipAddr || !inv.shippingAddress);
        setBillingStateCode(inv.billingStateCode || "27");

        if (inv.invoiceDate) {
          setInvoiceDate(inv.invoiceDate.split("T")[0]);
        }
        if (inv.dueDate) {
          setDueDate(inv.dueDate.split("T")[0]);
        }

        setTransporterName(inv.transporterName || "");
        setVehicleNumber(inv.vehicleNumber || "");
        setLrNumber(inv.lrNumber || "");
        if (inv.lrDate) setLrDate(inv.lrDate.split("T")[0]);
        setPoNumber(inv.poNumber || "");
        if (inv.poDate) setPoDate(inv.poDate.split("T")[0]);
        setEWayBillNumber(inv.eWayBillNumber || "");
        setIsReverseCharge(inv.isReverseCharge || false);
        if (inv.transporterName || inv.vehicleNumber || inv.lrNumber || inv.poNumber || inv.eWayBillNumber) {
          setIsTransportOpen(true);
        }

        setPrimaryPaymentMode(inv.primaryPaymentMode || 1);
        setPaidAmount(inv.paidAmount || 0);

        // Map line items into editable lines
        if (inv.items && inv.items.length > 0) {
          const lines: InvoiceLineItemForm[] = inv.items.map((it) => {
            let freeQty = 0;
            let packing = "";
            let ptrVal = 0;
            let ptsVal = 0;
            let extraAttrs: any = {};
            if (it.attributesJson) {
              try {
                extraAttrs = JSON.parse(it.attributesJson) || {};
                freeQty = extraAttrs.freeQuantity || 0;
                packing = extraAttrs.packing || "";
                ptrVal = extraAttrs.ptr || 0;
                ptsVal = extraAttrs.pts || 0;
              } catch {}
            }
            return {
              lineId: it.id || Math.random().toString(),
              itemId: it.itemId,
              itemName: it.itemName,
              itemSku: it.itemSku,
              hsnCode: it.hsnCode || "",
              batchId: it.batchId || "",
              batchNumber: it.batchNumber || "",
              expiryDate: it.expiryDate ? it.expiryDate.split("T")[0] : "",
              quantity: it.quantity,
              freeQuantity: freeQty,
              packing: packing,
              uomId: it.uomId,
              uomCode: it.uomCode || "UNIT",
              unitPrice: it.unitPrice,
              mrp: it.mrp || 0,
              ptr: ptrVal,
              pts: ptsVal,
              discountType: "percent",
              discountValue: it.discountPercent || 0,
              discountAmount: it.discountAmount || 0,
              taxableAmount: it.taxableAmount,
              gstRate: it.gstRate,
              totalAmount: it.totalAmount,
              availableBatches: [],
              // Electronics
              imeiSerial: extraAttrs.imeiSerial || "",
              imei2: extraAttrs.imei2 || "",
              brand: extraAttrs.brand || "",
              modelVariant: extraAttrs.modelVariant || "",
              warrantyMonths: extraAttrs.warrantyMonths ? Number(extraAttrs.warrantyMonths) : undefined,
              // Hardware
              dimLength: extraAttrs.length ? Number(extraAttrs.length) : undefined,
              dimWidth: extraAttrs.width ? Number(extraAttrs.width) : undefined,
              dimUnit: extraAttrs.dimensionUnit || undefined,
              sqft: extraAttrs.sqft ? Number(extraAttrs.sqft) : undefined,
              runningFt: extraAttrs.runningFt ? Number(extraAttrs.runningFt) : undefined,
              weightPerPieceKg: extraAttrs.weightPerPieceKg ? Number(extraAttrs.weightPerPieceKg) : undefined,
              totalWeightKg: extraAttrs.totalWeightKg ? Number(extraAttrs.totalWeightKg) : undefined,
              rateBasis: extraAttrs.rateBasis || undefined,
              contractorName: extraAttrs.contractorName || undefined,
              // Garments
              size: extraAttrs.size || undefined,
              color: extraAttrs.color || undefined,
              styleCode: extraAttrs.styleCode || undefined,
              fit: extraAttrs.fit || undefined,
              // FMCG
              caseQty: extraAttrs.caseQty ? Number(extraAttrs.caseQty) : undefined,
              pcsQty: extraAttrs.pcsQty ? Number(extraAttrs.pcsQty) : undefined,
              unitsPerCase: extraAttrs.unitsPerCase ? Number(extraAttrs.unitsPerCase) : undefined,
              schemeDesc: extraAttrs.schemeDesc || undefined,
              tradeDiscountPercent: extraAttrs.tradeDiscountPercent ? Number(extraAttrs.tradeDiscountPercent) : undefined,
              cashDiscountPercent: extraAttrs.cashDiscountPercent ? Number(extraAttrs.cashDiscountPercent) : undefined,
              // Service
              sacCode: extraAttrs.sacCode || undefined,
              servicePeriodFrom: extraAttrs.servicePeriodFrom || undefined,
              servicePeriodTo: extraAttrs.servicePeriodTo || undefined,
              jobSheetRef: extraAttrs.jobSheetRef || undefined,
              billingBasis: extraAttrs.billingBasis || undefined,
            };
          });
          setInvoiceLines(lines);
        }

        setIsDrawerOpen(true);
      } catch (err) {
        console.error("Failed to load invoice for editing", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [editIdFromUrl]);

  // Initialize persistent billing mode on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("udyogbill_last_billing_mode") as any;
      if (savedMode && (savedMode === "b2b" || savedMode === "retail" || savedMode === "thermal")) {
        setBillingMode(savedMode);
      }
    }
  }, []);

  const handleSetBillingMode = (mode: "b2b" | "retail" | "thermal") => {
    setBillingMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("udyogbill_last_billing_mode", mode);
    }
  };

  // 100% Keyboard-Driven Engine Listener (F1-F10, Ctrl+Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Cheatsheet Help Modal
      if (e.key === "F1") {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
      }
      // F2: Focus item search
      else if (e.key === "F2") {
        e.preventDefault();
        if (!isDrawerOpen) {
          setIsDrawerOpen(true);
        }
        setTimeout(() => {
          const searchInput = document.getElementById("quick-product-search-input");
          searchInput?.focus();
        }, 100);
      }
      // F3: Quick Customer Modal
      else if (e.key === "F3") {
        e.preventDefault();
        setIsAddCustomerModalOpen(true);
      }
      // F7: Cycle Payment Mode
      else if (e.key === "F7") {
        e.preventDefault();
        setPrimaryPaymentMode((prev) => (prev % 4) + 1);
      }
      // F9: Cycle Billing Mode (B2B <-> Retail <-> Thermal)
      else if (e.key === "F9") {
        e.preventDefault();
        setBillingMode((prev) => {
          const next = prev === "b2b" ? "retail" : prev === "retail" ? "thermal" : "b2b";
          if (typeof window !== "undefined") {
            localStorage.setItem("udyogbill_last_billing_mode", next);
          }
          return next;
        });
      }
      // F10 or Ctrl+Enter: Instant Save & Print
      else if (e.key === "F10" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (isDrawerOpen && invoiceLines.length > 0 && !submitting) {
          handleCreateSubmit(new Event("submit") as any);
        }
      }
      // Esc: Dismiss modals
      else if (e.key === "Escape") {
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
        else if (isAddCustomerModalOpen) setIsAddCustomerModalOpen(false);
        else if (isDrawerOpen) setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, invoiceLines, submitting, isShortcutsHelpOpen, isAddCustomerModalOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, itemsRes, custRes, brRes, whRes, brkRes] = await Promise.all([
        salesService.getInvoices({
          searchTerm: searchTerm || undefined,
          status: selectedStatus ? parseInt(selectedStatus) : undefined,
          invoiceType: selectedType ? parseInt(selectedType) : undefined,
        }),
        inventoryService.getItems({ pageSize: 150 }),
        partyService.getCustomers({ pageSize: 150 }),
        tenantAppService.getBranches(),
        tenantAppService.getWarehouses(),
        brokerService.getBrokers({ pageSize: 100, activeOnly: true }).catch(() => ({ items: [], totalCount: 0 })),
      ]);

      setInvoices(invRes.items);
      setItems(itemsRes.items);
      setCustomers(custRes.items);
      setBranches(brRes);
      setWarehouses(whRes);
      setBrokers(brkRes.items || []);

      if (brRes.length > 0 && !selectedBranchId) {
        const ho = brRes.find((b) => b.isHeadOffice) || brRes[0];
        setSelectedBranchId(ho.id);
        setBillingStateCode(ho.stateCode || "27");
      }
      if (whRes.length > 0 && !selectedWarehouseId) {
        const def = whRes.find((w) => w.isDefault) || whRes[0];
        setSelectedWarehouseId(def.id);
      }
    } catch (err) {
      console.error("Failed to load sales invoices", err);
    } finally {
      setLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  // Debounced search/filter for invoices only (avoids reloading items, customers, branches on each keystroke)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData();
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const invRes = await salesService.getInvoices({
          searchTerm: searchTerm || undefined,
          status: selectedStatus ? parseInt(selectedStatus) : undefined,
          invoiceType: selectedType ? parseInt(selectedType) : undefined,
        });
        setInvoices(invRes.items);
      } catch (err) {
        console.error("Failed to load filtered sales invoices", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus, selectedType]);

  // Load customer previous deal history for instant hints on each product (ONLY for selected registered customers, NEVER on walk-in keystroke)
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDealHistoryMap({});
      return;
    }

    let active = true;
    p0ReportService
      .getSalesRegisterDetailed({
        partyId: selectedCustomerId,
        pageSize: 150,
      })
      .then((res) => {
        if (active && res?.items) {
          const map: Record<string, CustomerDealPoint[]> = {};
          res.items.forEach((item) => {
            if (!map[item.itemId]) {
              map[item.itemId] = [];
            }
            if (map[item.itemId].length < 3) {
              const d = item.invoiceDate
                ? new Date(item.invoiceDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                  })
                : "Recent";

              const gross = item.grossAmount || item.quantity * item.rate || 0;
              const discPct =
                item.discountAmount > 0 && gross > 0
                  ? Math.round((item.discountAmount / gross) * 100)
                  : 0;
              const discStr =
                discPct > 0
                  ? `${discPct}% disc (₹${item.discountAmount})`
                  : item.discountAmount > 0
                  ? `₹${item.discountAmount} disc`
                  : "0% disc";

              let freeQty = 0;
              try {
                const attrs = JSON.parse((item as any).attributesJson || "{}");
                freeQty = attrs.freeQuantity || 0;
              } catch {}

              const dealStr =
                freeQty > 0
                  ? `${item.quantity}+${freeQty} Free`
                  : `${item.quantity} ${item.uomCode || "Qty"}`;

              map[item.itemId].push({
                date: d,
                invoiceNumber: item.invoiceNumber,
                rate: item.rate,
                discount: discStr,
                dealQty: dealStr,
                batchNumber: item.batchNumber,
              });
            }
          });
          setCustomerDealHistoryMap(map);
        }
      })
      .catch(() => {
        if (active) setCustomerDealHistoryMap({});
      });

    return () => {
      active = false;
    };
  }, [selectedCustomerId]);

  const fetchItemBatches = async (itemId: string): Promise<ItemBatch[]> => {
    try {
      const batches = await inventoryService.getBatches(itemId);
      if (!batches || batches.length === 0) return [];
      // Sort FEFO (earliest expiry first)
      return [...batches].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    } catch {
      return [];
    }
  };

  const calculateLineAmounts = (
    qty: number,
    rate: number,
    discType: "percent" | "fixed",
    discVal: number,
    gst: number
  ) => {
    const gross = qty * rate;
    const discAmt = discType === "percent" ? gross * (discVal / 100) : discVal;
    const taxable = Math.max(0, gross - discAmt);
    const taxAmt = taxable * (gst / 100);
    const total = taxable + taxAmt;
    return {
      discountAmount: Math.round(discAmt * 100) / 100,
      taxableAmount: Math.round(taxable * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
    };
  };

  const handleLoadDemoItem = async () => {
    if (loadingDemoItem) return;

    let targetItem: MasterItem | null = items.length > 0 ? items[0] : null;

    if (!targetItem) {
      try {
        setLoadingDemoItem(true);
        // 1. Fetch Units of Measure to assign a valid primary UOM
        let uomId = "";
        let uomCode = "PCS";
        try {
          const uoms = await inventoryService.getUnits();
          if (uoms && uoms.length > 0) {
            const foundUom =
              uoms.find(
                (u) =>
                  u.code?.toUpperCase() === "PCS" ||
                  u.code?.toUpperCase() === "NOS" ||
                  u.name?.toLowerCase().includes("pc")
              ) || uoms[0];
            uomId = foundUom.id;
            uomCode = foundUom.code || "PCS";
          }
        } catch (e) {
          console.warn("Could not fetch units for demo item:", e);
        }

        const sampleSku = `DEMO-${Date.now().toString().slice(-4)}`;
        const sampleName = isPharma ? "Paracetamol 650mg / Sample Product" : "Sample Demo Product";

        // 2. Persist real demo item in the tenant's database
        const createdId = await inventoryService.createItem({
          sku: sampleSku,
          name: sampleName,
          primaryUomId: uomId,
          hsnCode: isPharma ? "30049099" : "84713010",
          sellingPrice: 100,
          mrp: 120,
          taxRate: 18,
          trackInventory: false,
        });

        const createdItem: MasterItem = {
          id: createdId,
          sku: sampleSku,
          name: sampleName,
          hsnCode: isPharma ? "30049099" : "84713010",
          primaryUomId: uomId,
          primaryUomCode: uomCode,
          sellingPrice: 100,
          mrp: 120,
          taxRate: 18,
          isActive: true,
          type: "Product",
          currentStock: 100,
        } as any;

        targetItem = createdItem;
        setItems([createdItem]);
      } catch (err: any) {
        console.error("Failed to auto-create demo item in database", err);
        alert(err?.response?.data?.message || err?.message || "Failed to create demo item. Please add an item first.");
        return;
      } finally {
        setLoadingDemoItem(false);
      }
    }

    const sampleName = targetItem.name;
    const sampleSku = targetItem.sku;
    const sampleHsn = targetItem.hsnCode || (isPharma ? "30049099" : "84713010");
    const sampleRate = targetItem.sellingPrice || 100;
    const sampleGst = targetItem.taxRate !== undefined ? targetItem.taxRate : 18;

    const calculated = calculateLineAmounts(1, sampleRate, "percent", 0, sampleGst);

    const demoLine: InvoiceLineItemForm = {
      itemId: targetItem.id,
      itemSku: sampleSku,
      itemName: sampleName,
      batchId: "",
      batchNumber: "BAT-DEMO1",
      expiryDate: "12/28",
      packing: "1x10",
      hsnCode: sampleHsn,
      quantity: 1,
      freeQuantity: 0,
      uomId: targetItem.primaryUomId,
      uomCode: targetItem.primaryUomCode || "PCS",
      mrp: targetItem.mrp || sampleRate * 1.2,
      unitPrice: sampleRate,
      discountType: "percent",
      discountValue: 0,
      discountAmount: 0,
      taxableAmount: calculated.taxableAmount,
      gstRate: sampleGst,
      totalAmount: calculated.totalAmount,
      availableBatches: [],
      loadingBatches: false,
    };

    setInvoiceLines((prev) => {
      if (prev.length === 1 && (!prev[0].itemId || prev[0].itemId.startsWith("00000000"))) {
        return [demoLine];
      }
      return prev.length === 0 ? [demoLine] : [...prev, demoLine];
    });

    if (!customerName) setCustomerName("Rajesh Kumar (Sample Customer)");
    if (!customerPhone) setCustomerPhone("9876543210");
  };

  const handleAddLine = async () => {
    if (items.length === 0) {
      await handleLoadDemoItem();
      return;
    }
    const firstItem = items[0];
    let packing = "";
    try {
      const attrs = JSON.parse(firstItem.attributesJson || "{}");
      packing = attrs.packing || attrs.netWeight || attrs.size || "";
    } catch {}

    const batches = await fetchItemBatches(firstItem.id);
    const selectedBatch = batches.length > 0 ? batches[0] : null;

    let exp = "";
    if (selectedBatch?.expiryDate) {
      const d = new Date(selectedBatch.expiryDate);
      exp = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }

    const newRate =
      selectedBatch?.saleRate && selectedBatch.saleRate > 0
        ? selectedBatch.saleRate
        : firstItem.sellingPrice || firstItem.mrp || 0;
    const newMrp =
      selectedBatch?.mrp && selectedBatch.mrp > 0
        ? selectedBatch.mrp
        : firstItem.mrp || 0;

    const calculated = calculateLineAmounts(
      1,
      newRate,
      "percent",
      0,
      firstItem.taxRate || 18
    );

    const newLine: InvoiceLineItemForm = {
      itemId: firstItem.id,
      itemSku: firstItem.sku,
      itemName: firstItem.name,
      batchId: selectedBatch ? selectedBatch.id : "",
      batchNumber: selectedBatch
        ? selectedBatch.batchNumber
        : firstItem.sku
        ? `BAT-${firstItem.sku.slice(0, 6)}`
        : "",
      expiryDate: exp,
      packing: packing,
      hsnCode: firstItem.hsnCode || "",
      quantity: 1,
      freeQuantity: 0,
      uomId: firstItem.primaryUomId,
      uomCode: firstItem.primaryUomCode,
      mrp: newMrp,
      unitPrice: newRate,
      discountType: "percent",
      discountValue: 0,
      discountAmount: calculated.discountAmount,
      taxableAmount: calculated.taxableAmount,
      gstRate: firstItem.taxRate || 18,
      totalAmount: calculated.totalAmount,
      availableBatches: batches,
      loadingBatches: false,
    };

    setInvoiceLines((prev) => [...prev, newLine]);
  };

  const invoiceTourSteps: TourStep[] = React.useMemo(
    () => [
      {
        targetId: "tour-customer-box",
        titleHi: "👉 Step 1: Customer / Grahak ka Naam",
        titleEn: "Step 1: Customer Details",
        descHi: "Yahan grahak ka naam aur phone number dalein (ya sample customer rehne dein).",
        descEn: "Select customer or enter buyer name and phone number.",
        actionLabelHi: "Agla Step",
        actionLabelEn: "Next Step",
      },
      {
        targetId: "tour-demo-item-btn",
        titleHi: "👉 Step 2: ⚡ 1-Click Demo Bill Button",
        titleEn: "Step 2: Instant 1-Click Demo Bill",
        descHi: "Pehli baar test karne ke liye bas is button par click karein. Ye turant sample item aur GST rate load kar dega!",
        descEn: "Click this button to instantly populate a demo item and calculate taxes in 1 second.",
        actionLabelHi: "Item Load Karein",
        actionLabelEn: "Load Item",
        onAction: () => {
          handleLoadDemoItem();
        },
      },
      {
        targetId: "tour-save-invoice-btn",
        titleHi: "🎉 Final Step: Bill Save & Print Karein",
        titleEn: "Step 3: Save & Print Invoice",
        descHi: "Aapka pehla bill ready hai! Yahan click karte hi bill save ho jayega aur print preview khul jayega!",
        descEn: "Click here to save the invoice and generate print preview in thermal/A4 format.",
        actionLabelHi: "Complete (समझ गया)",
        actionLabelEn: "Finish Tour",
      },
    ],
    [items, customerName, customerPhone]
  );

  const handleAddLineWithItem = async (item: MasterItem) => {
    let packing = "";
    try {
      const attrs = JSON.parse(item.attributesJson || "{}");
      packing = attrs.packing || attrs.netWeight || attrs.size || "";
    } catch {}

    const batches = await fetchItemBatches(item.id);
    const selectedBatch = batches.length > 0 ? batches[0] : null;

    let exp = "";
    if (selectedBatch?.expiryDate) {
      const d = new Date(selectedBatch.expiryDate);
      exp = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }

    const newMrp = (selectedBatch as any)?.mrp || item.mrp || item.sellingPrice || 0;
    const newRate = (selectedBatch as any)?.saleRate || item.sellingPrice || 0;
    const baseGst = item.taxRate || 12;
    const { ptr: calcPtr, pts: calcPts } = calculateMargPharmaRates(newMrp, baseGst);
    const finalPtr = (selectedBatch as any)?.ptr || calcPtr;
    const finalPts = (selectedBatch as any)?.pts || calcPts;

    let effectiveRate = newRate;
    if (hasPharmaAddon) {
      if (pharmaTradeTier === "company_to_stockist" && finalPts > 0) effectiveRate = finalPts;
      else if (pharmaTradeTier === "stockist_to_chemist" && finalPtr > 0) effectiveRate = finalPtr;
      else if (pharmaTradeTier === "chemist_to_patient" && newMrp > 0) effectiveRate = newMrp;
    }

    const effectiveGst = isGarments
      ? ((effectiveRate > 0 ? effectiveRate : newMrp) <= 1000 ? 5 : 12)
      : baseGst;

    const calculated = calculateLineAmounts(
      1,
      effectiveRate,
      "percent",
      0,
      effectiveGst
    );

    const newLine: InvoiceLineItemForm = {
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      batchId: selectedBatch ? selectedBatch.id : "",
      batchNumber: selectedBatch
        ? selectedBatch.batchNumber
        : item.sku
        ? `BAT-${item.sku.slice(0, 6)}`
        : "",
      expiryDate: exp,
      packing: packing,
      hsnCode: item.hsnCode || "",
      quantity: 1,
      freeQuantity: 0,
      uomId: item.primaryUomId,
      uomCode: item.primaryUomCode,
      mrp: newMrp,
      ptr: finalPtr,
      pts: finalPts,
      unitPrice: effectiveRate,
      discountType: "percent",
      discountValue: 0,
      discountAmount: calculated.discountAmount,
      taxableAmount: calculated.taxableAmount,
      gstRate: effectiveGst,
      totalAmount: calculated.totalAmount,
      availableBatches: batches,
      loadingBatches: false,
    };

    setInvoiceLines((prev) => [...prev, newLine]);
  };

  const handleRemoveLine = (idx: number) => {
    setInvoiceLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineItemChange = async (idx: number, itemId: string) => {
    const found = items.find((i) => i.id === itemId);
    if (!found) return;

    let packing = "";
    try {
      const attrs = JSON.parse(found.attributesJson || "{}");
      packing = attrs.packing || attrs.netWeight || attrs.size || "";
    } catch {}

    const batches = await fetchItemBatches(found.id);
    const selectedBatch = batches.length > 0 ? batches[0] : null;

    let exp = "";
    if (selectedBatch?.expiryDate) {
      const d = new Date(selectedBatch.expiryDate);
      exp = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
    }

    const newRate =
      selectedBatch?.saleRate && selectedBatch.saleRate > 0
        ? selectedBatch.saleRate
        : found.sellingPrice || found.mrp || 0;
    const newMrp =
      selectedBatch?.mrp && selectedBatch.mrp > 0
        ? selectedBatch.mrp
        : found.mrp || 0;

    const baseGst = found.taxRate || 12;
    const { ptr: calcPtr, pts: calcPts } = calculateMargPharmaRates(newMrp, baseGst);
    const finalPtr = (selectedBatch as any)?.ptr || calcPtr;
    const finalPts = (selectedBatch as any)?.pts || calcPts;

    let effectiveRate = newRate;
    if (hasPharmaAddon) {
      if (pharmaTradeTier === "company_to_stockist" && finalPts > 0) effectiveRate = finalPts;
      else if (pharmaTradeTier === "stockist_to_chemist" && finalPtr > 0) effectiveRate = finalPtr;
      else if (pharmaTradeTier === "chemist_to_patient" && newMrp > 0) effectiveRate = newMrp;
    }

    const effectiveGst = isGarments
      ? ((effectiveRate > 0 ? effectiveRate : newMrp) <= 1000 ? 5 : 12)
      : baseGst;

    const calculated = calculateLineAmounts(
      1,
      effectiveRate,
      "percent",
      0,
      effectiveGst
    );

    setInvoiceLines((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              ...line,
              itemId: found.id,
              itemSku: found.sku,
              itemName: found.name,
              batchId: selectedBatch ? selectedBatch.id : "",
              batchNumber: selectedBatch
                ? selectedBatch.batchNumber
                : found.sku
                ? `BAT-${found.sku.slice(0, 6)}`
                : "",
              expiryDate: exp,
              packing: packing,
              hsnCode: found.hsnCode || "",
              quantity: 1,
              freeQuantity: 0,
              uomId: found.primaryUomId,
              uomCode: found.primaryUomCode,
              mrp: newMrp,
              ptr: finalPtr,
              pts: finalPts,
              unitPrice: effectiveRate,
              gstRate: effectiveGst,
              discountValue: 0,
              discountAmount: calculated.discountAmount,
              taxableAmount: calculated.taxableAmount,
              totalAmount: calculated.totalAmount,
              availableBatches: batches,
              loadingBatches: false,
            }
          : line
      )
    );
  };

  const handleBatchSelect = (idx: number, batchId: string) => {
    setInvoiceLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const foundBatch = line.availableBatches.find((b) => b.id === batchId);
        if (!foundBatch) {
          return {
            ...line,
            batchId: "",
            batchNumber: "",
            expiryDate: "",
          };
        }
        let exp = "";
        if (foundBatch.expiryDate) {
          const d = new Date(foundBatch.expiryDate);
          exp = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
        }
        const newRate = (foundBatch.saleRate && foundBatch.saleRate > 0) ? foundBatch.saleRate : line.unitPrice;
        const newMrp = (foundBatch.mrp && foundBatch.mrp > 0) ? foundBatch.mrp : line.mrp;
        const calculated = calculateLineAmounts(
          line.quantity,
          newRate,
          line.discountType,
          line.discountValue,
          line.gstRate
        );

        return {
          ...line,
          batchId: foundBatch.id,
          batchNumber: foundBatch.batchNumber,
          expiryDate: exp,
          mrp: newMrp,
          unitPrice: newRate,
          discountAmount: calculated.discountAmount,
          taxableAmount: calculated.taxableAmount,
          totalAmount: calculated.totalAmount,
        };
      })
    );
  };

  const updateLineField = (idx: number, field: keyof InvoiceLineItemForm, value: any) => {
    setInvoiceLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const updated = { ...line, [field]: value };

        // 1. Marg ERP DPCO Reverse Pharma Pricing Auto-Calculation
        if (field === "mrp" && isPharma) {
          const mrpVal = Number(value) || 0;
          const { ptr, pts } = calculateMargPharmaRates(mrpVal, Number(line.gstRate) || 12);
          updated.ptr = ptr;
          updated.pts = pts;

          if (pharmaTradeTier === "company_to_stockist" && pts > 0) {
            updated.unitPrice = pts;
          } else if (pharmaTradeTier === "stockist_to_chemist" && ptr > 0) {
            updated.unitPrice = ptr;
          } else if (pharmaTradeTier === "chemist_to_patient" && mrpVal > 0) {
            updated.unitPrice = mrpVal;
          }
        } else if (field === "ptr" && isPharma) {
          const ptrVal = Number(value) || 0;
          if (pharmaTradeTier === "stockist_to_chemist") {
            updated.unitPrice = ptrVal;
          }
        } else if (field === "pts" && isPharma) {
          const ptsVal = Number(value) || 0;
          if (pharmaTradeTier === "company_to_stockist") {
            updated.unitPrice = ptsVal;
          }
        }

        // 1.5. Garments GST Slab Threshold Rule (<= ₹1,000 = 5%, > ₹1,000 = 12%)
        if (isGarments && (field === "unitPrice" || field === "mrp")) {
          const effectivePrice = Number(updated.unitPrice) || Number(updated.mrp) || 0;
          if (effectivePrice > 0) {
            updated.gstRate = effectivePrice <= 1000 ? 5 : 12;
          }
        }

        // 2. Hardware Dimension Engine (Length x Width -> Sq.Ft)
        if (field === "dimLength" || field === "dimWidth" || field === "dimUnit") {
          const l = field === "dimLength" ? Number(value) : (updated.dimLength || 0);
          const w = field === "dimWidth" ? Number(value) : (updated.dimWidth || 0);
          const u = field === "dimUnit" ? value : (updated.dimUnit || "FEET");
          let sqft = 0;
          if (l > 0 && w > 0) {
            if (u === "INCH") sqft = (l * w) / 144;
            else if (u === "MM") sqft = (l * w) / 92903.04;
            else if (u === "METER") sqft = (l * w) * 10.7639;
            else sqft = l * w; // FEET
            sqft = Math.round(sqft * 100) / 100;
          }
          updated.sqft = sqft;
          if (updated.rateBasis === "per_sqft" || (!updated.rateBasis && sqft > 0)) {
            updated.quantity = sqft;
          }
        }

        // 3. Hardware Weight Engine (Pieces x Weight/Piece -> Total Kg)
        if (field === "weightPerPieceKg" || (field === "quantity" && updated.weightPerPieceKg)) {
          const wtPerPc = field === "weightPerPieceKg" ? Number(value) : (updated.weightPerPieceKg || 0);
          const pcs = field === "quantity" ? Number(value) : (updated.quantity || 1);
          if (wtPerPc > 0) {
            updated.totalWeightKg = Math.round(pcs * wtPerPc * 100) / 100;
            if (updated.rateBasis === "per_kg") {
              updated.quantity = updated.totalWeightKg;
            }
          }
        }

        // 4. FMCG Packaging Engine (Master Cases + Loose Pcs -> Total Units)
        if (field === "caseQty" || field === "pcsQty" || field === "unitsPerCase") {
          const cq = field === "caseQty" ? Number(value) : (updated.caseQty || 0);
          const pq = field === "pcsQty" ? Number(value) : (updated.pcsQty || 0);
          const upc = field === "unitsPerCase" ? Number(value) : (updated.unitsPerCase || 24);
          if (cq > 0 || pq > 0) {
            updated.quantity = (cq * upc) + pq;
          }
        }

        // 5. FMCG Free Scheme Engine (Buy X Get Y Free)
        if (field === "schemeDesc" || (field === "quantity" && updated.schemeDesc)) {
          const sc = field === "schemeDesc" ? String(value).trim() : (updated.schemeDesc || "");
          const currentQty = field === "quantity" ? Number(value) : (updated.quantity || 0);
          if (sc === "10+1" || sc.includes("10+1")) {
            updated.freeQuantity = Math.floor(currentQty / 10);
          } else if (sc === "5+1" || sc.includes("5+1")) {
            updated.freeQuantity = Math.floor(currentQty / 5);
          } else if (sc === "20+2" || sc.includes("20+2")) {
            updated.freeQuantity = Math.floor(currentQty / 20) * 2;
          }
        }

        // 6. FMCG Trade Discount %
        if (field === "tradeDiscountPercent") {
          const td = Number(value) || 0;
          updated.discountType = "percent";
          updated.discountValue = td;
        }

        const calculated = calculateLineAmounts(
          Number(updated.quantity) || 1,
          Number(updated.unitPrice) || 0,
          updated.discountType,
          Number(updated.discountValue) || 0,
          Number(updated.gstRate) || 0
        );
        return {
          ...updated,
          discountAmount: calculated.discountAmount,
          taxableAmount: calculated.taxableAmount,
          totalAmount: calculated.totalAmount,
        };
      })
    );
  };

  // Instant Pharma Trade Tier Switcher (Company -> Stockist -> Chemist -> Patient)
  const handleSwitchPharmaTradeTier = (newTier: "company_to_stockist" | "stockist_to_chemist" | "chemist_to_patient") => {
    setPharmaTradeTier(newTier);
    setInvoiceLines((prev) =>
      prev.map((line) => {
        let newRate = line.unitPrice;
        if (newTier === "company_to_stockist" && (line.pts || 0) > 0) {
          newRate = line.pts!;
        } else if (newTier === "stockist_to_chemist" && (line.ptr || 0) > 0) {
          newRate = line.ptr!;
        } else if (newTier === "chemist_to_patient" && (line.mrp || 0) > 0) {
          newRate = line.mrp;
        }

        const calculated = calculateLineAmounts(
          Number(line.quantity) || 1,
          Number(newRate) || 0,
          line.discountType,
          Number(line.discountValue) || 0,
          Number(line.gstRate) || 0
        );

        return {
          ...line,
          unitPrice: newRate,
          discountAmount: calculated.discountAmount,
          taxableAmount: calculated.taxableAmount,
          totalAmount: calculated.totalAmount,
        };
      })
    );
  };

  const showPtsColumn = hasPharmaAddon && pharmaTradeTier === "company_to_stockist";
  const showPtrColumn = hasPharmaAddon && (pharmaTradeTier === "company_to_stockist" || pharmaTradeTier === "stockist_to_chemist");
  const showMrpColumn = hasPharmaAddon;

  // Computations
  const subTotal = invoiceLines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const totalItemDiscount = invoiceLines.reduce((acc, l) => acc + l.discountAmount, 0);
  const totalTaxable = invoiceLines.reduce((acc, l) => acc + l.taxableAmount, 0);
  const totalTax = invoiceLines.reduce((acc, l) => acc + (l.taxableAmount * (l.gstRate / 100)), 0);
  const grandTotal = Math.round((totalTaxable + totalTax) * 100) / 100;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const netPayable = Math.round(grandTotal);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !selectedWarehouseId || invoiceLines.length === 0) {
      alert("Please select branch, warehouse, and add at least one line item.");
      return;
    }

    try {
      setSubmitting(true);
      const selectedParty = customers.find((c) => c.id === selectedCustomerId);
      const currentBranch = branches.find((b) => b.id === selectedBranchId);

      const itemsPayload: CreateInvoiceItemInput[] = invoiceLines.map((line) => ({
        itemId: line.itemId,
        batchId: line.batchId || undefined,
        batchNumber: line.batchNumber || undefined,
        expiryDate: line.expiryDate
          ? line.expiryDate.includes("/")
            ? new Date(2000 + Number(line.expiryDate.split("/")[1]), Number(line.expiryDate.split("/")[0]) - 1, 1).toISOString()
            : new Date(line.expiryDate).toISOString()
          : undefined,
        quantity: Number(line.quantity) || 1,
        freeQuantity: Number(line.freeQuantity) || 0,
        packing: line.packing || undefined,
        hsnCode: line.hsnCode || undefined,
        uomId: line.uomId,
        unitPrice: Number(line.unitPrice) || 0,
        mrp: Number(line.mrp) || 0,
        ptr: Number(line.ptr) || 0,
        pts: Number(line.pts) || 0,
        discountPercent: line.discountType === "percent" ? Number(line.discountValue) : 0,
        discountAmount: line.discountAmount || 0,
        attributesJson: JSON.stringify({
          packing: line.packing,
          freeQuantity: line.freeQuantity,
          expiryFormatted: line.expiryDate,
          mrp: Number(line.mrp) || 0,
          ptr: Number(line.ptr) || 0,
          pts: Number(line.pts) || 0,
          // Electronics
          imeiSerial: line.imeiSerial,
          imei2: line.imei2,
          brand: line.brand,
          modelVariant: line.modelVariant,
          warrantyMonths: line.warrantyMonths,
          // Hardware
          length: line.dimLength,
          width: line.dimWidth,
          dimensionUnit: line.dimUnit,
          sqft: line.sqft,
          runningFt: line.runningFt,
          weightPerPieceKg: line.weightPerPieceKg,
          totalWeightKg: line.totalWeightKg,
          rateBasis: line.rateBasis,
          contractorName: line.contractorName,
          // Garments
          size: line.size,
          color: line.color,
          styleCode: line.styleCode,
          fit: line.fit,
          // FMCG
          caseQty: line.caseQty,
          pcsQty: line.pcsQty,
          unitsPerCase: line.unitsPerCase,
          schemeDesc: line.schemeDesc,
          tradeDiscountPercent: line.tradeDiscountPercent,
          cashDiscountPercent: line.cashDiscountPercent,
          // Service Sector
          sacCode: line.sacCode,
          servicePeriodFrom: line.servicePeriodFrom,
          servicePeriodTo: line.servicePeriodTo,
          jobSheetRef: line.jobSheetRef,
          billingBasis: line.billingBasis,
        }),
      }));

      let targetInvoiceId: string;
      const invoicePayload = {
        invoiceType: billingMode === "thermal" ? 2 : 1, // 2: POSBill, 1: TaxInvoice
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedCustomerId || undefined,
        customerName: selectedParty ? selectedParty.legalName : (customerName || "Walk-in Customer"),
        customerPhone: selectedParty ? (selectedParty.mobile || selectedParty.primaryPhone) : customerPhone,
        customerGSTIN: selectedParty?.gstin || customerGstin || undefined,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || billingAddress || undefined,
        billingStateCode: billingStateCode,
        shippingStateCode: billingStateCode,
        placeOfSupply: currentBranch?.state || "Maharashtra",
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        primaryPaymentMode: primaryPaymentMode,
        paidAmount: paidAmount > 0 ? paidAmount : netPayable,
        transporterName: billingMode === "b2b" ? (transporterName || undefined) : undefined,
        vehicleNumber: billingMode === "b2b" ? (vehicleNumber || undefined) : undefined,
        lrNumber: billingMode === "b2b" ? (lrNumber || undefined) : undefined,
        lrDate: billingMode === "b2b" && lrDate ? new Date(lrDate).toISOString() : undefined,
        poNumber: billingMode === "b2b" ? (poNumber || undefined) : undefined,
        poDate: billingMode === "b2b" && poDate ? new Date(poDate).toISOString() : undefined,
        eWayBillNumber: billingMode === "b2b" ? (eWayBillNumber || undefined) : undefined,
        isReverseCharge: isReverseCharge,
        brokerId: selectedBrokerId || undefined,
        attributesJson: JSON.stringify({
          customerDlNumber: customerDlNumber || (selectedParty as any)?.drugLicenseNumber1 || (selectedParty as any)?.dlNumber || "",
          billingMode: billingMode,
          industryCode: activeIndustry,
          pharmaTradeTier: isPharma ? pharmaTradeTier : undefined,
          hardwareTradeTier: isHardware ? hardwareTradeTier : undefined,
          electronicsTradeTier: isElectronics ? electronicsTradeTier : undefined,
          fmcgTradeTier: isFmcg ? fmcgTradeTier : undefined,
          contractorName: isHardware ? contractorName : undefined,
          siteAddress: isHardware ? siteAddress : undefined,
          serviceJobSheetRef: isService ? serviceJobSheetRef : undefined,
          doctorName: isPharma ? (doctorName || undefined) : undefined,
          doctorRegNumber: isPharma ? (doctorRegNumber || undefined) : undefined,
          patientName: isPharma ? (patientName || undefined) : undefined,
          patientAddressPhone: isPharma ? (patientAddressPhone || undefined) : undefined,
        }),
        items: itemsPayload,
      };

      if (editingInvoiceId) {
        targetInvoiceId = await salesService.updateInvoice(editingInvoiceId, invoicePayload);
      } else {
        targetInvoiceId = await salesService.createInvoice(invoicePayload);
      }

      // 🖨️ Instant Auto-Print via Active Invoice Template (Pharma A4 / Standard / Thermal)
      if (targetInvoiceId) {
        try {
          const preview = await printTemplateService.renderPreview({ invoiceId: targetInvoiceId });
          if (preview?.renderedHtml) {
            printRawHtml(preview.renderedHtml, `Tax_Invoice_${targetInvoiceId.slice(0, 8)}`);
          }
        } catch (printErr) {
          console.error("Auto-print preview generation error:", printErr);
        }
      }

      setIsDrawerOpen(false);
      setEditingInvoiceId(null);
      setEditingInvoiceNumber("");
      if (editIdFromUrl) {
        router.replace("/app/sales/invoices");
      }
      setInvoiceLines([]);
      setPaidAmount(0);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedCustomerId("");
      loadData();
    } catch (err: any) {
      const errorMsg = 
        err?.response?.data?.error || 
        err?.response?.data?.errorMessage || 
        err?.response?.data?.message || 
        err?.message || 
        "Failed to create sales invoice.";
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentBadge = (status: number) => {
    switch (status) {
      case 2:
        return <Badge variant="success" dot size="sm">Paid</Badge>;
      case 1:
        return <Badge variant="warning" dot size="sm">Partial</Badge>;
      default:
        return <Badge variant="danger" dot size="sm">Unpaid</Badge>;
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center space-x-2 tracking-tight">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <span>Sales Invoices &amp; GST Billing</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, track, and print B2B / B2C tax invoices with real-time GST tax resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LaunchTourButton
            onClick={() => {
              setIsDrawerOpen(true);
              setTimeout(() => setIsTourOpen(true), 300);
            }}
          />

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setIsDrawerOpen(true);
              if (invoiceLines.length === 0) handleAddLine();
            }}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          >
            Create Tax Invoice
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={5} columns={9} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No sales invoices found"
            description="Start generating B2B or B2C GST invoices with automated tax calculations, HSN resolution, and thermal/A4 printing."
            actionLabel="Create Tax Invoice"
            onAction={() => {
              setIsDrawerOpen(true);
              if (invoiceLines.length === 0) handleAddLine();
            }}
            actionIcon={Plus}
          />
        ) : (
          <>
            {/* Mobile Invoices List (Clean, Touch-Friendly Cards View) */}
            <div className="block md:hidden divide-y divide-border">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className={`p-3.5 space-y-2.5 transition-colors ${
                    inv.isCancelled ? "bg-rose-500/5 opacity-80" : "hover:bg-surface-elevated/40"
                  }`}
                >
                  {/* Top row: Invoice #, Date & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <FileText className={`w-4 h-4 shrink-0 ${inv.isCancelled ? "text-rose-400" : "text-primary"}`} />
                      <Link
                        href={`/app/sales/invoices/${inv.id}`}
                        className={`font-bold text-sm tracking-tight truncate ${
                          inv.isCancelled ? "text-rose-400 line-through" : "text-primary hover:underline"
                        }`}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {inv.isCancelled ? (
                        <Badge variant="danger" dot size="sm">Cancelled</Badge>
                      ) : (
                        getPaymentBadge(inv.paymentStatus)
                      )}
                    </div>
                  </div>

                  {/* Customer & Branch */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{inv.customerName}</div>
                      {inv.customerGSTIN && (
                        <div className="text-[10px] text-muted-foreground font-mono">GST: {inv.customerGSTIN}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground shrink-0 text-right">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>

                  {/* Amount Breakdown */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/60 border border-border/80">
                    <div>
                      <span className="text-[10px] text-muted-foreground block leading-none mb-0.5">Total Amount</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {inv.balanceAmount > 0 ? (
                      <div className="text-right">
                        <span className="text-[10px] text-rose-400 font-semibold block leading-none mb-0.5">Due Balance</span>
                        <span className="text-xs font-bold text-rose-400 font-mono">
                          ₹{inv.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-none mb-0.5">Taxable</span>
                        <span className="text-xs text-slate-300 font-mono">
                          ₹{inv.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/app/sales/invoices/${inv.id}`}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-foreground text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>View &amp; Print</span>
                    </Link>

                    {!inv.isCancelled && (
                      <Link
                        href={`/app/sales/invoices?editId=${inv.id}`}
                        className="py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold transition-colors flex items-center space-x-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop 9-Column ERP Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-table-header text-table-headerForeground text-[11px] uppercase font-bold border-b border-border tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className={`hover:bg-table-rowHover transition-colors ${inv.isCancelled ? "bg-rose-500/5 opacity-80" : ""}`}>
                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${inv.isCancelled ? "text-rose-400" : "text-primary"}`} />
                          <Link
                            href={`/app/sales/invoices/${inv.id}`}
                            className={`font-bold hover:underline ${inv.isCancelled ? "text-rose-400 line-through" : "text-primary"}`}
                            title="Click to View / Print Invoice Details"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {inv.isCancelled && (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              title={inv.cancellationReason ? `Cancelled: ${inv.cancellationReason}` : "Invoice Cancelled / Voided"}
                            >
                              <Ban className="w-2.5 h-2.5 shrink-0" />
                              <span>Cancelled</span>
                            </span>
                          )}
                          {inv.hasCreditNote && (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              title={`Credit Note Issued: ${inv.creditNoteNumber || ""} | Returned: ₹${(inv.creditNoteAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                              <span>CN: {inv.creditNoteNumber}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{inv.customerName}</div>
                        {inv.customerGSTIN && <div className="text-[10px] text-muted-foreground font-mono">{inv.customerGSTIN}</div>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{inv.branchName || "Main Branch"}</td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">₹{inv.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-success">
                        ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-danger">
                        ₹{inv.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {inv.isCancelled ? (
                            <Badge variant="danger" dot size="sm">Cancelled</Badge>
                          ) : (
                            getPaymentBadge(inv.paymentStatus)
                          )}
                          {inv.hasCreditNote && (
                            <span
                              className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5 font-mono"
                              title={`Sale Return / Credit Note Total: ₹${(inv.creditNoteAmount || 0).toFixed(2)}`}
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Ret: ₹{(inv.creditNoteAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            href={`/app/sales/invoices/${inv.id}`}
                            className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-foreground text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                            title="Print / View 16-Column Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>View &amp; Print</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Tax Invoice Modal / Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-0 sm:p-2 z-[100000] overflow-hidden">
          <div className="create-tax-invoice-modal bg-slate-950 text-foreground border-0 sm:border border-slate-800 rounded-none sm:rounded-2xl w-full sm:w-[99.5vw] sm:max-w-[1850px] h-[100dvh] sm:h-[98vh] max-h-[100dvh] sm:max-h-[98vh] p-2.5 sm:p-3 shadow-2xl relative flex flex-col overflow-hidden">
            {/* Top Bar: Title, Industry Badge, Mode Selector, More Toggle, Hotkeys, Close */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 shrink-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
                <h3 className="text-xs sm:text-base font-bold text-white flex items-center space-x-1 sm:space-x-2 truncate">
                  <span className="truncate">{editingInvoiceId ? `Edit (${editingInvoiceNumber || "Draft"})` : "Create Invoice"}</span>
                  {!isOther && (
                    <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase font-mono font-bold shrink-0">
                      {activeIndustry}
                    </span>
                  )}
                </h3>
              </div>

              {/* Billing Mode Buttons */}
              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 sm:p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetBillingMode("b2b")}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    billingMode === "b2b"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 hidden sm:inline" />
                  <span>B2B</span>
                  <span className="hidden md:inline">Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetBillingMode("retail")}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    billingMode === "retail"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 hidden sm:inline" />
                  <span>Retail</span>
                  <span className="hidden md:inline">Cash Memo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetBillingMode("thermal")}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    billingMode === "thermal"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 hidden sm:inline" />
                  <span>POS</span>
                  <span className="hidden md:inline">Thermal</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                  className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg border flex items-center space-x-1 transition-colors font-medium cursor-pointer ${
                    isHeaderExpanded
                      ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-200"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span>{isHeaderExpanded ? "▲ Hide Options" : "⚙️ More"}</span>
                  <span className="hidden md:inline">{isHeaderExpanded ? "" : " Options"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  className="hidden sm:flex px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-800 items-center space-x-1 cursor-pointer"
                  title="Keyboard Shortcuts (F1)"
                >
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>F1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setEditingInvoiceId(null);
                    setEditingInvoiceNumber("");
                    if (editIdFromUrl) router.replace("/app/sales/invoices");
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 h-full min-h-0 space-y-2 overflow-hidden">
              {/* Scrollable Form Body (Ensures Pinned Header & Pinned Bottom Footer on mobile) */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 sm:pr-1 pb-16 sm:pb-4">
                {/* 1. Customer & Invoice Meta Row (Blue/Indigo Themed - Zero Overlap ERP Style) */}
                <div id="tour-customer-box" className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/30 border border-blue-500/30 shadow-sm shadow-blue-950/20 shrink-0 space-y-2">
                {/* Row 1: Party / Customer Selection + Date & Branch */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
                    <div className="flex items-center space-x-1.5 flex-1 min-w-[220px] max-w-[380px]">
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCustomerId(val);
                          const found = customers.find((c) => c.id === val);
                          if (found) {
                            setCustomerName(found.legalName);
                            setCustomerPhone(found.mobile || found.primaryPhone || "");
                            setCustomerGstin(found.gstin || "");
                            const dl = (found as any).drugLicenseNumber1 || (found as any).dlNumber || "";
                            setCustomerDlNumber(dl);
                            const addr = found.tradeName || (found as any).billingAddress?.addressLine1 || "";
                            setBillingAddress(addr);
                            if (isSameAsBilling) {
                              setShippingAddress(addr);
                            }
                            setBillingStateCode(found.stateCode || "27");

                            const cType = Number((found as any).customerType);
                            if (cType === 4) {
                              if (hasPharmaAddon) setPharmaTradeTier("company_to_stockist");
                              setBillingMode("b2b");
                            } else if (cType === 1 || found.gstin) {
                              if (hasPharmaAddon) setPharmaTradeTier("stockist_to_chemist");
                              setBillingMode("b2b");
                            } else if (cType === 2 || cType === 3 || cType === 8) {
                              if (hasPharmaAddon) setPharmaTradeTier("chemist_to_patient");
                            } else if (hasPharmaAddon) {
                              const nameLower = found.legalName.toLowerCase();
                              if (nameLower.includes("distributor") || nameLower.includes("stockist")) {
                                setPharmaTradeTier("company_to_stockist");
                                setBillingMode("b2b");
                              } else if (dl || nameLower.includes("chemist") || nameLower.includes("pharmacy") || nameLower.includes("medical")) {
                                setPharmaTradeTier("stockist_to_chemist");
                                setBillingMode("b2b");
                              } else {
                                setPharmaTradeTier("chemist_to_patient");
                              }
                            }
                          } else {
                            setCustomerName("");
                            setCustomerPhone("");
                            setCustomerGstin("");
                            setCustomerDlNumber("");
                            setBillingAddress("");
                            setShippingAddress("");
                            setBillingStateCode("27");
                            if (hasPharmaAddon) {
                              setPharmaTradeTier("chemist_to_patient");
                            }
                          }
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="">-- One-time Walk-in Customer --</option>
                        {customers.map((c) => {
                          const typeTag = c.customerType === 1 ? "[B2B]" : c.customerType === 2 ? "[B2C]" : c.customerType === 8 ? "[D2C]" : c.customerType === 4 ? "[Wholesale]" : c.customerType === 3 ? "[Retail]" : "";
                          return (
                            <option key={c.id} value={c.id}>
                              {typeTag ? `${typeTag} ` : ""}{c.code} - {c.legalName} ({c.primaryPhone || c.mobile || "No Phone"}) {c.gstin ? `[${c.gstin}]` : ""}
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsAddCustomerModalOpen(true);
                        }}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer"
                        title="Quick Add Customer (+ or F3)"
                      >
                        <Plus className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>

                    {selectedCustomerId ? (
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-300 shrink-0">
                        {customerGstin && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 font-bold">
                            GST: {customerGstin}
                          </span>
                        )}
                        {customerPhone && <span className="text-slate-400">Ph: {customerPhone}</span>}
                        <span className="text-slate-400">State: {billingStateCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId("");
                            setCustomerName("");
                            setCustomerPhone("");
                            setCustomerGstin("");
                            setCustomerDlNumber("");
                            setBillingAddress("");
                            setShippingAddress("");
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-1"
                          title="Clear Customer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 flex-1 min-w-[220px]">
                        <input
                          type="text"
                          required
                          placeholder="Buyer Name *"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="flex-1 min-w-[110px] px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500"
                        />
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="Phone (10 Digits)"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="w-28 sm:w-32 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right side: Invoice Date & Branch */}
                  <div className="flex items-center space-x-2.5 shrink-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Date:</span>
                      <input
                        type="date"
                        required
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Branch:</span>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => {
                          setSelectedBranchId(e.target.value);
                          const b = branches.find((br) => br.id === e.target.value);
                          if (b) setBillingStateCode(b.stateCode || "27");
                        }}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white max-w-[130px]"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branchName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 2: Secondary Controls, Industry Tiers, Broker & Logistical Toggles (Desktop default, Mobile when More Options clicked) */}
                <div className={`${isHeaderExpanded ? "flex" : "hidden md:flex"} flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Commission Broker */}
                    <div className="flex items-center space-x-1">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">Broker:</span>
                      <select
                        value={selectedBrokerId}
                        onChange={(e) => setSelectedBrokerId(e.target.value)}
                        className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-white max-w-[130px]"
                        title="Commission Broker / Aadath Agent"
                      >
                        <option value="">-- No Broker --</option>
                        {brokers.map((brk) => (
                          <option key={brk.id} value={brk.id}>
                            {brk.fullName} ({brk.defaultCommissionRate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pharma Trade Tier Pill Selector */}
                    {isPharma && (
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-teal-500/30 text-[11px] shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleSwitchPharmaTradeTier("company_to_stockist")}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            pharmaTradeTier === "company_to_stockist"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="PTS + PTR + MRP"
                        >
                          🏢 Co ➔ Stockist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchPharmaTradeTier("stockist_to_chemist")}
                          className={`px-2 py-0.5 rounded font-extrabold transition-all ${
                            pharmaTradeTier === "stockist_to_chemist"
                              ? "bg-teal-500 text-slate-950 shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="PTR + MRP (PTS Hidden)"
                        >
                          🏬 Stockist ➔ Chemist
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchPharmaTradeTier("chemist_to_patient")}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            pharmaTradeTier === "chemist_to_patient"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="MRP Only (PTR & PTS Hidden)"
                        >
                          🏥 Chemist ➔ Patient
                        </button>
                      </div>
                    )}

                    {/* Pharma Doctor Rx Toggle */}
                    {isPharma && (
                      <button
                        type="button"
                        onClick={() => setIsDoctorRxOpen(!isDoctorRxOpen)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center space-x-1 border transition-colors ${
                          isDoctorRxOpen || doctorName || doctorRegNumber || patientName
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                        title="Prescribing Doctor & Patient Record (Schedule H1 / CDSCO)"
                      >
                        <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>{isDoctorRxOpen ? "Hide Rx / Dr" : "+ Rx / Dr (H1)"}</span>
                        {(doctorName || patientName) && (
                          <span className="px-1 py-0.2 rounded text-[9px] bg-teal-500/40 text-teal-200 font-mono">
                            ✓
                          </span>
                        )}
                      </button>
                    )}

                    {/* Hardware Tier */}
                    {isHardware && (
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-amber-500/30 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setHardwareTradeTier("builder_contractor")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            hardwareTradeTier === "builder_contractor" ? "bg-amber-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🏗️ Builder
                        </button>
                        <button
                          type="button"
                          onClick={() => setHardwareTradeTier("wholesale")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            hardwareTradeTier === "wholesale" ? "bg-orange-600 text-white" : "text-slate-400"
                          }`}
                        >
                          📦 Wholesale
                        </button>
                        <button
                          type="button"
                          onClick={() => setHardwareTradeTier("retail_counter")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            hardwareTradeTier === "retail_counter" ? "bg-emerald-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🏪 Retail
                        </button>
                      </div>
                    )}

                    {/* Electronics Tier */}
                    {isElectronics && (
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-indigo-500/30 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setElectronicsTradeTier("distributor_to_dealer")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            electronicsTradeTier === "distributor_to_dealer" ? "bg-indigo-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🚚 Dist ➔ Dealer
                        </button>
                        <button
                          type="button"
                          onClick={() => setElectronicsTradeTier("dealer_to_retail")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            electronicsTradeTier === "dealer_to_retail" ? "bg-teal-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🏬 Dealer ➔ Retail
                        </button>
                        <button
                          type="button"
                          onClick={() => setElectronicsTradeTier("retail_consumer")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            electronicsTradeTier === "retail_consumer" ? "bg-emerald-600 text-white" : "text-slate-400"
                          }`}
                        >
                          👤 Retail
                        </button>
                      </div>
                    )}

                    {/* FMCG Tier */}
                    {isFmcg && (
                      <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-yellow-500/30 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFmcgTradeTier("super_stockist")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            fmcgTradeTier === "super_stockist" ? "bg-amber-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🏭 Super Stockist
                        </button>
                        <button
                          type="button"
                          onClick={() => setFmcgTradeTier("distributor_to_retailer")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            fmcgTradeTier === "distributor_to_retailer" ? "bg-yellow-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🚚 Distributor
                        </button>
                        <button
                          type="button"
                          onClick={() => setFmcgTradeTier("retailer_to_consumer")}
                          className={`px-2 py-0.5 rounded font-bold ${
                            fmcgTradeTier === "retailer_to_consumer" ? "bg-emerald-600 text-white" : "text-slate-400"
                          }`}
                        >
                          🛒 Retailer
                        </button>
                      </div>
                    )}

                    {/* Service Work Order */}
                    {isService && (
                      <input
                        type="text"
                        placeholder="Work Order / Job Sheet Ref"
                        value={serviceJobSheetRef}
                        onChange={(e) => setServiceJobSheetRef(e.target.value)}
                        className="px-2 py-0.5 bg-slate-950 border border-cyan-500/30 rounded text-xs text-cyan-300 w-44"
                      />
                    )}
                  </div>

                  {/* Transport & E-Way Toggle */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsTransportOpen(!isTransportOpen)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center space-x-1 border transition-colors whitespace-nowrap ${
                        isTransportOpen || transporterName || vehicleNumber || lrNumber || poNumber || eWayBillNumber
                          ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                      title="Add Transporter, Vehicle, LR, PO details"
                    >
                      <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{isTransportOpen ? "Hide Transport" : "+ Transport Detail"}</span>
                      {(transporterName || vehicleNumber || lrNumber || poNumber || eWayBillNumber) && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-indigo-500/40 text-indigo-200 font-mono">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Transport, LR & PO Details Card */}
                {isTransportOpen && (
                  <div className="pt-2 border-t border-slate-800 animate-in fade-in duration-150">
                    <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-indigo-500/20">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300">
                          <Truck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Transport, LR (Bilty), Vehicle & Buyer PO Details</span>
                        </div>
                        <label className="flex items-center space-x-1 cursor-pointer text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={isReverseCharge}
                            onChange={(e) => setIsReverseCharge(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 w-3 h-3"
                          />
                          <span>RCM (Reverse Charge)</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">Transporter Name</label>
                          <input
                            type="text"
                            placeholder="Transporter..."
                            value={transporterName}
                            onChange={(e) => setTransporterName(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">Vehicle Number</label>
                          <input
                            type="text"
                            placeholder="e.g. MH-12-RN-9921"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">LR (Bilty) Number</label>
                          <input
                            type="text"
                            placeholder="LR-..."
                            value={lrNumber}
                            onChange={(e) => setLrNumber(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">LR Date</label>
                          <input
                            type="date"
                            value={lrDate}
                            onChange={(e) => setLrDate(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">Buyer PO Number</label>
                          <input
                            type="text"
                            placeholder="PO-..."
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-300 block mb-0.5">Buyer PO Date</label>
                          <input
                            type="date"
                            value={poDate}
                            onChange={(e) => setPoDate(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-300 block mb-0.5">E-Way Bill Number</label>
                          <input
                            type="text"
                            placeholder="12-digit E-Way Bill..."
                            value={eWayBillNumber}
                            onChange={(e) => setEWayBillNumber(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Secondary Fields: Addresses, Warehouse & Due Date */}
                {isHeaderExpanded && (
                  <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Warehouse</label>
                        <select
                          value={selectedWarehouseId}
                          onChange={(e) => setSelectedWarehouseId(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        >
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.warehouseName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Due Date</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Billing Address</label>
                        <input
                          type="text"
                          placeholder="Billing Address..."
                          value={billingAddress}
                          onChange={(e) => {
                            setBillingAddress(e.target.value);
                            if (isSameAsBilling) setShippingAddress(e.target.value);
                          }}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-semibold text-slate-400">Shipping Address</label>
                          <label className="text-[10px] text-indigo-400 cursor-pointer flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={isSameAsBilling}
                              onChange={(e) => {
                                setIsSameAsBilling(e.target.checked);
                                if (e.target.checked) setShippingAddress(billingAddress);
                              }}
                              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 w-3 h-3"
                            />
                            <span>Same</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          disabled={isSameAsBilling}
                          placeholder="Shipping Address..."
                          value={isSameAsBilling ? billingAddress : shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Table Container */}
              <div className="flex-1 min-h-0 flex flex-col space-y-1">
                {/* 2. Search Bar & Quick Add Row (Purple Accent) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0 p-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30 shadow-sm shadow-purple-950/20">
                  <div className="relative w-full sm:flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="quick-product-search-input"
                      type="text"
                      placeholder={
                        hasBatchTracking
                          ? "🔍 Type product name / SKU (Press Enter to add first match, F2 to focus)..."
                          : "🔍 Type product or service name (Press Enter to add first match, F2 to focus)..."
                      }
                      value={quickProductSearch}
                      onChange={(e) => setQuickProductSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickProductSearch.trim()) {
                          e.preventDefault();
                          const matches = items.filter(
                            (item) =>
                              item.name.toLowerCase().includes(quickProductSearch.toLowerCase()) ||
                              item.sku.toLowerCase().includes(quickProductSearch.toLowerCase())
                          );
                          if (matches.length > 0) {
                            const selectedItem = matches[0];
                            const currentLen = invoiceLines.length;
                            handleAddLineWithItem(selectedItem);
                            setQuickProductSearch("");
                            setTimeout(() => {
                              const nextQty = document.getElementById(`line-qty-${currentLen}`);
                              if (nextQty) {
                                (nextQty as HTMLInputElement).focus();
                                (nextQty as HTMLInputElement).select();
                              }
                            }, 120);
                          }
                        }
                      }}
                      className="w-full pl-8 pr-8 py-1.5 bg-slate-950/90 border border-purple-500/30 focus:border-purple-400 rounded-lg text-xs text-purple-100 placeholder:text-slate-400 focus:outline-none shadow-sm focus:ring-1 focus:ring-purple-500/30"
                    />
                    {quickProductSearch && (
                      <button
                        type="button"
                        onClick={() => setQuickProductSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Dropdown popup with matching products and their batch count */}
                    {quickProductSearch.trim().length > 0 && (
                      <div className="absolute z-30 top-full mt-1.5 left-0 right-0 max-h-72 overflow-y-auto bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl divide-y divide-slate-800 animate-in fade-in">
                        {items
                          .filter(
                            (item) =>
                              item.name.toLowerCase().includes(quickProductSearch.toLowerCase()) ||
                              item.sku.toLowerCase().includes(quickProductSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                handleAddLineWithItem(item);
                                setQuickProductSearch("");
                              }}
                              className="p-2.5 hover:bg-indigo-950/40 cursor-pointer transition-colors group flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-white text-xs group-hover:text-indigo-300 flex items-center space-x-2">
                                  <span>{item.name}</span>
                                  {item.sku && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                                      {item.sku}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-3">
                                  <span>
                                    MRP: <strong className="text-slate-200 font-mono">₹{item.mrp || 0}</strong>
                                  </span>
                                  <span>
                                    Rate: <strong className="text-emerald-400 font-mono">₹{item.sellingPrice || item.mrp || 0}</strong>
                                  </span>
                                  {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                                  {item.taxRate !== undefined && <span>GST: {item.taxRate}%</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                              >
                                {hasBatchTracking ? "+ Add & Autofill Batch" : "+ Add Item"}
                              </button>
                            </div>
                          ))}

                        {items.filter(
                          (item) =>
                            item.name.toLowerCase().includes(quickProductSearch.toLowerCase()) ||
                            item.sku.toLowerCase().includes(quickProductSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No matching product found for &quot;{quickProductSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                    <button
                      id="tour-demo-item-btn"
                      type="button"
                      onClick={handleLoadDemoItem}
                      disabled={loadingDemoItem}
                      className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center justify-center space-x-1.5 border border-amber-300 shadow-md shadow-amber-600/30 shrink-0 whitespace-nowrap transition-all active:scale-95 ${loadingDemoItem ? "opacity-70 cursor-not-allowed" : "animate-pulse"}`}
                      title="1-Click Demo Item & Customer (Instant Test Bill in 1 Second)"
                    >
                      {loadingDemoItem ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>⚡ 1-Click Demo Bill</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 border border-purple-400/40 shadow-md shadow-purple-600/20 shrink-0 whitespace-nowrap transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Row</span>
                    </button>
                  </div>
                </div>

                {/* Pharma Prescribing Doctor & Patient Record (Schedule H1 / CDSCO - Collapsible) */}
                {isPharma && (isDoctorRxOpen || doctorName || doctorRegNumber || patientName) && (
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-teal-500/30 space-y-1.5 shrink-0 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                          Prescribing Doctor & Patient (Schedule H1 / Rx):
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400 font-medium">Auto-recorded to Schedule H1 Register</span>
                        <button
                          type="button"
                          onClick={() => setIsDoctorRxOpen(false)}
                          className="text-slate-400 hover:text-rose-400 text-xs px-1"
                          title="Hide Doctor / Rx Box"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Doctor / Clinic Name</label>
                        <input
                          type="text"
                          placeholder="Dr. Name (e.g. Dr. A. Sharma)"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-teal-300 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Doctor Council Reg No</label>
                        <input
                          type="text"
                          placeholder="e.g. MCI / SMC-78291"
                          value={doctorRegNumber}
                          onChange={(e) => setDoctorRegNumber(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Patient Name</label>
                        <input
                          type="text"
                          placeholder="Patient Name"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Patient Address / Contact</label>
                        <input
                          type="text"
                          placeholder="Address / Phone"
                          value={patientAddressPhone}
                          onChange={(e) => setPatientAddressPhone(e.target.value)}
                          className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3b. Mobile Line Items View (Catchy, Large Touch Targets, Self-Explanatory) */}
                <div className="block lg:hidden space-y-2.5 pb-2">
                  {invoiceLines.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-2">
                      <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">Koi item add nahi hua abhi tak.</p>
                      <p className="text-[11px] text-slate-500">Upar search karein ya &quot;⚡ 1-Click Demo Bill&quot; dabayein.</p>
                    </div>
                  ) : (
                    invoiceLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2.5 relative"
                      >
                        {/* Header: Item # and Name/Select & Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <select
                                value={line.itemId}
                                onChange={(e) => handleLineItemChange(idx, e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 truncate"
                              >
                                <option value="">-- Select Product / Service --</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} {item.sku ? `(${item.sku})` : ""} - ₹{item.sellingPrice || item.mrp || 0}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950 rounded-lg border border-slate-800 shrink-0 cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>

                        {/* Pharma/Batch / Expiry / IMEI details if applicable */}
                        {(hasBatchTracking || isElectronics) && (
                          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                            {hasBatchTracking && (
                              <div>
                                <label className="text-[10px] text-amber-400 block font-bold mb-0.5">Batch / Lot #</label>
                                {line.availableBatches && line.availableBatches.length > 0 ? (
                                  <select
                                    value={line.batchId || ""}
                                    onChange={(e) => handleBatchSelect(idx, e.target.value)}
                                    className="w-full px-1.5 py-1 bg-slate-900 border border-indigo-500/40 rounded text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                                  >
                                    {line.availableBatches.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.batchNumber}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Batch No"
                                    value={line.batchNumber || ""}
                                    onChange={(e) => updateLineField(idx, "batchNumber", e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-900 border border-amber-500/30 rounded text-xs text-amber-200 font-mono"
                                  />
                                )}
                              </div>
                            )}
                            {hasBatchTracking && (
                              <div>
                                <label className="text-[10px] text-amber-400 block font-bold mb-0.5">Expiry (MM/YY)</label>
                                <input
                                  type="text"
                                  placeholder="MM/YY"
                                  value={line.expiryDate || ""}
                                  onChange={(e) => updateLineField(idx, "expiryDate", e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-amber-500/30 rounded text-xs text-amber-200 font-mono"
                                />
                              </div>
                            )}
                            {isElectronics && (
                              <div className="col-span-2">
                                <label className="text-[10px] text-cyan-400 block font-bold mb-0.5">IMEI / Serial No</label>
                                <input
                                  type="text"
                                  placeholder="IMEI / Serial"
                                  value={line.imeiSerial || ""}
                                  onChange={(e) => updateLineField(idx, "imeiSerial", e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-cyan-500/30 rounded text-xs text-cyan-200 font-mono"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interactive Row: Quantity Stepper + Rate + Discount */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Stepper Quantity */}
                          <div className="col-span-5">
                            <label className="text-[10px] text-slate-400 block font-medium mb-1">Qty ({line.uomCode || "Pcs"})</label>
                            <div className="flex items-center bg-slate-950 border border-sky-500/40 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateLineField(idx, "quantity", Math.max(1, (Number(line.quantity) || 1) - 1))}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold text-sm cursor-pointer border-r border-slate-800 active:bg-sky-950"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity}
                                onChange={(e) => updateLineField(idx, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-full text-center bg-transparent text-xs text-sky-200 font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateLineField(idx, "quantity", (Number(line.quantity) || 0) + 1)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold text-sm cursor-pointer border-l border-slate-800 active:bg-sky-950"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Rate */}
                          <div className="col-span-4">
                            <label className="text-[10px] text-slate-400 block font-medium mb-1">Rate (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLineField(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Disc % */}
                          <div className="col-span-3">
                            <label className="text-[10px] text-slate-400 block font-medium mb-1">Disc ({line.discountType === "percent" ? "%" : "₹"})</label>
                            <input
                              type="number"
                              step="0.1"
                              value={line.discountValue || ""}
                              placeholder="0"
                              onChange={(e) => updateLineField(idx, "discountValue", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-300 font-mono text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Bottom Summary Bar for Item: GST & Net Item Total */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                            <span>GST:</span>
                            <select
                              value={line.gstRate}
                              onChange={(e) => updateLineField(idx, "gstRate", parseFloat(e.target.value) || 0)}
                              className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px]"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                            {line.hsnCode && <span className="text-slate-500 text-[10px]">HSN: {line.hsnCode}</span>}
                          </div>

                          <div className="flex items-center space-x-1">
                            <span className="text-[11px] text-slate-400">Total:</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              ₹{line.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {invoiceLines.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-950/30 hover:bg-indigo-950/60 text-indigo-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>+ Add Another Item</span>
                    </button>
                  )}
                </div>

                {/* 4. Line Items Table (Dense ERP Layout - 10+ Items Fit Viewport) */}
                <div className="hidden lg:block flex-1 min-h-[360px] border-2 border-slate-700/80 rounded-xl overflow-y-auto overflow-x-auto shadow-md bg-slate-950/95">
                  <table className="w-full text-left text-xs min-w-[1020px]">
                    <thead className="bg-slate-900/95 text-slate-300 border-b-2 border-slate-700 text-[11px] sticky top-0 z-10 font-bold shadow-xs backdrop-blur-sm">
                      <tr>
                        <th className="px-1 py-1 w-8 text-center text-slate-400 bg-slate-900/95">#</th>
                        <th className="px-1.5 py-1 min-w-[180px] text-white bg-slate-900/95">Product / Item *</th>
                        {hasBatchTracking && <th className="px-1.5 py-1 min-w-[110px] w-28 text-amber-300 bg-slate-900/95">Lot / Batch No</th>}
                        {hasBatchTracking && <th className="px-1 py-1 w-16 text-center text-amber-300 bg-slate-900/95">Expiry</th>}
                        {hasPackingFreeQty && <th className="px-1 py-1 w-16 text-center text-slate-300 bg-slate-900/95">Packing</th>}

                        {/* Electronics Columns */}
                        {isElectronics && <th className="px-1.5 py-1 min-w-[130px] text-cyan-300 bg-slate-900/95">IMEI / Serial No *</th>}
                        {isElectronics && <th className="px-1 py-1 w-16 text-cyan-300 text-center bg-slate-900/95">Warranty (M)</th>}

                        {/* Hardware Columns */}
                        {isHardware && <th className="px-1.5 py-1 min-w-[130px] text-amber-300 bg-slate-900/95">Dimensions</th>}
                        {isHardware && <th className="px-1 py-1 w-20 text-amber-300 bg-slate-900/95">Rate Basis</th>}

                        {/* Garments Columns */}
                        {isGarments && <th className="px-1 py-1 w-14 text-rose-300 text-center bg-slate-900/95">Size</th>}
                        {isGarments && <th className="px-1 py-1 w-16 text-rose-300 text-center bg-slate-900/95">Color</th>}
                        {isGarments && <th className="px-1.5 py-1 min-w-[80px] text-rose-300 bg-slate-900/95">Style</th>}

                        {/* FMCG Columns */}
                        {isFmcg && <th className="px-1 py-1 w-16 text-emerald-300 text-center bg-slate-900/95">Cases</th>}
                        {isFmcg && <th className="px-1 py-1 w-16 text-emerald-300 text-center bg-slate-900/95">Loose</th>}
                        {isFmcg && <th className="px-1 py-1 w-16 text-emerald-300 text-center bg-slate-900/95">Scheme</th>}

                        {/* Service Columns */}
                        {isService && <th className="px-1.5 py-1 min-w-[120px] text-cyan-300 bg-slate-900/95">Service Period</th>}

                        <th className="px-1.5 py-1 min-w-[70px] w-20 text-center text-slate-300 bg-slate-900/95">HSN/SAC</th>
                        <th className="px-1.5 py-1 min-w-[65px] w-16 text-center text-blue-300 bg-slate-900/95">Qty *</th>
                        {hasPackingFreeQty && <th className="px-1.5 py-1 min-w-[55px] w-14 text-center text-cyan-300 bg-slate-900/95">Free</th>}
                        {showMrpColumn && <th className="px-1.5 py-1 min-w-[80px] w-20 text-right text-yellow-300 bg-slate-900/95">MRP (₹)</th>}
                        {showPtrColumn && <th className="px-1.5 py-1 min-w-[85px] w-24 text-teal-300 text-right bg-slate-900/95">PTR (₹)</th>}
                        {showPtsColumn && <th className="px-1.5 py-1 min-w-[85px] w-24 text-indigo-300 text-right bg-slate-900/95">PTS (₹)</th>}
                        <th className="px-1 py-1 min-w-[50px] w-14 text-center text-slate-300 bg-slate-900/95">Unit</th>
                        <th className="px-1.5 py-1 min-w-[95px] w-24 text-right text-emerald-300 bg-slate-900/95">Rate (₹) *</th>
                        <th className="px-1.5 py-1 min-w-[90px] w-24 text-right text-orange-300 bg-slate-900/95">Disc % / ₹</th>
                        <th className="px-1.5 py-1 min-w-[85px] w-24 text-right text-sky-300 bg-slate-900/95">Taxable</th>
                        <th className="px-1 py-1 min-w-[55px] w-14 text-center text-indigo-300 bg-slate-900/95">GST %</th>
                        <th className="px-2 py-1 min-w-[90px] w-24 text-right text-emerald-400 font-extrabold bg-slate-900/95">Amount (₹)</th>
                        <th className="px-1 py-1 w-8 bg-slate-900/95"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950">
                      {invoiceLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50 transition-colors h-8">
                          {/* Row Index */}
                          <td className="p-0.5 text-center font-mono text-[10px] text-slate-400 font-bold align-middle">
                            {idx + 1}
                          </td>

                          {/* 1. Item Selection */}
                          <td className="p-0.5 px-1 align-middle min-w-[180px]">
                            <select
                              value={line.itemId}
                              onChange={(e) => handleLineItemChange(idx, e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-medium h-7"
                            >
                              {items.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.name} ({i.sku})
                                </option>
                              ))}
                            </select>
                            {(line.availableBatches?.length > 1 || line.batchNumber || customerDealHistoryMap[line.itemId]?.[0]) && (
                              <div className="flex items-center gap-1 mt-0.5 text-[9px] truncate max-w-[210px] leading-tight">
                                {line.availableBatches && line.availableBatches.length > 1 ? (
                                  <span className="text-emerald-400 font-medium flex items-center space-x-0.5">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                    <span>{line.availableBatches.length} Batches</span>
                                  </span>
                                ) : line.batchNumber ? (
                                  <span className="text-slate-400 font-mono">B:{line.batchNumber}</span>
                                ) : null}

                                {customerDealHistoryMap[line.itemId]?.[0] && (
                                  <span
                                    className="text-amber-400 font-mono truncate"
                                    title={`Last: ₹${customerDealHistoryMap[line.itemId][0].rate.toFixed(2)} (${customerDealHistoryMap[line.itemId][0].discount})`}
                                  >
                                    Last: ₹{customerDealHistoryMap[line.itemId][0].rate.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 2. Batch / Lot No */}
                          {hasBatchTracking && (
                            <td className="p-0.5 px-1 align-middle min-w-[110px]">
                              {line.availableBatches && line.availableBatches.length > 0 ? (
                                <select
                                  value={line.batchId || ""}
                                  onChange={(e) => handleBatchSelect(idx, e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-slate-900 border border-indigo-500/40 rounded text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 h-7"
                                >
                                  {line.availableBatches.map((b) => {
                                    const exp = b.expiryDate
                                      ? new Date(b.expiryDate).toLocaleDateString("en-IN", {
                                          month: "2-digit",
                                          year: "2-digit",
                                        })
                                      : "--/--";
                                    const stk = (b as any).currentStock !== undefined
                                      ? ` | Stk: ${(b as any).currentStock}`
                                      : b.currentQuantity !== undefined
                                      ? ` | Stk: ${b.currentQuantity}`
                                      : "";
                                    const rate = b.saleRate ? ` | ₹${b.saleRate}` : "";
                                    return (
                                      <option key={b.id} value={b.id}>
                                        {b.batchNumber} (Exp: {exp}{stk}{rate})
                                      </option>
                                    );
                                  })}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Batch No"
                                  value={line.batchNumber || ""}
                                  onChange={(e) => updateLineField(idx, "batchNumber", e.target.value)}
                                  className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 h-7"
                                />
                              )}
                            </td>
                          )}

                          {/* 3. Expiry */}
                          {hasBatchTracking && (
                            <td className="p-0.5 px-1 align-middle w-16">
                              <input
                                type="text"
                                placeholder="MM/YY"
                                value={line.expiryDate || ""}
                                onChange={(e) => updateLineField(idx, "expiryDate", e.target.value)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center focus:outline-none focus:border-indigo-500 h-7"
                              />
                            </td>
                          )}

                          {/* 4. Packing */}
                          {hasPackingFreeQty && (
                            <td className="p-0.5 px-1 align-middle w-16">
                              <input
                                type="text"
                                placeholder="10x10"
                                value={line.packing || ""}
                                onChange={(e) => updateLineField(idx, "packing", e.target.value)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 text-center focus:outline-none focus:border-indigo-500 h-7"
                              />
                            </td>
                          )}

                          {/* Electronics: IMEI / Serial & Warranty */}
                          {isElectronics && (
                            <td className="p-0.5 px-1 align-middle min-w-[130px]">
                              <input
                                type="text"
                                placeholder="IMEI / Serial No"
                                value={line.imeiSerial || ""}
                                onChange={(e) => updateLineField(idx, "imeiSerial", e.target.value)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-cyan-500/40 rounded text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 h-7"
                              />
                            </td>
                          )}
                          {isElectronics && (
                            <td className="p-0.5 px-1 align-middle w-16">
                              <input
                                type="number"
                                placeholder="12"
                                min="0"
                                value={line.warrantyMonths ?? ""}
                                onChange={(e) => updateLineField(idx, "warrantyMonths", parseInt(e.target.value) || 0)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                                title="Warranty in Months"
                              />
                            </td>
                          )}

                          {/* Hardware: Dimensions (L x W) & Rate Basis */}
                          {isHardware && (
                            <td className="p-0.5 px-1 align-middle min-w-[130px]">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="L"
                                  value={line.dimLength || ""}
                                  onChange={(e) => updateLineField(idx, "dimLength", parseFloat(e.target.value) || 0)}
                                  className="w-1/2 px-1 py-0.5 bg-slate-900 border border-amber-500/40 rounded text-xs text-amber-300 font-mono text-center focus:outline-none focus:border-amber-400 h-7"
                                  title="Length in Feet"
                                />
                                <span className="text-slate-500">&times;</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="W"
                                  value={line.dimWidth || ""}
                                  onChange={(e) => updateLineField(idx, "dimWidth", parseFloat(e.target.value) || 0)}
                                  className="w-1/2 px-1 py-0.5 bg-slate-900 border border-amber-500/40 rounded text-xs text-amber-300 font-mono text-center focus:outline-none focus:border-amber-400 h-7"
                                  title="Width in Feet"
                                />
                              </div>
                              {line.sqft ? (
                                <div className="text-[9px] text-amber-400 font-mono text-center font-semibold">
                                  = {line.sqft} Sq.Ft
                                </div>
                              ) : null}
                            </td>
                          )}
                          {isHardware && (
                            <td className="p-0.5 px-1 align-middle w-20">
                              <select
                                value={line.rateBasis || "per_unit"}
                                onChange={(e) => updateLineField(idx, "rateBasis", e.target.value)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-amber-500/30 rounded text-xs text-amber-300 font-medium h-7"
                              >
                                <option value="per_unit">Per Pcs</option>
                                <option value="per_sqft">Per Sq.Ft</option>
                                <option value="per_kg">Per Kg</option>
                                <option value="per_running_ft">Per R.Ft</option>
                              </select>
                            </td>
                          )}

                          {/* Garments: Size, Color, Style Code */}
                          {isGarments && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="text"
                                placeholder="M / 32"
                                value={line.size || ""}
                                onChange={(e) => updateLineField(idx, "size", e.target.value)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-rose-500/40 rounded text-xs text-rose-300 font-mono text-center focus:outline-none focus:border-rose-400 font-bold h-7"
                              />
                            </td>
                          )}
                          {isGarments && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="text"
                                placeholder="Color"
                                value={line.color || ""}
                                onChange={(e) => updateLineField(idx, "color", e.target.value)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-rose-500/40 rounded text-xs text-rose-300 text-center focus:outline-none focus:border-rose-400 h-7"
                              />
                            </td>
                          )}
                          {isGarments && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="text"
                                placeholder="Style Code"
                                value={line.styleCode || ""}
                                onChange={(e) => updateLineField(idx, "styleCode", e.target.value)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-rose-400 h-7"
                              />
                            </td>
                          )}

                          {/* FMCG: Case Qty, Loose Pcs, Trade Scheme */}
                          {isFmcg && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={line.caseQty || ""}
                                onChange={(e) => updateLineField(idx, "caseQty", parseFloat(e.target.value) || 0)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-emerald-500/40 rounded text-xs text-emerald-300 font-mono text-center font-bold focus:outline-none focus:border-emerald-400 h-7"
                                title="Master Cases"
                              />
                            </td>
                          )}
                          {isFmcg && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={line.pcsQty || ""}
                                onChange={(e) => updateLineField(idx, "pcsQty", parseFloat(e.target.value) || 0)}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-emerald-500/40 rounded text-xs text-emerald-300 font-mono text-center focus:outline-none focus:border-emerald-400 h-7"
                                title="Loose Units"
                              />
                            </td>
                          )}
                          {isFmcg && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="text"
                                placeholder="10+1"
                                value={line.schemeDesc || ""}
                                onChange={(e) => updateLineField(idx, "schemeDesc", e.target.value)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-emerald-500/40 rounded text-xs text-emerald-300 font-mono text-center font-semibold focus:outline-none focus:border-emerald-400 h-7"
                                title="Free Scheme (e.g. 10+1, 5+1)"
                              />
                            </td>
                          )}

                          {/* Service Sector: Service Period */}
                          {isService && (
                            <td className="p-0.5 px-1 align-middle">
                              <input
                                type="text"
                                placeholder="Period"
                                value={line.servicePeriodFrom || ""}
                                onChange={(e) => updateLineField(idx, "servicePeriodFrom", e.target.value)}
                                className="w-full px-2 py-0.5 bg-slate-900 border border-cyan-500/40 rounded text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 h-7"
                              />
                            </td>
                          )}

                          {/* 5. HSN/SAC */}
                          <td className="p-0.5 px-1 align-middle">
                            <input
                              type="text"
                              placeholder="HSN"
                              value={line.hsnCode || ""}
                              onChange={(e) => updateLineField(idx, "hsnCode", e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center focus:outline-none focus:border-indigo-500 h-7"
                            />
                          </td>

                          {/* 6. Billed Qty */}
                          <td className="p-0.5 px-1 align-middle min-w-[60px] w-16">
                            <input
                              id={`line-qty-${idx}`}
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(e) => updateLineField(idx, "quantity", parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const rateEl = document.getElementById(`line-rate-${idx}`);
                                  if (rateEl) {
                                    (rateEl as HTMLInputElement).focus();
                                    (rateEl as HTMLInputElement).select();
                                  }
                                }
                              }}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-sky-500/30 rounded text-xs text-sky-200 font-mono text-center font-bold focus:outline-none focus:border-sky-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                            />
                          </td>

                          {/* 7. Free Qty */}
                          {hasPackingFreeQty && (
                            <td className="p-0.5 px-1 align-middle min-w-[50px] w-14">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={line.freeQuantity || ""}
                                onChange={(e) => updateLineField(idx, "freeQuantity", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-emerald-400 font-mono text-center focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                              />
                            </td>
                          )}

                          {/* 8. MRP (Pharma Only) */}
                          {showMrpColumn && (
                            <td className="p-0.5 px-1 align-middle min-w-[75px] w-18">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={line.mrp || ""}
                                onChange={(e) => updateLineField(idx, "mrp", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 font-mono text-right focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                              />
                            </td>
                          )}

                          {/* 8b. PTR (Pharma Only) */}
                          {showPtrColumn && (
                            <td className="p-0.5 px-1 align-middle min-w-[75px] w-18">
                              <input
                                id={`line-ptr-${idx}`}
                                type="number"
                                step="0.01"
                                placeholder="PTR"
                                value={line.ptr || ""}
                                onChange={(e) => updateLineField(idx, "ptr", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-teal-500/40 rounded text-xs text-teal-300 font-mono text-right font-semibold focus:outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                              />
                            </td>
                          )}

                          {/* 8c. PTS (Company to Stockist Only) */}
                          {showPtsColumn && (
                            <td className="p-0.5 px-1 align-middle min-w-[75px] w-18">
                              <input
                                id={`line-pts-${idx}`}
                                type="number"
                                step="0.01"
                                placeholder="PTS"
                                value={line.pts || ""}
                                onChange={(e) => updateLineField(idx, "pts", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-indigo-500/40 rounded text-xs text-indigo-300 font-mono text-right font-semibold focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                              />
                            </td>
                          )}

                          {/* 9. Unit */}
                          <td className="p-0.5 font-semibold text-slate-400 text-center align-middle min-w-[45px] w-12 text-xs">
                            {line.uomCode || "UNIT"}
                          </td>

                          {/* 10. Selling Rate */}
                          <td className="p-0.5 px-1 align-middle min-w-[85px] w-20">
                            <input
                              id={`line-rate-${idx}`}
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLineField(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const discEl = document.getElementById(`line-disc-${idx}`);
                                  if (discEl) {
                                    (discEl as HTMLInputElement).focus();
                                    (discEl as HTMLInputElement).select();
                                  }
                                }
                              }}
                              className="w-full px-1.5 py-0.5 bg-slate-900 border border-emerald-500/30 rounded text-xs text-emerald-300 font-mono font-bold text-right focus:outline-none focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                            />
                          </td>

                          {/* 11. Discount */}
                          <td className="p-0.5 px-1 align-middle min-w-[85px] w-20">
                            <div className="flex items-center space-x-0.5">
                              <input
                                id={`line-disc-${idx}`}
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={line.discountValue || ""}
                                onChange={(e) => updateLineField(idx, "discountValue", parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (idx === invoiceLines.length - 1) {
                                      const searchEl = document.getElementById("quick-product-search-input");
                                      if (searchEl) {
                                        (searchEl as HTMLInputElement).focus();
                                        (searchEl as HTMLInputElement).select();
                                      } else {
                                        handleAddLine();
                                      }
                                    } else {
                                      const nextQty = document.getElementById(`line-qty-${idx + 1}`);
                                      if (nextQty) {
                                        (nextQty as HTMLInputElement).focus();
                                        (nextQty as HTMLInputElement).select();
                                      }
                                    }
                                  }
                                }}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-amber-400 font-mono text-right focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-7"
                              />
                              <button
                                type="button"
                                onClick={() => updateLineField(idx, "discountType", line.discountType === "percent" ? "fixed" : "percent")}
                                className="px-1 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white shrink-0 h-7"
                                title="Toggle % or Flat ₹"
                              >
                                {line.discountType === "percent" ? "%" : "₹"}
                              </button>
                            </div>
                          </td>

                          {/* 12. Taxable */}
                          <td className="p-0.5 px-1 text-right font-mono font-semibold text-slate-300 align-middle min-w-[80px] w-20">
                            ₹{line.taxableAmount.toFixed(2)}
                          </td>

                          {/* 13. GST % */}
                          <td className="p-0.5 px-1 text-center font-mono align-middle min-w-[50px] w-14">
                            <select
                              value={line.gstRate}
                              onChange={(e) => updateLineField(idx, "gstRate", parseFloat(e.target.value) || 0)}
                              className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 h-7"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          {/* 14. Net Amount */}
                          <td className="p-0.5 px-1 text-right font-mono font-bold text-emerald-400 align-middle min-w-[85px] w-20">
                            ₹{line.totalAmount.toFixed(2)}
                          </td>

                          {/* 15. Delete */}
                          <td className="p-0.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              title="Remove Line Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div> {/* End Scrollable Form Body */}

              {/* 5. Sleek Docked Footer: Tender & Mode + Summary Metrics + Net Payable + F10 Save */}
              <div className="shrink-0 p-2 sm:p-2.5 bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40 border-t-2 border-indigo-500/40 border-x border-b border-slate-800 rounded-b-xl sm:rounded-xl shadow-2xl space-y-1.5 z-20">
                {/* Top Row: Tender, Mode & Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 bg-slate-950 px-2 sm:px-2.5 py-1 rounded-lg border border-indigo-500/40 shadow-inner">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">Tender:</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={paidAmount || ""}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-16 sm:w-20 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div className="flex items-center space-x-1.5 bg-slate-950 px-2 sm:px-2.5 py-1 rounded-lg border border-blue-500/40 shadow-inner">
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">Mode:</span>
                      <select
                        value={primaryPaymentMode}
                        onChange={(e) => setPrimaryPaymentMode(parseInt(e.target.value))}
                        className="bg-transparent border-0 text-xs text-blue-200 font-bold focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="1" className="bg-slate-900">Cash</option>
                        <option value="2" className="bg-slate-900">UPI / QR</option>
                        <option value="3" className="bg-slate-900">Card</option>
                        <option value="4" className="bg-slate-900">Bank Transfer</option>
                        <option value="5" className="bg-slate-900">Cheque</option>
                        <option value="6" className="bg-slate-900">Credit Ledger</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-slate-400 hidden xl:flex items-center space-x-1 pl-1">
                      <span className="text-slate-500">|</span>
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Rate/Disc me <kbd className="px-1 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-700 font-mono text-[9px]">Enter</kbd> = Agli Row</span>
                    </div>
                  </div>

                  {/* Center: Breakdown Metrics Badges */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs font-mono">
                    <div className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-slate-200 hidden sm:block">
                      Items: <strong className="text-white font-sans">{invoiceLines.length}</strong>
                      {invoiceLines.length > 0 && (
                        <span className="text-slate-400 ml-1 hidden sm:inline">
                          (Qty: {invoiceLines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)})
                        </span>
                      )}
                    </div>
                    {totalItemDiscount > 0 && (
                      <div className="px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-500/30 text-amber-300 hidden md:block font-bold">
                        Disc: -₹{totalItemDiscount.toFixed(2)}
                      </div>
                    )}
                    <div className="px-2 py-0.5 rounded-md bg-sky-950/40 border border-sky-500/30 text-sky-200 hidden md:block">
                      Taxable: ₹{totalTaxable.toFixed(2)}
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hidden sm:block font-bold">
                      GST: +₹{totalTax.toFixed(2)}
                    </div>
                    {Math.abs(roundOff) > 0 && (
                      <div className="px-2 py-0.5 rounded-md bg-slate-800/50 text-slate-400 hidden lg:block text-[11px]">
                        R.Off: {roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Net Total & Actions (Prominent on Mobile) */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center space-x-2 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/40 shadow-inner">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold leading-none">Net Total:</span>
                    <span className="text-base sm:text-xl font-black text-emerald-400 font-mono leading-tight tracking-tight">
                      ₹{netPayable.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-1 sm:flex-none justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setEditingInvoiceId(null);
                        setEditingInvoiceNumber("");
                        if (editIdFromUrl) router.replace("/app/sales/invoices");
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      id="tour-save-invoice-btn"
                      type="submit"
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 border border-indigo-400/30 active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>
                        {submitting
                          ? (editingInvoiceId ? "Updating..." : "Generating...")
                          : (editingInvoiceId ? "Update" : "Save & Print")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Account Modal */}
      <QuickAddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerCreated={(newParty) => {
          setCustomers((prev) => [newParty, ...prev]);
          setSelectedCustomerId(newParty.id);
          setCustomerName(newParty.legalName);
          setCustomerPhone(newParty.mobile || newParty.primaryPhone || "");
          setCustomerGstin(newParty.gstin || "");
          if (newParty.gstin) {
            handleSetBillingMode("b2b");
          }
          setCustomerDlNumber((newParty as any).drugLicenseNumber1 || (newParty as any).dlNumber || "");
          setBillingAddress((newParty as any).billingAddress?.addressLine1 || newParty.tradeName || "");
          setBillingStateCode((newParty as any).stateCode || "27");
        }}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal (F1) */}
      {isShortcutsHelpOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200000]">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Keyboard className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">100% Keyboard Hotkeys</h3>
              </div>
              <button
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: "F1", desc: "Open this Keyboard Shortcuts Guide" },
                { key: "F2", desc: "Instant Focus to Item Search / Barcode Bar" },
                { key: "F3", desc: "Open Quick Add Customer Modal" },
                { key: "F7", desc: "Cycle Payment Mode (Cash → UPI → Card → Bank)" },
                { key: "F9", desc: "Cycle Billing Mode (B2B ↔ Retail ↔ Thermal)" },
                { key: "F10 / Ctrl+Enter", desc: "Direct Save & Generate Tax Invoice" },
                { key: "Esc", desc: "Close Modals / Clear Active Popups" },
                { key: "Enter / Tab", desc: "Navigate sequentially between input fields" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300">{item.desc}</span>
                  <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-amber-400 font-mono font-bold text-[11px] shadow-sm">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all w-full"
              >
                Got It (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Onboarding Spotlight Tour for Invoicing */}
      <OnboardingTour
        steps={invoiceTourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        tourKey="udyogbill_invoice_tour"
      />

      {/* Floating WhatsApp Live Help Widget */}
      <FloatingWhatsAppWidget />
    </div>
  );
}

export default function TenantInvoicesPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-slate-400 text-xs">Loading sales invoices...</div>}>
      <TenantInvoicesPageContent />
    </React.Suspense>
  );
}
