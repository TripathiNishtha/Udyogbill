using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPharmaSfaSprint5CommercialSchemesAndSecondarySales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "SfaUserHierarchies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpectedDeliveryDate",
                table: "SfaPobOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StockistFulfillmentStatus",
                table: "SfaPobOrders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StockistRemarks",
                table: "SfaPobOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AppliedSchemeId",
                table: "SfaPobOrderItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AppliedSchemeName",
                table: "SfaPobOrderItems",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SfaSchemeMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeCode = table.Column<string>(type: "text", nullable: false),
                    SchemeName = table.Column<string>(type: "text", nullable: false),
                    DivisionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    SchemeType = table.Column<int>(type: "integer", nullable: false),
                    ValidFromUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidToUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MinimumOrderQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    MinimumOrderValue = table.Column<decimal>(type: "numeric", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaSchemeMasters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSchemeMasters_SfaDivisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "SfaDivisions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaSchemeMasters_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SfaSchemeSlabs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeMasterId = table.Column<Guid>(type: "uuid", nullable: false),
                    MinQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    MaxQuantity = table.Column<decimal>(type: "numeric", nullable: true),
                    FreeQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric", nullable: false),
                    FlatDiscountAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    FreeItemId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("PK_SfaSchemeSlabs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSchemeSlabs_SfaSchemeMasters_SchemeMasterId",
                        column: x => x.SchemeMasterId,
                        principalTable: "SfaSchemeMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaSchemeSlabs_items_FreeItemId",
                        column: x => x.FreeItemId,
                        principalTable: "items",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_SfaSchemeMasters_DivisionId",
                table: "SfaSchemeMasters",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSchemeMasters_ItemId",
                table: "SfaSchemeMasters",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSchemeSlabs_FreeItemId",
                table: "SfaSchemeSlabs",
                column: "FreeItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSchemeSlabs_SchemeMasterId",
                table: "SfaSchemeSlabs",
                column: "SchemeMasterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SfaSchemeSlabs");

            migrationBuilder.DropTable(
                name: "SfaSchemeMasters");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "SfaUserHierarchies");

            migrationBuilder.DropColumn(
                name: "ExpectedDeliveryDate",
                table: "SfaPobOrders");

            migrationBuilder.DropColumn(
                name: "StockistFulfillmentStatus",
                table: "SfaPobOrders");

            migrationBuilder.DropColumn(
                name: "StockistRemarks",
                table: "SfaPobOrders");

            migrationBuilder.DropColumn(
                name: "AppliedSchemeId",
                table: "SfaPobOrderItems");

            migrationBuilder.DropColumn(
                name: "AppliedSchemeName",
                table: "SfaPobOrderItems");
        }
    }
}
