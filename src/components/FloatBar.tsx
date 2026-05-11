interface FloatBarProps {
  value: number; // 0..1
  showLabel?: boolean;
}

export function FloatBar({ value, showLabel = true }: FloatBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="w-full">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full wear-bar">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground shadow-[0_0_8px_white]"
          style={{ left: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0.00</span>
          <span className="text-foreground">{value.toFixed(4)}</span>
          <span>1.00</span>
        </div>
      )}
    </div>
  );
}
