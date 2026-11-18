import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getBlogBySlug, getRelatedBlogs, getAllBlogs } from "@/lib/blog-data-loader";
import { BlogViewTracker } from "../blog-view-tracker";
import { BlogLeadCaptureCard } from "@/components/blog/blog-lead-capture-card";
import { StickyMobileLeadBar } from "@/components/blog/sticky-mobile-lead-bar";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

async function resolvePost(slug: string) {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();
  const localPost = getBlogBySlug(slug);

  // 1. Check dynamic database backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050/api/v1";
    const res = await fetch(`${backendUrl}/public/blogs/${encodeURIComponent(cleanSlug)}`, {
      next: { revalidate: 30 }
    });
    if (res.ok) {
      const b = await res.json();
      if (b && b.slug) {
        let finalImage = b.featured_image;
        if (!finalImage || finalImage.startsWith("blog/") || finalImage.includes("default.svg") || !finalImage.startsWith("/img/blog/")) {
          finalImage = localPost?.featured_image || `/img/blog/covers/${b.slug}.svg`;
        }

        return {
          id: b.id,
          title: b.title,
          slug: b.slug,
          excerpt: b.excerpt || b.title,
          content: localPost?.content || b.content || "",
          featured_image: finalImage,
          category_id: b.category_id || "2",
          author_name: b.author_name || "UdyogBill Editorial Team",
          status: b.status || "published",
          published_at: b.published_at || new Date().toISOString(),
          meta_title: b.meta_title || `${b.title} | UdyogBill`,
          meta_description: b.meta_description || b.excerpt,
          meta_keywords: b.meta_keywords || "",
          focus_keyword: b.focus_keyword || "",
          canonical_url: b.canonical_url || `https://udyogbill.com/blog/${b.slug}`,
          og_title: b.og_title || b.title,
          og_description: b.og_description || b.meta_description || b.excerpt,
          og_image: finalImage,
          reading_time: b.reading_time || 5,
          views_count: b.views_count || 0,
          created_at: b.created_at,
          updated_at: b.updated_at,
          category: {
            id: b.category_id || "2",
            name: b.category_name || "General Business",
            slug: (b.category_name || "general").toLowerCase().replace(/\s+/g, "-"),
            description: ""
          }
        };
      }
    }
  } catch (err) {
    // Fallback to static blog data
  }

  return localPost;
}

export async function generateStaticParams() {
  const blogs = getAllBlogs();
  return blogs.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return { title: { absolute: "Post Not Found | UdyogBill" } };

  const rawTitle = post.meta_title || post.title;
  const cleanTitle = rawTitle.replace(/(\s*\|\s*UdyogBill\s*)+$/i, "").trim();
  const finalTitle = `${cleanTitle} | UdyogBill`;

  return {
    title: {
      absolute: finalTitle,
    },
    description: post.meta_description || post.excerpt,
    keywords: post.meta_keywords || post.focus_keyword,
    alternates: {
      canonical: post.canonical_url || `https://udyogbill.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.og_title || cleanTitle,
      description: post.og_description || post.meta_description || post.excerpt,
      url: `https://udyogbill.com/blog/${post.slug}`,
      siteName: "UdyogBill",
      images: post.og_image || post.featured_image ? [{ url: post.og_image || post.featured_image! }] : undefined,
      type: "article",
      publishedTime: post.published_at || undefined,
      authors: [post.author_name || "UdyogBill Editorial Team"],
    },
  };
}

function extractFaqSchema(html: string) {
  if (!html) return null;
  const faqs: Array<{ question: string; answer: string }> = [];

  // Pattern 1: .ub-blog-faq-item
  const faqItemRegex = /<div[^>]*class=["'][^"']*ub-blog-faq-item[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while ((match = faqItemRegex.exec(html)) !== null) {
    const block = match[1];
    const qMatch = block.match(/<div[^>]*class=["'][^"']*ub-blog-faq-item__q[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const aMatch = block.match(/<div[^>]*class=["'][^"']*ub-blog-faq-item__a[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (qMatch && aMatch) {
      const q = qMatch[1].replace(/<[^>]+>/g, "").trim();
      const a = aMatch[1].replace(/<[^>]+>/g, "").trim();
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }

  // Pattern 2: <details><summary>Question</summary><p>Answer</p></details>
  if (faqs.length === 0) {
    const detailsRegex = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/gi;
    let dMatch;
    while ((dMatch = detailsRegex.exec(html)) !== null) {
      const q = dMatch[1].replace(/<[^>]+>/g, "").trim();
      const a = dMatch[2].replace(/<[^>]+>/g, "").trim();
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }

  // Pattern 3: <h3>Q...</h3> or <h3>... ?</h3> followed by <p>
  if (faqs.length === 0) {
    const h3Regex = /<h3[^>]*>([\s\S]*?\?|Q\d*[:\s][\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
    let h3Match;
    while ((h3Match = h3Regex.exec(html)) !== null) {
      const q = h3Match[1].replace(/<[^>]+>/g, "").trim();
      const a = h3Match[2].replace(/<[^>]+>/g, "").trim();
      if (q && a && q.length > 5 && a.length > 10) {
        faqs.push({ question: q, answer: a });
      }
    }
  }

  // Pattern 4: <strong>Q: ...</strong> followed by <p> or text
  if (faqs.length === 0) {
    const strongQRegex = /<p[^>]*>\s*<strong>(?:Q|Question)\s*[:\-\d.]*([\s\S]*?)<\/strong>\s*<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
    let sMatch;
    while ((sMatch = strongQRegex.exec(html)) !== null) {
      const q = sMatch[1].replace(/<[^>]+>/g, "").trim();
      const a = sMatch[2].replace(/<[^>]+>/g, "").trim();
      if (q && a) faqs.push({ question: q, answer: a });
    }
  }

  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.slice(0, 10).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) {
    notFound();
  }

  const related = getRelatedBlogs(post, 4);

  const articleUrl = `https://udyogbill.com/blog/${post.slug}`;
  const siteUrl = "https://udyogbill.com";
  const imageUrl = post.og_image || post.featured_image
    ? (post.og_image || post.featured_image)!.startsWith("http")
      ? (post.og_image || post.featured_image)!
      : `${siteUrl}/${(post.og_image || post.featured_image)!.replace(/^\//, "")}`
    : `${siteUrl}/logo.png`;

  // Stable dates for SEO trust
  const publishedDate = post.published_at || "2026-01-15T00:00:00Z";
  const modifiedDate = post.updated_at || post.published_at || "2026-01-15T00:00:00Z";

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    "headline": post.title,
    "description": post.meta_description || post.excerpt,
    "image": [imageUrl],
    "datePublished": publishedDate,
    "dateModified": modifiedDate,
    "author": {
      "@type": "Organization",
      "name": post.author_name || "UdyogBill Editorial Team",
      "url": siteUrl,
    },
    "publisher": {
      "@type": "Organization",
      "name": "UdyogBill (DigiOpera Private Limited)",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`,
      },
    },
    "keywords": post.focus_keyword || post.meta_keywords || "billing software, GST invoicing, inventory",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".ub-blog-body h2", ".ub-blog-body p:first-of-type"]
    }
  };



  const breadcrumbsList: Array<{ "@type": string; position: number; name: string; item: string }> = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": siteUrl,
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": `${siteUrl}/blog`,
    },
  ];

  if (post.category) {
    breadcrumbsList.push({
      "@type": "ListItem",
      "position": 3,
      "name": post.category.name,
      "item": `${siteUrl}/blog/category/${post.category.slug}`,
    });
    breadcrumbsList.push({
      "@type": "ListItem",
      "position": 4,
      "name": post.title,
      "item": articleUrl,
    });
  } else {
    breadcrumbsList.push({
      "@type": "ListItem",
      "position": 3,
      "name": post.title,
      "item": articleUrl,
    });
  }

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbsList,
  };

  const jsonLdFaq = extractFaqSchema(post.content);

  // Safe Split content for Mid-Article Lead Capture without breaking DOM tags
  let contentPart1 = post.content;
  let contentPart2: string | null = null;

  if (post.content.includes("<!-- MID_ARTICLE_CTA -->")) {
    const parts = post.content.split("<!-- MID_ARTICLE_CTA -->");
    contentPart1 = parts[0];
    contentPart2 = parts.slice(1).join("");
  } else {
    // Only split at top-level H2 to prevent cutting through unclosed divs, grids or tables
    const h2Matches = Array.from(post.content.matchAll(/<\/h2>/gi)) as RegExpExecArray[];
    if (h2Matches.length >= 4 && typeof h2Matches[0]?.index === 'number') {
      const midH2Index = Math.floor(h2Matches.length / 2);
      const splitPos = (h2Matches[midH2Index].index || 0) + 5;
      contentPart1 = post.content.slice(0, splitPos);
      contentPart2 = post.content.slice(splitPos);
    }
  }
  const isLongArticle = Boolean(contentPart2);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      {jsonLdFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      )}
      <link rel="stylesheet" href="/css/udyogbill-blog.css" />
      <div className="ub-blog-page max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-20 sm:pb-8">
        {/* Breadcrumbs */}
        <nav className="ub-blog-breadcrumb text-xs text-slate-500 mb-6 flex flex-wrap items-center gap-1.5">
          <Link href="/" className="hover:text-orange-600">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-orange-600">Blog</Link>
          {post.category && (
            <>
              <span>/</span>
              <Link href={`/blog/category/${post.category.slug}`} className="hover:text-orange-600">{post.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-slate-800 font-medium truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Hero */}
        <header className="mb-8">
          {post.category && (
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200/60 px-2.5 py-1 rounded-full mb-3">
              {post.category.name}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pb-4 border-b border-slate-200">
            <span>By <strong className="text-slate-800">{post.author_name || "UdyogBill Editorial Team"}</strong></span>
            <span>&bull;</span>
            <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
            <span>&bull;</span>
            <span>{post.reading_time || 3} min read</span>
            <BlogViewTracker slug={post.slug} initialViews={post.views_count} />
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-md border border-slate-200/80 bg-slate-100">
            <img
              src={post.featured_image.startsWith('http') ? post.featured_image : `/${post.featured_image.replace(/^\//, '')}`}
              alt={post.title}
              width={1200}
              height={630}
              className="w-full h-auto max-h-[460px] object-cover block"
            />
          </div>
        )}

        {/* Body Content - Part 1 */}
        <article
          className="ub-blog-body prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:text-orange-700 prose-img:rounded-xl prose-img:border"
          dangerouslySetInnerHTML={{ __html: contentPart1 }}
        />

        {/* Mid-Article Lead Capture (High-converting touchpoint) */}
        {isLongArticle && (
          <BlogLeadCaptureCard
            blogSlug={post.slug}
            blogTitle={post.title}
            categoryName={post.category?.name || "Retail"}
            placement="mid-content"
          />
        )}

        {/* Body Content - Part 2 (if split) */}
        {contentPart2 && (
          <article
            className="ub-blog-body prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:text-orange-700 prose-img:rounded-xl prose-img:border mt-6"
            dangerouslySetInnerHTML={{ __html: contentPart2 }}
          />
        )}

        {/* End-of-Article Lead Capture Card */}
        <BlogLeadCaptureCard
          blogSlug={post.slug}
          blogTitle={post.title}
          categoryName={post.category?.name || "Retail"}
          placement="bottom-article"
        />

        {/* Related Guides Grid */}
        {related.length > 0 && (
          <section className="pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Related Business Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((rel) => (
                <article
                  key={rel.id}
                  className="p-4 bg-slate-50 hover:bg-white rounded-xl border border-slate-200/80 hover:border-orange-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {rel.category && (
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1 block">
                        {rel.category.name}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-orange-600 transition-colors mb-1.5">
                      <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {rel.excerpt || rel.title}
                    </p>
                  </div>
                  <Link
                    href={`/blog/${rel.slug}`}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 mt-3 block"
                  >
                    Read guide &rarr;
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile Lead Bar */}
      <StickyMobileLeadBar
        blogTitle={post.title}
        categoryName={post.category?.name || "Retail"}
      />
    </>
  );
}
