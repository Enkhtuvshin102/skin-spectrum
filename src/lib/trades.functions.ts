import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sessionConfig, type SessionData, type SteamUser } from "@/lib/steam-session";
import type { TradeRequest, TradeStatus } from "@/lib/trades.types";
import type { Listing, SellerProfile } from "@/lib/listings.types";

async function requireSession(): Promise<SteamUser> {
  const session = await useSession<SessionData>(sessionConfig);
  const user = session.data?.user;
  if (!user) throw new Error("Sign in with Steam to continue.");
  return user;
}

interface TradeRow {
  id: string;
  listing_id: string;
  buyer_steam_id: string;
  seller_steam_id: string;
  price_cents: number;
  status: TradeStatus;
  buyer_message: string | null;
  seller_trade_url: string | null;
  buyer_trade_url: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

interface ListingRow {
  id: string; asset_id: string; steam_id: string; market_hash_name: string;
  name: string; weapon: string; skin_name: string; exterior: string | null;
  wear_code: string | null; float_value: number | null; rarity: string;
  rarity_color_hex: string | null; image: string; stickers: unknown;
  inspect_link: string | null; stat_trak: boolean; souvenir: boolean;
  price_cents: number; status: Listing["status"];
  created_at: string; updated_at: string; last_validated_at: string | null;
}

interface SellerRow {
  steam_id: string; persona_name: string; avatar: string | null;
  profile_url: string | null; trade_url: string | null;
}

function mapSeller(r: SellerRow | null | undefined): SellerProfile | null {
  if (!r) return null;
  return {
    steamId: r.steam_id, personaName: r.persona_name,
    avatar: r.avatar, profileUrl: r.profile_url, tradeUrl: r.trade_url,
  };
}
function mapListing(r: ListingRow, s: SellerRow | null): Listing {
  return {
    id: r.id, assetId: r.asset_id, steamId: r.steam_id,
    marketHashName: r.market_hash_name, name: r.name, weapon: r.weapon,
    skinName: r.skin_name, exterior: r.exterior, wearCode: r.wear_code,
    float: r.float_value == null ? null : Number(r.float_value),
    rarity: r.rarity, rarityColorHex: r.rarity_color_hex, image: r.image,
    stickers: Array.isArray(r.stickers) ? (r.stickers as Listing["stickers"]) : [],
    inspectLink: r.inspect_link, statTrak: r.stat_trak, souvenir: r.souvenir,
    priceCents: r.price_cents, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at,
    lastValidatedAt: r.last_validated_at, seller: mapSeller(s),
  };
}

function mapTrade(
  t: TradeRow,
  listing: Listing | null,
  buyer: SellerRow | null,
  seller: SellerRow | null,
): TradeRequest {
  return {
    id: t.id, listingId: t.listing_id,
    buyerSteamId: t.buyer_steam_id, sellerSteamId: t.seller_steam_id,
    priceCents: t.price_cents, status: t.status,
    buyerMessage: t.buyer_message,
    sellerTradeUrl: t.seller_trade_url, buyerTradeUrl: t.buyer_trade_url,
    createdAt: t.created_at, updatedAt: t.updated_at,
    confirmedAt: t.confirmed_at, completedAt: t.completed_at,
    listing, buyer: mapSeller(buyer), seller: mapSeller(seller),
  };
}

async function hydrateTrades(rows: TradeRow[]): Promise<TradeRequest[]> {
  if (rows.length === 0) return [];
  const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
  const steamIds = Array.from(
    new Set(rows.flatMap((r) => [r.buyer_steam_id, r.seller_steam_id])),
  );
  const [{ data: listings }, { data: sellers }] = await Promise.all([
    supabaseAdmin.from("listings").select("*").in("id", listingIds),
    supabaseAdmin.from("seller_profiles").select("*").in("steam_id", steamIds),
  ]);
  const lmap = new Map<string, ListingRow>();
  for (const l of (listings ?? []) as ListingRow[]) lmap.set(l.id, l);
  const smap = new Map<string, SellerRow>();
  for (const s of (sellers ?? []) as SellerRow[]) smap.set(s.steam_id, s);
  return rows.map((t) => {
    const lr = lmap.get(t.listing_id) ?? null;
    const seller = smap.get(t.seller_steam_id) ?? null;
    const buyer = smap.get(t.buyer_steam_id) ?? null;
    const listing = lr ? mapListing(lr, seller) : null;
    return mapTrade(t, listing, buyer, seller);
  });
}

/* ----------------------------- create ----------------------------- */

const CreateSchema = z.object({
  listingId: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
});

export const createTradeRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();

    // Buyer must have a trade URL
    const { data: buyerProfile } = await supabaseAdmin
      .from("seller_profiles")
      .select("trade_url, persona_name")
      .eq("steam_id", user.steamId)
      .maybeSingle();
    if (!buyerProfile?.trade_url) {
      throw new Error("Add your Steam trade URL in Settings before buying.");
    }

    // Listing must exist and be active
    const { data: listingRow, error: lerr } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lerr) throw new Error(lerr.message);
    if (!listingRow) throw new Error("Listing not found.");
    const lr = listingRow as ListingRow;
    if (lr.status !== "active") throw new Error("This listing is no longer available.");
    if (lr.steam_id === user.steamId) throw new Error("You can't buy your own listing.");

    // Get seller trade url snapshot
    const { data: sellerRow } = await supabaseAdmin
      .from("seller_profiles")
      .select("*")
      .eq("steam_id", lr.steam_id)
      .maybeSingle();

    // Make sure buyer profile exists
    await supabaseAdmin.from("seller_profiles").upsert(
      {
        steam_id: user.steamId,
        persona_name: user.personaName,
        avatar: user.avatar || null,
        profile_url: user.profileUrl || null,
      },
      { onConflict: "steam_id" },
    );

    const { data: row, error } = await supabaseAdmin
      .from("trade_requests")
      .insert({
        listing_id: lr.id,
        buyer_steam_id: user.steamId,
        seller_steam_id: lr.steam_id,
        price_cents: lr.price_cents,
        buyer_message: data.message ?? null,
        buyer_trade_url: buyerProfile.trade_url,
        seller_trade_url: (sellerRow as SellerRow | null)?.trade_url ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new Error("You already have an active request for this listing.");
      }
      throw new Error(error.message);
    }
    const [trade] = await hydrateTrades([row as TradeRow]);
    return { trade };
  });

/* ----------------------------- status changes ----------------------------- */

const IdSchema = z.object({ id: z.string().uuid() });

async function loadTrade(id: string): Promise<TradeRow> {
  const { data, error } = await supabaseAdmin
    .from("trade_requests").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Trade not found.");
  return data as TradeRow;
}

function assertTransition(from: TradeStatus, to: TradeStatus) {
  const allowed: Record<TradeStatus, TradeStatus[]> = {
    pending: ["confirmed", "declined", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    declined: [],
    cancelled: [],
  };
  if (!allowed[from].includes(to)) {
    throw new Error(`Cannot change trade from ${from} to ${to}.`);
  }
}

export const confirmTradeRequest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const t = await loadTrade(data.id);
    if (t.seller_steam_id !== user.steamId) throw new Error("Only the seller can confirm.");
    assertTransition(t.status, "confirmed");
    const { error } = await supabaseAdmin
      .from("trade_requests")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const declineTradeRequest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const t = await loadTrade(data.id);
    if (t.seller_steam_id !== user.steamId) throw new Error("Only the seller can decline.");
    assertTransition(t.status, "declined");
    const { error } = await supabaseAdmin
      .from("trade_requests").update({ status: "declined" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelTradeRequest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const t = await loadTrade(data.id);
    if (t.buyer_steam_id !== user.steamId && t.seller_steam_id !== user.steamId) {
      throw new Error("Not your trade.");
    }
    assertTransition(t.status, "cancelled");
    const { error } = await supabaseAdmin
      .from("trade_requests").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeTradeRequest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const t = await loadTrade(data.id);
    if (t.buyer_steam_id !== user.steamId && t.seller_steam_id !== user.steamId) {
      throw new Error("Not your trade.");
    }
    assertTransition(t.status, "completed");
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("trade_requests")
      .update({ status: "completed", completed_at: nowIso })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // Mark listing sold
    await supabaseAdmin
      .from("listings").update({ status: "sold" }).eq("id", t.listing_id);
    return { ok: true };
  });

/* ----------------------------- queries ----------------------------- */

export const getMyPurchases = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSession();
  const { data, error } = await supabaseAdmin
    .from("trade_requests")
    .select("*")
    .eq("buyer_steam_id", user.steamId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { items: await hydrateTrades((data ?? []) as TradeRow[]) };
});

export const getMySales = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSession();
  const { data, error } = await supabaseAdmin
    .from("trade_requests")
    .select("*")
    .eq("seller_steam_id", user.steamId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { items: await hydrateTrades((data ?? []) as TradeRow[]) };
});

export const getTradeById = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => IdSchema.parse(i))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const t = await loadTrade(data.id);
    if (t.buyer_steam_id !== user.steamId && t.seller_steam_id !== user.steamId) {
      throw new Error("Not your trade.");
    }
    const [trade] = await hydrateTrades([t]);
    return { trade };
  });
