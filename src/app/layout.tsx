import "~/styles/globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Footer } from "~/components/footer";
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
  description: "🍄 Learning • Building • Writing",
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
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="mx-auto flex min-h-dvh max-w-[72ch] flex-col justify-between p-6 pt-4 md:pt-8">
            <main className="w-full space-y-6">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
