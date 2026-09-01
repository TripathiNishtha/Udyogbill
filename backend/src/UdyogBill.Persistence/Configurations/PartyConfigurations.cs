using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Parties;

namespace UdyogBill.Persistence.Configurations;

public class PartyConfiguration : IEntityTypeConfiguration<Party>
{
    public void Configure(EntityTypeBuilder<Party> builder)
    {
        builder.ToTable("parties");

        builder.Property(p => p.Code).HasMaxLength(50).IsRequired();
        builder.Property(p => p.LegalName).HasMaxLength(200).IsRequired();
        builder.Property(p => p.TradeName).HasMaxLength(200);
        builder.Property(p => p.ContactPersonName).HasMaxLength(150);

        builder.Property(p => p.Email).HasMaxLength(150);
        builder.Property(p => p.PrimaryPhone).HasMaxLength(30);
        builder.Property(p => p.Mobile).HasMaxLength(30);
        builder.Property(p => p.SecondaryPhone).HasMaxLength(30);
        builder.Property(p => p.Website).HasMaxLength(150);

        builder.Property(p => p.GSTIN).HasMaxLength(20);
        builder.Property(p => p.StateCode).HasMaxLength(5);
        builder.Property(p => p.PAN).HasMaxLength(15);
        builder.Property(p => p.TAN).HasMaxLength(20);

        builder.Property(p => p.DrugLicenseNumber1).HasMaxLength(100);
        builder.Property(p => p.DrugLicenseNumber2).HasMaxLength(100);
        builder.Property(p => p.FSSAINumber).HasMaxLength(50);

        builder.Property(p => p.CreditLimit).HasPrecision(18, 4);
        builder.Property(p => p.OpeningBalance).HasPrecision(18, 4);
        builder.Property(p => p.CurrentOutstandingBalance).HasPrecision(18, 4);

        builder.Property(p => p.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(p => new { p.TenantId, p.Code }).IsUnique();
        builder.HasIndex(p => new { p.TenantId, p.GSTIN });
        builder.HasIndex(p => new { p.TenantId, p.Mobile });
        builder.HasIndex(p => new { p.TenantId, p.PartyType });
        builder.HasIndex(p => new { p.TenantId, p.LegalName });
    }
}

public class PartyAddressConfiguration : IEntityTypeConfiguration<PartyAddress>
{
    public void Configure(EntityTypeBuilder<PartyAddress> builder)
    {
        builder.ToTable("party_addresses");

        builder.Property(a => a.Label).HasMaxLength(100);
        builder.Property(a => a.AddressLine1).HasMaxLength(250).IsRequired();
        builder.Property(a => a.AddressLine2).HasMaxLength(250);
        builder.Property(a => a.City).HasMaxLength(100).IsRequired();
        builder.Property(a => a.State).HasMaxLength(100).IsRequired();
        builder.Property(a => a.StateCode).HasMaxLength(5).IsRequired();
        builder.Property(a => a.Pincode).HasMaxLength(20).IsRequired();
        builder.Property(a => a.Country).HasMaxLength(100).IsRequired();
        builder.Property(a => a.ContactPerson).HasMaxLength(150);
        builder.Property(a => a.ContactPhone).HasMaxLength(30);

        builder.HasIndex(a => new { a.TenantId, a.PartyId });

        builder.HasOne(a => a.Party)
            .WithMany(p => p.Addresses)
            .HasForeignKey(a => a.PartyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PartyLedgerEntryConfiguration : IEntityTypeConfiguration<PartyLedgerEntry>
{
    public void Configure(EntityTypeBuilder<PartyLedgerEntry> builder)
    {
        builder.ToTable("party_ledger_entries");

        builder.Property(l => l.DebitAmount).HasPrecision(18, 4);
        builder.Property(l => l.CreditAmount).HasPrecision(18, 4);
        builder.Property(l => l.RunningBalance).HasPrecision(18, 4);

        builder.Property(l => l.ReferenceDocumentType).HasMaxLength(100);
        builder.Property(l => l.ReferenceDocumentNumber).HasMaxLength(100);
        builder.Property(l => l.PaymentMode).HasMaxLength(50);
        builder.Property(l => l.Description).HasMaxLength(500);

        builder.HasIndex(l => new { l.TenantId, l.PartyId, l.TransactionDate });
        builder.HasIndex(l => new { l.TenantId, l.TransactionDate });

        builder.HasOne(l => l.Party)
            .WithMany(p => p.LedgerEntries)
            .HasForeignKey(l => l.PartyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
