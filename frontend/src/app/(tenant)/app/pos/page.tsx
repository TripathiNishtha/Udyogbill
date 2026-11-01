"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Wrench,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Layers,
  Printer,
  X,
  Building2,
  Users2,
  Sparkles,
  ArrowRight,
  PauseCircle,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tag,
  Award,
  HelpCircle,
  Check,
  Flame,
  LayoutGrid,
  UserPlus,
  Table,
  Columns,
  Camera,
  MessageCircle,
  Truck,
  Bed,
  ShieldCheck,
  FileText
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { salesService } from "@/services/sales-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { apiClient } from "@/lib/api-client";
import { barcodeService } from "@/services/barcode-services";
import { MasterItem, PartyList, TenantDetails, ItemVariant } from "@/types";
import { printRawHtml } from "@/lib/print-helper";
import { printTemplateService } from "@/services/print-template-services";
import { GST_STATE_MAP } from "@/lib/gst-helper";
import { useAddons } from "@/context/addon-context";
import CameraBarcodeScannerModal from "@/components/pos/camera-scanner-modal";
import PharmaSaltSubstituteModal from "@/components/pos/pharma-salt-substitute-modal";
import { MattressDimensionGridModal, MattressMatrixSelection } from "@/components/pos/mattress-dimension-grid-modal";
import { ItemSubstitute } from "@/services/pharma-deep-services";
import { useWorkspaceTabActive } from "@/context/workspace-tab-context";
import { notifyEntityMutated } from "@/lib/workspace-events";

export type PosPrintFormat = "thermal80" | "thermal58" | "a4" | "a5";

interface CartItem {
  item: MasterItem;
  quantity: number;
  unitPrice: number;
  baseUnitPrice?: number;
  mrp: number;
  discountPercent: number;
  variantId?: string;
  size?: string;
  color?: string;
  shadeCode?: string;
  shadeName?: string;
  packSize?: string;
  tintingCharge?: number;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  isTaxInclusive?: boolean;
  imeiSerial?: string;
  autoBrand?: string;
  autoSpecNumber?: string;
  autoPartNumber?: string;
  rackLocation?: string;
  // Mattress & Home Furnishing Vertical
  dimension?: string;
  warrantySerial?: string;
  warrantyYears?: number;
  coreMaterial?: string;
  foamDensity?: string;
}

interface HeldBillRecord {
  id: string;
  holdNumber: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  itemsCount: number;
  cartJson: string;
  notes?: string;
  createdAtUtc: string;
}

function getPosItemNameClass(name: string): string {
  const len = (name || "").trim().length;
  if (len <= 18) return "text-[13px] font-bold leading-snug";
  if (len <= 30) return "text-[12px] font-semibold leading-snug";
  if (len <= 45) return "text-[11px] font-semibold leading-tight";
  if (len <= 60) return "text-[10px] font-medium leading-tight";
  return "text-[9px] font-medium leading-tight tracking-tight";
}

export default function TenantPosPage() {
  const isTabActive = useWorkspaceTabActive();
  const { isAddonActive, activePack, industryCode: contextIndustryCode, hardwareSubType } = useAddons();
  const hasPharmaAddon = isAddonActive("pharma");


  const [items, setItems] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<PartyList[]>([]);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [redeemedPoints, setRedeemedPoints] = useState<number>(0);

  // Quick Add Customer / Name Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustDob, setNewCustDob] = useState("");
  const [newCustAnniversary, setNewCustAnniversary] = useState("");
  const [saveToDirectory, setSaveToDirectory] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // WhatsApp Prompt Modal State
  const [isWhatsAppPromptOpen, setIsWhatsAppPromptOpen] = useState(false);
  const [whatsAppModalPhone, setWhatsAppModalPhone] = useState("");

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  // POS Price Tier: Retail vs Wholesale Rate Engine
  const [posPriceTier, setPosPriceTier] = useState<"retail" | "wholesale">("retail");
  // Dual Billing Mode: GST Tax Invoice (Pakka) vs Non-GST Cash Memo (Kaccha)
  const [billingMode, setBillingMode] = useState<"GST" | "NON_GST">("GST");

  const handleSwitchPosPriceTier = (newTier: "retail" | "wholesale") => {
    setPosPriceTier(newTier);
    setCart((prev) =>
      prev.map((c) => {
        const isWholesale = newTier === "wholesale";
        const wholesalePrice = (c.item.minimumSellingPrice && c.item.minimumSellingPrice > 0)
          ? c.item.minimumSellingPrice
          : (c.item.sellingPrice || c.item.mrp || 0);
        const retailPrice = c.item.sellingPrice || c.item.mrp || 0;
        const newBase = isWholesale ? wholesalePrice : retailPrice;
        const tinting = c.tintingCharge || 0;
        return {
          ...c,
          unitPrice: newBase + tinting,
          baseUnitPrice: newBase,
        };
      })
    );
  };

  const activeIndustry = (
    contextIndustryCode ||
    activePack?.activeIndustryModule ||
    activePack?.industryTypeCode ||
    profile?.industryCode ||
    (isAddonActive("pharma") ? "PHARMA" : isAddonActive("fmcg") ? "FMCG" : isAddonActive("home_furnishing") ? "HOME_FURNISHING" : isAddonActive("sweets_bakery") ? "SWEETS_BAKERY" : isAddonActive("garments") ? "GARMENTS" : isAddonActive("electronics") ? "ELECTRONICS" : isAddonActive("hardware") ? "HARDWARE" : "OTHER")
  ).toUpperCase();
  const isHardware = activeIndustry === "HARDWARE" || isAddonActive("hardware");
  const isPureHardwareStore = isHardware && hardwareSubType === "HARDWARE";
  const showPaintInPos = isHardware && !isPureHardwareStore;
  const isSweetsBakery = activeIndustry === "SWEETS_BAKERY" || isAddonActive("sweets_bakery");
  const isElectronics = activeIndustry === "ELECTRONICS" || isAddonActive("electronics");
  const isPharma = hasPharmaAddon || activeIndustry === "PHARMA";
  const isHomeFurnishing = activeIndustry === "HOME_FURNISHING" || activeIndustry.includes("FURNISH") || activeIndustry.includes("MATTRESS") || isAddonActive("home_furnishing") || isAddonActive("home-furnishing");

  // Home Delivery & Logistics Dispatch State (Mattress & Furniture Showrooms)
  const [isHomeDelivery, setIsHomeDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFloorInfo, setDeliveryFloorInfo] = useState("");
  const [deliveryVehicleNumber, setDeliveryVehicleNumber] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");

  // Mattress Dimension Grid State
  const [isMattressGridOpen, setIsMattressGridOpen] = useState(false);
  const [mattressGridItem, setMattressGridItem] = useState<MasterItem | null>(null);

  const handleOpenMattressGrid = (item?: MasterItem) => {
    setMattressGridItem(item || null);
    setIsMattressGridOpen(true);
  };

  const handleMattressMatrixSelect = (selection: MattressMatrixSelection, chosenItem?: MasterItem) => {
    let targetItem: MasterItem | undefined = chosenItem || mattressGridItem || undefined;
    if (!targetItem) {
      targetItem = items.find(
        (it) => it.name.toLowerCase().includes(selection.model.toLowerCase()) ||
                it.name.toLowerCase().includes(selection.brand.toLowerCase())
      );
    }
    if (!targetItem) {
      targetItem = items.find(
        (it) => it.name.toLowerCase().includes("matt") ||
                it.name.toLowerCase().includes("foam") ||
                it.name.toLowerCase().includes("bed")
      ) || items[0];
    }

    const itemName = `${selection.brand} ${selection.model} (${selection.dimension})`;
    const effectiveItem: MasterItem = targetItem ? { ...targetItem, name: itemName } : {
      id: "item-mattress-" + Date.now(),
      tenantId: profile?.id || "",
      sku: `MAT-${selection.brand.slice(0, 3).toUpperCase()}-${selection.lengthInches}x${selection.widthInches}`,
      name: itemName,
      itemType: 1,
      primaryUomId: items[0]?.primaryUomId || "pcs",
      primaryUomCode: "PCS",
      primaryUomSymbol: "PCS",
      taxRate: selection.gstRate || 18,
      purchasePrice: Math.round(selection.suggestedRate * 0.7),
      sellingPrice: selection.suggestedRate,
      minimumSellingPrice: selection.suggestedRate,
      mrp: selection.suggestedRate,
      hsnCode: selection.hsnCode || "9404",
      totalStock: 99,
      minimumStockAlert: 0,
      isLowStock: false,
      trackBatches: false,
      trackSerialNumbers: true,
      trackVariants: false,
      isActive: true,
      attributesJson: "{}",
      createdAtUtc: new Date().toISOString(),
    };

    addToCart(effectiveItem, {
      size: selection.dimension,
      dimension: selection.dimension,
      warrantySerial: selection.warrantySerial,
      warrantyYears: parseInt(selection.warrantyYears) || 5,
      coreMaterial: selection.coreMaterial,
      foamDensity: selection.foamDensity,
      unitPrice: selection.suggestedRate,
      mrp: selection.suggestedRate,
    });
    setIsMattressGridOpen(false);
  };

  // Pharma Salt-Based Substitute Finder State
  const [isSaltSubstituteOpen, setIsSaltSubstituteOpen] = useState(false);
  const [saltSubstituteActiveItem, setSaltSubstituteActiveItem] = useState<{
    id?: string;
    name: string;
    saltComposition?: string;
    sku?: string;
  } | null>(null);

  const handleOpenSaltSubstitute = (item?: any) => {
    if (item) {
      let salt = "";
      if (item.attributesJson) {
        try {
          const attrs = typeof item.attributesJson === "string" ? JSON.parse(item.attributesJson) : item.attributesJson;
          salt = attrs.saltComposition || attrs.salt || "";
        } catch {}
      }
      setSaltSubstituteActiveItem({
        id: item.id,
        name: item.name,
        saltComposition: salt || item.saltComposition,
        sku: item.sku,
      });
    } else {
      setSaltSubstituteActiveItem(null);
    }
    setIsSaltSubstituteOpen(true);
  };

  const handleSelectSaltSubstitute = (sub: ItemSubstitute) => {
    const existing = items.find(
      (i) =>
        i.id === sub.itemId ||
        (i.sku && sub.sku && i.sku.toLowerCase() === sub.sku.toLowerCase()) ||
        i.name.toLowerCase() === sub.itemName.toLowerCase()
    );
    if (existing) {
      addToCart(existing, {
        unitPrice: sub.saleRate,
        mrp: sub.mrp,
        batchNumber: sub.earliestExpiryBatch,
        expiryDate: sub.earliestExpiryDate,
      });
    } else {
      const pseudoItem = {
        id: sub.itemId,
        tenantId: profile?.id || "",
        name: sub.itemName,
        sku: sub.sku || "SUB-" + Math.floor(Math.random() * 10000),
        itemType: 1,
        sellingPrice: sub.saleRate,
        mrp: sub.mrp,
        totalStock: sub.inStockQuantity,
        currentStock: sub.inStockQuantity,
        isTaxInclusive: true,
        taxRate: 12,
        primaryUomCode: "Strip",
        primaryUomSymbol: "Strip",
        trackBatches: true,
        trackVariants: false,
        trackSerialNumbers: false,
        isActive: true,
        createdAtUtc: new Date().toISOString(),
      } as unknown as MasterItem;
      addToCart(pseudoItem, {
        unitPrice: sub.saleRate,
        mrp: sub.mrp,
        batchNumber: sub.earliestExpiryBatch,
        expiryDate: sub.earliestExpiryDate,
      });
    }
    setIsSaltSubstituteOpen(false);
    playSuccessChime();
  };

  // Paint Shade & Tinting Modal State
  const [paintModalIndex, setPaintModalIndex] = useState<number | null>(null);
  const [paintModalShade, setPaintModalShade] = useState("");
  const [paintModalPack, setPaintModalPack] = useState("");
  const [paintModalTint, setPaintModalTint] = useState("");

  const handleOpenPaintModal = (idx: number) => {
    const itm = cart[idx];
    if (!itm) return;
    setPaintModalIndex(idx);
    setPaintModalShade(itm.shadeCode || "");
    setPaintModalPack(itm.packSize || "");
    setPaintModalTint(itm.tintingCharge ? String(itm.tintingCharge) : "");
  };

  const handleSavePaintModal = () => {
    if (paintModalIndex === null || !cart[paintModalIndex]) return;
    const tintVal = parseFloat(paintModalTint) || 0;
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== paintModalIndex) return c;
        const base = c.baseUnitPrice !== undefined ? c.baseUnitPrice : c.unitPrice;
        return {
          ...c,
          shadeCode: paintModalShade.trim() || undefined,
          packSize: paintModalPack.trim() || undefined,
          tintingCharge: tintVal > 0 ? tintVal : undefined,
          baseUnitPrice: base,
          unitPrice: base + tintVal,
        };
      })
    );
    setPaintModalIndex(null);
  };


  // Bill-Level Discount (% or ₹)
  const [billDiscountType, setBillDiscountType] = useState<"percent" | "fixed">("percent");
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);

  // Held Bills state (Database Backed)
  const [heldBills, setHeldBills] = useState<HeldBillRecord[]>([]);

  // Garments Variant Selector State
  const [variantModalItem, setVariantModalItem] = useState<MasterItem | null>(null);
  const [autoPartsPickerItem, setAutoPartsPickerItem] = useState<MasterItem | null>(null);
  const [itemVariants, setItemVariants] = useState<ItemVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // Checkout & Payment State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<number>(1); // 1: Cash, 2: UPI, 3: Card, 6: Credit
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Sound & Fullscreen UI Preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showUpiModal, setShowUpiModal] = useState<boolean>(false);
  const [isWideCart, setIsWideCart] = useState<boolean>(false);
  const wideSearchInputRef = useRef<HTMLInputElement>(null);

  // POS Print Format State (Thermal 80mm, Thermal 58mm, A4, A5)
  const [posPrintFormat, setPosPrintFormat] = useState<PosPrintFormat>("thermal80");

  useEffect(() => {
    try {
      const tenantKey = profile?.id ? `_${profile.id}` : "";
      const saved = localStorage.getItem(`udyogbill_pos_print_format${tenantKey}`) || localStorage.getItem("udyogbill_pos_print_format");
      if (saved && ["thermal80", "thermal58", "a4", "a5"].includes(saved)) {
        setPosPrintFormat(saved as PosPrintFormat);
      }
    } catch {}
  }, [profile?.id]);

  const handleSetPosPrintFormat = (format: PosPrintFormat) => {
    setPosPrintFormat(format);
    try {
      const tenantKey = profile?.id ? `_${profile.id}` : "";
      localStorage.setItem(`udyogbill_pos_print_format${tenantKey}`, format);
    } catch {}
  };

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>("");

  // Last Completed Sale & Receipt Modal State
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null);
  const [completedInvoiceNumber, setCompletedInvoiceNumber] = useState<string>("");
  const [lastReceiptData, setLastReceiptData] = useState<{
    invoiceNumber: string;
    date: string;
    customerName: string;
    customerPhone: string;
    branchName: string;
    branchGstin: string;
    items: {
      name: string;
      qty: number;
      rate: number;
      total: number;
      shadeCode?: string;
      shadeName?: string;
      packSize?: string;
      tintingCharge?: number;
      size?: string;
      color?: string;
      dimension?: string;
      coreMaterial?: string;
      warrantySerial?: string;
      warrantyYears?: string | number;
    }[];
    subTotal: number;
    discount: number;
    tax: number;
    netTotal: number;
    paidAmount: number;
    changeAmount: number;
    savings: number;
    paymentModeText: string;
    splits?: { mode: string; amount: number; ref?: string }[];
    isHomeDelivery?: boolean;
    shippingAddress?: string;
    deliveryFloorInfo?: string;
    deliveryVehicleNumber?: string;
    deliveryPerson?: string;
  } | null>(null);

  // Retail POS Multi-Tender Split Payment State (Cash + UPI + Card + Khata)
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCashTendered, setSplitCashTendered] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitUpiRef, setSplitUpiRef] = useState<string>("");
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCardRef, setSplitCardRef] = useState<string>("");
  const [splitCredit, setSplitCredit] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Chimes
  const playAudioTone = (freq: number, type: OscillatorType = "sine", duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const playScanBeep = () => playAudioTone(950, "sine", 0.09);
  const playSuccessChime = () => {
    playAudioTone(587.33, "triangle", 0.1);
    setTimeout(() => playAudioTone(880, "triangle", 0.2), 100);
  };
  const playHoldSound = () => playAudioTone(440, "sine", 0.15);

  const loadCatalog = async () => {
    try {
      const [itemsRes, custRes, brRes, whRes, profRes] = await Promise.all([
        inventoryService.getItems({ pageSize: 150 }),
        partyService.getCustomers({ pageSize: 150 }),
        tenantAppService.getBranches(),
        tenantAppService.getWarehouses(),
        tenantAppService.getBusinessProfile().catch(() => null),
      ]);
      setItems(itemsRes.items || []);
      setCustomers(custRes.items || []);
      setBranches(brRes || []);
      setWarehouses(whRes || []);
      if (profRes) setProfile(profRes);

      if (brRes.length > 0) {
        const ho = brRes.find((b) => b.isHeadOffice) || brRes[0];
        setSelectedBranchId(ho.id);
      }
      if (whRes.length > 0) {
        const def = whRes.find((w) => w.isDefault) || whRes[0];
        setSelectedWarehouseId(def.id);
      }
    } catch (err) {
      console.error("Failed to load POS catalog", err);
    }
  };

  const loadHeldBills = async () => {
    try {
      const res = await apiClient.get<HeldBillRecord[]>("/tenant/pos/held-bills");
      if (Array.isArray(res.data)) {
        setHeldBills(res.data);
      }
    } catch (err) {
      console.warn("Could not load held bills", err);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadHeldBills();
  }, []);

  // Distinct Categories Extracted from Items
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.categoryName && it.categoryName.trim()) {
        set.add(it.categoryName.trim());
      }
    });
    return Array.from(set);
  }, [items]);

  // Filtered Items for Quick Tile Grid
  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory === "fast_moving") {
      list = list.slice(0, 12);
    } else if (selectedCategory !== "all") {
      list = list.filter((i) => i.categoryName?.trim().toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => {
        if (
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.barcode && i.barcode.toLowerCase().includes(q))
        ) {
          return true;
        }
        if (i.attributesJson) {
          try {
            const attrs = typeof i.attributesJson === "string" ? JSON.parse(i.attributesJson) : i.attributesJson;
            if (attrs.oemPartNumber && String(attrs.oemPartNumber).toLowerCase().includes(q)) return true;
            if (attrs.oesPartNumber && String(attrs.oesPartNumber).toLowerCase().includes(q)) return true;
            if (attrs.oesBrand && String(attrs.oesBrand).toLowerCase().includes(q)) return true;
            if (attrs.vehicleFitment && String(attrs.vehicleFitment).toLowerCase().includes(q)) return true;
            if (Array.isArray(attrs.autoPartsMatrix)) {
              return attrs.autoPartsMatrix.some((row: any) =>
                (row.brand && String(row.brand).toLowerCase().includes(q)) ||
                (row.specNumber && String(row.specNumber).toLowerCase().includes(q)) ||
                (row.partNumber && String(row.partNumber).toLowerCase().includes(q)) ||
                (row.rackLocation && String(row.rackLocation).toLowerCase().includes(q))
              );
            }
          } catch {}
        }
        return false;
      });
    }
    return list;
  }, [items, selectedCategory, searchQuery]);

  // Add Item to Cart (with optional Garment Variant Size & Color or Hardware Shade/Pack, Batch & IMEI, or AutoParts Brand & Spec)
  const addToCart = (
    item: MasterItem,
    options?: {
      variantId?: string;
      size?: string;
      color?: string;
      shadeCode?: string;
      shadeName?: string;
      packSize?: string;
      tintingCharge?: number;
      unitPrice?: number;
      mrp?: number;
      batchId?: string;
      batchNumber?: string;
      expiryDate?: string;
      imeiSerial?: string;
      autoBrand?: string;
      autoSpecNumber?: string;
      autoPartNumber?: string;
      rackLocation?: string;
      dimension?: string;
      warrantySerial?: string;
      warrantyYears?: number;
      coreMaterial?: string;
      foamDensity?: string;
    }
  ) => {
    playScanBeep();
    let initialAttrs: any = {};
    if (item.attributesJson) {
      try {
        initialAttrs = typeof item.attributesJson === "string" ? JSON.parse(item.attributesJson) : item.attributesJson;
      } catch {}
    }
    const shadeCode = options?.shadeCode ?? (initialAttrs.shadeCode || "");
    const shadeName = options?.shadeName ?? (initialAttrs.shadeName || "");
    const packSize = options?.packSize ?? (initialAttrs.packSize || "");
    const tintingCharge = options?.tintingCharge ?? Number(initialAttrs.tintingCharge || 0);

    setCart((prev) => {
      const existing = !options?.imeiSerial && !options?.warrantySerial && prev.find(
        (c) =>
          c.item.id === item.id &&
          c.variantId === (options?.variantId || undefined) &&
          c.size === (options?.size || undefined) &&
          c.color === (options?.color || undefined) &&
          c.shadeCode === (shadeCode || undefined) &&
          c.packSize === (packSize || undefined) &&
          c.batchNumber === (options?.batchNumber || undefined) &&
          c.autoBrand === (options?.autoBrand || undefined) &&
          c.autoSpecNumber === (options?.autoSpecNumber || undefined) &&
          c.dimension === (options?.dimension || undefined) &&
          !c.imeiSerial &&
          !c.warrantySerial
      );
      if (existing) {
        return prev.map((c) =>
          c === existing ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      const isWholesale = posPriceTier === "wholesale" || Boolean(selectedCustomerId && customers.find((c) => c.id === selectedCustomerId)?.customerType === 4);
      const wholesalePrice = (options?.variantId && (options as any)?.wholesalePrice)
        ? (options as any).wholesalePrice
        : (item.minimumSellingPrice && item.minimumSellingPrice > 0 ? item.minimumSellingPrice : 0);
      const chosenRate = isWholesale && wholesalePrice > 0 ? wholesalePrice : (item.sellingPrice || item.mrp || 0);
      const baseRate = options?.unitPrice ?? chosenRate;
      const effectiveRate = baseRate + tintingCharge;
      const mrp = options?.mrp ?? (item.mrp && item.mrp > 0 ? item.mrp : effectiveRate);
      return [
        ...prev,
        {
          item,
          quantity: 1,
          unitPrice: effectiveRate,
          baseUnitPrice: baseRate,
          mrp: mrp,
          discountPercent: 0,
          variantId: options?.variantId,
          size: options?.size,
          color: options?.color,
          shadeCode: shadeCode || undefined,
          shadeName: shadeName || undefined,
          packSize: packSize || undefined,
          tintingCharge: tintingCharge > 0 ? tintingCharge : undefined,
          batchId: options?.batchId,
          batchNumber: options?.batchNumber,
          expiryDate: options?.expiryDate,
          imeiSerial: options?.imeiSerial,
          isTaxInclusive: Boolean(item.isTaxInclusive),
          autoBrand: options?.autoBrand,
          autoSpecNumber: options?.autoSpecNumber,
          autoPartNumber: options?.autoPartNumber,
          rackLocation: options?.rackLocation || (typeof initialAttrs?.rackLocation === 'string' ? initialAttrs.rackLocation : undefined),
          dimension: options?.dimension,
          warrantySerial: options?.warrantySerial,
          warrantyYears: options?.warrantyYears,
          coreMaterial: options?.coreMaterial,
          foamDensity: options?.foamDensity,
        },
      ];
    });
  };

  // Click product in grid: If autoPartsMatrix or trackVariants is true, prompt selection
  const handleProductClick = async (item: MasterItem) => {
    let apAttrs: any = null;
    if (item.attributesJson) {
      try {
        apAttrs = typeof item.attributesJson === "string" ? JSON.parse(item.attributesJson) : item.attributesJson;
      } catch {}
    }
    if (apAttrs?.autoPartsMatrix && Array.isArray(apAttrs.autoPartsMatrix) && apAttrs.autoPartsMatrix.length > 0) {
      setAutoPartsPickerItem(item);
      return;
    }

    if (isHomeFurnishing) {
      const lowerName = (item.name || "").toLowerCase();
      const isMattressItem =
        item.trackVariants ||
        lowerName.includes("mattress") ||
        lowerName.includes("sleepwell") ||
        lowerName.includes("kurl-on") ||
        lowerName.includes("duroflex") ||
        lowerName.includes("bed") ||
        lowerName.includes("foam") ||
        Boolean(apAttrs?.dimension) ||
        Boolean(apAttrs?.coreMaterial);

      if (isMattressItem) {
        handleOpenMattressGrid(item);
        return;
      }
    }

    if (item.trackVariants) {
      setVariantModalItem(item);
      setLoadingVariants(true);
      try {
        const vars = await inventoryService.getItemVariants(item.id);
        setItemVariants(vars);
        if (vars.length === 0) {
          addToCart(item);
          setVariantModalItem(null);
        }
      } catch (err) {
        console.error("Failed to load item variants", err);
        addToCart(item);
        setVariantModalItem(null);
      } finally {
        setLoadingVariants(false);
      }
    } else {
      addToCart(item);
    }
  };

  // Unified Barcode / SKU / Text Scanner (Works for Barcode Gun, Search Box & Camera Scanner)
  const processBarcodeCode = async (rawCode: string): Promise<{ success: boolean; itemName?: string }> => {
    if (!rawCode || !rawCode.trim()) return { success: false };

    const q = rawCode.trim().toLowerCase();
    const exactMatch = items.find(
      (i) =>
        (i.barcode && i.barcode.toLowerCase() === q) ||
        i.sku.toLowerCase() === q
    );

    if (exactMatch && !exactMatch.trackVariants) {
      addToCart(exactMatch);
      return { success: true, itemName: exactMatch.name };
    }

    // Try scanning through backend barcode engine (matches variant barcodes and variant SKUs)
    try {
      const scanRes = await barcodeService.scanBarcode(q);
      if (scanRes && scanRes.itemId) {
        const parentItem = items.find((i) => i.id === scanRes.itemId) || ({
          id: scanRes.itemId,
          tenantId: "",
          sku: scanRes.itemSku,
          name: scanRes.name,
          barcode: scanRes.barcode,
          itemType: 1,
          primaryUomId: scanRes.primaryUomId,
          primaryUomCode: scanRes.primaryUomCode,
          primaryUomSymbol: scanRes.primaryUomCode,
          taxRate: scanRes.taxRate,
          purchasePrice: scanRes.purchasePrice,
          sellingPrice: scanRes.sellingPrice,
          mrp: scanRes.mrp,
          minimumSellingPrice: scanRes.sellingPrice,
          totalStock: scanRes.totalStock,
          minimumStockAlert: 0,
          isLowStock: false,
          trackBatches: scanRes.batches && scanRes.batches.length > 0,
          trackSerialNumbers: false,
          trackVariants: !!scanRes.variantId,
          attributesJson: "{}",
          isActive: true,
          createdAtUtc: new Date().toISOString()
        } as MasterItem);

        addToCart(parentItem, {
          variantId: scanRes.variantId,
          size: scanRes.size,
          color: scanRes.color,
          unitPrice: scanRes.sellingPrice,
          mrp: scanRes.mrp,
          batchId: scanRes.matchedBatchId,
          batchNumber: scanRes.matchedBatchNumber,
          expiryDate: scanRes.matchedExpiryDate ? scanRes.matchedExpiryDate.split('T')[0] : undefined
        });
        const details = [
          scanRes.name,
          scanRes.size ? `Size: ${scanRes.size}` : '',
          scanRes.color ? `Col: ${scanRes.color}` : '',
          scanRes.matchedBatchNumber ? `Batch: ${scanRes.matchedBatchNumber}` : ''
        ].filter(Boolean).join(' | ');
        return { success: true, itemName: details };
      }
    } catch {
      // Fallback
    }

    if (exactMatch) {
      handleProductClick(exactMatch);
      return { success: true, itemName: exactMatch.name };
    }

    const partialMatches = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q))
    );

    if (partialMatches.length === 1) {
      handleProductClick(partialMatches[0]);
      return { success: true, itemName: partialMatches[0].name };
    }

    // If not matched to any product, check if the latest cart item needs an IMEI/Serial:
    if (cart.length > 0) {
      const awaitingImei = cart.slice().reverse().find((c) => !c.imeiSerial && (isElectronics || (c.item.name && (c.item.name.toLowerCase().includes("phone") || c.item.name.toLowerCase().includes("mobile") || c.item.name.toLowerCase().includes("laptop")))));
      if (awaitingImei) {
        setCart((prev) =>
          prev.map((c) => (c === awaitingImei ? { ...c, imeiSerial: rawCode.trim() } : c))
        );
        playScanBeep();
        return { success: true, itemName: `Attached IMEI / SN: ${rawCode.trim()}` };
      }
    }

    return { success: false };
  };

  // Barcode / Fast Input Submit Handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const res = await processBarcodeCode(searchQuery);
    if (res.success) {
      setSearchQuery("");
    }
  };

  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) =>
      prev.map((c, i) => (i === index ? { ...c, quantity: qty } : c))
    );
  };

  const updatePrice = (index: number, price: number) => {
    if (price < 0 || isNaN(price)) return;
    setCart((prev) =>
      prev.map((c, i) => (i === index ? { ...c, unitPrice: price, baseUnitPrice: price } : c))
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscountValue(0);
    setRedeemedPoints(0);
    searchInputRef.current?.focus();
  };

  // Quick Add Customer Submission
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustName.trim();
    const phone = newCustPhone.trim();

    if (!name) {
      alert("Please enter customer name.");
      return;
    }

    if (phone && phone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setSavingCustomer(true);
      if (saveToDirectory) {
        let uniqueCode = "";
        try {
          uniqueCode = await partyService.getNextCustomerCode();
        } catch {
          uniqueCode = "AUTO";
        }
        if (!uniqueCode) uniqueCode = "AUTO";
        let attributesJson: string | undefined = undefined;
        if (isSweetsBakery && (newCustDob || newCustAnniversary)) {
          attributesJson = JSON.stringify({
            dateOfBirth: newCustDob || undefined,
            anniversaryDate: newCustAnniversary || undefined,
          });
        }
        const newId = await partyService.createCustomer({
          code: uniqueCode,
          legalName: name,
          mobile: phone || undefined,
          primaryPhone: phone || undefined,
          partyType: 1,
          customerType: 3,
          attributesJson,
        });

        // Reload customer list & select
        const custRes = await partyService.getCustomers({ pageSize: 150 });
        setCustomers(custRes.items || []);
        setSelectedCustomerId(newId || "");
      } else {
        setSelectedCustomerId("");
      }

      setCustomerName(name);
      setCustomerPhone(phone);
      setIsAddCustomerOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setNewCustDob("");
      setNewCustAnniversary("");
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to save customer. Saved locally for this bill.");
      setCustomerName(name);
      setCustomerPhone(phone);
      setIsAddCustomerOpen(false);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Live Cart Calculations
  const totalItemCount = cart.length;
  const totalQuantityUnits = cart.reduce((acc, c) => acc + c.quantity, 0);
  const totalMrpValue = cart.reduce((acc, c) => acc + c.quantity * (c.mrp || c.unitPrice), 0);

  const subTotal = cart.reduce((acc, c) => {
    const itemGross = c.quantity * c.unitPrice;
    const itemDisc = (itemGross * c.discountPercent) / 100;
    return acc + (itemGross - itemDisc);
  }, 0);

  const billDiscountAmount =
    billDiscountType === "percent"
      ? (subTotal * billDiscountValue) / 100
      : Math.min(subTotal, billDiscountValue);

  const taxableBase = Math.max(0, subTotal - billDiscountAmount - redeemedPoints);

  const isNonGstBilling = billingMode === "NON_GST";

  const totalTax = isNonGstBilling ? 0 : cart.reduce((acc, c) => {
    const itemGross = c.quantity * c.unitPrice;
    const itemDisc = (itemGross * c.discountPercent) / 100;
    const lineNet = itemGross - itemDisc;
    const rate = c.item.taxRate || 0;
    const isInc = c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive);
    if (isInc && rate > 0) {
      const taxable = lineNet / (1 + rate / 100);
      return acc + (lineNet - taxable);
    }
    return acc + (lineNet * (rate / 100));
  }, 0);

  const exclusiveTaxToAdd = isNonGstBilling ? 0 : cart.reduce((acc, c) => {
    const isInc = c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive);
    if (isInc) return acc;
    const itemGross = c.quantity * c.unitPrice;
    const itemDisc = (itemGross * c.discountPercent) / 100;
    const lineNet = itemGross - itemDisc;
    const rate = c.item.taxRate || 0;
    return acc + (lineNet * (rate / 100));
  }, 0);

  const rawTotal = taxableBase + exclusiveTaxToAdd;
  const netTotal = Math.round(rawTotal);
  const roundOff = Math.round((netTotal - rawTotal) * 100) / 100;
  const totalSavings = Math.max(0, Math.round((totalMrpValue - netTotal) * 100) / 100);
  const cashChangeToReturn = Math.max(0, Math.round((tenderedAmount - netTotal) * 100) / 100);

  const handleHoldBill = async () => {
    if (cart.length === 0) return;
    setIsHolding(true);
    try {
      playHoldSound();
      await apiClient.post("/tenant/pos/held-bills", {
        customerName,
        customerPhone,
        totalAmount: netTotal,
        itemsCount: cart.length,
        cartJson: JSON.stringify(cart),
      });
      clearCart();
      await loadHeldBills();
    } catch (err: any) {
      alert("Failed to hold bill: " + (err.message || "Unknown error"));
    } finally {
      setIsHolding(false);
    }
  };

  const handleResumeBill = async (held: HeldBillRecord) => {
    try {
      const parsedCart: CartItem[] = JSON.parse(held.cartJson);
      setCart(parsedCart);
      setCustomerName(held.customerName || "Walk-in Customer");
      setCustomerPhone(held.customerPhone || "");
      await apiClient.delete(`/tenant/pos/held-bills/${held.id}`);
      setIsHeldModalOpen(false);
      await loadHeldBills();
      playScanBeep();
    } catch (err) {
      alert("Could not resume held bill.");
    }
  };

  const handleDeleteHeldBill = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/tenant/pos/held-bills/${id}`);
      await loadHeldBills();
    } catch (err) {
      alert("Could not delete held bill.");
    }
  };

  // Generate Clean Receipt HTML based on format
  const generateReceiptHtml = (data: typeof lastReceiptData, format: PosPrintFormat = "thermal80") => {
    if (!data) return "";
    const branch = branches.find((b) => b.id === selectedBranchId);
    const storeName = profile?.tradeName || profile?.businessName || "RETAIL STORE";
    const storeAddress = branch?.addressLine1 || profile?.branches?.[0]?.addressLine1 || "Store Counter";
    const storeGstin = branch?.gstin || profile?.gstin || "";
    const storePhone = profile?.primaryPhone || "";

    if (format === "a4" || format === "a5") {
      const isA5 = format === "a5";
      const itemsRows = data.items.map((it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: bold;">
            ${it.name}
            ${(() => {
              const anyIt = it as any;
              let attrs: any = {};
              if (anyIt.attributesJson) {
                try {
                  attrs = typeof anyIt.attributesJson === "string" ? JSON.parse(anyIt.attributesJson) : anyIt.attributesJson;
                } catch {}
              }
              const shade = attrs.shadeCode || anyIt.shadeCode || "";
              const shadeName = attrs.shadeName || anyIt.shadeName || "";
              const pack = attrs.packSize || anyIt.packSize || "";
              const tinting = Number(attrs.tintingCharge || anyIt.tintingCharge || 0);
              const sz = attrs.size || anyIt.size || "";
              const col = attrs.color || anyIt.color || "";

              const badges: string[] = [];
              if (shade || shadeName) {
                badges.push(`<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🎨 Shade: ${shade}${shadeName ? ` (${shadeName})` : ""}</span>`);
              }
              if (pack) {
                badges.push(`<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">📦 Pack: ${pack}</span>`);
              }
              if (tinting > 0) {
                badges.push(`<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🖌️ Tinting: +₹${tinting.toFixed(2)}</span>`);
              }
              if (sz || col) {
                badges.push(`<span style="background:#fff1f2; color:#be123c; border:1px solid #fecdd3; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">${[sz ? `Size: ${sz}` : "", col ? `Colour: ${col}` : ""].filter(Boolean).join(" | ")}</span>`);
              }
              const dim = attrs.dimension || anyIt.dimension || "";
              const coreMat = attrs.coreMaterial || anyIt.coreMaterial || "";
              const wSerial = attrs.warrantySerial || anyIt.warrantySerial || "";
              const wYears = attrs.warrantyYears || anyIt.warrantyYears || "";
              if (dim) {
                badges.push(`<span style="background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🛏️ Size: ${dim}</span>`);
              }
              if (coreMat) {
                badges.push(`<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🧵 ${coreMat}</span>`);
              }
              if (wSerial) {
                badges.push(`<span style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🏷️ S/N: ${wSerial}</span>`);
              }
              if (wYears) {
                badges.push(`<span style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:1px 4px; border-radius:3px; font-weight:bold; font-size:9.5px;">🛡️ Warranty: ${wYears}</span>`);
              }
              if (badges.length === 0) return "";
              return `<div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:2px;">${badges.join("")}</div>`;
            })()}
          </td>
          <td style="padding: 6px 8px; text-align: center;">${it.qty}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${it.rate.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace;">₹${it.total.toFixed(2)}</td>
        </tr>
      `).join("");

      return `
        <div style="width: 100%; max-width: ${isA5 ? '720px' : '800px'}; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: ${isA5 ? '11px' : '12px'}; color: #0f172a; padding: ${isA5 ? '10px' : '20px'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <h1 style="margin: 0; font-size: ${isA5 ? '18px' : '22px'}; font-weight: 900; text-transform: uppercase; color: #0f172a;">${storeName}</h1>
              <p style="margin: 2px 0; color: #475569;">${storeAddress}</p>
              ${storeGstin ? `<p style="margin: 2px 0; font-weight: bold;">GSTIN: <span style="font-family: monospace;">${storeGstin}</span></p>` : ""}
              ${storePhone ? `<p style="margin: 2px 0; color: #475569;">Contact: ${storePhone}</p>` : ""}
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #0f172a; color: #ffffff; font-weight: 800; font-size: 11px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isA5 ? "Retail Cash Memo" : "Tax Invoice / Retail Bill"}
              </span>
              <p style="margin: 6px 0 2px; font-weight: bold;">Invoice #: <span style="font-family: monospace;">${data.invoiceNumber || "POS-TAX-INV"}</span></p>
              <p style="margin: 2px 0; color: #475569;">Date: ${data.date}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Billed To:</span>
              <div style="font-weight: 900; font-size: 13px; color: #0f172a;">${data.customerName}</div>
              ${data.customerPhone ? `<div style="color: #475569;">Phone: ${data.customerPhone}</div>` : `<div style="color: #64748b; font-style: italic;">Walk-in Customer</div>`}
              ${data.shippingAddress ? `
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 10.5px; color: #0369a1;">
                  <b>🚚 Delivery To:</b> ${data.shippingAddress}
                  ${data.deliveryFloorInfo ? ` &bull; <b>Floor/Lift:</b> ${data.deliveryFloorInfo}` : ""}
                  ${data.deliveryVehicleNumber ? ` &bull; <b>Vehicle:</b> ${data.deliveryVehicleNumber}` : ""}
                  ${data.deliveryPerson ? ` &bull; <b>Driver:</b> ${data.deliveryPerson}` : ""}
                </div>
              ` : ""}
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Payment Status:</span>
              <div style="font-weight: bold; color: #16a34a;">PAID via ${data.paymentModeText}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 6px 8px; text-align: center; width: 35px;">#</th>
                <th style="padding: 6px 8px; text-align: left;">Item Description</th>
                <th style="padding: 6px 8px; text-align: center; width: 60px;">Qty</th>
                <th style="padding: 6px 8px; text-align: right; width: 90px;">Rate</th>
                <th style="padding: 6px 8px; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
            <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc; font-size: 11px;">
              <div style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">Terms & Conditions:</div>
              <p style="margin: 2px 0; color: #64748b;">1. Goods once sold cannot be returned without original cash memo.</p>
              <p style="margin: 2px 0; color: #64748b;">2. Subject to local jurisdiction.</p>
              ${data.savings > 0 ? `<p style="margin: 6px 0 0; color: #16a34a; font-weight: bold;">🎉 Customer Total Savings: ₹${data.savings.toFixed(2)}</p>` : ""}
            </div>

            <div style="width: 260px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #ffffff;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Sub-Total:</span>
                <span style="font-family: monospace; font-weight: bold;">₹${data.subTotal.toFixed(2)}</span>
              </div>
              ${data.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;">
                  <span>Bill Discount:</span>
                  <span style="font-family: monospace; font-weight: bold;">-₹${data.discount.toFixed(2)}</span>
                </div>
              ` : ""}
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Taxes & Round:</span>
                <span style="font-family: monospace; font-weight: bold;">+₹${data.tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0; margin: 6px 0; font-size: 14px; font-weight: 900;">
                <span>Total Amount:</span>
                <span style="font-family: monospace; color: #16a34a;">₹${data.netTotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
                <span>Paid (${data.paymentModeText}):</span>
                <span style="font-family: monospace;">₹${data.paidAmount.toFixed(2)}</span>
              </div>
              ${data.splits && data.splits.length > 0 ? `
                <div style="margin: 4px 0; padding: 4px 6px; background-color: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 10px;">
                  <div style="font-weight: bold; color: #475569; margin-bottom: 2px;">Split Breakdown:</div>
                  ${data.splits.map(s => `
                    <div style="display: flex; justify-content: space-between; color: #64748b;">
                      <span>• ${s.mode}:</span>
                      <span style="font-family: monospace; font-weight: bold;">₹${s.amount.toFixed(2)}${s.ref ? ` (${s.ref})` : ''}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ""}
              ${data.changeAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #4338ca; font-weight: bold; margin-top: 2px;">
                  <span>Change Return:</span>
                  <span style="font-family: monospace;">₹${data.changeAmount.toFixed(2)}</span>
                </div>
              ` : ""}
            </div>
          </div>

          <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b;">
            <div>
              <p style="margin: 0;">Thank you for your business!</p>
              <p style="margin: 2px 0 0;">This is a computer generated invoice powered by UdyogBill.</p>
            </div>
            <div style="text-align: right;">
              <div style="height: 30px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 140px; text-align: center; padding-top: 2px; font-weight: bold; color: #0f172a;">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Thermal Slip (80mm vs 58mm)
    const is58 = format === "thermal58";
    const itemsRows = data.items.map((it, idx) => `
      <tr>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:left;">
          ${idx + 1}. ${it.name}
          ${(() => {
            const anyIt = it as any;
            let attrs: any = {};
            if (anyIt.attributesJson) {
              try { attrs = typeof anyIt.attributesJson === "string" ? JSON.parse(anyIt.attributesJson) : anyIt.attributesJson; } catch {}
            }
            const shade = attrs.shadeCode || anyIt.shadeCode || "";
            const pack = attrs.packSize || anyIt.packSize || "";
            const tinting = Number(attrs.tintingCharge || anyIt.tintingCharge || 0);
            const sz = attrs.size || anyIt.size || "";
            const col = attrs.color || anyIt.color || "";
            const dim = attrs.dimension || anyIt.dimension || "";
            const coreMat = attrs.coreMaterial || anyIt.coreMaterial || "";
            const wSerial = attrs.warrantySerial || anyIt.warrantySerial || "";
            const wYears = attrs.warrantyYears || anyIt.warrantyYears || "";
            const parts = [
              shade ? `Shade: ${shade}` : "",
              pack ? `Pack: ${pack}` : "",
              tinting > 0 ? `Tint: +₹${tinting}` : "",
              sz ? `Size: ${sz}` : "",
              col ? `Col: ${col}` : "",
              dim ? `Size: ${dim}` : "",
              coreMat ? `${coreMat}` : "",
              wSerial ? `S/N: ${wSerial}` : "",
              wYears ? `War: ${wYears}` : "",
            ].filter(Boolean);
            if (parts.length === 0) return "";
            return `<div style="font-size:${is58 ? '8px' : '9px'};font-weight:bold;color:#1e293b;">${parts.join(" | ")}</div>`;
          })()}
        </td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:center;">${it.qty}</td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:right;">₹${it.rate.toFixed(2)}</td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:right;font-weight:bold;">₹${it.total.toFixed(2)}</td>
      </tr>
    `).join("");

    return `
      <div style="width:100%;max-width:${is58 ? '215px' : '320px'};margin:0 auto;font-family:'Courier New',Courier,monospace;font-size:${is58 ? '10px' : '12px'};color:#000;padding:${is58 ? '4px 2px' : '10px 6px'};">
        <div style="text-align:center;margin-bottom:6px;">
          ${profile?.logoUrl ? `<div style="text-align:center;margin-bottom:4px;"><img src="${profile.logoUrl}" alt="Logo" style="max-height:${is58 ? '35px' : '50px'};max-width:${is58 ? '100px' : '140px'};object-fit:contain;display:inline-block;" /></div>` : ""}
          <h2 style="margin:0;font-size:${is58 ? '13px' : '16px'};font-weight:900;text-transform:uppercase;">${storeName}</h2>
          <p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">${storeAddress}</p>
          ${storeGstin ? `<p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">GSTIN: <b>${storeGstin}</b></p>` : ""}
          ${storePhone ? `<p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">Tel: ${storePhone}</p>` : ""}
          <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:4px 0;padding:3px 0;font-size:${is58 ? '9px' : '11px'};">
            <b>*** RETAIL CASH MEMO / POS BILL ***</b>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:${is58 ? '9px' : '11px'};">
          <span>Bill: <b>${data.invoiceNumber || "POS-BILL"}</b></span>
          <span>${data.date}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:${is58 ? '9px' : '11px'};">
          <span>Buyer: <b>${data.customerName}</b></span>
          <span>${data.customerPhone ? "M:" + data.customerPhone : "Walk-in"}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #000;border-bottom:1px solid #000;margin:4px 0;font-size:${is58 ? '9px' : '11px'};">
          <thead>
            <tr style="border-bottom:1px dashed #000;">
              <th style="text-align:left;padding:3px 0;">Item</th>
              <th style="text-align:center;padding:3px 0;">Qty</th>
              <th style="text-align:right;padding:3px 0;">Rate</th>
              <th style="text-align:right;padding:3px 0;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-top:4px;font-size:${is58 ? '9px' : '11px'};line-height:1.4;">
          <div style="display:flex;justify-content:space-between;">
            <span>Sub-Total:</span>
            <span>₹${data.subTotal.toFixed(2)}</span>
          </div>
          ${data.discount > 0 ? `
            <div style="display:flex;justify-content:space-between;">
              <span>Discount:</span>
              <span>-₹${data.discount.toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display:flex;justify-content:space-between;">
            <span>Tax/Round:</span>
            <span>+₹${data.tax.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:${is58 ? '12px' : '14px'};font-weight:900;border-top:1px solid #000;border-bottom:1px solid #000;margin:4px 0;padding:3px 0;">
            <span>TOTAL:</span>
            <span>₹${data.netTotal.toFixed(2)}</span>
          </div>
          ${data.splits && data.splits.length > 0 ? `
            <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2px 0;margin:3px 0;font-size:${is58 ? '9px' : '10px'};">
              <div style="font-weight:bold;margin-bottom:1px;">Split Breakdown:</div>
              ${data.splits.map(s => `
                <div style="display:flex;justify-content:space-between;">
                  <span>${s.mode}:</span>
                  <span>₹${s.amount.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="display:flex;justify-content:space-between;">
              <span>Mode:</span>
              <span><b>${data.paymentModeText}</b></span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Paid:</span>
              <span>₹${data.paidAmount.toFixed(2)}</span>
            </div>
          `}
          ${data.changeAmount > 0 ? `
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
              <span>Change:</span>
              <span>₹${data.changeAmount.toFixed(2)}</span>
            </div>
          ` : ""}
        </div>

        ${data.shippingAddress ? `
          <div style="border-top:1px dashed #000;padding:4px 0;margin:4px 0;font-size:${is58 ? '8.5px' : '10px'};">
            <div><b>🚚 HOME DELIVERY DISPATCH:</b></div>
            <div>${data.shippingAddress}</div>
            ${data.deliveryFloorInfo ? `<div>Floor: ${data.deliveryFloorInfo}</div>` : ""}
            ${data.deliveryVehicleNumber ? `<div>Vehicle: ${data.deliveryVehicleNumber}</div>` : ""}
            ${data.deliveryPerson ? `<div>Driver: ${data.deliveryPerson}</div>` : ""}
          </div>
        ` : ""}

        ${profile?.upiId && profile.upiId.trim().length > 0 ? `
          <div style="text-align:center;margin:8px 0;padding:4px 0;border-top:1px dashed #000;">
            <div style="font-size:${is58 ? '8px' : '9px'};font-weight:bold;margin-bottom:3px;text-transform:uppercase;">Scan & Pay via UPI</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
              `upi://pay?pa=${profile.upiId.trim()}&pn=${encodeURIComponent(profile?.tradeName || profile?.businessName || "Store")}&am=${data.netTotal.toFixed(2)}&cu=INR`
            )}" style="width:${is58 ? '95px' : '120px'};height:${is58 ? '95px' : '120px'};margin:0 auto;display:block;" />
            <div style="font-size:${is58 ? '7px' : '8px'};color:#333;margin-top:2px;">UPI: ${profile.upiId.trim()}</div>
          </div>
        ` : ""}

        ${data.savings > 0 ? `
          <div style="border:1px dashed #000;padding:4px;margin:6px 0;text-align:center;font-weight:bold;font-size:${is58 ? '9px' : '11px'};">
            *** SAVED ₹${data.savings.toFixed(2)}! ***
          </div>
        ` : ""}

        <div style="text-align:center;margin-top:8px;font-size:${is58 ? '8px' : '10px'};">
          <p style="margin:1px 0;">Thank You For Shopping With Us!</p>
          <p style="margin:1px 0;color:#555;">Generated via UdyogBill</p>
        </div>
      </div>
    `;
  };

  // Immediate Print Action (Supports Thermal 80mm, Thermal 58mm, A4, A5)
  const triggerPrintReceipt = async (
    receiptObj: typeof lastReceiptData,
    format?: PosPrintFormat,
    invId?: string
  ) => {
    if (!receiptObj) return;
    const targetFormat = format || posPrintFormat;
    const targetInvId = invId || completedInvoiceId;

    if ((targetFormat === "a4" || targetFormat === "a5") && targetInvId) {
      try {
        const preview = await printTemplateService.renderPreview({ invoiceId: targetInvId });
        if (preview?.renderedHtml) {
          printRawHtml(
            preview.renderedHtml,
            `Invoice_${receiptObj.invoiceNumber || "Bill"}`,
            targetFormat === "a5" ? "A5 landscape" : "A4 portrait",
            targetFormat === "a5" ? "3mm 4mm" : "4mm 5mm"
          );
          return;
        }
      } catch (err) {
        console.warn("Could not load backend template preview, using clean built-in layout", err);
      }
    }

    const html = generateReceiptHtml(receiptObj, targetFormat);
    const pageSizeMap: Record<PosPrintFormat, "thermal80" | "thermal58" | "A4 portrait" | "A5 landscape"> = {
      thermal80: "thermal80",
      thermal58: "thermal58",
      a4: "A4 portrait",
      a5: "A5 landscape",
    };
    printRawHtml(
      html,
      `POS-Bill-${receiptObj.invoiceNumber || "Receipt"}`,
      pageSizeMap[targetFormat] || "thermal80"
    );
  };

  const buildWhatsAppReceiptMessage = (
    invId: string,
    invNumber: string,
    data: any,
    targetPhone?: string
  ) => {
    if (!data) return "";
    const merchantName = profile?.tradeName || profile?.businessName || data.branchName || "Store";
    const upiId = profile?.upiId?.trim() || "";
    const publicInvoiceUrl = typeof window !== "undefined"
      ? `${window.location.origin}/i/${invId}`
      : `https://www.udyogbill.com/i/${invId}`;
    const isPaid = paymentMode !== 6;
    const balanceDue = isPaid ? "0.00" : Number(data.netTotal || 0).toFixed(2);

    // Items summary (top 5)
    const itemsSummary = (data.items || [])
      .slice(0, 5)
      .map((it: any) => `• ${it.name} (${Number(it.qty || 1)} Qty) - ₹${Number(it.total || 0).toFixed(2)}`)
      .join("\n");
    const moreCount = (data.items?.length || 0) - 5;
    const itemsBlock = itemsSummary
      ? `\n\n*Items:*\n${itemsSummary}${moreCount > 0 ? `\n... +${moreCount} more` : ""}`
      : "";

    const upiDeepLink = upiId && !isPaid
      ? `\n\n*Pay via UPI (GPay/PhonePe):*\nupi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${balanceDue}&tn=Inv_${invNumber}`
      : "";

    const linkBlock = `\n\n🔗 *Download PDF Bill:*\n${publicInvoiceUrl}`;

    return (
      `🧾 *${merchantName}*\n` +
      `*Tax Invoice: ${invNumber}*\n\n` +
      `Dear *${data.customerName || "Customer"}*,\n` +
      `Thank you for your visit! Here is your bill summary:\n\n` +
      `📄 *Invoice No:* ${invNumber}\n` +
      `📅 *Date:* ${data.date || "Today"}\n` +
      `💰 *Total Amount:* ₹${Number(data.netTotal || 0).toFixed(2)}\n` +
      (isPaid
        ? `✅ *Status:* PAID (₹${Number(data.paidAmount || data.netTotal || 0).toFixed(2)})\n`
        : `💳 *Paid:* ₹0.00\n⚠️ *Balance Due:* ₹${balanceDue}\n`) +
      itemsBlock +
      linkBlock +
      `${upiDeepLink}\n\n` +
      `Thank you!\n— *${merchantName}*`
    );
  };

  const handleCompleteSale = async (options?: {
    sendWhatsApp?: boolean;
    whatsAppPhone?: string;
    splits?: { mode: number; modeName: string; amount: number; ref?: string; notes?: string }[];
  }) => {
    if (!selectedBranchId || !selectedWarehouseId || cart.length === 0) {
      alert("Please select branch, warehouse and at least one item.");
      return;
    }

    const selectedParty = customers.find((c) => c.id === selectedCustomerId);

    // Credit Limit & Khata Default Block Validation
    if (paymentMode === 6) {
      if (!selectedParty) {
        alert("Khata / Credit payment requires selecting a registered customer.");
        return;
      }
      if (selectedParty.isCreditBlocked) {
        alert(`CREDIT SALE BLOCKED: Customer "${selectedParty.legalName}" has been locked from credit sales.`);
        return;
      }
      if (selectedParty.creditLimit > 0) {
        const potentialOutstanding = (selectedParty.currentOutstandingBalance || 0) + netTotal;
        if (potentialOutstanding > selectedParty.creditLimit) {
          const excess = potentialOutstanding - selectedParty.creditLimit;
          const confirmProceed = confirm(
            `CREDIT LIMIT WARNING!\n\nCustomer: ${selectedParty.legalName}\nCredit Limit: ₹${selectedParty.creditLimit.toFixed(2)}\nCurrent Outstanding: ₹${(selectedParty.currentOutstandingBalance || 0).toFixed(2)}\nThis Bill: ₹${netTotal.toFixed(2)}\n\nThis sale exceeds credit limit by ₹${excess.toFixed(2)}.\n\nDo you want to authorize and proceed?`
          );
          if (!confirmProceed) return;
        }
      }
    }

    try {
      setSubmitting(true);
      const currentBranch = branches.find((b) => b.id === selectedBranchId);

      const finalCustName = selectedParty ? selectedParty.legalName : (customerName.trim() || "Walk-in Customer");
      const finalCustPhone = options?.whatsAppPhone
        ? options.whatsAppPhone.trim()
        : selectedParty
        ? (selectedParty.mobile || selectedParty.primaryPhone || "")
        : customerPhone.trim();

      const payModeMap: Record<number, string> = { 1: "Cash", 2: "UPI", 3: "Card", 6: "Khata / Credit" };

      const isCustomSplit = Boolean(options?.splits && options.splits.length > 0);
      const computedSplitPaid = isCustomSplit
        ? (options!.splits!.filter(s => s.mode !== 6).reduce((sum, s) => sum + s.amount, 0))
        : (paymentMode === 6 ? 0 : (tenderedAmount > 0 && Math.abs(tenderedAmount - netTotal) <= 1 ? netTotal : (tenderedAmount >= netTotal ? netTotal : Math.max(0, tenderedAmount))));

      const computedChange = isCustomSplit
        ? (splitCashTendered > splitCash ? splitCashTendered - splitCash : 0)
        : cashChangeToReturn;

      const receiptPayload = {
        invoiceNumber: "POS-" + Date.now().toString().slice(-6),
        date: new Date().toLocaleString("en-IN"),
        customerName: finalCustName,
        customerPhone: finalCustPhone,
        branchName: currentBranch?.branchName || "Main Counter",
        branchGstin: currentBranch?.gstin || profile?.gstin || "",
        items: cart.map((c) => ({
          name: c.item.name + (c.imeiSerial ? ` [SN:${c.imeiSerial}]` : "") + (c.warrantySerial ? ` [SN:${c.warrantySerial}]` : ""),
          size: c.size,
          color: c.color,
          shadeCode: c.shadeCode,
          shadeName: c.shadeName,
          packSize: c.packSize,
          tintingCharge: c.tintingCharge,
          autoBrand: c.autoBrand,
          autoSpecNumber: c.autoSpecNumber,
          dimension: c.dimension,
          warrantySerial: c.warrantySerial,
          warrantyYears: c.warrantyYears,
          coreMaterial: c.coreMaterial,
          qty: c.quantity,
          rate: c.unitPrice,
          total: c.quantity * c.unitPrice - (c.quantity * c.unitPrice * c.discountPercent) / 100,
        })),
        subTotal,
        discount: billDiscountAmount + redeemedPoints,
        tax: totalTax + roundOff,
        netTotal,
        paidAmount: computedSplitPaid,
        changeAmount: computedChange,
        savings: totalSavings,
        paymentModeText: isCustomSplit ? "Split Tender" : (payModeMap[paymentMode] || "Cash"),
        splits: isCustomSplit ? options!.splits!.map(s => ({ mode: s.modeName, amount: s.amount, ref: s.ref })) : undefined,
        isHomeDelivery,
        shippingAddress: isHomeDelivery && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
        deliveryFloorInfo: isHomeDelivery && deliveryFloorInfo.trim() ? deliveryFloorInfo.trim() : undefined,
        deliveryVehicleNumber: isHomeDelivery && deliveryVehicleNumber.trim() ? deliveryVehicleNumber.trim() : undefined,
        deliveryPerson: isHomeDelivery && deliveryPersonName.trim() ? `${deliveryPersonName.trim()}${deliveryPersonPhone.trim() ? ` (${deliveryPersonPhone.trim()})` : ""}` : undefined,
      };

      const custGstin = selectedParty?.gstin?.trim() || "";
      const custStateCode = custGstin && custGstin.length >= 2 && /^\d{2}/.test(custGstin)
        ? custGstin.slice(0, 2)
        : (selectedParty?.stateCode || currentBranch?.stateCode || "");
      const derivedPos = custGstin && custGstin.length >= 2 && /^\d{2}/.test(custGstin)
        ? (GST_STATE_MAP[custGstin.slice(0, 2)] || "N/A")
        : "N/A";

      const isNonGst = billingMode === "NON_GST";
      const createRes = await salesService.createPosBill({
        invoiceType: isNonGst ? 4 : 1, // 4: SalesEstimate (Non-GST Cash Memo), 1: TaxInvoice
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedCustomerId || undefined,
        customerName: finalCustName,
        customerPhone: finalCustPhone || undefined,
        customerGSTIN: isNonGst ? undefined : (selectedParty?.gstin || undefined),
        shippingAddress: isHomeDelivery && deliveryAddress.trim() ? `${deliveryAddress.trim()}${deliveryFloorInfo.trim() ? ` [${deliveryFloorInfo.trim()}]` : ""}` : undefined,
        vehicleNumber: isHomeDelivery && deliveryVehicleNumber.trim() ? deliveryVehicleNumber.trim() : undefined,
        transporterName: isHomeDelivery && deliveryPersonName.trim() ? `${deliveryPersonName.trim()}${deliveryPersonPhone.trim() ? ` (${deliveryPersonPhone.trim()})` : ""}` : undefined,
        notes: isHomeDelivery && deliveryFloorInfo.trim() ? `Delivery: ${deliveryFloorInfo.trim()}` : undefined,
        attributesJson: JSON.stringify({
          billingMode: isNonGst ? "NON_GST" : "GST",
          isNonGst: isNonGst,
          isCashMemo: isNonGst
        }),
        billingStateCode: custStateCode || "",
        shippingStateCode: custStateCode || "",
        placeOfSupply: derivedPos,
        invoiceDate: new Date().toISOString(),
        primaryPaymentMode: isCustomSplit ? 1 : paymentMode,
        invoiceDiscountPercent: billDiscountType === "percent" ? billDiscountValue : 0,
        invoiceDiscountAmount: billDiscountType === "fixed" ? billDiscountValue : 0,
        paidAmount: computedSplitPaid,
        paymentSplits: isCustomSplit
          ? options!.splits!.map(s => ({
              paymentMode: s.mode,
              amount: s.amount,
              transactionReference: s.ref || undefined,
              notes: s.notes || undefined,
            }))
          : undefined,
        items: cart.map((c) => {
          let attrObj: any = {};
          if (c.size) attrObj.size = c.size;
          if (c.color) attrObj.color = c.color;
          if (c.shadeCode) attrObj.shadeCode = c.shadeCode;
          if (c.shadeName) attrObj.shadeName = c.shadeName;
          if (c.packSize) attrObj.packSize = c.packSize;
          if (c.tintingCharge && c.tintingCharge > 0) attrObj.tintingCharge = c.tintingCharge;
          if (c.imeiSerial) attrObj.imeiSerial = c.imeiSerial.trim();
          if (c.autoBrand) attrObj.brand = c.autoBrand;
          if (c.autoSpecNumber) attrObj.specNumber = c.autoSpecNumber;
          if (c.autoPartNumber) attrObj.partNumber = c.autoPartNumber;
          if (c.rackLocation) attrObj.rackLocation = c.rackLocation;
          if (c.dimension) attrObj.dimension = c.dimension;
          if (c.warrantySerial) attrObj.warrantySerial = c.warrantySerial.trim();
          if (c.warrantyYears) attrObj.warrantyYears = c.warrantyYears;
          if (c.coreMaterial) attrObj.coreMaterial = c.coreMaterial;
          if (c.foamDensity) attrObj.foamDensity = c.foamDensity;

          return {
            itemId: c.item.id,
            variantId: c.variantId || undefined,
            attributesJson: Object.keys(attrObj).length > 0 ? JSON.stringify(attrObj) : undefined,
            batchId: c.batchId,
            batchNumber: c.batchNumber,
            expiryDate: c.expiryDate,
            quantity: c.quantity,
            uomId: c.item.primaryUomId,
            unitPrice: c.unitPrice,
            isTaxInclusive: isNonGst ? false : (c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive)),
            gstRate: isNonGst ? 0 : (c.item.taxRate || 0),
            mrp: c.mrp,
            discountPercent: c.discountPercent,
            hsnCode: c.item.hsnCode,
          };
        }),
      });

      const invoiceId = createRes?.id || (createRes as any);
      if (createRes?.invoiceNumber) {
        receiptPayload.invoiceNumber = createRes.invoiceNumber;
      }

      playSuccessChime();
      setCompletedInvoiceId(invoiceId);
      setCompletedInvoiceNumber(receiptPayload.invoiceNumber);
      setLastReceiptData(receiptPayload);
      setIsCheckoutOpen(false);

      if (options?.sendWhatsApp) {
        const rawPhone = (options.whatsAppPhone || finalCustPhone || "").replace(/\D/g, "");
        if (rawPhone.length >= 10) {
          const clean10 = rawPhone.slice(-10);
          const normPhone = `91${clean10}`;
          const msg = buildWhatsAppReceiptMessage(invoiceId, receiptPayload.invoiceNumber, receiptPayload, clean10);
          window.open(`https://api.whatsapp.com/send?phone=${normPhone}&text=${encodeURIComponent(msg)}`, "_blank");
        }
      } else {
        // Trigger instant automatic print dialog in the user's chosen format!
        triggerPrintReceipt(receiptPayload, posPrintFormat, invoiceId);
      }

      clearCart();

      // SAP Hardening Fix 3: Broadcast stock & ledger mutations to other workspace tabs
      notifyEntityMutated("stock");
      if (selectedCustomerId) {
        notifyEntityMutated("ledger", selectedCustomerId);
      }
    } catch (err: any) {
      console.error("Sale error", err);
      const apiMsg = err?.response?.data?.userMessage || err?.response?.data?.message || err?.response?.data?.errorMessage;
      alert(apiMsg || err?.message || "Failed to process sale. Please check stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiatePayWhatsApp = () => {
    if (!selectedBranchId || !selectedWarehouseId || cart.length === 0 || submitting) return;
    const selectedParty = customers.find((c) => c.id === selectedCustomerId);
    const existingPhone = (selectedParty ? (selectedParty.mobile || selectedParty.primaryPhone || "") : customerPhone).replace(/\D/g, "");
    if (existingPhone.length >= 10) {
      handleCompleteSale({ sendWhatsApp: true, whatsAppPhone: existingPhone.slice(-10) });
    } else {
      setWhatsAppModalPhone(existingPhone);
      setIsWhatsAppPromptOpen(true);
    }
  };

  // Keyboard Shortcuts Listener (F1 to F10, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // SAP Fix 1: Abort all keystroke interceptions when POS tab is in the background
      if (!isTabActive) return;

      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "F2") {
        e.preventDefault();
        const el = isWideCart ? wideSearchInputRef.current : searchInputRef.current;
        el?.focus();
        el?.select();
      } else if (e.key === "F3") {
        e.preventDefault();
        document.getElementById("pos-customer-phone-input")?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) handleHoldBill();
      } else if (e.key === "F5") {
        e.preventDefault();
        setShowDiscountInput((prev) => !prev);
      } else if (e.key === "F6") {
        e.preventDefault();
        setIsWideCart((prev) => !prev);
      } else if (e.key === "F7") {
        e.preventDefault();
        setIsSplitModalOpen(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        if (isPharma) {
          handleOpenSaltSubstitute();
        } else if (isHomeFurnishing) {
          handleOpenMattressGrid();
        } else {
          setPaymentMode(2);
          setShowUpiModal(true);
        }
      } else if (e.key === "F9") {
        e.preventDefault();
        setPaymentMode(3);
      } else if (e.key === "F10" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          handleCompleteSale();
        }
      } else if (e.key === "Escape") {
        if (isMattressGridOpen) setIsMattressGridOpen(false);
        else if (isSplitModalOpen) setIsSplitModalOpen(false);
        else if (isCheckoutOpen) setIsCheckoutOpen(false);
        else if (isHeldModalOpen) setIsHeldModalOpen(false);
        else if (isAddCustomerOpen) setIsAddCustomerOpen(false);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else if (showUpiModal) setShowUpiModal(false);
        else if (completedInvoiceId) setCompletedInvoiceId(null);
        else if (cart.length > 0) {
          if (confirm("Clear current cart items?")) clearCart();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTabActive, cart, netTotal, isCheckoutOpen, isHeldModalOpen, isAddCustomerOpen, showShortcutsModal, showUpiModal, completedInvoiceId, submitting, isWideCart]);

  // SAP Hardening Fix 4: Floating modal and media portal cleanup on tab switch
  useEffect(() => {
    const handleCleanup = () => {
      if (isCameraScannerOpen) setIsCameraScannerOpen(false);
      if (showShortcutsModal) setShowShortcutsModal(false);
    };
    window.addEventListener("udyogbill:tab-switch-cleanup", handleCleanup);
    return () => window.removeEventListener("udyogbill:tab-switch-cleanup", handleCleanup);
  }, [isCameraScannerOpen, showShortcutsModal]);

  return (
    <div className={`h-[calc(100vh-4rem)] p-3 lg:p-4 flex flex-col gap-3 select-none overflow-hidden font-sans ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 h-screen" : ""}`}>
      {/* ─── 1. TOP CASHIER & COUNTER CONTROL BAR ─── */}
      <header className="p-2.5 px-3.5 rounded-xl bg-surface border border-border shadow-sm flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left: Counter Identifier & Live Clock */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase">Counter #01</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground font-mono bg-surface-muted px-2.5 py-1 rounded-lg border border-border">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{currentTime || "Live Register"}</span>
          </div>
        </div>

        {/* Center: Branch & Warehouse Location Selectors */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg px-2 py-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-foreground font-semibold focus:outline-none text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-surface text-foreground">
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg px-2 py-1">
            <WarehouseDetailsIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-foreground font-semibold focus:outline-none text-xs"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="bg-surface text-foreground">
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5">
          {hasPharmaAddon && (
            <Link
              href="/app/pharma/pos"
              className="px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-sm transition-all active:scale-95"
              title="Chemist Rapid POS with FEFO & Loose Strip Math"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chemist POS Mode</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsHeldModalOpen(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all ${
              heldBills.length > 0
                ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 animate-pulse"
                : "bg-surface-muted text-foreground border-border hover:bg-surface"
            }`}
            title="Recall Held Bills [F4]"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Held Carts ({heldBills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-surface-muted text-muted-foreground border-border"
            }`}
            title={soundEnabled ? "Barcode Sound Chimes: ON" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* POS Print Format Dropdown */}
          <div className="flex items-center space-x-1 bg-surface-muted px-2 py-1 rounded-lg border border-border text-xs" title="Select Default Invoice Print Format for POS">
            <Printer className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              value={posPrintFormat}
              onChange={(e) => handleSetPosPrintFormat(e.target.value as PosPrintFormat)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="thermal80" className="bg-surface text-foreground">Thermal 80mm (3")</option>
              <option value="thermal58" className="bg-surface text-foreground">Thermal 58mm (2")</option>
              <option value="a4" className="bg-surface text-foreground">Full A4 Tax Invoice</option>
              <option value="a5" className="bg-surface text-foreground">Compact A5 Cash Memo</option>
            </select>
          </div>

          {/* Camera Barcode Scanner Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold border border-primary/30 flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            title="Scan Barcodes using Mobile Camera or Laptop Webcam"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setIsWideCart((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
              isWideCart
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface-muted text-foreground border-border hover:bg-surface"
            }`}
            title="Toggle Wide Cart / Counter Desk View [F6] (Displays 20+ Items across Full Screen)"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{isWideCart ? "Split View" : "Wide View [F6]"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-surface-muted hover:bg-surface text-foreground border border-border transition-colors"
            title="Toggle Clean POS View"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-surface text-foreground text-xs font-bold border border-border flex items-center space-x-1"
            title="Keyboard Shortcuts [F1]"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Keys [F1]</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN SPLIT DESK (LEFT: CART / BILLED ITEMS | RIGHT: STOCK DISCOVERY) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* ─── BILLED ITEMS & CART TABLE PANE (LEFT SIDE - HIGH DENSITY FOR 15+ ITEMS) ─── */}
        <div
          className={`flex flex-col min-w-0 rounded-xl bg-surface border border-border shadow-md overflow-hidden transition-all duration-300 ${
            isWideCart ? "w-full flex-1" : "flex-1"
          }`}
        >
          {/* Customer Account & Quick Bar (Compact 1-Row Bar) */}
          <div className="px-3 py-1.5 bg-surface-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-bold text-foreground flex items-center space-x-1.5 uppercase tracking-wide">
                <Users2 className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Cart [F3]</span>
              </span>
              {cart.length > 0 && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items
                </span>
              )}
              {/* POS Price Tier Toggle (Retail vs Wholesale) */}
              <div className="inline-flex rounded-lg bg-surface border border-border p-0.5 text-[11px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSwitchPosPriceTier("retail")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    posPriceTier === "retail"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Retail Rate (Standard Counter Price)"
                >
                  🏪 Retail
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPosPriceTier("wholesale")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    posPriceTier === "wholesale"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Wholesale Rate (Bulk / Trader Price)"
                >
                  📦 Wholesale
                </button>
              </div>

              {/* Dual-Billing Mode Toggle: GST Tax Invoice vs Non-GST Cash Memo */}
              <div className="inline-flex rounded-lg bg-surface border border-border p-0.5 text-[11px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBillingMode("GST")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    billingMode === "GST"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="GST Tax Invoice (Pakka Bill - Standard Taxable Bill for GSTR-1)"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>GST Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode("NON_GST")}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    billingMode === "NON_GST"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Non-GST Cash Memo (Kaccha Bill / Estimate - Stock Deducted, Excluded from GSTR-1)"
                >
                  <FileText className="w-3 h-3" />
                  <span>Cash Memo</span>
                </button>
              </div>
            </div>

            {/* Inputs: Mobile & Customer Name in single inline flex */}
            <div className="flex items-center gap-1.5 flex-1 max-w-md">
              <input
                id="pos-customer-phone-input"
                type="tel"
                maxLength={10}
                placeholder="📱 Mobile (10 Digits)"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setCustomerPhone(val);
                  const matched = customers.find((c) => c.mobile === val || c.primaryPhone === val);
                  if (matched) {
                    setSelectedCustomerId(matched.id);
                    setCustomerName(matched.legalName);
                    setCustomerPoints(120);
                    if (matched.customerType === 4 && posPriceTier !== "wholesale") {
                      handleSwitchPosPriceTier("wholesale");
                    }
                  }
                }}
                className="w-28 sm:w-32 px-2 py-1 bg-surface border border-border rounded-md text-xs font-mono font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 min-w-[100px] px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={() => {
                  setNewCustPhone(customerPhone);
                  setNewCustName(customerName !== "Walk-in Customer" ? customerName : "");
                  setIsAddCustomerOpen(true);
                }}
                className="px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                title="Add Customer Details"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden md:inline">+ Add</span>
              </button>
            </div>

            {/* Barcode Search Form when in Wide Cart View */}
            {isWideCart && (
              <div className="flex items-center gap-1.5 flex-1 max-w-sm hidden sm:flex">
                <form onSubmit={handleBarcodeSubmit} className="relative flex-1 flex items-center">
                  <Search className="w-3.5 h-3.5 text-primary absolute left-2.5 pointer-events-none" />
                  <input
                    ref={wideSearchInputRef}
                    type="text"
                    placeholder="Scan Barcode / SKU / Name... (F2)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-16 py-1 bg-surface border border-border rounded-md text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="p-1 px-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                  title="Scan with Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Camera</span>
                </button>
                {isPharma && (
                  <button
                    type="button"
                    onClick={() => handleOpenSaltSubstitute()}
                    className="p-1 px-2 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                    title="Find identical salt / molecule generic substitutes [F8]"
                  >
                    <span>💊</span>
                    <span className="hidden md:inline">Salt [F8]</span>
                  </button>
                )}
                {isHomeFurnishing && (
                  <button
                    type="button"
                    onClick={() => handleOpenMattressGrid()}
                    className="p-1 px-2 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                    title="Open 3D Mattress & Dimension Rate Matrix [F8]"
                  >
                    <Bed className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Mattress [F8]</span>
                  </button>
                )}
              </div>
            )}

            {/* Right: Loyalty / Reset / Status */}
            <div className="flex items-center space-x-2 shrink-0">
              {customerPoints > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (redeemedPoints > 0) setRedeemedPoints(0);
                    else setRedeemedPoints(Math.min(customerPoints, subTotal));
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    redeemedPoints > 0 ? "bg-danger text-white" : "bg-amber-600 text-white"
                  }`}
                  title="Toggle Loyalty Points"
                >
                  ⭐ {customerPoints} Pts {redeemedPoints > 0 ? "(Applied)" : "(Redeem)"}
                </button>
              )}

              {selectedCustomerId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId("");
                    setCustomerName("Walk-in Customer");
                    setCustomerPhone("");
                    setCustomerPoints(0);
                    setRedeemedPoints(0);
                  }}
                  className="text-[10px] text-danger font-bold hover:underline cursor-pointer"
                >
                  Reset
                </button>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Walk-in
                </span>
              )}
            </div>
          </div>

          {/* Supermarket Billed Items Table (High Density View for 15+ Items) */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-surface/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 opacity-30 text-primary" />
                <p className="text-xs font-semibold text-foreground">Cart is empty.</p>
                <p className="text-[11px] text-muted-foreground max-w-[240px]">
                  Scan a barcode or click any product tile {isWideCart ? "or type in search" : "on the right"} to start billing.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-table-header text-table-header-foreground text-[10px] uppercase font-bold border-b border-table-border sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 pl-2.5 w-7 text-center">#</th>
                    <th className="py-1.5 px-2">Item Details</th>
                    {isWideCart && <th className="py-1.5 px-2 text-left w-24">SKU</th>}
                    {isWideCart && hasPharmaAddon && <th className="py-1.5 px-2 text-left w-28">Batch / Exp</th>}
                    {isWideCart && <th className="py-1.5 px-2 text-right w-20">MRP</th>}
                    <th className="py-1.5 px-1.5 text-right w-24">Rate</th>
                    <th className="py-1.5 px-1.5 text-center w-24">Qty</th>
                    <th className="py-1.5 px-2 text-right w-24">Total</th>
                    <th className="py-1.5 pr-2 w-7 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-table-border bg-surface">
                  {cart.map((c, idx) => {
                    const lineGross = c.quantity * c.unitPrice;
                    const lineDisc = (lineGross * c.discountPercent) / 100;
                    const lineNet = lineGross - lineDisc;

                    return (
                      <tr key={`${c.item.id}-${c.variantId || 'std'}-${idx}`} className="hover:bg-table-hover transition-colors group">
                        <td className="py-1 pl-2.5 font-mono text-[11px] text-muted-foreground align-middle text-center">
                          {idx + 1}
                        </td>

                        <td className="py-1 px-2 align-middle">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-bold text-xs text-foreground break-words leading-tight" title={c.item.name}>
                              {c.item.name}
                            </span>
                            {(c.size || c.color) && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[9px] border border-rose-200 dark:border-rose-800 shrink-0">
                                {[c.size ? `Size: ${c.size}` : '', c.color ? `Col: ${c.color}` : ''].filter(Boolean).join(' | ')}
                              </span>
                            )}
                            {(c.autoSpecNumber || c.autoBrand) && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-bold text-[9px] border border-orange-200 dark:border-orange-800 shrink-0 flex items-center gap-1">
                                <span>⚙️</span>
                                {[c.autoSpecNumber ? `No: ${c.autoSpecNumber}` : '', c.autoBrand ? `${c.autoBrand}` : '', c.rackLocation ? `📍${c.rackLocation}` : ''].filter(Boolean).join(' | ')}
                              </span>
                            )}
                            {showPaintInPos && (
                              (c.shadeCode || c.packSize || (c.tintingCharge && c.tintingCharge > 0)) ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaintModal(idx)}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[9px] border border-amber-300 dark:border-amber-700/60 shrink-0 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Click to edit Shade, Pack Size, or Tinting Surcharge"
                                >
                                  <span>🎨</span>
                                  <span>
                                    {[
                                      c.shadeCode ? `Shade: ${c.shadeCode}` : '',
                                      c.packSize ? `Pack: ${c.packSize}` : '',
                                      c.tintingCharge ? `Tint: +₹${c.tintingCharge}` : ''
                                    ].filter(Boolean).join(' | ')}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaintModal(idx)}
                                  className="text-[9px] text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold hover:underline shrink-0 cursor-pointer flex items-center gap-0.5"
                                  title="Click to add Shade Code, Pack Size, or Machine Tinting Surcharge"
                                >
                                  <span>🎨 + Shade/Tint</span>
                                </button>
                              )
                            )}
                            {!isWideCart && (
                              <span className="text-[9px] text-muted-foreground/80 font-mono shrink-0">
                                #{c.item.sku}
                              </span>
                            )}
                            {!isWideCart && hasPharmaAddon && c.batchNumber && (
                              <span className="px-1 py-0 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold text-[8px] border border-teal-500/20 shrink-0 font-mono">
                                B:{c.batchNumber}
                              </span>
                            )}
                            {isPharma && (
                              <button
                                type="button"
                                onClick={() => handleOpenSaltSubstitute(c.item)}
                                className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[9px] border border-teal-200 dark:border-teal-800 shrink-0 hover:bg-teal-100 dark:hover:bg-teal-900/60 cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Find identical active salt / chemical generic substitutes"
                              >
                                <span>💊 Same Salt</span>
                              </button>
                            )}
                            {c.imeiSerial ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = prompt("Edit IMEI / Serial Number:", c.imeiSerial || "");
                                  if (val !== null) {
                                    setCart((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, imeiSerial: val.trim() } : item))
                                    );
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-[9px] border border-blue-200 dark:border-blue-800 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Click to edit device IMEI / Serial Number"
                              >
                                <span>📱 SN: {c.imeiSerial}</span>
                              </button>
                            ) : (isElectronics || (c.item.name && (c.item.name.toLowerCase().includes("phone") || c.item.name.toLowerCase().includes("mobile") || c.item.name.toLowerCase().includes("laptop")))) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = prompt("Scan or enter IMEI / Serial Number for " + c.item.name + ":");
                                  if (val !== null && val.trim()) {
                                    setCart((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, imeiSerial: val.trim() } : item))
                                    );
                                  }
                                }}
                                className="text-[9px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold hover:underline shrink-0 cursor-pointer flex items-center gap-0.5"
                                title="Click to scan or enter device IMEI / Serial Number"
                              >
                                <span>📱 + IMEI/SN</span>
                              </button>
                            ) : null}
                            {isHomeFurnishing && (
                              <div className="flex items-center gap-1 flex-wrap shrink-0">
                                {c.dimension && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] border border-indigo-200 dark:border-indigo-800">
                                    🛏️ {c.dimension}
                                  </span>
                                )}
                                {c.coreMaterial && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] border border-amber-200 dark:border-amber-800">
                                    🧵 {c.coreMaterial}
                                  </span>
                                )}
                                {c.warrantyYears && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[9px] border border-emerald-200 dark:border-emerald-800">
                                    🛡️ {c.warrantyYears}Y
                                  </span>
                                )}
                                {c.warrantySerial ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = prompt("Edit Manufacturer Warranty Serial (Sleepwell barcode):", c.warrantySerial || "");
                                      if (val !== null) {
                                        setCart((prev) =>
                                          prev.map((item, i) => (i === idx ? { ...item, warrantySerial: val.trim() } : item))
                                        );
                                      }
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-[9px] border border-blue-200 dark:border-blue-800 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Click to edit Manufacturer Warranty Serial"
                                  >
                                    <span>🏷️ S/N: {c.warrantySerial}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = prompt("Scan or enter Manufacturer Warranty Serial (e.g. IXW7KQROM):");
                                      if (val !== null && val.trim()) {
                                        setCart((prev) =>
                                          prev.map((item, i) => (i === idx ? { ...item, warrantySerial: val.trim() } : item))
                                        );
                                      }
                                    }}
                                    className="text-[9px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold hover:underline shrink-0 cursor-pointer flex items-center gap-0.5"
                                    title="Click to scan or enter Warranty Serial Number"
                                  >
                                    <span>🏷️ + S/N</span>
                                  </button>
                                )}
                              </div>
                            )}
                            {c.mrp > c.unitPrice && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                (-₹{((c.mrp - c.unitPrice) * c.quantity).toFixed(0)})
                              </span>
                            )}
                          </div>
                        </td>

                        {isWideCart && (
                          <td className="py-1 px-2 font-mono text-[11px] text-muted-foreground align-middle">
                            {c.item.sku}
                          </td>
                        )}

                        {isWideCart && hasPharmaAddon && (
                          <td className="py-1 px-2 font-mono text-[10px] text-teal-600 dark:text-teal-400 align-middle">
                            {c.batchNumber || "-"} {c.expiryDate ? `(${c.expiryDate})` : ""}
                          </td>
                        )}

                        {isWideCart && (
                          <td className="py-1 px-2 text-right font-mono text-xs text-muted-foreground align-middle">
                            ₹{c.mrp.toFixed(2)}
                          </td>
                        )}

                        <td className="py-1 px-1.5 text-right font-mono text-xs text-foreground align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-bold text-xs text-muted-foreground/80">₹</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={c.unitPrice === 0 ? "" : c.unitPrice}
                              placeholder="0.00"
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                updatePrice(idx, isNaN(val) ? 0 : val);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-20 py-0.5 px-1.5 text-right font-mono font-bold text-xs bg-surface-muted/90 dark:bg-slate-900/90 hover:bg-surface-muted border border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded text-foreground transition-all cursor-text shadow-2xs"
                              title="Click to edit Price / Rate"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const currentInc = c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive);
                              setCart((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, isTaxInclusive: !currentInc } : item
                                )
                              );
                            }}
                            title={(c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive)) ? "Rate includes GST (Click to toggle to Exclusive)" : "Rate excludes GST (Click to toggle to Inclusive)"}
                            className={`mt-0.5 inline-block text-[8px] font-bold px-1 py-0.2 rounded border transition-colors cursor-pointer text-center leading-tight ${
                              (c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive))
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {(c.isTaxInclusive !== undefined ? c.isTaxInclusive : Boolean(c.item.isTaxInclusive)) ? "With GST" : "Without GST"}
                          </button>
                        </td>

                        {/* Fast Qty Control (Compact tactile +/-) */}
                        <td className="py-1 px-1.5 align-middle">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, c.quantity - 1)}
                              className="w-4 h-4 rounded bg-danger/10 hover:bg-danger text-danger hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Decrease"
                            >
                              <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={c.quantity}
                              onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                              className="w-7 py-0 text-center font-mono font-bold text-xs bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, c.quantity + 1)}
                              className="w-4 h-4 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center transition-colors cursor-pointer"
                              title="Increase"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </td>

                        <td className="py-1 px-2 text-right font-mono font-bold text-xs text-foreground align-middle">
                          ₹{lineNet.toFixed(2)}
                        </td>

                        <td className="py-1 pr-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="text-muted-foreground hover:text-danger p-0.5 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bill Summary & Instant Tender (High-Efficiency Compact Dock) */}
          <div className="p-2.5 bg-surface border-t border-border shrink-0 space-y-2">
            {/* Row 1: Comprehensive Financial Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-border/40 pb-1.5">
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-medium text-[11px]">
                <span>Items: <strong className="text-foreground font-mono">{totalItemCount}</strong> (Units: <strong className="text-foreground font-mono">{totalQuantityUnits}</strong>)</span>
                <span>Sub-Total: <strong className="font-mono text-foreground">₹{subTotal.toFixed(2)}</strong></span>
                <span>Tax: <strong className="font-mono text-foreground">{isNonGstBilling ? <span className="text-amber-600 dark:text-amber-400 font-bold">Non-GST (₹0.00)</span> : (exclusiveTaxToAdd > 0 ? `+₹${(exclusiveTaxToAdd + roundOff).toFixed(2)}` : `(Incl. ₹${totalTax.toFixed(2)})`)}</strong></span>

                {/* Discount Trigger / Pill */}
                {showDiscountInput ? (
                  <div className="inline-flex items-center space-x-1 bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                    <span className="text-[10px] font-bold">Disc:</span>
                    <input
                      type="number"
                      min="0"
                      max={billDiscountType === "percent" ? 100 : subTotal}
                      value={billDiscountValue || ""}
                      onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-12 px-1 py-0 text-[11px] font-mono font-bold bg-surface border border-border rounded text-right text-foreground focus:outline-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setBillDiscountType((prev) => (prev === "percent" ? "fixed" : "percent"))}
                      className="px-1 py-0 rounded bg-primary/20 text-primary text-[9px] font-bold"
                    >
                      {billDiscountType === "percent" ? "%" : "₹"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(true)}
                    className="text-[10px] text-primary hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>{billDiscountAmount > 0 ? `Disc: -₹${billDiscountAmount.toFixed(2)}` : "+ Discount [F5]"}</span>
                  </button>
                )}

                {redeemedPoints > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                    Loyalty: -₹{redeemedPoints.toFixed(2)}
                  </span>
                )}

                {totalSavings > 0 && (
                  <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Save ₹{totalSavings.toFixed(2)}</span>
                  </span>
                )}

                {/* Home Delivery Trigger (Prominent in Furniture & Mattress Showrooms) */}
                <button
                  type="button"
                  onClick={() => setIsHomeDelivery((prev) => !prev)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer font-bold ${
                    isHomeDelivery
                      ? "bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground border-border/60"
                  }`}
                  title="Toggle Home Delivery & Logistics Dispatch"
                >
                  <Truck className="w-2.5 h-2.5" />
                  <span>{isHomeDelivery ? "🚚 Delivery Active" : "+ Delivery Dispatch"}</span>
                </button>
              </div>

              {/* Net Payable Highlight */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Payable:</span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{netTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Collapsible Home Delivery Dispatch Drawer */}
            {isHomeDelivery && (
              <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-lg p-2 space-y-1.5 animate-in fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-sky-900 dark:text-sky-300 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-sky-600" />
                    <span>Home Delivery Dispatch Details</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const activeCust = customers.find((c) => c.id === selectedCustomerId);
                      const custAddr = activeCust?.formattedBillingAddress || [activeCust?.billingAddressLine1, activeCust?.billingCity, activeCust?.billingState, activeCust?.billingPincode].filter(Boolean).join(", ");
                      if (!custAddr) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setDeliveryAddress(custAddr)}
                          className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                        >
                          Copy Customer Address
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setIsHomeDelivery(false)}
                      className="text-muted-foreground hover:text-foreground text-[10px] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Delivery Destination Address..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface border border-border rounded font-medium focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Floor / Flat / No Lift (e.g. 4th Flr)"
                      value={deliveryFloorInfo}
                      onChange={(e) => setDeliveryFloorInfo(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-surface border border-border rounded font-medium focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Tempo / Vehicle No (e.g. MH 12 1234)"
                      value={deliveryVehicleNumber}
                      onChange={(e) => setDeliveryVehicleNumber(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-xs bg-surface border border-border rounded font-mono font-bold focus:ring-1 focus:ring-sky-500 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Row 2: Payment Mode Tabs & Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Payment Mode Mini-Tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode(1);
                    setTenderedAmount(netTotal);
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 1
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <Banknote className="w-3 h-3" />
                  <span>Cash [F7]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode(2);
                    setShowUpiModal(true);
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 2
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>UPI [F8]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode(3)}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 3
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Card [F9]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode(6)}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 6
                      ? "bg-warning/20 text-warning border-warning/40 shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <Users2 className="w-3 h-3" />
                  <span>Khata</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitCash(netTotal);
                    setSplitCashTendered(netTotal);
                    setIsSplitModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
                  title="Split Payment between Cash, UPI, Card & Khata [F7]"
                >
                  <Layers className="w-3 h-3" />
                  <span>Split [F7]</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-2.5 py-1.5 rounded-md bg-surface-muted hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                  title="Clear Cart [Esc]"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={cart.length === 0 || isHolding}
                  className="px-2.5 py-1.5 rounded-md bg-surface-muted hover:bg-surface text-warning border border-border/40 text-xs font-semibold disabled:opacity-40 transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Hold Bill [F4]"
                >
                  <PauseCircle className="w-3 h-3 text-warning" />
                  <span>Hold [F4]</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteSale({ sendWhatsApp: false })}
                  disabled={cart.length === 0 || submitting}
                  className="py-1.5 px-2.5 sm:px-3 rounded-md bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  title="Pay & Print Bill [F10]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{submitting ? "Processing..." : `PAY & PRINT ₹${netTotal.toFixed(2)} [F10]`}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={handleInitiatePayWhatsApp}
                  disabled={cart.length === 0 || submitting}
                  className="py-1.5 px-2.5 sm:px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  title="Pay & Send WhatsApp Invoice"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{submitting ? "Processing..." : `PAY & WHATSAPP`}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Row 3 (Only when Cash mode is active): Compact Cash Denomination & Change Bar */}
            {paymentMode === 1 && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 px-2 rounded-md bg-surface-muted/60 border border-border/40 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[11px] text-foreground">Cash Recv:</span>
                  <input
                    type="number"
                    value={tenderedAmount === 0 ? "0" : (tenderedAmount || "")}
                    onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-surface border border-border/40 rounded text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(0)}
                    className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                  >
                    Udhar (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(netTotal)}
                    className="px-1.5 py-0.5 rounded bg-surface border border-border/40 hover:bg-surface-muted text-[10px] font-mono font-bold text-foreground cursor-pointer"
                  >
                    Exact
                  </button>
                  {[100, 200, 500, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedAmount(amt)}
                      className="px-1.5 py-0.5 rounded bg-surface border border-border/40 hover:bg-surface-muted text-[10px] font-mono font-bold text-foreground cursor-pointer"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {tenderedAmount > netTotal && (
                  <div className="flex items-center space-x-1 text-[11px] text-success font-bold">
                    <span>Change:</span>
                    <span className="font-mono font-black">₹{cashChangeToReturn.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── STOCK & PRODUCT DISCOVERY PANE (RIGHT SIDE) ─── */}
        {!isWideCart && (
          <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col gap-2.5 min-w-0 bg-surface rounded-xl border border-border/40 p-3 shadow-2xs overflow-hidden shrink-0">
          {/* Big Barcode Search Bar with Camera Scanner (Focus on [F2]) */}
          <div className="flex items-center gap-1.5">
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 flex items-center min-w-0">
              <Search className="w-4 h-4 text-primary absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                placeholder="🔍 Scan Barcode or Type Item Name / SKU... (Enter to Add | F2)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2 bg-surface-muted border border-border/40 focus:border-primary rounded-xl text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-20 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 px-3 py-1.2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Add
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold shadow-2xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
              title="Open Live Camera Barcode Scanner"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {isPharma && (
              <button
                type="button"
                onClick={() => handleOpenSaltSubstitute()}
                className="py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-bold shadow-2xs flex items-center space-x-1 shrink-0 transition-all cursor-pointer"
                title="Find generic bio-equivalent salt substitute medicines [F8]"
              >
                <span>💊</span>
                <span className="hidden sm:inline">Salt Sub (F8)</span>
              </button>
            )}
            {isHomeFurnishing && (
              <button
                type="button"
                onClick={() => handleOpenMattressGrid()}
                className="py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold shadow-2xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                title="Open 3D Mattress & Dimension Rate Matrix [F8]"
              >
                <Bed className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">Mattress Matrix (F8)</span>
              </button>
            )}
          </div>

          {/* Department / Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Items</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory("fast_moving")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === "fast_moving"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Top Fast Moving</span>
            </button>

            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid (Touch & Click Friendly) */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
                <Search className="w-8 h-8 opacity-30" />
                <p className="text-xs">No matching product found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const price = item.sellingPrice || item.mrp || 0;
                const mrp = item.mrp && item.mrp > price ? item.mrp : price;
                const savings = mrp > price ? mrp - price : 0;
                const inCart = cart.find((c) => c.item.id === item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProductClick(item)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group relative shadow-2xs min-h-[135px] ${
                      inCart
                        ? "bg-surface-elevated border-primary/40 shadow-xs"
                        : "bg-surface hover:bg-surface-muted border-border/40 hover:border-border"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold shadow-2xs">
                        {inCart.quantity} in cart
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-muted-foreground uppercase truncate max-w-[80px]">
                            {item.sku}
                          </span>
                          {item.trackVariants && (
                            <span className="px-1 py-0 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[8px] border border-rose-500/20 shrink-0">
                              Variants
                            </span>
                          )}
                        </div>
                        {item.categoryName && (
                          <span className="text-muted-foreground truncate max-w-[80px]">
                            {item.categoryName}
                          </span>
                        )}
                      </div>

                      <div
                        title={item.name}
                        className={`text-foreground mt-1 group-hover:text-primary transition-colors break-words ${getPosItemNameClass(item.name)}`}
                      >
                        {item.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/40 flex items-end justify-between">
                      <div>
                        {savings > 0 && (
                          <div className="text-[10px] text-muted-foreground line-through font-mono">
                            MRP ₹{mrp.toFixed(2)}
                          </div>
                        )}
                        <div className="font-mono font-bold text-sm text-foreground">
                          ₹{price.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPharma && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSaltSubstitute(item);
                            }}
                            className="px-1.5 py-0.8 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Find same salt generic substitutes"
                          >
                            💊 Salt
                          </span>
                        )}
                        <span className="px-2 py-0.8 rounded-md bg-surface-elevated group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground border border-border/40 text-[11px] font-semibold transition-all shrink-0">
                          + Add
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        )}

      </div>

      {/* ─── MODAL 0: QUICK ADD CUSTOMER / NAME MODAL ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">Add Customer Name</h3>
                <p className="text-[11px] text-muted-foreground">Quickly attach customer details to this bill.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Customer / Buyer Name <span className="text-danger">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">
                    Mobile Number (Optional)
                  </label>
                  {newCustPhone && (
                    <span className={`text-[10px] font-mono font-bold ${newCustPhone.length === 10 ? "text-emerald-500" : "text-amber-500"}`}>
                      {newCustPhone.length}/10 digits
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 9876543210 (10 Digits)"
                  value={newCustPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setNewCustPhone(digits);
                  }}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-mono font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
                {newCustPhone.length > 0 && newCustPhone.length < 10 && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Mobile number must be 10 digits ({10 - newCustPhone.length} digits remaining)
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  City / Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Sector 12"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              {/* Sweets & Bakery Dedicated Celebration Fields */}
              {isSweetsBakery && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-pink-500/5 dark:bg-pink-950/20 border border-pink-500/20">
                  <div>
                    <label className="text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-1 mb-1">
                      <span>🎂</span> Date of Birth (DOB)
                    </label>
                    <input
                      type="date"
                      value={newCustDob}
                      onChange={(e) => setNewCustDob(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-pink-300 dark:border-pink-900 rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-1 mb-1">
                      <span>💍</span> Date of Anniversary
                    </label>
                    <input
                      type="date"
                      value={newCustAnniversary}
                      onChange={(e) => setNewCustAnniversary(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-pink-300 dark:border-pink-900 rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <p className="col-span-full text-[10px] text-pink-600 dark:text-pink-400/80 font-medium leading-relaxed">
                    🎂 <strong>Sweets &amp; Bakery Special:</strong> Save customer Birthday and Anniversary to send automated greetings and promotional offers.
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="save-to-dir-checkbox"
                  type="checkbox"
                  checked={saveToDirectory}
                  onChange={(e) => setSaveToDirectory(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="save-to-dir-checkbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Save to Customer Directory for future billing
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50 transition-colors"
                >
                  {savingCustomer ? "Saving..." : "Set Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: HELD BILLS QUEUE ─── */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsHeldModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-foreground">Held Carts Queue ({heldBills.length})</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any parked bill to immediately restore it to the checkout counter.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {heldBills.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No held bills in queue.</p>
              ) : (
                heldBills.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleResumeBill(h)}
                    className="p-3 rounded-xl bg-surface-muted/50 border border-border hover:border-primary hover:bg-surface-muted transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-primary">{h.holdNumber}</span>
                        <span className="text-xs text-foreground font-bold">{h.customerName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center space-x-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{new Date(h.createdAtUtc).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{h.itemsCount} Items</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{h.totalAmount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(h.id, e)}
                        className="p-1 rounded text-muted-foreground hover:text-danger transition-colors"
                        title="Delete Held Cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DYNAMIC UPI QR POPUP ─── */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setShowUpiModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center space-x-2 text-primary">
              <QrCode className="w-6 h-6" />
              <h3 className="text-base font-black">Scan & Pay via UPI</h3>
            </div>

            {profile?.upiId && profile.upiId.trim().length > 0 ? (
              <>
                <div className="p-4 bg-white border-2 border-primary rounded-xl inline-block shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=${profile.upiId.trim()}&pn=${encodeURIComponent(profile?.tradeName || profile?.businessName || "Store")}&am=${netTotal.toFixed(2)}&cu=INR`
                    )}`}
                    alt="UPI QR Code"
                    className="w-44 h-44 mx-auto object-contain"
                  />
                </div>

                <div>
                  <div className="text-xl font-black font-mono text-foreground">₹{netTotal.toFixed(2)}</div>
                  <div className="text-xs font-mono font-bold text-primary mt-0.5">{profile.upiId.trim()}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Scan using Google Pay, PhonePe, Paytm or BHIM UPI.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-foreground">UPI ID Not Configured</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aapke store ka UPI ID abhi configure nahi hai. Payments accept karne ke liye Business Settings me apna PhonePe, GooglePay ya Bank UPI ID add karein.
                </p>
                <a
                  href="/app/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                >
                  Configure UPI in Settings →
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowUpiModal(false);
                handleCompleteSale();
              }}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-colors"
            >
              Confirm UPI Payment Received & Print
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: MULTI-TENDER SPLIT PAYMENT ─── */}
      {isSplitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsSplitModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-primary border-b border-border pb-3">
              <Layers className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Multi-Tender Split Payment</h3>
                <p className="text-xs text-muted-foreground">Split bill across Cash, UPI, Card & Khata / Credit</p>
              </div>
            </div>

            {/* Bill Net Total Banner */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium">Net Payable Bill</span>
                <div className="text-xl font-black text-purple-700 dark:text-purple-300">₹{netTotal.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground font-medium">Allocated so far</span>
                <div className={`text-base font-bold ${Math.abs(netTotal - (splitCash + splitUpi + splitCard + splitCredit)) < 0.05 ? "text-emerald-600" : "text-amber-500"}`}>
                  ₹{(splitCash + splitUpi + splitCard + splitCredit).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tender Inputs */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {/* Cash Tender */}
              <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cash Amount (₹)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const remainder = Math.max(0, netTotal - (splitUpi + splitCard + splitCredit));
                      setSplitCash(remainder);
                      if (splitCashTendered < remainder) setSplitCashTendered(remainder);
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Auto Fill Remaining
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Allocation</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={splitCash || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSplitCash(val);
                        if (splitCashTendered < val) setSplitCashTendered(val);
                      }}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Customer Gave (Change: ₹{Math.max(0, splitCashTendered - splitCash).toFixed(2)})</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={splitCashTendered || ""}
                      onChange={(e) => setSplitCashTendered(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* UPI Tender */}
              <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>UPI / QR Amount (₹)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplitUpi(Math.max(0, netTotal - (splitCash + splitCard + splitCredit)))}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Auto Fill Remaining
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitUpi || ""}
                    onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono font-bold"
                  />
                  <input
                    type="text"
                    value={splitUpiRef}
                    onChange={(e) => setSplitUpiRef(e.target.value)}
                    placeholder="UPI Ref / UTR (Optional)"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs"
                  />
                </div>
              </div>

              {/* Card Tender */}
              <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Card / EDC Swipe Amount (₹)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplitCard(Math.max(0, netTotal - (splitCash + splitUpi + splitCredit)))}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Auto Fill Remaining
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCard || ""}
                    onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono font-bold"
                  />
                  <input
                    type="text"
                    value={splitCardRef}
                    onChange={(e) => setSplitCardRef(e.target.value)}
                    placeholder="Auth Code / Batch No (Optional)"
                    className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs"
                  />
                </div>
              </div>

              {/* Khata / Credit Tender */}
              <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Users2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Khata / Credit Balance (₹)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplitCredit(Math.max(0, netTotal - (splitCash + splitUpi + splitCard)))}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Auto Fill Remaining
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitCredit || ""}
                  onChange={(e) => setSplitCredit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Validation & Submit Button */}
            {(() => {
              const totalAllocated = splitCash + splitUpi + splitCard + splitCredit;
              const diff = Math.round((netTotal - totalAllocated) * 100) / 100;
              const isMatched = Math.abs(diff) < 0.05;

              return (
                <div className="space-y-2 pt-2">
                  {!isMatched && (
                    <div className="text-xs font-bold text-rose-500 text-center">
                      {diff > 0
                        ? `₹${diff.toFixed(2)} remaining to be allocated!`
                        : `Over-allocated by ₹${Math.abs(diff).toFixed(2)}!`}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!isMatched || submitting}
                    onClick={() => {
                      const splits = [];
                      if (splitCash > 0) splits.push({ mode: 1, modeName: "Cash", amount: splitCash, ref: "Cash Tender" });
                      if (splitUpi > 0) splits.push({ mode: 2, modeName: "UPI", amount: splitUpi, ref: splitUpiRef });
                      if (splitCard > 0) splits.push({ mode: 3, modeName: "Card", amount: splitCard, ref: splitCardRef });
                      if (splitCredit > 0) splits.push({ mode: 6, modeName: "Credit", amount: splitCredit, ref: "Khata Ledger" });

                      handleCompleteSale({ splits });
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Split Payment & Print Bill (₹{netTotal.toFixed(2)})</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── MODAL 3: KEYBOARD SHORTCUTS CHEATSHEET ─── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-foreground font-bold text-base">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              <span>Supermarket POS Fast Keys</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: "F1", desc: "Show Shortcuts Cheatsheet" },
                { key: "F2", desc: "Focus Barcode Scanner / Search" },
                { key: "F3", desc: "Focus Customer Mobile / Member" },
                { key: "F4", desc: "Hold / Park Current Bill" },
                { key: "F5", desc: "Apply Bill Discount (% or ₹)" },
                { key: "F6", desc: "Toggle Wide View (15+ Items)" },
                { key: "F7", desc: "Fast Cash Payment Tender" },
                { key: "F8", desc: "Instant UPI / QR Code" },
                { key: "F9", desc: "Card / Swipe Payment" },
                { key: "F10 / Ctrl+Enter", desc: "Pay & Print Bill" },
                { key: "Esc", desc: "Clear Cart / Close Modal" },
              ].map((s) => (
                <div key={s.key} className="p-2 rounded-lg bg-surface-muted border border-border flex items-center justify-between">
                  <span className="font-mono font-black px-1.5 py-0.5 rounded bg-surface border border-border text-foreground text-[10px]">
                    {s.key}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium text-right">{s.desc}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 rounded-lg bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold transition-colors"
            >
              Close [Esc]
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: GARMENTS VARIANT PICKER (SIZE & COLOR) ─── */}
      {variantModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-foreground">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">#{variantModalItem.sku}</span>
                <h3 className="text-base font-bold text-foreground">{variantModalItem.name}</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">Select Variant / Pack Size &amp; Variety</p>
              </div>
              <button
                type="button"
                onClick={() => setVariantModalItem(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingVariants ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                <div>Loading variants...</div>
              </div>
            ) : itemVariants.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {itemVariants.map((v) => {
                    const price = v.sellingPrice !== undefined && v.sellingPrice > 0
                      ? v.sellingPrice
                      : ((variantModalItem.sellingPrice || variantModalItem.mrp || 0) + v.priceAdjustment);
                    const mrp = v.mrp !== undefined && v.mrp > 0
                      ? v.mrp
                      : ((variantModalItem.mrp || price) + v.priceAdjustment);
                    const inCartCount = cart
                      .filter((c) => c.item.id === variantModalItem.id && c.variantId === v.id)
                      .reduce((sum, c) => sum + c.quantity, 0);

                    const isRegularOrStandard = !v.color || v.color.toLowerCase() === "regular" || v.color.toLowerCase() === "standard" || v.color.toLowerCase() === "regular / standard";

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          addToCart(variantModalItem, {
                            variantId: v.id,
                            size: v.size,
                            color: isRegularOrStandard ? undefined : v.color,
                            unitPrice: price,
                            mrp: mrp
                          });
                          setVariantModalItem(null);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:border-primary hover:bg-primary/5 cursor-pointer relative shadow-2xs ${
                          inCartCount > 0 ? "border-primary bg-primary/10" : "border-border bg-surface-elevated/40"
                        }`}
                      >
                        {inCartCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
                            {inCartCount}
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.size && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800">
                                {v.size}
                              </span>
                            )}
                            {v.color && !isRegularOrStandard && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-border">
                                {v.color}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                            {v.variantSku}
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between">
                          <span className="font-bold text-xs font-mono text-foreground">₹{price.toFixed(2)}</span>
                          <span className={`text-[10px] font-semibold ${v.currentStock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            Stock: {v.currentStock}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-xs">No active variants found for this item.</p>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(variantModalItem);
                    setVariantModalItem(null);
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                >
                  Add Standard Item to Cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 3C: AUTO PARTS MULTI-NUMBER & BRAND PICKER ─── */}
      {autoPartsPickerItem && (() => {
        let apAttrs: any = {};
        try {
          apAttrs = typeof autoPartsPickerItem.attributesJson === "string"
            ? JSON.parse(autoPartsPickerItem.attributesJson)
            : autoPartsPickerItem.attributesJson;
        } catch {}
        const matrix: any[] = Array.isArray(apAttrs?.autoPartsMatrix) ? apAttrs.autoPartsMatrix : [];

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-foreground max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">
                      Select Auto Parts Number &amp; Brand
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[280px]" title={autoPartsPickerItem.name}>
                      {autoPartsPickerItem.name} {apAttrs?.oemPartNumber ? `(${apAttrs.oemPartNumber})` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPartsPickerItem(null)}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {matrix.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No variant numbers configured.
                  </div>
                ) : (
                  matrix.map((row, idx) => {
                    const rowQty = Number(row.quantity) || 0;
                    const inStock = rowQty > 0;
                    const rowRate = Number(row.sellingPrice) || autoPartsPickerItem.sellingPrice || 0;
                    const rowMrp = Number(row.mrp) || autoPartsPickerItem.mrp || 0;
                    const mistriRate = Number(row.mechanicRate) || 0;

                    return (
                      <button
                        key={row.id || idx}
                        type="button"
                        onClick={() => {
                          addToCart(autoPartsPickerItem, {
                            size: row.specNumber,
                            color: row.brand,
                            autoBrand: row.brand,
                            autoSpecNumber: row.specNumber,
                            autoPartNumber: row.partNumber,
                            rackLocation: row.rackLocation,
                            unitPrice: rowRate,
                            mrp: rowMrp,
                          });
                          setAutoPartsPickerItem(null);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-border hover:border-orange-500 bg-surface hover:bg-surface-muted/60 transition flex flex-col gap-2 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 font-mono font-bold text-xs border border-orange-300 dark:border-orange-800">
                              No: {row.specNumber}
                            </span>
                            <span className="font-bold text-xs text-foreground">
                              {row.brand}
                            </span>
                            {row.partNumber && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                #{row.partNumber}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inStock
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}>
                            {inStock ? `Stock: ${rowQty}` : "Stock: 0"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                              ₹{rowRate.toFixed(2)}
                            </span>
                            {rowMrp > rowRate && (
                              <span className="text-[10px] text-muted-foreground line-through font-mono">
                                MRP ₹{rowMrp.toFixed(2)}
                              </span>
                            )}
                            {mistriRate > 0 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                                Mistri: ₹{mistriRate.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {row.rackLocation && (
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              📍 {row.rackLocation}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Click any variant row to add to current bill.</span>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(autoPartsPickerItem);
                    setAutoPartsPickerItem(null);
                  }}
                  className="text-primary hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Add Generic Item &rarr;
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL 3B: HARDWARE / PAINT SHADE & TINTING SURCHARGE MODAL ─── */}
      {paintModalIndex !== null && cart[paintModalIndex] && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  🎨
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Paint Shade &amp; Surcharge</h3>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={cart[paintModalIndex].item.name}>
                    {cart[paintModalIndex].item.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaintModalIndex(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Shade Code / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0912 or Morning Glory"
                  value={paintModalShade}
                  onChange={(e) => setPaintModalShade(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSavePaintModal(); }}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  Pack Size
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1L, 4L, 10L, 20L"
                  value={paintModalPack}
                  onChange={(e) => setPaintModalPack(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSavePaintModal(); }}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-1">
                  Machine Tinting Surcharge (+₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={paintModalTint}
                    onChange={(e) => setPaintModalTint(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSavePaintModal(); }}
                    className="w-full pl-7 pr-3 py-2 bg-surface-muted border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs text-foreground font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Base Rate: ₹{(cart[paintModalIndex].baseUnitPrice ?? cart[paintModalIndex].unitPrice).toFixed(2)} + Surcharge = New Rate
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => setPaintModalIndex(null)}
                className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePaintModal}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                Apply Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: SALE SUCCESS & DIRECT RECEIPT PRINT POPUP ─── */}
      {completedInvoiceId && lastReceiptData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl max-h-[90vh] flex flex-col text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Sale Billed Successfully!</h3>
                  <p className="text-[10px] text-muted-foreground">Bill: {lastReceiptData.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setCompletedInvoiceId(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Preview Box */}
            <div className="flex-1 overflow-y-auto bg-surface-muted p-3 rounded-xl border border-border max-h-60 font-mono text-[11px] text-foreground">
              <div className="text-center font-bold pb-1 border-b border-dashed border-border">
                {profile?.businessName || "RETAIL STORE"}
              </div>
              <div className="py-1 text-[10px] text-muted-foreground border-b border-dashed border-border">
                <div>Customer: <b className="text-foreground">{lastReceiptData.customerName}</b> ({lastReceiptData.customerPhone || "Walk-in"})</div>
                <div>Date: {lastReceiptData.date}</div>
              </div>
              <div className="py-1.5 space-y-1.5">
                {lastReceiptData.items.map((it, idx) => {
                  const parts = [
                    it.shadeCode ? `Shade: ${it.shadeCode}` : '',
                    it.packSize ? `Pack: ${it.packSize}` : '',
                    it.tintingCharge && it.tintingCharge > 0 ? `Tint: +₹${it.tintingCharge}` : '',
                    it.size ? `Size: ${it.size}` : '',
                    it.color ? `Col: ${it.color}` : '',
                    (it as any).dimension ? `Size: ${(it as any).dimension}` : '',
                    (it as any).coreMaterial ? `${(it as any).coreMaterial}` : '',
                    (it as any).warrantySerial ? `S/N: ${(it as any).warrantySerial}` : '',
                    (it as any).warrantyYears ? `War: ${(it as any).warrantyYears}` : '',
                    (it as any).autoSpecNumber ? `No: ${(it as any).autoSpecNumber}` : '',
                    (it as any).autoBrand ? `Make: ${(it as any).autoBrand}` : '',
                  ].filter(Boolean);

                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="truncate max-w-[170px]">{it.name} x{it.qty}</span>
                        <span className="font-bold">₹{it.total.toFixed(2)}</span>
                      </div>
                      {parts.length > 0 && (
                        <div className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold font-mono pl-1">
                          ↳ {parts.join(" | ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-1.5 border-t border-dashed border-border text-right space-y-0.5">
                <div className="text-muted-foreground text-[10px]">Tax & Round: +₹{lastReceiptData.tax.toFixed(2)}</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">Net Total: ₹{lastReceiptData.netTotal.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Paid ({lastReceiptData.paymentModeText}): ₹{lastReceiptData.paidAmount.toFixed(2)}</div>
                {lastReceiptData.changeAmount > 0 && (
                  <div className="text-[10px] font-bold text-orange-500">Change Returned: ₹{lastReceiptData.changeAmount.toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Print & Next Customer Actions */}
            <div className="space-y-2 pt-1">
              {/* Format Switcher Pills in Modal */}
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span className="text-muted-foreground text-[10px]">Print Format:</span>
                <div className="flex items-center gap-1">
                  {([
                    { id: "thermal80", label: "80mm" },
                    { id: "thermal58", label: "58mm" },
                    { id: "a4", label: "A4" },
                    { id: "a5", label: "A5" },
                  ] as { id: PosPrintFormat; label: string }[]).map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleSetPosPrintFormat(fmt.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        posPrintFormat === fmt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-surface text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => triggerPrintReceipt(lastReceiptData, posPrintFormat, completedInvoiceId || undefined)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>
                    Print ({posPrintFormat === "a4" ? "A4" : posPrintFormat === "a5" ? "A5" : posPrintFormat === "thermal58" ? "58mm" : "80mm"})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rawPhone = (lastReceiptData.customerPhone || customerPhone || "").replace(/\D/g, "");
                    if (rawPhone.length >= 10) {
                      const clean10 = rawPhone.slice(-10);
                      const normPhone = `91${clean10}`;
                      const msg = buildWhatsAppReceiptMessage(completedInvoiceId!, lastReceiptData.invoiceNumber, lastReceiptData, clean10);
                      window.open(`https://api.whatsapp.com/send?phone=${normPhone}&text=${encodeURIComponent(msg)}`, "_blank");
                    } else {
                      setWhatsAppModalPhone("");
                      setIsWhatsAppPromptOpen(true);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    WhatsApp {lastReceiptData.customerPhone ? `(${lastReceiptData.customerPhone.slice(-10)})` : ""}
                  </span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href={`/app/sales/invoices/${completedInvoiceId}`}
                  className="flex-1 py-2 rounded-xl bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold text-center transition-colors"
                >
                  View Full Invoice
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedInvoiceId(null);
                    searchInputRef.current?.focus();
                  }}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors"
                >
                  Next Bill [Enter]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ENTER WHATSAPP NUMBER FOR POS INVOICE ─── */}
      {isWhatsAppPromptOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Send WhatsApp Invoice</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total: ₹{completedInvoiceId && lastReceiptData ? Number(lastReceiptData.netTotal || 0).toFixed(2) : netTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppPromptOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const digits = whatsAppModalPhone.replace(/\D/g, "");
                if (digits.length < 10) return;
                setIsWhatsAppPromptOpen(false);
                setCustomerPhone(digits.slice(-10));
                if (completedInvoiceId && lastReceiptData) {
                  // If completed already from modal 4
                  const clean10 = digits.slice(-10);
                  const normPhone = `91${clean10}`;
                  const msg = buildWhatsAppReceiptMessage(completedInvoiceId, lastReceiptData.invoiceNumber, lastReceiptData, clean10);
                  window.open(`https://api.whatsapp.com/send?phone=${normPhone}&text=${encodeURIComponent(msg)}`, "_blank");
                } else {
                  handleCompleteSale({ sendWhatsApp: true, whatsAppPhone: digits.slice(-10) });
                }
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer WhatsApp / Mobile Number *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400 font-mono">+91</span>
                  <input
                    type="tel"
                    autoFocus
                    maxLength={10}
                    placeholder="9876543210"
                    value={whatsAppModalPhone}
                    onChange={(e) => setWhatsAppModalPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full pl-12 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Bill summary and digital PDF bill link will be sent to this WhatsApp number.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppPromptOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={whatsAppModalPhone.replace(/\D/g, "").length < 10 || submitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Send WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LIVE CAMERA BARCODE SCANNER MODAL ─── */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          searchInputRef.current?.focus();
        }}
        onScan={processBarcodeCode}
      />

      {/* ─── PHARMA CHEMICAL SALT SUBSTITUTE FINDER MODAL (F8) ─── */}
      <PharmaSaltSubstituteModal
        isOpen={isSaltSubstituteOpen}
        onClose={() => setIsSaltSubstituteOpen(false)}
        currentItem={saltSubstituteActiveItem}
        onSelectSubstitute={handleSelectSaltSubstitute}
      />

      {/* ─── MATTRESS & HOME FURNISHING 3D DIMENSION GRID MODAL (F8) ─── */}
      <MattressDimensionGridModal
        isOpen={isMattressGridOpen}
        onClose={() => setIsMattressGridOpen(false)}
        onSelect={handleMattressMatrixSelect}
        items={items}
        activeItem={mattressGridItem}
      />
    </div>
  );
}

function WarehouseDetailsIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
