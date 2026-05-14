import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Skin, SKINS } from "@/lib/skins";
import { SkinCard } from "@/components/SkinCard";
import { InspectModal } from "@/components/InspectModal";
import { FilterPanel, Filters, defaultFilters } from "@/components/FilterPanel";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Activity, Flame, Users } from "lucide-react";
import { usePrices } from "@/hooks/use-prices";
import { useSteamImages } from "@/hooks/use-steam-images";

export const Route = createFileRoute("/")({
  component: Marketplace,
});

function Marketplace() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Skin | null>(null);
  const [sort, setSort] = useState<"recent" | "price-asc" | "price-desc" | "float-asc">("recent");

  const { map: prices } = usePrices(SKINS.map((s) => s.marketHashName));
  const { map: images } = useSteamImages(SKINS.map((s) => s.marketHashName));

  const filtered = useMemo(() => {
    const list = SKINS.filter((s) => {
      const p = prices.get(s.marketHashName)?.lowestPrice;
      if (s.float < filters.floatMin || s.float > filters.floatMax) return false;
      // Filter by price only when we have live data; otherwise show the listing.
      if (p != null && (p < filters.priceMin || p > filters.priceMax)) return false;
      if (filters.weaponTypes.length && !filters.weaponTypes.includes(s.weaponType)) return false;
      if (filters.wears.length && !filters.wears.includes(s.wear)) return false;
      if (s.stickers.length < filters.minStickers) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      const pa = prices.get(a.marketHashName)?.lowestPrice ?? Infinity;
      const pb = prices.get(b.marketHashName)?.lowestPrice ?? Infinity;
      if (sort === "price-asc") return pa - pb;
      if (sort === "price-desc") return pb - pa;
      if (sort === "float-asc") return a.float - b.float;
      return a.listedAt - b.listedAt;
    });
  }, [filters, sort, prices]);

  return (
    <div className="space-y-6">
      <FeaturedCarousel skins={SKINS.slice(0, 3)} onSelect={setSelected} />

      {/* Live stats strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Activity} label="24h Volume" value="$1.2M" trend="+12.4%" />
        <Stat icon={Flame} label="Live Listings" value="48,291" trend="+832" />
        <Stat icon={Users} label="Online Traders" value="3,402" trend="LIVE" />
        <Stat icon={Activity} label="Avg. Float" value="0.2143" trend="−0.01" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <FilterPanel filters={filters} setFilters={setFilters} />
        </div>

        {/* Listing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recently Listed</h2>
              <p className="text-xs text-muted-foreground">{filtered.length} items match your filters</p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-md border border-border bg-input px-3 text-xs font-semibold uppercase outline-none focus:border-primary"
            >
              <option value="recent">Recent</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="float-asc">Lowest Float</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl glass p-16 text-center text-muted-foreground">
              No skins match your filters.
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
            >
              {filtered.map((s) => (
                <SkinCard key={s.id} skin={s} price={prices.get(s.marketHashName)} onClick={() => setSelected(s)} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <InspectModal skin={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Stat({
  icon: Icon, label, value, trend,
}: { icon: typeof Activity; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-neon-cyan" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="font-mono text-xl font-bold">{value}</p>
        <span className="font-mono text-[11px] text-neon-cyan">{trend}</span>
      </div>
    </div>
  );
}
