using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryCatalogEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "users",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateTable(
                name: "brands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ManufacturerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_brands", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentCategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_categories_categories_ParentCategoryId",
                        column: x => x.ParentCategoryId,
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "units_of_measure",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DecimalPlaces = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_units_of_measure", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    ShortDescription = table.Column<string>(type: "text", nullable: true),
                    Barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ItemType = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    BrandId = table.Column<Guid>(type: "uuid", nullable: true),
                    PrimaryUomId = table.Column<Guid>(type: "uuid", nullable: false),
                    SecondaryUomId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConversionRatio = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    HSNCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    TaxRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CessRate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    IsTaxInclusive = table.Column<bool>(type: "boolean", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SellingPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MRP = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MinimumSellingPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MinimumStockAlert = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MaximumStockAlert = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReorderQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TrackBatches = table.Column<bool>(type: "boolean", nullable: false),
                    TrackSerialNumbers = table.Column<bool>(type: "boolean", nullable: false),
                    TrackVariants = table.Column<bool>(type: "boolean", nullable: false),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_items_brands_BrandId",
                        column: x => x.BrandId,
                        principalTable: "brands",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_items_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_items_units_of_measure_PrimaryUomId",
                        column: x => x.PrimaryUomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_units_of_measure_SecondaryUomId",
                        column: x => x.SecondaryUomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "unit_conversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromUomId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToUomId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversionFactor = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unit_conversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_unit_conversions_units_of_measure_FromUomId",
                        column: x => x.FromUomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_unit_conversions_units_of_measure_ToUomId",
                        column: x => x.ToUomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "item_batches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ManufacturingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MRP = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PurchaseRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SaleRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_batches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_batches_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_variants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantSku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VariantName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    PriceAdjustment = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_variants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_variants_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_serial_numbers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    WarrantyExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_serial_numbers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_serial_numbers_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_item_serial_numbers_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_serial_numbers_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "item_warehouse_stocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    CurrentQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReservedQuantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReorderLevel = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_warehouse_stocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_warehouse_stocks_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_warehouse_stocks_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_warehouse_stocks_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_movements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    MovementType = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityBefore = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    QuantityAfter = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UnitCost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCost = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceDocumentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferenceDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceDocumentNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_movements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_stock_movements_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_stock_movements_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_stock_movements_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_brands_TenantId_Code",
                table: "brands",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categories_ParentCategoryId",
                table: "categories",
                column: "ParentCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_categories_TenantId_Code",
                table: "categories",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_batches_ItemId",
                table: "item_batches",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_item_batches_TenantId_ExpiryDate",
                table: "item_batches",
                columns: new[] { "TenantId", "ExpiryDate" });

            migrationBuilder.CreateIndex(
                name: "IX_item_batches_TenantId_ItemId_BatchNumber",
                table: "item_batches",
                columns: new[] { "TenantId", "ItemId", "BatchNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_serial_numbers_BatchId",
                table: "item_serial_numbers",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_item_serial_numbers_ItemId",
                table: "item_serial_numbers",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_item_serial_numbers_TenantId_ItemId_SerialNumber",
                table: "item_serial_numbers",
                columns: new[] { "TenantId", "ItemId", "SerialNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_serial_numbers_WarehouseId",
                table: "item_serial_numbers",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_item_variants_ItemId",
                table: "item_variants",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_item_variants_TenantId_ItemId_VariantSku",
                table: "item_variants",
                columns: new[] { "TenantId", "ItemId", "VariantSku" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_warehouse_stocks_BatchId",
                table: "item_warehouse_stocks",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_item_warehouse_stocks_ItemId",
                table: "item_warehouse_stocks",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_item_warehouse_stocks_TenantId_ItemId_WarehouseId_BatchId",
                table: "item_warehouse_stocks",
                columns: new[] { "TenantId", "ItemId", "WarehouseId", "BatchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_warehouse_stocks_WarehouseId",
                table: "item_warehouse_stocks",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_items_BrandId",
                table: "items",
                column: "BrandId");

            migrationBuilder.CreateIndex(
                name: "IX_items_CategoryId",
                table: "items",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_items_PrimaryUomId",
                table: "items",
                column: "PrimaryUomId");

            migrationBuilder.CreateIndex(
                name: "IX_items_SecondaryUomId",
                table: "items",
                column: "SecondaryUomId");

            migrationBuilder.CreateIndex(
                name: "IX_items_TenantId_Barcode",
                table: "items",
                columns: new[] { "TenantId", "Barcode" });

            migrationBuilder.CreateIndex(
                name: "IX_items_TenantId_BrandId",
                table: "items",
                columns: new[] { "TenantId", "BrandId" });

            migrationBuilder.CreateIndex(
                name: "IX_items_TenantId_CategoryId",
                table: "items",
                columns: new[] { "TenantId", "CategoryId" });

            migrationBuilder.CreateIndex(
                name: "IX_items_TenantId_Sku",
                table: "items",
                columns: new[] { "TenantId", "Sku" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_BatchId",
                table: "stock_movements",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_ItemId",
                table: "stock_movements",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_TenantId_CreatedAtUtc",
                table: "stock_movements",
                columns: new[] { "TenantId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_TenantId_ItemId_WarehouseId",
                table: "stock_movements",
                columns: new[] { "TenantId", "ItemId", "WarehouseId" });

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_WarehouseId",
                table: "stock_movements",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_unit_conversions_FromUomId",
                table: "unit_conversions",
                column: "FromUomId");

            migrationBuilder.CreateIndex(
                name: "IX_unit_conversions_TenantId_FromUomId_ToUomId",
                table: "unit_conversions",
                columns: new[] { "TenantId", "FromUomId", "ToUomId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unit_conversions_ToUomId",
                table: "unit_conversions",
                column: "ToUomId");

            migrationBuilder.CreateIndex(
                name: "IX_units_of_measure_TenantId_Code",
                table: "units_of_measure",
                columns: new[] { "TenantId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "item_serial_numbers");

            migrationBuilder.DropTable(
                name: "item_variants");

            migrationBuilder.DropTable(
                name: "item_warehouse_stocks");

            migrationBuilder.DropTable(
                name: "stock_movements");

            migrationBuilder.DropTable(
                name: "unit_conversions");

            migrationBuilder.DropTable(
                name: "item_batches");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "brands");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "units_of_measure");

            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
