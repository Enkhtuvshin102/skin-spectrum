import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/steam")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;
        const returnTo = `${origin}/api/auth/steam/callback`;

        const params = new URLSearchParams({
          "openid.ns": "http://specs.openid.net/auth/2.0",
          "openid.mode": "checkid_setup",
          "openid.return_to": returnTo,
          "openid.realm": origin,
          "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        });

        return new Response(null, {
          status: 302,
          headers: { Location: `https://steamcommunity.com/openid/login?${params}` },
        });
      },
    },
  },
});
