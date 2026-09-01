using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPartyLedgerEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "parties",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LegalName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TradeName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ContactPersonName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    PartyType = table.Column<int>(type: "integer", nullable: false),
                    CustomerType = table.Column<int>(type: "integer", nullable: true),
                    SupplierType = table.Column<int>(type: "integer", nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    PrimaryPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Mobile = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    SecondaryPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Website = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    GSTIN = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StateCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    PAN = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    TAN = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsCompositionScheme = table.Column<bool>(type: "boolean", nullable: false),
                    DrugLicenseNumber1 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DrugLicenseNumber2 = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FSSAINumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreditLimit = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CreditPeriodDays = table.Column<int>(type: "integer", nullable: false),
                    IsCreditBlocked = table.Column<bool>(type: "boolean", nullable: false),
                    PriceTier = table.Column<string>(type: "text", nullable: true),
                    OpeningBalance = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    OpeningBalanceType = table.Column<int>(type: "integer", nullable: false),
                    OpeningBalanceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CurrentOutstandingBalance = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
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
                    table.PrimaryKey("PK_parties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "party_addresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddressType = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AddressLine1 = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    AddressLine2 = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StateCode = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Pincode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ContactPerson = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ContactPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_party_addresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_party_addresses_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "party_ledger_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntryType = table.Column<int>(type: "integer", nullable: false),
                    DebitAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CreditAmount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RunningBalance = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceDocumentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferenceDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReferenceDocumentNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentMode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_party_ledger_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_party_ledger_entries_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_parties_TenantId_Code",
                table: "parties",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parties_TenantId_GSTIN",
                table: "parties",
                columns: new[] { "TenantId", "GSTIN" });

            migrationBuilder.CreateIndex(
                name: "IX_parties_TenantId_LegalName",
                table: "parties",
                columns: new[] { "TenantId", "LegalName" });

            migrationBuilder.CreateIndex(
                name: "IX_parties_TenantId_Mobile",
                table: "parties",
                columns: new[] { "TenantId", "Mobile" });

            migrationBuilder.CreateIndex(
                name: "IX_parties_TenantId_PartyType",
                table: "parties",
                columns: new[] { "TenantId", "PartyType" });

            migrationBuilder.CreateIndex(
                name: "IX_party_addresses_PartyId",
                table: "party_addresses",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_party_addresses_TenantId_PartyId",
                table: "party_addresses",
                columns: new[] { "TenantId", "PartyId" });

            migrationBuilder.CreateIndex(
                name: "IX_party_ledger_entries_PartyId",
                table: "party_ledger_entries",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_party_ledger_entries_TenantId_PartyId_TransactionDate",
                table: "party_ledger_entries",
                columns: new[] { "TenantId", "PartyId", "TransactionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_party_ledger_entries_TenantId_TransactionDate",
                table: "party_ledger_entries",
                columns: new[] { "TenantId", "TransactionDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "party_addresses");

            migrationBuilder.DropTable(
                name: "party_ledger_entries");

            migrationBuilder.DropTable(
                name: "parties");
        }
    }
}
