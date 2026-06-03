import type { Listing, SellerProfile } from "./listings.types";

export type TradeStatus = "pending" | "confirmed" | "completed" | "declined" | "cancelled";

export interface TradeRequest {
  id: string;
  listingId: string;
  buyerSteamId: string;
  sellerSteamId: string;
  priceCents: number;
  status: TradeStatus;
  buyerMessage: string | null;
  sellerTradeUrl: string | null;
  buyerTradeUrl: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  listing: Listing | null;
  buyer: SellerProfile | null;
  seller: SellerProfile | null;
}
