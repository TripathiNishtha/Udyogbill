import { Landmark, BookOpen, Scale, FileSpreadsheet, Receipt } from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const accountingAddonManifest: AddonManifest = {
  id: "accounting",
  name: "Dual-Entry Financial Accounting",
  titleHindi: "वित्तीय मुनीमी और सीए अकाउंटिंग पैक",
  description: "Double-entry general ledger, Journal & Contra vouchers, Bank Reconciliation (BRS), and Trial Balance / P&L / Balance Sheet.",
  icon: Landmark,
  badgeText: "Finance",
  category: "Finance & Taxation",
  featureKeys: [], // Custom toggle in config / settings
  sidebarNavGroup: {
    id: "accounting-suite",
    title: "Dual-Entry Accounting",
    icon: Landmark,
    items: [
      { label: "Financial Engine Hub", href: "/app/accounting", icon: Landmark },
      { label: "Chart of Accounts (COA)", href: "/app/accounting/coa", icon: BookOpen },
      { label: "Journal & Contra Vouchers", href: "/app/accounting/vouchers", icon: Scale },
      { label: "Financial Statements (TB/BS/PL)", href: "/app/accounting/reports", icon: FileSpreadsheet },
      { label: "Bank Reconciliation (BRS)", href: "/app/accounting/reconciliation", icon: Receipt },
      { label: "Bank Accounts Master", href: "/app/banking/accounts", icon: Landmark },
      { label: "Business Expenses", href: "/app/expenses", icon: Receipt },
    ],
  },
  highlights: [
    "Full Chart of Accounts (COA) Hierarchy",
    "Journal, Contra, Payment, and Receipt Vouchers",
    "Auto Ledger Posting from Invoices & Bills",
    "Bank Reconciliation Statement (BRS) with Excel Import",
    "Audited Balance Sheet & Profit and Loss (P&L)",
  ],
};
