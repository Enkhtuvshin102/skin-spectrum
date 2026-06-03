import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DollarSign, Loader2, AlertTriangle, ShieldCheck, Tag, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getInventory, type InventoryItem } from "@/lib/inventory.functions";
import { createListing, getMyActiveAssetIds, getMySellerProfile } from "@/lib/listings.functions";
import { SteamImage } from "@/components/SteamImage";

export const Route = createFileRoute("/sell")({
  component: SellPage,
});

function SellPage() {
  const { user } = useAuth();
  const fetchInventory = useServerFn(getInventory);
  const fetchActive = useServerFn(getMyActiveAssetIds);
  const fetchProfile = useServerFn(getMySellerProfile);
  const create = useServerFn(createListing);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState("");

  const inv = useQuery({
    queryKey: ["inventory", user?.steamId],
    queryFn: () => fetchInventory({ data: {} }),
    enabled: !!user,
    staleTime: 60_000,
  });
  const active = useQuery({
    queryKey: ["my-active-assets", user?.steamId],
    queryFn: () => fetchActive(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const profile = useQuery({
    queryKey: ["my-seller-profile", user?.steamId],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  const listedSet = useMemo(
    () => new Set(active.data?.assetIds ?? []),
    [active.data],
  );

  const tradable = useMemo(
    () => (inv.data?.items ?? []).filter((i) => i.tradable && i.marketable),
    [inv.data],
  );

  const list = useMutation({
    mutationFn: ({ assetId, priceUsd }: { assetId: string; priceUsd: number }) =>
      create({ data: { assetId, priceUsd } }),
    onSuccess: () => {
      toast.success("Listing published.");
      setSelected(null);
      setPrice("");
      qc.invalidateQueries({ queryKey: ["my-active-assets"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl glass p-12 text-center">
        <h3 className="text-lg font-bold">Sign in to sell</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Sign in with Steam to list items from your real CS2 inventory.
        </p>
        <a href="/api/auth/steam" className="mt-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
          Sign in with Steam
        </a>
      </div>
    );
  }

  const tradeUrlMissing = !profile.isLoading && !profile.data?.profile?.tradeUrl;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <Tag className="h-3.5 w-3.5" /> Sell
        </p>
        <h1 className="mt-1 text-3xl font-bold">List Items From Your Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Pick tradable CS2 items, set a price, and your listing goes live instantly. All trades are peer-to-peer via Steam — no bots, no custody.
        </p>
      </div>

      {tradeUrlMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-200">Add your Steam Trade URL to start selling.</p>
            <p className="text-xs text-muted-foreground">Buyers send their offers to this URL — it's required before publishing any listing.</p>
          </div>
          <Link to="/settings" className="rounded-md bg-yellow-500/20 px-3 py-1.5 text-xs font-bold uppercase text-yellow-100 hover:bg-yellow-500/30">
            Open Settings
          </Link>
        </div>
      )}

      {inv.isLoading && <LoadingGrid />}
      {inv.isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          {(inv.error as Error).message}
        </div>
      )}

      {inv.data && tradable.length === 0 && (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">
          No tradable CS2 items found in your inventory.
        </div>
      )}

      {tradable.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tradable.map((item) => {
            const listed = listedSet.has(item.assetId);
            return (
              <button
                key={item.assetId}
                disabled={listed}
                onClick={() => setSelected(item)}
                className={`group relative flex aspect-square flex-col rounded-lg glass p-3 text-left neon-border transition ${listed ? "opacity-40" : "hover:-translate-y-1"}`}
              >
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t" style={{ backgroundColor: item.rarityColorHex ?? "var(--primary)" }} />
                {listed && (
                  <span className="absolute right-2 top-2 z-10 rounded bg-neon-cyan/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-neon-cyan ring-1 ring-neon-cyan/40">
                    LISTED
                  </span>
                )}
                <div className="flex flex-1 items-center justify-center">
                  <SteamImage src={item.image} alt={item.name} className="h-full w-full" sizes="20vw" />
                </div>
                <div>
                  <p className="truncate text-[10px] font-mono uppercase text-muted-foreground">{item.weapon}</p>
                  <p className="truncate text-xs font-bold">{item.skinName}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg glass p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-neon-cyan" />
        Listings are validated against your Steam inventory server-side before publishing.
      </div>

      {/* Price modal */}
      {selected && (
        <div
          onClick={() => { if (!list.isPending) { setSelected(null); setPrice(""); } }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-2xl glass-strong shadow-neon">
            <button onClick={() => { setSelected(null); setPrice(""); }} className="absolute right-3 top-3 rounded-full bg-secondary/80 p-1.5 hover:bg-primary hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4 border-b border-border/60 p-5">
              <SteamImage src={selected.image} alt={selected.name} className="h-20 w-28 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">{selected.weapon}</p>
                <p className="truncate text-base font-bold">{selected.skinName}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {selected.exterior ?? "—"} · Float {selected.float != null ? selected.float.toFixed(4) : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Price (USD)</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number" step="0.01" min="0.03"
                    autoFocus value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-md border border-border bg-input pl-9 pr-3 font-mono text-lg outline-none focus:border-primary"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Buyers pay you off-platform via Steam trade offer. Floatiq does not hold funds.
                </p>
              </div>

              <button
                onClick={() => {
                  const n = Number(price);
                  if (!Number.isFinite(n) || n < 0.03) {
                    toast.error("Enter a valid price (min $0.03).");
                    return;
                  }
                  list.mutate({ assetId: selected.assetId, priceUsd: n });
                }}
                disabled={list.isPending || tradeUrlMissing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {list.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                Publish Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg glass p-3">
          <div className="h-full w-full rounded bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}
