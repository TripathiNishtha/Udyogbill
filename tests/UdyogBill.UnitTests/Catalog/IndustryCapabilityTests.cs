using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using Xunit;

namespace UdyogBill.UnitTests.Catalog;

public class IndustryCapabilityTests
{
    [Fact]
    public async Task GetCapabilityMatrix_ForPharma_ShouldIncludeBatchAndExpiryAndDrugCompliance()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var pharmaIndustry = new Industry
        {
            Id = Guid.NewGuid(),
            Code = "PHARMA",
            Name = "Pharmaceuticals & Healthcare",
            Description = "Pharma Distribution and Chemists"
        };

        using (var context = new AppDbContext(options))
        {
            context.Industries.Add(pharmaIndustry);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new AppDbContext(options))
        {
            var service = new IndustryService(context);
            var result = await service.GetCapabilityMatrixAsync(pharmaIndustry.Id);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.Data.Should().NotBeNull();
            result.Data!.EnabledFeatureCodes.Should().Contain("FEAT_BATCH_TRACKING");
            result.Data!.EnabledFeatureCodes.Should().Contain("FEAT_EXPIRY_MANAGEMENT");
            result.Data!.EnabledFeatureCodes.Should().Contain("FEAT_DRUG_COMPLIANCE");
        }
    }
}
