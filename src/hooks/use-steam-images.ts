import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getImages } from "@/lib/images.functions";

const ONE_HOUR = 60 * 60_000;

/**
 * Resolve Steam CDN image URLs for a list of market_hash_names.
 * Cached server-side; client query stays fresh for an hour.
 */
export function useSteamImages(names: string[]) {
  const fetchImages = useServerFn(getImages);
  const key = useMemo(() => Array.from(new Set(names.filter(Boolean))).sort(), [names]);

  const query = useQuery({
    queryKey: ["steam-images", key],
    queryFn: () => fetchImages({ data: { names: key } }),
    enabled: key.length > 0,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 4,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const map = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const im of query.data?.images ?? []) m.set(im.marketHashName, im.url);
    return m;
  }, [query.data]);

  return { map, isLoading: query.isLoading };
}
