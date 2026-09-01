import { Boxes, Settings2, TrendingDown } from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const fmcgAddonManifest: AddonManifest = {
  id: "fmcg",
  name: "FMCG, Grocery & Distribution",
  titleHindi: "होलसेल, किराना और FMCG पैक",
  description: "Multi-tier packaging conversions (Carton to Box to Pcs), scheme discounts, and auto re-order thresholds.",
  icon: Boxes,
  badgeText: "Distribution",
  category: "Trading & Grocery",
  featureKeys: [
    "enableMultiUnitConversion"
  ],
  sidebarNavGroup: {
    id: "fmcg-suite",
    title: "FMCG & Distribution",
    icon: Boxes,
    items: [
      { label: "Units & Conversions", href: "/app/inventory/units", icon: Settings2 },
      { label: "Auto Re-order & Min/Max", href: "/app/inventory/reorder", icon: TrendingDown },
    ],
  },
  highlights: [
    "Multi-Unit Conversions (1 Case = 12 Box = 144 Pcs)",
    "Free Scheme Discounts (Buy 10 Get 1 Free)",
    "Fast Wholesaler Cart & Price Lists",
    "Minimum / Maximum Safety Stock Alerts",
  ],
};
