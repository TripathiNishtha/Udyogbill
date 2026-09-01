import { Shirt, Sparkles } from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const garmentsAddonManifest: AddonManifest = {
  id: "garments",
  name: "Apparel & Garments Matrix",
  titleHindi: "कपड़ा और फुटवियर पैक",
  description: "2D Size x Color SKU Matrix generation, clothing variant tracking, and custom barcode hang-tag studio.",
  icon: Shirt,
  badgeText: "Fashion & Retail",
  category: "Apparel",
  featureKeys: [
    "enableSizeColorMatrix"
  ],
  sidebarNavGroup: {
    id: "garments-suite",
    title: "Apparel & Garments",
    icon: Shirt,
    items: [
      { label: "Apparel Matrix SKUs", href: "/app/industry/matrix", icon: Shirt },
      { label: "Barcode Tag Studio", href: "/app/inventory/barcode", icon: Sparkles },
    ],
  },
  highlights: [
    "Size x Color Matrix Variant Generation",
    "Clothing Hang-Tag Barcode Printing",
    "Style Code & Seasonal Cataloging",
    "Fast Grid Matrix Counter Billing",
  ],
};
