using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Persistence.Seeders;

public class DatabaseSeeder
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(AppDbContext context, IPasswordHasher passwordHasher, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Beginning database seed execution...");

        await EnsureTablesCreatedAsync(cancellationToken);
        await SeedIndustriesAndModulesAsync(cancellationToken);
        await SeedPlansAsync(cancellationToken);
        await SeedAddOnsAsync(cancellationToken);
        await SeedCommercialConfigAsync(cancellationToken);
        await SeedSuperAdminAsync(cancellationToken);
        await SeedDemoTenantAndUsersAsync(cancellationToken);
        await SeedPermissionsAsync(cancellationToken);
        await SeedPlatformSettingsAsync(cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Database seed execution completed successfully.");
    }

    private async Task EnsureTablesCreatedAsync(CancellationToken cancellationToken)
    {
        try
        {
            try
            {
                await _context.Database.ExecuteSqlRawAsync(@"
ALTER TABLE IF EXISTS ""AddOns"" ADD COLUMN IF NOT EXISTS ""AnnualPrice"" numeric NULL;
ALTER TABLE IF EXISTS ""addons"" ADD COLUMN IF NOT EXISTS ""AnnualPrice"" numeric NULL;
ALTER TABLE IF EXISTS ""add_ons"" ADD COLUMN IF NOT EXISTS ""AnnualPrice"" numeric NULL;
UPDATE ""add_ons"" SET ""AnnualPrice"" = COALESCE(""Price"" * 10, 0) WHERE ""AnnualPrice"" IS NULL;
ALTER TABLE IF EXISTS ""add_ons"" ALTER COLUMN ""AnnualPrice"" SET DEFAULT 0;
ALTER TABLE IF EXISTS ""add_ons"" ALTER COLUMN ""AnnualPrice"" SET NOT NULL;

ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierLogoUrl"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankName"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankAccountNumber"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankIfsc"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankBranch"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierUpiId"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryName"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryDesignation"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryImageUrl"" text NULL;
ALTER TABLE IF EXISTS ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""InvoiceTermsAndConditions"" text NULL;

ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierLogoUrl"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankName"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankAccountNumber"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankIfsc"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierBankBranch"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierUpiId"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryName"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryDesignation"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""SupplierSignatoryImageUrl"" text NULL;
ALTER TABLE IF EXISTS ""subscription_invoices"" ADD COLUMN IF NOT EXISTS ""InvoiceTermsAndConditions"" text NULL;

CREATE TABLE IF NOT EXISTS ""Coupons"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""Code"" text NOT NULL,
    ""Description"" text NOT NULL,
    ""DiscountType"" integer NOT NULL DEFAULT 1,
    ""DiscountValue"" numeric NOT NULL DEFAULT 0,
    ""MinOrderAmount"" numeric NULL,
    ""MaxDiscountAmount"" numeric NULL,
    ""ApplicableType"" integer NOT NULL DEFAULT 1,
    ""MaxRedemptions"" integer NULL,
    ""TimesRedeemed"" integer NOT NULL DEFAULT 0,
    ""ValidFromUtc"" timestamp with time zone NULL,
    ""ValidUntilUtc"" timestamp with time zone NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""CouponRedemptions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""CouponId"" uuid NOT NULL,
    ""OrderReference"" text NOT NULL,
    ""OrderAmount"" numeric NOT NULL DEFAULT 0,
    ""DiscountAmount"" numeric NOT NULL DEFAULT 0,
    ""RedeemedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""LogoUrl"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""UpiId"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankName"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankAccountNumber"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankIfsc"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankBranch"" text;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""IsAiAddonActive"" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AiScansLimit"" integer NOT NULL DEFAULT 500;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AiScansUsed"" integer NOT NULL DEFAULT 0;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""IndustryTypeCode"" text NOT NULL DEFAULT 'OTHER';
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""ActiveIndustryModule"" text NOT NULL DEFAULT 'OTHER';
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""IndustryModuleStatus"" integer NOT NULL DEFAULT 1;
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""IndustryActivatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW();
ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""MaxAllowedUsers"" integer NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS ""PlatformCommercialConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""CoreAnnualPrice"" numeric(18, 2) NOT NULL DEFAULT 3999,
    ""CoreBiennialPrice"" numeric(18, 2) NOT NULL DEFAULT 6999,
    ""IncludedUsers"" integer NOT NULL DEFAULT 2,
    ""SingleUserAnnualPrice"" numeric(18, 2) NOT NULL DEFAULT 799,
    ""FiveUserPackAnnualPrice"" numeric(18, 2) NOT NULL DEFAULT 2999,
    ""AiProAnnualPrice"" numeric(18, 2) NOT NULL DEFAULT 1499,
    ""AiProMonthlyScanLimit"" integer NOT NULL DEFAULT 500,
    ""GstRatePercent"" numeric(5, 2) NOT NULL DEFAULT 18.0,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""LastUpdatedByEmail"" text NULL,
    ""Notes"" text NULL,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""CreatedBy"" text NULL,
    ""UpdatedBy"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE
);

ALTER TABLE IF EXISTS ""PlatformCommercialConfigs"" ADD COLUMN IF NOT EXISTS ""DeletedAtUtc"" timestamp with time zone NULL;
ALTER TABLE IF EXISTS ""PlatformCommercialConfigs"" ADD COLUMN IF NOT EXISTS ""DeletedBy"" uuid NULL;

ALTER TABLE ""tenants"" ALTER COLUMN ""SmtpPort"" DROP NOT NULL;
ALTER TABLE ""tenants"" ALTER COLUMN ""SmtpPort"" SET DEFAULT 587;
ALTER TABLE ""tenants"" ALTER COLUMN ""SmtpEnableSsl"" SET DEFAULT true;

CREATE INDEX IF NOT EXISTS ""IX_sales_invoices_Tenant_InvDate"" ON ""sales_invoices"" (""TenantId"", ""InvoiceDate"" DESC);
CREATE INDEX IF NOT EXISTS ""IX_sales_invoices_Tenant_Party"" ON ""sales_invoices"" (""TenantId"", ""PartyId"");
CREATE INDEX IF NOT EXISTS ""IX_sales_invoice_items_Tenant_Item"" ON ""sales_invoice_items"" (""TenantId"", ""ItemId"");
CREATE INDEX IF NOT EXISTS ""IX_items_Tenant_Sku"" ON ""items"" (""TenantId"", ""Sku"");
CREATE INDEX IF NOT EXISTS ""IX_items_Tenant_Barcode"" ON ""items"" (""TenantId"", ""Barcode"");
CREATE INDEX IF NOT EXISTS ""IX_item_warehouse_stocks_Tenant_Item_Wh"" ON ""item_warehouse_stocks"" (""TenantId"", ""ItemId"", ""WarehouseId"");

ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""SalesmanUserId"" uuid NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""DoctorName"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""DoctorRegistrationNumber"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""OriginalInvoiceId"" uuid NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""TransporterName"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""TransporterId"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""VehicleNumber"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""LrNumber"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""LrDate"" timestamp with time zone NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""EWayBillNumber"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""EWayBillDate"" timestamp with time zone NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""PoNumber"" text NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""PoDate"" timestamp with time zone NULL;
ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""IsReverseCharge"" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE ""parties"" ADD COLUMN IF NOT EXISTS ""RouteName"" text NULL;
ALTER TABLE ""parties"" ADD COLUMN IF NOT EXISTS ""BrokerName"" text NULL;

ALTER TABLE ""items"" ADD COLUMN IF NOT EXISTS ""TrackInventory"" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE ""items"" ALTER COLUMN ""TaxRate"" TYPE numeric(18, 4);
ALTER TABLE ""items"" ALTER COLUMN ""CessRate"" TYPE numeric(18, 4);

ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IsInterState"" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""CgstRatePercent"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""CgstAmount"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SgstRatePercent"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SgstAmount"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IgstRatePercent"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IgstAmount"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""PlaceOfSupply"" text NULL;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierLegalName"" text NULL;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierGstin"" text NULL;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierAddress"" text NULL;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierStateCode"" text NULL;
ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SubscriberStateCode"" text NULL;
ALTER TABLE ""PlatformCompanyProfiles"" ADD COLUMN IF NOT EXISTS ""NextInvoiceSequence"" integer NOT NULL DEFAULT 1;

ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""IsQuarantined"" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""QuarantinedStock"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""RackLocation"" text NULL;
ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""SupplierId"" uuid NULL;
ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""Ptr"" numeric NOT NULL DEFAULT 0;
ALTER TABLE ""item_batches"" ADD COLUMN IF NOT EXISTS ""Pts"" numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ""PosHeldBills"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""HoldNumber"" text NOT NULL,
    ""CustomerName"" text NOT NULL DEFAULT 'Walk-in Customer',
    ""CustomerPhone"" text NULL,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""ItemsCount"" integer NOT NULL DEFAULT 0,
    ""CartJson"" text NOT NULL DEFAULT '[]',
    ""Notes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SavedReportPresets"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ReportCode"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""Description"" text NULL,
    ""ConfigurationJson"" text NOT NULL DEFAULT '{{}}',
    ""IsDefault"" boolean NOT NULL DEFAULT FALSE,
    ""IsSharedWithTenant"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE INDEX IF NOT EXISTS ""IX_sales_invoices_TenantId_InvoiceDate_Status_BranchId"" ON ""sales_invoices"" (""TenantId"", ""InvoiceDate"", ""Status"", ""BranchId"");
CREATE INDEX IF NOT EXISTS ""IX_sales_invoices_TenantId_PrimaryPaymentMode_InvoiceDate"" ON ""sales_invoices"" (""TenantId"", ""PrimaryPaymentMode"", ""InvoiceDate"");
CREATE INDEX IF NOT EXISTS ""IX_sales_invoices_TenantId_PartyId_PaymentStatus"" ON ""sales_invoices"" (""TenantId"", ""PartyId"", ""PaymentStatus"");

CREATE INDEX IF NOT EXISTS ""IX_sales_invoice_items_TenantId_ItemId_CreatedAtUtc"" ON ""sales_invoice_items"" (""TenantId"", ""ItemId"", ""CreatedAtUtc"");
CREATE INDEX IF NOT EXISTS ""IX_sales_invoice_items_TenantId_BatchId"" ON ""sales_invoice_items"" (""TenantId"", ""BatchId"");
CREATE INDEX IF NOT EXISTS ""IX_sales_invoice_items_TenantId_HsnCode_GstRate"" ON ""sales_invoice_items"" (""TenantId"", ""HsnCode"", ""GstRate"");

CREATE INDEX IF NOT EXISTS ""IX_purchase_bills_TenantId_BillDate_Status_BranchId"" ON ""purchase_bills"" (""TenantId"", ""BillDate"", ""Status"", ""BranchId"");
CREATE INDEX IF NOT EXISTS ""IX_purchase_bills_TenantId_PartyId_PaymentStatus"" ON ""purchase_bills"" (""TenantId"", ""PartyId"", ""PaymentStatus"");

CREATE INDEX IF NOT EXISTS ""IX_item_warehouse_stocks_TenantId_WarehouseId_CurrentQuantity"" ON ""item_warehouse_stocks"" (""TenantId"", ""WarehouseId"", ""CurrentQuantity"");
CREATE INDEX IF NOT EXISTS ""IX_item_batches_TenantId_ExpiryDate_IsActive"" ON ""item_batches"" (""TenantId"", ""ExpiryDate"", ""IsActive"");

CREATE INDEX IF NOT EXISTS ""IX_stock_movements_TenantId_MovementType_CreatedAtUtc"" ON ""stock_movements"" (""TenantId"", ""MovementType"", ""CreatedAtUtc"");
CREATE INDEX IF NOT EXISTS ""IX_stock_movements_TenantId_ItemId_WarehouseId_CreatedAtUtc"" ON ""stock_movements"" (""TenantId"", ""ItemId"", ""WarehouseId"", ""CreatedAtUtc"");

CREATE INDEX IF NOT EXISTS ""IX_party_ledger_entries_TenantId_PartyId_TransactionDate_EntryType"" ON ""party_ledger_entries"" (""TenantId"", ""PartyId"", ""TransactionDate"", ""EntryType"");
CREATE INDEX IF NOT EXISTS ""IX_expense_vouchers_TenantId_CategoryId_ExpenseDate"" ON ""expense_vouchers"" (""TenantId"", ""CategoryId"", ""ExpenseDate"");
", cancellationToken);
            }
            catch { }

            var sql = @"
CREATE TABLE IF NOT EXISTS ""BankAccounts"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""AccountName"" text NOT NULL,
    ""BankName"" text NULL,
    ""AccountNumber"" text NULL,
    ""IfscCode"" text NULL,
    ""BranchName"" text NULL,
    ""UpiId"" text NULL,
    ""QrCodeImageUrl"" text NULL,
    ""AccountType"" integer NOT NULL DEFAULT 1,
    ""OpeningBalance"" numeric NOT NULL DEFAULT 0,
    ""CurrentBalance"" numeric NOT NULL DEFAULT 0,
    ""IsDefault"" boolean NOT NULL DEFAULT FALSE,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ExpenseCategories"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""Description"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ExpenseVouchers"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""VoucherNumber"" text NOT NULL,
    ""ExpenseDate"" timestamp with time zone NOT NULL,
    ""CategoryId"" uuid NOT NULL,
    ""PaidTo"" text NOT NULL,
    ""Amount"" numeric NOT NULL DEFAULT 0,
    ""TaxAmount"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""PaymentMode"" integer NOT NULL DEFAULT 1,
    ""BankAccountId"" uuid NULL,
    ""ReferenceNumber"" text NULL,
    ""HasGstInvoice"" boolean NOT NULL DEFAULT FALSE,
    ""VendorGstin"" text NULL,
    ""Notes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""CashDrawerSessions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""CashierUserId"" uuid NOT NULL,
    ""OpenedAtUtc"" timestamp with time zone NOT NULL,
    ""ClosedAtUtc"" timestamp with time zone NULL,
    ""OpeningFloat"" numeric NOT NULL DEFAULT 0,
    ""CashSalesTotal"" numeric NOT NULL DEFAULT 0,
    ""CashReceiptsTotal"" numeric NOT NULL DEFAULT 0,
    ""CashPayoutsTotal"" numeric NOT NULL DEFAULT 0,
    ""ActualClosingCash"" numeric NULL,
    ""DifferenceAmount"" numeric NULL,
    ""Status"" integer NOT NULL DEFAULT 1,
    ""ClosingNotes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""LoyaltyProgramConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""PointsEarnSpendAmount"" numeric NOT NULL DEFAULT 100,
    ""PointsEarnedPerUnit"" numeric NOT NULL DEFAULT 1,
    ""PointRedemptionValue"" numeric NOT NULL DEFAULT 1,
    ""MinOrderAmountToEarn"" numeric NOT NULL DEFAULT 100,
    ""MaxRedeemPercentPerBill"" numeric NOT NULL DEFAULT 50,
    ""SignupBonusPoints"" numeric NOT NULL DEFAULT 50,
    ""ReferrerBonusPoints"" numeric NOT NULL DEFAULT 100,
    ""RefereeBonusPoints"" numeric NOT NULL DEFAULT 50,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""CustomerLoyaltyAccounts"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""PartyId"" uuid NOT NULL,
    ""AvailablePoints"" numeric NOT NULL DEFAULT 0,
    ""TotalPointsEarned"" numeric NOT NULL DEFAULT 0,
    ""TotalPointsRedeemed"" numeric NOT NULL DEFAULT 0,
    ""StoreCreditBalance"" numeric NOT NULL DEFAULT 0,
    ""ReferralCode"" text NOT NULL,
    ""ReferredByPartyId"" uuid NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""LoyaltyTransactions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""PartyId"" uuid NOT NULL,
    ""CustomerLoyaltyAccountId"" uuid NULL,
    ""TransactionType"" integer NOT NULL DEFAULT 1,
    ""PointsChange"" numeric NOT NULL DEFAULT 0,
    ""StoreCreditChange"" numeric NOT NULL DEFAULT 0,
    ""AvailablePointsAfter"" numeric NOT NULL DEFAULT 0,
    ""StoreCreditBalanceAfter"" numeric NOT NULL DEFAULT 0,
    ""ReferenceInvoiceId"" uuid NULL,
    ""ReferenceInvoiceNumber"" text NULL,
    ""Description"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

ALTER TABLE ""LoyaltyTransactions"" ADD COLUMN IF NOT EXISTS ""CustomerLoyaltyAccountId"" uuid NULL;

CREATE TABLE IF NOT EXISTS ""PromotionalCoupons"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Description"" text NULL,
    ""DiscountType"" integer NOT NULL DEFAULT 1,
    ""DiscountValue"" numeric NOT NULL DEFAULT 10,
    ""MinimumOrderAmount"" numeric NOT NULL DEFAULT 0,
    ""MaximumDiscountAmount"" numeric NULL,
    ""ValidFromUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""ValidUntilUtc"" timestamp with time zone NULL,
    ""TotalUsageLimit"" integer NOT NULL DEFAULT 1000,
    ""CurrentUsageCount"" integer NOT NULL DEFAULT 0,
    ""UsageLimitPerCustomer"" integer NOT NULL DEFAULT 1,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ReferralProgramConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""IsEnabled"" boolean NOT NULL DEFAULT TRUE,
    ""RewardType"" integer NOT NULL DEFAULT 1,
    ""DefaultRewardAmount"" numeric NOT NULL DEFAULT 500,
    ""PayoutScheduleDays"" integer NOT NULL DEFAULT 1,
    ""MinimumPayoutThreshold"" numeric NOT NULL DEFAULT 500,
    ""TermsAndConditions"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""TenantReferralProfiles"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ReferralCode"" text NOT NULL,
    ""CustomRewardAmount"" numeric NULL,
    ""UpiId"" text NULL,
    ""BankName"" text NULL,
    ""BankAccountNumber"" text NULL,
    ""BankIfsc"" text NULL,
    ""AccountHolderName"" text NULL,
    ""TotalReferralsCount"" integer NOT NULL DEFAULT 0,
    ""PaidConversionsCount"" integer NOT NULL DEFAULT 0,
    ""TotalEarnedAmount"" numeric NOT NULL DEFAULT 0,
    ""TotalPaidOutAmount"" numeric NOT NULL DEFAULT 0,
    ""PendingBalanceAmount"" numeric NOT NULL DEFAULT 0,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""TenantReferralConversions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""ReferrerTenantId"" uuid NOT NULL,
    ""RefereeTenantId"" uuid NOT NULL,
    ""ReferralCodeUsed"" text NOT NULL,
    ""RegistrationDateUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""Status"" integer NOT NULL DEFAULT 1,
    ""FirstPaidDateUtc"" timestamp with time zone NULL,
    ""SubscriptionInvoiceId"" uuid NULL,
    ""SubscriptionAmount"" numeric NULL,
    ""CommissionRewardAmount"" numeric NOT NULL DEFAULT 0,
    ""ScheduledPayoutDateUtc"" timestamp with time zone NULL,
    ""PaidAtUtc"" timestamp with time zone NULL,
    ""PayoutReference"" text NULL,
    ""PayoutMode"" text NULL,
    ""AdminNotes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ""IX_TenantReferralProfiles_ReferralCode"" ON ""TenantReferralProfiles"" (""ReferralCode"");
CREATE INDEX IF NOT EXISTS ""IX_TenantReferralProfiles_TenantId"" ON ""TenantReferralProfiles"" (""TenantId"");
CREATE INDEX IF NOT EXISTS ""IX_TenantReferralConversions_ReferrerTenantId"" ON ""TenantReferralConversions"" (""ReferrerTenantId"");
CREATE INDEX IF NOT EXISTS ""IX_TenantReferralConversions_RefereeTenantId"" ON ""TenantReferralConversions"" (""RefereeTenantId"");

CREATE TABLE IF NOT EXISTS ""NotificationGatewayConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""WhatsAppApiToken"" text NULL,
    ""WhatsAppPhoneId"" text NULL,
    ""WhatsAppBusinessAccountId"" text NULL,
    ""IsWhatsAppEnabled"" boolean NOT NULL DEFAULT FALSE,
    ""SmsProvider"" text NULL DEFAULT 'Fast2SMS',
    ""SmsApiKey"" text NULL,
    ""SmsSenderId"" text NULL DEFAULT 'UDYOGB',
    ""IsSmsEnabled"" boolean NOT NULL DEFAULT FALSE,
    ""SmtpHost"" text NULL DEFAULT 'smtp.mailgun.org',
    ""SmtpPort"" integer NOT NULL DEFAULT 587,
    ""SmtpUsername"" text NULL,
    ""SmtpPassword"" text NULL,
    ""FromEmail"" text NULL DEFAULT 'billing@udyogbill.com',
    ""FromName"" text NULL DEFAULT 'UdyogBill Invoicing',
    ""EnableSsl"" boolean NOT NULL DEFAULT TRUE,
    ""IsEmailEnabled"" boolean NOT NULL DEFAULT FALSE,
    ""IsWebhooksEnabled"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""NotificationTemplates"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Channel"" integer NOT NULL DEFAULT 1,
    ""TriggerType"" integer NOT NULL DEFAULT 1,
    ""TemplateCode"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""SubjectTemplate"" text NULL,
    ""BodyTemplate"" text NOT NULL,
    ""VariablesJson"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""NotificationDispatchLogs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Channel"" integer NOT NULL,
    ""TriggerType"" integer NOT NULL,
    ""RecipientTarget"" text NOT NULL,
    ""RecipientName"" text NULL,
    ""Subject"" text NULL,
    ""RenderedBody"" text NOT NULL,
    ""Status"" integer NOT NULL DEFAULT 2,
    ""ErrorMessage"" text NULL,
    ""SentAtUtc"" timestamp with time zone NULL DEFAULT NOW(),
    ""ReferenceEntityType"" text NULL,
    ""ReferenceEntityId"" uuid NULL,
    ""MetadataJson"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""TenantWebhookEndpoints"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""EndpointUrl"" text NOT NULL,
    ""SecretKey"" text NOT NULL,
    ""SubscribedEventsJson"" text NOT NULL DEFAULT '[""invoice.created"",""payment.received""]',
    ""Description"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""Transporters"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""TransporterId"" text NOT NULL,
    ""LegalName"" text NOT NULL,
    ""TransporterGstin"" text NULL,
    ""ContactPerson"" text NULL,
    ""Mobile"" text NULL,
    ""Email"" text NULL,
    ""DefaultVehicleNumber"" text NULL,
    ""DefaultTransportMode"" integer NOT NULL DEFAULT 1,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""DeliveryChallans"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ChallanNumber"" text NOT NULL,
    ""ChallanDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""SalesInvoiceId"" uuid NULL,
    ""CustomerPartyId"" uuid NOT NULL,
    ""CustomerName"" text NOT NULL,
    ""ShippingAddress"" text NULL,
    ""ShippingCity"" text NULL,
    ""ShippingState"" text NULL,
    ""ShippingPincode"" text NULL,
    ""DispatchStatus"" integer NOT NULL DEFAULT 1,
    ""TransporterId"" uuid NULL,
    ""TransporterName"" text NULL,
    ""TransporterGstin"" text NULL,
    ""TransportMode"" integer NOT NULL DEFAULT 1,
    ""VehicleNumber"" text NULL,
    ""VehicleType"" integer NOT NULL DEFAULT 1,
    ""DriverName"" text NULL,
    ""DriverMobile"" text NULL,
    ""TransportDocNumber"" text NULL,
    ""TransportDocDate"" timestamp with time zone NULL,
    ""DistanceKm"" numeric NOT NULL DEFAULT 50,
    ""EWayBillNumber"" text NULL,
    ""EWayBillDate"" timestamp with time zone NULL,
    ""EWayBillValidUntil"" timestamp with time zone NULL,
    ""EWayBillJsonPayload"" text NULL,
    ""TotalWeightKg"" numeric NOT NULL DEFAULT 0,
    ""TotalPackages"" integer NOT NULL DEFAULT 1,
    ""DispatchNotes"" text NULL,
    ""DispatchedAtUtc"" timestamp with time zone NULL,
    ""DeliveredAtUtc"" timestamp with time zone NULL,
    ""ProofOfDeliveryUrl"" text NULL,
    ""RecipientSignature"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""DeliveryChallanItems"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""DeliveryChallanId"" uuid NOT NULL,
    ""ItemId"" uuid NULL,
    ""ItemCode"" text NOT NULL,
    ""ItemName"" text NOT NULL,
    ""HsnCode"" text NULL,
    ""BatchNumber"" text NULL,
    ""SerialNumber"" text NULL,
    ""Quantity"" numeric NOT NULL DEFAULT 1,
    ""UnitName"" text NOT NULL DEFAULT 'PCS',
    ""PackageCount"" integer NOT NULL DEFAULT 1,
    ""UnitWeightKg"" numeric NOT NULL DEFAULT 0,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""EWayBills"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""EWayBillNumber"" text NOT NULL,
    ""GeneratedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""ValidUntilUtc"" timestamp with time zone NOT NULL,
    ""DocType"" text NOT NULL DEFAULT 'INV',
    ""DocNo"" text NOT NULL,
    ""DocDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""FromGstin"" text NOT NULL,
    ""FromAddress"" text NOT NULL,
    ""ToGstin"" text NOT NULL,
    ""ToAddress"" text NOT NULL,
    ""TotalInvoiceValue"" numeric NOT NULL DEFAULT 0,
    ""MainHsnCode"" text NULL,
    ""TransporterId"" text NULL,
    ""TransporterName"" text NULL,
    ""VehicleNumber"" text NULL,
    ""DistanceKm"" numeric NOT NULL DEFAULT 50,
    ""Status"" text NOT NULL DEFAULT 'ACT',
    ""NicJsonPayload"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PrintTemplates"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""DocumentType"" integer NOT NULL DEFAULT 1,
    ""TemplateName"" text NOT NULL,
    ""TemplateCode"" text NOT NULL,
    ""PageSize"" integer NOT NULL DEFAULT 1,
    ""IsDefault"" boolean NOT NULL DEFAULT TRUE,
    ""PrimaryColorHex"" text NOT NULL DEFAULT '#4f46e5',
    ""SecondaryColorHex"" text NOT NULL DEFAULT '#0f172a',
    ""FontFamily"" text NOT NULL DEFAULT 'Inter, sans-serif',
    ""ShowLogo"" boolean NOT NULL DEFAULT TRUE,
    ""LogoUrl"" text NULL,
    ""HeaderTitle"" text NOT NULL DEFAULT 'TAX INVOICE',
    ""HeaderSubtitle"" text NULL,
    ""ShowGstin"" boolean NOT NULL DEFAULT TRUE,
    ""ShowDrugLicense"" boolean NOT NULL DEFAULT FALSE,
    ""ShowFssai"" boolean NOT NULL DEFAULT FALSE,
    ""ShowBankDetails"" boolean NOT NULL DEFAULT TRUE,
    ""BankAccountName"" text NULL,
    ""BankAccountNumber"" text NULL,
    ""BankIfsc"" text NULL,
    ""BankName"" text NULL,
    ""ShowUpiQr"" boolean NOT NULL DEFAULT TRUE,
    ""UpiId"" text NULL,
    ""ShowItemHsn"" boolean NOT NULL DEFAULT TRUE,
    ""ShowBatchExpiry"" boolean NOT NULL DEFAULT FALSE,
    ""ShowMrpStrikethrough"" boolean NOT NULL DEFAULT TRUE,
    ""ShowSavingsCallout"" boolean NOT NULL DEFAULT TRUE,
    ""ShowLoyaltyPoints"" boolean NOT NULL DEFAULT TRUE,
    ""ShowCustomerBalance"" boolean NOT NULL DEFAULT TRUE,
    ""ShowTerms"" boolean NOT NULL DEFAULT TRUE,
    ""TermsAndConditions"" text NULL,
    ""ShowDeclaration"" boolean NOT NULL DEFAULT TRUE,
    ""DeclarationText"" text NULL,
    ""FooterGreeting"" text NULL DEFAULT 'Thank you for your business! Visit again.',
    ""LanguageCode"" text NOT NULL DEFAULT 'en',
    ""CustomLabelsJson"" text NOT NULL DEFAULT '{{}}',
    ""CustomCss"" text NULL,
    ""HtmlTemplateBody"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""BackupJobs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""BackupType"" integer NOT NULL DEFAULT 2,
    ""StorageProvider"" integer NOT NULL DEFAULT 1,
    ""FileName"" text NOT NULL,
    ""FilePath"" text NOT NULL,
    ""FileSizeBytes"" bigint NOT NULL DEFAULT 0,
    ""ChecksumSha256"" text NOT NULL,
    ""Status"" integer NOT NULL DEFAULT 1,
    ""ErrorMessage"" text NULL,
    ""IsAutoScheduled"" boolean NOT NULL DEFAULT FALSE,
    ""CompletedAtUtc"" timestamp with time zone NULL,
    ""RetentionDays"" integer NOT NULL DEFAULT 30,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""BackupScheduleConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""IsAutoBackupEnabled"" boolean NOT NULL DEFAULT TRUE,
    ""Frequency"" integer NOT NULL DEFAULT 1,
    ""ScheduledTimeUtc"" interval NOT NULL DEFAULT '02:00:00',
    ""StorageProvider"" integer NOT NULL DEFAULT 1,
    ""S3BucketName"" text NULL,
    ""S3Region"" text NULL,
    ""S3AccessKey"" text NULL,
    ""S3SecretKeyEncrypted"" text NULL,
    ""GoogleDriveFolderId"" text NULL,
    ""RetentionCount"" integer NOT NULL DEFAULT 30,
    ""LastRunAtUtc"" timestamp with time zone NULL,
    ""NextRunAtUtc"" timestamp with time zone NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SystemHealthMetrics"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""CpuUsagePercent"" double precision NOT NULL DEFAULT 0,
    ""MemoryUsedMb"" double precision NOT NULL DEFAULT 0,
    ""MemoryTotalMb"" double precision NOT NULL DEFAULT 0,
    ""ActiveDbConnections"" integer NOT NULL DEFAULT 1,
    ""DatabaseSizeBytes"" bigint NOT NULL DEFAULT 0,
    ""DiskFreeSpaceMb"" double precision NOT NULL DEFAULT 0,
    ""UptimeSeconds"" bigint NOT NULL DEFAULT 0,
    ""Status"" text NOT NULL DEFAULT 'HEALTHY',
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PaymentGatewayConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""Provider"" text NOT NULL DEFAULT 'Razorpay',
    ""KeyId"" text NOT NULL DEFAULT '',
    ""KeySecret"" text NOT NULL DEFAULT '',
    ""WebhookSecret"" text NULL,
    ""Mode"" text NOT NULL DEFAULT 'Test',
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""AdditionalSettingsJson"" text NOT NULL DEFAULT '{{}}',
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SubscriptionInvoices"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""InvoiceNumber"" text NOT NULL,
    ""InvoiceDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""TenantBusinessName"" text NOT NULL,
    ""TenantGstin"" text NULL,
    ""TenantPan"" text NULL,
    ""TenantBillingAddress"" text NULL,
    ""TenantEmail"" text NULL,
    ""TenantPhone"" text NULL,
    ""ItemDescription"" text NOT NULL,
    ""PlanCode"" text NULL,
    ""AddonCode"" text NULL,
    ""BillingCycle"" text NOT NULL DEFAULT 'Monthly',
    ""DurationDays"" integer NOT NULL DEFAULT 30,
    ""SubTotal"" numeric NOT NULL DEFAULT 0,
    ""TaxRatePercent"" numeric NOT NULL DEFAULT 18,
    ""TaxAmount"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""Currency"" text NOT NULL DEFAULT 'INR',
    ""PaymentGateway"" text NOT NULL DEFAULT 'Razorpay',
    ""GatewayOrderId"" text NULL,
    ""GatewayPaymentId"" text NULL,
    ""GatewaySignature"" text NULL,
    ""PaymentStatus"" text NOT NULL DEFAULT 'Paid',
    ""PaidAtUtc"" timestamp with time zone NULL,
    ""Notes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PlatformCompanyProfiles"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""LegalCompanyName"" text NOT NULL DEFAULT 'Udyog Software Technologies Private Limited',
    ""ProductBrandName"" text NOT NULL DEFAULT 'UdyogBill',
    ""Tagline"" text NOT NULL DEFAULT 'Smart Cloud Invoicing & Business ERP',
    ""Gstin"" text NOT NULL DEFAULT '09AAACU9876A1Z5',
    ""Pan"" text NOT NULL DEFAULT 'AAACU9876A',
    ""State"" text NOT NULL DEFAULT 'Uttar Pradesh',
    ""StateCode"" text NOT NULL DEFAULT '09',
    ""AddressLine1"" text NOT NULL DEFAULT 'Tower B, Cyber City',
    ""AddressLine2"" text NOT NULL DEFAULT 'Sector 62',
    ""City"" text NOT NULL DEFAULT 'Noida',
    ""Pincode"" text NOT NULL DEFAULT '201309',
    ""SupportEmail"" text NOT NULL DEFAULT 'support@udyogbill.com',
    ""SupportPhone"" text NOT NULL DEFAULT '+91 98765 43210',
    ""Website"" text NOT NULL DEFAULT 'https://udyogbill.com',
    ""BankName"" text NOT NULL DEFAULT 'HDFC Bank',
    ""BankAccountNumber"" text NOT NULL DEFAULT '50200012345678',
    ""BankIfsc"" text NOT NULL DEFAULT 'HDFC0001234',
    ""BankBranch"" text NOT NULL DEFAULT 'Noida Sector 62 Branch',
    ""UpiId"" text NULL DEFAULT 'udyogbill@hdfcbank',
    ""UpiQrImageUrl"" text NULL,
    ""LogoUrl"" text NULL,
    ""SignatoryImageUrl"" text NULL,
    ""AuthorizedSignatoryName"" text NOT NULL DEFAULT 'Authorized Signatory',
    ""AuthorizedSignatoryDesignation"" text NOT NULL DEFAULT 'Finance Director',
    ""InvoicePrefix"" text NOT NULL DEFAULT 'UB/SUB/26-27/',
    ""InvoiceTermsAndConditions"" text NOT NULL DEFAULT '1. Computer generated tax invoice.\n2. SAC Code 998313.',
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PlatformEmailConfigs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""SmtpHost"" text NOT NULL DEFAULT 'smtp.gmail.com',
    ""SmtpPort"" integer NOT NULL DEFAULT 587,
    ""SmtpUsername"" text NOT NULL DEFAULT 'notifications@udyogbill.com',
    ""SmtpPassword"" text NOT NULL DEFAULT '',
    ""FromEmail"" text NOT NULL DEFAULT 'billing@udyogbill.com',
    ""FromName"" text NOT NULL DEFAULT 'UdyogBill Cloud Billing',
    ""ReplyToEmail"" text NULL DEFAULT 'support@udyogbill.com',
    ""EnableSsl"" boolean NOT NULL DEFAULT TRUE,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PlatformPasswordResetOtps"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""Email"" text NOT NULL,
    ""OtpCode"" text NOT NULL,
    ""ExpiresAtUtc"" timestamp with time zone NOT NULL,
    ""IsUsed"" boolean NOT NULL DEFAULT FALSE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SaltMasters"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""SaltName"" text NOT NULL,
    ""TherapeuticCategory"" text NOT NULL,
    ""Description"" text NULL,
    ""SideEffectsAlert"" text NULL,
    ""IsHabitForming"" boolean NOT NULL DEFAULT FALSE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ItemSaltCompositions"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ItemId"" uuid NOT NULL,
    ""SaltId"" uuid NOT NULL,
    ""Strength"" text NOT NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""DoctorPrescribers"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""Qualification"" text NOT NULL,
    ""Specialization"" text NOT NULL,
    ""RegistrationNumber"" text NOT NULL,
    ""ClinicHospitalName"" text NOT NULL,
    ""Address"" text NOT NULL,
    ""City"" text NOT NULL,
    ""Mobile"" text NOT NULL,
    ""Email"" text NULL,
    ""IncentivePercent"" numeric NOT NULL DEFAULT 0,
    ""AssignedMrName"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ScheduleH1RegisterEntries"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""InvoiceId"" uuid NOT NULL,
    ""InvoiceNumber"" text NOT NULL,
    ""SupplyDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""PatientName"" text NOT NULL,
    ""PatientAddressPhone"" text NOT NULL,
    ""PrescriberDoctorName"" text NOT NULL,
    ""PrescriberRegNumber"" text NOT NULL,
    ""DrugName"" text NOT NULL,
    ""BatchNumber"" text NOT NULL,
    ""QuantitySupplied"" numeric NOT NULL DEFAULT 0,
    ""ManufacturerName"" text NOT NULL,
    ""SignOffStatus"" text NOT NULL DEFAULT 'Verified',
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ExpiryReturnClaims"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ClaimNumber"" text NOT NULL,
    ""SupplierId"" uuid NOT NULL,
    ""SupplierName"" text NOT NULL,
    ""ClaimDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""TotalClaimAmount"" numeric NOT NULL DEFAULT 0,
    ""Status"" text NOT NULL DEFAULT 'Submitted',
    ""SupplierCreditNoteNumber"" text NULL,
    ""Notes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""ExpiryReturnClaimItems"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""ExpiryReturnClaimId"" uuid NOT NULL,
    ""ItemBatchId"" uuid NULL,
    ""ItemName"" text NOT NULL,
    ""BatchNumber"" text NOT NULL,
    ""ExpiryDateMonthYear"" text NOT NULL,
    ""Quantity"" numeric NOT NULL DEFAULT 0,
    ""PurchaseRate"" numeric NOT NULL DEFAULT 0,
    ""ClaimAmount"" numeric NOT NULL DEFAULT 0,
    ""Reason"" text NOT NULL DEFAULT 'Expired',
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""AccountGroups"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""Category"" text NOT NULL DEFAULT 'Asset',
    ""Nature"" text NOT NULL DEFAULT 'Debit',
    ""ParentGroupId"" uuid NULL,
    ""Description"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""LedgerAccounts"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""AccountCode"" text NOT NULL,
    ""AccountName"" text NOT NULL,
    ""GroupId"" uuid NOT NULL,
    ""Category"" text NOT NULL DEFAULT 'Asset',
    ""OpeningBalance"" numeric NOT NULL DEFAULT 0,
    ""BalanceType"" text NOT NULL DEFAULT 'Debit',
    ""CurrentBalance"" numeric NOT NULL DEFAULT 0,
    ""IsSystemAccount"" boolean NOT NULL DEFAULT FALSE,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""JournalVouchers"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""VoucherNumber"" text NOT NULL,
    ""VoucherDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""VoucherType"" text NOT NULL DEFAULT 'Journal',
    ""ReferenceNumber"" text NULL,
    ""TotalDebit"" numeric NOT NULL DEFAULT 0,
    ""TotalCredit"" numeric NOT NULL DEFAULT 0,
    ""Narration"" text NOT NULL DEFAULT '',
    ""CreatedByName"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""JournalVoucherLegs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""JournalVoucherId"" uuid NOT NULL,
    ""AccountId"" uuid NOT NULL,
    ""DebitAmount"" numeric NOT NULL DEFAULT 0,
    ""CreditAmount"" numeric NOT NULL DEFAULT 0,
    ""Narration"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SalesReturns"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""CreditNoteNumber"" text NOT NULL,
    ""ReturnDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""OriginalSalesInvoiceId"" uuid NULL,
    ""OriginalInvoiceNumber"" text NULL,
    ""PartyId"" uuid NOT NULL,
    ""CustomerName"" text NOT NULL,
    ""BranchId"" uuid NOT NULL,
    ""WarehouseId"" uuid NOT NULL,
    ""ReturnReason"" text NOT NULL DEFAULT 'CustomerReturn',
    ""RestockToWarehouse"" boolean NOT NULL DEFAULT TRUE,
    ""SubTotal"" numeric NOT NULL DEFAULT 0,
    ""TaxAmount"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""Notes"" text NULL,
    ""IsCancelled"" boolean NOT NULL DEFAULT FALSE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SalesReturnItems"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""SalesReturnId"" uuid NOT NULL,
    ""ItemId"" uuid NOT NULL,
    ""ItemName"" text NOT NULL,
    ""ItemSku"" text NOT NULL,
    ""BatchId"" uuid NULL,
    ""BatchNumber"" text NULL,
    ""ReturnQuantity"" numeric NOT NULL DEFAULT 0,
    ""UnitPrice"" numeric NOT NULL DEFAULT 0,
    ""GstRate"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PurchaseReturns"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""DebitNoteNumber"" text NOT NULL,
    ""ReturnDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""OriginalPurchaseBillId"" uuid NULL,
    ""OriginalBillNumber"" text NULL,
    ""PartyId"" uuid NOT NULL,
    ""SupplierName"" text NOT NULL,
    ""BranchId"" uuid NOT NULL,
    ""WarehouseId"" uuid NOT NULL,
    ""ReturnReason"" text NOT NULL DEFAULT 'Defective',
    ""SubTotal"" numeric NOT NULL DEFAULT 0,
    ""TaxAmount"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""Notes"" text NULL,
    ""IsCancelled"" boolean NOT NULL DEFAULT FALSE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""PurchaseReturnItems"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""PurchaseReturnId"" uuid NOT NULL,
    ""ItemId"" uuid NOT NULL,
    ""ItemName"" text NOT NULL,
    ""ItemSku"" text NOT NULL,
    ""BatchId"" uuid NULL,
    ""BatchNumber"" text NULL,
    ""ReturnQuantity"" numeric NOT NULL DEFAULT 0,
    ""UnitPrice"" numeric NOT NULL DEFAULT 0,
    ""GstRate"" numeric NOT NULL DEFAULT 0,
    ""TotalAmount"" numeric NOT NULL DEFAULT 0,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""StockTransfers"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""TransferNumber"" text NOT NULL,
    ""TransferDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""SourceWarehouseId"" uuid NOT NULL,
    ""DestinationWarehouseId"" uuid NOT NULL,
    ""Status"" text NOT NULL DEFAULT 'Dispatched',
    ""VehicleNumber"" text NULL,
    ""DriverName"" text NULL,
    ""DispatchedDate"" timestamp with time zone NULL,
    ""ReceivedDate"" timestamp with time zone NULL,
    ""Notes"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""StockTransferItems"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""StockTransferId"" uuid NOT NULL,
    ""ItemId"" uuid NOT NULL,
    ""ItemName"" text NOT NULL,
    ""ItemSku"" text NOT NULL,
    ""BatchId"" uuid NULL,
    ""BatchNumber"" text NULL,
    ""TransferQuantity"" numeric NOT NULL DEFAULT 0,
    ""ReceivedQuantity"" numeric NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaDivisions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""Description"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaPatches"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""DivisionId"" uuid NULL,
    ""AreaTerritoryId"" uuid NULL,
    ""HeadquarterCity"" text NULL,
    ""Description"" text NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaBeats"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""Code"" text NOT NULL,
    ""Name"" text NOT NULL,
    ""PatchId"" uuid NOT NULL,
    ""ScheduledDayOfWeek"" integer NULL,
    ""SequenceOrder"" integer NOT NULL DEFAULT 1,
    ""RouteDescription"" text NULL,
    ""EstimatedDistanceKm"" numeric NOT NULL DEFAULT 12,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaDoctorAllocationHistories"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""DoctorId"" uuid NOT NULL,
    ""FromMrUserId"" uuid NULL,
    ""ToMrUserId"" uuid NOT NULL,
    ""EffectiveDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""Reason"" text NOT NULL,
    ""ApprovedByUserId"" uuid NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaExpensePolicies"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""PolicyName"" text NOT NULL DEFAULT 'Standard Pharma Field Policy',
    ""HqDailyAllowance"" numeric NOT NULL DEFAULT 250,
    ""ExHqDailyAllowance"" numeric NOT NULL DEFAULT 350,
    ""OutstationDailyAllowance"" numeric NOT NULL DEFAULT 600,
    ""RatePerKmTwoWheeler"" numeric NOT NULL DEFAULT 3.50,
    ""RatePerKmFourWheeler"" numeric NOT NULL DEFAULT 7.00,
    ""HotelAllowancePerNight"" numeric NOT NULL DEFAULT 1200,
    ""MaxMonthlyExpenseLimit"" numeric NOT NULL DEFAULT 25000,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaUserHierarchies"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""UserId"" uuid NOT NULL,
    ""Designation"" text NOT NULL DEFAULT 'MR',
    ""HeadquartersTown"" text NULL,
    ""ReportsToUserId"" uuid NULL,
    ""AbmUserId"" uuid NULL,
    ""RsmUserId"" uuid NULL,
    ""ZsmUserId"" uuid NULL,
    ""TerritoryId"" uuid NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaSchemeMasters"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""SchemeCode"" text NOT NULL,
    ""SchemeName"" text NOT NULL,
    ""DivisionId"" uuid NULL,
    ""ItemId"" uuid NULL,
    ""SchemeType"" integer NOT NULL DEFAULT 1,
    ""ValidFromUtc"" timestamp with time zone NOT NULL,
    ""ValidToUtc"" timestamp with time zone NOT NULL,
    ""MinimumOrderQuantity"" numeric NOT NULL DEFAULT 1,
    ""MinimumOrderValue"" numeric NULL,
    ""IsActive"" boolean NOT NULL DEFAULT TRUE,
    ""Description"" text NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);

CREATE TABLE IF NOT EXISTS ""SfaSchemeSlabs"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""SchemeMasterId"" uuid NOT NULL,
    ""MinQuantity"" numeric NOT NULL,
    ""MaxQuantity"" numeric NULL,
    ""FreeQuantity"" numeric NOT NULL DEFAULT 0,
    ""DiscountPercent"" numeric NOT NULL DEFAULT 0,
    ""FlatDiscountAmount"" numeric NOT NULL DEFAULT 0,
    ""FreeItemId"" uuid NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT FALSE,
    ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
    ""CreatedBy"" uuid NULL,
    ""UpdatedAtUtc"" timestamp with time zone NULL,
    ""UpdatedBy"" uuid NULL,
    ""DeletedAtUtc"" timestamp with time zone NULL,
    ""DeletedBy"" uuid NULL
);
";
            var statements = sql.Split(new[] { "CREATE TABLE IF NOT EXISTS" }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var stmt in statements)
            {
                if (string.IsNullOrWhiteSpace(stmt)) continue;
                var fullStmt = "CREATE TABLE IF NOT EXISTS" + stmt;
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(fullStmt, cancellationToken);
                }
                catch (Exception stmtEx)
                {
                    _logger.LogWarning("Table creation sub-statement warning: {Message}", stmtEx.Message);
                }
            }

            string[] alterStatements = new[]
            {
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""LogoUrl"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""UpiId"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankName"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankAccountNumber"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankIfsc"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""BankBranch"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""IsAiAddonActive"" boolean NOT NULL DEFAULT FALSE;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AiScansLimit"" integer NOT NULL DEFAULT 500;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AiScansUsed"" integer NOT NULL DEFAULT 0;",
                // Address & Contact fields
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AddressLine1"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""AddressLine2"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""City"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""State"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""StateCode"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""Pincode"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""Email"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""Website"" text;",
                // SMTP fields
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpHost"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpPort"" integer NOT NULL DEFAULT 587;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpUsername"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpPassword"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpFromEmail"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpFromName"" text;",
                @"ALTER TABLE ""tenants"" ADD COLUMN IF NOT EXISTS ""SmtpEnableSsl"" boolean NOT NULL DEFAULT TRUE;",
                @"ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""SalesmanUserId"" uuid NULL;",
                @"ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""DoctorName"" text NULL;",
                @"ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""DoctorRegistrationNumber"" text NULL;",
                @"ALTER TABLE ""sales_invoices"" ADD COLUMN IF NOT EXISTS ""OriginalInvoiceId"" uuid NULL;",
                @"ALTER TABLE ""parties"" ADD COLUMN IF NOT EXISTS ""RouteName"" text NULL;",
                @"ALTER TABLE ""parties"" ADD COLUMN IF NOT EXISTS ""BrokerName"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IsInterState"" boolean NOT NULL DEFAULT FALSE;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""CgstRatePercent"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""CgstAmount"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SgstRatePercent"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SgstAmount"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IgstRatePercent"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""IgstAmount"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""PlaceOfSupply"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierLegalName"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierGstin"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierAddress"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SupplierStateCode"" text NULL;",
                @"ALTER TABLE ""SubscriptionInvoices"" ADD COLUMN IF NOT EXISTS ""SubscriberStateCode"" text NULL;",
                @"ALTER TABLE ""AddOns"" ADD COLUMN IF NOT EXISTS ""AnnualPrice"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""Ptr"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""Pts"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""QuarantinedStock"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""RackLocation"" text NULL;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""SupplierId"" uuid NULL;",
                @"ALTER TABLE ""ItemBatches"" ADD COLUMN IF NOT EXISTS ""IsQuarantined"" boolean NOT NULL DEFAULT FALSE;",
                @"ALTER TABLE ""Items"" ADD COLUMN IF NOT EXISTS ""DrugSchedule"" text NULL;",
                @"ALTER TABLE ""Items"" ADD COLUMN IF NOT EXISTS ""StorageCondition"" text NULL;",
                @"ALTER TABLE ""Items"" ADD COLUMN IF NOT EXISTS ""PackagingRatio"" text NULL;",

                // Pharma CBO SFA Hierarchy & Master Alters
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""DivisionId"" uuid NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""MonthlyTargetAmount"" numeric NOT NULL DEFAULT 250000;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Mobile"" text NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Email"" text NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Gender"" text NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""EmergencyContact"" text NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingAbmUserId"" uuid NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingRsmUserId"" uuid NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingZsmUserId"" uuid NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""DeviceId"" text NULL;",
                @"ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""AppVersion"" text NULL;",

                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""DivisionId"" uuid NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""PreferredVisitDay"" text NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""PreferredVisitTime"" text NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""Latitude"" double precision NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""Longitude"" double precision NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""GeofenceRadiusMeters"" double precision NOT NULL DEFAULT 200;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""SubSpecialty"" text NULL;",
                @"ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""Priority"" text NULL DEFAULT 'High';",

                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid NULL;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid NULL;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""PreferredVisitDay"" text NULL;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""Latitude"" double precision NULL;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""Longitude"" double precision NULL;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""GeofenceRadiusMeters"" double precision NOT NULL DEFAULT 200;",

                // Sprint 2 Tour Plan Enhancements
                @"ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""ActivityType"" text NOT NULL DEFAULT 'FieldWork';",
                @"ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid NULL;",
                @"ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid NULL;",
                @"ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""TargetDoctorIdsJson"" text NULL;",

                // Sprint 4 & 5 Enhancements
                @"ALTER TABLE ""SfaDailyCallReports"" ADD COLUMN IF NOT EXISTS ""PlannedDistanceKm"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SfaDailyCallReports"" ADD COLUMN IF NOT EXISTS ""ActualGpsDistanceKm"" numeric NOT NULL DEFAULT 0;",
                @"ALTER TABLE ""SfaDailyCallReports"" ADD COLUMN IF NOT EXISTS ""IsVarianceFlagged"" boolean NOT NULL DEFAULT FALSE;",
                @"ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""PreferredStockistId"" uuid NULL;",
                @"ALTER TABLE ""SfaPobOrders"" ADD COLUMN IF NOT EXISTS ""StockistFulfillmentStatus"" text NOT NULL DEFAULT 'NotRouted';",
                @"ALTER TABLE ""SfaPobOrders"" ADD COLUMN IF NOT EXISTS ""StockistRemarks"" text NULL;",
                @"ALTER TABLE ""SfaPobOrders"" ADD COLUMN IF NOT EXISTS ""ExpectedDeliveryDate"" timestamp with time zone NULL;",
                @"ALTER TABLE ""SfaPobOrderItems"" ADD COLUMN IF NOT EXISTS ""AppliedSchemeId"" uuid NULL;",
                @"ALTER TABLE ""SfaPobOrderItems"" ADD COLUMN IF NOT EXISTS ""AppliedSchemeName"" text NULL;"
            };

            foreach (var alterStmt in alterStatements)
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(alterStmt, cancellationToken);
                }
                catch (Exception alterEx)
                {
                    _logger.LogWarning("Alter column sub-statement warning: {Message}", alterEx.Message);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Table creation check completed.");
        }
    }

    private async Task SeedIndustriesAndModulesAsync(CancellationToken cancellationToken)
    {
        if (!await _context.Modules.AnyAsync(cancellationToken))
        {

        // 1. Define Core Modules
        var modSales = new Module { Code = "SALES", Name = "Sales & Invoicing", Description = "Invoicing, Quotations, POS, Returns, and Dispatch", Icon = "receipt", DisplayOrder = 1, IsCore = true };
        var modPurchase = new Module { Code = "PURCHASE", Name = "Purchase & Procurement", Description = "Vendor Bills, Purchase Orders, and GRN", Icon = "shopping-bag", DisplayOrder = 2, IsCore = true };
        var modInventory = new Module { Code = "INVENTORY", Name = "Inventory Management", Description = "Stock ledger, Multi-Warehouse, Stock Transfers", Icon = "archive", DisplayOrder = 3, IsCore = true };
        var modAccounts = new Module { Code = "ACCOUNTS", Name = "Banking & Ledgers", Description = "Customer/Vendor Balances, Receipts, Payments, Expenses", Icon = "credit-card", DisplayOrder = 4, IsCore = true };
        var modGST = new Module { Code = "GST", Name = "GST & Compliance", Description = "GSTR-1, GSTR-3B, E-Way Bill, E-Invoicing", Icon = "file-text", DisplayOrder = 5, IsCore = true };
        var modSettings = new Module { Code = "SETTINGS", Name = "Tenant Settings", Description = "Company Profile, Branches, Users, Preferences", Icon = "settings", DisplayOrder = 6, IsCore = true };

        _context.Modules.AddRange(modSales, modPurchase, modInventory, modAccounts, modGST, modSettings);

        // 2. Define Features & SubFeatures
        var featBatchTracking = new Feature { Module = modInventory, Code = "FEAT_BATCH_TRACKING", Name = "Batch & Lot Tracking", Description = "Track items with lot/batch identifiers and manufacture details", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 1 };
        var featExpiryManagement = new Feature { Module = modInventory, Code = "FEAT_EXPIRY_MANAGEMENT", Name = "Expiry Date Management", Description = "Track expiration dates and trigger near-expiry alerts", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 2 };
        var featSerialTracking = new Feature { Module = modInventory, Code = "FEAT_SERIAL_TRACKING", Name = "Serial & IMEI Tracking", Description = "Unit-level serial number and warranty tracking", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 3 };
        var featMatrixVariants = new Feature { Module = modInventory, Code = "FEAT_MATRIX_VARIANTS", Name = "Size & Color Matrix", Description = "Multidimensional item variants for apparel and footwear", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 4 };
        var featRecipeBOM = new Feature { Module = modInventory, Code = "FEAT_RECIPE_BOM", Name = "Recipe & Bill of Materials", Description = "Recipe assembly and ingredient deduction", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 5 };
        var featDrugCompliance = new Feature { Module = modSales, Code = "FEAT_DRUG_COMPLIANCE", Name = "Drug License & Schedule H1", Description = "Doctor details and Schedule H1 register maintenance", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 6 };
        var featMultiUOM = new Feature { Module = modInventory, Code = "FEAT_MULTI_UOM", Name = "Multi-UOM Packaging Conversion", Description = "Case to Piece conversion and scheme discounts", FeatureType = FeatureType.IndustrySpecific, DisplayOrder = 7 };

        _context.Features.AddRange(featBatchTracking, featExpiryManagement, featSerialTracking, featMatrixVariants, featRecipeBOM, featDrugCompliance, featMultiUOM);
        }

        // 3. Define 7 Canonical Target Industries
        var canonical = new[]
        {
            new Industry { Code = "PHARMA", Name = "Pharmaceuticals & Healthcare", Description = "Pharma Distribution, Chemists, Medicine Wholesale with Batch, Expiry, and Schedule H1 Compliance", Icon = "activity", DisplayOrder = 1, IsActive = true },
            new Industry { Code = "FMCG", Name = "FMCG Distribution & Grocery", Description = "Fast Moving Consumer Goods with Multi-UOM, Route Sales, Schemes, and Bulk Packaging", Icon = "truck", DisplayOrder = 2, IsActive = true },
            new Industry { Code = "ELECTRONICS", Name = "Electronics, Appliances & Mobile", Description = "Electronics with Serial/IMEI numbers, Warranty tracking, and Service/RMA logs", Icon = "tv", DisplayOrder = 3, IsActive = true },
            new Industry { Code = "GARMENTS", Name = "Garments, Apparel & Footwear", Description = "Apparel with Size-Color-Style Matrix, Custom Barcode Tags, and Seasonal Cataloging", Icon = "tag", DisplayOrder = 4, IsActive = true },
            new Industry { Code = "HARDWARE", Name = "Hardware, Paint & Building Materials", Description = "Hardware, Paint, Sanitary with Multi-Rate Taxes and Weight/Dimension conversions", Icon = "tool", DisplayOrder = 5, IsActive = true },
            new Industry { Code = "SERVICE_SECTOR", Name = "Service Sector & Consulting", Description = "Consulting, repairs, and professional services with job sheets and recurring invoicing", Icon = "briefcase", DisplayOrder = 6, IsActive = true },
            new Industry { Code = "OTHER", Name = "General Trading & Retail", Description = "Standard retail & wholesale trading with multi-rate GST, POS invoicing, and stock ledger", Icon = "globe", DisplayOrder = 7, IsActive = true }
        };

        if (!await _context.Industries.AnyAsync(cancellationToken))
        {
            _context.Industries.AddRange(canonical);
        }
        else
        {
            // Soft-deactivate any legacy non-canonical industries
            var canonicalCodes = new HashSet<string> { "PHARMA", "FMCG", "ELECTRONICS", "GARMENTS", "HARDWARE", "SERVICE_SECTOR", "OTHER" };
            var legacyIndustries = await _context.Industries.IgnoreQueryFilters()
                .Where(i => !canonicalCodes.Contains(i.Code))
                .ToListAsync(cancellationToken);

            foreach (var leg in legacyIndustries)
            {
                leg.IsActive = false;
                leg.IsDeleted = true;
            }

            foreach (var c in canonical)
            {
                var existing = await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Code == c.Code, cancellationToken);
                if (existing == null)
                {
                    _context.Industries.Add(c);
                }
                else
                {
                    existing.IsActive = true;
                    existing.IsDeleted = false;
                    existing.Name = c.Name;
                    existing.Description = c.Description;
                    existing.DisplayOrder = c.DisplayOrder;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedPlansAsync(CancellationToken cancellationToken)
    {
        if (await _context.Plans.AnyAsync(cancellationToken)) return;

        var starter = new Plan
        {
            Code = "STARTER",
            Name = "Starter Plan",
            Description = "Ideal for single-store small businesses and startups",
            BillingCycle = BillingCycle.Monthly,
            Price = 999m,
            TrialDays = 14,
            MaxUsers = 3,
            MaxBranches = 1,
            MaxWarehouses = 1,
            MaxInvoicesPerMonth = 300,
            MaxStorageMb = 1024,
            IsPopular = false,
            DisplayOrder = 1
        };

        var professional = new Plan
        {
            Code = "PROFESSIONAL",
            Name = "Professional Plan",
            Description = "Full capability pack for growing distributors and multi-counter retail",
            BillingCycle = BillingCycle.Monthly,
            Price = 2499m,
            TrialDays = 14,
            MaxUsers = 10,
            MaxBranches = 3,
            MaxWarehouses = 5,
            MaxInvoicesPerMonth = 3000,
            MaxStorageMb = 5120,
            IsPopular = true,
            DisplayOrder = 2
        };

        var enterprise = new Plan
        {
            Code = "ENTERPRISE",
            Name = "Enterprise Plan",
            Description = "High-throughput plan for large wholesalers and multi-branch operations",
            BillingCycle = BillingCycle.Monthly,
            Price = 5999m,
            TrialDays = 14,
            MaxUsers = 50,
            MaxBranches = 10,
            MaxWarehouses = 20,
            MaxInvoicesPerMonth = 25000,
            MaxStorageMb = 20480,
            IsPopular = false,
            DisplayOrder = 3
        };

        _context.Plans.AddRange(starter, professional, enterprise);
    }

    private async Task SeedAddOnsAsync(CancellationToken cancellationToken)
    {
        if (await _context.AddOns.AnyAsync(cancellationToken)) return;

        var addons = new List<AddOn>
        {
            new AddOn
            {
                Code = "ADDON_PHARMA",
                Name = "Pharma & Healthcare Suite",
                Description = "Batch & Expiry tracking, Schedule H1 drug compliance, Doctor directory, near-expiry dumping alerts.",
                Price = 499m,
                BillingCycle = BillingCycle.Monthly,
                IsActive = true
            },
            new AddOn
            {
                Code = "ADDON_GARMENTS",
                Name = "Apparel & Garments Matrix",
                Description = "2D Size x Color SKU Matrix, variant generation, clothing hang-tag barcode studio.",
                Price = 399m,
                BillingCycle = BillingCycle.Monthly,
                IsActive = true
            },
            new AddOn
            {
                Code = "ADDON_MANUFACTURING",
                Name = "Manufacturing & Bakery (BOM)",
                Description = "Recipe / Bill of Materials (BOM), raw materials auto-consumption, batch production runs & yield tracking.",
                Price = 599m,
                BillingCycle = BillingCycle.Monthly,
                IsActive = true
            },
            new AddOn
            {
                Code = "ADDON_FMCG",
                Name = "FMCG, Grocery & Distribution",
                Description = "Multi-unit conversion (Case/Box/Pcs), free scheme discounts (10+1 free), auto re-order thresholds.",
                Price = 399m,
                BillingCycle = BillingCycle.Monthly,
                IsActive = true
            },
            new AddOn
            {
                Code = "ADDON_ACCOUNTING",
                Name = "Dual-Entry Financial Accounting",
                Description = "Chart of Accounts (COA), Journal & Contra vouchers, Bank Reconciliation (BRS), and P&L / Balance Sheet.",
                Price = 499m,
                BillingCycle = BillingCycle.Monthly,
                IsActive = true
            }
        };

        _context.AddOns.AddRange(addons);
    }

    private async Task SeedCommercialConfigAsync(CancellationToken cancellationToken)
    {
        if (!await _context.PlatformCommercialConfigs.IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            _context.PlatformCommercialConfigs.Add(new PlatformCommercialConfig
            {
                CoreAnnualPrice = 3999m,
                CoreBiennialPrice = 6999m,
                IncludedUsers = 2,
                SingleUserAnnualPrice = 799m,
                FiveUserPackAnnualPrice = 2999m,
                AiProAnnualPrice = 1499m,
                AiProMonthlyScanLimit = 500,
                GstRatePercent = 18.0m,
                IsActive = true,
                Notes = "Default canonical commercial pricing configuration"
            });
        }

        // Ensure canonical plans exist
        if (!await _context.Plans.IgnoreQueryFilters().AnyAsync(p => p.Code == "CORE_ANNUAL", cancellationToken))
        {
            _context.Plans.Add(new Plan
            {
                Code = "CORE_ANNUAL",
                Name = "UdyogBill Core (1 Year)",
                Description = "Complete SaaS billing & ERP with 2 users included and your chosen industry pack",
                BillingCycle = BillingCycle.Annually,
                Price = 3999m,
                TrialDays = 14,
                MaxUsers = 2,
                MaxBranches = 1,
                MaxWarehouses = 2,
                MaxInvoicesPerMonth = 5000,
                MaxStorageMb = 5120,
                IsPopular = true,
                DisplayOrder = 1
            });
        }
        if (!await _context.Plans.IgnoreQueryFilters().AnyAsync(p => p.Code == "CORE_BIENNIAL", cancellationToken))
        {
            _context.Plans.Add(new Plan
            {
                Code = "CORE_BIENNIAL",
                Name = "UdyogBill Core (2 Years Deal)",
                Description = "2 Years subscription with savings, 2 users included and your chosen industry pack",
                BillingCycle = BillingCycle.Annually,
                Price = 6999m,
                TrialDays = 14,
                MaxUsers = 2,
                MaxBranches = 2,
                MaxWarehouses = 3,
                MaxInvoicesPerMonth = 10000,
                MaxStorageMb = 10240,
                IsPopular = false,
                DisplayOrder = 2
            });
        }

        // Ensure canonical add-ons exist
        if (!await _context.AddOns.IgnoreQueryFilters().AnyAsync(a => a.Code == "ADDON_EXTRA_1_USER", cancellationToken))
        {
            _context.AddOns.Add(new AddOn
            {
                Code = "ADDON_EXTRA_1_USER",
                Name = "Additional Team Member (1 User)",
                Description = "Add 1 additional operator / user seat to your organization",
                Price = 799m,
                AnnualPrice = 799m,
                BillingCycle = BillingCycle.Annually,
                AdditionalUsers = 1,
                IsActive = true
            });
        }
        if (!await _context.AddOns.IgnoreQueryFilters().AnyAsync(a => a.Code == "ADDON_EXTRA_5_USERS", cancellationToken))
        {
            _context.AddOns.Add(new AddOn
            {
                Code = "ADDON_EXTRA_5_USERS",
                Name = "5 Additional Users Pack",
                Description = "Add 5 additional operator / user seats to your organization",
                Price = 2999m,
                AnnualPrice = 2999m,
                BillingCycle = BillingCycle.Annually,
                AdditionalUsers = 5,
                IsActive = true
            });
        }
        if (!await _context.AddOns.IgnoreQueryFilters().AnyAsync(a => a.Code == "ADDON_AI_PRO", cancellationToken))
        {
            _context.AddOns.Add(new AddOn
            {
                Code = "ADDON_AI_PRO",
                Name = "AI Pro Purchase Bill Scanner",
                Description = "AI-powered purchase bill OCR, smart item extraction, batch detection (500 scans/month)",
                Price = 1499m,
                AnnualPrice = 1499m,
                BillingCycle = BillingCycle.Annually,
                IsActive = true
            });
        }

        // Ensure SERVICE_SECTOR and OTHER industries exist
        if (!await _context.Industries.IgnoreQueryFilters().AnyAsync(i => i.Code == "SERVICE_SECTOR", cancellationToken))
        {
            _context.Industries.Add(new Industry { Code = "SERVICE_SECTOR", Name = "Service Sector & Consulting", Description = "Consulting, repairs, and professional services with job sheets and recurring invoicing", Icon = "briefcase", DisplayOrder = 15 });
        }
        if (!await _context.Industries.IgnoreQueryFilters().AnyAsync(i => i.Code == "OTHER", cancellationToken))
        {
            _context.Industries.Add(new Industry { Code = "OTHER", Name = "General Trading & Retail", Description = "Standard retail & wholesale trading with multi-rate GST, POS invoicing, and stock ledger", Icon = "globe", DisplayOrder = 16 });
        }
    }

    private async Task SeedSuperAdminAsync(CancellationToken cancellationToken)
    {
        var passwordHash = _passwordHasher.HashPassword("Saurabh@1993", out var salt);

        var existingAdmins = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.IsSuperAdmin || u.Email.ToLower() == "admin@udyogbill.com" || u.Email.ToLower() == "superadmin" || u.Email.ToLower() == "superadmin@udyogbill.com")
            .ToListAsync(cancellationToken);

        foreach (var admin in existingAdmins)
        {
            admin.PasswordHash = passwordHash;
            admin.PasswordSalt = salt;
            admin.IsActive = true;
            admin.LockoutEndUtc = null;
            admin.AccessFailedCount = 0;
            admin.IsSuperAdmin = true;
        }

        var superAdminUser = existingAdmins.FirstOrDefault(u => u.Email.ToLower() == "superadmin@udyogbill.com" || u.Email.ToLower() == "superadmin");
        if (superAdminUser == null)
        {
            superAdminUser = new User
            {
                Email = "superadmin@udyogbill.com",
                FullName = "Super Admin (Saurabh)",
                PasswordHash = passwordHash,
                PasswordSalt = salt,
                IsSuperAdmin = true,
                IsTenantAdmin = false,
                IsActive = true,
                EmailConfirmed = true,
                Designation = "Platform Super Admin"
            };
            _context.Users.Add(superAdminUser);
        }

        if (!existingAdmins.Any(u => u.Email.ToLower() == "admin@udyogbill.com"))
        {
            _context.Users.Add(new User
            {
                Email = "admin@udyogbill.com",
                FullName = "Platform Super Admin",
                PasswordHash = passwordHash,
                PasswordSalt = salt,
                IsSuperAdmin = true,
                IsTenantAdmin = false,
                IsActive = true,
                EmailConfirmed = true,
                Designation = "Platform Super Admin"
            });
        }
    }

    public async Task SeedDemoTenantAndUsersAsync(CancellationToken cancellationToken)
    {
        var hasAnyTenant = await _context.Tenants.IgnoreQueryFilters().AnyAsync(cancellationToken);
        if (!hasAnyTenant)
        {
            await SeedDemoTenantsForceAsync(cancellationToken);
            return;
        }

        var tenantPasswordHash = _passwordHasher.HashPassword("Udyogbill", out var tenantSalt);

        // Update ONLY demo tenant users with default "Udyogbill" password (never wipe real customer passwords!)
        var demoTenantUsers = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.Email.ToLower() == "demo" || u.Email.ToLower() == "demo@udyogbill.com" || u.Email.ToLower() == "suresh@citypharma.com")
            .ToListAsync(cancellationToken);

        foreach (var tu in demoTenantUsers)
        {
            tu.PasswordHash = tenantPasswordHash;
            tu.PasswordSalt = tenantSalt;
            tu.IsActive = true;
            tu.LockoutEndUtc = null;
            tu.AccessFailedCount = 0;
        }

        // Sync password hashes for any real customer tenant admin whose Tenant.AdminPassword is set
        var realTenantAdmins = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Tenant)
            .Where(u => u.IsTenantAdmin && u.Tenant != null && !string.IsNullOrEmpty(u.Tenant.AdminPassword))
            .ToListAsync(cancellationToken);

        foreach (var tu in realTenantAdmins)
        {
            var emailLower = tu.Email.ToLower();
            if (emailLower != "demo" && emailLower != "demo@udyogbill.com" && emailLower != "suresh@citypharma.com")
            {
                if (!_passwordHasher.VerifyPassword(tu.Tenant!.AdminPassword, tu.PasswordHash, tu.PasswordSalt))
                {
                    tu.PasswordHash = _passwordHasher.HashPassword(tu.Tenant.AdminPassword, out var realSalt);
                    tu.PasswordSalt = realSalt;
                    tu.AccessFailedCount = 0;
                    tu.LockoutEndUtc = null;
                }
            }
        }

        var allTenants = await _context.Tenants.IgnoreQueryFilters().ToListAsync(cancellationToken);
        foreach (var tn in allTenants)
        {
            if (string.IsNullOrEmpty(tn.AdminPassword))
            {
                tn.AdminPassword = "Udyogbill";
            }
        }

        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Branches)
            .FirstOrDefaultAsync(cancellationToken);

        if (tenant != null)
        {
            var demoUser = demoTenantUsers.FirstOrDefault(u => u.Email.ToLower() == "demo@udyogbill.com" || u.Email.ToLower() == "demo");
            if (demoUser == null)
            {
                demoUser = new User
                {
                    TenantId = tenant.Id,
                    Email = "demo@udyogbill.com",
                    FullName = "Demo Tenant Admin",
                    PhoneNumber = "9876543210",
                    PasswordHash = tenantPasswordHash,
                    PasswordSalt = tenantSalt,
                    IsSuperAdmin = false,
                    IsTenantAdmin = true,
                    IsActive = true,
                    EmailConfirmed = true,
                    Designation = "Managing Director"
                };
                _context.Users.Add(demoUser);

                var adminRole = await _context.Roles
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(r => r.TenantId == tenant.Id && r.Code == "TENANT_ADMIN", cancellationToken);

                if (adminRole != null)
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        TenantId = tenant.Id,
                        User = demoUser,
                        Role = adminRole
                    });
                }
            }
        }
    }

    public async Task SeedDemoTenantsForceAsync(CancellationToken cancellationToken)
    {
        var pharmaInd = await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Code == "PHARMA", cancellationToken)
                        ?? await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(cancellationToken);
        if (pharmaInd == null) return;

        var garmentsInd = await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Code == "GARMENTS" || i.Code == "APPAREL", cancellationToken)
                          ?? pharmaInd;
        var retailInd = await _context.Industries.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Code == "RETAIL" || i.Code == "FMCG", cancellationToken)
                        ?? pharmaInd;

        var enterprisePlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "ENTERPRISE", cancellationToken)
                             ?? await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(cancellationToken);
        var proPlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "PROFESSIONAL", cancellationToken)
                      ?? enterprisePlan;
        var starterPlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "STARTER", cancellationToken)
                          ?? enterprisePlan;

        var pwdHash = _passwordHasher.HashPassword("Udyogbill", out var salt);

        // 1. Medipharm
        if (!await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Code == "MEDIPHARM", cancellationToken))
        {
            var t1 = new Tenant
            {
                Code = "MEDIPHARM",
                BusinessName = "Medipharm Healthcare & Pharmaceuticals",
                TradeName = "Medipharm Lifesciences",
                IndustryId = pharmaInd.Id,
                Status = TenantStatus.Active,
                AdminEmail = "suresh@citypharma.com",
                PrimaryPhone = "+91 98765 43210",
                GSTIN = "09AAACM1234F1Z1",
                PAN = "AAACM1234F",
                State = "Uttar Pradesh",
                StateCode = "09",
                City = "Noida",
                Pincode = "201309",
                AddressLine1 = "Tower B, Cyber City, Sector 62",
                DrugLicenseNumber = "UP-NOI-2024-98765",
                AdminPassword = "Udyogbill",
                SmtpPort = 587,
                SmtpEnableSsl = true,
                IsActive = true
            };
            _context.Tenants.Add(t1);

            var b1 = new TenantBranch { TenantId = t1.Id, BranchCode = "HO-01", BranchName = "Head Office Branch", IsHeadOffice = true, IsActive = true, GSTIN = t1.GSTIN };
            _context.TenantBranches.Add(b1);
            var w1 = new TenantWarehouse { TenantId = t1.Id, Branch = b1, WarehouseCode = "MAIN-01", WarehouseName = "Main Central Depot", IsDefault = true, IsActive = true };
            _context.TenantWarehouses.Add(w1);
            var c1 = new TenantIndustryConfig { TenantId = t1.Id, IndustryId = t1.IndustryId, EnableBatchTracking = true, EnableExpiryTracking = true, EnableScheduleH1DrugTracking = true, EnableEWayBill = true, ConfigurationJson = "{}" };
            _context.TenantIndustryConfigs.Add(c1);

            if (enterprisePlan != null)
            {
                _context.TenantSubscriptions.Add(new TenantSubscription
                {
                    TenantId = t1.Id,
                    PlanId = enterprisePlan.Id,
                    Status = SubscriptionStatus.Active,
                    StartsAtUtc = DateTimeOffset.UtcNow.AddDays(-15),
                    EndsAtUtc = DateTimeOffset.UtcNow.AddDays(350),
                    TrialEndsAtUtc = DateTimeOffset.UtcNow.AddDays(350),
                    AutoRenew = true,
                    PricePaid = enterprisePlan.Price
                });
            }

            var r1 = new Role { TenantId = t1.Id, Name = "Tenant Administrator", Code = "TENANT_ADMIN", IsSystemRole = true, IsActive = true };
            _context.Roles.Add(r1);

            var u1 = new User { TenantId = t1.Id, Email = "suresh@citypharma.com", FullName = "Suresh Sharma", PhoneNumber = "+91 98765 43210", PasswordHash = pwdHash, PasswordSalt = salt, IsTenantAdmin = true, IsActive = true, EmailConfirmed = true, Designation = "Managing Director" };
            var u1Demo = new User { TenantId = t1.Id, Email = "demo@udyogbill.com", FullName = "Demo Store Admin", PhoneNumber = "9876543210", PasswordHash = pwdHash, PasswordSalt = salt, IsTenantAdmin = true, IsActive = true, EmailConfirmed = true, Designation = "Store Manager" };
            _context.Users.AddRange(u1, u1Demo);
            _context.UserRoles.Add(new UserRole { TenantId = t1.Id, User = u1, Role = r1 });
            _context.UserRoles.Add(new UserRole { TenantId = t1.Id, User = u1Demo, Role = r1 });
        }

        // 2. Apex Fashion & Garments
        if (!await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Code == "APEXFASHION", cancellationToken))
        {
            var t2 = new Tenant
            {
                Code = "APEXFASHION",
                BusinessName = "Apex Fashion & Garments Studio",
                TradeName = "Apex Apparels & Textiles",
                IndustryId = garmentsInd.Id,
                Status = TenantStatus.Active,
                AdminEmail = "amit@apexfashion.com",
                PrimaryPhone = "+91 98111 22334",
                GSTIN = "07AAACP9988G1Z2",
                PAN = "AAACP9988G",
                State = "Delhi",
                StateCode = "07",
                City = "Connaught Place, New Delhi",
                Pincode = "110001",
                AddressLine1 = "Shop 12-14, Palika Bazaar",
                AdminPassword = "Udyogbill",
                SmtpPort = 587,
                SmtpEnableSsl = true,
                IsActive = true
            };
            _context.Tenants.Add(t2);

            var b2 = new TenantBranch { TenantId = t2.Id, BranchCode = "HO-01", BranchName = "CP Flagship Store", IsHeadOffice = true, IsActive = true, GSTIN = t2.GSTIN };
            _context.TenantBranches.Add(b2);
            var w2 = new TenantWarehouse { TenantId = t2.Id, Branch = b2, WarehouseCode = "MAIN-01", WarehouseName = "Stock Warehouse", IsDefault = true, IsActive = true };
            _context.TenantWarehouses.Add(w2);
            var c2 = new TenantIndustryConfig { TenantId = t2.Id, IndustryId = t2.IndustryId, EnableSizeColorMatrix = true, EnableEWayBill = true, ConfigurationJson = "{}" };
            _context.TenantIndustryConfigs.Add(c2);

            if (proPlan != null)
            {
                _context.TenantSubscriptions.Add(new TenantSubscription
                {
                    TenantId = t2.Id,
                    PlanId = proPlan.Id,
                    Status = SubscriptionStatus.Active,
                    StartsAtUtc = DateTimeOffset.UtcNow.AddDays(-10),
                    EndsAtUtc = DateTimeOffset.UtcNow.AddDays(355),
                    TrialEndsAtUtc = DateTimeOffset.UtcNow.AddDays(355),
                    AutoRenew = true,
                    PricePaid = proPlan.Price
                });
            }

            var r2 = new Role { TenantId = t2.Id, Name = "Tenant Administrator", Code = "TENANT_ADMIN", IsSystemRole = true, IsActive = true };
            _context.Roles.Add(r2);
            var u2 = new User { TenantId = t2.Id, Email = "amit@apexfashion.com", FullName = "Amit Verma", PhoneNumber = "+91 98111 22334", PasswordHash = pwdHash, PasswordSalt = salt, IsTenantAdmin = true, IsActive = true, EmailConfirmed = true, Designation = "Founder & CEO" };
            _context.Users.Add(u2);
            _context.UserRoles.Add(new UserRole { TenantId = t2.Id, User = u2, Role = r2 });
        }

        // 3. Sharma Supermarket (Trial)
        if (!await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Code == "SHARMAKIRANA", cancellationToken))
        {
            var t3 = new Tenant
            {
                Code = "SHARMAKIRANA",
                BusinessName = "Sharma Supermarket & Wholesale Kirana",
                TradeName = "Sharma Super Mart",
                IndustryId = retailInd.Id,
                Status = TenantStatus.Trial,
                AdminEmail = "sharma@sharmamart.com",
                PrimaryPhone = "+91 98222 33445",
                GSTIN = "27AAACS5544H1Z3",
                PAN = "AAACS5544H",
                State = "Maharashtra",
                StateCode = "27",
                City = "Andheri East, Mumbai",
                Pincode = "400069",
                AddressLine1 = "Plot 45, MIDC Central Road",
                AdminPassword = "Udyogbill",
                SmtpPort = 587,
                SmtpEnableSsl = true,
                IsActive = true
            };
            _context.Tenants.Add(t3);

            var b3 = new TenantBranch { TenantId = t3.Id, BranchCode = "HO-01", BranchName = "Main Supermarket", IsHeadOffice = true, IsActive = true, GSTIN = t3.GSTIN };
            _context.TenantBranches.Add(b3);
            var w3 = new TenantWarehouse { TenantId = t3.Id, Branch = b3, WarehouseCode = "MAIN-01", WarehouseName = "Grocery Depot", IsDefault = true, IsActive = true };
            _context.TenantWarehouses.Add(w3);
            var c3 = new TenantIndustryConfig { TenantId = t3.Id, IndustryId = t3.IndustryId, EnableBatchTracking = true, EnableExpiryTracking = true, EnableEWayBill = true, ConfigurationJson = "{}" };
            _context.TenantIndustryConfigs.Add(c3);

            if (starterPlan != null)
            {
                _context.TenantSubscriptions.Add(new TenantSubscription
                {
                    TenantId = t3.Id,
                    PlanId = starterPlan.Id,
                    Status = SubscriptionStatus.Trial,
                    StartsAtUtc = DateTimeOffset.UtcNow,
                    EndsAtUtc = DateTimeOffset.UtcNow.AddDays(14),
                    TrialEndsAtUtc = DateTimeOffset.UtcNow.AddDays(14),
                    AutoRenew = false,
                    PricePaid = 0m
                });
            }

            var r3 = new Role { TenantId = t3.Id, Name = "Tenant Administrator", Code = "TENANT_ADMIN", IsSystemRole = true, IsActive = true };
            _context.Roles.Add(r3);
            var u3 = new User { TenantId = t3.Id, Email = "sharma@sharmamart.com", FullName = "Ramesh Sharma", PhoneNumber = "+91 98222 33445", PasswordHash = pwdHash, PasswordSalt = salt, IsTenantAdmin = true, IsActive = true, EmailConfirmed = true, Designation = "Owner" };
            _context.Users.Add(u3);
            _context.UserRoles.Add(new UserRole { TenantId = t3.Id, User = u3, Role = r3 });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedPermissionsAsync(CancellationToken cancellationToken)
    {
        if (await _context.Permissions.AnyAsync(cancellationToken)) return;

        var modules = await _context.Modules.Include(m => m.Features).ToListAsync(cancellationToken);
        if (!modules.Any()) return;

        var permissionDefs = new (string ModuleCode, string FeatureCode, string FeatureName, List<(string Code, string Name, string Desc)> Perms)[]
        {
            ("SALES", "FEAT_SALES_CORE", "Sales Invoicing & POS", new()
            {
                ("sales.view", "View Sales Transactions", "View sales invoices, quotations, and POS registers"),
                ("sales.create", "Create Sales & POS Bills", "Generate tax invoices and cash counter bills"),
                ("sales.edit", "Edit Sales Transactions", "Modify existing invoices or draft quotations"),
                ("sales.cancel", "Cancel Sales Invoices", "Cancel invoices and create credit notes"),
                ("sales.quotation", "Manage Quotations", "Create and approve quotations / estimates")
            }),
            ("PURCHASE", "FEAT_PURCHASE_CORE", "Purchase & Procurement", new()
            {
                ("purchase.view", "View Purchase Records", "View vendor bills, purchase orders, and goods receipts"),
                ("purchase.create", "Create Purchase Bills", "Record inward vendor bills and purchase orders"),
                ("purchase.edit", "Edit Purchase Transactions", "Update purchase orders and vendor bills"),
                ("purchase.cancel", "Cancel Purchase Bills", "Cancel vendor bills and debit notes")
            }),
            ("INVENTORY", "FEAT_INVENTORY_CORE", "Stock & Cataloging", new()
            {
                ("inventory.view", "View Stock & Items", "View master catalog, stock balances, and batch logs"),
                ("inventory.manage", "Manage Catalog Items", "Create, edit, and categorize items and units"),
                ("inventory.adjust", "Stock Adjustments", "Record stock adjustments, wastage, and transfers"),
                ("inventory.barcode", "Barcode Label Studio", "Generate, design, and print barcode labels")
            }),
            ("ACCOUNTS", "FEAT_ACCOUNTS_CORE", "Banking & Ledgers", new()
            {
                ("accounts.view", "View Ledgers & Balances", "View party ledgers, aging reports, and cash books"),
                ("accounts.receipts", "Record Inward Receipts", "Accept customer payments and generate receipts"),
                ("accounts.payments", "Record Outward Payments", "Record payments to vendors and suppliers")
            }),
            ("GST", "FEAT_GST_CORE", "GST Returns & Filing", new()
            {
                ("gst.view", "View GST Summary", "View GSTR-1, GSTR-3B tax liability summaries"),
                ("gst.export", "Export GST Return Files", "Export filing CSV and JSON data for GST portal")
            }),
            ("SETTINGS", "FEAT_SETTINGS_CORE", "Tenant Administration", new()
            {
                ("tenant.settings", "Manage Business Profile", "Update company details, tax registration, and settings"),
                ("branches.manage", "Manage Branches & Stores", "Create and manage multiple branches and warehouses"),
                ("staff.manage", "Manage Staff & RBAC", "Invite staff users and configure role permissions")
            })
        };

        foreach (var def in permissionDefs)
        {
            var module = modules.FirstOrDefault(m => m.Code == def.ModuleCode);
            if (module == null) continue;

            var feature = module.Features.FirstOrDefault(f => f.Code == def.FeatureCode);
            if (feature == null)
            {
                feature = new Feature
                {
                    ModuleId = module.Id,
                    Code = def.FeatureCode,
                    Name = def.FeatureName,
                    Description = $"{module.Name} core capabilities and permissions",
                    FeatureType = FeatureType.Standard,
                    DisplayOrder = 1,
                    IsActive = true
                };
                _context.Features.Add(feature);
            }

            foreach (var (code, name, desc) in def.Perms)
            {
                _context.Permissions.Add(new Permission
                {
                    Feature = feature,
                    Code = code,
                    Name = name,
                    Description = desc,
                    Group = module.Name,
                    IsSystem = true
                });
            }
        }
    }

    private async Task SeedPlatformSettingsAsync(CancellationToken cancellationToken)
    {
        if (!await _context.PlatformCompanyProfiles.AnyAsync(cancellationToken))
        {
            _context.PlatformCompanyProfiles.Add(new PlatformCompanyProfile
            {
                LegalCompanyName = "Udyog Software Technologies Private Limited",
                ProductBrandName = "UdyogBill",
                Tagline = "Smart Cloud Invoicing & Business ERP",
                Gstin = "09AAACU9876A1Z5",
                Pan = "AAACU9876A",
                State = "Uttar Pradesh",
                StateCode = "09",
                AddressLine1 = "Tower B, Cyber City",
                AddressLine2 = "Sector 62",
                City = "Noida",
                Pincode = "201309",
                SupportEmail = "support@udyogbill.com",
                SupportPhone = "+91 98765 43210",
                Website = "https://udyogbill.com",
                BankName = "HDFC Bank",
                BankAccountNumber = "50200012345678",
                BankIfsc = "HDFC0001234",
                BankBranch = "Noida Sector 62 Branch",
                UpiId = "udyogbill@hdfcbank",
                AuthorizedSignatoryName = "Authorized Signatory",
                AuthorizedSignatoryDesignation = "Finance Director",
                InvoicePrefix = "UB/SUB/26-27/",
                InvoiceTermsAndConditions = "1. This is a computer generated tax invoice for software subscription.\n2. SAC Code 998313 (Information Technology Software Services).\n3. Input tax credit is available subject to valid GSTIN."
            });
        }

        if (!await _context.PlatformEmailConfigs.AnyAsync(cancellationToken))
        {
            _context.PlatformEmailConfigs.Add(new PlatformEmailConfig
            {
                SmtpHost = "smtp.gmail.com",
                SmtpPort = 587,
                SmtpUsername = "notifications@udyogbill.com",
                SmtpPassword = "",
                FromEmail = "billing@udyogbill.com",
                FromName = "UdyogBill Cloud Billing",
                ReplyToEmail = "support@udyogbill.com",
                EnableSsl = true,
                IsActive = true
            });
        }
    }
}
