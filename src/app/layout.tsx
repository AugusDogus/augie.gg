import "~/styles/globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "~/components/theme-provider";
import { DEFAULT_APP_TITLE } from "~/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL("https://augie.gg"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: DEFAULT_APP_TITLE,
    template: `%s | ${DEFAULT_APP_TITLE}`,
  },
  description: "🍄 Learning",
};

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

/** Film-grain texture, a noise SVG tiled at low opacity over the page. */
const GRAIN_BACKGROUND = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} min-w-[360px] [scrollbar-gutter:stable]`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-dvh antialiased [text-rendering:optimizeLegibility]">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 [background-size:256px_256px] opacity-[0.035]"
          style={{ backgroundImage: GRAIN_BACKGROUND }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="mx-auto flex min-h-dvh max-w-[72ch] flex-col p-6 pt-4 md:pt-8">
            <main className="w-full space-y-6">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
