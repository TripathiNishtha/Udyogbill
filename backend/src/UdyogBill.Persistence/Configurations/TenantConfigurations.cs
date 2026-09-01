using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(t => t.Code).IsUnique();

        builder.Property(t => t.BusinessName).IsRequired().HasMaxLength(255);
        builder.Property(t => t.TradeName).HasMaxLength(255);
        builder.Property(t => t.AdminEmail).IsRequired().HasMaxLength(255);
        builder.Property(t => t.PrimaryPhone).IsRequired().HasMaxLength(50);
        builder.Property(t => t.GSTIN).HasMaxLength(50);
        builder.Property(t => t.PAN).HasMaxLength(50);
        builder.Property(t => t.DrugLicenseNumber).HasMaxLength(100);
        builder.Property(t => t.FSSAINumber).HasMaxLength(100);
        builder.Property(t => t.TimeZone).HasMaxLength(50).HasDefaultValue("Asia/Kolkata");
        builder.Property(t => t.CurrencyCode).HasMaxLength(10).HasDefaultValue("INR");
        builder.Property(t => t.CurrencySymbol).HasMaxLength(10).HasDefaultValue("₹");

        builder.HasOne(t => t.Industry)
            .WithMany()
            .HasForeignKey(t => t.IndustryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => t.IsActive);
        builder.HasIndex(t => t.CreatedAtUtc);
    }
}

public class TenantIndustryConfigConfiguration : IEntityTypeConfiguration<TenantIndustryConfig>
{
    public void Configure(EntityTypeBuilder<TenantIndustryConfig> builder)
    {
        builder.ToTable("tenant_industry_configs");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.ConfigurationJson).HasColumnType("jsonb");

        builder.HasIndex(c => new { c.TenantId, c.IndustryId }).IsUnique();

        builder.HasOne(c => c.Industry)
            .WithMany()
            .HasForeignKey(c => c.IndustryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class TenantBranchConfiguration : IEntityTypeConfiguration<TenantBranch>
{
    public void Configure(EntityTypeBuilder<TenantBranch> builder)
    {
        builder.ToTable("tenant_branches");
        builder.HasKey(b => b.Id);

        builder.Property(b => b.BranchCode).IsRequired().HasMaxLength(50);
        builder.Property(b => b.BranchName).IsRequired().HasMaxLength(200);

        builder.HasIndex(b => new { b.TenantId, b.BranchCode }).IsUnique();
        builder.HasIndex(b => new { b.TenantId, b.IsActive });
    }
}

public class TenantWarehouseConfiguration : IEntityTypeConfiguration<TenantWarehouse>
{
    public void Configure(EntityTypeBuilder<TenantWarehouse> builder)
    {
        builder.ToTable("tenant_warehouses");
        builder.HasKey(w => w.Id);

        builder.Property(w => w.WarehouseCode).IsRequired().HasMaxLength(50);
        builder.Property(w => w.WarehouseName).IsRequired().HasMaxLength(200);

        builder.HasOne(w => w.Branch)
            .WithMany(b => b.Warehouses)
            .HasForeignKey(w => w.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(w => new { w.TenantId, w.WarehouseCode }).IsUnique();
    }
}

public class TenantSettingConfiguration : IEntityTypeConfiguration<TenantSetting>
{
    public void Configure(EntityTypeBuilder<TenantSetting> builder)
    {
        builder.ToTable("tenant_settings");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Category).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Key).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Value).IsRequired();

        builder.HasIndex(s => new { s.TenantId, s.Category, s.Key }).IsUnique();
    }
}
