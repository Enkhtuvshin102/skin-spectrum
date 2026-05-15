// Shared types for the P2P listing system. Pure type module.

export type ListingStatus = "active" | "unavailable" | "removed" | "sold";

export interface ListingSticker {
  name: string;
  wear: number;
}

export interface SellerProfile {
  steamId: string;
  personaName: string;
  avatar: string | null;
  profileUrl: string | null;
  tradeUrl: string | null;
}

export interface Listing {
  id: string;
  assetId: string;
  steamId: string;
  marketHashName: string;
  name: string;
  weapon: string;
  skinName: string;
  exterior: string | null;
  wearCode: string | null;
  float: number | null;
  rarity: string;
  rarityColorHex: string | null;
  image: string;
  stickers: ListingSticker[];
  inspectLink: string | null;
  statTrak: boolean;
  souvenir: boolean;
  priceCents: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  lastValidatedAt: string | null;
  seller: SellerProfile | null;
}

export interface ListingsPage {
  items: Listing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListingsFilter {
  search?: string;        // matches name / skin / sticker
  weaponTypes?: string[]; // matches weapon column substrings
  wearCodes?: string[];   // FN/MW/FT/WW/BS
  minStickers?: number;
  priceMin?: number;      // USD
  priceMax?: number;      // USD
  sort?: "recent" | "price-asc" | "price-desc" | "float-asc";
  page?: number;
  pageSize?: number;
}
