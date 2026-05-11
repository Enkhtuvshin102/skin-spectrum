import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { sessionConfig, type SteamUser } from "./steam-session";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<{ user: SteamUser }>(sessionConfig);
  return { user: session.data?.user ?? null };
});
