import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Heart, ShoppingCart } from "lucide-react";
import { Skin, formatPrice, wearLabel } from "@/lib/skins";
import { FloatBar } from "./FloatBar";
import { SteamImage } from "./SteamImage";
import { usePrices } from "@/hooks/use-prices";
import { useSteamImages } from "@/hooks/use-steam-images";

export function InspectModal({ skin, onClose }: { skin: Skin | null; onClose: () => void }) {
  const names = skin ? [skin.marketHashName] : [];
  const { map } = usePrices(names);
  const { map: images } = useSteamImages(names);
  const price = skin ? map.get(skin.marketHashName) : undefined;
  const imageUrl = skin ? images.get(skin.marketHashName) : null;
  return (
    <AnimatePresence>
      {skin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl glass-strong shadow-neon md:grid-cols-[1.4fr_1fr]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-secondary/80 p-2 text-foreground transition hover:bg-primary hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Preview */}
            <div className="relative flex aspect-[5/3] items-center justify-center grid-bg p-10 md:aspect-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-blue/20" />
              <motion.img
                src={skin.image}
                alt={skin.skinName}
                initial={{ scale: 0.85, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6 }}
                className="relative max-h-[420px] w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] animate-float"
              />
            </div>

            {/* Details */}
            <div className="flex flex-col gap-4 p-6 md:p-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {skin.weapon} {skin.statTrak && "· StatTrak™"} {skin.souvenir && "· Souvenir"}
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-wide text-foreground">
                  {skin.skinName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{wearLabel[skin.wear]}</p>
              </div>

              {/* Price (live) */}
              <div className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-xs uppercase text-muted-foreground">Steam Market · Lowest</p>
                <p className="font-mono text-3xl font-bold neon-text">{formatPrice(price?.lowestPrice ?? null)}</p>
                <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>Median {formatPrice(price?.medianPrice ?? null)}</span>
                  <span>{price?.volume != null ? `${price.volume} sold (24h)` : "—"}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Float" value={skin.float.toFixed(8)} mono />
                <Stat label="Pattern" value={String(skin.pattern)} mono />
                <Stat label="Wear" value={skin.wear} />
                <Stat label="Seller" value={skin.seller} />
              </div>

              <div>
                <p className="mb-2 text-xs uppercase text-muted-foreground">Float distribution</p>
                <FloatBar value={skin.float} />
              </div>

              {skin.stickers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">Applied stickers</p>
                  <div className="space-y-1.5">
                    {skin.stickers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-xs">
                        <span className="truncate">{s.name}</span>
                        <span className="font-mono text-muted-foreground">{(s.wear * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:opacity-90">
                  <ShoppingCart className="h-4 w-4" /> Buy Now
                </button>
                <a
                  href={skin.inspectLink}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase text-foreground transition hover:border-primary hover:text-primary"
                >
                  Inspect <ExternalLink className="h-3 w-3" />
                </a>
                <button className="rounded-lg border border-border bg-secondary p-3 text-foreground transition hover:border-primary hover:text-primary">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
