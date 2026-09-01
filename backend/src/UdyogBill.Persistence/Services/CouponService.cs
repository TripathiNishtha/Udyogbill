using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class CouponService : ICouponService
{
    private readonly AppDbContext _context;

    public CouponService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Result<IReadOnlyList<PlatformCouponDto>>> GetAllCouponsAsync(CancellationToken cancellationToken = default)
    {
        var coupons = await _context.Coupons
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new PlatformCouponDto(
                c.Id,
                c.Code,
                c.Description,
                c.DiscountType,
                c.DiscountValue,
                c.MinOrderAmount,
                c.MaxDiscountAmount,
                c.ApplicableType,
                c.MaxRedemptions,
                c.TimesRedeemed,
                c.ValidFromUtc,
                c.ValidUntilUtc,
                c.IsActive,
                c.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<PlatformCouponDto>>.Success(coupons);
    }

    public async Task<Result<PlatformCouponDto>> GetCouponByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var c = await _context.Coupons
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (c == null) return Result<PlatformCouponDto>.Failure("Coupon not found.", "NOT_FOUND");

        return Result<PlatformCouponDto>.Success(new PlatformCouponDto(
            c.Id,
            c.Code,
            c.Description,
            c.DiscountType,
            c.DiscountValue,
            c.MinOrderAmount,
            c.MaxDiscountAmount,
            c.ApplicableType,
            c.MaxRedemptions,
            c.TimesRedeemed,
            c.ValidFromUtc,
            c.ValidUntilUtc,
            c.IsActive,
            c.CreatedAtUtc
        ));
    }

    public async Task<Result<Guid>> CreateCouponAsync(CreatePlatformCouponRequest request, CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var exists = await _context.Coupons.AnyAsync(c => c.Code == code && !c.IsDeleted, cancellationToken);
        if (exists)
        {
            return Result<Guid>.Failure($"Coupon with code '{code}' already exists.", "DUPLICATE_CODE");
        }

        var coupon = new Coupon
        {
            Id = Guid.NewGuid(),
            Code = code,
            Description = request.Description.Trim(),
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            MinOrderAmount = request.MinOrderAmount,
            MaxDiscountAmount = request.MaxDiscountAmount,
            ApplicableType = request.ApplicableType,
            MaxRedemptions = request.MaxRedemptions,
            TimesRedeemed = 0,
            ValidFromUtc = request.ValidFromUtc ?? DateTimeOffset.UtcNow,
            ValidUntilUtc = request.ValidUntilUtc,
            IsActive = true,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };

        _context.Coupons.Add(coupon);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(coupon.Id);
    }

    public async Task<Result> UpdateCouponAsync(Guid id, UpdatePlatformCouponRequest request, CancellationToken cancellationToken = default)
    {
        var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);
        if (coupon == null) return Result.Failure("Coupon not found.", "NOT_FOUND");

        coupon.Description = request.Description.Trim();
        coupon.DiscountType = request.DiscountType;
        coupon.DiscountValue = request.DiscountValue;
        coupon.MinOrderAmount = request.MinOrderAmount;
        coupon.MaxDiscountAmount = request.MaxDiscountAmount;
        coupon.ApplicableType = request.ApplicableType;
        coupon.MaxRedemptions = request.MaxRedemptions;
        coupon.ValidFromUtc = request.ValidFromUtc;
        coupon.ValidUntilUtc = request.ValidUntilUtc;
        coupon.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteCouponAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken);
        if (coupon == null) return Result.Failure("Coupon not found.", "NOT_FOUND");

        coupon.IsDeleted = true;
        coupon.DeletedAtUtc = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<ValidatePlatformCouponResponse>> ValidateCouponAsync(ValidatePlatformCouponRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result<ValidatePlatformCouponResponse>.Failure("Please enter a coupon code.", "EMPTY_CODE");
        }

        var code = request.Code.Trim().ToUpperInvariant();
        var coupon = await _context.Coupons
            .FirstOrDefaultAsync(c => c.Code == code && !c.IsDeleted, cancellationToken);

        if (coupon == null)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: "Invalid coupon code."
            ));
        }

        if (!coupon.IsActive)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: "This coupon is currently inactive."
            ));
        }

        var now = DateTimeOffset.UtcNow;
        if (coupon.ValidFromUtc.HasValue && now < coupon.ValidFromUtc.Value)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: "This coupon has not started yet."
            ));
        }

        if (coupon.ValidUntilUtc.HasValue && now > coupon.ValidUntilUtc.Value)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: "This coupon has expired."
            ));
        }

        if (coupon.MaxRedemptions.HasValue && coupon.TimesRedeemed >= coupon.MaxRedemptions.Value)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: "This coupon has reached its maximum redemption limit."
            ));
        }

        if (coupon.MinOrderAmount.HasValue && request.OrderAmount < coupon.MinOrderAmount.Value)
        {
            return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
                IsValid: false,
                DiscountAmount: 0,
                FinalAmount: request.OrderAmount,
                Message: $"Minimum order amount of ₹{coupon.MinOrderAmount.Value:F0} required for this coupon."
            ));
        }

        // Calculate discount
        decimal discount = 0;
        if (coupon.DiscountType == DiscountType.Percentage)
        {
            discount = Math.Round((request.OrderAmount * coupon.DiscountValue) / 100m, 2);
            if (coupon.MaxDiscountAmount.HasValue && discount > coupon.MaxDiscountAmount.Value)
            {
                discount = coupon.MaxDiscountAmount.Value;
            }
        }
        else // FixedAmount
        {
            discount = Math.Min(coupon.DiscountValue, request.OrderAmount);
        }

        decimal finalAmount = Math.Max(0, request.OrderAmount - discount);
        string successMessage = coupon.DiscountType == DiscountType.Percentage
            ? $"{coupon.DiscountValue:G29}% Discount Applied! Saved ₹{discount:F2}"
            : $"₹{discount:F2} Flat Discount Applied!";

        return Result<ValidatePlatformCouponResponse>.Success(new ValidatePlatformCouponResponse(
            IsValid: true,
            DiscountAmount: discount,
            FinalAmount: finalAmount,
            Message: successMessage,
            CouponCode: coupon.Code
        ));
    }
}
