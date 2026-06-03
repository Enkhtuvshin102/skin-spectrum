import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import type { Listing } from "@/lib/listings.types";
import { SteamImage } from "./SteamImage";
import { formatPrice, timeAgo, wearLabel } from "@/lib/skins";

const rarityBar: Record<string, string> = {
  consumer: "bg-muted-foreground",
  industrial: "bg-rarity-milspec",
  milspec: "bg-rarity-milspec",
  restricted: "bg-rarity-restricted",
  classified: "bg-rarity-classified",
  covert: "bg-rarity-covert",
  knife: "bg-rarity-knife",
};

const rarityGlow: Record<string, string> = {
  milspec: "from-rarity-milspec/30 to-transparent",
  restricted: "from-rarity-restricted/30 to-transparent",
  classified: "from-rarity-classified/30 to-transparent",
  covert: "from-rarity-covert/40 to-transparent",
  knife: "from-rarity-knife/40 to-transparent",
};

export function MarketListingCard({
  listing, onClick, onBuy, isOwn, isSignedIn,
}: {
  listing: Listing;
  onClick?: () => void;
  onBuy?: () => void;
  isOwn?: boolean;
  isSignedIn?: boolean;
}) {
  const priceUsd = listing.priceCents / 100;
  const wearText = listing.wearCode ? wearLabel[listing.wearCode as keyof typeof wearLabel] ?? listing.exterior : listing.exterior;
  const sinceMs = Date.now() - new Date(listing.createdAt).getTime();
  const sold = listing.status === "sold";
  const unavailable = listing.status === "unavailable";
  const dim = sold || unavailable;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group relative flex w-full flex-col overflow-hidden rounded-xl glass text-left neon-border ${dim ? "opacity-60" : ""}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${rarityGlow[listing.rarity] ?? "from-primary/20 to-transparent"} opacity-60 pointer-events-none`} />
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${rarityBar[listing.rarity] ?? "bg-primary"}`} />

      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1">
        {listing.statTrak && (
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange-400 ring-1 ring-orange-500/40">ST™</span>
        )}
        {listing.souvenir && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-yellow-300 ring-1 ring-yellow-500/40">☆ SV</span>
        )}
        {sold && (
          <span className="rounded bg-destructive/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-destructive ring-1 ring-destructive/40">SOLD</span>
        )}
        {unavailable && (
          <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground ring-1 ring-border">UNAVAILABLE</span>
        )}
        {isOwn && !dim && (
          <span className="rounded bg-neon-cyan/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neon-cyan ring-1 ring-neon-cyan/40">YOUR LISTING</span>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="relative flex aspect-[5/3] items-center justify-center px-6 pt-6 pb-2"
        aria-label={`Inspect ${listing.name}`}
      >
        <SteamImage
          src={listing.image}
          alt={listing.name}
          className="h-full w-full"
          imgClassName="drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-2deg]"
          sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </button>

      <div className="relative flex flex-col gap-2 p-4 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{listing.weapon}</p>
            <h3 className="truncate text-sm font-bold tracking-wide text-foreground">{listing.skinName}</h3>
          </div>
          {listing.wearCode && (
            <span className="font-mono text-[10px] uppercase text-muted-foreground">{listing.wearCode}</span>
          )}
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>{wearText ?? "—"}</span>
          <span className="text-foreground">{listing.float != null ? listing.float.toFixed(4) : "—"}</span>
        </div>

        {listing.stickers.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            {listing.stickers.slice(0, 4).map((s, i) => (
              <div key={i} title={s.name} className="h-5 w-5 rounded-sm bg-gradient-to-br from-neon-purple/40 to-neon-blue/40 ring-1 ring-white/10" />
            ))}
            {listing.stickers.length > 4 && (
              <span className="font-mono text-[10px] text-muted-foreground">+{listing.stickers.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-1 flex items-end justify-between border-t border-border/40 pt-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] text-muted-foreground">
              {listing.seller?.personaName ?? "Seller"} · {timeAgo(sinceMs)}
            </p>
            <p className="font-mono text-lg font-bold neon-text leading-tight">{formatPrice(priceUsd)}</p>
          </div>
          {!dim && !isOwn && (
            <button
              onClick={onBuy}
              disabled={!isSignedIn}
              title={isSignedIn ? "Buy now" : "Sign in to buy"}
              className="flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart className="h-3 w-3" /> Buy
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
