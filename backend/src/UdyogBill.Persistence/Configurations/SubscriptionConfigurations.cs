using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Subscriptions;

namespace UdyogBill.Persistence.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.ToTable("plans");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.Code).IsUnique();

        builder.Property(p => p.Name).IsRequired().HasMaxLength(150);
        builder.Property(p => p.Price).HasColumnType("numeric(18,4)");
        builder.Property(p => p.SetupFee).HasColumnType("numeric(18,4)");

        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => p.DisplayOrder);
    }
}

public class PlanEntitlementConfiguration : IEntityTypeConfiguration<PlanEntitlement>
{
    public void Configure(EntityTypeBuilder<PlanEntitlement> builder)
    {
        builder.ToTable("plan_entitlements");
        builder.HasKey(pe => pe.Id);

        builder.HasIndex(pe => new { pe.PlanId, pe.FeatureId }).IsUnique();

        builder.HasOne(pe => pe.Plan)
            .WithMany(p => p.Entitlements)
            .HasForeignKey(pe => pe.PlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pe => pe.Feature)
            .WithMany()
            .HasForeignKey(pe => pe.FeatureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class TenantSubscriptionConfiguration : IEntityTypeConfiguration<TenantSubscription>
{
    public void Configure(EntityTypeBuilder<TenantSubscription> builder)
    {
        builder.ToTable("tenant_subscriptions");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.PricePaid).HasColumnType("numeric(18,4)");
        builder.Property(s => s.CurrencyCode).HasMaxLength(10).HasDefaultValue("INR");

        builder.HasOne(s => s.Plan)
            .WithMany(p => p.Subscriptions)
            .HasForeignKey(s => s.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.TenantId, s.Status });
        builder.HasIndex(s => s.EndsAtUtc);
    }
}

public class AddOnConfiguration : IEntityTypeConfiguration<AddOn>
{
    public void Configure(EntityTypeBuilder<AddOn> builder)
    {
        builder.ToTable("add_ons");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(a => a.Code).IsUnique();

        builder.Property(a => a.Name).IsRequired().HasMaxLength(150);
        builder.Property(a => a.Price).HasColumnType("numeric(18,4)");
    }
}

public class TenantSubscriptionAddOnConfiguration : IEntityTypeConfiguration<TenantSubscriptionAddOn>
{
    public void Configure(EntityTypeBuilder<TenantSubscriptionAddOn> builder)
    {
        builder.ToTable("tenant_subscription_add_ons");
        builder.HasKey(sa => sa.Id);

        builder.Property(sa => sa.UnitPrice).HasColumnType("numeric(18,4)");

        builder.HasOne(sa => sa.TenantSubscription)
            .WithMany(s => s.SubscriptionAddOns)
            .HasForeignKey(sa => sa.TenantSubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sa => sa.AddOn)
            .WithMany()
            .HasForeignKey(sa => sa.AddOnId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.ActionName).IsRequired().HasMaxLength(100);
        builder.Property(a => a.EntityName).IsRequired().HasMaxLength(100);
        builder.Property(a => a.EntityId).HasMaxLength(100);

        builder.Property(a => a.OldValuesJson).HasColumnType("jsonb");
        builder.Property(a => a.NewValuesJson).HasColumnType("jsonb");
        builder.Property(a => a.AffectedColumnsJson).HasColumnType("jsonb");

        builder.Property(a => a.IpAddress).HasMaxLength(45);
        builder.Property(a => a.UserAgent).HasMaxLength(500);
        builder.Property(a => a.CorrelationId).HasMaxLength(100);

        builder.HasIndex(a => new { a.TenantId, a.TimestampUtc });
        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.Action);
    }
}
