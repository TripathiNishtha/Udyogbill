using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Domain.Entities.Logistics;

public enum TransportMode
{
    Road = 1,
    Rail = 2,
    Air = 3,
    Ship = 4
}

public enum VehicleType
{
    Regular = 1,
    OverDimensionalCargo = 2
}

public enum DispatchStatus
{
    PendingDispatch = 1,
    Dispatched = 2,
    InTransit = 3,
    OutForDelivery = 4,
    Delivered = 5,
    Cancelled = 6
}

public class Transporter : BaseTenantAuditableEntity
{
    public string TransporterId { get; set; } = string.Empty; // e.g. "TRP-001" or Transporter GSTIN
    public string LegalName { get; set; } = string.Empty;
    public string? TransporterGstin { get; set; } // 15-char GSTIN

    public string? ContactPerson { get; set; }
    public string? Mobile { get; set; }
    public string? Email { get; set; }

    public string? DefaultVehicleNumber { get; set; } // e.g. "MH-02-CD-1234"
    public TransportMode DefaultTransportMode { get; set; } = TransportMode.Road;

    public bool IsActive { get; set; } = true;
}

public class DeliveryChallan : BaseTenantAuditableEntity
{
    public string ChallanNumber { get; set; } = string.Empty; // e.g. "DC-2026-0001"
    public DateTime ChallanDate { get; set; } = DateTime.UtcNow;

    public Guid? SalesInvoiceId { get; set; }
    public SalesInvoice? SalesInvoice { get; set; }

    public Guid CustomerPartyId { get; set; }
    public Party CustomerParty { get; set; } = null!;

    public string CustomerName { get; set; } = string.Empty;
    public string? ShippingAddress { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingState { get; set; }
    public string? ShippingPincode { get; set; }

    public DispatchStatus DispatchStatus { get; set; } = DispatchStatus.PendingDispatch;

    // Transporter & Vehicle Details
    public Guid? TransporterId { get; set; }
    public Transporter? Transporter { get; set; }
    public string? TransporterName { get; set; }
    public string? TransporterGstin { get; set; }

    public TransportMode TransportMode { get; set; } = TransportMode.Road;
    public string? VehicleNumber { get; set; } // e.g. "MH-04-AB-5678"
    public VehicleType VehicleType { get; set; } = VehicleType.Regular;

    public string? DriverName { get; set; }
    public string? DriverMobile { get; set; }

    public string? TransportDocNumber { get; set; } // LR / GR / Bilty Number
    public DateTime? TransportDocDate { get; set; }

    public decimal DistanceKm { get; set; } = 50m;

    // GST E-Way Bill Details
    public string? EWayBillNumber { get; set; } // 12-digit E-Way Bill No
    public DateTime? EWayBillDate { get; set; }
    public DateTime? EWayBillValidUntil { get; set; }
    public string? EWayBillJsonPayload { get; set; }

    public decimal TotalWeightKg { get; set; } = 0m;
    public int TotalPackages { get; set; } = 1;
    public string? DispatchNotes { get; set; }

    public DateTime? DispatchedAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }
    public string? ProofOfDeliveryUrl { get; set; }
    public string? RecipientSignature { get; set; }

    public ICollection<DeliveryChallanItem> Items { get; set; } = new List<DeliveryChallanItem>();
}

public class DeliveryChallanItem : BaseTenantAuditableEntity
{
    public Guid DeliveryChallanId { get; set; }
    public DeliveryChallan DeliveryChallan { get; set; } = null!;

    public Guid? ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }

    public string? BatchNumber { get; set; }
    public string? SerialNumber { get; set; }

    public decimal Quantity { get; set; } = 1m;
    public string UnitName { get; set; } = "PCS";

    public int PackageCount { get; set; } = 1;
    public decimal UnitWeightKg { get; set; } = 0m;
}

public class EWayBillDetails : BaseTenantAuditableEntity
{
    public string EWayBillNumber { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ValidUntilUtc { get; set; } = DateTime.UtcNow.AddDays(1);

    public string DocType { get; set; } = "INV";
    public string DocNo { get; set; } = string.Empty;
    public DateTime DocDate { get; set; }

    public string FromGstin { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string ToGstin { get; set; } = string.Empty;
    public string ToAddress { get; set; } = string.Empty;

    public decimal TotalInvoiceValue { get; set; }
    public string? MainHsnCode { get; set; }

    public string? TransporterId { get; set; }
    public string? TransporterName { get; set; }
    public string? VehicleNumber { get; set; }
    public decimal DistanceKm { get; set; }

    public string Status { get; set; } = "ACT"; // ACT (Active), CAN (Cancelled)
    public string? NicJsonPayload { get; set; }
}
