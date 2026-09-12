using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;

namespace UdyogBill.Application.Interfaces;

public interface ITenantContext
{
    Guid TenantId { get; }
    string? TenantCode { get; }
    bool HasTenant { get; }
    bool IsSuperAdmin { get; }
    void SetTenant(Guid tenantId, string? tenantCode = null, bool isSuperAdmin = false);
}

public interface ICurrentUserContext
{
    Guid? UserId { get; }
    string? Email { get; }
    string? FullName { get; }
    bool IsAuthenticated { get; }
    bool IsSuperAdmin { get; }
    bool IsTenantAdmin { get; }
    Guid? TenantId { get; }
    IReadOnlyList<string> Roles { get; }
    IReadOnlyList<string> Permissions { get; }
    bool HasPermission(string permission);
    bool HasRole(string role);
}

public interface IAppDbContext
{
    IQueryable<Tenant> Tenants { get; }
    IQueryable<TenantIndustryConfig> TenantIndustryConfigs { get; }
    IQueryable<TenantBranch> TenantBranches { get; }
    IQueryable<TenantWarehouse> TenantWarehouses { get; }
    IQueryable<TenantSetting> TenantSettings { get; }
    IQueryable<User> Users { get; }
    IQueryable<Role> Roles { get; }
    IQueryable<UserRole> UserRoles { get; }
    IQueryable<RolePermission> RolePermissions { get; }
    IQueryable<UserPermission> UserPermissions { get; }
    IQueryable<RefreshToken> RefreshTokens { get; }
    IQueryable<Industry> Industries { get; }
    IQueryable<Module> Modules { get; }
    IQueryable<IndustryModule> IndustryModules { get; }
    IQueryable<Feature> Features { get; }
    IQueryable<IndustryFeature> IndustryFeatures { get; }
    IQueryable<SubFeature> SubFeatures { get; }
    IQueryable<Permission> Permissions { get; }
    IQueryable<Plan> Plans { get; }
    IQueryable<PlanEntitlement> PlanEntitlements { get; }
    IQueryable<TenantSubscription> TenantSubscriptions { get; }
    IQueryable<AddOn> AddOns { get; }
    IQueryable<TenantSubscriptionAddOn> TenantSubscriptionAddOns { get; }
    IQueryable<PaymentGatewayConfig> PaymentGatewayConfigs { get; }
    IQueryable<SubscriptionInvoice> SubscriptionInvoices { get; }
    IQueryable<PlatformCompanyProfile> PlatformCompanyProfiles { get; }
    IQueryable<PlatformCommercialConfig> PlatformCommercialConfigs { get; }
    IQueryable<PlatformEmailConfig> PlatformEmailConfigs { get; }
    IQueryable<PlatformPasswordResetOtp> PlatformPasswordResetOtps { get; }
    IQueryable<AuditLog> AuditLogs { get; }

    // Inventory Master & Stock Ledger
    IQueryable<Category> Categories { get; }
    IQueryable<Brand> Brands { get; }
    IQueryable<UnitOfMeasure> UnitsOfMeasure { get; }
    IQueryable<UnitConversion> UnitConversions { get; }
    IQueryable<Item> Items { get; }
    IQueryable<ItemBatch> ItemBatches { get; }
    IQueryable<ItemSerialNumber> ItemSerialNumbers { get; }
    IQueryable<ItemVariant> ItemVariants { get; }
    IQueryable<ItemWarehouseStock> ItemWarehouseStocks { get; }
    IQueryable<StockMovement> StockMovements { get; }

    // Parties & Ledgers
    IQueryable<Party> Parties { get; }
    IQueryable<PartyAddress> PartyAddresses { get; }
    IQueryable<PartyLedgerEntry> PartyLedgerEntries { get; }
    IQueryable<Broker> Brokers { get; }
    IQueryable<BrokerCommissionEntry> BrokerCommissionEntries { get; }

    // Sales, Quotations & Invoicing
    IQueryable<Quotation> Quotations { get; }
    IQueryable<QuotationItem> QuotationItems { get; }
    IQueryable<SalesInvoice> SalesInvoices { get; }
    IQueryable<SalesInvoiceItem> SalesInvoiceItems { get; }
    IQueryable<SalesInvoicePayment> SalesInvoicePayments { get; }
    IQueryable<SalesReturn> SalesReturns { get; }
    IQueryable<SalesReturnItem> SalesReturnItems { get; }

    // Purchases & Procurement
    IQueryable<Domain.Entities.Purchases.PurchaseOrder> PurchaseOrders { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseOrderItem> PurchaseOrderItems { get; }
    IQueryable<Domain.Entities.Purchases.GoodsReceiptNote> GoodsReceiptNotes { get; }
    IQueryable<Domain.Entities.Purchases.GoodsReceiptNoteItem> GoodsReceiptNoteItems { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseBill> PurchaseBills { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseBillItem> PurchaseBillItems { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseBillPayment> PurchaseBillPayments { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseReturn> PurchaseReturns { get; }
    IQueryable<Domain.Entities.Purchases.PurchaseReturnItem> PurchaseReturnItems { get; }

    // Inter-Warehouse Stock Transfers
    IQueryable<StockTransfer> StockTransfers { get; }
    IQueryable<StockTransferItem> StockTransferItems { get; }

    // Pharma & Healthcare Suite
    IQueryable<UdyogBill.Domain.Entities.Pharma.SaltMaster> SaltMasters { get; }
    IQueryable<UdyogBill.Domain.Entities.Pharma.ItemSaltComposition> ItemSaltCompositions { get; }
    IQueryable<UdyogBill.Domain.Entities.Pharma.DoctorPrescriber> DoctorPrescribers { get; }
    IQueryable<UdyogBill.Domain.Entities.Pharma.ScheduleH1RegisterEntry> ScheduleH1RegisterEntries { get; }
    IQueryable<UdyogBill.Domain.Entities.Pharma.ExpiryReturnClaim> ExpiryReturnClaims { get; }
    IQueryable<UdyogBill.Domain.Entities.Pharma.ExpiryReturnClaimItem> ExpiryReturnClaimItems { get; }

    // Banking & Expenses
    IQueryable<Domain.Entities.Banking.BankAccount> BankAccounts { get; }
    IQueryable<Domain.Entities.Banking.ExpenseCategory> ExpenseCategories { get; }
    IQueryable<Domain.Entities.Banking.ExpenseVoucher> ExpenseVouchers { get; }
    IQueryable<Domain.Entities.Banking.CashDrawerSession> CashDrawerSessions { get; }
    IQueryable<Domain.Entities.Banking.ChequeRegister> ChequeRegisters { get; }

    // Loyalty & Promotions
    IQueryable<Domain.Entities.Loyalty.LoyaltyProgramConfig> LoyaltyProgramConfigs { get; }
    IQueryable<Domain.Entities.Loyalty.CustomerLoyaltyAccount> CustomerLoyaltyAccounts { get; }
    IQueryable<Domain.Entities.Loyalty.LoyaltyTransaction> LoyaltyTransactions { get; }
    IQueryable<Domain.Entities.Loyalty.PromotionalCoupon> PromotionalCoupons { get; }

    // Notifications & Webhooks
    IQueryable<Domain.Entities.Notifications.NotificationGatewayConfig> NotificationGatewayConfigs { get; }
    IQueryable<Domain.Entities.Notifications.NotificationTemplate> NotificationTemplates { get; }
    IQueryable<Domain.Entities.Notifications.NotificationDispatchLog> NotificationDispatchLogs { get; }
    IQueryable<Domain.Entities.Notifications.TenantWebhookEndpoint> TenantWebhookEndpoints { get; }

    // Logistics & Dispatch
    IQueryable<Domain.Entities.Logistics.Transporter> Transporters { get; }
    IQueryable<Domain.Entities.Logistics.DeliveryChallan> DeliveryChallans { get; }
    IQueryable<Domain.Entities.Logistics.DeliveryChallanItem> DeliveryChallanItems { get; }
    IQueryable<Domain.Entities.Logistics.EWayBillDetails> EWayBills { get; }

    // Print & Document Templates
    IQueryable<Domain.Entities.Printing.PrintTemplate> PrintTemplates { get; }

    // Data Backups, Disaster Recovery & System Health
    IQueryable<Domain.Entities.Backups.BackupJob> BackupJobs { get; }
    IQueryable<Domain.Entities.Backups.BackupScheduleConfig> BackupScheduleConfigs { get; }
    IQueryable<Domain.Entities.Backups.SystemHealthMetric> SystemHealthMetrics { get; }

    // Reporting Engine Presets
    IQueryable<Domain.Entities.Reports.SavedReportPreset> SavedReportPresets { get; }

    // CMS - Marketing Website
    IQueryable<Domain.Entities.CMS.Lead> Leads { get; }

    // Referrals & Affiliate Partner Program
    IQueryable<Domain.Entities.Referrals.ReferralProgramConfig> ReferralProgramConfigs { get; }
    IQueryable<Domain.Entities.Referrals.TenantReferralProfile> TenantReferralProfiles { get; }
    IQueryable<Domain.Entities.Referrals.TenantReferralConversion> TenantReferralConversions { get; }

    void Add<TEntity>(TEntity entity) where TEntity : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(User user, IReadOnlyList<string> roles, IReadOnlyList<string> permissions, Guid? tenantId, string? tenantCode);
    (string Token, string TokenHash, DateTimeOffset ExpiresAt) GenerateRefreshToken(string? ipAddress = null);
}

public interface IPasswordHasher
{
    string HashPassword(string password, out string salt);
    bool VerifyPassword(string password, string storedHash, string storedSalt);
}

public interface IAuditService
{
    Task LogAsync(AuditLog log, CancellationToken cancellationToken = default);
}
