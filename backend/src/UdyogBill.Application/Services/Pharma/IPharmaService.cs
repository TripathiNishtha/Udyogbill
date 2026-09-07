using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Services.Pharma;

public interface IPharmaService
{
    // Batch & FEFO Routing
    Task<Result<IReadOnlyList<PharmaBatchDto>>> GetItemBatchesAsync(Guid? itemId, bool includeExpired, CancellationToken cancellationToken = default);
    Task<Result<PharmaBatchDto>> SaveBatchAsync(SavePharmaBatchRequest request, CancellationToken cancellationToken = default);
    Task<Result<PharmaDashboardSummaryDto>> GetPharmaDashboardMetricsAsync(CancellationToken cancellationToken = default);

    // Generic Salt Formulations & Substitute Finder
    Task<Result<IReadOnlyList<SaltMasterDto>>> GetSaltsAsync(string? search, CancellationToken cancellationToken = default);
    Task<Result<SaltMasterDto>> SaveSaltAsync(SaveSaltMasterRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ItemSubstituteDto>>> FindSaltSubstitutesAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result> LinkItemSaltCompositionAsync(LinkItemSaltRequest request, CancellationToken cancellationToken = default);

    // Schedule H1 Regulatory Register
    Task<Result<IReadOnlyList<ScheduleH1RegisterDto>>> GetScheduleH1RegisterAsync(DateTime? fromDate, DateTime? toDate, CancellationToken cancellationToken = default);
    Task<Result> RecordScheduleH1EntryAsync(RecordScheduleH1EntryRequest request, CancellationToken cancellationToken = default);

    // Expiry Radar & Return Claims to Suppliers
    Task<Result<IReadOnlyList<ExpiryRadarItemDto>>> GetExpiryRadarAsync(int daysThreshold = 90, Guid? supplierId = null, CancellationToken cancellationToken = default);
    Task<Result<ExpiryReturnClaimDto>> CreateExpiryReturnClaimAsync(CreateExpiryReturnClaimRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<ExpiryReturnClaimDto>>> GetExpiryReturnClaimsAsync(CancellationToken cancellationToken = default);

    // Doctor Prescribers & MR Network
    Task<Result<IReadOnlyList<DoctorPrescriberDto>>> GetDoctorPrescribersAsync(string? search, CancellationToken cancellationToken = default);
    Task<Result<DoctorPrescriberDto>> SaveDoctorPrescriberAsync(SaveDoctorPrescriberRequest request, CancellationToken cancellationToken = default);

    // Patient Rapid Repeat Prescription History
    Task<Result<PatientPrescriptionHistoryDto>> GetPatientPrescriptionHistoryAsync(string mobileNumber, CancellationToken cancellationToken = default);
}
