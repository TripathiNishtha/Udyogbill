using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers.SuperAdmin;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/blogs")]
public class BlogManagementController : BaseApiController
{
    private readonly AppDbContext _db;

    public BlogManagementController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/v1/superadmin/blogs
    /// Returns paged list of all blogs with search, status filter, and category filter.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetBlogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _db.BlogPosts.AsNoTracking().Where(b => !b.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(b =>
                b.Title.ToLower().Contains(s) ||
                b.Slug.ToLower().Contains(s) ||
                b.Excerpt.ToLower().Contains(s) ||
                b.FocusKeyword.ToLower().Contains(s) ||
                b.CategoryName.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
        {
            var st = status.Trim().ToLower();
            query = query.Where(b => b.Status.ToLower() == st);
        }

        if (!string.IsNullOrWhiteSpace(categoryId) && categoryId.ToLower() != "all")
        {
            query = query.Where(b => b.CategoryId == categoryId);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var publishedCount = await _db.BlogPosts.AsNoTracking().CountAsync(b => !b.IsDeleted && b.Status.ToLower() == "published", cancellationToken);
        var draftCount = await _db.BlogPosts.AsNoTracking().CountAsync(b => !b.IsDeleted && b.Status.ToLower() == "draft", cancellationToken);
        var totalViews = await _db.BlogPosts.AsNoTracking().Where(b => !b.IsDeleted).SumAsync(b => (long?)b.ViewsCount, cancellationToken) ?? 0L;
        var avgReadingTime = await _db.BlogPosts.AsNoTracking().Where(b => !b.IsDeleted).AverageAsync(b => (double?)b.ReadingTime, cancellationToken) ?? 5.0;

        var items = await query
            .OrderByDescending(b => b.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.FeaturedImage,
                b.CategoryId,
                b.CategoryName,
                b.AuthorName,
                b.Status,
                b.PublishedAtUtc,
                b.ReadingTime,
                b.ViewsCount,
                b.CreatedAtUtc,
                b.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            items,
            totalCount,
            publishedCount,
            draftCount,
            totalViews,
            avgReadingTime = Math.Round(avgReadingTime, 1),
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    /// <summary>
    /// GET /api/v1/superadmin/blogs/{id}
    /// Returns single blog by id for editing.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBlogById(Guid id, CancellationToken cancellationToken)
    {
        var blog = await _db.BlogPosts.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);

        if (blog == null)
            return NotFound(new { message = "Blog post not found." });

        return Ok(blog);
    }

    /// <summary>
    /// POST /api/v1/superadmin/blogs
    /// Creates a new blog post.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateBlog([FromBody] BlogPostUpsertRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Blog title is required." });

        var slug = GenerateSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug);

        // Ensure unique slug
        var slugExists = await _db.BlogPosts.AnyAsync(b => b.Slug == slug && !b.IsDeleted, cancellationToken);
        if (slugExists)
        {
            slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
        }

        var readingTime = request.ReadingTime > 0
            ? request.ReadingTime
            : CalculateReadingTime(request.Content);

        var blog = new BlogPost
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Slug = slug,
            Excerpt = request.Excerpt?.Trim() ?? string.Empty,
            Content = request.Content ?? string.Empty,
            FeaturedImage = request.FeaturedImage?.Trim(),
            CategoryId = request.CategoryId?.Trim(),
            CategoryName = string.IsNullOrWhiteSpace(request.CategoryName) ? "General" : request.CategoryName.Trim(),
            AuthorName = string.IsNullOrWhiteSpace(request.AuthorName) ? "UdyogBill Editorial Team" : request.AuthorName.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "published" : request.Status.Trim().ToLower(),
            PublishedAtUtc = request.Status?.ToLower() == "draft" ? null : (request.PublishedAtUtc ?? DateTime.UtcNow),
            MetaTitle = string.IsNullOrWhiteSpace(request.MetaTitle) ? request.Title.Trim() : request.MetaTitle.Trim(),
            MetaDescription = string.IsNullOrWhiteSpace(request.MetaDescription) ? (request.Excerpt?.Trim() ?? string.Empty) : request.MetaDescription.Trim(),
            MetaKeywords = request.MetaKeywords?.Trim() ?? string.Empty,
            FocusKeyword = request.FocusKeyword?.Trim() ?? string.Empty,
            CanonicalUrl = request.CanonicalUrl?.Trim(),
            OgTitle = request.OgTitle?.Trim(),
            OgDescription = request.OgDescription?.Trim(),
            OgImage = request.OgImage?.Trim() ?? request.FeaturedImage?.Trim(),
            ReadingTime = readingTime,
            ViewsCount = 0,
            CreatedAtUtc = DateTime.UtcNow,
            IsDeleted = false
        };

        _db.BlogPosts.Add(blog);
        await _db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetBlogById), new { id = blog.Id }, blog);
    }

    /// <summary>
    /// PUT /api/v1/superadmin/blogs/{id}
    /// Updates an existing blog post.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateBlog(Guid id, [FromBody] BlogPostUpsertRequest request, CancellationToken cancellationToken)
    {
        var blog = await _db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);
        if (blog == null)
            return NotFound(new { message = "Blog post not found." });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Blog title is required." });

        var slug = GenerateSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug);
        if (slug != blog.Slug)
        {
            var slugConflict = await _db.BlogPosts.AnyAsync(b => b.Slug == slug && b.Id != id && !b.IsDeleted, cancellationToken);
            if (slugConflict)
            {
                slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
            }
            blog.Slug = slug;
        }

        blog.Title = request.Title.Trim();
        blog.Excerpt = request.Excerpt?.Trim() ?? string.Empty;
        blog.Content = request.Content ?? string.Empty;
        blog.FeaturedImage = request.FeaturedImage?.Trim();
        blog.CategoryId = request.CategoryId?.Trim();
        blog.CategoryName = string.IsNullOrWhiteSpace(request.CategoryName) ? "General" : request.CategoryName.Trim();
        blog.AuthorName = string.IsNullOrWhiteSpace(request.AuthorName) ? "UdyogBill Editorial Team" : request.AuthorName.Trim();
        
        var newStatus = string.IsNullOrWhiteSpace(request.Status) ? "published" : request.Status.Trim().ToLower();
        if (newStatus == "published" && (blog.Status != "published" || blog.PublishedAtUtc == null))
        {
            blog.PublishedAtUtc = DateTime.UtcNow;
        }
        blog.Status = newStatus;

        blog.MetaTitle = string.IsNullOrWhiteSpace(request.MetaTitle) ? request.Title.Trim() : request.MetaTitle.Trim();
        blog.MetaDescription = string.IsNullOrWhiteSpace(request.MetaDescription) ? (request.Excerpt?.Trim() ?? string.Empty) : request.MetaDescription.Trim();
        blog.MetaKeywords = request.MetaKeywords?.Trim() ?? string.Empty;
        blog.FocusKeyword = request.FocusKeyword?.Trim() ?? string.Empty;
        blog.CanonicalUrl = request.CanonicalUrl?.Trim();
        blog.OgTitle = request.OgTitle?.Trim();
        blog.OgDescription = request.OgDescription?.Trim();
        blog.OgImage = request.OgImage?.Trim() ?? request.FeaturedImage?.Trim();
        blog.ReadingTime = request.ReadingTime > 0 ? request.ReadingTime : CalculateReadingTime(request.Content);
        blog.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return Ok(blog);
    }

    /// <summary>
    /// PATCH /api/v1/superadmin/blogs/{id}/status
    /// Quick status toggle between draft and published.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] BlogStatusUpdateRequest request, CancellationToken cancellationToken)
    {
        var blog = await _db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);
        if (blog == null)
            return NotFound(new { message = "Blog post not found." });

        var newStatus = request.Status?.Trim().ToLower();
        if (newStatus != "published" && newStatus != "draft" && newStatus != "archived")
            return BadRequest(new { message = "Invalid status. Allowed: published, draft, archived." });

        if (newStatus == "published" && blog.PublishedAtUtc == null)
        {
            blog.PublishedAtUtc = DateTime.UtcNow;
        }

        blog.Status = newStatus;
        blog.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Status updated to {newStatus}.", status = newStatus });
    }

    /// <summary>
    /// DELETE /api/v1/superadmin/blogs/{id}
    /// Soft deletes a blog post.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteBlog(Guid id, CancellationToken cancellationToken)
    {
        var blog = await _db.BlogPosts.FirstOrDefaultAsync(b => b.Id == id && !b.IsDeleted, cancellationToken);
        if (blog == null)
            return NotFound(new { message = "Blog post not found." });

        blog.IsDeleted = true;
        blog.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Blog post deleted successfully." });
    }

    private static string GenerateSlug(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "blog-post";
        var slug = input.ToLowerInvariant().Trim();
        // Replace invalid chars with hyphen
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        // Convert multiple spaces/hyphens to single hyphen
        slug = Regex.Replace(slug, @"[\s-]+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "blog-post" : slug;
    }

    private static int CalculateReadingTime(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return 3;
        var words = content.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
        return Math.Max(1, (int)Math.Ceiling(words / 200.0));
    }
}

public class BlogPostUpsertRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string? Content { get; set; }
    public string? FeaturedImage { get; set; }
    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? AuthorName { get; set; }
    public string? Status { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
    public string? FocusKeyword { get; set; }
    public string? CanonicalUrl { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }
    public string? OgImage { get; set; }
    public int ReadingTime { get; set; }
}

public class BlogStatusUpdateRequest
{
    public string Status { get; set; } = "published";
}
