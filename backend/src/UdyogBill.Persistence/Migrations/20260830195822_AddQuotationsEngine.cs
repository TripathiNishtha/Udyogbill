using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotationsEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "quotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuotationNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CustomerPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CustomerGSTIN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    BillingAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ShippingAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BillingStateCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ShippingStateCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlaceOfSupply = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    QuotationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidUntilDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TaxSupplyType = table.Column<int>(type: "integer", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ItemDiscountTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    QuotationDiscountPercent = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    QuotationDiscountAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CessAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RoundOff = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ConvertedInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConvertedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_quotations_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotations_sales_invoices_ConvertedInvoiceId",
                        column: x => x.ConvertedInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_quotations_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "quotation_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuotationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemSku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    HsnCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UomId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
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
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotation_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_quotation_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_quotation_items_quotations_QuotationId",
                        column: x => x.QuotationId,
                        principalTable: "quotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quotation_items_units_of_measure_UomId",
                        column: x => x.UomId,
                        principalTable: "units_of_measure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quotation_items_ItemId",
                table: "quotation_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_quotation_items_QuotationId",
                table: "quotation_items",
                column: "QuotationId");

            migrationBuilder.CreateIndex(
                name: "IX_quotation_items_UomId",
                table: "quotation_items",
                column: "UomId");

            migrationBuilder.CreateIndex(
                name: "IX_quotations_BranchId",
                table: "quotations",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_quotations_ConvertedInvoiceId",
                table: "quotations",
                column: "ConvertedInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_quotations_PartyId",
                table: "quotations",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_quotations_TenantId_QuotationNumber",
                table: "quotations",
                columns: new[] { "TenantId", "QuotationNumber" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quotation_items");

            migrationBuilder.DropTable(
                name: "quotations");
        }
    }
}
