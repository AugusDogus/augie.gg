import Link from "next/link";
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getBlogPosts } from "~/lib/blog";

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Blog</h1>
      <div className="grid gap-3 md:gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="ring-foreground/10 bg-card text-card-foreground hover:ring-foreground/20 flex flex-col gap-4 rounded-lg py-4 ring-1 transition-all"
          >
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{post.description}</CardDescription>
              <CardDescription className="text-muted-foreground/60 text-xs">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
          </Link>
        ))}
      </div>
      {posts.length === 0 && (
        <p className="text-muted-foreground text-sm">No posts yet.</p>
      )}
    </div>
  );
}
