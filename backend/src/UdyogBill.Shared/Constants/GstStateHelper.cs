namespace UdyogBill.Shared.Constants;

public static class GstStateHelper
{
    public static readonly IReadOnlyDictionary<string, string> StateMap = new Dictionary<string, string>
    {
        { "01", "Jammu and Kashmir" },
        { "02", "Himachal Pradesh" },
        { "03", "Punjab" },
        { "04", "Chandigarh" },
        { "05", "Uttarakhand" },
        { "06", "Haryana" },
        { "07", "Delhi" },
        { "08", "Rajasthan" },
        { "09", "Uttar Pradesh" },
        { "10", "Bihar" },
        { "11", "Sikkim" },
        { "12", "Arunachal Pradesh" },
        { "13", "Nagaland" },
        { "14", "Manipur" },
        { "15", "Mizoram" },
        { "16", "Tripura" },
        { "17", "Meghalaya" },
        { "18", "Assam" },
        { "19", "West Bengal" },
        { "20", "Jharkhand" },
        { "21", "Odisha" },
        { "22", "Chhattisgarh" },
        { "23", "Madhya Pradesh" },
        { "24", "Gujarat" },
        { "26", "Dadra and Nagar Haveli and Daman and Diu" },
        { "27", "Maharashtra" },
        { "29", "Karnataka" },
        { "30", "Goa" },
        { "31", "Lakshadweep" },
        { "32", "Kerala" },
        { "33", "Tamil Nadu" },
        { "34", "Puducherry" },
        { "35", "Andaman and Nicobar Islands" },
        { "36", "Telangana" },
        { "37", "Andhra Pradesh" },
        { "38", "Ladakh" },
        { "97", "Other Territory" }
    };

    public static string? ExtractStateCodeFromGstin(string? gstin)
    {
        if (string.IsNullOrWhiteSpace(gstin)) return null;
        var clean = gstin.Trim().ToUpperInvariant();
        if (clean.Length >= 2 && char.IsDigit(clean[0]) && char.IsDigit(clean[1]))
        {
            return clean.Substring(0, 2);
        }
        return null;
    }

    public static string? GetStateNameByCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var clean = code.Trim().PadLeft(2, '0');
        return StateMap.TryGetValue(clean, out var name) ? name : null;
    }

    public static string? GetStateCodeByName(string? stateName)
    {
        if (string.IsNullOrWhiteSpace(stateName)) return null;
        var clean = stateName.Trim();
        foreach (var kvp in StateMap)
        {
            if (kvp.Value.Equals(clean, StringComparison.OrdinalIgnoreCase))
                return kvp.Key;
        }
        // Common abbreviations
        if (clean.Equals("UP", StringComparison.OrdinalIgnoreCase)) return "09";
        if (clean.Equals("MP", StringComparison.OrdinalIgnoreCase)) return "23";
        if (clean.Equals("MH", StringComparison.OrdinalIgnoreCase)) return "27";
        if (clean.Equals("DL", StringComparison.OrdinalIgnoreCase)) return "07";
        if (clean.Equals("HR", StringComparison.OrdinalIgnoreCase)) return "06";
        if (clean.Equals("RJ", StringComparison.OrdinalIgnoreCase)) return "08";
        if (clean.Equals("BR", StringComparison.OrdinalIgnoreCase)) return "10";
        if (clean.Equals("WB", StringComparison.OrdinalIgnoreCase)) return "19";
        if (clean.Equals("GJ", StringComparison.OrdinalIgnoreCase)) return "24";
        if (clean.Equals("KA", StringComparison.OrdinalIgnoreCase)) return "29";
        if (clean.Equals("TN", StringComparison.OrdinalIgnoreCase)) return "33";
        if (clean.Equals("TS", StringComparison.OrdinalIgnoreCase) || clean.Equals("TG", StringComparison.OrdinalIgnoreCase)) return "36";
        if (clean.Equals("AP", StringComparison.OrdinalIgnoreCase)) return "37";
        if (clean.Equals("KL", StringComparison.OrdinalIgnoreCase)) return "32";
        if (clean.Equals("PB", StringComparison.OrdinalIgnoreCase)) return "03";
        if (clean.Equals("UK", StringComparison.OrdinalIgnoreCase) || clean.Equals("UA", StringComparison.OrdinalIgnoreCase)) return "05";
        if (clean.Equals("HP", StringComparison.OrdinalIgnoreCase)) return "02";
        if (clean.Equals("JK", StringComparison.OrdinalIgnoreCase)) return "01";
        if (clean.Equals("JH", StringComparison.OrdinalIgnoreCase)) return "20";
        if (clean.Equals("CG", StringComparison.OrdinalIgnoreCase) || clean.Equals("CH", StringComparison.OrdinalIgnoreCase)) return "22";
        if (clean.Equals("OR", StringComparison.OrdinalIgnoreCase) || clean.Equals("OD", StringComparison.OrdinalIgnoreCase)) return "21";
        if (clean.Equals("GA", StringComparison.OrdinalIgnoreCase)) return "30";
        return null;
    }

    public static string NormalizeStateCode(string? stateCodeOrName, string? gstin = null, string fallback = "09")
    {
        // 1. Highest authority: First 2 digits of GSTIN if valid
        var fromGstin = ExtractStateCodeFromGstin(gstin);
        if (!string.IsNullOrWhiteSpace(fromGstin))
        {
            return fromGstin;
        }

        if (string.IsNullOrWhiteSpace(stateCodeOrName))
        {
            return fallback;
        }

        var clean = stateCodeOrName.Trim();

        // 2. Check if it's already a 1 or 2 digit number
        if (clean.Length <= 2 && int.TryParse(clean, out var num) && num >= 1 && num <= 99)
        {
            return num.ToString("D2");
        }

        // 3. Check if clean matches a state name or abbreviation
        var codeFromName = GetStateCodeByName(clean);
        if (!string.IsNullOrWhiteSpace(codeFromName))
        {
            return codeFromName;
        }

        return fallback;
    }

    public static string ResolvePlaceOfSupply(string? customerGstin, string? explicitPos, string? billingStateCode, string? sellerGstin, string? sellerState, string? sellerStateCode)
    {
        var custCode = ExtractStateCodeFromGstin(customerGstin);
        if (!string.IsNullOrEmpty(custCode) && StateMap.TryGetValue(custCode, out var custStateName))
        {
            return custStateName;
        }

        if (!string.IsNullOrWhiteSpace(explicitPos) && 
            !explicitPos.Equals("Maharashtra", StringComparison.OrdinalIgnoreCase) && 
            !explicitPos.Equals("Intra-State", StringComparison.OrdinalIgnoreCase) && 
            !explicitPos.Equals("Inter-State", StringComparison.OrdinalIgnoreCase) && 
            !explicitPos.Equals("Default", StringComparison.OrdinalIgnoreCase) && 
            !explicitPos.Equals("Local", StringComparison.OrdinalIgnoreCase))
        {
            if (explicitPos.Length == 2 && StateMap.TryGetValue(explicitPos, out var nameFromExplicit))
            {
                return nameFromExplicit;
            }
            return explicitPos;
        }

        if (!string.IsNullOrWhiteSpace(billingStateCode) && billingStateCode != "27")
        {
            var code = billingStateCode.Trim().PadLeft(2, '0');
            if (StateMap.TryGetValue(code, out var nameFromBillingCode))
            {
                return nameFromBillingCode;
            }
        }

        var sellerCode = ExtractStateCodeFromGstin(sellerGstin) ?? sellerStateCode;
        if (!string.IsNullOrWhiteSpace(sellerCode) && StateMap.TryGetValue(sellerCode.Trim().PadLeft(2, '0'), out var nameFromSellerCode))
        {
            return nameFromSellerCode;
        }

        if (!string.IsNullOrWhiteSpace(sellerState))
        {
            return sellerState;
        }

        return "N/A";
    }
}
