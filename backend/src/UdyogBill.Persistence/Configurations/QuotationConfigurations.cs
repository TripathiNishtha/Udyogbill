using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Sales;

namespace UdyogBill.Persistence.Configurations;

public class QuotationConfiguration : IEntityTypeConfiguration<Quotation>
{
    public void Configure(EntityTypeBuilder<Quotation> builder)
    {
        builder.ToTable("quotations");

        builder.HasKey(q => q.Id);

        builder.Property(q => q.QuotationNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(q => q.CustomerName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(q => q.CustomerPhone)
            .HasMaxLength(20);

        builder.Property(q => q.CustomerEmail)
            .HasMaxLength(150);

        builder.Property(q => q.CustomerGSTIN)
            .HasMaxLength(15);

        builder.Property(q => q.BillingAddress)
            .HasMaxLength(500);

        builder.Property(q => q.ShippingAddress)
            .HasMaxLength(500);

        builder.Property(q => q.BillingStateCode)
            .HasMaxLength(10);

        builder.Property(q => q.ShippingStateCode)
            .HasMaxLength(10);

        builder.Property(q => q.PlaceOfSupply)
            .HasMaxLength(100);

        builder.Property(q => q.SubTotal)
            .HasPrecision(18, 4);

        builder.Property(q => q.ItemDiscountTotal)
            .HasPrecision(18, 4);

        builder.Property(q => q.QuotationDiscountPercent)
            .HasPrecision(18, 4);

        builder.Property(q => q.QuotationDiscountAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.TaxableAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.CgstAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.SgstAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.IgstAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.CessAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.RoundOff)
            .HasPrecision(18, 4);

        builder.Property(q => q.TotalAmount)
            .HasPrecision(18, 4);

        builder.Property(q => q.Notes)
            .HasMaxLength(1000);

        builder.Property(q => q.TermsAndConditions)
            .HasMaxLength(2000);

        builder.Property(q => q.CancellationReason)
            .HasMaxLength(500);

        builder.Property(q => q.AttributesJson)
            .HasColumnType("jsonb");

        builder.HasIndex(q => new { q.TenantId, q.QuotationNumber })
            .IsUnique();

        builder.HasOne(q => q.Branch)
            .WithMany()
            .HasForeignKey(q => q.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(q => q.Party)
            .WithMany()
            .HasForeignKey(q => q.PartyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(q => q.ConvertedInvoice)
            .WithMany()
            .HasForeignKey(q => q.ConvertedInvoiceId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(q => q.Items)
            .WithOne(i => i.Quotation)
            .HasForeignKey(i => i.QuotationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class QuotationItemConfiguration : IEntityTypeConfiguration<QuotationItem>
{
    public void Configure(EntityTypeBuilder<QuotationItem> builder)
    {
        builder.ToTable("quotation_items");

        builder.HasKey(qi => qi.Id);

        builder.Property(qi => qi.ItemSku)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(qi => qi.ItemName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(qi => qi.HsnCode)
            .HasMaxLength(20);

        builder.Property(qi => qi.Quantity)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.UnitPrice)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.DiscountPercent)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.DiscountAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.TaxableAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.GstRate)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.CgstRate)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.CgstAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.SgstRate)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.SgstAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.IgstRate)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.IgstAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.CessRate)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.CessAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.TotalAmount)
            .HasPrecision(18, 4);

        builder.Property(qi => qi.AttributesJson)
            .HasColumnType("jsonb");

        builder.HasOne(qi => qi.Item)
            .WithMany()
            .HasForeignKey(qi => qi.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(qi => qi.Uom)
            .WithMany()
            .HasForeignKey(qi => qi.UomId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
