export const GST_STATE_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory"
};

/**
 * Extracts 2-digit state code from GSTIN
 */
export function extractStateCodeFromGstin(gstin?: string | null): string | null {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2 && /^\d{2}/.test(clean)) {
    return clean.slice(0, 2);
  }
  return null;
}

/**
 * Returns state name for a given 2-digit code
 */
export function getStateNameByCode(code?: string | null): string | null {
  if (!code) return null;
  const clean = code.trim().padStart(2, "0");
  return GST_STATE_MAP[clean] || null;
}

/**
 * Formats Place of Supply:
 * Returns the state name if valid GSTIN is present (derived from first 2 digits).
 * If no GSTIN is provided, returns "N/A" (or fallback if specified).
 */
export function formatPlaceOfSupply(params: {
  customerGstin?: string | null;
  explicitPlaceOfSupply?: string | null;
  billingStateCode?: string | null;
  sellerGstin?: string | null;
  sellerState?: string | null;
  fallbackToSeller?: boolean;
}): string {
  // 1. If buyer has GSTIN, first 2 digits define Place of Supply
  const custCode = extractStateCodeFromGstin(params.customerGstin);
  if (custCode && GST_STATE_MAP[custCode]) {
    return GST_STATE_MAP[custCode];
  }

  // 2. If explicit POS was passed and is not dummy "Maharashtra" or "Intra-State"
  if (
    params.explicitPlaceOfSupply &&
    !["maharashtra", "intra-state", "inter-state", "default", "local"].includes(
      params.explicitPlaceOfSupply.trim().toLowerCase()
    )
  ) {
    if (params.explicitPlaceOfSupply.length === 2 && GST_STATE_MAP[params.explicitPlaceOfSupply]) {
      return GST_STATE_MAP[params.explicitPlaceOfSupply];
    }
    return params.explicitPlaceOfSupply;
  }

  // 3. Billing state code if provided and not dummy
  if (params.billingStateCode && params.billingStateCode !== "27") {
    const code = params.billingStateCode.trim().padStart(2, "0");
    if (GST_STATE_MAP[code]) {
      return GST_STATE_MAP[code];
    }
  }

  // 4. If fallbackToSeller is enabled and seller has state
  if (params.fallbackToSeller) {
    const sellerCode = extractStateCodeFromGstin(params.sellerGstin);
    if (sellerCode && GST_STATE_MAP[sellerCode]) {
      return GST_STATE_MAP[sellerCode];
    }
    if (params.sellerState) {
      return params.sellerState;
    }
  }

  // If no GSTIN was provided or state cannot be determined, return N/A
  return "N/A";
}
