"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getAllBlogs, getAllCategories } from "@/lib/blog-data-loader";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default function BlogCategoryPage({ params }: CategoryPageProps) {
  const { slug } = use(params);
  const category = getCategoryBySlug(slug);
  const allBlogs = getAllBlogs();
  const categories = getAllCategories();
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  if (!category) {
    notFound();
  }

  const categoryBlogs = useMemo(() => {
    return allBlogs.filter((b) => b.category_id === category.id);
  }, [allBlogs, category.id]);

  const totalPages = Math.ceil(categoryBlogs.length / postsPerPage) || 1;
  const paginatedBlogs = categoryBlogs.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const siteUrl = "https://udyogbill.com";
  const categoryUrl = `${siteUrl}/blog/category/${category.slug}`;

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
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
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${category.name} Guides`,
        "item": categoryUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <link rel="stylesheet" href="/css/udyogbill-blog.css" />
      <div className="ub-blog-index max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-orange-600">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-orange-600">Blog</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{category.name}</span>
        </nav>

        {/* Category Hero Banner */}
        <header
          className="text-center max-w-4xl mx-auto mb-8"
          style={{
            background: "linear-gradient(135deg, #15803d 0%, #16a34a 45%, #ea580c 100%)",
            borderRadius: "16px",
            padding: "2.5rem 1.5rem",
            color: "#ffffff",
            boxShadow: "0 10px 30px rgba(22, 163, 74, 0.15)"
          }}
        >
          <span style={{
            display: "inline-block",
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#ffffff",
            background: "rgba(0, 0, 0, 0.2)",
            padding: "3px 10px",
            borderRadius: "999px",
            marginBottom: "0.6rem"
          }}>
            Topic Cluster
          </span>
          <h1 style={{ color: "#ffffff", fontSize: "clamp(1.75rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 0.6rem", letterSpacing: "-0.02em" }}>
            {category.name} Guides
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.92)", fontSize: "1rem", maxWidth: "60ch", margin: "0 auto", lineHeight: 1.6 }}>
            {category.description || `${category.name} se related saari important guides, GST niyam aur operational tips.`}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <main className="lg:col-span-8">
            {paginatedBlogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 1rem" }}>
                  Is category me abhi koi guide publish nahi hui hai.
                </p>
                <Link href="/blog" style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                  ← Saari 280+ Guides Dekhein
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedBlogs.map((post) => (
                  <article
                    key={post.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      borderLeft: "4px solid #16a34a",
                      padding: "1.25rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        <span style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "#15803d",
                          background: "#ecfdf5",
                          padding: "3px 8px",
                          borderRadius: "4px"
                        }}>
                          {category.name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                          {post.reading_time || 4} min read
                        </span>
                      </div>

                      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, lineHeight: 1.35, margin: "0.4rem 0 0.6rem" }}>
                        <Link href={`/blog/${post.slug}`} style={{ color: "#0f172a", textDecoration: "none" }}>
                          {post.title}
                        </Link>
                      </h2>

                      <p style={{
                        fontSize: "0.85rem",
                        color: "#475569",
                        lineHeight: 1.6,
                        margin: "0 0 1rem",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {post.excerpt || post.title}
                      </p>
                    </div>

                    <div style={{
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <Link
                        href={`/blog/${post.slug}`}
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#ea580c",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        Read full guide →
                      </Link>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "2.5rem" }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.4 : 1,
                    background: "#ffffff",
                    color: "#334155"
                  }}
                >
                  « Previous
                </button>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", padding: "0 0.5rem" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    background: "#ffffff",
                    color: "#334155"
                  }}
                >
                  Next »
                </button>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Trial CTA Card */}
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #fff7ed 100%)",
              border: "1px solid #bbf7d0",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(22, 163, 74, 0.08)"
            }}>
              <span style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#15803d",
                background: "#dcfce7",
                padding: "3px 10px",
                borderRadius: "999px",
                marginBottom: "0.75rem"
              }}>
                Zero Setup Fee
              </span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
                UdyogBill Try Karo
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.6, margin: "0 0 1.25rem" }}>
                {category.name} se jude sabhi billing, batch, inventory aur GST niyam UdyogBill software me automate karein.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <Link
                  href="/register"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "0.7rem 1rem",
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)"
                  }}
                >
                  Start 14-Day Free Trial →
                </Link>
                <Link
                  href="/pricing"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "0.65rem 1rem",
                    background: "#ffffff",
                    color: "#334155",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  See Transparent Pricing
                </Link>
              </div>
            </div>

            {/* Other Categories List */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1.25rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
            }}>
              <h3 style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#0f172a",
                margin: "0 0 1rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #f1f5f9"
              }}>
                All Categories
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>
                  <Link
                    href="/blog"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#1e293b",
                      fontSize: "0.85rem",
                      fontWeight: 500
                    }}
                  >
                    <span>All Articles</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "999px" }}>
                      {allBlogs.length}
                    </span>
                  </Link>
                </li>
                {categories.map((cat) => {
                  const count = allBlogs.filter((b) => b.category_id === cat.id).length;
                  const isCurrent = cat.id === category.id;
                  return (
                    <li key={cat.id}>
                      <Link
                        href={`/blog/category/${cat.slug}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.45rem 0.65rem",
                          borderRadius: "8px",
                          textDecoration: "none",
                          background: isCurrent ? "#fff7ed" : "transparent",
                          color: isCurrent ? "#ea580c" : "#1e293b",
                          fontWeight: isCurrent ? 700 : 500,
                          fontSize: "0.85rem"
                        }}
                      >
                        <span>{cat.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "999px" }}>
                          {count}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
