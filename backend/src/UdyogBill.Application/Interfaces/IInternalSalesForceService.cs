using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.SalesForce;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IInternalSalesForceService
{
    // 1. Sales Rep Management & Hierarchy
    Task<Result<IReadOnlyList<InternalSalesRepDto>>> GetSalesRepsAsync(string? city = null, SalesRoleTier? tier = null, bool activeOnly = true, CancellationToken ct = default);
    Task<Result<InternalSalesRepDto>> GetSalesRepByIdAsync(Guid id, CancellationToken ct = default);
    Task<Result<InternalSalesRepDto>> CreateSalesRepAsync(CreateSalesRepRequest req, CancellationToken ct = default);
    Task<Result<InternalSalesRepDto>> UpdateSalesRepAsync(Guid id, UpdateSalesRepRequest req, CancellationToken ct = default);
    Task<Result<bool>> UpdateRepMonthlyTargetAsync(Guid repId, decimal newTarget, CancellationToken ct = default);
    Task<Result<object>> GetHierarchyTreeAsync(int month, int year, CancellationToken ct = default);

    // 2. Hardware Device Binding & Zero-Trust Verification
    Task<Result<HardwareDeviceDto>> RegisterDeviceAsync(RegisterDeviceRequest req, string ipAddress, CancellationToken ct = default);
    Task<Result<IReadOnlyList<HardwareDeviceDto>>> GetPendingDevicesAsync(CancellationToken ct = default);
    Task<Result<HardwareDeviceDto>> ApproveDeviceAsync(Guid deviceId, ApproveDeviceRequest req, Guid superAdminUserId, CancellationToken ct = default);
    Task<Result<bool>> RevokeDeviceAsync(Guid deviceId, Guid superAdminUserId, CancellationToken ct = default);
    Task<Result<bool>> ValidateDeviceAccessAsync(string deviceFingerprint, Guid userId, CancellationToken ct = default);
    Task<Result<RepLoginResponseDto>> LoginRepAsync(RepLoginRequest req, CancellationToken ct = default);

    // 3. Product Catalog
    Task<Result<IReadOnlyList<CompanyProductCatalogDto>>> GetProductCatalogAsync(bool activeOnly = true, CancellationToken ct = default);
    Task<Result<CompanyProductCatalogDto>> CreateProductAsync(CreateCompanyProductRequest req, CancellationToken ct = default);
    Task<Result<CompanyProductCatalogDto>> UpdateProductAsync(Guid id, UpdateCompanyProductRequest req, CancellationToken ct = default);
    Task<Result<bool>> DeleteProductAsync(Guid id, CancellationToken ct = default);

    // 4. Quotas & Rep Cockpit
    Task<Result<IReadOnlyList<SalesQuotaDto>>> GetQuotasAsync(int month, int year, string? city = null, CancellationToken ct = default);
    Task<Result<SalesQuotaDto>> AllocateQuotaAsync(AllocateQuotaRequest req, CancellationToken ct = default);
    Task<Result<RepCockpitSummaryDto>> GetRepCockpitAsync(Guid repUserId, CancellationToken ct = default);

    // 5. Field Shop Visits
    Task<Result<FieldShopVisitDto>> PunchVisitAsync(Guid repUserId, PunchVisitRequest req, CancellationToken ct = default);
    Task<Result<PagedResult<FieldShopVisitDto>>> GetVisitsAsync(Guid? repId = null, string? city = null, DateTime? fromDate = null, DateTime? toDate = null, int pageNumber = 1, int pageSize = 50, CancellationToken ct = default);

    // 6. Attribution & Dispute Resolver
    Task<Result<SubscriptionAttributionLogDto>> AssignSubscriptionToRepAsync(Guid subscriptionId, Guid tenantId, AssignSubscriptionToRepRequest req, Guid superAdminUserId, CancellationToken ct = default);
    Task<Result<PagedResult<SubscriptionAttributionLogDto>>> GetAttributionAuditLogsAsync(int pageNumber = 1, int pageSize = 50, CancellationToken ct = default);

    // 7. Review Export
    Task<Result<byte[]>> ExportWeeklyReviewExcelCsvAsync(string? city, int month, int year, CancellationToken ct = default);
}
