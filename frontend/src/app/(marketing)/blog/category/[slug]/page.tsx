import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getAllCategories } from "@/lib/blog-data-loader";
import BlogCategoryClient from "./category-client";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found | UdyogBill" };

  return {
    title: `${category.name} Guides & Tutorials | UdyogBill Blog`,
    description: category.description || `${category.name} se judi saari practical guides, GST compliance aur best practices UdyogBill par padhein.`,
    alternates: {
      canonical: `https://udyogbill.com/blog/category/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} Guides | UdyogBill`,
      description: category.description || `${category.name} business guides and GST insights.`,
      url: `https://udyogbill.com/blog/category/${category.slug}`,
      siteName: "UdyogBill",
      type: "website",
    },
  };
}

export default function BlogCategoryPage({ params }: CategoryPageProps) {
  return <BlogCategoryClient params={params} />;
}
