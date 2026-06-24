import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query/query-provider";
import { SceneProvider } from "@/features/scene";
import { getCitiesData } from "@/data";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cities = await getCitiesData();
  const snapshotById = Object.fromEntries(
    cities.map(({ slug, snapshotId }) => [slug, snapshotId]),
  );
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
          <ThemeToggle />
          <QueryProvider>
            <SceneProvider snapshotById={snapshotById}>
              {children}
            </SceneProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
