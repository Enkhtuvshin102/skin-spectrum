import { Link, useRouterState } from "@tanstack/react-router";
import { Store, Package, Heart, History, Tag, ListChecks, Repeat, Sparkles, Settings, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/", label: "Marketplace", icon: Store },
  { to: "/sell", label: "Sell", icon: Tag },
  { to: "/my-listings", label: "My Listings", icon: ListChecks },
  { to: "/trades", label: "Trades", icon: Repeat },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/watchlist", label: "Watchlist", icon: Heart },
  { to: "/history", label: "Trade History", icon: History },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 glass md:flex md:flex-col">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 px-6 py-5 border-b border-border/60">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-neon">
          <Sparkles className="h-5 w-5 text-background" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-wider neon-text leading-none">FLOATIQ</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CS2 Market</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </p>
        <ul className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-gradient-primary shadow-neon" />
                  )}
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
          </li>
        </ul>
      </nav>

      {/* Auth */}
      <div className="border-t border-border/60 p-4">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-9 w-9 rounded-md ring-1 ring-primary/40" />
            ) : (
              <div className="h-9 w-9 rounded-md bg-gradient-primary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.personaName}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{user.steamId}</p>
            </div>
            <a
              href="/api/auth/logout"
              title="Sign out"
              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <a
            href="/api/auth/steam"
            className="group flex w-full items-center gap-3 rounded-lg bg-secondary px-3 py-2.5 text-sm font-semibold transition hover:bg-gradient-primary hover:text-primary-foreground"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign in with Steam</span>
          </a>
        )}
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          OpenID · Inventory sync
        </p>
      </div>
    </aside>
  );
}
