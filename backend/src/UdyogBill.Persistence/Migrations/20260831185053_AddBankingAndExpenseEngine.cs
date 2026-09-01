using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankingAndExpenseEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsQuarantined",
                table: "item_batches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Ptr",
                table: "item_batches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Pts",
                table: "item_batches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "QuarantinedStock",
                table: "item_batches",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "RackLocation",
                table: "item_batches",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplierId",
                table: "item_batches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AnnualPrice",
                table: "add_ons",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "DoctorPrescribers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Qualification = table.Column<string>(type: "text", nullable: false),
                    Specialization = table.Column<string>(type: "text", nullable: false),
                    RegistrationNumber = table.Column<string>(type: "text", nullable: false),
                    ClinicHospitalName = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    IncentivePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    AssignedMrName = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_DoctorPrescribers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExpiryReturnClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimNumber = table.Column<string>(type: "text", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierName = table.Column<string>(type: "text", nullable: false),
                    ClaimDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalClaimAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SupplierCreditNoteNumber = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_ExpiryReturnClaims", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentGatewayConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<string>(type: "text", nullable: false),
                    KeyId = table.Column<string>(type: "text", nullable: false),
                    KeySecret = table.Column<string>(type: "text", nullable: false),
                    WebhookSecret = table.Column<string>(type: "text", nullable: true),
                    Mode = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    AdditionalSettingsJson = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_PaymentGatewayConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformCompanyProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LegalCompanyName = table.Column<string>(type: "text", nullable: false),
                    ProductBrandName = table.Column<string>(type: "text", nullable: false),
                    Tagline = table.Column<string>(type: "text", nullable: false),
                    Gstin = table.Column<string>(type: "text", nullable: false),
                    Pan = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: false),
                    StateCode = table.Column<string>(type: "text", nullable: false),
                    AddressLine1 = table.Column<string>(type: "text", nullable: false),
                    AddressLine2 = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: false),
                    Pincode = table.Column<string>(type: "text", nullable: false),
                    SupportEmail = table.Column<string>(type: "text", nullable: false),
                    SupportPhone = table.Column<string>(type: "text", nullable: false),
                    Website = table.Column<string>(type: "text", nullable: false),
                    BankName = table.Column<string>(type: "text", nullable: false),
                    BankAccountNumber = table.Column<string>(type: "text", nullable: false),
                    BankIfsc = table.Column<string>(type: "text", nullable: false),
                    BankBranch = table.Column<string>(type: "text", nullable: false),
                    UpiId = table.Column<string>(type: "text", nullable: true),
                    UpiQrImageUrl = table.Column<string>(type: "text", nullable: true),
                    LogoUrl = table.Column<string>(type: "text", nullable: true),
                    SignatoryImageUrl = table.Column<string>(type: "text", nullable: true),
                    AuthorizedSignatoryName = table.Column<string>(type: "text", nullable: false),
                    AuthorizedSignatoryDesignation = table.Column<string>(type: "text", nullable: false),
                    InvoicePrefix = table.Column<string>(type: "text", nullable: false),
                    InvoiceTermsAndConditions = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_PlatformCompanyProfiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformEmailConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SmtpHost = table.Column<string>(type: "text", nullable: false),
                    SmtpPort = table.Column<int>(type: "integer", nullable: false),
                    SmtpUsername = table.Column<string>(type: "text", nullable: false),
                    SmtpPassword = table.Column<string>(type: "text", nullable: false),
                    FromEmail = table.Column<string>(type: "text", nullable: false),
                    FromName = table.Column<string>(type: "text", nullable: false),
                    ReplyToEmail = table.Column<string>(type: "text", nullable: true),
                    EnableSsl = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_PlatformEmailConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformPasswordResetOtps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    OtpCode = table.Column<string>(type: "text", nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_PlatformPasswordResetOtps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SaltMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SaltName = table.Column<string>(type: "text", nullable: false),
                    TherapeuticCategory = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    SideEffectsAlert = table.Column<string>(type: "text", nullable: true),
                    IsHabitForming = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_SaltMasters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScheduleH1RegisterEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    SupplyDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PatientName = table.Column<string>(type: "text", nullable: false),
                    PatientAddressPhone = table.Column<string>(type: "text", nullable: false),
                    PrescriberDoctorName = table.Column<string>(type: "text", nullable: false),
                    PrescriberRegNumber = table.Column<string>(type: "text", nullable: false),
                    DrugName = table.Column<string>(type: "text", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: false),
                    QuantitySupplied = table.Column<decimal>(type: "numeric", nullable: false),
                    ManufacturerName = table.Column<string>(type: "text", nullable: false),
                    SignOffStatus = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_ScheduleH1RegisterEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionInvoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    InvoiceDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TenantBusinessName = table.Column<string>(type: "text", nullable: false),
                    TenantGstin = table.Column<string>(type: "text", nullable: true),
                    TenantPan = table.Column<string>(type: "text", nullable: true),
                    TenantBillingAddress = table.Column<string>(type: "text", nullable: true),
                    TenantEmail = table.Column<string>(type: "text", nullable: true),
                    TenantPhone = table.Column<string>(type: "text", nullable: true),
                    ItemDescription = table.Column<string>(type: "text", nullable: false),
                    PlanCode = table.Column<string>(type: "text", nullable: true),
                    AddonCode = table.Column<string>(type: "text", nullable: true),
                    BillingCycle = table.Column<string>(type: "text", nullable: false),
                    DurationDays = table.Column<int>(type: "integer", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxRatePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    IsInterState = table.Column<bool>(type: "boolean", nullable: false),
                    CgstRatePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    CgstAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    SgstRatePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    SgstAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IgstRatePercent = table.Column<decimal>(type: "numeric", nullable: false),
                    IgstAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PlaceOfSupply = table.Column<string>(type: "text", nullable: true),
                    SupplierLegalName = table.Column<string>(type: "text", nullable: true),
                    SupplierGstin = table.Column<string>(type: "text", nullable: true),
                    SupplierAddress = table.Column<string>(type: "text", nullable: true),
                    SupplierStateCode = table.Column<string>(type: "text", nullable: true),
                    SubscriberStateCode = table.Column<string>(type: "text", nullable: true),
                    PaymentGateway = table.Column<string>(type: "text", nullable: false),
                    GatewayOrderId = table.Column<string>(type: "text", nullable: true),
                    GatewayPaymentId = table.Column<string>(type: "text", nullable: true),
                    GatewaySignature = table.Column<string>(type: "text", nullable: true),
                    PaymentStatus = table.Column<string>(type: "text", nullable: false),
                    PaidAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_SubscriptionInvoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExpiryReturnClaimItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiryReturnClaimId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemBatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    ItemName = table.Column<string>(type: "text", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: false),
                    ExpiryDateMonthYear = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    PurchaseRate = table.Column<decimal>(type: "numeric", nullable: false),
                    ClaimAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_ExpiryReturnClaimItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpiryReturnClaimItems_ExpiryReturnClaims_ExpiryReturnClaim~",
                        column: x => x.ExpiryReturnClaimId,
                        principalTable: "ExpiryReturnClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExpiryReturnClaimItems_item_batches_ItemBatchId",
                        column: x => x.ItemBatchId,
                        principalTable: "item_batches",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ItemSaltCompositions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    SaltId = table.Column<Guid>(type: "uuid", nullable: false),
                    Strength = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_ItemSaltCompositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemSaltCompositions_SaltMasters_SaltId",
                        column: x => x.SaltId,
                        principalTable: "SaltMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItemSaltCompositions_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpiryReturnClaimItems_ExpiryReturnClaimId",
                table: "ExpiryReturnClaimItems",
                column: "ExpiryReturnClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpiryReturnClaimItems_ItemBatchId",
                table: "ExpiryReturnClaimItems",
                column: "ItemBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemSaltCompositions_ItemId",
                table: "ItemSaltCompositions",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemSaltCompositions_SaltId",
                table: "ItemSaltCompositions",
                column: "SaltId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DoctorPrescribers");

            migrationBuilder.DropTable(
                name: "ExpiryReturnClaimItems");

            migrationBuilder.DropTable(
                name: "ItemSaltCompositions");

            migrationBuilder.DropTable(
                name: "PaymentGatewayConfigs");

            migrationBuilder.DropTable(
                name: "PlatformCompanyProfiles");

            migrationBuilder.DropTable(
                name: "PlatformEmailConfigs");

            migrationBuilder.DropTable(
                name: "PlatformPasswordResetOtps");

            migrationBuilder.DropTable(
                name: "ScheduleH1RegisterEntries");

            migrationBuilder.DropTable(
                name: "SubscriptionInvoices");

            migrationBuilder.DropTable(
                name: "ExpiryReturnClaims");

            migrationBuilder.DropTable(
                name: "SaltMasters");

            migrationBuilder.DropColumn(
                name: "IsQuarantined",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "Ptr",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "Pts",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "QuarantinedStock",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "RackLocation",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "item_batches");

            migrationBuilder.DropColumn(
                name: "AnnualPrice",
                table: "add_ons");
        }
    }
}
