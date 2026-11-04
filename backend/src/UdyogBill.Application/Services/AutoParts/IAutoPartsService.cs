using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Services.AutoParts;

public interface IAutoPartsService
{
    // Vehicles
    Task<Result<IReadOnlyList<VehicleMasterDto>>> SearchVehiclesAsync(string? query, string? vehicleType, CancellationToken cancellationToken = default);
    Task<Result> SeedStandardVehiclesAsync(CancellationToken cancellationToken = default);

    // Product Fitment
    Task<Result<ProductFitmentDto>> SaveProductFitmentAsync(SaveProductFitmentRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ProductFitmentDto>>> GetAllFitmentsAsync(string? query, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ProductFitmentDto>>> GetFitmentsByItemAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<PartCrossReferenceDto>>> SearchItemsByVehicleAsync(string vehicleQuery, Guid? categoryId, CancellationToken cancellationToken = default);
    Task<Result> DeleteFitmentAsync(Guid id, CancellationToken cancellationToken = default);

    // Part Cross Reference
    Task<Result<PartCrossReferenceDto>> SaveCrossReferenceAsync(SaveCrossReferenceRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetAllCrossReferencesAsync(string? query, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetCrossReferencesByOemNumberAsync(string oemNumber, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetCrossReferencesByItemAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result> DeleteCrossReferenceAsync(Guid id, CancellationToken cancellationToken = default);

    // Mechanics & Commission
    Task<Result<IReadOnlyList<MechanicMasterDto>>> GetMechanicsAsync(string? search, CancellationToken cancellationToken = default);
    Task<Result<MechanicMasterDto>> SaveMechanicAsync(SaveMechanicRequest request, CancellationToken cancellationToken = default);
    Task<Result> LogCommissionAsync(LogMechanicCommissionRequest request, CancellationToken cancellationToken = default);
    Task<Result> ProcessMechanicPayoutAsync(MechanicCommissionPayoutRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<MechanicCommissionLogDto>>> GetMechanicLogsAsync(Guid? mechanicId, CancellationToken cancellationToken = default);

    // Battery / Scrap Buyback
    Task<Result<BatteryScrapBuybackDto>> SaveBatteryScrapBuybackAsync(BatteryScrapBuybackRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<BatteryScrapBuybackDto>>> GetAllScrapBuybacksAsync(CancellationToken cancellationToken = default);
    Task<Result<BatteryScrapBuybackDto?>> GetScrapBuybackByInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    Task<Result> DeleteScrapBuybackAsync(Guid id, CancellationToken cancellationToken = default);
}
