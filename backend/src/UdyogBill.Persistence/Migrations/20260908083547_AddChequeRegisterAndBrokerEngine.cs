using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChequeRegisterAndBrokerEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_stock_movements_TenantId_ItemId_WarehouseId_CreatedAtUtc",
                table: "stock_movements");

            migrationBuilder.AddColumn<Guid>(
                name: "BrokerId",
                table: "sales_invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "brokers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BrokerCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Mobile = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    PAN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    GSTIN = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CommissionBasis = table.Column<int>(type: "integer", nullable: false),
                    DefaultCommissionRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TdsPercent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    AccrualTrigger = table.Column<int>(type: "integer", nullable: false),
                    CurrentPayableBalance = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_brokers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cheque_registers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Direction = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ChequeNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BankName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    BranchName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ChequeDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DepositDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PresentationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClearingDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BouncedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BankAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceDocumentType = table.Column<string>(type: "text", nullable: true),
                    ReferenceDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceDocumentNumber = table.Column<string>(type: "text", nullable: true),
                    BounceReason = table.Column<string>(type: "text", nullable: true),
                    BounceChargesAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    IsBounceChargeBilledToParty = table.Column<bool>(type: "boolean", nullable: false),
                    Remarks = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_cheque_registers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cheque_registers_BankAccounts_BankAccountId",
                        column: x => x.BankAccountId,
                        principalTable: "BankAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "broker_commission_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BrokerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    SalesInvoiceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    PartyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BaseAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CommissionRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    GrossCommissionAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TdsAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    NetCommissionPayable = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaymentReference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
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
                    table.PrimaryKey("PK_broker_commission_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_broker_commission_entries_brokers_BrokerId",
                        column: x => x.BrokerId,
                        principalTable: "brokers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_BrokerId",
                table: "sales_invoices",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_invoices_TenantId_BrokerId",
                table: "sales_invoices",
                columns: new[] { "TenantId", "BrokerId" });

            migrationBuilder.CreateIndex(
                name: "IX_broker_commission_entries_BrokerId",
                table: "broker_commission_entries",
                column: "BrokerId");

            migrationBuilder.CreateIndex(
                name: "IX_broker_commission_entries_TenantId_BrokerId_TransactionDate",
                table: "broker_commission_entries",
                columns: new[] { "TenantId", "BrokerId", "TransactionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_broker_commission_entries_TenantId_SalesInvoiceId",
                table: "broker_commission_entries",
                columns: new[] { "TenantId", "SalesInvoiceId" });

            migrationBuilder.CreateIndex(
                name: "IX_broker_commission_entries_TenantId_Status",
                table: "broker_commission_entries",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_brokers_TenantId_BrokerCode",
                table: "brokers",
                columns: new[] { "TenantId", "BrokerCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_brokers_TenantId_FullName",
                table: "brokers",
                columns: new[] { "TenantId", "FullName" });

            migrationBuilder.CreateIndex(
                name: "IX_brokers_TenantId_Mobile",
                table: "brokers",
                columns: new[] { "TenantId", "Mobile" });

            migrationBuilder.CreateIndex(
                name: "IX_cheque_registers_BankAccountId",
                table: "cheque_registers",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_cheque_registers_TenantId_ChequeDate_Status",
                table: "cheque_registers",
                columns: new[] { "TenantId", "ChequeDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_cheque_registers_TenantId_ChequeNumber_BankName",
                table: "cheque_registers",
                columns: new[] { "TenantId", "ChequeNumber", "BankName" });

            migrationBuilder.CreateIndex(
                name: "IX_cheque_registers_TenantId_PartyId_Status",
                table: "cheque_registers",
                columns: new[] { "TenantId", "PartyId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_sales_invoices_brokers_BrokerId",
                table: "sales_invoices",
                column: "BrokerId",
                principalTable: "brokers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_invoices_brokers_BrokerId",
                table: "sales_invoices");

            migrationBuilder.DropTable(
                name: "broker_commission_entries");

            migrationBuilder.DropTable(
                name: "cheque_registers");

            migrationBuilder.DropTable(
                name: "brokers");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoices_BrokerId",
                table: "sales_invoices");

            migrationBuilder.DropIndex(
                name: "IX_sales_invoices_TenantId_BrokerId",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "BrokerId",
                table: "sales_invoices");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movements_TenantId_ItemId_WarehouseId_CreatedAtUtc",
                table: "stock_movements",
                columns: new[] { "TenantId", "ItemId", "WarehouseId", "CreatedAtUtc" });
        }
    }
}
