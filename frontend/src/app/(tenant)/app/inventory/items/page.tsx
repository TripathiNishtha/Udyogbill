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
} from "lucide-react";
import {
  inventoryService,
  CreateItemInput,
  ItemVariant,
  ItemVariantUpdateInput,
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

const DEFAULT_GARMENT_SIZES = ["36", "38", "40", "42", "44", "46", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34"];
const DEFAULT_HARDWARE_PACKS = ["500 ml", "1 L", "4 L", "10 L", "20 L", "1 Kg", "5 Kg", "20 Kg"];
const DEFAULT_FMCG_PACKS = ["250 g", "500 g", "1 Kg", "2 Kg", "3 Kg", "5 Kg", "10 Kg", "25 Kg", "100 g", "500 ml", "1 L", "2 L", "5 L"];

interface GarmentColorOption {
  name: string;
  hex: string;
  border?: boolean;
  isCustom?: boolean;
}

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

export default function TenantItemsCatalogPage() {
  const [items, setItems] = useState<ItemList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

  const { isAddonActive, isFeatureActive, activePack, industryCode: contextIndustryCode } = useAddons();
  const activeIndustryCode = contextIndustryCode || activePack?.activeIndustryModule || activePack?.industryTypeCode || profile?.industryCode || "GENERAL";
  const industryConfig = getIndustryConfig(activeIndustryCode);
  const isGarments = activeIndustryCode.toUpperCase() === "GARMENTS" || isAddonActive("garments");

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
  const [editForm, setEditForm] = useState<{
    name: string;
    sku: string;
    barcode: string;
    categoryId: string;
    brandId: string;
    primaryUomId: string;
    hsnCode: string;
    taxRate: number;
    purchasePrice: number | "";
    sellingPrice: number | "";
    minimumSellingPrice: number | "";
    mrp: number | "";
    minimumStockAlert: number | "";
    rackLocation: string;
    trackVariants: boolean;
  }>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    brandId: "",
    primaryUomId: "",
    hsnCode: "",
    taxRate: 18,
    purchasePrice: 0,
    sellingPrice: 0,
    minimumSellingPrice: 0,
    mrp: 0,
    minimumStockAlert: 5,
    rackLocation: "",
    trackVariants: false,
  });

  const [editVariants, setEditVariants] = useState<ItemVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Quick Pack Rate Applicator for Edit Modal
  const [editQuickPackSelect, setEditQuickPackSelect] = useState("");
  const [editQuickPurchase, setEditQuickPurchase] = useState<number | "">("");
  const [editQuickWholesale, setEditQuickWholesale] = useState<number | "">("");
  const [editQuickRetail, setEditQuickRetail] = useState<number | "">("");
  const [editQuickMrp, setEditQuickMrp] = useState<number | "">("");

  // Add Product / Service Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateItemInput & { rackLocation?: string }>({
    sku: "",
    name: "",
    shortDescription: "",
    barcode: "",
    itemType: 1,
    trackInventory: true,
    categoryId: "",
    brandId: "",
    primaryUomId: "",
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

  // Garments, Hardware Paints, FMCG & Sweets/Bakery 2D Size/Pack x Color/Shade/Variety/Flavor Matrix State
  const [isMatrixEnabled, setIsMatrixEnabled] = useState(industryConfig.code !== "FMCG");
  const isHardwareMatrix = industryConfig.code === "HARDWARE" && isMatrixEnabled;
  const isFmcgMatrix = industryConfig.code === "FMCG" && isMatrixEnabled;
  const isSweetsBakeryMatrix = industryConfig.code === "SWEETS_BAKERY" && isMatrixEnabled;
  const [availableSizes, setAvailableSizes] = useState<string[]>(
    industryConfig.code === "HARDWARE"
      ? DEFAULT_HARDWARE_PACKS
      : industryConfig.code === "FMCG"
      ? DEFAULT_FMCG_PACKS
      : industryConfig.code === "SWEETS_BAKERY"
      ? DEFAULT_SWEETS_BAKERY_PACKS
      : DEFAULT_GARMENT_SIZES
  );
  const [availableColors, setAvailableColors] = useState<GarmentColorOption[]>(
    industryConfig.code === "FMCG"
      ? DEFAULT_FMCG_VARIETIES
      : industryConfig.code === "SWEETS_BAKERY"
      ? DEFAULT_SWEETS_BAKERY_VARIETIES
      : DEFAULT_GARMENT_COLORS
  );
  const [matrixSizes, setMatrixSizes] = useState<string[]>([]);
  const [matrixColors, setMatrixColors] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [customColorInput, setCustomColorInput] = useState("");
  const [matrixBulkQty, setMatrixBulkQty] = useState<number | "">("");

  useEffect(() => {
    if (industryConfig.code === "HARDWARE") {
      setAvailableSizes(DEFAULT_HARDWARE_PACKS);
      setAvailableColors(DEFAULT_GARMENT_COLORS);
      setIsMatrixEnabled(true);
      setMatrixSizes([]);
      setMatrixColors([]);
    } else if (industryConfig.code === "GARMENTS") {
      setAvailableSizes(DEFAULT_GARMENT_SIZES);
      setAvailableColors(DEFAULT_GARMENT_COLORS);
      setIsMatrixEnabled(true);
      setMatrixSizes([]);
      setMatrixColors([]);
    } else if (industryConfig.code === "FMCG") {
      setAvailableSizes(DEFAULT_FMCG_PACKS);
      setAvailableColors(DEFAULT_FMCG_VARIETIES);
      setIsMatrixEnabled(false);
      setMatrixSizes([]);
      setMatrixColors([]);
    } else if (industryConfig.code === "SWEETS_BAKERY") {
      setAvailableSizes(DEFAULT_SWEETS_BAKERY_PACKS);
      setAvailableColors(DEFAULT_SWEETS_BAKERY_VARIETIES);
      setIsMatrixEnabled(true);
      setMatrixSizes([]);
      setMatrixColors([]);
    }
  }, [industryConfig.code]);

  const handleAddCustomSize = () => {
    const clean = customSizeInput.trim();
    if (!clean) return;
    const formatted = (industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? clean : clean.toUpperCase();
    if (!availableSizes.includes(formatted)) {
      setAvailableSizes((prev) => [...prev, formatted]);
    }
    if (!matrixSizes.includes(formatted)) {
      setMatrixSizes((prev) => [...prev, formatted]);
    }
    setCustomSizeInput("");
  };

  const handleAddCustomColor = () => {
    const clean = customColorInput.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    const hex = getCustomColorHex(clean);
    const isLight = hex.toLowerCase() === "#ffffff" || hex.toLowerCase() === "#fef3c7" || hex.toLowerCase() === "#fed7aa";

    if (!availableColors.some((c) => c.name.toLowerCase() === lower)) {
      setAvailableColors((prev) => [...prev, { name: clean, hex, border: isLight, isCustom: true }]);
    }
    if (!matrixColors.some((c) => c.toLowerCase() === lower)) {
      setMatrixColors((prev) => [...prev, clean]);
    }
    setCustomColorInput("");
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
      setUnits(refreshedUnits);
      const added = refreshedUnits.find((u) => u.code.toUpperCase() === newUomForm.code.trim().toUpperCase());
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
      const [itemsRes, catData, brandData, uomData, branchData, profData] = await Promise.all([
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
      setItems(itemsRes.items);
      setTotalCount(itemsRes.totalCount || 0);
      setTotalPages(itemsRes.totalPages || 1);
      setCategories(catData);
      setBrands(brandData);
      setUnits(uomData);
      setBranches(branchData);
      setProfile(profData);

      if (uomData.length > 0 && !form.primaryUomId) {
        setForm((prev) => ({ ...prev, primaryUomId: uomData[0].id }));
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

    const isMatrixActive = (industryConfig.code === "GARMENTS" || industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") && isMatrixEnabled && matrixRows.length > 0;
    const variantStockSum = matrixRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const firstRow = matrixRows[0];
    const effSellingPrice = isMatrixActive && firstRow?.rate !== "" && firstRow?.rate !== undefined
      ? Number(firstRow.rate)
      : Number(form.sellingPrice || 0);
    const effPurchasePrice = isMatrixActive && firstRow?.purchasePrice !== "" && firstRow?.purchasePrice !== undefined
      ? Number(firstRow.purchasePrice)
      : Number(form.purchasePrice || 0);
    const effWholesalePrice = isMatrixActive && firstRow?.wholesalePrice !== "" && firstRow?.wholesalePrice !== undefined
      ? Number(firstRow.wholesalePrice)
      : Number(form.minimumSellingPrice || 0);
    const effMrp = isMatrixActive && firstRow?.mrp !== "" && firstRow?.mrp !== undefined
      ? Number(firstRow.mrp)
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
            size: r.size,
            color: r.color,
            variantSku: r.sku,
            barcode: r.barcode && r.barcode.trim() !== "" ? r.barcode.trim() : autoBarcode,
            quantity: Number(r.quantity) || 0,
            priceAdjustment: adjustment,
            purchasePrice: pPrice,
            wholesalePrice: wPrice,
            mrp: mrpVal,
          };
        })
      : undefined;

    const totalOpeningStock = isMatrixActive
      ? variantStockSum
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
        trackBatches: isMatrixActive ? false : Boolean(form.trackBatches),
        trackSerialNumbers: isMatrixActive ? false : Boolean(form.trackSerialNumbers),
        trackVariants: isMatrixActive ? true : Boolean(form.trackVariants),
        attributesJson: JSON.stringify(attributes),
        initialStock: totalOpeningStock,
        initialWarehouseId: form.initialWarehouseId && form.initialWarehouseId.trim() !== "" ? form.initialWarehouseId : undefined,
        initialBatchNumber: form.initialBatchNumber?.trim() || undefined,
        initialBatchExpiryDate: form.initialBatchExpiryDate ? new Date(form.initialBatchExpiryDate).toISOString() : undefined,
        openingBatches: isMatrixActive ? undefined : (validBatches.length > 0 ? validBatches : undefined),
        openingVariants: openingVariantsPayload,
      });

      setIsModalOpen(false);
      setForm({
        sku: "",
        name: "",
        shortDescription: "",
        barcode: "",
        categoryId: "",
        brandId: "",
        primaryUomId: units[0]?.id || "",
        hsnCode: "",
        taxRate: 18,
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
      setElecBrand("");
      setElecModel("");
      setElecWarranty("");
      setHardwareDimension("");
      setHardwareGrade("");
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
      categoryId: item.categoryId || categories.find((c) => c.name === item.categoryName)?.id || "",
      brandId: item.brandId || brands.find((b) => b.name === item.brandName)?.id || "",
      primaryUomId: item.primaryUomId,
      hsnCode: item.hsnCode || "",
      taxRate: item.taxRate,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      minimumSellingPrice: item.minimumSellingPrice,
      mrp: item.mrp,
      minimumStockAlert: item.minimumStockAlert,
      rackLocation: attrs.rackLocation || "",
      trackVariants: Boolean(item.trackVariants),
    });

    setEditVariants([]);
    setEditQuickPurchase("");
    setEditQuickWholesale("");
    setEditQuickRetail("");
    setEditQuickMrp("");
    setIsEditModalOpen(true);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setUpdatingProduct(true);
      // 1. Update master product
      await inventoryService.updateItem(editingItem.id, {
        name: editForm.name.trim(),
        barcode: editForm.barcode?.trim() || undefined,
        categoryId: editForm.categoryId || undefined,
        brandId: editForm.brandId || undefined,
        primaryUomId: editForm.primaryUomId,
        hsnCode: editForm.hsnCode?.trim() || undefined,
        taxRate: Number(editForm.taxRate) || 0,
        purchasePrice: Number(editForm.purchasePrice) || 0,
        sellingPrice: Number(editForm.sellingPrice) || 0,
        minimumSellingPrice: Number(editForm.minimumSellingPrice) || 0,
        mrp: Number(editForm.mrp) || 0,
        minimumStockAlert: Number(editForm.minimumStockAlert) || 0,
      });

      // 2. If item has variants, update variants
      if (editVariants.length > 0) {
        const payload: ItemVariantUpdateInput[] = editVariants.map((v) => ({
          variantId: v.id,
          variantSku: v.variantSku,
          barcode: v.barcode,
          rate: Number(v.sellingPrice ?? (Number(editForm.sellingPrice) + v.priceAdjustment)),
          purchasePrice: v.purchasePrice !== undefined ? Number(v.purchasePrice) : undefined,
          wholesalePrice: v.wholesalePrice !== undefined ? Number(v.wholesalePrice) : undefined,
          mrp: v.mrp !== undefined ? Number(v.mrp) : undefined,
        }));
        await inventoryService.updateItemVariants(editingItem.id, payload);
      }

      // 3. Update table item state
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
            purchasePrice: Number(editForm.purchasePrice) || it.purchasePrice,
            sellingPrice: Number(editForm.sellingPrice) || it.sellingPrice,
            minimumSellingPrice: Number(editForm.minimumSellingPrice) || it.minimumSellingPrice,
            mrp: Number(editForm.mrp) || it.mrp,
            minimumStockAlert: Number(editForm.minimumStockAlert) || it.minimumStockAlert,
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
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
              icon={<Trash2 className="w-4 h-4" />}
            >
              Bulk Delete ({selectedItemIds.size})
            </Button>
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
              setForm((prev) => ({
                ...prev,
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
              setForm((prev) => ({
                ...prev,
                itemType: 1,
                trackInventory: true,
                trackBatches: industryConfig.trackingDefaults.trackBatches,
                trackSerialNumbers: industryConfig.trackingDefaults.trackSerialNumbers,
              }));
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
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-rose-950/95 dark:bg-rose-950/95 border-2 border-rose-500/60 text-white rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-rose-500 text-white font-bold text-xs shadow-xs">
              {selectedItemIds.size}
            </span>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">
                {selectedItemIds.size} {selectedItemIds.size === 1 ? "Product" : "Products"} Selected
              </p>
              <p className="text-[11px] text-rose-200/90">
                This page: {visibleItems.filter((i) => selectedItemIds.has(i.id)).length} of {visibleItems.length} selected
              </p>
            </div>
            <span className="text-rose-400/40">|</span>
            <button
              type="button"
              onClick={() => {
                const next = new Set(selectedItemIds);
                visibleItems.forEach((i) => next.add(i.id));
                setSelectedItemIds(next);
              }}
              className="text-xs text-rose-200 hover:text-white underline font-medium cursor-pointer"
            >
              Select all {visibleItems.length} on this page
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="text-xs text-rose-300 hover:text-white hover:underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col overflow-hidden">
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
              <div className="overflow-y-auto pr-1 flex-1 space-y-2.5">
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
                            value={form.primaryUomId}
                            onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500 transition"
                          >
                            {units.map((u) => (
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
                  /* PHYSICAL GOODS FORM (2 COMPACT COLUMNS ON DESKTOP) */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* ──── LEFT COLUMN: Identity & Pricing ──── */}
                    <div className="lg:col-span-6 space-y-2.5">
                      {/* Card 1: Product Identity & Basic Details */}
                      <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            <Tag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Product Identity</span>
                          </div>
                          <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                            Step 1 • Core Info
                          </span>
                        </div>

                        {/* Row 1: Name & SKU */}
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
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 font-medium transition"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1">
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
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>
                        </div>

                        {/* Row 2: Category, Brand, Primary UOM, HSN */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Category</label>
                            <select
                              value={form.categoryId || ""}
                              onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
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
                                className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold cursor-pointer"
                                title="Add New Brand / Maker"
                              >
                                +Add
                              </button>
                            </div>
                            <select
                              value={form.brandId || ""}
                              onChange={(e) => setForm({ ...form, brandId: e.target.value || undefined })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
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
                                className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold cursor-pointer"
                              >
                                +Unit
                              </button>
                            </div>
                            <select
                              value={form.primaryUomId}
                              onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            >
                              {units.map((u) => (
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
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>
                        </div>

                        {/* Row 3: Barcode & Short Description */}
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
                              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>
                          <div className="sm:col-span-7 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Short Description / Notes
                            </label>
                            <input
                              type="text"
                              placeholder={industryConfig.placeholders.packaging}
                              value={form.shortDescription || ""}
                              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Pricing & Multi-Tier Rates */}
                      <div className="bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border border-emerald-200/80 dark:border-slate-800 rounded-xl p-3 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-black shrink-0" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Pricing &amp; Rates (₹)</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Step 2
                            </span>
                          </div>

                          {/* GST Tax Mode Toggle */}
                          <div className="flex items-center gap-1">
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
                        </div>

                        {/* 4 Pricing Cards Grid OR Hardware Master Notice */}
                        {industryConfig.code === "HARDWARE" && isMatrixEnabled && matrixSizes.length > 0 ? (
                          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <IndianRupee className="w-4 h-4 text-emerald-600" />
                              <span>Pack &amp; Shade-Wise Complete Pricing Active</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Complete <strong>Purchase, Wholesale, Retail Rate, and MRP</strong> are managed directly per variant combination in the <strong>Generated Variants Master Matrix</strong> table on the right.
                            </p>
                          </div>
                        ) : (
                          /* 4 Pricing Cards Grid */
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* Purchase Rate */}
                            <div className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                <span>Purchase (₹)</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.purchasePrice || ""}
                                onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 bg-slate-50/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-emerald-600"
                              />
                            </div>

                            {/* Retail Rate */}
                            <div className="p-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 dark:border-emerald-500/50 rounded-lg space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                <span>Retail Rate (₹) *</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={form.sellingPrice || ""}
                                onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded text-xs text-emerald-950 dark:text-emerald-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                              />
                            </div>

                            {/* Wholesale Rate */}
                            <div className="p-2 bg-orange-50/40 dark:bg-orange-950/20 border-2 border-orange-400/70 dark:border-orange-500/50 rounded-lg space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[10px] font-bold text-orange-800 dark:text-orange-300">
                                <span>Wholesale (₹)</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.minimumSellingPrice || ""}
                                onChange={(e) => setForm({ ...form, minimumSellingPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border-2 border-orange-400 rounded text-xs text-orange-950 dark:text-orange-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                              />
                            </div>

                            {/* MRP */}
                            <div className="p-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 rounded-lg space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                <span>MRP (₹)</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={form.mrp || ""}
                                onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-xs text-amber-950 dark:text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-600"
                              />
                            </div>
                          </div>
                        )}

                        {/* GST Tax Slab & Calculation Preview inline */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-emerald-100/80 dark:border-slate-800 items-center">
                          <div className="sm:col-span-5 flex items-center gap-1.5">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 shrink-0">GST:</label>
                            <select
                              value={form.taxRate}
                              onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-orange-500"
                            >
                              <option value="0">0% (Nil)</option>
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
                                <div className="p-1 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
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

                      {/* Storage, Specifications & Inventory Notice on Left Column for Hardware Matrix to utilize space */}
                      {/* Storage, Specifications & Inventory Notice on Left Column for Hardware Matrix & FMCG Matrix to utilize space */}
                      {(isHardwareMatrix || isFmcgMatrix || isSweetsBakeryMatrix) && (
                        <>
                          <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                <span>Storage &amp; Specifications</span>
                              </div>
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                Step 3 • Storage
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
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rack / Location</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Rack A-12"
                                  value={form.rackLocation || ""}
                                  onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                                />
                              </div>
                              {isHardwareMatrix && (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dimension / Length</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 90m, 1/2 inch, 2.5mm"
                                      value={hardwareDimension}
                                      onChange={(e) => setHardwareDimension(e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Grade / Finish</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. SS-304, FR PVC"
                                      value={hardwareGrade}
                                      onChange={(e) => setHardwareGrade(e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                              <label className="flex items-center space-x-1.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={form.trackInventory !== false}
                                  onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                                  className="rounded bg-white dark:bg-slate-950 border-slate-400 dark:border-slate-700 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Manage Stock</span>
                              </label>
                              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                                Matrix Managed
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Opening stock is managed directly per variant in the <strong>Generated Variants Master Matrix Table</strong> below.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ──── RIGHT COLUMN: Storage, Dynamic Attributes & Inventory ──── */}
                    <div className="lg:col-span-6 space-y-2.5">
                      {(isHardwareMatrix || isFmcgMatrix || isSweetsBakeryMatrix) ? (
                        /* Hardware Paints / FMCG & Bakery Variant Setup Card (Pack Sizes & Varieties / Shades) */
                        <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-3 shadow-2xs">
                          {/* Header & Mode Switch */}
                          <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              )}
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {isFmcgMatrix
                                  ? "FMCG & Bakery Pack Sizes × Varieties / Flavors Setup"
                                  : "Paint Pack Sizes × Shades Setup"}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                {matrixRows.length} SKUs
                              </span>
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isMatrixEnabled}
                                onChange={(e) => setIsMatrixEnabled(e.target.checked)}
                                className="rounded border-slate-300 text-orange-600 w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                              />
                              <span>Multiple Variants</span>
                            </label>
                          </div>

                          {/* Step 1: Pack Sizes */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                1. Select {(isFmcgMatrix || isSweetsBakeryMatrix) ? "Pack Sizes / Weights" : "Pack Sizes"} ({matrixSizes.length} selected)
                              </span>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setMatrixSizes(["500 g", "1 Kg", "2 Kg", "3 Kg", "5 Kg"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Cakes/Bakery (500g-5k)
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
                                      onClick={() => setMatrixSizes(["100 g", "250 g", "500 g", "1 Kg"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Grams (100g-1k)
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => setMatrixSizes(["500 ml", "1 L", "2 L", "5 L"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Litres (500ml-5L)
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
                                      onClick={() => setMatrixSizes(["1 Kg", "5 Kg", "20 Kg"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Bags (1kg-20kg)
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => setMatrixSizes(["500 ml", "1 L", "4 L"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Cans (500ml-4L)
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
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {availableSizes.map((sz) => {
                                const selected = matrixSizes.includes(sz);
                                const isCustom = !(isFmcgMatrix ? DEFAULT_FMCG_PACKS : DEFAULT_HARDWARE_PACKS).includes(sz);
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => {
                                      setMatrixSizes((prev) =>
                                        prev.includes(sz) ? prev.filter((x) => x !== sz) : [...prev, sz]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                      selected
                                        ? "bg-orange-600 text-white shadow-2xs"
                                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                                    }`}
                                  >
                                    <span>{sz}</span>
                                    {selected && <CheckCircle2 className="w-3 h-3" />}
                                    {isCustom && (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAvailableSizes((prev) => prev.filter((x) => x !== sz));
                                          setMatrixSizes((prev) => prev.filter((x) => x !== sz));
                                        }}
                                        className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/25 text-xs leading-none"
                                        title={`Remove custom pack ${sz}`}
                                      >
                                        ×
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Custom Pack Size Input */}
                            <div className="flex items-center gap-2 pt-1.5">
                              <input
                                type="text"
                                placeholder={(isFmcgMatrix || isSweetsBakeryMatrix) ? "+ Type pack size (e.g. 3kg, 1.5kg, 500g)..." : "+ Type pack size (e.g. 200ml, 50kg, 2L)..."}
                                value={customSizeInput}
                                onChange={(e) => setCustomSizeInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCustomSize();
                                  }
                                }}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-orange-400/80 dark:border-orange-500/80 rounded-lg text-xs w-64 text-slate-900 dark:text-white placeholder:text-slate-500 font-medium shadow-xs focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomSize}
                                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>+ Add Pack</span>
                              </button>
                            </div>
                          </div>

                          {/* Step 2: Varieties / Flavors or Shades */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                2. Select {(isFmcgMatrix || isSweetsBakeryMatrix) ? "Varieties / Flavors" : "Shades / Colors"} ({matrixColors.length} selected)
                              </span>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setMatrixColors(["Vanilla", "Chocolate", "Butterscotch", "Black Forest", "Red Velvet"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      Bakery Flavors
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => setMatrixColors(["Regular / Standard", "Multigrain", "Diet / Sugar Free", "Premium / Sharbati"])}
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
                                      onClick={() => setMatrixColors(["White", "Off White", "Grey", "Ivory", "Black", "Terracotta"])}
                                      className="text-orange-600 hover:underline cursor-pointer"
                                    >
                                      All Popular
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
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
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
                                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                                      selected
                                        ? "bg-orange-100 dark:bg-orange-950/80 border-2 border-orange-500 text-orange-950 dark:text-orange-200 font-bold"
                                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-300"
                                    }`}
                                  >
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.border ? "border border-slate-300 dark:border-slate-600" : ""}`}
                                      style={{ backgroundColor: c.hex }}
                                    />
                                    <span>{c.name}</span>
                                    {selected && <CheckCircle2 className="w-3 h-3 text-orange-600" />}
                                    {c.isCustom && (
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAvailableColors((prev) => prev.filter((x) => x.name !== c.name));
                                          setMatrixColors((prev) => prev.filter((x) => x !== c.name));
                                        }}
                                        className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 text-xs leading-none"
                                        title={`Remove custom ${c.name}`}
                                      >
                                        ×
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Custom Variety / Flavor / Shade Input */}
                            <div className="flex items-center gap-2 pt-1.5">
                              <input
                                type="text"
                                placeholder={(isFmcgMatrix || isSweetsBakeryMatrix) ? "+ Type flavor / variety (e.g. Vanilla, Pineapple, Sharbati)..." : "+ Type shade (e.g. 0912 Morning Glory, Base 1)..."}
                                value={customColorInput}
                                onChange={(e) => setCustomColorInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCustomColor();
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-orange-400/80 dark:border-orange-500/80 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-500 font-medium shadow-xs focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomColor}
                                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{(isFmcgMatrix || isSweetsBakeryMatrix) ? "+ Add Flavor" : "+ Add Shade"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                        {/* Card 3: Storage & Industry Attributes (Standard non-hardware) */}
                        <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>Storage &amp; Industry Attributes</span>
                          </div>
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                            Step 3 • Storage
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Min Stock Alert
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 5"
                              value={form.minimumStockAlert || ""}
                              onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Rack / Location
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Rack A-12"
                              value={form.rackLocation || ""}
                              onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition"
                            />
                          </div>

                          {industryConfig.code === "PHARMA" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Drug Schedule</label>
                                <select
                                  value={pharmaSchedule}
                                  onChange={(e) => setPharmaSchedule(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                >
                                  <option value="None">None (OTC)</option>
                                  <option value="Schedule H">Schedule H (Rx)</option>
                                  <option value="Schedule H1">Schedule H1</option>
                                  <option value="Schedule X">Schedule X</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Composition / Salt</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Amoxicillin"
                                  value={pharmaSalt}
                                  onChange={(e) => setPharmaSalt(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </>
                          )}

                          {industryConfig.code === "ELECTRONICS" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Brand / Maker</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Samsung, Apple, boAt"
                                  value={elecBrand}
                                  onChange={(e) => setElecBrand(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Model / Variant</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 12GB RAM, 256GB Gray"
                                  value={elecModel}
                                  onChange={(e) => setElecModel(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Warranty (Months)</label>
                                <input
                                  type="number"
                                  placeholder="e.g. 12"
                                  value={elecWarranty}
                                  onChange={(e) => setElecWarranty(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Serial Tracking Mode</label>
                                <select
                                  value={elecTrackingMode}
                                  onChange={(e) => setElecTrackingMode(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                >
                                  <option value="DUAL_IMEI">IMEI 1 &amp; IMEI 2 (Phones)</option>
                                  <option value="SINGLE_SERIAL">Single Serial No (Laptops/Audio)</option>
                                  <option value="BARCODE_ONLY">Barcode / SKU Only (Accessories)</option>
                                </select>
                              </div>
                            </>
                          )}

                          {industryConfig.code === "GARMENTS" && (
                            <div className="col-span-2 space-y-3 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/80 rounded-xl p-3 shadow-2xs">
                              {/* Header & Mode Switch */}
                              <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5">
                                  {industryConfig.code === "HARDWARE" ? (
                                    <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  ) : industryConfig.code === "FMCG" ? (
                                    <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  ) : industryConfig.code === "SWEETS_BAKERY" ? (
                                    <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                  ) : (
                                    <Shirt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                  )}
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {industryConfig.code === "HARDWARE"
                                      ? "Paint Pack Sizes × Shades Variant Matrix"
                                      : industryConfig.code === "FMCG"
                                      ? "FMCG Pack Sizes × Varieties Variant Matrix"
                                      : industryConfig.code === "SWEETS_BAKERY"
                                      ? "Sweets & Bakery Weights/Packs × Flavors/Varieties Matrix"
                                      : "2D Size × Color Variant Matrix"}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                    {matrixRows.length} SKUs
                                  </span>
                                </div>
                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isMatrixEnabled}
                                    onChange={(e) => setIsMatrixEnabled(e.target.checked)}
                                    className="rounded border-slate-300 text-orange-600 w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                                  />
                                  <span>Multiple Variants</span>
                                </label>
                              </div>

                              {!isMatrixEnabled ? (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      {industryConfig.code === "HARDWARE" ? "Single Pack Size" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? "Weight / Pack Size" : "Single Size"}
                                    </label>
                                    <input
                                      type="text"
                                      placeholder={industryConfig.code === "HARDWARE" ? "e.g. 4 Litre / 20 Kg" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? "e.g. 500g / 1 Kg" : "e.g. Free Size / Standard"}
                                      value={industryConfig.code === "FMCG" ? (fmcgNetWeight || apparelSize) : apparelSize}
                                      onChange={(e) => {
                                        setApparelSize(e.target.value);
                                        if (industryConfig.code === "FMCG") setFmcgNetWeight(e.target.value);
                                      }}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      {industryConfig.code === "HARDWARE" ? "Single Shade / Base" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? "Single Variety / Flavor" : "Single Color"}
                                    </label>
                                    <input
                                      type="text"
                                      placeholder={industryConfig.code === "HARDWARE" ? "e.g. 0912 Morning Glory / Base 1" : industryConfig.code === "SWEETS_BAKERY" ? "e.g. Kesar Pista / Chocolate Truffle" : industryConfig.code === "FMCG" ? "e.g. Regular / Multigrain" : "e.g. Navy Blue"}
                                      value={apparelColor}
                                      onChange={(e) => setApparelColor(e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Step A: Select Sizes */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        1. Select {industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY" ? "Pack Sizes / Weights" : "Sizes"} ({matrixSizes.length} selected)
                                      </span>
                                      {industryConfig.code === "HARDWARE" ? (
                                        <div className="flex gap-1 text-[10px]">
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
                                            onClick={() => setMatrixSizes(["1 Kg", "5 Kg", "20 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Bags (1kg-20kg)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["500 ml", "1 L", "4 L"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Cans (500ml-4L)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : industryConfig.code === "SWEETS_BAKERY" ? (
                                        <div className="flex gap-1 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["100 g", "250 g", "500 g", "1 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Grams (100g-1kg)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["1 Kg", "2 Kg", "3 Kg", "5 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Kg (1kg-5kg)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["1 Piece", "1 Box", "1 Pack"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Box / Pcs
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : industryConfig.code === "FMCG" ? (
                                        <div className="flex gap-1 text-[10px]">
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
                                            onClick={() => setMatrixSizes(["100 g", "250 g", "500 g", "1 Kg"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Grams (100g-1k)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["500 ml", "1 L", "2 L", "5 L"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Litres (500ml-5L)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex gap-1 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["S", "M", "L", "XL", "XXL"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Letter (S-XXL)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["38", "40", "42", "44"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Suits (38-44)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes(["30", "32", "34", "36"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Waist (30-36)
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixSizes([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {availableSizes.map((sz) => {
                                        const isSel = matrixSizes.includes(sz);
                                        const isCustom = !(industryConfig.code === "HARDWARE" ? DEFAULT_HARDWARE_PACKS : (industryConfig.code === "FMCG" ? DEFAULT_FMCG_PACKS : DEFAULT_GARMENT_SIZES)).includes(sz);
                                        return (
                                          <button
                                            key={sz}
                                            type="button"
                                            onClick={() => {
                                              setMatrixSizes((prev) =>
                                                prev.includes(sz) ? prev.filter((x) => x !== sz) : [...prev, sz]
                                              );
                                            }}
                                            className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                                              isSel
                                                ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                                                : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-400"
                                            }`}
                                          >
                                            <span>{sz}</span>
                                            {isCustom && (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setAvailableSizes((prev) => prev.filter((x) => x !== sz));
                                                  setMatrixSizes((prev) => prev.filter((x) => x !== sz));
                                                }}
                                                className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/25 text-xs leading-none"
                                                title={`Remove custom size ${sz}`}
                                              >
                                                ×
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {/* Custom Size Input */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <input
                                        type="text"
                                        placeholder={industryConfig.code === "HARDWARE" ? "Add pack size (e.g. 200ml, 50kg)" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? "Add pack size (e.g. 250g, 1.5kg)" : "Add custom size (e.g. 48, 4XL)"}
                                        value={customSizeInput}
                                        onChange={(e) => setCustomSizeInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCustomSize();
                                          }
                                        }}
                                        className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs w-48 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleAddCustomSize}
                                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  </div>

                                  {/* Step B: Select Colors */}
                                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        2. Select {industryConfig.code === "HARDWARE" ? "Paint Shades / Colors" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? "Varieties / Flavors" : "Colors"} ({matrixColors.length} selected)
                                      </span>
                                      {industryConfig.code === "SWEETS_BAKERY" ? (
                                        <div className="flex gap-1 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Vanilla", "Chocolate / Truffle", "Butterscotch", "Black Forest", "Red Velvet", "Pineapple", "Strawberry"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Cake Flavors
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Regular / Standard", "Desi Ghee", "Kesar Pista", "Sugar Free", "Dry Fruit / Mawa"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Mithai Varieties
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : industryConfig.code === "FMCG" ? (
                                        <div className="flex gap-1 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Regular / Standard", "Multigrain"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Atta Types
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors(["Regular / Standard"])}
                                            className="text-orange-600 hover:underline cursor-pointer"
                                          >
                                            Regular
                                          </button>
                                          <span>•</span>
                                          <button
                                            type="button"
                                            onClick={() => setMatrixColors([])}
                                            className="text-slate-500 hover:underline cursor-pointer"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setMatrixColors([])}
                                          className="text-slate-500 hover:underline cursor-pointer text-[10px]"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {availableColors.map((clr) => {
                                        const isSel = matrixColors.includes(clr.name);
                                        return (
                                          <button
                                            key={clr.name}
                                            type="button"
                                            onClick={() => {
                                              setMatrixColors((prev) =>
                                                prev.includes(clr.name)
                                                  ? prev.filter((x) => x !== clr.name)
                                                  : [...prev, clr.name]
                                              );
                                            }}
                                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                                              isSel
                                                ? "bg-orange-50 dark:bg-orange-950/60 text-orange-950 dark:text-orange-200 border-orange-500 ring-1 ring-orange-500/40"
                                                : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-400"
                                            }`}
                                          >
                                            <span
                                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                              style={{
                                                backgroundColor: clr.hex,
                                                border: clr.border ? "1px solid #cbd5e1" : "none"
                                              }}
                                            />
                                            <span>{clr.name}</span>
                                            {clr.isCustom && (
                                              <span
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setAvailableColors((prev) => prev.filter((x) => x.name !== clr.name));
                                                  setMatrixColors((prev) => prev.filter((x) => x !== clr.name));
                                                }}
                                                className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 text-xs leading-none"
                                                title={`Remove custom color ${clr.name}`}
                                              >
                                                ×
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {/* Custom Color Input */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <input
                                        type="text"
                                        placeholder={industryConfig.code === "HARDWARE" ? "Add shade (e.g. 0912 Morning Glory, Base 1)" : industryConfig.code === "FMCG" ? "Add variety (e.g. Sharbati, Sugar Free, Classic)" : "Add custom color (e.g. Lavender, Teal)"}
                                        value={customColorInput}
                                        onChange={(e) => setCustomColorInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCustomColor();
                                          }
                                        }}
                                        className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs w-48 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleAddCustomColor}
                                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  </div>

                                  {/* Step C: Bulk Quantity Helper */}
                                  <div className="flex items-center justify-between p-2 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 rounded-lg text-xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-orange-900 dark:text-orange-300">
                                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                                      <span>Bulk Fill Stock for All Variants:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Qty (e.g. 5)"
                                        value={matrixBulkQty}
                                        onChange={(e) => setMatrixBulkQty(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-20 px-2 py-0.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
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
                                        className="px-2.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-bold cursor-pointer transition"
                                      >
                                        Apply All
                                      </button>
                                    </div>
                                  </div>

                                  {/* Step C2: Pack-wise / Size-wise Default Selling Rate (For Garments) */}
                                  {matrixSizes.length > 0 && industryConfig.code === "GARMENTS" && (
                                    <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-lg text-xs space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-300">
                                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Size Wise Rates (₹):</span>
                                        </div>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                          Auto-fills rate for all shades of that pack
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 items-center">
                                        {matrixSizes.map((sz) => (
                                          <div key={sz} className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{sz}:</span>
                                            <div className="relative">
                                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                              <input
                                                type="number"
                                                min="0"
                                                placeholder={form.sellingPrice ? String(form.sellingPrice) : "Rate"}
                                                value={matrixPackRates[sz] ?? ""}
                                                onChange={(e) => handlePackRateChange(sz, e.target.value)}
                                                className="w-20 pl-4 pr-1 py-0.5 bg-transparent border-0 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Step C3: Quick Pack Default Rates for Hardware & Paints / FMCG / Sweets & Bakery */}
                                  {matrixSizes.length > 0 && (industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") && (
                                    <div className="p-2.5 bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-orange-950/20 border border-orange-200/90 dark:border-orange-900/50 rounded-lg text-xs space-y-2 shadow-2xs">
                                      <div className="flex flex-wrap items-center justify-between gap-1">
                                        <div className="flex items-center gap-1.5 font-bold text-orange-900 dark:text-orange-300">
                                          <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                                          <span>Quick Pack Default Rates:</span>
                                        </div>
                                        <span className="text-[10px] text-orange-700/80 dark:text-orange-400">
                                          Set rates once per pack size & apply to all {industryConfig.code === "SWEETS_BAKERY" ? "flavors/varieties" : industryConfig.code === "FMCG" ? "varieties" : "shades"} (editable per row below)
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pack:</span>
                                          <select
                                            value={quickPackSelect || matrixSizes[0] || ""}
                                            onChange={(e) => setQuickPackSelect(e.target.value)}
                                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                          >
                                            {matrixSizes.map((sz) => (
                                              <option key={sz} value={sz}>
                                                {sz}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-600 dark:text-slate-400">Purchase:</span>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackPurchase}
                                              onChange={(e) => setQuickPackPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-16 pl-3.5 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-600 dark:text-slate-400">Wholesale:</span>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackWholesale}
                                              onChange={(e) => setQuickPackWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-16 pl-3.5 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail Rate*:</span>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackRetail}
                                              onChange={(e) => setQuickPackRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-18 pl-3.5 pr-1 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-600 dark:text-slate-400">MRP:</span>
                                          <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={quickPackMrp}
                                              onChange={(e) => setQuickPackMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                              className="w-16 pl-3.5 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={handleApplyQuickPackRates}
                                          className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-2xs transition cursor-pointer"
                                        >
                                          Apply to {industryConfig.code === "SWEETS_BAKERY" ? "Flavors" : industryConfig.code === "FMCG" ? "Varieties" : "Shades"}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Step D: Live 2D Matrix Table Preview */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        3. Generated Matrix SKUs ({matrixRows.length} combinations)
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        Total Stock:{" "}
                                        <strong className="text-orange-600 dark:text-orange-400">
                                          {matrixRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} Pcs
                                        </strong>
                                      </span>
                                    </div>

                                    <div className="max-h-80 sm:max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto shadow-2xs">
                                      <table className="w-full text-left border-collapse text-[11px]">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                                          {(industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? (
                                            <tr>
                                              <th className="p-1.5 whitespace-nowrap">Pack &amp; {industryConfig.code === "SWEETS_BAKERY" ? "Flavor/Type" : industryConfig.code === "FMCG" ? "Variety" : "Shade"}</th>
                                              <th className="p-1.5 whitespace-nowrap">Auto SKU</th>
                                              <th className="p-1.5 whitespace-nowrap text-center">Barcode</th>
                                              <th className="p-1.5 whitespace-nowrap text-center w-20">Purchase (₹)</th>
                                              <th className="p-1.5 whitespace-nowrap text-center w-20">Wholesale (₹)</th>
                                              <th className="p-1.5 whitespace-nowrap text-center w-24 text-emerald-700 dark:text-emerald-400">Retail Rate (₹)*</th>
                                              <th className="p-1.5 whitespace-nowrap text-center w-20">MRP (₹)</th>
                                              <th className="p-1.5 whitespace-nowrap text-center w-20 text-orange-600 dark:text-orange-400">Opening Stock</th>
                                            </tr>
                                          ) : (
                                            <tr>
                                              <th className="p-1.5">Size &amp; Color</th>
                                              <th className="p-1.5">Auto SKU</th>
                                              <th className="p-1.5">Barcode</th>
                                              <th className="p-1.5 text-center w-24">Opening Stock</th>
                                              <th className="p-1.5 text-center w-28">Rate (₹)</th>
                                            </tr>
                                          )}
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                          {matrixRows.length === 0 ? (
                                            <tr>
                                              <td colSpan={(industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? 8 : 5} className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                                                Please select at least one {industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY" ? "pack size / weight" : "size"} and one {industryConfig.code === "HARDWARE" ? "shade" : (industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY" ? "variety/flavor" : "color")} above to generate variants.
                                              </td>
                                            </tr>
                                          ) : (
                                            matrixRows.map((r, idx) => (
                                            <tr key={`${r.size}-${r.color}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                              <td className="p-1.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1">
                                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                                                    {r.size}
                                                  </span>
                                                  <span>{r.color}</span>
                                                </span>
                                              </td>
                                              <td className="p-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {r.sku}
                                              </td>
                                              <td className="p-1.5 text-center">
                                                <input
                                                  type="text"
                                                  value={r.barcode || ""}
                                                  placeholder="Scan / Auto"
                                                  onChange={(e) => handleMatrixFieldChange(idx, "barcode", e.target.value)}
                                                  className="w-24 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-400 placeholder:font-sans placeholder:text-[10px]"
                                                  title="Scan manufacturer can barcode or leave empty for auto barcode"
                                                />
                                              </td>

                                              {(industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") ? (
                                                <>
                                                  <td className="p-1.5 text-center">
                                                    <div className="relative inline-flex items-center">
                                                      <span className="absolute left-1 text-[10px] text-slate-400 font-mono">₹</span>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={r.purchasePrice ?? ""}
                                                        placeholder="0"
                                                        onChange={(e) => handleMatrixFieldChange(idx, "purchasePrice", e.target.value)}
                                                        className="w-18 pl-3.5 pr-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                      />
                                                    </div>
                                                  </td>
                                                  <td className="p-1.5 text-center">
                                                    <div className="relative inline-flex items-center">
                                                      <span className="absolute left-1 text-[10px] text-slate-400 font-mono">₹</span>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={r.wholesalePrice ?? ""}
                                                        placeholder="0"
                                                        onChange={(e) => handleMatrixFieldChange(idx, "wholesalePrice", e.target.value)}
                                                        className="w-18 pl-3.5 pr-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                      />
                                                    </div>
                                                  </td>
                                                  <td className="p-1.5 text-center">
                                                    <div className="relative inline-flex items-center">
                                                      <span className="absolute left-1 text-[10px] text-slate-400 font-mono">₹</span>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={r.rate ?? ""}
                                                        placeholder={String(Number(form.sellingPrice || 0) + Number(r.priceAdjustment || 0))}
                                                        onChange={(e) => handleMatrixFieldChange(idx, "rate", e.target.value)}
                                                        className="w-20 pl-3.5 pr-1 py-0.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                                                        title="Selling / Retail Rate (₹)"
                                                      />
                                                    </div>
                                                  </td>
                                                  <td className="p-1.5 text-center">
                                                    <div className="relative inline-flex items-center">
                                                      <span className="absolute left-1 text-[10px] text-slate-400 font-mono">₹</span>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={r.mrp ?? ""}
                                                        placeholder="0"
                                                        onChange={(e) => handleMatrixFieldChange(idx, "mrp", e.target.value)}
                                                        className="w-18 pl-3.5 pr-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                      />
                                                    </div>
                                                  </td>
                                                  <td className="p-1.5 text-center">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={r.quantity}
                                                      placeholder="0"
                                                      onChange={(e) => handleMatrixFieldChange(idx, "quantity", e.target.value)}
                                                      className="w-18 px-1.5 py-0.5 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-300 dark:border-orange-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                      title="Opening Stock (Qty)"
                                                    />
                                                  </td>
                                                </>
                                              ) : (
                                                <>
                                                  <td className="p-1.5 text-center">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={r.quantity}
                                                      placeholder="0"
                                                      onChange={(e) => {
                                                        const val = e.target.value === "" ? "" : Number(e.target.value);
                                                        setMatrixRows((prev) =>
                                                          prev.map((row, i) => (i === idx ? { ...row, quantity: val } : row))
                                                        );
                                                      }}
                                                      className="w-18 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                                    />
                                                  </td>
                                                  <td className="p-1.5 text-center">
                                                    <div className="relative inline-flex items-center">
                                                      <span className="absolute left-1.5 text-[10px] text-slate-400 font-mono">₹</span>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={r.rate ?? ""}
                                                        placeholder={String(Number(form.sellingPrice || 0) + Number(r.priceAdjustment || 0))}
                                                        onChange={(e) => handleRowRateChange(idx, e.target.value)}
                                                        className="w-20 pl-4 pr-1 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                                                        title="Variant Selling Rate (₹)"
                                                      />
                                                    </div>
                                                  </td>
                                                </>
                                              )}
                                            </tr>
                                          )))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {industryConfig.code === "HARDWARE" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dimension / Length</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 90m, 1/2 inch, 2.5mm"
                                  value={hardwareDimension}
                                  onChange={(e) => setHardwareDimension(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Grade / Finish</label>
                                <input
                                  type="text"
                                  placeholder="e.g. SS-304, FR PVC"
                                  value={hardwareGrade}
                                  onChange={(e) => setHardwareGrade(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </>
                          )}

                        </div>
                      </div>

                      {/* Card 4: Inventory Tracking & Opening Batches */}
                      <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-1.5">
                          <label className="flex items-center space-x-1.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.trackInventory !== false}
                              onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                              className="rounded bg-white dark:bg-slate-950 border-slate-400 dark:border-slate-700 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Manage Stock</span>
                          </label>

                          {form.trackInventory !== false && (
                            <div className="flex items-center gap-3">
                              {!industryConfig.trackingDefaults.hideBatches && (
                                <label className="flex items-center space-x-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={form.trackBatches}
                                    onChange={(e) => setForm({ ...form, trackBatches: e.target.checked })}
                                    className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-orange-600 focus:ring-orange-500 cursor-pointer w-3 h-3"
                                  />
                                  <span>Batches &amp; Expiry</span>
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
                                  <span>Serial/IMEI</span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                        {form.trackInventory !== false && (
                          (industryConfig.code === "GARMENTS" || industryConfig.code === "HARDWARE" || industryConfig.code === "FMCG" || industryConfig.code === "SWEETS_BAKERY") && isMatrixEnabled && matrixRows.length > 0 ? (
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-lg flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                {industryConfig.code === "HARDWARE" ? (
                                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                ) : industryConfig.code === "FMCG" ? (
                                  <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : industryConfig.code === "SWEETS_BAKERY" ? (
                                  <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                ) : (
                                  <Shirt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                )}
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    Variant Opening Stock Managed in Matrix Above
                                  </span>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Total opening stock across {matrixRows.length} variants:{" "}
                                    <strong className="text-orange-600 dark:text-orange-400 font-mono">
                                      {matrixRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} {units.find((u) => u.id === form.primaryUomId)?.code || "Pcs"}
                                    </strong>
                                  </p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-[10px] rounded-full uppercase tracking-wider">
                                Matrix Active
                              </span>
                            </div>
                          ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Opening Stock</span>
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                  Total: {openingBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)} {units.find((u) => u.id === form.primaryUomId)?.code || "Units"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddBatchRow}
                                className="text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{form.trackBatches ? "Add Batch" : "Add Warehouse Stock"}</span>
                              </button>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-100 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 sticky top-0">
                                  <tr>
                                    <th className="p-1 min-w-[110px]">Warehouse</th>
                                    {form.trackBatches && <th className="p-1 min-w-[90px]">Batch No</th>}
                                    {form.trackBatches && <th className="p-1 min-w-[105px]">Expiry</th>}
                                    {form.trackSerialNumbers && !form.trackBatches && (
                                      <th className="p-1 min-w-[120px] text-orange-600 dark:text-orange-400">IMEI / Serial No</th>
                                    )}
                                    <th className="p-1 min-w-[55px]">Qty</th>
                                    <th className="p-1 min-w-[65px]">Cost (₹)</th>
                                    <th className="p-1 min-w-[65px]">MRP (₹)</th>
                                    <th className="p-1 w-5 text-center"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/50">
                                  {openingBatches.map((batchRow, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                      <td className="p-1">
                                        <select
                                          value={batchRow.warehouseId}
                                          onChange={(e) => handleUpdateBatchRow(idx, "warehouseId", e.target.value)}
                                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
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
                                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                          />
                                        </td>
                                      )}
                                      {form.trackBatches && (
                                        <td className="p-1">
                                          <input
                                            type="date"
                                            value={batchRow.expiryDate}
                                            onChange={(e) => handleUpdateBatchRow(idx, "expiryDate", e.target.value)}
                                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                          />
                                        </td>
                                      )}
                                      {form.trackSerialNumbers && !form.trackBatches && (
                                        <td className="p-1">
                                          <input
                                            type="text"
                                            placeholder="Scan/Type IMEI"
                                            value={batchRow.serialNumbers || ""}
                                            onChange={(e) => handleUpdateBatchRow(idx, "serialNumbers", e.target.value)}
                                            className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500"
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
                                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder={form.purchasePrice ? String(form.purchasePrice) : "0.00"}
                                          value={batchRow.purchaseRate}
                                          onChange={(e) => handleUpdateBatchRow(idx, "purchaseRate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder={form.mrp ? String(form.mrp) : "0.00"}
                                          value={batchRow.mrp}
                                          onChange={(e) => handleUpdateBatchRow(idx, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
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
                            <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                              <span>
                                {form.trackBatches
                                  ? "💡 Multi-batch with distinct expiry & rates."
                                  : form.trackSerialNumbers
                                  ? "💡 Multi-warehouse with individual IMEI / Serial tracking."
                                  : "💡 Multi-warehouse stock balances with cost rates."}
                              </span>
                              <button
                                type="button"
                                onClick={() => downloadMasterMigrationTemplate()}
                                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                              >
                                Excel Bulk Import
                              </button>
                            </div>
                          </div>
                          )
                        )}
                      </div>
                      </>
                      )}
                    </div>

                    {/* ──── FULL WIDTH BOTTOM SECTION: Hardware & FMCG/Bakery Master Matrix & Quick Rates ──── */}
                    {(isHardwareMatrix || isFmcgMatrix || isSweetsBakeryMatrix) && matrixRows.length > 0 && (
                      <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/80 rounded-xl p-3.5 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-orange-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            )}
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              3. Generated Variants Master Matrix ({matrixRows.length} combinations)
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              Total Stock:{" "}
                              <strong className="text-orange-600 dark:text-orange-400 font-bold">
                                {matrixRows.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} Pcs
                              </strong>
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {isFmcgMatrix
                              ? "Rates auto-save per flavor / variety & pack for accurate billing"
                              : "Rates auto-save per shade & pack for accurate wholesale and retail billing"}
                          </span>
                        </div>

                        {/* Top Controls Toolbar: Quick Pack Rates, Quick Flavor Rates + Bulk Stock */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-orange-50/80 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-orange-950/30 border border-orange-200/90 dark:border-orange-900/50 rounded-lg text-xs">
                          {/* Quick Pack Rates Filler */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 font-bold text-orange-900 dark:text-orange-300">
                              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                              <span>Quick Pack Rates:</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pack:</span>
                              <select
                                value={quickPackSelect || matrixSizes[0] || ""}
                                onChange={(e) => setQuickPackSelect(e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                              >
                                {matrixSizes.map((sz) => (
                                  <option key={sz} value={sz}>{sz}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">Purchase:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={quickPackPurchase}
                                  onChange={(e) => setQuickPackPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">Wholesale:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={quickPackWholesale}
                                  onChange={(e) => setQuickPackWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail Rate*:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={quickPackRetail}
                                  onChange={(e) => setQuickPackRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-20 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-600 dark:text-slate-400">MRP:</span>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={quickPackMrp}
                                  onChange={(e) => setQuickPackMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyQuickPackRates}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-2xs transition cursor-pointer"
                            >
                              Apply to {(isFmcgMatrix || isSweetsBakeryMatrix) ? "All Flavors" : "Shades"}
                            </button>
                          </div>

                          {/* Bulk Stock Helper */}
                          <div className="flex items-center gap-1.5 pl-3 border-l border-orange-200 dark:border-orange-800">
                            <span className="text-[11px] font-semibold text-orange-950 dark:text-orange-300">Bulk Stock:</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={matrixBulkQty}
                              onChange={(e) => setMatrixBulkQty(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-18 px-2 py-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
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
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer transition"
                            >
                              Apply All
                            </button>
                          </div>

                          {/* Quick Variety / Flavor Rates for FMCG & Bakery */}
                          {(isFmcgMatrix || isSweetsBakeryMatrix) && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-orange-200/60 dark:border-orange-900/40 w-full">
                              <div className="flex items-center gap-1 font-bold text-emerald-900 dark:text-emerald-300">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                <span>Quick Flavor Rates:</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Flavor:</span>
                                <select
                                  value={quickVarietySelect || matrixColors[0] || ""}
                                  onChange={(e) => setQuickVarietySelect(e.target.value)}
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                  {matrixColors.map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 dark:text-slate-400">Purchase:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={quickVarietyPurchase}
                                    onChange={(e) => setQuickVarietyPurchase(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 dark:text-slate-400">Wholesale:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={quickVarietyWholesale}
                                    onChange={(e) => setQuickVarietyWholesale(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Retail Rate*:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={quickVarietyRetail}
                                    onChange={(e) => setQuickVarietyRetail(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-20 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 dark:text-slate-400">MRP:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={quickVarietyMrp}
                                    onChange={(e) => setQuickVarietyMrp(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-18 pl-4 pr-1 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleApplyQuickVarietyRates}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-2xs transition cursor-pointer"
                              >
                                Apply to All Packs of Flavor
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Full Width Master Matrix Table */}
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs max-h-96 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                              <tr>
                                <th className="py-2.5 px-3 whitespace-nowrap">{(isFmcgMatrix || isSweetsBakeryMatrix) ? "Flavor & Pack Size" : "Pack & Shade"}</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Auto SKU</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center">Barcode</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center w-28">Purchase (₹)</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center w-28">Wholesale (₹)</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center w-32 text-emerald-700 dark:text-emerald-400">Retail Rate (₹)*</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center w-28">MRP (₹)</th>
                                <th className="py-2.5 px-3 whitespace-nowrap text-center w-28 text-orange-600 dark:text-orange-400">Opening Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {matrixRows.map((r, idx) => (
                                <tr key={`${r.size}-${r.color}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5">
                                      {(isFmcgMatrix || isSweetsBakeryMatrix) ? (
                                        <>
                                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                                            {r.color}
                                          </span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200">{r.size}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                                            {r.size}
                                          </span>
                                          <span className="font-bold">{r.color}</span>
                                        </>
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                    {r.sku}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      type="text"
                                      value={r.barcode || ""}
                                      placeholder="Scan / Auto"
                                      onChange={(e) => handleMatrixFieldChange(idx, "barcode", e.target.value)}
                                      className="w-24 px-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 placeholder:text-slate-400 placeholder:font-sans placeholder:text-[10px]"
                                      title="Scan manufacturer can barcode or leave empty for auto barcode"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <div className="relative inline-flex items-center w-full max-w-[95px]">
                                      <span className="absolute left-2 text-xs text-slate-400 font-mono">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={r.purchasePrice ?? ""}
                                        placeholder="0"
                                        onChange={(e) => handleMatrixFieldChange(idx, "purchasePrice", e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <div className="relative inline-flex items-center w-full max-w-[95px]">
                                      <span className="absolute left-2 text-xs text-slate-400 font-mono">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={r.wholesalePrice ?? ""}
                                        placeholder="0"
                                        onChange={(e) => handleMatrixFieldChange(idx, "wholesalePrice", e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <div className="relative inline-flex items-center w-full max-w-[95px]">
                                      <span className="absolute left-2 text-xs text-emerald-600 font-mono">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={r.rate ?? ""}
                                        placeholder={String(Number(form.sellingPrice || 0) + Number(r.priceAdjustment || 0))}
                                        onChange={(e) => handleMatrixFieldChange(idx, "rate", e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                        title="Selling / Retail Rate (₹)"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <div className="relative inline-flex items-center w-full max-w-[95px]">
                                      <span className="absolute left-2 text-xs text-slate-400 font-mono">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={r.mrp ?? ""}
                                        placeholder="0"
                                        onChange={(e) => handleMatrixFieldChange(idx, "mrp", e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={r.quantity}
                                      placeholder="0"
                                      onChange={(e) => handleMatrixFieldChange(idx, "quantity", e.target.value)}
                                      className="w-20 px-1.5 py-1 bg-orange-50/50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 rounded text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                      title="Opening Stock (Qty)"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── MODAL FOOTER ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end space-x-3 pt-2.5 mt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
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

      {/* Custom Unit Creation Modal */}
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
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
                {/* Section 1: General Details */}
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-orange-600" />
                    <span>General Product Details</span>
                  </h3>
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
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">GST Tax Rate (%)</label>
                      <select
                        value={editForm.taxRate}
                        onChange={(e) => setEditForm({ ...editForm, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="0">0% (Nil / Exempt)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Primary Unit (UOM)</label>
                      <select
                        value={editForm.primaryUomId}
                        onChange={(e) => setEditForm({ ...editForm, primaryUomId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Barcode</label>
                      <input
                        type="text"
                        value={editForm.barcode}
                        onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                        placeholder="Scan or enter barcode"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Standard Product Pricing (When no variants exist) */}
                {editVariants.length === 0 && (
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3.5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Product Rates &amp; Pricing</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Edit rates per variant or use Quick Pack Rates to bulk-apply to all shades of a pack size.
                      </span>
                    </div>

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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {editVariants.map((v, idx) => {
                            const effRate = v.sellingPrice !== undefined ? v.sellingPrice : (Number(editForm.sellingPrice) + (v.priceAdjustment || 0));
                            return (
                              <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
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
                                <td className="p-2 text-center">
                                  <input
                                    type="text"
                                    value={v.barcode || ""}
                                    placeholder="Barcode"
                                    onChange={(e) => handleEditVariantField(idx, "barcode", e.target.value)}
                                    className="w-24 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.purchasePrice ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "purchasePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-22 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.wholesalePrice ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "wholesalePrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-22 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={effRate ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "sellingPrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-0.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:border-emerald-500"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={v.mrp ?? ""}
                                    placeholder="0"
                                    onChange={(e) => handleEditVariantField(idx, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-22 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                  />
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {v.currentStock} {editingItem.primaryUomCode}
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
                      ? `Save Product & ${editVariants.length} Variants`
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
