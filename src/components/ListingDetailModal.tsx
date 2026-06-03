import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { Listing } from "@/lib/listings.types";
import { SteamImage } from "./SteamImage";
import { formatPrice, wearLabel } from "@/lib/skins";
import { createTradeRequest } from "@/lib/trades.functions";

export function ListingDetailModal({
  listing, onClose, isSignedIn, isOwn,
}: {
  listing: Listing | null;
  onClose: () => void;
  isSignedIn: boolean;
  isOwn: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const create = useServerFn(createTradeRequest);
  const qc = useQueryClient();

  const buy = useMutation({
    mutationFn: () => create({ data: { listingId: listing!.id, message: message || undefined } }),
    onSuccess: () => {
      toast.success("Trade request sent. Seller has been notified.");
      qc.invalidateQueries({ queryKey: ["my-purchases"] });
      setConfirming(false);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AnimatePresence>
      {listing && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
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

            <div className="relative flex aspect-[5/3] items-center justify-center grid-bg p-10 md:aspect-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-transparent to-neon-blue/20" />
              <SteamImage src={listing.image} alt={listing.name} loading="eager" fetchpriority="high" className="relative max-h-[420px] w-full animate-float" imgClassName="drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]" />
            </div>

            <div className="flex flex-col gap-4 p-6 md:p-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {listing.weapon}{listing.statTrak && " · StatTrak™"}{listing.souvenir && " · Souvenir"}
                </p>
                <h2 className="mt-1 text-3xl font-bold tracking-wide" style={{ color: listing.rarityColorHex ?? undefined }}>
                  {listing.skinName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {listing.exterior ?? (listing.wearCode ? wearLabel[listing.wearCode as keyof typeof wearLabel] : "—")}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-xs uppercase text-muted-foreground">Listing Price</p>
                <p className="font-mono text-3xl font-bold neon-text">{formatPrice(listing.priceCents / 100)}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Sold by {listing.seller?.personaName ?? "Unknown seller"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Float" value={listing.float != null ? listing.float.toFixed(6) : "—"} mono />
                <Stat label="Wear" value={listing.wearCode ?? "—"} />
                <Stat label="Rarity" value={listing.rarity} />
                <Stat label="Status" value={listing.status} />
              </div>

              {listing.stickers.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">Applied stickers</p>
                  <div className="space-y-1.5">
                    {listing.stickers.map((s, i) => (
                      <div key={i} className="rounded-md bg-secondary/50 px-3 py-2 text-xs">{s.name}</div>
                    ))}
                  </div>
                </div>
              )}

              {confirming && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-bold uppercase tracking-wider">Confirm purchase</span>
                  </div>
                  <p className="text-muted-foreground">
                    This sends a trade request to the seller. Once they confirm, you'll be redirected to their Steam trade offer.
                    All trades are peer-to-peer — no bots, no escrow.
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    placeholder="Optional message to seller…"
                    className="mt-2 h-16 w-full resize-none rounded-md border border-border bg-input p-2 text-xs outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                {listing.status !== "active" ? (
                  <div className="flex-1 rounded-lg bg-secondary py-3 text-center text-xs uppercase text-muted-foreground">
                    Not available
                  </div>
                ) : isOwn ? (
                  <div className="flex-1 rounded-lg bg-secondary py-3 text-center text-xs uppercase text-muted-foreground">
                    Your own listing
                  </div>
                ) : !isSignedIn ? (
                  <a
                    href="/api/auth/steam"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow"
                  >
                    Sign in to Buy
                  </a>
                ) : confirming ? (
                  <>
                    <button
                      onClick={() => buy.mutate()}
                      disabled={buy.isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-60"
                    >
                      {buy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                      Confirm Buy
                    </button>
                    <button onClick={() => setConfirming(false)} className="rounded-lg border border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:opacity-90"
                  >
                    <ShoppingCart className="h-4 w-4" /> Buy Now
                  </button>
                )}
                {listing.inspectLink && (
                  <a href={listing.inspectLink} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase text-foreground transition hover:border-primary hover:text-primary">
                    Inspect <ExternalLink className="h-3 w-3" />
                  </a>
                )}
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
