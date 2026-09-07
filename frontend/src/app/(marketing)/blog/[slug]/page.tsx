import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getBlogBySlug, getRelatedBlogs, getAllBlogs } from "@/lib/blog-data-loader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const blogs = getAllBlogs();
  return blogs.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) return { title: "Post Not Found | UdyogBill" };

  return {
    title: post.meta_title || `${post.title} | UdyogBill`,
    description: post.meta_description || post.excerpt,
    keywords: post.meta_keywords || post.focus_keyword,
    alternates: {
      canonical: post.canonical_url || `https://udyogbill.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.og_title || post.title,
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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);

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
    "datePublished": post.published_at || new Date().toISOString(),
    "dateModified": post.published_at || new Date().toISOString(),
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
      <link rel="stylesheet" href="/css/udyogbill-blog.css" />
      <div className="ub-blog-page max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
            {post.views_count > 0 && (
              <>
                <span>&bull;</span>
                <span>{post.views_count.toLocaleString()} views</span>
              </>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <img
              src={post.featured_image.startsWith('http') ? post.featured_image : `/${post.featured_image.replace(/^\//, '')}`}
              alt={post.title}
              className="w-full h-auto max-h-[460px] object-cover"
            />
          </div>
        )}

        {/* Body Content */}
        <article
          className="ub-blog-body prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:text-orange-700 prose-img:rounded-xl prose-img:border"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* In-Article Conversion CTA Box */}
        <div className="my-10 p-6 sm:p-8 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-white">
              Try It In Your Business
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">Billing aur Stock Sambhalein</h2>
            <p className="text-xs sm:text-sm text-white/90 max-w-md">
              In guides me jo process bataya gaya hai, use UdyogBill software ke sath 30 seconds me execute karein.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 font-bold rounded-xl text-xs text-center shadow-lg transition-all"
            >
              Start 14-Day Free Trial
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-4 py-3 bg-black/20 hover:bg-black/30 text-white font-semibold rounded-xl text-xs text-center border border-white/30 transition-all"
            >
              See Pricing
            </Link>
          </div>
        </div>

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
    </>
  );
}
