import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Flame, Users, Search as SearchIcon } from "lucide-react";
import { FilterPanel, Filters, defaultFilters } from "@/components/FilterPanel";
import { MarketListingCard } from "@/components/MarketListingCard";
import { ListingDetailModal } from "@/components/ListingDetailModal";
import { listMarketplace } from "@/lib/listings.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/listings.types";

export const Route = createFileRoute("/")({
  component: Marketplace,
});

function Marketplace() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [sort, setSort] = useState<"recent" | "price-asc" | "price-desc" | "float-asc">("recent");
  const [search, setSearch] = useState("");

  const fetchMarket = useServerFn(listMarketplace);
  const qc = useQueryClient();

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      weaponTypes: filters.weaponTypes.length ? filters.weaponTypes : undefined,
      wearCodes: filters.wears.length ? filters.wears : undefined,
      minStickers: filters.minStickers || undefined,
      priceMin: filters.priceMin || undefined,
      priceMax: filters.priceMax || undefined,
      sort,
      page: 0,
      pageSize: 36,
    }),
    [filters, sort, search],
  );

  const query = useQuery({
    queryKey: ["marketplace", params],
    queryFn: () => fetchMarket({ data: params }),
    staleTime: 15_000,
  });

  // Realtime: invalidate when any listing changes.
  useEffect(() => {
    const ch = supabase
      .channel("market-listings")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        qc.invalidateQueries({ queryKey: ["marketplace"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Live stats strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Flame} label="Live Listings" value={String(query.data?.total ?? 0)} trend="LIVE" />
        <Stat icon={Activity} label="On Page" value={String(items.length)} trend={sort.toUpperCase()} />
        <Stat icon={Users} label="Peer-to-peer" value="No bots" trend="STEAM" />
        <Stat icon={Activity} label="Trade flow" value="Direct" trend="P2P" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <FilterPanel filters={filters} setFilters={setFilters} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Marketplace</h2>
              <p className="text-xs text-muted-foreground">
                {query.isLoading ? "Loading live listings…" : `${query.data?.total ?? 0} active listings`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skin or sticker…"
                  className="h-9 w-64 rounded-md border border-border bg-input pl-8 pr-3 text-xs outline-none focus:border-primary"
                />
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
          </div>

          {query.isError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
              {(query.error as Error).message}
            </div>
          )}

          {query.isLoading ? (
            <LoadingGrid />
          ) : items.length === 0 ? (
            <div className="rounded-xl glass p-16 text-center text-muted-foreground">
              No listings match your filters. Be the first to list your inventory.
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((l) => (
                <MarketListingCard
                  key={l.id}
                  listing={l}
                  isSignedIn={!!user}
                  isOwn={user?.steamId === l.steamId}
                  onClick={() => setSelected(l)}
                  onBuy={() => setSelected(l)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <ListingDetailModal
        listing={selected}
        onClose={() => setSelected(null)}
        isSignedIn={!!user}
        isOwn={!!user && !!selected && user.steamId === selected.steamId}
      />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-xl glass p-3">
          <div className="h-full w-full rounded bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label, value, trend }: { icon: typeof Activity; label: string; value: string; trend: string }) {
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
