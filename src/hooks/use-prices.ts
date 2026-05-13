import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getPrices } from "@/lib/pricing";
import type { SteamPriceData } from "@/lib/types";

const FIVE_MIN = 5 * 60_000;

/**
 * Live CS2 market prices for a list of market_hash_names.
 * - Auto-refreshes every 5 minutes.
 * - Server-side caches for 60s to avoid Steam rate limits.
 */
export function usePrices(names: string[]) {
  const fetchPrices = useServerFn(getPrices);
  const key = useMemo(() => Array.from(new Set(names)).sort(), [names]);

  const query = useQuery({
    queryKey: ["prices", key],
    queryFn: () => fetchPrices({ data: { names: key } }),
    enabled: key.length > 0,
    staleTime: FIVE_MIN,
    refetchInterval: FIVE_MIN,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const map = useMemo(() => {
    const m = new Map<string, SteamPriceData>();
    for (const p of query.data?.prices ?? []) m.set(p.marketHashName, p);
    return m;
  }, [query.data]);

  return { map, isLoading: query.isLoading, isFetching: query.isFetching, refetch: query.refetch };
}

export function formatLivePrice(p: SteamPriceData | undefined): string {
  if (!p || p.lowestPrice == null) return "No market data";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(p.lowestPrice);
}
