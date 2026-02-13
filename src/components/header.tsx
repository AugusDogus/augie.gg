"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "~/components/theme-toggle";

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const segments = pathname.split("/").filter(Boolean);

  return (
    <header
      className={`flex items-center ${isHome ? "justify-end" : "justify-between"}`}
    >
      {!isHome && (
        <nav className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          {segments.map((segment, index) => {
            const href = "/" + segments.slice(0, index + 1).join("/");
            const isLast = index === segments.length - 1;

            return (
              <span key={href} className="flex items-center gap-1">
                <span>/</span>
                {isLast ? (
                  <span className="text-foreground max-w-[200px] truncate">
                    {formatSegment(segment)}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="hover:text-foreground transition-colors"
                  >
                    {formatSegment(segment)}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      )}
      <ThemeToggle
        className={isHome ? "absolute top-4 right-6 md:static" : ""}
      />
    </header>
  );
}
