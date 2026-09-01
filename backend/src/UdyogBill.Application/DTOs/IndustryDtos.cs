using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

// --- Pharma Vertical DTOs ---
public record ExpiryAlertBatchDto(
    Guid BatchId,
    string BatchNumber,
    Guid ItemId,
    string ItemSku,
    string ItemName,
    string? CategoryName,
    DateTime ExpiryDate,
    int DaysUntilExpiry,
    bool IsExpired,
    decimal CurrentStock,
    string UomName,
    decimal MRP,
    decimal TotalValueAtRisk,
    string WarehouseName
);

public record ScheduleH1RegisterRowDto(
    Guid InvoiceId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    string PatientName,
    string? PatientPhone,
    string? DoctorName,
    string? DoctorRegistrationNumber,
    string DrugName,
    string BatchNumber,
    decimal Quantity,
    string UomName
);

// --- Apparel Matrix DTOs ---
public record GenerateMatrixVariantsRequest(
    Guid BaseItemId,
    List<string> Sizes,
    List<string> Colors,
    List<string>? Fits = null,
    decimal BasePriceAdjustment = 0
);

public record GeneratedVariantDto(
    Guid VariantId,
    Guid ItemId,
    string VariantSku,
    string VariantName,
    string Size,
    string Color,
    string? Fit,
    decimal PriceAdjustment,
    string Barcode
);

// --- Manufacturing & Recipe BOM DTOs ---
public record BomIngredientInput(
    Guid RawMaterialItemId,
    decimal QuantityRequired,
    Guid UomId
);

public record CreateRecipeBomRequest(
    Guid FinishedGoodsItemId,
    string RecipeName,
    string? Description,
    decimal OutputYieldQuantity,
    Guid OutputUomId,
    List<BomIngredientInput> Ingredients
);

public record RecipeBomDto(
    Guid Id,
    Guid FinishedGoodsItemId,
    string FinishedGoodsName,
    string FinishedGoodsSku,
    string RecipeName,
    string? Description,
    decimal OutputYieldQuantity,
    string OutputUomName,
    List<RecipeIngredientDto> Ingredients,
    DateTimeOffset CreatedAtUtc
);

public record RecipeIngredientDto(
    Guid RawMaterialItemId,
    string RawMaterialName,
    string RawMaterialSku,
    decimal QuantityRequired,
    string UomName,
    decimal EstimatedUnitCost,
    decimal EstimatedTotalCost
);

public record ExecuteProductionRunRequest(
    Guid RecipeBomId,
    Guid TargetWarehouseId,
    decimal BatchesToProduce, // Number of output units to produce
    string BatchNumber,
    DateTime? ExpiryDate = null,
    string? Notes = null
);

public record ProductionRunResultDto(
    Guid FinishedGoodsItemId,
    string FinishedGoodsName,
    decimal QuantityProduced,
    string BatchNumber,
    decimal TotalCostOfProduction,
    List<DeductedIngredientDto> DeductedIngredients
);

public record DeductedIngredientDto(
    Guid ItemId,
    string ItemName,
    decimal QuantityDeducted,
    string UomName,
    decimal StockRemaining
);

// --- Electronics Serial Lifecycle DTOs ---
public record SerialLifecycleDto(
    string SerialNumber,
    Guid ItemId,
    string ItemName,
    string ItemSku,
    string CurrentStatus,
    string CurrentWarehouseName,
    string? BatchNumber,
    DateTime? WarrantyExpiresAt,
    bool IsWarrantyActive,
    List<SerialMovementDto> MovementHistory
);

public record SerialMovementDto(
    DateTimeOffset TimestampUtc,
    string MovementType,
    string? DocumentNumber,
    string? Notes
);
