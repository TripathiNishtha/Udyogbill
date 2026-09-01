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
  UploadCloud
} from "lucide-react";
import {
  inventoryService,
  CreateItemInput,
} from "@/services/inventory-services";
import { tenantAppService, BranchDetails } from "@/services/tenant-app-services";
import {
  ItemList,
  Category,
  Brand,
  UnitOfMeasure,
  TenantDetails
} from "@/types";

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catData, brandData, uomData, branchData, profData] = await Promise.all([
        inventoryService.getItems({
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

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedCategory, selectedBrand, lowStockOnly]);

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

    try {
      setSubmitting(true);
      await inventoryService.createItem({
        ...form,
        sku: finalSku,
        attributesJson: JSON.stringify(attributes),
        initialStock: form.initialStock ? Number(form.initialStock) : 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minimumSellingPrice: Number(form.minimumSellingPrice) || 0,
        mrp: Number(form.mrp) || 0,
        taxRate: Number(form.taxRate) || 0,
        minimumStockAlert: Number(form.minimumStockAlert) || 0,
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
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  };

  const allWarehouses = branches.flatMap((b) => b.warehouses);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-indigo-400" />
            <span>Master Product Catalog & Inventory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Comprehensive SKU directory tailored for{" "}
            <span className="text-indigo-400 font-semibold">{profile?.industryName || "your industry"}</span>{" "}
            with multi-batch and multi-warehouse balances.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/app/inventory/import"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Bulk Import (CSV)</span>
          </Link>
          <button
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
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
          >
            <Wrench className="w-4 h-4" />
            <span>+ Add Service</span>
          </button>
          <button
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                itemType: 1,
                trackInventory: true,
              }));
              setIsModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Boxes className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, Name, Barcode, HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type Filter: All / Product / Service */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("all")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                selectedTypeFilter === "all"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("product")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                selectedTypeFilter === "product"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Boxes className="w-3 h-3" />
              <span>Products ({items.filter((i) => i.itemType !== 2).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("service")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                selectedTypeFilter === "service"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>Services ({items.filter((i) => i.itemType === 2).length})</span>
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
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
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </button>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">SKU & Item Name</th>
                <th className="px-5 py-3.5 font-semibold">Category / Brand</th>
                <th className="px-5 py-3.5 font-semibold">HSN / GST</th>
                <th className="px-5 py-3.5 font-semibold">Pricing (₹)</th>
                <th className="px-5 py-3.5 font-semibold">Stock Balance</th>
                <th className="px-5 py-3.5 font-semibold text-right">Attributes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading product catalog...
                  </td>
                </tr>
              ) : items.filter((i) => {
                  if (selectedTypeFilter === "product" && i.itemType === 2) return false;
                  if (selectedTypeFilter === "service" && i.itemType !== 2) return false;
                  return true;
                }).length > 0 ? (
                items
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
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white tracking-tight">{item.name}</span>
                            {item.itemType === 2 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🛠️ SERVICE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[11px] text-indigo-400 font-semibold">
                              {item.sku}
                            </span>
                            {item.barcode && (
                              <span className="font-mono text-[10px] text-slate-500">
                                || {item.barcode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          <div>{item.categoryName || "—"}</div>
                          <div className="text-[11px] text-slate-400">{item.brandName || "Generic"}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-mono text-slate-300">{item.hsnCode || "—"}</div>
                          <div className="text-[11px] text-slate-400">{item.taxRate}% GST</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono">
                          <div className="text-emerald-400 font-bold">
                            Retail: ₹{item.sellingPrice.toFixed(2)}
                          </div>
                          {item.minimumSellingPrice > 0 && (
                            <div className="text-[11px] text-indigo-400 font-semibold">
                              Wholesale: ₹{item.minimumSellingPrice.toFixed(2)}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            MRP: ₹{item.mrp.toFixed(2)} | Cost: ₹{item.purchasePrice.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {item.itemType === 2 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              🛠️ Service (No Stock)
                            </span>
                          ) : item.trackInventory === false ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              Non-Stock Item
                            </span>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`font-bold font-mono text-sm ${
                                    item.isLowStock ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  {item.totalStock} {item.primaryUomCode}
                                </span>
                                {item.isLowStock && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                              {item.trackBatches && (
                                <span className="text-[10px] text-indigo-400 block mt-0.5">
                                  ★ Batch Tracked
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {attrs.schedule && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {attrs.schedule}
                            </span>
                          )}
                          {attrs.size && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Size: {attrs.size}
                            </span>
                          )}
                          {attrs.color && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {attrs.color}
                            </span>
                          )}
                          {attrs.netWeight && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {attrs.netWeight}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No products found in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  {form.itemType === 2 ? (
                    <>
                      <Wrench className="w-5 h-5 text-amber-400" />
                      <span>Add Service to Catalog</span>
                    </>
                  ) : (
                    <>
                      <Boxes className="w-5 h-5 text-indigo-400" />
                      <span>Add Product to Master Catalog</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {form.itemType === 2
                    ? "Services, consultations, repairs, AMC, and labor (No physical stock balances)."
                    : `Physical products & goods for ${profile?.industryName || "your enterprise"}.`}
                </p>
              </div>

              {/* Segmented Type Toggle */}
              <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, itemType: 1, trackInventory: true }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    (form.itemType || 1) === 1
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    form.itemType === 2
                      ? "bg-amber-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>🛠️ Service / Labor</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">SKU / Item Code</label>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, sku: generateAutoSku(prev.name) }))}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Auto-generate unique SKU"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={form.itemType === 2 ? "e.g. SRV-001" : "Leave blank to auto-generate"}
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className={form.itemType === 2 ? "sm:col-span-8 space-y-1" : "sm:col-span-5 space-y-1"}>
                  <label className="text-xs font-semibold text-slate-300">
                    {form.itemType === 2 ? "Service / Labor / Fee Name *" : "Product Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      form.itemType === 2
                        ? "e.g. GST Compliance Advisory / Hardware Repair Charges"
                        : "e.g. Augmentin 625 Duo Tablet / T-Shirt Cotton Round Neck"
                    }
                    value={form.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: newName,
                        sku: prev.sku ? prev.sku : generateAutoSku(newName),
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {form.itemType !== 2 && (
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Barcode / EAN</label>
                    <input
                      type="text"
                      placeholder="e.g. 8901234567890"
                      value={form.barcode || ""}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Categorization & Units */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select
                    value={form.categoryId || ""}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  <label className="text-xs font-semibold text-slate-300">Brand / Maker</label>
                  <select
                    value={form.brandId || ""}
                    onChange={(e) => setForm({ ...form, brandId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
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
                  <label className="text-xs font-semibold text-slate-300">Primary UOM *</label>
                  <select
                    value={form.primaryUomId}
                    onChange={(e) => setForm({ ...form, primaryUomId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {form.itemType === 2 ? "SAC Code (Services) *" : "HSN / SAC Code"}
                  </label>
                  <input
                    type="text"
                    placeholder={form.itemType === 2 ? "e.g. 998311" : "e.g. 3004"}
                    value={form.hsnCode || ""}
                    onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Pricing Section: Retail Rate & Wholesale Rate Separate */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Pricing & Multi-Tier Rates (₹)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Retail & Wholesale Rates</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.purchasePrice || ""}
                      onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-400">Retail Rate (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.sellingPrice || ""}
                      onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-indigo-400">Wholesale Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.minimumSellingPrice || ""}
                      onChange={(e) => setForm({ ...form, minimumSellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/40 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.mrp || ""}
                      onChange={(e) => setForm({ ...form, mrp: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-300">GST Rate (%)</label>
                    <select
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Inventory & Storage Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Min Stock Alert Level (Qty)</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={form.minimumStockAlert || ""}
                    onChange={(e) => setForm({ ...form, minimumStockAlert: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Rack / Shelf / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-12, Bin 4"
                    value={form.rackLocation || ""}
                    onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Short Description / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Strip of 10 Tablets"
                    value={form.shortDescription || ""}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Industry Schema Fields */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-indigo-400 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>Dynamic Industry Attributes ({profile?.industryName})</span>
                </div>

                {profile?.industryCode === "PHARMA" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Drug Schedule</label>
                      <select
                        value={pharmaSchedule}
                        onChange={(e) => setPharmaSchedule(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="None">None (OTC)</option>
                        <option value="Schedule H">Schedule H (Prescription)</option>
                        <option value="Schedule H1">Schedule H1 (Controlled Register)</option>
                        <option value="Schedule X">Schedule X (Narcotic)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Active Salt / Composition</label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin + Clavulanate"
                        value={pharmaSalt}
                        onChange={(e) => setPharmaSalt(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {(profile?.industryCode === "APPAREL" || profile?.industryCode === "FOOTWEAR") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Size</label>
                      <input
                        type="text"
                        placeholder="e.g. M, L, XL, 42"
                        value={apparelSize}
                        onChange={(e) => setApparelSize(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Color</label>
                      <input
                        type="text"
                        placeholder="e.g. Navy Blue"
                        value={apparelColor}
                        onChange={(e) => setApparelColor(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {profile?.industryCode === "FMCG_GROCERY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Net Weight / Volume</label>
                    <input
                      type="text"
                      placeholder="e.g. 500g / 1 Litre"
                      value={fmcgNetWeight}
                      onChange={(e) => setFmcgNetWeight(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                )}

                {/* Inventory Management Options - For Physical Goods Only */}
                {form.itemType !== 2 && (
                  <>
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5 mt-2">
                      <label className="flex items-center space-x-2 text-xs text-indigo-300 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.trackInventory !== false}
                          onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 w-4 h-4"
                        />
                        <span>Manage Inventory & Stock for this product?</span>
                      </label>
                      <p className="text-[11px] text-slate-400 pl-6">
                        {form.trackInventory !== false
                          ? "Stock balances, reorder alerts, and warehouse ledger will be actively updated."
                          : "Non-stock item (print on demand, custom made, daily consumables). Invoicing allowed without stock deduction."}
                      </p>
                    </div>

                    {form.trackInventory !== false && (
                      <div className="flex items-center space-x-6 pt-1">
                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.trackBatches}
                            onChange={(e) => setForm({ ...form, trackBatches: e.target.checked })}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                          />
                          <span>Track Batches & Expiry Dates</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.trackSerialNumbers}
                            onChange={(e) => setForm({ ...form, trackSerialNumbers: e.target.checked })}
                            className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                          />
                          <span>Track Serial / IMEI Numbers</span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Initial Stock Opening - Only when tracking inventory for physical products */}
              {form.itemType !== 2 && form.trackInventory !== false && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Opening Stock Inward (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Warehouse</label>
                      <select
                        value={form.initialWarehouseId || ""}
                        onChange={(e) => setForm({ ...form, initialWarehouseId: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="">Default Warehouse</option>
                        {allWarehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.warehouseName} ({w.warehouseCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Initial Quantity</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.initialStock || ""}
                        onChange={(e) => setForm({ ...form, initialStock: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>

                    {form.trackBatches && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Initial Batch No</label>
                        <input
                          type="text"
                          placeholder="e.g. BATCH-2026-01"
                          value={form.initialBatchNumber || ""}
                          onChange={(e) => setForm({ ...form, initialBatchNumber: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving Product..." : "Save Product to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
