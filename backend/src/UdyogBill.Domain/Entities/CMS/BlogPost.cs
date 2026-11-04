using System;

namespace UdyogBill.Domain.Entities.CMS;

public class BlogPost
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string? CategoryId { get; set; }
    public string CategoryName { get; set; } = "General";
    public string AuthorName { get; set; } = "UdyogBill Editorial Team";
    public string Status { get; set; } = "published"; // "draft", "published", "archived"
    public DateTime? PublishedAtUtc { get; set; } = DateTime.UtcNow;
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string FocusKeyword { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }
    public string? OgImage { get; set; }
    public int ReadingTime { get; set; } = 5;
    public int ViewsCount { get; set; } = 0;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public bool IsDeleted { get; set; } = false;
}
