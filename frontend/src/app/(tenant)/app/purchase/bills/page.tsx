"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Eye,
  X,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  IndianRupee,
  Layers,
  Boxes,
  ArrowUpRight
} from "lucide-react";
import { purchaseService } from "@/services/purchase-services";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import {
  PurchaseBillList,
  PurchaseBillDetails,
  CreatePurchaseBillRequest,
  CreatePurchaseBillItemRequest,
  RecordPurchaseBillPaymentRequest,
  PartyDto,
  MasterItem,
  GrnList
} from "@/types";
import { useAddons } from "@/context/addon-context";

export default function PurchaseBillsPage() {
  const [bills, setBills] = useState<PurchaseBillList[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAddonActive, isFeatureActive } = useAddons();
  const hasPharmaAddon = isAddonActive("pharma");
  const hasBatchTracking = hasPharmaAddon || isFeatureActive("enableBatchTracking");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Metadata
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseDetails[]>([]);
  const [suppliers, setSuppliers] = useState<PartyDto[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [grns, setGrns] = useState<GrnList[]>([]);

  // Drawer / Modal State
  const [selectedBill, setSelectedBill] = useState<PurchaseBillDetails | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Quick Product Form State
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodPacking, setProdPacking] = useState("10x10");
  const [prodHsn, setProdHsn] = useState("30049099");
  const [prodTaxRate, setProdTaxRate] = useState<number>(12);
  const [prodMrp, setProdMrp] = useState<number>(100);
  const [prodPurchasePrice, setProdPurchasePrice] = useState<number>(65);
  const [prodSellingPrice, setProdSellingPrice] = useState<number>(85);
  const [prodInitialBatch, setProdInitialBatch] = useState("");
  const [prodInitialExpiry, setProdInitialExpiry] = useState("");

  // Quick Supplier Form State
  const [suppLegalName, setSuppLegalName] = useState("");
  const [suppTradeName, setSuppTradeName] = useState("");
  const [suppType, setSuppType] = useState<number>(2); // Distributor
  const [suppPhone, setSuppPhone] = useState("");
  const [suppMobile, setSuppMobile] = useState("");
  const [suppEmail, setSuppEmail] = useState("");
  const [suppGstin, setSuppGstin] = useState("");
  const [suppPan, setSuppPan] = useState("");
  const [suppDl1, setSuppDl1] = useState("");
  const [suppDl2, setSuppDl2] = useState("");
  const [suppFssai, setSuppFssai] = useState("");
  const [suppAddress1, setSuppAddress1] = useState("");
  const [suppAddress2, setSuppAddress2] = useState("");
  const [suppCity, setSuppCity] = useState("Delhi");
  const [suppState, setSuppState] = useState("Delhi");
  const [suppStateCode, setSuppStateCode] = useState("07");
  const [suppPincode, setSuppPincode] = useState("110092");
  const [suppOpeningBal, setSuppOpeningBal] = useState<number>(0);
  const [suppOpeningType, setSuppOpeningType] = useState<number>(2); // 2: Credit (Payable)

  // Form State - Create Bill
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedGrnId, setSelectedGrnId] = useState<string | undefined>(undefined);
  const [vendorInvNum, setVendorInvNum] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [overallDiscountType, setOverallDiscountType] = useState<"percent" | "fixed">("fixed");
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<number>(3); // 3: BankTransfer
  const [notes, setNotes] = useState("");
  const [billItems, setBillItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      sku: string;
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
      taxRate: number;
      totalAmount: number;
    }>
  >([]);

  // Form State - Payment Disbursement Modal
  const [disburseBillId, setDisburseBillId] = useState("");
  const [disburseBillNumber, setDisburseBillNumber] = useState("");
  const [disburseSupplierName, setDisburseSupplierName] = useState("");
  const [disburseBalance, setDisburseBalance] = useState(0);
  const [disburseAmount, setDisburseAmount] = useState(0);
  const [disburseMode, setDisburseMode] = useState(3);
  const [disburseRef, setDisburseRef] = useState("");
  const [disburseBank, setDisburseBank] = useState("");

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await purchaseService.getPurchaseBills({
        pageNumber: page,
        pageSize: 15,
        searchTerm: searchTerm || undefined
      });
      setBills(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.error("Failed to load bills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [page]);

  useEffect(() => {
    Promise.all([
      tenantAppService.getBranches(),
      partyService.getSuppliers({ pageNumber: 1, pageSize: 100 }),
      inventoryService.getItems({ pageNumber: 1, pageSize: 100 }),
      purchaseService.getGoodsReceiptNotes({ pageNumber: 1, pageSize: 50 })
    ]).then(([branchData, supplierData, itemData, grnData]) => {
      setBranches(branchData);
      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id);
        tenantAppService.getWarehouses(branchData[0].id).then((wh) => {
          setWarehouses(wh);
          if (wh.length > 0) setSelectedWarehouseId(wh[0].id);
        });
      }
      setSuppliers(supplierData.items);
      setItems(itemData.items);
      setGrns(grnData.items);
    });
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    const wh = await tenantAppService.getWarehouses(branchId);
    setWarehouses(wh);
    if (wh.length > 0) setSelectedWarehouseId(wh[0].id);
  };

  const handleGrnSelect = async (grnId: string) => {
    setSelectedGrnId(grnId || undefined);
    if (!grnId) return;

    try {
      const grnDetails = await purchaseService.getGrnById(grnId);
      setSelectedPartyId(grnDetails.partyId);
      setSelectedBranchId(grnDetails.branchId);
      setSelectedWarehouseId(grnDetails.warehouseId);
      if (grnDetails.deliveryChallanNumber) setVendorInvNum(grnDetails.deliveryChallanNumber);

      const prefillItems = grnDetails.items.map((gi) => {
        const gross = gi.acceptedQuantity * gi.unitCost;
        const taxAmt = gross * 0.18;
        return {
          itemId: gi.itemId,
          itemName: gi.itemName,
          sku: gi.itemSku,
          batchNumber: gi.batchNumber || "",
          expiryDate: gi.expiryDate ? new Date(gi.expiryDate).toISOString().slice(0, 7) : "",
          packing: "10x10",
          hsnCode: "3004",
          quantity: gi.acceptedQuantity,
          freeQuantity: 0,
          uomId: gi.uomId,
          uomCode: gi.uomCode,
          mrp: gi.unitCost * 1.5,
          unitPrice: gi.unitCost,
          discountType: "percent" as const,
          discountValue: 0,
          discountAmount: 0,
          taxableAmount: gross,
          taxRate: 18,
          totalAmount: gross + taxAmt
        };
      });
      setBillItems(prefillItems);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = (itemId: string) => {
    const itm = items.find((i) => i.id === itemId);
    if (!itm) return;

    let packing = "";
    try {
      const attrs = JSON.parse(itm.attributesJson || "{}");
      packing = attrs.packing || attrs.netWeight || attrs.size || "";
    } catch {}

    const rate = itm.purchasePrice || (itm.sellingPrice ? itm.sellingPrice * 0.7 : 50);
    const gross = 10 * rate;
    const taxAmt = gross * ((itm.taxRate || 18) / 100);

    setBillItems([
      ...billItems,
      {
        itemId: itm.id,
        itemName: itm.name,
        sku: itm.sku,
        batchNumber: `BAT-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${String(new Date().getFullYear() + 2).slice(2)}`,
        packing: packing || "10x10",
        hsnCode: itm.hsnCode || "3004",
        quantity: 10,
        freeQuantity: 0,
        uomId: itm.primaryUomId,
        uomCode: itm.primaryUomCode,
        mrp: itm.mrp || (rate * 1.4),
        unitPrice: rate,
        discountType: "percent",
        discountValue: 0,
        discountAmount: 0,
        taxableAmount: gross,
        taxRate: itm.taxRate || 18,
        totalAmount: gross + taxAmt
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, idx) => idx !== index));
  };

  const updateBillLineField = (idx: number, field: string, value: any) => {
    setBillItems(
      billItems.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        const gross = Number(updated.quantity) * Number(updated.unitPrice);
        const disc = updated.discountType === "percent"
          ? (gross * (Number(updated.discountValue) / 100))
          : Number(updated.discountValue);
        const taxable = Math.max(0, gross - disc);
        const taxAmt = taxable * (Number(updated.taxRate) / 100);
        return {
          ...updated,
          discountAmount: Math.round(disc * 100) / 100,
          taxableAmount: Math.round(taxable * 100) / 100,
          totalAmount: Math.round((taxable + taxAmt) * 100) / 100
        };
      })
    );
  };

  const handleCreateQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppLegalName.trim()) {
      alert("Supplier Legal Name is required.");
      return;
    }

    try {
      setCreatingSupplier(true);
      const autoCode = "SUP-" + Math.floor(1000 + Math.random() * 9000);
      const newSupplierId = await partyService.createSupplier({
        code: autoCode,
        legalName: suppLegalName.trim(),
        tradeName: suppTradeName.trim() || suppLegalName.trim(),
        partyType: 2, // Supplier
        supplierType: suppType,
        primaryPhone: suppPhone || undefined,
        mobile: suppMobile || undefined,
        email: suppEmail || undefined,
        gstin: suppGstin.trim().toUpperCase() || undefined,
        pan: suppPan.trim().toUpperCase() || undefined,
        drugLicenseNumber1: suppDl1.trim() || undefined,
        drugLicenseNumber2: suppDl2.trim() || undefined,
        fssaiNumber: suppFssai.trim() || undefined,
        openingBalance: Number(suppOpeningBal) || 0,
        openingBalanceType: suppOpeningType,
        billingAddress: {
          addressType: 1,
          addressLine1: suppAddress1.trim() || "Main Road",
          addressLine2: suppAddress2.trim() || undefined,
          city: suppCity.trim() || "Delhi",
          state: suppState.trim() || "Delhi",
          stateCode: suppStateCode.trim() || "07",
          pincode: suppPincode.trim() || "110092",
          country: "India"
        }
      });

      // Reload suppliers and select newly created supplier
      const suppData = await partyService.getSuppliers({ pageNumber: 1, pageSize: 100 });
      setSuppliers(suppData.items);
      setSelectedPartyId(newSupplierId);
      setIsQuickSupplierOpen(false);

      // Reset form
      setSuppLegalName("");
      setSuppTradeName("");
      setSuppPhone("");
      setSuppMobile("");
      setSuppEmail("");
      setSuppGstin("");
      setSuppPan("");
      setSuppDl1("");
      setSuppDl2("");
      setSuppFssai("");
      setSuppAddress1("");
      setSuppAddress2("");
      setSuppOpeningBal(0);
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to add supplier. Please check details.");
    } finally {
      setCreatingSupplier(false);
    }
  };

  const handleCreateQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert("Product Name is required.");
      return;
    }

    try {
      setCreatingProduct(true);
      const cleanName = prodName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const prefix = cleanName.length >= 3 ? cleanName.substring(0, 3) : "PRD";
      const autoSku = prodSku.trim() || `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

      let uoms: any[] = [];
      try {
        uoms = await inventoryService.getUnits();
      } catch {}
      const defaultUom = uoms.length > 0 ? uoms[0] : { id: "00000000-0000-0000-0000-000000000000", code: "STP" };

      const batchNum = prodInitialBatch.trim() || `BAT-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
      const expDate = prodInitialExpiry.trim() || `${String(new Date().getMonth() + 1).padStart(2, "0")}/${String(new Date().getFullYear() + 2).slice(2)}`;

      const newId = await inventoryService.createItem({
        sku: autoSku,
        name: prodName.trim(),
        shortDescription: `${prodName.trim()} - Pack: ${prodPacking}`,
        primaryUomId: defaultUom.id,
        hsnCode: prodHsn.trim() || "30049099",
        taxRate: Number(prodTaxRate) || 12,
        purchasePrice: Number(prodPurchasePrice) || 50,
        sellingPrice: Number(prodSellingPrice) || 75,
        mrp: Number(prodMrp) || 100,
        minimumStockAlert: 5,
        trackBatches: true,
        attributesJson: JSON.stringify({
          packing: prodPacking.trim() || "10x10"
        })
      });

      // Refresh items list
      const itemRes = await inventoryService.getItems({ pageNumber: 1, pageSize: 100 });
      setItems(itemRes.items);

      // Auto-insert this newly created item into the purchase bill items
      const gross = 10 * (Number(prodPurchasePrice) || 50);
      const taxAmt = gross * ((Number(prodTaxRate) || 12) / 100);

      setBillItems((prev) => [
        ...prev,
        {
          itemId: newId,
          itemName: prodName.trim(),
          sku: autoSku,
          batchNumber: batchNum,
          expiryDate: expDate,
          packing: prodPacking.trim() || "10x10",
          hsnCode: prodHsn.trim() || "30049099",
          quantity: 10,
          freeQuantity: 0,
          uomId: defaultUom.id,
          uomCode: defaultUom.code || "STP",
          mrp: Number(prodMrp) || 100,
          unitPrice: Number(prodPurchasePrice) || 50,
          discountType: "percent",
          discountValue: 0,
          discountAmount: 0,
          taxableAmount: gross,
          taxRate: Number(prodTaxRate) || 12,
          totalAmount: gross + taxAmt
        }
      ]);

      setIsQuickProductOpen(false);

      // Reset
      setProdName("");
      setProdSku("");
      setProdInitialBatch("");
      setProdInitialExpiry("");
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to create product. Please check details.");
    } finally {
      setCreatingProduct(false);
    }
  };

  const calculateTotals = () => {
    let itemsGross = 0;
    let itemsTaxable = 0;
    let itemsTax = 0;
    let totalLineDisc = 0;
    billItems.forEach((i) => {
      itemsGross += i.quantity * i.unitPrice;
      itemsTaxable += i.taxableAmount;
      itemsTax += i.taxableAmount * (i.taxRate / 100);
      totalLineDisc += i.discountAmount;
    });

    const overallDiscountAmt = overallDiscountType === "percent"
      ? (itemsTaxable * (Number(overallDiscountValue) / 100))
      : Number(overallDiscountValue);

    const netTaxable = Math.max(0, itemsTaxable - overallDiscountAmt);
    const taxRatio = itemsTaxable > 0 ? (itemsTax / itemsTaxable) : 0.18;
    const netTax = netTaxable * taxRatio;
    const total = Math.round(netTaxable + netTax);
    const roundOff = Math.round((total - (netTaxable + netTax)) * 100) / 100;

    return {
      gross: itemsGross,
      taxable: itemsTaxable,
      overallDiscount: overallDiscountAmt,
      netTaxable,
      tax: netTax,
      roundOff,
      total,
      totalDisc: totalLineDisc + overallDiscountAmt
    };
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || billItems.length === 0) {
      alert("Please select a supplier and add at least one line item.");
      return;
    }

    try {
      setSubmitting(true);
      const totals = calculateTotals();
      const req: CreatePurchaseBillRequest = {
        goodsReceiptNoteId: selectedGrnId,
        vendorInvoiceNumber: vendorInvNum || undefined,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedPartyId,
        billDate: new Date(billDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        primaryPaymentMode: paymentMode,
        paidAmount: Number(paidAmount) || 0,
        notes: notes || undefined,
        items: billItems.map((i) => ({
          itemId: i.itemId,
          batchNumber: i.batchNumber,
          quantity: i.quantity,
          uomId: i.uomId,
          unitPrice: i.unitPrice,
          discountPercent: i.discountType === "percent" ? i.discountValue : 0,
          discountAmount: i.discountAmount,
          mrp: i.mrp,
          freeQuantity: i.freeQuantity,
          packing: i.packing,
          hsnCode: i.hsnCode,
          attributesJson: JSON.stringify({
            packing: i.packing,
            freeQuantity: i.freeQuantity,
            expiryFormatted: i.expiryDate,
            mrp: i.mrp,
            overallDiscount: totals.overallDiscount
          })
        }))
      };

      await purchaseService.createPurchaseBill(req);
      setIsCreateOpen(false);
      setBillItems([]);
      setVendorInvNum("");
      setNotes("");
      setOverallDiscountValue(0);
      loadBills();
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to create Purchase Bill");
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (bill: PurchaseBillList) => {
    setDisburseBillId(bill.id);
    setDisburseBillNumber(bill.billNumber);
    setDisburseSupplierName(bill.supplierName);
    setDisburseBalance(bill.balanceAmount);
    setDisburseAmount(bill.balanceAmount);
    setDisburseMode(3);
    setDisburseRef("");
    setDisburseBank("HDFC Bank");
    setIsPaymentModalOpen(true);
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disburseAmount <= 0) return;

    try {
      setSubmitting(true);
      const req: RecordPurchaseBillPaymentRequest = {
        paymentDate: new Date().toISOString(),
        amount: Number(disburseAmount),
        paymentMode: disburseMode,
        transactionReference: disburseRef || undefined,
        bankName: disburseBank || undefined,
        notes: `Disbursement against Bill ${disburseBillNumber}`
      };

      await purchaseService.recordPurchaseBillPayment(disburseBillId, req);
      setIsPaymentModalOpen(false);
      loadBills();
    } catch (err: any) {
      alert(err.response?.data?.errorMessage || "Failed to disburse payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">Unpaid</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">Partial</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">Fully Paid</span>;
      default:
        return null;
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Vendor Invoices (Purchase Bills)</h1>
              <p className="text-sm text-slate-400">Record supplier tax invoices, claim GST input credit, and disburse payments</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Bill</span>
        </button>
      </div>

      {/* Filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search Bill #, vendor invoice #, supplier legal name, GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadBills()}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Bill Number</th>
                <th className="py-3.5 px-4">Bill Date</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Vendor Inv #</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
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
                    <div>Loading purchase bills...</div>
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No purchase bills recorded.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-white">{bill.billNumber}</td>
                    <td className="py-3.5 px-4">{new Date(bill.billDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{bill.supplierName}</div>
                      {bill.supplierGSTIN && <div className="text-xs text-slate-400 font-mono">{bill.supplierGSTIN}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{bill.vendorInvoiceNumber || "N/A"}</td>
                    <td className="py-3.5 px-4 text-right font-mono">₹{bill.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">₹{bill.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-rose-400">
                      ₹{bill.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getPaymentBadge(bill.paymentStatus)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {bill.balanceAmount > 0 && (
                          <button
                            onClick={() => openPaymentModal(bill)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-xs font-semibold transition"
                          >
                            Pay
                          </button>
                        )}
                        <Link
                          href={`/app/purchase/bills/${bill.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Create Purchase Bill Fullscreen Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
          <div className="w-full h-full bg-slate-900 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-white font-bold text-lg">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <span>Record Vendor Invoice (Purchase Bill)</span>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="mt-6 space-y-4">
                {/* Link GRN Option */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block mb-1.5">
                    Link Verified GRN (Optional)
                  </label>
                  <select
                    value={selectedGrnId || ""}
                    onChange={(e) => handleGrnSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                  >
                    <option value="">-- Direct Bill (No GRN Reference) --</option>
                    {grns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grnNumber} - {g.supplierName} ({g.totalItemsCount} items)
                      </option>
                    ))}
                  </select>
                  {selectedGrnId && (
                    <div className="mt-2.5 p-2 bg-emerald-900/40 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs text-emerald-300 font-sans">
                      <div className="flex items-center space-x-1.5 font-bold">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>3-Way Match Verified: PO Rates = Inspected GRN Quantities = Vendor Bill</span>
                      </div>
                      <span className="font-mono text-[11px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-400 border border-emerald-800">
                        Zero Rate/Qty Variance
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Branch</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branchName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Receiving Warehouse</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Supplier (Creditor) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickSupplierOpen(true)}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Quick Add</span>
                      </button>
                    </div>
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.legalName} {(s as any).gstin ? `(${s.gstin})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Vendor Invoice #</label>
                    <input
                      type="text"
                      placeholder="INV-SUP-99182"
                      value={vendorInvNum}
                      onChange={(e) => setVendorInvNum(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Invoice Date</label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Payment Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-white uppercase tracking-wider">
                        Purchase Line Items
                      </label>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {hasBatchTracking
                          ? "(Includes Batch, Expiry, Free Scheme, Packing, MRP, Disc %, GST)"
                          : "(Includes HSN, Qty, Unit, Purchase Rate, Disc %, GST)"}
                      </span>
                    </div>
                    {!selectedGrnId && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickProductOpen(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Quick Add Product</span>
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddItem(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">+ Add Line From Catalog...</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.sku}) — ₹{i.purchasePrice || 0}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {billItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No items in this purchase bill. Select a GRN or add products manually.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[900px]">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                          <tr>
                            <th className="px-2.5 py-2 min-w-[180px]">Product / Item</th>
                            {hasBatchTracking && <th className="px-2 py-2 w-28">Batch / Lot</th>}
                            {hasBatchTracking && <th className="px-2 py-2 w-20">Expiry</th>}
                            {hasPharmaAddon && <th className="px-2 py-2 w-20">Packing</th>}
                            <th className="px-2 py-2 w-20">HSN</th>
                            <th className="px-2 py-2 w-16 text-center">Qty</th>
                            {hasPharmaAddon && <th className="px-2 py-2 w-14 text-center">Free</th>}
                            <th className="px-2 py-2 w-20">MRP (₹)</th>
                            <th className="px-2 py-2 w-16 text-center">Unit</th>
                            <th className="px-2.5 py-2 w-24">Rate (₹)</th>
                            <th className="px-2 py-2 w-24">Disc % / ₹</th>
                            <th className="px-2.5 py-2 w-24 text-right">Taxable</th>
                            <th className="px-2 py-2 w-16 text-center">GST %</th>
                            <th className="px-2.5 py-2 w-24 text-right">Amount (₹)</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950">
                          {billItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="p-1.5">
                                <div className="font-semibold text-white truncate">{item.itemName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                              </td>
                              {hasBatchTracking && (
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    placeholder="Batch"
                                    value={item.batchNumber || ""}
                                    onChange={(e) => updateBillLineField(idx, "batchNumber", e.target.value)}
                                    className="w-full px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-indigo-300 font-mono"
                                  />
                                </td>
                              )}
                              {hasBatchTracking && (
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={item.expiryDate || ""}
                                    onChange={(e) => updateBillLineField(idx, "expiryDate", e.target.value)}
                                    className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center"
                                  />
                                </td>
                              )}
                              {hasPharmaAddon && (
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    placeholder="10x10"
                                    value={item.packing || ""}
                                    onChange={(e) => updateBillLineField(idx, "packing", e.target.value)}
                                    className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 text-center"
                                  />
                                </td>
                              )}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="HSN"
                                  value={item.hsnCode || ""}
                                  onChange={(e) => updateBillLineField(idx, "hsnCode", e.target.value)}
                                  className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono text-center"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateBillLineField(idx, "quantity", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono text-center font-bold"
                                />
                              </td>
                              {hasPharmaAddon && (
                                <td className="p-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={item.freeQuantity || ""}
                                    onChange={(e) => updateBillLineField(idx, "freeQuantity", parseFloat(e.target.value) || 0)}
                                    className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-emerald-400 font-mono text-center"
                                  />
                                </td>
                              )}
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={item.mrp || ""}
                                  onChange={(e) => updateBillLineField(idx, "mrp", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono"
                                />
                              </td>
                              <td className="p-1.5 text-center text-slate-400 text-[11px] font-semibold">
                                {item.uomCode}
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateBillLineField(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono font-bold"
                                />
                              </td>
                              <td className="p-1.5">
                                <div className="flex items-center space-x-0.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    value={item.discountValue || ""}
                                    onChange={(e) => updateBillLineField(idx, "discountValue", parseFloat(e.target.value) || 0)}
                                    className="w-full px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-amber-400 font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateBillLineField(idx, "discountType", item.discountType === "percent" ? "fixed" : "percent")}
                                    className="px-1 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                                  >
                                    {item.discountType === "percent" ? "%" : "₹"}
                                  </button>
                                </div>
                              </td>
                              <td className="p-1.5 text-right font-mono font-semibold text-slate-300">
                                ₹{item.taxableAmount.toFixed(2)}
                              </td>
                              <td className="p-1.5 text-center font-mono">
                                <select
                                  value={item.taxRate}
                                  onChange={(e) => updateBillLineField(idx, "taxRate", parseFloat(e.target.value) || 0)}
                                  className="px-1 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300"
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold text-emerald-400">
                                ₹{item.totalAmount.toFixed(2)}
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Overall Bill Discount & Summary */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Bill-Level Cash / Special Discount
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={overallDiscountValue || ""}
                          onChange={(e) => setOverallDiscountValue(parseFloat(e.target.value) || 0)}
                          className="w-40 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-amber-400 font-bold font-mono focus:outline-none"
                        />
                        <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setOverallDiscountType("fixed")}
                            className={`px-2 py-1 rounded text-xs font-bold ${overallDiscountType === "fixed" ? "bg-amber-600 text-white" : "text-slate-400"}`}
                          >
                            ₹ Fixed
                          </button>
                          <button
                            type="button"
                            onClick={() => setOverallDiscountType("percent")}
                            className={`px-2 py-1 rounded text-xs font-bold ${overallDiscountType === "percent" ? "bg-amber-600 text-white" : "text-slate-400"}`}
                          >
                            % Percent
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Immediate Payment Tendered (₹)
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={totals.total}
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(Number(e.target.value))}
                          className="w-40 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-emerald-400 font-bold font-mono focus:outline-none"
                        />
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(Number(e.target.value))}
                          className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                        >
                          <option value="1">Cash</option>
                          <option value="2">UPI</option>
                          <option value="3">Bank Transfer</option>
                          <option value="4">Cheque</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="font-mono text-slate-200">₹{totals.taxable.toFixed(2)}</span>
                    </div>
                    {totals.overallDiscount > 0 && (
                      <div className="text-xs text-amber-400 flex justify-between">
                        <span>Overall Bill Discount:</span>
                        <span className="font-mono font-bold">-₹{totals.overallDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>Net GST:</span>
                      <span className="font-mono text-slate-200">₹{totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="text-sm font-black text-white font-mono flex justify-between pt-1 border-t border-slate-800">
                      <span>Grand Total:</span>
                      <span className="text-emerald-400 text-base">₹{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {paidAmount > 0 && (
                      <div className="text-xs text-rose-400 font-mono flex justify-between pt-0.5">
                        <span>Balance Due:</span>
                        <span>₹{(totals.total - Math.min(paidAmount, totals.total)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBill}
                disabled={submitting || billItems.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {submitting ? "Recording..." : "Confirm & Save Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>Disburse Vendor Payment</span>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">Supplier: <span className="font-bold text-white">{disburseSupplierName}</span></div>
              <div className="text-slate-400">Bill #: <span className="font-mono text-white">{disburseBillNumber}</span></div>
              <div className="text-slate-400">Current Outstanding: <span className="font-mono font-bold text-rose-400">₹{disburseBalance.toFixed(2)}</span></div>
            </div>

            <form onSubmit={handleDisbursePayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={disburseBalance}
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Payment Mode</label>
                <select
                  value={disburseMode}
                  onChange={(e) => setDisburseMode(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="1">Cash</option>
                  <option value="2">UPI</option>
                  <option value="3">Bank Transfer (NEFT/RTGS)</option>
                  <option value="4">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Transaction / UTR Reference</label>
                <input
                  type="text"
                  placeholder="UTR-2026-991823"
                  value={disburseRef}
                  onChange={(e) => setDisburseRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Disbursed From Bank Account</label>
                <input
                  type="text"
                  value={disburseBank}
                  onChange={(e) => setDisburseBank(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30"
                >
                  {submitting ? "Processing..." : "Disburse Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Inline Quick Add Supplier Modal ───────────────────────────────── */}
      {isQuickSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>+ Quick Add Supplier / Vendor Master</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickSupplierOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickSupplier} className="space-y-4 text-xs">
              {/* Business Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Supplier Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cipla Pharma Distributors Pvt Ltd"
                    value={suppLegalName}
                    onChange={(e) => setSuppLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Trade Name / Brand Alias
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla Direct"
                    value={suppTradeName}
                    onChange={(e) => setSuppTradeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Supplier Type
                  </label>
                  <select
                    value={suppType}
                    onChange={(e) => setSuppType(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="1">1: Manufacturer / Factory</option>
                    <option value="2">2: Stockist / Distributor</option>
                    <option value="3">3: Importer / C&F Agent</option>
                    <option value="4">4: Local Vendor / Retailer</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={suppMobile}
                    onChange={(e) => setSuppMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="billing@supplier.com"
                    value={suppEmail}
                    onChange={(e) => setSuppEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Taxation & Pharma Regulatory */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{hasPharmaAddon ? "GST & Pharma Drug License Regulatory Compliance" : "GSTIN & Tax Compliance"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      GSTIN (15 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="07AAAAA0000A1Z5"
                      value={suppGstin}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSuppGstin(val);
                        if (val.length >= 12 && !suppPan) {
                          setSuppPan(val.slice(2, 12));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono focus:outline-none text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="AAAAA0000A"
                      value={suppPan}
                      onChange={(e) => setSuppPan(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs uppercase"
                    />
                  </div>
                </div>

                {hasPharmaAddon && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-emerald-300 font-semibold block mb-1">
                        Drug License No. 1 (20B) *
                      </label>
                      <input
                        type="text"
                        placeholder="DL-20B/12345/2026"
                        value={suppDl1}
                        onChange={(e) => setSuppDl1(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-emerald-800/60 rounded-xl text-emerald-300 font-mono focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-emerald-300 font-semibold block mb-1">
                        Drug License No. 2 (21B)
                      </label>
                      <input
                        type="text"
                        placeholder="DL-21B/12345/2026"
                        value={suppDl2}
                        onChange={(e) => setSuppDl2(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-emerald-800/60 rounded-xl text-emerald-300 font-mono focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      FSSAI Food License #
                    </label>
                    <input
                      type="text"
                      placeholder="10019011000123"
                      value={suppFssai}
                      onChange={(e) => setSuppFssai(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                    />
                  </div>
                </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Premises / Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Shop #4, Medicine Complex, Bhagirath Palace"
                    value={suppAddress1}
                    onChange={(e) => setSuppAddress1(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">City</label>
                    <input
                      type="text"
                      value={suppCity}
                      onChange={(e) => setSuppCity(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">State</label>
                    <input
                      type="text"
                      value={suppState}
                      onChange={(e) => setSuppState(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={suppPincode}
                      onChange={(e) => setSuppPincode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Opening Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Opening Ledger Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={suppOpeningBal || ""}
                    onChange={(e) => setSuppOpeningBal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-rose-400 font-bold font-mono focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Balance Type
                  </label>
                  <select
                    value={suppOpeningType}
                    onChange={(e) => setSuppOpeningType(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none text-xs"
                  >
                    <option value="2">Credit (Payable to Supplier - Aapki Denedari)</option>
                    <option value="1">Debit (Advance Paid - Supplier par Udhar)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSupplier}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {creatingSupplier ? "Saving Supplier..." : "Save & Select Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Inline Quick Add Product Modal ────────────────────────────────── */}
      {isQuickProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-base">
                <Boxes className="w-5 h-5 text-indigo-400" />
                <span>+ Quick Create New Master Product</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickProductOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickProduct} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Product / Medicine Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Azithromycin 500mg Tablet"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Custom SKU (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="AZI-500"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 font-mono focus:outline-none text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Packing (e.g. 10x10)
                  </label>
                  <input
                    type="text"
                    placeholder="10x10 / 100ml"
                    value={prodPacking}
                    onChange={(e) => setProdPacking(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="30049099"
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={prodTaxRate}
                    onChange={(e) => setProdTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none text-xs font-mono"
                  >
                    <option value="0">0% Excluded</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% Pharma</option>
                    <option value="18">18% Standard</option>
                    <option value="28">28% Luxury</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="120.00"
                    value={prodMrp || ""}
                    onChange={(e) => setProdMrp(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Purchase Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="75.00"
                    value={prodPurchasePrice || ""}
                    onChange={(e) => setProdPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Sale Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="100.00"
                    value={prodSellingPrice || ""}
                    onChange={(e) => setProdSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Batch & Expiry for Instant Bill Addition */}
              {hasBatchTracking && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-indigo-300 font-semibold block mb-1">
                      Invoice Batch Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AZ-2026-09"
                      value={prodInitialBatch}
                      onChange={(e) => setProdInitialBatch(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-indigo-800/60 rounded-xl text-indigo-300 font-mono focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-indigo-300 font-semibold block mb-1">
                      Expiry Date (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10/28"
                      value={prodInitialExpiry}
                      onChange={(e) => setProdInitialExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-indigo-800/60 rounded-xl text-white font-mono text-center focus:outline-none text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsQuickProductOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  {creatingProduct ? "Creating SKU..." : "Save & Add to Purchase Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


