import "~/styles/globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ConsoleGreeting } from "~/components/console-greeting";
import { FlightBackground } from "~/components/flight-background";
import { Settled } from "~/components/settled";
import { TooltipProvider } from "~/components/ui/tooltip";
import { WhaleArt } from "~/lib/flight/whale-art";
import { OgVideo } from "~/lib/og-video";
import { cardVideo } from "~/lib/share-card";
import { DEFAULT_APP_TITLE, SITE_URL } from "~/lib/site";
import artwork from "../../public/flight4cover_redux_spread.jpg";

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
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: { default: DEFAULT_APP_TITLE, template: `%s | ${DEFAULT_APP_TITLE}` },
  description: "Product engineer in Pensacola, FL. Building things with AMLI.",
  // Where a link preview plays video, the card's painting moves
  // (scripts/og-video.tsx). The card itself is opengraph-image.tsx.
  openGraph: {
    videos: [cardVideo(OgVideo.HREF)],
  },
  twitter: { card: "summary_large_image" },
};

// The painting runs under the notch in landscape; --gutter keeps content clear of it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} dark`}>
      <head>
        {/*
          The painting the renderer animates, fetched as its fetch() will ask
          for it (flight-background.tsx). Low priority: the poster, fonts, and
          scripts paint the page first.
        */}
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          fetchPriority="low"
          href={artwork.src}
        />
      </head>
      <body className="min-h-dvh antialiased [text-rendering:optimizeLegibility]">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <FlightBackground />
        <ConsoleGreeting art={WhaleArt.lines().join("\n")} />
        <div className="relative">
          <TooltipProvider>{children}</TooltipProvider>
        </div>
        <Settled />
      </body>
    </html>
  );
}
