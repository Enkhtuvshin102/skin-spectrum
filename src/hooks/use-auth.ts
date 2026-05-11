import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth.functions";
import type { SteamUser } from "@/lib/steam-session";

export function useAuth() {
  const [user, setUser] = useState<SteamUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((r) => {
        if (alive) setUser(r.user);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { user, loading };
}
