import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/pricing", "/about", "/contact", "/industries", "/city", "/blog", "/terms", "/privacy"],
        disallow: ["/app/", "/admin/", "/api/", "/login", "/register"],
      },
    ],
    sitemap: "https://udyogbill.com/sitemap.xml",
  };
}
