import type { MetadataRoute } from "next";
import { CITIES_DATA } from "@/lib/city-data";
import { getAllBlogs, getAllCategories } from "@/lib/blog-data-loader";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://udyogbill.com";
  const now = new Date();

  // 1. Core Marketing & Legal Pages
  const corePages: MetadataRoute.Sitemap = [
    { url: base, priority: 1.0, changeFrequency: "daily", lastModified: new Date("2025-06-01") },
    { url: `${base}/features`, priority: 0.9, changeFrequency: "weekly", lastModified: new Date("2025-06-01") },
    { url: `${base}/pricing`, priority: 0.9, changeFrequency: "weekly", lastModified: new Date("2025-06-01") },
    { url: `${base}/blog`, priority: 0.95, changeFrequency: "daily", lastModified: now },
    { url: `${base}/about`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date("2025-01-01") },
    { url: `${base}/contact`, priority: 0.8, changeFrequency: "monthly", lastModified: new Date("2025-01-01") },
    { url: `${base}/industries`, priority: 0.95, changeFrequency: "weekly", lastModified: new Date("2025-06-01") },
    { url: `${base}/terms`, priority: 0.5, changeFrequency: "monthly", lastModified: new Date("2025-01-01") },
    { url: `${base}/privacy`, priority: 0.5, changeFrequency: "monthly", lastModified: new Date("2025-01-01") },
  ];

  // 2. Official Industry Landing Pages
  const officialIndustryPages: MetadataRoute.Sitemap = [
    { url: `${base}/industries/pharma`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/fmcg`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/electronics`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/garments`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/hardware`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/services`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/general-trading`, priority: 0.9, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/wholesale`, priority: 0.85, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/retail`, priority: 0.85, changeFrequency: "weekly", lastModified: now },
    { url: `${base}/industries/bakery`, priority: 0.85, changeFrequency: "weekly", lastModified: now },
  ];

  // 3. Local SEO City Pages
  const cityPages: MetadataRoute.Sitemap = Object.keys(CITIES_DATA).map((slug) => ({
    url: `${base}/city/${slug}`,
    priority: 0.85,
    changeFrequency: "weekly" as const,
    lastModified: now,
  }));

  // 4. All 23 Category Hub Pages
  const categories = getAllCategories();
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${base}/blog/category/${cat.slug}`,
    priority: 0.85,
    changeFrequency: "weekly" as const,
    lastModified: now,
  }));

  // 5. All 280 Blog Post Pages with actual publication dates
  const blogs = getAllBlogs();
  const blogPages: MetadataRoute.Sitemap = blogs.map((post) => {
    let postDate = now;
    if (post.published_at) {
      const parsed = new Date(post.published_at);
      if (!isNaN(parsed.getTime())) {
        postDate = parsed;
      }
    }
    return {
      url: `${base}/blog/${post.slug}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
      lastModified: postDate,
    };
  });

  return [
    ...corePages,
    ...officialIndustryPages,
    ...cityPages,
    ...categoryPages,
    ...blogPages,
  ];
}
