import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "ink",
  ...props
}: React.ComponentProps<"span"> & { tone?: "ink" | "accent" | "sand" | "high" | "mid" | "low" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "ink" && "bg-ink text-sand",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "sand" && "bg-sand-2 text-ink",
        tone === "high" && "bg-score-high/15 text-score-high",
        tone === "mid" && "bg-score-mid/25 text-ink",
        tone === "low" && "bg-score-low/20 text-score-crit",
        className,
      )}
      {...props}
    />
  );
}
