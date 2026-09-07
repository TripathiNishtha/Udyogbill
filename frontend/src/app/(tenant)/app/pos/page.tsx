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
  UserPlus,
  Table,
  Columns
} from "lucide-react";
import { inventoryService } from "@/services/inventory-services";
import { partyService } from "@/services/party-services";
import { salesService } from "@/services/sales-services";
import { tenantAppService, BranchDetails, WarehouseDetails } from "@/services/tenant-app-services";
import { apiClient } from "@/lib/api-client";
import { MasterItem, PartyList, TenantDetails } from "@/types";
import { printRawHtml } from "@/lib/print-helper";
import { printTemplateService } from "@/services/print-template-services";
import { useAddons } from "@/context/addon-context";

export type PosPrintFormat = "thermal80" | "thermal58" | "a4" | "a5";

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
  const { isAddonActive } = useAddons();
  const hasPharmaAddon = isAddonActive("pharma");

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
  const [isWideCart, setIsWideCart] = useState<boolean>(false);
  const wideSearchInputRef = useRef<HTMLInputElement>(null);

  // POS Print Format State (Thermal 80mm, Thermal 58mm, A4, A5)
  const [posPrintFormat, setPosPrintFormat] = useState<PosPrintFormat>("thermal80");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("udyogbill_pos_print_format");
      if (saved && ["thermal80", "thermal58", "a4", "a5"].includes(saved)) {
        setPosPrintFormat(saved as PosPrintFormat);
      }
    } catch {}
  }, []);

  const handleSetPosPrintFormat = (format: PosPrintFormat) => {
    setPosPrintFormat(format);
    try {
      localStorage.setItem("udyogbill_pos_print_format", format);
    } catch {}
  };

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

  // Generate Clean Receipt HTML based on format
  const generateReceiptHtml = (data: typeof lastReceiptData, format: PosPrintFormat = "thermal80") => {
    if (!data) return "";
    const branch = branches.find((b) => b.id === selectedBranchId);
    const storeName = profile?.tradeName || profile?.businessName || "RETAIL STORE";
    const storeAddress = branch?.addressLine1 || profile?.branches?.[0]?.addressLine1 || "Store Counter";
    const storeGstin = branch?.gstin || profile?.gstin || "";
    const storePhone = profile?.primaryPhone || "";

    if (format === "a4" || format === "a5") {
      const isA5 = format === "a5";
      const itemsRows = data.items.map((it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: bold;">${it.name}</td>
          <td style="padding: 6px 8px; text-align: center;">${it.qty}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${it.rate.toFixed(2)}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace;">₹${it.total.toFixed(2)}</td>
        </tr>
      `).join("");

      return `
        <div style="width: 100%; max-width: ${isA5 ? '720px' : '800px'}; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: ${isA5 ? '11px' : '12px'}; color: #0f172a; padding: ${isA5 ? '10px' : '20px'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <h1 style="margin: 0; font-size: ${isA5 ? '18px' : '22px'}; font-weight: 900; text-transform: uppercase; color: #0f172a;">${storeName}</h1>
              <p style="margin: 2px 0; color: #475569;">${storeAddress}</p>
              ${storeGstin ? `<p style="margin: 2px 0; font-weight: bold;">GSTIN: <span style="font-family: monospace;">${storeGstin}</span></p>` : ""}
              ${storePhone ? `<p style="margin: 2px 0; color: #475569;">Contact: ${storePhone}</p>` : ""}
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 4px 10px; background-color: #0f172a; color: #ffffff; font-weight: 800; font-size: 11px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isA5 ? "Retail Cash Memo" : "Tax Invoice / Retail Bill"}
              </span>
              <p style="margin: 6px 0 2px; font-weight: bold;">Invoice #: <span style="font-family: monospace;">${data.invoiceNumber || "POS-TAX-INV"}</span></p>
              <p style="margin: 2px 0; color: #475569;">Date: ${data.date}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Billed To:</span>
              <div style="font-weight: 900; font-size: 13px; color: #0f172a;">${data.customerName}</div>
              ${data.customerPhone ? `<div style="color: #475569;">Phone: ${data.customerPhone}</div>` : `<div style="color: #64748b; font-style: italic;">Walk-in Customer</div>`}
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #64748b;">Payment Status:</span>
              <div style="font-weight: bold; color: #16a34a;">PAID via ${data.paymentModeText}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 6px 8px; text-align: center; width: 35px;">#</th>
                <th style="padding: 6px 8px; text-align: left;">Item Description</th>
                <th style="padding: 6px 8px; text-align: center; width: 60px;">Qty</th>
                <th style="padding: 6px 8px; text-align: right; width: 90px;">Rate</th>
                <th style="padding: 6px 8px; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
            <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f8fafc; font-size: 11px;">
              <div style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">Terms & Conditions:</div>
              <p style="margin: 2px 0; color: #64748b;">1. Goods once sold cannot be returned without original cash memo.</p>
              <p style="margin: 2px 0; color: #64748b;">2. Subject to local jurisdiction.</p>
              ${data.savings > 0 ? `<p style="margin: 6px 0 0; color: #16a34a; font-weight: bold;">🎉 Customer Total Savings: ₹${data.savings.toFixed(2)}</p>` : ""}
            </div>

            <div style="width: 260px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #ffffff;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Sub-Total:</span>
                <span style="font-family: monospace; font-weight: bold;">₹${data.subTotal.toFixed(2)}</span>
              </div>
              ${data.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;">
                  <span>Bill Discount:</span>
                  <span style="font-family: monospace; font-weight: bold;">-₹${data.discount.toFixed(2)}</span>
                </div>
              ` : ""}
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Taxes & Round:</span>
                <span style="font-family: monospace; font-weight: bold;">+₹${data.tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 0; margin: 6px 0; font-size: 14px; font-weight: 900;">
                <span>Total Amount:</span>
                <span style="font-family: monospace; color: #16a34a;">₹${data.netTotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
                <span>Paid (${data.paymentModeText}):</span>
                <span style="font-family: monospace;">₹${data.paidAmount.toFixed(2)}</span>
              </div>
              ${data.changeAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #4338ca; font-weight: bold; margin-top: 2px;">
                  <span>Change Return:</span>
                  <span style="font-family: monospace;">₹${data.changeAmount.toFixed(2)}</span>
                </div>
              ` : ""}
            </div>
          </div>

          <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b;">
            <div>
              <p style="margin: 0;">Thank you for your business!</p>
              <p style="margin: 2px 0 0;">This is a computer generated invoice powered by UdyogBill.</p>
            </div>
            <div style="text-align: right;">
              <div style="height: 30px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 140px; text-align: center; padding-top: 2px; font-weight: bold; color: #0f172a;">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Thermal Slip (80mm vs 58mm)
    const is58 = format === "thermal58";
    const itemsRows = data.items.map((it, idx) => `
      <tr>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:left;">${idx + 1}. ${it.name}</td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:center;">${it.qty}</td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:right;">₹${it.rate.toFixed(2)}</td>
        <td style="padding:${is58 ? '2px 0' : '4px 0'};text-align:right;font-weight:bold;">₹${it.total.toFixed(2)}</td>
      </tr>
    `).join("");

    return `
      <div style="width:100%;max-width:${is58 ? '215px' : '320px'};margin:0 auto;font-family:'Courier New',Courier,monospace;font-size:${is58 ? '10px' : '12px'};color:#000;padding:${is58 ? '4px 2px' : '10px 6px'};">
        <div style="text-align:center;margin-bottom:6px;">
          <h2 style="margin:0;font-size:${is58 ? '13px' : '16px'};font-weight:900;text-transform:uppercase;">${storeName}</h2>
          <p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">${storeAddress}</p>
          ${storeGstin ? `<p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">GSTIN: <b>${storeGstin}</b></p>` : ""}
          ${storePhone ? `<p style="margin:2px 0;font-size:${is58 ? '9px' : '11px'};">Tel: ${storePhone}</p>` : ""}
          <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;margin:4px 0;padding:3px 0;font-size:${is58 ? '9px' : '11px'};">
            <b>*** RETAIL CASH MEMO / POS BILL ***</b>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:${is58 ? '9px' : '11px'};">
          <span>Bill: <b>${data.invoiceNumber || "POS-BILL"}</b></span>
          <span>${data.date}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:${is58 ? '9px' : '11px'};">
          <span>Buyer: <b>${data.customerName}</b></span>
          <span>${data.customerPhone ? "M:" + data.customerPhone : "Walk-in"}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;border-top:1px solid #000;border-bottom:1px solid #000;margin:4px 0;font-size:${is58 ? '9px' : '11px'};">
          <thead>
            <tr style="border-bottom:1px dashed #000;">
              <th style="text-align:left;padding:3px 0;">Item</th>
              <th style="text-align:center;padding:3px 0;">Qty</th>
              <th style="text-align:right;padding:3px 0;">Rate</th>
              <th style="text-align:right;padding:3px 0;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="margin-top:4px;font-size:${is58 ? '9px' : '11px'};line-height:1.4;">
          <div style="display:flex;justify-content:space-between;">
            <span>Sub-Total:</span>
            <span>₹${data.subTotal.toFixed(2)}</span>
          </div>
          ${data.discount > 0 ? `
            <div style="display:flex;justify-content:space-between;">
              <span>Discount:</span>
              <span>-₹${data.discount.toFixed(2)}</span>
            </div>
          ` : ""}
          <div style="display:flex;justify-content:space-between;">
            <span>Tax/Round:</span>
            <span>+₹${data.tax.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:${is58 ? '12px' : '14px'};font-weight:900;border-top:1px solid #000;border-bottom:1px solid #000;margin:4px 0;padding:3px 0;">
            <span>TOTAL:</span>
            <span>₹${data.netTotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Mode:</span>
            <span><b>${data.paymentModeText}</b></span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Paid:</span>
            <span>₹${data.paidAmount.toFixed(2)}</span>
          </div>
          ${data.changeAmount > 0 ? `
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
              <span>Change:</span>
              <span>₹${data.changeAmount.toFixed(2)}</span>
            </div>
          ` : ""}
        </div>

        ${data.savings > 0 ? `
          <div style="border:1px dashed #000;padding:4px;margin:6px 0;text-align:center;font-weight:bold;font-size:${is58 ? '9px' : '11px'};">
            *** SAVED ₹${data.savings.toFixed(2)}! ***
          </div>
        ` : ""}

        <div style="text-align:center;margin-top:8px;font-size:${is58 ? '8px' : '10px'};">
          <p style="margin:1px 0;">Thank You For Shopping With Us!</p>
          <p style="margin:1px 0;color:#555;">Generated via UdyogBill</p>
        </div>
      </div>
    `;
  };

  // Immediate Print Action (Supports Thermal 80mm, Thermal 58mm, A4, A5)
  const triggerPrintReceipt = async (
    receiptObj: typeof lastReceiptData,
    format?: PosPrintFormat,
    invId?: string
  ) => {
    if (!receiptObj) return;
    const targetFormat = format || posPrintFormat;
    const targetInvId = invId || completedInvoiceId;

    if ((targetFormat === "a4" || targetFormat === "a5") && targetInvId) {
      try {
        const preview = await printTemplateService.renderPreview({ invoiceId: targetInvId });
        if (preview?.renderedHtml) {
          printRawHtml(
            preview.renderedHtml,
            `Invoice_${receiptObj.invoiceNumber || "Bill"}`,
            targetFormat === "a5" ? "A5 landscape" : "A4 portrait",
            targetFormat === "a5" ? "3mm 4mm" : "4mm 5mm"
          );
          return;
        }
      } catch (err) {
        console.warn("Could not load backend template preview, using clean built-in layout", err);
      }
    }

    const html = generateReceiptHtml(receiptObj, targetFormat);
    const pageSizeMap: Record<PosPrintFormat, "thermal80" | "thermal58" | "A4 portrait" | "A5 landscape"> = {
      thermal80: "thermal80",
      thermal58: "thermal58",
      a4: "A4 portrait",
      a5: "A5 landscape",
    };
    printRawHtml(
      html,
      `POS-Bill-${receiptObj.invoiceNumber || "Receipt"}`,
      pageSizeMap[targetFormat] || "thermal80"
    );
  };

  const handleCompleteSale = async () => {
    if (!selectedBranchId || !selectedWarehouseId || cart.length === 0) {
      alert("Please select branch, warehouse and at least one item.");
      return;
    }

    const selectedParty = customers.find((c) => c.id === selectedCustomerId);

    // Credit Limit & Khata Default Block Validation
    if (paymentMode === 6) {
      if (!selectedParty) {
        alert("Khata / Credit payment requires selecting a registered customer.");
        return;
      }
      if (selectedParty.isCreditBlocked) {
        alert(`CREDIT SALE BLOCKED: Customer "${selectedParty.legalName}" has been locked from credit sales.`);
        return;
      }
      if (selectedParty.creditLimit > 0) {
        const potentialOutstanding = (selectedParty.currentOutstandingBalance || 0) + netTotal;
        if (potentialOutstanding > selectedParty.creditLimit) {
          const excess = potentialOutstanding - selectedParty.creditLimit;
          const confirmProceed = confirm(
            `CREDIT LIMIT WARNING!\n\nCustomer: ${selectedParty.legalName}\nCredit Limit: ₹${selectedParty.creditLimit.toFixed(2)}\nCurrent Outstanding: ₹${(selectedParty.currentOutstandingBalance || 0).toFixed(2)}\nThis Bill: ₹${netTotal.toFixed(2)}\n\nThis sale exceeds credit limit by ₹${excess.toFixed(2)}.\n\nDo you want to authorize and proceed?`
          );
          if (!confirmProceed) return;
        }
      }
    }

    try {
      setSubmitting(true);
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
        invoiceDiscountAmount: billDiscountType === "fixed" ? billDiscountValue : 0,
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

      // Trigger instant automatic print dialog in the user's chosen format!
      triggerPrintReceipt(receiptPayload, posPrintFormat, invoiceId);

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
        const el = isWideCart ? wideSearchInputRef.current : searchInputRef.current;
        el?.focus();
        el?.select();
      } else if (e.key === "F3") {
        e.preventDefault();
        document.getElementById("pos-customer-phone-input")?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) handleHoldBill();
      } else if (e.key === "F5") {
        e.preventDefault();
        setShowDiscountInput((prev) => !prev);
      } else if (e.key === "F6") {
        e.preventDefault();
        setIsWideCart((prev) => !prev);
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
  }, [cart, netTotal, isCheckoutOpen, isHeldModalOpen, isAddCustomerOpen, showShortcutsModal, showUpiModal, completedInvoiceId, submitting, isWideCart]);

  return (
    <div className={`h-[calc(100vh-4rem)] p-3 lg:p-4 flex flex-col gap-3 select-none overflow-hidden font-sans ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 h-screen" : ""}`}>
      {/* ─── 1. TOP CASHIER & COUNTER CONTROL BAR ─── */}
      <header className="p-2.5 px-3.5 rounded-xl bg-surface border border-border shadow-sm flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left: Counter Identifier & Live Clock */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase">Counter #01</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-muted-foreground font-mono bg-surface-muted px-2.5 py-1 rounded-lg border border-border">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{currentTime || "Live Register"}</span>
          </div>
        </div>

        {/* Center: Branch & Warehouse Location Selectors */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg px-2 py-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-foreground font-semibold focus:outline-none text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-surface text-foreground">
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg px-2 py-1">
            <WarehouseDetailsIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-foreground font-semibold focus:outline-none text-xs"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id} className="bg-surface text-foreground">
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-1.5">
          {hasPharmaAddon && (
            <Link
              href="/app/pharma/pos"
              className="px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-sm transition-all active:scale-95"
              title="Chemist Rapid POS with FEFO & Loose Strip Math"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chemist POS Mode</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsHeldModalOpen(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all ${
              heldBills.length > 0
                ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 animate-pulse"
                : "bg-surface-muted text-foreground border-border hover:bg-surface"
            }`}
            title="Recall Held Bills [F4]"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Held Carts ({heldBills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-surface-muted text-muted-foreground border-border"
            }`}
            title={soundEnabled ? "Barcode Sound Chimes: ON" : "Sound Muted"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* POS Print Format Dropdown */}
          <div className="flex items-center space-x-1 bg-surface-muted px-2 py-1 rounded-lg border border-border text-xs" title="Select Default Invoice Print Format for POS">
            <Printer className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              value={posPrintFormat}
              onChange={(e) => handleSetPosPrintFormat(e.target.value as PosPrintFormat)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="thermal80" className="bg-surface text-foreground">Thermal 80mm (3")</option>
              <option value="thermal58" className="bg-surface text-foreground">Thermal 58mm (2")</option>
              <option value="a4" className="bg-surface text-foreground">Full A4 Tax Invoice</option>
              <option value="a5" className="bg-surface text-foreground">Compact A5 Cash Memo</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsWideCart((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
              isWideCart
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface-muted text-foreground border-border hover:bg-surface"
            }`}
            title="Toggle Wide Cart / Counter Desk View [F6] (Displays 20+ Items across Full Screen)"
          >
            <Table className="w-3.5 h-3.5" />
            <span>{isWideCart ? "Split View" : "Wide View [F6]"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-surface-muted hover:bg-surface text-foreground border border-border transition-colors"
            title="Toggle Clean POS View"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-surface text-foreground text-xs font-bold border border-border flex items-center space-x-1"
            title="Keyboard Shortcuts [F1]"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Keys [F1]</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN SPLIT DESK (LEFT: CART / BILLED ITEMS | RIGHT: STOCK DISCOVERY) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* ─── BILLED ITEMS & CART TABLE PANE (LEFT SIDE - HIGH DENSITY FOR 15+ ITEMS) ─── */}
        <div
          className={`flex flex-col min-w-0 rounded-xl bg-surface border border-border shadow-md overflow-hidden transition-all duration-300 ${
            isWideCart ? "w-full flex-1" : "flex-1"
          }`}
        >
          {/* Customer Account & Quick Bar (Compact 1-Row Bar) */}
          <div className="px-3 py-1.5 bg-surface-muted/50 border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-bold text-foreground flex items-center space-x-1.5 uppercase tracking-wide">
                <Users2 className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Cart [F3]</span>
              </span>
              {cart.length > 0 && (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items
                </span>
              )}
            </div>

            {/* Inputs: Mobile & Customer Name in single inline flex */}
            <div className="flex items-center gap-1.5 flex-1 max-w-md">
              <input
                id="pos-customer-phone-input"
                type="tel"
                maxLength={10}
                placeholder="📱 Mobile (10 Digits)"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setCustomerPhone(val);
                  const matched = customers.find((c) => c.mobile === val || c.primaryPhone === val);
                  if (matched) {
                    setSelectedCustomerId(matched.id);
                    setCustomerName(matched.legalName);
                    setCustomerPoints(120);
                  }
                }}
                className="w-28 sm:w-32 px-2 py-1 bg-surface border border-border rounded-md text-xs font-mono font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 min-w-[100px] px-2 py-1 bg-surface border border-border rounded-md text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={() => {
                  setNewCustPhone(customerPhone);
                  setNewCustName(customerName !== "Walk-in Customer" ? customerName : "");
                  setIsAddCustomerOpen(true);
                }}
                className="px-2 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                title="Add Customer Details"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden md:inline">+ Add</span>
              </button>
            </div>

            {/* Barcode Search Form when in Wide Cart View */}
            {isWideCart && (
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1 max-w-sm hidden sm:flex items-center">
                <Search className="w-3.5 h-3.5 text-primary absolute left-2.5 pointer-events-none" />
                <input
                  ref={wideSearchInputRef}
                  type="text"
                  placeholder="Scan Barcode / SKU / Name... (F2)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-16 py-1 bg-surface border border-border rounded-md text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}

            {/* Right: Loyalty / Reset / Status */}
            <div className="flex items-center space-x-2 shrink-0">
              {customerPoints > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (redeemedPoints > 0) setRedeemedPoints(0);
                    else setRedeemedPoints(Math.min(customerPoints, subTotal));
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    redeemedPoints > 0 ? "bg-danger text-white" : "bg-amber-600 text-white"
                  }`}
                  title="Toggle Loyalty Points"
                >
                  ⭐ {customerPoints} Pts {redeemedPoints > 0 ? "(Applied)" : "(Redeem)"}
                </button>
              )}

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
                  className="text-[10px] text-danger font-bold hover:underline cursor-pointer"
                >
                  Reset
                </button>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Walk-in
                </span>
              )}
            </div>
          </div>

          {/* Supermarket Billed Items Table (High Density View for 15+ Items) */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-surface/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 opacity-30 text-primary" />
                <p className="text-xs font-semibold text-foreground">Cart is empty.</p>
                <p className="text-[11px] text-muted-foreground max-w-[240px]">
                  Scan a barcode or click any product tile {isWideCart ? "or type in search" : "on the right"} to start billing.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-table-header text-table-header-foreground text-[10px] uppercase font-bold border-b border-table-border sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 pl-2.5 w-7 text-center">#</th>
                    <th className="py-1.5 px-2">Item Details</th>
                    {isWideCart && <th className="py-1.5 px-2 text-left w-24">SKU</th>}
                    {isWideCart && hasPharmaAddon && <th className="py-1.5 px-2 text-left w-28">Batch / Exp</th>}
                    {isWideCart && <th className="py-1.5 px-2 text-right w-20">MRP</th>}
                    <th className="py-1.5 px-1.5 text-right w-20">Rate</th>
                    <th className="py-1.5 px-1.5 text-center w-24">Qty</th>
                    <th className="py-1.5 px-2 text-right w-24">Total</th>
                    <th className="py-1.5 pr-2 w-7 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-table-border bg-surface">
                  {cart.map((c, idx) => {
                    const lineGross = c.quantity * c.unitPrice;
                    const lineDisc = (lineGross * c.discountPercent) / 100;
                    const lineNet = lineGross - lineDisc;

                    return (
                      <tr key={c.item.id} className="hover:bg-table-hover transition-colors group">
                        <td className="py-1 pl-2.5 font-mono text-[11px] text-muted-foreground align-middle text-center">
                          {idx + 1}
                        </td>

                        <td className="py-1 px-2 align-middle">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-xs text-foreground truncate max-w-[180px] sm:max-w-[240px] lg:max-w-[320px]" title={c.item.name}>
                              {c.item.name}
                            </span>
                            {!isWideCart && (
                              <span className="text-[9px] text-muted-foreground/80 font-mono shrink-0">
                                #{c.item.sku}
                              </span>
                            )}
                            {!isWideCart && hasPharmaAddon && c.batchNumber && (
                              <span className="px-1 py-0 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold text-[8px] border border-teal-500/20 shrink-0 font-mono">
                                B:{c.batchNumber}
                              </span>
                            )}
                            {c.mrp > c.unitPrice && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                (-₹{((c.mrp - c.unitPrice) * c.quantity).toFixed(0)})
                              </span>
                            )}
                          </div>
                        </td>

                        {isWideCart && (
                          <td className="py-1 px-2 font-mono text-[11px] text-muted-foreground align-middle">
                            {c.item.sku}
                          </td>
                        )}

                        {isWideCart && hasPharmaAddon && (
                          <td className="py-1 px-2 font-mono text-[10px] text-teal-600 dark:text-teal-400 align-middle">
                            {c.batchNumber || "-"} {c.expiryDate ? `(${c.expiryDate})` : ""}
                          </td>
                        )}

                        {isWideCart && (
                          <td className="py-1 px-2 text-right font-mono text-xs text-muted-foreground align-middle">
                            ₹{c.mrp.toFixed(2)}
                          </td>
                        )}

                        <td className="py-1 px-1.5 text-right font-mono text-xs text-foreground align-middle">
                          ₹{c.unitPrice.toFixed(2)}
                        </td>

                        {/* Fast Qty Control (Compact tactile +/-) */}
                        <td className="py-1 px-1.5 align-middle">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(c.item.id, c.quantity - 1)}
                              className="w-4 h-4 rounded bg-danger/10 hover:bg-danger text-danger hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Decrease"
                            >
                              <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={c.quantity}
                              onChange={(e) => updateQuantity(c.item.id, parseInt(e.target.value) || 1)}
                              className="w-7 py-0 text-center font-mono font-bold text-xs bg-transparent text-foreground focus:outline-none focus:ring-1 focus:ring-primary rounded"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(c.item.id, c.quantity + 1)}
                              className="w-4 h-4 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center transition-colors cursor-pointer"
                              title="Increase"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </td>

                        <td className="py-1 px-2 text-right font-mono font-bold text-xs text-foreground align-middle">
                          ₹{lineNet.toFixed(2)}
                        </td>

                        <td className="py-1 pr-2 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => removeFromCart(c.item.id)}
                            className="text-muted-foreground hover:text-danger p-0.5 transition-colors cursor-pointer"
                            title="Remove item"
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

          {/* Bill Summary & Instant Tender (High-Efficiency Compact Dock) */}
          <div className="p-2.5 bg-surface border-t border-border shrink-0 space-y-2">
            {/* Row 1: Comprehensive Financial Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-border/40 pb-1.5">
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-medium text-[11px]">
                <span>Items: <strong className="text-foreground font-mono">{totalItemCount}</strong> (Units: <strong className="text-foreground font-mono">{totalQuantityUnits}</strong>)</span>
                <span>Sub-Total: <strong className="font-mono text-foreground">₹{subTotal.toFixed(2)}</strong></span>
                <span>Tax: <strong className="font-mono text-foreground">+₹{(totalTax + roundOff).toFixed(2)}</strong></span>

                {/* Discount Trigger / Pill */}
                {showDiscountInput ? (
                  <div className="inline-flex items-center space-x-1 bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                    <span className="text-[10px] font-bold">Disc:</span>
                    <input
                      type="number"
                      min="0"
                      max={billDiscountType === "percent" ? 100 : subTotal}
                      value={billDiscountValue || ""}
                      onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-12 px-1 py-0 text-[11px] font-mono font-bold bg-surface border border-border rounded text-right text-foreground focus:outline-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setBillDiscountType((prev) => (prev === "percent" ? "fixed" : "percent"))}
                      className="px-1 py-0 rounded bg-primary/20 text-primary text-[9px] font-bold"
                    >
                      {billDiscountType === "percent" ? "%" : "₹"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(true)}
                    className="text-[10px] text-primary hover:underline flex items-center space-x-1 font-semibold cursor-pointer"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>{billDiscountAmount > 0 ? `Disc: -₹${billDiscountAmount.toFixed(2)}` : "+ Discount [F5]"}</span>
                  </button>
                )}

                {redeemedPoints > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                    Loyalty: -₹{redeemedPoints.toFixed(2)}
                  </span>
                )}

                {totalSavings > 0 && (
                  <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Save ₹{totalSavings.toFixed(2)}</span>
                  </span>
                )}
              </div>

              {/* Net Payable Highlight */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Payable:</span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{netTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Row 2: Payment Mode Tabs & Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Payment Mode Mini-Tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode(1);
                    setTenderedAmount(netTotal);
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 1
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <Banknote className="w-3 h-3" />
                  <span>Cash [F7]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode(2);
                    setShowUpiModal(true);
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 2
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>UPI [F8]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode(3)}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 3
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Card [F9]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode(6)}
                  className={`px-2 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                    paymentMode === 6
                      ? "bg-warning/20 text-warning border-warning/40 shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  <Users2 className="w-3 h-3" />
                  <span>Khata</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-2.5 py-1.5 rounded-md bg-surface-muted hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                  title="Clear Cart [Esc]"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={cart.length === 0 || isHolding}
                  className="px-2.5 py-1.5 rounded-md bg-surface-muted hover:bg-surface text-warning border border-border/40 text-xs font-semibold disabled:opacity-40 transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Hold Bill [F4]"
                >
                  <PauseCircle className="w-3 h-3 text-warning" />
                  <span>Hold [F4]</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0 || submitting}
                  className="py-1.5 px-3 rounded-md bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{submitting ? "Processing..." : `PAY & PRINT ₹${netTotal.toFixed(2)} [F10]`}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Row 3 (Only when Cash mode is active): Compact Cash Denomination & Change Bar */}
            {paymentMode === 1 && (
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 px-2 rounded-md bg-surface-muted/60 border border-border/40 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[11px] text-foreground">Cash Recv:</span>
                  <input
                    type="number"
                    value={tenderedAmount || ""}
                    onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-surface border border-border/40 rounded text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setTenderedAmount(netTotal)}
                    className="px-1.5 py-0.5 rounded bg-surface border border-border/40 hover:bg-surface-muted text-[10px] font-mono font-bold text-foreground cursor-pointer"
                  >
                    Exact
                  </button>
                  {[100, 200, 500, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedAmount(amt)}
                      className="px-1.5 py-0.5 rounded bg-surface border border-border/40 hover:bg-surface-muted text-[10px] font-mono font-bold text-foreground cursor-pointer"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {tenderedAmount > netTotal && (
                  <div className="flex items-center space-x-1 text-[11px] text-success font-bold">
                    <span>Change:</span>
                    <span className="font-mono font-black">₹{cashChangeToReturn.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── STOCK & PRODUCT DISCOVERY PANE (RIGHT SIDE) ─── */}
        {!isWideCart && (
          <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col gap-2.5 min-w-0 bg-surface rounded-xl border border-border/40 p-3 shadow-2xs overflow-hidden shrink-0">
          {/* Big Barcode Search Bar (Focus on [F2]) */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-primary absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              autoFocus
              type="text"
              placeholder="🔍 Scan Barcode or Type Item Name / SKU... (Press Enter to Add | F2 to Focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2 bg-surface-muted border border-border/40 focus:border-primary rounded-xl text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-12 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-2xs cursor-pointer"
            >
              Add Item
            </button>
          </form>

          {/* Department / Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Items</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory("fast_moving")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                selectedCategory === "fast_moving"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Top Fast Moving</span>
            </button>

            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid (Touch & Click Friendly) */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
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
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group relative shadow-2xs ${
                      inCart
                        ? "bg-surface-elevated border-primary/40 shadow-xs"
                        : "bg-surface hover:bg-surface-muted border-border/40 hover:border-border"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold shadow-2xs">
                        {inCart.quantity} in cart
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span className="font-semibold text-muted-foreground uppercase truncate max-w-[100px]">
                          {item.sku}
                        </span>
                        {item.categoryName && (
                          <span className="text-muted-foreground truncate max-w-[80px]">
                            {item.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-xs text-foreground line-clamp-2 mt-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/40 flex items-end justify-between">
                      <div>
                        {savings > 0 && (
                          <div className="text-[10px] text-muted-foreground line-through font-mono">
                            MRP ₹{mrp.toFixed(2)}
                          </div>
                        )}
                        <div className="font-mono font-bold text-sm text-foreground">
                          ₹{price.toFixed(2)}
                        </div>
                      </div>

                      <span className="px-2 py-0.8 rounded-md bg-surface-elevated group-hover:bg-primary group-hover:text-primary-foreground text-muted-foreground border border-border/40 text-[11px] font-semibold transition-all shrink-0">
                        + Add
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        )}

      </div>

      {/* ─── MODAL 0: QUICK ADD CUSTOMER / NAME MODAL ─── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">Add Customer Name</h3>
                <p className="text-[11px] text-muted-foreground">Quickly attach customer details to this bill.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Customer / Buyer Name <span className="text-danger">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-mono font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  City / Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Market, Sector 12"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="save-to-dir-checkbox"
                  type="checkbox"
                  checked={saveToDirectory}
                  onChange={(e) => setSaveToDirectory(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="save-to-dir-checkbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Save to Customer Directory for future billing
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50 transition-colors"
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
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsHeldModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <PauseCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-foreground">Held Carts Queue ({heldBills.length})</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any parked bill to immediately restore it to the checkout counter.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {heldBills.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No held bills in queue.</p>
              ) : (
                heldBills.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => handleResumeBill(h)}
                    className="p-3 rounded-xl bg-surface-muted/50 border border-border hover:border-primary hover:bg-surface-muted transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-primary">{h.holdNumber}</span>
                        <span className="text-xs text-foreground font-bold">{h.customerName}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center space-x-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{new Date(h.createdAtUtc).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{h.itemsCount} Items</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{h.totalAmount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHeldBill(h.id, e)}
                        className="p-1 rounded text-muted-foreground hover:text-danger transition-colors"
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
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setShowUpiModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center space-x-2 text-primary">
              <QrCode className="w-6 h-6" />
              <h3 className="text-base font-black">Scan & Pay via UPI</h3>
            </div>

            <div className="p-4 bg-white border-2 border-primary rounded-xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `upi://pay?pa=${profile?.upiId || "billing@upi"}&pn=${encodeURIComponent(profile?.businessName || "RetailStore")}&am=${netTotal}&cu=INR`
                )}`}
                alt="UPI QR Code"
                className="w-44 h-44 mx-auto object-contain"
              />
            </div>

            <div>
              <div className="text-xl font-black font-mono text-foreground">₹{netTotal.toFixed(2)}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Scan using Google Pay, PhonePe, Paytm or BHIM UPI.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowUpiModal(false);
                handleCompleteSale();
              }}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-colors"
            >
              Confirm UPI Payment Received & Print
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: KEYBOARD SHORTCUTS CHEATSHEET ─── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-foreground">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-foreground font-bold text-base">
              <HelpCircle className="w-5 h-5 text-amber-500" />
              <span>Supermarket POS Fast Keys</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: "F1", desc: "Show Shortcuts Cheatsheet" },
                { key: "F2", desc: "Focus Barcode Scanner / Search" },
                { key: "F3", desc: "Focus Customer Mobile / Member" },
                { key: "F4", desc: "Hold / Park Current Bill" },
                { key: "F5", desc: "Apply Bill Discount (% or ₹)" },
                { key: "F6", desc: "Toggle Wide View (15+ Items)" },
                { key: "F7", desc: "Fast Cash Payment Tender" },
                { key: "F8", desc: "Instant UPI / QR Code" },
                { key: "F9", desc: "Card / Swipe Payment" },
                { key: "F10 / Ctrl+Enter", desc: "Pay & Print Bill" },
                { key: "Esc", desc: "Clear Cart / Close Modal" },
              ].map((s) => (
                <div key={s.key} className="p-2 rounded-lg bg-surface-muted border border-border flex items-center justify-between">
                  <span className="font-mono font-black px-1.5 py-0.5 rounded bg-surface border border-border text-foreground text-[10px]">
                    {s.key}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium text-right">{s.desc}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 rounded-lg bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold transition-colors"
            >
              Close [Esc]
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: SALE SUCCESS & DIRECT RECEIPT PRINT POPUP ─── */}
      {completedInvoiceId && lastReceiptData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl max-h-[90vh] flex flex-col text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Sale Billed Successfully!</h3>
                  <p className="text-[10px] text-muted-foreground">Bill: {lastReceiptData.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setCompletedInvoiceId(null)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Preview Box */}
            <div className="flex-1 overflow-y-auto bg-surface-muted p-3 rounded-xl border border-border max-h-60 font-mono text-[11px] text-foreground">
              <div className="text-center font-bold pb-1 border-b border-dashed border-border">
                {profile?.businessName || "RETAIL STORE"}
              </div>
              <div className="py-1 text-[10px] text-muted-foreground border-b border-dashed border-border">
                <div>Customer: <b className="text-foreground">{lastReceiptData.customerName}</b> ({lastReceiptData.customerPhone || "Walk-in"})</div>
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
              <div className="pt-1.5 border-t border-dashed border-border text-right space-y-0.5">
                <div className="text-muted-foreground text-[10px]">Tax & Round: +₹{lastReceiptData.tax.toFixed(2)}</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">Net Total: ₹{lastReceiptData.netTotal.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Paid ({lastReceiptData.paymentModeText}): ₹{lastReceiptData.paidAmount.toFixed(2)}</div>
                {lastReceiptData.changeAmount > 0 && (
                  <div className="text-[10px] font-bold text-indigo-500">Change Returned: ₹{lastReceiptData.changeAmount.toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Print & Next Customer Actions */}
            <div className="space-y-2 pt-1">
              {/* Format Switcher Pills in Modal */}
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                <span className="text-muted-foreground text-[10px]">Print Format:</span>
                <div className="flex items-center gap-1">
                  {([
                    { id: "thermal80", label: "80mm" },
                    { id: "thermal58", label: "58mm" },
                    { id: "a4", label: "A4" },
                    { id: "a5", label: "A5" },
                  ] as { id: PosPrintFormat; label: string }[]).map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleSetPosPrintFormat(fmt.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        posPrintFormat === fmt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-surface text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerPrintReceipt(lastReceiptData, posPrintFormat, completedInvoiceId || undefined)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  🖨️ Print Receipt (
                  {posPrintFormat === "a4"
                    ? "Full A4 Tax Invoice"
                    : posPrintFormat === "a5"
                    ? "Compact A5 Cash Memo"
                    : posPrintFormat === "thermal58"
                    ? "Thermal 58mm"
                    : "Thermal 80mm"}
                  )
                </span>
              </button>

              <div className="flex items-center space-x-2">
                <Link
                  href={`/app/sales/invoices/${completedInvoiceId}`}
                  className="flex-1 py-2 rounded-xl bg-surface-muted hover:bg-surface text-foreground border border-border text-xs font-bold text-center transition-colors"
                >
                  View Full Invoice
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedInvoiceId(null);
                    searchInputRef.current?.focus();
                  }}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors"
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
