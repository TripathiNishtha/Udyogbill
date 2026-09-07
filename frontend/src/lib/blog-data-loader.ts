const blogsData: any = require("@/content/blogs.json");
const categoriesData: any = require("@/content/blog-categories.json");

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  author_name: string;
  status: string;
  published_at: string | null;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  focus_keyword: string;
  canonical_url: string | null;
  og_title: string;
  og_description: string;
  og_image: string | null;
  reading_time: number;
  views_count: number;
  created_at: string | null;
  updated_at: string | null;
  category?: BlogCategory;
}

const blogs: BlogPost[] = (blogsData as BlogPost[]).map((b) => {
  const cat = (categoriesData as BlogCategory[]).find((c) => c.id === b.category_id);
  let normalizedContent = b.content
    ? b.content
        .replace(/https:\/\/www\.udyogbill\.com/g, "")
        .replace(/https:\/\/udyogbill\.com/g, "")
    : "";

  return {
    ...b,
    category: cat,
    content: normalizedContent,
  };
});

const categories: BlogCategory[] = categoriesData as BlogCategory[];

export function getAllBlogs(): BlogPost[] {
  return blogs.filter((b) => b.status === "published" || !b.status);
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();
  return blogs.find(
    (b) => b.slug.toLowerCase().trim() === cleanSlug
  );
}

export function getAllCategories(): BlogCategory[] {
  return categories;
}

export function getCategoryBySlug(slug: string): BlogCategory | undefined {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim();
  return categories.find(
    (c) => c.slug.toLowerCase().trim() === cleanSlug
  );
}

export function getBlogsByCategory(categoryId: string): BlogPost[] {
  return getAllBlogs().filter((b) => b.category_id === categoryId);
}

export function getRelatedBlogs(currentBlog: BlogPost, limit = 4): BlogPost[] {
  return getAllBlogs()
    .filter((b) => b.id !== currentBlog.id && (b.category_id === currentBlog.category_id || !currentBlog.category_id))
    .slice(0, limit);
}

export function searchBlogs(query: string): BlogPost[] {
  if (!query || !query.trim()) return getAllBlogs();
  const q = query.toLowerCase().trim();
  return getAllBlogs().filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.excerpt.toLowerCase().includes(q) ||
      (b.focus_keyword && b.focus_keyword.toLowerCase().includes(q))
  );
}
