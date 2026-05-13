// Reusable Steam inventory helper. Re-exports the live server fn and shared types
// so callers have a single import surface.
//
//   import { fetchInventory, type SteamInventoryItem } from "@/lib/steamInventory";

import { getInventory } from "./inventory.functions";
import type { InventoryResponse, SteamInventoryItem, StickerData } from "./types";

export type { InventoryResponse, SteamInventoryItem, StickerData };

export interface FetchInventoryOptions {
  steamId?: string; // Defaults to logged-in user's steamId from session
}

export async function fetchInventory(opts: FetchInventoryOptions = {}): Promise<InventoryResponse> {
  return getInventory({ data: opts.steamId ? { steamId: opts.steamId } : {} });
}
