import Link from "next/link";
import { AgeCounter } from "~/components/age-counter";
import { Avatar } from "~/components/avatar";
import { Header } from "~/components/header";
import { Separator } from "~/components/ui/separator";
import { CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { getBlogPosts } from "~/lib/blog";

export default async function Home() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="space-y-6">
      <Header />

      {/* Hero section */}
      <section className="space-y-4">
        <div className="flex items-center gap-6">
          <Avatar />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Augie Luebbers
            </h1>
            <p className="text-muted-foreground">
              <AgeCounter />
            </p>
          </div>
        </div>
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
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Work</h2>
          <Link
            href="/resume"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Full resume →
          </Link>
        </div>
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

      {/* Projects section */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
          <a
            href="https://github.com/AugusDogus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            GitHub →
          </a>
        </div>
        <ul className="text-muted-foreground space-y-2">
          <li>
            <a
              href="https://opentab.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              opentab.sh
            </a>{" "}
            — Send tabs to your devices instantly
          </li>
          <li>
            <a
              href="https://whisp.chat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              whisp.chat
            </a>{" "}
            — Ephemeral messages and photos
          </li>
          <li>
            <a
              href="https://santahat.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              santahat.gg
            </a>{" "}
            — Slap a Santa hat on your Discord avatar
          </li>
        </ul>
      </section>
    </div>
  );
}
