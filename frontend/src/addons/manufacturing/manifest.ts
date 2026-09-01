import { Factory, Scale, FileSpreadsheet } from "lucide-react";
import { AddonManifest } from "../addon-registry";

export const manufacturingAddonManifest: AddonManifest = {
  id: "manufacturing",
  name: "Manufacturing & Bakery (BOM)",
  titleHindi: "उत्पादन, बेकरी और असेंबली पैक",
  description: "Recipe / Bill of Materials (BOM), raw material auto-consumption, batch production runs, and scrap/wastage tracking.",
  icon: Factory,
  badgeText: "Production",
  category: "Industrial & Food",
  featureKeys: [
    "enableRecipeBOM"
  ],
  sidebarNavGroup: {
    id: "manufacturing-suite",
    title: "Manufacturing & BOM",
    icon: Factory,
    items: [
      { label: "Recipe BOM & Assembly", href: "/app/industry/manufacturing", icon: Factory },
      { label: "Physical Stock Audit", href: "/app/inventory/adjustments", icon: Scale },
      { label: "Stock Transfers (STN)", href: "/app/inventory/transfers", icon: FileSpreadsheet },
    ],
  },
  highlights: [
    "Recipe / Bill of Materials (BOM) Costing",
    "Auto-deduct Raw Materials on Production",
    "Production Batch Yield & Wastage Tracking",
    "Assembly Work Orders & Status",
  ],
};
