import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@tanstack/react-start/server";
import { sessionConfig } from "@/lib/steam-session";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      GET: async () => {
        const session = await useSession(sessionConfig);
        await session.clear();
        return new Response(null, { status: 302, headers: { Location: "/" } });
      },
      POST: async () => {
        const session = await useSession(sessionConfig);
        await session.clear();
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
