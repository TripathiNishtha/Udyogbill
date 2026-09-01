// Universal Smart Data Migrator for Indian Accounting & Billing Systems
// Supports: Marg ERP, Vyapar, Tally Prime, Busy, MyBillBook, and Custom Excel/CSV

export interface StandardProductRow {
  name: string;
  sku?: string;
  hsn?: string;
  category?: string;
  unit?: string;
  taxRate: number;
  salePrice: number;
  purchasePrice: number;
  mrp: number;
  openingStock: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface StandardPartyRow {
  name: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  partyType: "customer" | "vendor";
  openingBalance: number;
}

// 1. Software Specific Presets
export const SOFTWARE_PRESETS: Record<string, { label: string; icon: string; itemMap: Record<string, string>; partyMap: Record<string, string> }> = {
  marg: {
    label: "Marg ERP",
    icon: "🟢",
    itemMap: {
      p_name: "name",
      pname: "name",
      item_name: "name",
      batch_no: "batchNumber",
      batch: "batchNumber",
      exp_date: "expiryDate",
      exp_dt: "expiryDate",
      s_rate: "salePrice",
      srate: "salePrice",
      p_rate: "purchasePrice",
      prate: "purchasePrice",
      mrp: "mrp",
      bal_qty: "openingStock",
      balance: "openingStock",
      hsn_code: "hsn",
      hsn: "hsn",
      tax_per: "taxRate"
    },
    partyMap: {
      party_name: "name",
      p_name: "name",
      phone: "phone",
      mobile: "phone",
      gst_no: "gstin",
      address: "address",
      bal: "openingBalance"
    }
  },
  vyapar: {
    label: "Vyapar",
    icon: "🔵",
    itemMap: {
      "item name": "name",
      "item code": "sku",
      "sale price": "salePrice",
      "purchase price": "purchasePrice",
      "mrp": "mrp",
      "opening quantity": "openingStock",
      "current stock": "openingStock",
      "hsn/sac": "hsn",
      "tax rate": "taxRate"
    },
    partyMap: {
      "party name": "name",
      "phone number": "phone",
      "gstin": "gstin",
      "billing address": "address",
      "opening balance": "openingBalance"
    }
  },
  tally: {
    label: "Tally Prime / ERP 9",
    icon: "🟡",
    itemMap: {
      "item name": "name",
      "part no": "sku",
      "standard price": "salePrice",
      "standard cost": "purchasePrice",
      "closing balance": "openingStock",
      "hsn code": "hsn",
      "gst rate": "taxRate"
    },
    partyMap: {
      "ledger name": "name",
      "contact": "phone",
      "gstin/uin": "gstin",
      "address": "address",
      "closing balance": "openingBalance"
    }
  },
  busy: {
    label: "Busy Accounting",
    icon: "🟣",
    itemMap: {
      "item name": "name",
      "item code": "sku",
      "sale price": "salePrice",
      "pur price": "purchasePrice",
      "m.r.p.": "mrp",
      "op qty": "openingStock",
      "hsn": "hsn",
      "tax category": "taxRate"
    },
    partyMap: {
      "account name": "name",
      "mobile": "phone",
      "gstin": "gstin",
      "station": "address",
      "op bal": "openingBalance"
    }
  },
  mybillbook: {
    label: "MyBillBook",
    icon: "🟠",
    itemMap: {
      "item name": "name",
      "item code": "sku",
      "sales price": "salePrice",
      "purchase price": "purchasePrice",
      "current stock": "openingStock",
      "hsn": "hsn",
      "gst %": "taxRate"
    },
    partyMap: {
      "party name": "name",
      "contact number": "phone",
      "gstin": "gstin",
      "address": "address",
      "balance": "openingBalance"
    }
  }
};

// 2. Universal Synonym Dictionary for Fuzzy Auto-Matching
const ITEM_SYNONYMS: Record<keyof StandardProductRow, string[]> = {
  name: ["name", "item", "product", "item_name", "product_name", "dawa", "medicine", "particulars", "description", "p_name", "pname", "विवरण", "सामग्री"],
  sku: ["sku", "code", "item_code", "product_code", "itemcode", "barcode", "part_no", "partno", "कोड"],
  hsn: ["hsn", "hsn_code", "hsncode", "sac", "hsn/sac", "commodity_code", "हसन"],
  category: ["category", "cat", "group", "item_group", "dept", "department", "श्रेणी"],
  unit: ["unit", "uom", "unit_of_measure", "base_unit", "packaging", "pack", "इकाई"],
  taxRate: ["tax", "tax_rate", "tax_per", "tax_percent", "gst", "gst_rate", "gst_%", "tax_%", "टैक्स"],
  salePrice: ["sale_price", "saleprice", "sale_rate", "salerate", "s_rate", "srate", "selling_price", "rate", "price", "mrp", "बिक्री_दर", "दर"],
  purchasePrice: ["purchase_price", "purchaseprice", "purchase_rate", "purchaserate", "p_rate", "prate", "buy_price", "buy_rate", "cost", "cost_price", "खरीद_दर"],
  mrp: ["mrp", "m.r.p", "m.r.p.", "maximum_retail_price", "प्रिंट_रेट"],
  openingStock: ["stock", "opening_stock", "opening_quantity", "current_stock", "qty", "quantity", "bal_qty", "balance", "closing_stock", "स्टॉक", "मात्रा"],
  batchNumber: ["batch", "batch_no", "batchno", "lot", "lot_no", "बैच"],
  expiryDate: ["exp", "expiry", "exp_date", "exp_dt", "expiry_date", "valid_till", "एक्सपायरी"]
};

const PARTY_SYNONYMS: Record<keyof StandardPartyRow, string[]> = {
  name: ["name", "party", "party_name", "customer", "customer_name", "client", "vendor", "supplier", "account", "ledger", "ग्राहक", "पार्टी"],
  phone: ["phone", "mobile", "contact", "phone_number", "mobile_number", "contact_no", "whatsapp", "फोन", "मोबाइल"],
  gstin: ["gstin", "gst", "gst_no", "gst_number", "gstin/uin", "जीएसटी"],
  pan: ["pan", "pan_no", "pan_number", "पैन"],
  address: ["address", "billing_address", "city", "station", "location", "area", "पता"],
  state: ["state", "state_name", "state_code", "राज्य"],
  partyType: ["type", "party_type", "customer_type"],
  openingBalance: ["balance", "opening_balance", "closing_balance", "due", "dues", "outstanding", "bal", "op_bal", "बाकी", "उधारी"]
};

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[\s_\-\.\/\(\)]/g, "").trim();
}

export function autoMapColumns(headers: string[], type: "item" | "party", selectedPreset?: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  const synonyms = type === "item" ? ITEM_SYNONYMS : PARTY_SYNONYMS;

  // 1. If preset chosen, test preset direct match first
  if (selectedPreset && SOFTWARE_PRESETS[selectedPreset]) {
    const presetMap = type === "item" ? SOFTWARE_PRESETS[selectedPreset].itemMap : SOFTWARE_PRESETS[selectedPreset].partyMap;
    for (const h of headers) {
      const normH = h.toLowerCase().trim();
      if (presetMap[normH]) {
        mapping[presetMap[normH]] = h;
      }
    }
  }

  // 2. Universal Synonym Fuzzy Matching for any remaining unmapped keys
  for (const [standardKey, synonymList] of Object.entries(synonyms)) {
    if (mapping[standardKey]) continue; // already mapped

    for (const rawHeader of headers) {
      const normHeader = normalizeString(rawHeader);
      const isMatch = synonymList.some((syn) => {
        const normSyn = normalizeString(syn);
        return normHeader === normSyn || normHeader.includes(normSyn) || normSyn.includes(normHeader);
      });

      if (isMatch) {
        mapping[standardKey] = rawHeader;
        break;
      }
    }
  }

  return mapping;
}

export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, any>[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.replace(/^["']|["']$/g, "").trim());
    const rowObj: Record<string, any> = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      rowObj[rawHeaders[j]] = values[j] !== undefined ? values[j] : "";
    }
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

export function transformToStandardProducts(
  rawRows: Record<string, any>[],
  columnMap: Record<string, string>,
  defaultGstRate: number = 12
): StandardProductRow[] {
  return rawRows
    .map((row) => {
      const name = String(row[columnMap["name"]] || "").trim();
      if (!name) return null;

      const salePrice = parseFloat(String(row[columnMap["salePrice"]] || "0").replace(/[^0-9.]/g, "")) || 0;
      const purchasePrice = parseFloat(String(row[columnMap["purchasePrice"]] || "0").replace(/[^0-9.]/g, "")) || (salePrice * 0.8);
      const mrp = parseFloat(String(row[columnMap["mrp"]] || "0").replace(/[^0-9.]/g, "")) || (salePrice * 1.1);
      const openingStock = parseFloat(String(row[columnMap["openingStock"]] || "0").replace(/[^0-9.]/g, "")) || 0;
      const taxRate = parseFloat(String(row[columnMap["taxRate"]] || "").replace(/[^0-9.]/g, "")) || defaultGstRate;

      return {
        name,
        sku: String(row[columnMap["sku"]] || "").trim() || undefined,
        hsn: String(row[columnMap["hsn"]] || "").trim() || "30049099",
        category: String(row[columnMap["category"]] || "").trim() || "General",
        unit: String(row[columnMap["unit"]] || "").trim() || "PCS",
        taxRate,
        salePrice,
        purchasePrice,
        mrp,
        openingStock,
        batchNumber: String(row[columnMap["batchNumber"]] || "").trim() || undefined,
        expiryDate: String(row[columnMap["expiryDate"]] || "").trim() || undefined
      };
    })
    .filter(Boolean) as StandardProductRow[];
}
