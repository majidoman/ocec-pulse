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

/**
 * A section's agree questions as one grid: a row per question, a column per point of the 1–5 scale.
 * Native radio buttons, so each row is one keyboard group (arrow keys move within the row) and screen
 * readers announce the question with each choice. Used on wide screens only; phones get cards.
 */
export function LikertMatrix({
  caption,
  items,
  values,
  missing,
  onChange,
}: {
  caption: string;
  items: { id: string; label: string; optional?: boolean }[];
  values: Record<string, number | string>;
  missing: Set<string>;
  onChange: (id: string, v: number) => void;
}) {
  const { loc, lang } = useT();
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-border)]">
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[40%]" />
          {LIKERT.map((opt) => (
            <col key={opt.value} className="w-[12%]" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-3 text-start text-xs font-medium text-muted">
              <span className="sr-only">{loc({ en: "Statement", ar: "العبارة" })}</span>
            </th>
            {LIKERT.map((opt) => (
              <th key={opt.value} scope="col" className="px-1 py-3 text-center align-bottom text-xs font-medium leading-tight text-muted">
                <span className="block text-sm font-semibold tabular-nums text-ink">{formatNumber(opt.value, lang)}</span>
                {loc(opt.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((q, i) => {
            const isMissing = missing.has(q.id);
            const v = values[q.id];
            // Long grids repeat the scale every 7 rows so the columns stay readable without scrolling back up.
            const repeat =
              i > 0 && i % 7 === 0 ? (
                <tr key={`h-${q.id}`} aria-hidden className="border-b border-border bg-sand-2/60">
                  <td />
                  {LIKERT.map((opt) => (
                    <td key={opt.value} className="px-1 py-1.5 text-center text-[11px] leading-tight text-muted">
                      <span className="block text-xs font-semibold tabular-nums text-ink">{formatNumber(opt.value, lang)}</span>
                      {loc(opt.label)}
                    </td>
                  ))}
                </tr>
              ) : null;
            return [
              repeat,
              <tr
                key={q.id}
                data-missing={isMissing ? "true" : undefined}
                className={cn(i % 2 ? "bg-sand-2/40" : "", isMissing ? "outline outline-2 -outline-offset-2 outline-score-crit" : "", "border-b border-border last:border-0")}
              >
                <th scope="row" id={`row-${q.id}`} className="px-4 py-3 text-start font-medium leading-relaxed text-ink">
                  {q.label}
                  {q.optional ? <span className="ms-2 text-xs font-normal text-muted">({loc({ en: "Optional", ar: "اختياري" })})</span> : null}
                  {isMissing ? (
                    <span className="mt-1 block text-xs font-medium text-score-crit">{loc({ en: "⚠ Not answered yet", ar: "⚠ لم تتم الإجابة بعد" })}</span>
                  ) : null}
                </th>
                {LIKERT.map((opt) => (
                  <td key={opt.value} className="px-1 py-2 text-center">
                    <label className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-sand-2">
                      <input
                        type="radio"
                        name={`m-${q.id}`}
                        value={opt.value}
                        checked={v === opt.value}
                        onChange={() => onChange(q.id, opt.value)}
                        aria-label={`${q.label}: ${formatNumber(opt.value, lang)} — ${loc(opt.label)}`}
                        className="size-5 cursor-pointer accent-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                    </label>
                  </td>
                ))}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
