import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SteamPriceData } from "./types";

/**
 * Live CS2 market pricing.
 *
 * Source priority (per request):
 *   1. Steam Community Market priceoverview
 *   2. (placeholder) Buff163 — public scraping is blocked, kept for future paid proxy
 *   3. (placeholder) CSFloat — requires API key
 *
 * If none succeed → source: "none" and prices are null ("No market data" in UI).
 */

const STEAM_URL = "https://steamcommunity.com/market/priceoverview/";
const APPID = 730;
const CURRENCY = 1; // USD

// In-memory server cache (per worker instance) — 60 second TTL.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { data: SteamPriceData; expires: number }>();

function parseMoney(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.,-]/g, "").replace(",", ""));
  return Number.isFinite(n) ? n : null;
}

function parseInt0(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(s.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function fetchSteam(name: string, attempt = 0): Promise<SteamPriceData> {
  const url = `${STEAM_URL}?appid=${APPID}&currency=${CURRENCY}&market_hash_name=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Floatiq/1.0 (+https://floatiq.lovable.app)",
        Accept: "application/json",
      },
    });

    // Steam rate-limits with 429. Retry with small backoff.
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return fetchSteam(name, attempt + 1);
    }

    if (!res.ok) {
      return emptyPrice(name);
    }

    const json = (await res.json()) as {
      success?: boolean;
      lowest_price?: string;
      median_price?: string;
      volume?: string;
    };

    if (!json.success) return emptyPrice(name);

    return {
      marketHashName: name,
      lowestPrice: parseMoney(json.lowest_price),
      medianPrice: parseMoney(json.median_price),
      volume: parseInt0(json.volume),
      change24h: null, // Steam priceoverview does not expose change
      currency: "USD",
      source: "steam",
      fetchedAt: Date.now(),
    };
  } catch {
    return emptyPrice(name);
  }
}

function emptyPrice(name: string): SteamPriceData {
  return {
    marketHashName: name,
    lowestPrice: null,
    medianPrice: null,
    volume: null,
    change24h: null,
    currency: "USD",
    source: "none",
    fetchedAt: Date.now(),
  };
}

async function getOne(name: string): Promise<SteamPriceData> {
  const hit = cache.get(name);
  if (hit && hit.expires > Date.now()) return hit.data;
  const data = await fetchSteam(name);
  cache.set(name, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

const InputSchema = z.object({
  names: z.array(z.string().min(1).max(255)).min(1).max(50),
});

/**
 * Batch price fetch. Concurrency-limited to avoid Steam rate limits.
 */
export const getPrices = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ prices: SteamPriceData[] }> => {
    const unique = Array.from(new Set(data.names));
    const out: SteamPriceData[] = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const batch = unique.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((n) => getOne(n)));
      out.push(...results);
    }
    return { prices: out };
  });
