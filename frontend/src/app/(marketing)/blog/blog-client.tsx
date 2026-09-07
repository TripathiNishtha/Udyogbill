"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getAllBlogs, getAllCategories } from "@/lib/blog-data-loader";

export default function BlogIndexPage() {
  const allBlogs = getAllBlogs();
  const categories = getAllCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  const filteredBlogs = useMemo(() => {
    return allBlogs.filter((post) => {
      const matchesCategory = selectedCategory ? post.category_id === selectedCategory : true;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q
        ? post.title.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          (post.focus_keyword && post.focus_keyword.toLowerCase().includes(q))
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [allBlogs, searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredBlogs.length / postsPerPage) || 1;
  const paginatedBlogs = filteredBlogs.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  return (
    <>
      <link rel="stylesheet" href="/css/udyogbill-blog.css" />
      <div className="ub-blog-index max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6">
        {/* Blog Hero Banner */}
        <header
          className="ub-blog-index-hero text-center max-w-4xl mx-auto mb-8"
          style={{
            background: "linear-gradient(135deg, #15803d 0%, #16a34a 45%, #ea580c 100%)",
            borderRadius: "16px",
            padding: "2.5rem 1.5rem",
            color: "#ffffff",
            boxShadow: "0 10px 30px rgba(22, 163, 74, 0.15)"
          }}
        >
          <h1 style={{ color: "#ffffff", fontSize: "clamp(1.75rem, 3vw, 2.4rem)", fontWeight: 800, margin: "0 0 0.6rem", letterSpacing: "-0.02em" }}>
            UdyogBill Blog &amp; Guides
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.92)", fontSize: "1rem", maxWidth: "60ch", margin: "0 auto", lineHeight: 1.6 }}>
            GST billing, stock, POS aur business growth â€” practical guides Indian shopkeepers, distributors aur enterprises ke liye.
          </p>
        </header>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Topic search karo â€” pharmacy, GST, retail, inventory, barcode..."
            style={{
              flex: 1,
              padding: "0.75rem 1.1rem",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              fontSize: "0.95rem",
              outline: "none",
              background: "#ffffff",
              color: "#0f172a",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                background: "#f1f5f9",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              border: selectedCategory === null ? "none" : "1px solid #e2e8f0",
              background: selectedCategory === null ? "#ea580c" : "#f8fafc",
              color: selectedCategory === null ? "#ffffff" : "#334155",
              boxShadow: selectedCategory === null ? "0 2px 8px rgba(234, 88, 12, 0.3)" : "none"
            }}
          >
            All Guides ({allBlogs.length})
          </button>
          {categories.slice(0, 10).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                setCurrentPage(1);
              }}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                border: selectedCategory === cat.id ? "none" : "1px solid #e2e8f0",
                background: selectedCategory === cat.id ? "#ea580c" : "#f8fafc",
                color: selectedCategory === cat.id ? "#ffffff" : "#334155",
                boxShadow: selectedCategory === cat.id ? "0 2px 8px rgba(234, 88, 12, 0.3)" : "none"
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Main Grid: Articles + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <main className="lg:col-span-8">
            {paginatedBlogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ color: "#64748b", fontSize: "0.95rem", margin: 0 }}>
                  Koi guide nahi mili. Search query badal kar dekhein.
                </p>
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
                      justifyContent: "space-between",
                      transition: "transform 0.15s, box-shadow 0.15s"
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
                          {post.category ? post.category.name : "Guide"}
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
                        Read full guide â†’
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
                  Â« Previous
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
                  Next Â»
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
                In guides me jo tips hain, wahi apne business me apply karo â€” billing, stock, GST sab ek jagah automate karein.
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
                  Start 14-Day Free Trial â†’
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

            {/* Categories List */}
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
                Browse by Category
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.45rem 0.65rem",
                      borderRadius: "8px",
                      border: "none",
                      background: selectedCategory === null ? "#fff7ed" : "transparent",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: selectedCategory === null ? 700 : 500, color: selectedCategory === null ? "#ea580c" : "#1e293b" }}>
                      All Articles
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "999px" }}>
                      {allBlogs.length}
                    </span>
                  </button>
                </li>
                {categories.map((cat) => {
                  const count = allBlogs.filter((b) => b.category_id === cat.id).length;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <li key={cat.id}>
                      <button
                        onClick={() => {
                          setSelectedCategory(isSelected ? null : cat.id);
                          setCurrentPage(1);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.45rem 0.65rem",
                          borderRadius: "8px",
                          border: "none",
                          background: isSelected ? "#fff7ed" : "transparent",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <span style={{ fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#ea580c" : "#1e293b" }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: "999px" }}>
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Popular Guides */}
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
                Popular Guides
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { title: "Pharmacy Billing Software Guide", href: "/blog/category/pharmacy" },
                  { title: "GST Invoicing Best Practices", href: "/blog/category/gst-billing" },
                  { title: "Retail & Kirana POS Billing", href: "/blog/category/retail-billing" },
                  { title: "Smart Inventory & Stock Control", href: "/blog/category/inventory" },
                  { title: "E-Invoicing Compliance India", href: "/blog/category/e-invoicing" }
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link href={item.href} style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
                      â€¢ {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

