// Shared types for Steam inventory + pricing.
// Pure type module — safe to import from client and server.

export interface StickerData {
  name: string;
  wear: number; // 0..1; Steam doesn't expose precise sticker wear publicly → 0
}

export interface SteamInventoryItem {
  assetId: string;
  classId: string;
  instanceId: string;
  marketHashName: string;
  name: string;
  weapon: string;
  skinName: string;
  exterior: string | null;
  wearCode: "FN" | "MW" | "FT" | "WW" | "BS" | null;
  float: number | null;          // Float requires CSFloat inspect API; null when unknown
  rarity:
    | "consumer" | "industrial" | "milspec" | "restricted"
    | "classified" | "covert" | "knife";
  rarityColorHex: string | null;
  image: string;                 // full https URL
  stickers: StickerData[];
  inspectLink: string | null;
  tradable: boolean;
  marketable: boolean;
  statTrak: boolean;
  souvenir: boolean;
  type: string;
}

export interface InventoryResponse {
  steamId: string;
  total: number;
  items: SteamInventoryItem[];
  fetchedAt: number;
}

export interface SteamPriceData {
  marketHashName: string;
  lowestPrice: number | null;     // USD
  medianPrice: number | null;     // USD
  volume: number | null;          // 24h sales count
  change24h: number | null;       // percent (null if unavailable)
  currency: "USD";
  source: "steam" | "buff163" | "csfloat" | "none";
  fetchedAt: number;
}
