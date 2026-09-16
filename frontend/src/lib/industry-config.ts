/**
 * Centralized Industry Profiles & Configuration Registry for UdyogBill
 * Single Source of Truth for Industry-Adaptive Placeholders, Tracking Defaults, and Attribute Schemas.
 */

export type IndustryType =
  | "PHARMA"
  | "ELECTRONICS"
  | "GARMENTS"
  | "HARDWARE"
  | "FMCG"
  | "GENERAL";

export interface IndustryConfig {
  code: IndustryType;
  displayName: string;
  placeholders: {
    itemName: string;
    hsn: string;
    packaging: string;
    categoryExample: string;
    batchOrSerialLabel: string;
    batchOrSerialPlaceholder: string;
  };
  trackingDefaults: {
    trackInventory: boolean;
    trackBatches: boolean;
    trackSerialNumbers: boolean;
    hideBatches: boolean;
    hideSerialNumbers: boolean;
  };
  attributeFields: {
    key: string;
    label: string;
    placeholder: string;
    type: "text" | "select" | "number";
    options?: { label: string; value: string }[];
  }[];
  quickAdd: {
    showBatch: boolean;
    showExpiry: boolean;
    showSerial: boolean;
    showBrand: boolean;
    showWarranty: boolean;
    showSizeColor: boolean;
  };
}

export function resolveIndustry(code?: string | null): IndustryType {
  if (!code) return "GENERAL";
  const upper = code.trim().toUpperCase();

  if (upper.includes("PHARMA") || upper.includes("CHEMIST") || upper.includes("HEALTH") || upper.includes("DRUG")) {
    return "PHARMA";
  }
  if (
    upper.includes("ELECTR") ||
    upper.includes("MOBILE") ||
    upper.includes("COMPUTER") ||
    upper.includes("TECH") ||
    upper.includes("GADGET") ||
    upper.includes("APPLIANCE")
  ) {
    return "ELECTRONICS";
  }
  if (
    upper.includes("GARMENT") ||
    upper.includes("APPAREL") ||
    upper.includes("CLOTH") ||
    upper.includes("FOOTWEAR") ||
    upper.includes("TEXTILE")
  ) {
    return "GARMENTS";
  }
  if (
    upper.includes("HARDWARE") ||
    upper.includes("ELECTRICAL") ||
    upper.includes("SANITARY") ||
    upper.includes("PAINT") ||
    upper.includes("STEEL")
  ) {
    return "HARDWARE";
  }
  if (
    upper.includes("FMCG") ||
    upper.includes("GROCERY") ||
    upper.includes("RETAIL") ||
    upper.includes("SUPERMARKET") ||
    upper.includes("KIRANA")
  ) {
    return "FMCG";
  }

  return "GENERAL";
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  PHARMA: {
    code: "PHARMA",
    displayName: "Pharmaceuticals & Healthcare",
    placeholders: {
      itemName: "e.g. Augmentin 625 Duo Tablet",
      hsn: "e.g. 3004",
      packaging: "e.g. STRIPS OF 10 TABS",
      categoryExample: "Antibiotics / Analgesics",
      batchOrSerialLabel: "Batch No",
      batchOrSerialPlaceholder: "e.g. BAT-2026-01",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: true,
      trackSerialNumbers: false,
      hideBatches: false,
      hideSerialNumbers: true,
    },
    attributeFields: [
      {
        key: "drugSchedule",
        label: "Drug Schedule",
        placeholder: "Select Schedule",
        type: "select",
        options: [
          { label: "None (OTC)", value: "None" },
          { label: "Schedule H (Rx)", value: "Schedule H" },
          { label: "Schedule H1 (High Alert)", value: "Schedule H1" },
          { label: "Schedule X (Narcotic)", value: "Schedule X" },
        ],
      },
      {
        key: "composition",
        label: "Composition / Salt",
        placeholder: "e.g. Amoxicillin + Potassium Clavulanate",
        type: "text",
      },
    ],
    quickAdd: {
      showBatch: true,
      showExpiry: true,
      showSerial: false,
      showBrand: false,
      showWarranty: false,
      showSizeColor: false,
    },
  },

  ELECTRONICS: {
    code: "ELECTRONICS",
    displayName: "Electronics, Mobiles & IT",
    placeholders: {
      itemName: "e.g. Samsung Galaxy S24 Ultra (256GB)",
      hsn: "e.g. 8517",
      packaging: "e.g. 1 Unit (Box with Cable)",
      categoryExample: "Smartphones / Accessories",
      batchOrSerialLabel: "IMEI / Serial No",
      batchOrSerialPlaceholder: "e.g. 352891104829102",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: false,
      trackSerialNumbers: true,
      hideBatches: true,
      hideSerialNumbers: false,
    },
    attributeFields: [
      {
        key: "brand",
        label: "Brand / Manufacturer",
        placeholder: "e.g. Samsung, Apple, boAt",
        type: "text",
      },
      {
        key: "modelVariant",
        label: "Model / Variant",
        placeholder: "e.g. 12GB RAM, 256GB Titanium Gray",
        type: "text",
      },
      {
        key: "warrantyMonths",
        label: "Warranty (Months)",
        placeholder: "e.g. 12",
        type: "number",
      },
      {
        key: "imeiTracking",
        label: "Tracking Mode",
        placeholder: "Select Tracking Mode",
        type: "select",
        options: [
          { label: "IMEI (Dual SIM)", value: "DUAL_IMEI" },
          { label: "Single Serial / IMEI", value: "SINGLE_SERIAL" },
          { label: "Barcode / SKU Only", value: "BARCODE_ONLY" },
        ],
      },
    ],
    quickAdd: {
      showBatch: false,
      showExpiry: false,
      showSerial: true,
      showBrand: true,
      showWarranty: true,
      showSizeColor: false,
    },
  },

  GARMENTS: {
    code: "GARMENTS",
    displayName: "Garments, Apparel & Footwear",
    placeholders: {
      itemName: "e.g. Men's Slim Fit Cotton Formal Shirt",
      hsn: "e.g. 6205",
      packaging: "e.g. 1 Piece Polybag / Box of 3",
      categoryExample: "Men's Formal / Casual Wear",
      batchOrSerialLabel: "Lot / Roll No",
      batchOrSerialPlaceholder: "e.g. LOT-402",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: false,
      trackSerialNumbers: false,
      hideBatches: false,
      hideSerialNumbers: true,
    },
    attributeFields: [
      {
        key: "brand",
        label: "Brand",
        placeholder: "e.g. Raymond, Allen Solly",
        type: "text",
      },
      {
        key: "size",
        label: "Size",
        placeholder: "e.g. M, L, XL, 32, 40",
        type: "text",
      },
      {
        key: "color",
        label: "Color / Shade",
        placeholder: "e.g. Sky Blue, Navy, Olive",
        type: "text",
      },
      {
        key: "fabric",
        label: "Fabric / Material",
        placeholder: "e.g. 100% Giza Cotton, Denim",
        type: "text",
      },
    ],
    quickAdd: {
      showBatch: false,
      showExpiry: false,
      showSerial: false,
      showBrand: true,
      showWarranty: false,
      showSizeColor: true,
    },
  },

  HARDWARE: {
    code: "HARDWARE",
    displayName: "Hardware, Electrical & Sanitary",
    placeholders: {
      itemName: "e.g. Finolex 1.5 sq mm FR PVC Insulated Wire",
      hsn: "e.g. 8544",
      packaging: "e.g. 1 Roll (90 Meters)",
      categoryExample: "Cables & Wires / Electricals",
      batchOrSerialLabel: "Batch / Lot No",
      batchOrSerialPlaceholder: "e.g. LOT-881",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: false,
      trackSerialNumbers: false,
      hideBatches: false,
      hideSerialNumbers: true,
    },
    attributeFields: [
      {
        key: "brand",
        label: "Brand",
        placeholder: "e.g. Finolex, Havells, Asian Paints",
        type: "text",
      },
      {
        key: "dimension",
        label: "Dimension / Length / Gauge",
        placeholder: "e.g. 90m, 1/2 inch, 2.5mm",
        type: "text",
      },
      {
        key: "grade",
        label: "Material Grade / Finish",
        placeholder: "e.g. SS-304, Brass Chrome, FR PVC",
        type: "text",
      },
    ],
    quickAdd: {
      showBatch: false,
      showExpiry: false,
      showSerial: false,
      showBrand: true,
      showWarranty: false,
      showSizeColor: false,
    },
  },

  FMCG: {
    code: "FMCG",
    displayName: "FMCG, Grocery & Supermarket",
    placeholders: {
      itemName: "e.g. Fortune Sunlite Refined Sunflower Oil 1L",
      hsn: "e.g. 1512",
      packaging: "e.g. 1 Litre Pouch / Carton of 12",
      categoryExample: "Edible Oils / Spices / Staples",
      batchOrSerialLabel: "Batch No",
      batchOrSerialPlaceholder: "e.g. B-948",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: true,
      trackSerialNumbers: false,
      hideBatches: false,
      hideSerialNumbers: true,
    },
    attributeFields: [
      {
        key: "brand",
        label: "Brand",
        placeholder: "e.g. Fortune, Tata, Amul",
        type: "text",
      },
      {
        key: "netWeight",
        label: "Net Weight / Volume",
        placeholder: "e.g. 1L, 500g, 5kg",
        type: "text",
      },
      {
        key: "packagingType",
        label: "Packaging Type",
        placeholder: "e.g. Pouch, Tin, Tetra Pack, Bottle",
        type: "text",
      },
    ],
    quickAdd: {
      showBatch: true,
      showExpiry: true,
      showSerial: false,
      showBrand: true,
      showWarranty: false,
      showSizeColor: false,
    },
  },

  GENERAL: {
    code: "GENERAL",
    displayName: "General Trading & Distribution",
    placeholders: {
      itemName: "e.g. Standard Commercial Item",
      hsn: "e.g. 8471",
      packaging: "e.g. 1 Piece / Box",
      categoryExample: "General Goods",
      batchOrSerialLabel: "Batch / Serial No",
      batchOrSerialPlaceholder: "e.g. BT-1001",
    },
    trackingDefaults: {
      trackInventory: true,
      trackBatches: false,
      trackSerialNumbers: false,
      hideBatches: false,
      hideSerialNumbers: false,
    },
    attributeFields: [
      {
        key: "brand",
        label: "Brand / Make",
        placeholder: "e.g. Standard Brand",
        type: "text",
      },
      {
        key: "notes",
        label: "Specifications / Notes",
        placeholder: "e.g. Model, specs, description",
        type: "text",
      },
    ],
    quickAdd: {
      showBatch: true,
      showExpiry: false,
      showSerial: false,
      showBrand: true,
      showWarranty: false,
      showSizeColor: false,
    },
  },
};

export function getIndustryConfig(code?: string | null): IndustryConfig {
  const type = resolveIndustry(code);
  return INDUSTRY_CONFIGS[type];
}
