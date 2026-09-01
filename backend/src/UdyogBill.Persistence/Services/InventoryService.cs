using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public InventoryService(
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

    #region Categories

    public async Task<Result<IReadOnlyList<CategoryDto>>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var categories = await _context.Categories
            .Where(c => c.TenantId == tenantId && !c.IsDeleted)
            .Include(c => c.ParentCategory)
            .Include(c => c.Items.Where(i => !i.IsDeleted))
            .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

        // Build hierarchical tree
        var rootCategories = categories
            .Where(c => c.ParentCategoryId == null)
            .Select(c => MapCategoryToDto(c, categories))
            .ToList();

        return Result<IReadOnlyList<CategoryDto>>.Success(rootCategories);
    }

    private static CategoryDto MapCategoryToDto(Category cat, List<Category> allCategories)
    {
        var subs = allCategories
            .Where(c => c.ParentCategoryId == cat.Id)
            .Select(c => MapCategoryToDto(c, allCategories))
            .ToList();

        return new CategoryDto(
            cat.Id,
            cat.TenantId,
            cat.Code,
            cat.Name,
            cat.Description,
            cat.ParentCategoryId,
            cat.ParentCategory?.Name,
            cat.DisplayOrder,
            cat.IsActive,
            cat.Items.Count,
            subs
        );
    }

    public async Task<Result<CategoryDto>> GetCategoryByIdAsync(Guid categoryId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var cat = await _context.Categories
            .Where(c => c.TenantId == tenantId && c.Id == categoryId && !c.IsDeleted)
            .Include(c => c.ParentCategory)
            .Include(c => c.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);

        if (cat == null)
        {
            return Result<CategoryDto>.Failure("Category not found.", "NOT_FOUND");
        }

        var dto = new CategoryDto(
            cat.Id,
            cat.TenantId,
            cat.Code,
            cat.Name,
            cat.Description,
            cat.ParentCategoryId,
            cat.ParentCategory?.Name,
            cat.DisplayOrder,
            cat.IsActive,
            cat.Items.Count,
            new List<CategoryDto>()
        );

        return Result<CategoryDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateCategoryAsync(CreateCategoryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Categories
            .AnyAsync(c => c.TenantId == tenantId && c.Code == normalizedCode && !c.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Category code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var category = new Category
        {
            TenantId = tenantId,
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            ParentCategoryId = request.ParentCategoryId,
            DisplayOrder = request.DisplayOrder,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateCategory",
            EntityName = "Category",
            EntityId = category.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(category.Id);
    }

    public async Task<Result> UpdateCategoryAsync(Guid categoryId, UpdateCategoryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == categoryId && !c.IsDeleted, cancellationToken);

        if (category == null)
        {
            return Result.Failure("Category not found.", "NOT_FOUND");
        }

        if (request.ParentCategoryId == categoryId)
        {
            return Result.Failure("Category cannot be its own parent.", "INVALID_PARENT");
        }

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        category.ParentCategoryId = request.ParentCategoryId;
        category.DisplayOrder = request.DisplayOrder;
        category.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteCategoryAsync(Guid categoryId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var category = await _context.Categories
            .Include(c => c.Items)
            .Include(c => c.SubCategories)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == categoryId && !c.IsDeleted, cancellationToken);

        if (category == null)
        {
            return Result.Failure("Category not found.", "NOT_FOUND");
        }

        if (category.Items.Any(i => !i.IsDeleted))
        {
            return Result.Failure("Cannot delete category with associated products.", "HAS_PRODUCTS");
        }

        category.IsDeleted = true;
        category.DeletedAtUtc = DateTimeOffset.UtcNow;
        category.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Brands

    public async Task<Result<IReadOnlyList<BrandDto>>> GetBrandsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var brands = await _context.Brands
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .Include(b => b.Items.Where(i => !i.IsDeleted))
            .OrderBy(b => b.Name)
            .Select(b => new BrandDto(
                b.Id,
                b.TenantId,
                b.Code,
                b.Name,
                b.ManufacturerName,
                b.Description,
                b.IsActive,
                b.Items.Count
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<BrandDto>>.Success(brands);
    }

    public async Task<Result<BrandDto>> GetBrandByIdAsync(Guid brandId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var b = await _context.Brands
            .Where(b => b.TenantId == tenantId && b.Id == brandId && !b.IsDeleted)
            .Include(b => b.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);

        if (b == null)
        {
            return Result<BrandDto>.Failure("Brand not found.", "NOT_FOUND");
        }

        var dto = new BrandDto(
            b.Id,
            b.TenantId,
            b.Code,
            b.Name,
            b.ManufacturerName,
            b.Description,
            b.IsActive,
            b.Items.Count
        );

        return Result<BrandDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateBrandAsync(CreateBrandRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Brands
            .AnyAsync(b => b.TenantId == tenantId && b.Code == normalizedCode && !b.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Brand code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var brand = new Brand
        {
            TenantId = tenantId,
            Code = normalizedCode,
            Name = request.Name.Trim(),
            ManufacturerName = request.ManufacturerName?.Trim(),
            Description = request.Description?.Trim(),
            IsActive = true
        };

        _context.Brands.Add(brand);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(brand.Id);
    }

    public async Task<Result> UpdateBrandAsync(Guid brandId, UpdateBrandRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var brand = await _context.Brands
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == brandId && !b.IsDeleted, cancellationToken);

        if (brand == null)
        {
            return Result.Failure("Brand not found.", "NOT_FOUND");
        }

        brand.Name = request.Name.Trim();
        brand.ManufacturerName = request.ManufacturerName?.Trim();
        brand.Description = request.Description?.Trim();
        brand.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteBrandAsync(Guid brandId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var brand = await _context.Brands
            .Include(b => b.Items)
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == brandId && !b.IsDeleted, cancellationToken);

        if (brand == null)
        {
            return Result.Failure("Brand not found.", "NOT_FOUND");
        }

        if (brand.Items.Any(i => !i.IsDeleted))
        {
            return Result.Failure("Cannot delete brand with associated products.", "HAS_PRODUCTS");
        }

        brand.IsDeleted = true;
        brand.DeletedAtUtc = DateTimeOffset.UtcNow;
        brand.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Units & Conversions

    public async Task<Result<IReadOnlyList<UomDto>>> GetUnitsOfMeasureAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var units = await _context.UnitsOfMeasure
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .OrderBy(u => u.Name)
            .Select(u => new UomDto(
                u.Id,
                u.TenantId,
                u.Code,
                u.Name,
                u.Symbol,
                u.DecimalPlaces,
                u.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<UomDto>>.Success(units);
    }

    public async Task<Result<Guid>> CreateUnitOfMeasureAsync(CreateUomRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.UnitsOfMeasure
            .AnyAsync(u => u.TenantId == tenantId && u.Code == normalizedCode && !u.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Unit code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var uom = new UnitOfMeasure
        {
            TenantId = tenantId,
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Symbol = request.Symbol.Trim(),
            DecimalPlaces = request.DecimalPlaces,
            IsActive = true
        };

        _context.UnitsOfMeasure.Add(uom);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(uom.Id);
    }

    public async Task<Result> UpdateUnitOfMeasureAsync(Guid uomId, UpdateUomRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var uom = await _context.UnitsOfMeasure
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == uomId && !u.IsDeleted, cancellationToken);

        if (uom == null)
        {
            return Result.Failure("Unit of measure not found.", "NOT_FOUND");
        }

        uom.Name = request.Name.Trim();
        uom.Symbol = request.Symbol.Trim();
        uom.DecimalPlaces = request.DecimalPlaces;
        uom.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<UnitConversionDto>>> GetUnitConversionsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var conversions = await _context.UnitConversions
            .Where(uc => uc.TenantId == tenantId && !uc.IsDeleted)
            .Include(uc => uc.FromUom)
            .Include(uc => uc.ToUom)
            .Select(uc => new UnitConversionDto(
                uc.Id,
                uc.TenantId,
                uc.FromUomId,
                uc.FromUom.Code,
                uc.FromUom.Name,
                uc.ToUomId,
                uc.ToUom.Code,
                uc.ToUom.Name,
                uc.ConversionFactor
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<UnitConversionDto>>.Success(conversions);
    }

    public async Task<Result<Guid>> CreateUnitConversionAsync(CreateUnitConversionRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.FromUomId == request.ToUomId)
        {
            return Result<Guid>.Failure("From Unit and To Unit must be different.", "INVALID_UNITS");
        }

        if (request.ConversionFactor <= 0)
        {
            return Result<Guid>.Failure("Conversion factor must be greater than zero.", "INVALID_FACTOR");
        }

        var exists = await _context.UnitConversions
            .AnyAsync(uc => uc.TenantId == tenantId && uc.FromUomId == request.FromUomId && uc.ToUomId == request.ToUomId && !uc.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure("Unit conversion already exists for these units.", "CONVERSION_ALREADY_EXISTS");
        }

        var conversion = new UnitConversion
        {
            TenantId = tenantId,
            FromUomId = request.FromUomId,
            ToUomId = request.ToUomId,
            ConversionFactor = request.ConversionFactor
        };

        _context.UnitConversions.Add(conversion);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(conversion.Id);
    }

    public async Task<Result> DeleteUnitConversionAsync(Guid conversionId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var conversion = await _context.UnitConversions
            .FirstOrDefaultAsync(uc => uc.TenantId == tenantId && uc.Id == conversionId && !uc.IsDeleted, cancellationToken);

        if (conversion == null)
        {
            return Result.Failure("Unit conversion not found.", "NOT_FOUND");
        }

        conversion.IsDeleted = true;
        conversion.DeletedAtUtc = DateTimeOffset.UtcNow;
        conversion.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Master Items

    public async Task<Result<PagedResult<ItemListDto>>> GetItemsAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm = null,
        Guid? categoryId = null,
        Guid? brandId = null,
        bool? lowStockOnly = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.Items
            .Where(i => i.TenantId == tenantId && !i.IsDeleted)
            .Include(i => i.Category)
            .Include(i => i.Brand)
            .Include(i => i.PrimaryUom)
            .Include(i => i.WarehouseStocks.Where(ws => !ws.IsDeleted))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(i =>
                i.Name.ToLower().Contains(term) ||
                i.Sku.ToLower().Contains(term) ||
                (i.Barcode != null && i.Barcode.Contains(term)) ||
                (i.HSNCode != null && i.HSNCode.Contains(term)));
        }

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            query = query.Where(i => i.CategoryId == categoryId.Value);
        }

        if (brandId.HasValue && brandId.Value != Guid.Empty)
        {
            query = query.Where(i => i.BrandId == brandId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(i => i.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(i =>
        {
            var totalStock = i.WarehouseStocks.Sum(ws => ws.CurrentQuantity);
            var isLowStock = i.MinimumStockAlert > 0 && totalStock <= i.MinimumStockAlert;

            return new ItemListDto(
                i.Id,
                i.TenantId,
                i.Sku,
                i.Name,
                i.Barcode,
                i.ItemType,
                i.Category?.Name,
                i.Brand?.Name,
                i.PrimaryUomId,
                i.PrimaryUom.Code,
                i.PrimaryUom.Symbol,
                i.HSNCode,
                i.TaxRate,
                i.PurchasePrice,
                i.SellingPrice,
                i.MRP,
                i.MinimumSellingPrice,
                totalStock,
                i.MinimumStockAlert,
                isLowStock,
                i.TrackBatches,
                i.TrackSerialNumbers,
                i.TrackVariants,
                i.TrackInventory,
                i.AttributesJson,
                i.IsActive,
                i.CreatedAtUtc
            );
        }).ToList();

        if (lowStockOnly.HasValue && lowStockOnly.Value)
        {
            dtos = dtos.Where(i => i.IsLowStock).ToList();
        }

        return Result<PagedResult<ItemListDto>>.Success(PagedResult<ItemListDto>.Create(dtos, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<ItemDetailsDto>> GetItemByIdAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .Where(i => i.TenantId == tenantId && i.Id == itemId && !i.IsDeleted)
            .Include(i => i.Category)
            .Include(i => i.Brand)
            .Include(i => i.PrimaryUom)
            .Include(i => i.SecondaryUom)
            .Include(i => i.Batches.Where(b => !b.IsDeleted))
                .ThenInclude(b => b.WarehouseStocks.Where(ws => !ws.IsDeleted))
            .Include(i => i.WarehouseStocks.Where(ws => !ws.IsDeleted))
                .ThenInclude(ws => ws.Warehouse)
                    .ThenInclude(w => w.Branch)
            .FirstOrDefaultAsync(cancellationToken);

        if (item == null)
        {
            return Result<ItemDetailsDto>.Failure("Item not found.", "NOT_FOUND");
        }

        var totalStock = item.WarehouseStocks.Sum(ws => ws.CurrentQuantity);

        var batchDtos = item.Batches.Select(b => new ItemBatchDto(
            b.Id,
            b.ItemId,
            b.BatchNumber,
            b.ManufacturingDate,
            b.ExpiryDate,
            b.MRP,
            b.PurchaseRate,
            b.SaleRate,
            b.Barcode,
            b.WarehouseStocks.Sum(ws => ws.CurrentQuantity),
            b.ExpiryDate < DateTime.UtcNow,
            b.ExpiryDate < DateTime.UtcNow.AddDays(90) && b.ExpiryDate >= DateTime.UtcNow,
            b.IsActive
        )).ToList();

        var stockDtos = item.WarehouseStocks.Select(ws => new WarehouseStockDto(
            ws.WarehouseId,
            ws.Warehouse.WarehouseCode,
            ws.Warehouse.WarehouseName,
            ws.Warehouse.Branch.BranchName,
            ws.BatchId,
            ws.Batch?.BatchNumber,
            ws.Batch?.ExpiryDate,
            ws.CurrentQuantity,
            ws.ReservedQuantity,
            ws.AvailableQuantity,
            ws.ReorderLevel
        )).ToList();

        var dto = new ItemDetailsDto(
            item.Id,
            item.TenantId,
            item.Sku,
            item.Name,
            item.ShortDescription,
            item.Barcode,
            item.ItemType,
            item.CategoryId,
            item.Category?.Name,
            item.BrandId,
            item.Brand?.Name,
            item.PrimaryUomId,
            item.PrimaryUom.Code,
            item.PrimaryUom.Name,
            item.SecondaryUomId,
            item.SecondaryUom?.Code,
            item.ConversionRatio,
            item.HSNCode,
            item.TaxRate,
            item.CessRate,
            item.IsTaxInclusive,
            item.PurchasePrice,
            item.SellingPrice,
            item.MRP,
            item.MinimumSellingPrice,
            item.MinimumStockAlert,
            item.MaximumStockAlert,
            item.ReorderQuantity,
            item.TrackBatches,
            item.TrackSerialNumbers,
            item.TrackVariants,
            item.TrackInventory,
            item.AttributesJson,
            item.IsActive,
            item.CreatedAtUtc,
            totalStock,
            batchDtos,
            stockDtos
        );

        return Result<ItemDetailsDto>.Success(dto);
    }

    public async Task<Result<ItemDetailsDto>> GetItemByBarcodeAsync(string barcode, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .Where(i => i.TenantId == tenantId && (i.Barcode == barcode || i.Sku == barcode) && !i.IsDeleted)
            .Select(i => i.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (item == Guid.Empty)
        {
            return Result<ItemDetailsDto>.Failure($"Product with barcode '{barcode}' not found.", "NOT_FOUND");
        }

        return await GetItemByIdAsync(item, cancellationToken);
    }

    public async Task<Result<Guid>> CreateItemAsync(CreateItemRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        
        string normalizedSku;
        if (string.IsNullOrWhiteSpace(request.Sku))
        {
            var prefix = "PRD";
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var cleanName = new string(request.Name.Where(char.IsLetterOrDigit).ToArray());
                prefix = cleanName.Length >= 3 ? cleanName[..3].ToUpperInvariant() : (cleanName.Length > 0 ? cleanName.ToUpperInvariant() : "PRD");
            }
            var randomSuffix = Random.Shared.Next(100, 999);
            var timestamp = DateTimeOffset.UtcNow.ToString("yyMMdd");
            normalizedSku = $"{prefix}-{timestamp}-{randomSuffix}";
        }
        else
        {
            normalizedSku = request.Sku.Trim().ToUpperInvariant();
        }

        var exists = await _context.Items
            .AnyAsync(i => i.TenantId == tenantId && i.Sku == normalizedSku && !i.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Item SKU '{normalizedSku}' already exists.", "SKU_ALREADY_EXISTS");
        }

        var uomExists = await _context.UnitsOfMeasure
            .AnyAsync(u => u.TenantId == tenantId && u.Id == request.PrimaryUomId && !u.IsDeleted, cancellationToken);

        if (!uomExists)
        {
            return Result<Guid>.Failure("Primary Unit of Measure not found.", "UOM_NOT_FOUND");
        }

        var item = new Item
        {
            TenantId = tenantId,
            Sku = normalizedSku,
            Name = request.Name.Trim(),
            ShortDescription = request.ShortDescription?.Trim(),
            Barcode = request.Barcode?.Trim(),
            ItemType = request.ItemType,
            CategoryId = request.CategoryId,
            BrandId = request.BrandId,
            PrimaryUomId = request.PrimaryUomId,
            SecondaryUomId = request.SecondaryUomId,
            ConversionRatio = request.ConversionRatio,
            HSNCode = request.HSNCode?.Trim(),
            TaxRate = request.TaxRate,
            CessRate = request.CessRate,
            IsTaxInclusive = request.IsTaxInclusive,
            PurchasePrice = request.PurchasePrice,
            SellingPrice = request.SellingPrice,
            MRP = request.MRP,
            MinimumSellingPrice = request.MinimumSellingPrice,
            MinimumStockAlert = request.MinimumStockAlert,
            MaximumStockAlert = request.MaximumStockAlert,
            ReorderQuantity = request.ReorderQuantity,
            TrackBatches = request.TrackBatches,
            TrackSerialNumbers = request.TrackSerialNumbers,
            TrackVariants = request.TrackVariants,
            TrackInventory = request.ItemType != ItemType.Service && request.TrackInventory,
            AttributesJson = request.AttributesJson ?? "{}",
            IsActive = true
        };

        _context.Items.Add(item);

        // Initial Stock Onboarding (Skip for Services or non-stock items)
        if (request.ItemType != ItemType.Service && request.TrackInventory && request.InitialStock > 0)
        {
            var defaultWarehouse = request.InitialWarehouseId.HasValue && request.InitialWarehouseId.Value != Guid.Empty
                ? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == request.InitialWarehouseId.Value && !w.IsDeleted, cancellationToken)
                : await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && w.IsDefault && !w.IsDeleted, cancellationToken);

            if (defaultWarehouse != null)
            {
                ItemBatch? batch = null;
                if (request.TrackBatches && !string.IsNullOrWhiteSpace(request.InitialBatchNumber))
                {
                    batch = new ItemBatch
                    {
                        TenantId = tenantId,
                        ItemId = item.Id,
                        BatchNumber = request.InitialBatchNumber.Trim().ToUpperInvariant(),
                        ExpiryDate = request.InitialBatchExpiryDate.HasValue
                            ? DateTime.SpecifyKind(request.InitialBatchExpiryDate.Value, DateTimeKind.Utc)
                            : DateTime.UtcNow.AddYears(2),
                        ManufacturingDate = DateTime.UtcNow.AddMonths(-1),
                        MRP = request.MRP,
                        PurchaseRate = request.PurchasePrice,
                        SaleRate = request.SellingPrice,
                        IsActive = true
                    };
                    item.Batches.Add(batch);
                }

                var stock = new ItemWarehouseStock
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    WarehouseId = defaultWarehouse.Id,
                    Batch = batch,
                    CurrentQuantity = request.InitialStock,
                    ReservedQuantity = 0,
                    ReorderLevel = request.MinimumStockAlert
                };
                item.WarehouseStocks.Add(stock);

                var movement = new StockMovement
                {
                    TenantId = tenantId,
                    ItemId = item.Id,
                    WarehouseId = defaultWarehouse.Id,
                    Batch = batch,
                    MovementType = StockMovementType.PhysicalAdjustment,
                    Quantity = request.InitialStock,
                    QuantityBefore = 0,
                    QuantityAfter = request.InitialStock,
                    UnitCost = request.PurchasePrice,
                    TotalCost = request.InitialStock * request.PurchasePrice,
                    ReferenceDocumentType = "InitialStockOpening",
                    Notes = "Opening stock balance upon product catalog creation"
                };
                _context.StockMovements.Add(movement);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateItem",
            EntityName = "Item",
            EntityId = item.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { item.Sku, item.Name, item.MRP, item.PurchasePrice, item.SellingPrice }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(item.Id);
    }

    public async Task<Result> UpdateItemAsync(Guid itemId, UpdateItemRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == itemId && !i.IsDeleted, cancellationToken);

        if (item == null)
        {
            return Result.Failure("Item not found.", "NOT_FOUND");
        }

        item.Name = request.Name.Trim();
        item.ShortDescription = request.ShortDescription?.Trim();
        item.Barcode = request.Barcode?.Trim();
        item.ItemType = request.ItemType;
        item.CategoryId = request.CategoryId;
        item.BrandId = request.BrandId;
        item.PrimaryUomId = request.PrimaryUomId;
        item.SecondaryUomId = request.SecondaryUomId;
        item.ConversionRatio = request.ConversionRatio;
        item.HSNCode = request.HSNCode?.Trim();
        item.TaxRate = request.TaxRate;
        item.CessRate = request.CessRate;
        item.IsTaxInclusive = request.IsTaxInclusive;
        item.PurchasePrice = request.PurchasePrice;
        item.SellingPrice = request.SellingPrice;
        item.MRP = request.MRP;
        item.MinimumSellingPrice = request.MinimumSellingPrice;
        item.MinimumStockAlert = request.MinimumStockAlert;
        item.MaximumStockAlert = request.MaximumStockAlert;
        item.ReorderQuantity = request.ReorderQuantity;
        item.TrackBatches = request.TrackBatches;
        item.TrackSerialNumbers = request.TrackSerialNumbers;
        item.TrackVariants = request.TrackVariants;
        item.TrackInventory = request.ItemType != ItemType.Service && request.TrackInventory;
        item.AttributesJson = request.AttributesJson ?? "{}";
        item.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteItemAsync(Guid itemId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .Include(i => i.WarehouseStocks)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == itemId && !i.IsDeleted, cancellationToken);

        if (item == null)
        {
            return Result.Failure("Item not found.", "NOT_FOUND");
        }

        var hasStock = item.WarehouseStocks.Any(ws => !ws.IsDeleted && ws.CurrentQuantity > 0);
        if (hasStock)
        {
            return Result.Failure("Cannot delete item with active stock balance.", "HAS_STOCK");
        }

        item.IsDeleted = true;
        item.DeletedAtUtc = DateTimeOffset.UtcNow;
        item.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Batches

    public async Task<Result<IReadOnlyList<ItemBatchDto>>> GetItemBatchesAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var batches = await _context.ItemBatches
            .Where(b => b.TenantId == tenantId && b.ItemId == itemId && !b.IsDeleted)
            .Include(b => b.WarehouseStocks.Where(ws => !ws.IsDeleted))
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync(cancellationToken);

        var dtos = batches.Select(b => new ItemBatchDto(
            b.Id,
            b.ItemId,
            b.BatchNumber,
            b.ManufacturingDate,
            b.ExpiryDate,
            b.MRP,
            b.PurchaseRate,
            b.SaleRate,
            b.Barcode,
            b.WarehouseStocks.Sum(ws => ws.CurrentQuantity),
            b.ExpiryDate < DateTime.UtcNow,
            b.ExpiryDate < DateTime.UtcNow.AddDays(90) && b.ExpiryDate >= DateTime.UtcNow,
            b.IsActive
        )).ToList();

        return Result<IReadOnlyList<ItemBatchDto>>.Success(dtos);
    }

    public async Task<Result<Guid>> CreateItemBatchAsync(CreateItemBatchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.ItemId && !i.IsDeleted, cancellationToken);

        if (item == null)
        {
            return Result<Guid>.Failure("Item not found.", "NOT_FOUND");
        }

        var normalizedBatch = request.BatchNumber.Trim().ToUpperInvariant();
        var exists = await _context.ItemBatches
            .AnyAsync(b => b.TenantId == tenantId && b.ItemId == request.ItemId && b.BatchNumber == normalizedBatch && !b.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Batch '{normalizedBatch}' already exists for this item.", "BATCH_ALREADY_EXISTS");
        }

        var batch = new ItemBatch
        {
            TenantId = tenantId,
            ItemId = request.ItemId,
            BatchNumber = normalizedBatch,
            ManufacturingDate = request.ManufacturingDate.HasValue ? DateTime.SpecifyKind(request.ManufacturingDate.Value, DateTimeKind.Utc) : null,
            ExpiryDate = DateTime.SpecifyKind(request.ExpiryDate, DateTimeKind.Utc),
            MRP = request.MRP,
            PurchaseRate = request.PurchaseRate,
            SaleRate = request.SaleRate,
            Barcode = request.Barcode?.Trim(),
            IsActive = true
        };

        _context.ItemBatches.Add(batch);

        if (request.InitialQuantity > 0)
        {
            var stock = new ItemWarehouseStock
            {
                TenantId = tenantId,
                ItemId = request.ItemId,
                WarehouseId = request.WarehouseId,
                Batch = batch,
                CurrentQuantity = request.InitialQuantity,
                ReservedQuantity = 0,
                ReorderLevel = item.MinimumStockAlert
            };
            _context.ItemWarehouseStocks.Add(stock);

            var movement = new StockMovement
            {
                TenantId = tenantId,
                ItemId = request.ItemId,
                WarehouseId = request.WarehouseId,
                Batch = batch,
                MovementType = StockMovementType.PhysicalAdjustment,
                Quantity = request.InitialQuantity,
                QuantityBefore = 0,
                QuantityAfter = request.InitialQuantity,
                UnitCost = request.PurchaseRate,
                TotalCost = request.InitialQuantity * request.PurchaseRate,
                ReferenceDocumentType = "InitialBatchOpening",
                Notes = $"Opening stock balance for batch {normalizedBatch}"
            };
            _context.StockMovements.Add(movement);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(batch.Id);
    }

    #endregion

    #region Stock Ledger & Adjustments

    public async Task<Result<IReadOnlyList<WarehouseStockDto>>> GetItemStockBalancesAsync(Guid? itemId = null, Guid? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.ItemWarehouseStocks
            .Where(ws => ws.TenantId == tenantId && !ws.IsDeleted)
            .Include(ws => ws.Warehouse)
                .ThenInclude(w => w.Branch)
            .Include(ws => ws.Batch)
            .AsQueryable();

        if (itemId.HasValue && itemId.Value != Guid.Empty)
        {
            query = query.Where(ws => ws.ItemId == itemId.Value);
        }

        if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
        {
            query = query.Where(ws => ws.WarehouseId == warehouseId.Value);
        }

        var items = await query
            .OrderBy(ws => ws.Warehouse.WarehouseName)
            .Select(ws => new WarehouseStockDto(
                ws.WarehouseId,
                ws.Warehouse.WarehouseCode,
                ws.Warehouse.WarehouseName,
                ws.Warehouse.Branch.BranchName,
                ws.BatchId,
                ws.Batch != null ? ws.Batch.BatchNumber : null,
                ws.Batch != null ? ws.Batch.ExpiryDate : null,
                ws.CurrentQuantity,
                ws.ReservedQuantity,
                ws.CurrentQuantity - ws.ReservedQuantity,
                ws.ReorderLevel
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<WarehouseStockDto>>.Success(items);
    }

    public async Task<Result<PagedResult<StockMovementDto>>> GetStockMovementsAsync(
        int pageNumber,
        int pageSize,
        Guid? itemId = null,
        Guid? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.StockMovements
            .Where(sm => sm.TenantId == tenantId && !sm.IsDeleted)
            .Include(sm => sm.Item)
            .Include(sm => sm.Warehouse)
            .Include(sm => sm.Batch)
            .AsQueryable();

        if (itemId.HasValue && itemId.Value != Guid.Empty)
        {
            query = query.Where(sm => sm.ItemId == itemId.Value);
        }

        if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
        {
            query = query.Where(sm => sm.WarehouseId == warehouseId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var movements = await query
            .OrderByDescending(sm => sm.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = movements.Select(sm => new StockMovementDto(
            sm.Id,
            sm.TenantId,
            sm.ItemId,
            sm.Item.Sku,
            sm.Item.Name,
            sm.WarehouseId,
            sm.Warehouse.WarehouseName,
            sm.Batch?.BatchNumber,
            sm.MovementType,
            sm.MovementType.ToString(),
            sm.Quantity,
            sm.QuantityBefore,
            sm.QuantityAfter,
            sm.UnitCost,
            sm.TotalCost,
            sm.ReferenceDocumentType,
            sm.ReferenceDocumentNumber,
            sm.Notes,
            sm.CreatedAtUtc
        )).ToList();

        return Result<PagedResult<StockMovementDto>>.Success(PagedResult<StockMovementDto>.Create(dtos, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<Guid>> RecordStockAdjustmentAsync(StockAdjustmentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var item = await _context.Items
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.ItemId && !i.IsDeleted, cancellationToken);

        if (item == null)
        {
            return Result<Guid>.Failure("Item not found.", "ITEM_NOT_FOUND");
        }

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == request.WarehouseId && !w.IsDeleted, cancellationToken);

        if (warehouse == null)
        {
            return Result<Guid>.Failure("Warehouse not found.", "WAREHOUSE_NOT_FOUND");
        }

        var stockRecord = await _context.ItemWarehouseStocks
            .FirstOrDefaultAsync(ws => ws.TenantId == tenantId && ws.ItemId == request.ItemId && ws.WarehouseId == request.WarehouseId && ws.BatchId == request.BatchId && !ws.IsDeleted, cancellationToken);

        var qtyBefore = stockRecord?.CurrentQuantity ?? 0m;
        var qtyAfter = qtyBefore + request.QuantityChange;

        if (qtyAfter < 0)
        {
            return Result<Guid>.Failure($"Adjustment would result in negative stock balance ({qtyAfter}).", "INSUFFICIENT_STOCK");
        }

        if (stockRecord == null)
        {
            stockRecord = new ItemWarehouseStock
            {
                TenantId = tenantId,
                ItemId = request.ItemId,
                WarehouseId = request.WarehouseId,
                BatchId = request.BatchId,
                CurrentQuantity = qtyAfter,
                ReservedQuantity = 0,
                ReorderLevel = item.MinimumStockAlert
            };
            _context.ItemWarehouseStocks.Add(stockRecord);
        }
        else
        {
            stockRecord.CurrentQuantity = qtyAfter;
        }

        var movement = new StockMovement
        {
            TenantId = tenantId,
            ItemId = request.ItemId,
            WarehouseId = request.WarehouseId,
            BatchId = request.BatchId,
            MovementType = request.MovementType,
            Quantity = request.QuantityChange,
            QuantityBefore = qtyBefore,
            QuantityAfter = qtyAfter,
            UnitCost = request.UnitCost,
            TotalCost = Math.Abs(request.QuantityChange) * request.UnitCost,
            ReferenceDocumentType = "PhysicalAuditAdjustment",
            ReferenceDocumentNumber = request.ReferenceDocumentNumber,
            Notes = request.Notes
        };

        _context.StockMovements.Add(movement);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "RecordStockAdjustment",
            EntityName = "StockMovement",
            EntityId = movement.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { request.ItemId, request.WarehouseId, request.QuantityChange, qtyBefore, qtyAfter }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(movement.Id);
    }

    public async Task<Result<IReadOnlyList<LowStockItemDto>>> GetLowStockAlertsAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var items = await _context.Items
            .Where(i => i.TenantId == tenantId && i.MinimumStockAlert > 0 && !i.IsDeleted)
            .Include(i => i.Category)
            .Include(i => i.PrimaryUom)
            .Include(i => i.WarehouseStocks.Where(ws => !ws.IsDeleted))
            .ToListAsync(cancellationToken);

        var lowStock = items
            .Where(i => i.WarehouseStocks.Sum(ws => ws.CurrentQuantity) <= i.MinimumStockAlert)
            .Select(i => new LowStockItemDto(
                i.Id,
                i.Sku,
                i.Name,
                i.Category?.Name,
                i.PrimaryUom.Code,
                i.WarehouseStocks.Sum(ws => ws.CurrentQuantity),
                i.MinimumStockAlert,
                i.ReorderQuantity
            ))
            .ToList();

        return Result<IReadOnlyList<LowStockItemDto>>.Success(lowStock);
    }

    #endregion

    #region Stock Transfers

    public async Task<Result<PagedResult<StockTransferDto>>> GetStockTransfersAsync(
        int pageNumber,
        int pageSize,
        Guid? sourceWarehouseId = null,
        Guid? destinationWarehouseId = null,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var query = _context.StockTransfers
            .Include(t => t.SourceWarehouse)
            .Include(t => t.DestinationWarehouse)
            .Include(t => t.Items)
            .Where(t => t.TenantId == tenantId && !t.IsDeleted)
            .AsNoTracking();

        if (sourceWarehouseId.HasValue && sourceWarehouseId.Value != Guid.Empty)
            query = query.Where(t => t.SourceWarehouseId == sourceWarehouseId.Value);

        if (destinationWarehouseId.HasValue && destinationWarehouseId.Value != Guid.Empty)
            query = query.Where(t => t.DestinationWarehouseId == destinationWarehouseId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status.ToLower() == status.Trim().ToLower());

        var totalCount = await query.CountAsync(cancellationToken);
        var transfers = await query
            .OrderByDescending(t => t.TransferDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new StockTransferDto(
                t.Id,
                t.TransferNumber,
                t.TransferDate,
                t.SourceWarehouseId,
                t.SourceWarehouse != null ? t.SourceWarehouse.WarehouseName : "Source",
                t.DestinationWarehouseId,
                t.DestinationWarehouse != null ? t.DestinationWarehouse.WarehouseName : "Destination",
                t.Status,
                t.VehicleNumber,
                t.DriverName,
                t.DispatchedDate,
                t.ReceivedDate,
                t.Notes,
                t.CreatedAtUtc,
                t.Items.Select(i => new StockTransferItemDto(
                    i.Id,
                    i.ItemId,
                    i.ItemName,
                    i.ItemSku,
                    i.BatchId,
                    i.BatchNumber,
                    i.TransferQuantity,
                    i.ReceivedQuantity
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Result<PagedResult<StockTransferDto>>.Success(new PagedResult<StockTransferDto>(transfers, totalCount, pageNumber, pageSize));
    }

    public async Task<Result<StockTransferDto>> GetStockTransferByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var t = await _context.StockTransfers
            .Include(x => x.SourceWarehouse)
            .Include(x => x.DestinationWarehouse)
            .Include(x => x.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id && !x.IsDeleted, cancellationToken);

        if (t == null)
            return Result<StockTransferDto>.Failure("Stock transfer record not found.", "NOT_FOUND");

        var dto = new StockTransferDto(
            t.Id,
            t.TransferNumber,
            t.TransferDate,
            t.SourceWarehouseId,
            t.SourceWarehouse != null ? t.SourceWarehouse.WarehouseName : "Source",
            t.DestinationWarehouseId,
            t.DestinationWarehouse != null ? t.DestinationWarehouse.WarehouseName : "Destination",
            t.Status,
            t.VehicleNumber,
            t.DriverName,
            t.DispatchedDate,
            t.ReceivedDate,
            t.Notes,
            t.CreatedAtUtc,
            t.Items.Select(i => new StockTransferItemDto(
                i.Id,
                i.ItemId,
                i.ItemName,
                i.ItemSku,
                i.BatchId,
                i.BatchNumber,
                i.TransferQuantity,
                i.ReceivedQuantity
            )).ToList()
        );

        return Result<StockTransferDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateStockTransferAsync(CreateStockTransferRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        if (request.SourceWarehouseId == request.DestinationWarehouseId)
            return Result<Guid>.Failure("Source and destination warehouses must be different.", "VALIDATION_ERROR");

        if (request.Items == null || request.Items.Count == 0)
            return Result<Guid>.Failure("At least one item must be transferred.", "VALIDATION_ERROR");

        var count = await _context.StockTransfers.CountAsync(t => t.TenantId == tenantId, cancellationToken) + 1;
        var transferNumber = $"TRF-{DateTime.UtcNow:yyMM}-{count:D5}";

        var transfer = new StockTransfer
        {
            TenantId = tenantId,
            TransferNumber = transferNumber,
            TransferDate = DateTimeOffset.UtcNow,
            SourceWarehouseId = request.SourceWarehouseId,
            DestinationWarehouseId = request.DestinationWarehouseId,
            Status = "Dispatched",
            DispatchedDate = DateTimeOffset.UtcNow,
            VehicleNumber = request.VehicleNumber,
            DriverName = request.DriverName,
            Notes = request.Notes
        };

        foreach (var line in request.Items)
        {
            // Validate and deduct stock from source warehouse
            var sourceStock = await _context.ItemWarehouseStocks
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == request.SourceWarehouseId, cancellationToken);

            if (sourceStock == null || sourceStock.CurrentQuantity < line.TransferQuantity)
            {
                return Result<Guid>.Failure($"Insufficient stock in source warehouse for item {line.ItemName}.", "INSUFFICIENT_STOCK");
            }

            sourceStock.CurrentQuantity -= line.TransferQuantity;

            _context.StockMovements.Add(new StockMovement
            {
                TenantId = tenantId,
                ItemId = line.ItemId,
                WarehouseId = request.SourceWarehouseId,
                BatchId = line.BatchId,
                MovementType = StockMovementType.TransferOut,
                Quantity = -line.TransferQuantity,
                QuantityBefore = sourceStock.CurrentQuantity + line.TransferQuantity,
                QuantityAfter = sourceStock.CurrentQuantity,
                ReferenceDocumentType = "StockTransferOutward",
                ReferenceDocumentId = transfer.Id,
                ReferenceDocumentNumber = transferNumber,
                Notes = $"Transfer Outward to Destination: {transferNumber}"
            });

            transfer.Items.Add(new StockTransferItem
            {
                TenantId = tenantId,
                ItemId = line.ItemId,
                ItemName = line.ItemName,
                ItemSku = line.ItemSku,
                BatchId = line.BatchId,
                BatchNumber = line.BatchNumber,
                TransferQuantity = line.TransferQuantity
            });
        }

        _context.StockTransfers.Add(transfer);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateStockTransfer",
            EntityName = "StockTransfer",
            EntityId = transfer.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { transfer.TransferNumber, request.SourceWarehouseId, request.DestinationWarehouseId }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(transfer.Id);
    }

    public async Task<Result> ReceiveStockTransferAsync(Guid id, string? notes = null, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var transfer = await _context.StockTransfers
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == id && !t.IsDeleted, cancellationToken);

        if (transfer == null)
            return Result.Failure("Transfer record not found.", "NOT_FOUND");

        if (transfer.Status == "Received")
            return Result.Failure("Transfer has already been received.", "ALREADY_RECEIVED");

        foreach (var line in transfer.Items)
        {
            line.ReceivedQuantity = line.TransferQuantity;

            // Inward to destination warehouse
            var destStock = await _context.ItemWarehouseStocks
                .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.ItemId == line.ItemId && s.WarehouseId == transfer.DestinationWarehouseId, cancellationToken);

            if (destStock == null)
            {
                destStock = new ItemWarehouseStock
                {
                    TenantId = tenantId,
                    ItemId = line.ItemId,
                    WarehouseId = transfer.DestinationWarehouseId,
                    CurrentQuantity = line.TransferQuantity
                };
                _context.ItemWarehouseStocks.Add(destStock);
            }
            else
            {
                destStock.CurrentQuantity += line.TransferQuantity;
            }

            _context.StockMovements.Add(new StockMovement
            {
                TenantId = tenantId,
                ItemId = line.ItemId,
                WarehouseId = transfer.DestinationWarehouseId,
                BatchId = line.BatchId,
                MovementType = StockMovementType.TransferIn,
                Quantity = line.TransferQuantity,
                QuantityBefore = (destStock?.CurrentQuantity ?? 0) - line.TransferQuantity,
                QuantityAfter = destStock?.CurrentQuantity ?? line.TransferQuantity,
                ReferenceDocumentType = "StockTransferInward",
                ReferenceDocumentId = transfer.Id,
                ReferenceDocumentNumber = transfer.TransferNumber,
                Notes = $"Transfer Inward from Source: {transfer.TransferNumber}"
            });
        }

        transfer.Status = "Received";
        transfer.ReceivedDate = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(notes))
            transfer.Notes = (transfer.Notes + " " + notes).Trim();

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "ReceiveStockTransfer",
            EntityName = "StockTransfer",
            EntityId = transfer.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { transfer.TransferNumber, transfer.Status }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    #endregion
}
