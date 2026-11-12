import { LIKERT } from "@/lib/questionnaire";
import { useT } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Likert({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  const { lang, loc } = useT();
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={name}>
      {LIKERT.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors",
              selected
                ? "border-ink bg-ink text-sand"
                : "border-border bg-paper text-ink hover:bg-sand-2",
            )}
          >
            <span className="text-base font-medium tabular-nums">{opt.value}</span>
            <span className={cn("mt-0.5 text-[10px] leading-tight", selected ? "text-sand/80" : "text-muted")}>
              {lang === "ar" ? loc(opt.label).split(" ").slice(-2).join(" ") : loc(opt.label).replace("Strongly ", "S. ")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Enps({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const { t } = useT();
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>{t("npsLow")}</span>
        <span>{t("npsHigh")}</span>
      </div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => {
          const selected = value === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "flex h-11 min-h-11 items-center justify-center rounded-md border text-sm tabular-nums",
                selected ? "border-ink bg-ink text-sand" : "border-border bg-paper text-ink hover:bg-sand-2",
              )}
            >
              {i}
            </button>
          );
        })}
      </div>
    </div>
  );
}
