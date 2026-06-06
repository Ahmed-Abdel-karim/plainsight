import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LensSelector } from "./lens-selector";

export function LensTabsContent() {
  return (
    <>
      <TabsList className="bg-transparent">
        <TabsTrigger value="analyse">Analyse</TabsTrigger>
        <TabsTrigger value="browse">Browse</TabsTrigger>
      </TabsList>
      {/* The tabs control content rendered elsewhere (the sidebar swaps + the map
          layer toggles). These panels exist only so each tab's `aria-controls`
          resolves to a real tabpanel; the visible content lives in the sidebar. */}
      <TabsContent value="analyse" className="sr-only">
        Price analysis dashboard
      </TabsContent>
      <TabsContent value="browse" className="sr-only">
        Listings list
      </TabsContent>
    </>
  );
}

export function LensTabs() {
  return (
    <LensSelector>
      <LensTabsContent />
    </LensSelector>
  );
}
