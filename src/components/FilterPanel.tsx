import { WEAPON_TYPES, WEARS, WeaponType, Wear } from "@/lib/skins";
import { SlidersHorizontal } from "lucide-react";

export interface Filters {
  floatMin: number;
  floatMax: number;
  priceMin: number;
  priceMax: number;
  weaponTypes: WeaponType[];
  wears: Wear[];
  minStickers: number;
}

export const defaultFilters: Filters = {
  floatMin: 0,
  floatMax: 1,
  priceMin: 0,
  priceMax: 20000,
  weaponTypes: [],
  wears: [],
  minStickers: 0,
};

export function FilterPanel({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const toggle = <K extends "weaponTypes" | "wears">(key: K, value: Filters[K][number]) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value as string)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    setFilters({ ...filters, [key]: next } as Filters);
  };

  return (
    <div className="space-y-6 rounded-xl glass p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
        </h3>
        <button
          onClick={() => setFilters(defaultFilters)}
          className="text-[11px] font-mono uppercase text-muted-foreground hover:text-primary"
        >
          Reset
        </button>
      </div>

      {/* Float range */}
      <Section title="Float" value={`${filters.floatMin.toFixed(2)} – ${filters.floatMax.toFixed(2)}`}>
        <div className="space-y-2">
          <RangeSlider
            min={0} max={1} step={0.01}
            value={filters.floatMin}
            onChange={(v) => setFilters({ ...filters, floatMin: Math.min(v, filters.floatMax) })}
          />
          <RangeSlider
            min={0} max={1} step={0.01}
            value={filters.floatMax}
            onChange={(v) => setFilters({ ...filters, floatMax: Math.max(v, filters.floatMin) })}
          />
          <div className="h-1.5 w-full rounded-full wear-bar opacity-60" />
        </div>
      </Section>

      {/* Price */}
      <Section title="Price (USD)" value={`$${filters.priceMin} – $${filters.priceMax}`}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" min={0} value={filters.priceMin}
            onChange={(e) => setFilters({ ...filters, priceMin: Number(e.target.value) })}
            className="h-9 rounded-md border border-border bg-input px-2 font-mono text-xs"
          />
          <input
            type="number" min={0} value={filters.priceMax}
            onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
            className="h-9 rounded-md border border-border bg-input px-2 font-mono text-xs"
          />
        </div>
      </Section>

      {/* Weapon */}
      <Section title="Weapon Type">
        <div className="flex flex-wrap gap-1.5">
          {WEAPON_TYPES.map((w) => {
            const on = filters.weaponTypes.includes(w);
            return (
              <button
                key={w}
                onClick={() => toggle("weaponTypes", w)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  on
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Wear */}
      <Section title="Wear">
        <div className="grid grid-cols-5 gap-1">
          {WEARS.map((w) => {
            const on = filters.wears.includes(w);
            return (
              <button
                key={w}
                onClick={() => toggle("wears", w)}
                className={`rounded-md py-1.5 font-mono text-[10px] font-bold transition ${
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Stickers */}
      <Section title="Min Stickers" value={String(filters.minStickers)}>
        <RangeSlider
          min={0} max={4} step={1}
          value={filters.minStickers}
          onChange={(v) => setFilters({ ...filters, minStickers: v })}
        />
      </Section>
    </div>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        {value && <span className="font-mono text-[11px] text-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function RangeSlider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range"
      min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
    />
  );
}
