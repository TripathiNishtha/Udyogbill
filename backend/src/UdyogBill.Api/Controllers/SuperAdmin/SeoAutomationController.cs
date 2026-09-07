using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/growth/seo")]
public class SeoAutomationController : BaseApiController
{
    private static readonly HttpClient _httpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(10)
    };

    public SeoAutomationController()
    {
        if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        }
    }

    /// <summary>
    /// GET /api/v1/superadmin/growth/seo/keywords/suggest
    /// Fetches real-time search queries from Google Autocomplete free API for any seed query.
    /// </summary>
    [HttpGet("keywords/suggest")]
    public async Task<IActionResult> GetKeywordSuggestions([FromQuery] string query, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { error = "Query parameter is required.", code = "EMPTY_QUERY" });

        var trimmed = query.Trim();
        var googleUrl = $"https://suggestqueries.google.com/complete/search?client=firefox&q={Uri.EscapeDataString(trimmed)}";

        try
        {
            var response = await _httpClient.GetStringAsync(googleUrl, cancellationToken);
            using var doc = JsonDocument.Parse(response);
            var root = doc.RootElement;

            var suggestions = new List<string>();
            if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 1)
            {
                var list = root[1];
                if (list.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in list.EnumerateArray())
                    {
                        var str = item.GetString();
                        if (!string.IsNullOrWhiteSpace(str))
                            suggestions.Add(str);
                    }
                }
            }

            return Ok(new
            {
                query = trimmed,
                suggestions,
                total = suggestions.Count,
                source = "Google Organic Autocomplete (Free API)"
            });
        }
        catch (Exception ex)
        {
            return Ok(new
            {
                query = trimmed,
                suggestions = FallbackSuggestions(trimmed),
                total = 4,
                source = "Offline Semantic Engine (Fallback)",
                note = ex.Message
            });
        }
    }

    /// <summary>
    /// POST /api/v1/superadmin/growth/seo/generate-content
    /// Generates high-converting SEO Meta Title, Meta Description, H1/H2 outline, LSI keywords, and Schema FAQs.
    /// </summary>
    [HttpPost("generate-content")]
    public IActionResult GenerateSeoContent([FromBody] GenerateSeoContentRequest request)
    {
        var industry = !string.IsNullOrWhiteSpace(request.IndustryCode) ? request.IndustryCode.ToUpperInvariant() : "OTHER";
        var city = !string.IsNullOrWhiteSpace(request.City) ? request.City.Trim() : "India";
        var state = !string.IsNullOrWhiteSpace(request.State) ? request.State.Trim() : "";

        var content = GenerateOptimizedContent(industry, city, state, request.PrimaryKeyword);
        return Ok(content);
    }

    /// <summary>
    /// POST /api/v1/superadmin/growth/seo/ping-sitemap
    /// Notifies Google and Bing search crawlers to re-index UdyogBill's updated sitemap.
    /// </summary>
    [HttpPost("ping-sitemap")]
    public async Task<IActionResult> PingSitemap(CancellationToken cancellationToken)
    {
        var sitemapUrl = "https://udyogbill.com/sitemap.xml";
        var results = new List<PingEngineResult>();

        // Ping Bing
        try
        {
            var bingUrl = $"https://www.bing.com/ping?sitemap={Uri.EscapeDataString(sitemapUrl)}";
            var resp = await _httpClient.GetAsync(bingUrl, cancellationToken);
            results.Add(new PingEngineResult("Bing Webmaster", (int)resp.StatusCode, resp.IsSuccessStatusCode ? "Ping Accepted" : "Failed"));
        }
        catch (Exception ex)
        {
            results.Add(new PingEngineResult("Bing Webmaster", 500, ex.Message));
        }

        // Ping Google
        try
        {
            var googleUrl = $"https://www.google.com/ping?sitemap={Uri.EscapeDataString(sitemapUrl)}";
            var resp = await _httpClient.GetAsync(googleUrl, cancellationToken);
            results.Add(new PingEngineResult("Google Search Console", (int)resp.StatusCode, resp.IsSuccessStatusCode ? "Ping Accepted" : "Completed"));
        }
        catch (Exception ex)
        {
            results.Add(new PingEngineResult("Google Search Console", 500, ex.Message));
        }

        return Ok(new
        {
            sitemap = sitemapUrl,
            timestamp = DateTime.UtcNow,
            engines = results
        });
    }

    private static List<string> FallbackSuggestions(string query)
    {
        var q = query.ToLowerInvariant();
        return new List<string>
        {
            $"{q} software india",
            $"best {q} for small business",
            $"{q} gst billing offline",
            $"{q} with inventory management"
        };
    }

    private static GeneratedSeoResult GenerateOptimizedContent(string industry, string city, string state, string? seedKeyword)
    {
        var isNational = city.Equals("India", StringComparison.OrdinalIgnoreCase);
        var locationHook = isNational ? "India" : $"{city}{(string.IsNullOrWhiteSpace(state) ? "" : $", {state}")}";

        var (industryName, industryPain, industryFeature, defaultLsi) = industry switch
        {
            "PHARMA" => (
                "Pharma Distributor & Chemist",
                "Batch expiry aur Schedule H1 register maintain karna",
                "Automated batch tracking, near-expiry alerts aur CDSCO compliant H1 register",
                new[] { "pharma billing software", "chemist pos software", "batch tracking software", "expiry alert billing", "cdsco compliant erp" }
            ),
            "FMCG" => (
                "FMCG, Grocery & Supermarket",
                "Case-pack conversion aur trade discount schemes ka hisaab lagana",
                "Peti-to-piece auto conversion, route-wise sales tracking aur volume discount slabs",
                new[] { "fmcg billing software", "grocery store pos", "case pack conversion", "distributor trade schemes", "supermarket billing" }
            ),
            "ELECTRONICS" => (
                "Electronics & Mobile Retail",
                "IMEI serial numbers type karna aur warranty claims ko verify karna",
                "Dual IMEI scanning, automated warranty slips aur mobile repair job sheets",
                new[] { "electronics billing software", "mobile shop pos", "imei tracking software", "warranty slip billing", "mobile repair job sheet" }
            ),
            "GARMENTS" => (
                "Garments, Apparel & Footwear",
                "Size, color aur style variants ka stock count ulajhna",
                "Size-Color-Fit matrix, barcode tag printing aur end-of-season discount slabs",
                new[] { "garment billing software", "clothing shop pos", "size color matrix software", "apparel barcode billing", "footwear pos" }
            ),
            "HARDWARE" => (
                "Hardware, Sanitary & Building Materials",
                "Sq.Ft, Metric Ton aur Saria bundle weight calculate karna",
                "Multi-UOM decimal accuracy, TMT steel formula, paint tinting codes aur mistri ledger",
                new[] { "hardware billing software", "sanitary shop pos", "tmt saria weight calculator", "plywood sqft billing", "paint tinting software" }
            ),
            "SERVICE_SECTOR" => (
                "Service Providers & Agencies",
                "SAC code compliance aur client dwara kate gaye TDS ka reconciliation",
                "Automated SAC codes, Section 194J/194C TDS receivable tracking aur recurring retainers",
                new[] { "service billing software", "sac code invoice", "tds 194j invoice tracking", "consultant invoice generator", "recurring retainer billing" }
            ),
            _ => (
                "General Trading & Wholesale",
                "Multi-godown stock transfer aur dalal/broker ki commission track karna",
                "Godown-wise live stock visibility, dalal commission sheet aur wholesale quantity slabs",
                new[] { "wholesale billing software", "trading erp software", "multi godown transfer", "broker commission billing", "gst invoice software" }
            )
        };

        var title = isNational
            ? $"Best {industryName} Billing Software India | Free Demo | UdyogBill"
            : $"Best {industryName} Billing Software in {city} | Free Demo | UdyogBill";

        var metaDescription = isNational
            ? $"{industryName} ke liye Bharat ka sabse bharosemand GST billing software. {industryFeature}. 14 din ka free trial shuru karein."
            : $"{city} ke vyapariyon ke liye No. 1 {industryName} billing software. {industryFeature}. Abhi call ya WhatsApp karein +91 99999 99999.";

        var h1 = isNational
            ? $"{industryName} Vyapar Ka Smart GST Billing Software"
            : $"{city} Mein {industryName} Ka No. 1 GST Billing Software";

        var h2 = $"{industryName} Ki Samasyon Ka Pakka Samadhan ({locationHook})";

        var faqs = new List<SeoFaqItem>
        {
            new(
                $"Kya UdyogBill {locationHook} ke GST niyam aur slabs ke anusaar compliant hai?",
                $"Haan, UdyogBill CGST, SGST, IGST aur state codes ke saath 100% compliant hai. GSTR-1, GSTR-3B JSON exports ek click mein generate hote hain."
            ),
            new(
                $"Kya {industryName} dukan par internet na hone par bhi billing chalegi?",
                $"Ji haan, UdyogBill offline mode support karta hai. Internet na hone par bhi parchi print hoti rahegi aur network aate hi cloud sync ho jayega."
            ),
            new(
                $"Kya hamare purane software ya Excel se stock data import ho sakta hai?",
                $"Haan! UdyogBill Universal Excel/CSV Migrator ke dwara aapka purana item master, parties aur opening balance 5 minute mein migrate ho jata hai."
            ),
            new(
                $"Free demo ya trial kaise start karein?",
                $"Aap hamare website par Free Trial par click kar sakte hain ya hamari WhatsApp support team se +91 99999 99999 par 1-minute demo book kar sakte hain."
            )
        };

        var lsiKeywords = new List<string>(defaultLsi);
        if (!isNational)
        {
            lsiKeywords.Add($"billing software in {city.ToLowerInvariant()}");
            lsiKeywords.Add($"gst billing {city.ToLowerInvariant()}");
            lsiKeywords.Add($"{industry.ToLowerInvariant()} pos in {city.ToLowerInvariant()}");
        }
        if (!string.IsNullOrWhiteSpace(seedKeyword))
        {
            lsiKeywords.Insert(0, seedKeyword.Trim());
        }

        return new GeneratedSeoResult(
            industry,
            locationHook,
            title,
            metaDescription,
            h1,
            h2,
            industryPain,
            industryFeature,
            lsiKeywords,
            faqs
        );
    }
}

public record GenerateSeoContentRequest(
    string IndustryCode,
    string? City = null,
    string? State = null,
    string? PrimaryKeyword = null);

public record GeneratedSeoResult(
    string IndustryCode,
    string Location,
    string MetaTitle,
    string MetaDescription,
    string H1,
    string H2,
    string PainPoint,
    string FeatureSolution,
    List<string> LsiKeywords,
    List<SeoFaqItem> Faqs);

public record SeoFaqItem(string Question, string Answer);

public record PingEngineResult(string Engine, int StatusCode, string StatusMessage);
