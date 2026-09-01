"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { salesService, CreateSalesInvoiceInput, CreateInvoiceItemInput } from "@/services/sales-services";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { p0ReportService } from "@/services/p0-reports.service";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { printTemplateService } from "@/services/print-template-services";
import { printRawHtml } from "@/lib/print-helper";
import { SalesInvoiceList, MasterItem, PartyList } from "@/types";
import { QuickAddCustomerModal } from "@/components/sales/quick-add-customer-modal";
import { useAddons } from "@/context/addon-context";

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
  unitPrice: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  totalAmount: number;
  availableBatches: ItemBatch[];
  loadingBatches?: boolean;
}

export default function TenantInvoicesPage() {
  const [invoices, setInvoices] = useState<SalesInvoiceList[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [customers, setCustomers] = useState<PartyList[]>([]);
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAddonActive, isFeatureActive } = useAddons();
  const hasPharmaAddon = isAddonActive("pharma");
  const hasFmcgAddon = isAddonActive("fmcg");
  const hasBatchTracking = hasPharmaAddon || isFeatureActive("enableBatchTracking");
  // Packing & Free Qty columns visible for Pharma OR FMCG addon users
  const hasPackingFreeQty = hasPharmaAddon || hasFmcgAddon || isFeatureActive("enableMultiUnitConversion");

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
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

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
      const [invRes, itemsRes, custRes, brRes, whRes] = await Promise.all([
        salesService.getInvoices({
          searchTerm: searchTerm || undefined,
          status: selectedStatus ? parseInt(selectedStatus) : undefined,
          invoiceType: selectedType ? parseInt(selectedType) : undefined,
        }),
        inventoryService.getItems({ pageSize: 150 }),
        partyService.getCustomers({ pageSize: 150 }),
        tenantAppService.getBranches(),
        tenantAppService.getWarehouses(),
      ]);

      setInvoices(invRes.items);
      setItems(itemsRes.items);
      setCustomers(custRes.items);
      setBranches(brRes);
      setWarehouses(whRes);

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

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedStatus, selectedType]);

  // Load customer previous deal history for instant hints on each product
  useEffect(() => {
    if (!selectedCustomerId && !customerName) {
      setCustomerDealHistoryMap({});
      return;
    }

    p0ReportService
      .getSalesRegisterDetailed({
        partyId: selectedCustomerId || undefined,
        searchTerm: !selectedCustomerId ? customerName : undefined,
        pageSize: 150,
      })
      .then((res) => {
        if (res?.items) {
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
      .catch(() => setCustomerDealHistoryMap({}));
  }, [selectedCustomerId, customerName]);

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

  const handleAddLine = async () => {
    if (items.length === 0) return;
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

    const newRate =
      selectedBatch?.saleRate && selectedBatch.saleRate > 0
        ? selectedBatch.saleRate
        : item.sellingPrice || item.mrp || 0;
    const newMrp =
      selectedBatch?.mrp && selectedBatch.mrp > 0
        ? selectedBatch.mrp
        : item.mrp || 0;

    const calculated = calculateLineAmounts(
      1,
      newRate,
      "percent",
      0,
      item.taxRate || 18
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
      unitPrice: newRate,
      discountType: "percent",
      discountValue: 0,
      discountAmount: calculated.discountAmount,
      taxableAmount: calculated.taxableAmount,
      gstRate: item.taxRate || 18,
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

    const calculated = calculateLineAmounts(
      1,
      newRate,
      "percent",
      0,
      found.taxRate || 18
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
              unitPrice: newRate,
              gstRate: found.taxRate || 18,
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
        expiryDate: line.expiryDate ? undefined : undefined,
        quantity: Number(line.quantity) || 1,
        freeQuantity: Number(line.freeQuantity) || 0,
        packing: line.packing || undefined,
        hsnCode: line.hsnCode || undefined,
        uomId: line.uomId,
        unitPrice: Number(line.unitPrice) || 0,
        mrp: Number(line.mrp) || 0,
        discountPercent: line.discountType === "percent" ? Number(line.discountValue) : 0,
        discountAmount: line.discountAmount || 0,
        attributesJson: JSON.stringify({
          packing: line.packing,
          freeQuantity: line.freeQuantity,
          expiryFormatted: line.expiryDate,
          mrp: line.mrp,
        }),
      }));

      const createdInvoiceId = await salesService.createInvoice({
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
        attributesJson: JSON.stringify({
          customerDlNumber: customerDlNumber || (selectedParty as any)?.drugLicenseNumber1 || (selectedParty as any)?.dlNumber || "",
          billingMode: billingMode,
        }),
        items: itemsPayload,
      });

      // 🖨️ Instant Auto-Print via Active Invoice Template (Pharma A4 / Standard / Thermal)
      if (createdInvoiceId) {
        try {
          const preview = await printTemplateService.renderPreview({ invoiceId: createdInvoiceId });
          if (preview?.renderedHtml) {
            printRawHtml(preview.renderedHtml, `Tax_Invoice_${createdInvoiceId.slice(0, 8)}`);
          }
        } catch (printErr) {
          console.error("Auto-print preview generation error:", printErr);
        }
      }

      setIsDrawerOpen(false);
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
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Paid</span>;
      case 1:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Partial</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Unpaid</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
            <span>Sales Invoices & GST Billing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, track, and print B2B / B2C tax invoices with real-time GST tax resolution.
          </p>
        </div>

        <button
          onClick={() => {
            setIsDrawerOpen(true);
            if (invoiceLines.length === 0) handleAddLine();
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tax Invoice</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Loading sales tax invoices...</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No sales invoices found. Click "Create Tax Invoice" to generate one.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-white flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <Link
                        href={`/app/sales/invoices/${inv.id}`}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold"
                        title="Click to View / Print Invoice Details"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-xs">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{inv.customerName}</div>
                      {inv.customerGSTIN && <div className="text-xs text-slate-400 font-mono">{inv.customerGSTIN}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">{inv.branchName || "Main Branch"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">₹{inv.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-rose-400">
                      ₹{inv.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getPaymentBadge(inv.paymentStatus)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Link
                          href={`/app/sales/invoices/${inv.id}`}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1 transition"
                          title="Print / View 16-Column Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Tax Invoice Modal / Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-7xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-4 max-h-[92vh] flex, flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  <span>Create B2B / B2C GST Tax Invoice</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {hasPharmaAddon
                    ? "Pharma & Healthcare GST Billing with Batch, Expiry, Free Schemes, Multi-tier Discount, and Drug License tracking."
                    : "GST Tax Invoicing & Billing with HSN/SAC, Quantity, Multi-tier Discount, Transport Details, and Instant Tax Resolution."}
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Top Persistent Billing Mode Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode (F9):</span>
                  <button
                    type="button"
                    onClick={() => handleSetBillingMode("b2b")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      billingMode === "b2b"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>🏢 B2B Tax Invoice</span>
                    {billingMode === "b2b" && <span className="text-[9px] bg-indigo-500/80 px-1 py-0.2 rounded font-mono">DEFAULT</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBillingMode("retail")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      billingMode === "retail"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-500"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>🧾 Cash Memo / Retail</span>
                    {billingMode === "retail" && <span className="text-[9px] bg-emerald-500/80 px-1 py-0.2 rounded font-mono">DEFAULT</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetBillingMode("thermal")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      billingMode === "thermal"
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-500"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>🖨️ Thermal POS (80mm)</span>
                    {billingMode === "thermal" && <span className="text-[9px] bg-amber-500/80 px-1 py-0.2 rounded font-mono">DEFAULT</span>}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsShortcutsHelpOpen(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-800 transition"
                    title="View all Keyboard Shortcuts (F1)"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold">Hotkeys (F1)</span>
                  </button>
                </div>
              </div>

              {/* Header Fields: Branch, Warehouse, Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dispatch Branch *</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      const b = branches.find((br) => br.id === e.target.value);
                      if (b) setBillingStateCode(b.stateCode || "27");
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName} ({b.stateCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Dispatch Warehouse *</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Customer Selector & Party Details (Clean uncluttered layout with [+] Quick Add) */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Users2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Customer Account</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
                    title="Add New Customer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Customer</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6 flex items-center space-x-2">
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
                          setCustomerDlNumber((found as any).drugLicenseNumber1 || (found as any).dlNumber || "");
                          setBillingAddress(found.tradeName || (found as any).billingAddress?.addressLine1 || "");
                          setBillingStateCode(found.stateCode || "27");
                        } else {
                          setCustomerName("");
                          setCustomerPhone("");
                          setCustomerGstin("");
                          setCustomerDlNumber("");
                          setBillingAddress("");
                          setBillingStateCode("27");
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="">-- One-time Walk-in Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.legalName} ({c.primaryPhone || c.mobile || "No Phone"}) {c.gstin ? `[${c.gstin}]` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsAddCustomerModalOpen(true)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition-colors shrink-0 flex items-center justify-center"
                      title="Quick Add New Customer (+)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Clean customer preview - No cluttered empty inputs visible */}
                  {selectedCustomerId ? (
                    <div className="sm:col-span-6 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{customerName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Registered
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                            {customerPhone && (
                              <span>
                                Ph: <strong className="text-slate-200">{customerPhone}</strong>
                              </span>
                            )}
                            {customerGstin && (
                              <span>
                                GSTIN: <strong className="text-slate-200">{customerGstin}</strong>
                              </span>
                            )}
                            {hasPharmaAddon && customerDlNumber && (
                              <span>
                                DL: <strong className="text-slate-200">{customerDlNumber}</strong>
                              </span>
                            )}
                            <span>
                              State: <strong className="text-slate-200">{billingStateCode}</strong>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId("");
                            setCustomerName("");
                            setCustomerPhone("");
                            setCustomerGstin("");
                            setCustomerDlNumber("");
                            setBillingAddress("");
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-400 underline ml-2 shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Buyer Name (Walk-in) *"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Phone / Mobile (Optional)"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dedicated B2B Transport & Logistics Card */}
              {billingMode === "b2b" && (
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Truck className="w-4 h-4 text-indigo-400" />
                      <span>B2B Transport, LR (Bilty) & PO Tracking</span>
                    </span>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={isReverseCharge}
                        onChange={(e) => setIsReverseCharge(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span>Reverse Charge (RCM Applicable)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Transporter Name</label>
                      <input
                        type="text"
                        placeholder="e.g. V-Trans, TCI, Jaipur Golden"
                        value={transporterName}
                        onChange={(e) => setTransporterName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Vehicle Number</label>
                      <input
                        type="text"
                        placeholder="e.g. MH-12-RN-9921"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">LR (Bilty) Number</label>
                      <input
                        type="text"
                        placeholder="e.g. LR-88219"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">LR Date</label>
                      <input
                        type="date"
                        value={lrDate}
                        onChange={(e) => setLrDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Buyer PO Number</label>
                      <input
                        type="text"
                        placeholder="e.g. PO-2026-44"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Buyer PO Date</label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300">E-Way Bill Number</label>
                      <input
                        type="text"
                        placeholder="12-digit E-Way Bill (e.g. 2410 8891 0029)"
                        value={eWayBillNumber}
                        onChange={(e) => setEWayBillNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items Table with Complete Columns */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">Itemized Billing Table</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {hasBatchTracking
                        ? "(Includes Batch, Expiry, Scheme Free Qty, Packing, MRP, Disc %, GST)"
                        : hasPackingFreeQty
                        ? "(Includes Scheme Free Qty, Packing, Item, HSN/SAC, Qty, Unit, Price, Disc %, GST)"
                        : "(Includes Item/Service, HSN/SAC, Quantity, Unit, Price, Disc %, GST)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 border border-slate-700 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Blank Row</span>
                  </button>
                </div>

                {/* Quick Product Search & Batch Autofill Bar */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-indigo-400 absolute left-3 pointer-events-none" />
                    <input
                      id="quick-product-search-input"
                      type="text"
                      placeholder={
                        hasBatchTracking
                          ? "🔍 Search product (F2) to view all available batches and autofill immediately..."
                          : "🔍 Search product or service (F2) to add line item..."
                      }
                      value={quickProductSearch}
                      onChange={(e) => setQuickProductSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none shadow-sm"
                    />
                    {quickProductSearch && (
                      <button
                        type="button"
                        onClick={() => setQuickProductSearch("")}
                        className="absolute right-3 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

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

                <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs min-w-[900px]">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="px-2.5 py-2 min-w-[200px]">Product / Item *</th>
                        {hasBatchTracking && <th className="px-2.5 py-2 min-w-[130px]">Lot / Batch No</th>}
                        {hasBatchTracking && <th className="px-2 py-2 w-20">Expiry</th>}
                        {hasPackingFreeQty && <th className="px-2 py-2 w-20">Packing</th>}
                        <th className="px-2 py-2 w-20">HSN/SAC</th>
                        <th className="px-2 py-2 w-16 text-center">Qty *</th>
                        {hasPackingFreeQty && <th className="px-2 py-2 w-16 text-center">Free</th>}
                        <th className="px-2 py-2 w-20">MRP (₹)</th>
                        <th className="px-2 py-2 w-20">Unit</th>
                        <th className="px-2.5 py-2 w-24">Rate (₹) *</th>
                        <th className="px-2 py-2 w-24">Disc % / ₹</th>
                        <th className="px-2.5 py-2 w-24 text-right">Taxable</th>
                        <th className="px-2 py-2 w-16 text-center">GST %</th>
                        <th className="px-2.5 py-2 w-24 text-right">Amount (₹)</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950">
                      {invoiceLines.map((line, idx) => (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-slate-900/40">
                            {/* 1. Item Selection */}
                            <td className="p-1.5 align-top">
                              <select
                                value={line.itemId}
                                onChange={(e) => handleLineItemChange(idx, e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                              >
                                {items.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name} ({i.sku})
                                  </option>
                                ))}
                              </select>
                              {line.availableBatches && line.availableBatches.length > 1 ? (
                                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold mt-1">
                                  <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>{line.availableBatches.length} Batches in Stock (FEFO auto-filled)</span>
                                </div>
                              ) : line.availableBatches && line.availableBatches.length === 1 ? (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  Batch: {line.batchNumber} (Auto-filled)
                                </div>
                              ) : null}
                            </td>

                            {/* 2. Batch / Lot No */}
                            {hasBatchTracking && (
                              <td className="p-1.5 align-top">
                                {line.availableBatches && line.availableBatches.length > 0 ? (
                                  <div className="space-y-1">
                                    <select
                                      value={line.batchId || ""}
                                      onChange={(e) => handleBatchSelect(idx, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-indigo-500/50 rounded text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
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
                                    {line.availableBatches.length > 1 && (
                                      <span className="text-[9px] text-indigo-400 font-medium block">
                                        Switch batch
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Batch No"
                                    value={line.batchNumber || ""}
                                    onChange={(e) => updateLineField(idx, "batchNumber", e.target.value)}
                                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                                  />
                                )}
                              </td>
                            )}

                            {/* 3. Expiry */}
                            {hasBatchTracking && (
                              <td className="p-1.5 align-top">
                                <input
                                  type="text"
                                  placeholder="MM/YY"
                                  value={line.expiryDate || ""}
                                  onChange={(e) => updateLineField(idx, "expiryDate", e.target.value)}
                                  className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                            )}

                            {/* 4. Packing */}
                            {hasPackingFreeQty && (
                              <td className="p-1.5 align-top">
                                <input
                                  type="text"
                                  placeholder="10x10"
                                  value={line.packing || ""}
                                  onChange={(e) => updateLineField(idx, "packing", e.target.value)}
                                  className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 text-center focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                            )}

                            {/* 5. HSN/SAC */}
                            <td className="p-1.5 align-top">
                              <input
                                type="text"
                                placeholder="HSN"
                                value={line.hsnCode || ""}
                                onChange={(e) => updateLineField(idx, "hsnCode", e.target.value)}
                                className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* 6. Billed Qty */}
                            <td className="p-1.5 align-top">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity}
                                onChange={(e) => updateLineField(idx, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono text-center font-bold focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* 7. Free Qty */}
                            {hasPackingFreeQty && (
                              <td className="p-1.5 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={line.freeQuantity || ""}
                                  onChange={(e) => updateLineField(idx, "freeQuantity", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-emerald-400 font-mono text-center focus:outline-none focus:border-indigo-500"
                                />
                              </td>
                            )}

                            {/* 8. MRP */}
                            <td className="p-1.5 align-top">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={line.mrp || ""}
                                onChange={(e) => updateLineField(idx, "mrp", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* 9. Unit */}
                            <td className="p-1.5 pt-2.5 font-semibold text-slate-400 text-center align-top">
                              {line.uomCode || "UNIT"}
                            </td>

                            {/* 10. Selling Rate */}
                            <td className="p-1.5 align-top">
                              <input
                                type="number"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => updateLineField(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* 11. Discount */}
                            <td className="p-1.5 align-top">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  value={line.discountValue || ""}
                                  onChange={(e) => updateLineField(idx, "discountValue", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-amber-400 font-mono focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateLineField(idx, "discountType", line.discountType === "percent" ? "fixed" : "percent")}
                                  className="px-1.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                                  title="Toggle % or Flat ₹"
                                >
                                  {line.discountType === "percent" ? "%" : "₹"}
                                </button>
                              </div>
                            </td>

                            {/* 12. Taxable */}
                            <td className="p-1.5 pt-2.5 text-right font-mono font-semibold text-slate-300 align-top">
                              ₹{line.taxableAmount.toFixed(2)}
                            </td>

                            {/* 13. GST % */}
                            <td className="p-1.5 text-center font-mono align-top">
                              <select
                                value={line.gstRate}
                                onChange={(e) => updateLineField(idx, "gstRate", parseFloat(e.target.value) || 0)}
                                className="px-1 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>

                            {/* 14. Net Amount */}
                            <td className="p-1.5 pt-2.5 text-right font-mono font-bold text-emerald-400 align-top">
                              ₹{line.totalAmount.toFixed(2)}
                            </td>

                            {/* 15. Delete */}
                            <td className="p-1.5 pt-2 text-center align-top">
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

                          {/* Customer Deal History Hint Strip */}
                          <tr className="bg-slate-900/30 border-b border-slate-800/80">
                            <td colSpan={15} className="px-3 py-1.5 text-[11px]">
                              {customerDealHistoryMap[line.itemId] && customerDealHistoryMap[line.itemId].length > 0 ? (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-bold text-amber-400 flex items-center space-x-1 shrink-0">
                                    <History className="w-3.5 h-3.5" />
                                    <span>Last 3 Deals for {customerName || "this customer"}:</span>
                                  </span>
                                  {customerDealHistoryMap[line.itemId].map((deal, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="inline-flex items-center space-x-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 font-mono text-[10px]"
                                    >
                                      <strong className="text-white font-sans">{deal.date}</strong>
                                      <span className="text-slate-500">({deal.invoiceNumber})</span>
                                      <span>&rarr; Rate:</span>
                                      <strong className="text-emerald-400">₹{deal.rate.toFixed(2)}</strong>
                                      <span className="text-slate-400">({deal.discount})</span>
                                      <span>| Deal:</span>
                                      <strong className="text-indigo-300">{deal.dealQty}</strong>
                                      {deal.batchNumber && (
                                        <span className="text-slate-500">[{deal.batchNumber}]</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5 text-slate-500 text-[10px]">
                                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>
                                    {selectedCustomerId
                                      ? `First time selling "${line.itemName}" to ${customerName || "this customer"} (No prior deals recorded).`
                                      : "Select a customer account to view past rates, discounts, and free scheme deals."}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals & Payment Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="sm:col-span-7 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Payment Settlement & Tender Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tendered / Received Amount (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={paidAmount || ""}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Payment Mode</label>
                      <select
                        value={primaryPaymentMode}
                        onChange={(e) => setPrimaryPaymentMode(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="1">Cash</option>
                        <option value="2">UPI / QR</option>
                        <option value="3">Debit / Credit Card</option>
                        <option value="4">Bank Transfer / NEFT</option>
                        <option value="5">Cheque</option>
                        <option value="6">Customer Credit Ledger</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-5 bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal (Gross):</span>
                    <span>₹{subTotal.toFixed(2)}</span>
                  </div>
                  {totalItemDiscount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Total Item Discount:</span>
                      <span>- ₹{totalItemDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300 font-semibold">
                    <span>Taxable Amount:</span>
                    <span>₹{totalTaxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-400">
                    <span>Total GST:</span>
                    <span>+ ₹{totalTax.toFixed(2)}</span>
                  </div>
                  {Math.abs(roundOff) > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Round Off:</span>
                      <span>{roundOff >= 0 ? `+ ₹${roundOff.toFixed(2)}` : `- ₹${Math.abs(roundOff).toFixed(2)}`}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-1.5 flex justify-between text-sm font-bold text-emerald-400">
                    <span>Grand Total:</span>
                    <span>₹{netPayable.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{submitting ? "Generating..." : "Save & Print Invoice (F10)"}</span>
                </button>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
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
    </div>
  );
}
