using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "add_ons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    BillingCycle = table.Column<int>(type: "integer", nullable: false),
                    AdditionalUsers = table.Column<int>(type: "integer", nullable: false),
                    AdditionalBranches = table.Column<int>(type: "integer", nullable: false),
                    AdditionalWarehouses = table.Column<int>(type: "integer", nullable: false),
                    AdditionalInvoicesPerMonth = table.Column<int>(type: "integer", nullable: false),
                    AdditionalStorageMb = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_add_ons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserEmail = table.Column<string>(type: "text", nullable: true),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    ActionName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OldValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    NewValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    AffectedColumnsJson = table.Column<string>(type: "jsonb", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CorrelationId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TimestampUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "industries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultConfigJson = table.Column<string>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_industries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "modules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsCore = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_modules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    BillingCycle = table.Column<int>(type: "integer", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    SetupFee = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    TrialDays = table.Column<int>(type: "integer", nullable: false),
                    MaxUsers = table.Column<int>(type: "integer", nullable: false),
                    MaxBranches = table.Column<int>(type: "integer", nullable: false),
                    MaxWarehouses = table.Column<int>(type: "integer", nullable: false),
                    MaxInvoicesPerMonth = table.Column<int>(type: "integer", nullable: false),
                    MaxStorageMb = table.Column<int>(type: "integer", nullable: false),
                    MaxApiCallsPerDay = table.Column<int>(type: "integer", nullable: false),
                    IsPopular = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_plans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    IsSystemRole = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BusinessName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    TradeName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IndustryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AdminEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PrimaryPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    GSTIN = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PAN = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DrugLicenseNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FSSAINumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Asia/Kolkata"),
                    CurrencyCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "INR"),
                    CurrencySymbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "₹"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SuspendedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SuspensionReason = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_tenants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenants_industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ModuleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    FeatureType = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_features_modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "industry_modules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IndustryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModuleId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsMandatory = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefaultEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_industry_modules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_industry_modules_industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_industry_modules_modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    StartsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TrialEndsAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelledAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancellationReason = table.Column<string>(type: "text", nullable: true),
                    AutoRenew = table.Column<bool>(type: "boolean", nullable: false),
                    PricePaid = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    CurrencyCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "INR"),
                    PaymentGatewaySubscriptionId = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_tenant_subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_subscriptions_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tenant_branches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BranchName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    GSTIN = table.Column<string>(type: "text", nullable: true),
                    AddressLine1 = table.Column<string>(type: "text", nullable: true),
                    AddressLine2 = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    State = table.Column<string>(type: "text", nullable: true),
                    StateCode = table.Column<string>(type: "text", nullable: true),
                    Pincode = table.Column<string>(type: "text", nullable: true),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    IsHeadOffice = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_tenant_branches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_branches_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_industry_configs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IndustryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConfigurationJson = table.Column<string>(type: "jsonb", nullable: false),
                    EnableBatchTracking = table.Column<bool>(type: "boolean", nullable: false),
                    EnableExpiryTracking = table.Column<bool>(type: "boolean", nullable: false),
                    EnableSerialTracking = table.Column<bool>(type: "boolean", nullable: false),
                    EnableMultiUnitConversion = table.Column<bool>(type: "boolean", nullable: false),
                    EnableSizeColorMatrix = table.Column<bool>(type: "boolean", nullable: false),
                    EnableRecipeBOM = table.Column<bool>(type: "boolean", nullable: false),
                    EnableScheduleH1DrugTracking = table.Column<bool>(type: "boolean", nullable: false),
                    EnableEWayBill = table.Column<bool>(type: "boolean", nullable: false),
                    EnableEInvoicing = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_tenant_industry_configs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_industry_configs_industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tenant_industry_configs_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_settings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false),
                    ValueType = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_tenant_settings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_settings_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    PasswordSalt = table.Column<string>(type: "text", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    Designation = table.Column<string>(type: "text", nullable: true),
                    IsSuperAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsTenantAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorSecret = table.Column<string>(type: "text", nullable: true),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false),
                    LockoutEndUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LastLoginAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastLoginIp = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_users_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "industry_features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IndustryId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsEnabledByDefault = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultConfigJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_industry_features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_industry_features_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_industry_features_industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plan_entitlements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsIncluded = table.Column<bool>(type: "boolean", nullable: false),
                    UsageLimit = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plan_entitlements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plan_entitlements_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_plan_entitlements_plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sub_features",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_sub_features", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sub_features_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_subscription_add_ons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantSubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddOnId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
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
                    table.PrimaryKey("PK_tenant_subscription_add_ons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_subscription_add_ons_add_ons_AddOnId",
                        column: x => x.AddOnId,
                        principalTable: "add_ons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tenant_subscription_add_ons_tenant_subscriptions_TenantSubs~",
                        column: x => x.TenantSubscriptionId,
                        principalTable: "tenant_subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tenant_warehouses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    WarehouseName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Location = table.Column<string>(type: "text", nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_tenant_warehouses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tenant_warehouses_tenant_branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "tenant_branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tenant_warehouses_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    ExpiresAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByIp = table.Column<string>(type: "text", nullable: true),
                    RevokedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RevokedByIp = table.Column<string>(type: "text", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "text", nullable: true),
                    ReasonRevoked = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_tokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_refresh_tokens_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_roles_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_roles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FeatureId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubFeatureId = table.Column<Guid>(type: "uuid", nullable: true),
                    Code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Group = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsSystem = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_permissions_features_FeatureId",
                        column: x => x.FeatureId,
                        principalTable: "features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_permissions_sub_features_SubFeatureId",
                        column: x => x.SubFeatureId,
                        principalTable: "sub_features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_role_permissions_permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_role_permissions_roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsGranted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_permissions_permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_permissions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_add_ons_Code",
                table: "add_ons",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_Action",
                table: "audit_logs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_TenantId_TimestampUtc",
                table: "audit_logs",
                columns: new[] { "TenantId", "TimestampUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_features_Code",
                table: "features",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_features_ModuleId",
                table: "features",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_industries_Code",
                table: "industries",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_industry_features_FeatureId",
                table: "industry_features",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_industry_features_IndustryId_FeatureId",
                table: "industry_features",
                columns: new[] { "IndustryId", "FeatureId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_industry_modules_IndustryId_ModuleId",
                table: "industry_modules",
                columns: new[] { "IndustryId", "ModuleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_industry_modules_ModuleId",
                table: "industry_modules",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_modules_Code",
                table: "modules",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_permissions_Code",
                table: "permissions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_permissions_FeatureId",
                table: "permissions",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_SubFeatureId",
                table: "permissions",
                column: "SubFeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_plan_entitlements_FeatureId",
                table: "plan_entitlements",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_plan_entitlements_PlanId_FeatureId",
                table: "plan_entitlements",
                columns: new[] { "PlanId", "FeatureId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plans_Code",
                table: "plans",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plans_DisplayOrder",
                table: "plans",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_plans_IsActive",
                table: "plans",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_TokenHash",
                table: "refresh_tokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refresh_tokens_UserId",
                table: "refresh_tokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_PermissionId",
                table: "role_permissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_role_permissions_RoleId_PermissionId",
                table: "role_permissions",
                columns: new[] { "RoleId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_roles_TenantId_Code",
                table: "roles",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sub_features_Code",
                table: "sub_features",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sub_features_FeatureId",
                table: "sub_features",
                column: "FeatureId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_branches_TenantId_BranchCode",
                table: "tenant_branches",
                columns: new[] { "TenantId", "BranchCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_branches_TenantId_IsActive",
                table: "tenant_branches",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_industry_configs_IndustryId",
                table: "tenant_industry_configs",
                column: "IndustryId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_industry_configs_TenantId_IndustryId",
                table: "tenant_industry_configs",
                columns: new[] { "TenantId", "IndustryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_settings_TenantId_Category_Key",
                table: "tenant_settings",
                columns: new[] { "TenantId", "Category", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_add_ons_AddOnId",
                table: "tenant_subscription_add_ons",
                column: "AddOnId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscription_add_ons_TenantSubscriptionId",
                table: "tenant_subscription_add_ons",
                column: "TenantSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscriptions_EndsAtUtc",
                table: "tenant_subscriptions",
                column: "EndsAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscriptions_PlanId",
                table: "tenant_subscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_subscriptions_TenantId_Status",
                table: "tenant_subscriptions",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_tenant_warehouses_BranchId",
                table: "tenant_warehouses",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_warehouses_TenantId_WarehouseCode",
                table: "tenant_warehouses",
                columns: new[] { "TenantId", "WarehouseCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_Code",
                table: "tenants",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenants_CreatedAtUtc",
                table: "tenants",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_IndustryId",
                table: "tenants",
                column: "IndustryId");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_IsActive",
                table: "tenants",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_Status",
                table: "tenants",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_PermissionId",
                table: "user_permissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_UserId_PermissionId",
                table: "user_permissions",
                columns: new[] { "UserId", "PermissionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_roles_RoleId",
                table: "user_roles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_user_roles_UserId_RoleId",
                table: "user_roles",
                columns: new[] { "UserId", "RoleId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                table: "users",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_users_IsActive",
                table: "users",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_users_IsSuperAdmin",
                table: "users",
                column: "IsSuperAdmin");

            migrationBuilder.CreateIndex(
                name: "IX_users_TenantId_Email",
                table: "users",
                columns: new[] { "TenantId", "Email" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "industry_features");

            migrationBuilder.DropTable(
                name: "industry_modules");

            migrationBuilder.DropTable(
                name: "plan_entitlements");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "tenant_industry_configs");

            migrationBuilder.DropTable(
                name: "tenant_settings");

            migrationBuilder.DropTable(
                name: "tenant_subscription_add_ons");

            migrationBuilder.DropTable(
                name: "tenant_warehouses");

            migrationBuilder.DropTable(
                name: "user_permissions");

            migrationBuilder.DropTable(
                name: "user_roles");

            migrationBuilder.DropTable(
                name: "add_ons");

            migrationBuilder.DropTable(
                name: "tenant_subscriptions");

            migrationBuilder.DropTable(
                name: "tenant_branches");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "plans");

            migrationBuilder.DropTable(
                name: "sub_features");

            migrationBuilder.DropTable(
                name: "tenants");

            migrationBuilder.DropTable(
                name: "features");

            migrationBuilder.DropTable(
                name: "industries");

            migrationBuilder.DropTable(
                name: "modules");
        }
    }
}
