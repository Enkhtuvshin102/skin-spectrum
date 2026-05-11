import { motion } from "framer-motion";
import { ExternalLink, Heart } from "lucide-react";
import { Skin, formatPrice, timeAgo, wearLabel } from "@/lib/skins";
import { FloatBar } from "./FloatBar";

const rarityClass: Record<string, string> = {
  milspec: "from-rarity-milspec/40 to-transparent",
  restricted: "from-rarity-restricted/40 to-transparent",
  classified: "from-rarity-classified/40 to-transparent",
  covert: "from-rarity-covert/50 to-transparent",
  knife: "from-rarity-knife/50 to-transparent",
};

const rarityBar: Record<string, string> = {
  milspec: "bg-rarity-milspec",
  restricted: "bg-rarity-restricted",
  classified: "bg-rarity-classified",
  covert: "bg-rarity-covert",
  knife: "bg-rarity-knife",
};

export function SkinCard({ skin, onClick }: { skin: Skin; onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl glass text-left neon-border"
    >
      {/* Rarity glow background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${rarityClass[skin.rarity]} opacity-60 pointer-events-none`} />
      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${rarityBar[skin.rarity]}`} />

      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex gap-1">
        {skin.statTrak && (
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange-400 ring-1 ring-orange-500/40">
            ST™
          </span>
        )}
        {skin.souvenir && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-yellow-300 ring-1 ring-yellow-500/40">
            ☆ SV
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-card hover:text-foreground group-hover:opacity-100"
        aria-label="Add to watchlist"
      >
        <Heart className="h-3.5 w-3.5" />
      </button>

      {/* Image */}
      <div className="relative flex aspect-[5/3] items-center justify-center px-6 pt-6 pb-2">
        <img
          src={skin.image}
          alt={`${skin.weapon} ${skin.skinName}`}
          loading="lazy"
          className="h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-2deg]"
        />
      </div>

      {/* Info */}
      <div className="relative flex flex-col gap-2 p-4 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {skin.weapon}
            </p>
            <h3 className="truncate text-sm font-bold tracking-wide text-foreground">
              {skin.skinName}
            </h3>
          </div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {skin.wear}
          </span>
        </div>

        <FloatBar value={skin.float} showLabel={false} />
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>{wearLabel[skin.wear]}</span>
          <span className="text-foreground">{skin.float.toFixed(4)}</span>
        </div>

        {/* Stickers */}
        {skin.stickers.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            {skin.stickers.slice(0, 4).map((s, i) => (
              <div
                key={i}
                title={s.name}
                className="h-5 w-5 rounded-sm bg-gradient-to-br from-neon-purple/40 to-neon-blue/40 ring-1 ring-white/10"
              />
            ))}
            {skin.stickers.length > 4 && (
              <span className="font-mono text-[10px] text-muted-foreground">
                +{skin.stickers.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-1 flex items-end justify-between border-t border-border/40 pt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Listed {timeAgo(skin.listedAt)}</p>
            <p className="font-mono text-lg font-bold neon-text leading-tight">
              {formatPrice(skin.price)}
            </p>
          </div>
          <a
            href={skin.inspectLink}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground transition hover:bg-primary hover:text-primary-foreground"
          >
            Inspect <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </motion.button>
  );
}
