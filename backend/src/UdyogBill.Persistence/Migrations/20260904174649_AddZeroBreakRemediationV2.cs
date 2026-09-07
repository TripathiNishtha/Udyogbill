using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddZeroBreakRemediationV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"ActiveIndustryModule\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"AiScansLimit\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"AiScansUsed\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"IndustryActivatedAtUtc\" timestamp with time zone NOT NULL DEFAULT '0001-01-01 00:00:00+00';");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"IndustryModuleStatus\" integer NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"IndustryTypeCode\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"IsAiAddonActive\" boolean NOT NULL DEFAULT false;");
            migrationBuilder.Sql("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS \"MaxAllowedUsers\" integer NOT NULL DEFAULT 0;");

            migrationBuilder.Sql("ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"SalesReturnItems\" ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE \"PurchaseReturnItems\" ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE purchase_bill_items ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");
            migrationBuilder.Sql("ALTER TABLE item_warehouse_stocks ADD COLUMN IF NOT EXISTS \"VariantId\" uuid;");

            migrationBuilder.Sql("ALTER TABLE items ALTER COLUMN \"TaxRate\" TYPE numeric(18,4);");
            migrationBuilder.Sql("ALTER TABLE items ALTER COLUMN \"CessRate\" TYPE numeric(18,4);");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""IdempotentRequests"" (
    ""Id"" uuid NOT NULL,
    ""IdempotencyKey"" text NOT NULL,
    ""RequestPath"" text NOT NULL,
    ""HttpMethod"" text NOT NULL,
    ""RequestHash"" text NOT NULL,
    ""StatusCode"" integer NOT NULL,
    ""ResponseBody"" text NOT NULL,
    ""ExpiresAtUtc"" timestamp with time zone NOT NULL,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""IsDeleted"" boolean NOT NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL,
    ""TenantId"" uuid NOT NULL,
    CONSTRAINT ""PK_IdempotentRequests"" PRIMARY KEY (""Id"")
);");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""Leads"" (
    ""Id"" uuid NOT NULL,
    ""Name"" text NOT NULL,
    ""BusinessName"" text NOT NULL,
    ""Mobile"" text NOT NULL,
    ""Email"" text NOT NULL,
    ""City"" text NOT NULL,
    ""BusinessType"" text NOT NULL,
    ""Message"" text NOT NULL,
    ""Source"" text NOT NULL,
    ""Status"" text NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""ContactedAt"" timestamp with time zone NULL,
    ""Notes"" text NOT NULL,
    CONSTRAINT ""PK_Leads"" PRIMARY KEY (""Id"")
);");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""PlatformCommercialConfigs"" (
    ""Id"" uuid NOT NULL,
    ""CoreAnnualPrice"" numeric NOT NULL,
    ""CoreBiennialPrice"" numeric NOT NULL,
    ""IncludedUsers"" integer NOT NULL,
    ""SingleUserAnnualPrice"" numeric NOT NULL,
    ""FiveUserPackAnnualPrice"" numeric NOT NULL,
    ""AiProAnnualPrice"" numeric NOT NULL,
    ""AiProMonthlyScanLimit"" integer NOT NULL,
    ""GstRatePercent"" numeric NOT NULL,
    ""IsActive"" boolean NOT NULL,
    ""LastUpdatedByEmail"" text NULL,
    ""Notes"" text NULL,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""IsDeleted"" boolean NOT NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL,
    CONSTRAINT ""PK_PlatformCommercialConfigs"" PRIMARY KEY (""Id"")
);");

            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_stock_movements_VariantId\" ON stock_movements (\"VariantId\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_SalesReturns_TenantId_CreditNoteNumber\" ON \"SalesReturns\" (\"TenantId\", \"CreditNoteNumber\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_SalesReturnItems_VariantId\" ON \"SalesReturnItems\" (\"VariantId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_sales_invoice_items_VariantId\" ON sales_invoice_items (\"VariantId\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_PurchaseReturns_TenantId_DebitNoteNumber\" ON \"PurchaseReturns\" (\"TenantId\", \"DebitNoteNumber\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_PurchaseReturnItems_VariantId\" ON \"PurchaseReturnItems\" (\"VariantId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_purchase_bill_items_VariantId\" ON purchase_bill_items (\"VariantId\");");

            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_item_warehouse_stocks_TenantId_ItemId_WarehouseId_BatchId\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId~\" ;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId_BatchId\";");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId_BatchId\" ON item_warehouse_stocks (\"TenantId\", \"ItemId\", \"VariantId\", \"WarehouseId\", \"BatchId\");");
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_item_warehouse_stocks_VariantId\" ON item_warehouse_stocks (\"VariantId\");");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_IdempotentRequests_TenantId_IdempotencyKey\" ON \"IdempotentRequests\" (\"TenantId\", \"IdempotencyKey\");");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_item_warehouse_stocks_item_variants_VariantId') THEN
        ALTER TABLE item_warehouse_stocks ADD CONSTRAINT ""FK_item_warehouse_stocks_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"") ON DELETE CASCADE;
    END IF;
END $$;");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_bill_items_item_variants_VariantId') THEN
        ALTER TABLE purchase_bill_items ADD CONSTRAINT ""FK_purchase_bill_items_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"") ON DELETE SET NULL;
    END IF;
END $$;");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_PurchaseReturnItems_item_variants_VariantId') THEN
        ALTER TABLE ""PurchaseReturnItems"" ADD CONSTRAINT ""FK_PurchaseReturnItems_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"");
    END IF;
END $$;");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sales_invoice_items_item_variants_VariantId') THEN
        ALTER TABLE sales_invoice_items ADD CONSTRAINT ""FK_sales_invoice_items_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"") ON DELETE RESTRICT;
    END IF;
END $$;");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SalesReturnItems_item_variants_VariantId') THEN
        ALTER TABLE ""SalesReturnItems"" ADD CONSTRAINT ""FK_SalesReturnItems_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"");
    END IF;
END $$;");

            migrationBuilder.Sql(@"
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_stock_movements_item_variants_VariantId') THEN
        ALTER TABLE stock_movements ADD CONSTRAINT ""FK_stock_movements_item_variants_VariantId"" FOREIGN KEY (""VariantId"") REFERENCES item_variants (""Id"") ON DELETE SET NULL;
    END IF;
END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_item_warehouse_stocks_item_variants_VariantId",
                table: "item_warehouse_stocks");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_bill_items_item_variants_VariantId",
                table: "purchase_bill_items");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseReturnItems_item_variants_VariantId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoice_items_item_variants_VariantId",
                table: "sales_invoice_items");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesReturnItems_item_variants_VariantId",
                table: "SalesReturnItems");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movements_item_variants_VariantId",
                table: "stock_movements");

            migrationBuilder.DropTable(
                name: "IdempotentRequests");

            migrationBuilder.DropTable(
                name: "Leads");

            migrationBuilder.DropTable(
                name: "PlatformCommercialConfigs");

            migrationBuilder.DropIndex(
                name: "IX_stock_movements_VariantId",
                table: "stock_movements");

            migrationBuilder.DropIndex(
                name: "IX_SalesReturns_TenantId_CreditNoteNumber",
                table: "SalesReturns");

            migrationBuilder.DropIndex(
                name: "IX_SalesReturnItems_VariantId",
                table: "SalesReturnItems");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoice_items_VariantId",
                table: "sales_invoice_items");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturns_TenantId_DebitNoteNumber",
                table: "PurchaseReturns");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseReturnItems_VariantId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropIndex(
                name: "IX_purchase_bill_items_VariantId",
                table: "purchase_bill_items");

            migrationBuilder.DropIndex(
                name: "IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId~",
                table: "item_warehouse_stocks");

            migrationBuilder.DropIndex(
                name: "IX_item_warehouse_stocks_VariantId",
                table: "item_warehouse_stocks");

            migrationBuilder.DropColumn(
                name: "ActiveIndustryModule",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "AiScansLimit",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "AiScansUsed",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IndustryActivatedAtUtc",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IndustryModuleStatus",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IndustryTypeCode",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IsAiAddonActive",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MaxAllowedUsers",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "stock_movements");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "sales_invoice_items");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "purchase_bill_items");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "item_warehouse_stocks");

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxRate",
                table: "items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.AlterColumn<decimal>(
                name: "CessRate",
                table: "items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4);

            migrationBuilder.CreateIndex(
                name: "IX_item_warehouse_stocks_TenantId_ItemId_WarehouseId_BatchId",
                table: "item_warehouse_stocks",
                columns: new[] { "TenantId", "ItemId", "WarehouseId", "BatchId" },
                unique: true);
        }
    }
}
