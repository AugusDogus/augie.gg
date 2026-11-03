import "~/styles/globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { FlightBackground } from "~/components/flight-background";
import { DEFAULT_APP_TITLE } from "~/lib/site";

const instrument = localFont({
  src: "../assets/fonts/instrument-sans-latin.woff2",
  variable: "--font-instrument",
  weight: "400 600",
  display: "swap",
});
const newsreader = localFont({
  src: "../assets/fonts/newsreader-medium.ttf",
  variable: "--font-newsreader",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://augie.gg"),
  alternates: { canonical: "/" },
  title: { default: DEFAULT_APP_TITLE, template: `%s | ${DEFAULT_APP_TITLE}` },
  description:
    "Augie Luebbers, Product Engineer. Selected projects and open source contributions.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrument.variable} ${newsreader.variable}`}>
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
