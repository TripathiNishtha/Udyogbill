using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Loyalty;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Loyalty;

public class LoyaltyAndPromotionsTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupContext()
    {
        var tenantId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-TEST-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "cashier@testretail.com"
        };

        var context = new AppDbContext(options, tenantContext);

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task GetLoyaltyConfig_ShouldReturnOrSeedDefault()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LoyaltyAndPromotionsService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetLoyaltyConfigAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(100m, result.Data!.PointsEarnSpendAmount);
        Assert.Equal(1m, result.Data.PointRedemptionValue);
        Assert.True(result.Data.IsActive);
    }

    [Fact]
    public async Task AddStoreCredit_ShouldUpdateBalanceAndRecordTransaction()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LoyaltyAndPromotionsService(context, tenantContext, userContext, auditService);

        var customer = new Party
        {
            TenantId = tenantId,
            Code = "CUST-901",
            LegalName = "Rahul Sharma",
            PartyType = PartyType.Customer
        };
        context.Parties.Add(customer);
        await context.SaveChangesAsync();

        // Act
        var result = await service.AddStoreCreditAsync(customer.Id, new AddStoreCreditRequest(1500m, "Deposit advance wallet"));

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(1500m, result.Data!.StoreCreditBalance);

        var account = await context.CustomerLoyaltyAccounts.FirstAsync(a => a.PartyId == customer.Id);
        Assert.Equal(1500m, account.StoreCreditBalance);

        var tx = await context.LoyaltyTransactions.Where(t => t.PartyId == customer.Id && t.TransactionType == LoyaltyTransactionType.StoreCreditAdded).FirstOrDefaultAsync();
        Assert.NotNull(tx);
        Assert.Equal(1500m, tx.StoreCreditChange);
    }

    [Fact]
    public async Task CalculateAndRedeemAtCheckout_ShouldApplyCapAndDeductBalances()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LoyaltyAndPromotionsService(context, tenantContext, userContext, auditService);

        var customer = new Party
        {
            TenantId = tenantId,
            Code = "CUST-902",
            LegalName = "Priya Patel",
            PartyType = PartyType.Customer
        };
        context.Parties.Add(customer);
        await context.SaveChangesAsync();

        // Setup Account with 200 points (₹200 value) & ₹300 Store Credit
        await service.GetCustomerLoyaltyAccountAsync(customer.Id);
        var account = await context.CustomerLoyaltyAccounts.FirstAsync(a => a.PartyId == customer.Id);
        account.AvailablePoints = 200m;
        account.StoreCreditBalance = 300m;
        await context.SaveChangesAsync();

        // Order Total: ₹1,000. Config max redeem % = 50% (Max ₹500 from points).
        var redeemReq = new RedeemLoyaltyAtCheckoutRequest(
            OrderTotalAmount: 1000m,
            PointsToRedeem: 200m,
            StoreCreditToRedeem: 300m
        );

        // Act
        var result = await service.CalculateAndRedeemAtCheckoutAsync(customer.Id, redeemReq);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(200m, result.Data!.PointsRedeemed);
        Assert.Equal(200m, result.Data.PointsDiscountAmount);
        Assert.Equal(300m, result.Data.StoreCreditRedeemed);
        Assert.Equal(500m, result.Data.TotalDiscountApplied); // 200 + 300 = 500
        Assert.Equal(500m, result.Data.NetPayableAmount);      // 1000 - 500 = 500
        Assert.Equal(0m, result.Data.RemainingPoints);
        Assert.Equal(0m, result.Data.RemainingStoreCredit);
    }

    [Fact]
    public async Task ValidateAndApplyCoupon_ShouldCalculatePercentageAndCap()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LoyaltyAndPromotionsService(context, tenantContext, userContext, auditService);

        // Coupon: 20% off above ₹1000 with Max ₹300 cap
        var couponReq = new CreateCouponRequest(
            Code: "FESTIVE20",
            Description: "20% off festive sale",
            DiscountType: CouponDiscountType.Percentage,
            DiscountValue: 20m,
            MinimumOrderAmount: 1000m,
            MaximumDiscountAmount: 300m
        );

        await service.CreateCouponAsync(couponReq);

        // 1. Order ₹2,000 -> 20% of 2000 = ₹400, but capped at ₹300
        var valResult = await service.ValidateAndApplyCouponAsync(new ValidateCouponRequest("FESTIVE20", 2000m));
        Assert.True(valResult.IsSuccess);
        Assert.True(valResult.Data!.IsValid);
        Assert.Equal(300m, valResult.Data.DiscountAmount);
        Assert.Equal(1700m, valResult.Data.FinalCartAmount);

        // 2. Order ₹500 -> Less than minimum order ₹1000
        var invalidResult = await service.ValidateAndApplyCouponAsync(new ValidateCouponRequest("FESTIVE20", 500m));
        Assert.True(invalidResult.IsSuccess);
        Assert.False(invalidResult.Data!.IsValid);
        Assert.Contains("Minimum order amount", invalidResult.Data.ErrorMessage);
    }
}
