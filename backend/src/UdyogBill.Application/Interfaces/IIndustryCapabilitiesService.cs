using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IIndustryCapabilitiesService
{
    // Pharma Vertical
    Task<Result<IReadOnlyList<ExpiryAlertBatchDto>>> GetPharmaExpiryAlertsAsync(int daysThreshold = 90, Guid? warehouseId = null, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ScheduleH1RegisterRowDto>>> GetScheduleH1RegisterAsync(DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default);

    // Apparel & Garments Matrix
    Task<Result<IReadOnlyList<GeneratedVariantDto>>> GenerateMatrixVariantsAsync(GenerateMatrixVariantsRequest request, CancellationToken cancellationToken = default);

    // Manufacturing & Recipe BOM
    Task<Result<Guid>> CreateRecipeBomAsync(CreateRecipeBomRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<RecipeBomDto>>> GetRecipeBomsAsync(CancellationToken cancellationToken = default);
    Task<Result<RecipeBomDto>> GetRecipeBomByIdAsync(Guid bomId, CancellationToken cancellationToken = default);
    Task<Result<ProductionRunResultDto>> ExecuteProductionRunAsync(ExecuteProductionRunRequest request, CancellationToken cancellationToken = default);

    // Electronics Serial Lifecycle
    Task<Result<SerialLifecycleDto>> GetSerialLifecycleAsync(string serialNumber, CancellationToken cancellationToken = default);
}
