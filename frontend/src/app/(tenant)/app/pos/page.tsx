"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
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
  UserPlus
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { salesService } from "@/services/sales-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { apiClient } from "@/lib/api-client";
import { MasterItem, PartyList, TenantDetails } from "@/types";
import { printRawHtml } from "@/lib/print-helper";

interface CartItem {
  item: MasterItem;
  quantity: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
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

export default function TenantPosPage() {
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
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [saveToDirectory, setSaveToDirectory] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Bill-Level Discount (% or ₹)
  const [billDiscountType, setBillDiscountType] = useState<"percent" | "fixed">("percent");
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);

  // Held Bills state (Database Backed)
  const [heldBills, setHeldBills] = useState<HeldBillRecord[]>([]);
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
    items: { name: string; qty: number; rate: number; total: number }[];
    subTotal: number;
    discount: number;
    tax: number;
    netTotal: number;
    paidAmount: number;
    changeAmount: number;
    savings: number;
    paymentModeText: string;
  } | null>(null);

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
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          (i.barcode && i.barcode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, selectedCategory, searchQuery]);

  // Add Item to Cart
  const addToCart = (item: MasterItem) => {
    playScanBeep();
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      const rate = item.sellingPrice || item.mrp || 0;
      const mrp = item.mrp && item.mrp > 0 ? item.mrp : rate;
      return [
        ...prev,
        {
          item,
          quantity: 1,
          unitPrice: rate,
          mrp: mrp,
          discountPercent: 0,
        },
      ];
    });
  };

  // Barcode / Fast Input Submit Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.trim().toLowerCase();
    const exactMatch = items.find(
      (i) =>
        (i.barcode && i.barcode.toLowerCase() === q) ||
        i.sku.toLowerCase() === q
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery("");
      return;
    }

    if (filteredItems.length === 1) {
      addToCart(filteredItems[0]);
      setSearchQuery("");
      return;
    }
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, quantity: qty } : c))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
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

    try {
      setSavingCustomer(true);
      if (saveToDirectory) {
        const uniqueCode = "CUST-" + Math.floor(1000 + Math.random() * 9000);
        const newId = await partyService.createCustomer({
          code: uniqueCode,
          legalName: name,
          mobile: phone || undefined,
          primaryPhone: phone || undefined,
          partyType: 1,
          customerType: 3,
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

  const totalTax = cart.reduce((acc, c) => {
    const itemGross = c.quantity * c.unitPrice;
    const itemDisc = (itemGross * c.discountPercent) / 100;
    const lineNet = itemGross - itemDisc;
    const rate = c.item.taxRate || 0;
    return acc + (lineNet * (rate / 100));
  }, 0);

  const rawTotal = taxableBase + totalTax;
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

  // Generate Clean Thermal Receipt HTML
  const generateReceiptHtml = (data: typeof lastReceiptData) => {
    if (!data) return "";
    const branch = branches.find((b) => b.id === selectedBranchId);
    const storeName = profile?.tradeName || profile?.businessName || "RETAIL STORE";
    const storeAddress = branch?.addressLine1 || profile?.branches?.[0]?.addressLine1 || "Store Counter";
    const storeGstin = branch?.gstin || profile?.gstin || "";
    const storePhone = profile?.primaryPhone || "";

    const itemsRows = data.items.map((it, idx) => `
      <tr>
        <td style="padding:4px 0;text-align:left;">${idx + 1}. ${it.name}</td>
        <td style="padding:4px 0;text-align:center;">${it.qty}</td>
        <td style="padding:4px 0;text-align:right;">₹${it.rate.toFixed(2)}</td>
        <td style="padding:4px 0;text-align:right;font-weight:bold;">₹${it.total.toFixed(2)}</td>
      </tr>
    `).join("");

    return `
      <div style="width:100%;max-width:320px;margin:0 auto;font-family:'Courier New',Courier,monospace;font-size:12px;color:#000;padding:10px 6px;">
        <div style="text-align:center;margin-bottom:8px;">
          <h2 style="margin:0;font-size:16px;font-weight:900;text-transform:uppercase;">${storeName}</h2>
          <p style="margin:2px 0;font-size:11px;">${storeAddress}</p>
          ${storeGstin ? `<p style="margin:2px 0;font-size:11px;">GSTIN: <b>${storeGstin}</b></p>` : ""}
          ${storePhone ? `<p style="margin:2px 0;font-size:11px;">Tel: ${storePhone}</p>` : ""}
          <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:6px 0;padding:4px 0;font-size:11px;">
            <b>*** RETAIL CASH MEMO / POS BILL ***</b>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;">
          <span>Bill No: <b>${data.invoiceNumber || "POS-TAX-INV"}</b></span>
          <span>Date: ${data.date}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px;">
          <span>Buyer: <b>${data.customerName}</b></span>
          <span>${data.customerPhone ? "Mob: " + data.customerPhone : "Walk-in"}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #000;border-bottom:1px solid #000;margin:6px 0;font-size:11px;">
          <thead>
            <tr style="border-bottom:1px dashed #000;">
              <th style="text-align:left;padding:4px 0;">Item Description</th>
              <th style="text-align:center;padding:4px 0;">Qty</th>
              <th style="text-align:right;padding:4px 0;">Rate</th>
              <th style="text-align:right;padding:4px 0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-top:6px;font-size:11px;line-height:1.5;">
          <div style="display:flex;justify-content:space-between;">
            <span>Sub-Total:</span>
            <span>₹${data.subTotal.toFixed(2)}</span>
          </div>
          ${data.discount > 0 ? `
            <div style="display:flex;justify-content:space-between;color:#000;">
              <span>Bill Discount:</span>
              <span>-₹${data.discount.toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display:flex;justify-content:space-between;">
            <span>GST / Taxes:</span>
            <span>+₹${data.tax.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;border-top:1px solid #000;border-bottom:1px solid #000;margin:4px 0;padding:4px 0;">
            <span>TOTAL PAYABLE:</span>
            <span>₹${data.netTotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Payment Mode:</span>
            <span><b>${data.paymentModeText}</b></span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Tendered / Paid:</span>
            <span>₹${data.paidAmount.toFixed(2)}</span>
          </div>
          ${data.changeAmount > 0 ? `
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
              <span>Change Returned:</span>
              <span>₹${data.changeAmount.toFixed(2)}</span>
            </div>
          ` : ""}
        </div>

        ${data.savings > 0 ? `
          <div style="border:1px dashed #000;padding:6px;margin:8px 0;text-align:center;font-weight:bold;font-size:12px;">
            *** YOU SAVED ₹${data.savings.toFixed(2)} ON THIS BILL! ***
          </div>
        ` : ""}

        <div style="text-align:center;margin-top:12px;font-size:11px;">
          <p style="margin:2px 0;">Thank You For Shopping With Us!</p>
          <p style="margin:2px 0;font-size:10px;">Goods once sold cannot be returned after 7 days.</p>
          <p style="margin:2px 0;font-size:9px;color:#555;">Generated via UdyogBill ERP</p>
        </div>
      </div>
    `;
  };

  // Immediate Print Action
  const triggerPrintReceipt = (receiptObj: typeof lastReceiptData) => {
    if (!receiptObj) return;
    const html = generateReceiptHtml(receiptObj);
    printRawHtml(html, `POS-Bill-${receiptObj.invoiceNumber || "Receipt"}`);
  };

  const handleCompleteSale = async () => {
    if (!selectedBranchId || !selectedWarehouseId || cart.length === 0) {
      alert("Please select branch, warehouse and at least one item.");
      return;
    }

    try {
      setSubmitting(true);
      const selectedParty = customers.find((c) => c.id === selectedCustomerId);
      const currentBranch = branches.find((b) => b.id === selectedBranchId);

      const finalCustName = selectedParty ? selectedParty.legalName : (customerName.trim() || "Walk-in Customer");
      const finalCustPhone = selectedParty ? (selectedParty.mobile || selectedParty.primaryPhone || "") : customerPhone.trim();

      const payModeMap: Record<number, string> = { 1: "Cash", 2: "UPI", 3: "Card", 6: "Khata / Credit" };

      const receiptPayload = {
        invoiceNumber: "POS-" + Date.now().toString().slice(-6),
        date: new Date().toLocaleString("en-IN"),
        customerName: finalCustName,
        customerPhone: finalCustPhone,
        branchName: currentBranch?.branchName || "Main Counter",
        branchGstin: currentBranch?.gstin || profile?.gstin || "",
        items: cart.map((c) => ({
          name: c.item.name,
          qty: c.quantity,
          rate: c.unitPrice,
          total: c.quantity * c.unitPrice - (c.quantity * c.unitPrice * c.discountPercent) / 100,
        })),
        subTotal,
        discount: billDiscountAmount + redeemedPoints,
        tax: totalTax + roundOff,
        netTotal,
        paidAmount: paymentMode === 6 ? 0 : (tenderedAmount >= netTotal ? netTotal : tenderedAmount),
        changeAmount: cashChangeToReturn,
        savings: totalSavings,
        paymentModeText: payModeMap[paymentMode] || "Cash",
      };

      const invoiceId = await salesService.createPosBill({
        invoiceType: 2,
        branchId: selectedBranchId,
        warehouseId: selectedWarehouseId,
        partyId: selectedCustomerId || undefined,
        customerName: finalCustName,
        customerPhone: finalCustPhone || undefined,
        customerGSTIN: selectedParty?.gstin,
        billingStateCode: selectedParty?.stateCode || currentBranch?.stateCode || "27",
        shippingStateCode: selectedParty?.stateCode || currentBranch?.stateCode || "27",
        placeOfSupply: currentBranch?.state || "Maharashtra",
        invoiceDate: new Date().toISOString(),
        primaryPaymentMode: paymentMode,
        invoiceDiscountPercent: billDiscountType === "percent" ? billDiscountValue : 0,
        paidAmount: paymentMode === 6 ? 0 : (tenderedAmount >= netTotal ? netTotal : tenderedAmount),
        items: cart.map((c) => ({
          itemId: c.item.id,
          batchId: c.batchId,
          batchNumber: c.batchNumber,
          expiryDate: c.expiryDate,
          quantity: c.quantity,
          uomId: c.item.primaryUomId,
          unitPrice: c.unitPrice,
          mrp: c.mrp,
          discountPercent: c.discountPercent,
          hsnCode: c.item.hsnCode,
        })),
      });

      playSuccessChime();
      setCompletedInvoiceId(invoiceId);
      setCompletedInvoiceNumber(receiptPayload.invoiceNumber);
      setLastReceiptData(receiptPayload);
      setIsCheckoutOpen(false);

      // Trigger instant automatic print dialog!
      triggerPrintReceipt(receiptPayload);

      clearCart();
    } catch (err: any) {
      console.error("Sale error", err);
      alert(err?.response?.data?.errorMessage || err?.message || "Failed to process sale. Please check stock.");
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Shortcuts Listener (F1 to F10, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "F3") {
        e.preventDefault();
        document.getElementById("pos-customer-phone-input")?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) handleHoldBill();
      } else if (e.key === "F5") {
        e.preventDefault();
        setShowDiscountInput((prev) => !prev);
      } else if (e.key === "F7") {
        e.preventDefault();
        setPaymentMode(1);
        setTenderedAmount(netTotal);
      } else if (e.key === "F8") {
        e.preventDefault();
        setPaymentMode(2);
        setShowUpiModal(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        setPaymentMode(3);
      } else if (e.key === "F10" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          handleCompleteSale();
        }
      } else if (e.key === "Escape") {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
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
  }, [cart, netTotal, isCheckoutOpen, isHeldModalOpen, isAddCustomerOpen, showShortcutsModal, showUpiModal, completedInvoiceId, submitting]);

  return (
    <div className={`h-[calc(100vh-4rem)] p-3 lg:p-4 flex flex-col gap-3 select-none overflow-hidden font-sans ${isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-4 h-screen" : ""}`}>
      {/* ─── 1. TOP CASHIER & COUNTER CONTROL BAR ─── */}
      <header className="p-2.5 px-3.5 rounded-xl bg-white border border-amber-200/70 shadow-sm flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left: Counter Identifier & Live Clock */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700">
            <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase">Counter #01</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">{currentTime || "Live Register"}</span>
          </div>
        </div>

        {/* Center: Branch & Warehouse Location Selectors */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <WarehouseDetailsIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none text-xs"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsHeldModalOpen(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all ${
              heldBills.length > 0
                ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 animate-pulse"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
            title="Recall Held Bills [F4]"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Held Carts ({heldBills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-slate-100 text-slate-400 border-slate-200"
            }`}
            title={soundEnabled ? "Barcode Sound Chimes: ON" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            title="Toggle Clean POS View"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-800 flex items-center space-x-1"
            title="Keyboard Shortcuts [F1]"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Keys [F1]</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN SPLIT DESK (LEFT: SCAN & QUICK TILES | RIGHT: SUPERMARKET CART & TENDER) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* ─── LEFT PANE: HIGH-SPEED BARCODE & PRODUCT DISCOVERY ─── */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-0 bg-white rounded-xl border border-amber-200/60 p-3 shadow-sm overflow-hidden">
          {/* Big Barcode Search Bar (Focus on [F2]) */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-amber-600 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="🔍 Scan Barcode or Type Item Name / SKU... (Press Enter to Add | F2 to Focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-amber-50/40 border-2 border-amber-300 focus:border-amber-500 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-12 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
            >
              Add Item
            </button>
          </form>

          {/* Department / Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all flex items-center space-x-1 ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Items</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory("fast_moving")}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all flex items-center space-x-1 ${
                selectedCategory === "fast_moving"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Top Fast Moving</span>
            </button>

            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid (Touch & Click Friendly) */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
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
                    onClick={() => addToCart(item)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group relative shadow-sm ${
                      inCart
                        ? "bg-amber-50/70 border-amber-400 ring-1 ring-amber-400"
                        : "bg-white hover:bg-amber-50/30 border-slate-200 hover:border-amber-300"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-mono font-black shadow-md">
                        {inCart.quantity} in cart
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="font-bold text-amber-700 uppercase truncate max-w-[100px]">
                          {item.sku}
                        </span>
                        {item.categoryName && (
                          <span className="text-slate-400 truncate max-w-[80px]">
                            {item.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs text-slate-900 line-clamp-2 mt-1 group-hover:text-amber-700 transition-colors">
                        {item.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        {savings > 0 && (
                          <div className="text-[10px] text-slate-400 line-through font-mono">
                            MRP ₹{mrp.toFixed(2)}
                          </div>
                        )}
                        <div className="font-mono font-black text-sm text-slate-900">
                          ₹{price.toFixed(2)}
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded-lg bg-amber-500/10 group-hover:bg-amber-500 group-hover:text-white text-amber-700 font-bold text-[11px] transition-all shrink-0">
                        + Add
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT PANE: VISHAL MEGA MART STYLE CART TABLE & TENDER DESK ─── */}
        <div className="w-full lg:w-[460px] xl:w-[490px] flex flex-col rounded-xl bg-white border border-amber-200/80 shadow-md overflow-hidden shrink-0">
          {/* Customer Account & Loyalty Header (With Add Name / Customer Button) */}
          <div className="p-3 bg-amber-50/50 border-b border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5 uppercase tracking-wide">
                <Users2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Customer / Member [F3]</span>
              </span>

              <div className="flex items-center space-x-2">
                {/* Add Name / New Customer Button */}
                <button
                  type="button"
                  onClick={() => {
                    setNewCustPhone(customerPhone);
                    setNewCustName(customerName !== "Walk-in Customer" ? customerName : "");
                    setIsAddCustomerOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-all"
                  title="Add Customer Name & Details"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Name</span>
                </button>

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
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Reset
                  </button>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Walk-in
                  </span>
                )}
              </div>
            </div>

            {/* Inputs: Mobile Number & Customer Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="relative">
                <input
                  id="pos-customer-phone-input"
                  type="text"
                  placeholder="📱 Mobile Number"
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerPhone(val);
                    const matched = customers.find((c) => c.mobile === val || c.primaryPhone === val);
                    if (matched) {
                      setSelectedCustomerId(matched.id);
                      setCustomerName(matched.legalName);
                      setCustomerPoints(120);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Buyer / Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Loyalty Points Banner if Member has points */}
            {customerPoints > 0 && (
              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-amber-100/70 border border-amber-300 text-xs">
                <div className="flex items-center space-x-1.5 text-amber-900 font-semibold text-[11px]">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>⭐ Available Loyalty: <strong>{customerPoints} Pts</strong> (₹{customerPoints})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (redeemedPoints > 0) {
                      setRedeemedPoints(0);
                    } else {
                      setRedeemedPoints(Math.min(customerPoints, subTotal));
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    redeemedPoints > 0
                      ? "bg-rose-600 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {redeemedPoints > 0 ? "Remove Redeem" : "Redeem Points"}
                </button>
              </div>
            )}
          </div>

          {/* Supermarket Billed Items Table */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <ShoppingCart className="w-10 h-10 opacity-30 text-amber-500" />
                <p className="text-xs font-semibold text-slate-600">Cart is empty.</p>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  Scan a barcode or click any product tile on the left to start billing.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 pl-2.5 w-6">#</th>
                    <th className="py-2 px-1.5">Item</th>
                    <th className="py-2 px-1 text-right">Price</th>
                    <th className="py-2 px-1 text-center w-20">Qty</th>
                    <th className="py-2 px-1 text-right">Total</th>
                    <th className="py-2 pr-2 w-6 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {cart.map((c, idx) => {
                    const lineGross = c.quantity * c.unitPrice;
                    const lineDisc = (lineGross * c.discountPercent) / 100;
                    const lineNet = lineGross - lineDisc;

                    return (
                      <tr key={c.item.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-2 pl-2.5 font-mono text-[11px] text-slate-400 align-middle">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-1.5 align-middle">
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">
                            {c.item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-2">
                            <span>{c.item.sku}</span>
                            {c.mrp > c.unitPrice && (
                              <span className="text-emerald-700 font-semibold">
                                Save ₹{((c.mrp - c.unitPrice) * c.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-1 text-right font-mono text-xs text-slate-700 align-middle">
                          ₹{c.unitPrice.toFixed(2)}
                        </td>

                        {/* Fast Qty Control */}
                        <td className="py-2 px-1 align-middle">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(c.item.id, c.quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={c.quantity}
                              onChange={(e) => updateQuantity(c.item.id, parseInt(e.target.value) || 1)}
                              className="w-8 py-0.5 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(c.item.id, c.quantity + 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-2 px-1 text-right font-mono font-bold text-xs text-slate-900 align-middle">
                          ₹{lineNet.toFixed(2)}
                        </td>

                        <td className="py-2 pr-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeFromCart(c.item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove"
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

          {/* Bill Summary & Instant Tender */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
            {totalSavings > 0 && (
              <div className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs">
                <span className="font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Customer Savings:</span>
                </span>
                <span className="font-mono font-black text-emerald-700">
                  🎉 ₹{totalSavings.toFixed(2)}
                </span>
              </div>
            )}

            <div className="space-y-1 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Items: <strong className="text-slate-900">{totalItemCount}</strong> (Units: <strong className="text-slate-900">{totalQuantityUnits}</strong>)</span>
                <span>Sub-Total: <strong className="font-mono text-slate-900">₹{subTotal.toFixed(2)}</strong></span>
              </div>

              {showDiscountInput ? (
                <div className="flex items-center justify-between bg-amber-50 p-1 rounded-lg border border-amber-200">
                  <span className="text-xs text-amber-900 font-bold">Discount:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0"
                      max={billDiscountType === "percent" ? 100 : subTotal}
                      value={billDiscountValue || ""}
                      onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-amber-300 rounded text-right"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setBillDiscountType((prev) => (prev === "percent" ? "fixed" : "percent"))}
                      className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold"
                    >
                      {billDiscountType === "percent" ? "%" : "₹"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-500">
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(true)}
                    className="text-[11px] text-amber-700 hover:underline flex items-center space-x-1"
                  >
                    <Tag className="w-3 h-3" />
                    <span>+ Add Bill Discount [F5]</span>
                  </button>
                  {billDiscountAmount > 0 && (
                    <span className="text-rose-600 font-mono">-₹{billDiscountAmount.toFixed(2)}</span>
                  )}
                </div>
              )}

              {redeemedPoints > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Loyalty Points Redeemed:</span>
                  <span className="font-mono font-bold">-₹{redeemedPoints.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>GST Tax & Roundoff:</span>
                <span className="font-mono text-slate-800">+₹{(totalTax + roundOff).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">Total Payable:</span>
                <span className="text-xl font-black font-mono text-emerald-700">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode Tabs */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode(1);
                  setTenderedAmount(netTotal);
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                  paymentMode === 1
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Banknote className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px]">Cash [F7]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode(2);
                  setShowUpiModal(true);
                }}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                  paymentMode === 2
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px]">UPI [F8]</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode(3)}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                  paymentMode === 3
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px]">Card [F9]</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode(6)}
                className={`py-1.5 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center border transition-all ${
                  paymentMode === 6
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                <Users2 className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[10px]">Khata</span>
              </button>
            </div>

            {paymentMode === 1 && (
              <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Cash Received:</span>
                  <input
                    type="number"
                    value={tenderedAmount || ""}
                    onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-0.5 text-xs font-mono font-bold text-right bg-white border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(netTotal)}
                    className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold"
                  >
                    Exact
                  </button>
                  {[100, 200, 500, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedAmount(amt)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 font-bold"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {tenderedAmount > netTotal && (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-xs text-emerald-800 font-bold">
                    <span>Change to Return:</span>
                    <span className="font-mono text-sm text-emerald-700">₹{cashChangeToReturn.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Final Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold disabled:opacity-40 transition-colors"
                title="Void / Clear Cart [Esc]"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0 || isHolding}
                className="px-3 py-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold disabled:opacity-40 transition-colors flex items-center space-x-1"
                title="Hold Current Bill [F4]"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Hold [F4]</span>
              </button>

              {/* Big Vishal Mega Mart Style Checkout & Print Button */}
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || submitting}
                className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{submitting ? "Processing Sale..." : `PAY & PRINT ₹${netTotal.toFixed(2)} [F10]`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 0: QUICK ADD CUSTOMER / NAME MODAL ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-amber-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Customer Name</h3>
                <p className="text-[11px] text-slate-500">Quickly attach customer details to this bill.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Customer / Buyer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  City / Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Sector 12"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="save-to-dir-checkbox"
                  type="checkbox"
                  checked={saveToDirectory}
                  onChange={(e) => setSaveToDirectory(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="save-to-dir-checkbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Save to Customer Directory for future billing
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50"
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
          <div className="bg-white border border-amber-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsHeldModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <PauseCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Held Carts Queue ({heldBills.length})</h3>
            </div>
            <p className="text-xs text-slate-500">
              Click any parked bill to immediately restore it to the checkout counter.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {heldBills.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No held bills in queue.</p>
              ) : (
                heldBills.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleResumeBill(h)}
                    className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 hover:border-amber-400 hover:bg-amber-100/50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-amber-800">{h.holdNumber}</span>
                        <span className="text-xs text-slate-900 font-bold">{h.customerName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(h.createdAtUtc).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{h.itemsCount} Items</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        ₹{h.totalAmount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(h.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
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
          <div className="bg-white border border-indigo-200 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowUpiModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center space-x-2 text-indigo-700">
              <QrCode className="w-6 h-6" />
              <h3 className="text-base font-black">Scan & Pay via UPI</h3>
            </div>

            <div className="p-4 bg-white border-2 border-indigo-500 rounded-xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `upi://pay?pa=${profile?.upiId || "billing@upi"}&pn=${encodeURIComponent(profile?.businessName || "RetailStore")}&am=${netTotal}&cu=INR`
                )}`}
                alt="UPI QR Code"
                className="w-44 h-44 mx-auto object-contain"
              />
            </div>

            <div>
              <div className="text-xl font-black font-mono text-slate-900">₹{netTotal.toFixed(2)}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Scan using Google Pay, PhonePe, Paytm or BHIM UPI.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowUpiModal(false);
                handleCompleteSale();
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
            >
              Confirm UPI Payment Received & Print
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: KEYBOARD SHORTCUTS CHEATSHEET ─── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              <span>Supermarket POS Fast Keys</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: "F1", desc: "Show Shortcuts Cheatsheet" },
                { key: "F2", desc: "Focus Barcode Scanner / Search" },
                { key: "F3", desc: "Focus Customer Mobile / Member" },
                { key: "F4", desc: "Hold / Park Current Bill" },
                { key: "F5", desc: "Apply Bill Discount (% or ₹)" },
                { key: "F7", desc: "Fast Cash Payment Tender" },
                { key: "F8", desc: "Instant UPI / QR Code" },
                { key: "F9", desc: "Card / Swipe Payment" },
                { key: "F10 / Ctrl+Enter", desc: "Pay & Print Bill" },
                { key: "Esc", desc: "Clear Cart / Close Modal" },
              ].map((s) => (
                <div key={s.key} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-mono font-black px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px]">
                    {s.key}
                  </span>
                  <span className="text-[11px] text-slate-700 font-medium text-right">{s.desc}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              Close [Esc]
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: SALE SUCCESS & DIRECT RECEIPT PRINT POPUP ─── */}
      {completedInvoiceId && lastReceiptData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-emerald-300 rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Sale Billed Successfully!</h3>
                  <p className="text-[10px] text-slate-500">Bill: {lastReceiptData.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setCompletedInvoiceId(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Preview Box */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-60 font-mono text-[11px] text-slate-800">
              <div className="text-center font-bold pb-1 border-b border-dashed border-slate-300">
                {profile?.businessName || "RETAIL STORE"}
              </div>
              <div className="py-1 text-[10px] text-slate-600 border-b border-dashed border-slate-300">
                <div>Customer: <b>{lastReceiptData.customerName}</b> ({lastReceiptData.customerPhone || "Walk-in"})</div>
                <div>Date: {lastReceiptData.date}</div>
              </div>
              <div className="py-1.5 space-y-1">
                {lastReceiptData.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[170px]">{it.name} x{it.qty}</span>
                    <span className="font-bold">₹{it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1.5 border-t border-dashed border-slate-300 text-right space-y-0.5">
                <div className="text-slate-500 text-[10px]">Tax & Round: +₹{lastReceiptData.tax.toFixed(2)}</div>
                <div className="text-sm font-black text-emerald-700">Net Total: ₹{lastReceiptData.netTotal.toFixed(2)}</div>
                <div className="text-[10px] text-slate-600">Paid ({lastReceiptData.paymentModeText}): ₹{lastReceiptData.paidAmount.toFixed(2)}</div>
                {lastReceiptData.changeAmount > 0 && (
                  <div className="text-[10px] font-bold text-indigo-700">Change Returned: ₹{lastReceiptData.changeAmount.toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Print & Next Customer Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => triggerPrintReceipt(lastReceiptData)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/30 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Print Receipt (Thermal / A4)</span>
              </button>

              <div className="flex items-center space-x-2">
                <Link
                  href={`/app/sales/invoices/${completedInvoiceId}`}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold text-center transition-colors"
                >
                  View Full Invoice
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedInvoiceId(null);
                    searchInputRef.current?.focus();
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Next Bill [Enter]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
