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
  Award
} from "lucide-react";
import {
  inventoryService,
  CreateItemInput,
} from "@/services/inventory-services";
import { downloadMasterMigrationTemplate } from "@/lib/master-migration-template";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import {
  ItemList,
  Category,
  Brand,
  UnitOfMeasure,
  TenantDetails
} from "@/types";
import { Badge, Button, EmptyState, TableSkeleton } from "@/components/ui";

export default function TenantItemsCatalogPage() {
  const [items, setItems] = useState<ItemList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [profile, setProfile] = useState<TenantDetails | null>(null);

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
  const [elecWarranty, setElecWarranty] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Multi-Batch Opening Stock State
  interface OpeningBatchRow {
    warehouseId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number | "";
    purchaseRate: number | "";
    mrp: number | "";
  }

  const [openingBatches, setOpeningBatches] = useState<OpeningBatchRow[]>([
    { warehouseId: "", batchNumber: "", expiryDate: "", quantity: "", purchaseRate: "", mrp: "" }
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
    if (profile?.industryCode === "PHARMA") {
      if (pharmaSchedule !== "None") attributes.schedule = pharmaSchedule;
      if (pharmaSalt) attributes.composition = pharmaSalt;
    } else if (profile?.industryCode === "APPAREL" || profile?.industryCode === "FOOTWEAR") {
      if (apparelSize) attributes.size = apparelSize;
      if (apparelColor) attributes.color = apparelColor;
    } else if (profile?.industryCode === "FMCG_GROCERY") {
      if (fmcgNetWeight) attributes.netWeight = fmcgNetWeight;
    } else if (profile?.industryCode === "ELECTRONICS") {
      if (elecWarranty) attributes.warrantyMonths = elecWarranty;
    }

    // Process multi-batch opening stock rows
    const validBatches = openingBatches
      .filter((b) => Number(b.quantity) > 0 || (b.batchNumber && b.batchNumber.trim() !== ""))
      .map((b) => ({
        warehouseId: b.warehouseId || undefined,
        batchNumber: b.batchNumber ? b.batchNumber.trim().toUpperCase() : undefined,
        expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString() : undefined,
        quantity: Number(b.quantity) || 0,
        purchaseRate: Number(b.purchaseRate) || Number(form.purchasePrice) || 0,
        mrp: Number(b.mrp) || Number(form.mrp) || 0,
      }));

    const totalOpeningStock = validBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);

    try {
      setSubmitting(true);
      await inventoryService.createItem({
        ...form,
        sku: finalSku,
        attributesJson: JSON.stringify(attributes),
        initialStock: totalOpeningStock,
        openingBatches: validBatches.length > 0 ? validBatches : undefined,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minimumSellingPrice: Number(form.minimumSellingPrice) || 0,
        mrp: Number(form.mrp) || 0,
        taxRate: Number(form.taxRate) || 0,
        minimumStockAlert: Number(form.minimumStockAlert) || 0,
        isTaxInclusive: form.isTaxInclusive || false,
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
        trackBatches: false,
        trackSerialNumbers: false,
        attributesJson: "{}",
        initialStock: 0,
        initialWarehouseId: "",
        initialBatchNumber: "",
        initialBatchExpiryDate: "",
      });
      setOpeningBatches([
        { warehouseId: "", batchNumber: "", expiryDate: "", quantity: "", purchaseRate: "", mrp: "" }
      ]);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create product.");
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
                            <span className="font-bold text-foreground tracking-tight">{item.name}</span>
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
                                <span
                                  className={`font-bold font-mono text-sm ${
                                    item.isLowStock ? "text-danger" : "text-success"
                                  }`}
                                >
                                  {item.totalStock} {item.primaryUomCode}
                                </span>
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
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-4 sm:my-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                  {form.itemType === 2 ? (
                    <Wrench className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Boxes className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{form.itemType === 2 ? "Add Service to Catalog" : "Add Product to Master Catalog"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {form.itemType === 2
                      ? "Services, consultations, repairs, AMC, and labor (No physical stock balances)."
                      : `Physical products & goods for ${profile?.industryName || "your enterprise"}.`}
                  </p>
                </div>
              </div>

              {/* Segmented Type Toggle */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, itemType: 1, trackInventory: true }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    (form.itemType || 1) === 1
                      ? "bg-indigo-600 text-white shadow"
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    form.itemType === 2
                      ? "bg-amber-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>🛠️ Service / Labor</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* ─── SECTION 1: CORE DETAILS & IDENTIFICATION ─────────────────────── */}
              {form.itemType === 2 ? (
                /* SERVICE IDENTITY CARD */
                <div className="bg-amber-50/40 dark:bg-slate-950/60 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                      <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Service / Labor Specification</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                      Step 1 • Service Details
                    </span>
                  </div>

                  {/* Row 1: Service Name & Service SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Service / Labor / Fee Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AC Repair & Servicing / Legal & Tax Consultation / Web Development AMC"
                        value={form.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            name: newName,
                            sku: prev.sku ? prev.sku : generateAutoSku(newName),
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium shadow-2xs transition"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Service Code / SKU</label>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                          className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          title="Auto-generate service code"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Code</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. SRV-001"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
                      />
                    </div>
                  </div>

                  {/* Row 2: SAC Code, Billing Unit, Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        SAC Code (Services) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 998311 (IT/Consulting) or 9987 (Repairs)"
                        value={form.hsnCode || ""}
                        onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Standard 6-digit SAC code for GST invoicing
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Billing Unit (UOM) *</label>
                        <button
                          type="button"
                          onClick={() => setIsUomModalOpen(true)}
                          className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center space-x-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Custom Unit</span>
                        </button>
                      </div>
                      <select
                        value={form.primaryUomId}
                        onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        e.g. NOS, HOURS, DAYS, VISIT, JOB
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Service Category (Optional)</label>
                      <select
                        value={form.categoryId || ""}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
                      >
                        <option value="">None / General</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Group services into reports &amp; receipts
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Service Scope / Deliverables Description */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Service Scope / Description (Printed on Invoice)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Includes on-site technician inspection, parts replacement labor, and 30-day warranty"
                      value={form.shortDescription || ""}
                      onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
                    />
                  </div>
                </div>
              ) : (
                /* PHYSICAL GOODS IDENTITY CARD */
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Product Identity &amp; Basic Details</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      Step 1 • Core Info
                    </span>
                  </div>

                  {/* Row 1: Name & SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Augmentin 625 Duo Tablet / T-Shirt Cotton Round Neck"
                        value={form.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            name: newName,
                            sku: prev.sku ? prev.sku : generateAutoSku(newName),
                          }));
                        }}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 font-medium shadow-2xs transition"
                      />
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">SKU / Item Code</label>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          title="Auto-generate unique SKU"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Generate</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Leave blank to auto-generate"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>
                  </div>

                  {/* Row 2: Category, Brand, Primary UOM, HSN */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                      <select
                        value={form.categoryId || ""}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      >
                        <option value="">None</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Brand / Maker</label>
                        <button
                          type="button"
                          onClick={() => setIsBrandModalOpen(true)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center space-x-0.5 cursor-pointer"
                          title="Add New Brand / Maker"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Brand</span>
                        </button>
                      </div>
                      <select
                        value={form.brandId || ""}
                        onChange={(e) => setForm({ ...form, brandId: e.target.value || undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      >
                        <option value="">Generic</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Primary UOM *</label>
                        <button
                          type="button"
                          onClick={() => setIsUomModalOpen(true)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center space-x-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Custom UOM</span>
                        </button>
                      </div>
                      <select
                        value={form.primaryUomId}
                        onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        HSN / SAC Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 3004"
                        value={form.hsnCode || ""}
                        onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>
                  </div>

                  {/* Row 3: Barcode & Short Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span>Barcode / EAN (Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Scan or type barcode, e.g. 8901234567890"
                        value={form.barcode || ""}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Short Description / Packing Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Strip of 10 Tablets"
                        value={form.shortDescription || ""}
                        onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECTION 2: PRICING & GST CONFIGURATION ───────────────────────── */}
              {form.itemType === 2 ? (
                /* SERVICE PRICING & FEE CARD */
                <div className="bg-gradient-to-br from-amber-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Service Fee &amp; GST Rates (₹)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Step 2 • Service Fee
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Set customer billing rate and technician / internal cost.
                        </p>
                      </div>
                    </div>

                    {/* GST Tax Mode Toggle */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Fee is:</span>
                      <div className="inline-flex rounded-xl p-0.5 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            !form.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Without GST (Exclusive)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            form.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          With GST (Inclusive)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2 Tailored Price Cards for Services */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Primary Service Billing Fee */}
                    <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/80 dark:border-emerald-500/50 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Service Fee / Charge Rate (₹) *
                        </label>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          Billed to Customer
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={form.sellingPrice || ""}
                        onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-lg text-sm text-emerald-950 dark:text-emerald-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Standard rate charged per {units.find((u) => u.id === form.primaryUomId)?.code || "Unit / Job"}
                      </div>
                    </div>

                    {/* Internal / Subcontractor Cost */}
                    <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Internal Cost / Payout (₹) (Optional)
                        </label>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Technician / Expense
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.purchasePrice || ""}
                        onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 bg-slate-50/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        For profitability &amp; vendor expense reporting (Not printed on bill)
                      </div>
                    </div>
                  </div>

                  {/* GST Tax Slab & Calculation Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-amber-100 dark:border-slate-800 items-center">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        GST Tax Slab (%)
                      </label>
                      <select
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-2xs"
                      >
                        <option value="18">18% GST Slab (Standard for Services)</option>
                        <option value="0">0% (GST Exempted / Nil)</option>
                        <option value="5">5% GST Slab</option>
                        <option value="12">12% GST Slab</option>
                        <option value="28">28% GST Slab</option>
                      </select>
                    </div>

                    <div className="sm:col-span-8">
                      {Number(form.taxRate || 0) > 0 && (Number(form.sellingPrice || 0) > 0 || Number(form.purchasePrice || 0) > 0) ? (() => {
                        const sp = Number(form.sellingPrice || 0);
                        const tr = Number(form.taxRate || 0);
                        const isIncl = Boolean(form.isTaxInclusive);
                        const basic = isIncl ? sp / (1 + tr / 100) : sp;
                        const gstAmt = isIncl ? sp - basic : (sp * tr) / 100;
                        const total = isIncl ? sp : sp + gstAmt;

                        return (
                          <div className="p-2.5 bg-white dark:bg-slate-950 border border-amber-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              💡 Service Tax Breakdown ({tr}% GST):
                            </span>
                            <span>
                              Basic Fee: <strong className="text-slate-900 dark:text-white font-mono">₹{basic.toFixed(2)}</strong>
                            </span>
                            <span>+</span>
                            <span>
                              GST ({tr}%): <strong className="text-amber-600 dark:text-amber-400 font-mono">₹{gstAmt.toFixed(2)}</strong>
                            </span>
                            <span>=</span>
                            <span>
                              Total Invoice: <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">₹{total.toFixed(2)}</strong>
                            </span>
                          </div>
                        );
                      })() : (
                        <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                          💡 Tax calculation preview will appear here once service fee rate is entered.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* PHYSICAL GOODS PRICING & MULTI-TIER RATES CARD */
                <div className="bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 border border-emerald-200/80 dark:border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Pricing &amp; Multi-Tier Rates (₹)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Step 2 • Billing Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Configure Purchase, Customer Retail, B2B Wholesale, and MRP rates.
                        </p>
                      </div>
                    </div>

                    {/* GST Tax Mode Toggle */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Rates are:</span>
                      <div className="inline-flex rounded-xl p-0.5 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: false }))}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            !form.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Without GST (Exclusive)
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, isTaxInclusive: true }))}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            form.isTaxInclusive
                              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          With GST (Inclusive)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4 Pricing Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Purchase Rate */}
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Purchase Rate (₹)
                        </label>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Cost / Kharid
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.purchasePrice || ""}
                        onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                      />
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {form.isTaxInclusive ? "Includes GST" : "Excludes GST"}
                      </div>
                    </div>

                    {/* Retail Rate */}
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/70 dark:border-emerald-500/50 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          Retail Rate (₹) *
                        </label>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                          Sale Price
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={form.sellingPrice || ""}
                        onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-lg text-xs text-emerald-950 dark:text-emerald-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Primary Customer Price
                      </div>
                    </div>

                    {/* Wholesale Rate */}
                    <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-400/70 dark:border-indigo-500/50 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">
                          Wholesale Rate (₹)
                        </label>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          B2B Rate
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.minimumSellingPrice || ""}
                        onChange={(e) => setForm({ ...form, minimumSellingPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-indigo-400 rounded-lg text-xs text-indigo-950 dark:text-indigo-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                        Dealer / Min Selling Rate
                      </div>
                    </div>

                    {/* MRP */}
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                          MRP (₹)
                        </label>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                          Max Retail
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={form.mrp || ""}
                        onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs text-amber-950 dark:text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-600"
                      />
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                        Max Print on Box
                      </div>
                    </div>
                  </div>

                  {/* GST Tax Slab & Calculation Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-emerald-100/80 dark:border-slate-800 items-center">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        GST Tax Slab (%)
                      </label>
                      <select
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-600 shadow-2xs"
                      >
                        <option value="0">0% (GST Exempted / Nil)</option>
                        <option value="5">5% GST Slab</option>
                        <option value="12">12% GST Slab</option>
                        <option value="18">18% GST Slab (Standard)</option>
                        <option value="28">28% GST Slab (Luxury / Sin)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-8">
                      {Number(form.taxRate || 0) > 0 && (Number(form.sellingPrice || 0) > 0 || Number(form.purchasePrice || 0) > 0) ? (() => {
                        const sp = Number(form.sellingPrice || 0);
                        const tr = Number(form.taxRate || 0);
                        const isIncl = Boolean(form.isTaxInclusive);
                        const basic = isIncl ? sp / (1 + tr / 100) : sp;
                        const gstAmt = isIncl ? sp - basic : (sp * tr) / 100;
                        const total = isIncl ? sp : sp + gstAmt;

                        return (
                          <div className="p-2.5 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              💡 Tax Breakdown ({tr}% GST):
                            </span>
                            <span>
                              Basic Price: <strong className="text-slate-900 dark:text-white font-mono">₹{basic.toFixed(2)}</strong>
                            </span>
                            <span>+</span>
                            <span>
                              GST ({tr}%): <strong className="text-indigo-600 dark:text-indigo-400 font-mono">₹{gstAmt.toFixed(2)}</strong>
                            </span>
                            <span>=</span>
                            <span>
                              Total Invoice: <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">₹{total.toFixed(2)}</strong>
                            </span>
                          </div>
                        );
                      })() : (
                        <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                          💡 Tax calculation preview will appear here once retail rate is entered.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECTION 3: STORAGE LOCATION & STOCK REORDER ALERTS (PHYSICAL ONLY) ─ */}
              {form.itemType !== 2 && (
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Warehouse Location &amp; Reorder Alerts</span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      Step 3 • Storage
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Min Stock Alert Level (Reorder Qty)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 5 (Alerts dashboard when stock is low)"
                        value={form.minimumStockAlert || ""}
                        onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Rack / Shelf / Bin Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rack A-12, Bin 4, Shelf 2"
                        value={form.rackLocation || ""}
                        onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 shadow-2xs transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── SECTION 4: DYNAMIC INDUSTRY ATTRIBUTES (PHYSICAL ONLY) ──────────── */}
              {form.itemType !== 2 && (profile?.industryCode === "PHARMA" ||
                profile?.industryCode === "APPAREL" ||
                profile?.industryCode === "FOOTWEAR" ||
                profile?.industryCode === "FMCG_GROCERY") && (
                <div className="bg-indigo-50/40 dark:bg-slate-950/50 border border-indigo-200/80 dark:border-slate-800 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-indigo-200/60 dark:border-slate-800 pb-2">
                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-2 uppercase tracking-wider">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span>Dynamic Industry Attributes ({profile?.industryName})</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Specialized
                    </span>
                  </div>

                  {profile?.industryCode === "PHARMA" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Drug Schedule</label>
                        <select
                          value={pharmaSchedule}
                          onChange={(e) => setPharmaSchedule(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        >
                          <option value="None">None (OTC - Over The Counter)</option>
                          <option value="Schedule H">Schedule H (Doctor Prescription Required)</option>
                          <option value="Schedule H1">Schedule H1 (Controlled Register)</option>
                          <option value="Schedule X">Schedule X (Narcotic / Strict)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Active Salt / Composition</label>
                        <input
                          type="text"
                          placeholder="e.g. Amoxicillin + Clavulanate"
                          value={pharmaSalt}
                          onChange={(e) => setPharmaSalt(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {(profile?.industryCode === "APPAREL" || profile?.industryCode === "FOOTWEAR") && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Size</label>
                        <input
                          type="text"
                          placeholder="e.g. M, L, XL, 42"
                          value={apparelSize}
                          onChange={(e) => setApparelSize(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Color</label>
                        <input
                          type="text"
                          placeholder="e.g. Navy Blue"
                          value={apparelColor}
                          onChange={(e) => setApparelColor(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {profile?.industryCode === "FMCG_GROCERY" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Net Weight / Volume</label>
                      <input
                        type="text"
                        placeholder="e.g. 500g / 1 Litre"
                        value={fmcgNetWeight}
                        onChange={(e) => setFmcgNetWeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── SECTION 5: INVENTORY TRACKING & OPENING BATCHES (PHYSICAL ONLY) ── */}
              {form.itemType !== 2 && (
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-4">
                  {/* Inventory Management Toggle Card */}
                  <div className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs">
                    <label className="flex items-center space-x-3 text-xs text-indigo-950 dark:text-indigo-300 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.trackInventory !== false}
                        onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                        className="rounded bg-white dark:bg-slate-950 border-slate-400 dark:border-slate-700 text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Manage Inventory &amp; Stock for this product?
                      </span>
                    </label>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-7">
                      {form.trackInventory !== false
                        ? "Stock balances, reorder alerts, and warehouse ledger will be actively updated on sales & purchases."
                        : "Non-stock item (print on demand, custom made, daily consumables). Invoicing allowed without stock deduction."}
                    </p>

                    {form.trackInventory !== false && (
                      <div className="flex flex-wrap items-center gap-6 pt-2 pl-7 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.trackBatches}
                            onChange={(e) => setForm({ ...form, trackBatches: e.target.checked })}
                            className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 cursor-pointer"
                          />
                          <span>📅 Track Batches &amp; Expiry Dates</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.trackSerialNumbers}
                            onChange={(e) => setForm({ ...form, trackSerialNumbers: e.target.checked })}
                            className="rounded bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-indigo-600 cursor-pointer"
                          />
                          <span>🏷️ Track Serial / IMEI Numbers</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Initial Stock Opening Table */}
                  {form.trackInventory !== false && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Opening Stock Inward (Multi-Batch &amp; Expiry Supported)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            Total Stock:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">
                              {openingBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)}
                            </strong>{" "}
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                              {units.find((u) => u.id === form.primaryUomId)?.code || "Units"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleAddBatchRow}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Batch Row</span>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 text-[11px] font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-2.5 w-36">Warehouse</th>
                              <th className="p-2.5 w-36">Batch Number</th>
                              <th className="p-2.5 w-32">Expiry Date</th>
                              <th className="p-2.5 w-24">Opening Qty</th>
                              <th className="p-2.5 w-24">Cost Rate (₹)</th>
                              <th className="p-2.5 w-24">MRP (₹)</th>
                              <th className="p-2.5 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/50">
                            {openingBatches.map((batchRow, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="p-2">
                                  <select
                                    value={batchRow.warehouseId}
                                    onChange={(e) => handleUpdateBatchRow(idx, "warehouseId", e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                                  >
                                    <option value="">Default Warehouse</option>
                                    {allWarehouses.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.warehouseName} ({w.warehouseCode})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder={form.trackBatches ? "e.g. BATCH-01" : "Batch (Optional)"}
                                    value={batchRow.batchNumber}
                                    onChange={(e) => handleUpdateBatchRow(idx, "batchNumber", e.target.value.toUpperCase())}
                                    className={`w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none ${
                                      form.trackBatches && !batchRow.batchNumber && Number(batchRow.quantity) > 0
                                        ? "border-amber-500 ring-1 ring-amber-500"
                                        : "border-slate-300 dark:border-slate-800 focus:border-indigo-600"
                                    }`}
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="date"
                                    value={batchRow.expiryDate}
                                    onChange={(e) => handleUpdateBatchRow(idx, "expiryDate", e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    value={batchRow.quantity}
                                    onChange={(e) => handleUpdateBatchRow(idx, "quantity", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-600"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder={form.purchasePrice ? String(form.purchasePrice) : "0.00"}
                                    value={batchRow.purchaseRate}
                                    onChange={(e) => handleUpdateBatchRow(idx, "purchaseRate", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder={form.mrp ? String(form.mrp) : "0.00"}
                                    value={batchRow.mrp}
                                    onChange={(e) => handleUpdateBatchRow(idx, "mrp", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  {openingBatches.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBatchRow(idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                      title="Delete Batch Row"
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
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          💡 Multiple batches can have distinct expiry dates, warehouse allocations, and quantities.
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadMasterMigrationTemplate()}
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Bulk upload multiple items via Excel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── MODAL FOOTER ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md flex items-center gap-2 cursor-pointer ${
                    form.itemType === 2
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25 active:scale-95"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 active:scale-95"
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
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol</label>
                  <input
                    type="text"
                    placeholder="e.g. brl, ctn, bdl"
                    value={newUomForm.symbol}
                    onChange={(e) => setNewUomForm({ ...newUomForm, symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Decimal Places</label>
                <select
                  value={newUomForm.decimalPlaces}
                  onChange={(e) => setNewUomForm({ ...newUomForm, decimalPlaces: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
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
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
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
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manufacturer / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cipla Ltd. / GlaxoSmithKline Pharmaceuticals"
                  value={newBrandForm.manufacturerName}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, manufacturerName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Top pharma manufacturer, Generic division"
                  value={newBrandForm.description}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
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
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {creatingBrand ? "Saving Brand..." : "Save & Select Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
