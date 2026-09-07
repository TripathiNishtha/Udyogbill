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
  name: [
    "name", "item", "product", "item_name", "product_name", "dawa", "medicine", "particulars", 
    "description", "p_name", "pname", "item_desc", "itemdescription", "productdescription",
    "itemname", "productname", "items", "products", "item_details", "itemdetails",
    "विवरण", "सामग्री", "उत्पाद", "वस्तु"
  ],
  sku: [
    "sku", "code", "item_code", "product_code", "itemcode", "barcode", "part_no", "partno", 
    "item_id", "prod_code", "pcode", "item_no", "itemno", "कोड"
  ],
  hsn: [
    "hsn", "hsn_code", "hsncode", "sac", "hsn/sac", "commodity_code", "hsn_sac", "hsnsac", "हसन"
  ],
  category: [
    "category", "cat", "group", "item_group", "dept", "department", "cat_name", "category_name", 
    "item_type", "group_name", "श्रेणी"
  ],
  unit: [
    "unit", "uom", "unit_of_measure", "base_unit", "packaging", "pack", "packing", "u_o_m", "measure", "इकाई"
  ],
  taxRate: [
    "tax", "tax_rate", "tax_per", "tax_percent", "gst", "gst_rate", "gst_%", "tax_%", "igst", 
    "taxable_rate", "gst_slab", "टैक्स", "जीएसटी"
  ],
  salePrice: [
    "sale_price", "saleprice", "sale_rate", "salerate", "s_rate", "srate", "selling_price", 
    "rate", "price", "mrp", "s_price", "sellingrate", "sales_rate", "salesrate", "retail_rate", 
    "billing_rate", "बिक्री_दर", "दर"
  ],
  purchasePrice: [
    "purchase_price", "purchaseprice", "purchase_rate", "purchaserate", "p_rate", "prate", 
    "buy_price", "buy_rate", "cost", "cost_price", "p_price", "costprice", "buying_price", "खरीद_दर"
  ],
  mrp: [
    "mrp", "m.r.p", "m.r.p.", "maximum_retail_price", "print_rate", "max_retail_price", "प्रिंट_रेट"
  ],
  openingStock: [
    "stock", "opening_stock", "opening_quantity", "current_stock", "qty", "quantity", "bal_qty", 
    "balance", "closing_stock", "cl_qty", "op_qty", "available_qty", "in_stock", "qty_on_hand", 
    "stk", "stk_qty", "स्टॉक", "मात्रा"
  ],
  batchNumber: [
    "batch", "batch_no", "batchno", "lot", "lot_no", "lot_number", "b_no", "batch_num", "बैच"
  ],
  expiryDate: [
    "exp", "expiry", "exp_date", "exp_dt", "expiry_date", "valid_till", "exp_date_time", 
    "expiry_dt", "expdate", "एक्सपायरी"
  ]
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
      const normH = normalizeString(h);
      for (const [pKey, standardTarget] of Object.entries(presetMap)) {
        if (normH === normalizeString(pKey) || normH.includes(normalizeString(pKey))) {
          mapping[standardTarget] = h;
          break;
        }
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

export function extractTableFromSheet(rawRows: any[][]): { headers: string[]; rows: Record<string, any>[] } {
  if (!rawRows || rawRows.length === 0) return { headers: [], rows: [] };

  // Helper to test if a string matches any item column synonym
  const isLikelyColumnHeader = (cellVal: string): boolean => {
    const norm = normalizeString(cellVal);
    if (!norm) return false;
    for (const synList of Object.values(ITEM_SYNONYMS)) {
      if (synList.some((s) => {
        const normS = normalizeString(s);
        return norm === normS || norm.includes(normS) || normS.includes(norm);
      })) {
        return true;
      }
    }
    return false;
  };

  // Find the header row index (the first row containing keywords like name, item, rate, price, mrp, etc.)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    let matchCount = 0;
    let hasNameOrItem = false;

    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const str = String(cell).trim();
      if (!str) continue;

      if (isLikelyColumnHeader(str)) {
        matchCount++;
        const norm = normalizeString(str);
        if (["name", "item", "product", "itemname", "productname", "particulars", "description", "pname", "p_name", "dawa"].some(n => norm.includes(n))) {
          hasNameOrItem = true;
        }
      }
    }

    // A row is considered a header if it contains product/item or 2+ recognized accounting columns
    if (hasNameOrItem || matchCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  // Fallback to row 0 if no clear header was detected
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const rawHeadersRow = rawRows[headerRowIndex] || [];

  // Determine max columns across all rows to prevent column truncation
  let maxCols = rawHeadersRow.length;
  for (let r = 0; r < rawRows.length; r++) {
    if (Array.isArray(rawRows[r]) && rawRows[r].length > maxCols) {
      maxCols = rawRows[r].length;
    }
  }

  const headers: string[] = [];
  for (let j = 0; j < maxCols; j++) {
    const h = String(rawHeadersRow[j] || "").trim();
    headers.push(h || `Column_${j + 1}`);
  }

  const rows: Record<string, any>[] = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const rowData = rawRows[i];
    if (!Array.isArray(rowData) || rowData.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasAnyData = false;

    for (let j = 0; j < headers.length; j++) {
      const val = rowData[j];
      const cleanedVal = val !== undefined && val !== null ? String(val).trim() : "";
      rowObj[headers[j]] = cleanedVal;
      if (cleanedVal) hasAnyData = true;
    }

    if (hasAnyData) {
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, any>[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const rawRows: string[][] = lines.map(line => {
    return line.split(",").map(v => v.replace(/^["']|["']$/g, "").trim());
  });

  return extractTableFromSheet(rawRows);
}

export function transformToStandardProducts(
  rawRows: Record<string, any>[],
  columnMap: Record<string, string>,
  defaultGstRate: number = 12
): StandardProductRow[] {
  return rawRows
    .map((row) => {
      let name = String(row[columnMap["name"]] || "").trim();
      
      // Fallback: If no explicit column mapped or value is empty, inspect row keys for any product name
      if (!name) {
        for (const [k, v] of Object.entries(row)) {
          const normKey = normalizeString(k);
          if (["name", "item", "product", "itemname", "productname", "pname", "p_name", "particulars", "description", "itemdesc", "विवरण", "उत्पाद"].some(sub => normKey.includes(sub))) {
            const candidate = String(v || "").trim();
            if (candidate && isNaN(Number(candidate))) {
              name = candidate;
              break;
            }
          }
        }
      }

      // If still no name, check if any column in the row contains valid text (e.g. Column_1, Column_2)
      if (!name) {
        for (const val of Object.values(row)) {
          const s = String(val || "").trim();
          if (s && s.length >= 2 && isNaN(Number(s)) && !s.startsWith("INV") && !s.startsWith("GST") && !s.includes("@")) {
            name = s;
            break;
          }
        }
      }

      // If STILL no name, take whatever value is in the very first column
      if (!name) {
        const firstVal = Object.values(row)[0];
        if (firstVal !== undefined && firstVal !== null) {
          const s = String(firstVal).trim();
          if (s && s !== "0") name = s;
        }
      }

      if (!name) return null;

      const salePrice = parseFloat(String(row[columnMap["salePrice"]] || "0").replace(/[^0-9.]/g, "")) || 0;
      const purchasePrice = parseFloat(String(row[columnMap["purchasePrice"]] || "0").replace(/[^0-9.]/g, "")) || (salePrice * 0.8);
      const mrp = parseFloat(String(row[columnMap["mrp"]] || "0").replace(/[^0-9.]/g, "")) || (salePrice * 1.1);
      const openingStock = parseFloat(String(row[columnMap["openingStock"]] || "0").replace(/[^0-9.]/g, "")) || 0;
      const rawTax = parseFloat(String(row[columnMap["taxRate"]] || "").replace(/[^0-9.]/g, ""));
      let taxRate = isNaN(rawTax) || rawTax < 0 ? defaultGstRate : rawTax;
      if (taxRate > 100 && taxRate <= 2800) {
        taxRate = taxRate / 100; // Handle basis points e.g. 1800 => 18%
      } else if (taxRate > 100) {
        taxRate = defaultGstRate;
      }

      return {
        name,
        sku: String(row[columnMap["sku"]] || "").trim() || undefined,
        hsn: String(row[columnMap["hsn"]] || "").trim() || "30049099",
        category: String(row[columnMap["category"]] || "").trim() || "General",
        unit: String(row[columnMap["unit"]] || "").trim() || "PCS",
        taxRate,
        salePrice: Math.max(0, salePrice),
        purchasePrice: Math.max(0, purchasePrice),
        mrp: Math.max(0, mrp),
        openingStock: Math.max(0, openingStock),
        batchNumber: String(row[columnMap["batchNumber"]] || "").trim() || undefined,
        expiryDate: String(row[columnMap["expiryDate"]] || "").trim() || undefined
      };
    })
    .filter(Boolean) as StandardProductRow[];
}
