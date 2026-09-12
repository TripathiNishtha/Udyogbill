using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Common;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Domain.Entities.Common;
using UdyogBill.Domain.Entities.Pharma;
using CatalogModule = UdyogBill.Domain.Entities.Catalog.Module;

namespace UdyogBill.Persistence.Context;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ITenantContext? _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public Guid CurrentTenantId => _tenantContext?.TenantId ?? Guid.Empty;
    public bool IsSuperAdmin => _tenantContext?.IsSuperAdmin ?? false;

    // Tenants
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantIndustryConfig> TenantIndustryConfigs => Set<TenantIndustryConfig>();
    public DbSet<TenantBranch> TenantBranches => Set<TenantBranch>();
    public DbSet<TenantWarehouse> TenantWarehouses => Set<TenantWarehouse>();
    public DbSet<TenantSetting> TenantSettings => Set<TenantSetting>();

    // Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Catalog & Capabilities
    public DbSet<Industry> Industries => Set<Industry>();
    public DbSet<CatalogModule> Modules => Set<CatalogModule>();
    public DbSet<IndustryModule> IndustryModules => Set<IndustryModule>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<IndustryFeature> IndustryFeatures => Set<IndustryFeature>();
    public DbSet<SubFeature> SubFeatures => Set<SubFeature>();
    public DbSet<Permission> Permissions => Set<Permission>();

    // Subscriptions
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<PlanEntitlement> PlanEntitlements => Set<PlanEntitlement>();
    public DbSet<TenantSubscription> TenantSubscriptions => Set<TenantSubscription>();
    public DbSet<AddOn> AddOns => Set<AddOn>();
    public DbSet<TenantSubscriptionAddOn> TenantSubscriptionAddOns => Set<TenantSubscriptionAddOn>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CouponRedemption> CouponRedemptions => Set<CouponRedemption>();
    public DbSet<PaymentGatewayConfig> PaymentGatewayConfigs => Set<PaymentGatewayConfig>();
    public DbSet<SubscriptionInvoice> SubscriptionInvoices => Set<SubscriptionInvoice>();
    public DbSet<PlatformCompanyProfile> PlatformCompanyProfiles => Set<PlatformCompanyProfile>();
    public DbSet<PlatformCommercialConfig> PlatformCommercialConfigs => Set<PlatformCommercialConfig>();
    public DbSet<PlatformEmailConfig> PlatformEmailConfigs => Set<PlatformEmailConfig>();
    public DbSet<PlatformPasswordResetOtp> PlatformPasswordResetOtps => Set<PlatformPasswordResetOtp>();

    // Auditing
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Inventory & Catalog
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();
    public DbSet<UnitConversion> UnitConversions => Set<UnitConversion>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<ItemBatch> ItemBatches => Set<ItemBatch>();
    public DbSet<ItemSerialNumber> ItemSerialNumbers => Set<ItemSerialNumber>();
    public DbSet<ItemVariant> ItemVariants => Set<ItemVariant>();
    public DbSet<ItemWarehouseStock> ItemWarehouseStocks => Set<ItemWarehouseStock>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();

    // Parties & Ledgers
    public DbSet<Party> Parties => Set<Party>();
    public DbSet<PartyAddress> PartyAddresses => Set<PartyAddress>();
    public DbSet<PartyLedgerEntry> PartyLedgerEntries => Set<PartyLedgerEntry>();
    public DbSet<Broker> Brokers => Set<Broker>();
    public DbSet<BrokerCommissionEntry> BrokerCommissionEntries => Set<BrokerCommissionEntry>();

    // Sales, Quotations & Invoicing
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationItem> QuotationItems => Set<QuotationItem>();
    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
    public DbSet<SalesInvoiceItem> SalesInvoiceItems => Set<SalesInvoiceItem>();
    public DbSet<SalesInvoicePayment> SalesInvoicePayments => Set<SalesInvoicePayment>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnItem> SalesReturnItems => Set<SalesReturnItem>();
    public DbSet<PosHeldBill> PosHeldBills => Set<PosHeldBill>();

    // Purchases & Procurement
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<GoodsReceiptNote> GoodsReceiptNotes => Set<GoodsReceiptNote>();
    public DbSet<GoodsReceiptNoteItem> GoodsReceiptNoteItems => Set<GoodsReceiptNoteItem>();
    public DbSet<PurchaseBill> PurchaseBills => Set<PurchaseBill>();
    public DbSet<PurchaseBillItem> PurchaseBillItems => Set<PurchaseBillItem>();
    public DbSet<PurchaseBillPayment> PurchaseBillPayments => Set<PurchaseBillPayment>();
    public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
    public DbSet<PurchaseReturnItem> PurchaseReturnItems => Set<PurchaseReturnItem>();

    // Inter-Warehouse Stock Transfers
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();

    // Banking & Expenses
    public DbSet<Domain.Entities.Banking.BankAccount> BankAccounts => Set<Domain.Entities.Banking.BankAccount>();
    public DbSet<Domain.Entities.Banking.ExpenseCategory> ExpenseCategories => Set<Domain.Entities.Banking.ExpenseCategory>();
    public DbSet<Domain.Entities.Banking.ExpenseVoucher> ExpenseVouchers => Set<Domain.Entities.Banking.ExpenseVoucher>();
    public DbSet<Domain.Entities.Banking.CashDrawerSession> CashDrawerSessions => Set<Domain.Entities.Banking.CashDrawerSession>();
    public DbSet<Domain.Entities.Banking.ChequeRegister> ChequeRegisters => Set<Domain.Entities.Banking.ChequeRegister>();

    // Loyalty & Promotions
    public DbSet<Domain.Entities.Loyalty.LoyaltyProgramConfig> LoyaltyProgramConfigs => Set<Domain.Entities.Loyalty.LoyaltyProgramConfig>();
    public DbSet<Domain.Entities.Loyalty.CustomerLoyaltyAccount> CustomerLoyaltyAccounts => Set<Domain.Entities.Loyalty.CustomerLoyaltyAccount>();
    public DbSet<Domain.Entities.Loyalty.LoyaltyTransaction> LoyaltyTransactions => Set<Domain.Entities.Loyalty.LoyaltyTransaction>();
    public DbSet<Domain.Entities.Loyalty.PromotionalCoupon> PromotionalCoupons => Set<Domain.Entities.Loyalty.PromotionalCoupon>();

    // Notifications & Webhooks
    public DbSet<Domain.Entities.Notifications.NotificationGatewayConfig> NotificationGatewayConfigs => Set<Domain.Entities.Notifications.NotificationGatewayConfig>();
    public DbSet<Domain.Entities.Notifications.NotificationTemplate> NotificationTemplates => Set<Domain.Entities.Notifications.NotificationTemplate>();
    public DbSet<Domain.Entities.Notifications.NotificationDispatchLog> NotificationDispatchLogs => Set<Domain.Entities.Notifications.NotificationDispatchLog>();
    public DbSet<Domain.Entities.Notifications.TenantWebhookEndpoint> TenantWebhookEndpoints => Set<Domain.Entities.Notifications.TenantWebhookEndpoint>();

    // Logistics & Dispatch
    public DbSet<Domain.Entities.Logistics.Transporter> Transporters => Set<Domain.Entities.Logistics.Transporter>();
    public DbSet<Domain.Entities.Logistics.DeliveryChallan> DeliveryChallans => Set<Domain.Entities.Logistics.DeliveryChallan>();
    public DbSet<Domain.Entities.Logistics.DeliveryChallanItem> DeliveryChallanItems => Set<Domain.Entities.Logistics.DeliveryChallanItem>();
    public DbSet<Domain.Entities.Logistics.EWayBillDetails> EWayBills => Set<Domain.Entities.Logistics.EWayBillDetails>();

    // Print & Document Templates
    public DbSet<Domain.Entities.Printing.PrintTemplate> PrintTemplates => Set<Domain.Entities.Printing.PrintTemplate>();

    // Data Backups, Disaster Recovery & System Health
    public DbSet<Domain.Entities.Backups.BackupJob> BackupJobs => Set<Domain.Entities.Backups.BackupJob>();
    public DbSet<Domain.Entities.Backups.BackupScheduleConfig> BackupScheduleConfigs => Set<Domain.Entities.Backups.BackupScheduleConfig>();
    public DbSet<Domain.Entities.Backups.SystemHealthMetric> SystemHealthMetrics => Set<Domain.Entities.Backups.SystemHealthMetric>();

    // Reporting Engine Presets
    public DbSet<Domain.Entities.Reports.SavedReportPreset> SavedReportPresets => Set<Domain.Entities.Reports.SavedReportPreset>();

    // Pharma & Healthcare Suite
    public DbSet<SaltMaster> SaltMasters => Set<SaltMaster>();
    public DbSet<ItemSaltComposition> ItemSaltCompositions => Set<ItemSaltComposition>();
    public DbSet<DoctorPrescriber> DoctorPrescribers => Set<DoctorPrescriber>();
    public DbSet<ScheduleH1RegisterEntry> ScheduleH1RegisterEntries => Set<ScheduleH1RegisterEntry>();
    public DbSet<ExpiryReturnClaim> ExpiryReturnClaims => Set<ExpiryReturnClaim>();
    public DbSet<ExpiryReturnClaimItem> ExpiryReturnClaimItems => Set<ExpiryReturnClaimItem>();

    // Pharma CBO-Level SFA & Field Force Suite
    public DbSet<SfaDivision> SfaDivisions => Set<SfaDivision>();
    public DbSet<SfaTerritory> SfaTerritories => Set<SfaTerritory>();
    public DbSet<SfaPatch> SfaPatches => Set<SfaPatch>();
    public DbSet<SfaBeat> SfaBeats => Set<SfaBeat>();
    public DbSet<SfaEmployeeProfile> SfaEmployeeProfiles => Set<SfaEmployeeProfile>();
    public DbSet<SfaDoctor> SfaDoctors => Set<SfaDoctor>();
    public DbSet<SfaDoctorAllocationHistory> SfaDoctorAllocationHistories => Set<SfaDoctorAllocationHistory>();
    public DbSet<SfaChemist> SfaChemists => Set<SfaChemist>();
    public DbSet<SfaStockistAllocation> SfaStockistAllocations => Set<SfaStockistAllocation>();
    public DbSet<SfaTourPlan> SfaTourPlans => Set<SfaTourPlan>();
    public DbSet<SfaTourPlanItem> SfaTourPlanItems => Set<SfaTourPlanItem>();
    public DbSet<SfaDailyCallReport> SfaDailyCallReports => Set<SfaDailyCallReport>();
    public DbSet<SfaDcrDoctorVisit> SfaDcrDoctorVisits => Set<SfaDcrDoctorVisit>();
    public DbSet<SfaDcrChemistVisit> SfaDcrChemistVisits => Set<SfaDcrChemistVisit>();
    public DbSet<SfaDcrStockistVisit> SfaDcrStockistVisits => Set<SfaDcrStockistVisit>();
    public DbSet<SfaSampleStock> SfaSampleStocks => Set<SfaSampleStock>();
    public DbSet<SfaSampleChallan> SfaSampleChallans => Set<SfaSampleChallan>();
    public DbSet<SfaSampleChallanItem> SfaSampleChallanItems => Set<SfaSampleChallanItem>();
    public DbSet<SfaPobOrder> SfaPobOrders => Set<SfaPobOrder>();
    public DbSet<SfaPobOrderItem> SfaPobOrderItems => Set<SfaPobOrderItem>();
    public DbSet<SfaSalesAttribution> SfaSalesAttributions => Set<SfaSalesAttribution>();
    public DbSet<SfaMrTarget> SfaMrTargets => Set<SfaMrTarget>();
    public DbSet<SfaExpenseClaim> SfaExpenseClaims => Set<SfaExpenseClaim>();
    public DbSet<SfaExpenseClaimItem> SfaExpenseClaimItems => Set<SfaExpenseClaimItem>();
    public DbSet<SfaExpensePolicy> SfaExpensePolicies => Set<SfaExpensePolicy>();
    public DbSet<SfaUserHierarchy> SfaUserHierarchies => Set<SfaUserHierarchy>();
    public DbSet<SfaSchemeMaster> SfaSchemeMasters => Set<SfaSchemeMaster>();
    public DbSet<SfaSchemeSlab> SfaSchemeSlabs => Set<SfaSchemeSlab>();

    // Financial Accounting Suite
    public DbSet<Domain.Entities.Accounting.AccountGroup> AccountGroups => Set<Domain.Entities.Accounting.AccountGroup>();
    public DbSet<Domain.Entities.Accounting.LedgerAccount> LedgerAccounts => Set<Domain.Entities.Accounting.LedgerAccount>();
    public DbSet<Domain.Entities.Accounting.JournalVoucher> JournalVouchers => Set<Domain.Entities.Accounting.JournalVoucher>();
    public DbSet<Domain.Entities.Accounting.JournalVoucherLeg> JournalVoucherLegs => Set<Domain.Entities.Accounting.JournalVoucherLeg>();

    // CMS - Marketing Website
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<AnalyticsConfig> AnalyticsConfigs => Set<AnalyticsConfig>();
    public DbSet<MobileAppConfig> MobileAppConfigs => Set<MobileAppConfig>();
    public DbSet<MobilePushBroadcast> MobilePushBroadcasts => Set<MobilePushBroadcast>();
    public DbSet<MobileDeviceRegistration> MobileDeviceRegistrations => Set<MobileDeviceRegistration>();

    // Referrals & Affiliate Partner Program
    public DbSet<Domain.Entities.Referrals.ReferralProgramConfig> ReferralProgramConfigs => Set<Domain.Entities.Referrals.ReferralProgramConfig>();
    public DbSet<Domain.Entities.Referrals.TenantReferralProfile> TenantReferralProfiles => Set<Domain.Entities.Referrals.TenantReferralProfile>();
    public DbSet<Domain.Entities.Referrals.TenantReferralConversion> TenantReferralConversions => Set<Domain.Entities.Referrals.TenantReferralConversion>();

    // Idempotency Tracking
    public DbSet<IdempotentRequest> IdempotentRequests => Set<IdempotentRequest>();

    void IAppDbContext.Add<TEntity>(TEntity entity) => base.Add(entity);

    // IAppDbContext explicit interface properties
    IQueryable<Tenant> IAppDbContext.Tenants => Tenants;
    IQueryable<TenantIndustryConfig> IAppDbContext.TenantIndustryConfigs => TenantIndustryConfigs;
    IQueryable<TenantBranch> IAppDbContext.TenantBranches => TenantBranches;
    IQueryable<TenantWarehouse> IAppDbContext.TenantWarehouses => TenantWarehouses;
    IQueryable<TenantSetting> IAppDbContext.TenantSettings => TenantSettings;
    IQueryable<User> IAppDbContext.Users => Users;
    IQueryable<Role> IAppDbContext.Roles => Roles;
    IQueryable<UserRole> IAppDbContext.UserRoles => UserRoles;
    IQueryable<RolePermission> IAppDbContext.RolePermissions => RolePermissions;
    IQueryable<UserPermission> IAppDbContext.UserPermissions => UserPermissions;
    IQueryable<RefreshToken> IAppDbContext.RefreshTokens => RefreshTokens;
    IQueryable<Industry> IAppDbContext.Industries => Industries;
    IQueryable<CatalogModule> IAppDbContext.Modules => Modules;
    IQueryable<IndustryModule> IAppDbContext.IndustryModules => IndustryModules;
    IQueryable<Feature> IAppDbContext.Features => Features;
    IQueryable<IndustryFeature> IAppDbContext.IndustryFeatures => IndustryFeatures;
    IQueryable<SubFeature> IAppDbContext.SubFeatures => SubFeatures;
    IQueryable<Permission> IAppDbContext.Permissions => Permissions;
    IQueryable<Plan> IAppDbContext.Plans => Plans;
    IQueryable<PlanEntitlement> IAppDbContext.PlanEntitlements => PlanEntitlements;
    IQueryable<TenantSubscription> IAppDbContext.TenantSubscriptions => TenantSubscriptions;
    IQueryable<AddOn> IAppDbContext.AddOns => AddOns;
    IQueryable<TenantSubscriptionAddOn> IAppDbContext.TenantSubscriptionAddOns => TenantSubscriptionAddOns;
    IQueryable<PaymentGatewayConfig> IAppDbContext.PaymentGatewayConfigs => PaymentGatewayConfigs;
    IQueryable<SubscriptionInvoice> IAppDbContext.SubscriptionInvoices => SubscriptionInvoices;
    IQueryable<PlatformCompanyProfile> IAppDbContext.PlatformCompanyProfiles => PlatformCompanyProfiles;
    IQueryable<PlatformCommercialConfig> IAppDbContext.PlatformCommercialConfigs => PlatformCommercialConfigs;
    IQueryable<PlatformEmailConfig> IAppDbContext.PlatformEmailConfigs => PlatformEmailConfigs;
    IQueryable<PlatformPasswordResetOtp> IAppDbContext.PlatformPasswordResetOtps => PlatformPasswordResetOtps;
    IQueryable<AuditLog> IAppDbContext.AuditLogs => AuditLogs;

    // Inventory explicit properties
    IQueryable<Category> IAppDbContext.Categories => Categories;
    IQueryable<Brand> IAppDbContext.Brands => Brands;
    IQueryable<UnitOfMeasure> IAppDbContext.UnitsOfMeasure => UnitsOfMeasure;
    IQueryable<UnitConversion> IAppDbContext.UnitConversions => UnitConversions;
    IQueryable<Item> IAppDbContext.Items => Items;
    IQueryable<ItemBatch> IAppDbContext.ItemBatches => ItemBatches;
    IQueryable<ItemSerialNumber> IAppDbContext.ItemSerialNumbers => ItemSerialNumbers;
    IQueryable<ItemVariant> IAppDbContext.ItemVariants => ItemVariants;
    IQueryable<ItemWarehouseStock> IAppDbContext.ItemWarehouseStocks => ItemWarehouseStocks;
    IQueryable<StockMovement> IAppDbContext.StockMovements => StockMovements;

    // Parties explicit properties
    IQueryable<Party> IAppDbContext.Parties => Parties;
    IQueryable<PartyAddress> IAppDbContext.PartyAddresses => PartyAddresses;
    IQueryable<PartyLedgerEntry> IAppDbContext.PartyLedgerEntries => PartyLedgerEntries;
    IQueryable<Broker> IAppDbContext.Brokers => Brokers;
    IQueryable<BrokerCommissionEntry> IAppDbContext.BrokerCommissionEntries => BrokerCommissionEntries;

    // Sales explicit properties
    IQueryable<Quotation> IAppDbContext.Quotations => Quotations;
    IQueryable<QuotationItem> IAppDbContext.QuotationItems => QuotationItems;
    IQueryable<SalesInvoice> IAppDbContext.SalesInvoices => SalesInvoices;
    IQueryable<SalesInvoiceItem> IAppDbContext.SalesInvoiceItems => SalesInvoiceItems;
    IQueryable<SalesInvoicePayment> IAppDbContext.SalesInvoicePayments => SalesInvoicePayments;
    IQueryable<SalesReturn> IAppDbContext.SalesReturns => SalesReturns;
    IQueryable<SalesReturnItem> IAppDbContext.SalesReturnItems => SalesReturnItems;

    // Purchases explicit properties
    IQueryable<PurchaseOrder> IAppDbContext.PurchaseOrders => PurchaseOrders;
    IQueryable<PurchaseOrderItem> IAppDbContext.PurchaseOrderItems => PurchaseOrderItems;
    IQueryable<GoodsReceiptNote> IAppDbContext.GoodsReceiptNotes => GoodsReceiptNotes;
    IQueryable<GoodsReceiptNoteItem> IAppDbContext.GoodsReceiptNoteItems => GoodsReceiptNoteItems;
    IQueryable<PurchaseBill> IAppDbContext.PurchaseBills => PurchaseBills;
    IQueryable<PurchaseBillItem> IAppDbContext.PurchaseBillItems => PurchaseBillItems;
    IQueryable<PurchaseBillPayment> IAppDbContext.PurchaseBillPayments => PurchaseBillPayments;
    IQueryable<PurchaseReturn> IAppDbContext.PurchaseReturns => PurchaseReturns;
    IQueryable<PurchaseReturnItem> IAppDbContext.PurchaseReturnItems => PurchaseReturnItems;

    // Inter-Warehouse Stock Transfers explicit properties
    IQueryable<StockTransfer> IAppDbContext.StockTransfers => StockTransfers;
    IQueryable<StockTransferItem> IAppDbContext.StockTransferItems => StockTransferItems;

    // Banking & Expenses explicit properties
    IQueryable<Domain.Entities.Banking.BankAccount> IAppDbContext.BankAccounts => BankAccounts;
    IQueryable<Domain.Entities.Banking.ExpenseCategory> IAppDbContext.ExpenseCategories => ExpenseCategories;
    IQueryable<Domain.Entities.Banking.ExpenseVoucher> IAppDbContext.ExpenseVouchers => ExpenseVouchers;
    IQueryable<Domain.Entities.Banking.CashDrawerSession> IAppDbContext.CashDrawerSessions => CashDrawerSessions;
    IQueryable<Domain.Entities.Banking.ChequeRegister> IAppDbContext.ChequeRegisters => ChequeRegisters;

    // Loyalty & Promotions explicit properties
    IQueryable<Domain.Entities.Loyalty.LoyaltyProgramConfig> IAppDbContext.LoyaltyProgramConfigs => LoyaltyProgramConfigs;
    IQueryable<Domain.Entities.Loyalty.CustomerLoyaltyAccount> IAppDbContext.CustomerLoyaltyAccounts => CustomerLoyaltyAccounts;
    IQueryable<Domain.Entities.Loyalty.LoyaltyTransaction> IAppDbContext.LoyaltyTransactions => LoyaltyTransactions;
    IQueryable<Domain.Entities.Loyalty.PromotionalCoupon> IAppDbContext.PromotionalCoupons => PromotionalCoupons;

    // Notifications & Webhooks explicit properties
    IQueryable<Domain.Entities.Notifications.NotificationGatewayConfig> IAppDbContext.NotificationGatewayConfigs => NotificationGatewayConfigs;
    IQueryable<Domain.Entities.Notifications.NotificationTemplate> IAppDbContext.NotificationTemplates => NotificationTemplates;
    IQueryable<Domain.Entities.Notifications.NotificationDispatchLog> IAppDbContext.NotificationDispatchLogs => NotificationDispatchLogs;
    IQueryable<Domain.Entities.Notifications.TenantWebhookEndpoint> IAppDbContext.TenantWebhookEndpoints => TenantWebhookEndpoints;

    // Logistics & Dispatch explicit properties
    IQueryable<Domain.Entities.Logistics.Transporter> IAppDbContext.Transporters => Transporters;
    IQueryable<Domain.Entities.Logistics.DeliveryChallan> IAppDbContext.DeliveryChallans => DeliveryChallans;
    IQueryable<Domain.Entities.Logistics.DeliveryChallanItem> IAppDbContext.DeliveryChallanItems => DeliveryChallanItems;
    IQueryable<Domain.Entities.Logistics.EWayBillDetails> IAppDbContext.EWayBills => EWayBills;

    // Print & Document Templates explicit properties
    IQueryable<Domain.Entities.Printing.PrintTemplate> IAppDbContext.PrintTemplates => PrintTemplates;

    // Data Backups, Disaster Recovery & System Health explicit properties
    IQueryable<Domain.Entities.Backups.BackupJob> IAppDbContext.BackupJobs => BackupJobs;
    IQueryable<Domain.Entities.Backups.BackupScheduleConfig> IAppDbContext.BackupScheduleConfigs => BackupScheduleConfigs;
    IQueryable<Domain.Entities.Backups.SystemHealthMetric> IAppDbContext.SystemHealthMetrics => SystemHealthMetrics;

    // Reporting Engine Presets explicit properties
    IQueryable<Domain.Entities.Reports.SavedReportPreset> IAppDbContext.SavedReportPresets => SavedReportPresets;

    // Pharma & Healthcare Suite explicit properties
    IQueryable<SaltMaster> IAppDbContext.SaltMasters => SaltMasters;
    IQueryable<ItemSaltComposition> IAppDbContext.ItemSaltCompositions => ItemSaltCompositions;
    IQueryable<DoctorPrescriber> IAppDbContext.DoctorPrescribers => DoctorPrescribers;
    IQueryable<ScheduleH1RegisterEntry> IAppDbContext.ScheduleH1RegisterEntries => ScheduleH1RegisterEntries;
    IQueryable<ExpiryReturnClaim> IAppDbContext.ExpiryReturnClaims => ExpiryReturnClaims;
    IQueryable<ExpiryReturnClaimItem> IAppDbContext.ExpiryReturnClaimItems => ExpiryReturnClaimItems;

    // CMS - Marketing Website explicit properties
    IQueryable<Lead> IAppDbContext.Leads => Leads;

    // Referrals explicit properties
    IQueryable<Domain.Entities.Referrals.ReferralProgramConfig> IAppDbContext.ReferralProgramConfigs => ReferralProgramConfigs;
    IQueryable<Domain.Entities.Referrals.TenantReferralProfile> IAppDbContext.TenantReferralProfiles => TenantReferralProfiles;
    IQueryable<Domain.Entities.Referrals.TenantReferralConversion> IAppDbContext.TenantReferralConversions => TenantReferralConversions;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all entity configurations in assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Reporting Engine Composite Indexes for High Performance
        modelBuilder.Entity<SalesInvoice>()
            .HasIndex(i => new { i.TenantId, i.InvoiceDate, i.Status, i.BranchId });
        modelBuilder.Entity<SalesInvoice>()
            .HasIndex(i => new { i.TenantId, i.PrimaryPaymentMode, i.InvoiceDate });
        modelBuilder.Entity<SalesInvoice>()
            .HasIndex(i => new { i.TenantId, i.PartyId, i.PaymentStatus });

        modelBuilder.Entity<SalesInvoiceItem>()
            .HasIndex(i => new { i.TenantId, i.ItemId, i.CreatedAtUtc });
        modelBuilder.Entity<SalesInvoiceItem>()
            .HasIndex(i => new { i.TenantId, i.BatchId });
        modelBuilder.Entity<SalesInvoiceItem>()
            .HasIndex(i => new { i.TenantId, i.HsnCode, i.GstRate });

        modelBuilder.Entity<PurchaseBill>()
            .HasIndex(b => new { b.TenantId, b.BillDate, b.Status, b.BranchId });
        modelBuilder.Entity<PurchaseBill>()
            .HasIndex(b => new { b.TenantId, b.PartyId, b.PaymentStatus });

        modelBuilder.Entity<ItemWarehouseStock>()
            .HasIndex(s => new { s.TenantId, s.WarehouseId, s.CurrentQuantity });
        modelBuilder.Entity<ItemBatch>()
            .HasIndex(b => new { b.TenantId, b.ExpiryDate, b.IsActive });

        modelBuilder.Entity<StockMovement>()
            .HasIndex(sm => new { sm.TenantId, sm.MovementType, sm.CreatedAtUtc });
        modelBuilder.Entity<PartyLedgerEntry>()
            .HasIndex(l => new { l.TenantId, l.PartyId, l.TransactionDate, l.EntryType });
        modelBuilder.Entity<Domain.Entities.Banking.ExpenseVoucher>()
            .HasIndex(e => new { e.TenantId, e.CategoryId, e.ExpenseDate });

        modelBuilder.Entity<Domain.Entities.Banking.ChequeRegister>(b =>
        {
            b.ToTable("cheque_registers");
            b.HasKey(c => c.Id);
            b.Property(c => c.ChequeNumber).HasMaxLength(50).IsRequired();
            b.Property(c => c.BankName).HasMaxLength(150).IsRequired();
            b.Property(c => c.BranchName).HasMaxLength(150);
            b.Property(c => c.PartyName).HasMaxLength(200).IsRequired();
            b.Property(c => c.Amount).HasPrecision(18, 4);
            b.Property(c => c.BounceChargesAmount).HasPrecision(18, 4);
            b.HasIndex(c => new { c.TenantId, c.ChequeNumber, c.BankName });
            b.HasIndex(c => new { c.TenantId, c.PartyId, c.Status });
            b.HasIndex(c => new { c.TenantId, c.ChequeDate, c.Status });
            b.HasOne(c => c.BankAccount)
                .WithMany()
                .HasForeignKey(c => c.BankAccountId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SalesReturn>()
            .HasIndex(r => new { r.TenantId, r.CreditNoteNumber })
            .IsUnique();
        modelBuilder.Entity<SalesReturn>()
            .HasIndex(r => new { r.TenantId, r.ReturnDate, r.PartyId });

        modelBuilder.Entity<PurchaseReturn>()
            .HasIndex(r => new { r.TenantId, r.DebitNoteNumber })
            .IsUnique();
        modelBuilder.Entity<PurchaseReturn>()
            .HasIndex(r => new { r.TenantId, r.ReturnDate, r.PartyId });

        modelBuilder.Entity<IdempotentRequest>()
            .HasIndex(r => new { r.TenantId, r.IdempotencyKey })
            .IsUnique();

        modelBuilder.Entity<StockTransfer>()
            .HasIndex(t => new { t.TenantId, t.TransferDate, t.Status });

        modelBuilder.Entity<SfaUserHierarchy>(b =>
        {
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ReportsToUser).WithMany().HasForeignKey(x => x.ReportsToUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.AbmUser).WithMany().HasForeignKey(x => x.AbmUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.RsmUser).WithMany().HasForeignKey(x => x.RsmUserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ZsmUser).WithMany().HasForeignKey(x => x.ZsmUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Configure Global Query Filters for Soft Delete and Multi-Tenancy
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            var isTenantScoped = typeof(ITenantScopedEntity).IsAssignableFrom(clrType) && clrType != typeof(User);
            var isSoftDeletable = typeof(ISoftDeletable).IsAssignableFrom(clrType);

            if (isTenantScoped || isSoftDeletable)
            {
                var method = typeof(AppDbContext)
                    .GetMethod(nameof(ConfigureGlobalFilters), BindingFlags.NonPublic | BindingFlags.Instance)?
                    .MakeGenericMethod(clrType);

                method?.Invoke(this, new object[] { modelBuilder, isTenantScoped, isSoftDeletable });
            }
        }
    }

    private void ConfigureGlobalFilters<TEntity>(ModelBuilder builder, bool isTenantScoped, bool isSoftDeletable) where TEntity : class
    {
        var parameter = Expression.Parameter(typeof(TEntity), "e");
        Expression? filterExpression = null;

        if (isSoftDeletable)
        {
            var isDeletedProp = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
            var notDeleted = Expression.Equal(isDeletedProp, Expression.Constant(false));
            filterExpression = notDeleted;
        }

        if (isTenantScoped)
        {
            var tenantIdProp = Expression.Property(parameter, nameof(ITenantScopedEntity.TenantId));
            
            // Expression: (context.IsSuperAdmin || e.TenantId == context.CurrentTenantId)
            var isSuperAdminExpr = Expression.Property(Expression.Constant(this), nameof(IsSuperAdmin));
            var currentTenantIdExpr = Expression.Property(Expression.Constant(this), nameof(CurrentTenantId));
            var tenantMatch = Expression.Equal(tenantIdProp, currentTenantIdExpr);
            var tenantFilter = Expression.OrElse(isSuperAdminExpr, tenantMatch);

            filterExpression = filterExpression == null 
                ? tenantFilter 
                : Expression.AndAlso(filterExpression, tenantFilter);
        }

        if (filterExpression != null)
        {
            var lambda = Expression.Lambda<Func<TEntity, bool>>(filterExpression, parameter);
            builder.Entity<TEntity>().HasQueryFilter(lambda);
        }
    }
}
