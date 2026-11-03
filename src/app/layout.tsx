import "~/styles/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { FlightBackground } from "~/components/flight-background";
import { DEFAULT_APP_TITLE } from "~/lib/site";

const literata = localFont({
  src: "../assets/fonts/literata-latin.woff2",
  variable: "--font-literata",
  weight: "400 600",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});
const splineMono = localFont({
  src: "../assets/fonts/spline-sans-mono-500-latin.woff2",
  variable: "--font-spline-mono",
  weight: "500",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "Consolas", "monospace"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://augie.gg"),
  alternates: { canonical: "/" },
  title: { default: DEFAULT_APP_TITLE, template: `%s | ${DEFAULT_APP_TITLE}` },
  description:
    "Augie Luebbers is a product engineer in Pensacola, Florida, and the lead maintainer of AMLI.com at Provalus. Selected work, open source contributions, and résumé.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${literata.variable} ${splineMono.variable}`}>
      <head>
        <link rel="preload" as="image" href="/flight4cover_redux_spread.jpg" />
      </head>
      <body className="min-h-dvh antialiased [text-rendering:optimizeLegibility]">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <FlightBackground />
        <div className="relative">{children}</div>
      </body>
    </html>
  );
}
