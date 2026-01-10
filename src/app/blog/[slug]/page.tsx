import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata from MDX exports
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const mod = (await import(`~/content/blog/${slug}.mdx`)) as {
      metadata?: Metadata;
    };
    return mod.metadata ?? {};
  } catch {
    return {};
  }
}

// Calculate reading time from raw MDX content
function calculateReadingTime(content: string): number {
  const text = content
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/<[^>]+>/g, "") // JSX tags
    .replace(/export\s+const\s+metadata[\s\S]*?};/g, "") // metadata
    .replace(/import[\s\S]*?from\s*["'][^"']+["'];?/g, ""); // imports
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const contentDir = path.join(process.cwd(), "src/content/blog");
  const files = await fs.readdir(contentDir);
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => ({ slug: file.replace(/\.mdx$/, "") }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const filePath = path.join(process.cwd(), "src/content/blog", `${slug}.mdx`);

  // Read raw content for reading time calculation
  let readingTime: number;
  try {
    const content = await fs.readFile(filePath, "utf-8");
    readingTime = calculateReadingTime(content);
  } catch {
    notFound();
  }

  // Dynamic import of the MDX file
  let MDXContent: React.ComponentType;
  try {
    const mod = (await import(`~/content/blog/${slug}.mdx`)) as {
      default: React.ComponentType;
    };
    MDXContent = mod.default;
  } catch {
    notFound();
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">{readingTime} min read</p>
      <MDXContent />
    </>
  );
}
