using FluentAssertions;
using NetArchTest.Rules;
using Xunit;

namespace UdyogBill.ArchitectureTests;

public class CleanArchitectureTests
{
    private const string DomainNamespace = "UdyogBill.Domain";
    private const string ApplicationNamespace = "UdyogBill.Application";
    private const string InfrastructureNamespace = "UdyogBill.Infrastructure";
    private const string PersistenceNamespace = "UdyogBill.Persistence";
    private const string ApiNamespace = "UdyogBill.Api";

    [Fact]
    public void Domain_ShouldNotHaveDependencyOnOtherProjects()
    {
        // Domain should not depend on Application, Infrastructure, Persistence, or Api
        var result = Types.InAssembly(typeof(Domain.Common.BaseEntity).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(ApplicationNamespace, InfrastructureNamespace, PersistenceNamespace, ApiNamespace)
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Application_ShouldNotHaveDependencyOnInfrastructureOrPersistenceOrApi()
    {
        // Application should depend only on Domain & Shared
        var result = Types.InAssembly(typeof(Application.Interfaces.ITenantContext).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(InfrastructureNamespace, PersistenceNamespace, ApiNamespace)
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }
}
