using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class BulkImportService : IBulkImportService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public BulkImportService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
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

    public async Task<Result<BulkProductImportResult>> ImportProductsAsync(
        BulkProductImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Products == null || request.Products.Count == 0)
        {
            return Result<BulkProductImportResult>.Failure("No product rows provided for import.", "EMPTY_IMPORT");
        }

        Guid? warehouseId = request.WarehouseId;
        if (!warehouseId.HasValue || warehouseId.Value == Guid.Empty)
        {
            var defaultWh = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && !w.IsDeleted)
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(cancellationToken);

            if (defaultWh != null) warehouseId = defaultWh.Id;
        }

        var categories = await _context.Categories
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var brands = await _context.Brands
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .ToListAsync(cancellationToken);

        var uoms = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .ToListAsync(cancellationToken);

        var defaultUom = uoms.FirstOrDefault();
        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "UNIT",
                Name = "Unit / Piece",
                Symbol = "UNT"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
            uoms.Add(defaultUom);
        }

        var existingItems = await _context.Items
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .ToListAsync(cancellationToken);

        var errors = new List<BulkImportRowError>();
        var createdItemIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < request.Products.Count; i++)
        {
            var row = request.Products[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.Name))
            {
                errors.Add(new BulkImportRowError(rowIndex, row.Sku ?? $"ROW-{rowIndex}", "Product Name is required."));
                continue;
            }

            var sku = string.IsNullOrWhiteSpace(row.Sku) 
                ? $"SKU-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}" 
                : row.Sku.Trim().ToUpperInvariant();

            var existingItem = existingItems.FirstOrDefault(it => string.Equals(it.Sku, sku, StringComparison.OrdinalIgnoreCase));
            if (existingItem != null)
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            // Category match/create
            Category? category = null;
            if (!string.IsNullOrWhiteSpace(row.CategoryName))
            {
                category = categories.FirstOrDefault(c => string.Equals(c.Name, row.CategoryName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (category == null)
                {
                    category = new Category
                    {
                        TenantId = tenantId,
                        Name = row.CategoryName.Trim(),
                        Code = row.CategoryName.Trim().ToUpperInvariant().Replace(" ", "_"),
                        IsActive = true
                    };
                    _context.Categories.Add(category);
                    categories.Add(category);
                }
            }

            // Brand match/create
            Brand? brand = null;
            if (!string.IsNullOrWhiteSpace(row.BrandName))
            {
                brand = brands.FirstOrDefault(b => string.Equals(b.Name, row.BrandName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (brand == null)
                {
                    brand = new Brand
                    {
                        TenantId = tenantId,
                        Name = row.BrandName.Trim(),
                        Code = row.BrandName.Trim().ToUpperInvariant().Replace(" ", "_"),
                        IsActive = true
                    };
                    _context.Brands.Add(brand);
                    brands.Add(brand);
                }
            }

            // UOM match
            var uom = defaultUom;
            if (!string.IsNullOrWhiteSpace(row.PrimaryUom))
            {
                var matched = uoms.FirstOrDefault(u => string.Equals(u.Code, row.PrimaryUom.Trim(), StringComparison.OrdinalIgnoreCase) ||
                                                       string.Equals(u.Name, row.PrimaryUom.Trim(), StringComparison.OrdinalIgnoreCase));
                if (matched != null) uom = matched;
            }

            var itemAttrs = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(row.RackLocation))
            {
                itemAttrs["rackLocation"] = row.RackLocation.Trim();
            }

            // Sanitize rates and quantities to prevent any numeric overflow or invalid values
            var sanitizedTaxRate = row.TaxRate;
            if (sanitizedTaxRate > 100m && sanitizedTaxRate <= 2800m)
            {
                sanitizedTaxRate = sanitizedTaxRate / 100m; // Basis points (e.g. 1800 => 18%)
            }
            else if (sanitizedTaxRate > 100m || sanitizedTaxRate < 0m)
            {
                sanitizedTaxRate = 18.0m;
            }

            var sanitizedCessRate = row.CessRate;
            if (sanitizedCessRate > 100m && sanitizedCessRate <= 2800m)
            {
                sanitizedCessRate = sanitizedCessRate / 100m;
            }
            else if (sanitizedCessRate > 100m || sanitizedCessRate < 0m)
            {
                sanitizedCessRate = 0m;
            }

            var sanitizedPurchasePrice = Math.Max(0m, row.PurchasePrice);
            var sanitizedSalePrice = Math.Max(0m, row.SalePrice);
            var sanitizedWholesalePrice = row.WholesalePrice > 0m ? row.WholesalePrice : sanitizedSalePrice;
            var sanitizedMrp = row.Mrp > 0m ? row.Mrp : (sanitizedSalePrice > 0m ? sanitizedSalePrice : (sanitizedPurchasePrice > 0m ? sanitizedPurchasePrice : 100m));
            var sanitizedMinStock = Math.Max(0m, row.MinimumStockAlert);
            var sanitizedReorderQty = row.ReorderQuantity > 0m ? row.ReorderQuantity : 10m;
            var sanitizedOpeningStock = Math.Max(0m, row.OpeningStock);

            Item item;
            if (existingItem != null)
            {
                item = existingItem;
                item.Name = row.Name.Trim();
                item.ShortDescription = row.Description?.Trim();
                if (category != null) item.Category = category;
                if (brand != null) item.Brand = brand;
                item.PrimaryUom = uom;
                item.HSNCode = row.HsnCode?.Trim() ?? item.HSNCode;
                item.Barcode = row.Barcode?.Trim() ?? item.Barcode;
                item.TaxRate = sanitizedTaxRate;
                item.CessRate = sanitizedCessRate;
                item.PurchasePrice = sanitizedPurchasePrice;
                item.SellingPrice = sanitizedSalePrice;
                item.MinimumSellingPrice = sanitizedWholesalePrice;
                item.MRP = sanitizedMrp;
                item.MinimumStockAlert = sanitizedMinStock;
                item.ReorderQuantity = sanitizedReorderQty;
                item.AttributesJson = itemAttrs.Count > 0 ? JsonSerializer.Serialize(itemAttrs) : item.AttributesJson;
            }
            else
            {
                item = new Item
                {
                    TenantId = tenantId,
                    Sku = sku,
                    Name = row.Name.Trim(),
                    ShortDescription = row.Description?.Trim(),
                    Category = category,
                    Brand = brand,
                    PrimaryUom = uom,
                    HSNCode = row.HsnCode?.Trim(),
                    Barcode = row.Barcode?.Trim(),
                    TaxRate = sanitizedTaxRate,
                    CessRate = sanitizedCessRate,
                    PurchasePrice = sanitizedPurchasePrice,
                    SellingPrice = sanitizedSalePrice,
                    MinimumSellingPrice = sanitizedWholesalePrice,
                    MRP = sanitizedMrp,
                    MinimumStockAlert = sanitizedMinStock,
                    ReorderQuantity = sanitizedReorderQty,
                    TrackInventory = true,
                    TrackBatches = !string.IsNullOrWhiteSpace(row.BatchNumber),
                    AttributesJson = itemAttrs.Count > 0 ? JsonSerializer.Serialize(itemAttrs) : "{}",
                    IsActive = true
                };

                _context.Items.Add(item);
                existingItems.Add(item);
            }

            // Handle Opening Stock
            if (sanitizedOpeningStock > 0 && warehouseId.HasValue && warehouseId.Value != Guid.Empty && existingItem == null)
            {
                ItemBatch? batch = null;
                if (!string.IsNullOrWhiteSpace(row.BatchNumber))
                {
                    var expDate = row.ExpiryDate.HasValue
                        ? DateTime.SpecifyKind(row.ExpiryDate.Value, DateTimeKind.Utc)
                        : DateTime.UtcNow.AddYears(2);

                    batch = new ItemBatch
                    {
                        TenantId = tenantId,
                        Item = item,
                        BatchNumber = row.BatchNumber.Trim().ToUpperInvariant(),
                        ExpiryDate = expDate,
                        MRP = item.MRP,
                        PurchaseRate = item.PurchasePrice,
                        SaleRate = item.SellingPrice
                    };
                    _context.ItemBatches.Add(batch);
                }

                var stock = new ItemWarehouseStock
                {
                    TenantId = tenantId,
                    Item = item,
                    WarehouseId = warehouseId.Value,
                    Batch = batch,
                    CurrentQuantity = sanitizedOpeningStock
                };
                _context.ItemWarehouseStocks.Add(stock);

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    Item = item,
                    WarehouseId = warehouseId.Value,
                    Batch = batch,
                    MovementType = StockMovementType.PhysicalAdjustment,
                    Quantity = sanitizedOpeningStock,
                    QuantityBefore = 0,
                    QuantityAfter = sanitizedOpeningStock,
                    UnitCost = item.PurchasePrice,
                    TotalCost = item.PurchasePrice * sanitizedOpeningStock,
                    ReferenceDocumentType = "OpeningStockMigration",
                    ReferenceDocumentNumber = "MIG-OP-STOCK",
                    Notes = $"Opening stock migration ({sanitizedOpeningStock} {uom.Code})"
                };
                _context.StockMovements.Add(movement);
            }

            createdItemIds.Add(item.Id.ToString());
            successCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportProducts",
            EntityName = "Item",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, ErrorsCount = errors.Count })
        }, cancellationToken);

        var result = new BulkProductImportResult(
            request.Products.Count,
            successCount,
            errors.Count,
            skippedCount,
            errors,
            createdItemIds
        );

        return Result<BulkProductImportResult>.Success(result);
    }

    public async Task<Result<BulkPartyImportResult>> ImportPartiesAsync(
        BulkPartyImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.Parties == null || request.Parties.Count == 0)
        {
            return Result<BulkPartyImportResult>.Failure("No party rows provided for import.", "EMPTY_IMPORT");
        }

        var existingParties = await _context.Parties
            .Include(p => p.Addresses)
            .Where(p => p.TenantId == tenantId && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var errors = new List<BulkImportRowError>();
        var createdPartyIds = new List<string>();
        int successCount = 0;
        int skippedCount = 0;

        for (int i = 0; i < request.Parties.Count; i++)
        {
            var row = request.Parties[i];
            var rowIndex = i + 1;

            if (string.IsNullOrWhiteSpace(row.LegalName))
            {
                errors.Add(new BulkImportRowError(rowIndex, row.Code ?? $"ROW-{rowIndex}", "Party Legal Name is required."));
                continue;
            }

            var code = string.IsNullOrWhiteSpace(row.Code)
                ? $"P-{DateTime.UtcNow:yyMMdd}-{rowIndex:D4}"
                : row.Code.Trim().ToUpperInvariant();

            var existingParty = existingParties.FirstOrDefault(p => string.Equals(p.Code, code, StringComparison.OrdinalIgnoreCase));
            if (existingParty != null)
            {
                if (!request.OverwriteExisting)
                {
                    skippedCount++;
                    continue;
                }
            }

            var type = PartyType.Customer;
            if (string.Equals(row.PartyType, "Supplier", StringComparison.OrdinalIgnoreCase))
                type = PartyType.Supplier;
            else if (string.Equals(row.PartyType, "Both", StringComparison.OrdinalIgnoreCase))
                type = PartyType.Both;

            Party party;
            if (existingParty != null)
            {
                party = existingParty;
                party.LegalName = row.LegalName.Trim();
                party.TradeName = !string.IsNullOrWhiteSpace(row.TradeName) ? row.TradeName.Trim() : row.LegalName.Trim();
                party.PartyType = type;
                party.GSTIN = row.GSTIN?.Trim().ToUpperInvariant() ?? party.GSTIN;
                party.PAN = row.PAN?.Trim().ToUpperInvariant() ?? party.PAN;
                party.Mobile = row.Mobile?.Trim() ?? party.Mobile;
                party.PrimaryPhone = row.Mobile?.Trim() ?? party.PrimaryPhone;
                party.Email = row.Email?.Trim().ToLowerInvariant() ?? party.Email;
                party.CreditLimit = row.CreditLimit;
                party.CreditPeriodDays = row.CreditDays > 0 ? row.CreditDays : 30;
            }
            else
            {
                party = new Party
                {
                    TenantId = tenantId,
                    Code = code,
                    LegalName = row.LegalName.Trim(),
                    TradeName = !string.IsNullOrWhiteSpace(row.TradeName) ? row.TradeName.Trim() : row.LegalName.Trim(),
                    PartyType = type,
                    GSTIN = row.GSTIN?.Trim().ToUpperInvariant(),
                    PAN = row.PAN?.Trim().ToUpperInvariant(),
                    Mobile = row.Mobile?.Trim(),
                    PrimaryPhone = row.Mobile?.Trim(),
                    Email = row.Email?.Trim().ToLowerInvariant(),
                    CreditLimit = row.CreditLimit,
                    CreditPeriodDays = row.CreditDays > 0 ? row.CreditDays : 30,
                    IsActive = true
                };

                if (!string.IsNullOrWhiteSpace(row.AddressLine1))
                {
                    var address = new PartyAddress
                    {
                        TenantId = tenantId,
                        Party = party,
                        AddressType = AddressType.Billing,
                        AddressLine1 = row.AddressLine1.Trim(),
                        City = row.City?.Trim() ?? "City",
                        State = row.State?.Trim() ?? "State",
                        StateCode = row.StateCode?.Trim() ?? "27",
                        Pincode = row.Pincode?.Trim() ?? "000000",
                        IsDefault = true
                    };
                    party.Addresses.Add(address);
                }

                _context.Parties.Add(party);
                existingParties.Add(party);
            }

            // Handle Opening Balance
            if (row.OpeningBalance > 0 && existingParty == null)
            {
                bool isDebit = string.Equals(row.OpeningBalanceType, "Debit", StringComparison.OrdinalIgnoreCase) ||
                               type == PartyType.Customer;

                var ledger = new PartyLedgerEntry
                {
                    TenantId = tenantId,
                    Party = party,
                    TransactionDate = DateTime.UtcNow,
                    EntryType = PartyLedgerEntryType.OpeningBalance,
                    DebitAmount = isDebit ? row.OpeningBalance : 0m,
                    CreditAmount = !isDebit ? row.OpeningBalance : 0m,
                    RunningBalance = isDebit ? row.OpeningBalance : -row.OpeningBalance,
                    ReferenceDocumentType = "OpeningBalanceMigration",
                    ReferenceDocumentNumber = "MIG-OP-BAL",
                    Description = $"Opening balance migration ({row.OpeningBalance})"
                };
                _context.PartyLedgerEntries.Add(ledger);
            }

            createdPartyIds.Add(party.Id.ToString());
            successCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "BulkImportParties",
            EntityName = "Party",
            IpAddress = ipAddress,
            NewValuesJson = JsonSerializer.Serialize(new { SuccessCount = successCount, ErrorsCount = errors.Count })
        }, cancellationToken);

        var result = new BulkPartyImportResult(
            request.Parties.Count,
            successCount,
            errors.Count,
            skippedCount,
            errors,
            createdPartyIds
        );

        return Result<BulkPartyImportResult>.Success(result);
    }

    public Task<Result<CsvTemplateFileDto>> GetProductImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Sku,Name,CategoryName,BrandName,HsnCode,Barcode,PrimaryUom,TaxRate,CessRate,PurchasePrice,RetailPrice,WholesalePrice,Mrp,MinimumStockAlert,ReorderQuantity,OpeningStock,BatchNumber,ExpiryDate,RackLocation,Description");
        sb.AppendLine("MED-PCM-650,Paracetamol 650mg Tablets,Analgesic,Cipla,30049099,8901002001,STRIP,12,0,18.50,30.00,26.00,35.00,50,100,250,BAT-2026-A1,2028-12-31,Rack-A-12,Pain & Fever Relief");
        sb.AppendLine("MED-AZI-500,Azithromycin 500mg,Antibiotic,Sun Pharma,30042010,8901002002,STRIP,12,0,45.00,75.00,65.00,90.00,30,60,150,BAT-2026-B2,2027-08-31,Rack-B-04,Broad spectrum antibiotic");
        sb.AppendLine("FMCG-BIS-01,Parle-G Gold Glucose 1kg,Biscuits,Parle,19053100,8901003001,PACK,5,0,80.00,100.00,92.00,110.00,20,50,80,BAT-FMCG-01,2027-03-31,Shelf-1,Daily nutrition biscuits");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var dto = new CsvTemplateFileDto("UdyogBill_Products_Import_Template.csv", "text/csv", bytes);
        return Task.FromResult(Result<CsvTemplateFileDto>.Success(dto));
    }

    public Task<Result<CsvTemplateFileDto>> GetPartyImportTemplateAsync(CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Code,LegalName,TradeName,PartyType,GSTIN,PAN,Mobile,Email,ContactPerson,AddressLine1,City,State,StateCode,Pincode,CreditLimit,CreditDays,OpeningBalance,OpeningBalanceType,DrugLicenseNumber,FssaiNumber");
        sb.AppendLine("CUST-001,Apollo Medico Distributors,Apollo Medico,Customer,27AAAAA0000A1Z5,AAAAA0000A,9820011223,accounts@apollomedico.in,Ramesh Sharma,Shop 42 Chemist Market,Mumbai,Maharashtra,27,400001,500000,30,45000,Debit,MH-MZ1-123456,10012011000123");
        sb.AppendLine("SUPP-001,Sun Pharmaceutical Industries Ltd,Sun Pharma,Supplier,27AAACS1234F1Z1,AAACS1234F,9811002233,distributors@sunpharma.com,Vivek Gupta,Plot 18 Sun Complex,Pune,Maharashtra,27,411001,1500000,45,120000,Credit,MH-PUN-654321,");
        sb.AppendLine("CUST-002,Sharma Supermarket & Grocery,Sharma Mart,Customer,27BBBBB1111B1Z2,BBBBB1111B,9876543210,sharma.mart@gmail.com,Anil Sharma,Main Market Road,Nagpur,Maharashtra,27,440001,200000,15,15000,Debit,,20015011000456");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var dto = new CsvTemplateFileDto("UdyogBill_Parties_Import_Template.csv", "text/csv", bytes);
        return Task.FromResult(Result<CsvTemplateFileDto>.Success(dto));
    }
}
