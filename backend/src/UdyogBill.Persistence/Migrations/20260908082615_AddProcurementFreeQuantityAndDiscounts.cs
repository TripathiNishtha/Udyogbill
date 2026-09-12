using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcurementFreeQuantityAndDiscounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CashDiscountPercent",
                table: "purchase_order_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FreeQuantity",
                table: "purchase_order_items",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SchemeDiscountPercent",
                table: "purchase_order_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CashDiscountPercent",
                table: "purchase_bill_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FreeQuantity",
                table: "purchase_bill_items",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SchemeDiscountPercent",
                table: "purchase_bill_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CitySlug",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Leads",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AcceptedFreeQuantity",
                table: "goods_receipt_note_items",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReceivedFreeQuantity",
                table: "goods_receipt_note_items",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "ReferralProgramConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    RewardType = table.Column<int>(type: "integer", nullable: false),
                    DefaultRewardAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PayoutScheduleDays = table.Column<int>(type: "integer", nullable: false),
                    MinimumPayoutThreshold = table.Column<decimal>(type: "numeric", nullable: false),
                    TermsAndConditions = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_ReferralProgramConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantReferralConversions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferrerTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RefereeTenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferralCodeUsed = table.Column<string>(type: "text", nullable: false),
                    RegistrationDateUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    FirstPaidDateUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SubscriptionInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubscriptionAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    CommissionRewardAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ScheduledPayoutDateUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PaidAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PayoutReference = table.Column<string>(type: "text", nullable: true),
                    PayoutMode = table.Column<string>(type: "text", nullable: true),
                    AdminNotes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_TenantReferralConversions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantReferralConversions_tenants_RefereeTenantId",
                        column: x => x.RefereeTenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantReferralConversions_tenants_ReferrerTenantId",
                        column: x => x.ReferrerTenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TenantReferralProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReferralCode = table.Column<string>(type: "text", nullable: false),
                    CustomRewardAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    UpiId = table.Column<string>(type: "text", nullable: true),
                    BankName = table.Column<string>(type: "text", nullable: true),
                    BankAccountNumber = table.Column<string>(type: "text", nullable: true),
                    BankIfsc = table.Column<string>(type: "text", nullable: true),
                    AccountHolderName = table.Column<string>(type: "text", nullable: true),
                    TotalReferralsCount = table.Column<int>(type: "integer", nullable: false),
                    PaidConversionsCount = table.Column<int>(type: "integer", nullable: false),
                    TotalEarnedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalPaidOutAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PendingBalanceAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_TenantReferralProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantReferralProfiles_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantReferralConversions_RefereeTenantId",
                table: "TenantReferralConversions",
                column: "RefereeTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantReferralConversions_ReferrerTenantId",
                table: "TenantReferralConversions",
                column: "ReferrerTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantReferralProfiles_TenantId",
                table: "TenantReferralProfiles",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferralProgramConfigs");

            migrationBuilder.DropTable(
                name: "TenantReferralConversions");

            migrationBuilder.DropTable(
                name: "TenantReferralProfiles");

            migrationBuilder.DropColumn(
                name: "CashDiscountPercent",
                table: "purchase_order_items");

            migrationBuilder.DropColumn(
                name: "FreeQuantity",
                table: "purchase_order_items");

            migrationBuilder.DropColumn(
                name: "SchemeDiscountPercent",
                table: "purchase_order_items");

            migrationBuilder.DropColumn(
                name: "CashDiscountPercent",
                table: "purchase_bill_items");

            migrationBuilder.DropColumn(
                name: "FreeQuantity",
                table: "purchase_bill_items");

            migrationBuilder.DropColumn(
                name: "SchemeDiscountPercent",
                table: "purchase_bill_items");

            migrationBuilder.DropColumn(
                name: "CitySlug",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "AcceptedFreeQuantity",
                table: "goods_receipt_note_items");

            migrationBuilder.DropColumn(
                name: "ReceivedFreeQuantity",
                table: "goods_receipt_note_items");
        }
    }
}
