import { scoreTone } from "@/lib/pulse/format";
import { cn } from "@/lib/utils";

export function Score({
  value,
  size = "md",
  className,
}: {
  value: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizing = cn(
    "inline-flex items-center justify-center rounded-md font-medium tabular-nums",
    size === "sm" && "min-w-9 px-1.5 py-0.5 text-xs",
    size === "md" && "min-w-11 px-2 py-1 text-sm",
    size === "lg" && "min-w-14 px-2.5 py-1.5 text-base",
  );
  if (value === null || value === undefined) {
    return <span className={cn(sizing, "bg-sand-2 text-subtle", className)}>—</span>;
  }
  const tone = scoreTone(value);
  return (
    <span
      className={cn(
        sizing,
        tone === "high" && "bg-score-high text-sand",
        tone === "good" && "bg-score-good text-sand",
        tone === "mid" && "bg-score-mid/80 text-ink",
        tone === "low" && "bg-score-low text-sand",
        tone === "crit" && "bg-score-crit text-sand",
        className,
      )}
    >
      {Math.round(value)}
    </span>
  );
}

export function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("tabular-nums text-sm", up ? "text-score-high" : "text-score-crit")}>
      {up ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}
