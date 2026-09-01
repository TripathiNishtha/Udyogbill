using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class OnboardingService : IOnboardingService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;

    private static readonly Dictionary<string, string> StateMap = new()
    {
        { "01", "Jammu and Kashmir" },
        { "02", "Himachal Pradesh" },
        { "03", "Punjab" },
        { "04", "Chandigarh" },
        { "05", "Uttarakhand" },
        { "06", "Haryana" },
        { "07", "Delhi" },
        { "08", "Rajasthan" },
        { "09", "Uttar Pradesh" },
        { "10", "Bihar" },
        { "11", "Sikkim" },
        { "12", "Arunachal Pradesh" },
        { "13", "Nagaland" },
        { "14", "Manipur" },
        { "15", "Mizoram" },
        { "16", "Tripura" },
        { "17", "Meghalaya" },
        { "18", "Assam" },
        { "19", "West Bengal" },
        { "20", "Jharkhand" },
        { "21", "Odisha" },
        { "22", "Chhattisgarh" },
        { "23", "Madhya Pradesh" },
        { "24", "Gujarat" },
        { "26", "Dadra and Nagar Haveli and Daman and Diu" },
        { "27", "Maharashtra" },
        { "29", "Karnataka" },
        { "30", "Goa" },
        { "31", "Lakshadweep" },
        { "32", "Kerala" },
        { "33", "Tamil Nadu" },
        { "34", "Puducherry" },
        { "35", "Andaman and Nicobar Islands" },
        { "36", "Telangana" },
        { "37", "Andhra Pradesh" },
        { "38", "Ladakh" },
        { "97", "Other Territory" }
    };

    public OnboardingService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required for this operation.");
        }

        return tenantId;
    }

    public Task<Result<GstinLookupResponse>> LookupGstinAsync(GstinLookupRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Gstin))
        {
            return Task.FromResult(Result<GstinLookupResponse>.Failure("GSTIN number is required.", "INVALID_INPUT"));
        }

        var cleanGstin = request.Gstin.Trim().ToUpperInvariant();
        var gstinRegex = new Regex(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");

        if (!gstinRegex.IsMatch(cleanGstin))
        {
            return Task.FromResult(Result<GstinLookupResponse>.Failure("Invalid 15-character GSTIN format. Example: 09AAACH7409R1ZZ", "INVALID_GSTIN_FORMAT"));
        }

        var stateCode = cleanGstin.Substring(0, 2);
        var pan = cleanGstin.Substring(2, 10);
        var stateName = StateMap.TryGetValue(stateCode, out var state) ? state : "India";

        var response = new GstinLookupResponse(
            Gstin: cleanGstin,
            LegalName: "",
            TradeName: "",
            Pan: pan,
            State: stateName,
            StateCode: stateCode,
            Address: $"{stateName}, India",
            Pincode: "",
            GstType: "Regular",
            IsActive: true,
            IsComposition: false
        );

        return Task.FromResult(Result<GstinLookupResponse>.Success(response));
    }

    public async Task<Result<SeedIndustryCatalogResult>> SeedIndustryCatalogAsync(SeedIndustryCatalogRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var unit = await _context.Set<UnitOfMeasure>()
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken)
            ?? new UnitOfMeasure { Id = Guid.NewGuid(), TenantId = tenantId, Code = "PCS", Name = "Pieces" };

        var category = await _context.Set<Category>()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken)
            ?? new Category { Id = Guid.NewGuid(), TenantId = tenantId, Code = "GEN", Name = "General Products" };

        var existingCount = await _context.Set<Item>()
            .CountAsync(p => p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        var itemsToSeed = GetPreloadedItems(request.IndustryType?.ToLowerInvariant() ?? "general");
        var seededNames = new List<string>();

        foreach (var itm in itemsToSeed)
        {
            var sku = $"SKU-{existingCount + seededNames.Count + 1:D4}";
            var newItem = new Item
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Sku = sku,
                Name = itm.Name,
                ShortDescription = itm.Description,
                HSNCode = itm.Hsn,
                CategoryId = category.Id,
                PrimaryUomId = unit.Id,
                TaxRate = itm.TaxRate,
                PurchasePrice = itm.PurchaseRate,
                SellingPrice = itm.SaleRate,
                MRP = itm.Mrp,
                TrackInventory = true,
                IsActive = true,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            _context.Set<Item>().Add(newItem);
            seededNames.Add(itm.Name);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<SeedIndustryCatalogResult>.Success(new SeedIndustryCatalogResult(
            SeededCount: seededNames.Count,
            Message: $"Successfully seeded {seededNames.Count} standard industry products.",
            SampleItemNames: seededNames.Take(5).ToList()
        ));
    }

    public async Task<Result<OnboardingStatusDto>> GetOnboardingStatusAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var productCount = await _context.Set<Item>()
            .CountAsync(p => p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        var partyCount = await _context.Set<Party>()
            .CountAsync(p => p.TenantId == tenantId && !p.IsDeleted, cancellationToken);

        var invoiceCount = await _context.Set<Domain.Entities.Sales.SalesInvoice>()
            .CountAsync(i => i.TenantId == tenantId && !i.IsDeleted, cancellationToken);

        bool hasStoreDetails = !string.IsNullOrWhiteSpace(tenant?.BusinessName) && !string.IsNullOrWhiteSpace(tenant?.GSTIN);
        bool hasProducts = productCount > 0;
        bool hasParties = partyCount > 0;
        bool hasInvoices = invoiceCount > 0;
        bool hasUpiQr = !string.IsNullOrWhiteSpace(tenant?.UpiId) || !string.IsNullOrWhiteSpace(tenant?.PrimaryPhone);

        int score = 0;
        if (hasStoreDetails) score += 25;
        if (hasProducts) score += 25;
        if (hasParties || hasInvoices) score += 25;
        if (hasInvoices) score += 25;

        var isCompleted = score >= 75 || hasInvoices;

        return Result<OnboardingStatusDto>.Success(new OnboardingStatusDto(
            HasStoreDetails: hasStoreDetails,
            HasProducts: hasProducts,
            ProductCount: productCount,
            HasParties: hasParties,
            PartyCount: partyCount,
            HasInvoices: hasInvoices,
            InvoiceCount: invoiceCount,
            HasUpiQr: hasUpiQr,
            UpiId: tenant?.UpiId ?? $"{tenant?.PrimaryPhone ?? "9876543210"}@upi",
            CompletionPercentage: score,
            IsCompleted: isCompleted
        ));
    }

    public async Task<Result> CompleteOnboardingAsync(CompleteOnboardingRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var tenant = await _context.Set<Tenant>()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant == null)
        {
            return Result.Failure("Tenant not found.", "NOT_FOUND");
        }

        if (!string.IsNullOrWhiteSpace(request.BusinessName)) tenant.BusinessName = request.BusinessName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Gstin)) tenant.GSTIN = request.Gstin.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(request.State)) tenant.State = request.State.Trim();
        if (!string.IsNullOrWhiteSpace(request.StateCode)) tenant.StateCode = request.StateCode.Trim();
        if (!string.IsNullOrWhiteSpace(request.Address)) tenant.AddressLine1 = request.Address.Trim();
        if (!string.IsNullOrWhiteSpace(request.Pincode)) tenant.Pincode = request.Pincode.Trim();
        if (!string.IsNullOrWhiteSpace(request.UpiId)) tenant.UpiId = request.UpiId.Trim();
        if (!string.IsNullOrWhiteSpace(request.PrimaryPhone)) tenant.PrimaryPhone = request.PrimaryPhone.Trim();

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private record SeedItem(string Name, string Description, string Hsn, decimal TaxRate, decimal PurchaseRate, decimal SaleRate, decimal Mrp, decimal Stock);

    private static List<SeedItem> GetPreloadedItems(string industry)
    {
        if (industry.Contains("pharma") || industry.Contains("chemist") || industry.Contains("health"))
        {
            return new List<SeedItem>
            {
                new("Dolo 650mg Tablet (Strip of 15)", "Paracetamol 650mg - Micro Labs", "30049060", 12.0m, 24.50m, 30.00m, 33.60m, 100),
                new("Augmentin 625 Duo Tablet (Strip of 10)", "Amoxycillin + Clavulanic Acid - GSK", "30041010", 12.0m, 160.00m, 195.00m, 223.50m, 50),
                new("Pan D Capsule (Strip of 15)", "Pantoprazole + Domperidone - Alkem", "30049099", 12.0m, 145.00m, 180.00m, 210.00m, 75),
                new("Azithral 500mg Tablet (Strip of 5)", "Azithromycin 500mg - Alembic", "30042099", 12.0m, 95.00m, 115.00m, 132.00m, 60),
                new("Montair LC Tablet (Strip of 10)", "Montelukast + Levocetirizine - Cipla", "30049099", 12.0m, 150.00m, 185.00m, 215.00m, 80),
                new("Combiflam Tablet (Strip of 20)", "Ibuprofen + Paracetamol - Sanofi", "30049060", 12.0m, 32.00m, 40.00m, 45.00m, 120),
                new("Shelcal 500 Tablet (Strip of 15)", "Calcium + Vitamin D3 - Torrent", "30049099", 12.0m, 90.00m, 115.00m, 131.00m, 90),
                new("Telma 40mg Tablet (Strip of 30)", "Telmisartan 40mg - Glenmark", "30049099", 12.0m, 180.00m, 220.00m, 255.00m, 40),
                new("Glycomet GP 1 Tablet (Strip of 15)", "Glimepiride + Metformin - USV", "30049099", 12.0m, 98.00m, 125.00m, 142.00m, 60),
                new("Betadine 10% Ointment (20g)", "Povidone Iodine 10% - Win-Medicare", "30049099", 12.0m, 85.00m, 105.00m, 120.00m, 45)
            };
        }
        else if (industry.Contains("fmcg") || industry.Contains("grocery") || industry.Contains("retail"))
        {
            return new List<SeedItem>
            {
                new("Tata Salt 1kg", "Vacuum Evaporated Iodized Salt", "25010010", 5.0m, 22.00m, 26.00m, 28.00m, 200),
                new("Fortune Sunlite Refined Sunflower Oil 1L", "Refined Cooking Oil Pouch", "15121910", 5.0m, 120.00m, 135.00m, 145.00m, 80),
                new("Aashirvaad Superior MP Shudh Chakki Atta 5kg", "100% Whole Wheat Atta", "11010000", 5.0m, 210.00m, 240.00m, 265.00m, 50),
                new("Maggi 2-Minute Masala Noodles 70g", "Instant Noodles Pack", "19023010", 12.0m, 11.50m, 13.50m, 14.00m, 300),
                new("Surf Excel Easy Wash Detergent Powder 1kg", "Fabric Care Powder", "34022010", 18.0m, 115.00m, 135.00m, 145.00m, 60),
                new("Colgate Strong Teeth Dental Cream 150g", "Cavity Protection Toothpaste", "33061020", 18.0m, 82.00m, 98.00m, 110.00m, 100),
                new("Dettol Original Bathing Soap 75g (Buy 3 Get 1)", "Antibacterial Bathing Soap", "34011110", 18.0m, 120.00m, 145.00m, 160.00m, 70),
                new("Parle-G Gold Biscuits 100g", "Glucose Biscuits Pack", "19053100", 18.0m, 8.20m, 9.50m, 10.00m, 250),
                new("Amul Butter 100g", "Pasteurized Salted Table Butter", "04051000", 12.0m, 48.00m, 54.00m, 58.00m, 90),
                new("Britannia Good Day Butter Cookies 100g", "Butter Cookies", "19053100", 18.0m, 24.00m, 28.00m, 30.00m, 150)
            };
        }
        else
        {
            return new List<SeedItem>
            {
                new("Standard Commercial Item A", "General Merchandise High Demand", "84713010", 18.0m, 450.00m, 600.00m, 699.00m, 50),
                new("Standard Commercial Item B", "Fast Moving Product", "84713010", 18.0m, 250.00m, 350.00m, 399.00m, 80),
                new("Standard Commercial Item C", "Premium Grade Stock", "84713010", 18.0m, 800.00m, 1100.00m, 1299.00m, 30),
                new("Universal Accessory Pack", "Universal Commercial SKU", "85044090", 18.0m, 120.00m, 180.00m, 220.00m, 100),
                new("Heavy Duty Industrial Pack", "Industrial Grade Component", "84834000", 18.0m, 1500.00m, 2100.00m, 2499.00m, 20)
            };
        }
    }
}
