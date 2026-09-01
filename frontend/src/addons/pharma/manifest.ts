import {
  Activity,
  Award,
  TrendingDown,
  Pill,
  Layers,
  FlaskConical,
  FileCheck,
  Zap,
  RotateCcw
} from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const pharmaAddonManifest: AddonManifest = {
  id: "pharma",
  name: "Pharma & Healthcare Suite",
  titleHindi: "दवा और मेडिकल स्टोर पैक",
  description: "Generic Salt Substitutes, Multi-Batch FEFO routing, Schedule H1 registers, Strip/Loose packaging, Expiry dumping claims, and Doctor directory.",
  icon: Pill,
  badgeText: "Pharma",
  category: "Healthcare",
  featureKeys: [
    "enableBatchTracking",
    "enableExpiryTracking",
    "enableScheduleH1DrugTracking"
  ],
  sidebarNavGroup: {
    id: "pharma-suite",
    title: "Pharma & Healthcare",
    icon: Pill,
    items: [
      { label: "Chemist Rapid POS", href: "/app/pharma/pos", icon: Zap },
      { label: "Batches & FEFO Routing", href: "/app/pharma/batches", icon: Layers },
      { label: "Salt & Substitutes Finder", href: "/app/pharma/substitutes", icon: FlaskConical },
      { label: "Schedule H1 Register", href: "/app/pharma/h1-register", icon: FileCheck },
      { label: "Expiry Claims & Return", href: "/app/pharma/expiry-claims", icon: RotateCcw },
      { label: "Doctors & MR Directory", href: "/app/pharma/prescribers", icon: Award },
    ],
  },
  highlights: [
    "FEFO Automatic First-Expiry First-Out Batch Routing",
    "Instant Generic Chemical Salt Substitute Recommendation (F8)",
    "Strip to Loose Tablet Packaging Ratio Calculation",
    "CDSCO Schedule H & H1 Statutory Compliance Registers",
    "Wholesaler Expiry Return & Dumping Debit Notes",
    "Doctor Prescription & 2-Second Patient Repeat Billing",
  ],
};
