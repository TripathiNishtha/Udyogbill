using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Persistence.Configurations;

public class SalesInvoiceConfiguration : IEntityTypeConfiguration<SalesInvoice>
{
    public void Configure(EntityTypeBuilder<SalesInvoice> builder)
    {
        builder.ToTable("sales_invoices");

        builder.Property(i => i.InvoiceNumber).HasMaxLength(100).IsRequired();
        builder.Property(i => i.CustomerName).HasMaxLength(200).IsRequired();
        builder.Property(i => i.CustomerPhone).HasMaxLength(30);
        builder.Property(i => i.CustomerEmail).HasMaxLength(150);
        builder.Property(i => i.CustomerGSTIN).HasMaxLength(20);
        builder.Property(i => i.CustomerPAN).HasMaxLength(15);
        builder.Property(i => i.BillingAddress).HasMaxLength(500);
        builder.Property(i => i.ShippingAddress).HasMaxLength(500);
        builder.Property(i => i.BillingStateCode).HasMaxLength(5).IsRequired();
        builder.Property(i => i.ShippingStateCode).HasMaxLength(5).IsRequired();
        builder.Property(i => i.PlaceOfSupply).HasMaxLength(100).IsRequired();

        builder.Property(i => i.SubTotal).HasPrecision(18, 4);
        builder.Property(i => i.ItemDiscountTotal).HasPrecision(18, 4);
        builder.Property(i => i.InvoiceDiscountPercent).HasPrecision(18, 4);
        builder.Property(i => i.InvoiceDiscountAmount).HasPrecision(18, 4);
        builder.Property(i => i.TaxableAmount).HasPrecision(18, 4);
        builder.Property(i => i.CgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.SgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.IgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.CessAmount).HasPrecision(18, 4);
        builder.Property(i => i.RoundOff).HasPrecision(18, 4);
        builder.Property(i => i.TotalAmount).HasPrecision(18, 4);
        builder.Property(i => i.PaidAmount).HasPrecision(18, 4);
        builder.Property(i => i.BalanceAmount).HasPrecision(18, 4);

        builder.Property(i => i.PaymentReferenceNumber).HasMaxLength(100);
        builder.Property(i => i.Notes).HasMaxLength(1000);
        builder.Property(i => i.TermsAndConditions).HasMaxLength(2000);
        builder.Property(i => i.CancellationReason).HasMaxLength(500);

        builder.Property(i => i.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(i => new { i.TenantId, i.InvoiceNumber }).IsUnique();
        builder.HasIndex(i => new { i.TenantId, i.BranchId, i.InvoiceDate });
        builder.HasIndex(i => new { i.TenantId, i.PartyId });
        builder.HasIndex(i => new { i.TenantId, i.BrokerId });
        builder.HasIndex(i => new { i.TenantId, i.Status });
        builder.HasIndex(i => new { i.TenantId, i.InvoiceDate });

        builder.HasOne(i => i.Branch)
            .WithMany()
            .HasForeignKey(i => i.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Warehouse)
            .WithMany()
            .HasForeignKey(i => i.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Party)
            .WithMany()
            .HasForeignKey(i => i.PartyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Broker)
            .WithMany()
            .HasForeignKey(i => i.BrokerId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class SalesInvoiceItemConfiguration : IEntityTypeConfiguration<SalesInvoiceItem>
{
    public void Configure(EntityTypeBuilder<SalesInvoiceItem> builder)
    {
        builder.ToTable("sales_invoice_items");

        builder.Property(i => i.ItemSku).HasMaxLength(100).IsRequired();
        builder.Property(i => i.ItemName).HasMaxLength(200).IsRequired();
        builder.Property(i => i.HsnCode).HasMaxLength(20);
        builder.Property(i => i.Barcode).HasMaxLength(100);
        builder.Property(i => i.BatchNumber).HasMaxLength(100);
        builder.Property(i => i.UomCode).HasMaxLength(20).IsRequired();

        builder.Property(i => i.Quantity).HasPrecision(18, 4);
        builder.Property(i => i.UnitPrice).HasPrecision(18, 4);
        builder.Property(i => i.Mrp).HasPrecision(18, 4);
        builder.Property(i => i.PurchasePrice).HasPrecision(18, 4);
        builder.Property(i => i.DiscountPercent).HasPrecision(18, 4);
        builder.Property(i => i.DiscountAmount).HasPrecision(18, 4);
        builder.Property(i => i.TaxableAmount).HasPrecision(18, 4);
        builder.Property(i => i.GstRate).HasPrecision(18, 4);
        builder.Property(i => i.CgstRate).HasPrecision(18, 4);
        builder.Property(i => i.CgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.SgstRate).HasPrecision(18, 4);
        builder.Property(i => i.SgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.IgstRate).HasPrecision(18, 4);
        builder.Property(i => i.IgstAmount).HasPrecision(18, 4);
        builder.Property(i => i.CessRate).HasPrecision(18, 4);
        builder.Property(i => i.CessAmount).HasPrecision(18, 4);
        builder.Property(i => i.TotalAmount).HasPrecision(18, 4);

        builder.Property(i => i.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(i => new { i.TenantId, i.InvoiceId });
        builder.HasIndex(i => new { i.TenantId, i.ItemId });

        builder.HasOne(i => i.Invoice)
            .WithMany(inv => inv.Items)
            .HasForeignKey(i => i.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Item)
            .WithMany()
            .HasForeignKey(i => i.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Uom)
            .WithMany()
            .HasForeignKey(i => i.UomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Batch)
            .WithMany()
            .HasForeignKey(i => i.BatchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class SalesInvoicePaymentConfiguration : IEntityTypeConfiguration<SalesInvoicePayment>
{
    public void Configure(EntityTypeBuilder<SalesInvoicePayment> builder)
    {
        builder.ToTable("sales_invoice_payments");

        builder.Property(p => p.Amount).HasPrecision(18, 4);
        builder.Property(p => p.TransactionReference).HasMaxLength(100);
        builder.Property(p => p.Notes).HasMaxLength(500);

        builder.HasIndex(p => new { p.TenantId, p.InvoiceId });

        builder.HasOne(p => p.Invoice)
            .WithMany(inv => inv.Payments)
            .HasForeignKey(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
