import { promises as fs } from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
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
  const metadataMatch = content.match(
    /export\s+const\s+metadata\s*=\s*\{([^}]+)\}/,
  );

  if (metadataMatch?.[1]) {
    const metadataContent = metadataMatch[1];

    // Extract title
    const titleMatch = metadataContent.match(/title:\s*["'`]([^"'`]+)["'`]/);
    if (titleMatch?.[1]) metadata.title = titleMatch[1];

    // Extract description
    const descMatch = metadataContent.match(
      /description:\s*["'`]([^"'`]+)["'`]/,
    );
    if (descMatch?.[1]) metadata.description = descMatch[1];

    // Extract date
    const dateMatch = metadataContent.match(/date:\s*["'`]([^"'`]+)["'`]/);
    if (dateMatch?.[1]) metadata.date = dateMatch[1];
  }

  return metadata;
}
