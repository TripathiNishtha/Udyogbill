using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IOnboardingService
{
    Task<Result<GstinLookupResponse>> LookupGstinAsync(GstinLookupRequest request, CancellationToken cancellationToken = default);
    Task<Result<SeedIndustryCatalogResult>> SeedIndustryCatalogAsync(SeedIndustryCatalogRequest request, CancellationToken cancellationToken = default);
    Task<Result<OnboardingStatusDto>> GetOnboardingStatusAsync(CancellationToken cancellationToken = default);
    Task<Result> CompleteOnboardingAsync(CompleteOnboardingRequest request, CancellationToken cancellationToken = default);
}
