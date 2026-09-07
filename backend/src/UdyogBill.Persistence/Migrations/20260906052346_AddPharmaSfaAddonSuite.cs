using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPharmaSfaAddonSuite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPharmaSfaActive",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxAllowedManagerUsers",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxAllowedMrUsers",
                table: "tenants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ManagerSeatAnnualPrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ManagerSeatMonthlyPrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MrSeatAnnualPrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MrSeatMonthlyPrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PharmaSfaAnnualBasePrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PharmaSfaMonthlyBasePrice",
                table: "PlatformCommercialConfigs",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "SfaExpenseClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimNumber = table.Column<string>(type: "text", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    TotalClaimAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ApprovedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_SfaExpenseClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaExpenseClaims_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaMrTargets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    TargetSalesAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    AchievedSalesAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TargetDoctorCalls = table.Column<int>(type: "integer", nullable: false),
                    AchievedDoctorCalls = table.Column<int>(type: "integer", nullable: false),
                    TargetChemistCalls = table.Column<int>(type: "integer", nullable: false),
                    AchievedChemistCalls = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_SfaMrTargets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaMrTargets_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaPobOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderNumber = table.Column<string>(type: "text", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerPartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetStockistPartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    GrandTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ConvertedSalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClientOfflineId = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaPobOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaPobOrders_parties_CustomerPartyId",
                        column: x => x.CustomerPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaPobOrders_parties_TargetStockistPartyId",
                        column: x => x.TargetStockistPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaPobOrders_sales_invoices_ConvertedSalesInvoiceId",
                        column: x => x.ConvertedSalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaPobOrders_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaSampleChallans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChallanNumber = table.Column<string>(type: "text", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DispatchedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcknowledgedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_SfaSampleChallans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSampleChallans_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaSampleStocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: false),
                    ExpiryMonthYear = table.Column<string>(type: "text", nullable: false),
                    QuantityAllocated = table.Column<decimal>(type: "numeric", nullable: false),
                    QuantityDistributed = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_SfaSampleStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSampleStocks_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaSampleStocks_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaTerritories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ParentTerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    State = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    CoveredPincodes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaTerritories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaTerritories_SfaTerritories_ParentTerritoryId",
                        column: x => x.ParentTerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SfaTourPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ManagerRemarks = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaTourPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaTourPlans_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaExpenseClaimItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpenseClaimId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpenseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpenseType = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    KmsTravelled = table.Column<decimal>(type: "numeric", nullable: false),
                    FromLocation = table.Column<string>(type: "text", nullable: true),
                    ToLocation = table.Column<string>(type: "text", nullable: true),
                    ReceiptAttachmentUrl = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaExpenseClaimItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaExpenseClaimItems_SfaExpenseClaims_ExpenseClaimId",
                        column: x => x.ExpenseClaimId,
                        principalTable: "SfaExpenseClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaPobOrderItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PobOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    FreeQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxRatePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_SfaPobOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaPobOrderItems_SfaPobOrders_PobOrderId",
                        column: x => x.PobOrderId,
                        principalTable: "SfaPobOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaPobOrderItems_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaSampleChallanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SampleChallanId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: false),
                    ExpiryMonthYear = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_SfaSampleChallanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSampleChallanItems_SfaSampleChallans_SampleChallanId",
                        column: x => x.SampleChallanId,
                        principalTable: "SfaSampleChallans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaSampleChallanItems_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaChemists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    ShopName = table.Column<string>(type: "text", nullable: false),
                    ContactPerson = table.Column<string>(type: "text", nullable: false),
                    DrugLicenseNumber = table.Column<string>(type: "text", nullable: false),
                    GSTIN = table.Column<string>(type: "text", nullable: true),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: true),
                    Pincode = table.Column<string>(type: "text", nullable: true),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedMrUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    PreferredStockistPartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    PotentialCategory = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_SfaChemists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaChemists_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaChemists_parties_PreferredStockistPartyId",
                        column: x => x.PreferredStockistPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaChemists_users_AssignedMrUserId",
                        column: x => x.AssignedMrUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SfaDoctors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Specialty = table.Column<string>(type: "text", nullable: false),
                    Qualification = table.Column<string>(type: "text", nullable: false),
                    RegistrationNumber = table.Column<string>(type: "text", nullable: false),
                    ClinicHospitalName = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: true),
                    Pincode = table.Column<string>(type: "text", nullable: true),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedMrUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Classification = table.Column<string>(type: "text", nullable: false),
                    VisitFrequencyPerMonth = table.Column<int>(type: "integer", nullable: false),
                    EstimatedMonthlyPotential = table.Column<decimal>(type: "numeric", nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WeddingAnniversary = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_SfaDoctors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaDoctors_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaDoctors_users_AssignedMrUserId",
                        column: x => x.AssignedMrUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SfaEmployeeProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeCode = table.Column<string>(type: "text", nullable: false),
                    DesignationRole = table.Column<int>(type: "integer", nullable: false),
                    DesignationTitle = table.Column<string>(type: "text", nullable: false),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReportingToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    HeadquarterCity = table.Column<string>(type: "text", nullable: false),
                    JoiningDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DailyAllowanceRate = table.Column<decimal>(type: "numeric", nullable: false),
                    MonthlyExpenseLimit = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_SfaEmployeeProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaEmployeeProfiles_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaEmployeeProfiles_users_ReportingToUserId",
                        column: x => x.ReportingToUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaEmployeeProfiles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaSalesAttributions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StockistPartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ManagerUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceTotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    AttributedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AttributionMethod = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_SfaSalesAttributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaSalesAttributions_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaSalesAttributions_parties_StockistPartyId",
                        column: x => x.StockistPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaSalesAttributions_sales_invoices_SalesInvoiceId",
                        column: x => x.SalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaSalesAttributions_users_ManagerUserId",
                        column: x => x.ManagerUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaSalesAttributions_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaStockistAllocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StockistPartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    EffectiveFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AllocationType = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_SfaStockistAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaStockistAllocations_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaStockistAllocations_parties_StockistPartyId",
                        column: x => x.StockistPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaStockistAllocations_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaTourPlanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TourPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RouteOrBeatName = table.Column<string>(type: "text", nullable: false),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    PlannedDoctorCalls = table.Column<int>(type: "integer", nullable: false),
                    PlannedChemistCalls = table.Column<int>(type: "integer", nullable: false),
                    PlannedStockistCalls = table.Column<int>(type: "integer", nullable: false),
                    TargetDoctorIdsJson = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaTourPlanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaTourPlanItems_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaTourPlanItems_SfaTourPlans_TourPlanId",
                        column: x => x.TourPlanId,
                        principalTable: "SfaTourPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaDailyCallReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DcrNumber = table.Column<string>(type: "text", nullable: false),
                    DcrDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MrUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TourPlanItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    AttendanceStatus = table.Column<string>(type: "text", nullable: false),
                    WorkType = table.Column<string>(type: "text", nullable: false),
                    AccompaniedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    RouteOrArea = table.Column<string>(type: "text", nullable: false),
                    DayStartTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DayEndTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartLatitude = table.Column<double>(type: "double precision", nullable: true),
                    StartLongitude = table.Column<double>(type: "double precision", nullable: true),
                    EndLatitude = table.Column<double>(type: "double precision", nullable: true),
                    EndLongitude = table.Column<double>(type: "double precision", nullable: true),
                    TotalDoctorsVisited = table.Column<int>(type: "integer", nullable: false),
                    TotalChemistsVisited = table.Column<int>(type: "integer", nullable: false),
                    TotalStockistsVisited = table.Column<int>(type: "integer", nullable: false),
                    TotalPobBookedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ManagerRemarks = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaDailyCallReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaDailyCallReports_SfaTerritories_TerritoryId",
                        column: x => x.TerritoryId,
                        principalTable: "SfaTerritories",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaDailyCallReports_SfaTourPlanItems_TourPlanItemId",
                        column: x => x.TourPlanItemId,
                        principalTable: "SfaTourPlanItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaDailyCallReports_users_AccompaniedByUserId",
                        column: x => x.AccompaniedByUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SfaDailyCallReports_users_MrUserId",
                        column: x => x.MrUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaDcrChemistVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyCallReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChemistId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    IsGpsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    PobOrderBooked = table.Column<bool>(type: "boolean", nullable: false),
                    PobOrderAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Feedback = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaDcrChemistVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaDcrChemistVisits_SfaChemists_ChemistId",
                        column: x => x.ChemistId,
                        principalTable: "SfaChemists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaDcrChemistVisits_SfaDailyCallReports_DailyCallReportId",
                        column: x => x.DailyCallReportId,
                        principalTable: "SfaDailyCallReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaDcrDoctorVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyCallReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: true),
                    Longitude = table.Column<double>(type: "double precision", nullable: true),
                    IsGpsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    ProductsDetailedJson = table.Column<string>(type: "text", nullable: true),
                    SamplesGivenJson = table.Column<string>(type: "text", nullable: true),
                    GiftsGivenJson = table.Column<string>(type: "text", nullable: true),
                    DoctorFeedback = table.Column<string>(type: "text", nullable: true),
                    NextVisitDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_SfaDcrDoctorVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaDcrDoctorVisits_SfaDailyCallReports_DailyCallReportId",
                        column: x => x.DailyCallReportId,
                        principalTable: "SfaDailyCallReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaDcrDoctorVisits_SfaDoctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "SfaDoctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SfaDcrStockistVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyCallReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    StockistPartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaymentCollectedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ChequeOrUpiRef = table.Column<string>(type: "text", nullable: true),
                    OutstandingReviewRemarks = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SfaDcrStockistVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SfaDcrStockistVisits_SfaDailyCallReports_DailyCallReportId",
                        column: x => x.DailyCallReportId,
                        principalTable: "SfaDailyCallReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SfaDcrStockistVisits_parties_StockistPartyId",
                        column: x => x.StockistPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SfaChemists_AssignedMrUserId",
                table: "SfaChemists",
                column: "AssignedMrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaChemists_PreferredStockistPartyId",
                table: "SfaChemists",
                column: "PreferredStockistPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaChemists_TerritoryId",
                table: "SfaChemists",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDailyCallReports_AccompaniedByUserId",
                table: "SfaDailyCallReports",
                column: "AccompaniedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDailyCallReports_MrUserId",
                table: "SfaDailyCallReports",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDailyCallReports_TerritoryId",
                table: "SfaDailyCallReports",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDailyCallReports_TourPlanItemId",
                table: "SfaDailyCallReports",
                column: "TourPlanItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrChemistVisits_ChemistId",
                table: "SfaDcrChemistVisits",
                column: "ChemistId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrChemistVisits_DailyCallReportId",
                table: "SfaDcrChemistVisits",
                column: "DailyCallReportId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrDoctorVisits_DailyCallReportId",
                table: "SfaDcrDoctorVisits",
                column: "DailyCallReportId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrDoctorVisits_DoctorId",
                table: "SfaDcrDoctorVisits",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrStockistVisits_DailyCallReportId",
                table: "SfaDcrStockistVisits",
                column: "DailyCallReportId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDcrStockistVisits_StockistPartyId",
                table: "SfaDcrStockistVisits",
                column: "StockistPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDoctors_AssignedMrUserId",
                table: "SfaDoctors",
                column: "AssignedMrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaDoctors_TerritoryId",
                table: "SfaDoctors",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaEmployeeProfiles_ReportingToUserId",
                table: "SfaEmployeeProfiles",
                column: "ReportingToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaEmployeeProfiles_TerritoryId",
                table: "SfaEmployeeProfiles",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaEmployeeProfiles_UserId",
                table: "SfaEmployeeProfiles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaExpenseClaimItems_ExpenseClaimId",
                table: "SfaExpenseClaimItems",
                column: "ExpenseClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaExpenseClaims_MrUserId",
                table: "SfaExpenseClaims",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaMrTargets_MrUserId",
                table: "SfaMrTargets",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrderItems_ItemId",
                table: "SfaPobOrderItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrderItems_PobOrderId",
                table: "SfaPobOrderItems",
                column: "PobOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrders_ConvertedSalesInvoiceId",
                table: "SfaPobOrders",
                column: "ConvertedSalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrders_CustomerPartyId",
                table: "SfaPobOrders",
                column: "CustomerPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrders_MrUserId",
                table: "SfaPobOrders",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaPobOrders_TargetStockistPartyId",
                table: "SfaPobOrders",
                column: "TargetStockistPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSalesAttributions_ManagerUserId",
                table: "SfaSalesAttributions",
                column: "ManagerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSalesAttributions_MrUserId",
                table: "SfaSalesAttributions",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSalesAttributions_SalesInvoiceId",
                table: "SfaSalesAttributions",
                column: "SalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSalesAttributions_StockistPartyId",
                table: "SfaSalesAttributions",
                column: "StockistPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSalesAttributions_TerritoryId",
                table: "SfaSalesAttributions",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSampleChallanItems_ItemId",
                table: "SfaSampleChallanItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSampleChallanItems_SampleChallanId",
                table: "SfaSampleChallanItems",
                column: "SampleChallanId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSampleChallans_MrUserId",
                table: "SfaSampleChallans",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSampleStocks_ItemId",
                table: "SfaSampleStocks",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaSampleStocks_MrUserId",
                table: "SfaSampleStocks",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaStockistAllocations_MrUserId",
                table: "SfaStockistAllocations",
                column: "MrUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaStockistAllocations_StockistPartyId",
                table: "SfaStockistAllocations",
                column: "StockistPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaStockistAllocations_TerritoryId",
                table: "SfaStockistAllocations",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaTerritories_ParentTerritoryId",
                table: "SfaTerritories",
                column: "ParentTerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaTourPlanItems_TerritoryId",
                table: "SfaTourPlanItems",
                column: "TerritoryId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaTourPlanItems_TourPlanId",
                table: "SfaTourPlanItems",
                column: "TourPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_SfaTourPlans_MrUserId",
                table: "SfaTourPlans",
                column: "MrUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SfaDcrChemistVisits");

            migrationBuilder.DropTable(
                name: "SfaDcrDoctorVisits");

            migrationBuilder.DropTable(
                name: "SfaDcrStockistVisits");

            migrationBuilder.DropTable(
                name: "SfaEmployeeProfiles");

            migrationBuilder.DropTable(
                name: "SfaExpenseClaimItems");

            migrationBuilder.DropTable(
                name: "SfaMrTargets");

            migrationBuilder.DropTable(
                name: "SfaPobOrderItems");

            migrationBuilder.DropTable(
                name: "SfaSalesAttributions");

            migrationBuilder.DropTable(
                name: "SfaSampleChallanItems");

            migrationBuilder.DropTable(
                name: "SfaSampleStocks");

            migrationBuilder.DropTable(
                name: "SfaStockistAllocations");

            migrationBuilder.DropTable(
                name: "SfaChemists");

            migrationBuilder.DropTable(
                name: "SfaDoctors");

            migrationBuilder.DropTable(
                name: "SfaDailyCallReports");

            migrationBuilder.DropTable(
                name: "SfaExpenseClaims");

            migrationBuilder.DropTable(
                name: "SfaPobOrders");

            migrationBuilder.DropTable(
                name: "SfaSampleChallans");

            migrationBuilder.DropTable(
                name: "SfaTourPlanItems");

            migrationBuilder.DropTable(
                name: "SfaTerritories");

            migrationBuilder.DropTable(
                name: "SfaTourPlans");

            migrationBuilder.DropColumn(
                name: "IsPharmaSfaActive",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MaxAllowedManagerUsers",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "MaxAllowedMrUsers",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ManagerSeatAnnualPrice",
                table: "PlatformCommercialConfigs");

            migrationBuilder.DropColumn(
                name: "ManagerSeatMonthlyPrice",
                table: "PlatformCommercialConfigs");

            migrationBuilder.DropColumn(
                name: "MrSeatAnnualPrice",
                table: "PlatformCommercialConfigs");

            migrationBuilder.DropColumn(
                name: "MrSeatMonthlyPrice",
                table: "PlatformCommercialConfigs");

            migrationBuilder.DropColumn(
                name: "PharmaSfaAnnualBasePrice",
                table: "PlatformCommercialConfigs");

            migrationBuilder.DropColumn(
                name: "PharmaSfaMonthlyBasePrice",
                table: "PlatformCommercialConfigs");
        }
    }
}
