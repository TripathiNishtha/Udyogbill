using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInternalSalesForceAndDeviceSecurity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApparelSubType",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HardwareSubType",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCompositionScheme",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentTenantId",
                table: "tenants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AdjustedInvoiceId",
                table: "SalesReturns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AdjustedInvoiceNumber",
                table: "SalesReturns",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "SalesReturns",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "SalesReturns",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CashRefundedAmount",
                table: "SalesReturns",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundDate",
                table: "SalesReturns",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundMode",
                table: "SalesReturns",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundStatus",
                table: "SalesReturns",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RefundTransactionRef",
                table: "SalesReturns",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CgstAmount",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CgstRate",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstAmount",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstRate",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstAmount",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstRate",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxableAmount",
                table: "SalesReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CgstAmount",
                table: "PurchaseReturns",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstAmount",
                table: "PurchaseReturns",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ReturnType",
                table: "PurchaseReturns",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "SgstAmount",
                table: "PurchaseReturns",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CgstAmount",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CgstRate",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstAmount",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "IgstRate",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstAmount",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstRate",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxableAmount",
                table: "PurchaseReturnItems",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxCompanies",
                table: "plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsInstalled",
                table: "MobileDeviceRegistrations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UninstalledAt",
                table: "MobileDeviceRegistrations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gstin",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InvoiceCount",
                table: "Leads",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActiveAt",
                table: "Leads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LastInvoiceAmount",
                table: "Leads",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHidden",
                table: "add_ons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AdvancePayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    AllocatedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMode = table.Column<int>(type: "integer", nullable: false),
                    ReceiptDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Direction = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_AdvancePayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdvancePayments_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BatteryScrapBuybacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    OldBatteryBrand = table.Column<string>(type: "text", nullable: false),
                    OldAhCapacity = table.Column<string>(type: "text", nullable: false),
                    ScrapWeightKg = table.Column<decimal>(type: "numeric", nullable: false),
                    ScrapCreditAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    HsnCode = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_BatteryScrapBuybacks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BlogPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Excerpt = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    FeaturedImage = table.Column<string>(type: "text", nullable: true),
                    CategoryId = table.Column<string>(type: "text", nullable: true),
                    CategoryName = table.Column<string>(type: "text", nullable: false),
                    AuthorName = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PublishedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MetaTitle = table.Column<string>(type: "text", nullable: false),
                    MetaDescription = table.Column<string>(type: "text", nullable: false),
                    MetaKeywords = table.Column<string>(type: "text", nullable: false),
                    FocusKeyword = table.Column<string>(type: "text", nullable: false),
                    CanonicalUrl = table.Column<string>(type: "text", nullable: true),
                    OgTitle = table.Column<string>(type: "text", nullable: true),
                    OgDescription = table.Column<string>(type: "text", nullable: true),
                    OgImage = table.Column<string>(type: "text", nullable: true),
                    ReadingTime = table.Column<int>(type: "integer", nullable: false),
                    ViewsCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogPosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "company_product_catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductCode = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    PricingModel = table.Column<int>(type: "integer", nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    MinPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    MaxPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    DefaultRepIncentivePct = table.Column<decimal>(type: "numeric", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_company_product_catalog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyMetalRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RateDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Gold24K_Per10g = table.Column<decimal>(type: "numeric", nullable: false),
                    Gold22K_Per10g = table.Column<decimal>(type: "numeric", nullable: false),
                    Gold18K_Per10g = table.Column<decimal>(type: "numeric", nullable: false),
                    Gold14K_Per10g = table.Column<decimal>(type: "numeric", nullable: false),
                    Silver999_PerKg = table.Column<decimal>(type: "numeric", nullable: false),
                    Silver925_PerKg = table.Column<decimal>(type: "numeric", nullable: false),
                    Platinum950_Per10g = table.Column<decimal>(type: "numeric", nullable: false),
                    OldGoldBuyingRate24K_Per1g = table.Column<decimal>(type: "numeric", nullable: false),
                    OldSilverBuyingRate_Per1g = table.Column<decimal>(type: "numeric", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SourceNote = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_DailyMetalRates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GirviLoans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GirviNumber = table.Column<string>(type: "text", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    CustomerMobile = table.Column<string>(type: "text", nullable: false),
                    CustomerAddress = table.Column<string>(type: "text", nullable: true),
                    CustomerAadhaarPan = table.Column<string>(type: "text", nullable: true),
                    PledgedOrnamentsDescription = table.Column<string>(type: "text", nullable: false),
                    TotalPledgedItemsCount = table.Column<int>(type: "integer", nullable: false),
                    GrossWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    NetWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    EstimatedMarketValuation = table.Column<decimal>(type: "numeric", nullable: false),
                    PrincipalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    MonthlyInterestRatePct = table.Column<decimal>(type: "numeric", nullable: false),
                    LoanDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RedeemedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    TotalInterestCollected = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalPrincipalReturned = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SafeVaultLockerNumber = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_GirviLoans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GirviLoans_parties_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "parties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GlobalProductCatalogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Barcode = table.Column<string>(type: "text", nullable: false),
                    ProductName = table.Column<string>(type: "text", nullable: false),
                    BrandName = table.Column<string>(type: "text", nullable: true),
                    CategoryName = table.Column<string>(type: "text", nullable: true),
                    HsnCode = table.Column<string>(type: "text", nullable: true),
                    TaxRate = table.Column<decimal>(type: "numeric", nullable: false),
                    MRP = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitCode = table.Column<string>(type: "text", nullable: false),
                    IndustryCode = table.Column<string>(type: "text", nullable: false),
                    ShortDescription = table.Column<string>(type: "text", nullable: true),
                    AttributesJson = table.Column<string>(type: "text", nullable: false),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_GlobalProductCatalogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GoldSavingsSchemes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeCode = table.Column<string>(type: "text", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    CustomerMobile = table.Column<string>(type: "text", nullable: false),
                    MonthlyAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalMonths = table.Column<int>(type: "integer", nullable: false),
                    JewellerBonusContribution = table.Column<decimal>(type: "numeric", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MaturityDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalDeposited = table.Column<decimal>(type: "numeric", nullable: false),
                    InstallmentsPaid = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RedeemedInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("PK_GoldSavingsSchemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoldSavingsSchemes_parties_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GoldSavingsSchemes_sales_invoices_RedeemedInvoiceId",
                        column: x => x.RedeemedInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "internal_sales_reps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RepCode = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "text", nullable: false),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: true),
                    RoleTier = table.Column<int>(type: "integer", nullable: false),
                    ReportingToId = table.Column<Guid>(type: "uuid", nullable: true),
                    City = table.Column<string>(type: "text", nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    Zone = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_internal_sales_reps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_internal_sales_reps_internal_sales_reps_ReportingToId",
                        column: x => x.ReportingToId,
                        principalTable: "internal_sales_reps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_internal_sales_reps_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JewelleryItemAttributes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    JewelleryType = table.Column<int>(type: "integer", nullable: false),
                    MetalType = table.Column<int>(type: "integer", nullable: false),
                    PurityKarat = table.Column<string>(type: "text", nullable: false),
                    PurityPercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    GrossWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    StoneWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    NetWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    WastagePercentage = table.Column<decimal>(type: "numeric", nullable: false),
                    WastageGrams = table.Column<decimal>(type: "numeric", nullable: false),
                    MakingChargeType = table.Column<int>(type: "integer", nullable: false),
                    MakingChargeRate = table.Column<decimal>(type: "numeric", nullable: false),
                    HUID = table.Column<string>(type: "text", nullable: true),
                    HallmarkingCenter = table.Column<string>(type: "text", nullable: true),
                    CertificateNumber = table.Column<string>(type: "text", nullable: true),
                    ImitationColorFinish = table.Column<string>(type: "text", nullable: true),
                    PiecesPerBox = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_JewelleryItemAttributes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JewelleryItemAttributes_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KarigarAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    Address = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    Speciality = table.Column<string>(type: "text", nullable: true),
                    PureGoldBalanceGrams = table.Column<decimal>(type: "numeric", nullable: false),
                    PureSilverBalanceGrams = table.Column<decimal>(type: "numeric", nullable: false),
                    LabourBalanceRupees = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_KarigarAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MechanicMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Mobile = table.Column<string>(type: "text", nullable: false),
                    GarageName = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    DefaultCommissionPercent = table.Column<decimal>(type: "numeric", nullable: false),
                    FlatCommissionPerPart = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalCommissionEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalCommissionPaid = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_MechanicMasters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OldGoldExchangeVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherNumber = table.Column<string>(type: "text", nullable: false),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerName = table.Column<string>(type: "text", nullable: true),
                    CustomerMobile = table.Column<string>(type: "text", nullable: true),
                    CustomerPanAadhaar = table.Column<string>(type: "text", nullable: true),
                    ItemDescription = table.Column<string>(type: "text", nullable: false),
                    MetalType = table.Column<int>(type: "integer", nullable: false),
                    OldGrossWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    OldDustStoneWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    OldNetWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    MeltingPurityTunch = table.Column<decimal>(type: "numeric", nullable: false),
                    PureWeightEquivalent = table.Column<decimal>(type: "numeric", nullable: false),
                    BuyingRatePerGram = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalExchangeValuation = table.Column<decimal>(type: "numeric", nullable: false),
                    TestingMethod = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_OldGoldExchangeVouchers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OldGoldExchangeVouchers_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OldGoldExchangeVouchers_sales_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PartCrossReferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    OemPartNumber = table.Column<string>(type: "text", nullable: false),
                    OesBrand = table.Column<string>(type: "text", nullable: false),
                    OesPartNumber = table.Column<string>(type: "text", nullable: false),
                    InterchangeableNotes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_PartCrossReferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PartCrossReferences_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlatformLeadPopupConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    BadgeText = table.Column<string>(type: "text", nullable: false),
                    Heading = table.Column<string>(type: "text", nullable: false),
                    SubHeading = table.Column<string>(type: "text", nullable: false),
                    CtaButtonText = table.Column<string>(type: "text", nullable: false),
                    OfferTag = table.Column<string>(type: "text", nullable: false),
                    TriggerDelaySeconds = table.Column<int>(type: "integer", nullable: false),
                    EnableExitIntent = table.Column<bool>(type: "boolean", nullable: false),
                    DismissCooldownHours = table.Column<int>(type: "integer", nullable: false),
                    WhatsappNumber = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_PlatformLeadPopupConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantUserMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsOwner = table.Column<bool>(type: "boolean", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantUserMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantUserMappings_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantUserMappings_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleMasters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleType = table.Column<string>(type: "text", nullable: false),
                    Make = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Variant = table.Column<string>(type: "text", nullable: false),
                    FuelType = table.Column<string>(type: "text", nullable: false),
                    YearStart = table.Column<int>(type: "integer", nullable: true),
                    YearEnd = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleMasters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VoucherAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JournalVoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherNumber = table.Column<string>(type: "text", nullable: false),
                    ActionType = table.Column<string>(type: "text", nullable: false),
                    PreviousSnapshotJson = table.Column<string>(type: "text", nullable: true),
                    NewSnapshotJson = table.Column<string>(type: "text", nullable: true),
                    PerformedByName = table.Column<string>(type: "text", nullable: true),
                    ClientIpAddress = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_VoucherAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdvancePaymentAllocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdvancePaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    PurchaseBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    AmountAllocated = table.Column<decimal>(type: "numeric", nullable: false),
                    AllocationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
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
                    table.PrimaryKey("PK_AdvancePaymentAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdvancePaymentAllocations_AdvancePayments_AdvancePaymentId",
                        column: x => x.AdvancePaymentId,
                        principalTable: "AdvancePayments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AdvancePaymentAllocations_purchase_bills_PurchaseBillId",
                        column: x => x.PurchaseBillId,
                        principalTable: "purchase_bills",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AdvancePaymentAllocations_sales_invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "GoldSavingsInstallments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchemeId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstallmentNumber = table.Column<int>(type: "integer", nullable: false),
                    PaymentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMode = table.Column<string>(type: "text", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "text", nullable: true),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_GoldSavingsInstallments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoldSavingsInstallments_GoldSavingsSchemes_SchemeId",
                        column: x => x.SchemeId,
                        principalTable: "GoldSavingsSchemes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "field_shop_visits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopName = table.Column<string>(type: "text", nullable: false),
                    OwnerName = table.Column<string>(type: "text", nullable: false),
                    OwnerMobile = table.Column<string>(type: "text", nullable: false),
                    ShopCategory = table.Column<string>(type: "text", nullable: false),
                    CurrentSoftware = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    IsMockGpsDetected = table.Column<bool>(type: "boolean", nullable: false),
                    IsVpnDetected = table.Column<bool>(type: "boolean", nullable: false),
                    VisitOutcome = table.Column<int>(type: "integer", nullable: false),
                    TotalQuotedAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    NextFollowupAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsCustomProjectLead = table.Column<bool>(type: "boolean", nullable: false),
                    ProjectScopeSummary = table.Column<string>(type: "text", nullable: true),
                    StorefrontImageUrl = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_field_shop_visits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_field_shop_visits_internal_sales_reps_RepId",
                        column: x => x.RepId,
                        principalTable: "internal_sales_reps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "hardware_device_registry",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepId = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceFingerprint = table.Column<string>(type: "text", nullable: false),
                    DeviceModel = table.Column<string>(type: "text", nullable: true),
                    DeviceBrand = table.Column<string>(type: "text", nullable: true),
                    OsVersion = table.Column<string>(type: "text", nullable: true),
                    AppVersion = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastLoginAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastKnownIp = table.Column<string>(type: "text", nullable: true),
                    InstallationToken = table.Column<string>(type: "text", nullable: true),
                    FailedTamperAttempts = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_hardware_device_registry", x => x.Id);
                    table.ForeignKey(
                        name: "FK_hardware_device_registry_internal_sales_reps_RepId",
                        column: x => x.RepId,
                        principalTable: "internal_sales_reps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sales_quota_allocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RepId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    IndividualTarget = table.Column<decimal>(type: "numeric", nullable: false),
                    TeamRollupTarget = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalTarget = table.Column<decimal>(type: "numeric", nullable: false),
                    AchievedRevenue = table.Column<decimal>(type: "numeric", nullable: false),
                    AchievedBillingRev = table.Column<decimal>(type: "numeric", nullable: false),
                    AchievedEcommerceRev = table.Column<decimal>(type: "numeric", nullable: false),
                    AchievedCustomProjectRev = table.Column<decimal>(type: "numeric", nullable: false),
                    NewSalesCount = table.Column<int>(type: "integer", nullable: false),
                    RenewalsDueCount = table.Column<int>(type: "integer", nullable: false),
                    RenewalsClosedCount = table.Column<int>(type: "integer", nullable: false),
                    IsLocked = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_sales_quota_allocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sales_quota_allocations_internal_sales_reps_RepId",
                        column: x => x.RepId,
                        principalTable: "internal_sales_reps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subscription_attribution_audit_log",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedRepId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreviousRepId = table.Column<Guid>(type: "uuid", nullable: true),
                    AttributionMethod = table.Column<string>(type: "text", nullable: false),
                    ProofDocumentNotes = table.Column<string>(type: "text", nullable: true),
                    RevenueAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IsRenewal = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_subscription_attribution_audit_log", x => x.Id);
                    table.ForeignKey(
                        name: "FK_subscription_attribution_audit_log_internal_sales_reps_Assi~",
                        column: x => x.AssignedRepId,
                        principalTable: "internal_sales_reps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DiamondGemstoneDetails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JewelleryItemAttributeId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoneType = table.Column<int>(type: "integer", nullable: false),
                    Cut = table.Column<string>(type: "text", nullable: false),
                    Clarity = table.Column<string>(type: "text", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false),
                    PiecesCount = table.Column<int>(type: "integer", nullable: false),
                    WeightCarats = table.Column<decimal>(type: "numeric", nullable: false),
                    WeightCents = table.Column<decimal>(type: "numeric", nullable: false),
                    RatePerCarat = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    CertNumber = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_DiamondGemstoneDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiamondGemstoneDetails_JewelleryItemAttributes_JewelleryIte~",
                        column: x => x.JewelleryItemAttributeId,
                        principalTable: "JewelleryItemAttributes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KarigarTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    KarigarId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionType = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "text", nullable: false),
                    IssuePureMetalGrams = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedGrossWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedNetWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedPurityPct = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedFineWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    AllowedWastageWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    MetalShortageWeight = table.Column<decimal>(type: "numeric", nullable: false),
                    LabourCharges = table.Column<decimal>(type: "numeric", nullable: false),
                    LabourAmountPaid = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_KarigarTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KarigarTransactions_KarigarAccounts_KarigarId",
                        column: x => x.KarigarId,
                        principalTable: "KarigarAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MechanicCommissionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MechanicId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    VehicleRegNumber = table.Column<string>(type: "text", nullable: false),
                    OdometerKm = table.Column<int>(type: "integer", nullable: true),
                    InvoiceTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    CommissionAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    SettledAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SettlementPaymentMode = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_MechanicCommissionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MechanicCommissionLogs_MechanicMasters_MechanicId",
                        column: x => x.MechanicId,
                        principalTable: "MechanicMasters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductFitments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleMasterId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomVehicleString = table.Column<string>(type: "text", nullable: false),
                    PositionSide = table.Column<string>(type: "text", nullable: false),
                    FitmentNotes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_ProductFitments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductFitments_VehicleMasters_VehicleMasterId",
                        column: x => x.VehicleMasterId,
                        principalTable: "VehicleMasters",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductFitments_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "field_shop_visit_products",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuotedPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    DealStatus = table.Column<string>(type: "text", nullable: false),
                    ClientInterestLevel = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_field_shop_visit_products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_field_shop_visit_products_company_product_catalog_ProductId",
                        column: x => x.ProductId,
                        principalTable: "company_product_catalog",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_field_shop_visit_products_field_shop_visits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "field_shop_visits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenants_ParentTenantId",
                table: "tenants",
                column: "ParentTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvancePaymentAllocations_AdvancePaymentId",
                table: "AdvancePaymentAllocations",
                column: "AdvancePaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvancePaymentAllocations_InvoiceId",
                table: "AdvancePaymentAllocations",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvancePaymentAllocations_PurchaseBillId",
                table: "AdvancePaymentAllocations",
                column: "PurchaseBillId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvancePayments_PartyId",
                table: "AdvancePayments",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_company_product_catalog_ProductCode",
                table: "company_product_catalog",
                column: "ProductCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DiamondGemstoneDetails_JewelleryItemAttributeId",
                table: "DiamondGemstoneDetails",
                column: "JewelleryItemAttributeId");

            migrationBuilder.CreateIndex(
                name: "IX_field_shop_visit_products_ProductId",
                table: "field_shop_visit_products",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_field_shop_visit_products_VisitId",
                table: "field_shop_visit_products",
                column: "VisitId");

            migrationBuilder.CreateIndex(
                name: "IX_field_shop_visits_OwnerMobile",
                table: "field_shop_visits",
                column: "OwnerMobile");

            migrationBuilder.CreateIndex(
                name: "IX_field_shop_visits_RepId_CreatedAtUtc",
                table: "field_shop_visits",
                columns: new[] { "RepId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GirviLoans_CustomerId",
                table: "GirviLoans",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_GlobalProductCatalogs_Barcode",
                table: "GlobalProductCatalogs",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GoldSavingsInstallments_SchemeId",
                table: "GoldSavingsInstallments",
                column: "SchemeId");

            migrationBuilder.CreateIndex(
                name: "IX_GoldSavingsSchemes_CustomerId",
                table: "GoldSavingsSchemes",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_GoldSavingsSchemes_RedeemedInvoiceId",
                table: "GoldSavingsSchemes",
                column: "RedeemedInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_hardware_device_registry_DeviceFingerprint",
                table: "hardware_device_registry",
                column: "DeviceFingerprint",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_hardware_device_registry_RepId",
                table: "hardware_device_registry",
                column: "RepId");

            migrationBuilder.CreateIndex(
                name: "IX_internal_sales_reps_Mobile",
                table: "internal_sales_reps",
                column: "Mobile",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_internal_sales_reps_RepCode",
                table: "internal_sales_reps",
                column: "RepCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_internal_sales_reps_ReportingToId",
                table: "internal_sales_reps",
                column: "ReportingToId");

            migrationBuilder.CreateIndex(
                name: "IX_internal_sales_reps_UserId",
                table: "internal_sales_reps",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_JewelleryItemAttributes_ItemId",
                table: "JewelleryItemAttributes",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_KarigarTransactions_KarigarId",
                table: "KarigarTransactions",
                column: "KarigarId");

            migrationBuilder.CreateIndex(
                name: "IX_MechanicCommissionLogs_MechanicId",
                table: "MechanicCommissionLogs",
                column: "MechanicId");

            migrationBuilder.CreateIndex(
                name: "IX_OldGoldExchangeVouchers_InvoiceId",
                table: "OldGoldExchangeVouchers",
                column: "InvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_OldGoldExchangeVouchers_PartyId",
                table: "OldGoldExchangeVouchers",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_PartCrossReferences_ItemId",
                table: "PartCrossReferences",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductFitments_ItemId",
                table: "ProductFitments",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductFitments_VehicleMasterId",
                table: "ProductFitments",
                column: "VehicleMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quota_allocations_RepId_Month_Year",
                table: "sales_quota_allocations",
                columns: new[] { "RepId", "Month", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subscription_attribution_audit_log_AssignedRepId",
                table: "subscription_attribution_audit_log",
                column: "AssignedRepId");

            migrationBuilder.CreateIndex(
                name: "IX_subscription_attribution_audit_log_SubscriptionId",
                table: "subscription_attribution_audit_log",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantUserMappings_TenantId",
                table: "TenantUserMappings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantUserMappings_UserId_TenantId",
                table: "TenantUserMappings",
                columns: new[] { "UserId", "TenantId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tenants_tenants_ParentTenantId",
                table: "tenants",
                column: "ParentTenantId",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tenants_tenants_ParentTenantId",
                table: "tenants");

            migrationBuilder.DropTable(
                name: "AdvancePaymentAllocations");

            migrationBuilder.DropTable(
                name: "BatteryScrapBuybacks");

            migrationBuilder.DropTable(
                name: "BlogPosts");

            migrationBuilder.DropTable(
                name: "DailyMetalRates");

            migrationBuilder.DropTable(
                name: "DiamondGemstoneDetails");

            migrationBuilder.DropTable(
                name: "field_shop_visit_products");

            migrationBuilder.DropTable(
                name: "GirviLoans");

            migrationBuilder.DropTable(
                name: "GlobalProductCatalogs");

            migrationBuilder.DropTable(
                name: "GoldSavingsInstallments");

            migrationBuilder.DropTable(
                name: "hardware_device_registry");

            migrationBuilder.DropTable(
                name: "KarigarTransactions");

            migrationBuilder.DropTable(
                name: "MechanicCommissionLogs");

            migrationBuilder.DropTable(
                name: "OldGoldExchangeVouchers");

            migrationBuilder.DropTable(
                name: "PartCrossReferences");

            migrationBuilder.DropTable(
                name: "PlatformLeadPopupConfigs");

            migrationBuilder.DropTable(
                name: "ProductFitments");

            migrationBuilder.DropTable(
                name: "sales_quota_allocations");

            migrationBuilder.DropTable(
                name: "subscription_attribution_audit_log");

            migrationBuilder.DropTable(
                name: "TenantUserMappings");

            migrationBuilder.DropTable(
                name: "VoucherAuditLogs");

            migrationBuilder.DropTable(
                name: "AdvancePayments");

            migrationBuilder.DropTable(
                name: "JewelleryItemAttributes");

            migrationBuilder.DropTable(
                name: "company_product_catalog");

            migrationBuilder.DropTable(
                name: "field_shop_visits");

            migrationBuilder.DropTable(
                name: "GoldSavingsSchemes");

            migrationBuilder.DropTable(
                name: "KarigarAccounts");

            migrationBuilder.DropTable(
                name: "MechanicMasters");

            migrationBuilder.DropTable(
                name: "VehicleMasters");

            migrationBuilder.DropTable(
                name: "internal_sales_reps");

            migrationBuilder.DropIndex(
                name: "IX_tenants_ParentTenantId",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "users");

            migrationBuilder.DropColumn(
                name: "ApparelSubType",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "HardwareSubType",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "IsCompositionScheme",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ParentTenantId",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "AdjustedInvoiceId",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "AdjustedInvoiceNumber",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "CashRefundedAmount",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "RefundDate",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "RefundMode",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "RefundStatus",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "RefundTransactionRef",
                table: "SalesReturns");

            migrationBuilder.DropColumn(
                name: "CgstAmount",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "CgstRate",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "IgstAmount",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "IgstRate",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "SgstAmount",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "SgstRate",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "TaxableAmount",
                table: "SalesReturnItems");

            migrationBuilder.DropColumn(
                name: "CgstAmount",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "IgstAmount",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "ReturnType",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "SgstAmount",
                table: "PurchaseReturns");

            migrationBuilder.DropColumn(
                name: "CgstAmount",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "CgstRate",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "IgstAmount",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "IgstRate",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "SgstAmount",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "SgstRate",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "TaxableAmount",
                table: "PurchaseReturnItems");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "MaxCompanies",
                table: "plans");

            migrationBuilder.DropColumn(
                name: "IsInstalled",
                table: "MobileDeviceRegistrations");

            migrationBuilder.DropColumn(
                name: "UninstalledAt",
                table: "MobileDeviceRegistrations");

            migrationBuilder.DropColumn(
                name: "Gstin",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "InvoiceCount",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LastActiveAt",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LastInvoiceAmount",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "IsHidden",
                table: "add_ons");
        }
    }
}
