import { cn } from "@/lib/utils";

export type BarItem = {
  /** Stable key. */
  id: string;
  label: string;
  /** 0–100 (or any value on `max`). */
  value: number;
  /** Shown at the end of the row; defaults to the rounded value. */
  display?: string;
  /** Optional earlier value, drawn as a thin marker on the track. */
  prior?: number | null;
  /** Bar colour (CSS colour or var); defaults to the accent. */
  color?: string;
};

/**
 * Horizontal bars as plain HTML: the full label on its own line, the value at the end, the bar
 * underneath. Labels never get cut off, rows wrap on a phone, and the bars grow from the start
 * edge, so Arabic (right to left) and English both read naturally.
 */
export function BarList({
  items,
  max = 100,
  className,
  priorLabel,
  showScale = true,
}: {
  items: BarItem[];
  max?: number;
  className?: string;
  priorLabel?: string;
  showScale?: boolean;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const hasPrior = items.some((i) => i.prior !== null && i.prior !== undefined);
  return (
    <div className={cn("flex flex-col", className)}>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 leading-snug text-ink">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{item.display ?? Math.round(item.value)}</span>
            </div>
            <div className="relative mt-1.5 h-2.5 w-full rounded-full bg-sand-2" role="presentation">
              <div className="h-full rounded-full" style={{ width: pct(item.value), background: item.color ?? "var(--color-accent)" }} />
              {item.prior !== null && item.prior !== undefined ? (
                <span
                  className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-ink"
                  style={{ insetInlineStart: `calc(${pct(item.prior)} - 1px)` }}
                  title={priorLabel ? `${priorLabel}: ${Math.round(item.prior)}` : undefined}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {showScale ? (
        <div className="mt-3 flex justify-between text-[11px] tabular-nums text-subtle" aria-hidden>
          <span>0</span>
          <span>{Math.round(max / 2)}</span>
          <span>{max}</span>
        </div>
      ) : null}
      {hasPrior && priorLabel ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block h-3 w-0.5 rounded bg-ink" aria-hidden /> {priorLabel}
        </p>
      ) : null}
    </div>
  );
}
