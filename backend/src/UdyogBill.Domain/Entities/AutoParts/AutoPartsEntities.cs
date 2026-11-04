using System;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;

namespace UdyogBill.Domain.Entities.AutoParts;

/// <summary>
/// Global Master database of Vehicle Types, Makes, Models, Variants, and Year spans
/// </summary>
public class VehicleMaster : BaseEntity
{
    public string VehicleType { get; set; } = "4-Wheeler"; // 2-Wheeler, 3-Wheeler, 4-Wheeler, LCV, HCV, Tractor
    public string Make { get; set; } = string.Empty; // Maruti Suzuki, Hyundai, Tata, Mahindra, Hero, Honda, Bajaj, etc.
    public string Model { get; set; } = string.Empty; // Swift, Baleno, Creta, Nexon, Bolero, Splendor, Pulsar, etc.
    public string Variant { get; set; } = string.Empty; // VXi, ZXi, Diesel DDiS, Petrol K-Series, BS4, BS6, etc.
    public string FuelType { get; set; } = "Petrol"; // Petrol, Diesel, CNG, Electric, Hybrid
    public int? YearStart { get; set; } // e.g. 2012
    public int? YearEnd { get; set; } // e.g. 2017 (null if currently active)
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Maps a merchant's inventory item to compatible vehicles
/// </summary>
public class ProductFitment : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid? VehicleMasterId { get; set; }
    public VehicleMaster? VehicleMaster { get; set; }

    // Manual/custom vehicle string if not in global VehicleMaster
    public string CustomVehicleString { get; set; } = string.Empty;

    // Component position: Front-LH, Front-RH, Rear-LH, Rear-RH, Both Sides, Upper, Lower, Universal
    public string PositionSide { get; set; } = "Universal";

    public string? FitmentNotes { get; set; }
}

/// <summary>
/// Cross-reference matrix between OEM Part Numbers and aftermarket OES Brand numbers
/// </summary>
public class PartCrossReference : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string OemPartNumber { get; set; } = string.Empty; // e.g. 16510M68K00 (MGP)
    public string OesBrand { get; set; } = string.Empty; // e.g. Bosch, Purolator, Uno Minda, Lumax, Gabriel
    public string OesPartNumber { get; set; } = string.Empty; // e.g. F002H20398
    public string? InterchangeableNotes { get; set; }
}

/// <summary>
/// Mechanic / Garage directory for referral mapping and commission tracking
/// </summary>
public class MechanicMaster : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. MISTRI-01
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? GarageName { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public decimal DefaultCommissionPercent { get; set; } = 0m;
    public decimal FlatCommissionPerPart { get; set; } = 0m;
    public decimal TotalCommissionEarned { get; set; } = 0m;
    public decimal TotalCommissionPaid { get; set; } = 0m;
    public decimal OutstandingBalance => TotalCommissionEarned - TotalCommissionPaid;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Log of commission earned by a mechanic on an invoice with vehicle registration details
/// </summary>
public class MechanicCommissionLog : BaseTenantAuditableEntity
{
    public Guid MechanicId { get; set; }
    public MechanicMaster Mechanic { get; set; } = null!;

    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string VehicleRegNumber { get; set; } = string.Empty; // e.g. UP 32 AB 1234
    public int? OdometerKm { get; set; }

    public decimal InvoiceTotal { get; set; }
    public decimal CommissionAmount { get; set; }
    public string Status { get; set; } = "Accrued"; // Accrued, Settled, Cancelled
    public DateTimeOffset? SettledAtUtc { get; set; }
    public string? SettlementPaymentMode { get; set; } // Cash, UPI, Bank
    public string? Notes { get; set; }
}

/// <summary>
/// Old part / Dead battery core buyback exchange log
/// </summary>
public class BatteryScrapBuyback : BaseTenantAuditableEntity
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string OldBatteryBrand { get; set; } = string.Empty; // e.g. Exide, Amaron, Local
    public string OldAhCapacity { get; set; } = string.Empty; // e.g. 35Ah, 45Ah, 65Ah, 150Ah
    public decimal ScrapWeightKg { get; set; }
    public decimal ScrapCreditAmount { get; set; } // Deduction on invoice
    public string HsnCode { get; set; } = "8548"; // Scrap batteries HSN
    public string? Remarks { get; set; }
}
