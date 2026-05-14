// Featured CS2 skin catalog. Images stay local (catalog art) but every entry
// has a real Steam `marketHashName` so live pricing can be looked up.
//
// NOTE: prices are NOT stored here — they are fetched live via src/lib/pricing.ts
// and rendered through the usePrices() hook.

export type Wear = "FN" | "MW" | "FT" | "WW" | "BS";
export type Rarity =
  | "milspec" | "restricted" | "classified" | "covert" | "knife";
export type WeaponType =
  | "Rifle" | "Sniper" | "Pistol" | "SMG" | "Knife" | "Gloves";

export interface Sticker {
  name: string;
  wear: number; // 0..1
}

export interface Skin {
  id: string;
  marketHashName: string; // exact Steam Community Market name
  weapon: string;
  weaponType: WeaponType;
  skinName: string;
  
  float: number;
  wear: Wear;
  pattern: number;
  stickers: Sticker[];
  rarity: Rarity;
  statTrak?: boolean;
  souvenir?: boolean;
  inspectLink: string;
  seller: string;
  listedAt: number; // ms ago
}

export const wearLabel: Record<Wear, string> = {
  FN: "Factory New",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  WW: "Well-Worn",
  BS: "Battle-Scarred",
};

export function wearFromFloat(f: number): Wear {
  if (f < 0.07) return "FN";
  if (f < 0.15) return "MW";
  if (f < 0.38) return "FT";
  if (f < 0.45) return "WW";
  return "BS";
}

const stickers = (...names: string[]): Sticker[] =>
  names.map((n, i) => ({ name: n, wear: ((i * 37) % 20) / 100 }));

/**
 * Build a Steam market_hash_name from base + wear + flags.
 * Examples:
 *   build("AK-47 | Redline", "FT")                    → "AK-47 | Redline (Field-Tested)"
 *   build("AK-47 | Redline", "FT", { statTrak:true }) → "StatTrak™ AK-47 | Redline (Field-Tested)"
 *   build("AWP | Dragon Lore", "FN", { souvenir:true })→ "Souvenir AWP | Dragon Lore (Factory New)"
 */
function build(base: string, wear: Wear, flags: { statTrak?: boolean; souvenir?: boolean } = {}): string {
  const prefix = flags.souvenir ? "Souvenir " : flags.statTrak ? "StatTrak™ " : "";
  return `${prefix}${base} (${wearLabel[wear]})`;
}

export const SKINS: Skin[] = [
  {
    id: "1", weapon: "AK-47", weaponType: "Rifle", skinName: "Redline",
    marketHashName: build("AK-47 | Redline", "FT", { statTrak: true }),
float: 0.1832, wear: "FT", pattern: 661,
    stickers: stickers("Titan (Holo) | Katowice 2014", "iBUYPOWER (Holo) | Katowice 2014"),
    rarity: "classified", statTrak: true,
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "ProTrader", listedAt: 12 * 60_000,
  },
  {
    id: "2", weapon: "AWP", weaponType: "Sniper", skinName: "Dragon Lore",
    marketHashName: build("AWP | Dragon Lore", "FN", { souvenir: true }),
float: 0.0421, wear: "FN", pattern: 420,
    stickers: stickers("Crown (Foil)", "Katowice 2014"),
    rarity: "covert", souvenir: true,
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "WhaleAccount", listedAt: 2 * 60 * 60_000,
  },
  {
    id: "3", weapon: "AWP", weaponType: "Sniper", skinName: "Asiimov",
    marketHashName: build("AWP | Asiimov", "FT"),
float: 0.2412, wear: "FT", pattern: 87,
    stickers: stickers("FaZe Clan | Boston 2018"),
    rarity: "covert",
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "skinflip.io", listedAt: 8 * 60_000,
  },
  {
    id: "4", weapon: "M4A4", weaponType: "Rifle", skinName: "Howl",
    marketHashName: build("M4A4 | Howl", "FN"),
    float: 0.0689, wear: "FN", pattern: 33,
    stickers: [], rarity: "covert",
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "ContrabandKing", listedAt: 45 * 60_000,
  },
  {
    id: "5", weapon: "★ Karambit", weaponType: "Knife", skinName: "Doppler",
    marketHashName: build("★ Karambit | Doppler", "FN", { statTrak: true }),
float: 0.0098, wear: "FN", pattern: 387,
    stickers: [], rarity: "knife", statTrak: true,
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "BlueGemHunter", listedAt: 30 * 60_000,
  },
  {
    id: "6", weapon: "Glock-18", weaponType: "Pistol", skinName: "Fade",
    marketHashName: build("Glock-18 | Fade", "FN"),
float: 0.0125, wear: "FN", pattern: 901,
    stickers: stickers("Astralis | Berlin 2019"),
    rarity: "restricted",
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "MarketBot", listedAt: 4 * 60_000,
  },
  {
    id: "7", weapon: "Desert Eagle", weaponType: "Pistol", skinName: "Blaze",
    marketHashName: build("Desert Eagle | Blaze", "FN"),
float: 0.0312, wear: "FN", pattern: 12,
    stickers: [], rarity: "restricted",
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "RetroSkins", listedAt: 6 * 60 * 60_000,
  },
  {
    id: "8", weapon: "USP-S", weaponType: "Pistol", skinName: "Kill Confirmed",
    marketHashName: build("USP-S | Kill Confirmed", "FT", { statTrak: true }),
float: 0.1923, wear: "FT", pattern: 504,
    stickers: stickers("NaVi (Holo) | Stockholm 2021", "s1mple | Stockholm 2021"),
    rarity: "covert", statTrak: true,
    inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview",
    seller: "s1mpleFan", listedAt: 18 * 60_000,
  },
  {
    id: "9", weapon: "AK-47", weaponType: "Rifle", skinName: "Redline",
    marketHashName: build("AK-47 | Redline", "FT"),
float: 0.3812, wear: "FT", pattern: 102,
    stickers: [], rarity: "classified",
    inspectLink: "#", seller: "QuickFlip", listedAt: 60_000,
  },
  {
    id: "10", weapon: "AWP", weaponType: "Sniper", skinName: "Asiimov",
    marketHashName: build("AWP | Asiimov", "WW"),
float: 0.4421, wear: "WW", pattern: 211,
    stickers: [], rarity: "covert",
    inspectLink: "#", seller: "BudgetSkins", listedAt: 9 * 60_000,
  },
  {
    id: "11", weapon: "Glock-18", weaponType: "Pistol", skinName: "Fade",
    marketHashName: build("Glock-18 | Fade", "FN"),
float: 0.0312, wear: "FN", pattern: 412,
    stickers: stickers("Vitality (Holo)"), rarity: "restricted",
    inspectLink: "#", seller: "EuroTrader", listedAt: 22 * 60_000,
  },
  {
    id: "12", weapon: "★ Karambit", weaponType: "Knife", skinName: "Doppler",
    marketHashName: build("★ Karambit | Doppler", "FN"),
float: 0.0231, wear: "FN", pattern: 102,
    stickers: [], rarity: "knife",
    inspectLink: "#", seller: "KnifeVault", listedAt: 90 * 60_000,
  },
];

export const WEAPON_TYPES: WeaponType[] = ["Rifle", "Sniper", "Pistol", "SMG", "Knife", "Gloves"];
export const WEARS: Wear[] = ["FN", "MW", "FT", "WW", "BS"];

export function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "No market data";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function timeAgo(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.floor(ms / (60 * 60_000))}h ago`;
  return `${Math.floor(ms / (24 * 60 * 60_000))}d ago`;
}
