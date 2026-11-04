using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using FluentAssertions;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class OpenApiSecurityTests
{
    [Fact]
    public void NugetDependencies_ShouldNotContainDeprecatedSwashbuckle()
    {
        var dir = AppContext.BaseDirectory;
        string? apiCsprojPath = null;
        while (!string.IsNullOrEmpty(dir))
        {
            var candidate1 = Path.Combine(dir, "src", "UdyogBill.Api", "UdyogBill.Api.csproj");
            if (File.Exists(candidate1))
            {
                apiCsprojPath = candidate1;
                break;
            }
            var candidate2 = Path.Combine(dir, "backend", "src", "UdyogBill.Api", "UdyogBill.Api.csproj");
            if (File.Exists(candidate2))
            {
                apiCsprojPath = candidate2;
                break;
            }
            var parent = Directory.GetParent(dir);
            if (parent == null) break;
            dir = parent.FullName;
        }

        apiCsprojPath.Should().NotBeNull("Expected UdyogBill.Api.csproj to be found in solution hierarchy");
        File.Exists(apiCsprojPath).Should().BeTrue();

        var csprojContent = File.ReadAllText(apiCsprojPath!);

        // Assert Swashbuckle.AspNetCore is completely removed
        csprojContent.Should().NotContain("Swashbuckle.AspNetCore",
            "Deprecated Swashbuckle.AspNetCore NuGet package must be replaced with native .NET 9 OpenAPI");

        // Assert native Microsoft.AspNetCore.OpenApi and modern Scalar are referenced
        csprojContent.Should().Contain("Microsoft.AspNetCore.OpenApi");
        csprojContent.Should().Contain("Scalar.AspNetCore");
    }

    [Fact]
    public async Task OpenApiDocumentTransformer_ShouldConfigureSecurityAndTitle()
    {
        var document = new OpenApiDocument();
        OpenApiDocumentTransformerContext context = null!;

        // Replicate the transformer registered in Program.cs
        Func<OpenApiDocument, OpenApiDocumentTransformerContext, CancellationToken, Task> transformer =
            (doc, ctx, ct) =>
            {
                doc.Info = new OpenApiInfo
                {
                    Title = "UdyogBill Multi-Industry SaaS Web API",
                    Version = "v1",
                    Description = "Enterprise multi-tenant billing, inventory, and business management platform API."
                };

                doc.Components ??= new OpenApiComponents();
                doc.Components.SecuritySchemes.Add("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter JWT Bearer token."
                });

                doc.SecurityRequirements.Add(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                return Task.CompletedTask;
            };

        await transformer(document, context, CancellationToken.None);

        document.Info.Should().NotBeNull();
        document.Info.Title.Should().Be("UdyogBill Multi-Industry SaaS Web API");
        document.Info.Version.Should().Be("v1");

        document.Components.Should().NotBeNull();
        document.Components.SecuritySchemes.Should().ContainKey("Bearer");
        var bearerScheme = document.Components.SecuritySchemes["Bearer"];
        bearerScheme.Type.Should().Be(SecuritySchemeType.Http);
        bearerScheme.Scheme.Should().Be("Bearer");
        bearerScheme.BearerFormat.Should().Be("JWT");

        document.SecurityRequirements.Should().HaveCount(1);
        document.SecurityRequirements[0].Keys.Should().Contain(k => k.Reference.Id == "Bearer");
    }

    [Fact]
    public void OpenApiServices_ShouldBeRegisteredInDependencyInjection()
    {
        var services = new ServiceCollection();
        services.AddEndpointsApiExplorer();
        services.AddOpenApi("v1");

        var serviceProvider = services.BuildServiceProvider();

        // Verify OpenApiOptions are resolvable
        var optionsMonitor = serviceProvider.GetService<IOptionsMonitor<OpenApiOptions>>();
        optionsMonitor.Should().NotBeNull();
        var v1Options = optionsMonitor!.Get("v1");
        v1Options.Should().NotBeNull();
    }
}
