import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Tag, ShieldCheck } from "lucide-react";
import { SKINS, Skin, formatPrice, wearLabel } from "@/lib/skins";
import { InspectModal } from "@/components/InspectModal";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

const inventory = SKINS.slice(0, 10);

function InventoryPage() {
  const [selected, setSelected] = useState<Skin | null>(null);
  const [syncing, setSyncing] = useState(false);

  const totalValue = inventory.reduce((s, i) => s + i.price, 0);

  return (
    <div className="space-y-6">
      {/* Profile banner */}
      <div className="relative overflow-hidden rounded-2xl glass-strong p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-transparent to-neon-blue/20" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl bg-gradient-primary p-[2px] shadow-neon">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card text-2xl font-bold">
                F
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan">Steam Profile</p>
              <h1 className="text-2xl font-bold">FloatHunter</h1>
              <p className="font-mono text-xs text-muted-foreground">SteamID 76561198…0042 · Demo Mode</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Stat label="Items" value={String(inventory.length)} />
            <Stat label="Value" value={formatPrice(totalValue)} highlight />
            <button
              onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1400); }}
              className="flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Steam Inventory"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold">Inventory</h2>
        <p className="text-xs text-muted-foreground">Steam-style grid · click an item to list, inspect, or watchlist</p>
      </div>

      <motion.div
        layout
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        {inventory.map((skin) => (
          <motion.button
            key={skin.id}
            onClick={() => setSelected(skin)}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative flex aspect-square flex-col rounded-lg glass p-3 text-left neon-border"
          >
            <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t bg-rarity-${skin.rarity}`} />
            <div className="flex flex-1 items-center justify-center">
              <img src={skin.image} alt={skin.skinName} className="max-h-full max-w-full object-contain transition group-hover:scale-110" />
            </div>
            <div>
              <p className="truncate text-[10px] font-mono uppercase text-muted-foreground">{skin.weapon}</p>
              <p className="truncate text-xs font-bold">{skin.skinName}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">{wearLabel[skin.wear].split(" ").map(w => w[0]).join("")}</span>
                <span className="font-mono text-[11px] font-bold neon-text">{formatPrice(skin.price)}</span>
              </div>
            </div>

            <div className="absolute inset-x-2 bottom-2 flex translate-y-2 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
              <span className="flex flex-1 items-center justify-center gap-1 rounded bg-gradient-primary py-1 text-[10px] font-bold uppercase">
                <Tag className="h-3 w-3" /> List
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <div className="flex items-center gap-2 rounded-lg glass p-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-neon-cyan" />
        Inventory data is mocked. Connect Steam OpenID to sync your real CS2 items.
      </div>

      <InspectModal skin={selected} onClose={() => setSelected(null)} />
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
