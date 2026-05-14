import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  RefreshCw, ShieldCheck, ExternalLink, AlertTriangle, PackageOpen, Loader2, LogIn,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getInventory, type InventoryItem } from "@/lib/inventory.functions";
import { SteamImage } from "@/components/SteamImage";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

const PAGE_SIZE = 30;

function InventoryPage() {
  const { user } = useAuth();
  const fetchInventory = useServerFn(getInventory);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const query = useQuery({
    queryKey: ["inventory", user?.steamId ?? null],
    queryFn: () => fetchInventory({ data: {} }),
    enabled: !!user?.steamId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const items = query.data?.items ?? [];
  const shown = useMemo(() => items.slice(0, visible), [items, visible]);

  return (
    <div className="space-y-6">
      <ProfileBanner
        user={user}
        total={items.length}
        loading={query.isLoading || query.isFetching}
        onRefresh={() => { setVisible(PAGE_SIZE); query.refetch(); }}
        canRefresh={!!user}
      />

      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold">Inventory</h2>
          <p className="text-xs text-muted-foreground">
            Live data from Steam · CS2 (appid 730, context 2)
          </p>
        </div>
        {items.length > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            Showing {shown.length} / {items.length}
          </p>
        )}
      </div>

      {!user && <SignInPrompt />}
      {user && query.isLoading && <LoadingGrid />}
      {user && query.isError && (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      )}
      {user && !query.isLoading && !query.isError && items.length === 0 && <EmptyState />}

      {user && shown.length > 0 && (
        <>
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {shown.map((item) => (
              <ItemCard key={item.assetId} item={item} onClick={() => setSelected(item)} />
            ))}
          </motion.div>

          {visible < items.length && (
            <div className="flex justify-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:border-primary hover:text-primary"
              >
                Load more ({items.length - visible} left)
              </button>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2 rounded-lg glass p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-neon-cyan" />
        Inventory fetched server-side from Steam. Steam API key is never exposed to the browser.
      </div>

      <InspectModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------------- Profile banner ---------------- */

function ProfileBanner({
  user, total, loading, onRefresh, canRefresh,
}: {
  user: ReturnType<typeof useAuth>["user"];
  total: number;
  loading: boolean;
  onRefresh: () => void;
  canRefresh: boolean;
}) {
  const initial = (user?.personaName ?? "F").trim().charAt(0).toUpperCase();
  return (
    <div className="relative overflow-hidden rounded-2xl glass-strong p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-transparent to-neon-blue/20" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-xl bg-gradient-primary p-[2px] shadow-neon">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-full w-full rounded-[10px] object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card text-2xl font-bold">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan">Steam Profile</p>
            <h1 className="truncate text-2xl font-bold">{user?.personaName ?? "Not signed in"}</h1>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {user?.steamId ? `SteamID ${user.steamId}` : "Sign in to load your CS2 inventory"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Stat label="Items" value={String(total)} />
          <Stat label="Game" value="CS2" highlight />
          <button
            onClick={onRefresh}
            disabled={!canRefresh || loading}
            className="flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing…" : "Sync Steam Inventory"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-4 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-base font-bold ${highlight ? "neon-text" : ""}`}>{value}</p>
    </div>
  );
}

/* ---------------- Card ---------------- */

function ItemCard({ item, onClick }: { item: InventoryItem; onClick: () => void }) {
  const wearShort = item.wearCode ?? (item.exterior ? item.exterior.split(" ").map((w) => w[0]).join("") : "—");
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative flex aspect-square flex-col rounded-lg glass p-3 text-left neon-border"
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t"
        style={{ backgroundColor: item.rarityColorHex ?? "var(--primary)" }}
      />
      <div className="flex flex-1 items-center justify-center">
        <SteamImage
          src={item.image}
          alt={item.name}
          className="h-full w-full"
          imgClassName="transition group-hover:scale-110"
          sizes="(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 50vw"
        />
      </div>
      <div>
        <p className="truncate text-[10px] font-mono uppercase text-muted-foreground">
          {item.weapon}
          {item.statTrak && <span className="ml-1 text-neon-cyan">ST</span>}
          {item.souvenir && <span className="ml-1 text-wear-mw">SV</span>}
        </p>
        <p className="truncate text-xs font-bold">{item.skinName}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">{wearShort}</span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${
              item.tradable ? "bg-wear-fn/20 text-wear-fn" : "bg-destructive/20 text-destructive"
            }`}
          >
            {item.tradable ? "Tradable" : "Locked"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ---------------- States ---------------- */

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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl glass p-12 text-center">
      <PackageOpen className="h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-bold">No CS2 items found</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Your inventory loaded successfully but contains no Counter-Strike 2 items, or your Steam
        inventory privacy is restricted to friends.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <h3 className="text-lg font-bold">Couldn't load inventory</h3>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground"
      >
        <Loader2 className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl glass p-12 text-center">
      <LogIn className="h-10 w-10 text-primary" />
      <h3 className="text-lg font-bold">Sign in with Steam</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Connect your Steam account to load your real CS2 inventory. Your Steam API key stays on the server.
      </p>
      <a
        href="/api/auth/steam"
        className="mt-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow"
      >
        Sign in with Steam
      </a>
    </div>
  );
}

/* ---------------- Inspect modal (inline, item-shaped) ---------------- */

function InspectModal({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl glass-strong shadow-neon md:grid-cols-[1.3fr_1fr]"
          >
            <div className="relative flex aspect-[5/3] items-center justify-center grid-bg p-10 md:aspect-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-blue/20" />
              <img src={item.image} alt={item.name} className="relative max-h-[420px] w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] animate-float" />
            </div>

            <div className="flex flex-col gap-4 p-6 md:p-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.weapon}
                  {item.statTrak && " · StatTrak™"}
                  {item.souvenir && " · Souvenir"}
                </p>
                <h2
                  className="mt-1 text-3xl font-bold tracking-wide"
                  style={{ color: item.rarityColorHex ?? undefined }}
                >
                  {item.skinName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.exterior ?? item.type}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailStat label="Asset ID" value={item.assetId} mono />
                <DetailStat label="Class ID" value={item.classId} mono />
                <DetailStat label="Tradable" value={item.tradable ? "Yes" : "No"} />
                <DetailStat label="Marketable" value={item.marketable ? "Yes" : "No"} />
              </div>

              {item.stickers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">Applied stickers</p>
                  <div className="space-y-1.5">
                    {item.stickers.map((s, i) => (
                      <div key={i} className="rounded-md bg-secondary/50 px-3 py-2 text-xs">
                        {s.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                {item.inspectLink ? (
                  <a
                    href={item.inspectLink}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow"
                  >
                    Open in CS2 <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="flex-1 rounded-lg bg-secondary py-3 text-center text-xs uppercase text-muted-foreground">
                    No inspect link
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg border border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
