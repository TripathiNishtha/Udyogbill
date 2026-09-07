import {
  Activity,
  Award,
  Users,
  ShoppingCart,
  BarChart3,
  UserCheck,
  MapPin,
  Calendar,
  Gift,
  Briefcase
} from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const pharmaSfaAddonManifest: AddonManifest = {
  id: "pharma-sfa",
  name: "Pharma SFA & Field Force Suite",
  titleHindi: "फार्मा एमआर एवं फील्ड फोर्स सुइट",
  description: "MR Staffing Roster, Doctor & Prescriber Directory, Calling Beats, Stockist Allocation, Trade Schemes & Slabs, Sample Bag, Monthly Tour Plans, POB Orders, SFA Field Force & CBO Sales Attribution.",
  icon: Activity,
  badgeText: "SFA Add-on",
  category: "Field Force",
  featureKeys: [],
  sidebarNavGroup: {
    id: "pharma-sfa-suite",
    title: "Pharma SFA & Field Force",
    icon: Activity,
    items: [
      { label: "Divisions & Calling Beats", href: "/app/pharma/territory-hierarchy", icon: MapPin },
      { label: "MR & Staffing Roster", href: "/app/pharma/field-force", icon: UserCheck },
      { label: "Doctors & Prescribers", href: "/app/pharma/prescribers", icon: Award },
      { label: "Stockist-MR Allocation", href: "/app/pharma/stockist-allocations", icon: Users },
      { label: "Trade Schemes & Slabs", href: "/app/pharma/schemes", icon: Gift },
      { label: "Sample Bag & Challans", href: "/app/pharma/sample-inventory", icon: Briefcase },
      { label: "Tour Plans & TP Compliance", href: "/app/pharma/sfa/tour-plans", icon: Calendar },
      { label: "POB Orders to Billing", href: "/app/pharma/pob-orders", icon: ShoppingCart },
      { label: "SFA Field Force & DCR", href: "/app/pharma/sfa", icon: Activity },
      { label: "CBO Sales Attribution", href: "/app/pharma/attribution", icon: BarChart3 },
    ],
  },
  highlights: [
    "Headquarters, Territory, and Area Sales Manager Hierarchy",
    "Medical Representative (MR) Daily Calling Report (DCR) & Geo-Tagging",
    "Doctor Master Directory & Specialist Prescriber Tagging",
    "Stockist-to-MR Territory Mapping and Secondary Sales Reconciliation",
    "Commercial Trade Schemes, Quantitative Slab Discounts & Free Goods",
    "Sample Stock Bag Inventory Tracking & Doctor Challans",
    "Monthly Tour Plan (MTP/TP) Approval Workflow & Compliance Matrix",
    "Order Booking (POB) Directly Converted to Sales Invoices",
    "Sales Attribution & CBO Secondary Sales Achievement Analytics",
  ],
};
