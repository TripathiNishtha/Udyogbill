using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Moq;
using UdyogBill.Api.Configuration;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class ProductionConfigurationSecurityTests
{
    private readonly Mock<IWebHostEnvironment> _prodEnvMock;
    private readonly Mock<IWebHostEnvironment> _devEnvMock;

    public ProductionConfigurationSecurityTests()
    {
        _prodEnvMock = new Mock<IWebHostEnvironment>();
        _prodEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        _devEnvMock = new Mock<IWebHostEnvironment>();
        _devEnvMock.Setup(e => e.EnvironmentName).Returns(Environments.Development);
    }

    [Fact]
    public void Startup_WhenInDevelopment_ShouldAllowDevDefaults()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=udyogbill_dev;Username=postgres;Password=localdev",
                ["Jwt:SecretKey"] = "DEVELOPMENT_ONLY_KEY_OVERRIDE_IN_PRODUCTION_ENV_MIN_256_BITS!",
                ["Gemini:ApiKey"] = "DEVELOPMENT_GEMINI_API_KEY"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _devEnvMock.Object);

        act.Should().NotThrow();
    }

    [Fact]
    public void Startup_WhenConnectionStringMissingInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'ConnectionStrings:DefaultConnection'*missing in Production*");
    }

    [Fact]
    public void Startup_WhenLocalhostConnectionStringInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=prod;Username=postgres;Password=secret",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*cannot point to localhost or use default development credentials*");
    }

    [Fact]
    public void Startup_WhenCompromisedConnectionStringInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=ep-withered-shadow-a51u5sfj.us-east-2.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=npg_0KkHxDzVO4el;SSL Mode=Require",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*contains a known compromised credential*");
    }

    [Fact]
    public void Startup_WhenJwtSecretMissingInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'Jwt:SecretKey'*missing in Production*");
    }

    [Fact]
    public void Startup_WhenJwtSecretTooShortInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "short_key_123"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*must be at least 256 bits*");
    }

    [Fact]
    public void Startup_WhenInsecureOrDevJwtKeyInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "DEVELOPMENT_ONLY_KEY_OVERRIDE_IN_PRODUCTION_ENV_MIN_256_BITS!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*using a known development default or insecure secret key*");
    }

    [Fact]
    public void Startup_WhenCompromisedGeminiKeyInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Gemini:ApiKey"] = "DEVELOPMENT_GEMINI_API_KEY"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'Gemini:ApiKey' contains a placeholder or compromised API key*");
    }

    [Fact]
    public void Startup_WhenJwtExpiryExceeds24HoursInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Jwt:ExpiryMinutes"] = "43200"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'Jwt:ExpiryMinutes' in Production cannot exceed 24 hours*");
    }

    [Fact]
    public void Startup_WhenJwtExpiryIs12HoursInProduction_ShouldSucceed()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Jwt:ExpiryMinutes"] = "720",
                ["Cors:AllowedOrigins:0"] = "https://app.udyogbill.com"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().NotThrow();
    }

    [Fact]
    public void Startup_WhenIncludeErrorDetailInProduction_ShouldThrowConfigurationException()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!;Include Error Detail=true",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*cannot contain 'Include Error Detail=true'*");
    }

    [Fact]
    public void Startup_WhenValidSecretsProvidedInProduction_ShouldSucceed()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Gemini:ApiKey"] = "AIzaSyDValidKeyForProduction1234567890",
                ["Cors:AllowedOrigins:0"] = "https://app.udyogbill.com",
                ["Cors:AllowedOrigins:1"] = "https://admin.udyogbill.com"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("http://192.168.29.127:3000")]
    [InlineData("http://192.168.1.100:8080")]
    [InlineData("http://10.0.0.5:3000")]
    [InlineData("http://localhost:3000")]
    public void CorsPolicy_WhenOriginIsHttpLan_ShouldRejectInProduction(string lanOrigin)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Cors:AllowedOrigins:0"] = lanOrigin
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'Cors:AllowedOrigins' in Production cannot contain*");
    }

    [Fact]
    public void CorsPolicy_WhenOriginIsWildcard_ShouldRejectInProduction()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Cors:AllowedOrigins:0"] = "*"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*'Cors:AllowedOrigins' in Production cannot contain wildcard*");
    }

    [Fact]
    public void CorsPolicy_WhenOriginIsHttpsVerifiedDomains_ShouldSucceedInProduction()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db.prod.aws.internal;Port=5432;Database=udyogbill_prod;Username=app;Password=SuperSecurePassword123!",
                ["Jwt:SecretKey"] = "A_Very_Strong_And_Cryptographically_Secure_Production_Key_2026_Minimum_256_Bits!",
                ["Cors:AllowedOrigins:0"] = "https://app.udyogbill.com",
                ["Cors:AllowedOrigins:1"] = "https://admin.udyogbill.com"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _prodEnvMock.Object);

        act.Should().NotThrow();
    }

    [Fact]
    public void CorsPolicy_WhenInDevelopment_ShouldAllowLocalOrigins()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=udyogbill_dev;Username=postgres;Password=localdev",
                ["Jwt:SecretKey"] = "DEVELOPMENT_ONLY_KEY_OVERRIDE_IN_PRODUCTION_ENV_MIN_256_BITS!",
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000",
                ["Cors:AllowedOrigins:1"] = "http://192.168.29.127:3000"
            })
            .Build();

        var act = () => ProductionSecurityConfigurationValidator.ValidateProductionConfiguration(config, _devEnvMock.Object);

        act.Should().NotThrow();
    }
}
