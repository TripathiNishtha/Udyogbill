using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Domain.Entities.Sales;

public enum InvoiceType
{
    TaxInvoice = 1,        // Standard GST Tax Invoice (B2B / B2C)
    POSBill = 2,           // Fast Counter Retail Receipt
    ProformaInvoice = 3,   // Proforma Quote
    SalesEstimate = 4,     // Quotation / Estimate
    CreditNote = 5,        // Sales Return / Credit Note
    DebitNote = 6          // Debit Note
}

public enum InvoiceStatus
{
    Draft = 1,
    Issued = 2,
    Paid = 3,
    PartiallyPaid = 4,
    Overdue = 5,
    Cancelled = 6
}

public enum PaymentMode
{
    Cash = 1,
    UPI = 2,
    Card = 3,
    BankTransfer = 4,
    Cheque = 5,
    CreditAccount = 6,     // Put on Customer Ledger Credit
    Split = 7
}

public enum PaymentStatus
{
    Unpaid = 1,
    PartiallyPaid = 2,
    FullyPaid = 3
}

public enum TaxSupplyType
{
    IntraState = 1, // CGST + SGST
    InterState = 2  // IGST
}

public class SalesInvoice : BaseTenantAuditableEntity
{
    public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV-2627-00001" or "POS-2627-00001"
    public InvoiceType InvoiceType { get; set; } = InvoiceType.TaxInvoice;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Issued;

    // Location & Fulfillment
    public Guid BranchId { get; set; }
    public TenantBranch Branch { get; set; } = null!;

    public Guid WarehouseId { get; set; }
    public TenantWarehouse Warehouse { get; set; } = null!;

    // Customer / Party Details
    public Guid? PartyId { get; set; }
    public Party? Party { get; set; }

    public string CustomerName { get; set; } = "Walk-in Customer";
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerGSTIN { get; set; }
    public string? CustomerPAN { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public string BillingStateCode { get; set; } = "27"; // Default State
    public string ShippingStateCode { get; set; } = "27";
    public string PlaceOfSupply { get; set; } = "Maharashtra";

    // Dates
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }

    // Tax Resolution
    public TaxSupplyType TaxSupplyType { get; set; } = TaxSupplyType.IntraState;

    // Financial Totals
    public decimal SubTotal { get; set; } = 0m;              // Sum of Line Gross (Qty * Rate)
    public decimal ItemDiscountTotal { get; set; } = 0m;      // Sum of Line Discounts
    public decimal InvoiceDiscountPercent { get; set; } = 0m;
    public decimal InvoiceDiscountAmount { get; set; } = 0m;
    public decimal TaxableAmount { get; set; } = 0m;          // Total before taxes

    // GST Breakdown
    public decimal CgstAmount { get; set; } = 0m;
    public decimal SgstAmount { get; set; } = 0m;
    public decimal IgstAmount { get; set; } = 0m;
    public decimal CessAmount { get; set; } = 0m;

    public decimal RoundOff { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;            // Net Payable
    public decimal PaidAmount { get; set; } = 0m;
    public decimal BalanceAmount { get; set; } = 0m;

    // Payment Tracking
    public PaymentMode PrimaryPaymentMode { get; set; } = PaymentMode.Cash;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.FullyPaid;
    public string? PaymentReferenceNumber { get; set; }

    // Notes & Terms
    public string? Notes { get; set; }
    public string? TermsAndConditions { get; set; }

    // Salesman & Industry Doctor / Return Tracking
    public Guid? SalesmanUserId { get; set; }
    public string? DoctorName { get; set; }
    public string? DoctorRegistrationNumber { get; set; }
    public Guid? OriginalInvoiceId { get; set; }

    // B2B Logistics & Transport Details
    public string? TransporterName { get; set; }
    public string? TransporterId { get; set; } // Transporter GSTIN
    public string? VehicleNumber { get; set; }
    public string? LrNumber { get; set; } // Lorry Receipt / Bilty No
    public DateTime? LrDate { get; set; }
    public string? EWayBillNumber { get; set; }
    public DateTime? EWayBillDate { get; set; }
    public string? PoNumber { get; set; } // Buyer Purchase Order Reference
    public DateTime? PoDate { get; set; }
    public bool IsReverseCharge { get; set; } = false;

    // Industry Dynamic Attributes (e.g. Doctor Name, Prescription, Table No, Vehicle No)
    public string AttributesJson { get; set; } = "{}";

    public bool IsCancelled { get; set; } = false;
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAtUtc { get; set; }

    // Navigation
    public ICollection<SalesInvoiceItem> Items { get; set; } = new List<SalesInvoiceItem>();
    public ICollection<SalesInvoicePayment> Payments { get; set; } = new List<SalesInvoicePayment>();
}

public class SalesInvoiceItem : BaseTenantAuditableEntity
{
    public Guid InvoiceId { get; set; }
    public SalesInvoice Invoice { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public string ItemSku { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string? HsnCode { get; set; }
    public string? Barcode { get; set; }

    // Batch & Expiry
    public Guid? BatchId { get; set; }
    public ItemBatch? Batch { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }

    // Quantity & UOM
    public decimal Quantity { get; set; } = 1m;
    public Guid UomId { get; set; }
    public UnitOfMeasure Uom { get; set; } = null!;
    public string UomCode { get; set; } = string.Empty;

    // Pricing
    public decimal UnitPrice { get; set; } = 0m;       // Selling price per unit
    public decimal Mrp { get; set; } = 0m;
    public decimal PurchasePrice { get; set; } = 0m;   // Cost for margin calculation

    // Line Discount
    public decimal DiscountPercent { get; set; } = 0m;
    public decimal DiscountAmount { get; set; } = 0m;

    public decimal TaxableAmount { get; set; } = 0m;   // (Qty * UnitPrice) - Discount

    // Line GST Breakdown
    public decimal GstRate { get; set; } = 0m;         // e.g. 18.00%
    public decimal CgstRate { get; set; } = 0m;        // e.g. 9.00%
    public decimal CgstAmount { get; set; } = 0m;
    public decimal SgstRate { get; set; } = 0m;        // e.g. 9.00%
    public decimal SgstAmount { get; set; } = 0m;
    public decimal IgstRate { get; set; } = 0m;        // e.g. 18.00%
    public decimal IgstAmount { get; set; } = 0m;
    public decimal CessRate { get; set; } = 0m;
    public decimal CessAmount { get; set; } = 0m;

    public decimal TotalAmount { get; set; } = 0m;     // Taxable + CGST + SGST + IGST + Cess

    public string AttributesJson { get; set; } = "{}";
}

public class SalesInvoicePayment : BaseTenantAuditableEntity
{
    public Guid InvoiceId { get; set; }
    public SalesInvoice Invoice { get; set; } = null!;

    public DateTime PaymentDate { get; set; }
    public decimal Amount { get; set; } = 0m;
    public PaymentMode PaymentMode { get; set; } = PaymentMode.Cash;
    public string? TransactionReference { get; set; } // e.g. UPI Ref, Card Auth Code, Cheque No
    public string? Notes { get; set; }
}

public class SalesReturn : BaseTenantAuditableEntity
{
    public string CreditNoteNumber { get; set; } = string.Empty;
    public DateTimeOffset ReturnDate { get; set; } = DateTimeOffset.UtcNow;
    public Guid? OriginalSalesInvoiceId { get; set; }
    public SalesInvoice? OriginalSalesInvoice { get; set; }
    public string? OriginalInvoiceNumber { get; set; }
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;
    public string CustomerName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Guid WarehouseId { get; set; }
    public string ReturnReason { get; set; } = "CustomerReturn";
    public bool RestockToWarehouse { get; set; } = true;
    public decimal SubTotal { get; set; } = 0m;
    public decimal TaxAmount { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;
    public string? Notes { get; set; }
    public bool IsCancelled { get; set; } = false;
    public ICollection<SalesReturnItem> Items { get; set; } = new List<SalesReturnItem>();
}

public class SalesReturnItem : BaseTenantAuditableEntity
{
    public Guid SalesReturnId { get; set; }
    public SalesReturn SalesReturn { get; set; } = null!;
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public Guid? BatchId { get; set; }
    public string? BatchNumber { get; set; }
    public decimal ReturnQuantity { get; set; } = 0m;
    public decimal UnitPrice { get; set; } = 0m;
    public decimal GstRate { get; set; } = 0m;
    public decimal TotalAmount { get; set; } = 0m;
}

public class PosHeldBill : BaseTenantAuditableEntity
{
    public string HoldNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = "Walk-in Customer";
    public string? CustomerPhone { get; set; }
    public decimal TotalAmount { get; set; } = 0m;
    public int ItemsCount { get; set; } = 0;
    public string CartJson { get; set; } = "[]";
    public string? Notes { get; set; }
}
