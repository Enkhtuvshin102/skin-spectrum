import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Resolve Steam CDN image URLs (icon_url_large preferred, fallback icon_url)
 * for a list of market_hash_names. Uses the public market listings render
 * endpoint and caches per-instance for 1 hour.
 */

const STEAM_IMG = "https://community.cloudflare.steamstatic.com/economy/image/";
const APPID = 730;
const TTL = 60 * 60_000;

export interface SteamImageData {
  marketHashName: string;
  url: string | null;
}

const cache = new Map<string, { url: string | null; expires: number }>();

async function fetchOne(name: string, attempt = 0): Promise<string | null> {
  const url = `https://steamcommunity.com/market/listings/${APPID}/${encodeURIComponent(name)}/render/?currency=1&start=0&count=1&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Floatiq/1.0 (+https://floatiq.lovable.app)",
        Accept: "application/json",
      },
    });
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return fetchOne(name, attempt + 1);
    }
    if (!res.ok) return null;
    const json = (await res.json()) as {
      assets?: Record<string, Record<string, Record<string, { icon_url?: string; icon_url_large?: string }>>>;
    };
    const appBucket = json.assets?.[String(APPID)];
    if (!appBucket) return null;
    for (const ctx of Object.values(appBucket)) {
      for (const asset of Object.values(ctx)) {
        const icon = asset.icon_url_large || asset.icon_url;
        if (icon) return STEAM_IMG + icon;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getOne(name: string): Promise<string | null> {
  const hit = cache.get(name);
  if (hit && hit.expires > Date.now()) return hit.url;
  const url = await fetchOne(name);
  cache.set(name, { url, expires: Date.now() + TTL });
  return url;
}

const InputSchema = z.object({
  names: z.array(z.string().min(1).max(255)).min(1).max(50),
});

export const getImages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ images: SteamImageData[] }> => {
    const unique = Array.from(new Set(data.names));
    const out: SteamImageData[] = [];
    const CONCURRENCY = 4;
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const batch = unique.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (n) => ({ marketHashName: n, url: await getOne(n) }))
      );
      out.push(...results);
    }
    return { images: out };
  });
