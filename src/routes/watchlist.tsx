import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { SKINS, Skin } from "@/lib/skins";
import { SkinCard } from "@/components/SkinCard";
import { InspectModal } from "@/components/InspectModal";
import { usePrices } from "@/hooks/use-prices";
import { useSteamImages } from "@/hooks/use-steam-images";

export const Route = createFileRoute("/watchlist")({
  component: WatchlistPage,
});

function WatchlistPage() {
  const [selected, setSelected] = useState<Skin | null>(null);
  const watch = SKINS.slice(2, 6);
  const { map: prices } = usePrices(watch.map((s) => s.marketHashName));
  const { map: images } = useSteamImages(watch.map((s) => s.marketHashName));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <Heart className="h-3.5 w-3.5" /> Watchlist
        </p>
        <h1 className="mt-1 text-3xl font-bold">Tracked Skins</h1>
        <p className="text-sm text-muted-foreground">Get alerts when prices drop or new floats appear.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {watch.map((s) => (
          <SkinCard key={s.id} skin={s} price={prices.get(s.marketHashName)} onClick={() => setSelected(s)} />
        ))}
      </div>

      <InspectModal skin={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
