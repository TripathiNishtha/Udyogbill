using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using UdyogBill.Application.Interfaces;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Interceptors;
using UdyogBill.Persistence.Seeders;
using UdyogBill.Persistence.Services;

namespace UdyogBill.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5432;Database=udyogbill_db;Username=postgres;Password=postgres;";

        services.AddScoped<AuditableEntitySaveChangesInterceptor>();

        services.AddDbContext<AppDbContext>((serviceProvider, options) =>
        {
            var interceptor = serviceProvider.GetRequiredService<AuditableEntitySaveChangesInterceptor>();
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
            })
            .AddInterceptors(interceptor);
        });

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddScoped<DatabaseSeeder>();

        // Application Services
        services.AddSingleton<UdyogBill.Application.Services.Calculations.ICanonicalCalculationEngine, UdyogBill.Application.Services.Calculations.CanonicalCalculationEngine>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<IIndustryService, IndustryService>();
        services.AddScoped<IPlanService, PlanService>();
        services.AddScoped<ISuperAdminService, SuperAdminService>();
        services.AddScoped<ITenantHierarchyService, TenantHierarchyService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IPartyService, PartyService>();
        services.AddScoped<ISalesService, SalesService>();
        services.AddScoped<IPurchaseService, PurchaseService>();
        services.AddScoped<IQuotationService, QuotationService>();
        services.AddScoped<IBarcodeService, BarcodeService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<ITenantAuditService, TenantAuditService>();
        services.AddScoped<IIndustryCapabilitiesService, IndustryCapabilitiesService>();
        services.AddScoped<IBankingAndExpenseService, BankingAndExpenseService>();
        services.AddScoped<ILoyaltyAndPromotionsService, LoyaltyAndPromotionsService>();
        services.AddScoped<INotificationHubService, NotificationHubService>();
        services.AddScoped<ILogisticsService, LogisticsService>();
        services.AddScoped<IPrintTemplateService, PrintTemplateService>();
        services.AddScoped<ISyncService, SyncService>();
        services.AddScoped<IBackupService, BackupService>();
        services.AddScoped<IP0ReportService, P0ReportService>();
        services.AddScoped<ISubscriptionPaymentService, SubscriptionPaymentService>();
        services.AddScoped<IPlatformEmailService, PlatformEmailService>();
        services.AddScoped<IBulkImportService, BulkImportService>();
        services.AddScoped<IPlatformSettingsService, PlatformSettingsService>();
        services.AddScoped<IOnboardingService, OnboardingService>();
        services.AddScoped<ICouponService, CouponService>();
        services.AddScoped<UdyogBill.Application.Services.Pharma.IPharmaService, PharmaService>();
        services.AddScoped<IPharmaSfaService, PharmaSfaService>();
        services.AddScoped<ITenantModuleAuthorizationService, TenantModuleAuthorizationService>();
        services.AddScoped<ITenantAssistantService, TenantAssistantService>();
        services.AddScoped<IReferralService, ReferralService>();
        services.AddScoped<IChequeService, ChequeService>();
        services.AddScoped<IBrokerService, BrokerService>();
        services.AddScoped<ISandboxGstService, SandboxGstService>();
        services.AddScoped<IHrmService, HrmService>();

        return services;
    }
}

