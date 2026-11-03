import "~/styles/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { FlightBackground } from "~/components/flight-background";
import { TooltipProvider } from "~/components/ui/tooltip";
import { DEFAULT_APP_TITLE } from "~/lib/site";

// Inter with its optical-size axis: the display cut at headline sizes, text cut below.
const inter = localFont({
  src: "../assets/fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "400 650",
  display: "swap",
  adjustFontFallback: "Arial",
});
const geistMono = localFont({
  src: "../assets/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "400 500",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://augie.gg"),
  alternates: { canonical: "/" },
  title: { default: DEFAULT_APP_TITLE, template: `%s | ${DEFAULT_APP_TITLE}` },
  description:
    "Augie Luebbers is a product engineer building fast, polished software for the web, phones, and the occasional game console.",
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} dark`}>
      <head>
        <link rel="preload" as="image" href="/flight4cover_redux_spread.jpg" />
      </head>
      <body className="min-h-dvh antialiased [text-rendering:optimizeLegibility]">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <FlightBackground />
        <div className="relative">
          <TooltipProvider>{children}</TooltipProvider>
        </div>
      </body>
    </html>
  );
}
