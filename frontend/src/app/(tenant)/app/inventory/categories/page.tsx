"use client";

import { useEffect, useState } from "react";
import { BookOpen, Tag, Plus, Trash2, X, FolderTree, Building } from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { Category, Brand } from "@/types";

export default function TenantCategoriesAndBrandsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ code: "", name: "", description: "", parentCategoryId: "" });

  // Brand Modal
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ code: "", name: "", manufacturerName: "", description: "" });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, brs] = await Promise.all([
        inventoryService.getCategories(),
        inventoryService.getBrands(),
      ]);
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error("Failed to load categories and brands", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.code || !catForm.name) return;
    try {
      setSubmitting(true);
      await inventoryService.createCategory({
        code: catForm.code,
        name: catForm.name,
        description: catForm.description || undefined,
        parentCategoryId: catForm.parentCategoryId || undefined,
      });
      setIsCatModalOpen(false);
      setCatForm({ code: "", name: "", description: "", parentCategoryId: "" });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.code || !brandForm.name) return;
    try {
      setSubmitting(true);
      await inventoryService.createBrand({
        code: brandForm.code,
        name: brandForm.name,
        manufacturerName: brandForm.manufacturerName || undefined,
        description: brandForm.description || undefined,
      });
      setIsBrandModalOpen(false);
      setBrandForm({ code: "", name: "", manufacturerName: "", description: "" });
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.errorMessage || "Failed to create brand.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2.5">
          <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Product Categories &amp; Brand Directory</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Organize your product line into hierarchical departments, categories, and manufacturing brands.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center space-x-2">
              <FolderTree className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Categories ({categories.length})</span>
            </h2>
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground uppercase tracking-wider bg-surface-muted border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-foreground">Code / Name</th>
                  <th className="px-5 py-3.5 font-bold text-foreground">Items</th>
                  <th className="px-5 py-3.5 font-bold text-foreground text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mb-1"></div>
                      <div>Loading categories...</div>
                    </td>
                  </tr>
                ) : categories.length > 0 ? (
                  categories.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-muted/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{c.code}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {c.itemsCount} products
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No categories created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brands Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center space-x-2">
              <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Brands &amp; Manufacturers ({brands.length})</span>
            </h2>
            <button
              onClick={() => setIsBrandModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Brand</span>
            </button>
          </div>

          <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground uppercase tracking-wider bg-surface-muted border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-foreground">Brand / Manufacturer</th>
                  <th className="px-5 py-3.5 font-bold text-foreground">Code</th>
                  <th className="px-5 py-3.5 font-bold text-foreground text-right">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mb-1"></div>
                      <div>Loading brands...</div>
                    </td>
                  </tr>
                ) : brands.length > 0 ? (
                  brands.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-muted/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{b.name}</div>
                        <div className="text-[11px] text-muted-foreground">{b.manufacturerName || "—"}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{b.code}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                        {b.itemsCount} products
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No brands created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-foreground">Create New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TAB-ANTI"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Antibiotics Tablets"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Parent Category (Optional)</label>
                <select
                  value={catForm.parentCategoryId}
                  onChange={(e) => setCatForm({ ...catForm, parentCategoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  <option value="">None (Top Level Root)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-muted text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsBrandModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-foreground">Add Brand / Manufacturer</h3>
            <form onSubmit={handleCreateBrand} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Brand Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIPLA"
                  value={brandForm.code}
                  onChange={(e) => setBrandForm({ ...brandForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cipla Ltd."
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Manufacturer Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cipla Pharmaceuticals Inc."
                  value={brandForm.manufacturerName}
                  onChange={(e) => setBrandForm({ ...brandForm, manufacturerName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-muted text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
