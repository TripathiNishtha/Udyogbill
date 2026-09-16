"use client";

import { useEffect, useState } from "react";
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
  Eye
} from "lucide-react";
import {
  inventoryService,
  CreateItemInput,
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

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, selectedCategory, selectedBrand, lowStockOnly]);

  useEffect(() => {
    loadData();
  }, [pageNumber, pageSize, searchTerm, selectedCategory, selectedBrand, lowStockOnly]);

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

    const totalOpeningStock = validBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);

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
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minimumSellingPrice: Number(form.minimumSellingPrice) || 0,
        mrp: Number(form.mrp) || 0,
        minimumStockAlert: Number(form.minimumStockAlert) || 0,
        maximumStockAlert: Number(form.maximumStockAlert) || 0,
        reorderQuantity: Number(form.reorderQuantity) || 0,
        trackBatches: Boolean(form.trackBatches),
        trackSerialNumbers: Boolean(form.trackSerialNumbers),
        trackVariants: Boolean(form.trackVariants),
        attributesJson: JSON.stringify(attributes),
        initialStock: totalOpeningStock,
        initialWarehouseId: form.initialWarehouseId && form.initialWarehouseId.trim() !== "" ? form.initialWarehouseId : undefined,
        initialBatchNumber: form.initialBatchNumber?.trim() || undefined,
        initialBatchExpiryDate: form.initialBatchExpiryDate ? new Date(form.initialBatchExpiryDate).toISOString() : undefined,
        openingBatches: validBatches.length > 0 ? validBatches : undefined,
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

      {/* Product Items Table */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.filter((i) => {
            if (selectedTypeFilter === "product" && i.itemType === 2) return false;
            if (selectedTypeFilter === "service" && i.itemType !== 2) return false;
            return true;
          }).length === 0 ? (
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
              setIsModalOpen(true);
            }}
            actionIcon={Plus}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="text-table-headerForeground uppercase tracking-wider bg-table-header border-b border-border text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3 font-semibold">SKU &amp; Item Name</th>
                  <th className="px-4 py-3 font-semibold">Category / Brand</th>
                  <th className="px-4 py-3 font-semibold">HSN / GST</th>
                  <th className="px-4 py-3 font-semibold">Pricing (₹)</th>
                  <th className="px-4 py-3 font-semibold">Stock Balance</th>
                  <th className="px-4 py-3 font-semibold text-right">Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items
                  .filter((i) => {
                    if (selectedTypeFilter === "product" && i.itemType === 2) return false;
                    if (selectedTypeFilter === "service" && i.itemType !== 2) return false;
                    return true;
                  })
                  .map((item) => {
                    let attrs: any = {};
                    try {
                      attrs = JSON.parse(item.attributesJson || "{}");
                    } catch {}

                    return (
                      <tr key={item.id} className="hover:bg-table-rowHover transition-colors">
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-6xl w-full p-4 sm:p-5 shadow-2xl relative my-auto max-h-[96vh] flex flex-col justify-between overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
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

                        {/* 4 Pricing Cards Grid */}
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
                    </div>

                    {/* ──── RIGHT COLUMN: Storage, Dynamic Attributes & Inventory ──── */}
                    <div className="lg:col-span-6 space-y-2.5">
                      {/* Card 3: Storage & Industry Attributes */}
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
                            <>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Size</label>
                                <input
                                  type="text"
                                  placeholder="e.g. M, L, XL, 32, 40"
                                  value={apparelSize}
                                  onChange={(e) => setApparelSize(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Color / Shade</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Navy Blue, Olive"
                                  value={apparelColor}
                                  onChange={(e) => setApparelColor(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </>
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

                          {industryConfig.code === "FMCG" && (
                            <div className="col-span-2 space-y-1">
                              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Net Weight / Volume</label>
                              <input
                                type="text"
                                placeholder="e.g. 500g / 1 Litre"
                                value={fmcgNetWeight}
                                onChange={(e) => setFmcgNetWeight(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                              />
                            </div>
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
                        )}
                      </div>
                    </div>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[200000] animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-elevated/40 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
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
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Item Stock Ledger &bull; Complete Opening, Purchase/GRN, Billing (Sales), Returns &amp; Current Balance
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
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

            {/* Top Summary KPI Cards */}
            {(() => {
              // Calculate statistics
              // Opening Stock: Earliest movement of type Initial/Opening or first movement before
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
                <div className="p-4 bg-surface border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                  {/* Card 1: Opening / Inward */}
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-950 dark:text-orange-200">
                    <span className="text-[10px] uppercase font-bold text-orange-800 dark:text-orange-300 tracking-wider block">
                      Opening / Total Inward
                    </span>
                    <div className="text-lg font-black font-mono mt-0.5 text-orange-700 dark:text-orange-300">
                      +{totalIn || totalOpening} <span className="text-xs font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Purchases, Opening &amp; Returns</span>
                  </div>

                  {/* Card 2: Total Billed Out */}
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 tracking-wider block">
                      Total Billed Out (Sales)
                    </span>
                    <div className="text-lg font-black font-mono mt-0.5 text-rose-700 dark:text-rose-300">
                      -{totalBilledOut} <span className="text-xs font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Invoices &amp; Dispatches</span>
                  </div>

                  {/* Card 3: Remaining / Current Stock */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider block">
                      Remaining Stock (Current)
                    </span>
                    <div className="text-lg font-black font-mono mt-0.5 text-emerald-700 dark:text-emerald-300">
                      {currentRemain} <span className="text-xs font-normal text-muted-foreground">{selectedLedgerItem.primaryUomCode}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Live On-Hand Balance</span>
                  </div>

                  {/* Card 4: Pricing & Value */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider block">
                      Stock Asset Value
                    </span>
                    <div className="text-lg font-black font-mono mt-0.5 text-amber-700 dark:text-amber-300">
                      ₹{(currentRemain * selectedLedgerItem.purchasePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">@ Cost ₹{selectedLedgerItem.purchasePrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Warehouse / Batch Breakdown if Available */}
            {ledgerStockBalances.length > 0 && (
              <div className="px-4 py-2.5 bg-surface-elevated/20 border-b border-border flex flex-wrap items-center gap-2 text-xs shrink-0">
                <span className="font-bold text-muted-foreground flex items-center space-x-1">
                  <WarehouseIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Warehouse &amp; Batch Balances:</span>
                </span>
                {ledgerStockBalances.map((ws, i) => (
                  <span
                    key={`${ws.warehouseId}-${ws.batchId || i}`}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-mono"
                  >
                    <span className="font-semibold text-foreground">{ws.warehouseName}:</span>
                    {ws.batchNumber && (
                      <span className="text-purple-600 dark:text-purple-400 font-bold">[{ws.batchNumber}]</span>
                    )}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {ws.currentQuantity} {selectedLedgerItem.primaryUomCode}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Filter Sub-bar */}
            <div className="p-3 bg-surface border-b border-border flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground font-semibold">Filter Movements:</span>
                <div className="flex items-center bg-surface-elevated border border-border rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("all")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      ledgerFilterType === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({ledgerMovements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("in")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      ledgerFilterType === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Inward (Opening / Purchases)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilterType("out")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      ledgerFilterType === "out" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Outward (Billed / Sales)
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
                Showing item stock movement history
              </span>
            </div>

            {/* Modal Body: Transactions Table */}
            <div className="flex-1 overflow-y-auto p-4">
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
                <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-table-header text-table-headerForeground uppercase tracking-wider text-[11px] font-bold border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Date &amp; Time</th>
                        <th className="px-4 py-3">Transaction Type</th>
                        <th className="px-4 py-3">Ref Document</th>
                        <th className="px-4 py-3">Warehouse / Batch</th>
                        <th className="px-4 py-3 text-right">In / Out Qty</th>
                        <th className="px-4 py-3 text-right">Stock (Before &rarr; After)</th>
                        <th className="px-4 py-3">Notes</th>
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
                          const isInvoice = m.movementTypeName?.toLowerCase().includes("sale") || m.movementTypeName?.toLowerCase().includes("invoice") || m.referenceDocumentType?.toLowerCase().includes("invoice");
                          const isPurchase = m.movementTypeName?.toLowerCase().includes("purchase") || m.movementTypeName?.toLowerCase().includes("grn") || m.movementTypeName?.toLowerCase().includes("opening");

                          return (
                            <tr key={m.id} className="hover:bg-table-rowHover transition-colors">
                              {/* Date */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-semibold text-foreground">
                                  {new Date(m.createdAtUtc).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(m.createdAtUtc).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </div>
                              </td>

                              {/* Movement Type */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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
                              <td className="px-4 py-3 font-mono">
                                {m.referenceDocumentNumber ? (
                                  <span className="font-bold text-primary">
                                    {m.referenceDocumentNumber}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Warehouse / Batch */}
                              <td className="px-4 py-3">
                                <div className="text-foreground font-medium">{m.warehouseName || "Main Warehouse"}</div>
                                {m.batchNumber && (
                                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                                    Batch: {m.batchNumber}
                                  </span>
                                )}
                              </td>

                              {/* Movement Qty */}
                              <td className="px-4 py-3 text-right font-mono font-bold text-sm whitespace-nowrap">
                                <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                  {isPositive ? `+${m.quantity}` : m.quantity} {selectedLedgerItem.primaryUomCode}
                                </span>
                              </td>

                              {/* Balance Progression (Before -> After) */}
                              <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                                <span className="text-muted-foreground font-medium">{m.quantityBefore}</span>
                                <span className="mx-1.5 text-muted-foreground/60">&rarr;</span>
                                <span className="text-foreground font-extrabold text-sm">{m.quantityAfter}</span>
                              </td>

                              {/* Notes */}
                              <td className="px-4 py-3 text-muted-foreground italic max-w-[200px] truncate text-[11px]">
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

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-surface-elevated/40 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Total Movements: <strong className="text-foreground">{ledgerMovements.length}</strong> entries
              </div>
              <button
                type="button"
                onClick={() => setLedgerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-elevated text-foreground text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
