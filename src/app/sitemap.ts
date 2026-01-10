import { promises as fs } from "fs";
import path from "path";

const SITE_URL = "https://augie.gg";

async function getBlogSlugs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, {
      recursive: true,
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isFile() && entry.name === "page.mdx")
      .map((entry) => {
        const relativePath = path.relative(
          dir,
          path.join(entry.parentPath, entry.name),
        );
        return path.dirname(relativePath);
      })
      .map((slug) => slug.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const blogDirectory = path.join(process.cwd(), "src", "app", "blog");
  const slugs = await getBlogSlugs(blogDirectory);

  const blogPosts = slugs.map((slug) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: new Date().toISOString(),
  }));

  const routes = [""].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return [...routes, ...blogPosts];
}
