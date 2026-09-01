using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialProductionSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AddressLine1",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AddressLine2",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SmtpEnableSsl",
                table: "tenants",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpFromEmail",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpFromName",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpHost",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpPassword",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmtpPort",
                table: "tenants",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SmtpUsername",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StateCode",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "tenants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceTermsAndConditions",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierBankAccountNumber",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierBankBranch",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierBankIfsc",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierBankName",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierLogoUrl",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierSignatoryDesignation",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierSignatoryImageUrl",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierSignatoryName",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierUpiId",
                table: "SubscriptionInvoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EWayBillDate",
                table: "sales_invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EWayBillNumber",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsReverseCharge",
                table: "sales_invoices",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LrDate",
                table: "sales_invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LrNumber",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PoDate",
                table: "sales_invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PoNumber",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransporterId",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransporterName",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleNumber",
                table: "sales_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TrackInventory",
                table: "items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AccountGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Nature = table.Column<string>(type: "text", nullable: false),
                    ParentGroupId = table.Column<Guid>(type: "uuid", nullable: true),
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
                    table.PrimaryKey("PK_AccountGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Coupons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    DiscountType = table.Column<int>(type: "integer", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "numeric", nullable: false),
                    MinOrderAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    MaxDiscountAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    ApplicableType = table.Column<int>(type: "integer", nullable: false),
                    MaxRedemptions = table.Column<int>(type: "integer", nullable: true),
                    TimesRedeemed = table.Column<int>(type: "integer", nullable: false),
                    ValidFromUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ValidUntilUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_Coupons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JournalVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VoucherNumber = table.Column<string>(type: "text", nullable: false),
                    VoucherDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    VoucherType = table.Column<string>(type: "text", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "text", nullable: true),
                    TotalDebit = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalCredit = table.Column<decimal>(type: "numeric", nullable: false),
                    Narration = table.Column<string>(type: "text", nullable: false),
                    CreatedByName = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_JournalVouchers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PosHeldBills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HoldNumber = table.Column<string>(type: "text", nullable: false),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    CustomerPhone = table.Column<string>(type: "text", nullable: true),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ItemsCount = table.Column<int>(type: "integer", nullable: false),
                    CartJson = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_PosHeldBills", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitNoteNumber = table.Column<string>(type: "text", nullable: false),
                    ReturnDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OriginalPurchaseBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    OriginalBillNumber = table.Column<string>(type: "text", nullable: true),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    SupplierName = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReturnReason = table.Column<string>(type: "text", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_PurchaseReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturns_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseReturns_purchase_bills_OriginalPurchaseBillId",
                        column: x => x.OriginalPurchaseBillId,
                        principalTable: "purchase_bills",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SalesReturns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteNumber = table.Column<string>(type: "text", nullable: false),
                    ReturnDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OriginalSalesInvoiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    OriginalInvoiceNumber = table.Column<string>(type: "text", nullable: true),
                    PartyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerName = table.Column<string>(type: "text", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReturnReason = table.Column<string>(type: "text", nullable: false),
                    RestockToWarehouse = table.Column<bool>(type: "boolean", nullable: false),
                    SubTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_SalesReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesReturns_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesReturns_sales_invoices_OriginalSalesInvoiceId",
                        column: x => x.OriginalSalesInvoiceId,
                        principalTable: "sales_invoices",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "StockTransfers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransferNumber = table.Column<string>(type: "text", nullable: false),
                    TransferDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SourceWarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationWarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    VehicleNumber = table.Column<string>(type: "text", nullable: true),
                    DriverName = table.Column<string>(type: "text", nullable: true),
                    DispatchedDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReceivedDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("PK_StockTransfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockTransfers_tenant_warehouses_DestinationWarehouseId",
                        column: x => x.DestinationWarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockTransfers_tenant_warehouses_SourceWarehouseId",
                        column: x => x.SourceWarehouseId,
                        principalTable: "tenant_warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LedgerAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountCode = table.Column<string>(type: "text", nullable: false),
                    AccountName = table.Column<string>(type: "text", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    OpeningBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    BalanceType = table.Column<string>(type: "text", nullable: false),
                    CurrentBalance = table.Column<decimal>(type: "numeric", nullable: false),
                    IsSystemAccount = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_LedgerAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LedgerAccounts_AccountGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "AccountGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CouponRedemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CouponId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderReference = table.Column<string>(type: "text", nullable: false),
                    OrderAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    RedeemedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
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
                    table.PrimaryKey("PK_CouponRedemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CouponRedemptions_Coupons_CouponId",
                        column: x => x.CouponId,
                        principalTable: "Coupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseReturnItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseReturnId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemName = table.Column<string>(type: "text", nullable: false),
                    ItemSku = table.Column<string>(type: "text", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    ReturnQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_PurchaseReturnItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId",
                        column: x => x.PurchaseReturnId,
                        principalTable: "PurchaseReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseReturnItems_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalesReturnItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SalesReturnId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemName = table.Column<string>(type: "text", nullable: false),
                    ItemSku = table.Column<string>(type: "text", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    ReturnQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric", nullable: false),
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
                    table.PrimaryKey("PK_SalesReturnItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesReturnItems_SalesReturns_SalesReturnId",
                        column: x => x.SalesReturnId,
                        principalTable: "SalesReturns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesReturnItems_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockTransferItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StockTransferId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemName = table.Column<string>(type: "text", nullable: false),
                    ItemSku = table.Column<string>(type: "text", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    TransferQuantity = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceivedQuantity = table.Column<decimal>(type: "numeric", nullable: true),
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
                    table.PrimaryKey("PK_StockTransferItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_StockTransfers_StockTransferId",
                        column: x => x.StockTransferId,
                        principalTable: "StockTransfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockTransferItems_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JournalVoucherLegs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JournalVoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    CreditAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Narration = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_JournalVoucherLegs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalVoucherLegs_JournalVouchers_JournalVoucherId",
                        column: x => x.JournalVoucherId,
                        principalTable: "JournalVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JournalVoucherLegs_LedgerAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CouponRedemptions_CouponId",
                table: "CouponRedemptions",
                column: "CouponId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalVoucherLegs_AccountId",
                table: "JournalVoucherLegs",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalVoucherLegs_JournalVoucherId",
                table: "JournalVoucherLegs",
                column: "JournalVoucherId");

            migrationBuilder.CreateIndex(
                name: "IX_LedgerAccounts_GroupId",
                table: "LedgerAccounts",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_ItemId",
                table: "PurchaseReturnItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItems_PurchaseReturnId",
                table: "PurchaseReturnItems",
                column: "PurchaseReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_OriginalPurchaseBillId",
                table: "PurchaseReturns",
                column: "OriginalPurchaseBillId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_PartyId",
                table: "PurchaseReturns",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturns_TenantId_ReturnDate_PartyId",
                table: "PurchaseReturns",
                columns: new[] { "TenantId", "ReturnDate", "PartyId" });

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturnItems_ItemId",
                table: "SalesReturnItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturnItems_SalesReturnId",
                table: "SalesReturnItems",
                column: "SalesReturnId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturns_OriginalSalesInvoiceId",
                table: "SalesReturns",
                column: "OriginalSalesInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturns_PartyId",
                table: "SalesReturns",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturns_TenantId_ReturnDate_PartyId",
                table: "SalesReturns",
                columns: new[] { "TenantId", "ReturnDate", "PartyId" });

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_ItemId",
                table: "StockTransferItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransferItems_StockTransferId",
                table: "StockTransferItems",
                column: "StockTransferId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_DestinationWarehouseId",
                table: "StockTransfers",
                column: "DestinationWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_SourceWarehouseId",
                table: "StockTransfers",
                column: "SourceWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransfers_TenantId_TransferDate_Status",
                table: "StockTransfers",
                columns: new[] { "TenantId", "TransferDate", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CouponRedemptions");

            migrationBuilder.DropTable(
                name: "JournalVoucherLegs");

            migrationBuilder.DropTable(
                name: "PosHeldBills");

            migrationBuilder.DropTable(
                name: "PurchaseReturnItems");

            migrationBuilder.DropTable(
                name: "SalesReturnItems");

            migrationBuilder.DropTable(
                name: "StockTransferItems");

            migrationBuilder.DropTable(
                name: "Coupons");

            migrationBuilder.DropTable(
                name: "JournalVouchers");

            migrationBuilder.DropTable(
                name: "LedgerAccounts");

            migrationBuilder.DropTable(
                name: "PurchaseReturns");

            migrationBuilder.DropTable(
                name: "SalesReturns");

            migrationBuilder.DropTable(
                name: "StockTransfers");

            migrationBuilder.DropTable(
                name: "AccountGroups");

            migrationBuilder.DropColumn(
                name: "AddressLine1",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "AddressLine2",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "City",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Pincode",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpEnableSsl",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpFromEmail",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpFromName",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpHost",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpPassword",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpPort",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "SmtpUsername",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "State",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "StateCode",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "InvoiceTermsAndConditions",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierBankAccountNumber",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierBankBranch",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierBankIfsc",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierBankName",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierLogoUrl",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierSignatoryDesignation",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierSignatoryImageUrl",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierSignatoryName",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "SupplierUpiId",
                table: "SubscriptionInvoices");

            migrationBuilder.DropColumn(
                name: "EWayBillDate",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "EWayBillNumber",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "IsReverseCharge",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "LrDate",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "LrNumber",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "PoDate",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "PoNumber",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "TransporterId",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "TransporterName",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "VehicleNumber",
                table: "sales_invoices");

            migrationBuilder.DropColumn(
                name: "TrackInventory",
                table: "items");
        }
    }
}
