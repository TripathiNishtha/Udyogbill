using System;
using System.Collections.Generic;
using UdyogBill.Domain.Entities.Logistics;

namespace UdyogBill.Application.DTOs;

// --- Transporter DTOs ---
public record TransporterDto(
    Guid Id,
    string TransporterId,
    string LegalName,
    string? TransporterGstin,
    string? ContactPerson,
    string? Mobile,
    string? Email,
    string? DefaultVehicleNumber,
    TransportMode DefaultTransportMode,
    bool IsActive
);

public record CreateTransporterRequest(
    string TransporterId,
    string LegalName,
    string? TransporterGstin = null,
    string? ContactPerson = null,
    string? Mobile = null,
    string? Email = null,
    string? DefaultVehicleNumber = null,
    TransportMode DefaultTransportMode = TransportMode.Road,
    bool IsActive = true
);

// --- Delivery Challan DTOs ---
public record DeliveryChallanItemDto(
    Guid Id,
    Guid? ItemId,
    string ItemCode,
    string ItemName,
    string? HsnCode,
    string? BatchNumber,
    string? SerialNumber,
    decimal Quantity,
    string UnitName,
    int PackageCount,
    decimal UnitWeightKg
);

public record DeliveryChallanDto(
    Guid Id,
    string ChallanNumber,
    DateTime ChallanDate,
    Guid? SalesInvoiceId,
    string? SalesInvoiceNumber,
    Guid CustomerPartyId,
    string CustomerName,
    string? ShippingAddress,
    string? ShippingCity,
    string? ShippingState,
    string? ShippingPincode,
    DispatchStatus DispatchStatus,
    Guid? TransporterId,
    string? TransporterName,
    string? TransporterGstin,
    TransportMode TransportMode,
    string? VehicleNumber,
    VehicleType VehicleType,
    string? DriverName,
    string? DriverMobile,
    string? TransportDocNumber,
    DateTime? TransportDocDate,
    decimal DistanceKm,
    string? EWayBillNumber,
    DateTime? EWayBillDate,
    DateTime? EWayBillValidUntil,
    decimal TotalWeightKg,
    int TotalPackages,
    string? DispatchNotes,
    DateTime? DispatchedAtUtc,
    DateTime? DeliveredAtUtc,
    string? ProofOfDeliveryUrl,
    IReadOnlyList<DeliveryChallanItemDto> Items
);

public record CreateDeliveryChallanRequest(
    DateTime ChallanDate,
    Guid? SalesInvoiceId,
    Guid CustomerPartyId,
    string CustomerName,
    string? ShippingAddress,
    string? ShippingCity,
    string? ShippingState,
    string? ShippingPincode,
    Guid? TransporterId,
    string? TransporterName,
    string? TransporterGstin,
    TransportMode TransportMode = TransportMode.Road,
    string? VehicleNumber = null,
    VehicleType VehicleType = VehicleType.Regular,
    string? DriverName = null,
    string? DriverMobile = null,
    string? TransportDocNumber = null,
    DateTime? TransportDocDate = null,
    decimal DistanceKm = 50,
    decimal TotalWeightKg = 0,
    int TotalPackages = 1,
    string? DispatchNotes = null,
    List<CreateDeliveryChallanItemRequest>? Items = null
);

public record CreateDeliveryChallanItemRequest(
    Guid? ItemId,
    string ItemCode,
    string ItemName,
    string? HsnCode,
    string? BatchNumber,
    string? SerialNumber,
    decimal Quantity,
    string UnitName = "PCS",
    int PackageCount = 1,
    decimal UnitWeightKg = 0
);

public record UpdateDispatchStatusRequest(
    DispatchStatus NewStatus,
    string? Notes = null,
    string? ProofOfDeliveryUrl = null,
    string? RecipientSignature = null
);

// --- E-Way Bill DTOs ---
public record GenerateEWayBillRequest(
    Guid? DeliveryChallanId,
    Guid? SalesInvoiceId,
    string? VehicleNumber = null,
    string? TransporterId = null,
    string? TransporterName = null,
    decimal DistanceKm = 50,
    TransportMode TransportMode = TransportMode.Road
);

public record EWayBillResultDto(
    Guid EWayBillId,
    string EWayBillNumber,
    DateTime GeneratedAtUtc,
    DateTime ValidUntilUtc,
    string DocNo,
    string FromGstin,
    string ToGstin,
    decimal TotalInvoiceValue,
    string Status,
    string NicJsonPayload
);
