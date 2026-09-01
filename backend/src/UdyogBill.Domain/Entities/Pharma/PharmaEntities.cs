using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;

namespace UdyogBill.Domain.Entities.Pharma;

/// <summary>
/// Master repository of chemical salt / generic formulations
/// </summary>
public class SaltMaster : BaseTenantAuditableEntity
{
    public string SaltName { get; set; } = string.Empty; // e.g. "Paracetamol", "Amoxicillin + Clavulanic Acid"
    public string TherapeuticCategory { get; set; } = string.Empty; // e.g. "Analgesic & Antipyretic", "Antibiotic"
    public string? Description { get; set; }
    public string? SideEffectsAlert { get; set; }
    public bool IsHabitForming { get; set; }
}

/// <summary>
/// Mapping of medicine brand to its constituent active pharmaceutical ingredients (APIs)
/// </summary>
public class ItemSaltComposition : BaseTenantAuditableEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid SaltId { get; set; }
    public SaltMaster Salt { get; set; } = null!;

    public string Strength { get; set; } = string.Empty; // e.g. "650 mg", "500mg + 125mg"
}

/// <summary>
/// Medical doctor and prescription referral directory
/// </summary>
public class DoctorPrescriber : BaseTenantAuditableEntity
{
    public string Code { get; set; } = string.Empty; // e.g. DOC-101
    public string Name { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty; // MBBS, MD, MS, BAMS
    public string Specialization { get; set; } = string.Empty; // Cardiologist, General Physician
    public string RegistrationNumber { get; set; } = string.Empty; // State Medical Council Registration
    public string ClinicHospitalName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }
    public decimal IncentivePercent { get; set; }
    public string? AssignedMrName { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Statutory CDSCO Schedule H & H1 Drug Audit Register Entry
/// </summary>
public class ScheduleH1RegisterEntry : BaseTenantAuditableEntity
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime SupplyDate { get; set; }
    
    // Patient Details
    public string PatientName { get; set; } = string.Empty;
    public string PatientAddressPhone { get; set; } = string.Empty;
    
    // Prescriber Details
    public string PrescriberDoctorName { get; set; } = string.Empty;
    public string PrescriberRegNumber { get; set; } = string.Empty;

    // Drug & Batch Details
    public string DrugName { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public decimal QuantitySupplied { get; set; }
    public string ManufacturerName { get; set; } = string.Empty;
    public string SignOffStatus { get; set; } = "Verified"; // Verified by Registered Pharmacist
}

/// <summary>
/// Near-expiry, damaged, or unsold stock return claim document sent to Wholesaler / C&F
/// </summary>
public class ExpiryReturnClaim : BaseTenantAuditableEntity
{
    public string ClaimNumber { get; set; } = string.Empty; // e.g. CLM-EXP-2026-001
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public DateTime ClaimDate { get; set; }
    public decimal TotalClaimAmount { get; set; }
    public string Status { get; set; } = "Submitted"; // Draft, Submitted, Acknowledged, Reconciled
    public string? SupplierCreditNoteNumber { get; set; }
    public string? Notes { get; set; }

    public ICollection<ExpiryReturnClaimItem> Items { get; set; } = new List<ExpiryReturnClaimItem>();
}

/// <summary>
/// Individual batch item included in an Expiry Return Claim
/// </summary>
public class ExpiryReturnClaimItem : BaseTenantAuditableEntity
{
    public Guid ExpiryReturnClaimId { get; set; }
    public ExpiryReturnClaim ExpiryReturnClaim { get; set; } = null!;

    public Guid? ItemBatchId { get; set; }
    public ItemBatch? ItemBatch { get; set; }

    public string ItemName { get; set; } = string.Empty;
    public string BatchNumber { get; set; } = string.Empty;
    public string ExpiryDateMonthYear { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal PurchaseRate { get; set; }
    public decimal ClaimAmount { get; set; }
    public string Reason { get; set; } = "Expired"; // Expired, NearExpiry, Breakage, Dumping
}
