using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record VehicleMasterDto(
    Guid Id,
    string VehicleType,
    string Make,
    string Model,
    string Variant,
    string FuelType,
    int? YearStart,
    int? YearEnd
);

public record SaveProductFitmentRequest(
    Guid ItemId,
    Guid? VehicleMasterId,
    string CustomVehicleString,
    string PositionSide, // Front-LH, Front-RH, Rear-LH, Rear-RH, Both Sides, Universal
    string? FitmentNotes
);

public record ProductFitmentDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    Guid? VehicleMasterId,
    string VehicleDisplayText,
    string PositionSide,
    string? FitmentNotes
);

public record SaveCrossReferenceRequest(
    Guid ItemId,
    string OemPartNumber,
    string OesBrand,
    string OesPartNumber,
    string? InterchangeableNotes
);

public record PartCrossReferenceDto(
    Guid Id,
    Guid ItemId,
    string ItemName,
    string ItemSku,
    decimal SalePrice,
    decimal CurrentStock,
    string? RackBinLocation,
    string OemPartNumber,
    string OesBrand,
    string OesPartNumber,
    string? InterchangeableNotes
);

public record MechanicMasterDto(
    Guid Id,
    string Code,
    string Name,
    string Mobile,
    string? GarageName,
    string? Address,
    string? City,
    decimal DefaultCommissionPercent,
    decimal FlatCommissionPerPart,
    decimal TotalCommissionEarned,
    decimal TotalCommissionPaid,
    decimal OutstandingBalance,
    bool IsActive
);

public record SaveMechanicRequest(
    Guid? Id,
    string Name,
    string Mobile,
    string? GarageName,
    string? Address,
    string? City,
    decimal DefaultCommissionPercent,
    decimal FlatCommissionPerPart
);

public record MechanicCommissionPayoutRequest(
    Guid MechanicId,
    decimal Amount,
    string PaymentMode, // Cash, UPI, BankTransfer
    string? Notes
);

public record LogMechanicCommissionRequest(
    Guid MechanicId,
    Guid InvoiceId,
    string InvoiceNumber,
    string VehicleRegNumber,
    int? OdometerKm,
    decimal InvoiceTotal,
    decimal CommissionAmount,
    string? Notes
);

public record BatteryScrapBuybackRequest(
    Guid InvoiceId,
    string InvoiceNumber,
    string OldBatteryBrand,
    string OldAhCapacity,
    decimal ScrapWeightKg,
    decimal ScrapCreditAmount,
    string? Remarks
);

public record BatteryScrapBuybackDto(
    Guid Id,
    Guid InvoiceId,
    string InvoiceNumber,
    string OldBatteryBrand,
    string OldAhCapacity,
    decimal ScrapWeightKg,
    decimal ScrapCreditAmount,
    string HsnCode,
    string? Remarks,
    DateTimeOffset CreatedAtUtc
);

public record MechanicCommissionLogDto(
    Guid Id,
    Guid MechanicId,
    string MechanicName,
    string MechanicMobile,
    Guid InvoiceId,
    string InvoiceNumber,
    string VehicleRegNumber,
    int? OdometerKm,
    decimal InvoiceTotal,
    decimal CommissionAmount,
    string Status,
    DateTimeOffset? SettledAtUtc,
    string? SettlementPaymentMode,
    string? Notes,
    DateTimeOffset CreatedAtUtc
);
