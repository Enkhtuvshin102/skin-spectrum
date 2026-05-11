import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { SKINS, formatPrice, timeAgo } from "@/lib/skins";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

const trades = SKINS.map((s, i) => ({
  ...s,
  type: i % 2 === 0 ? "buy" : "sell" as "buy" | "sell",
  ts: (i + 1) * 3 * 60 * 60_000,
}));

function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <History className="h-3.5 w-3.5" /> Activity
        </p>
        <h1 className="mt-1 text-3xl font-bold">Trade History</h1>
      </div>

      <div className="overflow-hidden rounded-xl glass">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Float</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Counterparty</th>
              <th className="px-4 py-3 text-right font-semibold">Price</th>
              <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">When</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-border/40 transition hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                    t.type === "buy"
                      ? "bg-neon-cyan/15 text-neon-cyan"
                      : "bg-neon-purple/15 text-neon-purple"
                  }`}>
                    {t.type === "buy" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    {t.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={t.image} alt="" className="h-8 w-12 object-contain" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">{t.weapon}</p>
                      <p className="truncate text-xs font-bold">{t.skinName}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">{t.float.toFixed(4)}</td>
                <td className="hidden px-4 py-3 text-xs md:table-cell">{t.seller}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold neon-text">{formatPrice(t.price)}</td>
                <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground sm:table-cell">{timeAgo(t.ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
