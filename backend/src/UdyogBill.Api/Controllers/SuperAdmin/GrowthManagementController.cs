using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/growth")]
public class GrowthManagementController : BaseApiController
{
    private readonly AppDbContext _db;

    public GrowthManagementController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/v1/superadmin/growth/overview
    /// Returns aggregated organic growth KPIs, conversion funnel, 7-industry metrics, traffic channels, and geo distribution.
    /// Supports optional date filtering via from/to parameters.
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(GrowthOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGrowthOverview(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);
        var thirtyDaysAgo = now.AddDays(-30);

        var query = _db.Leads.AsNoTracking();

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt >= fromUtc);
        }

        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt <= toUtc);
        }

        var leads = await query.ToListAsync(cancellationToken);

        var totalLeads = leads.Count;
        var leadsLast7Days = leads.Count(l => l.CreatedAt >= sevenDaysAgo);
        var leadsLast30Days = leads.Count(l => l.CreatedAt >= thirtyDaysAgo);

        var contactedCount = leads.Count(l => l.ConversionStage == "Contacted" || l.Status == "Contacted" || l.ContactedAt != null);
        var trialCount = leads.Count(l => l.ConversionStage == "Trial" || l.TrialStartedAt != null);
        var convertedPaidCount = leads.Count(l => l.ConversionStage == "ConvertedPaid" || l.Status == "Converted" || l.ConvertedPaidAt != null);
        var totalPaidRevenue = leads.Where(l => l.PaidAmount.HasValue).Sum(l => l.PaidAmount!.Value);

        double leadToContactRate = totalLeads > 0 ? Math.Round((double)contactedCount / totalLeads * 100, 1) : 0;
        double trialConversionRate = trialCount > 0 ? Math.Round((double)convertedPaidCount / trialCount * 100, 1) : 0;
        double overallConversionRate = totalLeads > 0 ? Math.Round((double)convertedPaidCount / totalLeads * 100, 1) : 0;

        // 7 Official Industries definition
        var officialIndustries = new (string Code, string Name)[]
        {
            ("PHARMA", "Pharmaceuticals & Healthcare"),
            ("FMCG", "FMCG, Grocery & Supermarkets"),
            ("ELECTRONICS", "Electronics & Mobile Retail"),
            ("GARMENTS", "Garments, Apparel & Footwear"),
            ("HARDWARE", "Hardware, Sanitary & Building"),
            ("SERVICE_SECTOR", "Service Sector, Repair & Agencies"),
            ("OTHER", "General Trading & Distribution")
        };

        var industryMetrics = officialIndustries.Select(ind =>
        {
            var indLeads = leads.Where(l =>
                string.Equals(l.IndustryCode, ind.Code, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(l.BusinessType, ind.Code, StringComparison.OrdinalIgnoreCase)).ToList();

            var count = indLeads.Count;
            var trials = indLeads.Count(l => l.ConversionStage == "Trial" || l.TrialStartedAt != null);
            var paid = indLeads.Count(l => l.ConversionStage == "ConvertedPaid" || l.Status == "Converted" || l.ConvertedPaidAt != null);
            var rev = indLeads.Where(l => l.PaidAmount.HasValue).Sum(l => l.PaidAmount!.Value);
            var convRate = count > 0 ? Math.Round((double)paid / count * 100, 1) : 0.0;

            return new IndustryGrowthMetric(
                ind.Code,
                ind.Name,
                count,
                trials,
                paid,
                rev,
                convRate);
        }).ToList();

        // Top Traffic Channels (UtmSource or Source)
        var topChannels = leads
            .GroupBy(l => !string.IsNullOrWhiteSpace(l.UtmSource) ? l.UtmSource : (!string.IsNullOrWhiteSpace(l.Source) ? l.Source : "Direct / Organic"))
            .Select(g => new GrowthChannelMetric(g.Key, g.Count(), g.Count(x => x.ConversionStage == "ConvertedPaid" || x.Status == "Converted")))
            .OrderByDescending(c => c.Count)
            .Take(8)
            .ToList();

        // Top Landing Pages
        var topLandingPages = leads
            .Where(l => !string.IsNullOrWhiteSpace(l.LandingPage))
            .GroupBy(l => l.LandingPage!)
            .Select(g => new GrowthLandingPageMetric(g.Key, g.Count()))
            .OrderByDescending(p => p.Count)
            .Take(8)
            .ToList();

        // Top Cities
        var topCities = leads
            .Where(l => !string.IsNullOrWhiteSpace(l.City))
            .GroupBy(l => l.City.Trim())
            .Select(g => new GrowthGeoMetric(g.Key, g.Count()))
            .OrderByDescending(c => c.Count)
            .Take(10)
            .ToList();

        // Top Search Keywords (Organic search queries)
        var topKeywords = leads
            .Where(l => !string.IsNullOrWhiteSpace(l.SearchKeyword))
            .GroupBy(l => l.SearchKeyword!.Trim())
            .Select(g => new GrowthKeywordMetric(g.Key, g.Count()))
            .OrderByDescending(k => k.Count)
            .Take(8)
            .ToList();

        // Recent 5 leads
        var recentLeads = leads
            .OrderByDescending(l => l.CreatedAt)
            .Take(5)
            .Select(l => new RecentGrowthLead(
                l.Id,
                l.Name,
                l.BusinessName,
                l.City,
                string.IsNullOrWhiteSpace(l.IndustryCode) ? "OTHER" : l.IndustryCode,
                l.ConversionStage,
                l.UtmSource ?? l.Source,
                l.PaidAmount,
                l.CreatedAt))
            .ToList();

        var droppedCount = leads.Count(l => l.ConversionStage == "Dropped" || l.Status == "Dropped");

        var funnel = new FunnelDropOffDto(
            totalLeads,
            contactedCount,
            trialCount,
            convertedPaidCount,
            droppedCount,
            totalLeads > 0 ? Math.Round((double)contactedCount / totalLeads * 100, 1) : 0,
            contactedCount > 0 ? Math.Round((double)trialCount / contactedCount * 100, 1) : 0,
            trialCount > 0 ? Math.Round((double)convertedPaidCount / trialCount * 100, 1) : 0);

        var overview = new GrowthOverviewDto(
            totalLeads,
            leadsLast7Days,
            leadsLast30Days,
            contactedCount,
            trialCount,
            convertedPaidCount,
            totalPaidRevenue,
            leadToContactRate,
            trialConversionRate,
            overallConversionRate,
            industryMetrics,
            topChannels,
            topLandingPages,
            topCities,
            topKeywords,
            recentLeads,
            funnel);

        return Ok(overview);
    }

    /// <summary>
    /// GET /api/v1/superadmin/growth/cities-performance
    /// Returns 50-city performance matrix across the database, aggregated by city slug or city name.
    /// </summary>
    [HttpGet("cities-performance")]
    [ProducesResponseType(typeof(List<CityPerformanceMetricDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCitiesPerformance(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Leads.AsNoTracking();

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt >= fromUtc);
        }

        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt <= toUtc);
        }

        var leads = await query.ToListAsync(cancellationToken);

        var grouped = leads
            .GroupBy(l => !string.IsNullOrWhiteSpace(l.CitySlug) ? l.CitySlug.ToLowerInvariant() : (!string.IsNullOrWhiteSpace(l.City) ? l.City.Trim().ToLowerInvariant().Replace(" ", "-") : "unknown"))
            .Select(g =>
            {
                var sample = g.First();
                var cityName = !string.IsNullOrWhiteSpace(sample.City) ? sample.City.Trim() : g.Key;
                var total = g.Count();
                var contacted = g.Count(l => l.ConversionStage == "Contacted" || l.Status == "Contacted" || l.ContactedAt != null);
                var trials = g.Count(l => l.ConversionStage == "Trial" || l.TrialStartedAt != null);
                var paid = g.Count(l => l.ConversionStage == "ConvertedPaid" || l.Status == "Converted" || l.ConvertedPaidAt != null);
                var rev = g.Where(l => l.PaidAmount.HasValue).Sum(l => l.PaidAmount!.Value);
                var winRate = total > 0 ? Math.Round((double)paid / total * 100, 1) : 0.0;

                return new CityPerformanceMetricDto(
                    g.Key,
                    cityName,
                    sample.State ?? "",
                    total,
                    contacted,
                    trials,
                    paid,
                    rev,
                    winRate);
            })
            .OrderByDescending(c => c.TotalLeads)
            .ThenByDescending(c => c.TotalRevenue)
            .ToList();

        return Ok(grouped);
    }

    /// <summary>
    /// GET /api/v1/superadmin/growth/content-performance
    /// Returns performance by Landing Page and Blog Slugs to track content-to-lead attribution.
    /// </summary>
    [HttpGet("content-performance")]
    [ProducesResponseType(typeof(List<ContentPerformanceMetricDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContentPerformance(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Leads.AsNoTracking();

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt >= fromUtc);
        }

        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
            query = query.Where(l => l.CreatedAt <= toUtc);
        }

        var leads = await query.ToListAsync(cancellationToken);

        var grouped = leads
            .GroupBy(l => !string.IsNullOrWhiteSpace(l.LandingPage) ? l.LandingPage : (!string.IsNullOrWhiteSpace(l.Source) ? l.Source : "/"))
            .Select(g =>
            {
                var path = g.Key;
                var total = g.Count();
                var trials = g.Count(l => l.ConversionStage == "Trial" || l.TrialStartedAt != null);
                var paid = g.Count(l => l.ConversionStage == "ConvertedPaid" || l.Status == "Converted" || l.ConvertedPaidAt != null);
                var rev = g.Where(l => l.PaidAmount.HasValue).Sum(l => l.PaidAmount!.Value);
                var winRate = total > 0 ? Math.Round((double)paid / total * 100, 1) : 0.0;

                var contentType = path.StartsWith("/blog") ? "Blog Guide"
                                : path.StartsWith("/city") ? "City SEO Landing"
                                : path.StartsWith("/industries") ? "Industry Solution"
                                : "Core SaaS Page";

                return new ContentPerformanceMetricDto(
                    path,
                    contentType,
                    total,
                    trials,
                    paid,
                    rev,
                    winRate);
            })
            .OrderByDescending(c => c.TotalLeads)
            .ThenByDescending(c => c.TotalRevenue)
            .Take(40)
            .ToList();

        return Ok(grouped);
    }
}

public record FunnelDropOffDto(
    int TotalLeads,
    int Contacted,
    int Trials,
    int ConvertedPaid,
    int Dropped,
    double LeadToContactDropRate,
    double ContactToTrialDropRate,
    double TrialToPaidDropRate);

public record CityPerformanceMetricDto(
    string Slug,
    string CityName,
    string State,
    int TotalLeads,
    int Contacted,
    int ActiveTrials,
    int ConvertedPaid,
    decimal TotalRevenue,
    double WinRate);

public record ContentPerformanceMetricDto(
    string Path,
    string ContentType,
    int TotalLeads,
    int ActiveTrials,
    int ConvertedPaid,
    decimal TotalRevenue,
    double WinRate);

public record GrowthOverviewDto(
    int TotalLeads,
    int LeadsLast7Days,
    int LeadsLast30Days,
    int ContactedCount,
    int TrialCount,
    int ConvertedPaidCount,
    decimal TotalPaidRevenue,
    double LeadToContactRate,
    double TrialConversionRate,
    double OverallConversionRate,
    List<IndustryGrowthMetric> Industries,
    List<GrowthChannelMetric> TopChannels,
    List<GrowthLandingPageMetric> TopLandingPages,
    List<GrowthGeoMetric> TopCities,
    List<GrowthKeywordMetric> TopKeywords,
    List<RecentGrowthLead> RecentLeads,
    FunnelDropOffDto Funnel);

public record IndustryGrowthMetric(
    string Code,
    string Name,
    int TotalLeads,
    int ActiveTrials,
    int ConvertedPaid,
    decimal TotalRevenue,
    double ConversionRate);

public record GrowthChannelMetric(
    string Channel,
    int Count,
    int Conversions);

public record GrowthLandingPageMetric(
    string Page,
    int Count);

public record GrowthGeoMetric(
    string City,
    int Count);

public record GrowthKeywordMetric(
    string Keyword,
    int Count);

public record RecentGrowthLead(
    Guid Id,
    string Name,
    string BusinessName,
    string City,
    string IndustryCode,
    string ConversionStage,
    string? Channel,
    decimal? PaidAmount,
    DateTime CreatedAt);
