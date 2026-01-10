import "~/styles/globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Footer } from "~/components/footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://augie.gg"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Augie Luebbers",
    template: "%s | Augie Luebbers",
  },
  description:
    "Full-stack developer based in Pensacola, FL. Building modern web experiences.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = stored ?? (prefersDark ? 'dark' : 'light');
                if (theme === 'dark') document.documentElement.classList.add('dark');
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-[72ch] flex-col justify-between p-8 pt-0 md:pt-8">
          <main className="w-full space-y-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
