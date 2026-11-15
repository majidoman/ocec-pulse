import { LIKERT } from "@/lib/questionnaire";
import { formatNumber } from "@/lib/pulse/config";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Shared look for one answer button: clear selected state, visible keyboard focus, a small press response. */
const choice = (selected: boolean) =>
  cn(
    "rounded-lg border text-ink outline-none transition-[background-color,border-color,color,transform] duration-150 ease-out",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "motion-safe:active:scale-[0.96]",
    selected ? "border-ink bg-ink text-sand" : "border-border bg-paper hover:border-ink/40 hover:bg-sand-2",
  );

export function Likert({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  /** The question text, read out by screen readers for the group. */
  label?: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  const { loc, lang } = useT();
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label ?? name}>
      {LIKERT.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${formatNumber(opt.value, lang)} — ${loc(opt.label)}`}
            onClick={() => onChange(opt.value)}
            className={cn(choice(selected), "flex min-h-16 flex-col items-center justify-start gap-1 px-1 pb-2 pt-2.5 text-center")}
          >
            <span className="text-base font-medium leading-none tabular-nums">{formatNumber(opt.value, lang)}</span>
            <span className={cn("text-[11px] leading-tight", selected ? "text-sand/85" : "text-muted")}>{loc(opt.label)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Enps({ label, value, onChange }: { label?: string; value?: number; onChange: (v: number) => void }) {
  const { t, lang } = useT();
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>{t("npsLow")}</span>
        <span>{t("npsHigh")}</span>
      </div>
      <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, i) => {
          const selected = value === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(i)}
              className={cn(choice(selected), "flex h-11 min-h-11 items-center justify-center rounded-md text-sm tabular-nums")}
            >
              {formatNumber(i, lang)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
