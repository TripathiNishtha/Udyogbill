using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UdyogBill.Domain.Entities.Inventory;

namespace UdyogBill.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.Property(c => c.Code).HasMaxLength(50).IsRequired();
        builder.Property(c => c.Name).HasMaxLength(150).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(500);

        builder.HasIndex(c => new { c.TenantId, c.Code }).IsUnique();

        builder.HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.ToTable("brands");

        builder.Property(b => b.Code).HasMaxLength(50).IsRequired();
        builder.Property(b => b.Name).HasMaxLength(150).IsRequired();
        builder.Property(b => b.ManufacturerName).HasMaxLength(200);

        builder.HasIndex(b => new { b.TenantId, b.Code }).IsUnique();
    }
}

public class UnitOfMeasureConfiguration : IEntityTypeConfiguration<UnitOfMeasure>
{
    public void Configure(EntityTypeBuilder<UnitOfMeasure> builder)
    {
        builder.ToTable("units_of_measure");

        builder.Property(u => u.Code).HasMaxLength(20).IsRequired();
        builder.Property(u => u.Name).HasMaxLength(100).IsRequired();
        builder.Property(u => u.Symbol).HasMaxLength(20);

        builder.HasIndex(u => new { u.TenantId, u.Code }).IsUnique();
    }
}

public class UnitConversionConfiguration : IEntityTypeConfiguration<UnitConversion>
{
    public void Configure(EntityTypeBuilder<UnitConversion> builder)
    {
        builder.ToTable("unit_conversions");

        builder.Property(uc => uc.ConversionFactor).HasPrecision(18, 4);

        builder.HasOne(uc => uc.FromUom)
            .WithMany(u => u.FromConversions)
            .HasForeignKey(uc => uc.FromUomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(uc => uc.ToUom)
            .WithMany(u => u.ToConversions)
            .HasForeignKey(uc => uc.ToUomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(uc => new { uc.TenantId, uc.FromUomId, uc.ToUomId }).IsUnique();
    }
}

public class ItemConfiguration : IEntityTypeConfiguration<Item>
{
    public void Configure(EntityTypeBuilder<Item> builder)
    {
        builder.ToTable("items");

        builder.Property(i => i.Sku).HasMaxLength(100).IsRequired();
        builder.Property(i => i.Name).HasMaxLength(250).IsRequired();
        builder.Property(i => i.Barcode).HasMaxLength(100);
        builder.Property(i => i.HSNCode).HasMaxLength(20);

        builder.Property(i => i.TaxRate).HasPrecision(18, 4);
        builder.Property(i => i.CessRate).HasPrecision(18, 4);
        builder.Property(i => i.PurchasePrice).HasPrecision(18, 4);
        builder.Property(i => i.SellingPrice).HasPrecision(18, 4);
        builder.Property(i => i.MRP).HasPrecision(18, 4);
        builder.Property(i => i.MinimumSellingPrice).HasPrecision(18, 4);
        builder.Property(i => i.ConversionRatio).HasPrecision(18, 4);

        builder.Property(i => i.MinimumStockAlert).HasPrecision(18, 4);
        builder.Property(i => i.MaximumStockAlert).HasPrecision(18, 4);
        builder.Property(i => i.ReorderQuantity).HasPrecision(18, 4);

        builder.Property(i => i.AttributesJson).HasColumnType("jsonb");

        builder.HasIndex(i => new { i.TenantId, i.Sku }).IsUnique();
        builder.HasIndex(i => new { i.TenantId, i.Barcode });
        builder.HasIndex(i => new { i.TenantId, i.CategoryId });
        builder.HasIndex(i => new { i.TenantId, i.BrandId });

        builder.HasOne(i => i.Category)
            .WithMany(c => c.Items)
            .HasForeignKey(i => i.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(i => i.Brand)
            .WithMany(b => b.Items)
            .HasForeignKey(i => i.BrandId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(i => i.PrimaryUom)
            .WithMany()
            .HasForeignKey(i => i.PrimaryUomId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.SecondaryUom)
            .WithMany()
            .HasForeignKey(i => i.SecondaryUomId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ItemBatchConfiguration : IEntityTypeConfiguration<ItemBatch>
{
    public void Configure(EntityTypeBuilder<ItemBatch> builder)
    {
        builder.ToTable("item_batches");

        builder.Property(b => b.BatchNumber).HasMaxLength(100).IsRequired();
        builder.Property(b => b.MRP).HasPrecision(18, 4);
        builder.Property(b => b.PurchaseRate).HasPrecision(18, 4);
        builder.Property(b => b.SaleRate).HasPrecision(18, 4);
        builder.Property(b => b.Barcode).HasMaxLength(100);

        builder.HasIndex(b => new { b.TenantId, b.ItemId, b.BatchNumber }).IsUnique();
        builder.HasIndex(b => new { b.TenantId, b.ExpiryDate });

        builder.HasOne(b => b.Item)
            .WithMany(i => i.Batches)
            .HasForeignKey(b => b.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ItemSerialNumberConfiguration : IEntityTypeConfiguration<ItemSerialNumber>
{
    public void Configure(EntityTypeBuilder<ItemSerialNumber> builder)
    {
        builder.ToTable("item_serial_numbers");

        builder.Property(s => s.SerialNumber).HasMaxLength(150).IsRequired();
        builder.Property(s => s.Status).HasMaxLength(50).IsRequired();

        builder.HasIndex(s => new { s.TenantId, s.ItemId, s.SerialNumber }).IsUnique();

        builder.HasOne(s => s.Item)
            .WithMany(i => i.SerialNumbers)
            .HasForeignKey(s => s.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Batch)
            .WithMany()
            .HasForeignKey(s => s.BatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.Warehouse)
            .WithMany()
            .HasForeignKey(s => s.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ItemVariantConfiguration : IEntityTypeConfiguration<ItemVariant>
{
    public void Configure(EntityTypeBuilder<ItemVariant> builder)
    {
        builder.ToTable("item_variants");

        builder.Property(v => v.VariantSku).HasMaxLength(100).IsRequired();
        builder.Property(v => v.VariantName).HasMaxLength(150).IsRequired();
        builder.Property(v => v.AttributesJson).HasColumnType("jsonb");
        builder.Property(v => v.PriceAdjustment).HasPrecision(18, 4);
        builder.Property(v => v.Barcode).HasMaxLength(100);

        builder.HasIndex(v => new { v.TenantId, v.ItemId, v.VariantSku }).IsUnique();

        builder.HasOne(v => v.Item)
            .WithMany(i => i.Variants)
            .HasForeignKey(v => v.ItemId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ItemWarehouseStockConfiguration : IEntityTypeConfiguration<ItemWarehouseStock>
{
    public void Configure(EntityTypeBuilder<ItemWarehouseStock> builder)
    {
        builder.ToTable("item_warehouse_stocks");

        builder.Property(s => s.CurrentQuantity).HasPrecision(18, 4);
        builder.Property(s => s.ReservedQuantity).HasPrecision(18, 4);
        builder.Property(s => s.ReorderLevel).HasPrecision(18, 4);

        builder.HasIndex(s => new { s.TenantId, s.ItemId, s.VariantId, s.WarehouseId, s.BatchId }).IsUnique();

        builder.HasOne(s => s.Item)
            .WithMany(i => i.WarehouseStocks)
            .HasForeignKey(s => s.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Variant)
            .WithMany()
            .HasForeignKey(s => s.VariantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Warehouse)
            .WithMany()
            .HasForeignKey(s => s.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Batch)
            .WithMany(b => b.WarehouseStocks)
            .HasForeignKey(s => s.BatchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.ToTable("stock_movements");

        builder.Property(sm => sm.Quantity).HasPrecision(18, 4);
        builder.Property(sm => sm.QuantityBefore).HasPrecision(18, 4);
        builder.Property(sm => sm.QuantityAfter).HasPrecision(18, 4);
        builder.Property(sm => sm.UnitCost).HasPrecision(18, 4);
        builder.Property(sm => sm.TotalCost).HasPrecision(18, 4);
        builder.Property(sm => sm.ReferenceDocumentType).HasMaxLength(100);
        builder.Property(sm => sm.ReferenceDocumentNumber).HasMaxLength(100);

        builder.HasIndex(sm => new { sm.TenantId, sm.ItemId, sm.WarehouseId });
        builder.HasIndex(sm => new { sm.TenantId, sm.CreatedAtUtc });

        builder.HasOne(sm => sm.Item)
            .WithMany()
            .HasForeignKey(sm => sm.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sm => sm.Variant)
            .WithMany()
            .HasForeignKey(sm => sm.VariantId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(sm => sm.Warehouse)
            .WithMany()
            .HasForeignKey(sm => sm.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(sm => sm.Batch)
            .WithMany()
            .HasForeignKey(sm => sm.BatchId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
