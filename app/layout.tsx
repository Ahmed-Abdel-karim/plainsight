import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const TITLE = "Plainsight — Explore short-term rental markets";
const DESCRIPTION =
  "Where short-term rentals are, what they cost, and who controls the market. Built on dated public Inside Airbnb snapshots.";

export const metadata: Metadata = {
  // Resolves relative `alternates.canonical` paths (set per-city) to absolute
  // URLs. Override via NEXT_PUBLIC_SITE_URL in deployed environments.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: TITLE,
  description: DESCRIPTION,
  // Open Graph image comes from app/opengraph-image.tsx (auto-injected by Next
  // into both openGraph and twitter); city pages inherit it.
  openGraph: {
    type: "website",
    siteName: "Plainsight",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        inter.variable,
        jetbrainsMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <div className="fixed top-4 right-4 z-50 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-full border border-border bg-card text-foreground"
            >
              <a
                href="https://github.com/Ahmed-Abdel-karim/plainsight"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Plainsight on GitHub (opens in a new tab)"
                title="View Plainsight on GitHub (opens in a new tab)"
              >
                <GitHubLogoIcon aria-hidden="true" />
              </a>
            </Button>
            <ThemeToggle />
          </div>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
