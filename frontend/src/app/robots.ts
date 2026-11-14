import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicAllowed = [
    "/",
    "/features",
    "/pricing",
    "/about",
    "/contact",
    "/register",
    "/industries/",
    "/compare/",
    "/tools/",
    "/city/",
    "/blog/",
    "/llms.txt",
    "/terms",
    "/privacy",
  ];
  const privateDisallowed = ["/app/", "/admin/", "/api/", "/login"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Applebot-Extended",
          "Amazonbot",
          "Meta-ExternalAgent",
          "Bingbot",
          "CCBot",
        ],
        allow: publicAllowed,
        disallow: privateDisallowed,
      },
    ],
    sitemap: "https://udyogbill.com/sitemap.xml",
  };
}
