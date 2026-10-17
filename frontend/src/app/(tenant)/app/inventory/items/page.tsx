"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Tag,
  AlertTriangle,
  Sparkles,
  Barcode,
  Layers,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Sliders,
  DollarSign,
  Wrench,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Receipt,
  Eye,
  Shirt,
  Cake,
  IndianRupee,
  Pencil,
  Zap,
  Loader2,
  Camera,
  Settings2,
} from "lucide-react";
import CameraBarcodeScannerModal from "@/components/pos/camera-scanner-modal";
import {
  inventoryService,
  CreateItemInput,
  ItemVariant,
  ItemVariantUpdateInput,
  BarcodeLookupResult,
} from "@/services/inventory-services";
import { downloadMasterMigrationTemplate } from "@/lib/master-migration-template";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import { useAddons } from "@/context/addon-context";
import { getIndustryConfig, resolveIndustry } from "@/lib/industry-config";
import {
  ItemList,
  Category,
  Brand,
  UnitOfMeasure,
  TenantDetails,
  StockMovement,
  WarehouseStock
} from "@/types";
import { Badge, Button, EmptyState, TableSkeleton } from "@/components/ui";

const DEFAULT_GARMENT_SIZES = [
  "6", "7", "8", "9", "10", "11", "12",
  "36", "38", "39", "40", "41", "42", "43", "44", "45", "46",
  "S", "M", "L", "XL", "XXL", "3XL",
  "28", "30", "32", "34"
];
const DEFAULT_HARDWARE_PURE_SIZES = [
  "1/2 inch", "3/4 inch", "1 inch", "1.5 inch", "2 inch", "2.5 inch", "3 inch", "4 inch",
  "25mm", "50mm", "75mm", "100mm",
  "14 Gauge", "16 Gauge", "18 Gauge"
];
const DEFAULT_PAINT_PACKS = ["500 ml", "1 L", "4 L", "10 L", "20 L", "1 Kg", "5 Kg", "20 Kg"];
const DEFAULT_HARDWARE_PACKS = [...DEFAULT_HARDWARE_PURE_SIZES, ...DEFAULT_PAINT_PACKS];
const DEFAULT_FMCG_PACKS = ["250 g", "500 g", "1 Kg", "2 Kg", "3 Kg", "5 Kg", "10 Kg", "25 Kg", "100 g", "500 ml", "1 L", "2 L", "5 L"];

interface GarmentColorOption {
  name: string;
  hex: string;
  border?: boolean;
  isCustom?: boolean;
}

const DEFAULT_HARDWARE_PURE_FINISHES: GarmentColorOption[] = [
  { name: "SS-304", hex: "#94a3b8" },
  { name: "SS-202", hex: "#cbd5e1" },
  { name: "CP (Chrome Plated)", hex: "#e2e8f0", border: true },
  { name: "Brass / Antique", hex: "#d97706" },
  { name: "Matt Black", hex: "#18181b" },
  { name: "Zinc Plated / GI", hex: "#64748b" },
  { name: "MS (Mild Steel)", hex: "#334155" },
  { name: "PVC / UPVC", hex: "#38bdf8" },
];

const DEFAULT_PAINT_SHADES: GarmentColorOption[] = [
  { name: "White", hex: "#ffffff", border: true },
  { name: "Off White", hex: "#fef3c7", border: true },
  { name: "Grey", hex: "#94a3b8" },
  { name: "Ivory", hex: "#fef08a", border: true },
  { name: "Base 1", hex: "#f8fafc", border: true },
  { name: "Base 2", hex: "#f1f5f9", border: true },
  { name: "Base 3", hex: "#e2e8f0" },
  { name: "Golden Yellow", hex: "#eab308" },
];

const DEFAULT_FMCG_VARIETIES: GarmentColorOption[] = [
  { name: "Regular / Standard", hex: "#f97316" },
  { name: "Vanilla", hex: "#fef3c7", border: true },
  { name: "Chocolate", hex: "#78350f" },
  { name: "Butterscotch", hex: "#d97706" },
  { name: "Black Forest", hex: "#1f2937" },
  { name: "Red Velvet", hex: "#b91c1c" },
  { name: "Pineapple", hex: "#eab308" },
  { name: "Multigrain", hex: "#ca8a04" },
  { name: "Diet / Sugar Free", hex: "#16a34a" },
  { name: "Premium / Sharbati", hex: "#881337" },
];

const DEFAULT_SWEETS_BAKERY_PACKS = ["100 g", "250 g", "500 g", "1 Kg", "2 Kg", "3 Kg", "5 Kg", "10 Kg", "1 Piece", "1 Box", "1 Pack"];

const DEFAULT_SWEETS_BAKERY_VARIETIES: GarmentColorOption[] = [
  { name: "Regular / Standard", hex: "#f97316" },
  { name: "Vanilla", hex: "#fef3c7", border: true },
  { name: "Chocolate / Truffle", hex: "#78350f" },
  { name: "Butterscotch", hex: "#d97706" },
  { name: "Black Forest", hex: "#1f2937" },
  { name: "Red Velvet", hex: "#b91c1c" },
  { name: "Pineapple", hex: "#eab308" },
  { name: "Strawberry", hex: "#ec4899" },
  { name: "Desi Ghee", hex: "#ca8a04" },
  { name: "Kesar Pista", hex: "#16a34a" },
  { name: "Sugar Free", hex: "#06b6d4" },
  { name: "Dry Fruit / Mawa", hex: "#881337" },
];

const DEFAULT_GARMENT_COLORS: GarmentColorOption[] = [
  { name: "Black", hex: "#111827" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "White", hex: "#ffffff", border: true },
  { name: "Wine / Maroon", hex: "#881337" },
  { name: "Olive Green", hex: "#4d7c0f" },
  { name: "Charcoal Gray", hex: "#4b5563" },
  { name: "Beige / Cream", hex: "#fef3c7", border: true },
  { name: "Royal Blue", hex: "#2563eb" },
];

const COLOR_HEX_MAP: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  blue: "#2563eb",
  "navy blue": "#1e3a8a",
  navy: "#1e3a8a",
  red: "#ef4444",
  maroon: "#881337",
  green: "#16a34a",
  "olive green": "#4d7c0f",
  olive: "#4d7c0f",
  yellow: "#eab308",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#9333ea",
  violet: "#8b5cf6",
  lavender: "#c084fc",
  teal: "#0d9488",
  cyan: "#06b6d4",
  gray: "#4b5563",
  grey: "#4b5563",
  charcoal: "#374151",
  brown: "#78350f",
  beige: "#fef3c7",
  cream: "#fef3c7",
  gold: "#d97706",
  silver: "#94a3b8",
  peach: "#fed7aa",
  rust: "#c2410c",
  mustard: "#ca8a04",
  magenta: "#c026d3",
  coral: "#f43f5e",
  burgundy: "#800020",
  khaki: "#c3b091",
  mint: "#6ee7b7",
  turquoise: "#14b8a6",
  sky: "#38bdf8",
  indigo: "#4f46e5",
};

const getCustomColorHex = (name: string): string => {
  const clean = name.trim().toLowerCase();
  if (COLOR_HEX_MAP[clean]) return COLOR_HEX_MAP[clean];
  const customPalette = ["#f97316", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#eab308", "#6366f1", "#14b8a6", "#f43f5e", "#0284c7"];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return customPalette[Math.abs(hash) % customPalette.length];
};

const getBaseSizes = (code: string, hardwareSubType?: string) => {
  switch (code) {
    case "HARDWARE":
      if (hardwareSubType === "HARDWARE") return DEFAULT_HARDWARE_PURE_SIZES;
      if (hardwareSubType === "PAINTS") return DEFAULT_PAINT_PACKS;
      return DEFAULT_HARDWARE_PACKS;
    case "FMCG": return DEFAULT_FMCG_PACKS;
    case "SWEETS_BAKERY": return DEFAULT_SWEETS_BAKERY_PACKS;
    default: return DEFAULT_GARMENT_SIZES;
  }
};

const getBaseColors = (code: string, hardwareSubType?: string) => {
  switch (code) {
    case "HARDWARE":
      if (hardwareSubType === "HARDWARE") return DEFAULT_HARDWARE_PURE_FINISHES;
      if (hardwareSubType === "PAINTS") return DEFAULT_PAINT_SHADES;
      return [...DEFAULT_HARDWARE_PURE_FINISHES, ...DEFAULT_PAINT_SHADES];
    case "FMCG": return DEFAULT_FMCG_VARIETIES;
    case "SWEETS_BAKERY": return DEFAULT_SWEETS_BAKERY_VARIETIES;
    default: return DEFAULT_GARMENT_COLORS;
  }
};

const getStoredCustomSizes = (code: string, subType?: string): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const key = subType ? `udyogbill_custom_sizes_${code}_${subType}` : `udyogbill_custom_sizes_${code}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveStoredCustomSizes = (code: string, sizes: string[], subType?: string) => {
  if (typeof window === "undefined") return;
  try {
    const key = subType ? `udyogbill_custom_sizes_${code}_${subType}` : `udyogbill_custom_sizes_${code}`;
    localStorage.setItem(key, JSON.stringify(sizes));
  } catch {}
};

const getStoredCustomColors = (code: string, subType?: string): GarmentColorOption[] => {
  if (typeof window === "undefined") return [];
  try {
    const key = subType ? `udyogbill_custom_colors_${code}_${subType}` : `udyogbill_custom_colors_${code}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveStoredCustomColors = (code: string, colors: GarmentColorOption[], subType?: string) => {
  if (typeof window === "undefined") return;
  try {
    const key = subType ? `udyogbill_custom_colors_${code}_${subType}` : `udyogbill_custom_colors_${code}`;
    localStorage.setItem(key, JSON.stringify(colors));
  } catch {}
};

const loadIndustrySizes = (code: string, subType?: string) => {
  const base = getBaseSizes(code, subType);
  const custom = getStoredCustomSizes(code, subType);
  const combined = [...base];
  custom.forEach((sz) => {
    if (!combined.includes(sz)) combined.push(sz);
  });
  return combined;
};

const loadIndustryColors = (code: string, subType?: string) => {
  const base = getBaseColors(code, subType);
  const custom = getStoredCustomColors(code, subType);
  const combined = [...base];
  custom.forEach((clr) => {
    if (!combined.some((c) => c.name.toLowerCase() === clr.name.toLowerCase())) {
      combined.push(clr);
    }
  });
  return combined;
};

const loadStoredCustomAutoSpecs = (): Record<string, string[]> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("udyogbill_custom_autoparts_specs");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const saveStoredCustomAutoSpecs = (specs: Record<string, string[]>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("udyogbill_custom_autoparts_specs", JSON.stringify(specs));
  } catch {}
};

const loadStoredCustomAutoBrands = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("udyogbill_custom_autoparts_brands");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveStoredCustomAutoBrands = (brands: string[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("udyogbill_custom_autoparts_brands", JSON.stringify(brands));
  } catch {}
};

const DEFAULT_STANDARD_UNITS: UnitOfMeasure[] = [
  { id: "82eaa2fd-67a9-4a65-af72-8a8216e7afb9", tenantId: "", code: "PCS", name: "Pieces / Unit", symbol: "pcs", decimalPlaces: 0, isActive: true },
  { id: "2218ed31-37b7-494a-b3d2-70470cdbfc7f", tenantId: "", code: "KG", name: "Kilogram", symbol: "kg", decimalPlaces: 3, isActive: true },
  { id: "35e957d5-4e8b-41d3-a499-e4e1e6431069", tenantId: "", code: "GM", name: "Gram", symbol: "g", decimalPlaces: 3, isActive: true },
  { id: "7ba5ba29-4a80-4195-ada4-b578cd19856e", tenantId: "", code: "BOX", name: "Box", symbol: "box", decimalPlaces: 0, isActive: true },
  { id: "8b845536-bece-4a62-bdcd-0a8677ac4707", tenantId: "", code: "PKT", name: "Packet", symbol: "pkt", decimalPlaces: 0, isActive: true },
  { id: "3323afb6-fe63-42be-ba42-3dc34ffdcf26", tenantId: "", code: "DZN", name: "Dozen", symbol: "dzn", decimalPlaces: 0, isActive: true },
  { id: "376e6e2d-1272-408a-823a-0dcd18b8a396", tenantId: "", code: "JAR", name: "Jar", symbol: "jar", decimalPlaces: 0, isActive: true },
  { id: "2d52a2ec-e574-49d5-989f-9e165d02b9ac", tenantId: "", code: "SET", name: "Set / Hamper", symbol: "set", decimalPlaces: 0, isActive: true },
  { id: "43c55d5f-ec11-4b5f-9344-70531c27702c", tenantId: "", code: "LTR", name: "Liter", symbol: "L", decimalPlaces: 2, isActive: true },
  { id: "2048365c-982b-4bd1-9479-1b913ae152b2", tenantId: "", code: "BAG", name: "Bag", symbol: "bag", decimalPlaces: 0, isActive: true },
];

const getVariantTermLabels = (industryCode: string, isFootwear: boolean) => {
  const code = (industryCode || "").toUpperCase();
  if (code === "HARDWARE") {
    return {
      title: "Pack Size / Weight / Volume",
      primaryLabel: "Pack Size / Volume",
      primaryPlaceholder: "e.g. 500 gm, 1 Kg, 4 Kg, 10 Kg, 20 L...",
      secondaryLabel: "Shade / Finish / Grade",
      secondaryPlaceholder: "e.g. White, Brilliant White, Matt, Gloss...",
      addBtnLabel: "+ Add Variant / Pack Size",
      badgeText: "Hardware & Paints Pack",
      primarySuggestions: ["500 gm", "1 Kg", "2 Kg", "4 Kg", "5 Kg", "10 Kg", "20 Kg", "200 ml", "500 ml", "1 L", "4 L", "10 L", "20 L"],
      secondarySuggestions: ["Regular", "Standard", "White", "Brilliant White", "Off White", "Ivory", "Matt Black", "Glossy"],
    };
  } else if (code === "FMCG" || code === "SWEETS_BAKERY") {
    return {
      title: "Packaging / Weight Variant",
      primaryLabel: "Weight / Packaging Size",
      primaryPlaceholder: "e.g. 100g, 250g, 500g, 1kg, Family Pack...",
      secondaryLabel: "Flavour / Type / Variant",
      secondaryPlaceholder: "e.g. Regular, Masala, Classic, Sugar Free...",
      addBtnLabel: "+ Add Pack / Weight Variant",
      badgeText: "FMCG Pack Variant",
      primarySuggestions: ["50 gm", "100 gm", "200 gm", "250 gm", "500 gm", "1 Kg", "2 Kg", "5 Kg", "10 Kg", "Family Pack", "Carton"],
      secondarySuggestions: ["Regular", "Classic", "Original", "Masala", "Salted", "Spicy", "Sugar Free"],
    };
  } else if (code === "GARMENTS") {
    if (isFootwear) {
      return {
        title: "Footwear Size & Color Variant",
        primaryLabel: "Shoe Size (UK / IND)",
        primaryPlaceholder: "e.g. 6, 7, 8, 9, 10, 11...",
        secondaryLabel: "Color / Finish",
        secondaryPlaceholder: "e.g. Black, Brown, Tan, White...",
        addBtnLabel: "+ Add Shoe Size / Color",
        badgeText: "Footwear Variant",
        primarySuggestions: ["5", "6", "7", "8", "9", "10", "11", "12"],
        secondarySuggestions: ["Black", "Brown", "Tan", "White", "Navy Blue", "Grey"],
      };
    }
    return {
      title: "Apparel Size & Color Variant",
      primaryLabel: "Garment Size",
      primaryPlaceholder: "e.g. S, M, L, XL, 2XL, 32, 34, 36...",
      secondaryLabel: "Color / Shade",
      secondaryPlaceholder: "e.g. Black, White, Navy Blue, Red...",
      addBtnLabel: "+ Add Size & Color Variant",
      badgeText: "Apparel Variant",
      primarySuggestions: ["S", "M", "L", "XL", "2XL", "3XL", "28", "30", "32", "34", "36", "38", "40"],
      secondarySuggestions: ["Black", "White", "Navy Blue", "Royal Blue", "Red", "Grey", "Beige", "Olive Green"],
    };
  } else if (code === "ELECTRONICS") {
    return {
      title: "Spec & Color / Model Variant",
      primaryLabel: "Storage / Specification / Capacity",
      primaryPlaceholder: "e.g. 128GB, 256GB, 8GB+128GB, 1.5 Ton...",
      secondaryLabel: "Color / Finish / Model",
      secondaryPlaceholder: "e.g. Space Black, Titanium, Silver, Blue...",
      addBtnLabel: "+ Add Spec / Color Variant",
      badgeText: "Electronics Variant",
      primarySuggestions: ["4GB+64GB", "6GB+128GB", "8GB+128GB", "8GB+256GB", "12GB+256GB", "12GB+512GB", "1.0 Ton", "1.5 Ton", "2.0 Ton"],
      secondarySuggestions: ["Space Black", "Titanium", "Silver", "Midnight Blue", "White", "Gold"],
    };
  }
  return {
    title: "Product Variant",
    primaryLabel: "Variant / Size",
    primaryPlaceholder: "e.g. Standard, Large, 1 Kg...",
    secondaryLabel: "Option / Color",
    secondaryPlaceholder: "e.g. Regular, Blue, Type A...",
    addBtnLabel: "+ Add Variant",
    badgeText: "Product Variant",
    primarySuggestions: ["Small", "Medium", "Large", "Standard", "1 Kg", "500 gm"],
    secondarySuggestions: ["Regular", "Standard", "Default"],
  };
};

export default function TenantItemsCatalogPage() {
  const [items, setItems] = useState<ItemList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>(DEFAULT_STANDARD_UNITS);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  const { isAddonActive, isFeatureActive, activePack, industryCode: contextIndustryCode, apparelSubType, hardwareSubType } = useAddons();
  const activeIndustryCode = useMemo(() => {
    // 1. If context has a valid industry that is not OTHER / GENERAL
    if (contextIndustryCode && contextIndustryCode !== "OTHER" && contextIndustryCode !== "GENERAL") {
      return contextIndustryCode;
    }
    // 2. If activePack has a module or industryTypeCode that is not OTHER
    if (activePack?.activeIndustryModule && activePack.activeIndustryModule !== "OTHER" && activePack.activeIndustryModule !== "GENERAL") {
      return activePack.activeIndustryModule;
    }
    if (activePack?.industryTypeCode && activePack.industryTypeCode !== "OTHER" && activePack.industryTypeCode !== "GENERAL") {
      return activePack.industryTypeCode;
    }
    // 3. Profile industry
    if (profile?.industryCode && profile.industryCode !== "OTHER" && profile.industryCode !== "GENERAL") {
      return profile.industryCode;
    }
    if (profile?.businessName) {
      const detectedFromBiz = resolveIndustry(profile.businessName);
      if (detectedFromBiz && detectedFromBiz !== "GENERAL") return detectedFromBiz;
    }
    // 4. Check impersonation storage in localStorage
    if (typeof window !== "undefined") {
      try {
        const impStr = localStorage.getItem("udyogbill_impersonating");
        if (impStr) {
          const imp = JSON.parse(impStr);
          if (imp.industryCode && imp.industryCode !== "OTHER" && imp.industryCode !== "GENERAL") {
            return imp.industryCode;
          }
          if (imp.industryTypeCode && imp.industryTypeCode !== "OTHER" && imp.industryTypeCode !== "GENERAL") {
            return imp.industryTypeCode;
          }
          const detectedFromStore = resolveIndustry(imp.storeName || imp.tenantName || imp.tradeName);
          if (detectedFromStore && detectedFromStore !== "GENERAL") return detectedFromStore;
        }
        const userStr = localStorage.getItem("udyogbill_user");
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.industryCode && u.industryCode !== "OTHER" && u.industryCode !== "GENERAL") {
            return u.industryCode;
          }
          const detectedFromUser = resolveIndustry(u.businessName);
          if (detectedFromUser && detectedFromUser !== "GENERAL") return detectedFromUser;
        }
      } catch {}
    }
    return (contextIndustryCode && contextIndustryCode !== "OTHER") ? contextIndustryCode : "GENERAL";
  }, [contextIndustryCode, activePack, profile]);
  const industryConfig = getIndustryConfig(activeIndustryCode);
  const isJewellery = activeIndustryCode.toUpperCase() === "JEWELLERY" || isAddonActive("jewellery");
  const isGarments = activeIndustryCode.toUpperCase() === "GARMENTS" || isAddonActive("garments");
  const isFootwearStore = isGarments && apparelSubType === "SHOES";
  const isClothingStore = isGarments && apparelSubType === "GARMENTS";
  const isBothApparelStore = isGarments && (!apparelSubType || apparelSubType === "BOTH");

  const isHardware = activeIndustryCode.toUpperCase() === "HARDWARE" || isAddonActive("hardware");
  const isPureHardwareStore = isHardware && hardwareSubType === "HARDWARE";
  const isPurePaintStore = isHardware && hardwareSubType === "PAINTS";
  const isBothHardwareStore = isHardware && (!hardwareSubType || hardwareSubType === "BOTH");

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "product" | "service">("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ItemList | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Bulk Delete State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Edit Product / Variant Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemList | null>(null);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    sku: string;
    barcode: string;
    itemType: number;
    trackInventory: boolean;
    categoryId: string;
    brandId: string;
    primaryUomId: string;
    secondaryUomId: string;
    conversionRatio: number | "";
    hsnCode: string;
    taxRate: number;
    cessRate: number | "";
    isTaxInclusive: boolean;
    purchasePrice: number | "";
    sellingPrice: number | "";
    minimumSellingPrice: number | "";
    mrp: number | "";
    minimumStockAlert: number | "";
    maximumStockAlert: number | "";
    reorderQuantity: number | "";
    rackLocation: string;
    trackBatches: boolean;
    trackSerialNumbers: boolean;
    trackVariants: boolean;
    shortDescription: string;
    isActive: boolean;
  }>({
    name: "",
    sku: "",
    barcode: "",
    itemType: 1,
    trackInventory: true,
    categoryId: "",
    brandId: "",
    primaryUomId: DEFAULT_STANDARD_UNITS[0].id,
    secondaryUomId: "",
    conversionRatio: "",
    hsnCode: "",
    taxRate: 18,
    cessRate: "",
    isTaxInclusive: false,
    purchasePrice: 0,
    sellingPrice: 0,
    minimumSellingPrice: 0,
    mrp: 0,
    minimumStockAlert: 5,
    maximumStockAlert: "",
    reorderQuantity: "",
    rackLocation: "",
    trackBatches: false,
    trackSerialNumbers: false,
    trackVariants: false,
    shortDescription: "",
    isActive: true,
  });

  const [editVariants, setEditVariants] = useState<ItemVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [isAddVariantDrawerOpen, setIsAddVariantDrawerOpen] = useState(false);
  const [newVariantDraft, setNewVariantDraft] = useState<{
    size: string;
    color: string;
    variantName: string;
    sku: string;
    barcode: string;
    purchasePrice: number | "";
    wholesalePrice: number | "";
    sellingPrice: number | "";
    mrp: number | "";
    openingStock: number | "";
  }>({
    size: "",
    color: "Regular",
    variantName: "",
    sku: "",
    barcode: "",
    purchasePrice: "",
    wholesalePrice: "",
    sellingPrice: "",
    mrp: "",
    openingStock: 0,
  });

  const variantTerms = useMemo(() => {
    return getVariantTermLabels(industryConfig.code, isFootwearStore);
  }, [industryConfig.code, isFootwearStore]);

  // Bulk Edit Modal State
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState<{
    trackInventory: "NO_CHANGE" | "ENABLE" | "DISABLE";
    taxRate: "NO_CHANGE" | number;
    isTaxInclusive: "NO_CHANGE" | "INCLUSIVE" | "EXCLUSIVE";
    categoryId: "NO_CHANGE" | "CLEAR" | string;
    brandId: "NO_CHANGE" | "CLEAR" | string;
    primaryUomId: "NO_CHANGE" | string;
    hsnCode: "NO_CHANGE" | string;
    minimumStockAlert: "NO_CHANGE" | number;
    trackBatches: "NO_CHANGE" | "ENABLE" | "DISABLE";
    trackSerialNumbers: "NO_CHANGE" | "ENABLE" | "DISABLE";
    isActive: "NO_CHANGE" | "ACTIVE" | "INACTIVE";
  }>({
    trackInventory: "NO_CHANGE",
    taxRate: "NO_CHANGE",
    isTaxInclusive: "NO_CHANGE",
    categoryId: "NO_CHANGE",
    brandId: "NO_CHANGE",
    primaryUomId: "NO_CHANGE",
    hsnCode: "NO_CHANGE",
    minimumStockAlert: "NO_CHANGE",
    trackBatches: "NO_CHANGE",
    trackSerialNumbers: "NO_CHANGE",
    isActive: "NO_CHANGE",
  });

  // Quick Pack Rate Applicator for Edit Modal
  const [editQuickPackSelect, setEditQuickPackSelect] = useState("");
  const [editQuickPurchase, setEditQuickPurchase] = useState<number | "">("");
  const [editQuickWholesale, setEditQuickWholesale] = useState<number | "">("");
  const [editQuickRetail, setEditQuickRetail] = useState<number | "">("");
  const [editQuickMrp, setEditQuickMrp] = useState<number | "">("");

  // Add Product / Service Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick Barcode Scan-to-Add State
  const [quickBarcodeQuery, setQuickBarcodeQuery] = useState("");
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  // Variant-Level Camera Barcode Scan State
  const [variantCameraTargetIdx, setVariantCameraTargetIdx] = useState<number | null>(null);
  const [isVariantContinuousScan, setIsVariantContinuousScan] = useState<boolean>(false);
  const [barcodeLookupNotice, setBarcodeLookupNotice] = useState<{
    type: "success" | "warning" | "info" | "error";
    message: string;
    details?: string;
    storeItem?: ItemList;
  } | null>(null);
  const [form, setForm] = useState<CreateItemInput & { rackLocation?: string }>({
    sku: "",
    name: "",
    shortDescription: "",
    barcode: "",
    itemType: 1,
    trackInventory: true,
    categoryId: "",
    brandId: "",
    primaryUomId: DEFAULT_STANDARD_UNITS[0].id,
    hsnCode: "",
    taxRate: 18,
    isTaxInclusive: false,
    purchasePrice: 0,
    sellingPrice: 0,
    minimumSellingPrice: 0,
    mrp: 0,
    minimumStockAlert: 5,
    rackLocation: "",
    trackBatches: false,
    trackSerialNumbers: false,
    attributesJson: "{}",
    initialStock: 0,
    initialWarehouseId: "",
    initialBatchNumber: "",
    initialBatchExpiryDate: "",
  });

  const generateAutoSku = (name?: string) => {
    const cleanName = (name || form.name || "PRD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const prefix = cleanName.length >= 3 ? cleanName.substring(0, 3) : (cleanName.length > 0 ? cleanName : "PRD");
    const randomNum = Math.floor(100 + Math.random() * 900);
    const dateStr = new Date().toISOString().slice(2, 4) + String(new Date().getMonth() + 1).padStart(2, "0");
    return `${prefix}-${dateStr}-${randomNum}`;
  };

  // Industry-specific attribute state
  const [pharmaSchedule, setPharmaSchedule] = useState("None");
  const [pharmaSalt, setPharmaSalt] = useState("");
  const [apparelSize, setApparelSize] = useState("");
  const [apparelColor, setApparelColor] = useState("");
  const [fmcgNetWeight, setFmcgNetWeight] = useState("");
  const [elecBrand, setElecBrand] = useState("");
  const [elecModel, setElecModel] = useState("");
  const [elecWarranty, setElecWarranty] = useState("");
  const [elecTrackingMode, setElecTrackingMode] = useState("DUAL_IMEI");
  const [hardwareDimension, setHardwareDimension] = useState("");
  const [hardwareGrade, setHardwareGrade] = useState("");

  // Jewellery Specific State
  const [jewelleryPurity, setJewelleryPurity] = useState("22K (916)");
  const [jewelleryGrossWeight, setJewelleryGrossWeight] = useState<number | "">("");
  const [jewelleryStoneWeight, setJewelleryStoneWeight] = useState<number | "">("");
  const [jewelleryNetWeight, setJewelleryNetWeight] = useState<number | "">("");
  const [jewelleryMakingRate, setJewelleryMakingRate] = useState<number | "">("");
  const [jewelleryMakingType, setJewelleryMakingType] = useState<"per_gram" | "percentage" | "flat">("per_gram");
  const [jewelleryHuid, setJewelleryHuid] = useState("");

  // Automobile Spare Parts & Spares State
  const [autoOemPartNo, setAutoOemPartNo] = useState("");
  const [autoVehicleFitment, setAutoVehicleFitment] = useState("");
  const [autoFittingPosition, setAutoFittingPosition] = useState("Universal");
  const [autoOesBrand, setAutoOesBrand] = useState("");
  const [autoOesPartNo, setAutoOesPartNo] = useState("");
  const [autoMechanicRate, setAutoMechanicRate] = useState<number | "">("");
  const [autoBatteryExchangeEligible, setAutoBatteryExchangeEligible] = useState(false);

  // Auto Parts Multi-Number & Multi-Company Matrix Definitions
  const [isAutoPartsMatrixEnabled, setIsAutoPartsMatrixEnabled] = useState(false);
  const [autoPartsSpecType, setAutoPartsSpecType] = useState<"GEAR_RATIO" | "BEARING_NO" | "BORE_SIZE" | "GEAR_POSITION" | "CUSTOM">("GEAR_RATIO");
  const [autoPartsMatrixRows, setAutoPartsMatrixRows] = useState<{
    id: string;
    brand: string;
    specNumber: string;
    partNumber?: string;
    quantity: number | "";
    purchasePrice: number | "";
    sellingPrice: number | "";
    mrp: number | "";
    mechanicRate?: number | "";
    rackLocation?: string;
  }[]>([]);
  const [editAutoPartsMatrixRows, setEditAutoPartsMatrixRows] = useState<{
    id: string;
    brand: string;
    specNumber: string;
    partNumber?: string;
    quantity: number | "";
    purchasePrice: number | "";
    sellingPrice: number | "";
    mrp: number | "";
    mechanicRate?: number | "";
    rackLocation?: string;
  }[]>([]);
  const [isEditAutoPartsMatrixActive, setIsEditAutoPartsMatrixActive] = useState(false);
  const [customAutoSpecs, setCustomAutoSpecs] = useState<Record<string, string[]>>(() => loadStoredCustomAutoSpecs());
  const [customAutoBrands, setCustomAutoBrands] = useState<string[]>(() => loadStoredCustomAutoBrands());
  const [isAddingCustomSpec, setIsAddingCustomSpec] = useState(false);
  const [customSpecInput, setCustomSpecInput] = useState("");
  const [isAddingCustomBrand, setIsAddingCustomBrand] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState("");

  const handleAddCustomSpecNumber = (specVal?: string) => {
    const val = (specVal || customSpecInput).trim();
    if (!val) return;
    setCustomAutoSpecs((prev) => {
      const currentList = prev[autoPartsSpecType] || [];
      if (!currentList.includes(val)) {
        const updated = { ...prev, [autoPartsSpecType]: [...currentList, val] };
        saveStoredCustomAutoSpecs(updated);
        return updated;
      }
      return prev;
    });
    handleAddAutoPartsMatrixRow(val);
    setCustomSpecInput("");
    setIsAddingCustomSpec(false);
  };

  const handleRemoveCustomSpecNumber = (specVal: string) => {
    setCustomAutoSpecs((prev) => {
      const currentList = prev[autoPartsSpecType] || [];
      const updated = { ...prev, [autoPartsSpecType]: currentList.filter((s) => s !== specVal) };
      saveStoredCustomAutoSpecs(updated);
      return updated;
    });
  };

  const handleAddCustomBrandName = (brandVal?: string) => {
    const val = (brandVal || customBrandInput).trim();
    if (!val) return;
    setCustomAutoBrands((prev) => {
      if (!prev.includes(val)) {
        const updated = [...prev, val];
        saveStoredCustomAutoBrands(updated);
        return updated;
      }
      return prev;
    });
    handleAddAutoPartsMatrixRow(undefined, val);
    setCustomBrandInput("");
    setIsAddingCustomBrand(false);
  };

  const handleRemoveCustomBrandName = (brandVal: string) => {
    setCustomAutoBrands((prev) => {
      const updated = prev.filter((b) => b !== brandVal);
      saveStoredCustomAutoBrands(updated);
      return updated;
    });
  };

  const handleAddAutoPartsMatrixRow = (presetNumber?: string, presetBrand?: string) => {
    const newId = `ap-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setAutoPartsMatrixRows((prev) => [
      ...prev,
      {
        id: newId,
        brand: presetBrand || (autoOesBrand ? autoOesBrand.trim() : (prev[prev.length - 1]?.brand || "Maruti Genuine (MGP)")),
        specNumber: presetNumber || (prev[prev.length - 1]?.specNumber ? "" : "37/7"),
        partNumber: autoOesPartNo || autoOemPartNo || "",
        quantity: "",
        purchasePrice: form.purchasePrice || "",
        sellingPrice: form.sellingPrice || "",
        mrp: form.mrp || "",
        mechanicRate: autoMechanicRate || "",
        rackLocation: form.rackLocation || "",
      },
    ]);
  };

  const handleRemoveAutoPartsMatrixRow = (id: string) => {
    setAutoPartsMatrixRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateAutoPartsMatrixRow = (
    id: string,
    field: string,
    value: any
  ) => {
    setAutoPartsMatrixRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddEditAutoPartsMatrixRow = (presetNumber?: string, presetBrand?: string) => {
    const newId = `ap-edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setEditAutoPartsMatrixRows((prev) => [
      ...prev,
      {
        id: newId,
        brand: presetBrand || (prev[prev.length - 1]?.brand || "Maruti Genuine (MGP)"),
        specNumber: presetNumber || (prev[prev.length - 1]?.specNumber ? "" : "37/7"),
        partNumber: "",
        quantity: 0,
        purchasePrice: editForm.purchasePrice || "",
        sellingPrice: editForm.sellingPrice || "",
        mrp: editForm.mrp || "",
        mechanicRate: "",
        rackLocation: editForm.rackLocation || "",
      },
    ]);
  };

  const handleRemoveEditAutoPartsMatrixRow = (id: string) => {
    setEditAutoPartsMatrixRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateEditAutoPartsMatrixRow = (
    id: string,
    field: string,
    value: any
  ) => {
    setEditAutoPartsMatrixRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Garments, Hardware Paints, FMCG & Sweets/Bakery 2D Size/Pack x Color/Shade/Variety/Flavor Matrix State
  const [isMatrixEnabled, setIsMatrixEnabled] = useState(industryConfig.code !== "FMCG");
  const isHardwareMatrix = industryConfig.code === "HARDWARE" && isMatrixEnabled;
  const isFmcgMatrix = industryConfig.code === "FMCG" && isMatrixEnabled;
  const isSweetsBakeryMatrix = industryConfig.code === "SWEETS_BAKERY" && isMatrixEnabled;
  const [availableSizes, setAvailableSizes] = useState<string[]>(() =>
    loadIndustrySizes(industryConfig.code, hardwareSubType)
  );
  const [availableColors, setAvailableColors] = useState<GarmentColorOption[]>(() =>
    loadIndustryColors(industryConfig.code, hardwareSubType)
  );
  const [matrixSizes, setMatrixSizes] = useState<string[]>([]);
  const [matrixColors, setMatrixColors] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [customColorInput, setCustomColorInput] = useState("");
  const [matrixBulkQty, setMatrixBulkQty] = useState<number | "">("");

  useEffect(() => {
    setAvailableSizes(loadIndustrySizes(industryConfig.code, hardwareSubType));
    setAvailableColors(loadIndustryColors(industryConfig.code, hardwareSubType));
    setIsMatrixEnabled(industryConfig.code !== "FMCG");
    setMatrixSizes([]);
    setMatrixColors([]);
  }, [industryConfig.code, hardwareSubType]);

  const handleAddCustomSize = () => {
    const clean = customSizeInput.trim();
    if (!clean) return;
    const formatted = (industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? clean : clean.toUpperCase();
    setAvailableSizes((prev) => {
      if (prev.includes(formatted)) return prev;
      const next = [...prev, formatted];
      const base = getBaseSizes(industryConfig.code, hardwareSubType);
      const customOnly = next.filter((sz) => !base.includes(sz));
      saveStoredCustomSizes(industryConfig.code, customOnly, hardwareSubType);
      return next;
    });
    if (!matrixSizes.includes(formatted)) {
      setMatrixSizes((prev) => [...prev, formatted]);
    }
    setCustomSizeInput("");
  };

  const handleRemoveCustomSize = (sz: string) => {
    setAvailableSizes((prev) => {
      const next = prev.filter((x) => x !== sz);
      const base = getBaseSizes(industryConfig.code, hardwareSubType);
      const customOnly = next.filter((s) => !base.includes(s));
      saveStoredCustomSizes(industryConfig.code, customOnly, hardwareSubType);
      return next;
    });
    setMatrixSizes((prev) => prev.filter((x) => x !== sz));
  };

  const handleAddCustomColor = () => {
    const clean = customColorInput.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    const hex = getCustomColorHex(clean);
    const isLight = hex.toLowerCase() === "#ffffff" || hex.toLowerCase() === "#fef3c7" || hex.toLowerCase() === "#fed7aa";

    setAvailableColors((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === lower)) return prev;
      const next = [...prev, { name: clean, hex, border: isLight, isCustom: true }];
      const base = getBaseColors(industryConfig.code, hardwareSubType);
      const customOnly = next.filter((c) => !base.some((b) => b.name.toLowerCase() === c.name.toLowerCase()));
      saveStoredCustomColors(industryConfig.code, customOnly, hardwareSubType);
      return next;
    });
    if (!matrixColors.some((c) => c.toLowerCase() === lower)) {
      setMatrixColors((prev) => [...prev, clean]);
    }
    setCustomColorInput("");
  };

  const handleRemoveCustomColor = (clrName: string) => {
    setAvailableColors((prev) => {
      const next = prev.filter((x) => x.name.toLowerCase() !== clrName.toLowerCase());
      const base = getBaseColors(industryConfig.code, hardwareSubType);
      const customOnly = next.filter((c) => !base.some((b) => b.name.toLowerCase() === c.name.toLowerCase()));
      saveStoredCustomColors(industryConfig.code, customOnly, hardwareSubType);
      return next;
    });
    setMatrixColors((prev) => prev.filter((x) => x.toLowerCase() !== clrName.toLowerCase()));
  };

  interface VariantMatrixRow {
    size: string;
    color: string;
    sku: string;
    barcode: string;
    quantity: number | "";
    rate?: number | "";
    purchasePrice?: number | "";
    wholesalePrice?: number | "";
    mrp?: number | "";
    priceAdjustment: number;
  }

  const [matrixRows, setMatrixRows] = useState<VariantMatrixRow[]>([]);
  const [matrixPackRates, setMatrixPackRates] = useState<Record<string, number | "">>({});

  interface HardwarePackRate {
    purchasePrice: number | "";
    wholesalePrice: number | "";
    retailPrice: number | "";
    mrp: number | "";
  }

  const [hardwarePackRates, setHardwarePackRates] = useState<Record<string, HardwarePackRate>>({});
  const [quickPackSelect, setQuickPackSelect] = useState<string>("");
  const [quickPackPurchase, setQuickPackPurchase] = useState<number | "">("");
  const [quickPackWholesale, setQuickPackWholesale] = useState<number | "">("");
  const [quickPackRetail, setQuickPackRetail] = useState<number | "">("");
  const [quickPackMrp, setQuickPackMrp] = useState<number | "">("");

  // Quick Variety / Flavor Rates for FMCG & Bakery
  const [quickVarietySelect, setQuickVarietySelect] = useState<string>("");
  const [quickVarietyPurchase, setQuickVarietyPurchase] = useState<number | "">("");
  const [quickVarietyWholesale, setQuickVarietyWholesale] = useState<number | "">("");
  const [quickVarietyRetail, setQuickVarietyRetail] = useState<number | "">("");
  const [quickVarietyMrp, setQuickVarietyMrp] = useState<number | "">("");

  useEffect(() => {
    if (industryConfig.code !== "GARMENTS" && industryConfig.code !== "HARDWARE" && industryConfig.code !== "FMCG" && industryConfig.code !== "SWEETS_BAKERY") return;
    const baseSku = form.sku?.trim() || "PRD";
    const baseRate = Number(form.sellingPrice || 0);

    const hasSizes = matrixSizes.length > 0;
    const hasColors = matrixColors.length > 0;
    if (!hasSizes && !hasColors) {
      setMatrixRows([]);
      return;
    }

    const effectiveSizes = hasSizes ? matrixSizes : ["Standard"];
    const effectiveColors = hasColors ? matrixColors : ["Regular / Standard"];

    setMatrixRows((prev) => {
      const rows: VariantMatrixRow[] = [];
      if (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") {
        effectiveColors.forEach((c) => {
          effectiveSizes.forEach((s) => {
            const colorPrefix = c.trim().substring(0, Math.min(3, c.trim().length)).toUpperCase();
            const cleanSize = s.trim().toUpperCase().replace(/\s+/g, "");
            const variantSku = `${baseSku}-${cleanSize}-${colorPrefix}`;
            const barcodeSeed = Math.abs(variantSku.split("").reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0) % 1000000000);
            const autoBarcode = `890${barcodeSeed.toString().padStart(9, "0")}`;

            const existing = prev.find((r) => r.size === s && r.color === c);
            const hwPack = hardwarePackRates[s];

            let rowRate: number | "" = "";
            if (existing?.rate !== undefined && existing?.rate !== "") {
              rowRate = Number(existing.rate);
            } else if (hwPack?.retailPrice !== undefined && hwPack?.retailPrice !== "") {
              rowRate = Number(hwPack.retailPrice);
            } else if (matrixPackRates[s] !== undefined && matrixPackRates[s] !== "") {
              rowRate = Number(matrixPackRates[s]);
            } else if (existing && existing.priceAdjustment !== 0) {
              rowRate = baseRate + existing.priceAdjustment;
            } else {
              rowRate = baseRate > 0 ? baseRate : "";
            }

            const rowPurchase: number | "" = existing?.purchasePrice !== undefined && existing?.purchasePrice !== ""
              ? existing.purchasePrice
              : (hwPack?.purchasePrice !== undefined && hwPack?.purchasePrice !== "" ? hwPack.purchasePrice : (form.purchasePrice ? Number(form.purchasePrice) : ""));

            const rowWholesale: number | "" = existing?.wholesalePrice !== undefined && existing?.wholesalePrice !== ""
              ? existing.wholesalePrice
              : (hwPack?.wholesalePrice !== undefined && hwPack?.wholesalePrice !== "" ? hwPack.wholesalePrice : (form.minimumSellingPrice ? Number(form.minimumSellingPrice) : ""));

            const rowMrp: number | "" = existing?.mrp !== undefined && existing?.mrp !== ""
              ? existing.mrp
              : (hwPack?.mrp !== undefined && hwPack?.mrp !== "" ? hwPack.mrp : (form.mrp ? Number(form.mrp) : ""));

            const adj = rowRate !== "" ? Number(rowRate) - baseRate : (existing ? existing.priceAdjustment : 0);

            rows.push({
              size: s,
              color: c,
              sku: variantSku,
              barcode: existing?.barcode !== undefined ? existing.barcode : "",
              quantity: existing !== undefined ? existing.quantity : "",
              rate: rowRate,
              purchasePrice: rowPurchase,
              wholesalePrice: rowWholesale,
              mrp: rowMrp,
              priceAdjustment: adj,
            });
          });
        });
      } else {
        effectiveSizes.forEach((s) => {
          effectiveColors.forEach((c) => {
            const colorPrefix = c.trim().substring(0, Math.min(3, c.trim().length)).toUpperCase();
            const cleanSize = s.trim().toUpperCase().replace(/\s+/g, "");
            const variantSku = `${baseSku}-${cleanSize}-${colorPrefix}`;
            const barcodeSeed = Math.abs(variantSku.split("").reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0) % 1000000000);
            const autoBarcode = `890${barcodeSeed.toString().padStart(9, "0")}`;

            const existing = prev.find((r) => r.size === s && r.color === c);
            const hwPack = hardwarePackRates[s];

            let rowRate: number | "" = "";
            if (existing?.rate !== undefined && existing?.rate !== "") {
              rowRate = Number(existing.rate);
            } else if (hwPack?.retailPrice !== undefined && hwPack?.retailPrice !== "") {
              rowRate = Number(hwPack.retailPrice);
            } else if (matrixPackRates[s] !== undefined && matrixPackRates[s] !== "") {
              rowRate = Number(matrixPackRates[s]);
            } else if (existing && existing.priceAdjustment !== 0) {
              rowRate = baseRate + existing.priceAdjustment;
            } else {
              rowRate = baseRate > 0 ? baseRate : "";
            }

            const rowPurchase: number | "" = existing?.purchasePrice !== undefined && existing?.purchasePrice !== ""
              ? existing.purchasePrice
              : (hwPack?.purchasePrice !== undefined && hwPack?.purchasePrice !== "" ? hwPack.purchasePrice : (form.purchasePrice ? Number(form.purchasePrice) : ""));

            const rowWholesale: number | "" = existing?.wholesalePrice !== undefined && existing?.wholesalePrice !== ""
              ? existing.wholesalePrice
              : (hwPack?.wholesalePrice !== undefined && hwPack?.wholesalePrice !== "" ? hwPack.wholesalePrice : (form.minimumSellingPrice ? Number(form.minimumSellingPrice) : ""));

            const rowMrp: number | "" = existing?.mrp !== undefined && existing?.mrp !== ""
              ? existing.mrp
              : (hwPack?.mrp !== undefined && hwPack?.mrp !== "" ? hwPack.mrp : (form.mrp ? Number(form.mrp) : ""));

            const adj = rowRate !== "" ? Number(rowRate) - baseRate : (existing ? existing.priceAdjustment : 0);

            rows.push({
              size: s,
              color: c,
              sku: variantSku,
              barcode: existing?.barcode !== undefined ? existing.barcode : "",
              quantity: existing !== undefined ? existing.quantity : "",
              rate: rowRate,
              purchasePrice: rowPurchase,
              wholesalePrice: rowWholesale,
              mrp: rowMrp,
              priceAdjustment: adj,
            });
          });
        });
      }
      return rows;
    });
  }, [matrixSizes, matrixColors, form.sku, form.name, industryConfig.code, form.sellingPrice]);

  const handlePackRateChange = (size: string, val: string | number) => {
    const newRate = val === "" ? "" : Number(val);
    setMatrixPackRates((prev) => ({ ...prev, [size]: newRate }));
    const baseRate = Number(form.sellingPrice || 0);
    setMatrixRows((prev) =>
      prev.map((row) => {
        if (row.size === size) {
          const adj = newRate !== "" ? Number(newRate) - baseRate : 0;
          return {
            ...row,
            rate: newRate,
            priceAdjustment: adj,
          };
        }
        return row;
      })
    );
  };

  const handleRowRateChange = (idx: number, newRateStr: string) => {
    const newRate = newRateStr === "" ? "" : Number(newRateStr);
    const baseRate = Number(form.sellingPrice || 0);
    setMatrixRows((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          const adj = newRate !== "" ? Number(newRate) - baseRate : 0;
          return {
            ...row,
            rate: newRate,
            priceAdjustment: adj,
          };
        }
        return row;
      })
    );
  };

  const handleMatrixFieldChange = (
    idx: number,
    field: "quantity" | "rate" | "purchasePrice" | "wholesalePrice" | "mrp" | "barcode",
    valStr: string
  ) => {
    setMatrixRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === "barcode") {
          return { ...row, barcode: valStr.trim() };
        }
        const numVal = valStr === "" ? "" : Number(valStr);
        const baseRate = Number(form.sellingPrice || 0);
        if (field === "rate") {
          const adj = numVal !== "" ? Number(numVal) - baseRate : 0;
          return { ...row, rate: numVal, priceAdjustment: adj };
        }
        return { ...row, [field]: numVal };
      })
    );
  };

  const handleApplyQuickPackRates = () => {
    const targetPack = quickPackSelect || matrixSizes[0];
    if (!targetPack) return;
    const baseRate = Number(form.sellingPrice || 0);

    setMatrixRows((prev) =>
      prev.map((row) => {
        if (row.size === targetPack) {
          const newRate = quickPackRetail !== "" ? Number(quickPackRetail) : row.rate;
          const adj = newRate !== "" && newRate !== undefined ? Number(newRate) - baseRate : row.priceAdjustment;
          return {
            ...row,
            purchasePrice: quickPackPurchase !== "" ? Number(quickPackPurchase) : row.purchasePrice,
            wholesalePrice: quickPackWholesale !== "" ? Number(quickPackWholesale) : row.wholesalePrice,
            rate: newRate,
            mrp: quickPackMrp !== "" ? Number(quickPackMrp) : row.mrp,
            priceAdjustment: adj,
          };
        }
        return row;
      })
    );

    setHardwarePackRates((prev) => ({
      ...prev,
      [targetPack]: {
        purchasePrice: quickPackPurchase,
        wholesalePrice: quickPackWholesale,
        retailPrice: quickPackRetail,
        mrp: quickPackMrp,
      },
    }));

    if (matrixSizes[0] === targetPack) {
      setForm((f) => ({
        ...f,
        purchasePrice: quickPackPurchase !== "" ? Number(quickPackPurchase) : f.purchasePrice,
        minimumSellingPrice: quickPackWholesale !== "" ? Number(quickPackWholesale) : f.minimumSellingPrice,
        sellingPrice: quickPackRetail !== "" ? Number(quickPackRetail) : f.sellingPrice,
        mrp: quickPackMrp !== "" ? Number(quickPackMrp) : f.mrp,
      }));
    }
  };

  const handleApplyQuickVarietyRates = () => {
    const targetVariety = quickVarietySelect || matrixColors[0];
    if (!targetVariety) return;
    const baseRate = Number(form.sellingPrice || 0);

    setMatrixRows((prev) =>
      prev.map((row) => {
        if (row.color === targetVariety) {
          const newRate = quickVarietyRetail !== "" ? Number(quickVarietyRetail) : row.rate;
          const adj = newRate !== "" && newRate !== undefined ? Number(newRate) - baseRate : row.priceAdjustment;
          return {
            ...row,
            purchasePrice: quickVarietyPurchase !== "" ? Number(quickVarietyPurchase) : row.purchasePrice,
            wholesalePrice: quickVarietyWholesale !== "" ? Number(quickVarietyWholesale) : row.wholesalePrice,
            rate: newRate,
            mrp: quickVarietyMrp !== "" ? Number(quickVarietyMrp) : row.mrp,
            priceAdjustment: adj,
          };
        }
        return row;
      })
    );
  };

  const [submitting, setSubmitting] = useState(false);

  // Multi-Batch Opening Stock State
  interface OpeningBatchRow {
    warehouseId: string;
    batchNumber: string;
    expiryDate: string;
    serialNumbers?: string;
    quantity: number | "";
    purchaseRate: number | "";
    mrp: number | "";
  }

  const [openingBatches, setOpeningBatches] = useState<OpeningBatchRow[]>([
    { warehouseId: "", batchNumber: "", expiryDate: "", serialNumbers: "", quantity: "", purchaseRate: "", mrp: "" }
  ]);

  const handleAddBatchRow = () => {
    setOpeningBatches((prev) => [
      ...prev,
      {
        warehouseId: prev[0]?.warehouseId || "",
        batchNumber: "",
        expiryDate: "",
        quantity: "",
        purchaseRate: form.purchasePrice || "",
        mrp: form.mrp || "",
      }
    ]);
  };

  const handleRemoveBatchRow = (index: number) => {
    setOpeningBatches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBatchRow = (index: number, field: keyof OpeningBatchRow, value: any) => {
    setOpeningBatches((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Item Ledger Modal State
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<ItemList | null>(null);
  const [ledgerMovements, setLedgerMovements] = useState<StockMovement[]>([]);
  const [ledgerStockBalances, setLedgerStockBalances] = useState<WarehouseStock[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerFilterType, setLedgerFilterType] = useState<"all" | "in" | "out">("all");

  const handleOpenItemLedger = async (item: ItemList) => {
    setSelectedLedgerItem(item);
    setLedgerModalOpen(true);
    setLedgerFilterType("all");
    try {
      setLoadingLedger(true);
      const [movesRes, stockRes] = await Promise.all([
        inventoryService.getStockMovements({ itemId: item.id, pageSize: 200 }),
        inventoryService.getStockBalances({ itemId: item.id })
      ]);
      setLedgerMovements(movesRes?.items || []);
      setLedgerStockBalances(stockRes || []);
    } catch (err) {
      console.error("Failed to load item stock ledger", err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Custom UOM Modal State
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [newUomForm, setNewUomForm] = useState({ code: "", name: "", symbol: "", decimalPlaces: 0 });
  const [creatingUom, setCreatingUom] = useState(false);

  // Quick Brand / Maker Creation Modal State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [newBrandForm, setNewBrandForm] = useState({ name: "", manufacturerName: "", description: "" });
  const [creatingBrand, setCreatingBrand] = useState(false);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandForm.name.trim()) {
      alert("Brand / Maker name is required.");
      return;
    }
    try {
      setCreatingBrand(true);
      const cleanName = newBrandForm.name.trim();
      const code = cleanName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "BRD";
      await inventoryService.createBrand({
        code,
        name: cleanName,
        manufacturerName: newBrandForm.manufacturerName.trim() || undefined,
        description: newBrandForm.description.trim() || undefined,
      });
      const refreshedBrands = await inventoryService.getBrands();
      setBrands(refreshedBrands);
      const added = refreshedBrands.find((b) => b.name.toLowerCase() === cleanName.toLowerCase());
      if (added) {
        setForm((prev) => ({ ...prev, brandId: added.id }));
      }
      setIsBrandModalOpen(false);
      setNewBrandForm({ name: "", manufacturerName: "", description: "" });
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create Brand / Maker.");
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleCreateCustomUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUomForm.code.trim() || !newUomForm.name.trim()) {
      alert("Unit Code and Name are required.");
      return;
    }
    try {
      setCreatingUom(true);
      await inventoryService.createUnit({
        code: newUomForm.code.trim().toUpperCase(),
        name: newUomForm.name.trim(),
        symbol: newUomForm.symbol?.trim() || newUomForm.code.trim().toLowerCase(),
        decimalPlaces: Number(newUomForm.decimalPlaces) || 0,
      });
      const refreshedUnits = await inventoryService.getUnits();
      const finalRefreshed = refreshedUnits.length > 0 ? refreshedUnits : DEFAULT_STANDARD_UNITS;
      setUnits(finalRefreshed);
      const added = finalRefreshed.find((u) => u.code.toUpperCase() === newUomForm.code.trim().toUpperCase());
      if (added) {
        setForm((prev) => ({ ...prev, primaryUomId: added.id }));
      }
      setIsUomModalOpen(false);
      setNewUomForm({ code: "", name: "", symbol: "", decimalPlaces: 0 });
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create Unit of Measure.");
    } finally {
      setCreatingUom(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catData, brandData, uomDataRaw, branchData, profData] = await Promise.allSettled([
        inventoryService.getItems({
          pageNumber,
          pageSize,
          searchTerm: searchTerm || undefined,
          categoryId: selectedCategory || undefined,
          brandId: selectedBrand || undefined,
          lowStockOnly: lowStockOnly || undefined,
        }),
        inventoryService.getCategories(),
        inventoryService.getBrands(),
        inventoryService.getUnits(),
        tenantAppService.getBranches(),
        tenantAppService.getBusinessProfile(),
      ]);

      if (itemsRes.status === "fulfilled") {
        setItems(itemsRes.value.items || []);
        setTotalCount(itemsRes.value.totalCount || 0);
        setTotalPages(itemsRes.value.totalPages || 1);
      }
      if (catData.status === "fulfilled") {
        setCategories(catData.value || []);
      }
      if (brandData.status === "fulfilled") {
        setBrands(brandData.value || []);
      }

      let finalUnits = DEFAULT_STANDARD_UNITS;
      if (uomDataRaw.status === "fulfilled") {
        const parsed = Array.isArray(uomDataRaw.value) ? uomDataRaw.value : (uomDataRaw.value as any)?.data;
        if (Array.isArray(parsed) && parsed.length > 0) {
          finalUnits = parsed;
        }
      }
      setUnits(finalUnits);
      setForm((prev) => ({
        ...prev,
        primaryUomId: prev.primaryUomId && finalUnits.some((u) => u.id === prev.primaryUomId)
          ? prev.primaryUomId
          : finalUnits[0]?.id || "",
      }));

      if (branchData.status === "fulfilled") {
        setBranches(branchData.value || []);
      }
      if (profData.status === "fulfilled") {
        setProfile(profData.value || null);
      }
    } catch (err) {
      console.error("Failed to load items catalog data", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 and clear selection when search or filters change
  useEffect(() => {
    setPageNumber(1);
    setSelectedItemIds(new Set());
  }, [searchTerm, selectedCategory, selectedBrand, lowStockOnly, selectedTypeFilter]);

  useEffect(() => {
    loadData();
    setSelectedItemIds(new Set());
  }, [pageNumber, pageSize, searchTerm, selectedCategory, selectedBrand, lowStockOnly]);

  const visibleItems = useMemo(() => {
    return items.filter((i) => {
      if (selectedTypeFilter === "product" && i.itemType === 2) return false;
      if (selectedTypeFilter === "service" && i.itemType !== 2) return false;
      return true;
    });
  }, [items, selectedTypeFilter]);

  const handleToggleSelectAll = () => {
    if (visibleItems.length === 0) return;
    const allSelected = visibleItems.length > 0 && visibleItems.every((i) => selectedItemIds.has(i.id));
    const next = new Set(selectedItemIds);
    if (allSelected) {
      visibleItems.forEach((i) => next.delete(i.id));
    } else {
      visibleItems.forEach((i) => next.add(i.id));
    }
    setSelectedItemIds(next);
  };

  const handleToggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedItemIds.size === 0) return;
    const idsToDelete = Array.from(selectedItemIds);
    try {
      setIsBulkDeleting(true);
      const res = await inventoryService.bulkDeleteItems(idsToDelete);
      setItems((prev) => prev.filter((i) => !selectedItemIds.has(i.id)));
      setTotalCount((prev) => Math.max(0, prev - selectedItemIds.size));
      setSelectedItemIds(new Set());
      setIsBulkDeleteModalOpen(false);
      alert(`✅ ${res?.deletedCount || idsToDelete.length} products successfully deleted from catalog.`);
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      alert(err?.response?.data?.message || err?.message || "Product delete karne me samasya aayi.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.primaryUomId) {
      alert("Product Name and Primary UOM are required.");
      return;
    }

    const finalSku = form.sku?.trim() || generateAutoSku(form.name);

    // Pack dynamic industry attributes
    const attributes: Record<string, any> = {};
    if (form.rackLocation) attributes.rackLocation = form.rackLocation;
    if (industryConfig.code === "PHARMA") {
      if (pharmaSchedule !== "None") attributes.schedule = pharmaSchedule;
      if (pharmaSalt) attributes.composition = pharmaSalt;
    } else if (industryConfig.code === "GARMENTS") {
      if (apparelSize) attributes.size = apparelSize;
      if (apparelColor) attributes.color = apparelColor;
    } else if (industryConfig.code === "FMCG") {
      if (fmcgNetWeight) attributes.netWeight = fmcgNetWeight;
    } else if (industryConfig.code === "ELECTRONICS") {
      if (elecBrand) attributes.brand = elecBrand;
      if (elecModel) attributes.modelVariant = elecModel;
      if (elecWarranty) attributes.warrantyMonths = elecWarranty;
      if (elecTrackingMode) attributes.imeiTracking = elecTrackingMode;
    } else if (industryConfig.code === "HARDWARE") {
      if (hardwareDimension) attributes.dimension = hardwareDimension;
      if (hardwareGrade) attributes.grade = hardwareGrade;
      if (apparelSize) attributes.packSize = apparelSize;
      if (apparelColor) attributes.shade = apparelColor;
    } else if (industryConfig.code === "SWEETS_BAKERY") {
      if (apparelSize) attributes.packSize = apparelSize;
      if (apparelColor) attributes.flavor = apparelColor;
    } else if (industryConfig.code === "AUTOPARTS") {
      if (autoOemPartNo) attributes.oemPartNumber = autoOemPartNo.trim().toUpperCase();
      if (autoVehicleFitment) attributes.vehicleFitment = autoVehicleFitment.trim();
      if (autoFittingPosition) attributes.positionSide = autoFittingPosition;
      if (autoOesBrand) attributes.oesBrand = autoOesBrand.trim();
      if (autoOesPartNo) attributes.oesPartNumber = autoOesPartNo.trim().toUpperCase();
      if (autoMechanicRate !== "") attributes.mechanicRate = autoMechanicRate;
      if (autoBatteryExchangeEligible) attributes.batteryExchangeEligible = true;
      if (isAutoPartsMatrixEnabled && autoPartsMatrixRows.length > 0) {
        attributes.isAutoPartsMatrixEnabled = true;
        attributes.autoPartsSpecType = autoPartsSpecType;
        attributes.autoPartsMatrix = autoPartsMatrixRows.map((r) => ({
          id: r.id,
          brand: r.brand.trim(),
          specNumber: r.specNumber.trim(),
          partNumber: r.partNumber?.trim() || undefined,
          quantity: Number(r.quantity) || 0,
          purchasePrice: r.purchasePrice !== "" ? Number(r.purchasePrice) : Number(form.purchasePrice || 0),
          sellingPrice: r.sellingPrice !== "" ? Number(r.sellingPrice) : Number(form.sellingPrice || 0),
          mrp: r.mrp !== "" ? Number(r.mrp) : Number(form.mrp || 0),
          mechanicRate: r.mechanicRate !== "" && r.mechanicRate !== undefined ? Number(r.mechanicRate) : (autoMechanicRate !== "" ? Number(autoMechanicRate) : undefined),
          rackLocation: r.rackLocation?.trim() || form.rackLocation || undefined,
        }));
      }
    } else if (industryConfig.code === "JEWELLERY") {
      if (jewelleryPurity) attributes.purityKarat = jewelleryPurity;
      if (jewelleryGrossWeight !== "") attributes.grossWeight = Number(jewelleryGrossWeight) || 0;
      if (jewelleryStoneWeight !== "") attributes.stoneWeight = Number(jewelleryStoneWeight) || 0;
      const calcNet = (jewelleryGrossWeight !== "" ? Number(jewelleryGrossWeight) : 0) - (jewelleryStoneWeight !== "" ? Number(jewelleryStoneWeight) : 0);
      attributes.netWeight = calcNet > 0 ? Number(calcNet.toFixed(3)) : (Number(jewelleryNetWeight) || 0);
      if (jewelleryMakingRate !== "") attributes.makingChargeRate = Number(jewelleryMakingRate) || 0;
      attributes.makingChargeType = jewelleryMakingType;
      if (jewelleryHuid.trim()) attributes.huid = jewelleryHuid.trim().toUpperCase();
    }

    // Process multi-batch opening stock rows
    const validBatches = openingBatches
      .filter((b) => Number(b.quantity) > 0 || (b.batchNumber && b.batchNumber.trim() !== "") || (b.serialNumbers && b.serialNumbers.trim() !== ""))
      .map((b) => ({
        warehouseId: b.warehouseId && b.warehouseId.trim() !== "" ? b.warehouseId : undefined,
        batchNumber: form.trackBatches && b.batchNumber ? b.batchNumber.trim().toUpperCase() : (form.trackSerialNumbers && b.serialNumbers ? b.serialNumbers.trim() : undefined),
        expiryDate: form.trackBatches && b.expiryDate ? new Date(b.expiryDate).toISOString() : undefined,
        quantity: Number(b.quantity) || 0,
        purchaseRate: Number(b.purchaseRate) || Number(form.purchasePrice) || 0,
        mrp: Number(b.mrp) || Number(form.mrp) || 0,
      }));

    const isAutoPartsMatrixActive = industryConfig.code === "AUTOPARTS" && isAutoPartsMatrixEnabled && autoPartsMatrixRows.length > 0;
    const isMatrixActive = (industryConfig.code === "GARMENTS" || industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") && isMatrixEnabled && matrixRows.length > 0;
    const autoPartsStockSum = isAutoPartsMatrixActive
      ? autoPartsMatrixRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0)
      : 0;
    const variantStockSum = matrixRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const firstRow = matrixRows[0];
    const firstApRow = autoPartsMatrixRows[0];

    const effSellingPrice = isMatrixActive && firstRow?.rate !== "" && firstRow?.rate !== undefined
      ? Number(firstRow.rate)
      : isAutoPartsMatrixActive && firstApRow?.sellingPrice !== "" && firstApRow?.sellingPrice !== undefined
      ? Number(firstApRow.sellingPrice)
      : Number(form.sellingPrice || 0);

    const effPurchasePrice = isMatrixActive && firstRow?.purchasePrice !== "" && firstRow?.purchasePrice !== undefined
      ? Number(firstRow.purchasePrice)
      : isAutoPartsMatrixActive && firstApRow?.purchasePrice !== "" && firstApRow?.purchasePrice !== undefined
      ? Number(firstApRow.purchasePrice)
      : Number(form.purchasePrice || 0);

    const effWholesalePrice = isMatrixActive && firstRow?.wholesalePrice !== "" && firstRow?.wholesalePrice !== undefined
      ? Number(firstRow.wholesalePrice)
      : isAutoPartsMatrixActive && firstApRow?.mechanicRate !== "" && firstApRow?.mechanicRate !== undefined
      ? Number(firstApRow.mechanicRate)
      : Number(form.minimumSellingPrice || 0);

    const effMrp = isMatrixActive && firstRow?.mrp !== "" && firstRow?.mrp !== undefined
      ? Number(firstRow.mrp)
      : isAutoPartsMatrixActive && firstApRow?.mrp !== "" && firstApRow?.mrp !== undefined
      ? Number(firstApRow.mrp)
      : Number(form.mrp || 0);

    const baseSellingPrice = effSellingPrice;
    const openingVariantsPayload = isMatrixActive
      ? matrixRows.map((r) => {
          const barcodeSeed = Math.abs(r.sku.split("").reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0) % 1000000000);
          const autoBarcode = `890${barcodeSeed.toString().padStart(9, "0")}`;
          const effectiveRate = r.rate !== "" && r.rate !== undefined ? Number(r.rate) : (baseSellingPrice + Number(r.priceAdjustment || 0));
          const adjustment = effectiveRate - baseSellingPrice;
          const hwPrices = hardwarePackRates[r.size];

          const pPrice = r.purchasePrice !== "" && r.purchasePrice !== undefined
            ? Number(r.purchasePrice)
            : (hwPrices?.purchasePrice !== "" && hwPrices?.purchasePrice !== undefined ? Number(hwPrices.purchasePrice) : undefined);

          const wPrice = r.wholesalePrice !== "" && r.wholesalePrice !== undefined
            ? Number(r.wholesalePrice)
            : (hwPrices?.wholesalePrice !== "" && hwPrices?.wholesalePrice !== undefined ? Number(hwPrices.wholesalePrice) : undefined);

          const mrpVal = r.mrp !== "" && r.mrp !== undefined
            ? Number(r.mrp)
            : (hwPrices?.mrp !== "" && hwPrices?.mrp !== undefined ? Number(hwPrices.mrp) : undefined);

          return {
            size: r.size || "Standard",
            color: r.color && r.color.trim() ? r.color.trim() : "Regular",
            variantSku: r.sku,
            barcode: r.barcode && r.barcode.trim() !== "" ? r.barcode.trim() : autoBarcode,
            quantity: Number(r.quantity) || 0,
            priceAdjustment: adjustment,
            purchasePrice: pPrice,
            wholesalePrice: wPrice,
            mrp: mrpVal,
          };
        })
      : isAutoPartsMatrixActive
      ? autoPartsMatrixRows.map((r) => {
          const cleanSpec = (r.specNumber || "STD").replace(/[^a-zA-Z0-9]/g, "");
          const cleanBrand = (r.brand || "GEN").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
          const variantSku = `${finalSku}-${cleanSpec}-${cleanBrand}`;
          const barcodeSeed = Math.abs(variantSku.split("").reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0) % 1000000000);
          const autoBarcode = `890${barcodeSeed.toString().padStart(9, "0")}`;
          const effectiveSelling = r.sellingPrice !== "" ? Number(r.sellingPrice) : effSellingPrice;
          return {
            size: r.specNumber || "Standard",
            color: r.brand || "Regular",
            variantSku,
            barcode: r.partNumber?.trim() || autoBarcode,
            quantity: Number(r.quantity) || 0,
            priceAdjustment: effectiveSelling - effSellingPrice,
            purchasePrice: r.purchasePrice !== "" ? Number(r.purchasePrice) : effPurchasePrice,
            wholesalePrice: r.mechanicRate !== "" ? Number(r.mechanicRate) : effWholesalePrice,
            mrp: r.mrp !== "" ? Number(r.mrp) : effMrp,
          };
        })
      : undefined;

    const totalOpeningStock = isMatrixActive
      ? variantStockSum
      : isAutoPartsMatrixActive
      ? autoPartsStockSum
      : validBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);

    try {
      setSubmitting(true);
      await inventoryService.createItem({
        sku: finalSku,
        name: form.name.trim(),
        shortDescription: form.shortDescription?.trim() || undefined,
        barcode: form.barcode?.trim() || undefined,
        itemType: form.itemType || 1,
        trackInventory: form.itemType !== 2 && form.trackInventory !== false,
        categoryId: form.categoryId && form.categoryId.trim() !== "" ? form.categoryId : undefined,
        brandId: form.brandId && form.brandId.trim() !== "" ? form.brandId : undefined,
        primaryUomId: form.primaryUomId,
        secondaryUomId: form.secondaryUomId && form.secondaryUomId.trim() !== "" ? form.secondaryUomId : undefined,
        conversionRatio: form.conversionRatio ? Number(form.conversionRatio) : undefined,
        hsnCode: form.hsnCode?.trim() || undefined,
        taxRate: Number(form.taxRate) || 0,
        cessRate: Number(form.cessRate) || 0,
        isTaxInclusive: form.isTaxInclusive || false,
        purchasePrice: effPurchasePrice,
        sellingPrice: effSellingPrice,
        minimumSellingPrice: effWholesalePrice,
        mrp: effMrp,
        minimumStockAlert: Number(form.minimumStockAlert) || 0,
        maximumStockAlert: Number(form.maximumStockAlert) || 0,
        reorderQuantity: Number(form.reorderQuantity) || 0,
        trackBatches: (isMatrixActive || isAutoPartsMatrixActive) ? false : Boolean(form.trackBatches),
        trackSerialNumbers: (isMatrixActive || isAutoPartsMatrixActive) ? false : Boolean(form.trackSerialNumbers),
        trackVariants: (isMatrixActive || isAutoPartsMatrixActive) ? true : Boolean(form.trackVariants),
        attributesJson: JSON.stringify(attributes),
        initialStock: totalOpeningStock,
        initialWarehouseId: form.initialWarehouseId && form.initialWarehouseId.trim() !== "" ? form.initialWarehouseId : undefined,
        initialBatchNumber: form.initialBatchNumber?.trim() || undefined,
        initialBatchExpiryDate: form.initialBatchExpiryDate ? new Date(form.initialBatchExpiryDate).toISOString() : undefined,
        openingBatches: (isMatrixActive || isAutoPartsMatrixActive) ? undefined : (validBatches.length > 0 ? validBatches : undefined),
        openingVariants: openingVariantsPayload,
      });

      setIsModalOpen(false);
      setAutoPartsMatrixRows([]);
      setIsAutoPartsMatrixEnabled(false);
      setForm({
        sku: "",
        name: "",
        shortDescription: "",
        barcode: "",
        categoryId: "",
        brandId: "",
        primaryUomId: isJewellery
          ? (units.find((u) => {
              const c = u.code?.toUpperCase();
              const n = u.name?.toLowerCase();
              return c === "GM" || c === "GRAM" || c === "GMS" || (n && n.includes("gram"));
            })?.id || units[0]?.id || "")
          : (units[0]?.id || ""),
        hsnCode: isJewellery ? "7113" : "",
        taxRate: isJewellery ? 3 : (industryConfig.code === "PHARMA" ? 12 : industryConfig.code === "GARMENTS" ? 5 : 18),
        isTaxInclusive: false,
        purchasePrice: 0,
        sellingPrice: 0,
        minimumSellingPrice: 0,
        mrp: 0,
        minimumStockAlert: 5,
        rackLocation: "",
        trackBatches: industryConfig.trackingDefaults.trackBatches,
        trackSerialNumbers: industryConfig.trackingDefaults.trackSerialNumbers,
        attributesJson: "{}",
        initialStock: 0,
        initialWarehouseId: "",
        initialBatchNumber: "",
        initialBatchExpiryDate: "",
      });
      setJewelleryPurity("22K (916)");
      setJewelleryGrossWeight("");
      setJewelleryStoneWeight("");
      setJewelleryNetWeight("");
      setJewelleryMakingRate("");
      setJewelleryMakingType("per_gram");
      setJewelleryHuid("");
      setElecBrand("");
      setElecModel("");
      setElecWarranty("");
      setHardwareDimension("");
      setHardwareGrade("");
      setAutoOemPartNo("");
      setAutoVehicleFitment("");
      setAutoFittingPosition("Universal");
      setAutoOesBrand("");
      setAutoOesPartNo("");
      setAutoMechanicRate("");
      setAutoBatteryExchangeEligible(false);
      setApparelSize("");
      setApparelColor("");
      setPharmaSalt("");
      setFmcgNetWeight("");
      setMatrixSizes([]);
      setMatrixColors([]);
      setMatrixRows([]);
      setMatrixPackRates({});
      setQuickPackSelect("");
      setQuickPackPurchase("");
      setQuickPackWholesale("");
      setQuickPackRetail("");
      setQuickPackMrp("");
      setQuickVarietySelect("");
      setQuickVarietyPurchase("");
      setQuickVarietyWholesale("");
      setQuickVarietyRetail("");
      setQuickVarietyMrp("");
      setIsMatrixEnabled(industryConfig.code !== "FMCG");
      setOpeningBatches([
        { warehouseId: "", batchNumber: "", expiryDate: "", serialNumbers: "", quantity: "", purchaseRate: "", mrp: "" }
      ]);
      loadData();
    } catch (err: any) {
      console.error("Create item error:", err);
      let errMsg = "Failed to create product.";
      if (err?.response?.data) {
        const d = err.response.data;
        if (d.userMessage) errMsg = d.userMessage;
        else if (d.message) errMsg = d.message;
        else if (d.errorMessage) errMsg = d.errorMessage;
        else if (d.title && d.errors) {
          const errList = Object.entries(d.errors)
            .map(([field, msgs]: any) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("\n");
          errMsg = `${d.title}\n${errList}`;
        }
      } else if (err?.message) {
        errMsg = err.message;
      }
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupBarcode = async (codeToLookup?: string) => {
    const code = (codeToLookup || quickBarcodeQuery || form.barcode || "").trim();
    if (!code) return;

    setIsLookingUpBarcode(true);
    setBarcodeLookupNotice(null);

    try {
      const result: BarcodeLookupResult = await inventoryService.lookupBarcode(code);

      if (result.existsInStore && result.storeItem) {
        setBarcodeLookupNotice({
          type: "warning",
          message: `Product already exists in store inventory: "${result.storeItem.name}"`,
          details: `Current Stock: ${result.storeItem.totalStock || 0} ${result.storeItem.primaryUomCode || "Pcs"} • Retail Price: ₹${result.storeItem.sellingPrice || 0} • MRP: ₹${result.storeItem.mrp || 0}`,
          storeItem: result.storeItem,
        });
      } else if (result.masterCatalogItem) {
        const item = result.masterCatalogItem;
        const brandStr = item.brandName?.trim() || "";
        let matchedBrand = brandStr ? brands.find((b) => b.name.toLowerCase() === brandStr.toLowerCase()) : null;

        if (brandStr && !matchedBrand) {
          try {
            const autoCode = brandStr.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "BRD";
            await inventoryService.createBrand({ code: autoCode, name: brandStr });
            const refreshedBrands = await inventoryService.getBrands();
            setBrands(refreshedBrands);
            matchedBrand = refreshedBrands.find((b) => b.name.toLowerCase() === brandStr.toLowerCase()) || null;
          } catch {
            // Non-blocking fallback
          }
        }

        setForm((prev) => ({
          ...prev,
          name: item.productName || prev.name,
          sku: prev.sku ? prev.sku : generateAutoSku(item.productName),
          barcode: item.barcode || code,
          brandId: matchedBrand ? matchedBrand.id : prev.brandId,
          hsnCode: item.hsnCode || prev.hsnCode,
          taxRate: item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : prev.taxRate,
          mrp: item.mrp || prev.mrp,
          sellingPrice: item.sellingPrice || item.mrp || prev.sellingPrice,
          purchasePrice: item.purchasePrice || prev.purchasePrice,
        }));

        if (item.categoryName) {
          const matchedCat = categories.find((c) => c.name.toLowerCase() === item.categoryName!.toLowerCase());
          if (matchedCat) {
            setForm((prev) => ({ ...prev, categoryId: matchedCat.id }));
          }
        }
        if (item.unitCode) {
          const matchedUnit = units.find(
            (u) => u.code.toLowerCase() === item.unitCode!.toLowerCase() || u.symbol.toLowerCase() === item.unitCode!.toLowerCase()
          );
          if (matchedUnit) {
            setForm((prev) => ({ ...prev, primaryUomId: matchedUnit.id }));
          }
        }

        setBarcodeLookupNotice({
          type: "success",
          message: `Auto-filled details for "${item.productName}" from Master Catalog!`,
          details: `Brand: ${item.brandName || "Standard"} • HSN: ${item.hsnCode || "N/A"} • Tax: ${item.taxRate !== undefined ? item.taxRate : 18}% • MRP: ₹${item.mrp || 0}`,
        });
      } else {
        setForm((prev) => ({
          ...prev,
          barcode: code,
          sku: prev.sku ? prev.sku : generateAutoSku(prev.name),
        }));
        setBarcodeLookupNotice({
          type: "info",
          message: `New barcode detected: ${code}`,
          details: "Item not in master database yet. Enter product name and pricing below to save.",
        });
      }
    } catch (err: any) {
      console.error("Barcode lookup failed:", err);
      setBarcodeLookupNotice({
        type: "error",
        message: "Could not lookup barcode right now.",
        details: "You can continue typing product details manually.",
      });
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleOpenEditModal = async (item: ItemList) => {
    setEditingItem(item);
    let attrs: any = {};
    try {
      attrs = JSON.parse(item.attributesJson || "{}");
    } catch {}

    setEditForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || "",
      itemType: item.itemType || 1,
      trackInventory: item.trackInventory !== false,
      categoryId: item.categoryId || categories.find((c) => c.name === item.categoryName)?.id || "",
      brandId: item.brandId || brands.find((b) => b.name === item.brandName)?.id || "",
      primaryUomId: item.primaryUomId || (units.length > 0 ? units[0].id : DEFAULT_STANDARD_UNITS[0].id),
      secondaryUomId: "",
      conversionRatio: "",
      hsnCode: item.hsnCode || "",
      taxRate: item.taxRate ?? 18,
      cessRate: "",
      isTaxInclusive: Boolean(item.isTaxInclusive),
      purchasePrice: item.purchasePrice ?? 0,
      sellingPrice: item.sellingPrice ?? 0,
      minimumSellingPrice: item.minimumSellingPrice ?? 0,
      mrp: item.mrp ?? 0,
      minimumStockAlert: item.minimumStockAlert ?? 5,
      maximumStockAlert: "",
      reorderQuantity: "",
      rackLocation: attrs.rackLocation || "",
      trackBatches: Boolean(item.trackBatches),
      trackSerialNumbers: Boolean(item.trackSerialNumbers),
      trackVariants: Boolean(item.trackVariants),
      shortDescription: "",
      isActive: item.isActive !== false,
    });

    setEditVariants([]);
    setIsAddVariantDrawerOpen(false);
    setNewVariantDraft({
      size: "",
      color: "Regular",
      variantName: "",
      sku: "",
      barcode: "",
      purchasePrice: item.purchasePrice ?? "",
      wholesalePrice: item.minimumSellingPrice ?? "",
      sellingPrice: item.sellingPrice ?? "",
      mrp: item.mrp ?? "",
      openingStock: 0,
    });
    setEditQuickPurchase("");
    setEditQuickWholesale("");
    setEditQuickRetail("");
    setEditQuickMrp("");

    if (attrs.autoPartsMatrix && Array.isArray(attrs.autoPartsMatrix)) {
      setEditAutoPartsMatrixRows(attrs.autoPartsMatrix);
      setIsEditAutoPartsMatrixActive(true);
    } else {
      setEditAutoPartsMatrixRows([]);
      setIsEditAutoPartsMatrixActive(false);
    }

    setIsEditModalOpen(true);
    setLoadingEditDetails(true);

    // Fetch full item details asynchronously to hydrate secondary units, alerts, and description
    try {
      const details = await inventoryService.getItemById(item.id);
      if (details) {
        setEditForm((prev) => ({
          ...prev,
          name: details.name || prev.name,
          barcode: details.barcode || prev.barcode,
          itemType: details.itemType ?? prev.itemType,
          trackInventory: details.trackInventory !== undefined ? details.trackInventory : prev.trackInventory,
          categoryId: details.categoryId || prev.categoryId,
          brandId: details.brandId || prev.brandId,
          primaryUomId: details.primaryUomId || prev.primaryUomId,
          secondaryUomId: details.secondaryUomId || "",
          conversionRatio: details.conversionRatio !== undefined && details.conversionRatio !== null ? details.conversionRatio : "",
          hsnCode: details.hsnCode || prev.hsnCode,
          taxRate: details.taxRate !== undefined ? details.taxRate : prev.taxRate,
          cessRate: details.cessRate !== undefined && details.cessRate !== null ? details.cessRate : "",
          isTaxInclusive: details.isTaxInclusive !== undefined ? Boolean(details.isTaxInclusive) : prev.isTaxInclusive,
          purchasePrice: details.purchasePrice !== undefined ? details.purchasePrice : prev.purchasePrice,
          sellingPrice: details.sellingPrice !== undefined ? details.sellingPrice : prev.sellingPrice,
          minimumSellingPrice: details.minimumSellingPrice !== undefined ? details.minimumSellingPrice : prev.minimumSellingPrice,
          mrp: details.mrp !== undefined ? details.mrp : prev.mrp,
          minimumStockAlert: details.minimumStockAlert !== undefined ? details.minimumStockAlert : prev.minimumStockAlert,
          maximumStockAlert: details.maximumStockAlert !== undefined && details.maximumStockAlert !== null ? details.maximumStockAlert : "",
          reorderQuantity: details.reorderQuantity !== undefined && details.reorderQuantity !== null ? details.reorderQuantity : "",
          trackBatches: details.trackBatches !== undefined ? Boolean(details.trackBatches) : prev.trackBatches,
          trackSerialNumbers: details.trackSerialNumbers !== undefined ? Boolean(details.trackSerialNumbers) : prev.trackSerialNumbers,
          shortDescription: details.shortDescription || "",
          isActive: details.isActive !== undefined ? Boolean(details.isActive) : prev.isActive,
        }));
      }
    } catch (err) {
      console.warn("Could not load extended item details, keeping base fields:", err);
    } finally {
      setLoadingEditDetails(false);
    }

    if (item.trackVariants) {
      try {
        setLoadingVariants(true);
        const vars = await inventoryService.getItemVariants(item.id);
        setEditVariants(vars);
        if (vars.length > 0) {
          const firstSz = vars[0].size || "";
          setEditQuickPackSelect(firstSz);
        }
      } catch (err) {
        console.error("Failed to load variants:", err);
      } finally {
        setLoadingVariants(false);
      }
    }
  };

  const handleApplyEditQuickPackRates = () => {
    if (!editQuickPackSelect) return;
    setEditVariants((prev) =>
      prev.map((v) => {
        if (v.size !== editQuickPackSelect) return v;
        return {
          ...v,
          purchasePrice: editQuickPurchase !== "" ? Number(editQuickPurchase) : v.purchasePrice,
          wholesalePrice: editQuickWholesale !== "" ? Number(editQuickWholesale) : v.wholesalePrice,
          sellingPrice: editQuickRetail !== "" ? Number(editQuickRetail) : v.sellingPrice,
          mrp: editQuickMrp !== "" ? Number(editQuickMrp) : v.mrp,
        };
      })
    );
  };

  const handleEditVariantField = (idx: number, field: string, value: any) => {
    setEditVariants((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleAddNewVariantToEdit = () => {
    if (!editingItem) return;
    const sizeVal = (newVariantDraft.size || "").trim();
    const colorVal = (newVariantDraft.color || "").trim() || "Regular";
    if (!sizeVal && !newVariantDraft.variantName.trim()) {
      alert("Please enter or select a Size / Pack / Specification.");
      return;
    }

    const effSize = sizeVal || "Standard";
    const effColor = colorVal;
    const finalVariantName = newVariantDraft.variantName.trim() ||
      (effColor !== "Regular" && effColor !== "Standard"
        ? `${editForm.name} (${effSize}, ${effColor})`
        : `${editForm.name} (${effSize})`);

    const sizeCode = effSize.toUpperCase().replace(/\s+/g, "");
    const colorPrefix = effColor.length > 0 ? effColor.substring(0, Math.min(3, effColor.length)).toUpperCase() : "REG";
    const genSku = newVariantDraft.sku.trim() || `${editingItem.sku}-${sizeCode}-${colorPrefix}`;
    const genBarcode = newVariantDraft.barcode.trim() || `890${Math.floor(100000000 + Math.random() * 900000000)}`;

    const pPrice = newVariantDraft.purchasePrice !== "" ? Number(newVariantDraft.purchasePrice) : Number(editForm.purchasePrice) || 0;
    const wPrice = newVariantDraft.wholesalePrice !== "" ? Number(newVariantDraft.wholesalePrice) : Number(editForm.minimumSellingPrice) || 0;
    const sPrice = newVariantDraft.sellingPrice !== "" ? Number(newVariantDraft.sellingPrice) : Number(editForm.sellingPrice) || 0;
    const mrpPrice = newVariantDraft.mrp !== "" ? Number(newVariantDraft.mrp) : Number(editForm.mrp) || 0;
    const openStock = newVariantDraft.openingStock !== "" ? Number(newVariantDraft.openingStock) : 0;

    const duplicate = editVariants.find((v) => 
      (v.size?.toLowerCase() === effSize.toLowerCase() && (v.color || "Regular").toLowerCase() === effColor.toLowerCase()) ||
      (v.variantName?.toLowerCase() === finalVariantName.toLowerCase())
    );
    if (duplicate) {
      alert(`Variant "${finalVariantName}" already exists in the list!`);
      return;
    }

    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newVariant: ItemVariant = {
      id: draftId,
      itemId: editingItem.id,
      variantSku: genSku,
      variantName: finalVariantName,
      size: effSize,
      color: effColor,
      barcode: genBarcode,
      priceAdjustment: sPrice - Number(editForm.sellingPrice || 0),
      purchasePrice: pPrice,
      wholesalePrice: wPrice,
      sellingPrice: sPrice,
      mrp: mrpPrice,
      currentStock: openStock,
      isActive: true,
      openingStock: openStock,
    } as any;

    setEditVariants((prev) => [...prev, newVariant]);
    setEditForm((prev) => ({ ...prev, trackVariants: true }));

    setNewVariantDraft((prev) => ({
      ...prev,
      size: "",
      color: "Regular",
      variantName: "",
      sku: "",
      barcode: "",
      openingStock: 0,
    }));
  };

  const handleRemoveEditVariant = (idx: number) => {
    setEditVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const renderAddVariantDrawer = () => {
    if (!isAddVariantDrawerOpen) return null;
    return (
      <div className="p-3 bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-amber-50/90 dark:from-slate-800/80 dark:via-orange-950/20 dark:to-slate-800/80 border-2 border-dashed border-orange-300 dark:border-orange-800 rounded-xl space-y-3 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-orange-200/80 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
            <span className="text-xs font-bold text-orange-950 dark:text-orange-200">
              Add New {variantTerms.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 rounded font-semibold">
              {variantTerms.badgeText}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddVariantDrawerOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary & Secondary Dimension inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>{variantTerms.primaryLabel} *</span>
            </label>
            <input
              type="text"
              value={newVariantDraft.size}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, size: e.target.value }))}
              placeholder={variantTerms.primaryPlaceholder}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {/* Suggestions Chips */}
            <div className="flex flex-wrap gap-1 mt-1">
              {variantTerms.primarySuggestions.slice(0, 6).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setNewVariantDraft((prev) => ({ ...prev, size: s }))}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border cursor-pointer transition ${
                    newVariantDraft.size === s
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-orange-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {variantTerms.secondaryLabel}
            </label>
            <input
              type="text"
              value={newVariantDraft.color}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, color: e.target.value }))}
              placeholder={variantTerms.secondaryPlaceholder}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {/* Suggestions Chips */}
            <div className="flex flex-wrap gap-1 mt-1">
              {variantTerms.secondarySuggestions.slice(0, 4).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewVariantDraft((prev) => ({ ...prev, color: c }))}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border cursor-pointer transition ${
                    newVariantDraft.color === c
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-orange-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
              Barcode (Auto or Scan)
            </label>
            <input
              type="text"
              value={newVariantDraft.barcode}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, barcode: e.target.value }))}
              placeholder="Auto-generated if blank"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
              Opening Stock (Qty)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newVariantDraft.openingStock}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, openingStock: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Pricing Row for New Variant */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 items-end pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              Purchase Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newVariantDraft.purchasePrice}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, purchasePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              placeholder={String(editForm.purchasePrice || 0)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              Wholesale Rate (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newVariantDraft.wholesalePrice}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, wholesalePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              placeholder={String(editForm.minimumSellingPrice || 0)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              Retail Selling Rate (₹)*
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newVariantDraft.sellingPrice}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, sellingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              placeholder={String(editForm.sellingPrice || 0)}
              className="w-full px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded-lg text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              MRP (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newVariantDraft.mrp}
              onChange={(e) => setNewVariantDraft((prev) => ({ ...prev, mrp: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              placeholder={String(editForm.mrp || 0)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleAddNewVariantToEdit}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Table</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setUpdatingProduct(true);

      let currentAttrs: any = {};
      try {
        currentAttrs = JSON.parse(editingItem.attributesJson || "{}");
      } catch {}
      if (editForm.rackLocation) currentAttrs.rackLocation = editForm.rackLocation;
      if (isEditAutoPartsMatrixActive && editAutoPartsMatrixRows.length > 0) {
        currentAttrs.autoPartsMatrix = editAutoPartsMatrixRows;
      }

      const isMultiVariant = editVariants.length > 0 || Boolean(editForm.trackVariants);

      // 1. Update master product with all attributes
      await inventoryService.updateItem(editingItem.id, {
        name: editForm.name.trim(),
        shortDescription: editForm.shortDescription?.trim() || undefined,
        barcode: editForm.barcode?.trim() || undefined,
        itemType: editForm.itemType || 1,
        trackInventory: editForm.itemType !== 2 && editForm.trackInventory !== false,
        categoryId: editForm.categoryId || undefined,
        brandId: editForm.brandId || undefined,
        primaryUomId: editForm.primaryUomId,
        secondaryUomId: editForm.secondaryUomId && editForm.secondaryUomId.trim() !== "" ? editForm.secondaryUomId : undefined,
        conversionRatio: editForm.conversionRatio !== "" ? Number(editForm.conversionRatio) : undefined,
        hsnCode: editForm.hsnCode?.trim() || undefined,
        taxRate: Number(editForm.taxRate) || 0,
        cessRate: editForm.cessRate !== "" ? Number(editForm.cessRate) : 0,
        isTaxInclusive: Boolean(editForm.isTaxInclusive),
        purchasePrice: Number(editForm.purchasePrice) || 0,
        sellingPrice: Number(editForm.sellingPrice) || 0,
        minimumSellingPrice: Number(editForm.minimumSellingPrice) || 0,
        mrp: Number(editForm.mrp) || 0,
        minimumStockAlert: Number(editForm.minimumStockAlert) || 0,
        maximumStockAlert: editForm.maximumStockAlert !== "" ? Number(editForm.maximumStockAlert) : 0,
        reorderQuantity: editForm.reorderQuantity !== "" ? Number(editForm.reorderQuantity) : 0,
        trackBatches: Boolean(editForm.trackBatches),
        trackSerialNumbers: Boolean(editForm.trackSerialNumbers),
        trackVariants: isMultiVariant,
        isActive: editForm.isActive,
        attributesJson: JSON.stringify(currentAttrs),
      });

      // 2. If item has variants, update variants (both existing and draft additions)
      if (editVariants.length > 0) {
        const payload: ItemVariantUpdateInput[] = editVariants.map((v) => ({
          variantId: v.id && !v.id.startsWith("draft_") ? v.id : null,
          variantSku: v.variantSku,
          barcode: v.barcode,
          rate: Number(v.sellingPrice ?? (Number(editForm.sellingPrice) + (v.priceAdjustment || 0))),
          purchasePrice: v.purchasePrice !== undefined ? Number(v.purchasePrice) : undefined,
          wholesalePrice: v.wholesalePrice !== undefined ? Number(v.wholesalePrice) : undefined,
          mrp: v.mrp !== undefined ? Number(v.mrp) : undefined,
          size: v.size,
          color: v.color,
          variantName: v.variantName,
          openingStock: (v as any).openingStock !== undefined ? Number((v as any).openingStock) : undefined,
        }));
        await inventoryService.updateItemVariants(editingItem.id, payload);
      }

      // 3. Update table item state in-memory
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== editingItem.id) return it;
          return {
            ...it,
            name: editForm.name.trim(),
            barcode: editForm.barcode?.trim() || undefined,
            categoryId: editForm.categoryId || undefined,
            categoryName: categories.find((c) => c.id === editForm.categoryId)?.name || it.categoryName,
            brandId: editForm.brandId || undefined,
            brandName: brands.find((b) => b.id === editForm.brandId)?.name || it.brandName,
            primaryUomId: editForm.primaryUomId,
            primaryUomCode: units.find((u) => u.id === editForm.primaryUomId)?.code || it.primaryUomCode,
            hsnCode: editForm.hsnCode?.trim() || it.hsnCode,
            taxRate: Number(editForm.taxRate) || it.taxRate,
            isTaxInclusive: Boolean(editForm.isTaxInclusive),
            purchasePrice: Number(editForm.purchasePrice) || it.purchasePrice,
            sellingPrice: Number(editForm.sellingPrice) || it.sellingPrice,
            minimumSellingPrice: Number(editForm.minimumSellingPrice) || it.minimumSellingPrice,
            mrp: Number(editForm.mrp) || it.mrp,
            minimumStockAlert: Number(editForm.minimumStockAlert) || it.minimumStockAlert,
            trackInventory: editForm.trackInventory,
            trackBatches: Boolean(editForm.trackBatches),
            trackSerialNumbers: Boolean(editForm.trackSerialNumbers),
            trackVariants: isMultiVariant,
            isActive: editForm.isActive,
          };
        })
      );

      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error("Failed to update product:", err);
      alert(err?.response?.data?.message || err?.message || "Product update karne me samasya aayi.");
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.size === 0) return;

    try {
      setIsBulkUpdating(true);
      const itemIds = Array.from(selectedItemIds);

      const payload: any = { itemIds };
      if (bulkEditFields.trackInventory !== "NO_CHANGE") {
        payload.trackInventory = bulkEditFields.trackInventory === "ENABLE";
      }
      if (bulkEditFields.taxRate !== "NO_CHANGE") {
        payload.taxRate = Number(bulkEditFields.taxRate);
      }
      if (bulkEditFields.isTaxInclusive !== "NO_CHANGE") {
        payload.isTaxInclusive = bulkEditFields.isTaxInclusive === "INCLUSIVE";
      }
      if (bulkEditFields.categoryId === "CLEAR") {
        payload.clearCategory = true;
      } else if (bulkEditFields.categoryId !== "NO_CHANGE") {
        payload.categoryId = bulkEditFields.categoryId;
      }
      if (bulkEditFields.brandId === "CLEAR") {
        payload.clearBrand = true;
      } else if (bulkEditFields.brandId !== "NO_CHANGE") {
        payload.brandId = bulkEditFields.brandId;
      }
      if (bulkEditFields.primaryUomId !== "NO_CHANGE") {
        payload.primaryUomId = bulkEditFields.primaryUomId;
      }
      if (bulkEditFields.hsnCode !== "NO_CHANGE") {
        payload.hsnCode = bulkEditFields.hsnCode.trim();
      }
      if (bulkEditFields.minimumStockAlert !== "NO_CHANGE") {
        payload.minimumStockAlert = Number(bulkEditFields.minimumStockAlert);
      }
      if (bulkEditFields.trackBatches !== "NO_CHANGE") {
        payload.trackBatches = bulkEditFields.trackBatches === "ENABLE";
      }
      if (bulkEditFields.trackSerialNumbers !== "NO_CHANGE") {
        payload.trackSerialNumbers = bulkEditFields.trackSerialNumbers === "ENABLE";
      }
      if (bulkEditFields.isActive !== "NO_CHANGE") {
        payload.isActive = bulkEditFields.isActive === "ACTIVE";
      }

      const res = await inventoryService.bulkUpdateItems(payload);

      // Optimistically update items in table state
      setItems((prev) =>
        prev.map((it) => {
          if (!selectedItemIds.has(it.id)) return it;
          const updated = { ...it };
          if (payload.trackInventory !== undefined) updated.trackInventory = payload.trackInventory;
          if (payload.taxRate !== undefined) updated.taxRate = payload.taxRate;
          if (payload.isTaxInclusive !== undefined) updated.isTaxInclusive = payload.isTaxInclusive;
          if (payload.clearCategory) {
            updated.categoryId = undefined;
            updated.categoryName = undefined;
          } else if (payload.categoryId) {
            updated.categoryId = payload.categoryId;
            updated.categoryName = categories.find((c) => c.id === payload.categoryId)?.name || updated.categoryName;
          }
          if (payload.clearBrand) {
            updated.brandId = undefined;
            updated.brandName = undefined;
          } else if (payload.brandId) {
            updated.brandId = payload.brandId;
            updated.brandName = brands.find((b) => b.id === payload.brandId)?.name || updated.brandName;
          }
          if (payload.primaryUomId) {
            updated.primaryUomId = payload.primaryUomId;
            updated.primaryUomCode = units.find((u) => u.id === payload.primaryUomId)?.code || updated.primaryUomCode;
          }
          if (payload.hsnCode !== undefined) updated.hsnCode = payload.hsnCode;
          if (payload.minimumStockAlert !== undefined) updated.minimumStockAlert = payload.minimumStockAlert;
          if (payload.trackBatches !== undefined) updated.trackBatches = payload.trackBatches;
          if (payload.trackSerialNumbers !== undefined) updated.trackSerialNumbers = payload.trackSerialNumbers;
          if (payload.isActive !== undefined) updated.isActive = payload.isActive;
          return updated;
        })
      );

      setIsBulkEditModalOpen(false);
      setSelectedItemIds(new Set());
      setBulkEditFields({
        trackInventory: "NO_CHANGE",
        taxRate: "NO_CHANGE",
        isTaxInclusive: "NO_CHANGE",
        categoryId: "NO_CHANGE",
        brandId: "NO_CHANGE",
        primaryUomId: "NO_CHANGE",
        hsnCode: "NO_CHANGE",
        minimumStockAlert: "NO_CHANGE",
        trackBatches: "NO_CHANGE",
        trackSerialNumbers: "NO_CHANGE",
        isActive: "NO_CHANGE",
      });
      alert(res.message || `${itemIds.length} products updated successfully.`);
    } catch (err: any) {
      console.error("Bulk update failed:", err);
      alert(err?.response?.data?.message || err?.message || "Bulk update me samasya aayi.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const allWarehouses = branches.flatMap((b) => b.warehouses);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-primary" />
            <span>Master Product Catalog &amp; Inventory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comprehensive SKU directory tailored for{" "}
            <span className="text-primary font-semibold">{profile?.industryName || "your industry"}</span>{" "}
            with multi-batch and multi-warehouse balances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedItemIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Bulk Edit ({selectedItemIds.size})</span>
              </button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Bulk Delete ({selectedItemIds.size})
              </Button>
            </div>
          )}
          <Link href="/app/inventory/price-list">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold shadow-2xs"
              icon={<Zap className="w-4 h-4 text-amber-500 fill-amber-500" />}
            >
              ⚡ Quick Price Editor
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadMasterMigrationTemplate()}
            className="border-emerald-600/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Download Master Excel (.xlsx)
          </Button>
          <Link href="/app/inventory/import">
            <Button variant="outline" size="sm" icon={<UploadCloud className="w-4 h-4 text-primary" />}>
              Bulk Import (CSV)
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const activeUnits = units.length > 0 ? units : DEFAULT_STANDARD_UNITS;
              setForm((prev) => ({
                ...prev,
                primaryUomId: prev.primaryUomId && activeUnits.some((u) => u.id === prev.primaryUomId)
                  ? prev.primaryUomId
                  : activeUnits[0]?.id || "",
                itemType: 2,
                trackInventory: false,
                trackBatches: false,
                trackSerialNumbers: false,
                initialStock: 0,
              }));
              setIsModalOpen(true);
            }}
            icon={<Wrench className="w-4 h-4 text-warning" />}
          >
            + Add Service
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const activeUnits = units.length > 0 ? units : DEFAULT_STANDARD_UNITS;
              const defaultUom = isJewellery
                ? (activeUnits.find((u) => {
                    const c = u.code?.toUpperCase();
                    const n = u.name?.toLowerCase();
                    return c === "GM" || c === "GRAM" || c === "GMS" || (n && n.includes("gram"));
                  })?.id || activeUnits[0]?.id || "")
                : (activeUnits[0]?.id || "");
              setForm((prev) => ({
                ...prev,
                primaryUomId: prev.primaryUomId && activeUnits.some((u) => u.id === prev.primaryUomId)
                  ? prev.primaryUomId
                  : defaultUom,
                hsnCode: isJewellery && !prev.hsnCode ? "7113" : prev.hsnCode,
                taxRate: isJewellery && (prev.taxRate === 18 || !prev.taxRate) ? 3 : prev.taxRate,
                itemType: 1,
                trackInventory: true,
                trackBatches: industryConfig.trackingDefaults.trackBatches,
                trackSerialNumbers: industryConfig.trackingDefaults.trackSerialNumbers,
              }));
              if (isJewellery) {
                setJewelleryPurity("22K (916)");
                setJewelleryGrossWeight("");
                setJewelleryStoneWeight("");
                setJewelleryNetWeight("");
                setJewelleryMakingRate("");
                setJewelleryMakingType("per_gram");
                setJewelleryHuid("");
              }
              setMatrixSizes([]);
              setMatrixColors([]);
              setMatrixRows([]);
              setIsMatrixEnabled(industryConfig.code !== "FMCG");
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          >
            + Add Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, Name, Barcode, HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Type Filter: All / Product / Service */}
          <div className="flex items-center p-0.5 bg-surface-elevated/60 border border-border rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedTypeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("product")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 ${
                selectedTypeFilter === "product"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Boxes className="w-3 h-3" />
              <span>Products</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("service")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 ${
                selectedTypeFilter === "service"
                  ? "bg-warning text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>Services ({items.filter((i) => i.itemType === 2).length})</span>
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface text-foreground">
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-1.5 bg-surface-elevated/40 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id} className="bg-surface text-foreground">
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
              lowStockOnly
                ? "bg-danger/10 text-danger border-danger/30"
                : "bg-surface-elevated/40 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedItemIds.size > 0 && (
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/95 dark:bg-slate-900/95 border-2 border-orange-500/80 text-white rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-orange-600 text-white font-bold text-xs shadow-xs">
              {selectedItemIds.size}
            </span>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">
                {selectedItemIds.size} {selectedItemIds.size === 1 ? "Product" : "Products"} Selected
              </p>
              <p className="text-[11px] text-slate-300">
                This page: {visibleItems.filter((i) => selectedItemIds.has(i.id)).length} of {visibleItems.length} selected
              </p>
            </div>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => {
                const next = new Set(selectedItemIds);
                visibleItems.forEach((i) => next.add(i.id));
                setSelectedItemIds(next);
              }}
              className="text-xs text-orange-300 hover:text-white underline font-medium cursor-pointer"
            >
              Select all {visibleItems.length} on this page
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="text-xs text-slate-400 hover:text-white hover:underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsBulkEditModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-white" />
              <span>Bulk Edit ({selectedItemIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center space-x-1.5 transition-all transform active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Bulk Delete ({selectedItemIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Items Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No items found in catalog"
            description="Add products or services to begin managing your stock, HSN codes, batches, and prices."
            actionLabel="+ Add Product"
            onAction={() => {
              setForm((prev) => ({
                ...prev,
                itemType: 1,
                trackInventory: true,
              }));
              setMatrixSizes([]);
              setMatrixColors([]);
              setMatrixRows([]);
              setIsMatrixEnabled(industryConfig.code !== "FMCG");
              setIsModalOpen(true);
            }}
            actionIcon={Plus}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="text-table-headerForeground uppercase tracking-wider bg-table-header border-b border-border text-[11px] font-bold">
                <tr>
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                      checked={visibleItems.length > 0 && visibleItems.every((i) => selectedItemIds.has(i.id))}
                      onChange={handleToggleSelectAll}
                      title="Select / Deselect all on this page"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">SKU &amp; Item Name</th>
                  <th className="px-4 py-3 font-semibold">Category / Brand</th>
                  <th className="px-4 py-3 font-semibold">HSN / GST</th>
                  <th className="px-4 py-3 font-semibold">Pricing (₹)</th>
                  <th className="px-4 py-3 font-semibold">Stock Balance</th>
                  <th className="px-4 py-3 font-semibold text-right">Attributes &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleItems.map((item) => {
                  let attrs: any = {};
                  try {
                    attrs = JSON.parse(item.attributesJson || "{}");
                  } catch {}

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-table-rowHover transition-colors ${
                        selectedItemIds.has(item.id) ? "bg-rose-500/5 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                          checked={selectedItemIds.has(item.id)}
                          onChange={() => handleToggleSelectItem(item.id)}
                          title={`Select ${item.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                              type="button"
                              onClick={() => handleOpenItemLedger(item)}
                              className="font-bold text-foreground hover:text-primary transition-colors tracking-tight text-left cursor-pointer flex items-center space-x-1.5 group"
                              title="Click to view Item Stock Ledger (Opening, Billed, In/Out History)"
                            >
                              <span className="group-hover:underline">{item.name}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                View Ledger 📊
                              </span>
                            </button>
                            {item.itemType === 2 && (
                              <Badge variant="warning" size="sm">
                                🛠️ SERVICE
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[11px] text-primary font-semibold">
                              {item.sku}
                            </span>
                            {item.barcode && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                || {item.barcode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          <div>{item.categoryName || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{item.brandName || "Generic"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-foreground">{item.hsnCode || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{item.taxRate}% GST</div>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div className="text-success font-bold">
                            Retail: ₹{item.sellingPrice.toFixed(2)}
                          </div>
                          {item.minimumSellingPrice > 0 && (
                            <div className="text-[11px] text-primary font-semibold">
                              Wholesale: ₹{item.minimumSellingPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            MRP: ₹{item.mrp.toFixed(2)} | Cost: ₹{item.purchasePrice.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.itemType === 2 ? (
                            <Badge variant="neutral" size="sm">
                              Service (No Stock)
                            </Badge>
                          ) : item.trackInventory === false ? (
                            <Badge variant="neutral" size="sm">
                              Non-Stock Item
                            </Badge>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenItemLedger(item)}
                                  className={`font-bold font-mono text-sm hover:underline cursor-pointer ${
                                    item.isLowStock ? "text-danger" : "text-success"
                                  }`}
                                  title="View Stock Ledger"
                                >
                                  {item.totalStock} {item.primaryUomCode}
                                </button>
                                {item.isLowStock && (
                                  <Badge variant="danger" size="sm" dot>
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                              {item.trackBatches && (
                                <span className="text-[10px] text-primary block mt-0.5 font-medium">
                                  ★ Batch Tracked
                                </span>
                              )}
                              {item.trackSerialNumbers && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
                                  ★ Serial/IMEI Tracked
                                </span>
                              )}
                              {(item.trackVariants || isGarments) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenItemLedger(item)}
                                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline mt-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 cursor-pointer"
                                  title="Click to view remaining stock for each size"
                                >
                                  {isGarments ? <Shirt className="w-3 h-3 text-rose-500" /> : <Layers className="w-3 h-3 text-rose-500" />}
                                  <span>{isGarments ? "View Size Breakdown →" : "View Variant Breakdown →"}</span>
                                </button>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {attrs.brand && (
                              <Badge variant="primary" size="sm">
                                {attrs.brand}
                              </Badge>
                            )}
                            {attrs.modelVariant && (
                              <Badge variant="info" size="sm">
                                {attrs.modelVariant}
                              </Badge>
                            )}
                            {attrs.warrantyMonths && (
                              <Badge variant="success" size="sm">
                                {attrs.warrantyMonths}M Warranty
                              </Badge>
                            )}
                            {attrs.schedule && (
                              <Badge variant="danger" size="sm">
                                {attrs.schedule}
                              </Badge>
                            )}
                            {attrs.size && (
                              <Badge variant="primary" size="sm">
                                Size: {attrs.size}
                              </Badge>
                            )}
                            {attrs.color && (
                              <Badge variant="info" size="sm">
                                {attrs.color}
                              </Badge>
                            )}
                            {attrs.netWeight && (
                              <Badge variant="success" size="sm">
                                {attrs.netWeight}
                              </Badge>
                            )}
                            {attrs.dimension && (
                              <Badge variant="neutral" size="sm">
                                {attrs.dimension}
                              </Badge>
                            )}
                            {item.itemType !== 2 && (
                              <button
                                type="button"
                                onClick={() => handleOpenItemLedger(item)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-surface-elevated hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border transition-colors cursor-pointer"
                                title="Open Item Stock Ledger"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>Ledger</span>
                              </button>
                            )}
                            {item.itemType !== 2 && (
                              <Link
                                href={`/app/inventory/barcode?itemId=${item.id}&mode=all-variants`}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/80 transition-colors cursor-pointer"
                                title="Print Barcode Labels & Thermal Swing-Tags"
                              >
                                <Barcode className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                <span>Tags</span>
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors cursor-pointer"
                              title="Edit Rates & Product Details"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(item)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground bg-surface-elevated/30">
          <div className="flex items-center space-x-3">
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {totalCount > 0 ? (pageNumber - 1) * pageSize + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min(pageNumber * pageSize, totalCount)}
              </strong>{" "}
              of <strong className="text-primary font-bold">{totalCount}</strong> products
            </span>
            <span className="text-border">|</span>
            <div className="flex items-center space-x-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageNumber(1);
                }}
                className="px-2 py-1 bg-surface border border-border rounded text-foreground focus:outline-none focus:border-primary font-semibold cursor-pointer"
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="1000">1000 (All)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber(1)}
              className="px-2.5 py-1 bg-surface-elevated hover:bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed rounded text-foreground transition-colors"
              title="First Page"
            >
              « First
            </button>
            <button
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-surface-elevated hover:bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed rounded text-foreground flex items-center space-x-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-3 py-1 font-semibold text-foreground bg-surface border border-border rounded">
              Page {pageNumber} of {totalPages}
            </span>

            <button
              disabled={pageNumber >= totalPages || loading}
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-surface-elevated hover:bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed rounded text-foreground flex items-center space-x-1 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={pageNumber >= totalPages || loading}
              onClick={() => setPageNumber(totalPages)}
              className="px-2.5 py-1 bg-surface-elevated hover:bg-surface border border-border disabled:opacity-40 disabled:cursor-not-allowed rounded text-foreground transition-colors"
              title="Last Page"
            >
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal (Full Screen View) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex flex-col overflow-hidden">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full h-full p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3.5 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-inner">
                  {form.itemType === 2 ? (
                    <Wrench className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Boxes className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                    <span>{form.itemType === 2 ? "Add Service to Catalog" : "Add Product to Master Catalog"}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {form.itemType === 2
                      ? "Services, consultations, repairs, AMC, and labor (No physical stock balances)."
                      : `Physical products & goods for ${profile?.industryName || "your enterprise"}.`}
                  </p>
                </div>
              </div>

              {/* Segmented Type Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shrink-0 sm:mr-8">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, itemType: 1, trackInventory: true }))}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    (form.itemType || 1) === 1
                      ? "bg-orange-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>📦 Physical Goods</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      itemType: 2,
                      trackInventory: false,
                      trackBatches: false,
                      trackSerialNumbers: false,
                      initialStock: 0,
                    }))
                  }
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    form.itemType === 2
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>🛠️ Service / Labor</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden pr-1 flex-1 space-y-2">
                {form.itemType === 2 ? (
                  /* SERVICE FORM (2 COLUMNS) */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* Left: Service Identity */}
                    <div className="lg:col-span-6 bg-amber-50/40 dark:bg-slate-950/60 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                          <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Service Specification</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                          Step 1 • Service Details
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-8 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            Service / Labor Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. AC Servicing / Web AMC"
                            value={form.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setForm((prev) => ({
                                ...prev,
                                name: newName,
                                sku: prev.sku ? prev.sku : generateAutoSku(newName),
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 font-medium transition"
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Code / SKU</label>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                              className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Auto</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. SRV-001"
                            value={form.sku}
                            onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                            SAC Code *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 998311"
                            value={form.hsnCode || ""}
                            onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Billing Unit *</label>
                            <button
                              type="button"
                              onClick={() => setIsUomModalOpen(true)}
                              className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                            >
                              +Unit
                            </button>
                          </div>
                          <select
                            value={form.primaryUomId || (units.length > 0 ? units[0].id : DEFAULT_STANDARD_UNITS[0].id)}
                            onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500 transition cursor-pointer"
                          >
                            {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Category</label>
                          <select
                            value={form.categoryId || ""}
                            onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                          >
                            <option value="">None / General</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          Description / Scope (Invoice Note)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Includes inspection, replacement parts labor"
                          value={form.shortDescription || ""}
                          onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>

                    {/* Right: Service Pricing */}
                    <div className="lg:col-span-6 bg-amber-50/40 dark:bg-slate-950/60 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-400">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          <span>Service Billing &amp; GST Rates</span>
                        </div>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200/90 dark:bg-slate-800 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                            className={`px-2 py-0.5 font-bold rounded cursor-pointer ${
                              !form.isTaxInclusive ? "bg-white dark:bg-slate-900 text-orange-700 shadow-xs" : "text-slate-600"
                            }`}
                          >
                            Without GST
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                            className={`px-2 py-0.5 font-bold rounded cursor-pointer ${
                              form.isTaxInclusive ? "bg-white dark:bg-slate-900 text-emerald-700 shadow-xs" : "text-slate-600"
                            }`}
                          >
                            With GST
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/80 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                            <span>Service Fee Rate (₹) *</span>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">Billed</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={form.sellingPrice || ""}
                            onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded text-xs text-emerald-950 dark:text-emerald-200 font-mono font-bold focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>Internal Cost (₹)</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Expense</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={form.purchasePrice || ""}
                            onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-slate-50/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-amber-100 dark:border-slate-800 items-center">
                        <div className="sm:col-span-5 flex items-center gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">GST:</label>
                          <select
                            value={form.taxRate}
                            onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                          >
                            <option value="18">18% GST (Standard)</option>
                            <option value="0">0% (Exempt)</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="28">28% GST</option>
                          </select>
                        </div>

                        <div className="sm:col-span-7">
                          {Number(form.taxRate || 0) > 0 && Number(form.sellingPrice || 0) > 0 ? (() => {
                            const sp = Number(form.sellingPrice || 0);
                            const tr = Number(form.taxRate || 0);
                            const isIncl = Boolean(form.isTaxInclusive);
                            const basic = isIncl ? sp / (1 + tr / 100) : sp;
                            const gstAmt = isIncl ? sp - basic : (sp * tr) / 100;
                            const total = isIncl ? sp : sp + gstAmt;

                            return (
                              <div className="p-1.5 bg-white dark:bg-slate-950 border border-amber-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                                <span>Basic: <strong className="text-slate-900 dark:text-white font-mono">₹{basic.toFixed(2)}</strong></span>
                                <span>+ GST: <strong className="text-amber-600 dark:text-amber-400 font-mono">₹{gstAmt.toFixed(2)}</strong></span>
                                <span>= <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">₹{total.toFixed(2)}</strong></span>
                              </div>
                            );
                          })() : (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Enter service fee for tax preview.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PHYSICAL GOODS FORM (ZERO HORIZONTAL SCROLL & DYNAMIC 2-ZONE ERP WORKSPACE) */
                  (() => {
                    const isMultiVariantSupported =
                      industryConfig.code === "GARMENTS" ||
                      industryConfig.code === "HARDWARE" ||
                      industryConfig.code === "FMCG" ||
                      industryConfig.code === "SWEETS_BAKERY";
                    const isMultiVariantActive = isMultiVariantSupported && isMatrixEnabled;
                    const totalVariantsStock = matrixRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
                    const selectedUnitCode = units.find((u) => u.id === form.primaryUomId)?.code || "Pcs";

                    return (
                      <div className="space-y-2">
                        {/* ──── COMPACT UNIVERSAL BARCODE & MASTER CATALOG INGESTION BAR ──── */}
                        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 border border-orange-200 dark:border-orange-800/60 rounded-xl px-3 py-1.5 shadow-2xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-lg bg-orange-600 text-white shadow-2xs shrink-0">
                                <Barcode className="w-4 h-4" />
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Quick Barcode Search:
                                </span>
                                <span className="text-[10px] text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 px-2 py-0.2 rounded-full font-semibold border border-orange-200 dark:border-orange-800 hidden sm:inline">
                                  Auto Master Lookup
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 max-w-lg justify-end">
                              <div className="relative flex-1 max-w-sm">
                                <Barcode className="w-3.5 h-3.5 text-orange-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Scan with barcode gun, camera or type..."
                                  value={quickBarcodeQuery}
                                  onChange={(e) => setQuickBarcodeQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleLookupBarcode(quickBarcodeQuery);
                                    }
                                  }}
                                  className="w-full pl-8 pr-7 py-1 bg-white dark:bg-slate-950 border border-orange-300 dark:border-orange-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-orange-600 shadow-2xs"
                                />
                                {quickBarcodeQuery && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBarcodeQuery("");
                                      setBarcodeLookupNotice(null);
                                    }}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    title="Clear"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setIsCameraScannerOpen(true)}
                                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                                title="Scan Barcode via Laptop Webcam or Phone Camera"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Camera</span>
                              </button>

                              <button
                                type="button"
                                disabled={isLookingUpBarcode || !quickBarcodeQuery.trim()}
                                onClick={() => handleLookupBarcode(quickBarcodeQuery)}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                              >
                                {isLookingUpBarcode ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Searching...</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="w-3.5 h-3.5" />
                                    <span>Lookup</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Notice Box if found in store or master */}
                          {barcodeLookupNotice && (
                            <div
                              className={`p-2 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                                barcodeLookupNotice.type === "warning"
                                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200"
                                  : barcodeLookupNotice.type === "success"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200"
                                  : barcodeLookupNotice.type === "info"
                                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/80 text-blue-900 dark:text-blue-200"
                                  : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200"
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1.5">
                                  {barcodeLookupNotice.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                                  {barcodeLookupNotice.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                  {barcodeLookupNotice.type === "info" && <Sparkles className="w-4 h-4 text-blue-600" />}
                                  <span>{barcodeLookupNotice.message}</span>
                                </span>
                                {barcodeLookupNotice.storeItem && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const item = barcodeLookupNotice.storeItem!;
                                      setIsModalOpen(false);
                                      handleOpenEditModal(item);
                                    }}
                                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold shadow-2xs cursor-pointer"
                                  >
                                    Open in Edit Mode ↗
                                  </button>
                                )}
                              </div>
                              {barcodeLookupNotice.details && (
                                <p className="text-[11px] opacity-90 pl-5">{barcodeLookupNotice.details}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ──── DUAL-ZONE WORKSPACE ──── */}
                        {isMultiVariantActive ? (
                          /* SCENARIO A: MULTI-VARIANT ACTIVE (BALANCED SPLIT SCREEN) */
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
                            {/* LEFT PANEL: Identity, GST, Storage & Attributes */}
                            <div className="lg:col-span-5 xl:col-span-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden pr-1">
                              {/* Card 1: Product Identity */}
                              <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    <Tag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                    <span>Product Identity</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.2 rounded-full border border-orange-200 dark:border-orange-800">
                                    Step 1 • Details
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                                    <div className="sm:col-span-8 space-y-0.5">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Product Name *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder={industryConfig.placeholders.itemName}
                                        value={form.name}
                                        onChange={(e) => {
                                          const newName = e.target.value;
                                          setForm((prev) => ({
                                            ...prev,
                                            name: newName,
                                            sku: prev.sku ? prev.sku : generateAutoSku(newName),
                                          }));
                                        }}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 font-medium transition"
                                      />
                                    </div>
                                    <div className="sm:col-span-4 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">SKU Code</label>
                                        <button
                                          type="button"
                                          onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                          title="Auto-generate unique SKU"
                                        >
                                          <Sparkles className="w-2.5 h-2.5" />
                                          <span>Auto</span>
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Auto SKU"
                                        value={form.sku}
                                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                    <div className="space-y-0.5">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Category</label>
                                      <select
                                        value={form.categoryId || ""}
                                        onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                                        className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      >
                                        <option value="">None</option>
                                        {categories.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Brand</label>
                                        <button
                                          type="button"
                                          onClick={() => setIsBrandModalOpen(true)}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold cursor-pointer"
                                        >
                                          +Add
                                        </button>
                                      </div>
                                      <select
                                        value={form.brandId || ""}
                                        onChange={(e) => setForm({ ...form, brandId: e.target.value || undefined })}
                                        className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      >
                                        <option value="">Generic</option>
                                        {brands.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            {b.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">UOM *</label>
                                        <button
                                          type="button"
                                          onClick={() => setIsUomModalOpen(true)}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold cursor-pointer"
                                        >
                                          +Unit
                                        </button>
                                      </div>
                                      <select
                                        value={form.primaryUomId || (units.length > 0 ? units[0].id : DEFAULT_STANDARD_UNITS[0].id)}
                                        onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                                        className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 transition cursor-pointer"
                                      >
                                        {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name} ({u.code})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-0.5">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        HSN / SAC
                                      </label>
                                      <input
                                        type="text"
                                        placeholder={industryConfig.placeholders.hsn}
                                        value={form.hsnCode || ""}
                                        onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                                        className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                                    <div className="sm:col-span-5 space-y-0.5">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Barcode className="w-3 h-3 text-slate-400" />
                                        <span>{isMatrixEnabled ? "Master / Box Barcode (Optional)" : "Master Barcode"}</span>
                                      </label>
                                      <input
                                        type="text"
                                        placeholder={isMatrixEnabled ? "Box / Carton barcode" : "Optional barcode"}
                                        value={form.barcode || ""}
                                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 transition"
                                      />
                                      {isMatrixEnabled && (
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                                          कार्टन/पेटी का कॉमन कोड। साइज-अनुसार कोड दाएं टेबल में भरें।
                                        </p>
                                      )}
                                    </div>
                                    <div className="sm:col-span-7 space-y-0.5">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Packaging / Description
                                      </label>
                                      <input
                                        type="text"
                                        placeholder={industryConfig.placeholders.packaging}
                                        value={form.shortDescription || ""}
                                        onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: GST & Tax Slab */}
                              <div className="bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border border-emerald-200/80 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-black shrink-0" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Tax &amp; GST Setup</span>
                                  </div>
                                  {/* GST Tax Mode Toggle */}
                                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                                      className={`px-2 py-0.5 font-bold rounded transition-all cursor-pointer ${
                                        !form.isTaxInclusive
                                          ? "bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-400 shadow-xs"
                                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                      }`}
                                    >
                                      Without GST
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                                      className={`px-2 py-0.5 font-bold rounded transition-all cursor-pointer ${
                                        form.isTaxInclusive
                                          ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                      }`}
                                    >
                                      With GST
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                                  <div className="sm:col-span-5 flex items-center gap-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">GST:</label>
                                    <select
                                      value={form.taxRate}
                                      onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-orange-500"
                                    >
                                      <option value="0">0% (Nil)</option>
                                      <option value="0.25">0.25% GST (Rough Gems)</option>
                                      <option value="1.5">1.5% GST (Diamonds & Gems)</option>
                                      <option value="3">3% GST (Jewellery & Bullion)</option>
                                      <option value="5">5% GST</option>
                                      <option value="12">12% GST</option>
                                      <option value="18">18% GST (Standard)</option>
                                      <option value="28">28% GST</option>
                                    </select>
                                  </div>

                                  <div className="sm:col-span-7">
                                    <div className="px-2 py-1 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded text-[10px] text-amber-900 dark:text-amber-300 flex items-center justify-between">
                                      <span className="font-semibold">Rates managed in variant table &rarr;</span>
                                      <span className="font-bold px-1 py-0.2 bg-amber-200/70 dark:bg-amber-900/80 rounded text-[9px] uppercase">
                                        Per Variant
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Storage & Specifications */}
                              <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    <span>Storage &amp; Rack</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.2 rounded-full border border-purple-200 dark:border-purple-800">
                                    Storage Info
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Min Stock Alert</label>
                                    <input
                                      type="number"
                                      placeholder="e.g. 5"
                                      value={form.minimumStockAlert || ""}
                                      onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rack / Location</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Rack A-12"
                                      value={form.rackLocation || ""}
                                      onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  {isHardwareMatrix && (
                                    <>
                                      <div className="space-y-0.5">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dimension / Length</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 90m, 1/2 inch"
                                          value={hardwareDimension}
                                          onChange={(e) => setHardwareDimension(e.target.value)}
                                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Grade / Finish</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. SS-304, FR PVC"
                                          value={hardwareGrade}
                                          onChange={(e) => setHardwareGrade(e.target.value)}
                                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Card 4: Variant Attribute Picker (Packs & Flavors/Shades/Sizes) */}
                              <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 space-y-2.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {isSweetsBakeryMatrix ? (
                                      <Cake className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    ) : isFmcgMatrix ? (
                                      <Boxes className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : isHardwareMatrix ? (
                                      <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                    ) : (
                                      <Shirt className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                    )}
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {isSweetsBakeryMatrix
                                        ? "Packs & Flavors Setup"
                                        : isFmcgMatrix
                                        ? "Packs & Varieties Setup"
                                        : isHardwareMatrix
                                        ? isPureHardwareStore
                                          ? "Sizes & Grades Setup"
                                          : isPurePaintStore
                                          ? "Packs & Shades Setup"
                                          : "Packs, Sizes & Shades Setup"
                                        : "Sizes & Colors Setup"}
                                    </span>
                                  </div>
                                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isMatrixEnabled}
                                      onChange={(e) => setIsMatrixEnabled(e.target.checked)}
                                      className="rounded border-slate-300 text-orange-600 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span>Multiple Variants</span>
                                  </label>
                                </div>

                                {/* Step 1: Pack Sizes / Weights */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      1. {isHardwareMatrix
                                        ? isPureHardwareStore
                                          ? "Dimensions / Gauges / Sizes"
                                          : isPurePaintStore
                                          ? "Pack Sizes (Vol / Wt)"
                                          : "Sizes & Pack Sizes"
                                        : (isFmcgMatrix || isSweetsBakeryMatrix)
                                        ? "Pack Sizes"
                                        : "Sizes"} ({matrixSizes.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["500 g", "1 Kg", "2 Kg", "5 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Bakery (500g-5k)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["1 Kg", "2 Kg", "5 Kg", "10 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Kg (1k-10k)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      ) : isHardwareMatrix ? (
                                        <>
                                          {isPureHardwareStore ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["1/2 inch", "3/4 inch", "1 inch", "1.5 inch", "2 inch"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                Fittings (1/2-2")
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["25mm", "50mm", "75mm", "100mm"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                Metric (25-100mm)
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["14 Gauge", "16 Gauge", "18 Gauge"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                Gauges (14-18G)
                                              </button>
                                            </>
                                          ) : isPurePaintStore ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["500 ml", "1 L", "4 L", "10 L", "20 L"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Litres (500ml-20L)
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["1 Kg", "5 Kg", "20 Kg"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Kg (1k-20k)
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["1 L", "4 L", "10 L", "20 L"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Litres (1L-20L)
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["1/2 inch", "1 inch", "2 inch"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                Inches
                                              </button>
                                            </>
                                          )}
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {isFootwearStore ? (
                                            <button
                                              type="button"
                                              onClick={() => setMatrixSizes(["6", "7", "8", "9", "10", "11", "12"])}
                                              className="text-orange-600 hover:underline cursor-pointer"
                                            >
                                              Sizes (6-12)
                                            </button>
                                          ) : isClothingStore ? (
                                            <button
                                              type="button"
                                              onClick={() => setMatrixSizes(["S", "M", "L", "XL", "XXL"])}
                                              className="text-orange-600 hover:underline cursor-pointer"
                                            >
                                              S-XXL
                                            </button>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["6", "7", "8", "9", "10", "11", "12"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Shoes (6-12)
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixSizes(["S", "M", "L", "XL", "XXL"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                S-XXL
                                              </button>
                                            </>
                                          )}
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                                    {availableSizes.map((sz) => {
                                      const selected = matrixSizes.includes(sz);
                                      const isCustom = !(isSweetsBakeryMatrix ? DEFAULT_SWEETS_BAKERY_PACKS : isFmcgMatrix ? DEFAULT_FMCG_PACKS : isHardwareMatrix ? (isPureHardwareStore ? DEFAULT_HARDWARE_PURE_SIZES : isPurePaintStore ? DEFAULT_PAINT_PACKS : DEFAULT_HARDWARE_PACKS) : getBaseSizes(industryConfig.code)).includes(sz);
                                      return (
                                        <button
                                          key={sz}
                                          type="button"
                                          onClick={() => {
                                            setMatrixSizes((prev) =>
                                              prev.includes(sz) ? prev.filter((x) => x !== sz) : [...prev, sz]
                                            );
                                          }}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                            selected
                                              ? "bg-orange-600 text-white shadow-2xs"
                                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                                          }`}
                                        >
                                          <span>{sz}</span>
                                          {selected && <CheckCircle2 className="w-2.5 h-2.5" />}
                                          {isCustom && (
                                            <span
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCustomSize(sz);
                                              }}
                                              className="ml-0.5 w-3 h-3 flex items-center justify-center rounded-full hover:bg-black/25 text-[10px] leading-none"
                                              title={`Remove custom pack ${sz}`}
                                            >
                                              ×
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      placeholder={
                                        isHardwareMatrix
                                          ? isPureHardwareStore
                                            ? "+ Type size/gauge (e.g. 1/2\", 100mm, 16G, 8x4 Ft)..."
                                            : isPurePaintStore
                                            ? "+ Type pack size (e.g. 500ml, 4L, 20L, 5Kg)..."
                                            : "+ Type size/pack (e.g. 1/2\", 1L, 20Kg)..."
                                          : "+ Type pack size (e.g. 500g, 2L, 4XL)..."
                                      }
                                      value={customSizeInput}
                                      onChange={(e) => setCustomSizeInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddCustomSize();
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleAddCustomSize}
                                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                </div>

                                {/* Step 2: Varieties / Flavors / Shades / Colors */}
                                <div className="space-y-1 pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      2. {isHardwareMatrix
                                        ? isPureHardwareStore
                                          ? "Material Finish & Grade"
                                          : isPurePaintStore
                                          ? "Paint Shades & Bases"
                                          : "Finish / Shade / Grade"
                                        : (isFmcgMatrix || isSweetsBakeryMatrix)
                                        ? "Flavors / Varieties"
                                        : "Colors"} ({matrixColors.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1 text-[10px]">
                                      {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Vanilla", "Chocolate", "Butterscotch", "Red Velvet"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Flavors
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Regular / Standard", "Multigrain", "Diet / Sugar Free"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Atta Types
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      ) : isHardwareMatrix ? (
                                        <>
                                          {isPureHardwareStore ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["SS-304", "SS-202", "CP (Chrome Plated)", "Brass / Antique"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                SS / CP / Brass
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["Matt Black", "Zinc Plated / GI", "MS (Mild Steel)", "PVC / UPVC"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                GI / MS / PVC
                                              </button>
                                            </>
                                          ) : isPurePaintStore ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["White", "Off White", "Grey", "Ivory"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Base Shades
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["Base 1", "Base 2", "Base 3"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Machine Bases
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["White", "Off White", "Grey", "Ivory"])}
                                                className="text-orange-600 hover:underline cursor-pointer"
                                              >
                                                Base Shades
                                              </button>
                                              <span>•</span>
                                              <button
                                                type="button"
                                                onClick={() => setMatrixColors(["SS-304", "CP (Chrome Plated)", "Brass / Antique"])}
                                                className="text-amber-600 hover:underline cursor-pointer"
                                              >
                                                Finishes
                                              </button>
                                            </>
                                          )}
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                                    {availableColors.map((c) => {
                                      const selected = matrixColors.includes(c.name);
                                      return (
                                        <button
                                          key={c.name}
                                          type="button"
                                          onClick={() => {
                                            setMatrixColors((prev) =>
                                              prev.includes(c.name) ? prev.filter((x) => x !== c.name) : [...prev, c.name]
                                            );
                                          }}
                                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                                            selected
                                              ? "bg-orange-100 dark:bg-orange-950/80 border border-orange-500 text-orange-950 dark:text-orange-200 font-bold"
                                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300"
                                          }`}
                                        >
                                          <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${c.border ? "border border-slate-300 dark:border-slate-600" : ""}`}
                                            style={{ backgroundColor: c.hex }}
                                          />
                                          <span>{c.name}</span>
                                          {selected && <CheckCircle2 className="w-2.5 h-2.5 text-orange-600" />}
                                          {c.isCustom && (
                                            <span
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCustomColor(c.name);
                                              }}
                                              className="ml-0.5 w-3 h-3 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 text-[10px] leading-none"
                                              title={`Remove custom ${c.name}`}
                                            >
                                              ×
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      placeholder={
                                        isHardwareMatrix
                                          ? isPureHardwareStore
                                            ? "+ Type finish/grade (e.g. SS-304, Antique Brass, CP, GI)..."
                                            : isPurePaintStore
                                            ? "+ Type shade/base (e.g. White, Off White, Base 1)..."
                                            : "+ Type shade/finish (e.g. White, SS-304, CP)..."
                                          : (isFmcgMatrix || isSweetsBakeryMatrix)
                                          ? "+ Type flavor/variety (e.g. Vanilla, Multigrain)..."
                                          : "+ Type color (e.g. Black, White, Red)..."
                                      }
                                      value={customColorInput}
                                      onChange={(e) => setCustomColorInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddCustomColor();
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleAddCustomColor}
                                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                                    >
                                      + Add
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT PANEL: Master Variant Matrix Workspace (Zero Horizontal Scroll!) */}
                            <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-2 overflow-hidden">
                              <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/80 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-2xs flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-1.5 shrink-0">
                                  <div className="flex items-center gap-2">
                                    {isSweetsBakeryMatrix ? (
                                      <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    ) : isFmcgMatrix ? (
                                      <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : isHardwareMatrix ? (
                                      <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    ) : (
                                      <Shirt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    )}
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                      Generated Variants Master Matrix ({matrixRows.length} SKUs)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-orange-700 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 rounded">
                                      {totalVariantsStock} {selectedUnitCode} Total
                                    </span>
                                  </div>
                                </div>

                                {matrixRows.length > 0 ? (
                                  <>
                                    {/* Quick Rates & Bulk Toolbar */}
                                    <div className="p-2 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border border-orange-200/90 dark:border-orange-900/50 rounded-lg text-xs space-y-1.5 shrink-0">
                                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        {/* Quick Pack Rates Filler */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-bold text-orange-900 dark:text-orange-300 flex items-center gap-1 text-[11px]">
                                            <Sparkles className="w-3 h-3 text-orange-600" />
                                            <span>Quick Pack Rates:</span>
                                          </span>
                                          <select
                                            value={quickPackSelect || matrixSizes[0] || ""}
                                            onChange={(e) => setQuickPackSelect(e.target.value)}
                                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                          >
                                            {matrixSizes.map((sz) => (
                                              <option key={sz} value={sz}>{sz}</option>
                                            ))}
                                          </select>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">Pur:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackPurchase}
                                              onChange={(e) => setQuickPackPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">Wholesale:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackWholesale}
                                              onChange={(e) => setQuickPackWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail*:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackRetail}
                                              onChange={(e) => setQuickPackRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-16 px-1 py-0.5 bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 rounded text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">MRP:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackMrp}
                                              onChange={(e) => setQuickPackMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            onClick={handleApplyQuickPackRates}
                                            className="px-2.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                                          >
                                            Apply Pack
                                          </button>
                                        </div>

                                        {/* Bulk Stock Helper */}
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Bulk Stock:</span>
                                          <input
                                            type="number"
                                            min="0"
                                            placeholder="Qty"
                                            value={matrixBulkQty}
                                            onChange={(e) => setMatrixBulkQty(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-center text-[11px] font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (matrixBulkQty !== "") {
                                                setMatrixRows((prev) =>
                                                  prev.map((r) => ({ ...r, quantity: Number(matrixBulkQty) || 0 }))
                                                );
                                              }
                                            }}
                                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold cursor-pointer transition"
                                          >
                                            Apply All
                                          </button>
                                        </div>
                                      </div>

                                      {/* Quick Flavor Rates for FMCG & Bakery */}
                                      {(isFmcgMatrix || isSweetsBakeryMatrix) && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                                          <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1 text-[11px]">
                                            <Sparkles className="w-3 h-3 text-emerald-600" />
                                            <span>Quick Flavor Rates:</span>
                                          </span>
                                          <select
                                            value={quickVarietySelect || matrixColors[0] || ""}
                                            onChange={(e) => setQuickVarietySelect(e.target.value)}
                                            className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none"
                                          >
                                            {matrixColors.map((col) => (
                                              <option key={col} value={col}>{col}</option>
                                            ))}
                                          </select>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">Pur:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickVarietyPurchase}
                                              onChange={(e) => setQuickVarietyPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">Wholesale:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickVarietyWholesale}
                                              onChange={(e) => setQuickVarietyWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail*:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickVarietyRetail}
                                              onChange={(e) => setQuickVarietyRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-16 px-1 py-0.5 bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 rounded text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none"
                                            />
                                          </div>

                                          <div className="flex items-center gap-0.5">
                                            <span className="text-[10px] text-slate-500">MRP:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickVarietyMrp}
                                              onChange={(e) => setQuickVarietyMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-14 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none"
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            onClick={handleApplyQuickVarietyRates}
                                            className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition cursor-pointer"
                                          >
                                            Apply Flavor
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Barcode Camera & Auto-Generation Guidance Banner */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs">
                                      <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
                                        <span>💡 <strong>टिप:</strong> {isHardwareMatrix ? "यदि हार्डवेयर आइटम्स या फिटिंग्स पर बारकोड नहीं है, तो इसे खाली छोड़ दें — UdyogBill हर साइज व फिनिश का नया बारकोड ऑटोमैटिक बना देगा।" : "यदि जूतों/कपड़ों पर बारकोड नहीं है, तो इसे खाली छोड़ दें — UdyogBill हर साइज का अलग और नया बारकोड ऑटोमैटिक बना देगा。"}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (matrixRows.length > 0) {
                                            setVariantCameraTargetIdx(0);
                                            setIsVariantContinuousScan(true);
                                            setIsCameraScannerOpen(true);
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-md bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                                        title="Scan each variant barcode sequentially using phone camera"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>⚡ Rapid Scan Barcodes (लगातार स्कैन)</span>
                                      </button>
                                    </div>

                                    {/* High Density Table (Strictly 100% Width, Zero Horizontal Scroll) */}
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs flex-1 overflow-hidden flex flex-col min-h-0">
                                      <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-275px)]">
                                        <table className="table-fixed w-full min-w-0 border-collapse text-xs">
                                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10 text-[11px]">
                                            <tr>
                                              <th className="w-[20%] py-2 px-2 text-left truncate">
                                                {(isFmcgMatrix || isSweetsBakeryMatrix) ? "Flavor & Pack" : isHardwareMatrix ? (isPureHardwareStore ? "Size & Finish/Grade" : isPurePaintStore ? "Pack & Shade" : "Size/Pack & Finish/Shade") : "Size & Color"}
                                              </th>
                                              <th className="w-[13%] py-2 px-1 text-left truncate">Auto SKU</th>
                                              <th className="w-[12%] py-2 px-1 text-center truncate">Barcode</th>
                                              <th className="w-[11%] py-2 px-1 text-center truncate">Cost (₹)</th>
                                              <th className="w-[11%] py-2 px-1 text-center truncate">Wholesale</th>
                                              <th className="w-[13%] py-2 px-1 text-center text-emerald-700 dark:text-emerald-400 truncate">Retail*</th>
                                              <th className="w-[10%] py-2 px-1 text-center truncate">MRP (₹)</th>
                                              <th className="w-[10%] py-2 px-1 text-center text-orange-600 dark:text-orange-400 truncate">Stock</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {matrixRows.map((r, idx) => (
                                              <tr key={`${r.size}-${r.color}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-1 px-2 font-semibold text-slate-900 dark:text-white truncate">
                                                  <div className="inline-flex items-center gap-1 max-w-full truncate">
                                                    {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                                      <>
                                                        <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 rounded text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 truncate">
                                                          {r.color}
                                                        </span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{r.size}</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 truncate">
                                                          {r.size}
                                                        </span>
                                                        <span className="font-bold text-xs truncate">{r.color}</span>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>

                                                <td className="py-1 px-1 font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate" title={r.sku}>
                                                  {r.sku}
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <div className="flex items-center gap-0.5">
                                                    <input
                                                      type="text"
                                                      value={r.barcode || ""}
                                                      placeholder="Scan / Auto"
                                                      onChange={(e) => handleMatrixFieldChange(idx, "barcode", e.target.value)}
                                                      className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-400 placeholder:text-[9px]"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setVariantCameraTargetIdx(idx);
                                                        setIsVariantContinuousScan(false);
                                                        setIsCameraScannerOpen(true);
                                                      }}
                                                      className="p-1 rounded bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-orange-600 transition-colors shrink-0 cursor-pointer"
                                                      title={`Scan barcode for ${r.size} ${r.color} with camera`}
                                                    >
                                                      <Camera className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={r.purchasePrice ?? ""}
                                                    placeholder="0"
                                                    onChange={(e) => handleMatrixFieldChange(idx, "purchasePrice", e.target.value)}
                                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                  />
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={r.wholesalePrice ?? ""}
                                                    placeholder="0"
                                                    onChange={(e) => handleMatrixFieldChange(idx, "wholesalePrice", e.target.value)}
                                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                  />
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={r.rate ?? ""}
                                                    placeholder={String(Number(form.sellingPrice || 0) + Number(r.priceAdjustment || 0))}
                                                    onChange={(e) => handleMatrixFieldChange(idx, "rate", e.target.value)}
                                                    className="w-full min-w-0 px-1 py-0.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-emerald-500"
                                                  />
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={r.mrp ?? ""}
                                                    placeholder="0"
                                                    onChange={(e) => handleMatrixFieldChange(idx, "mrp", e.target.value)}
                                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                  />
                                                </td>

                                                <td className="py-1 px-1 text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={r.quantity}
                                                    placeholder="0"
                                                    onChange={(e) => handleMatrixFieldChange(idx, "quantity", e.target.value)}
                                                    className="w-full min-w-0 px-1 py-0.5 bg-orange-50/60 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center space-y-2">
                                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
                                      <Boxes className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      Variant Matrix Is Empty
                                    </h4>
                                    <p className="text-[11px] text-slate-500 max-w-sm">
                                      Select pack sizes/weights and flavors/shades on the left to instantly generate variant rows with individual billing rates &amp; stock.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* SCENARIO B: STANDARD SINGLE PRODUCT & INDUSTRY WORKSPACE (BALANCED 2-ZONE SPLIT SCREEN) */
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
                            {/* LEFT PANEL: Identity, Pricing, and Industry Attributes (~38% width, lg:col-span-5 xl:col-span-4) */}
                            <div className="lg:col-span-5 xl:col-span-4 space-y-2 max-h-[calc(100vh-210px)] overflow-y-auto overflow-x-hidden pr-1">
                              {/* Card 1: Product Identity */}
                              <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    <Tag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                    <span>Product Identity</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.2 rounded-full border border-orange-200 dark:border-orange-800">
                                    Step 1 • Details
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {/* Name and Auto SKU */}
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <div className="sm:col-span-8 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Product Name *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder={industryConfig.placeholders.itemName}
                                        value={form.name}
                                        onChange={(e) => {
                                          const newName = e.target.value;
                                          setForm((prev) => ({
                                            ...prev,
                                            name: newName,
                                            sku: prev.sku ? prev.sku : generateAutoSku(newName),
                                          }));
                                        }}
                                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 font-medium transition"
                                      />
                                    </div>

                                    <div className="sm:col-span-4 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">SKU Code</label>
                                        <button
                                          type="button"
                                          onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Sparkles className="w-2.5 h-2.5" />
                                          <span>Auto</span>
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Auto SKU"
                                        value={form.sku}
                                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>

                                  {/* Category, Brand, UOM, HSN */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Category</label>
                                      <select
                                        value={form.categoryId || ""}
                                        onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      >
                                        <option value="">None</option>
                                        {categories.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Brand</label>
                                        <button
                                          type="button"
                                          onClick={() => setIsBrandModalOpen(true)}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline font-bold cursor-pointer"
                                        >
                                          +Add
                                        </button>
                                      </div>
                                      <select
                                        value={form.brandId || ""}
                                        onChange={(e) => setForm({ ...form, brandId: e.target.value || undefined })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      >
                                        <option value="">Generic</option>
                                        {brands.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            {b.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">UOM *</label>
                                        <button
                                          type="button"
                                          onClick={() => setIsUomModalOpen(true)}
                                          className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline font-bold cursor-pointer"
                                        >
                                          +Unit
                                        </button>
                                      </div>
                                      <select
                                        value={form.primaryUomId || (units.length > 0 ? units[0].id : DEFAULT_STANDARD_UNITS[0].id)}
                                        onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 transition cursor-pointer"
                                      >
                                        {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name} ({u.code})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        HSN / SAC
                                      </label>
                                      <input
                                        type="text"
                                        placeholder={industryConfig.placeholders.hsn}
                                        value={form.hsnCode || ""}
                                        onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>

                                  {/* Barcode & Packaging */}
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <div className="sm:col-span-5 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Barcode className="w-3 h-3 text-slate-400" />
                                        <span>Barcode (Optional)</span>
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Scan barcode"
                                        value={form.barcode || ""}
                                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                    <div className="sm:col-span-7 space-y-1">
                                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                        Short Description / Packaging
                                      </label>
                                      <input
                                        type="text"
                                        placeholder={industryConfig.placeholders.packaging}
                                        value={form.shortDescription || ""}
                                        onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Pricing & Multi-Tier Rates */}
                              <div className="bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border border-emerald-200/80 dark:border-slate-800 rounded-xl p-2.5 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-black shrink-0" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">Pricing &amp; Rates (₹)</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Step 2
                                    </span>
                                  </div>

                                  {/* GST Tax Mode Toggle */}
                                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                                      className={`px-2 py-0.5 font-bold rounded transition-all cursor-pointer ${
                                        !form.isTaxInclusive
                                          ? "bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-400 shadow-xs"
                                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                      }`}
                                    >
                                      Without GST
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                                      className={`px-2 py-0.5 font-bold rounded transition-all cursor-pointer ${
                                        form.isTaxInclusive
                                          ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                      }`}
                                    >
                                      With GST
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {/* Purchase Rate */}
                                  <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                      <span>Purchase (₹)</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={form.purchasePrice || ""}
                                      onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-1.5 py-0.5 bg-slate-50/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-emerald-600"
                                    />
                                  </div>

                                  {/* Retail Rate */}
                                  <div className="p-1.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 dark:border-emerald-500/50 rounded-lg space-y-0.5 shadow-2xs">
                                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                      <span>Retail Rate (₹)*</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      required
                                      placeholder="0.00"
                                      value={form.sellingPrice || ""}
                                      onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded text-xs text-emerald-950 dark:text-emerald-300 font-mono font-bold focus:outline-none"
                                    />
                                  </div>

                                  {/* Wholesale Rate */}
                                  <div className="p-1.5 bg-orange-50/40 dark:bg-orange-950/20 border-2 border-orange-400/70 dark:border-orange-500/50 rounded-lg space-y-0.5 shadow-2xs">
                                    <div className="text-[10px] font-bold text-orange-800 dark:text-orange-300">
                                      <span>Wholesale (₹)</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={form.minimumSellingPrice || ""}
                                      onChange={(e) => setForm({ ...form, minimumSellingPrice: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border-2 border-orange-400 rounded text-xs text-orange-950 dark:text-orange-300 font-mono font-bold focus:outline-none"
                                    />
                                  </div>

                                  {/* MRP */}
                                  <div className="p-1.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 rounded-lg space-y-0.5 shadow-2xs">
                                    <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                      <span>MRP (₹)</span>
                                    </div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={form.mrp || ""}
                                      onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-950 dark:text-amber-300 font-mono font-bold focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* GST Slab & Real-time Tax Preview */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-emerald-100/80 dark:border-slate-800 items-center">
                                  <div className="sm:col-span-5 flex items-center gap-1.5">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">GST:</label>
                                    <select
                                      value={form.taxRate}
                                      onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-orange-500"
                                    >
                                      <option value="0">0% (Nil)</option>
                                      <option value="0.25">0.25% GST (Rough Gems)</option>
                                      <option value="1.5">1.5% GST (Diamonds & Gems)</option>
                                      <option value="3">3% GST (Jewellery & Bullion)</option>
                                      <option value="5">5% GST</option>
                                      <option value="12">12% GST</option>
                                      <option value="18">18% GST (Standard)</option>
                                      <option value="28">28% GST</option>
                                    </select>
                                  </div>

                                  <div className="sm:col-span-7">
                                    {Number(form.taxRate || 0) > 0 && (Number(form.sellingPrice || 0) > 0 || Number(form.purchasePrice || 0) > 0) ? (() => {
                                      const sp = Number(form.sellingPrice || 0);
                                      const tr = Number(form.taxRate || 0);
                                      const isIncl = Boolean(form.isTaxInclusive);
                                      const basic = isIncl ? sp / (1 + tr / 100) : sp;
                                      const gstAmt = isIncl ? sp - basic : (sp * tr) / 100;
                                      const total = isIncl ? sp : sp + gstAmt;

                                      return (
                                        <div className="p-1 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                                          <span>Basic: <strong className="text-slate-900 dark:text-white font-mono">₹{basic.toFixed(2)}</strong></span>
                                          <span>+ GST: <strong className="text-orange-600 dark:text-orange-400 font-mono">₹{gstAmt.toFixed(2)}</strong></span>
                                          <span>= <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">₹{total.toFixed(2)}</strong></span>
                                        </div>
                                      );
                                    })() : (
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        Tax calculation updates with retail rate.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Storage & Industry Attributes */}
                              <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                    <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    <span>{industryConfig.displayName} Specifications</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.2 rounded-full border border-purple-200 dark:border-purple-800">
                                    Industry Details
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Min Stock Alert</label>
                                    <input
                                      type="number"
                                      placeholder="e.g. 5"
                                      value={form.minimumStockAlert || ""}
                                      onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rack / Location</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Rack A-12"
                                      value={form.rackLocation || ""}
                                      onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>

                                  {/* ELECTRONICS Fields */}
                                  {industryConfig.code === "ELECTRONICS" && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Brand / Maker</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Samsung, Apple, boAt"
                                          value={elecBrand}
                                          onChange={(e) => setElecBrand(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Model / Variant</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 12GB RAM, 256GB Gray"
                                          value={elecModel}
                                          onChange={(e) => setElecModel(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Warranty (Months)</label>
                                        <input
                                          type="number"
                                          placeholder="e.g. 12"
                                          value={elecWarranty}
                                          onChange={(e) => setElecWarranty(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Serial Tracking Mode</label>
                                        <select
                                          value={elecTrackingMode}
                                          onChange={(e) => setElecTrackingMode(e.target.value)}
                                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        >
                                          <option value="DUAL_IMEI">IMEI 1 &amp; IMEI 2 (Phones)</option>
                                          <option value="SINGLE_SERIAL">Single Serial No (Laptops/Audio)</option>
                                          <option value="BARCODE_ONLY">Barcode / SKU Only (Accessories)</option>
                                        </select>
                                      </div>
                                    </>
                                  )}

                                  {/* HARDWARE Fields */}
                                  {industryConfig.code === "HARDWARE" && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dimension / Length</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 90m, 1/2 inch, 2.5mm"
                                          value={hardwareDimension}
                                          onChange={(e) => setHardwareDimension(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Grade / Finish</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. SS-304, FR PVC"
                                          value={hardwareGrade}
                                          onChange={(e) => setHardwareGrade(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* FMCG Fields */}
                                  {industryConfig.code === "FMCG" && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Net Weight / Volume</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 1L, 500g, 5kg"
                                          value={fmcgNetWeight}
                                          onChange={(e) => setFmcgNetWeight(e.target.value)}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Packaging Type</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Pouch, Tin, Bottle"
                                          value={form.shortDescription || ""}
                                          onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* SWEETS & BAKERY Fields */}
                                  {industryConfig.code === "SWEETS_BAKERY" && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dietary Category</label>
                                        <select
                                          value={form.shortDescription || "Pure Veg (Eggless)"}
                                          onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        >
                                          <option value="Pure Veg (Eggless)">Pure Veg (Eggless)</option>
                                          <option value="Contains Egg">Contains Egg</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Shelf Life (Days)</label>
                                        <input
                                          type="number"
                                          placeholder="e.g. 3"
                                          value={form.minimumStockAlert || ""}
                                          onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                                          className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                                        />
                                      </div>
                                    </>
                                  )}
                                                                   {/* AUTOPARTS Fields */}
                                   {industryConfig.code === "AUTOPARTS" && (
                                     <>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           OEM Part No (Genuine)
                                         </label>
                                         <input
                                           type="text"
                                           placeholder="e.g. 16510M68K00 / 254701100114"
                                           value={autoOemPartNo}
                                           onChange={(e) => setAutoOemPartNo(e.target.value.toUpperCase())}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Vehicle Compatibility
                                         </label>
                                         <input
                                           type="text"
                                           placeholder="e.g. Maruti Swift (2012-2020) Petrol"
                                           value={autoVehicleFitment}
                                           onChange={(e) => setAutoVehicleFitment(e.target.value)}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Fitting Position / Side
                                         </label>
                                         <select
                                           value={autoFittingPosition}
                                           onChange={(e) => setAutoFittingPosition(e.target.value)}
                                           className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                                         >
                                           <option value="Universal">Universal / Engine</option>
                                           <option value="Front-LH">Front - LH (Left Hand)</option>
                                           <option value="Front-RH">Front - RH (Right Hand)</option>
                                           <option value="Rear-LH">Rear - LH (Left Hand)</option>
                                           <option value="Rear-RH">Rear - RH (Right Hand)</option>
                                           <option value="Both Sides">Both Sides (Pair)</option>
                                           <option value="Upper">Upper</option>
                                           <option value="Lower">Lower</option>
                                         </select>
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Mechanic Net Rate (₹)
                                         </label>
                                         <input
                                           type="number"
                                           step="0.01"
                                           placeholder="e.g. Mistri Price"
                                           value={autoMechanicRate}
                                           onChange={(e) => setAutoMechanicRate(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Aftermarket OES Brand
                                         </label>
                                         <input
                                           type="text"
                                           placeholder="e.g. Bosch, Uno Minda, Lumax"
                                           value={autoOesBrand}
                                           onChange={(e) => setAutoOesBrand(e.target.value)}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                         />
                                       </div>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           OES Part Number
                                         </label>
                                         <input
                                           type="text"
                                           placeholder="e.g. F002H20398"
                                           value={autoOesPartNo}
                                           onChange={(e) => setAutoOesPartNo(e.target.value.toUpperCase())}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                         />
                                       </div>
                                       <div className="col-span-2 pt-1">
                                         <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                                           <input
                                             type="checkbox"
                                             checked={autoBatteryExchangeEligible}
                                             onChange={(e) => setAutoBatteryExchangeEligible(e.target.checked)}
                                             className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                                           />
                                           <span>Battery Scrap / Old Core Exchange Applicable</span>
                                         </label>
                                       </div>
                                        {/* Auto Parts Multi-Number & Brand Matrix Toggle */}
                                        <div className="col-span-2 mt-1 p-2.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 border border-orange-200 dark:border-orange-900/60 rounded-xl space-y-2 text-xs">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1 rounded-lg bg-orange-600 text-white shrink-0">
                                                <Settings2 className="w-3.5 h-3.5" />
                                              </div>
                                              <div>
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                  Multi-Number &amp; Brand Matrix
                                                </span>
                                                <p className="text-[10px] text-slate-500">
                                                  Same part with multiple gear numbers (37/7, 39/8) or brands (MGP, Bosch, Minda)
                                                </p>
                                              </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isAutoPartsMatrixEnabled}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setIsAutoPartsMatrixEnabled(checked);
                                                  if (checked && autoPartsMatrixRows.length === 0) {
                                                    handleAddAutoPartsMatrixRow("37/7", "Maruti Genuine (MGP)");
                                                    handleAddAutoPartsMatrixRow("39/8", "Bosch");
                                                  }
                                                }}
                                                className="sr-only peer"
                                              />
                                              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                                            </label>
                                          </div>

                                          {isAutoPartsMatrixEnabled && (
                                            <div className="pt-1.5 border-t border-orange-200/60 dark:border-slate-800 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Specification / Number Type
                                              </label>
                                              <select
                                                value={autoPartsSpecType}
                                                onChange={(e) => setAutoPartsSpecType(e.target.value as any)}
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                                              >
                                                <option value="GEAR_RATIO">Gear Teeth / Ratio (e.g. 37/7, 39/8, 41/9)</option>
                                                <option value="BEARING_NO">Bearing Number (e.g. 6201, 6204, 6302)</option>
                                                <option value="BORE_SIZE">Piston / Bore Size (e.g. STD, 0.25, 0.50)</option>
                                                <option value="GEAR_POSITION">Gear Position (1st Gear, 2nd Gear, Reverse)</option>
                                                <option value="CUSTOM">Custom Model / Size Number</option>
                                              </select>
                                            </div>
                                          )}
                                        </div>
                                     </>
                                   )}

                                   {/* JEWELLERY Fields */}
                                   {industryConfig.code === "JEWELLERY" && (
                                     <>
                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                                           Purity / Karat
                                         </label>
                                         <select
                                           value={jewelleryPurity}
                                           onChange={(e) => setJewelleryPurity(e.target.value)}
                                           className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-500"
                                         >
                                           <option value="24K (999)">24K (999 Pure)</option>
                                           <option value="22K (916)">22K (916 Hallmark)</option>
                                           <option value="18K (750)">18K (750 Gold)</option>
                                           <option value="14K (585)">14K (585 Gold)</option>
                                           <option value="Silver 999">Silver (999 Fine)</option>
                                           <option value="Silver 925">Silver (925 Sterling)</option>
                                           <option value="Imitation">Imitation / Other</option>
                                         </select>
                                       </div>

                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Gross Weight (g)
                                         </label>
                                         <input
                                           type="number"
                                           step="0.001"
                                           min="0"
                                           placeholder="0.000"
                                           value={jewelleryGrossWeight}
                                           onChange={(e) => {
                                             const val = e.target.value ? parseFloat(e.target.value) : "";
                                             setJewelleryGrossWeight(val);
                                             const stone = typeof jewelleryStoneWeight === "number" ? jewelleryStoneWeight : 0;
                                             if (typeof val === "number") {
                                               setJewelleryNetWeight(Math.max(0, parseFloat((val - stone).toFixed(3))));
                                             } else {
                                               setJewelleryNetWeight("");
                                             }
                                           }}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                         />
                                       </div>

                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Stone Weight (g)
                                         </label>
                                         <input
                                           type="number"
                                           step="0.001"
                                           min="0"
                                           placeholder="0.000"
                                           value={jewelleryStoneWeight}
                                           onChange={(e) => {
                                             const val = e.target.value ? parseFloat(e.target.value) : "";
                                             setJewelleryStoneWeight(val);
                                             const gross = typeof jewelleryGrossWeight === "number" ? jewelleryGrossWeight : 0;
                                             if (typeof gross === "number" && gross > 0) {
                                               const stone = typeof val === "number" ? val : 0;
                                               setJewelleryNetWeight(Math.max(0, parseFloat((gross - stone).toFixed(3))));
                                             }
                                           }}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                         />
                                       </div>

                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                           Net Weight (g)
                                         </label>
                                         <input
                                           type="number"
                                           step="0.001"
                                           min="0"
                                           placeholder="0.000"
                                           value={jewelleryNetWeight}
                                           onChange={(e) => setJewelleryNetWeight(e.target.value ? parseFloat(e.target.value) : "")}
                                           className="w-full px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-mono font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-500"
                                         />
                                       </div>

                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Making Charge Type
                                         </label>
                                         <select
                                           value={jewelleryMakingType}
                                           onChange={(e) => setJewelleryMakingType(e.target.value as any)}
                                           className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                                         >
                                           <option value="per_gram">₹ / Gram</option>
                                           <option value="percentage">% of Gold Value</option>
                                           <option value="flat">Flat ₹ (Lump-sum)</option>
                                         </select>
                                       </div>

                                       <div className="space-y-1">
                                         <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                           Making Charge Rate
                                         </label>
                                         <input
                                           type="number"
                                           step="any"
                                           min="0"
                                           placeholder={jewelleryMakingType === "percentage" ? "e.g. 12%" : "e.g. 450"}
                                           value={jewelleryMakingRate}
                                           onChange={(e) => setJewelleryMakingRate(e.target.value ? parseFloat(e.target.value) : "")}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                         />
                                       </div>

                                       <div className="space-y-1 col-span-2">
                                         <label className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                                           BIS 6-Digit HUID / Barcode Tag
                                         </label>
                                         <input
                                           type="text"
                                           maxLength={12}
                                           placeholder="e.g. ABC123"
                                           value={jewelleryHuid}
                                           onChange={(e) => setJewelleryHuid(e.target.value.toUpperCase())}
                                           className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600 rounded-lg text-xs font-mono uppercase font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:border-amber-500"
                                         />
                                       </div>
                                     </>
                                   )}
                                 </div>

                                 {/* Multi-variant banner toggle for industries that support it */}
                                {isMultiVariantSupported && (
                                  <div className="mt-2 p-2 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 border border-orange-200 dark:border-orange-900/60 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <Boxes className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                                      <div>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          Enable Multi-Variant Matrix?
                                        </span>
                                        <p className="text-[10px] text-slate-500">
                                          Manage multiple pack sizes, weights, or shades with custom rates.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setIsMatrixEnabled(true)}
                                      className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-2xs shrink-0"
                                    >
                                      Enable Matrix &rarr;
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* RIGHT PANEL: Centerpiece Master Inventory & Warehouse Stock Workspace (~62% width, lg:col-span-7 xl:col-span-8) */}
                            <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-2 overflow-hidden">
                              {industryConfig.code === "AUTOPARTS" && isAutoPartsMatrixEnabled ? (
                                /* SCENARIO: DEDICATED AUTO PARTS MULTI-NUMBER & BRAND WORKSPACE */
                                <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/80 rounded-xl p-2.5 sm:p-3 space-y-2.5 shadow-2xs flex-1 flex flex-col min-h-0">
                                  {/* Top Header */}
                                  <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-1.5 shrink-0">
                                    <div className="flex items-center gap-2">
                                      <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                      <div>
                                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                          Auto Parts Multi-Number &amp; Brand Matrix ({autoPartsMatrixRows.length} Variants)
                                        </span>
                                        <p className="text-[10px] text-slate-500">
                                          Same part with distinct ratios, sizes, bearing numbers, and brand makes
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono text-orange-700 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">
                                        {autoPartsMatrixRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0)} {selectedUnitCode} Total Stock
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddAutoPartsMatrixRow()}
                                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Variant Row</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Quick Presets Bar with 1-Click Category Switcher & Dynamic Adders */}
                                  <div className="p-2.5 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-slate-50 dark:from-slate-950/70 dark:via-orange-950/30 dark:to-slate-950 border border-orange-200 dark:border-slate-800 rounded-xl space-y-2 text-xs shrink-0">
                                    {/* 1. Category Switcher Pills ("Charo Show Kro") */}
                                    <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-orange-200/60 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Category:</span>
                                      {[
                                        { id: "GEAR_RATIO", label: "⚙️ Gear Teeth / Ratio", example: "37/7, 39/8, 41/9" },
                                        { id: "BEARING_NO", label: "🔘 Bearing Numbers", example: "6201, 6204, 6302" },
                                        { id: "BORE_SIZE", label: "🔧 Bore / Piston Sizes", example: "STD, 0.25, 0.50" },
                                        { id: "GEAR_POSITION", label: "🕹️ Gear Positions", example: "1st, 2nd, 3rd, Rev" },
                                        { id: "CUSTOM", label: "🏷️ Custom / Belts / Sizes", example: "Fan Belt, Model, Gauge" },
                                      ].map((cat) => {
                                        const isSel = autoPartsSpecType === cat.id;
                                        return (
                                          <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setAutoPartsSpecType(cat.id as any)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                              isSel
                                                ? "bg-orange-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                                            }`}
                                          >
                                            <span>{cat.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* 2. Spec Numbers: Presets + Custom Stored + [+ Add Number] Adder */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                        Quick Add Spec Number:
                                      </span>
                                      {/* Preset Numbers */}
                                      {(autoPartsSpecType === "GEAR_RATIO"
                                        ? ["37/7", "39/8", "41/9", "43/10", "44/9", "47/11"]
                                        : autoPartsSpecType === "BEARING_NO"
                                        ? ["6201", "6202", "6203", "6204", "6205", "6301", "6302"]
                                        : autoPartsSpecType === "BORE_SIZE"
                                        ? ["STD", "0.25", "0.50", "0.75", "1.00"]
                                        : autoPartsSpecType === "GEAR_POSITION"
                                        ? ["1st Gear", "2nd Gear", "3rd Gear", "4th Gear", "Reverse"]
                                        : ["Standard", "Type-A", "Type-B", "Heavy Duty"]
                                      ).map((presetNum) => (
                                        <button
                                          key={presetNum}
                                          type="button"
                                          onClick={() => handleAddAutoPartsMatrixRow(presetNum)}
                                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 hover:border-orange-500 rounded text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                                        >
                                          + {presetNum}
                                        </button>
                                      ))}

                                      {/* User's Custom Stored Numbers for this category */}
                                      {(customAutoSpecs[autoPartsSpecType] || []).map((cNum) => (
                                        <span
                                          key={cNum}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded text-[11px] font-mono font-bold text-amber-900 dark:text-amber-200"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleAddAutoPartsMatrixRow(cNum)}
                                            className="hover:underline cursor-pointer"
                                          >
                                            + {cNum}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveCustomSpecNumber(cNum)}
                                            className="text-amber-600 hover:text-rose-600 cursor-pointer text-[12px] leading-none"
                                            title="Delete custom number"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}

                                      {/* Dynamic [+ Add Number] Interactive Input */}
                                      {isAddingCustomSpec ? (
                                        <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 border border-orange-400 rounded-lg">
                                          <input
                                            type="text"
                                            autoFocus
                                            placeholder="e.g. 43/10, 6304"
                                            value={customSpecInput}
                                            onChange={(e) => setCustomSpecInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomSpecNumber();
                                              } else if (e.key === "Escape") {
                                                setIsAddingCustomSpec(false);
                                              }
                                            }}
                                            className="w-24 px-1.5 py-0.5 text-[11px] font-mono font-bold bg-transparent border-0 outline-none text-slate-900 dark:text-white"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddCustomSpecNumber()}
                                            className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                          >
                                            Add
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setIsAddingCustomSpec(false)}
                                            className="px-1 py-0.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsAddingCustomSpec(true);
                                            setCustomSpecInput("");
                                          }}
                                          className="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/80 dark:hover:bg-orange-900 text-orange-800 dark:text-orange-200 border border-dashed border-orange-400 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Add Number</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* 3. Companies / Brands: Presets + Custom Stored + [+ Add Brand] Adder */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-orange-200/50 dark:border-slate-800">
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                        Quick Add Company / Brand:
                                      </span>
                                      {/* Preset Brands */}
                                      {["Maruti Genuine (MGP)", "Bosch", "Uno Minda", "SKF", "NBC", "Lumax", "Purolator", "Gabriel", "Local"].map((brandName) => (
                                        <button
                                          key={brandName}
                                          type="button"
                                          onClick={() => handleAddAutoPartsMatrixRow(undefined, brandName)}
                                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-orange-400 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                        >
                                          + {brandName}
                                        </button>
                                      ))}

                                      {/* User's Custom Stored Brands */}
                                      {customAutoBrands.map((cBrand) => (
                                        <span
                                          key={cBrand}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold text-slate-800 dark:text-slate-200"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleAddAutoPartsMatrixRow(undefined, cBrand)}
                                            className="hover:underline cursor-pointer"
                                          >
                                            + {cBrand}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveCustomBrandName(cBrand)}
                                            className="text-slate-400 hover:text-rose-600 cursor-pointer text-[12px] leading-none"
                                            title="Delete custom brand"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}

                                      {/* Dynamic [+ Add Brand] Interactive Input */}
                                      {isAddingCustomBrand ? (
                                        <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 border border-orange-400 rounded-lg">
                                          <input
                                            type="text"
                                            autoFocus
                                            placeholder="e.g. Endurance, Rolon"
                                            value={customBrandInput}
                                            onChange={(e) => setCustomBrandInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomBrandName();
                                              } else if (e.key === "Escape") {
                                                setIsAddingCustomBrand(false);
                                              }
                                            }}
                                            className="w-28 px-1.5 py-0.5 text-[11px] font-semibold bg-transparent border-0 outline-none text-slate-900 dark:text-white"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddCustomBrandName()}
                                            className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                          >
                                            Add
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setIsAddingCustomBrand(false)}
                                            className="px-1 py-0.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsAddingCustomBrand(true);
                                            setCustomBrandInput("");
                                          }}
                                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-dashed border-slate-400 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Add Brand / Make</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Variants Table Workspace */}
                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden flex-1 shadow-2xs">
                                    <table className="table-fixed w-full min-w-0 text-left text-xs border-collapse">
                                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                          <th className="p-1.5 w-[14%] truncate">Number / Ratio</th>
                                          <th className="p-1.5 w-[16%] truncate">Brand / Maker</th>
                                          <th className="p-1.5 w-[13%] truncate">Part Number</th>
                                          <th className="p-1.5 w-[10%] text-center truncate">Stock</th>
                                          <th className="p-1.5 w-[10%] text-center truncate">Purchase (₹)</th>
                                          <th className="p-1.5 w-[11%] text-center truncate text-emerald-700 dark:text-emerald-400">Retail (₹)*</th>
                                          <th className="p-1.5 w-[9%] text-center truncate">MRP (₹)</th>
                                          <th className="p-1.5 w-[9%] text-center truncate text-amber-700 dark:text-amber-400">Mistri (₹)</th>
                                          <th className="p-1.5 w-[8%] truncate">Rack</th>
                                          <th className="p-1.5 w-[4%] text-center"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/50">
                                        {autoPartsMatrixRows.length === 0 ? (
                                          <tr>
                                            <td colSpan={10} className="p-6 text-center text-slate-400 text-xs">
                                              No variants added yet. Click &quot;Add Variant Row&quot; or click any Quick Add chip above.
                                            </td>
                                          </tr>
                                        ) : (
                                          autoPartsMatrixRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder="e.g. 39/8"
                                                  value={row.specNumber}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "specNumber", e.target.value)}
                                                  className="w-full min-w-0 px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder="e.g. Bosch"
                                                  value={row.brand}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "brand", e.target.value)}
                                                  className="w-full min-w-0 px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder="e.g. F002H20398"
                                                  value={row.partNumber || ""}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "partNumber", e.target.value.toUpperCase())}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  placeholder="0"
                                                  value={row.quantity}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "quantity", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                  className="w-full min-w-0 px-1 py-1 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 text-center focus:outline-none focus:border-emerald-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="0.00"
                                                  value={row.purchasePrice}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "purchasePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-slate-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="0.00"
                                                  value={row.sellingPrice}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "sellingPrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                  className="w-full min-w-0 px-1 py-1 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 rounded text-xs font-mono font-bold text-emerald-900 dark:text-emerald-300 text-center focus:outline-none"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="0.00"
                                                  value={row.mrp}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-slate-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  placeholder="0.00"
                                                  value={row.mechanicRate || ""}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "mechanicRate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                  className="w-full min-w-0 px-1 py-1 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded text-xs font-mono font-bold text-amber-800 dark:text-amber-300 text-center focus:outline-none focus:border-amber-500"
                                                />
                                              </td>
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder="Rack"
                                                  value={row.rackLocation || ""}
                                                  onChange={(e) => handleUpdateAutoPartsMatrixRow(row.id, "rackLocation", e.target.value)}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                              <td className="p-1 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveAutoPartsMatrixRow(row.id)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                                  title="Delete Row"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Bottom Footer Info */}
                                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 shrink-0">
                                    <span>
                                      💡 Tip: In POS and Purchase, you can search directly by number &quot;39-8&quot; or brand &quot;Bosch&quot; to pick exact parts.
                                    </span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      Valuation: ₹{autoPartsMatrixRows.reduce((acc, r) => acc + ((Number(r.quantity) || 0) * (Number(r.purchasePrice) || Number(form.purchasePrice) || 0)), 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 space-y-2 shadow-2xs flex-1 flex flex-col min-h-0">
                                {/* Header Bar */}
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5 shrink-0">
                                  <div className="flex items-center gap-2">
                                    {industryConfig.code === "ELECTRONICS" ? (
                                      <Barcode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    ) : industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY" ? (
                                      <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    )}
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                      {industryConfig.code === "ELECTRONICS"
                                        ? "IMEI & Serial Multi-Warehouse Inventory"
                                        : industryConfig.code === "JEWELLERY"
                                        ? "HUID / Tag & Weight Stock Inventory"
                                        : form.trackBatches
                                        ? "Batch & Expiry Multi-Warehouse Inventory"
                                        : "Warehouse Stock Balances & Valuation"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      {openingBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)} {selectedUnitCode} Total Stock
                                    </span>
                                    <button
                                      type="button"
                                      onClick={handleAddBatchRow}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{form.trackBatches ? "Add Batch" : "Add Warehouse"}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Stock Settings & Tracking Controls */}
                                <div className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <label className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={form.trackInventory !== false}
                                        onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                                        className="rounded bg-white dark:bg-slate-950 border-slate-400 dark:border-slate-700 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                                      />
                                      <span>Manage Inventory</span>
                                    </label>

                                    {form.trackInventory !== false && (
                                      <>
                                        {!industryConfig.trackingDefaults.hideBatches && (
                                          <label className="flex items-center space-x-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={form.trackBatches}
                                              onChange={(e) => setForm({ ...form, trackBatches: e.target.checked })}
                                              className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-orange-600 focus:ring-orange-500 cursor-pointer w-3 h-3"
                                            />
                                            <span>Batch &amp; Expiry</span>
                                          </label>
                                        )}
                                        {!industryConfig.trackingDefaults.hideSerialNumbers && (
                                          <label className="flex items-center space-x-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={form.trackSerialNumbers}
                                              onChange={(e) => setForm({ ...form, trackSerialNumbers: e.target.checked })}
                                              className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-orange-600 focus:ring-orange-500 cursor-pointer w-3 h-3"
                                            />
                                            <span>
                                              {industryConfig.code === "JEWELLERY"
                                                ? "Piece-level Tag / HUID Tracking"
                                                : "IMEI / Serial Tracking"}
                                            </span>
                                          </label>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => downloadMasterMigrationTemplate()}
                                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileSpreadsheet className="w-3.5 h-3.5" />
                                      <span>Excel Import</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Centerpiece Table Workspace (Zero Horizontal Scroll!) */}
                                {form.trackInventory !== false ? (
                                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden flex-1 shadow-2xs">
                                    <table className="table-fixed w-full min-w-0 text-left text-xs border-collapse">
                                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                          <th className={`p-1.5 ${form.trackBatches ? "w-[22%]" : form.trackSerialNumbers ? "w-[24%]" : "w-[36%]"} truncate`}>
                                            Warehouse Location
                                          </th>
                                          {form.trackBatches && <th className="p-1.5 w-[18%] truncate">Batch No</th>}
                                          {form.trackBatches && <th className="p-1.5 w-[16%] truncate">Expiry Date</th>}
                                          {form.trackSerialNumbers && !form.trackBatches && (
                                            <th className="p-1.5 w-[36%] text-orange-600 dark:text-orange-400 truncate">
                                              {industryConfig.code === "JEWELLERY" ? "BIS HUID / Tag Barcode (Per Piece)" : "IMEI 1 / Serial No (Per Piece)"}
                                            </th>
                                          )}
                                          <th className={`p-1.5 ${form.trackBatches ? "w-[14%]" : form.trackSerialNumbers ? "w-[12%]" : "w-[20%]"} text-center truncate`}>
                                            Quantity
                                          </th>
                                          <th className={`p-1.5 ${form.trackBatches ? "w-[15%]" : form.trackSerialNumbers ? "w-[13%]" : "w-[22%]"} text-center truncate`}>
                                            Cost Rate (₹)
                                          </th>
                                          <th className={`p-1.5 ${form.trackBatches ? "w-[15%]" : form.trackSerialNumbers ? "w-[13%]" : "w-[22%]"} text-center truncate`}>
                                            MRP (₹)
                                          </th>
                                          <th className="p-1.5 w-[5%] text-center"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/50">
                                        {openingBatches.map((batchRow, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="p-1">
                                              <select
                                                value={batchRow.warehouseId}
                                                onChange={(e) => handleUpdateBatchRow(idx, "warehouseId", e.target.value)}
                                                className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                              >
                                                <option value="">Default Warehouse</option>
                                                {allWarehouses.map((w) => (
                                                  <option key={w.id} value={w.id}>
                                                    {w.warehouseName}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                            {form.trackBatches && (
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder="Batch #"
                                                  value={batchRow.batchNumber}
                                                  onChange={(e) => handleUpdateBatchRow(idx, "batchNumber", e.target.value.toUpperCase())}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                            )}
                                            {form.trackBatches && (
                                              <td className="p-1">
                                                <input
                                                  type="date"
                                                  value={batchRow.expiryDate}
                                                  onChange={(e) => handleUpdateBatchRow(idx, "expiryDate", e.target.value)}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                            )}
                                            {form.trackSerialNumbers && !form.trackBatches && (
                                              <td className="p-1">
                                                <input
                                                  type="text"
                                                  placeholder={industryConfig.code === "JEWELLERY" ? "Scan or Type 6-Digit HUID / Tag..." : "Scan or Type IMEI / Serial..."}
                                                  value={batchRow.serialNumbers || ""}
                                                  onChange={(e) => handleUpdateBatchRow(idx, "serialNumbers", e.target.value)}
                                                  className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono font-bold text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500"
                                                />
                                              </td>
                                            )}
                                            <td className="p-1">
                                              <input
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                value={batchRow.quantity}
                                                onChange={(e) => handleUpdateBatchRow(idx, "quantity", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                className="w-full min-w-0 px-1 py-1 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 text-center focus:outline-none focus:border-emerald-500"
                                              />
                                            </td>
                                            <td className="p-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                placeholder={form.purchasePrice ? String(form.purchasePrice) : "0.00"}
                                                value={batchRow.purchaseRate}
                                                onChange={(e) => handleUpdateBatchRow(idx, "purchaseRate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-slate-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                                              />
                                            </td>
                                            <td className="p-1">
                                              <input
                                                type="number"
                                                step="0.01"
                                                placeholder={form.mrp ? String(form.mrp) : "0.00"}
                                                value={batchRow.mrp}
                                                onChange={(e) => handleUpdateBatchRow(idx, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                                className="w-full min-w-0 px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-slate-900 dark:text-white text-center focus:outline-none focus:border-orange-500"
                                              />
                                            </td>
                                            <td className="p-1 text-center">
                                              {openingBatches.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveBatchRow(idx)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                                  title="Delete Row"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center flex-1 flex flex-col items-center justify-center space-y-1">
                                    <Boxes className="w-8 h-8 text-slate-400" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Inventory Tracking Disabled</p>
                                    <p className="text-[11px] text-slate-400">Enable "Manage Inventory" above to record warehouse stock or IMEI/serial numbers.</p>
                                  </div>
                                )}

                                {/* Footer Hints */}
                                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 shrink-0">
                                  <span>
                                    {industryConfig.code === "ELECTRONICS"
                                      ? "💡 Tip: Scan individual device IMEI numbers or paste comma-separated serials."
                                      : industryConfig.code === "JEWELLERY"
                                      ? "💡 Tip: Track individual ornament items by 6-digit BIS Hallmarking Unique ID (HUID) or RFID/Barcode tags."
                                      : form.trackBatches
                                      ? "💡 Multi-batch stock with individual manufacturing expiry dates & cost valuation."
                                      : "💡 Multi-warehouse balances automatically sync with purchase orders & billing."}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => downloadMasterMigrationTemplate()}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                                  >
                                    Download Excel Migration Template
                                  </button>
                                </div>
                              </div>
                            )}
                            </div>
                          </div>

                        )}
                      </div>
                    );
                  })()

                )}
              </div>

              {/* ─── MODAL FOOTER ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end space-x-3 pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-800 shrink-0 pr-4 sm:pr-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md flex items-center gap-1.5 cursor-pointer ${
                    form.itemType === 2
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25 active:scale-95"
                      : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/25 active:scale-95"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submitting
                      ? form.itemType === 2
                        ? "Saving Service..."
                        : "Saving Product..."
                      : form.itemType === 2
                      ? "Save Service to Catalog"
                      : (industryConfig.code === "GARMENTS" || industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") && isMatrixEnabled && matrixRows.length > 0
                      ? `Save Product & ${matrixRows.length} Variants`
                      : "Save Product to Catalog"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera Barcode Scanner Modal (Webcam & Phone Camera) */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          setVariantCameraTargetIdx(null);
          setIsVariantContinuousScan(false);
        }}
        zIndex="z-[85]"
        onScan={async (scannedCode: string) => {
          if (scannedCode) {
            if (variantCameraTargetIdx !== null && variantCameraTargetIdx < matrixRows.length) {
              const currentIdx = variantCameraTargetIdx;
              handleMatrixFieldChange(currentIdx, "barcode", scannedCode);
              const currentRow = matrixRows[currentIdx];
              const rowLabel = `${currentRow?.size || ""} ${currentRow?.color || ""}`.trim();

              if (isVariantContinuousScan && currentIdx + 1 < matrixRows.length) {
                const nextIdx = currentIdx + 1;
                setVariantCameraTargetIdx(nextIdx);
                const nextRow = matrixRows[nextIdx];
                return {
                  success: true,
                  itemName: `✅ ${rowLabel || "Variant"} Barcode Saved! Next: ${nextRow?.size || ""}`,
                };
              } else {
                setVariantCameraTargetIdx(null);
                setIsVariantContinuousScan(false);
                setIsCameraScannerOpen(false);
                return { success: true, itemName: `✅ ${rowLabel || "Variant"} Barcode Saved!` };
              }
            }

            setQuickBarcodeQuery(scannedCode);
            await handleLookupBarcode(scannedCode);
            setIsCameraScannerOpen(false);
            return { success: true, itemName: scannedCode };
          }
        }}
      />

      {/* Custom Unit Creation Modal */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Custom Unit (UOM)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUomModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomUom} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barrel, Carton 24pk, Bundle"
                  value={newUomForm.name}
                  onChange={(e) => setNewUomForm({ ...newUomForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRL, CTN24, BDL"
                    value={newUomForm.code}
                    onChange={(e) => setNewUomForm({ ...newUomForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. brl, ctn, bdl"
                    value={newUomForm.symbol}
                    onChange={(e) => setNewUomForm({ ...newUomForm, symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decimal Places</label>
                <select
                  value={newUomForm.decimalPlaces}
                  onChange={(e) => setNewUomForm({ ...newUomForm, decimalPlaces: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  <option value="0">0 (Whole units, e.g. Box, Piece, Strip)</option>
                  <option value="2">2 (e.g. Meters, Liters)</option>
                  <option value="3">3 (e.g. Kilograms, Metric Ton)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUomModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUom}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-sm shadow-orange-600/25"
                >
                  {creatingUom ? "Saving Unit..." : "Create & Select Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Brand / Maker Creation Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Brand / Maker</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBrand} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Brand / Maker Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cipla, Sun Pharma, Raymond, Samsung"
                  value={newBrandForm.name}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manufacturer / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cipla Ltd. / GlaxoSmithKline Pharmaceuticals"
                  value={newBrandForm.manufacturerName}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, manufacturerName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Top pharma manufacturer, Generic division"
                  value={newBrandForm.description}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBrand}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-sm shadow-orange-600/25 cursor-pointer"
                >
                  {creatingBrand ? "Saving Brand..." : "Save & Select Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          ITEM STOCK LEDGER MODAL — Detailed Opening, Billed, In/Out, Remaining Stock
      ══════════════════════════════════════════════════════════════════════════════ */}
      {ledgerModalOpen && selectedLedgerItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-1 sm:p-2 z-[200000] animate-in fade-in">
          <div className="bg-surface border border-border rounded-xl w-full max-w-[99vw] h-[98vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header (Compact & Sleek) */}
            <div className="px-4 py-2 border-b border-border bg-surface-elevated/40 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-foreground tracking-tight truncate">
                    {selectedLedgerItem.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-mono font-bold">
                    {selectedLedgerItem.sku}
                  </span>
                  {selectedLedgerItem.categoryName && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      &bull; {selectedLedgerItem.categoryName}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground hidden lg:inline border-l border-border pl-2">
                    Item Stock Ledger &bull; Complete Opening, Purchase/GRN, Billing (Sales), Returns &amp; Current Balance
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenItemLedger(selectedLedgerItem)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
                  title="Refresh Ledger Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLedger ? "animate-spin text-primary" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Summary KPI Cards - Compact High-Density Grid */}
            {(() => {
              // Calculate statistics
              const openingMoves = ledgerMovements.filter((m) =>
                m.movementTypeName?.toLowerCase().includes("opening") ||
                m.movementTypeName?.toLowerCase().includes("initial") ||
                m.notes?.toLowerCase().includes("opening")
              );
              const totalOpening = openingMoves.length > 0
                ? openingMoves.reduce((acc, m) => acc + Math.abs(m.quantity), 0)
                : (ledgerMovements.length > 0 ? (ledgerMovements[ledgerMovements.length - 1].quantityBefore || 0) : selectedLedgerItem.totalStock);

              const totalIn = ledgerMovements
                .filter((m) => m.quantity > 0)
                .reduce((acc, m) => acc + m.quantity, 0);

              const totalBilledOut = ledgerMovements
                .filter((m) => m.quantity < 0)
                .reduce((acc, m) => acc + Math.abs(m.quantity), 0);

              const currentRemain = selectedLedgerItem.totalStock;

              return (
                <div className="px-4 py-2 bg-surface border-b border-border grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                  {/* Card 1: Opening / Inward */}
                  <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-orange-800 dark:text-orange-300 tracking-wider block truncate">
                        Opening / Inward
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">Purchases &amp; Opening</span>
                    </div>
                    <div className="text-base font-black font-mono text-orange-700 dark:text-orange-300 whitespace-nowrap">
                      +{totalIn || totalOpening} <span className="text-[10px] font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                  </div>

                  {/* Card 2: Total Billed Out */}
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 tracking-wider block truncate">
                        Total Billed Out
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">Invoices &amp; Dispatches</span>
                    </div>
                    <div className="text-base font-black font-mono text-rose-700 dark:text-rose-300 whitespace-nowrap">
                      -{totalBilledOut} <span className="text-[10px] font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                  </div>

                  {/* Card 3: Remaining / Current Stock */}
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider block truncate">
                        Remaining Stock
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">Live On-Hand</span>
                    </div>
                    <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                      {currentRemain} <span className="text-[10px] font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                  </div>

                  {/* Card 4: Pricing & Value */}
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider block truncate">
                        Asset Value
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">@ Cost ₹{selectedLedgerItem.purchasePrice.toFixed(2)}</span>
                    </div>
                    <div className="text-base font-black font-mono text-amber-700 dark:text-amber-300 whitespace-nowrap">
                      ₹{(currentRemain * selectedLedgerItem.purchasePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Warehouse / Variant (Size/Color) / Batch Breakdown (Compact Horizontal Scrolling Strip) */}
            {ledgerStockBalances.length > 0 && (
              <div className="px-4 py-1.5 bg-surface-elevated/20 border-b border-border flex items-center gap-2 text-xs shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin">
                <span className="font-bold text-muted-foreground flex items-center space-x-1 shrink-0 text-[11px]">
                  {selectedLedgerItem.trackVariants || isGarments ? (
                    <Shirt className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <WarehouseIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                  <span>
                    {selectedLedgerItem.trackVariants || isGarments
                      ? "Variant & Size Breakdown:"
                      : "Warehouse Balances:"}
                  </span>
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {ledgerStockBalances.map((ws, i) => {
                    const hasGarmentAttr = Boolean(ws.size || ws.color || ws.variantName);
                    const isZero = Number(ws.currentQuantity) <= 0;

                    return (
                      <span
                        key={`${ws.warehouseId}-${ws.variantId || ws.batchId || i}`}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition shrink-0 ${
                          isZero
                            ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                            : "bg-surface border-border"
                        }`}
                      >
                        {hasGarmentAttr ? (
                          <>
                            {ws.size && (
                              <span className="px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 text-[10px]">
                                Size: {ws.size}
                              </span>
                            )}
                            {ws.color && (
                              <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border border-border text-[10px]">
                                Col: {ws.color}
                              </span>
                            )}
                            {!ws.size && !ws.color && ws.variantName && (
                              <span className="font-bold text-foreground text-[10px]">
                                {ws.variantName}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {(selectedLedgerItem.trackVariants || isGarments) ? (
                              <span className="px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800 text-[10px]">
                                Standard
                              </span>
                            ) : (
                              <span className="font-semibold text-foreground text-[10px]">{ws.warehouseName}:</span>
                            )}
                            {ws.batchNumber && (
                              <span className="text-purple-600 dark:text-purple-400 font-bold text-[10px]">[{ws.batchNumber}]</span>
                            )}
                          </>
                        )}

                        <span className={`font-bold text-[10px] ${isZero ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {ws.currentQuantity} {selectedLedgerItem.primaryUomCode}
                          {isZero && <span className="ml-1 text-[9px] font-semibold text-rose-500">(0)</span>}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Sub-bar (Slim) */}
            <div className="px-4 py-1.5 bg-surface border-b border-border flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground font-semibold text-[11px]">Filter:</span>
                <div className="flex items-center bg-surface-elevated border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("all")}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                      ledgerFilterType === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({ledgerMovements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("in")}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                      ledgerFilterType === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inward ({ledgerMovements.filter(m => m.quantity > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("out")}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                      ledgerFilterType === "out" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Outward ({ledgerMovements.filter(m => m.quantity < 0).length})
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground font-mono">
                Showing {ledgerMovements.filter((m) => {
                  if (ledgerFilterType === "in") return m.quantity > 0;
                  if (ledgerFilterType === "out") return m.quantity < 0;
                  return true;
                }).length} stock movement records
              </span>
            </div>

            {/* Modal Body: Transactions Table (Maximized Visible Rows) */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {loadingLedger ? (
                <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>Fetching complete stock ledger for {selectedLedgerItem.name}...</div>
                </div>
              ) : ledgerMovements.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground space-y-2">
                  <Boxes className="w-10 h-10 mx-auto text-muted-foreground/50" />
                  <div className="font-semibold text-foreground text-sm">No Movement History Recorded Yet</div>
                  <p className="text-xs max-w-sm mx-auto text-muted-foreground">
                    This item has a current stock of <b>{selectedLedgerItem.totalStock} {selectedLedgerItem.primaryUomCode}</b>.
                    Stock transactions will appear here whenever a Sales Invoice, Purchase Bill, or Stock Adjustment is processed.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden bg-surface shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-table-header text-table-headerForeground uppercase tracking-wider text-[10px] font-bold border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2">Date &amp; Time</th>
                        <th className="px-3 py-2">Transaction Type</th>
                        <th className="px-3 py-2">Ref Document</th>
                        <th className="px-3 py-2">
                          Warehouse / {selectedLedgerItem.trackVariants || isGarments ? "Variant (Size/Color)" : "Batch"}
                        </th>
                        <th className="px-3 py-2 text-right">In / Out Qty</th>
                        <th className="px-3 py-2 text-right">Stock (Before &rarr; After)</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ledgerMovements
                        .filter((m) => {
                          if (ledgerFilterType === "in") return m.quantity > 0;
                          if (ledgerFilterType === "out") return m.quantity < 0;
                          return true;
                        })
                        .map((m) => {
                          const isPositive = m.quantity > 0;

                          return (
                            <tr key={m.id} className="hover:bg-table-rowHover transition-colors">
                              {/* Date & Time */}
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <span className="font-semibold text-foreground">
                                  {new Date(m.createdAtUtc).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                                  {new Date(m.createdAtUtc).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </td>

                              {/* Movement Type */}
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isPositive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                }`}>
                                  {isPositive ? (
                                    <ArrowDownRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                  )}
                                  <span>{m.movementTypeName || (isPositive ? "Stock Inward" : "Billed (Sale)")}</span>
                                </span>
                              </td>

                              {/* Document Reference */}
                              <td className="px-3 py-1.5 font-mono">
                                {m.referenceDocumentNumber ? (
                                  <span className="font-bold text-primary text-xs">
                                    {m.referenceDocumentNumber}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Warehouse / Batch / Variant */}
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-foreground font-medium text-xs">
                                    {m.warehouseName || "Main Storage Warehouse"}
                                  </span>
                                  {m.batchNumber && (
                                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                                      Batch: {m.batchNumber}
                                    </span>
                                  )}
                                  {(m.size || m.color || m.variantName) && (
                                    <div className="inline-flex items-center gap-1">
                                      {m.size && (
                                        <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800">
                                          Size: {m.size}
                                        </span>
                                      )}
                                      {m.color && (
                                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[10px] border border-border">
                                          Col: {m.color}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Movement Qty */}
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-xs whitespace-nowrap">
                                <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                  {isPositive ? `+${m.quantity}` : m.quantity} {selectedLedgerItem.primaryUomCode}
                                </span>
                              </td>

                              {/* Balance Progression (Before -> After) */}
                              <td className="px-3 py-1.5 text-right font-mono whitespace-nowrap text-xs">
                                <span className="text-muted-foreground font-medium">{m.quantityBefore}</span>
                                <span className="mx-1 text-muted-foreground/60">&rarr;</span>
                                <span className="text-foreground font-extrabold">{m.quantityAfter}</span>
                              </td>

                              {/* Notes */}
                              <td className="px-3 py-1.5 text-muted-foreground max-w-[280px] truncate text-[11px]">
                                {m.notes || "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer (Compact) */}
            <div className="px-4 py-2 border-t border-border bg-surface-elevated/40 flex items-center justify-between shrink-0">
              <div className="text-xs text-muted-foreground">
                Total Movements: <strong className="text-foreground">{ledgerMovements.length}</strong> entries
              </div>
              <button
                type="button"
                onClick={() => setLedgerModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-foreground text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          EDIT PRODUCT & VARIANTS MODAL (RATES, PACKS, SHADES & DETAILS)
      ══════════════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-[96vw] xl:max-w-6xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      Edit Product: {editingItem.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-mono text-[11px] font-bold">
                      SKU: {editingItem.sku}
                    </span>
                    {editingItem.trackVariants && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] font-semibold">
                        Multi-Variant Product ({editVariants.length} Variants)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update master product details, wholesale rates, retail prices, and individual variant pricing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Loading indicator if hydrating full details */}
                {loadingEditDetails && (
                  <div className="flex items-center gap-2 p-2 px-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg text-xs text-orange-800 dark:text-orange-300 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                    <span>Loading comprehensive product specifications &amp; settings...</span>
                  </div>
                )}

                {/* Section 1: General Product Details & Identity */}
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-orange-600" />
                      <span>General Product Details</span>
                    </h3>
                    {/* Active / Inactive Status Toggle */}
                    <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={editForm.isActive ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>
                        {editForm.isActive ? "Active (Catalog Me Dikhayein)" : "Inactive (Hide from POS/Catalog)"}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Category</label>
                      <select
                        value={editForm.categoryId}
                        onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="">No Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Brand / Maker</label>
                      <select
                        value={editForm.brandId}
                        onChange={(e) => setEditForm({ ...editForm, brandId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Generic / No Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">HSN Code</label>
                      <input
                        type="text"
                        value={editForm.hsnCode}
                        onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
                        placeholder="e.g. 3208, 6203"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Master Barcode</label>
                      <input
                        type="text"
                        value={editForm.barcode}
                        onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                        placeholder="Scan or enter barcode"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Packaging / Description</label>
                      <input
                        type="text"
                        value={editForm.shortDescription}
                        onChange={(e) => setEditForm({ ...editForm, shortDescription: e.target.value })}
                        placeholder="e.g. 500ml Bottle, 10x10 Strip, 1 Kg Pack"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Product Rates & Tax Setup */}
                {editVariants.length === 0 && (
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-slate-800 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Product Rates &amp; Pricing</span>
                      </h3>
                      {/* GST Tax Mode Toggle */}
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                          className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                            !editForm.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-orange-700 dark:text-orange-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                        >
                          Without GST (Tax Exclusive)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                          className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                            editForm.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                          }`}
                        >
                          With GST (Tax Inclusive)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Purchase Cost (₹)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editForm.purchasePrice}
                          onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Wholesale Rate (₹)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editForm.minimumSellingPrice}
                          onChange={(e) => setEditForm({ ...editForm, minimumSellingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-primary focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Retail Rate (₹)*</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={editForm.sellingPrice}
                          onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-lg text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">MRP (₹)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editForm.mrp}
                          onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">GST Rate (%)</label>
                        <select
                          value={editForm.taxRate}
                          onChange={(e) => setEditForm({ ...editForm, taxRate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-bold"
                        >
                          <option value="0">0% (Nil / Exempt)</option>
                          <option value="0.25">0.25% GST (Rough Gems)</option>
                          <option value="1.5">1.5% GST (Diamonds & Gems)</option>
                          <option value="3">3% GST (Jewellery & Bullion)</option>
                          <option value="5">5% GST</option>
                          <option value="12">12% GST</option>
                          <option value="18">18% GST (Standard)</option>
                          <option value="28">28% GST</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Cess Rate (%)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={editForm.cessRate}
                          onChange={(e) => setEditForm({ ...editForm, cessRate: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Convert Single Product to Multi-Variant */}
                {editVariants.length === 0 && (
                  <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                          <h4 className="text-xs font-bold text-orange-950 dark:text-orange-200">
                            Does this product have multiple {variantTerms.title}s?
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Add pack sizes, shades, or variants (e.g. 500 gm, 1 Kg, 5 Kg, 10 Kg) with individual rates and barcodes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddVariantDrawerOpen((prev) => !prev)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{variantTerms.addBtnLabel}</span>
                      </button>
                    </div>

                    {renderAddVariantDrawer()}
                  </div>
                )}

                {/* Section 3: Units of Measure & Secondary Packaging */}
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Unit Packaging &amp; Secondary Conversion</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Primary Billing Unit</label>
                      <select
                        value={editForm.primaryUomId}
                        onChange={(e) => setEditForm({ ...editForm, primaryUomId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none font-bold"
                      >
                        {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Secondary Unit (Optional)</label>
                      <select
                        value={editForm.secondaryUomId}
                        onChange={(e) => setEditForm({ ...editForm, secondaryUomId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="">No Secondary Unit</option>
                        {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Conversion Factor</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 10 (1 Sec = 10 Prim)"
                        value={editForm.conversionRatio}
                        onChange={(e) => setEditForm({ ...editForm, conversionRatio: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                        disabled={!editForm.secondaryUomId}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Inventory Management & Stock Tracking Controls */}
                <div className="bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          Inventory Management &amp; Stock Tracking
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Configure whether this product maintains stock or sells freely as a non-stock item.
                        </p>
                      </div>
                    </div>

                    {/* MANAGE INVENTORY MAIN TOGGLE */}
                    <label className="flex items-center space-x-2 p-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border-2 border-orange-500 shadow-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.trackInventory !== false}
                        onChange={(e) => setEditForm({ ...editForm, trackInventory: e.target.checked })}
                        className="rounded bg-white dark:bg-slate-950 border-slate-400 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {editForm.trackInventory !== false ? "✓ Manage Inventory (Stock Checked)" : "✗ Disable Stock Tracking (Direct Billing)"}
                      </span>
                    </label>
                  </div>

                  {editForm.trackInventory === false ? (
                    <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-bold">Inventory tracking is disabled for this product.</p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          In POS and sales invoices, this product can be billed in any quantity without checking warehouse stock or deducting inventory balances.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Tracking toggles */}
                      <div className="flex flex-wrap items-center gap-4 p-2 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                        <label className="flex items-center space-x-1.5 text-[11px] text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.trackBatches}
                            onChange={(e) => setEditForm({ ...editForm, trackBatches: e.target.checked })}
                            className="rounded bg-white dark:bg-slate-950 border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Batch &amp; Expiry Tracking</span>
                        </label>
                        <label className="flex items-center space-x-1.5 text-[11px] text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.trackSerialNumbers}
                            onChange={(e) => setEditForm({ ...editForm, trackSerialNumbers: e.target.checked })}
                            className="rounded bg-white dark:bg-slate-950 border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>IMEI / Serial Number Tracking</span>
                        </label>
                      </div>

                      {/* Stock Alerts & Storage */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Min Stock Alert</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="5"
                            value={editForm.minimumStockAlert}
                            onChange={(e) => setEditForm({ ...editForm, minimumStockAlert: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Max Stock Alert</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Optional"
                            value={editForm.maximumStockAlert}
                            onChange={(e) => setEditForm({ ...editForm, maximumStockAlert: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Reorder Quantity</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Optional"
                            value={editForm.reorderQuantity}
                            onChange={(e) => setEditForm({ ...editForm, reorderQuantity: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rack / Shelf Location</label>
                          <input
                            type="text"
                            placeholder="e.g. Rack A-12"
                            value={editForm.rackLocation}
                            onChange={(e) => setEditForm({ ...editForm, rackLocation: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2.5: Auto Parts Multi-Number & Brand Matrix in Edit Modal */}
                {isEditAutoPartsMatrixActive && (
                  <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950 rounded-xl p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Auto Parts Number &amp; Brand Matrix ({editAutoPartsMatrixRows.length} Variants)
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Update rates, stock, part numbers, and godown rack locations per variant
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddEditAutoPartsMatrixRow()}
                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto">
                      <table className="table-fixed w-full min-w-0 text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-1.5 w-[16%]">Number / Ratio</th>
                            <th className="p-1.5 w-[18%]">Brand / Maker</th>
                            <th className="p-1.5 w-[16%]">Part No.</th>
                            <th className="p-1.5 w-[11%] text-center">Cost (₹)</th>
                            <th className="p-1.5 w-[12%] text-center text-emerald-700 dark:text-emerald-400">Retail (₹)*</th>
                            <th className="p-1.5 w-[10%] text-center">MRP (₹)</th>
                            <th className="p-1.5 w-[11%]">Rack</th>
                            <th className="p-1.5 w-[6%] text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/50">
                          {editAutoPartsMatrixRows.map((row) => (
                            <tr key={row.id}>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={row.specNumber}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "specNumber", e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={row.brand}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "brand", e.target.value)}
                                  className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={row.partNumber || ""}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "partNumber", e.target.value.toUpperCase())}
                                  className="w-full px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.purchasePrice}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "purchasePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.sellingPrice}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "sellingPrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 rounded text-xs font-mono font-bold text-center text-emerald-900 dark:text-emerald-300 focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.mrp}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={row.rackLocation || ""}
                                  onChange={(e) => handleUpdateEditAutoPartsMatrixRow(row.id, "rackLocation", e.target.value)}
                                  className="w-full px-1 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] text-slate-900 dark:text-white focus:outline-none"
                                />
                              </td>
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditAutoPartsMatrixRow(row.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete Row"
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
                )}

                {/* Section 3: Variants Rates & Matrix (When variants exist) */}
                {editVariants.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950 rounded-xl p-3.5 space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          Variants Price Master ({editVariants.length} Combinations)
                        </h3>
                        {editVariants.some((v) => v.id.startsWith("draft_")) && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] rounded-full border border-emerald-300 dark:border-emerald-800 animate-pulse">
                            +{editVariants.filter((v) => v.id.startsWith("draft_")).length} New to Save
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddVariantDrawerOpen((prev) => !prev)}
                          className="px-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{variantTerms.addBtnLabel}</span>
                        </button>
                      </div>
                    </div>

                    {renderAddVariantDrawer()}

                    {/* Quick Pack Rates Tool */}
                    {(() => {
                      const distinctSizes = Array.from(new Set(editVariants.map((v) => v.size).filter(Boolean))) as string[];
                      if (distinctSizes.length === 0) return null;

                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border border-orange-200/90 dark:border-orange-900/50 rounded-lg text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 font-bold text-orange-900 dark:text-orange-300">
                              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                              <span>Quick Pack Rates:</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pack:</span>
                              <select
                                value={editQuickPackSelect || distinctSizes[0] || ""}
                                onChange={(e) => setEditQuickPackSelect(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                              >
                                {distinctSizes.map((sz) => (
                                  <option key={sz} value={sz}>{sz}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">Purchase:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={editQuickPurchase}
                                onChange={(e) => setEditQuickPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-18 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">Wholesale:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={editQuickWholesale}
                                onChange={(e) => setEditQuickWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-18 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail*:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={editQuickRetail}
                                onChange={(e) => setEditQuickRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">MRP:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={editQuickMrp}
                                onChange={(e) => setEditQuickMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-18 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyEditQuickPackRates}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              Apply to Shades
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Variants Table */}
                    <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                          <tr>
                            <th className="p-2 whitespace-nowrap">Pack / Size &amp; Shade</th>
                            <th className="p-2 whitespace-nowrap">Variant SKU</th>
                            <th className="p-2 whitespace-nowrap text-center">Barcode</th>
                            <th className="p-2 whitespace-nowrap text-center w-24">Purchase (₹)</th>
                            <th className="p-2 whitespace-nowrap text-center w-24">Wholesale (₹)</th>
                            <th className="p-2 whitespace-nowrap text-center w-28 text-emerald-700 dark:text-emerald-400">Retail Rate (₹)*</th>
                            <th className="p-2 whitespace-nowrap text-center w-24">MRP (₹)</th>
                            <th className="p-2 whitespace-nowrap text-center w-20">Stock</th>
                            <th className="p-2 whitespace-nowrap text-center w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {editVariants.map((v, idx) => {
                            const effRate = v.sellingPrice !== undefined ? v.sellingPrice : (Number(editForm.sellingPrice) + (v.priceAdjustment || 0));
                            const isDraft = v.id.startsWith("draft_");
                            return (
                              <tr key={v.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isDraft ? "bg-emerald-50/30 dark:bg-emerald-950/20" : ""}`}>
                                <td className="p-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {isDraft && (
                                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                                        NEW
                                      </span>
                                    )}
                                    {v.size && (
                                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                        {v.size}
                                      </span>
                                    )}
                                    <span>{v.color || v.variantName}</span>
                                  </div>
                                </td>
                                <td className="p-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {v.variantSku}
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="text"
                                    value={v.barcode || ""}
                                    placeholder="Barcode"
                                    onChange={(e) => handleEditVariantField(idx, "barcode", e.target.value)}
                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.purchasePrice ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "purchasePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.wholesalePrice ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "wholesalePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={effRate ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "sellingPrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full min-w-0 px-1 py-0.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-emerald-500"
                                  />
                                </td>
                                <td className="p-1 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.mrp ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full min-w-0 px-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {v.currentStock} {editingItem.primaryUomCode}
                                </td>
                                <td className="p-1 text-center">
                                  {isDraft ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditVariant(idx)}
                                      title="Remove Draft Variant"
                                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProduct}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition flex items-center gap-1.5 shadow-md shadow-orange-600/25 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {updatingProduct
                      ? "Saving Changes..."
                      : editVariants.length > 0
                      ? `Save Product & ${editVariants.length} Variants` + (editVariants.some((v) => v.id.startsWith("draft_")) ? ` (+${editVariants.filter((v) => v.id.startsWith("draft_")).length} New)` : "")
                      : "Save Product Changes"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full border border-rose-200 dark:border-rose-800 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Product Delete Karein</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Are you sure you want to delete this product?</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{deleteConfirmItem.name}</div>
              <div className="font-mono text-primary font-semibold">SKU: {deleteConfirmItem.sku}</div>
              <div className="text-slate-600 dark:text-slate-400">
                Current Stock: <span className="font-bold text-slate-900 dark:text-white">{deleteConfirmItem.totalStock} {deleteConfirmItem.primaryUomCode}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs mb-6 leading-relaxed">
              ⚠️ Ye product aapke active product catalog se permanent delete ho jayega. Purane invoices aur bills ka record surakshit rahega.
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deletingItemId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setDeletingItemId(deleteConfirmItem.id);
                    await inventoryService.deleteItem(deleteConfirmItem.id);
                    setItems((prev) => prev.filter((i) => i.id !== deleteConfirmItem.id));
                    setTotalCount((prev) => Math.max(0, prev - 1));
                    setDeleteConfirmItem(null);
                  } catch (err: any) {
                    console.error("Failed to delete item:", err);
                    alert(err?.response?.data?.message || err?.message || "Product delete karne me samasya aayi.");
                  } finally {
                    setDeletingItemId(null);
                  }
                }}
                disabled={deletingItemId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {deletingItemId !== null ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Haan, Delete Karein</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════
          BULK EDIT PRODUCTS MODAL
      ══════════════════════════════════════════════════════════════════════════════ */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Bulk Edit {selectedItemIds.size} Products</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                      {selectedItemIds.size} Selected
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chune huye sabhi products me ek saath stock tracking, GST rates, category, aadi update karein.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBulkEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Selected Products Preview Chips */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <span>Selected Products ({selectedItemIds.size}):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">Only modified fields below will be updated</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {items
                      .filter((i) => selectedItemIds.has(i.id))
                      .slice(0, 12)
                      .map((item) => (
                        <span
                          key={item.id}
                          className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      ))}
                    {selectedItemIds.size > 12 && (
                      <span className="px-2 py-1 bg-slate-200/80 dark:bg-slate-800 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        +{selectedItemIds.size - 12} more products
                      </span>
                    )}
                  </div>
                </div>

                {/* Bulk Field 1: Manage Inventory (Track Inventory) */}
                <div className="p-3.5 bg-orange-50/40 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-900/50 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <WarehouseIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Manage Inventory (Stock Tracking)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-800 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/60 px-2 py-0.5 rounded-full border border-orange-300 dark:border-orange-800">
                      Bina Stock Direct Billing / Stock Check
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Chune huye products me stock check aur deduction chalu ya band karein:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setBulkEditFields((prev) => ({ ...prev, trackInventory: "NO_CHANGE" }))}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                        bulkEditFields.trackInventory === "NO_CHANGE"
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-slate-400 dark:border-slate-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      ⚪ Keep Unchanged
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkEditFields((prev) => ({ ...prev, trackInventory: "ENABLE" }))}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                        bulkEditFields.trackInventory === "ENABLE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                    >
                      ✓ Enable Stock Tracking (Stock Manage Hoga)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkEditFields((prev) => ({ ...prev, trackInventory: "DISABLE" }))}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                        bulkEditFields.trackInventory === "DISABLE"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      }`}
                    >
                      ✗ Disable Stock Tracking (Bina Stock Direct Bill)
                    </button>
                  </div>
                </div>

                {/* Bulk Field 2: GST Rate & Tax Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>GST Tax Rate (%)</span>
                      {bulkEditFields.taxRate !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Update
                        </span>
                      )}
                    </label>
                    <select
                      value={bulkEditFields.taxRate}
                      onChange={(e) => setBulkEditFields((prev) => ({
                        ...prev,
                        taxRate: e.target.value === "NO_CHANGE" ? "NO_CHANGE" : parseFloat(e.target.value) || 0,
                      }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="0">0% (Nil / Exempt)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST (Standard)</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Tax Inclusivity (GST Mode)</span>
                      {bulkEditFields.isTaxInclusive !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Update
                        </span>
                      )}
                    </label>
                    <select
                      value={bulkEditFields.isTaxInclusive}
                      onChange={(e) => setBulkEditFields((prev) => ({
                        ...prev,
                        isTaxInclusive: e.target.value as any,
                      }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="INCLUSIVE">With GST (Tax Inclusive Rate)</option>
                      <option value="EXCLUSIVE">Without GST (Tax Exclusive Rate)</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Field 3: Category & Brand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Category</span>
                      {bulkEditFields.categoryId !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Update
                        </span>
                      )}
                    </label>
                    <select
                      value={bulkEditFields.categoryId}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="CLEAR">Clear Category (No Category)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Brand / Maker</span>
                      {bulkEditFields.brandId !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Update
                        </span>
                      )}
                    </label>
                    <select
                      value={bulkEditFields.brandId}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, brandId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="CLEAR">Clear Brand (Generic / No Brand)</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bulk Field 4: Primary Unit & Low Stock Alert */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Primary Unit (UOM)</span>
                      {bulkEditFields.primaryUomId !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Update
                        </span>
                      )}
                    </label>
                    <select
                      value={bulkEditFields.primaryUomId}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, primaryUomId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      {(units.length > 0 ? units : DEFAULT_STANDARD_UNITS).map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Low Stock Alert Threshold</span>
                      {bulkEditFields.minimumStockAlert !== "NO_CHANGE" && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          Will Set to {bulkEditFields.minimumStockAlert}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={bulkEditFields.minimumStockAlert === "NO_CHANGE" ? "NO_CHANGE" : "CUSTOM"}
                        onChange={(e) => {
                          if (e.target.value === "NO_CHANGE") {
                            setBulkEditFields((prev) => ({ ...prev, minimumStockAlert: "NO_CHANGE" }));
                          } else {
                            setBulkEditFields((prev) => ({ ...prev, minimumStockAlert: 5 }));
                          }
                        }}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none"
                      >
                        <option value="NO_CHANGE">-- Keep Unchanged --</option>
                        <option value="CUSTOM">Set New Alert Qty</option>
                      </select>
                      {bulkEditFields.minimumStockAlert !== "NO_CHANGE" && (
                        <input
                          type="number"
                          min="0"
                          value={bulkEditFields.minimumStockAlert}
                          onChange={(e) => setBulkEditFields((prev) => ({
                            ...prev,
                            minimumStockAlert: parseFloat(e.target.value) || 0,
                          }))}
                          placeholder="e.g. 5"
                          className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Bulk Field 5: Batch & Serial Tracking & Active Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Batch &amp; Expiry Tracking
                    </label>
                    <select
                      value={bulkEditFields.trackBatches}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, trackBatches: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none font-semibold"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="ENABLE">Enable Batch Tracking</option>
                      <option value="DISABLE">Disable Batch Tracking</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      IMEI / Serial Tracking
                    </label>
                    <select
                      value={bulkEditFields.trackSerialNumbers}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, trackSerialNumbers: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none font-semibold"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="ENABLE">Enable IMEI/Serial Tracking</option>
                      <option value="DISABLE">Disable IMEI/Serial Tracking</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Catalog Active Status
                    </label>
                    <select
                      value={bulkEditFields.isActive}
                      onChange={(e) => setBulkEditFields((prev) => ({ ...prev, isActive: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none font-semibold"
                    >
                      <option value="NO_CHANGE">-- Keep Unchanged --</option>
                      <option value="ACTIVE">Mark Active (Show in Catalog)</option>
                      <option value="INACTIVE">Mark Inactive (Hide from Catalog)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Total <span className="font-bold text-slate-900 dark:text-white">{selectedItemIds.size}</span> products will receive these updates.
                </span>
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBulkEditModalOpen(false)}
                    disabled={isBulkUpdating}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBulkUpdating}
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isBulkUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating {selectedItemIds.size} Products...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Apply Changes to {selectedItemIds.size} Products</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Products Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-slate-100 animate-in fade-in-50 zoom-in-95 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-full border border-rose-200 dark:border-rose-800 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Delete {selectedItemIds.size} Products
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  क्या आप वाकई चुने हुए <span className="font-bold text-rose-600 dark:text-rose-400">{selectedItemIds.size}</span> प्रोडक्ट्स को डिलीट करना चाहते हैं?
                </p>
              </div>
            </div>

            {/* Selected items preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 max-h-52 overflow-y-auto space-y-2 text-xs divide-y divide-slate-200 dark:divide-slate-800">
              <div className="font-bold text-slate-600 dark:text-slate-300 text-[11px] pb-1 uppercase tracking-wider">
                Selected Products ({selectedItemIds.size}):
              </div>
              {items
                .filter((i) => selectedItemIds.has(i.id))
                .slice(0, 15)
                .map((item) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-1.5 font-semibold">({item.sku})</span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 shrink-0 font-mono font-bold">
                      Stock: {item.totalStock} {item.primaryUomCode}
                    </span>
                  </div>
                ))}
              {selectedItemIds.size > 15 && (
                <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold italic text-center">
                  ... and {selectedItemIds.size - 15} more products selected
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                <span>⚠️ Important Safety Notice:</span>
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                Ye products aapke active catalog se remove ho jayenge. Purane bills, invoices aur historical reports 100% surakshit rahenge.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel (रद्द करें)
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={isBulkDeleting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-600/30"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {selectedItemIds.size} Products...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Haan, {selectedItemIds.size} Products Delete Karein</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
