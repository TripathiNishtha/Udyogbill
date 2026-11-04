using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using UdyogBill.Infrastructure;
using UdyogBill.Shared.Constants;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class AuthorizationPolicyTests
{
    private readonly IAuthorizationService _authService;

    public AuthorizationPolicyTests()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        var mockConfig = new Mock<IConfiguration>();
        services.AddInfrastructure(mockConfig.Object);

        var sp = services.BuildServiceProvider();
        _authService = sp.GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal CreatePrincipal(string role, params (string Type, string Value)[] claims)
    {
        var claimList = new List<Claim> { new(ClaimTypes.Role, role) };
        foreach (var c in claims)
        {
            claimList.Add(new Claim(c.Type, c.Value));
        }
        var identity = new ClaimsIdentity(claimList, "TestAuth");
        return new ClaimsPrincipal(identity);
    }

    [Theory]
    [InlineData(Roles.SuperAdmin, true)]
    [InlineData(Roles.TenantAdmin, true)]
    [InlineData(Roles.TenantManager, true)]
    [InlineData(Roles.TenantStaff, true)]
    [InlineData(Roles.TenantCashier, true)]
    [InlineData("Sales", true)]
    [InlineData("Billing", true)]
    [InlineData("RandomVisitor", false)]
    public async Task CanCreateInvoice_EvaluatesCorrectlyForRoles(string role, bool expectedSuccess)
    {
        var user = CreatePrincipal(role);
        var result = await _authService.AuthorizeAsync(user, null, "CanCreateInvoice");
        result.Succeeded.Should().Be(expectedSuccess);
    }

    [Theory]
    [InlineData(Roles.SuperAdmin, true)]
    [InlineData(Roles.TenantAdmin, true)]
    [InlineData(Roles.TenantManager, true)]
    [InlineData(Roles.TenantStaff, true)]
    [InlineData("WarehouseManager", true)]
    [InlineData("Sales", true)]
    [InlineData("RandomVisitor", false)]
    public async Task CanViewInventory_EvaluatesCorrectlyForRoles(string role, bool expectedSuccess)
    {
        var user = CreatePrincipal(role);
        var result = await _authService.AuthorizeAsync(user, null, "CanViewInventory");
        result.Succeeded.Should().Be(expectedSuccess);
    }

    [Theory]
    [InlineData(Roles.SuperAdmin, true)]
    [InlineData(Roles.TenantAdmin, true)]
    [InlineData(Roles.TenantManager, true)]
    [InlineData(Roles.TenantStaff, false)]
    [InlineData("RandomVisitor", false)]
    public async Task CanManageUsers_EvaluatesCorrectlyForRoles(string role, bool expectedSuccess)
    {
        var user = CreatePrincipal(role);
        var result = await _authService.AuthorizeAsync(user, null, "CanManageUsers");
        result.Succeeded.Should().Be(expectedSuccess);
    }

    [Theory]
    [InlineData(Roles.SuperAdmin, true)]
    [InlineData(Roles.TenantAdmin, true)]
    [InlineData(Roles.TenantManager, true)]
    [InlineData(Roles.TenantAccountant, true)]
    [InlineData("Accountant", true)]
    [InlineData(Roles.TenantStaff, false)]
    public async Task CanManageBankingAndExpense_EvaluatesCorrectlyForRoles(string role, bool expectedSuccess)
    {
        var user = CreatePrincipal(role);
        var result = await _authService.AuthorizeAsync(user, null, "CanManageBankingAndExpense");
        result.Succeeded.Should().Be(expectedSuccess);
    }

    [Fact]
    public async Task CanCreateInvoice_SucceedsForUserWithPermissionClaim()
    {
        var user = CreatePrincipal("GuestUser", (Claims.Permission, Permissions.SalesCreate));
        var result = await _authService.AuthorizeAsync(user, null, "CanCreateInvoice");
        result.Succeeded.Should().BeTrue();
    }
}

