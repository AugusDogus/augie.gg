"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { PROTOTYPES, prototypeHref } from "./registry";

const item =
  "flex h-7 min-w-7 items-center justify-center rounded-full px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70";

/** Floating pill for hopping between prototypes and the live home page. */
export function PrototypeSwitcher() {
  const pathname = usePathname();
  const links = [
    { href: "/prototypes", label: "all", title: "All prototypes" },
    { href: "/", label: "live", title: "Current home page" },
    ...PROTOTYPES.map((prototype) => ({
      href: prototypeHref(prototype.slug),
      label: prototype.slug,
      title: `Prototype ${prototype.slug}: ${prototype.name}`,
    })),
  ];

  return (
    <nav
      aria-label="Layout prototypes"
      className="bg-background/80 border-border fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border p-0.5 shadow-sm backdrop-blur-md"
    >
      <ul className="flex items-center text-xs">
        {links.map((link) => {
          const current = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                title={link.title}
                aria-label={link.title}
                aria-current={current ? "page" : undefined}
                className={cn(
                  item,
                  current
                    ? "bg-foreground/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
