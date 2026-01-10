import Link from "next/link";
import { AgeCounter } from "~/components/age-counter";
import { ThemeToggle } from "~/components/theme-toggle";
import { Separator } from "~/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { getBlogPosts } from "~/lib/blog";

export default async function Home() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="space-y-6">
      {/* Header with theme toggle */}
      <div className="flex items-center justify-between">
        <div />
        <ThemeToggle />
      </div>

      {/* Hero section */}
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Augie Luebbers</h1>
        <p className="text-muted-foreground">
          <AgeCounter />
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Full-stack developer based in Pensacola, FL. Currently building modern
          web experiences at{" "}
          <a
            href="https://www.amli.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary underline underline-offset-4 transition-colors"
          >
            AMLI Residential
          </a>
          . Passionate about TypeScript, React, Next.js, and developer tooling.
        </p>
      </section>

      {/* Blog section - only shows if there are posts */}
      {blogPosts.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Writing</h2>
            <div className="grid gap-4">
              {blogPosts.slice(0, 3).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
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
                  </Card>
                </Link>
              ))}
            </div>
            {blogPosts.length > 3 && (
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                View all posts →
              </Link>
            )}
          </section>
        </>
      )}

      <Separator />

      {/* Work section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Work</h2>
        <ul className="text-muted-foreground space-y-2">
          <li>
            <span className="text-foreground">Senior Software Developer</span>{" "}
            at Provalus (2023–Present)
          </li>
          <li>
            <span className="text-foreground">
              Mid-Level Software Developer
            </span>{" "}
            at Provalus (2020–2022)
          </li>
          <li>
            <span className="text-foreground">Software Developer</span> at
            University of West Florida (2017–2019)
          </li>
        </ul>
      </section>

      <Separator />

      {/* Tech stack section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Stack</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>
            <span className="text-foreground">Frontend:</span> TypeScript,
            React, Next.js, Tailwind CSS
          </li>
          <li>
            <span className="text-foreground">Backend:</span> Node.js, tRPC,
            Hono, GraphQL
          </li>
          <li>
            <span className="text-foreground">Database:</span> PostgreSQL,
            Redis, Drizzle, Prisma
          </li>
          <li>
            <span className="text-foreground">Tools:</span> Cursor, Bun,
            Playwright, Sentry
          </li>
        </ul>
      </section>
    </div>
  );
}
