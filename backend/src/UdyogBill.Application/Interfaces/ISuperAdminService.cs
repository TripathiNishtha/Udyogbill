using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Enums;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISuperAdminService
{
    // Tenant Management
    Task<Result<PagedResult<TenantDto>>> GetTenantsAsync(int pageNumber, int pageSize, TenantStatus? status = null, Guid? industryId = null, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task<Result<SuperAdminTenantDetailsDto>> GetTenantDetailsAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result> UpdateTenantStatusAsync(Guid tenantId, UpdateTenantStatusRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateTenantSubscriptionAsync(Guid tenantId, UpdateTenantSubscriptionRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<ImpersonateTenantResponse>> ImpersonateTenantAsync(Guid tenantId, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> AssignPackageAndAddOnsAsync(Guid tenantId, AssignPackageAndAddOnsRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> ExtendTenantTrialAsync(Guid tenantId, ExtendTenantTrialRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Dynamic Industry Catalog Management
    Task<Result<Guid>> CreateIndustryAsync(CreateIndustryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateIndustryAsync(Guid industryId, UpdateIndustryRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteIndustryAsync(Guid industryId, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> AttachFeatureToIndustryAsync(Guid industryId, AttachFeatureToIndustryRequest request, CancellationToken cancellationToken = default);
    Task<Result> DetachFeatureFromIndustryAsync(Guid industryId, Guid featureId, CancellationToken cancellationToken = default);

    // Plan & Entitlement Management
    Task<Result<Guid>> CreatePlanAsync(CreatePlanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdatePlanAsync(Guid planId, UpdatePlanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeletePlanAsync(Guid planId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Platform Telemetry & Audit Logs
    Task<Result<PlatformStatsDto>> GetPlatformStatsAsync(CancellationToken cancellationToken = default);
    Task<Result<PagedResult<AuditLogDto>>> GetAuditLogsAsync(AuditLogQueryRequest request, CancellationToken cancellationToken = default);
}
