using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers.Public;

[AllowAnonymous]
[Route("api/v1/public/blogs")]
public class PublicBlogsController : BaseApiController
{
    private readonly AppDbContext _db;
    private static readonly ConcurrentDictionary<string, DateTime> _recentViewsCache = new();
    private static readonly Regex _botUserAgentRegex = new(
        @"(bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|semrush|ahrefs|mj12bot|python-requests|curl|wget|headless)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public PublicBlogsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/v1/public/blogs
    /// Returns all published blog posts for the marketing website.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPublishedBlogs(
        [FromQuery] string? categoryId = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        var query = _db.BlogPosts.AsNoTracking()
            .Where(b => !b.IsDeleted && b.Status == "published");

        if (!string.IsNullOrWhiteSpace(categoryId) && categoryId.ToLower() != "all")
        {
            query = query.Where(b => b.CategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(b =>
                b.Title.ToLower().Contains(s) ||
                b.Excerpt.ToLower().Contains(s) ||
                b.FocusKeyword.ToLower().Contains(s) ||
                b.CategoryName.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(b => b.PublishedAtUtc ?? b.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                id = b.Id.ToString(),
                title = b.Title,
                slug = b.Slug,
                excerpt = b.Excerpt,
                content = b.Content,
                featured_image = b.FeaturedImage,
                category_id = b.CategoryId,
                category_name = b.CategoryName,
                author_name = b.AuthorName,
                status = b.Status,
                published_at = b.PublishedAtUtc,
                meta_title = b.MetaTitle,
                meta_description = b.MetaDescription,
                meta_keywords = b.MetaKeywords,
                focus_keyword = b.FocusKeyword,
                canonical_url = b.CanonicalUrl,
                og_title = b.OgTitle,
                og_description = b.OgDescription,
                og_image = b.OgImage,
                reading_time = b.ReadingTime,
                views_count = b.ViewsCount,
                created_at = b.CreatedAtUtc,
                updated_at = b.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    /// <summary>
    /// GET /api/v1/public/blogs/{slug}
    /// Returns single published blog post by slug and increments views count.
    /// </summary>
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetPublishedBlogBySlug(string slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return BadRequest(new { message = "Slug is required." });

        var cleanSlug = Uri.UnescapeDataString(slug).Trim().ToLowerInvariant();

        var blog = await _db.BlogPosts
            .FirstOrDefaultAsync(b => !b.IsDeleted && b.Status == "published" && b.Slug.ToLower() == cleanSlug, cancellationToken);

        if (blog == null)
            return NotFound(new { message = "Blog article not found." });

        // Note: GET endpoint intentionally does NOT increment view count to prevent crawler / SSR false views
        return Ok(new
        {
            id = blog.Id.ToString(),
            title = blog.Title,
            slug = blog.Slug,
            excerpt = blog.Excerpt,
            content = blog.Content,
            featured_image = blog.FeaturedImage,
            category_id = blog.CategoryId,
            category_name = blog.CategoryName,
            author_name = blog.AuthorName,
            status = blog.Status,
            published_at = blog.PublishedAtUtc,
            meta_title = blog.MetaTitle,
            meta_description = blog.MetaDescription,
            meta_keywords = blog.MetaKeywords,
            focus_keyword = blog.FocusKeyword,
            canonical_url = blog.CanonicalUrl,
            og_title = blog.OgTitle,
            og_description = blog.OgDescription,
            og_image = blog.OgImage,
            reading_time = blog.ReadingTime,
            views_count = blog.ViewsCount,
            created_at = blog.CreatedAtUtc,
            updated_at = blog.UpdatedAtUtc
        });
    }

    /// <summary>
    /// POST /api/v1/public/blogs/{slug}/view
    /// Increments view count only for verified human visitors with bot filtering & 12h IP deduplication.
    /// </summary>
    [HttpPost("{slug}/view")]
    public async Task<IActionResult> RecordBlogView(string slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return BadRequest(new { message = "Slug is required." });

        var cleanSlug = Uri.UnescapeDataString(slug).Trim().ToLowerInvariant();

        var blog = await _db.BlogPosts
            .FirstOrDefaultAsync(b => !b.IsDeleted && b.Status == "published" && b.Slug.ToLower() == cleanSlug, cancellationToken);

        if (blog == null)
            return NotFound(new { message = "Blog article not found." });

        // 1. Bot & Crawler Detection
        var userAgent = Request.Headers.UserAgent.ToString();
        if (string.IsNullOrWhiteSpace(userAgent) || _botUserAgentRegex.IsMatch(userAgent))
        {
            // Do not increment for automated crawlers / bots
            return Ok(new { viewsCount = blog.ViewsCount, isBotFiltered = true });
        }

        // 2. IP-based Deduplication (1 view per IP per blog post per 12 hours)
        var clientIp = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                       ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                       ?? "unknown";

        var dedupeKey = $"{clientIp}_{cleanSlug}";
        if (_recentViewsCache.TryGetValue(dedupeKey, out var lastView) && (DateTime.UtcNow - lastView) < TimeSpan.FromHours(12))
        {
            // Already counted in this session
            return Ok(new { viewsCount = blog.ViewsCount, isDeduped = true });
        }

        // Register view
        _recentViewsCache[dedupeKey] = DateTime.UtcNow;

        // Cleanup stale keys if cache grows large
        if (_recentViewsCache.Count > 50000)
        {
            var cutoff = DateTime.UtcNow.AddHours(-12);
            foreach (var kvp in _recentViewsCache.Where(k => k.Value < cutoff).Take(1000))
            {
                _recentViewsCache.TryRemove(kvp.Key, out _);
            }
        }

        try
        {
            blog.ViewsCount += 1;
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Non-critical
        }

        return Ok(new { viewsCount = blog.ViewsCount, recorded = true });
    }
}

