using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record ItemVariantUpdateDto(
    Guid? VariantId = null,
    string? VariantSku = null,
    decimal Rate = 0,
    decimal? PurchasePrice = null,
    decimal? WholesalePrice = null,
    decimal? MRP = null,
    string? Barcode = null,
    string? Size = null,
    string? Color = null,
    string? VariantName = null,
    decimal? OpeningStock = null
);

public record UpdateItemVariantsRequest(
    List<ItemVariantUpdateDto> Variants
);

public record BulkPriceUpdateItemDto(
    Guid ItemId,
    Guid? VariantId = null,
    string? Sku = null,
    decimal? PurchasePrice = null,
    decimal? WholesalePrice = null,
    decimal? SellingPrice = null,
    decimal? MRP = null
);

public record BulkPriceUpdateRequest(
    List<BulkPriceUpdateItemDto> Items
);

public record BulkPriceUpdateResultDto(
    int UpdatedItemsCount,
    int UpdatedVariantsCount,
    string Message
);

public record PriceListRowDto(
    Guid ItemId,
    Guid? VariantId,
    string Sku,
    string ItemName,
    string? CategoryName,
    string? BrandName,
    string? PrimaryUomCode,
    bool IsVariant,
    string? SizeOrPack,
    string? ColorOrShade,
    string? Barcode,
    decimal PurchasePrice,
    decimal WholesalePrice,
    decimal SellingPrice,
    decimal MRP,
    decimal CurrentStock,
    decimal TaxRate
);
