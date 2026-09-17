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
