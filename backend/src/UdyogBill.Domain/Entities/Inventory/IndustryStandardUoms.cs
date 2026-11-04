using System;
using System.Collections.Generic;
using UdyogBill.Domain.Enums;

namespace UdyogBill.Domain.Entities.Inventory;

public record StandardUomDefinition(string Code, string Name, string Symbol, int DecimalPlaces);

public static class IndustryStandardUoms
{
    private static readonly Dictionary<string, List<StandardUomDefinition>> Definitions = new(StringComparer.OrdinalIgnoreCase)
    {
        [IndustryTypeCodes.Pharma] = new()
        {
            new("STP", "Strip", "stp", 0),
            new("BOX", "Box", "box", 0),
            new("BTL", "Bottle", "btl", 0),
            new("VIAL", "Vial", "vial", 0),
            new("AMP", "Ampoule", "amp", 0),
            new("TUB", "Tube", "tube", 0),
            new("JAR", "Jar", "jar", 0),
            new("SAC", "Sachet", "sac", 0),
            new("PCS", "Pieces / Unit", "pcs", 0),
            new("PAC", "Pack", "pack", 0)
        },
        [IndustryTypeCodes.Fmcg] = new()
        {
            new("KG", "Kilogram", "kg", 3),
            new("GM", "Gram", "g", 3),
            new("LTR", "Liter", "L", 2),
            new("ML", "Milliliter", "ml", 2),
            new("PKT", "Packet", "pkt", 0),
            new("PCS", "Pieces / Unit", "pcs", 0),
            new("BOX", "Box", "box", 0),
            new("CTN", "Carton", "ctn", 0),
            new("BAG", "Bag", "bag", 0)
        },
        [IndustryTypeCodes.Garments] = new()
        {
            new("PCS", "Piece", "pcs", 0),
            new("PRS", "Pair", "prs", 0),
            new("SET", "Set", "set", 0),
            new("DZN", "Dozen", "dzn", 0),
            new("MTR", "Meter", "m", 2),
            new("ROL", "Roll", "roll", 0)
        },
        [IndustryTypeCodes.Hardware] = new()
        {
            new("PCS", "Piece / Item", "pcs", 0),
            new("LTR", "Litre", "lt", 2),
            new("ML", "Millilitre", "ml", 0),
            new("CAN", "Can / Bucket", "can", 0),
            new("KG", "Kilogram", "kg", 3),
            new("BAG", "Bag (Cement/Putty)", "bag", 0),
            new("MTR", "Meter", "m", 2),
            new("FT", "Feet", "ft", 2),
            new("BOX", "Box", "box", 0),
            new("BDL", "Bundle", "bdl", 0),
            new("SET", "Set", "set", 0),
            new("ROL", "Roll", "roll", 0),
            new("DRM", "Drum", "drum", 0)
        },
        [IndustryTypeCodes.Electronics] = new()
        {
            new("PCS", "Piece", "pcs", 0),
            new("UNT", "Unit", "unit", 0),
            new("BOX", "Box", "box", 0),
            new("SET", "Set", "set", 0)
        },
        [IndustryTypeCodes.SweetsBakery] = new()
        {
            new("KG", "Kilogram", "kg", 3),
            new("GM", "Gram", "g", 3),
            new("PCS", "Pieces / Unit", "pcs", 0),
            new("BOX", "Box", "box", 0),
            new("PKT", "Packet", "pkt", 0),
            new("DZN", "Dozen", "dzn", 0),
            new("SET", "Set / Hamper", "set", 0),
            new("JAR", "Jar", "jar", 0)
        },
        [IndustryTypeCodes.ServiceSector] = new()
        {
            new("HR", "Hour", "hr", 2),
            new("DAY", "Day", "day", 0),
            new("JOB", "Job", "job", 0),
            new("SRV", "Service", "srv", 0),
            new("VST", "Visit", "vst", 0),
            new("MTH", "Month", "mo", 0)
        },
        [IndustryTypeCodes.Jewellery] = new()
        {
            new("GM", "Gram", "g", 3),
            new("MG", "Milligram", "mg", 3),
            new("KG", "Kilogram", "kg", 3),
            new("CRT", "Carat", "ct", 3),
            new("TOL", "Tola", "tola", 3),
            new("PCS", "Pieces", "pcs", 0),
            new("SET", "Set", "set", 0),
            new("PAIR", "Pair", "pr", 0)
        },
                [IndustryTypeCodes.HomeFurnishing] = new()
        {
            new("PCS", "Pieces / Unit (Mattress/Pillow)", "pcs", 0),
            new("SET", "Set (Sofa/Dining/Bed)", "set", 0),
            new("SQFT", "Square Feet (Custom Foam/Curtains)", "sqft", 2),
            new("SQIN", "Square Inches (Precision Cuts)", "sqin", 2),
            new("RFT", "Running Feet (Rods/Borders)", "rft", 2),
            new("MTR", "Meter (Fabric/Linen)", "m", 2),
            new("PAIR", "Pair (Pillows/Cushions)", "pr", 0),
            new("KG", "Kilogram (Loose Foam/Fiber)", "kg", 3),
            new("BOX", "Box (Fittings/Springs)", "box", 0)
        },
        [IndustryTypeCodes.Other] = new()
        {
            new("UNT", "Unit", "unit", 0),
            new("PCS", "Piece", "pcs", 0),
            new("BOX", "Box", "box", 0),
            new("PKT", "Packet", "pkt", 0),
            new("KG", "Kilogram", "kg", 3),
            new("LTR", "Liter", "L", 2)
        }
    };

    public static IReadOnlyList<StandardUomDefinition> GetForIndustry(string? industryCode)
    {
        var normalized = IndustryTypeCodes.Normalize(industryCode);
        if (Definitions.TryGetValue(normalized, out var list))
        {
            return list;
        }

        return Definitions[IndustryTypeCodes.Other];
    }
}
