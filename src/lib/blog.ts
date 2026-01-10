import { promises as fs } from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
}

// Calculate estimated reading time from text content
export function calculateReadingTime(text: string, wordsPerMinute = 225): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute for very short posts
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const blogDirectory = path.join(process.cwd(), "src", "app", "blog");

  try {
    const entries = await fs.readdir(blogDirectory, { withFileTypes: true });
    const slugs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const posts = await Promise.all(
      slugs.map(async (slug) => {
        const filePath = path.join(blogDirectory, slug, "page.mdx");
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const metadata = extractMetadata(content);
          return {
            slug,
            title: metadata.title ?? slug,
            description: metadata.description ?? "",
            date: metadata.date ?? new Date().toISOString().split("T")[0]!,
          };
        } catch {
          return null;
        }
      }),
    );

    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

function extractMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  // Match export const metadata = { ... }
  const metadataRegex = /export\s+const\s+metadata\s*=\s*\{([^}]+)\}/;
  const metadataMatch = metadataRegex.exec(content);

  if (metadataMatch?.[1]) {
    const metadataContent = metadataMatch[1];

    // Extract title
    const titleRegex = /title:\s*["'`]([^"'`]+)["'`]/;
    const titleMatch = titleRegex.exec(metadataContent);
    if (titleMatch?.[1]) metadata.title = titleMatch[1];

    // Extract description
    const descRegex = /description:\s*["'`]([^"'`]+)["'`]/;
    const descMatch = descRegex.exec(metadataContent);
    if (descMatch?.[1]) metadata.description = descMatch[1];

    // Extract date
    const dateRegex = /date:\s*["'`]([^"'`]+)["'`]/;
    const dateMatch = dateRegex.exec(metadataContent);
    if (dateMatch?.[1]) metadata.date = dateMatch[1];
  }

  return metadata;
}
