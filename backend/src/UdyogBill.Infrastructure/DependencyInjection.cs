using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using UdyogBill.Application.Interfaces;
using UdyogBill.Infrastructure.Services;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<ICurrentUserContext, CurrentUserContext>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddSingleton<IAuditService, AuditService>();
        services.AddSingleton<IIpGeolocationService, IpGeolocationService>();
        services.AddSingleton<IInvoiceSignatureService, InvoiceSignatureService>();

        var secretKey = configuration["Jwt:SecretKey"] ?? "UdyogBill_Development_Fallback_Key_Not_For_Production_Use_256Bits!";
        var issuer = configuration["Jwt:Issuer"] ?? "UdyogBill.Api";
        var audience = configuration["Jwt:Audience"] ?? "UdyogBill.Client";

        services.AddSignalR();
        services.AddScoped<ISyncNotificationService, SyncNotificationService>();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("CanViewReports", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.IsInRole(Roles.TenantAccountant) ||
                ctx.User.IsInRole("Accountant") ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.ReportsView || c.Value == "*"))
            ));

            options.AddPolicy("CanCreateInvoice", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.IsInRole(Roles.TenantStaff) ||
                ctx.User.IsInRole(Roles.TenantCashier) ||
                ctx.User.IsInRole("Sales") ||
                ctx.User.IsInRole("Billing") ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.SalesCreate || c.Value == Permissions.SalesView || c.Value == "*"))
            ));

            options.AddPolicy("CanManageUsers", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.UsersEdit || c.Value == Permissions.UsersCreate || c.Value == Permissions.UsersDelete || c.Value == Permissions.RolesManage || c.Value == "*"))
            ));

            options.AddPolicy("CanViewInventory", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.IsInRole(Roles.TenantStaff) ||
                ctx.User.IsInRole("WarehouseManager") ||
                ctx.User.IsInRole("Sales") ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.InventoryView || c.Value == "*"))
            ));

            options.AddPolicy("CanManagePurchases", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.IsInRole(Roles.TenantStaff) ||
                ctx.User.IsInRole("Procurement") ||
                ctx.User.IsInRole("Purchase") ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.PurchaseCreate || c.Value == Permissions.PurchaseView || c.Value == "*"))
            ));

            options.AddPolicy("CanManageBankingAndExpense", p => p.RequireAssertion(ctx =>
                ctx.User.IsInRole(Roles.SuperAdmin) ||
                ctx.User.IsInRole(Roles.TenantAdmin) ||
                ctx.User.IsInRole(Roles.TenantManager) ||
                ctx.User.IsInRole(Roles.TenantAccountant) ||
                ctx.User.IsInRole("Accountant") ||
                ctx.User.HasClaim(c => c.Type == Claims.Permission && (c.Value == Permissions.BankingView || c.Value == Permissions.BankingManage || c.Value == Permissions.AccountsManage || c.Value == "*"))
            ));
        });

        return services;
    }
}
