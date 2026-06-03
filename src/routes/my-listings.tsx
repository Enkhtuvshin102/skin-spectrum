import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2, RotateCw, Save, ListChecks } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMyListings, removeListing, relistListing, updateListingPrice } from "@/lib/listings.functions";
import { SteamImage } from "@/components/SteamImage";
import { formatPrice } from "@/lib/skins";
import type { Listing } from "@/lib/listings.types";

export const Route = createFileRoute("/my-listings")({
  component: MyListingsPage,
});

function MyListingsPage() {
  const { user } = useAuth();
  const fetch = useServerFn(getMyListings);
  const remove = useServerFn(removeListing);
  const relist = useServerFn(relistListing);
  const updatePrice = useServerFn(updateListingPrice);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my-listings", user?.steamId],
    queryFn: () => fetch(),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-listings"] });
    qc.invalidateQueries({ queryKey: ["my-active-assets"] });
    qc.invalidateQueries({ queryKey: ["marketplace"] });
  };

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Listing removed."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const relistMut = useMutation({
    mutationFn: (id: string) => relist({ data: { id } }),
    onSuccess: () => { toast.success("Relisted."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const priceMut = useMutation({
    mutationFn: ({ id, priceUsd }: { id: string; priceUsd: number }) =>
      updatePrice({ data: { id, priceUsd } }),
    onSuccess: () => { toast.success("Price updated."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="rounded-2xl glass p-12 text-center text-muted-foreground">
        Sign in with Steam to view your active listings.
      </div>
    );
  }

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5" /> Active Listings
        </p>
        <h1 className="mt-1 text-3xl font-bold">My Listings</h1>
        <p className="text-sm text-muted-foreground">Edit prices, remove, or relist your items.</p>
      </div>

      {query.isLoading && <div className="rounded-xl glass p-8 text-center text-muted-foreground">Loading…</div>}
      {items.length === 0 && !query.isLoading && (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">
          You have no active listings yet.
        </div>
      )}

      <div className="space-y-3">
        {items.map((l) => (
          <ListingRow
            key={l.id}
            listing={l}
            onRemove={() => removeMut.mutate(l.id)}
            onRelist={() => relistMut.mutate(l.id)}
            onSavePrice={(p) => priceMut.mutate({ id: l.id, priceUsd: p })}
            saving={priceMut.isPending && priceMut.variables?.id === l.id}
          />
        ))}
      </div>
    </div>
  );
}

function ListingRow({
  listing, onRemove, onRelist, onSavePrice, saving,
}: {
  listing: Listing;
  onRemove: () => void;
  onRelist: () => void;
  onSavePrice: (p: number) => void;
  saving: boolean;
}) {
  const [price, setPrice] = useState((listing.priceCents / 100).toFixed(2));
  const statusColor = listing.status === "active"
    ? "text-wear-fn"
    : listing.status === "sold"
    ? "text-destructive"
    : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-4 rounded-xl glass p-4 md:flex-row md:items-center">
      <SteamImage src={listing.image} alt={listing.name} className="h-20 w-28 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">{listing.weapon}</p>
        <p className="truncate font-bold">{listing.skinName}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {listing.exterior ?? "—"} · Float {listing.float != null ? listing.float.toFixed(4) : "—"}
        </p>
        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${statusColor}`}>
          {listing.status}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number" step="0.01" min="0.03"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={listing.status !== "active"}
          className="h-10 w-28 rounded-md border border-border bg-input px-2 font-mono text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          onClick={() => {
            const n = Number(price);
            if (Number.isFinite(n) && n >= 0.03) onSavePrice(n);
          }}
          disabled={saving || listing.status !== "active"}
          className="flex items-center gap-1 rounded-md bg-secondary px-3 py-2 text-[11px] font-bold uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(listing.status === "unavailable" || listing.status === "removed") && (
          <button
            onClick={onRelist}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-2 text-[11px] font-bold uppercase hover:bg-primary hover:text-primary-foreground"
          >
            <RotateCw className="h-3.5 w-3.5" /> Relist
          </button>
        )}
        {listing.status !== "removed" && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-2 text-[11px] font-bold uppercase text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      <div className="text-right">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">Listed</p>
        <p className="font-mono text-base font-bold neon-text">{formatPrice(listing.priceCents / 100)}</p>
      </div>
    </div>
  );
}
