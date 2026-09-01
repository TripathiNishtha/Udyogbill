using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Catalog;

namespace UdyogBill.Persistence.Configurations;

public class IndustryConfiguration : IEntityTypeConfiguration<Industry>
{
    public void Configure(EntityTypeBuilder<Industry> builder)
    {
        builder.ToTable("industries");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(i => i.Code).IsUnique();

        builder.Property(i => i.Name).IsRequired().HasMaxLength(200);
        builder.Property(i => i.DefaultConfigJson).HasColumnType("jsonb");
    }
}

public class ModuleConfiguration : IEntityTypeConfiguration<Module>
{
    public void Configure(EntityTypeBuilder<Module> builder)
    {
        builder.ToTable("modules");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(m => m.Code).IsUnique();

        builder.Property(m => m.Name).IsRequired().HasMaxLength(200);
    }
}

public class IndustryModuleConfiguration : IEntityTypeConfiguration<IndustryModule>
{
    public void Configure(EntityTypeBuilder<IndustryModule> builder)
    {
        builder.ToTable("industry_modules");
        builder.HasKey(im => im.Id);

        builder.HasIndex(im => new { im.IndustryId, im.ModuleId }).IsUnique();

        builder.HasOne(im => im.Industry)
            .WithMany(i => i.IndustryModules)
            .HasForeignKey(im => im.IndustryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(im => im.Module)
            .WithMany(m => m.IndustryModules)
            .HasForeignKey(im => im.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class FeatureConfiguration : IEntityTypeConfiguration<Feature>
{
    public void Configure(EntityTypeBuilder<Feature> builder)
    {
        builder.ToTable("features");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Code).IsRequired().HasMaxLength(100);
        builder.HasIndex(f => f.Code).IsUnique();

        builder.Property(f => f.Name).IsRequired().HasMaxLength(200);

        builder.HasOne(f => f.Module)
            .WithMany(m => m.Features)
            .HasForeignKey(f => f.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class IndustryFeatureConfiguration : IEntityTypeConfiguration<IndustryFeature>
{
    public void Configure(EntityTypeBuilder<IndustryFeature> builder)
    {
        builder.ToTable("industry_features");
        builder.HasKey(inf => inf.Id);

        builder.Property(inf => inf.DefaultConfigJson).HasColumnType("jsonb");

        builder.HasIndex(inf => new { inf.IndustryId, inf.FeatureId }).IsUnique();

        builder.HasOne(inf => inf.Industry)
            .WithMany(i => i.IndustryFeatures)
            .HasForeignKey(inf => inf.IndustryId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(inf => inf.Feature)
            .WithMany(f => f.IndustryFeatures)
            .HasForeignKey(inf => inf.FeatureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SubFeatureConfiguration : IEntityTypeConfiguration<SubFeature>
{
    public void Configure(EntityTypeBuilder<SubFeature> builder)
    {
        builder.ToTable("sub_features");
        builder.HasKey(sf => sf.Id);

        builder.Property(sf => sf.Code).IsRequired().HasMaxLength(100);
        builder.HasIndex(sf => sf.Code).IsUnique();

        builder.Property(sf => sf.Name).IsRequired().HasMaxLength(200);

        builder.HasOne(sf => sf.Feature)
            .WithMany(f => f.SubFeatures)
            .HasForeignKey(sf => sf.FeatureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("permissions");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Code).IsRequired().HasMaxLength(100);
        builder.HasIndex(p => p.Code).IsUnique();

        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Group).IsRequired().HasMaxLength(100);

        builder.HasOne(p => p.Feature)
            .WithMany(f => f.Permissions)
            .HasForeignKey(p => p.FeatureId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(p => p.SubFeature)
            .WithMany(sf => sf.Permissions)
            .HasForeignKey(p => p.SubFeatureId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
