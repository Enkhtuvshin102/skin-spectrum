import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useSession } from "@tanstack/react-start/server";
import { sessionConfig, type SessionData } from "@/lib/steam-session";
import type {
  InventoryResponse,
  SteamInventoryItem,
  StickerData,
} from "@/lib/types";

export type InventoryRarity = SteamInventoryItem["rarity"];
export type InventorySticker = StickerData;
// Back-compat alias for existing imports.
export type InventoryItem = SteamInventoryItem;
export type { InventoryResponse };

const STEAM_IMG = "https://community.cloudflare.steamstatic.com/economy/image/";

const RARITY_MAP: Record<string, InventoryRarity> = {
  Consumer: "consumer",
  Industrial: "industrial",
  "Mil-Spec": "milspec",
  "Mil-Spec Grade": "milspec",
  Restricted: "restricted",
  Classified: "classified",
  Covert: "covert",
  "★": "knife",
  Extraordinary: "knife",
  Contraband: "covert",
};

const WEAR_TO_CODE: Record<string, "FN" | "MW" | "FT" | "WW" | "BS"> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

interface SteamTag {
  category: string;
  internal_name: string;
  localized_category_name?: string;
  localized_tag_name?: string;
  name?: string;
  color?: string;
}

interface SteamDescriptionLine {
  type: string;
  value: string;
  name?: string;
}

interface SteamAsset {
  appid: number;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}

interface SteamDescription {
  appid: number;
  classid: string;
  instanceid: string;
  market_hash_name: string;
  name: string;
  icon_url: string;
  type?: string;
  tradable: number;
  marketable: number;
  name_color?: string;
  tags?: SteamTag[];
  descriptions?: SteamDescriptionLine[];
  actions?: { name: string; link: string }[];
}

interface SteamInventoryResponse {
  assets?: SteamAsset[];
  descriptions?: SteamDescription[];
  total_inventory_count?: number;
  success?: number;
  error?: string;
}

function parseStickers(desc: SteamDescription): InventorySticker[] {
  const out: InventorySticker[] = [];
  for (const line of desc.descriptions ?? []) {
    if (!line.value) continue;
    // Steam format: "<br>Sticker: Name1, Name2, Name3"
    const m = line.value.match(/Sticker:\s*([^<]+)/i);
    if (m) {
      m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((n) =>
        out.push({ name: n, wear: 0 })
      );
    }
  }
  return out;
}

function pickWeaponAndSkin(name: string, marketHashName: string): { weapon: string; skinName: string } {
  // e.g. "AK-47 | Redline (Field-Tested)" or "★ Karambit | Doppler (Factory New)"
  const cleaned = marketHashName.replace(/\s*\([^)]*\)\s*$/, "");
  const parts = cleaned.split(" | ");
  if (parts.length >= 2) {
    return { weapon: parts[0].trim(), skinName: parts.slice(1).join(" | ").trim() };
  }
  return { weapon: cleaned.trim(), skinName: name };
}

function tagFor(desc: SteamDescription, category: string): SteamTag | undefined {
  return desc.tags?.find((t) => t.category === category);
}

function normalize(asset: SteamAsset, desc: SteamDescription, steamId: string): InventoryItem {
  const exteriorTag = tagFor(desc, "Exterior");
  const rarityTag = tagFor(desc, "Rarity");
  const exterior = exteriorTag?.localized_tag_name ?? exteriorTag?.name ?? null;
  const rarityName = rarityTag?.localized_tag_name ?? rarityTag?.name ?? "";
  const rarity: InventoryRarity =
    RARITY_MAP[rarityName] ??
    (desc.market_hash_name.startsWith("★") ? "knife" : "milspec");

  const { weapon, skinName } = pickWeaponAndSkin(desc.name, desc.market_hash_name);
  const isStatTrak = /StatTrak/i.test(desc.market_hash_name);
  const isSouvenir = /Souvenir/i.test(desc.market_hash_name);
  const wearCode = exterior ? WEAR_TO_CODE[exterior] ?? null : null;

  const inspectAction = desc.actions?.find((a) => /inspect/i.test(a.name) || a.link.includes("+csgo_econ_action_preview"));
  const inspectLink = inspectAction
    ? inspectAction.link
        .replace("%owner_steamid%", steamId)
        .replace("%assetid%", asset.assetid)
    : null;

  return {
    assetId: asset.assetid,
    classId: asset.classid,
    instanceId: asset.instanceid,
    marketHashName: desc.market_hash_name,
    name: desc.name,
    weapon,
    skinName,
    image: STEAM_IMG + desc.icon_url,
    exterior,
    wearCode,
    float: null,
    rarity,
    rarityColorHex: desc.name_color ? `#${desc.name_color}` : (rarityTag?.color ? `#${rarityTag.color}` : null),
    tradable: desc.tradable === 1,
    marketable: desc.marketable === 1,
    statTrak: isStatTrak,
    souvenir: isSouvenir,
    stickers: parseStickers(desc),
    inspectLink,
    type: desc.type ?? "",
  };
}

async function fetchSteamInventory(steamId: string): Promise<InventoryResponse> {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Floatiq/1.0 (+https://floatiq.lovable.app)",
      Accept: "application/json",
    },
  });

  if (res.status === 403) {
    throw new Error("Inventory is private. Set your Steam inventory to Public in Privacy Settings.");
  }
  if (res.status === 429) {
    throw new Error("Steam rate-limited the request. Try again in a minute.");
  }
  if (!res.ok) {
    throw new Error(`Steam returned ${res.status}. Try again later.`);
  }

  const json = (await res.json()) as SteamInventoryResponse;
  if (!json.assets || !json.descriptions) {
    return { steamId, total: 0, items: [], fetchedAt: Date.now() };
  }

  const descIndex = new Map<string, SteamDescription>();
  for (const d of json.descriptions) {
    descIndex.set(`${d.classid}_${d.instanceid}`, d);
  }

  const items: InventoryItem[] = [];
  for (const a of json.assets) {
    const d = descIndex.get(`${a.classid}_${a.instanceid}`);
    if (!d) continue;
    items.push(normalize(a, d, steamId));
  }

  return {
    steamId,
    total: json.total_inventory_count ?? items.length,
    items,
    fetchedAt: Date.now(),
  };
}

const InputSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/).optional(),
});

/**
 * Fetches a Steam CS2 inventory.
 * - If no steamId is provided, uses the logged-in user's steamId from session.
 * - Steam's public inventory endpoint is unauthenticated, so no API key is needed
 *   (and never sent to the client either way).
 */
export const getInventory = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => InputSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<InventoryResponse> => {
    let steamId = data.steamId;
    if (!steamId) {
      const session = await useSession<SessionData>(sessionConfig);
      steamId = session.data?.user?.steamId;
    }
    if (!steamId) {
      throw new Error("Not signed in. Sign in with Steam to load your inventory.");
    }
    return fetchSteamInventory(steamId);
  });
