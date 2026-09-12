using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Purchases;

namespace UdyogBill.Persistence.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("purchase_orders");

        builder.HasKey(po => po.Id);

        builder.Property(po => po.OrderNumber).HasMaxLength(50).IsRequired();
        builder.Property(po => po.SupplierName).HasMaxLength(200).IsRequired();
        builder.Property(po => po.SupplierPhone).HasMaxLength(30);
        builder.Property(po => po.SupplierGSTIN).HasMaxLength(15);
        builder.Property(po => po.SupplierAddress).HasMaxLength(500);
        builder.Property(po => po.SupplierStateCode).HasMaxLength(10).IsRequired();
        builder.Property(po => po.PlaceOfSupply).HasMaxLength(100).IsRequired();

        builder.Property(po => po.SubTotal).HasPrecision(18, 4);
        builder.Property(po => po.DiscountTotal).HasPrecision(18, 4);
        builder.Property(po => po.TaxableAmount).HasPrecision(18, 4);
        builder.Property(po => po.CgstAmount).HasPrecision(18, 4);
        builder.Property(po => po.SgstAmount).HasPrecision(18, 4);
        builder.Property(po => po.IgstAmount).HasPrecision(18, 4);
        builder.Property(po => po.CessAmount).HasPrecision(18, 4);
        builder.Property(po => po.RoundOff).HasPrecision(18, 4);
        builder.Property(po => po.TotalAmount).HasPrecision(18, 4);

        builder.Property(po => po.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(po => new { po.TenantId, po.OrderNumber }).IsUnique();
        builder.HasIndex(po => new { po.TenantId, po.PartyId, po.OrderDate });

        builder.HasOne(po => po.Branch)
            .WithMany()
            .HasForeignKey(po => po.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(po => po.Warehouse)
            .WithMany()
            .HasForeignKey(po => po.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(po => po.Party)
            .WithMany()
            .HasForeignKey(po => po.PartyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(po => po.Items)
            .WithOne(poi => poi.PurchaseOrder)
            .HasForeignKey(poi => poi.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PurchaseOrderItemConfiguration : IEntityTypeConfiguration<PurchaseOrderItem>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderItem> builder)
    {
        builder.ToTable("purchase_order_items");

        builder.HasKey(poi => poi.Id);

        builder.Property(poi => poi.ItemSku).HasMaxLength(50).IsRequired();
        builder.Property(poi => poi.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(poi => poi.HsnCode).HasMaxLength(20);
        builder.Property(poi => poi.UomCode).HasMaxLength(20).IsRequired();

        builder.Property(poi => poi.OrderQuantity).HasPrecision(18, 4);
        builder.Property(poi => poi.FreeQuantity).HasPrecision(18, 4);
        builder.Property(poi => poi.ReceivedQuantity).HasPrecision(18, 4);
        builder.Property(poi => poi.UnitPrice).HasPrecision(18, 4);
        builder.Property(poi => poi.DiscountPercent).HasPrecision(5, 2);
        builder.Property(poi => poi.SchemeDiscountPercent).HasPrecision(5, 2);
        builder.Property(poi => poi.CashDiscountPercent).HasPrecision(5, 2);
        builder.Property(poi => poi.DiscountAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.TaxableAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.GstRate).HasPrecision(5, 2);
        builder.Property(poi => poi.CgstRate).HasPrecision(5, 2);
        builder.Property(poi => poi.CgstAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.SgstRate).HasPrecision(5, 2);
        builder.Property(poi => poi.SgstAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.IgstRate).HasPrecision(5, 2);
        builder.Property(poi => poi.IgstAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.CessRate).HasPrecision(5, 2);
        builder.Property(poi => poi.CessAmount).HasPrecision(18, 4);
        builder.Property(poi => poi.TotalAmount).HasPrecision(18, 4);

        builder.Property(poi => poi.AttributesJson).HasColumnType("jsonb");

        builder.HasOne(poi => poi.Item)
            .WithMany()
            .HasForeignKey(poi => poi.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(poi => poi.Uom)
            .WithMany()
            .HasForeignKey(poi => poi.UomId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class GoodsReceiptNoteConfiguration : IEntityTypeConfiguration<GoodsReceiptNote>
{
    public void Configure(EntityTypeBuilder<GoodsReceiptNote> builder)
    {
        builder.ToTable("goods_receipt_notes");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.GrnNumber).HasMaxLength(50).IsRequired();
        builder.Property(g => g.SupplierName).HasMaxLength(200).IsRequired();
        builder.Property(g => g.DeliveryChallanNumber).HasMaxLength(100);
        builder.Property(g => g.ReceivedBy).HasMaxLength(100);

        builder.HasIndex(g => new { g.TenantId, g.GrnNumber }).IsUnique();
        builder.HasIndex(g => new { g.TenantId, g.PurchaseOrderId });

        builder.HasOne(g => g.PurchaseOrder)
            .WithMany(po => po.GoodsReceiptNotes)
            .HasForeignKey(g => g.PurchaseOrderId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(g => g.Branch)
            .WithMany()
            .HasForeignKey(g => g.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(g => g.Warehouse)
            .WithMany()
            .HasForeignKey(g => g.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(g => g.Party)
            .WithMany()
            .HasForeignKey(g => g.PartyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(g => g.Items)
            .WithOne(gi => gi.GoodsReceiptNote)
            .HasForeignKey(gi => gi.GoodsReceiptNoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class GoodsReceiptNoteItemConfiguration : IEntityTypeConfiguration<GoodsReceiptNoteItem>
{
    public void Configure(EntityTypeBuilder<GoodsReceiptNoteItem> builder)
    {
        builder.ToTable("goods_receipt_note_items");

        builder.HasKey(gi => gi.Id);

        builder.Property(gi => gi.ItemSku).HasMaxLength(50).IsRequired();
        builder.Property(gi => gi.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(gi => gi.BatchNumber).HasMaxLength(100);
        builder.Property(gi => gi.UomCode).HasMaxLength(20).IsRequired();

        builder.Property(gi => gi.ReceivedQuantity).HasPrecision(18, 4);
        builder.Property(gi => gi.ReceivedFreeQuantity).HasPrecision(18, 4);
        builder.Property(gi => gi.AcceptedQuantity).HasPrecision(18, 4);
        builder.Property(gi => gi.AcceptedFreeQuantity).HasPrecision(18, 4);
        builder.Property(gi => gi.RejectedQuantity).HasPrecision(18, 4);
        builder.Property(gi => gi.UnitCost).HasPrecision(18, 4);
        builder.Property(gi => gi.TotalCost).HasPrecision(18, 4);

        builder.HasOne(gi => gi.Item)
            .WithMany()
            .HasForeignKey(gi => gi.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(gi => gi.Batch)
            .WithMany()
            .HasForeignKey(gi => gi.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(gi => gi.Uom)
            .WithMany()
            .HasForeignKey(gi => gi.UomId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PurchaseBillConfiguration : IEntityTypeConfiguration<PurchaseBill>
{
    public void Configure(EntityTypeBuilder<PurchaseBill> builder)
    {
        builder.ToTable("purchase_bills");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.BillNumber).HasMaxLength(50).IsRequired();
        builder.Property(b => b.VendorInvoiceNumber).HasMaxLength(100);
        builder.Property(b => b.SupplierName).HasMaxLength(200).IsRequired();
        builder.Property(b => b.SupplierGSTIN).HasMaxLength(15);
        builder.Property(b => b.SupplierAddress).HasMaxLength(500);
        builder.Property(b => b.SupplierStateCode).HasMaxLength(10).IsRequired();
        builder.Property(b => b.PlaceOfSupply).HasMaxLength(100).IsRequired();

        builder.Property(b => b.SubTotal).HasPrecision(18, 4);
        builder.Property(b => b.DiscountTotal).HasPrecision(18, 4);
        builder.Property(b => b.TaxableAmount).HasPrecision(18, 4);
        builder.Property(b => b.CgstAmount).HasPrecision(18, 4);
        builder.Property(b => b.SgstAmount).HasPrecision(18, 4);
        builder.Property(b => b.IgstAmount).HasPrecision(18, 4);
        builder.Property(b => b.CessAmount).HasPrecision(18, 4);
        builder.Property(b => b.RoundOff).HasPrecision(18, 4);
        builder.Property(b => b.TotalAmount).HasPrecision(18, 4);
        builder.Property(b => b.PaidAmount).HasPrecision(18, 4);
        builder.Property(b => b.BalanceAmount).HasPrecision(18, 4);

        builder.Property(b => b.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(b => new { b.TenantId, b.BillNumber }).IsUnique();
        builder.HasIndex(b => new { b.TenantId, b.PartyId, b.BillDate });

        builder.HasOne(b => b.PurchaseOrder)
            .WithMany(po => po.PurchaseBills)
            .HasForeignKey(b => b.PurchaseOrderId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(b => b.Branch)
            .WithMany()
            .HasForeignKey(b => b.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Warehouse)
            .WithMany()
            .HasForeignKey(b => b.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(b => b.Party)
            .WithMany()
            .HasForeignKey(b => b.PartyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(b => b.Items)
            .WithOne(bi => bi.PurchaseBill)
            .HasForeignKey(bi => bi.PurchaseBillId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(b => b.Payments)
            .WithOne(bp => bp.PurchaseBill)
            .HasForeignKey(bp => bp.PurchaseBillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PurchaseBillItemConfiguration : IEntityTypeConfiguration<PurchaseBillItem>
{
    public void Configure(EntityTypeBuilder<PurchaseBillItem> builder)
    {
        builder.ToTable("purchase_bill_items");

        builder.HasKey(bi => bi.Id);

        builder.Property(bi => bi.ItemSku).HasMaxLength(50).IsRequired();
        builder.Property(bi => bi.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(bi => bi.HsnCode).HasMaxLength(20);
        builder.Property(bi => bi.BatchNumber).HasMaxLength(100);
        builder.Property(bi => bi.UomCode).HasMaxLength(20).IsRequired();

        builder.Property(bi => bi.Quantity).HasPrecision(18, 4);
        builder.Property(bi => bi.FreeQuantity).HasPrecision(18, 4);
        builder.Property(bi => bi.UnitPrice).HasPrecision(18, 4);
        builder.Property(bi => bi.DiscountPercent).HasPrecision(5, 2);
        builder.Property(bi => bi.SchemeDiscountPercent).HasPrecision(5, 2);
        builder.Property(bi => bi.CashDiscountPercent).HasPrecision(5, 2);
        builder.Property(bi => bi.DiscountAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.TaxableAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.GstRate).HasPrecision(5, 2);
        builder.Property(bi => bi.CgstRate).HasPrecision(5, 2);
        builder.Property(bi => bi.CgstAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.SgstRate).HasPrecision(5, 2);
        builder.Property(bi => bi.SgstAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.IgstRate).HasPrecision(5, 2);
        builder.Property(bi => bi.IgstAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.CessRate).HasPrecision(5, 2);
        builder.Property(bi => bi.CessAmount).HasPrecision(18, 4);
        builder.Property(bi => bi.TotalAmount).HasPrecision(18, 4);

        builder.Property(bi => bi.AttributesJson).HasColumnType("jsonb");

        builder.HasOne(bi => bi.Item)
            .WithMany()
            .HasForeignKey(bi => bi.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(bi => bi.Batch)
            .WithMany()
            .HasForeignKey(bi => bi.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(bi => bi.Uom)
            .WithMany()
            .HasForeignKey(bi => bi.UomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(bi => bi.Variant)
            .WithMany()
            .HasForeignKey(bi => bi.VariantId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class PurchaseBillPaymentConfiguration : IEntityTypeConfiguration<PurchaseBillPayment>
{
    public void Configure(EntityTypeBuilder<PurchaseBillPayment> builder)
    {
        builder.ToTable("purchase_bill_payments");

        builder.HasKey(bp => bp.Id);

        builder.Property(bp => bp.Amount).HasPrecision(18, 4);
        builder.Property(bp => bp.TransactionReference).HasMaxLength(100);
        builder.Property(bp => bp.BankName).HasMaxLength(100);

        builder.HasIndex(bp => new { bp.TenantId, bp.PurchaseBillId, bp.PaymentDate });
    }
}
