"use client";

import { useEffect, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  CheckCircle2,
  TrendingDown,
  Percent,
  Wallet,
  Landmark,
} from "lucide-react";
import { bankingService, ExpenseCategory, ExpenseVoucher, BankAccount } from "@/services/banking-services";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // New Expense Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<number>(4); // Bank Transfer
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [hasGstInvoice, setHasGstInvoice] = useState(false);
  const [vendorGstin, setVendorGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [notification, setNotification] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, expRes, accsRes] = await Promise.all([
        bankingService.getExpenseCategories().catch(() => []),
        bankingService.getExpenses({ categoryId: selectedCategory || undefined, pageSize: 100 }).catch(() => ({ items: [], totalCount: 0 })),
        bankingService.getAccounts().catch(() => []),
      ]);

      setCategories(catsRes || []);
      setExpenses(expRes.items || []);
      setAccounts(accsRes || []);

      if (catsRes?.length > 0 && !categoryId) setCategoryId(catsRes[0].id);
      if (accsRes?.length > 0 && !bankAccountId) setBankAccountId(accsRes[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleTaxPercentChange = (pct: number) => {
    setTaxPercent(pct);
    setTaxAmount((amount * pct) / 100);
  };

  const handleAmountChange = (amt: number) => {
    setAmount(amt);
    setTaxAmount((amt * taxPercent) / 100);
  };

  const handleCreateExpense = async () => {
    if (!categoryId || !paidTo.trim() || amount <= 0) {
      alert("Please fill category, recipient payee, and valid amount.");
      return;
    }

    try {
      await bankingService.createExpense({
        expenseDate: new Date().toISOString().slice(0, 10),
        categoryId,
        paidTo,
        amount,
        taxAmount,
        paymentMode,
        bankAccountId: bankAccountId || undefined,
        referenceNumber,
        hasGstInvoice,
        vendorGstin,
        notes,
      });

      setIsOpenModal(false);
      setPaidTo("");
      setAmount(0);
      setTaxAmount(0);
      setReferenceNumber("");
      setNotes("");
      setNotification("Expense voucher recorded and accounts ledger synchronized!");
      loadData();
    } catch {
      alert("Failed to create expense voucher.");
    }
  };

  const totalExpenseVal = expenses.reduce((acc, e) => acc + e.totalAmount, 0);
  const totalTaxClaimable = expenses.reduce((acc, e) => acc + e.taxAmount, 0);

  const filteredExpenses = expenses.filter(
    (e) =>
      e.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2.5">
            <Receipt className="w-7 h-7 text-rose-400" />
            <span>Business Expenses & Overhead Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record operational expenses, overheads, staff payouts, and claim GST Input Tax Credits (ITC).
          </p>
        </div>

        <button
          onClick={() => setIsOpenModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Expense Voucher</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Expenses (Period)</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            ₹{totalExpenseVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total recorded vouchers</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>GST Input Tax Credit</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{totalTaxClaimable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Claimable against GST output liability</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Expense Categories</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {categories.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Rent, Utilities, Logistics, etc.</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Payee / Vendor, Voucher No, or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
            <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Voucher No & Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Paid To / Recipient</th>
                <th className="py-3.5 px-4">Payment Channel</th>
                <th className="py-3.5 px-4 text-right">Base Amount</th>
                <th className="py-3.5 px-4 text-right">GST / Tax</th>
                <th className="py-3.5 px-4 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading expense vouchers...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No expense vouchers found. Click "New Expense Voucher" to record an expense.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-white">{exp.voucherNumber}</div>
                      <div className="text-[10px] text-slate-500">{new Date(exp.expenseDate).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {exp.categoryName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{exp.paidTo}</div>
                      {exp.vendorGstin && <div className="text-[10px] text-slate-500 font-mono">GSTIN: {exp.vendorGstin}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {exp.bankAccountName || "Cash Register"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      ₹{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                      {exp.taxAmount > 0 ? `+₹${exp.taxAmount.toFixed(2)}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                      ₹{exp.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              <span>Record New Business Expense Voucher</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Expense Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Paid To / Payee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. DLF Properties / Staff Name"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Base Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">GST Tax %</label>
                  <select
                    value={taxPercent}
                    onChange={(e) => handleTaxPercentChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  >
                    <option value={0}>0% (None)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Total Payable</label>
                  <input
                    type="text"
                    disabled
                    value={`₹${(amount + taxAmount).toFixed(2)}`}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-rose-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value={1}>Cash</option>
                    <option value={2}>UPI</option>
                    <option value={4}>Bank Transfer / NEFT / IMPS</option>
                    <option value={5}>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Paid From Bank Account</label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="">Cash Register / Petty Cash</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} (₹{a.currentBalance.toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Reference / Bill / UTR No.</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-9921 / UTR-0012"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Vendor GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={vendorGstin}
                    onChange={(e) => {
                      setVendorGstin(e.target.value.toUpperCase());
                      setHasGstInvoice(e.target.value.length > 0);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-850">
              <button
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExpense}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Record Expense Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
