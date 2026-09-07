"use client";

import React, { useState } from "react";
import { X, UserPlus, Building2, Phone, Mail, FileText, MapPin, Check } from "lucide-react";
import { partyService, CreatePartyInput } from "@/services/party-services";
import { PartyList } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (newParty: PartyList) => void;
}

export function QuickAddCustomerModal({ isOpen, onClose, onCustomerCreated }: Props) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [drugLicenseNumber1, setDrugLicenseNumber1] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [pincode, setPincode] = useState("");
  const [creditLimit, setCreditLimit] = useState(0);
  const [creditPeriodDays, setCreditPeriodDays] = useState(30);
  const [customerType, setCustomerType] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!legalName.trim()) {
      setErrorMsg("Customer / Business Legal Name is required.");
      return;
    }
    if (!primaryPhone.trim()) {
      setErrorMsg("Mobile / Phone number is required.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Email ID is required.");
      return;
    }

    try {
      setSubmitting(true);
      const code = `CUST-${Date.now().toString().slice(-4)}`;
      const payload: CreatePartyInput = {
        code,
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || undefined,
        partyType: 1, // Customer
        customerType: customerType || (gstin.trim() ? 1 : 2),
        primaryPhone: primaryPhone.trim(),
        mobile: primaryPhone.trim(),
        email: email.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        drugLicenseNumber1: drugLicenseNumber1.trim() || undefined,
        creditLimit: Number(creditLimit) || 0,
        creditPeriodDays: Number(creditPeriodDays) || 30,
        billingAddress: addressLine1.trim()
          ? {
              addressType: 1,
              addressLine1: addressLine1.trim(),
              city: city.trim() || "Mumbai",
              state: state.trim() || "Maharashtra",
              stateCode: stateCode.trim() || "27",
              pincode: pincode.trim() || "400001",
            }
          : undefined,
      };

      const newId = await partyService.createCustomer(payload);

      const newParty: PartyList = {
        id: newId,
        code,
        legalName: legalName.trim(),
        tradeName: tradeName.trim() || undefined,
        primaryPhone: primaryPhone.trim(),
        mobile: primaryPhone.trim(),
        email: email.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        partyType: 1,
        customerType: customerType || (gstin.trim() ? 1 : 2),
        currentOutstandingBalance: 0,
        creditLimit: Number(creditLimit) || 0,
        creditPeriodDays: Number(creditPeriodDays) || 30,
        isActive: true,
        drugLicenseNumber1: drugLicenseNumber1.trim() || undefined,
        stateCode: stateCode.trim() || "27",
      } as any;

      onCustomerCreated(newParty);
      onClose();
    } catch (err: any) {
      console.error("Failed to add customer", err);
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add New Customer Account</h3>
              <p className="text-[11px] text-slate-400">
                Register customer master record with contact, GSTIN, DL No & Email
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Legal Name */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-200">
                Business / Customer Legal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Medicos & Healthcare"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Customer Type / Billing Category */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-indigo-400">
                Customer Type (Billing Category) *
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>B2B - Business to Business (Wholesale Rate / GST)</option>
                <option value={2}>B2C - Business to Consumer (Retail MRP)</option>
                <option value={8}>D2C - Direct to Consumer (Online / Delivery)</option>
                <option value={4}>Wholesale - Stockist / Bulk Trade (PTS Rate)</option>
                <option value={3}>Retail - Counter Walk-in (MRP)</option>
              </select>
            </div>

            {/* Trade Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">Trade / Shop Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Meds"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mobile / Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                <Phone className="w-3 h-3 text-indigo-400" />
                <span>Primary Mobile (10 Digits) *</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Email ID (Requested explicitly by user) */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                <Mail className="w-3 h-3 text-indigo-400" />
                <span>Customer Email ID *</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. billing@apexmeds.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* GSTIN */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">Customer GSTIN</label>
              <input
                type="text"
                maxLength={15}
                placeholder="27AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Drug License No */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">Drug License (DL No)</label>
              <input
                type="text"
                placeholder="e.g. DL-20B/21B-12345"
                value={drugLicenseNumber1}
                onChange={(e) => setDrugLicenseNumber1(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>Billing / Shipping Address</span>
              </label>
              <input
                type="text"
                placeholder="Shop / Unit No, Building, Street, Area"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">City</label>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* State Code */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-200">State Code (GST)</label>
              <input
                type="text"
                maxLength={2}
                placeholder="e.g. 27"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? "Saving Customer..." : "Save & Select Customer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
