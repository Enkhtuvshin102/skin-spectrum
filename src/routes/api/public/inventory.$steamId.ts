import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getInventory } from "@/lib/inventory.functions";

const ParamsSchema = z.object({ steamId: z.string().regex(/^\d{17}$/) });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/inventory/$steamId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const parsed = ParamsSchema.safeParse(params);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid SteamID. Must be a 17-digit SteamID64." },
            { status: 400, headers: CORS }
          );
        }
        try {
          const data = await getInventory({ data: { steamId: parsed.data.steamId } });
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
              ...CORS,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to fetch inventory";
          return Response.json({ error: message }, { status: 502, headers: CORS });
        }
      },
    },
  },
});
