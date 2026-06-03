import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Settings as SettingsIcon, ExternalLink, Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMySellerProfile, saveTradeUrl } from "@/lib/listings.functions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMySellerProfile);
  const save = useServerFn(saveTradeUrl);
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["my-seller-profile", user?.steamId],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  const [tradeUrl, setTradeUrl] = useState("");
  useEffect(() => {
    if (profile.data?.profile?.tradeUrl) setTradeUrl(profile.data.profile.tradeUrl);
  }, [profile.data]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { tradeUrl } }),
    onSuccess: () => {
      toast.success("Trade URL saved.");
      qc.invalidateQueries({ queryKey: ["my-seller-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="rounded-2xl glass p-12 text-center text-muted-foreground">
        Sign in with Steam to manage your settings.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon-cyan flex items-center gap-2">
          <SettingsIcon className="h-3.5 w-3.5" /> Settings
        </p>
        <h1 className="mt-1 text-3xl font-bold">Trading Profile</h1>
        <p className="text-sm text-muted-foreground">Configure your Steam Trade URL so buyers can send you offers directly.</p>
      </div>

      <div className="space-y-4 rounded-2xl glass p-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Steam Trade URL
          </label>
          <input
            value={tradeUrl}
            onChange={(e) => setTradeUrl(e.target.value)}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
            className="mt-2 h-11 w-full rounded-md border border-border bg-input px-3 font-mono text-sm outline-none focus:border-primary"
          />
          <a
            href="https://steamcommunity.com/id/me/tradeoffers/privacy"
            target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-neon-cyan hover:underline"
          >
            Find your trade URL on Steam <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !tradeUrl}
          className="flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-xs text-muted-foreground">
        <p className="font-bold uppercase tracking-wider text-foreground">How peer-to-peer trades work</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Buyers send a trade request when they click Buy on your listing.</li>
          <li>You receive a notification and confirm or decline.</li>
          <li>Once confirmed, the buyer is redirected to your Steam trade URL.</li>
          <li>Floatiq never holds items or funds — all trades happen directly on Steam.</li>
        </ul>
      </div>
    </div>
  );
}
