import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Skin, formatPrice } from "@/lib/skins";
import { usePrices } from "@/hooks/use-prices";

export function FeaturedCarousel({ skins, onSelect }: { skins: Skin[]; onSelect: (s: Skin) => void }) {
  const { map } = usePrices(skins.map((s) => s.marketHashName));
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 glass-strong">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-neon-purple/30 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-neon-blue/30 blur-3xl" />

      <div className="relative grid gap-6 p-6 md:grid-cols-3 md:p-8">
        <div className="flex flex-col justify-center">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan">
            <TrendingUp className="h-3.5 w-3.5" /> Featured Drops
          </p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            Trade like a <span className="neon-text">pro</span>.
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Real-time CS2 marketplace with float verification, sticker analysis, and instant inspect.
          </p>
        </div>

        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          {skins.slice(0, 3).map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => onSelect(s)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 p-3 text-left transition hover:border-primary"
            >
              <div className="flex aspect-square items-center justify-center">
                <img
                  src={s.image}
                  alt={s.skinName}
                  className="h-full w-full object-contain transition group-hover:scale-110"
                />
              </div>
              <p className="mt-1 truncate text-[10px] font-mono uppercase text-muted-foreground">{s.weapon}</p>
              <p className="truncate text-xs font-bold">{s.skinName}</p>
              <p className="mt-1 font-mono text-sm font-bold neon-text">{formatPrice(map.get(s.marketHashName)?.lowestPrice ?? null)}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
