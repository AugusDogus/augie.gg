import Link from "next/link";
import { AgeCounter } from "~/components/age-counter";
import { Avatar } from "~/components/avatar";
import { Header } from "~/components/header";
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { getBlogPosts } from "~/lib/blog";

export default async function Home() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="space-y-4 md:space-y-6">
      <Header />

      {/* Hero section */}
      <section className="space-y-3 md:space-y-4">
        <div className="flex items-center gap-4 md:gap-6">
          <Avatar />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Augie Luebbers
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              <AgeCounter />
            </p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
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
                <CardTitle>{blogPosts[0]!.title}</CardTitle>
                <CardDescription>{blogPosts[0]!.description}</CardDescription>
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
