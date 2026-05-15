import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sessionConfig, type SessionData, type SteamUser } from "@/lib/steam-session";
import type { Listing, ListingsFilter, ListingsPage, SellerProfile } from "@/lib/listings.types";
import type { InventoryItem } from "@/lib/inventory.functions";
import { getInventory } from "@/lib/inventory.functions";

/* ----------------------------- helpers ----------------------------- */

async function requireSession(): Promise<SteamUser> {
  const session = await useSession<SessionData>(sessionConfig);
  const user = session.data?.user;
  if (!user) throw new Error("Not signed in. Sign in with Steam to continue.");
  return user;
}

interface ListingRow {
  id: string;
  asset_id: string;
  steam_id: string;
  market_hash_name: string;
  name: string;
  weapon: string;
  skin_name: string;
  exterior: string | null;
  wear_code: string | null;
  float_value: number | null;
  rarity: string;
  rarity_color_hex: string | null;
  image: string;
  stickers: unknown;
  inspect_link: string | null;
  stat_trak: boolean;
  souvenir: boolean;
  price_cents: number;
  status: Listing["status"];
  created_at: string;
  updated_at: string;
  last_validated_at: string | null;
}

interface SellerRow {
  steam_id: string;
  persona_name: string;
  avatar: string | null;
  profile_url: string | null;
  trade_url: string | null;
}

function mapSeller(row: SellerRow | null | undefined): SellerProfile | null {
  if (!row) return null;
  return {
    steamId: row.steam_id,
    personaName: row.persona_name,
    avatar: row.avatar,
    profileUrl: row.profile_url,
    tradeUrl: row.trade_url,
  };
}

function mapListing(row: ListingRow, seller: SellerRow | null): Listing {
  return {
    id: row.id,
    assetId: row.asset_id,
    steamId: row.steam_id,
    marketHashName: row.market_hash_name,
    name: row.name,
    weapon: row.weapon,
    skinName: row.skin_name,
    exterior: row.exterior,
    wearCode: row.wear_code,
    float: row.float_value == null ? null : Number(row.float_value),
    rarity: row.rarity,
    rarityColorHex: row.rarity_color_hex,
    image: row.image,
    stickers: Array.isArray(row.stickers) ? (row.stickers as Listing["stickers"]) : [],
    inspectLink: row.inspect_link,
    statTrak: row.stat_trak,
    souvenir: row.souvenir,
    priceCents: row.price_cents,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastValidatedAt: row.last_validated_at,
    seller: mapSeller(seller),
  };
}

/* ----------------------------- profile ----------------------------- */

const TradeUrlSchema = z.object({
  tradeUrl: z
    .string()
    .min(1)
    .max(500)
    .url()
    .refine(
      (s) => /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[A-Za-z0-9_-]+$/.test(s),
      "Must be a valid Steam trade URL (https://steamcommunity.com/tradeoffer/new/?partner=...&token=...)"
    ),
});

export const upsertOwnSellerProfile = createServerFn({ method: "POST" }).handler(async () => {
  const user = await requireSession();
  await supabaseAdmin.from("seller_profiles").upsert(
    {
      steam_id: user.steamId,
      persona_name: user.personaName,
      avatar: user.avatar || null,
      profile_url: user.profileUrl || null,
    },
    { onConflict: "steam_id", ignoreDuplicates: false },
  );
  return { ok: true };
});

export const getMySellerProfile = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSession();
  const { data } = await supabaseAdmin
    .from("seller_profiles")
    .select("*")
    .eq("steam_id", user.steamId)
    .maybeSingle();
  return { profile: mapSeller(data as SellerRow | null) };
});

export const saveTradeUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TradeUrlSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();
    // ensure profile exists then update
    await supabaseAdmin.from("seller_profiles").upsert(
      {
        steam_id: user.steamId,
        persona_name: user.personaName,
        avatar: user.avatar || null,
        profile_url: user.profileUrl || null,
        trade_url: data.tradeUrl,
      },
      { onConflict: "steam_id" },
    );
    return { ok: true };
  });

/* ----------------------------- listings ----------------------------- */

const CreateSchema = z.object({
  assetId: z.string().regex(/^\d+$/).max(40),
  priceUsd: z.number().min(0.03).max(100000),
});

export const createListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();

    // Trade URL required
    const { data: profile } = await supabaseAdmin
      .from("seller_profiles")
      .select("trade_url")
      .eq("steam_id", user.steamId)
      .maybeSingle();
    if (!profile?.trade_url) {
      throw new Error("Add your Steam trade URL in Settings before listing items.");
    }

    // Re-fetch seller inventory and find the asset
    const inv = await getInventory({ data: { steamId: user.steamId } });
    const item = inv.items.find((i) => i.assetId === data.assetId);
    if (!item) throw new Error("Item not found in your Steam inventory.");
    if (!item.tradable) throw new Error("This item is currently trade-locked on Steam.");
    if (!item.marketable) throw new Error("This item is not marketable.");

    // Duplicate active check
    const { data: existing } = await supabaseAdmin
      .from("listings")
      .select("id")
      .eq("steam_id", user.steamId)
      .eq("asset_id", data.assetId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) throw new Error("This item is already listed.");

    // Ensure profile exists
    await supabaseAdmin.from("seller_profiles").upsert(
      {
        steam_id: user.steamId,
        persona_name: user.personaName,
        avatar: user.avatar || null,
        profile_url: user.profileUrl || null,
      },
      { onConflict: "steam_id" },
    );

    const insert = {
      asset_id: item.assetId,
      steam_id: user.steamId,
      market_hash_name: item.marketHashName,
      name: item.name,
      weapon: item.weapon,
      skin_name: item.skinName,
      exterior: item.exterior,
      wear_code: item.wearCode,
      float_value: item.float,
      rarity: item.rarity,
      rarity_color_hex: item.rarityColorHex,
      image: item.image,
      stickers: item.stickers as unknown as never,
      inspect_link: item.inspectLink,
      stat_trak: item.statTrak,
      souvenir: item.souvenir,
      price_cents: Math.round(data.priceUsd * 100),
      status: "active" as const,
      last_validated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { listing: mapListing(row as ListingRow, null) };
  });

const IdSchema = z.object({ id: z.string().uuid() });
const PriceSchema = z.object({ id: z.string().uuid(), priceUsd: z.number().min(0.03).max(100000) });

async function ownListing(id: string, steamId: string) {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("steam_id, status")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Listing not found.");
  if (data.steam_id !== steamId) throw new Error("Not your listing.");
  return data;
}

export const removeListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();
    await ownListing(data.id, user.steamId);
    const { error } = await supabaseAdmin
      .from("listings")
      .update({ status: "removed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateListingPrice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PriceSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();
    await ownListing(data.id, user.steamId);
    const { error } = await supabaseAdmin
      .from("listings")
      .update({ price_cents: Math.round(data.priceUsd * 100) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const relistListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireSession();
    const row = await ownListing(data.id, user.steamId);
    // Make sure no other active duplicate
    const { data: rowFull } = await supabaseAdmin
      .from("listings")
      .select("asset_id")
      .eq("id", data.id)
      .single();
    if (rowFull) {
      const { data: dup } = await supabaseAdmin
        .from("listings")
        .select("id")
        .eq("steam_id", user.steamId)
        .eq("asset_id", rowFull.asset_id)
        .eq("status", "active")
        .neq("id", data.id)
        .maybeSingle();
      if (dup) throw new Error("Another active listing exists for this item.");
    }
    // Validate seller still owns the asset
    const inv = await getInventory({ data: { steamId: user.steamId } });
    if (rowFull && !inv.items.some((i) => i.assetId === rowFull.asset_id)) {
      throw new Error("Item no longer in your Steam inventory.");
    }
    const { error } = await supabaseAdmin
      .from("listings")
      .update({ status: "active", last_validated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    void row;
    return { ok: true };
  });

/* ----------------------------- queries ----------------------------- */

const FilterSchema = z.object({
  search: z.string().max(120).optional(),
  weaponTypes: z.array(z.string().max(40)).max(20).optional(),
  wearCodes: z.array(z.enum(["FN", "MW", "FT", "WW", "BS"])).max(5).optional(),
  minStickers: z.number().min(0).max(6).optional(),
  priceMin: z.number().min(0).max(1_000_000).optional(),
  priceMax: z.number().min(0).max(1_000_000).optional(),
  sort: z.enum(["recent", "price-asc", "price-desc", "float-asc"]).optional(),
  page: z.number().min(0).max(10_000).optional(),
  pageSize: z.number().min(1).max(60).optional(),
});

const WEAPON_TYPE_MAP: Record<string, RegExp> = {
  Rifle: /AK-47|M4A4|M4A1-S|FAMAS|Galil|AUG|SG 553/i,
  Sniper: /AWP|SSG 08|SCAR-20|G3SG1/i,
  Pistol: /Glock|USP|P2000|Desert Eagle|R8|Five-SeveN|Tec-9|CZ75|P250|Dual Berettas/i,
  SMG: /MAC-10|MP9|MP7|MP5|UMP-45|P90|PP-Bizon/i,
  Knife: /Knife|Karambit|Bayonet|★|Daggers|Talon/i,
  Gloves: /Gloves|Wraps/i,
};

export const listMarketplace = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): ListingsFilter => FilterSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<ListingsPage> => {
    const page = data.page ?? 0;
    const pageSize = data.pageSize ?? 24;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let q = supabaseAdmin
      .from("listings")
      .select("*", { count: "exact" })
      .eq("status", "active");

    if (data.search) {
      const s = data.search.replace(/[%_]/g, "");
      q = q.or(
        `name.ilike.%${s}%,skin_name.ilike.%${s}%,weapon.ilike.%${s}%,market_hash_name.ilike.%${s}%`,
      );
    }
    if (data.wearCodes?.length) q = q.in("wear_code", data.wearCodes);
    if (data.priceMin != null) q = q.gte("price_cents", Math.round(data.priceMin * 100));
    if (data.priceMax != null && data.priceMax > 0)
      q = q.lte("price_cents", Math.round(data.priceMax * 100));

    if (data.weaponTypes?.length) {
      const patterns = data.weaponTypes
        .map((t) => WEAPON_TYPE_MAP[t]?.source)
        .filter(Boolean) as string[];
      if (patterns.length) {
        const combined = patterns.join("|");
        q = q.or(`weapon.~*.${combined}`);
      }
    }

    switch (data.sort) {
      case "price-asc": q = q.order("price_cents", { ascending: true }); break;
      case "price-desc": q = q.order("price_cents", { ascending: false }); break;
      case "float-asc": q = q.order("float_value", { ascending: true, nullsFirst: false }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    q = q.range(from, to);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const listings = (rows ?? []) as ListingRow[];

    let filtered = listings;
    if (data.minStickers && data.minStickers > 0) {
      filtered = filtered.filter(
        (r) => Array.isArray(r.stickers) && (r.stickers as unknown[]).length >= data.minStickers!,
      );
    }

    // batch fetch sellers
    const sellerIds = Array.from(new Set(filtered.map((r) => r.steam_id)));
    const sellersMap = new Map<string, SellerRow>();
    if (sellerIds.length) {
      const { data: sellers } = await supabaseAdmin
        .from("seller_profiles")
        .select("*")
        .in("steam_id", sellerIds);
      for (const s of (sellers ?? []) as SellerRow[]) sellersMap.set(s.steam_id, s);
    }

    return {
      items: filtered.map((r) => mapListing(r, sellersMap.get(r.steam_id) ?? null)),
      total: count ?? filtered.length,
      page,
      pageSize,
    };
  });

export const getListingById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }): Promise<{ listing: Listing | null }> => {
    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { listing: null };
    const { data: seller } = await supabaseAdmin
      .from("seller_profiles")
      .select("*")
      .eq("steam_id", (row as ListingRow).steam_id)
      .maybeSingle();
    return { listing: mapListing(row as ListingRow, (seller as SellerRow | null) ?? null) };
  });

export const getMyListings = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSession();
  const { data: rows, error } = await supabaseAdmin
    .from("listings")
    .select("*")
    .eq("steam_id", user.steamId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return {
    items: (rows ?? []).map((r) => mapListing(r as ListingRow, null)),
  };
});

export const getMyActiveAssetIds = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireSession();
  const { data } = await supabaseAdmin
    .from("listings")
    .select("asset_id")
    .eq("steam_id", user.steamId)
    .eq("status", "active");
  return { assetIds: (data ?? []).map((r) => (r as { asset_id: string }).asset_id) };
});

/* ----------------------------- on-demand revalidation ----------------------------- */

const REVALIDATE_TTL_MS = 5 * 60_000;

export const revalidateListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Listing not found.");
    const r = row as ListingRow;
    if (r.status !== "active") return { status: r.status };
    if (r.last_validated_at && Date.now() - new Date(r.last_validated_at).getTime() < REVALIDATE_TTL_MS) {
      return { status: r.status };
    }

    let stillOwned = true;
    try {
      const inv = await getInventory({ data: { steamId: r.steam_id } });
      stillOwned = inv.items.some((i: InventoryItem) => i.assetId === r.asset_id);
    } catch {
      // if Steam errors (private/rate-limit), do nothing — keep listing as-is
      return { status: r.status };
    }

    if (!stillOwned) {
      await supabaseAdmin
        .from("listings")
        .update({ status: "unavailable", last_validated_at: new Date().toISOString() })
        .eq("id", data.id);
      return { status: "unavailable" as const };
    }
    await supabaseAdmin
      .from("listings")
      .update({ last_validated_at: new Date().toISOString() })
      .eq("id", data.id);
    return { status: "active" as const };
  });
