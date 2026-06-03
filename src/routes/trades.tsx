import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, ExternalLink, Loader2, Repeat, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyPurchases, getMySales,
  confirmTradeRequest, declineTradeRequest,
  cancelTradeRequest, completeTradeRequest,
} from "@/lib/trades.functions";
import { SteamImage } from "@/components/SteamImage";
import { formatPrice, timeAgo } from "@/lib/skins";
import { supabase } from "@/integrations/supabase/client";
import type { TradeRequest, TradeStatus } from "@/lib/trades.types";

export const Route = createFileRoute("/trades")({
  component: TradesPage,
});

const STATUS_STYLE: Record<TradeStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/40",
  confirmed: "bg-neon-cyan/15 text-neon-cyan ring-neon-cyan/40",
  completed: "bg-wear-fn/15 text-wear-fn ring-wear-fn/40",
  declined: "bg-destructive/15 text-destructive ring-destructive/40",
  cancelled: "bg-muted/30 text-muted-foreground ring-border",
};

function TradesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");

  const purchases = useServerFn(getMyPurchases);
  const sales = useServerFn(getMySales);
  const qc = useQueryClient();

  const purQ = useQuery({
    queryKey: ["my-purchases", user?.steamId],
    queryFn: () => purchases(),
    enabled: !!user,
  });
  const salesQ = useQuery({
    queryKey: ["my-sales", user?.steamId],
    queryFn: () => sales(),
    enabled: !!user,
  });

  // Realtime updates on trade status
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("trades-" + user.steamId)
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["my-purchases"] });
        qc.invalidateQueries({ queryKey: ["my-sales"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  if (!user) {
    return (
      <div className="rounded-2xl glass p-12 text-center text-muted-foreground">
        Sign in with Steam to view your trades.
      </div>
    );
  }

  const items = tab === "purchases" ? purQ.data?.items ?? [] : salesQ.data?.items ?? [];
  const loading = tab === "purchases" ? purQ.isLoading : salesQ.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <Repeat className="h-3.5 w-3.5" /> Peer-to-peer
        </p>
        <h1 className="mt-1 text-3xl font-bold">Trades</h1>
        <p className="text-sm text-muted-foreground">Track your pending, confirmed, and completed peer-to-peer trades.</p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-secondary p-1">
        <TabButton active={tab === "purchases"} onClick={() => setTab("purchases")} icon={ArrowDownLeft}>
          Purchases {purQ.data && `(${purQ.data.items.length})`}
        </TabButton>
        <TabButton active={tab === "sales"} onClick={() => setTab("sales")} icon={ArrowUpRight}>
          Sales {salesQ.data && `(${salesQ.data.items.length})`}
        </TabButton>
      </div>

      {loading && <div className="rounded-xl glass p-8 text-center text-muted-foreground">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="rounded-xl glass p-12 text-center text-muted-foreground">
          No {tab} yet.
        </div>
      )}

      <div className="space-y-3">
        {items.map((t) => (
          <TradeRow key={t.id} trade={t} side={tab === "purchases" ? "buyer" : "seller"} />
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, children,
}: { active: boolean; onClick: () => void; icon: typeof Check; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
        active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function TradeRow({ trade, side }: { trade: TradeRequest; side: "buyer" | "seller" }) {
  const confirm = useServerFn(confirmTradeRequest);
  const decline = useServerFn(declineTradeRequest);
  const cancel = useServerFn(cancelTradeRequest);
  const complete = useServerFn(completeTradeRequest);
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-purchases"] });
    qc.invalidateQueries({ queryKey: ["my-sales"] });
    qc.invalidateQueries({ queryKey: ["marketplace"] });
    qc.invalidateQueries({ queryKey: ["my-listings"] });
  };

  const confirmMut = useMutation({
    mutationFn: () => confirm({ data: { id: trade.id } }),
    onSuccess: () => { toast.success("Confirmed. Buyer can now open the trade offer."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const declineMut = useMutation({
    mutationFn: () => decline({ data: { id: trade.id } }),
    onSuccess: () => { toast.success("Declined."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: () => cancel({ data: { id: trade.id } }),
    onSuccess: () => { toast.success("Cancelled."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const completeMut = useMutation({
    mutationFn: () => complete({ data: { id: trade.id } }),
    onSuccess: () => { toast.success("Marked completed."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const listing = trade.listing;
  const counterparty = side === "buyer" ? trade.seller : trade.buyer;
  const tradeUrl = side === "buyer" ? trade.sellerTradeUrl : trade.buyerTradeUrl;
  const sinceMs = Date.now() - new Date(trade.createdAt).getTime();

  return (
    <div className="flex flex-col gap-4 rounded-xl glass p-4 md:flex-row md:items-center">
      {listing && <SteamImage src={listing.image} alt={listing.name} className="h-20 w-28 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">
          {listing?.weapon ?? "—"} · {timeAgo(sinceMs)}
        </p>
        <p className="truncate text-base font-bold">{listing?.skinName ?? "Listing removed"}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {side === "buyer" ? "Seller" : "Buyer"}: {counterparty?.personaName ?? "—"}
        </p>
        {trade.buyerMessage && side === "seller" && (
          <p className="mt-1 rounded-md bg-secondary/60 px-2 py-1 text-[11px] italic text-muted-foreground">
            "{trade.buyerMessage}"
          </p>
        )}
      </div>

      <div className="text-right">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">Price</p>
        <p className="font-mono text-base font-bold neon-text">{formatPrice(trade.priceCents / 100)}</p>
      </div>

      <span className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase ring-1 ${STATUS_STYLE[trade.status]}`}>
        {trade.status}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {side === "seller" && trade.status === "pending" && (
          <>
            <ActionBtn onClick={() => confirmMut.mutate()} pending={confirmMut.isPending} icon={Check} variant="primary">Confirm</ActionBtn>
            <ActionBtn onClick={() => declineMut.mutate()} pending={declineMut.isPending} icon={X} variant="danger">Decline</ActionBtn>
          </>
        )}

        {trade.status === "confirmed" && side === "buyer" && tradeUrl && (
          <a
            href={tradeUrl}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md bg-gradient-primary px-3 py-2 text-[11px] font-bold uppercase text-primary-foreground shadow-glow hover:opacity-90"
          >
            Open Steam Trade <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {trade.status === "confirmed" && (
          <>
            <ActionBtn onClick={() => completeMut.mutate()} pending={completeMut.isPending} icon={Check} variant="primary">
              Mark Completed
            </ActionBtn>
            <ActionBtn onClick={() => cancelMut.mutate()} pending={cancelMut.isPending} icon={X} variant="muted">Cancel</ActionBtn>
          </>
        )}

        {trade.status === "pending" && side === "buyer" && (
          <ActionBtn onClick={() => cancelMut.mutate()} pending={cancelMut.isPending} icon={X} variant="muted">Cancel</ActionBtn>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, pending, icon: Icon, variant, children,
}: {
  onClick: () => void;
  pending: boolean;
  icon: typeof Check;
  variant: "primary" | "danger" | "muted";
  children: React.ReactNode;
}) {
  const cls = variant === "primary"
    ? "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
    : variant === "danger"
    ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
    : "bg-secondary text-muted-foreground hover:text-foreground";
  return (
    <button onClick={onClick} disabled={pending} className={`flex items-center gap-1 rounded-md px-3 py-2 text-[11px] font-bold uppercase ${cls} disabled:opacity-50`}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  );
}
