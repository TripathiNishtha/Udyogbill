using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ICouponService
{
    Task<Result<IReadOnlyList<PlatformCouponDto>>> GetAllCouponsAsync(CancellationToken cancellationToken = default);
    Task<Result<PlatformCouponDto>> GetCouponByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateCouponAsync(CreatePlatformCouponRequest request, CancellationToken cancellationToken = default);
    Task<Result> UpdateCouponAsync(Guid id, UpdatePlatformCouponRequest request, CancellationToken cancellationToken = default);
    Task<Result> DeleteCouponAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<ValidatePlatformCouponResponse>> ValidateCouponAsync(ValidatePlatformCouponRequest request, CancellationToken cancellationToken = default);
}
