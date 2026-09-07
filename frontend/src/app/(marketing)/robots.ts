import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/pricing", "/about", "/contact", "/industries", "/city", "/blog", "/register", "/login"],
        disallow: ["/app/", "/admin/", "/api/"],
      },
    ],
    sitemap: "https://udyogbill.com/sitemap.xml",
  };
}
