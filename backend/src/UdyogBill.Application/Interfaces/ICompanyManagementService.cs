using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ICompanyManagementService
{
    Task<Result<IReadOnlyList<UserCompanySummaryDto>>> GetUserCompaniesAsync(Guid userId, Guid currentTenantId, CancellationToken cancellationToken = default);
    Task<Result<CompanyQuotaDto>> GetCompanyQuotaAsync(Guid currentTenantId, Guid userId, CancellationToken cancellationToken = default);
    Task<Result<UserCompanySummaryDto>> CreateCompanyAsync(CreateCompanyRequest request, Guid userId, Guid currentTenantId, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<SwitchCompanyResponse>> SwitchCompanyAsync(Guid targetTenantId, Guid userId, string? ipAddress = null, CancellationToken cancellationToken = default);
}
