"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "~/components/theme-toggle";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="flex items-center justify-between">
      {isHome ? (
        <div />
      ) : (
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Home
        </Link>
      )}
      <ThemeToggle />
    </header>
  );
}
