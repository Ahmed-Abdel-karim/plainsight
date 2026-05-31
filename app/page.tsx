import { CityPicker } from "@/components/city-picker/city-picker";
import { Logo } from "@/components/logo";

export default async function Home() {
  "use cache";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-background px-6 py-12 text-foreground">
      <header className="flex max-w-3xl flex-col items-center gap-4 text-center">
        <Logo />
        <h1 className="max-w-2xl type-display text-balance">
          Where short-term rentals are, what they cost, and who controls the
          market.
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground type-body">
          Built on dated public Inside Airbnb snapshots — every figure traces to
          a real source. No estimates, no live badge.
        </p>
      </header>

      <section className="w-full max-w-6xl">
        <CityPicker />
      </section>

      <footer className="inline-flex items-center gap-2 text-center type-caption text-muted-foreground">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-brand-emphasis"
        />
        <span>Read-only · Inside Airbnb data · No tracking, no sign-up</span>
      </footer>
    </main>
  );
}
