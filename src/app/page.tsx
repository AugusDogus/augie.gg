import Link from "next/link";
import { Header } from "~/components/header";
import { Hero } from "~/components/hero";
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { getBlogPosts } from "~/lib/blog";

export default async function Home() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="space-y-4 md:space-y-6">
      <Header />

      <Hero />

      {/* Blog section - only shows if there are posts */}
      {blogPosts.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3 md:space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Writing
              </h2>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Blog →
              </Link>
            </div>
            <Link
              href={`/blog/${blogPosts[0]!.slug}`}
              className="ring-foreground/10 bg-card text-card-foreground hover:ring-foreground/20 flex flex-col gap-4 rounded-lg py-4 ring-1 transition-all"
            >
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  {blogPosts[0]!.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {blogPosts[0]!.description}
                </CardDescription>
                <CardDescription className="text-muted-foreground/60 text-xs">
                  {new Date(blogPosts[0]!.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
            </Link>
          </section>
        </>
      )}

      <Separator />

      {/* Work section */}
      <section className="space-y-3 md:space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            Work
          </h2>
          <Link
            href="/resume"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Resume →
          </Link>
        </div>
        <ul className="text-muted-foreground space-y-2 text-sm md:text-base">
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
      <section className="space-y-3 md:space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight md:text-xl">
            Projects
          </h2>
          <a
            href="https://github.com/AugusDogus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            GitHub →
          </a>
        </div>
        <ul className="text-muted-foreground space-y-2 text-sm md:text-base">
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
              href="https://junkyardindex.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              junkyardindex.com
            </a>{" "}
            — Search salvage yard inventory nationwide
          </li>
        </ul>
      </section>
    </div>
  );
}
