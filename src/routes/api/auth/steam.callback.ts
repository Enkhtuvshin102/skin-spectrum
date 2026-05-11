import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { sessionConfig, type SteamUser } from "@/lib/steam-session";

const STEAM_ID_RE = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

export const Route = createFileRoute("/api/auth/steam/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const params = url.searchParams;

        // Build verification body: mirror all openid.* params, switch mode.
        const verifyParams = new URLSearchParams();
        for (const [k, v] of params.entries()) {
          if (k.startsWith("openid.")) verifyParams.set(k, v);
        }
        verifyParams.set("openid.mode", "check_authentication");

        const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: verifyParams.toString(),
        });
        const verifyText = await verifyRes.text();
        if (!/is_valid\s*:\s*true/i.test(verifyText)) {
          return new Response("Steam OpenID verification failed", { status: 401 });
        }

        const claimed = params.get("openid.claimed_id") || "";
        const match = claimed.match(STEAM_ID_RE);
        if (!match) return new Response("Invalid Steam claimed_id", { status: 400 });
        const steamId = match[1];

        // Fetch player summary
        let user: SteamUser = {
          steamId,
          personaName: `Player ${steamId.slice(-4)}`,
          avatar: "",
          profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        };

        const apiKey = process.env.STEAM_API_KEY;
        if (apiKey) {
          try {
            const r = await fetch(
              `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
            );
            if (r.ok) {
              const data = (await r.json()) as {
                response?: { players?: Array<{ personaname?: string; avatarfull?: string; profileurl?: string }> };
              };
              const p = data.response?.players?.[0];
              if (p) {
                user = {
                  steamId,
                  personaName: p.personaname || user.personaName,
                  avatar: p.avatarfull || "",
                  profileUrl: p.profileurl || user.profileUrl,
                };
              }
            }
          } catch (e) {
            console.error("Steam GetPlayerSummaries failed:", e);
          }
        }

        const session = await useSession<{ user: SteamUser }>(sessionConfig);
        await session.update({ user });

        return new Response(null, {
          status: 302,
          headers: { Location: "/" },
        });
      },
    },
  },
});
