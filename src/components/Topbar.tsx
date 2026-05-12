import { Search, Bell, Wallet, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

export function Topbar() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 glass-strong px-4 md:px-6">
      <div className="relative flex-1 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search AK-47, AWP, knives, stickers…"
          className="h-10 w-full rounded-lg border border-border bg-input/60 pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="hidden items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-mono text-muted-foreground transition hover:text-foreground sm:flex">
          <Wallet className="h-3.5 w-3.5 text-neon-cyan" />
          <span className="text-foreground">$0.00</span>
        </button>
        <button className="relative rounded-lg border border-border bg-secondary p-2 text-muted-foreground transition hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px] shadow-destructive" />
        </button>
        {user ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-2 py-1.5">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-6 w-6 rounded ring-1 ring-primary/40" />
            ) : (
              <div className="h-6 w-6 rounded bg-gradient-primary" />
            )}
            <span className="hidden text-xs font-semibold sm:inline max-w-[120px] truncate">{user.personaName}</span>
            <a href="/api/auth/logout" title="Sign out" className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <a
            href="/api/auth/steam"
            className="flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Sign in with Steam
          </a>
        )}
      </div>
    </header>
  );
}
