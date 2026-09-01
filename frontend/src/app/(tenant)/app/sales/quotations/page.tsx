"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRight,
  Printer,
  ChevronRight,
  Eye,
  X,
  AlertCircle
} from "lucide-react";
import { quotationService } from "@/services/quotation-services";
import { partyService } from "@/services/party-services";
import { inventoryService } from "@/services/inventory-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { QuotationList, PartyList, ItemList, UnitOfMeasure } from "@/types";

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | "">("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal / Drawer States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationList | null>(null);

  // Metadata for forms
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [customers, setCustomers] = useState<PartyList[]>([]);
  const [items, setItems] = useState<ItemList[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);

  // Create Form State
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGSTIN, setCustomerGSTIN] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntilDate, setValidUntilDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("Valid for 15 days from issue date.");
  const [formItems, setFormItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      quantity: number;
      uomId: string;
      unitPrice: number;
      discountPercent: number;
      taxRate: number;
    }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Convert Form State
  const [convertWarehouseId, setConvertWarehouseId] = useState("");
  const [convertInvoiceDate, setConvertInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [convertPaymentMode, setConvertPaymentMode] = useState(1); // Cash
  const [convertPaidAmount, setConvertPaidAmount] = useState(0);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, [pageNumber, statusFilter]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const res = await quotationService.getQuotations({
        pageNumber,
        pageSize: 15,
        status: statusFilter !== "" ? Number(statusFilter) : undefined,
        searchTerm: searchTerm || undefined
      });
      setQuotations(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [branchList, partyList, itemList, uomList] = await Promise.all([
        tenantAppService.getBranches(),
        partyService.getParties({ partyType: 1, pageSize: 100 }), // Customers
        inventoryService.getItems({ pageSize: 100 }),
        inventoryService.getUnitsOfMeasure()
      ]);
      setBranches(branchList);
      if (branchList.length > 0) {
        setSelectedBranchId(branchList[0].id);
        const whList = await tenantAppService.getWarehouses(branchList[0].id);
        setWarehouses(whList);
        if (whList.length > 0) setConvertWarehouseId(whList[0].id);
      }
      setCustomers(partyList.items || []);
      setItems(itemList.items || []);
      setUoms(uomList || []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  const handleBranchChange = async (bId: string) => {
    setSelectedBranchId(bId);
    try {
      const whList = await tenantAppService.getWarehouses(bId);
      setWarehouses(whList);
      if (whList.length > 0) setConvertWarehouseId(whList[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    const p = customers.find((c) => c.id === partyId);
    if (p) {
      setCustomerName(p.legalName);
      setCustomerPhone(p.primaryPhone || p.mobile || "");
      setCustomerEmail(p.email || "");
      setCustomerGSTIN(p.gstin || "");
      setBillingAddress((p as any).city ? `${(p as any).city}, ${(p as any).state || ""}` : "");
    }
  };

  const addItemToForm = () => {
    if (items.length === 0 || uoms.length === 0) return;
    const defaultItem = items[0];
    setFormItems([
      ...formItems,
      {
        itemId: defaultItem.id,
        itemName: defaultItem.name,
        quantity: 1,
        uomId: defaultItem.primaryUomId || uoms[0].id,
        unitPrice: defaultItem.sellingPrice || 100,
        discountPercent: 0,
        taxRate: defaultItem.taxRate || 18
      }
    ]);
  };

  const updateFormItem = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    if (field === "itemId") {
      const itm = items.find((i) => i.id === value);
      if (itm) {
        updated[index] = {
          ...updated[index],
          itemId: itm.id,
          itemName: itm.name,
          unitPrice: itm.sellingPrice || 100,
          uomId: itm.primaryUomId || uoms[0].id,
          taxRate: itm.taxRate || 18
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormItems(updated);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedSubTotal = formItems.reduce((acc, item) => {
    const gross = item.quantity * item.unitPrice;
    const disc = gross * (item.discountPercent / 100);
    return acc + (gross - disc);
  }, 0);

  const calculatedGlobalDisc = calculatedSubTotal * (discountPercent / 100);
  const calculatedTaxable = calculatedSubTotal - calculatedGlobalDisc;
  const calculatedGst = formItems.reduce((acc, item) => {
    const gross = item.quantity * item.unitPrice;
    const disc = gross * (item.discountPercent / 100);
    const taxable = gross - disc;
    return acc + taxable * (item.taxRate / 100);
  }, 0);
  const calculatedGrandTotal = Math.round(calculatedTaxable + calculatedGst);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      setErrorMsg("Customer name is required.");
      return;
    }
    if (formItems.length === 0) {
      setErrorMsg("At least one product item is required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      await quotationService.createQuotation({
        branchId: selectedBranchId,
        partyId: selectedPartyId || undefined,
        customerName,
        customerPhone,
        customerEmail,
        customerGSTIN,
        billingAddress,
        quotationDate,
        validUntilDate,
        quotationDiscountPercent: discountPercent,
        notes,
        items: formItems.map((i) => ({
          itemId: i.itemId,
          quantity: Number(i.quantity),
          uomId: i.uomId,
          unitPrice: Number(i.unitPrice),
          discountPercent: Number(i.discountPercent)
        }))
      });

      setShowCreateModal(false);
      // Reset form
      setFormItems([]);
      loadQuotations();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to create quotation.");
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!selectedQuotation) return;
    if (!convertWarehouseId) {
      alert("Please select a fulfillment warehouse.");
      return;
    }

    setConverting(true);
    try {
      const invoiceId = await quotationService.convertQuotationToInvoice(selectedQuotation.id, {
        warehouseId: convertWarehouseId,
        invoiceDate: convertInvoiceDate,
        primaryPaymentMode: convertPaymentMode,
        paidAmount: convertPaidAmount,
        notes: `Converted from Quotation ${selectedQuotation.quotationNumber}`
      });

      setShowConvertModal(false);
      router.push(`/app/sales/invoices/${invoiceId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to convert quotation.");
    } finally {
      setConverting(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Draft / Open
          </span>
        );
      case 5:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Invoiced
          </span>
        );
      case 7:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-3 h-3 mr-1" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Status: {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Quotations & Proforma Estimates</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate professional customer estimates, calculate dynamic GST, and 1-click convert into Sales Invoices
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            if (formItems.length === 0 && items.length > 0) {
              addItemToForm();
            }
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation / Estimate</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadQuotations()}
            placeholder="Search quotation #, customer..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : "")}
              className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="1">Draft / Open</option>
              <option value="5">Converted to Invoice</option>
              <option value="7">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => loadQuotations()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Quotation Number</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading quotations and estimates...</p>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-300">No quotations found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Create your first quotation by clicking the "New Quotation / Estimate" button above.
                    </p>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-indigo-400">
                      <Link href={`/app/sales/quotations/${q.id}`} className="hover:underline flex items-center space-x-1.5">
                        <span>{q.quotationNumber}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(q.quotationDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{q.customerName}</div>
                      {q.customerGSTIN && (
                        <div className="text-[10px] text-slate-500 font-mono">GST: {q.customerGSTIN}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {q.validUntilDate
                        ? new Date(q.validUntilDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                      ₹{q.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                      ₹{q.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(q.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link
                          href={`/app/sales/quotations/${q.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="Print / View Quotation"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {q.status !== 5 && q.status !== 7 && (
                          <button
                            onClick={() => {
                              setSelectedQuotation(q);
                              setConvertPaidAmount(0);
                              setShowConvertModal(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <span>Convert to Bill</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {q.status === 5 && (
                          <Link
                            href={`/app/sales/invoices/${q.convertedInvoiceId}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[11px] font-semibold"
                          >
                            <span>Invoice #{q.convertedInvoiceNumber || "View"}</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {quotations.length} of {totalCount} quotations
            </div>
            <div className="flex space-x-2">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => p - 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-300"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-200">
                {pageNumber} / {totalPages}
              </span>
              <button
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => p + 1)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE QUOTATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Create New Quotation / Estimate</h3>
                <p className="text-xs text-slate-400">Draft a GST compliant pricing estimate for customer review</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateQuotation} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Branch & Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Billing Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName} ({b.state || "MH"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Customer (Debtor)</label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => handlePartySelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  >
                    <option value="">-- One-off / Walk-in Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} {c.gstin ? `(${c.gstin})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Apollo Hospital / Suresh Kumar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Customer GSTIN</label>
                  <input
                    type="text"
                    value={customerGSTIN}
                    onChange={(e) => setCustomerGSTIN(e.target.value.toUpperCase())}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white uppercase focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Quotation Date</label>
                  <input
                    type="date"
                    required
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Valid Until Date</label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Product Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">Estimate Line Items</h4>
                  <button
                    type="button"
                    onClick={addItemToForm}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 w-24">Qty</th>
                        <th className="p-2.5 w-24">UOM</th>
                        <th className="p-2.5 w-28">Rate (₹)</th>
                        <th className="p-2.5 w-20">Disc %</th>
                        <th className="p-2.5 w-20">GST %</th>
                        <th className="p-2.5 w-28 text-right">Line Total (₹)</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {formItems.map((fi, idx) => {
                        const gross = fi.quantity * fi.unitPrice;
                        const disc = gross * (fi.discountPercent / 100);
                        const taxable = gross - disc;
                        const tax = taxable * (fi.taxRate / 100);
                        const lineTotal = taxable + tax;

                        return (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-2">
                              <select
                                value={fi.itemId}
                                onChange={(e) => updateFormItem(idx, "itemId", e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                              >
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} ({it.sku})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={fi.quantity}
                                onChange={(e) => updateFormItem(idx, "quantity", Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white text-right"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={fi.uomId}
                                onChange={(e) => updateFormItem(idx, "uomId", e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                              >
                                {uoms.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={fi.unitPrice}
                                onChange={(e) => updateFormItem(idx, "unitPrice", Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white text-right"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={fi.discountPercent}
                                onChange={(e) => updateFormItem(idx, "discountPercent", Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white text-right"
                              />
                            </td>
                            <td className="p-2">
                              <span className="inline-block bg-slate-900 px-2 py-1.5 rounded border border-slate-800 text-slate-300">
                                {fi.taxRate}%
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-white font-mono">
                              ₹{lineTotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeFormItem(idx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Notes & Payment Terms</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  />
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-white">₹{calculatedSubTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Global Discount (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-800 rounded p-1 text-right text-white"
                    />
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated GST (CGST + SGST / IGST):</span>
                    <span className="font-mono text-white">₹{calculatedGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                    <span>Grand Total (Rounded):</span>
                    <span className="text-indigo-400 font-mono text-base">₹{calculatedGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? "Saving Quotation..." : "Save & Generate Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO INVOICE MODAL */}
      {showConvertModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Convert to Sales Invoice</h3>
                <p className="text-[11px] text-slate-400">Quotation #{selectedQuotation.quotationNumber}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-indigo-200 space-y-1">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold text-white">{selectedQuotation.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-white font-mono">
                  ₹{selectedQuotation.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Fulfillment Warehouse *</label>
                <select
                  value={convertWarehouseId}
                  onChange={(e) => setConvertWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={convertInvoiceDate}
                  onChange={(e) => setConvertInvoiceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Mode</label>
                  <select
                    value={convertPaymentMode}
                    onChange={(e) => setConvertPaymentMode(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                  >
                    <option value="1">Cash</option>
                    <option value="2">UPI / QR Code</option>
                    <option value="3">Credit Card / POS</option>
                    <option value="5">Bank NEFT/RTGS</option>
                    <option value="6">Credit (Unpaid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={convertPaidAmount}
                    onChange={(e) => setConvertPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-right focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {converting ? "Converting..." : "Generate Invoice Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
