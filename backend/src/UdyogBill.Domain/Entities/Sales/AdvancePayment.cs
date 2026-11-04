using System;
using System.Collections.Generic;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;

namespace UdyogBill.Domain.Entities.Sales;

public enum AdvancePaymentDirection
{
    CustomerAdvance = 1,
    SupplierAdvance = 2
}

public class AdvancePayment : BaseTenantAuditableEntity
{
    public Guid PartyId { get; set; }
    public Party Party { get; set; } = null!;
    public decimal Amount { get; set; }
    public decimal AllocatedAmount { get; set; }
    public decimal UnallocatedAmount => Math.Max(0m, Amount - AllocatedAmount);
    public PaymentMode PaymentMode { get; set; } = PaymentMode.BankTransfer;
    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
    public AdvancePaymentDirection Direction { get; set; } = AdvancePaymentDirection.CustomerAdvance;
    public ICollection<AdvancePaymentAllocation> Allocations { get; set; } = new List<AdvancePaymentAllocation>();
}

public class AdvancePaymentAllocation : BaseTenantAuditableEntity
{
    public Guid AdvancePaymentId { get; set; }
    public AdvancePayment AdvancePayment { get; set; } = null!;
    public Guid? InvoiceId { get; set; }
    public SalesInvoice? Invoice { get; set; }
    public Guid? PurchaseBillId { get; set; }
    public PurchaseBill? PurchaseBill { get; set; }
    public decimal AmountAllocated { get; set; }
    public DateTime AllocationDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
}
