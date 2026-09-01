using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class IndustryService : IIndustryService
{
    private readonly AppDbContext _context;

    public IndustryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Result<IReadOnlyList<IndustryDto>>> GetAllIndustriesAsync(CancellationToken cancellationToken = default)
    {
        var industries = await _context.Industries
            .Where(i => i.IsActive && !i.IsDeleted)
            .OrderBy(i => i.DisplayOrder)
            .Select(i => new IndustryDto(
                i.Id,
                i.Code,
                i.Name,
                i.Description,
                i.Icon,
                i.DisplayOrder,
                i.IsActive,
                new List<ModuleSummaryDto>()
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<IndustryDto>>.Success(industries);
    }

    public async Task<Result<IndustryDto>> GetIndustryByIdAsync(Guid industryId, CancellationToken cancellationToken = default)
    {
        var industry = await _context.Industries
            .Include(i => i.IndustryModules)
                .ThenInclude(im => im.Module)
                    .ThenInclude(m => m.Features)
                        .ThenInclude(f => f.SubFeatures)
            .FirstOrDefaultAsync(i => i.Id == industryId && !i.IsDeleted, cancellationToken);

        if (industry == null)
        {
            return Result<IndustryDto>.Failure("Industry not found.", "NOT_FOUND");
        }

        var modulesDto = industry.IndustryModules.Select(im => new ModuleSummaryDto(
            im.Module.Id,
            im.Module.Code,
            im.Module.Name,
            im.Module.Description,
            im.Module.Icon,
            im.Module.IsCore,
            im.Module.Features.Select(f => new FeatureSummaryDto(
                f.Id,
                f.Code,
                f.Name,
                f.Description,
                f.FeatureType,
                f.SubFeatures.Select(sf => new SubFeatureSummaryDto(sf.Id, sf.Code, sf.Name, sf.Description)).ToList()
            )).ToList()
        )).ToList();

        var dto = new IndustryDto(
            industry.Id,
            industry.Code,
            industry.Name,
            industry.Description,
            industry.Icon,
            industry.DisplayOrder,
            industry.IsActive,
            modulesDto
        );

        return Result<IndustryDto>.Success(dto);
    }

    public async Task<Result<IndustryDto>> GetIndustryByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var industry = await _context.Industries
            .FirstOrDefaultAsync(i => i.Code.ToUpper() == code.ToUpper() && !i.IsDeleted, cancellationToken);

        if (industry == null)
        {
            return Result<IndustryDto>.Failure($"Industry with code '{code}' not found.", "NOT_FOUND");
        }

        return await GetIndustryByIdAsync(industry.Id, cancellationToken);
    }

    public async Task<Result<IndustryCapabilityMatrixDto>> GetCapabilityMatrixAsync(Guid industryId, CancellationToken cancellationToken = default)
    {
        var industry = await _context.Industries
            .FirstOrDefaultAsync(i => i.Id == industryId && !i.IsDeleted, cancellationToken);

        if (industry == null)
        {
            return Result<IndustryCapabilityMatrixDto>.Failure("Industry not found.", "NOT_FOUND");
        }

        var enabledModules = new List<string> { "SALES", "PURCHASE", "INVENTORY", "ACCOUNTS", "GST", "SETTINGS" };
        var enabledFeatures = new List<string>();

        if (industry.Code is "PHARMA")
        {
            enabledFeatures.AddRange(new[] { "FEAT_BATCH_TRACKING", "FEAT_EXPIRY_MANAGEMENT", "FEAT_DRUG_COMPLIANCE" });
        }
        else if (industry.Code is "FMCG")
        {
            enabledFeatures.AddRange(new[] { "FEAT_BATCH_TRACKING", "FEAT_EXPIRY_MANAGEMENT", "FEAT_MULTI_UOM" });
        }
        else if (industry.Code is "GARMENTS" or "FOOTWEAR")
        {
            enabledFeatures.AddRange(new[] { "FEAT_MATRIX_VARIANTS" });
        }
        else if (industry.Code is "ELECTRONICS" or "ELECTRICAL")
        {
            enabledFeatures.AddRange(new[] { "FEAT_SERIAL_TRACKING" });
        }
        else if (industry.Code is "BAKERY")
        {
            enabledFeatures.AddRange(new[] { "FEAT_RECIPE_BOM", "FEAT_BATCH_TRACKING", "FEAT_EXPIRY_MANAGEMENT" });
        }

        var matrix = new IndustryCapabilityMatrixDto(
            industry.Id,
            industry.Code,
            industry.Name,
            enabledModules,
            enabledFeatures,
            new Dictionary<string, object>()
        );

        return Result<IndustryCapabilityMatrixDto>.Success(matrix);
    }
}
