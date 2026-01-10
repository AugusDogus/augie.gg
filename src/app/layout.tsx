import "~/styles/globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Footer } from "~/components/footer";
import { ThemeProvider } from "~/components/theme-provider";

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
  icons: [{ rel: "icon", url: "/pfp.png" }],
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
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="mx-auto flex min-h-screen max-w-[72ch] flex-col justify-between p-6 pt-0 md:pt-8">
            <main className="w-full space-y-6">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
