using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class SubscriptionPaymentService : ISubscriptionPaymentService
{
    private readonly AppDbContext _context;
    private readonly IPlatformEmailService _emailService;
    private readonly ILogger<SubscriptionPaymentService> _logger;
    private readonly IReferralService _referralService;
    private readonly HttpClient _httpClient;

    public SubscriptionPaymentService(
        AppDbContext context,
        IPlatformEmailService emailService,
        ILogger<SubscriptionPaymentService> logger,
        IReferralService referralService)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
        _referralService = referralService;
        _httpClient = new HttpClient();
    }

    #region Tenant Order & Checkout Workflow

    public async Task<Result<CreateSubscriptionOrderResponse>> CreateOrderAsync(
        Guid tenantId,
        CreateSubscriptionOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
            return Result<CreateSubscriptionOrderResponse>.Failure("Tenant organization not found.", "NOT_FOUND");

        decimal amount = 0;
        string itemName = string.Empty;
        string itemDesc = string.Empty;

        if (!string.IsNullOrWhiteSpace(request.AddonCode))
        {
            // Business Rule: Active core subscription plan required before purchasing add-ons
            var activeSub = await _context.TenantSubscriptions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenantId &&
                                          !s.IsDeleted &&
                                          (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial) &&
                                          s.EndsAtUtc > DateTimeOffset.UtcNow, cancellationToken);

            if (activeSub == null)
            {
                return Result<CreateSubscriptionOrderResponse>.Failure(
                    "Active core subscription plan is required before purchasing add-ons. Please subscribe to a base plan first.",
                    "MAIN_SUBSCRIPTION_REQUIRED");
            }

            var addon = await _context.AddOns
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Code == request.AddonCode && a.IsActive, cancellationToken);

            if (addon == null)
                return Result<CreateSubscriptionOrderResponse>.Failure($"Add-on '{request.AddonCode}' not found or inactive.", "NOT_FOUND");

            bool isAnnual = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) || 
                            request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase);
            amount = isAnnual 
                ? (addon.AnnualPrice > 0 ? addon.AnnualPrice : Math.Round(addon.Price * 10, 2))
                : addon.Price;
            itemName = addon.Name;
            itemDesc = $"{addon.Name} Subscription ({(isAnnual ? "Annual" : "Monthly")})";
        }
        else if (!string.IsNullOrWhiteSpace(request.PlanCode))
        {
            var plan = await _context.Plans
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Code == request.PlanCode && p.IsActive, cancellationToken);

            if (plan == null)
                return Result<CreateSubscriptionOrderResponse>.Failure($"Plan '{request.PlanCode}' not found or inactive.", "NOT_FOUND");

            amount = plan.Price;
            itemName = plan.Name;
            itemDesc = $"{plan.Name} Plan Subscription ({request.BillingCycle})";
        }
        else
        {
            return Result<CreateSubscriptionOrderResponse>.Failure("Must provide either PlanCode or AddonCode.", "VALIDATION_FAILED");
        }

        // Calculate 18% GST (Total inclusive)
        decimal taxAmount = Math.Round(amount * 0.18m, 2);
        decimal totalAmount = amount + taxAmount;
        long amountInPaisa = (long)(totalAmount * 100);

        // Fetch Razorpay Config
        var gatewayConfig = await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Provider == "Razorpay" && g.IsActive, cancellationToken);

        string keyId = gatewayConfig?.KeyId ?? "rzp_test_ub2026demo";
        string orderId = $"order_{Guid.NewGuid():N}"[..20];

        // Attempt official Razorpay API order creation if valid credentials provided
        if (!string.IsNullOrWhiteSpace(gatewayConfig?.KeyId) && 
            !string.IsNullOrWhiteSpace(gatewayConfig?.KeySecret) && 
            gatewayConfig.KeyId.StartsWith("rzp_"))
        {
            try
            {
                var rzpReq = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders");
                var authBytes = Encoding.ASCII.GetBytes($"{gatewayConfig.KeyId}:{gatewayConfig.KeySecret}");
                rzpReq.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

                var payload = new
                {
                    amount = amountInPaisa,
                    currency = "INR",
                    receipt = $"rcpt_{Guid.NewGuid():N}"[..18],
                    notes = new Dictionary<string, string>
                    {
                        { "tenant_id", tenantId.ToString() },
                        { "item_name", itemName },
                        { "plan_code", request.PlanCode ?? "" },
                        { "addon_code", request.AddonCode ?? "" }
                    }
                };

                rzpReq.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(rzpReq, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
                    using var doc = JsonDocument.Parse(responseJson);
                    if (doc.RootElement.TryGetProperty("id", out var rzpOrderId))
                    {
                        orderId = rzpOrderId.GetString() ?? orderId;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Razorpay API order creation fallback: {Message}", ex.Message);
            }
        }

        var result = new CreateSubscriptionOrderResponse(
            OrderId: orderId,
            Amount: totalAmount,
            AmountInPaisa: amountInPaisa,
            Currency: "INR",
            KeyId: keyId,
            BusinessName: tenant.BusinessName,
            Description: itemDesc,
            ItemName: itemName,
            CustomerEmail: tenant.AdminEmail,
            CustomerPhone: tenant.PrimaryPhone
        );

        return Result<CreateSubscriptionOrderResponse>.Success(result);
    }

    public async Task<Result<SubscriptionInvoiceDto>> ConfirmPaymentAsync(
        Guid tenantId,
        ConfirmSubscriptionPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.IndustryConfigs)
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
            return Result<SubscriptionInvoiceDto>.Failure("Tenant organization not found.", "NOT_FOUND");

        // Fetch Razorpay Config for verification
        var gatewayConfig = await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Provider == "Razorpay", cancellationToken);

        // Verify HMAC SHA256 Signature if live credentials exist
        if (gatewayConfig != null && !string.IsNullOrWhiteSpace(gatewayConfig.KeySecret) && gatewayConfig.Mode == "Live")
        {
            string payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(gatewayConfig.KeySecret));
            byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            string computedSignature = Convert.ToHexString(hash).ToLower();

            if (!string.Equals(computedSignature, request.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Razorpay signature mismatch for order {OrderId}", request.RazorpayOrderId);
                return Result<SubscriptionInvoiceDto>.Failure("Razorpay payment signature verification failed.", "SECURITY_FAILED");
            }
        }

        decimal basePrice = 0;
        string itemDesc = string.Empty;
        int durationDays = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? 365 : 30;

        // 1. Activate Add-on or Plan
        if (!string.IsNullOrWhiteSpace(request.AddonCode))
        {
            var addon = await _context.AddOns
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Code == request.AddonCode, cancellationToken);

            if (addon != null)
            {
                bool isAnnual = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) || 
                                request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase);
                basePrice = isAnnual 
                    ? (addon.AnnualPrice > 0 ? addon.AnnualPrice : Math.Round(addon.Price * 10, 2))
                    : addon.Price;
                itemDesc = $"{addon.Name} ({(isAnnual ? "Annual" : "Monthly")})";

                await ActivateAddonFeaturesForTenantAsync(tenant, addon.Code, durationDays, cancellationToken);
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.PlanCode))
        {
            var plan = await _context.Plans
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Code == request.PlanCode, cancellationToken);

            if (plan != null)
            {
                basePrice = plan.Price;
                itemDesc = $"{plan.Name} Subscription ({request.BillingCycle})";

                var existingSub = await _context.TenantSubscriptions
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.TenantId == tenant.Id, cancellationToken);

                if (existingSub != null)
                {
                    existingSub.PlanId = plan.Id;
                    existingSub.Status = SubscriptionStatus.Active;
                    existingSub.EndsAtUtc = DateTimeOffset.UtcNow.AddDays(durationDays);
                    existingSub.PricePaid = basePrice;
                }
                else
                {
                    _context.TenantSubscriptions.Add(new TenantSubscription
                    {
                        TenantId = tenant.Id,
                        PlanId = plan.Id,
                        Status = SubscriptionStatus.Active,
                        StartsAtUtc = DateTimeOffset.UtcNow,
                        EndsAtUtc = DateTimeOffset.UtcNow.AddDays(durationDays),
                        PricePaid = basePrice,
                        CurrencyCode = "INR"
                    });
                }
            }
        }

        // 2. Generate Automated Indian GST Subscription Invoice (CGST+SGST vs IGST)
        var gst = await CalculateGstAsync(tenant, basePrice, cancellationToken);
        decimal taxAmount = gst.isInterState ? gst.igstAmt : (gst.cgstAmt + gst.sgstAmt);
        decimal totalAmount = basePrice + taxAmount;
        string invoiceNumber = $"INV-SUB-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var invoice = new SubscriptionInvoice
        {
            TenantId = tenant.Id,
            InvoiceNumber = invoiceNumber,
            InvoiceDate = DateTimeOffset.UtcNow,
            TenantBusinessName = tenant.BusinessName,
            TenantGstin = tenant.GSTIN,
            TenantPan = tenant.PAN,
            TenantBillingAddress = $"{tenant.TradeName}, {tenant.PrimaryPhone}",
            TenantEmail = tenant.AdminEmail,
            TenantPhone = tenant.PrimaryPhone,
            ItemDescription = itemDesc,
            PlanCode = request.PlanCode,
            AddonCode = request.AddonCode,
            BillingCycle = request.BillingCycle,
            DurationDays = durationDays,
            SubTotal = basePrice,
            TaxRatePercent = 18m,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Currency = "INR",
            IsInterState = gst.isInterState,
            CgstRatePercent = gst.cgstRate,
            CgstAmount = gst.cgstAmt,
            SgstRatePercent = gst.sgstRate,
            SgstAmount = gst.sgstAmt,
            IgstRatePercent = gst.igstRate,
            IgstAmount = gst.igstAmt,
            PlaceOfSupply = gst.placeOfSupply,
            SupplierLegalName = gst.supplierLegalName,
            SupplierGstin = gst.supplierGstin,
            SupplierAddress = gst.supplierAddress,
            SupplierStateCode = gst.supplierStateCode,
            SubscriberStateCode = gst.subscriberStateCode,
            SupplierLogoUrl = gst.supplierLogoUrl,
            SupplierBankName = gst.supplierBankName,
            SupplierBankAccountNumber = gst.supplierBankAccountNumber,
            SupplierBankIfsc = gst.supplierBankIfsc,
            SupplierBankBranch = gst.supplierBankBranch,
            SupplierUpiId = gst.supplierUpiId,
            SupplierSignatoryName = gst.supplierSignatoryName,
            SupplierSignatoryDesignation = gst.supplierSignatoryDesignation,
            SupplierSignatoryImageUrl = gst.supplierSignatoryImageUrl,
            InvoiceTermsAndConditions = gst.invoiceTermsAndConditions,
            PaymentGateway = "Razorpay",
            GatewayOrderId = request.RazorpayOrderId,
            GatewayPaymentId = request.RazorpayPaymentId,
            GatewaySignature = request.RazorpaySignature,
            PaymentStatus = "Paid",
            PaidAtUtc = DateTimeOffset.UtcNow,
            Notes = "Automated Online Payment via Razorpay"
        };

        _context.SubscriptionInvoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);

        // Process referral commission reward (scheduled for next-day payout)
        try
        {
            await _referralService.ProcessSubscriptionPaidReferralTriggerAsync(tenant.Id, invoice.Id, basePrice, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process referral payout trigger for tenant {TenantId} on invoice {InvoiceId}", tenant.Id, invoice.Id);
        }

        _logger.LogInformation("Subscription Invoice {InvoiceNumber} generated (GST Type: {TaxType}) for Tenant {TenantCode}", 
            invoiceNumber, gst.isInterState ? "IGST 18%" : "CGST 9% + SGST 9%", tenant.Code);

        var invoiceDto = MapToInvoiceDto(invoice);

        // Dispatch Confirmation Email with Invoice
        if (!string.IsNullOrWhiteSpace(tenant.AdminEmail))
        {
            _ = _emailService.SendSubscriptionInvoiceEmailAsync(tenant.AdminEmail, tenant.BusinessName, invoiceDto, cancellationToken);
        }

        return Result<SubscriptionInvoiceDto>.Success(invoiceDto);
    }

    public async Task<Result<TenantSubscriptionStatusSummaryDto>> GetTenantSubscriptionStatusAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.IndustryConfigs)
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
            return Result<TenantSubscriptionStatusSummaryDto>.Failure("Tenant not found.", "NOT_FOUND");

        var sub = await _context.TenantSubscriptions
            .IgnoreQueryFilters()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId, cancellationToken);

        var allAddons = await _context.AddOns
            .IgnoreQueryFilters()
            .Where(a => a.IsActive)
            .ToListAsync(cancellationToken);

        var subAddons = await _context.TenantSubscriptionAddOns
            .IgnoreQueryFilters()
            .Where(sa => sa.TenantId == tenantId && sa.ExpiresAtUtc > DateTimeOffset.UtcNow)
            .ToListAsync(cancellationToken);

        // Check industry config overrides
        var config = tenant.IndustryConfigs.FirstOrDefault();
        var configDict = new Dictionary<string, bool>();
        try
        {
            if (config != null && !string.IsNullOrWhiteSpace(config.ConfigurationJson))
            {
                configDict = JsonSerializer.Deserialize<Dictionary<string, bool>>(config.ConfigurationJson) ?? new();
            }
        }
        catch { }

        var addonDtos = allAddons.Select(a =>
        {
            var enr = subAddons.FirstOrDefault(sa => sa.AddOnId == a.Id);
            bool isExplicitActive = false;
            string key = a.Code.Replace("ADDON_", "").ToLower();
            if (configDict.TryGetValue(key, out var val)) isExplicitActive = val;
            else if (configDict.TryGetValue(key.Replace("_", "-"), out var valHyphen)) isExplicitActive = valHyphen;

            if (a.Code == "ADDON_PHARMA_SFA" && tenant.IsPharmaSfaActive)
            {
                isExplicitActive = true;
            }

            bool isEnrolled = enr != null || isExplicitActive;
            DateTimeOffset? exp = enr?.ExpiresAtUtc ?? (isExplicitActive ? DateTimeOffset.UtcNow.AddDays(365) : null);
            int remDays = exp.HasValue ? Math.Max(0, (int)(exp.Value - DateTimeOffset.UtcNow).TotalDays) : 0;

            return new AddonCatalogItemDto(
                Id: a.Id,
                Code: a.Code,
                Name: a.Name,
                Description: a.Description,
                Price: a.Price,
                BillingCycle: a.BillingCycle.ToString(),
                IsActive: a.IsActive,
                IsEnrolled: isEnrolled,
                EnrolledExpiresAtUtc: exp,
                RemainingDays: remDays
            );
        }).ToList();

        var recentInvoices = await _context.SubscriptionInvoices
            .IgnoreQueryFilters()
            .Where(i => i.TenantId == tenantId)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(10)
            .Select(i => MapToInvoiceDto(i))
            .ToListAsync(cancellationToken);

        var planName = sub?.Plan?.Name ?? "Free Trial Tier";
        var planCode = sub?.Plan?.Code ?? "TRIAL";
        var planExpiry = sub?.EndsAtUtc ?? DateTimeOffset.UtcNow.AddDays(14);
        int planRemaining = Math.Max(0, (int)(planExpiry - DateTimeOffset.UtcNow).TotalDays);

        var result = new TenantSubscriptionStatusSummaryDto(
            CurrentPlanCode: planCode,
            CurrentPlanName: planName,
            PlanExpiresAtUtc: planExpiry,
            PlanRemainingDays: planRemaining,
            IsTrial: sub?.Status == SubscriptionStatus.Trial || sub == null,
            Addons: addonDtos,
            RecentInvoices: recentInvoices
        );

        return Result<TenantSubscriptionStatusSummaryDto>.Success(result);
    }

    public async Task<Result<IReadOnlyList<SubscriptionInvoiceDto>>> GetTenantInvoicesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var invoices = await _context.SubscriptionInvoices
            .IgnoreQueryFilters()
            .Where(i => i.TenantId == tenantId)
            .OrderByDescending(i => i.InvoiceDate)
            .Select(i => MapToInvoiceDto(i))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<SubscriptionInvoiceDto>>.Success(invoices);
    }

    public async Task<Result<SubscriptionInvoiceDto>> GetInvoiceByIdAsync(
        Guid invoiceId,
        Guid? tenantId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SubscriptionInvoices.IgnoreQueryFilters().AsQueryable();
        if (tenantId.HasValue)
        {
            query = query.Where(i => i.TenantId == tenantId.Value);
        }

        var invoice = await query.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
        if (invoice == null)
            return Result<SubscriptionInvoiceDto>.Failure("Subscription Invoice not found.", "NOT_FOUND");

        return Result<SubscriptionInvoiceDto>.Success(MapToInvoiceDto(invoice));
    }

    #endregion

    #region Super Admin Gateway & Pricing Management

    public async Task<Result<PaymentGatewayConfigDto>> GetGatewayConfigAsync(CancellationToken cancellationToken = default)
    {
        var config = await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Provider == "Razorpay", cancellationToken);

        if (config == null)
        {
            return Result<PaymentGatewayConfigDto>.Success(new PaymentGatewayConfigDto(
                Provider: "Razorpay",
                KeyId: "",
                WebhookSecret: null,
                Mode: "Test",
                IsActive: false,
                HasSecret: false
            ));
        }

        return Result<PaymentGatewayConfigDto>.Success(new PaymentGatewayConfigDto(
            Provider: config.Provider,
            KeyId: config.KeyId,
            WebhookSecret: config.WebhookSecret,
            Mode: config.Mode,
            IsActive: config.IsActive,
            HasSecret: !string.IsNullOrWhiteSpace(config.KeySecret)
        ));
    }

    public async Task<Result> UpdateGatewayConfigAsync(UpdatePaymentGatewayConfigRequest request, CancellationToken cancellationToken = default)
    {
        var config = await _context.PaymentGatewayConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Provider == "Razorpay", cancellationToken);

        if (config == null)
        {
            config = new PaymentGatewayConfig
            {
                Provider = "Razorpay",
                KeyId = request.KeyId.Trim(),
                KeySecret = request.KeySecret.Trim(),
                WebhookSecret = request.WebhookSecret?.Trim(),
                Mode = request.Mode,
                IsActive = request.IsActive
            };
            _context.PaymentGatewayConfigs.Add(config);
        }
        else
        {
            config.KeyId = request.KeyId.Trim();
            if (!string.IsNullOrWhiteSpace(request.KeySecret))
            {
                config.KeySecret = request.KeySecret.Trim();
            }
            config.WebhookSecret = request.WebhookSecret?.Trim();
            config.Mode = request.Mode;
            config.IsActive = request.IsActive;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<AddonCatalogItemDto>>> GetSuperAdminAddonsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Ensure column exists
            try
            {
                await _context.Database.ExecuteSqlRawAsync(
                    @"ALTER TABLE ""AddOns"" ADD COLUMN IF NOT EXISTS ""AnnualPrice"" numeric NOT NULL DEFAULT 0;",
                    cancellationToken);
            }
            catch {}

            var addons = await _context.AddOns
                .IgnoreQueryFilters()
                .OrderBy(a => a.Name)
                .ToListAsync(cancellationToken);

            if (addons.Count == 0)
            {
                // Auto seed initial addons
                var seedList = new List<AddOn>
                {
                    new() { Code = "ADDON_PHARMA", Name = "Pharma & Healthcare Suite", Description = "Generic Salt Substitutes, Multi-Batch FEFO, Schedule H1 registers, Strip/Loose packaging, Expiry dumping claims.", Price = 499m, AnnualPrice = 4990m, BillingCycle = BillingCycle.Monthly, IsActive = true },
                    new() { Code = "ADDON_PHARMA_SFA", Name = "Pharma SFA & MR Field Force Suite", Description = "Medical Representative Field Force, Daily Call Reports (DCR), Chemist POB, Doctor Detailing, Sample Bag & 3-Way Parity.", Price = 1999m, AnnualPrice = 19999m, BillingCycle = BillingCycle.Monthly, IsActive = true },
                    new() { Code = "ADDON_GARMENTS", Name = "Apparel & Garments Matrix", Description = "2D Size x Color SKU Matrix, variant generation, clothing hang-tag barcode studio.", Price = 399m, AnnualPrice = 3990m, BillingCycle = BillingCycle.Monthly, IsActive = true },
                    new() { Code = "ADDON_MANUFACTURING", Name = "Manufacturing & Bakery (BOM)", Description = "Recipe / Bill of Materials (BOM), raw materials auto-consumption, batch production runs & yield tracking.", Price = 599m, AnnualPrice = 5990m, BillingCycle = BillingCycle.Monthly, IsActive = true },
                    new() { Code = "ADDON_FMCG", Name = "FMCG, Grocery & Distribution", Description = "Multi-unit conversion (Case/Box/Pcs), free scheme discounts (10+1 free), auto re-order thresholds.", Price = 399m, AnnualPrice = 3990m, BillingCycle = BillingCycle.Monthly, IsActive = true },
                    new() { Code = "ADDON_ACCOUNTING", Name = "Dual-Entry Financial Accounting", Description = "Chart of Accounts (COA), Journal & Contra vouchers, Bank Reconciliation (BRS), and P&L / Balance Sheet.", Price = 499m, AnnualPrice = 4990m, BillingCycle = BillingCycle.Monthly, IsActive = true }
                };
                _context.AddOns.AddRange(seedList);
                await _context.SaveChangesAsync(cancellationToken);
                addons = seedList;
            }
            else if (!addons.Any(a => a.Code == "ADDON_PHARMA_SFA"))
            {
                var sfaAddon = new AddOn
                {
                    Code = "ADDON_PHARMA_SFA",
                    Name = "Pharma SFA & MR Field Force Suite",
                    Description = "Medical Representative Field Force, Daily Call Reports (DCR), Chemist POB, Doctor Detailing, Sample Bag & 3-Way Parity.",
                    Price = 1999m,
                    AnnualPrice = 19999m,
                    BillingCycle = BillingCycle.Monthly,
                    IsActive = true
                };
                _context.AddOns.Add(sfaAddon);
                await _context.SaveChangesAsync(cancellationToken);
                addons.Add(sfaAddon);
            }

            var dtos = addons.Select(a => new AddonCatalogItemDto(
                Id: a.Id,
                Code: a.Code,
                Name: a.Name,
                Description: a.Description,
                Price: a.Price,
                BillingCycle: a.BillingCycle.ToString(),
                IsActive: a.IsActive,
                IsEnrolled: false,
                EnrolledExpiresAtUtc: null,
                RemainingDays: 0,
                AnnualPrice: a.AnnualPrice > 0 ? a.AnnualPrice : Math.Round(a.Price * 10, 2)
            )).ToList();

            return Result<IReadOnlyList<AddonCatalogItemDto>>.Success(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Returning resilient fallback addon catalog.");
            return Result<IReadOnlyList<AddonCatalogItemDto>>.Success(GetDefaultAddonCatalog());
        }
    }

    private static IReadOnlyList<AddonCatalogItemDto> GetDefaultAddonCatalog()
    {
        return new List<AddonCatalogItemDto>
        {
            new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "ADDON_PHARMA", "Pharma & Healthcare Suite", "Generic Salt Substitutes, Multi-Batch FEFO, Schedule H1 registers, Strip/Loose packaging, Expiry dumping claims.", 499m, "Monthly", true, false, null, 0, 4990m),
            new(Guid.Parse("66666666-6666-6666-6666-666666666666"), "ADDON_PHARMA_SFA", "Pharma SFA & MR Field Force Suite", "Medical Representative Field Force, Daily Call Reports (DCR), Chemist POB, Doctor Detailing, Sample Bag & 3-Way Parity.", 1999m, "Monthly", true, false, null, 0, 19999m),
            new(Guid.Parse("22222222-2222-2222-2222-222222222222"), "ADDON_GARMENTS", "Apparel & Garments Matrix", "2D Size x Color SKU Matrix, variant generation, clothing hang-tag barcode studio.", 399m, "Monthly", true, false, null, 0, 3990m),
            new(Guid.Parse("33333333-3333-3333-3333-333333333333"), "ADDON_MANUFACTURING", "Manufacturing & Bakery (BOM)", "Recipe / Bill of Materials (BOM), raw materials auto-consumption, batch production runs & yield tracking.", 599m, "Monthly", true, false, null, 0, 5990m),
            new(Guid.Parse("44444444-4444-4444-4444-444444444444"), "ADDON_FMCG", "FMCG, Grocery & Distribution", "Multi-unit conversion (Case/Box/Pcs), free scheme discounts (10+1 free), auto re-order thresholds.", 399m, "Monthly", true, false, null, 0, 3990m),
            new(Guid.Parse("55555555-5555-5555-5555-555555555555"), "ADDON_ACCOUNTING", "Dual-Entry Financial Accounting", "Chart of Accounts (COA), Journal & Contra vouchers, Bank Reconciliation (BRS), and P&L / Balance Sheet.", 499m, "Monthly", true, false, null, 0, 4990m)
        };
    }

    public async Task<Result> UpdateAddonPriceAsync(string addonCode, UpdateAddonPriceRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var addon = await _context.AddOns
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Code == addonCode, cancellationToken);

            if (addon == null)
            {
                var defaults = GetDefaultAddonCatalog();
                var def = defaults.FirstOrDefault(d => d.Code == addonCode);
                addon = new AddOn
                {
                    Code = addonCode,
                    Name = def?.Name ?? addonCode,
                    Description = request.Description ?? def?.Description ?? "",
                    Price = request.Price,
                    AnnualPrice = request.AnnualPrice > 0 ? request.AnnualPrice : Math.Round(request.Price * 10, 2),
                    BillingCycle = BillingCycle.Monthly,
                    IsActive = request.IsActive
                };
                _context.AddOns.Add(addon);
            }
            else
            {
                addon.Price = request.Price;
                addon.AnnualPrice = request.AnnualPrice > 0 ? request.AnnualPrice : Math.Round(request.Price * 10, 2);
                addon.IsActive = request.IsActive;
                if (!string.IsNullOrWhiteSpace(request.Description))
                {
                    addon.Description = request.Description;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update addon price for {AddonCode}", addonCode);
            return Result.Success();
        }
    }

    public async Task<Result<SubscriptionInvoiceDto>> ManualGrantAddonAsync(ManualGrantAddonRequest request, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.IndustryConfigs)
            .FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);

        if (tenant == null)
            return Result<SubscriptionInvoiceDto>.Failure("Tenant not found.", "NOT_FOUND");

        var addon = await _context.AddOns
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Code == request.AddonCode, cancellationToken);

        if (addon == null)
            return Result<SubscriptionInvoiceDto>.Failure($"Add-on '{request.AddonCode}' not found.", "NOT_FOUND");

        await ActivateAddonFeaturesForTenantAsync(tenant, addon.Code, request.DurationDays, cancellationToken);

        // Create Manual Grant Indian GST Invoice / Audit Record
        var gst = await CalculateGstAsync(tenant, addon.Price, cancellationToken);
        decimal taxAmount = gst.isInterState ? gst.igstAmt : (gst.cgstAmt + gst.sgstAmt);
        decimal totalAmount = addon.Price + taxAmount;
        string invoiceNumber = $"INV-GRANT-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";

        var invoice = new SubscriptionInvoice
        {
            TenantId = tenant.Id,
            InvoiceNumber = invoiceNumber,
            InvoiceDate = DateTimeOffset.UtcNow,
            TenantBusinessName = tenant.BusinessName,
            TenantGstin = tenant.GSTIN,
            TenantPan = tenant.PAN,
            TenantBillingAddress = $"{tenant.TradeName}, {tenant.PrimaryPhone}",
            TenantEmail = tenant.AdminEmail,
            TenantPhone = tenant.PrimaryPhone,
            ItemDescription = $"{addon.Name} (Manual Admin Grant - {request.DurationDays} Days)",
            PlanCode = null,
            AddonCode = addon.Code,
            BillingCycle = "ManualGrant",
            DurationDays = request.DurationDays,
            SubTotal = addon.Price,
            TaxRatePercent = 18m,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Currency = "INR",
            IsInterState = gst.isInterState,
            CgstRatePercent = gst.cgstRate,
            CgstAmount = gst.cgstAmt,
            SgstRatePercent = gst.sgstRate,
            SgstAmount = gst.sgstAmt,
            IgstRatePercent = gst.igstRate,
            IgstAmount = gst.igstAmt,
            PlaceOfSupply = gst.placeOfSupply,
            SupplierLegalName = gst.supplierLegalName,
            SupplierGstin = gst.supplierGstin,
            SupplierAddress = gst.supplierAddress,
            SupplierStateCode = gst.supplierStateCode,
            SubscriberStateCode = gst.subscriberStateCode,
            SupplierLogoUrl = gst.supplierLogoUrl,
            SupplierBankName = gst.supplierBankName,
            SupplierBankAccountNumber = gst.supplierBankAccountNumber,
            SupplierBankIfsc = gst.supplierBankIfsc,
            SupplierBankBranch = gst.supplierBankBranch,
            SupplierUpiId = gst.supplierUpiId,
            SupplierSignatoryName = gst.supplierSignatoryName,
            SupplierSignatoryDesignation = gst.supplierSignatoryDesignation,
            SupplierSignatoryImageUrl = gst.supplierSignatoryImageUrl,
            InvoiceTermsAndConditions = gst.invoiceTermsAndConditions,
            PaymentGateway = "ManualAdminGrant",
            GatewayOrderId = null,
            GatewayPaymentId = "ADMIN_OVERRIDE",
            PaymentStatus = "Paid",
            PaidAtUtc = DateTimeOffset.UtcNow,
            Notes = request.Reason ?? "Granted by Super Admin"
        };

        _context.SubscriptionInvoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);

        var invoiceDto = MapToInvoiceDto(invoice);

        if (!string.IsNullOrWhiteSpace(tenant.AdminEmail))
        {
            _ = _emailService.SendSubscriptionInvoiceEmailAsync(tenant.AdminEmail, tenant.BusinessName, invoiceDto, cancellationToken);
        }

        return Result<SubscriptionInvoiceDto>.Success(invoiceDto);
    }

    public async Task<Result> ManualRevokeAddonAsync(ManualRevokeAddonRequest request, CancellationToken cancellationToken = default)
    {
        var tenant = await _context.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.IndustryConfigs)
            .FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);

        if (tenant == null)
            return Result.Failure("Tenant not found.", "NOT_FOUND");

        var config = tenant.IndustryConfigs.FirstOrDefault();
        if (config != null)
        {
            var configDict = new Dictionary<string, bool>();
            try
            {
                if (!string.IsNullOrWhiteSpace(config.ConfigurationJson))
                    configDict = JsonSerializer.Deserialize<Dictionary<string, bool>>(config.ConfigurationJson) ?? new();
            }
            catch { }

            string key = request.AddonCode.Replace("ADDON_", "").ToLower();
            configDict[key] = false;

            if (request.AddonCode == "ADDON_PHARMA")
            {
                config.EnableBatchTracking = false;
                config.EnableExpiryTracking = false;
                config.EnableScheduleH1DrugTracking = false;
            }
            else if (request.AddonCode == "ADDON_GARMENTS")
            {
                config.EnableSizeColorMatrix = false;
            }
            else if (request.AddonCode == "ADDON_MANUFACTURING")
            {
                config.EnableRecipeBOM = false;
            }
            else if (request.AddonCode == "ADDON_FMCG")
            {
                config.EnableMultiUnitConversion = false;
            }

            config.ConfigurationJson = JsonSerializer.Serialize(configDict);
        }

        // Expire subscription addon entry
        var addon = await _context.AddOns
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Code == request.AddonCode, cancellationToken);

        if (addon != null)
        {
            var subAddon = await _context.TenantSubscriptionAddOns
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(sa => sa.TenantId == tenant.Id && sa.AddOnId == addon.Id, cancellationToken);

            if (subAddon != null)
            {
                subAddon.ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(-1);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Helper Methods

    private async Task ActivateAddonFeaturesForTenantAsync(Tenant tenant, string addonCode, int durationDays, CancellationToken cancellationToken)
    {
        var config = tenant.IndustryConfigs.FirstOrDefault();
        if (config == null)
        {
            config = new TenantIndustryConfig
            {
                TenantId = tenant.Id,
                IndustryId = tenant.IndustryId,
                ConfigurationJson = "{}"
            };
            _context.TenantIndustryConfigs.Add(config);
        }

        var configDict = new Dictionary<string, bool>();
        try
        {
            if (!string.IsNullOrWhiteSpace(config.ConfigurationJson))
                configDict = JsonSerializer.Deserialize<Dictionary<string, bool>>(config.ConfigurationJson) ?? new();
        }
        catch { }

        string key = addonCode.Replace("ADDON_", "").ToLower();
        configDict[key] = true;

        if (addonCode == "ADDON_PHARMA_SFA")
        {
            tenant.IsPharmaSfaActive = true;
            if (tenant.MaxAllowedMrUsers <= 0) tenant.MaxAllowedMrUsers = 15;
            if (tenant.MaxAllowedManagerUsers <= 0) tenant.MaxAllowedManagerUsers = 5;
        }
        else if (addonCode == "ADDON_PHARMA")
        {
            config.EnableBatchTracking = true;
            config.EnableExpiryTracking = true;
            config.EnableScheduleH1DrugTracking = true;
        }
        else if (addonCode == "ADDON_GARMENTS")
        {
            config.EnableSizeColorMatrix = true;
        }
        else if (addonCode == "ADDON_MANUFACTURING")
        {
            config.EnableRecipeBOM = true;
        }
        else if (addonCode == "ADDON_FMCG")
        {
            config.EnableMultiUnitConversion = true;
        }

        config.ConfigurationJson = JsonSerializer.Serialize(configDict);

        // Update / Add TenantSubscriptionAddOn
        var addon = await _context.AddOns
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Code == addonCode, cancellationToken);

        if (addon != null)
        {
            var sub = await _context.TenantSubscriptions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == tenant.Id, cancellationToken);

            Guid subId = sub?.Id ?? Guid.Empty;
            if (sub == null)
            {
                var starterPlan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(cancellationToken);
                sub = new TenantSubscription
                {
                    TenantId = tenant.Id,
                    PlanId = starterPlan?.Id ?? Guid.Empty,
                    Status = SubscriptionStatus.Active,
                    StartsAtUtc = DateTimeOffset.UtcNow,
                    EndsAtUtc = DateTimeOffset.UtcNow.AddDays(durationDays)
                };
                _context.TenantSubscriptions.Add(sub);
                subId = sub.Id;
            }

            var existingAddon = await _context.TenantSubscriptionAddOns
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(sa => sa.TenantId == tenant.Id && sa.AddOnId == addon.Id, cancellationToken);

            if (existingAddon != null)
            {
                existingAddon.ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(durationDays);
                existingAddon.UnitPrice = addon.Price;
            }
            else
            {
                _context.TenantSubscriptionAddOns.Add(new TenantSubscriptionAddOn
                {
                    TenantId = tenant.Id,
                    TenantSubscriptionId = subId,
                    AddOnId = addon.Id,
                    Quantity = 1,
                    UnitPrice = addon.Price,
                    ExpiresAtUtc = DateTimeOffset.UtcNow.AddDays(durationDays)
                });
            }
        }
    }

    private async Task<(bool isInterState, decimal cgstRate, decimal cgstAmt, decimal sgstRate, decimal sgstAmt, decimal igstRate, decimal igstAmt, string placeOfSupply, string supplierLegalName, string supplierGstin, string supplierAddress, string supplierStateCode, string subscriberStateCode, string? supplierLogoUrl, string? supplierBankName, string? supplierBankAccountNumber, string? supplierBankIfsc, string? supplierBankBranch, string? supplierUpiId, string? supplierSignatoryName, string? supplierSignatoryDesignation, string? supplierSignatoryImageUrl, string? invoiceTermsAndConditions)> CalculateGstAsync(Tenant tenant, decimal subTotal, CancellationToken cancellationToken)
    {
        var profile = await _context.PlatformCompanyProfiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        string supplierLegalName = profile?.LegalCompanyName ?? "Udyog Software Technologies Private Limited";
        string supplierGstin = profile?.Gstin ?? "09AAACU9876A1Z5";
        string supplierAddress = $"{profile?.AddressLine1}, {profile?.City}, {profile?.State} - {profile?.Pincode}";
        string supplierStateCode = profile?.StateCode ?? (!string.IsNullOrWhiteSpace(supplierGstin) && supplierGstin.Length >= 2 ? supplierGstin[..2] : "09");

        // Determine subscriber state code (first 2 digits of GSTIN or fallback to supplier state)
        string subscriberStateCode = supplierStateCode;
        if (!string.IsNullOrWhiteSpace(tenant.GSTIN) && tenant.GSTIN.Length >= 2 && char.IsDigit(tenant.GSTIN[0]) && char.IsDigit(tenant.GSTIN[1]))
        {
            subscriberStateCode = tenant.GSTIN[..2];
        }

        bool isInterState = !string.Equals(subscriberStateCode, supplierStateCode, StringComparison.OrdinalIgnoreCase);

        decimal cgstRate = isInterState ? 0 : 9m;
        decimal cgstAmt = isInterState ? 0 : Math.Round(subTotal * 0.09m, 2);
        decimal sgstRate = isInterState ? 0 : 9m;
        decimal sgstAmt = isInterState ? 0 : Math.Round(subTotal * 0.09m, 2);
        decimal igstRate = isInterState ? 18m : 0;
        decimal igstAmt = isInterState ? Math.Round(subTotal * 0.18m, 2) : 0;

        string placeOfSupply = $"{subscriberStateCode} ({tenant.BusinessName})";

        return (
            isInterState, cgstRate, cgstAmt, sgstRate, sgstAmt, igstRate, igstAmt, placeOfSupply,
            supplierLegalName, supplierGstin, supplierAddress, supplierStateCode, subscriberStateCode,
            profile?.LogoUrl,
            profile?.BankName,
            profile?.BankAccountNumber,
            profile?.BankIfsc,
            profile?.BankBranch,
            profile?.UpiId,
            profile?.AuthorizedSignatoryName,
            profile?.AuthorizedSignatoryDesignation,
            profile?.SignatoryImageUrl,
            profile?.InvoiceTermsAndConditions
        );
    }

    private static SubscriptionInvoiceDto MapToInvoiceDto(SubscriptionInvoice i)
    {
        return new SubscriptionInvoiceDto(
            Id: i.Id,
            TenantId: i.TenantId,
            InvoiceNumber: i.InvoiceNumber,
            InvoiceDate: i.InvoiceDate,
            TenantBusinessName: i.TenantBusinessName,
            TenantGstin: i.TenantGstin,
            TenantPan: i.TenantPan,
            TenantBillingAddress: i.TenantBillingAddress,
            TenantEmail: i.TenantEmail,
            TenantPhone: i.TenantPhone,
            ItemDescription: i.ItemDescription,
            PlanCode: i.PlanCode,
            AddonCode: i.AddonCode,
            BillingCycle: i.BillingCycle,
            DurationDays: i.DurationDays,
            SubTotal: i.SubTotal,
            TaxRatePercent: i.TaxRatePercent,
            TaxAmount: i.TaxAmount,
            TotalAmount: i.TotalAmount,
            Currency: i.Currency,
            IsInterState: i.IsInterState,
            CgstRatePercent: i.CgstRatePercent,
            CgstAmount: i.CgstAmount,
            SgstRatePercent: i.SgstRatePercent,
            SgstAmount: i.SgstAmount,
            IgstRatePercent: i.IgstRatePercent,
            IgstAmount: i.IgstAmount,
            PlaceOfSupply: i.PlaceOfSupply,
            SupplierLegalName: i.SupplierLegalName,
            SupplierGstin: i.SupplierGstin,
            SupplierAddress: i.SupplierAddress,
            SupplierStateCode: i.SupplierStateCode,
            SubscriberStateCode: i.SubscriberStateCode,
            SupplierLogoUrl: i.SupplierLogoUrl,
            SupplierBankName: i.SupplierBankName,
            SupplierBankAccountNumber: i.SupplierBankAccountNumber,
            SupplierBankIfsc: i.SupplierBankIfsc,
            SupplierBankBranch: i.SupplierBankBranch,
            SupplierUpiId: i.SupplierUpiId,
            SupplierSignatoryName: i.SupplierSignatoryName,
            SupplierSignatoryDesignation: i.SupplierSignatoryDesignation,
            SupplierSignatoryImageUrl: i.SupplierSignatoryImageUrl,
            InvoiceTermsAndConditions: i.InvoiceTermsAndConditions,
            PaymentGateway: i.PaymentGateway,
            GatewayOrderId: i.GatewayOrderId,
            GatewayPaymentId: i.GatewayPaymentId,
            PaymentStatus: i.PaymentStatus,
            PaidAtUtc: i.PaidAtUtc,
            Notes: i.Notes
        );
    }

    #endregion
}
