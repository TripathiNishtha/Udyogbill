using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(LoginRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<LoginResponse>> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> RegisterTenantAsync(RegisterTenantRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> RevokeTokenAsync(string refreshToken, string? ipAddress = null, CancellationToken cancellationToken = default);
}

public interface ITenantService
{
    Task<Result<TenantDetailsDto>> GetCurrentTenantDetailsAsync(CancellationToken cancellationToken = default);
    Task<Result<TenantDetailsDto>> GetTenantByIdAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<TenantDto>>> GetTenantsAsync(int pageNumber, int pageSize, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task<Result<TenantIndustryConfigDto>> GetIndustryConfigAsync(Guid? tenantId = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateIndustryConfigAsync(Guid tenantId, TenantIndustryConfigDto configDto, CancellationToken cancellationToken = default);
}

public interface IIndustryService
{
    Task<Result<IReadOnlyList<IndustryDto>>> GetAllIndustriesAsync(CancellationToken cancellationToken = default);
    Task<Result<IndustryDto>> GetIndustryByIdAsync(Guid industryId, CancellationToken cancellationToken = default);
    Task<Result<IndustryDto>> GetIndustryByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<Result<IndustryCapabilityMatrixDto>> GetCapabilityMatrixAsync(Guid industryId, CancellationToken cancellationToken = default);
}

public interface IPlanService
{
    Task<Result<IReadOnlyList<PlanDto>>> GetActivePlansAsync(CancellationToken cancellationToken = default);
    Task<Result<PlanDto>> GetPlanByIdAsync(Guid planId, CancellationToken cancellationToken = default);
    Task<Result<TenantSubscriptionSummaryDto>> GetActiveSubscriptionAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
