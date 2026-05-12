import { Search, Bell, Wallet, LogOut, Palette, Moon, Terminal, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type Theme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_META: Record<Theme, { label: string; icon: typeof Moon; desc: string }> = {
  dark: { label: "Dark", icon: Moon, desc: "Default neon dark" },
  legacy: { label: "Legacy", icon: Terminal, desc: "Classic CS:GO orange" },
  dynamic: { label: "Dynamic", icon: Sparkles, desc: "Animated shifting hue" },
};

export function Topbar() {
  const { user } = useAuth();
  const { theme, setTheme, mounted, themes } = useTheme();
  const Active = THEME_META[theme].icon;
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
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Choose theme"
            suppressHydrationWarning
            className="rounded-lg border border-border bg-secondary p-2 text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {mounted ? <Active className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Choose Theme
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themes.map((t) => {
              const Meta = THEME_META[t];
              const Icon = Meta.icon;
              const active = mounted && theme === t;
              return (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex cursor-pointer items-center gap-3 py-2"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-none">{Meta.label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{Meta.desc}</p>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
