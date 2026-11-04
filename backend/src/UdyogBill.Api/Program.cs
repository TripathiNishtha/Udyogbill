using System.Threading.RateLimiting;
using UdyogBill.Api.Configuration;
using UdyogBill.Api.Workers;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using UdyogBill.Api.Middleware;
using UdyogBill.Infrastructure;
using UdyogBill.Persistence;
using UdyogBill.Persistence.Seeders;

using UdyogBill.Shared;

var builder = WebApplication.CreateBuilder(args);

// Map environment variable aliases for secure production configuration
var envPostgres = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");
if (!string.IsNullOrWhiteSpace(envPostgres))
{
    builder.Configuration["ConnectionStrings:DefaultConnection"] = envPostgres;
}

var envJwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (!string.IsNullOrWhiteSpace(envJwtKey))
{
    builder.Configuration["Jwt:SecretKey"] = envJwtKey;
}

var envGeminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
if (!string.IsNullOrWhiteSpace(envGeminiKey))
{
    builder.Configuration["Gemini:ApiKey"] = envGeminiKey;
}

// Fail-fast security configuration check in Production environment
ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(builder.Configuration, builder.Environment);

// Add Services to DI container
builder.Services.AddHostedService<SubscriptionExpiryWorker>();
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new LenientDateTimeConverter());
    options.JsonSerializerOptions.Converters.Add(new LenientNullableDateTimeConverter());
});
builder.Services.AddEndpointsApiExplorer();

// Native .NET 9 OpenAPI with JWT Bearer configuration
builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "UdyogBill Multi-Industry SaaS Web API",
            Version = "v1",
            Description = "Enterprise multi-tenant billing, inventory, and business management platform API."
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes.Add("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter JWT Bearer token."
        });

        document.SecurityRequirements.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });

        return Task.CompletedTask;
    });
});

// Register Architecture Layers
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);

// Rate Limiting Policy
builder.Services.AddRateLimiter(RateLimitingConfiguration.ConfigureRateLimiting);

// Forwarded Headers for Reverse Proxy & Spoofing Protection
builder.Services.ConfigureForwardedHeaders(builder.Configuration);

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
            ?? (builder.Environment.IsProduction()
                ? new[] { "https://app.udyogbill.com", "https://admin.udyogbill.com" }
                : new[] { "http://localhost:3000", "http://localhost:3001" });
        
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Forwarded Headers Middleware must be placed before anything that inspects RemoteIpAddress or Scheme
app.UseForwardedHeaders();

// Configure Middleware Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

// Enable request stream buffering for payment webhooks to allow raw HMAC-SHA256 signature verification
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/v1/public/webhooks/payment", StringComparison.OrdinalIgnoreCase) ||
        context.Request.Path.StartsWithSegments("/api/public/webhooks/payment", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.EnableBuffering();
    }
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("UdyogBill API Reference")
               .WithTheme(ScalarTheme.Mars)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });

    // Backward compatibility redirects for existing Swagger bookmarks & tools
    app.MapGet("/swagger/v1/swagger.json", () => Results.Redirect("/openapi/v1.json"));
    app.MapGet("/swagger", () => Results.Redirect("/scalar/v1"));
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseRateLimiter();
app.UseMiddleware<TenantStatusMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHub<UdyogBill.Infrastructure.Hubs.SyncHub>("/hubs/sync");

// Auto-seed Initial Catalog & Super Admin on startup
try
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Initial database seeding deferred: {Message}", ex.Message);
}

app.Run();

// Required for Integration/Architecture Tests
public partial class Program { }
