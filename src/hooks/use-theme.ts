import { useEffect, useState, useCallback } from "react";

export type Theme = "dark" | "legacy" | "dynamic";
const KEY = "floatiq-theme";
const THEMES: Theme[] = ["dark", "legacy", "dynamic"];

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "legacy", "dynamic");
  html.classList.add(t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as Theme | null;
    const initial: Theme = stored && THEMES.includes(stored) ? stored : "dark";
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try { localStorage.setItem(KEY, t); } catch {}
  }, []);

  return { theme, setTheme, mounted, themes: THEMES };
}
