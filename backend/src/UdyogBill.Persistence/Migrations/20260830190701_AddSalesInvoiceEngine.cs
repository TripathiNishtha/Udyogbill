using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesInvoiceEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sales_invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InvoiceType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CustomerPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CustomerGSTIN = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CustomerPAN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    BillingAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ShippingAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BillingStateCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    ShippingStateCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    PlaceOfSupply = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TaxSupplyType = table.Column<int>(type: "integer", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ItemDiscountTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    InvoiceDiscountPercent = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    InvoiceDiscountAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RoundOff = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    BalanceAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PrimaryPaymentMode = table.Column<int>(type: "integer", nullable: false),
                    PaymentStatus = table.Column<int>(type: "integer", nullable: false),
                    PaymentReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TermsAndConditions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    CancellationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CancelledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_sales_invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_invoices_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_invoices_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_invoices_tenant_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sales_invoice_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HsnCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Barcode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UomCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Mrp = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    AttributesJson = table.Column<string>(type: "jsonb", nullable: false),
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
                    table.PrimaryKey("PK_sales_invoice_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_invoice_items_item_batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_invoice_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_invoice_items_sales_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_invoice_items_units_of_measure_UomId",
                        column: x => x.UomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sales_invoice_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    PaymentMode = table.Column<int>(type: "integer", nullable: false),
                    TransactionReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_sales_invoice_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_invoice_payments_sales_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_BatchId",
                table: "sales_invoice_items",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_InvoiceId",
                table: "sales_invoice_items",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_ItemId",
                table: "sales_invoice_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_TenantId_InvoiceId",
                table: "sales_invoice_items",
                columns: new[] { "TenantId", "InvoiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_TenantId_ItemId",
                table: "sales_invoice_items",
                columns: new[] { "TenantId", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_items_UomId",
                table: "sales_invoice_items",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_payments_InvoiceId",
                table: "sales_invoice_payments",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoice_payments_TenantId_InvoiceId",
                table: "sales_invoice_payments",
                columns: new[] { "TenantId", "InvoiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_BranchId",
                table: "sales_invoices",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_PartyId",
                table: "sales_invoices",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_BranchId_InvoiceDate",
                table: "sales_invoices",
                columns: new[] { "TenantId", "BranchId", "InvoiceDate" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_InvoiceDate",
                table: "sales_invoices",
                columns: new[] { "TenantId", "InvoiceDate" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_InvoiceNumber",
                table: "sales_invoices",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_PartyId",
                table: "sales_invoices",
                columns: new[] { "TenantId", "PartyId" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_Status",
                table: "sales_invoices",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_WarehouseId",
                table: "sales_invoices",
                column: "WarehouseId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sales_invoice_items");

            migrationBuilder.DropTable(
                name: "sales_invoice_payments");

            migrationBuilder.DropTable(
                name: "sales_invoices");
        }
    }
}
