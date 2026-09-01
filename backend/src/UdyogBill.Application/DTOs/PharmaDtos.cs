namespace UdyogBill.Application.DTOs;

// --- Batch Management DTOs ---
public record PharmaBatchDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string Sku,
    string BatchNumber,
    string ExpiryDateMonthYear,
    DateTime ExpiryDateUtc,
    DateTime? ManufacturingDateUtc,
    decimal Mrp,
    decimal PurchaseRate,
    decimal SaleRate,
    decimal Ptr,
    decimal Pts,
    decimal CurrentStock,
    decimal QuarantinedStock,
    string? RackLocation,
    string? Barcode,
    bool IsExpired,
    bool IsNearExpiry,
    int DaysToExpiry,
    bool IsQuarantined
);

public record SavePharmaBatchRequest(
    Guid? Id,
    Guid ItemId,
    string BatchNumber,
    string ExpiryDateMonthYear,
    DateTime? ManufacturingDateUtc,
    decimal Mrp,
    decimal PurchaseRate,
    decimal SaleRate,
    decimal Ptr,
    decimal Pts,
    decimal OpeningStock,
    string? RackLocation,
    string? Barcode
);

// --- Generic Salt & Substitute Search DTOs ---
public record SaltMasterDto(
    Guid Id,
    string SaltName,
    string TherapeuticCategory,
    string? Description,
    string? SideEffectsAlert,
    bool IsHabitForming
);

public record SaveSaltMasterRequest(
    Guid? Id,
    string SaltName,
    string TherapeuticCategory,
    string? Description,
    string? SideEffectsAlert,
    bool IsHabitForming
);

public record ItemSubstituteDto(
    Guid ItemId,
    string ItemName,
    string Sku,
    string Manufacturer,
    string SaltComposition,
    decimal Mrp,
    decimal SaleRate,
    decimal InStockQuantity,
    string EarliestExpiryBatch,
    string EarliestExpiryDate,
    decimal MarginPercent,
    string StorageCondition
);

public record LinkItemSaltRequest(
    Guid ItemId,
    Guid SaltId,
    string Strength
);

// --- Schedule H1 & Statutory Register DTOs ---
public record ScheduleH1RegisterDto(
    Guid Id,
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime SupplyDate,
    string PatientName,
    string PatientAddressPhone,
    string PrescriberDoctorName,
    string PrescriberRegNumber,
    string DrugName,
    string BatchNumber,
    decimal QuantitySupplied,
    string ManufacturerName,
    string SignOffStatus
);

public record RecordScheduleH1EntryRequest(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime SupplyDate,
    string PatientName,
    string PatientAddressPhone,
    string PrescriberDoctorName,
    string PrescriberRegNumber,
    string DrugName,
    string BatchNumber,
    decimal QuantitySupplied,
    string ManufacturerName
);

// --- Expiry Radar & Return Claim DTOs ---
public record ExpiryRadarItemDto(
    Guid BatchId,
    Guid ItemId,
    string ItemName,
    string Sku,
    string BatchNumber,
    string ExpiryDateMonthYear,
    int DaysToExpiry,
    decimal CurrentStock,
    decimal PurchaseRate,
    decimal Mrp,
    decimal TotalLossValue,
    Guid? SupplierId,
    string? SupplierName,
    string ExpiryStatus // Expired, Critical30Days, Warning90Days, Safe
);

public record ExpiryReturnClaimDto(
    Guid Id,
    string ClaimNumber,
    Guid SupplierId,
    string SupplierName,
    DateTime ClaimDate,
    decimal TotalClaimAmount,
    string Status,
    string? SupplierCreditNoteNumber,
    string? Notes,
    IReadOnlyList<ExpiryReturnClaimItemDto> Items
);

public record ExpiryReturnClaimItemDto(
    Guid Id,
    Guid? ItemBatchId,
    string ItemName,
    string BatchNumber,
    string ExpiryDateMonthYear,
    decimal Quantity,
    decimal PurchaseRate,
    decimal ClaimAmount,
    string Reason
);

public record CreateExpiryReturnClaimRequest(
    Guid SupplierId,
    string SupplierName,
    string? Notes,
    IReadOnlyList<CreateExpiryClaimItemRequest> Items
);

public record CreateExpiryClaimItemRequest(
    Guid? ItemBatchId,
    string ItemName,
    string BatchNumber,
    string ExpiryDateMonthYear,
    decimal Quantity,
    decimal PurchaseRate,
    string Reason
);

// --- Doctor Prescriber DTOs ---
public record DoctorPrescriberDto(
    Guid Id,
    string Code,
    string Name,
    string Qualification,
    string Specialization,
    string RegistrationNumber,
    string ClinicHospitalName,
    string Address,
    string City,
    string Mobile,
    string? Email,
    decimal IncentivePercent,
    string? AssignedMrName,
    bool IsActive
);

public record SaveDoctorPrescriberRequest(
    Guid? Id,
    string Code,
    string Name,
    string Qualification,
    string Specialization,
    string RegistrationNumber,
    string ClinicHospitalName,
    string Address,
    string City,
    string Mobile,
    string? Email,
    decimal IncentivePercent,
    string? AssignedMrName,
    bool IsActive
);

// --- Patient Repeat Prescription Lookup DTO ---
public record PatientPrescriptionHistoryDto(
    string PatientName,
    string PatientMobile,
    DateTime LastVisitDate,
    string LastDoctorName,
    string LastDoctorRegNumber,
    IReadOnlyList<PatientHistoryItemDto> PrescribedItems
);

public record PatientHistoryItemDto(
    Guid ItemId,
    string ItemName,
    string Sku,
    decimal Quantity,
    string? RecommendedDosage
);
